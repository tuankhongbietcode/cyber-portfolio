"""Render the 1200x630 social card for the portfolio.

The site has no build step, so this is a one-off generator rather than part of
a pipeline. It mirrors the terminal motif of the hero and the design tokens in
dist/styles.css (dark theme, since social cards are almost always shown on a
dark or neutral background).

The card is regenerated whenever the hero copy changes — the previous revision
still carried an old "IT intern" role line long after that phrasing was retired,
which is exactly the drift a generator prevents.

Output: dist/og-image.png
"""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "dist" / "og-image.png"
AVATAR = ROOT / "dist" / "avatar-still.png"

W, H = 1200, 630

# Tokens lifted from dist/styles.css (dark theme).
BG = (10, 11, 12)
BG_2 = (14, 16, 18)
GRID = (255, 255, 255, 9)
LINE = (255, 255, 255, 26)
TEXT = (231, 233, 234)
MUTE = (125, 132, 138)
ACCENT = (127, 224, 166)
DOT_R = (255, 95, 86)
DOT_Y = (255, 189, 46)
DOT_G = (39, 201, 63)

MONO = "C:/Windows/Fonts/consola.ttf"
MONO_B = "C:/Windows/Fonts/consolab.ttf"
SANS_B = "C:/Windows/Fonts/arialbd.ttf"
SANS = "C:/Windows/Fonts/arial.ttf"

PAD = 56


def grid(draw: ImageDraw.ImageDraw) -> None:
    """Faint graph-paper grid, matching the hero backdrop."""
    step = 40
    for x in range(0, W, step):
        draw.line([(x, 0), (x, H)], fill=GRID, width=1)
    for y in range(0, H, step):
        draw.line([(0, y), (W, y)], fill=GRID, width=1)


def main() -> int:
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img, "RGBA")

    # Subtle top-to-bottom lift so the card is not a flat black rectangle.
    for i in range(H):
        t = i / H
        shade = tuple(
            round(BG[c] + (BG_2[c] - BG[c]) * (1 - t)) for c in range(3)
        )
        d.line([(0, i), (W, i)], fill=shade)

    grid(d)

    f_prompt = ImageFont.truetype(MONO, 27)
    f_name = ImageFont.truetype(SANS_B, 62)
    f_tag = ImageFont.truetype(MONO, 38)
    f_role = ImageFont.truetype(MONO, 25)
    f_foot = ImageFont.truetype(MONO, 22)
    f_dot = ImageFont.truetype(MONO, 24)

    y = PAD + 10

    # Terminal title bar
    for i, col in enumerate((DOT_R, DOT_Y, DOT_G)):
        cx = PAD + 4 + i * 26
        d.ellipse([cx - 8, y - 8, cx + 8, y + 8], fill=col)
    d.text((PAD + 92, y - 15), "guest@vlat273: ~", font=f_dot, fill=MUTE)

    d.line([(PAD, y + 28), (W - PAD, y + 28)], fill=LINE, width=1)

    y += 78
    d.text((PAD, y), "guest@vlat273:~$", font=f_prompt, fill=MUTE)
    pw = d.textlength("guest@vlat273:~$ ", font=f_prompt)
    d.text((PAD + pw, y), "whoami", font=f_prompt, fill=TEXT)

    y += 62
    d.text((PAD, y), "Võ Lê Anh Tuấn", font=f_name, fill=TEXT)

    y += 92
    # Tagline with the accent word, mirroring the hero's emphasis.
    left, accent_word = "I trace the ", "attack path"
    d.text((PAD, y), left, font=f_tag, fill=TEXT)
    lw = d.textlength(left, font=f_tag)
    d.text((PAD + lw, y), accent_word, font=f_tag, fill=ACCENT)
    aw = d.textlength(accent_word, font=f_tag)
    d.text((PAD + lw + aw, y), ".", font=f_tag, fill=TEXT)

    y += 74
    # Role line. Deliberately NOT "IT support" / "helpdesk" — the Got It role is
    # framed by what he owns, not by what the ladder called it.
    d.text((PAD, y), "cybersecurity student", font=f_role, fill=MUTE)
    sep_x = PAD + d.textlength("cybersecurity student", font=f_role) + 18
    d.text((sep_x, y), "·", font=f_role, fill=MUTE)
    d.text((sep_x + 22, y), "system & security @ Got It", font=f_role, fill=MUTE)

    # Portrait, right-aligned. avatar-still.png is a halftone glyph field: white
    # ink on a transparent ground, with alpha carrying the tone. So the alpha
    # channel IS the image — paste a tinted plate through it, not the raw RGB,
    # or the transparent ground comes through as a white block.
    if AVATAR.exists():
        av = Image.open(AVATAR).convert("RGBA")
        target_h = 384
        scale = target_h / av.height
        av = av.resize((round(av.width * scale), target_h), Image.LANCZOS)

        glyph_alpha = av.getchannel("A")
        # Lift the low end: the ground sits near alpha 0, the glyphs high.
        glyph_alpha = glyph_alpha.point(lambda v: min(255, int(v * 1.45)))

        # Fade the four edges so the portrait dissolves into the plate instead
        # of showing the rectangle its source happens to be cropped to.
        feather = Image.new("L", av.size, 0)
        fd = ImageDraw.Draw(feather)
        fx0, fy0, fx1, fy1 = (int(av.width * 0.10), int(av.height * 0.07),
                              int(av.width * 0.90), int(av.height * 0.95))
        fd.rectangle([fx0, fy0, fx1, fy1], fill=255)
        feather = feather.filter(ImageFilter.GaussianBlur(av.width * 0.075))
        glyph_alpha = ImageChops.multiply(glyph_alpha, feather)

        ink = Image.new("RGBA", av.size, TEXT + (255,))
        px = W - PAD - av.width - 8
        py = (H - av.height) // 2 + 12
        img.paste(ink, (px, py), glyph_alpha)

    # Footer rule and focus line
    fy = H - PAD - 34
    d.line([(PAD, fy), (W - PAD, fy)], fill=LINE, width=1)
    fy += 16
    d.text((PAD, fy), "enumeration", font=f_foot, fill=MUTE)
    x = PAD + d.textlength("enumeration", font=f_foot) + 16
    d.text((x, fy), "·", font=f_foot, fill=MUTE)
    x += 18
    d.text((x, fy), "active directory", font=f_foot, fill=MUTE)
    x += d.textlength("active directory", font=f_foot) + 16
    d.text((x, fy), "·", font=f_foot, fill=MUTE)
    x += 18
    d.text((x, fy), "privilege escalation", font=f_foot, fill=MUTE)

    label = "open to internship"
    lx = W - PAD - d.textlength(label, font=f_foot)
    d.ellipse([lx - 22, fy + 6, lx - 10, fy + 18], fill=ACCENT)
    d.text((lx, fy), label, font=f_foot, fill=MUTE)

    img.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT}  {img.size[0]}x{img.size[1]}  "
          f"{OUT.stat().st_size // 1024} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
