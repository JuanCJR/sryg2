export type ClassValue = string | number | null | false | undefined

/** Minimal className joiner shared by app/feature code (mirrors design-system/utils/clsx). */
export default function clsx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}
