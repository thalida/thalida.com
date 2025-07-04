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
import rehypeWrap from 'rehype-wrap';
import expressiveCode from 'astro-expressive-code';
import { pluginColorChips } from 'expressive-code-color-chips';


// https://astro.build/config
export default defineConfig({
  site: 'https://thalida.com',
  integrations: [
    partytown(),
    sitemap(),
    expressiveCode({
      themes: ['night-owl'],
      plugins: [pluginColorChips],
    }),
    mdx()
  ],
  markdown: {
    remarkPlugins: [remarkAlert, [remarkToc, { heading: "toc" }]],
    rehypePlugins: [
      rehypeSlug,
      rehypeAutolinkHeadings,
      [rehypeWrap, { selector: 'table', wrapper: 'div.overflow-auto' }],
      [rehypeWrap, { selector: 'video', wrapper: 'div.flex.flex-col.items-center.justify-center' }],
    ],
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
