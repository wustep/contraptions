import { MAN_SIZE } from '../cast'
import { region, smooth, standing } from '../draw'
import { BEAT, beatNear } from '../music'
import { fly, rest, roll, type Move, type Pt } from '../path'
import type { Scene } from '../scene'
import { seat, WINDOWS } from '../voyage'
import { onShip } from '../world/ship'
import { BEACHED, later, onDeck, shipPose, shipX, STRIKE, strokeAt, walk } from './sirens/course'
import { DOWN_COW, drawIsland, FIRE, ground, KNEEL } from './storm/island'
import { drawBolt, drawCeiling, drawFarBolt, drawRain, drawSeas, STRIKE_SKY } from './storm/weather'

/**
 * Thrinacia and the storm (278.36 → the cut at 304.611, the tutti's last phrases). The ship runs onto the beach of
 * Apollo's island in gold light and lies there becalmed. Three of the men go ashore, one after another, up among the
 * god's cattle; he stays at the helm. They close round one cow, and on the phrase's hardest beat she goes down among
 * them and does not rise, and the herd stands still with its heads up. They light a fire by her and come back aboard,
 * and they put out with its smoke going up black behind them; the sky closes over them, the seas stand up, the rain
 * comes on in sheets. On the cut, the bolt.
 */

const [FROM] = WINDOWS.storm
const r = 0.13 * MAN_SIZE
/** The bow's foot of deck, where the men go over the side and come back. */
const BOW: Pt = [1.6, -0.37]
/** Where they land on the beach, and come back down to. */
const SHORE = 498.4

/**
 * The stroke, as the oars give it: on the beat while they row, slowing to rest as she comes onto the beach, still while
 * she lies there, and picking up again as they put out (the rate eased, and the stroke its running sum).
 */
const strokes: number[] = []
const STEP = 1 / 120
const S0 = FROM - 1
{
  let s = strokeAt(S0)
  for (let t = S0; t <= STRIKE + 2; t += STEP) {
    strokes.push(s)
    const rate = (1 - smooth(t, BEACHED.from - 1.6, BEACHED.from) + smooth(t, BEACHED.to, BEACHED.to + 1)) / BEAT
    s += rate * STEP
  }
}
export function oarsAt(t: number): number {
  const f = (t - S0) / STEP
  const i = Math.max(0, Math.min(strokes.length - 2, Math.floor(f)))
  return strokes[i] + (strokes[i + 1] - strokes[i]) * Math.max(0, Math.min(1, f - i))
}

/** A roll along the island's ground from x `a` to x `b`, ball on the grass, from rest to rest. */
const overGround = (a: number, b: number, t0: number, t1: number): Move => {
  const pts: Pt[] = []
  const n = Math.max(2, Math.ceil(Math.abs(b - a) / 0.2))
  for (let i = 0; i <= n; i++) {
    const x = a + ((b - a) * i) / n
    pts.push([x, ground(x) - r])
  }
  return roll(pts, t0, t1, 'inout')
}

/** One man's errand ashore: forward along the deck, over the bow, up to the cattle, and back the same way. */
function ashore(man: number, go: number, there: number, back: number): Move[] {
  const out: Move[] = []
  const shore: Pt = [SHORE, ground(SHORE) - r]
  const spot: Pt = [there, ground(there) - r]
  const hop = go + 0.8
  out.push(onDeck(walk(seat(man), BOW, go, hop), go, hop, r))
  out.push(later(hop, hop + 0.38, 'fly', () => fly(onShip(shipPose(hop), BOW), shore, hop, hop + 0.38)))
  const up = hop + 0.38
  const arrive = up + 0.9 + Math.abs(there - SHORE) * 0.27
  out.push(overGround(SHORE, there, up, arrive))
  out.push(rest(spot, arrive, back))
  const down = back + 0.6 + Math.abs(there - SHORE) * 0.18
  out.push(overGround(there, SHORE, back, down))
  const land = down + 0.38
  out.push(later(down, land, 'fly', () => fly(shore, onShip(shipPose(land), BOW), down, land)))
  out.push(onDeck(walk(BOW, seat(man), land, land + 0.85), land, land + 0.85, r))
  return out
}

const island = standing('thrinacia', region(486, -8, 530, 4, 3), 600, (g) => drawIsland(g))
const seas = standing('storm-seas', region(470, -12, 800, 4, 4), 600, (g) => drawSeas(g))
const ceiling = standing('storm-ceiling', region(470, -40, 720, 4, 4), 600, (g) => drawCeiling(g))
const farBolt = standing('storm-far-bolt', region(470, -30, 720, 4, 4), 600, (g) => drawFarBolt(g))
const rain = standing('storm-rain', region(470, -30, 800, 10, 4), 600, null, (g) => drawRain(g))
const bolt = standing('storm-bolt', region(500, -30, 560, 4, 3), 600, null, (g) => drawBolt(g))

export const storm: Scene = {
  key: 'storm',
  from: FROM,
  to: STRIKE,
  sky: STRIKE_SKY,
  weather: [
    [282.5, 0.1],
    [292.5, 0.12],
    [297, 0.35],
    [301, 0.7],
    [303.8, 0.88],
  ],
  ships: {
    0: {
      x: shipX,
      look: (t) => ({ sail: 0, stroke: oarsAt(t) }),
      // Gone at the strike: the wreck draws its two halves and its mast from there (`wreck.ts`).
      gone: STRIKE,
    },
  },
  men: {
    2: ashore(2, 284.6, DOWN_COW - 1.1, beatNear(291.9).t),
    1: ashore(1, 285.3, DOWN_COW + 0.85, beatNear(292.3).t),
    0: ashore(0, 286.0, DOWN_COW - 1.85, beatNear(292.6).t),
  },
  shots: [
    { t: 280.2, cells: 15, off: [3.4, -2.4] },
    { t: 283.2, cells: 11, at: [500.2, -1.5] },
    { t: 286.6, cells: 8.5, at: [503.6, -1.7] },
    // In on the cow among the men as she goes down, the herd either side; held while they light the fire and go.
    { t: KNEEL[0] - 0.5, cells: 4.8, at: [DOWN_COW + 0.1, -2.5] },
    { t: FIRE.lit + 0.5, cells: 4.6, at: [DOWN_COW + 0.1, -2.55] },
    // Back down to the ship with them, the smoke going up behind; out as they put out under it.
    { t: 294.6, cells: 10, at: [502.6, -2.2] },
    { t: 296.4, cells: 13, off: [2.4, -2.4] },
    { t: 299.8, cells: 17, off: [3.2, -3.0] },
    { t: 303.0, cells: 11, off: [0.6, -1.7] },
  ],
  back: [ceiling, farBolt, seas, island],
  front: [rain, bolt],
}
