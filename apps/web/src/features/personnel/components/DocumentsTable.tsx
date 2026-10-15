import { Download, Trash2 } from 'lucide-react'
import type { PersonnelAttachmentDto } from '@sryg/types'
import { ActionMenu, TableFrame } from '../../../design-system'
import { formatFileSize } from '../domain/attachments'
import { formatDateTime } from '../domain/format'
import styles from './DocumentsTable.module.css'

export interface DocumentsTableProps {
  attachments: PersonnelAttachmentDto[]
  /** Hides the delete action (Consulta). */
  canDelete: boolean
  onDownload: (attachment: PersonnelAttachmentDto) => void
  onDelete: (attachment: PersonnelAttachmentDto) => void
}

/** The documents of the person's file, newest first (D21). Stacks into cards on phone. */
export function DocumentsTable({ attachments, canDelete, onDownload, onDelete }: DocumentsTableProps) {
  return (
    <TableFrame>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Documento</th>
            <th scope="col">Tipo</th>
            <th scope="col" className={styles.figure}>
              Tamaño
            </th>
            <th scope="col">Adjuntado</th>
            <th scope="col">
              <span className="visually-hidden">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {attachments.map((attachment) => (
            <tr key={attachment.id}>
              <th scope="row" className={styles.name}>
                {attachment.filename}
              </th>
              <td className={styles.type}>{attachment.attachmentTypeName}</td>
              <td className={styles.figure}>{formatFileSize(attachment.size)}</td>
              <td className={styles.date}>{formatDateTime(attachment.createdAt)}</td>
              <td className={styles.actions}>
                <ActionMenu
                  label={`Acciones de ${attachment.filename}`}
                  items={[
                    { label: 'Descargar', icon: Download, onSelect: () => onDownload(attachment) },
                    ...(canDelete
                      ? [{ label: 'Eliminar', icon: Trash2, danger: true, onSelect: () => onDelete(attachment) }]
                      : []),
                  ]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableFrame>
  )
}
