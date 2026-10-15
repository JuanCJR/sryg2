import { describe, expect, it } from 'vitest'
import { blockSchema, createBlockSchema, listBlocksQuerySchema, resolveBlockSchema } from './blocking'

const PERSON_ID = '6f1d6c0e-2b8a-4a41-9c3e-0d4a3a8f6b11'

describe('createBlockSchema', () => {
  it('requires the person, a known type and a non-blank reason, trimmed', () => {
    expect(
      createBlockSchema.parse({ personalId: PERSON_ID, type: 'medico', reason: '  Impedimento ficticio  ' }),
    ).toEqual({ personalId: PERSON_ID, type: 'medico', reason: 'Impedimento ficticio' })
    expect(createBlockSchema.safeParse({ personalId: 'x', type: 'medico', reason: 'r' }).success).toBe(false)
    expect(createBlockSchema.safeParse({ personalId: PERSON_ID, type: 'otro', reason: 'r' }).success).toBe(false)
    expect(createBlockSchema.safeParse({ personalId: PERSON_ID, type: 'medico', reason: '   ' }).success).toBe(false)
    expect(createBlockSchema.safeParse({ personalId: PERSON_ID, type: 'medico' }).success).toBe(false)
  })

  it('ignores server-managed fields: a block is always registered active', () => {
    const parsed = createBlockSchema.parse({
      personalId: PERSON_ID,
      type: 'administrativo',
      reason: 'r',
      status: 'resuelto',
      resolutionNote: 'n',
    })
    expect(parsed).not.toHaveProperty('status')
    expect(parsed).not.toHaveProperty('resolutionNote')
  })
})

describe('resolveBlockSchema', () => {
  it('makes the resolution note mandatory (BR-08)', () => {
    expect(resolveBlockSchema.parse({ resolutionNote: ' Solventado ' })).toEqual({ resolutionNote: 'Solventado' })
    expect(resolveBlockSchema.safeParse({}).success).toBe(false)
    expect(resolveBlockSchema.safeParse({ resolutionNote: '  ' }).success).toBe(false)
  })
})

describe('listBlocksQuerySchema', () => {
  it('filters by status, type and person, with pagination defaults', () => {
    expect(listBlocksQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 })
    expect(
      listBlocksQuerySchema.parse({
        status: 'activo',
        type: 'regulatorio',
        personalId: PERSON_ID,
        q: 'ana',
        page: '2',
      }),
    ).toEqual({ status: ['activo'], type: ['regulatorio'], personalId: PERSON_ID, q: 'ana', page: 2, pageSize: 20 })
    expect(listBlocksQuerySchema.safeParse({ status: 'bloqueada' }).success).toBe(false)
    expect(listBlocksQuerySchema.safeParse({ type: 'x' }).success).toBe(false)
    expect(listBlocksQuerySchema.safeParse({ personalId: 'x' }).success).toBe(false)
  })

  it('accepts several statuses and types, comma-separated or repeated', () => {
    expect(listBlocksQuerySchema.parse({ status: 'activo,resuelto', type: ['medico', 'regulatorio'] })).toMatchObject({
      status: ['activo', 'resuelto'],
      type: ['medico', 'regulatorio'],
    })
    expect(listBlocksQuerySchema.parse({ type: ['medico,administrativo', 'medico'] }).type).toEqual([
      'medico',
      'administrativo',
    ])
    expect(listBlocksQuerySchema.parse({ status: '', type: ' , ' })).toEqual({ page: 1, pageSize: 20 })
    expect(listBlocksQuerySchema.safeParse({ type: 'medico,otro' }).success).toBe(false)
  })
})

describe('blockSchema', () => {
  it('parses a resolved block as the API returns it', () => {
    const block = {
      id: '0b6f1c3e-1f7a-4c1e-9d5e-2a6b8c9d0e11',
      personalId: PERSON_ID,
      person: { cedula: '10000001', firstNames: 'Persona', lastNames: 'Ficticia' },
      type: 'medico',
      reason: 'Impedimento ficticio',
      status: 'resuelto',
      createdBy: { id: '3f2b6a1c-8d4e-4f5a-9b6c-7d8e9f0a1b2c', fullName: 'Usuario Ficticio' },
      createdAt: '2026-10-01T12:00:00.000Z',
      resolvedBy: { id: '3f2b6a1c-8d4e-4f5a-9b6c-7d8e9f0a1b2c', fullName: 'Usuario Ficticio' },
      resolvedAt: '2026-10-02T12:00:00.000Z',
      resolutionNote: 'Solventado',
      updatedAt: '2026-10-02T12:00:00.000Z',
    }
    expect(blockSchema.parse(block)).toEqual(block)
    expect(blockSchema.safeParse({ ...block, status: 'abierto' }).success).toBe(false)
  })
})
