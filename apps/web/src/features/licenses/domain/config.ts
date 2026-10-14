// OD-06: validity periods are an open regulatory question. This is a synthetic demo default
// only — never an invented regulatory length — used solely to prefill the "nueva fecha de
// vencimiento" fields; the operator can change every date before submitting.
export const DEMO_LICENSE_VALIDITY_DAYS = 365

// OD-05 stand-in, kept feature-local (mirrors `personnel`'s own `DEMO_NEAR_EXPIRY_DAYS`) so
// `licenses` never imports across the feature boundary, per the layering ESLint rule.
export const DEMO_NEAR_EXPIRY_DAYS = 60
