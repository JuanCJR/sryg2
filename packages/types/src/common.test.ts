import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { csvEnum, csvList, csvUuid, splitQueryList } from './common'

const A = '0b6f1c3e-1f7a-4c1e-9d5e-2a6b8c9d0e11'
const B = '6f1d6c0e-2b8a-4a41-9c3e-0d4a3a8f6b11'

describe('splitQueryList', () => {
  it('splits comma-separated and repeated values, trimmed and deduplicated', () => {
    expect(splitQueryList('a')).toEqual(['a'])
    expect(splitQueryList(' a , b ,a')).toEqual(['a', 'b'])
    expect(splitQueryList(['a,b', ' c', 'b'])).toEqual(['a', 'b', 'c'])
  })

  it('reads blank input as no filter', () => {
    expect(splitQueryList(undefined)).toBeUndefined()
    expect(splitQueryList('')).toBeUndefined()
    expect(splitQueryList(' , ')).toBeUndefined()
    expect(splitQueryList([])).toBeUndefined()
    expect(splitQueryList(['', ' '])).toBeUndefined()
  })
})

describe('csvEnum', () => {
  const schema = z.object({ type: csvEnum(['x', 'y', 'z'] as const) })

  it('parses one or several values into a non-empty array', () => {
    expect(schema.parse({ type: 'x' })).toEqual({ type: ['x'] })
    expect(schema.parse({ type: 'x,y' })).toEqual({ type: ['x', 'y'] })
    expect(schema.parse({ type: ['z', 'x'] })).toEqual({ type: ['z', 'x'] })
  })

  it('leaves the filter out when absent or blank', () => {
    expect(schema.parse({}).type).toBeUndefined()
    expect(schema.parse({ type: '' }).type).toBeUndefined()
    expect(schema.parse({ type: [''] }).type).toBeUndefined()
  })

  it('rejects any unknown value', () => {
    expect(schema.safeParse({ type: 'x,w' }).success).toBe(false)
    expect(schema.safeParse({ type: ['w'] }).success).toBe(false)
    expect(schema.safeParse({ type: 3 }).success).toBe(false)
  })
})

describe('csvUuid and csvList', () => {
  it('parses a list of uuids and rejects a malformed one', () => {
    const schema = z.object({ id: csvUuid() })
    expect(schema.parse({ id: `${A},${B}` })).toEqual({ id: [A, B] })
    expect(schema.parse({ id: [A, A] })).toEqual({ id: [A] })
    expect(schema.safeParse({ id: `${A},nope` }).success).toBe(false)
  })

  it('validates each item against the given schema', () => {
    const schema = z.object({ tag: csvList(z.string().max(3)) })
    expect(schema.parse({ tag: 'ab,cd' })).toEqual({ tag: ['ab', 'cd'] })
    expect(schema.safeParse({ tag: 'abcd' }).success).toBe(false)
  })
})
