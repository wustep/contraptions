# Windowlight (Opus 5.5)

`/shows/near-light/opus55/` (also `/shows/near-light/`), in the picker as **Windowlight**, one take, **Opus 5.5**, on
the **Ambient** shelf beside Gymnopédie. The work is `near-light`, after the music; the picker's title is the show's.

Ólafur Arnalds' *Near Light* round a small machine on a winter windowsill at night, as a loop with no seam: 205.409 s,
and then the same 205.409 s again. It is music to leave on. There is no story. A ball goes round a machine made of
wood, brass and felt, once a period, and outside the window the aurora comes and goes with the strings.

## The cue, and why Near Light

The default cue was *Near Light* and I kept it. It suits a loop better than anything else of his I looked at:

- It is played to one click. The piano's sixteenths, the drum loop and the quartet's chord changes all sit on a comb
  at 118.008 beats a minute, from the first chord to the last held note (strong beats a median 4.5 ms off it). The
  felt piano plays alone for the first twenty bars and leans against the click, but it is still the click.
- It opens on a solo chord, on bar 0's downbeat, with nothing before it.
- It ends on one string's held note that dies on the half-bar of bar 100, 204.5 s in. Bar 101's downbeat is a
  half-note later. If the first chord comes round on that downbeat, the piece keeps its own time across the seam.

So the period is 101 bars of the click, from the recording's own zero: the last bar counts towards the first chord.
With a seam that can be counted, there was no reason to go looking for another of his pieces.

## The recording, and the loop

Demo only. It is copyrighted, and the audio must not ship in a public build (`ATTRIBUTION.txt`).

- **Source.** Erased Tapes' own upload of the *Living Room Songs* track (`ejaaxLeUQd4`), fetched once with a current
  yt-dlp (Homebrew's gets a 403). The Topic upload (`urRNNvODXfM`) cuts the room's tail short, so it was not used.
- **The period.** `scripts/shows/near-light-loop.py` takes the recording's first 101 bars as they are: nothing moved,
  no gain change, encoded from floating point so the mastered peaks are not clipped. The room the recording goes on
  hearing after bar 101 (its tone, a creak) is laid back under the first 1.2 s, fading, the way a performance played
  round a circle would have it. The seam has no digital silence in it. The file carries two seconds of the period's
  end before the show's zero and two of its start after the period, as Gymnopédie's does, and the player loops
  `[2, 207.409)` gaplessly from a decoded buffer. The two copies of each edge agree to −58 dB, which is mp3 noise.
- **No YouTube cue.** A looped period with a tail laid under its head is not a stretch of any one upload, and the
  YouTube player cannot loop gaplessly. The file plays.
- **Onsets.** `scripts/shows/near-light-onsets.py` reads the shipped file and writes
  `scripts/shows/plans/near-light-onsets.json`: the comb (bar 0's downbeat at 0.169 s), every beat moved onto its own
  attack where one is within 30 ms, 1,662 onsets with their strength and how much of each is low (the kick and the
  bass), the seven sections, the loudness, and how full the held sound is (a median over 0.75 s of each bin, so the
  strings and the pad and not the attacks). Attacks start 24 ms after the flux frame that finds them; the script
  measures that on the 40 hardest onsets and moves every time by it.

The sections, all on downbeats: intro (bars 0 to 20, the felt piano alone), strings (20 to 36), build (36 to 48),
beat (48 to 72, the drum loop, flat loud), after (72 to 84, the drums gone), arpeggios (84 to 96, bars 87 and 93
resting), coda (96 to 101).

## The machine

It stands on the sill and hangs from the window's head. The ball goes round it anticlockwise on the screen, once a
period, in six legs, each one mechanism and each one section of the music (`windowlight/route.ts` lays them end to
end; each leg starts where and as fast as the one before it ends).

- **The cups** (intro). Eight counterweighted arms on a slanting beam, each with a felt cup. A cup catches the ball on
  a chord, gives under it as hard as the chord was played, leans as the weight wins, meets its stop, and lets the ball
  roll off its lip into the next cup on the next chord. The chords are the strongest of each phrase: 0.16, 3.13, 7.04,
  10.26, 12.26, 16.96, 25.96 and 30.22 s. The cups stand where the one before pours the ball (`cups.ts` builds them as
  a chain), so every pour is a ball rolling off a tipped lip. Nothing is thrown.
- **The trough** (strings and build). A long felt channel along the bottom of the window. The last cup pours the ball
  in as the strings come in (41.03 s) and it rocks from side to side, two bars a side, through the floor on every
  chord change, bars 22 to 48. A felt hammer in the floor gives it a push at each pass, as hard as the strings are
  full, so the swing grows from 13° to 27°. The last pass is the drums' first downbeat (97.79 s). The hammer gives it
  its hardest push there; the ball goes over the lip on the drums' third beat and drops into the screw on the fourth.
- **The screw** (beat). An Archimedes screw of brass wire in a glass tube, up the right side. It turns all the time,
  a turn every four bars, and a turn a bar while it carries the ball, fastest on every beat of the drum loop and never
  still. Twenty-three turns up. The ball reaches the head on bar 72's downbeat, where the drums stop, and spills over a
  felt hook onto the rail in the silence before the next chord.
- **The rail** (after). A brass wire under the window's head, back across to the lamp. Nine bells hang over it, and
  the ball knocks each one as the piano's accent on that downbeat sounds. They light and swing.
- **The wheel** (arpeggios). Six gondolas round the lamp, turning a turn every three bars, all the time. The ball drops
  into the gondola at the top on the arpeggios' first accent (173.03 s) and rides round the light four times and a
  half. At the bottom, on the coda's last chord (200.48 s), a cam tips the gondola and the ball rolls out.
- **The chute** (coda). A short felt channel to the first cup that rises as far as the ball, coming off the wheel,
  can roll, and falls a little. The ball slows up the rise as the last note is held and all but stops at the crest
  (0.18 cells a second) as it dies. Then it rolls over the lip and drops into the first cup as the first chord comes
  round. The seam falls during that roll. The ball is never still.

## The music, answered

One job to a voice:

- The piano: the ball's hand-offs in the intro (the cups), the bells after the drums, the lamp during the arpeggios
  (it swells a little on each accent and settles over a second and a half; nowhere else does it move).
- The strings: the aurora. It is not there while the piano plays alone. It comes in with the strings, is as bright as
  the held sound is full, is brightest through the beat, and goes as the arpeggios end. Its folds and slow waves of
  light run on whole numbers of cycles a period. The strings also swing the trough, through the hammer's pushes.
- The drum loop: the screw's steps. The drums' first downbeat is the ball's one big push.
- The coda's held note: the ball's slow climb to the crest.

## The loop

The picture is a function of show time taken round the circle. The ball's way closes on itself, and its spin is
rounded to whole turns a period. The screw makes 43 whole turns a period; the wheel a whole number of sixths; the
aurora's folds, the stars' twinkle and the snow come round on whole cycles; the cups' arms and the gondola's swing are
back at rest well before the period closes.

At the seam the camera is all the way out, on the whole window, the machine small in it, and a little light round the
ball so it can be found. The title comes up over it as the first chord sounds, and the camera goes down to the cups.

## The camera

A blend of a few aims, each weighted smoothly in show time: the whole window; the ball, followed softly (its way
smoothed over a second, a little ahead); the trough; the lamp. How far out it is, is keyed and eased in even steps of
scale. It leans in on the waiting cup through the piano's two long breaths (17 to 26 s, 30 to 41 s). On the trough it
stands back to see the whole swing, widens as the swing does, looks up into the sky as the aurora comes, and leans a
fifth of the way after the ball. It follows the ball up the screw and along the rail. It holds on the lamp while the
ball goes round it, looking up over it while the credits are up, and from the coda's held note it draws back to the
whole window. No stop-start pans; the worst pan acceleration is 0.3 frame heights a second a second.

## The words

The title, **Windowlight**, with *Near Light · Ólafur Arnalds* under it, over the whole window as the first chord
comes round. The credits (Directed by Stephen Wu and Claude Opus 5.5; the music, Ólafur Arnalds, *Near Light*, from
*Living Room Songs*, Erased Tapes, 2011) while the ball goes round the lamp, gone before the camera has drawn back.

## Director's passes

What each round of scrubbing changed:

1. The first cut had the cups on a straight line, and their pours threw the ball upward out of a cup. They are a
   chain now, each cup where the one before pours. The trough was a tall crescent whose left arm rose into the cups;
   it is shallow now. The screw read as a spring, so it has a glass tube. Nine long threads for the bells made the
   wide shot a forest of lines; the bells hang from a second wire over the rail instead.
2. The trough's passes drifted up to a second off the chord changes. The swing is now locked to two bars a side, so
   every pass is a chord change and the last is the drums' downbeat.
3. The ball rode on top of the trough's near wall; it rolls in the channel now. The hammer was too small to see.
4. The rail ended on the wheel's rim, where the gondolas pass. It ends clear of them, with a longer drop in.
5. Two stretches of the intro had nothing moving (the pace probe found 17–24 s and 31–39 s). The cups lean more
   evenly through a wait, and the camera leans in on them. The lamp now answers the arpeggios, the one voice nothing
   answered. The credits sat over the wheel; the camera looks up over it while they are up.

Reviewed and left alone: the landing into the screw on the drums' weak fourth beat (it is the pickup into bar 49, and
the screw steps from there); the room tone laid under the first chord (a creak at −40 dB, under a chord at −26 dB).

## Checks

`check:shows` (`apps/rube/checks/windowlight.ts`): the picker entry and the Ambient shelf; the demo credit and the
attribution; the period is 101 bars of the click and the first chord is bar 0; the loop (period, offset, a clock that
goes round, the last moment equal to the first for the ball, its turn and the camera); the ball never jumps and is
never quite still; every cup catches on a measured intro chord with the cup at rest, and every pour rolls off a lip;
every trough pass is a chord change and the last the drums' downbeat, the swing grows only at the passes and stays
inside the trough until the drums; the lip on beat 3 and the screw on beat 4; the screw fastest on every beat and whole
turns a period; the bells on the after section's accents; the wheel boards and alights on accents, turns whole sixths
a period, and the rail ends clear of it; the crest slow but never still; the aurora dark in the intro and the coda and
brightest through the beat; the lamp breathes only on the arpeggios; the camera never jumps in or out; the titles.

Performance: 59.6 fps in headless Chromium at 1280×720, at the aurora's brightest and round the lamp.
