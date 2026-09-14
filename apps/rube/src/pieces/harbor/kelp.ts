import { outline, solid } from '../../../../../src/core/draw'
import { FLOOR, ROLL, chain, definePiece, over, rail, ramp, rankBy, roll, wait, type Lane, type Pt } from '../../parts'
import { bubbles, water } from './sea'

/**
 * A kelp column. A glass tank stands on the pier one or two floors tall,
 * full of water with kelp growing up through it. The ball rolls in at an
 * opening in the bottom and, lighter than the water, rises — slowly at
 * first, then steadily, weaving up between the fronds with a train of
 * bubbles — to break the surface at the top, where it bobs and rolls out
 * over the rim onto the rail, on or back the way it came.
 */
export interface KelpState {
  color: string
  floors: number
  turn: 1 | -1
}

const WALL = 0.24
const ENTRY = 0.06
const BOB = 0.15
const riseTime = (floors: number) => 0.6 + 0.55 * floors

/** The rise: a gentle weave up the column, slow at both ends. */
function rise(floors: number) {
  const n = 10 + 6 * floors
  const pts: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const f = i / n
    pts.push([0.07 * Math.sin(f * Math.PI * 2 * floors) * Math.sin(Math.PI * f), ENTRY + (-floors - ENTRY) * f])
  }
  return chain(pts, riseTime(floors), (i) => 0.45 + 0.55 * Math.sin((Math.PI * (i - 0.5)) / n))
}

export const kelp = definePiece<KelpState>({
  name: 'kelp',
  weight: 1,
  place: ({ rng, color, fits, taste }) => {
    const tall = taste.weights['lift-tall'] ?? 1
    const options = rng.shuffle([1, 2].flatMap((floors) => [1, -1].map((turn) => ({ floors, turn: turn as 1 | -1 }))))
    for (const { floors, turn } of rankBy(rng, options, (o) => Math.pow(tall, o.floors - 1))) {
      const cells: Pt[] = []
      for (let i = 0; i <= floors; i++) cells.push([0, -i])
      const exit: Pt = [turn, -floors]
      if (!fits(cells, exit)) continue
      const into = ramp([-WALL, 0], [0, ENTRY], ROLL, 0.8)
      const lane: Lane = {
        segs: [
          roll([-0.5, 0], [-WALL, 0], ROLL),
          into,
          ...rise(floors),
          wait([0, -floors], BOB),
          ramp([0, -floors], [turn * 0.5, -floors], 0.6, ROLL),
        ],
        fire: (0.5 - WALL) / ROLL + into.dur,
      }
      return { cells, exit: { at: exit, dir: turn }, lane, state: { color, floors, turn } }
    }
    return null
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const { floors, turn } = s
    const top = -floors
    const rim = top + FLOOR
    const surface = top + 0.05
    const climb = riseTime(floors)
    const upF = since < 0 ? 0 : over(since, 0, climb)
    const ballY = ENTRY + (top - ENTRY) * upF

    // The pier in, to the tank's wall; the ground the tank stands on.
    water(p, k, ink, weight, -0.5, -WALL)
    rail(p, k, ink, weight, -0.5, -WALL)
    outline(p, ink, weight)
    p.line(-0.36 * k, 0.5 * k, 0.36 * k, 0.5 * k)
    // The tank: two walls from the ground to the rim, the near one with an
    // opening at the bottom for the ball, and the surface at the top.
    p.line(-WALL * k, (rim - 0.02) * k, -WALL * k, -0.16 * k)
    p.line(-WALL * k, (FLOOR + 0.04) * k, -WALL * k, 0.5 * k)
    p.line(WALL * k, (rim - 0.02) * k, WALL * k, 0.5 * k)
    water(p, k, ink, weight, -WALL, WALL, surface)
    // The kelp: three stalks rooted in the sand, swaying, with blades.
    const sway = (y: number, i: number) => 0.03 * Math.sin(t * 1.6 + y * 3 + i * 2)
    for (const [x0, i] of [
      [-0.13, 0],
      [0.1, 1],
    ]) {
      frond(p, k, ink, weight, s.color, x0, 0.5, surface + 0.08, i, sway)
    }
    // Sand and a shell at the bottom.
    p.noStroke()
    p.fill(ink)
    for (const x of [-0.15, 0.02, 0.17]) p.ellipse(x * k, 0.48 * k, 0.06 * k, 0.03 * k)
    // The bubbles the ball leaves behind as it rises.
    if (since > 0 && since < climb + 1.2) bubbles(p, k, ink, weight, bg, 0.02, Math.min(0.3, ballY + 0.3), surface + 0.04, since, 5)
    // The rim, and the rail out from it.
    solid(p, ink, weight, s.color)
    p.rect(0, (rim - 0.01) * k, (WALL * 2 + 0.06) * k, 0.05 * k)
    rail(p, k, ink, weight, turn * WALL, turn * 0.5, rim)
    // A ring on the surface as the ball breaks it.
    const broke = since - climb
    if (broke > 0 && broke < 0.5) {
      const f = over(broke, 0, 0.5)
      p.push()
      p.noFill()
      p.stroke(s.color)
      p.strokeWeight(weight * (1 - f))
      p.ellipse(0, surface * k, (0.1 + 0.3 * f) * k, (0.03 + 0.06 * f) * k)
      p.pop()
    }
  },
  over: (p, s, { k, t, ink, weight }) => {
    // One frond in front, so the ball weaves behind it on the way up.
    const surface = -s.floors + 0.05
    frond(p, k, ink, weight, s.color, -0.02, 0.5, surface + 0.14, 2, (y, i) => 0.03 * Math.sin(t * 1.6 + y * 3 + i * 2))
  },
})

/** A stalk from (x, y0) up to y1, swaying, with a blade every so often, alternating sides. */
function frond(p: import('p5'), k: number, ink: string, weight: number, color: string, x: number, y0: number, y1: number, i: number, sway: (y: number, i: number) => number): void {
  outline(p, ink, weight)
  p.noFill()
  p.beginShape()
  const n = Math.max(4, Math.round((y0 - y1) * 10))
  for (let j = 0; j <= n; j++) {
    const y = y0 + (y1 - y0) * (j / n)
    p.vertex((x + sway(y, i) * (j / n)) * k, y * k)
  }
  p.endShape()
  for (let y = y0 - 0.18; y > y1 + 0.05; y -= 0.22) {
    const side = Math.round((y0 - y) / 0.22) % 2 ? 1 : -1
    const sx = x + sway(y, i) * ((y0 - y) / (y0 - y1))
    p.push()
    p.translate(sx * k, y * k)
    p.rotate(side * 1.1 + sway(y, i) * 4)
    solid(p, ink, weight * 0.9, color)
    p.ellipse(0.07 * k, 0, 0.14 * k, 0.05 * k)
    p.pop()
  }
}
