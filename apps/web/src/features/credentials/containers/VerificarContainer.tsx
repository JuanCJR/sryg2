import { useParams } from 'react-router'
import { AuthTemplate } from '../../../app/templates/AuthTemplate'
import { ApiError } from '../../../shared/api/fetch-json'
import { useApiResource } from '../../../shared/api/useApiResource'
import { VerificationPitch } from '../components/VerificationPitch'
import { VerificationResult, type VerificationState } from '../components/VerificationResult'
import { verifyCredential } from '../data/credentials-client'

/** Public QR check (D9), signed out: AuthTemplate around the answer of /api/public/verify/:token. */
export function VerificarContainer() {
  const { token = '' } = useParams()
  const result = useApiResource(token || null, () => verifyCredential(token))

  let state: VerificationState
  if (result.status === 'ready') state = { kind: 'found', credential: result.data }
  else if (result.status === 'loading') state = { kind: 'loading' }
  else if (result.error instanceof ApiError && result.error.status === 404) state = { kind: 'not-found' }
  else if (result.error instanceof ApiError && result.error.status === 429) state = { kind: 'throttled' }
  else state = { kind: 'error', retry: result.retry }

  return (
    <AuthTemplate pitch={<VerificationPitch />}>
      <VerificationResult state={token ? state : { kind: 'not-found' }} />
    </AuthTemplate>
  )
}
