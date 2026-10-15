export type ClassValue = string | number | null | false | undefined

/** Minimal className joiner shared by every page and common component. */
export default function clsx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}
