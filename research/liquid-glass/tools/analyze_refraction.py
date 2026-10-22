"""Decodes the fringe captures into displacement fields and reduces them to per-shape profiles:
for every depth inside the edge (pt), the median shift along the inward normal and across it,
the fringe modulation (blur + contrast) and the mean level (fill). Writes data/refraction.json."""
import json

import numpy as np

from lg import DATA, PERIODS, SCALE, fringe_set, shape_sdf, shapes

STEP = 0.5  # pt per profile bin


def profiles(glass, scheme, layout, reference):
    cx, mx = fringe_set(glass, scheme, layout, "x")
    cy, my = fringe_set(glass, scheme, layout, "y")
    h, w = cx.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float64)
    dx, dy = cx - xx, cy - yy
    result = {}
    for shape in shapes(layout):
        d, nx, ny, r = shape_sdf(shape, h, w)
        half = min(shape["w"], shape["h"]) / 2
        # Inward shift (positive = the pixel shows content from deeper inside the shape).
        inward = -(dx * nx + dy * ny)
        across = dx * -ny + dy * nx
        rows = []
        depth_pt = -d / SCALE
        for lo in np.arange(-2, min(half, 32), STEP):
            band = (depth_pt >= lo) & (depth_pt < lo + STEP)
            # Keep away from rounded corners on rects so the normal is well defined.
            if shape["kind"] == "rect":
                s = SCALE
                inside_x = (xx > shape["x"] * s + r) & (xx < (shape["x"] + shape["w"]) * s - r)
                inside_y = (yy > shape["y"] * s + r) & (yy < (shape["y"] + shape["h"]) * s - r)
                band &= inside_x | inside_y
            if band.sum() < 8:
                continue
            row = {
                "depth": round(float(lo + STEP / 2), 2),
                "inward": round(float(np.median(inward[band])) / SCALE, 2),
                "across": round(float(np.median(across[band])) / SCALE, 2),
            }
            # The 768 px fringe is wider than small glass, whose adaptive tint then changes between
            # phase steps: only the two short periods are kept.
            for period in PERIODS[1:]:
                mod = (mx[period]["mod"] + my[period]["mod"]) / 2
                ref = reference[period]
                row[f"mod{period}"] = round(float(np.median(mod[band] / ref[band])), 3)
            row["mean"] = round(float(np.median((mx[192]["mean"] + my[192]["mean"])[band] / 2)), 4)
            rows.append(row)
        result[shape["id"]] = {"shape": shape, "rows": rows}
    return result


def main():
    # Reference modulation without glass (the pattern as captured), per period.
    _, rx = fringe_set("none", "light", "shapes-a", "x")
    _, ry = fringe_set("none", "light", "shapes-a", "y")
    reference = {p: (rx[p]["mod"] + ry[p]["mod"]) / 2 for p in PERIODS}
    # Sanity: decoding the bare pattern must give zero displacement.
    cx, _ = fringe_set("none", "light", "shapes-a", "x")
    err = np.abs(cx - np.mgrid[0:cx.shape[0], 0:cx.shape[1]][1])
    out = {"identity_error_px": {"median": float(np.median(err)), "p99": float(np.percentile(err, 99))},
           "reference_mod": {str(p): float(np.median(reference[p])) for p in PERIODS}, "sets": {}}
    for glass, scheme in [("regular", "light"), ("regular", "dark"), ("clear", "light")]:
        for layout in ["shapes-a", "shapes-b"]:
            out["sets"][f"{glass}-{scheme}-{layout}"] = profiles(glass, scheme, layout, reference)
            print("done", glass, scheme, layout, flush=True)
    DATA.mkdir(exist_ok=True)
    (DATA / "refraction.json").write_text(json.dumps(out, separators=(",", ":")))


if __name__ == "__main__":
    main()
