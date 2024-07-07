import { soon } from 'jotai-derive';
import { atom, createStore } from 'jotai/vanilla';
import { pipe } from 'remeda';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { deferred } from './mockUtils.js';

describe('soon', () => {
	it('correctly infers type when used data-first', () => {
		const promiseOrValue = 654 as Promise<number> | number;

		const wrapped = soon(promiseOrValue, (value) => ({
			inside: value,
		}));

		expect(wrapped).toEqual({ inside: 654 });

		expectTypeOf(wrapped).toEqualTypeOf<
			{ inside: number } | Promise<{ inside: number }>
		>();
	});

	it('processes sync and async data as soon as possible', async () => {
		const multiply = ([a, b]: readonly [number, number]) => a * b;

		const syncResult = pipe([12, 5] as const, soon(multiply));
		const asyncResult = pipe(Promise.resolve([10, 8] as const), soon(multiply));

		expect(syncResult).toEqual(60);
		expect(asyncResult).toBeInstanceOf(Promise);
		expect(await asyncResult).toEqual(80);

		// Even though the processing is sync, it could throw, which we make into a rejected
		// promise for consistency.
		expectTypeOf(syncResult).toEqualTypeOf<number | Promise<number>>();
		// Even though we are processing a promise, it may already be fulfilled
		// (and we can know with jōtai instrumentation), so safest to assume
		// the function can return either.
		expectTypeOf(asyncResult).toEqualTypeOf<number | Promise<number>>();
	});

	it('chains correctly', async () => {
		const double = (value: number) => value * 2;
		const doubleAsync = (value: number) => Promise.resolve(value * 2);

		const asyncEnd = pipe(3, soon(double), soon(doubleAsync));
		const asyncMiddle = pipe(3, soon(doubleAsync), soon(double));
		const asyncStart = pipe(Promise.resolve(3), soon(double), soon(double));

		await expect(asyncEnd).resolves.toEqual(12);
		await expect(asyncMiddle).resolves.toEqual(12);
		await expect(asyncStart).resolves.toEqual(12);
	});

	it('returns rejected promise even if processing sync', async () => {
		const throwError = (_input: number): number => {
			// eslint-disable-next-line no-throw-literal
			throw { error: 'test' };
		};

		const result = pipe(123, soon(throwError));

		await expect(result).rejects.toEqual({ error: 'test' });
	});
});

describe('soon (in atoms)', () => {
	it('properly derives an async atom', async () => {
		const store = createStore();

		const initialCount = deferred<number>();
		const countAtom = atom<Promise<number> | number>(initialCount.promise);

		let numberOfCalculations = 0;

		const doubledAtom = atom((get) =>
			pipe(
				get(countAtom),
				soon((value) => {
					numberOfCalculations += 1;
					return value * 2;
				}),
			),
		);

		// Interacting just with `doubledAtom`, never with `countAtom` directly.
		const promise = store.get(doubledAtom);
		expect(promise).toBeInstanceOf(Promise);

		initialCount.resolve(11);

		expect(store.get(doubledAtom)).toEqual(promise); // should still hold the same promise
		expect(await promise).toEqual(22);
		expect(numberOfCalculations).toEqual(1);
	});

	it('handles a resolved promise instantly', async () => {
		const store = createStore();

		const initialCount = deferred<number>();
		const countAtom = atom<Promise<number> | number>(initialCount.promise);

		let numberOfCalculations = 0;

		const doubledAtom = atom((get) =>
			pipe(
				get(countAtom),
				soon((value) => {
					numberOfCalculations += 1;
					return value * 2;
				}),
			),
		);

		const countPromise = store.get(countAtom);
		expect(countPromise).toBeInstanceOf(Promise);

		initialCount.resolve(11);

		expect(await countPromise).toEqual(11);

		// First time we are calculating the value of `doubledAtom`
		expect(store.get(doubledAtom)).toEqual(22); // should just equal a concrete value
		expect(numberOfCalculations).toEqual(1);
	});

	it('recalculates only when dependencies change', async () => {
		const store = createStore();

		const initialTask = deferred<number>();
		const baseAtom = atom<Promise<number> | number>(initialTask.promise);

		let numberOfCalculations = 0;

		const flooredAtom = atom((get) =>
			pipe(
				get(baseAtom),
				soon((value) => Math.floor(value)),
			),
		);

		const messageAtom = atom((get) =>
			pipe(
				get(flooredAtom),
				soon((value) => {
					numberOfCalculations += 1;
					return `around ${value}`;
				}),
			),
		);

		const messagePromise = store.get(messageAtom);
		expect(messagePromise).toBeInstanceOf(Promise);

		initialTask.resolve(1.2);

		expect(await messagePromise).toEqual('around 1');
		expect(numberOfCalculations).toBe(1);

		store.set(baseAtom, 5.5);
		expect(store.get(messageAtom)).toEqual('around 5');
		expect(numberOfCalculations).toBe(2);

		store.set(baseAtom, 5.2); // changing value, but `flooredAtom` should still resolve to 5
		expect(numberOfCalculations).toBe(2); // no recalculations for `messageAtom`
	});
});
