# Shared credential core

Repositories every credential module reuses: `ValidityParametersRepository` (alert threshold, RAV 67 validity per class and license type validity, with their placeholder flag, D3) and `ActiveBlocksRepository` (BR-07); `deriveCredentialStatus` lives in `@sryg/types`. Import `CredentialsCoreModule` and inject either class; inside a transaction, build them on the transaction handle.

- `repositories/`: the two Drizzle repositories.
- `dtos/`: the parameter shapes they return.
