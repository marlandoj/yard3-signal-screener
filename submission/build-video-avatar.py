#!/usr/bin/env python3
"""Rebuild the TapeScope walkthrough with the real HeyGen avatar footage.

Narration audio is ONE continuous track and the product clips are cut at the
phrase boundaries detected in that same track, so A/V sync is exact by
construction rather than approximated with per-scene padding.

Avatar is composited as a bordered lower-right panel (not a circular crop:
the source is 16:9, so a circular mask would discard most of the frame).
"""
import json
import os
import subprocess
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(BASE, "shots")
BUILD = os.path.join(BASE, "build-avatar")
AVATAR_VIDEO = "/home/.z/workspaces/con_QanUVQ1buQHoF1RN/hg/avatar-full.mp4"
NARRATION = "/home/.z/workspaces/con_QanUVQ1buQHoF1RN/hg/new-voice.wav"
SCENES_TXT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scenes.txt")

W, H, FPS = 1920, 1080, 30
BG = "0x0b1220"
ACCENT = "0x5eead4"
TITLE_DUR = 3.0

# lower-right avatar panel
AV_W, AV_H = 500, 282
AV_X, AV_Y = 1368, 692
SHADOW_X, SHADOW_Y = AV_X - 8, AV_Y - 8
SHADOW_W, SHADOW_H = AV_W + 16, AV_H + 16

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
    FONT = subprocess.run(
        ["fc-match", "-f", "%{file}", "DejaVu Sans:bold"],
        capture_output=True, text=True).stdout.strip() or None

TF = (f"fontfile={FONT}:" if FONT else "")


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


def load_scenes():
    rows = []
    for line in open(SCENES_TXT):
        line = line.rstrip("\n")
        if not line.strip():
            continue
        n, shot, caption, start, end = line.split("\t")
        rows.append((int(n), float(start), float(end)))
    if not rows:
        raise SystemExit("no scenes parsed from " + SCENES_TXT)
    return rows


def main():
    os.makedirs(BUILD, exist_ok=True)
    clips_dir = os.path.join(BUILD, "clips")
    os.makedirs(clips_dir, exist_ok=True)

    rows = load_scenes()
    labels = json.load(open(os.path.join(BASE, "scene-labels.json")))

    # ---- 1. title card -------------------------------------------------
    title = os.path.join(clips_dir, "c00.mp4")
    run(["ffmpeg", "-y", "-f", "lavfi", "-i", f"color=c={BG}:s={W}x{H}:d={TITLE_DUR}:r={FPS}",
         "-vf", (f"drawbox=x=0:y={H//2-150}:w={W}:h=300:color=0x0d1a2e:t=fill,"
                 f"drawtext={TF}text='TapeScope':fontcolor=white:fontsize=104:x=(w-text_w)/2:y={H//2-110},"
                 f"drawtext={TF}text='Signal, not noise':fontcolor={ACCENT}:fontsize=46:"
                 f"x=(w-text_w)/2:y={H//2+20},"
                 f"drawtext={TF}text='HackYard Yard 3':fontcolor=0x94a3b8:fontsize=30:"
                 f"x=(w-text_w)/2:y={H//2+96}"),
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", str(FPS), title])

    # ---- 2. one clip per narration segment -----------------------------
    # segment 1 absorbs the 1.05s lead-in silence so shot 1 is on screen
    # before the first word is spoken.
    prev_end = 0.0
    clips = [title]
    for idx, start, end in rows:
        caption, shot = labels[str(idx)]
        d = end - prev_end
        prev_end = end
        out = os.path.join(clips_dir, f"c{idx:02d}.mp4")
        z = "min(zoom+0.00035,1.045)" if idx % 2 else "if(lte(zoom,1.0),1.045,max(1.001,zoom-0.00035))"
        esc = caption.replace("'", "").replace(":", "\\:")
        vf = (f"scale={W}:-2:flags=lanczos,pad={W}:{H}:0:(oh-ih)/2:{BG},"
              f"zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
              f"d={int(d*FPS)}:s={W}x{H}:fps={FPS},"
              f"drawbox=x=0:y={H-96}:w={W}:h=96:color=black@0.55:t=fill,"
              f"drawtext={TF}text='{esc}':fontcolor=white:fontsize=38:x=64:y={H-72},"
              f"drawtext={TF}text='TapeScope':fontcolor={ACCENT}:fontsize=26:"
              f"x=64:y=32")
        run(["ffmpeg", "-y", "-loop", "1", "-i", os.path.join(SHOTS, shot + ".png"),
             "-t", f"{d:.3f}", "-vf", vf, "-c:v", "libx264", "-pix_fmt", "yuv420p",
             "-r", str(FPS), out])
        clips.append(out)

    # ---- 3. concat (hard cuts land on detected silences) ---------------
    lst = os.path.join(BUILD, "clips.txt")
    with open(lst, "w") as f:
        for c in clips:
            f.write(f"file '{c}'\n")
    base = os.path.join(BUILD, "base.mp4")
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst,
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", str(FPS), base])

    # ---- 4. overlay the lip-synced avatar, shifted past the title ------
    withav = os.path.join(BUILD, "with-avatar.mp4")
    fc = (f"[0:v]drawbox=x={SHADOW_X}:y={SHADOW_Y}:w={SHADOW_W}:h={SHADOW_H}:"
          f"color=black@0.45:t=fill[b];"
          f"[1:v]scale={AV_W}:{AV_H}:force_original_aspect_ratio=decrease,"
          f"pad={AV_W}:{AV_H}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,"
          f"setpts=PTS-STARTPTS+{TITLE_DUR}/TB,format=rgba[av];"
          f"[b][av]overlay=x={AV_X}:y={AV_Y}:eof_action=pass:eval=init[ov];"
          f"[ov]drawbox=x={AV_X}:y={AV_Y}:w={AV_W}:h={AV_H}:color={ACCENT}@0.85:t=2,"
          f"drawtext={TF}text='Marlando':fontcolor=white:fontsize=22:"
          f"x={AV_X}:y={AV_Y+AV_H+6},"
          f"drawbox=x={AV_X-2}:y={AV_Y+AV_H+2}:w={AV_W+4}:h=34:color=black@0.45:t=fill[v]")
    run(["ffmpeg", "-y", "-i", base, "-i", AVATAR_VIDEO,
         "-filter_complex", fc, "-map", "[v]",
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", str(FPS), withav])

    # ---- 5. audio: title silence + the continuous narration ------------
    sil = os.path.join(BUILD, "sil.wav")
    run(["ffmpeg", "-y", "-f", "lavfi", "-i",
         f"anullsrc=r=44100:cl=stereo:d={TITLE_DUR}", sil])
    alist = os.path.join(BUILD, "audio.txt")
    with open(alist, "w") as f:
        f.write(f"file '{sil}'\nfile '{NARRATION}'\n")
    track = os.path.join(BUILD, "a.wav")
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", alist,
         "-ar", "44100", "-ac", "2", track])

    # ---- 6. mux --------------------------------------------------------
    final = os.path.join(BUILD, "tapescope-walkthrough-avatar.mp4")
    run(["ffmpeg", "-y", "-i", withav, "-i", track,
         "-map", "0:v:0", "-map", "1:a:0", "-c:v", "libx264", "-preset", "medium",
         "-crf", "21", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k",
         "-shortest", "-movflags", "+faststart", final])

    v, a = dur(final), dur(track)
    print(json.dumps({
        "final": final,
        "video_duration": round(v, 3),
        "audio_duration": round(a, 3),
        "av_drift_s": round(abs(v - a), 3),
        "bytes": os.path.getsize(final),
    }))


if __name__ == "__main__":
    main()
