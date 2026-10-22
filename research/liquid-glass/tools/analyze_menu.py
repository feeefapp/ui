"""Menu morph from recorded frames: the glass bubble's bounds per frame (largest region that
differs from the flat 808080 background below the nav bar), the label/content ink inside it, then
a damped-spring fit per dimension for opening and closing.

    LG_RAW=<raw> python3 analyze_menu.py <name> [<name> …]   → data/controls-menu.json (merged)

Spring: p(t) = 1 − e^(−ζω(t−t0)) (cos ω_d(t−t0) + ζω/ω_d sin ω_d(t−t0)), ω_d = ω√(1−ζ²);
reported as SwiftUI-style response = 2π/ω and dampingFraction = ζ (plus bounce = 1 − ζ for ζ ≤ 1).
"""
import json
import sys

import numpy as np
from PIL import Image
from scipy import ndimage, optimize

from ctl import DATA, RAW, S

BG = np.array([128.0, 128.0, 128.0])


def measure(name, y_min=112, y_max=840, exclude=None, t_range=(-1, 1e9)):
    d = RAW / "menu" / name
    times = json.loads((d / "times.json").read_text())
    rows = []
    for i, t in enumerate(times, start=1):
        if not t_range[0] <= t <= t_range[1]:
            continue
        img = np.asarray(Image.open(d / f"{i:04d}.png").convert("RGB"), dtype=np.float64)
        diff = np.abs(img - BG).max(axis=2)
        m = diff > 30
        m[: int(y_min * S)] = False
        m[int(y_max * S):] = False
        if exclude:
            x0, y0, x1, y1 = [int(v * S) for v in exclude]
            m[y0:y1, x0:x1] = False
        m = ndimage.binary_opening(m, iterations=2)
        lab, n = ndimage.label(m)
        if n == 0:
            rows.append({"t": t, "x": None})
            continue
        sizes = ndimage.sum(m, lab, range(1, n + 1))
        k = int(np.argmax(sizes)) + 1
        blob = ndimage.binary_fill_holes(lab == k)
        ys, xs = np.nonzero(blob)
        # soft edges: sub-pixel extent along the centre lines
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        inner = ndimage.binary_erosion(blob, iterations=int(3 * S))
        fillc = np.median(img[inner], axis=0) if inner.any() else np.median(img[blob], axis=0)
        lum = img.mean(axis=2)
        if fillc.mean() > 128:
            ink = inner & (lum < fillc.mean() - 90)
        else:
            ink = inner & (lum > fillc.mean() + 90)
        W, H = (x1 - x0), (y1 - y0)
        deficit = max(W * H - blob.sum(), 0)
        r_eq = np.sqrt(deficit / (4 - np.pi)) / S  # circular-corner radius with the same missing area
        lap = np.abs(ndimage.laplace(ndimage.gaussian_filter(lum, 0.7)))
        sharp = float(lap[inner].mean()) if inner.any() else 0.0
        contrast = float(lum[inner].std()) if inner.any() else 0.0
        rows.append({"t": t, "x": x0 / S, "y": y0 / S, "w": W / S, "h": H / S, "area": float(blob.sum()) / S / S,
                     "r_eq": float(r_eq), "r_ratio": float(2 * r_eq / (min(W, H) / S)), "sharp": sharp, "contrast": contrast,
                     "ink": float(ink.sum()) / S / S, "fill": [int(v) for v in fillc]})
    return rows


def spring(t, t0, omega, zeta):
    tt = np.clip(t - t0, 0, None)
    if zeta < 1:
        wd = omega * np.sqrt(1 - zeta * zeta)
        p = 1 - np.exp(-zeta * omega * tt) * (np.cos(wd * tt) + zeta * omega / wd * np.sin(wd * tt))
    else:
        p = 1 - np.exp(-omega * tt) * (1 + omega * tt)
    return np.where(t < t0, 0, p)


def fit_spring(t, p, t0_guess):
    best = None
    for z0 in (0.6, 0.8, 0.95):
        for w0 in (8.0, 12.0, 18.0):
            try:
                popt, _ = optimize.curve_fit(lambda t, a, b, c: spring(t, a, b, min(c, 0.999)), t, p, p0=[t0_guess, w0, z0],
                                             bounds=([t0_guess - 0.1, 1, 0.2], [t0_guess + 0.1, 80, 0.999]), maxfev=20000)
                err = float(np.sqrt(np.mean((spring(t, *popt) - p) ** 2)))
                if best is None or err < best[1]:
                    best = (popt, err)
            except Exception:
                pass
    if best is None:
        return None
    (t0, omega, zeta), err = best
    return {"t0": round(float(t0), 4), "response": round(float(2 * np.pi / omega), 3), "dampingFraction": round(float(zeta), 3),
            "bounce": round(float(1 - zeta), 3), "rms": round(err, 4)}


def segment(rows, start, end):
    """Split the series into transitions: runs where the bubble changes."""
    return [r for r in rows if r["x"] is not None and start <= r["t"] <= end]


def analyse_transition(rows, kind):
    """rows: frames from the last static frame before the change through the settled end."""
    t = np.array([r["t"] for r in rows])
    out = {"kind": kind, "frames": len(rows)}
    a, b = rows[0], rows[-1]
    out["from"] = {k: round(a[k], 2) for k in ("x", "y", "w", "h")}
    out["to"] = {k: round(b[k], 2) for k in ("x", "y", "w", "h")}
    # first frame whose bounds moved by > 1 pt (a touch-down press counts: it starts the morph)
    a0 = rows[0]
    moved = [r for r in rows[1:] if max(abs(r[k] - a0[k]) for k in ("x", "y", "w", "h")) > 1]
    t_start = moved[0]["t"] if moved else rows[1]["t"]
    out["t_first_change"] = round(t_start, 4)
    dims = {}
    for k in ("w", "h", "cx", "cy"):
        if k == "cx":
            v = np.array([r["x"] + r["w"] / 2 for r in rows])
        elif k == "cy":
            v = np.array([r["y"] + r["h"] / 2 for r in rows])
        else:
            v = np.array([r[k] for r in rows])
        v0, v1 = v[0], np.median(v[-3:])
        if abs(v1 - v0) < 2:
            continue
        p = (v - v0) / (v1 - v0)
        over = float(p.max() - 1)
        settle_idx = [i for i in range(len(p)) if np.all(np.abs(v[i:] - v1) <= 0.5)]
        settle = float(t[settle_idx[0]] - t_start) if settle_idx else None
        f = fit_spring(t, p, t_start - 0.008)
        dims[k] = {"from": round(float(v0), 2), "to": round(float(v1), 2), "overshoot": round(over, 3),
                   "overshoot_pt": round(over * abs(v1 - v0), 2), "settle_s": round(settle, 3) if settle is not None else None,
                   "t50_s": round(float(np.interp(0.5, np.maximum.accumulate(p), t) - t_start), 3),
                   "t90_s": round(float(np.interp(0.9, np.maximum.accumulate(p), t) - t_start), 3),
                   "t_peak_s": round(float(t[int(np.argmax(p))] - t_start), 3), "spring": f,
                   "series": [[round(float(ti - t_start), 4), round(float(pi), 4)] for ti, pi in zip(t, p)]}
    out["dims"] = dims
    menu_end = rows[-1] if kind == "open" else rows[0]
    for key in ("sharp", "contrast"):
        v = np.array([r[key] for r in rows]) / max(menu_end[key], 1e-6)
        out[f"{key}_series"] = [[round(float(ti - t_start), 4), round(float(vi), 3)] for ti, vi in zip(t, v)]
        if kind == "open":
            low = int(np.argmin(v))
            hit = [ti - t_start for ti, vi in list(zip(t, v))[low:] if vi >= 0.9]
            out[f"{key}_90_s"] = round(float(hit[0]), 3) if hit else None
        else:
            hit = [ti - t_start for ti, vi in zip(t, v) if vi <= 0.1 and ti >= t_start]
            out[f"{key}_10_s"] = round(float(hit[0]), 3) if hit else None
    out["shape_series"] = [[round(float(r["t"] - t_start), 4), round(r["w"], 2), round(r["h"], 2), round(r["x"], 2), round(r["y"], 2), round(r["r_eq"], 2), round(r["r_ratio"], 3)] for r in rows]
    out["end_r_eq"] = round(rows[-1]["r_eq"], 2)
    return out


def transitions(rows, gap=0.25):
    """Groups consecutive frames whose timestamps are < gap apart; each group = one animation
    (the frame before a group is the static state it started from)."""
    groups, cur = [], []
    for i, r in enumerate(rows):
        if i and r["t"] - rows[i - 1]["t"] > gap:
            if cur:
                groups.append((i - len(cur) - 1, cur))
            cur = []
        cur.append(r)
    if cur:
        groups.append((len(rows) - len(cur) - 1, cur))
    return groups


if __name__ == "__main__":
    out_path = DATA / "controls-menu.json"
    result = json.loads(out_path.read_text()) if out_path.exists() else {}
    for arg in sys.argv[1:]:
        # name[@ymin,ymax]: vertical band to search (pt), e.g. bar menus start inside the nav bar
        # name[@ymin,ymax[,tmin,tmax]][=label]: band (pt) and time window (s) to analyse
        arg, _, label = arg.partition("=")
        name, _, band = arg.partition("@")
        vals = [float(v) for v in band.split(",")] if band else [112, 840]
        y_min, y_max = vals[0], vals[1]
        t_min, t_max = (vals[2], vals[3]) if len(vals) > 2 else (-1, 1e9)
        rows = measure(name, y_min=y_min, y_max=y_max, t_range=(t_min, t_max))
        res = {"frames": [{k: (round(v, 3) if isinstance(v, float) else v) for k, v in r.items()} for r in rows]}
        groups = transitions(rows)
        trans = []
        for before, g in groups:
            if before < 0 or len(g) < 5:
                continue
            seq = [rows[before]] + g
            seq = [r for r in seq if r["x"] is not None]
            area0, area1 = seq[0]["area"], seq[-1]["area"]
            kind = "open" if area1 > area0 * 1.5 else ("close" if area0 > area1 * 1.5 else "other")
            if kind == "other":
                continue
            trans.append(analyse_transition(seq, kind))
        res["transitions"] = trans
        result[label or name] = res
        for tr in trans:
            print(label or name, tr["kind"], "from", tr["from"], "to", tr["to"], "r_eq_end", tr["end_r_eq"],
                  {k: tr.get(k) for k in ("sharp_90_s", "contrast_90_s", "sharp_10_s", "contrast_10_s")})
            for k, dd in tr["dims"].items():
                print(f"   {k:3} over {dd['overshoot']:6.3f} ({dd['overshoot_pt']:5.2f}pt) settle {dd['settle_s']} t50 {dd['t50_s']} t90 {dd['t90_s']} peak {dd['t_peak_s']} spring {dd['spring']}")
    out_path.write_text(json.dumps(result, indent=1))


def static(name):
    """Final menu metrics from a settled screenshot (captures/<name>.png)."""
    from analyze_controls import font_of
    from analyze_shapes import shapes
    from ctl import load
    img, _ = load(name)
    menu = [s for s in shapes(img, BG, min_pt=100, thr=30, region=(112, 840))][0]
    fill = np.median(img[int((menu["y"] + 6) * S):int((menu["y"] + 10) * S), int((menu["x"] + 60) * S):int((menu["x"] + menu["w"] - 60) * S)].reshape(-1, 3), axis=0)
    out = {k: menu[k] for k in ("x", "y", "width", "height", "radius", "radius_area", "rms_px")}
    out["fill"] = [int(v) for v in fill]
    x0, y0 = int(menu["x"] * S), int(menu["y"] * S)
    crop = img[y0:y0 + int(menu["h"] * S), x0:x0 + int(menu["w"] * S)]
    dist = np.linalg.norm(crop - fill, axis=2)
    inner = np.zeros_like(dist, dtype=bool)
    m = int(14 * S)
    inner[m:-m, m:-m] = True
    ink = (dist > 80) & inner
    cols = np.nonzero(ink.any(axis=0))[0]
    # icon column vs text column: first gap ≥ 6 pt in the column projection
    gaps = np.nonzero(np.diff(cols) > 6 * S)[0]
    icon_x0 = cols[0] / S
    text_x0 = cols[gaps[0] + 1] / S if len(gaps) else None
    out["icon_ink_x"] = round(icon_x0, 2)
    out["text_ink_x"] = round(text_x0, 2) if text_x0 else None
    out["text_ink_right_max"] = round(cols[-1] / S, 2)
    # text lines (text column only)
    tc = ink[:, int(text_x0 * S):] if text_x0 else ink
    rows_on = np.nonzero(tc.any(axis=1))[0]
    lines = np.split(rows_on, np.nonzero(np.diff(rows_on) > 2)[0] + 1)
    lines = [l for l in lines if len(l) >= 3 * S]
    centres = [round((l.min() + l.max() + 1) / 2 / S, 2) for l in lines]
    out["text_line_centres"] = centres
    out["line_pitch"] = [round(b - a, 2) for a, b in zip(centres, centres[1:])]
    # separators: faint full-width lines in the text column area that are not text
    sep_rows = []
    for yy in range(int(6 * S), crop.shape[0] - int(6 * S)):
        row = dist[yy, int(30 * S):int((menu["w"] - 30) * S)]
        if (row > 4).mean() > 0.95 and (row < 60).all():
            sep_rows.append(yy)
    if sep_rows:
        g = np.split(np.array(sep_rows), np.nonzero(np.diff(sep_rows) > 1)[0] + 1)
        seps = []
        for grp in g:
            yy = int(grp.mean())
            on = np.nonzero(dist[yy] > 4)[0]
            on = on[(on > 6 * S) & (on < crop.shape[1] - 6 * S)]
            seps.append({"y": round(grp.mean() / S + 0.5 / S, 2), "thickness_px": int(len(grp)), "x0": round(on.min() / S, 2), "x1": round(on.max() / S + 1 / S, 2),
                         "rgb": [int(v) for v in crop[yy, (on.min() + on.max()) // 2]]})
        out["separators"] = seps
    first = lines[0]
    out["first_text"] = font_of(img, (menu["x"] + text_x0 - 2, menu["y"] + first.min() / S - 3, menu["x"] + text_x0 + 60, menu["y"] + (first.max() + 1) / S + 3), fill)
    out["top_to_first_centre"] = centres[0]
    out["last_centre_to_bottom"] = round(menu["h"] - centres[-1], 2)
    return out
