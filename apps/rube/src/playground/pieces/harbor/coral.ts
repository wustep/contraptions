import { solid } from '../../../../../../src/core/draw'
import { ROLL, definePiece, fly, over, puff, rail, ramp, roll, type Lane, type Pt } from '../../../parts'
import { WATER, bodyColor, piling, seaWater, water } from '../../../pieces/harbor/sea'

/**
 * Coral. The deck stops, and in the open water beyond it two heads of
 * brain coral stand up out of the sea, each one lumpy dome with one line
 * round it, their crowns a little under the deck's level. The ball runs
 * off the deck's end and comes down on the first, bounces off its crown
 * onto the second, and off that up onto the far deck, a puff off each
 * crown where it hits and a ring on the water round the head. Nothing
 * moves but the ball; the shape is the beat.
 */
/** The piers. */
const WEST = -0.1
const EAST = 1.16
/** The heads: where each stands, how big, and how far its crown is below the water's own line. */
const HEADS: { x: number; y: number; r: number; seed: number }[] = [
  { x: 0.28, y: 0.44, r: 0.22, seed: 0 },
  { x: 0.86, y: 0.42, r: 0.24, seed: 2 },
]
/** Where the ball lands on each crown, and on the far deck. */
const HIT1: Pt = [HEADS[0].x, HEADS[0].y - HEADS[0].r - 0.13 + 0.01]
const HIT2: Pt = [HEADS[1].x, HEADS[1].y - HEADS[1].r - 0.13 + 0.01]
const LAND: Pt = [EAST + 0.12, 0]

const T_EDGE = (WEST + 0.5) / ROLL
const FALL = 0.15
const FIRE = T_EDGE + FALL
const HOP1 = 0.36
const HOP2 = 0.32
const T_HIT2 = FIRE + HOP1

const LANE: Lane = {
  segs: [
    roll([-0.5, 0], [WEST, 0], ROLL),
    // Off the end: level at first, then down onto the first crown.
    fly([WEST, 0], HIT1, FALL, HIT1[1] / 4),
    fly(HIT1, HIT2, HOP1, 0.3),
    fly(HIT2, LAND, HOP2, 0.24),
    fly(LAND, [LAND[0] + 0.06, 0], 0.05, 0.012),
    ramp([LAND[0] + 0.06, 0], [1.5, 0], 1.7, ROLL),
  ],
  fire: FIRE,
}

/** A head of brain coral: a dome standing up from under the water, its outline a run of lobes, drawn as one shape. */
function head(p: import('p5'), k: number, x: number, y: number, r: number, seed: number): void {
  const n = 28
  p.beginShape()
  p.vertex((x - r * 1.05) * k, (y + 0.16) * k)
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (Math.PI * i) / n
    const lobe = 1 + 0.07 * Math.sin(a * 7 + seed) + 0.03 * Math.sin(a * 11 + seed * 2)
    const rr = r * lobe
    p.vertex((x + Math.cos(a) * rr * 1.05) * k, (y + Math.sin(a) * rr) * k)
  }
  p.vertex((x + r * 1.05) * k, (y + 0.16) * k)
  p.endShape(p.CLOSE)
}

export const coral = definePiece<{ color: string }>({
  name: 'coral',
  weight: 0.9,
  flight: true,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: LANE, state: { color: bodyColor(theme, color, ball.color) } }
  },
  draw: (p, s, { k, t, ink, bg, weight, theme }) => {
    const sea = seaWater(theme)

    rail(p, k, ink, weight, -0.5, WEST)
    rail(p, k, ink, weight, EAST, 1.5)
    piling(p, k, ink, weight, -0.3)
    piling(p, k, ink, weight, EAST + 0.2)
    // The heads, standing up out of the sea; the water in front of them.
    solid(p, ink, weight, s.color)
    for (const h of HEADS) head(p, k, h.x, h.y, h.r, h.seed)
    water(p, k, ink, weight, -0.5, 1.5)

    // Each hit: a puff off the crown, and a ring on the water round the head.
    for (const [hit, at, h] of [
      [HIT1, FIRE, HEADS[0]],
      [HIT2, T_HIT2, HEADS[1]],
    ] as const) {
      const f = over(t, at, at + 0.3)
      if (f > 0 && f < 1) puff(p, k, ink, weight * 0.8, bg, hit[0] + 0.05 + 0.08 * f, hit[1] + 0.06 - 0.1 * f, 0.03 + 0.05 * Math.sin(Math.PI * f))
      const ring = over(t, at + 0.03, at + 0.5)
      if (ring > 0 && ring < 1) {
        p.push()
        p.noFill()
        p.stroke(sea)
        p.strokeWeight(weight * (1 - ring))
        p.ellipse(h.x * k, WATER * k, (h.r * 2 + 0.1 + 0.3 * ring) * k, (0.05 + 0.08 * ring) * k)
        p.pop()
      }
    }
  },
})
