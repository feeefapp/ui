"""Pixel difference between the kit's renders (compare_kit.mjs) and the iOS reference captures,
per shape (its box plus 16 pt around, so rim and shadow count) and per scene.

    python3 compare_kit.py <kit render dir> <label> [renderer ...]   → data/compare-<label>.json

Metrics per crop: mean absolute difference (0-255, all channels) and the share of pixels whose
largest channel differs by more than 24."""
import json
import sys
from pathlib import Path

import numpy as np

from lg import DATA, RAW, SCALE, load, shapes

BACKGROUNDS = ["photo", "stripes12", "flat-808080", "flat-ffffff", "flat-1a1a1a"]
MARGIN = 16


def crops(a, b):
    out = {}
    for s in shapes("shapes-a"):
        x0 = int((s["x"] - MARGIN) * SCALE)
        y0 = int((s["y"] - MARGIN) * SCALE)
        x1 = int((s["x"] + s["w"] + MARGIN) * SCALE)
        y1 = int((s["y"] + s["h"] + MARGIN) * SCALE)
        d = np.abs(a[y0:y1, x0:x1] - b[y0:y1, x0:x1]) * 255
        out[s["id"]] = {"mean": round(float(d.mean()), 2), "over24": round(float((d.max(axis=2) > 24).mean()), 4)}
    return out


def main():
    kit_dir, label = Path(sys.argv[1]), sys.argv[2]
    renderers = sys.argv[3:] or ["css", "canvas"]
    result = {}
    for renderer in renderers:
        for scheme in ["light", "dark"]:
            for bg in BACKGROUNDS:
                kit = kit_dir / f"{renderer}-{scheme}-{bg}.png"
                if not kit.exists():
                    continue
                ios = load(RAW / f"reference/regular-{scheme}-{bg}.png")
                ours = load(kit)
                if ours.shape != ios.shape:
                    raise SystemExit(f"size mismatch {kit}: {ours.shape} vs {ios.shape}")
                per = crops(ours, ios)
                result[f"{renderer}/{scheme}/{bg}"] = {
                    "mean": round(float(np.mean([v["mean"] for v in per.values()])), 2),
                    "over24": round(float(np.mean([v["over24"] for v in per.values()])), 4),
                    "shapes": per,
                }
                r = result[f"{renderer}/{scheme}/{bg}"]
                print(f"{renderer:7s} {scheme:5s} {bg:12s} mean Δ {r['mean']:6.2f}   >24: {r['over24'] * 100:5.1f}%")
    DATA.mkdir(exist_ok=True)
    (DATA / f"compare-{label}.json").write_text(json.dumps(result, indent=1))


if __name__ == "__main__":
    main()
