import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { clamp, easeInOutSine, easeInQuad, easeOutCubic } from '../../../../../../../../src/core/ease'
import { FLOOR, R, laneAt, type Lane, type Pt } from '../../../../../parts'
import { alpha, box, carried, hash, knock, lastOf, part, route, scenery, smooth, type Ctx, type Way } from '../kit'
import { dropTime, G_EARTH, hop } from '../physics'
import { DUST } from '../worlds'

/**
 * The farmhouse, cut open: Murph's room upstairs, the stairs, the kitchen
 * floor, the porch. The house is drawn once, as scenery, in world cells;
 * the three parts the ball passes through draw what it touches.
 *
 * World levels (the ball's centre): upstairs y = -2, the ground floor y = 0,
 * the yard y = 1. The shelf is entered at (0, -2), the stairs at (3, -2),
 * the porch at (8, 0).
 */

const WALL_L = -1.0
const WALL_R = 8.3
const T_WALL = 0.13
const UP = -2 + FLOOR
const DOWN = FLOOR
const YARD = 1 + FLOOR
const EAVE = -3.78
const PEAK = -5.45
const MID_X = (WALL_L + WALL_R) / 2
/** The stairwell's edge in the upstairs floor, and where the last step meets the ground floor. */
const WELL_L = 4.9
const WELL_R = 6.4
const WINDOW = { x0: 2.95, x1: 3.8, y0: -3.38, y1: -2.5 }
const DOOR_TOP = -1.02

/* ------------------------------------------------------------------ the house */

export const house = scenery<null>({
  name: 'farmhouse',
  draw: (p, _s, c) => {
    const { k, ink, weight } = c
    const X = (x: number) => x * k
    // The rooms: plaster, one tone, and a paler attic.
    p.noStroke()
    p.fill(DUST.wall)
    p.rect(X(MID_X), X((EAVE + YARD) / 2), X(WALL_R - WALL_L), X(YARD - EAVE))
    p.fill(DUST.shade)
    p.triangle(X(WALL_L - 0.2), X(EAVE), X(MID_X), X(PEAK + 0.2), X(WALL_R + 0.2), X(EAVE))
    // Murph's room has paper on the walls: a thin stripe, barely there.
    p.stroke(alpha(p, DUST.shade, 0.55))
    p.strokeWeight(Math.max(1, k * 0.012))
    for (let x = WALL_L + 0.2; x < WELL_L; x += 0.22) p.line(X(x), X(EAVE + 0.05), X(x), X(UP - 0.02))

    // The window over the room, and the light it lets in.
    solid(p, ink, weight, DUST.light)
    p.rect(X((WINDOW.x0 + WINDOW.x1) / 2), X((WINDOW.y0 + WINDOW.y1) / 2), X(WINDOW.x1 - WINDOW.x0), X(WINDOW.y1 - WINDOW.y0))
    outline(p, ink, weight * 0.8)
    p.line(X((WINDOW.x0 + WINDOW.x1) / 2), X(WINDOW.y0), X((WINDOW.x0 + WINDOW.x1) / 2), X(WINDOW.y1))
    p.line(X(WINDOW.x0), X((WINDOW.y0 + WINDOW.y1) / 2), X(WINDOW.x1), X((WINDOW.y0 + WINDOW.y1) / 2))
    // Curtains, tied back.
    solid(p, ink, weight * 0.8, DUST.teal)
    for (const side of [-1, 1]) {
      const x = side < 0 ? WINDOW.x0 : WINDOW.x1
      p.beginShape()
      p.vertex(X(x - side * 0.02), X(WINDOW.y0 - 0.1))
      p.vertex(X(x + side * 0.16), X(WINDOW.y0 - 0.1))
      p.vertex(X(x + side * 0.04), X(WINDOW.y1 - 0.25))
      p.vertex(X(x + side * 0.1), X(WINDOW.y1 + 0.08))
      p.vertex(X(x - side * 0.02), X(WINDOW.y1 + 0.08))
      p.endShape(p.CLOSE)
    }
    outline(p, ink, weight)
    p.line(X(WINDOW.x0 - 0.25), X(WINDOW.y0 - 0.1), X(WINDOW.x1 + 0.25), X(WINDOW.y0 - 0.1))
    // The sill.
    solid(p, ink, weight, DUST.wood)
    p.rect(X((WINDOW.x0 + WINDOW.x1) / 2), X(WINDOW.y1 + 0.03), X(WINDOW.x1 - WINDOW.x0 + 0.16), X(0.06))
    lightShaft(p, k, c.t)

    // Downstairs: a hook by the door with a cap on it, and a calendar.
    outline(p, ink, weight)
    p.line(X(7.55), X(-1.25), X(7.62), X(-1.2))
    solid(p, ink, weight, DUST.denim)
    p.arc(X(7.62), X(-1.08), X(0.26), X(0.2), Math.PI, Math.PI * 2, p.CHORD)
    p.line(X(7.62), X(-1.08), X(7.82), X(-1.08))
    solid(p, ink, weight * 0.8, DUST.bone)
    p.rect(X(6.95), X(-1.1), X(0.3), X(0.36))
    outline(p, ink, weight * 0.6)
    for (let r = 0; r < 3; r++) for (let q = 0; q < 4; q++) p.point(X(6.84 + q * 0.07), X(-1.13 + r * 0.08))

    // Floors, cut: the upstairs floor stops at the stairwell.
    solid(p, ink, weight, DUST.wood)
    p.rect(X((WALL_L + WELL_L) / 2), X(UP + 0.08), X(WELL_L - WALL_L), X(0.16))
    p.rect(X((WALL_L + WALL_R) / 2), X(DOWN + 0.08), X(WALL_R - WALL_L), X(0.16))
    // The ceiling under the attic.
    p.rect(X(MID_X), X(EAVE + 0.06), X(WALL_R - WALL_L), X(0.12))
    // The stone footing the ground floor sits on, a step up from the yard.
    solid(p, ink, weight, DUST.shade)
    p.rect(X(MID_X), X((DOWN + 0.16 + YARD) / 2), X(WALL_R - WALL_L + 0.1), X(YARD - DOWN - 0.16))
    outline(p, ink, weight * 0.6)
    for (let x = WALL_L + 0.3, i = 0; x < WALL_R; x += 0.55, i++) {
      p.line(X(x), X(DOWN + 0.16), X(x), X(YARD))
      p.line(X(x + 0.27), X((DOWN + 0.16 + YARD) / 2), X(x + 0.27 + (i % 2 ? 0.02 : -0.02)), X(YARD))
    }
    p.line(X(WALL_L), X((DOWN + 0.16 + YARD) / 2), X(WALL_R), X((DOWN + 0.16 + YARD) / 2))

    // The stair: a stringer and four treads.
    solid(p, ink, weight, DUST.wood)
    for (let i = 1; i <= 3; i++) {
      const x0 = WELL_L + (i - 1) * 0.5
      p.rect(X(x0 + 0.25), X(UP + i * 0.5 + 0.04), X(0.5), X(0.08))
    }
    outline(p, ink, weight * 1.2)
    p.line(X(WELL_L), X(UP + 0.16), X(WELL_R), X(DOWN + 0.16))
    for (let i = 1; i <= 3; i++) {
      const x0 = WELL_L + (i - 1) * 0.5
      p.line(X(x0), X(UP + (i - 1) * 0.5), X(x0), X(UP + i * 0.5))
    }
    // A banister.
    outline(p, ink, weight)
    p.line(X(WELL_L + 0.1), X(UP - 0.55), X(WELL_R + 0.1), X(DOWN - 0.55))
    p.line(X(WELL_L + 0.1), X(UP - 0.55), X(WELL_L + 0.1), X(UP))
    p.line(X(WELL_R + 0.1), X(DOWN - 0.55), X(WELL_R + 0.1), X(DOWN))
    for (let i = 1; i < 6; i++) {
      const x = WELL_L + 0.1 + i * 0.25
      const y = UP - 0.55 + i * 0.25 * ((DOWN - UP) / (WELL_R - WELL_L))
      p.line(X(x), X(y), X(x), X(y + 0.55 - 0.02))
    }

    // The walls, cut: the back of the house, and the front with the door in it.
    solid(p, ink, weight, DUST.bone)
    p.rect(X(WALL_L), X((EAVE + YARD) / 2), X(T_WALL), X(YARD - EAVE))
    p.rect(X(WALL_R), X((EAVE + DOOR_TOP) / 2), X(T_WALL), X(DOOR_TOP - EAVE))
    p.rect(X(WALL_R), X((DOWN + 0.16 + YARD) / 2), X(T_WALL), X(YARD - DOWN - 0.16))
    // The door frame's head.
    solid(p, ink, weight, DUST.wood)
    p.rect(X(WALL_R), X(DOOR_TOP + 0.03), X(0.24), X(0.06))

    // The roof: a gable, its boards cut, and a chimney.
    const over = 0.35
    solid(p, ink, weight, DUST.rust)
    p.beginShape()
    p.vertex(X(WALL_L - over), X(EAVE + 0.05))
    p.vertex(X(MID_X), X(PEAK - 0.02))
    p.vertex(X(WALL_R + over), X(EAVE + 0.05))
    p.vertex(X(WALL_R + over), X(EAVE - 0.08))
    p.vertex(X(MID_X), X(PEAK - 0.2))
    p.vertex(X(WALL_L - over), X(EAVE - 0.08))
    p.endShape(p.CLOSE)
    solid(p, ink, weight, DUST.bone)
    p.beginShape()
    const cx0 = 0.9
    const cx1 = 1.35
    const roofY = (x: number) => EAVE + ((x - (WALL_L - over)) / (MID_X - (WALL_L - over))) * (PEAK - EAVE)
    p.vertex(X(cx0), X(roofY(cx0) - 0.1))
    p.vertex(X(cx0), X(PEAK - 0.35))
    p.vertex(X(cx1), X(PEAK - 0.35))
    p.vertex(X(cx1), X(roofY(cx1) - 0.1))
    p.endShape(p.CLOSE)
    p.rect(X((cx0 + cx1) / 2), X(PEAK - 0.38), X(cx1 - cx0 + 0.08), X(0.07))
  },
})

/** Light from Murph's window: drawn over the room, under everything in it. */
function lightShaft(p: p5, k: number, t: number): void {
  const X = (x: number) => x * k
  const Y = X
  const a = 0.5 * smooth(t, 1.5, 6)
  if (a <= 0) return
  p.noStroke()
  p.fill(alpha(p, DUST.light, a))
  p.beginShape()
  p.vertex(X(WINDOW.x0 + 0.02), Y(WINDOW.y0 + 0.05))
  p.vertex(X(WINDOW.x1 - 0.02), Y(WINDOW.y0 + 0.05))
  p.vertex(X(WINDOW.x1 + 1.35), Y(UP))
  p.vertex(X(WINDOW.x0 + 0.95), Y(UP))
  p.endShape(p.CLOSE)
}

/* ------------------------------------------------------------------ the shelf */

/**
 * Murph's bookcase. A ghost sits behind the top shelf in the dark, and when
 * the piano starts it goes along the row. The model lander goes first, as it
 * does in the film; then ten books drop, one to a note, short and tall:
 * dot dot dot, dash, dot dash, dash dot dash dash. At the end of the shelf
 * the ghost goes through the side of the case, and when it lands on the
 * floorboards it is a ball.
 */
const CASE_L = -0.45
const CASE_R = 2.0
const CAP = -1.42
const TOP = -0.82
const MID = -0.36
const BALL_Y = TOP - R
const SHORT = 0.25
const TALL = 0.38

interface Fallen {
  x: number
  w: number
  h: number
  color: string
  /** Seconds into the part at which the ghost reaches it. */
  hit: number
  /** Where it comes to rest, lying: its centre, and which way it turned. */
  land: Pt
  turn: 1 | -1
}

interface ShelfState {
  lane: Lane
  books: Fallen[]
  lander: { x: number; hit: number }
  /** Seconds into the part: the ghost leaves the shelf, and lands. */
  off: number
  landed: number
}

const MORSE = '... - .- -.--'
const SHELF_HITS = [7.245, 7.546, 7.86, 8.499, 9.125, 9.509, 10.136, 10.356, 11.169, 11.622]
const BOOK_COLORS = [DUST.rust, DUST.teal, DUST.corn, DUST.denim, DUST.sage, DUST.bone]

export const SHELF_NOTES = [5.126, ...SHELF_HITS]

/**
 * The ten books of the top shelf as they stand before the ghost comes, in the
 * shelf's own cells (the top board's surface at TOP = -0.82, the ball's
 * level on it at -0.95): their centres, widths, heights and colours, in the
 * order they fall. The tesseract shows this same row from behind.
 */
export function stayRow(): { x: number; w: number; h: number; color: string; dash: boolean }[] {
  const out: { x: number; w: number; h: number; color: string; dash: boolean }[] = []
  let x = 0.04
  let letter = 0
  let i = 0
  for (const ch of MORSE) {
    if (ch === ' ') {
      x += 0.035
      letter++
      continue
    }
    const w = ch === '.' ? 0.075 : 0.115
    const h = ch === '.' ? SHORT : TALL
    out.push({ x: x + w / 2, w, h, color: BOOK_COLORS[(i * 5 + letter) % BOOK_COLORS.length], dash: ch === '-' })
    x += w + 0.012
    i++
  }
  return out
}
export const SHELF_TOP = TOP

export const shelf = part<ShelfState>(
  {
    name: 'bookcase',
    dynamic: true,
    draw: (p, s, c) => drawShelf(p, s, c),
    over: (p, s, c) => {
      // While it is a ghost it gives off a little light of its own: the only light in the room before the dawn.
      const fade = 1 - smooth(c.t, s.landed - 0.05, s.landed + 0.25)
      if (fade <= 0) return
      const at = laneAt(s.lane, c.t)
      const ctx = p.drawingContext as CanvasRenderingContext2D
      const X = at.x * c.k
      const Y = at.y * c.k
      const g = ctx.createRadialGradient(X, Y, 0, X, Y, 0.42 * c.k)
      const a = fade * (0.35 + 0.25 * (1 - smooth(c.t, 3, 7)))
      g.addColorStop(0, `rgba(255, 246, 214, ${a})`)
      g.addColorStop(0.35, `rgba(255, 236, 190, ${a * 0.5})`)
      g.addColorStop(1, 'rgba(255, 236, 190, 0)')
      ctx.fillStyle = g
      ctx.fillRect(X - 0.42 * c.k, Y - 0.42 * c.k, 0.84 * c.k, 0.84 * c.k)
    },
  },
  (slot) => {
    const at = (t: number) => t - slot.begin
    // The row: short and tall books shoulder to shoulder, a thin gap between letters.
    const books: Fallen[] = stayRow().map((b, i) => ({ x: b.x, w: b.w, h: b.h, color: b.color, hit: at(SHELF_HITS[i]), land: [0, 0], turn: i % 2 ? 1 : -1 }))
    // Where they come to rest: dropped in front of the case, lying, each on whatever fell before it.
    const rests: { x0: number; x1: number; top: number }[] = []
    books.forEach((b, j) => {
      const lx = b.x + (hash(j, 7) - 0.5) * 0.16 + (j % 2 ? 0.05 : -0.05)
      const x0 = lx - b.h / 2
      const x1 = lx + b.h / 2
      let floor = FLOOR
      for (const r of rests) if (r.x1 > x0 + 0.03 && r.x0 < x1 - 0.03) floor = Math.min(floor, r.top)
      b.land = [lx, floor - b.w / 2]
      rests.push({ x0, x1, top: floor - b.w })
    })
    const lander = { x: -0.13, hit: at(5.126) }
    const off = at(12.016)
    const landed = at(12.283)
    const ways: Way[] = [
      { at: 0, p: [-0.31, BALL_Y] },
      { at: at(4.5), p: [-0.31, BALL_Y] },
      { at: lander.hit, p: [lander.x, BALL_Y], ease: 'inout' },
      ...books.map((b) => ({ at: b.hit, p: [b.x, BALL_Y] as Pt })),
      { at: off, p: [CASE_R, BALL_Y] },
    ]
    const from = ways[ways.length - 1]
    // Off the end of the shelf, through the side of the case, and into the robot's arm.
    ways.push(hop(from, [2.33, CATCH_Y], landed))
    const lane: Lane = { segs: route(ways), fire: lander.hit }
    return {
      cells: box(-1, -2, 2, 0),
      exit: [2.83, CATCH_Y],
      lane,
      state: { lane, books, lander, off, landed },
      changes: [{ at: landed, ghost: false }],
    }
  },
)

/** A book falling from the shelf: where its centre is and how far it has turned, `since` seconds after the ghost reached it. */
function bookAt(b: Fallen, since: number): { x: number; y: number; a: number } {
  const x0 = b.x
  const y0 = TOP - b.h / 2
  if (since < 0) return { x: x0, y: y0, a: 0 }
  // It is eased out of the row first, a lean toward us, and then it goes.
  const lean = 0.12
  if (since < lean) {
    const u = easeOutCubic(since / lean)
    return { x: x0, y: y0 - 0.02 * u, a: b.turn * 0.18 * u }
  }
  const f = since - lean
  const drop = b.land[1] - y0
  const T = dropTime(drop)
  if (f < T) {
    const u = f / T
    return { x: x0 + (b.land[0] - x0) * u, y: y0 + 0.5 * G_EARTH * f * f, a: b.turn * (0.18 + (Math.PI / 2 - 0.18) * easeInOutSine(u)) }
  }
  // Down: a knock and a settle.
  const after = f - T
  const rock = Math.exp(-after / 0.12) * Math.sin(after * 40) * 0.08
  return { x: b.land[0], y: b.land[1], a: b.turn * (Math.PI / 2 + rock) }
}

function drawShelf(p: p5, s: ShelfState, c: Ctx): void {
  const { k, t, ink, weight } = c
  const X = (x: number) => x * k
  // The case: its back in shadow, sides, cap and boards.
  solid(p, ink, weight, DUST.shade)
  p.rect(X((CASE_L + CASE_R) / 2), X((CAP + FLOOR) / 2), X(CASE_R - CASE_L), X(FLOOR - CAP))
  solid(p, ink, weight, DUST.wood)
  for (const x of [CASE_L + 0.035, CASE_R - 0.035]) p.rect(X(x), X((CAP + FLOOR) / 2), X(0.07), X(FLOOR - CAP))
  p.rect(X((CASE_L + CASE_R) / 2), X(CAP - 0.03), X(CASE_R - CASE_L + 0.1), X(0.07))
  for (const y of [TOP, MID]) p.rect(X((CASE_L + CASE_R) / 2), X(y + 0.025), X(CASE_R - CASE_L - 0.14), X(0.05))
  p.rect(X((CASE_L + CASE_R) / 2), X(FLOOR - 0.04), X(CASE_R - CASE_L - 0.14), X(0.08))

  // The middle shelf: books that stay, one leaning.
  const row = [
    [0.1, 0.3, DUST.denim], [0.09, 0.32, DUST.bone], [0.12, 0.28, DUST.rust], [0.08, 0.3, DUST.sage], [0.1, 0.34, DUST.corn],
    [0.11, 0.3, DUST.teal], [0.09, 0.26, DUST.rust], [0.12, 0.33, DUST.bone],
  ] as const
  let x = CASE_L + 0.1
  for (const [w, h, color] of row) {
    book(p, c, x + w / 2, MID, w, h, color, 0)
    x += w + 0.01
  }
  book(p, c, x + 0.17, MID, 0.1, 0.3, DUST.sage, 0.45)
  // A jar of pencils and a box on the bottom shelf, and a stack lying down.
  solid(p, ink, weight, DUST.light)
  p.rect(X(1.55), X(MID + 0.05 + 0.13), X(0.18), X(0.22), X(0.02))
  outline(p, ink, weight * 0.8)
  for (const dx of [-0.04, 0.0, 0.05]) p.line(X(1.55 + dx), X(MID + 0.1), X(1.55 + dx * 1.8), X(MID - 0.02))
  for (let j = 0; j < 3; j++) {
    const w = 0.5 - j * 0.06
    solid(p, ink, weight, [DUST.teal, DUST.rust, DUST.corn][j])
    p.rect(X(-0.1 + j * 0.03), X(FLOOR - 0.08 - 0.045 - j * 0.09), X(w), X(0.09))
  }
  solid(p, ink, weight, DUST.sage)
  p.rect(X(0.85), X(FLOOR - 0.08 - 0.13), X(0.4), X(0.26), X(0.01))
  outline(p, ink, weight * 0.6)
  p.line(X(0.65), X(FLOOR - 0.08 - 0.2), X(1.05), X(FLOOR - 0.08 - 0.2))
  for (let j = 0; j < 5; j++) {
    const bx = 1.3 + j * 0.1
    book(p, c, bx, FLOOR - 0.08, 0.09, 0.28 - (j % 2) * 0.03, BOOK_COLORS[(j + 2) % 6], 0)
  }

  // The watch, left on top of the case: a round face, its strap, the hand going round.
  const wx = 1.45
  const wy = CAP - 0.06 - 0.05
  solid(p, ink, weight * 0.8, DUST.wood)
  p.rect(X(wx - 0.13), X(wy + 0.03), X(0.14), X(0.04), X(0.01))
  p.rect(X(wx + 0.13), X(wy + 0.03), X(0.14), X(0.04), X(0.01))
  solid(p, ink, weight * 0.8, DUST.bone)
  p.ellipse(X(wx), X(wy), X(0.13), X(0.1))
  outline(p, ink, weight * 0.6)
  const sec = Math.floor(t) * (Math.PI / 30) - Math.PI / 2
  p.line(X(wx), X(wy), X(wx + Math.cos(sec) * 0.045), X(wy + Math.sin(sec) * 0.035))

  // The lander model: over the edge on the first note, and down on its side.
  lander(p, c, s.lander.x, t - s.lander.hit)

  // The row of ten, standing until the ghost comes; then down, one to a note.
  for (const b of s.books) {
    const at = bookAt(b, t - b.hit)
    p.push()
    p.translate(X(at.x), X(at.y))
    p.rotate(at.a)
    book(p, c, 0, b.h / 2, b.w, b.h, b.color, 0)
    p.pop()
  }
  // A thud of dust where each one lands.
  p.noStroke()
  for (const b of s.books) {
    const since = t - b.hit - 0.12 - dropTime(b.land[1] - (TOP - b.h / 2))
    if (since < 0 || since > 0.6) continue
    const u = since / 0.6
    p.fill(alpha(p, DUST.shade, 0.7 * (1 - u)))
    for (const side of [-1, 1]) p.circle(X(b.land[0] + side * (b.h / 2 + 0.05 + u * 0.12)), X(b.land[1] + b.w / 2 - 0.02 - u * 0.04), X(0.05 + u * 0.05))
  }

  // Where the ghost comes down it becomes a ball, in the robot's arm: a ring goes out from it.
  const since = t - s.landed
  if (since >= 0 && since < 0.9) {
    const u = since / 0.9
    outline(p, ink, weight * (1 - u))
    p.stroke(alpha(p, ink, 0.6 * (1 - u)))
    p.circle(X(2.33), X(CATCH_Y), X(0.3 + u * 0.9))
  }
}

/** A book standing with its foot at `(x, foot)`, spine out: the spine's bands, and a label with nothing on it. */
function book(p: p5, c: Ctx, x: number, foot: number, w: number, h: number, color: string, lean: number): void {
  const { k, ink, weight } = c
  p.push()
  p.translate(x * k, foot * k)
  p.rotate(lean)
  solid(p, ink, weight * 0.9, color)
  p.rect(0, (-h / 2) * k, w * k, h * k, 0.008 * k)
  outline(p, ink, weight * 0.55)
  p.line((-w / 2) * k, (-h + 0.035) * k, (w / 2) * k, (-h + 0.035) * k)
  p.line((-w / 2) * k, -0.035 * k, (w / 2) * k, -0.035 * k)
  if (h > 0.26) p.rect(0, (-h * 0.55) * k, w * 0.5 * k, 0.05 * k)
  p.pop()
}

/** The model lander: gold foil, four legs, the ascent stage on top. Knocked at since = 0, it goes over and lies on its side. */
function lander(p: p5, c: Ctx, x0: number, since: number): void {
  const { k, ink, weight } = c
  let x = x0
  let y = TOP
  let a = 0
  if (since >= 0) {
    const tip = 0.25
    if (since < tip) a = -0.5 * easeOutCubic(since / tip)
    else {
      const f = since - tip
      const T = dropTime(FLOOR - TOP)
      const u = Math.min(1, f / T)
      x = x0 - 0.18 * u
      y = TOP + Math.min(FLOOR - TOP, 0.5 * G_EARTH * f * f)
      a = -0.5 - (Math.PI / 2 - 0.5 + 0.35) * easeInOutSine(u)
      if (f > T) a += Math.exp(-(f - T) / 0.1) * Math.sin((f - T) * 30) * 0.12
    }
  }
  p.push()
  p.translate(x * k, y * k)
  p.rotate(a)
  outline(p, ink, weight * 0.7)
  for (const s of [-1, 1]) {
    p.line(s * 0.04 * k, -0.07 * k, s * 0.09 * k, 0)
    p.line(s * 0.11 * k, 0, s * 0.07 * k, 0)
  }
  solid(p, ink, weight * 0.8, DUST.corn)
  p.rect(0, -0.08 * k, 0.12 * k, 0.06 * k)
  solid(p, ink, weight * 0.8, DUST.bone)
  p.beginShape()
  p.vertex(-0.05 * k, -0.11 * k)
  p.vertex(0.05 * k, -0.11 * k)
  p.vertex(0.035 * k, -0.17 * k)
  p.vertex(-0.035 * k, -0.17 * k)
  p.endShape(p.CLOSE)
  outline(p, ink, weight * 0.6)
  p.line(0, -0.17 * k, 0, -0.2 * k)
  p.pop()
}

/* ------------------------------------------------------------------ the robot */

/**
 * Murph's toy robot: four tall slabs on a hinge, knee-high to the bookcase,
 * one arm. In the dark it stands just clear of the end of the case with its
 * arm out flat.
 * As the last book goes it raises the arm with a click, and the ghost falls
 * off the shelf through the side of the case into its crook and is a ball
 * there, settling as the robot takes its first step. Then it walks him
 * across the room, a footfall to a note, through the window's light, where
 * the dust has started coming down in bands the width of a finger and of a
 * hand — the pattern that turns out to be coordinates — and at the stairwell
 * it lowers its arm like a ramp and he rolls off over the lip.
 *
 * The part's frame: the ball in its arm at (-0.5, 0) on the catch; the
 * floor's surface at y = 0.64 (the ball on the floor is at 0.51).
 */
const TOY_W = 0.24
const ARM = 0.44
/** The arm: out flat in the dark, raised to catch, and down like a ramp at the stairwell, its end just off the boards. */
const REST = 0
const HELD = -0.45
const LOWERED = 0.95
/** It stands just clear of the case's side (its body's near edge, in the shelf's cells); its arm's hinge is at the body's far edge. */
const STAND = CASE_R + 0.045
/** Where the ghost lands in the arm, in the shelf's cells: the shelf's exit, less half a cell. */
const CATCH_X = 2.83 - 0.5
/** Along the arm from its hinge: where he lands, as far as the arm reaches from where it stands; and its crook, where a ball touches the body's top corner. */
const CATCH_D = (CATCH_X - (STAND + TOY_W) - Math.sin(HELD) * R) / Math.cos(HELD)
const CROOK = (-0.08 * Math.sin(HELD) + Math.sqrt((0.08 * Math.sin(HELD)) ** 2 - 4 * (0.0016 - 0.08 * R * Math.cos(HELD)))) / 2
/** The floor under the robot, in its frame: where it has always been, so the catch is where it always was; the robot is built to it. */
const TOY_FLOOR = 0.42 - Math.sin(-0.45) * 0.24 + Math.cos(-0.45) * R
const TOY_H = TOY_FLOOR + 0.04 + Math.sin(HELD) * CATCH_D - Math.cos(HELD) * R
/** Where the robot's frame sits in the world (y), and so where the ghost is caught, in the shelf's frame. */
const TOY_ROW = UP - TOY_FLOOR
const CATCH_Y = TOY_ROW + 2
const FOOTFALLS = [12.632, 13.497, 14.124, 14.745, 15.139]
const LIP = 15.743
/** The arm goes up as the last book goes down, and is up on the next note. */
const RAISE: [number, number] = [11.64, 11.819]
/** Where the lip of the stairwell is, in this frame: the world's 4.9, less the part's origin 2.83. */
const LIP_X = WELL_L - 2.83
export const TOY_NOTES = [...FOOTFALLS]

interface ToyState {
  begin: number
  x0: number
  x1: number
  bands: { x: number; w: number; at: number }[]
}

/** The dust: five bands, narrow and wide, each starting on a note. 1 0 1 1 0 in the only code the room knows. */
const BANDS: [number, number, number][] = [
  [0.89, 0.1, 12.632],
  [1.07, 0.04, 13.497],
  [1.22, 0.1, 14.124],
  [1.41, 0.1, 14.745],
  [1.59, 0.04, 15.139],
]
export const DUST_NOTES = BANDS.map((b) => b[2])

/** How far through its walk it is: the body's x, the step it is in (0..1) and which pair of slabs leads. */
function walk(s: ToyState, t: number): { x: number; u: number; lead: number; bob: number } {
  const stride = (s.x1 - s.x0) / FOOTFALLS.length
  let from = s.begin
  for (let i = 0; i < FOOTFALLS.length; i++) {
    const to = FOOTFALLS[i]
    if (t < to) {
      const u = t <= from ? 0 : (t - from) / (to - from)
      return { x: s.x0 + stride * (i + easeInOutSine(u)), u, lead: i % 2, bob: Math.sin(u * Math.PI) }
    }
    from = to
  }
  return { x: s.x1, u: 0, lead: 0, bob: 0 }
}

/** The arm's angle: flat, raised with a click, a dip when he drops into it, down like a ramp at the stairwell. */
function armAt(s: ToyState, t: number): number {
  const up = easeInOutSine(clamp((t - RAISE[0]) / (RAISE[1] - RAISE[0])))
  const click = t > RAISE[1] ? -0.05 * Math.exp(-(t - RAISE[1]) / 0.07) * Math.sin((t - RAISE[1]) * 40) : 0
  const caught = t - s.begin
  const dip = caught > 0 ? 0.3 * Math.exp(-caught / 0.14) * Math.sin(caught * 16) : 0
  const lower = easeInOutSine(clamp((t - FOOTFALLS[FOOTFALLS.length - 1] - 0.05) / 0.3))
  return REST + (HELD - REST) * up + (click + dip) * (1 - lower) + (LOWERED - HELD) * lower
}

/** The arm's hinge, riding the walk. */
function hingeAt(s: ToyState, t: number): Pt {
  const { x, bob } = walk(s, t)
  return [x + TOY_W / 2, TOY_FLOOR - TOY_H + 0.04 - bob * 0.03]
}

/** A ball on the arm, `d` out from the hinge. */
function onArm(s: ToyState, t: number, d: number): Pt {
  const a = armAt(s, t)
  const [px, py] = hingeAt(s, t)
  return [px + Math.cos(a) * d + Math.sin(a) * R, py + Math.sin(a) * d - Math.cos(a) * R]
}

/** Where he is on the arm: rolled down into the crook after the catch, knocking home on the first step; rolling out along it once it tips past flat. */
function cradle(s: ToyState, t: number): Pt {
  const since = t - s.begin
  const roll = FOOTFALLS[0] - s.begin
  const rest = since < roll ? CATCH_D - (CATCH_D - CROOK) * easeInQuad(clamp(since / roll)) : CROOK
  const tip = clamp((armAt(s, t) - 0.05) / (LOWERED - 0.05))
  return onArm(s, t, rest + (ARM - rest) * tip * tip)
}

export const toy = part<ToyState>(
  {
    name: 'robot',
    draw: (p, s, c) => drawToy(p, s, c),
  },
  (slot) => {
    const at = (t: number) => t - slot.begin
    const s: ToyState = { begin: slot.begin, x0: 0, x1: 0, bands: BANDS.map(([x, w, n]) => ({ x, w, at: n })) }
    // Where it stands to catch, and where it stops: the ball in the arm at (-0.5, 0), and the lowered arm's end just short of the lip.
    s.x0 = -0.5 - (Math.cos(HELD) * CATCH_D + Math.sin(HELD) * R) - TOY_W / 2
    s.x1 = LIP_X - 0.1 - (Math.cos(LOWERED) * ARM + Math.sin(LOWERED) * R) - TOY_W / 2
    const off = FOOTFALLS[FOOTFALLS.length - 1] + 0.36
    const ride = (t: number) => cradle(s, t + slot.begin)
    const segs = [...carried(ride, 0, at(off), Math.ceil(at(off) * 40))]
    segs.push(...route([{ at: at(off), p: ride(at(off)) }, { at: at(LIP), p: [LIP_X, TOY_FLOOR - R] }]))
    return {
      cells: box(-1.5, -2, LIP_X + 0.5, 1),
      exit: [LIP_X + 0.5, TOY_FLOOR - R],
      lane: { segs, fire: at(FOOTFALLS[0]) },
      state: s,
    }
  },
)

function drawToy(p: p5, s: ToyState, c: Ctx): void {
  const { k, ink, weight } = c
  const t = c.t + s.begin
  const X = (x: number) => x * k
  // Dust coming down in the light: fine grains in bands, and a ridge growing on the boards under each.
  const top = EAVE + 0.1 - TOY_ROW
  for (let i = 0; i < s.bands.length; i++) {
    const b = s.bands[i]
    const since = t - b.at
    if (since < -0.1) continue
    const on = smooth(since, -0.1, 0.5)
    p.noStroke()
    const grains = Math.round(b.w * 160)
    for (let g = 0; g < grains; g++) {
      const gx = b.x + (hash(i, g, 3) - 0.5) * b.w
      const speed = 0.35 + hash(i, g, 5) * 0.25
      const fallen = ((t * speed + hash(i, g, 9) * 2.1) % 2.1) / 2.1
      const gy = top + fallen * (TOY_FLOOR - top)
      if (gy > top + (since + 0.1) * 1.8) continue
      p.fill(alpha(p, ink, 0.45 * on * (0.4 + 0.6 * Math.sin(fallen * Math.PI))))
      p.circle(X(gx), X(gy), Math.max(1.2, X(0.012)))
    }
    const grown = smooth(since, 0.2, 3)
    if (grown > 0) {
      p.fill(alpha(p, DUST.shade, 0.9))
      p.stroke(alpha(p, ink, 0.5))
      p.strokeWeight(Math.max(0.8, k * 0.008))
      p.ellipse(X(b.x), X(TOY_FLOOR), X(b.w * (0.9 + 0.2 * grown)), X(0.04 * grown))
    }
  }

  // The robot: four slabs on one hinge, in two pairs; a pair steps out ahead of the other, a footfall to a note.
  const { x, u, lead, bob } = walk(s, t)
  const half = TOY_W / 2
  const reach = (s.x1 - s.x0) / FOOTFALLS.length
  const moving = t > s.begin && t < FOOTFALLS[FOOTFALLS.length - 1]
  for (const pair of [0, 1]) {
    const leads = moving && pair === lead
    const dx = moving ? (leads ? 0.17 : -0.06) * reach * Math.sin(u * Math.PI) : 0
    const lift = leads ? 0.04 * Math.sin(u * Math.PI) : 0
    const cx = x + (pair ? half / 2 : -half / 2) + dx
    const cy = TOY_FLOOR - TOY_H / 2 - lift - bob * 0.03
    solid(p, ink, weight * 0.9, pair ? DUST.tin : '#9A9486')
    p.rect(X(cx), X(cy), X(half), X(TOY_H), X(0.012))
    outline(p, ink, weight * 0.45)
    p.line(X(cx), X(cy - TOY_H / 2 + 0.03), X(cx), X(cy + TOY_H / 2 - 0.03))
  }
  // The hinge across the top, and the little lit panel in the front slab.
  outline(p, ink, weight * 0.8)
  const hy = TOY_FLOOR - TOY_H + 0.05 - bob * 0.03
  p.line(X(x - TOY_W / 2), X(hy), X(x + TOY_W / 2), X(hy))
  const step = lastOf(FOOTFALLS, t)
  const blink = step.ago < 0.15 ? 1 : 0.55
  solid(p, ink, weight * 0.5, blink > 0.9 ? DUST.light : '#3A3F3A')
  p.rect(X(x + TOY_W * 0.22), X(hy + 0.07), X(TOY_W * 0.32), X(0.06))
  // A scuff of dust at each footfall.
  if (step.ago < 0.35) {
    const q = step.ago / 0.35
    p.noStroke()
    p.fill(alpha(p, DUST.shade, 0.7 * (1 - q)))
    for (const side of [-1, 1]) p.circle(X(x + side * (0.14 + q * 0.1)), X(TOY_FLOOR - 0.02 - q * 0.03), X(0.035 + q * 0.03))
  }
  // The arm, off the top of the front slab: held up, then down like a ramp.
  const a = armAt(s, t)
  const pivot: Pt = [x + TOY_W / 2, TOY_FLOOR - TOY_H + 0.04 - bob * 0.03]
  p.push()
  p.translate(X(pivot[0]), X(pivot[1]))
  p.rotate(a)
  solid(p, ink, weight * 0.8, DUST.tin)
  p.rect(X(ARM / 2), 0, X(ARM), X(0.045), X(0.01))
  p.pop()
  solid(p, ink, weight * 0.6, DUST.bone)
  p.circle(X(pivot[0]), X(pivot[1]), X(0.05))
}

/**
 * Where the robot stood in the dark, its arm out flat: the middle of its body and the floor under it,
 * in the house's own cells (the `house` scenery's, the shelf's less two rows). The rooms that remember the
 * opening (the dusk room at the end of Act I, the museum's replica) stand it there again, its arm out and empty.
 */
export const TOY_HOME: Pt = [2.83 - 0.5 - (Math.cos(HELD) * CATCH_D + Math.sin(HELD) * R) - TOY_W / 2, UP]

/** The robot standing still with its arm at `arm` (flat is 0), its body's middle at `x`, on a floor at `floor`, in the caller's cells. */
export function drawRobot(p: p5, c: { k: number; ink: string; weight: number }, x: number, floor: number, arm = REST): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const half = TOY_W / 2
  for (const pair of [0, 1]) {
    const cx = x + (pair ? half / 2 : -half / 2)
    solid(p, ink, weight * 0.9, pair ? DUST.tin : '#9A9486')
    p.rect(X(cx), X(floor - TOY_H / 2), X(half), X(TOY_H), X(0.012))
    outline(p, ink, weight * 0.45)
    p.line(X(cx), X(floor - TOY_H + 0.03), X(cx), X(floor - 0.03))
  }
  outline(p, ink, weight * 0.8)
  const hy = floor - TOY_H + 0.05
  p.line(X(x - half), X(hy), X(x + half), X(hy))
  solid(p, ink, weight * 0.5, '#3A3F3A')
  p.rect(X(x + TOY_W * 0.22), X(hy + 0.07), X(TOY_W * 0.32), X(0.06))
  p.push()
  p.translate(X(x + half), X(floor - TOY_H + 0.04))
  p.rotate(arm)
  solid(p, ink, weight * 0.8, DUST.tin)
  p.rect(X(ARM / 2), 0, X(ARM), X(0.045), X(0.01))
  p.pop()
  solid(p, ink, weight * 0.6, DUST.bone)
  p.circle(X(x + half), X(floor - TOY_H + 0.04), X(0.05))
}

/* ------------------------------------------------------------------ the stairs */

/**
 * Down the stairs a step to a note: off the lip, and each tread in turn,
 * quicker as it goes.
 *
 * The part's frame: the ball at the stairwell's lip (-0.5, 0), the world's
 * (4.9, -2); the treads are half a cell each way.
 */
interface Landing {
  at: number
  x: number
  /** The surface's height, where the dust comes off. */
  y: number
}

interface StairState {
  landings: Landing[]
}

const STEP_NOTES = [16.01, 16.353, 16.62, 17.02]
export const STAIR_NOTES = STEP_NOTES

export const stairs = part<StairState>(
  {
    name: 'stairs',
    draw: (p, s, c) => drawLandings(p, s.landings, c),
  },
  (slot) => {
    const at = (t: number) => t - slot.begin
    const landX = [-0.38, 0.12, 0.63, 1.22]
    const ways: Way[] = [{ at: 0, p: [-0.5, 0] }]
    let last = ways[0]
    STEP_NOTES.forEach((n, i) => {
      const w = hop(last, [landX[i], 0.5 * (i + 1)], at(n))
      ways.push(w)
      last = w
    })
    ways.push({ at: slot.end - slot.begin, p: [2.1, 2] })
    return {
      cells: box(-0.5, -2, 2.6, 2),
      exit: [2.6, 2],
      lane: { segs: route(ways), fire: at(STEP_NOTES[0]) },
      state: { landings: STEP_NOTES.map((n, i) => ({ at: at(n), x: landX[i], y: 0.5 * (i + 1) + R })) },
    }
  },
)

/** Where the ball lands on a step or a tread: a small scuff of dust off it, and the board's knock. */
function drawLandings(p: p5, landings: Landing[], c: Ctx): void {
  const { k, t, ink } = c
  const X = (x: number) => x * k
  for (const l of landings) {
    const since = t - l.at
    if (since < 0 || since > 0.45) continue
    const u = since / 0.45
    p.noStroke()
    p.fill(alpha(p, DUST.shade, 0.8 * (1 - u)))
    for (const side of [-1, 1]) p.circle(X(l.x + side * (0.12 + u * 0.12)), X(l.y - 0.02 - u * 0.05), X(0.04 + u * 0.04))
    p.stroke(alpha(p, ink, 0.5 * knock(since, 0.1)))
    p.strokeWeight(Math.max(1, k * 0.012))
    p.line(X(l.x - 0.2), X(l.y + 0.03), X(l.x + 0.2), X(l.y + 0.03))
  }
}

/* ------------------------------------------------------------------ the porch */

/**
 * Out through the door onto the porch — the old man's chair, rocking a
 * little in the draught the ball lets out — and down the three steps into the
 * yard, one to a note.
 */
interface PorchState {
  landings: Landing[]
  out: number
}

const PORCH_NOTES = [18.669, 18.901, 19.127]
export const PORCH_STEPS = PORCH_NOTES
const DECK_END = 1.9

export const porch = part<PorchState>(
  {
    name: 'porch',
    draw: (p, s, c) => drawPorch(p, s, c),
    over: (p, _s, c) => {
      // The post at the top of the steps stands in front of the ball.
      const { k, ink, weight } = c
      solid(p, ink, weight, DUST.bone)
      p.rect(DECK_END * k - 0.04 * k, (-1.2 + FLOOR) / 2 * k - 0.02 * k, 0.08 * k, (FLOOR + 1.2) * k)
    },
  },
  (slot) => {
    const at = (t: number) => t - slot.begin
    const landX = [DECK_END + 0.2, DECK_END + 0.6, DECK_END + 1.0]
    const leave = at(PORCH_NOTES[0]) - dropTime(1 / 3)
    const ways: Way[] = [{ at: 0, p: [-0.5, 0] }, { at: leave, p: [DECK_END, 0] }]
    let last = ways[1]
    PORCH_NOTES.forEach((n, i) => {
      const w = hop(last, [landX[i], (i + 1) / 3], at(n))
      ways.push(w)
      last = w
    })
    ways.push({ at: slot.end - slot.begin, p: [4.5, 1] })
    return {
      cells: box(-0.5, -1, 4.5, 1),
      exit: [5, 1],
      lane: { segs: route(ways), fire: at(PORCH_NOTES[0]) },
      state: { landings: PORCH_NOTES.map((n, i) => ({ at: at(n), x: landX[i], y: (i + 1) / 3 + R })), out: at(18.065) },
    }
  },
)

function drawPorch(p: p5, s: PorchState, c: Ctx): void {
  const { k, t, ink, weight } = c
  const X = (x: number) => x * k
  const wall = WALL_R - 8
  // The deck on its joists, and the steps.
  solid(p, ink, weight, DUST.wood)
  p.rect(X((wall + DECK_END) / 2), X(FLOOR + 0.05), X(DECK_END - wall), X(0.1))
  outline(p, ink, weight * 0.8)
  for (let x = wall + 0.2; x < DECK_END; x += 0.5) p.line(X(x), X(FLOOR + 0.1), X(x), X(1 + FLOOR))
  solid(p, ink, weight, DUST.wood)
  for (let i = 1; i <= 2; i++) p.rect(X(DECK_END + (i - 1) * 0.4 + 0.2), X(FLOOR + i / 3 + 0.04), X(0.4), X(0.08))
  outline(p, ink, weight)
  p.line(X(DECK_END), X(FLOOR + 0.1), X(DECK_END + 0.8), X(1 + FLOOR))
  // The ground of the yard from the bottom step on.
  p.line(X(DECK_END + 0.8), X(1 + FLOOR), X(4.5), X(1 + FLOOR))
  for (let i = 0; i < 6; i++) {
    const gx = DECK_END + 1 + i * 0.4 + hash(i, 3) * 0.2
    p.line(X(gx), X(1 + FLOOR), X(gx - 0.03), X(1 + FLOOR - 0.06))
    p.line(X(gx + 0.03), X(1 + FLOOR), X(gx + 0.05), X(1 + FLOOR - 0.05))
  }
  // The porch roof, off the front wall on a post.
  solid(p, ink, weight, DUST.rust)
  p.quad(X(wall), X(-1.45), X(DECK_END + 0.35), X(-1.2), X(DECK_END + 0.35), X(-1.12), X(wall), X(-1.35))

  // The screen door, hooked back against the wall.
  solid(p, ink, weight * 0.8, DUST.light)
  p.rect(X(wall + 0.12), X((-1.02 + FLOOR) / 2), X(0.08), X(FLOOR + 1.02))

  // The rocking chair: the ball clips a runner going by, and it rocks a while after.
  const since = t - s.out
  const rock = since < 0 ? 0 : 0.14 * Math.exp(-since / 2.4) * Math.sin(since * 2.6)
  const cx = 1.05
  p.push()
  p.translate(X(cx), X(FLOOR))
  p.rotate(rock)
  outline(p, ink, weight)
  // Runners, seat, back, arms.
  p.noFill()
  p.arc(0, X(-0.55), X(1.2), X(1.1), Math.PI * 0.36, Math.PI * 0.64)
  solid(p, ink, weight, DUST.teal)
  p.rect(0, X(-0.3), X(0.34), X(0.05))
  p.quad(X(-0.16), X(-0.3), X(-0.24), X(-0.78), X(-0.18), X(-0.8), X(-0.1), X(-0.3))
  outline(p, ink, weight)
  for (const dx of [-0.13, 0.13]) p.line(X(dx), X(-0.3), X(dx * 1.1), X(-0.05))
  p.line(X(-0.2), X(-0.52), X(0.17), X(-0.46))
  p.line(X(0.17), X(-0.46), X(0.15), X(-0.3))
  p.pop()

  // Scuffs on the steps.
  drawLandings(p, s.landings, c)
}
