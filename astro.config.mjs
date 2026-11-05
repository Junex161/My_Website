// @ts-check
import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';

// GitHub Pages serves this repo at https://junex161.github.io/My_Website/
// If you later use your own domain, set `site` to it and remove `base`.
export default defineConfig({
  site: 'https://junex161.github.io',
  base: '/My_Website',
  integrations: [vue()],
});
