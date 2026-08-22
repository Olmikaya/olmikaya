import { defineCollection, z } from "astro:content";

const stories = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string().optional().default(""),
    pubDate: z.coerce.date().optional(),
    category: z.string().optional().default("People"),
    heroImage: z.string().optional().default(""),
  }),
});

export const collections = {
  stories,
};
