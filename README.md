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

## How it fits together

```
src/
  core/
    types.ts        the Contraption contract
    define.ts       defineContraption()
    composition.ts  seed + options -> a placed, oriented, phase-offset piece
    engine.ts       owns the clock, drives p5
    layouts.ts      grid | bricks | quads | bands
    themes.ts       14 palettes
    rng.ts          seeded, forkable randomness
    ease.ts         easing, staging, wrapping
    draw.ts         shared drawing vocabulary (rails, coils, teeth, clipping)
  contraptions/     one file per machine, plus the registry in index.ts
  ui/               the seed explorer
```

## The contract

A contraption fills one square cell. Three rules:

1. **`draw` is a pure function of `u`.** `u` is your position in the loop, in
   `[0, 1)`. Never accumulate state across frames. This is what makes pausing,
   scrubbing, deterministic export, and seamless looping work at all.
2. **Draw in cell-local space.** The origin is the cell center and the cell
   spans `[-size/2, size/2]`. Rotation and mirroring are applied for you, as is
   `rectMode(CENTER)`.
3. **Be periodic in `LOOP` frames, or a divisor of it.** `LOOP` is 240 (4s at
   60fps), and 240 has enough divisors to be generous. Because a periodic
   animation stays periodic under any integer phase shift, the whole piece
   returns to its starting state every `LOOP` frames no matter how the
   instances are offset.

```ts
export const hammer = defineContraption({
  name: 'hammer',
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

Writes the file and registers it. Then use the **Solo** picker in the panel to
fill the whole grid with just that one while you work on it.

## Options

| Control | Effect |
| --- | --- |
| Seed | Everything random derives from this string |
| Theme | 14 palettes, each a different mood |
| Layout | `grid`, `bricks` (offset courses), `quads` (recursive subdivision), `bands` (columns at mixed scales) |
| Resolution | Cells across the art area |
| Stroke | Multiplier on the computed line weight |
| Tag / Solo | Narrow the pool while exploring |

## License

Reference sketch by Okazz, CC BY-NC-SA. This implementation is a rewrite, not a
port of his file.
