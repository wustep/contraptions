# Mountain King, Spark

Open it at `/shows/?show=mountain-king&take=opus55-spark`. In the Shows picker it is **Spark**, a take of the work **Mountain King**. Directed by Claude Opus 5.5.

## What it is

A Rube Goldberg machine plays Grieg's *In the Hall of the Mountain King*, whole, then runs its credits in silence. 179 s in all.

A candle's flame slips off its wick while the cat sleeps by the stove. It knows that every fire is a door. It goes into the stove and comes out of a glassworks' glory hole, rides the glassmaking out through the furnace into a balloon regatta at sunset, climbs the balloons and drops out of the top burner into the smokestack of a night express loaded with fireworks. The train runs away with it, faster and faster with the music, to the festival at the end of the line, where it sets off the finale. In the silence after, it lies in the ash all but out. On the roll it flares and dashes home back through every fire, lands on its wick on the first of the two last chords, and on the second the stove door bangs shut behind it. The cat's eye snaps open. It looks up at the candle, which is burning the way candles do, and goes back to sleep.

The brief asked for something with no mountain, cave, mine, troll, hall or Peer Gynt in it, for new worlds joined by portals, and for new mechanics. Here the portals are fires, which gives every world a reason to exist (it has a fire), a colour for its door, and a motivated match cut (into one flame, out of another). The music is mischief: a tiptoe, a runaway, a crash, a held breath, two blows. A small careful thing that sneaks out for the night and gets home by the last chord has that shape, and a stranger can read it from pictures.

**The cast.**
- **Spark**, the only ball (`#F2A33A`). Its heart and its flame are drawn in `spark/fx.ts`, not by the stage. The flame grows with the orchestra, from a candle's flicker in the loft to a comet on the express. In the silence it is an ember gone to ash, and on the first last chord it is a candle's flame again.
- **The cat**, a grey tabby, drawn and never a ball. It sleeps by the stove the whole show. It flicks an ear when the drying rack's candles knock, twitches its tail, shifts in its sleep, and wakes on the last chord.

## The worlds, in order

Each world has its own palette, materials and gravity (`spark/worlds.ts`, `spark/physics.ts`), and each is a hotter, faster kind of fire than the last. None is one of Machine's worlds or any other show's.

| Time (s) | World | What happens |
| ---: | --- | --- |
| 0 | The chandler's loft, at night | The whole loft in the dark: the candle on the bench, moonlight through the skylight, the cat by the stove. The camera eases in on the candle during the horns. |
| 6.71 | The sneak (LOFT-A) | The flame hops off its wick into a hanging brass pan and the candle goes out. From here the spark is the only warm light, and every set lights itself by it. A windlass lets the pan down a ratchet notch a note. Tiptoes along the bench, a hop over a coil of wick, a balance that sinks under it, a latch that lets a snuffer bell swing down onto the other pan, and the balance flings it onto the drying rack. It walks the rack's pole like a tightrope. On 25.653 and 28.961 two candles knock together, the cat's ear flicks, and the spark freezes, all in one wide frame. |
| 31.19 | The wheel, the cat, the stove (LOFT-B) | A dipping wheel lowers it a ratchet click a strong note to the ladle and the floor. It tiptoes toward the cat, hops the tail when it twitches (42.455), climbs onto the tail and along the sleeping back. The cat stretches in its sleep (51.384) and tosses it up, and the stove's draught carries it to the latch. The firebox door creaks open on 52.504 and floods the room red-gold. Two held bars on the sill, the camera closing in, then the leap into the fire. |
| 58.02 | The glassworks, by day | Out of the glory hole into a whitewashed glasshouse with no one in it. It lands in the molten gather on a blowpipe, whose weight tips the blowing cart down its rail; the wheel's crank works the bellows a puff a note. The gather droops into an iron mould that slams shut on 64.368, hisses, and opens like a book. The bottle rides the annealing lehr over three fires, cooling from orange to green and pinging at each. Then up a rack of seven tuned bottles on the B phrase's big notes, and a demijohn flings it into the furnace port. |
| 82.05 | The balloon regatta, at sunset | Out of a burner's jet onto a balloon lying on the grass. Its burner roars, it heaves up and stands, and on the big blast the spark goes up the jet, the tether lets go and the balloon lifts. Then the same machine three more times, faster each time, up a stair of balloons. In phrase 11 the whole regatta rises into the sunset: the widest shot of the show, every far burner firing on 99.322. On the great blast (100.826) it is drawn into the top burner. |
| 101.95 | The night express | Fortissimo. Out of the smokestack on the first chuff in a fountain of sparks, and the train lurches off. Onto the dome, tossed by the safety valves, along the running board, then a tour of the motion, one move a backbeat: crank pin, coupling rod, main rod, crosshead. The wheels turn with the beat, so the train speeds up exactly as the music does. The whistle screams on the B phrases as the train crosses a trestle against the moon. The ashpan swallows the spark, it comes out of the chimney, the brakes throw sparks from every wheel, and at the buffer stops the train flings it into the festival. |
| 124.01 | The festival | It runs the quick-match along four mortar racks, each firing its comets on a backbeat, rides a gerb's fountain, and runs the Niagara wire as each length catches and pours gold. On the coda's first chord (134.254) it comes down on the finale's master fuse. The heavy chords are the biggest shells, a Catherine wheel spins it and flings it off, it climbs the burning fuse of the Titan mortar and rides its blast into the biggest burst of the show (144.840). The six hammer blows are six salutes round it as it falls. |
| 147.0 | The silence | It lies all but out by a burning crate. Smoke drifts across the moon and embers fall. |
| 148.24 | The roll, the dash home | It flares and darts into the crate's fire. On the roll's strokes it goes back through the fires it came by, a few frames each: a balloon burner (148.330), the glory hole (148.404), and out of the loft stove (148.491). |
| 149.52 | Home | It lands on its wick on the first last chord. On the second the stove door bangs, the cat's eye snaps open, it lifts its head toward the candle, blinks, and tucks back down. The camera draws back to the whole loft in the dark and the credits come up over the roof. |

## The doors

A door is a match cut on the spark. The part going out closes in until its fire fills the frame round the spark, and the part coming in opens on its own fire at the same framing and pulls out. The camera carries the framing across the cut, so the spark holds its place on the screen while the world round it changes (`spark/show.ts` shifts the camera by exactly the jump in cells). Over the cut `fx.ts` lays a veil of fire that sweeps across the frame against the way the spark is going, so the camera seems to fly through a flame with it. The veil turns from the old world's fire colours to the new one's (`FIRES`): the stove's ember red, the furnace's white-gold, the burner's blue and gold, the engine's coal orange.

The three doors out are on phrase starts: 58.024 (statement 2), 82.053 (phrase 9) and 101.951 (statement 3). The three doors home are on the roll's strokes and last a few frames each, with only a flash of fire at the cut, so the regatta and the glassworks are seen going past.

## The music

- **The recording.** The Czech National Symphony Orchestra's public-domain Musopen recording, 154.091 s, shipped whole in `grieg-mountain-king-musopen.mp3`. The soundtrack also plays the orchestra's label upload from YouTube (`k8HCJS4FflY`, the same recording sample for sample, offset 0); the file is the fallback and what export uses. `ATTRIBUTION.txt` covers the recording and is shared with the other take of this work, so it names that take's file and story. Spark's story is its own.
- **The clock.** `scripts/shows/mountain-king-onsets.py` measured the recording once into `scripts/shows/plans/mountain-king-onsets.json`, shared with the other take and never edited here. It holds every quarter note of the theme (the accelerando from 104 to 198 bpm has no steady comb, so every quarter was tracked), the eighteen phrases (A A B B A A three times), the coda's 23 chords, the silence at 147.0, the roll at 148.243 and the two last chords at 149.515 and 149.815. `spark/music.ts` reads it: `beat(k)` is quarter k's show time, `phrase(n)` phrase n's first note.
- **What strikes.** In statements 1 and 2 the strong notes are bar 2's two figures and the downbeat. In statement 3 the whole band hits the backbeats, so the express and the festival strike those. The coda strikes its heavy chords. 186 strikes in all, every one on a measured onset or an eighth of the tracked beat.

## Craft notes

- **The loft is lit by the spark.** Once the candle goes out, everything near the spark is lit and everything far from it is in moonlight or dark (`sparkIn` in `fx.ts`). That is how the loft reads as a loft at night, and how the spark reads as the light.
- **The stage draws no ball.** `SparkShow.at` hands the stage an empty list of balls, and `fx.ts` draws the spark's heart as the first thing in each world's `over` pass. So it is a flame's heart with a soft gradient: no ink ring, no spinning dot, and no trail of beads behind it on the train. Pan lips and sockets drawn over it still cover it.
- **The flame leans back from the motion.** It is sampled from the spark's velocity over the last 40 ms, and it grows with the recording's loudness (`heat`).
- **The express keeps time with its wheels.** The wheels' turn is locked to `beat(k)`, so a quarter of a turn is always a quarter note however fast the music gets.
- **Nothing ball-sized near the hero.** The glory hole is an arched mouth on a sill, not a round port. The steam at the buffer stops is a soft wide sigh, not white puffs. Firework bursts are streaks and falling trails.
- **The ending waits for the cat.** The credits start at 154.2, after the cat has looked and gone back to sleep. They sit in the dark over the roof, and the camera frames the whole loft so the candle is below them with all its light.
- **Known weaknesses.** In the knock wide (25 to 29 s) the spark is small, about 1.5% of the frame's height. It reads because it is the only warm light. The balloon stair (89 to 96 s) repeats the same framing three times on purpose. At the buffer stops the camera follows the thrown spark up, so the impact is at the bottom of the frame.

## How it is built

- `mountain-king/opus55-spark.show.ts`: the version file. Everything with weight is behind `load()`.
- `mountain-king/spark/`: the director's files. `score.ts` (the order of legs and parts, the sets, the camera per leg carried across each door, the punches), `show.ts` (`SparkShow`, one ball through four worlds), `kit.ts` and `camera.ts` (the part contract and the director, after Liftoff and All at Once), `music.ts`, `seams.ts` (every seam's velocity and camera distance), `physics.ts`, `worlds.ts`, `fx.ts` (the spark, its flame, the veil), `credits.ts`, `hits.ts`, `dash.ts`, `loft/layout.ts` and `loft/home.ts`.
- The parts, one folder a world:
  - `loft/`: `set.ts`, the room; `sneak*.ts`, LOFT-A; `stove*.ts`, `hearth.ts` and `cat.ts`, LOFT-B.
  - `glass/`: `glassworks.ts` and `glass-*.ts`.
  - `regatta/`: `balloons.ts` and `balloons-*.ts`.
  - `railway/`: `night.ts`, the shared night; `express*.ts`; `fireworks*.ts`.
- `apps/rube/checks/spark.ts`, run by `npm run check:shows`, holds the picker names, the recording and its YouTube cue, the world order, the doors on their phrases, the dash on the roll's strokes, no jump inside a world (0.04 cells a millisecond), every door a match cut on the screen (1% of the frame a millisecond), the spark on its wick at the start and from the first last chord on, every strike on the music (±35 ms of an onset or ±30 ms of a grid eighth), every heavy coda chord and both last chords struck, nothing in the silence, the spark in frame under Zoom, never hidden more than 2.5 s, one ball, and the credits' words.
- The share card is `public/shows/mountain-king/opus55-spark.png`, the trestle crossing at 116.4 s.

## How to run it

- `npx vite --port 8971 --strictPort`, then open `/shows/?show=mountain-king&take=opus55-spark`.
- `npm run check:shows` for the show's checks; `npm run build` runs every check and the site build.
- The card: `npm run cards` with a dev server up redraws every take's card. Nothing else needs regenerating: the onsets file is measured once, and the mp3 is the recording as downloaded (`scripts/shows/mountain-king-cue.sh`).
