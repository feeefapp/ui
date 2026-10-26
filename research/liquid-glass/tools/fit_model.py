"""Fits our glass model to the measurements in data/*.json and writes data/model.json (the numbers
the kit uses) plus data/model-fit.png (measured vs model). Units: pt = CSS px = Flutter logical px.

Run the analyze_*.py scripts first (they need the raw captures); this one only reads data/."""
import json
import math

import numpy as np
from scipy.optimize import curve_fit, least_squares
from scipy.stats import norm

from lg import DATA

POWER = 4
LARGE = 88  # min side (pt) from which glass behaves as "large"
SMALL_MAX = 72  # glass up to this min side uses the small (control) material


def refraction():
    d = json.loads((DATA / "refraction.json").read_text())
    large, small = [], []
    for key, shapes in d["sets"].items():
        if not key.startswith("regular"):
            continue
        for sid, s in shapes.items():
            m = min(s["shape"]["w"], s["shape"]["h"])
            t = np.array([r["depth"] for r in s["rows"]])
            u = np.array([r["inward"] for r in s["rows"]])
            sel = (t > 0.4) & (t < 30)
            (large if m >= LARGE else small).append((m, t[sel], u[sel], key, sid))
    f = lambda t, a, b: a * np.clip(1 - t / b, 0, None) ** POWER
    fits = [curve_fit(f, t, u, p0=[45, 28])[0] for _, t, u, _, _ in large]
    a, b = np.median([p[0] for p in fits]), np.median([p[1] for p in fits])
    scales = []
    for m, t, u, key, sid in small:
        g = lambda t, k: k * a * np.clip(1 - t / (k * b), 0, None) ** POWER
        (k,), _ = curve_fit(g, t, u, p0=[0.7])
        scales.append((m, k, key, sid))
    ms = np.array([s[0] for s in scales])
    ks = np.array([s[1] for s in scales])
    # b = min(1, m / LARGE) ** e, fitted in log space.
    e = float(np.sum(np.log(ks) * np.log(ms / LARGE)) / np.sum(np.log(ms / LARGE) ** 2))
    return {"edge_shift": round(float(a), 1), "bezel": round(float(b), 1), "power": POWER,
            "size_ref": LARGE, "size_exponent": round(e, 2),
            "scales": [{"min_side": float(m), "scale": round(float(k), 3), "set": key, "shape": sid} for m, k, key, sid in scales]}, large, small


def blur(tint_fits):
    d = json.loads((DATA / "refraction.json").read_text())
    rows = []
    for key, shapes in d["sets"].items():
        if not key.startswith("regular"):
            continue
        scheme = key.split("-")[1]
        for sid, s in shapes.items():
            m = min(s["shape"]["w"], s["shape"]["h"])
            mid = [r for r in s["rows"] if r["depth"] > 22]
            if not mid:
                mid = [r for r in s["rows"] if r["depth"] > s["rows"][-1]["depth"] * 0.6]
            m96 = np.median([r["mod96"] for r in mid])
            m192 = np.median([r["mod192"] for r in mid])
            if m >= LARGE:
                # Two periods: gain cancels. ln(m96/m192) = -2 pi^2 s^2 (1/96^2 - 1/192^2)
                s2 = -math.log(m96 / m192) / (2 * math.pi ** 2 * (1 / 96 ** 2 - 1 / 192 ** 2))
            else:
                # The 192 px fringe is too wide for small glass; use the material gain from tint.
                gain = tint_fits[f"{scheme}-small"]["gain"]
                s2 = -math.log(min(0.999, m96 / gain)) / (2 * math.pi ** 2 / 96 ** 2)
            rows.append({"min_side": m, "sigma_pt": round(math.sqrt(max(s2, 0)) / 3, 2), "set": key, "shape": sid})
    ms = np.array([r["min_side"] for r in rows])
    ss = np.array([r["sigma_pt"] for r in rows])
    small = float(np.median(ss[ms <= 64]))
    big = float(np.median(ss[ms >= 160]))
    mid = (ms > 64) & (ms < 160)
    slope = float(np.median((ss[mid] - small) / (ms[mid] - 64))) if mid.any() else 0.03
    return {"min": round(small, 2), "max": round(big, 2), "from": 64, "slope": round(slope, 4), "samples": rows}


def tint():
    d = json.loads((DATA / "tint.json").read_text())
    greys = ["1a1a1a", "404040", "808080", "bfbfbf", "e6e6e6"]
    colours = ["ff3b30", "34c759", "007aff", "ffcc00", "af52de", "0b3d2e", "f2d0c4"]
    w = np.array([0.2126, 0.7152, 0.0722])
    rgb = lambda h: np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)]) / 255
    by = {}
    sizes = {"circle44": 44, "circle64": 64, "capsule170x56": 56, "capsule64x220": 64,
             "circle120": 120, "rect198x120r12": 120, "circle240": 240, "rect354x140r28": 140}
    for s in d["samples"]:
        size = "small" if sizes[s["shape"]] <= SMALL_MAX else "large"
        by.setdefault((s["glass"], s["scheme"], size), {}).setdefault(s["bg"], []).append(np.array(s["out"]))
    out = {}
    for (glass, scheme, size), v in by.items():
        v = {k: np.median(x, axis=0) for k, x in v.items()}
        x = np.array([rgb(g).mean() for g in greys])
        y = np.array([v[g].mean() for g in greys])
        slope, offset = np.polyfit(x, y, 1)
        chroma = []
        for c in colours:
            bg, o = rgb(c), v[c]
            if (o > 0.995).any() or (o < 0.005).any():
                continue
            din = bg - bg @ w
            dout = o - o @ w
            chroma.append(float(din @ dout / (din @ din)))
        key = f"{scheme}-{size}" if glass == "regular" else f"clear-{scheme}-{size}"
        veil = 1 - slope
        out[key] = {"gain": round(float(slope), 3), "offset": round(float(offset), 3),
                    "veil": round(float(veil), 3), "veil_level": round(float(offset / veil), 3) if veil > 0.05 else None,
                    "chroma": round(float(np.median(chroma)), 3) if chroma else None,
                    "saturate": round(float(np.median(chroma) / slope), 2) if chroma else None}
    return out


def rim_and_shadow():
    d = json.loads((DATA / "edge.json").read_text())
    i0 = int(-d["dmin"] * 3)
    out = {}
    for scheme in ["light", "dark"]:
        alphas = []  # (angle from the light axis, alpha)
        shadows = {"small": [], "large": []}
        for bgc in ["000000", "808080"]:
            t_all = d["sets"][f"regular-{scheme}-{bgc}"]
            for sid, t in t_all.items():
                inner = t[0][i0 - 30]
                if inner is None or inner + int(bgc[:2], 16) / 255 > 0.97:
                    continue
                for a in range(12):
                    seg = [v for v in t[a][i0 - 6:i0 + 1] if v is not None]
                    if not seg:
                        continue
                    peak = max(seg) - inner
                    level = inner + int(bgc[:2], 16) / 255
                    alphas.append(((a * 30 - 45) % 180, peak / (1 - level)))
        ang = np.radians([x[0] for x in alphas])
        al = np.array([x[1] for x in alphas])
        a_mat = np.vstack([np.ones_like(ang), np.cos(ang) ** 2]).T
        (base, amp), *_ = np.linalg.lstsq(a_mat, al, rcond=None)
        for bgc in ["ffffff", "808080"]:
            for sid, t in d["sets"][f"regular-{scheme}-{bgc}"].items():
                ks = np.arange(4, 48)
                r = ks / 3
                y = -np.concatenate([[t[3][i0 + k] for k in ks], [t[9][i0 + k] for k in ks], [t[0][i0 + k] for k in ks]])
                lum = int(bgc[:2], 16) / 255

                def model(p):
                    op, dy, s = p
                    return lum * np.concatenate([op * norm.cdf((dy - r) / s), op * norm.cdf((-dy - r) / s), op * norm.cdf(-r / s)])

                res = least_squares(lambda p: model(p) - y, [0.1, 7, 18], bounds=([0, -20, 0.5], [1, 40, 80]))
                size = "small" if sid in ("capsule354x44", "rect148x60r8") else "large"
                shadows[size].append(res.x)
        out[scheme] = {
            "rim_base": round(float(base), 3), "rim_amp": round(float(amp), 3),
            "shadow_small": round(float(np.median([s[0] for s in shadows["small"]])), 3),
            "shadow_large": round(float(np.median([s[0] for s in shadows["large"]])), 3),
            "shadow_dy": round(float(np.median([s[1] for s in shadows["large"]])), 1),
            "shadow_sigma": round(float(np.median([s[2] for s in shadows["large"]])), 1),
        }
    return out


def merge():
    d = json.loads((DATA / "merge.json").read_text())
    rows = [r for r in d["rows"] if not r.get("union") and r["spacing"] and r["k"]]
    x = np.array([r["gap"] / r["spacing"] for r in rows])
    y = np.array([r["k"] / r["spacing"] for r in rows])
    slope, base = np.polyfit(x, y, 1)
    return {"k_base": round(float(base), 3), "k_gap": round(float(slope), 3), "rows": rows}


def plot(model, large, small):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(1, 3, figsize=(13, 3.8), dpi=80)
    r = model["refraction"]
    tt = np.linspace(0, 30, 300)
    for m, t, u, key, sid in large[:4] + small:
        k = min(1, m / r["size_ref"]) ** r["size_exponent"]
        p = ax[0].plot(t, u, ".", ms=2)
        ax[0].plot(tt, k * r["edge_shift"] * np.clip(1 - tt / (k * r["bezel"]), 0, None) ** r["power"], "-", lw=1, color=p[0].get_color())
    ax[0].set(title="Refraction: inward shift (pt) vs depth (pt)", xlabel="depth from edge", ylabel="shift")
    m = model["merge"]
    for sp in (20, 40):
        rows = [q for q in m["rows"] if q["spacing"] == sp]
        ax[1].plot([q["gap"] for q in rows], [q["neck"] for q in rows], "o", label=f"measured spacing {sp}")
        g = np.linspace(0, sp / 2, 50)
        k = sp * np.minimum(1, m["k_base"] + m["k_gap"] * g / sp)
        neck = np.sqrt(np.clip((32 + k / 4) ** 2 - (32 + g / 2) ** 2, 0, None))
        ax[1].plot(g, neck, "-", label=f"model spacing {sp}")
    ax[1].set(title="Merge: neck half-height (pt), two 64 pt circles", xlabel="gap (pt)")
    ax[1].legend(fontsize=7)
    a = np.linspace(0, 180, 181)
    for scheme in ("light", "dark"):
        q = model["rim"][scheme]
        ax[2].plot(a, q["rim_base"] + q["rim_amp"] * np.cos(np.radians(a)) ** 2, label=f"{scheme}")
    ax[2].set(title="Rim light alpha vs angle from light axis", xlabel="degrees")
    ax[2].legend(fontsize=7)
    fig.tight_layout()
    fig.savefig(DATA / "model-fit.png")


def main():
    t = tint()
    tint_fits = {k: v for k, v in t.items()}
    r, large, small = refraction()
    model = {
        "units": "pt (CSS px, Flutter logical px)",
        "refraction": r,
        "blur": blur(tint_fits),
        "material": t,
        "rim": rim_and_shadow(),
        "merge": merge(),
    }
    (DATA / "model.json").write_text(json.dumps(model, indent=1))
    plot(model, large, small)
    brief = {k: ({kk: vv for kk, vv in v.items() if kk not in ("scales", "samples", "rows")} if isinstance(v, dict) else v) for k, v in model.items()}
    print(json.dumps(brief, indent=1))


if __name__ == "__main__":
    main()
