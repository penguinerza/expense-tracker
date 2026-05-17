#!/usr/bin/env python3
"""Generate PWA icons for the Expense Tracker.

Renders supersampled (4x) then downsamples with LANCZOS for crisp edges.
Full-bleed gradient background so the same asset works as a maskable icon
(safe content stays within the inner ~80%).
"""
import os
from PIL import Image, ImageDraw

SS = 4  # supersample factor
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "icons")


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def render(size):
    S = size * SS
    img = Image.new("RGB", (S, S), (15, 23, 42))
    d = ImageDraw.Draw(img, "RGBA")

    # Vertical gradient: blue-500 -> blue-900 (brand #1e40af sits in between)
    top = (59, 130, 246)
    bot = (23, 37, 84)
    for y in range(S):
        d.line([(0, y), (S, y)], fill=lerp(top, bot, y / S))

    # Soft diagonal highlight (top-left) for depth
    hl = Image.new("L", (S, S), 0)
    hd = ImageDraw.Draw(hl)
    hd.ellipse([-S * 0.35, -S * 0.45, S * 0.75, S * 0.65], fill=70)
    img.paste(Image.new("RGB", (S, S), (255, 255, 255)), (0, 0),
              hl.point(lambda v: v // 3))

    # --- Foreground: ascending bars on a baseline ---
    m = S * 0.22                      # margin / safe zone
    baseline = S - m
    bar_w = S * 0.13
    gap = S * 0.075
    radius = bar_w * 0.42
    heights = [0.30, 0.52, 0.78]      # fraction of usable height
    usable = baseline - m
    x = m + S * 0.03

    white = (255, 255, 255, 255)
    for h in heights:
        bh = usable * h
        d.rounded_rectangle(
            [x, baseline - bh, x + bar_w, baseline],
            radius=radius, fill=white,
        )
        x += bar_w + gap

    # Baseline rule
    d.rounded_rectangle(
        [m, baseline + S * 0.012, S - m, baseline + S * 0.045],
        radius=S * 0.02, fill=(255, 255, 255, 140),
    )

    # --- Amber upward trend arrow over the bars ---
    amber = (251, 191, 36, 255)
    centers = []
    bx = m + S * 0.03
    for h in heights:
        bh = usable * h
        centers.append((bx + bar_w / 2, baseline - bh - S * 0.055))
        bx += bar_w + gap
    p0 = (m + S * 0.01, baseline - usable * 0.18)
    pts = [p0] + centers
    lw = int(S * 0.028)
    for i in range(len(pts) - 1):
        d.line([pts[i], pts[i + 1]], fill=amber, width=lw)
    for px, py in pts:
        d.ellipse([px - lw, py - lw, px + lw, py + lw], fill=amber)

    # Arrowhead at the final (highest) point
    ex, ey = centers[-1]
    a = S * 0.075
    d.polygon(
        [(ex + a * 0.15, ey - a * 1.05),
         (ex + a * 1.05, ey - a * 0.15),
         (ex + a * 0.2, ey + a * 0.25)],
        fill=amber,
    )

    return img.resize((size, size), Image.LANCZOS)


def main():
    os.makedirs(OUT, exist_ok=True)
    for s in (192, 512):
        render(s).save(os.path.join(OUT, f"icon-{s}.png"), optimize=True)
        print(f"wrote icon-{s}.png")


if __name__ == "__main__":
    main()
