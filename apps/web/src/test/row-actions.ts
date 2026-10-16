import { screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'

/** Opens a row's actions menu ("⋮", named by `trigger`) and chooses `item` (ActionMenu). */
export async function chooseRowAction(user: UserEvent, trigger: HTMLElement, item: string | RegExp) {
  await user.click(trigger)
  await user.click(screen.getByRole('menuitem', { name: item }))
}

/** The menu items a row's actions menu offers, by label. */
export async function rowActionLabels(user: UserEvent, trigger: HTMLElement): Promise<string[]> {
  await user.click(trigger)
  const labels = screen.getAllByRole('menuitem').map((item) => item.textContent ?? '')
  await user.keyboard('{Escape}')
  return labels
}
