// Contracts of the credential PDFs (W2-2, D7): one CR80 document per kind.
export const CREDENTIAL_DOCUMENTS = ['license', 'medical'] as const
export type CredentialDocument = (typeof CREDENTIAL_DOCUMENTS)[number]
