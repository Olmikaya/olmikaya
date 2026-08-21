import { defineCollection, z } from "astro:content";

const stories = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string().default("Untitled Story"),
    description: z.string().optional().nullable().transform((v) => v || ""),
    pubDate: z.any().optional().nullable(),
    category: z.string().optional().nullable().transform((v) => v || "People"),
    heroImage: z.string().optional().nullable().transform((v) => v || ""),
  }),
});

export const collections = { stories };
