import { type ExtraPromise, isPromise } from './isPromise.js';

type PromiseOrValue<T> = Promise<T> | T;

type SoonAll<T extends readonly [unknown, ...unknown[]]> = PromiseOrValue<{
	[Index in keyof T]: Awaited<T[Index]>;
}>;

function isKnown<T, S>(value: ExtraPromise<T> | S): boolean {
	if (isPromise(value)) {
		return value.status === 'fulfilled'; // only if fulfilled
	}

	return true; // not a promise, we know the value.
}

export function soonAll<T extends readonly [unknown, ...unknown[]]>(
	input: T,
): SoonAll<T> {
	if (input.every(isKnown)) {
		return input.map((el) =>
			isPromise(el) ? el.value : el,
		) as unknown as SoonAll<T>;
	}

	return Promise.all(input);
}
