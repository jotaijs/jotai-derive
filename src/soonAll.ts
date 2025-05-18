import { type ExtraPromise, isPromise } from './isPromise.js';

type PromiseOrValue<T> = Promise<T> | T;

type SoonAll<T extends readonly unknown[]> = PromiseOrValue<{
	[Index in keyof T]: Awaited<T[Index]>;
}>;

function isKnown<T, S>(value: ExtraPromise<T> | S): boolean {
	if (isPromise(value)) {
		return value.status === 'fulfilled'; // only if fulfilled
	}

	return true; // not a promise, we know the value.
}

/**
 * Given array `values`, if all elements are known (are not unresolved promises),
 * returns an array of the same length with Awaited `values`. Otherwise, it returns a
 * promise to that array.
 */
export function soonAll<T extends readonly unknown[] | []>(
	values: T,
): SoonAll<T>;
export function soonAll<T extends readonly unknown[]>(values: T): SoonAll<T>;
export function soonAll<T extends readonly unknown[]>(values: T): SoonAll<T> {
	if (values.every(isKnown)) {
		return values.map((el) =>
			isPromise(el) ? el.value : el,
		) as unknown as SoonAll<T>;
	}

	return Promise.all(values);
}
