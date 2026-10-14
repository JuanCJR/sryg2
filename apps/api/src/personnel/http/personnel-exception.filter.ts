import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from '@nestjs/common'
import type { Response } from 'express'
import { type FileProblem, InvalidPersonnelFieldError, InvalidPersonnelFileError } from '../domain/errors'

const FILE_STATUS: Record<FileProblem, [HttpStatus, string]> = {
  missing: [HttpStatus.BAD_REQUEST, 'Bad Request'],
  empty: [HttpStatus.BAD_REQUEST, 'Bad Request'],
  type: [HttpStatus.UNSUPPORTED_MEDIA_TYPE, 'Unsupported Media Type'],
  size: [HttpStatus.PAYLOAD_TOO_LARGE, 'Payload Too Large'],
}

/** Maps the personnel module's own domain errors; the global DomainExceptionFilter handles the rest. */
@Catch(InvalidPersonnelFieldError, InvalidPersonnelFileError)
export class PersonnelExceptionFilter implements ExceptionFilter<
  InvalidPersonnelFieldError | InvalidPersonnelFileError
> {
  catch(exception: InvalidPersonnelFieldError | InvalidPersonnelFileError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>()
    if (exception instanceof InvalidPersonnelFileError) {
      const [statusCode, error] = FILE_STATUS[exception.problem]
      response.status(statusCode).json({ statusCode, error, message: exception.message })
      return
    }
    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      message: 'Validation failed',
      details: [{ path: exception.path, message: exception.message }],
    })
  }
}
