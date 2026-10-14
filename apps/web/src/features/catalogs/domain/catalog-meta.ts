import { CATALOGS, type CatalogSlug, type Rav60Category, type Rav67Class } from '@sryg/types'

export interface CatalogMeta {
  /** Page title and index entry. */
  title: string
  /** One line on what the catalog feeds, for the index. */
  description: string
}

/** The D19 catalogs, in the order the index lists them. */
export const CATALOG_META: Record<CatalogSlug, CatalogMeta> = {
  'license-types': {
    title: 'Tipos de licencia',
    description: 'Categoría RAV 60, clase médica exigida y vigencia de cada licencia.',
  },
  'type-ratings': {
    title: 'Habilitaciones de tipo',
    description: 'Modelos de aeronave de las habilitaciones de tipo.',
  },
  'class-ratings': { title: 'Habilitaciones de clase', description: 'Clases de las habilitaciones de clase.' },
  aircraft: { title: 'Aeronaves', description: 'Aeronaves que se listan en las habilitaciones de clase.' },
  functions: { title: 'Funciones', description: 'Función en una habilitación de tipo (Capitán/PIC, Copiloto/SIC…).' },
  'license-observations': {
    title: 'Observaciones de licencia',
    description: 'Observaciones que se imprimen en la licencia.',
  },
  'medical-observations': {
    title: 'Observaciones médicas',
    description: 'Restricciones operativas del certificado médico; nunca diagnósticos.',
  },
  'document-types': { title: 'Tipos de documento', description: 'Documentos de identidad del personal.' },
  'attachment-types': { title: 'Tipos de adjunto', description: 'Clases de documentos adjuntos al expediente.' },
  nationalities: { title: 'Nacionalidades', description: 'Nacionalidades del personal.' },
}

export function isCatalogSlug(value: string | undefined): value is CatalogSlug {
  return value !== undefined && (CATALOGS as readonly string[]).includes(value)
}

export const RAV60_LABEL: Record<Rav60Category, string> = {
  piloto_transporte_linea: 'Piloto de transporte de línea',
  piloto_comercial: 'Piloto comercial',
  piloto_privado: 'Piloto privado',
  tripulante_cabina: 'Tripulante de cabina',
  tecnico_mantenimiento: 'Técnico de mantenimiento',
  controlador_transito_aereo: 'Controlador de tránsito aéreo',
}

export const RAV67_LABEL: Record<Rav67Class, string> = {
  clase_1: 'Clase 1',
  clase_2: 'Clase 2',
  clase_3: 'Clase 3',
}

/** D3: shown next to a validity the Admin has not saved yet. */
export const PLACEHOLDER_MARK = 'PENDIENTE INAC'

export const formatValidity = (months: number | null | undefined) =>
  months == null ? '—' : `${months} ${months === 1 ? 'mes' : 'meses'}`
