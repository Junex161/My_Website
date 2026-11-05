import { defineCollection } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';

/*
  Recipes: one folder per recipe with an English and a German file,
  e.g. src/content/recipes/spaetzle/en.md and src/content/recipes/spaetzle/de.md
*/
const recipes = defineCollection({
  loader: glob({ pattern: '**/{en,de}.md', base: './src/content/recipes' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['main', 'soup', 'baking', 'breakfast', 'side']),
    order: z.number().default(100),
    servings: z.string().optional(),
    time: z.string().optional(),
    /** Lines ending with ":" become small headings, e.g. "Sauce:" */
    ingredients: z.array(z.string()),
    tip: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

/* CV entries for the About page: src/data/cv.json */
const cv = defineCollection({
  loader: file('./src/data/cv.json'),
  schema: z.object({
    section: z.enum(['education', 'employment', 'engagement', 'membership']),
    start: z.string().optional(),   // "2023-09"
    end: z.string().optional(),     // leave out = ongoing
    title: z.string(),
    org: z.string(),
    place: z.string().optional(),
    detail: z.string().optional(),
    logo: z.string().optional(),    // file name in src/assets/logos
    logoBg: z.enum(['light', 'dark']).default('light'),
    url: z.string().url().optional(),  // website, shown for memberships
    hidden: z.boolean().default(false),
  }),
});

export const collections = { recipes, cv };
