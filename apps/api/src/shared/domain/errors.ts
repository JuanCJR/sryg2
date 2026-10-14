/** Base class for business errors raised by domain/application code; mapped to HTTP by DomainExceptionFilter. */
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = new.target.name
  }
}

export class NotFoundError extends DomainError {}
export class ConflictError extends DomainError {}
export class InvalidCredentialsError extends DomainError {}
export class ForbiddenError extends DomainError {}
