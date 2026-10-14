import { Label } from '../../../design-system'
import type { Person } from '../domain/types'
import clsx from '../../../lib/clsx'
import styles from './DatosPanel.module.css'

export interface DatosPanelProps {
  person: Person
}

function Item({ label, value, tabular = false }: { label: string; value: string; tabular?: boolean }) {
  return (
    <div className={styles.item}>
      <Label>{label}</Label>
      <span className={clsx(styles.value, tabular && styles.tabular)}>{value}</span>
    </div>
  )
}

export function DatosPanel({ person }: DatosPanelProps) {
  return (
    <div className={styles.grid}>
      <Item label="Cédula" value={person.cedula} tabular />
      <Item label="Nombres" value={person.nombres} />
      <Item label="Apellidos" value={person.apellidos} />
      <Item label="Fecha de nacimiento" value={person.fechaNacimiento} tabular />
      <Item label="Categoría" value={person.categoria} />
      <Item label="Cargo" value={person.cargo} />
      <Item label="Dependencia" value={person.dependencia} />
      <Item label="Estatus institucional" value={person.estatusInstitucional} />
      <Item label="Tipo de sangre" value={person.tipoSangre} />
      <Item label="Correo electrónico" value={person.email} tabular />
      <Item label="Teléfono" value={person.telefono} tabular />
      <Item label="Dirección" value={person.direccion} />
    </div>
  )
}
