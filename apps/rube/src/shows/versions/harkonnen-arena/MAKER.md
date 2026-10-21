# Maker

`/shows/harkonnen-arena/opus55/` · **Maker**, one take, **Opus 5.5**, on the Movies shelf.

**Maker · after Dune: Part Two.** Hans Zimmer's *Harkonnen Arena* is from *Dune: Part Two (Original Motion Picture
Soundtrack)* (WaterTower Music, 2024). In Denis Villeneuve's film it is the cue of chant and drums under Feyd-Rautha's
birthday games on Giedi Prime. Here it is played whole by YouTube from WaterTower Music's own upload (UdlvgIFdNZU), from
its first sample, and then the end credits run on into the quiet after it: 347 s in all. No recording is shipped
(`ATTRIBUTION.txt`). Why this cue, and its measured structure, are in `docs/shows/maker/cue.md`; the research behind the
beats is in `docs/shows/maker/research.md`.

The Fremen call the sandworm Shai-Hulud, and the Maker: the hooks a rider sets in its seams are maker hooks.

## The idea

Part Two tells its story in light. Arrakis by day is orange and white heat; an eclipse takes the sun; Giedi Prime, where
there is no visible light, only infrared, is black and white; and the colour comes back with the storm the Fremen ride
out of. The show takes that arc as its spine. Every colour in every frame goes through one grade (`maker/grade.ts`):
the desert's own colours, then, as the moon covers the sun in the cue's silence, an infrared red without hue, then black
and white on Giedi Prime, and the colour given back on the storm's dissolve.

Its beats are the film's: a harvester taken in the deep desert (from Part One), the thumper and the first worm ride, the
arena under the black sun, and the charge out of the storm. The cue's shape holds them: its first stretch of booms and
great blows is the harvester's end, its two driving pulses are the thumper and the ride, and the charge, its dead
silence is the eclipse, and its two hardest blows land in the arena.

**The cast is locked.** Everyone who is a person is a ball:
- Paul is a blue ball, the blue within blue of the spice's eyes.
- Chani is madder red. She watches the ride from the mesa, and rides beside him in the charge.
- The Fremen are dun, the colour of their cloaks in the sand.
- Feyd-Rautha is chalk white, a little bigger, only ever on Giedi Prime.
- The three Atreides prisoners in his arena are grey.
- The Harkonnen crowd in the arena's tiers and the Emperor's Sardaukar are drawn as masses, not as balls.

Everything else is drawn: the harvester, the carryall, the worms, the thumper, the arena, the Emperor's ship.

**One job per prop:**
- The rock keeps the two of them safe: the worm cannot come up through stone.
- The harvester is the Harkonnen machine the desert takes; the carryall comes for it and cannot save it.
- The thumper calls the worm: it beats with the drum.
- The maker hooks open a seam, so the worm rolls the open side up and carries him.
- The moon takes the sun, and the colour with it.
- Feyd's knife.
- The black fireworks are the Harkonnens' birthday.
- The storm hides the worms; the Emperor's ship falls.

## How it is made

`harkonnen-arena/maker/`:
- `show.ts` is one world on one clock (`MakerShow`): the balls of the cast, each on a path of its own (`motion.ts`:
  holds, rolls over the sand, true-gravity hops, rides). The stage draws what the show lists (`ShowPoint.balls`), and
  each dot turns only as its ball rolls, or turns to look.
- `scene.ts` and `timeline.ts` lay the film out as scenes, each owning a window of show time: where Paul and Chani are,
  who else is on the stage, the camera's shots, what is drawn, its strikes. `score.ts` lays them end to end.
- `lens.ts` is an authored camera: monotone cubics through holds and tracks; cuts only on the music; dissolves at the
  changes of place.
- `grade.ts` is the arc of light, over every colour a drawing asks for (`paint.ts`: `b.c(hex)`).
- `world/` is the desert: the sky and the sun, ranges of dunes with knife-edge crests and slip faces in shadow, drawn in
  layers as through a dolly (a far range is `h / (h + d)` of its size, so close shots keep a low horizon), the worm's
  skin and mouth.
- `scenes/` holds the places: `desert/` (the harvester and the maw), `ride/` (the thumper, the ridden worm, the eclipse),
  `arena/` (Giedi Prime), `charge/` (the storm, the camp, the worms, the evening).

The look is flat fills and few lines. Lines never fall under 1.25 CSS pixels. Depth comes from layers paling toward the
air; light only from where it comes from, as flat shapes on what it falls on. There is no glow, bloom or sparkle, and
nothing is written on the frame. The end credits are the page's (`credits.ts`), painted into the frame only in a saved
video; on a phone they keep the house floor (`least` 4.5) and rise into the sky over the frame (`lift` 0.6).

## The clock

`scripts/shows/harkonnen-arena-onsets.py` measures the cue once into `scripts/shows/plans/harkonnen-arena-onsets.json`:
its stretches and landmarks, every onset with its strength, and five combs tracked beat by beat (the booms, the drum
under the great blows, the drive, the run, the charge). `apps/rube/checks/maker.ts` holds:
- every strike the story turns on to that file (each scene's `strikes`), and every camera cut;
- the arc of light to its stretches;
- every ball to never jumping, coming or going in shot, but across a cut or a dissolve;
- the credits and the soundtrack to what they owe.
