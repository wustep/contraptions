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

36 machines, 14 palettes, 4 layouts.

## How it fits together

```
src/
  core/
    types.ts        the Contraption contract
    define.ts       defineContraption()
    composition.ts  seed + options -> a placed, oriented, phase-offset piece
    engine.ts       owns the clock, drives p5
    wiring.ts       builds firing chains between neighbours
    layouts.ts      grid | bricks | quads | bands
    themes.ts       14 palettes
    rng.ts          seeded, forkable randomness
    ease.ts         easing, staging, wrapping
    draw.ts         shared vocabulary (rails, coils, teeth, clipping)
  contraptions/     one file per machine, plus the registry in index.ts
  worlds/
    lanes.ts        where tokens travel inside a cell, shared by both worlds
    ports/          framework A: machines with typed edge ports, a chain solver
    tracks/         framework B: a carved loop, balls drawn by the world, reactors
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

Classic mode is the piece described above: independent machines, some of them
wired into abstract firing chains. Two further modes rebuild the composition
around machines that actually act on each other. Both keep the contract — every
machine is still a pure function of its own `u` — and both live under `src/worlds/`.

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
| Mode | `classic`, `ports` (tokens handed across edges), `tracks` (balls circulating on a loop) |
| Theme | 14 palettes, each a different mood |
| Layout | `grid`, `bricks` (offset courses), `quads` (recursive subdivision), `bands` (columns at mixed scales) |
| Resolution | Cells across the art area |
| Stroke | Multiplier on the computed line weight |
| Multi-cell | How eagerly to place machines larger than one cell |
| Wired chains | How much of the grid to wire into firing sequences |
| Tag / Solo | Narrow the pool while exploring |
| Catalog | One labelled instance of every machine |

Playback speed, the scrub bar, export scale, and the grid overlay are view
settings: they change how the piece is watched, never what it is, so they do
not rebuild the composition and stay out of the URL.

<kbd>space</kbd> reroll · <kbd>⇧space</kbd> roll everything · <kbd>P</kbd> pause ·
<kbd>S</kbd> save png · <kbd>G</kbd> grid overlay · <kbd>H</kbd> hide panel ·
<kbd>←</kbd> <kbd>→</kbd> step a frame · <kbd>⇧←</kbd> <kbd>⇧→</kbd> jump a beat

## License

Reference sketch by Okazz, CC BY-NC-SA. This implementation is a rewrite, not a
port of his file.
