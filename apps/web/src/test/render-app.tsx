import { render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import type { AuthUser, Role, UserArea } from '@sryg/types'
import { AppRoutes } from '../AppRoutes'
import { RoleProvider } from '../common/components/RoleProvider/RoleProvider'
import { ThemeProvider, ToastProvider } from '../common/components'

export const TOKEN = 'token-ficticio'

export function userWith(role: Role, area: UserArea, extra: Partial<AuthUser> = {}): AuthUser {
  return {
    id: '3f2b6a1c-8d4e-4f5a-9b6c-7d8e9f0a1b2c',
    email: 'usuario.prueba@sryg.test',
    fullName: 'Usuario De Prueba',
    role,
    area,
    mustChangePassword: false,
    ...extra,
  }
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>
}

/** The whole app (providers + routes) on a memory router at `path`. */
export function renderApp(path: string) {
  return render(
    <ThemeProvider>
      <RoleProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[path]}>
            <AppRoutes />
            <LocationProbe />
          </MemoryRouter>
        </ToastProvider>
      </RoleProvider>
    </ThemeProvider>,
  )
}

export const currentLocation = () => screen.getByTestId('location').textContent
