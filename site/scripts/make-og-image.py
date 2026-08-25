"""Generate the default social-share image.

    python scripts/make-og-image.py        (run from site/)

Writes public/assets/img/og-default.png at 1200x630 — the size Facebook,
LinkedIn, WhatsApp, Slack and X all crop from without letterboxing.

This is what shows when someone pastes an OLMIKAYA link anywhere. Without
it the platforms pick an arbitrary image off the page, or show nothing,
which is what they did before this existed.

The mark is set in Georgia rather than Ovo because Ovo ships only as woff2
and converting it needs fontTools, which is not a dependency here. Georgia
is not an arbitrary substitute: the stylesheet already names it as Ovo's
metric-matched fallback, so it is the face the site itself falls back to.

Geometry follows the house plate: a colour field, a hairline inset frame,
and the wordmark widely tracked. Re-run if the palette or the mark changes.
"""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

W, H = 1200, 630
MAROON = (92, 32, 32)
CREAM = (248, 233, 200)

OUT = Path(__file__).resolve().parent.parent / "public" / "assets" / "img" / "og-default.png"

# Georgia: the stylesheet's declared fallback for Ovo.
SERIF = "C:/Windows/Fonts/georgia.ttf"
SANS = "C:/Windows/Fonts/segoeui.ttf"


def tracked(draw, text, font, tracking, centre_x, y, fill):
    """Draw letterspaced text centred on centre_x. PIL has no tracking, so
    each glyph is placed by hand and the run is measured first to centre it."""
    widths = [draw.textlength(ch, font=font) for ch in text]
    total = sum(widths) + tracking * (len(text) - 1)
    x = centre_x - total / 2
    for ch, w in zip(text, widths):
        draw.text((x, y), ch, font=font, fill=fill)
        x += w + tracking
    return total


img = Image.new("RGB", (W, H), MAROON)
d = ImageDraw.Draw(img)

# Hairline inset frame — the same move the .plate placeholder makes.
inset = 40
d.rectangle([inset, inset, W - inset - 1, H - inset - 1], outline=(140, 92, 92), width=1)

wordmark = ImageFont.truetype(SERIF, 96)
tagline = ImageFont.truetype(SANS, 26)

# The wordmark, tracked the way the masthead sets it (0.34em).
tracked(d, "OLMIKAYA", wordmark, 0.34 * 96, W / 2, H / 2 - 96, CREAM)

# A short rule between mark and tagline.
ry = H / 2 + 44
d.line([(W / 2 - 44, ry), (W / 2 + 44, ry)], fill=(140, 92, 92), width=1)

# Tagline, uppercase and tracked, as the eyebrow style sets it.
tracked(d, "ORDINARY LIVING MADE INTENTIONAL", tagline, 0.12 * 26, W / 2, ry + 34, CREAM)

OUT.parent.mkdir(parents=True, exist_ok=True)
img.save(OUT, "PNG", optimize=True)
print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB)")
