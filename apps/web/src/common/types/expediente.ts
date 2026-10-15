import type { ComponentType } from 'react'
import type { PermissionAction, PermissionModule, PersonnelDto } from '@sryg/types'

/**
 * The Expediente is composed from slots each feature owns (F0-B): one tab component per page key
 * (`pages/<page>/components/<Tab>Tab.tsx`) and one header-actions component per feature
 * (`pages/<page>/components/<Feature>Actions.tsx`). `src/expediente-registry.ts`
 * lists them, so a wave-1 branch only edits its own page folder.
 */
export type ExpedienteTabId = 'datos' | 'documentos' | 'licencias' | 'medico' | 'bloqueos' | 'historial'

export interface ExpedienteSlotProps {
  person: PersonnelDto
}

export interface ExpedienteTab {
  id: ExpedienteTabId
  label: string
  /** The tab shows only when `can()` allows it; unset means every role that reads personnel. */
  permission?: { module: PermissionModule; action: PermissionAction }
  Component: ComponentType<ExpedienteSlotProps>
}

/** Renders the feature's header buttons, already filtered by `can()`; renders nothing when none apply. */
export type ExpedienteActions = ComponentType<ExpedienteSlotProps>
