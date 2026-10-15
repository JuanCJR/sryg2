// SRYG runs at INAC Maracay: times are shown in Venezuelan time, whatever the browser zone.
// Same format as the Perfil access log (pages/auth); pages may not import each other.
const FORMAT = new Intl.DateTimeFormat('es-VE', {
  timeZone: 'America/Caracas',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** "13/10/2026 · 12:05". */
export function formatTime(iso: string): string {
  const parts = Object.fromEntries(FORMAT.formatToParts(new Date(iso)).map((p) => [p.type, p.value]))
  return `${parts.day}/${parts.month}/${parts.year} · ${parts.hour}:${parts.minute}`
}
