# Ostinato

Ravel's *Boléro*, whole, as one machine that grows with it. The recording is CC BY 4.0 (Omega13a's, played from the
score in MuseScore 4 with Muse Sounds), so it ships with the show. Attribution is in
`apps/rube/src/shows/versions/bolero/ATTRIBUTION.txt`.

Open it at `/shows/bolero/` or `/shows/bolero/opus55/` (`/shows/?show=bolero&take=opus55` works too). In the picker it
is **Ostinato**, on the **Ambient** shelf with Gymnopédie and Soft Lamp: one take,
**Opus 5.5**. The work's folder is `bolero` (the music); the picker's title is the device the whole piece stands on.

## What it is

*Boléro* is one rhythm on a side drum, two bars long, played 169 times without a change of tempo, under one tune in
two halves (A and B) played eighteen times, A A B B four times over and then A and B once more, each time by new
instruments and a little louder, until the orchestra is whole; then eight bars in E major, the only modulation, back
to C, and a collapse. So the show is one machine that grows the same way: **a tower standing on the side drum**.

- **Everything stands on the drum.** A mast rises from the middle of its head; the storeys hang on the mast, one over
  another, each wider than the one under it: an inverted pyramid on one small drum, top-heavy and getting more so.
- **The drum plays itself.** A wheel beside it has the rhythm on its rim as 24 pins (the triplets as close pins),
  turning once every two bars; each pin, passing the top, trips a stick onto the head. A mallet on a box across the
  drum plays the plucked strings' figure (the low note on every downbeat). The same drive runs up the mast as a chain
  that steps a link on every stroke, through every storey.
- **Each storey is one loop of the score.** An upper rail (the tune's first eight bars, left to right), a U-turn at the
  right end (its long held note), a lower rail (the other eight, right to left), and at the left end a lift. **A key
  is laid for every note** where the ball will be as it sounds, and the ball rolls at the pace that puts it there:
  slow over a held note, quick through a run. Under each key hangs a chime as long as its note is low, so each rail's
  chimes are the tune's shape upside down.
- **The ball plays every statement** by rolling once round a storey: 1,728 notes in all, each a key it crosses as the
  note sounds. The first time round a storey (a new voice), each key takes its colour as it is played.
- **The lift is the ostinato.** Between statements (the two bars of drum alone) the ball rides a cup up the tower's
  left flank that climbs a tooth on each of the 24 strokes: to the upper rail again, or on up to the next storey.
- **Each storey is played twice** (A A, then B B) and then the next **unfolds out of the bud** at the top of the mast
  in the two bars before the ball reaches it: its floor swings down in two halves, its posts stand, its rails run
  out, its keys flip up in the order they will be played. The last two statements have a storey each.
- **Each storey's engine is let in on its second statement** and runs from then on, as Boléro's instruments join the
  accompaniment once they have had the tune: the flute's and clarinet's escapement, ticking the drum's rhythm; the
  bassoon's bellows; the oboe d'amore's carillon; the saxophones' valves; the horn and celesta's pendulum wave; the
  trombone's slides; the violins' bows; the strings' and trumpet's flywheel; the tutti's cymbals and timpani. By the
  end ten engines play under the tune.
- **The doublings.** From the ninth statement (horn, celesta and piccolos in parallel) the storeys under the ball that
  have its theme play along with it, their keys struck by the machine as the ball strikes its own: one storey, then
  two, then four, as the tune is doubled in more and more of the orchestra.
- **E major is gold.** On its first downbeat the ball is home at the top storey's end; the lift takes it up, a gold
  roof rises over the top storey (the tower's one upright triangle), the paper warms to gold, and the ball climbs the
  roof's stair a tread a beat to the finial at the apex, landing in its cup on C's return (bar 335) as the great bell
  under the apex is struck.
- **The collapse.** The tutti's last two bars rock the tower on the drum. On bar 339 (the trombones' glissandi) it
  splits down its mast, and each storey's two halves let go, the roof first and the lowest last, and fall away either
  side, turning outward, all of them down round the drum by the last chord. The ball, tipped out of the cup, falls
  straight down the middle and lands on the drum head on the last chord, and bounces to rest there. The drum stands.
- **Night** comes down over the ruins for the credits.

One ball, one path, one take: no portal and no cut.

## The cue

Maurice Ravel, *Boléro* (1928; Durand, 1929). The composition is public domain in the United States (its term ended on
1 January 2025) and in France and the EU. The recording is Omega13a's on Wikimedia Commons (CC BY 4.0), made in
MuseScore 4 with Muse Sounds from Ravel's score. It was chosen because it is properly licensed, whole and clean, and
because it keeps the score's tempo, a quarter = 72, from the first bar to the last, as Ravel asked of every
performance of it: the picture's clock and the music's are the same machine. It is re-encoded whole and untouched
(`scripts/shows/bolero-cue.sh`; 851.99 s, CBR so seeks land where the clock says).

The other candidates, for the record: the Commons transfers of 1930s to 1960s recordings (Ravel's own, Munch,
Fricsay, Tzipine) are public domain in the EU but still protected in the United States; a CC BY flashmob performance
by the Conservatoire de Paris is a real orchestra but a camera's level control flattens its crescendo, which is the
piece.

## The measured structure

Measured once by `scripts/shows/bolero-onsets.py` into `scripts/shows/plans/bolero-onsets.json`. The side drum's 24
strokes, fitted over all 169 turns, put bar 1's downbeat at 0.0035 s; every 18-bar stretch sits within 5 ms of that
one comb. Both themes are transcribed note by note from the 1929 Durand full score (the Commons scan) and checked
against the recording: every note of A, and 89 of B's 91, is among the three strongest pitch classes while it sounds.

| Show s | Bars | Music | Picture |
| ---: | --- | --- | --- |
| 0 | 1–4 | side drum and plucked strings alone, pianissimo | the drum and its wheel; the ball waits in the lift's cup; storey 1 unfolds as the lift takes it up |
| 10.0 | 5 | flute (A) | storey 1, first time round |
| 55.0 | 23 | clarinet (A) | storey 1 again; its escapement let in |
| 100.0 | 41 | bassoon (B) | storey 2 |
| 145.0 | 59 | E-flat clarinet (B) | storey 2 again; bellows |
| 190.0 | 77 | oboe d'amore (A) | storey 3 |
| 235.0 | 95 | flute and muted trumpet (A) | storey 3 again; carillon |
| 280.0 | 113 | tenor saxophone (B) | storey 4 |
| 325.0 | 131 | soprano saxophone (B) | storey 4 again; valves |
| 370.0 | 149 | horn, celesta, two piccolos (A) | storey 5; storey 1 plays along |
| 415.0 | 167 | oboes, cor anglais, clarinets (A) | storey 5 again; pendulums |
| 460.0 | 185 | trombone (B) | storey 6; storey 2 plays along |
| 505.0 | 203 | the woodwinds (B) | storey 6 again; slides |
| 550.0 | 221 | first violins and woodwinds (A) | storey 7; storeys 1 and 3 play along |
| 595.0 | 239 | violins and woodwinds (A) | storey 7 again; bows |
| 640.0 | 257 | violins, woodwinds, trumpet (B) | storey 8; storeys 2 and 4 play along |
| 685.0 | 275 | the strings, saxophones, trumpet (B) | storey 8 again; flywheel |
| 730.0 | 293 | tutti (A) | storey 9, its cymbals; storeys 1, 3, 5, 7 play along |
| 775.0 | 311 | tutti (B) | storey 10, its timpani; storeys 2, 4, 6, 8 play along |
| 815.0 | 327–334 | E major | the roof; the stair, a tread a beat |
| 835.0 | 335–338 | C; the tutti's last bars | the ball in the finial; the bell; the tower rocking |
| 845.0 | 339 | the collapse | the tower falls away round the drum |
| 847.5 | 340 | the last chord | the ball lands on the drum head |
| 850 | | the chord's ring; silence | night; the credits |

## Craft notes

- **The Machine's drawing.** Ink lines over one flat fill, on warm paper: the tower is drawn
  the way the Machine's own pieces are, not painted. Colour is the orchestra: a colour for each storey's pair of
  voices, from the flute's pale sage and the bassoon's straw up through apricot, amber, the horn's bronze, the
  trombone's terracotta, the violins' vermilion and wine, to the tutti's plum and aubergine; the ball is the one cool
  thing in it.
- **The rails are the score.** A key's place is where the ball's middle will be when its note sounds; its width is a
  little for being a note and more for being long, so a run is a row of narrow keys the ball hurries over and a held
  note a long key it lingers on. The ball's arc length against time is a monotone cubic through every key, so it
  carries its speed smoothly from note to note, never runs back, and leaves and enters the lift's cup from rest.
- **Keys light as they are played.** The first time round a storey, every key is paper until the ball plays it, then
  takes the storey's colour: the storey colours in with the flute.
- **The lift ticks.** It is a toothed rack up the flank and one cup; the cup climbs only on the drum's strokes, eased,
  and slides back down while the ball goes round.
- **The bud.** Until a storey's turn its floor stands folded up on top of the tower, the next storey promised.
- **The sway.** The tower rocks on the drum head once every two bars, more as it grows and the orchestra swells; from
  C's return it rocks hard. The ball and the camera's view of the tower rock with it.
- **The collapse is the reverse of the growth, fast.** Fourteen minutes of storeys come down in two and a half
  seconds, top first, the halves turning outward as they fall so the tower opens down its mast; the last lands on the
  last chord. Down, the ruins go quiet (their ink fades back), so the drum and the ball stand out of them.
- **Credits need a dark ground.** The page sets them in cream, so night comes down over the ruins from the top of the
  sky before the first card.

## What `check:shows` holds it to

`apps/rube/checks/ostinato.ts`: the picker's names; the whole recording from zero, credited to Ravel and Omega13a under
CC BY 4.0; one comb, every statement within 6 ms of it; the themes as transcribed heard in the recording; eighteen
statements every 18 bars; no portal and no cut; ten storeys, each wider than the one under it, one for each pair of
statements and one each for the last two, each unfolded before the ball reaches it, each engine let in on its
storey's second statement; every note of every statement a key the ball crosses as it sounds; every strike (every
note, every one of the drum's 4,056 strokes, every step of the lift, every tread) on the comb; the stick down on every
stroke; the doublings growing; the ball never jumping and never hidden, and in the frame all the way (and under Zoom,
but in the tower's great wides); the stair a tread a beat into the finial on C's return; the ball landing on the drum
head on the last chord and resting there; the tower down by the last chord; and the credits' words.

## How to run it

```
npx vite --port 8973 --strictPort                 # then /shows/bolero/
npm run check:shows                               # the Ostinato block is apps/rube/checks/ostinato.ts
python3 scripts/shows/bolero-onsets.py            # measure the recording again (only if it changes)
node dev/shot.mjs --show bolero --take opus55 --from 815 --to 850 --n 12 --out end.png   # contact sheets (untracked dev/ tools)
```

The share card is `public/shows/bolero/opus55.png`.

## How it was made

Directed by Claude Opus 5.5: the cue chosen and measured (the tune transcribed from the 1929 score and checked against
the recording), the tower's kit (the storeys' loops, the keys, the lift, the unfold, the sway, the collapse, the
roof, the camera, the credits, the check), then five builders in parallel on the ten engines, a file each, and the
whole film watched and fixed where it was weakest.
