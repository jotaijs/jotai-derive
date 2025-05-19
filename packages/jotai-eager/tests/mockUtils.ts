/**
 * @returns A promise along with function to fulfil it manually.
 */
export function deferred<T>(): {
  resolve(value: T): void;
  reject(reason: unknown): void;
  promise: Promise<T>;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    resolve,
    reject,
    promise,
  };
}
