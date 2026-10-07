# Hollowmere

A top-down 2D genetics farming game. Breed **Hummers** (bees), **Groves** (trees) and **Flitters** (butterflies and moths), build a living estate of hives, orchards, machines and runnels, and wake the Heartroot sleeping under the lake.

Everything runs in the browser: plain HTML and JavaScript, no build step, no image or sound files (all art and audio are generated in code). It saves itself in the browser and keeps working while you're away.

## Play

Open `index.html` through any static web server. Locally:

```bash
python3 -m http.server 8080
# then visit http://localhost:8080
```

### Put it online with GitHub Pages

1. Merge this branch into `main` (or pick this branch in step 3).
2. In the repository on GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and `/ (root)`, and save.
4. After a minute the game is live at `https://<your-username>.github.io/Hollowmere/`.

On a phone, open that link and use **Add to Home Screen** to play it full screen like an app.

## Controls

| Action | Keyboard / mouse | Touch |
| --- | --- | --- |
| Move | WASD or arrow keys, or click the ground | Left stick, or tap the ground |
| Use the nearest thing | E or Space | Use button, or tap the thing |
| Hold an item | 1–9 or mouse wheel | Tap a hotbar slot |
| Place / plant the held item | Click a tile (R turns Runnels) | Tap a tile (Turn button) |
| Bag, Craft, Codex, Journal, Map | I, C, K, J, M | Top-right buttons |
| Close a panel / Menu | Esc | × |

## How the game works

- **The Strand.** Every living thing carries the same twelve Threads (Lineage, Vigor, Span, Brood, Warmth, Damp, Rhythm, Hardiness, Bloom, Reach, Stature, Gift), each with a shown and a hidden allele, dominant or recessive. Offspring take one random allele per Thread from each parent.
- **Mutation.** Crossing two different Lineages can replace a parent with a new species. Some crossings only happen in a certain region, season, time of day, festival or housing. Skeps never mutate; Hive Boxes and Hivespires do. Catalyst Frames, Quickening auras, spring and Field Notes raise the odds; Stilling Frames and the Steady Heart module stop it.
- **Climate.** A species' home climate is fixed; its tolerance is inherited. Hivespire modules (Warmer, Cooler, Mister, Drier) shift a hive's climate, and Chill and Kindle auras shift everything nearby.
- **Hummers** live in Skeps, Hive Boxes and Hivespires and make combs. **Groves** grow from Scions, fruit, drop Scions and are pollinated by Hummers and Flitters. **Flitters** settle on Groves they can host on, pollinate across long distances and spin cocoons; pair them in a Chrysal Cradle.
- **Industry.** Combwheel, Press, Brewvat, Alembic, Glassforge, Smeltery, Loomframe, Chandlery and Joiner turn raw goods into everything else. Power comes from a Windlass, Wind Sails, Waterwheels, a Bellows Engine and Spring Coils. Runnels move items; Strand Gates sort them by species, trait or item; Groundskeepers gather harvests.
- **The valley.** Eight regions with their own climates, wild hives, trees and Flitters, opened through gates as your Guild rank rises. Twenty-four lore pages are hidden in cairns.
- **Every day.** Seasons turn over each real day (spring: more mutations; summer: more honey; autumn: more fruit; winter: everything slows). Wren posts new orders every morning and a Grand Order every week, Marra's prices drift, Hettie tells you one crossing a day, a basket waits on your porch, and letters arrive every few hours. Festivals and a weekly eclipse unlock special species.
- **While you're away**, the estate keeps running for up to 12 hours and gives you a report when you return.

## Code map

| File | What it does |
| --- | --- |
| `js/data/threads.js` | The twelve Threads and their alleles |
| `js/data/species.js` | All 85 species and every mutation |
| `js/data/items.js`, `structures.js`, `recipes.js` | Items, buildable structures, crafting and machine recipes, blueprints |
| `js/data/biomes.js` | Regions, gates, seasons, festivals |
| `js/data/story.js` | Characters, quests, dialogue, lore pages, letters |
| `js/genetics.js` | Inheritance, mutation and forecasts |
| `js/world.js` | Map generation |
| `js/game.js` | Game state, entities, climate and blossom queries, Codex and Renown |
| `js/sim.js` | Hives, groves, colonies, cradles, machines, power and runnels |
| `js/actions.js` | What happens when you touch something |
| `js/story.js` | Questline, orders, market, letters, basket, Hettie, the Heartroot |
| `js/render.js`, `js/sprites.js` | Drawing and procedural pixel art |
| `js/ui.js`, `js/panels.js`, `js/tips.js` | HUD, panels and one-time tips |
| `js/audio.js` | Synthesised sound effects and music |
| `js/main.js` | Boot, input, offline catch-up and the main loop |
