import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		projects: [
			{
				test: {
					name: 'happy-dom',
					environment: 'happy-dom',
				},
			},
			{
				test: {
					name: 'node',
					environment: 'node',
				},
			},
		],
	},
});
