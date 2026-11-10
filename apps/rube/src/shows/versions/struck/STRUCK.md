# Struck

`/shows/struck/` · `versions/struck/fable52.show.ts` · code in `versions/struck/works/`

Bach's Prelude in C major, BWV 846, played by steel balls on the insides of instruments. The balls do not follow the
music, they make it: there is no recording and no soundtrack underneath, and every note is a physical model sounding
at the moment a ball lands on a tine, a hammer's lever or a bellows, or carries a bow across a cello's string. 2:15.

## The idea: across the machine is time

The machine is one long soundboard going down a slope, and it is laid out as a score is. A cell is 5 cm and gravity is
the real one. Every ball crosses it at one speed, 27.5 cm a second, a sixteenth note every 1.25 cells, and nothing in
the machine ever pushes a ball sideways (every part a ball lands on is level). So a part's place across the machine is
the moment it sounds, parts at the same place sound together, and the balls in play are always one above another, in
a column: the playhead.

All that is designed is each ball's height (`layout.ts`):

- while it has nothing to play, it **rolls** along a level brass rail with felt on it;
- it runs off the rail's end and **falls** onto its first note, and how far it falls is how hard it plays;
- it **bounces** from part to part down a short stair. Each flight is a parabola under 9.81 m/s², and each part gives
  back the share of the landing speed its material does: a steel tine 0.9, a hammer's lever 0.6, a sprung bellows
  0.7. So the next part stands where the ball comes down a sixteenth later, and a lively part's stair is shallow and
  a dull one's steep;
- it comes down on the next rail, a little lower.

The machine falls three cells every half bar. That fall is what pays for the bounces.

## One ball cannot play a chord

The prelude is the piece for this, because Bach had the same problem: it is harmony in five parts written as one line
of sixteenths, a chord broken so that one hand can play it. Bars 1 to 32 are one figure, five notes laid out as eight
sixteenths (1 2 3 4 5 3 4 5), played twice a bar. One ball can play that, and at first one does. Then the line is
shared out, each ball taking its turn at the figure and rolling along its rail while the others play (`who`):

| Bars | Balls | Who plays what |
|---|---|---|
| 1–4 | 1 | the red ball alone, down a stair of **tines** |
| 5–11 | 2 | the blue ball takes the two low notes on **hammers and strings**; red keeps the six above |
| 12–19 | 3 | the green ball answers on **pipes**: red plays 3 4 5, green plays them back |
| 20–23 | 3 | the other way round: the pipes first, the tines answer |
| 24–31 | 3 | the pedal. The blue ball leaves the hammers and drops into the frog of a **bow**, and the bass G is bowed for eight bars. Red takes four notes, green three |
| 32–34 | 3, then 2 | the bow moves to the C string. The last two bars are a single run, and red plays it alone |
| 35 | 5 | the chord |

A ball cannot split, so the machine keeps balls waiting on shelves behind latches, and a part that is struck trips the
latch (a wire runs from the part to it). The second ball is let go by a tine half a bar before it is wanted, the third
the same way, and three more in the bar before the chord.

**The chord.** Bar 35 is the only true chord in the piece: C2 C3 E4 G4 C5. Parts that sound together stand at the one
place across, so the chord is a column: a pipe, three tines one under another, and the bow reaching its last cello.
Four balls land on it in the same instant.

**The ritardando.** Across is time, so the last two bars' broadening is the parts standing further apart. A ball
that has longer to wait between two notes has to be in the air longer, so it bounces higher, and with the same give
in the steel the stair gets steeper: the slowing is seen as bigger leaps.

## The instruments, and how each sounds

Every part is played once: the machine is the score, part after part. Each is cut to its note.

| Part | What the ball does | The model (`engine.ts`) |
|---|---|---|
| **Tine** (a kalimba's, about life size, length ∝ 1/√pitch) | lands near its tip | a clamped-free bar: modes at 1 : 6.27 : 17.55, the upper ones gone in tens of milliseconds; the contact is Hertzian, so a harder landing is brighter; a small box resonance |
| **Hammer and string** | lands on the pad of a crank; its felt end, 1.6 times as far from the pin, is thrown at a string hanging under it. The ball lands 20 ms before the beat, because that is what the hammer's flight takes | a stiff string as a waveguide (loss, dispersion for the inharmonicity, two strings a little apart from C3 up), struck an eighth of the way along by a felt hammer whose force is K·xᵖ, solved against the string every sample: louder is brighter by physics. No dampers, as on a dulcimer |
| **Pipe on a bellows** (a stopped flue pipe, length ∝ 1/pitch) | lands on a sprung bellows, which puffs through the pipe | a bore waveguide blown by a jet: the jet's delay, a saturating flow law, turbulence. Stopped, so the odd harmonics; it cannot overblow |
| **Cello and bow** (life size: a body 75 cm long, 50 cm of hair) | sits in the frog of a bow on a rail down the slope. The bow's hair crosses one cello's string for half a bar, and its tip reaches the next cello as its frog leaves the last. The string's grip on the hair is the brake that holds the ball to its speed: about 0.4 N, which is what a 33 mm steel ball weighs down that slope | an open string (G, then C) as a waveguide either side of the bow, a stick-slip friction curve solved each sample, a five-mode cello body. On the last chord the bow slows to rest and the string rings out |

Nothing sounds that is not one of these contacts, or the small knock of a latch.

The engine runs in an AudioWorklet (`live.ts`), striking each note on the sample the show reaches it, through a small
dry room (`render.ts`). It is the same arrangement Orchestrion made (`SoundtrackSpec.live`): the show's clock is the
audio clock, half speed is the machine at half speed with every part at its own pitch, and a saved video or
`?music=file` gets the same voices rendered to a WAV.

Some of the physics follows the `instruments` project (hammer felt, bow friction, jet drive), rewritten small enough
to be one self-contained function, since that function's text is the audio thread's program.

## The picture

The inside of an instrument in daylight: spruce, with the grain running down the slope and a rib at every bar line.
A part is still until its ball lands on it and is then seen sounding in that ball's colour for as long as it rings: a
tine and a string as the blur of their swing, a pipe as the air standing in it (most under the stopper, none at the
mouth), a cello's string under the bow.

The camera goes down the slope with the balls and opens as the voices come in. It composes for the stage it is given
(`Performance.camera` is now told the stage's shape): a wide stage takes its frame's height from the lanes, and a phone
held upright, which has height to spare, is set by width instead, so the balls are three to four times the size they
would be as a 16:9 band across the middle.

## What is and is not physics

True to the letter, and held by `checks/struck.ts`: every sixteenth of the score sounded once, on its beat, at its
pitch; every ball at one speed across; every leg of a ball's way ending where the next begins; every flight a fall
under 9.81 m/s² that lands with the speed the part is struck at; every part's give that of its material; every part
cut to its pitch; the engine playing the same samples at any block size, each voice in tune.

Taken for granted, as a drawing of a machine may: a bounce takes no time; a rail's felt takes up a landing at once;
the bow is at the ball's speed the moment the ball is in it; a latch costs the part that trips it nothing.

Not heard by its maker: the mix was balanced by measurement (levels by voice and by section, spectra, tuning), not by
ear. It wants a listen.

## Files

- `prelude.ts`: the score.
- `layout.ts`: the machine laid out from it: lanes, who plays what, every ball's way, the parts, the cellos.
- `score.ts`: the contacts as the notes the engine plays.
- `engine.ts`, `live.ts`, `render.ts`: the voices, the audio thread, the room and the file.
- `draw.ts`, `camera.ts`, `show.ts`, `index.ts`: the picture, and the take put together.
