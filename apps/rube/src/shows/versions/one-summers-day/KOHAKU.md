# Kohaku

`/shows/one-summers-day/opus55/` · **Kohaku**, one take, **Opus 5.5**, on the Movies shelf.

**Kohaku · after Spirited Away.** Joe Hisaishi's *One Summer's Day* is the opening theme of Hayao Miyazaki's *Spirited
Away* (Studio Ghibli, 2001); Hisaishi later set words to it as *The Name of Life*. The show plays his own recording with
the London Symphony Orchestra (*Melodyphony*, 2010) whole, by YouTube, from the official upload on his own channel
(TK1Ij_-mank), from its first sample, and the end credits run on into the quiet after it. No recording is shipped
(`ATTRIBUTION.txt`). The research is in `docs/shows/kohaku/research.md` and the cue's measured structure in
`docs/shows/kohaku/cue.md`.

*Kohaku* is the river Haku was, and the name she gives back to him.

## The idea

The film turns on a name. A girl crosses into the spirit world at dusk, works in its bathhouse, sees the boy who helped
her come in over the sea as a white dragon torn by paper birds, goes out over the flooded plain on the train to save
him, and coming home on his back remembers the river she fell into when she was small, and says its name, which is his.
His scales come off him and they fall together. In the morning she goes home and does not look back.

Four minutes of music will not hold the whole film. The show keeps that spine and the images the film is remembered
by, each given room: the gate and the wind, the meadow and its cloud, the river of stones, the lanterns coming on, the
bathhouse lit at night, the river spirit, the new sea at dawn, the dragon and the paper birds, the train over the water,
the hopping lamp, the flight under the moon, the scales, the fall, and the arch.

The cue is shaped like a short film: four soft chords, the theme alone, two climbs to the same cadence, a deep quiet,
and the theme a last time to the fullest climax before a long fall away. The story is laid on it: the arrival on the
quiet, the bathhouse on the first climb, the dragon on the second, the train on the quiet, the name on the last cadence,
the way home on the fall.

**The cast is locked.** Everyone who is a person is a ball:
- Chihiro is a rose ball, the pink of her work clothes at the bathhouse.
- Haku is a pale jade-white ball, his dragon's white with the green of his mane in its rim: a boy on the bridge, the
  dragon over the sea and under the moon, a boy again when his name comes back to him.
- No-Face is a dark ball, bigger than she is, his white mask on him: on the bridge as she crosses, and beside her on the
  train.
- The bathhouse's hands are cream balls, who haul on the rope with her.

Everything else is drawn: the river spirit, Kamaji's arms and the soot, the dragon, the paper birds, the shadow
passengers and the girl on the platform, the lamp.

**One job per prop:**
- The tunnel lets her in and out.
- The lanterns tell the dusk.
- The token sends for the water.
- The rope pulls the thorn.
- The shutter shuts out the birds.
- The train carries her over the water.
- The lamp lights the way to the cottage.
- The river under the cloud gives back his name.

## The film, as the cue plays it

| Show time | Music | What happens |
| --- | --- | --- |
| 0 | four chords | **The gate.** The red-plastered gate under its summer trees, its arch dark, the stone figure by the path. On the first chord she comes up out of the tunnel's dark; on the second she rolls out into the sun; on the third the wind goes past her into the tunnel and the grass leans after it; on the fourth she goes on to the brow, and the camera opens on the summer: the hills, the cloud, the meadow running down to the river of stones. |
| 20.60 | the theme | **The way in.** Down the meadow, over the dry river a stone a note, up the far bank's steps a step an eighth, and along the empty street of eating houses as the sun goes. On the theme's last notes the lanterns come on down the street, one a note, overtaking her towards the bridge. |
| 44.31 | the swell | **The bathhouse.** *(the bathhouse builder's beat sheet)* |
| 94.0 | the first quiet | **Dawn** (a dissolve). The plain is a sea. She is on the balcony at the bathhouse's east end, her room open behind her. |
| 101.99 | the theme rising | **The dragon.** A white shape far out over the water with a swarm of white about it: the dragon, the paper birds cutting at him. A cut in among them on 107.79; a cut back to her on 112.80. |
| 115.82 | the height | She goes in to the shutter's cord; he wheels in over the sea for her door. On the peak (123.36) he comes in through it over her and down on the floor; on the next note the shutter drops on the birds, and they strike it one a note and fall. |
| 125–137 | the height's end, and the high light | He thrashes, the blows going through him less and less, and lies still, his eyes shut; she goes to his head. |
| 137.40 | the high light | **The train.** *(the train builder's beat sheet)* |
| 193.45 | the summit | **The name** (a cut). Over a sea of cloud under the moon he carries her west. A gap opens under them on a river far below. |
| 201.55 | the cadence | On the fullest note his scales come off him from the tail forward and the last of the dragon is the boy. They fall together, coming to each other's side, turning over and over, the scales going up past them. |
| 205.5 | winding down | **Home.** Down through the cloud's pale into the first light; the fall slows to nothing and they come down on the river of stones side by side. On a note she goes back over the stones alone, a stone a note; he stays. Up the meadow with her to the gate. |
| 231.5 | the fade | At the arch she stops, and does not look back, and goes into the dark. The credits come up over the summer sky; the wind goes on in the grass. |

## How it is made

`one-summers-day/kohaku/`:
- `show.ts` is one world on one clock (`KohakuShow`): the balls of the cast, each on a path of its own. The stage draws
  what the show lists (`ShowPoint.balls`), so Chihiro's mark turns only as she rolls (`path.ts`: rests, rolls, hops
  under one gravity, glides, rides).
- `scene.ts` and `scenes/` lay the film out as scenes, each owning a window of show time. A scene says where she is,
  who else is there, where the camera looks and what is drawn; `score.ts` lays them end to end.
- `camera.ts` is an authored director: monotone cubics through holds and follows, the follow never averaging across a
  cut; cuts only on the music; dissolves for changes of place and time.
- `light.ts` is one keyed plan of the light for the whole show, the film's day twice over (an afternoon into dusk, the
  bathhouse's night, a dawn and a day, the train's long evening into night, the moon over the cloud, the morning home),
  which the sky and every set read.
- `world/` is the sky (flat cumulus in two tones, a field of them over the whole world), the sea of cloud and its gap,
  and the dragon (`dragon.ts`: a spine that is his head's own way behind it, a mane, horns and legs, and the burst).
- `geo.ts` is the world's lie, west to east: the gate, the meadow, the river of stones, the town, the bridge, the
  bathhouse, the sea and its stations.

The look is flat fills and few ink lines. Ink weights scale with the camera, like the balls' own outlines. Depth comes
from layers paling into the air, and light only from where it comes from, as flat shapes on what it falls on. There is
no glow, bloom or sparkle, and nothing is written on the frame. The end credits are the page's (`credits.ts`), painted
into the frame only in a saved video.

## The clock

The cue is played freely, with no click, so `scripts/shows/kohaku-onsets.py` measures its stretches and landmarks,
every onset with its strength, and the eighths tracked through its rubato, into `scripts/shows/plans/kohaku-onsets.json`.
`apps/rube/checks/kohaku.ts` holds:
- every strike the story turns on to that file (the chords at the gate, the stones going in and going home, the steps,
  the lanterns, the dragon at the door, the shutter, the birds on it, his blows, his name, the parting);
- every bare camera cut to it;
- every ball's way whole, and nobody jumping, coming or going in shot but at a cut or across a dissolve;
- the credits and the soundtrack to what they owe.
