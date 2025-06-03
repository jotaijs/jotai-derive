import { atom } from 'jotai';
import type { Atom, WritableAtom } from 'jotai';
import { getPromiseMeta, setPromiseMeta } from './isPromise.ts';

const isPromiseLike = (p: unknown): p is PromiseLike<unknown> =>
  typeof (p as PromiseLike<unknown>)?.then === 'function';

const defaultFallback = () => undefined;

export function withPending<Value, Args extends unknown[], Result>(
  anAtom: WritableAtom<Value, Args, Result>,
): WritableAtom<Awaited<Value> | undefined, Args, Result>;

export function withPending<
  Value,
  Args extends unknown[],
  Result,
  PendingValue,
>(
  anAtom: WritableAtom<Value, Args, Result>,
  fallback: (
    prev: Awaited<Value> | undefined,
    pending: PromiseLike<Awaited<Value>>,
  ) => PendingValue,
): WritableAtom<Awaited<Value> | PendingValue, Args, Result>;

export function withPending<Value>(
  anAtom: Atom<Value>,
): Atom<Awaited<Value> | undefined>;

export function withPending<Value, PendingValue>(
  anAtom: Atom<Value>,
  fallback: (
    prev: Awaited<Value> | undefined,
    pending: PromiseLike<Awaited<Value>>,
  ) => PendingValue,
): Atom<Awaited<Value> | PendingValue>;

export function withPending<
  Value,
  Args extends unknown[],
  Result,
  PendingValue,
>(
  anAtom: WritableAtom<Value, Args, Result> | Atom<Value>,
  fallback: (
    prev: Awaited<Value> | undefined,
    pending: PromiseLike<Awaited<Value>>,
  ) => PendingValue = defaultFallback as never,
) {
  type PromiseAndValue = { readonly p?: PromiseLike<unknown> } & (
    | { readonly v: Awaited<Value> }
    | { readonly f: PendingValue; readonly v?: Awaited<Value> }
  );
  const refreshAtom = atom(0);

  if (import.meta.env?.MODE !== 'production') {
    refreshAtom.debugPrivate = true;
  }

  const promiseAndValueAtom: WritableAtom<PromiseAndValue, [], void> & {
    init?: undefined;
  } = atom(
    (get, { setSelf }) => {
      get(refreshAtom);
      const prev = get(promiseAndValueAtom) as PromiseAndValue | undefined;
      const promise = get(anAtom);
      if (!isPromiseLike(promise)) {
        return { v: promise as Awaited<Value> } as PromiseAndValue;
      }
      const meta = getPromiseMeta(promise);
      if (meta?.status === 'fulfilled') {
        return { p: promise, v: meta.value } as PromiseAndValue;
      }
      if (meta?.status === 'rejected') {
        throw meta.reason;
      }

      if (promise !== prev?.p) {
        promise.then(
          (value) => {
            setPromiseMeta(promise, { status: 'fulfilled', value });
            setSelf();
          },
          (reason) => {
            setPromiseMeta(promise, { status: 'rejected', reason });
            setSelf();
          },
        );
      }

      if (prev && 'v' in prev) {
        return {
          p: promise,
          f: fallback(prev.v, promise as PromiseLike<Awaited<Value>>),
          v: prev.v,
        } as PromiseAndValue;
      }
      return {
        p: promise,
        f: fallback(undefined, promise as PromiseLike<Awaited<Value>>),
      } as PromiseAndValue;
    },
    (_get, set) => {
      set(refreshAtom, (c) => c + 1);
    },
  );
  // HACK to read PromiseAndValue atom before initialization
  promiseAndValueAtom.init = undefined;

  if (import.meta.env?.MODE !== 'production') {
    promiseAndValueAtom.debugPrivate = true;
  }

  return atom(
    (get) => {
      const state = get(promiseAndValueAtom);
      if ('f' in state) {
        // is pending
        return state.f;
      }
      return state.v;
    },
    (_get, set, ...args) =>
      set(anAtom as WritableAtom<Value, unknown[], unknown>, ...args),
  );
}
