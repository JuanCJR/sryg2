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

/** Why an uploaded file is refused: missing, empty, of a type not accepted, or too large. */
export type FileProblem = 'missing' | 'empty' | 'type' | 'size'

/** An upload the personnel file does not accept (D5, D21). Maps to 400, 413 or 415. */
export class InvalidPersonnelFileError extends DomainError {
  constructor(readonly problem: FileProblem) {
    super(
      {
        missing: 'A file is required',
        empty: 'The file is empty',
        type: 'Unsupported file type',
        size: 'The file is too large',
      }[problem],
    )
  }
}
