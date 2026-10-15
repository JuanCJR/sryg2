import { randomInt } from 'node:crypto'
import { TEMPORARY_PASSWORD_LENGTH } from '@sryg/types'

// No look-alike characters (0/O, 1/l/I): the Admin reads it out or copies it to the user.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Produces the temporary password of a new or reset account (D4, D14): shown once, never stored in clear. */
export class CryptoTemporaryPasswordGenerator {
  generate(): string {
    return Array.from({ length: TEMPORARY_PASSWORD_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')
  }
}
