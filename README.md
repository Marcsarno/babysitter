# Kayla’s Little Chaos

A portrait-first, original Three.js babysitting time-management game. Kayla cares for Harper (4), Jax (1½), and sisters Arianna (7) and Lilah (2) in a furnished eight-room dollhouse.

## Play

- Tap a task card to automatically walk to its next step. Hold **HELP** at the destination.
- Walk manually with the touch joystick, WASD, or arrow keys. Hold Space to help. Number keys select tasks.
- Tap the floor to walk there. **＋** toggles a close-up camera that follows Kayla.
- Pause with the top-right button or Escape. Timers automatically pause when the page is hidden.
- A day lasts three minutes. Finish chores before their individual timers expire, earn combo stars, and play progressively busier days.
- Cozy mode removes timers. No game-over punishment; an expired task means a bigger mess and a happiness penalty.

Chores include multi-step snack preparation and feeding, bath time, naps and stories, crayon cleanup, pillow spaceships, sock confetti, soup stirring, juice spills, and silly dancing. Kids wander independently when they are not busy; Lilah often follows Arianna. Children follow Kayla for feeding, bathing, and bedtime. Sound is optional and starts muted.

## Development

Node.js 22.12+ recommended.

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
```

Or use pnpm with the included lockfile. The native Vite config loader avoids a Windows sandbox/esbuild config-discovery issue. The production output is `dist/`; `vercel.json` configures the Vite build.

## Original Blender assets

All character and house prop geometry was created in Blender 5.2.1, through its desktop UI Python Console. These are not downloaded character models.

- `art/little-chaos.blend`: editable Blender scene with the furnished house and five characters.
- `art/build_assets.py`: reproducible asset source. Run it in Blender to regenerate the scene and exports. It resolves output paths relative to itself.
- `public/assets/house.glb`: furniture and architecture.
- `public/assets/{kayla,harper,jax,arianna,lilah}.glb`: individual characters.
- `public/assets/navigation.json`: room and obstacle data generated with the house.

The exported geometry uses soft, low-poly shapes, original warm colors, and simple materials. The game combines materials into vertex colors at load time: approximately 35 draw calls and 58,500 triangles in the overview, with GLB downloads totaling about 2.5 MB. Pixel ratio is capped at 1.5; battery saver uses 1. No real-time shadow maps or postprocessing. Movement uses collision-aware grid pathfinding.

## Verification and limits

Tests cover all room/station paths, chore stage progression, difficulty limits, star ratings, and GLB validity. Browser playtests cover multi-step feeding, cleanup, keyboard controls, pointer joystick, pause, and JavaScript errors at a 390×844 mobile viewport.

This is a playable first version. Characters use procedural bob/waddle animation rather than skeletal animation. Performance has been checked in desktop mobile emulation; physical iPhone/Android testing is still needed. High scores save locally; there are no accounts, ads, payments, or analytics in the game. Google Fonts is optional, with system-font fallbacks.

## Deployment

Push this repository to `Marcsarno/babysitter`, then import it in Vercel using the Vite preset, or run `vercel --prod` from this directory after signing in. No environment variables are required. The source `.blend` is kept in Git but excluded from deployment uploads.
