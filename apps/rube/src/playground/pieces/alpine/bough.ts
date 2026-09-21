import type p5 from 'p5'
import { solid } from '../../../../../../src/core/draw'
import { R, ROLL, definePiece, laneAt, over, rail, ramp, roll, wait, type Lane, type Pt } from '../../../parts'
import { firGreen, sprung } from './parts-c'
import { powder, snow, snowAt, snowWhite } from './snow'

/**
 * A fir by the track with one long low bough bent down across the rail
 * under a load of snow, its tip on the line. The ball rolls into the bough
 * and is stopped by it, shoving it up a little; the shove is enough: the
 * load starts to slide, slowly, then quicker, off the bough's tip, and
 * whumps into the snow ahead in a burst of powder. Rid of it, the bough
 * whips up out of the ball's way, and the ball rolls on under it while it
 * nods itself still. The heap stays where it fell and the bough stays up.
 *
 * The bough is one angle about where it leaves the trunk. While the ball is
 * against it, that angle is the one that lays the bough's underside on the
 * ball, read off the lane, so the two touch and never cross.
 */
/** Where the bough leaves the trunk, how long it is, and how thick with needles where the ball meets it. */
const PIVOT: Pt = [-0.32, -0.4]
const LEN = 0.56
const THICK = 0.06
/** Its angle below the level: loaded, and free. */
const A_LOADED = 0.7
const A_FREE = -0.32
/** The angle that lays the bough's underside on a ball at `bx`. */
function resting(bx: number): number {
  const d = bx - PIVOT[0]
  return Math.acos((R + THICK) / Math.hypot(d, PIVOT[1])) - Math.atan2(d, -PIVOT[1])
}
/** Where the ball meets the loaded bough, how far it shoves in, and the angle it has shoved the bough up to. */
const X_HIT = PIVOT[0] + (-PIVOT[1] * Math.cos(A_LOADED) - (R + THICK)) / Math.sin(A_LOADED)
const PUSH = 0.05
const A_SHOVED = resting(X_HIT + PUSH)
/** The load's slide along the bough, from where it lay to past the tip, and how long it takes. */
const S0 = 0.34
const S1 = LEN + 0.06
const SLIDE = 0.5
/** How high the load's middle rides over the bough's. */
const RIDE = 0.085
const G = 22

const IN = roll([-0.5, 0], [X_HIT, 0], ROLL)
const SHOVE = ramp([X_HIT, 0], [X_HIT + PUSH, 0], ROLL, 0)
const FIRE = IN.dur + SHOVE.dur
/** The ball is let go a moment after the load leaves the tip, as the bough comes up off it. */
const HELD = SLIDE + 0.04
const LANE: Lane = {
  segs: [IN, SHOVE, wait([X_HIT + PUSH, 0], HELD), ramp([X_HIT + PUSH, 0], [0.5, 0], 0, ROLL)],
  fire: FIRE,
}

/** The bough's angle, `t` seconds into the piece. */
function boughAt(t: number): number {
  const since = t - FIRE
  const free = since < SLIDE ? A_LOADED : A_FREE + sprung(since - SLIDE, A_SHOVED - A_FREE, 0, 11, 2.6)
  const bx = laneAt(LANE, t).x
  // Only a ball that is under the bough holds it up.
  return bx > X_HIT - 0.2 && bx < PIVOT[0] + LEN ? Math.min(free, resting(bx)) : free
}

/** The load's centre once it has left the tip: thrown on along the bough, and falling. */
const dir: Pt = [Math.cos(A_SHOVED), Math.sin(A_SHOVED)]
const OFF: Pt = [PIVOT[0] + S1 * dir[0] + RIDE * dir[1], PIVOT[1] + S1 * dir[1] - RIDE * dir[0]]
const PACE = (2 * (S1 - S0)) / SLIDE
const fallAt = (u: number): Pt => [OFF[0] + PACE * dir[0] * u, OFF[1] + PACE * dir[1] * u + 0.5 * G * u * u]
/** When it lands, and where. */
const FALL = (() => {
  let u = 0
  while (fallAt(u)[1] < snowAt(fallAt(u)[0]) - 0.04 && u < 1) u += 1 / 480
  return u
})()
const HEAP = fallAt(FALL)[0]

/** The load: a long fat lump of snow, soft on top and flat where it lay on the bough. */
function load(p: p5, k: number, ink: string, weight: number, white: string): void {
  solid(p, ink, weight, white)
  p.beginShape()
  p.vertex(-0.2 * k, 0.04 * k)
  p.curveVertex(-0.2 * k, 0.04 * k)
  p.curveVertex(-0.21 * k, -0.02 * k)
  p.curveVertex(-0.12 * k, -0.075 * k)
  p.curveVertex(-0.02 * k, -0.06 * k)
  p.curveVertex(0.09 * k, -0.085 * k)
  p.curveVertex(0.2 * k, -0.035 * k)
  p.curveVertex(0.215 * k, 0.04 * k)
  p.curveVertex(0.215 * k, 0.04 * k)
  p.endShape(p.CLOSE)
}

export const bough = definePiece<{ green: string; white: string }>({
  name: 'bough',
  weight: 1,
  place: ({ fits, theme }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, -1],
    ]
    if (!fits(cells, [1, 0])) return null
    // A fir is green and snow is white, whatever colour the map hands the piece.
    return { cells, exit: { at: [1, 0], dir: 1 }, lane: LANE, state: { green: firGreen(theme), white: snowWhite(theme) } }
  },
  draw: (p, s, { k, since, ink, weight }) => {
    snow(p, k, ink, weight, -0.5, 0.5)
    rail(p, k, ink, weight, -0.5, 0.5)

    // The fir: a trunk out of the snow, and four tiers in one outline.
    const tx = PIVOT[0]
    p.stroke(ink)
    p.strokeWeight(weight * 2.2)
    p.line(tx * k, (snowAt(tx) + 0.02) * k, tx * k, -0.6 * k)
    solid(p, ink, weight, s.green)
    const tiers: [number, number][] = [[-0.52, 0.17], [-0.74, 0.14], [-0.94, 0.11], [-1.13, 0.08]]
    p.beginShape()
    p.vertex(tx * k, -1.42 * k)
    for (let i = tiers.length - 1; i >= 0; i--) {
      p.vertex((tx + tiers[i][1]) * k, tiers[i][0] * k)
      if (i > 0) p.vertex((tx + tiers[i - 1][1] * 0.45) * k, tiers[i][0] * k)
    }
    for (let i = 0; i < tiers.length; i++) {
      if (i > 0) p.vertex((tx - tiers[i - 1][1] * 0.45) * k, tiers[i][0] * k)
      p.vertex((tx - tiers[i][1]) * k, tiers[i][0] * k)
    }
    p.endShape(p.CLOSE)

    // The load where it fell: a heap in the snow, and powder off the whump.
    const u = since - SLIDE
    if (u >= FALL) {
      const land = over(u, FALL, FALL + 0.12)
      solid(p, ink, weight, s.white)
      p.arc(HEAP * k, (snowAt(HEAP) + 0.01) * k, (0.2 + 0.04 * land) * k, (0.22 - 0.06 * land) * k, Math.PI, Math.PI * 2, p.OPEN)
      powder(p, k, ink, weight, s.white, HEAP, snowAt(HEAP) - 0.02, over(u, FALL, FALL + 0.4), 0.9)
    }
  },
  // The bough lies over the ball's shoulder while it holds it, so it and its load are drawn in front of the ball.
  over: (p, s, { k, t, since, ink, weight }) => {
    p.push()
    p.translate(PIVOT[0] * k, PIVOT[1] * k)
    p.rotate(boughAt(t))
    // A spray of needles from the trunk with a scalloped underside, and the load on it while it has one.
    solid(p, ink, weight, s.green)
    p.beginShape()
    p.vertex(0, -0.04 * k)
    p.vertex(LEN * 0.55 * k, -0.045 * k)
    p.vertex(LEN * k, 0)
    p.vertex(LEN * 0.82 * k, THICK * k)
    p.vertex(LEN * 0.72 * k, THICK * 0.5 * k)
    p.vertex(LEN * 0.52 * k, THICK * 1.2 * k)
    p.vertex(LEN * 0.42 * k, THICK * 0.55 * k)
    p.vertex(LEN * 0.22 * k, THICK * 1.15 * k)
    p.vertex(0, 0.04 * k)
    p.endShape(p.CLOSE)
    if (since < SLIDE) {
      const f = Math.max(0, since) / SLIDE
      p.translate((S0 + (S1 - S0) * f * f) * k, -RIDE * k)
      load(p, k, ink, weight, s.white)
    }
    p.pop()

    // The load off the tip, tumbling down.
    const u = since - SLIDE
    if (u >= 0 && u < FALL) {
      const [x, y] = fallAt(u)
      p.push()
      p.translate(x * k, y * k)
      p.rotate(A_SHOVED + 1.6 * u)
      load(p, k, ink, weight, s.white)
      p.pop()
    }
  },
})
