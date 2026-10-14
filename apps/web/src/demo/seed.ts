/**
 * Deterministic helpers shared by every feature's `data/demoData.ts`.
 * No `Math.random`: seeded generation only, so the same module produces
 * byte-identical output on every run.
 */

/** Adds `days` (and an optional office hour/minute) to `base`, returning an ISO datetime. UTC-based so results do not shift with the host's timezone. */
export function addDays(base: Date, days: number, hour = 0, minute = 0): string {
  const result = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), hour, minute))
  result.setUTCDate(result.getUTCDate() + days)
  return result.toISOString()
}

const OFFICE_START_MINUTE = 7 * 60 + 30 // 07:30
const OFFICE_SPAN_MINUTES = 10 * 60 // through 17:30

/** Spreads a `seedIndex` across the office-hours window without repeating (97 and 600 share no common factor). */
export function officeHourMinute(seedIndex: number): { hour: number; minute: number } {
  const totalMinutes = OFFICE_START_MINUTE + ((seedIndex * 97) % OFFICE_SPAN_MINUTES)
  return { hour: Math.floor(totalMinutes / 60), minute: totalMinutes % 60 }
}

/**
 * Mulberry32: a small, fast, seeded PRNG. Returns a function that yields
 * floats in `[0, 1)`, deterministic for a given `seed`.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return function next() {
    state = (state + 0x6d2b79f5) | 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
