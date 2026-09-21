import { outline, solid } from '../../../../../../src/core/draw'
import { clamp, easeOutQuad } from '../../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, fly, over, post, rail, ramp, roll, trace, wait, type Lane, type Pt } from '../../../parts'
import { feltColor, ivory } from './hall'

/**
 * A great score lying open on a desk a floor down, seen from its foot: two
 * blocks of pages either side of the spine. Its top right-hand leaf is
 * sprung, as a new score's leaves are, and a little catch on the desk holds
 * its edge down. The rail runs out over the book and stops; the ball drops
 * a floor onto the right-hand page with a thud that jumps the catch, and
 * the leaf turns with the ball on it, bowed back by its own haste: up from
 * the right, the ball pressed into its curve, until two thirds of the way
 * to upright it throws the ball on over the spine. The ball comes down on
 * the left-hand page already rolling back the way it came, and runs off the
 * book's edge onto the rail; the leaf stands, floats over after it and lays
 * itself down on the left. The page stays turned.
 *
 * The leaf is one curve of the piece's clock. The ball's seat is a point on
 * that curve while it is carried, and its throw starts with the pace and
 * heading the seat has at the instant it lets go.
 */
/** The spine, on the pages' top, which is level with the rail out; the leaf's length. */
const SX = 0.5
const TOP = 1 + FLOOR
const LEAF = 0.85
const G = 24
/** Where the rail stops, and how the ball comes down onto the page from it. */
const LIP = 0.2
const T_LIP = (LIP + 0.5) / ROLL
const T_FALL = Math.sqrt((2 * 1) / G)
const LAND_X = LIP + ROLL * T_FALL
const T_LAND = T_LIP + T_FALL
/** The thud, then the turn: a steady spin-up to the angle it lets the ball go at, and a slow float over after. */
const THUD = 0.1
const T_TURN = T_LAND + THUD
const LETS_GO = (65 * Math.PI) / 180
const SPIN = 7
const SPIN_UP = (2 * LETS_GO) / SPIN
const FLOAT = (2 * (Math.PI - LETS_GO)) / SPIN
/** How far along the leaf the ball sits: where it landed. */
const U = (LAND_X - SX) / LEAF

/** The leaf's angle from lying on the right, and how fast it is turning, `t` seconds into the piece. */
function turned(t: number): { a: number; w: number } {
  const tau = t - T_TURN
  if (tau <= 0) return { a: 0, w: 0 }
  if (tau < SPIN_UP) return { a: (LETS_GO * tau * tau) / (SPIN_UP * SPIN_UP), w: (SPIN * tau) / SPIN_UP }
  const f = clamp((tau - SPIN_UP) / FLOAT)
  return { a: LETS_GO + (Math.PI - LETS_GO) * easeOutQuad(f), w: SPIN * (1 - f) }
}
/** The leaf as a curve from the spine: its tip, and the middle it is bowed through, which leads the tip by its haste. */
function leafAt(t: number): { mid: Pt; tip: Pt } {
  const { a, w } = turned(t)
  const lead = a + 0.4 * (w / SPIN) * Math.sin(a)
  return { mid: [SX + (LEAF / 2) * Math.cos(lead), TOP - (LEAF / 2) * Math.sin(lead)], tip: [SX + LEAF * Math.cos(a), TOP - LEAF * Math.sin(a)] }
}
/** The ball's centre, seated on the leaf's upper face at `U` along it. */
function seat(t: number): Pt {
  const { mid, tip } = leafAt(t)
  const x = 2 * U * (1 - U) * mid[0] + U * U * tip[0] + (1 - U) * (1 - U) * SX
  const y = 2 * U * (1 - U) * mid[1] + U * U * tip[1] + (1 - U) * (1 - U) * TOP
  const dx = 2 * (1 - U) * (mid[0] - SX) + 2 * U * (tip[0] - mid[0])
  const dy = 2 * (1 - U) * (mid[1] - TOP) + 2 * U * (tip[1] - mid[1])
  const len = Math.hypot(dx, dy)
  // The face the ball is on is the one that leads the turn.
  return [x + (dy / len) * R, y - (dx / len) * R]
}

const T_GO = T_TURN + SPIN_UP
const LANE: Lane = (() => {
  const from = seat(T_GO)
  const before = seat(T_GO - 1e-4)
  const vx = (from[0] - before[0]) / 1e-4
  const vy = (from[1] - before[1]) / 1e-4
  // Thrown: down onto the left-hand page, where its centre is a floor below the rail in.
  const drop = 1 - from[1]
  const T = (-vy + Math.sqrt(vy * vy + 2 * G * drop)) / G
  const land: Pt = [from[0] + vx * T, 1]
  return {
    segs: [
      roll([-0.5, 0], [LIP, 0], ROLL),
      fly([LIP, 0], [LAND_X, 1], T_FALL, 1 / 4),
      wait([LAND_X, 1], THUD),
      ...trace(seat, T_TURN, T_GO, 20),
      fly(from, land, T, (G * T * T) / 8),
      ramp(land, [-0.5, 1], Math.abs(vx), ROLL),
    ],
    fire: T_LAND,
  }
})()

/** The book: how far each block of pages runs from the spine, how thick, and the board under it. */
const HALF = 0.87
const PAGES = 0.11
const BOARD = 0.065

export const score = definePiece<{ color: string }>({
  name: 'score',
  weight: 0.9,
  flight: true,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]
    if (!fits(cells, [-1, 1])) return null
    return { cells, exit: { at: [-1, 1], dir: -1 }, lane: LANE, state: { color: feltColor(theme, color, ball.color) } }
  },
  draw: (p, s, { k, t, since, ink, weight, theme }) => {
    // The rail in, running out over the book to its lip, on a post that stands behind the desk; the rail out, off
    // the book's left edge.
    rail(p, k, ink, weight, -0.5, LIP)
    post(p, k, ink, weight, 0.1, FLOOR, 1.5)
    rail(p, k, ink, weight, -0.5, SX - HALF, TOP)

    // The desk: a top on two legs.
    const desk = TOP + PAGES + BOARD
    outline(p, ink, weight)
    p.line((SX - HALF - 0.1) * k, (desk + 0.02) * k, (SX + HALF + 0.12) * k, (desk + 0.02) * k)
    for (const x of [SX - HALF + 0.1, SX + HALF - 0.08]) p.line(x * k, (desk + 0.02) * k, x * k, 1.5 * k)

    // The book: a board in the cover's colour, and on it two blocks of pages that dip to the spine.
    const thud = since > 0 && since < 0.25 ? 0.012 * Math.sin((Math.PI * since) / 0.25) : 0
    solid(p, ink, weight, s.color)
    p.rect(SX * k, (TOP + PAGES + BOARD / 2) * k, (2 * HALF + 0.16) * k, BOARD * k, 0.02 * k)
    for (const side of [-1, 1]) {
      const top = TOP + (side > 0 ? thud : 0)
      solid(p, ink, weight, ivory(theme))
      p.beginShape()
      p.vertex(SX * k, (TOP + PAGES) * k)
      p.vertex((SX + side * (HALF + 0.035)) * k, (TOP + PAGES) * k)
      p.vertex((SX + side * HALF) * k, top * k)
      p.vertex((SX + side * 0.12) * k, top * k)
      p.quadraticVertex((SX + side * 0.02) * k, top * k, SX * k, (TOP + 0.045) * k)
      p.endShape(p.CLOSE)
      // The leaves' edges: two lines along the block, fanned a little at the fore-edge.
      outline(p, ink, weight * 0.5)
      for (const f of [0.36, 0.68]) p.line((SX + side * 0.05) * k, (TOP + 0.045 + (PAGES - 0.045) * f) * k, (SX + side * (HALF + 0.035 * f)) * k, (top + (TOP + PAGES - top) * f) * k)
    }

    // The catch on the desk's edge that holds the sprung leaf down, knocked open by the thud.
    const open = over(since, 0, 0.08)
    p.push()
    p.translate((SX + HALF + 0.11) * k, (desk + 0.02) * k)
    p.rotate(open * 0.9)
    outline(p, ink, weight)
    p.line(0, 0, 0, -(PAGES + BOARD + 0.045) * k)
    p.line(0, -(PAGES + BOARD + 0.045) * k, -0.13 * k, -(PAGES + BOARD + 0.045) * k)
    p.pop()

    // The leaf: paper seen edge on, bowed by its own haste.
    const { mid, tip } = leafAt(t)
    p.noFill()
    p.stroke(ink)
    p.strokeWeight(weight * 1.15)
    p.beginShape()
    p.vertex(SX * k, (TOP + 0.015) * k)
    p.quadraticVertex(mid[0] * k, mid[1] * k, tip[0] * k, tip[1] * k)
    p.endShape()
  },
})
