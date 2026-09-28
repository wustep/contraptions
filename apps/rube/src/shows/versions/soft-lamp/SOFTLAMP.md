# Soft Lamp (Opus 5.5)

`/shows/soft-lamp/opus55/` (also `/shows/soft-lamp/`), in the picker as **Soft Lamp**, one take, **Opus 5.5**, on the
**Ambient** shelf beside Gymnopédie.

Half an hour of Lofi Girl's *Best of lofi hip hop 2021*, its first twelve tracks, round a small machine on a study desk
by a rainy window at night. It is music to study to, and the picture is meant to be left on: one room, one lamp, one
ball, and a small round it makes once a track.

## The music

**Source.** Lofi Girl's own upload, *Best of lofi hip hop 2021 ✨ [beats to relax/study to]*
([n61ULEU7CO0](https://www.youtube.com/watch?v=n61ULEU7CO0), 6 h 11 min), played by YouTube from the video's first
second, so show time is the video's time. Nothing of the mix is shipped; there is no local recording at all
(`ATTRIBUTION.txt`). The live stream (rFZHOHl-L8A) was the mood reference only: a live stream has no fixed clock to time
a picture to.

**Why this window.** The compilation is a radio's hour cut into tracks with a breath of near-silence between them (a
second or so, below -50 dB), no crossfades. Its first twelve tracks run from 0:02.0 to 30:12.4, where *Passing By* fades
to its floor and the thirteenth comes in under it; the cue stops there with a two-second fade riding the track's own.
That is the half hour.

**Measured once.** `scripts/shows/soft-lamp-onsets.py` reads a local analysis copy of the video's first forty minutes
(fetched with yt-dlp into the git-ignored `out/`, never committed) and writes `scripts/shows/plans/soft-lamp-onsets.json`:

- each track's first and last audible moments, between the measured gaps;
- its grid: every track is made to a click that never moves, a whole number of beats a minute (65 to 94), fitted to
  the sharp rises of the kick band and the crack band on sample-exact 4 ms frames;
- its downbeats. The grooves put the kick on one and the crack on two and four (Breathtaking and Daydream are
  half-time: the crack on three alone), so the bar's phase is the one the kick hits most while the crack keeps off one
  and three; where that leaves a two-beat tie, the drums' entries break it (an entry a beat early counts as a pickup);
- which bars have the kit playing (the low band, a mean over the bar, so a kick pattern's gaps count for nothing);
- per beat, how hard the kick and the crack are struck; and every fifth of a second, the mix's loudness and how full
  its held sound is (the pad and the keys, a median over each band so the attacks count for little).

Two things went wrong on the way and were caught by drawing the attacks bar by bar (a raster, one row a bar): a frame
of `int(SR * 0.004)` samples is 3.991 ms, not 4, which scaled every time by 0.23% and made every track look played
slow; and a beat's loudness window caught the next kick's attack (kicks are struck a few milliseconds ahead of the
grid), which put four tracks' downbeats a beat early, snare on one and three. Both fixed; every track's rows now stand
straight, kick on one, crack on two and four (or three).

### The cue map

| # | Track | Artists | Tempo | Starts | Drums in (drop) | Breaks | Drums out (lob → sill) | Ends |
| - | - | - | - | - | - | - | - | - |
| 1 | morning moon | Kanisan, Wishes and Dreams | 80 | 0:02.0 | 0:20.2 | 1:08.2–1:32.2 | 2:06.7 → 2:08.2 | 2:23.3 |
| 2 | Lavender | Kupla | 79 | 2:23.3 | 2:47.3 | — | 4:23.0 → 4:24.5 | 4:51.1 |
| 3 | Destination Unknown | amies | 80 | 4:52.2 | 5:13.7 | 6:01.7–6:13.7 | 7:12.2 → 7:13.7 | 7:39.6 |
| 4 | Overgrown | Tenno | 67 | 7:43.3 | 8:09.0 | — | 9:36.8 → 9:38.6 | 9:55.5 |
| 5 | Magical Connection | Peak Twilight, Prithvi | 75 | 9:55.5 | 10:18.8 | 11:10.1–11:35.7 | 12:15.7 → 12:17.3 | 12:29.3 |
| 6 | Blooming Dales | Krynoze, Diiolme | 70 | 12:29.3 | 12:54.4 | 13:49.3–14:03.0 | 14:56.1 → 14:57.8 | 15:14.2 |
| 7 | Exhale | No Spirit | 71 | 15:14.2 | 15:40.2 | — | 17:53.7 → 17:55.4 | 18:00.7 |
| 8 | Stargazing | kyu | 65 | 18:00.7 | 18:13.1 | 19:08.4–19:26.9 | 19:54.6 → 19:56.4 | 20:14.4 |
| 9 | Breathtaking | Purrple Cat | 90 (half-time) | 20:14.4 | 20:33.2 | 21:37.2–21:42.5 | 23:09.2 → 23:10.5 | 23:21.4 |
| 10 | takeoff | stream_error | 74 | 23:21.4 | 23:33.6 | — | 25:15.7 → 25:17.4 | 25:30.7 |
| 11 | Daydream | kyu | 94 (half-time) | 25:30.7 | 25:47.7 | 26:49.0–27:09.4 | 27:49.0 → 27:50.3 | 28:11.7 |
| 12 | Passing By | Casiio, Sleepermane | 78 | 28:12.6 | 28:35.8 | — | 29:49.7 (stays) | 30:12.4 |

Every track has the same shape, and the show is built on it: an intro with no drums; the drums in on a downbeat; the
groove in phrases of four and eight bars, most with a break of a few bars; the drums out for good on a downbeat; a short
outro into the breath before the next.

## The desk

Left to right: the window over the desk, and on its sill a plant in a clay pot; a mug under the sill; three books
stacked into a stair that steps down to the right, under the sill's right end; the headphones set down on the desk, the
near cup lying on its back, cushion up, the band arching over to the far cup standing on its edge; and over it all,
from the right, an architect's lamp, its shade turned down onto the books and the cup. The ball is a ping-pong ball, so
a cell is about 15 cm and everything is its real size.

**One job to a thing.**

- **The lamp** is the light, and nothing else. The room opens dark, lit only by the window; the lamp warms on over a
  second and a half as the first track's first chord sounds, breathes a few per cent with the held sound, is a shade
  warmer or paler for each track (eased across the breath between them), and goes down to a glow as the last track
  rings out. Its pool is the frame's brightest place, and the ball is brightest in it.
- **The window** is the weather. The rain is lighter at the start of the night, heaviest through its middle (Exhale),
  lighter by the end, a little different each track. Outside, the city's lit windows go out one by one through the
  half hour. On the glass, beads gather where they land and a few run down in fits and starts.
- **The mug**'s steam is the held sound, the pad and the keys under each track: three soft wisps, fuller as it swells,
  thinner through the night as the tea cools.
- **The books** are the stair down.
- **The headphones**' near cup is the listener's seat: the cup plays the kick, and the ball nods to it.
- **The plant pot** is the stop the ball comes back off, and it rocks when it does.

**The design system.** One ink for every line, the ball's included, at the ball's weight (structure at full weight,
detail at half or less, decoration hardly at all). Two colours and the neutrals: the lamp's amber (the light, the wood,
the clay, the one warm book) and the rain's blue-grey (the night, the glass, the one cool book, the plant), over a cool
near-black room and a cream. Unlit things are dark; the lamp is what makes anything light.

## The lap

A lap a track, the same round each time, timed to that track's own shape (`lamp/route.ts`):

1. **The sill.** Through the end of one track and the start of the next (the outro, the breath between, the intro: no
   drums), the ball walks the sill from the pot to its right end, in front of the rain, at an even pace (eased off the
   pot and into the tip), never quite still.
2. **The drop.** It goes over the end (it pivots on the corner and falls) and lands on the top book as the drums come
   in, exactly on their first downbeat.
3. **The stair.** It rolls to the book's edge and steps down, a half bar a step, each landing on a strong beat (one or
   three), the last onto the cup's cushion, and it settles into the cup's hollow with a few damped rocks.
4. **The cup.** Through the groove it sits there like a listener. On a kick struck on one or three (as hard as it was
   struck, as full as the bar is) the cushion pushes it up a little and it comes back down with a small second bob, so a
   nod settles rather than stops dead. It sways slowly side to side, a sway every two bars. Through a break there are no
   kicks, and it only sways.
5. **The lob.** On the last bar of drums, beat three, the ball crouches into the cushion and the cup's last kick lobs
   it back over the books; it lands on the sill as the drums leave, on the downbeat, rolls into the plant pot, and comes
   back off it at a walk. The lob's height is the track's own: two beats' flight, so it goes higher on the slow tracks.

The last track has no lob. The drums leave, and the ball stays in the cup, its sway dying away as the music ends and
the lamp goes down: the listener asleep.

Every leg starts where and as fast as the one before it ends; the only changes of speed faster than the world's
gravity are landings, the cushion's push, and the pot.

## The camera

A slow operator a little behind what they decide to look at (`lamp/camera.ts`): a list of held frames, followed by a
triple-pole critically damped rig, so every move starts with neither speed nor acceleration and settles without
overshooting over about six seconds. It is the sum of each aim's step response: a function of time, so scrubbing back is
the same frame as playing forward.

The frames: the room (the show opens and closes on it); the sill walk (the frame keeping a little ahead of the ball,
resting at the sill's end); the stair, a bar and a half before each drop; and through each groove, a phrase (eight
bars) at a time, four looks at the same desk, each track taking them in its own order:

- the cup, close: the ball in its seat, the stair's foot, the band rising out of frame;
- the desk under the lamp: books, cup, band and the whole lamp over them;
- the window over the desk: the rain, the plant and the mug, and the machine small under the lamp;
- the lamp's side: the shade, the band's arch, the cup under the light.

A break draws back to the room, and so does the bar before each lob, so the whole arc is in the frame.

Every held frame is composed: each prop in it whole and clear of the frame's edges by a tenth of a cell, or not in it
at all (the props stand across the desk with few gaps between them, so each frame is solved for edges that fall in
those gaps). Under Zoom (the same frame half again closer) the ball is in the picture 99.9% of the half hour.

## The words

The title, **Soft Lamp**, with *Lofi Girl · Best of lofi hip hop 2021* under it, on the dark wall right of the window
as the lamp comes on. Each track's name and artists, small and brief, over the glass as it begins, as a radio says what
it is playing. The credits (Directed by Stephen Wu and Claude Opus 5.5, drawn with p5.js; Music, Lofi Girl, *Best of
lofi hip hop 2021*, its first twelve tracks) on the dark wall while the last track rings out.

## Director's passes

What each round of scrubbing found, worst first, and what changed:

1. **The headphones did not read**: a flat pad and a thin hoop. Now the near cup lies on its back (a shell and a thick
   cushion with a hollow), the band arches from a yoke on its far side, and the far cup stands on its edge.
2. **The close frame made the ball the size of the cup**, and the wide lost it. The close frame is looser and the wide
   is lower, so the desk sits at four fifths of the frame and not at its foot.
3. **The wall's glow was one orange wash**, and a light cone from the shade was haze. The cone is gone; the room is a
   cool near-black and the lamp's pool is warm and small, so the light reads as the one light.
4. **The books read as cream slabs**, and the bottom book and the unlit mug were as bright as the ball. The books are
   spines with bands and labels, all darker; the mug is dark until the lamp reaches it; the ball is the brightest thing
   in the pool.
5. **The glass drops read as stars**, then as little smile-marks: now soft pale beads, a point of light in the bigger
   ones, warm on the lamp's side.
6. **The steam was three hard ropes**, then showed each segment's overlapping caps: now each wisp is one line faded
   along its length.
7. **Two turns in the machine had no cause.** The lob lands going left and the walk goes right: a plant pot at the
   sill's end is the stop it comes back off. The drop off the sill needed a way to turn round too: the stair and the
   cup continue the same way, and the one real turn is the lob, from rest.
8. **The same close-up 70% of the half hour.** The four groove looks, a phrase each, in each track's own order.
9. **Props sliced by the frame's edges**: the lamp's mouth, the mug, the far cup, the plant's leaves, the lamp's foot.
   Every held frame re-solved (see the camera), and the check holds them.
10. **The nods stopped dead** on every landing. Each now has a small second bob; the camera's moves start with no
    acceleration at all (the rig went from two poles to three).
11. **The sill walk all but stopped halfway** on the longest gap (the Hermite's ends were faster than its middle). Now
    an even walk, eased at both ends.
12. **Zoom lost the ball 22% of the time**: now 0.1%.

**Subtracted:** the light cone; the pages turning on each track (considered and not built: the page is the notebook's
second job); a cable from the headphones; a drinking bird that would have lifted the ball (a character, and a gag);
the headphone "U" the ball first rocked in; the beads' dark cover; a quarter of the drops on the glass.

## Judgment calls for Stephen

- **Track cards.** Each track's name comes up for a few seconds as it begins, as a stream shows what is playing. It is
  twelve cards in half an hour; they could go.
- **A lap a track.** The round is the same twelve times; what changes is the track (its tempo, its kick, its breaks,
  its lob's height), the weather, the lamp's warmth, the night outside and the camera's order. The alternative was a
  new mechanism per track, which the brief ruled out as a gag every few minutes.
- **The end.** The ball stays in the cup and the lamp goes down to a glow, rather than going out: the window is the
  last light.

## Checks

`check:shows` (`apps/rube/checks/soft-lamp.ts`): the picker entry and the Ambient shelf; the cue (YouTube only, from
the video's zero, until the twelfth track's floor, credited); half an hour; the twelve tracks in order, each on a
whole-number grid, each with an intro, sixteen bars or more of groove, and an outro; the ball never jumps and every leg
starts where the last ended; a lap a track, the last staying; the drop on the drums' first downbeat onto the top book;
every step and the cup landing on one or three; the lob on the last drum bar's three and the landing on the drums'
last downbeat; the turn at the pot and a walk that never turns back or stops; nods only on kicks struck on one or three,
in the groove, in the cup; the ball in the hollow while it sits; still at the end; the camera under half a frame a
second and half a frame a second a second; every held frame whole and clear; Zoom; the words.
