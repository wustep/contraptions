# contraptions

A generator for grids of tiny animated machines — each cell is a small,
self-contained mechanism that loops forever, and the piece is whatever falls out
of scattering a few hundred of them across a grid.

Heavily inspired by [Okazz](https://x.com/okazz_/status/2090999902805393607) —
heavy ink outlines, one flat fill per part, a handful of bright colors on paper.

**[Live →](https://contraptions-wustep.vercel.app)**

```bash
npm install
npm run dev      # http://localhost:8791
npm run check    # headless smoke test of the pure core
```

Press <kbd>space</kbd> to reroll. Every control is mirrored into the URL, so any
frame you like is a shareable link.

Seven modes, 14 palettes, 4 layouts. Classic keeps the original 36 toys;
Cascade, Workshop, Circus and Rube Goldberg each bring their own catalog and
their own grid.

## How it fits together

```
src/
  core/
    types.ts        the Contraption contract
    define.ts       defineContraption()
    composition.ts  seed + options -> a placed, oriented, phase-offset piece
    engine.ts       owns the clock, drives p5
    wiring.ts       builds firing chains between neighbours
    lane.ts         how a token crosses a cell, and how lanes join up
    layouts.ts      grid | bricks | quads | bands
    themes.ts       14 palettes
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
  ui/               the seed explorer
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

The Mode control lists all seven with those notes. Catalog view shows the active
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
| Theme | 14 palettes, each a different mood |
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

Playback speed, the scrub bar, export scale, and the grid overlay are view
settings: they change how the piece is watched, never what it is, so they do
not rebuild the composition and stay out of the URL.

Export writes a PNG at the chosen scale, or a WebM of one loop at the current
canvas size (capped at 12s). The clock is held for the encode the same way it
is for PNG; progress is a view of the clock and never enters the URL.

<kbd>space</kbd> reroll · <kbd>⇧space</kbd> roll everything · <kbd>P</kbd> pause ·
<kbd>S</kbd> save png · <kbd>G</kbd> grid overlay · <kbd>H</kbd> hide panel ·
<kbd>←</kbd> <kbd>→</kbd> step a frame · <kbd>⇧←</kbd> <kbd>⇧→</kbd> jump a beat

## License

Reference sketch by Okazz, CC BY-NC-SA. This implementation is a rewrite, not a
port of his file.
