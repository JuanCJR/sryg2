import type { NestMiddleware } from '@nestjs/common'
import { GRAPHIC_RESOURCE_MAX_BYTES } from '@sryg/types'
import type { NextFunction, Request, Response } from 'express'

/**
 * Reads a non-JSON request body into a Buffer (`req.body`) for the image uploads (D18). It keeps at
 * most one byte over the limit, enough for the service to reject the image as too large, and drains
 * the rest so the client still gets the response. A JSON body was already parsed and is left as is.
 */
export class RawImageBodyMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    if (req.readableEnded || req.is('application/json')) return next()
    const cap = GRAPHIC_RESOURCE_MAX_BYTES + 1
    const chunks: Buffer[] = []
    let kept = 0
    req.on('data', (chunk: Buffer) => {
      if (kept >= cap) return
      const slice = chunk.subarray(0, cap - kept)
      chunks.push(slice)
      kept += slice.length
    })
    req.on('end', () => {
      req.body = Buffer.concat(chunks)
      next()
    })
    req.on('error', next)
  }
}
