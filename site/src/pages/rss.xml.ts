import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

/* ---------------------------------------------------------------------------
   The journal as an RSS feed.

   Worth having for its own sake — readers still use feeds, and an editorial
   site that publishes on a slow cadence is exactly what they are for. It is
   also a standing, machine-readable record of what was published and when,
   which is the sort of thing aggregators and search engines read happily.

   Hand-rolled for the same reason as the sitemap: @astrojs/rss would be a
   second dependency for thirty lines of XML.

   Only the dek goes in <description>, never the body. The point of the feed
   is to bring people to the piece, and a full-text feed means the writing is
   read — and indexed — somewhere that is not the site.
   ------------------------------------------------------------------------ */

/* &, <, > and quotes all have to be escaped inside XML text and attributes.
   Editors write ampersands and curly quotes without thinking about it, and a
   single raw & makes the whole feed unparseable. */
function xml(text: string): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const GET: APIRoute = async ({ site }) => {
  const articles = (await getCollection("articles", ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .slice(0, 30);

  const items = articles
    .map((a) => {
      const url = new URL(`/journal/${a.id}/`, site).href;
      return `    <item>
      <title>${xml(a.data.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${xml(a.data.dek)}</description>
      <dc:creator>${xml(a.data.author)}</dc:creator>
      <category>${xml(a.data.category)}</category>
      <pubDate>${a.data.date.toUTCString()}</pubDate>
    </item>`;
    })
    .join("\n");

  const home = new URL("/", site).href;
  const self = new URL("/rss.xml", site).href;

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>OLMIKAYA</title>
    <link>${home}</link>
    <description>An independent East African editorial and lifestyle company. Ordinary Living Made Intentional.</description>
    <language>en</language>
    <atom:link href="${self}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
};
