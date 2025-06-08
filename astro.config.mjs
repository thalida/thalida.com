// @ts-check
import { defineConfig } from 'astro/config';

import partytown from '@astrojs/partytown';

import sitemap from '@astrojs/sitemap';

import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: 'https://thalida.com',
  integrations: [partytown(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
