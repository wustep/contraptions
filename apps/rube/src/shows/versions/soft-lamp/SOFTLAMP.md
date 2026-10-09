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
  moon risen into the right-hand pane (and, late, a shooting star or two). Outside, the city's windows come on
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
  track's drums leave, it puts its head down and sleeps.

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

A break draws back to the room, and so does the bar before each lob, so the whole arc is in the frame.

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

**Subtracted:** the light cone; the ball's ink mark; the cup of pencils; the pages turning on each track (considered and not built: the page is the notebook's
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
