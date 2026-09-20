import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { easeInQuad, easeOutCubic } from '../../../../../src/core/ease'
import { FLOOR, ROLL, arrive, arriveAt, definePiece, fly, over, post, rail, ramp, trace, wait, type Lane, type Pt } from '../../parts'
import { flash, score, tube } from './neon'

/**
 * A bumper-car floor two cells long under a lit ceiling grid: one car
 * waiting at the rail's end with its pole up to the grid, another parked
 * at the far end. The ball rolls off the rail into the waiting car's seat
 * and sits; the shoe on the pole sparks, the grid lights, and the car
 * drives off across the floor, faster, and rams the parked car — which is
 * shoved off the end of the floor and tips over the edge onto the ground
 * — and the jolt pitches the ball out of the seat, over the nose, onto
 * the rail beyond. A hundred. The car sits where it stopped, the sparks
 * die and the grid goes dark.
 *
 * The drive is one function of time, which the lane traces and the car is
 * drawn from.
 */
export interface BumpercarState {
  color: string
  parked: string
}

/** The floor: a deck from behind the waiting car to just past the parked one, its surface here. */
const DECK_X0 = -0.3
const DECK_X1 = 1.55
const DECK_Y = 0.27
/** A car: half its length, the height of the tub's side over the seat, and the seat's half width. Its body is a wedge, low at the tail the ball boards over and high at the nose. */
const CAR_HALF = 0.2
const CAR_TOP = 0.03
const SEAT_HALF = 0.11
const BODY: Pt[] = [
  [-CAR_HALF, DECK_Y],
  [-CAR_HALF, 0.18],
  [-0.16, FLOOR],
  [0.1, FLOOR],
  [0.12, 0.07],
  [0.16, 0.0],
  [CAR_HALF, 0.03],
  [CAR_HALF, DECK_Y],
]
/** The grid over the floor, and the poles up to it. */
const GRID_Y = -0.44
const GRID_X0 = -0.36
const GRID_X1 = 1.62
/** Where the parked car waits, and where the drive ends against it. */
const PARK_X = 1.4
const BUMP_X = PARK_X - 2 * CAR_HALF
const ARRIVE = arriveAt(0)
const SIT = 0.2
const T_GO = ARRIVE + SIT
const DRIVE = 0.55
const T_BUMP = T_GO + DRIVE
/** The throw out of the seat over the nose onto the rail, and the landing. */
const LAND: Pt = [1.85, 0]
const THROW = 0.32
const ARC = 0.22

/** Where the driving car's seat is. */
function carAt(t: number): number {
  if (t <= T_GO) return 0
  if (t < T_BUMP) return BUMP_X * Math.pow((t - T_GO) / DRIVE, 1.6)
  const s = t - T_BUMP
  return BUMP_X - 0.035 * Math.sin(s * 22) * Math.exp(-s * 7)
}
/** The parked car after the bump: shoved along the floor, off its end, and over onto the ground. */
function parkedAt(t: number): { x: number; y: number; a: number } {
  const s = t - T_BUMP
  if (s <= 0) return { x: PARK_X, y: DECK_Y, a: 0 }
  const x = PARK_X + 0.38 * easeOutCubic(Math.min(1, s / 0.35))
  const off = clamp01((x - DECK_X1) / 0.3)
  const drop = s < 0.12 ? 0 : Math.min(1, (s - 0.12) / 0.3)
  const y = DECK_Y + (0.5 - DECK_Y) * easeInQuad(drop) * off
  return { x, y, a: 0.55 * easeInQuad(drop) * off }
}
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

const LANE: Lane = {
  segs: [
    ...arrive([-0.5, 0], [0, 0]),
    wait([0, 0], SIT),
    ...trace((t) => [carAt(t), 0], T_GO, T_BUMP, 24),
    fly([BUMP_X, 0], LAND, THROW, ARC),
    fly(LAND, [LAND[0] + 0.08, 0], 0.04, 0.01),
    ramp([LAND[0] + 0.08, 0], [2.5, 0], 2.6, ROLL),
  ],
  fire: T_BUMP,
}

/** A car's body: one wedge, low at the tail and high at the nose, a rubber bumper round its foot, a pole up from its tail. */
function body(p: p5, k: number, ink: string, weight: number, color: string, x: number, y: number, a: number, pole: Pt | null): void {
  p.push()
  p.translate(x * k, y * k)
  p.rotate(a)
  // The pole, from the tail up to the grid's shoe.
  if (pole) {
    outline(p, ink, weight)
    p.line(-0.15 * k, (FLOOR - DECK_Y) * k, (pole[0] - x) * k, (pole[1] - y) * k)
  }
  solid(p, ink, weight, color)
  p.beginShape()
  for (const [px, py] of BODY) p.vertex(px * k, (py - DECK_Y) * k)
  p.endShape(p.CLOSE)
  p.fill(ink)
  p.noStroke()
  p.rect(0, -0.035 * k, (CAR_HALF * 2 - 0.03) * k, 0.04 * k, 0.01 * k)
  p.pop()
}
/** The front of a car's seat well, in front of the ball. */
function front(p: p5, k: number, ink: string, weight: number, color: string, x: number): void {
  solid(p, ink, weight, color)
  p.rect(x * k, ((CAR_TOP + FLOOR) / 2 + 0.02) * k, (SEAT_HALF * 2 + 0.02) * k, (FLOOR - CAR_TOP) * k, 0.015 * k)
  p.fill(ink)
  p.noStroke()
  p.rect(x * k, (FLOOR - 0.005) * k, (SEAT_HALF * 2 - 0.02) * k, 0.02 * k)
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

    // The rail in, to the deck; the rail out beyond it, on posts clear of where the parked car comes down.
    rail(p, k, ink, weight, -0.5, DECK_X0)
    rail(p, k, ink, weight, DECK_X1, 2.5)
    for (const px of [2.05, 2.42]) post(p, k, ink, weight, px, FLOOR, 0.5)
    // The deck: a dark stage with a lit edge, from the floor up to its surface.
    solid(p, ink, weight, bg)
    p.rect(((DECK_X0 + DECK_X1) / 2) * k, ((DECK_Y + 0.5) / 2) * k, (DECK_X1 - DECK_X0) * k, (0.5 - DECK_Y) * k, 0.01 * k)
    solid(p, ink, weight, s.color)
    p.rect(((DECK_X0 + DECK_X1) / 2) * k, (DECK_Y + 0.025) * k, (DECK_X1 - DECK_X0) * k, 0.05 * k, 0.005 * k)
    // The grid over the floor on its posts, and the tube under it, lit while a car is live.
    for (const gx of [GRID_X0 + 0.03, GRID_X1 - 0.03]) post(p, k, ink, weight, gx, GRID_Y, DECK_Y)
    solid(p, ink, weight, s.color)
    p.rect(((GRID_X0 + GRID_X1) / 2) * k, GRID_Y * k, (GRID_X1 - GRID_X0) * k, 0.05 * k, 0.01 * k)
    tube(p, k, ink, weight * 0.7, s.color, GRID_X0 + 0.05, GRID_Y + 0.05, GRID_X1 - 0.05, GRID_Y + 0.05, powered)
    // The parked car, and where it ends up; its pole leaves the grid with it.
    body(p, k, ink, weight, s.parked, parked.x, parked.y, parked.a, since > 0 ? [parked.x - 0.22, parked.y - (DECK_Y - GRID_Y) + 0.02] : [PARK_X - 0.22, GRID_Y + 0.02])
    // The driving car, its pole up to the shoe on the grid.
    const shoe: Pt = [x - 0.22, GRID_Y + 0.025]
    body(p, k, ink, weight, s.color, x, DECK_Y, 0, shoe)
    solid(p, ink, weight, ink)
    p.rect(shoe[0] * k, (GRID_Y + 0.045) * k, 0.07 * k, 0.03 * k)
    // The spark at the shoe while the car is live: short flicks of light off the contact.
    if (live && Math.floor(t * 40) % 3 !== 0) {
      p.push()
      p.stroke(ink)
      p.strokeWeight(weight * 0.8)
      for (let i = 0; i < 3; i++) {
        const a = Math.PI * (0.55 + 0.3 * Math.sin(t * 90 + i * 2.1))
        const r = 0.04 + 0.03 * (i % 2)
        p.line(shoe[0] * k, (GRID_Y + 0.06) * k, (shoe[0] + Math.cos(a) * r) * k, (GRID_Y + 0.06 + Math.sin(a) * r) * k)
      }
      p.pop()
    }
    // The bump.
    flash(p, k, s.parked, weight, BUMP_X + CAR_HALF, DECK_Y - 0.1, since, 0.22, 0.08, 0.26)
  },
  over: (p, s, { k, t, ink, weight }) => {
    // The seat's front, in front of the ball: it sits in the car until it is thrown out.
    front(p, k, ink, weight, s.color, carAt(t))
  },
  // Over the grid, above the bump: on the floor it would lie across the cars.
  scores: (p, s, { k, since, bg }) => score(p, k, s.color, bg, BUMP_X + 0.1, GRID_Y + 0.1, '+100', since, 1),
})
