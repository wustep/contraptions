import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { solid } from '../../../../../../../../src/core/draw'
import { KIT_FLOOR } from '../drums'
import { alpha, hash, type Ctx } from '../kit'
import { SHOP } from '../worlds'

/**
 * The practice room at Shaffer, drawn one way for both visits: the film's first shot (`practice.ts`, 0 → 30.65) and
 * the night of the blood (`night.ts`, 130.5 → 172.07). A narrow room in section, as if the building were cut open
 * along the corridor: acoustic panels on its back wall, one lamp on a cord over the kit (an enamel shade, so no bulb
 * reads as a second ball), a pull-cord by the left doorway that switches it, and a doorway at each end onto a dark
 * corridor lined with the doors of other practice rooms. Night outside, always. The kit is the part's to draw
 * (`drums.ts`), in this frame: the origin is where the ball rests on the snare's head, the floor at `KIT_FLOOR`.
 *
 * Everything outside the rooms is the paper (the building in section); only the insides are filled, so the room
 * has no edge where the drawing stops.
 */

/** The room, in the kit's frame. */
export const ROOM = {
  /** The inner faces of the left and right walls, and their thickness. */
  x0: -5.0,
  x1: 4.0,
  wall: 0.3,
  floor: KIT_FLOOR,
  ceil: KIT_FLOOR - 5.8,
  /** The underside of both doorways' lintels. */
  lintel: KIT_FLOOR - 4.3,
  /** The corridors' ceiling: lower than the room's. */
  hall: KIT_FLOOR - 4.6,
}

/** The lamp: its cord's anchor on the ceiling at `x`, the cord's length to the shade, the shade's height and mouth. */
export const LAMP = { x: 1.7, cord: 0.45, shade: 0.27, mouth: 0.46 }

/** The pull-cord's toggle, by the left doorway: it hangs at ball height, so a ball rolling in knocks it. */
export const PULL = { x: ROOM.x0 + 0.24, top: ROOM.ceil, bottom: KIT_FLOOR - 0.15, len: 0.16 }

/** The corridors' doors: every this many cells along them, from the room's walls. */
const DOOR_EVERY = 3.3
const DOOR_W = 1.2
const DOOR_H = 3.25

export interface RoomLook {
  /** Show time: the dust drifts on it. */
  T: number
  /** The lamp, 0 (off) to 1 (on); a moment over 1 is a flash. */
  light: number
  /** The lamp's swing on its cord, radians (positive: the shade to the right). */
  sway: number
  /** How much of the room reads in the dark, 0..1. */
  ambient?: number
  /** The corridors' own dim fixtures, 0..1. */
  hall?: number
  /** The left corridor's far end, in the kit's frame (drawn from there to the left wall); none when unset. */
  left?: number
  /** The right corridor's far end, in the kit's frame (drawn from the right wall to there); none when unset. */
  right?: number
  /** The corridor's light behind the right doorway, 0..1: someone stands in it, black against it. */
  backlit?: number
  /** The pull-cord's toggle, swung by a knock: radians. */
  pull?: number
  /** The dust in the lamp's light, 0..1: stirred by the kit. */
  dust?: number
}

/* ------------------------------------------------------------------ light */

/** Where the lamp's shade hangs (its mouth's centre) for a swing, in the kit's frame. */
export function lampMouth(sway: number): Pt {
  const L = LAMP.cord + LAMP.shade
  return [LAMP.x + Math.sin(sway) * L, ROOM.ceil + Math.cos(sway) * L]
}

/** Where the lamp's light falls on the floor, for a swing. */
function pool(sway: number): number {
  const [mx, my] = lampMouth(sway)
  return mx + Math.tan(sway) * (ROOM.floor - my)
}

/** How lit a point of the room is, 0..~1: the lamp's pool and the dark round it. */
export function litAt(look: RoomLook, x: number, y: number): number {
  const ambient = look.ambient ?? 0.12
  const light = Math.max(0, look.light)
  const cx = pool(look.sway) * 0.6 + LAMP.x * 0.2 - 0.9 * 0.2
  const cy = ROOM.floor - 2.1
  const dx = (x - cx) / 3.9
  const dy = (y - cy) / 3.8
  return Math.min(1.25, ambient + light * Math.exp(-(dx * dx + dy * dy)))
}

export const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`
}

/** A box by its corners, whatever the rect mode. */
export function box4(p: p5, k: number, x0: number, y0: number, x1: number, y1: number): void {
  p.beginShape()
  p.vertex(x0 * k, y0 * k)
  p.vertex(x1 * k, y0 * k)
  p.vertex(x1 * k, y1 * k)
  p.vertex(x0 * k, y1 * k)
  p.endShape(p.CLOSE)
}

/** A stroke (a colour with alpha, or a hex), its weight and a fill. */
export function inked(p: p5, stroke: p5.Color | string, w: number, fill: string): void {
  p.stroke(stroke as string)
  p.strokeWeight(w)
  p.fill(fill)
}

/* ------------------------------------------------------------------ the room */

/**
 * The dark, over whatever stands in the room: with the lamp off the room is a shape or two in the black. Drawn by the
 * part after its kit and props (the ball, drawn by the stage after that, stays his own colour).
 */
export function drawRoomDark(p: p5, c: Ctx, look: RoomLook): void {
  const dark = 0.84 * (1 - Math.min(1, Math.max(0, look.light)))
  if (dark < 0.005) return
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.fillStyle = rgba(c.bg, dark)
  ctx.fillRect((ROOM.x0 - ROOM.wall) * k, ROOM.ceil * k, (ROOM.x1 - ROOM.x0 + 2 * ROOM.wall) * k, (ROOM.floor - ROOM.ceil + 0.02) * k)
  ctx.restore()
}

/** The room and its corridors, behind whatever the part stands in them (the kit, the people, the ball). */
export function drawPracticeRoom(p: p5, c: Ctx, look: RoomLook): void {
  p.push()
  if (look.left !== undefined) corridor(p, c, look, look.left, ROOM.x0 - ROOM.wall, -1)
  if (look.right !== undefined) corridor(p, c, look, ROOM.x1 + ROOM.wall, look.right, 1)
  backWall(p, c, look)
  floorBand(p, c, look, ROOM.x0, ROOM.x1, true)
  cone(p, c, look)
  section(p, c, look)
  lamp(p, c, look)
  pullCord(p, c, look)
  dust(p, c, look)
  p.pop()
}

function backWall(p: p5, c: Ctx, look: RoomLook): void {
  const { k, bg, ink, weight } = c
  const { x0, x1, ceil, floor } = ROOM
  // The wall itself, dark, then the panels on it, each as lit as the lamp makes its middle.
  p.noStroke()
  p.fill(mixHex(bg, SHOP.deep, 0.4 + 0.6 * Math.min(1, look.ambient ?? 0.12)))
  box4(p, k, x0, ceil, x1, floor)
  // A soft wash of the lamp on the wall, round its pool.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const light = Math.max(0, look.light)
  if (light > 0.01) {
    const cx = pool(look.sway) * 0.6 + LAMP.x * 0.2 - 0.18
    const g = ctx.createRadialGradient(cx * k, (floor - 2.3) * k, 0, cx * k, (floor - 2.3) * k, 4.6 * k)
    g.addColorStop(0, rgba(SHOP.tungsten, 0.16 * light))
    g.addColorStop(1, rgba(SHOP.tungsten, 0))
    ctx.fillStyle = g
    ctx.fillRect(x0 * k, ceil * k, (x1 - x0) * k, (floor - ceil) * k)
  }
  // The panels: fabric-wrapped slabs in a grid, a gap between them, the top edge catching the light.
  const cols = 7
  const rows = 4
  const gap = 0.1
  const px0 = x0 + 0.28
  const px1 = x1 - 0.28
  const py0 = ceil + 0.42
  const py1 = floor - 1.05
  const pw = (px1 - px0 - gap * (cols - 1)) / cols
  const ph = (py1 - py0 - gap * (rows - 1)) / rows
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const ax = px0 + i * (pw + gap)
      const ay = py0 + j * (ph + gap)
      const lit = Math.min(1, litAt(look, ax + pw / 2, ay + ph / 2))
      inked(p, alpha(p, ink, 0.05 + 0.12 * lit), weight * 0.5, mixHex(bg, SHOP.panel, 0.18 + 0.82 * lit))
      p.rect((ax + pw / 2) * k, (ay + ph / 2) * k, pw * k, ph * k, 0.05 * k)
      // The bevel: a lighter line along the top, a darker along the bottom.
      p.stroke(alpha(p, SHOP.window, 0.04 + 0.12 * lit))
      p.line((ax + 0.08) * k, (ay + 0.04) * k, (ax + pw - 0.08) * k, (ay + 0.04) * k)
      p.stroke(alpha(p, SHOP.black, 0.3))
      p.line((ax + 0.08) * k, (ay + ph - 0.03) * k, (ax + pw - 0.08) * k, (ay + ph - 0.03) * k)
    }
  }
  // The skirting: a wooden board along the wall's foot.
  const sk = floor - 0.62
  const skLit = Math.min(1, litAt(look, LAMP.x, sk))
  p.noStroke()
  p.fill(mixHex(bg, SHOP.wood, 0.15 + 0.5 * skLit))
  box4(p, k, x0, sk - 0.16, x1, sk)
  p.stroke(alpha(p, ink, 0.08 + 0.15 * skLit))
  p.strokeWeight(weight * 0.5)
  p.line(x0 * k, (sk - 0.16) * k, x1 * k, (sk - 0.16) * k)
}

/** The strip of floor seen between the wall's foot and the cut: boards, lit where the lamp's pool falls. */
function floorBand(p: p5, c: Ctx, look: RoomLook, x0: number, x1: number, room: boolean): void {
  const { k, bg } = c
  const top = ROOM.floor - 0.62
  const n = Math.max(1, Math.ceil((x1 - x0) / 0.2))
  const w = (x1 - x0) / n
  const h = look.hall ?? 0.25
  p.noStroke()
  for (let i = 0; i < n; i++) {
    const x = x0 + (i + 0.5) * w
    const lit = room ? Math.min(1, litAt(look, x, ROOM.floor - 0.2) * 1.05) : 0
    p.fill(room ? mixHex(bg, SHOP.wood, 0.22 + 0.7 * lit) : mixHex(bg, SHOP.panel, 0.12 + 0.6 * h))
    box4(p, k, x0 + i * w - 0.004, top, x0 + (i + 1) * w + 0.004, ROOM.floor)
  }
  if (!room) return
  // Two board seams running back, faint.
  p.stroke(alpha(p, SHOP.black, 0.35))
  p.strokeWeight(c.weight * 0.4)
  for (const f of [0.38, 0.72]) p.line(x0 * k, (top + (ROOM.floor - top) * f) * k, x1 * k, (top + (ROOM.floor - top) * f) * k)
  // The pool: the lamp's light on the boards.
  const light = Math.max(0, look.light)
  if (light > 0.01) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const cx = pool(look.sway)
    ctx.save()
    ctx.translate(cx * k, (ROOM.floor - 0.3) * k)
    ctx.scale(1, 0.16)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 2.6 * k)
    g.addColorStop(0, rgba(SHOP.tungsten, 0.3 * light))
    g.addColorStop(1, rgba(SHOP.tungsten, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, 2.6 * k, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

/** The lamp's light in the air: a cone from the shade's mouth to the floor, swinging with it. */
function cone(p: p5, c: Ctx, look: RoomLook): void {
  const light = Math.max(0, look.light)
  if (light < 0.01) return
  const { k } = c
  const [mx, my] = lampMouth(look.sway)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  // The light stays in the room: its walls stop it.
  ctx.beginPath()
  ctx.rect(ROOM.x0 * k, ROOM.ceil * k, (ROOM.x1 - ROOM.x0) * k, (ROOM.floor - ROOM.ceil) * k)
  ctx.clip()
  ctx.translate(mx * k, my * k)
  ctx.rotate(-look.sway)
  const L = (ROOM.floor - my) / Math.cos(look.sway)
  for (const [spread, a] of [[3.3, 0.05], [2.2, 0.07]] as const) {
    const g = ctx.createLinearGradient(0, 0, 0, L * k)
    g.addColorStop(0, rgba(SHOP.tungsten, a * light * 1.6))
    g.addColorStop(0.55, rgba(SHOP.tungsten, a * light * 0.7))
    g.addColorStop(1, rgba(SHOP.tungsten, a * light * 0.25))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(-LAMP.mouth * 0.42 * k, 0)
    ctx.lineTo(LAMP.mouth * 0.42 * k, 0)
    ctx.lineTo(spread * k, L * k)
    ctx.lineTo(-spread * k, L * k)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

/** The cut: the room's and the corridors' faces in ink, the doorways open, a sill across each. */
function section(p: p5, c: Ctx, look: RoomLook): void {
  const { k, ink, weight, bg } = c
  const { x0, x1, wall, floor, ceil, lintel, hall } = ROOM
  const lx = look.left !== undefined ? look.left : x0 - wall
  const rx = look.right !== undefined ? look.right : x1 + wall
  const lit = Math.min(1, litAt(look, LAMP.x, 0))
  // The doorways: the opening's reveal, dark, warmed from the room's side.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const light = Math.max(0, look.light)
  for (const [a, b, open] of [[x0 - wall, x0, look.left !== undefined], [x1, x1 + wall, look.right !== undefined]] as const) {
    if (!open) continue
    p.noStroke()
    p.fill(mixHex(bg, SHOP.deep, 0.75))
    box4(p, k, a, lintel, b, floor)
    if (light > 0.01) {
      const inner = a === x0 - wall ? b : a
      const g = ctx.createLinearGradient(inner * k, 0, (a === x0 - wall ? a : b) * k, 0)
      g.addColorStop(0, rgba(SHOP.tungsten, 0.16 * light))
      g.addColorStop(1, rgba(SHOP.tungsten, 0.03 * light))
      ctx.fillStyle = g
      ctx.fillRect(a * k, lintel * k, (b - a) * k, (floor - lintel) * k)
    }
  }
  // The corridor's light behind the right doorway: the opening pale, and a cool glow round it spilling both ways,
  // so whoever stands in it is black against the light.
  const back = look.backlit ?? 0
  if (back > 0.005 && look.right !== undefined) {
    const g = ctx.createLinearGradient(0, lintel * k, 0, floor * k)
    g.addColorStop(0, rgba(SHOP.window, 0.22 * back))
    g.addColorStop(1, rgba(SHOP.window, 0.38 * back))
    ctx.fillStyle = g
    ctx.fillRect(x1 * k, lintel * k, wall * k, (floor - lintel) * k)
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const cx = (x1 + wall / 2 + 0.25) * k
    const cy = (floor - 1.9) * k
    ctx.translate(cx, cy)
    ctx.scale(0.62, 1)
    const r = 2.6 * k
    const q = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
    q.addColorStop(0, rgba(SHOP.window, 0.2 * back))
    q.addColorStop(0.5, rgba(SHOP.window, 0.08 * back))
    q.addColorStop(1, rgba(SHOP.window, 0))
    ctx.fillStyle = q
    ctx.fillRect(-r, -r, 2 * r, 2 * r)
    ctx.restore()
  }
  // The building's mass round the rooms: the walls, the lintels and the ceilings as dark planes, no outlines (an
  // ink contour round them read as stray stepped hairlines at the frame's edges).
  p.noStroke()
  p.fill(mixHex(bg, SHOP.black, 0.45))
  for (const [face, out, side] of [[x0, x0 - wall, look.left], [x1, x1 + wall, look.right]] as const) {
    box4(p, k, Math.min(face, out), ceil - 0.6, Math.max(face, out), side !== undefined ? lintel : floor)
  }
  box4(p, k, x0 - wall, ceil - 0.6, x1 + wall, ceil)
  if (look.left !== undefined) box4(p, k, look.left, ceil - 0.6, x0 - wall, hall)
  if (look.right !== undefined) box4(p, k, x1 + wall, ceil - 0.6, look.right, hall)
  // The floor, one line through both doorways.
  p.stroke(alpha(p, ink, 0.4 + 0.45 * lit))
  p.strokeWeight(weight * 1.1)
  p.noFill()
  p.line(Math.min(lx, x0 - wall) * k, floor * k, Math.max(rx, x1 + wall) * k, floor * k)
  // A sill across each doorway: a worn oak strip, a hair proud of the floor.
  for (const [a, b] of [[x0 - wall, x0], [x1, x1 + wall]]) {
    inked(p, alpha(p, ink, 0.5), weight * 0.6, mixHex(bg, SHOP.wood, 0.3 + 0.5 * lit))
    box4(p, k, a - 0.04, floor - 0.035, b + 0.04, floor)
  }
}

/** A corridor from `a` to `b` (kit frame): its dark back wall, the doors of other rooms, the ceiling's fixtures. */
function corridor(p: p5, c: Ctx, look: RoomLook, a: number, b: number, side: -1 | 1): void {
  const { k, bg, ink, weight } = c
  const { floor, hall } = ROOM
  const h = look.hall ?? 0.25
  const x0 = Math.min(a, b)
  const x1 = Math.max(a, b)
  if (x1 - x0 < 0.05) return
  p.noStroke()
  p.fill(mixHex(bg, SHOP.deep, 0.5 + 0.5 * h))
  box4(p, k, x0, hall, x1, floor)
  floorBand(p, c, look, x0, x1, false)
  // The room's light, spilling out of its doorway onto the corridor.
  const light = Math.max(0, look.light)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const doorX = side < 0 ? ROOM.x0 - ROOM.wall : ROOM.x1 + ROOM.wall
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0 * k, hall * k, (x1 - x0) * k, (floor - hall) * k)
  ctx.clip()
  if (light > 0.01) {
    const g = ctx.createRadialGradient(doorX * k, (floor - 1.2) * k, 0, doorX * k, (floor - 1.2) * k, 3.4 * k)
    g.addColorStop(0, rgba(SHOP.tungsten, 0.2 * light))
    g.addColorStop(0.5, rgba(SHOP.tungsten, 0.07 * light))
    g.addColorStop(1, rgba(SHOP.tungsten, 0))
    ctx.fillStyle = g
    ctx.fillRect(x0 * k, hall * k, (x1 - x0) * k, (floor - hall) * k)
  }
  // The fixtures' own dim light, a soft pool under each.
  if (h > 0.01) {
    for (let x = doorX + side * DOOR_EVERY * 0.5; side < 0 ? x > x0 - 1 : x < x1 + 1; x += side * DOOR_EVERY) {
      const g = ctx.createRadialGradient(x * k, hall * k, 0, x * k, hall * k, 2.2 * k)
      g.addColorStop(0, rgba(SHOP.window, 0.1 * h))
      g.addColorStop(1, rgba(SHOP.window, 0))
      ctx.fillStyle = g
      ctx.fillRect((x - 2.2) * k, hall * k, 4.4 * k, 2.4 * k)
    }
  }
  ctx.restore()
  // This room's own door, open back against the corridor's wall: its small window catches the room's light.
  {
    const hinge = doorX + side * 0.06
    const far = hinge + side * DOOR_W
    const a = Math.min(hinge, far)
    const b = Math.max(hinge, far)
    if (a > x0 - 0.01 && b < x1 + 0.01) {
      const lit = Math.min(1, 0.3 * h + 0.55 * light)
      inked(p, alpha(p, ink, 0.2 + 0.3 * lit), weight * 0.7, mixHex(bg, SHOP.wood, 0.25 + 0.45 * lit))
      box4(p, k, a, floor - DOOR_H, b, floor - 0.62)
      const wx = (a + b) / 2
      inked(p, alpha(p, ink, 0.2 + 0.3 * lit), weight * 0.6, mixHex(mixHex(bg, SHOP.black, 0.6), SHOP.window, 0.35 * light))
      box4(p, k, wx - 0.16, floor - DOOR_H + 0.55, wx + 0.16, floor - DOOR_H + 1.25)
      p.stroke(alpha(p, ink, 0.25 + 0.35 * lit))
      p.strokeWeight(weight * 1.1)
      const hx = far - side * 0.16
      p.line(hx * k, (floor - 1.6) * k, (hx - side * 0.18) * k, (floor - 1.6) * k)
    }
  }
  // The doors of the other practice rooms: shut, dark, a small dark window each, a lever handle.
  for (let i = 1; i < 12; i++) {
    const cx = doorX + side * (i * DOOR_EVERY - 0.4)
    if (side < 0 ? cx + DOOR_W / 2 < x0 : cx - DOOR_W / 2 > x1) break
    if (cx - DOOR_W / 2 < x0 + 0.1 || cx + DOOR_W / 2 > x1 - 0.1) continue
    const near = Math.exp(-Math.abs(cx - doorX) / 3) * light
    const lit = Math.min(1, 0.25 * h + 0.35 * near)
    inked(p, alpha(p, ink, 0.16 + 0.3 * lit), weight * 0.7, mixHex(bg, SHOP.wood, 0.2 + 0.45 * lit))
    box4(p, k, cx - DOOR_W / 2, floor - DOOR_H, cx + DOOR_W / 2, floor - 0.62)
    inked(p, alpha(p, ink, 0.1 + 0.25 * lit), weight * 0.6, mixHex(bg, SHOP.black, 0.6))
    box4(p, k, cx - 0.16, floor - DOOR_H + 0.55, cx + 0.16, floor - DOOR_H + 1.25)
    p.stroke(alpha(p, SHOP.window, 0.05 + 0.12 * lit))
    p.strokeWeight(weight * 0.5)
    p.line((cx - 0.1) * k, (floor - DOOR_H + 1.12) * k, (cx + 0.08) * k, (floor - DOOR_H + 0.7) * k)
    p.stroke(alpha(p, ink, 0.22 + 0.35 * lit))
    p.strokeWeight(weight * 1.1)
    const hx = cx - side * (DOOR_W / 2 - 0.16)
    p.line(hx * k, (floor - 1.6) * k, (hx + side * 0.18) * k, (floor - 1.6) * k)
  }
  // The fixtures: flush drums on the ceiling, pale when lit.
  for (let x = doorX + side * DOOR_EVERY * 0.5; side < 0 ? x > x0 + 0.3 : x < x1 - 0.3; x += side * DOOR_EVERY) {
    inked(p, alpha(p, ink, 0.3), weight * 0.6, mixHex(bg, SHOP.window, 0.12 + 0.4 * h))
    p.beginShape()
    p.vertex((x - 0.24) * k, hall * k)
    p.vertex((x + 0.24) * k, hall * k)
    p.vertex((x + 0.19) * k, (hall + 0.07) * k)
    p.vertex((x - 0.19) * k, (hall + 0.07) * k)
    p.endShape(p.CLOSE)
  }
}

/** The lamp: its cord from the ceiling, the socket, the enamel shade, its lit mouth and the bulb's sliver under it. */
function lamp(p: p5, c: Ctx, look: RoomLook): void {
  const { k, bg, ink, weight } = c
  const on = Math.min(1, Math.max(0, look.light))
  p.push()
  p.translate(LAMP.x * k, ROOM.ceil * k)
  p.rotate(-look.sway)
  // A ceiling rose, then the cord.
  inked(p, alpha(p, ink, 0.6), weight * 0.6, mixHex(bg, SHOP.panel, 0.5))
  p.beginShape()
  p.vertex(-0.1 * k, 0)
  p.vertex(0.1 * k, 0)
  p.vertex(0.06 * k, 0.05 * k)
  p.vertex(-0.06 * k, 0.05 * k)
  p.endShape(p.CLOSE)
  p.stroke(alpha(p, ink, 0.7))
  p.strokeWeight(weight * 0.7)
  p.line(0, 0.05 * k, 0, LAMP.cord * k)
  const top = LAMP.cord
  const bot = LAMP.cord + LAMP.shade
  // The socket.
  solid(p, ink, weight * 0.6, mixHex(bg, SHOP.black, 0.7))
  p.beginShape()
  p.vertex(-0.045 * k, (top - 0.05) * k)
  p.vertex(0.045 * k, (top - 0.05) * k)
  p.vertex(0.05 * k, (top + 0.04) * k)
  p.vertex(-0.05 * k, (top + 0.04) * k)
  p.endShape(p.CLOSE)
  // The bulb, just under the shade's rim: a sliver of hot glass, not a globe.
  p.noStroke()
  p.fill(mixHex(mixHex(bg, SHOP.window, 0.25), SHOP.window, on))
  p.arc(0, bot * k, 0.2 * k, 0.1 * k, 0, Math.PI, p.CHORD)
  // The shade: a shallow enamel cone, dark outside, its lip rolled.
  solid(p, ink, weight * 0.8, mixHex(bg, SHOP.black, 0.5))
  p.beginShape()
  p.vertex(-0.06 * k, (top + 0.02) * k)
  p.vertex(0.06 * k, (top + 0.02) * k)
  p.bezierVertex(0.1 * k, (top + 0.1) * k, (LAMP.mouth / 2) * k, (bot - 0.1) * k, (LAMP.mouth / 2) * k, bot * k)
  p.vertex((-LAMP.mouth / 2) * k, bot * k)
  p.bezierVertex((-LAMP.mouth / 2) * k, (bot - 0.1) * k, -0.1 * k, (top + 0.1) * k, -0.06 * k, (top + 0.02) * k)
  p.endShape(p.CLOSE)
  // The inside of the lip, lit.
  p.noFill()
  p.stroke(mixHex(mixHex(bg, SHOP.wood, 0.4), SHOP.window, 0.75 * on))
  p.strokeWeight(weight * 1.2)
  p.line((-LAMP.mouth / 2 + 0.03) * k, (bot - 0.012) * k, (LAMP.mouth / 2 - 0.03) * k, (bot - 0.012) * k)
  p.pop()
}

/** The pull-cord by the left doorway, and its toggle (a short wooden bar) at ball height. */
function pullCord(p: p5, c: Ctx, look: RoomLook): void {
  // Only where a part uses it (the night's switch); the practice room's lamp is on already, and a bare cord there
  // was a hairline with no job.
  if (look.pull === undefined) return
  const { k, bg, ink, weight } = c
  const lit = Math.min(1, litAt(look, PULL.x, 0))
  const a = look.pull ?? 0
  const L = PULL.bottom - PULL.len - PULL.top
  // The cord hangs from a screw-eye; a swing turns it about there.
  const bx = PULL.x + Math.sin(a) * L
  const by = PULL.top + Math.cos(a) * L
  p.push()
  p.stroke(alpha(p, ink, 0.25 + 0.35 * lit))
  p.strokeWeight(weight * 0.5)
  p.line(PULL.x * k, PULL.top * k, bx * k, by * k)
  p.translate(bx * k, by * k)
  p.rotate(-a)
  inked(p, alpha(p, ink, 0.5 + 0.3 * lit), weight * 0.6, mixHex(bg, SHOP.wood, 0.35 + 0.55 * lit))
  p.rect(0, (PULL.len / 2) * k, 0.055 * k, PULL.len * k, 0.02 * k)
  p.pop()
}

/** Dust in the lamp's light: specks of different sizes, drifting, only where the cone is. */
function dust(p: p5, c: Ctx, look: RoomLook): void {
  const light = Math.max(0, look.light)
  if (light < 0.05) return
  const { k } = c
  const [mx, my] = lampMouth(look.sway)
  const stir = look.dust ?? 0
  p.noStroke()
  for (let i = 0; i < 54; i++) {
    const h1 = hash(i, 1, 7)
    const h2 = hash(i, 2, 7)
    const h3 = hash(i, 3, 7)
    // Down the cone's length and across it, drifting slowly, falling a little and coming round again.
    const fall = (((h2 + look.T * (0.012 + 0.02 * h3)) % 1) + 1) % 1
    const d = 0.35 + fall * 4.4
    const across = (h1 - 0.5) * 2 + 0.25 * Math.sin(look.T * (0.2 + 0.2 * h3) + h2 * 20) + 0.2 * stir * Math.sin(look.T * 3.1 + i)
    const half = 0.25 + (d / 4.8) * 2.4
    const x = mx + Math.sin(look.sway) * d + across * half * Math.cos(look.sway)
    const y = my + Math.cos(look.sway) * d
    if (y > ROOM.floor - 0.1) continue
    const edge = 1 - Math.min(1, Math.abs(across))
    const a = Math.min(1, light) * edge * (0.12 + 0.3 * h3) * (0.7 + 0.3 * Math.sin(look.T * 1.3 + i))
    if (a < 0.02) continue
    p.fill(alpha(p, SHOP.window, a))
    const r = 0.009 + 0.017 * h1 * h1
    p.circle(x * k, y * k, 2 * r * k)
  }
}
