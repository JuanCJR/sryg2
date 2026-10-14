import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from '@nestjs/common'
import type { Response } from 'express'
import { InvalidPersonnelFieldError } from '../domain/errors'

/** Maps the personnel module's own domain errors; the global DomainExceptionFilter handles the rest. */
@Catch(InvalidPersonnelFieldError)
export class PersonnelExceptionFilter implements ExceptionFilter<InvalidPersonnelFieldError> {
  catch(exception: InvalidPersonnelFieldError, host: ArgumentsHost) {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(HttpStatus.BAD_REQUEST)
      .json({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'Validation failed',
        details: [{ path: exception.path, message: exception.message }],
      })
  }
}
