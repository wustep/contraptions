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
grew out of, seven modes of tiny machines on a grid with every dial exposed
(`src/`; the code calls it the sandbox). Both wear the same chrome: one
panel down the right edge at the window's full height, the canvas filling
everything else, and a two-tab switch at the top of the panel —
**Machine | Explorations** — that moves between them and carries the seed
across. <kbd>P</kbd> hides the panel in either.

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

Seven modes, 20 palettes, 4 layouts. Classic keeps the original 36 toys;
Cascade, Workshop, Circus and Rube Goldberg each bring their own catalog and
their own grid.

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
    rube/           the cascade's one-cell beats plus the drops a wandering path needs
  worlds/
    lanes.ts        where tokens travel inside a cell, shared by both worlds
    ports/          framework A: machines with typed edge ports, a chain solver
    tracks/         framework B: a carved loop, balls drawn by the world, reactors
    goldberg/       the cascade, workshop, circus and rube grids; the token is theirs
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
the two worlds. Cascade, Workshop, Circus and Rube Goldberg build **their own
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
| Rube Goldberg | `src/contraptions/rube/` | one wandering path from a feeder to an ending; the rest is paper | 5–14 |

The Mode control lists all seven by name. Catalog view shows the active
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

### Rube Goldberg

The same lane world with a different plan. Where the cascade fills its grid
with a snake, this mode **carves one path**: a ball leaves a feeder somewhere
along the top row, rolls a way, and goes down — by elevator, or by simply
falling down a chute — one, two or three floors at a time, then rolls on, the
same way or back, until it reaches an ending on the bottom row. Every step is
east, west or south and never north, so the walk cannot cross itself. Cells
the path does not visit stay paper, and every machine on the piece is on the
path: the frame is one connected contraption, and the seed decides its shape.

The catalog is the cascade's one-cell beats — its feeders, stations, endings
and two-cell elevator — plus the pieces a wandering path needs and a snake
never does: a `shaft` for the middle floors of a deep elevator, and a
`chute`, `tube` and `catch` for a ball that just falls, the catch being a
quarter-pipe that turns the drop back into a roll. The elevator's car is
still drawn once by the world, for the whole stack, whatever its depth; three
floors is the most a car can descend and climb back empty before the next
ball arrives at the top, so that is the deepest any drop goes.

**Wander** is how far the path strays from a snake: at 0 every run crosses
the frame and every drop is one floor; at 1 runs are short and drops are deep.
**Stations** is the share of the path that is machinery rather than plain
rail. The plan lives in `src/worlds/goldberg/rube.ts`; the lane world it
hands its steps to is the cascade's.

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
| Mode | `classic`, `ports`, `tracks`, `cascade`, `workshop`, `circus`, `rube` |
| Theme | 20 palettes, each a different mood |
| Layout | `grid`, `bricks` (offset courses), `quads` (recursive subdivision), `bands` (columns at mixed scales) — Classic only; the other modes lay out their own grid |
| Resolution | Cells across the art area, within the mode's range (classic 6–24, ports and tracks 8–20, cascade and workshop 5–9, circus 4–7, rube 5–14) |
| Stroke | Multiplier on the computed line weight |
| Multi-cell / Wander | How eagerly to place machines larger than one cell; in Rube Goldberg, how far the path strays from a snake |
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
chain that never ends. The canvas fills everything the panel leaves;
<kbd>P</kbd> hides the panel and the show has the whole window. The camera
follows the ball; every portal is a door to a whole new map — a new
palette, a new taste in pieces, a new layout — and the cut is an iris: the
camera pushes in as the ball is swallowed, holds shut a beat, and opens
wide on the new world.

**[Watch it →](https://contraptions-wustep.vercel.app/?seed=amber-gasket)**
— `amber-gasket` is the seed to share: a switchback, two flippers, a
zipline and a gravity inverter in the workshop, then a harbor at sundown
with two lighthouses and a crab, then a greenhouse, then neon.

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
| 2 | **Harbor** | a pier over water, tide and salt | buoy, wave, lighthouse, crab, kelp, octopus, anchor, pelican, blowhole, oyster, whirlpool |
| 3 | **Garden** | a greenhouse, soil and bloom | wateringcan, vine, bloom, wheelbarrow, sprinkler, sunflower, pod, burrow, hose, rake, snail |
| 4 | **Arcade** | neon night: lights, scores and payouts | bumper, spinner, changer, ticket, zigzag, pachinko, skee, hockey, claw, striker, slingshot |

Workshop → harbor → garden → arcade → workshop, always. What the seed
decides is everything *inside* a visit: which of the world's palettes it
is painted in (each has two or three of its own, never shared), which of
its tastes the planner leans on, how the map is laid out, and which pieces
it draws — always and only from that world's pool. Two visits to the same
world never look alike back to back. Each world has its own rail (a pier
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
next), restarts, opens the **catalog** (<kbd>C</kbd>) or the **overview**
of the whole map (<kbd>O</kbd>); **Transport** is play/pause
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
world); <kbd>esc</kbd> steps back out, from a solo to the catalog and from
the catalog to the show. The panel's **Catalog** button is the same door,
as is <kbd>c</kbd>.

A world is one map: a self-avoiding walk of eleven to sixteen beats in a
box, from a portal to a portal, with a tempo — a run of two or three beats
back to back, then a flight when one fits, then a breath of rail. The
ball's state rides the chain: its colour and which ball holds the thread,
so a piece can change it and the next piece knows. Every world has pieces
that do (the workshop's painter, cradle and inverter; the harbor's octopus
and oyster; the garden's sunflower and pod; the arcade's changer); they
are capped at two a map and never absent for three maps running. A piece
declares for itself whether it changes the ball (`dynamic`) or throws it
(`flight`), and the planner reads the flags off whatever pool it is
handed.

### The workshop's pieces

**Thirty-four pieces**, curated from the eighty-odd toys in the other
catalogs and rewritten for one ball, each a beat the ball is seen to cause:

| Piece | What happens |
| --- | --- |
| rail | a plain cell, so the beats have room to land: a post, a bracket, a riveted plate |
| hammer | two cells tall: wait on the anvil, the pawl trembles and lets go, a wedge head drops a floor and squeezes the ball out fast |
| seesaw | up, hang over the pivot, down faster, onto the stop |
| bell | the clapper is in the way; it strikes the lip and the bell knocks on its pin; punctuation |
| bellows | tongue → rod → roof lever → hook → weight → bellows → puff → go |
| dominoes | gate → striker → six dominoes, each knocking the next → button → a pulse along the wire → the coil snaps the portcullis up |
| drop | lip, tube, a flap per floor, quarter-pipe; down one to three floors, on or back |
| lift | pawl → counterweight → cage; up one to three floors, on or back |
| cannon | match, a long fuse, bang, the carriage kicks back, flight, landing bumper; over two and up one |
| loop | round a loop-the-loop, slow at the top, no mechanism at all |
| scoop | a bucket wheel, four deep cups on a hub; the ball rides in its seat round the far side and drops out near the bottom; a pawl clicks on the hub's ratchet; down one floor, facing back |
| toaster | in the slot, coils glow brighter and brighter, pop; up one floor |
| crane | magnet down, blink, up, along the beam on turning wheels over a gap in the rail, think, drop; over two |
| rocket | button → sputter → flame → sled to the buffer; the ball flies on; over two |
| pendulum | tongue → cord → hook → a wrecking ball on a real pendulum's clock |
| trapdoor | weight → lever → bolt → the floor gives way; a ramp; down one |
| trampoline | the rail just stops; a pit, springs that stretch, a bounce, the biggest arc in the show |
| funnel | round and down a glass bowl, in view the whole way, through the neck; down one, on or back |
| conveyor | switch → motor → cleats carry the ball up a floor, slowly, on purpose |
| paddle | a wheel kicked round once; a relay |
| balloon | pin → sandbag → the balloon rises the mast, tugging at its ropes; up one or two |
| plunger | pawl → spring → across a cell with no rail in it at all |
| stairs | four steps down, off each lip with a bounce, a tap on each tread |
| switchback | ramps down to bumpers that turn the ball; two ramps for one floor facing back, three for two facing on |
| zipline | a cup on a trolley runs a wire that dips under it, down a floor and over two, to a stop |
| tipper | a counterweighted tray on its heel tips past upright and dumps the ball a floor down; clack |
| drawbridge | plate → pawl → the winch pays out the chain → the bridge falls across the gap |
| gears | plate → pawl → three gears run → a cord hauls the gate up its guide |
| trapeze | a basket on ropes swings the ball across two cells of nothing, to a catch |
| trebuchet | the counterweight drops, the arm comes over, the ball leaves along its tangent two cells |
| screw | an Archimedes' screw in a glass tube carries the ball up a floor |
| flipper | a drooping pinball bat; the ball settles in its lip, the bat whips up and lets go as it passes level; up a floor onto a shelf |
| painter | the ball stops on a plate under two nozzles; they spray while it turns a new colour, for good; the dryer horn blows it on |
| cradle | a Newton's cradle: the ball stops dead and the thread passes to the far ball, which slips its hook mid-swing and flies on |
| inverter | gravity flips between two coils where the floor rail stops; the ball bobs along the ceiling and drops back |
| portal | the door at either end of a map; the far side is always a new map |

### The harbor's pieces

A pier over water. Under every rail there is still water on pilings — still
on purpose, since a piece's clock is its own and a ripple animated from it
would jump phase at every cell edge; what moves is what the ball does to it.

| Piece | What happens |
| --- | --- |
| rail | a pier: a piling, a cleat with a coil of rope, a life ring hung under the deck |
| buoy | the deck stops; a bell buoy rocks under the ball, clangs, and runs it off faster |
| wave | a swell curling over; the ball rides its face two cells over and a floor down, spray behind it |
| lighthouse | in at the door; a lit window climbs the tower; out on the gallery one or two floors up; the beam turns |
| crab | rolls into the claw; lifted, aimed, pitched across a cell of open water |
| kelp | into a glass tank at the bottom; rises through the kelp on its own bubbles; out at the rim |
| octopus | its eyes follow the ball; a jet of ink from the siphon; the ball leaves a new colour |
| anchor | onto the stock; the pawl trips; down one to three floors on the chain to the seabed; wound back up later |
| pelican | off the deck's end into the pouch; flown across two cells; the pouch parts and the ball drops out onto the deck |
| blowhole | into the dip over the hole; a rumble; the spout throws the ball a floor up, past a shelf and down onto it |
| oyster | into the open shell; snap; a beat; a pearl rolls out and takes the thread |
| whirlpool | round and down the vortex to the drain, out a floor down facing back |

### The garden's pieces

| Piece | What happens |
| --- | --- |
| rail | a path edge on stakes, between tufts of grass and a pot with one flower |
| wateringcan | tongue → cord → the can tips → a shower washes the ball on its way faster |
| vine | onto a leaf in a pot; the vine shoots up the trellis with it, leaves unfurling; out one or two floors up |
| bloom | round and down the inside of a trumpet flower, down the hollow stem, out at the root a floor down |
| wheelbarrow | into the tray; the barrow trundles two cells to a chock and tips it out |
| sprinkler | onto the head; the tap opens; spun off across a flowerbed |
| sunflower | over a root; the head nods and dusts the ball with pollen; a new colour |
| pod | into a seed pod; it swells and bursts; a seed shoots out and takes the thread |
| burrow | into a hole; a ridge of earth runs down the soil; up out of the top of a molehill a floor down, over its foot onto the rail; the mole looks out |
| hose | into a coiled hose; a bulge goes round two and a half times; out of the nozzle |
| rake | over the handle and onto the tines; the handle comes up behind, over the top, and cracks the ball on its back; it shoots off and the handle lies ahead |
| snail | up the tail onto the shell; carried most of a cell, slowly, leaving a trail; a shrug tips the shell and the ball rolls off its front, over the head |

### The arcade's pieces

Neon night. The palettes are dark and a colour laid down with a soft halo
reads as a lit tube; the halo is the only translucency in the show, and
scores pop off hits in a three-by-five bitmap font.

| Piece | What happens |
| --- | --- |
| rail | a lit lane: a lamp, a strip or chevrons that come on as the ball passes |
| bumper | the ball's front clips the skirt's rim; the cap slams that instant, the lamp lights, +100, out faster |
| spinner | shoves through a hanging plate — its foot rides up over the ball and slips off its back — that spins on the way the ball went, counting its turns in lamps |
| changer | into the coin slot in the cabinet's side; chunk; a token comes out under the return flap on the far side and takes the thread |
| ticket | into the hopper; tickets feed out below while it whirs; out of the prize chute one or two floors down |
| zigzag | down lit tubes to pads that turn the ball; one or two floors; +10 a pad |
| pachinko | off a lip through five rows of pins, each lighting as it is struck; the jackpot pocket, whose side drops to let the ball out through a gate in the board; two floors down |
| skee | a kicker, up the alley, off the lip, into the fifty ring a floor up |
| hockey | onto the air table; a mallet winds up behind and slaps the ball on the back the length of the table into the goal; the board goes to 1 |
| claw | into the cabinet; the claw comes down, closes, lifts, trundles to the chute, lets go |
| striker | onto the puck, which sinks under the ball; the latch trips; up the tower on the puck to the bell, lighting every level; ding; the puck cants and the ball rolls off, one or two floors up |
| slingshot | into the band; the kicker fires; flung a floor up onto a shelf |

No piece draws the ball. Each declares a lane — runs, pauses, speed ramps,
parabolic flights, hidden stretches, portal transits — and what it does to
the ball, and the show draws the ball once on the joined path from one
clock. Every hand-off is at rail pace, every arrival slows to its stop, and
every launch ramps back down before the cell edge. `check:rube` builds
worlds headless and asserts all of it: the four worlds in order, three
times round, every piece from its own world's pool, every palette and
taste the world's own and never the same twice running, every lane joined
up inside its piece, continuity at every hand-off, one portal at each end
and none between, the ball's state carried piece to piece, and the tempo.

## License

Reference sketch by Okazz, CC BY-NC-SA. This implementation is a rewrite, not a
port of his file.
