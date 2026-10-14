export type ClassValue = string | number | null | false | undefined

/** Minimal className joiner — avoids pulling in a dependency for this. */
export default function clsx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}
