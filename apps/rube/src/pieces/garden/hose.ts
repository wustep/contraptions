import { outline, solid } from '../../../../../src/core/draw'
import { FAST, R, ROLL, burst, definePiece, laneAt, over, rail, ramp, roll, type Lane, type Pt } from '../../parts'
import { drop, tuft } from './green'

/**
 * A garden hose hung over the fence rail in a loop, its mouth at the path's
 * end and its nozzle pointing along the path a cell on. The ball rolls into
 * the mouth and the hose swallows it the way a snake swallows an egg: the
 * hose is a thin tube, and where the ball is it fattens round it, a bulge
 * the ball's size in the hose's own skin that travels with the ball — up
 * into the loop, round it two and a half times, gathering pace, and down to
 * the nozzle, where the ball shoots out onto the path with a spit of water
 * behind it. The hose drips.
 *
 * The tube is drawn in front of the ball, and cut off at the mouth's plane
 * and the nozzle's, so going in and coming out are one motion: the part of
 * the ball outside the hose is the ball, the part inside is the bulge, and
 * the collars stand over the seam.
 */
const MOUTH = -0.24
const NOZZLE = 1.12
/** The hose's width when nothing is in it. */
const TUBE = 0.07
/**
 * How long the bulge is, either side of the ball's centre: the skin
 * stretches over nearly a ball's width each way. Short enough to read as
 * the ball, long enough that the bell is still wider than the ball's chord
 * everywhere under it, so the ball never shows through the skin.
 */
const BULGE = 0.23
/** The loop: its centre, a little above the path so the runs bend up into its sides, and its radii. */
const BEND = 0.04
const CENTRE: Pt = [0.44, -BEND]
const RX = 0.33
const RY = 0.28
/** Round the loop this many times: in at its near side going up, out at its far side coming down. */
const TURNS = 2.5
const T_MOUTH = (0.5 + MOUTH) / ROLL
/** How fast the ball goes at its quickest, mid-loop. */
const PEAK = 8
/** The fence's top rail, which the loop hangs over. */
const RAIL_Y = -0.36

/**
 * The hose's centreline, sampled: straight in from the mouth, a short bend
 * up into the loop's near side, round it two and a half times, a bend down
 * out of its far side, straight out to the nozzle. The bends are tight,
 * but they are where the runs meet the loop, so the ball inside rounds a
 * corner instead of turning on the spot.
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

/** How far along the hose the ball is, `tau` seconds after it went in. */
function alongAt(tau: number): number {
  let i = 0
  while (i < STEPS - 1 && TIMES[i + 1] < tau) i++
  return ((i + over(tau, TIMES[i], TIMES[i + 1])) / STEPS) * LENGTH
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
/** Where the ball goes out of sight — wholly behind the collar and the bulge — and comes back — its front at the nozzle's lip. */
const HIDE = MOUTH - COLLAR + R + 0.04
const SHOW = NOZZLE - R
const T_HIDE = timeAt((HIDE - MOUTH) / LENGTH)
const T_SHOW = timeAt(1 - (NOZZLE - SHOW) / LENGTH)

/**
 * The one lane. The ball is drawn by the show until its back is behind the
 * collar and again from the moment its front reaches the nozzle's lip; the
 * bulge in front covers whatever of it is inside and is the same ball at
 * the same place. Between, the ball is out of sight on a straight run, so
 * the camera glides through instead of circling.
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

/**
 * Where along the hose the ball's centre is at `t`, in distance from the
 * mouth: before the mouth and after the nozzle that is the ball's place on
 * the rail, so the bulge starts to swell at the mouth as the ball's front
 * comes in and is still there at the nozzle as its back goes out.
 */
function ballAlong(t: number): number {
  if (t < T_MOUTH) return laneAt(LANE, t).x - MOUTH
  if (t >= FIRE) return LENGTH + laneAt(LANE, t).x - NOZZLE
  return alongAt(t - T_MOUTH)
}

/** The hose's width at distance `s` from the mouth: the tube, swollen round the ball on a smooth bell. */
function widthAt(s: number, at: number): number {
  const d = Math.abs(s - at)
  if (d >= BULGE) return TUBE
  return TUBE + (2 * R - TUBE) * 0.5 * (1 + Math.cos((Math.PI * d) / BULGE))
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
    // The fence behind: the ground, the top rail the loop hangs over, three
    // pales — the middle one shows through the loop — and grass at the outer two.
    outline(p, ink, weight)
    p.line(-0.5 * k, 0.5 * k, 1.5 * k, 0.5 * k)
    p.line(-0.42 * k, RAIL_Y * k, 1.3 * k, RAIL_Y * k)
    for (const x of [-0.36, CENTRE[0], 1.24]) p.line(x * k, 0.5 * k, x * k, RAIL_Y * k)
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
      drop(p, k, s.color, NOZZLE - 0.02, 0.16 + 0.3 * g, 0.02)
    }
  },
  over: (p, s, { k, t, ink, bg, weight }) => {
    // The hose, in front of the ball: the centreline stroked a short piece
    // at a time, each at the width the hose has there — the thin tube, or
    // the bulge round the ball — ink first for the skin, then the colour
    // over it, so the pieces run together into one hose that swells and
    // settles as the ball goes through. Cut off flat at the mouth's plane
    // and the nozzle's, under the collars.
    const at = ballAlong(t)
    p.push()
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.beginPath()
    ctx.rect(MOUTH * k, -0.5 * k, (NOZZLE - MOUTH) * k, k)
    ctx.clip()
    p.noFill()
    for (const [skin, c] of [
      [weight * 1.8, ink],
      [0, s.color],
    ] as [number, string][]) {
      p.stroke(c)
      for (let i = 1; i < PATH.length; i++) {
        p.strokeWeight(widthAt((ALONG[i - 1] + ALONG[i]) / 2, at) * k + skin)
        p.line(PATH[i - 1][0] * k, PATH[i - 1][1] * k, PATH[i][0] * k, PATH[i][1] * k)
      }
    }
    p.pop()
    // The brass collars at either end: the mouth the ball goes into, the nozzle it comes out of.
    solid(p, ink, weight, bg)
    p.rect(MOUTH * k, 0, COLLAR * 2 * k, 0.36 * k, 0.01 * k)
    p.quad((NOZZLE - SPOUT) * k, -0.18 * k, NOZZLE * k, -0.15 * k, NOZZLE * k, 0.15 * k, (NOZZLE - SPOUT) * k, 0.18 * k)
  },
})
