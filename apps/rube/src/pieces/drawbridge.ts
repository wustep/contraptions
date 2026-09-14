import { outline, solid } from '../../../../src/core/draw'
import { easeInOutSine, easeInQuad } from '../../../../src/core/ease'
import { FLOOR, ROLL, arrive, arriveAt, burst, definePiece, over, rail, roll, wait, type Lane, type Pt } from '../parts'

/**
 * A drawbridge. The bridge stands up against its tower over a gap in the
 * rail. The ball rolls onto a plate before the gap; the plate sinks and
 * trips the pawl on the tower's winch; the chain pays out and the bridge
 * falls, lands on the far post with a thump, and the ball rolls across.
 * Later the winch hauls it back up.
 */
const HINGE: Pt = [0.6, FLOOR]
const SPAN = 0.85
const UP = -1.45
const TOWER_X = 0.56
const TOWER_TOP = -1.25
const ARRIVE = arriveAt(0)
const TRIP = 0.3
const FALL = 0.45
const FIRE = ARRIVE + TRIP
const RAISE = 3.2

const angleAt = (since: number) =>
  since < 0 ? UP : since < FALL ? UP * (1 - easeInQuad(over(since, 0, FALL))) : since < RAISE ? 0 : UP * easeInOutSine(over(since, RAISE, RAISE + 1.6))

export const drawbridge = definePiece<{ color: string }>({
  name: 'drawbridge',
  weight: 0.9,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [1, -1],
    ]
    if (!fits(cells, [2, 0])) return null
    const lane: Lane = {
      segs: [...arrive([-0.5, 0], [0, 0]), wait([0, 0], TRIP + FALL + 0.15), roll([0, 0], [1.5, 0], ROLL)],
      fire: FIRE,
    }
    return { cells, exit: { at: [2, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const angle = angleAt(since)
    const pressed = t < ARRIVE ? 0 : since < RAISE ? Math.min(1, over(t, ARRIVE, ARRIVE + 0.08)) : 1 - over(since, RAISE, RAISE + 0.5)
    const tipX = HINGE[0] + Math.cos(angle) * SPAN
    const tipY = HINGE[1] + Math.sin(angle) * SPAN

    // The rail up to the plate, the plate, the rail to the hinge, and the far landing.
    rail(p, k, ink, weight, -0.5, -0.14)
    rail(p, k, ink, weight, 0.14, HINGE[0])
    rail(p, k, ink, weight, 1.45, 1.5)
    solid(p, ink, weight, s.color)
    p.rect(0, (FLOOR + 0.01 + pressed * 0.025) * k, 0.28 * k, 0.05 * k)
    // The gap: a post each side, down to the ground.
    outline(p, ink, weight)
    p.line(1.46 * k, FLOOR * k, 1.46 * k, 0.5 * k)
    p.line(1.4 * k, 0.5 * k, 1.5 * k, 0.5 * k)
    // The tower: a post behind the hinge up past the bridge, an arm, and the winch.
    p.line(TOWER_X * k, 0.5 * k, TOWER_X * k, TOWER_TOP * k)
    p.line((TOWER_X - 0.08) * k, 0.5 * k, (TOWER_X + 0.08) * k, 0.5 * k)
    p.line(TOWER_X * k, TOWER_TOP * k, (TOWER_X + 0.22) * k, TOWER_TOP * k)
    // The rod from the plate to the pawl on the tower.
    p.line(0.14 * k, (FLOOR + 0.04 + pressed * 0.02) * k, (TOWER_X - 0.02) * k, (FLOOR + 0.06) * k)
    // The chain from the winch to the bridge's tip.
    p.line((TOWER_X + 0.22) * k, (TOWER_TOP + 0.05) * k, tipX * k, tipY * k)
    solid(p, ink, weight, bg)
    p.circle((TOWER_X + 0.22) * k, (TOWER_TOP + 0.05) * k, 0.1 * k)
    p.push()
    p.translate((TOWER_X + 0.22) * k, (TOWER_TOP + 0.05) * k)
    p.rotate(Math.hypot(tipX - TOWER_X - 0.22, tipY - TOWER_TOP - 0.05) / 0.05)
    outline(p, ink, weight)
    p.line(-0.035 * k, 0, 0.035 * k, 0)
    p.line(0, -0.035 * k, 0, 0.035 * k)
    p.pop()
    // The pawl at the winch, flipped by the rod.
    p.push()
    p.translate((TOWER_X + 0.22) * k, (TOWER_TOP + 0.12) * k)
    p.rotate(0.7 * pressed)
    outline(p, ink, weight)
    p.line(0, 0, -0.08 * k, 0)
    p.pop()

    // The bridge: a plank on the hinge, with a rail along its top.
    p.push()
    p.translate(HINGE[0] * k, HINGE[1] * k)
    p.rotate(angle)
    solid(p, ink, weight, s.color)
    p.rect((SPAN / 2) * k, 0.035 * k, SPAN * k, 0.07 * k)
    p.fill(ink)
    p.noStroke()
    for (const f of [0.2, 0.5, 0.8]) p.circle(SPAN * f * k, 0.035 * k, 0.025 * k)
    p.pop()
    solid(p, ink, weight, bg)
    p.circle(HINGE[0] * k, HINGE[1] * k, 0.05 * k)

    // The thump.
    if (since > FALL && since < FALL + 0.25) {
      const f = over(since, FALL, FALL + 0.25)
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      burst(p, 1.44 * k, (FLOOR - 0.02) * k, (0.06 + 0.14 * f) * k, (0.1 + 0.2 * f) * k, 5, 3.3)
      p.pop()
    }
  },
})
