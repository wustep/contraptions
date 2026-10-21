import { solid } from '../../../../../../src/core/draw'
import { R, ROLL, definePiece, fly, over, rail, ramp, roll, type Lane, type Pt } from '../../../parts'
import { WATER, bodyColor, piling, seaWater, water } from '../../../pieces/harbor/sea'

/**
 * Coral. The deck stops, and in the open water beyond it two heads of
 * brain coral stand on the bed of the sea, each one lumpy dome with one
 * line round it, their crowns just out of the water and a little under
 * the deck's level. The ball runs off the deck's end and comes down on
 * the first, bounces off its crown onto the second, and off that up onto
 * the far deck, a ring going out on the water round each head as it is
 * struck. Nothing moves but the ball; the shape is the beat.
 *
 * Every hop is a parabola under one gravity, and each crown gives the
 * ball back about the way it came down with, so it skips across at about
 * the deck's own pace, no higher than the deck.
 */
/** The far pier. */
const EAST = 1.16
/** The heads' crowns, both at one height, and each head: where it stands, how big. */
const CROWN = 0.25
const HEADS: { x: number; r: number; seed: number }[] = [
  { x: 0.28, r: 0.22, seed: 0 },
  { x: 0.86, r: 0.24, seed: 2 },
]
/** Where the ball lands on each crown, and on the far deck. */
const HIT1: Pt = [HEADS[0].x, CROWN - R + 0.01]
const HIT2: Pt = [HEADS[1].x, CROWN - R + 0.01]
const LAND: Pt = [EAST + 0.12, 0]

const G = 22
const hop = (from: Pt, to: Pt, dur: number) => fly(from, to, dur, (G * dur * dur) / 8)
/** Off the deck's end from a level start at the deck's pace, so the deck ends where that fall meets the first crown. */
const FALL = Math.sqrt((2 * HIT1[1]) / G)
const WEST = HIT1[0] - ROLL * FALL
const T_EDGE = (WEST + 0.5) / ROLL
const FIRE = T_EDGE + FALL
/** Crown to crown, level, as fast up as it came down; and up onto the deck, a touch livelier. */
const HOP1 = 2 * FALL
const HOP2 = 0.18
const T_HIT2 = FIRE + HOP1

const LANE: Lane = {
  segs: [
    roll([-0.5, 0], [WEST, 0], ROLL),
    hop([WEST, 0], HIT1, FALL),
    hop(HIT1, HIT2, HOP1),
    hop(HIT2, LAND, HOP2),
    ramp(LAND, [1.5, 0], (LAND[0] - HIT2[0]) / HOP2, ROLL),
  ],
  fire: FIRE,
}

/** A head of brain coral: a dome on the bed of the sea, its crown `CROWN`, its outline a run of lobes, drawn as one shape. */
function head(p: import('p5'), k: number, x: number, r: number, seed: number): void {
  const n = 28
  const y = CROWN + r
  p.beginShape()
  p.vertex((x - r * 1.05) * k, 0.5 * k)
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (Math.PI * i) / n
    const lobe = 1 + 0.07 * Math.sin(a * 7 + seed) + 0.03 * Math.sin(a * 11 + seed * 2)
    const rr = r * lobe
    p.vertex((x + Math.cos(a) * rr * 1.05) * k, (y + Math.sin(a) * rr) * k)
  }
  p.vertex((x + r * 1.05) * k, 0.5 * k)
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
    for (const h of HEADS) head(p, k, h.x, h.r, h.seed)
    water(p, k, ink, bg, weight, -0.5, 1.5)

    // Each hit: a ring going out on the water round the head, its far side behind the head.
    for (const [at, h] of [
      [FIRE, HEADS[0]],
      [T_HIT2, HEADS[1]],
    ] as const) {
      const ring = over(t, at, at + 0.5)
      if (ring <= 0 || ring >= 1) continue
      p.push()
      p.noFill()
      p.stroke(sea)
      p.strokeWeight(weight * (1 - ring))
      p.arc(h.x * k, WATER * k, (h.r * 2 + 0.1 + 0.3 * ring) * k, (0.05 + 0.08 * ring) * k, 0, Math.PI)
      p.pop()
    }
  },
})
