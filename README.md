# contraptions

A generator for grids of tiny animated machines — each cell is a small,
self-contained mechanism that loops forever, and the piece is whatever falls out
of scattering a few hundred of them across a grid.

Built after [okazz](https://openprocessing.org/@okazz)'s modular sketches:
heavy ink outlines, one flat fill per part, a handful of bright colors on paper.

```bash
npm install
npm run dev      # http://localhost:8791
```

Press <kbd>space</kbd> to reroll. Every control is mirrored into the URL, so any
frame you like is a shareable link.

37 machines, 14 palettes, 4 layouts.

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
span: [1, 2]     // siphon
```

Placement runs in two passes. Spanning machines go first and claim contiguous
blocks of equal-sized free cells; single-cell machines then fill the leftovers.
A layout whose rows do not line up (`bricks`) fails the block check and quietly
gets all singles, which is the right fallback rather than a special case.

Machines that depend on gravity — the crane, the chute, the siphon — set
`rotations: [0]` so they stay the right way up.

## Wired chains

Adjacent machines can be wired so they fire in sequence, and the wiring is drawn:
a conduit runs under the cells, terminals and a travelling bead sit on top.

Nothing is evaluated in order at draw time. A chain is purely a phase
assignment — each machine's phase is chosen so its firing moment lands
`LINK_DELAY` frames after the one before it. The cascade you see is real
causality expressed as arithmetic, which is what lets every contraption stay a
pure function of its own `u`.

Two hooks make a machine a good chain member:

- `fireAt` — where in the loop its notable moment falls (the strike, the
  arrival, the click). Defaults to 0.
- `fired` in the draw context — 1 at that instant, decaying to 0 shortly after.
  It is derived from `u`, so using it costs no purity.

`lamp`, `gate` and `bell` are built entirely around `fired`, and are what make a
chain readable at a glance. Only machines whose period is the full loop are
eligible, so a chain never has to reason about a member that fires twice per
cycle.

## Options

| Control | Effect |
| --- | --- |
| Seed | Everything random derives from this string |
| Theme | 14 palettes, each a different mood |
| Layout | `grid`, `bricks` (offset courses), `quads` (recursive subdivision), `bands` (columns at mixed scales) |
| Resolution | Cells across the art area |
| Stroke | Multiplier on the computed line weight |
| Multi-cell | How eagerly to place machines larger than one cell |
| Wired chains | How much of the grid to wire into firing sequences |
| Tag / Solo | Narrow the pool while exploring |
| Catalog | One labelled instance of every machine |

<kbd>space</kbd> reroll · <kbd>P</kbd> pause · <kbd>S</kbd> save png ·
<kbd>H</kbd> hide panel · <kbd>←</kbd> <kbd>→</kbd> step a frame

## License

Reference sketch by Okazz, CC BY-NC-SA. This implementation is a rewrite, not a
port of his file.
