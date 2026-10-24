# Art-plate prompt kit

Ask the image AI for **plates**: styled scenes with blank black areas that the renderer fills with real family photos.
Pick one theme per film. The birthday film used a 1980s–90s TV studio, because the star worked in TV. For other films, match the subject
(an apple-picking video could be a vintage orchard / farm-stand / county-fair theme).

## Paste first, every time (adapt the style line to the theme)
```
Match the style of the attached reference image exactly: photorealistic, warm light, [THEME] feel, worn printed-paper texture.
Palette: [4 hex colors]. 16:9 landscape, 1920x1080 or larger. Every photo area, window or screen must be PURE SOLID BLACK (#000000):
flat, rectangular, sharp-edged, no reflections, no glare, no text. No real brand logos. No text unless I specify it.
[If a person appears:] Their face must match the attached reference photos.
```

## Plate types that worked (and what each was for)
| Plate | Use in the edit |
|---|---|
| Hero character art (the star in the theme) with a blank screen | Opening; push into the screen to the first photo |
| Wall of 6–9 blank monitors / frames | Montage that fills one photo at a time; group names in a caption strip |
| 2-up "THEN / NOW" card with blank tabs | Old photo next to a recent one; text added in code |
| Single photo lying on a desk / table | Hero shot of an old print |
| Triptych frame | Three related photos popping in one by one |
| Case / box with a blank cover and title strip | Chapter cards ("GREATEST HITS", trip names) |
| Clapperboard / sign with blank fields | Slate gag; text added in code; flash plus clap sound |
| Station-break bumper with a blank banner | "WE'LL BE RIGHT BACK" between songs, "AND WE'RE BACK!" |
| Diagonal stripes on a TRANSPARENT background | Wipe transition |
| Closing set with a dark area on one side | Scrolling credits and the final card |
| Two chairs with blank backs | Couple's name on each chair, added in code with a perspective warp |

## Tips
- Attach 2–3 clear face references with every request that includes a person; check likeness with `compare.py` (≥ 0.5 is good).
- Ask for blank labels and screens: generated text comes out misspelled, so text and photos are added in code.
- Download full-resolution originals (plates came in at 1672×941, which upscales fine to 1080p).
