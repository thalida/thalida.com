// @ts-check
import { defineConfig } from 'astro/config';

import partytown from '@astrojs/partytown';

import sitemap from '@astrojs/sitemap';

import tailwindcss from "@tailwindcss/vite";

import mdx from '@astrojs/mdx';

import { remarkAlert } from "remark-github-blockquote-alert";
import remarkToc from 'remark-toc'
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

// https://astro.build/config
export default defineConfig({
  site: 'https://thalida.com',
  integrations: [partytown(), sitemap(), mdx()],
  markdown: {
    remarkPlugins: [remarkAlert, [remarkToc, { heading: "toc" }]],
    rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: ['localhost', 'thalida.tunl.sh'],
    },
    preview: {
      allowedHosts: ['localhost', 'thalida.tunl.sh'],
    },
  },
});
