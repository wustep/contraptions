import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { easeOutQuad } from '../../../../../src/core/ease'
import { FLOOR, ROLL, arrive, arriveAt, definePiece, fly, over, post, rail, ramp, trace, wait, type Lane, type Pt } from '../../parts'
import { flash, score, tube } from './neon'

/**
 * A bumper-car floor under a lit ceiling grid: one car waiting at the
 * rail's end with its pole up to the grid, another parked nose to it
 * further down the floor, a rubber kerb across the far end. The ball
 * rolls off the rail over the waiting car's tail into its seat and sits;
 * the shoe on the pole sparks, the grid lights, and the car drives off
 * across the floor, faster, and rams the parked car nose to nose. The
 * parked car is shoved back into the kerb, rocks off it and settles, its
 * shoe sliding along the grid with it; the car that hit it stops dead and
 * the jolt pitches the ball out of the seat, over both of them and the
 * kerb, onto the rail beyond. A hundred. The sparks die and the grid goes
 * dark. The throw goes over the far side of the floor: the parked car's
 * pole and the grid's far post stand in front of it.
 *
 * The drive is one function of time, which the lane traces and the car is
 * drawn from.
 */
export interface BumpercarState {
  color: string
  parked: string
}

/** The floor: a deck from behind the waiting car to past the kerb, its surface here. */
const DECK_X0 = -0.42
const DECK_X1 = 1.72
const DECK_Y = 0.27
/**
 * A car, facing the way it drives, about its seat: half its body's
 * length, and how far the rubber round its foot stands out past that. Its
 * tail is low, under the rail's line, so the ball boards over it; its side
 * rises from there to a low round cowl, which the ball's throw clears.
 */
const CAR_HALF = 0.19
const RUBBER = 0.03
const BODY: Pt[] = [
  [-CAR_HALF, 0.21],
  [-CAR_HALF, 0.145],
  [0.04, 0.085],
  [0.09, 0.035],
  [0.15, 0.03],
  [CAR_HALF, 0.08],
  [CAR_HALF, 0.21],
]
/** The grid over the floor, and the poles up to it: a pole leans back from a car's tail to its shoe. */
const GRID_Y = -0.44
const GRID_X0 = DECK_X0 - 0.04
const GRID_X1 = DECK_X1 + 0.04
const LEAN = 0.22
/** The kerb's near face; the parked car, a jolt short of it; and where the drive ends, rubber to rubber. */
const KERB_X = 1.58
const JOLT = 0.12
const PARK_X = KERB_X - JOLT - CAR_HALF - RUBBER
const BUMP_X = PARK_X - 2 * (CAR_HALF + RUBBER)
/** Where the waiting car's seat is, and how long the ball sits in it before the car goes. */
const START_X = -0.1
const ARRIVE = arriveAt(START_X)
const SIT = 0.2604
const T_GO = ARRIVE + SIT
const DRIVE = 0.55
const T_BUMP = T_GO + DRIVE
/** The throw out of the seat over both cars and the kerb onto the rail, and the landing. */
const LAND: Pt = [1.85, 0]
const THROW = 0.32
const ARC = 0.22

/** Where the driving car's seat is. */
function carAt(t: number): number {
  if (t <= T_GO) return START_X
  // One steady push from rest, so it meets the parked car at the pace the ball is thrown on at.
  if (t < T_BUMP) return START_X + (BUMP_X - START_X) * Math.pow((t - T_GO) / DRIVE, 2)
  const s = t - T_BUMP
  return BUMP_X - 0.035 * Math.abs(Math.sin(s * 22)) * Math.exp(-s * 7)
}
/** The parked car after the bump: shoved back into the kerb, off it and onto it again, less each time, its nose kicking up as it lands. */
function parkedAt(t: number): { x: number; a: number } {
  const s = t - T_BUMP
  if (s <= 0) return { x: PARK_X, a: 0 }
  if (s < 0.1) return { x: PARK_X + JOLT * easeOutQuad(s / 0.1), a: 0 }
  const r = s - 0.1
  return { x: PARK_X + JOLT - 0.04 * Math.abs(Math.sin(r * 16)) * Math.exp(-r * 6), a: 0.1 * Math.sin(r * 16) * Math.exp(-r * 8) }
}

const LANE: Lane = {
  segs: [
    ...arrive([-0.5, 0], [START_X, 0]),
    wait([START_X, 0], SIT),
    ...trace((t) => [carAt(t), 0], T_GO, T_BUMP, 24),
    fly([BUMP_X, 0], LAND, THROW, ARC),
    fly(LAND, [LAND[0] + 0.08, 0], 0.03, 0.01),
    ramp([LAND[0] + 0.08, 0], [2.5, 0], 2.9, ROLL),
  ],
  fire: T_BUMP,
}

/** A car's pole, leaning back from its tail to the shoe that rides under the grid. */
function pole(p: p5, k: number, ink: string, weight: number, x: number, face: 1 | -1): void {
  const shoe = x - face * LEAN
  outline(p, ink, weight)
  p.line((x - face * (CAR_HALF - 0.03)) * k, 0.16 * k, shoe * k, (GRID_Y + 0.05) * k)
  solid(p, ink, weight, ink)
  p.rect(shoe * k, (GRID_Y + 0.045) * k, 0.07 * k, 0.03 * k)
}
/**
 * A car's body with its seat at `x`, facing `face`, its nose kicked up by
 * `a` about the tail's foot: one wedge, and the rubber round its foot,
 * which is what meets another car or the kerb.
 */
function hull(p: p5, k: number, ink: string, weight: number, color: string, x: number, face: 1 | -1, a: number): void {
  p.push()
  p.translate((x - face * (CAR_HALF + RUBBER)) * k, DECK_Y * k)
  p.scale(face, 1)
  p.rotate(-a)
  p.translate((CAR_HALF + RUBBER) * k, -DECK_Y * k)
  solid(p, ink, weight, color)
  p.beginShape()
  for (const [px, py] of BODY) p.vertex(px * k, py * k)
  p.endShape(p.CLOSE)
  solid(p, ink, weight, ink)
  p.rect(0, 0.225 * k, (CAR_HALF + RUBBER) * 2 * k, 0.05 * k, 0.025 * k)
  p.pop()
}

export const bumpercar = definePiece<BumpercarState>({
  name: 'bumpercar',
  points: 100,
  weight: 0.9,
  flight: true,
  place: ({ rng, color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [2, 0],
    ]
    if (!fits(cells, [3, 0])) return null
    // The parked car in a colour of its own: not the floor's, and not the ball's if there is another to be had.
    const others = theme.colors.filter((c) => c !== color)
    const apart = others.filter((c) => c !== ball.color)
    const pool = apart.length ? apart : others
    return { cells, exit: { at: [3, 0], dir: 1 }, lane: LANE, state: { color, parked: pool.length ? rng.pick(pool) : color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const x = carAt(t)
    const live = t > ARRIVE && since < 0.8
    const powered = t < ARRIVE ? 0 : 1 - over(since, 0.4, 1.2)
    const parked = parkedAt(t)

    // The rail in, over the deck's end to the waiting car's tail; the rail out from the deck's far end.
    rail(p, k, ink, weight, -0.5, START_X - CAR_HALF - RUBBER - 0.01)
    rail(p, k, ink, weight, DECK_X1, 2.5)
    for (const px of [2.05, 2.42]) post(p, k, ink, weight, px, FLOOR, 0.5)
    // The grid over the floor on its posts, and the tube under it, lit while a car is live.
    post(p, k, ink, weight, DECK_X0 + 0.03, GRID_Y, DECK_Y)
    solid(p, ink, weight, s.color)
    p.rect(((GRID_X0 + GRID_X1) / 2) * k, GRID_Y * k, (GRID_X1 - GRID_X0) * k, 0.05 * k, 0.01 * k)
    tube(p, k, ink, weight * 0.7, s.color, GRID_X0 + 0.05, GRID_Y + 0.05, GRID_X1 - 0.05, GRID_Y + 0.05, powered)
    // The deck: a dark stage with a lit edge, from the floor up to its surface, and the rubber kerb across its far end.
    solid(p, ink, weight, bg)
    p.rect(((DECK_X0 + DECK_X1) / 2) * k, ((DECK_Y + 0.5) / 2) * k, (DECK_X1 - DECK_X0) * k, (0.5 - DECK_Y) * k, 0.01 * k)
    solid(p, ink, weight, s.color)
    p.rect(((DECK_X0 + DECK_X1) / 2) * k, (DECK_Y + 0.025) * k, (DECK_X1 - DECK_X0) * k, 0.05 * k, 0.005 * k)
    solid(p, ink, weight, ink)
    p.rect((KERB_X + 0.035) * k, (DECK_Y - 0.05) * k, 0.07 * k, 0.1 * k, 0.025 * k)
    // The parked car, nose to the one that is coming, and the driving car's pole; its body is in front of the ball.
    hull(p, k, ink, weight, s.parked, parked.x, -1, parked.a)
    pole(p, k, ink, weight, x, 1)
    // The spark at the driving car's shoe while it is live: short flicks of light off the contact.
    if (live && Math.floor(t * 40) % 3 !== 0) {
      p.push()
      p.stroke(ink)
      p.strokeWeight(weight * 0.8)
      for (let i = 0; i < 3; i++) {
        const a = Math.PI * (0.55 + 0.3 * Math.sin(t * 90 + i * 2.1))
        const r = 0.04 + 0.03 * (i % 2)
        p.line((x - LEAN) * k, (GRID_Y + 0.06) * k, (x - LEAN + Math.cos(a) * r) * k, (GRID_Y + 0.06 + Math.sin(a) * r) * k)
      }
      p.pop()
    }
    // The bump, rubber on rubber.
    flash(p, k, s.parked, weight, BUMP_X + CAR_HALF + RUBBER, DECK_Y - 0.1, since, 0.22, 0.08, 0.26)
  },
  over: (p, s, { k, t, ink, weight }) => {
    // The driving car's near side, in front of the ball: it sits in the car until it is thrown out.
    hull(p, k, ink, weight, s.color, carAt(t), 1, 0)
    // The parked car's pole and the grid's far post stand on the near side of the floor: the ball is pitched over behind them.
    pole(p, k, ink, weight, parkedAt(t).x, -1)
    post(p, k, ink, weight, DECK_X1 - 0.03, GRID_Y, DECK_Y)
  },
  // Over the grid, above the bump: on the floor it would lie across the cars.
  scores: (p, s, { k, since, bg }) => score(p, k, s.color, bg, BUMP_X + CAR_HALF + RUBBER, GRID_Y + 0.1, '+100', since, 1),
})
