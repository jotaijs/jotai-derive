import { derive } from 'jotai-eager';
import { type Atom, atom, createStore } from 'jotai/vanilla';
import { beforeEach, describe, expect, expectTypeOf, it } from 'vitest';

import { deferred } from './mockUtils.js';

describe('derive', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
  });

  it('derives a sync atom', () => {
    const countAtom = atom(12);
    const doubledAtom = derive([countAtom], (value) => value * 2);

    expect(store.get(doubledAtom)).toEqual(24);
    // the processing is sync, but it could still throw, which would return a rejected promise.
    expectTypeOf(doubledAtom).toEqualTypeOf<Atom<number | Promise<number>>>();
  });

  it('derives an async atom', async () => {
    const computation = deferred<number>();
    const countAtom = atom(computation.promise);
    const doubledAtom = derive([countAtom], (value) => value * 2);

    const doubled = store.get(doubledAtom);

    expect(doubled).toBeInstanceOf(Promise);

    computation.resolve(12);

    await expect(doubled).resolves.toEqual(24);

    expectTypeOf(doubledAtom).toEqualTypeOf<Atom<number | Promise<number>>>();
  });

  it('derives a couple of sync atoms', () => {
    const aAtom = atom(3);
    const bAtom = atom(5);
    const productAtom = derive([aAtom, bAtom], (a, b) => a * b);

    expect(store.get(productAtom)).toEqual(15);
  });

  it('derives a couple of async atoms', async () => {
    const aTask = deferred<number>();
    const bTask = deferred<number>();
    const aAtom = atom(aTask.promise);
    const bAtom = atom(bTask.promise);
    const productAtom = derive([aAtom, bAtom], (a, b) => a * b);

    const product = store.get(productAtom);

    expect(product).toBeInstanceOf(Promise);

    aTask.resolve(3);
    bTask.resolve(5);

    await expect(product).resolves.toBe(15);
  });

  it('updates synchronously if dependency changes to concrete value', async () => {
    const aTask = deferred<number>();
    const bTask = deferred<number>();
    const aAtom = atom<number | Promise<number>>(aTask.promise);
    const bAtom = atom<number | Promise<number>>(bTask.promise);
    const productAtom = derive([aAtom, bAtom], (a, b) => a * b);

    const product = store.get(productAtom);

    expect(product).toBeInstanceOf(Promise);

    aTask.resolve(3);
    bTask.resolve(5);

    await expect(product).resolves.toBe(15);

    // updating dependency to concrete value
    store.set(aAtom, 4);

    expect(store.get(productAtom)).toBe(20);
  });
});
