import { soonAll } from 'jotai-derive';
import { atom, createStore } from 'jotai/vanilla';
import { describe, expect, expectTypeOf, it } from 'vitest';

describe('soonAll', () => {
	it('returns the same elements if all of them are concrete values', () => {
		const result = soonAll([1, 2, 3]);
		expect(result).toEqual([1, 2, 3]);

		expectTypeOf(result).toEqualTypeOf<
			Promise<[number, number, number]> | [number, number, number]
		>();
	});

	it('returns the same elements if all of them are known', async () => {
		const store = createStore();
		const resolvedAtom = atom(Promise.resolve(2)); // jōtai instruments its Promises with extra metadata
		const promise = store.get(resolvedAtom);
		await promise;

		const result = soonAll([1, promise, 3]);
		expect(result).toEqual([1, 2, 3]);

		expectTypeOf(result).toEqualTypeOf<
			Promise<[number, number, number]> | [number, number, number]
		>();
	});

	it('has the correct type for possible unknown values', () => {
		const maybePromise = 123 as Promise<number> | number;
		const result = soonAll([1, maybePromise, 3]);

		expectTypeOf(result).toEqualTypeOf<
			Promise<[number, number, number]> | [number, number, number]
		>();
	});

	it('falls back to Promise.all functionality', async () => {
		const one = Promise.resolve(1);
		const two = Promise.resolve(2);
		const three = Promise.resolve(3);
		const promise = soonAll([one, two, three]);
		expect(promise).toBeInstanceOf(Promise);
		expect(await promise).toEqual([1, 2, 3]);
	});

	it('returns a rejected promise if any of the elements are rejected promises', async () => {
		// eslint-disable-next-line prefer-promise-reject-errors
		const result = soonAll([1, Promise.reject<number>({ error: 'test' }), 2]);

		await expect(result).rejects.toEqual({ error: 'test' });
	});
});
