import { outline, solid } from '../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, flick, over, rail, ramp, roll, wait, type Lane, type Pt, type Seg } from '../parts'

/**
 * A switchback. The rail runs out onto a ramp; the ramp runs down to a
 * bumper on the wall; the bumper turns the ball onto the next ramp, down
 * the other way; the last ramp runs straight out onto the rail below. Two
 * ramps for one floor, so the ball comes out facing back; three for two,
 * so it comes out facing on. Gravity and rubber, nothing else.
 */
export interface SwitchbackState {
  color: string
  floors: number
  /** Seconds after entry at which the ball meets each bumper. */
  hits: number[]
}

const LIP = -0.3
/** The ball's centre at a turn; the bumper's face is a radius further out, on a post inside the cell. */
const TURN = 0.3
const PAD = 0.05
const FACE = TURN + R
const POST = FACE + PAD
const BUMP = 0.05

/** How many ramps a descent of `floors` takes, and how far each drops. */
const rampsFor = (floors: number) => floors + 1
const dropFor = (floors: number) => floors / rampsFor(floors)

export const switchback = definePiece<SwitchbackState>({
  name: 'switchback',
  weight: 1,
  place: ({ rng, color, fits, taste }) => {
    const deep = taste.weights['drop-deep'] ?? 1
    const order = rng.weighted([1, 2], (f) => Math.pow(deep, f - 1)) === 2 ? [2, 1] : [1, 2]
    for (const floors of order) {
      const cells: Pt[] = []
      for (let i = 0; i <= floors; i++) cells.push([0, i])
      const ramps = rampsFor(floors)
      const drop = dropFor(floors)
      // An even count of ramps ends where it began, facing back; an odd one faces on.
      const turn: 1 | -1 = ramps % 2 ? 1 : -1
      const exit: Pt = [turn, floors]
      if (!fits(cells, exit)) continue
      const segs: Seg[] = [roll([-0.5, 0], [LIP, 0], ROLL)]
      const hits: number[] = []
      let t = segs[0].dur
      let x = LIP
      let y = 0
      for (let i = 0; i < ramps; i++) {
        const to = i % 2 === 0 ? TURN : -TURN
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
      return { cells, exit: { at: exit, dir: turn }, lane, state: { color, floors, hits } }
    }
    return null
  },
  draw: (p, s, { k, t, ink, weight }) => {
    const { floors } = s
    const ramps = rampsFor(floors)
    const drop = dropFor(floors)
    const turn = ramps % 2 ? 1 : -1
    rail(p, k, ink, weight, -0.5, LIP)
    // The planks: each a radius under the ball's line, square to the slope,
    // meeting the next in a V at the wall. The first hangs off the rail's
    // lip; the last runs into the rail out.
    const slope = Math.atan2(drop, TURN - LIP)
    const under = R / Math.cos(slope)
    outline(p, ink, weight)
    p.line(LIP * k, FLOOR * k, LIP * k, under * k)
    let x = LIP
    let y = 0
    for (let i = 0; i < ramps; i++) {
      const last = i === ramps - 1
      const to = i % 2 === 0 ? TURN : -TURN
      p.line(x * k, (y + under) * k, to * k, (y + drop + (last ? FLOOR : under)) * k)
      if (!last) {
        // A bracket from the V to the wall's post, and the post's bumper.
        const side = to > 0 ? 1 : -1
        p.line(to * k, (y + drop + under) * k, side * POST * k, (y + drop + under) * k)
      }
      x = to
      y += drop
    }
    // The walls: a post on each side that has a bumper, from above its
    // first bumper to below its last; the side the ball does not leave by
    // stands on the ground.
    for (const side of [-1, 1]) {
      const turns = []
      for (let i = 0; i < ramps - 1; i++) if ((i % 2 === 0 ? 1 : -1) === side) turns.push((i + 1) * drop)
      if (!turns.length) continue
      const top = turns[0] - 0.18
      const bottom = side === turn ? turns[turns.length - 1] + 0.18 : floors + 0.5
      p.line(side * POST * k, top * k, side * POST * k, bottom * k)
      if (side !== turn) p.line((side * POST - 0.06) * k, bottom * k, (side * POST + 0.06) * k, bottom * k)
    }
    // The bumpers: a rubber pad on each post where a ramp ends, squashed by the hit.
    for (let i = 0; i < ramps - 1; i++) {
      const side = i % 2 === 0 ? 1 : -1
      const by = (i + 1) * drop
      const hit = t < s.hits[i] ? 0 : flick(t - s.hits[i], 0.04, 0.08, 0.4)
      const thick = PAD * (1 - 0.35 * hit)
      solid(p, ink, weight, s.color)
      p.rect(side * (POST - thick / 2) * k, by * k, thick * k, 0.22 * k, 0.015 * k)
    }
    // The rail out, from the last plank's foot.
    outline(p, ink, weight)
    p.line(x * k, (floors + FLOOR) * k, turn * 0.5 * k, (floors + FLOOR) * k)
    // A tap of lines where the ball has just met a bumper.
    for (let i = 0; i < ramps - 1; i++) {
      const f = 1 - over(t, s.hits[i], s.hits[i] + 0.2)
      if (t < s.hits[i] || f <= 0) continue
      const side = i % 2 === 0 ? 1 : -1
      const bx = side * TURN
      const by = (i + 1) * drop
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      for (const a of [-0.5, 0, 0.5]) {
        const dir = side > 0 ? Math.PI + a : a
        const r0 = 0.16 + 0.1 * (1 - f)
        p.line((bx + Math.cos(dir) * r0) * k, (by + Math.sin(dir) * r0) * k, (bx + Math.cos(dir) * (r0 + 0.06)) * k, (by + Math.sin(dir) * (r0 + 0.06)) * k)
      }
      p.pop()
    }
  },
})
