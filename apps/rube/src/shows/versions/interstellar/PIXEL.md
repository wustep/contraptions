# Voyage · Pixel

`/shows/interstellar/opus55-pixel/`

The Voyage take (`opus55`, `liftoff/`) as a pixel game. It is not a new story: `pixel/index.ts` composes Liftoff's
score again, so the machine, the cast, the camera, the cuts, the end credits and the two YouTube cues are the same,
second for second (`check:shows` walks both timelines and both cameras together). Two things are its own:

- **Its skies** (`pixel/sky.ts`), swapped in for Liftoff's on its own copy of the show, so Voyage's are untouched. The
  farm's sky is stacked flat stripes that move a band at a time from night to dawn to the dust's noon and deepen as the
  camera climbs, with stepped two-tone clouds, a flat sun, stair-stepped mesas for the dust wall, banded land, and
  solid poles and a water tower. The dark is flat stripes, stars that are exactly one block of the grid (or a cross
  of five or nine), snapped to it, and the Earth as banded flat discs.
- **A pass over each painted frame** (`pixel/look.ts`, `Performance.finish`):
  - **Grid.** 108 blocks down the 16:9 composition at any size, so the cast are the size they are in Voyage, in
    fewer, bigger pixels. A block is a whole number of the canvas's pixels, drawn up from a canvas of one pixel a
    block with smoothing off.
  - **One paint a block, never a blend.** A block is read at 16 points. If they agree (a fill, a sky, a glow) the
    block is their colour snapped to the palette, so gradients step in straight bands. If not, it is the paint most
    of them landed on, unless ink crosses it (then the ink) or a light stands in the dark (then the light). One-block
    teeth on band edges and lone flecks of ink are tidied away.
  - **Outlines.** A block on the dark side of a hard edge takes the darkest step of its own ramp, so every shape is
    ringed in its own shade, as a sprite is.
  - **Palette** (`pixel/palette.ts`). Ramps, dark to light and hue-shifted (night, navy, sky, teal, leaf, corn, dust,
    rust, dusk, steel), plus the cast's own colours exactly. Each area of the game paints with its ramps through its
    own grade: the farm and Cooper Station warm, orbit cool, Miller teal, Gargantua hard amber on black, Edmunds
    violet dusk. Grades ease across a flight from one area to the next; ramps change only at a cut.
  - **Nothing flickers.** No grain, no noise, no dither: a block changes only when what is under it does.
- **Hard pixels on screen** (`Performance.pixels`). The stage sets `image-rendering: pixelated` (or `crisp-edges`) on
  its canvas while this take is on it, and puts back the style it had when another show comes on, so a display's
  fractional density, or a video's frame fitted over the stage, never smooths the blocks.

The pass costs about 5 ms a frame at 1920 × 1200, and builds two colour tables (a few milliseconds each) the first
time it needs them.

The share card is the stage's own frame at `still` (240.4 s), rendered through the pass.
