/** mulberry32: small, fast and fully deterministic for a given 32-bit seed. */
export function createRandom(seed: number) {
  let state = seed >>> 0
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1))
  const pick = <T>(items: readonly T[]): T => items[int(0, items.length - 1)]!
  /** `count` distinct items, in a stable order. */
  const sample = <T>(items: readonly T[], count: number): T[] => {
    const pool = [...items]
    const chosen: T[] = []
    while (chosen.length < count && pool.length > 0) chosen.push(pool.splice(int(0, pool.length - 1), 1)[0]!)
    return chosen
  }
  /** RFC 4122 version 4 layout, drawn from the generator so ids repeat across runs. */
  const uuid = () => {
    const hex = Array.from({ length: 32 }, () => int(0, 15).toString(16))
    hex[12] = '4'
    hex[16] = ((int(0, 15) & 0x3) | 0x8).toString(16)
    const s = hex.join('')
    return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`
  }
  return { next, int, pick, sample, uuid }
}

export type Random = ReturnType<typeof createRandom>
