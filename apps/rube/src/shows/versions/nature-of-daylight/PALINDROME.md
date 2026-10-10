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
- **General Shang** is the red ball (`#A8322D`), a little larger, rimmed in brass braid; only at the gala, years on.
- **Abbott and Costello**, the heptapods, are drawn, never balls: a heavy body on seven limbs, a hand standing on its
  fingertips, always in fog.

Everyone else is a ball too, at the balls' own scale: the gala's guests, a muted grey in the room's dim light. There are no drawn people.

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
  the opening's push in played backwards, the morning cooling to the blue hour as it goes, and arrives on the first frame on the last attack (371.931): the lake house
  at dawn, Louise beside the cradle. It holds there to the end.

## In order

Times are show seconds; chord *n* is the *n*th change of harmony.

| Time | Music | Place | What happens |
| ---: | --- | --- | --- |
| 0 | silence; the first chord 1.625 | the lake house | The first frame: blue hour, a long room of glass over a grey lake. Louise on the floor beside a wooden cradle, baby Hannah in it. On each chord she rolls into the rocker and the cradle rocks on its runners, damped; the dawn comes up a step a chord. The camera comes in close on the two of them and goes back out. |
| 22.111 | chord 5 | the lawn | Years on: the lawn down to the lake, a great tree at the water's edge and a rope swing, Hannah a child on its seat. The swing is a pendulum a bar long: Louise pushes at the back of the arc on each chord, and at the front, half a bar later, Hannah's feet brush the leaves hanging from the limb. The arcs grow; Hannah grows through every season, a small child to a girl near her mother's height by the leap; the year goes round in the tree (summer, autumn's leaves knocked loose, a winter's bare twigs and snow, spring). On 61.365 she leaps from the top of the arc, lands and runs back; the swing dies down to dusk with her on it. |
| 71.953 | chord 17: the cellos | the lake house | Years on: the same room on a grey day, a bed where the cradle stood, Hannah a young woman in it, ill; Louise beside her; a tall pendulum clock by the bed, its pendulum swinging on every beat, its hammer on the bell and a weight dropping a notch on every chord. The camera comes close on the two of them, then takes in the bed and the whole clock: **on the swell (93.861) the weight reaches the bottom, the pendulum settles, and Hannah goes**: the camera comes in close on her as she pales into the pillow, and holds on it empty, Louise beside it. |
| 98.429 | chord 23: the half cadence | the lake house | Night. The television comes on across the room: the news, a shell hanging under the cloud. The camera pushes in until the picture is most of the frame, the set's bezel still round it. |
| 102.110 | **the double bass** | Montana | The real shell, where the television's was and the same size, and now it comes down: out of the cloud between the mountain walls, settling as the bass swells, the camera drawing back so its height reads against the ridges. A helicopter comes round the ridge, a speck against it; the fog it drives down rolls along the valley floor. On the flare (108.716) the picture cuts to the camp under its belly. Louise drops out of the helicopter's door onto the meadow, rolls into the decon tent and out in her suit; Ian goes up the scissor lift's ramp before her. The lift surges up under the belly on the chords; a seam of light, and the slot opens (121.754), spilling light down on them; up into it. |
| 129.556 | chord 32 | the chamber | Inside: a long dark chamber and at its end the glass, a pane before a wall of white. It wakes (135.442); **Abbott looms out of the white (137.381), then Costello (141.224)**, whole in the wide, the two of them tiny at the glass. Her board, which nothing answers; **her suit splits and falls away (145.165)**; she rolls to the glass alone, flush against the pane, and in one long push in the limb comes down behind it and **a hand of seven fingers presses flat on the glass beside her (149.171)**, a warm print blooming between them. Ian comes up beside her; the first logogram (153.060). Then the language, as a machine she drives: each time she lands on the plate by the glass her board flips up and a cord lifts a catch, and the last word they wrote runs down a rail into the row of cards on the back wall, Ian rolling with it to be under it as it lands; four words so, then both of them writing at once, the row complete (189.005), read back close as the cards light in order (190.943), her question on her board in her own gold, two of their rings joined (192.789), and the answer: **a ring with a barb flung out of it, "weapon" (196.795)**. |
| 200.626 | **the bass drops out** | the command tent | Night; the ring of twelve screens, one for every shell on Earth, each linked to the next; a red lamp over the door comes on. **The links fall like dominoes**: one a beat round the ring, each screen tipping over on its hinge to hang dark and its link going slack as cable, knocking the next free, until only Montana is lit (213.595). |
| 214.657 | chord 55 | the chamber | Another day: Abbott's palm slams the glass. A soldier arms the charge at its foot and leaves, between them and the glass, its light flashing on the beats; a jagged ring written in bursts. **223.370: the blast**: white, the pane blowing out, the two of them thrown down the chamber on arcs, Abbott reeling back into the fog. Shards; the light failing; the last of the glass goes (229.129); white. |
| 231.039 | chord 60, in white | beyond the glass | Alone in the fog. Costello points; a jet of ink under her, and a great logogram written round her both ways at once on the chords, lifting her; Abbott far back, sinking and paling away. The ring closes over her (242.480), turns, lets her go at its top (246.340); she falls through it and lands where its ends met. A small ring begins at her right. |
| 250.120 | chord 66 | the lawn | What she is shown: the swing on a summer evening, Hannah a young woman, well, laughing, on its seat where the small ring was. A push; the leaves. |
| 257.683 | chord 68 | beyond the glass | The ring she was shown grows on each stroke until it fills the frame, and the white round them goes to a grey dusk; **on 262.374 its ends meet at her touch and the white floods out from it: she knows**. The palm lets it go. |
| 266.124 | chord 71 | the gala | Years on, out of the ring she was shown, its ghost paling over the room: an evening reception, champagne light, knots of dark guests. She rolls onto a brass pouring stand and a champagne tower fills a tier a beat; the room raises its glasses (272.869); **Shang** crosses to her, leans in and they touch: the whisper (274.802), and a ghost of the sat phone's keys comes up beside them, lighting the first of his number. |
| 277.647 | chord 74 | the command tent | The sat phone, the red lamp burning. She hops key to key on the beats, the number he gave her; the dead ring on 283.458; the call key on **288.554, the loudest bars**: the call goes up the cable, China's screen rises red, and **the dominoes stand again, backwards**, one a beat, the last to fall the first to rise, the camera drawing back until **the ring closes whole in the wide on the loudest bar (303.827)**, the lamp going out; pulses running both ways round it. |
| 311.293 | chord 84 | Montana | Morning. The lift's deck comes down; **the shell goes up the way it came down**, into the cloud, **gone as the high violins stop (318.711)**. The hush: the cloud churning where it went. **322.606: the cloud breaks over the left ridge and the low sun rakes across the valley**, its light sweeping along the floor to her on 326.258; Ian comes to her across the light; **they touch (330.170)**, close, and hold. |
| 334.031 | chord 90 | the lake house | Home, in the morning light: Louise and Ian by the window, close, the empty cradle beside them; after the turn he goes round it to its far side. She rolls into him (337.850); they turn to the cradle (341.618) and go to it (345.490). **349.495: a cut close on the cradle, baby Hannah in it**, Louise rocking it, Ian beyond it on her right, the cradle between them: they chose her, in the same morning light. Then he turns away, looks back at her, and goes out of the room. She rocks it on the last chords, fainter and fainter; from the last B-flat the camera draws back, the opening's push in played backwards, and arrives on the first frame on the last attack (371.931). The credits in the silence over the wall above the window. |

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

A fifteenth went through the rest of the marks they make, full size (Abbott's jagged ring before the blast, the blast
and the dust after it, the ink in the fog and in the vision), the sat phone and the twelve places on its screens,
then a whole contact sheet a second and a half off the twelfth's so every frame in it was new, and last the end
credits as the page sets them, every card, on a desktop and on a phone. Nothing to change. Two things were looked at
twice and kept: the jagged ring runs half across Abbott's body, black on dark, which in its panic reads as meant; and
the writing limb's closed hand is a little rounder than the limb, a fist. On a phone the credits' fine print is very
small, but cards are sized by the page, for every show, not by this one.

A sixteenth looked at the share card (unchanged since it was picked, and nothing at its moment has changed since) and
watched the whole show again through Overview, which the sixth had last seen before the palm, the limb's leaves and
"weapon" changed:

- **The lake house in Overview** was a thin strip in the corner of an empty frame. Overview frames a place by its
  bounds, and the house's were the house and the lawn together; since the sixth pass the lawn draws only while she is
  on it, so indoors three quarters of the frame was bare wall and floor with the room tiny at the left, and on the lawn
  the swing was small under a crown cut off by the top of the frame. Each room is framed by its own legs now: indoors,
  the room fills the frame, cradle, bed and clock; on the lawn, the whole tree through the year, the crown taken in.
  The show's own camera reads none of this, and its frames are the same to the pixel.

A seventeenth watched the whole show again in a frame 9:16 tall (a phone held upright, or the export's Shorts), which
the fourth had last seen before most of these passes. All of it held but one thing:

- **The white beyond the glass in a tall frame** (129 to 231 s): the fog the heptapods stand in, low in front of them,
  was a band that stopped three cells under the floor's line, and a tall frame sees under it, so the white ended in a
  hard line across it two thirds of the way down, a flat grey below. It runs on to the frame's foot now. In 16:9 it is
  the same to the pixel.

An eighteenth went through every place in the tall frame again, full size, where the seventeenth had seen them small.
One more thing showed:

- **The near ridge in a tall frame** (102 to 111 s, and 311 to 334 s): its line falls away to the left down the
  picture, and its shape stopped at a fixed point, below any 16:9 frame; a tall frame sees under that, so the slope
  turned into a sheer wall standing in the meadow. It goes on to the frame's edge now, laid under the ridge as it was
  and overlapping it, so the ridge's own pines are where they were: in 16:9 it is the same to the pixel.
- **A line across the shell** (the tall frame, as it goes up at 311 to 319 s): the cloud deck's near veil was laid as
  a ramp up to its top and a flat fill over it, overlapping by half a cell, so a thin band of it was cloud laid twice,
  a bright line straight through the shell. It is one fill now. In 16:9 the line was above the frame; there the
  difference is a level at most.

A nineteenth stopped hunting edges by eye: it filmed the show every four seconds at 16:9, far wider than it and 9:16
tall, and had a script find every straight hard edge running a third of the frame or more in the wide and the tall
that the 16:9 frame at the same moment did not have. Most were meant (the window's mullions, the tent's drapes, the
shore). One was not:

- **The treeline striped in a tall frame** (the reunion, 326 to 334 s): the sunlight fades in down the far slopes in
  two dozen slices, each a little taller than its spacing, and under the light's blends every overlap was a strip lit
  twice: a stack of thin lines across the trees. The slices lie on whole pixels now, each meeting the next exactly, as
  the ones down the near floor already did; the cloud's shade beyond the light, faded in the same way, too. In 16:9
  wides it takes out the fainter seams there as well.

A twentieth went looking in the code, not the frames, for what the nineteenth found: soft things built of slices,
where a slice's edge can show. The other slicings were sound (the struck key's nested bands, the light's radial
glows, the treeline's narrow rims) but for one:

- **The duvet's folds** (72 to 98 s, seen close in Zoom): each fold comes in from nothing at its top over eight slices,
  so its first slices stepped up a quarter of its strength at a time: bands across the top of every fold. It comes in
  over twenty-four now, a ramp.

A twenty-first handed the whole show, as contact sheets a frame every two seconds and a way to film any moment full
size, to a critic who had seen none of this work, and asked for what was worst, ranked. Its two worst were the ending
(the cut in close on the cradle, cold after the warm room, and the long hold on the small first frame), which is the
circle the show is built on and is left as it is for Stephen to rule on. Of the rest:

- **The sat phone** (283 to 289 s) cut out to the dead ring on the chord and back to her two seconds later: close, wide,
  close, the busiest cutting in the piece. The cut out to the ring stays; from it the camera comes in to her in one
  move as she dials the last of the number, lowering as it comes so she is in even Zoom's frame, and arrives on the
  call key.
- **The reunion** (326 to 334 s) framed them as dots on the treeline with two thirds of the picture grass. They are low
  in the frame now with the light coming down over them as he crosses to her, and at the touch the cut comes in closer
  on the two of them, breathing back out to the cut home.
- **"Weapon"** (199 s), a ring with one straight spike out of it, read as a magnifying glass. The spike bends like a
  thorn now and carries three barbs.

Its others were looked at and kept: the shell going up into the cloud is pale because it is in the cloud; the glass is
grey for a second before the white wakes behind it; Hannah's going is framed as it was meant.

A twenty-second gave a second cold critic only motion and timing, with the measured beats and chords and bursts of
frames at up to twenty a second. Every strike and cut it checked was on the music. What it found was stillness:

- **The language** (155 to 197 s, the longest stretch of the film): her trips from plate to glass are under a cell,
  and Ian drifted a tenth of a cell behind her board, so the two of them read as parked for forty seconds. Ian reads
  what the machine brings them now: as each word is sent down the rail he rolls with it and is under it on the beat it
  lands; the fourth hangs over her plate, so he stops short of it, and on the fifth he goes back along the row ahead of
  her, for she reads it back.
- **The slot** (121.754) popped rather than opened: its doors were four tenths open in a sixth of a second and the
  throat's light came on at once. They part from the crack over a second now, eased both ways, and the crack's light
  stays lit as they part, handing over to the throat's.

Kept: the stillness by Hannah's bed (a vigil) and at the glass in the suits (awe); the push in on her as she goes and
the pull back to the news, whose framing the cut needs; the rest of the window room, which belongs to the ending.

A twenty-third gave a third cold critic the story: told only who the balls are, it wrote down what it thought happened
from the frames, then read the table above and said where the two parted. Most of it read; where it did not:

- **The blast** (214 to 231 s) read as the heptapods' attack, and as Ian killed. The charge was a small dark box with
  a dim keypad-green light, so the only thing acting on the screen was Abbott slamming the glass and writing its jagged
  ring; and Ian, thrown further than her, rolled out of the frame by himself and was not seen again until the meadow.
  The charge is larger now and its light the red of the alarm lamp in the command tent, never quite out between the
  beats: the soldiers', and danger. Ian is thrown as she is, a little beyond her, and lies in the frame by her, down,
  not gone, until the white takes the place.
- **Hannah's leap** (61 to 68 s) read as her thrown off the swing: she rolled flat to a stop on the far grass and lay
  there four seconds before she started back. She lands bouncing now, and runs straight back for the seat, there with
  a beat in hand to wait for it.
- **Abbott dying** in the fog (231 to 249 s) read as a second heptapod standing off. It sinks well down now and pales
  all the way into the white by the time she lands.

Its larger ideas were noted, not taken: a rhyme of lights from Shang's whisper to the keys she dials, so "the number
he gave her" reads; the gala coming up inside a small ring, as the swing vision does, so it reads as shown to her.

A twenty-fourth took up the hinge the story critic had named: nothing passed between Shang and her at the whisper, so
"the number he gave her" could not be read, and the call was her pressing buttons.

- **His number** (274.8 to 278.6 s): after the whisper a faint ghost of the sat phone's keys comes up beside them, in
  the keys' own green, on her right where he stands, and its keys light one a beat in the order she will press them. The cut to the
  tent is a match cut on her, the camera carried with her, so the ghost stands in the same place on the screen as the
  real keys after the cut: they take its place, and she presses the same keys in the same order. No new sign, and no
  words: the keypad itself, before she has it.

The critic's other idea, the gala coming up inside a small ring as the swing vision does, would rebuild the cut into
the gala, and is left for Stephen.

A twenty-fifth checked the spans the last four rounds changed through Zoom, Overview and a tall frame (nothing broken),
and gave a fresh critic the story cold again. The ghost of the keypad, drawn in Shang's red, read as warning lights:
the bomb's colour, and nothing like the real keys' green. It is drawn in the keys' green now, the same object either
side of the cut. The blast still reads to a cold eye as the heptapods' attack, the charge being already there when
the scene opens; showing it come from our side needs a soldier to bring it in, which is left for Stephen.

A twenty-sixth took the blast on, since everyone but the four of them is already a small dark ball:

- **The soldier** (214.7 to 218.4 s): at the cut a small dark ball is at the charge; on the next beat it nudges it
  and its red light comes on, armed; on the beat after it hops back over the two of them and rolls away down the
  chamber into the dark. The charge is now plainly ours, and the blast with it.

A twenty-seventh checked the soldier cold: a fresh viewer, asked only who caused the blast, said a soldier, where
two before had said the heptapods. Two things it and Overview showed:

- **The charge's light** was a dull red from the cut, so it was armed before the soldier touched it. It is dark glass
  until the nudge now, and its coming on is the arming.
- **The soldier's exit** stopped mid-floor, which Overview, seeing the whole chamber, showed as a pop. It rolls on out
  through the door it came in by, into the doorway's dark.

A twenty-eighth took the note two cold readers had given: Hannah's going was too small to see.

- **Hannah goes** (93.9 to 96.6 s): the camera was still wide on the clock while she paled into the pillow, and came
  in only after, on the empty bed: she went small under the clock, and a viewer could take it for her slipping under
  the covers. The clock is whole for its last tick on the swell; then the camera comes in on her, close while she goes,
  and holds on the pillow empty.

A twenty-ninth gave the whole show to a third fresh story reader. Hannah's going now read at once. Three things still
did not, and each was made plainer:

- **The ghost of his number** read as floating lights. The phone's dark body is under its keys now, faint, edged in
  their green: the sat phone itself, before she has it.
- **Abbott in the fog** came up out of the white and darkened before paling, so it read as a new, smaller heptapod
  rising into view. It comes out of the blast as dark as it was at the glass, and only pales as it sinks.
- **The soldier** was dark on the dark floor. Its rim of the chamber's light is brighter, and it is a little larger.

A thirtieth checked the twenty-ninth cold. The blast was now the black ball's doing to a fresh eye (sure, mostly), and
the party's keys and the console's read as the same keys, a code he gave her. The one thing still easy to miss was the
ghost's keys lighting, which carries the hand-off: they are brighter when lit now, a glow that catches at speed.

A thirty-first ran the eleventh's search again (a frame unlike both its neighbours) at ten frames a second over every
span the story rounds had changed. One frame in thirteen hundred, the very one the eleventh had passed as the charge's
flash (219.2), was not that:

- **Abbott's writing arm** (218 to 219.4 s) rose from where the slam left it to the jagged ring in a quarter of a
  second, so in the close frame on the two of them it flashed through as a limb for three frames. It rises over two
  seconds now, in the wide before the cut in close: Abbott lifting its arm to write, up out of the close frame when the
  cut comes.

A thirty-second ran that search over the whole show, 0 to 408 s at ten frames a second (4081 frames), not only the
spans the story rounds had touched: no frame was unlike both its neighbours. Nothing to change.

A thirty-third timed the stage again, as the ninth had, since the story rounds had added things drawn every frame (the
soldier, the ghost of the phone and its glows, the charge's larger glow, Abbott's longer reach): the live stage played
at seventeen moments under a fourfold CPU throttle, against the twentieth round's commit, frames a second counted, and
again at the reunion and the window room. Within the noise everywhere. Nothing to change.

A thirty-fourth took a note two cold readers had given: Hannah never seemed to grow. She grew from 0.58 to 0.72 of
Louise's size, all in fourteen seconds early on the swing, and was 0.86 in the bed, so she read as the same small ball
from the swing to the bed, and her death as a child's. The ladder is wider now (a small child at 0.5, a girl at 0.8, a
young woman at 0.92) and she grows through every season of the swing, to the leap: a child, then a girl nearly her
mother's height, then a young woman nearly her size.

A thirty-fifth checked Hannah at her new sizes everywhere her size enters the machine: the cut into the swing, her
reach into the leaves, the leap, the bounce and the hop back onto the seat, the cut to the bed, and the vision; and
searched the whole swing at ten frames a second for a frame unlike its neighbours. All held. Nothing to change.

A thirty-sixth gave a fresh cinematographer the frames for composition and light alone. What it ranked weakest was
each a choice the show is built on and was kept: the white at the white-out's cut (231, which the check holds white);
the red of China's screen rising and of the alarm lamp (Shang's red, the story's); the empty valley in the hush after
the shell has gone (319); the ring whole in the wide on the loudest bar with her small at its foot (297 to 307), the
camera coming back in to her by 309. Its two crops were looked at full size and are not faults: the card at 157 hangs
by the slot at the glass, where every word comes in, and the lift's deck at 313 is just above a two-second shot before
the cut to the wide. Nothing to change.

A thirty-seventh took the note two cold readers had given on the gala: it read as the next thing to happen, not years
on. The swing she is shown comes out of a ring; the gala came out of a hard cut. Now the ring she was shown, pale as it
lets her go at the cut, is carried across it into the gala: in the same place by her on the screen (the cut is a match
on her), a ghost of it in light on the dark room, paling away over a second and a half. The gala comes out of what she
is shown.

A thirty-eighth checked the thirty-seventh cold: a fresh viewer, asked when the party was, saw the ring's ghost in the
ballroom and read the gala as a future she is shown (where earlier readers had it as the next day), though not how far
on. Its other notes were each meant (the small ring by her where the vision begins, the dusk as she knows, the push in
on the call, the alarm lamp). Nothing to change.

A thirty-ninth gave the whole show to a fourth fresh story reader, the first since the soldier, the phone's ghost,
Hannah's growing and the ring into the gala had all landed. Most read; three things were made plainer:

- **The ghost of his number** read as a bar counter. Its handset lies beside it now, off the hook, as it does in the
  tent.
- **Her question** (the joined rings on her board, 192.789) read as one more of theirs: her board was written in the
  same near-black as their ink. Her own hand is her gold now, deepened to read on the white, so her question and their
  answer read apart.
- **Abbott** still read as present. It is all the way into the white three seconds sooner, before she lands.

A fortieth checked the thirty-ninth cold: her gold hand read as hers learning their script, her joined rings as her
question and the barbed ring as their answer, and the phone she was shown as the one she uses. One thing two cold
readers had now both seen:

- **A blank card** came up on the rail by the slot before each word reached it, and hung there empty for a beat. It
  comes up as the word reaches it now.

A forty-first checked the fortieth on every word, not one: all six arrive with their cards, the last fills the row,
the read-back lights; and the whole language, 150 to 200 s at ten frames a second, has no frame unlike its
neighbours. Nothing to change.

A forty-second looked at what had changed since the twenty-fifth's look through the other cameras (Hannah's sizes, the
ring into the gala, the phone's handset, her gold hand, the cards) in Zoom, in Overview and in a tall frame. All held.
Nothing to change.

A forty-fifth ran the rest of what the site's build runs, which the rounds had not: every other check suite (check,
rube, builder, playground, premiere, clair) and the production build. All pass; the show's own chunk is 235 kB, the
size warnings the build gives being the site's shared chunks. Nothing to change.

A forty-sixth tested scrubbing, which nothing had: the live stage seeked to fifteen moments through the show forwards,
then to the same moments backwards, the canvas compared. Every pair was the same to the pixel (and the canvas did redraw
between moments), so the show is a function of its time alone, however it is reached. Nothing to change.

A forty-seventh checked the brief's two standing rules against the whole of this branch's difference from main: no
audio file anywhere in it or tracked for the show; the music, its onsets, the version file and the cue's declaration
(the label's upload, `rVN1B-tUpgs`, by YouTube) all untouched. The song is the song, heard from YouTube. Nothing to
change.

A forty-eighth watched the whole show through again, a frame every three seconds, after the run of story rounds: it
holds from the cradle to the cradle, and nothing new showed. And it settled a question left open since the
thirty-eighth, whether the gala needed a sign of how many years on it is. It does not. The story turns on the gala being
a future she is shown, and since the ring carries her into it, that reads; how far on does not change what she does
with it, and any sign of years would be a new thing in the room. Nothing to change.

A forty-ninth built one way to fix the ending's cut (349.495), which a cold reader had called the worst moment in the
film: from the warm room with Ian to a cold close-up of the cradle, the colour, the framing and Ian all changing at
once. A fiftieth took it. The morning now carries across the cut to the cradle, and cools to the blue hour over the
pull-back (from a second and a half after the cut to a second before the last attack). So the cut changes only the
framing and Ian, and the cold of the first frame is something the room grows back into. From the last attack on, every
frame is unchanged by this.

A fifty-first watched the whole show at a frame a second. One thing stood out: at the daylight (323 to 326 s) the
cloud's torn edge over the break was a single dark streak hung alone in a pale sky, the shafts under it: near enough to
the saucer the third round took away. The deck's underside now darkens broadly over the break, deepest toward the edge,
and the edge's billows are softer and fuller in it, so the tear is a gap in the overcast and the shafts come out from
under the cloud. Checked in Zoom, in Overview and in a tall frame.

A fifty-second looked close at the hands. When Abbott strikes the glass over the charge (215 to 218 s) its hand was
a small pad on the end of an arm thicker than it, with seven thin fingers spread off it: a burst of spokes off a stick,
not a hand. The hand there is bigger now, and every palm's fingers are thicker and its pad a little fuller, so the palm
she meets (149 s) and the hands in the fog read as hands too.

A fifty-third filmed the whole show at four frames a second and ranked every change from one frame to the next against
its neighbours. Past the cuts, one stood out: at 163 s Costello's limb, done writing, swept out of the close frame in a
few frames, a flash, as the frantic writing's first reach once did. A limb draws back over a second and a half now, not
nine-tenths, so it is seen going; the other thirty-two frames this touches (each limb lingering a moment longer by the
ring it wrote) were each looked at, and none carries into a cut.

A fifty-fourth looked at what the fiftieth to the fifty-third had changed through other eyes. The whole show in a
tall frame, a frame every three seconds: the warm ending, the overcast over the break, the hands and the limbs all
hold. The stage timed under a fourfold CPU throttle at the places they touched, each against round 48's drawing: within
the noise everywhere (the same untouched moment counted 18 and 8 on two runs). And the page itself, not the canvas
alone, at the start, mid-show and in the credits, on a desktop and on a phone: the cast card centred over the wall,
clear of the window, nothing clipped. Nothing to change.

A fifty-fifth gave the whole show, a frame a second, to a fresh reader who had not seen the brief. They had the story
whole, the palindrome included. Three of their worst read as things they are not:

- **The soldier** (216 s), hopping back over the two of them, read as a stray speck: a ball smaller than everyone's,
  near black on the dark wall, a hairline of light on it. It is at the cast's own scale now, with a quiet grey ring
  round it, the glass's light along its top and side, and its shadow on the floor: one of the room's dark balls, not
  a hole in the picture.
- **The hand raised over her** (147 to 148 s) swept up through the close frame in half a second, to just over its top:
  a knot on the limb, then gone. It is raised into the frame now, and slowly, so it hangs over her before it comes
  down onto the glass.
- **The pedal** at the gala, once she had rolled off it to Shang, rose again with its tip against her side: a thin
  even strip, it read as a rod from the stand to her, a leash. It is a wedge now, deeper at its free end with a dark
  tread, and shorter, still under her as she rests on it but a ball's width short of where she ends.

A fifty-sixth gave the show to a second fresh reader, after the fifty-fifth's changes. They had the story whole too, and
read the soldier as a character hopping, as he is. Two of their notes read as things that are not:

- **Hannah after her leap** (62 to 63 s) hopped four times her height as she landed, and a frame caught in the air
  hung her against the lake: afloat on it, drowning, to a reader. The bounce is about her own height now: a child
  landing at a run, on the grass by the water.
- **The helicopter climbing away** (112 s) turned to fly off nose first by squeezing its side view to a sliver, and
  mid-turn its body, skid and tail stood on end: a craft falling. It is never narrower than a third now, so it turns
  as a helicopter seen nearly head-on, and flips its facing there in a frame.

The reader's blank frame at the blast (223.5 s) is the flash's whitest instant, sampled; the room shows through it a
tenth of a second either side. The fifty-fifth's changes were filmed at four frames a second and nothing jumps.

A fifty-seventh looked close, at full size, at the places the late rounds had not: the dawn room, the swing's
seasons, the bed and the clock, the news, the shell's coming and its going. All held. And it took a note both fresh
readers had given apart, unprompted: the ring carried into the gala sat in the ballroom like a great pale hoop, a
prop. It is drawn in the room, and over its second and a half the camera's draw-back shrank it down onto the floor
among the guests. It pales away in a second now: whole at the cut, where the carry is, and gone before the room has
drawn back round it.

A fifty-eighth took the last of the fresh readers' notes that read as something it is not: China's screen, the first
to come back with Shang on the line (290 to 292 s), filled flat red over its dead glass, and read as a blank screen,
an error. Its picture comes up now under the red, the shell over its valley as on every screen, washed in his colour
and edged in it, and settles to its own as it locks home.

A fifty-ninth gave the show to a third fresh reader, after the fifty-fifth to the fifty-eighth. They had the story, and
tied the soldier to the blast as he is meant to be. Two new things read as what they are not:

- **The lift's hose** (311 to 314 s), thick and near black on top of the grass, ran from the lift to her and not to the
  pale pedal under her: a leash again. It is thin now and down in the grass, the grass's own dark, and runs into a
  housing the pedal is hinged on, a box with its top catching the light.
- **The white, waking** (133 to 135.5 s), was mixed down toward the dark evenly, and beside the glass it was one flat
  grey slab, an unpainted panel. While it wakes the height is held darker and the light comes up low by the glass
  first, a glow with a place in the fog.

Every span the late rounds touched was filmed again at four frames a second: nothing jumps but the cuts.

A sixtieth looked at the leap off the swing (58 to 70 s) at two frames a second, since each fresh reader had stumbled
on some frame of it: it reads whole in motion, a leap from the front of the arc through the leaves, a landing, a run
back while she catches the empty seat, a hop on; nothing to change past the fifty-sixth's lower bounce. Then the whole
show through Overview, the camera these rounds had not used: it held but in the tent. Overview frames a place by the
cells of the parts her path runs through, and in the tent those all lie along the table, so it framed the table and
the bottom of the ring, and never the twelve screens, the world, that are the place. The ring whole is in its frame
now, as the tree is on the lawn; the other cameras are unchanged to the pixel.

A sixty-first went on from the sixtieth's tent to the valley in Overview, which had the same fault: framed by her parts
round the lift and the camp, it had the shell off its top corner, and its coming down and its going up out of the
frame altogether. Overview takes in the shell's lower half now, from its middle to the meadow either side of its axis,
so it hangs over the camp in the frame and comes down into it; not the whole of it, at whose size the camp would be
specks. The default camera is unchanged to the pixel.

A sixty-second gave Zoom, the last of the three cameras, the whole show at a frame every three seconds: it held, her
out of it only in the great wides of the shell's going and the daylight, as the check allows. And the tent and the
valley in Overview in a tall frame, after the sixtieth and the sixty-first widened them: the ring whole over the
table, the shell whole over the meadow, neither cut. Nothing to change.

A sixty-third gave the show to a fourth fresh reader. They had the story, the ring of screens and the suits as they
are drawn aside. Two things read as what they are not:

- **The lift folded** (313 to 314 s, and at the camp before it rises) read as a coil spring, as the third reader had
  also said: with pins only at the arms' crossings, its light and dark arms folded flat into one zigzag. Every joint
  at the arms' ends is pinned now, so folded or raised it is linked arms, a lift's stack.
- **The hand raised over her** (148 s), after the camera's cut there, hung half over the frame's top, a smudge at its
  edge. It is raised a little lower now, whole in the frame, still well over her.

A sixty-fourth took the note three of the four fresh readers had given apart: the blast (223.4 s) read as a blank, a
failed render, a dirty lens. At ten frames a second it was so: the flash was one even white over the whole frame for
a fifth of a second, with no source, so any frame of it was empty. It burns from the charge now: white-hot at its
heart, its light thrown down the chamber over a lighter wash of the whole frame, the rail, the floor and the two of
them seen through it as they are thrown.

A sixty-fifth took the note every one of the four fresh readers had given on the ring carried into the gala (266 s),
the fourth after the fifty-seventh had shortened it: a stray layer, a wreath over the guests, a double exposure. It
was not its length but its standing in the room at its size. It holds a moment where it was at the cut now, then is
drawn in to her as it pales, shrinking and losing its tendrils, and is gone into her a second on: the vision gathered
back into the one who saw it, not a thing left in the ballroom.

A sixty-sixth gave the show to a fifth fresh reader. The lift and the blast, reworked for the readers before, passed
without a word. Four things still read as what they are not, each now seen by two readers or more:

- **The seam of light in the belly** (121 s), a bright line over a flat pale block, read as a scratch on the hull.
  Its light round it is a soft oval glow now, no edges: a seam with light coming through.
- **Her suit coming off** (145.6 s) split into halves in the air and was gone as they landed, so a frame of it was
  only ever two wings opening. The halves lie on the floor a second and a half now, an empty husk, before they go.
- **The hand raised over her** (147.5 s) was half closed, a blot on the limb. It is open as it is raised now: a hand.
- **The ring into the gala** was still at its size half a second after the cut. It gathers into her within the first
  three quarters of a second now, so it is never a thing standing in the ballroom.

Ian gone at the cut to the cradle, which this reader too took for a slip, stays as the forty-ninth and the
fifty-third left it: the last frame is the first, which has no Ian, and to roll him off before it would read as his
leaving her.

A sixty-seventh gave the show to a sixth fresh reader. The seam, the hand and the ring passed without a word. Their
worst was the leap off the swing again: thrown off it, an accident. Four of six fresh readers have now stumbled there.
The leap itself is fine, as the sixtieth found; what came after it was not. Landed, she rolled to a stop and lay there most of a second, then eased back over three: a child lying where
she fell. She is running now a moment after she lands: up to pace in a quarter of a second, on at it, skipping, there
by the seat a couple of seconds before it comes back, waiting as her mother steadies it.

Their other notes stay as they were left: the soldier is the one who sets the charge; the white between the blast
and the fog is the white-out, the cut's own cover; the empty valley is the shells' going, the great wide the cue's
loudest bars are given to; the suit's halves on the floor are what it means to be out of it; and Ian at the cut, as
the sixty-sixth said.

A sixty-eighth gave the show to a seventh fresh reader. Hannah's run back from the leap read whole. Three notes they
shared with readers before them:

- **The soldier** (216 s) was, to four readers of seven, a third character: at the cast's size and with their rim
  since the fifty-fifth, near black, nothing said soldier. He is in the army's olive drab now, the helicopter's and
  the trucks' colour.
- **The ring into the gala**, gathering into her since the sixty-fifth, was still a grey wreath where a frame caught
  it. It is in her own gold now, so it is hers going into her.
- **A green blob** at the top of the willow in the spring (61 s): the clumps of leaves came in whole the moment the
  season's leaves passed their share, and the lone one at the limb's bend came into the top of the frame so as the
  camera drew back. Each clump grows in from its buds now.

A sixty-ninth took the suit coming off (145.6 s), which four fresh readers had each taken for something else: wings
opening, an egg hatching, an eggshell, a pair of bowls on the floor. The sixty-sixth had only let its halves lie
longer. It was the halving: a suit split in two is not a suit taken off. It is lifted off her whole now, and set down
beside her standing empty, its window on nothing, the shape Ian still wears a little way off; then it is gone. Ian's
goes the same way, off the close frame, seen in Overview.

A seventieth gave the show to an eighth fresh reader. The olive drab read: they called him the soldier. But caught in
the air as he hopped back over the two of them, he read as a bubble rising, a balloon. He rolls back past them along
the floor now, behind them, and out the way he came. Their other notes stay: her hops along the sat phone's keys are
the dialing; the leap's arc through the willow is the leaves she reaches; the swing's length and the white before the
heptapods come are the cue's; Ian at the cut, as before.

A seventy-first looked at the fiftieth to the seventieth together, the whole show at a frame every two seconds and
again in a tall frame every three: the warm ending, the overcast break, the hands, the slower limbs, the soldier in
olive rolling out, the pedal, the lower bounce and the run back, the turning helicopter, the gathered gold ring,
China's red picture, the waking white, the pinned lift, the blast from the charge, the seam's glow, the suit lifted
off whole, the willow's clumps grown in. They sit together; nothing new showed. And the circle still closes as it
did: the last frame against the first differs exactly as it did before the fiftieth. Nothing to change.

A seventy-second gave the show to a ninth fresh reader: they had it whole, Arrival named, the soldier tied to the
charge. One note three readers in nine have given: her half cut by the frame's corner as the camera goes into the
television (100.6 s). It stays. The push ends with the news's picture filling the frame, three cells and more to her
right, so she must leave it, and to leave a frame is to cross its edge; she does it in a third of a second in the dark
foreground, and a frame a second catches it. To move her to stay in would move where she is across the match cut
into the valley. Their others stay as they were left: the frantic ring is meant jagged; the valley's long empty hold
is the shells' going on the loudest bars. Nothing to change.

A seventy-third ran the whole of what the site's build runs again, as the forty-fifth had, since the fiftieth to the
seventy-second had changed drawing in nine files and run only the show's own check: every suite (check, rube,
builder, playground, shows, premiere, clair) and the production build pass; the show's chunk is 237 kB, two more than
the forty-fifth found, well under the limit. And it weighed the soldier once more, five readers in nine having
stumbled on him: to be seen bringing the charge he would need room to push it in, and there is none; the cut opens a
second before he arms it, the two of them at his side. He stays as the seventieth left him. Nothing to change.

A seventy-fourth took the one note that outlasted every round: Ian cut away at the cut to the cradle (349.5 s), which
four fresh readers in nine (four of the last five) took for a slip. It had been left for the director's word since the forty-ninth; as with
the ending's light at the fiftieth, none came, and the director took it. In the film he leaves her. He is with her now
as the cradle shot opens, on her other side (the cradle stands where he stood), while she rocks it on the chord; then
he turns and goes, out of the close frame on her left and on out of the room, gone before the camera draws back. In
Overview he is seen walking the whole way out. The last frame is the first as before, to the same measure.

A seventy-fifth gave the show to a tenth fresh reader, asked what each of them does in the last minute: she chooses
this future, they said, knowing she will lose them both. The seventy-fourth's going read. How it was staged did not:
put on her left across the cut, where the cradle had taken his place, he swapped sides, a slip again, and went with
no beat before it, as if deleted. He stays on her right now, as he was, beyond the cradle, the baby between them;
turns away a half step, stands, looks back at her, and goes out of the room on the right. The last frame is the first
as before, to the same measure.

A seventy-sixth gave the show to an eleventh fresh reader: she takes up the watch again, they said, and Ian goes
back to his own life. Two things they could not see. His look back, his mark turning for under a second, was too
slight to read as a pause: he leans back toward her now as he looks, and holds it a second before he goes. And the
green blob at the top of the willow (62 s), which three readers have called a glitch: the swing's close frame draws
back past the limb's bend, and the clumps of leaves out there, solid among the sprays' single leaves and cut by the
frame's top, read as a blob. There are none at the bend now; the crown in the wide is as full as it was.

A seventy-seventh gave the show to a twelfth fresh reader: Ian leaves, they said, and she stays with her daughter,
knowing how it ends. But they saw him there, then gone: a cell from the frame's edge, he crossed it in under a second.
He walks out of the frame now, over some three seconds, and only quickens once he is out of it, well ahead of the
frame's edge as the camera draws back, and on out of the room. The last frame is the first, to the same measure.

A seventy-eighth took the note two fresh readers had given apart: at the sat phone (279 to 288 s) she floated over the
keys, a bubble, a cursor. Her hops along them lasted a third to a half of a second, so each rose a ball and a half and
a frame a second caught her in the air in half its frames. They are shorter now, a quarter to two fifths of a second,
still landing on the beats: low over the keys, and in the air far less.

A seventy-ninth gave the show to a thirteenth fresh reader. Ian walking out read: he leaves, she knowingly chooses.
But the empty suit the sixty-ninth set beside her had its window open onto the dark wall behind it, and it read as a
black ball inside it, a bowling ball. Its window is glass now, pale, a glint on it.

An eightieth gave the show to a fourteenth fresh reader: Ian leaves, she stays rocking the cradle, the loop closes.
The suit, the hops, Ian's walk passed without a word. Their worst, the baby there on the cut when the cradle was empty
before it, is the choice itself, the empty cradle they turn to and the child the cut gives her, as the seventh reader
read it; the rest had been met before. Nothing to change.

An eighty-first set the late rounds side by side for whoever reviews them: the show as the forty-ninth left it and as
it is now, rendered at the same eight moments (the ending, the blast, Ian's goodbye, the suit, the soldier, the ring
into the gala, the daylight, the helicopter), in a table at the head of the pull request beside the earlier two. The
show is unchanged.

An eighty-second filmed the whole show again at four frames a second, as the fifty-third had, after the twenty-odd
changes since, and ranked every change from one frame to the next against its neighbours. Every jump is a cut, a
punch, or meant (the blast, the lamp going out, Ian coming into the chamber, the white waking); none of the late
changes shows among them, and the blast's own jump is smaller than it was, the room seen through it. Nothing to
change.

An eighty-third looked at what the seventy-fourth to the seventy-ninth changed through Zoom and a tall frame, the
cameras the sixty-second and the seventy-first last took: the suit, the soldier, the ring into the gala, the hops on
the keys, Ian by the cradle, his look back and his going. All held; he is out of the tall frame by 360 s, long
before the last. Nothing to change.

An eighty-fourth took the question six fresh readers in fourteen had left open: who the red ball at the gala is. In
his red alone, close to Hannah's rose, he was her grown, a stranger, a lover. His red stays (it is China's screen and
the alarm lamp); a general wears a mark, and he is a little the larger now, his outline a dress uniform's brass braid.

An eighty-fifth gave the show to a fifteenth fresh reader, asked to name every ball. The eighty-fourth's braid did not
settle Shang: they still asked whether the red ball was a spouse or Hannah grown. Without words a ball can carry only
so much; the braid and his bearing stay, harmless, but the question is not answered by them. Their other notes had
been met before. Nothing to change.

An eighty-sixth took a note the fifteenth reader gave: the gala's guests read as coal, as rocks. Dark discs with only
the room's light along their tops, they had nothing of the cast about them. The near ones have a dim outline all round
now and a mark that looks toward the room's middle, as every ball in the show has; the far ones stay in the haze.

An eighty-seventh gave the show to a sixteenth fresh reader. The braid read: a general, a leader. The guests did not:
coal, ball bearings, olives, as the fifteenth had said, the eighty-sixth's outline and mark lost at their size. They
were darker than the room they stood in, holes in it. They are a muted grey a little above it now, people in its dim
light, with dark marks that look; still well below her and Shang. And the whole of what the site's build runs passed
again (every suite and the production build); the show's chunk is 238 kB.

An eighty-eighth gave the show to a seventeenth fresh reader: Shang read, by name; Ian leaves; the loop closes; the
guests read as a crowd. Their worst was the clock vanishing as Hannah goes (95.5 s), which the eleventh had said too.
The push in on her left it a sliver at the frame's edge, and a push in under a second reads as a cut: the clock was
there, then gone. The close frame keeps it whole at its right now, the clock running down beside the emptying bed,
and Louise in it under Zoom as the check holds her.

An eighty-ninth took the note that outlasted every version of it: the ring carried into the gala. Grey, then shorter,
then gathered into her, then in her gold, any frame of it a fresh reader caught they took for a thing in the room, a
wreath, a hoop; the eighteenth, a gold hula hoop. And the gala reads as a future she is shown without it: that reader
said memories of the future unprompted. It is gathered into her at once now, gone in a third of a second, the cut's
carry and nothing more.

A ninetieth checked the eighty-ninth with a fresh reader: the party read as a flash-forward, the future that gives her
what she needs now, with no ring standing in the room. (A first read this round was of the wrong show: another
session's server had taken the port these renders use, so its sheets were of another checkout; it was set aside.) The
cut to the cradle, the cradle and Ian each in a new place across it, has read as a glitch to several readers; the
cradle must end where the first frame has it, which is where Ian stands before the cut, so to lose the jump is to
restage the room before it. Left for the director's word.

A ninety-first weighed taking the cut to the cradle without a word back, as the fiftieth and the seventy-fourth had
taken theirs. It would not stay in the room: for neither the cradle nor Ian to move across the cut, Ian must be on
her left before it, and he is on her right from the field, across the match cut into the room; so the field's meeting
would be restaged too, or he would cross behind her on screen. That is a story's restaging, not a polish, and it
waits for the word. The branch is clean, the show's check passes whole. Nothing to change.

A ninety-second weighed the last note readers kept giving that no round had met: Ian gone from the blast to the field,
read by four as perhaps dead. He is seen after the blast, thrown and whole; and the field's meeting is his coming back,
which any sight of him between (down the lift with her, or in the tent) would spend before it. It stays. With that,
every note fresh readers have given more than once is met or kept for a stated reason, but the cut to the cradle, which
waits for the director's word. Nothing to change.

A ninety-third took the cut to the cradle after all, three passes on with no word back, as the fiftieth and the
seventy-fourth had taken theirs, having found a way that leaves the field alone. Ian's place before the room is just
left of where the first frame has the cradle; so the empty cradle waits at that place from the start, and after the
turn Ian goes round behind it to its far side, the empty cradle between them as she goes to it. On the cut nothing
moves: Louise, the cradle, Ian, all where they were; only the time changes, the baby in it. Then he goes, as the
seventy-fifth to the seventy-seventh left it. The last frame is the first, to the same measure.

A ninety-fourth checked the ninety-third with a fresh reader: Ian goes round the cradle, she chooses the daughter she
knows she will lose, he leaves her. But with nothing moving across the cut, the cut itself, the frame closing in as the
baby comes, read as a dropped frame, a jump cut. It is a cut in time; the morning swells through the glass now and falls
back over it, half a second each way, never near white, the room seen through it.

A ninety-fifth checked the ninety-fourth with a fresh reader: the palindrome came across whole, nothing in the last
minute a plain slip. A frame a second caught the swell at its height and took it for one overexposed frame; in motion it
is the half-second it was meant. The doubled post they saw at 350.5 s is one mullion, seen at full size. Nothing to
change.

A ninety-sixth looked at the eighty-eighth to the ninety-fourth (the clock kept whole, the ring gone at once, Ian round
the cradle, the swell over the cut) through a tall frame, Zoom and Overview: all held. And the whole of what the site's
build runs passed again; the show's chunk is 239 kB. Nothing to change.

A ninety-seventh filmed the spans changed since the eighty-second at four frames a second (the bed, the gala, the
ending): every jump a cut or a push, as before. The cut to the cradle, a jump twenty times its neighbours at the
eighty-second, is under four now, nothing in the room moving across it and the morning swelling over it. Nothing to
change.

A ninety-eighth brought the eighty-first's side-by-side up to date, its after-pictures having fallen behind the
eighty-fourth to the ninety-fourth: the forty-ninth against now at eleven moments, the cut to the cradle, Shang, the
guests and the clock added. The show is unchanged.

A ninety-ninth checked the brief's two standing rules again, as the forty-seventh had, over the fifty rounds since:
no audio file anywhere in the branch's difference from main, none tracked for the show; the onsets, the version file,
the music, the cue's declaration (the label's upload, `rVN1B-tUpgs`, by YouTube) and the attribution all untouched.
Every changed file is the show's drawing, staging and notes. Nothing to change.

A hundredth watched the whole show through once more, a frame every three seconds: it holds from the cradle to the
cradle, and nothing new showed. Nothing to change.

A hundred-and-first watched again, the whole show a frame every two and a half seconds, then full size where it looked
off, then in a phone's tall frame. The tall frame found the daylight (323 to 327 s) wrong: the sun's edge on the near
meadow came down in a staircase, steps a dozen pixels high. Two things made it. The near floor's light was cut into
forty slices whatever the frame, each with the edge where it lies at its depth; a tall frame has a lot of floor, so
each slice was tall. It is a slice every three pixels now. And each shaft was six nested widths ending square at its
full strength, so their feet stood stepped streaks along the floor, which showed in the wide too. Each shaft now fades
to nothing over its last seventh, into the light on the floor. The edge is one soft slant in any frame.

A hundred-and-second went through the whole show in the tall frame, a still every four seconds, since that was where
the last defect hid. The tent's floor was one flat fill: in the wide a strip under the table, but in a tall frame
nearly half the picture, a dead slab under the sat phone's close shots (281 to 293 s). It is lit as the room is now:
the ring's cold light pooled on it by the wall, brighter as the screens come back, the table's soft shadow under it,
and the floor going dark toward us. The shadow was cut square at first and stood on the floor as a box; it is an
ellipse, soft at its ends.

A hundred-and-third filmed the whole show at six frames a second and measured each frame against the last: every
jump was a cut, on the music, or a gesture meant to be quick (the palm drawn back after each word, the ring gathered
onto the rail). Then it went through the show in an ultrawide frame. After the blast (224 to 231 s) the white
coming in through the broken glass was seven nested banks, each with a hard top, and they stood in the dark room as
stacked arcs. It is twenty-four now over the same depth, one soft bank. The wedge of light on the wall was
made the same way and was tried finer too, but twenty-four near-clear layers piled the browser's gradient dither into
a grain with a seam at its end; it stays at nine, whose edges did not show.

A hundred-and-fourth looked at the show at a retina screen's size (2560 × 1440), and through a filter that lifts
every small step eight times; nothing showed that a viewer would see. Then it asked the six-frames-a-second film where
nothing moves: only the hold under the credits, from the last attack to the end, thirty-six seconds of a room that
stood frozen, the fog on the lake moving a pixel in a few seconds. The fog keeps its own clock now: the music's until
the last attack, then four times as fast, eased in over four seconds, so the room breathes while the cards come. The
first frame is the same to the pixel, and the last is the first, everyone where they were. The banks had a hidden
fault too: each wrapped round on its own every nine cells, and every twenty-three, with no copy coming in at the other
end, so a bank could jump where it was seen. Each is drawn either side of its period now, and wraps unseen.

A hundred-and-fifth went looking for the same fault everywhere, in every place that wraps something drifting round
on itself. The lake house's high streaks of cloud wrap far enough out that the window never shows it. The lawn's far
cloud banks and the fog on its lake wrapped at a fixed distance from the swing, which is only out of sight while the
frame is narrow enough; each is drawn a period either side now, as the house's fog is. And the helicopter's wash: each
puff of mist blown out from under it faded as it went, then came back at full strength at the rotor from one frame to
the next. It comes up from nothing now as well. The lawn, the vision and the wash filmed at six frames a second: no
jump in any.

A hundred-and-sixth looked for pops: anything that comes or goes from one frame to the next where it is seen. The
whole show filmed at ten frames a second, each frame cut into small squares and set against the last, flagging any
square that changed hard while the rest of the frame and the frames round it stayed still. Every one it found is a
strike on the music, quick by intent: the slot opening, the suit's board and her question flipping up, "weapon"
flung, the screens tipping and standing again, her hops along the phone's keys, the last screen up on the loudest
bar. The time-gated drawings that end mid-shot (the helicopter, Abbott's jagged ring) end out of the frame or in the
blast's white. The clock's bell shivers on a clock that wraps every ten seconds, a thousandth of a pixel's jump. Nothing
to change.

A hundred-and-seventh timed it: the show played, not filmed, a moment every six seconds, each frame's time taken as
the browser paints it (in software, with no graphics card, so every number is slow, but they are slow alike). The
lake house cost three times the rest, a hundred to a hundred and forty milliseconds a frame against forty: the show's
first and last frames, and the hold under the credits, were its heaviest. Two blurs did it. The sun on the floor
blurred each pane's light and each shadow on its own, six or more blurs a frame; the floor's mirror blurred a band of
the frame whole. Each is drawn small now, into a scratch canvas at half size, blurred there once and laid on whole
(`softLayer` in `kit.ts`): the same picture to within five levels, the first frame among them, and the house down to
thirty-five to fifty-five milliseconds, about the show's middle. The white coming in after the blast, made of twenty-four banks to hide their edges, had added half again to
those frames; it is seven banks blurred together the same way, smooth and cheaper. Over the whole show the median frame
went from forty-one milliseconds to thirty-one, and the worst from a hundred and forty to ninety-two. The worst now
are the fog beyond the glass, made of many soft gradients, and left as they are.

A hundred-and-eighth took the fog beyond the glass (232 to 266 s), the costliest place left: seventy to a hundred and
thirty milliseconds a frame. It is three depths of soft lobes, each a radial gradient over its own square, overlapping
many deep, and the farthest depth, the biggest lobes and the most of them, was half of it. Each depth is drawn into a
scratch canvas now and laid on whole, the far one at a quarter size and the nearer two at half (`softLayer` takes a
scale, and skips its blur when asked for none): soft already, they look the same, to within seven levels, and the fog
costs thirty-one to thirty-seven. One thing it costs: the browser's dither in a small gradient settles differently
each frame as the lobes drift, so the open fog flickers by one level in two hundred and fifty-five where it held still
before. It cannot be seen. Over the whole show the median frame is now twenty-six milliseconds, from thirty-one, and
the worst sixty-five, from ninety-two: the daylight's break and the blast.

A hundred-and-ninth took the daylight. The hundred-and-first had cut the sun's light on the near meadow into a slice
every three pixels, as many as two hundred, each with its own gradient, so its slanting edge would not step; that was
a fifth of the daylight's frame. But below the far line the light hangs on one thing only, how far along the slant a
point lies, x plus 1.4 times its depth: a single gradient laid along that slant draws the edge exactly. It is one
gradient a pass now, no slices: the same picture to within seven levels in the wide and the tall frame, the edge one
soft slant, and the daylight five to ten milliseconds cheaper.

A hundred-and-tenth checked the last five rounds against where this session began: the same four contact sheets,
filmed again at the same moments, each frame set against its first take. Every difference was one a round had meant
(the tent's floor, the white after the blast, the shafts' feet, the fog drifting under the credits) but one: a faint
line along the foot of the frame after the blast, which no round had drawn. It came from the scratch canvases the
soft layers share. Each use cleared only the part it drew in, and scaled up, a canvas is read a pixel past that part,
where an earlier, larger use (the fog, a whole frame of it) had left its picture. Each use now clears a margin past
its edge. The line is gone, and the house, which shares them, holds to within five levels of its first take.

A hundred-and-eleventh watched the last rounds' drawing (the soft layers, the house's mirror and floor light, the fog,
the white after the blast, the daylight's edge) through the player's other two cameras, at eighteen moments each:
in Zoom, where everything is drawn larger, the soft layers show no edge and the scratch canvases no line; in Overview
all of it sits where it did. No error and no warning in either. And the page as a visitor opens it, the song from
YouTube: the label's upload ready, the show loaded, no error across a seek through the changed places. Nothing to
change.

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
