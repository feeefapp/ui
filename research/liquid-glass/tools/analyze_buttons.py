"""Buttons per style × control size: visible shape (height, width, corner), label font (ink
matched against reference Text at known sizes/weights), horizontal padding, icon sizes.

    LG_RAW=<raw> python3 analyze_buttons.py      → data/controls-buttons.json
"""
import numpy as np
from scipy import ndimage

from ctl import S, box, edges, fit_corner, load, save

STYLES = ["glass", "glassProminent", "borderedProminent", "bordered"]
SIZES = ["mini", "small", "regular", "large", "extraLarge"]
WEIGHTS = ["regular", "medium", "semibold", "bold"]
TSIZES = [11, 12, 13, 14, 15, 16, 17, 18, 20, 22]


def ink_features(ink):
    """ink: 0..1 coverage crop of one glyph run. → cap height px, width px, area px²."""
    m = ink > 0.5
    ys, xs = np.nonzero(m)
    return {"h": float(ys.max() - ys.min() + 1), "w": float(xs.max() - xs.min() + 1), "area": float(ink.sum())}


def reference_fonts():
    img, frames = load("type-light")
    out = {}
    for w in WEIGHTS:
        for s in TSIZES:
            x0, y0, x1, y1 = box(frames[f"t-{w}-{s}"])
            crop = img[y0:y1, x0:x1]
            ink = np.clip((255 - crop.mean(axis=2)) / 255, 0, 1)
            f = ink_features(ink)
            f["layout_w"] = frames[f"t-{w}-{s}"][2]
            f["layout_h"] = frames[f"t-{w}-{s}"][3]
            out[(w, s)] = f
    syms = {}
    for s in [13, 15, 17, 20, 22]:
        x0, y0, x1, y1 = box(frames[f"sym-{s}"])
        crop = img[y0:y1, x0:x1]
        ink = np.clip((255 - crop.mean(axis=2)) / 255, 0, 1)
        f = ink_features(ink)
        syms[s] = {"glyph_pt": round(f["w"] / S, 2), "layout": frames[f"sym-{s}"][2:]}
    return out, syms


def match_font(f, refs):
    best = []
    for (w, s), r in refs.items():
        e = ((f["w"] - r["w"]) / r["w"]) ** 2 + ((f["area"] - r["area"]) / r["area"]) ** 2 + ((f["h"] - r["h"]) / r["h"]) ** 2
        best.append((e, w, s))
    best.sort()
    return best[:2]


def blobs_by_column(ink):
    """Split ink into runs separated by empty columns ≥ 2 pt."""
    cols = (ink > 0.5).any(axis=0)
    runs, start, gap = [], None, 0
    for x, on in enumerate(cols):
        if on:
            if start is None:
                start = x
            gap = 0
            end = x
        elif start is not None:
            gap += 1
            if gap >= 3.5 * S:
                runs.append((start, end + 1))
                start = None
    if start is not None:
        runs.append((start, end + 1))
    return runs


def analyse(style, scheme, refs):
    img, frames = load(f"buttons-{style}-{scheme}")
    blank, _ = load(f"blank-{scheme}")
    out = {}
    for size in SIZES:
        for kind in ["text", "label", "icon"]:
            key = f"{size}-{kind}"
            fr = frames[key]
            x0, y0, x1, y1 = box(fr, pad=8)
            crop = img[y0:y1, x0:x1]
            bg = blank[y0:y1, x0:x1]
            # fill sampled 3-4.5 pt below the frame top, across the middle half
            fx0, fy0, fx1, fy1 = box([fr[0] + fr[2] * 0.3, fr[1] + 3, fr[2] * 0.4, 1.5])
            fill = np.median(img[fy0:fy1, fx0:fx1].reshape(-1, 3), axis=0)
            bgc = np.median(bg.reshape(-1, 3), axis=0)
            span = np.linalg.norm(fill - bgc)
            cov = np.clip(np.linalg.norm(crop - bgc, axis=2) / span, 0, 1)
            # keep the component under the frame centre (drops neighbours/shadow specks)
            lab, _ = ndimage.label(cov > 0.5)
            c = lab[cov.shape[0] // 2, cov.shape[1] // 2]
            if c == 0:
                c = np.bincount(lab.ravel())[1:].argmax() + 1
            keep = ndimage.binary_dilation(lab == c, iterations=4)
            cov = np.where(keep, cov, 0)
            shape = fit_corner(cov)
            # where the shape sits relative to the reported frame
            L, R = edges(cov)
            T, B = edges(cov.T)
            vis_x = (np.nanmin(L) / S) + (x0 / S)
            vis_y = (np.nanmin(T) / S) + (y0 / S)
            shape["dx_vs_frame"] = round(vis_x - fr[0], 2)
            shape["dy_vs_frame"] = round(vis_y - fr[1], 2)
            shape["frame"] = fr
            shape["fill_rgb"] = [int(v) for v in fill]
            # label ink: distance from the fill, inside the shape (eroded by 2 pt)
            inner = ndimage.binary_erosion(ndimage.binary_fill_holes(cov > 0.5), iterations=int(2 * S))
            dist = np.linalg.norm(crop - fill, axis=2) * inner
            peak = np.percentile(dist[dist > 0], 99.5) if (dist > 0).any() else 1
            ink = np.clip(dist / max(peak, 1), 0, 1)
            shape["ink_rgb"] = [int(v) for v in crop[dist >= peak * 0.98].mean(axis=0)] if (dist >= peak * 0.98).any() else None
            runs = blobs_by_column(ink)
            parts = []
            for a, b in runs:
                f = ink_features(ink[:, a:b])
                ys = np.nonzero((ink[:, a:b] > 0.5).any(axis=1))[0]
                parts.append({"x": round((x0 + a) / S, 2), "w": round(f["w"] / S, 2), "h": round(f["h"] / S, 2),
                              "y_mid": round((y0 + (ys.min() + ys.max() + 1) / 2) / S, 2), "f": f})
            shape["ink"] = [{k: v for k, v in p.items() if k != "f"} for p in parts]
            if kind in ("text", "label") and parts:
                text = parts[-1]
                m = match_font(text["f"], refs)
                shape["font"] = f"{m[0][2]} {m[0][1]}"
                shape["font_next"] = f"{m[1][2]} {m[1][1]}"
                lw = refs[(m[0][1], m[0][2])]["layout_w"]
                if kind == "text":
                    shape["padding_x"] = round((shape["width"] - lw) / 2, 2)
                    shape["padding_x_ink"] = round(text["x"] - (vis_x), 2)
                else:
                    icon = parts[0]
                    shape["icon_glyph"] = [icon["w"], icon["h"]]
                    shape["icon_text_gap_ink"] = round(text["x"] - (icon["x"] + icon["w"]), 2)
                    shape["leading_ink"] = round(icon["x"] - vis_x, 2)
                    shape["trailing_ink"] = round(vis_x + shape["width"] - (text["x"] + text["w"]), 2)
            if kind == "icon" and parts:
                shape["icon_glyph"] = [parts[0]["w"], parts[0]["h"]]
                shape["leading_ink"] = round(parts[0]["x"] - vis_x, 2)
            shape["capsule"] = abs(shape["radius"] - shape["height"] / 2) <= 0.5
            out[key] = shape
    return out


if __name__ == "__main__":
    refs, syms = reference_fonts()
    result = {"reference_symbols": syms,
              "reference_text": {f"{s} {w}": {"cap_pt": round(r["h"] / S, 2), "ink_w_pt": round(r["w"] / S, 2), "layout_w": r["layout_w"], "layout_h": r["layout_h"]}
                                 for (w, s), r in refs.items()}}
    for style in STYLES:
        for scheme in ["light", "dark"]:
            result[f"{style}-{scheme}"] = analyse(style, scheme, refs)
    save("controls-buttons.json", result)
    for style in STYLES:
        print(f"== {style} (light | dark h)")
        L, D = result[f"{style}-light"], result[f"{style}-dark"]
        for size in SIZES:
            for kind in ["text", "label", "icon"]:
                k = f"{size}-{kind}"
                a, b = L[k], D[k]
                print(f"  {k:18} w {a['width']:6.2f} h {a['height']:6.2f}|{b['height']:6.2f} r {a['radius']:5.2f} rA {a['radius_area']:5.2f} rms {a['rms_px']:4.2f} "
                      f"cap {a['capsule']!s:5} font {a.get('font','-'):13} ({a.get('font_next','-')}) padX {a.get('padding_x','-')} "
                      f"icon {a.get('icon_glyph','-')} gap {a.get('icon_text_gap_ink','-')} lead {a.get('leading_ink','-')} trail {a.get('trailing_ink','-')} "
                      f"d {a['dx_vs_frame']},{a['dy_vs_frame']} fr {a['frame'][2]}x{a['frame'][3]}")
