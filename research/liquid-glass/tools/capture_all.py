"""Captures every measurement scene into a raw folder (default: $LG_RAW or ./raw, not committed).

    python3 capture_all.py [group ...]      groups: fringe tint edge merge noise reference

Fringes: phase-shifted grey sinusoids (structured light). Per pixel, four shifted captures give
phase (where the glass sampled from), modulation (blur + gain) and mean (fill), independent of any
per-pixel brightness/contrast change the material applies.
"""
import os
import sys
from pathlib import Path

from capture import install, shoot

RAW = Path(os.environ.get("LG_RAW", Path(__file__).resolve().parent.parent / "raw"))
PERIODS = [768, 192, 96]
N = 4
FLATS = ["000000", "1a1a1a", "404040", "808080", "bfbfbf", "e6e6e6", "ffffff",
         "ff3b30", "34c759", "007aff", "ffcc00", "af52de", "0b3d2e", "f2d0c4"]


def fringe():
    for glass in ["none", "regular", "clear"]:
        for layout in ["shapes-a", "shapes-b"]:
            for scheme in (["light", "dark"] if glass == "regular" else ["light"]):
                for axis in "xy":
                    for period in PERIODS:
                        for k in range(N):
                            name = f"fringe/{glass}-{scheme}-{layout}-{axis}{period}-{k}.png"
                            if (RAW / name).exists():
                                continue
                            q = (f"layout={layout}&glass={glass}&scheme={scheme}&bg=fringe&axis={axis}"
                                 f"&period={period}&phase={k}&n={N}&amp=0.3&mean=0.5")
                            shoot(q, RAW / name)
                if glass == "none":
                    break


def tint():
    for glass in ["regular", "clear", "none"]:
        for scheme in ["light", "dark"]:
            for color in FLATS:
                name = f"tint/{glass}-{scheme}-{color}.png"
                if not (RAW / name).exists():
                    shoot(f"layout=shapes-a&glass={glass}&scheme={scheme}&bg=flat&color={color}", RAW / name)
            name = f"tint/{glass}-{scheme}-photo.png"
            if not (RAW / name).exists():
                shoot(f"layout=shapes-a&glass={glass}&scheme={scheme}&bg=photo", RAW / name)
            if glass == "none":
                break


def edge():
    # Rim light and shadow over flats, both layouts (more radii), both schemes.
    for glass in ["regular", "clear"]:
        for scheme in ["light", "dark"]:
            for color in ["000000", "808080", "ffffff"]:
                name = f"edge/{glass}-{scheme}-shapes-b-{color}.png"
                if not (RAW / name).exists():
                    shoot(f"layout=shapes-b&glass={glass}&scheme={scheme}&bg=flat&color={color}", RAW / name)


def noise():
    for glass in ["regular", "clear", "none"]:
        for layout in ["shapes-a", "shapes-b"]:
            name = f"noise/{glass}-{layout}.png"
            if not (RAW / name).exists():
                shoot(f"layout={layout}&glass={glass}&bg=noise&seed=7", RAW / name)


def merge():
    # Two 64pt circles in one GlassEffectContainer: vary the gap at two container spacings.
    for spacing in [0, 20, 40]:
        for gap in [40, 32, 24, 16, 12, 8, 4, 0]:
            name = f"merge/s{spacing}-g{gap}.png"
            if not (RAW / name).exists():
                shoot(f"layout=merge&glass=regular&bg=checker&cell=2&size=64&gap={gap}&spacing={spacing}&y=300", RAW / name)
    for gap in [40, 16]:
        name = f"merge/union-g{gap}.png"
        if not (RAW / name).exists():
            shoot(f"layout=union&glass=regular&bg=checker&cell=2&size=64&gap={gap}&spacing=0&y=300", RAW / name)
    # Unequal sizes and a flat background for the outline as seen by people.
    for gap in [24, 8]:
        name = f"merge/flat-s40-g{gap}.png"
        if not (RAW / name).exists():
            shoot(f"layout=merge&glass=regular&bg=photo&size=64&second=44&gap={gap}&spacing=40&y=300", RAW / name)


REFERENCE_BACKGROUNDS = ["photo", "stripes&cell=12", "flat&color=808080", "flat&color=ffffff", "flat&color=1a1a1a"]


def reference():
    """The scenes the kit is compared against (tools/compare_kit.mjs renders the same ones)."""
    for scheme in ["light", "dark"]:
        for bg in REFERENCE_BACKGROUNDS:
            tag = bg.replace("&cell=", "").replace("flat&color=", "flat-")
            for glass in ["regular", "none"]:
                name = f"reference/{glass}-{scheme}-{tag}.png"
                if not (RAW / name).exists():
                    shoot(f"layout=shapes-a&glass={glass}&scheme={scheme}&bg={bg}", RAW / name)


LIGHT_EDGE_BACKGROUNDS = ["flat&color=ffffff", "flat&color=ebebeb", "flat&color=d0d0d0", "lightphoto", "lightstripes",
                          "text", "flat&color=808080", "flat&color=1a1a1a", "flat&color=000000", "darkphoto", "photo"]


def bg_tag(bg):
    return bg.replace("flat&color=", "flat-")


def lightedges():
    """LIGHT-EDGES.md: what makes the edge readable on light content. `edges` layout (44 circle,
    132x44 capsule, 240x160 card, 88 circle, 300x64 capsule), clear and regular, both schemes."""
    for bg in LIGHT_EDGE_BACKGROUNDS:
        name = f"lightedges/none-{bg_tag(bg)}.png"
        if not (RAW / name).exists():
            shoot(f"layout=edges&glass=none&scheme=light&bg={bg}", RAW / name)
        for glass in ["regular", "clear"]:
            for scheme in ["light", "dark"]:
                name = f"lightedges/{glass}-{scheme}-{bg_tag(bg)}.png"
                if not (RAW / name).exists():
                    shoot(f"layout=edges&glass={glass}&scheme={scheme}&bg={bg}", RAW / name)


if __name__ == "__main__":
    groups = sys.argv[1:] or ["fringe", "tint", "edge", "noise", "merge", "reference", "lightedges"]
    if os.environ.get("LG_INSTALL", "1") == "1":
        install()
    for group in groups:
        print("capturing", group, flush=True)
        globals()[group]()
