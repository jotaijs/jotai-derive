import type { ExtraPromise } from './isPromise.js';

function isPromise<T, S>(value: ExtraPromise<T> | S): value is ExtraPromise<T> {
  return value && typeof value === 'object' && 'then' in value;
}

export function soon<InputType, OutputType>(
  op: (input: NoInfer<Awaited<InputType>>) => OutputType,
): (input: InputType) => OutputType | Promise<Awaited<OutputType>> {
  return (input: InputType) => {
    if (isPromise(input)) {
      if (input.status === 'fulfilled') {
        // can process the value earlier
        return op(input.value as Awaited<InputType>);
      }

      if (input.status === 'rejected') {
        // To keep the error handling behavior consistent, lets
        // always return a rejected promise, even if the processing
        // can be done in sync.
        return Promise.reject(input.reason);
      }

      return input.then((value) => op(value as Awaited<InputType>)) as Promise<
        Awaited<OutputType>
      >;
    }

    try {
      return op(input as Awaited<InputType>);
    } catch (err) {
      // To keep the error handling behavior consistent, lets
      // always return a rejected promise, even if the processing
      // can be done in sync.
      return Promise.reject(err);
    }
  };
}
