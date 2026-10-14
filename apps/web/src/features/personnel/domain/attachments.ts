import { checkAttachmentFile } from '@sryg/types'

const FILE_MESSAGES = {
  type: 'Solo se aceptan PDF, JPEG o PNG.',
  size: 'El archivo supera los 5 MB.',
  empty: 'El archivo está vacío.',
} as const

/** Null when the file can be attached (D21: PDF or image of up to 5 MB); otherwise why not. */
export function attachmentFileError(file: File): string | null {
  const problem = checkAttachmentFile({ mime: file.type, size: file.size })
  return problem ? FILE_MESSAGES[problem] : null
}

/** The API refusals of an upload, in the same words as the checks above. */
export function attachmentStatusMessage(status: number): string | null {
  if (status === 413) return FILE_MESSAGES.size
  if (status === 415) return FILE_MESSAGES.type
  return null
}

const sizeFormat = new Intl.NumberFormat('es-VE', { maximumFractionDigits: 1 })

/** "850 B", "2,5 KB", "4,8 MB". */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${sizeFormat.format(bytes / 1024)} KB`
  return `${sizeFormat.format(bytes / (1024 * 1024))} MB`
}
