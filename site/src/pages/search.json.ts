import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

/* ---------------------------------------------------------------------------
   The search index, built at build time and served as one static file.

   No search dependency and no service: the whole site is a few dozen entries,
   so the browser fetches this once on the first search and filters it in
   memory. If the site ever grows past a few hundred entries, swap this for a
   real index — the client only expects { title, dek, url, kind }.
   ------------------------------------------------------------------------ */

interface Entry {
  title: string;
  dek: string;
  url: string;
  kind: string;
}

/* Standing pages. Everything else is derived from the collections, so a new
   article or object appears in search without anyone remembering to add it. */
const PAGES: Entry[] = [
  { title: "The journal", dek: "Every piece we have published.", url: "/journal/", kind: "Page" },
  { title: "Sections", dek: "The subjects OLMIKAYA covers.", url: "/sections/", kind: "Page" },
  { title: "The letter", dek: "One letter, at the end of each month.", url: "/letter/", kind: "Page" },
  { title: "The directory", dek: "People and places worth crossing a city for.", url: "/directory/", kind: "Page" },
  { title: "Seasons", dek: "The seasonal framework.", url: "/seasons/", kind: "Page" },
  { title: "Shop", dek: "Objects made with the people we write about.", url: "/shop/", kind: "Page" },
  { title: "About", dek: "What OLMIKAYA is, and how we work.", url: "/about/", kind: "Page" },
  { title: "Contact", dek: "One address, read by a person.", url: "/contact/", kind: "Page" },
  { title: "Privacy policy", dek: "What we collect, and what we do not.", url: "/privacy/", kind: "Legal" },
  { title: "Terms & conditions", dek: "The terms on which we publish.", url: "/terms/", kind: "Legal" },
];

export const GET: APIRoute = async () => {
  const articles = await getCollection("articles", ({ data }) => !data.draft);
  const directory = await getCollection("directory", ({ data }) => !data.draft);
  const objects = await getCollection("objects", ({ data }) => !data.draft);
  const letters = await getCollection("letters", ({ data }) => !data.draft);

  const entries: Entry[] = [
    ...articles.map((a) => ({
      title: a.data.title,
      dek: a.data.dek,
      url: `/journal/${a.id}/`,
      kind: a.data.category,
    })),
    ...letters.map((l) => ({
      title: l.data.title,
      dek: l.data.dek,
      url: `/letter/${l.id}/`,
      kind: "The letter",
    })),
    ...directory.map((d) => ({
      title: d.data.name,
      dek: d.data.dek,
      url: `/directory/#${d.id}`,
      kind: d.data.city,
    })),
    ...objects.map((o) => ({
      title: o.data.name,
      dek: o.data.note,
      url: "/shop/",
      kind: o.data.kind,
    })),
    ...PAGES,
  ];

  return new Response(JSON.stringify(entries), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
};
