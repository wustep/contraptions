# contraptions

A generator for grids of tiny animated machines — each cell is a small,
self-contained mechanism that loops forever, and the piece is whatever falls out
of scattering a few hundred of them across a grid.

Heavily inspired by [Okazz](https://x.com/okazz_/status/2090999902805393607) —
heavy ink outlines, one flat fill per part, a handful of bright colors on paper.

Two modes of one thing live here. The front door is **Machine** — one ball
on one thread through a Rube Goldberg chain that never ends, round four
worlds in a fixed order (`apps/rube/`, [below](#machine-appsrube); the code
calls it the show). Beside it is **Explorations**: the generator the machine
grew out of, six modes of tiny machines on a grid with every dial exposed
(`src/`; the code calls it the sandbox). Both wear the same chrome: one
panel down the right edge at the window's full height, the canvas filling
everything else, and a two-tab switch at the top of the panel —
**Machine | Explorations** — that moves between them and carries the seed
across. Both open with the panel hidden; <kbd>P</kbd> (or the tab on the
edge) brings it out, and <kbd>P</kbd> puts it away again.

**[Machine →](https://contraptions-wustep.vercel.app/?seed=amber-gasket)** ·
**[Explorations →](https://contraptions-wustep.vercel.app/explorations/)**

```bash
npm install
npm run dev          # http://localhost:8791/ is Machine, /explorations/ is Explorations
npm run check        # headless smoke test of Explorations' pure core
npm run check:rube   # headless checks on Machine: the worlds, the planner, the chain, the ball, the tempo
npm run build        # one dist/: Machine at /, Explorations at /explorations/, /sandbox/ and /rube/ redirecting
```

One Vite root serves and builds all of it: `index.html` is Machine,
`explorations/index.html` is Explorations, and two pages only forward:
`sandbox/index.html` sends old links to `/explorations/` and
`rube/index.html` — where Machine used to live — sends them to `/`, both
keeping the seed. The two modes share the core (`src/core/`), the panel
chrome (`src/ui/shell.ts`, `src/ui/styles.css`) and p5 as common chunks.

## Explorations: `src/`

Press <kbd>space</kbd> to reroll, <kbd>⇧space</kbd> to roll everything — the
mode included. Every control is mirrored into the URL, so any frame you like
is a shareable link.

Six modes, 20 palettes, 4 layouts. Classic keeps the original 36 toys;
Cascade, Workshop and Circus each bring their own catalog and their own
grid.

## How it fits together

```
index.html               the front door: Machine
explorations/index.html  Explorations
sandbox/index.html       where Explorations used to live; redirects to /explorations/ and keeps the seed
rube/index.html          where Machine used to live; redirects to / and keeps the seed
apps/rube/               Machine (see below)
  src/worlds.ts          the four worlds and the order the show visits them in
  src/pieces/            one folder a world, each its own vocabulary; rail.ts and portal.ts are shared
src/
  core/
    types.ts        the Contraption contract
    define.ts       defineContraption()
    composition.ts  seed + options -> a placed, oriented, phase-offset piece
    engine.ts       owns the clock, drives p5
    wiring.ts       builds firing chains between neighbours
    lane.ts         how a token crosses a cell, and how lanes join up
    layouts.ts      grid | bricks | quads | bands
    themes.ts       20 palettes, shared with Machine
    rng.ts          seeded, forkable randomness
    ease.ts         easing, staging, wrapping
    draw.ts         shared vocabulary (rails, coils, teeth, clipping)
  contraptions/     classic toys, plus one namespaced catalog per Goldberg mode
    cascade/        25 beats a token rolls through; parts.ts is the shared rail
    workshop/       30 benches; shop.ts is the shared floor and part
    circus/         28 looping acts; circus.ts is the shared vocabulary
  worlds/
    lanes.ts        where tokens travel inside a cell, shared by both worlds
    ports/          framework A: machines with typed edge ports, a chain solver
    tracks/         framework B: a carved loop, balls drawn by the world, reactors
    goldberg/       the cascade, workshop and circus grids; the token is theirs
  ui/
    shell.ts        the chrome both modes share: the panel, the mode switch, Hide
    styles.css      one stylesheet for both pages
    panel.ts        Explorations' dials
```

## The contract

A contraption fills one cell. Three rules:

1. **`draw` is a pure function of `u`.** `u` is your position in the loop, in
   `[0, 1)`. Never accumulate state across frames. This is what makes pausing,
   scrubbing, deterministic export, and seamless looping work at all.
2. **Draw in cell-local space.** The origin is the cell center and the footprint
   spans `[-w/2, w/2]` by `[-h/2, h/2]`. Rotation and mirroring are applied for
   you, as is `rectMode(CENTER)`.
3. **Be periodic in `LOOP` frames, or a divisor of it.** `LOOP` is 240 (4s at
   60fps), and 240 has enough divisors to be generous. Because a periodic
   animation stays periodic under any integer phase shift, the whole piece
   returns to its starting state every `LOOP` frames no matter how the
   instances are offset.

```ts
export const hammer = defineContraption({
  name: 'hammer',
  fireAt: 0.86,                       // the moment the weight lands
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size, u, ink, weight }) => {
    const y = u < 0.12
      ? lerp(reach, -reach, easeOutSine(seg(u, 0, 0.12)))
      : lerp(-reach, reach, easeInQuad(seg(u, 0.12, 0.86)))
    outline(p, ink, weight)
    p.line(0, -size * 0.4, 0, size * 0.4)
    solid(p, ink, weight, s.color)
    p.circle(0, y, size * 0.3)
  },
})
```

`seg(u, a, b)` renormalizes `u` against a sub-window and clamps — it is the
workhorse for anything with stages.

### Adding one

```bash
npm run new -- slot-machine
```

Writes the file and registers it. Then hit **Catalog** in the panel to see it
next to everything else, or use **Solo** to fill the whole grid with just that
one while you work on it.

## Multi-cell machines

A contraption can declare a footprint larger than one cell:

```ts
span: [3, 1]     // pendulum-wave: three cells wide, one tall
span: [2, 2]     // gantry, marble-run, orrery
```

Placement runs in two passes. Spanning machines go first and claim contiguous
blocks of equal-sized free cells; single-cell machines then fill the leftovers.
A layout whose rows do not line up (`bricks`) fails the block check and quietly
gets all singles, which is the right fallback rather than a special case.

Machines that depend on gravity — the crane, the chute, the drip — set
`rotations: [0]` so they stay the right way up.

## Wired chains

Adjacent machines can be wired so they fire in sequence, and the wiring is
drawn: a conduit runs under the cells, junctions and a travelling bead sit on
top.

Nothing is evaluated in order at draw time. A chain is purely a phase
assignment — each machine's phase is chosen so its firing moment lands
`LINK_DELAY` frames after the one before it. The cascade you see is real
causality expressed as arithmetic, which is what lets every contraption stay a
pure function of its own `u`.

Chains have a grammar, and it is enforced by construction. Machines declare a
`role`:

| Role | Meaning |
| --- | --- |
| `source` | Does something discrete that could set another machine off — a strike, an arrival, a bucket going over |
| `relay` | Visibly conducts: something turns, slides, or passes along |
| `sink` | Visibly reacts when the signal arrives |

Runs of free cells are reserved *before* machines are placed, then staffed
`source -> relay* -> sink`. Drawing a line through cells that were already
filled is what produced chains reading "gear → wavy → abacus", which says
nothing. Paths grow in a mostly straight line with at most one corner; a random
walk doubles back and crosses itself, which reads as tangle rather than as a
signal going somewhere.

A sink does not have to consult anything to read as caused — because phases are
chosen so each machine's own `fireAt` lands on the frame the cascade needs, an
elevator simply arrives at the top on cue. Two hooks go further:

- `fireAt` — where in the loop the notable moment falls. Defaults to 0.
- `fired` in the draw context — 1 at that instant, decaying to 0 shortly after.
  Derived from `u`, so using it costs no purity.

`lamp`, `gate` and `bell` are built entirely around `fired`, and are what make a
run legible at a glance. Only machines whose period is the full loop are
eligible, so a chain never has to reason about a member firing twice per cycle.

## Modes

A mode picks **both a catalog and a composer**. That is what lets three
Goldberg catalogs share names (`hopper`, `bell`, `lamp`) without colliding:
each lives in its own folder, and each composer is the thesis of that set.
Classic keeps the original toys on the leftover-fill grid; Ports and Tracks are
the two worlds. Cascade, Workshop and Circus build **their own
grid** — a uniform block of cells that fills the frame — rather than staffing
runs through a classic layout. That is why the Layout control disappears for
them, and why each carries its own resolution range: their machines are read
close up, so a cascade is 5–9 cells across where a classic piece is 6–24.

| Mode | Catalog | Composer | Cells across |
| --- | --- | --- | --- |
| Classic | the original 36 toys | independent machines, abstract wires | 6–24 |
| Ports | `src/worlds/ports/` | tokens handed across typed edges | 8–20 |
| Tracks | `src/worlds/tracks/` | balls circulating on a carved loop | 8–20 |
| Cascade | `src/contraptions/cascade/` | one snake of stations, tokens on lanes | 5–9 |
| Workshop | `src/contraptions/workshop/` | one shop line of benches, parts on lanes | 5–9 |
| Circus | `src/contraptions/circus/` | a full grid of closed looping acts; the drumroll fires them in sequence | 4–7 |

The Mode control lists all six by name. Catalog view shows the active
mode's pieces. The URL stores the mode name (`?mode=cascade`).

### Lanes

Cascade and Workshop hand a token from cell to cell, and the one thing that
must never happen is for it to blink out at a seam. So the machines do not draw
it. A machine declares a **lane** — its token's path across the cell, in cell
units, with rolls, rides and holds where it acts (`src/core/lane.ts`). The
world concatenates the lanes along the snake, draws every token once from the
joined path, and sets each machine's phase so its own clock reads `fireAt` at
the instant the token arrives at its fire point. One drawing of the token, one
path, one clock: it cannot be drawn twice, disagree with its neighbour, or fall
through a gap. Tracks reached the same conclusion first, with its balls.

### Cascade

One snake. The world lays its own grid across the frame and threads a single
run through every cell of it: a feeder, then stations, then a sink, with
two-cell elevator stacks where the run has to change floor. The feeder lets a
ball go once a loop, and the run is longer than a loop, so several balls are on
it at once — each one continuous from throat to sink, and one always resting in
the throat and one in the sink, because the next arrival replaces it at the
same instant. **Stations** is the fraction of the run that is machinery; the
rest is plain rail, so the dial trades a dense chain of events against a long
roll between them. The balls are drawn by the world along the joined lane, and
the elevator cars, cables and counterweights come off the same clock, so
nothing that moves with a ball is drawn by more than one thing.

`src/contraptions/cascade/parts.ts` is the shared vocabulary; the composer
lives in `src/worlds/goldberg/cascade.ts`.

### Workshop

The same machinery, read as a shop floor: a hopper feeds a part onto the line,
benches work it as it goes, and it ends in a bin, a bell, or a lamp. Cells that
are not stations are belt. Parts are released every half loop rather than every
loop, so the line always has work on it. `shop.ts` is the vocabulary every
bench agrees on (`BENCH` is the same floor the ports and tracks worlds roll
on). The composer lives in `src/worlds/goldberg/workshop.ts`.

### Circus

Every cell is a looping act, and every act stays inside its own footprint: a
performer that leaves a tower comes back to it by the end of the loop, and the
stunt on the way fires again next lap. Because nothing is handed across a cell
edge, the programme does not need a snake — the world lays its own uniform grid
across the frame and fills all of it. **Multi-cell** is the share of the floor
the big acts take (big top, ferris wheel, tightrope, cannon, high dive, the
two-cell elevator ride); every remaining cell gets a small act. **Drumroll** is
how much of what is left is wired into chains that fire a beat apart, source →
relay → sink; the rest free-runs on its own phase. The conduit itself is not
drawn: on a floor this full a centre-to-centre line runs straight through the
act it is cueing, and a bead travelling between cells would contradict the one
rule the mode is built on. `circus.ts` holds the shared props (performer,
flight, knock, hoop, bell).

### Ports (framework A)

A machine declares what crosses each of its edges: a **ball** rolling on the
floor or falling down the middle, a **shaft** (a gear whose teeth reach the
edge), or a **push** (a rod, a toppling bar). The composer grows chains by
depth-first search, keeping a machine only if every out-port it insists on can
be met by a neighbour, so nothing runs into nothing — chains end in a cup, a
bell, or an idle gear. Phases are assigned afterwards so a ball leaves one cell
on the exact frame it enters the next.

Converters are what make it a Rube Goldberg machine: a paddle wheel turns a
falling ball into rotation, a cam turns rotation into a push, a latch turns a
push into a released ball.

### Tracks (framework B)

Built from what ports taught. The ball is drawn once, by the world, along a
track that is carved first as a closed loop — runs zig-zagging down, a bucket
lift back up — so the piece is a perpetual machine by construction. The track
cells draw themselves from the same path the ball follows, so lines and balls
cannot disagree. Machines along the track are reactors: each reaches a feeler
into the track as far as the ball and is knocked by it as it passes. With N
balls spaced evenly going round m/N times per loop, every reactor sees a ball
every 1/m of the loop, which is exactly the period the contract wants.

Both worlds have their own **Catalog** sheet: ports shows each machine wired
as if mid-chain, tracks shows each track shape with a ball running through it
and each reactor beside the piece of track it reacts to.

## Options

| Control | Effect |
| --- | --- |
| Seed | Everything random derives from this string |
| Mode | `classic`, `ports`, `tracks`, `cascade`, `workshop`, `circus` |
| Theme | 20 palettes, each a different mood |
| Layout | `grid`, `bricks` (offset courses), `quads` (recursive subdivision), `bands` (columns at mixed scales) — Classic only; the other modes lay out their own grid |
| Resolution | Cells across the art area, within the mode's range (classic 6–24, ports and tracks 8–20, cascade and workshop 5–9, circus 4–7) |
| Stroke | Multiplier on the computed line weight |
| Multi-cell | How eagerly to place machines larger than one cell |
| Stations / Drumroll / Wired chains | How much of the piece is machinery, or wired into firing sequences — the dial is renamed per mode |
| Tag / Solo | Narrow the pool while exploring |
| Catalog | One labelled instance of every machine |

The resolution range is the mode's, not the slider's: a composer builds at the
clamped value and the panel writes it back into the URL, so a link never shows
you a res the piece was not built at. `quads` and `bands` mix two cell sizes
and no more, differing by exactly 2, and the whole piece is drawn with one pen
(`Composition.unit`): a cell twice its neighbour's size is twice the drawing,
not twice the ink, so small machines stop reading as artifacts beside large
ones.

**Reroll** draws a new seed and keeps every dial. **Roll all** rolls the
whole configuration — a different mode every time, then a theme, a layout
where the new mode has one, and every dial inside that mode's own range —
and clears the tag, solo and catalog filters, so it always means "show me a
fresh piece from another world".

Playback speed, the scrub bar, export scale, and the grid overlay are view
settings: they change how the piece is watched, never what it is, so they do
not rebuild the composition and stay out of the URL.

The piece is square and the window is not, so the canvas takes the stage's
shorter side and the stage itself is painted in the piece's paper: one
sheet, edge to edge, whatever the aspect ratio. Hiding the panel gives the
piece the room the panel had.

Export writes a PNG at the chosen scale, or a WebM of one loop at the current
canvas size (capped at 12s). The clock is held for the encode the same way it
is for PNG; progress is a view of the clock and never enters the URL.

<kbd>space</kbd> reroll · <kbd>⇧space</kbd> roll everything · <kbd>K</kbd> pause ·
<kbd>S</kbd> save png · <kbd>G</kbd> grid overlay · <kbd>P</kbd> hide panel ·
<kbd>←</kbd> <kbd>→</kbd> step a frame · <kbd>⇧←</kbd> <kbd>⇧→</kbd> jump a beat

## Machine: `apps/rube/`

A second app in the same repo, and a different thing: not a grid of
machines but **one ball on one thread**, rolling through a Rube Goldberg
chain that never ends. The show opens with the whole window; <kbd>P</kbd>
brings the panel out and the canvas fills everything it leaves. The camera
follows the ball; every portal is a door to a whole new map — a new
palette, a new taste in pieces, a new layout — and the cut is an iris: the
camera pushes in as the ball is swallowed, holds shut a beat, and opens
wide on the new world.

**[Watch it →](https://contraptions-wustep.vercel.app/?seed=amber-gasket)**
— `amber-gasket` is the seed to share: a painter, a switchback, a gravity
inverter, a zipline and a cannon in the workshop — sixteen beats and no
piece twice — then a harbor at sundown with a lock, a jellyfish, a seal
and a dinghy, then a greenhouse with three toadstools, a bumblebee and a
well, then neon with a coaster and a one-armed bandit; and no piece twice
in any of the four.

```bash
npm run dev           # http://localhost:8791/ — Machine; /explorations/ is Explorations
npm run check:rube    # headless checks on the worlds, the planner, the chain, the ball's state, the tempo
npm run build         # dist/ with Machine at /, Explorations at /explorations/, /sandbox/ and /rube/ redirecting
```

### Four worlds

The show goes round **four worlds in a fixed order** — the way a climb
goes through its biomes — and every world is a place with its own
vocabulary of pieces, not a palette swap:

| | World | The place | Its pieces |
| --- | --- | --- | --- |
| 1 | **Workshop** | the atelier: brass, oil, paper and gravity | the classic Rube Goldberg set, thirty-four of them |
| 2 | **Harbor** | a pier over water, tide and salt | twenty-four: sea life, boats, pier gear and the tide |
| 3 | **Garden** | a greenhouse, soil and bloom | twenty-four: what grows, what lives in it, and the tools in the shed |
| 4 | **Arcade** | neon night: lights, scores and payouts | twenty-four: pinball, the midway, the payout machines and the screens |

Workshop → harbor → garden → arcade → workshop, always. What the seed
decides is everything *inside* a visit: which of the world's palettes it
is painted in (each has two of its own, never shared), which of
its tastes the planner leans on, how the map is laid out, and which pieces
it draws — always and only from that world's pool. Two visits to the same
world never look alike back to back.

**No world is the small one.** Every world has at least twenty-four beats
of its own (the workshop thirty-four), and four tastes to lean on: the
harbor's *tidal*, *quay*, *surf* and *reef*; the garden's *greenhouse*,
*allotment*, *wild* and *lawn*; the arcade's *pinball*, *midway*,
*jackpot* and *screens*. A world's vocabulary is chosen for geometry
before theme. A map only stays fresh if its pieces can go up, come down,
turn back and throw, so each world has its own ways up (a lock, a frog's
tongue, a saucer's beam), its own ways down (a slipway, a falling leaf, a
cleared line) and seven or more flights, as well as its own things to say
on the flat.

The palettes are **two a world, eight in all**. A world keeps only
palettes that differ in their paper and their mood, not in a reshuffle of
hues, and that keep the house style — a bright flat fill inside heavy ink
on a ground:

| World | Its palettes |
| --- | --- |
| Workshop | **Okazz**, the original's cool sheet and five bright inks · **Atelier**, brass and oxblood on warm paper |
| Harbor | **Harbor**, navy, coral and sand on sea-sky paper · **Sundown**, the pier at the end of the day |
| Garden | **Greenhouse**, leaf and terracotta on cream · **Allotment**, kraft paper, soil and radish |
| Arcade | **Neon**, signs after rain on violet · **CRT**, phosphor green |

**Night is the arcade's alone.** Every other world is painted on light
paper, so the cut into the arcade is the loop's one fall of dark and the
cut back to the workshop is its morning; a dark harbor or a dark garden
spends that, and reads as an arcade with the wrong pieces in it.

Each world has its own rail (a pier
on pilings over still water, a path edge between stakes and tufts, a lit
lane whose lamps come on as the ball passes) and its own backdrop
(chart-marks for the harbor, sprigs for the garden, stars or a grid for
the arcade). The portal is the same door everywhere.

The seed is in the URL (`?seed=amber-gasket`) and fixes the whole future:
world `i` is a visit to world `i mod 4` of the loop, built from `seed#i`,
so a link is the show, and any moment of it can be rebuilt on demand. The
panel is Explorations' panel with the show's sections in it: the **seed**
card rerolls (<kbd>R</kbd>) or copies the link; **World** reads out where
the ball is — the world's index, which world it is and which comes next,
its palette and taste, the piece in hand — shows the loop as four chips
with the current one lit (click one to jump to the next visit to that
world; **Pin** to stay there), jumps world to world (<kbd>N</kbd> for the
next; <kbd>⇧N</kbd> is a player's back, to the top of this world and from
there to the one before), restarts, opens the **catalog** (<kbd>C</kbd>)
or the **overview** of the whole map (<kbd>O</kbd>); **Transport** is play/pause
(<kbd>space</kbd>), speed from ¼× to 4×, and a scrub bar over the current
world; <kbd>←</kbd> <kbd>→</kbd> step a frame, with shift a second.
`?solo=hammer` narrows the planner to one piece (plus rail and portals)
for polishing it, and keeps the show in that piece's world; `?world=harbor`
keeps it in one world on its own. Old links to `/rube/` still work: that
page sends them to `/` with the seed.

`?catalog=1` opens the **catalog** instead of the show: a sheet of every
piece **grouped by world** — four bands in the loop's order, each on its
own paper in its own ink — each piece looping on its own between two
portals with its name under it. It scrolls when the four bands are taller
than the screen. Click a piece to watch it alone (`?solo=<name>`, in its
world): held whole in one steady frame rather than chased by the camera,
since its world is three seconds long. <kbd>[</kbd> and <kbd>]</kbd> step
to the piece before and after it on the sheet without going back to the
sheet between.

The three views are a stack — the machine, the catalog over it, a piece
alone over that — with **one way back**, which every door shares:
<kbd>esc</kbd>, the way-back button in the stage's top left corner (it
says where it goes: **← Catalog**, **← Machine**; it is on the stage
because the panel starts hidden), the panel's own button, <kbd>c</kbd>,
and the browser's Back all do the same thing and land in the same place.
Going up the stack is a step in the history and the way back is going
back in it, so Back and Forward and <kbd>esc</kbd> never disagree; a link
straight to a sheet or a solo has nothing under it, and there the view
below takes its place. A view is left the way it will be found again: the
show picks up where the ball was rather than from the top, and the sheet
opens where it was scrolled to with the piece just watched brought into
view and lit for a moment. A reroll up the stack comes back down with you.

A world is one map: a self-avoiding walk of eleven to sixteen beats in a
box, from a portal to a portal, with a tempo — a run of two or three beats
back to back, then a flight when one fits, then a breath of rail.

A chain reaction is a run of *different* causes, so **a map says a thing
once before it says it twice**. Every use of a piece in a map cuts its
weight there, and a piece seen in the last five beats is all but out of
the draw, so when a small world does have to repeat itself the repeat
lands far enough on to read as a callback rather than a stutter. What the
last visit to this world was built from is a little stale too, so two
visits reach for different halves of a large pool. Of the six walks the
planner tries it keeps the one that says the most different things, and a
map never asks for more beats than its world has pieces and two — a small
world gets a shorter visit rather than the same beats three times over,
and the cap dissolves by itself as a world's vocabulary grows. These are
weights, never bans: the taste still says what a visit leans on, and a
piece that is the only thing that fits is still placed.

The ball's state rides the chain: its colour, which ball holds the thread,
and whether it is a ghost, so a piece can change it and the next piece
knows. Every world has pieces that do (the workshop's painter, cradle and
inverter; the harbor's octopus, oyster and anemone; the garden's
sunflower, pod, cocoon and appletree; the arcade's changer, gauss, pixel
and phaser); they are capped at two a map and never absent for three maps
running, and a piece that recolours the ball only places itself where it
can hand the ball on in a colour other than the one it arrived in — never
the same colour out as in. And no piece is ever handed the colour the ball
arrives in: the planner leaves the ball's current colour out of the pool a
piece is painted from, so a ball never vanishes into what holds it, however
many times it has been recoloured on the way. A ghost is the ball as a dashed outline that
solid things do not stop, and it is a piece's own business. The phaser
makes one to take it through a brick wall and makes it solid again before
it hands it on. A piece declares for itself whether it changes the ball
(`dynamic`) or throws it (`flight`), and the planner reads the flags off
whatever pool it is handed.

### The workshop's pieces

**Thirty-four pieces**, curated from the eighty-odd toys in the other
catalogs and rewritten for one ball, each a beat the ball is seen to cause:

| Piece | What happens |
| --- | --- |
| rail | a plain cell, so the beats have room to land: a post, a bracket, a riveted plate |
| hammer | two cells tall: wait on the anvil, the pawl trembles and lets go, a wedge head drops a floor and squeezes the ball out fast |
| seesaw | up, hang over the pivot, down faster, onto the stop |
| bell | the clapper is in the way; the ball shoulders it ahead to the lip, where it strikes, and slips under it; the bell knocks on its pin; punctuation |
| bellows | tongue → rod → roof lever → hook → weight → bellows → puff → go |
| dominoes | gate → striker → six dominoes, each knocking the next → button → a pulse along the wire → the coil snaps the portcullis up |
| drop | lip, tube, a flap per floor, quarter-pipe; down one to three floors, on or back |
| lift | pawl → counterweight → cage; up one to three floors, on or back |
| cannon | match, a long fuse, bang, the carriage kicks back, flight, landing bumper; over two and up one |
| loop | round a loop-the-loop, slow at the top, no mechanism at all |
| scoop | a bucket wheel, four deep cups on a hub; the ball rides in its seat round the far side and drops out near the bottom; a pawl clicks on the hub's ratchet; down one floor, facing back |
| toaster | into the slot, and seen through the window sitting between the elements as they glow and the timer runs down; pop; up one floor |
| crane | magnet down, blink, up, along the beam on turning wheels over a gap in the rail, think, drop; over two |
| rocket | button → sputter → flame → sled to the chock; the ball pops out of the cup over it and rolls on; over two |
| pendulum | tongue → cord → hook → a wrecking ball on a real pendulum's clock |
| trapdoor | weight → lever → bolt → the floor gives way; a ramp; down one |
| trampoline | the rail just stops; a pit, springs that stretch, a bounce, the biggest arc in the show |
| funnel | round and down a glass bowl, in view the whole way, through the neck; down one, on or back |
| conveyor | switch → motor → cleats carry the ball up a floor, slowly, on purpose |
| paddle | a wheel kicked round once; a relay |
| balloon | pin → sandbag → the balloon rises the mast, tugging at its ropes; up one or two |
| plunger | into a dimple at the rail's end; pawl → spring → a kicker comes up through a slot under the ball's back and boots it across a cell with no rail in it at all |
| stairs | four steps down, off each lip with a bounce, a tap on each tread |
| switchback | ramps down to bumpers that turn the ball; two ramps for one floor facing back, three for two facing on |
| zipline | a cup on a trolley runs a wire that dips under it, down a floor and over two, to a stop |
| tipper | a counterweighted tray on its heel creeps under the ball's weight, then tips past upright and dumps it a floor down; clack |
| drawbridge | plate → pawl → the winch pays out the chain → the bridge falls across the gap |
| gears | plate → pawl → three gears run → a cord hauls the gate up its guide |
| trapeze | a basket on ropes swings the ball across two cells of nothing, to a catch |
| trebuchet | the counterweight drops, the arm comes over, the ball leaves along its tangent two cells |
| screw | an Archimedes' screw in a glass tube carries the ball up a floor |
| flipper | a drooping pinball bat; the ball settles in its lip, the bat whips up and lets go as it passes level; up a floor onto a shelf |
| painter | the ball stops on a plate under two nozzles; they spray while it turns a new colour, for good; the dryer horn blows it on |
| cradle | a Newton's cradle: the ball stops dead and the thread passes to the far ball, which slips its string mid-swing and flies on |
| inverter | gravity flips inside a field between two coils where the floor rail stops; the ball bobs along the ceiling and drops back |
| portal | the door at either end of a map; the far side is always a new map |

### The harbor's pieces

A pier over water. Under every rail there is still water on pilings — still
on purpose, since a piece's clock is its own and a ripple animated from it
would jump phase at every cell edge; what moves is what the ball does to it.
Water is always the palette's blue — a splash never borrows the colour of
the hull or the animal that threw it up — and an animal or a hull the ball
rides is never painted the ball's own colour, so the ball is always seen
against what holds it.

| Piece | What happens |
| --- | --- |
| rail | a pier: a piling, a cleat with a coil of rope, a life ring hung under the deck |
| buoy | the deck stops; a bell buoy leans to meet the ball and the ball rides its deck over the crest; it rocks over, clangs, and runs the ball off faster |
| wave | a swell curling over, never still: the crest heaves, froth rolls over it and off the lip, streaks climb the face; the ball rides the face two cells over and a floor down, spray behind it |
| lighthouse | the door opens and the ball goes in through it, behind the jamb; a lit window climbs the tower; out of the lantern room's door onto the gallery one or two floors up; the beam turns |
| crab | rolls into the claw; lifted, aimed, pitched across a cell of open water |
| kelp | into a glass tank at the bottom, bending upward as the water takes it; rises between two stalks of kelp on its own bubbles; out at the rim |
| octopus | its eyes follow the ball; the funnel on its head puckers and squirts ink straight up at it; a splat, and the ball leaves a new colour |
| anchor | onto the stock; the pawl trips; down one to three floors on the chain to the seabed; wound back up later |
| pelican | off the deck's end into the open beak of a pelican bent down from its post; it hops round, flies the gap to the far post, tips its head and the ball rolls out onto the deck |
| blowhole | onto a whale's back, into the dip over its blowhole; a rumble; it blows, and the spout throws the ball a floor up, past a shelf and down onto it |
| oyster | into the open shell; snap; a beat; a pearl rolls out and takes the thread |
| whirlpool | onto the water of a tank full to the brim; the current takes it round the near side and round and down the vortex to the drain, out a floor down facing back |
| dinghy | over the transom of a moored dinghy; the shove slips her painter off the cleat, the sail fills and she sails two cells to the far pier's fender; the jolt pitches the ball off over the bow |
| seal | off the deck's end onto the nose of a seal on a rock; it rears up, balances, bounces it twice, winds back and tosses it up past the end of the deck above and down onto it, on or back; then it claps |
| flags | across a treadle plank; the pawl under it lets a lead weight go into the water, and three signal flags run up the mast, a pennant, a square and a swallowtail, each breaking out as it clears the ball |
| slipway | into the cockpit of a hull on a cradle at the head of the ways; the thump jumps the chock out; down the ways, off the cradle at its stop, a belly-flop a floor below that throws the ball onto the pier |
| jellyfish | off the deck's end onto the crown of a jellyfish's bell, which dimples deep and springs back; a high arc onto the deck a floor up; the bell rings on, the lights round its rim running out from the middle |
| floats | the deck stops; three net floats on a line; each dunks under the ball and bobs it on to the next, a ring on the water each time |
| lock | across the apron onto a raft in a lock chamber, the gate coming down behind; water runs in through the culvert from the upper pound and the raft rises a floor; its tail kicks up at the top and the ball rolls off |
| puffer | onto the back of a pufferfish asleep in a gap in the deck; it blows up with a start to a ball of spines and pops the ball over onto the far deck; then sighs itself small again |
| hawser | into a breeches buoy under a block on a mooring line; the jerk pulls the lanyard's toggle; down the line, which the load hangs in two straight parts, to a rat guard; the ring swings on and tips the ball out a floor down |
| dolphin | off the deck's end, and a dolphin comes up under it, takes it on its beak and leaps a whole arc; at the top it flicks the ball on to the deck above and dives in under that deck's end; a fin cruises before and after |
| foghorn | out along a treadle that squeezes a bellows under the deck; the horn sounds right behind the ball and the blast sends it off faster; the gull asleep on the horn goes straight up |
| serpent | the deck stops; a sea serpent's coils come up out of the water ahead of the ball and go under behind it, and it rolls over them and down the head's brow onto the far deck; the ball never stops |
| anemone | into the crown of an anemone in a rock pool; the tentacles close over it like a fist and squeeze twice; it leaves the anemone's colour, shouldered out by a wave of the fan |

### The garden's pieces

| Piece | What happens |
| --- | --- |
| rail | a path edge on stakes, between tufts of grass and a pot with one flower |
| wateringcan | tongue → cord → the can tips → a shower washes the ball on its way faster |
| vine | onto a leaf in a pot; the vine shoots up the trellis with it, leaves unfurling; at the top the leaf droops and spills it onto the rail, one or two floors up |
| bloom | over the near petals and round and down the inside of a trumpet flower, down the hollow stem into its pot, out at the root a floor down |
| wheelbarrow | into the tray; the barrow trundles two cells to a chock and pitches forward, and the ball rides the tip out over the lip |
| sprinkler | onto the head; the tap opens and the nozzles go round; spun off across a flowerbed |
| sunflower | over a root; the head nods and dusts the ball with pollen; a new colour |
| pod | into a seed pod's mouth; it swells and bursts; a seed in the plant's own colour shoots out between the flaps and takes the thread |
| burrow | over the lip of a hole and down it; a ridge of earth runs down the soil; up out of the top of a molehill a floor down, over its foot onto the rail; the mole looks out |
| hose | into a hose's mouth, and the hose swallows it like a snake: a bulge the ball's size in its own skin goes round the loop two and a half times, gathering pace; out of the nozzle |
| rake | over the handle and onto the tines; the handle comes up behind, over the top, and cracks the ball on its back; it shoots off and the handle lies ahead |
| snail | up the tail onto the shell; carried most of a cell, slowly, leaving a trail; a shrug tips the shell and the ball rolls off its front, over the head |
| frog | onto a flat stone under a frog on a lily pad; it leans out, its throat swells, the tongue comes down the whole drop, sticks and snaps back with the ball; cheeks full; ptui, out along the rail one or two floors up |
| toadstools | off the path's end onto three toadstools, each taller than the last; every cap squashes, springs and puffs spores; pum, pum, pum, onto the rail a floor up |
| appletree | the ball bonks the trunk and stops dead; the crown shudders, a leaf or two falls; the ripe apple on the far bough drops, bounces once and rolls on with the thread; the ball stays at the tree's foot |
| spade | onto the blade of a spade across a log; the grip kicks the twig out from under a flowerpot; the pot comes down on the handle; up off the blade, one or two floors, on or back |
| well | over the coping into the bucket; the pawl slips, the crank whirls; down the shaft two or three floors; the bucket topples on a stone and the ball rolls out through an arch |
| bamboo | onto the scoop of a shishi-odoshi; its weight brings the mouth down onto the terrace's coping; off the tip and down a floor, heading back; the tail cracks on its stone |
| cocoon | into one mouth of a silk tunnel slung between two twigs; it rocks and flushes with colour, the seam splits, three butterflies come out; the ball rolls out the far mouth their colour |
| bumblebee | onto a daisy's face; a bumblebee comes over from its flower, takes hold, heaves twice, and labours up and across the bed with it to a shelf a floor up; sets it down rolling and goes home |
| mower | through the long grass up against a reel mower's reel; the reel spins up and a blade throws it over the top, between the handles and over the grass box, across the lawn |
| croquet | onto the mark, nose against a flap; the hook lets go and a hung mallet tocks it through two hoops; it clips the striped peg |
| scarecrow | loose on its pole, one straw hand hanging in the way; the ball shoulders it round till the arm points out at us, and the figure is flung round nearly two turns; the crow on its other arm goes up and comes back down |
| dandelion | into the cup of a seed the size of a parasol; the tether slips its peg; up on the air, swinging, one or two floors, small seeds drifting after; the stalk snags in a twig's fork and the cup tips the ball out |
| maple | out onto a big leaf held level on a sapling's twig; the stalk snaps; leaf and ball swoop down side to side, one or two floors; the ball rolls off the way the last swoop went |

### The arcade's pieces

Neon night. The palettes are dark and a colour laid down with a soft halo
reads as a lit tube; the halo is the only translucency in the show, and
scores pop off hits in a three-by-five bitmap font, on the beat of the hit,
drawn last of all over every machine and the ball, and with a rim of the
paper so they read over whatever they cross. A
machine's display is a dark window its digits light in, and marquee lamps
on a body of their own colour sit in a dark recess, so lit and unlit read.
Some of the machines are screens, and inside a screen the ball moves the
way a video game moves it: in straight lines at one pace up a Pong court,
in squares on a sprite's grid, by the tick in a falling-blocks well.

| Piece | What happens |
| --- | --- |
| rail | a lit lane: a lamp, a strip or chevrons that come on as the ball passes |
| bumper | the ball's front clips the skirt's rim; the cap slams that instant, the lamp lights, +100, out faster |
| spinner | shoves through a hanging plate — its foot rides up over the ball and slips off its back — that spins on the way the ball went, clear of its beam, counting its turns in lamps up the post; the score pops as the plate is flung and ticks up with the turns |
| changer | into the coin slot in the cabinet's side; chunk; a token comes out under the return flap on the far side and takes the thread |
| ticket | off the rail's end into the hopper; a strip of tickets feeds out below while it whirs; drops out of the prize chute beside the cabinet, one or two floors down |
| zigzag | down lit tubes, bouncing off a pad onto the next; one or two floors; +10 a pad |
| pachinko | off a lip and bouncing pin to pin through five rows, each lighting as it is struck; the jackpot pocket, whose side drops to let the ball out through a gate in the board; two floors down |
| skee | a kicker flicks it, up the alley, up the lip and off it the way it was going; a lob over the top of its arc and down into the fifty ring a floor up; the rings light as it lands |
| hockey | onto the air table; a mallet winds up behind and slaps the ball on the back the length of the table into the goal; the board lights to 1 |
| claw | into the cabinet, among the prizes on its floor; the claw comes down, closes, lifts, trundles to the chute, lets go; a fall onto the wedge at the chute's foot and down its face |
| striker | onto the puck, which sinks under the ball; the latch trips; up the tower on the puck, slowing but with pace still on it when it meets the bell, lighting every level on the dark face; ding; the puck cants and the ball rolls off, one or two floors up |
| slingshot | into the pouch of a slingshot at the rail's end; its weight slips the catch and the bands whip it up their own line through the fork; a lob a floor up onto a shelf, landing on the way down; the score pops off the fork's mouth as the ball leaves it |
| shooter | onto the cup on a plunger's tip; the knob draws down, the spring closing coil on coil; release; up a wire lane, slowing, round the arch and out through a one-way gate that clicks shut; the outer wire lights behind it; one or two floors up |
| targets | a bank of three drop targets on the lane; each checks the ball and drops into the trough under the rail, tick, tick, tick; lamps and a counter; +300; the reset bar thumps them back up |
| gauss | pulled into a magnet block faster and faster; clack; the far ball of the two on its other face fires off with the thread, through a speed trap that reads what it clocked; the one that came stays on the magnet |
| pong | a Pong court one or two floors tall: straight lines, one pace, no gravity; the paddles rally the ball up the screen, a blip a hit; the last serves it flat along the top, the other misses, the point goes up, and it leaves by the doorway there |
| pixel | behind a screen on a stand, and seen on it in squares: a sprite on the screen's grid at the screen's pace; a scanline comes down it and leaves it another colour while the cursor hops along the palette; out the far side that colour for good |
| blocks | into a falling-blocks well onto a row with one gap, up against the far wall; the piece at the top comes down in ticks and its stem fills the gap; the line flashes and clears, and the ball falls a floor and rolls out, on or back; +100 |
| phaser | a curtain of scanlines turns the ball to a ghost; it rolls straight through a wall of bricks, which go to wireframe where it is; a second curtain makes it solid again |
| ufo | onto the landing mark; the hatch opens, the beam comes down, and the ball goes up it, one or two floors; the saucer slides out over the rail with it, the beam goes out, and it rolls off |
| slots | onto the tray on the end of a one-armed bandit's lever; its weight pulls the lever down through a quarter turn, reels spinning and stopping as it comes; seven seven seven on the clunk, and the tray's wall lies along the rail below; coins in the payout tray; +777 |
| whack | across a whack-a-mole deck; moles pop up behind it and a mallet on a gantry comes after them, a beat late; the third pops up under the ball and tosses it over the rim; +10 a mole |
| hoops | into the cup of a sprung arm; the catch slips and the arm throws it, a high lob down through the rim; the net bulges round it; onto the return ramp and out under the backboard; the board lights to 2 |
| ferris | onto the seat of the low gondola of a little Ferris wheel; half a turn, slowly, every gondola swinging on its pivot; the high seat is level with the rail a floor up and the ball rolls off it |
| coaster | drops into a car at the station; the chain clacks it up the lift hill, the track lighting behind it; over the crest and down the drop to the floor below; the fins stop the car in sparks and the ball rolls on out of its nose |

No piece draws the ball. Each declares a lane — runs, pauses, speed ramps,
parabolic flights, hidden stretches, portal transits — and what it does to
the ball, and the show draws the ball once on the joined path from one
clock. Every hand-off is at rail pace, every arrival slows to its stop, and
every launch ramps back down before the cell edge. `check:rube` builds
worlds headless and asserts all of it: the four worlds in order, three
times round, at least twenty-four beats of its own in every world, every
piece from its own world's pool, every palette and
taste the world's own and never the same twice running, only the arcade
painted dark, at least three beats in four of every map a piece it has
not used yet and none in a map four times, every lane joined
up inside its piece, continuity at every hand-off, one portal at each end
and none between, the ball's state carried piece to piece, every
recolouring a change of colour, every ghost solid again before it leaves
its piece, and the tempo.

## License

Reference sketch by Okazz, CC BY-NC-SA. This implementation is a rewrite, not a
port of his file.
