import { customType } from 'drizzle-orm/pg-core'

/** Binary column (D5, D18, D21): node-postgres reads and writes it as a Buffer. */
export const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => 'bytea' })
