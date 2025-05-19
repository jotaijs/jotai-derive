import type { Atom } from 'jotai';
import { eagerAtom, isEagerError } from 'jotai-eager';
import { atom, createStore } from 'jotai/vanilla';
import { beforeEach, describe, expect, expectTypeOf, it } from 'vitest';
import { deferred } from './mockUtils.js';

describe('eagerAtom', () => {
	let store: ReturnType<typeof createStore>;

	beforeEach(() => {
		store = createStore();
	});

	it('derives a sync atom', () => {
		const countAtom = atom(12);
		const doubledAtom = eagerAtom((get) => get(countAtom) * 2);

		expect(store.get(doubledAtom)).toEqual(24);
		// the processing is sync, but it could still throw, which would return a rejected promise.
		expectTypeOf(doubledAtom).toEqualTypeOf<Atom<number | Promise<number>>>();
	});

	it('returns a rejected promise on sync dependency throw', async () => {
		const error = new Error('');
		const invalidAtom = atom<number>(() => {
			throw error;
		});
		const doubledAtom = eagerAtom((get) => get(invalidAtom) * 2);

		await expect(store.get(doubledAtom)).rejects.toThrowError(error);
	});

	it('returns a rejected promise on async dependency throw', async () => {
		const error = new Error('');
		const invalidAtom = atom<Promise<number>>(async () => {
			await 'foo';
			throw error;
		});
		const doubledAtom = eagerAtom((get) => get(invalidAtom) * 2);

		await expect(store.get(doubledAtom)).rejects.toThrowError(error);
	});

	it('derives an async atom', async () => {
		const computation = deferred<number>();
		const countAtom = atom(computation.promise);
		const doubledAtom = eagerAtom((get) => get(countAtom) * 2);

		const doubled = store.get(doubledAtom);

		expect(doubled).toBeInstanceOf(Promise);

		computation.resolve(12);

		await expect(doubled).resolves.toEqual(24);

		expectTypeOf(doubledAtom).toEqualTypeOf<Atom<number | Promise<number>>>();
	});

	it('derives a couple of sync atoms', () => {
		const aAtom = atom(3);
		const bAtom = atom(5);
		const productAtom = eagerAtom((get) => get(aAtom) * get(bAtom));

		expect(store.get(productAtom)).toEqual(15);
	});

	it('derives a couple of async atoms', async () => {
		const aTask = deferred<number>();
		const bTask = deferred<number>();
		const aAtom = atom(aTask.promise);
		const bAtom = atom(bTask.promise);
		const productAtom = eagerAtom((get) => get(aAtom) * get(bAtom));

		const product = store.get(productAtom);

		expect(product).toBeInstanceOf(Promise);

		aTask.resolve(3);
		bTask.resolve(5);

		await expect(product).resolves.toBe(15);
	});

	it('computes synchronously if asynchronous dependencies are fulfilled', async () => {
		const delay = deferred<void>();
		const petsAtom = atom(async () => {
			await delay.promise; // Simulating a remote API call
			return ['dog', 'cat', 'meerkat', 'parrot', 'mouse'];
		});
		const filterAtom = atom('');
		const filteredPetsAtom = eagerAtom((get) => {
			const filter = get(filterAtom);
			return get(petsAtom).filter((name) => name.includes(filter));
		});

		const petsPromise = store.get(petsAtom);
		expect(petsPromise).toBeInstanceOf(Promise);

		delay.resolve();
		await petsPromise;

		let filteredPets = store.get(filteredPetsAtom);
		expect(filteredPets).toMatchInlineSnapshot(`
			[
			  "dog",
			  "cat",
			  "meerkat",
			  "parrot",
			  "mouse",
			]
		`);

		store.set(filterAtom, 'at');

		filteredPets = store.get(filteredPetsAtom);
		expect(filteredPets).toMatchInlineSnapshot(`
			[
			  "cat",
			  "meerkat",
			]
		`);
	});

	describe('get.all', () => {
		it('handles sync atoms as input', async () => {
			const nameAtom = atom('Bob');
			const levelAtom = atom(2);

			const labelAtom = eagerAtom((get) => {
				const [name, level] = get.all([nameAtom, levelAtom]);

				expectTypeOf(name).toEqualTypeOf<string>();
				expectTypeOf(level).toEqualTypeOf<number>();

				return `${name} (lvl ${level})`;
			});

			expect(store.get(labelAtom)).toMatchInlineSnapshot(`"Bob (lvl 2)"`);
		});

		it('jump-starts all async atoms before suspending', async () => {
			const events: string[] = [];
			const oneAtom = atom(async () => {
				events.push('"one" computed');
				return 1;
			});
			const twoAtom = atom(async () => {
				events.push('"two" computed');
				return 2;
			});
			const threeAtom = atom(async () => {
				events.push('"three" computed');
				return 3;
			});

			const sumAtom = eagerAtom((get) => {
				try {
					const [one, two, three] = get.all([oneAtom, twoAtom, threeAtom]);
					return one + two + three;
				} catch (e) {
					if (isEagerError(e)) {
						events.push('suspended');
					}
					throw e;
				}
			});

			await expect(store.get(sumAtom)).resolves.toEqual(6);
			expect(events).toMatchInlineSnapshot(`
				[
				  ""one" computed",
				  ""two" computed",
				  ""three" computed",
				  "suspended",
				]
			`);
		});
	});
});
