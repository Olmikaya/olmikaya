# OLMIKAYA

**Ordinary Living Made Intentional.** An independent East African editorial and
lifestyle company.

A static website — plain HTML, one stylesheet, one small script. No build step,
no dependencies, no framework. Open `index.html` and it works.

---

## Running it

Open `index.html` directly in a browser, or serve the folder:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

---

## Files

```
index.html          Home — the worldview, in one scroll
journal.html        Journal index — the editorial archive
article.html        Article template — one fully-realised specimen
seasons.html        Seasonal framework — SCAFFOLD, see below
directory.html      People & places
about.html          What OLMIKAYA is; masthead and colophon
shop.html           Objects — no commerce mechanics
styleguide.html     The design system, documented and visible

assets/css/olmikaya.css   Tokens, reset, type, grid, components
assets/js/olmikaya.js     Nav toggle, reveal-on-scroll, footer year
assets/img/               Empty — placeholders are pure CSS

color-palette.jpeg        The supplied brand asset. Source of truth.
```

`styleguide.html` is the fastest way to see the whole system at once.

---

## The palette

Extracted from `color-palette.jpeg`. Every swatch in the source is a uniform
block, so these are exact source values, not approximations.

| Token | Hex | Role |
|---|---|---|
| `--olmi-sky` | `#A8C7DC` | Cool relief, section grounds |
| `--olmi-offwhite` | `#FFF8F0` | Default page ground |
| `--olmi-cream` | `#F8E9C8` | Warm secondary ground |
| `--olmi-ink` | `#221F18` | Primary text, dark grounds |
| `--olmi-green` | `#2B3B2E` | Dark ground, secondary brand |
| `--olmi-maroon` | `#5C2020` | **The wordmark colour.** Primary brand. |
| `--olmi-terracotta` | `#8C4227` | Warm accent, light grounds only |

### One binding rule

**Terracotta is a light-ground accent only.**

```
terracotta on ink    2.29:1   FAIL
terracotta on green  1.65:1   FAIL
```

Never use terracotta as text or as a meaningful mark on ink or green. On dark
grounds use cream, off-white or sky. Every other text pairing in the palette
clears WCAG AA, and most clear AAA — the full measured table is on
`styleguide.html`.

---

## Typography

**Ovo ships exactly one style: weight 400. No bold, no italic.**

This is a hard constraint, not a preference, and it shapes the whole system:

- Ovo is a **display face only** — headings, the wordmark, pull-quotes.
  Hierarchy comes from size, letterspacing, case and colour, never weight.
- Never put `<strong>` or `<em>` inside Ovo-set text. The browser would
  synthesise a weight the typeface does not have. `font-synthesis-weight: none`
  is set on `body` as a backstop.
- **Inter** carries everything you actually read: body, captions, metadata,
  navigation, UI.

Both load from Google Fonts with full local fallback stacks, so pages stay
correct offline.

---

## Working with the site

### Placeholder imagery

There is no photography yet. Every image slot is a `.plate` — a palette colour
field at the correct aspect ratio:

```html
<figure>
  <!-- PHOTOGRAPH: what this frame should show -->
  <div class="plate plate--landscape plate--cream"></div>
  <figcaption>
    <span>Caption.</span>
    <span class="credit">Photograph to come</span>
  </figcaption>
</figure>
```

To drop in a real photograph, replace the `.plate` div with an `<img>` and keep
the surrounding `<figure>` and `<figcaption>`. Nothing else changes. Every
figure carries an HTML comment naming the photograph intended for that slot.

Ratios: `--portrait` `--square` `--landscape` `--wide` `--cinema`.
Tones: `--sky` `--cream` `--green` `--ink` `--terracotta` `--maroon`.

### Shared header and footer

There is no build step, so the masthead and footer markup is **duplicated in
every page**. Changing navigation means editing all eight files. The blocks are
clearly delimited and identical, so a find-and-replace across `*.html` is the
practical approach.

Nav lives between `<header class="masthead">` and `</header>`; the footer
between `<footer class="footer on-dark">` and `</footer>`.

### The newsletter form is not connected

The subscribe form is **intentionally inert**. There is no mailing provider, so
submission is stopped in JavaScript and the form says so rather than showing a
success state for something that did not happen.

To connect one, replace `initSubscribe()` in `assets/js/olmikaya.js` — or point
the `<form>` at your provider's endpoint and delete the handler. The form is
marked `data-subscribe`, its status line `data-subscribe-status`.

---

## What still needs real content

Everything below is scaffolding. It is written to prove the layouts and is
marked in the pages themselves so it cannot be mistaken for finished work.

- **The seasonal framework.** `seasons.html` is a structural scaffold. The
  OLMIKAYA seasons were listed among the brand assets but were not supplied, and
  nothing here invents them — the four slots are bracketed placeholders. Supply
  the framework and the page fills in without redesign. The homepage carries a
  matching scaffolded section.
- **All editorial.** Stories, deks, bylines and reading times across
  `journal.html` and `article.html` are invented to prove the reading layout.
  The quotation in the article is invented. None of it is reporting.
- **All directory entries.** Every entry is fictional. No real business, address
  or person is described, and nothing has been visited or verified.
- **The masthead.** Left bracketed on `about.html` rather than filled with
  invented people.
- **Product positioning.** The brief was truncated mid-sentence at "Products
  should feel like", so the intended positioning never arrived. `shop.html`
  takes the most conservative reading consistent with the rest of the brand:
  objects as extensions of the reporting, presented editorially, with no
  commerce mechanics and no prices.

---

## Accessibility and behaviour

- Skip link, semantic landmarks, one `<h1>` per page, visible focus rings.
- The reveal animation's hidden state is scoped to `html.js`, which the script
  adds. **With JavaScript disabled nothing is ever stranded invisible.**
- `prefers-reduced-motion` disables both the transitions and the scroll
  observer; content appears immediately.
- Light-only by design. The dark grounds are compositional passages, not a
  theme, so `color-scheme: light` is declared and there is no dark variant.
- No horizontal page scroll at any width. Wide content scrolls inside
  `.scroll-x`.
