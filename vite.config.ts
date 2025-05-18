/// <reference types="vitest" />

import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
	if (mode !== 'test') {
		throw new Error('Using vite only for tests');
	}

	return {
		resolve: { alias: { 'jotai-eager': resolve('src') } },
		test: {
			environment: 'happy-dom',
		},
	};
});
