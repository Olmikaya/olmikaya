import { defineCollection, z } from 'astro:content';

const stories = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		description: z.string().optional(),
		pubDate: z.coerce.date().optional(),
	}),
});

export const collections = { stories };