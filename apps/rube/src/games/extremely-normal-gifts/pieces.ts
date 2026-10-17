import { outline, solid } from '../../../../../src/core/draw'
import { arrive, arriveAt, definePiece, over, rail, ramp, ROLL, wait } from '../../parts'

/** A real timed piece, kept local to the game and never registered on a shelf. */
export const affectionStamp = definePiece<{ color: string }>({
  name: 'affection-stamp',
  weight: 0,
  place: ({ color }) => ({
    cells: [[0, 0]],
    exit: { at: [1, 0], dir: 1 },
    state: { color },
    lane: {
      segs: [...arrive([-0.5, 0], [0, 0]), wait([0, 0], 0.85), ramp([0, 0], [0.5, 0], 0, ROLL)],
      fire: arriveAt(0) + 0.38,
    },
  }),
  draw: (p, s, { k, since, ink, bg, weight }) => {
    rail(p, k, ink, weight, -0.5, 0.5)
    solid(p, ink, weight, s.color)
    p.rect(0, 0.32 * k, 0.7 * k, 0.3 * k, 0.04 * k)
    outline(p, ink, weight)
    p.line(-0.35 * k, 0.18 * k, -0.35 * k, -0.58 * k)
    p.line(-0.35 * k, -0.58 * k, 0.25 * k, -0.58 * k)
    const press = over(since, -0.18, 0) * (1 - over(since, 0.12, 0.4))
    const y = -0.41 + press * 0.27
    p.line(0, -0.58 * k, 0, y * k)
    solid(p, ink, weight, s.color)
    p.rect(0, y * k, 0.36 * k, 0.1 * k, 0.02 * k)
    solid(p, ink, weight * 0.6, bg)
    p.rect(0, 0.32 * k, 0.48 * k, 0.16 * k, 0.01 * k)
    p.noStroke()
    p.fill(ink)
    p.textAlign(p.CENTER, p.CENTER)
    p.textSize(k * 0.075)
    p.textFont('monospace')
    p.text(since > 0 ? 'NICE ✓' : 'PENDING', 0, 0.32 * k)
    if (since > 0 && since < 0.24) {
      outline(p, ink, weight * 0.7)
      for (const side of [-1, 1]) p.line(side * 0.2 * k, -0.05 * k, side * 0.29 * k, -0.1 * k)
    }
  },
})
