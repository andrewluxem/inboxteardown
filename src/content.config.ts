import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { pageSchema, scoreboardSchema, teardownSchema, trackerSchema } from './lib/schemas';

export const collections = {
  scoreboard: defineCollection({
    loader: glob({ pattern: '*.md', base: './src/content/scoreboard' }),
    schema: scoreboardSchema,
  }),
  teardowns: defineCollection({
    loader: glob({ pattern: '*.md', base: './src/content/teardowns' }),
    schema: teardownSchema,
  }),
  tracker: defineCollection({
    loader: glob({ pattern: '*.md', base: './src/content/tracker' }),
    schema: trackerSchema,
  }),
  pages: defineCollection({
    loader: glob({ pattern: '*.md', base: './src/content/pages' }),
    schema: pageSchema,
  }),
};
