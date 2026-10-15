export type PageSlot = number | 'gap-start' | 'gap-end'

/** First, last, the current page and its neighbours; gaps collapse into an ellipsis. */
export function pageSlots(page: number, pageCount: number): PageSlot[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1)
  }
  const start = Math.max(2, Math.min(page - 1, pageCount - 4))
  const end = Math.min(pageCount - 1, Math.max(page + 1, 5))
  const slots: PageSlot[] = [1]
  if (start > 2) slots.push('gap-start')
  for (let current = start; current <= end; current += 1) slots.push(current)
  if (end < pageCount - 1) slots.push('gap-end')
  slots.push(pageCount)
  return slots
}
