import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeInOutSine, easeInQuad, easeOutCubic, lerp, seg } from '../../core/ease'
import { fade, ground, knob, rings, shiver, stroke } from './circus'

/**
 * Two cymbals on arms lean slowly apart for the whole loop, and when the
 * signal arrives they clash together and shudder, and the sound goes up.
 */
const PIVOT_X = 0.28
const ARM = 0.5
/** The plates: wide axis when the arm is vertical. */
const PLATE = 0.32
/** Half the gap between the plate centres at the clash. */
const MEET = 0.04
/** The lean that carries each head in to the meeting point over the centre. */
const CLASH = Math.asin((PIVOT_X - MEET) / ARM)
const RECOIL = CLASH * 0.68
/** Leaning apart, the plate's far edge stops on the wall: barely past vertical. */
const COCKED = -0.08

export const cymbals = defineContraption({
  name: 'cymbals',
  label: 'Cymbals',
  tags: ['band'],
  role: 'sink',
  rotations: [0],
  fireAt: 0,
  weight: 0.8,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const base =
      u < 0.04 ? lerp(CLASH, RECOIL, easeOutCubic(seg(u, 0, 0.04)))
      : u < 0.9 ? lerp(RECOIL, COCKED, easeInOutSine(seg(u, 0.04, 0.9)))
      : lerp(COCKED, CLASH, easeInQuad(seg(u, 0.9, 1)))
    const angle = base + 0.04 * shiver(u, 0, 0.14, 6)
    const meetY = 0.5 - ARM * Math.cos(CLASH)

    outline(p, ink, weight)
    ground(p, k, 1)
    rings(p, k, s.color, weight, 0, meetY - 0.05, 0.18, fade(u, 0, 0.22), -Math.PI / 2, 2)

    for (const side of [-1, 1]) {
      const px = side * PIVOT_X
      // Positive angle leans the arm in toward the centre, where they meet.
      const hx = px - side * ARM * Math.sin(angle)
      const hy = 0.5 - ARM * Math.cos(angle)
      outline(p, ink, weight)
      stroke(p, k, px, 0.5, hx, hy)
      p.push()
      p.translate(hx * k, hy * k)
      p.rotate(-side * angle)
      solid(p, ink, weight, s.color)
      p.ellipse(0, 0, PLATE * k, 0.11 * k)
      p.pop()
      knob(p, k, ink, weight, s.color, hx, hy, 0.07)
      knob(p, k, ink, weight, s.color, px, 0.5, 0.06)
    }
  },
})
