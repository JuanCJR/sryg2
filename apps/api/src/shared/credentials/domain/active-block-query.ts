/** Whether a person has an unresolved block (BR-07): credentials are not issued while it lasts (D9). */
export interface ActiveBlockQuery {
  hasActiveBlock(personalId: string): Promise<boolean>
  /** The subset of `personalIds` with an active block, for lists and reports. */
  withActiveBlock(personalIds: readonly string[]): Promise<Set<string>>
}
