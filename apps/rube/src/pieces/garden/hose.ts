import { outline, solid } from '../../../../../src/core/draw'
import { FAST, R, ROLL, burst, definePiece, laneAt, over, rail, ramp, roll, type Lane, type Pt } from '../../parts'
import { drop, tuft } from './green'

/**
 * A garden hose hung on a hook on the fence, its mouth at the path's end
 * and its nozzle pointing along the path a cell on. The hose is a tube as
 * wide as the ball: the ball rolls into the mouth and the hose swallows it,
 * and what is seen from then on is the ball *inside* — a circle the bore's
 * width in the hose's own colour, seen through the skin — climbing to the
 * hook, going round the loop twice, gathering pace, and coming down to the
 * nozzle, where the ball shoots out onto the path with a spit of water
 * behind it. The hose drips.
 *
 * The tube is drawn in front of the ball, and the circle inside it is cut
 * off at the mouth's plane and the nozzle's, so going in and coming out
 * are one motion: the part of the ball outside the tube is the ball, the
 * part inside is the circle, and the collars stand over the seam.
 */
const MOUTH = -0.24
const NOZZLE = 1.12
/**
 * The bore: a shade under the ball's width, so the hose swallows the ball
 * with a squeeze and the loop still has a hole in a cell one tall; the
 * tube's walls cover the ball's rim where it is under them.
 */
const BORE = 2 * R - 0.04
/** The loop: its centre, a little above the path so the runs bend up into its sides, and its radii. */
const BEND = 0.04
const CENTRE: Pt = [0.44, -BEND]
const RX = 0.33
const RY = 0.28
const TOP = CENTRE[1] - RY
/** Round the loop this many times: in at its near side going up, out at its far side coming down. */
const TURNS = 2.5
const T_MOUTH = (0.5 + MOUTH) / ROLL
/** How fast the ball goes at its quickest, mid-loop. */
const PEAK = 8

/**
 * The hose's centreline, sampled: straight in from the mouth, a short bend
 * up into the loop's near side, round it two and a half times, a bend down
 * out of its far side, straight out to the nozzle. The bends are tighter
 * than the bore, which would pinch a tube drawn alone; here they are inside
 * the colour where the runs meet the loop, so what shows is a tube going
 * into a loop's sides, and the ball inside rounds a corner instead of
 * turning on the spot.
 */
const PATH: Pt[] = (() => {
  const pts: Pt[] = []
  const near = CENTRE[0] - RX
  const far = CENTRE[0] + RX
  pts.push([MOUTH, 0], [(MOUTH + near - BEND) / 2, 0])
  const bend = 8
  for (let i = 0; i <= bend; i++) {
    const a = Math.PI / 2 - (Math.PI / 2) * (i / bend)
    pts.push([near - BEND + Math.cos(a) * BEND, -BEND + Math.sin(a) * BEND])
  }
  const round = Math.round(90 * TURNS)
  for (let i = 1; i <= round; i++) {
    const a = Math.PI + (Math.PI * 2 * TURNS * i) / round
    pts.push([CENTRE[0] + Math.cos(a) * RX, CENTRE[1] + Math.sin(a) * RY])
  }
  for (let i = 1; i <= bend; i++) {
    const a = Math.PI - (Math.PI / 2) * (i / bend)
    pts.push([far + BEND + Math.cos(a) * BEND, -BEND + Math.sin(a) * BEND])
  }
  pts.push([(far + BEND + NOZZLE) / 2, 0], [NOZZLE, 0])
  return pts
})()
/** Distance along the hose to each sample, and its length. */
const ALONG: number[] = PATH.reduce<number[]>((acc, pt, i) => {
  acc.push(i ? acc[i - 1] + Math.hypot(pt[0] - PATH[i - 1][0], pt[1] - PATH[i - 1][1]) : 0)
  return acc
}, [])
const LENGTH = ALONG[ALONG.length - 1]

/** A point along the hose, `f` from 0 (the mouth) to 1 (the nozzle), by distance. */
function hosePt(f: number): Pt {
  const want = f * LENGTH
  let i = 1
  while (i < PATH.length - 1 && ALONG[i] < want) i++
  const g = over(want, ALONG[i - 1], ALONG[i])
  return [PATH[i - 1][0] + (PATH[i][0] - PATH[i - 1][0]) * g, PATH[i - 1][1] + (PATH[i][1] - PATH[i - 1][1]) * g]
}

/**
 * The ball's timetable through the hose: its length walked in small steps,
 * at a pace that starts as the ball's, peaks in the loop and ends as a
 * kick's, so it goes in and comes out without a jolt. `TIMES[i]` is when
 * the ball reaches the i-th step.
 */
const STEPS = 240
const TIMES: number[] = (() => {
  const times = [0]
  const step = LENGTH / STEPS
  for (let i = 0; i < STEPS; i++) {
    const u = (i + 0.5) / STEPS
    const v = ROLL + (FAST - ROLL) * u + (PEAK - (ROLL + FAST) / 2) * Math.sin(Math.PI * u)
    times.push(times[i] + step / v)
  }
  return times
})()
const INSIDE = TIMES[STEPS]
const FIRE = T_MOUTH + INSIDE

/** Where along the hose the ball is, `tau` seconds after it went in. */
function bulgeAt(tau: number): Pt {
  let i = 0
  while (i < STEPS - 1 && TIMES[i + 1] < tau) i++
  return hosePt((i + over(tau, TIMES[i], TIMES[i + 1])) / STEPS)
}
/** Seconds after going in that the ball reaches `f` of the hose's length. */
function timeAt(f: number): number {
  const i = Math.min(STEPS - 1, Math.floor(f * STEPS))
  return TIMES[i] + (TIMES[i + 1] - TIMES[i]) * (f * STEPS - i)
}

/** The collar at the mouth: how far it reaches either side of the mouth's plane. */
const COLLAR = 0.06
/** The nozzle's length, back from its lip. */
const SPOUT = 0.14
/** Where the ball goes out of sight — wholly behind the collar and the tube — and comes back — its front at the nozzle's lip. */
const HIDE = MOUTH - COLLAR + R + 0.04
const SHOW = NOZZLE - R
const T_HIDE = timeAt((HIDE - MOUTH) / LENGTH)
const T_SHOW = timeAt(1 - (NOZZLE - SHOW) / LENGTH)

/**
 * The one lane. The ball is drawn by the show until its back is behind the
 * collar and again from the moment its front reaches the nozzle's lip; the
 * tube in front covers whatever of it is inside, and the circle in the tube
 * is the same ball at the same place. Between, the ball is out of sight on
 * a straight run, so the camera glides through instead of circling.
 */
const LANE: Lane = {
  segs: [
    roll([-0.5, 0], [MOUTH, 0], ROLL),
    // The two short runs in view share the timetable's pace: from the ball's at the mouth, and to a kick's at the nozzle.
    { from: [MOUTH, 0], to: [HIDE, 0], dur: T_HIDE, ramp: [ROLL, (2 * (HIDE - MOUTH)) / T_HIDE - ROLL] },
    { from: [HIDE, 0], to: [SHOW, 0], dur: T_SHOW - T_HIDE, hidden: true },
    { from: [SHOW, 0], to: [NOZZLE, 0], dur: INSIDE - T_SHOW, ramp: [(2 * (NOZZLE - SHOW)) / (INSIDE - T_SHOW) - FAST, FAST] },
    ramp([NOZZLE, 0], [1.5, 0], FAST, ROLL),
  ],
  fire: FIRE,
}

export const hose = definePiece<{ color: string }>({
  name: 'hose',
  weight: 0.9,
  flight: true,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, { k, since, ink, weight }) => {
    rail(p, k, ink, weight, -0.5, MOUTH - COLLAR)
    rail(p, k, ink, weight, NOZZLE, 1.5)
    // The fence behind: the ground, a top rail behind the loop, three pales
    // — the middle one shows through the loop — and grass at the outer two.
    outline(p, ink, weight)
    p.line(-0.5 * k, 0.5 * k, 1.5 * k, 0.5 * k)
    p.line(-0.42 * k, -0.42 * k, 1.3 * k, -0.42 * k)
    for (const x of [-0.36, CENTRE[0], 1.24]) p.line(x * k, 0.5 * k, x * k, -0.42 * k)
    tuft(p, k, ink, weight, -0.3, 0.5, 0.1, 0.02)
    tuft(p, k, ink, weight, 1.3, 0.5, 0.08, -0.02)

    // The spit out of the nozzle, and drips after.
    if (since > 0 && since < 0.25) {
      const g = over(since, 0, 0.25)
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      burst(p, (NOZZLE + 0.04) * k, 0, (0.08 + 0.12 * g) * k, (0.14 + 0.18 * g) * k, 4, -0.6)
      p.pop()
    }
    if (since > 0.2 && since < 1.6) {
      const g = ((since - 0.2) * 1.4) % 1
      drop(p, k, s.color, NOZZLE - 0.02, 0.18 + 0.28 * g, 0.02)
    }
  },
  over: (p, s, { k, t, ink, bg, weight }) => {
    // The hose, in front of the ball: two ink walls the bore apart with the
    // colour between, ended flat under the collars.
    p.push()
    p.noFill()
    p.strokeCap(p.SQUARE)
    for (const [w, c] of [
      [BORE * k + 2 * weight, ink],
      [BORE * k, s.color],
    ] as [number, string][]) {
      p.stroke(c)
      p.strokeWeight(w)
      p.beginShape()
      for (const [x, y] of PATH) p.vertex(x * k, y * k)
      p.endShape()
    }
    p.pop()
    // The ball inside, seen through the skin: a circle the bore's width in
    // the hose's own colour, wherever the ball is, cut off at the mouth's
    // plane and the nozzle's so it is only ever seen in the tube.
    const [bx, by] = t < T_MOUTH || t >= FIRE ? [laneAt(LANE, t).x, 0] : bulgeAt(t - T_MOUTH)
    if (bx + R > MOUTH && bx - R < NOZZLE) {
      p.push()
      const ctx = p.drawingContext as CanvasRenderingContext2D
      ctx.beginPath()
      ctx.rect(MOUTH * k, -0.5 * k, (NOZZLE - MOUTH) * k, k)
      ctx.clip()
      solid(p, ink, weight, s.color)
      p.circle(bx * k, by * k, BORE * k)
      p.pop()
    }
    // The brass collars at either end: the mouth the ball goes into, the nozzle it comes out of.
    solid(p, ink, weight, bg)
    p.rect(MOUTH * k, 0, COLLAR * 2 * k, 0.38 * k, 0.01 * k)
    p.quad((NOZZLE - SPOUT) * k, -0.19 * k, NOZZLE * k, -0.16 * k, NOZZLE * k, 0.16 * k, (NOZZLE - SPOUT) * k, 0.19 * k)
    // The hook, from the fence's top rail, its bowl in front of the loop's top.
    outline(p, ink, weight * 1.2)
    p.line((CENTRE[0] - 0.04) * k, -0.42 * k, (CENTRE[0] - 0.04) * k, (TOP - 0.02) * k)
    p.arc(CENTRE[0] * k, (TOP - 0.02) * k, 0.08 * k, 0.08 * k, 0, Math.PI)
  },
})
