# Pocket Orchestra

A standalone experiment at `/games/pocket-orchestra/`. Arrange little musical mechanisms into a repeating phrase. Six acoustic voices share a pentatonic palette; a rest is a deliberate part of the tune.

## Playing

The phrasebook takes about a few minutes: answer a music box with a triangle, make a rising phrase, leave a breath, repeat an opening pair, then build an ensemble. The first phrase takes two actions: tap step 2, then Play. Completion requires listening through a whole unchanged phrase as well as meeting its musical prompt.

Free compose provides three starting tunes, an empty page, six notes per voice, a pace control, and eight locally kept takes. A listening link carries a versioned arrangement in its fragment. It needs no account, backend, audio upload, or clipboard permission; when copying is unavailable, a selectable link appears. Editing a shared take updates its URL so reloading preserves the edit.

Choose an instrument, then a step. Selecting an existing step auditions the whole mechanism; changing its note auditions the change. Mouse/pen dragging snaps into a step; dragging a step swaps it with another. Touch uses tap placement and the earlier/later buttons, leaving vertical scrolling available. A compact phone transport stays reachable when the main transport is outside the viewport.

- **Space:** play/pause, including while a step or instrument has focus.
- **Arrows on the score:** select a step. **Shift + arrows:** swap steps.
- **1–6:** change the selected step's note.
- **Delete/Backspace:** remove the selected voice.
- **Command/Ctrl Z:** undo; add Shift to redo.
- **Esc:** put the selected instrument down.

Text fields and sliders retain their own native keyboard behavior. Reduced motion removes placement/stamp transitions; the musical mechanism animation remains because it communicates the sounding contacts.

## Reused and new

| Layer | Implementation |
| --- | --- |
| Actual instruments | The unmodified [Music-world pieces](../apps/rube/src/playground/pieces/orchestra/): music box, triangle, harp, timpani, keys, and xylophone. Their native lanes, ball travel, oscillations, string releases, keys, and drumhead reactions remain intact. |
| Drawing and framing | Machine's [drawWorld and setupCanvas](../apps/rube/src/engine.ts), with catalog-style viewports, fixed per-instrument cameras, ink outlines and a small paper palette. Each instrument is a finite [Show](../apps/rube/src/show.ts) adapter. Trails are disabled. |
| Transport | The existing [Shows Transport](../apps/rube/src/shows/clock.ts). Its `heard` clock follows the Web Audio output position. |
| Native contact adapter | [instruments.ts](../apps/pocket-orchestra/instruments.ts) reads xylophone contact times directly from its placement, derives triangle/drum contacts from lane boundaries, and mirrors the Music pieces' string, key, and comb release formulas. Headless checks cover their topology and timing. |
| Musical score | [model.ts](../apps/pocket-orchestra/model.ts): five authored prompts, three starting compositions, validated versioned URL state, pentatonic pitch mapping. Each step begins on its instrument's first contact; the instrument's internal figure keeps its original timing. Tempo scales sound-event spacing and visible motion together, without pitch-shifting samples. |
| Sound | [audio.ts](../apps/pocket-orchestra/audio.ts): deterministic synthesized samples, a plucked delay-line harp, damped piano harmonics and hammer transient, inharmonic metal triangle, music-box tines, membrane drum modes and pitch fall, and woody xylophone modes. Gentle stereo placement, one quiet early reflection, and a compressor. No music files or external audio services. |
| Game and interaction | [main.ts](../apps/pocket-orchestra/main.ts), [stage.ts](../apps/pocket-orchestra/stage.ts), [style.css](../apps/pocket-orchestra/style.css): accessible DOM controls over the real p5 mechanisms, completion, edits and undo/redo, placement previews, snapping, touch alternatives, storage, and sharing. Fonts are local, with their OFL licenses shipped. |

This is an authored musical sequencer using the existing deterministic contraptions, not a new collision solver. Each bay has its own marble; the score determines when that mechanism gets its turn. The existing Music pieces are silent on their own. The experiment adds their acoustic voices instead of modifying those pieces or changing Shows' soundtrack/tick behavior. The existing recording utilities remain untouched; a take is shared as an editable score rather than a video export.

The entry dynamically loads its implementation, preserving the site's existing `playground-stays-lazy` build guard. The only site integration is the new HTML input and its slashless redirect. Existing modes and their test files are unchanged.

## Audio and replay details

Sound scheduling uses half-open lookahead windows and an absolute repeating clock, so a strike on a loop seam is scheduled once. Samples are warmed before choosing the audio anchor. The picture follows `getOutputTimestamp()` where available, with the output/base latency fallback otherwise. Preview clocks compensate for output latency as well. The initial wind-up includes the first mechanism's approach to its first contact.

Pause, seek and editing cancel pending sources through a short gain ramp. Old audio graphs are disconnected. A hidden document or interrupted audio context pauses the performance; returning does not unleash missed strikes. Resuming a scrub continues from the selected position. Paused pictures redraw at a lower rate, while playback and auditions retain the full animation rate.

The contact formulas are an intentional narrow adapter. If an original Music piece's geometry changes, update its contact mapping and checks together. The sequence uses two quarter beats per step; the harp and piano play several native contacts inside that span. There is no claim of physical interaction between separate bays.

## Verification and play-test record

Final validation passed with `npm run verify`, `npm run build:site`, and the Chromium browser check against the production build served by Vite preview. No existing mode test files were changed.

`npm run verify` includes the new isolated `check:pocket` suite after the existing checks. It covers bounded/untrusted URL state, Unicode titles, each instrument's contact topology, loop seams without duplicates, finite audible signals with dying tails, and solvability of all five prompts. `npm run build:site` also exercises the unchanged lazy-load guard.

For reproducible Chromium play testing, start `npm run dev`, then run:

```sh
npm run check:pocket:browser
# Or point the same checks at a built preview:
PO_BASE=http://127.0.0.1:8792 npm run check:pocket:browser
```

The optional browser check uses an installed Playwright (including the npx cache), writes screenshots to a `po-shots` directory in the system temporary folder, and adds no production dependency. `PO_SHOTS=/tmp/po-shots` chooses an explicit destination. It completes all five prompts, saves/shares/reopens a take, checks edits survive reloading a shared link, drags and undoes an instrument, swaps with the keyboard, scrubs, verifies scheduled audio sources, plays on touch, reorders with touch buttons, tests real touch scrolling, and checks 320/390/768px widths.

Four browser improvement passes preceded the final regression run:

| Pass | Played / inspected | Worst finding and improvement |
| --- | --- | --- |
| 1 | Opening duet, free composition, desktop and phone screenshots | Focus could turn Space into another step click; the bench was too spread out. Made playback consistent with focused controls, tightened desktop spacing, enlarged mechanism framing, and corrected the palette's brass/ivory distinction. Self-hosted the fonts. |
| 2 | All five prompts, touch pitch edits, keep/load, undo and scrub; completion screenshots | Clicking the already-armed first triangle disarmed it. Instrument choice now always arms; the opening hint names the direct next action. Fixed mode-tab highlighting, cleared stale reward toasts on navigation, enlarged phone instrument targets, and added audible upper drum modes. |
| 3 | Pointer drag/drop, shared-link recipient, audio-source scheduling, 320/390/768px screenshots, a real Chromium touch swipe | The score swallowed vertical touch scrolling. Switched touch to tap placement plus explicit move buttons; a repeat swipe scrolled 93px instead of 0. Added the reachable phone transport, warmed preview samples before anchoring, cleaned up retired audio graphs, and preserved edits in shared URLs. |
| 4 | Phone transport/tuning/reordering, shared-edit reload, return to phrasebook, denied clipboard fallback, invalid links, reduced motion, scrubbed desktop and phone screenshots | Composing on a long phone score required too much travel between the case and the selected step. Choosing a voice now brings an offscreen target into view. Finished the first marble's approach, added meaningful position announcements, and reduced idle drawing work. Replayed the changed paths afterward. |

Browser runs produced no application errors. The scheduler instrumentation observed no late `AudioBufferSourceNode.start` calls after preview warm-up. This validates the browser graph and event scheduling, not an assertion that every speaker or Bluetooth output has identical latency. The primary tested browser is Chromium; native Web Audio, pointer events, and dialog controls are used without browser-specific production APIs.
