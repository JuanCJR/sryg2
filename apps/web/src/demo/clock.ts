import { useState } from 'react'
import { useSearchParams } from 'react-router'

function parsePinnedDate(value: string | null): Date | null {
  if (!value) {
    return null
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    return null
  }
  const [, year, month, day] = match
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Returns one `Date` per mount, so every builder in a render pass agrees on "today".
 * `?hoy=YYYY-MM-DD` pins it for reproducible screenshots; without it, "today" is
 * the current date at mount time.
 */
export function useDemoToday(): Date {
  const [searchParams] = useSearchParams()
  const [today] = useState(() => parsePinnedDate(searchParams.get('hoy')) ?? new Date())
  return today
}
