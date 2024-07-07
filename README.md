# jōtai / derive

Utilities for working with **potentially** asynchronous atoms.

```ts
// An example of a dual-natured atom, meaning
// sometimes we do not yet know the value
// (fetch is ongoing), but sometimes we act
// on the value already in cache.
const userAtom: Atom<User | Promise<User>> =
  atomWithQuery(...);

```

```ts
// Without `jotai-derive`

import { atom } from 'jotai';

// Type is Atom<Promise<string>>, even though
// get(userAtom) does not always return a promise,
// meaning we could compute `uppercaseNameAtom`
// synchronously.
const uppercaseNameAtom = atom(async (get) => {
  const user = await get(userAtom);
  return user.name.toUppercase();
});

```

```ts
// With `jotai-derive`

import { derive } from 'jotai-derive';

// Atom<string | Promise<string>>
const uppercaseNameAtom = derive(
  [userAtom], // will be awaited only when necessary
  (user) => user.name.toUppercase(),
);
```

## Motivation

Jōtai offers powerful primitives for working with asynchronous data outside of the web framework (e.g. React), and allows the UI and business logic to
properly integrate with the data layer. Many data-fetching integrations offer a peek into the client-side cache via atoms. When the cache
is not yet populated, the atom has to resolve to a **Promise** of the value. However, if the value already exists in cache, and we do an optimistic update, then the value can be made available downstream
immediately.

Building data graphs with these dual-natured (sometimes async, sometimes sync) atoms as a base can lead to unnecessary rerenders, stale values and micro-suspensions (in case of React) if not handled with care.

`jotai-derive` provides a primitive for building asynchronous data graphs
that act on values as soon as they are available (either awaiting for them, or acting on them synchronously).