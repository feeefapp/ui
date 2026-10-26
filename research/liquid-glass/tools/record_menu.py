"""Records the menu morph at the simulator's display rate (frames only when the screen changes,
~60 fps while animating) and extracts every frame with its timestamp.

    python3 record_menu.py uikit <name> "<query>"   # CtlLab umenu scene, opens/closes itself
    python3 record_menu.py raw <name> <seconds>      # record only (trigger by tapping meanwhile)
    python3 record_menu.py frames <name>             # (re)extract frames + times of <name>.mp4

Output: $LG_RAW/controls/menu/<name>.mp4, <name>/0001.png …, <name>/times.json
"""
import json
import subprocess
import sys
import time

from controls_capture import RAW, request

OUT = RAW / "menu"


def start(name):
    OUT.mkdir(parents=True, exist_ok=True)
    return subprocess.Popen(["xcrun", "simctl", "io", "booted", "recordVideo", "--codec=h264", "--force", str(OUT / f"{name}.mp4")],
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT)


def stop(p):
    p.send_signal(2)
    p.communicate(timeout=60)


def frames(name):
    d = OUT / name
    if d.exists():
        for f in d.glob("*.png"):
            f.unlink()
    d.mkdir(parents=True, exist_ok=True)
    mp4 = OUT / f"{name}.mp4"
    times = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries", "frame=pts_time", "-of", "csv=p=0", str(mp4)],
                           capture_output=True, text=True, check=True).stdout.split()
    times = [float(t.strip(",")) for t in times if t.strip(",")]
    subprocess.run(["ffmpeg", "-v", "quiet", "-i", str(mp4), "-fps_mode", "passthrough", str(d / "%04d.png")], check=True)
    (d / "times.json").write_text(json.dumps(times))
    print(name, len(times), "frames")


if __name__ == "__main__":
    mode, name = sys.argv[1], sys.argv[2]
    if mode == "uikit":
        request("scene=blank&bg=808080&status=shown", settle=0.5)
        p = start(name)
        time.sleep(1.0)
        request(sys.argv[3], settle=0.2)
        time.sleep(float(dict(kv.split("=") for kv in sys.argv[3].split("&")).get("total", 6)))
        stop(p)
        frames(name)
    elif mode == "raw":
        p = start(name)
        time.sleep(1.5)
        print("recording", flush=True)  # the host taps after this line
        time.sleep(float(sys.argv[3]))
        stop(p)
        frames(name)
    else:
        frames(name)
