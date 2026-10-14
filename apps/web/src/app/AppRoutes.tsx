import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import type { PermissionAction, PermissionModule } from '@sryg/types'
import { RouteGate } from '../features/auth/containers/RouteGate'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { PerfilPage } from '../features/auth/pages/PerfilPage'
import { PanelPage } from '../features/alerts/pages/PanelPage'
import { AuditoriaPage } from '../features/audit/pages/AuditoriaPage'
import { BloqueosPage } from '../features/blocking/pages/BloqueosPage'
import { CatalogoPage } from '../features/catalogs/pages/CatalogoPage'
import { CatalogosPage } from '../features/catalogs/pages/CatalogosPage'
import { VerificarPage } from '../features/credentials/pages/VerificarPage'
import { ConsultaLicenciasPage } from '../features/licenses/pages/ConsultaLicenciasPage'
import { EmisionLicenciaPage } from '../features/licenses/pages/EmisionLicenciaPage'
import { CertificadoMedicoPage } from '../features/medical-certificates/pages/CertificadoMedicoPage'
import { EditarPersonalPage } from '../features/personnel/pages/EditarPersonalPage'
import { ExpedientePage } from '../features/personnel/pages/ExpedientePage'
import { ListadoPage } from '../features/personnel/pages/ListadoPage'
import { RegistroPersonalPage } from '../features/personnel/pages/RegistroPersonalPage'
import { ReportesPage } from '../features/reports/pages/ReportesPage'
import { ParametrosPage } from '../features/settings/pages/ParametrosPage'
import { UsuariosPage } from '../features/users/pages/UsuariosPage'
import { ForbiddenPage } from './errors/ForbiddenPage'
import { NotFoundPage } from './errors/NotFoundPage'
import { EXPEDIENTE_ACTIONS, EXPEDIENTE_TABS } from './expediente/registry'
import { RequirePermission } from './role/RequirePermission'
import { SessionGate } from './role/SessionGate'
import { PATHS } from './routes'
import { AppShell } from './shell/AppShell'

const CatalogPage = import.meta.env.DEV
  ? lazy(() => import('../catalog/CatalogPage').then((m) => ({ default: m.CatalogPage })))
  : null

function guard(module: PermissionModule, action: PermissionAction, page: ReactNode) {
  return (
    <RequirePermission module={module} action={action}>
      {page}
    </RequirePermission>
  )
}

/**
 * Every route of the app, pre-registered by F0-B: each points at its feature's page
 * (`features/<feature>/pages/<X>Page.tsx`) behind the `can()` check of D1/D24.
 */
export function AppRoutes() {
  return (
    <Routes>
      {/* Public, outside the shell (D9). */}
      <Route path="/verificar/:token" element={<VerificarPage />} />
      {CatalogPage ? (
        <Route
          path="/catalogo"
          element={
            <Suspense fallback={null}>
              <CatalogPage />
            </Suspense>
          }
        />
      ) : null}

      <Route element={<RouteGate area="login" />}>
        <Route path={PATHS.login} element={<LoginPage />} />
      </Route>

      <Route element={<RouteGate area="protected" />}>
        <Route element={<SessionGate />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to={PATHS.panel} replace />} />
            <Route path={PATHS.panel} element={guard('alerts', 'read', <PanelPage />)} />
            <Route path={PATHS.personnel} element={guard('personnel', 'read', <ListadoPage />)} />
            <Route path={PATHS.personnelNew} element={guard('personnel', 'write', <RegistroPersonalPage />)} />
            <Route
              path="/personal/:id"
              element={guard(
                'personnel',
                'read',
                <ExpedientePage tabs={EXPEDIENTE_TABS} actions={EXPEDIENTE_ACTIONS} />,
              )}
            />
            <Route path="/personal/:id/editar" element={guard('personnel', 'write', <EditarPersonalPage />)} />
            <Route path="/personal/:id/licencia" element={guard('licenses', 'write', <EmisionLicenciaPage />)} />
            <Route
              path="/personal/:id/certificado-medico"
              element={guard('medical_certificates', 'write', <CertificadoMedicoPage />)}
            />
            <Route path={PATHS.licenses} element={guard('licenses', 'read', <ConsultaLicenciasPage />)} />
            <Route path={PATHS.blocks} element={guard('blocking', 'read', <BloqueosPage />)} />
            <Route path={PATHS.reports} element={guard('reports', 'read', <ReportesPage />)} />
            <Route path={PATHS.audit} element={guard('audit', 'read', <AuditoriaPage />)} />
            <Route path={PATHS.users} element={guard('users', 'write', <UsuariosPage />)} />
            <Route path={PATHS.settings} element={guard('settings', 'write', <ParametrosPage />)} />
            <Route path={PATHS.catalogs} element={guard('catalogs', 'read', <CatalogosPage />)} />
            <Route path="/catalogos/:catalogo" element={guard('catalogs', 'read', <CatalogoPage />)} />
            <Route path={PATHS.profile} element={<PerfilPage />} />
            <Route path={PATHS.forbidden} element={<ForbiddenPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
