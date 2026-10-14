/** Produces the temporary password of a new or reset account (D4, D14): shown once, never stored in clear. */
export interface TemporaryPasswordGenerator {
  generate(): string
}
