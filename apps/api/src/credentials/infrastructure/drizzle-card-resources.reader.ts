import { type DbExecutor, recursoGrafico } from '@sryg/db'
import type { CardImage, CardResources, CardResourcesReader } from '../domain/credential-card'

/** The graphic resources uploaded in Parámetros > Credencial (D18). */
export class DrizzleCardResourcesReader implements CardResourcesReader {
  constructor(private readonly executor: DbExecutor) {}

  async read(): Promise<CardResources> {
    const rows = await this.executor
      .select({ kind: recursoGrafico.kind, data: recursoGrafico.data, mime: recursoGrafico.mime })
      .from(recursoGrafico)
    const find = (kind: string): CardImage | null => {
      const row = rows.find((r) => r.kind === kind)
      return row ? { data: row.data, mime: row.mime } : null
    }
    return { logoInac: find('logo_inac'), presidentSignature: find('firma_presidente') }
  }
}
