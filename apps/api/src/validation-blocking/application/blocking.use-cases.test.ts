import type { ListBlocksQuery } from '@sryg/types'
import { describe, expect, it } from 'vitest'
import type { AuditEntry, AuditLog } from '../../audit/domain/audit-log'
import { ConflictError, NotFoundError } from '../../shared/domain/errors'
import type { UnitOfWork } from '../../shared/domain/unit-of-work'
import type { Actor, Block, NewBlock } from '../domain/block'
import type { BlockRepository } from '../domain/block-repository'
import type { BlockingUowRepos } from '../domain/blocking-unit-of-work'
import { GetBlockUseCase } from './get-block.use-case'
import { ListBlocksUseCase } from './list-blocks.use-case'
import { RegisterBlockUseCase } from './register-block.use-case'
import { ResolveBlockUseCase } from './resolve-block.use-case'

const actor: Actor = { id: '11111111-1111-4111-8111-111111111111' }
const resolver: Actor = { id: '22222222-2222-4222-8222-222222222222' }
const PERSON = '33333333-3333-4333-8333-333333333333'
const OTHER_PERSON = '44444444-4444-4444-8444-444444444444'
const UNKNOWN = '99999999-9999-4999-8999-999999999999'

class FakeBlocks implements BlockRepository {
  rows = new Map<string, Block>()
  people = new Set([PERSON, OTHER_PERSON])
  private seq = 0
  findById(id: string) {
    return Promise.resolve(this.rows.get(id) ?? null)
  }
  list({ status, type, personalId, page, pageSize }: ListBlocksQuery) {
    const all = [...this.rows.values()].filter(
      (b) =>
        (!status || b.status === status) && (!type || b.type === type) && (!personalId || b.personalId === personalId),
    )
    return Promise.resolve({
      items: all.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total: all.length,
    })
  }
  create(data: NewBlock, actorId: string) {
    if (!this.people.has(data.personalId)) return Promise.reject(new NotFoundError('Personnel not found'))
    const id = `00000000-0000-4000-8000-${String(++this.seq).padStart(12, '0')}`
    const now = new Date()
    const row: Block = {
      ...data,
      id,
      person: { cedula: '10000001', firstNames: 'Persona', lastNames: 'Ficticia' },
      status: 'activo',
      createdBy: { id: actorId, fullName: 'Creador' },
      createdAt: now,
      resolvedBy: null,
      resolvedAt: null,
      resolutionNote: null,
      updatedAt: now,
    }
    this.rows.set(id, row)
    return Promise.resolve(row)
  }
  resolve(id: string, resolutionNote: string, actorId: string) {
    const current = this.rows.get(id)
    if (!current || current.status !== 'activo') return Promise.resolve(null)
    const next: Block = {
      ...current,
      status: 'resuelto',
      resolutionNote,
      resolvedBy: { id: actorId, fullName: 'Resolvedor' },
      resolvedAt: new Date(),
    }
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
class FakeUow implements UnitOfWork<BlockingUowRepos> {
  constructor(
    private readonly blocks: FakeBlocks,
    private readonly audit: FakeAudit,
  ) {}
  async run<T>(work: (repos: BlockingUowRepos) => Promise<T>) {
    const rows = new Map(this.blocks.rows)
    const entries = [...this.audit.entries]
    try {
      return await work({ blocks: this.blocks, audit: this.audit })
    } catch (error) {
      this.blocks.rows = rows
      this.audit.entries = entries
      throw error
    }
  }
}

function setup() {
  const blocks = new FakeBlocks()
  const audit = new FakeAudit()
  const uow = new FakeUow(blocks, audit)
  return {
    blocks,
    audit,
    register: new RegisterBlockUseCase(uow),
    resolve: new ResolveBlockUseCase(uow),
    get: new GetBlockUseCase(blocks),
    list: new ListBlocksUseCase(blocks),
  }
}

describe('RegisterBlockUseCase', () => {
  it('registers an active block and writes one bloquear audit row with the actor (BR-07, BR-11)', async () => {
    const { register, audit } = setup()
    const block = await register.execute(actor, { personalId: PERSON, type: 'medico', reason: 'Impedimento ficticio' })
    expect(block).toMatchObject({ personalId: PERSON, type: 'medico', status: 'activo', resolvedBy: null })
    expect(audit.entries).toEqual([
      {
        actorId: actor.id,
        action: 'bloquear',
        entity: 'bloqueo',
        entityId: block.id,
        changes: { after: { personalId: PERSON, type: 'medico', reason: 'Impedimento ficticio', status: 'activo' } },
      },
    ])
  })

  it('answers NotFoundError for an unknown person and writes no audit row', async () => {
    const { register, audit, blocks } = setup()
    await expect(register.execute(actor, { personalId: UNKNOWN, type: 'medico', reason: 'r' })).rejects.toBeInstanceOf(
      NotFoundError,
    )
    expect(blocks.rows.size).toBe(0)
    expect(audit.entries).toHaveLength(0)
  })

  it('rolls the block back when the audit write fails', async () => {
    const { register, audit, blocks } = setup()
    audit.failNext = true
    await expect(register.execute(actor, { personalId: PERSON, type: 'medico', reason: 'r' })).rejects.toThrow(
      'audit write failed',
    )
    expect(blocks.rows.size).toBe(0)
  })
})

describe('ResolveBlockUseCase', () => {
  it('resolves with the note and the resolver, and writes one resolver audit row (BR-08)', async () => {
    const { register, resolve, audit } = setup()
    const block = await register.execute(actor, { personalId: PERSON, type: 'regulatorio', reason: 'r' })
    const resolved = await resolve.execute(resolver, block.id, { resolutionNote: 'Solventado' })
    expect(resolved).toMatchObject({
      status: 'resuelto',
      resolutionNote: 'Solventado',
      resolvedBy: { id: resolver.id },
    })
    expect(resolved.resolvedAt).toBeInstanceOf(Date)
    expect(audit.entries[1]).toEqual({
      actorId: resolver.id,
      action: 'resolver',
      entity: 'bloqueo',
      entityId: block.id,
      changes: { before: { status: 'activo' }, after: { status: 'resuelto', resolutionNote: 'Solventado' } },
    })
  })

  it('answers NotFoundError for an unknown block and ConflictError for an already resolved one, without audit rows', async () => {
    const { register, resolve, audit } = setup()
    await expect(resolve.execute(resolver, UNKNOWN, { resolutionNote: 'n' })).rejects.toBeInstanceOf(NotFoundError)
    const block = await register.execute(actor, { personalId: PERSON, type: 'medico', reason: 'r' })
    await resolve.execute(resolver, block.id, { resolutionNote: 'n' })
    await expect(resolve.execute(resolver, block.id, { resolutionNote: 'otra' })).rejects.toBeInstanceOf(ConflictError)
    expect(audit.entries.map((e) => e.action)).toEqual(['bloquear', 'resolver'])
  })

  it('rolls the resolution back when the audit write fails', async () => {
    const { register, resolve, audit, blocks } = setup()
    const block = await register.execute(actor, { personalId: PERSON, type: 'medico', reason: 'r' })
    audit.failNext = true
    await expect(resolve.execute(resolver, block.id, { resolutionNote: 'n' })).rejects.toThrow('audit write failed')
    expect(blocks.rows.get(block.id)?.status).toBe('activo')
  })
})

describe('GetBlockUseCase / ListBlocksUseCase', () => {
  it('gets by id or throws NotFoundError', async () => {
    const { register, get } = setup()
    const block = await register.execute(actor, { personalId: PERSON, type: 'medico', reason: 'r' })
    expect(await get.execute(block.id)).toEqual(block)
    await expect(get.execute(UNKNOWN)).rejects.toBeInstanceOf(NotFoundError)
  })

  it('lists with the status, type and person filters', async () => {
    const { register, resolve, list } = setup()
    const first = await register.execute(actor, { personalId: PERSON, type: 'medico', reason: 'r' })
    await register.execute(actor, { personalId: PERSON, type: 'administrativo', reason: 'r' })
    await register.execute(actor, { personalId: OTHER_PERSON, type: 'medico', reason: 'r' })
    await resolve.execute(resolver, first.id, { resolutionNote: 'n' })
    expect((await list.execute({ page: 1, pageSize: 10 })).total).toBe(3)
    expect((await list.execute({ status: 'activo', page: 1, pageSize: 10 })).total).toBe(2)
    expect((await list.execute({ type: 'medico', page: 1, pageSize: 10 })).total).toBe(2)
    expect((await list.execute({ personalId: OTHER_PERSON, page: 1, pageSize: 10 })).total).toBe(1)
  })
})
