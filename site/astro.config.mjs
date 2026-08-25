// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  /* Your real domain. Used for canonical URLs and og:url.
     Change this if you publish somewhere else. */
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

  build: { format: "directory" },
});
