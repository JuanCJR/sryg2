import { describe, expect, it } from 'vitest'
import type { AuditEntry, AuditLog } from '../../audit/domain/audit-log'
import { ConflictError, NotFoundError } from '../../shared/domain/errors'
import type { UnitOfWork } from '../../shared/domain/unit-of-work'
import type { NewPersonnel, Personnel, PersonnelChanges } from '../domain/personnel'
import type { PersonnelRepository } from '../domain/personnel-repository'
import type { PersonnelUowRepos } from '../domain/personnel-unit-of-work'
import type { Actor } from '../domain/personnel'
import { CreatePersonnelUseCase } from './create-personnel.use-case'
import { GetPersonnelUseCase } from './get-personnel.use-case'
import { ListPersonnelUseCase } from './list-personnel.use-case'
import { UpdatePersonnelUseCase } from './update-personnel.use-case'

const actor: Actor = { id: '11111111-1111-4111-8111-111111111111' }

class FakePersonnel implements PersonnelRepository {
  rows = new Map<string, Personnel>()
  private seq = 0
  findById(id: string) {
    return Promise.resolve(this.rows.get(id) ?? null)
  }
  list({ q, page, pageSize }: { q?: string; page: number; pageSize: number }) {
    const all = [...this.rows.values()].filter(
      (p) => !q || `${p.firstNames} ${p.lastNames}`.toLowerCase().includes(q.toLowerCase()),
    )
    return Promise.resolve({
      items: all.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total: all.length,
    })
  }
  create(data: NewPersonnel) {
    if ([...this.rows.values()].some((p) => p.cedula === data.cedula)) throw new ConflictError('duplicate cedula')
    const id = `00000000-0000-4000-8000-${String(++this.seq).padStart(12, '0')}`
    const row: Personnel = {
      ...data,
      status: data.status ?? 'activo',
      hasPhoto: false,
      hasSignature: false,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.rows.set(id, row)
    return Promise.resolve(row)
  }
  update(id: string, changes: PersonnelChanges) {
    const current = this.rows.get(id)
    if (!current) throw new NotFoundError('not found')
    const next = { ...current, ...changes }
    this.rows.set(id, next)
    return Promise.resolve(next)
  }
}

class FakeAudit implements AuditLog {
  entries: AuditEntry[] = []
  failNext = false
  record(entry: AuditEntry) {
    if (this.failNext) return Promise.reject(new Error('audit write failed'))
    this.entries.push(entry)
    return Promise.resolve()
  }
}

/** In-memory unit of work with snapshot/restore to mimic transaction rollback. */
class FakeUow implements UnitOfWork<PersonnelUowRepos> {
  constructor(
    private readonly personnel: FakePersonnel,
    private readonly audit: FakeAudit,
  ) {}
  async run<T>(work: (repos: PersonnelUowRepos) => Promise<T>) {
    const rows = new Map(this.personnel.rows)
    const entries = [...this.audit.entries]
    try {
      return await work({ personnel: this.personnel, audit: this.audit })
    } catch (error) {
      this.personnel.rows = rows
      this.audit.entries = entries
      throw error
    }
  }
}

function setup() {
  const personnel = new FakePersonnel()
  const audit = new FakeAudit()
  const uow = new FakeUow(personnel, audit)
  return {
    personnel,
    audit,
    create: new CreatePersonnelUseCase(uow),
    update: new UpdatePersonnelUseCase(uow),
    get: new GetPersonnelUseCase(personnel),
    list: new ListPersonnelUseCase(personnel),
  }
}

describe('CreatePersonnelUseCase', () => {
  it('stores a normalized cedula and the D21 fields and writes one crear audit row with the actor', async () => {
    const { create, audit, personnel } = setup()
    const created = await create.execute(actor, {
      cedula: 'V-12.345.678',
      firstNames: 'Ana',
      lastNames: 'Perez',
      birthDate: '1990-05-01',
      address: 'Calle 1',
    })
    expect(created).toMatchObject({ birthDate: '1990-05-01', address: 'Calle 1', documentTypeId: null })
    expect(created.cedula).toBe('12345678')
    expect(personnel.rows.size).toBe(1)
    expect(audit.entries).toHaveLength(1)
    expect(audit.entries[0]).toMatchObject({
      actorId: actor.id,
      action: 'crear',
      entity: 'personal_aeronautico',
      entityId: created.id,
    })
    expect(audit.entries[0]?.changes?.after).toMatchObject({
      cedula: '12345678',
      firstNames: 'Ana',
      lastNames: 'Perez',
    })
  })

  it('rejects a duplicate cedula (in any input format) with ConflictError and no audit row', async () => {
    const { create, audit, personnel } = setup()
    await create.execute(actor, { cedula: '12345678', firstNames: 'Ana', lastNames: 'Perez' })
    await expect(
      create.execute(actor, { cedula: 'V-12.345.678', firstNames: 'Otra', lastNames: 'Persona' }),
    ).rejects.toBeInstanceOf(ConflictError)
    expect(personnel.rows.size).toBe(1)
    expect(audit.entries).toHaveLength(1)
  })

  it('rolls the personnel row back when the audit write fails', async () => {
    const { create, audit, personnel } = setup()
    audit.failNext = true
    await expect(create.execute(actor, { cedula: '12345678', firstNames: 'Ana', lastNames: 'Perez' })).rejects.toThrow(
      'audit write failed',
    )
    expect(personnel.rows.size).toBe(0)
  })
})

describe('UpdatePersonnelUseCase', () => {
  it('applies changes and audits only the changed fields as before/after', async () => {
    const { create, update, audit } = setup()
    const created = await create.execute(actor, {
      cedula: '12345678',
      firstNames: 'Ana',
      lastNames: 'Perez',
      cargo: 'Piloto',
    })
    const updated = await update.execute(actor, created.id, { cargo: 'Capitan', firstNames: 'Ana', lastNames: 'Perez' })
    expect(updated.cargo).toBe('Capitan')
    expect(audit.entries).toHaveLength(2)
    expect(audit.entries[1]).toMatchObject({
      actorId: actor.id,
      action: 'actualizar',
      entity: 'personal_aeronautico',
      entityId: created.id,
      changes: { before: { cargo: 'Piloto' }, after: { cargo: 'Capitan' } },
    })
  })

  it('normalizes a changed cedula', async () => {
    const { create, update } = setup()
    const created = await create.execute(actor, { cedula: '12345678', firstNames: 'Ana', lastNames: 'Perez' })
    expect((await update.execute(actor, created.id, { cedula: 'V-9.876.543' })).cedula).toBe('9876543')
  })

  it('is a no-op without an audit row when nothing changes', async () => {
    const { create, update, audit } = setup()
    const created = await create.execute(actor, { cedula: '12345678', firstNames: 'Ana', lastNames: 'Perez' })
    await update.execute(actor, created.id, { firstNames: 'Ana', lastNames: 'Perez' })
    expect(audit.entries).toHaveLength(1)
  })

  it('throws NotFoundError for an unknown id and writes no audit row', async () => {
    const { update, audit } = setup()
    await expect(update.execute(actor, '99999999-9999-4999-8999-999999999999', { cargo: 'x' })).rejects.toBeInstanceOf(
      NotFoundError,
    )
    expect(audit.entries).toHaveLength(0)
  })

  it('rolls the update back when the audit write fails', async () => {
    const { create, update, audit, personnel } = setup()
    const created = await create.execute(actor, {
      cedula: '12345678',
      firstNames: 'Ana',
      lastNames: 'Perez',
      cargo: 'Piloto',
    })
    audit.failNext = true
    await expect(update.execute(actor, created.id, { cargo: 'Capitan' })).rejects.toThrow('audit write failed')
    expect(personnel.rows.get(created.id)?.cargo).toBe('Piloto')
  })
})

describe('GetPersonnelUseCase / ListPersonnelUseCase', () => {
  it('gets by id or throws NotFoundError, without writing audit rows', async () => {
    const { create, get, audit } = setup()
    const created = await create.execute(actor, { cedula: '12345678', firstNames: 'Ana', lastNames: 'Perez' })
    expect(await get.execute(created.id)).toEqual(created)
    await expect(get.execute('99999999-9999-4999-8999-999999999999')).rejects.toBeInstanceOf(NotFoundError)
    expect(audit.entries).toHaveLength(1)
  })

  it('lists with pagination and search', async () => {
    const { create, list } = setup()
    await create.execute(actor, { cedula: '12345678', firstNames: 'Ana', lastNames: 'Perez' })
    await create.execute(actor, { cedula: '23456789', firstNames: 'Luis', lastNames: 'Gomez' })
    expect((await list.execute({ page: 1, pageSize: 10 })).total).toBe(2)
    const found = await list.execute({ q: 'luis', page: 1, pageSize: 10 })
    expect(found.items.map((p) => p.lastNames)).toEqual(['Gomez'])
  })
})
