# Pocket Orchestra

An open musical workbench at `/games/pocket-orchestra/`. Place six kinds of acoustic instrument, bend their rails, and run up to four synchronized marble loops. The board is the score: horizontal spacing sets contact time; vertical placement shapes the route. Every marble returns on a visible belt and lift, joined to one drive shaft.

## Playing

Start with one of three arrangements or an empty machine. Drag a voice onto the board, or choose a voice and tap a place. Select a piece to change its pitch, octave, width, contact beat, voice, or track. Instruments can move freely in two dimensions; optional quarter-beat snapping helps with rhythm. The loop can grow from 8 to 24 beats. Leave empty rail for a rest.

Each track has its own marble, mute and volume, with duplicate and remove controls. All tracks use one clock. Play, pause, scrub, rewind, change the tempo (48–160 BPM), or mute the entire machine. Fit shows the whole route; zoom and native touch scrolling keep larger machines editable on phones. An overview and optional Follow camera appear for wide machines. Manual panning takes control immediately. Reduced motion starts with Follow off.

- **Enter on the board:** place the chosen voice. **Space:** play/pause. **Arrows:** move the selected piece; Shift moves farther.
- **1–5:** pitch within the current octave. **Delete/Backspace:** remove.
- **Command/Ctrl Z:** undo; add Shift to redo. **Esc:** deselect.

The current machine autosaves locally. Saved machines keep eight named takes. A listening link includes an editable versioned score; edits update the fragment so a reload keeps them. Original v1 listening links migrate to a single connected track. Clipboard denial exposes a selectable link.

## Implementation

All game code lives in `apps/pocket-orchestra`. Existing Machine, Shows, Theater, Playground and their tests are unchanged.

- `model.ts`: validated arrangements, three starting tunes, persistence/link format, pitch mapping, loop resizing and board coordinates.
- `instruments.ts`: six compact SVG mechanisms and a deterministic continuous rail compiler. Every instrument is a timed knot. The exact same cubic segments draw the supporting rails and carry the marble; a short impact bounce lifts it off and settles it back onto that rail. Return runs and lifts close the path without teleporting. Uphill sections have visible belt rungs.
- `audio.ts`: synthesized music box, triangle, harp, drum, piano, and xylophone samples. One strike per contact. All tracks share an absolute Web Audio clock; half-open scheduling windows prevent duplicate loop strikes. The picture follows the output timestamp, with latency fallback. Pause/edit/seek cancel pending sources; hidden tabs pause.
- `stage.ts`: scalable ink drawing, mechanical reactions, marbles and exact contact visualization. No glow, bloom, particle wash, or separate instrument cells.
- `main.ts`: pointer/touch/keyboard editing, transport, undo/redo, track mix, saving and sharing. `style.css` and local licensed fonts supply the paper-and-ink workbench.

This is deterministic mechanical choreography, like Machine's sampling approach, rather than a collision simulation. Instruments strike once when the marble arrives; tempo changes transit speed without changing pitch. Each musical mechanism is purpose-built for a shared route, replacing the original isolated miniature adapters. No existing piece implementation is modified.

## Redesign play-test record

Browser checks use the installed Playwright Chromium, without adding a production dependency:

```sh
npm run dev
PO_SHOTS=/tmp/po2-shots PO_PASS=pass1 npm run check:pocket:browser
# A built preview can be used with PO_BASE=http://127.0.0.1:8792
```

The isolated headless checks cover malformed and legacy listening links, finite acoustic signals, exact visual/sound contact positions, continuity of every rail/lift and loop seam, simultaneous tracks, muting, and length bounds. The browser check plays and scrubs, manipulates the board, edits instruments and tracks, exercises save/share/reload and undo, and checks 1440/768/390/320px layouts and real touch panning.

| Pass | Worst finding | Improvement and re-test |
| --- | --- | --- |
| 1 — open workbench | Separate cells could not convey one machine; the first redesign's zoom also clipped the bass track. | Replaced the grid and phrasebook with freely placed instruments, continuous return loops, synchronized tracks and a compact inspector. Fit the opening view to all tracks. Fixed drag-end selection. Chromium passed at all four widths, including exact contact scrub, simultaneous audio scheduling, drag/undo, tuning, size, tracks, save/share/reload and touch panning. |

Pass 1 validation: `npm run verify`, `npm run build:site`, and `PO_PASS=pass1 npm run check:pocket:browser` passed. Fresh lint/typecheck/contact checks also passed after the pointer-capture fix. No application errors were reported by Chromium.

| Pass | Worst finding | Improvement and re-test |
| --- | --- | --- |
| 2 — readability and travel | Desktop mechanisms were too small, tablet framing wasted space, and a phone lost the marble offscreen. | Tightened track spacing, enlarged the mechanisms, rounded the return chutes, added physical impact bounces, and removed redundant lane labels. Added a compact overview and optional follow camera, keyboard placement, focus preservation, and consistent add behavior. Re-tested all four widths, exact contact timing, live following, manual-pan takeover and keyboard-only creation. |

Pass 2 validation: `npm run verify`, `npm run build:site`, and the expanded `PO_PASS=pass2 npm run check:pocket:browser` passed. The final 768px view no longer wastes half the board, and 320px octave controls stay on one line. Additional lint/typecheck passed after the final responsive refinements.
