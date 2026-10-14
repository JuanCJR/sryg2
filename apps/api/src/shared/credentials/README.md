# Shared credential core

Ports and adapters every credential module reuses: `ValidityParametersReader` (alert threshold, RAV 67 validity per class and license type validity, with their placeholder flag, D3), `ActiveBlockQuery` (BR-07) and, in `@sryg/types`, `deriveCredentialStatus`. Import `CredentialsCoreModule` and inject `VALIDITY_PARAMETERS_READER` / `ACTIVE_BLOCK_QUERY`.
