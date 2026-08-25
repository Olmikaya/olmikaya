import { getCollection, type CollectionEntry } from "astro:content";

/**
 * Sections are derived from the articles that actually exist, never from a
 * hardcoded list. A category with nothing published in it produces no nav
 * item and no page, so the site can never link to an empty section.
 *
 * Both an article's primary and secondary category count towards its
 * sections, so a Food/Ritual piece appears under both.
 */

export type Article = CollectionEntry<"articles">;

export function slugify(category: string): string {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export async function publishedArticles(): Promise<Article[]> {
  const all = await getCollection("articles", ({ data }) => !data.draft);
  return all.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function categoriesOf(article: Article): string[] {
  const { category, secondaryCategory } = article.data;
  return secondaryCategory && secondaryCategory !== category
    ? [category, secondaryCategory]
    : [category];
}

export interface Section {
  name: string;
  slug: string;
  count: number;
  articles: Article[];
}

/** Every section with at least one published article, largest first. */
export async function sections(): Promise<Section[]> {
  const articles = await publishedArticles();
  const map = new Map<string, Article[]>();

  for (const article of articles) {
    for (const name of categoriesOf(article)) {
      const list = map.get(name);
      if (list) list.push(article);
      else map.set(name, [article]);
    }
  }

  return [...map.entries()]
    .map(([name, list]) => ({
      name,
      slug: slugify(name),
      count: list.length,
      articles: list,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Estimated reading time is handled separately; see lib/reading-time.ts. */
