"""Blur: binary noise behind the glass. In each shape's flat middle (outside the bezel), the ratio of
the glass capture's amplitude spectrum to the bare noise's is the material's transfer function
gain * exp(-2 pi^2 sigma^2 f^2) for a Gaussian of standard deviation sigma. Fits gain and sigma
per shape (radially averaged spectrum, low frequencies only). Writes data/blur.json."""
import json

import numpy as np

from lg import DATA, RAW, SCALE, load, shapes


def patch(img, shape, size):
    s = SCALE
    cx, cy = int((shape["x"] + shape["w"] / 2) * s), int((shape["y"] + shape["h"] / 2) * s)
    return img[cy - size // 2:cy + size // 2, cx - size // 2:cx + size // 2]


def spectrum(p):
    w = np.outer(np.hanning(p.shape[0]), np.hanning(p.shape[1]))
    return np.abs(np.fft.fftshift(np.fft.fft2((p - p.mean()) * w)))


def radial(a):
    n = a.shape[0]
    yy, xx = np.mgrid[0:n, 0:n] - n // 2
    r = np.hypot(xx, yy).astype(int)
    return np.bincount(r.ravel(), a.ravel()) / np.maximum(np.bincount(r.ravel()), 1)


def main():
    out = {}
    for layout in ["shapes-a", "shapes-b"]:
        bare = load(RAW / f"noise/none-{layout}.png", gray=True)
        for glass in ["regular", "clear"]:
            img = load(RAW / f"noise/{glass}-{layout}.png", gray=True)
            for shape in shapes(layout):
                # Flat middle: a square well inside the bezel (bezel ~18pt).
                inner = min(shape["w"], shape["h"]) - 2 * 20
                size = int(min(inner * SCALE, 256)) // 2 * 2
                if size < 24:
                    inner = min(shape["w"], shape["h"]) * 0.5
                    size = int(inner * SCALE) // 2 * 2
                g = radial(spectrum(patch(img, shape, size)))
                b = radial(spectrum(patch(bare, shape, size)))
                f = np.arange(len(g)) / size  # cycles per px
                ratio = g / np.maximum(b, 1e-9)
                sel = (f > 1.5 / size) & (f < (0.06 if glass == "clear" else 0.022))
                y = np.log(np.maximum(ratio[sel], 1e-6))
                # ln ratio = ln gain - 2 pi^2 sigma^2 f^2
                A = np.vstack([np.ones(sel.sum()), -2 * np.pi ** 2 * f[sel] ** 2]).T
                (lg, s2), *_ = np.linalg.lstsq(A, y, rcond=None)
                sigma = float(np.sqrt(max(s2, 0)))
                out[f"{glass}/{shape['id']}"] = {
                    "gain": round(float(np.exp(lg)), 4),
                    "sigma_px": round(sigma, 2),
                    "sigma_pt": round(sigma / SCALE, 2),
                    "patch_pt": round(size / SCALE, 1),
                    "height_pt": shape["h"],
                    "min_side_pt": min(shape["w"], shape["h"]),
                }
                print(glass, shape["id"], out[f"{glass}/{shape['id']}"])
    DATA.mkdir(exist_ok=True)
    (DATA / "blur.json").write_text(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
