import { describe, expect, it } from 'vitest'
import clsx from './clsx'

describe('clsx', () => {
  it('joins truthy values and drops falsy ones', () => {
    expect(clsx('a', false, null, undefined, 'b', 0, 'c')).toBe('a b c')
  })
})
