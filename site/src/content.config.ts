import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/* ---------------------------------------------------------------------------
   OLMIKAYA content collections.

   These schemas are the single source of truth for what an editor can enter.
   The CMS admin form in public/admin/config.yml mirrors them field for field —
   if you add a field here, add it there too, or the admin will silently drop
   it on save.
   ------------------------------------------------------------------------ */

/* Shared vocabulary. Keeping these as const arrays means Zod validates them
   AND the values stay in one place. */
export const CATEGORIES = [
  "People",
  "Places",
  "Objects",
  "Food",
  "Style",
  "Design",
  "Architecture",
  "Travel",
  "Culture",
  "Work",
  "Ritual",
] as const;

export const PLATE_TONES = [
  "sky",
  "cream",
  "green",
  "ink",
  "terracotta",
  "maroon",
] as const;

export const PLATE_RATIOS = [
  "portrait",
  "square",
  "landscape",
  "wide",
  "cinema",
] as const;

/* A photograph, or — until there is one — a plate standing in for it.
   `src` is optional on purpose: an article can be laid out and published
   before the photography exists, and the plate keeps the composition intact. */
const image = z.object({
  src: z.string().optional(),
  alt: z.string().default(""),
  caption: z.string().optional(),
  credit: z.string().optional(),
  tone: z.enum(PLATE_TONES).default("sky"),
  ratio: z.enum(PLATE_RATIOS).default("landscape"),
});

const articles = defineCollection({
  loader: glob({ base: "./src/content/articles", pattern: "**/*.md" }),
  schema: z.object({
    title: z.string(),
    dek: z.string(),
    category: z.enum(CATEGORIES),
    secondaryCategory: z.enum(CATEGORIES).optional(),
    author: z.string(),
    photographer: z.string().optional(),
    place: z.string(),
    date: z.coerce.date(),
    readingTime: z.number().int().positive().optional(),
    season: z.string().optional(),
    cover: image.default({}),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

const directory = defineCollection({
  loader: glob({ base: "./src/content/directory", pattern: "**/*.md" }),
  schema: z.object({
    name: z.string(),
    dek: z.string(),
    city: z.string(),
    neighbourhood: z.string().optional(),
    /* Links an entry to the piece written about it. */
    relatedArticle: z.string().optional(),
    visits: z.number().int().min(1).default(1),
    order: z.number().int().default(999),
    draft: z.boolean().default(false),
  }),
});

const objects = defineCollection({
  loader: glob({ base: "./src/content/objects", pattern: "**/*.md" }),
  schema: z.object({
    name: z.string(),
    note: z.string(),
    maker: z.string().optional(),
    /* What sort of thing this is — "Cloth", "Paper", "Table". Free text,
       not an enum: the shop filter bar is built from the kinds that actually
       exist, the way sections are built from the articles that exist, so a
       new kind needs no code change. */
    kind: z.string().default("Objects"),
    /* Deliberately a free-text status, not a price. Nothing is for sale yet
       and no price should be invented. */
    availability: z.string().default("Not yet released"),
    relatedArticle: z.string().optional(),
    cover: image.default({}),
    order: z.number().int().default(999),
    draft: z.boolean().default(false),
  }),
});

/* Issues of the letter. One file per issue, published to the archive at
   /letter/ as well as sent by email — the site is the permanent record. */
const letters = defineCollection({
  loader: glob({ base: "./src/content/letters", pattern: "**/*.md" }),
  schema: z.object({
    /* Issue number, as printed on the letter itself. */
    number: z.number().int().positive(),
    title: z.string(),
    dek: z.string(),
    /* The date it went out. */
    date: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

const seasons = defineCollection({
  loader: glob({ base: "./src/content/seasons", pattern: "**/*.md" }),
  schema: z.object({
    index: z.number().int().positive(),
    title: z.string(),
    question: z.string(),
    dates: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { articles, directory, letters, objects, seasons };
