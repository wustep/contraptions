# Rally

`/shows/rule-the-world/opus55/` · **Rally**, one take, **Opus 5.5**, on the Movies shelf.

**Rally · after Marty Supreme.** Tears for Fears' *Everybody Wants to Rule the World* (Songs from the Big Chair, 1985),
the song Josh Safdie's *Marty Supreme* (2025) ends on, in the maternity ward, and runs its credits on: played whole by
YouTube from Universal Music Group's own upload (awoFZaSuko4) from its first sample, with the end credits over its
fade and on into the quiet after it, 266 s in all. No recording is shipped (`ATTRIBUTION.txt`).

## The idea

Marty Mauser is a table-tennis genius and a hustler who never stops moving long enough for anything to catch him, so
here he is the ball: an orange table-tennis ball, the orange of the ball he means to put his name on. Nothing else in
the show is that orange but his son. In every match the bat at Marty's end of the table is his own contraption, a
red-rubber bat on a sprung, hinged arm clamped to the table, cocked by a little pan he lands in: a ball plays table
tennis the only way a Rube Goldberg machine could. Everyone else is drawn (Murray's store, Kay Stone, Kletzki, Endo,
Wally, Mishkin, the GIs, the nurse) but Rachel, his childhood friend and the mother of his child, who is a ball like
him (teal), and at the end their son, a little orange one.

The song is a 12/8 shuffle on a machine-steady pulse, and a rally already has its two sounds: the bat and the table.
Every rally in the show puts the bats on the beats and the bounces on the shuffle's "a", to the measured attack.

## The film, in seven places

One ball on one path. Every change of place is made on Marty at rest: the camera carries his place on the screen
across, so he holds still while the world round him becomes somewhere else (`rally/seams.ts`), and the next place
opens out of him in a plain circle, an iris (`rally/iris.ts`, see the fullness and restraint passes).

| Show time | Bars | Place | What happens |
| --- | --- | --- | --- |
| 0 | 1–24 | **The shoe store** (`store/`) | Uncle Murray's store on the Lower East Side before it opens. Marty ticks on his toy sprung bat on the counter through the intro; on the bass (bar 5) the lamps click on along the store a beat apiece and the bat fires him up the wall of shoe boxes, whose ends pop out as stairs; the library ladder rolls on its rail, a shoehorn, a fitting stool's footrest, the measuring device's slider. Into the stockroom: Rachel, a pause together under one bulb (the film's "Forever Young"). On "Welcome to your life / There's no turning back" (bar 14) he knocks open Murray's office door on the light of his desk lamp and works the safe's dial a click a landing, the handle, the bolts, the door; he settles on the bills, the plain ticket to London rising from the bundle, the clock clicking over to six. |
| 52.455 | 25–42 | **London** (`london/`) | On the first "Everybody wants to rule the world": the British Open, a cold iron-and-glass hall, two green tables under cone lamps. The semifinal against Kletzki, every beat a bat; Kletzki misses on 31.4 and the camera cuts to the whole hall. The final against Endo and his sponge bat, Kay Stone in the front row in pearls; the umpire's cards in pips. On "Nothing ever lasts forever" (bar 41) Endo's dead shot dies past Marty's bat; Kay's glove falls; Marty rolls off the end onto the floorboards. |
| 91.016 | 43–56 | **The hotel** (`hotel/`) | On the second hook: a run-down hotel cut open, his room's sickly wallpaper and clawfoot tub. On "There's a room where the light won't find you" the bulb goes out and the moon comes in; the floor cracks a beat at a time; on "the walls come tumbling down" (bar 48) the tub goes through the floor onto Mishkin, reading in bed below (the camera punches in). A bonk on Mishkin's head, out of the window, and down the fire escape a tread a beat to "So glad we've almost made it"; the counterweighted ladder, the wet pavement. |
| 121.018 | 57–64 | **The bowling alley** (`alley/`) | As the band drops out: Queens after midnight, and a table in the back for money games. Wally holds the stakes. The hustle: the first point thrown on purpose (the bets go up), then every beat a bat; the winner flies off the table down a lane into all ten pins, the marks' hats come off, Marty rides the ball return back under the floor and pops out of its hood, and rolls along the curb behind Wally's cab to drop in over its trunk. |
| 138.142 | 65–82 | **New Jersey** (`jersey/`) | As the guitar comes in: the same cab, now on a night road, Rachel beside him on the seat. The farmhouse, Mishkin's men, white bursts at a window; a lantern into the hay and the barn on fire through the solo; Rachel hurt, an ambulance's red light on the beats, the doors close on her. "I can't stand this indecision": across the dark field toward the airfield, back toward the ambulance's tail lights, and across again; up the stair a step a beat, to the round window. |
| 176.689 | 83–94 | **Tokyo** (`tokyo/`) | On "Everybody wants to rule the -", broken off: the exhibition he is meant to throw, one table under one lamp in a packed arena, GIs in a block of the stands. He stamps and the house lights come up; on "never, never, never, never" the real match, all sixteen beats bats and all sixteen shuffles bounces; the winning smash on the "Everybody" (bar 89, the camera punches in), caps in the air, streamers, flash bulbs. Then quiet: Endo picks him off the floor, sets him on the end line, bows, and the lights go down to the one lamp. |
| 202.391 | 95–end | **The ward** (`hospital/`) | On "All for freedom and for pleasure": the foot of Rachel's bed at dawn; he rolls up to her, rests beside her a while, and goes down the corridor's checkerboard. On the last "Everybody wants to rule the world" (bar 99) he lands on the nursery window's sill and the blind goes up: his son, in the nursery's one warm light, the other babies asleep. The nurse lifts him right up to the glass beside Marty, Marty trembles on the beats. Under the credits the camera comes away from the glass and finds the ward is the top floor of a building cut open, every room a place he has been, in a city at dawn; on the song's last two bars the rooms' lights come on a room a beat in the order he went through them, the last beat on the ward (`rally/finale.ts`), and once the song is over the camera comes back in on the top floor, and holds. |

The camera is authored (holds, follows and a few cuts on strikes), punches in on the tub, the winning point and each place's big shots (`<PLACE>_PUNCHES`), and
whips nowhere; over it lies a lens that leans in on Marty before each seam and opens out after it, and floats a few
thousandths of the frame throughout (`rally/score.ts`). Over every place lie a grade for each section, colour only
(`rally/fx.ts`), and a soft vignette (`rally/vignette.ts`), baked once per canvas size so that a software canvas
pays one plain draw for it; the 35 mm grain that once lay with it is gone (see the dynamic pass).

## The clock

`scripts/shows/rule-the-world-onsets.py` reads a local analysis copy of the upload's audio once (never committed) into
`scripts/shows/plans/rule-the-world-onsets.json`. The recording is steady: one comb, 112.05 bpm, fits it from the
first bar to the fade, 431 of 457 beats on an attack within 30 ms (median 5.5 ms). The comb's phase is scanned rather
than read off its angle, since the beat and its shuffle "a" pull that angle between them. Downbeats are where the
chords change and every line of the voice comes in; the stretches are named for the lines (`rally/music.ts`), and the
story's four fixed moments are `LOSS`, `CRASH`, `WIN` and `SON`.

## What the check holds

`apps/rube/checks/rally.ts`: the order of the places; every cut on a downbeat and on the song's turns, and a match cut
(the ball never moves on the screen across it); one continuous path; 529 strikes, every one within 30 ms of a beat, a
shuffle or a measured onset; the turns struck (the bass in, "Welcome", each hook, the lost point, the tub, the break,
the guitar, the broken line, the winning point, "All for freedom", his son); the matches striking most of their beats
(the Tokyo match all of them); the camera never whipping, cutting only on strikes, and keeping Marty findable and in
the Zoom frame, its wides few before the credits and the crane out over them the one wide after; Rachel only in the store, New Jersey and the ward, the baby only in the ward and small, neither ever
jumping or popping in shot; Marty orange throughout; the YouTube-only soundtrack; and the credits.

## How it was made

The plumbing (the clock, the kit after Quintessence's, the score, the seams, the check, the grain, Wally's cab drawn
once in `rally/cab.ts` for both sides of the alley's cut) came first, with stand-ins. Then each place was built to its
slot and its two seams, against the same brief, and the whole was audited frame by frame: every cut on both sides,
contact sheets of every place, the credits on the page, and playback speed, which led to the grain's baking and to
Tokyo's thousand-strong crowd being drawn straight onto the canvas.

## The second pass

A director's pass over the finished show, frame by frame: the ward's son made to read at the glass and the credits'
long hold given a push-in; New Jersey's airfield moved off across a field so the barn burns alone;
London's cards in pips (bars read as Roman numerals); the alley's way into the cab
taken round the back; the store's passage to the office lit by Murray's lamp and its last bars given the ticket; the grain softened for the pale ward.

## The subtraction pass

Then a pass the other way, cutting what the rounds had added that did not earn its place: the passing car's lamps and
the level crossing on New Jersey's road (the guitar carries the ride on its own), the two loose bills falling from
Murray's safe and the safe's light breathing with the song, London's drift toward Kay and its in-and-out cut on Endo's
last lob, and the ward's after-song gesture (Marty edging closer, the boy's hand, the lean): the push-in holds on the
two of them instead.

## The second subtraction pass

Then once more with fresh eyes, cutting the busy detail and the idle motion that the first cut had left: in the ward,
the other babies' crying (they sleep, and his son is the one awake in the one warm light), the chimney's smoke in the
window and the flashes off the tile where he lands; in the alley, the El train across the hustle, the urn's steam, the
stuttering tube, and the star-glints off the door, the bills and the house balls; at the hotel, the radiator's puffs of
steam and the cartoon marks off its clanks and the fire escape's treads, and the star on the puddle; in New Jersey, the
farmhouse chimney's smoke, its windows' flicker, the stars' and runway lights' twinkle, and the star on each burning
bale; in Tokyo, three of the four flash bulbs on the broken-off line (one stays, on the line itself), and the flash
bulbs drawn as plain bursts of light rather than stars.

## The third look

Then a look end to end on the live page as well as in stills, fixing what it showed: the shade under the credits
deepened so their small amber fine print reads over the pale wall, and tied to the cards, so that once the last has
gone no dark smudge is left over the window; and Wally, walking round to his cab, steps off the curb into the road on
its far side, so the roof comes to his chest and the camera following Marty no longer cuts off his head.

## The dynamic pass

Then a pass for life, measured: every stretch of the show sampled for how much of the picture changes, the stillest
ones filled with story on the music, and the matches played and shot as matches. The grain went first: the picture is
clean, and only the vignette is left over it.

London's matches are now played point by point, and shot that way. Kletzki attacks from close in and smashes off
Marty's loops until, stretched wide, he floats one up for the winner. In the final Marty takes a point past Endo's lunge
and the umpire turns his card level, before Endo lobs from deeper and deeper and kills the last point dead. The camera
cuts between angles on the strokes and leans with each one, the gallery's heads follow the ball and rise on the big
points, Kay applauds, and every stroke and bounce lands with a pop of light.

Tokyo's real match turns on the music: drives at the table, Endo driven off it to lob from deep, a smash he digs off the
floor, his counter, and four flat drives coming in hard to the winner. The camera cuts on the strokes (in close on the
cocked bat as he hops into its pan, side on, wide and high for the lob, low under the smashes, then in on the table
through the last bar) and punches in on the stomps and the power shots. Every head in the house follows the ball, and
the front rows rise through the last bar.

In the bowling alley the hustle is played like the money match it is: once the point is given away the camera cuts to
the raise going into Wally's palm, and the rally is cut on its strikes, in tight on Marty's bat, in tight on the mark as
he is driven back for a lob and stretched out low, and back to the table for the smash and the winner. At the hotel the
camera creeps in as the floor cracks and then goes down the fire escape at his side. In New Jersey the road's joints
throw the two of them off the seat on the beats and settle Rachel nearer him.

The store's waits are given their life: across the street the tenements wake a window a beat through the intro; the
curtain's draught sets the stockroom's bulb swinging, so the light and their two shadows sway through the pause; the
dial is seen close, the lock under it cut open, its three wheels set a bar apiece and the fence dropping as the handle
turns; and at six Murray's shadow comes in at the office door a step a beat, his hat on, his arm reaching out over the
safe as Marty freezes on the bills, to the cut. In the ward the nurse waves to him through the glass, the sun clears
the roofs in the nursery's window and the camera follows its light to the boy, and once she has him up at the glass,
father and son play their first rally through it, Marty on two and four, his son on three and one.

Then a second look at the result. Tokyo's last bar had still been one wide view, with the two of them small at either
end of the table. Now it is cut close on every stroke, his bat and then Endo, each shot a little closer than the last.
The winner holds on his bat as it fires, cuts to Endo lunging as it goes past him, and cuts wide to the whole house as
it hits the boards. The rest of the match is framed stroke by stroke, as close as each flight allows. At the safe he
springs off the dial on every beat and comes down on its notch on the "a", and the camera goes in with him on the
handle and along the door's edge as he heaves it open. In the ward, as soon as the blind is up, he knocks twice on the
glass for his son, which is why the nurse looks up, and he hops for joy when the boy wriggles back at him.

A third look found London's two decisive points still played in the rally's middle distance. Now the semifinal's
winning smash cuts in close on his bat as it fires, with the gallery's arms going up behind it, before the cut to the
hall. The final's last bar is cut close on every stroke, his bat and then Endo with Kay watching behind him. Endo's
dead shot is seen in close on his sponge, and the camera then goes low on Marty's end as the ball dies short, his bat
swings over it, and the ball rolls off the end to the floor.

## The fullness pass

Then a pass the other way from the subtractions, on a brief to make the show fuller and more spectacular: fill every
frame, give every shot a foreground, a middle and a distance moving at their own speeds, let no second stand still,
light it like a colourist, build in scale so the last third is the densest, make every change of place an event,
move the camera, and make an ending a gallery would stop for; at sixty frames a second, with the matches still the
matches, no grain, and the song as it was.

It was audited at ten frames spread evenly over the show. Six of them were more than a third empty or static: the
office round the safe, the hotel room's wallpaper, the fire escape and the street (the emptiest frames in the middle
of the show), the night road under an empty sky, the airfield, and the ward under the credits, two thirds pale wall.

**The kit.** `rally/depth.ts` holds what every place shares: parallax layers (a layer at depth `d` drifts `d` times as
fast as the machine past the frame, so a skyline at 0.2 hangs back and a front row at 1.35 slides by), dust in the
light, rain, rising embers and steam, falling confetti, soft shade, flicker and sway, and the beat as a pulse; every cloud of particles is batched into a few fills, and all of it is a pure function of
show time, so a still or a seek is the same frame as playback.

**The places.** Each was filled to its own brief, more as the song goes on:

- *The store:* the street through the window in layers (the last stars, the skyline, the Williamsburg Bridge, rooftops
  and chimney smoke, the tenements still waking a window a beat, snow and manhole steam), a milk truck and a cab whose
  lights cross the wall of boxes, the store cat in the window; lamps that swing on after they click on, dust in every
  cone, a moth at the stockroom's bulb; in the office Murray's lamp, a cigarette's smoke, a pendulum clock on the beat,
  and blind-slat light that headlamps and the El sweep across the wall.
- *London:* rain on the glass roof and the fifteen windows over London's roofs; trusses, banners and bunting in the
  draught; gangways onto the next hall, where the early rounds go on in miniature and then crowd in to watch the final;
  a press box whose cameras go up for the big points, a few plain flash bulbs among them; ball boys, pigeons,
  breath in the cold; and a front row along the bottom of the frame that follows the ball and slumps at the loss.
- *The hotel:* its light an arc from sick yellow to moonlight to wet teal and sodium. A sash window on the night, the
  El's windows sweeping the wallpaper, moths, the tap on the beats; the moon sliding out as the bulb goes; plaster
  dust after the crash; and the street filled with rain at two depths, lit windows, a billboard, washing in an
  airshaft, steam, headlights and puddle rings, and a cat on the fire escape that flinches at each pound on the rail.
- *The alley,* the show's first neon: the main floor through the back wall with three late bowlers bowling on, fans,
  smoke in layers, a stuttering beer sign, beer bubbles; a strike that sends the pins flying; outside, wet reflections
  and spray.
- *New Jersey:* a moon and clouds, three ranges of hills in parallax with a lit train in the valley, poles and fences
  going by; the fire's embers on the wind, its plume lit from below and its light on the field, the ambulance's lamp
  turning in its dome; at the airfield a turning tower beacon, a windsock, a twin taxiing, steady runway lights, mist,
  and the barn still burning on the horizon.
- *Tokyo,* the most: an upper tier and the roof's truss, a scoreboard in pips that takes his eleventh, lanterns, flags
  and fans; the house lights coming up a section at a time; press photographers at the court side; confetti and
  streamers that go on falling through the quiet; a front row on its feet.
- *The ward:* a city waking outside every window (towers, chimney smoke, the El, pigeons that lift off as the sun
  clears the roofs, snow, lit gold), a new window on the far wing where a nurse and an orderly pass, dawn going grey to
  rose to gold on the bed and the floor, a ticking clock, Rachel's drip, the nursery's mobile turning and the babies
  breathing.

**The irises.** Every seam is now a move (`rally/iris.ts`). For two beats before it the edges of the place he is
leaving go down round him; on the downbeat the next place opens out of him in a plain circle with a thin dark rim, and
the place being left, drawn live from its own pieces outside it, is pushed out past the lens and goes dim as the
circle opens (into Tokyo the circle is the airliner's round window). The lens leans in on him over the bar before and
opens out over the bars after, about where he is on the screen, so the match on him is exact and the checks still
hold it.

**The colour.** Each section has its own grade, laid in soft light from the top of the frame to the bottom
(`rally/fx.ts`): amber in the store, steel and teal in London, yellow-green to moon blue to wet teal in the hotel,
magenta over teal in the alley, night blue over fire in New Jersey, white over red in Tokyo warming to gold on the
winner, and dawn in the ward; it is laid harder as the song builds.

**The finale** (`rally/finale.ts`). Under the credits the camera comes away from the glass, and keeps coming: the ward
is the top floor of a building cut open like a doll's house, three floors of three, and every other room is a place he
has been, painted by the show's own stage (`rally/snap.ts`; Marty and the company left out). It stands in a city at
dawn, clouds going over, the El and the cabs at its foot. The building is dark as the camera finds it; on the song's
last two bars its rooms' lights come on a room a beat in the order he went through them (as the windows across the
street from the store woke a beat apiece), from the store to Tokyo, and the song's last beat is on the ward, where he
is at the glass with his son. Then every room goes on with its own place, playing its stretch over and over at ten
frames a second (a diorama's pace), and once the recording has ended the camera comes slowly back in on the top
floor, his room whole in the middle of the frame with the sun clearing the roof. The rooms are painted ahead in the
page's idle time from the show's first frame, so no frame pays for one. The check counts the wides before the credits,
and holds the crane out as the one wide after them.

**Measured.** In Chrome (headed, vsync, 3024 × 1800, the whole show at 1×) the show holds 60 frames a second before and
after: 3 frames of 15,951 over 20 ms (8 of 15,956 before), the paint on the main thread 1.8 ms a frame on average,
4.3 ms at the 95th percentile and 13.5 ms at worst (1.1, 2.1 and 4.5 before); the finale, the heaviest stretch, paints
in 3.8 ms on average. With the camera held still between two frames 0.2 s apart, so that only what moves in the
picture counts, the share of the picture moving went from 6% to 14% over the first third and from 6% to 18% over the
last, whose share of essentially still frames fell from 63% to 7%. The last third is now the fullest: the most detail,
and the most going on at once (95 separate moving things in a frame on average, against 36 in the store, where the show
opens, and 70 over the first third, which itself more than doubled). The ward stays the stillest place in it, by
design: the morning, not the crowd.

## The restraint pass

Then the note on the fullness pass: too shiny. The fullness was to come from substance (scenes, people, weather,
motion, composition), not from gloss, so every place was gone through for light laid on as an effect and it was taken
out, whichever pass had put it there. A light source is now the lit object itself (a bulb, a shade's mouth, a neon
tube, a window), and its light lies on what it falls on, laid over the picture rather than added to it; nothing hangs
in the air round it.

Out went the seams' ring of light, flash and sparks (an iris now); Marty's own glow and the grade's light leaks; the
finale's glowing path of bounces through the building, the beads that ran up it and the rings round him, the sun's
rays and the searchlights; every glint and twinkle (box labels, lock gates, bills, brass knobs, glasses, house balls,
a clock's glass, cats' eyes, cat's-eyes on the road, a warning sign); every halo round a bulb, lamp, tube, headlamp,
moon or sun; the pops of light on strokes, bounces, landings, cracks, treads and hits (the one in London from the
dynamic pass among them), the strike's flash and ring of air, the tub's and the ladder's starbursts; beams choreographed
on the beat (Tokyo's six spotlights meeting on the table, the airfield's beacon beams and chasing runway lights, the
alley's chasing marquee bulbs); the wall of flash bulbs in Tokyo, bokeh and discs at the lens, a shooting star,
fireflies, spark bursts on the solo's notes, heat shimmer, the dappled light on the ward's walls. What light stays is
motivated and plain: lamps' pools, window light, firelight on the field, a moon and a sun as discs, the muzzle flash at
the farmhouse window, the ambulance's lamp turning in its dome, a few press photographers' bulbs, each brief. The
kit no longer has any way to add light (`depth.ts`'s bloom and shaft, `pen.ts`'s glint are gone).

Every place's paint got cheaper for it. In Chrome (headed, vsync, 3024 × 1800, the whole show at 1×) it holds 60
frames a second with 1 frame of 15,958 over 20 ms, the paint on the main thread 1.5 ms a frame on average, 3.2 ms at
the 95th percentile and 9.0 ms at worst (1.8, 4.3 and 13.5 after the fullness pass); the finale paints in 2.6 ms on
average.

## The second fullness pass

Then the fullness brief again, on the show as the restraint pass had left it: fuller and more impressive, from
substance and never from gloss, with the matches still the matches and sixty frames a second.

It was audited two ways: the ten frames spread evenly over the show, as before, and a map of every second of it, the
camera held still between two frames 0.2 s apart at 640 × 360, counting the share of the picture that moves and the
separate things moving in it. The map found 49 seconds in which almost nothing moved (under 1.5% of the picture):
most of the stockroom and Murray's office, the farmhouse in New Jersey, the ward, and the crane's first seconds over
the credits. So the last third, which is to be the busiest, held the stillest stretch of the show. The frames found
the office's bare floor, the stockroom's dark back wall, the hotel street's dark lower half, the night road's empty
sky and the ward's pale walls. London and Tokyo were full already, and were left as they were.

**The places.**

- *The store:* through the stockroom's barred back window, the yard: snow, the backs of the tenements (a window
  waking on a beat), washing on a line, a chimney's smoke, and the El crossing on its trestle, slower than the room,
  so the camera's small drift as it closes on the two of them shows the depth. A mouse comes out from under the
  shelving and bolts as the store cat puts its head through the curtain; the cat follows him into the office, watches
  the safe from Murray's desk by the lamp, its ears back at the bolts, and at six trots out to meet Murray's shadow.
  Murray's worn rug fills the floor, the blind's slats rock in the radiator's air, early traffic and a second El sweep
  the wall. Past the counter's window a man walks his dog in the snow and the bakery's boy goes by on his bicycle; a
  nearer row of lamps hangs into the wall of boxes, and both rows swing in the fan's draught.
- *The hotel:* the IRT a few feet under the street, cut open. As he comes down the last ladder a local runs under him,
  its riders' hats sliding along under the pavement, the vault lights catching each window, the puddle by the ladder
  shivering. Umbrellas cross on the far pavement, a sheet of newspaper skips along on the beats, a mouse in his room
  freezes at the radiator's knocks, and headlamps sweep Mishkin's ceiling.
- *The alley:* under its floor, a crawlspace whose work lights swing at the door's slam, and a mechanic on a creeper
  pulling his wrench on the beats.
- *New Jersey:* one wind, from the left, the way the windmill's vane points: scud across the moon, washing cracking on
  a line, a curtain out of an upstairs window, a few dry leaves on the gusts. A chained dog gets up for the cab's
  lamps and barks on the backbeat; the men shift their weight, their breath going off on the wind; a man rises into
  the lit window with a rifle before the shots. Hens scatter in the barn, and at the airfield bags are towed out to
  the hold and a ground man waves the pilot on.
- *The ward:* a maternity floor at dawn, its life kept round the two of them and never across them. The next bed's
  mother rocks her baby in shadow on the partition curtain. At the far end of the glass another father taps, points,
  waves back at the nurse's wave (it was for Marty), wipes the glass with his handkerchief, and goes off with an
  unlit cigar; a father up all night falls asleep under his hat on the bench until the doctor taps it off. Behind the
  glass a student nurse bathes the babies and the night nurse walks one with its bottle, and fists and kicks show
  through the swaddles. Under the credits the orderly mops the checkerboard and the father comes back with his mother.
- *The finale* (`rally/flock.ts`, `rally/city.ts`): a pigeon loft on the roof over the ward, and a boy keeping it with
  a long pole and a rag, the Lower East Side's own dawn sport. As the crane comes away from the glass he sends the
  flock up; it sweeps across the face of the sleeping building, wheels round it under the credits, and once every room
  is lit comes round close to the lens over the lit rooms before going home to the loft. Their light is only their
  pale undersides as they bank. Next door a tenement wakes in its windows (a man shaving, a rug shaken out, a man
  behind his paper, a boy whose eyes follow the pigeons); in the street a milk truck pulls up and people go to work
  under the El; a fire escape and a telegraph pole pass close to the lens, and out wide the crane no longer locks but
  goes on drawing back along the building. The rooms are no longer dark as the camera finds them: they play dimly,
  asleep, and on the song's last two bars still light a room a beat.

**The shine.** The restraint pass had left a few glows, and these went too: the halos round the alley's tubes (now
their light washing down the wall behind), its glowing beer glass and the stutter of the tube over the lanes; the soft
light round the hotel hall's bulb (now a fixture, its light down the paper); the store's window and safe glows (now
plain light where it falls), the halos on the office wall and the stockroom transom's cold shaft; and in the ward the
glows on the walls, the gold one round Rachel's pillow, the halo round the sun and the last glints on the brass.

**Measured.** With the camera held, the share of the picture moving and the separate moving things in a frame, on
average over each third of the show:

| | Moving, before → after | Things moving, before → after | Seconds nearly still |
| --- | --- | --- | --- |
| First third | 5.3% → 6.9% | 102 → 125 | 22 → 0 |
| Middle third | 7.3% → 8.1% | 159 → 174 | 6 → 0 |
| Last third | 6.5% → 8.0% | 197 → 243 | 21 → 0 |

The last third has the most going on at once, twice the opening's; by area it is level with the middle, whose rain
and fire fill a lot of the picture, and the ward is still the quietest place in it, the morning round two balls at a
pane of glass. In Chrome (headed, 2384 × 1800, every frame at 60 fps, measured before and after on the same machine)
there is no frame over 20 ms: up to the credits the paint on the main thread is 1.6 ms a frame on average, 2.4 ms at
the 95th percentile and 7.6 ms at worst (1.3, 1.9 and 4.5 before), and the finale 4.2, 7.1 and 12.0 (3.0, 5.9 and 8.6).

## The third fullness pass

Then the same brief once more, with fresh eyes: ten new frames, each halfway between two of the last ten, and the map of
every second again, this time ranked by the stillest five seconds. The weakest were London's lost point running into
the hotel room's first seconds, the alley's master shot as the hustle begins, the crane's first seconds, the farmhouse,
the ward at the pillow and at the glass, and the stockroom's end; and two frames were more than a third empty, the
close shot on the safe (its left third dark panelling and a stool) and the night road (the cab under a bare sky).

- *The store:* the office's radiator, under the clock in the safe's close shot, knocks up for the morning, a spit of
  steam from its vent on each downbeat, Murray's red scarf over its riser and his gloves drying on top. Each El shivers
  the stockroom's boxes on their shelves and sifts dust through the bulb's light, and the near lamps over the wall of
  boxes are hung between the far ones, so the two rows read as near and far rather than a cluster.
- *London:* after the loss a ball boy runs in along the boards for the ball, as he would for any ball, slows, kneels a
  step short of it, and leaves it be as the iris opens; two pressmen raise their cameras for the picture of the loss,
  without a bulb, and a third of the gallery gets up for the gangways.
- *The hotel:* the El shakes the old room: the bulb swings out on its cord with its moths, the coat shivers on its nail
  at the radiator's knocks, and plaster sifts from the stain over the bed.
- *The alley:* the hustle draws a crowd: two regulars come to lean on the ledge by their beers, watch the ball, and wave
  a hat and slap the ledge for the strike; all three far bowlers are going from the door's slam, a night man carries
  trays along the far wall, and the slam sets the money table's lamp swinging, its pool going to and fro.
- *New Jersey:* a telegraph line runs along the road across the fields, and an airliner going their way crosses the
  moon. At the first shot the farmhouse door is flung open on the lit hall and a fourth man comes out and points after
  them; starlings go up off the washing line and someone comes to the upstairs window. At the stair the passengers sit
  in the lit windows against their seats' high backs, one turning the pages of his paper, and the stewardess walks
  aft to wait by the door; his own window is empty.
- *The ward:* while he is at the glass the corridor's traffic goes by close to the lens, low in the frame and always
  under him, as the front rows go by in London and Tokyo: a nurse in her navy cape with the dawn feed's bottles on a
  tray, a doctor reading his chart the other way, a porter with a crate of milk, a visitor in a cloche with her flowers.
  None of them comes while the nurse lifts his son to the glass or while the two of them play their first rally, and
  no one comes to the pillow. A flock off a roof across the street sweeps past the ward's window as he rolls up to
  Rachel, and again as she sends him off.

**Trimmed.** Nothing glossy had come in with the last pass (its new flashes are a dog's bark, a rifle's kick and a
cat's ear twitching, not light). Two things read wrong and were put right: the near row of lamps over the boxes, which
had hung in front of the far one as a cluster, and the airliner's passengers, who read at a glance as faces in its
round windows (a head over a curve of shoulder); they now sit to one side against their seats' backs, and fade with the
fuselage as the cabin opens round him.

**Measured,** against the show before both passes, with the camera held:

| | Moving | Things moving | Seconds nearly still |
| --- | --- | --- | --- |
| First third | 5.3% → 7.1% | 102 → 130 | 22 → 0 |
| Middle third | 7.3% → 8.4% | 159 → 181 | 6 → 0 |
| Last third | 6.5% → 8.4% | 197 → 246 | 21 → 0 |

The ward went from 2.8% of the picture moving to 6.2%, the store from 4.1% to 7.2%, the finale from 3.9% to 6.2%. The
last third has the most going on at once, nearly twice the opening's, and moves as much of the picture as the middle,
with its rain and its fire. In Chrome (headed, 2384 × 1800, every frame of the show at 60 fps, the show from before
both passes and after them painted back to back on the same machine) no frame takes 20 ms: the paint on the main
thread is 2.2 ms a frame on average, 4.7 ms at the 95th percentile and 9.8 ms at worst (2.1, 3.5 and 9.1 before), and
the finale, the heaviest stretch, 4.2 ms on average (3.1 before).

## The fourth fullness pass

The same brief once more, with the note that a pass should cut and refine as much as it adds. Ten new frames, a
quarter of the way between the first ten (0:20, 0:47 and so on to 4:19), a still every three seconds of the whole show,
and the map of every second again. No frame had an empty third that was not meant: the bare wall over the nursery's
glass as the crane begins is where the credits are set, and the white bed at the pillow is the quiet of "All for
freedom and for pleasure". The stillest stretches were the ones the last pass found, and each is quiet on purpose: the
hotel room's first seconds are a pan from the door to the tub (the map holds the camera, so a pan counts as stillness),
the alley's master shot is where the band drops out, and the crane's first seconds carry the credits. So this pass is
mostly an edit, of what the last two had added and of the shine the restraint pass had left.

- *The flock* (`flock.ts`): the loft's flock had 440 birds, and on its pass close to the lens over the lit rooms, the
  finale's high point, they turned their pale undersides over the building's face and covered it with a swarm of pale
  flecks for four seconds. It now has 180, a loft's worth, and over the building's face they are the slate of a
  pigeon's back however they turn: a flock going by in front of the rooms, which read through it. High against the
  night still overhead, their undersides still show pale as they bank.
- *The ward's other flocks:* the last pass sent a flock off a roof across the street past each of the ward's three
  windows, eight times in all, before the loft's flock had gone up. They are cut. The pigeons on the sills and the ones
  that go up into the light as the sun clears the roofs stay, and the loft's flock is the flock.
- *The store's radiator* spat a puff of steam on every downbeat, the idle puff the hotel's radiator lost in the second
  subtraction pass. It is cut; the knock, and Murray's scarf lifting at it, stay.
- *Shine:* Tokyo's two spotlights' shafts through the air over the crowd (their lenses still come on with the stomp, and
  the lamp's own cone over the table stays); the ring of haze drawn round the ward's near chair, trolley and palm to
  stand for their being out of focus, which read as a halo; the neon's coloured lines along the alley's near stool,
  glass, ashtray, ball rack and hydrant; and the pale arc on every head of Tokyo's front row. The near things are
  silhouettes now, as London's front row always was.

Kept, on a second look: the hotel's mouse, which is a story in that room's stillest seconds rather than the store's
mouse again, and the thin line down a figure's side where a lit window or a tube is behind it. Not made: a counterman
behind the alley's lunch counter, whose head would have come up under the tubes in the busiest third of the master
shot, and a higher camera over the stockroom's dark floor on the way to the office, which would have cropped the rug
that carries the next two seconds.

**Measured,** against the show as the last pass left it, with the camera held: the edit cost almost nothing in motion
(the last third 8.4% of the picture moving before and 8.3% after, and 248 separate things moving in a frame against 246,
the thinned flock no longer merging into a few big blots), and no second is nearly still. In Chrome (headed,
2384 × 1800, every frame of the show at 60 fps, before and after painted back to back on the same machine) no frame
takes 20 ms, and the edit made the paint cheaper: 1.8 ms a frame on average, 4.4 ms at the 95th percentile and 11.0 ms
at worst (2.0, 6.9 and 12.5 before), and the finale 3.9 ms on average (6.0 before), most of it the birds that are no
longer drawn.

## The fifth fullness pass

The brief again, cutting as much as it adds. Ten new frames, three quarters of the way between the first ten (0:07,
0:33 and so on to 4:06), a still every three seconds set between the last pass's, and the map of every second. No
second was nearly still and no third was empty that was not meant to be, so this pass looked at every frame at full
size for what reads wrong, and found it mostly in the ward, where the last two passes had added the most.

- *The ward's snow:* the nearer of its two falls had flakes the size of coins, and at dawn against the rose sky they
  read as white discs laid over the window, the bokeh the restraint pass had taken out of everywhere else. The near
  fall is cut, and the far one falls thicker with small flakes: snow across the street, through which the El and the
  roofs read.
- *The traffic at the glass:* four people went by close to the lens in the nine seconds with his son, one every two.
  The porter is cut (his crate of milk was the feed nurse's bottles again, and his head read as a dark blot), and so
  is the visitor with her flowers, who crossed under the nurse's reach for the baby. The nurse with the feed and the
  doctor stay, both before the wave, so the wave, the reach, the lift and the first rally have the foot of the frame
  to themselves.
- *The near silhouettes:* the last pass drew the ward's near chair, trolley and palm as plain silhouettes, filled
  even-odd, so wherever a leg crossed a shelf or the chair's hoop the crossing was a hole: the trolley under the father
  at the glass was a checkerboard. They are filled by winding now, and so are the people going by (the feed nurse,
  walking right to left, had a hole where her arm crossed her).
- *The airliner's cabin:* from the stair its windows show passengers in their seats, one turning the pages of his
  paper, and the stewardess coming aft to wait for him; then the cabin opened round him on empty seats. The seat at
  his window stays empty. In the next a man reads the evening paper, his hat up on the rack, turning a page as he did
  in the window, and the stewardess stands in the aisle beside his seat facing the door; as he gets up onto his sill
  she bows to him, and the iris closes over her. He goes into Tokyo, which ends on Endo's bow, on a bow.

Kept, on a second look: the cigarette smoke curling up into the blind's light over Murray's desk (smoke, not a glint),
and the shade under the credits, which looks like a smudge on the ward's ceiling in a still but is where the words
are set.

**Measured,** against the show as the last pass left it, with the camera held: the first and middle thirds are as they
were, and the last third goes from 8.2% of the picture moving to 7.9% (248 separate things moving in a frame to 239),
all of it the ward, 6.1% to 5.1%: the near snow and the two people cut. The ward's quietest seconds are still the
pillow's, and no second in the show is nearly still. In Chrome (headed, 2384 × 1800, every frame of the show at 60 fps,
before and after painted back to back) no frame takes 20 ms: 1.6 ms a frame on average, 3.9 ms at the 95th percentile
and 8.6 ms at worst, against 1.8, 4.1 and 13.2 before, a difference within the run's noise (London, which this pass did
not touch, moved as much). The cabin's two people and the ward's thicker snow cost nothing that shows.

## The polish wave

A careful watch for what looks wrong or cheap, in the wide frame and the tall (phone) one, then a timing audit.

- *The alley's door* (136 s): Wally walked out of the alley a step back from the door, so his feet hung in its glass
  over the step. He now comes forward across the carpet to the sill, goes through on it, and steps down behind the
  cab's nose into the road. The mark who bets stood with his shoes on the house balls' tops over the rack; he stands a
  step back toward the counter, clear of them.
- *Murray's shadow* (51–52.5 s): the arm that comes out over the safe was a plank of even width with no hand. It is a
  coat sleeve now, bent a little at the elbow and narrowing to the wrist, and a hand whose fingers spread as it comes,
  in the same shape as the rest of him, so it is no darker where it meets the coat.
- *The store in a tall frame*: the clutter near the lens stood on a fixed line, so in a phone's frame it floated as dark
  slabs in the middle of the floor. It stands below the foot of the frame however tall the frame is.
- *The ward's near things*: the palm, the trolley and the chair close to the lens were drawn at seven tenths, so the
  bench and the wainscot read through the palm's pot. They are solid, as London's and Tokyo's front rows are.
- *The finale in a tall frame*: the El's columns ran on down to the foot of a phone's frame, ribbing its lower third.
  They stand on footings in the near street, which goes dark toward the lens; a wide frame never reaches it.

**Timing.** Every cut is on its downbeat within 17 ms of the measured landmark, and the four story hits land on their
beats: the dead ball on bar 41, the floor giving on bar 48, the cut to the winner on bar 89, the blind going up on bar
99. Nothing was retimed.

## Polish wave 2

Another watch from the top, wide and tall, looking for what still reads cheap.

- *The safe's open door* (42–52 s): swung back on its hinges it showed a plain dark slab beside the safe, its inner
  plate barely a shade off its face and its hinges not drawn, so it read as a second black box. Its inner face now
  shows the bolt-work the door hid (the lock's case, its three bars out to the bolts, the upright that throws them) on
  a plate a shade lighter, and the hinge knuckles join it to the safe.
- *London's bats*: a player's hand was drawn on the blade's very edge, so the handle never showed and Endo's sponge
  read as a plate held by its rim. The hand now closes on the handle a little way off the blade, and the handle shows
  between them.
- *The stewardess* (174–178 s): her arm was the jacket's navy over the jacket, so only her hand showed, floating at her
  waist. The sleeve is a shade darker than the jacket, with the blouse's cuff at the wrist.

Looked at and left alone: Mishkin leaning out (he goes out through the open window, not the wall), the farmhouse's
men, the airfield, the alley's hustle.

## Polish wave 3

The phone held upright, and the ward's people.

- *The tall frame*: a stage taller than 16:9 set the composed frame midway, so on a phone each place sat on a slab of
  bare floor or dark field as tall as itself. Every place stands on a floor or the ground with a ceiling, the stands
  or the sky over it, so the frame now sits lower (`tall: 0.7`): London's glass roof, Tokyo's upper tiers, the night
  over New Jersey and the dawn over the finale's roofs, and less floor. The credits, set at the top of the 16:9 box,
  came down with it onto the roofline; they rise into the dawn sky in a tall frame (`lift`), and a wide one is as it
  was.
- *New Jersey's stars* stopped two thirds of the way up the sky, which a tall frame now showed as a bare band over the
  barn. They go on up, as thick; a wide frame never sees the new ones.
- *Arms in the ward*: the people seen front on had arms the colour of their coats, so the father asleep on the bench
  had two hands on his chest and no arms. Their arms are in the coat's shade now, as the folded ones already were.
- *The corridor's pigeon* strutted on the ledge right over the sleeping father, so it stood on his hat's brim. It keeps
  to the ledge's far end.

## Polish wave 4

Staging and transitions: every seam a quarter of a second either side, the four story beats frame by frame, and the
visual hits against the beat.

- *The tub through the floor* (bar 48): the heap of plaster over Mishkin flew up and faded as he burst out, so for a
  quarter of a second he showed through it like a ghost. Nothing fades now: the heap slumps flat onto the bed as he
  comes up out of it, its pieces and the laths are thrown off to either side, and they come down on the blanket and
  lie there.

**Timing.** The store's lamps, the hotel floor's cracks and the finale's rooms all come from the measured beats (the
first room starts to light on bar 113's downbeat, 240.95 s, and is up within a fifth of a second); the seams open on
Marty on their downbeats. Looked at and left alone: the six seams, the winning point's cuts, the lost point, the
finale's last frames.

## Polish wave 5

Detail at full size, at stills set between the earlier waves', for the same faults the last waves found elsewhere.

- *The alley's arms*: everyone in the alley had a near arm the colour of their coat, so the hustler's bat arm vanished
  into his grey coat and the bat hung at his waist on nothing. The near arm is a shade under the coat now, as in the
  ward.
- *Endo's bat in Tokyo* was held by the blade's edge, as London's were before the second wave; his hand closes on the
  handle a little way off the sponge.

**Measured.** The phone runs of the earlier waves showed sixteen frames over 20 ms and one of about a fifth of a
second. Timed against the clock, every one falls on the harness's own screenshot, taken every fifteen seconds of a page
at three times the pixels; between them the show drops none.
