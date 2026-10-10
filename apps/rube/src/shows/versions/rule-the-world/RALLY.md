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

One ball on one path. Every change of place is a match cut on Marty at rest: the camera carries his place on the
screen across, so he holds still while the world round him becomes somewhere else (`rally/seams.ts`).

| Show time | Bars | Place | What happens |
| --- | --- | --- | --- |
| 0 | 1–24 | **The shoe store** (`store/`) | Uncle Murray's store on the Lower East Side before it opens. Marty ticks on his toy sprung bat on the counter through the intro; on the bass (bar 5) the lamps click on along the store a beat apiece and the bat fires him up the wall of shoe boxes, whose ends pop out as stairs; the library ladder rolls on its rail, a shoehorn, a fitting stool's footrest, the measuring device's slider. Into the stockroom: Rachel, a pause together under one bulb (the film's "Forever Young"). On "Welcome to your life / There's no turning back" (bar 14) he knocks open Murray's office door on the light of his desk lamp and works the safe's dial a click a landing, the handle, the bolts, the door; he settles on the bills, the plain ticket to London rising from the bundle, the clock clicking over to six. |
| 52.455 | 25–42 | **London** (`london/`) | On the first "Everybody wants to rule the world": the British Open, a cold iron-and-glass hall, two green tables under cone lamps. The semifinal against Kletzki, every beat a bat; Kletzki misses on 31.4 and the camera cuts to the whole hall. The final against Endo and his sponge bat, Kay Stone in the front row in pearls; the umpire's cards in pips. On "Nothing ever lasts forever" (bar 41) Endo's dead shot dies past Marty's bat; Kay's glove falls; Marty rolls off the end onto the floorboards. |
| 91.016 | 43–56 | **The hotel** (`hotel/`) | On the second hook: a run-down hotel cut open, his room's sickly wallpaper and clawfoot tub. On "There's a room where the light won't find you" the bulb goes out and the moon comes in; the floor cracks a beat at a time; on "the walls come tumbling down" (bar 48) the tub goes through the floor onto Mishkin, reading in bed below (the camera punches in). A bonk on Mishkin's head, out of the window, and down the fire escape a tread a beat to "So glad we've almost made it"; the counterweighted ladder, the wet pavement. |
| 121.018 | 57–64 | **The bowling alley** (`alley/`) | As the band drops out: Queens after midnight, and a table in the back for money games. Wally holds the stakes. The hustle: the first point thrown on purpose (the bets go up), then every beat a bat; the winner flies off the table down a lane into all ten pins, the marks' hats come off, Marty rides the ball return back under the floor and pops out of its hood, and rolls along the curb behind Wally's cab to drop in over its trunk. |
| 138.142 | 65–82 | **New Jersey** (`jersey/`) | As the guitar comes in: the same cab, now on a night road, Rachel beside him on the seat. The farmhouse, Mishkin's men, white bursts at a window; a lantern into the hay and the barn on fire through the solo; Rachel hurt, an ambulance's red light on the beats, the doors close on her. "I can't stand this indecision": across the dark field toward the airfield, back toward the ambulance's tail lights, and across again; up the stair a step a beat, to the round window. |
| 176.689 | 83–94 | **Tokyo** (`tokyo/`) | On "Everybody wants to rule the -", broken off: the exhibition he is meant to throw, one table under one lamp in a packed arena, GIs in a block of the stands. He stamps and the house lights come up; on "never, never, never, never" the real match, all sixteen beats bats and all sixteen shuffles bounces; the winning smash on the "Everybody" (bar 89, the camera punches in), caps in the air, streamers, flash bulbs. Then quiet: Endo picks him off the floor, sets him on the end line, bows, and the lights go down to the one lamp. |
| 202.391 | 95–end | **The ward** (`hospital/`) | On "All for freedom and for pleasure": the foot of Rachel's bed at dawn; he rolls up to her, a warm glow between them, and goes down the corridor's checkerboard. On the last "Everybody wants to rule the world" (bar 99) he lands on the nursery window's sill and the blind goes up: his son, in the nursery's one warm light. The other babies cry, the nurse lifts him right up to the glass beside Marty, Marty trembles on the beats. Under the credits the hall's light goes down round the lit window and the camera pushes in slowly on the two of them, and holds. |

The camera is authored (holds, follows and a few cuts on strikes), punches in twice (the tub, the winning point), and
whips nowhere. Over every place lie a 35 mm grain and a soft vignette (`rally/grain.ts`), baked once per canvas size
into a few frames so that a software canvas pays one plain draw for them.

## The clock

`scripts/shows/rule-the-world-onsets.py` reads a local analysis copy of the upload's audio once (never committed) into
`scripts/shows/plans/rule-the-world-onsets.json`. The recording is steady: one comb, 112.05 bpm, fits it from the
first bar to the fade, 431 of 457 beats on an attack within 30 ms (median 5.5 ms). The comb's phase is scanned rather
than read off its angle, since the beat and its shuffle "a" pull that angle between them. Downbeats are where the
chords change and every line of the voice comes in; the stretches are named for the lines (`rally/music.ts`), and the
story's four fixed moments are `LOSS`, `CRASH`, `WIN` and `SON`.

## What the check holds

`apps/rube/checks/rally.ts`: the order of the places; every cut on a downbeat and on the song's turns, and a match cut
(the ball never moves on the screen across it); one continuous path; 548 strikes, every one within 30 ms of a beat, a
shuffle or a measured onset; the turns struck (the bass in, "Welcome", each hook, the lost point, the tub, the break,
the guitar, the broken line, the winning point, "All for freedom", his son); the matches striking most of their beats
(the Tokyo match all of them); the camera never whipping, cutting only on strikes, and keeping Marty findable and in
the Zoom frame; Rachel only in the store, New Jersey and the ward, the baby only in the ward and small, neither ever
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
