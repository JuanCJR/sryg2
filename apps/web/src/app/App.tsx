import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { ToastProvider } from '../design-system'
import { RouteGate } from '../features/auth/containers/RouteGate'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { PATHS } from './routes'
import { RoleProvider } from './role/RoleProvider'
import { RequirePermission } from './role/RequirePermission'
import { AppShell } from './shell/AppShell'
import { ErrorTemplate } from './templates/ErrorTemplate'
import { PendingScreen } from './templates/PendingScreen'
import { ExpedientePage } from '../features/personnel/pages/ExpedientePage'
import { ListadoPage } from '../features/personnel/pages/ListadoPage'
import { EmisionLicenciaPage } from '../features/licenses/pages/EmisionLicenciaPage'
import { DEMO_PERSON_ID } from '../features/personnel/data/demoData'

const CatalogPage = import.meta.env.DEV
  ? lazy(() => import('../catalog/CatalogPage').then((m) => ({ default: m.CatalogPage })))
  : null

// Reachable without a session: the dev-only component catalog.
const UNGATED_PATHS: readonly string[] = import.meta.env.DEV ? ['/catalogo'] : []

function App() {
  return (
    <RoleProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<RouteGate area="login" />}>
              <Route path={PATHS.login} element={<LoginPage />} />
            </Route>
            <Route element={<RouteGate area="protected" ungatedPaths={UNGATED_PATHS} />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<Navigate to={`/personal/${DEMO_PERSON_ID}`} replace />} />
                <Route path="/personal/:id" element={<ExpedientePage />} />
                <Route path="/personal" element={<ListadoPage />} />
                <Route
                  path="/personal/:id/licencia"
                  element={
                    <RequirePermission permission="licenses:issueRenew">
                      <EmisionLicenciaPage />
                    </RequirePermission>
                  }
                />
                <Route path="/panel" element={<PendingScreen title="Panel" plannedChange="sryg-alerts-dashboard" />} />
                <Route
                  path="/reportes"
                  element={<PendingScreen title="Reportes" plannedChange="sryg-reports-audit" />}
                />
                <Route
                  path="/auditoria"
                  element={
                    <RequirePermission permission="audit:view">
                      <PendingScreen title="Auditoría" plannedChange="sryg-reports-audit" />
                    </RequirePermission>
                  }
                />
                <Route
                  path="/usuarios"
                  element={
                    <RequirePermission permission="users:admin">
                      <PendingScreen title="Usuarios" plannedChange="sryg-auth-rbac" />
                    </RequirePermission>
                  }
                />
                <Route
                  path="/parametros"
                  element={
                    <RequirePermission permission="settings:admin">
                      <PendingScreen title="Parámetros" plannedChange="sryg-alerts-dashboard / sryg-licenses-ratings" />
                    </RequirePermission>
                  }
                />
                <Route
                  path="/respaldos"
                  element={
                    <RequirePermission permission="backups:view">
                      <PendingScreen title="Respaldos" plannedChange="sryg-backups-ops" />
                    </RequirePermission>
                  }
                />
                <Route path="/perfil" element={<PendingScreen title="Perfil" plannedChange="sryg-auth-rbac" />} />
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
                <Route
                  path="*"
                  element={
                    <ErrorTemplate
                      code="404"
                      title="Página no encontrada"
                      explanation="La dirección solicitada no existe en esta demostración."
                    />
                  }
                />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </RoleProvider>
  )
}

export default App
