/** Today's date, `YYYY-MM-DD`; statuses are derived against it (BR-12). */
export interface Clock {
  today(): string
}
