import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const stories = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/stories" }),
  schema: z.object({
    title: z.string().optional().default("Untitled"),
    category: z.string().optional().default("General"),
    description: z.string().optional().default(""),
    pubDate: z.coerce.date().optional(),
    heroImage: z.string().optional().default(""),
  }),
});

export const collections = {
  stories,
};
