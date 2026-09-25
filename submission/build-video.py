#!/usr/bin/env python3
"""Compose the TapeScope submission walkthrough.

Screenshots + per-scene narration + circular avatar PiP -> 1080p walkthrough MP4.
"""
import json
import os
import subprocess
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(BASE, "shots")
AUDIO = os.path.join(BASE, "audio")
BUILD = os.path.join(BASE, "build")
AVATAR = "/home/workspace/Images/alaric-portrait.png"

W, H, FPS = 1920, 1080, 30
BG = "0x0b1220"
ACCENT = "0x5eead4"
TITLE_DUR = 4.0
XFADE = 0.4
SEG_PAD = 0.6

FONT = None
for cand in [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
]:
    if os.path.exists(cand):
        FONT = cand
        break
if FONT is None:
    hits = subprocess.run(["fc-match", "-f", "%{file}", "DejaVu Sans:bold"],
                          capture_output=True, text=True).stdout.strip()
    FONT = hits or None

SCENES = [
    ("ts-s1", "01-opening",           "One screen. Every vehicle."),
    ("ts-s2", "08-vehicles",          "Live market tape"),
    ("ts-s3", "05-methodology",       "Every component, visible"),
    ("ts-s4", "04-relative-strength", "Relative strength vs SPY"),
    ("ts-s5", "02-watchlist-stars",   "Watchlist persists"),
    ("ts-s6", "06-scenario-planner",  "Scenario planner"),
    ("ts-s7", "07-scout-delivery",    "Scout research memo"),
    ("ts-s8", "01-opening",           "Signal, not noise"),
]


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
    os.makedirs(BUILD, exist_ok=True)
    os.makedirs(os.path.join(BUILD, "clips"), exist_ok=True)

    # 1. circular avatar + ring
    disc = os.path.join(BUILD, "ring.png")
    face = os.path.join(BUILD, "face.png")
    pip = os.path.join(BUILD, "pip.png")
    R = 156
    run(["ffmpeg", "-y", "-f", "lavfi", "-i", f"color=c={ACCENT}:s={R*2}x{R*2}",
         "-vf", f"format=rgba,geq=r='0':g='234':b='212':a="
                f"'if(lte((X-{R-1})^2+(Y-{R-1})^2,{(R-1)*(R-1)}),255,0)'",
         "-frames:v", "1", disc])
    run(["ffmpeg", "-y", "-i", AVATAR,
         "-vf", "crop=470:470:277:40,scale=300:300,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a="
                "'if(lte((X-149)^2+(Y-149)^2,149*149),255,0)'",
         "-frames:v", "1", face])
    run(["ffmpeg", "-y", "-i", disc, "-i", face,
         "-filter_complex", "[0][1]overlay=6:6", "-frames:v", "1", pip])

    # 2. title card
    title = os.path.join(BUILD, "clips", "c00.mp4")
    tf = (f"fontfile={FONT}:" if FONT else "")
    run(["ffmpeg", "-y", "-f", "lavfi", "-i", f"color=c={BG}:s={W}x{H}:d={TITLE_DUR}:r={FPS}",
         "-vf", (f"drawbox=x=0:y={H//2-150}:w={W}:h=300:color=0x0d1a2e:t=fill,"
                 f"drawtext={tf}text='TapeScope':fontcolor=white:fontsize=104:x=(w-text_w)/2:y={H//2-110},"
                 f"drawtext={tf}text='Signal, not noise':fontcolor=0x5eead4:fontsize=46:"
                 f"x=(w-text_w)/2:y={H//2+20},"
                 f"drawtext={tf}text='HackYard Yard 3':fontcolor=0x94a3b8:fontsize=30:"
                 f"x=(w-text_w)/2:y={H//2+96}"),
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", str(FPS), title])

    # 3. per-scene clips
    clips, audios = [title], []
    for i, (prefix, shot, label) in enumerate(SCENES, start=1):
        a = find(prefix)
        d = dur(a) + SEG_PAD
        audios.append(a)
        out = os.path.join(BUILD, "clips", f"c{i:02d}.mp4")
        z = "min(zoom+0.00035,1.045)" if i % 2 else "if(lte(zoom,1.0),1.045,max(1.001,zoom-0.00035))"
        esc = label.replace("'", "").replace(":", "\\:")
        vf = (f"scale={W}:-2:flags=lanczos,pad={W}:{H}:0:(oh-ih)/2:{BG},"
              f"zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
              f"d={int(d*FPS)}:s={W}x{H}:fps={FPS},"
              f"drawbox=x=0:y={H-96}:w={W}:h=96:color=black@0.55:t=fill,"
              f"drawtext={tf}text='{esc}':fontcolor=white:fontsize=38:x=64:y={H-72},"
              f"drawtext={tf}text='TapeScope':fontcolor=0x5eead4:fontsize=26:"
              f"x=64:y=32")
        run(["ffmpeg", "-y", "-loop", "1", "-i", os.path.join(SHOTS, shot + ".png"),
             "-t", f"{d}", "-vf", vf, "-c:v", "libx264", "-pix_fmt", "yuv420p",
             "-r", str(FPS), out])
        clips.append(out)

    # 4. xfade chain
    parts = []
    cur = clips[0]
    t = dur(clips[0]) - XFADE
    for nxt in clips[1:]:
        out = os.path.join(BUILD, f"x{len(parts)}.mp4")
        run(["ffmpeg", "-y", "-i", cur, "-i", nxt,
             "-filter_complex", f"[0][1]xfade=transition=fade:duration={XFADE}:offset={t:.3f}[v]",
             "-map", "[v]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", str(FPS), out])
        cur = out
        parts.append(out)
        t += dur(nxt) - XFADE

    # 5. avatar PiP overlay
    withpip = os.path.join(BUILD, "pip-video.mp4")
    run(["ffmpeg", "-y", "-i", cur, "-i", pip,
         "-filter_complex", f"[1]format=rgba[av];[0][av]overlay=x={W-360}:y={H-360}:eval=init[v]",
         "-map", "[v]", "-map", "0:a?", "-c:v", "libx264", "-pix_fmt", "yuv420p",
         "-r", str(FPS), withpip])

    # 6. audio: silence + scenes with small gaps
    sil4 = os.path.join(BUILD, "sil4.wav")
    sil03 = os.path.join(BUILD, "sil03.wav")
    run(["ffmpeg", "-y", "-f", "lavfi", "-i", f"anullsrc=r=44100:cl=stereo:d={TITLE_DUR}", sil4])
    run(["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo:d=0.3", sil03])
    lst = os.path.join(BUILD, "audio.txt")
    rows = [f"file '{sil4}'"]
    for a in audios:
        rows.append(f"file '{a}'")
        rows.append(f"file '{sil03}'")
    with open(lst, "w") as f:
        f.write("\n".join(rows) + "\n")
    track = os.path.join(BUILD, "a.wav")
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst,
         "-ar", "44100", "-ac", "2", track])

    # 7. mux
    final = os.path.join(BASE, "tapescope-walkthrough.mp4")
    run(["ffmpeg", "-y", "-i", withpip, "-i", track,
         "-map", "0:v:0", "-map", "1:a:0", "-c:v", "libx264", "-preset", "medium",
         "-crf", "21", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k",
         "-shortest", "-movflags", "+faststart", final])
    print(json.dumps({"final": final, "duration": round(dur(final), 2),
                      "bytes": os.path.getsize(final)}))


if __name__ == "__main__":
    main()
