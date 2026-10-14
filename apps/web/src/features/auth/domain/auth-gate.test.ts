import { describe, expect, it } from 'vitest'
import { decideRoute, safeNextPath } from './auth-gate'

const base = { pathname: '/panel', search: '', hasSession: false, ungatedPaths: ['/catalogo'] }

describe('decideRoute', () => {
  it('sends an anonymous visitor of a protected route to the login, remembering where they were', () => {
    expect(decideRoute({ ...base, area: 'protected', pathname: '/personal', search: '?q=ana' })).toEqual({
      kind: 'redirect',
      to: '/ingreso?next=%2Fpersonal%3Fq%3Dana',
    })
  })

  it('does not carry a next after an explicit sign-out', () => {
    expect(decideRoute({ ...base, area: 'protected', pathname: '/usuarios', signedOut: true })).toEqual({
      kind: 'redirect',
      to: '/ingreso',
    })
  })

  it('does not carry the home route as next', () => {
    expect(decideRoute({ ...base, area: 'protected', pathname: '/' })).toEqual({ kind: 'redirect', to: '/ingreso' })
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

  it('sends an authenticated visitor of the login to next, or to the panel', () => {
    expect(decideRoute({ ...base, area: 'login', pathname: '/ingreso', hasSession: true })).toEqual({
      kind: 'redirect',
      to: '/panel',
    })
    expect(
      decideRoute({ ...base, area: 'login', pathname: '/ingreso', search: '?next=%2Fbloqueos', hasSession: true }),
    ).toEqual({ kind: 'redirect', to: '/bloqueos' })
  })
})

describe('safeNextPath', () => {
  it('accepts only same-origin absolute paths', () => {
    expect(safeNextPath('/personal/1?pagina=datos')).toBe('/personal/1?pagina=datos')
    expect(safeNextPath(null)).toBe('/panel')
    expect(safeNextPath('https://evil.test')).toBe('/panel')
    expect(safeNextPath('//evil.test')).toBe('/panel')
    expect(safeNextPath('/\\evil.test')).toBe('/panel')
    expect(safeNextPath('/ingreso')).toBe('/panel')
  })
})
