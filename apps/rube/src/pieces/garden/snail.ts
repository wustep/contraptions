import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, lerp } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, fly, over, rail, ramp, roll, wait, type Lane, type Pt } from '../../parts'
import { soil, tuft } from './green'

/**
 * A snail on the path. Its tail is a ramp; the ball rolls up it onto the
 * shell and sits there, and the snail — in no hurry at all — carries it
 * a cell along the path, leaving a trail, and stops. The ball rolls off
 * over its head onto the path and goes on at its own pace. The snail
 * stays where it stopped and puts its eyes back out.
 */
const TAIL = -0.28
const RIDE = -0.36
const SHELL_R = 0.19
const START = 0.0
const END = 0.95
const T_TAIL = (0.5 + TAIL) / ROLL
const CLIMB_V0 = ROLL
const CLIMB_V1 = 0.9
const CLIMB = Math.hypot(START - TAIL, RIDE) / ((CLIMB_V0 + CLIMB_V1) / 2)
const THINK = 0.25
const CRAWL = 1.3
const T_CRAWL = T_TAIL + CLIMB + THINK
const FIRE = T_CRAWL
const T_STOP = T_CRAWL + CRAWL

/** Where the snail is along the path. */
const snailX = (t: number) => (t < T_CRAWL ? START : t < T_STOP ? lerp(START, END, easeInOutSine(over(t, T_CRAWL, T_STOP))) : END)

export const snail = definePiece<{ color: string }>({
  name: 'snail',
  weight: 0.9,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    const lane: Lane = {
      segs: [
        roll([-0.5, 0], [TAIL, 0], ROLL),
        ramp([TAIL, 0], [START, RIDE], CLIMB_V0, CLIMB_V1),
        wait([START, RIDE], THINK),
        { from: [START, RIDE], to: [END, RIDE], dur: CRAWL, ease: 'inout' },
        wait([END, RIDE], 0.12),
        fly([END, RIDE], [END + 0.3, 0], 0.24, 0.04),
        ramp([END + 0.3, 0], [1.5, 0], 2.2, ROLL),
      ],
      fire: FIRE,
    }
    return { cells, exit: { at: [2, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, ink, bg, weight }) => {
    const x = snailX(t)
    const moving = t > T_CRAWL && t < T_STOP
    // The body stretches and contracts as it crawls; the eyes go in when the ball lands and come out after.
    const stretch = moving ? 0.04 * Math.sin(t * 9) : 0
    const eyes = t < T_TAIL + CLIMB ? 1 : t < T_STOP + 0.4 ? 0.3 : Math.min(1, 0.3 + over(t, T_STOP + 0.4, T_STOP + 1.0))
    const riding = t > T_TAIL + CLIMB && t < T_STOP + 0.12

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
    // The foot: a long body from the tail's tip to the head, along the rail.
    const tail = x + TAIL
    const head = x + 0.3 + stretch
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(tail * k, FLOOR * k)
    p.bezierVertex((x - 0.1) * k, (FLOOR - 0.04) * k, (x + 0.1) * k, (FLOOR - 0.06) * k, (head - 0.06) * k, (FLOOR - 0.1) * k)
    p.bezierVertex((head + 0.04) * k, (FLOOR - 0.12) * k, (head + 0.06) * k, (FLOOR - 0.02) * k, head * k, FLOOR * k)
    p.endShape(p.CLOSE)
    // The tail as a ramp: a plank of shell up to the ride line, so the ball has a way up.
    outline(p, ink, weight)
    p.line(tail * k, FLOOR * k, x * k, (RIDE + R) * k)
    // The shell: a spiral, standing on the foot, its top the ball's seat.
    const cy = RIDE + R + SHELL_R
    solid(p, ink, weight, s.color)
    p.circle(x * k, cy * k, SHELL_R * 2 * k)
    outline(p, ink, weight)
    p.noFill()
    p.beginShape()
    for (let i = 0; i <= 30; i++) {
      const f = i / 30
      const a = f * Math.PI * 3.2
      const r = SHELL_R * 0.92 * (1 - f * 0.85)
      p.vertex((x + Math.cos(a) * r) * k, (cy + Math.sin(a) * r) * k)
    }
    p.endShape()
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
