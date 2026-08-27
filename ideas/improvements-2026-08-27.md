# Improvements — 2026-08-27

Pinned to `59b5cfb` (`Explore two frameworks for machines that act on each other`).
UI lens: **interface-craft** (dice 0). Status: ✅ accepted for these 10.

Four PRs from this pass:

1. Perf — pause / stroke
2. Panel honesty — mode / catalog / hide / seed
3. Harden — URL clamp, CI + esbuild, check + codec *(this PR)*
4. Save loop *(separate)*

---

## 1. Pause still paints every frame

**Category:** Technical

`createEngine` owns a p5 loop that calls `draw` at the display refresh. `paused` only skips `frame += speed`. A paused piece is a still, so every machine, wire, and overlay is recomputed and rasterized for a bitmap that cannot change.

On a 50-cell grid that is wasted work. Scrub, step, and Save already know how to force one frame (`redraw` during PNG capture).

**Proposal:** `noLoop()` while paused, `loop()` on play, and `redraw()` from scrub / step / resize / composition change.

## 2. Stroke rebuilds the piece

**Category:** Technical

Stroke is a draw-time multiplier (`strokeWeight(size, theme, options.stroke)`). The panel routes it through `onChange` → `apply` → `build()`. Dragging the slider reseeds nothing but still re-places every machine.

Speed and grid already update the live engine without a rebuild. Stroke is the same kind of dial.

**Proposal:** apply stroke on the live composition (and the URL) without calling `build`.

## 3. Mode leaves dead URL keys

**Category:** UI/UX

`showFor` hides layout, spans, and the pool in ports/tracks, and hides chains in tracks. `writeUrl` still serializes those keys when they differ from defaults. A ports link can carry `?layout=bricks&spans=0.8&solo=hammer` that the mode ignores.

The panel is honest on screen and dishonest in the address bar.

**Proposal:** omit (or reset) inapplicable options when serializing and when switching mode.

## 4. Catalog is a composition, parked in Explore

**Category:** UI/UX

Catalog is an `Options` flag — URL-backed, it rebuilds the piece as a labelled sheet. The button sits next to Grid, which is view state and never belongs in the URL. In catalog mode the composition dials still show; some feed the sheet (theme, mode, resolution) and some do not (layout, spans, solo).

**Proposal:** treat catalog as its own surface. Hide dials that do not feed the sheet, and stop mixing it with view toggles.

## 5. Hide has no affordance

**Category:** UI/UX

`H` toggles `body.hide-panel`. There is no button, no kbd chip, and no persist. A missed keystroke blanks the only controls; recovery is the same unmarked key. Once the panel is gone, nothing on screen says how to get it back.

**Proposal:** a visible Hide control with a kbd hint, and an on-screen restore (edge tab) when the panel is away.

## 6. Seed edits are blur-only and empty evaporates

**Category:** UI/UX

The seed field applies on `change`, not `input`. Typed-but-uncommitted text is overwritten by `sync` after any other control. An empty trim writes `''`, which `writeUrl` drops; the next load calls `randomSeed()`.

The hero control can disagree with the URL and with what is on the canvas.

**Proposal:** commit on input (debounced) or keep a local draft while focused; do not let `sync` clobber a focused field; treat empty as a reroll or refuse to persist a blank.

## 7. URL options are unsanitized; PORTS_LOOP duplicates LOOP

**Category:** Technical

`readUrl` accepted any finite number. `?res=0` divides the art area by zero and becomes `Infinity`. Slider limits (`res ∈ [1,50]`, `stroke ∈ [0.4,2.4]`, `spans`/`chains ∈ [0,3]`) were UI-only. `PORTS_LOOP = 240` in `src/worlds/ports/build.ts` was a second `LOOP`. `TRACKS_LOOP = 720` is `3 * LOOP` with no comment tying them together.

**Proposal:** clamp and integerize in `parseOptions` / `readUrl` and once at the top of `build`. Replace `PORTS_LOOP` with `LOOP`. Define `TRACKS_LOOP = 3 * LOOP` in `constants.ts` without changing the number.

## 8. No GitHub Action; vite’s esbuild is undeclared

**Category:** DevEx

There was no `.github/` workflow. `package.json` `check` shells out to a naked `esbuild` that only exists as a transitive of vite (`allowScripts` already named `esbuild@0.21.5`). A clean install that ever resolved vite differently would break the only gate.

**Proposal:** workflow `npm ci && npm run build` on push/PR to `main`. Add `esbuild` as a direct `devDependency`. Do not add eslint / vitest / prettier.

## 9. Holes in check + URL codec

**Category:** DevEx

`check.ts` never called `draw()`. It never imported `readUrl` / `writeUrl` because they touch `location`. Ports/tracks catalogs only asserted `> 0`.

**Proposal:** split `parseOptions(search)` / `serializeOptions(options)` as pure functions; thin wrappers keep `location` / `history`. Check default omission, catalog/mode, invalid mode, `rollOptions` mode-preserve. Tiny no-op p5 stub; call `draw` at `u ∈ {0, 0.25, 0.5, 0.75, 1-ε}` per machine (classic + port + track/reactor); assert no throw and state snapshot equality. Assert ports catalog length `=== portMachines.length` and tracks catalog covers every reactor + the seven kinds.

## 10. Save is a still; the piece is a loop

**Category:** Product

Save PNG captures the current frame. The contract, the transport, and tracks’ 12-second world are about a loop. There is no way to take the loop with you. Filename is `contraptions-${seed}` — no mode, no loop length.

A still is the right default for a share image. It is not the piece.

**Proposal:** a separate Save-loop export that walks `u` across one `comp.loop` (frame sequence or a short looping video). Leave still-PNG as it is.
