"""Edge light and shadow: luminance across the edge (signed distance, 1 px bins) by direction of
the outward normal (12 bins of 30°, 0° = right, 90° = down), for glass over flat black, grey and
white. Writes data/edge.json; the background level is subtracted so rows read as added light."""
import json

import numpy as np

from lg import DATA, RAW, SCALE, load, shape_sdf, shapes

DMIN, DMAX = -14.0, 16.0  # pt
BINS = 12


def main():
    out = {"dmin": DMIN, "dmax": DMAX, "step_px": 1, "angles": [i * 30 for i in range(BINS)], "sets": {}}
    for glass in ["regular", "clear"]:
        for scheme in ["light", "dark"]:
            for color in ["000000", "808080", "ffffff"]:
                img = load(RAW / f"edge/{glass}-{scheme}-shapes-b-{color}.png")
                lum = img.mean(axis=2)
                bg = int(color[:2], 16) / 255
                key = f"{glass}-{scheme}-{color}"
                out["sets"][key] = {}
                for shape in shapes("shapes-b"):
                    h, w = lum.shape
                    d, nx, ny, _ = shape_sdf(shape, h, w)
                    ang = (np.degrees(np.arctan2(ny, nx)) + 360 + 15) % 360 // 30
                    di = np.round(d).astype(int)
                    sel = (d >= DMIN * SCALE) & (d < DMAX * SCALE)
                    table = []
                    for a in range(BINS):
                        row = []
                        m = sel & (ang == a)
                        for k in range(int(DMIN * SCALE), int(DMAX * SCALE)):
                            v = lum[m & (di == k)]
                            row.append(round(float(np.median(v)) - bg, 3) if v.size else None)
                        table.append(row)
                    out["sets"][key][shape["id"]] = table
                print("done", key, flush=True)
    DATA.mkdir(exist_ok=True)
    (DATA / "edge.json").write_text(json.dumps(out, separators=(",", ":")))


if __name__ == "__main__":
    main()
