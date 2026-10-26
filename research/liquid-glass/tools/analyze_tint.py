"""Material colour: glass over flat backgrounds. For each shape, the median colour of its flat middle
(away from the bezel) against the background colour, regular/clear × light/dark. Fits, per mode,
out = gain * bg + offset (per channel, sRGB) and a saturation term; writes data/tint.json."""
import json

import numpy as np

from lg import DATA, RAW, SCALE, load, shape_sdf, shapes

FLATS = ["000000", "1a1a1a", "404040", "808080", "bfbfbf", "e6e6e6", "ffffff",
         "ff3b30", "34c759", "007aff", "ffcc00", "af52de", "0b3d2e", "f2d0c4"]


def hexrgb(h):
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float64) / 255


def middle(img, shape, frac=0.25):
    s = SCALE
    cx, cy = (shape["x"] + shape["w"] / 2) * s, (shape["y"] + shape["h"] / 2) * s
    hw, hh = shape["w"] * s * frac, shape["h"] * s * frac
    patch = img[int(cy - hh):int(cy + hh), int(cx - hw):int(cx + hw)]
    return np.median(patch.reshape(-1, 3), axis=0)


def ring(img, shape, lo, hi):
    """Median colour of pixels lo..hi pt outside the edge (shadow), below the shape (y > centre)."""
    h, w, _ = img.shape
    d, nx, ny, _ = shape_sdf(shape, h, w)
    band = (d >= lo * SCALE) & (d < hi * SCALE) & (ny > 0.7)
    return np.median(img[band], axis=0)


def main():
    out = {"samples": [], "fits": {}}
    for glass in ["regular", "clear"]:
        for scheme in ["light", "dark"]:
            xs, ys = [], []
            for color in FLATS:
                img = load(RAW / f"tint/{glass}-{scheme}-{color}.png")
                bg = hexrgb(color)
                for shape in shapes("shapes-a"):
                    m = middle(img, shape)
                    below = ring(img, shape, 1, 12)
                    out["samples"].append({
                        "glass": glass, "scheme": scheme, "bg": color, "shape": shape["id"],
                        "out": [round(float(v), 4) for v in m], "shadow": [round(float(v), 4) for v in below],
                    })
                    xs.append(bg)
                    ys.append(m)
            xs, ys = np.array(xs), np.array(ys)
            # Affine per channel on the grey samples, then the full 3x4 matrix (captures saturation).
            fit = {}
            grey = np.all(np.abs(xs - xs[:, :1]) < 1e-6, axis=1)
            g = np.polyfit(xs[grey].mean(axis=1), ys[grey].mean(axis=1), 1)
            fit["grey_gain"], fit["grey_offset"] = float(g[0]), float(g[1])
            a = np.hstack([xs, np.ones((len(xs), 1))])
            m, *_ = np.linalg.lstsq(a, ys, rcond=None)
            fit["matrix"] = [[round(float(v), 4) for v in row] for row in m.T]
            fit["rms"] = float(np.sqrt(np.mean((a @ m - ys) ** 2)))
            out["fits"][f"{glass}-{scheme}"] = fit
            print(glass, scheme, json.dumps(fit))
    DATA.mkdir(exist_ok=True)
    (DATA / "tint.json").write_text(json.dumps(out, separators=(",", ":")))


if __name__ == "__main__":
    main()
