import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { hash, type Ctx } from '../kit'
import { ROAD } from '../worlds'
import { cone, glow, hexA, lit, pool, poly, rect, seg, wash } from './crash-paint'

/**
 * The competition's hall at Overbrook, in the folder part's frame (the ball enters at (-0.5, 0), sitting on a drum
 * case backstage): everything that stands still while the story happens in front of it. Left to right:
 *
 *   the vending machine (-5.3 .. -3.1) | a step case | the trap case he sits on (-1.1 .. 0.1) | two long road cases
 *   (to 4.5) | the stage-left wing | the stage: the kit (snare at 9.5), Fletcher's place (12.9), the band on its
 *   riser (13.9 .. 17.2) | the stage-right wing | the side wall with its loading door (18.4 .. 18.8) | outside
 *
 * The floor is at y = FL everywhere (the kit's own floor: `drums.ts` KIT_FLOOR). A cell is about a foot. Every
 * colour here is dimmed toward the paper by the light it stands in (`lit`), so the set can open dark and wake.
 */

export const FL = 2.25
/** The cases backstage: [x0, x1, top]. */
export const TRAP = { x0: -1.1, x1: 0.1, top: 0.13 }
export const STEP = { x0: -2.25, x1: -1.13, top: 1.15 }
export const CASE_A = { x0: 0.13, x1: 2.25, top: 0.13 }
export const CASE_B = { x0: 2.28, x1: 4.5, top: 0.13 }
/** The vending machine, and its parts: the button he presses, the shelf the can sticks on, the bay it falls into. */
export const MACHINE = { x0: -5.3, x1: -3.1, top: FL - 4.0 }
export const BUTTON: Pt = [-3.42, 0.28]
export const SHELF_Y = 0.02
export const CAN_X = -4.12
export const BAY_Y = 1.72
/** The wings: stage left (between backstage and the stage) and stage right. */
export const WING_L = { x0: 4.75, x1: 5.45 }
export const WING_R = { x0: 17.5, x1: 18.1 }
/** The kit's origin (the ball on its snare) on the stage. */
export const KX = 9.5
/** Where Fletcher conducts from: his head (his ball). */
export const FLETCH: Pt = [12.9, FL - 3.2]
/** The band's riser, and its players: saxophones in front on the floor, trumpets behind on the riser. */
export const RISER = { x0: 13.9, x1: 17.25, h: 0.55 }
export const SAXES = [14.45, 15.4, 16.35]
export const TRUMPETS = [14.9, 15.85, 16.8]
/** The side wall (cut through) and its loading door. */
export const WALL = { x0: 18.4, x1: 18.8, door: 3.3 }
/** Where the backstage ends on the left, and the ceiling. */
const BACK_X0 = -13
const CEIL = -3.7

/* ------------------------------------------------------------------ the room */

/** The backstage room: its back wall (block, in panels), its ceiling and tubes, the concrete floor. */
export function drawBackstage(p: p5, c: Ctx, light: number, f: { x0: number; x1: number; y0: number; y1: number }): void {
  const { k, ink, weight } = c
  const x0 = Math.max(f.x0 - 1, BACK_X0)
  const x1 = Math.min(f.x1 + 1, WING_L.x1)
  if (x1 <= x0) return
  p.push()
  p.noStroke()
  p.fill(lit(c, mixHex(c.bg, ROAD.deep, 1), 0.3 + 0.7 * light))
  rect(p, k, x0, Math.max(f.y0 - 1, CEIL - 3), x1, FL)
  // The ceiling, a dark band, and the tubes hung from it: two fixtures over the cases and the machine.
  p.noStroke()
  p.fill(lit(c, ROAD.asphalt, 0.4 + 0.6 * light))
  rect(p, k, x0, CEIL - 3, x1, CEIL)
  for (const tx of [-3.9, 1.6]) {
    solid(p, lit(c, ink, 0.3 + 0.5 * light), weight * 0.6, lit(c, ROAD.asphalt, 0.5 + 0.5 * light))
    rect(p, k, tx - 1.1, CEIL + 0.18, tx + 1.1, CEIL + 0.34, 0.03)
    seg(p, k, [tx - 0.9, CEIL], [tx - 0.9, CEIL + 0.18])
    seg(p, k, [tx + 0.9, CEIL], [tx + 0.9, CEIL + 0.18])
    p.noStroke()
    p.fill(light > 0.1 ? mixHex(ROAD.paint, '#FFFFFF', 0.3 * light) : lit(c, ROAD.paint, 0.25))
    rect(p, k, tx - 1.0, CEIL + 0.34, tx + 1.0, CEIL + 0.42, 0.03)
  }
  // The floor: concrete, a band to the frame's foot.
  solid(p, lit(c, ink, 0.25 + 0.3 * light), weight * 0.7, lit(c, mixHex(ROAD.asphalt, ROAD.paint, 0.08), 0.35 + 0.65 * light))
  rect(p, k, x0, FL, x1, FL + 3)
  p.pop()
}

/** The tubes' light: a soft cool wash from the ceiling, fading down the wall, and a pool on the floor. Additive. */
export function drawBackstageLight(p: p5, c: Ctx, light: number): void {
  if (light <= 0.01) return
  for (const tx of [-3.9, 1.6]) {
    glow(p, c, tx, CEIL + 0.4, 1.1, 0.35 * light, ROAD.paint)
    glow(p, c, tx, CEIL + 1.6, 4.2, 0.07 * light, ROAD.paint)
    pool(p, c, tx, FL + 0.05, 3.4, 0.3, 0.09 * light, ROAD.paint)
  }
}

/* ------------------------------------------------------------------ the cases */

/** An edge on the dark: the case's own shadow, darker than the paper, never a pale line. */
const DARK_EDGE = '#101317'

/**
 * A road case: black laminate, edged in its own dark; aluminium only where the tubes' light catches it (along the
 * top of the lid); the lid's seam, two dark latches with a glint on top, and the recessed handle.
 */
function roadCase(p: p5, c: Ctx, x0: number, x1: number, top: number, light: number): void {
  const { k, weight } = c
  const L = 0.3 + 0.7 * light
  const body = lit(c, mixHex(ROAD.asphalt, ROAD.deep, 0.3), L)
  solid(p, DARK_EDGE, weight * 0.6, body)
  rect(p, k, x0, top, x1, FL, 0.03)
  // The lit top edge (the tubes are overhead); the corners' aluminium in shadow, only a shade off the laminate.
  const al = lit(c, mixHex(ROAD.asphalt, mixHex(ROAD.paint, ROAD.car, 0.35), 0.55), L)
  const shadowAl = mixHex(body, al, 0.25)
  p.noStroke()
  p.fill(shadowAl)
  rect(p, k, x0, top, x0 + 0.06, FL)
  rect(p, k, x1 - 0.06, top, x1, FL)
  rect(p, k, x0, FL - 0.07, x1, FL, 0.02)
  p.fill(al)
  rect(p, k, x0, top, x1, top + 0.06, 0.02)
  const seamY = top + Math.min(0.42, (FL - top) * 0.28)
  outline(p, DARK_EDGE, weight * 0.8)
  seg(p, k, [x0 + 0.06, seamY], [x1 - 0.06, seamY])
  p.stroke(hexA(ROAD.paint, 0.12 * light))
  p.strokeWeight(weight * 0.5)
  seg(p, k, [x0 + 0.06, seamY + 0.03], [x1 - 0.06, seamY + 0.03])
  // The latches: dark, a glint along their tops.
  for (const u of [0.18, 0.82]) {
    const lx = x0 + (x1 - x0) * u
    solid(p, DARK_EDGE, weight * 0.5, lit(c, ROAD.deep, L))
    rect(p, k, lx - 0.07, seamY - 0.05, lx + 0.07, seamY + 0.07, 0.015)
    p.noStroke()
    p.fill(hexA(ROAD.paint, 0.35 * light))
    rect(p, k, lx - 0.05, seamY - 0.05, lx + 0.05, seamY - 0.03)
  }
  p.noStroke()
  p.fill(lit(c, ROAD.deep, L))
  const mid = (x0 + x1) / 2
  rect(p, k, mid - 0.22, seamY + 0.28, mid + 0.22, seamY + 0.4, 0.05)
}

/** The trap case he sits on: a tall drum-hardware case, round, seen from the side: its lid a thin ellipse. */
function trapCase(p: p5, c: Ctx, light: number): void {
  const { k, weight } = c
  const { x0, x1, top } = TRAP
  const L = 0.3 + 0.7 * light
  const mid = (x0 + x1) / 2
  const w = x1 - x0
  solid(p, DARK_EDGE, weight * 0.6, lit(c, mixHex(ROAD.asphalt, ROAD.deep, 0.2), L))
  p.beginShape()
  p.vertex(x0 * k, top * k)
  p.vertex(x1 * k, top * k)
  p.vertex(x1 * k, (FL - 0.06) * k)
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI
    p.vertex((mid + (Math.cos(a) * w) / 2) * k, (FL - 0.06 + Math.sin(a) * 0.06) * k)
  }
  p.endShape(p.CLOSE)
  // Round: the light down its left side, a soft band, as on a drum's shell.
  p.noStroke()
  p.fill(hexA(ROAD.paint, 0.07 * light))
  rect(p, k, x0 + w * 0.16, top + 0.06, x0 + w * 0.34, FL - 0.02)
  // The bands: dark straps round it, and the lid's rim catching the tubes' light.
  outline(p, DARK_EDGE, weight * 1.2)
  for (const y of [0.6, 1.45]) p.arc(mid * k, y * k, w * k, 0.12 * k, 0, Math.PI)
  solid(p, DARK_EDGE, weight * 0.6, lit(c, mixHex(ROAD.asphalt, ROAD.paint, 0.08), L))
  p.ellipse(mid * k, top * k, w * k, 0.13 * k)
  p.noFill()
  p.stroke(hexA(ROAD.paint, 0.4 * light))
  p.strokeWeight(weight * 0.7)
  p.arc(mid * k, top * k, w * k, 0.13 * k, Math.PI * 1.05, Math.PI * 1.95)
}

export function drawCases(p: p5, c: Ctx, light: number): void {
  p.push()
  roadCase(p, c, STEP.x0, STEP.x1, STEP.top, light)
  roadCase(p, c, CASE_A.x0, CASE_A.x1, CASE_A.top, light)
  roadCase(p, c, CASE_B.x0, CASE_B.x1, CASE_B.top, light)
  trapCase(p, c, light)
  p.pop()
}

/* ------------------------------------------------------------------ the vending machine */

export interface MachineLook {
  light: number
  /** How lit its own window is (it wakes with the room). */
  glow: number
  /** The chosen row's coil, turned (radians). */
  coil: number
  /** The can: where its middle is, and its tilt; null once it is in the bay and out of the way. */
  can: { x: number; y: number; tilt: number } | null
  /** The whole machine rocking on its foot (radians, positive tips it left). */
  rock: number
  /** The button, pressed (0..1). */
  press: number
}

const PRODUCTS = [ROAD.brake, ROAD.folder, ROAD.car, ROAD.sodium, ROAD.paint]

export function drawMachine(p: p5, c: Ctx, s: MachineLook): void {
  const { k, ink, weight } = c
  const { x0, x1, top } = MACHINE
  const L = 0.3 + 0.7 * s.light
  p.push()
  // It rocks about its front foot on the side it is struck from.
  const pivot: Pt = [x0, FL]
  p.translate(pivot[0] * k, pivot[1] * k)
  p.rotate(-s.rock)
  p.translate(-pivot[0] * k, -pivot[1] * k)
  // The cabinet: a deep red, its top rounded a little; the dark foot.
  solid(p, lit(c, ink, 0.3 + 0.6 * s.light), weight, lit(c, mixHex(ROAD.brake, ROAD.deep, 0.5), L))
  rect(p, k, x0, top, x1, FL - 0.1, 0.06)
  p.fill(lit(c, ROAD.deep, L))
  rect(p, k, x0 + 0.1, FL - 0.12, x1 - 0.1, FL)
  // The window, lit from inside; its shelves, the products on them, and the coils in front.
  const wx0 = x0 + 0.16
  const wx1 = x1 - 0.62
  const wy0 = top + 0.14
  const wy1 = SHELF_Y + 0.75
  const inside = mixHex(ROAD.deep, ROAD.paint, 0.18 + 0.5 * s.glow)
  solid(p, lit(c, ink, 0.3 + 0.6 * s.light), weight * 0.7, lit(c, inside, Math.max(L, s.glow)))
  rect(p, k, wx0, wy0, wx1, wy1, 0.03)
  const shelves = [SHELF_Y - 1.95, SHELF_Y - 1.28, SHELF_Y - 0.64, SHELF_Y, SHELF_Y + 0.64]
  const cols = 4
  const colW = (wx1 - wx0 - 0.1) / cols
  for (let r = 0; r < shelves.length - 1; r++) {
    const y = shelves[r + 1]
    if (y > wy1 + 0.01) continue
    for (let i = 0; i < cols; i++) {
      const cx = wx0 + 0.05 + colW * (i + 0.5)
      const chosen = r === 2 && i === 3
      if (chosen) continue
      const col = PRODUCTS[(r * 3 + i * 2) % PRODUCTS.length]
      const h = 0.29 + 0.05 * hash(r, i)
      solid(p, lit(c, ink, 0.25 + 0.45 * s.glow), weight * 0.5, lit(c, col, 0.35 + 0.65 * Math.max(s.glow, s.light)))
      rect(p, k, cx - colW * 0.28, y - h, cx + colW * 0.28, y - 0.02, 0.03)
    }
    // The shelf, and its coil: a spring along it, turning (its loops walk along as it turns).
    outline(p, lit(c, mixHex(ROAD.paint, ROAD.car, 0.3), 0.25 + 0.6 * Math.max(s.glow, s.light)), weight * 0.8)
    seg(p, k, [wx0, y], [wx1, y])
    const phase = r === 2 ? s.coil : 0
    p.strokeWeight(weight * 0.55)
    p.beginShape()
    for (let j = 0; j <= 48; j++) {
      const x = wx0 + 0.04 + ((wx1 - wx0 - 0.08) * j) / 48
      p.vertex(x * k, (y - 0.03 - 0.035 * (1 + Math.sin(((x - wx0) / colW) * Math.PI * 6 + phase))) * k)
    }
    p.endShape()
  }
  // The glass's glint.
  p.stroke(hexA(ROAD.paint, 0.12 + 0.2 * s.glow))
  p.strokeWeight(weight * 1.2)
  seg(p, k, [wx0 + 0.2, wy1 - 0.15], [wx0 + 0.75, wy0 + 0.2])
  // The keypad column: its buttons (small rectangles, the chosen one lighting when pressed), and the coin slot.
  const kx0 = x1 - 0.52
  const kx1 = x1 - 0.12
  solid(p, lit(c, ink, 0.3 + 0.6 * s.light), weight * 0.6, lit(c, ROAD.deep, L))
  rect(p, k, kx0, top + 0.3, kx1, SHELF_Y + 0.75, 0.03)
  // The one he presses is the lowest, where his jump reaches.
  for (let i = 0; i < 6; i++) {
    const by = BUTTON[1] - (5 - i) * 0.22
    const lit1 = i === 5 ? s.press : 0
    p.noStroke()
    p.fill(lit1 > 0.02 ? mixHex(ROAD.paint, ROAD.sodium, 0.5) : lit(c, mixHex(ROAD.paint, ROAD.car, 0.4), 0.3 + 0.5 * Math.max(s.glow, s.light)))
    rect(p, k, kx0 + 0.09, by - 0.05, kx1 - 0.09, by + 0.05, 0.02)
  }
  // The delivery bay, under a hinged flap.
  solid(p, lit(c, ink, 0.3 + 0.6 * s.light), weight * 0.7, lit(c, ROAD.deep, L))
  rect(p, k, x0 + 0.3, BAY_Y - 0.42, x1 - 0.7, BAY_Y + 0.02, 0.04)
  // The chosen can: on its shelf, walked to the edge by the coil, hanging there, and falling; seen through the
  // window and in the bay, hidden by the cabinet between them.
  if (s.can) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    ctx.beginPath()
    ctx.rect(wx0 * k, wy0 * k, (wx1 - wx0) * k, (wy1 - wy0) * k)
    ctx.rect((x0 + 0.3) * k, (BAY_Y - 0.42) * k, (x1 - 1.0 - x0) * k, 0.44 * k)
    ctx.clip()
    p.push()
    p.translate(s.can.x * k, s.can.y * k)
    p.rotate(s.can.tilt)
    solid(p, lit(c, ink, 0.3 + 0.6 * Math.max(s.glow, s.light)), weight * 0.55, lit(c, ROAD.sodium, 0.4 + 0.6 * Math.max(s.glow, s.light)))
    rect(p, k, -0.11, -0.19, 0.11, 0.19, 0.035)
    p.noStroke()
    p.fill(hexA(ROAD.paint, 0.4))
    rect(p, k, -0.07, -0.15, -0.03, 0.12, 0.02)
    p.pop()
    ctx.restore()
  }
  p.fill(lit(c, mixHex(ROAD.brake, ROAD.deep, 0.65), L))
  p.stroke(lit(c, ink, 0.3 + 0.6 * s.light))
  p.strokeWeight(weight * 0.7)
  rect(p, k, x0 + 0.34, BAY_Y - 0.4, x1 - 0.74, BAY_Y - 0.28, 0.03)
  p.pop()
}

/** The machine's own light, spilled on the floor in front of it. Additive. */
export function drawMachineLight(p: p5, c: Ctx, s: MachineLook): void {
  if (s.glow <= 0.01) return
  const { x0, x1, top } = MACHINE
  glow(p, c, (x0 + x1) / 2 - 0.2, (top + SHELF_Y) / 2, 2.4, 0.13 * s.glow, ROAD.paint)
  pool(p, c, (x0 + x1) / 2, FL + 0.06, 2.6, 0.3, 0.14 * s.glow, ROAD.paint)
}

/* ------------------------------------------------------------------ the folder */

/**
 * Tanner's folder, lying on a case lid: manila, seen a little from above, its tab up at the back and the edges of
 * his chart peeking from its front. `x` is its middle; `rock` tips it (it settles when it is set down).
 */
export function drawFolder(p: p5, c: Ctx, x: number, top: number, rock: number, light: number): void {
  const { k, ink, weight } = c
  const L = 0.35 + 0.65 * light
  const w = 1.02
  p.push()
  p.translate(x * k, top * k)
  p.rotate(rock)
  // The folder's back cover, its top face foreshortened, and its tab standing up at the back.
  solid(p, lit(c, ink, 0.3 + 0.6 * light), weight * 0.6, lit(c, mixHex(ROAD.folder, ROAD.deep, 0.18), L))
  poly(p, k, [[-w / 2 + 0.08, -0.26], [-w / 2 + 0.13, -0.34], [-w / 2 + 0.44, -0.34], [-w / 2 + 0.49, -0.26]])
  poly(p, k, [[-w / 2, -0.03], [w / 2, -0.03], [w / 2 - 0.1, -0.26], [-w / 2 + 0.06, -0.26]])
  // The chart inside, fanned a little out of its mouth: pale pages with a few ruled bars, nothing written.
  solid(p, lit(c, ink, 0.2 + 0.5 * light), weight * 0.45, lit(c, ROAD.paint, L))
  poly(p, k, [[-w / 2 + 0.1, -0.06], [w / 2 + 0.06, -0.08], [w / 2 - 0.02, -0.22], [-w / 2 + 0.14, -0.21]])
  p.stroke(hexA(ROAD.deep, 0.45 * light))
  p.strokeWeight(weight * 0.4)
  for (const v of [-0.115, -0.15, -0.185]) seg(p, k, [-w / 2 + 0.2, v], [w / 2 - 0.08, v - 0.012])
  // The front cover over it, lying open a crack.
  solid(p, lit(c, ink, 0.3 + 0.6 * light), weight * 0.6, lit(c, ROAD.folder, L))
  poly(p, k, [[-w / 2, 0], [w / 2, 0], [w / 2 - 0.06, -0.1], [-w / 2 + 0.03, -0.09]])
  p.pop()
}

/* ------------------------------------------------------------------ the stage */

/** A wing: a black-red leg of curtain hung from the flies, its folds a little lit at the edge toward the stage. */
export function drawWing(p: p5, c: Ctx, x0: number, x1: number, light: number, from: 'left' | 'right'): void {
  const { k, ink, weight } = c
  p.push()
  solid(p, lit(c, ink, 0.15 + 0.3 * light), weight * 0.6, lit(c, ROAD.curtain, 0.35 + 0.65 * light))
  rect(p, k, x0, -8, x1, FL)
  p.noStroke()
  const n = 4
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n
    const edge = from === 'left' ? u : 1 - u
    p.fill(hexA(i % 2 ? ROAD.deep : ROAD.paint, i % 2 ? 0.28 : 0.04 + 0.08 * light * edge))
    rect(p, k, x0 + (x1 - x0) * (i / n), -8, x0 + (x1 - x0) * ((i + 1) / n), FL)
  }
  p.pop()
}

/** The stage: its wooden floor and lip, the dark behind, the batten of lamps overhead. */
export function drawStage(p: p5, c: Ctx, light: number, f: { x0: number; x1: number; y0: number }): void {
  const { k, ink, weight } = c
  const x0 = Math.max(f.x0 - 1, WING_L.x0)
  const x1 = Math.min(f.x1 + 1, WALL.x0)
  if (x1 <= x0) return
  p.push()
  // The dark upstage: a black drape, a step up from the paper where the light falls.
  p.noStroke()
  p.fill(lit(c, mixHex(ROAD.deep, ROAD.curtain, 0.35), 0.35 + 0.65 * light))
  rect(p, k, x0, Math.max(f.y0 - 1, -8), x1, FL)
  // The floor: dark wood, its lip, and the house below it in the dark.
  solid(p, lit(c, ink, 0.25 + 0.4 * light), weight * 0.8, lit(c, mixHex(ROAD.curtain, ROAD.sodium, 0.22), 0.4 + 0.6 * light))
  rect(p, k, x0, FL, x1, FL + 0.3)
  p.noStroke()
  p.fill(mixHex(c.bg, ROAD.deep, 0.6))
  rect(p, k, x0, FL + 0.3, x1, FL + 3)
  // The batten: a pipe high over the stage, its lamps pointed down at the kit, at Fletcher, at the band.
  outline(p, lit(c, ink, 0.25 + 0.35 * light), weight * 1.2)
  seg(p, k, [x0, BATTEN], [x1, BATTEN])
  for (const lx of LAMPS) {
    if (lx < x0 - 0.5 || lx > x1 + 0.5) continue
    solid(p, lit(c, ink, 0.25 + 0.45 * light), weight * 0.6, lit(c, ROAD.asphalt, 0.5 + 0.5 * light))
    p.push()
    p.translate(lx * k, (BATTEN + 0.25) * k)
    p.rotate(0.12)
    rect(p, k, -0.17, -0.22, 0.17, 0.28, 0.05)
    p.noStroke()
    p.fill(light > 0.35 ? mixHex(ROAD.sodium, '#FFF1CF', 0.5) : lit(c, ROAD.sodium, 0.3 + 0.4 * light))
    rect(p, k, -0.13, 0.24, 0.13, 0.31, 0.02)
    p.pop()
  }
  p.pop()
}
const BATTEN = -5.2
const LAMPS = [8.2, 10.6, 13.4, 16.0]

/** The stage's light: a beam from each lamp, a pool on the floor. `light` 0..1 is the whole stage; `hot` flares it. */
export function drawStageLight(p: p5, c: Ctx, light: number, hot: number): void {
  if (light <= 0.01) return
  for (const lx of LAMPS) {
    const a = light * (0.045 + 0.035 * hot)
    cone(p, c, [lx + 0.04, BATTEN + 0.55], [lx - 0.35, FL], 0.3, 3.4, a, mixHex(ROAD.sodium, ROAD.paint, 0.45))
    pool(p, c, lx - 0.35, FL + 0.08, 1.9, 0.28, a * 1.8, mixHex(ROAD.sodium, ROAD.paint, 0.45))
  }
}

/* ------------------------------------------------------------------ the band */

export interface BandLook {
  light: number
  /** Their horns: 0 in their laps, 1 up playing. */
  up: number
  /** Each player's accent at this moment (0..1): a lift of the bell on the band's hits. */
  accent: (seat: number) => number
}

/** The competition's band behind Fletcher: dark seated figures, their stands' pale pages, their horns catching the light. */
export function drawBand(p: p5, c: Ctx, s: BandLook): void {
  const { k, ink, weight } = c
  const L = 0.3 + 0.7 * s.light
  p.push()
  // The riser for the trumpets.
  solid(p, lit(c, ink, 0.2 + 0.4 * s.light), weight * 0.6, lit(c, mixHex(ROAD.deep, ROAD.asphalt, 0.5), L))
  rect(p, k, RISER.x0, FL - RISER.h, RISER.x1, FL)
  const rows: [number[], number, 'trumpet' | 'sax'][] = [[TRUMPETS, FL - RISER.h, 'trumpet'], [SAXES, FL, 'sax']]
  rows.forEach(([xs, floor, horn], row) => {
    xs.forEach((x, i) => {
      const seat = row * 10 + i
      const a = s.accent(seat)
      const body = lit(c, mixHex(ROAD.deep, ROAD.asphalt, 0.35), 0.4 + 0.6 * s.light)
      // The chair: a dark seat on legs.
      solid(p, DARK_EDGE, weight * 0.5, lit(c, ROAD.deep, L))
      rect(p, k, x - 0.28, floor - 0.95, x + 0.3, floor - 0.87)
      seg(p, k, [x - 0.24, floor - 0.87], [x - 0.24, floor])
      seg(p, k, [x + 0.26, floor - 0.87], [x + 0.26, floor])
      // The figure: legs forward, a torso, shoulders, a head a good deal bigger than the ball and in shadow.
      p.noStroke()
      p.fill(body)
      poly(p, k, [[x - 0.26, floor - 0.95], [x + 0.62, floor - 0.95], [x + 0.62, floor - 0.02], [x + 0.46, floor - 0.02], [x + 0.46, floor - 0.72], [x - 0.26, floor - 0.72]])
      rect(p, k, x - 0.3, floor - 2.1, x + 0.3, floor - 0.9, 0.22)
      rect(p, k, x - 0.22, floor - 2.66, x + 0.22, floor - 2.12, 0.18)
      // A rim of light on the shoulder toward the lamps.
      p.stroke(hexA(ROAD.sodium, 0.12 + 0.35 * s.light))
      p.strokeWeight(weight * 0.8)
      p.noFill()
      p.arc((x + 0.02) * k, (floor - 1.9) * k, 0.56 * k, 0.4 * k, Math.PI * 1.05, Math.PI * 1.75)
      // The stand in front of him, and its pale page (a few ruled bars, nothing written).
      outline(p, DARK_EDGE, weight * 1.1)
      seg(p, k, [x - 0.78, floor], [x - 0.78, floor - 1.55])
      p.stroke(hexA(ROAD.sodium, 0.1 + 0.3 * s.light))
      p.strokeWeight(weight * 0.4)
      seg(p, k, [x - 0.8, floor - 0.1], [x - 0.8, floor - 1.55])
      p.noStroke()
      p.fill(lit(c, ROAD.paint, 0.25 + 0.55 * s.light))
      poly(p, k, [[x - 1.08, floor - 1.55], [x - 0.5, floor - 1.55], [x - 0.55, floor - 1.95], [x - 1.04, floor - 1.95]])
      p.stroke(hexA(ROAD.deep, 0.35 * s.light))
      p.strokeWeight(weight * 0.4)
      for (const v of [0.12, 0.22, 0.32]) seg(p, k, [x - 1.02, floor - 1.6 - v], [x - 0.56, floor - 1.6 - v])
      // The horn: a trumpet up at the lips or down, a saxophone's crook and bell; lifted on the band's hits.
      const brass = lit(c, mixHex(ROAD.sodium, ROAD.deep, 0.3), 0.3 + 0.7 * s.light)
      solid(p, lit(c, ink, 0.2 + 0.5 * s.light), weight * 0.55, brass)
      p.push()
      if (horn === 'trumpet') {
        p.translate((x - 0.24) * k, (floor - 2.36 + 0.55 * (1 - s.up)) * k)
        p.rotate(-0.12 - 0.9 * (1 - s.up) - 0.22 * a * s.up + Math.PI)
        rect(p, k, 0, -0.035, 0.62, 0.035)
        poly(p, k, [[0.6, -0.04], [0.82, -0.13], [0.82, 0.13], [0.6, 0.04]])
      } else {
        p.translate((x - 0.2) * k, (floor - 2.3 + 0.35 * (1 - s.up)) * k)
        p.rotate(0.35 - 0.25 * a * s.up + 0.3 * (1 - s.up))
        rect(p, k, -0.05, 0, 0.05, 0.95, 0.03)
        poly(p, k, [[-0.05, 0.9], [0.05, 0.95], [-0.12, 1.12], [-0.34, 1.02], [-0.3, 0.9], [-0.18, 0.96]])
      }
      p.pop()
    })
  })
  p.pop()
}

/* ------------------------------------------------------------------ the side wall */

/** The hall's side wall, cut through, with its roll-up loading door: `open` 0 shut to 1 up in its drum. */
export function drawWall(p: p5, c: Ctx, open: number, light: number, f: { y0: number }): void {
  const { k, ink, weight } = c
  const { x0, x1, door } = WALL
  p.push()
  solid(p, lit(c, ink, 0.3 + 0.4 * light), weight * 0.7, lit(c, mixHex(ROAD.asphalt, ROAD.deep, 0.4), 0.5 + 0.5 * light))
  rect(p, k, x0, Math.max(f.y0 - 1, -9), x1, FL - door)
  rect(p, k, x0, FL, x1, FL + 3)
  // The door's drum over the opening, and the door: slats, rolled up into the drum as it opens.
  p.fill(lit(c, ROAD.asphalt, 0.5 + 0.5 * light))
  rect(p, k, x0 - 0.12, FL - door - 0.35, x1 + 0.12, FL - door + 0.02, 0.06)
  const h = door * (1 - Math.max(0, Math.min(1, open)))
  if (h > 0.02) {
    solid(p, lit(c, ink, 0.3 + 0.4 * light), weight * 0.6, lit(c, mixHex(ROAD.paint, ROAD.car, 0.5), 0.35 + 0.4 * light))
    rect(p, k, x0 + 0.08, FL - door, x1 - 0.08, FL - door + h)
    outline(p, lit(c, ink, 0.2 + 0.3 * light), weight * 0.4)
    for (let y = FL - door + 0.22; y < FL - door + h; y += 0.22) seg(p, k, [x0 + 0.08, y], [x1 - 0.08, y])
  }
  p.pop()
}

/** Outside the open door, the lot's sodium light pouring in along the stage floor. Additive. */
export function drawDoorLight(p: p5, c: Ctx, open: number): void {
  if (open <= 0.01) return
  const { x0, door } = WALL
  const h = door * open
  cone(p, c, [x0 + 0.2, FL - h * 0.55], [x0 - 5.5, FL - 0.2], h * 0.9, 1.6, 0.12 * open, ROAD.sodium)
  pool(p, c, x0 - 1.8, FL + 0.06, 2.8, 0.26, 0.2 * open, ROAD.sodium)
}

void wash
