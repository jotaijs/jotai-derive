import { type Atom, atom } from 'jotai/vanilla';
import { getPromiseExtra, isPromise } from './isPromise.js';

type EagerGetter = <Value>(atom: Atom<Value>) => Awaited<Value>;
type Read<Value> = (get: EagerGetter) => Value;

const NotYet = Symbol(
	'(jotai-eager) Not all dependencies were fulfilled. Are you a dev? Call `isEagerError(e)` to detect this thrown value and rethrow it, as its handled by the library.',
);

interface EagerError {
	[NotYet]: Promise<unknown>;
}

export function isEagerError(error: unknown): boolean {
	return !!(error as EagerError)?.[NotYet];
}

function unwrapPromise<T>(promise: T): Awaited<T> {
	const extra = getPromiseExtra(promise);

	if (!extra) {
		// Not a promise
		return promise as Awaited<T>;
	}

	if (extra.status === 'pending') {
		throw { [NotYet]: promise as Promise<unknown> } satisfies EagerError;
	}

	if (extra.status === 'rejected') {
		throw extra.reason;
	}

	return extra.value as Awaited<T>; // Fulfilled
}

function resolveSuspension<T>(
	compute: () => T,
	signal: AbortSignal,
): T | Promise<T> {
	try {
		return compute();
	} catch (e) {
		const suspended = (e as EagerError | { [NotYet]?: undefined })[NotYet];
		if (suspended) {
			return suspended.then((value) => {
				if (signal.aborted) {
					return undefined as T;
				}
				return resolveSuspension(compute, signal);
			});
		}
		// Rejecting other errors
		return Promise.reject(e);
	}
}

export function eagerAtom<Value>(
	...args: Value extends PromiseLike<unknown>
		? [
				'ERROR: The `read` function of eager atoms cannot be asynchronous, or return a Promise.',
			]
		: [read: Read<Value>]
): Atom<Promise<Value> | Value> {
	const [read] = args as [Read<Value>];

	return atom((get, { signal }) => {
		const eagerGet = <Value>(atomToGet: Atom<Value>): Awaited<Value> =>
			unwrapPromise(get(atomToGet));

		return resolveSuspension(() => read(eagerGet), signal);
	});
}
