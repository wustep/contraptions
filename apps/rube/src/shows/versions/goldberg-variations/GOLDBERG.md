# Goldberg Variations (Sonnet 5.5)

`/shows/?show=goldberg-variations&take=sonnet55`, in the picker's **Ambient** group as **Goldberg Variations**, one
take, **Sonnet 5.5**.

Bach's Goldberg Variations, the whole cycle in order (the Aria, Variations 1 to 30, the Aria da capo) and then round
again, played by Víkingur Ólafsson (Deutsche Grammophon, 2023) from the album's own YouTube uploads. It is a leave-on
machine, like Near Light and Soft Lamp: one time through is 4446.52 s (74:06.52), and it never ends.

## The music

Copyrighted, so nothing of it is in the repository: the soundtrack is `youtube` cues only, no `src`. There are 32
cues, one video to a track ("Víkingur Ólafsson – Topic", the album's own uploads), each `from: 0`, each at the end of
the one before it (`rotunda/music.ts`; the lengths are the videos' own, to the millisecond). `Performance.loop` is on
and `soundtrack.loop` is the period, so at 4446.52 s the show is at 0 s again and the Aria's video is already warm.
Licences and every video: `apps/rube/src/shows/versions/goldberg-variations/ATTRIBUTION.txt`.

| At (s) | Track |
| ---: | --- |
| 0 | Aria (`hMGIncslU6g`, 245.36 s) |
| 245.36 | Variatio 1 |
| 335.44 | 2 |
| 421.16 | 3, canone all'unisono |
| 531.96 | 4 |
| 588.00 | 5 |
| 659.72 | 6, canone alla seconda |
| 728.64 | 7, al tempo di giga |
| 860.76 | 8 |
| 958.00 | 9, canone alla terza |
| 1054.32 | 10, fughetta |
| 1146.96 | 11 |
| 1246.96 | 12, canone alla quarta (contrary motion) |
| 1359.88 | 13 |
| 1606.00 | 14 |
| 1728.36 | 15, canone alla quinta (contrary motion, minor) |
| 2065.72 | 16, ouverture |
| 2226.48 | 17 |
| 2342.04 | 18, canone alla sesta |
| 2429.88 | 19 |
| 2497.00 | 20 |
| 2606.00 | 21, canone alla settima (minor) |
| 2801.24 | 22, alla breve |
| 2877.32 | 23 |
| 2991.68 | 24, canone all'ottava |
| 3159.72 | 25, adagio (minor, 588 s) |
| 3747.72 | 26 |
| 3851.44 | 27, canone alla nona (no bass) |
| 3943.24 | 28 |
| 4067.32 | 29 |
| 4174.44 | 30, quodlibet |
| 4290.56 | Aria da capo (155.96 s), to 4446.52 |

## The room

A round colonnade of thirty-two columns, seen from above. A variation is thirty-two bars over the same ground bass, so
one column is one bar and the ball goes once round the rail on the columns' tops in each variation:

- **The lap is the recording's.** The ball's pace is a monotone cubic through "track k starts, k laps done", so it is
  at the gate at the top of every variation, goes round slower the longer the variation is (the Adagio's lap is the
  slowest, the fourth variation's the fastest), and never starts or stops between. `check:shows` holds all of that.
  The columns stand half a bar round from the gate, so the gate, in front, is an opening onto the rose.
- **The room is what has been played.** The ball lights the lamp of every column it passes and they stay lit. The Aria
  opens a rose of thirty-two petals in the floor, one to a bar, each opening as the ball passes its column; each
  variation cuts a ring round it, bright at the ball's head and settling as it goes on. The rings go in from the
  outside in Bach's ten groups of three, with dark between the groups: the canon that closes each group (and the
  quodlibet, and the da capo's closing ring round all of it) is the floor's ivory spine, the overture's and the
  Adagio's rings its two landmarks, the rest fine gold lines. The minor variations (15, 21, 25) go to a cool light and
  leave cool rings. The da capo opens the rose again as the Aria did.
- **The view rises as the floor is written** (`tiltAt`). Low for the Aria, where the colonnade is all there is; a
  little higher through the first half; lifted by the overture; low and close for the Adagio; highest for the
  quodlibet and the da capo, looking down on the whole floor; low again as the lamps go out. The frame is fitted to the
  room at each tilt and leans a little after the lap.
- **Each kind of variation is one thing:** a canon's second voice, smaller, rides one column behind and as much higher
  as its interval, the other way round in contrary motion (12 and 15), and lights the lamps again as it passes: each
  lamp flares twice, the tune and its answer. Two hands (the variations for two manuals) are a second ball that comes
  out of the first and braids round it, one again at the end of the lap. The overture (16) opens a soft cone of light
  from above, onto the rose, for the second half. The Adagio (25) turns the ball to a black pearl with a sheen, and the
  room turns once round it, from rest to rest, so the pearl is held near the front, dark over the lit rose, and the
  columns go by behind it. 27 is bassless, so the lamps go dim. The quodlibet (30) has five small followers in the
  lamps' own colours, the tunes it quotes.
- **One palette.** Ivory and gold, a cool blue for the minor and silver for the second voices; nothing else.
- **The loop closes in the dark.** The da capo's last minute puts out the lamps, the rings, the rose and the light,
  and the Aria's first lights them again: at 0 s and at 4446.52 s the room is the same, no lamp lit, no petal open,
  the ball unseen; the view and the camera are where they were; every shimmer runs on a whole number of cycles a
  period.
- **Nothing on the frame.** The title, each variation's name (with Bach's name as its note) and the credits are the
  page's cards (`Performance.titles`, `rotunda/titles.ts`), and there are none across the seam.

## What was subtracted

No film, no set-piece, no second world. One room, one ball, one job each: the lamps are what has been played, the
ring is which variation, the ball's lap is the variation's length, the view's height is how much has been written, the
camera breathes and comes in for the Adagio and goes out for the credits. No cuts, no strikes, no shake. Nothing but
the ball moves quickly. The craft pass took out: thirty evenly spaced rings in four tints (a moiré by the second half),
the soft pen light floating on the floor, the canon's dashed second rail, the outline round every lamp, a second step
line, the overture's hard-edged trapezoid, the pearl's bright outline and dot (a reticle), and the quodlibet's five
saturated hues.

## The player (`apps/rube/src/shows/youtube.ts`)

A soundtrack with many YouTube cues used to make one player, one iframe, for every cue at once; thirty-two is more
than a page will hold. A soundtrack of more than `LAZY_OVER` (4) cues now makes each cue's player `AHEAD` (90 s of
show) before its entry and drops it once the show has gone by; nothing changes for the soundtracks of four or fewer
cues, which make them all at the start as before. It also warms, `AHEAD` before the period's end, the first cue of a
loop, so the loop comes round with its music waiting, and puts away a cue that has been run past by a seam. Scrubbing
does not make and drop players on the way: they are tended only once the show has been steady for 400 ms.

## Honest notes

- The lap's pace is a smooth curve through the tracks' starts, so the ball is at the gate at every variation's top,
  but *inside* a variation it is not bar-accurate: it does not know the repeats or where the recording breathes.
- Which variations are "two hands" is a rough reading of Bach's headings (the ones for two manuals); the
  classification is the show's, not a musicologist's.
- The lazy player pool was driven in a headless browser against the real YouTube embeds (first cue, cue-to-cue
  handoff, a far scrub, the seam) and its behaviour read off the players, but not listened to. Headless autoplay does
  not prove what a person will hear; the seam's gap in particular has to be heard.
- Cues are the tracks' own lengths, so if YouTube's copy of a track is ever swapped for a different edit, the cues
  drift from the picture by the difference. The check holds the durations in `music.ts`, not YouTube's.
