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

type PromiseExtra<T> =
	| {
			status: 'pending';
	  }
	| {
			status: 'fulfilled';
			value: T;
	  }
	| {
			status: 'rejected';
			reason: unknown;
	  };

export function isPromise<T, S>(
	value: ExtraPromise<T> | S,
): value is ExtraPromise<T> {
	return value && typeof value === 'object' && 'then' in value;
}

/**
 * If it's a non promise, or a fulfilled promise.
 */
export function isKnown<T>(value: ExtraPromise<T> | unknown): boolean {
	if (isPromise(value)) {
		return value.status === 'fulfilled'; // only if fulfilled
	}

	return true; // not a promise, we know the value.
}

/**
 * NOTE: If `promiseOrValue` is a Promise, but is not fulfilled, then it's undefined behavior.
 * @returns `promiseOrValue` if it's not a Promise, the fulfilled value if it's a Promise.
 */
export function getFulfilledValue<T>(promiseOrValue: unknown): T {
	if (isPromise(promiseOrValue)) {
		return promiseOrValue.value as T;
	}
	return promiseOrValue as T;
}

export function getPromiseExtra<T>(
	promise: unknown | Promise<T>,
): PromiseExtra<T> | undefined {
	if (!isPromise(promise)) {
		return undefined;
	}

	if (promise.status === 'fulfilled') {
		return { status: 'fulfilled', value: promise.value as Awaited<T> };
	}

	if (promise.status === 'rejected') {
		return { status: 'rejected', reason: promise.reason };
	}

	return { status: 'pending' };
}
