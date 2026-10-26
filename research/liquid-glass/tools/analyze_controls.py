"""Static control metrics from CtlLab captures → data/controls.json.

    LG_RAW=<raw> python3 analyze_controls.py

Segmented picker, switch, slider, rounded-border text field, toolbar / bottom bar items, search
fields, inset-grouped list, alerts. Shapes are found against flat backgrounds we control
(analyze_shapes.shapes); text sizes come from cap heights (SF cap height = 0.706 × point size,
measured on the reference Text in the `type` capture).
"""
import numpy as np
from scipy import ndimage

from analyze_shapes import shapes
from ctl import S, fit_corner, load, save

CAP = 0.706  # cap height / font size (reference Text, all sizes 11-22)


def sel(d, *keys):
    return {k: d[k] for k in keys if k in d}


def cap_size(img, region, fill, thr=0.5):
    """Leftmost ink glyph's height inside region (x0,y0,x1,y1 pt) → (cap pt, font pt)."""
    x0, y0, x1, y1 = [int(v * S) for v in region]
    crop = img[y0:y1, x0:x1]
    dist = np.linalg.norm(crop - np.asarray(fill, dtype=float), axis=2)
    ink = dist > thr * dist.max()
    lab, n = ndimage.label(ink)
    if n == 0:
        return None
    objs = ndimage.find_objects(lab)
    objs = [o for o in objs if (o[0].stop - o[0].start) > 3 * S]
    if not objs:
        return None
    o = min(objs, key=lambda o: o[1].start)
    h = (o[0].stop - o[0].start) / S
    return {"cap_pt": round(h, 2), "font_pt": round(h / CAP, 1), "ink_x": round((x0 + o[1].start) / S, 2), "ink_y": round((y0 + o[0].start) / S, 2)}


_REFS = None


def font_of(img, region, fill):
    """The 'HxH' label inside region (pt): ink bbox matched against the reference Text
    (size × weight, analyze_buttons.reference_fonts). → {font, next, cap_pt, ink_x, ink_w}."""
    global _REFS
    from analyze_buttons import ink_features, match_font, reference_fonts
    if _REFS is None:
        _REFS = reference_fonts()[0]
    x0, y0, x1, y1 = [int(round(v * S)) for v in region]
    crop = img[y0:y1, x0:x1]
    dist = np.linalg.norm(crop - np.asarray(fill, dtype=float), axis=2)
    peak = np.percentile(dist, 99.7)
    ink = np.clip(dist / max(peak, 1), 0, 1)
    if (ink > 0.5).sum() < 10:
        return None
    f = ink_features(ink)
    m = match_font(f, _REFS)
    ys, xs = np.nonzero(ink > 0.5)
    return {"font": f"{m[0][2]} {m[0][1]}", "next": f"{m[1][2]} {m[1][1]}", "cap_pt": round(f["h"] / S, 2),
            "ink_x": round((x0 + xs.min()) / S, 2), "ink_y": round((y0 + ys.min()) / S, 2), "ink_w": round(f["w"] / S, 2),
            "ink_rgb": [int(v) for v in crop[dist >= peak * 0.97].mean(axis=0)]}


def segmented(scheme):
    out = {}
    track_bg = "ffffff" if scheme == "light" else "000000"
    img, fr = load(f"controls-{scheme}-{track_bg}")
    bg = [255] * 3 if track_bg == "ffffff" else [0] * 3
    for key, reg in [("segmented", (130, 180)), ("segmented-large", (470, 535))]:
        t = shapes(img, bg, min_pt=20, thr=6, region=reg)[0]
        out[key] = {"frame": fr[key], "track": sel(t, "x", "y", "width", "height", "radius", "rms_px", "fill")}
    img, fr = load(f"controls-{scheme}")
    for key, reg in [("segmented", (130, 180)), ("segmented-large", (470, 535))]:
        th = [s for s in shapes(img, [128] * 3, min_pt=20, thr=12, region=reg)][0]
        out[key]["thumb"] = sel(th, "x", "y", "width", "height", "radius", "rms_px", "fill")
        tr = out[key]["track"]
        out[key]["thumb_inset"] = round(th["y"] - tr["y"], 2)
        out[key]["thumb_inset_x"] = round(th["x"] - tr["x"], 2)
        r = th["height"] / 2
        out[key]["label"] = font_of(img, (th["x"] + r, th["y"] + 3, th["x"] + th["width"] - r, th["y"] + th["height"] - 3), th["fill"])
    return out


def switch(scheme):
    img, fr = load(f"controls-{scheme}-000000")
    found = shapes(img, [0] * 3, min_pt=10, thr=6, region=(200, 245))
    on = [s for s in found if s["x"] < 120][0]
    # on track: green, thumb is white inside it: measure the white blob separately
    x0, y0 = int(on["x"] * S), int(on["y"] * S)
    crop = img[y0:y0 + int(on["h"] * S), x0:x0 + int(on["w"] * S)]
    white = crop.min(axis=2) > 245
    lab, _ = ndimage.label(white)
    o = max(ndimage.find_objects(lab), key=lambda o: (o[0].stop - o[0].start) * (o[1].stop - o[1].start))
    thumb_on = {"x": round((x0 + o[1].start) / S, 2), "y": round((y0 + o[0].start) / S, 2),
                "w": round((o[1].stop - o[1].start) / S, 2), "h": round((o[0].stop - o[0].start) / S, 2)}
    img2, _ = load(f"controls-{scheme}-ffffff" if scheme == "light" else f"controls-{scheme}")
    off_track = [s for s in shapes(img2, [255] * 3 if scheme == "light" else [128] * 3, min_pt=10, thr=6, region=(200, 245)) if s["x"] > 120]
    off_thumb = [s for s in found if s["x"] > 120][0]
    return {"frame_on": fr["toggle-on"], "frame_off": fr["toggle-off"],
            "track_on": sel(on, "x", "y", "w", "h", "width", "height", "radius", "rms_px", "fill"),
            "thumb_on": thumb_on,
            "track_off": sel(off_track[0], "x", "y", "w", "h", "radius", "fill") if off_track else None,
            "thumb_off": sel(off_thumb, "x", "y", "width", "height", "radius", "rms_px")}


def slider(scheme):
    img, fr = load(f"controls-{scheme}")
    f = fr["slider"]
    out = {"frame": f}
    # track thickness: coverage profile down a column of the filled (blue) and empty parts
    for name, x in [("filled", f[0] + 20), ("empty", f[0] + f[2] - 20)]:
        col = img[int(f[1] * S):int((f[1] + f[3]) * S), int(x * S)]
        bg = np.array([128.0] * 3)
        mid = col[len(col) // 2]
        span = np.linalg.norm(mid - bg)
        cov = np.clip(np.linalg.norm(col - bg, axis=1) / max(span, 1), 0, 1)
        out[f"track_{name}"] = {"thickness": round(cov.sum() / S, 2), "centre_y": round(f[1] + (np.arange(len(cov)) + 0.5) @ cov / cov.sum() / S, 2),
                                "rgb": [int(v) for v in mid]}
    # thumb = white blob
    x0, y0 = int(f[0] * S), int((f[1] - 10) * S)
    crop = img[y0:int((f[1] + f[3] + 10) * S), x0:int((f[0] + f[2]) * S)]
    white = crop.min(axis=2) > 235 if scheme == "light" else crop.min(axis=2) > 235
    lab, n = ndimage.label(white)
    if n:
        o = max(ndimage.find_objects(lab), key=lambda o: (o[0].stop - o[0].start) * (o[1].stop - o[1].start))
        sub = crop[o[0].start - 6:o[0].stop + 6, o[1].start - 6:o[1].stop + 6]
        cov = np.clip(np.linalg.norm(sub - np.array([128.0] * 3), axis=2) / np.linalg.norm(np.array([255.0] * 3) - 128), 0, 1)
        # blank out the track rows (they would widen the thumb's middle rows)
        fit = fit_corner(np.where(white[o[0].start - 6:o[0].stop + 6, o[1].start - 6:o[1].stop + 6] | (cov > 0.98), cov, cov * (cov > 0.5)))
        out["thumb"] = {"w": round((o[1].stop - o[1].start) / S, 2), "h": round((o[0].stop - o[0].start) / S, 2), **sel(fit, "radius", "rms_px")}
    return out


def textfield(scheme):
    img, fr = load(f"controls-{scheme}-000000" if scheme == "light" else f"controls-{scheme}-ffffff")
    bg = [0] * 3 if scheme == "light" else [255] * 3
    s = [s for s in shapes(img, bg, min_pt=20, thr=6, region=(330, 380))][0]
    f = fr["textfield"]
    # border: colour just inside the edge vs the fill
    y = int((f[1] + f[3] / 2) * S)
    row = img[y, int(f[0] * S):int(f[0] * S) + 9]
    ph = cap_size(img, (f[0] + 2, f[1] + 2, f[0] + 120, f[1] + f[3] - 2), s["fill"])
    return {"frame": f, **sel(s, "x", "y", "width", "height", "radius", "radius_area", "rms_px", "fill"),
            "edge_pixels_rgb": [[int(c) for c in p] for p in row[:4]], "placeholder": ph}


def bars(scheme, name):
    img, _ = load(f"{name}-{scheme}")
    found = shapes(img, [128] * 3, min_pt=20, thr=12, region=(50, 874))
    return [sel(s, "x", "y", "width", "height", "radius", "rms_px", "fill") for s in found]


def list_metrics(scheme):
    img, _ = load(f"list-{scheme}")
    bg = img[int(400 * S), int(5 * S)]
    cards = [s for s in shapes(img, bg, min_pt=30, thr=3, region=(90, 874))]
    out = {"background": [int(v) for v in bg], "cards": []}
    for c in cards:
        card = sel(c, "x", "y", "width", "height", "radius", "radius_area", "rms_px", "fill")
        # separators: rows that differ from the cell fill along a column near the trailing edge
        x = c["x"] + c["width"] - 30
        col = img[int(c["y"] * S):int((c["y"] + c["height"]) * S), int(x * S)]
        d = np.abs(col - np.asarray(c["fill"], dtype=float)).max(axis=1)
        lines = np.nonzero(d > 4)[0]
        groups = np.split(lines, np.nonzero(np.diff(lines) > 1)[0] + 1) if len(lines) else []
        seps = [round(c["y"] + (g.mean() + 0.5) / S, 2) for g in groups if 0 < len(g) <= 3 and 6 * S < g.mean() < (c["height"] - 6) * S]
        edges = [c["y"]] + seps + [c["y"] + c["height"]]
        card["separators_y"] = seps
        card["row_heights"] = [round(b - a, 2) for a, b in zip(edges, edges[1:])]
        if seps:
            y = int(seps[0] * S)
            r = img[y, int(c["x"] * S):int((c["x"] + c["width"]) * S)]
            on = np.nonzero(np.abs(r - np.asarray(c["fill"], dtype=float)).max(axis=1) > 4)[0]
            if len(on):
                card["separator_x"] = [round(c["x"] + on.min() / S, 2), round(c["x"] + (on.max() + 1) / S, 2)]
                card["separator_rgb"] = [int(v) for v in r[on[len(on) // 2]]]
        card["first_text"] = font_of(img, (c["x"] + 8, c["y"] + 4, c["x"] + 120, c["y"] + card["row_heights"][0] - 4), c["fill"])
        out["cards"].append(card)
    hdr = font_of(img, (16, 60, 200, out["cards"][0]["y"] - 2), bg) if out["cards"] else None
    out["header"] = hdr
    return out


def alert(scheme, n):
    img, _ = load(f"alert{n}-{scheme}")
    dim = img[int(800 * S), int(10 * S)]
    a = [s for s in shapes(img, dim, min_pt=100, thr=12, region=(100, 800))][0]
    fill = img[int((a["y"] + 14) * S), int((a["x"] + a["width"] - 24) * S)]
    out = {"dimmed_bg": [int(v) for v in dim], **sel(a, "x", "y", "width", "height", "radius", "radius_area", "rms_px"),
           "fill": [int(v) for v in fill]}
    # look for buttons only inside the alert (outside → painted with the alert fill)
    inner = img.copy()
    xa, xb = int((a["x"] + 8) * S), int((a["x"] + a["width"] - 8) * S)
    inner[:, :xa] = fill
    inner[:, xb:] = fill
    found = shapes(inner, fill, min_pt=20, thr=8, region=(a["y"] + 8, a["y"] + a["height"] - 4))
    buttons = [b for b in found if b["w"] > 60]
    out["buttons"] = [sel(b, "x", "y", "width", "height", "radius", "rms_px", "fill") for b in buttons]
    if buttons:
        b0 = buttons[0]
        top = min(b["y"] for b in buttons)
        out["button_inset_x"] = round(b0["x"] - a["x"], 2)
        out["button_inset_bottom"] = round(a["y"] + a["height"] - max(b["y"] + b["height"] for b in buttons), 2)
        xs = sorted(buttons, key=lambda b: (b["y"], b["x"]))
        out["button_gaps"] = [round(q["x"] - (p["x"] + p["width"]), 2) if abs(p["y"] - q["y"]) < 1 else round(q["y"] - (p["y"] + p["height"]), 2)
                              for p, q in zip(xs, xs[1:])]
        # title = first ink line, message = second (both 'HxH')
        x0, x1 = a["x"] + 12, a["x"] + a["width"] / 2
        crop = img[int((a["y"] + 6) * S):int((top - 2) * S), int(x0 * S):int(x1 * S)]
        rows = (np.linalg.norm(crop - fill, axis=2) > 60).any(axis=1)
        idx = np.nonzero(rows)[0]
        lines = np.split(idx, np.nonzero(np.diff(idx) > 2)[0] + 1) if len(idx) else []
        texts = []
        for g in lines:
            if len(g) < 4 * S:
                continue
            ya = a["y"] + 6 + g.min() / S - 2
            yb = a["y"] + 6 + (g.max() + 1) / S + 2
            texts.append(font_of(img, (x0, ya, x1, yb), fill))
        out["title"] = texts[0] if texts else None
        out["message"] = texts[1] if len(texts) > 1 else None
        if out["title"]:
            out["title_inset_x"] = round(out["title"]["ink_x"] - a["x"], 2)
            out["title_ink_top_inset"] = round(out["title"]["ink_y"] - a["y"], 2)
        hxh = [b for b in buttons if b is not None]
        # the 'HxH' button is the default action: last in a row, first non-cancel when stacked
        target = xs[-1] if n == 2 else (xs[1] if n == 3 else xs[0])
        r = target["height"] / 2
        out["button_label"] = font_of(img, (target["x"] + r, target["y"] + 4, target["x"] + target["width"] - r, target["y"] + target["height"] - 4), target["fill"])
        out["title_to_buttons"] = round(top - (out["message"]["ink_y"] + out["message"]["cap_pt"]), 2) if out.get("message") else None
    return out


if __name__ == "__main__":
    import json
    res = {"uikit": json.loads((__import__("ctl").RAW / "uikit.json").read_text())["uikit"]}
    for scheme in ["light", "dark"]:
        res[scheme] = {
            "segmented": segmented(scheme),
            "switch": switch(scheme),
            "slider": slider(scheme),
            "textfield": textfield(scheme),
            "toolbar": bars(scheme, "toolbar"),
            "search_bottom": bars(scheme, "search"),
            "search_nav_drawer": bars(scheme, "search-nav"),
            "list": list_metrics(scheme),
            "alert": {f"{n}_buttons": alert(scheme, n) for n in [1, 2, 3]},
        }
    save("controls.json", res)
    print(json.dumps(res["light"], indent=1, default=str)[:20000])
