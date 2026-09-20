import type p5 from 'p5'
import { outline, solid } from '../../../../../../src/core/draw'
import { FLOOR, R, ROLL, arrive, arriveAt, definePiece, fly, over, post, rail, ramp, trace, wait, type Lane, type Pt } from '../../../parts'
import { soil, tuft } from '../../../pieces/garden/green'

/**
 * A push reel mower left on a strip of lawn, facing the way the ball comes:
 * long grass in front of it, a mown stripe behind. The rail ends at the
 * lawn's edge; the ball rolls in through the long grass and up against the
 * reel, and stops. The reel turns over, catches, and spins up — the mower
 * shudders on its wheels, clippings fly back into the grass box — and a
 * blade takes the ball up over the top of the reel and throws it out the
 * back: up between the handles, over the grass box, and down onto the rail
 * at the far side of the lawn. The reel runs down on its own.
 *
 * The ball leaves the reel along the reel's own tangent, at the pace the
 * blade had brought it to, so there is no kink where the throw begins.
 */
/** The reel: its axle just under the ball's line, so the blades meet the ball above their middle and take it up. */
const REEL: Pt = [0.42, 0.03]
const REEL_R = 0.1
/** The ball rides round the reel this far from its axle. */
const RIDE = REEL_R + R
/** Round the reel, angles from east with y down: from where the ball meets it, over the top, to where it is let go. */
const MEET = Math.PI + Math.asin(REEL[1] / RIDE)
const LET_GO = (Math.PI * 3) / 2 - 0.5
const WHEEL_R = 0.15
const WHEEL: Pt = [0.7, FLOOR - WHEEL_R]
/** The lawn: a raised strip of turf from the first rail's end to the second's start. */
const LAWN: [number, number] = [-0.22, 1.64]
const LAND_X = 1.9
const G = 16

const SEAT: Pt = [REEL[0] + RIDE * Math.cos(MEET), 0]
const ARRIVE = arriveAt(SEAT[0])
const SPIN = 0.36
const FIRE = ARRIVE + SPIN
const onReel = (a: number): Pt => [REEL[0] + RIDE * Math.cos(a), REEL[1] + RIDE * Math.sin(a)]
const FROM = onReel(LET_GO)

/** The pace the ball must leave at, along the tangent, to come down on the far rail at LAND_X; found by halving. */
const THROW = (() => {
  const dir: Pt = [-Math.sin(LET_GO), Math.cos(LET_GO)]
  const flight = (v: number) => (-v * dir[1] + Math.sqrt(v * v * dir[1] * dir[1] + 2 * G * (0 - FROM[1]))) / G
  let lo = 2
  let hi = 12
  for (let i = 0; i < 40; i++) {
    const v = (lo + hi) / 2
    if (FROM[0] + v * dir[0] * flight(v) < LAND_X) lo = v
    else hi = v
  }
  const v = (lo + hi) / 2
  const dur = flight(v)
  return { v, dur, arc: (G * dur * dur) / 8, vx: v * dir[0] }
})()
/** Up over the reel on a blade, from rest to the throw's pace. */
const SWEEP = (2 * RIDE * (LET_GO - MEET)) / THROW.v
const sweepAt = (t: number): Pt => onReel(MEET + (LET_GO - MEET) * Math.pow(over(t, FIRE, FIRE + SWEEP), 2))

/** How fast the reel is turning, 0 to 1: up as it catches, flat out through the throw, then running down. */
const rate = (since: number) => (since < -SPIN ? 0 : since < 0 ? Math.pow(over(since, -SPIN, 0), 2) : since < 0.5 ? 1 : 1 - over(since, 0.5, 2))
const OMEGA = 34
/** How far it has turned: the rate integrated. */
function turned(since: number): number {
  if (since < -SPIN) return 0
  if (since < 0) return (OMEGA * SPIN * Math.pow((since + SPIN) / SPIN, 3)) / 3
  const up = (OMEGA * SPIN) / 3
  if (since < 0.5) return up + OMEGA * since
  const s = Math.min(1.5, since - 0.5)
  return up + OMEGA * 0.5 + OMEGA * (s - (s * s) / 3)
}

const LANE: Lane = {
  segs: [
    ...arrive([-0.5, 0], SEAT),
    wait(SEAT, SPIN),
    ...trace(sweepAt, FIRE, FIRE + SWEEP, 8),
    fly(FROM, [LAND_X, 0], THROW.dur, THROW.arc),
    fly([LAND_X, 0], [LAND_X + 0.16, 0], 0.06, 0.02),
    ramp([LAND_X + 0.16, 0], [2.5, 0], 3, ROLL),
  ],
  fire: FIRE,
}

export const mower = definePiece<{ color: string }>({
  name: 'mower',
  weight: 0.9,
  flight: true,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [2, 0],
    ]
    if (!fits(cells, [3, 0])) return null
    return { cells, exit: { at: [3, 0], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const r = rate(since)
    const shake = r > 0.05 ? 0.006 * r * Math.sin(t * 95) : 0

    // The rails either side, the ground, and the lawn between: a raised strip of turf.
    rail(p, k, ink, weight, -0.5, LAWN[0] - 0.02)
    post(p, k, ink, weight, LAWN[0] - 0.03)
    rail(p, k, ink, weight, LAWN[1] + 0.02, 2.5)
    post(p, k, ink, weight, LAWN[1] + 0.03)
    soil(p, k, ink, weight, -0.5, LAWN[0] - 0.03)
    soil(p, k, ink, weight, LAWN[1] + 0.03, 2.5)
    solid(p, ink, weight, bg)
    p.rect(((LAWN[0] + LAWN[1]) / 2) * k, ((FLOOR + 0.5) / 2) * k, (LAWN[1] - LAWN[0]) * k, (0.5 - FLOOR) * k)
    // Long grass in front of the mower, behind the ball; the mown stripe behind the mower: stubble.
    tuft(p, k, ink, weight, -0.11, FLOOR, 0.1, -0.02)
    tuft(p, k, ink, weight, 0.0, FLOOR, 0.12, 0.02)
    tuft(p, k, ink, weight, 0.12, FLOOR, 0.09, 0.03)
    outline(p, ink, weight * 0.8)
    for (let x = 0.96; x < LAWN[1] - 0.03; x += 0.075) p.line(x * k, FLOOR * k, (x + 0.008) * k, (FLOOR - 0.028) * k)

    // The mower, shuddering as the reel runs: handles, grass box, wheel, side plate, roller.
    p.push()
    p.translate(shake * k, 0)
    outline(p, ink, weight * 1.2)
    p.line(WHEEL[0] * k, WHEEL[1] * k, 1.27 * k, -0.4 * k)
    outline(p, ink, weight * 2)
    p.line(1.22 * k, -0.43 * k, 1.32 * k, -0.37 * k)
    solid(p, ink, weight, s.color)
    p.quad(0.92 * k, -0.07 * k, 1.3 * k, -0.13 * k, 1.24 * k, (FLOOR - 0.03) * k, 0.95 * k, (FLOOR - 0.03) * k)
    outline(p, ink, weight)
    p.line(0.92 * k, -0.07 * k, 1.04 * k, -0.2 * k)
    p.line(1.3 * k, -0.13 * k, 1.18 * k, -0.27 * k)
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex((REEL[0] - 0.02) * k, (REEL[1] - 0.05) * k)
    p.vertex((WHEEL[0] + 0.02) * k, (WHEEL[1] - 0.07) * k)
    p.vertex(0.95 * k, (FLOOR - 0.1) * k)
    p.vertex(0.95 * k, (FLOOR - 0.035) * k)
    p.vertex((REEL[0] - 0.02) * k, (REEL[1] + 0.05) * k)
    p.endShape(p.CLOSE)
    solid(p, ink, weight, bg)
    p.circle(0.92 * k, (FLOOR - 0.045) * k, 0.09 * k)
    p.circle(WHEEL[0] * k, WHEEL[1] * k, WHEEL_R * 2 * k)
    outline(p, ink, weight * 0.8)
    for (let i = 0; i < 5; i++) {
      const a = 0.4 + (i * Math.PI * 2) / 5
      p.line((WHEEL[0] + Math.cos(a) * 0.04) * k, (WHEEL[1] + Math.sin(a) * 0.04) * k, (WHEEL[0] + Math.cos(a) * (WHEEL_R - 0.03)) * k, (WHEEL[1] + Math.sin(a) * (WHEEL_R - 0.03)) * k)
    }
    solid(p, ink, weight, s.color)
    p.circle(WHEEL[0] * k, WHEEL[1] * k, 0.09 * k)
    reel(p, k, ink, weight, bg, turned(since), r)
    p.pop()

    // Clippings, thrown back off the top of the reel toward the box while it runs.
    if (r > 0.15) {
      p.push()
      p.stroke(ink)
      p.strokeWeight(weight)
      for (let i = 0; i < 7; i++) {
        const f = (((t * 2.6 + i / 7) % 1) + 1) % 1
        const vx = 1.5 + 0.5 * ((i * 3) % 4)
        const vy = -1.6 - 0.25 * ((i * 5) % 3)
        const d = f * 0.42
        const x = REEL[0] + 0.02 + vx * d
        const y = REEL[1] - REEL_R - 0.03 + vy * d + (G / 2) * d * d
        const a = i * 1.9 + f * 9
        if (y < -0.04 || x < 0.9) p.line((x - Math.cos(a) * 0.02) * k, (y - Math.sin(a) * 0.02) * k, (x + Math.cos(a) * 0.02) * k, (y + Math.sin(a) * 0.02) * k)
      }
      p.pop()
    }
    // The throw: a flick of lines behind the ball where the blade let it go.
    if (since > SWEEP && since < SWEEP + 0.16) {
      const f = over(since, SWEEP, SWEEP + 0.16)
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      for (const a of [LET_GO - 0.75, LET_GO - 0.35, LET_GO + 0.05]) {
        p.line((REEL[0] + Math.cos(a) * (0.25 + 0.06 * f)) * k, (REEL[1] + Math.sin(a) * (0.25 + 0.06 * f)) * k, (REEL[0] + Math.cos(a) * (0.3 + 0.1 * f)) * k, (REEL[1] + Math.sin(a) * (0.3 + 0.1 * f)) * k)
      }
      p.pop()
    }
  },
  over: (p, _s, { k, ink, weight }) => {
    // The long grass in front of the mower stands before the ball: it rolls in through it.
    for (const [x, h, lean] of [
      [-0.16, 0.13, 0.03],
      [-0.05, 0.11, -0.02],
      [0.05, 0.12, 0.03],
    ]) {
      tuft(p, k, ink, weight, x, FLOOR, h, lean)
    }
  },
})

/** The reel, end on: a drum of three raked blades round a hub, turned `a`; at speed the blades blur into arcs. */
function reel(p: p5, k: number, ink: string, weight: number, bg: string, a: number, r: number): void {
  p.push()
  p.translate(REEL[0] * k, REEL[1] * k)
  solid(p, ink, weight, bg)
  p.circle(0, 0, REEL_R * 2 * k)
  p.rotate(a)
  outline(p, ink, weight * 0.8)
  if (r > 0.45) {
    for (let i = 0; i < 2; i++) p.arc(0, 0, REEL_R * 1.1 * k, REEL_R * 1.1 * k, i * Math.PI, i * Math.PI + 1.6)
  } else {
    for (let i = 0; i < 3; i++) {
      p.rotate((Math.PI * 2) / 3)
      p.bezier(0.015 * k, 0, 0.03 * k, -0.04 * k, 0.065 * k, -0.035 * k, (REEL_R - 0.015) * k, 0.01 * k)
    }
  }
  p.noStroke()
  p.fill(ink)
  p.circle(0, 0, 0.04 * k)
  p.pop()
}
