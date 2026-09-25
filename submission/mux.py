#!/usr/bin/env python3
"""Rebuild the narration timeline to match the xfade video exactly, then mux.

Video timeline: title 4.0s, then each scene (audio_dur + 0.6s) minus the 0.4s
xfade overlap. So scene i starts at 3.6 + sum(a_j + 0.2 for j < i).
"""
import json
import os
import subprocess
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
AUDIO = os.path.join(BASE, "audio")
BUILD = os.path.join(BASE, "build")
VIDEO = os.path.join(BUILD, "pip-video.mp4")
TITLE_DUR = 4.0
LEAD = TITLE_DUR - 0.4
STEP = 0.2  # 0.6 pad minus 0.4 xfade overlap

ORDER = ["ts-s1", "ts-s2", "ts-s3", "ts-s4", "ts-s5", "ts-s6", "ts-s7", "ts-s8"]


def run(cmd):
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        print("FAILED:", " ".join(cmd[:14]), file=sys.stderr)
        print(p.stderr[-3000:], file=sys.stderr)
        raise SystemExit(1)
    return p


def dur(path):
    return float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", path], capture_output=True, text=True).stdout.strip())


def find(prefix):
    for f in sorted(os.listdir(AUDIO)):
        if f.startswith(prefix) and f.endswith(".mp3"):
            return os.path.join(AUDIO, f)
    raise SystemExit("missing audio for " + prefix)


def main():
    parts = [find(p) for p in ORDER]
    ndir = os.path.join(BUILD, "norm")
    os.makedirs(ndir, exist_ok=True)

    cache = {}

    def silence(seconds, tag):
        key = round(seconds, 3)
        if key not in cache:
            out = os.path.join(ndir, f"sil_{tag}_{key}.wav")
            if not os.path.exists(out):
                run(["ffmpeg", "-y", "-f", "lavfi", "-i",
                     f"anullsrc=r=44100:cl=stereo:d={key}", out])
            cache[key] = out
        return cache[key]

    rows = [f"file '{silence(LEAD, 'lead')}'"]
    for i, p in enumerate(parts):
        rows.append(f"file '{p}'")
        if i < len(parts) - 1:
            rows.append(f"file '{silence(STEP, 'gap')}'")
    lst = os.path.join(BUILD, "audio2.txt")
    with open(lst, "w") as f:
        f.write("\n".join(rows) + "\n")

    track = os.path.join(BUILD, "b.wav")
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst,
         "-ar", "44100", "-ac", "2", track])

    vdur = dur(VIDEO)
    adur = dur(track)
    print(f"video={vdur:.3f} audio={adur:.3f} drift={adur - vdur:+.3f}")

    final = os.path.join(BASE, "tapescope-walkthrough.mp4")
    run(["ffmpeg", "-y", "-i", VIDEO, "-i", track,
         "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy",
         "-c:a", "aac", "-b:a", "160k",
         "-shortest", "-movflags", "+faststart", final])
    print(json.dumps({"final": final, "duration": round(dur(final), 2),
                      "bytes": os.path.getsize(final)}))


if __name__ == "__main__":
    main()
