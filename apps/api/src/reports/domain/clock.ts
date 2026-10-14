/** Source of "now", so the date a status is derived for is explicit. */
export interface Clock {
  now(): Date
}
