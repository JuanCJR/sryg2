import { Navigate, Outlet, useLocation } from 'react-router'
import { TemplateErrorFrame, TemplateLoadingFrame } from '../templates/TemplateFrames'
import { PATHS } from '../routes'
import { useRole } from './useRole'
import styles from './SessionGate.module.css'

/**
 * Inside the protected area: waits for `/api/auth/me`, and keeps a user with a pending forced
 * password change (D4, after an Admin reset) on `/perfil` until they change it.
 */
export function SessionGate() {
  const { status, user, reload } = useRole()
  const { pathname } = useLocation()

  if (status === 'error') {
    return (
      <div className={styles.wrap}>
        <TemplateErrorFrame
          error={{
            title: 'No se pudo cargar la sesión',
            message: 'El servidor no respondió. Revise la conexión a la red local e intente de nuevo.',
            onRetry: reload,
          }}
        />
      </div>
    )
  }

  if (status !== 'ready' || !user) {
    return (
      <div className={styles.wrap}>
        <TemplateLoadingFrame label="Cargando sesión" />
      </div>
    )
  }

  if (user.mustChangePassword && pathname !== PATHS.profile) return <Navigate to={PATHS.profile} replace />

  return <Outlet />
}
