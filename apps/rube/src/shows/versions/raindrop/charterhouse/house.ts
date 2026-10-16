import type { Pt } from '../../../../parts'
import { arc, bar, disc, hash, line, mix, poly, rect, rgba, stroke, type Brush } from './brush'
import { GUTTER, HOUSE, PIPE, gutterY } from './geo'
import { tones, type Palette } from './look'

/**
 * The cell: one of the charterhouse's row of monks' houses, whitewashed, under a roof of canal tiles, with green
 * shutters and a lit window. Its eave is where the rain is caught and the machine starts; its window is where
 * someone is waiting.
 */

/** The canal tiles' ends along the eave: the pans (that drip) and the covers between them, `TILE` apart. */
export const TILE = 0.78
/** The x of every pan's mouth along the eave. */
export const PANS: number[] = []
for (let x = HOUSE.x0 + 0.5 + TILE / 2; x < HOUSE.x1 + HOUSE.over; x += TILE) PANS.push(x)

/** The wall, its plinth, the shade under the eave. */
export function drawWall(b: Brush, t: number): void {
  const c = tones(t)
  const { x0, x1, eave } = HOUSE
  rect(b, x0, eave, x1, 0.4, c.plaster)
  // The eave's shade: the overhang keeps the wall under it a little darker.
  rect(b, x0, eave, x1, eave + 0.9, c.plasterShade)
  rect(b, x0, eave + 0.9, x1, eave + 1.15, mix(c.plasterShade, c.plaster, 0.5))
  // Rain has run down the whitewash in long faint streaks under each pan.
  b.g.fillStyle = rgba(c.plasterDeep, 0.18)
  for (let i = 0; i < PANS.length; i += 3) {
    const x = PANS[i] + 0.1
    b.g.fillRect(x - 0.08, eave + 1.1, 0.16, 4 + ((i * 7) % 5))
  }
  // Damp: the whitewash darker where the rain has soaked it, at the foot and in patches under the eave.
  b.g.fillStyle = rgba(c.plasterShade, 0.5)
  b.g.beginPath()
  b.g.moveTo(x0, -0.6)
  for (let x = x0; x <= x1; x += 0.8) b.g.lineTo(x, -1.4 - 0.7 * hash(Math.round(x * 3), 51) - 0.4 * Math.sin(x * 0.7))
  b.g.lineTo(x1, -0.6)
  b.g.fill()
  // The plinth: a course of stone along the foot.
  rect(b, x0, -0.75, x1, 0.4, c.stone)
  rect(b, x0, -0.75, x1, -0.62, c.stoneShade)
  // The corner: the wall's end in shade.
  rect(b, x0, eave, x0 + 0.35, 0.4, c.plasterShade)
}

/**
 * The roof: courses of canal tiles going up and back to the ridge, each course's covers a row of round-topped ribs
 * over the pans between them, each course a little lower in tone than the one in front of it, as a roof seen from
 * under its eave is.
 */
export function drawRoof(b: Brush, t: number): void {
  const c = tones(t)
  const { x0, x1, eave, ridge, over } = HOUSE
  const left = x0 - over
  const right = x1 + over
  rect(b, left, ridge, right, eave + 0.05, c.tileDeep)
  const g = b.g
  const course = 0.62
  const n = Math.ceil((eave - ridge) / course)
  for (let k = n - 1; k >= 0; k--) {
    const y1 = eave - k * course
    const y0 = y1 - course - 0.12
    const shade = k / n
    // The pans: the course's back, darker.
    g.fillStyle = mix(c.tileShade, c.tileDeep, 0.3 + shade * 0.4)
    g.fillRect(left, y0, right - left, y1 - y0)
    // The covers: ribs with round heads, lit on their west side.
    const cover = mix(c.tile, c.tileDeep, shade * 0.55)
    const lit = mix(cover, c.plaster, 0.12)
    const off = (k % 2) * 0.12
    g.fillStyle = cover
    g.beginPath()
    for (const px of PANS) {
      const cx = px + TILE / 2 + off
      g.moveTo(cx - 0.24, y1)
      g.lineTo(cx - 0.24, y0 + 0.2)
      g.arc(cx, y0 + 0.2, 0.24, Math.PI, 0)
      g.lineTo(cx + 0.24, y1)
    }
    g.fill()
    g.fillStyle = lit
    g.beginPath()
    for (const px of PANS) {
      const cx = px + TILE / 2 + off
      g.rect(cx - 0.22, y0 + 0.2, 0.09, y1 - y0 - 0.2)
    }
    g.fill()
  }
  // The ridge's cap.
  rect(b, left, ridge - 0.35, right, ridge + 0.1, c.tileDeep)
}

/** The eave's edge: the covers' round ends and the pans' mouths, standing out over the wall. */
export function drawEave(b: Brush, t: number): void {
  const c = tones(t)
  const { eave } = HOUSE
  for (const x of PANS) {
    // The cover over the joint between two pans: a half round end.
    const cx = x + TILE / 2
    poly(b, [...arc(cx, eave - 0.05, 0.27, 0.24, Math.PI, Math.PI * 2, 8), [cx + 0.27, eave + 0.02], [cx - 0.27, eave + 0.02]], c.tile)
    rect(b, cx - 0.27, eave - 0.05, cx + 0.27, eave + 0.04, c.tileShade)
    // The pan's mouth: a hollow, its lip a thin curve, darker inside.
    poly(b, [...arc(x, eave - 0.15, 0.3, 0.17, 0, Math.PI, 8)], c.tileDeep)
    stroke(b, arc(x, eave - 0.15, 0.3, 0.17, 0, Math.PI, 8), c.tile, Math.max(1, b.k * 0.035))
  }
}

/* ------------------------------------------------------------------ the window */

/**
 * Who is in the window: the one at the piano all through; the two of them home with him at the end (`home` 0 to 1).
 * Silhouettes against the room's lamplight, no faces.
 */
export interface Room {
  /** How far through a sway the one at the piano is (radians of lean). */
  lean: number
  /** 0 to 1: the two who were out are home, standing by him. */
  home: number
}

export function drawWindow(b: Brush, t: number, room: Room): void {
  const c = tones(t)
  const w = HOUSE.window
  const g = b.g
  // The stone surround, a little proud of the whitewash.
  rect(b, w.x0 - 0.42, w.y0 - 0.5, w.x1 + 0.42, w.y1 + 0.35, c.stone)
  rect(b, w.x0 - 0.42, w.y1 + 0.18, w.x1 + 0.42, w.y1 + 0.35, c.stoneShade)
  // The room: its lamplit wall, warm.
  rect(b, w.x0, w.y0, w.x1, w.y1, c.room)
  const lamp = mix(c.warm, c.room, 0.35)
  rect(b, w.x0, w.y0, w.x1, w.y1 - 1.6, lamp)
  // The piano, an upright against the far wall, and its candle's light on the wall over it.
  const px0 = w.x0 + 0.25
  const px1 = w.x1 - 0.55
  const top = w.y1 - 2.1
  rect(b, px0, top, px1, w.y1, mix(c.room, '#2A1A12', 0.7))
  rect(b, px0 - 0.05, top - 0.12, px1 + 0.05, top + 0.02, mix(c.room, '#2A1A12', 0.82))
  rect(b, px0 + 0.1, top + 0.7, px1 - 0.1, top + 0.82, mix(c.room, '#2A1A12', 0.45))
  // The candle on the piano: a stick and its flame, no more.
  const cx = px1 - 0.35
  rect(b, cx - 0.04, top - 0.42, cx + 0.04, top - 0.12, '#E9DFC8')
  disc(b, cx, top - 0.52, 0.07, c.flame)
  // Him, at the keys: head and shoulders, leaning into it.
  const sx = w.x0 + 1.25
  const sy = w.y1 - 1.2
  g.save()
  g.translate(sx, sy + 0.9)
  g.rotate(room.lean)
  const dark = '#22160F'
  poly(b, [[-0.5, 0], [-0.42, -0.72], [-0.2, -0.95], [0.22, -0.95], [0.4, -0.7], [0.48, 0]], dark)
  disc(b, 0.02, -1.22, 0.27, dark)
  g.restore()
  // Her and the boy, home: standing behind him, nearer the window.
  if (room.home > 0) {
    g.globalAlpha = room.home
    const hx = w.x1 - 0.95
    poly(b, [[hx - 0.55, w.y1], [hx - 0.38, w.y1 - 2.2], [hx - 0.18, w.y1 - 2.55], [hx + 0.2, w.y1 - 2.55], [hx + 0.38, w.y1 - 2.2], [hx + 0.6, w.y1]], dark)
    disc(b, hx, w.y1 - 2.85, 0.26, dark)
    const bx = w.x0 + 2.25
    poly(b, [[bx - 0.36, w.y1], [bx - 0.3, w.y1 - 1.55], [bx - 0.12, w.y1 - 1.78], [bx + 0.14, w.y1 - 1.78], [bx + 0.3, w.y1 - 1.55], [bx + 0.36, w.y1]], dark)
    disc(b, bx, w.y1 - 2.02, 0.22, dark)
    g.globalAlpha = 1
  }
  // The casement: two leaves of small panes; the glass between keeps a little of the night on it.
  const frameC = mix(c.wood, c.ink, 0.25)
  const mid = (w.x0 + w.x1) / 2
  const fw = 0.09
  rect(b, w.x0, w.y0, w.x1, w.y0 + fw, frameC)
  rect(b, w.x0, w.y1 - fw, w.x1, w.y1, frameC)
  rect(b, w.x0, w.y0, w.x0 + fw, w.y1, frameC)
  rect(b, w.x1 - fw, w.y0, w.x1, w.y1, frameC)
  rect(b, mid - fw / 2, w.y0, mid + fw / 2, w.y1, frameC)
  const rows = 4
  for (let i = 1; i < rows; i++) {
    const y = w.y0 + ((w.y1 - w.y0) * i) / rows
    rect(b, w.x0, y - 0.03, w.x1, y + 0.03, frameC)
  }
  g.fillStyle = rgba(c.skyLow, 0.08)
  g.fillRect(w.x0, w.y0, w.x1 - w.x0, w.y1 - w.y0)
  // The sill, and the green shutters folded back against the wall.
  rect(b, w.x0 - 0.55, w.y1 + 0.3, w.x1 + 0.55, w.y1 + 0.5, c.stone)
  shutter(b, c, w.x0 - 0.42 - 1.55, w.x0 - 0.42, w.y0 - 0.45, w.y1 + 0.25)
  shutter(b, c, w.x1 + 0.42, w.x1 + 0.42 + 1.55, w.y0 - 0.45, w.y1 + 0.25)
}

/** A Mallorcan shutter: a green leaf of slats, folded open. */
function shutter(b: Brush, c: Palette, x0: number, x1: number, y0: number, y1: number): void {
  const green = mix('#4E6A55', c.ink, 0.12 + 0.5 * (1 - lum(c.plaster)))
  rect(b, x0, y0, x1, y1, green)
  const g = b.g
  g.fillStyle = mix(green, c.ink, 0.35)
  for (let y = y0 + 0.4; y < y1 - 0.3; y += 0.19) g.fillRect(x0 + 0.14, y, x1 - x0 - 0.28, 0.06)
  rect(b, x0, y0, x1, y0 + 0.12, mix(green, c.ink, 0.25))
}

const lum = (hexc: string): number => {
  const v = parseInt(hexc.slice(1), 16)
  return (0.3 * ((v >> 16) & 255) + 0.59 * ((v >> 8) & 255) + 0.11 * (v & 255)) / 255
}

/** The door: planked, under a round arch of stone voussoirs. */
export function drawDoor(b: Brush, t: number): void {
  const c = tones(t)
  const d = HOUSE.door
  const mx = (d.x0 + d.x1) / 2
  const r = (d.x1 - d.x0) / 2
  const spring = d.y0 + r
  // The voussoirs: a ring of stone round the arch.
  poly(b, [...arc(mx, spring, r + 0.55, r + 0.55, Math.PI, Math.PI * 2, 16), [d.x1 + 0.55, d.y1], [d.x0 - 0.55, d.y1]], c.stone)
  const g = b.g
  g.strokeStyle = c.stoneShade
  g.lineWidth = Math.max(b.px, 0.05)
  g.beginPath()
  for (let i = 1; i < 9; i++) {
    const a = Math.PI + (Math.PI * i) / 9
    g.moveTo(mx + Math.cos(a) * r, spring + Math.sin(a) * r)
    g.lineTo(mx + Math.cos(a) * (r + 0.55), spring + Math.sin(a) * (r + 0.55))
  }
  g.stroke()
  // The door's planks.
  const wood = mix(c.wood, c.ink, 0.15)
  poly(b, [...arc(mx, spring, r, r, Math.PI, Math.PI * 2, 16), [d.x1, d.y1], [d.x0, d.y1]], wood)
  g.fillStyle = mix(wood, c.ink, 0.3)
  for (let x = d.x0 + 0.56; x < d.x1 - 0.2; x += 0.56) g.fillRect(x, d.y0, 0.05, d.y1 - d.y0)
  rect(b, d.x0, d.y1 - 2.6, d.x1, d.y1 - 2.45, mix(wood, c.ink, 0.3))
  rect(b, d.x0, d.y0 + r + 1.4, d.x1, d.y0 + r + 1.55, mix(wood, c.ink, 0.3))
  disc(b, d.x1 - 0.5, d.y1 - 4, 0.09, c.iron)
}

/* ------------------------------------------------------------------ the gutter and the pipe */

/** The gutter's back half: the inside of the half round, behind the ball, and its iron brackets. */
export function drawGutterBack(b: Brush, t: number): void {
  const c = tones(t)
  const { x0, x1, r } = GUTTER
  const inner: Pt[] = []
  for (let i = 0; i <= 12; i++) {
    const x = x0 + ((x1 - x0) * i) / 12
    inner.push([x, gutterY(x) - r * 0.9])
  }
  for (let i = 12; i >= 0; i--) {
    const x = x0 + ((x1 - x0) * i) / 12
    inner.push([x, gutterY(x) + 0.02])
  }
  poly(b, inner, c.tileDeep)
  // Brackets: a strap of iron from the wall round under the gutter, every two cells.
  for (let x = x0 + 0.6; x < x1; x += 2.1) {
    const y = gutterY(x)
    bar(b, x, HOUSE.eave + 0.1, x, y + 0.12, c.iron, 0.07)
  }
}

/** The gutter's front lip, in front of the ball: it hides the ball's foot. */
export function drawGutterFront(b: Brush, t: number): void {
  const c = tones(t)
  const { x0, x1 } = GUTTER
  const pts: Pt[] = []
  for (let i = 0; i <= 12; i++) {
    const x = x0 + ((x1 - x0) * i) / 12
    pts.push([x, gutterY(x) - 0.06])
  }
  for (let i = 12; i >= 0; i--) {
    const x = x0 + ((x1 - x0) * i) / 12
    pts.push([x, gutterY(x) + 0.2])
  }
  poly(b, pts, c.tile)
  line(b, x0, gutterY(x0) - 0.06, x1, gutterY(x1) - 0.06, mix(c.tile, c.plaster, 0.35), Math.max(1, b.k * 0.025))
  // The gutter's closed west end.
  rect(b, x0 - 0.05, gutterY(x0) - 0.3, x0 + 0.04, gutterY(x0) + 0.2, c.tileShade)
}

/**
 * The rainwater head and the pipe down the wall: terracotta lengths, each socketed into the next, held by clips.
 * `knock(i)` is how far length `i` (from the top) is jolted just now, as the ball goes down inside it.
 */
export function drawPipe(b: Brush, t: number, knock: (i: number) => number): void {
  const c = tones(t)
  const { x, head, bottom } = PIPE
  const pr = 0.22
  // The lengths.
  const n = PIPE_LENGTHS
  const span = (bottom - 0.6 - head.y1) / n
  for (let i = 0; i < n; i++) {
    const y0 = head.y1 + i * span
    const j = knock(i)
    const dx = j * 0.05
    rect(b, x - pr + dx, y0, x + pr + dx, y0 + span, c.tile)
    rect(b, x + pr * 0.35 + dx, y0, x + pr + dx, y0 + span, c.tileShade)
    // The socket collar at its top.
    rect(b, x - pr - 0.06 + dx, y0, x + pr + 0.06 + dx, y0 + 0.28, mix(c.tile, c.tileShade, 0.4))
    // A clip to the wall.
    rect(b, x - pr - 0.1, y0 + span * 0.55, x + pr + 0.1, y0 + span * 0.55 + 0.09, c.iron)
  }
  // The shoe: the last length turned out to the east.
  const y = bottom - 0.6
  poly(b, [[x - pr, y], [x + pr, y], [x + pr, y + 0.15], [PIPE.mouth[0] + 0.1, PIPE.mouth[1] - 0.24], [PIPE.mouth[0] + 0.1, PIPE.mouth[1] + 0.2], [x - 0.05, y + 0.62], [x - pr, y + 0.45]], c.tile)
  rect(b, PIPE.mouth[0] + 0.02, PIPE.mouth[1] - 0.27, PIPE.mouth[0] + 0.14, PIPE.mouth[1] + 0.23, c.tileShade)
  // The head: a wide terracotta box with its mouth up, taking the gutter's end.
  const hy0 = head.y0
  const hy1 = head.y1
  poly(b, [[x - head.w0 / 2, hy0], [x + head.w0 / 2, hy0], [x + head.w1 / 2 + 0.1, hy1], [x - head.w1 / 2 - 0.1, hy1]], c.tile)
  rect(b, x - head.w0 / 2 - 0.06, hy0 - 0.08, x + head.w0 / 2 + 0.06, hy0 + 0.12, mix(c.tile, c.tileShade, 0.5))
  poly(b, [[x + head.w0 / 4, hy0 + 0.12], [x + head.w0 / 2, hy0 + 0.12], [x + head.w1 / 2 + 0.1, hy1], [x + head.w1 / 4, hy1]], c.tileShade)
}

/** How many lengths the pipe is made of. */
export const PIPE_LENGTHS = 5

export { line }

/**
 * The rest of the charterhouse, west of the cell and a little behind it: the next cells' walls and roofs, and the
 * church's tower with its dome of green glazed tile. In shade: the cell is what the eye is for.
 */
export function drawNeighbours(b: Brush, t: number): void {
  const c = tones(t)
  const wall = mix(c.plasterShade, c.mtNear, 0.35)
  const roof = mix(c.tileShade, c.mtNear, 0.4)
  // The tower: a square shaft, an octagonal drum, a dome, a lantern.
  const tx = -31
  rect(b, tx - 4, -46, tx + 4, 0, mix(wall, c.ink, 0.12))
  rect(b, tx - 4, -46, tx - 2.6, 0, mix(wall, c.ink, 0.22))
  rect(b, tx - 3.3, -54, tx + 3.3, -46, mix(wall, c.ink, 0.08))
  rect(b, tx - 1, -44, tx + 1, -40.5, mix(c.ink, wall, 0.25))
  const dome: Pt[] = arc(tx, -54, 3.6, 4.8, Math.PI, Math.PI * 2, 14)
  poly(b, [...dome, [tx + 3.6, -54], [tx - 3.6, -54]], mix('#4F7A6A', c.mtNear, 0.45))
  rect(b, tx - 0.6, -61.5, tx + 0.6, -58.4, mix(wall, c.ink, 0.1))
  // The church's roof running west from the tower, low.
  rect(b, tx + 4, -16, tx + 15, 0, mix(wall, c.ink, 0.2))
  rect(b, tx + 3.6, -18.5, tx + 15.5, -15.8, roof)
}
