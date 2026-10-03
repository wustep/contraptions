# Voyage · Pixel

`/shows/interstellar/opus55-pixel/`

The Voyage take (`opus55`, `liftoff/`) drawn as 8/16-bit pixel art. It is not a new story: the take's performance is
Liftoff's own object (`pixel/index.ts`), so the machine, the cast, the camera, the cuts, the end credits and the two
YouTube cues are the same ones, second for second. The only thing it adds is `Performance.finish`, a last pass over
each painted frame (`pixel/look.ts`):

- **Grid.** 144 blocks down the 16:9 composition at any size, so Cooper, Brand, Murph and TARS stay the size they
  are in Voyage, only made of blocks. Each block reads nine points of the frame; where one stands well out of the
  others (an ink line, a star, an edge) the block takes it, so outlines come out solid and stair-stepped.
- **Palette.** 65 paints measured from sixty stills of the Voyage take, with the cast's and inks' colours exact, each
  with a step into shade and light, slightly dulled.
- **Dither.** Each colour maps to the two paints that mix nearest it; a 4×4 Bayer matrix picks between them. Flat
  fills stay flat, while skies, glows and Gargantua's disc become stepped bands with a checker between them.
- **Grain.** A sparse scatter of blocks a step lighter or darker, re-dealt eight times a second and held between.

`finish` runs only for a take that sets it (`stage.ts`), so every other show paints as it did. It costs a few
milliseconds a frame, and about 200 ms once, on the first frame, to build its colour table.

The share card is the stage's own frame at `still` (240.4 s), rendered through the pass.
