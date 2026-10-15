// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DashboardPanel, DashboardTemplate } from './DashboardTemplate'

afterEach(cleanup)

const common = {
  title: 'Panel',
  toolbar: <label>Filtro</label>,
  summary: <p>Resumen</p>,
  panels: <DashboardPanel title="Registro de accesos">Accesos</DashboardPanel>,
}

describe('DashboardTemplate (DS-04)', () => {
  it('renders the title, toolbar, summary, panels and the main content when ready', () => {
    render(
      <DashboardTemplate {...common} status="ready" mainLabel="Alertas">
        <p>Lista</p>
      </DashboardTemplate>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Panel' })).toBeTruthy()
    expect(screen.getByText('Filtro')).toBeTruthy()
    expect(screen.getByText('Resumen')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Alertas' }).textContent).toContain('Lista')
    const panel = screen.getByRole('region', { name: 'Registro de accesos' })
    expect(panel.textContent).toContain('Accesos')
  })

  it('keeps the toolbar and panels while loading, with a status label', () => {
    render(<DashboardTemplate {...common} status="loading" mainLabel="Alertas" loadingLabel="Cargando alertas" />)
    expect(screen.getByRole('status').textContent).toBe('Cargando alertas')
    expect(screen.getByText('Filtro')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Registro de accesos' })).toBeTruthy()
  })

  it('shows the error with a retry and hides the summary, keeping the panels', async () => {
    const onRetry = vi.fn()
    render(
      <DashboardTemplate
        {...common}
        status="error"
        mainLabel="Alertas"
        error={{ title: 'No se pudieron cargar', message: 'Intente de nuevo.', onRetry }}
      />,
    )
    expect(screen.getByText('No se pudieron cargar')).toBeTruthy()
    expect(screen.queryByText('Resumen')).toBeNull()
    expect(screen.getByRole('region', { name: 'Registro de accesos' })).toBeTruthy()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('shows the empty state with the summary', () => {
    render(
      <DashboardTemplate
        {...common}
        status="empty"
        mainLabel="Alertas"
        empty={{ reason: 'no-data', title: 'Sin alertas', message: 'No hay credenciales por vencer.' }}
      />,
    )
    expect(screen.getByText('Sin alertas')).toBeTruthy()
    expect(screen.getByText('Resumen')).toBeTruthy()
  })
})
