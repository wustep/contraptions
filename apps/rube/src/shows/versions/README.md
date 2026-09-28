# Versions

A show is a piece of music and a machine choreographed to it. One file is one
version of one show:

```
versions/<work>/<take>.show.ts
```

`<work>` is the music (`clair-de-lune`), `<take>` is this run at it (`take-a`),
both in lower case and hyphens. Drop the file in and it is in the picker at
`/shows/`, grouped with the other takes of the same work, in file order.
Nothing else keeps a list. A link to it is `/shows/<work>/<take>/`, and the
work's first take is also `/shows/<work>/`. `/shows/?show=<work>&take=<take>`
still opens it, and `/theater/?show=<work>&take=<take>` starts Theater on it.
`/shows/` with no work opens Clair de Lune, Take B.

Keep two takes of the same music side by side for as long as you like; they
share nothing unless you make them share it. To combine them later, write a
third.

## Names

The folder and file names are addresses, so they are chosen once:

- **Work**: `versions/<work>/`, which is also `/shows/<work>/` and
  `public/shows/<work>/`. It names the music (`clair-de-lune`, `heptapod-b`),
  not the picker's title, which is the version file's `title` and can change
  freely: `come-recover` is **Everything**, `heptapod-b` **Logogram**,
  `interstellar` **Voyage**, `la-la-land` **Epilogue**, `bolero` **Ostinato**,
  `nature-of-daylight` **Palindrome**, `relax` **Magnum**, `time` **Kick**. The write-up says which is which.
- **Take**: `<take>.show.ts`, which is also `/shows/<work>/<take>/` and the
  card `public/shows/<work>/<take>.png`. Name it for who made it (`opus55`,
  `fable51`, `grok47`), or with a letter (`take-a`). La La Land's two keep the
  model's point as a hyphen (`opus5-5`, `fable5-1`). A second take by the same
  hand adds its code name (`opus55-spark`). Don't repeat the work's name in it.
  Takes sort by name, and the first is the work's own page, unless the registry
  puts another first (`PREFERRED_TAKES`: Epilogue's and Cornfield Chase's Opus).
- **Shelf**: the picker and Theater set the works out as **Machine** (Clair de
  Lune, Première Arabesque, Cornfield Chase, Ostinato), **Movies** and **Ambient**
  (Gymnopédie). A work is Movies unless `SHELVED` in `../registry.ts` names it.
- **Code**: a take that is more than a score file keeps its code in a folder
  named for its code name (`caravan/whiplash/`, `mountain-king/spark/`). Where
  the take id carries a code name, the folder uses the same one. A take's code
  keeps its name when the take is renamed (`la-la-land/sebs/`,
  `cornfield-chase/tech-demo.ts`).
- **Write-up**: `<NAME>.md`, after the code name or the picker's title
  (`SPARK.md`, `CARAVAN.md`). It opens with the take's address.
- **Attribution**: one `ATTRIBUTION.txt` per work. A take with a recording of
  its own adds `<NAME>_ATTRIBUTION.txt` (`la-la-land/SEBS_ATTRIBUTION.txt`).

A name already shipped stays, even where it misses these (`come-recover/opus55-all-at-once`
is Everything's only take, with its code name in the id). Renaming a take moves a public link
and its card, so the old name goes in `RENAMED_TAKES` (`../registry.ts`): the page opens the old
address as the take and writes the new one back, and the build writes a page at the old address
too. Four have moved: `la-la-land/opus55-sebs` → `opus5-5`, `la-la-land/fable51-epilogue` →
`fable5-1`, `cornfield-chase/opus55-music-sync` → `opus55`, `cornfield-chase/tech-demo` → `grok47`.
A work has no such map yet, so renaming one waits for it.

## The file

```ts
import { defineShow } from '../../registry'
import recording from './goedhart.mp3'

export default defineShow({
  title: 'Clair de Lune', // the same in every take of this work
  label: 'Take A',
  note: 'One line on what this take is trying.',
  about: 'One sentence for a shared link: what the music is.', // the share card's line
  still: 120, // seconds of show where the share card's picture is taken
  async load() {
    const { ClairDeLune } = await import('./take-a')
    const show = new ClairDeLune()
    return {
      show, // a Show: the player asks it for show.at(t), t in seconds of music
      duration: 312.4, // seconds; the player holds the last frame there
      camera: (t) => show.cameraAt(t), // { x, y, cells }; leave out to follow the ball
      cuts: (t) => t >= 0.8, // leave out to draw every cut
      soundtrack: {
        src: recording,
        offset: 1.92, // seconds into the recording where the show's zero falls
        credit: 'Performed by … · CC BY 4.0', // said in the panel, never on the frame
        href: 'https://…',
      },
    }
  },
})
```

Every take has its own page, `/shows/<work>/<take>/` (and the work's first
take is also `/shows/<work>/`), written by the build with the take's own
share card: its title, `about`, and a still at `still`
(`../share.ts`, `vite.config.ts`). The pictures are
`public/shows/<work>/<take>.png`, made by `npm run cards` against a running
dev server (`scripts/shows/show-cards.mjs`, which can also draw a contact sheet
to choose `still` from). The build fails on a take with no picture.

The page reads every version file before it shows a picker, so the file
itself imports only `defineShow`, types, and the recording's URL. The score,
the `Show` subclass and anything else with weight go behind `load()`.
`check:shows` holds you to that, loads every version, and walks it from its
first second to its last.

## What the player promises

- **The music is the clock.** While the recording plays, show time is where
  the recording is. At 2× the recording is time-stretched, not pitched up,
  and the picture is wherever it has got to.
- **It asks for `show.at(t)`**, with `t` in seconds of music. New music takes
  arrange stock durations against recording cues. Choose the pieces, their
  stock variants and their order; do not stretch mechanism clocks or add
  pauses. `../stock/show.ts` plays saved stock placements directly.
  `../timemap.ts` remains for the existing Take A and metronome studies.
- **Nothing is written on the frame.** A show's canvas cannot set type, live
  or in a saved file. Titles, credits and anything else in words go in the
  fields above and are shown in the panel.
- **`camera` frames for 16:9.** `cells` is how many cells a 16:9 frame shows
  top to bottom. A stage of another shape sees more world round that frame,
  never less of it; a saved file is exactly it. Overview overrides framing
  with Machine's fit of the current world's bounds. Zoom sits closer on the
  follow camera. Each turns the other off. They affect live viewing
  and export without changing the music clock.
- **A label's upload can play the music instead of the file.** Add
  `youtube: [{ id }]` to the soundtrack and the page embeds that video in
  the panel and listens to it for the clock (`../youtube.ts`). A mix of two
  recordings is two cues: `{ id, at, from, until, fadeIn, fadeOut }`, where
  `at` and `until` are seconds of show and `from` is seconds into the video,
  as in Voyage. YouTube can only turn a video down, never up. Keep `src`:
  a saved video records the file, the file plays wherever YouTube will not
  (a blocker, an upload that refuses embedding), and `?music=file` plays it
  on purpose, to compare the two.

## What is here

The picker is the `.show.ts` files. Off that list, and so not in Shows: Clair de Lune Take A, Première Arabesque Take A, the metronome, and the Cornfield Chase takes that are not music-sync (multi-ball and trails). Clair Take B, Première Take B, Interstellar (its own work; it was the Liftoff take of Cornfield Chase), the two Cornfield Chase music-sync takes, and Come Recover's All at Once stay. The scores and checks for the takes that left the picker are still on disk.

`premiere-arabesque/take-a` is a real show: Debussy's Première Arabesque to
Patrizia Prati's recording, the machine walking Regular, Forest, Aqua,
Arcade. The version file only names it. The score, `PremiereShow`, camera
and soundtrack live in `apps/rube/src/timed/premiere-arabesque/` and are
fetched from `load()`.

`premiere-arabesque/take-b` and `clair-de-lune/take-a` are full stock-timing
arrangements with four long maps. Their explicit piece orders live in
`scripts/shows/plans/`. `generate:premiere:b` and `generate:clair` compile
those orders using fresh stock placements and write the scores and cue
reports. `check:premiere` includes both Première takes; `check:clair` checks
both Clair takes. Each keeps its approved recording offset and panel credit. Clair was
arranged across the whole catalog: every piece at least once and a repeat
only where the music needs more travel, the whale's cells over open water,
and the arcade's score pops drawn (a stock score's `scores` lists the worlds
whose pops show). Its rails are breath rather than padding: two lead the
show in before the balloon, one leads the Arcade in and one leads it out to
the ticket, and single rails sit between pieces after a long run of them;
none counts as a repeat. It closes at 297.3s, so only the recording's last
resonance plays over the finished machine. A change to any stock piece's
lane, or a piece in or out of a world, means rearranging it and running
`generate:clair` again.

`cornfield-chase/grok47` is a private tech demo for Hans Zimmer's Cornfield Chase, not part of the public catalog tour. `npm run generate:cornfield` writes it from stock lanes: Forest for the piano, one portal on the drop, then the Arcade on the chase pulse. The recording is copyrighted. See `apps/rube/src/shows/versions/cornfield-chase/ARRANGEMENT.md`.

`metronome/` is not in the picker. It is a worked example of a time map: a
procedural machine under a steady beat, and a struck bar on every strike,
made in the page. `check:shows` still walks that module. It is not a show.

`come-recover/opus55-all-at-once` (in the picker, **Everything**, one take,
**Opus 5.5**) is a one-shot Opus 5.5 take on Son
Lux's *Come Recover (Empathy Fight)*, the finale cue of *Everything Everywhere
All at Once*. The recording is copyrighted and demo only
(`apps/rube/src/shows/versions/come-recover/ATTRIBUTION.txt`). Every piece is new. The show
lives in `come-recover/all-at-once/`, built on the same kit as Liftoff: each
part is handed a slot and builds its lane from timed waypoints, so its strikes
land by construction on the onsets and 150 bpm combs that
`scripts/shows/eeaao-onsets.py` measured into `scripts/shows/plans/eeaao-onsets.json`.
`show.ts` is a multiverse: one ball on one path cut into legs, one world a leg.
At a verse-jump the ball moves to the next world's cells and the camera moves
with it by the same amount at the same instant, so on the screen the ball
holds still while the world round it changes: a match cut. `check:shows` holds
every strike to the onset file, every jump to a match cut, the family (Joy and
Waymond) to coming and going only out of shot or at a jump, and the end
credits, which the page sets from `Performance.titles(t)`. The report is
`apps/rube/src/shows/versions/come-recover/ALL_AT_ONCE.md`.

`clair-de-lune/take-b` is a separate arrangement generated by `generate:clair:b`
from `scripts/shows/plans/clair-b.json`. It keeps Take A's recording, offset,
phrase landmarks and world cadence targets. Regular and Aqua have no repeated
machines; Forest repeats windchime and frog, and Arcade repeats hoops and
bumper. Those four answers sit in AA or ABA groups, ignoring rails, with
different stock placement colors. Short stock rails give the machines more space, while lifts, drops and
turns fold the route into vertical layers. The last machines are the
photobooth and ticket, with four rails between them and two returning under
them to the portal. The payout uses this take's accumulated Arcade points;
older takes keep their saved payouts. The camera settles on the photograph
and ticket, and the final portal leaves that shot visible through the resonance. The full cue comparison and ordered routes are generated
in `apps/rube/src/shows/versions/clair-de-lune/TAKE_B_ARRANGEMENT.md`. `check:clair:b` checks stock lanes,
map handoffs, motif placement, native colors, cue precision and the whale's
open water. Generating Take B never writes Take A's plan, score or report.

`cornfield-chase/grok47` (Grok 4.7; its code is `tech-demo.ts`) is the music-sync take
that stays in the picker, beside the Opus one. `cornfield-chase/multiball`
and `cornfield-chase/voices` are not in the picker. All three are one-shot
tech demos of Hans Zimmer's Cornfield Chase, not finished public Shows. The
recording is copyrighted; the credit stays in
`apps/rube/src/shows/versions/cornfield-chase/ATTRIBUTION.txt`.

`cornfield-chase/opus55` (Opus 5.5; its code is `opus55-music-sync.ts`) is a separate
one-shot eval take on the same recording, generated stock only by
`npm run generate:cornfield:opus55`. Its targets are measured rather than
assumed: `scripts/shows/cornfield-opus55-onsets.py` reads the recording once and
writes `scripts/shows/plans/cornfield-opus55-onsets.json`, which holds the
piano's notes, the organ's onsets and the chase's 96.0 bpm comb (0.625 s, every
beat and eighth within a few ms). The generator only places a stock piece where
its `lane.fire` lands on one of those targets, and a lattice search pays for
every chase downbeat, beat and eighth left unstruck. The Forest carries the
piano, a shooter flies on the drop through the portal, and the Arcade strikes
the pulse. The booth flashes on the last phrase and the ticket pays on the last
hit. `check:shows` measures every saved strike against the onset file again.
The report is `apps/rube/src/shows/versions/cornfield-chase/OPUS55.md`.

`cornfield-chase/multiball` paints four riders on one garden. `ShowPoint.balls`
is set, so the stage draws those riders instead of the single thread. They
join on phrase accents and ease back onto the path at the exit portal.

`cornfield-chase/voices` is not a stock arrangement. One hero ball plays a
dense arpeggio while a ghost actor strikes a slower bass on the same
horizontal progress. Targets wake before the hit, and ink rings fade where
the hits landed. The clip starts about 70s into the recording and runs 48s.
The arrangement note is `apps/rube/src/shows/versions/cornfield-chase/VOICES.md`.

`interstellar/opus55` (in the picker, **Voyage**) is its own work: two cues of the
score, Cornfield Chase and then No Time for Caution, so it is not a take of
Cornfield Chase, and its one take carries no subtitle (the panel shows the
title alone when the label repeats it). Every piece is new. It is not a
stock arrangement: two worlds made for it, a farm in the dust years and the
dark past it, and a rocket between them in place of a portal. The show lives
in `interstellar/liftoff/`. `show.ts` holds two universes on one clock
that share cells, and the stage changes universe while the rocket is inside
the cloud. Each part is handed a slot (the time the ball arrives, the time
it leaves, the onsets it must strike) and builds its lane from timed
waypoints, so its strikes land on the measured onsets in
`scripts/shows/plans/cornfield-opus55-onsets.json` by construction.
`liftoff/hits.ts` gathers every strike, and `check:shows` measures each one
against the onset file. The check also asserts that the ball never jumps,
and that it is never hidden for long. Two more balls keep him company, as in the film: blue Dr. Amelia Brand
(the hero, Cooper, has the farm and drives the truck) and, on Cooper
Station, slate old Murph. Parts show them through `Built.company` spans
(show time, part frame, `who`), and the check holds them to the story: Brand
not on the farm, with him from NASA's bunker to the ring, waiting in orbit,
and at her camp on Edmunds' planet, where they meet at the end; Murph only in
the far-side house, where she sends him on; neither ever jumping, and each
coming and going only out of shot. It ends with credits after the music, in silence: the words are set
by the page from `Performance.titles(t)` (a show's canvas sets no type), and
the starlight they come out of is the canvas's. The report is
`apps/rube/src/shows/versions/interstellar/INTERSTELLAR.md`.
It has a second act on a second cue, Zimmer's *No Time for Caution*, also demo
only: the show plays one mix of the two (`apps/rube/src/shows/versions/interstellar/interstellar-liftoff-mix-demo.mp3`,
built by `scripts/shows/liftoff-mix.sh`), Cornfield Chase untouched and then the second cue
from its bar-26 accent. Act II's strikes are held to that cue's measured organ pulse
(`scripts/shows/liftoff-ntfc-onsets.py` → `scripts/shows/plans/liftoff-ntfc-onsets.json`).

`la-la-land/opus5-5` (in the picker, **Opus 5.5** under **Epilogue**) is a one-shot take on
Justin Hurwitz's *Epilogue* from La La Land, and then *The End*, 510 s in all.
Every piece in it is new, and so are its places: Seb's club, Lipton's, a
theatre, a white studio and a painted Hollywood, an audition in shadow play, a
globe, a Paris jazz club, painted Paris and the stars, a home movie, the drive,
and Seb's again, with the city of stars round it at both ends. The code is
`la-la-land/sebs/` (a Liftoff-style kit: parts built to timed slots, company
balls, an authored camera, covers that the stage changes place under). The mix
is built by `scripts/shows/sebs-mix.sh` and measured once by `scripts/shows/sebs-onsets.py`
into `scripts/shows/plans/sebs-onsets.json`; `check:shows` holds every strike
against it (`apps/rube/checks/sebs.ts`). The recordings are copyrighted and
demo only: `apps/rube/src/shows/versions/la-la-land/SEBS_ATTRIBUTION.txt`. The whole story is in
`apps/rube/src/shows/versions/la-la-land/SEBS.md`.

`la-la-land/fable5-1` (in the picker, **Fable 5.1** under
**Epilogue**) is Justin Hurwitz's *Epilogue* from La La Land, demo
only (`apps/rube/src/shows/versions/la-la-land/EPILOGUE_ATTRIBUTION.txt`), played whole from its
first sample, with every piece new. The show lives in `la-la-land/epilogue/`,
built on the same kit as Liftoff: `show.ts` holds three universes on one
clock that share cells (the real club, the dream as the club's own stage
dressed in painted flats, and the club again where the dream's last set is
struck), and the stage changes universe on the kiss and on the drop out of
the peak. Each part is handed a slot and builds its lane from timed
waypoints, so its strikes land on the measured onsets in
`scripts/shows/plans/lalaland-epilogue-onsets.json` (measured once by
`scripts/shows/lalaland-epilogue-onsets.py`: the piano's notes, the swing's, the
waltz's and the number's combs, and the free stretches' onsets) by
construction. `epilogue/hits.ts` gathers every strike, and `check:shows`
measures each against the file, holds the ball to one continuous path,
never hidden long, and holds Mia (the yellow ball, company) to the story:
at her table for the kiss, with him through the dream, at her table again at
the end, her husband only in the club at the end, neither ever jumping or
appearing in shot. The credits run over the last chords, set by the page
from `Performance.titles(t)`. The report is `apps/rube/src/shows/versions/la-la-land/EPILOGUE.md`.

`gymnopedie/opus55` (in the picker, **Gymnopédie**, one take, **Opus 5.5**) is Satie's Gymnopédie No. 1 and
Gnossiennes Nos. 1 and 3 round a small sea planet once a period, as a loop with no seam. It is the first show that
loops: `Performance.loop` and `SoundtrackSpec.loop`, a `Transport` that goes round, and a soundtrack that plays a
loop gaplessly from a decoded buffer at 1× (`soundtrack.ts`). The music is played for it by
`scripts/shows/satie-render.py` from the Mutopia Project's engravings on the Salamander Grand Piano's samples (CC BY 3.0),
rendered as one period of a circle, and every note as it lands is written to
`scripts/shows/plans/satie-performance.json`, which the show is timed to and `check:shows` holds it against
(`apps/rube/checks/gymnopedie.ts`). Each voice has one job: the melody the stones and the landings, the bass a swell
on the sea, the chords the light on the water, the phrasing the camera's breath; and the lamps the ball lights at dusk
and the flowers it opens under the moon stay lit and open until dawn, so the seam's wide shot is the planet ringed with
its night. The code is `gymnopedie/orbit/`. Licences:
`apps/rube/src/shows/versions/gymnopedie/ATTRIBUTION.txt`; the report is `apps/rube/src/shows/versions/gymnopedie/GYMNOPEDIE.md`.

`caravan/opus55` (in the picker, **Caravan**, one take, **Opus 5.5**) is "Caravan" from the *Whiplash* soundtrack
(Juan Tizol, Duke Ellington and Irving Mills, arranged by John Wasson), the film's finale and drum solo, played whole
from its first sample and demo only (`apps/rube/src/shows/versions/caravan/ATTRIBUTION.txt`), with the credits after
it in silence: 576 s. It tells the film in order over the recording, in three universes on one clock with a match
cut between each (`caravan/whiplash/show.ts`): Shaffer (the practice room, the studio band, "not quite my tempo",
the practice room at night), the road (the competition, the crash on the stop-time breaks), and Carnegie Hall (the
sabotage, the solo, the hush, the build, the rubato, the finale). Parts are built to timed slots on the Liftoff kit,
with company balls for Fletcher, his father and Tanner, and a director's clock for the people at Carnegie
(`carnegie/conductor.ts`). The tune is on a 280 bpm click; the solo is free, so it strikes the recording's strokes
drum by drum; the rubato strikes all 162 ride strokes one by one. The picture answers the strikes: the kit lights
on every stroke, Andrew's ball gives on every blow that turns him, and the camera punches in on 28 of the band's
biggest hits (`drums.ts` `strikeFlash`, `show.ts` `squash`, `score.ts` `PUNCHES`). Everything is measured once by
`scripts/shows/caravan-onsets.py` into `scripts/shows/plans/caravan-onsets.json`, and `check:shows` holds every strike
to it (`apps/rube/checks/caravan.ts`), with the people where the film has them and Fletcher's fist closing only on the
last cut-off. The report is `apps/rube/src/shows/versions/caravan/CARAVAN.md`.

`married-life/opus55` (in the picker, **Married Life**, one take, **Opus 5.5**) is Michael Giacchino's *Married
Life* from Up, whole, demo only (`apps/rube/src/shows/versions/married-life/ATTRIBUTION.txt`): the film's montage
of Carl and Ellie's life, told as one path cut the way the film cuts it. Every piece is new. The code is
`married-life/life/`, on the same kit as Liftoff and Epilogue (parts built to timed slots, an authored camera, the
end credits from `Performance.titles`), with Everything's legs and match cuts: four places come back (the church,
the house, the hill, the clinic), and at each cut Carl holds still on the screen while the place and the year change
round him. The stage draws no ball here: `life/cast.ts` draws Carl as a rounded square and Ellie round, and his
balloon at the end. The waltz does not keep one tempo, so `scripts/shows/married-life-onsets.py` tracks it beat by
beat (bars and their place in the bar) into `scripts/shows/plans/married-life-onsets.json`; `check:shows` holds
every strike to it (`apps/rube/checks/married-life.ts`). The report is
`apps/rube/src/shows/versions/married-life/MARRIED_LIFE.md`.

`merry-go-round/opus55` (in the picker, **Merry-Go-Round**, one take, **Opus 5.5**) is Joe Hisaishi's concert
arrangement of the *Merry-Go-Round of Life* from Howl's Moving Castle, whole, demo only
(`apps/rube/src/shows/versions/merry-go-round/ATTRIBUTION.txt`), and then the end credits in the quiet after it.
Every piece is new. It follows the film: Sophie the hatter (the one ball, whose colour is her age), the walk on
the air with Howl, the Witch's curse, Turnip Head, the castle that walks, Calcifer in the hearth, the colour dial on
the door, the flower fields, the war, the castle falling apart to one plank on legs, the heart given back, and the
castle made again, walking away up the sky. The code is `merry-go-round/howl/`, on the same kit as Liftoff and Epilogue (parts built to timed
slots, an authored camera, the end credits from `Performance.titles`), with Everything's legs and match cuts: four
places (the hatter's town, the wastes, the castle's room, the flower fields), each one set however often it is
visited, and nearly every cut a step through the castle's door. The arrangement changes pace from stretch to
stretch, so `scripts/shows/merry-go-round-onsets.py` tracks each stretch beat by beat (bars and their place in the
bar) into `scripts/shows/plans/merry-go-round-onsets.json`; `check:shows` holds every strike to it
(`apps/rube/checks/merry-go-round.ts`). The report is `apps/rube/src/shows/versions/merry-go-round/MERRY_GO_ROUND.md`.
`mountain-king/opus55` (in the picker, **Mountain King**, one take, **Opus 5.5 (A)**) is Grieg's *In the Hall of the
Mountain King* played whole by a chain reaction that grows with the music, from one pebble tipped at the trolls'
gate to the mountain's own machinery running away and the mountain coming down. It follows Ibsen: Peer Gynt (the
red ball) and the Woman in Green (the green ball, company) ride a great pig to the Dovre King's hall; the court
wakes, "Slay him!", the chase goes down through the mines, the trolls' drum and the mountain's heart; the bells, the
collapse, and Peer on the hillside at dawn. The trolls and the King are drawn, never balls. One place, one path, one
take: the mountain in cross-section (`mountain-king/dovre/`, a Liftoff-style kit whose `lay` can lay a part mirrored,
so the levels stack under the hall). The recording is the Czech National Symphony Orchestra's for Musopen, public
domain, so it ships with the show; the YouTube cue is the same recording, sample for sample. It is an accelerando, so
the beat is followed quarter note by quarter note (`scripts/shows/mountain-king-onsets.py` →
`scripts/shows/plans/mountain-king-onsets.json`), and `check:shows` holds every strike against it
(`apps/rube/checks/mountain-king.ts`). Licences: `apps/rube/src/shows/versions/mountain-king/ATTRIBUTION.txt`; the
report is `apps/rube/src/shows/versions/mountain-king/MOUNTAIN_KING.md`.
`mountain-king/opus55-spark` (in the picker, **Mountain King**, take **Opus 5.5 (B)**) is Grieg's *In the Hall of the
Mountain King* in the Czech National Symphony Orchestra's public-domain Musopen recording, whole, with the credits
after it in silence: 179 s (`apps/rube/src/shows/versions/mountain-king/ATTRIBUTION.txt`). A candle's flame slips off
its wick while the cat sleeps, and every fire is a door: out through the stove into a glassworks, a balloon regatta
at sunset and a runaway night express that ends at a fireworks festival, and home through every fire on the roll
before the last two chords. The code is `mountain-king/spark/`, on the Liftoff kit with Everything's legs and match
cuts (the doors are on phrases 6, 9 and 12, and on the roll's strokes); the stage draws no ball, `spark/fx.ts` draws
the spark and its flame. The accelerando from 104 to 198 bpm has no steady comb, so
`scripts/shows/mountain-king-onsets.py` tracked every quarter into `scripts/shows/plans/mountain-king-onsets.json`;
`check:shows` holds every strike to it (`apps/rube/checks/spark.ts`). The report is
`apps/rube/src/shows/versions/mountain-king/SPARK.md`.


`heptapod-b/opus55` (in the picker, **Logogram**, one take, **Opus 5.5**) is Jóhann Jóhannsson's *Heptapod B* from
*Arrival*, whole, demo only (`apps/rube/src/shows/versions/heptapod-b/ATTRIBUTION.txt`), and then the end credits in
the quiet after it. Every piece is new. It follows the film's spine as a circle: it opens in the lake house by the long
window, Louise (the orange ball) and her daughter Hannah (the little peach one), which the film lets us take for the
past; then the shell over the valley in Montana, the helicopter, the base, the scissor lift into the slot, the shaft
where gravity turns (the camera turns with it), the chamber and its glass, the heptapods coming out of the fog, a palm
on the glass, and their ink; through the glass she rides their logograms as tracks, and sees Hannah (the film's
flashes), and writes one herself; the shell goes to vapour; Ian (the blue ball) comes to her; and the last scene opens
on the show's first frame. The code is `heptapod-b/logogram/`, on the same kit as Liftoff and Merry-Go-Round (parts
built to timed slots, an authored camera with a roll, match cuts between four places, two of them inside a white-out,
the end credits from `Performance.titles`). The cue is one pulse that never changes pace (0.238715 s, 798 pulses from
6.76 s to 197 s) under loops of 7, 13 and 18 pulses, so `scripts/shows/heptapod-b-onsets.py` fits one comb and moves
every pulse onto its own attack, with the free murmurs' and the coda's onsets, into
`scripts/shows/plans/heptapod-b-onsets.json`; `check:shows` holds every strike to it (`apps/rube/checks/logogram.ts`).
The report is `apps/rube/src/shows/versions/heptapod-b/LOGOGRAM.md`.

`relax/opus55` (in the picker, **Magnum**, one take, **Opus 5.5**) is Frankie Goes to Hollywood's *Relax*, the
original 7", the song *Zoolander* makes a trigger of, whole, demo only
(`apps/rube/src/shows/versions/relax/ATTRIBUTION.txt`), and then the end credits in the quiet after it. Every piece is
new. It follows the film in five places: Derek (the steel-blue ball) loses Male Model of the Year to Hansel (the gold
ball); Mugatu (the ivory ball) pampers him down a car wash of a day spa and conditions him to strike at a crimson
target on every line of the song; the walk-off under the lasers, and Hansel's move that cannot be done; Derelicte,
where the song is played, Derek marches on the Prime Minister (the crimson ball), Hansel climbs the DJ's tower and
pulls the plug as the band stops dead, and Derek stops Mugatu's throwing star with a look, Magnum, on the splash out
of the silence; and the Derek Zoolander Center for Kids Who Can't Read Good, a center for ants made three times bigger
three times. The code is `relax/magnum/`, on Logogram's kit (parts built to timed slots, an authored camera, match
cuts between places, three of them inside a press camera's flash, the end credits from `Performance.titles`). The
song runs on a drum machine, so `scripts/shows/relax-onsets.py` fits one comb (115.405 bpm) and moves every beat and
off-beat onto its own attack, with the free onsets of the intro, the drop and the tail, into
`scripts/shows/plans/relax-onsets.json`; `check:shows` holds every strike to it (`apps/rube/checks/magnum.ts`). The
report is `apps/rube/src/shows/versions/relax/MAGNUM.md`.

`bolero/opus55` (in the picker, **Ostinato**, on the Machine shelf, one take, **Opus 5.5**) is Ravel's *Boléro*, whole,
as one machine that grows with it: a tower of storeys standing on a single side drum, a storey for each pair of the
tune's eighteen statements (A A B B four times, then one each for the last A and B), each wider than the one under it.
The recording is Omega13a's, made in MuseScore 4 with Muse Sounds from Ravel's score and released on Wikimedia Commons
under CC BY 4.0, so it ships with the show (`apps/rube/src/shows/versions/bolero/ATTRIBUTION.txt`); it keeps the
score's tempo from the first bar to the last, so the whole piece is one comb, measured once by
`scripts/shows/bolero-onsets.py` into `scripts/shows/plans/bolero-onsets.json` with both themes note by note from the
1929 Durand score. The drum is played by a wheel with the rhythm on its rim as pins, all 169 times; each storey is one
loop of keyed rails, a key for every note, and the ball plays each statement by rolling once round a storey, climbing
between them on a lift that steps on the drum's strokes; each storey's engine is let in on its second statement and
runs from then on, so by the end ten engines play under the tune, and from the ninth statement the storeys below play
along with it. E major is a gold roof the ball climbs a beat at a time; on the collapse the tower splits down its mast
and falls away round the drum, and the ball lands on the drum head on the last chord. The code is `bolero/tower/`;
`check:shows` holds every strike to the comb (`apps/rube/checks/ostinato.ts`). The report is
`apps/rube/src/shows/versions/bolero/OSTINATO.md`.

`nature-of-daylight/opus55` (in the picker, **Palindrome**, one take, **Opus 5.5**) is Max Richter's *On the Nature of
Daylight*, the *Blue Notebooks* recording that *Arrival* opens and closes on, whole, demo only
(`apps/rube/src/shows/versions/nature-of-daylight/ATTRIBUTION.txt`), and then the end credits in the quiet after it.
Every piece is new. It tells the whole film in order, and ends on its own first frame: the lake house at dawn, Louise
(the gold ball) and baby Hannah (the rose ball, who grows); the swing by the lake; the bed by the window, where Hannah
goes on the lament's swell; the television at night, whose picture of a shell becomes the real one over Montana on the
double bass (a match cut on the shell); the camp, the chamber and the glass, the heptapods, contact and the language;
the world's twelve links falling like dominoes when the bass drops out; the bomb; the fog beyond the glass, where she is
shown Hannah grown; the gala years on, where General Shang (the red ball) tells her what to say; the call, on the
loudest bars, when the dominoes stand again in the order they fell, backwards; the shell going up the way it came
down; daylight; Ian (the blue ball); and home. The code is `nature-of-daylight/palindrome/`, on the same kit as Logogram
(parts built to timed slots, an authored camera, match cuts between six places, a white-out, the end credits from
`Performance.titles`). The playing is free (a beat is 0.87 to 1.1 s), so `scripts/shows/nature-of-daylight-onsets.py`
tracks the beats one by one and finds every change of chord from the harmony itself, into
`scripts/shows/plans/nature-of-daylight-onsets.json`; `check:shows` holds every strike to it, nearly every change of
chord to a strike, and the palindromes to their mirror (`apps/rube/checks/palindrome.ts`). The report is
`apps/rube/src/shows/versions/nature-of-daylight/PALINDROME.md`.

`time/opus55` (in the picker, **Kick**, one take, **Opus 5.5**) is Hans Zimmer's *Time*, the last cue of *Inception*,
whole, demo only (`apps/rube/src/shows/versions/time/ATTRIBUTION.txt`), and then the end credits in the dark after it.
Every piece is new. It tells the film after *Inception* as one machine: limbo's shore and the top that never stops; the
architect's lesson in Paris, where the street folds over; the plane and the silver case; and then **the dream as one
world stacked four levels deep** (the rain city, the hotel, the snow fortress, limbo, the dark of sleep between them),
which Cobb (the orange ball) sinks down through on the cue's layers, lets Mal go at the bottom of, and is kicked back up
through on the summit's four hardest downbeats, one column of kicks; each level's set runs on its own clock, twenty
times slower a level above him, so the van hangs off the bridge for the whole climax. Awake on the plane, home, the
children turn, the top wobbles, and the picture cuts to black on the last chord. The code is `time/kick/`, on Magnum's
kit (parts built to timed slots, an authored camera with a roll, match cuts between worlds, the end credits from
`Performance.titles`) with `kick/stack.ts` for the stacked world. *Time* is one four-chord loop on a click, so
`scripts/shows/time-onsets.py` fits one comb (63.01 bpm) and moves every beat and off-beat onto its own attack, with
the turns, the layers' downbeats and the free onsets, into `scripts/shows/plans/time-onsets.json`; `check:shows` holds
every strike to it (`apps/rube/checks/kick.ts`). The report is `apps/rube/src/shows/versions/time/KICK.md`.
