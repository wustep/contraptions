import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { clamp, easeInOutSine, easeInQuad, easeOutCubic } from '../../../../../../../../src/core/ease'
import { FLOOR, R, laneAt, type Lane, type Pt } from '../../../../../parts'
import { alpha, box, carried, hash, knock, lastOf, part, route, scenery, smooth, type Ctx, type Way } from '../kit'
import { dropTime, G_EARTH, hop } from '../physics'
import { DUST } from '../worlds'
import { drawWatch, WATCH_ON_SHELF } from './watch'

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
 * Murph's bookcase. The ball sits at the end of the top shelf in the dark, by
 * the side of the case. When the piano starts, the things on the shelf begin
 * to go on their own, from the far end: the model lander first, as it does in
 * the film; then ten books, one to a note, short and tall: dot dot dot, dash,
 * dot dash, dash dot dash dash. Each one shivers, sheds a little dust, and
 * leans out as if pushed from behind by nothing. The ball doesn't move; it
 * watches, and wonders (a small drawn question, three times). The last book
 * topples toward it instead, and its top knocks the ball off its place: along
 * the shelf it goes, through a little flap in the side of the case, and down
 * onto the toy truck standing there.
 */
const CASE_L = -0.45
const CASE_R = 2.0
const CAP = -1.42
const TOP = -0.82
const MID = -0.36
const BALL_Y = TOP - R
const SHORT = 0.25
const TALL = 0.38

export interface Fallen {
  x: number
  w: number
  h: number
  color: string
  /** Seconds into the part at which it goes. */
  hit: number
  /** Where it comes to rest, lying: its centre, and which way it turned. */
  land: Pt
  turn: 1 | -1
  /** The last book: it topples over its foot toward the ball's rest, knocks the ball, and then falls to the floor. */
  topple?: boolean
}

interface ShelfState {
  begin: number
  lane: Lane
  books: Fallen[]
  lander: { x: number; hit: number }
  /** The flap in the case's side: its angle from `t0` (seconds into the part), RATE samples a second. */
  flap: { t0: number; a: Float32Array }
}

const MORSE = '... - .- -.--'
const SHELF_HITS = [7.245, 7.546, 7.86, 8.499, 9.125, 9.509, 10.136, 10.356, 11.169, 11.622]
const BOOK_COLORS = [DUST.rust, DUST.teal, DUST.corn, DUST.denim, DUST.sage, DUST.bone]

export const SHELF_NOTES = [5.126, ...SHELF_HITS]

/**
 * The ten books of the top shelf as they stand before they go, in the
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

/**
 * Where the ball rests on the top shelf at the start, in the shelf's cells: at
 * the end of the row, to the right of the last book, in the dawn's first light.
 */
export const GHOST_REST: Pt = (() => {
  const row = stayRow()
  return [row[row.length - 1].x + 0.36, TOP - R]
})()

/**
 * The model lander on the top shelf, left of the row (between the watch and the first book), and the notes the lander
 * and the books fall on (show seconds).
 */
export const LANDER_X = -0.05
/** Where the watch stands: `WATCH_ON_SHELF`, placed so its strap's tail stays inside the case. */
const WATCH_X = WATCH_ON_SHELF[0]
export const FALL_NOTES = { lander: 5.126, books: SHELF_HITS }

/** When the ball wonders (show seconds), and where the question rises, from its rest: after the lander is down, in the middle of the row, and as the last book starts to go. */
const WONDER = [
  { at: 5.9, dx: 0.21, dy: -0.22, tilt: 0.14 },
  { at: 9.62, dx: -0.22, dy: -0.23, tilt: -0.12 },
  { at: 11.64, dx: 0.19, dy: -0.23, tilt: 0.1 },
]

/** A shiver, `since` seconds before a thing on the shelf goes: nothing touches it, and it trembles. */
const shiver = (since: number): number => (since < -0.34 || since >= 0 ? 0 : 0.055 * smooth(since, -0.34, -0.14) * Math.sin(since * 80))

/** A question, drawn: a hook and a dot in a pale warm ink over a thin dark line, its middle at (x, y), tilted. */
function question(p: p5, c: Ctx, x: number, y: number, tilt: number, a: number): void {
  if (a <= 0.01) return
  const { k, ink, weight } = c
  p.push()
  p.translate(x * k, y * k)
  p.rotate(tilt)
  p.noFill()
  for (const [col, w, o] of [[ink, weight * 1.9, 0.6], [DUST.light, weight * 0.95, 1]] as const) {
    p.stroke(alpha(p, col, a * o))
    p.strokeWeight(w)
    p.arc(0, -0.06 * k, 0.12 * k, 0.12 * k, Math.PI * 1.05, Math.PI * 2.35)
    p.line(0.027 * k, -0.007 * k, 0, 0.038 * k)
    p.noStroke()
    p.fill(alpha(p, col, a * o))
    p.circle(0, 0.095 * k, (0.036 + (o < 1 ? 0.016 : 0)) * k)
    p.noFill()
  }
  p.pop()
}

/**
 * The row's books where they come to rest on the floor in front of the case,
 * lying, each on whatever fell before it (shelf cells), in the order they
 * fall. The opening leaves them so, and the end of Act I (the ghost knocking
 * them off from behind) leaves them exactly so again.
 */
export function bookRests(): Fallen[] {
  const rests: { x0: number; x1: number; top: number }[] = []
  return stayRow().map((b, j) => {
    const lx = b.x + (hash(j, 7) - 0.5) * 0.16 + (j % 2 ? 0.05 : -0.05)
    const x0 = lx - b.h / 2
    const x1 = lx + b.h / 2
    let floor = FLOOR
    for (const r of rests) if (r.x1 > x0 + 0.03 && r.x0 < x1 - 0.03) floor = Math.min(floor, r.top)
    rests.push({ x0, x1, top: floor - b.w })
    return { x: b.x, w: b.w, h: b.h, color: b.color, hit: 0, land: [lx, floor - b.w / 2] as Pt, turn: (j % 2 ? 1 : -1) as 1 | -1, topple: j === MORSE.replace(/ /g, '').length - 1 }
  })
}

/** Along the line from `a` to `b` between two times, leaving at `v0` and arriving at `v1` cells a second. */
function run(a: Pt, b: Pt, t0: number, t1: number, v0: number, v1: number): (t: number) => Pt {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const D = Math.hypot(dx, dy) || 1
  const T = t1 - t0
  return (t) => {
    const u = clamp((t - t0) / T)
    const d = D * (3 * u * u - 2 * u * u * u) + T * (v0 * (u * u * u - 2 * u * u + u) + v1 * (u * u * u - u * u))
    return [a[0] + (dx / D) * d, a[1] + (dy / D) * d]
  }
}

/** How long after the last book starts to go its top reaches the ball on its rest: 11.622 to 11.819, a note. */
const KNOCK = 0.197
/** How far the last book has toppled over its foot when its top meets the ball at rest, found once from where they stand. */
const KNOCK_ANGLE = (() => {
  const row = stayRow()
  const b = row[row.length - 1]
  const pivot: Pt = [b.x + b.w / 2, TOP]
  const dx = GHOST_REST[0] - pivot[0]
  const dy = GHOST_REST[1] - pivot[1]
  // The book's near face runs up from its foot at the angle it has turned: find where it first touches the ball.
  for (let a = 0; a < Math.PI / 2; a += 0.0005) if (-dx * Math.cos(a) - dy * Math.sin(a) >= -R) return a
  return Math.PI / 2
})()

export const shelf = part<ShelfState>(
  {
    name: 'bookcase',
    dynamic: true,
    draw: (p, s, c) => drawShelf(p, s, c),
    over: (p, s, c) => {
      // It wonders: a small question rises by it and fades, three times. The last is left hanging as it rolls away.
      const T = c.t + s.begin
      for (const m of WONDER) {
        const u = (T - m.at) / 1.1
        if (u < 0 || u > 1) continue
        const on = smooth(u, 0, 0.15) * (1 - smooth(u, 0.6, 1))
        question(p, c, GHOST_REST[0] + m.dx, GHOST_REST[1] + m.dy - 0.06 * easeOutCubic(u), m.tilt, on)
      }
    },
  },
  (slot) => {
    const at = (t: number) => t - slot.begin
    // The row: short and tall books shoulder to shoulder, a thin gap between letters.
    // Where they come to rest: dropped in front of the case, lying, each on whatever fell before it.
    const books: Fallen[] = bookRests().map((b, i) => ({ ...b, hit: at(SHELF_HITS[i]) }))
    const lander = { x: LANDER_X, hit: at(FALL_NOTES.lander) }
    const knocked = at(SHELF_HITS[SHELF_HITS.length - 1] + KNOCK)
    const flapped = at(12.016)
    const landed = at(12.283)
    // Still at the end of the row until the last book's top knocks it (a note); along the shelf, slowing a little,
    // into the flap in the side of the case (a note); out through it, and down onto the toy truck's roof (a note).
    const flapX = FLAP_X - 0.035 - R + 0.07
    const roll = run(GHOST_REST, [flapX, BALL_Y], knocked, flapped, 2.0, 1.7)
    const segs = route([{ at: 0, p: GHOST_REST }, { at: knocked, p: GHOST_REST }])
    segs.push(...carried(roll, knocked, flapped, 24))
    const out: Way = { at: flapped, p: [flapX, BALL_Y] }
    segs.push(...route([out, hop(out, [2.33, CATCH_Y], landed)]))
    const lane: Lane = { segs, fire: lander.hit }
    return {
      cells: box(-1, -2, 2, 0),
      exit: [2.83, CATCH_Y],
      lane,
      state: { begin: slot.begin, lane, books, lander, flap: flapSwing(lane, knocked, landed + 1.5) },
    }
  },
)

/** A book falling from the shelf: where its centre is and how far it has turned, `since` seconds after it went (shelf cells). */
export function bookAt(b: Fallen, since: number): { x: number; y: number; a: number } {
  const x0 = b.x
  const y0 = TOP - b.h / 2
  if (since < 0) return { x: x0, y: y0, a: 0 }
  if (b.topple) return toppleAt(b, since)
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
  // Down: a knock and a slow settle.
  const after = f - T
  const rock = Math.exp(-after / 0.25) * Math.sin(after * 18) * 0.06
  return { x: b.land[0], y: b.land[1], a: b.turn * (Math.PI / 2 + rock) }
}

/**
 * The last book: it tips over its foot toward the ball, gathering, until its top meets the ball (KNOCK seconds on);
 * then it drops away off the shelf toward us and lies where `bookRests()` says, like the rest.
 */
function toppleAt(b: Fallen, since: number): { x: number; y: number; a: number } {
  const pivot: Pt = [b.x + b.w / 2, TOP]
  const pose = (a: number): { x: number; y: number; a: number } => ({
    x: pivot[0] - (b.w / 2) * Math.cos(a) + (b.h / 2) * Math.sin(a),
    y: pivot[1] - (b.w / 2) * Math.sin(a) - (b.h / 2) * Math.cos(a),
    a,
  })
  if (since < KNOCK) return pose(KNOCK_ANGLE * (since / KNOCK) ** 2)
  const from = pose(KNOCK_ANGLE)
  const f = since - KNOCK
  const T = dropTime(b.land[1] - from.y)
  if (f < T) {
    const u = f / T
    return { x: from.x + (b.land[0] - from.x) * u, y: from.y + 0.5 * G_EARTH * f * f, a: KNOCK_ANGLE + (Math.PI / 2 - KNOCK_ANGLE) * easeInOutSine(u) }
  }
  const after = f - T
  const rock = Math.exp(-after / 0.25) * Math.sin(after * 18) * 0.06
  return { x: b.land[0], y: b.land[1], a: Math.PI / 2 + rock }
}

/** Seconds after a book goes that it lands on the floor. */
function landsAfter(b: Fallen): number {
  if (!b.topple) return 0.12 + dropTime(b.land[1] - (TOP - b.h / 2))
  const a = KNOCK_ANGLE
  const y = TOP - (b.w / 2) * Math.sin(a) - (b.h / 2) * Math.cos(a)
  return KNOCK + dropTime(b.land[1] - y)
}

/* The flap in the case's side, at the top shelf: a board hung from its top edge in the side, that swings out as the ball goes through. */
const FLAP_X = CASE_R - 0.035
const FLAP_TOP = TOP - 0.3
const FLAP_L = TOP - FLAP_TOP - 0.005
const FLAP_RATE = 240

/** The flap's swing, worked out once from the ball's lane: it rides on the ball while the ball is under it, and falls back when it is past. */
function flapSwing(lane: Lane, from: number, to: number): { t0: number; a: Float32Array } {
  const n = Math.ceil((to - from) * FLAP_RATE)
  const out = new Float32Array(n)
  const r = R + 0.035
  let a = 0
  let w = 0
  let need0 = 0
  for (let i = 0; i < n; i++) {
    const q = laneAt(lane, from + i / FLAP_RATE)
    const dx = q.x - FLAP_X
    const dy = q.y - FLAP_TOP
    const rho = Math.hypot(dx, dy)
    let need = 0
    if (rho > r) {
      const phi = Math.atan2(dx, dy)
      if (rho <= Math.hypot(FLAP_L, r)) need = phi + Math.asin(r / rho)
      else if (rho < FLAP_L + r) need = phi + Math.acos((FLAP_L * FLAP_L + rho * rho - r * r) / (2 * FLAP_L * rho))
    }
    need = Math.max(0, need)
    w += (-120 * Math.sin(a) - 4 * w) / FLAP_RATE
    a += w / FLAP_RATE
    if (a < 0) {
      a = 0
      w = -w * 0.18
    }
    if (a < need) {
      a = need
      w = Math.max(w, (need - need0) * FLAP_RATE)
    }
    need0 = need
    out[i] = a
  }
  return { t0: from, a: out }
}

function drawShelf(p: p5, s: ShelfState, c: Ctx): void {
  const { k, t, ink, weight } = c
  const X = (x: number) => x * k
  // The case: its back in shadow, sides, cap and boards.
  solid(p, ink, weight, DUST.shade)
  p.rect(X((CASE_L + CASE_R) / 2), X((CAP + FLOOR) / 2), X(CASE_R - CASE_L), X(FLOOR - CAP))
  solid(p, ink, weight, DUST.wood)
  p.rect(X(CASE_L + 0.035), X((CAP + FLOOR) / 2), X(0.07), X(FLOOR - CAP))
  // The right side, in two pieces round the flap at the top shelf.
  p.rect(X(FLAP_X), X((CAP + FLAP_TOP) / 2), X(0.07), X(FLAP_TOP - CAP))
  p.rect(X(FLAP_X), X((TOP + FLOOR) / 2), X(0.07), X(FLOOR - TOP))
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

  // Cooper's watch, stood on the left end of the top shelf, keeping time; it never falls.
  drawWatch(p, k, ink, weight, WATCH_X, TOP, t, { mode: 'stand' })

  // The lander model: a shiver, then over the edge on the first note, and down on its side.
  lander(p, c, s.lander.x, t - s.lander.hit)
  const lf = t - s.lander.hit
  if (lf > -0.36 && lf < 0.2) sift(p, c, s.lander.x, TOP - 0.2, 0.1, lf + 0.36)

  // The row of ten, standing; then down on their own, one to a note: a shiver, a sift of dust off the top, a lean, and gone.
  for (const b of s.books) {
    const since = t - b.hit
    const at = bookAt(b, since)
    p.push()
    p.translate(X(at.x), X(at.y))
    p.rotate(at.a + shiver(since) * b.turn)
    book(p, c, 0, b.h / 2, b.w, b.h, b.color, 0)
    p.pop()
    if (since > -0.36 && since < 0.2) sift(p, c, b.x, TOP - b.h, b.w, since + 0.36)
  }
  // A thud of dust where each one lands.
  p.noStroke()
  for (const b of s.books) {
    const since = t - b.hit - landsAfter(b)
    if (since < 0 || since > 0.6) continue
    const u = since / 0.6
    p.fill(alpha(p, DUST.shade, 0.7 * (1 - u)))
    for (const side of [-1, 1]) p.circle(X(b.land[0] + side * (b.h / 2 + 0.05 + u * 0.12)), X(b.land[1] + b.w / 2 - 0.02 - u * 0.04), X(0.05 + u * 0.05))
  }

  // The flap: hung from its top edge in the case's side, swinging out as the ball goes through, and slapping back.
  const i = (t - s.flap.t0) * FLAP_RATE
  const j = Math.floor(i)
  const fa = i <= 0 || j >= s.flap.a.length - 1 ? 0 : s.flap.a[j] + (s.flap.a[j + 1] - s.flap.a[j]) * (i - j)
  p.push()
  p.translate(X(FLAP_X), X(FLAP_TOP))
  p.rotate(-fa)
  solid(p, ink, weight * 0.8, DUST.wood)
  p.rect(0, X(FLAP_L / 2), X(0.07), X(FLAP_L), X(0.008))
  p.pop()
  solid(p, ink, weight * 0.5, DUST.bone)
  p.circle(X(FLAP_X), X(FLAP_TOP + 0.02), X(0.035))
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

/** A little dust sifting off the top of something about to go, `u` seconds into it: three grains, falling in front of it. */
function sift(p: p5, c: Ctx, x: number, top: number, w: number, u: number): void {
  const { k, ink } = c
  p.noStroke()
  for (let i = 0; i < 3; i++) {
    const start = i * 0.07
    const f = u - start
    if (f < 0) continue
    const gx = x + (hash(i, Math.round(x * 100), 11) - 0.5) * w
    const gy = top + 0.02 + 0.35 * f + 0.9 * f * f
    p.fill(alpha(p, ink, 0.5 * (1 - smooth(f, 0.25, 0.5))))
    p.circle(gx * k, gy * k, Math.max(1.2, 0.014 * k))
  }
}

/** The model lander: gold foil, four legs, the ascent stage on top. Knocked at since = 0, it goes over and lies on its side. */
function lander(p: p5, c: Ctx, x0: number, since: number): void {
  let x = x0
  let y = TOP
  let a = shiver(since)
  if (since >= 0) {
    // It rocks back off its front legs and goes over the edge toward us, falling nearly straight down in front of the
    // watch rather than across it.
    const tip = 0.25
    if (since < tip) a = -0.35 * easeOutCubic(since / tip)
    else {
      const f = since - tip
      const T = dropTime(FLOOR - TOP)
      const u = Math.min(1, f / T)
      x = x0 - 0.08 * u
      y = TOP + Math.min(FLOOR - TOP, 0.5 * G_EARTH * f * f)
      a = -0.35 - (Math.PI / 2 - 0.35 + 0.35) * easeInOutSine(u)
      if (f > T) a += Math.exp(-(f - T) / 0.22) * Math.sin((f - T) * 15) * 0.09
    }
  }
  drawLander(p, c, x, y, a)
}

/**
 * The model lunar lander, its feet at (x, y) and turned by `a`, in the caller's cells: a gold-foil descent stage
 * on four splayed legs with round footpads, and the faceted ascent stage on top, its window and its antenna.
 */
export function drawLander(p: p5, c: { k: number; ink: string; weight: number }, x: number, y: number, a = 0): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  p.push()
  p.translate(X(x), X(y))
  p.rotate(a)
  // The far pair of legs, fainter, then the near pair splayed wide, each on its footpad, with a strut.
  outline(p, ink, weight * 0.45)
  for (const s of [-1, 1]) p.line(X(s * 0.025), X(-0.075), X(s * 0.045), X(-0.008))
  outline(p, ink, weight * 0.7)
  for (const s of [-1, 1]) {
    p.line(X(s * 0.045), X(-0.08), X(s * 0.078), X(-0.01))
    p.line(X(s * 0.018), X(-0.07), X(s * 0.062), X(-0.035))
  }
  solid(p, ink, weight * 0.55, DUST.tin)
  for (const s of [-1, 1]) p.ellipse(X(s * 0.08), X(-0.006), X(0.03), X(0.013))
  // The descent stage: an octagon in gold foil, crinkled.
  solid(p, ink, weight * 0.8, DUST.corn)
  p.beginShape()
  for (const [u, v] of [[-0.055, -0.07], [0.055, -0.07], [0.062, -0.085], [0.062, -0.125], [0.055, -0.138], [-0.055, -0.138], [-0.062, -0.125], [-0.062, -0.085]] as Pt[]) p.vertex(X(u), X(v))
  p.endShape(p.CLOSE)
  outline(p, ink, weight * 0.35)
  p.line(X(-0.035), X(-0.075), X(-0.02), X(-0.133))
  p.line(X(0.02), X(-0.075), X(0.035), X(-0.133))
  // The ascent stage: faceted, a window on its face, the antenna up top.
  solid(p, ink, weight * 0.8, DUST.bone)
  p.beginShape()
  for (const [u, v] of [[-0.048, -0.138], [0.05, -0.138], [0.056, -0.17], [0.032, -0.2], [-0.03, -0.2], [-0.054, -0.172]] as Pt[]) p.vertex(X(u), X(v))
  p.endShape(p.CLOSE)
  solid(p, ink, weight * 0.4, '#3A3F3A')
  p.triangle(X(0.012), X(-0.182), X(0.04), X(-0.17), X(0.02), X(-0.158))
  outline(p, ink, weight * 0.55)
  p.line(X(-0.012), X(-0.2), X(-0.018), X(-0.235))
  p.line(X(-0.03), X(-0.232), X(-0.006), X(-0.238))
  p.pop()
}

/* ------------------------------------------------------------------ the toy truck */

/**
 * Murph's wind-up tin truck: a cab-over dump truck, denim tin with a red dump
 * box and a key in its side, parked nose to the end of the case. The ghost
 * comes out through the side of the case and lands on its cab roof with a
 * clank, and is a ball there; it rolls off the back of the cab into the box,
 * and its weight lets the spring go. The truck backs away from the case a
 * lurch a note, the key turning, through the window's light, where the dust
 * has started coming down in bands the width of a finger and of a hand — the
 * pattern that turns out to be coordinates — and at the stairwell it tips its
 * box like a ramp and he rolls out over the lip. It is the truck he will
 * drive, small.
 *
 * The part's frame: the ball on the cab roof at (-0.5, 0) on the catch; the
 * floor's surface at y = 0.64 (the ball on the floor is at 0.51).
 */
/** The floor under the toy, in its frame: where it has always been, so the catch is where it always was; the truck is built to it. */
const TOY_FLOOR = 0.42 - Math.sin(-0.45) * 0.24 + Math.cos(-0.45) * R
/** Where the toy's frame sits in the world (y), and so where the ghost is caught, in the shelf's frame. */
const TOY_ROW = UP - TOY_FLOOR
const CATCH_Y = TOY_ROW + 2
/** The truck, in its own cells: `u` back from the cab's nose, `v` up from the floor. The cab's roof takes the ghost at the catch. */
const LEN = 0.72
const CAB = 0.3
const ROOF = TOY_FLOOR - R
const BOX_U = 0.33
const BOX_FLOOR = 0.26
const BOX_SIDE = 0.39
const HINGE_V = 0.22
const WHEEL_R = 0.1
const AXLES = [0.15, 0.58]
/** Nose to the case, a hand clear of it (shelf cells): where it stands in the dark, and where the ghost lands on its roof. */
const NOSE = CASE_R + 0.06
const LURCHES = [12.632, 13.497, 14.124, 14.745, 15.139]
export const TOY_NOTES = [...LURCHES]
const LIP = 15.743
/** He comes down off the tipped box onto the boards on this note. */
const BOARDS = 15.557
/** The box tips at the stairwell: when it starts, and how far. */
const TIP: [number, number] = [15.17, 15.4]
const DUMPED = 0.6
/** Where the lip of the stairwell is, in this frame: the world's 4.9, less the part's origin 2.83. */
const LIP_X = WELL_L - 2.83
/** The truck's nose in this frame, in the dark, and the ball's place in the box (u). */
const NOSE0 = NOSE - 2.83
const IN_BOX = 0.49

interface ToyState {
  begin: number
  /** How far each lurch takes it (cells). */
  stride: number
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

/** A pose of the truck: its nose (x, in the caller's cells), the floor under it, its rock, its box's tip, and its key's turn. */
interface Rig {
  x: number
  floor: number
  pitch: number
  tip: number
  key: number
}

/**
 * How far along its run the truck is, 0 to 1. Wound up, it runs continuously from the first note: it gathers, runs
 * at a steady clip, and each note the key gives it a pulse, a surge and back; it slows to a stop as the box goes
 * up at the stairwell. Worked out once as a table from its speed, so its motion is smooth.
 */
const RUN = (() => {
  const t0 = LURCHES[0]
  const t1 = TIP[0] + 0.2
  const dt = 0.002
  const n = Math.ceil((t1 - t0) / dt)
  const speed = (t: number): number => {
    let v = smooth(t, t0, t0 + 0.3) * (1 - smooth(t, TIP[0] - 0.25, t1))
    for (const note of LURCHES) {
      const u = (t - note) / 0.09
      if (u > 0) v += 0.55 * u * u * Math.exp(2 * (1 - u)) * (1 - smooth(t, TIP[0] - 0.25, t1))
    }
    return v
  }
  const h = new Float64Array(n + 1)
  for (let i = 1; i <= n; i++) h[i] = h[i - 1] + speed(t0 + (i - 0.5) * dt) * dt
  for (let i = 0; i <= n; i++) h[i] /= h[n]
  return { t0, dt, h }
})()

function runAt(t: number): number {
  const i = (t - RUN.t0) / RUN.dt
  if (i <= 0) return 0
  if (i >= RUN.h.length - 1) return 1
  const j = Math.floor(i)
  return RUN.h[j] + (RUN.h[j + 1] - RUN.h[j]) * (i - j)
}

/** Where the truck is at show time `t`, in this frame: running continuously off the case, rearing a little on each pulse. */
function rigAt(s: ToyState, t: number): Rig {
  const u = runAt(t)
  const x = NOSE0 + s.stride * LURCHES.length * u
  const key = (Math.PI / 2) * LURCHES.length * u
  let pitch = 0
  for (const note of LURCHES) {
    const q = (t - note) / 0.12
    if (q > 0) pitch += 0.02 * q * q * Math.exp(2 * (1 - q))
  }
  const tip = DUMPED * easeInOutSine(clamp((t - TIP[0]) / (TIP[1] - TIP[0])))
  return { x, floor: TOY_FLOOR, pitch, tip, key }
}

/** A point on the truck (u back from the nose, v up), where the rig has it; `boxed` points ride the box's tip about its hinge. */
function onTruck(g: Rig, u: number, v: number, boxed = false): Pt {
  let du = u - LEN
  let dv = v - HINGE_V
  if (boxed && g.tip) {
    // Tipped, the box's front comes up and its back goes down about the hinge.
    const c = Math.cos(-g.tip)
    const s = Math.sin(-g.tip)
    ;[du, dv] = [du * c - dv * s, du * s + dv * c]
  }
  // The rock is about the rear wheel's foot.
  const pu = LEN + du - AXLES[1]
  const pv = HINGE_V + dv
  const c = Math.cos(g.pitch)
  const s = Math.sin(g.pitch)
  return [g.x + AXLES[1] + pu * c + pv * s, g.floor - (-pu * s + pv * c)]
}

/** Where he rides, from the cab roof to the lip. */
function ballPath(s: ToyState): (t: number) => Pt {
  const b = s.begin
  // The clank on the roof and a small bounce; off the back of the cab; into the box as the spring goes.
  const roof: Pt = [-0.5, 0]
  const edge: Pt = [NOSE0 + CAB + 0.02, 0]
  const boxed = (t: number, u = IN_BOX): Pt => onTruck(rigAt(s, t), u, BOX_FLOOR + R, true)
  const settle = 0.14
  const drop = 0.175
  const hops = route([
    { at: 0, p: roof },
    { at: settle, p: [roof[0] + 0.005, 0], arc: 0.045 },
    { at: LURCHES[0] - b - drop, p: edge },
  ])
  const fall = route([
    { at: 0, p: edge },
    hop({ at: 0, p: edge }, boxed(LURCHES[0]), drop),
  ])
  // In the box: it rolls back toward the tailgate a little as each lurch coasts out; down the box as it tips, and out.
  const inBox = (t: number): number => {
    let u = IN_BOX
    for (const n of LURCHES) {
      const since = t - n
      if (since > 0) u += 0.03 * Math.sin(Math.PI * clamp(since / 0.5)) ** 2
    }
    return u + (LEN - 0.02 - IN_BOX) * easeInQuad(clamp((t - TIP[0] - 0.05) / (TIP[1] - TIP[0] - 0.02)))
  }
  const lane = { segs: [...hops, ...fall], fire: 0 }
  return (t) => {
    if (t < LURCHES[0]) {
      const q = laneAt(lane, t - b)
      return [q.x, q.y]
    }
    return boxed(t, inBox(t))
  }
}

export const toy = part<ToyState>(
  {
    name: 'toy',
    draw: (p, s, c) => drawToyPart(p, s, c),
    over: (p, s, c) => {
      // The box's near side and the key, in front of the ball.
      const g = rigAt(s, c.t + s.begin)
      truckFront(p, c, g)
    },
  },
  (slot) => {
    const at = (t: number) => t - slot.begin
    const s: ToyState = { begin: slot.begin, stride: 0, bands: BANDS.map(([x, w, n]) => ({ x, w, at: n })) }
    // It backs to where its tipped box pours him onto the boards a short roll from the lip.
    s.stride = (LIP_X - 0.46 - LEN - NOSE0) / LURCHES.length
    const ride = ballPath(s)
    // He leaves the box's end when it is tipped far enough, and falls to the boards: when he leaves is chosen so
    // that he lands on the piano's next note.
    const ground = TOY_FLOOR - R
    const flight = (pour: number) => {
      const P = ride(pour)
      const Q = ride(pour - 0.004)
      const V: Pt = [(P[0] - Q[0]) / 0.004, (P[1] - Q[1]) / 0.004]
      const T = (-V[1] + Math.sqrt(V[1] * V[1] + 2 * G_EARTH * (ground - P[1]))) / G_EARTH
      return { P, V, T }
    }
    let lo = TIP[0] + 0.12
    let hi = TIP[1] + 0.1
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2
      if (mid + flight(mid).T < BOARDS) lo = mid
      else hi = mid
    }
    const pour = lo
    const segs = carried((t) => ride(t + slot.begin), 0, at(pour), Math.ceil(at(pour) * 60))
    // Off the end of the tipped box with the speed it had, a short fall to the boards, and a roll on to the lip.
    const { P, V, T: fallT } = flight(pour)
    const land = pour + fallT
    const fall = (t: number): Pt => {
      const q = t + slot.begin - pour
      return [P[0] + V[0] * q, Math.min(ground, P[1] + V[1] * q + 0.5 * G_EARTH * q * q)]
    }
    segs.push(...carried(fall, at(pour), at(land), 12))
    const landed: Pt = [P[0] + V[0] * fallT, ground]
    const roll = run(landed, [LIP_X, ground], land, LIP, Math.max(0.3, V[0]), 0.6)
    segs.push(...carried((t) => roll(t + slot.begin), at(land), at(LIP), 24))
    return {
      cells: box(-1.5, -2, LIP_X + 0.5, 1),
      exit: [LIP_X + 0.5, TOY_FLOOR - R],
      lane: { segs, fire: at(LURCHES[0]) },
      state: s,
    }
  },
)

function drawToyPart(p: p5, s: ToyState, c: Ctx): void {
  const { k, ink } = c
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
  const g = rigAt(s, t)
  // A scuff of dust off the back wheels as each lurch bites.
  const step = lastOf(LURCHES, t)
  if (step.ago < 0.4) {
    const q = step.ago / 0.4
    const [wx] = onTruck(g, LEN, 0)
    p.noStroke()
    p.fill(alpha(p, DUST.shade, 0.7 * (1 - q)))
    for (const side of [-1, 1]) p.circle(X(wx + 0.02 + side * (0.05 + q * 0.12)), X(TOY_FLOOR - 0.02 - q * 0.03), X(0.035 + q * 0.03))
  }
  truckBack(p, c, g)
}

/** The truck's wheels, chassis, cab and the inside of its box: everything behind whatever rides in the box. */
function truckBack(p: p5, c: { k: number; ink: string; weight: number }, g: Rig): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const poly = (pts: Pt[], fill: string, w = weight, boxed = false) => {
    solid(p, ink, w, fill)
    p.beginShape()
    for (const [u, v] of pts) {
      const [x, y] = onTruck(g, u, v, boxed)
      p.vertex(X(x), X(y))
    }
    p.endShape(p.CLOSE)
  }
  // Wheels: tin hubs, turning as it goes.
  for (const u of AXLES) {
    const [wx, wy] = onTruck(g, u, WHEEL_R)
    solid(p, ink, weight, ink)
    p.circle(X(wx), X(wy), X(WHEEL_R * 2))
    solid(p, ink, weight * 0.6, DUST.tin)
    p.circle(X(wx), X(wy), X(WHEEL_R * 1.0))
    outline(p, ink, weight * 0.5)
    const turn = (g.x - NOSE0) / WHEEL_R
    for (let j = 0; j < 2; j++) {
      const a = turn + (j * Math.PI) / 2
      p.line(X(wx - Math.cos(a) * WHEEL_R * 0.45), X(wy - Math.sin(a) * WHEEL_R * 0.45), X(wx + Math.cos(a) * WHEEL_R * 0.45), X(wy + Math.sin(a) * WHEEL_R * 0.45))
    }
  }
  // The chassis, pressed tin.
  poly([[0.02, 0.12], [LEN, 0.12], [LEN, HINGE_V - 0.005], [0.02, HINGE_V - 0.005]], DUST.tin, weight * 0.8)
  // The cab: flat-nosed, its roof where the ghost comes down; its door window, and a bumper.
  poly([[0, 0.14], [CAB, 0.14], [CAB, ROOF], [0.04, ROOF], [0, ROOF - 0.04]], DUST.denim)
  poly([[0.04, ROOF - 0.17], [0.19, ROOF - 0.17], [0.19, ROOF - 0.05], [0.06, ROOF - 0.05], [0.04, ROOF - 0.07]], DUST.sky, weight * 0.6)
  outline(p, ink, weight * 0.45)
  const d0 = onTruck(g, 0.215, 0.17)
  const d1 = onTruck(g, 0.215, ROOF - 0.04)
  p.line(X(d0[0]), X(d0[1]), X(d1[0]), X(d1[1]))
  poly([[-0.03, 0.11], [0.04, 0.11], [0.04, 0.18], [-0.03, 0.18]], DUST.bone, weight * 0.7)
  // The box behind the ball: its headboard, its floor, and the tailgate, which hangs from its top and swings open as it tips.
  poly([[BOX_U, HINGE_V], [LEN, HINGE_V], [LEN, BOX_FLOOR], [BOX_U, BOX_FLOOR]], DUST.rust, weight * 0.8, true)
  poly([[BOX_U, HINGE_V], [BOX_U + 0.035, HINGE_V], [BOX_U + 0.035, BOX_SIDE + 0.06], [BOX_U, BOX_SIDE + 0.06]], DUST.rust, weight * 0.8, true)
  const [gx, gy] = onTruck(g, LEN, BOX_SIDE, true)
  const swing = g.tip
  solid(p, ink, weight * 0.8, DUST.rust)
  p.push()
  p.translate(X(gx), X(gy))
  p.rotate(-g.pitch + g.tip - swing)
  p.rect(X(-0.0175), X((BOX_SIDE - BOX_FLOOR) / 2), X(0.035), X(BOX_SIDE - BOX_FLOOR + 0.01), X(0.005))
  p.pop()
}

/** The box's near side and the wind-up key: in front of whatever rides in the box. */
function truckFront(p: p5, c: { k: number; ink: string; weight: number }, g: Rig): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  solid(p, ink, weight * 0.9, DUST.rust)
  p.beginShape()
  for (const [u, v] of [[BOX_U, HINGE_V], [LEN, HINGE_V], [LEN, BOX_SIDE], [BOX_U, BOX_SIDE]] as Pt[]) {
    const [x, y] = onTruck(g, u, v, true)
    p.vertex(X(x), X(y))
  }
  p.endShape(p.CLOSE)
  outline(p, ink, weight * 0.45)
  const r0 = onTruck(g, BOX_U + 0.02, BOX_SIDE - 0.05, true)
  const r1 = onTruck(g, LEN - 0.02, BOX_SIDE - 0.05, true)
  p.line(X(r0[0]), X(r0[1]), X(r1[0]), X(r1[1]))
  // The key, in the chassis under the box: a butterfly of tin on a short stem, turning a quarter with each lurch.
  const [kx, ky] = onTruck(g, (AXLES[0] + AXLES[1]) / 2 + 0.03, 0.16)
  p.push()
  p.translate(X(kx), X(ky))
  p.rotate(g.key)
  solid(p, ink, weight * 0.6, DUST.bone)
  p.ellipse(X(-0.045), 0, X(0.07), X(0.045))
  p.ellipse(X(0.045), 0, X(0.07), X(0.045))
  p.pop()
  solid(p, ink, weight * 0.6, DUST.tin)
  p.circle(X(kx), X(ky), X(0.025))
}

/**
 * Where the truck stood in the dark, nose to the case: the middle of its length and the floor under it, in the
 * house's own cells (the `house` scenery's, the shelf's less two rows). The rooms that remember the opening (the
 * dusk room at the end of Act I, the museum's replica) stand it there again.
 */
export const TOY_HOME: Pt = [NOSE + LEN / 2, UP]

/** The toy on the floor by the case, standing still, its middle at `x` and its wheels on `floor`, in the caller's cells. */
export function drawToy(p: p5, c: { k: number; ink: string; weight: number }, x: number, floor: number): void {
  const g: Rig = { x: x - LEN / 2, floor, pitch: 0, tip: 0, key: 0.4 }
  truckBack(p, c, g)
  truckFront(p, c, g)
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
