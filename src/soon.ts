import { isPromise } from './isPromise.js';

/**
 * Executes `process` with `data` as input synchronously if `data` is known, meaning
 * it is not an unresolved promise of the value.
 *
 * @param data The data to process, now or later (soon)
 * @param process The processing function
 * @returns The result (or promise of result) from running `process`.
 */
export function soon<TInput, TOutput>(
	data: TInput,
	process: (knownData: NoInfer<Awaited<TInput>>) => TOutput,
): TOutput | Promise<Awaited<TOutput>>;

/**
 * Executes `process` with `data` as input synchronously if `data` is known, meaning
 * it is not an unresolved promise of the value.
 *
 * @param process The processing function
 * @returns A function that can be called with `data`, and returns the
 *          result (or promise of result) from running `process` on `data`.
 */
export function soon<TInput, TOutput>(
	process: (knownData: NoInfer<Awaited<TInput>>) => TOutput,
): (data: TInput) => TOutput | Promise<Awaited<TOutput>>;

export function soon<TInput, TOutput>(
	first: TInput | ((knownData: NoInfer<Awaited<TInput>>) => TOutput),
	second?: (knownData: NoInfer<Awaited<TInput>>) => TOutput,
): unknown {
	if (second) {
		// data-first
		return _soonImpl(first as TInput, second);
	}

	// data-last
	return (data: TInput) => {
		return _soonImpl(
			data,
			first as (input: NoInfer<Awaited<TInput>>) => TOutput,
		);
	};
}

function _soonImpl<TInput, TOutput>(
	data: TInput,
	process: (knownData: NoInfer<Awaited<TInput>>) => TOutput,
): TOutput | Promise<Awaited<TOutput>> {
	if (isPromise(data)) {
		if (data.status === 'fulfilled') {
			// can process the value earlier
			return process(data.value as Awaited<TInput>);
		}

		if (data.status === 'rejected') {
			// To keep the error handling behavior consistent, lets
			// always return a rejected promise, even if the processing
			// can be done in sync.
			return Promise.reject(data.reason);
		}

		return data.then((value) => process(value as Awaited<TInput>)) as Promise<
			Awaited<TOutput>
		>;
	}

	try {
		return process(data as Awaited<TInput>);
	} catch (err) {
		// To keep the error handling behavior consistent, lets
		// always return a rejected promise, even if the processing
		// can be done in sync.
		return Promise.reject(err);
	}
}
