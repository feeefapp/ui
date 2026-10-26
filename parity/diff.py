"""Pixel diff for parity captures: share of pixels whose largest channel difference exceeds a
tolerance (anti-aliasing noise stays under it), the mean difference, and a diff image."""
import json
import sys
from pathlib import Path

from PIL import Image, ImageChops

out = Path(sys.argv[1])
results = []
for name in sys.argv[2:]:
    a = Image.open(out / f"{name}-react.png").convert("RGB")
    b = Image.open(out / f"{name}-flutter.png").convert("RGB")
    if a.size != b.size:
        b = b.resize(a.size)
    delta = ImageChops.difference(a, b)
    pixels = list(delta.get_flattened_data()) if hasattr(delta, 'get_flattened_data') else list(delta.getdata())
    worst = [max(p) for p in pixels]
    differing = sum(1 for w in worst if w > 40) / len(worst)
    mean = sum(worst) / len(worst)
    mask = Image.new("RGB", a.size, (255, 255, 255))
    mask.paste(Image.blend(a, Image.new("RGB", a.size, (255, 255, 255)), 0.7))
    red = Image.new("RGB", a.size, (230, 30, 30))
    highlight = Image.eval(delta.convert("L"), lambda v: 255 if v > 40 else 0)
    mask.paste(red, mask=highlight)
    mask.save(out / f"{name}-diff.png")
    results.append({"name": name, "differing": differing, "mean": mean, "size": a.size})
print(json.dumps(results))
