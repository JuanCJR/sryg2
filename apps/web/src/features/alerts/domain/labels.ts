import type { AlertArea, CredentialKind } from '@sryg/types'
import type { Acknowledgement } from './alert-view'

export const CREDENTIAL_KIND_LABELS: Record<CredentialKind, string> = {
  licencia: 'Licencia',
  habilitacion_tipo: 'Habilitación de tipo',
  habilitacion_clase: 'Habilitación de clase',
  certificado_medico: 'Certificado médico',
}

export const AREA_LABELS: Record<AlertArea, string> = {
  licencias: 'Licencias',
  medicina: 'Medicina',
}

export const ACKNOWLEDGEMENT_LABELS: Record<Acknowledgement, string> = {
  pendientes: 'Pendientes',
  reconocidas: 'Reconocidas',
}
