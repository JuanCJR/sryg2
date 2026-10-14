import { useId, type FormEvent } from 'react'
import { Search, X } from 'lucide-react'
import { IconButton } from '../../atoms/IconButton/IconButton'
import clsx from '../../utils/clsx'
import styles from './SearchBar.module.css'

export interface SearchBarProps {
  label: string
  value: string
  onChange: (value: string) => void
  onSubmit?: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchBar({ label, value, onChange, onSubmit, placeholder, className }: SearchBarProps) {
  const id = useId()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit?.(value)
  }

  return (
    <form role="search" className={clsx(styles.form, className)} onSubmit={handleSubmit}>
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <Search size={16} strokeWidth={1.75} className={styles.icon} aria-hidden="true" />
      <input
        id={id}
        type="search"
        className={styles.input}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {value ? (
        <IconButton icon={X} variant="ghost" iconSize={16} aria-label="Limpiar búsqueda" onClick={() => onChange('')} />
      ) : null}
    </form>
  )
}
