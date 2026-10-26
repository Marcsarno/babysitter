"""Prepare Arianna's Cupcakes music for the game.

Usage: python3 -I art/cupcake/music.py

Put Suno downloads in art/cupcake/music/ named by their code (M2-shop.mp3). Each one is evened out
to the same loudness, given a short fade at both ends so it loops softly, and written to
public/cupcake/music/ with an index.json listing the tracks the game can play.
"""
from pathlib import Path
import json
import re
import subprocess

HERE = Path(__file__).resolve().parent
SRC = HERE / 'music'
OUT = HERE.parent.parent / 'public' / 'cupcake' / 'music'


def duration(p):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(p)]))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    tracks = {}
    for p in sorted(SRC.iterdir()):
        m = re.match(r'^(M\d+)-([a-z0-9-]+)\.(mp3|wav|m4a)$', p.name, re.I)
        if not m:
            continue
        name = f'{m.group(1)}-{m.group(2)}'.lower()
        end = duration(p) - 0.4  # the last moment of a Suno track is usually its ring-out
        af = f'atrim=0:{end:.2f},loudnorm=I=-20:TP=-2:LRA=11,afade=t=in:d=0.06,afade=t=out:st={end - 1.2:.2f}:d=1.2'
        dst = OUT / f'{name}.mp3'
        subprocess.run(['ffmpeg', '-nostdin', '-y', '-loglevel', 'error', '-i', str(p), '-af', af, '-ar', '44100', '-ac', '2', '-b:a', '112k', str(dst)], check=True)
        tracks[name] = f'{name}.mp3'
        print(f'{dst.relative_to(HERE.parent.parent)}  {end:.0f}s  {dst.stat().st_size // 1024} KB')
    for old in OUT.glob('*.mp3'):
        if old.stem not in tracks:
            old.unlink()
    (OUT / 'index.json').write_text(json.dumps(tracks, indent=1) + '\n')


if __name__ == '__main__':
    main()
