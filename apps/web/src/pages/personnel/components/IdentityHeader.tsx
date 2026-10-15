import type { ReactNode } from 'react'
import { Avatar, Lamp, StatusBadge, type CredentialStatus } from '../../../common/components'
import type { Person } from '../utils/types'
import styles from './IdentityHeader.module.css'

export interface IdentityHeaderProps {
  person: Person
  /** Worst credential status; undefined while no credential data is available. */
  worst?: CredentialStatus
  auditText: string
  auditFigure: string
  /** When unset the audit line is plain text (the user cannot open the Historial). */
  onAuditClick?: () => void
  /** Header actions contributed by each feature (`<Feature>Actions`); empty when none apply. */
  actions?: ReactNode
}

export function IdentityHeader({ person, worst, auditText, auditFigure, onAuditClick, actions }: IdentityHeaderProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.identity}>
        <Avatar src={person.fotoUrl} alt={`Foto de ${person.nombre}`} size="lg" className={styles.avatarPhoto} />
        <div className={styles.body}>
          <div className={styles.heading}>
            <h1 className={styles.cedula}>{person.cedula}</h1>
            <p className={styles.name}>{person.nombre}</p>
          </div>
          <p className={styles.category}>{person.categoria.toUpperCase()}</p>
          <div className={styles.statusBlock}>
            <span className={styles.statusLabel}>Estado general</span>
            {worst ? (
              <StatusBadge status={worst} size="lg" />
            ) : (
              <span className={styles.unknownStatus}>
                <Lamp status="sin-datos" size="lg" />
                Sin datos
              </span>
            )}
          </div>
          {onAuditClick ? (
            <button type="button" className={styles.auditLink} onClick={onAuditClick}>
              {auditText} <span className={styles.auditFigure}>{auditFigure}</span>
            </button>
          ) : (
            <p className={styles.auditText}>
              {auditText} <span className={styles.auditFigure}>{auditFigure}</span>
            </p>
          )}
        </div>
      </div>

      {actions ? (
        <div className={styles.actions}>
          <div className={styles.actionRow}>{actions}</div>
        </div>
      ) : null}
    </div>
  )
}
