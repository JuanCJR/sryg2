// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DateInput } from './atoms/DateInput/DateInput'
import { Combobox } from './molecules/Combobox/Combobox'
import { Pagination } from './molecules/Pagination/Pagination'
import { pageSlots } from './molecules/Pagination/pageSlots'
import { CheckboxFilter, FilterPanel } from './organisms/FilterPanel/FilterPanel'

afterEach(cleanup)

describe('pageSlots', () => {
  it('lists every page when there are few', () => {
    expect(pageSlots(2, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('collapses distant pages into gaps around the current one', () => {
    expect(pageSlots(1, 20)).toEqual([1, 2, 3, 4, 5, 'gap-end', 20])
    expect(pageSlots(10, 20)).toEqual([1, 'gap-start', 9, 10, 11, 'gap-end', 20])
    expect(pageSlots(20, 20)).toEqual([1, 'gap-start', 16, 17, 18, 19, 20])
  })
})

describe('Pagination', () => {
  it('shows the row range, jumps to a page and changes the page size', async () => {
    const onPageChange = vi.fn()
    const onPageSizeChange = vi.fn()
    const user = userEvent.setup()
    render(
      <Pagination
        page={2}
        pageCount={13}
        total={312}
        pageSize={25}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />,
    )
    const nav = screen.getByRole('navigation', { name: 'Paginación' })
    expect(nav.textContent).toContain('Mostrando 26–50 de 312')
    expect(screen.getByRole('button', { name: 'Página 2' }).getAttribute('aria-current')).toBe('page')

    await user.click(screen.getByRole('button', { name: 'Última página' }))
    expect(onPageChange).toHaveBeenLastCalledWith(13)
    await user.click(screen.getByRole('button', { name: 'Página 3' }))
    expect(onPageChange).toHaveBeenLastCalledWith(3)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filas por página' }), '50')
    expect(onPageSizeChange).toHaveBeenCalledWith(50)
  })
})

describe('FilterPanel + CheckboxFilter', () => {
  function Harness({ onChange }: { onChange: (value: string[]) => void }) {
    const [value, setValue] = useState<string[]>([])
    return (
      <FilterPanel activeCount={value.length} onClearAll={() => setValue([])}>
        <CheckboxFilter
          title="Tipo"
          options={[
            { value: 'a', label: 'Administrativo' },
            { value: 'm', label: 'Médico' },
          ]}
          value={value}
          onChange={(next) => {
            setValue(next)
            onChange(next)
          }}
        />
      </FilterPanel>
    )
  }

  it('checks several values in option order and clears them all', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)

    await user.click(screen.getByRole('checkbox', { name: 'Médico' }))
    await user.click(screen.getByRole('checkbox', { name: 'Administrativo' }))
    expect(onChange).toHaveBeenLastCalledWith(['a', 'm'])

    await user.click(screen.getByRole('button', { name: /Limpiar todo/ }))
    expect((screen.getByRole('checkbox', { name: 'Médico' }) as HTMLInputElement).checked).toBe(false)
  })
})

describe('Combobox', () => {
  const OPTIONS = [
    { value: 'av', label: 'Aviación' },
    { value: 'me', label: 'Mecánica' },
    { value: 'ca', label: 'Cabina' },
  ]

  function Harness({ onChange }: { onChange: (value: string | null) => void }) {
    const [value, setValue] = useState<string | null>(null)
    return (
      <Combobox
        aria-label="Área"
        options={OPTIONS}
        value={value}
        onChange={(next) => {
          setValue(next)
          onChange(next)
        }}
      />
    )
  }

  it('filters accent-insensitively, picks with Enter and clears with the × button', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)

    const combo = screen.getByRole('combobox', { name: 'Área' })
    await user.type(combo, 'aviacion')
    expect(screen.getAllByRole('option')).toHaveLength(1)
    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenLastCalledWith('av')
    expect((combo as HTMLInputElement).value).toBe('Aviación')

    await user.click(screen.getByRole('button', { name: 'Borrar selección' }))
    expect(onChange).toHaveBeenLastCalledWith(null)
  })
})

describe('DateInput calendar', () => {
  function Harness({ onChange, initial = '' }: { onChange: (value: string) => void; initial?: string }) {
    const [value, setValue] = useState(initial)
    return (
      <DateInput
        aria-label="Fecha"
        value={value}
        onChange={(event) => {
          setValue(event.target.value)
          onChange(event.target.value)
        }}
      />
    )
  }

  it('picks a day from the calendar and moves with the keyboard', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} initial="2026-03-10" />)

    await user.click(screen.getByRole('button', { name: 'Abrir calendario' }))
    const dialog = screen.getByRole('dialog', { name: 'Elegir fecha' })
    expect(document.activeElement?.getAttribute('aria-label')).toBe('martes 10 de marzo de 2026')

    await user.keyboard('{ArrowRight}{ArrowDown}')
    expect(document.activeElement?.getAttribute('aria-label')).toBe('miércoles 18 de marzo de 2026')
    await user.keyboard('{Enter}')

    expect(onChange).toHaveBeenLastCalledWith('2026-03-18')
    expect((screen.getByRole('textbox', { name: 'Fecha' }) as HTMLInputElement).value).toBe('18/03/2026')
    expect(dialog.isConnected).toBe(false)
  })

  it('jumps months with the selects and clears the field', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} initial="2026-03-10" />)

    await user.click(screen.getByRole('button', { name: 'Abrir calendario' }))
    const dialog = screen.getByRole('dialog')
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Año' }), '1990')
    await user.click(within(dialog).getByRole('button', { name: 'domingo 4 de marzo de 1990' }))
    expect(onChange).toHaveBeenLastCalledWith('1990-03-04')

    await user.click(screen.getByRole('button', { name: 'Borrar fecha' }))
    expect(onChange).toHaveBeenLastCalledWith('')
  })
})
