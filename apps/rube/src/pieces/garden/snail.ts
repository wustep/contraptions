import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeOutQuad, lerp } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, over, rail, ramp, roll, wait, type Lane, type Pt, type Seg } from '../../parts'
import { soil, tuft } from './green'

/**
 * A snail on the path. Its tail is a ramp; the ball rolls up it onto the
 * shell and sits there, and the snail — in no hurry at all — carries it
 * most of a cell along the path, leaving a trail, and stops. A beat. Then
 * it shrugs: the shell tips forward, the ball rolls down its front, over
 * the head, and drops onto the path, and goes on at its own pace. The
 * snail lets the shell settle back and puts its eyes out again.
 */
const TAIL = -0.28
const RIDE = -0.36
const SHELL_R = 0.19
const START = 0.0
const END = 0.8
const T_TAIL = (0.5 + TAIL) / ROLL
const CLIMB_V0 = ROLL
const CLIMB_V1 = 0.9
const CLIMB = Math.hypot(START - TAIL, RIDE) / ((CLIMB_V0 + CLIMB_V1) / 2)
const THINK = 0.25
const CRAWL = 1.3
const T_CRAWL = T_TAIL + CLIMB + THINK
const FIRE = T_CRAWL
const T_STOP = T_CRAWL + CRAWL
/** The shrug: how far the shell tips, how long that takes, and how long the ball takes to roll off it. */
const SHRUG = 0.4
const TIP = 0.15
const OFF = 0.32
const T_SHRUG = T_STOP + 0.12
/** The shell's centre, and its base on the foot it tips about. */
const CY = RIDE + R + SHELL_R
const BASE = FLOOR
const LAND: Pt = [1.35, 0]

/** Where the snail is along the path. */
const snailX = (t: number) => (t < T_CRAWL ? START : t < T_STOP ? lerp(START, END, easeInOutSine(over(t, T_CRAWL, T_STOP))) : END)

/** How far the shell has tipped forward, radians: the shrug, held, then let go. */
const tilt = (t: number) =>
  t < T_SHRUG ? 0
  : t < T_SHRUG + TIP ? SHRUG * easeOutQuad(over(t, T_SHRUG, T_SHRUG + TIP))
  : t < T_SHRUG + 0.9 ? SHRUG
  : SHRUG * (1 - easeInOutSine(over(t, T_SHRUG + 0.9, T_SHRUG + 1.8)))

/** The shell's centre with the shell tipped by `a` about its base at (x, BASE). */
const shellCentre = (x: number, a: number): Pt => [x + (BASE - CY) * Math.sin(a), BASE - (BASE - CY) * Math.cos(a)]

/**
 * The ball rolling off the shrugging shell: on top of it as it tips, then
 * down its front, picking up speed, to where it leaves the curve. Sampled
 * against the same tilt the shell is drawn with, so it stays on the shell.
 */
function rollOff(): Seg[] {
  const n = 12
  const dt = OFF / n
  const pt = (tau: number): Pt => {
    const c = shellCentre(END, tilt(T_SHRUG + tau))
    const theta = -Math.PI / 2 + 1.1 * Math.pow(tau / OFF, 2)
    return [c[0] + (SHELL_R + R) * Math.cos(theta), c[1] + (SHELL_R + R) * Math.sin(theta)]
  }
  const segs: Seg[] = []
  for (let i = 0; i < n; i++) segs.push({ from: pt(i * dt), to: pt((i + 1) * dt), dur: dt })
  return segs
}

export const snail = definePiece<{ color: string }>({
  name: 'snail',
  weight: 0.9,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    const off = rollOff()
    const leave = off[off.length - 1].to
    const lane: Lane = {
      segs: [
        roll([-0.5, 0], [TAIL, 0], ROLL),
        ramp([TAIL, 0], [START, RIDE], CLIMB_V0, CLIMB_V1),
        wait([START, RIDE], THINK),
        { from: [START, RIDE], to: [END, RIDE], dur: CRAWL, ease: 'inout' },
        wait([END, RIDE], T_SHRUG - T_STOP),
        ...off,
        { from: leave, to: LAND, dur: Math.hypot(LAND[0] - leave[0], LAND[1] - leave[1]) / 2.0 },
        ramp(LAND, [1.5, 0], 2.0, ROLL),
      ],
      fire: FIRE,
    }
    return { cells, exit: { at: [2, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, ink, bg, weight }) => {
    const x = snailX(t)
    const moving = t > T_CRAWL && t < T_STOP
    const shrug = tilt(t)
    // The body stretches and contracts as it crawls; the eyes go in when the ball lands and come out after the shrug.
    const stretch = moving ? 0.04 * Math.sin(t * 9) : 0
    const eyes = t < T_TAIL + CLIMB ? 1 : t < T_SHRUG + 0.6 ? 0.3 : Math.min(1, 0.3 + over(t, T_SHRUG + 0.6, T_SHRUG + 1.2))
    const riding = t > T_TAIL + CLIMB && t < T_SHRUG

    rail(p, k, ink, weight, -0.5, 1.5)
    soil(p, k, ink, weight, -0.5, 1.5)
    tuft(p, k, ink, weight, -0.36, FLOOR, 0.1, 0.02)
    // The trail: a slick along the rail from where it started.
    if (x > START + 0.02) {
      p.push()
      const slick = p.color(s.color)
      slick.setAlpha(110)
      p.stroke(slick)
      p.strokeWeight(weight * 1.6)
      p.line((START - 0.3) * k, (FLOOR - 0.01) * k, (x - 0.3) * k, (FLOOR - 0.01) * k)
      p.pop()
    }
    // The foot: a long body from the tail's tip to the head, along the rail; it hunches with the shrug.
    const tail = x + TAIL
    const head = x + 0.3 + stretch
    const hunch = 0.03 * (shrug / SHRUG)
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(tail * k, FLOOR * k)
    p.bezierVertex((x - 0.1) * k, (FLOOR - 0.04 - hunch) * k, (x + 0.1) * k, (FLOOR - 0.06 - hunch) * k, (head - 0.06) * k, (FLOOR - 0.1) * k)
    p.bezierVertex((head + 0.04) * k, (FLOOR - 0.12) * k, (head + 0.06) * k, (FLOOR - 0.02) * k, head * k, FLOOR * k)
    p.endShape(p.CLOSE)
    // The shell on the foot, tipping forward about its base for the shrug: the spiral, and the tail as a ramp up its back.
    p.push()
    p.translate(x * k, BASE * k)
    p.rotate(shrug)
    p.translate(-x * k, -BASE * k)
    outline(p, ink, weight)
    p.line(tail * k, FLOOR * k, x * k, (RIDE + R) * k)
    solid(p, ink, weight, s.color)
    p.circle(x * k, CY * k, SHELL_R * 2 * k)
    outline(p, ink, weight)
    p.noFill()
    p.beginShape()
    for (let i = 0; i <= 30; i++) {
      const f = i / 30
      const a = f * Math.PI * 3.2
      const r = SHELL_R * 0.92 * (1 - f * 0.85)
      p.vertex((x + Math.cos(a) * r) * k, (CY + Math.sin(a) * r) * k)
    }
    p.endShape()
    p.pop()
    // The eyes on their stalks, out or in.
    for (const dx of [0.02, 0.07]) {
      const ex = head - 0.06 + dx
      const ey = FLOOR - 0.1 - 0.16 * eyes
      outline(p, ink, weight)
      p.line((head - 0.05 + dx * 0.5) * k, (FLOOR - 0.1) * k, ex * k, ey * k)
      solid(p, ink, weight, bg)
      p.circle(ex * k, ey * k, 0.04 * k)
      p.fill(ink)
      p.noStroke()
      p.circle((ex + 0.008) * k, ey * k, 0.016 * k)
    }
    // A wobble line under the ball's seat while it rides, so it reads as carried.
    if (riding) {
      outline(p, ink, weight * 0.7)
      p.line((x - 0.06) * k, (RIDE + R + 0.01) * k, (x + 0.06) * k, (RIDE + R + 0.01) * k)
    }
  },
})
