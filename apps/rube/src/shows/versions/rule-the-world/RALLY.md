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
blooms open out of him in a ring of its own light (`rally/bloom.ts`, see the fullness pass).

| Show time | Bars | Place | What happens |
| --- | --- | --- | --- |
| 0 | 1–24 | **The shoe store** (`store/`) | Uncle Murray's store on the Lower East Side before it opens. Marty ticks on his toy sprung bat on the counter through the intro; on the bass (bar 5) the lamps click on along the store a beat apiece and the bat fires him up the wall of shoe boxes, whose ends pop out as stairs; the library ladder rolls on its rail, a shoehorn, a fitting stool's footrest, the measuring device's slider. Into the stockroom: Rachel, a pause together under one bulb (the film's "Forever Young"). On "Welcome to your life / There's no turning back" (bar 14) he knocks open Murray's office door on the light of his desk lamp and works the safe's dial a click a landing, the handle, the bolts, the door; he settles on the bills, the plain ticket to London rising from the bundle, the clock clicking over to six. |
| 52.455 | 25–42 | **London** (`london/`) | On the first "Everybody wants to rule the world": the British Open, a cold iron-and-glass hall, two green tables under cone lamps. The semifinal against Kletzki, every beat a bat; Kletzki misses on 31.4 and the camera cuts to the whole hall. The final against Endo and his sponge bat, Kay Stone in the front row in pearls; the umpire's cards in pips. On "Nothing ever lasts forever" (bar 41) Endo's dead shot dies past Marty's bat; Kay's glove falls; Marty rolls off the end onto the floorboards. |
| 91.016 | 43–56 | **The hotel** (`hotel/`) | On the second hook: a run-down hotel cut open, his room's sickly wallpaper and clawfoot tub. On "There's a room where the light won't find you" the bulb goes out and the moon comes in; the floor cracks a beat at a time; on "the walls come tumbling down" (bar 48) the tub goes through the floor onto Mishkin, reading in bed below (the camera punches in). A bonk on Mishkin's head, out of the window, and down the fire escape a tread a beat to "So glad we've almost made it"; the counterweighted ladder, the wet pavement. |
| 121.018 | 57–64 | **The bowling alley** (`alley/`) | As the band drops out: Queens after midnight, and a table in the back for money games. Wally holds the stakes. The hustle: the first point thrown on purpose (the bets go up), then every beat a bat; the winner flies off the table down a lane into all ten pins, the marks' hats come off, Marty rides the ball return back under the floor and pops out of its hood, and rolls along the curb behind Wally's cab to drop in over its trunk. |
| 138.142 | 65–82 | **New Jersey** (`jersey/`) | As the guitar comes in: the same cab, now on a night road, Rachel beside him on the seat. The farmhouse, Mishkin's men, white bursts at a window; a lantern into the hay and the barn on fire through the solo; Rachel hurt, an ambulance's red light on the beats, the doors close on her. "I can't stand this indecision": across the dark field toward the airfield, back toward the ambulance's tail lights, and across again; up the stair a step a beat, to the round window. |
| 176.689 | 83–94 | **Tokyo** (`tokyo/`) | On "Everybody wants to rule the -", broken off: the exhibition he is meant to throw, one table under one lamp in a packed arena, GIs in a block of the stands. He stamps and the house lights come up; on "never, never, never, never" the real match, all sixteen beats bats and all sixteen shuffles bounces; the winning smash on the "Everybody" (bar 89, the camera punches in), caps in the air, streamers, flash bulbs. Then quiet: Endo picks him off the floor, sets him on the end line, bows, and the lights go down to the one lamp. |
| 202.391 | 95–end | **The ward** (`hospital/`) | On "All for freedom and for pleasure": the foot of Rachel's bed at dawn; he rolls up to her, a warm glow between them, and goes down the corridor's checkerboard. On the last "Everybody wants to rule the world" (bar 99) he lands on the nursery window's sill and the blind goes up: his son, in the nursery's one warm light, the other babies asleep. The nurse lifts him right up to the glass beside Marty, Marty trembles on the beats. Under the credits the camera comes away from the glass and finds the ward is the top floor of a building cut open, every floor a place he has been, in a city at dawn; the light of his path runs up through it a room a beat on the song's last two bars and comes to him on the last beat (`rally/finale.ts`), and the camera pushes in slowly on him at the glass, and holds. |

The camera is authored (holds, follows and a few cuts on strikes), punches in on the tub, the winning point and each place's big shots (`<PLACE>_PUNCHES`), and
whips nowhere; over it lies a lens that leans in on Marty before each seam and opens out after it, and floats a few
thousandths of the frame throughout (`rally/score.ts`). Over every place lie Marty's own light, a grade for each
section (`rally/fx.ts`) and a soft vignette (`rally/vignette.ts`), baked once per canvas size so that a software canvas
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
light, rain, rising embers and steam, falling confetti, light shafts, added bloom and soft shade, flicker and sway,
and the beat as a pulse; every cloud of particles is batched into a few fills, and all of it is a pure function of
show time, so a still or a seek is the same frame as playback.

**The places.** Each was filled to its own brief, more as the song goes on:

- *The store:* the street through the window in layers (the last stars, the skyline, the Williamsburg Bridge, rooftops
  and chimney smoke, the tenements still waking a window a beat, snow and manhole steam), a milk truck and a cab whose
  lights cross the wall of boxes, the store cat in the window; lamps that swing on after they click on, dust in every
  cone, a moth at the stockroom's bulb; in the office Murray's lamp, a cigarette's smoke, a pendulum clock on the beat,
  and blind-slat light that headlamps and the El sweep across the wall.
- *London:* rain on the glass roof and the fifteen windows over London's roofs; trusses, banners and bunting in the
  draught; gangways onto the next hall, where the early rounds go on in miniature and then crowd in to watch the final;
  a press box whose flashes quicken toward the final and hold their breath for the dead shot; ball boys, pigeons,
  breath in the cold; and a front row along the bottom of the frame that follows the ball and slumps at the loss.
- *The hotel:* its light an arc from sick yellow to moonlight to wet teal and sodium. A sash window on the night, the
  El's windows sweeping the wallpaper, moths, the tap on the beats; the moon sliding out as the bulb goes; plaster
  dust after the crash; and the street filled with rain at two depths, lit windows, a billboard, washing in an
  airshaft, steam, headlights and puddle rings, and a cat on the fire escape that flinches at each pound on the rail.
- *The alley,* the show's first neon: the main floor through the back wall with three late bowlers bowling on, fans,
  smoke in layers, a stuttering beer sign, beer bubbles; a strike that explodes; outside, wet reflections and spray.
- *New Jersey:* a moon and clouds, three ranges of hills in parallax with a lit train in the valley, poles and fences
  going by; the fire's embers in hundreds, its plume lit from below and its sparks on the solo's big notes, the
  ambulance's beacon turning; at the airfield a tower beacon that turns half a turn a bar, searchlights, a windsock, a
  twin taxiing, runway lights chasing on the beats, mist, and the barn still burning on the horizon.
- *Tokyo,* the most: an upper tier and the roof's truss, a scoreboard in pips that takes his eleventh, lanterns, flags
  and fans; six spotlights that meet on the table on every beat, cross between and lock on his bat for the winner; a
  wall of flash bulbs; confetti and streamers that go on falling through the quiet; a front row on its feet.
- *The ward:* a city waking outside every window (towers, chimney smoke, the El, pigeons that lift off as the sun
  clears the roofs, snow, lit gold), a new window on the far wing where a nurse and an orderly pass, dawn going grey to
  rose to gold in shafts and dust, morning light dappling the walls as leaves move outside, a ticking clock, Rachel's
  drip, the nursery's mobile turning and the babies breathing.

**The blooms.** Every seam is now an event (`rally/bloom.ts`). For two beats before it the place he is leaving gathers
in on him, its edges going down and a glow of the next place's colour coming up round him; on the downbeat the next
place bursts out of him in a ring of its own light, and the place being left, drawn live from its own pieces outside
the ring, is pushed out past the lens and goes dark as the ring opens: paper white into London, the hotel's sick
yellow, neon into the alley, headlights into the night, flash-bulb white and bunting red into Tokyo (through the
airliner's round window), and dawn. The lens leans in on him over the bar before and opens out over the bars after,
about where he is on the screen, so the match on him is exact and the checks still hold it.

**The light.** Marty carries a little light of his own, strongest in the dark places. Each section has its own grade,
laid in soft light from the top of the frame to the bottom with two slow leaks of light round the edges (`rally/fx.ts`):
amber in the store, steel and teal in London, yellow-green to moon blue to wet teal in the hotel, magenta over teal in
the alley, night blue over fire in New Jersey, white over red in Tokyo flaring gold on the winner, and dawn in the
ward; it is laid harder as the song builds.

**The finale** (`rally/finale.ts`). Under the credits the camera comes away from the glass, and keeps coming: the ward
is the top floor of a building cut open like a doll's house, three floors of three, and every other room is a place he
has been, painted by the show's own stage at its moment (`rally/snap.ts`; Marty and the company left out). It stands in
a city at dawn, the sun coming up behind it, clouds going over, searchlights in the sky, the El and the cabs at its
foot. The building is dark as the camera finds it; on the song's last two bars the light of his path runs up through
it, bounce by bounce and up the pipes on its sides, a room a beat (as the windows across the street from the store
woke a beat apiece), each room's lights coming on as it passes, and comes to him at the glass on the song's last beat.
Then every room runs, playing its stretch of its place over and over at ten frames a second (a diorama's pace), a
bead of light leaves the store every half bar and runs all the way up to him, rings of his orange go out from him at
the glass, and through the quiet after the song the camera pushes slowly in on him there, the building still whole.
The rooms are painted ahead in the page's idle time from the show's first frame, so no frame pays for one. The check
counts the wides before the credits, and holds the crane out as the one wide after them.

**Measured.** In Chrome (headed, vsync, 3024 × 1800, the whole show at 1×) the show holds 60 frames a second before and
after: 3 frames of 15,951 over 20 ms (8 of 15,956 before), the paint on the main thread 1.8 ms a frame on average,
4.3 ms at the 95th percentile and 13.5 ms at worst (1.1, 2.1 and 4.5 before); the finale, the heaviest stretch, paints
in 3.8 ms on average. With the camera held still between two frames 0.2 s apart, so that only what moves in the
picture counts, the share of the picture moving went from 6% to 14% over the first third and from 6% to 18% over the
last, whose share of essentially still frames fell from 63% to 7%. The last third is now the fullest: the most detail,
and the most going on at once (95 separate moving things in a frame on average, against 36 in the store, where the show
opens, and 70 over the first third, which itself more than doubled). The ward stays the stillest place in it, by
design: the morning, not the crowd.
