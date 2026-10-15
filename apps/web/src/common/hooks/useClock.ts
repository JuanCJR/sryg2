import { useEffect, useState } from 'react'

const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
const UPDATE_INTERVAL_MS = 30_000

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00'
  return { day: get('day'), month: get('month'), year: get('year'), hour: get('hour'), minute: get('minute') }
}

function formatLine(date: Date): string {
  const vet = zonedParts(date, 'America/Caracas')
  const utc = zonedParts(date, 'UTC')
  const monthLabel = MONTHS[Number(vet.month) - 1] ?? vet.month
  return `${vet.day} ${monthLabel} ${vet.year} · ${vet.hour}:${vet.minute} VET · ${utc.hour}:${utc.minute} UTC`
}

/** Local Venezuela time plus UTC, refreshed every 30s. */
export function useClock(): string {
  const [line, setLine] = useState(() => formatLine(new Date()))

  useEffect(() => {
    const timer = setInterval(() => setLine(formatLine(new Date())), UPDATE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])

  return line
}
