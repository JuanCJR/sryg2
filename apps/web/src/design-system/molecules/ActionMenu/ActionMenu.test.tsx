// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActionMenu } from './ActionMenu'

afterEach(cleanup)

function setup() {
  const edit = vi.fn()
  const remove = vi.fn()
  const reset = vi.fn()
  render(
    <ActionMenu
      label="Acciones de Ana"
      items={[
        { label: 'Eliminar', onSelect: remove, danger: true },
        { label: 'Editar', onSelect: edit },
        { label: 'Restablecer', onSelect: reset, disabled: true },
      ]}
    />,
  )
  return { edit, remove, reset, user: userEvent.setup() }
}

describe('ActionMenu', () => {
  it('opens a menu of the row actions, destructive ones last, and runs the chosen one', async () => {
    const { edit, user } = setup()
    const trigger = screen.getByRole('button', { name: 'Acciones de Ana' })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('menu')).toBeNull()

    await user.click(trigger)
    const menu = screen.getByRole('menu', { name: 'Acciones de Ana' })
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(['Editar', 'Restablecer', 'Eliminar'])
    expect(document.activeElement?.textContent).toBe('Editar')

    await user.click(within(menu).getByRole('menuitem', { name: 'Editar' }))
    expect(edit).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('moves with the arrow keys, skipping disabled items, and closes on Escape', async () => {
    const { remove, user } = setup()
    screen.getByRole('button', { name: 'Acciones de Ana' }).focus()
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement?.textContent).toBe('Editar')
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement?.textContent).toBe('Eliminar')
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement?.textContent).toBe('Editar')
    await user.keyboard('{End}{Enter}')
    expect(remove).toHaveBeenCalledTimes(1)

    await user.keyboard('{ArrowDown}{Escape}')
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Acciones de Ana' }))
  })

  it('closes when the pointer goes down outside it', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Acciones de Ana' }))
    await user.click(document.body)
    expect(screen.queryByRole('menu')).toBeNull()
  })
})
