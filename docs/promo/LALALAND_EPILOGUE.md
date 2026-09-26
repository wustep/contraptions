# La La Land, Epilogue

Copyrighted recording. This is a private tech demo only. Do not ship this audio in a public build. Nothing here claims any right to it.

The music is Justin Hurwitz's *Epilogue* from *La La Land* (2016). Attribution is in `docs/promo/LALALAND_EPILOGUE_ATTRIBUTION.txt`.

Open it at `/shows/?show=la-la-land&take=fable51-epilogue`. In the Shows picker it is **Fable 5.1**, a take of the work **Epilogue**.

## What it is

A Rube Goldberg machine plays the whole cue, 7:36 of music, and the credits run over its last chords: 456 s in all. It is the film's ending. Seb sits at the piano in his club and plays their theme; the picture goes to the life they could have had; it comes back to the club; she leaves; the look; the smile.

- **Sebastian is the blue ball** (`#5B8DD6`): the thread. He is the one at the piano, and every machine's beat is his.
- **Mia is the yellow ball** (`#F2C94C`): she sits at her table in the real club while he plays. From the kiss on she is with him everywhere in the dream. She is never a second lane through a machine: she rides what he makes go, follows a step behind, hesitates, catches up, taps him. Her life is timing.
- **David, her husband, is the grey ball** (`#8C8F96`), in the real club at the end only.

Every part is new, and there are no portals. Three universes share one set of cells and one clock:

1. **Seb's, the real club** (0 to 65.3 s): a dark room after hours, one lamp, and a grand piano drawn from the front, huge, its keys along the frame and its lid up behind.
2. **The dream** (65.3 to 336.2 s): the club's own stage, dressed. Every set is painted flats on a dark stage, each lit in its own colour, with battens, ropes, wires and beams showing where they want to, the way the film's own Epilogue uses painted backdrops and irises. The freeway, the studio, Paris, the stars, the number, home, the street and Seb's again.
3. **Seb's again** (336.2 to 456 s): the set is struck, and the real club is what is left, at the far end of the chain where the dream's last set stood.

The stage changes universe twice, on the music: on the kiss, and on the drop out of the peak. The ball does not move for either.

## The cue

*Epilogue* is a suite. It is the film's "what if" montage, it quotes every theme, and its sections are acts. Measured once by `scripts/lalaland-epilogue-onsets.py` into `scripts/show-plans/lalaland-epilogue-onsets.json` (numpy and ffmpeg), and `check:shows` holds every strike of the show against that file:

| Show s | Music | How it keeps time |
| ---: | --- | --- |
| 0 to 63.4 | the piano alone, rubato | note by note (246 notes measured, 63 strong) |
| 63.4 to 65.3 | silence | |
| 65.32 | the kiss: the orchestra's burst (its swell peaks at 65.8) | a measured onset |
| 75.72 to 143.4 | the swing, 128.04 bpm, loud to 132.4 s and then soft | a comb: beat k at 0.2755 + 0.4686 k s, bars on k ≡ 1 (mod 4) |
| 143.45 to 166.9 | a musette waltz, 64 bars a minute, and a cadence of five hits to 167.65 | a comb: bar k at 0.0915 + 0.937 k s, its beats the thirds |
| 167.65 to 193 | the stars: soft and free, then a crescendo of hits | measured onsets |
| 193 to 217 | a legato build | measured onsets |
| 217.05 to 238.06 | the number, 122.75 bpm | a comb: beat k at 0.0125 + 0.4888 k s, bars on k ≡ 0 (mod 4) |
| 238.1 to 272.4 | home: soft and free, three big accents | measured onsets |
| 272.4 to 336.2 | the choral waltz: legato, one long swell to its peak at 335 | almost nothing to strike: three measured onsets |
| 336.2 to 343.5 | the chord's decay, a breath of silence | |
| 344 to 344.9 | four notes of the piano alone | note by note |
| 344.9 to 398 | the look: strings and piano, rubato | measured onsets |
| 398.1 to 453.5 | ten last chords, each ringing into silence | measured onsets |

Every part is handed a slot (the show time the ball arrives, the time it must leave, the onsets it has to strike) and builds its lane out of timed waypoints, so a strike lands where the music is by construction. The tolerances: ±26 ms on a comb, ±40 ms on a piano note, ±35 ms on a free onset.

## The parts, in order

| Show s | Music | Part | What happens |
| ---: | --- | --- | --- |
| 0 | the piano, rubato | the club | The first frame is the room: the piano in its lamp, and Mia at her table across the floor. Through the sparse intro the camera comes in on the keys, arriving as the theme begins. Seb sits on a key of a huge piano in the dark, in the lamp's pool. On every note the key under him sinks, the hammer above flies up and strikes its string, the string lights and rings, the damper lifts; he dips with the key. Through the sparse intro he waits on a key and dips on each note; from 19 s the theme flows and he rolls on, key by key, at the pace of each phrase. The camera drifts along the hammers with him. Mia sits at her table across the room, and glances at the piano twice. |
| 33.7 to 63.4 | the second half, the final chords | the club | Through the second half the camera opens out and drifts across the room to Mia listening at her table, him still on the keys at the frame's edge, then comes back in for the phrase before the chords. The camera pulls back to the whole piano and, at the right, Mia at her table. The chords at 60.7 to 61.6 fire two, three and four hammers at once. |
| 63.4 to 65.32 | silence | the club | He rolls off the end of the keys, over the cheek, drops to the floor, and rolls to her table. He touches her at exactly 65.32. |
| 65.32 | the kiss | the kiss | The burst. The lamp blooms into a spotlight on the two of them, the curtain behind the piano opens on the band in silhouette, and the real club's furniture is flown up out of the room on wires: the stagehands are taking the room apart for the dream. They roll to the stairs, hop up the first steps on the hits at 70.9 and 71.2, and glide up in the light from the door, which opens onto the street. Out through it on the swing's first bar. |
| 75.72 to 103.84 | the swing, loud | the freeway | Out of the club's door onto a painted freeway on-ramp curving up into a magic-hour sky, palms in silhouette, downtown small and far. A jam stands on the ramp, and the jam dances on the swing: a landscaper's pickup drops its ramp gate for him and slams it up behind her, flinging her into the bed; the truck's hydraulics pop them onto its ladder rack and then onto a bus's roof, whose windows light one by one on the riff; a chorus line of eight pink wagons kicks its hoods up under them, a landing a beat; a convertible's top rises on its arms and latches at the header with a bang that throws both into the seats of Seb's red Buick. It cranks, catches, revs, lights its headlights and pulls away along the top, bumping over the deck joints on the beats, and on the loudest bar it brakes dead at the deck's end and the two carry on. Every beat of the stretch struck. |
| 103.84 to 132.43 | the swing, loud, then soft | the studio | The backlot. A barrier arm rises and a stage's roller door rolls up on the beat; a slate on a dolly snaps, take one, and a take a bar after; three banks of lamps strike on the batten and swing their beams; the dolly's winch clacks and it carries the two along its track, dipping at every joint on every beat, until the buffer; a brute finds them on the loudest beat. The banks dim, and a follow spot hunts across the floor and snaps onto her; six folding chairs slap their seats down one by one, and all together: her applause. Down the dolly's ramp, a wind machine winds up and blasts them across the second bay, where the backlot's stock of painted backdrops stands in a row, each a different world, rocking one after another as the gust runs down the line; a rain rig lets its curtain down, slanted by the wind; lightning over the flats; and on the beat the swing goes soft the lights go down and they roll out of the door. |
| 132.43 to 143.45 | the swing gone soft | Paris | Out of the stage door into the dark: a scissor lift in a pit takes them up a notch on each of the soft swing's strong beats while a batten lets the Paris flat down a notch to meet them (a teal night, the tower in silhouette, the river, a stone bridge). At the top the platform tips and they roll onto the back of a waiting carousel horse. On the last notch, bar 153, the flat lands on the quay with a thump and the carousel's lamps come up. |
| 143.45 to 166.9 | the musette waltz | Paris | The carousel turns, one turn every eight bars. Every bar the horses rise on the two, fall through the three, and land on the one with a thump; at the hub a crank turns once a bar and works an accordion whose bellows open on the two and three and clap shut on the one; the tower's lamps sparkle on the downbeats; the river runs under the bridge on five painted rollers. |
| 166.3 to 167.65 | the cadence | Paris | Five hits. The carousel surges up on the first two, and on the third their horse's pole fires and throws them straight up together; on the fourth the carousel drops back onto the quay; on the fifth they hang at the apex, at rest, a good half a cell over the canopy. The starcloth comes up through the carousel over the throw's last third of a second. |
| 167.65 to 185.6 | the stars, soft | the stars | Wires from the grid take them: the flying rig. A painted night hangs from its batten. Paper stars on threads light one by one on the soft onsets; a paper moon flies in on its wire and stops with a bob, its lamp lit, a crescent; below, a planetarium projector on a plinth turns and sweeps its beams across the cloth. They waltz in the air: she orbits him, twice, and through the second orbit a lamp in the cloth lights where she is on each note, so her dance stays in the sky as a garland. |
| 185.6 to 192.96 | the crescendo | the stars | The cloth's lamps light in bands out from the moon on each hit until the sky is full; the projector spins up; on the big chords the whole sky flares and the moon's terminator steps, crescent to full. The rig lowers them, and on the last hit they touch down together on the stage; the wires go slack and are hauled up. The moon is flown out and every light of the set fades by 197. |
| 192.96 to 217.05 | the build | the number | The stage builds its own set. A grand staircase surfaces out of the floor in a wave, three treads at a time, each section stopping with a thunk on an onset, tallest first; a great gold sun disc flies in on its batten and lands on the biggest onset; a boom of four spotlights swings in and its lamps strike; a chorus line of dancers' legs and skirts slides out of stacks on a flown bridge behind the stairs. A stage lift carries the two up to the top landing while the cue swells. |
| 217.05 to 238.06 | the number | the number | From beat 448 they come down the staircase, a landing on every beat, she half a beat behind on the off-beats: a duet. Each tread lights as he lands on it and stays lit, so a gold trail grows behind them; the chorus kicks with her; the sun pulses on the downbeats; the follow-spots track them down. On the last hit they land together on a lit mark at the foot. 40 of 40 beats struck. |
| 238.06 to 272.44 | home | home | A little house, front and back turned to face the audience, the rooms open between. A rain border is lowered in from the flies, and the rain comes down out of it a string a note, on the roof and the stage. On the big accent at 245.7 the front door opens and the house lights up ahead of them, lamp by lamp on the flourish. Inside: he bumps a rocking chair, and its first rock forward pulls the cord of an 8 mm projector, whose reels turn and throw a bright, empty rectangle on the wall; he nudges the crib and a music box lets go: a cam plucks a comb's five teeth on the five notes, a star on the mobile lighting per note, and the child, a small two-tone ball in the crib, stirs. On the two big hits at the end the back door opens and closes behind them, and a streetlamp lights ahead. |
| 272.44 to 292.7 | the choral waltz | the street | The chorus enters and the neon sign of Seb's flickers on: a grand piano in red tube with a gold note (no letters anywhere). A locked wide of a painted street at night, lamps lighting ahead of the two as they stroll, then a stairwell cut under the street, a switchback they zigzag down to a red door with a sconce. Nothing hits: the stretch is one long swell. |
| 292.7 to 336.2 | the swell, to the peak | Seb's | On the loudest accent the club's door is thrown open. Down the room's stairs into the dream club, laid out exactly as the real one in the dream's colours and full: the band, the open curtain, a pianist at the huge piano, silhouettes at the bar and the tables, a host at the stairs. She catches him up at their table and taps him (298.6). They sit while the camera draws back to the whole club and the crowd sways with the waltz. As it gathers toward the peak he leaves her at the table and crosses to the piano; on the hush the pianist is flown out on a wire and the bench sinks into a trap; Seb rolls onto it, the trap lifts him to the keys, the whole club's light swells to the peak at 335, and he rolls onto the keys' left end, at rest, as the music drops out. |
| 336.2 | the drop | the club | The set is struck. The frame is the same, tight on him at the keys, and the dream's colours are gone: the real piano in the real dark, one lamp. The chord's shimmer dies in the strings for seven seconds. |
| 344 to 344.9 | four notes | the club | He rolls over four keys, a hammer on each, and stops. |
| 344.9 to 398 | the look | the club | The strings come in and the camera pulls back to the room: Mia at her table, and her husband beside her. She rises and crosses to the foot of the stairs, he a step behind; she stops and turns back toward the piano; the camera carries the look across the room to Seb at the keys; his nod; back to her; she turns to the stairs and they go up, a landing on each of the strings' onsets, and out through the door into the cold light of the street. |
| 398.1 to 456 | the last chords | the club | Ten chords. On each he dips and four hammers strike, and the strings ring into the silence after. The credits come up over the room, a card a chord, and the last card is gone before the last chord. On the last chord the lamp dims and the room goes to the dark. |

## The company

- **Mia** is company (`Built.company` in `kit.ts`): each part says where she is in its own frame, and the score moves her into the world. At every seam in the dream she is exactly `(-0.32, 0)` from him, level and at rest relative to him, so she is continuous across parts by convention; in between she is the part's.
- She may never jump, and may only come and go out of shot. `check:shows` walks the whole show a millisecond at a time for both.
- **Her husband** comes into being while the camera is tight on Seb after the set is struck, and is there beside her when the pull-back finds the table.

## Chrome, credits, checks

- In the picker the work is **Epilogue** and this take is **Fable 5.1**, with no note and no byline.
- The credits are the page's words (`Performance.titles(t)`), since a show's canvas sets no type: Directed by Claude Fable 5.1; Machines, drawings and code, Claude Fable 5.1; With, Sebastian (the blue ball), Mia (the yellow ball) and David (the grey ball); Music, Justin Hurwitz, "Epilogue" from La La Land (2016); Drawn with p5.js. They come up high in the frame, over the piano's lid, from the second of the last chords, and are gone before the last.
- `check:shows` holds: every strike on a measured onset (over 400 of them); the loud swing, the waltz and the number nearly every beat struck; the piano's strong notes struck and the four notes at the end; the kiss struck on the burst; the ball never jumping and never hidden more than 2.5 s; Seb solid the whole show; the touch at her table on the kiss; the three universes changing on the kiss and the drop; no portal and no drawn cut; Mia at her table for the kiss, with him through the dream at fifteen sample times, at her table again after the pull-back; her husband only in the club at the end; two balls with two ids where she is, three with him; neither ever jumping or appearing in shot; the credits' names and timing.

## How it was built

The kit is Liftoff's (`kit.ts`, `camera.ts`, `physics.ts`, `show.ts`), ported: a part is a drawing plus `build(slot)` returning a lane from timed waypoints, so strikes land by construction and `lay()` checks the seams. The score (`score.ts`) lays ten parts end to end and switches universe on the kiss and the drop; the camera is a monotone cubic through the parts' keys, with match cuts at the two switches and, at every other seam, the part being entered winning, so the camera is one continuous take. Stubs stood in for every part from the first day, so the whole 7:36 played end to end before any part was built. Eight builders then built the parts in parallel from one brief, sharing one dev server, and the director's passes followed: seams, the camera, the story beats, and the probes (`dev/jerk.ts` for velocity kinks off the strikes, `dev/cam.ts` for camera stop-starts, `dev/pace.ts` for dead stretches).
