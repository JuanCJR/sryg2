import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import type { PermissionAction, PermissionModule } from '@sryg/types'
import { RouteGate } from './pages/auth/components/RouteGate'
import { LoginPage } from './pages/auth/LoginPage'
import { PerfilPage } from './pages/auth/PerfilPage'
import { PanelPage } from './pages/alerts/PanelPage'
import { AuditoriaPage } from './pages/audit/AuditoriaPage'
import { BloqueosPage } from './pages/blocking/BloqueosPage'
import { CatalogoPage } from './pages/catalogs/CatalogoPage'
import { CatalogosPage } from './pages/catalogs/CatalogosPage'
import { VerificarPage } from './pages/credentials/VerificarPage'
import { ConsultaLicenciasPage } from './pages/licenses/ConsultaLicenciasPage'
import { EmisionLicenciaPage } from './pages/licenses/EmisionLicenciaPage'
import { CertificadoMedicoPage } from './pages/medical-certificates/CertificadoMedicoPage'
import { EditarPersonalPage } from './pages/personnel/EditarPersonalPage'
import { ExpedientePage } from './pages/personnel/ExpedientePage'
import { ListadoPage } from './pages/personnel/ListadoPage'
import { RegistroPersonalPage } from './pages/personnel/RegistroPersonalPage'
import { ReportesPage } from './pages/reports/ReportesPage'
import { ParametrosPage } from './pages/settings/ParametrosPage'
import { UsuariosPage } from './pages/users/UsuariosPage'
import { ForbiddenPage } from './common/components/ForbiddenPage/ForbiddenPage'
import { NotFoundPage } from './common/components/NotFoundPage/NotFoundPage'
import { EXPEDIENTE_ACTIONS, EXPEDIENTE_TABS } from './expediente-registry'
import { RequirePermission } from './common/components/RequirePermission/RequirePermission'
import { SessionGate } from './common/components/SessionGate/SessionGate'
import { PATHS } from './routes'
import { AppShell } from './common/components/AppShell/AppShell'

const CatalogPage = import.meta.env.DEV
  ? lazy(() => import('./pages/catalog/CatalogPage').then((m) => ({ default: m.CatalogPage })))
  : null

function guard(module: PermissionModule, action: PermissionAction, page: ReactNode) {
  return (
    <RequirePermission module={module} action={action}>
      {page}
    </RequirePermission>
  )
}

/**
 * Every route of the app, pre-registered by F0-B: each points at its page
 * (`pages/<page>/<X>Page.tsx`) behind the `can()` check of D1/D24.
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
