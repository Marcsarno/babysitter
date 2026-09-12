# Kayla’s Little Chaos

An original, portrait-first Three.js babysitting game. Kayla cares for Harper (4), Jax (1½), and sisters Arianna (7) and Lilah (2).

## Play

- Tap a need in the house to walk to its next step, then hold **HELP**. Completed care earns stars and combo bonuses.
- Walk with the touch joystick, WASD, arrows, or a tap on the floor. Space helps; number keys select needs.
- The isometric camera follows Kayla. The view button shows the whole property.
- The phone button (keyboard **P**) offers an optional MomLife selfie. Hold HELP to pose for 3.5 seconds: a fictional funny post earns five stars, but household timers continue. There is a 40-second cooldown.
- Pause with Escape or the pause button. Hiding the page pauses the game.
- A timed day lasts three minutes. Cozy mode removes deadlines. Later days get busier.

Prepare fruit, collect a child, and serve a snack; gather a bubble explorer, scrub, and towel off; find a teddy, tuck in, and read a story. Other situations include crayon oceans, sofa spaceships, flying socks, soup surprises, juice puddles, and wiggle emergencies. Tasks visibly begin, change as Kayla works, and end with reactions and stars.

Harper loves make-believe. Jax is curious and snack-motivated. Arianna builds things, confidently helps, and can speed up nearby care when she is free. Lilah often follows her sister. Children walk to care stations, eat after feeding, and rest after bedtime. Sound starts muted.

## House and characters

The connected kitchen, dining room, living room, and family play studio form the shared center. Bedrooms have their own openings from the shared space; a service wing contains the bathroom and laundry. Furniture leaves navigable routes and open play areas. The side entrance connects to the driveway, family car, grass, trees, flower planters, sandpit, patio, loungers, and fenced backyard pool. Outdoor areas are scenery; childcare navigation stays indoors.

All geometry was made in Blender 5.2.1 through its desktop Python Console, then exported as GLBs. The original rounded characters have articulated shoulders, elbows, hips, knees, head and torso, expressive faces, fingers, shoes, hairstyles, and blinking/sleeping eyelids. Kayla, Harper, Jax and Lilah are blonde; Arianna has brown hair. Runtime animation drives the exported joints for walking and each care activity. These are original stylized characters, not licensed film assets.

## Development

Node.js 22.12+ is recommended.

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
```

pnpm is also supported with the included lockfile. Production output is `dist/`. The native Vite config loader avoids a Windows sandbox/esbuild config-discovery issue.

- `art/little-chaos.blend`: editable house, yard, cast and action props.
- `art/build_assets.py`: reproducible Blender source; resolves paths relative to itself.
- `public/assets/*.glb`: house, individual characters and reusable chore props.
- `public/assets/navigation.json`: room bounds, walk regions and furniture obstacles exported with the house.
- `src/animation.js`: articulated walk, idle, care, selfie, celebration, eating and sleeping poses.
- `src/effects.js`: held tools and task onset/progress/completion effects.
- `scripts/pack-assets.js`: lossless gzip packaging, run automatically before builds.

## Mobile performance and verification

The detailed GLBs total 11.24 MB uncompressed and approximately 2.33 MB for download. Supported browsers decode the compressed files using DecompressionStream; other browsers load the original GLBs. The static house is merged into one vertex-painted mesh while character joint hierarchies remain intact. Pixel ratio is capped at 1.5; battery saver uses 1. Contact shadows replace realtime shadow maps. Effects have bounded lifetimes and burst counts.

Tests verify room-to-room and station routing, obstacle and outdoor boundaries, every chore stage, ratings, GLB validity, the character rigs, requested hair colors, and distinct animated poses. Desktop browser tests exercise mobile viewports, touch controls, keyboard controls, feeding, cleanup, pause, animated bathing, and the selfie timer tradeoff. Physical iPhone and Android performance still needs device testing.

High scores save on the device. Social posts are fictional game events; there are no accounts, external posting, ads, payments, or analytics. Google Fonts is optional with system fallbacks.

## Deployment

Production: https://babysitter-two.vercel.app

GitHub: `Marcsarno/babysitter`, linked to the Vercel `babysitter` project. Pushes deploy through Vercel, or use `vercel --prod` from this directory after signing in. No environment variables are required. Blender source and test screenshots are excluded from deployment.
