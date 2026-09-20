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
(`src/`; the code calls it the sandbox). **Shows** is Machine set to music:
a machine choreographed to a piece of music with the soundtrack locked to
it, in as many versions as you care to keep side by side
([below](#shows-appsrubesrcshows)). A fourth tab, the **Builder**, is
where new pieces and worlds for Machine are made from a prompt and saved as
one file ([below](#builder-appsrubesrcbuilder)). Shows and the Builder
start hidden: press <kbd>`</kbd> five times quickly and both come out
together. All four wear the same chrome: one panel down the right edge at
the window's full height, the canvas filling everything else, and a switch
at the top of the panel that moves between them and carries the seed
across. Locked it reads **Machine | Explorations**; unlocked it is four
icon-only buttons — Machine, Explorations, Shows, Builder — each named on
hover. Machine, Explorations and Shows open with the panel hidden; once it
has been opened or closed, a switch of mode keeps it that way. <kbd>P</kbd> (or the tab on the
edge) brings it out, and <kbd>P</kbd> puts it away again. <kbd>`</kbd>
clears the stage of all of it — the panel, the tab, the way-back button —
for the piece alone, and <kbd>`</kbd> again puts back what was there.

**[Machine →](https://contraptions-wustep.vercel.app/?seed=amber-gasket)** ·
**[Explorations →](https://contraptions-wustep.vercel.app/explorations/)**

```bash
npm install
npm run dev          # http://localhost:8791/ is Machine, /explorations/ is Explorations, /shows/ is Shows
npm run check        # headless smoke test of Explorations' pure core
npm run check:rube   # headless checks on Machine: the worlds, the planner, the chain, the ball, the tempo
npm run check:builder # headless checks on the Builder: scaffolds, the file round trip, refusals, mending, the store, the stock show untouched
npm run check:shows  # headless checks on Shows: the registry and every version file, the clock, the time maps
npm run build        # one dist/: Machine at /, Explorations at /explorations/, Shows at /shows/, the Builder at /builder/, /sandbox/ and /rube/ redirecting
```

One Vite root serves and builds all of it: `index.html` is Machine,
`explorations/index.html` is Explorations, `shows/index.html` is Shows,
`builder/index.html` is the Builder, and two pages only forward:
`sandbox/index.html` sends old links to `/explorations/` and
`rube/index.html` — where Machine used to live — sends them to `/`, both
keeping the seed. The modes share the core (`src/core/`), the panel
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
shows/index.html         Shows
builder/index.html       the Builder
sandbox/index.html       where Explorations used to live; redirects to /explorations/ and keeps the seed
rube/index.html          where Machine used to live; redirects to / and keeps the seed
apps/rube/               Machine (see below)
  src/worlds.ts          the four worlds and the order the show visits them in
  src/pieces/            one folder a world, each its own vocabulary; rail.ts and portal.ts are shared
  src/shows/             Shows: the registry, the clock, the soundtrack, the stage and its recorder, the page
  src/shows/versions/    drop a <work>/<take>.show.ts here and it is in the picker; Première Arabesque lives here
  src/timed/             authored music takes the Shows versions load (Première Arabesque)
  src/builder/           the Builder: the build format, its compiler, the scaffolds, the registry, the page
  builds/                drop a .contraptions.json here and it ships with the site
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
    shell.ts        the chrome the modes share: the panel, the mode switch, Hide
    styles.css      one stylesheet for every page
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
<kbd>G</kbd> grid overlay · <kbd>P</kbd> hide panel · <kbd>`</kbd> hide everything ·
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
— `amber-gasket` is the seed to share: a painter, a gravity inverter, a
cannon, a switchback and a trapeze in Regular, sixteen beats of it; then
Forest as an allotment with toadstools, a vine, a bumblebee and a well;
then Aqua in daylight with a dolphin, a pelican, a whirlpool and a dinghy,
thirteen beats and no piece twice; then neon with whack-a-mole, a saucer,
skee-ball and the ticket machine paying out at the door.

```bash
npm run dev           # http://localhost:8791/ — Machine; /explorations/ is Explorations
npm run check:rube    # headless checks on the worlds, the planner, the chain, the ball's state, the tempo
npm run build         # dist/ with Machine at /, Explorations at /explorations/, /sandbox/ and /rube/ redirecting
```

### Four worlds

The show goes round **four worlds in a fixed order** — the way a climb
goes through its biomes — and every world is a place with its own
vocabulary of pieces, not a palette swap:

| | World | In the code | The place | Its pieces |
| --- | --- | --- | --- | --- |
| 1 | **Regular** | `workshop` | the atelier: brass, oil, paper and gravity | the classic Rube Goldberg set, thirty-four of them |
| 2 | **Forest** | `garden` | a greenhouse, soil and bloom | thirty-four: what grows, what lives in it, and the tools in the shed |
| 3 | **Aqua** | `harbor` | a pier over water, tide and salt | thirty-four: sea life, boats, pier gear and the tide |
| 4 | **Arcade** | `arcade` | neon night: lights, scores and payouts | thirty-four: pinball, the midway, the payout machines and the screens |

Regular → Forest → Aqua → Arcade → Regular, always. The panel, the catalog
and the readout use those names; the code, the folders under
`src/pieces/`, `?world=` and the rest of this file keep the places' own
(workshop, garden, harbor, arcade), so a link made before the rename still
opens. What the seed
decides is everything *inside* a visit: which of the world's palettes it
is painted in (each has two of its own, never shared), which of
its tastes the planner leans on, how the map is laid out, and which pieces
it draws — always and only from that world's pool. Two visits to the same
world never look alike back to back.

**No world is the small one.** Every world has thirty-four beats of its
own, and four tastes to lean on: the
harbor's *tidal*, *quay*, *surf* and *reef*; the garden's *greenhouse*,
*allotment*, *wild* and *lawn*; the arcade's *pinball*, *midway*,
*jackpot* and *screens*. A world's vocabulary is chosen for geometry
before theme. A map only stays fresh if its pieces can go up, come down,
turn back and throw, so each world has its own ways up (a lighthouse, a frog's
tongue, a saucer's beam), its own ways down (a slipway, a falling leaf, a
cleared line) and seven or more flights, as well as its own things to say
on the flat.

The palettes are **two a world, eight in all**. A world keeps only
palettes that differ in their paper and their mood, not in a reshuffle of
hues, and that keep the house style — a bright flat fill inside heavy ink
on a ground:

| World | Its palettes |
| --- | --- |
| Regular (workshop) | **Okazz**, the original's cool sheet and five bright inks · **Atelier**, brass and oxblood on warm paper |
| Forest (garden) | **Greenhouse**, leaf and terracotta on cream · **Allotment**, kraft paper, soil and radish |
| Aqua (harbor) | **Harbor**, navy, coral and sand on sea-sky paper · **Sundown**, the pier at the end of the day |
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
**Export** is the same pair as Explorations': the frame as a PNG at 1×, 2×
or 4× (held to what a canvas can be), or a WebM of the show's own loop — the
world the ball is in, from the cut that opens it to the cut that closes it.
Both cuts are the iris shut, and for the recording both are in that world's
own ink, so the file ends on the frame it began on. A piece alone saves its
three seconds the same way; the sheet of every piece saves as a PNG.
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
| dominoes | gate → striker → six dominoes, each knocking the next → button → a pulse along the wire → the coil snaps the portcullis up |
| drop | lip, tube, a flap per floor, quarter-pipe; down one to three floors, on or back |
| lift | pawl → counterweight → cage; up one to three floors, on or back |
| cannon | match, a long fuse, bang, the carriage kicks back, flight, landing bumper; over two and up one |
| loop | round a loop-the-loop, slow at the top, no mechanism at all |
| scoop | a bucket wheel, four deep cups on a hub; the ball rides in its seat round the far side and drops out near the bottom; a pawl clicks on the hub's ratchet; down one floor, facing back |
| toaster | let down into the slot on the carriage, the lever going down with it, and seen through the window sitting between the elements as they glow and the timer runs down; pop; up one floor |
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
| cradle | a Newton's cradle: the ball stops dead and the thread passes to the far ball, which slips its string mid-swing and flies on — one motion from the blow to the landing, a pendulum and then a fall under the same gravity |
| inverter | gravity flips inside a field between two coils where the floor rail stops; the ball bobs along the ceiling and drops back |
| toggle | off the rail into a hopper, which takes its way off with a tick on the far cheek and drops it down the middle; onto the fin of a rocker that leans away from the way out; shed down the fin into the crook of the raised arm; the rocker creeps under the weight and goes over, clack, and the ball rolls off the arm a floor down, on or back; the rocker stays pointing the other way |
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
| lighthouse | one opening shape — jambs under a round head — for the doorway, its door and every window; the door opens and the ball goes in through it, behind the jamb; a lit window climbs the tower; out of the lantern room's door onto the gallery one or two floors up; the beam turns |
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
| puffer | onto the back of a pufferfish asleep in a gap in the deck; it blows up with a start to a ball of spines and pops the ball over onto the far deck; then sighs itself small again |
| hawser | into a breeches buoy under a block on a mooring line; the jerk pulls the lanyard's toggle; down the line, which the load hangs in two straight parts, to a rat guard; the ring swings on and tips the ball out a floor down |
| dolphin | off the deck's end, and a dolphin comes up under it, takes it on its beak and leaps a whole arc; at the top it flicks the ball on to the deck above and dives in under that deck's end; its fin cruises after |
| foghorn | out along a treadle that squeezes a bellows under the deck; the horn sounds right behind the ball and the blast sends it off faster; the gull asleep on the horn goes straight up |
| serpent | the deck stops; a sea serpent's coils come up out of the water ahead of the ball and go under behind it, and it rolls over them and down the head's brow onto the far deck; the ball never stops |
| anemone | into the crown of an anemone in a rock pool; the tentacles close over it like a fist and squeeze twice; it leaves the anemone's colour, shouldered out by a wave of the fan |
| submarine | off the deck's end into the hatch of a surfaced submarine's tower; the hatch slams and she dives to periscope depth; the periscope crosses two cells of sea, a feather at its foot, wake and bubbles behind; she comes up at the far pier, water running off her flanks, the hatch opens and the ball pops out onto the deck |
| spyglass | in at the big end of a brass spyglass shut up short on a stand at the pier's end, out of sight only down its inside; it fetches up in the eyepiece like a cork, half out of the end, and its way shoves the small tube out, clack, then the middle one, slower, clack, across open water, the nose sinking into a crutch on the far pier; it comes unstuck and rolls out onto the deck; the glass stays drawn |
| barrel | into the mouth of a cask lying balanced on the deck's corner; its weight tips the cask off the end, head first, turning as it falls; it lands on the pier a floor down the other way round, slaps level and rocks; the ball trundles out of the same mouth, which now faces on |
| springboard | out along a diving board that bends under it; at the tip it dips and springs and the ball dives in a high arc into the sea; a string of bubbles runs to the far pier's slip; up the slip out of the water with a second splash, slowing, and over onto the deck |
| rod | off the deck's end into the sea by the float of a rod in its holder; the float ducks, the rod bends double and whips up, and the line hauls the ball out in an arc onto the deck a cell on or a floor up; the line swings from the tip after |
| sandcastle | onto an island of sand standing out of the sea, into a sandcastle: the towers slump, lumps hop off the tops, the flag keels over, and the ball ploughs through the heap slowed by the sand |
| chest | onto the gold in a treasure chest let into the deck, brim-full, its lid thrown back; it beds down between two heaps; the lid slams over it; gold light out of the seam and the keyhole; the lid flies back, coins jump, and the ball rolls off gilded, the palette's yellowest colour |
| paddlewheel | off the deck's end onto a paddle of a steamer's side wheel turning in the water; up the near side and over the top onto the deck a floor up; the funnel puffs behind |
| creel | into the funnel mouth of a lobster pot at the rail's end, and seen through its ribs from there on; the knock hops it off its hook and a lead weight on the rope's other end goes down into the sea and hauls it up a floor; the davit swings it inboard and sets it down; the ball shoulders the far mouth's flap aside and rolls out |
| oar | off the deck's end onto the blade of an oar across a rowlock; the blade dips, the handle lifts a full bucket's bail off its hook, the bucket drops into the sea and the blade whips the ball up onto the deck a floor above |
| funnels | off the deck's end onto the after funnel of a steam launch moored low between the piers, like a cork; she toots, and the puff pops it on to the forward funnel, which toots it up onto the far deck; she ducks and bobs under each |
| sail | off the pier's end onto a square sail rolled up on its batten under the yard of a little ship two floors down; the roll sags, the gasket slips and the sail lets fall, unrolling down the mast with the ball riding the roll; a snap at the end of the cloth, a ripple up the sail, and a hop off the batten's end onto the stage at the water's edge, short or long |

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
| gate | into a picket gate hung shut by a flowerpot on a cord; the knock hops the latch and the gate gives; the ball shoulders through, hauling the pot up; the pot hauls the gate shut and its edge catches the ball on the back; it shoots off, and the latch drops in |
| snail | up the curl of the tail and over the shell, just making the top; carried most of a cell in three slow pulls, leaving a glossy trail; the snail looks up at it, bows, and the heave throws it off over the ducked head |
| frog | onto a flat stone under a frog on a lily pad; it leans out, its throat swells, the tongue comes down the whole drop, sticks and snaps back with the ball; cheeks full; ptui, out along the rail one or two floors up |
| toadstools | off the path's end onto three toadstools, each taller than the last; every cap squashes, springs and puffs spores; pum, pum, pum, onto the rail a floor up |
| appletree | the ball bonks the trunk and stops dead; the crown shudders, a leaf or two falls; the ripe apple on the far bough drops, bounces once and rolls on with the thread; the ball stays at the tree's foot |
| spade | onto the blade of a spade across a log; the grip kicks the twig out from under a flowerpot; the pot comes down on the handle; up off the blade and over the log, one or two floors, always on |
| well | over the coping into the bucket; the pawl slips, the crank whirls; down the shaft two or three floors; the bucket topples on a stone and the ball rolls out through an arch |
| bamboo | onto the scoop of a shishi-odoshi; its weight brings the mouth down onto the terrace's coping; off the tip and down a floor, heading back; the tail cracks on its stone |
| cocoon | into one mouth of a silk tunnel slung between two twigs; it rocks and flushes with colour, the seam splits, three butterflies come out; the ball rolls out the far mouth their colour |
| bumblebee | onto a daisy's face; a bumblebee comes over from its flower, takes hold, heaves twice, and labours up and across the bed with it to a shelf a floor up; sets it down rolling and goes home |
| croquet | onto the mark, nose against a flap; the hook lets go and a hung mallet tocks it through two hoops; it clips the striped peg |
| scarecrow | loose on its pole, one straw hand hanging in the way; the ball shoulders it round till the arm points out at us, and the figure is flung round nearly two turns; the crow on its other arm goes up and flies off |
| dandelion | into the cup of a seed the size of a parasol; the tether slips its peg; up on the air, swinging, one or two floors, small seeds drifting after; the stalk snags in a twig's fork and the cup tips the ball out |
| maple | out onto a big leaf held level on a sapling's twig; the stalk snaps; leaf and ball swoop down side to side, one or two floors; the ball rolls off the way the last swoop went |
| fern | onto the coil of a fiddlehead at the path's end; the frond unfurls and grows under it, pinnae opening as the curl leaves them; the hook at the tip bows a floor up and the ball rolls off it onto a shelf |
| pinwheel | into the tip of a pinwheel's vane; the knock spins the wheel and the next vane round scoops the ball up the far side and flips it onto a shelf a floor up; the wheel spins down |
| windchime | bats the sail of a wind chime up ahead of it and goes under; the sail comes down on its crown and is shoved into the first of three wooden tubes hung from a bough; the clack runs down the row and the chime rings; out a touch slower |
| hammock | off the path's end into a hammock slung across the gap; it sags deep, springs, and tosses the ball in an arc onto the far path; then flaps itself still |
| turf | onto the laid end of a roll of turf on a bed of bare soil, and thump into the roll; it dents, then goes, unrolling ahead of the ball and laying lawn level with the path; heavy and slow at first, quicker as the roll lightens; the last curl is pressed flat under it |
| footbridge | up the hump of an arched footbridge over a brook, slowing to the top, gathering pace down the far side; the board gives a little |
| pumpkin | off the path's end onto the dome of a fat lobed pumpkin in the cell below, beside its stem; it is hard and heavy and does not give: it rocks over toward that shoulder and back; down the flank straight onto the path a floor down, on or back |
| fountain | over the rim of the cup on a fountain's pedestal and down into it like a cork; the welling stops, the cup shudders and spits at both sides, and the jet comes on under the ball; up a floor on a wobbling column of water, a stream falling back into the basin either side; a bob at the top, the jet leans and it slides off the crown onto a shelf; the jet falls back to a welling |
| pond | off a stone wall across a raised lily pool on three pads; each ducks and tips under the ball and bobs up behind it, a ripple running out along the water's line as far as the walls; a hop over the open water between them, and up onto the far wall |
| slide | onto the deck at the top of a playground slide's ladder, slowing to a crawl; a creep over the brink; down the lip and the chute gathering pace, round the foot and out along the flat a floor down |
| swing | onto the seat of a swing hooked back at the path's end; the hook slips and it swings across a two-cell gap to a stop on the far post; the seat tips over the stop and pitches the ball onto the far path |

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

**The arcade keeps score, and pays out once.** Every beat declares its
`points` and pops exactly that number, at the hit if it has a `scores` pass
of its own and off the ball at the moment it fires if it has not. A score
pops over its machine or beside it, never across it: the machine is what
there is to see, and a number lying on it hides the thing it is for. A touch in
passing is tens (a spinner's turn +10, a zigzag pad +10, a bumper +50, a
skee ring +50, a token +50; the moles go +10, +20, +30), a game played is
+100 (a line cleared, a goal, a rally won, a skill shot), a ride or a prize
is +200, and the big ones are a basket +300, a strike +300, the pachinko
pocket +500, the striker's bell +500, the stacker's prize lamp +500 and the
sevens +777. Nothing pays out along the way. The
ticket machine is the map's `finale`: the planner never draws it from the
pool, places it after the last beat and before the door (stepping the walk
back a beat or two if it does not fit where the walk ended), and tells it
what the map `earned`. Its display comes on showing that total and counts
it down a hundred at a time, a ticket out of the slot for each: a hundred
points to a ticket, rounded, never fewer than one. Alone under the glass
there is no run behind it, so it makes up a total a run might have earned.

| Piece | What happens |
| --- | --- |
| rail | a lit lane: a lamp, a strip or chevrons that come on as the ball passes |
| bumper | the ball's front clips the skirt's rim; the cap slams that instant, the lamp lights, +50, out faster |
| spinner | shoves through a hanging plate — its foot rides up over the ball and slips off its back — that spins on the way the ball went, clear of its beam, counting its turns in lamps up the post; the score pops as the plate is flung and ticks up with the turns |
| changer | into the coin slot in the cabinet's side; chunk; a token comes out under the return flap on the far side and takes the thread |
| ticket | the map's last beat, never drawn from the pool: off the rail's end into the hopper; the display counts the run's points down a hundred at a time and a ticket feeds out below for each, a strip that reaches the floor; drops out of the prize chute beside the cabinet, one or two floors down |
| zigzag | down lit tubes, bouncing off a pad onto the next; one or two floors; +10 a pad |
| pachinko | off a lip and bouncing pin to pin through five rows, each lighting as it is struck; the jackpot pocket, whose side drops to let the ball out through a gate in the board; two floors down |
| skee | a kicker flicks it, up the alley, up the lip and off it the way it was going; a lob over the top of its arc and down into the fifty ring a floor up; the rings light as it lands |
| hockey | onto the air table; a mallet winds up behind and slaps the ball on the back the length of the table into the goal; the board lights to 1 |
| claw | into the cabinet, among the prizes on its floor; the claw comes down, closes, lifts, trundles to the chute, lets go; a fall onto the wedge at the chute's foot and down its face |
| striker | onto the puck, which sinks under the ball; the latch trips; up the tower on the puck, slowing but with pace still on it when it meets the bell, lighting every level on the dark face; ding; the puck cants and the ball rolls off, one or two floors up |
| slingshot | into the pouch of a slingshot at the rail's end; its weight slips the catch and the bands whip it up their own line through the fork; a lob a floor up onto a shelf, landing on the way down; the score pops off the fork's mouth as the ball leaves it |
| shooter | onto the cup on a plunger's tip; the knob draws down, the spring closing coil on coil; release; up a wire lane, slowing, round the arch and out through a one-way gate that clicks shut; the outer wire lights behind it; one or two floors up |
| gauss | pulled into a magnet block faster and faster; clack; the far ball of the two on its other face fires off with the thread, through a speed trap that reads what it clocked; the one that came stays on the magnet |
| pong | a Pong court one or two floors tall: straight lines, one pace, no gravity; the paddles rally the ball up the screen, a blip a hit; the last serves it flat along the top, the other misses, the point goes up, and it leaves by the doorway there |
| pixel | behind a screen on a stand, and seen on it in squares: a sprite on the screen's grid at the screen's pace; a scanline comes down it and leaves it another colour while the cursor hops along the palette; out the far side that colour for good |
| blocks | into a falling-blocks well onto a row with one gap, up against the far wall; the piece at the top comes down in ticks and its stem fills the gap; the line flashes and clears, and the ball falls a floor and rolls out, on or back; +100 |
| phaser | a curtain of scanlines turns the ball to a ghost; it rolls straight through a wall of bricks, which go to wireframe where it is; a second curtain makes it solid again |
| ufo | onto the landing mark; the hatch opens, the beam comes down, and the ball goes up it, one or two floors; the saucer slides out over the rail with it, the beam goes out, and it rolls off |
| slots | onto the tray on the end of a one-armed bandit's lever; its weight pulls the lever down through a quarter turn, reels spinning and stopping as it comes; seven seven seven on the clunk, and the tray's wall lies along the rail below; coins in the payout tray; +777 |
| whack | across a whack-a-mole deck; moles pop up behind it and a mallet on a gantry comes after them, a beat late; the third pops up under the ball and tosses it over the rim; +10, +20, +30, and the counter keeps the tally |
| hoops | into the cup of a sprung arm; the catch slips and the arm throws it, a high lob down through the rim; the net bulges round it; onto the return ramp and out under the backboard; the board lights to 300 |
| ferris | onto the seat of the low gondola of a little Ferris wheel; half a turn, slowly, every gondola swinging on its pivot; the high seat is level with the rail a floor up and the ball rolls off it |
| coaster | drops into a car at the station; the chain clacks it up the lift hill, the track lighting behind it; over the crest and down the drop to the floor below; the fins stop the car in sparks and the ball rolls on out of its nose |
| pusher | onto the shelf of a coin pusher, up behind three coins at the lip; the block comes down behind it and shoves; the coins tip off into the tray a floor down and the ball goes over after them, out of the payout mouth; +100 |
| pins | down a polished alley, faster, into ten pins in four ranks; they go up and over, each on its own spin, into the pit behind the deck; the strike lamp flares; out the back slowed by the hit; +300 |
| popcorn | up the chute into the kettle in a popcorn cart's case, out of sight; the element lights, the kettle shakes, kernels burst; up out of the open top in a spray of popcorn onto the shelf a floor up; +100 |
| dunk | out along the seat over a dunk tank and into the target paddle at its far end; the paddle teeters over its pivot and falls away, and its tooth slips out from under the seat; the seat drops and it goes into the water, a splash, gone; out of the drain flap onto the rail a floor down, a few drops with it; +200 |
| stacker | onto the platform at a light tower's foot; the rows light from the bottom, tick, tick, the platform rising a row a tick with the ball on it; the prize lamp flares and the platform tilts it onto the rail one or two floors up, on or back; +500 |
| foosball | in through one goal mouth onto a foosball pitch, its near wall in front of the ball; the first rod's man winds back, whips through and kicks it in the back, and spins on right round; the second swings late and kicks the air; out through the far goal mouth; the goal lamp lights; +100 |
| booth | into a photo booth behind a short curtain, seen from the middle down under its hem; a pose; the flash, the whole curtain white for an instant; it bolts out the far side, and the strip drops out of the slot: three frames with its portrait in each; +100 |
| maze | off the rail's end into a tilting labyrinth two floors tall; along a ledge, through the gap, down onto the next as the board tilts the other way, every ledge lighting as it is ridden; level at the floor and out of the gate, on or back; +200 |
| freefall | into the car at the top of a drop tower; hoisted a little higher with a clank, held, let go; two floors of free fall past the lamps flaring, into the brakes with a bounce; the far door drops and it rolls out; +200 |
| helter | along a gangway to the shoulder of a helter-skelter, slowing to the brink; round the tower's front in the chute, gathering pace, out of sight round the back, round the front again lower and faster, and out along the mat at the foot, which takes the way off it; the lamp on the roof lights; +200 |
| bumpercar | into the seat of a bumper car under a lit grid, sparks at the shoe; across the floor into the parked car, nose to nose, which is shoved back into the rubber kerb and rocks off it; the jolt pitches the ball over both of them onto the rail beyond; +100 |

No piece draws the ball. Each declares a lane — runs, pauses, speed ramps,
parabolic flights, hidden stretches, portal transits — and what it does to
the ball, and the show draws the ball once on the joined path from one
clock. Every hand-off is at rail pace, every arrival slows to its stop, and
every launch ramps back down before the cell edge. `check:rube` builds
worlds headless and asserts all of it: the four worlds in order, three
times round, at least thirty-four beats of its own in every world, every
piece from its own world's pool, every palette and
taste the world's own and never the same twice running, only the arcade
painted dark, at least three beats in four of every map a piece it has
not used yet and none in a map four times, every lane joined
up inside its piece, continuity at every hand-off, one portal at each end
and none between, the ball's state carried piece to piece, every
recolouring a change of colour, every ghost solid again before it leaves
its piece, the tempo, and the arcade's economy: every beat scores, and
tickets come once, last thing before the door, a ticket a hundred of what
the map earned.

## Shows: `apps/rube/src/shows/`

Machine set to music. A show is one piece of music and a machine
choreographed to it: the ball strikes on the notes, the soundtrack plays
with it, and the whole thing runs from a first frame to a last one instead
of round a loop. The tab sits with the Builder, behind the same five
backticks.

```bash
npm run dev          # http://localhost:8791/shows/
npm run check:shows  # the registry and every version file, the clock, the time maps, the placeholder takes
```

### Versions

The same music may have several versions side by side — takes — so that
two runs at it can be kept, compared and later combined. The panel leads
with the picker: the show, and under it a chip a take. A link names one:
`/shows/?show=premiere-arabesque&take=take-a`. `/shows/` with no work
opens Clair de Lune, Take A.

A version is one file, `versions/<work>/<take>.show.ts`, and dropping it in
is the whole of adding it: the page finds it by glob, its path says which
work it is a take of, and the file says the rest — a title, a label, a note,
and a `load()` that reaches for the score, the machine and the recording
only when the version is picked.
[`versions/README.md`](apps/rube/src/shows/versions/README.md) has the
file's shape and what the player promises it. What ships today is
**Première Arabesque**, Take A: Patrizia Prati's recording, the machine
walking Regular, Forest, Aqua, Arcade, wrapping the timed take in
`apps/rube/src/timed/premiere-arabesque/` without rewriting it. **Metronome**
stays beside it as a placeholder in two takes with a soundtrack made in the
page: *free time*, a struck bar wherever a piece fires, and *strict time*,
the same machine under a time map that brings each strike onto a steady beat.
The note is on the strike, so lock is something you can see and hear.

Première also has [Take B](https://contraptions-wustep.vercel.app/shows/?show=premiere-arabesque&take=take-b),
and [Clair de Lune, Take A](https://contraptions-wustep.vercel.app/shows/?show=clair-de-lune&take=take-a) uses
Laurens Goedhart's complete recording. Both new takes sequence unmodified
stock durations through four long maps, Regular → Forest → Aqua → Arcade.
They add no authored pauses or stretched mechanism clocks. Clair de Lune,
Take A, is the default. The [phrase plan](docs/promo/STOCK_SHOWS_PLAN.md) and
arrangement reports document the recording cues and repeated travel pieces.

[Clair de Lune, Take B](https://contraptions-wustep.vercel.app/shows/?show=clair-de-lune&take=take-b)
is the same recording arranged across the grown catalogs — every one of the
thirty-five pieces in each world once, and a repeat only where the music runs
longer than the catalog does — with the whale over open water and the
arcade's points popping over its machines (a stock score may name the worlds
whose pops are drawn; the older takes name none). Its plan is
`scripts/show-plans/clair-b.json`; `generate:clair:b` compiles it and
`check:clair` checks both Clair takes.

Press <kbd>O</kbd> or click **Overview** in Transport to fit the whole current
world while the music keeps playing. Toggle it off to return to the follow
camera. PNG and video exports use the selected view and keep credits in the
panel. Regenerate the new scores with `npm run generate:premiere:b` and
`npm run generate:clair`; `check:premiere` checks both Première takes, and
`check:clair` checks Clair.

[Schubert's Impromptu No. 2, Take A](https://contraptions-wustep.vercel.app/shows/?show=schubert-impromptu&take=take-a)
uses Chiara Bertoglio's CC BY 3.0 recording of D. 899 No. 2. Four stock
maps follow its running scales and accented middle, then return to the
scales before the closing drive. The [phrase plan and checkpoint notes](docs/promo/SCHUBERT_TAKE_A_PLAN.md)
describe the arrangement. Run `generate:schubert` to regenerate it and
`check:schubert` to verify stock timing, continuity and camera framing.


### The music is the clock

While the recording plays, show time is where the recording is
(`clock.ts`, `soundtrack.ts`). The picture follows the music and never the
other way about, so the two cannot drift: a recording that stalls holds the
picture with it. **1× and 2×** are the transport's two stops; at 2× the
recording is time-stretched, not pitched up, and the picture is wherever it
has got to. The music is on unless it is turned off (<kbd>M</kbd>), and a
muted show keeps exactly the same time.

A show opens playing, music and all, where the browser allows it, which is
mostly when you arrive from another tab of the site. Where the browser
wants a press first, the show waits at the top with a play button on the
stage and starts with its music on that press. It never runs on silently
towards a sound that comes in late.

<kbd>space</kbd> plays and pauses, <kbd>←</kbd> <kbd>→</kbd> step a frame
(a second with <kbd>⇧</kbd>), <kbd>Home</kbd> goes to the top, <kbd>1</kbd>
and <kbd>2</kbd> set the speed, <kbd>[</kbd> <kbd>]</kbd> change take.

### Fitting a machine to music

A mechanism has a clock of its own, and the music has another. The player
asks a version for `show.at(t)` with `t` in seconds of music and for
nothing else, so whatever retiming a version needs lives inside its
`Show`: a pause before a strike, a bar hurried, a map for the whole show or
one a piece. `timemap.ts` is the vocabulary: `timeMap(knots)` is a monotone
cubic through pairs of (music, machine) seconds that never runs backwards
and never changes pace abruptly at a knot, and `knotProblems` says when a
map asks a mechanism to run slower than ¾ or faster than about 1⅓ of its
own rate, past which it stops looking like itself. There is no editor.

### Export: picture and music, and nothing else

**Save video** records the whole show, and **Save PNG** the frame, at 720p
or 1080p, 16:9. Neither has a word on it: no title, no credit, no clock, no
seed, no watermark, none of the panel. That is not a mode of the exporter.
A show's canvas is the picture and nothing else, live as well as saved;
every word on the page is in the panel or stands on the stage as DOM, and a
show's canvas cannot set type at all (`stage.ts`), so a version that tried
to letter its frame would find nothing there.

A video is a performance (`record.ts`): the soundtrack plays through once
into the file, and every frame painted is the frame for where the music is
at that instant. A frame that comes late is dropped, never pushed onto the
ones after it, so the picture is locked to the music from the first bar to
the last. It takes as long as the show does at the speed it is recorded at,
and wants its tab in front. The file is WebM (VP9 and Opus), or MP4 where
that is what the browser records. As with Machine's loops, the browser's
recorder writes no duration into a WebM's header; `ffmpeg -i show.webm -c
copy fixed.webm` puts one in, and `ffmpeg -i show.webm show.mp4` makes the
MP4 a post wants.

## Builder: `apps/rube/src/builder/`

The last tab, once Shows and the Builder are unlocked. Type what a piece should be, press
**Make piece**, and it is on the stage between two portals, the way the
catalog shows a stock piece. Press
**Make world** with a place in the prompt and the build gets palettes, a
backdrop, a rail and a borrowed cast to play among. **Export** writes the
whole build to one JSON file. **Import** reads one back.

```bash
npm run dev            # http://localhost:8791/, then ` five times, then the Shows or Builder tab
npm run check:builder  # scaffolds and their looks, the file round trip, refusals, mending, the store, the lock, the model picker, and that the stock show is untouched
```

### Unlocking Shows and the Builder

Shows and the Builder start hidden: they are not the front of the house.
In any mode, press <kbd>`</kbd> five times in a row, each press within
half a second of the last. The panel comes out with all four modes on the
switch as icon-only buttons — Machine, Explorations, Shows, Builder.
Wait longer than half a second between two presses and the count starts
over, so the single <kbd>`</kbd>
that clears the stage still works as before. Only the first press of a
quick run clears the stage; the rest are counted and not shown, so the
chrome does not flicker on the way to five. A held key counts as one
press. Locked, the switch is two words again: Machine and Explorations.

The unlock is kept in this browser (`contraptions:unlocked` in
localStorage). A browser that already had `contraptions:builder` set still
counts as unlocked. The same five presses lock both tabs again, from any
mode. While they are locked there are no tabs for them, Machine shows no
link to the Builder, and `/shows/` and `/builder/` send the visitor to
Machine with their seed. Each page's code is a separate chunk that a
locked visit never fetches.

### Using it

1. **Prompt.** "a gong that rings when the ball brushes it". <kbd>⌘↵</kbd>
   or **Make piece**. The new piece is selected and playing.
2. **Look at it.** **Piece** is the piece alone, **Sheet** is every piece
   in the build as the catalog draws them, **World** is a whole map as the
   show runs it. <kbd>space</kbd> pauses, <kbd>R</kbd> rerolls the seed,
   <kbd>[</kbd> and <kbd>]</kbd> step through the pieces.
3. **Change it.** The **Piece** section holds the piece as JSON. Edit,
   **Apply**, and the stage updates. What you type is validated the same way
   a file is, and a list of what is wrong appears under the pane if it does
   not pass; the text stays in the pane to be fixed until you apply it or
   **Revert**. **Make again** makes another version from the same prompt,
   by the model when one is chosen. While a model writes, the button that
   asked for it reads **Stop**.
4. **Take it back.** **Undo** in the **Build** title, or <kbd>⌘Z</kbd>
   outside a text field, takes back the last change to a build: a piece
   made, removed, remade or edited, a world, a rename, a new build, an
   import, a delete.
5. **Give it a place.** "a volcano island", **Make world**. The **World**
   section then picks the rail (one of the four stock worlds'), the
   backdrops, and the cast. **Recast** draws another six stock pieces,
   **No cast** plays the build's pieces alone.
6. **Export, import.** **Export** saves `<name>.contraptions.json`.
   **Import**, or a file dropped on the stage, reads one. A different build
   of the same name already in the browser is never replaced: the import
   comes in as `<name>-2` and both are kept. **Copy** puts the build on the
   clipboard, and the piece section's **Copy** a single piece; <kbd>⌘V</kbd>
   outside a text field pastes either back, a piece into the build on the
   bench.
7. **Play it in Machine.** The link at the foot of **File** opens
   `/?world=<name>`. Machine's panel lists every build under **Builds**, and
   its catalog gives each build a band after the four worlds.

### Where a piece comes from

Two generators write the same JSON.

**Offline.** No key, no network. `scaffold.ts` reads the prompt for one of
eleven mechanisms and names the piece for the prompt's noun. Each has two
looks (the ring has three), and a word in the prompt can pick one:

| asks for | words like | what it builds | looks |
| --- | --- | --- | --- |
| strike | mallet, hammer, kick, boot | a head on a mast comes round onto the ball's shoulder; the ball leaves fast | mallet, boot |
| ring | gong, bell, lantern, chime | a body hung from a gallows with a feeler in the ball's way; it rocks and rings | disc, lantern, bell |
| bounce | mushroom, drum, spring, trampoline | a pit with something springy in it; a flight | pad on a spring, cap |
| lift | lift, geyser, elevator, piston | a platform between two guides; up a floor | spring, cage on a cable |
| drop | slide, chute, stairs, hill | down a floor | a slide, three steps it hops down |
| paint | bucket, paint, spray, honey | something over the stopped ball; the ball changes colour for good | bucket that tips, spray can |
| spin | windmill, pinwheel, fan, wheel | a wheel with a vane in the ball's way; shouldered aside, it goes round once | four sails, three blades |
| launch | catapult, fling, seesaw, plank | a lever on a fulcrum throws the ball across a cell with no rail; a flight | spoon, plank with a dropped weight |
| carry | cart, ferry, boat, train | the ball rolls aboard and is carried across two cells | cart on a track, boat between piers |
| hide | tunnel, box, cave, factory | the rail runs through it; the ball is gone for a beat and comes out fast | hill with a mouth, a house with a door |
| turn back | bend, hairpin, pipe, reverse | round a bend and down a floor, heading back the way it came | an outer wall, a pipe |

The same prompt and the same try always scaffold the same piece. **Make
again** is the next try: another look where the prompt does not name one,
another set of numbers where it does. When a prompt pins everything down,
the Builder says so rather than making the same piece twice. A prompt that
names no mechanism gets one picked by its seed. While the prompt is empty,
a row of example prompts shows under it. Worlds work the same way: ten named
places (volcano, ocean, forest, desert, snow, candy, night, harvest,
circus, kitchen) each have a hand-made palette, and any other prompt gets a
palette generated from its seed.

**A model.** Optional. The **Generator** section under the prompt picks
who writes the JSON: **Offline**, **Claude**, or **AI Gateway**.

- **Claude** takes an Anthropic API key and calls api.anthropic.com through
  `@anthropic-ai/sdk`. The picker lists the Anthropic API's model ids:
  `claude-opus-5` (the default), `claude-sonnet-5`, `claude-haiku-4-5` and
  `claude-fable-5-1`.
- **AI Gateway** takes a Vercel AI Gateway key and calls
  ai-gateway.vercel.sh. The picker lists gateway ids, `provider/model`, from
  an allowlist in `providers.ts`: the same four Claude models plus one or
  two each from OpenAI, Google, Moonshot and DeepSeek. When you choose the
  gateway, the Builder reads its public `/v1/models` and drops any id the
  gateway no longer serves.

Each provider keeps its own key and its own choice of model. Switching
provider swaps the list and restores the model you last chose for that
provider, or its default. A model id never carries over from one provider to
the other.

Everything is client-side. The site has no server, no `/api` route and no
key in its bundle. A key you paste is stored in your browser's localStorage
(`contraptions:key:claude`, `contraptions:key:gateway`) and sent only to the
provider it belongs to. The Anthropic SDK is its own chunk and loads the
first time a Claude key is used.

The model gets the format and the craft rules as its system prompt. Its
reply is validated like any file. If it fails, the errors go back for a
repair, twice at most. A missing or malformed name is not worth a round
trip and is made from the prompt instead. If the repairs fail too, or the
key or the network does, the Builder falls back to the offline generator
and says why. With a provider chosen but no key saved, it scaffolds offline
and says so. **Stop** cancels the request, and nothing is scaffolded in its
place. A key that does not look like its provider's (a Claude key
that does not start `sk-ant-`, an Anthropic key given to the gateway) is
saved with a warning.

One thing the gateway does that you will notice: it answers a browser's
preflight, but its refusals (a bad key, no credit, a model the key may not
use) come back without a CORS header, so the browser hides them. The Builder
then checks that the gateway is reachable and reports "refused, check the
key, its credit and the model" instead of the real reason.

### The format

One JSON file, `contraptions-build` version 1. `spec.ts` defines it and
`parseBuild` validates it.

```jsonc
{
  "format": "contraptions-build",
  "version": 1,
  "name": "caldera",                  // a slug: the world's name, and the file's
  "pieces": [{
    "name": "gong",                   // unique in the build, and not a stock piece's
    "weight": 0.8,                    // how often the planner picks it
    "cells": [[0, 0], [0, -1]],       // footprint, relative to the entry cell
    "exit": { "at": [1, 0], "dir": 1 },
    "lane": [                         // the ball's path, from [-0.5, 0]
      { "op": "roll", "to": [0, 0], "fire": true },
      { "op": "roll", "to": [0.5, 0] }
    ],
    "shapes": [                       // the drawing, in order
      { "kind": "rail", "x0": -0.5, "x1": 0.5 },
      { "kind": "group", "at": [0, -1.5],
        "motion": [{ "drive": "swing", "from": 0, "rotate": 0.13, "freq": 7, "decay": 1.1 }],
        "shapes": [{ "kind": "ellipse", "offset": [0, 0.95], "w": 0.62, "h": 0.62 }] }
    ]
  }],
  "world": {                          // optional
    "themes": [{ "name": "caldera", "label": "Caldera", "bg": "#F3E6D8", "ink": "#2A1B17", "colors": ["#E4572E", "…four more"] }],
    "backdrops": ["plain", "dots"],
    "rail": "workshop",               // whose rail runs between the beats
    "borrow": ["plunger", "trapeze"]  // stock pieces that play beside the build's own
  }
}
```

A piece in a file is data. A stock piece is a TypeScript module with a
`place` and a `draw`. A built piece describes the same two things and
`compile.ts` turns the description into a `Piece`, so the planner, the
stage, the catalog and the checks treat both alike. Nothing in a file is
evaluated.

- **Lane steps** are `roll`, `ramp`, `arrive`, `wait`, `fall`, `fly` and
  `move`. They map onto the helpers in `parts.ts`. One step may carry
  `"fire": true`, and the piece fires when that step ends.
- **Shapes** are `rail`, `post`, `gallows`, `line`, `poly`, `rect`,
  `ellipse`, `arc`, `coil`, `burst`, `puff` and `group`. A shape has an
  origin, a fill and a stroke, and may name the `over` layer to stand in
  front of the ball.
- **Motions** turn a clock into an amount, and the amount scales a
  rotation, a move and a stretch about the shape's origin. The drives are
  `ease`, `pulse`, `flick`, `swing`, `turn` and `follow`. The clock is
  `since` (seconds since the fire) or `t` (seconds since the ball entered).
  `follow` moves a part exactly as the ball moves over a run of lane steps,
  which is how a platform carries the ball without the two drifting apart.
- **Fills** are `color`, `accent`, `paint`, `paper`, `ink` and `none`.
  The planner hands a piece `color`, and `compile.ts` picks `accent`.
  Neither is ever the colour the ball arrives in. That is the house rule
  for stock pieces too, and `check:builder` asserts it over built maps.

`parseBuild` refuses a file with a reason per fault: a lane that does not
end on the edge of its exit cell, a step that leaves the piece's cells, a
flight that peaks outside them, a footprint without `[0, 0]` or taller than
five rows, an exit inside the footprint, an unknown shape or drive, a
number out of range, ink that does not read on its paper. It checks what
it is handed as the JSON a file would hold, so a list with holes in it or a
`NaN` is refused like any other fault and never throws. `compileBuild` adds
the faults that need the stock worlds to see: a piece or a build named for
a stock one, and a cast member that does not exist.

### Where builds live

The registry in `registry.ts` has three sources. All of them load at
startup with no rebuild step of their own.

- **The browser.** Everything the Builder makes or imports is saved to
  localStorage under `contraptions:builds` as it changes. A save leaves
  every other entry as it was written, even one this version cannot read.
  When the browser will not keep a build (storage full or turned off), the
  **File** section says so: export it to keep it.
- **The builds folder.** `apps/rube/builds/*.contraptions.json`. Vite globs
  it (`discover.ts`), so a file dropped there is part of the site the next
  time it is served or built, in Machine and in the Builder. It ships
  empty. The front door stays the four stock worlds until someone adds a
  file.
- **The Builder's samples.** `samples/caldera.contraptions.json` is on the
  bench the first time the Builder opens. Machine does not load samples.
  Editing one, or following **Play it in Machine**, saves a copy to the
  browser, and then Machine has it.

A browser build replaces a shipped build of the same name. A build that
fails validation is skipped with a console warning and the app carries on.
The stock pieces change between versions of the site, so a kept or
imported build is mended to fit them as it loads (`mendBuild`): a borrowed
piece that has gone leaves the cast, and a piece whose name a stock piece
has since taken is numbered. The console, or the import's message, says
what was changed.

Builds stand beside the loop and never in it. The loop is the four stock
worlds in a fixed order, so a seed is the same show for everyone whatever
is in their browser. `check:builder` asserts that the same seed lays out
the same four stock maps before and after builds are installed. The show
visits a build when it is pinned there (`?world=<name>`, or its chip under
**Builds**), or for a solo of one of its pieces.

### Limits

- The drawing vocabulary is the twelve shape kinds and six drives above. A
  piece that needs a loop, a particle system, a variant per placement or a
  second ball (a relay, as the cradle does it) is still a TypeScript piece.
  A built piece has one footprint and one lane, and the only thing it can
  do to the ball is repaint it.
- The eleven offline mechanisms are starting points. They play as they are
  and their geometry is exact (the mallet's face meets the ball where the
  lane puts it), but the prompt only picks the mechanism, the name and
  sometimes the look.
- A build holds 24 pieces, a piece 12 cells in at most five rows, 40 lane
  steps, 80 shapes and 7 seconds of lane. A file is at most 512 KB.
- Undo lasts as long as the page, fifty changes deep.
- Builds are per browser. There is no account and no sync. The file is how
  a build moves.
- A model needs the person's own key, and a key in a browser is only as
  safe as the browser. Use a key you can revoke, with a spending limit.
- The lock keeps Shows and the Builder out of sight. It is not access control: the
  pages and their code are public, and anyone who knows the five presses has them.

## License

Reference sketch by Okazz, CC BY-NC-SA. This implementation is a rewrite, not a
port of his file.
