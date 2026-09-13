import { outline, solid } from '../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, flick, over, rail, roll, wait, type Lane, type Pt, type Seg } from '../parts'

/**
 * A switchback. The rail runs out onto a ramp; the ramp runs down to a
 * bumper at the wall; the bumper turns the ball onto the next ramp, down
 * the other way. Two ramps per floor, one or two floors, so the ball comes
 * out a floor down facing back, or two floors down facing on. Gravity and
 * rubber, nothing else.
 */
export interface SwitchbackState {
  color: string
  floors: number
  /** Seconds after entry at which the ball meets each bumper. */
  hits: number[]
}

const LIP = -0.3
const WALL = 0.36
const HALF = 0.5
const BUMP = 0.05

/** The ball's line down a ramp from x0 to x1, top at y0. */
const ramp = (x0: number, x1: number, y0: number): Seg => roll([x0, y0], [x1, y0 + HALF], ROLL * 1.15, 'in')

export const switchback = definePiece<SwitchbackState>({
  name: 'switchback',
  weight: 1,
  place: ({ rng, color, fits, taste }) => {
    const deep = taste.weights['drop-deep'] ?? 1
    const order = rng.weighted([1, 2], (f) => Math.pow(deep, f - 1)) === 2 ? [2, 1] : [1, 2]
    for (const floors of order) {
      const cells: Pt[] = []
      for (let i = 0; i <= floors; i++) cells.push([0, i])
      const turn: 1 | -1 = floors % 2 ? -1 : 1
      const exit: Pt = [turn, floors]
      if (!fits(cells, exit)) continue
      const segs: Seg[] = [roll([-0.5, 0], [LIP, 0], ROLL)]
      const hits: number[] = []
      let t = segs[0].dur
      let x = LIP
      let y = 0
      for (let i = 0; i < floors * 2; i++) {
        const east = i % 2 === 0
        const to = east ? WALL : -WALL
        const seg = ramp(x, to, y)
        segs.push(seg)
        t += seg.dur
        hits.push(t)
        segs.push(wait([to, y + HALF], BUMP))
        t += BUMP
        x = to
        y += HALF
      }
      segs.push(roll([x, floors], [turn * 0.5, floors], ROLL, 'out'))
      const lane: Lane = { segs, fire: hits[hits.length - 1] }
      return { cells, exit: { at: exit, dir: turn }, lane, state: { color, floors, hits } }
    }
    return null
  },
  draw: (p, s, { k, t, ink, weight }) => {
    const { floors } = s
    rail(p, k, ink, weight, -0.5, LIP)
    // The ramps: each a plank a radius under the ball's line, on a strut.
    const slope = Math.atan2(HALF, WALL - LIP)
    const under = R / Math.cos(slope)
    outline(p, ink, weight)
    let x = LIP
    let y = 0
    for (let i = 0; i < floors * 2; i++) {
      const east = i % 2 === 0
      const to = east ? WALL : -WALL
      p.line(x * k, (y + under) * k, to * k, (y + HALF + under) * k)
      // A strut from the ramp's low end to the wall's post.
      p.line(to * k, (y + HALF + under) * k, to * k, (y + HALF + under + 0.16) * k)
      x = to
      y += HALF
    }
    // The walls: a post each side, from the first bumper to the ground of the last cell.
    for (const side of [-1, 1]) {
      const wx = side * (WALL + 0.09)
      p.line(wx * k, (side > 0 ? 0.2 : 0.7) * k, wx * k, (floors + 0.5) * k)
      p.line((wx - 0.06) * k, (floors + 0.5) * k, (wx + 0.06) * k, (floors + 0.5) * k)
    }
    // The bumpers: a rubber pad on each post where a ramp ends, squashed by the hit.
    for (let i = 0; i < floors * 2; i++) {
      const east = i % 2 === 0
      const bx = east ? WALL + 0.09 : -WALL - 0.09
      const by = (i + 1) * HALF
      const hit = t < s.hits[i] ? 0 : flick(t - s.hits[i], 0.04, 0.08, 0.4)
      solid(p, ink, weight, s.color)
      p.rect((bx - (east ? 1 : -1) * (0.05 - hit * 0.02)) * k, by * k, (0.06 + hit * 0.03) * k, 0.2 * k, 0.02 * k)
    }
    // The rail out, level with the last ramp's end.
    const turn = floors % 2 ? -1 : 1
    const lastX = floors % 2 ? -WALL : WALL
    outline(p, ink, weight)
    p.line(lastX * k, (floors + FLOOR) * k, turn * 0.5 * k, (floors + FLOOR) * k)
    // A tap of lines where the ball has just met a bumper.
    for (let i = 0; i < floors * 2; i++) {
      const f = 1 - over(t, s.hits[i], s.hits[i] + 0.2)
      if (t < s.hits[i] || f <= 0) continue
      const east = i % 2 === 0
      const bx = east ? WALL : -WALL
      const by = (i + 1) * HALF
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      for (const a of [-0.5, 0, 0.5]) {
        const dir = east ? Math.PI + a : a
        const r0 = 0.16 + 0.1 * (1 - f)
        p.line((bx + Math.cos(dir) * r0) * k, (by + Math.sin(dir) * r0) * k, (bx + Math.cos(dir) * (r0 + 0.06)) * k, (by + Math.sin(dir) * (r0 + 0.06)) * k)
      }
      p.pop()
    }
  },
})
