/** Omit that keeps each member of a union, e.g. Preact's input props, which pair `type` with its roles. */
export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never
