# Game ideas for Contraptions

Proposal based on the local checkout at `eb5c9dbe`, explored on October 16, 2026. This document proposes future work; no game implementation accompanies it.

**Recommendation: Missing Link.** Give the player a small, incomplete machine and a few beautifully drawn pieces. They repair its route, release the ball, and watch their solution become a short performance. It makes the existing craft playable with a relatively contained addition to the engine, and it can later support daily puzzles.

| Concept | Player's main activity | Rough scope |
| --- | --- | --- |
| **Missing Link** | Fit a limited set of pieces into a route with a specific destination and conditions | Medium; small first slice |
| **On Cue** | Perform selected mechanical accents in time with a show | Medium |
| **Counterpoint** | Schedule two runs so their arrivals cooperate | Large |
| **Chain of Evidence** | Scrub a mechanical scene and reconstruct what caused its outcome | Small for an authored case pack |
| **Pocket Orchestra** | Arrange mechanisms into a playable musical phrase | Medium |

Scope includes the interaction and a modest initial set of content. “Small” means a bounded mode built mostly from existing contracts; “medium” adds an editor or substantial interaction layer; “large” changes how runs interact. These are comparative estimates, not delivery dates.

## What the repository actually provides

**Machine is a deterministic choreography engine.** In [apps/rube/src/parts.ts](../apps/rube/src/parts.ts), a `Piece.place()` returns occupied cells, an exit and direction, a timed `Lane`, drawing state, and optional ball changes. Movement uses rolls, acceleration ramps, waits, falls, parabolic flights, and sampled carrier motion. `lane.fire` identifies the main mechanical event. `draw`, `over`, and `scores` receive local time; rendering does not advance the simulation. [apps/rube/src/plan.ts](../apps/rube/src/plan.ts) builds a single chain, checking footprints and exits, mirroring pieces, carrying ball state, and choosing a varied sequence. [apps/rube/src/universe.ts](../apps/rube/src/universe.ts) assigns start times and samples that chain; [apps/rube/src/show.ts](../apps/rube/src/show.ts) joins seeded worlds into an endless show.

This is an unusually good foundation for repeatable trials, prediction, scrubbing, and replay. The planner currently completes its own route and ends dead ends with portals. A puzzle needs its own interpretation of player placements, fixed goals, and failure; calling `planChain()` would not evaluate a player's solution.

**The catalog contains useful mechanical vocabulary.** [apps/rube/src/worlds.ts](../apps/rube/src/worlds.ts) fixes the loop as Regular (`workshop`), Forest (`garden`), Aqua (`harbor`), Arcade. Their [workshop](../apps/rube/src/pieces/workshop/index.ts), [garden](../apps/rube/src/pieces/garden/index.ts), [harbor](../apps/rube/src/pieces/harbor/index.ts), and [arcade](../apps/rube/src/pieces/arcade/index.ts) indexes own pieces, palettes, backdrops, and placement tastes. For games, the meaningful differences include height, footprint, direction reversal, transit time, repainting, and relaying to another physical ball. Examples: `lift` goes up one to three floors and can turn back; `scoop` descends and reverses; `painter` changes color; `cradle` changes the active ball's identity. Arcade points and the ticket finale already exist, but their outcomes are authored during placement, not earned through player skill. Even `pong` is a predetermined rally.

[apps/rube/src/catalog.ts](../apps/rube/src/catalog.ts) already displays animated piece previews on shelves, fits each piece and its flight into a cell, handles selection and scrolling, and remembers where the viewer left. That is a strong basis for an inventory and inspection view. It currently selects pieces to watch; placement, dragging, snapping, and undo would be new.

**Shows separates discovery, content, and performance.** [apps/rube/src/shows/discover.ts](../apps/rube/src/shows/discover.ts) discovers `versions/<work>/<take>.show.ts`; [apps/rube/src/shows/registry.ts](../apps/rube/src/shows/registry.ts) groups takes, resolves names and favorites, and exposes `Performance`: a show, duration, optional camera, soundtrack, cuts, blends, looping, and titles. Its shelves are **Machine**, **Movies**, and **Ambient**, with favorites ordered within the picker's shelves. A `.show.ts` descriptor loads the substantial content lazily. These are useful patterns for challenge collections and alternate takes, although a game still needs its own level and progress data.

[apps/rube/src/shows/stock/show.ts](../apps/rube/src/shows/stock/show.ts) plays saved stock placements at their original durations; [apps/rube/src/shows/stock/types.ts](../apps/rube/src/shows/stock/types.ts) includes musical phrases and target/actual cue times. [apps/rube/src/shows/timemap.ts](../apps/rube/src/shows/timemap.ts) supports older takes and studies with monotone time maps. Current stock arrangements favor choosing and sequencing mechanisms to fit music. Preserve that character when designing new play: changing a lift's clock arbitrarily changes how its mechanism reads.

**Theater supplies a session structure.** [apps/rube/src/shows/theater.ts](../apps/rube/src/shows/theater.ts) hosts the same [player](../apps/rube/src/shows/player.ts), starts with favorite takes selected, remembers subsequent checkbox choices in local storage, and advances when a performance finishes. Its running-order panel groups takes under the same three shelf names. [apps/rube/src/shows/playlist.ts](../apps/rube/src/shows/playlist.ts) shuffles without repeating until a round is exhausted, avoids immediate repeats across rounds, and accepts an injected random function. The player caches loads and warms the next performance. This can support a short set of rhythm rounds, a case queue, or a screening of completed solutions. Theater has no game scoring, progression, or daily-challenge service.

**Physics is local and purpose-built.** [src/core/physics.ts](../src/core/physics.ts) numerically integrates a pendulum once, then samples it. [src/contraptions/marble-run.ts](../src/contraptions/marble-run.ts) draws a switchback marble run from loop phase, with authored rolls and falls. [src/core/types.ts](../src/core/types.ts), [src/core/engine.ts](../src/core/engine.ts), and [src/core/wiring.ts](../src/core/wiring.ts) describe Explorations' separate setup/draw contract and phase-based firing chains. [src/core/lane.ts](../src/core/lane.ts) and [src/worlds/tracks/track.ts](../src/worlds/tracks/track.ts) provide further token and track primitives. Those use different timing/contracts from Machine and are not interchangeable pieces.

The cinematic shows also contain analytical motion helpers, such as [apps/rube/src/shows/versions/interstellar/liftoff/physics.ts](../apps/rube/src/shows/versions/interstellar/liftoff/physics.ts). None of these supplies a general rigid-body world where arbitrary placed shapes collide. `ShowPoint.balls` supports multiple rendered riders, explicitly without ball-to-ball physics. Free placement, tilting a board, or physically aiming a cannon would therefore be a substantially larger project than the pictures suggest.

**Timing and audio are substantial assets.** [apps/rube/src/shows/clock.ts](../apps/rube/src/shows/clock.ts) provides `Transport` with pause, seek, speed, finite duration, and loops. The picture follows soundtrack position. [apps/rube/src/shows/soundtrack.ts](../apps/rube/src/shows/soundtrack.ts) handles local audio, smoothed position readings, pitch-preserving speed changes, and buffered looping at 1×; [apps/rube/src/shows/youtube.ts](../apps/rube/src/shows/youtube.ts) handles streamed cues. This is playback synchronization, not a calibrated rhythm judgement system. Input timestamps, device calibration, hit windows, and handling interrupted attempts still need design.

[apps/rube/src/shows/ticks.ts](../apps/rube/src/shows/ticks.ts) synthesizes struck-bar notes into a WAV. The [metronome study](../apps/rube/src/shows/versions/metronome/metronome.ts) demonstrates deriving strikes from piece timings and mapping them to notes. It is useful source material even though it is not a discovered show in the current picker. This provides a self-contained musical starting point; the Music shelf's instrument drawings do not themselves emit audio.

**Rendering, camera, and capture are ready to reuse.** [apps/rube/src/engine.ts](../apps/rube/src/engine.ts) supplies `drawWorld`, viewport clipping, piece/ball layering, multiple riders, backdrops, transitions, canvas resizing, and the deterministic follow camera. [apps/rube/src/overview.ts](../apps/rube/src/overview.ts) fits a whole board; `extentOf()` in `universe.ts` also accounts for flights. [apps/rube/src/shows/stage.ts](../apps/rube/src/shows/stage.ts) adds authored framing, zoom, aspect handling, and export-sized rendering. Its canvas keeps words in the surrounding DOM, which suits a quiet game interface.

[apps/rube/src/main.ts](../apps/rube/src/main.ts) and [apps/rube/src/playground/main.ts](../apps/rube/src/playground/main.ts) supply transport shortcuts, frame stepping, URL state, and scrub controls. [src/ui/shell.ts](../src/ui/shell.ts), [src/ui/styles.css](../src/ui/styles.css), and [src/ui/mode-host.ts](../src/ui/mode-host.ts) supply the shared interface and mode lifecycle. Game input mapping and board hit testing are additional work. [src/core/capture.ts](../src/core/capture.ts) exports stills and silent loops; [apps/rube/src/shows/record.ts](../apps/rube/src/shows/record.ts) records a performance with local audio in real time, with browser-dependent formats. YouTube-only soundtracks are not included in recordings. An interactive game's replay must first be reconstructible from its saved choices/events.

**Playground is a compatible, curated expansion shelf.** [apps/rube/src/playground/staging.ts](../apps/rube/src/playground/staging.ts) lazily loads four shelves of additions/restored pieces and two whole worlds: [Snow](../apps/rube/src/playground/pieces/alpine/index.ts) and [Music](../apps/rube/src/playground/pieces/orchestra/index.ts). They register beside the stock loop and use the same `Piece`, `World`, catalog, and stage contracts. Standouts for play include the [step lift](../apps/rube/src/playground/pieces/workshop/steplift.ts), [mousetrap](../apps/rube/src/playground/pieces/workshop/mousetrap.ts), [kelp curtain](../apps/rube/src/playground/pieces/harbor/kelpcurtain.ts), and Music's instruments. Reuse should select a small, legible set. [REJECTED.md](../apps/rube/src/playground/REJECTED.md) explains why restored pieces were removed: unclear silhouettes, unclear causes, excessive detail, repetition, or hiding the ball.

The hidden Builder's [spec](../apps/rube/src/builder/spec.ts), [compiler](../apps/rube/src/builder/compile.ts), and [registry](../apps/rube/src/builder/registry.ts) offer validated JSON pieces and local persistence. They are useful authoring references, but describe piece definitions and worlds rather than a finished player-facing level editor. [src/core/rng.ts](../src/core/rng.ts) provides deterministic, forkable randomness; a daily puzzle would additionally need a date convention, versioned content, solvability checks, and progress storage.

## 1. Missing Link

**Pitch:** Repair a miniature machine with a handful of pieces, then let one ball prove your solution.

**Core loop:** Read a small board and its destination; inspect the limited inventory; place and mirror pieces on discrete cells; release the ball; scrub to the first broken handoff; revise. Early puzzles ask only for arrival. Later ones require a particular color, a bell visited before the exit, or a route under a piece budget. A daily board can reuse this loop with a fixed inventory and one shared puzzle ID.

The interesting decision is spatial reasoning about a mechanism: a lift needs vertical clearance; a scoop reaches the lower shelf facing the other way; a painter may make the final delivery correct while ruling out an earlier checkpoint. Piece cards show their exact exit and variant before placement. Only supported horizontal mirroring is offered; gravity and upright drawing make arbitrary rotation inappropriate for Machine pieces.

**Concrete reuse:**

- [apps/rube/src/parts.ts](../apps/rube/src/parts.ts): placements, timed paths, `ballAt`, and ball changes; [apps/rube/src/plan.ts](../apps/rube/src/plan.ts): `worldCells` and occupancy/connection patterns.
- [lift.ts](../apps/rube/src/pieces/workshop/lift.ts), [drop.ts](../apps/rube/src/pieces/workshop/drop.ts), [scoop.ts](../apps/rube/src/pieces/workshop/scoop.ts), [painter.ts](../apps/rube/src/pieces/workshop/painter.ts), and [bell.ts](../apps/rube/src/pieces/workshop/bell.ts): existing motion and artwork. [scripts/shows/stock-placement.ts](../scripts/shows/stock-placement.ts) demonstrates selecting an exit variant through `fits`; its Node assertions make it a pattern to adapt for the browser.
- [apps/rube/src/universe.ts](../apps/rube/src/universe.ts), [engine.ts](../apps/rube/src/engine.ts), [overview.ts](../apps/rube/src/overview.ts), and [catalog.ts](../apps/rube/src/catalog.ts): sampling, rendering, board framing, and inventory previews.

**Why it would be fun:** A successful attempt is a tiny machine the player understands and feels responsible for. The existing animations make even a simple route rewarding to watch. Exact replay makes failure informative: the player can see the wrong exit rather than wonder whether the physics behaved differently this time.

**Scope: medium; small first slice.** Reuse almost all movement, drawing, and piece inspection. New work is a placement interface, stable variant selection, undo, a compiler for the player's route, goal checks, visible failure, and authored levels. `Placed` does not retain the placement's `exit`, so the editable board must retain that connection metadata. Disconnected pieces also need an explicit idle rendering state; a single run currently gives every piece an arrival time. Daily generation comes later: construct or select a known-solvable board, validate it, and pin its content revision. A seed alone does not guarantee a good puzzle.

## 2. On Cue

**Pitch:** Play the crucial accents of a Contraptions show with one key or tap, making the machine's performance your own.

**Core loop:** Hear a short count-in; anticipate an approaching clapper, hammer, or catch; tap on its musical accent; finish a 30–60 second phrase; review early/late marks and replay the phrase. Start with one input and a sparse authored chart. Later phrases introduce alternating actions or held notes only where the mechanism makes the gesture clear.

Selected contacts are the targets. A precise press earns a clean accent and a physical response such as a small counter advancing. The authored route continues through misses, so a bad note does not strand the show. Optional challenge sequences can use Theater's running-order pattern.

**Concrete reuse:**

- [apps/rube/src/shows/clock.ts](../apps/rube/src/shows/clock.ts), [soundtrack.ts](../apps/rube/src/shows/soundtrack.ts), and [stage.ts](../apps/rube/src/shows/stage.ts): synchronized transport, practice speed, and presentation.
- [apps/rube/src/shows/stock/types.ts](../apps/rube/src/shows/stock/types.ts) and [stock/show.ts](../apps/rube/src/shows/stock/show.ts): saved placements, cue candidates, and original mechanical timing. Existing cue lists need curation into readable game charts.
- [apps/rube/src/shows/ticks.ts](../apps/rube/src/shows/ticks.ts), the [metronome study](../apps/rube/src/shows/versions/metronome/metronome.ts), and Playground's [metronome](../apps/rube/src/playground/pieces/orchestra/metronome.ts) and [xylophone](../apps/rube/src/playground/pieces/orchestra/xylophone.ts): synthetic music and visible musical gestures.
- [apps/rube/src/shows/registry.ts](../apps/rube/src/shows/registry.ts) and [playlist.ts](../apps/rube/src/shows/playlist.ts): take selection and a sequence of rounds.

**Why it would be fun:** The machine itself telegraphs the beat. Watching a hammer fall provides anticipation and contact that a row of scrolling symbols cannot. A clean phrase feels like accompanying a small ensemble.

**Scope: medium.** Playback and visuals are reusable. New work includes charts, timestamped input, calibration, judgement windows, practice ranges, results, and feedback tied to the attempt. Begin with generated/local music and forgiving windows; streamed YouTube playback is an additional precision dependency. Existing film shows are possible later content, not automatically playable charts. Stock pieces draw their own reactions and points, so player-earned feedback requires an adapter; changing a score number alone would not create responsive play.

## 3. Counterpoint

**Pitch:** Set two mechanical runs in motion so they meet at exactly the right moment.

**Core loop:** Inspect two tracks and a shared objective; choose a delay mechanism or set a launch offset; run both balls; compare their arrivals; adjust until their actions cooperate. One ball might ring a bell to open a short receiving window for the other. A later board asks both to arrive together after one takes a slow lift and the other a rapid descent. There is time to think between attempts; execution is automatic.

The central puzzle is deciding where time should be spent. Long routes can be faster than short ones. A metronome's wait or a kelp curtain's drag becomes a useful tool. A successful run reveals a relationship between two small machines that was hard to see while considering either alone.

**Concrete reuse:**

- [apps/rube/src/parts.ts](../apps/rube/src/parts.ts): lane durations and fire times; [apps/rube/src/show.ts](../apps/rube/src/show.ts): `ShowPoint.balls`; [apps/rube/src/engine.ts](../apps/rube/src/engine.ts): multiple-rider rendering and trails by identity.
- [apps/rube/src/shows/versions/interstellar/liftoff/show.ts](../apps/rube/src/shows/versions/interstellar/liftoff/show.ts): an existing example of several riders on one show clock.
- [lift.ts](../apps/rube/src/pieces/workshop/lift.ts), [drop.ts](../apps/rube/src/pieces/workshop/drop.ts), [metronome.ts](../apps/rube/src/playground/pieces/orchestra/metronome.ts), and [kelpcurtain.ts](../apps/rube/src/playground/pieces/harbor/kelpcurtain.ts): contrasting durations and readable waits.
- [apps/rube/src/shows/clock.ts](../apps/rube/src/shows/clock.ts) and [apps/rube/src/overview.ts](../apps/rube/src/overview.ts): shared replay time and a stable view of both tracks.

**Why it would be fun:** It turns the satisfying timing already present in Shows into a problem the player solves. Two plain runs become a duet; the payoff is their synchronization.

**Scope: large.** Drawing two balls is already supported. Independent routes, launch offsets, event dependencies, receiving windows, occupancy rules, and shared mechanisms are new. A piece currently has one `start`, `ballIn`, and reaction, so repeated visits cannot simply be added to its lane. Start with disjoint tracks and one new receiving mechanism; general shared-track scheduling would follow only if that is compelling. Solve cooperation as explicit timed events, with collisions reserved for any later physics project.

## 4. Chain of Evidence

**Pitch:** Investigate a machine's aftermath by winding time backward and proving which ball did what.

**Core loop:** Open a short case on its final frame; read one question; scrub and step through the incident; inspect suspect mechanisms; mark the decisive moments; submit a small causal sequence. The reveal plays those moments in order, then runs the complete machine. Cases become harder through repainting, relays, overlapping action, and misleading final appearances.

Example: a blue ball rang the final bell, and another blue ball remains in a cradle. Two paint booths and a relay sit between the start and finish. Which ball continued, and where did the first one stop? The player identifies the handoff and the repainting events, tracing identity through changes of color. A later case adds the organ's pedal ball and its launched replacement. Evidence is always visible in the drawing; questions use mechanisms the case has introduced.

**Concrete reuse:**

- [apps/rube/src/parts.ts](../apps/rube/src/parts.ts): `BallState.id`, `BallChange.relay`, color changes, and deterministic sampling.
- [cradle.ts](../apps/rube/src/pieces/workshop/cradle.ts), [painter.ts](../apps/rube/src/pieces/workshop/painter.ts), [oyster.ts](../apps/rube/src/pieces/harbor/oyster.ts), and [organ.ts](../apps/rube/src/playground/pieces/orchestra/organ.ts): already-legible changes of color or physical ball.
- [apps/rube/src/main.ts](../apps/rube/src/main.ts), [shows/clock.ts](../apps/rube/src/shows/clock.ts), and [shows/stage.ts](../apps/rube/src/shows/stage.ts): stepping, scrubbing, and framing an event. [apps/rube/src/engine.ts](../apps/rube/src/engine.ts) already accepts viewports, a useful starting point for an evidence still beside the live frame.
- [apps/rube/src/shows/playlist.ts](../apps/rube/src/shows/playlist.ts): a small shuffled casebook, with new case IDs supplied by the game.

**Why it would be fun:** It rewards close observation of the things Contraptions already draws carefully: a ball remaining in a cradle, a latch releasing, a different ball leaving. Rewinding turns those details into evidence. It is a quiet alternative to speed or construction challenges.

**Scope: small for six hand-authored cases.** Reuse finished mechanisms and transport. New work is case metadata, evidence selection, accessible answer controls, and authored answer validation. The active thread's ID is not a complete object-history database: retired balls are often painted by the piece itself. Cases must explicitly label their parked balls and decisive events. Generating arbitrary mysteries would require a richer causal model and would increase scope substantially.

## 5. Pocket Orchestra

**Pitch:** Build a tiny musical machine whose tune comes from the moments its ball strikes, plucks, and releases things.

**Core loop:** Pick a short phrase prompt or open a blank stage; arrange a few musical mechanisms; assign pitches from a small scale; listen; change the order or the spacing between them; keep a satisfying take. Prompts supply game structure: repeat a three-note motif, leave a breath before the last note, or finish on a specified accent using a limited set of pieces. Free composition is the companion mode.

Each mechanism retains its own motion. Rails provide spacing; slow mechanisms provide rests; a xylophone contributes a small cascade of notes. The musical challenge is choosing a machine that produces the desired phrase. The editor makes transit times audible and easy to preview.

**Concrete reuse:**

- [apps/rube/src/playground/staging.ts](../apps/rube/src/playground/staging.ts) and [pieces/orchestra/index.ts](../apps/rube/src/playground/pieces/orchestra/index.ts): the staged Music world and its palettes.
- [keys.ts](../apps/rube/src/playground/pieces/orchestra/keys.ts), [xylophone.ts](../apps/rube/src/playground/pieces/orchestra/xylophone.ts), [harp.ts](../apps/rube/src/playground/pieces/orchestra/harp.ts), and [metronome.ts](../apps/rube/src/playground/pieces/orchestra/metronome.ts): instrument drawings and contact timings; xylophone state already retains its hit times.
- [apps/rube/src/shows/ticks.ts](../apps/rube/src/shows/ticks.ts) and [soundtrack.ts](../apps/rube/src/shows/soundtrack.ts): render an arranged sequence of notes and play it on the same clock as the picture.
- [apps/rube/src/catalog.ts](../apps/rube/src/catalog.ts), [shows/record.ts](../apps/rube/src/shows/record.ts), and [builder/spec.ts](../apps/rube/src/builder/spec.ts): inspection, recording, and a precedent for a portable, validated document format.

**Why it would be fun:** Every edit changes both the tune and the miniature performance. Even a short successful phrase is an artifact worth keeping. The existing Music world has enough visual character to make a small collection feel complete.

**Scope: medium for one melodic voice and a curated shelf.** New work is an arrangement editor, note-event extraction, pitch assignment, phrase validation, persistence, and a clean looping boundary. `lane.fire` supplies only one primary event per piece; instruments with several contacts need explicit note maps. `renderWav` provides one struck-bar sound, so convincing instrument-specific timbres and live audition would be additional audio work. The Builder's current JSON does not store an arrangement or score; borrow its validation approach rather than assuming it already does.

## Craft direction shared by the concepts

Use the visual language visible in the [Machine reference](../.github/readme/machine-regular.png), [Playground sheet](../public/playground/card.png), and [Clair de Lune still](../public/shows/clair-de-lune/take-b.png): flat ink, substantial outlines, sparse paper grounds, and bright but limited fills. **No bloom or glow.** Selection can use an outline, a small tab, or a quiet ink wash; success can be a clapper settling, a flag changing position, or a short printed result.

Keep the machine large enough to read. Give planning a steady whole-board view, and make cinematic following an optional reward after completion. Put instructions and numerical results in the surrounding page. Use short, physical sound cues, with equivalent visible events. Color conditions should also have named swatches or symbols. Let one good mechanism explain one rule, and apply Playground's rejection criteria to new gameplay objects as carefully as to artwork.

## Why start with Missing Link

Missing Link tests the central opportunity directly: whether choosing where these mechanisms belong is as satisfying as watching them. Its win condition is concrete, its choices visibly alter the result, and its reuse includes the strongest stock pieces. A short board is enough to assess that premise.

It also leaves useful foundations: authored placements, stable variants, connection checks, board input, and replay can support Pocket Orchestra or Counterpoint later. On Cue first needs evidence that the timing and feedback feel reliable. Counterpoint needs a scheduler. Chain of Evidence is cheaper, but the quality and longevity depend more heavily on writing individual cases.

**First playable slice: a small repair bench.**

1. **One world and three authored puzzle cards.** Use Regular's light paper and stock drawings on a board roughly ten cells wide by six high. Card one connects a raised outlet; card two requires a descent that reverses direction; card three adds a specified color at the finish. Give each a few fixed anchors and two or three movable pieces, with one plausible alternative. Aim for a run of roughly 10–20 seconds and a few minutes of play across the set.
2. **A restricted inventory.** Rail, one-floor lift, one-floor drop, scoop, and painter across the three cards; a fixed bell near the end; an existing portal drawing for the destination. Pin each card's variant, orientation options, and paint output in the level data. The player places an exact object, and rearranging it must not reroll its behavior. Adapting `place()` to expose these stable choices is part of the slice.
3. **A complete edit–run–repair loop.** Select a piece and a socket/cell, mirror when permitted, undo, release, pause, scrub, and reset. Provide pointer/touch controls and keyboard placement. Show legal footprints while placing. Begin with discrete snapping and retain only a few candidate locations so attention goes to mechanisms and connections.
4. **A visible result.** Check occupied cells, handoff position and heading, destination, and any color condition. A disconnected run plays its valid prefix and stops at the faulty handoff with a small page-level explanation. It must not silently add a portal or teleport across a gap. A correct run rings the bell and enters the destination; hold that completed frame and offer replay.
5. **A narrow engine adapter.** Preserve the piece's drawing, lane, and ball-change contracts. Compile the ordered reachable pieces into a finite show, carrying `ballIn`, changes, and start times; keep unused pieces idle. Use `drawWorld`, a fixed framing, and `Transport` for playback. Generate a modest bell cue with `ticks.ts` if sound is included. A small level-specific adapter is sufficient; a universal editor is unnecessary for this slice.

The slice succeeds if a new player can infer a piece's exit from its preview, understand a failed handoff, repair it without explanation, and enjoy watching the successful run again. Verify exact handoffs and repeatability after edits and scrubs using the patterns in [apps/rube/checks/machine.ts](../apps/rube/checks/machine.ts); inspect the board and controls at desktop and phone sizes. These are proposed acceptance checks, not tests run for this document.

Daily boards, generated puzzles, cross-world inventories, shared-track balls, leaderboards, and replay export belong after that first interaction proves itself. The next step is Stephen's concept selection.
