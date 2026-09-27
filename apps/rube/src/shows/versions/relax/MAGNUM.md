# Magnum

The recording is copyrighted. This take is a private tech demo only; do not ship this audio in a public build.
Nothing here claims any right to it.

The music is Frankie Goes to Hollywood's *Relax*, the original 7" (ZTT, 1983), the song *Zoolander* (Ben Stiller,
2001) makes a trigger of. The attribution is in `apps/rube/src/shows/versions/relax/ATTRIBUTION.txt`.

Open it at `/shows/relax/opus55/` (or `/shows/?show=relax&take=opus55`). In the Shows picker it is the work
**Magnum**, whose one take is **Opus 5.5**.

## What it is

A Rube Goldberg machine plays the song from its first sample, 3:54, and the end credits run on in the quiet after it:
4:23 in all. It is one ball on one path through five places, in the film's order.

- **Derek Zoolander** is the steel-blue ball (`#4C88C2`): Blue Steel, his look. He is the thread: every machine is
  his to go through, and nothing else in the show is his colour.
- **Hansel** is the gold ball (`#E3A83B`): his rival at the awards and the walk-off, his friend after, and at Derelicte
  the one who pulls the plug.
- **Jacobim Mugatu** is the ivory ball (`#F2ECDF`): he runs the spa's machine, plays the song at his show, and throws
  the star.
- **The Prime Minister of Malaysia** is the crimson ball (`#C0392F`), in the front row at Derelicte. In the spa the
  target is his colour.
- **The kids** at the Center are small balls in soft colours. Everyone else (audiences, the press, the walk-off's
  judge) is a silhouette in the dark.

The places:

1. **The awards**: a theatre at night, a runway out into the dark, Male Model of the Year.
2. **The day spa**: Mugatu's, black marble and brass, a car wash for models, and behind the steam a machine.
3. **The walk-off**: underground, concrete and smoke and lasers.
4. **Derelicte**: Mugatu's show in a raw warehouse, its runway, its front row, the DJ's tower.
5. **The Center**: the Derek Zoolander Center for Kids Who Can't Read Good, on a bright morning.

## The cue

**Why Relax.** In the film the song is the plot's machine: Mugatu conditions Derek so that "Relax" makes him try to
kill the Prime Minister, and it is played at the Derelicte show. A machine that runs on this song is the film's own
idea, and the song's shape is the film's climax:

- A drum machine's clock: one tempo, 115.405 beats a minute, beat *k* at 0.3603 + 0.519908·*k* s, from the pickup
  into the drums (beat 19, 10.246 s) to the last hit (beat 440, 229.118 s), strong beats within 3.5 ms (median) of the
  one comb. Four beats a bar; every section starts on a downbeat.
- Its arc: a drumless intro with two sung calls (5.1, 8.7); the drums on 10.746; the hook twice (27.4, 52.4); a sung
  call on the downbeat 71.071; a verse with a call and answer (83.6); a bare break with a spoken count-in and the
  title said (116.8, about 121.2); the surge (a wash of noise from 132.941); a last round of the hook; a breakdown
  rocking between two bars (170.9); and then **the whole band stops dead on 182.817**, a crash rings down to near
  silence, **a splash and a shout come out of the silence on 186.474**, and the band is back on 186.997. The finale's
  loudest bars, and a dead stop on the downbeat 229.118.
- That drop is the film's climax, as if it had been cut to it: Hansel pulls the plug on the DJ, Mugatu throws the
  star himself, and Derek stops it in the air with a look.
- Considered and refused: "Wake Me Up Before You Go-Go" (one scene, the gasoline fight, and it ends in the friends'
  deaths), the soundtrack album's cover of "Relax" (a weaker arc), "Let's Dance" (a cameo cue).

**The audio.** Fetched once from the label's upload (the Universal Music Group topic channel, `kpgRJSrfoic`, the
original 7" as released on *Debut Singles*) with a current yt-dlp, and re-encoded to mp3 with no edit and no gain
change (0 ms against the fetched stream): every onset is the recording's own. The show also plays that same upload
through the YouTube cue, on the same clock.

**Its clock.** `scripts/shows/relax-onsets.py` measured the recording once into `scripts/shows/plans/relax-onsets.json`:
- **The comb**, one period and phase fitted from the drums in to the end.
- **Every beat and every off-beat**, moved onto its own attack where one is within 30 ms (410 of the 422 beats have
  one), with how hard it is struck against the 32 beats round it and against the whole song.
- **Every free onset**, with its strength: the intro, the drop and the tail have only these.
- **The sections and the landmarks** (the calls, the drums, the wash, the stop, the splash, the band back, the end).
- **Loudness** every quarter second.
- A frame's spectral flux peaks while an attack is still a little ahead of its middle, so every time is moved on by
  18 ms, onto where the waveform starts to rise (checked on the 35 hardest beats).
- Where the voice is (the calls, the title in the break, the three calls in the finale) was read off a separated vocal
  stem, not a lyrics site (their times drift by up to a second).

## How it cuts

`magnum/show.ts` is a multiverse show on Logogram's kit: the path is cut into legs, one place a leg. At a cut the
ball moves into the next place's cells and the camera moves by exactly the same amount at the same instant, so on the
screen he holds still while everything round him becomes somewhere else: a match cut on Derek. `seams.ts` says his
velocity, the camera's distance and where Hansel and Mugatu are at every seam.

- **Three cuts in a press camera's flash** (`score.ts`, `FLASHES`): into the spa (27.394), into the club (83.552) and
  into the Center (202.095), each on a downbeat: the fashion world's own punctuation. White up in a tenth of a second,
  down over two thirds; the place changes where nothing can be seen.
- **One hard cut**, on the break's downbeat (116.820), the count-in: from the walk-off into the dark of Derelicte's
  wings.
- **The punches** (`PUNCHES` in `score.ts`): the camera pushes in at once and eases back over seconds on Blue Steel
  (5.126), the surge's wash (132.941), the plug (182.817) and, biggest of all, Magnum (186.474).

## In order

Times are show seconds; bar *n* is `bar(n)`, beat *k* is `beat(k)`.

| Time | Music | Place | What happens |
| ---: | --- | --- | --- |
| 0 | the intro: a pad, no drums | the awards | A theatre in the dark, a runway out into it, one follow spot. Derek strolls down the runway in it. |
| 5.126 | the first sung call | | **Blue Steel**: at the runway's end he stops and gives the look (the glint); the press pit fires a volley; the camera punches in. |
| 5.2 → 9.35 | the second call (8.679) | | The house comes up for him bank by bank (a spot, the trophy's lamp, the bulb walls). He goes back up the runway and up the podium's steps to the trophy, sure it is his. |
| 10.246 → 12.824 | the pickup; **the drums (10.746)** | | The truss lurches on the pickup; on the drums every spot swings off him to the far wings, the bulb wall goes dark behind him, the photographers' cameras turn over their heads to Hansel and fire as he rolls into the light; the trophy is flown across on its trolley and set down beside Hansel. Derek alone on the dark podium. |
| 12.8 → 25.3 | the groove | | Hansel's parade down the runway under the flown trophy, a flash on the downbeats; Derek backs down the steps into the dark of the wings. Mugatu glides out of the dark to him (25.310), and he startles. |
| **27.394** | the hook, round one | the day spa | *A photographer in the wings fires: a flash cut.* Mugatu shows him onto the line. |
| 28.4 → 52.4 | the hook's lines | | **A car wash for models**, a treatment a line under brass arches: the towel rollers, a trough of mud (he goes mud-brown), the teal rinse (back to steel blue), a slicer and two cucumber slices landing on him as eyes, the steam cabinet, a hot-towel turban, the dryer hood. The steam over the room drifts and thins as the vents open. |
| 52.356 → 64.8 | the hook, round two | | **The conditioning.** Into the recliner; Mugatu at his console pushes his lever over and the chair flings him across the room into a crimson target (the Prime Minister's colour) on the hook's line; he rolls back down the chute; again (53.395, 57.551, 61.713), each nearer the middle. |
| 65.342 → 66.648 | the fourth line | | Mugatu's hand comes off the lever and stays away; the chair stays latched; on the line Derek gathers and **springs by himself**, straight and exact, and hits. Mugatu's look. |
| **71.071** | the sung call, a crash | | A stiff ratchet of a wind-up on the fill, and dead centre: the target is knocked flat. Conditioned. |
| 73.7 → 83.552 | the breaks | | The big dryer comes down out of the ceiling and blows him down the robes, through the towel strips and out through the door into the night. |
| **83.552** | the verse | the walk-off | *A photographer outside fires: a flash cut.* Underground: concrete, smoke, a crowd, lasers. Hansel waits in the judge's lamp. |
| 85.6 → 95.5 | the verse | | **They trade moves**, each a mechanism of the floor: the pop plates (Hansel a double somersault), the laser gates (Hansel over two beams with a flip), the strut. |
| 96.0 → 101.7 | the call and answer | | Derek's move on each line, Hansel's higher echo on each answer; on the last line every laser swings down between them. |
| 102.267 | the bridge | | A grid of lasers drops from the ceiling onto Derek's nose: a spark, and he is thrown back. |
| 103.0 → 106.4 | | | **Hansel's move that cannot be done**: he rolls into the closed grid, stops dead in its middle with a look, and rolls out the far side with every beam whole. The lamp settles on him; the press fire. |
| 110.6 → 116.8 | | | Hansel comes to Derek, and they touch: friends. |
| **116.820** | the break: the count-in | Derelicte | *A hard match cut.* The dark of the wings at the runway's head; the needle drops on the record in the DJ's booth; the runway's banks come up on the break's beats. |
| 121.499 | the title said | | **Triggered.** Mugatu's lamp snaps onto him; the curtain of bin bags hoists; he marches out, a stiff step a beat, sharp starts and stops (the one undamped motion in the show). A hitch on "don't do it". |
| 132.941 → 139.1 | the wash, the surge | | The march becomes a stride down the runway, a beat a stride. |
| 139.1 → 156.3 | the ride | | A sequence cut on the downbeats: the whole hall (the runway's length, the Prime Minister at its end, the tower); **Hansel** at the tower's foot, seeing him (141.253); Derek close, travelling, a press camera flashing in his face on the downbeats; **Mugatu** on his perch, shimmying with delight, his lamp on Derek; Derek; **the Prime Minister** in the front row, oblivious, applauding; Derek to the runway's end, where he does not turn back. |
| 156.341 → 170.9 | the hook, a last round | | Down the steps on the beats, across to the Prime Minister. Hansel bounces on the bass bin at the tower's foot and its kick throws him up the shaft (160.503); he climbs; a rail gives and drops him the whole shaft (168.815). |
| 170.899 → 182.3 | the rock | | **The wind-up**: Derek rocks at the Prime Minister on every beat, bigger each time. The sub throws Hansel up again on the rock's downbeat; up the rails, into the booth (179.218); he takes the orange lead and tugs; the plug inches out. |
| **182.817** | the band stops dead | | **The plug**: torn out of its box with a spark; the show's lights die with the band; Derek stops dead mid-lunge. |
| 182.8 → 186.4 | the crash rings down | | In the dark, by the oil drums' fire: Mugatu comes to the runway's edge, heavy and slow, draws a throwing star and throws it (184.936); it spins down at Derek and the Prime Minister. |
| **186.474** | the splash out of the silence | | **Magnum.** A hard cut close: the look, the biggest glint in the show, the camera's hardest punch; the star stops dead in the air a hand's width from his face. The world holds. |
| 186.997 → 187.525 | the band back in | | The house lights clank on, flat and cold: the show is over. The star drops and sticks in the boards. |
| 188.1 → 197.9 | the outro | | The press turn on Mugatu; he backs into the canopy's upright, its hitch slips, and the net of bin bags he hung over his own show comes down on him: a lump. The Prime Minister rises and cheers. Hansel rides the gin wheel's bucket down from the booth. |
| 197.933 → 202.095 | | | Derek and Hansel side by side for the press, a look each. |
| **202.095** | the finale | the Center | *A photographer fires: a flash cut.* A bright morning, a lawn, and the sheeted model. |
| 204.174 | | | Derek bumps a bell-pull; the sheet goes up into a tree: a building, stately, in the morning. Then he comes up beside it (208.330): **it is smaller than he is.** A center for ants. |
| 215.1 → 220.3 | | | He follows the hose to a foot pump and tests it; hops on every hit of the drum fill; a leap. |
| **220.811, 221.322, 221.850** | three quick calls | | **Three times bigger, three times**: a stomp on each, and the building jumps each time, up and then out, the roofs unfolding, the lantern last, the trees popping. |
| 222.372 | the shout | | A fourth stomp blows the doors open; the kids come running in up the steps; Derek and Hansel at the door. |
| **229.118** | the last hit | | **The last photograph**: the press fire, a look each. Two small flashes more on the tail's call, and the press trot off. |
| 229.1 → 263 | the tail; the credits | | The day turns to dusk, the windows light one by one, the kids at the sills, and the credits come over the deep sky. |

## The company

- **Hansel** is at the awards (his light, the trophy, the parade), the walk-off (his moves, the grid, the touch),
  Derelicte (the tower, the plug, the bucket, the pose) and the Center. Never in the spa.
- **Mugatu** is at the awards (out of the wings' dark), the spa (at his console, never in the machine) and Derelicte
  (his perch, the throw, the heap). Never at the walk-off or the Center.
- **The Prime Minister** is only at Derelicte, in the front row: he sits through it all, flinches at the plug and the
  star, and rises and cheers.
- The check holds them to it: each only in their own places, never jumping, coming and going only out of shot or at
  a cut, never two of anyone.

## End credits

The last hit has rung away and the Center stands at dusk. From 231 s over the deep sky the credits come, a card at a
time, set by the page from `Performance.titles(t)` (a show's canvas sets no type): Directed by Claude Opus 5.5; With
Derek Zoolander (the steel-blue ball), Hansel (the gold ball), Jacobim Mugatu (the ivory ball), the Prime Minister of
Malaysia (the crimson ball); Music, Frankie Goes to Hollywood, "Relax", the original 7", produced by Trevor Horn, ZTT
Records (1983); After Zoolander, a film by Ben Stiller (2001); Drawn with p5.js. There is no title card. After the last
card the Center holds to the end, 263 s.

## What check:shows holds

`apps/rube/checks/magnum.ts`:
- the recording whole from zero, its credit, the label's upload, and the credits after it;
- the places in order, every cut on a downbeat, no portal;
- the ball never jumps in a place, and every cut is a match cut (three of them in a flash, white at the cut and only
  there);
- every strike on a beat or an off-beat (±30 ms) or a measured onset (±40 ms), and every part strikes;
- the song's landmarks struck (the drums, the call, the count-in, the wash, the plug, Magnum, the band back, the last
  hit), and three in four of the rock's beats;
- the camera cuts inside a place only on a strike and never whips; its biggest punch is Magnum's;
- Derek in the frame under Zoom and findable (never under 5.5 px across) outside a few declared shots (the model framed
  alone; the geography wide and the three watchers cut into the ride; Hansel's last rails and the booth on the rip);
- never hidden long; **stock still in the silence after the plug**;
- Hansel, Mugatu and the Prime Minister where the story has them;
- the end credits' words, and the onset file being this recording's.

## How it is built

- **The version file:** `apps/rube/src/shows/versions/relax/opus55.show.ts`. Everything with weight is behind `load()`.
- **The show:** `.../relax/magnum/`, on Logogram's kit (after Liftoff's, All at Once's and Merry-Go-Round's): `kit.ts`
  (the part contract: each part is handed a slot and builds its lane from timed waypoints, so its strikes land where
  the music is by construction), `show.ts` (the legs), `score.ts` (the order, the cuts, the flash cuts, the punches),
  `camera.ts` (authored keys through a monotone cubic), `music.ts`, `seams.ts`, `hits.ts`, `credits.ts`.
- **The canonical drawings** (`cast.ts`): **the look** (`glint`: a cartoon "ting" of eight tapering rays on the rim of
  whoever gives it, 0.35 for Blue Steel, 0.9 for Magnum, the one sparkle the show allows), a press camera's flash
  (`flashBurst`), and stage light (`beam`, `pool`, `bloom`).
- **Derelicte's fixed geometry** (`derelicte/geo.ts`): the runway, the steps, the Prime Minister's seat, Mugatu's perch,
  the tower and its booth, the plug, and the fixed moments and waypoints the two builders of that scene met at.
- **The parts:** `awards/`, `spa/`, `club/`, `derelicte/` (the runway and the set; the tower, the booth and Hansel's way
  up it), `center/`.
- **How it was made:** a director (Claude Opus 5.5) measured the song, wrote the kit, the seams, the canonical drawings,
  Derelicte's geometry and a stub for every part so the show ran end to end, then six builders (awards, spa, club,
  runway, tower, Center) built the parts in parallel from one brief, and rounds of director's notes followed.

## Director's passes

What was watched (1 fps strips of the whole film, dense sheets round every cut and the climax, the probes for velocity
jumps, camera stop-starts and parked holds, a music audit, frame rates in Chrome on the GPU) and what changed because
of it:
- **The plug is the lights.** The drop first played in the full light of the show, the plug small in a wide. Now the
  show's rig dies with the band on 182.817, the silence plays in the oil drums' firelight, Magnum's glint is the
  brightest thing in the show, and the house lights clank on, flat and cold, when the band comes back.
- **The ride** was one long pull on a speck crossing a brick wall: it is a sequence cut on the downbeats, Derek close
  in the flashes and the three who watch him (Hansel, Mugatu, the Prime Minister), each in two bars or less.
- **The throw** was a speck crossing a wide: it is a two-shot of Mugatu at the runway's edge over Derek, the star
  bigger and lit by the fire, stopping a hand's width from his face with a point toward him.
- **The heap** that buries Mugatu hung over the runway as a black boulder for fifty seconds: it is a net of bags on a
  batten up in the dark, its release line tied off where he backs into it.
- **The reversal** at the awards was a busy wide: it is framed close, Derek on the dark podium, the trophy swinging
  across the middle to Hansel in his pool, the press turning their cameras over their heads.
- **The spa's steam** was a white wall with a hard edge: it is soft billows that drift and thin. **The fourth round**
  (the brainwashing, told by the machine) was subtle: Mugatu's hand now comes off the lever and stays away, the latch
  holds, and Derek gathers and springs by himself, stiff and exact.
- **The crowds** were outlined heads in top hats and fedoras: they are one dark mass, rimmed where light falls, with the
  hair of 2001.
- **The credits** would have been cream type on a pale morning sky: the day turns to dusk under them, and over their
  thirty seconds the stars come out one by one, the path's lamps light and the last windows warm.
- **The spa's way out** was a flat grey void past the door: it is the wet night street, the door's light on it.
- **A sandbag** beside the Prime Minister's chair was in every close of the climax: it hangs hidden in the tower now.
- **Every landmark and every strong onset of the song is struck** (the drums, the call, the count-in, the wash, the
  plug, the splash, the band's return, the last hit, the tail's two calls).

## Zoolander nods

Visual and mechanical only; no stills, no text, no audio beyond the song.
- Blue Steel at the runway's end; Male Model of the Year going to Hansel, "so hot right now", under a flown trophy.
- Mugatu's day spa: the pampering, the cucumber slices, and the brainwashing: a song that makes a model strike at the
  Prime Minister of Malaysia.
- The walk-off, underground, judged by a guest of honour who is only his light; Hansel's move that cannot be done.
- Derelicte: the collection worn as a set of bin bags, newspaper and scaffold; the song played at the show; Hansel
  pulling the plug on the DJ; Mugatu's throwing star; Magnum, the look that stops it.
- The Derek Zoolander Center for Kids Who Can't Read Good, first the size of a center for ants, then at least three
  times bigger (three times).
