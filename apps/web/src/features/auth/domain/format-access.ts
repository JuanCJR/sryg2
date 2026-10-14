// SRYG runs at INAC Maracay: access times are shown in Venezuelan time, whatever the browser zone.
const FORMAT = new Intl.DateTimeFormat('es-VE', {
  timeZone: 'America/Caracas',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** "13/10/2026 · 12:05" (D23). */
export function formatAccessTime(iso: string): string {
  const parts = Object.fromEntries(FORMAT.formatToParts(new Date(iso)).map((p) => [p.type, p.value]))
  return `${parts.day}/${parts.month}/${parts.year} · ${parts.hour}:${parts.minute}`
}
