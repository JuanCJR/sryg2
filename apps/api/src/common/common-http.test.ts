import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { ConflictError, ForbiddenError, InvalidCredentialsError, NotFoundError } from './errors/domain-errors'
import { DomainExceptionFilter } from './filters/domain-exception.filter'
import { ZodValidationPipe } from './pipes/zod-validation.pipe'

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(z.object({ n: z.coerce.number().int() }))

  it('returns parsed data', () => {
    expect(pipe.transform({ n: '3' })).toEqual({ n: 3 })
  })

  it('throws 400 with issue details', () => {
    try {
      pipe.transform({ n: 'x' })
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException)
      expect((error as BadRequestException).getResponse()).toMatchObject({ statusCode: 400, details: [{ path: 'n' }] })
    }
  })
})

describe('DomainExceptionFilter', () => {
  const respond = (error: Error) => {
    const json = vi.fn()
    const status = vi.fn(function (this: unknown, ...args: [number]) {
      return { json, args }
    })
    const host = { switchToHttp: () => ({ getResponse: () => ({ status }) }) }
    new DomainExceptionFilter().catch(error as never, host as never)
    return { status: status.mock.calls[0]?.[0], body: json.mock.calls[0]?.[0] }
  }

  it.each([
    [new NotFoundError('nope'), 404, 'Not Found'],
    [new ConflictError('dup'), 409, 'Conflict'],
    [new InvalidCredentialsError('bad'), 401, 'Unauthorized'],
    [new ForbiddenError('denied'), 403, 'Forbidden'],
  ])('maps %s to the ApiError body', (error, statusCode, label) => {
    expect(respond(error)).toEqual({ status: statusCode, body: { statusCode, error: label, message: error.message } })
  })
})
