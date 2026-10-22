"""Drives CtlLab (app/controls) in the booted simulator, like capture.py drives LGLab: writes the
scene query to Documents/scene.txt, waits for Documents/shown.txt, then screenshots and copies the
frames the app reported (Documents/frames.json) next to the PNG.

    python3 controls_capture.py install
    python3 controls_capture.py all            # every static scene → $LG_RAW/controls (default ./raw)
    python3 controls_capture.py "<query>" out.png
"""
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

DEVICE = "booted"
BUNDLE = "org.feeef.ctllab"
APP = Path(__file__).resolve().parent.parent / "app" / "controls" / "build" / "CtlLab.app"
RAW = Path(os.environ.get("LG_RAW", Path(__file__).resolve().parent.parent / "raw")) / "controls"
_docs = None


def simctl(*args, timeout=60):
    return subprocess.run(["xcrun", "simctl", *args], check=True, capture_output=True, timeout=timeout, text=True)


def docs():
    global _docs
    if _docs is None:
        data = simctl("get_app_container", DEVICE, BUNDLE, "data").stdout.strip()
        _docs = Path(data) / "Documents"
        _docs.mkdir(parents=True, exist_ok=True)
    return _docs


def relaunch():
    subprocess.run(["xcrun", "simctl", "terminate", DEVICE, BUNDLE], capture_output=True, timeout=30)
    simctl("launch", DEVICE, BUNDLE, "scene=blank")
    time.sleep(1.5)


def install():
    global _docs
    _docs = None
    subprocess.run(["xcrun", "simctl", "terminate", DEVICE, BUNDLE], capture_output=True, timeout=30)
    simctl("install", DEVICE, str(APP), timeout=120)
    simctl("launch", DEVICE, BUNDLE, "scene=blank")
    time.sleep(2.0)


def request(query, settle=1.0, timeout=30):
    # nonce: the app ignores a query equal to the last one it showed (e.g. read at launch)
    query = f"{query}&settle={settle}&nonce={time.time():.3f}"
    (docs() / "shown.txt").unlink(missing_ok=True)
    (docs() / "scene.txt").write_text(query)
    start = time.time()
    while True:
        shown = docs() / "shown.txt"
        if shown.exists() and shown.read_text().strip() == query:
            return
        if time.time() - start > timeout:
            raise TimeoutError(query)
        time.sleep(0.05)


def shoot(query, path, settle=1.0):
    request(query, settle)
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    simctl("io", DEVICE, "screenshot", "--type=png", str(path))
    frames = docs() / "frames.json"
    if frames.exists():
        shutil.copy(frames, path.with_suffix(".json"))
    return path


STYLES = ["glass", "glassProminent", "borderedProminent", "bordered"]


def all_scenes():
    for scheme in ["light", "dark"]:
        shoot(f"scene=blank&scheme={scheme}&bg=808080", RAW / f"blank-{scheme}.png")
        for style in STYLES:
            shoot(f"scene=buttons&style={style}&scheme={scheme}&bg=808080", RAW / f"buttons-{style}-{scheme}.png")
        shoot(f"scene=type&scheme={scheme}&bg=ffffff", RAW / f"type-{scheme}.png")
        shoot(f"scene=toolbar&scheme={scheme}&bg=808080&status=shown", RAW / f"toolbar-{scheme}.png", settle=1.5)
        shoot(f"scene=controls&scheme={scheme}&bg=808080", RAW / f"controls-{scheme}.png")
        # system-fill tracks (segmented) barely differ from mid grey: also over white and black
        for bg in ["ffffff", "000000"]:
            shoot(f"scene=controls&scheme={scheme}&bg={bg}", RAW / f"controls-{scheme}-{bg}.png")
        shoot(f"scene=search&scheme={scheme}&bg=808080&status=shown", RAW / f"search-{scheme}.png", settle=1.5)
        shoot(f"scene=search&place=nav&scheme={scheme}&bg=808080&status=shown", RAW / f"search-nav-{scheme}.png", settle=1.5)
        shoot(f"scene=list&scheme={scheme}&status=shown", RAW / f"list-{scheme}.png")
        for n in [1, 2, 3]:
            # A presented alert outlives the scene change: relaunch the app after each one.
            shoot(f"scene=alert&n={n}&scheme={scheme}&bg=808080", RAW / f"alert{n}-{scheme}.png", settle=2.0)
            relaunch()
        shoot(f"scene=smenu&scheme={scheme}&bg=808080&status=shown", RAW / f"smenu-{scheme}.png", settle=1.5)
    shoot("scene=uikit", RAW / "uikit.png")


if __name__ == "__main__":
    if sys.argv[1] == "install":
        install()
    elif sys.argv[1] == "all":
        all_scenes()
    else:
        shoot(sys.argv[1], sys.argv[2])
