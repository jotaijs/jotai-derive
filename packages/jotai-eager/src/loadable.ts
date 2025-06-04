import { atom } from 'jotai/vanilla';
import type { Atom } from 'jotai/vanilla';
import { withPending } from './withPending.ts';

const cache1 = new WeakMap();
const memo1 = <T>(create: () => T, dep1: object): T =>
  (cache1.has(dep1) ? cache1 : cache1.set(dep1, create())).get(dep1);

export type Loadable<Value> =
  | { state: 'loading' }
  | { state: 'hasError'; error: unknown }
  | { state: 'hasData'; data: Awaited<Value> };

const Pending = Symbol('The loadable is pending');

export function loadable<Value>(anAtom: Atom<Value>): Atom<Loadable<Value>> {
  return memo1(() => {
    const atomWithPending = withPending(anAtom, (): typeof Pending => Pending);
    if (import.meta.env?.MODE !== 'production') {
      atomWithPending.debugPrivate = true;
    }

    return atom((get) => {
      let value: Awaited<Value> | typeof Pending;

      try {
        value = get(atomWithPending);
      } catch (error) {
        return { state: 'hasError', error };
      }

      if (value === Pending) {
        return { state: 'loading' };
      }
      return { state: 'hasData', data: value };
    });
  }, anAtom);
}
