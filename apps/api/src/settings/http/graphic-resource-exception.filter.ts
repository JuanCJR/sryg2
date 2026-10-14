import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from '@nestjs/common'
import type { Response } from 'express'
import { EmptyImageError, ImageTooLargeError, UnsupportedImageTypeError } from '../domain/graphic-resource'

type ImageError = EmptyImageError | ImageTooLargeError | UnsupportedImageTypeError

const STATUS: Array<[new (message: string) => ImageError, HttpStatus, string]> = [
  [EmptyImageError, HttpStatus.BAD_REQUEST, 'Bad Request'],
  [ImageTooLargeError, HttpStatus.PAYLOAD_TOO_LARGE, 'Payload Too Large'],
  [UnsupportedImageTypeError, HttpStatus.UNSUPPORTED_MEDIA_TYPE, 'Unsupported Media Type'],
]

/** Maps the image validation errors of D18; other domain errors fall through to the global filter. */
@Catch(EmptyImageError, ImageTooLargeError, UnsupportedImageTypeError)
export class GraphicResourceExceptionFilter implements ExceptionFilter<ImageError> {
  catch(exception: ImageError, host: ArgumentsHost) {
    const [, statusCode, error] = STATUS.find(([type]) => exception instanceof type)!
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(statusCode)
      .json({ statusCode, error, message: exception.message })
  }
}
