import { outline, solid } from '../../../../../src/core/draw'
import { easeInQuad } from '../../../../../src/core/ease'
import { FLOOR, ROLL, arrive, arriveAt, burst, definePiece, fly, over, rail, ramp, wait, type Lane, type Pt } from '../../parts'
import { bloom, drop, soil, stem } from './green'

/**
 * A lawn sprinkler on a standpipe where the path stops, and a flowerbed
 * beyond it. The ball rolls onto the sprinkler's head; the tap opens; the
 * head spins up, throwing water in every direction, and spins the ball
 * off across the bed onto the path on the far side. The sprinkler keeps
 * going for a while, and the flowers get watered.
 */
const HEAD = 0.1
const LAND: Pt = [1.85, 0]
const ARRIVE = arriveAt(HEAD)
const SPIN = 0.4
const FIRE = ARRIVE + SPIN

/** How fast the head is turning: up from nothing as the tap opens, on for a while, then off. */
const rate = (since: number) => (since < -SPIN ? 0 : since < 0 ? easeInQuad(over(since, -SPIN, 0)) : since < 2 ? 1 : 1 - over(since, 2, 3))
/** How far it has turned: the rate integrated, at OMEGA radians a second flat out. */
const OMEGA = 12
function turned(since: number): number {
  if (since < -SPIN) return 0
  if (since < 0) return (OMEGA * SPIN * Math.pow((since + SPIN) / SPIN, 3)) / 3
  const spun = (OMEGA * SPIN) / 3
  if (since < 2) return spun + OMEGA * since
  const s = Math.min(1, since - 2)
  return spun + OMEGA * 2 + OMEGA * (s - (s * s) / 2)
}

export const sprinkler = definePiece<{ color: string }>({
  name: 'sprinkler',
  weight: 0.9,
  flight: true,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [2, 0],
    ]
    if (!fits(cells, [3, 0])) return null
    const lane: Lane = {
      segs: [
        ...arrive([-0.5, 0], [HEAD, 0]),
        wait([HEAD, 0], SPIN),
        fly([HEAD, 0], LAND, 0.46, 0.26),
        fly(LAND, [LAND[0] + 0.16, 0], 0.06, 0.02),
        ramp([LAND[0] + 0.16, 0], [2.5, 0], 2.6, ROLL),
      ],
      fire: FIRE,
    }
    return { cells, exit: { at: [3, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const r = rate(since)
    const angle = turned(since)

    // The path in, to the standpipe; the bed; the path out.
    rail(p, k, ink, weight, -0.5, HEAD - 0.16)
    rail(p, k, ink, weight, LAND[0] - 0.16, 2.5)
    soil(p, k, ink, weight, -0.5, 2.5)
    outline(p, ink, weight)
    p.line((HEAD - 0.16) * k, FLOOR * k, (HEAD - 0.16) * k, 0.5 * k)
    p.line((LAND[0] - 0.16) * k, FLOOR * k, (LAND[0] - 0.16) * k, 0.5 * k)
    // The flowerbed: a row of blooms on stems, nodding when the water reaches them.
    for (let i = 0; i < 4; i++) {
      const fx = 0.6 + i * 0.32
      const wet = r > 0.3 ? 0.06 * Math.sin(t * 6 + i) : 0
      stem(p, k, ink, weight, fx, 0.5, fx + wet, 0.16 + 0.04 * (i % 2), wet)
      bloom(p, k, ink, weight, s.color, bg, fx + wet, 0.14 + 0.04 * (i % 2), 0.06, 5, 1, i)
    }
    // The hose in along the ground, and the standpipe with its tap.
    outline(p, ink, weight * 1.4)
    p.noFill()
    p.bezier(-0.5 * k, 0.46 * k, -0.2 * k, 0.5 * k, -0.1 * k, 0.3 * k, HEAD * k, 0.3 * k)
    outline(p, ink, weight)
    p.line(HEAD * k, 0.5 * k, HEAD * k, (FLOOR + 0.04) * k)
    p.push()
    p.translate((HEAD + 0.06) * k, 0.36 * k)
    p.rotate(r * 1.4)
    solid(p, ink, weight, s.color)
    p.rect(0.04 * k, 0, 0.1 * k, 0.03 * k)
    p.pop()
    // The head: one disc the ball sits on, seen from a little above, with
    // three nozzles on its face going round as it turns. No spokes: the
    // turning is told by the nozzles and the water.
    solid(p, ink, weight, s.color)
    p.ellipse(HEAD * k, (FLOOR + 0.03) * k, 0.3 * k, 0.07 * k)
    p.noStroke()
    p.fill(ink)
    for (let i = 0; i < 3; i++) {
      const a = angle + (i * Math.PI * 2) / 3
      p.circle((HEAD + Math.cos(a) * 0.1) * k, (FLOOR + 0.03 + Math.sin(a) * 0.02) * k, 0.028 * k)
    }
    // The water: jets off the arms while it runs, arcing out and down onto the bed.
    if (r > 0.02) {
      for (let j = 0; j < 12; j++) {
        const a = angle * 0.7 + (j * Math.PI * 2) / 12
        const reach = 0.3 + 0.9 * r * (0.6 + 0.4 * Math.sin(j * 1.7))
        const f = ((t * 2.5 + j / 12) % 1 + 1) % 1
        const dx = Math.cos(a) * reach * f
        const dy = -0.3 * r * Math.sin(Math.PI * f) * (0.5 + 0.5 * Math.abs(Math.sin(a)))
        if (Math.abs(dx) < 0.1 && f < 0.3) continue
        drop(p, k, s.color, HEAD + dx, FLOOR - 0.02 + dy + 0.4 * f * f, 0.016)
      }
    }
    // The fling.
    if (since > 0 && since < 0.2) {
      const f = over(since, 0, 0.2)
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      burst(p, HEAD * k, -0.02 * k, (0.14 + 0.12 * f) * k, (0.2 + 0.16 * f) * k, 6, 0.4 + f)
      p.pop()
    }
  },
})
