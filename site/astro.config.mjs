// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  /* ====================================================================
     THE DOMAIN. Change it here and nowhere else.

     Everything that has to state an absolute URL is derived from this one
     line, because a stale hostname in any of them is worse than none:

       <link rel="canonical">   tells Google which URL is the real one
       og:url / og:image        social cards, which must be absolute
       /sitemap.xml             every <loc> in it
       /robots.txt              the Sitemap: line
       /rss.xml                 channel link, and every item guid

     Until the domain is bought this points at olmikaya.com, which is a
     guess. If you buy something else, change this line, rebuild, and
     resubmit the sitemap in Google Search Console. Nothing else moves.
     ==================================================================== */
  site: "https://olmikaya.com",

  /* --------------------------------------------------------------------
     A NOTE ON SUB-PATHS

     Every internal link in this site is absolute — "/journal/", "/about/".
     That is correct when the site is served from the root of a domain,
     which is the case for:

       - any custom domain            (olmikaya.com)
       - Cloudflare Pages             (olmikaya.pages.dev)
       - a GitHub *user/org* Pages site, i.e. a repo named
         Olmikaya.github.io          (olmikaya.github.io)

     It is NOT the case for a GitHub *project* Pages site. A repo named
     "olmikaya" publishes to olmikaya.github.io/olmikaya/, and every
     absolute link would then point one level too high and 404.

     Two zero-code fixes: use a custom domain, or rename the repo to
     Olmikaya.github.io. If you would rather keep the project URL, set
     `base` below AND every internal href has to be rewritten to include
     it — ask and I will do that pass.

     base: "/olmikaya",
     -------------------------------------------------------------------- */

  /* The products page was /objects/ until it was renamed to /shop/. Anything
     already pointing at the old URL keeps working. Remove once nothing does. */
  redirects: { "/objects": "/shop" },

  build: { format: "directory" },
});
