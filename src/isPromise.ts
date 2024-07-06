/**
 * `jōtai 👻` instruments its promises with extra metadata,
 * which we can occasionally use to compute something *sooner*,
 * instead of postponing the calculation onto the next tick.
 */
export type ExtraPromise<T> = Promise<T> & {
  status?: 'pending' | 'fulfilled' | 'rejected';
  value?: T;
  reason?: unknown;
};

export function isPromise<T, S>(
  value: ExtraPromise<T> | S,
): value is ExtraPromise<T> {
  return value && typeof value === 'object' && 'then' in value;
}
