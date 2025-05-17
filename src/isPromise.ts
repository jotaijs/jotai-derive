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
