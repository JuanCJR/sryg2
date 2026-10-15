// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CatalogOption } from '@sryg/types'
import { sessionStore } from '../../services/session'
import { authorizationOf, mockApi } from '../../../test/api-mock'
import { CatalogSelect } from './CatalogSelect'

const VEN: CatalogOption = { id: '7a1c2b3d-4e5f-4a6b-8c7d-9e0f1a2b3c01', nameEs: 'Venezolana', nameEn: 'Venezuelan' }
const VTN: CatalogOption = { id: '7a1c2b3d-4e5f-4a6b-8c7d-9e0f1a2b3c02', nameEs: 'Vietnamita', nameEn: null }

function Harness({ onChange }: { onChange: (option: CatalogOption | null) => void }) {
  const [value, setValue] = useState<CatalogOption | null>(null)
  return (
    <CatalogSelect
      catalog="nationalities"
      aria-label="Nacionalidad"
      value={value}
      onChange={(option) => {
        setValue(option)
        onChange(option)
      }}
    />
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('CatalogSelect', () => {
  it('searches the catalog options with the session token and selects with the pointer', async () => {
    sessionStore.set('token-ficticio')
    const api = mockApi((url) =>
      url.pathname === '/api/catalogs/nationalities/options' ? { status: 200, body: [VEN, VTN] } : undefined,
    )
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)

    const combo = screen.getByRole('combobox', { name: 'Nacionalidad' })
    await user.type(combo, 'v')
    const searched = () => api.mock.calls.find(([url]) => new URL(String(url)).searchParams.get('q') === 'v')
    await waitFor(() => expect(searched()).toBeDefined())
    await user.click(await screen.findByRole('option', { name: /Venezolana/ }))

    expect(onChange).toHaveBeenCalledWith(VEN)
    expect((combo as HTMLInputElement).value).toBe('Venezolana')
    expect(combo.getAttribute('aria-expanded')).toBe('false')
    const [url, init] = searched()!
    expect(new URL(String(url)).pathname).toBe('/api/catalogs/nationalities/options')
    expect(new URL(String(url)).searchParams.get('limit')).toBe('20')
    expect(authorizationOf(init)).toBe('Bearer token-ficticio')
  })

  it('selects with the keyboard and shows the English name as secondary text', async () => {
    mockApi(() => ({ status: 200, body: [VEN, VTN] }))
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)

    await user.click(screen.getByRole('combobox'))
    expect((await screen.findByRole('option', { name: /Venezolana/ })).textContent).toContain('Venezuelan')
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')

    expect(onChange).toHaveBeenCalledWith(VTN)
  })

  it('says when nothing matches', async () => {
    mockApi(() => ({ status: 200, body: [] }))
    const user = userEvent.setup()
    render(<Harness onChange={vi.fn()} />)

    await user.type(screen.getByRole('combobox'), 'xyz')
    expect(await screen.findByText('Sin coincidencias')).toBeTruthy()
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })

  it('reports a failed load and retries it', async () => {
    let fail = true
    mockApi(() => (fail ? { status: 500, body: { message: 'x' } } : { status: 200, body: [VEN] }))
    const user = userEvent.setup()
    render(<Harness onChange={vi.fn()} />)

    await user.click(screen.getByRole('combobox'))
    expect(await screen.findByText('No se pudieron cargar las opciones.')).toBeTruthy()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('option', { name: /Venezolana/ })).toBeTruthy()
  })

  it('clears the value when the text is erased', async () => {
    mockApi(() => ({ status: 200, body: [VEN] }))
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: /Venezolana/ }))
    await user.clear(screen.getByRole('combobox'))
    await user.tab()

    expect(onChange).toHaveBeenLastCalledWith(null)
  })
})
