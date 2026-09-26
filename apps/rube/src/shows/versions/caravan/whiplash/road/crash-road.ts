import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { hash, type Ctx } from '../kit'
import { ROAD } from '../worlds'
import { BRIDGE, CURB_X, LAMP_X, LOT_LAMP_X, LOT_ON, LOT_Y, POST_LAMP, ROAD_Y, lampAt, postLean } from './crash-clock'
import { cone, glow, hexA, kick, lit, pool, poly, rect, wash } from './crash-paint'

/**
 * The road's set, in the crash part's frame: the night over it, the far hills and a town's few lights, the lot
 * behind the competition's hall (its wall is the folder part's), the curb, the road, the crossing where the truck
 * comes, and the sodium lamps, dark until he passes under each on its beat. Far things move slower than the road
 * (a layer at depth `s` moves `s` of the road's pace on the screen), so the drive has depth without a single line
 * along the ground.
 */

/** The hall's outside wall (the folder part draws inside it); nothing of the road is drawn left of it. */
export const WALL_X = -3.35
/** The crossing, where the truck hits. */
export const CROSS_X = LAMP_X[LAMP_X.length - 1] + 3.4
/** How high a lamp's head hangs over the road, and how far its arm reaches. */
export const LAMP_H = 4.5
const ARM = 0.95
/** The road's near edge on the frame, and the horizon behind it. */
const NEAR = ROAD_Y + 1.25
const HORIZON = ROAD_Y - 0.9

export interface Frame {
  x0: number
  y0: number
  x1: number
  y1: number
  cx: number
  cy: number
}

const hill = (u: number): number => 0.9 + 0.55 * Math.sin(u * 0.21) + 0.35 * Math.sin(u * 0.53 + 1.3) + 0.15 * Math.sin(u * 1.37)
const trees = (u: number): number => 0.95 + 0.3 * Math.sin(u * 0.9) + 0.22 * Math.sin(u * 2.3 + 0.7) + 0.1 * Math.sin(u * 5.1 + 2 * hash(Math.round(u * 2), 1))

/** The night: the paper, a sodium haze low on the horizon, far hills with a town's lights, a near line of trees. */
export function drawSky(p: p5, c: Ctx, f: Frame): void {
  const { k } = c
  const x0 = Math.max(f.x0, WALL_X)
  const x1 = f.x1
  if (x1 <= x0) return
  p.push()
  wash(p, c, x0, HORIZON - 5, x1, HORIZON + 0.4, hexA(ROAD.sodium, 0), hexA(ROAD.sodium, 0.07))
  // The far hills (depth 0.14): a slow soft ridge a shade up from the paper, and the town's lit windows on it.
  const shiftFar = f.cx * 0.86
  p.noStroke()
  p.fill(mixHex(c.bg, ROAD.deep, 0.9))
  p.beginShape()
  p.vertex(x0 * k, (HORIZON + 0.5) * k)
  for (let x = x0; x <= x1 + 0.4; x += 0.4) p.vertex(x * k, (HORIZON - hill(x - shiftFar)) * k)
  p.vertex(x1 * k, (HORIZON + 0.5) * k)
  p.endShape(p.CLOSE)
  // Windows: small, of different sizes and warmth, scattered, never a row of beads.
  for (let i = Math.floor((x0 - shiftFar) / 0.9) - 1; i <= Math.ceil((x1 - shiftFar) / 0.9) + 1; i++) {
    if (hash(i, 7) > 0.3) continue
    const u = i * 0.9 + 0.5 * hash(i, 2)
    const x = u + shiftFar
    if (x < x0 || x > x1) continue
    const y = HORIZON - hill(u) * (0.2 + 0.6 * hash(i, 3))
    const w = 0.05 + 0.08 * hash(i, 5)
    p.fill(hexA(hash(i, 9) > 0.5 ? ROAD.sodium : ROAD.paint, 0.22 + 0.4 * hash(i, 11)))
    rect(p, k, x, y, x + w, y + 0.045)
  }
  // The near trees (depth 0.42): darker, their tops uneven: a band, not a row of puffs.
  const shiftMid = f.cx * 0.58
  p.fill(mixHex(c.bg, ROAD.asphalt, 0.55))
  p.beginShape()
  p.vertex(x0 * k, (ROAD_Y + 0.1) * k)
  for (let x = x0; x <= x1 + 0.2; x += 0.2) p.vertex(x * k, (ROAD_Y - 0.1 - trees(x - shiftMid)) * k)
  p.vertex(x1 * k, (ROAD_Y + 0.1) * k)
  p.endShape(p.CLOSE)
  p.pop()
}

/** The lot behind the hall, the curb, the road and its near edge; the crossing's gap; buildings at the corner. */
export function drawGround(p: p5, c: Ctx, f: Frame): void {
  const { k, ink, weight } = c
  const x0 = Math.max(f.x0 - 1, WALL_X)
  const x1 = f.x1 + 1
  if (x1 <= x0) return
  p.push()
  // The corner's buildings, behind the road: two dark blocks, a parapet catching a little light, a few dim windows
  // in rows; the crossing between them.
  for (const [a, b, h, seed] of [[CROSS_X - 12.5, CROSS_X - 2.1, 3.6, 1], [CROSS_X + 2.1, CROSS_X + 13, 4.4, 2]] as const) {
    if (b < x0 || a > x1) continue
    solid(p, lit(c, ink, 0.18), weight * 0.6, mixHex(c.bg, ROAD.deep, 1))
    rect(p, k, a, ROAD_Y - h, b, ROAD_Y)
    p.fill(mixHex(ROAD.deep, ROAD.paint, 0.08))
    rect(p, k, a - 0.08, ROAD_Y - h - 0.12, b + 0.08, ROAD_Y - h)
    p.noStroke()
    for (let row = 0; row < 2; row++) {
      for (let i = 0; a + 1.0 + i * 1.3 < b - 0.8; i++) {
        if (hash(i, seed, row + 4) > 0.3) continue
        const wx = a + 1.0 + i * 1.3
        const wy = ROAD_Y - h + 0.7 + row * 1.25
        p.fill(hexA(ROAD.sodium, 0.16 + 0.14 * hash(i, seed, row + 7)))
        rect(p, k, wx, wy, wx + 0.55, wy + 0.7)
      }
    }
  }
  // The lot: a step above the road, from the hall's wall to the curb.
  solid(p, lit(c, ink, 0.35), weight * 0.7, mixHex(c.bg, ROAD.asphalt, 0.95))
  if (CURB_X > x0) {
    const e = Math.min(CURB_X, x1)
    poly(p, k, [[x0, LOT_Y], [e, LOT_Y], [e, NEAR + 3], [x0, NEAR + 3]])
  }
  // The road: its surface, its near curb a band lighter with the crossing a gap in it, and the dark verge; over the
  // river, the bridge instead.
  const r0 = Math.max(x0, CURB_X)
  const land = (a: number, b: number) => {
    if (b <= a) return
    solid(p, lit(c, ink, 0.35), weight * 0.7, ROAD.asphalt)
    poly(p, k, [[a, ROAD_Y], [b, ROAD_Y], [b, NEAR], [a, NEAR]])
    p.noStroke()
    p.fill(mixHex(ROAD.asphalt, ROAD.paint, 0.08))
    const g0 = CROSS_X - 1.9
    const g1 = CROSS_X + 1.9
    if (a < g0) rect(p, k, a, NEAR, Math.min(g0, b), NEAR + 0.28)
    if (b > g1) rect(p, k, Math.max(g1, a), NEAR, b, NEAR + 0.28)
    p.fill(mixHex(c.bg, ROAD.deep, 0.7))
    rect(p, k, a, NEAR + 0.28, b, NEAR + 3)
    const lx0 = Math.max(a, g0)
    const lx1 = Math.min(b, g1)
    if (lx1 > lx0) {
      p.fill(ROAD.asphalt)
      rect(p, k, lx0, NEAR, lx1, NEAR + 3)
    }
  }
  land(r0, Math.min(x1, BRIDGE.x0))
  land(Math.max(r0, BRIDGE.x1), x1)
  if (x1 > BRIDGE.x0 && x0 < BRIDGE.x1) drawBridge(p, c, Math.max(x0, BRIDGE.x0 - 1.2), Math.min(x1, BRIDGE.x1 + 1.2))
  p.pop()
}

/** Where the river runs under the bridge. */
const WATER = ROAD_Y + 2.4
const DECK = 0.55

/** The bridge: a steel deck under the road, a rail along it, piers down into the black river, the banks at its ends. */
function drawBridge(p: p5, c: Ctx, a: number, b: number): void {
  const { k, ink, weight } = c
  p.push()
  // The river, a shade of the night, and the far bank's dark line on it.
  p.noStroke()
  p.fill(mixHex(c.bg, ROAD.deep, 0.55))
  rect(p, k, Math.max(a, BRIDGE.x0), WATER, Math.min(b, BRIDGE.x1), WATER + 4)
  p.fill(mixHex(c.bg, ROAD.asphalt, 0.45))
  rect(p, k, Math.max(a, BRIDGE.x0), WATER - 0.12, Math.min(b, BRIDGE.x1), WATER)
  // The banks: the land falling to the water at each end, under the abutments.
  solid(p, lit(c, ink, 0.25), weight * 0.6, mixHex(c.bg, ROAD.deep, 0.9))
  for (const [x, dir] of [[BRIDGE.x0, 1], [BRIDGE.x1, -1]] as const) {
    if (x < a - 3 || x > b + 3) continue
    poly(p, k, [[x - dir * 1.2, ROAD_Y], [x + dir * 0.4, ROAD_Y], [x + dir * 0.4, ROAD_Y + DECK + 0.3], [x + dir * 1.6, WATER + 0.05], [x - dir * 1.2, WATER + 0.05]])
  }
  // The piers, every eleven cells or so, from the deck to the water.
  solid(p, lit(c, ink, 0.25), weight * 0.6, mixHex(c.bg, ROAD.asphalt, 0.75))
  const span = BRIDGE.x1 - BRIDGE.x0
  const n = Math.max(2, Math.round(span / 11))
  for (let i = 1; i < n; i++) {
    const x = BRIDGE.x0 + (span * i) / n
    if (x < a - 1 || x > b + 1) continue
    poly(p, k, [[x - 0.32, ROAD_Y + DECK], [x + 0.32, ROAD_Y + DECK], [x + 0.42, WATER + 0.1], [x - 0.42, WATER + 0.1]])
  }
  // The deck: the road's asphalt over a steel girder with its stiffeners.
  const d0 = Math.max(a, BRIDGE.x0 - 0.4)
  const d1 = Math.min(b, BRIDGE.x1 + 0.4)
  solid(p, lit(c, ink, 0.35), weight * 0.7, ROAD.asphalt)
  rect(p, k, d0, ROAD_Y, d1, ROAD_Y + 0.18)
  solid(p, lit(c, ink, 0.3), weight * 0.6, mixHex(ROAD.asphalt, ROAD.car, 0.25))
  rect(p, k, d0, ROAD_Y + 0.18, d1, ROAD_Y + DECK)
  outline(p, lit(c, mixHex(ROAD.asphalt, ROAD.paint, 0.2), 0.8), weight * 0.5)
  for (let x = Math.ceil(d0 / 0.8) * 0.8; x < d1; x += 0.8) p.line(x * k, (ROAD_Y + 0.22) * k, x * k, (ROAD_Y + DECK - 0.04) * k)
  // The rail along the far edge: a top bar on short posts.
  outline(p, lit(c, mixHex(ROAD.asphalt, ROAD.paint, 0.35), 0.8), weight * 0.8)
  p.line(d0 * k, (ROAD_Y - 0.4) * k, d1 * k, (ROAD_Y - 0.4) * k)
  p.strokeWeight(weight * 0.6)
  for (let x = Math.ceil(d0 / 0.9) * 0.9; x < d1; x += 0.9) p.line(x * k, (ROAD_Y - 0.4) * k, x * k, ROAD_Y * k)
  p.pop()
}

/**
 * The lit lamps doubled in the river: under each, one soft column of sodium on the black water, brightest at the
 * surface and fading down, breathing a little as the water moves. A filled glow, no strokes. Additive.
 */
export function drawReflections(p: p5, c: Ctx, f: Frame, t: number): void {
  if (f.x1 < BRIDGE.x0 || f.x0 > BRIDGE.x1 || f.y1 < WATER) return
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < LAMP_X.length; i++) {
    const lx = LAMP_X[i] + 0.95 + 0.3
    if (lx < BRIDGE.x0 || lx > BRIDGE.x1 || lx < f.x0 - 2 || lx > f.x1 + 2) continue
    const on = lampAt(i, t)
    if (on <= 0.02) continue
    const breathe = 0.85 + 0.15 * Math.sin(t * 1.3 + i * 1.9)
    const sway = 0.05 * Math.sin(t * 0.9 + i * 0.7)
    ctx.save()
    ctx.translate((lx + sway) * k, (WATER + 0.05) * k)
    ctx.scale(1, 3.2)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.42 * k)
    g.addColorStop(0, hexA(ROAD.sodium, 0.2 * on * breathe))
    g.addColorStop(0.55, hexA(ROAD.sodium, 0.07 * on * breathe))
    g.addColorStop(1, hexA(ROAD.sodium, 0))
    ctx.fillStyle = g
    ctx.fillRect(-0.42 * k, 0, 0.84 * k, 0.42 * k)
    ctx.restore()
  }
  ctx.restore()
}

/** Where a lamp's head is, for a post at x leaning `lean` (its top going back along the road). */
function headOf(x: number, base: number, lean: number): Pt {
  const top: Pt = [x - Math.sin(lean) * LAMP_H, base - Math.cos(lean) * LAMP_H]
  return [top[0] + Math.cos(lean) * ARM, top[1] - Math.sin(lean) * ARM + 0.12]
}

/** A lamp post: its pole from the ground, the arm over the road, the head; lit, a warm lens. */
function drawLamp(p: p5, c: Ctx, x: number, base: number, on: number, lean = 0): void {
  const { k, ink, weight } = c
  const glowing = Math.min(1, on)
  const top: Pt = [x - Math.sin(lean) * LAMP_H, base - Math.cos(lean) * LAMP_H]
  const head = headOf(x, base, lean)
  const edge = lit(c, ink, 0.28 + 0.45 * glowing)
  p.push()
  solid(p, edge, weight * 0.6, mixHex(c.bg, ROAD.asphalt, 0.55 + 0.35 * glowing))
  // The pole, tapering, and its foot.
  const nx = Math.cos(lean)
  const ny = -Math.sin(lean)
  poly(p, k, [[x - 0.075 * nx, base - 0.075 * ny], [x + 0.075 * nx, base + 0.075 * ny], [top[0] + 0.045 * nx, top[1] + 0.045 * ny], [top[0] - 0.045 * nx, top[1] - 0.045 * ny]])
  rect(p, k, x - 0.16, base - 0.12, x + 0.16, base)
  // The arm: out over the road in a gentle bow.
  outline(p, edge, weight * 1.5)
  p.beginShape()
  for (let i = 0; i <= 8; i++) {
    const u = i / 8
    p.vertex((top[0] + (head[0] - top[0]) * u) * k, (top[1] + (head[1] - 0.06 - top[1]) * u - 0.18 * Math.sin(Math.PI * u)) * k)
  }
  p.endShape()
  // The head: a long low hood, its lens underneath.
  solid(p, edge, weight * 0.6, mixHex(c.bg, ROAD.asphalt, 0.75))
  poly(p, k, [[head[0] - 0.14, head[1] - 0.07], [head[0] + 0.4, head[1] - 0.05], [head[0] + 0.5, head[1] + 0.03], [head[0] - 0.12, head[1] + 0.05]])
  p.noStroke()
  p.fill(glowing > 0.02 ? mixHex(ROAD.sodium, '#FFF1CF', 0.4 * glowing) : mixHex(c.bg, ROAD.sodium, 0.2))
  poly(p, k, [[head[0] - 0.08, head[1] + 0.04], [head[0] + 0.44, head[1] + 0.03], [head[0] + 0.38, head[1] + 0.1], [head[0] - 0.04, head[1] + 0.1]])
  p.pop()
}

/** A lamp's light: its throw down onto the road and its pool there. Additive, after the ground. */
function drawThrow(p: p5, c: Ctx, x: number, base: number, on: number, lean = 0): void {
  if (on <= 0.01) return
  const head = headOf(x, base, lean)
  const lens: Pt = [head[0] + 0.18, head[1] + 0.09]
  cone(p, c, lens, [lens[0] + 0.2, base], 0.45, 3.4, 0.12 * on, ROAD.sodium)
  pool(p, c, lens[0] + 0.2, base + 0.08, 2.2, 0.36, 0.2 * on, ROAD.sodium)
  glow(p, c, lens[0], lens[1], 0.95, 0.32 * Math.min(1.3, on), ROAD.sodium)
}

/** Every lamp in view: the lot's, and the road's, each lit on its beat. `light` draws their light, else the posts. */
export function drawLamps(p: p5, c: Ctx, f: Frame, t: number, light: boolean): void {
  const seen = (x: number) => x > f.x0 - 3 && x < f.x1 + 1.5
  const draw = light ? drawThrow : drawLamp
  if (seen(LOT_LAMP_X)) draw(p, c, LOT_LAMP_X, LOT_Y, lotLamp(t))
  for (let i = 0; i < LAMP_X.length; i++) {
    if (!seen(LAMP_X[i])) continue
    draw(p, c, LAMP_X[i], ROAD_Y, lampAt(i, t), i === POST_LAMP ? postLean(t) : 0)
  }
}

/** The lot's lamp: dark behind the hall until its loading door rolls up, then on with a flare. */
const lotLamp = (t: number): number => (t < LOT_ON ? 0 : 0.85 + 0.45 * kick(t - LOT_ON, 0.3))

/** How much lamplight falls at road x (the car's paint, the truck's). */
export function lightAt(x: number, t: number): number {
  let sum = 0
  const near = (lx: number, on: number) => {
    const d = (x - (lx + ARM + 0.4)) / 1.9
    sum += on * Math.exp(-d * d)
  }
  near(LOT_LAMP_X, lotLamp(t))
  for (let i = 0; i < LAMP_X.length; i++) if (Math.abs(LAMP_X[i] - x) < 8) near(LAMP_X[i], lampAt(i, t))
  return sum
}
