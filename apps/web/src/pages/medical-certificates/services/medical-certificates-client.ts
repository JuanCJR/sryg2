import {
  medicalCertificateHistoryEntrySchema,
  medicalCertificateSchema,
  medicalValiditySchema,
  personMedicalCertificatesSchema,
  personnelSchema,
  type MedicalCertificateDto,
  type MedicalCertificateHistoryEntryDto,
  type MedicalValidityDto,
  type PersonMedicalCertificatesDto,
  type PersonnelDto,
  type RegisterMedicalCertificateInput,
  type RenewMedicalCertificateInput,
} from '@sryg/types'
import { fetchJson as defaultFetchJson, type FetchJson } from '../../../common/services/fetch-json'

const historySchema = medicalCertificateHistoryEntrySchema.array()
const personPath = (personalId: string) => `/api/personnel/${encodeURIComponent(personalId)}/medical-certificates`
const certificatePath = (id: string) => `/api/medical-certificates/${encodeURIComponent(id)}`

/** GET /api/personnel/:id — the holder the form acts on (features never import each other's clients). */
export async function getHolder(personalId: string, fetchJson: FetchJson = defaultFetchJson): Promise<PersonnelDto> {
  return personnelSchema.parse(await fetchJson<unknown>(`/api/personnel/${encodeURIComponent(personalId)}`))
}

/** GET /api/personnel/:id/medical-certificates — newest first, with the block flag and the threshold. */
export async function listPersonCertificates(
  personalId: string,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<PersonMedicalCertificatesDto> {
  return personMedicalCertificatesSchema.parse(await fetchJson<unknown>(personPath(personalId)))
}

/** GET /api/medical-certificates/validity — months per RAV 67 class (D3). */
export async function getMedicalValidity(fetchJson: FetchJson = defaultFetchJson): Promise<MedicalValidityDto> {
  return medicalValiditySchema.parse(await fetchJson<unknown>('/api/medical-certificates/validity'))
}

/** GET /api/medical-certificates/:id/history — audit rows, newest first (MED-07). */
export async function getCertificateHistory(
  id: string,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<MedicalCertificateHistoryEntryDto[]> {
  return historySchema.parse(await fetchJson<unknown>(`${certificatePath(id)}/history`))
}

/** POST /api/personnel/:id/medical-certificates — 409 while the person has an active block. */
export async function registerCertificate(
  personalId: string,
  body: RegisterMedicalCertificateInput,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<MedicalCertificateDto> {
  return medicalCertificateSchema.parse(await fetchJson<unknown>(personPath(personalId), { method: 'POST', body }))
}

/** POST /api/medical-certificates/:id/renew — 409 while the person has an active block. */
export async function renewCertificate(
  id: string,
  body: RenewMedicalCertificateInput,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<MedicalCertificateDto> {
  return medicalCertificateSchema.parse(
    await fetchJson<unknown>(`${certificatePath(id)}/renew`, { method: 'POST', body }),
  )
}
