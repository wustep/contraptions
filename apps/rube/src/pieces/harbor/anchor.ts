import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeInQuad } from '../../../../../src/core/ease'
import { FLOOR, ROLL, arrive, arriveAt, definePiece, fly, over, rail, ramp, rankBy, wait, type Lane, type Pt } from '../../parts'
import { piling, seaWater, seabed, splash, water } from './sea'

/**
 * An anchor on a windlass. The deck stops at a hatch; the anchor hangs in
 * it with its stock level with the deck, hauled up tight on its chain.
 * The ball rolls onto the stock; its weight trips the pawl; the drum
 * spins, the chain pays out and the anchor plunges one, two or three
 * floors and bites the seabed with a splash — and the ball, bounced off
 * the stock, rolls away along the deck below, on or back the way it came.
 * Some time later the windlass winds it all back up, for no one.
 */
export interface AnchorState {
  color: string
  floors: number
  turn: 1 | -1
}

const DRUM: Pt = [0, -0.4]
const CHAIN_X = 0.17
const HATCH = 0.24
const ARRIVE = arriveAt(0)
const PAWL = 0.3
const FIRE = ARRIVE + PAWL
const fallTime = (floors: number) => 0.24 + 0.24 * floors

/** How far down the anchor is, in floors, `since` the pawl let go. */
function depth(since: number, floors: number): number {
  const fall = fallTime(floors)
  if (since < 0) return 0
  if (since < fall) return floors * easeInQuad(since / fall)
  if (since < fall + 2.2) return floors
  return floors * (1 - easeInOutSine(over(since, fall + 2.2, fall + 4.8)))
}

export const anchor = definePiece<AnchorState>({
  name: 'anchor',
  weight: 1.2,
  place: ({ rng, color, fits, taste }) => {
    const deep = taste.weights['drop-deep'] ?? 1
    const options = rng.shuffle([1, 2, 3].flatMap((floors) => [1, -1].map((turn) => ({ floors, turn: turn as 1 | -1 }))))
    for (const { floors, turn } of rankBy(rng, options, (o) => Math.pow(deep, o.floors - 1))) {
      const cells: Pt[] = []
      for (let i = 0; i <= floors; i++) cells.push([0, i])
      const exit: Pt = [turn, floors]
      if (!fits(cells, exit)) continue
      const lane: Lane = {
        segs: [
          ...arrive([-0.5, 0], [0, 0]),
          wait([0, 0], PAWL),
          { from: [0, 0], to: [0, floors], dur: fallTime(floors), ease: 'in' },
          fly([0, floors], [turn * 0.26, floors], 0.14, 0.07),
          ramp([turn * 0.26, floors], [turn * 0.5, floors], 2.4, ROLL),
        ],
        fire: FIRE,
      }
      return { cells, exit: { at: exit, dir: turn }, lane, state: { color, floors, turn } }
    }
    return null
  },
  draw: (p, s, { k, since, ink, bg, weight, theme }) => {
    const { floors, turn } = s
    const d = depth(since, floors)
    const fall = fallTime(floors)
    const landed = since - fall

    // The deck either side of the hatch at the top, and the deck below.
    water(p, k, ink, weight, -0.5, -HATCH)
    water(p, k, ink, weight, HATCH, 0.5)
    rail(p, k, ink, weight, -0.5, -HATCH)
    rail(p, k, ink, weight, HATCH, 0.5)
    piling(p, k, ink, weight, -HATCH - 0.06)
    piling(p, k, ink, weight, HATCH + 0.06)
    for (let i = 1; i < floors; i++) water(p, k, ink, weight, -0.5, 0.5, i + 0.37)
    rail(p, k, ink, weight, turn * HATCH, turn * 0.5, floors + FLOOR)
    piling(p, k, ink, weight, turn * (HATCH + 0.06), floors + FLOOR, floors + 0.5)
    seabed(p, k, ink, weight, -0.5, 0.5, floors + 0.5)

    // The gallows over the hatch, the drum on it, and the pawl.
    outline(p, ink, weight)
    for (const x of [-0.3, 0.3]) p.line(x * k, FLOOR * k, x * k, (DRUM[1] - 0.12) * k)
    p.line(-0.32 * k, (DRUM[1] - 0.12) * k, 0.32 * k, (DRUM[1] - 0.12) * k)
    p.line(0, (DRUM[1] - 0.12) * k, 0, DRUM[1] * k)
    solid(p, ink, weight, s.color)
    p.circle(DRUM[0] * k, DRUM[1] * k, 0.2 * k)
    p.push()
    p.translate(DRUM[0] * k, DRUM[1] * k)
    p.rotate(d * 8)
    outline(p, ink, weight)
    for (let i = 0; i < 3; i++) {
      p.line(-0.08 * k, 0, 0.08 * k, 0)
      p.rotate(Math.PI / 3)
    }
    p.pop()
    const pawl = since < 0 ? 0 : since < 0.1 ? over(since, 0, 0.1) : 1 - over(since, fall + 4.6, fall + 4.9)
    const strain = since > -PAWL && since < 0 ? 0.06 * Math.sin(since * 60) * over(since, -PAWL, 0) : 0
    p.push()
    p.translate(0.14 * k, (DRUM[1] - 0.1) * k)
    p.rotate(0.9 * pawl + strain)
    outline(p, ink, weight)
    p.line(0, 0, 0, 0.12 * k)
    p.pop()

    // The chain, from the drum down to the shackle on the stock's end.
    const ay = d
    outline(p, ink, weight * 0.9)
    for (let y = DRUM[1] + 0.06; y < ay + FLOOR; y += 0.05) {
      p.line(CHAIN_X * k, y * k, (CHAIN_X + 0.012) * k, Math.min(y + 0.03, ay + FLOOR) * k)
    }
    // The anchor: the stock the ball rides, the shank, the crown and flukes.
    solid(p, ink, weight, s.color)
    p.rect(0, (ay + FLOOR + 0.03) * k, 0.44 * k, 0.06 * k, 0.01 * k)
    outline(p, ink, weight)
    p.circle((CHAIN_X + 0.03) * k, (ay + FLOOR + 0.03) * k, 0.045 * k)
    solid(p, ink, weight, s.color)
    p.rect(0, (ay + FLOOR + 0.22) * k, 0.06 * k, 0.34 * k)
    outline(p, ink, weight * 1.4)
    p.noFill()
    p.arc(0, (ay + FLOOR + 0.24) * k, 0.4 * k, 0.3 * k, 0.15, Math.PI - 0.15)
    solid(p, ink, weight, s.color)
    for (const side of [-1, 1]) {
      p.triangle(side * 0.2 * k, (ay + FLOOR + 0.28) * k, side * 0.14 * k, (ay + FLOOR + 0.24) * k, side * 0.24 * k, (ay + FLOOR + 0.17) * k)
    }
    // The bite: a splash off the seabed, and a thud of lines.
    splash(p, k, seaWater(theme), weight, 0, floors + 0.37, over(landed, 0, 0.5), 1.1)
    if (landed > 0 && landed < 0.2) {
      p.push()
      p.stroke(ink)
      p.strokeWeight(weight)
      for (const x of [-0.28, 0.28]) p.line(x * k, (floors + 0.44) * k, x * 1.25 * k, (floors + 0.38) * k)
      p.pop()
    }
    // The hatch sides, so the shaft reads as one the anchor was hauled up through.
    solid(p, ink, weight, bg)
    for (const x of [-HATCH, HATCH]) p.rect(x * k, (FLOOR + 0.05) * k, 0.03 * k, 0.1 * k)
  },
})
