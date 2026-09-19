import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { clamp, lerp } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, fly, laneAt, over, post, rail, ramp, segTime, wait, type Lane, type Pt, type Seg } from '../../parts'
import { flash } from './neon'

/**
 * A roller coaster. A car waits at the station, its seat a little under
 * the lane's end; the ball drops into it, the chain dog takes hold with a
 * clack, and the chain hauls car and ball up the lift hill at a walk. Over
 * the crest the chain lets go: the car tips over and swoops down the drop to
 * the floor below, faster all the way, and levels out onto the brake run —
 * where the fins grab the car and stop it dead in a shower of sparks, and
 * the ball, which nothing is holding, rolls on out of the car's open nose
 * onto the rail. The car stays on the brakes.
 *
 * The track is one curve — the height of the ball's line at every x — and
 * the rails, the car, the trestle and the lane are all drawn from it; the
 * ride's pace is the chain's up the hill and a falling thing's after it.
 *
 * It is one track to the eye too: the same rail from the station to the
 * buffer, lighting behind the car wherever the car has been — up the hill,
 * down the drop and onto the brakes — then going out together. Nothing
 * else moves along it: dashes chasing down the rail were marks with no
 * cause.
 */
/** The ball's line: the station, the crest, the foot of the drop. */
const STATION: Pt = [-0.08, 0.1]
const X_LIFT = -0.02
const CREST: Pt = [0.8, -0.33]
const FOOT: Pt = [1.9, 1]
/** The rails run this far under the ball's line: the seat's floor, the chassis, the wheels. */
const UNDER = 0.24
const X_TRACK0 = -0.34
const X_TRACK1 = 2.41
/** The brakes take hold here, and the car stops here. */
const X_BRAKE = 1.96
const X_STOP = 2.2
const CAR = 0.19
/** The chain's pace, and show gravity for the drop. */
const V_CHAIN = 1.0
const G = 9

const smoother = (u: number) => {
  const c = clamp(u)
  return c * c * c * (c * (c * 6 - 15) + 10)
}
/** The height of the ball's line at `x`. */
function lineAt(x: number): number {
  if (x <= X_LIFT) return STATION[1]
  if (x <= CREST[0]) return lerp(STATION[1], CREST[1], smoother((x - X_LIFT) / (CREST[0] - X_LIFT)))
  if (x <= FOOT[0]) return lerp(CREST[1], FOOT[1], smoother((x - CREST[0]) / (FOOT[0] - CREST[0])))
  return FOOT[1]
}
const slopeAt = (x: number) => (lineAt(x + 1e-4) - lineAt(x - 1e-4)) / 2e-4
/** A point `d` under the ball's line at `x`, square to it: the rails are this, at UNDER. */
const under = (x: number, d: number): Pt => {
  const m = slopeAt(x)
  const n = Math.hypot(1, m)
  return [x - (m / n) * d, lineAt(x) + d / n]
}

/** The rail, end to end. */
const RAIL: Pt[] = []
for (let tx = X_TRACK0; tx <= X_TRACK1 + 1e-9; tx += 0.02) RAIL.push(under(tx, UNDER))

/** The ride's pace at `x`: the chain's to the crest, a falling thing's after it. */
const paceAt = (x: number) => (x <= CREST[0] ? V_CHAIN : Math.sqrt(V_CHAIN * V_CHAIN + 2 * G * (lineAt(x) - CREST[1])))

/** The rail's end, the drop into the seat, the dog's clack. */
const EDGE: Pt = [STATION[0] - CAR - 0.07, 0]
const V_EDGE = 1.7
const DROP_T = (STATION[0] - 0.07 - EDGE[0]) / V_EDGE
const CLACK = 0.2
/** It lands on the seat's back and rolls the last of the way into its dish. */
const SEAT_IN: Pt = [STATION[0] - 0.07, STATION[1]]
const board: Seg[] = [ramp([-0.5, 0], EDGE, ROLL, V_EDGE), fly(EDGE, SEAT_IN, DROP_T, 0.02), ramp(SEAT_IN, STATION, 1.5, 0), wait(STATION, CLACK)]
const T_GO = segTime(board)
/** The ride, in short runs along the line: picking up the chain's pace, then whatever the height gives. */
const ride: Seg[] = []
{
  const step = 0.03
  let x = STATION[0]
  let v = 0
  while (x < X_BRAKE - 1e-9) {
    const nx = Math.min(X_BRAKE, x + step)
    const nv = nx < X_LIFT + 0.1 ? V_CHAIN * clamp((nx - STATION[0]) / (X_LIFT + 0.1 - STATION[0])) : paceAt(nx)
    ride.push(ramp([x, lineAt(x)], [nx, lineAt(nx)], Math.max(v, 0.02), Math.max(nv, 0.02)))
    x = nx
    v = nv
  }
}
const T_BRAKE = T_GO + segTime(ride)
const V_BRAKE = paceAt(X_BRAKE)
/** The car stops dead; the ball runs on out of it, down to the rail's pace by the edge. */
const STOP_T = (2 * (X_STOP - X_BRAKE)) / V_BRAKE
const LANE: Lane = {
  segs: [...board, ...ride, ramp([X_BRAKE, FOOT[1]], [2.5, FOOT[1]], V_BRAKE, ROLL)],
  fire: 0,
}
/** The fire is the tip over the crest. */
const T_CREST = (() => {
  let acc = T_GO
  for (const seg of ride) {
    if (seg.to[0] >= CREST[0]) return acc + seg.dur
    acc += seg.dur
  }
  return acc
})()
LANE.fire = T_CREST

/** Where the car is along the line: waiting at the station, under the ball for the ride, stopped on the brakes. */
function carAt(t: number): number {
  if (t <= T_GO) return STATION[0]
  if (t <= T_BRAKE) return laneAt(LANE, t).x
  const s = Math.min(t - T_BRAKE, STOP_T)
  return X_BRAKE + V_BRAKE * s - ((V_BRAKE / STOP_T) * s * s) / 2
}

/** A tube along a path, lit by `f`, its halo laid once. */
function tubePath(p: p5, k: number, ink: string, weight: number, color: string, pts: Pt[], f: number): void {
  if (pts.length < 2) return
  const path = () => {
    p.beginShape()
    for (const [x, y] of pts) p.vertex(x * k, y * k)
    p.endShape()
  }
  p.push()
  p.noFill()
  if (f > 0.02) {
    const halo = p.color(color)
    halo.setAlpha(40 * f)
    p.stroke(halo)
    p.strokeWeight(weight * 3.2)
    path()
  }
  p.stroke(p.lerpColor(p.color(ink), p.color(color), clamp(f)))
  p.strokeWeight(weight * 1.3)
  path()
  p.pop()
}

/** The car's frame: the origin on the ball's line at `x`, turned to the track, nosed down by `pitch` about its front wheels. */
function inCar(p: p5, k: number, x: number, pitch: number, draw: () => void): void {
  p.push()
  p.translate(x * k, lineAt(x) * k)
  p.rotate(Math.atan(slopeAt(x)))
  p.translate(0.11 * k, UNDER * k)
  p.rotate(pitch)
  p.translate(-0.11 * k, -UNDER * k)
  draw()
  p.pop()
}

export const coaster = definePiece<{ color: string }>({
  name: 'coaster',
  points: 200,
  weight: 0.9,
  flight: true,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ]
    if (!fits(cells, [3, 1])) return null
    return { cells, exit: { at: [3, 1], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, weight }) => {
    const x = carAt(t)
    const stopped = t - T_BRAKE - STOP_T
    const pitch = stopped > 0 ? 0.14 * Math.exp(-stopped * 7) * Math.cos(stopped * 24) : 0

    // The lane in, over the car's tail; the rail out, from the buffer.
    rail(p, k, ink, weight, -0.5, EDGE[0])
    rail(p, k, ink, weight, X_TRACK1, 2.5, 1 + FLOOR)
    post(p, k, ink, weight, X_TRACK1 + 0.03, 1 + FLOOR, 1.5)

    // The trestle: a bent under the track every so far, down to the ground, the tall bays braced corner to corner.
    const pts = RAIL
    const railAt = (bx: number) => {
      const i = Math.max(1, pts.findIndex((q) => q[0] >= bx))
      const [a, b] = [pts[i - 1], pts[i]]
      return lerp(a[1], b[1], clamp((bx - a[0]) / (b[0] - a[0] || 1)))
    }
    const bents = [-0.3, 0.06, 0.42, 0.78, 1.14, 1.5, 1.86, 2.22]
    outline(p, ink, weight * 0.8)
    for (const bx of bents) p.line(bx * k, railAt(bx) * k, bx * k, 1.5 * k)
    outline(p, ink, weight * 0.55)
    for (let i = 0; i + 1 < bents.length; i++) {
      const from = Math.max(railAt(bents[i]), railAt(bents[i + 1])) + 0.1
      if (1.5 - from < 0.35) continue
      p.line(bents[i] * k, from * k, bents[i + 1] * k, 1.5 * k)
      p.line(bents[i] * k, 1.5 * k, bents[i + 1] * k, from * k)
      p.line(bents[i] * k, from * k, bents[i + 1] * k, from * k)
    }
    outline(p, ink, weight)
    p.line(-0.38 * k, 1.5 * k, 2.3 * k, 1.5 * k)

    // The track: one rail, lit behind the car wherever it has been, going out a while after the ride.
    const glowing = t > T_GO ? 1 - over(since, 1.2, 2.2) : 0
    tubePath(p, k, ink, weight, s.color, pts, 0)
    if (glowing > 0) tubePath(p, k, ink, weight, s.color, pts.filter((_, i) => X_TRACK0 + i * 0.02 <= x), glowing)
    // The brake fins on the run-out, closed on the car once it is in them.
    const gripped = t > T_BRAKE ? 1 : 0
    solid(p, ink, weight * 0.8, s.color)
    for (const fx of [X_STOP - 0.12, X_STOP + 0.08]) p.rect(fx * k, (1 + UNDER - 0.035 - 0.012 * gripped) * k, 0.12 * k, 0.04 * k, 0.008 * k)

    // The car: a chassis on two wheels, a seat with a back to it and an open nose. Its far side, behind the ball.
    inCar(p, k, x, pitch, () => {
      solid(p, ink, weight, s.color)
      p.rect(0, (R + 0.04) * k, CAR * 2 * k, 0.08 * k, 0.025 * k)
      p.rect((-CAR + 0.03) * k, (R - 0.04) * k, 0.06 * k, 0.16 * k, 0.02 * k)
    })

    // The clack of the dog taking hold.
    flash(p, k, s.color, weight, STATION[0], STATION[1] + UNDER - 0.04, t - T_GO + 0.06, 0.16, 0.05, 0.16)
  },
  over: (p, s, { k, t, ink, bg, weight }) => {
    // The car's near side, in front of the ball: the ball sits in it.
    const x = carAt(t)
    const stopped = t - T_BRAKE - STOP_T
    const pitch = stopped > 0 ? 0.14 * Math.exp(-stopped * 7) * Math.cos(stopped * 24) : 0
    inCar(p, k, x, pitch, () => {
      solid(p, ink, weight, s.color)
      p.beginShape()
      p.vertex(-CAR * k, (R + 0.08) * k)
      p.vertex(-CAR * k, (R - 0.1) * k)
      p.vertex((-CAR + 0.1) * k, (R - 0.1) * k)
      p.vertex((-CAR + 0.18) * k, (R - 0.025) * k)
      p.vertex(CAR * k, (R - 0.025) * k)
      p.vertex(CAR * k, (R + 0.08) * k)
      p.endShape(p.CLOSE)
      p.fill(ink)
      p.noStroke()
      p.rect(0.02 * k, (R + 0.03) * k, 0.2 * k, 0.025 * k)
      // The wheels, on the rails.
      for (const wx of [-0.11, 0.11]) {
        solid(p, ink, weight * 0.8, bg)
        p.circle(wx * k, (UNDER - 0.042) * k, 0.085 * k)
        p.fill(ink)
        p.noStroke()
        p.circle(wx * k, (UNDER - 0.042) * k, 0.025 * k)
      }
    })
    // The sparks off the fins, thrown back from under the car while the brakes bite.
    const braking = t - T_BRAKE
    if (braking > 0 && braking < 0.4) {
      const f = braking / 0.4
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight * (1.1 - 0.6 * f))
      for (let i = 0; i < 6; i++) {
        const a = Math.PI + 0.25 + i * 0.22
        const r0 = 0.05 + (0.2 + 0.05 * (i % 3)) * f
        const sx = Math.min(x, X_STOP) - 0.13 - 0.04 * (i % 2)
        const sy = 1 + UNDER - 0.03 + 0.5 * f * f * 0.2
        p.line((sx + Math.cos(a) * r0) * k, (sy + Math.sin(a) * r0) * k, (sx + Math.cos(a) * (r0 + 0.07)) * k, (sy + Math.sin(a) * (r0 + 0.07)) * k)
      }
      p.pop()
    }
  },
})
