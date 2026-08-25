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

Go to `/admin/`. You get three ways in, and **two of them need no setup at
all** — you do not have to wait for the OAuth worker to write anything.

### Work with Local Repository — use this now

Run the site locally:

```bash
npm --prefix site run dev
```

Open `http://localhost:4321/admin/` and click **Work with Local Repository**.
Your browser asks which folder to open — choose **`olmi-kaya`**, the outer
folder containing `site/`, not `site/` itself. The paths in the CMS config are
written relative to that.

The CMS then reads and writes the Markdown files on your own disk. Nothing
touches GitHub, so nothing is public until you commit and push:

```bash
git add . && git commit -m "New article" && git push
```

Needs a Chromium browser — Chrome or Edge. It uses the File System Access API,
which Firefox and Safari do not support.

### Sign In Using Access Token — for the live site

Create a GitHub personal access token with `repo` scope and paste it into the
admin. This works on the deployed site with no worker involved. Good for one
person; a shared token is a poor idea for a team, since everything commits as
whoever owns the token.

**Never put the token in a file in this repo.** It goes in the browser only.

### Sign In with GitHub — the eventual setup

The proper OAuth flow, once the Cloudflare Worker is deployed. Best for more
than one editor: everyone signs in as themselves and commits are attributed
correctly. See step 3 below.

---

### Writing the article

**Articles → New Article.** The form mirrors the schema, so anything it lets
you save will build.

- **Standfirst** is the sentence or two under the headline. Around 30 words.
- **Reading time** can be left blank — it is worked out from the length of the
  article. Fill it in only to override, for a piece that is mostly pictures.
- **Draft** is ticked by default. Nothing is public until you untick it.
- **Featured** promotes the piece to the lead slot on the homepage and the top
  of the journal. Only one article should carry it.

In the body, `##` gives you a section heading. A `>` blockquote becomes the
house pull-quote — for an attribution, put it after a blank quote line so it
renders as the small credit rather than as part of the quote:

```markdown
> Nobody was invited, so nobody can be uninvited.
>
> — A regular, on the rules
```

Everything else updates itself: the journal index, the "read next" cards, the
homepage lead. There is no page to edit by hand.

You can also just drop a `.md` file into `src/content/articles/`. The CMS and
the filesystem are the same thing — the admin is a nicer way to type.

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

### 2. Deploy with Cloudflare Pages

This is the chosen host. Create a Pages project from the GitHub repo and set:

| Setting | Value |
|---|---|
| Root directory | `site` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | `22` |

Every push to `main` rebuilds and republishes. Pull requests get preview URLs.
`public/_headers` sets response headers, including `noindex` on `/admin/`.

**GitHub Pages is not in use.** `.github/workflows/deploy.yml` is kept as a
fallback but runs only when triggered by hand, so it no longer fails on every
push. Two things would need sorting before switching it back on — Pages is
currently disabled on the repo, and this repo would publish to a sub-path that
breaks every absolute link. See the note in `astro.config.mjs`.

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

### 4. Connect the letter

Sign-ups post to `/api/subscribe`, a Cloudflare Pages Function at
`functions/api/subscribe.js`. It runs on your own domain, so the provider key
never reaches the browser and the reader never leaves the site to subscribe.

**Where the file lives matters.** Pages looks for `functions/` at the *root
directory* configured for the build — which is `site`, per the table above —
so the endpoint is at `site/functions/api/subscribe.js`. At the repository root
it is silently ignored and `/api/subscribe` 404s with no error anywhere.

The provider is [Kit](https://kit.com), on its free plan.

**`KIT_API_KEY`** — a **V4** key, which is not the same as the older V3 one and
lives somewhere else in the dashboard:

1. In Kit, click your name, top right → **Settings** → **Developer**.
2. Under **V4 Keys**, click **Add a new key**.
3. Copy it before closing the dialog. **It is shown once.** Lose it and you
   cannot retrieve it — you have to Edit that key and Reset it, which
   invalidates the old one.

**`KIT_FORM_ID`** — the number in the form's own URL. Go to **Grow** →
**Landing Pages & Forms** and open the form you want sign-ups to land on; the
address bar reads `app.kit.com/forms/1357975/...` and `1357975` is the id.
It is also in the `<form action>` of the form's HTML embed code.

Which form matters: adding someone to a form is what triggers *that form's*
confirmation email and welcome sequence. Point it at the one you actually want
new readers to get.

#### The form to build in Kit

**Nobody ever sees this form.** The sign-up on the site is our own HTML,
posting to our own endpoint; the Kit form exists only as the thing an address
gets attached to. So its layout, colours and copy do not matter — what matters
is the settings, and the confirmation email, which readers *do* see.

Create it under **Grow → Landing Pages & Forms → Create new → Form → Inline**,
then pick any template. Fill in:

| Where | Setting | Value |
|---|---|---|
| Form builder | Form name | `OLMIKAYA letter — site sign-up` |
| Settings → General | After subscribing | Show success message |
| Settings → General | Success message | `Check your email to confirm.` |
| Settings → Incentive Email | Send incentive email | **On** |
| Settings → Incentive Email | Auto-confirm new members | **Off** — see below |
| Settings → Incentive Email | Subject | `Confirm your subscription — the OLMIKAYA letter` |
| Settings → Incentive Email | Button label | `Confirm subscription` |
| Settings → Incentive Email | Redirect after confirming | `https://olmikaya.com/letter/confirmed/` |

**Leave auto-confirm off.** That keeps double opt-in, which is the honest
default, protects the sending reputation of the domain, and is what the site's
own wording assumes — the form says *check your email and click to confirm*,
and both `/letter/thank-you/` and the endpoint's response say the same. Turn
auto-confirm on and all three become untrue.

Until someone clicks that link Kit lists them as **inactive**. That is correct,
not a fault.

#### The confirmation email

The one piece of this a reader actually reads. In OLMIKAYA's voice, not Kit's
default:

```
You asked for the OLMIKAYA letter. One click confirms it, and nothing
is sent until you do.

It goes out once, at the end of each month: what we published, what we
found and did not publish, and where we are going next. No more than
twelve a year.

[ Confirm subscription ]

If you did not sign up, ignore this. Nothing further will arrive.
```

Keep it plain text with the single button. No banner image, no exclamation
marks, no second call to action — the same restraint as the rest of the site.

On the free plan you get **one sequence**, so do the welcoming here rather than
spending the sequence on a one-email welcome. Save the sequence for when there
is something that genuinely needs several.

Check the key works before deploying anything:

```bash
curl https://api.kit.com/v4/account -H "X-Kit-Api-Key: YOUR_KEY"
```

Your account details back means the key is good. A 401 means it is not, or you
copied a V3 key.

Then add both in Cloudflare under **Workers & Pages → the project → Settings →
Variables and Secrets**:

| Variable | Type |
|---|---|
| `KIT_API_KEY` | **Secret** |
| `KIT_FORM_ID` | Plain text |

Set both for **Production and Preview**, or previews will report that sign-ups
are closed. Until they are set the endpoint answers 503 and the form says
sign-ups are not open yet — nobody is ever told they subscribed when they did
not, and no address is dropped on the floor.

Confirm the free plan's current subscriber limit on Kit's pricing page before
you rely on it; these change.

**Testing it.** The endpoint's logic is covered without touching Kit or
spending a real address:

```bash
node tests/subscribe.test.mjs
```

`npm run dev` serves the pages but not the Function — Astro's dev server knows
nothing about `functions/`, so submitting the form locally shows the failure
state. To run the endpoint under the real Workers runtime:

```bash
npx wrangler pages dev dist
```

That verifies routing, validation, the honeypot, the redirects and the 503 you
get before configuration. It does **not** currently verify a configured
sign-up: since Wrangler 4.47 `.dev.vars` is listed at startup but not injected
into a Pages Function's `context.env`, so the endpoint sees no key locally
however you supply one. Nothing to fix here — dashboard variables reach
`context.env` normally in production.

**Checking a real deployment.** Once the variables are set and a fresh build
has run, post at it directly:

```bash
curl -i -X POST https://YOUR-SITE/api/subscribe -H "Accept: application/json" --data-urlencode "email=you@example.com"
```

| Status | Meaning |
|---|---|
| `200` | Working. Check your inbox for the confirmation email. |
| `503` | Variables missing, or set but not redeployed since. |
| `502` | Variables present, Kit rejected them — wrong or expired key, or a V3 key. |
| `403` | You sent an `Origin` header from another host. Drop it. |
| `404` | `functions/` is in the wrong place for the project's root directory. |

Use a real address you can read; a 200 sends a live confirmation email.

**Swapping provider.** Everything Kit-specific is inside `subscribeToKit()`.
Replace that one function and the two variable names; nothing else changes.

---

## The letter

Issues live in `src/content/letters/`, one Markdown file each, written in the
CMS under **The letter**. Publishing an issue puts it in the public archive at
`/letter/` — it is not a private copy.

The folder starts empty and the archive says so. Astro warns
`The collection "letters" does not exist or is empty` on every build until the
first issue exists; that is expected and clears itself.

Three pages back it:

```
/letter/                What it is, the sign-up, and the archive
/letter/<slug>/         One issue, with previous and next
/letter/thank-you/      Where a sign-up lands without JavaScript
/letter/sorry/          Where a failed one lands, so nobody is told
                        they subscribed when they did not
/letter/confirmed/      Where Kit sends them after they click Confirm
```

Both landing pages carry `noindex`. Nobody with JavaScript ever sees them —
the script reports inline and the page never navigates.

---

## How the content is organised

Five collections, each a folder of Markdown files:

```
src/content/articles/     Journal pieces
src/content/directory/    People and places
src/content/letters/      Issues of the letter
src/content/objects/      Things you make
src/content/seasons/      The seasonal framework
```

`src/content.config.ts` defines what fields each one accepts and validates
every file at build time — a malformed article fails the build rather than
publishing broken. `public/admin/config.yml` mirrors those fields to build the
editing forms.

**If you add a field, add it in both places.** The CMS silently drops anything
the config does not know about.

### Sections

Sections are **derived from the articles that exist**, never from a hardcoded
list — see `src/lib/sections.ts`. A category with nothing published in it
produces no nav item and no page, so the site can never link to an empty
section. Both an article's primary and secondary category count, so a
Food/Ritual piece appears under both.

They live at `/sections/<name>/` rather than at the top level, so a category
can never collide with a top-level page of the same name.

### Density

Index pages — home, journal, sections — use the dense component layer
(`.module`, `.tile`, `.brief`, `.grid-dense`) documented in section 14 of the
stylesheet. Article pages deliberately do not: reading stays at the ~65
character measure. If you add an index page, use the dense components; if you
add a reading page, use `.prose`.

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
  "Products should feel like", so `/shop/` takes the most conservative
  reading: objects as extensions of the reporting, no commerce mechanics, no
  prices. The page is laid out as a shop grid, but the line under each object
  is its `availability`, not a price — none has been set. To sell, add a price
  field in `src/content.config.ts` and mirror it in `public/admin/config.yml`.
- **The letter** — wired to Kit through `/api/subscribe`, but dormant until
  `KIT_API_KEY` and `KIT_FORM_ID` are set in Cloudflare. Until then the form
  says sign-ups are not open. See step 4 above.
