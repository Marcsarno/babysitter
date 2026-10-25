# Arianna's Cupcakes — game plan

A faithful remake of the gameplay loop of i-Ready's **Cupcake** learning game (originally Motion Math: Cupcake!, 2015), starring Arianna (7) and her Jack Russell Terrier, Baxter. The mechanics follow the original. Art, names, writing and code are all new, with no i-Ready branding or assets.

Working title: **Arianna's Cupcakes** (Arianna can rename it).
Lives at `/cupcake` on the existing Vercel site, next to `/mahjong`.

---

## 1. What the original game is

Research sources: the official i-Ready Learning Games page, the i-Ready fan wiki, and 2015 reviews of Motion Math: Cupcake! (Common Sense Media, EdSurge, Horn Book, Science Kid AU, Children's Technology Review). The official page summarizes it this way: students *"run a cupcake delivery business… budget for ingredients, take increasingly complex orders, and make deliveries on the coordinate plane of a city map."*

### The core loop (one in-game day)

| Step | What happens in the original | Math it teaches |
|---|---|---|
| **1. Market** | Buy ingredients from vendors. After a few days a second vendor appears and you choose the better deal ("70 for $30 or 10 for $5?"). If you pick the worse deal, a bubble shows how much you could have saved, and tapping **"Really?"** explains the working. | Unit price, comparing rates, budgeting |
| **2. Design** | Start with a basic cake. Add frosting, toppings and flavors. Each one adds to the cost of the cupcake. Name the cupcake and **set its price**. | Cost plus profit |
| **3. Shop / orders** | Customers (people *and* animals, with different tastes) come in and say what they want, both in a text bubble and aloud. Orders start simple and become word problems ("2 for me and 3 for my sister"), later with extra information or numbers that are deliberately misleading. You type the count into a **cash register**, which prints an order ticket. If the price is too high, customers complain or refuse. If it is too low, profit suffers. | Word problems, addition, subtraction, multiplication |
| **4. Delivery** | Each customer gives an address. At first it is a point on a **number line**. Around day 10 it becomes a point on a **coordinate grid** city map. You find the spot, then drive there against a clock. Faster deliveries earn bigger tips. You start on a scooter and later upgrade to a vehicle. | Number line, coordinate plane |
| **5. End of day** | A results screen shows money earned, money spent and profit. A **bar graph** shows cupcakes sold of each type. After 3 or more days, a **line graph** shows profit over time. | Reading graphs |
| **6. Upgrades** | Spend savings on a better oven, fridge, delivery vehicle, shop sign and so on. A "money bar" fills as you earn, and each time it reaches a "?" box it unlocks a new flavor or topping. | Saving toward a goal |

The season lasts **40 days**. You start with **$50**, one oven, a basic cupcake and a scooter.

**Known weak spots in the original:** reviewers disliked the hard-to-control driving and the slow pace between orders. We fix both (see §4).

**Gaps in my research:** exact numbers (oven capacity, spoilage, the price/demand formula) aren't published, so I'll design sensible values. If Arianna can use i-Ready at school, a few screenshots or a short phone video of the real game would let me match it more closely. That's the only thing I'd ask for to get closer to "1:1."

---

## 2. Arianna's version — what stays the same and what changes

**Stays the same:** the whole 6-step loop, the 40-day season, $50 start, two competing vendors with the "You could have saved $X. Really?" explainer, cupcake designer with name and price, spoken and written orders, cash-register entry, price reactions, number line → coordinate grid deliveries, speed tips, end-of-day bar and line graphs, upgrades, and unlocks from the money bar.

**Changes for a 7-year-old and for Arianna:**

- **The van from day one.** There's no scooter. Arianna drives a little delivery van with **Baxter in the passenger seat**. A small cab window in the corner of the delivery screen always shows the two of them: Baxter's ears flap when the van moves, and he barks when they arrive. Van upgrades make it faster, bigger (carries more boxes) and fancier (paint, bow on the roof).
- **Baxter is useful.** A **"Baxter, sniff it out!"** hint button makes him bark and point toward the delivery house. This replaces the original's on-screen cues. He also sits on the shop counter, reacts to customers, and naps on the end-of-day screen.
- **2nd-grade difficulty curve** (the original covers grades 2–6):
  - Orders: addition and subtraction within 20, then "equal groups" (2 boxes of 3). An optional **Big Kid** setting adds the original's harder problems with extra information.
  - Deliveries: houses 0–10 on a number line, then a first-quadrant grid up to 6×6 ("go over 3, up 4"). Negative numbers and fractions are off unless Big Kid mode is on.
  - Money: whole dollars only. Vendor deals start with the same quantity at different prices ("6 for $4 or 6 for $3?") and later compare different quantities.
- **Read-aloud everywhere.** Every bubble can be tapped to hear it, using the device's built-in voice. Short sentences and big buttons.
- **No-lose design.** A wrong answer gets a gentle "Let's count together" walkthrough instead of a penalty. A bad day can still end in a small profit.
- **Easier driving.** The van stays on the roads: hold an arrow (or the on-screen pad) and it drives, turning at the next corner. Arianna can't crash or get stuck.

---

## 3. Can it look good with code alone?

**Yes, for almost everything.** The original is flat 2D vector illustration, which code draws well. The most important visual, the cupcake, *has* to be drawn by code anyway, because Arianna can mix any cake + frosting + topping and a fixed image can't cover every combination.

| Element | Drawn in code? | Notes |
|---|---|---|
| Cupcakes (wrapper, cake, frosting swirl, sprinkles, cherries, candles…) | ✅ Code (required) | Any combination, animated (bounce, sparkle, steam) |
| Town map, roads, houses, trees, number line and grid | ✅ Code | Clean and crisp at any screen size. Lots are left empty for the future hair salon and toy shop |
| Van (on the map and in side view) | ✅ Code | Spinning wheels, Baxter's flapping ears, delivery-box stacks |
| Market, register, order tickets, graphs, buttons, coins | ✅ Code | |
| Customers | ✅ Code (mix-and-match parts) | Lots of variety: kids, grown-ups, a bunny, a cat, a bear… |
| **Arianna and Baxter portraits** | ⚠️ Code version works, art looks much better | Faces and likeness are where code drawings look like clip art |
| **Title screen** | ⚠️ Art makes the first impression | |
| Shop interior background | Optional art | A code version is fine |

**Recommendation:** build the whole game with code-drawn art first, so it's fully playable without waiting on anything. Each character is a swappable slot, so when your images arrive I drop them in and the game uses them. The ~10 images in §5 are what would move it from "clean and cute" to "storybook quality." The most important are Arianna and Baxter.

---

## 4. Build plan

Tech: plain JavaScript + Canvas 2D, a standalone folder `public/cupcake/` like Mahjong. It's an installable offline app with saved progress on the device, sound off by default, and portrait-first for a phone or tablet. Game logic (economy, orders, deals, demand) is kept separate from drawing so `node --test` can test it.

| Phase | Deliverable | Playable checkpoint |
|---|---|---|
| **0. Skeleton** | `/cupcake` page, scene manager (title → day → results), save/load, read-aloud, tap sounds, code-drawn Arianna and Baxter | Title screen; tap to start |
| **1. Cupcake designer** | Procedural cupcake renderer; choose cake, frosting, topping; ingredient cost shown live; name it; set price | Design and price a cupcake |
| **2. Market** | Inventory, vendors, deals that get harder, the "You could have saved $X — Really?" explainer, $50 starting budget | Shop for ingredients |
| **3. Orders** | Customer generator (tastes, patience, price tolerance), spoken and written word problems, cash register, order tickets, price reactions (😊 / 😐 / "Too expensive!") | Serve a line of customers |
| **4. Delivery** | Number line, then coordinate grid; tap the address first (the math check), then drive the van on roads to the house; timer and tips; Baxter's cab window and sniff hint; doorstep hand-off scene | Full day loop works |
| **5. End of day and growth** | Earned / spent / profit, bar graph, profit line graph, money-bar unlocks (new flavors and toppings), upgrade shop (oven = more per day, fridge = ingredients keep, van = speed and capacity, sign = more customers) | Day after day |
| **6. Season and polish** | 40-day season with difficulty ramp, Big Kid mode, music and sound effects, celebrations, season-end award, tests, deploy | Ready for Arianna |

Each phase ships to the live site so Arianna can try it and give feedback as we go.

**Later add-ons (not now):** a **hair salon** and a **toy shop**. The town map already has empty lots, so these become new buildings Arianna can open with her cupcake savings, each with its own mini business that reuses the same order → deliver → profit system.

---

## 5. Images I'd like from you (optional, but they make a big difference)

**How to make them:**
- Use the **same image tool and the same style sentence** for all of them so they match.
- If your tool lets you attach a reference photo, attach a photo of Arianna and one of Baxter. That's how they'll actually look like *her* and *him*. (Jack Russells' patches are all different.)
- Ask for a **transparent background (PNG)**. If your tool can't do that, ask for a **plain flat white background** and I'll cut them out.
- **No words in the images.** I'll draw the title and labels in code so they're always spelled right and Arianna can rename the shop.

**Style sentence (put at the start of every prompt):**
> *Children's storybook cartoon illustration, clean bold outlines, soft cel shading, bright cheerful pastel palette (strawberry pink, mint green, buttercream yellow, sky blue), warm and friendly, consistent character design, full body unless stated, no text, no words, no letters.*

### Must-have (biggest quality jump)

1. **Arianna — main pose.** *[style sentence]* A cheerful 7-year-old girl with brown hair (match the reference photo), wearing a pink baker's apron with a little cupcake patch over a casual outfit, smiling and waving, standing, facing the viewer at a slight angle. Transparent background.
2. **Arianna — holding a cupcake box.** Same girl and outfit, proudly holding a pink cupcake delivery box with both hands, big smile. Transparent background.
3. **Arianna — thinking.** Same girl and outfit, finger on her chin, looking up thoughtfully. Transparent background.
4. **Arianna — celebrating.** Same girl and outfit, jumping with both arms up, overjoyed. Transparent background.
5. **Baxter — sitting.** *[style sentence]* A Jack Russell Terrier dog, mostly white with brown and tan patches (match the reference photo), wearing a little pink bandana, sitting up alert with a happy open mouth and tongue out, tail up. Transparent background.
6. **Baxter — excited.** Same dog and bandana, jumping with front paws in the air, tail wagging, barking happily. Transparent background.
7. **Baxter — sleeping.** Same dog and bandana, curled up asleep. Transparent background.

### Nice-to-have

8. **Title screen** (tall 9:16, like Babcia's splash). *[style sentence]* Arianna and Baxter standing in front of a cute pastel cupcake shop with a striped awning on a sunny small-town street, a little pink delivery van parked beside them, with Baxter in the van's passenger seat window optional. Leave the top third as open sky for a title. No text.
9. **Van ride.** *[style sentence]* View through the windshield of a little pink delivery van: Arianna driving with both hands on the wheel, smiling, and Baxter in the passenger seat with his head tilted and ears flapping in the breeze, cupcake boxes stacked behind them. Wide 16:9. (Used as the "out for delivery!" moment.)
10. **App icon** (square). *[style sentence]* Baxter's happy face peeking over a big pink-frosted cupcake with sprinkles, simple bold shapes, readable when very small, solid mint-green background.

### Later, if you're in the mood
- **Shop interior** (wide 16:9): cozy pastel bakery counter with an **empty** glass display case, an oven, and a window to the street. No people and no cupcakes, because the game draws the cupcakes in.
- **Customers:** a small set of 6–8 friendly characters in the same style (a grandma, a construction worker, a little boy, a bunny, a cat in a sweater, a bear…). These have code-drawn versions too.

Images 1–7 are the ones that matter most. Send any number and I'll add them as they arrive.

---

## 6. Quick questions for Arianna (any time, none block the start)

1. What's the shop called? ("Arianna's Cupcakes", "Baxter's Bakery", something else?)
2. What color is the van?
3. Which flavors and toppings does she want first? (Starting idea: vanilla, chocolate, strawberry cake; pink, white and chocolate frosting; sprinkles, cherry, gummy bear. More unlock later.)
4. What does Baxter wear: a bandana, a collar, or nothing?
