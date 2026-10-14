import { describe, expect, it } from 'vitest'
import { decideRoute } from './auth-gate'

const base = { pathname: '/panel', hasSession: false, ungatedPaths: ['/catalogo'] }

describe('decideRoute', () => {
  it('sends an anonymous visitor of a protected route to the login', () => {
    expect(decideRoute({ ...base, area: 'protected' })).toEqual({ kind: 'redirect', to: '/ingreso' })
  })

  it('lets an authenticated visitor into a protected route', () => {
    expect(decideRoute({ ...base, area: 'protected', hasSession: true })).toEqual({ kind: 'allow' })
  })

  it('leaves explicitly ungated paths open without a session', () => {
    expect(decideRoute({ ...base, area: 'protected', pathname: '/catalogo' })).toEqual({ kind: 'allow' })
  })

  it('shows the login to an anonymous visitor', () => {
    expect(decideRoute({ ...base, area: 'login', pathname: '/ingreso' })).toEqual({ kind: 'allow' })
  })

  it('sends an authenticated visitor of the login to the panel', () => {
    expect(decideRoute({ ...base, area: 'login', pathname: '/ingreso', hasSession: true })).toEqual({
      kind: 'redirect',
      to: '/panel',
    })
  })
})
