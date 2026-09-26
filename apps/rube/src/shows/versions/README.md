# Versions

A show is a piece of music and a machine choreographed to it. One file is one
version of one show:

```
versions/<work>/<take>.show.ts
```

`<work>` is the music (`clair-de-lune`), `<take>` is this run at it (`take-a`),
both in lower case and hyphens. Drop the file in and it is in the picker at
`/shows/`, grouped with the other takes of the same work, in file order.
Nothing else keeps a list. A link to it is `/shows/?show=<work>&take=<take>`.
`/shows/` with no work opens Clair de Lune, Take B.

Keep two takes of the same music side by side for as long as you like; they
share nothing unless you make them share it. To combine them later, write a
third.

## The file

```ts
import { defineShow } from '../../registry'
import recording from './goedhart.mp3'

export default defineShow({
  title: 'Clair de Lune', // the same in every take of this work
  label: 'Take A',
  note: 'One line on what this take is trying.',
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

## What is here

The picker is the `.show.ts` files. Off that list, and so not in Shows: Clair de Lune Take A, Première Arabesque Take A, the metronome, and the Cornfield Chase takes that are not music-sync (multi-ball and trails). Clair Take B, Première Take B, Interstellar (its own work; it was the Liftoff take of Cornfield Chase), the two Cornfield Chase music-sync takes, and Come Recover's All at Once stay. The scores and checks for the takes that left the picker are still on disk.

`premiere-arabesque/take-a` is a real show: Debussy's Première Arabesque to
Patrizia Prati's recording, the machine walking Regular, Forest, Aqua,
Arcade. The version file only names it. The score, `PremiereShow`, camera
and soundtrack live in `apps/rube/src/timed/premiere-arabesque/` and are
fetched from `load()`.

`premiere-arabesque/take-b` and `clair-de-lune/take-a` are full stock-timing
arrangements with four long maps. Their explicit piece orders live in
`scripts/show-plans/`. `generate:premiere:b` and `generate:clair` compile
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

`cornfield-chase/tech-demo` is a private tech demo for Hans Zimmer's Cornfield Chase, not part of the public catalog tour. `npm run generate:cornfield` writes it from stock lanes: Forest for the piano, one portal on the drop, then the Arcade on the chase pulse. The recording is copyrighted. See `docs/promo/CORNFIELD_CHASE_ARRANGEMENT.md`.

`metronome/` is not in the picker. It is a worked example of a time map: a
procedural machine under a steady beat, and a struck bar on every strike,
made in the page. `check:shows` still walks that module. It is not a show.

`come-recover/opus55-all-at-once` (All at Once, with a faint "Directed by
wustep" byline from `ShowVersion.director`) is a one-shot Opus 5.5 take on Son
Lux's *Come Recover (Empathy Fight)*, the finale cue of *Everything Everywhere
All at Once*. The recording is copyrighted and demo only
(`docs/promo/EEAAO_COME_RECOVER_ATTRIBUTION.txt`). Every piece is new. The show
lives in `come-recover/all-at-once/`, built on the same kit as Liftoff: each
part is handed a slot and builds its lane from timed waypoints, so its strikes
land by construction on the onsets and 150 bpm combs that
`scripts/eeaao-onsets.py` measured into `scripts/show-plans/eeaao-onsets.json`.
`show.ts` is a multiverse: one ball on one path cut into legs, one world a leg.
At a verse-jump the ball moves to the next world's cells and the camera moves
with it by the same amount at the same instant, so on the screen the ball
holds still while the world round it changes: a match cut. `check:shows` holds
every strike to the onset file, every jump to a match cut, the family (Joy and
Waymond) to coming and going only out of shot or at a jump, and the end
credits, which the page sets from `Performance.titles(t)`. The report is
`docs/promo/COME_RECOVER_ALL_AT_ONCE.md`.

`clair-de-lune/take-b` is a separate arrangement generated by `generate:clair:b`
from `scripts/show-plans/clair-b.json`. It keeps Take A's recording, offset,
phrase landmarks and world cadence targets. Regular and Aqua have no repeated
machines; Forest repeats windchime and frog, and Arcade repeats hoops and
bumper. Those four answers sit in AA or ABA groups, ignoring rails, with
different stock placement colors. Short stock rails give the machines more space, while lifts, drops and
turns fold the route into vertical layers. The last machines are the
photobooth and ticket, with four rails between them and two returning under
them to the portal. The payout uses this take's accumulated Arcade points;
older takes keep their saved payouts. The camera settles on the photograph
and ticket, and the final portal leaves that shot visible through the resonance. The full cue comparison and ordered routes are generated
in `docs/promo/CLAIR_TAKE_B_ARRANGEMENT.md`. `check:clair:b` checks stock lanes,
map handoffs, motif placement, native colors, cue precision and the whale's
open water. Generating Take B never writes Take A's plan, score or report.

`cornfield-chase/tech-demo` ([Grok 4.7] Music-sync) is the music-sync take
that stays in the picker, beside the Opus one. `cornfield-chase/multiball`
and `cornfield-chase/voices` are not in the picker. All three are one-shot
tech demos of Hans Zimmer's Cornfield Chase, not finished public Shows. The
recording is copyrighted; the credit stays in
`docs/promo/CORNFIELD_CHASE_ATTRIBUTION.txt`.

`cornfield-chase/opus55-music-sync` ([Opus 5.5] Music-sync) is a separate
one-shot eval take on the same recording, generated stock only by
`npm run generate:cornfield:opus55`. Its targets are measured rather than
assumed: `scripts/cornfield-opus55-onsets.py` reads the recording once and
writes `scripts/show-plans/cornfield-opus55-onsets.json`, which holds the
piano's notes, the organ's onsets and the chase's 96.0 bpm comb (0.625 s, every
beat and eighth within a few ms). The generator only places a stock piece where
its `lane.fire` lands on one of those targets, and a lattice search pays for
every chase downbeat, beat and eighth left unstruck. The Forest carries the
piano, a shooter flies on the drop through the portal, and the Arcade strikes
the pulse. The booth flashes on the last phrase and the ticket pays on the last
hit. `check:shows` measures every saved strike against the onset file again.
The report is `docs/promo/CORNFIELD_CHASE_OPUS55.md`.

`cornfield-chase/multiball` paints four riders on one garden. `ShowPoint.balls`
is set, so the stage draws those riders instead of the single thread. They
join on phrase accents and ease back onto the path at the exit portal. The
clip is `docs/promo/cornfield-chase-multiball-demo.webm`.

`cornfield-chase/voices` is not a stock arrangement. One hero ball plays a
dense arpeggio while a ghost actor strikes a slower bass on the same
horizontal progress. Targets wake before the hit, and ink rings fade where
the hits landed. The clip starts about 70s into the recording and runs 48s.
The arrangement note is `docs/promo/CORNFIELD_CHASE_VOICES.md`, and the clip
is `docs/promo/cornfield-chase-voices-demo.webm`.

`interstellar/opus55` (Interstellar, with a faint "Directed by wustep" byline
in the panel from `ShowVersion.director`) is its own work: two cues of the
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
`scripts/show-plans/cornfield-opus55-onsets.json` by construction.
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
`docs/promo/INTERSTELLAR.md`.
It has a second act on a second cue, Zimmer's *No Time for Caution*, also demo
only: the show plays one mix of the two (`docs/promo/interstellar-liftoff-mix-demo.mp3`,
built by `scripts/liftoff-mix.sh`), Cornfield Chase untouched and then the second cue
from its bar-26 accent. Act II's strikes are held to that cue's measured organ pulse
(`scripts/liftoff-ntfc-onsets.py` → `scripts/show-plans/liftoff-ntfc-onsets.json`).

`la-la-land/opus55-sebs` (**Seb's**, "Directed by wustep") is a one-shot take on
Justin Hurwitz's *Epilogue* from La La Land, and then *The End*, 510 s in all.
Every piece in it is new, and so are its places: Seb's club, Lipton's, a
theatre, a white studio and a painted Hollywood, an audition in shadow play, a
globe, a Paris jazz club, painted Paris and the stars, a home movie, the drive,
and Seb's again, with the city of stars round it at both ends. The code is
`la-la-land/sebs/` (a Liftoff-style kit: parts built to timed slots, company
balls, an authored camera, covers that the stage changes place under). The mix
is built by `scripts/sebs-mix.sh` and measured once by `scripts/sebs-onsets.py`
into `scripts/show-plans/sebs-onsets.json`; `check:shows` holds every strike
against it (`apps/rube/check-sebs.ts`). The recordings are copyrighted and
demo only: `docs/promo/LA_LA_LAND_SEBS_ATTRIBUTION.txt`. The whole story is in
`docs/promo/LA_LA_LAND_SEBS.md`.

`la-la-land/fable51-epilogue` (Epilogue, with a faint "Directed by wustep"
byline in the panel) is Justin Hurwitz's *Epilogue* from La La Land, demo
only (`docs/promo/LALALAND_EPILOGUE_ATTRIBUTION.txt`), played whole from its
first sample, with every piece new. The show lives in `la-la-land/epilogue/`,
built on the same kit as Liftoff: `show.ts` holds three universes on one
clock that share cells (the real club, the dream as the club's own stage
dressed in painted flats, and the club again where the dream's last set is
struck), and the stage changes universe on the kiss and on the drop out of
the peak. Each part is handed a slot and builds its lane from timed
waypoints, so its strikes land on the measured onsets in
`scripts/show-plans/lalaland-epilogue-onsets.json` (measured once by
`scripts/lalaland-epilogue-onsets.py`: the piano's notes, the swing's, the
waltz's and the number's combs, and the free stretches' onsets) by
construction. `epilogue/hits.ts` gathers every strike, and `check:shows`
measures each against the file, holds the ball to one continuous path,
never hidden long, and holds Mia (the yellow ball, company) to the story:
at her table for the kiss, with him through the dream, at her table again at
the end, her husband only in the club at the end, neither ever jumping or
appearing in shot. The credits run over the last chords, set by the page
from `Performance.titles(t)`. The report is `docs/promo/LALALAND_EPILOGUE.md`.
