import { atom } from 'jotai';
import { atomWithLazy } from 'jotai/utils';

export interface User {
  id: number;
  name: string;
}

async function fetchUser(): Promise<User> {
  await new Promise((r) => setTimeout(r, 500));
  return {
    id: Math.floor(Math.random() * 1000),
    name: 'John Doe',
  };
}

export const userAtom = atomWithLazy<Promise<User> | User>(fetchUser);

export const refetchUserAtom = atom(null, (_get, set) => {
  set(userAtom, fetchUser());
});

export const updateOptimisticallyAtom = atom(null, async (get, set) => {
  const user = await get(userAtom);
  set(userAtom, {
    ...user,
    name: user.name.slice(1) + user.name[0],
  });
});
