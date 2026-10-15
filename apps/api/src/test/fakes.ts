/** The public members of a class: what an in-memory test fake has to implement. */
export type PublicPart<T> = Pick<T, keyof T>

/** Hands a fake to code typed against the concrete class, which only uses its public members. */
export const asReal = <T>(fake: Partial<PublicPart<T>>): T => fake as T
