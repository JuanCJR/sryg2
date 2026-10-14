import { DomainError } from '../../shared/domain/errors'

/** A field the schema accepts but the business rules do not (e.g. an inactive catalog item). Maps to 400. */
export class InvalidPersonnelFieldError extends DomainError {
  constructor(
    readonly path: string,
    message: string,
  ) {
    super(message)
  }
}
