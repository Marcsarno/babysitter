# Arianna's Cupcakes — game plan (v2)

A faithful remake of the gameplay of i-Ready's **Cupcake** learning game (originally Motion Math: Cupcake!, 2015), starring Arianna (7) and her Jack Russell Terrier, Baxter. The rules, screens and day loop follow the original. Art, characters, names, writing, music and code are all new, with no i-Ready branding or assets.

Working title: **Arianna's Cupcakes** (Arianna can rename it). It lives at `/cupcake` on the existing site, next to `/mahjong`.

Art prompts are in [`arianna-cupcakes-art-prompts.md`](arianna-cupcakes-art-prompts.md).

---

## Build status

**Playable now at `/cupcake/`**: the full day loop and season.
- **Market:** Corner Market, plus Bulk Barn from day 4. Deals get harder over the season, and picking the worse one brings up the "You could have saved $X — Really?" explainer.
- **Kitchen:** the cupcake designer (cake, frosting, up to two toppings, a name builder, a price with a profit hint) and the oven limit.
- **Baking mini-game:** for each kind of cupcake, hold to pour batter to the fill line, take them out of the oven when golden, hold to pipe frosting to the top line, and tap the topping jars. Each step scores, and the batch gets 1–3 stars. Three-star batches sell for a little more. A "Quick bake" button skips the steps.
- **Street:** people and animals walk by and stop based on taste and price. Spoken word-problem orders, a cash register, order tickets, count-together hints, and "too expensive!" reactions.
- **Delivery:** number line (days 1–10), then the coordinate grid. Easy driving or free steering on the tile-map town, a tip clock, Baxter's sniff trail, and the cab window with Arianna driving and Baxter riding.
- **End of day:** earned, spent and profit; a bar graph and a profit line graph; pricing tips; a money bar that unlocks 12 ingredients.
- **Upgrades:** oven, fridge, sign, menu board, van, decorations and van paint. The season ends at day 40 with a trophy, then free play continues.
- **Extras:** rain days, party days and Baxter's Birthday (dog customers, double tips); the sticker book; read-aloud and sound toggles; Big Kid mode; offline install.
- **Voices:** every line is pre-recorded with Kokoro in the voice cast for whoever says it (picked on the voice casting page; `CAST` in `js/say.js`). Santa narrates the instructions and math help, Arianna says her own lines, and each customer has their own voice: 15 voices and 9,536 lines. `art/cupcake/voice.mjs` records each voice into one pack, pitch-shifted without changing speed, and the game fetches only the bytes of each sentence. Recording resumes after an interruption, and `--pack` ships the voices finished so far. Free-typed cupcake names are shown but not spoken.
- **Music:** Suno tracks for the title, shop, market and kitchen (`art/cupcake/music.py` prepares them). They cross-fade between screens and dip while anyone talks. The driving, end-of-day, season-end, birthday and rainy-day tracks aren't made yet; those screens borrow the shop or title music.
- **Polish:** a loading screen (the opening screens' pictures load first), cross-fades, feelings bubbles, soft shadows, a money counter that rolls, golden-hour light, the doorbell delivery, the goal cheer, a season track, and coins that fly when buying.

**Art:** every round 1–4 picture is in the game (170 pictures):
- Arianna, Baxter and their poses.
- All 13 customers.
- The title and icon.
- The painted shop, kitchen, market, three houses, cozy room and morning street.
- Cupcakes built from the cake, frosting and topping pictures.
- The bowl, piping bag and oven in the mini-game.
- Both vans, recolored in the browser for each van paint.
- The town-map tiles, the shop decorations, the coin, the register and the season trophies.
- Round 4: customers' happy and unsure pictures, batter and liners, feelings bubbles, number-line house fronts, park pieces, ducks and cars, menu frames, the celebration scene and the number-line street.

Any picture that is missing falls back to the code drawing. New art goes in `art/cupcake/` named by its prompt code; `art/cupcake/process.py` cuts it out.

**Not built yet:**
- Regulars who come back and ask for their favorite.
- Carrying several orders per trip (van capacity).
- Negative numbers and fractions in Big Kid mode. Big Kid mode currently means harder word problems, harder deals and the grid sooner.
- The hair salon and toy shop (their empty lots are already in the town). See section 8 for the plan.

## 1. What we know about the original

Neither version is publicly playable, so this comes from the official description, a fan wiki and 2015 reviews. Each fact is marked by how sure we are:
**✔✔** = said by several sources · **✔** = one source · **?** = not documented, so we design it.

| Mechanic | Confidence | Detail |
|---|---|---|
| Run a cupcake *delivery* business; budget, take orders, deliver on a city map's coordinate plane | ✔✔ | Official description |
| Start: $50, a basic cupcake, a 40-day selling season | ✔✔ | |
| Buy ingredients; a second, cheaper vendor appears after a few days; compare deals (e.g. "70 for $30 or 10 for $5") | ✔✔ | |
| Picked the worse deal → bubble "you could have saved $X", tap **"Really?"** for the working | ✔ | |
| Design a cupcake by adding frosting, toppings and flavors to a basic cake; each addition raises its cost; **name it** and **set its price** | ✔✔ | Cupcakes shown from the side |
| Customers are people **and animals** with different tastes, walking along the street outside the shop | ✔✔ | |
| Too high a price → customers complain or refuse; too low → profit suffers. Early on customers accept high prices; **animal customers tolerate higher prices** than people | ✔ | Fan-wiki strategy tips |
| Orders are given as text and spoken aloud; they get harder: word problems, then extra or misleading information | ✔✔ | |
| Type the count into a **cash register**, which prints an **order ticket** | ✔ | |
| Delivery address: a **number line** early, then a **coordinate grid** (from about day 10) | ✔✔ | |
| Drive to the customer against a **clock**; faster = bigger **tips** | ✔✔ | |
| End of day: earned / spent / profit, **bar graph** of sales per cupcake, **line graph** of profit after 3+ days | ✔ | |
| A money bar fills toward a "?" box and unlocks a new flavor or topping | ✔ | |
| Upgrades: oven, fridge, delivery vehicle, **signs**, and other store/factory improvements | ✔✔ | |
| Start on a scooter, later a vehicle | ✔ | Older version |
| Hard math later: mixed numbers, fractions, negatives | ✔✔ | Off by default for us (§3) |
| Exact effect of each upgrade, oven capacity, storage, how customer demand is calculated, day length | **?** | We design these (§2) |

**Reviewers' complaints** we must *not* copy: the driving was hard to control, and the middle of the game felt like "a dull grind."

**What would make it closer to 1:1:** if Arianna can open i-Ready Cupcake at school or at home, take 5–10 screenshots or a short phone video (market, cupcake designer, an order, the delivery map, end of day). That's the only remaining gap.

### What changed from v1 of this plan
- **Added the street.** v1 skipped the side-view street where people and animals walk past and decide whether to stop. That's how the original decides how many customers you get, and it's what the sign upgrade and the price-tolerance rules affect.
- **Added the oven and fridge as limits.** The oven caps how many cupcakes you can bake a day, and storage caps how much you can buy. Without these, the upgrades would mean nothing.
- **Added the hidden numbers.** v1 left the price-tolerance rules out, and they're what makes the original a business game: early-season and animal customers accept higher prices.
- **Added a fun layer** (§4) aimed at the "dull grind" complaint.
- **Changed the art approach.** The style is now flat cartoon (not painterly like Babcia's splash) so pictures and code-drawn cupcakes look like one game. There's a character-sheet-first workflow so Arianna and Baxter look the same in every picture. And Baxter riding in the van with his ears blowing back is now a must-have image, because that's Arianna's #1 wish.

---

## 2. The day loop, screen by screen

One day takes about 5–8 minutes. The season is 40 days, then it keeps going in free play.

### ① Market (morning)
- Three shelves: **Cake**, **Frosting**, **Toppings**. Ingredients come in bundles ("12 cherries for $3"). Everything is counted in **servings** (1 serving = enough for 1 cupcake), so it's easy to see how many cupcakes you can make.
- Days 1–3: one vendor, **Corner Market**. From day 4, a second vendor, **Bulk Barn**, appears, and every item has two deals.
- Picking the worse deal → *"You could have saved $2!"* → **Really?** shows the two deals as coin piles and groups of items, and works out the answer step by step.
- Storage space limits how much you can carry home (the fridge upgrade adds space).
- If you still have enough ingredients, you can skip the market with **"I'm stocked, let's bake!"**

### ② Kitchen (design and bake)
- **Menu board:** 2 cupcake slots to start (more come from upgrades).
- **Designer:** cake flavor → frosting → up to 2 toppings. Each piece drops on with a squish and a sound. A live **"Costs you $X each"** tag updates as you go.
- **Name it:** type a name, or build one from word tiles (*Sparkly · Baxter · Bites*) for a 7-year-old.
- **Price it:** big − / + buttons in whole dollars, with a hint: *"It costs $2 to make. If you sell it for $4, you keep $2."*
- **Bake:** choose how many of each to bake, up to the oven's limit (starts at 10 a day). Batter goes in, cupcakes rise, and they slide onto the display.

### ③ Street (selling)
- A side view of the shop window facing a sunny street. People and animals stroll by. Each one checks the menu: **taste match** (the bear loves chocolate) + **price vs. what they're willing to pay** + **the sign upgrade** (more people stop) → they stop, or they walk on.
  - Willingness to pay starts high and settles lower after the first few days; animals pay more (from the wiki).
  - Too pricey → *"Hmm, too expensive!"* and they leave. Too cheap → they happily buy, and the end-of-day graph shows the lost profit.
- **Order:** the customer says the order out loud and in a bubble. Early orders are *"3 please!"*. Later ones are *"2 for me and 3 for my sister."* Big Kid mode adds extra or misleading information.
- **Cash register:** Arianna taps the number on a big keypad and an **order ticket** prints. If it's wrong, the customer giggles: *"Hmm, let's count together,"* and dots show the problem.
- The customer pays, then gives an **address** → delivery.

### ④ Delivery
- **Find it (the math):** days 1–10 use a **number line** street with houses 0–10 (*"House 7!"*). From day 11 there's a **grid town**, first quadrant up to 6×6 (*"Over 3, up 4"*). Tap the right spot and the house lights up. A wrong tap gets a guided hint.
- **Drive it (the fun):** a top-down **tile-map town**, like the original's delivery map. The town is a grid of tiles (road, intersection, sidewalk, grass, house, park, shop lots), and the camera follows the van around it. The coordinate numbers line up with the streets, so (3, 4) is a real corner of the town.
  - **Steering:** the van turns and drives freely on road tiles. Curbs and buildings are solid: the van slides along them instead of crashing, so it can't get stuck.
  - **"Easy driving" setting** (on to start): the van follows the road and turns at the next corner in the direction Arianna holds. This fixes the original's hard-to-control complaint. Turn it off for free steering.
  - Controls: arrow keys or an on-screen pad, with big buttons for small hands.
  - Tiles are drawn in code (crisp, they line up perfectly, and the town can grow lots for the hair salon and toy shop). The map is a plain grid of tile types, so new towns or a bigger map are just data.
- A **clock ring** counts down. Tip = 3, 2 or 1 coins depending on time left. It never hits zero, so there's always a tip.
- **Cab window** (bottom corner, always visible): Arianna at the wheel, and Baxter in the passenger seat with his ears blowing back.
- **"Baxter, sniff it out!"** button: Baxter sniffs and barks, and a paw-print trail appears toward the house (3 per day).
- **Doorstep:** the van pulls up, Arianna hands over the box, the customer cheers, the tip coins fly and Baxter wags. The van zips back to the shop automatically, with no return drive.
- **Van capacity upgrade** (our design): carry 2–3 orders per trip for a combo bonus.

### ⑤ End of day
- **Earned · Spent · Profit**, counted up with coin sounds.
- **Bar graph:** cupcakes sold of each design. **Line graph:** profit over the days (from day 3).
- **Money bar** fills → "?" box pops → a new flavor or topping unlocks.
- **Upgrade shop:**
  - **Oven**: bake more per day
  - **Fridge/pantry**: more storage
  - **Van**: faster, more boxes, new paint
  - **Sign**: more people stop
  - **Menu board**: more cupcake slots
  - **Decorations**: just for looks
- Baxter naps on the rug. **Save** happens automatically.

### ⑥ Season end (day 40)
- Season total, best day, best-selling cupcake, and a trophy (bronze/silver/gold by profit). Then free play continues.

---

## 3. Made for a 7-year-old (2nd grade)

The original spans grades 2–6, and one parent review called it best for ages 8+. Arianna's version uses the same mechanics, with numbers sized for her. **Big Kid mode** (off) brings in the original's harder content.

| Days | Orders | Deliveries | Market deals | Money |
|---|---|---|---|---|
| 1–5 | "3 please" (1–6) | Number line 0–10 | One vendor | Prices $1–$5 |
| 6–10 | Add within 10: "2 and 3" | Number line 0–10 | Same amount, different price: "6 for $4 or 6 for $3?" | |
| 11–20 | Add/subtract within 20 | Grid 4×4 | Doubling: "4 for $2 or 8 for $5?" | |
| 21–40 | Equal groups: "2 boxes of 3"; one extra detail to ignore | Grid 6×6 | Small unit prices | Up to $10 |
| Big Kid | Multi-step, misleading info | Grid with negatives, halves | Any rates | |

- **Read-aloud everywhere**: tap any bubble to hear it.
- **No losing**: wrong answers get a count-together walkthrough. A bad day still pays something.
- **Big buttons**, portrait layout, works on phone or tablet.

---

## 4. The fun layer (on top of the loop, without changing it)

- **Baxter is a character, not decoration.** He sniffs out houses, barks at squirrels during drives, sometimes catches a cupcake someone drops, begs at the counter, and naps on the results screen.
- **Neighbor sticker book:** every customer you serve becomes a sticker (the bear, the grandma, the cat in a sweater…). **Regulars** come back and ask for their favorite by name.
- **Juicy feedback:** squishy frosting, sprinkle showers, cha-ching coins, confetti on big tips, and the van bouncing over speed bumps.
- **Special days:** a birthday-party order (a big equal-groups order), a rainy day (fewer people out), and **Baxter's Birthday** (dog customers only!).
- **Daily goal star:** *"Sell 8 cupcakes today"*, which gives a quick reason to try.
- **Short days**, so it never becomes a grind.

---

## 5. Art approach

**Most of it is code, which is how it has to be:** cupcakes (every combination of cake, frosting and toppings, animated), the street, town map, number line, grid, van (top-down and side), market, register, tickets, graphs, coins and customers (built from mix-and-match parts, so there's lots of variety).

**Generated images, for what code draws worst:** Arianna's and Baxter's faces and poses, Baxter riding in the van, the title screen and the app icon. The full prompts are in `arianna-cupcakes-art-prompts.md`.

- **Style** is **flat cartoon with bold outlines**, the same look the code draws, so pictures and code-drawn cupcakes match.
- **Character sheets first**, made from real photos. Every other pose uses the chosen sheet as a reference, so Arianna and Baxter look the same everywhere.
- The game runs with code-drawn stand-ins until the images arrive, and each image drops in as it comes.

---

## 6. Build phases

Tech: plain JavaScript + Canvas 2D in `public/cupcake/`. It's an installable offline app with progress saved on the device, and sound starts muted. Game logic (economy, demand, orders, deals, difficulty) is kept separate from drawing and covered by `node --test`.

| Phase | Deliverable | Playable checkpoint |
|---|---|---|
| 0. Skeleton | Scene flow (title → day → results), save, read-aloud, sounds, stand-in Arianna and Baxter | Title screen |
| 1. Kitchen | Cupcake renderer and designer, name builder, pricing, oven | Design, price and bake |
| 2. Market | Servings, storage, vendors, deal ladder, "Really?" explainer | Shop for ingredients |
| 3. Street | Foot traffic, taste/price/sign demand, spoken word-problem orders, register and tickets, reactions | Sell to customers |
| 4. Delivery | Number line → grid find step, rail driving, clock and tips, cab window, sniff hint, doorstep scene | **Full day loop** |
| 5. Growth | Results and graphs, money-bar unlocks, upgrade shop, difficulty by day | Day after day |
| 6. Season and fun | 40-day season, trophy, sticker book, regulars, special days, Big Kid mode, music, image swap-in, tests, deploy | Ready for Arianna |

Each phase goes live so Arianna can play it and steer.

**Later add-ons:** the **hair salon** and **toy shop** go on empty lots in the same town and use the same order → deliver → profit system.

### Staying separate from Mahjong and Kayla's Little Chaos (shared website)
- **Files:** everything goes in `public/cupcake/`. Nothing in `public/mahjong/` or `src/` is touched.
- **Save key:** `ariannaCupcakes.save.v1`. Mahjong uses `tilebloom.save.v1` and Little Chaos uses `littleChaosBest`.
- **Offline copy:** the service worker is scoped to `/cupcake/`. Its cache names start with `cupcake-` and never end in `-core`, because Mahjong's worker deletes other caches ending in `-core`.
- **App icon:** a separate manifest and icon, so it installs as its own app.
- **Image format:** game art ships as `.webp`. `.vercelignore` keeps only the root-level PNGs (`/*.png`) and the art sources (`/art/`) off the live site, so PNGs under `public/` (like Mahjong's icons) still ship.
- **Publishing:** the whole site is built and tested before every push, so a cupcake change can't hold up Mahjong updates.

---

## 7. Questions for Arianna (none block the start)
1. Shop name?
2. Van color? (Default: pink with a mint stripe.)
3. Her first flavors and toppings? (Default: vanilla, chocolate and strawberry cake; pink, white and chocolate frosting; sprinkles, cherry, gummy bear.)
4. Baxter's bandana color? (Default: mint green, so he stands out against the pink van.)
5. Her outfit in the game? (Default: pink baker's apron over a mint t-shirt.)

## 8. Next: the hair salon and toy shop (agreed plan)

**Rule one: the cupcake shop stays exactly as it is.** The new shops add to the game and never change cupcake gameplay. Her saved game, stickers, trophies and upgrades carry over untouched.

**How they fit in**
- **Building fund jar:** she chooses to drop savings into a jar. When it's full, Builder Bo builds the shop on one of the two fenced lots, followed by a grand opening. The jar teaches saving, and the usual cupcake upgrades stay just as reachable. Pacing targets: the salon opens around day 12, the toy shop around day 25.
- **Shop days are bonus days:** they don't use up the 40-day cupcake season. A nudge on the day card ("3 appointments booked at the salon!") helps her choose; there's no calendar.
- **Same town and people:** the same customers, voices, van, money and sticker book are shared, and the end-of-day graph shows profit by shop.

**One short loop per shop, two math topics, one per step**
- **Hair salon:** book on the clock, then cut and style. Prices are whole dollars, and payment happens on its own.
  - **Telling time** when booking, in steps over the season: o'clock, then half past, then quarter past and to, then 5-minute times. The digital time shows beside the clock face at first, then fades out.
  - **Measuring** when cutting: "It's 9 inches. Make it 6!" She snips at the ruler mark, which is 9 − 3.
  - People get styled; animals get groomed in the same flow. Clients leave in their painted happy pose with a drawn-on bow or sparkle.
- **Toy shop:** stock the shelves, then sell.
  - **Tens and ones** when stocking: toys come in boxes of 10 plus loose ones.
  - **Counting coins** when paying: customers hand over quarters, dimes, nickels and pennies, and she checks the amount. Making change is a Big Kid mode option.
  - Occasional events: a toy survey picture graph, gift wrapping in halves and fourths, and party deliveries in the van.
- **No fail states and no countdown timers.** Mistakes get hints, as with cupcakes.

**Kept small on purpose**
- **Voices:** the narrator (one voice) says every number. Customers get about 10 short number-free lines each. Toy prices go in 5-cent steps. That's about 700 clips (about 6 MB) per shop, roughly an hour of recording.
- **Art:** about 12 pictures for the salon, about 15 for the toy shop, and about 4 shared (a construction site, Builder Bo with a hammer, and two map roofs). Customers reuse their happy pictures; the haircut happens on one painted hair piece.

**Order: the gameplay is built first, and the art comes after she has tried it**
1. **Foundation, no new art:** her saved game updated safely, the fund jar, the shop picker and nudge, and Builder Bo's construction moment with a stand-in picture. Plus a full-screen iPad layout if that's her device.
2. **Salon prototype** with drawn stand-ins. Arianna tries it.
3. **Salon finished:** its art prompts, voices, then it goes live.
4. **Toy shop prototype.** Arianna tries it.
5. **Toy shop finished:** art, voices, live.

**A shop is done when** a day takes 8 minutes or less, there's no way to fail, every line is voiced, the play-through test covers a full day, her saved game carries over, and she has played it once without getting confused.

**Decided:** she plays on a phone (no tablet layout needed), and the shops unlock with the building fund jar.

**Progress**
- Step 1 done, behind a preview switch: open the game once with `?shops` (`?shops=0` hides it again; Settings also gets a "Build the next shop now" shortcut for trying it). The jar opens after day 4: the salon costs $100 and the toy shop $220, and $30 always stays out of the jar for the market. Builder Bo's construction moment, the roofs on the map and the morning picker are all in. Her old saved game carries over, and a copy from before the shops is kept under `ariannaCupcakes.save.v1.before-shops`.
- Step 2 salon prototype done, with drawn stand-ins:
  - **A day:** one client per booking (3 on opening day, then one more for each cupcake day, up to 5).
  - **Each client:** set the clock, snip at the ruler, then pick a bow, sparkles or a flower. Each client pays $7.
  - **Clock difficulty, by salon days played:** o'clock first, then half past, then quarter past and to, then any 5 minutes. The digital time shows for the first 3 salon days.
  - **Cutting:** "make it 6" for the first 2 salon days, then "cut off 3" as well.
  - Next: Arianna tries it.

