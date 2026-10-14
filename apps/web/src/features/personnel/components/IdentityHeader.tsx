import { useId } from 'react'
import { UserPlus, Lock, Pencil, Printer } from 'lucide-react'
import { Avatar, Button, StatusBadge, type CredentialStatus } from '../../../design-system'
import type { Person } from '../domain/types'
import styles from './IdentityHeader.module.css'

export interface IdentityHeaderProps {
  person: Person
  worst: CredentialStatus
  auditText: string
  auditFigure: string
  onAuditClick: () => void
  hasOpenBlock: boolean
  openBlockId?: string
  isConsulta: boolean
  canIssueRenew: boolean
  canRegisterBlock: boolean
  canEditData: boolean
  canPrint: boolean
  onIssueRenew: () => void
  onRegisterBlock: () => void
  onEditData: () => void
  onPrint: () => void
}

export function IdentityHeader({
  person,
  worst,
  auditText,
  auditFigure,
  onAuditClick,
  hasOpenBlock,
  openBlockId,
  isConsulta,
  canIssueRenew,
  canRegisterBlock,
  canEditData,
  canPrint,
  onIssueRenew,
  onRegisterBlock,
  onEditData,
  onPrint,
}: IdentityHeaderProps) {
  const reasonId = useId()
  const blockedReason = hasOpenBlock ? `Emisión impedida por el bloqueo ${openBlockId}.` : undefined

  return (
    <div className={styles.wrap}>
      <div className={styles.identity}>
        <Avatar src={person.fotoUrl} alt={`Foto de ${person.nombre}`} size="lg" className={styles.avatarPhoto} />
        <div className={styles.body}>
          <div className={styles.heading}>
            <h1 className={styles.cedula}>{person.cedula}</h1>
            <p className={styles.name}>{person.nombre}</p>
          </div>
          <p className={styles.category}>
            {person.categoria.toUpperCase()} · {person.ratingLabel}
          </p>
          <div className={styles.statusBlock}>
            <span className={styles.statusLabel}>Estado general</span>
            <StatusBadge status={worst} size="lg" />
          </div>
          {isConsulta ? (
            <p className={styles.auditText}>
              {auditText} <span className={styles.auditFigure}>{auditFigure}</span>
            </p>
          ) : (
            <button type="button" className={styles.auditLink} onClick={onAuditClick}>
              {auditText} <span className={styles.auditFigure}>{auditFigure}</span>
            </button>
          )}
        </div>
      </div>

      {isConsulta ? null : (
        <div className={styles.actions}>
          <div className={styles.actionRow}>
            {canIssueRenew ? (
              <Button
                variant="primary"
                icon={UserPlus}
                disabled={hasOpenBlock}
                aria-describedby={hasOpenBlock ? reasonId : undefined}
                onClick={onIssueRenew}
              >
                Emitir o renovar
              </Button>
            ) : null}
            {canRegisterBlock ? (
              <Button variant="secondary" icon={Lock} onClick={onRegisterBlock}>
                Registrar bloqueo
              </Button>
            ) : null}
            {canEditData ? (
              <Button variant="secondary" icon={Pencil} onClick={onEditData}>
                Editar datos
              </Button>
            ) : null}
            {canPrint ? (
              <Button
                variant="ghost"
                icon={Printer}
                disabled={hasOpenBlock}
                aria-describedby={hasOpenBlock ? reasonId : undefined}
                onClick={onPrint}
              >
                Imprimir credencial
              </Button>
            ) : null}
          </div>
          {blockedReason ? (
            <p id={reasonId} className={styles.reason}>
              {blockedReason}
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}
