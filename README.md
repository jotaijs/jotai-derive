# jōtai / derive

- [Overview](#overview)
- [Notes on usage](#notes-on-usage)
- [Recipes](#recipes)
  - [Single async dependency](#single-async-dependency)
  - [Multiple async dependencies](#multiple-async-dependencies)
  - [Conditional dependency](#conditional-dependency)
  - [Conditional dependency (multiple conditions)](#conditional-dependency-multiple-conditions)
- [Motivation](#motivation)

## Overview

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

> Codesandbox example of jotai-derive + React:
> 
> [![Explore jotai-derive example](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/p/sandbox/jotai-derive-example-7422pk?file=%2Fsrc%2FApp.tsx%3A17%2C10)


## Notes on usage

Improper use of this utility can cause the [Release of Ẕ̶̨̫̹̌͊͌͑͊̕͢͟a̡̜̦̝͓͇͗̉̆̂͋̏͗̍ͅl̡̛̝͍̅͆̎̊̇̕͜͢ģ̧̧͍͓̜̲͖̹̂͋̆̃̑͗̋͌̊̏ͅǫ̷̧͓̣͚̞̣̋̂̑̊̂̀̿̀̚͟͠ͅ](https://blog.izs.me/2013/08/designing-apis-for-asynchrony/).
If you `store.get` a dual-natured atom manually, make sure to handle both the
asynchronous case and the synchronous case (both `await` and `soon(...)` will help).

## Recipes

### Single async dependency

```ts
import { derive } from 'jotai-derive';

// Atom<string | Promise<string>>
const uppercaseNameAtom = derive(
  [userAtom], // will be awaited only when necessary
  (user) => user.name.toUppercase(),
);
```

### Multiple async dependencies

```ts
import { derive } from 'jotai-derive';

// Atom<string | Promise<string>>
const welcomeMessageAtom = derive(
  [userAtom, serverNameAtom],
  (user, serverName) => `Welcome ${user.name} to ${serverName}!`,
);
```

### Conditional dependency

```ts
// pipes allow for cleaner code when using `soon` directly.
import { pipe } from 'remeda';
import { soon } from 'jotai-derive';

const queryAtom: Atom<RestrictedItem | Promise<RestrictedItem>> = ...;

const isAdminAtom: Atom<boolean | Promise<boolean>> = ...;

const restrictedItemAtom = atom((get) =>
  pipe(
    get(isAdminAtom),
    soon((isAdmin) => (isAdmin ? get(queryAtom) : null))
  )
);
```

### Conditional dependency (multiple conditions)

```ts
// pipes allow for cleaner code when using `soon` directly.
import { pipe } from 'remeda';
import { soon, soonALl } from 'jotai-derive';

const queryAtom: Atom<RestrictedItem | Promise<RestrictedItem>> = ...;

const isAdminAtom: Atom<boolean | Promise<boolean>> = ...;
const enabledAtom: Atom<boolean | Promise<boolean>> = ...;

const restrictedItemAtom = atom((get) =>
  pipe(
    soonAll(get(isAdminAtom), get(enabledAtom)),
    soon(([isAdmin, enabled]) => (isAdmin && enabled ? get(queryAtom) : null))
  )
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
