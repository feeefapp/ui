"""Drives the LGLab app in the booted simulator: writes the scene query to the app's
Documents/scene.txt, waits until the app acknowledges it (Documents/shown.txt), then screenshots.

    python3 capture.py install              # build/LGLab.app → simulator, launch
    python3 capture.py "<query>" out.png    # one scene
"""
import subprocess
import sys
import time
from pathlib import Path

DEVICE = "booted"
BUNDLE = "org.feeef.lglab"
APP = Path(__file__).resolve().parent.parent / "app" / "build" / "LGLab.app"
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


def install():
    subprocess.run(["xcrun", "simctl", "terminate", DEVICE, BUNDLE], capture_output=True, timeout=30)
    simctl("install", DEVICE, str(APP), timeout=120)
    simctl("launch", DEVICE, BUNDLE, "layout=none&bg=flat&color=808080")
    time.sleep(2.0)


def shoot(query, path, settle=0.9, timeout=20):
    query = f"{query}&settle={settle}"
    (docs() / "shown.txt").unlink(missing_ok=True)
    (docs() / "scene.txt").write_text(query)
    start = time.time()
    while True:
        shown = docs() / "shown.txt"
        if shown.exists() and shown.read_text().strip() == query:
            break
        if time.time() - start > timeout:
            raise TimeoutError(query)
        time.sleep(0.05)
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    simctl("io", DEVICE, "screenshot", "--type=png", str(path))
    return path


if __name__ == "__main__":
    if sys.argv[1] == "install":
        install()
    else:
        shoot(sys.argv[1], sys.argv[2])
