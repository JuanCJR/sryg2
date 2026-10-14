import { randomInt } from 'node:crypto'
import { TEMPORARY_PASSWORD_LENGTH } from '@sryg/types'
import type { TemporaryPasswordGenerator } from '../domain/temporary-password-generator'

// No look-alike characters (0/O, 1/l/I): the Admin reads it out or copies it to the user.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export class CryptoTemporaryPasswordGenerator implements TemporaryPasswordGenerator {
  generate(): string {
    return Array.from({ length: TEMPORARY_PASSWORD_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')
  }
}
