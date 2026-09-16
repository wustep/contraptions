import { outline, solid } from '../../../../../src/core/draw'
import { easeOutCubic } from '../../../../../src/core/ease'
import { FLOOR, ROLL, burst, definePiece, laneReach, over, rail, roll, type BallChange, type Lane } from '../../parts'
import { leaf } from './green'

/**
 * A sunflower taller than the path, leaning over it. The ball rolls over
 * a root that crosses the rail; the stem jolts, the heavy head nods down
 * over the ball and dusts it with pollen, and the ball rolls on a new
 * colour — for good. The head swings back up and sways for a while, and
 * pollen lies on the path after.
 */
const ROOT = -0.24
const HEAD = { x: 0.08, y: -0.5 }
const NOD = 0.35

export const sunflower = definePiece<{ color: string; pollen: string }>({
  name: 'sunflower',
  weight: 0.9,
  dynamic: true,
  place: ({ rng, color, fits, theme, ball }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    // The pollen is never the colour the ball arrives in; with nothing else to offer, the sunflower stays out of the map.
    const pool = theme.colors.filter((c) => c !== ball.color)
    if (!pool.length) return null
    const pollen = rng.pick(pool)
    const lane: Lane = { segs: [roll([-0.5, 0], [0.5, 0], ROLL)], fire: 0 }
    lane.fire = laneReach(lane, HEAD.x)
    const changes: BallChange[] = [{ at: lane.fire, color: pollen }]
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane, state: { color, pollen }, changes }
  },
  draw: (p, s, { k, t, since, ink, weight }) => {
    // The jolt as the ball crosses the root, and the nod that follows it down.
    const rootAt = (0.5 + ROOT) / ROLL
    const nod =
      t < rootAt ? 0
      : since < 0 ? NOD * easeOutCubic(over(t, rootAt, t - since))
      : since < 0.15 ? NOD
      : NOD * Math.cos((since - 0.15) * 5) * Math.exp(-(since - 0.15) * 1.4)
    const sway = 0.03 * Math.sin(t * 1.3)

    rail(p, k, ink, weight, -0.5, 0.5)
    // The root across the path, and the ground behind.
    outline(p, ink, weight)
    p.line(-0.5 * k, 0.5 * k, 0.5 * k, 0.5 * k)
    solid(p, ink, weight, ink)
    p.ellipse(ROOT * k, (FLOOR + 0.01) * k, 0.1 * k, 0.04 * k)
    // The stem: from the ground behind the rail up and over, bowing with the nod.
    p.push()
    p.translate(-0.28 * k, 0.5 * k)
    p.rotate(nod * 0.6 + sway)
    outline(p, ink, weight * 1.4)
    p.noFill()
    p.bezier(0, 0, 0.02 * k, -0.5 * k, (HEAD.x + 0.22) * k, (HEAD.y - 0.4) * k, (HEAD.x + 0.28) * k, (HEAD.y - 0.5 + 0.05) * k)
    leaf(p, k, ink, weight, s.color, 0.01, -0.34, 0.2, -0.9)
    leaf(p, k, ink, weight, s.color, 0.03, -0.5, 0.18, Math.PI + 0.9)
    // The head: petals round a heart of pollen, hung from the stem's end and nodding further.
    p.push()
    p.translate((HEAD.x + 0.28) * k, (HEAD.y - 0.45) * k)
    p.rotate(nod * 1.2)
    p.translate(0, 0.12 * k)
    solid(p, ink, weight, s.color)
    for (let i = 0; i < 10; i++) {
      p.push()
      p.rotate((i / 10) * Math.PI * 2)
      p.ellipse(0.13 * k, 0, 0.14 * k, 0.06 * k)
      p.pop()
    }
    solid(p, ink, weight, s.pollen)
    p.circle(0, 0, 0.18 * k)
    p.fill(ink)
    p.noStroke()
    for (let i = 0; i < 6; i++) p.circle(Math.cos(i * 1.05) * 0.04 * k, Math.sin(i * 1.05) * 0.04 * k, 0.015 * k)
    p.pop()
    p.pop()
    // Pollen falling from the head onto the ball while it nods.
    if (nod > 0.2 && since < 0.5) {
      p.push()
      p.noStroke()
      p.fill(s.pollen)
      for (let i = 0; i < 6; i++) {
        const f = ((t * 4 + i / 6) % 1 + 1) % 1
        p.circle((HEAD.x - 0.08 + i * 0.035) * k, (HEAD.y + 0.2 + (FLOOR - HEAD.y - 0.2) * f) * k, 0.02 * k)
      }
      p.pop()
    }
    // The dusting: a puff of the new colour off the ball, and pollen on the path after.
    if (since > -0.02 && since < 0.3) {
      const f = over(since, 0, 0.3)
      p.push()
      p.stroke(s.pollen)
      p.strokeWeight(weight)
      burst(p, HEAD.x * k, 0, (0.16 + 0.14 * f) * k, (0.2 + 0.2 * f) * k, 6, 0.5 + f)
      p.pop()
    }
    if (since > 0.1) {
      const g = over(since, 0.1, 1.2)
      p.push()
      p.noStroke()
      p.fill(s.pollen)
      for (let i = 0; i < 5; i++) p.circle((HEAD.x - 0.1 + i * 0.05 * (0.5 + g)) * k, (FLOOR + 0.03) * k, 0.02 * k)
      p.pop()
    }
  },
})
