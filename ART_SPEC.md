# The Living Draft: Art Specification (Chapter 1)

The game can now show painted art in the style of the concept sheets. Every image in this document is optional.

When a file exists, it replaces the code-drawn version. When it's missing, the game keeps drawing that thing itself. This means you can add art one room or one character at a time, and the game always stays playable.

**Tool:** open `tools/art-studio.html` in the browser. It gives you three things:

- **Room guides:** exact-size paint-over maps showing where the ground, ledges and hazards are.
- **Sprite templates:** frame strips with the feet line and collision box marked.
- **Hand anchors:** a tool for placing the player's drawn weapon in painted hands.

All sizes come from the game's data, so the tool is always correct, even if this document falls out of date.

---

## 1. Style bible (paste into every prompt)

> Hand-painted 2D game art for a dark gothic storybook Metroidvania. Ink-and-watercolor on aged
> parchment, heavy black ink linework with dry-brush texture, splattered ink, torn paper edges.
> Tall hazy gothic cathedral spires, crooked timber-and-stone townhouses, wooden walkways and
> rope bridges, chains, hanging torn crimson banners, crimson-leafed trees, warm amber lanterns.
> Dusk palette: lilac-grey sky fading to peach, desaturated violet mid-distance, near-black ink
> foreground, with accents of crimson, amber and luminous ink-blue. Painterly, highly detailed,
> atmospheric depth haze, cinematic lighting. Side-view 2D game layer, orthographic, no perspective
> floor. No text, no UI, no characters unless requested.

Negative prompt: `pixel art, 3D render, photo, anime, flat vector, text, watermark, frame, border, logo, UI`.

Use your three concept sheets as style references (image prompts or references) wherever your tool supports them. The strongest references are:

- The **top panorama of sheet 1**, for exterior backgrounds.
- The **"Environment variations" strip**, for per-room palettes.
- The **"The Bindery"** panel, for interiors.
- The **"Enemies"** and **"Boss: Soot Marshal"** panels, for creatures.

---

## 2. File layout

```
assets/
  manifest.js                    ← already present; frame counts / anchors live here
  rooms/<roomId>/sky.png         screen backdrop (fixed)
                /far.png         distant layer (parallax 0.15), transparent below/around shapes
                /mid.png         middle layer (0.4), transparent
                /near.png        near background architecture (0.7), transparent
                /fg.png          foreground hangings in front of everything (1.15), transparent
                /terrain.png     the walkable ground & walls, 1:1 with the room guide, transparent
                /secret.png      (margin, gardens only) the wall that hides a hidden room
                /<layer>@water.png     optional: this layer after the Water Pigment returns
                /<layer>@restored.png  optional: after the Soot Marshal falls
  sprites/<set>/<anim>.png       horizontal strip of frames, transparent
  ui/title.png                   2560×1440 title-screen painting (leave the left third calm; the title text is drawn on top)
```

- **Resolution:** everything is authored at **2×** the game's 1280×720 view (a 40 px game tile = 80 px of art).
- **Other sizes:** files at other sizes still work. The game stretches them, so keep the **aspect ratio** from the tables. Smaller files look softer.
- **Transparency:** every layer except `sky` must be a **PNG with transparency**. Most image generators can't output transparency. Generate the image on a flat, solid background, then remove the background with a background-removal tool before saving.

---

## 3. Rooms

### 3.1 Sizes (px, at 2×)

| id | name | sky | far | mid | near | fg | terrain |
|---|---|---|---|---|---|---|---|
| margin | The Margin | 2560×1440 | 3264×1760 | 3904×1760 | 4672×1760 | 5824×1760 | 5120×1440 |
| streets | Looseleaf Streets | 2560×1440 | 3264×1760 | 3904×1760 | 4672×1760 | 5824×1760 | 5120×1440 |
| bindery | The Bindery | 2560×1440 | 2880×1760 | 2880×1760 | 2880×1760 | 2880×1760 | 2560×1440 |
| gardens | Faded Gardens | 2560×1440 | 2880×1760 | 2880×1760 | 2880×1760 | 2880×1760 | 2560×1440 |
| canals | Dry Canals | 2560×1440 | 3648×1760 | 4928×1760 | 6464×1760 | 8768×1760 | 7680×1440 |
| cistern | The Dry Cistern | 2560×1440 | 2880×1760 | 2880×1760 | 2880×1760 | 2880×1760 | 2560×1440 |
| bridge | Collapsed Bridge | 2560×1440 | 3264×1760 | 3904×1760 | 4672×1760 | 5824×1760 | 5120×1440 |
| spire | The Vertical District | 2560×1440 | 2880×1976 | 2880×2336 | 2880×2768 | 2880×3416 | 2560×2880 |
| ashway | The Ashen Stair | 2560×1440 | 3264×1760 | 3904×1760 | 4672×1760 | 5824×1760 | 5120×1440 |
| arena | The Burnt Archive | 2560×1440 | 3264×1760 | 3904×1760 | 4672×1760 | 5824×1760 | 5120×1440 |
| edge | The Torn Edge | 2560×1440 | 2880×1760 | 2880×1760 | 2880×1760 | 2880×1760 | 2560×1440 |

**Wide files:** generators usually can't produce 5000–8000 px widths in one go. Generate the layer as 2–4 overlapping panels, stitch them together, and outpaint the seams, or generate smaller and upscale.

### 3.2 How the layers stack

1. **Parallax layers** (`far`, `mid`, `near`) do **not** need to line up with gameplay. Keep the lower ~15% of `near` dark or misty, because the terrain sits in front of it.
2. **`terrain.png`** is the most important file, and must line up exactly with the room guide:
   - Download the room's guide PNG from the studio. Paint on top of it, then delete the guide layer.
   - **Grey** areas = solid stone, timber or paper ground. Paint the walkable top edge **exactly** on the grey top edge.
   - **Brown bars** = one-way wooden planks and walkways.
   - **Red** = thorns (embers in the Ashen Stair and Burnt Archive).
   - **Navy** = ink pools.
   - **Yellow hatched** tiles change during play: gates, grates, doors, breakable walls, the plank ladder that appears. **Leave these transparent.** The game draws them itself.
   - **Orange markers** are suggested lamp, tree and sign spots. The game adds glows at the lamp positions, so painting lanterns there looks best.
   - **Blue markers** are characters and pickups. Keep those spots readable.
3. **`fg.png`** hangs in front of everything: tattered banners, chains, torn paper strips drooping from the top edge. **Only use the top ~25%** so it never hides the player.
4. **Hidden rooms** (the margin alcove and the gardens hut):
   - Paint the hidden room's interior **open** in `terrain.png`.
   - Paint the wall that covers it in `secret.png`: same size as `terrain.png`, transparent everywhere else.
   - The game removes `secret.png` when the wall is broken.

### 3.3 What each room should contain

The per-layer prompts below get combined with the style bible from section 1.

| room | concept-sheet reference | far / mid / near | terrain | variants |
|---|---|---|---|---|
| **margin** | the pale left edge of sheet 1 ("A once vibrant town…") | Blank parchment with faint ruled lines and a red margin rule. Pencil-sketch skyline, half-finished. Floating handwritten notes. | Pale, unfinished ink ground. A torn page edge at the far left, dropping into black ink. | — |
| **streets** | "Entry Streets" | Cathedral spires in lilac haze. Crooked timber townhouses with lit windows. Crimson trees and banners. | Cobbled paper street. The Bindery's tall crooked house front at the door. A dry fountain. Iron lamp posts. | `@water`: the fountain flows, lamps glow |
| **bindery** | "The Bindery (safe station)" panel | Warm library workshop. Bookshelves, a tall arched window, hanging pages on strings, a book press. | Wooden floor. A loft walkway. Ink jars. | `@water`: blue book spines. `@restored`: full colour and life. |
| **gardens** | "Faded Gardens" | Faded pink-crimson trees, trellises, a painter's easel. | Grassy paper earth. A small hut (hidden cache). A high nook sealed by a paper veil. | — |
| **canals** | "Underground Canals" | Brick vaults and arches. Dry river murals of fish on the walls. | Stone walkways. A dry canal trough. Pipes. | `@water`: blue glow, murals coloured in, water in the trough |
| **cistern** | blue hidden-area panel | Round vaulted chamber, pillars, a stone basin. | Floor and two ledges. | `@water`: luminous blue, full basin |
| **bridge** | "Collapsed Bridge" + the top panorama | Arched bridges receding into haze. A giant wooden water wheel on the right. | Broken bridge decks over an ink river. A floating deck fragment. | `@water`: wheel wet, water pouring |
| **spire** | "Vertical District" / "Vertical exploration" | Tall stacked towers. Chains, lanterns, scaffolds. | Stacked ledges and walkways. A rooftop at the top right. | — |
| **ashway** | burnt tones of the "Boss" panels | A scorched corridor: charred shelves, glowing embers, ash in the air. | Stone floor, an ember pit, a standing bookmark (save station). | — |
| **arena** | "Boss: Soot Marshal" | A burning archive: towering scorched bookcases, a great round window, drifting embers. | A long floor ending in a burned-away gap, then a far ledge. | — |
| **edge** | Ink Spot panel background | A pale void. Colossal floating torn pages. Black ink pooling low in the gutter. | A torn page edge on the left side. | — |

---

## 4. Characters and creatures (sprite strips)

### 4.1 Format rules

- **One PNG per animation.** The frames sit side by side, all the same size, on a transparent background.
- **Face right.** The game mirrors the art for left-facing.
- **Feet on the red cross** from the template, at the same spot in every frame.
- **Body inside the blue collision box.** Cloaks, antlers and effects may spill outside it.
- **Turn a set on with `idle.png`.** A set switches on as soon as its `idle.png` exists. Any other missing animations fall back to the nearest one that exists (defined by `alias` in `manifest.js`). A painted set never mixes with the code drawing.
- **Timing:**
  - Animations marked **"timed to the action"** in the studio stretch to fit the real attack or dodge timing. Put the **strike pose around 40–55%** of the strip.
  - Loops play at their fps and should cycle cleanly.

### 4.2 The Sketcher (`assets/sprites/sketcher/`)

- **Frame size:** 256×256. Feet at (128, 240). The body is about 128 px tall.
- **Design:** "The Sketcher" turnaround on sheet 3:
  - A slim hooded apprentice page-mender.
  - A tattered parchment-cream cloak with a torn hem.
  - Dark navy trousers and boots.
  - A crimson scarf, ink-stained hands, and a shadowed face.
- **Paint the Sketcher with an EMPTY gripping hand.** The weapon is the player's own drawing, added by the game.
  - After painting, use the studio's **Hand anchors** tab. Click the gripping hand in each frame and paste the result into `manifest.js`.
  - Without anchors, the game uses its built-in skeleton, which fits a standard proportioned figure.

| file | frames | notes |
|---|---|---|
| idle | 8 | breathing, cloak stirring |
| walk / run | 8 / 10 | run cycle leans forward, cloak streams back |
| jump / fall / land | 4 / 4 / 3 | |
| dodge | 6 | low paper-light roll or slide, timed |
| guard | 2 | braced, arm raised |
| hurt / death | 3 / 10 | death: collapses and dissolves into ink |
| raise | 6 | lifts the newly drawn weapon overhead (after drawing at the desk) |
| fold | 3 | Foldstep: the body flattened like a folded sheet of paper |
| attack_nib_1, _2 | 5, 5 | quick jab / slash |
| attack_blade_1, _2, _3 | 6 each | overhead cut, backhand, thrust |
| attack_polearm_1, _2 | 7, 6 | wide sweep, long thrust |
| attack_heavy_1 | 9 | long wind-up overhead slam |
| attack_up, attack_down | 6, 6 | upward arc / downward airborne strike |

### 4.3 Enemies, bosses and NPCs

Sizes are frame width × height, with feet at the manifest `origin`. The studio templates show all of these.

| set | frame | design (sheet reference) | anims |
|---|---|---|---|
| crawler | 192×128 | Torn Paper Crawler: folded paper body, ink legs, one red gem eye | idle(6 walk cycle), rear(4, telegraph: front rises), lunge(4), recover(4), stagger(2), death(6) |
| wretch | 192×192 | Scribble Wretch: a humanoid mass of tangled black scribbles | idle(8), windup(5), slash(6), recover(4), stagger(2), death(8) |
| moth | 160×160 (origin = body centre) | Ink Moth: pale paper wings with ink eye-spots | idle(6 flapping), tele(4, eye-spots flare), death(6) |
| guard | 256×256 | Looseleaf Guard: paper-page body, tall dark conical hat, spear, book-cover shield | idle(4), walk(8), windup(4), thrust(3), recover(4, shield lowered), stagger(2), death(8) |
| leaflet | 128×128 | Cinder Leaflet: a curled burning scrap of paper with eye holes | idle(6), crouch(3), hop(4), death(6) |
| hart | 448×384 | Faded Hart / "Ruined Illustration": a pale paper deer, partly erased, huge ink antlers | dormant(1, very faint), idle(6), charge_wind(4 pawing), charge(6), stun(4), sweep(7 antler sweep), leap(6), land(4), stagger(2), death(10) |
| marshal | 640×512 | Soot Marshal: burnt-page armour shards, a crown of charred points, ember eyes, a crescent halberd | dormant(1 kneeling), rise(8), idle(6), walk(8), cleave(10), sweep(9 low swing), lob(8 hurls embers), lunge(8), stomp(8 ground slam), roar(6), kneel(2 staggered), death(12 crumbles to ash) |
| quillon / lampwick / pell | 192×256 | Dialogue/NPC panel: an old spectacled bookbinder / a small lamplighter / a pencil-sketch painter | idle(6) |
| inkspot | 320×640 | Ink Spot panel: tall, thin, ink-black, scribbled contours, tendrils rising | idle(8), reach(6) |

**Title screen:** `assets/ui/title.png`, 2560×1440. A panorama of Looseleaf Borough at dusk, with the Sketcher small on a ledge at the lower left and Ink Spot faint in the distance on the right. Keep the upper-left area calm and light, because the game draws the title text there.

---

## 5. A realistic plan

- **Backgrounds and terrain work well with AI image tools.** Each room's layers are independent paintings, and exact consistency between rooms isn't needed. **Start here, because it's the biggest visual change.** Suggested order:
  1. streets
  2. bridge
  3. bindery
  4. canals
  5. arena
  6. the rest
- **Animated characters are the hard part.** Today's image generators can't keep a character identical across 8–10 frames of a walk cycle. You have three options:
  - Commission a 2D animator, using the templates and this document as the brief.
  - Paint a small set yourself: idle + run + one attack per class is enough to switch the Sketcher on; everything else falls back.
  - Use an AI tool with character-consistency / reference features, then clean up frame by frame.
- **Test as you go:**
  1. Drop a file in.
  2. Reload `index.html`. The browser console prints how many painted images loaded.
  3. Walk the room and check that the painted ground lines up with where the Sketcher stands.
