# Schubert's Impromptu No. 2, Take A

A new work built against main at `c2f8e02`, after PR #54. The music is
Franz Schubert's Impromptu in E-flat major, D. 899 No. 2, performed by
Chiara Bertoglio. [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Schubert%27s_Impromptu_no._2_in_E-flat_major,_D.899_-_Chiara_Bertoglio.ogg)
explicitly licenses this recording under CC BY 3.0. The original Ogg and
[attribution](SCHUBERT_IMPROMPTU_ATTRIBUTION.txt) live beside this plan.

The file is 261.816 seconds long. Playback skips 0.70 seconds of leading
silence and uses the remaining 4:21.116, including the final decay. The
downloaded file is unmodified. Credits stay in the panel and this folder.

Open `/shows/?show=schubert-impromptu&take=take-a`. The local review
server uses
`http://127.0.0.1:8793/shows/?show=schubert-impromptu&take=take-a`.

## Phrase plan

Times below are seconds of music after the offset. They are cues selected
from this recording's attack envelope, dynamics and returning pitch
patterns, rather than score measure numbers. The opening pattern returns
near 156.17 seconds. Each world continues through several phrases; phrase
boundaries change camera framing only.

| Music time | World | Phrase and movement |
| --- | --- | --- |
| 0–20.15 | Regular | Running scales. Scoop, paint, balloon and crane establish the chain; cannon release at 13.765, then screw and lift. |
| 20.15–40.56 | Regular | Answering line. Toaster and drawbridge lead to a quick sequence of relay, throw, seesaw, gears and loop. Hammer at 32.960. |
| 40.56–61.28 | Regular | Darker swell. Fold upward through balloon and pendulum, then flipper, plunger and conveyor. Bell at 59.197 punctuates the descent. |
| 61.28–73.97 | Regular | Accents gather. A lift and balloon gain height; trapeze, inverter, dominoes and trapdoor lead into the portal. |
| 73.97–93.90 | Forest | Clipped chords. Bloom, snail and falling maple leaves answer the change in attack. Spade at 86.202, sprinkler at 93.905. |
| 93.90–114.57 | Forest | Emphatic answer. Bee, hose and toadstools connect seed flights and snail carries across terraces. |
| 114.57–135.50 | Forest | Renewed motion. Well and dandelion trade height; wheelbarrow and maple lead to the frog release at 124.181. |
| 135.50–156.17 | Forest | Crest and falling away. Croquet at 143.088, then upward growth, gate, bamboo and a final falling leaf. |
| 156.17–176.00 | Aqua | Scales return. Anemone, octopus and pelican open the quieter passage; seal hands off to dolphin at 164.062. |
| 176.00–191.42 | Aqua | Across the water. Jellyfish, serpent, pelican and kelp connect the line; dinghy arrives at the oyster relay at 191.484. |
| 191.42–208.83 | Aqua | Quieter answer. Kelp, seal, dinghy, slipway and hawser carry the descending line into crab and blowhole. |
| 208.83–216.28 | Aqua | Gathering current. Blowhole at 208.756, one last dinghy crossing, foghorn, whirlpool and anchor descend into the portal. |
| 216.28–229.27 | Arcade | Closing drive. Pong, phaser and skee climb into UFO, hoops and ferris; striker lands at 229.280. |
| 229.27–241.69 | Arcade | Chords in the dark. Pixel and changer punctuate descending coaster runs. Hockey fires at 241.689. |
| 241.69–256.31 | Arcade | Final ascent. Claw, slots, whack and zigzag lead into coaster, spinner, bumper and pachinko. Slingshot and gauss deliver the ticket. |
| 256.31–261.116 | Arcade | Last chord. Ticket fires at 256.338 and the ball disappears through the final portal at 257.116. Only the recording's decay and trailing silence remain. |

The actual map cuts are 73.941, 156.217 and 216.281 seconds. Their largest
error from the planned cue is 47 ms. All 13 selected stock strikes fall
within 75 ms of their recording cues. The generated
[arrangement report](SCHUBERT_TAKE_A_ARRANGEMENT.md) lists every error.

## Catalog and timing

The available catalogs contain 35 Regular, 25 Forest, 24 Aqua and 25 Arcade
entries. All 109 world/catalog entries appear, representing 103 distinct
piece names because rail and portal belong to every world. There are 148
placements across maps of 73.94, 82.28, 60.06 and 40.84 seconds.

The 36 repeats are travel pieces: lifts, balloons and cranes; seeds,
leaves, vines and carries; boats, kelp, seals and slipways; then coasters.
Each world uses its rail once. No piece repeats immediately. The stock
waits inside mechanisms remain, including the cannon fuse. No durations,
paths, mechanism clocks or waits are authored by this take.

`scripts/show-plans/schubert.json` owns the order and stock exit variants.
`scripts/show-plans/schubert.ts` owns the music cues and phrase framing.
`npm run generate:schubert` calls fresh stock placements and writes the
score and report. `npm run check:schubert` checks the saved score against
both the plan and fresh placements. If the catalog expansion merges,
revise the explicit order to include the new pieces, then regenerate and
review again; regeneration alone does not invent a new arrangement.

## First 30 seconds

The opening checkpoint covers the first 30 seconds at 1×. The full take
continues while this checkpoint is available for review.

| Time | Review notes |
| --- | --- |
| 0:00–0:03 | Rail into scoop and painter. The scoop reverses the route while the piano starts its run; follow framing keeps the outgoing rail visible. |
| 0:03–0:10 | Balloon and crane lift and carry the ball, then the funnel descends. These longer stock actions give the rapid piano notes one continuous visual gesture. |
| 0:10–0:15 | Cradle relay hands into the cannon. Its original 1.35-second fuse stays intact; release at 13.765 is 5 ms after the selected attack. |
| 0:15–0:23 | Screw and lift climb through the next run. Toaster hands into drawbridge as the next phrase starts. |
| 0:23–0:30 | Paddle, trebuchet, seesaw, gears, loop and stairs produce a quicker sequence of actions. The 30-second frame catches the stair descent with the zipline ahead. |

Stephen's notes are pending. No license question is outstanding.

## Verification

- `npm run build` passes, including all existing takes and the new Schubert check. Vite still reports the existing large-chunk advisory.
- Fresh stock lanes, state and ball changes match all 148 placements. The checker verifies all 144 within-map handoffs, footprint separation, catalog coverage, cue reports and plan freshness.
- 31,335 motion/camera samples pass at 120 Hz. Maximum visible motion per sample is 0.087 cells. Reverse seeks across every handoff and relay are stable.
- The three world changes occur while the ball is hidden in the stock portals. The final portal hides the ball during the remaining four seconds of audio.
- Browser review renders all 148 placements, checks ten reverse-seek frames for pixel equality, and captures all four world overviews and the transitions. No canvas text calls or browser errors occur.
- The real controls play the Commons recording at 1× and 2× with pitch preservation. Overview returns to the identical paused frame. Mobile framing and the real PNG export are checked.
- The 30-second preview uses the production export painter at 1280×720 and 30 fps, with the source audio offset of 0.70 seconds. The PR attaches that clip, the checkpoint screenshot and a sheet of the four maps.
- Regeneration reproduces the score and arrangement report byte for byte.
