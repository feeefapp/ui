"""Kit vs iOS 27 (Apple's Figma kit): assembles the kit's passes (figma27_kit.mjs) into the
reference layouts, then reports mean differences, edge profiles and writes side-by-side sheets.

    python3 figma27_compare.py <label> <before dir> <after dir>
      label: web | flutter → data/figma27-compare-<label>.json, reference/figma27-<layout>-<label>.png

Sheet rows: 0 regular light, 1 regular dark, 3 clear light (row 2, prominent tint, is not in the
kit and is left as Figma's). Sizes rows: 0 light, 1 dark (regular). Mean |Δ| is over each tile
(all channels, 0–255). Edge: Δ luminance vs the bare backdrop 0–1 and 1–2 device px outside the
outline, at the sides (left/right) and top/bottom, and the interior (upper half).
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

from analyze_figma27 import FIG, ROOT, S, SHEET_BG, SIZES_BG, capsule_geo, circle_geo

SHEET_PASSES = {0: "figma-sheet-regular-light", 1: "figma-sheet-regular-dark", 3: "figma-sheet-clear-light"}
SIZES_PASSES = {0: "figma-sizes-regular-light", 1: "figma-sizes-regular-dark"}


def load(path):
    return np.asarray(Image.open(path).convert("RGB")).astype(np.float64)


def assemble(ref, folder, passes, pitch):
    out = ref.copy()
    for row, name in passes.items():
        img = load(Path(folder) / f"{name}.png")
        out[row * pitch:(row + 1) * pitch] = img[row * pitch:(row + 1) * pitch]
    return out


def edge_numbers(lum, bg, d, nx, ny, stripe):
    """Δ at 0–1 and 1–2 px outside, sides and top/bottom; interior median Δ."""
    side = np.abs(nx) > 0.92
    vert = np.abs(ny) > 0.92
    res = {}
    for name, m in (("side", side & ~stripe), ("top_bottom", vert & ~stripe)):
        res[name] = [round(float(np.median((lum - bg)[m & (d >= k) & (d < k + 1)])), 1) for k in (0, 1)]
    return res


def main():
    label, before_dir, after_dir = sys.argv[1], sys.argv[2], sys.argv[3]
    sheet = load(FIG / "sheet-3x.png")
    sizes = load(FIG / "sizes-3x.png")
    kits = {"before": (assemble(sheet, before_dir, SHEET_PASSES, 390), assemble(sizes, before_dir, SIZES_PASSES, 990)),
            "after": (assemble(sheet, after_dir, SHEET_PASSES, 390), assemble(sizes, after_dir, SIZES_PASSES, 990))}
    result = {"sheet": {}, "sizes": {}}
    variants = {0: "regular-light", 1: "regular-dark", 3: "clear-light"}
    for row, variant in variants.items():
        for col, bgv in enumerate(SHEET_BG):
            y0, x0 = row * 390, col * 390
            key = f"{variant}/{bgv}"
            entry = {}
            size = 66 if row == 3 else 48
            for which, img in [("figma", sheet)] + [(k, v[0]) for k, v in kits.items()]:
                tile = img[y0:y0 + 360, x0:x0 + 360]
                lum = tile.mean(axis=2)
                d, nx, ny = circle_geo(180, 180, size * S / 2, 360, 360)
                stripe = np.abs(np.mgrid[0:360, 0:360][0] + 0.5 - 180) < 15
                e = edge_numbers(lum, np.full_like(lum, float(bgv)), d, nx, ny, stripe)
                inner = (d < -9) & (np.mgrid[0:360, 0:360][0] < 165)
                e["interior"] = round(float(np.median(lum[inner])), 1)
                if which != "figma":
                    e["mean"] = round(float(np.abs(tile - sheet[y0:y0 + 360, x0:x0 + 360]).mean()), 2)
                entry[which] = e
            result["sheet"][key] = entry
    for row, scheme in enumerate(["light", "dark"]):
        for col, bgname in enumerate(SIZES_BG):
            y0, x0 = row * 990, col * 1050
            for name, (x, y, w, h) in [("bar", (90, 20, 160, 44)), ("capsule", (20, 100, 300, 200))]:
                key = f"{name}-{scheme}/{bgname}"
                entry = {}
                for which, img in [("figma", sizes)] + [(k, v[1]) for k, v in kits.items()]:
                    tile = img[y0:y0 + 960, x0:x0 + 1020]
                    ref_tile = sizes[y0:y0 + 960, x0:x0 + 1020]
                    lum = tile.mean(axis=2)
                    bg = np.repeat(ref_tile[2:3], 960, axis=0).mean(axis=2)
                    d, nx, ny = capsule_geo(x * S, y * S, w * S, h * S, 960, 1020)
                    cy = (y + h / 2) * S
                    stripe = np.abs(np.mgrid[0:960, 0:1020][0] + 0.5 - cy) < 15
                    e = edge_numbers(lum, bg, d, nx, ny, stripe)
                    inner = (d < -12) & ~stripe
                    e["interior"] = round(float(np.median(lum[inner])), 1)
                    if which != "figma":
                        # The shape's box + 10 pt, so edge, hairline and shadow count.
                        box = (slice(max(0, int((y - 10) * S)), int((y + h + 10) * S)), slice(max(0, int((x - 10) * S)), int((x + w + 10) * S)))
                        e["mean"] = round(float(np.abs(tile[box] - ref_tile[box]).mean()), 2)
                    entry[which] = e
                result["sizes"][key] = entry
    (ROOT / "data" / f"figma27-compare-{label}.json").write_text(json.dumps(result, indent=1))
    # Side-by-side sheets: Figma | kit before | kit after.
    for layout, (ref, idx, scale, axis) in {"sheet": (sheet, 0, 0.5, 1), "sizes": (sizes, 1, 0.34, 0)}.items():
        panels = [ref, kits["before"][idx], kits["after"][idx]]
        ims = [Image.fromarray(np.clip(p, 0, 255).astype(np.uint8)) for p in panels]
        ims = [im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS) for im in ims]
        gap = 12
        if axis == 1:
            canvas = Image.new("RGB", (sum(i.width for i in ims) + gap * 2, ims[0].height), (60, 60, 60))
            x = 0
            for im in ims:
                canvas.paste(im, (x, 0))
                x += im.width + gap
        else:
            canvas = Image.new("RGB", (ims[0].width, sum(i.height for i in ims) + gap * 2), (60, 60, 60))
            y = 0
            for im in ims:
                canvas.paste(im, (0, y))
                y += im.height + gap
        canvas.save(ROOT / "reference" / f"figma27-{layout}-{label}.png")
    # Zoomed edge crops: one tile per variant on white and 128, Figma / before / after (full 3x).
    crops = []
    for row in (0, 1, 3):
        for col in (0, 2):
            y0, x0 = row * 390 + 60, col * 390 + 60
            crops.append([np.clip(p[y0:y0 + 240, x0:x0 + 240], 0, 255).astype(np.uint8) for p in (sheet, kits["before"][0], kits["after"][0])])
    canvas = Image.new("RGB", (3 * 240 + 2 * 6, len(crops) * 246), (60, 60, 60))
    for r, trio in enumerate(crops):
        for c, crop in enumerate(trio):
            canvas.paste(Image.fromarray(crop), (c * 246, r * 246))
    canvas.save(ROOT / "reference" / f"figma27-edges-{label}.png")
    # Summary.
    for section in ("sheet", "sizes"):
        print(f"{label} {section}: mean |Δ| before → after, edge Δ outside (sides / top-bottom, px 0–1) figma | before | after, interior figma | before | after")
        for key, entry in result[section].items():
            f, b, a = entry["figma"], entry["before"], entry["after"]
            print(f"  {key:22s} {b['mean']:6.2f} → {a['mean']:6.2f}   side {f['side'][0]:6.1f} | {b['side'][0]:6.1f} | {a['side'][0]:6.1f}"
                  f"   top {f['top_bottom'][0]:6.1f} | {b['top_bottom'][0]:6.1f} | {a['top_bottom'][0]:6.1f}   in {f['interior']:5.1f} | {b['interior']:5.1f} | {a['interior']:5.1f}")


if __name__ == "__main__":
    main()
