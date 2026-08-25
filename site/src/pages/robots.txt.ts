import type { APIRoute } from "astro";

/* ---------------------------------------------------------------------------
   robots.txt, generated rather than kept as a static file.

   The sitemap line has to be an absolute URL, so it depends on the domain.
   Generating it from `site` in astro.config.mjs means changing the domain
   there — once — keeps this correct, instead of leaving a stale hostname in
   public/ that quietly points crawlers at a site that no longer exists.

   Only /admin/ is disallowed. Note what is NOT here: the letter landing
   pages carry <meta name="robots" content="noindex">, and blocking them in
   robots.txt would be counterproductive — a crawler that is not allowed to
   fetch a page never sees the noindex on it, so the URL can still surface in
   results. Let them be crawled and let the tag do its job.
   ------------------------------------------------------------------------ */

export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL("/sitemap.xml", site).href;

  const body = `User-agent: *
Allow: /
Disallow: /admin/

Sitemap: ${sitemap}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
