# Soft Lamp (Opus 5.5)

`/shows/soft-lamp/opus55/` (also `/shows/soft-lamp/`), in the picker as **Soft Lamp**, one take, **Opus 5.5**, on the
**Ambient** shelf beside Gymnopédie.

Half an hour of Lofi Girl's *Best of lofi hip hop 2021*, its first twelve tracks, round a small machine on a study desk
by a window, from dusk into a rainy night. It is music to study to, and the picture is meant to be left on, in the
manner of the streams it plays: one room, one lamp, one ball and a small round it makes once a track, and a cat
watching it.

## The music

**Source.** Lofi Girl's own upload, *Best of lofi hip hop 2021 ✨ [beats to relax/study to]*
([n61ULEU7CO0](https://www.youtube.com/watch?v=n61ULEU7CO0), 6 h 11 min), played by YouTube from the video's first
second, so show time is the video's time. Nothing of the mix is shipped; there is no local recording at all
(`ATTRIBUTION.txt`). The live stream (rFZHOHl-L8A) was the mood reference only: a live stream has no fixed clock to time
a picture to.

**Why this window.** The compilation is a radio's hour cut into tracks with a breath of near-silence between them (a
second or so, below -50 dB), no crossfades. Its first twelve tracks run from 0:02.0 to 30:12.4, where *Passing By* fades
to its floor and the thirteenth comes in under it; the cue stops there with a two-second fade riding the track's own.
That is the half hour.

**Measured once.** `scripts/shows/soft-lamp-onsets.py` reads a local analysis copy of the video's first forty minutes
(fetched with yt-dlp into the git-ignored `out/`, never committed) and writes `scripts/shows/plans/soft-lamp-onsets.json`:

- each track's first and last audible moments, between the measured gaps;
- its grid: every track is made to a click that never moves, a whole number of beats a minute (65 to 94), fitted to
  the sharp rises of the kick band and the crack band on sample-exact 4 ms frames;
- its downbeats. The grooves put the kick on one and the crack on two and four (Breathtaking and Daydream are
  half-time: the crack on three alone), so the bar's phase is the one the kick hits most while the crack keeps off one
  and three; where that leaves a two-beat tie, the drums' entries break it (an entry a beat early counts as a pickup);
- which bars have the kit playing (the low band, a mean over the bar, so a kick pattern's gaps count for nothing);
- per beat, how hard the kick and the crack are struck; and every fifth of a second, the mix's loudness and how full
  its held sound is (the pad and the keys, a median over each band so the attacks count for little).

Two things went wrong on the way and were caught by drawing the attacks bar by bar (a raster, one row a bar): a frame
of `int(SR * 0.004)` samples is 3.991 ms, not 4, which scaled every time by 0.23% and made every track look played
slow; and a beat's loudness window caught the next kick's attack (kicks are struck a few milliseconds ahead of the
grid), which put four tracks' downbeats a beat early, snare on one and three. Both fixed; every track's rows now stand
straight, kick on one, crack on two and four (or three).

### The cue map

| # | Track | Artists | Tempo | Starts | Drums in (drop) | Breaks | Drums out (lob → sill) | Ends |
| - | - | - | - | - | - | - | - | - |
| 1 | morning moon | Kanisan, Wishes and Dreams | 80 | 0:02.0 | 0:20.2 | 1:08.2–1:32.2 | 2:06.7 → 2:08.2 | 2:23.3 |
| 2 | Lavender | Kupla | 79 | 2:23.3 | 2:47.3 | — | 4:23.0 → 4:24.5 | 4:51.1 |
| 3 | Destination Unknown | amies | 80 | 4:52.2 | 5:13.7 | 6:01.7–6:13.7 | 7:12.2 → 7:13.7 | 7:39.6 |
| 4 | Overgrown | Tenno | 67 | 7:43.3 | 8:09.0 | — | 9:36.8 → 9:38.6 | 9:55.5 |
| 5 | Magical Connection | Peak Twilight, Prithvi | 75 | 9:55.5 | 10:18.8 | 11:10.1–11:35.7 | 12:15.7 → 12:17.3 | 12:29.3 |
| 6 | Blooming Dales | Krynoze, Diiolme | 70 | 12:29.3 | 12:54.4 | 13:49.3–14:03.0 | 14:56.1 → 14:57.8 | 15:14.2 |
| 7 | Exhale | No Spirit | 71 | 15:14.2 | 15:40.2 | — | 17:53.7 → 17:55.4 | 18:00.7 |
| 8 | Stargazing | kyu | 65 | 18:00.7 | 18:13.1 | 19:08.4–19:26.9 | 19:54.6 → 19:56.4 | 20:14.4 |
| 9 | Breathtaking | Purrple Cat | 90 (half-time) | 20:14.4 | 20:33.2 | 21:37.2–21:42.5 | 23:09.2 → 23:10.5 | 23:21.4 |
| 10 | takeoff | stream_error | 74 | 23:21.4 | 23:33.6 | — | 25:15.7 → 25:17.4 | 25:30.7 |
| 11 | Daydream | kyu | 94 (half-time) | 25:30.7 | 25:47.7 | 26:49.0–27:09.4 | 27:49.0 → 27:50.3 | 28:11.7 |
| 12 | Passing By | Casiio, Sleepermane | 78 | 28:12.6 | 28:35.8 | — | 29:49.7 (stays) | 30:12.4 |

Every track has the same shape, and the show is built on it: an intro with no drums; the drums in on a downbeat; the
groove in phrases of four and eight bars, most with a break of a few bars; the drums out for good on a downbeat; a short
outro into the breath before the next.

## The desk

Left to right: a curtain tied back, and the window over the desk with fairy lights strung across its top; on its sill
a plant in a clay pot; a mug under the sill, and beside it a ginger kitten loafed on the desk; three books
stacked into a stair that steps down to the right, under the sill's right end; the headphones set down on the desk, the
near cup lying on its back, cushion up, the band arching over to the far cup standing on its edge; and over it all,
from the right, an architect's lamp, its shade turned down onto the books and the cup. On the wall between the window
and the lamp, polaroids and notes pinned up in the lamp's light; on the far wall, a small print. The ball is a
ping-pong ball, so a cell is about 15 cm and everything is its real size (the cat is a kitten).

**One job to a thing.**

- **The lamp** is the light, and nothing else. The room opens dark, lit only by the window; the lamp warms on over a
  second and a half as the first track's first chord sounds, breathes a few per cent with the held sound, is a shade
  warmer or paler for each track (eased across the breath between them), and goes down to a glow as the last track
  rings out. Its pool is the frame's brightest place, and the ball is brightest in it.
- **The window** is the evening, and the half hour's clock (`lamp/sky.ts`). It opens on the last of a dusk, violet over
  peach, a few clouds lit from under; the blue hour; the clouds come over and it rains from the third track, heaviest
  through Exhale; it eases, the glass stays wet a while, and by the last two tracks it is clear, with stars and the
  moon risen into the right-hand pane (and, late, two shooting stars, which the cat looks up at). In the heaviest rain,
  lightning far off lights the clouds three times. What is past the glass has depth: it moves against the bars as the
  camera moves, and goes soft, its lights opening into discs, when the camera is close at the desk (`lamp/lens.ts`). Outside, the city's windows come on
  through the dusk and go out one by one through the night, a few of them the cool flicker of a screen; one, close,
  is a neighbour's, lit until a little before the end, where now and then someone crosses and a cat sits a while; a red light
  blinks on the tallest roof; now and then a plane crosses when the sky is clear. On the glass, beads gather where
  they land and a few run down in fits and starts.
- **The fairy lights** come on bulb by bulb just after the lamp, breathe with the held sound, each at its own pace,
  and go down to a low glow by the moon at the end.
- **The mug**'s steam is the held sound, the pad and the keys under each track: three soft wisps, fuller as it swells,
  thinner through the night as the tea cools.
- **The books** are the stair down.
- **The headphones**' near cup is the listener's seat: the cup plays the kick, and the ball nods to it. Their cable
  runs along the desk to the Walkman, whose reels are the half hour's progress.
- **The plant pot** is the stop the ball comes back off, and it rocks when it does.
- **The cat** is the audience (`lamp/cat.ts`). Its head and eyes follow the ball, a little behind, as a cat's do: up
  at the sill over its head, round to the stair beside it, into the cup. It blinks, now and then slowly. An ear flicks
  when the ball knocks the pot or lands on the sill. Through the groove, a phrase at a time and each phrase its own
  choice, it either keeps watching or shuts its eyes in the content arch and nods along on the beat, the tip of its
  tail swaying a bar at a time; it comes out of it ahead of a break and ahead of the lob, to watch. Four times, watching,
  it washes: a paw licked and drawn over its ear. When the last
  track's drums leave, it climbs the books to the sill and sleeps there, under the moon. Twice it gets up and stretches, front out long and rear up,
  with a yawn, and settles back down.
- **Someone** is at the desk, where the camera is: never seen but for a hand in a sweater's sleeve. It turns the lamp
  on as the show opens and down as it ends; between, it takes a sip, scratches the kitten under its chin, rests round
  the mug in the rain, draws a face in the mist on the glass, and a little after midnight takes the cold tea away and
  brings it back hot (`lamp/hands.ts`).

**The design system.** One ink for every line, the ball's included, at the ball's weight (structure at full weight,
detail at half or less, decoration hardly at all). Two lights and the room between them, as a lofi room is lit: the
lamp's peach-amber (the light, the wood, the clay, the cat, the warm books, the fairy lights) and the window's
violet-to-blue (the sky, the wall round it, the curtain, the glass), over an indigo room and a cream. Unlit things are
dusky, not black: the room is lit by the window too. The finish is the streams': the lamp's bloom, a soft vignette, and
a film's grain changing a dozen times a second.

## The lap

A lap a track, the same round each time, timed to that track's own shape (`lamp/route.ts`):

1. **The sill.** Through the end of one track and the start of the next (the outro, the breath between, the intro: no
   drums), the ball walks the sill from the pot to its right end, in front of the rain, at an even pace (eased off the
   pot and into the tip), never quite still.
2. **The drop.** It goes over the end (it pivots on the corner and falls) and lands on the top book as the drums come
   in, exactly on their first downbeat.
3. **The stair.** It rolls to the book's edge and steps down, a half bar a step, each landing on a strong beat (one or
   three). The bottom book is the thick one and the cup lies a little in front of its end, so the last step is a drop
   into the cup's hollow, landing on its beat with a squash, and one small damped rock settles it.
4. **The cup.** Through the groove it sits there like a listener. On a kick struck on one or three (as hard as it was
   struck, as full as the bar is) the cushion pushes it up a little and it comes back down with a small second bob, so a
   nod settles rather than stops dead. It sways slowly side to side, a sway every two bars. Through a break there are no
   kicks, and it only sways.
5. **The lob.** On the last bar of drums, beat three, the ball crouches into the cushion and the cup's last kick lobs
   it back over the books; it lands on the sill as the drums leave, on the downbeat, rolls into the plant pot, and comes
   back off it at a walk. The lob's height is the track's own: two beats' flight, so it goes higher on the slow tracks.

The last track has no lob. The drums leave, and the ball stays in the cup, its sway dying away as the music ends and
the lamp goes down: the listener asleep.

Every leg starts where and as fast as the one before it ends; the only changes of speed faster than the world's
gravity are landings, the cushion's push, and the pot.

## The camera

A slow operator a little behind what they decide to look at (`lamp/camera.ts`): a list of held frames, followed by a
triple-pole critically damped rig, so every move starts with neither speed nor acceleration and settles without
overshooting over about six seconds. It is the sum of each aim's step response: a function of time, so scrubbing back is
the same frame as playing forward.

The frames: the room (the show opens and closes on it); the sill walk (the frame keeping a little ahead of the ball,
resting at the sill's end); the stair, a bar and a half before each drop; and through each groove, a phrase (eight
bars) at a time, four looks at the same desk, each track taking them in its own order:

- the cup, close: the ball in its seat, the stair's foot, the band rising out of frame;
- the desk under the lamp: the cat, books, cup, band and the whole lamp over them;
- the window over the desk: the rain, the plant and the mug, and the machine small under the lamp;
- the lamp's side: the shade, the band's arch, the cup under the light.

A break draws back to the room (one long enough for the move to settle), and so does the bar before each lob, so the
whole arc is in the frame.

Every held frame is composed: each prop in it whole and clear of the frame's edges by a tenth of a cell, or not in it
at all (the props stand across the desk with few gaps between them, so each frame is solved for edges that fall in
those gaps). Under Zoom (the same frame half again closer) the ball is in the picture 99.9% of the half hour.

## The words

The title, **Soft Lamp**, with *Lofi Girl · Best of lofi hip hop 2021* under it, on the dark wall right of the window
as the lamp comes on. Each track's name and artists, small and brief, over the glass as it begins, as a radio says what
it is playing. The credits (Directed by Stephen Wu and Claude Opus 5.5, drawn with p5.js; Music, Lofi Girl, *Best of
lofi hip hop 2021*, its first twelve tracks) on the dark wall while the last track rings out.

## Director's passes

What each round of scrubbing found, worst first, and what changed:

1. **The headphones did not read**: a flat pad and a thin hoop. Now the near cup lies on its back (a shell and a thick
   cushion with a hollow), the band arches from a yoke on its far side, and the far cup stands on its edge.
2. **The close frame made the ball the size of the cup**, and the wide lost it. The close frame is looser and the wide
   is lower, so the desk sits at four fifths of the frame and not at its foot.
3. **The wall's glow was one orange wash**, and a light cone from the shade was haze. The cone is gone; the room is a
   cool near-black and the lamp's pool is warm and small, so the light reads as the one light.
4. **The books read as cream slabs**, and the bottom book and the unlit mug were as bright as the ball. The books are
   spines with bands and labels, all darker; the mug is dark until the lamp reaches it; the ball is the brightest thing
   in the pool.
5. **The glass drops read as stars**, then as little smile-marks: now soft pale beads, a point of light in the bigger
   ones, warm on the lamp's side.
6. **The steam was three hard ropes**, then showed each segment's overlapping caps: now each wisp is one line faded
   along its length.
7. **Two turns in the machine had no cause.** The lob lands going left and the walk goes right: a plant pot at the
   sill's end is the stop it comes back off. The drop off the sill needed a way to turn round too: the stair and the
   cup continue the same way, and the one real turn is the lob, from rest.
8. **The same close-up 70% of the half hour.** The four groove looks, a phrase each, in each track's own order.
9. **Props sliced by the frame's edges**: the lamp's mouth, the mug, the far cup, the plant's leaves, the lamp's foot.
   Every held frame re-solved (see the camera), and the check holds them.
10. **The nods stopped dead** on every landing. Each now has a small second bob; the camera's moves start with no
    acceleration at all (the rig went from two poles to three).
11. **The sill walk all but stopped halfway** on the longest gap (the Hermite's ends were faster than its middle). Now
    an even walk, eased at both ends.
12. **Zoom lost the ball 22% of the time**: now 0.1%.
13. **The last step was not a step.** The bottom book's top stood level with the cushion, so the ball crept to the
    corner, lingered, rolled onto the cushion's rim on the beat and only then down into the seat, its arrival late.
    The bottom book is thicker (the stair's risers stay even) and the cup lies in front of its corner: the ball tips
    off and drops into the hollow on beat three.

### The lofi pass

The room was plain: a brown-black box with a window, every frame nearly the same two colours, nothing alive but the
ball. The machine and its timing were right and are untouched; the room around it is rebuilt.

14. **The palette was one dark.** Now an indigo room lit by two lights, the window's violet and the lamp's peach, the
    way the streams light theirs; unlit things are dusky rather than black.
15. **The window did one thing all half hour.** It is now the evening: dusk to night, clouds, the rain's arc, the
    clearing, the moon. Twelve tracks, one sky going past.
16. **Nothing in the room was alive.** The cat watches the ball and listens to the music, the fairy lights breathe,
    the city's windows come and go, a plane goes over. All of it a function of show time, so a scrub is exact.
17. **Nobody lived there.** The curtain, the fairy lights, the polaroids and notes, the print, the grain on the desk's
    edge, the mug's colour.
18. **The picture was clean in a way the streams are not.** The bloom, the vignette and the grain.
19. **Two frames sliced the cat** (the stair and the desk under the lamp): both re-solved, wider by a little, and the
    cat and the notes are in the check's list of things a held frame shows whole.

### The second lofi pass

20. **Nothing was standing on anything.** Every thing on the desk now has a soft shadow at its foot and one thrown
    onto the wall behind it, away from the lamp (`lamp/shade.ts`); the ball has both, its wall shadow following it
    (behind the books when it is, never on the glass) and the one under it small and dark as it sits, wider and fainter
    as it rises, so every nod and step is read twice.
21. **The close look at the cup was a bare orange wall** for a sixth of the half hour. The shadows give it depth, and
    dust drifts in the lamp's light, glinting as it turns: the one thing that moves when nothing else does.
22. **A blink caught halfway read as a scowl** (the eye was squashed top and bottom). The upper lid now comes down over
    the eye, so a half blink is sleepy.
23. **The room did not know the street was there.** Now and then at night a car goes by below and its lights sweep
    across the wall: the window's shape with its bars in it, pale and cool, freckled with the drops when it rains.
24. **The cat yawns**, six times through the night, more of them late, in phrases it spends watching.

### The third lofi pass

25. **A phone held upright saw a void.** A tall stage sees the whole wall, and below the desk was one flat dark, three
    fifths of the picture. The room is built out (`lamp/room.ts`): under the desk, its apron with a wide drawer, a
    pedestal of drawers, brass knobs that catch the lamp, a ukulele leaning on the drawers, a crate of records, a rug
    and a pair of slippers on the floor; above, a high shelf of books with a pothos trailing off it, a macramé hanger
    in the corner, the ceiling and its moulding.
26. **The foot of every 16:9 frame was the same flat dark band.** It is now the desk's apron, its drawer fronts and
    their knobs.
27. **The steam was all but invisible**; it is half again as strong. The red light on the roof across the street was
    a blob close up; it is a point with a small glow.

### The fourth lofi pass

28. **The sill's frames, a large share of the half hour, had an empty end of desk** left of the mug. A Walkman stands
    there now (`lamp/walkman.ts`), the headphones' cable running to it along the desk behind everything: what is
    playing. Through its window the cassette turns, the tape going from one reel to the other over the half hour (a
    clock you can see); its play key is down while the music plays and comes up when it stops; its little light
    flickers with the music's loudness. The cable is back (it was subtracted in the first round, when it went
    nowhere); it now has somewhere to go.
29. **The dusk had no life in it.** Two small flocks of birds cross it, one under the title, one as the first track
    ends, beating and gliding.
30. **The cat ignored the headlights.** It looks up and follows them across the wall while they pass, then goes back
    to the ball.

### The fifth lofi pass

31. **Is it too much to leave on?** Measured in Chrome with its GPU at 1920 × 1080 on a 2× display (a 3840 × 2160
    canvas): a steady 60 frames a second at dusk, in the rain and at the end, the slowest frame in a hundred under
    21 ms; the script's own share of a frame is a fraction of a per cent. (A headless browser rasterising in software
    runs it at a fraction of that, and runs other shows erratically too: not a measure of what a viewer sees.)
32. **The track's artists were fine print** over the busiest part of the frame, the lit city through the rain. Each
    track now comes up as a stream's now-playing line: its name and its artists on one baseline, the artists in gold.
33. **A clock on the wall**, under the fairy lights between the window and the lamp. It keeps the show's own time from
    11:41 at night, so midnight passes in Stargazing, and its second hand ticks with the small settle of a quartz hand: the
    one thing in the room that moves on the second. Sized to the gap between two held frames' edges, so every frame
    shows it whole or not at all.

### The sixth lofi pass

34. **Motion, frame by frame**: the drop, the lob's landing and the pot, a turn of the cat's mood, each at a tenth of
    a second, show nothing popping or jumping.
35. **Half the cat's best moments were off camera.** Its nodding along was chosen by chance, a phrase at a time, and
    half of it (nearly five of its ten minutes) fell while the camera was on the cup close or the lamp, which cannot
    show the cat; three of its six yawns did too. Now it plays to the camera (`catInViewAt` in `lamp/camera.ts`): it is likelier to be lost in the music
    through a phrase the camera spends on it, less likely otherwise, and it yawns only in view (a yawn comes over a
    nod). Of its eleven minutes nodding along, seven and a half are now seen (two thirds); all six yawns are.
36. **The fairy lights were glows cut off by the top of the room's frames**, their bulbs just out of it. The two swags
    across the window hang lower, so those frames have the string draped across their top, bulbs and all.

### The seventh lofi pass

37. **The stage's other ways of looking.** Overview (the whole world) is the whole room, floor to ceiling, and needs
    nothing. Zoom (the same middle, half again closer) had the ball jammed against the frame's foot in two of the
    groove's looks, the cup cut away under it: the desk under the lamp and the lamp's side were framed higher than
    they needed. Both now sit lower (their middles at y = -1.3), which keeps every prop in them whole in the ordinary
    frame and gives Zoom the ball with the cushion under it (the cup whole, in the first). The window over the desk
    cannot move without cutting the clock, and the room's frame is for breaks and lobs; they stay.
38. **The breaks went unanswered** but for the camera drawing back. Now, when a track's drums drop out, a slow wave
    runs along the fairy lights, and the room's frame the camera has drawn back to has them draped across its top.

### The eighth lofi pass

39. **The credits stood in the fairy lights.** The string ran through "Directed by" and "Music", and the clock sat
    against the names. They stand further right and a little lower now, on the dark wall between the string's end, the
    clock and the print, over the lamp's arm, clear of all of them.
40. **The frames' shares, measured** over the half hour: the desk under the lamp 18%, the cup close 16%, the lamp's side
    14%, following the ball along the sill 14%, the window 13%, the room 12%, the stair 8%, the sill's end 4%, the
    room's widest 2%. No look outstays the others; left as it is.
41. **Two small helpers were copied into three files.** The view's extent and the colour-at-an-alpha now live once, in
    `lamp/canvas.ts`; the frames drawn before and after are pixel for pixel the same.

### The ninth lofi pass

42. **The ball was an eye.** The stage marks every ball with an ink dot to show it rolling; here the ball sits still in
    the cup for most of each track, large in the close frames, beside a cat with round eyes, and the dot on its side
    read as a pupil: a googly eye staring out of the headphones. The ball is now drawn without it (a rider with no mark,
    `lamp/show.ts`) and the scene shades it (`ballShine`, `lamp/scene.ts`), under the cushion's lip: a matt ping-pong
    ball with a soft shine toward the lamp and a dusk on its far side, the shine turning upward, the window's way, along
    the sill. A faint printed stamp, a short pale dash that turns as it rolls, keeps the walk a roll and not a slide.
43. **Looked at and left:** the cup close keeps the sill's corner in its top left (the lob's landing, and clearing it
    would cost the books or give the frame to the drawers); the sill walk, a moving frame, passes the polaroids and the
    headphones at its edges.

### The tenth lofi pass

44. **The curtain was the one soft thing in the room that never moved.** Its loose fall below the tie now stirs in the
    draught off the window (`draughtAt`, `lamp/decor.ts`), the same cold the plant on the sill already stirs in: two
    slow swells that never line up over a slower gusting, the window's side caught first and the wall's side a beat
    behind, the hem lifting a little as it goes. A twentieth of a cell on a still evening, twice that while it rains:
    something alive at the frame's left edge in the window's looks and the room's, never enough to draw the eye from
    the ball.
45. **A cup of pencils by the lamp's foot**, the desk's one nod to someone writing, was built and taken out. The only
    room for it in the lamp's pool is the 0.74 cells between the far cup and the lamp's foot, and three held frames'
    edges fall there (the room's at 4.54, the window's at 4.57, the stair's at 4.92): what is left is too narrow for
    anything to stand whole in. Moving the room's frame to make space cost Zoom the ball 1.6% of the time.
46. **Looked at and left:** the track cards over the glass read cleanly; the rising moon crosses the sill frames' top
    edge only in passing; a moment of the cup close with the lamp's shade at its top is the camera mid-move.

### The eleventh lofi pass

47. **A phone held upright still saw a void**, under the desk's right half: in the cup close and the lamp's side,
    the two looks that hold the camera longest, the bottom two fifths of a tall stage were flat dark, since everything
    the third pass put under the desk (the drawers, the ukulele, the crate) stands under its left. Two things a student
    leaves there (`lamp/room.ts`): a canvas tote with a faded gold moon printed on it and a notebook standing in it,
    on a hook on the wall in the knee space, under the cup; and a backpack set down against the wall toward the lamp,
    its flap strapped and buckled, a little star charm on its zip. Both in the room's dark, warmed only by the lamp's
    spill. The tote first hung from the apron and its handles showed, cut, at the foot of the room's widest frame
    (the show's first and last); it hangs a cell lower now, under that frame, seen only by a stage that is taller
    than it is wide.
48. **Looked at and left:** the opening, the title, a drop; one move from the stair to the cup passes through a frame
    with half the cat's face at its edge (a move, not a held frame).
49. The share card is regenerated (the curtain's draught had moved its hem).

### The twelfth lofi pass

50. **The city was windows and nobody in them.** One window across the street is now close enough to see into
    (`neighbour`, `lamp/sky.ts`): someone else up late. Its light comes on in the dusk and goes out at 27:32, a little
    before ours goes down; a thin curtain is drawn across its left. Six times through the night someone crosses
    behind it, head and shoulders, a little bob in the step; once, at 15:15 in Exhale's heaviest rain, they stop at the
    glass seven seconds to look out at it. Twice a cat walks along its sill, sits two or three minutes with its tail
    tip going, and walks off, and the one who stops to look out does it beside the cat. All of it is played to the
    camera, as the kitten's yawns are: each crossing, the look, and each of the cat's comings and goings is put at a
    moment the frame holds that window for all of it, a few minutes apart (worked out once, from the camera, at load).
51. **Zoom, looked at:** a closer crop round the same middle; the ball and each frame's subject stay in it, the cat's
    body and the desk run off its foot. Left as it is.

### The thirteenth lofi pass

52. **The kitten never washed**, the most cat thing there is. Now, four times through the night (3:07, 8:43, 13:50,
    19:11), it does (`washAt`, `lamp/cat.ts`): over six seconds its near forearm comes up from under its ruff to its
    mouth, four licks, its head dipping to the paw and the tip of its tongue out with each, then the paw goes up round
    the outside of its cheek and over its ear as it leans into it, and back down, its eyes softly shut throughout. Like
    its yawns, played to the camera: each in a phrase it spends watching rather than nodding along, the frame on it the
    whole six seconds, clear of its yawns, the lob and the headlights. The first drawing grew the leg from the desk, a
    stick from the floor to its face, and wiped across the face rather than behind the ear; the leg now starts at the
    shoulder and goes round the cheek.
53. **The end, looked at:** the last track, the credits, the lamp and the fairy lights going down, the cat asleep, the
    neighbour's window dark after its light goes out. Left as it is.

### The fourteenth lofi pass

54. **The tea was a plain pink cylinder.** A tea bag's string now hangs over the mug's rim and down its front to a
    small paper tag, and the tag stirs a little in the draught off the window, the same air that moves the curtain and
    the plant: a lived-in thing, and one more that breathes with the room. Inside the mug's outline, so no frame moves.
55. **A break and the highest lob, looked at:** Magical Connection's break draws back to the room with the fairy
    lights across its top and the wave along them; Stargazing's lob, the slowest track's and so the highest, peaks
    inside the room's frame. Left as they are.

### The fifteenth lofi pass

56. **The neighbour's window outshone the ball.** Looked at across the half hour, after four passes of additions, it
    was the brightest warm thing in nearly every frame with the window in it, and at the edge of the lamp's looks it
    drew the eye off the ball. Its room is now a lower, deeper amber, its halo less than half what it was and its
    curtain fainter: it sits among the city's lights, at about the polaroids' brightness, and what crosses it still
    reads. Its wall was also darker than the building it is in (drawn after the haze over the roofs); it is drawn
    under the haze now, and the rain falls in front of it.

### The sixteenth lofi pass

57. **The words on a phone held upright.** The page keeps the type readable as a tall stage's picture shrinks, so
    what clears its neighbours in landscape crowds them in portrait: the title's first letter sat on the fairy lights'
    last bulb, and the Music card's last line ("its first twelve tracks, morning moon to Passing By") ran to the print's
    edge. The title stands a fiftieth of the frame lower (and a touch right), clear of the string in both; the line is
    "the first twelve tracks" (each track's name has had its own card by then), clear of the print in both. The
    Directed-by card, the track cards and the landscape layout, checked, are as they were.

### The seventeenth lofi pass

58. **The books' labels were blank**, and the books fill most of the cup close, the frame the camera holds longest:
    three pale rectangles that read as placeholders. Each label now has its title written on it by hand, a line and
    a shorter one, faint and uneven; and the middle book's ribbon hangs out of its pages at the left end and lies on
    the book under it, clear of the ball's way down the right.
59. **The checks, honestly:** the last three passes' full runs of the suite never started. They were queued to wait
    until no other run of it was going on the machine, and other worktrees' runs kept them waiting. Run directly now.

### The eighteenth lofi pass

60. **Two drawing faults, seen only full size**, both in the looks the camera holds longest. The cushion's near lip,
    drawn over the ball so it sits down in the hollow, was one flat colour on a cushion shaded top to foot: a pale
    rectangle on the cup's front under the ball through every groove. It takes the cushion's own shading now and is
    the cushion. And the lamp's spring was a zigzag a sixth of a cell off the arm, joined to nothing: a scribble in the
    air. It runs close beside the thin rod now, hooked onto it at both ends.

### The nineteenth lofi pass

61. **The steam, full size, was all but gone**, and went where steam cannot. It is the held sound (the pad and the
    keys) in the window's and the room's looks, and at mid-show it was a ghost; and the mug stands under the sill with
    two thirds of a cell over it, while the wisps rose a cell and more, up across the sill's front. They are half again
    as strong now, curl a little tighter, and rise to just short of the sill's underside and are gone there. The
    window, the room in a break and the stair, looked at full size: nothing else.

### The twentieth lofi pass

62. **A black hole in the first frame.** Before the neighbour's light comes on (at 0:38), their window was a near
    black box with a near black frame, in a building the dusk had made a soft violet, with no other dark window like it
    in the city: the opening's one hard dark, set in its skyline. Unlit, it is glass now, holding a little of the dusk
    while there is one, and dark only at night. The opening and the closing wide frames, looked at full size: nothing
    else.

### The twenty-first lofi pass

63. **The stage's overview, after the tote.** In a 16:9 overview the picture ends two cells under the desk, and the
    tote's hook and handles stood at its foot alone, a bare triangle. Hung lower, clear of the overview, the bag fell
    mostly out of a phone's upright look at the cup, where it is wanted; so it hangs a shade lower than before on
    shorter handles: whole in the upright look, under the foot of the room's widest frame, and in the overview the
    notebook, the handles and the bag's top edge, which read as a bag.

### The twenty-second lofi pass

64. **The track names stood on the window's bars.** Each now-playing line sits over the glass, and the camera puts
    the window's cream mullion or frame under it in most tracks: "Destination Unknown" had its D on the frame,
    "Blooming Dales" its g on the mullion, cream on cream. While a track's card is up, the scene now lays a soft dark
    wash under it (`scrim`, `lamp/decor.ts`), as a stream puts under its words, fading with the card; the bars go dim
    beneath the type and every letter reads. The title and the credits stand on the dark wall and need none.

### The twenty-third lofi pass

65. **The Walkman's clock did not read.** Its reels were meant to show the half hour, the tape going from one to the
    other, but their radii ran linearly over a narrow range, so at three fifths of the way they were 0.052 and 0.063
    of a cell: the same size to the eye. They are wound by area now, as tape is, from the bare hub to a full reel (the
    radius the root of what is on it), with a faint edge to the pack: a full reel and an empty one at the start and
    the end, and plainly the right one fuller from the middle on. The headlights' sweeps and the small props (the
    clock, the Walkman's outline beside the mug's), looked at large: as they were.

### The twenty-fourth lofi pass

66. **The scrim without its words.** The page shows no cards in the stage's overview, but last pass's wash under the
    now-playing line was drawn there anyway: a dark smudge across the top of the whole room, standing under nothing.
    The scene cannot be told it is in the overview, but it can see it: the picture is then far wider than the
    camera's frame, so the wash keeps to the frames the words are shown in (Follow, Zoom, upright, and a recording,
    which paints its cards into the picture). The first fifteen seconds, frame by frame (the lamp warming on, the
    bulbs coming up, the title, the camera settling onto the sill), looked at: as they were.

### The twenty-fifth lofi pass

67. **Still light enough to leave on?** Seventeen passes since the fifth measured it, every one adding to the room
    (the curtain's draught, the tote and the backpack, the neighbour's window, the washes, the tea tag, the scrim),
    measured again the same way: Chrome with its GPU, 1920 × 1080 at 2× (a 3840 × 2160 canvas), this branch against
    the commit before those passes, each at dusk, the first rain, the heaviest rain, past midnight and the end. Both a
    steady 60 frames a second at every moment, the slowest frame in twenty 18 to 25 ms in both, the worst moment
    moving from run to run (noise). A CPU profile puts the scene's own drawing at a tenth of a per cent or less per
    function. Nothing to take back. The drop and the stair frame by frame, and a yawn, full size: as they were.

### The twenty-sixth lofi pass

68. **The scrim in a saved picture.** The stage paints a still (Save PNG, the share card) with no words, but the wash
    under the now-playing line was drawn into it whenever a track's card was up: a picture saved in the first seconds
    of a track had a dark band across the glass, standing under nothing. A still is painted in a frame of its own that
    is never shown, and a video's is shown with the words painted over it; the wash now keeps to the shown ones. Seen:
    a still at Destination Unknown's card is clean, and the live page keeps its wash under the name. A video keeps it
    too, by the stage's code (its frame is shown); not recorded here.

### The twenty-seventh lofi pass

69. **The recordings, seen.** Last pass's claim that a video keeps the wash under the track names was the stage's code,
    not a recording. Now recorded: a 1080p video and a Short, each stopped at the first track's card, have "morning
    moon" painted into the frame with the wash under it.
70. **A Short is seven tenths black bars.** The stage letterboxes every show's Short (the 16:9 picture, black above
    and below), on purpose: shows are composed for 16:9. This one's room is built floor to ceiling for a stage held
    upright, and the live upright stage shows all of it; its Short does not. Changing that is the stage's policy, not
    this show's, so it is left as it is and put to Stephen below.

### The twenty-eighth lofi pass

71. **Other screens' shapes.** Every held frame is solved for 16:9; the live stage on any other shape sees more room
    round the same frame (taller screens more above and below, wider ones more to the sides), so a frame's edges move.
    Swept every held frame at 16:10, 3:2, 4:3 and 21:9. The 16:10 laptop, the likeliest screen to leave this on, had
    one cut: the cup close's taller frame showed a sliver of the lamp's lit rim at its top, in all thirteen of its
    holds. That frame sits 0.07 of a cell lower now (its middle at y = -0.57): 16:10 is clean, 3:2 loses its cut notes
    too, and 16:9 and Zoom are as they were. Left: 4:3 cuts the clock and the shade in a few looks, and 21:9 shows half
    the cat at the cup close's left edge (no one cup frame can keep the cat out at 16:9 and whole at 21:9 without
    cutting the books); both rarer screens, and the check stays on 16:9. Clearing 3:2's shade too would take the cup close down
    to y = -0.47 or lower; tried at -0.50, the 16:9 frame went bottom-heavy (the desk and its drawers a third of it,
    the sill against the top) and still touched the shade. Kept at -0.57.

### The thirtieth lofi pass

72. **A scrub back is still the same frame.** The show promises every part of it is a function of show time; the later
    passes added things that move on their own (the curtain's draught, the neighbour's crossings and cat, the washes,
    the tea tag, the scrim), so it was tested again: nine moments across the half hour (dusk, the rain, a track card,
    the neighbour at the glass, a wash, past midnight, the end) rendered in order and again shuffled, compared pixel by
    pixel: identical, every one. 24:55 to 26:00 (a lob, a walk, a drop) at a frame every 3.4 seconds: as it was.

### The thirty-first lofi pass

73. **The shooting stars were never seen.** Of the four, three crossed with the camera elsewhere: their streak ran
    along the very top of the glass, above every frame but the room's widest, and one was under 60% cloud. Their streak
    is now lower, in the upper sky the window's look and the room's frame both show, still above the roofs, and they are
    played to the camera as the neighbour's moments are (`SHOOTS`, `lamp/sky.ts`): late, in a clear sky, each at a
    moment the frame holds the whole streak and the cat, minutes apart. That leaves two, at 26:37 in Daydream and 29:10
    in Passing By. **The cat looks up at them** (`shootAt`): its eyes go to the streak a moment behind, as they go to the
    headlights, and stay a couple of seconds on where it vanished; if it was nodding along, eyes shut, the star brings
    it out to look, and it goes back in after.

### The thirty-second lofi pass

74. **The sky's other moments, against the camera.** The shooting stars were not the only thing out of sight. Of the
    five planes that crossed a clear sky, three were never on screen and the other two only partly (they flew at the
    glass's very top, above the frames); and the flock of birds under the title was only a fifth seen, still crossing
    slowly when the camera came down to the sill, whose frame stops below them. The planes fly lower now, just over the
    roofs, and are played to the camera (`FLIGHTS`): clear sky, seven tenths or more of the crossing in frame, minutes
    apart. Two land, at 1:02 in the dusk and 26:27 at night; a third that would fit was left out, as it would cross
    with the shooting star at 29:10. The title's flock crosses faster, inside the opening's wide frame; the second,
    as the first track ends, was four fifths seen already and is as it was.

### The thirty-third lofi pass

75. **The headlights, against the camera, left as they are.** Measured the same way as the sky's moments: of the
    seventeen sweeps, fourteen put some of their bright middle on screen (seven and a half sweeps' worth in all), and
    three never cross the frame. A sweep is a wide wash moving across the whole wall, so passing into and out of a
    frame is what it should do, and the three unseen fall while the cat is in view and turns to follow a light just
    off frame, which reads as a cat hearing a car. Played to the camera, they would be staged; not done.

### The thirty-fourth lofi pass

76. **The shortest break was a lurch.** Each break draws the camera back to the room and in again as the drums return.
    Every break runs twelve to twenty-six seconds, room enough for that, but Breathtaking's is 5.3 (two bars of its
    half-time groove), and the rig needs some six seconds to settle a move: the camera went out and straight back in
    within eight, the busiest move in the half hour, passing a frame with half the cat at its edge on the way. A
    break under eight seconds now leaves the camera where it is (here the lamp's side), and the break shows in the ball:
    no kicks, so it stops nodding and only sways in the cup. (The fairy lights' wave runs too, but that frame does not
    see the string.)

### The thirty-fifth pass: depth through the glass

The passes before this one had plateaued: each added a small thing to a room that was already full. Stepping back, the
one thing every frame shared was that it was flat. The window, the show's clock and the frame's largest picture, was
a painted backdrop on the wall: when the camera moved, the city moved with the bars, and close to the desk it was as
sharp as the books. This pass makes the window deep, and gives the storm the one moment it was missing.

77. **The city has depth** (`lamp/lens.ts`). What is out past the glass is drawn in layers, each at its depth: the
    near roofs and the neighbour's window, the far roofs, the clouds and the plane, the stars and the moon. Each layer
    moves with the camera by its depth, so when the camera follows the ball along the sill, the near roofs slide
    behind the bars, the far ones less, and the moon hardly moves against the frame. A push in is partly the operator
    stepping closer, so close to the desk the far layers grow a little less than the room does. Every layer sits
    exactly where it was drawn in the window's look over the desk, the frame they were composed in. The street runs on
    past the window's edges (the old skyline kept, more of it built to either side), so a move never shows its end.
78. **The camera focuses on what it looks at.** In the room's frames and the window's the city is sharp. Following the
    ball along the sill, the city goes soft behind it; at the desk it is softer still, and its lit windows open into
    discs of light. The beads on the glass stay in focus and the rain is nearly so, as when a lens focuses on a wet
    window. The discs are the lights' own (a bright one stays bright, a star's spreads to nothing) and add where they
    overlap. The soft city is drawn small, blurred and laid back over the glass. It costs no more than a sharp frame,
    and a browser whose canvas cannot blur scales it down and up instead.
79. **The window's moments, against the new depth.** Every moment played to the camera (the neighbour's crossings and
    their cat, the shooting stars, the planes) is worked out where it is through the glass from that frame, and must
    be in focus there as well as in the frame. All of them still land: seven crossings, the look out at the rain, two
    visits from the cat, two shooting stars, and three planes. The depth let in a third plane, late in Passing By, a quarter
    minute after its shooting star. The moon is kept clear of the top of the frame in the closing wide shot.
80. **Lightning, far off.** The heaviest rain, Blooming Dales into Exhale, was the longest stretch with nothing
    happening in the sky. Three times in it (12:29, 13:59, 15:31), the clouds over the city light from inside for a
    moment: a flicker of two or three pulses, the roofs black against it, a cool light into the room, and gone. There
    is no bolt and no thunder; the music is the sound. Each is played to the camera like the sky's other moments, with
    the window and the cat in the frame and clear of a car's lights. The cat's ear flicks and it looks up at where the
    light was, as it does at a shooting star; if it was nodding along, the flash brings it out of it. The neighbour's
    crossings keep clear of the flashes, but their one long look out at the rain comes seventeen seconds after the last.
81. **The glass mists at its foot** while it is wet: a pale breath along the bottom of each pane, thicker in the
    corners, gone as the glass dries.
82. **Looked at:** the whole half hour at 24 moments; the sill walk at dusk frame by frame (the parallax); each flash;
    the closing wide frame; an upright phone. `check:shows` now also holds the lens (sharp in the window's look and the
    room's, soft at the cup, every layer where it was drawn) and the window's moments (three flashes in the heaviest
    rain with the cat in view; the shooting stars and the crossings in focus, clear of the flashes).

### The thirty-sixth pass: someone at the desk

The streams this show takes after are about a person: someone at a desk, studying through the night, the cat for
company. Here there was a cat, a machine and a cup of tea at a desk, and nobody sitting at it. This pass puts someone
there without ever showing them: the camera is where they sit, and what is seen of them is a hand in a sage sweater's
sleeve, reaching in from the camera's side now and then, as anyone at a desk does through an evening (`lamp/hands.ts`).

83. **Five reaches through the night**, each a few seconds, minutes apart:
    - **A sip** (4:09), while the tea is hot. The hand takes the mug, lifts it off the desk and brings it toward the
      camera, the mug growing as it comes, out at the frame's foot; its rim stays at the bottom of the picture while
      they drink. Then it comes back, is set down, steams again, and the hand lets go.
    - **The kitten under its chin** (9:36, and again at 22:06 in the clear night). The kitten watches the hand come,
      shuts its eyes in the content arch as the fingers find its chin, tips its head into them and lets its ears
      relax, then opens its eyes as the hand goes.
    - **Hands round the mug** (15:56), in the heaviest rain, for the warmth, a finger tapping now and then.
    - **The lamp turned down** at the end. The lamp's base has a small brass knob now, and as the last track rings
      out a hand comes to it and turns it, and the lamp goes down to its glow as the knob turns. The lamp always went
      down there; now someone turns it down, says good night, and goes.
84. **Played to the camera**, like everything else: each reach is set at the first moment in its stretch of the night
    that the camera holds what it reaches for the whole time, clear of a car's lights, the lightning, the shooting
    stars and the neighbour's crossings. The cat's yawns and washes keep clear of the hand (all six yawns and four
    washes still land). The cat glances at the hand when it comes in for anything.
85. **The drawing.** The hand is drawn the way the room is: one ink line round the whole of it (fingers, thumb and
    the back of the hand), skin lit by the lamp and never dark, the fingers shortening as they curl under, the nails
    where they point out. The sleeve has a ribbed cuff and a fold or two. In the foreground, the sleeve darkens and
    fades as it nears the camera, so a phone held upright, which sees down to the floor, has an arm coming out of the
    shadow in front of the desk rather than a pole down to the rug.
86. **Built and taken out:** dunking the tea bag by its tag. Drawn, the string and the tag were lost behind the
    fingers at any size the show is seen at, so it read as a hand hovering over a mug. The sip replaced it.
87. **Looked at:** each reach at full size; the scratch at half-second steps (the hand in, the eyes shutting, the
    hand out; nothing pops); the sip's lift and return; the end; an upright phone. A scrub back is the same frame.
    `check:shows` now holds the reaches: the five in order, each with its prop in frame throughout, the knob turning
    with the light, and the cat's yawns and washes all landing clear of the hand.

### The thirty-seventh pass: an evening, not five gestures

Last pass's hand came five times, each a gesture on its own. This pass gives the person an evening with a shape:
they come in and put the light on, their tea goes cold and they make more, and the shadow of their hand falls in the
lamp's light like anything else in the room.

88. **Bookends.** The show opened with the lamp coming on by itself. Now, as it opens, a hand is already on its way to
    the lamp's knob, turns it up as the first chord sounds, and the light comes up under its fingers; at the end the
    same hand turns it down. The knob turns with the light both ways (`knobAt`).
89. **The tea goes cold, and is made again.** The steam has always been the held sound, thinning as the tea cooled
    through the night. Now, at 19:00 (the clock just past midnight), the hand takes the cold mug away: lifted, brought
    toward the camera, and on out of the picture. The desk stands empty by the cat for three minutes. At 22:07 the mug is brought back the same way, set down and let go, and its steam is full
    again. It cools from there to the end, more slowly. Each trip is played to a frame that holds the mug, a few
    minutes apart.
90. **The hand in the light.** The hand now throws a soft shadow from the lamp, away from the shade, onto whatever is
    behind it: the kitten's chest and the desk under a chin scratch, faint by the mug at the desk's dark end. It is
    drawn small and laid back over the picture, and it fades as the mug is carried out of the light. In the dark
    opening, before the lamp, the hand is lit by the dusk and the fairy lights and never goes black.
91. **Fixed on the way:** the mug's steam vanished in one frame as it was lifted and came back in one as it was set
    down; it now fades with the lift. And a scrub back was off by one level in the frame's last row of pixels after a
    reach: the scratch canvases (the hand's shadow, the soft city) were cleared only where the frame drew, and
    smoothing read the stale row past it as each was laid back. They are cleared whole now; five moments rendered in
    two orders are identical.
92. **Looked at:** the opening's first five seconds, the mug's trip away and back, the empty desk, the shadow under a
    scratch, the end. `check:shows` now holds all eight reaches in order (the lamp turned on and down; the mug taken
    away about midnight and back hot, well before the end).

### The thirty-eighth pass: the kitten gets up

Two passes went into the person at the desk; a third would start to make them the show. The other character had
never moved: for half an hour the kitten was a loaf. It watched, nodded, yawned, washed and slept, and never got up,
which no cat lying on a desk for half an hour fails to do.

93. **It stretches, twice** (`stretchAt`, `lamp/cat.ts`): at 11:13 in Magical Connection, and at 26:42 in Daydream, a
    few seconds after it has looked up at a shooting star. Over seven seconds it gets up onto its feet, its belly lifting
    off the desk and its tail going up behind it in a question mark; it stretches its front out long along the desk,
    chest down, rear up, and yawns, eyes shut, at full stretch; then it stands again, and settles back down into its
    loaf, the tail coming round its front.
94. **How it is drawn.** The loaf is the same drawing, lifted and tipped forward about its rear and drawn a little
    longer, so the stripes, the ruff and the light along its back all come with it; up on its feet, its underside is a
    belly rounded up at either end, not the desk's straight line. Four legs: the hind pair straight down under its rear,
    the fore pair under its chest, reaching out along the desk at full stretch, the near of each pair a shade lighter,
    each with a pad of a paw. The head comes down and forward with the body, over the outstretched paws. The first
    drawing stood it on thin short legs under a flat-bottomed loaf, a box on stilts; the legs are longer and sturdier
    and the belly rounds now.
95. **Played to the camera**, like its washes: each in a phrase it spends watching, never nodding along, while the
    camera holds the whole of it with its paws stretched out toward the books, clear of its yawns and washes, the hand,
    the lob, a car's lights and the sky's moments.
96. **Looked at:** both stretches at full size, the first at 0.4 seconds a frame (up, the stretch, the yawn, down:
    nothing pops; the tail passes behind the body as it swings up, as a tail does). `check:shows` holds the two
    stretches (one early, one late, in frame, clear of everything else the cat does and of the hand).

### The thirty-ninth pass: the last trains

The window, the frame's largest picture, had depth after the thirty-fifth pass: near roofs, far roofs, the sky. But
nothing moved through the city except the planes, which keep above it. The picture this kind of rainy night is
remembered by in the streams' and the anime's own cities is a train going across it, far off, lit.

97. **An elevated line across the city** (`train`, `lamp/sky.ts`), in its own layer between the far roofs and the
    near ones: a dark deck on piers, seen between the near buildings, lost behind the tall ones. Six times between the
    dusk (2:30) and a little after midnight (18:01), a few minutes apart, a five-car train goes along it, slow (about
    eleven seconds from one side of the run to the other), its windows a string of light, warm with a few cooler,
    here and there someone's shape against one, a faint glow round the cars and a headlight ahead. Once in each
    crossing its pantograph throws a blink of blue-white off the wire, twice, the way the overhead line does in the
    rain. No sound; the music is the sound.
98. **At its depth.** It slides behind the bars at the train's own depth as the camera moves, and when the city goes
    soft at the desk its windows open into discs of light like the rest: a string of bokeh drawn across the city.
    Each run is played to the camera: the window held, in focus, while its front crosses the glass, clear of the planes.
99. **Fixed on the way:** the first windows were dull, the light colour at half strength over the dark body, pale grey
    paper rather than light; they are nearly full strength now, with the glow round the car.
100. **Looked at:** the whole half hour at 24 moments again (after four passes of additions, nothing out of place); a
     train sharp across the window's look at full size, soft across the sill walk at dusk, its spark. `check:shows`
     holds the trains (four or more, minutes apart, from the dusk to a little after midnight).

### The fortieth pass: a face in the mist

The rain is the half hour's middle and its longest weather, and the glass has misted at its foot since the
thirty-fifth pass. A face drawn with a fingertip in a misted window on a rainy night is a small thing everyone has
done. Here it is also a clock: drawn in the rain, gone when the glass dries.

101. **The drawing** (`doodle`, `lamp/hands.ts`). At 19:00, late in Stargazing's rain, the hand reaches up to the lower
     left pane above the mug, one finger out and the others curled, and draws a kitten's face in the mist: the round of
     its head, two ears, two eyes, a small mouth, the line coming clear behind the fingertip over five seconds. The mist
     is a little thicker there, as where someone has breathed on the glass. A few seconds after, three drips run down a
     little way from its lowest points and stop. The kitten watches the finger.
102. **It stays, and goes.** The face is on the glass, so it is sharp in every frame and stays where it is as the city
     moves behind it. The rain runs past it through the rest of the wet night; once the glass is half dry after the
     rain (23:12) it fades out over two and a half minutes, and the clear night has none.
103. **Played to the camera**, and to the machine: the camera holds the pane and the hand's way to it all but still the
     whole time, and the ball is sitting in the cup. The first try drew it during Exhale's lob, and the ball, landing
     on the sill, rolled behind the arm; the face was also too small and faint to find, so it is larger, its cleared line
     darker, and its mist a little thicker.
104. **Fewer reaches, not more.** With the drawing, the hand came nine times, and the late night bunched up: a shooting
     star, the mug brought back and the kitten's stretch within half a minute. The second chin scratch is gone (one is
     enough), and the tea's refill moves: taken away at 22:07, a little after midnight on the clock, and back hot at
     24:35. The stretches are where they were (11:13, 26:42), and the cat's yawns and washes all still land.
105. **Looked at:** the drawing at full size, at a frame a second and on an upright phone; the face in the rain; its
     fading. A scrub back is the same frame. `check:shows` holds the reaches in their new order, the drawing in the rain.

### The forty-first pass: a moth to the lamp

After the rain, the last third of the night had the clear sky, the moon and the shooting stars, but nothing small
alive in the room. The lamp, the show's one light, had never drawn anything to it.

106. **A moth** (`lamp/moth.ts`), come in as the rain thins after the storm (23:22). It flies down to the lamp and
     circles the light in loose, uneven loops, wider and narrower, close round the bulb and out, its wings a pale blur
     too quick to see; every minute or so it settles on the shade's upper outside, wings folded into a little roof, for
     a while. About three centimetres across, warm in the bulb's light, with the room's ink round its wings.
107. **Its shadow.** So near the bulb, the lamp throws it several times its size across the wall and the desk, soft,
     along the line from the bulb through the moth, sweeping as it loops and fluttering as its wings beat: the lofi
     picture of a moth at a lamp.
108. **The kitten and the moth.** For spells of half a minute or so while it flies, the kitten's eyes go to it, and if
     it was nodding along it stops to watch (a cat cannot leave a moth be). The first drawing let the music win, and the
     kitten went on nodding with its eyes shut while the moth flew over it.
109. **The end.** As the hand turns the lamp down, the moth leaves the dimming light and flies up and across to the
     window, and settles on the glass in the right-hand pane under the moon, pale in the moonlight, as the show ends.
     First placed among the fairy lights' bulbs, and dark, it was lost; it sits just under the string now, moonlit.
110. **Looked at:** its loops and rests at full size; the shadow on the wall; the kitten watching; the end. A scrub back
     is the same frame. `check:shows` holds its coming (as the rain thins, well before the end) and its place on the
     moonlit glass at the last.

### The forty-second pass: room to breathe, and the window's light

Eight passes had each added a moment. Laid out on one timeline, the half hour had sixty things in it that draw the
eye, about two a minute, which is fine for a piece to leave on; but some landed on top of each other, and some on the
machine itself, whose drops and lobs are the show's backbone.

111. **The timeline, audited.** The worst: the hand began scratching the kitten one second after the 9:35 lob; the sip
     ended as a lob began; at 15:31 to 16:13 a flash, a drop, the neighbour's long look, hands round the mug and a yawn
     came in forty-two seconds; a stretch four seconds after a shooting star. Now nothing that draws the eye lands on
     the machine (`machineBusy`, `lamp/route.ts`, used by the hand, the stretches, the lightning and the neighbour's
     comings and goings), the stretches keep further from the sky's moments, and the yawns further from the hand.
112. **What moved:** the sip to 5:47; the chin scratch to 10:36; the hands round the mug to 14:03, four seconds after a
     flash, as anyone reaches for something warm when the storm comes close (a hand may follow a flash now, and may
     share the night with someone across the street, at the other end of the frame); the third flash to 15:52; the
     stretches a few seconds later (11:20, 26:47). The face in the mist (19:00), the tea's refill (22:07, 24:35), all
     six yawns and four washes, and everything in the sky still land. What is left close together is a window moment
     beside a desk moment, the eye's two places, rarely both at once.
113. **The window's light on the room** (`lamp/rim.ts`). Everything on the desk stands in front of the window, and had
     never been lit by it. Now the window backlights them: a thin rim of its light along each thing's top, the books,
     the mug's rim, the Walkman, the pot's rim and the plant's leaves against the glass, the kitten's back and the top
     of its head. Peach in the dusk, the night's blue after, paler and brighter under the moon in a clear sky; strongest
     under the window and gone by the lamp. When the lamp is turned down at the end it is the room's light: the desk
     moonlit, the kitten asleep in it.
114. **Looked at:** the moved moments, at full size; the rims at dusk, in the rain and in the moonlit end. A scrub back
     is the same frame. `check:shows` holds the rule: no reach, stretch or flash on a drop or a lob.

### The forty-third pass: still light enough to leave on

Seventeen passes since the frame rate was last measured (the soft city, the hand and its shadow, the trains, the moth,
the window's rims), so it was measured again before anything else was added, in Chrome with its GPU, 1920 × 1080 at
2× (a 3840 × 2160 canvas), a visible window, four seconds at each of a dozen moments, against this branch before those
passes (a headless browser throttles its frames and measures nothing).

115. **The hand cost a frame.** Everywhere else both were a steady 60 frames a second (the slowest frame 18.7 ms), but
     whenever the hand was in, every few frames took 35 ms: dropped frames, through every reach. The hand's shadow was
     drawn into a scratch canvas the size of the whole view and laid over the picture with a multiply blend, both every
     frame. Now it is drawn only round the hand and its sleeve, and laid over plainly (black at the shadow's alpha
     darkens exactly as the multiply did), and the scratch canvases are made once at the size they will need rather
     than grown mid-show. Every reach holds 60 frames a second; the slowest frame anywhere measured is 19.8 ms.
116. **The looks, audited full size**, each of the seven held frames in the dusk, the rain and the clear night. One
     fault: the moth's shadow on the wall was a dark smudge, two soft blots that read as dirt on the paint. It is a
     moth's shape now, wings out, opening and closing with its beat, a soft edge round a firmer middle.
117. Considered and not built: a look up at the sky through the window in Daydream's break, the moon and the stars
     filling the frame. The ball would leave the picture for twenty seconds, which the show has never done.

### The forty-fourth pass: the one at the desk, in the window

The streams this show takes after are a person at a desk. Here, for six passes, the person was a hand and a sleeve,
never seen: the camera is where they sit. But at night a window is a mirror, and whoever sits at a desk facing one
sees themselves in it.

118. **Their reflection** (`lamp/reflection.ts`). Once it is dark outside and the lamp is on them, they are in the
     glass, faint, behind the rain: hair up in a bun, a fringe, the sage sweater the hand's sleeve is, head bowed over
     the work with the lids lowered, nodding a little with the drums. It is light on the glass and only adds (a
     reflection never darkens what is behind it), so the city, the neighbour's window and the rain all show through.
119. **It does what the hand does.** At the sip, the mug comes up to their lips in the glass as the real one comes up
     out of the picture; when the finger draws on the pane, they look up from the work at it; they look up at the
     lightning and at a falling star; they come with the lamp after the dusk has gone, and as the lamp is turned down at
     the end they fade with it, the last of them going as the light does.
120. **Where it is.** One's own reflection is in front of one, so it moves with the camera, nearly all the way: it is in
     the right-hand pane when the camera faces the window, slides across the glass with the sill walk, and is gone when
     the camera looks at the lamp. It is never shown half out at the glass's edge, a figure lurking there; mostly in, or
     not at all.
121. **Drawn three times.** The first was a head floating over a dome of sweater, too faint to find; the second read as
     a person but stood as a pale block over the neighbour's window, and a reflected arm reaching to meet the drawing
     finger was a beam of light (taken out; they look up instead). Now: a neck and sloping shoulders, the sweater fading
     down into the dark (the desk below throws nothing back), at about a third of the light it could have.
122. **Looked at:** full size and at 4K, in the rain, at the sip, at a flash, in the clear night, at the end; the frame
     rate (60 a second in every look that shows them). A scrub back is the same frame. `check:shows` holds that they
     are seen in the dark glass while the lamp is on, not at dusk, and nearly gone when the lamp is down.

### The forty-fifth pass: studying, in the window

Last pass gave the person at the desk a reflection that bowed its head and did what the hand did. The streams it takes
after are of someone at work: this pass makes the reflection that.

123. **Writing.** Bowed over the work, their head goes along a line and back to the start of the next, every few
     seconds, as anyone's does writing.
124. **Thinking.** Now and then (about every other forty seconds, never while the hand is out) they stop: the hand
     comes up with the pen's end against their lips, and they lift their head and look out at the night a few seconds,
     then go back to it. Small, as everything in the glass is.
125. **A stretch is catching.** At 26:55, a second after the kitten's late stretch on the desk, the one in the window
     stretches too: elbows wide, hands together over the bun, a yawn; then back to the work. Played to the camera: the
     window holds them all the while. The first drawing put the arms up in a tall pointed arch, a church window; they
     bend at the elbows now.
126. **Looked at:** the thinking at 4K, the stretch frame by frame, the frame rate (60 a second). A scrub back is the
     same frame. `check:shows` holds the stretch: late, just after the kitten's, while they are seen.

### The forty-sixth pass: every screen, after the people came in

Six passes added things (the hand's new reaches, the face in the mist, the trains, the moth, the rims, the reflection)
and were looked at in the composed 16:9 frame. The show is left on on phones and laptops, in Zoom and in the overview,
so the live stage was captured at each new moment on a phone held upright (430 × 932), a 16:10 laptop (1440 × 900),
both in Zoom, and the overview.

127. **The sip on a phone.** A phone held upright sees two cells and more below the desk, and the mug, carried "toward
     the camera, out at the frame's foot", stopped where a 16:9 frame's foot is: on the phone it hung, huge, in the
     middle of the picture over the drawers, a hand holding a giant mug in the dark under the desk. The mug's way to
     the lips is now measured to the foot of whatever frame is showing, so on every screen its rim stands just over the
     bottom edge while they drink, and taking it away carries it on out of any of them. The 16:9 frame is as it was.
128. **Looked at and left:** the hand's sleeve on a phone, fading into the dark under the desk; the reflection and the
     moth in Zoom's closer frame (the city soft behind them, as at the cup close); the overview, where the reflection
     stands where the hidden camera faces, and the hand, at the end of its reach, goes out through the room's dark
     under the desk (the overview is not the desk's point of view; nothing can come from where the person sits there).

### The forty-seventh pass: beads that are lenses

129. **The near lights, built and taken out.** The show's depth is all behind the glass; nothing stood between the
     camera and the desk. A swag of the fairy lights' string hung near the camera, across the top corners, far out of
     focus: warm discs that slid against the camera's moves. Looked at, they were flat polka dots pasted on the lit wall
     (only the one over the dark window read as a light out of focus), and the corners were better clean.
130. **The beads on the glass were flat lavender dots**, through the rain, which is most of the half hour, in most of the
     frames. A bead on a night window is a lens: it shows the night upside down. Each bead larger than a fleck now does:
     the lit street below in its top half, warm as the city's windows are (and as many of them as are on), the sky
     above in its bottom half, a dark edge low on it where it bends the light away, and the lamp's highlight. The
     flecks are as they were. Still sixty frames a second in the heaviest rain.
131. **Thinking, they looked straight out at us.** When the one in the window stops with the pen at their lips, their
     head turns a little to the left now and their eyes go to the rain, not to the camera.

### The forty-eighth pass: the air over the cup

132. **The cup close is the look the camera holds longest** (about a sixth of the half hour), and the only things
     moving in it were the ball's nod and the dust drifting in the lamp's light. The cup is a speaker: it plays the
     kick. Now the air over it moves when it does. A dozen motes hang low round the headphones (above the cushion, never
     specks on its front), and on every kick each mote near the cup is pushed out and up a little, catches the light as
     it turns, and drifts back before the next: about fifteen pixels at the cup on a 1080p frame, less with distance,
     as hard as the kick was struck. In a break, with no kick, the air is still. The first strength moved them seven
     pixels at most, too little to read as the music.

### The forty-ninth pass: every five seconds

133. **The whole half hour, a frame every five seconds** (364 frames, in grids): a dozen passes of additions, looked at
     together for the first time at that density. One fault, three times (2:38, 15:18, 18:08): a train crossing while
     the city was soft was a row of small evenly spaced beads, a dotted rule drawn across the glass at the sill's
     height. Out of focus now, each car's lit windows are one warm band softened with the rest of the city, a train of
     glows; in focus it is as it was. Nothing else: the moments keep apart, no frame is crowded, the ball is in every
     one.
134. **Asleep, the tail comes round.** As the kitten drowses at the end, its tail comes round the front of the loaf
     along the desk and its tip, a shade darker, tucks up under its chin: the last thing it does, settled for the night.

### The fiftieth pass: left on

135. **The whole half hour, played.** Frame rate had only ever been measured four seconds at a time. Played through
     from the start in Chrome with its GPU at 1920 × 1080 on a 2× display, sampled every thirty seconds (two seconds of
     frames each, and the script's memory): sixty frames a second throughout (the median frame 16.7 ms in every
     sample), and memory flat, 24 to 30 MB from the first minute to the last, with nothing growing. A handful of samples
     had a slow frame or two (one, at 15:02, a run of them); measured again there, and at the others, each was a steady
     60 with the slowest frame 18.7 ms: the machine, not the show.
136. **Safari's way.** A browser whose canvas cannot blur (Safari before version 18) draws the soft city by scaling it
     down and up instead. That path had never been seen: forced on in Chrome, the soft frames (the sill walk at dusk,
     the cup close in the rain, a train passing soft, the moth's night) look as the blurred ones do, the city soft and
     its lights opened into discs. (The installed WebKit would not run under this Playwright.)

### The fifty-first pass: mist after the rain, and a dream

137. **Mist after the rain** (`mistAt`, `lamp/sky.ts`). The window's evening went from rain to clear as the rain thinned,
     nothing between. Now, as it stops (from 23:00), a low mist gathers over the wet city: long soft banks drifting
     slowly between the far roofs and the near, a thinner one over the near roofs, lavender, lit warm from under by the
     city's windows; thickest about 25:00 to 26:40, and lifted by 28:40, before the moon is high. Each bank at its
     depth, so it slides with the city as the camera moves, and goes soft with it.
138. **The kitten dreams.** Asleep at the end, once (30:06), an ear and the tip of its tail twitch, twice, and are still.

### The fifty-second pass: a new track

139. **The kitten hears each new track.** A stream is a playlist, and the one thing a cat does with music is notice when
     it changes. As each track after the first begins, out of the breath between, the kitten's ears come up and turn a
     little forward and it glances down at the Walkman a moment or two, then goes back to the ball. Eleven times in the
     half hour, each in a frame that shows it (the sill walk's, where the camera is between tracks); a flash of
     lightning, at 12:29, takes its eye instead.

### The fifty-third pass: up to the window

140. **The kitten climbs to the sill to sleep** (`climbAt`, `lamp/cat.ts`). In the streams this takes after, the cat
     sits at the window. Here it never left its place on the desk, because the ball has the sill, and the camera, the
     hand and the checks were all built round where the kitten lies. But in the last track the ball goes down into the
     cup and stays, and the camera draws back to the whole room: the sill is free, and everything is in view. So, from
     29:57, over some thirteen seconds: it gets up, walks along the desk to the books, hops up onto the top one, turns,
     hops up onto the sill (the ball's stair, the other way), walks along the sill under the window, its tail up,
     turns round as a cat does before it lies down, settles into its loaf, looks up at the moon as the hand turns the
     lamp down, and falls asleep there, its tail round its front; it dreams once. The last picture is the kitten
     asleep on the sill under the full moon.
141. **How.** The cat is drawn as it always was, carried and turned about its middle (a turn is the body narrowing
     to nothing side on and opening the other way); its stretch's legs carry it, now stepping by turns as it walks; its
     gaze goes where it is going, then to the moon. Its shadows on the desk go when it does, and on the sill it has its
     own. Its place on the desk, which the frames, the hand and the checks all use, is unchanged.
142. **Looked at:** the whole climb at 0.8 s a frame, full size and at 4K (the walk, the hops, the turns, the look up,
     the sleep); an upright phone; sixty frames a second through it. A scrub back is the same frame. `check:shows`
     holds it: on the sill at the end, clear of the pot, after the ball is in the cup for good, with the room in frame.

### The fifty-fourth pass: both ears

143. **The far cup plays the snare.** The near cup has played the kick since the first pass, and since the
     forty-eighth the air over it moves when it does. Headphones have two: the far one, standing on its edge by the
     lamp, now plays the snare, and the dust in the light under the band's arch, beside it, lifts and glints on each
     crack (two and four, or three in the half-time tracks), as hard as it is struck, and drifts back. Left ear the
     kick, right ear the snare. First placed round the far cup itself, at the lamp pool's edge, the motes caught no
     light and could not be seen; they hang on its lit side, under the arch, now.
144. **They watch the kitten go.** As the kitten climbs to the sill at the end, the one in the window looks up from
     the work and down to it; on the sill the kitten walks across the glass in front of them.

### The fifty-fifth pass: it wakes with the lamp

145. **The show opens on the kitten asleep**, curled in its loaf on the desk in the dusk's dark, tail round its front,
     the way it ends asleep on the sill. As the hand turns the lamp on with the first chord, it stirs: its eyes open,
     heavy-lidded, its head comes up, its tail draws back along the desk, and a moment later it yawns, and the night
     has begun. The two ends of the half hour are now one gesture each way: the lamp on and the kitten waking, the lamp
     down and the kitten asleep under the moon.
146. **The tail, fixed on the way.** Coming round, and going back, it faded in and out where it lay: a ghost of a tail
     across the desk for a second. It slides now, its tip drawn along from its rear to under its chin, and back.

### The fifty-sixth pass: every five seconds, again

147. **The whole half hour, a frame every five seconds**, after six passes changed it (the mist, the far cup's snare,
     the kitten's glance at each new track, its climb to the sill, its waking with the lamp): 364 frames, looked at in
     grids, and the moments that looked odd small (the one in the window stretching, the end) at full size. Nothing out
     of place. The share card, regenerated (the dust by the far cup, the window's rims); kept at its dusk still, which
     is warmer than the end's, where the hand is reaching for the lamp.

### The fifty-seventh pass: its shadow goes with it

148. **The kitten's shadow on the wall stayed behind.** Since it learned to stand (the stretches) and to climb (the
     end), its soft shadow on the wall kept the shape and place of the loaf lying on the desk. It goes with it now:
     lifted as it stands, along the desk and up the books as it climbs, turned with it, and gone once it is on the sill,
     in front of the glass, which takes no shadow. Faint, as the cat is far from the lamp; a thing to be right rather
     than to be seen.

### The fifty-eighth pass: the director's cut

Twenty passes added things, each looked at alone and each tasteful alone. Counted together, the half hour had 116
moments that draw the eye, 3.8 a minute, nearly twice what it had when the pacing was last audited (forty-second
pass); a piece to leave on wants room more than incident. So this pass takes away, from what repeats most and means
least each time:

149. **Thinking pauses**, the one in the window stopping with the pen at their lips: from 24 to 8. Seldom, they read as
     a thought; every minute and a bit, they read as a loop.
150. **Trains:** from six to four, further apart (2:30, 7:04, 11:24, 15:45).
151. **The neighbour's crossings:** from six to four, and the long look out at the rain, kept.
152. **Headlights on the wall:** from seventeen to twelve, two to three minutes apart.
153. What stays: everything that is the music's (the drops, the lobs, the kitten's glance at each new track) and every
     one-off (the lightning, the stars, the planes, the hand's reaches, the kitten's stretches, climb and waking).
     Ninety-one moments now, three a minute. Everything still lands, re-scheduled round the gaps (the face in the mist
     at 18:53, the tea away at 22:07 and back at 24:35). `check:shows` holds the hand's reaches in any order between the
     lamp's two, and five or more crossings.

### The fifty-ninth pass: a cold review

After fifty-eight passes by one director, forty frames across the half hour were given to a reviewer with no context
and asked for what a viewer would notice. Of its ten points, four were right and are fixed:

154. **The headlights were the window's shape on the window's own wall**, bars and raindrops in it: light that wall
     could never get. The sweep is a soft, shapeless wash now, brightest high on the wall as light coming off the
     ceiling, and it still moves across, and the cat still follows it.
155. **The kitten seemed to stare at the camera** in the window's looks: it was looking at the ball on the sill above
     it, but its pupils moved too little to say so. They travel further now; its gaze reads.
156. **The reflection was too present**, a figure behind the rain on first look: a quarter less strong now.
157. **The face in the mist read as an ink sticker**: its cleared line is softer, as fog wiped by a finger.

Not taken: the ball "floating" by the window (a frame mid-lob, the machine's flight); the mug "vanishing" (the
refill, its hand out of a still); hold the wide frame four fifths of the time (the show is built on its looks; a
question for Stephen, below); the moth's large shadow (a light that close throws one that large). The headphone cup and the ribbon were then fixed (the sixtieth pass).

### The sixtieth pass: headphones that read as headphones

158. **The cup close's cup read as a cushion**, a pincushion or a loaf (the cold review, and on looking again, fairly):
     the ball sat on a pillow, and the machine's whole idea (the listener's seat in the headphones) was lost in the look
     the camera holds longest. The near cup now says what it is: a bright rim where the cushion sits in the shell, a
     round badge on the shell's side, the cushion's stitched seam, and on the band, where it leaves the yoke, the bright
     strip of its adjusting slider.
159. **The book's ribbon read as a stray red wire.** It is a flat silk ribbon now, wider, out of the pages and lying on
     the book below with its end cut in a V.
160. Sixty frames a second in the cup close, as before; a scrub back is the same frame; the share card regenerated.

### The sixty-first pass: a cold review of the motion

Stills hide motion, so a second reviewer with no context was given nine strips of twenty consecutive frames each,
through the moments that move: the drop, the lob, the nod, the sip, a chin scratch, a stretch, a wash, the climb, the
tea brought back. Taken:

161. **The climb's hops had no gathering.** The kitten stood, then was on the books. Before each hop it now gathers
     itself low on its haunches for a third of a second, and lands with a give in its legs; and it turns round twice
     as fast, so the side-on moment of the turn is a blink, not a cut-out.
162. **The scratch ended in a snap**: the hand gone and the kitten wide-eyed in one step. The kitten goes on
     enjoying it after the hand has left, its eyes opening slowly, last; and the fingers are under its chin now, not
     over its muzzle.
163. **The sip and the stretch held too long.** The mug stays at someone's lips a second and a half, not two and a
     half; the kitten's stretch holds a second, not a second and a half.

Not taken: the stair's slow even steps and the nod's size, which are the machine's timing to the music, checked
against it; the sip's mug going out of the picture (it goes to someone's lips, under the frame); the lob's launch (the
ball crouches into the cushion before, on the kick).

### The sixty-second pass: the motion review's last points

164. **The wash never went over the ear**: the paw stopped at its cheek, so the wipe that is a cat washing did not
     read. It goes up the side of its head now and over the ear, the forearm bending round the outside of its cheek
     (not a stick across its face), thicker, and the head leaning further into it.
165. **The stretch's forelegs were two straight tubes** from the chest to the paws. Reaching out, they bend low at the
     elbow and lie along the desk to the paws, as a cat's do in a stretch.
166. Looked at and left: the tail rising behind it as it gets up (at a frame every 0.12 s it comes up continuously from
     behind its rear, quickly: a strip at 0.37 s a frame had skipped it).

### The sixty-third pass: a cold review on a phone

A third reviewer with no context looked at twenty-four frames of the live stage on a phone held upright. Taken:

167. **The hand at the lamp came up out of the dark under the desk.** On a stage taller than it is wide the frame's
     foot is far below the desk, and the hand, reaching from there for the lamp's knob, rose out of the drawers. It comes
     from the right now, at about the desk's height, an arm resting along the desk reaching over, on every shape of
     screen; the knob turns under its fingers as before.
168. **The moth's shadow, flagged a third time**, still read as a stain. It is nearer the moth's size (thrown from
     closer), and drawn as three faint spreads, so its edge is a blur and it is half as dark.

Not taken, and put to Stephen: in the closer looks the kitten is out of frame (the cup close and the lamp's side are
composed without it; the cat plays to the frames that hold it), and a stage taller than 16:9 sees a dark band under
the desk (the stage's own policy, centring the composed frame; the room is built down to the floor to fill it).

### The sixty-fourth pass: the room seen mostly whole

169. **Three cold reviews pointed at the camera**: too much of the half hour in the two closer looks that leave the
     kitten out (the cup close and the lamp's side, 30% between them), and the kitten missing from a glance. Not a new
     camera; a new balance. Each track now takes the groove's four looks in a cycle of six phrases, the cup close and
     the lamp's side once each, the desk under the lamp and the window twice each. The cup close and the lamp's side
     are 22% of the half hour now, and the kitten is in the frame 78% of it (it was 70%).
170. **Everything played to the camera was worked out again** against the new frames, and lands: the sip at 3:45, the
     scratch at 9:20, hands round the mug at 11:13, the face in the mist at 13:32, the tea away at 18:52 and back at
     21:25, the kitten's stretches at 6:03 and 21:38 (the first now looks from the second track on, the check takes
     "late" as after 20:00). A yawn that landed on a flash of lightning keeps clear of the flashes now.

### The sixty-fifth pass: a fourth cold review, and stillness

A fourth reviewer with no context, on forty new frames after the camera's rebalance. What it found that three before it
had found too is taken, firmly:

171. **The camera was still too restless** (the fourth to say so): a new look every phrase. A look now holds two
     phrases, sixteen bars, about forty seconds: nineteen fewer moves in the half hour. Everything played to the camera
     was worked out again and lands (some of it now at new times: the sip 4:32, the scratch 10:44, hands round the mug
     14:12, the face in the mist 19:13, the tea away 22:06 and back 24:35, the stretches 11:01 and 26:24, the one in the
     window's 26:51). To make room, the kitten now stops nodding along to wash or to stretch (it had to wait for a phrase
     it spent watching), and their stretch follows the kitten's within half a minute, not within ten seconds.
172. **The moth's shadow, flagged a fourth time**, is gone. The moth stays.
173. **The headphones' "eye" and "second lamp neck"**: the badge on the cup is a small dot, and the band's bright slider
     strip, which made the band read as a gooseneck beside the real lamp, is gone.
174. **The face in the mist read as a toothy grin** with its drips: no drips now, a smaller mouth.
175. **The moon shone through the rain**: it is behind the cloud until the rain has gone.
176. **The steam crossed itself into letters**: its wisps sway half as wide as they rise, nearly parallel.
177. **Too much dust**: a fifth fewer motes in the lamp's light, the ones by the cups as they were.

Not taken: the cat's half-lidded eyes (a taste), the mug away for its refill.

### The sixty-sixth pass: an ear cup

178. **Two reviewers still saw a cushion, not headphones.** From the side, the near cup was a padded slab under the
     ball. The one thing that says "ear cup" at a glance is its face: so its cushion's top is seen a little from above
     now, a ring round the dark speaker cloth, and the ball sits in the dark of it. Sixty frames a second as before.

179. **The lip, after the ear cup.** The strip of cushion drawn in front of the ball, so it sits down in the cup, was a
     rectangle; over the new dark hollow its straight sides cut the dark, a light tab under the ball. It is the front of
     the ring now: everything of the cushion in front of the hollow's near edge, the full width of the cup, down to just
     above the shell's bright rim, the hollow's edge and the seam drawn on it. The ball sits down in the dark.

### The sixty-seventh pass: a pair of headphones

180. **Every cold review put the headphones first or near it**, and a fifth said what the earlier patches had not fixed:
     two unmatched dark shapes (a pincushion on a box, a black slab standing on edge) and a band leaving one from its
     corner, a hose. Redrawn as one pair, in the same places so the machine is unchanged: cream shells and dark pads,
     as lofi desks have them; the near cup a shallow bowl lying on its back, its dark pad a ring round the speaker cloth
     with the ball in it; the far cup a rounded shell on its edge, its pad toward the near one, its lamp side lit; each
     cup in a yoke, a fork round its middle, and the cream band, padded underneath, from yoke to yoke. The cream takes
     the lamp, so the far cup is no longer a dark hole in the pool of light. The drawer line and the badge are gone.

181. **The reflection left the glass in the desk's look.** It moved with the camera nearly all the way, so with the
     camera on the desk under the lamp it had slid off the right of the pane, and a reviewer saw it vanish with the
     same pane in view. It still moves with the camera, but eased into the right-hand pane at either side, so the desk's
     look shows them too; and where the frame's own edge would cut through them (the lamp's side), they are not shown,
     rather than a face peering in at the edge. Their stretch now comes seven seconds after the kitten's (26:31).

182. **The kitten's walk was a footstool sliding**: four straight legs shuffling a little to and fro. It walks now: each
     foot swings forward lifted and goes back planted, the diagonal pairs together, a lifted leg folding at the knee
     (or the hock, behind), and the body bobbing a little at each footfall.

### The sixty-eighth pass: a creative director's review

A sixth reviewer was asked not for faults but for what keeps the piece from feeling like Lofi Girl. It said: the camera
does not settle; the eye has no warm, human centre; and the colour has no depth, everything one mid-value mauve.
Taken:

183. **The cup, close, is out of the rotation**: "the dullest frame in the piece, the least loveable object at the
     largest size" (it, and three reviewers before it). The groove's looks are the desk under the lamp and the window,
     the room's two homes, and the lamp's side once a cycle. The kitten is in the frame 90% of the half hour now (77%).
     Everything played to the camera lands again (the sip 3:12, the scratch 9:20, the mug 11:13, the face in the mist
     19:13, the tea 20:44 and 22:49, the stretches 8:39 and 24:00, theirs 24:08).
184. **Colour with depth.** The night sky is a deeper blue, less lilac, so the room's one warm light has a cold to
     stand against; the vignette is deeper and cool at the edges, so the corners are in the dark and the lamp's pool
     is the warm place in the frame.

Put to Stephen, not done: one locked home shot for the half hour (all six reviewers lean that way); a notebook in the
lamp's pool with the hand writing in it, the human centre the reviewer asked for; thinner, tinted outlines toward a
painterly look (taken, the sixty-ninth pass). The other two would change the piece's design rather than finish it.

### The sixty-ninth pass: a drawn line

185. **The heavy near-black outline round everything** read as flat vector illustration (the creative director's
     review). The room's line is now a deep warm plum, not black, and a little over two thirds the weight: the outlines
     sit in the picture's colour rather than on it, drawn rather than inked. The ball keeps the stage's own line, a
     shade firmer than the room's, which suits the one thing the eye should find.

**Subtracted:** the cup, close, from the camera's rotation; the moth's shadow (four reviewers read it as a stain); the face's drips; the band's slider strip;
twenty-three moments in the director's cut (sixteen thinking pauses, two trains, two crossings, five
headlights); the near lights, out-of-focus bulbs across the frame's top corners (flat discs on the wall); the second chin scratch (to make room for the face in the mist); the tea bag dunked by its tag (the hand's first idea); the light cone; the ball's ink mark; the cup of pencils; the pages turning on each track (considered and not built: the page is the notebook's
second job); a cable from the headphones (until the Walkman gave it somewhere to go); a drinking bird that would have lifted the ball (a character, and a gag);
the headphone "U" the ball first rocked in; the beads' dark cover; a quarter of the drops on the glass.

## Judgment calls for Stephen

- **Track cards.** Each track's name and artists come up for a few seconds as it begins, on one line, as a stream
  shows what is playing. It is twelve cards in half an hour; they could go.
- **A lap a track.** The round is the same twelve times; what changes is the track (its tempo, its kick, its breaks,
  its lob's height), the weather, the lamp's warmth, the night outside and the camera's order. The alternative was a
  new mechanism per track, which the brief ruled out as a gag every few minutes.
- **The end.** The ball stays in the cup, the cat sleeps, and the lamp goes down to a glow, rather than going out: the
  moon and the fairy lights' low glow are the last light.
- **The cat.** It is the one character, and a kitten for the desk's scale. It nods along in about half the groove's
  phrases (chosen per phrase, not per track); fewer would read as a cat that watches, more as a gag.
- **The headlights.** Roughly every minute and a half once it is dark, four seconds each; they could be rarer.
- **Its Short.** The stage letterboxes every show's 9:16 Short, so this one's is 70% black bars, though its room is
  built floor to ceiling and the live upright stage already fills a phone with it. A per-show choice to fill the Short
  (as the live stage does, seeing more world, never less) would make a better Short here; it is a change to the shared
  stage, so it is not in this PR.
- **The focus.** How soft the city goes at the desk is one number (`blurOf`, `lamp/lens.ts`), and how far the layers
  move is one per layer (`DEPTH`, `lamp/sky.ts`). Both are set to be felt on a move rather than seen in a still.
- **The hand.** Someone at the desk, never seen but for a hand and a sleeve, eight times: the lamp on, a sip, a chin
  scratch, hands round the mug, a face drawn in the mist, the mug away and back, the lamp down. It could be fewer (the lamp's two
  and the refill alone would still say someone is there). The sweater's colour is one constant (`KNIT`, `lamp/hands.ts`).
- **The reflection.** The one person in the show, seen only in the window, faint. It is the boldest addition; its
  strength is one number (`globalAlpha`, `lamp/reflection.ts`), and it could go entirely and leave the hand alone.
- **The moth.** The room's only living thing besides the kitten (and the hand), for the last seven minutes.
  Its spells of the kitten's attention take a little from its nodding along late in the night.
- **The lightning.** Three far-off flashes, no bolt. They could be fewer, or gone; they are the only sudden light in
  the half hour.
- **The camera.** The cold reviewers' big suggestion was to hold the wide room most of the time. Taken halfway (the
  sixty-fourth pass): the closer looks are rarer, the whole-desk looks commoner. Holding the wide room most of the time
  would go further, the machine small in it.
- **The grain.** At 55% of a light tile; it can be turned down, or off, in `lamp/decor.ts`.

## Checks

`check:shows` (`apps/rube/checks/soft-lamp.ts`): the picker entry and the Ambient shelf; the cue (YouTube only, from
the video's zero, until the twelfth track's floor, credited); half an hour; the twelve tracks in order, each on a
whole-number grid, each with an intro, sixteen bars or more of groove, and an outro; the ball never jumps and every leg
starts where the last ended; a lap a track, the last staying; the drop on the drums' first downbeat onto the top book;
every step and the cup landing on one or three; the lob on the last drum bar's three and the landing on the drums'
last downbeat; the turn at the pot and a walk that never turns back or stops; nods only on kicks struck on one or three,
in the groove, in the cup; the ball in the hollow while it sits; still at the end; the camera under half a frame a
second and half a frame a second a second; every held frame whole and clear; Zoom; the words.
