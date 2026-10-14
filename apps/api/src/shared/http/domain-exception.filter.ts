import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from '@nestjs/common'
import type { Response } from 'express'
import { ConflictError, DomainError, ForbiddenError, InvalidCredentialsError, NotFoundError } from '../domain/errors'

const STATUS_BY_ERROR: Array<[abstract new (...args: never[]) => DomainError, HttpStatus, string]> = [
  [NotFoundError, HttpStatus.NOT_FOUND, 'Not Found'],
  [ConflictError, HttpStatus.CONFLICT, 'Conflict'],
  [InvalidCredentialsError, HttpStatus.UNAUTHORIZED, 'Unauthorized'],
  [ForbiddenError, HttpStatus.FORBIDDEN, 'Forbidden'],
]

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter<DomainError> {
  catch(exception: DomainError, host: ArgumentsHost) {
    const [, statusCode, error] = STATUS_BY_ERROR.find(([type]) => exception instanceof type) ?? [
      null,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'Internal Server Error',
    ]
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(statusCode)
      .json({ statusCode, error, message: exception.message })
  }
}
