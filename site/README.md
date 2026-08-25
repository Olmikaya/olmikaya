# OLMIKAYA — the publishing site

The Astro version of the site, with a browser-based CMS for writing articles.
Same design as the static build, now driven by content files instead of
hand-written HTML.

The original static site is still at the project root as a fallback. Nothing
here touches it.

---

## Running it locally

```bash
npm --prefix site run dev
```

Then open `http://localhost:4321`. Edit anything under `src/` and the page
reloads itself.

To produce the deployable files:

```bash
npm --prefix site run build
```

Output lands in `site/dist/`.

---

## Publishing an article

Once deployed (see setup below), go to `yourdomain.com/admin/`, sign in with
GitHub, and click **Articles → New Article**. Fill in the fields, write the
body, and press publish. The CMS commits a Markdown file to the repository, the
site rebuilds itself, and the article is live in a couple of minutes.

Everything appears where it should on its own — the journal index, the "read
next" cards, the homepage lead — because those are all generated from the same
files. There is no page to update by hand.

**Two things worth knowing when writing:**

- **New articles start as drafts.** Nothing is public until you untick *Draft*.
- **Pull-quotes.** A `>` blockquote becomes the house pull-quote. To add an
  attribution, put it after a blank quote line so it renders as the small
  credit rather than as part of the quote:

  ```markdown
  > Nobody was invited, so nobody can be uninvited.
  >
  > — A regular, on the rules
  ```

You can also just add a `.md` file to `src/content/articles/` by hand. The CMS
and the filesystem are the same thing.

### Photographs

Leave a cover image empty and a palette **plate** holds the space at the right
aspect ratio, so a piece can be laid out and published before the photography
exists. Add an image later and it takes the same slot — no layout changes.

Always fill in **alt text** when you add a real photograph.

---

## Setup — what you need to do

I cannot create accounts on your behalf, so these steps are yours.

**Recommended: Cloudflare Pages.** It builds Astro properly, serves from the
root of a domain so nothing needs rewriting, and its edge network is good for
an East African audience. GitHub Pages also works — see below — but it cannot
build Astro itself and it publishes to a sub-path, which needs care.

### 1. Put the project on GitHub

From the project root (`olmi-kaya`, the folder containing `site/`):

```bash
git init && git add . && git commit -m "OLMIKAYA site"
```

Then push it to your repository.

### 2a. Deploy with Cloudflare Pages

Create a Pages project from the GitHub repo and set:

| Setting | Value |
|---|---|
| Root directory | `site` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | `22` |

Every push to `main` rebuilds and republishes. Pull requests get preview URLs.

### 2b. Or deploy with GitHub Pages

`.github/workflows/deploy.yml` is already written — it builds the site and
publishes `site/dist`. You only need to switch it on:

**Settings → Pages → Source → GitHub Actions.**

One thing to get right first. A repo named `olmikaya` publishes to
`olmikaya.github.io/olmikaya/` — a sub-path — and every internal link in this
site is absolute, so they would all 404. Avoid that by either:

- **using a custom domain** (olmikaya.com), or
- **renaming the repo to `Olmikaya.github.io`**, which publishes at the root.

Both need no code changes. See the note in `astro.config.mjs` if you would
rather keep the project URL.

### 3. Turn on the CMS login

**This is the step people miss.** Signing into `/admin/` needs a small server
to swap the GitHub code for a token — it cannot be done safely in the browser.
Netlify used to provide this for free; on Cloudflare Pages or GitHub Pages you
host it yourself.

It is a one-file Cloudflare Worker called **`sveltia-cms-auth`**:

1. Create a GitHub OAuth App (Settings → Developer settings → OAuth Apps). Set
   the callback URL to your worker's address.
2. Deploy the worker, giving it the OAuth client ID and secret.
3. In `public/admin/config.yml`, uncomment `base_url` and point it at the
   worker.

You need this for either host, so Cloudflare is in the picture regardless —
which is part of why Cloudflare Pages is the simpler answer.

Until this is done, `/admin/` loads but will not sign in. The site itself works
from step 2 onward.

---

## How the content is organised

Four collections, each a folder of Markdown files:

```
src/content/articles/     Journal pieces
src/content/directory/    People and places
src/content/objects/      Things you make
src/content/seasons/      The seasonal framework
```

`src/content.config.ts` defines what fields each one accepts and validates
every file at build time — a malformed article fails the build rather than
publishing broken. `public/admin/config.yml` mirrors those fields to build the
editing forms.

**If you add a field, add it in both places.** The CMS silently drops anything
the config does not know about.

### Relations

Directory entries and objects can link to the article written about them
(*Related article* in the CMS). The link renders automatically.

### Seasons

Each season has a **Still a placeholder** switch. While any season has it
ticked, the scaffold notice shows on the homepage and the seasons page. Untick
them all once the real framework is in and the notices disappear on their own.

---

## Design system

Unchanged from the static build, and documented at `/styleguide/`.

- **Palette** — seven colours extracted exactly from `color-palette.jpeg`.
  Maroon `#5C2020` is the wordmark colour and the primary brand.
- **One binding rule** — terracotta is a light-ground accent only. It measures
  2.29:1 on ink and 1.65:1 on green, both failing WCAG. Never use it as text on
  a dark ground.
- **Ovo has one weight and no italic.** It is a display face only — headings,
  wordmark, pull-quotes. Inter carries everything you actually read. Never put
  bold or italic inside Ovo-set text.

---

## Still needs real content

Marked in the pages themselves so it cannot be mistaken for finished work:

- **The seasonal framework** — the four seasons are bracketed placeholders.
  Nothing here invents one.
- **All editorial** — the four articles, their bylines and the quotation in
  them are invented to prove the layouts. Not reporting.
- **All directory entries** — fictional. Nothing has been visited or verified.
- **The masthead** on `/about/` — left bracketed rather than filled with
  invented people.
- **Product positioning** — the original brief was truncated mid-sentence at
  "Products should feel like", so `/objects/` takes the most conservative
  reading: objects as extensions of the reporting, no commerce mechanics, no
  prices.
- **The newsletter** — the form is inert and says so. Connect a provider by
  replacing `initSubscribe()` in `public/assets/js/olmikaya.js`.
