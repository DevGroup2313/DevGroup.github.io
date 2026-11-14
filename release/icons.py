"""LAKAY | Copyright (c) 2026 Yannie D. Forest. All rights reserved. NO LICENCE IS GRANTED. See LICENCE.txt.

Lakay's icons, made from the one approved drawing of the mark (the Spiral coin in the Mac icon, desktop/mac/emporium.icns,
1024 points). The owner's rule (13 November 2026): the logo alone, with no white square around it.

  * Where a system can show a round picture, the icon is the coin alone, cut clean from its shadow, on nothing:
    the browser tab, the Fire tablet's app key, the Windows and Mac programs.
  * Where a system always draws a rounded square and fills what is empty with black (the iPhone and iPad home screen,
    and an Android home screen shortcut), the square is filled edge to edge with the coin's own periwinkle enamel, so
    that what shows is the coin and its gold rim, and no white.

Run from the repository's root: python3 -I release/icons.py
It writes:
  src/brand/lakay-mark/web-coin-96.png, web-tile-192.png, web-tile-180.png
                                                             (put in the page by build.py: the tab, shortcuts, the iPhone)
  app/apple-touch-icon.png, app/apple-touch-icon-precomposed.png, app/favicon.ico, app/icon-192.png, app/icon-512.png
                                                             (beside the page, for a website: see README.md)
  packages/ios/Shell/Icons/*.png                             (the iPhone and iPad app)
  packages/fire/res/mipmap-*/ic_launcher.png                 (the Fire tablet app)
"""
import math
import os
import sys

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def master():
    im = Image.open(os.path.join(HERE, "desktop", "mac", "emporium.icns"))
    im.load()
    im = im.convert("RGBA")
    if im.size != (1024, 1024):
        sys.exit("icons: the Mac icon's largest picture is not 1024 points")
    return im


def coin_radius(im):
    """The coin's radius, read along 72 directions from the centre: where its opaque face ends and the shadow begins."""
    w, h = im.size
    cx, cy = w / 2.0, h / 2.0
    found = []
    for k in range(72):
        a = 2 * math.pi * k / 72
        r = 0.0
        while r < w / 2.0:
            x, y = int(cx + r * math.cos(a)), int(cy + r * math.sin(a))
            p = im.getpixel((x, y))
            lum = 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]
            if p[3] < 250 or lum < 70:
                break
            r += 0.5
        found.append(r)
    found.sort()
    return found[len(found) // 2], (cx, cy)


def coin_alone(im):
    """The coin cut along a smooth circle just inside its gold rim's outer edge, on nothing, cropped square."""
    r, (cx, cy) = coin_radius(im)
    r -= 1.5
    s = 4
    big = Image.new("L", (im.size[0] * s, im.size[1] * s), 0)
    ImageDraw.Draw(big).ellipse(((cx - r) * s, (cy - r) * s, (cx + r) * s, (cy + r) * s), fill=255)
    mask = big.resize(im.size, Image.LANCZOS)
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    out.paste(im, (0, 0), mask)
    box = (int(math.floor(cx - r)), int(math.floor(cy - r)), int(math.ceil(cx + r)), int(math.ceil(cy + r)))
    out = out.crop(box)
    side = max(out.size)
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.paste(out, ((side - out.size[0]) // 2, (side - out.size[1]) // 2))
    return sq, r


def enamel(im, r, where):
    """The average colour of the coin's outer enamel band, at the top or the foot of the coin."""
    cx, cy = im.size[0] / 2.0, im.size[1] / 2.0
    acc, n = [0, 0, 0], 0
    for deg in range(-40, 41, 2):
        a = math.radians(deg + (270 if where == "top" else 90))
        for f in (0.86, 0.88, 0.90):
            x, y = int(cx + f * r * math.cos(a)), int(cy + f * r * math.sin(a))
            p = im.getpixel((x, y))
            if p[3] > 250 and p[2] > p[0]:          # the enamel, not a gold mark on it
                acc = [acc[i] + p[i] for i in range(3)]
                n += 1
    return tuple(int(round(v / n)) for v in acc)


def tile(coin, top, foot, size, share=0.94):
    """A square filled edge to edge with the coin's enamel (top colour to foot colour), the coin at its centre."""
    t = Image.new("RGBA", (size, size), top + (255,))
    d = ImageDraw.Draw(t)
    for y in range(size):
        k = y / max(1, size - 1)
        d.line([(0, y), (size, y)], fill=tuple(int(round(top[i] + (foot[i] - top[i]) * k)) for i in range(3)) + (255,))
    side = int(round(size * share))
    c = coin.resize((side, side), Image.LANCZOS)
    t.alpha_composite(c, ((size - side) // 2, (size - side) // 2))
    return t.convert("RGB")


def save(img, *parts):
    path = os.path.join(HERE, *parts)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, optimize=True)
    print("  " + "/".join(parts), img.size[0])


def main():
    im = master()
    coin, r = coin_alone(im)
    top, foot = enamel(im, r, "top"), enamel(im, r, "foot")
    print("Lakay's icons: the coin's radius %.1f of 1024; its enamel %s at the top, %s at the foot" % (r, "#%02x%02x%02x" % top, "#%02x%02x%02x" % foot))
    small = lambda n: coin.resize((n, n), Image.LANCZOS)
    # the page itself: the tab, and the shortcuts a browser makes
    save(small(96), "src", "brand", "lakay-mark", "web-coin-96.png")
    save(tile(coin, top, foot, 192), "src", "brand", "lakay-mark", "web-tile-192.png")
    save(tile(coin, top, foot, 180), "src", "brand", "lakay-mark", "web-tile-180.png")
    # beside the page, for a website
    t180 = tile(coin, top, foot, 180)
    save(t180, "app", "apple-touch-icon.png")
    save(t180, "app", "apple-touch-icon-precomposed.png")
    save(tile(coin, top, foot, 192), "app", "icon-192.png")
    save(tile(coin, top, foot, 512), "app", "icon-512.png")
    ico = small(256)
    ico.save(os.path.join(HERE, "app", "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
    print("  app/favicon.ico 16, 32, 48")
    # the iPhone and iPad app: the system draws a rounded square and fills what is empty with black
    for name, n in (("AppIcon60x60@2x.png", 120), ("AppIcon60x60@3x.png", 180), ("AppIcon76x76@2x~ipad.png", 152), ("AppIcon83.5x83.5@2x~ipad.png", 167)):
        save(tile(coin, top, foot, n), "packages", "ios", "Shell", "Icons", name)
    # the Fire tablet app: the coin alone
    for folder, n in (("mipmap-mdpi", 48), ("mipmap-hdpi", 72), ("mipmap-xhdpi", 96), ("mipmap-xxhdpi", 144), ("mipmap-xxxhdpi", 192)):
        save(small(n), "packages", "fire", "res", folder, "ic_launcher.png")


if __name__ == "__main__":
    main()
