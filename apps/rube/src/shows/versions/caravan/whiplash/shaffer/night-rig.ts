import type p5 from 'p5'
import { R, mixHex, type Pt } from '../../../../../parts'
import { KIT_FLOOR, drawStick } from '../drums'
import { alpha, hash, type Ctx } from '../kit'
import { TUNE_ORIGIN, TUNE_PERIOD } from '../music'
import { KIT, SHOP } from '../worlds'
import { LAMP, box4 } from './room'

/**
 * The night's props, in the practice room's kit frame (the ball on the snare's head at the origin): the drill rig
 * on the snare (two sticks on hinged posts clamped to its hoop, one for each hand, sprung up, that his landings slap
 * down onto the head), the tape on the grip of the stick that bled, the metronome ticking on a shelf, and the stool
 * with the glass of ice water on it.
 */

/* ------------------------------------------------------------------ the finishes */

/*
 * Every prop here is a filled form edged in its own dark, never the cream ink (a room of ink outlines next to the lit
 * lacquer kit read as a diagram), with a tungsten edge only on the side the lamp is on. As drums.ts's hardware.
 */
/** The room's deepest dark, that a finish's edge sinks toward. */
const DARK = '#050404'
/** Steel in the room's shadow (the rig's posts, clamps and hinges, the metronome's rod and weight): drums.ts's HARDWARE. */
const STEEL = mixHex(KIT.chrome, KIT.shade, 0.42)
/** The hinges' barrels: steel a step darker than the posts. */
const BLOCK = mixHex(STEEL, KIT.shade, 0.55)
/** White tape (the roll, the wound grip). */
const TAPE = KIT.head
/** The lamp's light caught on an edge: on wood, on steel, on tape. */
const WOOD_LIT = mixHex(SHOP.wood, SHOP.tungsten, 0.62)
const STEEL_LIT = mixHex(KIT.chrome, SHOP.tungsten, 0.35)
const TAPE_LIT = mixHex(KIT.head, SHOP.tungsten, 0.25)

/** A finish as the light on it goes: toward the room's paper, as the night's props always did. */
const dim = (bg: string, hex: string, lit: number, floor = 0.3): string => mixHex(bg, hex, floor + (1 - floor) * lit)
/** A finish's own edge: its dark. */
const edgeOf = (hex: string): string => mixHex(hex, DARK, 0.6)
/** Which side of `x` the lamp hangs: 1 right, -1 left. */
const lampSide = (x: number): 1 | -1 => (LAMP.x >= x ? 1 : -1)

/** A filled shape through `pts` (kit frame), edged in `edge`. */
function slab(p: p5, k: number, pts: readonly Pt[], fill: string, edge: string, w: number): void {
  p.fill(fill)
  p.stroke(edge)
  p.strokeWeight(w)
  p.strokeJoin(p.ROUND)
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

/** The lamp's light along an edge from `a` to `b` (kit frame), fading with the light. */
function litEdge(p: p5, k: number, a: Pt, b: Pt, hex: string, lit: number, w: number): void {
  if (lit < 0.1) return
  p.stroke(alpha(p, hex, Math.min(0.85, 0.12 + 0.7 * lit)))
  p.strokeWeight(w)
  p.strokeCap(p.ROUND)
  p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
}

/**
 * A box by its corners (its corners rounded by `r`), filled and edged in its own dark, lit along its top and its
 * lamp-side end.
 */
function block(p: p5, c: Ctx, x0: number, y0: number, x1: number, y1: number, fill: string, lit: number, hi: string, r = 0): void {
  const { k, weight } = c
  if (r > 0) {
    p.push()
    p.rectMode(p.CORNER)
    p.fill(fill)
    p.stroke(edgeOf(fill))
    p.strokeWeight(weight * 0.55)
    p.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k, r * k)
    p.pop()
  } else {
    slab(p, k, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], fill, edgeOf(fill), weight * 0.55)
  }
  const inset = (weight * 0.35) / k
  litEdge(p, k, [x0 + inset + r, y0 + inset], [x1 - inset - r, y0 + inset], hi, lit, weight * 0.5)
  const sx = lampSide((x0 + x1) / 2) > 0 ? x1 - inset : x0 + inset
  litEdge(p, k, [sx, y0 + inset + r], [sx, y1 - inset - r], hi, lit * 0.6, weight * 0.4)
}

/* ------------------------------------------------------------------ the sticks */

/** Half a stick's drawn thickness plus the ball's radius: how far his centre is from a stick he sits on. */
const ON_STICK = R + 0.039
/** How far a stick is sprung up from the head when nothing is on it, radians. */
const RAISE = 0.3

export type Side = 'L' | 'R'
interface Stick {
  hinge: Pt
  len: number
  /** The angle (in the left stick's hand: right is 0, down is positive) when its tip is on the head. */
  down: number
}
function stick(hinge: Pt, tip: Pt, side: Side): Stick {
  const dx = (tip[0] - hinge[0]) * (side === 'L' ? 1 : -1)
  const dy = tip[1] - hinge[1]
  return { hinge, len: Math.hypot(dx, dy), down: Math.atan2(dy, dx) }
}
/** The left hand's stick lands left of the head's middle; the right hand's lands where the blood will be. */
export const STICKS: Record<Side, Stick> = {
  L: stick([-0.72, -0.42], [-0.08, 0.1], 'L'),
  R: stick([0.72, -0.42], [0.16, 0.1], 'R'),
}

/** A point `s` of the way along a stick (0 its hinge, 1 its tip) at angle `a`, in the kit's frame. */
function along(side: Side, a: number, s: number): Pt {
  const k = STICKS[side]
  const m = side === 'L' ? 1 : -1
  return [k.hinge[0] + m * Math.cos(a) * k.len * s, k.hinge[1] + Math.sin(a) * k.len * s]
}

/** Where his centre is when he sits `s` along a stick that is down on the head. */
export function onStick(side: Side, s: number): Pt {
  const k = STICKS[side]
  const [x, y] = along(side, k.down, s)
  const m = side === 'L' ? 1 : -1
  // The upward normal of the stick, in the kit's frame.
  return [x + m * Math.sin(k.down) * ON_STICK, y - Math.cos(k.down) * ON_STICK]
}

/**
 * A stick's angle at `T`: sprung up at rest; after a stroke, back up quickly, ringing a little; and pushed down by
 * him wherever he is on it (so the stick meets him as he lands and never passes through him).
 */
export function stickAngle(side: Side, T: number, strokes: readonly number[], ball: Pt | null): number {
  const k = STICKS[side]
  const rest = k.down - RAISE
  let last = -Infinity
  for (const t of strokes) {
    if (t > T) break
    last = t
  }
  const s = T - last
  // Back up on its spring over a fifth of a second, a small ring dying away after.
  let a = rest + (s < 2 ? RAISE * Math.exp(-s / 0.11) * Math.cos(s * 15) : 0)
  if (ball) {
    const m = side === 'L' ? 1 : -1
    const bx = (ball[0] - k.hinge[0]) * m
    const by = ball[1] - k.hinge[1]
    const d = Math.hypot(bx, by)
    if (d > ON_STICK + 0.01) {
      const phi = Math.atan2(by, bx)
      const touch = phi + Math.asin(Math.min(1, ON_STICK / d))
      const proj = d * Math.cos(touch - phi)
      if (proj > 0.02 && proj < k.len + 0.08) a = Math.max(a, touch)
    }
  }
  return Math.min(a, k.down)
}

/** The drill rig: the posts clamped to the snare's hoop, the hinges, the sticks at their angles, the tape. */
export function drawRig(p: p5, c: Ctx, look: { L: number; R: number; tape: [number, number]; light: number; laying: number }): void {
  const { k, weight, bg } = c
  const lit = Math.max(0.08, Math.min(1, look.light))
  const steel = dim(bg, STEEL, lit, 0.4)
  p.push()
  p.strokeCap(p.ROUND)
  for (const side of ['L', 'R'] as const) {
    const st = STICKS[side]
    const m = side === 'L' ? -1 : 1
    const [hx, hy] = st.hinge
    // The post, from its clamp on the hoop to the hinge: a steel rod edged in its own dark.
    p.stroke(edgeOf(steel))
    p.strokeWeight(weight * 1.9)
    p.line((m * 0.6) * k, 0.17 * k, hx * k, hy * k)
    p.stroke(steel)
    p.strokeWeight(weight * 1.1)
    p.line((m * 0.6) * k, 0.17 * k, hx * k, hy * k)
    // The clamp on the hoop: a steel jaw, its lower lip under the hoop's rim.
    block(p, c, m * 0.6 - 0.035, 0.125, m * 0.6 + 0.035, 0.215, steel, lit, STEEL_LIT, 0.015)
    p.noStroke()
    p.fill(edgeOf(steel))
    p.ellipse(m * 0.6 * k, 0.15 * k, 0.018 * k, 0.018 * k)
  }
  // The sticks: a hickory stick on each hinge, and the tape on the right one's grip.
  for (const side of ['L', 'R'] as const) {
    const st = STICKS[side]
    const a = side === 'L' ? look.L : look.R
    const ang = side === 'L' ? a : Math.PI - a
    drawStick(p, c, st.hinge, ang, st.len)
    if (side === 'R' && look.tape[1] > look.tape[0] + 0.005) tape(p, c, a, look.tape, lit)
  }
  // The hinges over the sticks' butts: a steel barrel on each post's head, its pin through it.
  const knuckle = dim(bg, BLOCK, lit, 0.5)
  for (const side of ['L', 'R'] as const) {
    const [hx, hy] = STICKS[side].hinge
    block(p, c, hx - 0.045, hy - 0.032, hx + 0.045, hy + 0.032, knuckle, lit * 0.8, STEEL_LIT, 0.03)
    p.noStroke()
    p.fill(edgeOf(knuckle))
    p.ellipse(hx * k, hy * k, 0.026 * k, 0.026 * k)
  }
  // The tape's roll, hung on the right post below the hinge: a flat ring, edge on; while he lays it, the strip
  // runs from the roll to where he is on the stick.
  const [rx, ry] = [STICKS.R.hinge[0] + 0.02, STICKS.R.hinge[1] + 0.2]
  const white = dim(bg, TAPE, lit, 0.35)
  if (look.laying > 0.005) {
    const [tx, ty] = along('R', look.R, look.tape[1])
    p.stroke(alpha(p, white, look.laying))
    p.strokeWeight(weight * 1.3)
    p.line(rx * k, ry * k, tx * k, ty * k)
  }
  // The roll: a short drum of tape on its side, hung on a peg on the post, its face (the card core in it) turned to
  // the lamp; the wraps' shadow on its far end.
  const [h, d, fw] = [0.06, 0.035, 0.028]
  const edge = edgeOf(white)
  p.fill(mixHex(white, SHOP.panel, 0.35))
  p.stroke(edge)
  p.strokeWeight(weight * 0.5)
  p.ellipse((rx - d) * k, ry * k, fw * 2 * k, h * 2 * k)
  p.noStroke()
  p.fill(white)
  box4(p, k, rx - d, ry - h, rx + d, ry + h)
  p.stroke(edge)
  p.line((rx - d) * k, (ry - h) * k, (rx + d) * k, (ry - h) * k)
  p.line((rx - d) * k, (ry + h) * k, (rx + d) * k, (ry + h) * k)
  litEdge(p, k, [rx - d, ry - h + weight * 0.5 / k], [rx + d, ry - h + weight * 0.5 / k], TAPE_LIT, lit, weight * 0.5)
  p.fill(mixHex(white, TAPE_LIT, 0.4 * lit))
  p.stroke(edge)
  p.strokeWeight(weight * 0.5)
  p.ellipse((rx + d) * k, ry * k, fw * 2 * k, h * 2 * k)
  p.noStroke()
  p.fill(dim(bg, mixHex(SHOP.wood, KIT.hickory, 0.5), lit, 0.4))
  p.ellipse((rx + d) * k, ry * k, fw * 1.15 * k, h * 1.15 * k)
  p.fill(mixHex(bg, DARK, 0.5))
  p.ellipse((rx + d) * k, ry * k, fw * 0.8 * k, h * 0.8 * k)
  p.pop()
}

/** White tape wound on the right stick from `span[0]` to `span[1]` of its length: a pale band, the wraps across it. */
function tape(p: p5, c: Ctx, a: number, span: [number, number], lit: number): void {
  const { k, weight, bg } = c
  const [x0, y0] = along('R', a, span[0])
  const [x1, y1] = along('R', a, span[1])
  const white = dim(bg, TAPE, lit, 0.4)
  // The band: white tape edged in its own shadow, wider than the stick it is wound on.
  p.strokeCap(p.ROUND)
  p.stroke(edgeOf(white))
  p.strokeWeight(weight * 4.1)
  p.line(x0 * k, y0 * k, x1 * k, y1 * k)
  p.stroke(white)
  p.strokeWeight(weight * 3.3)
  p.line(x0 * k, y0 * k, x1 * k, y1 * k)
  // The wraps: short creases across the band in the tape's shadow, a little slanted, at the tape's width apart.
  const n = Math.floor((span[1] - span[0]) * STICKS.R.len / 0.055)
  p.stroke(alpha(p, edgeOf(white), 0.35 + 0.25 * lit))
  p.strokeWeight(weight * 0.5)
  const dx = x1 - x0
  const dy = y1 - y0
  const L = Math.hypot(dx, dy) || 1
  const nx = -dy / L
  const ny = dx / L
  const hw = (weight * 1.6) / k
  for (let i = 1; i <= n; i++) {
    const u = i / (n + 1)
    const cx = x0 + dx * u
    const cy = y0 + dy * u
    p.line((cx - nx * hw + (dx / L) * 0.012) * k, (cy - ny * hw + (dy / L) * 0.012) * k, (cx + nx * hw - (dx / L) * 0.012) * k, (cy + ny * hw - (dy / L) * 0.012) * k)
  }
}

/* ------------------------------------------------------------------ the metronome */

/** The shelf on the back wall, right of the kit, and the metronome on it. */
export const SHELF = { x0: 2.42, x1: 3.38, y: -1.12 }
export const METRONOME = { x: 2.9, base: SHELF.y, h: 0.58, wBase: 0.38, wTop: 0.11, arm: 0.5, amp: 0.3 }

/** The metronome's arm, radians from upright: at one end or the other on every beat of the tune. */
export const metronomeAngle = (T: number): number => METRONOME.amp * Math.cos((Math.PI * (T - TUNE_ORIGIN)) / TUNE_PERIOD)

export function drawMetronome(p: p5, c: Ctx, T: number, light: number): void {
  const { k, weight, bg } = c
  const lit = Math.max(0.06, Math.min(1, light))
  const M = METRONOME
  const side = lampSide(M.x)
  const wood = dim(bg, SHOP.wood, lit, 0.25)
  p.push()
  p.strokeCap(p.ROUND)
  // The shelf: a board on two wooden brackets, the brackets in the board's shadow.
  const under = SHELF.y + 0.06
  const shadowed = mixHex(wood, DARK, 0.3)
  for (const [x, dir] of [[SHELF.x0 + 0.12, 1], [SHELF.x1 - 0.12, -1]] as const) {
    slab(p, k, [[x, under], [x + dir * 0.2, under], [x, under + 0.24]], shadowed, edgeOf(wood), weight * 0.55)
  }
  block(p, c, SHELF.x0, SHELF.y, SHELF.x1, under, wood, lit, WOOD_LIT)
  // The case: a wooden pyramid, edged in its own dark, the lamp along its near side and its top.
  const top = M.base - M.h
  const bl: Pt = [M.x - M.wBase / 2, M.base]
  const br: Pt = [M.x + M.wBase / 2, M.base]
  const tr: Pt = [M.x + M.wTop / 2, top]
  const tl: Pt = [M.x - M.wTop / 2, top]
  const caseWood = dim(bg, mixHex(SHOP.wood, KIT.oxblood, 0.25), lit, 0.3)
  slab(p, k, [bl, br, tr, tl], caseWood, edgeOf(caseWood), weight * 0.7)
  // Its far side a shade darker: a narrow face turned from the lamp.
  const far: Pt[] = side > 0 ? [bl, [bl[0] + 0.05, M.base], [tl[0] + 0.015, top], tl] : [[br[0] - 0.05, M.base], br, tr, [tr[0] - 0.015, top]]
  p.noStroke()
  p.fill(alpha(p, DARK, 0.35))
  p.beginShape()
  for (const [x, y] of far) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
  const inset = (weight * 0.4) / k
  const near = side > 0 ? [br, tr] : [bl, tl]
  litEdge(p, k, [near[0][0] - side * inset * 2, near[0][1] - inset], [near[1][0] - side * inset, near[1][1] + inset], WOOD_LIT, lit, weight * 0.55)
  litEdge(p, k, [tl[0] + inset, top + inset], [tr[0] - inset, top + inset], WOOD_LIT, lit, weight * 0.5)
  // The slot the arm swings in front of: dark.
  p.noStroke()
  p.fill(mixHex(bg, SHOP.black, 0.7))
  p.beginShape()
  p.vertex((M.x - 0.05) * k, (M.base - 0.07) * k)
  p.vertex((M.x + 0.05) * k, (M.base - 0.07) * k)
  p.vertex((M.x + 0.02) * k, (top + 0.08) * k)
  p.vertex((M.x - 0.02) * k, (top + 0.08) * k)
  p.endShape(p.CLOSE)
  // The arm, from its pivot low in the case, and its sliding weight: steel, edged in its own dark.
  const a = metronomeAngle(T)
  const px = M.x
  const py = M.base - 0.08
  const ax = px + Math.sin(a) * M.arm
  const ay = py - Math.cos(a) * M.arm
  const rod = dim(bg, mixHex(STEEL, KIT.chrome, 0.5), lit, 0.35)
  p.stroke(edgeOf(rod))
  p.strokeWeight(weight * 1.4)
  p.line(px * k, py * k, ax * k, ay * k)
  p.stroke(rod)
  p.strokeWeight(weight * 0.75)
  p.line(px * k, py * k, ax * k, ay * k)
  p.push()
  p.translate((px + Math.sin(a) * M.arm * 0.62) * k, (py - Math.cos(a) * M.arm * 0.62) * k)
  p.rotate(a)
  const weightSteel = dim(bg, STEEL, lit, 0.35)
  slab(p, k, [[-0.045, -0.035], [0.045, -0.035], [0.035, 0.035], [-0.035, 0.035]], weightSteel, edgeOf(weightSteel), weight * 0.5)
  litEdge(p, k, [-0.04, -0.035 + inset], [0.04, -0.035 + inset], STEEL_LIT, lit, weight * 0.45)
  p.pop()
  p.pop()
}

/* ------------------------------------------------------------------ the stool and the glass */

export const STOOL = { x: 2.85, top: 0.7, w: 0.92 }
export const GLASS = { x: 3.08, bottom: STOOL.top, top: 0.08, wTop: 0.44, wBot: 0.37, water: 0.24, base: 0.04 }
/** Where his centre is at the glass's bottom, and at its surface going in. */
export const GLASS_FLOOR = GLASS.bottom - GLASS.base - R
export const GLASS_SURFACE = GLASS.water - R

/** The glass's half-width at height `y`. */
const halfAt = (y: number): number => {
  const u = (y - GLASS.top) / (GLASS.bottom - GLASS.top)
  return (GLASS.wTop + (GLASS.wBot - GLASS.wTop) * u) / 2
}

export function drawStool(p: p5, c: Ctx, light: number): void {
  const { k, weight, bg } = c
  const lit = Math.max(0.06, Math.min(1, light))
  const S = STOOL
  const side = lampSide(S.x)
  const wood = dim(bg, SHOP.wood, lit, 0.3)
  const back = mixHex(wood, DARK, 0.35)
  const edge = edgeOf(wood)
  const y0 = S.top + 0.07
  /** A leg: a tapered filled quad from under the seat at `xt` to the floor at `xb`. */
  const leg = (xt: number, xb: number, fill: string, wt: number, wb: number, lamp: boolean): void => {
    slab(p, k, [[xt - wt, y0], [xt + wt, y0], [xb + wb, KIT_FLOOR], [xb - wb, KIT_FLOOR]], fill, edge, weight * 0.55)
    if (lamp) {
      const i = (weight * 0.45) / k
      litEdge(p, k, [xt + side * (wt - i), y0 + 0.02], [xb + side * (wb - i), KIT_FLOOR - 0.03], WOOD_LIT, lit * 0.55, weight * 0.4)
    }
  }
  p.push()
  // The back leg, thinner and in the seat's shadow; the rung between the front two; the front legs, splayed.
  leg(S.x, S.x, back, 0.022, 0.018, false)
  const rung = S.top + (KIT_FLOOR - S.top) * 0.62
  const rx = S.w * (0.36 + 0.16 * 0.62) - 0.01
  slab(p, k, [[S.x - rx, rung - 0.02], [S.x + rx, rung - 0.02], [S.x + rx, rung + 0.02], [S.x - rx, rung + 0.02]], mixHex(wood, DARK, 0.15), edge, weight * 0.5)
  for (const m of [-1, 1]) leg(S.x + m * S.w * 0.36, S.x + m * S.w * 0.52, wood, 0.03, 0.024, true)
  // The seat: a round wooden top seen from the side, a thick slab with rounded ends, the lamp along its top.
  p.rectMode(p.CENTER)
  p.fill(wood)
  p.stroke(edge)
  p.strokeWeight(weight * 0.7)
  p.rect(S.x * k, (S.top + 0.045) * k, S.w * k, 0.09 * k, 0.045 * k)
  const i = (weight * 0.5) / k
  litEdge(p, k, [S.x - S.w / 2 + 0.05, S.top + i], [S.x + S.w / 2 - 0.05, S.top + i], WOOD_LIT, lit, weight * 0.55)
  // Its underside in shadow.
  p.noStroke()
  p.fill(alpha(p, DARK, 0.3))
  box4(p, k, S.x - S.w / 2 + 0.04, S.top + 0.06, S.x + S.w / 2 - 0.04, S.top + 0.085)
  p.pop()
}

/** The glass's edges: pale ice catching the lamp, never the cream ink. */
const GLASS_EDGE = mixHex(SHOP.ice, SHOP.tungsten, 0.15)

/** The glass's back: its far rim, behind everything that goes into it. */
export function drawGlassBack(p: p5, c: Ctx, light: number): void {
  const { k, weight } = c
  const lit = Math.max(0.06, Math.min(1, light))
  p.push()
  p.noFill()
  p.stroke(alpha(p, GLASS_EDGE, 0.15 + 0.25 * lit))
  p.strokeWeight(weight * 0.5)
  p.arc(GLASS.x * k, GLASS.top * k, GLASS.wTop * k, 0.08 * k, Math.PI, Math.PI * 2)
  p.pop()
}

export interface GlassLook {
  T: number
  light: number
  /** His centre, kit frame. */
  ball: Pt
  /** The splashes: show times he went in, and came out. */
  splashes: readonly number[]
}

/** The glass's front: the water (over him, when he is in it), the ice, the glass itself, and any splash. */
export function drawGlassFront(p: p5, c: Ctx, g: GlassLook): void {
  const { k, weight, bg } = c
  const lit = Math.max(0.06, Math.min(1, g.light))
  const inGlass = Math.abs(g.ball[0] - GLASS.x) < 0.3 && g.ball[1] > GLASS.top - 0.1 && g.ball[1] < GLASS.bottom
  // The surface: rocked by the last splash, settling.
  let wave = 0
  for (const t of g.splashes) {
    const s = g.T - t
    if (s > 0 && s < 3) wave += 0.025 * Math.exp(-s / 0.5) * Math.sin(s * 17)
  }
  const level = GLASS.water
  p.push()
  // The water.
  const hl = halfAt(level) - 0.02
  const hb = halfAt(GLASS.bottom - GLASS.base) - 0.02
  p.noStroke()
  p.fill(alpha(p, SHOP.ice, 0.18 + 0.2 * lit))
  p.beginShape()
  p.vertex((GLASS.x - hl) * k, (level - wave) * k)
  p.vertex((GLASS.x + hl) * k, (level + wave) * k)
  p.vertex((GLASS.x + hb) * k, (GLASS.bottom - GLASS.base) * k)
  p.vertex((GLASS.x - hb) * k, (GLASS.bottom - GLASS.base) * k)
  p.endShape(p.CLOSE)
  p.stroke(alpha(p, SHOP.ice, 0.35 + 0.4 * lit))
  p.strokeWeight(weight * 0.6)
  p.line((GLASS.x - hl) * k, (level - wave) * k, (GLASS.x + hl) * k, (level + wave) * k)
  // The ice: three cubes of different sizes floating at the top, shouldered aside when he is in there.
  const cubes = [
    { dx: -0.11, s: 0.105, r: 0.35 },
    { dx: 0.02, s: 0.085, r: -0.25 },
    { dx: 0.12, s: 0.115, r: 0.62 },
  ]
  cubes.forEach((cube, i) => {
    let x = GLASS.x + cube.dx
    if (inGlass) {
      const push = 0.26 - Math.abs(x - g.ball[0])
      if (push > 0) x += Math.sign(x - g.ball[0] || cube.dx) * Math.min(push, 0.12)
    }
    x = Math.max(GLASS.x - hl + cube.s * 0.5, Math.min(GLASS.x + hl - cube.s * 0.5, x))
    const bob = 0.012 * Math.sin(g.T * (1.7 + 0.4 * i) + i * 2) + wave * (i - 1) * 0.8
    p.push()
    p.translate(x * k, (level + 0.012 + bob) * k)
    p.rotate(cube.r + 0.08 * Math.sin(g.T * 1.3 + i))
    const ice = mixHex(bg, SHOP.ice, 0.35 + 0.55 * lit)
    p.rectMode(p.CENTER)
    p.fill(ice)
    p.stroke(mixHex(ice, SHOP.panel, 0.45))
    p.strokeWeight(weight * 0.5)
    p.rect(0, 0, cube.s * k, cube.s * k, 0.018 * k)
    p.pop()
  })
  // The glass: its walls, its thick base, its rim, a streak of light down one side.
  p.noFill()
  p.stroke(alpha(p, GLASS_EDGE, 0.3 + 0.45 * lit))
  p.strokeWeight(weight * 0.7)
  const ht = halfAt(GLASS.top)
  const hB = halfAt(GLASS.bottom)
  p.line((GLASS.x - ht) * k, GLASS.top * k, (GLASS.x - hB) * k, GLASS.bottom * k)
  p.line((GLASS.x + ht) * k, GLASS.top * k, (GLASS.x + hB) * k, GLASS.bottom * k)
  p.arc(GLASS.x * k, GLASS.top * k, GLASS.wTop * k, 0.08 * k, 0, Math.PI)
  p.fill(alpha(p, SHOP.ice, 0.2 + 0.25 * lit))
  box4(p, k, GLASS.x - hB + 0.01, GLASS.bottom - GLASS.base, GLASS.x + hB - 0.01, GLASS.bottom)
  p.stroke(alpha(p, SHOP.window, 0.15 + 0.4 * lit))
  p.strokeWeight(weight * 0.9)
  p.line((GLASS.x - ht + 0.06) * k, (GLASS.top + 0.08) * k, (GLASS.x - hB + 0.06) * k, (GLASS.bottom - 0.1) * k)
  // A splash where he breaks the surface: a few drops thrown up and falling back.
  p.noStroke()
  for (const t of g.splashes) {
    const s = g.T - t
    if (s <= 0 || s > 0.6) continue
    for (let i = 0; i < 6; i++) {
      const vx = (hash(i, Math.round(t * 10), 3) - 0.5) * 1.6
      const vy = -1.4 - 1.3 * hash(i, Math.round(t * 10), 4)
      const x = GLASS.x + (hash(i, 9, 5) - 0.5) * 0.2 + vx * s
      const y = level + vy * s + 6 * s * s
      if (y > level + 0.02) continue
      p.fill(alpha(p, SHOP.ice, (0.5 + 0.4 * lit) * (1 - s / 0.6)))
      const r = 0.018 + 0.016 * hash(i, 7, 6)
      p.ellipse(x * k, y * k, r * 2 * k, r * 2.4 * k)
    }
  }
  p.pop()
}
