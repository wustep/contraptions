# Composure

The Andante of Haydn's Symphony No. 94 in G major, the "Surprise", whole, in Herbert von Karajan's recording with the
Berlin Philharmonic (Deutsche Grammophon, 1982), played by YouTube from Universal Music Group's own upload (14G_PDZWXVE).
The recording is copyrighted: nothing of it ships. Attribution is in
`apps/rube/src/shows/versions/surprise/ATTRIBUTION.txt`.

Open it at `/shows/surprise/` or `/shows/surprise/opus55/` (`/shows/?show=surprise&take=opus55` works too). In the
picker it is **Composure**, on the **Machine** shelf: one take, **Opus 5.5**. The work's folder is `surprise` (the
music); the code is `surprise/pegboard/`.

## What it is

An experiment: a still, orderly board of pegs, and a machine at its foot that fires a burst of colour through it on the
music's accents. Restraint between the accents is the point. The board is the canvas; the accents are the events.

The music was chosen for that. Haydn's Andante is the best-known joke about restraint in music: a theme of plain
staccato quavers, piano, played again pianissimo with the lower strings plucking, and on the second beat of its sixteenth
bar the whole orchestra and the timpani, fortissimo, once; and then, as the old description has it, back to the quiet
as if nothing had happened. The four variations that follow keep that shape at larger scale (a forte chord at the head
of a strain, a stormy C minor, a quiet oboe, a sweeping fortissimo), and the coda goes back to the theme's head over a
held C and ends softly. Karajan's recording has the widest gap of the four official uploads compared between the
pianissimo and the stroke (44 dB in a quarter of a second), and Universal's upload may be embedded.

- **The board**: 28 pegs by 12, a cell apart, black on pale paper. It never moves except when a burst reaches it.
- **The launcher**, seen from above: a plinth, a turntable on it, and on the turntable an open trough with a
  spring-loaded block in it. A pellet comes up the lift through the trough's floor at the pivot. The turntable swings
  to aim. A ratchet draws the block back a click on each of the beats before the shot (on the downbeats for the big
  ones), the spring closing up behind it, and drawn further the harder the accent. On the beat before the accent the
  block is let go: the pellet runs up the trough and flies, its shadow on the board, and lands on the accent.
- **The burst**: the pellet lands in a gap between four pegs and goes in. The colour goes out through the pegs round
  it, peg by peg, quick at first and slower as it goes, further in some directions than others, and thinning out at
  its edge. Each peg it reaches takes the colour (some a lighter shade of it), swells, and is pushed outward; it swings
  back through its place and settles. A peg keeps the colour only a moment after the front has passed it, so the burst
  is a ring going out with the board composed again behind it, and the ring thins and goes at its edge. A few seconds
  after, every peg is black and in its place.
- **The mirror**: every strain of the movement is played twice, and on the repeat every shot lands in the mirror image
  of where it landed the first time. The surprise lands in the board's middle gap, and so does the last chord.
- **The variations' characters**: the board answers each variation as it is played. The C minor's bursts push the pegs
  harder and go out faster; the oboe's, and the coda's, push gently and go out slowly. The surprise pushes hardest of
  all, and no shot after it is as strong.
- **Where they land**: in the board's middle, clear of the bursts just gone and with the board round them. In a quick
  run the next shot is a short swing from the last, so the bursts step along the board rather than crossing it.

| Show s | Bars (as played) | Music | Picture |
| ---: | --- | --- | --- |
| 1.9 | 1–8 | the theme, piano | the board, still; the first pellet comes up the lift on the first note |
| 16.6 | 9–16 | the theme again, pianissimo, the lower strings plucking | the spring drawn back a click on each bar |
| 29.2 | 16, beat 1 | | fired |
| 30.05 | 16, beat 2 | **the surprise**: fortissimo, timpani | red, the whole middle of the board |
| 30.7–60 | 17–32 | the second strain, twice | two small reds at its forte, left and then right |
| 61.1 | 33 | variation 1: a forte chord | yellow |
| 75.2 | 41 | the forte chord again | yellow, in the mirror |
| 98.3, 112.6 | 54, 62 | the second strains' forte | small yellows |
| 118.0–131 | 65–72 | variation 2, C minor: four bars fortissimo, four piano | blue, three shots |
| 132.6–146 | 73–80 | again | the same three, in the mirror |
| 147.2–172 | 81–94 | the second strain, fortissimo, to the violins alone | blue, a shot every bar or two |
| 172–180 | 95–98 | the violins alone, the fermata | still |
| 180.5–238 | 99–130 | variation 3: the oboe, the flute with it | three small greens |
| 238.4–252 | 131–138 | variation 4: fortissimo, the violins in triplets | all four colours in turn |
| 264.1 | 145 | the dolce's sforzando | one small one |
| 281–284 | | the general pause | still; fired in the silence a quarter before |
| 284.1–309 | 155–168 | fortissimo to the end of the strain, and on | all four colours, the first five in the mirror |
| 311.4–334 | 169–181 | the coda | three small reds |
| 334.37 | 181 | the last chord | the last, in the middle gap; the launcher swings home, empty |
| 337.6 | | silence | the credits, under the board |

## The measured clock

Measured once by `scripts/shows/surprise-onsets.py` into `scripts/shows/plans/surprise-onsets.json`, from a local
analysis copy of the upload's audio that is never committed. The orchestra is played, not clocked (a quarter runs from
0.85 to 0.98 s, it breathes between strains, and it stops twice), so there is no one comb: each of the 22 strains gets
its own, fitted to the attacks under it from where the strain is heard to begin, and every beat is moved onto its own
attack where one is within 45 ms. The bars are numbered as they are played, repeats and all, 1 to 181.

`check:shows` holds the show to that file (`apps/rube/checks/composure.ts`): every shot lands on an attack the recording
has, and is fired on the beat before it; every click of the ratchet is on a beat; the surprise is the first shot, the
hardest, on beat 2 of bar 16, in the middle gap, and nothing lands before it; every repeat's shots land in the mirror of
the first time's; the turntable, the block, the pellets and the pegs never jump; between the bursts every peg is black
and in its place; and the board is composed again before the credits.

## What it is not

There is no ball for the stage to draw, no portal and no cut: one frame, held, for the whole show. Nothing is written on
the frame. No piece or drawing of another show is used.
