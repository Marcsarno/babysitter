# Arianna's Cupcakes — game plan (v2)

A faithful remake of the gameplay of i-Ready's **Cupcake** learning game (originally Motion Math: Cupcake!, 2015), starring Arianna (7) and her Jack Russell Terrier, Baxter. The rules, screens and day loop follow the original. Art, characters, names, writing, music and code are all new, with no i-Ready branding or assets.

Working title: **Arianna's Cupcakes** (Arianna can rename it). It lives at `/cupcake` on the existing site, next to `/mahjong`.

Art prompts are in [`arianna-cupcakes-art-prompts.md`](arianna-cupcakes-art-prompts.md).

---

## Build status

**Playable now at `/cupcake/`**: the full day loop and season.
- **Market:** Corner Market, plus Bulk Barn from day 4. Deals get harder over the season, and picking the worse one brings up the "You could have saved $X — Really?" explainer.
- **Kitchen:** the cupcake designer (cake, frosting, up to two toppings, a name builder, a price with a profit hint), the oven limit, and baking.
- **Street:** people and animals walk by and stop based on taste and price. Spoken word-problem orders, a cash register, order tickets, count-together hints, and "too expensive!" reactions.
- **Delivery:** number line (days 1–10), then the coordinate grid. Easy driving or free steering on the tile-map town, a tip clock, Baxter's sniff trail, and the cab window with Arianna driving and Baxter riding.
- **End of day:** earned, spent and profit; a bar graph and a profit line graph; pricing tips; a money bar that unlocks 12 ingredients.
- **Upgrades:** oven, fridge, sign, menu board, van, decorations and van paint. The season ends at day 40 with a trophy, then free play continues.
- **Extras:** rain days, party days and Baxter's Birthday (dog customers, double tips); the sticker book; read-aloud and sound toggles; Big Kid mode; offline install.

**Art:** Arianna and Baxter come from the two character sheets. Every other pose uses a stand-in from the sheets until its picture arrives. Customers are drawn in code until C1–C8 arrive.

**Not built yet:**
- Regulars who come back and ask for their favorite.
- Carrying several orders per trip (van capacity).
- Background music.
- Negative numbers and fractions in Big Kid mode. Big Kid mode currently means harder word problems, harder deals and the grid sooner.
- The hair salon and toy shop (their empty lots are already in the town).

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
- **Image format:** game art ships as `.webp`. `.vercelignore` has a `*.png` rule that keeps every PNG off the live site, including ones under `public/`. Mahjong's `favicon.png` returns 404 in production because of it.
- **Publishing:** the whole site is built and tested before every push, so a cupcake change can't hold up Mahjong updates.

---

## 7. Questions for Arianna (none block the start)
1. Shop name?
2. Van color? (Default: pink with a mint stripe.)
3. Her first flavors and toppings? (Default: vanilla, chocolate and strawberry cake; pink, white and chocolate frosting; sprinkles, cherry, gummy bear.)
4. Baxter's bandana color? (Default: mint green, so he stands out against the pink van.)
5. Her outfit in the game? (Default: pink baker's apron over a mint t-shirt.)
