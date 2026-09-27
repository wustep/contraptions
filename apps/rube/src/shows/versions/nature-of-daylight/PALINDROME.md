# Palindrome

The recording is copyrighted. This take is a private tech demo only; do not ship this audio in a public build.
Nothing here claims any right to it.

The music is Max Richter's *On the Nature of Daylight*, from *The Blue Notebooks* (2004): the recording *Arrival*
(Denis Villeneuve, 2016) opens and closes on. The attribution is in
`apps/rube/src/shows/versions/nature-of-daylight/ATTRIBUTION.txt`.

Open it at `/shows/nature-of-daylight/opus55/` (or `/shows/?show=nature-of-daylight&take=opus55`). In the Shows
picker it is the work **Palindrome**, whose one take is **Opus 5.5**.

## What it is

A Rube Goldberg machine plays the cue from its first sample, 6:15, and the end credits run on in the quiet after it:
6:48 in all. It tells the whole of *Arrival*, in order, as machines, and it ends on its own first frame.

The title is Hannah's name, which reads the same both ways; the heptapods' writing, which has no forwards or
backwards; and the film, whose end is the beginning of her story. The show keeps three palindromes on screen: the
shell goes up into the cloud exactly the way it came down out of it; the world's twelve links fall like dominoes and
stand again in the reverse order; and the last frame is the first.

- **Louise Banks** is the gold ball (`#E9A93A`): the daylight of the cue, the one warm saturated thing in every frame.
  She is the thread: every machine is hers to make go.
- **Ian Donnelly** is the blue ball (`#4E7FB5`): from the camp to the chamber, in the tent, on the meadow at the end.
- **Hannah** is the rose ball (`#DE6F86`), who grows: a baby in the cradle, a child and a girl on the swing, a young
  woman in the bed and in what Louise is shown. She is only ever at the lake house.
- **General Shang** is the red ball (`#A8322D`), only at the gala, years on.
- **Abbott and Costello**, the heptapods, are drawn, never balls: a heavy body on seven limbs, a hand standing on its
  fingertips, always in fog.

Everyone else is a ball too, a small dark disc at the balls' own scale: the gala's guests. There are no drawn people.

## The cue

**Why this cue.** The film uses it twice, over the prologue (Hannah's life and death) and over the ending (the choice),
so both ends of the show are the film's own. And it is shaped like the film:

- 0 to 102 s, the **lament**: the low strings alone, the viola's line over one slow ground. The prologue.
- **102.110**: the double bass comes in under everything on one downbeat and the violins take the tune up high. The
  shell.
- **200.626**: the bass drops out for two bars; the second half. The world breaks.
- **288.554 to 318.711**: the loudest eight bars. The call; the world mended; the shells go as the high violins stop.
- The long descent onto B-flat and its dying by 372.75: daylight, the choice, home.

**The audio.** Fetched once from the label's upload (FatCat Records, `rVN1B-tUpgs`) with a current yt-dlp and
re-encoded to mp3 with no edit and no gain change: every onset is the recording's own. The show also plays that same
upload through the YouTube cue, on the same clock.

**Its clock.** A string quintet playing freely: a beat is 0.87 to 1.1 s and a bar anything from 3.5 to 4.8 s, so no
comb fits. `scripts/shows/nature-of-daylight-onsets.py` measured the recording once into
`scripts/shows/plans/nature-of-daylight-onsets.json`:

- **Beats** (381), tracked one by one by a dynamic program whose tempo may drift, each moved onto its own attack where
  one is within 40 ms (three in four have one), with how hard it is played.
- **Changes of chord** (99), found from the harmony itself: a Viterbi path over the major and minor triads on a fine
  chroma (an 8192-sample window, so the cellos' low notes resolve), with a price on every change so a passing note does
  not count; each change put on the beat nearest it. The ground is B-flat minor, A-flat or F minor, D-flat, G-flat, a
  chord a bar, two at a cadence.
- **Onsets** (1899): the bow changes and the tune's notes.
- **Loudness** every quarter second, and the landmarks the story is cut to.

**The coupling rule.** The chords are this piece's heartbeat, so every change of chord makes something happen: a
push, a rock, a latch, a light, a card pinned, a screen falling. 95 of the 99 are struck; the four left are cuts
where she is at rest. Between chords the machines strike beats only where they have a reason to (the clock's
pendulum, the keypad, the dominoes), and move between strikes as pendulums, rockers, ink and light: continuous and
damped, never parked. Every strike is on a beat, a chord or an onset.

## How it cuts

`palindrome/show.ts` is a multiverse show on Logogram's kit: the path is cut into legs, one place a leg. At a cut the
ball moves into the next place's cells and the camera moves by exactly the same amount at the same instant, so on
the screen she holds still while everything round her becomes somewhere else: a match cut on Louise. `seams.ts` says
her velocity, the camera's distance and where Ian, Hannah and Shang are at every seam, so the parts on either side
agree without seeing each other.

- **The cut on the shell** (102.110, the double bass). The one cut not on Louise. The camera pushes into the
  television until its picture of the news fills the frame; the valley opens with the real shell exactly where the
  television's was, the same size on the screen (`score.ts` works the framing out from the house's `TV_SHELL` and
  the valley's `SHELL_CUT`; `cast.ts` `shellOnScreen` is where the picture puts it).
- **Hannah's rhyme.** At every cut into or out of the lake house Hannah is on Louise's right, a little above her: the
  cradle, the swing's seat, the bed, the swing in the vision. The same place on the screen, a different age.
- **The white-out** (231.039): the blast's dust in the chamber, lit by the broken glass, swells to white, and the fog
  beyond the glass comes out of it.
- **The circle.** From the last B-flat (357.471) to the end the camera is exactly on the first frame: the lake house
  at dawn, Louise beside the cradle, baby Hannah in it.

## In order

Times are show seconds; chord *n* is the *n*th change of harmony.

| Time | Music | Place | What happens |
| ---: | --- | --- | --- |
| 0 | silence; the first chord 1.625 | the lake house | The first frame: blue hour, a long room of glass over a grey lake. Louise on the floor beside a wooden cradle, baby Hannah in it. On each chord she rolls into the rocker and the cradle rocks on its runners, damped; the dawn comes up a step a chord. The camera comes in close on the two of them and goes back out. |
| 22.111 | chord 5 | the lawn | Years on: the lawn down to the lake, a great tree at the water's edge and a rope swing, Hannah a child on its seat. The swing is a pendulum a bar long: Louise pushes at the back of the arc on each chord, and at the front, half a bar later, Hannah's feet brush the leaves hanging from the limb. The arcs grow; Hannah grows (a girl by 38.609, the second voice); the year goes round in the tree (summer, autumn's leaves knocked loose, a winter's bare twigs and snow, spring). On 61.365 she leaps from the top of the arc, lands and runs back; the swing dies down to dusk with her on it. |
| 71.953 | chord 17: the cellos | the lake house | Years on: the same room on a grey day, a bed where the cradle stood, Hannah a young woman in it, ill; Louise beside her; a tall pendulum clock by the bed, its pendulum swinging on every beat, its hammer on the bell and a weight dropping a notch on every chord. The camera comes close on the two of them. **On the swell (93.861) the clock has run down, and Hannah goes**: she pales into the pillow. Louise alone by the empty bed. |
| 98.429 | chord 23: the half cadence | the lake house | Night. The television comes on across the room: the news, a shell coming down out of the cloud. The camera pushes into the screen until its picture fills the frame. |
| 102.110 | **the double bass** | Montana | The real shell, where the television's was, coming down out of the cloud between mountain walls, settling at its height as the bass swells; the fog it pushes down rolls out along the valley floor. A helicopter comes round the ridge, a speck against it, and the camera comes down the valley with it to the camp. Louise drops out of its door onto the meadow, rolls into the decon tent and out in her suit; Ian goes up the scissor lift's ramp before her. The lift surges up under the belly on the chords; a seam of light, and the slot opens (121.754), spilling light down on them; up into it. |
| 129.556 | chord 32 | the chamber | Inside: a long dark chamber and at its end the glass, a wall of white. It wakes (135.442); **Abbott looms out of the white (137.381), then Costello (141.224)**, whole in the wide, the two of them tiny at the glass. Her board, which nothing answers; **her suit splits and falls away (145.165)**; she goes to the glass alone, and **a palm of seven fingers presses flat on the glass opposite her (149.171)**, hand on hand, held. Ian comes up beside her; the first logogram (153.060). Then the language, cut shot and reverse shot on the chords: her boards, their rings, each word lifted off the glass and pinned as a card in a row along the back wall; the row complete on 188.012, she reads it all back (190.943), Ian's board asks their question in their writing (192.789), and the answer comes: **a ring with a barb flung out of it, "weapon" (196.795)**. |
| 200.626 | **the bass drops out** | the command tent | Night; the ring of twelve screens, one for every shell on Earth, each linked to the next. **The links fall like dominoes**: one a beat round the ring, each screen tipping dark and knocking the next link free, until only Montana is lit (213.595). |
| 214.657 | chord 55 | the chamber | Another day: Abbott's palm slams the glass. The charge at its foot, blinking on the beats; a jagged ring written in bursts. **223.370: the blast**: the glass shattered, the two of them thrown down the chamber, Abbott reeling back into the fog. Dust in the white pouring through the hole; the light failing; the last of the glass goes (229.129); white. |
| 231.039 | chord 60, in white | beyond the glass | Alone in the fog. Costello points; a jet of ink under her, and a great logogram written round her both ways at once on the chords, lifting her; Abbott far back, sinking and paling away. The ring closes over her (242.480), turns, lets her go at its top (246.340); she falls through it and lands where its ends met. A small ring begins at her right. |
| 250.120 | chord 66 | the lawn | What she is shown: the swing on a summer evening, Hannah a young woman, well, laughing, on its seat where the small ring was. A push; the leaves. |
| 257.683 | chord 68 | beyond the glass | The ring she was shown grows on each stroke until it fills the frame; **on 262.374 its ends meet at her touch and the white floods out from it: she knows**. The palm lets it go. |
| 266.124 | chord 71 | the gala | Years on: an evening reception, champagne light, a crowd of dark discs. She rolls onto a brass pouring stand and a champagne tower fills a tier a beat; the room raises its glasses (272.869); **Shang** crosses to her, leans in and they touch: the whisper (274.802). |
| 277.647 | chord 74 | the command tent | The sat phone. She hops key to key on the beats, the number he gave her; the dead ring on 283.458; the call key on **288.554, the loudest bars**: the call goes up the cable and **the dominoes stand again, backwards**, one a beat, the last to fall the first to rise, **the ring whole on the loudest bar (303.827)**; pulses running both ways round it. |
| 311.293 | chord 84 | Montana | Morning. The lift's deck comes down; **the shell goes up the way it came down**, into the cloud, **gone as the high violins stop (318.711)**. The hush: the cloud churning where it went. **322.606: the cloud tears open and daylight comes down the valley**, sweeping along the floor to her on 326.258; Ian comes to her across the light; they touch (330.170) and hold. |
| 334.031 | chord 90 | the lake house | Home, in the morning light: Louise and Ian by the window, close. A cut, years on: she alone, the empty cradle across the room; she rocks it. **349.495: a cut to the first frame**, blue hour, baby Hannah in the cradle. She rocks it on the last chords, fainter and fainter, the last on the last attack (371.931). The credits in the silence over the wall above the window. |

## End credits

The last chord has died (372.75) and the lake house is the first frame again. From 374.4 s, in the silence, over the
concrete above the window, the credits come, a card at a time, set by the page from `Performance.titles(t)` (a show's
canvas sets no type): Directed by Claude Opus 5.5; With Louise Banks (the gold ball), Ian Donnelly (the blue ball),
Hannah (the rose ball), General Shang (the red ball), Abbott and Costello (heptapods); Music, Max Richter, "On the
Nature of Daylight", from *The Blue Notebooks* (2004), as heard in *Arrival*; After *Arrival*, a film by Denis
Villeneuve (2016), from "Story of Your Life" by Ted Chiang; Drawn with p5.js. There is no title card. After the last
card the room holds to the end, 408 s.

## What check:shows holds

`apps/rube/checks/palindrome.ts`:
- the recording whole from zero, its credit, the label's upload, and the credits after it;
- the places in order, every cut between places on a change of chord, no portal;
- the ball never jumps in a place, and every cut is a match cut (all but the cut on the shell);
- the cut on the shell: the television's picture of it and the real one the same size in the same place on the
  screen, and more than a quarter of the frame tall;
- the palindromes: the shell's path out is its path in, backwards, and it is gone when the high violins stop; the
  twelve links fall after the bass drops out and stand again in the reverse order, the ring whole on the loudest bar;
  the last frame is the first, Louise and baby Hannah where they were, from the last B-flat to the end;
- Hannah on Louise's right, a little above her, at every cut into or out of the lake house;
- every strike on a beat, a change of chord or a measured onset, and every part striking; nine in ten changes of
  chord struck; three in four of the loudest bars' beats struck; the story's moments struck on the music's (Hannah
  goes, the double bass, the turn, the blast, the call, the loudest bar, the shell gone, the last B-flat, the last
  attack);
- the camera cutting inside a place only on a strike and never whipping (its punches aside);
- the white-out white at its cut and nowhere else;
- Louise inside the Zoom frame and findable (never under 5.5 px across for more than 1.5 s) outside the two great
  wides (the shell's arrival, its going and the daylight); never hidden long;
- Ian, Hannah and Shang where the story has them, never jumping, never popping in shot (Hannah's going on the swell
  the one exception), never two of anyone;
- the end credits' words, and the onset file being this recording's.

## How it is built

- **The version file:** `apps/rube/src/shows/versions/nature-of-daylight/opus55.show.ts`. Everything with weight is
  behind `load()`.
- **The show:** `.../nature-of-daylight/palindrome/`, on Logogram's kit (after Liftoff's, All at Once's and
  Merry-Go-Round's): `kit.ts` (each part is handed a slot and builds its lane from timed waypoints, so its strikes land
  where the music is by construction), `show.ts` (the legs), `score.ts` (the order, the cuts, the white-out, the
  punches, the camera's carry across every cut and the shell match), `camera.ts`, `music.ts`, `seams.ts`,
  `shell-path.ts` (the shell's one journey, read by the television and the valley alike), `hits.ts`, `credits.ts`.
- **The canonical drawings** (`cast.ts`): the shell (a smooth dark stone standing on its edge, at any size), the
  heptapods (a heavy body on seven limbs, a palm of seven fingers, always in fog), their ink (`inkRing`/`drawInk`: a
  ring written from both ends at once, thick and thin, with blots and tendrils), and a screen with a shell over one of
  the twelve places.
- **The parts:** `house/` (the room at dawn, ill, at night, home), `lawn/` (the swing, the vision), `valley/` (the
  arrival, the going, daylight), `chamber/` (contact, the bomb), `fog/` (the fog, the gala), `twelve/` (the tent and
  the ring).
- **How it was made:** a director (Claude Opus 5.5) measured the cue, wrote the kit, the seams, the check, the
  canonical drawings and a stub for every part so the show ran end to end; six builders built the six places in
  parallel from one brief; rounds of director's notes followed, from contact sheets, 1× films tiled at a frame a
  second, and probes (strikes against the music, velocity jerks, camera stutters, parked stretches).

## Arrival nods

Visual and mechanical only; no stills, no text, no audio beyond the cue.
- The film's structure: it opens on the lake house and Hannah's life, which we take for the past, and ends there.
- The shell first seen on the news; the shells hanging over the valley in the fog; the helicopter; the camp and its
  white tents; the scissor lift into the slot in the belly, which opens on its own clock.
- The chamber's wall of white; the heptapods coming out of the fog; her whiteboard; her suit coming off; a palm of seven
  fingers on the glass; their ink blooming into rings; the linguists' walls of pinned logograms; "offer weapon".
- The twelve sites and their links going dark one by one; the bomb; Abbott's death; alone beyond the glass with
  Costello; "Louise sees future".
- The gala years on, and Shang's private number and his wife's last words; the sat phone; the world standing down.
- The shells going; Ian; "If you could see your whole life laid out in front of you, would you change things?"
