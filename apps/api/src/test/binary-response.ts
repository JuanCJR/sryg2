import type { Test } from 'supertest'

/** Collects a binary response body (xlsx, pdf) into a Buffer on `res.body`. */
export const binary = (test: Test): Test =>
  test.buffer(true).parse((response, callback) => {
    const chunks: Buffer[] = []
    response.on('data', (chunk: Buffer) => chunks.push(chunk))
    response.on('end', () => callback(null, Buffer.concat(chunks)))
  })
