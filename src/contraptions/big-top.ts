import { defineContraption } from '../core/define'
import { clipBox, outline, solid, teeth } from '../core/draw'
import { easeInOutCubic, easeOutCubic, lerp, mod, seg } from '../core/ease'
import { P, bell, block, fade, ground, knob, knock, performer, rings, route, second, shiver, since, stroke, type Leg } from './circus'

/**
 * Two performers chase each other round one closed track: along the top
 * run, where one shoulders the gate open and treads on the pedal that clicks
 * the counter; down the chute, where they spin the paddle wheel; along the
 * bottom run, where they knock the clapper and ring the bell; and up the
 * lift, which sets them going again — every stunt twice a loop, in order,
 * forever.
 */
const Y_TOP = -0.7
const Y_BOT = 1
const BALL_TOP = Y_TOP - P / 2
const BALL_BOT = Y_BOT - P / 2
const FALL_X = -0.76
const TUBE = 0.13
const LIFT_X = 0.79
const LIFT_W = 0.13
const ARC_C: [number, number] = [FALL_X + 0.15, BALL_BOT - 0.15]
const GATE_X = 0.3
const PEDAL_X = -0.1
const WHEEL: [number, number] = [PEDAL_X, -0.28]
const PIN: [number, number] = [-0.4, 0.15]
const PIN_ARM = 0.27
const BELL_X = 0.18
const BELL_TOP = 0.36

const track = (() => {
  const legs: Leg[] = [
    { from: [LIFT_X, BALL_TOP], to: [FALL_X, BALL_TOP], v: 8 },
    { from: [FALL_X, BALL_TOP], to: [FALL_X, ARC_C[1]], v: 12 },
  ]
  const n = 4
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI - ((Math.PI / 2) * i) / n
    const a1 = Math.PI - ((Math.PI / 2) * (i + 1)) / n
    legs.push({ from: [ARC_C[0] + 0.15 * Math.cos(a0), ARC_C[1] + 0.15 * Math.sin(a0)], to: [ARC_C[0] + 0.15 * Math.cos(a1), ARC_C[1] + 0.15 * Math.sin(a1)], v: 10 })
  }
  legs.push({ from: [ARC_C[0], BALL_BOT], to: [LIFT_X, BALL_BOT], v: 8 })
  legs.push({ from: [LIFT_X, BALL_BOT], to: [LIFT_X, BALL_TOP], v: 5 })
  return route(legs)
})()
const LIFT_LEG = track.legs.length - 1
const LIFT_START = track.starts[LIFT_LEG]
const LIFT_TIME = 1 - LIFT_START

/** When the first performer reaches each stunt; the second is half a lap behind. */
const AT_GATE = track.frac(0, (LIFT_X - GATE_X) / (LIFT_X - FALL_X))
const AT_PEDAL = track.frac(0, (LIFT_X - PEDAL_X) / (LIFT_X - FALL_X))
const AT_PIN = track.frac(1, (PIN[1] - BALL_TOP) / (ARC_C[1] - BALL_TOP))
const AT_BELL = track.frac(LIFT_LEG - 1, (BELL_X - ARC_C[0]) / (LIFT_X - ARC_C[0]))

/** A stunt's response to both passes, for envelopes that go out and back. */
const twice = (u: number, at: number, f: (u: number, at: number) => number) => Math.max(f(u, at), f(u, mod(at + 0.5, 1)))

export const bigTop = defineContraption({
  name: 'big-top',
  label: 'Big Top',
  tags: ['loop'],
  role: 'source',
  span: [2, 2],
  rotations: [0],
  // The bell.
  fireAt: AT_BELL,
  setup: ({ color, rng, theme }) => ({ color, alt: second(rng, theme, color) }),
  draw: (p, s, { size: k, w, h, u, ink, weight }) => {
    const gate = 1.05 * twice(u, AT_GATE, (a, b) => knock(a, b, 0.04, 0.3))
    const press = 0.05 * twice(u, AT_PEDAL, (a, b) => knock(a, b, 0.03, 0.14))
    const click = (Math.PI / 4) * (easeInOutCubic(seg(since(u, AT_PEDAL), 0.01, 0.12)) + easeInOutCubic(seg(since(u, mod(AT_PEDAL + 0.5, 1)), 0.01, 0.12)))
    const spin = -Math.PI * 2 * (easeOutCubic(seg(since(u, AT_PIN), 0, 0.3)) + easeOutCubic(seg(since(u, mod(AT_PIN + 0.5, 1)), 0, 0.3)))
    const clap = -0.6 * twice(u, AT_BELL, (a, b) => knock(a, b, 0.04, 0.24))
    const ring = twice(u, AT_BELL, (a, b) => fade(a, b, 0.2))
    const rock = 0.1 * twice(u, AT_BELL, (a, b) => shiver(a, b, 0.2, 5))
    // The bucket: up with a performer, then straight back down for the next.
    const q = mod(u - LIFT_START, 0.5)
    const bucket =
      q < LIFT_TIME ? lerp(BALL_BOT, BALL_TOP, q / LIFT_TIME)
      : q < LIFT_TIME + 0.03 ? BALL_TOP
      : lerp(BALL_TOP, BALL_BOT, easeInOutCubic(seg(q, LIFT_TIME + 0.03, 0.48)))

    clipBox(p, w, h, () => {
      outline(p, ink, weight)
      ground(p, k, 2, Y_BOT)
      // The top run, ending at the chute.
      stroke(p, k, LIFT_X - LIFT_W, Y_TOP, FALL_X + TUBE, Y_TOP)
      stroke(p, k, FALL_X + TUBE, Y_TOP, FALL_X + TUBE, ARC_C[1] - 0.16)
      stroke(p, k, FALL_X - TUBE, Y_TOP - 0.3, FALL_X - TUBE, ARC_C[1])
      p.arc((FALL_X + TUBE) * k, ARC_C[1] * k, TUBE * 4 * k, TUBE * 4 * k, Math.PI / 2, Math.PI)
      // The lift shaft, open at the bottom to take a performer and at the top to let one go.
      stroke(p, k, LIFT_X - LIFT_W, Y_TOP, LIFT_X - LIFT_W, 0.62)
      stroke(p, k, LIFT_X + LIFT_W, -0.96, LIFT_X + LIFT_W, Y_BOT)
      stroke(p, k, LIFT_X - LIFT_W, -0.96, LIFT_X - LIFT_W, -0.86)
      stroke(p, k, LIFT_X - LIFT_W, -0.96, LIFT_X + LIFT_W, -0.96)
      knob(p, k, ink, weight, s.color, LIFT_X, -0.9, 0.12)
      stroke(p, k, LIFT_X, -0.9, LIFT_X, bucket - P / 2 - 0.06)

      // The counter under the top run: a pedal through the floor, a wheel that clicks.
      stroke(p, k, PEDAL_X, WHEEL[1], PEDAL_X, Y_TOP - 0.03 + press)
      block(p, k, ink, weight, s.color, PEDAL_X, Y_TOP - 0.03 + press, 0.14, 0.05)
      p.push()
      p.translate(WHEEL[0] * k, WHEEL[1] * k)
      p.rotate(click)
      solid(p, ink, weight, s.color)
      p.circle(0, 0, 0.34 * k)
      outline(p, ink, weight)
      teeth(p, 0.17 * k, 8, 0.05 * k)
      for (let i = 0; i < 8; i++) {
        p.line(0, 0, 0.15 * k, 0)
        p.rotate(Math.PI / 4)
      }
      p.pop()
      knob(p, k, ink, weight, s.color, WHEEL[0], WHEEL[1], 0.08)

      // The paddle wheel beside the chute, one blade always in it.
      p.push()
      p.translate(PIN[0] * k, PIN[1] * k)
      p.rotate(spin)
      outline(p, ink, weight)
      p.circle(0, 0, 0.24 * k)
      for (let i = 0; i < 4; i++) {
        solid(p, ink, weight, s.color)
        p.rect((-PIN_ARM / 2) * k, 0, PIN_ARM * k, 0.07 * k)
        p.rotate(Math.PI / 2)
      }
      p.pop()
      knob(p, k, ink, weight, s.color, PIN[0], PIN[1], 0.08)
      stroke(p, k, PIN[0], PIN[1] + 0.12, PIN[0], Y_BOT - 0.3)
      stroke(p, k, PIN[0] - 0.12, Y_BOT - 0.3, PIN[0] + 0.12, Y_BOT - 0.3)
      stroke(p, k, PIN[0], Y_BOT - 0.3, PIN[0], Y_BOT)

      // The bell on its gallows over the bottom run, clapper down in the lane.
      stroke(p, k, 0.45, Y_BOT, 0.45, BELL_TOP)
      stroke(p, k, 0.45, BELL_TOP, BELL_X, BELL_TOP)
      rings(p, k, s.color, weight, BELL_X, BELL_TOP + 0.15, 0.2, ring, -Math.PI / 2, 2)
      bell(p, k, ink, weight, s.color, BELL_X, BELL_TOP, 0.32, 0.22, rock)
      p.push()
      p.translate(BELL_X * k, (BELL_TOP + 0.14) * k)
      p.rotate(clap)
      outline(p, ink, weight)
      p.line(0, 0, 0, (BALL_BOT - P / 2 - 0.04 - BELL_TOP - 0.14) * k)
      knob(p, k, ink, weight, s.color, 0, BALL_BOT - P / 2 - 0.04 - BELL_TOP - 0.14, 0.08)
      p.pop()

      // The two performers, half a lap apart, and the bucket under whoever is riding.
      block(p, k, ink, weight, s.color, LIFT_X, bucket + P / 2 + 0.03, 0.24, 0.06)
      outline(p, ink, weight)
      stroke(p, k, LIFT_X - 0.12, bucket + P / 2 + 0.03, LIFT_X - 0.12, bucket - 0.02)
      stroke(p, k, LIFT_X + 0.12, bucket + P / 2 + 0.03, LIFT_X + 0.12, bucket - 0.02)
      for (const [j, fill] of [s.color, s.alt].entries()) {
        const [x, y] = track.at(mod(u + j * 0.5, 1))
        performer(p, k, ink, weight, fill, x, y)
      }

      // The gate flap hangs across the top run, in front of whoever is going through.
      stroke(p, k, GATE_X - 0.08, -0.97, GATE_X + 0.08, -0.97)
      p.push()
      p.translate(GATE_X * k, -0.97 * k)
      p.rotate(gate)
      block(p, k, ink, weight, s.color, 0, 0.125, 0.07, 0.25)
      p.pop()
      knob(p, k, ink, weight, s.color, GATE_X, -0.97, 0.06)
    })
  },
})
