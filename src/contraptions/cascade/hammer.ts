import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeInOutSine, easeInQuad, lerp, seg } from '../../core/ease'
import { hold, roll, type Lane, type LaneCtx } from '../../core/lane'
import { FLOOR, SPEED, TOKEN, floor, since, type Beat } from './parts'

/**
 * A drop hammer over the line: the ball rolls onto the anvil and waits, the
 * winch lets the head go, and the blow drives it out of the cell twice as
 * fast as it came. The head follows it down onto the anvil, which is where
 * the sparks come from.
 *
 * The wait is what makes the blow land on something. It is timed to start
 * only once the head is clear overhead, so nothing is ever under the head on
 * its way up.
 */
const FIRE = 0.86
const HEAD_W = 0.36
const HEAD_H = 0.24
/** The head at rest on the anvil, cocked at the top, and against the ball. */
const LOW = FLOOR - HEAD_H / 2
const HIGH = -0.5 + HEAD_H / 2 + 0.08
const CONTACT = -TOKEN / 2 - HEAD_H / 2
const GUIDE = 0.23
/** How long the ball sits on the anvil, and how much faster it leaves. */
const WAIT = 0.2
const KICK = 1.6

export const hammer = defineContraption<Beat>({
  name: 'hammer',
  label: 'Hammer',
  tags: ['strike'],
  role: 'source',
  rotations: [0],
  mirror: false,
  fireAt: FIRE,
  lane: (ctx: LaneCtx): Lane => {
    const y = ctx.floorY
    // Fed from the west the ball waits on the anvil; asked to be the feeder it
    // waits clear of the head instead, which cannot be held up for a whole loop.
    if (ctx.in === null) {
      return { pieces: [hold([-0.34, y], ctx.emit), roll([-0.34, y], [0.5, y], SPEED)], fire: ctx.emit }
    }
    return {
      pieces: [roll([-0.5, y], [0, y], SPEED), hold([0, y], WAIT), roll([0, y], [0.5, y], SPEED * KICK)],
      // The head lets go at the end of the wait, not at the arrival.
      fire: 0.5 / SPEED + WAIT,
    }
  },
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const t = since(u, FIRE)
    let y: number
    if (t < 0.05) y = lerp(CONTACT, LOW, easeInQuad(seg(t, 0, 0.05)))
    else if (t < 0.1) y = LOW - 0.03 * Math.sin(seg(t, 0.05, 0.1) * Math.PI)
    else if (t < 0.18) y = LOW
    else if (t < 0.84) y = lerp(LOW, HIGH, easeInOutSine(seg(t, 0.18, 0.84)))
    else if (t < 0.93) y = HIGH
    else y = lerp(HIGH, CONTACT, easeInQuad(seg(t, 0.93, 1)))

    floor(p, k, ink, weight, s)
    outline(p, ink, weight)
    // The frame: two guides the head rides between, a crossbar, and the
    // pulley the cable runs over.
    for (const x of [-GUIDE, GUIDE]) p.line(x * k, -0.5 * k, x * k, (FLOOR + 0.06) * k)
    p.line(-GUIDE * k, -0.5 * k, GUIDE * k, -0.5 * k)
    p.line(0, -0.46 * k, 0, (y - HEAD_H / 2) * k)
    p.circle(0, -0.46 * k, 0.09 * k)

    // The anvil: the one ink-filled mass in the set, on a foot.
    p.fill(ink)
    p.rect(0, (FLOOR + 0.08) * k, 0.44 * k, 0.16 * k)
    p.rect(0, (FLOOR + 0.16 + 0.105) * k, 0.2 * k, 0.21 * k)

    solid(p, ink, weight, s.color)
    p.rect(0, y * k, HEAD_W * k, HEAD_H * k)

    // Sparks off the anvil's corners as the head reaches it.
    if (t > 0.05 && t < 0.13) {
      const f = seg(t, 0.05, 0.13)
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      for (const side of [-1, 1]) {
        for (const a of [0.15, 0.65, 1.15]) {
          const dx = side * Math.cos(a)
          const dy = -Math.sin(a)
          const r0 = 0.05 + 0.18 * f
          const r1 = r0 + 0.1 * (1 - f)
          p.line((side * 0.22 + dx * r0) * k, (FLOOR + dy * r0) * k, (side * 0.22 + dx * r1) * k, (FLOOR + dy * r1) * k)
        }
      }
      p.pop()
    }
  },
})
