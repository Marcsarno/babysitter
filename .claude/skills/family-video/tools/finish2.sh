#!/bin/bash
# Usage: finish2.sh <scratch> [NAME]. Edit jobs_56 to the chunk ranges that changed (or render all chunks first).
# Rebuilds master (CRF19) + 540p review + ~95MB and ~48MB 1080p phone versions (iPhone in-app download needs small files), verifies each.
set -e
NAME=${2:-Family_Film}   # output file prefix
S=$1; R=$S/render; O=$S/out
cat > $R/jobs_56.txt <<J
239.1000 263.0000 $R/chunk_5a.mp4
263.0000 286.9333 $R/chunk_5b.mp4
286.9333 310.8000 $R/chunk_6a.mp4
310.8000 334.7000 $R/chunk_6b.mp4
J
cd /tmp && cat $R/jobs_56.txt | xargs -P4 -L1 sh -c 'python3 -I '"$S"'/tools/film.py '"$S"' frames $0 $1 $2 > $2.log 2>&1'
grep -h "^done" $R/chunk_5a.mp4.log $R/chunk_5b.mp4.log $R/chunk_6a.mp4.log $R/chunk_6b.mp4.log
for c in 0 1 2 3 4 5a 5b 6a 6b 7; do echo "file '$R/chunk_$c.mp4'"; done > $R/concat.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i $R/concat.txt -c copy $R/video_joined.mp4
V="-profile:v high -level 4.1 -pix_fmt yuv420p -color_primaries bt709 -color_trc bt709 -colorspace bt709"
T='-metadata title=$NAME'
ffmpeg -y -loglevel error -i $R/video_joined.mp4 -i $S/work/soundtrack.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 19 -maxrate 14M -bufsize 28M $V \
  -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart $T $O/${NAME}_1080p.mp4
ffmpeg -y -loglevel error -i $O/${NAME}_1080p.mp4 -vf scale=960:-2 -c:v libx264 -preset slow -crf 27 -c:a aac -b:a 128k -movflags +faststart $O/${NAME}_review_540p.mp4
two_pass () {  # $1 kbps video, $2 kbps audio, $3 maxrate, $4 out
  mkdir -p $R/pl; cd $R/pl
  ffmpeg -y -loglevel error -i $R/video_joined.mp4 -c:v libx264 -preset slow -tune stillimage -b:v ${1}k -maxrate $3 -bufsize 8M $V -pass 1 -passlogfile $R/pl/p -an -f null -
  ffmpeg -y -loglevel error -i $R/video_joined.mp4 -i $S/work/soundtrack.wav -map 0:v -map 1:a -c:v libx264 -preset slow -tune stillimage -b:v ${1}k -maxrate $3 -bufsize 8M $V \
    -pass 2 -passlogfile $R/pl/p -c:a aac -b:a ${2}k -ar 48000 -shortest -movflags +faststart $T $4
}
two_pass 1900 160 4M $O/${NAME}_1080p_phone.mp4
two_pass 880 128 2500k $O/${NAME}_1080p_small.mp4
for f in $O/${NAME}_*.mp4; do
  echo "== $(basename $f)"; ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,nb_frames -of compact $f
  ffmpeg -v error -i $f -f null - && echo "full decode: OK"
done
for f in phone small; do echo "SSIM $f vs master:"; ffmpeg -i $O/${NAME}_1080p_$f.mp4 -i $O/${NAME}_1080p.mp4 -lavfi "[0:v][1:v]ssim" -f null - 2>&1 | grep -o "All:[0-9.]* ([0-9.]*)"; done
