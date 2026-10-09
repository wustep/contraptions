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
  television until its picture of the news is most of the frame; the valley opens with the real shell exactly where the
  television's was, the same size on the screen (`score.ts` works the framing out from the house's `TV_SHELL` and
  the valley's `SHELL_CUT`; `cast.ts` `shellOnScreen` is where the picture puts it).
- **Hannah's rhyme.** At every cut into or out of the lake house Hannah is on Louise's right, a little above her: the
  cradle, the swing's seat, the bed, the swing in the vision. The same place on the screen, a different age.
- **The white-out** (231.039): the blast's dust in the chamber, lit by the broken glass, swells to white, and the fog
  beyond the glass comes out of it.
- **The circle.** The last cut opens close on the cradle, baby Hannah in it; from the last B-flat the camera draws back,
  the opening's push in played backwards, and arrives on the first frame on the last attack (371.931): the lake house
  at dawn, Louise beside the cradle. It holds there to the end.

## In order

Times are show seconds; chord *n* is the *n*th change of harmony.

| Time | Music | Place | What happens |
| ---: | --- | --- | --- |
| 0 | silence; the first chord 1.625 | the lake house | The first frame: blue hour, a long room of glass over a grey lake. Louise on the floor beside a wooden cradle, baby Hannah in it. On each chord she rolls into the rocker and the cradle rocks on its runners, damped; the dawn comes up a step a chord. The camera comes in close on the two of them and goes back out. |
| 22.111 | chord 5 | the lawn | Years on: the lawn down to the lake, a great tree at the water's edge and a rope swing, Hannah a child on its seat. The swing is a pendulum a bar long: Louise pushes at the back of the arc on each chord, and at the front, half a bar later, Hannah's feet brush the leaves hanging from the limb. The arcs grow; Hannah grows (a girl by 38.609, the second voice); the year goes round in the tree (summer, autumn's leaves knocked loose, a winter's bare twigs and snow, spring). On 61.365 she leaps from the top of the arc, lands and runs back; the swing dies down to dusk with her on it. |
| 71.953 | chord 17: the cellos | the lake house | Years on: the same room on a grey day, a bed where the cradle stood, Hannah a young woman in it, ill; Louise beside her; a tall pendulum clock by the bed, its pendulum swinging on every beat, its hammer on the bell and a weight dropping a notch on every chord. The camera comes close on the two of them, then takes in the bed and the whole clock: **on the swell (93.861) the weight reaches the bottom, the pendulum settles, and Hannah goes**, paling into the pillow. Close on the empty pillow; Louise beside it. |
| 98.429 | chord 23: the half cadence | the lake house | Night. The television comes on across the room: the news, a shell hanging under the cloud. The camera pushes in until the picture is most of the frame, the set's bezel still round it. |
| 102.110 | **the double bass** | Montana | The real shell, where the television's was and the same size, and now it comes down: out of the cloud between the mountain walls, settling as the bass swells, the camera drawing back so its height reads against the ridges. A helicopter comes round the ridge, a speck against it; the fog it drives down rolls along the valley floor. On the flare (108.716) the picture cuts to the camp under its belly. Louise drops out of the helicopter's door onto the meadow, rolls into the decon tent and out in her suit; Ian goes up the scissor lift's ramp before her. The lift surges up under the belly on the chords; a seam of light, and the slot opens (121.754), spilling light down on them; up into it. |
| 129.556 | chord 32 | the chamber | Inside: a long dark chamber and at its end the glass, a pane before a wall of white. It wakes (135.442); **Abbott looms out of the white (137.381), then Costello (141.224)**, whole in the wide, the two of them tiny at the glass. Her board, which nothing answers; **her suit splits and falls away (145.165)**; she rolls to the glass alone, flush against the pane, and in one long push in the limb comes down behind it and **a hand of seven fingers presses flat on the glass beside her (149.171)**, a warm print blooming between them. Ian comes up beside her; the first logogram (153.060). Then the language, as a machine she drives: each time she lands on the plate by the glass her board flips up and a cord lifts a catch, and the last word they wrote runs down a rail into the row of cards on the back wall; four words so, then both of them writing at once, the row complete (189.005), read back close as the cards light in order (190.943), her question on the board, two of their rings joined (192.789), and the answer: **a ring with a barb flung out of it, "weapon" (196.795)**. |
| 200.626 | **the bass drops out** | the command tent | Night; the ring of twelve screens, one for every shell on Earth, each linked to the next; a red lamp over the door comes on. **The links fall like dominoes**: one a beat round the ring, each screen tipping over on its hinge to hang dark and its link going slack as cable, knocking the next free, until only Montana is lit (213.595). |
| 214.657 | chord 55 | the chamber | Another day: Abbott's palm slams the glass. The soldiers' charge at its foot, between them and the glass, its light flashing on the beats; a jagged ring written in bursts. **223.370: the blast**: white, the pane blowing out, the two of them thrown down the chamber on arcs, Abbott reeling back into the fog. Shards; the light failing; the last of the glass goes (229.129); white. |
| 231.039 | chord 60, in white | beyond the glass | Alone in the fog. Costello points; a jet of ink under her, and a great logogram written round her both ways at once on the chords, lifting her; Abbott far back, sinking and paling away. The ring closes over her (242.480), turns, lets her go at its top (246.340); she falls through it and lands where its ends met. A small ring begins at her right. |
| 250.120 | chord 66 | the lawn | What she is shown: the swing on a summer evening, Hannah a young woman, well, laughing, on its seat where the small ring was. A push; the leaves. |
| 257.683 | chord 68 | beyond the glass | The ring she was shown grows on each stroke until it fills the frame, and the white round them goes to a grey dusk; **on 262.374 its ends meet at her touch and the white floods out from it: she knows**. The palm lets it go. |
| 266.124 | chord 71 | the gala | Years on: an evening reception, champagne light, knots of dark guests. She rolls onto a brass pouring stand and a champagne tower fills a tier a beat; the room raises its glasses (272.869); **Shang** crosses to her, leans in and they touch: the whisper (274.802). |
| 277.647 | chord 74 | the command tent | The sat phone, the red lamp burning. She hops key to key on the beats, the number he gave her; the dead ring on 283.458; the call key on **288.554, the loudest bars**: the call goes up the cable, China's screen rises red, and **the dominoes stand again, backwards**, one a beat, the last to fall the first to rise, the camera drawing back until **the ring closes whole in the wide on the loudest bar (303.827)**, the lamp going out; pulses running both ways round it. |
| 311.293 | chord 84 | Montana | Morning. The lift's deck comes down; **the shell goes up the way it came down**, into the cloud, **gone as the high violins stop (318.711)**. The hush: the cloud churning where it went. **322.606: the cloud breaks over the left ridge and the low sun rakes across the valley**, its light sweeping along the floor to her on 326.258; Ian comes to her across the light; **they touch (330.170)**, close, and hold. |
| 334.031 | chord 90 | the lake house | Home, in the morning light: Louise and Ian by the window, close, the empty cradle beside them. She rolls into him (337.850); they turn to the cradle (341.618) and go to it (345.490). **349.495: a cut close on the cradle, baby Hannah in it**, Louise rocking it: they chose her. She rocks it on the last chords, fainter and fainter; from the last B-flat the camera draws back, the opening's push in played backwards, and arrives on the first frame on the last attack (371.931). The credits in the silence over the wall above the window. |

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
  the last frame is the first, Louise and baby Hannah where they were, from the last attack to the end;
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

## Director's passes

What was watched: contact sheets of every place, the whole film filmed at 1× and tiled a frame a second, and probes
(every strike against the music, velocity jerks, camera stutters, stretches where nothing on the screen moves). Then a
critic who had not seen the brief watched the whole film cold and ranked its worst. What changed because of it:

- **The palm** was a hard seven-pointed star ten times her size, floating in the white off the glass's edge, cut to on
  the chord: a shuriken. The glass is a drawn pane now, she rolls flush to it, and the hand (a pad and seven
  round-padded fingers, a few times her size) comes down behind it in one push and presses flat beside her.
- **The language** was one set-up cut back and forth for 43 s, the two of them specks on the floor and each word
  flying to the wall as a pale hairline ring. It is a machine she drives now (a plate, a cord, a catch, a rail, a
  row of cards in their black ink), framed so she is thirty pixels across, and four words in full before the fuller
  part.
- **The bomb** was a dark box on a dark ledge and a grey flash; the charge flashes between them and the glass now, the
  pane blows out, and both are thrown on arcs in the frame.
- **The shell** did most of its descent on the television, so after the double bass it hung still; its journey is
  twelve seconds eased both ways now, the news showing only its slow start, the real valley the rest.
- **The daylight** came down as shafts from a glowing hole exactly where the shell had gone: a tractor beam. It breaks
  over the left ridge now and rakes across the valley.
- **The ring** closed on the loudest bar in a crop of its bottom arc; now the camera is close early and the circle
  closes whole in the wide. Its dead links were hairline arcs with ticks (a diagram) and its fallen screens black
  blobs; they are slack cable and screens hanging crooked on their hinges. A red lamp over the tent's door gives the
  stakes.
- **The people**: the gala's guests and the tent's soldiers were drawn human silhouettes, which made Louise and Shang
  marbles at their feet; everyone is a ball now.
- **The heroes' size**: at the swing, in the fog and at the reunion they were specks; each is framed closer.
- **The ending** had her alone with the empty cradle before the baby, which read as grief (remembering) rather than
  choosing; Louise and Ian stay together and turn to the cradle, and the last shot draws back to the first frame as
  the opening pushed in.

A later polish round, from a fresh contact sheet of every place and close frames where it looked wrong:

- **The fallen screens** hung over at nearly 50 degrees in one flat tone and read as black diamonds, huge in the sat
  phone's close shots. They hang crooked at 30 degrees now, their frames catch the room's light along the top, and
  each dead screen still holds a ghost of its shell: the world goes dark, but the shell is still there.
- **The palm** still spread its fingers all the way round the pad, an asterisk. The seven fingers fan over the front
  of the pad now, the middle ones longest, and the limb comes in from behind where there are none.
- **The daylight**: the edge of the cloud's shadow swept the floor as one hard vertical line. It is a broad soft edge
  now. The shafts start out of the break's glow, not at rounded ends below it.
- **The slot's light** under the belly was one hard-edged cone, and its edge showed as a line across the sky when she
  rides the deck back down (311 s). It is feathered now.
- **The gala's guests** floated in the air above the floor. Each has a soft shadow and a dim reflection on the
  polished floor now, so they stand in the room.

And one more round after it:

- **The bed** was a bare plank, and its duvet was the lake's grey-blue, so against the window it read as a smudge,
  its folds as blur, with a step where the blanket over her ended. Its linen is warm now, standing against the glass;
  the folds have a lit side and a shaded side; the blanket runs down into the duvet; and an oak headboard and a lower
  foot make it the cradle grown up.
- **The shell's outline** was 72 straight segments at any size, so when its belly fills the frame over the camp the
  facets showed. It takes more points the bigger it is drawn.
- **The treeline at the reunion** was outlined in a hard cream line. The light through the crowns is a soft glow into
  them now.

And a third:

- **The sky after the shell has gone** read as flying saucers. The cloud churning where it went was a few dark lens
  shapes, and the break over the left ridge was a round bright hole under a domed dark edge, its shafts falling
  together from one spot: a tractor beam again. The churn is many soft billows, only a little darker than the deck,
  so it reads as weather. The break is a long low tear with a ragged edge, its light bleeding out into the cloud with
  no rim, and the shafts fan out from all along it.
- **The slot** opened as a T: the cut in the belly opened full width while the throat under it opened from a line in
  its middle. The throat is the full width now and comes up out of the dark as the doors part.

A fourth looked at the joins and at other screens: every cut between places just before, on and just after it; the
credits as the page sets them; and the show on a phone, whose taller frame sees more world above and below.

- **The daylight on a phone**: the sunlight's edge stood straight up the near meadow, a vertical band from the far line
  to the bottom of the frame. It slants with depth now, as a cloud's shadow lies on ground going away from us, so it
  has come less far nearer the camera.
- **The cast card** ran its last line, Abbott and Costello, down to within a few pixels of the window's top rail. It
  sits higher now and clears it.

A fifth filmed the whole show at four frames a second and ranked every change from one frame to the next away from
the cuts between places. Each large one was a cut inside a place (wide to close, on a strike) or a moment meant to
jump (the blast, the white-out, the ring closing, the light reaching her), so the motion is clean. Then full-size frames
of the props seen small until now:

- **The lawn toward us** was one flat green under the swing, the only bare ground in the show. It has a sparse, low
  scatter of grass now, in rows that open out as they come nearer, leaning a little in the air off the lake, and
  frosted in the winter.
- **The lake house's floor** gave back the cradle, the bed and the television but not Louise or Ian, since the mirror
  copies only what is drawn before the balls. Each has a dim reflection under it now, as faint as the cradle's.

A sixth watched it through the player's other two cameras, Overview (the whole world) and Zoom (close on the action):

- **The lake house in Overview** was not there. The house and the lawn are one world, and the lawn paints its sky and
  grass across the whole frame; the show's own camera never has the lawn in shot while she is indoors, but Overview
  has both, so the lawn's meadow and tree covered the room, Louise and the cradle, with its edge a hard line across the
  floor. The lawn draws only while a lawn leg has her now, so the house is seen.
- **The duvet's folds**, seen in Zoom, were soft boxes with square tops, smudges more than cloth. Each is a blurred wedge
  now, from just under the top of the duvet widening to its hem, kept inside it; and the blanket over Hannah runs down
  into the duvet and its turned-down edge tapers away, where both had stopped in a small step.

A seventh looked full size at the heptapods, which until then had only been seen small:

- **Abbott and Costello fading** (out of the white at the glass, and paling away in the fog) were drawn straight at the
  fade, so every limb laid over the body or over another limb doubled up: darker patches and seams showed through the
  ghost of a heptapod. A faded heptapod is drawn whole on a layer of its own and laid down at the fade, so it comes and
  goes as one shape.
- **Costello's pointing limb** in the fog, its hand closed, stopped square: a stump. Its end is rounded over now.

An eighth went full size through what was left: the clock, the news at night, the helicopter and the camp, the tent,
the sat phone, the ring closing, and the blast. Only one thing showed:

- **The sat phone's struck key** threw its light up round her as a rectangle with square sides, a lit box she sat in
  on every press. Its sides are soft now, as is the backlight along the row, so it is light rising off the key.

A ninth rendered frames at 2560 × 1440 and searched them for hairlines (a line a pixel wide whose neighbours on either
side agree, running a long way): every one found was a drawn edge, a gradient's band or the fog's own dither. Then it
timed the stage, frame by frame, against `main` in the same places:

- **The cost of the softening.** The ball's reflections, the duvet's folds and the struck key's light were all made
  soft in the passes above by a blur filter, which costs a great deal every frame: the lake house and the sat phone drew
  a third to a half slower than `main`. Each is soft now by its own gradient, slices or nested bands, and draws as fast
  as `main` does, looking the same.

A tenth filmed `main` and this branch side by side, a frame a second through the whole show, and measured where they
differ: every difference was in a place a pass above meant to change (the slot, the palm, the fallen screens, the sat
phone, the sky after the shell and the daylight), and nowhere else, so nothing was broken by the way. One thing the
comparison showed:

- **The daylight's edge, seen from away**, still stood nearly upright on the near floor: the slant given it for the
  phone was too slight for the wide. It slants more steeply now, as a cloud's shadow lies on ground going away, in
  both; where the light reaches her on the far line is unchanged.

An eleventh filmed the whole show at ten frames a second and looked for a frame unlike both its neighbours while
they agree with each other (a thing popping in or out for a frame): only two, both meant (the charge's flash on a
beat in the chamber, 219.2, and the set flickering on with the news, 98.6). It watched the page's console through a
sweep of the show and through Overview and Zoom: no error and no warning. Nothing to change.

A twelfth looked at the whole show again cold, from contact sheets of every place, then full size where it looked
wrong. One thing had come back:

- **The palm** was still a star. The fix in the first round fanned the seven fingers over the front of the pad, but
  over more than a right angle each side, so the hand on the glass (149.171) and Abbott's slam (214.657) spread
  fingers round two thirds of the pad: a cog, an asterisk with a gap. They fan over a hand's width now, each from its
  own knuckle along the front of a pad a little longer than it is wide, so the hand pressed to the glass beside her is
  a hand, and so is the slam.

A thirteenth went where the twelfth had only skimmed (the camp, the chamber's first minute, the tent, the vision, the
lift coming down), stepped through the new palm opening and closing, and watched the whole show again in Zoom, where
the props are seen large. All of it held but one thing:

- **The tree in the spring** (61.7 to 64 s, as the camera draws back with Hannah's leap): the crown fills again clump
  by clump at random, the clumps along the swing's limb among them, so the one clump that had come back hung alone at
  the limb's bend, a green puff on a bare limb whose sprays were already in leaf. The leaves along the limb come and go
  together now, as its sprays do, and lead up into the crown above the frame. They are never in shot when they come or
  go, so nothing pops.

A fourteenth looked full size at what it had only seen in sheets lately (the clock and Hannah's going, the news at
night, the fog, the gala in the wide, coming home), and at the whole show in a window far wider than 16:9, where every
set still reaches the frame's edges. One thing showed:

- **"Weapon"** (196.795 to the cut): the spike flung out of the ring at her was a cut-out, a straight-sided black
  triangle with a square root standing off the ring's far side and two needle barbs, where every other thing they
  write is brushed ink. It is a stroke of their ink now: it starts inside the ring's band and leaves it as a heavy
  blot, bends a little and tapers to its point, with the rings' own bleed round it, and its barbs are hooks thrown
  back off it that taper the same way. It is as heavy and as sharp as it was, and strikes the glass where it did.

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
