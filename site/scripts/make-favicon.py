"""Generate the OLMIKAYA favicons from the four-colour OLMI mark.

    python scripts/make-favicon.py        (run from site/)

public/favicon.svg is the real source and is edited by hand; this produces
the bitmap formats that still matter — favicon.ico for browsers and Windows,
and the PNG iOS uses for a home-screen tile. Re-run it if the palette or the
letterforms change.

Two things worth knowing before editing:

  * Each ICO frame is rendered independently and the container is packed by
    hand. PIL's ICO writer derives every size from the source image, so
    asking it for a multi-size icon just writes the smallest render four
    times.

  * The 16px frame uses a heavier weight and larger letters than the rest.
    At that size the elegant serif turns to mush; bold at 0.84 of the
    quadrant is the point where an O still reads as an O. Larger frames keep
    the regular weight, which matches the site.
"""

import io
import struct
from PIL import Image, ImageDraw, ImageFont

CREAM = (0xF8, 0xE9, 0xC8)   # --olmi-cream
SAGE = (0x2B, 0x3B, 0x2E)    # --olmi-green
CLAY = (0x8C, 0x42, 0x27)    # --olmi-terracotta
SKY = (0xA8, 0xC7, 0xDC)     # --olmi-sky
INK = (0x22, 0x1F, 0x18)     # --olmi-ink

REGULAR = "C:/Windows/Fonts/georgia.ttf"
BOLD = "C:/Windows/Fonts/georgiab.ttf"

SS = 8  # supersample factor: draw large, downsample once, keep the edges

# (column, row, ground, letter colour, glyph)
QUADRANTS = [
    (0, 0, CREAM, INK, "O"),
    (1, 0, SAGE, CREAM, "L"),
    (0, 1, CLAY, CREAM, "M"),
    (1, 1, SKY, INK, "I"),
]


def render(size: int, pad: int = 0) -> Image.Image:
    """One square mark at `size` px, optionally inset by `pad` px of cream."""
    inner = size - pad * 2
    big = inner * SS
    half = big // 2

    small = inner <= 16
    font_path = BOLD if small else REGULAR
    ratio = 0.84 if small else 0.72

    img = Image.new("RGB", (big, big), CREAM)
    draw = ImageDraw.Draw(img)
    font = ImageFont.truetype(font_path, int(half * ratio))

    for col, row, ground, ink, glyph in QUADRANTS:
        x0, y0 = col * half, row * half
        draw.rectangle([x0, y0, x0 + half - 1, y0 + half - 1], fill=ground)

        # Centre on the glyph's ink box, not its advance width, or I sits
        # left of centre and M rides high.
        box = draw.textbbox((0, 0), glyph, font=font)
        gx = x0 + (half - (box[2] - box[0])) // 2 - box[0]
        gy = y0 + (half - (box[3] - box[1])) // 2 - box[1]
        draw.text((gx, gy), glyph, font=font, fill=ink)

    img = img.resize((inner, inner), Image.LANCZOS)

    if pad:
        canvas = Image.new("RGB", (size, size), CREAM)
        canvas.paste(img, (pad, pad))
        return canvas
    return img


def write_ico(path: str, sizes: list[int]) -> None:
    frames = []
    for s in sizes:
        buf = io.BytesIO()
        render(s).save(buf, format="PNG", optimize=True)
        frames.append(buf.getvalue())

    out = io.BytesIO()
    out.write(struct.pack("<HHH", 0, 1, len(sizes)))     # ICONDIR
    offset = 6 + 16 * len(sizes)
    for s, data in zip(sizes, frames):
        out.write(struct.pack(
            "<BBBBHHII",
            0 if s >= 256 else s, 0 if s >= 256 else s,
            0, 0,          # palette count, reserved
            1, 32,         # colour planes, bits per pixel
            len(data), offset,
        ))
        offset += len(data)
    for data in frames:
        out.write(data)

    with open(path, "wb") as fh:
        fh.write(out.getvalue())
    print(f"{path} -> {sizes}")


write_ico("public/favicon.ico", [16, 32, 48, 64])

# iOS rounds the corners and shows it large, so inset the mark to keep the
# letters clear of the crop.
render(180, pad=16).save("public/apple-touch-icon.png", format="PNG", optimize=True)
print("public/apple-touch-icon.png -> 180x180, 16px inset")

render(512).save("public/icon-512.png", format="PNG", optimize=True)
print("public/icon-512.png -> 512x512")
