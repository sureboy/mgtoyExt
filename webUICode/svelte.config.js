import 'dotenv/config';
import adapterAuto from '@sveltejs/adapter-auto';
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
const isStatic = process.env.STATIC_BUILD === 'true';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit:isStatic?{
		adapter: adapterAuto()		
	}:{
		adapter: adapter({
			//fallback: '200.html', // may differ from host to host
			pages: '../webUI',
			assets: '../webUI',
		 	fallback: undefined,
			precompress: false,
			strict: false
		})
	}
};

export default config;
