"""Generate the OLMIKAYA favicons — and the profile avatar — from the O monogram.

    python scripts/make-favicon.py        (run from site/)

public/favicon.svg is the real source and is edited by hand; this produces
the bitmap formats that still matter — favicon.ico for browsers and Windows,
the PNGs iOS and Android want for a home-screen tile, and the square PNG the
social accounts take as a profile picture. Re-run it if the mark or the
palette changes.

The geometry here mirrors the SVG exactly: a maroon field, and a cream O
built from two concentric ellipses, the inner one narrower in proportion so
the sides come out thick and the top and bottom thin. Change one file and
change the other.

Two things worth knowing before editing:

  * Each ICO frame is rendered independently and the container is packed by
    hand. PIL's ICO writer derives every size from the source image, so
    asking it for a multi-size icon just writes the smallest render four
    times.

  * The 16px frame flattens the thick/thin contrast. At that size the thin
    top and bottom of the bowl land on less than one pixel and grey out,
    which reads as a broken ring rather than a letter; thickening them to
    roughly a pixel keeps the O closed. Larger frames keep the drawn
    contrast, which matches the SVG and the wordmark.
"""

import io
import struct
from pathlib import Path

from PIL import Image, ImageDraw

MAROON = (0x5C, 0x20, 0x20)  # --olmi-maroon, the wordmark colour
CREAM = (0xF8, 0xE9, 0xC8)   # --olmi-cream

SS = 8  # supersample factor: draw large, downsample once, keep the curve clean

# Proportions of the O, as fractions of the tile. Matches public/favicon.svg:
# outer 19x21.5 and inner 12.2x17.8 in a 64 box.
OUTER_W, OUTER_H = 19 / 64, 21.5 / 64
INNER_W, INNER_H = 12.2 / 64, 17.8 / 64
INNER_H_SMALL = 16.6 / 64   # flatter contrast for the 16px frame


def render(size: int) -> Image.Image:
    """The mark at `size` px."""
    big = size * SS
    c = big / 2

    inner_h = INNER_H_SMALL if size <= 16 else INNER_H

    img = Image.new("RGB", (big, big), MAROON)
    draw = ImageDraw.Draw(img)

    def ellipse(w: float, h: float, fill: tuple[int, int, int]) -> None:
        rx, ry = w * big, h * big
        draw.ellipse([c - rx, c - ry, c + rx, c + ry], fill=fill)

    ellipse(OUTER_W, OUTER_H, CREAM)
    ellipse(INNER_W, inner_h, MAROON)

    return img.resize((size, size), Image.LANCZOS)


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

# iOS rounds the corners and drops its own padding around nothing, so the
# tile is full bleed. The O already sits well inside the corner crop.
render(180).save("public/apple-touch-icon.png", format="PNG", optimize=True)
print("public/apple-touch-icon.png -> 180x180")

render(512).save("public/icon-512.png", format="PNG", optimize=True)
print("public/icon-512.png -> 512x512")

# The profile picture. Instagram masks it to a circle and stores 320px, but
# it takes a large upload and downsamples it better than it upsamples a small
# one. The mark is unchanged: it clears the circle with room to spare, so
# there is no avatar-only version of it to keep in step with the favicon.
avatar = Path("../brand/instagram-avatar.png")
avatar.parent.mkdir(exist_ok=True)
render(1080).save(avatar, format="PNG", optimize=True)
print(f"{avatar} -> 1080x1080")
