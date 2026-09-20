import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { FLOOR, R, ROLL, arrive, arriveAt, definePiece, laneReach, over, rail, ramp, wait, type Lane } from '../../parts'
import { flash, glow, lamp, score } from './neon'

/**
 * A photo booth across the lane: a cabinet with a lamp in its header, a
 * short curtain hung under it in two halves, and a slot in its far side.
 * The rail runs in through the cabinet's side and across its floor; the
 * ball rolls in behind the curtain, which stirs as it goes, and stops on
 * the mark for its picture, seen from the middle down under the hem the
 * way a sitter's legs are. The lamp comes on, and the flash goes off: the
 * whole curtain lit paper-white for an instant, the light spilling out
 * under it. The ball starts at it and bolts out the far side, the curtain
 * stirring again, and the strip drops out of the slot beside it: three
 * frames with its portrait in each, in its own colour. It hangs there.
 */
export interface BoothState {
  color: string
  curtain: string
}

/** The cabinet, its header with the lamp, the dark inside from under the header to the rail, and the doorways in its sides. */
const HALF = 0.3
const TOP = -0.46
const HEADER = 0.1
const INSIDE = 0.25
const DOOR_TOP = -0.17
/** The curtain: two halves from under the header to a wavy hem at the ball's middle, a gap between them. */
const CURTAIN_X = 0.27
const HEM = -0.02
const GAP = 0.012
/** The strip out of the slot in the far side: how wide, and how long it grows. */
const SLOT_Y = -0.4
const STRIP_W = 0.09
const STRIP_L = 0.22
/** It stops on the mark, sits for its picture, and starts at the flash: off quicker than it came. */
const ARRIVE = arriveAt(0)
const POSE = 0.3644
const FLASH_AT = 0.24
const FIRE = ARRIVE + FLASH_AT
const BOLT = 3.2
const LANE: Lane = {
  segs: [...arrive([-0.5, 0], [0, 0]), wait([0, 0], POSE), ramp([0, 0], [0.14, 0], 0, BOLT), ramp([0.14, 0], [0.5, 0], BOLT, ROLL)],
  fire: FIRE,
}
/** When the ball's front meets the curtain's near edge, and when its back is clear of the far one. */
const T_IN = laneReach(LANE, -CURTAIN_X - R)
const T_OUT = laneReach(LANE, CURTAIN_X + R)

/** The curtain's stir off the ball going by its edge: a sway of the hem, dying down. */
const stir = (s: number) => (s < 0 ? 0 : 0.035 * Math.sin(s * 13) * Math.exp(-s * 4))

/** One half of the curtain, from `x0` to `x1`, its hem swung by `sway`, in `fill`. */
function half(p: p5, k: number, ink: string, weight: number, fill: string, x0: number, x1: number, sway: number): void {
  const top = TOP + HEADER
  solid(p, ink, weight, fill)
  p.beginShape()
  p.vertex(x0 * k, top * k)
  p.vertex(x1 * k, top * k)
  // The hem: scallops, so the cloth reads as cloth without a line drawn on it.
  const n = 3
  for (let i = 0; i <= n; i++) {
    const f = i / n
    const x = x1 + (x0 - x1) * f + sway * (0.6 + 0.4 * Math.sin(f * Math.PI))
    if (i > 0) {
      const xm = x1 + (x0 - x1) * (f - 0.5 / n) + sway
      p.quadraticVertex(xm * k, (HEM + 0.035) * k, x * k, HEM * k)
    } else p.vertex(x * k, HEM * k)
  }
  p.endShape(p.CLOSE)
}

export const booth = definePiece<BoothState>({
  name: 'booth',
  points: 100,
  weight: 0.9,
  place: ({ rng, color, fits, theme, ball }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    // The curtain in a colour of its own: not the cabinet's, and not the ball's if there is another to be had.
    const others = theme.colors.filter((c) => c !== color)
    const apart = others.filter((c) => c !== ball.color)
    const pool = apart.length ? apart : others
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane: LANE, state: { color, curtain: pool.length ? rng.pick(pool) : color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const busy = t > T_IN && t < T_OUT + 0.3
    // The cabinet: a box in the colour, dark inside from under the header to its floor, the lane's doorways cut in both sides.
    solid(p, ink, weight, s.color)
    p.rect(0, ((TOP + 0.5) / 2) * k, HALF * 2 * k, (0.5 - TOP) * k, 0.03 * k)
    solid(p, ink, weight * 0.8, bg)
    p.rect(0, ((TOP + HEADER + FLOOR) / 2) * k, INSIDE * 2 * k, (FLOOR - TOP - HEADER) * k, 0.01 * k)
    for (const side of [-1, 1]) {
      // A doorway: the side wall cut through outside the far jamb, its cut end capped.
      p.noStroke()
      p.fill(bg)
      p.rect(side * HALF * k, ((DOOR_TOP + FLOOR) / 2) * k, 0.075 * k, (FLOOR - DOOR_TOP) * k)
      outline(p, ink, weight)
      p.line(side * INSIDE * k, DOOR_TOP * k, side * HALF * k, DOOR_TOP * k)
    }
    // The rail, in at one doorway, across the booth's floor and out at the other.
    rail(p, k, ink, weight, -0.5, 0.5)
    // The lamp in the header: on while there is someone inside, and a wink at the flash.
    const lit = busy ? (since > 0 && since < 0.1 ? 0 : 1) : 0
    lamp(p, k, ink, weight, s.color, bg, 0, TOP + HEADER / 2, 0.035, lit)
    // The slot in the far side, which the strip comes out of.
    solid(p, ink, weight, ink)
    p.rect((HALF + 0.01) * k, SLOT_Y * k, 0.05 * k, 0.03 * k)
  },
  over: (p, s, { k, t, since, ink, bg, weight, color }) => {
    // The curtain, in front of the ball from its middle up, in two halves; each stirs as the ball passes its edge.
    const flashOn = since >= 0 && since < 0.07
    const cloth = flashOn ? ink : s.curtain
    half(p, k, ink, weight, cloth, -CURTAIN_X, -GAP, stir(t - T_IN))
    half(p, k, ink, weight, cloth, GAP, CURTAIN_X, stir(t - T_OUT + 0.1))
    // The light out of the gap and under the hem: the flash itself, and its afterglow.
    if (since >= 0 && since < 0.5) {
      const f = 1 - over(since, 0.05, 0.5)
      glow(p, k, ink, 0, 0.02, 0.3, f)
      p.noStroke()
      p.fill(ink)
      p.rect(0, ((TOP + HEADER + HEM) / 2) * k, (GAP * 2 + 0.03 * f) * k, (HEM - TOP - HEADER) * k)
    }
    flash(p, k, ink, weight, 0, 0.0, since, 0.3, 0.2, 0.5)
    // The strip: feeds out of the slot after the flash and hangs, three frames with the ball's portrait in each.
    const fed = over(since, 0.3, 0.8)
    if (fed > 0) {
      const len = STRIP_L * fed
      const x = HALF + 0.05 + STRIP_W / 2
      solid(p, ink, weight * 0.6, ink)
      p.rect(x * k, (SLOT_Y + len / 2) * k, STRIP_W * k, len * k, 0.005 * k)
      p.noStroke()
      for (let i = 0; i < 3; i++) {
        const fy = SLOT_Y + 0.015 + i * 0.07
        if (fy + 0.06 > SLOT_Y + len) break
        p.fill(bg)
        p.rect(x * k, (fy + 0.03) * k, 0.06 * k, 0.06 * k)
        p.fill(color)
        p.circle(x * k, (fy + 0.032) * k, 0.036 * k)
      }
    }
  },
  scores: (p, s, { k, since, bg }) => score(p, k, s.color, bg, 0, TOP + 0.1, '+100', since, 1),
})
