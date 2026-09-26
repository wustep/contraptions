import type p5 from 'p5'
import { R, mixHex, type Pt } from '../../../../../parts'
import { KIT_FLOOR, drawStick } from '../drums'
import { alpha, hash, type Ctx } from '../kit'
import { TUNE_ORIGIN, TUNE_PERIOD } from '../music'
import { KIT, SHOP } from '../worlds'
import { box4, inked } from './room'

/**
 * The night's props, in the practice room's kit frame (the ball on the snare's head at the origin): the drill rig
 * on the snare (two sticks on hinged posts clamped to its hoop, one for each hand, sprung up, that his landings slap
 * down onto the head), the tape on the grip of the stick that bled, the metronome ticking on a shelf, and the stool
 * with the glass of ice water on it.
 */

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
  const { k, ink, weight, bg } = c
  const lit = Math.max(0.08, Math.min(1, look.light))
  const chrome = mixHex(mixHex(bg, KIT.shade, 0.6), KIT.chrome, 0.25 + 0.75 * lit)
  p.push()
  for (const side of ['L', 'R'] as const) {
    const st = STICKS[side]
    const m = side === 'L' ? -1 : 1
    const [hx, hy] = st.hinge
    // The post, from its clamp on the hoop to the hinge.
    p.stroke(chrome)
    p.strokeWeight(weight * 1.1)
    p.line((m * 0.6) * k, 0.17 * k, hx * k, hy * k)
    inked(p, alpha(p, ink, 0.4 + 0.4 * lit), weight * 0.5, chrome)
    box4(p, k, m * 0.6 - 0.05, 0.12, m * 0.6 + 0.05, 0.22)
  }
  // The sticks: a hickory stick on each hinge, and the tape on the right one's grip.
  for (const side of ['L', 'R'] as const) {
    const st = STICKS[side]
    const a = side === 'L' ? look.L : look.R
    const ang = side === 'L' ? a : Math.PI - a
    const shade: Ctx = lit >= 0.99 ? c : { ...c, ink: mixHex(bg, ink, 0.35 + 0.65 * lit) }
    drawStick(p, shade, st.hinge, ang, st.len)
    if (side === 'R' && look.tape[1] > look.tape[0] + 0.005) tape(p, c, a, look.tape, lit)
  }
  // The hinges over the sticks' butts: a dark block on each post.
  for (const side of ['L', 'R'] as const) {
    const [hx, hy] = STICKS[side].hinge
    inked(p, alpha(p, ink, 0.5 + 0.4 * lit), weight * 0.6, mixHex(bg, SHOP.black, 0.5))
    p.rect(hx * k, hy * k, 0.09 * k, 0.08 * k, 0.02 * k)
  }
  // The tape's roll, hung on the right post below the hinge: a flat ring, edge on; while he lays it, the strip
  // runs from the roll to where he is on the stick.
  const [rx, ry] = [STICKS.R.hinge[0] + 0.02, STICKS.R.hinge[1] + 0.2]
  if (look.laying > 0.005) {
    const [tx, ty] = along('R', look.R, look.tape[1])
    p.stroke(alpha(p, mixHex(bg, ink, 0.4 + 0.6 * lit), look.laying))
    p.strokeWeight(weight * 1.3)
    p.line(rx * k, ry * k, tx * k, ty * k)
  }
  inked(p, alpha(p, ink, 0.4 + 0.4 * lit), weight * 0.55, mixHex(bg, KIT.head, 0.3 + 0.65 * lit))
  p.rect(rx * k, ry * k, 0.13 * k, 0.07 * k, 0.015 * k)
  p.pop()
}

/** White tape wound on the right stick from `span[0]` to `span[1]` of its length: a pale band, the wraps across it. */
function tape(p: p5, c: Ctx, a: number, span: [number, number], lit: number): void {
  const { k, ink, weight, bg } = c
  const [x0, y0] = along('R', a, span[0])
  const [x1, y1] = along('R', a, span[1])
  p.stroke(mixHex(bg, SHOP.black, 0.5))
  p.strokeWeight(weight * 4.1)
  p.line(x0 * k, y0 * k, x1 * k, y1 * k)
  p.stroke(mixHex(bg, ink, 0.4 + 0.6 * lit))
  p.strokeWeight(weight * 3.3)
  p.line(x0 * k, y0 * k, x1 * k, y1 * k)
  // The wraps: short strokes across the band, a little slanted, at the tape's width apart.
  const n = Math.floor((span[1] - span[0]) * STICKS.R.len / 0.055)
  p.stroke(alpha(p, SHOP.black, 0.3 + 0.25 * lit))
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
  const { k, ink, weight, bg } = c
  const lit = Math.max(0.06, Math.min(1, light))
  const M = METRONOME
  p.push()
  // The shelf: a board on a bracket.
  inked(p, alpha(p, ink, 0.25 + 0.5 * lit), weight * 0.6, mixHex(bg, SHOP.wood, 0.25 + 0.65 * lit))
  box4(p, k, SHELF.x0, SHELF.y, SHELF.x1, SHELF.y + 0.06)
  p.noFill()
  p.stroke(alpha(p, ink, 0.2 + 0.4 * lit))
  p.strokeWeight(weight * 0.6)
  p.line((SHELF.x1 - 0.2) * k, (SHELF.y + 0.06) * k, (SHELF.x1 - 0.2) * k, (SHELF.y + 0.34) * k)
  p.line((SHELF.x1 - 0.2) * k, (SHELF.y + 0.34) * k, (SHELF.x1 - 0.5) * k, (SHELF.y + 0.06) * k)
  // The case: a wooden pyramid, its front a shade lighter.
  const top = M.base - M.h
  inked(p, alpha(p, ink, 0.35 + 0.5 * lit), weight * 0.7, mixHex(bg, SHOP.wood, 0.3 + 0.65 * lit))
  p.beginShape()
  p.vertex((M.x - M.wBase / 2) * k, M.base * k)
  p.vertex((M.x + M.wBase / 2) * k, M.base * k)
  p.vertex((M.x + M.wTop / 2) * k, top * k)
  p.vertex((M.x - M.wTop / 2) * k, top * k)
  p.endShape(p.CLOSE)
  // The slot the arm swings in front of: dark.
  p.noStroke()
  p.fill(mixHex(bg, SHOP.black, 0.7))
  p.beginShape()
  p.vertex((M.x - 0.05) * k, (M.base - 0.07) * k)
  p.vertex((M.x + 0.05) * k, (M.base - 0.07) * k)
  p.vertex((M.x + 0.02) * k, (top + 0.08) * k)
  p.vertex((M.x - 0.02) * k, (top + 0.08) * k)
  p.endShape(p.CLOSE)
  // The arm, from its pivot low in the case, and its sliding weight.
  const a = metronomeAngle(T)
  const px = M.x
  const py = M.base - 0.08
  const ax = px + Math.sin(a) * M.arm
  const ay = py - Math.cos(a) * M.arm
  p.stroke(mixHex(bg, KIT.chrome, 0.3 + 0.7 * lit))
  p.strokeWeight(weight * 0.8)
  p.line(px * k, py * k, ax * k, ay * k)
  p.push()
  p.translate((px + Math.sin(a) * M.arm * 0.62) * k, (py - Math.cos(a) * M.arm * 0.62) * k)
  p.rotate(a)
  inked(p, alpha(p, ink, 0.4 + 0.4 * lit), weight * 0.5, mixHex(bg, KIT.chrome, 0.25 + 0.6 * lit))
  p.beginShape()
  p.vertex(-0.045 * k, -0.035 * k)
  p.vertex(0.045 * k, -0.035 * k)
  p.vertex(0.035 * k, 0.035 * k)
  p.vertex(-0.035 * k, 0.035 * k)
  p.endShape(p.CLOSE)
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
  const { k, ink, weight, bg } = c
  const lit = Math.max(0.06, Math.min(1, light))
  const S = STOOL
  const wood = mixHex(bg, SHOP.wood, 0.3 + 0.65 * lit)
  p.push()
  // Three legs, splayed, and the rung between them; the back leg thinner and darker.
  p.stroke(mixHex(bg, SHOP.wood, 0.2 + 0.45 * lit))
  p.strokeWeight(weight * 1.5)
  p.line(S.x * k, (S.top + 0.08) * k, S.x * k, KIT_FLOOR * k)
  for (const m of [-1, 1]) {
    p.stroke(alpha(p, ink, 0.35 + 0.45 * lit))
    p.strokeWeight(weight * 2.6)
    p.line((S.x + m * S.w * 0.36) * k, (S.top + 0.08) * k, (S.x + m * S.w * 0.52) * k, KIT_FLOOR * k)
    p.stroke(wood)
    p.strokeWeight(weight * 1.5)
    p.line((S.x + m * S.w * 0.36) * k, (S.top + 0.08) * k, (S.x + m * S.w * 0.52) * k, KIT_FLOOR * k)
  }
  const rung = S.top + (KIT_FLOOR - S.top) * 0.62
  p.stroke(wood)
  p.strokeWeight(weight * 1.1)
  p.line((S.x - S.w * 0.46) * k, rung * k, (S.x + S.w * 0.46) * k, rung * k)
  // The seat: a round wooden top seen from the side, a thick slab with rounded ends.
  inked(p, alpha(p, ink, 0.4 + 0.45 * lit), weight * 0.8, wood)
  p.rect(S.x * k, (S.top + 0.045) * k, S.w * k, 0.09 * k, 0.045 * k)
  p.pop()
}

/** The glass's back: its far rim, behind everything that goes into it. */
export function drawGlassBack(p: p5, c: Ctx, light: number): void {
  const { k, ink, weight } = c
  const lit = Math.max(0.06, Math.min(1, light))
  p.push()
  p.noFill()
  p.stroke(alpha(p, ink, 0.2 + 0.3 * lit))
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
  const { k, ink, weight, bg } = c
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
    inked(p, alpha(p, ink, 0.2 + 0.3 * lit), weight * 0.5, mixHex(bg, SHOP.ice, 0.35 + 0.55 * lit))
    p.rect(0, 0, cube.s * k, cube.s * k, 0.018 * k)
    p.pop()
  })
  // The glass: its walls, its thick base, its rim, a streak of light down one side.
  p.noFill()
  p.stroke(alpha(p, ink, 0.3 + 0.45 * lit))
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
