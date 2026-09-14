import { outline, solid } from '../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, flick, over, rail, ramp, rankBy, roll, wait, type Lane, type Pt, type Seg } from '../../parts'
import { glow, lamp, score, tube } from './neon'

/**
 * A neon zigzag. The lane runs out onto a ramp made of a lit tube; the
 * tube runs down to a pad that turns the ball onto the next, and the
 * next; each tube comes on as the ball rides it and dies down behind,
 * each pad flashes and scores. Two tubes for one floor, so the ball comes
 * out facing back; three for two, facing on. Light and rubber, nothing
 * else.
 */
export interface ZigzagState {
  color: string
  floors: number
  /** Seconds after entry at which the ball meets each pad. */
  hits: number[]
  /** Seconds after entry at which the ball starts down each tube. */
  starts: number[]
}

const LIP = -0.3
const TURN = 0.3
const PAD = 0.05
const FACE = TURN + R
const POST = FACE + PAD
const BUMP = 0.05
const rampsFor = (floors: number) => floors + 1
const dropFor = (floors: number) => floors / rampsFor(floors)

export const zigzag = definePiece<ZigzagState>({
  name: 'zigzag',
  weight: 1,
  place: ({ rng, color, fits, taste }) => {
    const deep = taste.weights['drop-deep'] ?? 1
    for (const floors of rankBy(rng, [1, 2], (f) => Math.pow(deep, f - 1))) {
      const cells: Pt[] = []
      for (let i = 0; i <= floors; i++) cells.push([0, i])
      const ramps = rampsFor(floors)
      const drop = dropFor(floors)
      const turn: 1 | -1 = ramps % 2 ? 1 : -1
      const exit: Pt = [turn, floors]
      if (!fits(cells, exit)) continue
      const segs: Seg[] = [roll([-0.5, 0], [LIP, 0], ROLL)]
      const hits: number[] = []
      const starts: number[] = []
      let t = segs[0].dur
      let x = LIP
      let y = 0
      for (let i = 0; i < ramps; i++) {
        const to = i % 2 === 0 ? TURN : -TURN
        starts.push(t)
        const seg = ramp([x, y], [to, y + drop], i === 0 ? ROLL : 0.4, ROLL * 1.7)
        segs.push(seg)
        t += seg.dur
        if (i < ramps - 1) {
          hits.push(t)
          segs.push(wait([to, y + drop], BUMP))
          t += BUMP
        }
        x = to
        y += drop
      }
      segs.push(ramp([x, floors], [turn * 0.5, floors], ROLL * 1.7, ROLL))
      const lane: Lane = { segs, fire: hits[hits.length - 1] }
      return { cells, exit: { at: exit, dir: turn }, lane, state: { color, floors, hits, starts } }
    }
    return null
  },
  draw: (p, s, { k, t, ink, bg, weight }) => {
    const { floors } = s
    const ramps = rampsFor(floors)
    const drop = dropFor(floors)
    const turn = ramps % 2 ? 1 : -1
    rail(p, k, ink, weight, -0.5, LIP)
    const slope = Math.atan2(drop, TURN - LIP)
    const under = R / Math.cos(slope)
    // The tubes: each lit from the moment the ball starts down it, dying down after.
    let x = LIP
    let y = 0
    for (let i = 0; i < ramps; i++) {
      const last = i === ramps - 1
      const to = i % 2 === 0 ? TURN : -TURN
      const on = t < s.starts[i] ? 0 : 1 - over(t, s.starts[i] + 0.3, s.starts[i] + 1.2)
      tube(p, k, ink, weight, s.color, x, y + under, to, y + drop + (last ? FLOOR : under), on)
      x = to
      y += drop
    }
    // The pads: on posts that float in the dark, flashing when hit.
    for (let i = 0; i < ramps - 1; i++) {
      const side = i % 2 === 0 ? 1 : -1
      const by = (i + 1) * drop
      const hit = t < s.hits[i] ? 0 : flick(t - s.hits[i], 0.04, 0.08, 0.4)
      const lit = t < s.hits[i] ? 0 : 1 - over(t - s.hits[i], 0.1, 0.8)
      glow(p, k, s.color, side * FACE, by, 0.16, lit)
      outline(p, ink, weight)
      p.line(side * POST * k, (by - 0.16) * k, side * POST * k, (by + 0.16) * k)
      const thick = PAD * (1 - 0.35 * hit)
      solid(p, ink, weight, lit > 0.5 ? s.color : bg)
      p.rect(side * (POST - thick / 2) * k, by * k, thick * k, 0.22 * k, 0.015 * k)
      lamp(p, k, ink, weight, s.color, bg, side * (POST + 0.05), by - 0.2, 0.025, lit)
      score(p, k, s.color, side * TURN, by - 0.12, '+10', t - s.hits[i], 0.6)
    }
    // The rail out, from the last tube's foot.
    outline(p, ink, weight)
    p.line(x * k, (floors + FLOOR) * k, turn * 0.5 * k, (floors + FLOOR) * k)
  },
})
