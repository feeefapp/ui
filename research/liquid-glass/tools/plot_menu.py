"""Plots the measured menu morph (normalised width/height progress per run + fitted springs).

    python3 plot_menu.py        → data/controls-menu.png
"""
import json

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from analyze_menu import spring
from ctl import DATA

RUNS = ["uikit-light-dy-220", "uikit-light-dy220", "uikit-dark-dy-220", "uikit-dark-dy220", "swiftui-bar-light"]

d = json.loads((DATA / "controls-menu.json").read_text())
fig, axes = plt.subplots(2, 2, figsize=(11, 7), sharex=True)
for col, kind in enumerate(["open", "close"]):
    for row, dim in enumerate(["w", "h"]):
        ax = axes[row][col]
        for name in RUNS:
            for tr in d[name]["transitions"]:
                if tr["kind"] != kind or dim not in tr["dims"]:
                    continue
                s = np.array(tr["dims"][dim]["series"])
                ax.plot(s[:, 0], s[:, 1], ".-", ms=3, lw=0.8, label=name)
                f = tr["dims"][dim]["spring"]
                if f and name == RUNS[0]:
                    tt = np.linspace(0, 0.8, 200)
                    t0 = f["t0"] - tr["t_first_change"]
                    ax.plot(tt, spring(tt, t0, 2 * np.pi / f["response"], min(f["dampingFraction"], 0.999)), "k--", lw=1,
                            label=f"fit resp {f['response']} damp {f['dampingFraction']}")
        ax.axhline(1, color="grey", lw=0.5)
        ax.set_title(f"{kind}: {'width' if dim == 'w' else 'height'} progress")
        ax.set_xlim(-0.05, 0.8)
        ax.legend(fontsize=6)
axes[1][0].set_xlabel("s from first frame that moved")
axes[1][1].set_xlabel("s from first frame that moved")
fig.tight_layout()
fig.savefig(DATA / "controls-menu.png", dpi=110)
print(DATA / "controls-menu.png")
