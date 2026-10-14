import { hash, verify } from '@node-rs/argon2'
import type { PasswordHasher } from '../domain/password-hasher'

/** Single source of hashing parameters, shared by login and the seed CLI. Defaults are argon2id (OWASP profile). */
export class Argon2PasswordHasher implements PasswordHasher {
  hash(plain: string) {
    return hash(plain)
  }

  async verify(hashed: string, plain: string) {
    try {
      return await verify(hashed, plain)
    } catch {
      // Malformed stored hash: treat as mismatch rather than leaking a 500.
      return false
    }
  }
}
