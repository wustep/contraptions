# Quarter Turn

Bach's first Goldberg variation, whole, played by a wooden toy. The recording is Kimiko Ishizaka's, from the Open
Goldberg Variations (2012), dedicated to the public domain, so it ships with the show. Attribution is in
`apps/rube/src/shows/versions/goldberg/ATTRIBUTION.txt`.

Open it at `/shows/goldberg/` or `/shows/goldberg/opus55/`. In the picker it is **Quarter Turn**, on the **Machine**
shelf: one take, **Opus 5.5**. The work's folder is `goldberg` (the music); the code is `goldberg/tumble/`.

It is an experiment: no stock pieces, no ball, no worlds. A Rube Goldberg machine to a Goldberg variation.

## The toy

A walnut tray, nine cubes long and five deep, with a rim a cube wide round it. In it, five maple planks seven long, one
to a row, each sliding along its row. Each plank has one pocket at its middle, a cube deep and lined in the paint of the
cube it belongs to. When the planks stand flush in the middle of the tray their pockets make one column. Five cubes in
milk paint: black, red, yellow, blue and green.

A cube only ever moves by tipping over one of its bottom edges into the next cell: a quarter turn. Into an open pocket it
tips and drops, and its top is then part of the plank, so another cube can walk over it. A plank only slides along its
row, carrying whatever stands on it, or is lifted out, turned over and set back, with nothing on it.

## Who does what

The variation is in three, a quarter about 0.58 s, so the toy keeps the metre in layers: the planks move on the
phrases, the black cube on the bars, the others on the beats, and a struck cube or a last dash on the eighths.

- **Black, the clock.** A quarter turn on every downbeat from bar 2, round the rim: 32 cells, so a lap is a half of
  the variation, ending at the front's middle on bars 32 and 64. On the last note it steps into the last pocket.
- **Yellow, the passenger.** It never takes a step. The planks carry it to and fro until its pocket is beside it, and
  it tips in on the first half's last note.
- **Blue, the walker.** It walks home the long way in the repeat, step, step, rest, over the passenger's top, and runs
  the last three on the cadence's run.
- **Green, the gate.** It walks to its post in the first half and stands there. In the second part the planks bring its
  pocket behind it and the striker in front of it; it goes home only when struck.
- **Red, the striker.** It backs off, comes on, and lands on the passenger's top against the gate, which tips into its
  pocket on the last note of the third half. Then it walks home over the others, a step on each second beat (the clock
  has the first).

## The form

    bars  1–16   A     the clock sets out alone; then the planks shuffle, one every two bars, and carry
                       the passenger to and fro; the run down to the cadence carries it beside its pocket,
                       and it tips in on the last note; the gate walks to its post
    bars 17–32   A'    the board holds still (she plays the repeat softer); the walker walks home
    bars 33–48   B     the gate's plank turns over; the planks line up a column behind the gate, two bars
                       apart: its pocket, the passenger, the striker; the strike on the last note
    bars 49–64   B'    the clock's plank turns over; the striker walks home over the others; the whole board
                       swings, a ripple of planks a beat apart, back to front and front to back; on the last
                       bar's downbeat all five come flush, and on the last note the clock steps home

Each half ends the same way in the music, a run down eight sixteenths to the last note alone, and each ends in the toy
with a cube coming home on that note. She breathes between the halves; the toy is still there.

The camera stands at the table, the toy whole, and only in the last phrase leans in toward the column.

## The clock

`scripts/shows/goldberg-onsets.py` reads the show's own copy of the recording and the Mutopia Project's engraving of the
variation, unrolls the score to the order she plays it (each half twice, 64 bars, 192 quarters), and follows it note by
note along the recording's attacks: each note is looked for where the last bar's tempo says it falls, and at the first
note of a half, after her breath, the first clear attack past where it was due. 755 of the 756 onsets are on their own
attack. It writes `scripts/shows/plans/goldberg-onsets.json`.

## The checks

`apps/rube/checks/goldberg.ts`, from `check:shows`: the recording and its credit; the clock against the file; the
machine's own checks (`tumble/machine.ts`: never two cubes in one place, a tipping cube holding the cell it leaves and
the one it lands in; nothing tipping off the toy, into the tray's floor, or onto a plank that is moving; nothing on a
plank while it turns over; every cube into its own pocket); every landing, and every plank's start and stop, on a
note; the clock on every downbeat and its laps ending on bars 32 and 64; each cube home on its cadence; the gate and
the passenger keeping to their jobs; everything flush and home at the end and not before the last bar; the camera
holding the toy until the last phrase and never cutting.

## Code

`goldberg/tumble/`: `music.ts` (the clock), `geo.ts` (the toy's measures and the view), `machine.ts` (the toy as it
runs, built from cues and checked), `score.ts` (the cues: who moves on which beat), `paint.ts` (the drawing),
`camera.ts`, `show.ts` (the `Show`: one place, no ball, one drawing) and `index.ts`.
