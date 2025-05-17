import { eagerAtom } from 'jotai-derive';
import { atom, createStore } from 'jotai/vanilla';
import { describe, expect, it } from 'vitest';

describe('eagerAtom', () => {
	it('works', async () => {
		const petsAtom = atom(async (get) => {
			await new Promise((resolve) => setTimeout(resolve, 100));
			return ['dog', 'cat', 'meerkat', 'parrot', 'mouse'];
		});
		const filterAtom = atom('');
		const filteredPetsAtom = eagerAtom((get) => {
			const filter = get(filterAtom);
			return get(petsAtom).filter((name) => name.includes(filter));
		});

		const store = createStore();

		const petsPromise = store.get(petsAtom);
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
});
