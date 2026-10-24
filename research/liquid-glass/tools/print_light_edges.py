"""Prints Δ = out − backdrop (0–255) by depth for a few directions, from data/light-edges-<label>.json.
    python3 print_light_edges.py <label> <key> <shape> <flat index 0..5> [pt range]"""
import json, sys
import numpy as np
lab, key, sid, fi = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
J = json.loads(open(f"data/light-edges-{lab}.json").read())
lv = J["levels"][fi]
T = np.array(J["fits"][key][sid]["flats"][fi], dtype=float)
dmin = J["dmin_px"]
dirs = {"top": [9], "bottom": [3], "left": [6], "right": [0], "TL": [7, 8], "BR": [1, 2], "TR": [10, 11], "BL": [4, 5]}
lo, hi = (float(sys.argv[5]), float(sys.argv[6])) if len(sys.argv) > 6 else (-6, 6)
cols = [k for k in range(T.shape[1]) if lo <= (k + dmin + 0.5) / 3 <= hi]
print(f"{lab} {key} {sid} bg={lv*255:.0f}  d(pt): " + " ".join(f"{(k+dmin+0.5)/3:5.1f}" for k in cols))
for n, b in dirs.items():
    row = np.nanmean(T[b], axis=0)
    print(f"{n:7s}" + "".join(f"{(row[k]-lv)*255:6.1f}" for k in cols))
