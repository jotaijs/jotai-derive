import { pipe } from 'remeda';
import { atom, type Atom, type ExtractAtomValue } from 'jotai';

import { soon } from './soon.js';
import { soonAll } from './soonAll.js';

type PromiseOrValue<T> = T | Promise<T>;

type ExtractAtomsValues<
  TAtoms extends readonly [Atom<unknown>, ...Atom<unknown>[]],
> = {
  [Index in keyof TAtoms]: ExtractAtomValue<TAtoms[Index]>;
};

type AwaitAtomsValues<
  TTuple extends readonly [Atom<unknown>, ...Atom<unknown>[]],
> = {
  [Index in keyof TTuple]: Awaited<ExtractAtomValue<TTuple[Index]>>;
};

export function derive<
  TDeps extends readonly [Atom<unknown>, ...Atom<unknown>[]],
  TValue,
>(
  deps: TDeps,
  op: (...depValues: AwaitAtomsValues<TDeps>) => TValue,
): Atom<TValue | Promise<Awaited<TValue>>> {
  return atom((get) => {
    try {
      return pipe(
        soonAll(deps.map(get) as ExtractAtomsValues<TDeps>) as PromiseOrValue<
          AwaitAtomsValues<TDeps>
        >,
        soon((values) => op(...values)),
      ) as TValue | Promise<Awaited<TValue>>;
    } catch (err) {
      return Promise.reject(err);
    }
  });
}
