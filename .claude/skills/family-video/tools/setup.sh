#!/bin/bash
# One-time setup for a cloud session. Usage: bash setup.sh <scratchpad_dir>
# Installs the face, audio and image tools and fetches the period fonts into <scratch>/fonts.
set -e
S=${1:?usage: setup.sh <scratchpad_dir>}
mkdir -p "$S"/{media/music,media/art,refs,work,render,out,fonts,tools}
cd /tmp
pip install -q --break-system-packages insightface onnxruntime opencv-python-headless librosa soundfile matplotlib pocketsphinx 2>&1 | grep -v WARN || true
(apt-get update -qq >/dev/null 2>&1; apt-get install -y -qq libimage-exiftool-perl imagemagick >/dev/null 2>&1) || true
# Fonts: Google Fonts' GitHub raw URLs were blocked by the proxy; npm packages work.
mkdir -p "$S/fonts/npm" && cd "$S/fonts/npm"
for p in @fontsource/vt323 @fontsource/oswald @fontsource/roboto-slab; do npm pack -q $p >/dev/null 2>&1; done
for t in *.tgz; do d=${t%.tgz}; mkdir -p $d && tar xzf $t -C $d; done
cp */package/files/{roboto-slab-latin-700,vt323-latin-400,oswald-latin-700,oswald-latin-400}-normal.woff "$S/fonts/"
# Face model (buffalo_l) downloads from GitHub releases on first use; warm it now.
python3 -c "from insightface.app import FaceAnalysis; FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider']).prepare(ctx_id=-1)" >/dev/null 2>&1
cp "$(dirname "$0")"/*.py "$(dirname "$0")"/*.sh "$S/tools/" 2>/dev/null || true
echo "ready: ffmpeg $(ffmpeg -version | head -1 | cut -d' ' -f3), exiftool $(exiftool -ver 2>/dev/null), fonts in $S/fonts"
# Optional, for automatic lyric timing: faster-whisper needs huggingface.co, which was blocked by the
# environment's network policy. Ask the user to allow it (environment settings -> Network access) before relying on it.
