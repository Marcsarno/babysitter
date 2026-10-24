---
name: family-video
description: Build a personal family video (birthday tribute, trip or event recap such as apple picking) from the user's photos, clips, AI art and music, in a Claude Code cloud session. Covers face tagging, art-plate compositing, beat and lyric timing, rendering, and delivering one MP4 that downloads on an iPhone. Use when the user wants to sort family photos/videos, recognize who is in them, or edit them into a film set to music.
---

# Family video workflow

This skill comes from a finished 6-minute "birthday TV special" the user loved. Keep its working style:
short, warm updates; check results by looking at real frames; ask before anything sensitive.
`tools/film_template.py` is that project's full renderer and timeline (names replaced by placeholders). Reuse its
engine and replace its TIMELINE section with the new project's shots.

## Ground rules (from the user)
- Photos sent as **face references are reference only**. Never put them in the film unless the user later sends the same photo as film material.
- **Don't invent biography, relationships or captions.** Lyrics and captions use only what the photos show or what the user said. Ask about anything uncertain (nicknames, places, relationships).
- **Ask before using sensitive photos** (hospital, risqué shirts, unflattering shots). The user decides; record the decision.
- If the user says "just tag them as grandkids", don't identify children individually.
- Keep a `PROJECT_NOTES.md` in the scratchpad: facts the user stated, decisions, open questions, rejected photos. Re-read it before edits.
- The user follows along on an **iPhone**: keep replies scannable and send images and videos with SendUserFile.

## Scratchpad layout (the scripts expect this)
```
<scratch>/media/batchNN/  user photos, renamed bNN_MM_<id>.jpg (keep originals untouched)
<scratch>/media/art/      AI art plates (blank black screens/frames get photos composited in)
<scratch>/media/music/    songs
<scratch>/refs/<name>/    face reference photos -> refs/<name>.npy embeddings
<scratch>/work/           analysis json, stills, contact sheets
<scratch>/render/         video chunks;  <scratch>/out/  deliverables
<scratch>/fonts/          period fonts (setup.sh)
```
Start with `bash tools/setup.sh <scratch>` (about 2 minutes).

## Pipeline
1. **Face references:** `enroll.py refs/<name> refs/<name>.npy` for each person; `compare.py refs <imgs>` to test.
   InsightFace buffalo_l, cosine similarity: same person ≥ 0.35 (typical 0.55–0.8), different people < 0.25.
   Add a "young" reference set for decades-old photos (young vs. today only scored 0.35).
2. **Ingest each batch:** `ingest.py refs media/batchNN "<lib globs>" work/batchNN.json` gives people tags, sharpness and duplicates.
   The age estimate is **unreliable for kids**. Build `refs/kids_gallery.npy` from hand-checked child faces; ingest treats a gallery match as a kid.
   Always confirm tags by eye on a contact sheet (montage), since the model misses sleeping babies, backlit faces and small faces.
   Phone uploads are usually re-encoded copies with **no date metadata**, so group by event rather than date.
3. **Art plates:** ask the image AI for a consistent style and **solid-black, flat screens and photo areas, blank labels**.
   `holes.py` finds those areas. In film.py, `holes()` turns each into a perspective quad and mask, and `put_screen()` warps photos in.
   Check every plate: the darkest blob isn't always the screen (use `region=` / `thresh=`). Put text (slates, tape labels, chair backs) on in code, never in the generated art.
4. **Music:** ask for MP3s. Embedded Suno lyrics are the *prompt* lyrics, not proof of what was sung.
   `bargrid.py` gives the beat and bar grid; a self-similarity matrix (see the chorus-repeat lag) finds the repeating chorus.
   **Automatic lyric timing failed:** huggingface.co (Whisper) was blocked, and pocketsphinx can't align singing.
   What worked: estimate lines from bars, render a 45-second preview, and **ask the user to note times from their player**
   ("0:24 back in the day…", "countdown at 0:41"). Three marks were enough to re-time a whole section; they showed my estimate was one bar early.
   "Stops" in the song may be drum fills: check the RMS before cutting there.
5. **Edit:** cuts on downbeats (one bar is about 2 s at 117 BPM) for upbeat songs; 0.9 s crossfades for ballads. Face-aware crops; `mode="fit"`
   (blurred background plus a bordered print) for full-body gags and portraits that crop badly. Titles never over faces.
   Things that landed well: a cold open (TV turns on to color bars, then a clapperboard slate), CRT power-on/off, a camcorder viewfinder REC overlay,
   VCR PAUSE, a countdown leader in a musical stop, "TAKE 1/2/3 – PRINT IT!" over a burst of similar selfies, a station-break bumper
   between two songs, monitor walls filling with photos as names appear, scrolling credits plus a final card using the family nickname.
6. **Check before rendering:** `film.py <scratch> stills t1 t2 …` then a montage, and look at it. Fix, then render.
7. **Render:** `film.py <scratch> frames a b out.mp4` in parallel chunks (`xargs -P4`, about 2.5 fps per worker, so 25 minutes for 6 min of video).
   When something changes, re-render only the affected chunks and concat with `-c copy`. Send a short preview first, then keep going.
8. **Sound:** `mix.py` places songs on the film clock (cut and resume on a downbeat), adds light SFX and a limiter. Claude can't hear the result,
   so say so and check levels/RMS at the joins.
9. **Deliver and verify:** `finish2.sh <scratch> NAME` makes the master, review copy and phone versions, runs a full decode on each, and compares SSIM to the master.
   Pull frames from the *encoded* master at chunk joins and key moments before sending.

## Delivery lessons
- On the iPhone Claude app, a **267 MB file played but showed no download button**; 35 MB files did. Send a ~95 MB 1080p two-pass
  (`-tune stillimage -b:v 1900k`, SSIM 0.98 vs master) plus a ~48 MB fallback, as attachments (`display: "attach"`).
- The scratchpad disappears with the session: remind the user to save the video. Never commit family media, face embeddings or
  names to this repo (it's **public**).

## Song prompts (Suno) that worked
Two songs gave a 6-minute film: an upbeat main song (80s TV-theme rock, ~3:15) and a ballad (~2:55) played in the middle of it during a
"we'll be right back" break. Write lyrics *after* seeing the photos so each line maps to real shots, and include a line-to-photo map.
Spell names phonetically for Suno (a Polish nickname needed "Jah-joo") and keep the real spelling for on-screen text.
See `reference/art-prompts.md` for the art-plate prompt kit.
