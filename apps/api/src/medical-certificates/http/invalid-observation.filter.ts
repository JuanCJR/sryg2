import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from '@nestjs/common'
import type { Response } from 'express'
import { InvalidObservationError } from '../domain/medical-certificate'

/** An observation the catalog does not offer is a bad request, like any other invalid body field. */
@Catch(InvalidObservationError)
export class InvalidObservationFilter implements ExceptionFilter<InvalidObservationError> {
  catch(exception: InvalidObservationError, host: ArgumentsHost) {
    const statusCode = HttpStatus.BAD_REQUEST
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(statusCode)
      .json({ statusCode, error: 'Bad Request', message: exception.message })
  }
}
