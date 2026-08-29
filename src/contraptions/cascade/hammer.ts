import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeInOutSine, easeInQuad, lerp, seg } from '../../core/ease'
import { FLOOR, floor, since, type Beat } from './parts'

/**
 * A drop hammer: the winch hauls the head up its guides for most of the loop,
 * the catch lets go, and the blow on the anvil is the pulse that sets the run
 * off.
 */
const FIRE = 0.86
const HEAD_W = 0.36
const HEAD_H = 0.24
/** The head rests on the anvil, whose top is the line the token leaves along. */
const LOW = FLOOR - HEAD_H / 2
const HIGH = -0.5 + HEAD_H / 2 + 0.02
const GUIDE = 0.23

export const hammer = defineContraption<Beat>({
  name: 'hammer',
  label: 'Hammer',
  tags: ['strike'],
  role: 'source',
  rotations: [0],
  mirror: false,
  fireAt: FIRE,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const t = since(u, FIRE)
    let y: number
    if (t < 0.05) y = LOW - 0.03 * Math.sin((t / 0.05) * Math.PI)
    else if (t < 0.14) y = LOW
    else if (t < 0.84) y = lerp(LOW, HIGH, easeInOutSine(seg(t, 0.14, 0.84)))
    else if (t < 0.93) y = HIGH
    else y = lerp(HIGH, LOW, easeInQuad(seg(t, 0.93, 1)))

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

    // Sparks off the anvil's corners at the blow.
    if (t < 0.08) {
      const f = t / 0.08
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
