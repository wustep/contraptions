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
    goldberg/       connected circuits and legacy catalog demonstrations
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
next to everything else. In Classic, **Solo** fills the grid with one machine.

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

Classic, Ports and Tracks keep their original composers. Cascade, Workshop,
Circus and Rube Goldberg now share a **single closed journey**: four to eight
working stops, one permanent traveler, and an exposed return elevator. Each
mode's older gadget collection remains available as a labelled Catalog sheet.

| Mode | Live composition | Density |
| --- | --- | --- |
| Classic | independent machines, abstract wires | 6–24 cells across |
| Ports | tokens handed across typed edges | 8–20 cells across |
| Tracks | balls circulating on a carved loop | 8–20 cells across |
| Cascade | sloping rails, gates, dominoes, seesaws and bells | 4–8 stops |
| Workshop | conveyors, press, punch, scale and release gate | 4–8 stops |
| Circus | linked flights, trampoline, hoop, seesaw and bell | 4–8 stops |
| Rube Goldberg | staggered rails and reversals, hammer, gate, seesaw and bell | 4–8 stops |

### Connected machines

The traveler stays on the page for its **entire 12-second circuit**, including
the trip home. It has one seeded color, an inset ring and an off-center pin;
Workshop uses a square part with the same permanent markings. A handoff never
creates another object or chooses a new color. Tools wait for this traveler,
contacting tools give it a short dwell, and the elevator carries it along the
same trajectory used to draw the car. The empty car visibly returns for pickup.

The rails, drops, numbered stops and direction marks make the route readable
at rest. Circus uses dotted flight trajectories between platforms. Rube has
staggered stops and changes direction instead of filling a grid. Machinery is
mostly paper and ink, keeping the traveler's color easy to follow.

`src/worlds/goldberg/connected.ts` owns geometry, identity and timing;
`connected-draw.ts` draws the structure, tools and traveler. All motion is a
pure function of the composition clock, including the return lift. Scrubbing
backward and PNG/WebM export use that same drawing. `scripts/check-connected.ts`
checks endpoint continuity, bounds, identity across laps, tool contact timing,
resize invariance, deterministic rebuilding and complete drawing periodicity.

**Intentional simplification:** live Solo/Tag, Stations/Drumroll, Multi-cell and
Wander controls are retired in these four modes. The remaining **Stops** control
changes the length of the itinerary. Old mode/seed/theme share URLs still open;
`res` now means 4–8 stops, obsolete Solo/Tag filters are cleared, and old
`chains`/`spans` values have no effect on these circuits. Old seeds therefore
produce new artwork. Catalog still contains all the older mechanisms; its
lane demos retain the original per-machine clocks. Classic's filters and the
Ports/Tracks controls are unchanged.

Before/after images are in [docs/connected](docs/connected).

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
| Resolution / Stops | Grid density in Classic, Ports and Tracks; 4–8 working stops in the connected modes |
| Stroke | Multiplier on the computed line weight |
| Multi-cell | How eagerly Classic places machines larger than one cell |
| Wired chains | How much of Classic or Ports is wired into firing sequences |
| Tag / Solo | Narrow Classic’s pool while exploring |
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
