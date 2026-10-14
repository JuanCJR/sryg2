import type { CatalogOption } from '@sryg/types'
import { DateInput, FormField, Input, Notice, StatusBadge, type CredentialStatus } from '../../../design-system'
import { CatalogSelect } from '../../catalogs/CatalogSelect'
import styles from './LicenseSection.module.css'

export interface LicenseSectionCurrent {
  tipo: string
  estadoActual: CredentialStatus
  venceActualLabel: string
}

export interface LicenseSectionProps {
  /** The license being renewed; absent when issuing a new one (the type is then chosen here). */
  current?: LicenseSectionCurrent
  licenseType: CatalogOption | null
  onLicenseTypeChange: (option: CatalogOption | null) => void
  numero: string
  onNumeroChange: (value: string) => void
  fechaEmision: string
  onFechaEmisionChange: (value: string) => void
  /** The expiry the API projects from the type's validity (D3, D20). */
  nuevoVenceLabel: string
  /** Reasons the API would refuse the trámite (D13), shown before confirming (LIC-05). */
  problems: string[]
  errors: { licenseType?: string; number?: string; issueDate?: string }
}

/** The LICENCIA section: the type (or the current record when renewing), number, issue date and new expiry. */
export function LicenseSection({
  current,
  licenseType,
  onLicenseTypeChange,
  numero,
  onNumeroChange,
  fechaEmision,
  onFechaEmisionChange,
  nuevoVenceLabel,
  problems,
  errors,
}: LicenseSectionProps) {
  return (
    <div className={styles.stack}>
      {problems.length > 0 ? (
        <Notice tone="caution" title="El trámite será rechazado">
          {problems.map((problem) => (
            <p key={problem}>{problem}</p>
          ))}
        </Notice>
      ) : null}
      <div className={styles.grid}>
        {current ? (
          <>
            <div className={styles.readonly}>
              <span className={styles.readonlyLabel}>Tipo</span>
              <span className={styles.readonlyValue}>{current.tipo}</span>
            </div>
            <div className={styles.readonly}>
              <span className={styles.readonlyLabel}>Estado actual</span>
              <StatusBadge status={current.estadoActual} />
            </div>
            <div className={styles.readonly}>
              <span className={styles.readonlyLabel}>Vence actualmente</span>
              <span className={styles.readonlyValueFigure}>{current.venceActualLabel}</span>
            </div>
          </>
        ) : (
          <div className={styles.wide}>
            <FormField label="Tipo de licencia" required error={errors.licenseType}>
              {(controlProps) => (
                <CatalogSelect
                  {...controlProps}
                  catalog="license-types"
                  value={licenseType}
                  onChange={onLicenseTypeChange}
                />
              )}
            </FormField>
          </div>
        )}
        <div className={styles.field}>
          <FormField
            label="Número"
            required
            error={errors.number}
            hint="Por defecto, el número de documento del titular."
          >
            {(controlProps) => (
              <Input {...controlProps} mono value={numero} onChange={(event) => onNumeroChange(event.target.value)} />
            )}
          </FormField>
        </div>
        <div className={styles.field}>
          <FormField label="Fecha de emisión" required error={errors.issueDate}>
            {(controlProps) => (
              <DateInput
                {...controlProps}
                value={fechaEmision}
                onChange={(event) => onFechaEmisionChange(event.target.value)}
              />
            )}
          </FormField>
        </div>
        <div className={styles.readonly}>
          <span className={styles.readonlyLabel}>{current ? 'Nuevo vencimiento' : 'Vencimiento'}</span>
          <span className={styles.readonlyValueFigure}>{nuevoVenceLabel}</span>
          <span className={styles.hint}>Calculado con la vigencia del tipo de licencia.</span>
        </div>
      </div>
    </div>
  )
}
