import { randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import { type Db, usuario } from '@sryg/db'
import type { Role, UserArea } from '@sryg/types'
import { inArray } from 'drizzle-orm'
import request from 'supertest'
import { Argon2PasswordHasher } from '../auth/services/argon2-password-hasher'

export const TEST_PASSWORD = 'correct horse battery staple'

export interface TestUser {
  id: string
  email: string
  token: string
}

/**
 * Creates one active user per requested role/area with a run-unique email and logs each one in.
 * Users that gain audit rows cannot be deleted later (append-only trail), hence the unique emails.
 */
export async function createTestUsers<K extends string>(
  db: Db,
  app: INestApplication,
  specs: Record<K, { role: Role; area: UserArea }>,
): Promise<Record<K, TestUser>> {
  const run = randomUUID().slice(0, 8)
  const passwordHash = await new Argon2PasswordHasher().hash(TEST_PASSWORD)
  const entries = Object.entries(specs) as Array<[K, { role: Role; area: UserArea }]>
  await db.insert(usuario).values(
    entries.map(([key, spec]) => ({
      email: `${key.toLowerCase()}-${run}@sryg.test`,
      fullName: `Test ${key}`,
      passwordHash,
      ...spec,
    })),
  )
  const result = {} as Record<K, TestUser>
  for (const [key] of entries) {
    const email = `${key.toLowerCase()}-${run}@sryg.test`
    const res = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password: TEST_PASSWORD })
    if (res.status !== 200) throw new Error(`Login failed for ${email}: ${res.status}`)
    result[key] = { id: res.body.user.id, email, token: res.body.accessToken }
  }
  return result
}

/** Best effort: rows that gained audit rows stay behind. */
export async function deleteTestUsers(db: Db, users: Record<string, TestUser>) {
  await db
    .delete(usuario)
    .where(
      inArray(
        usuario.email,
        Object.values(users).map((u) => u.email),
      ),
    )
    .catch(() => undefined)
}
