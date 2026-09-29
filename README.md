# The Living Draft — Chapter 1: Looseleaf Borough

A 2D hand-drawn action-adventure Metroidvania set inside a damaged, living book.
Draw your own weapon, restore the lost blue, and face the Soot Marshal.

Out of the box, everything is drawn and synthesized in code (HTML5 Canvas + WebAudio).
The game also supports **painted art files** for rooms, characters, bosses, NPCs and the title screen.
Any file you add replaces the code drawing for that element.
- See **[ART_SPEC.md](ART_SPEC.md)** for the file list, sizes and prompts.
- Use **`tools/art-studio.html`** to get paint-over guides, sprite templates and the hand-anchor tool.

## Running it

Open `index.html` in a modern desktop browser (Chrome, Edge or Firefox). No build step is needed.

The handwritten fonts load from Google Fonts. Offline, the game falls back to system fonts.
If your browser blocks `localStorage` on `file://` pages, saving won't work. In that case, serve the folder:

```
python -m http.server 8000
```

Then open http://localhost:8000.

## Controls (remappable in Settings)

| Action | Keyboard | Gamepad |
|---|---|---|
| Move | A / D or ← / → | Stick / D-pad |
| Jump (hold for height) | Space / Z | A |
| Attack (combo) · with ↑ = upward · with ↓ in air = downward bounce | J / X | X |
| Dodge (brief invulnerability) | K / C | B |
| Guard (front only, costs stamina) | L / V | LB / LT |
| Foldstep (once earned) + direction | Shift | RB / RT |
| Interact / talk / rest | E / F (or ↑) | Y |
| Map | M / Tab | Back |
| Pause / journal | Esc / P | Start |
| Drop through planks | ↓ + Jump | |

**Drawing desk:** hold the mouse to draw, or use arrows plus J/Space. You can also press 1 / 2 / 3 to trace a stencil.
Enter inks the drawing, Backspace clears it, Esc closes the desk.

## The chapter

The Margin → Looseleaf Streets → **The Bindery** (hub, drawing desk) → Dry Canals → The Dry Cistern
(the **Faded Hart**, the **Water Pigment**) → Collapsed Bridge (the wheel turns once water returns) →
Vertical District → Ashen Stair (safe station, shortcut) → The Burnt Archive (the **Soot Marshal**, **Foldstep**)
→ back to the creased veil at the Margin → The Torn Edge.

Optional content:
- Faded Gardens, with Pell
- Two breakable hidden rooms
- A grate shortcut that opens from below
- A latched shortcut door
- Four ink wells (+15 each)
- Hidden ink caches (+25 each), three of them reachable only with Foldstep
- 8 lore fragments

## Systems and where they live

| System | File |
|---|---|
| All tuning data (weapons, ink economy, elements, enemies, bosses, abilities) | `js/data/config.js` |
| Rooms, tiles, exits, entities, props (room-builder DSL) | `js/data/rooms.js` |
| Dialogue, lore, boss lines | `js/data/dialogue.js` |
| PlayerController, Health, Stamina, Foldstep, animation, cloak cloth | `js/entities/player.js` |
| Enemy families, projectiles, fire patches | `js/entities/enemies.js` |
| Faded Hart, Soot Marshal (3 phases, collapsing arena) | `js/entities/bosses.js` |
| Stations, NPCs, ink wells/caches, lore, doors, triggers | `js/entities/interactables.js` |
| WeaponDrawingSystem (shape analysis, classification, materialization) | `js/ui/drawing.js` |
| Combat and element wheel | `js/systems/combat.js`, `js/systems/progress.js` |
| Ink, Quest, Bindery restoration stage | `js/systems/progress.js` |
| World / scene management, collision, terrain baking | `js/systems/world.js` |
| Painterly parallax backgrounds | `js/systems/backgrounds.js` |
| Camera, particles, save, cutscenes | `js/systems/*.js` |
| HUD, dialogue UI, station, map, menus | `js/ui/*.js` |
| Audio (procedural score + SFX + ambience) | `js/core/audio.js` |
| Ink / watercolor / paper art toolkit | `js/core/art.js` |
| Main loop, render pipeline, story beats | `js/game.js` |

To add Chapter 2:
1. Add rooms in `rooms.js` with a new `map` region.
2. Add enemies and bosses to `config.js` and the matching classes.
3. Add abilities under `abilities`.
4. Add story beats in `game.js`.

The element wheel already defines all four elements.

## Accessibility

Settings include:
- Master, music and effects volume
- Screen-shake strength
- High-contrast mode (dims backgrounds, outlines characters)
- Damage assist
- Reduced flashing
- Full key remapping

Critical signals are never color-only:
- Attacks are telegraphed with a "!" mark plus a wind-up pose
- Elements have distinct glyphs (drop, flame, stone, spiral)
- Exhausted stamina is shown with hatching
- Hazards are shape-coded
