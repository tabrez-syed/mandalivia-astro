import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import { remarkCustomImage } from './src/remark-custom-image.mjs';
import { remarkObsidianCallouts } from './src/remark-obsidian-callouts.mjs';
import path from 'path';

// https://astro.build/config
export default defineConfig({
    site: 'https://mandalivia.com',
    integrations: [
        mdx(),
        sitemap(),
        tailwind({
            applyBaseStyles: false
        })
    ],
    markdown: {
        remarkPlugins: [remarkCustomImage, remarkObsidianCallouts]
    },
    vite: {
        resolve: {
            alias: {
                '@': path.resolve('./src')
            }
        }
    }
});
