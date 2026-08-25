import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { sections } from "../lib/sections";

/* ---------------------------------------------------------------------------
   The sitemap, built from the same collections the pages are built from.

   Hand-rolled rather than pulled in as @astrojs/sitemap: the route list is
   short and entirely derivable, and this keeps the site at exactly one
   dependency. It also lets us do the two things the plugin does badly here —
   omit `lastmod` where there is no real date to give, and keep the noindex
   landing pages out by name.

   A sitemap is a list of URLs worth indexing, not a list of URLs that exist.
   Excluded on purpose:
     /admin/              the CMS, also disallowed in robots.txt
     /letter/confirmed/   \
     /letter/sorry/        > form landings, all carry meta noindex
     /letter/thank-you/   /
     /objects             a redirect to /shop, not a page
   Drafts never reach here: every collection query filters them out.
   ------------------------------------------------------------------------ */

interface Entry {
  path: string;
  lastmod?: Date;
}

export const GET: APIRoute = async ({ site }) => {
  const articles = await getCollection("articles", ({ data }) => !data.draft);
  const letters = await getCollection("letters", ({ data }) => !data.draft).catch(
    () => [],
  );
  const all = await sections();

  /* Standing pages. No lastmod: an invented date is worse than none — Google
     discounts a sitemap whose timestamps all move on every build. */
  const entries: Entry[] = [
    { path: "/" },
    { path: "/journal/" },
    { path: "/sections/" },
    { path: "/directory/" },
    { path: "/seasons/" },
    { path: "/shop/" },
    { path: "/about/" },
    { path: "/contact/" },
    { path: "/letter/" },
    { path: "/privacy/" },
    { path: "/terms/" },
    { path: "/styleguide/" },
  ];

  for (const s of all) entries.push({ path: `/sections/${s.slug}/` });

  /* Articles and letters have a real publication date, so they get one. */
  for (const a of articles) {
    entries.push({ path: `/journal/${a.id}/`, lastmod: a.data.date });
  }
  for (const l of letters) {
    entries.push({ path: `/letter/${l.id}/`, lastmod: l.data.date });
  }

  const urls = entries
    .map(({ path, lastmod }) => {
      const loc = new URL(path, site).href;
      const stamp = lastmod
        ? `\n    <lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>`
        : "";
      return `  <url>\n    <loc>${loc}</loc>${stamp}\n  </url>`;
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
