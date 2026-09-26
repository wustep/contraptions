import type p5 from 'p5'
import { solid } from '../../../../../../../../src/core/draw'
import { clamp, easeInOutSine, easeInQuad, easeOutCubic, easeOutQuad } from '../../../../../../../../src/core/ease'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha, frame, hash, lastOf } from '../kit'
import { level } from '../music'
import { HIBACHI, HIBACHI_THEME } from '../worlds'
import * as rig from './raccacoonie-rig'

/**
 * Raccacoonie's kitchen, drawn: the room, the griddle, the chef of steel with the raccoon under its hat, and the
 * cleaver, the spatula, the spoon, the egg and the onion volcano. Everything here is a function of show time `t`.
 */

const H = HIBACHI
const BG = HIBACHI_THEME.bg
const D = Math.PI / 180

/** What every drawing here is handed. */
export interface Pen {
  p: p5
  k: number
  ink: string
  w: number
  t: number
}

const X = (pen: Pen, v: number) => v * pen.k
/** `#rrggbb` as `r, g, b`, for the canvas's own gradients. */
const rgbOf = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')
const lerp = (a: number, b: number, u: number) => a + (b - a) * u
const span = (t: number, a: number, b: number) => clamp((t - a) / (b - a))

function fillPoly(pen: Pen, pts: Pt[], fill: string | p5.Color, ink: string | null = pen.ink, w = pen.w): void {
  const { p } = pen
  if (ink) {
    p.stroke(ink)
    p.strokeWeight(w)
  } else p.noStroke()
  p.fill(fill as string)
  p.beginShape()
  for (const [x, y] of pts) p.vertex(X(pen, x), X(pen, y))
  p.endShape(p.CLOSE)
}

/** A bar of width `wd` from a to b, as a quad. */
function bar(pen: Pen, a: Pt, b: Pt, wd: number, fill: string, ink: string | null = pen.ink, w = pen.w): void {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const n = Math.hypot(dx, dy) || 1
  const ox = (-dy / n) * (wd / 2)
  const oy = (dx / n) * (wd / 2)
  fillPoly(pen, [[a[0] + ox, a[1] + oy], [b[0] + ox, b[1] + oy], [b[0] - ox, b[1] - oy], [a[0] - ox, a[1] - oy]], fill, ink, w)
}

/** Soft vapour: one uninked union of lobes, so overlaps never darken. */
function vapour(pen: Pen, x: number, y: number, r: number, a: number, hex = H.onion): void {
  if (a <= 0.005 || r <= 0.005) return
  const ctx = pen.p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.fillStyle = `rgba(${rgbOf(hex)}, ${a})`
  ctx.beginPath()
  const lobes: [number, number, number][] = [[0, 0, 1], [0.7, 0.18, 0.72], [-0.66, 0.22, 0.66], [0.12, -0.52, 0.62]]
  for (const [dx, dy, f] of lobes) {
    const cx = X(pen, x + dx * r)
    const cy = X(pen, y + dy * r)
    ctx.moveTo(cx + X(pen, r * f), cy)
    ctx.arc(cx, cy, X(pen, r * f), 0, Math.PI * 2)
  }
  ctx.fill()
  ctx.restore()
}

/** A radial light: never a fill, only a glow. */
function glow(pen: Pen, x: number, y: number, r: number, hex: string, a: number): void {
  if (a <= 0.003) return
  const ctx = pen.p.drawingContext as CanvasRenderingContext2D
  const rgb = rgbOf(hex)
  const g = ctx.createRadialGradient(X(pen, x), X(pen, y), 0, X(pen, x), X(pen, y), X(pen, r))
  g.addColorStop(0, `rgba(${rgb}, ${a})`)
  g.addColorStop(0.45, `rgba(${rgb}, ${a * 0.4})`)
  g.addColorStop(1, `rgba(${rgb}, 0)`)
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect(X(pen, x - r), X(pen, y - r), X(pen, 2 * r), X(pen, 2 * r))
  ctx.restore()
}

/* ------------------------------------------------------------------ the room */

const PLATE = 0.11
const SLOT = 0.17
const FLOOR = rig.TOP + 2.7

/** How hot the room is: the burners follow the music; the volcano lights everything while it burns. */
export function blaze(t: number): number {
  const e = t - rig.ERUPT
  if (e < 0) return 0
  return e < 0.9 ? 1 : Math.max(0, 1 - (e - 0.9) / 0.8)
}

/** The dark room: only the burners' warmth up the wall, and the volcano's light while it burns. */
export function drawRoom(pen: Pen): void {
  const { p, k, t } = pen
  // The back wall: dark wooden slats, barely there, so the room has a far side.
  const f = frame(p, k)
  p.noStroke()
  p.fill(mixHex(BG, H.soy, 0.1))
  const SL = 0.5
  for (let i = Math.floor(f.x0 / SL) - 1; i < f.x1 / SL + 1; i++) p.rect(X(pen, i * SL + SL / 2), X(pen, (f.y0 - 1 + rig.TOP) / 2), X(pen, SL - 0.035), X(pen, rig.TOP - f.y0 + 1))
  glow(pen, 0.2, rig.TOP + 0.1, 4.6, H.flame, 0.07 + 0.09 * level(t))
  const b = blaze(t)
  if (b > 0) glow(pen, rig.VX, rig.TOP - 1.4, 5.5, H.flame, 0.3 * b)
}

/** A small gas flame: a rounded tongue from `base` up `h`, leaning `lean`. */
function tongue(pen: Pen, x: number, base: number, wd: number, h: number, lean: number, fill: string): void {
  const { p } = pen
  const Xp = (v: number) => X(pen, v)
  p.noStroke()
  p.fill(fill)
  p.beginShape()
  p.vertex(Xp(x - wd / 2), Xp(base))
  p.bezierVertex(Xp(x - wd * 0.62), Xp(base - h * 0.45), Xp(x - wd * 0.1 + lean * 0.6), Xp(base - h * 0.8), Xp(x + lean), Xp(base - h))
  p.bezierVertex(Xp(x + wd * 0.12 + lean * 0.4), Xp(base - h * 0.7), Xp(x + wd * 0.62), Xp(base - h * 0.4), Xp(x + wd / 2), Xp(base))
  p.endShape(p.CLOSE)
}

/** The griddle, the burners under it, and the counter down to the floor: one long teppan, out past the frame. */
export function drawCounter(pen: Pen): void {
  const { p, k, t } = pen
  const f = frame(p, k)
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  // The floor, and the counter's dark steel body with its seams.
  fillPoly(pen, [[x0, FLOOR], [x1, FLOOR], [x1, f.y1 + 1], [x0, f.y1 + 1]], mixHex(BG, H.raccoonDeep, 0.3), null)
  fillPoly(pen, [[x0, rig.TOP + PLATE + SLOT], [x1, rig.TOP + PLATE + SLOT], [x1, FLOOR], [x0, FLOOR]], mixHex(BG, H.steelDeep, 0.55))
  p.stroke(alpha(p, pen.ink, 0.16))
  p.strokeWeight(pen.w * 0.6)
  for (let x = Math.floor(x0 / 1.6) * 1.6 + 0.3; x < x1; x += 1.6) p.line(X(pen, x), X(pen, rig.TOP + PLATE + SLOT + 0.3), X(pen, x), X(pen, FLOOR - 0.3))
  bar(pen, [x0, rig.TOP + PLATE + SLOT + 0.035], [x1, rig.TOP + PLATE + SLOT + 0.035], 0.07, H.steelDeep, pen.ink, pen.w * 0.7)
  // The burner slot: dark, with the gas flames licking the plate's underside, higher when the music is.
  fillPoly(pen, [[x0, rig.TOP + PLATE], [x1, rig.TOP + PLATE], [x1, rig.TOP + PLATE + SLOT], [x0, rig.TOP + PLATE + SLOT]], BG, pen.ink, pen.w * 0.6)
  const hot = Math.max(level(t), blaze(t))
  const base = rig.TOP + PLATE + SLOT - 0.01
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(0, X(pen, base), 0, X(pen, rig.TOP + PLATE))
  g.addColorStop(0, `rgba(${rgbOf(H.flame)}, ${0.18 + 0.2 * hot})`)
  g.addColorStop(1, `rgba(${rgbOf(H.flame)}, 0)`)
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect(X(pen, x0), X(pen, rig.TOP + PLATE), X(pen, x1 - x0), X(pen, SLOT))
  ctx.restore()
  for (let i = Math.floor(x0 / 0.34); i < x1 / 0.34; i++) {
    const x = i * 0.34 + 0.06 * hash(i, 9)
    const fl = 0.5 + 0.5 * Math.sin(t * (9 + hash(i, 1) * 6) + hash(i, 2) * 6)
    const h = (0.075 + 0.05 * hot + 0.03 * fl) * (0.75 + 0.35 * hash(i, 3))
    const lean = 0.015 * Math.sin(t * 7 + i)
    tongue(pen, x, base, 0.11, h, lean, H.flame)
    tongue(pen, x, base, 0.055, h * 0.55, lean * 0.5, H.flameHot)
  }
  // The plate: brushed steel, its face warm with the heat.
  fillPoly(pen, [[x0, rig.TOP], [x1, rig.TOP], [x1, rig.TOP + PLATE], [x0, rig.TOP + PLATE]], H.steel)
  p.stroke(alpha(p, H.flameHot, 0.18 + 0.2 * hot))
  p.strokeWeight(Math.max(1, pen.w * 0.8))
  p.line(X(pen, x0), X(pen, rig.TOP + 0.03), X(pen, x1), X(pen, rig.TOP + 0.03))
}

/* ------------------------------------------------------------------ the chef: post, shoulders, hat, raccoon */

const BRIM = rig.SH - 0.045

/**
 * The peek. After the tail drops into his pocket, Raccacoonie stands up inside the hat: it rises off the crossbar
 * and tips back, his paws on the brim, and his face comes out under it. He looks at her, reaches up for the tail,
 * eats it in three bites, looks at her again, and ducks; the hat drops back on the breath's last onset.
 */
const PEEK_UP: [number, number] = [rig.TAIL_IN + 0.3, rig.TAIL_IN + 0.85]
const PEEK_DOWN: [number, number] = [rig.DUCK - 0.34, rig.DUCK]
const REACH: [number, number, number, number] = [115.72, 115.98, 116.02, 116.24]
const BITES = [116.4, 116.6, 116.8]
const BLINKS = [115.6, 117.02]

/** How far out he is (0..1): the hat's lift follows it. */
function peekOf(t: number): number {
  if (t <= PEEK_UP[0] || t >= PEEK_DOWN[1]) return 0
  return easeInOutSine(span(t, PEEK_UP[0], PEEK_UP[1])) * (1 - easeInQuad(span(t, PEEK_DOWN[0], PEEK_DOWN[1])))
}

/** The hat's pose: raised off the shoulders (cells) and tipped back (radians), besides its jiggle. */
function hatPose(t: number): { up: number; tip: number } {
  const peek = peekOf(t)
  let up = 0.31 * peek
  let tip = 7 * D * peek
  // It lands back heavy, and bounces once.
  const d = t - rig.DUCK
  if (d > 0 && d < 0.32) up += 0.035 * Math.sin((Math.PI * d) / 0.32) * (1 - d / 0.32)
  // A little way up again for his paw with the egg.
  const e = span(t, rig.EGG_TOSS - 0.3, rig.EGG_TOSS + 0.35)
  if (e > 0 && e < 1) {
    const s = Math.sin(Math.PI * e)
    up += 0.12 * s
    tip += 3 * D * s
  }
  return { up, tip }
}

/** The hat's jiggle: the raccoon working the levers inside, and the knocks it takes. */
function hatBob(t: number): Pt {
  let y = 0
  let x = 0
  for (const c of rig.CHOPS) {
    const u = t - c
    if (u > -0.02 && u < 0.4) y += 0.022 * Math.exp(-u / 0.08) * Math.cos(u * 40)
  }
  for (const c of [rig.LOB, rig.FLIP]) {
    const u = t - c
    if (u > 0 && u < 0.5) x += 0.03 * Math.exp(-u / 0.12) * Math.sin(u * 30)
  }
  // The pocket catches the tail.
  const u = t - rig.TAIL_IN
  if (u > 0 && u < 0.6) y += 0.03 * Math.exp(-u / 0.12) * Math.sin(u * 32)
  // The blast from the volcano.
  const e = t - rig.ERUPT
  if (e > 0 && e < 1.2) x -= 0.05 * Math.exp(-e / 0.3) * Math.sin(e * 18)
  return [x, y]
}

/** Where the hat tips about, in the world, at `t`. */
function hatPivot(t: number): Pt {
  const [bx, by] = hatBob(t)
  return [rig.HX - 0.42 + bx, BRIM + by - hatPose(t).up]
}

/** A point given in the hat's own cells (its brim's centre at 0,0) as it stands at `t`. */
export function hatPoint(q: Pt, t: number): Pt {
  const pv = hatPivot(t)
  return rig.turn([pv[0] + 0.42 + q[0], pv[1] + q[1]], pv, hatPose(t).tip)
}

/** The pocket's mouth, in the hat's cells. */
const POCKET: Pt = [0.25, -0.43]
export const pocketAt = (t: number): Pt => hatPoint([POCKET[0], POCKET[1] - 0.08], t)

function drawHat(pen: Pen, tailIn: boolean): void {
  const { p, t } = pen
  const pv = hatPivot(t)
  p.push()
  p.translate(X(pen, pv[0]), X(pen, pv[1]))
  p.rotate(-hatPose(t).tip)
  p.translate(X(pen, 0.42), 0)
  const hw = pen.w
  // The body: pleated, flaring up from the band.
  fillPoly(pen, [[-0.51, -0.22], [0.51, -0.22], [0.63, -1.1], [-0.63, -1.1]], H.hat, pen.ink, hw)
  p.stroke(alpha(p, pen.ink, 0.5))
  p.strokeWeight(hw * 0.6)
  for (const u of [-0.72, -0.4, -0.1, 0.2, 0.5]) p.line(X(pen, u * 0.5), X(pen, -0.27), X(pen, u * 0.6), X(pen, -0.98))
  // The band at its foot.
  fillPoly(pen, [[-0.5, 0], [0.5, 0], [0.52, -0.25], [-0.52, -0.25]], H.hat, pen.ink, hw)
  // The puff on top: three lobes, the middle one tallest, overhanging the body.
  solid(p, pen.ink, hw, H.hat)
  p.ellipse(X(pen, -0.42), X(pen, -1.2), X(pen, 0.66), X(pen, 0.5))
  p.ellipse(X(pen, 0.42), X(pen, -1.2), X(pen, 0.66), X(pen, 0.5))
  p.ellipse(X(pen, 0), X(pen, -1.36), X(pen, 0.86), X(pen, 0.66))
  p.noStroke()
  p.fill(H.hat)
  p.rect(X(pen, 0), X(pen, -1.02), X(pen, 1.12), X(pen, 0.14))
  // The pocket, a shade darker so it reads on the white, and the tail in it once caught.
  if (tailIn) drawTail(pen, POCKET[0] - 0.01, POCKET[1] - 0.12, -1.45)
  solid(p, pen.ink, hw * 0.8, mixHex(H.hat, H.raccoon, 0.16))
  p.rect(X(pen, POCKET[0]), X(pen, POCKET[1]), X(pen, 0.3), X(pen, 0.24), X(pen, 0.045))
  p.stroke(alpha(p, pen.ink, 0.6))
  p.strokeWeight(hw * 0.5)
  p.line(X(pen, POCKET[0] - 0.13), X(pen, POCKET[1] - 0.075), X(pen, POCKET[0] + 0.13), X(pen, POCKET[1] - 0.075))
  p.pop()
}

/** A shrimp tail: a pink fan on a short stub, at (x, y) in the current frame, turned `a`, `size` of full. */
function drawTail(pen: Pen, x: number, y: number, a: number, size = 1): void {
  const { p } = pen
  if (size <= 0.05) return
  p.push()
  p.translate(X(pen, x), X(pen, y))
  p.rotate(a)
  p.scale(size)
  // The stub of meat, then the fan: three blades.
  solid(p, pen.ink, pen.w * 0.7, H.shrimp)
  p.rect(X(pen, -0.07), 0, X(pen, 0.13), X(pen, 0.08), X(pen, 0.03))
  fillPoly(pen, [[-0.01, -0.035], [0.13, -0.12], [0.17, -0.02], [0.14, 0.0], [0.17, 0.03], [0.13, 0.12], [-0.01, 0.035]], mixHex(H.shrimp, H.flame, 0.35), pen.ink, pen.w * 0.7)
  p.stroke(alpha(p, pen.ink, 0.5))
  p.strokeWeight(pen.w * 0.4)
  p.line(X(pen, 0.0), 0, X(pen, 0.15), X(pen, -0.065))
  p.line(X(pen, 0.0), 0, X(pen, 0.15), X(pen, 0.065))
  p.pop()
}

/** How big his face is drawn. */
const FACE = 1.14

/** Where his face is, and where his eyes turn: to her. */
function faceAt(t: number): Pt {
  const [bx, by] = hatBob(t)
  const peek = peekOf(t)
  return [rig.HX + 0.1 + bx + 0.04 * peek, BRIM - 0.22 + by + 0.34 * (1 - peek)]
}

/** Raccacoonie's face, looking out from under the brim: the bandit's mask, the pale muzzle, eyes that shine. */
function drawRaccoon(pen: Pen, look: Pt, chew: number, blink: number): void {
  const { p, t } = pen
  const [cx, cy] = faceAt(t)
  const X_ = (v: number) => X(pen, v)
  p.push()
  p.translate(X_(cx), X_(cy))
  // Head tilted a touch toward her.
  p.rotate(0.12 * clamp(look[0]))
  p.scale(FACE)
  // Ears, then the head.
  for (const s of [-1, 1]) {
    fillPoly(pen, [[s * 0.1, -0.13], [s * 0.2, -0.27], [s * 0.24, -0.08]], H.raccoon)
    fillPoly(pen, [[s * 0.14, -0.14], [s * 0.195, -0.225], [s * 0.21, -0.11]], H.raccoonDeep, null)
  }
  solid(p, pen.ink, pen.w * 0.9, H.raccoon)
  p.beginShape()
  p.vertex(X_(-0.25), X_(0.02))
  p.bezierVertex(X_(-0.26), X_(-0.2), X_(0.26), X_(-0.2), X_(0.25), X_(0.02))
  p.bezierVertex(X_(0.24), X_(0.12), X_(0.1), X_(0.19 + chew * 0.02), X_(0), X_(0.2 + chew * 0.02))
  p.bezierVertex(X_(-0.1), X_(0.19 + chew * 0.02), X_(-0.24), X_(0.12), X_(-0.25), X_(0.02))
  p.endShape(p.CLOSE)
  // Pale cheeks and muzzle, the brows over the mask.
  const jaw = 0.025 * chew
  fillPoly(pen, [[-0.21, 0.05], [-0.07, 0.03], [0, 0.07], [0.07, 0.03], [0.21, 0.05], [0.13, 0.15 + jaw], [0, 0.19 + jaw], [-0.13, 0.15 + jaw]], H.hat, null)
  p.stroke(H.hat)
  p.strokeWeight(Math.max(1.2, pen.w * 1.4))
  p.noFill()
  for (const s of [-1, 1]) p.line(X_(s * 0.05), X_(-0.1), X_(s * 0.17), X_(-0.075))
  // The mask: two dark lobes round the eyes, joined over the nose.
  p.noStroke()
  p.fill(H.raccoonDeep)
  p.beginShape()
  p.vertex(X_(-0.23), X_(-0.02))
  p.bezierVertex(X_(-0.2), X_(-0.09), X_(-0.08), X_(-0.08), X_(-0.02), X_(-0.04))
  p.vertex(X_(0.02), X_(-0.04))
  p.bezierVertex(X_(0.08), X_(-0.08), X_(0.2), X_(-0.09), X_(0.23), X_(-0.02))
  p.bezierVertex(X_(0.2), X_(0.05), X_(0.1), X_(0.07), X_(0.03), X_(0.03))
  p.vertex(X_(-0.03), X_(0.03))
  p.bezierVertex(X_(-0.1), X_(0.07), X_(-0.2), X_(0.05), X_(-0.23), X_(-0.02))
  p.endShape(p.CLOSE)
  // Eyes: bright in the dark of the mask, pupils turned to her.
  const open = Math.max(0.1, 1 - blink)
  for (const s of [-1, 1]) {
    const ex = s * 0.105
    const ey = -0.018
    p.fill(H.onion)
    p.ellipse(X_(ex), X_(ey), X_(0.066), X_(0.066 * open))
    if (open > 0.35) {
      p.fill(BG)
      p.ellipse(X_(ex + 0.014 * look[0]), X_(ey + 0.012 * look[1]), X_(0.034), X_(0.036 * open))
    }
  }
  // The nose, and the mouth line under it.
  solid(p, pen.ink, pen.w * 0.6, BG)
  p.ellipse(0, X_(0.085 + jaw * 0.3), X_(0.07), X_(0.05))
  p.stroke(alpha(p, BG, 0.8))
  p.strokeWeight(Math.max(1, pen.w * 0.7))
  p.line(0, X_(0.11 + jaw * 0.3), 0, X_(0.15 + jaw))
  p.pop()
}

/** A paw: a grey forearm from under the brim to a pad with dark fingers at `to`. */
function drawPaw(pen: Pen, from: Pt, to: Pt): void {
  const { p } = pen
  bar(pen, from, to, 0.1, H.raccoon, pen.ink, pen.w * 0.7)
  solid(p, pen.ink, pen.w * 0.7, H.raccoonDeep)
  p.ellipse(X(pen, to[0]), X(pen, to[1]), X(pen, 0.115), X(pen, 0.095))
}

/** The ringed tail, hanging out from under the brim at the back, bushy, swinging with his work. */
function drawRingTail(pen: Pen): void {
  const { t } = pen
  const [bx, by] = hatBob(t)
  let swish = 0.12 * Math.sin(t * 1.3) + 0.05 * Math.sin(t * 2.9)
  for (const c of rig.CHOPS) {
    const u = t - c
    if (u > 0 && u < 0.8) swish += 0.1 * Math.exp(-u / 0.25) * Math.sin(u * 14)
  }
  const e = t - rig.ERUPT
  if (e > 0 && e < 2) swish += 0.35 * Math.exp(-e / 0.5) * Math.sin(e * 9)
  // He is up in the hat while he peeks: the tail is drawn up with him.
  const up = peekOf(t) * 0.18
  const root: Pt = [rig.HX - 0.33 + bx, BRIM - 0.04 + by - hatPose(t).up * 0.4]
  const n = 16
  const L = 0.86 - up
  const pts: Pt[] = []
  let x = root[0]
  let y = root[1]
  let a = Math.PI / 2 + 0.3
  for (let i = 0; i <= n; i++) {
    pts.push([x, y])
    const u = i / n
    // Down, then curling back up at the tip.
    a += (swish * 0.3 + 0.03) * (0.4 + u) - (u > 0.55 ? 0.2 : 0)
    x += (Math.cos(a) * L) / n
    y += (Math.sin(a) * L) / n
  }
  const wAt = (u: number) => 0.2 * (u < 0.12 ? 0.6 + u * 3.3 : 1) * (1 - 0.25 * u) * (u > 0.85 ? Math.sqrt(Math.max(0, 1 - (u - 0.85) / 0.15)) : 1)
  const left: Pt[] = []
  const right: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const q = pts[i]
    const r = pts[Math.min(n, i + 1)]
    const s = pts[Math.max(0, i - 1)]
    const dx = r[0] - s[0]
    const dy = r[1] - s[1]
    const m = Math.hypot(dx, dy) || 1
    // Fur: the edge a little tufted.
    const hw = (wAt(i / n) / 2) * (1 + 0.07 * Math.sin(i * 2.7))
    left.push([q[0] - (dy / m) * hw, q[1] + (dx / m) * hw])
    right.push([q[0] + (dy / m) * hw, q[1] - (dx / m) * hw])
  }
  fillPoly(pen, [...left, ...[...right].reverse()], H.raccoon, pen.ink, pen.w * 0.8)
  for (const [i0, i1] of [[3, 5], [7, 9], [11, 13], [14, 16]]) {
    fillPoly(pen, [left[i0], left[i1], right[i1], right[i0]], H.raccoonDeep, null)
  }
}

/** The post, the crossbar and its pivots, the tail, the raccoon and the hat. */
export function drawChef(pen: Pen): void {
  const { p, t } = pen
  const by = hatBob(t)[1]
  // The post behind the griddle, and the shoulders.
  bar(pen, [rig.HX, rig.TOP + 0.2], [rig.HX, rig.SH + 0.02], 0.1, H.steelDeep)
  bar(pen, [rig.PL[0] - 0.06, rig.SH + by * 0.4], [rig.PR[0] + 0.06, rig.SH + by * 0.4], 0.075, H.steel)
  drawRingTail(pen)
  // Under the hat: the raccoon, when it is up.
  const peek = peekOf(t)
  const bites = BITES.filter((b) => t >= b).length
  const chew = t > BITES[0] - 0.05 && t < BITES[2] + 0.2 ? Math.max(0, Math.sin(((t - BITES[0] + 0.05) / 0.2) * Math.PI)) : 0
  const blink = Math.max(0, ...BLINKS.map((b) => 1 - Math.abs(t - b) / 0.07))
  const look: Pt = t < REACH[0] || t > REACH[3] + 0.6 ? [1, 0.8] : [0.2, -0.6]
  if (peek > 0.02) {
    const a = hatPoint([-0.46, 0.005], t)
    const b = hatPoint([0.5, 0.005], t)
    fillPoly(pen, [a, b, [b[0], rig.SH], [a[0], rig.SH]], mixHex(BG, H.raccoonDeep, 0.35), null)
    drawRaccoon(pen, look, chew, blink)
  }
  drawHat(pen, t >= rig.TAIL_IN && t < REACH[1])
  if (peek > 0.02) {
    // Paws on the brim, holding it up; the right one goes up for the tail and brings it to his mouth.
    const [fx, fy] = faceAt(t)
    const leftHold = hatPoint([-0.2, 0.02], t)
    drawPaw(pen, [fx - 0.2, fy + 0.18], [leftHold[0], leftHold[1] + 0.02])
    const rest = hatPoint([0.36, 0.02], t)
    const pk = pocketAt(t)
    const mouth: Pt = [fx + 0.03, fy + 0.15]
    let hand: Pt = [rest[0], rest[1] + 0.02]
    if (t > REACH[0] && t < REACH[1]) hand = [lerp(hand[0], pk[0], easeInOutSine(span(t, REACH[0], REACH[1]))), lerp(hand[1], pk[1] + 0.05, easeInOutSine(span(t, REACH[0], REACH[1])))]
    else if (t >= REACH[1] && t < REACH[2]) hand = [pk[0], pk[1] + 0.05]
    else if (t >= REACH[2] && t < BITES[2] + 0.25) {
      const u = easeInOutSine(span(t, REACH[2], REACH[3]))
      hand = [lerp(pk[0], mouth[0] + 0.1, u), lerp(pk[1] + 0.05, mouth[1] + 0.03, u)]
    } else if (t >= BITES[2] + 0.25) {
      const u = easeInOutSine(span(t, BITES[2] + 0.25, BITES[2] + 0.5))
      hand = [lerp(mouth[0] + 0.1, rest[0], u), lerp(mouth[1] + 0.03, rest[1] + 0.02, u)]
    }
    if (t >= REACH[1] && bites < 3) drawTail(pen, hand[0] - 0.02, hand[1] - 0.06, -1.2 + 0.15 * Math.sin(t * 8), 1 - bites * 0.28)
    drawPaw(pen, [fx + 0.2, fy + 0.18], hand)
  }
  // His paw out with the egg, and the flick.
  if (t > rig.EGG_TOSS - 0.3 && t < rig.EGG_TOSS + 0.2) {
    const out = Math.sin(Math.PI * span(t, rig.EGG_TOSS - 0.3, rig.EGG_TOSS + 0.2))
    const from = hatPoint([0.2, 0.06], t)
    const hand: Pt = [from[0] + 0.08 + 0.16 * out, from[1] + 0.03 + 0.03 * out]
    if (t < rig.EGG_TOSS) drawEggAt(pen, hand[0] + 0.03, hand[1] - 0.08, 0.3)
    drawPaw(pen, from, hand)
  }
  // The pivots, over the hat's band.
  solid(p, pen.ink, pen.w * 0.7, H.steelDeep)
  p.circle(X(pen, rig.PL[0]), X(pen, rig.PL[1]), X(pen, 0.075))
  p.circle(X(pen, rig.PR[0]), X(pen, rig.PR[1]), X(pen, 0.075))
}

/* ------------------------------------------------------------------ the cleaver: a trip hammer on the left arm */

const ARM_L = 0.52
const BOARD: [number, number] = [-4.2, -2.45]
const BOARD_T = 0.08
/** The cleaver: its blade (width, height), its wooden handle, and the rod it hangs from by the handle's end. */
const BLADE: Pt = [0.6, 0.36]
const GRIP = 0.22
const ROD = rig.TOP - BOARD_T - BLADE[1] + 0.05 - rig.SH
const CHOP_MAX = 22 * D
/** Each chop comes down a little further along the scallions. */
const STEP = 0.055

/** How far the arm is raised at `t` (radians): cocked, dropped onto each chop, bouncing up for the next. */
export function chopLift(t: number): number {
  const c = rig.CHOPS
  if (t < c[0]) {
    const drop = 0.085
    return CHOP_MAX * 0.85 * (1 - easeInQuad(span(t, c[0] - drop, c[0])))
  }
  const { i } = lastOf(c, t)
  const u = t - c[i]
  if (i === c.length - 1) return CHOP_MAX * 0.5 * easeOutCubic(clamp(u / 0.55))
  const gap = c[i + 1] - c[i]
  const peak = CHOP_MAX * clamp(gap / 0.42, 0.32, 1)
  const drop = Math.min(0.075, gap * 0.45)
  const rise = gap - drop
  if (u < rise) return peak * easeOutCubic(u / rise)
  return peak * (1 - easeInQuad((u - rise) / drop))
}

/** How far the carriage has slid along the arm: a step after each chop. */
function slid(t: number): number {
  const { i } = lastOf(rig.CHOPS, t)
  if (i < 0) return 0
  const next = i < rig.CHOPS.length - 1 ? easeInOutSine(clamp((t - rig.CHOPS[i] - 0.02) / 0.09)) : 0
  return STEP * (i + next)
}

export function drawCleaver(pen: Pen): void {
  const { p, t } = pen
  const top = rig.TOP - BOARD_T
  const x0 = rig.PL[0] - ARM_L - GRIP - BLADE[0] / 2
  // The board.
  fillPoly(pen, [[BOARD[0], top], [BOARD[1], top], [BOARD[1], rig.TOP], [BOARD[0], rig.TOP]], mixHex(H.soy, H.onion, 0.42))
  const chopped = rig.CHOPS.filter((c) => t >= c).length
  // The uncut bunch, lying left of the blade: pale root ends, green tops, cut back a step a chop.
  const cutEnd = x0 - STEP * Math.max(0, chopped - 1) + 0.02
  const bunchL = BOARD[0] + 0.1
  if (cutEnd > bunchL + 0.1) {
    fillPoly(pen, [[bunchL, top - 0.01], [cutEnd, top - 0.01], [cutEnd, top - 0.1], [bunchL + 0.04, top - 0.115]], H.greens, pen.ink, pen.w * 0.7)
    fillPoly(pen, [[bunchL, top - 0.01], [bunchL + 0.22, top - 0.01], [bunchL + 0.22, top - 0.11], [bunchL + 0.04, top - 0.115]], H.onion, pen.ink, pen.w * 0.7)
  }
  // The pieces: each chop knocks a round off the end, which hops and lies where it lands, right of the blade.
  for (let i = 0; i < chopped; i++) {
    const h = hash(i, 17)
    const age = t - rig.CHOPS[i]
    const land = x0 + BLADE[0] / 2 + 0.06 + 0.07 * i + 0.05 * h - STEP * i
    const from = x0 - STEP * i + 0.08
    const u = clamp(age / 0.28)
    const x = lerp(from, land, easeOutQuad(u))
    const hopped = Math.sin(Math.PI * u) * (0.09 + 0.07 * h)
    const wd = 0.05 + 0.03 * hash(i, 4)
    p.push()
    p.translate(X(pen, x), X(pen, top - 0.04 - hopped))
    p.rotate((h - 0.5) * 1.2 + u * (h > 0.5 ? 2.4 : -2.1))
    solid(p, pen.ink, pen.w * 0.6, i < 1 ? H.onion : H.greens)
    p.rect(0, 0, X(pen, wd), X(pen, 0.075), X(pen, 0.015))
    p.pop()
  }
  // The arm from the shoulder, the carriage at its end, and the rod down to the cleaver's handle.
  const lift = chopLift(t)
  const inner = rig.turn([rig.PL[0] + 0.07, rig.PL[1]], rig.PL, -lift)
  const end = rig.turn([rig.PL[0] - ARM_L - slid(t), rig.PL[1]], rig.PL, -lift)
  const tipEnd = rig.turn([rig.PL[0] - ARM_L - STEP * rig.CHOPS.length - 0.08, rig.PL[1]], rig.PL, -lift)
  bar(pen, inner, tipEnd, 0.06, H.steel)
  const last = lastOf(rig.CHOPS, t)
  const sw = last.i < 0 ? 0 : 0.05 * Math.exp(-last.ago / 0.18) * Math.sin(last.ago * 26)
  const foot: Pt = [end[0] + Math.sin(sw) * ROD, end[1] + Math.cos(sw) * ROD]
  bar(pen, end, foot, 0.045, H.steelDeep)
  solid(p, pen.ink, pen.w * 0.8, H.steelDeep)
  p.rect(X(pen, end[0]), X(pen, end[1]), X(pen, 0.13), X(pen, 0.09), X(pen, 0.015))
  // The cleaver: held by its handle's end, the broad blade out to the left, its edge down.
  p.push()
  p.translate(X(pen, foot[0]), X(pen, foot[1]))
  p.rotate(-sw * 0.6)
  solid(p, pen.ink, pen.w * 0.9, H.soy)
  p.rect(X(pen, -GRIP / 2), 0, X(pen, GRIP), X(pen, 0.075), X(pen, 0.03))
  const bl = -GRIP - BLADE[0]
  const br = -GRIP + 0.01
  const bt = -0.055
  const bb = bt + BLADE[1]
  fillPoly(pen, [[br, bt], [br, bb], [bl + 0.03, bb], [bl, bb - 0.05], [bl, bt + 0.02], [bl + 0.02, bt]], H.steel, pen.ink, pen.w)
  // The ground edge, bright, and the spine's shadow.
  p.noStroke()
  p.fill(mixHex(H.steel, H.onion, 0.6))
  p.rect(X(pen, (bl + br) / 2 + 0.01), X(pen, bb - 0.03), X(pen, br - bl - 0.05), X(pen, 0.035))
  p.fill(H.steelDeep)
  p.rect(X(pen, (bl + br) / 2 + 0.01), X(pen, bt + 0.028), X(pen, br - bl - 0.05), X(pen, 0.03))
  p.pop()
  // A chip of light off the edge as it bites.
  const bite = last.i >= 0 && last.ago < 0.07 ? 1 - last.ago / 0.07 : 0
  if (bite > 0) glow(pen, foot[0] - GRIP - BLADE[0] / 2, top, 0.3, H.flameHot, 0.5 * bite)
}

/* ------------------------------------------------------------------ the spatula */

export function drawSpatula(pen: Pen): void {
  const { p, t } = pen
  const a = rig.tilt(t)
  const S = (q: Pt) => rig.spatula(q, a)
  const hx = rig.NECK[0] - rig.PR[0]
  const hy = rig.NECK[1] - rig.PR[1]
  const n = Math.hypot(hx, hy)
  const ux = hx / n
  const uy = hy / n
  const inner: Pt = [rig.PR[0] - ux * 0.07, rig.PR[1] - uy * 0.07]
  // The steel shank down to the blade, with a wooden grip where the shoulder holds it.
  bar(pen, S(inner), S([rig.NECK[0] - ux * 0.02, rig.NECK[1] - uy * 0.02]), 2 * rig.HANDLE * 0.75, H.steel)
  bar(pen, S([rig.PR[0] + ux * 0.1, rig.PR[1] + uy * 0.1]), S([rig.PR[0] + ux * 0.62, rig.PR[1] + uy * 0.62]), 2 * rig.HANDLE * 1.5, H.soy)
  // The blade: a flat plate on the griddle, its edge ground thin at the tip.
  const y0 = rig.TOP - rig.BLADE_T
  const y1 = rig.TOP
  const x0 = rig.NECK[0] - 0.02
  const x1 = rig.NECK[0] + rig.BLADE_L
  fillPoly(pen, [S([x0, y0]), S([x1 - 0.04, y0]), S([x1, y1 - 0.01]), S([x0 + 0.02, y1])], mixHex(H.steel, H.onion, 0.28), pen.ink, pen.w * 0.9)
  const q0 = S([x0 + 0.04, y0 + 0.008])
  const q1 = S([x1 - 0.06, y0 + 0.008])
  p.stroke(alpha(p, H.onion, 0.55))
  p.strokeWeight(Math.max(1, pen.w * 0.6))
  p.line(X(pen, q0[0]), X(pen, q0[1]), X(pen, q1[0]), X(pen, q1[1]))
}

/* ------------------------------------------------------------------ the spoon on its block, and the shrimp tail */

export function drawSpoon(pen: Pen): void {
  const { t } = pen
  // The block: a steel wedge, its point the pivot.
  fillPoly(pen, [[rig.FX - 0.17, rig.TOP], [rig.FX + 0.17, rig.TOP], [rig.FX + 0.02, rig.FULCRUM[1]], [rig.FX - 0.02, rig.FULCRUM[1]]], H.steelDeep)
  const tip = rig.spoonTilt(t)
  const P = (u: number, up: number) => rig.spoonPoint(u, up, tip)
  // The handle, tapering to its end, then the bowl.
  const hL = -rig.SPOON_L / 2
  fillPoly(pen, [P(hL, -0.012), P(0.2, -0.018), P(0.2, 0.018), P(hL, 0.012)], H.steel, pen.ink, pen.w * 0.8)
  const bowl: Pt[] = []
  for (let i = 0; i <= 10; i++) {
    const u = i / 10
    bowl.push(P(0.16 + u * 0.3, -0.015 - 0.06 * Math.sin(Math.PI * u)))
  }
  for (let i = 10; i >= 0; i--) {
    const u = i / 10
    bowl.push(P(0.16 + u * 0.3, 0.02))
  }
  fillPoly(pen, bowl, H.steel, pen.ink, pen.w * 0.8)
  // The tail in the bowl until it goes.
  if (t < rig.SPOON_DOWN) {
    const q = P(0.32, 0.06)
    drawTail(pen, q[0], q[1], tip - 0.25)
  } else if (t < rig.TAIL_IN) {
    const [x, y, a] = tailFlight(t)
    drawTail(pen, x, y, a)
  }
}

/** The tail's flight, from the bowl as the spoon stops to the hat's pocket: x, y and its turn. */
export function tailFlight(t: number): [number, number, number] {
  const from = rig.spoonPoint(0.32, 0.06, -rig.SPOON_TIP)
  const to = pocketAt(rig.TAIL_IN)
  const T = rig.TAIL_FLY
  const u = clamp((t - rig.SPOON_DOWN) / T)
  const s = u * T
  const vx = (to[0] - from[0]) / T
  const vy = (to[1] - from[1]) / T - 0.5 * 12 * T
  return [from[0] + vx * s, from[1] + vy * s + 0.5 * 12 * s * s, -0.2 - 9.5 * u]
}

/* ------------------------------------------------------------------ the egg */

function drawEggAt(pen: Pen, x: number, y: number, a: number): void {
  const { p } = pen
  p.push()
  p.translate(X(pen, x), X(pen, y))
  p.rotate(a)
  solid(p, pen.ink, pen.w * 0.8, H.hat)
  p.ellipse(0, 0, X(pen, rig.EGG_R[0] * 2), X(pen, rig.EGG_R[1] * 2))
  p.pop()
}

/** Where the egg leaves the paw and where it meets the spatula's tip. */
function eggPath(): { from: Pt; to: Pt } {
  const from: Pt = [rig.HX + 0.56, BRIM - 0.03]
  const tip = rig.spatula([rig.NECK[0] + rig.BLADE_L - 0.04, rig.TOP - rig.BLADE_T], 11 * D)
  return { from, to: [tip[0], tip[1] - rig.EGG_R[1]] }
}
const EGG = eggPath()
/** Where the white lands. */
const FRY: Pt = [rig.NECK[0] + rig.BLADE_L + 0.17, rig.TOP]

export function drawEgg(pen: Pen): void {
  const { p, t } = pen
  if (t >= rig.EGG_TOSS && t < rig.CRACK) {
    const T = rig.CRACK - rig.EGG_TOSS
    const s = t - rig.EGG_TOSS
    const vx = (EGG.to[0] - EGG.from[0]) / T
    const vy = (EGG.to[1] - EGG.from[1]) / T - 6 * T
    drawEggAt(pen, EGG.from[0] + vx * s, EGG.from[1] + vy * s + 6 * s * s, 0.3 + (s / T) * Math.PI * 3)
  }
  // The crack: the shell comes apart in two, and falls either side.
  if (t >= rig.CRACK && t < rig.SPLAT + 0.9) {
    const s = t - rig.CRACK
    const fallT = rig.SPLAT - rig.CRACK
    for (const side of [-1, 1] as const) {
      const vx = side * (side < 0 ? 0.9 : 1.3)
      const land = side < 0 ? rig.TOP - 0.05 : rig.TOP - 0.04
      const y0 = EGG.to[1] - 0.02
      const g = (2 * (land - y0 + 0.35 * fallT)) / (fallT * fallT)
      const ss = Math.min(s, fallT)
      const x = EGG.to[0] + vx * ss
      const y = y0 - 0.35 * ss + 0.5 * g * ss * ss
      p.push()
      p.translate(X(pen, x), X(pen, y))
      p.rotate(side * (0.4 + ss * 6))
      solid(p, pen.ink, pen.w * 0.7, H.hat)
      p.arc(0, 0, X(pen, rig.EGG_R[0] * 1.9), X(pen, rig.EGG_R[1] * 1.9), side < 0 ? Math.PI : 0, side < 0 ? Math.PI * 2 : Math.PI, p.CHORD)
      p.pop()
    }
  }
  // The white and the yolk fall to the griddle, spread and fry.
  if (t >= rig.CRACK && t < rig.SPLAT) {
    const u = span(t, rig.CRACK, rig.SPLAT)
    const y = lerp(EGG.to[1], rig.TOP - 0.05, u * u)
    solid(p, pen.ink, pen.w * 0.6, H.hat)
    p.ellipse(X(pen, lerp(EGG.to[0], FRY[0], u)), X(pen, y), X(pen, 0.12), X(pen, 0.14))
  }
  if (t >= rig.SPLAT) {
    const s = t - rig.SPLAT
    const spread = easeOutCubic(clamp(s / 0.18))
    const wob = 1 + 0.08 * Math.exp(-s / 0.1) * Math.sin(s * 60)
    const pts: Pt[] = []
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI
      const r = (0.17 + 0.05 * hash(i, 31)) * spread * wob
      pts.push([FRY[0] - Math.cos(a) * r * 1.25, rig.TOP - Math.sin(a) * r * 0.22])
    }
    fillPoly(pen, pts, H.hat, pen.ink, pen.w * 0.7)
    solid(p, pen.ink, pen.w * 0.6, H.flameHot)
    p.arc(X(pen, FRY[0] + 0.02), X(pen, rig.TOP - 0.03 * spread), X(pen, 0.12), X(pen, 0.1 * spread + 0.02), Math.PI, Math.PI * 2, p.CHORD)
  }
}

/* ------------------------------------------------------------------ the onion volcano */

/** How hot the stack has got inside while she sits in it. */
function heat(t: number): number {
  if (t < rig.CORKED) return 0
  if (t < rig.ERUPT) return 0.15 + 0.85 * span(t, rig.CORKED, rig.ERUPT) ** 1.6
  return Math.max(0, 1 - (t - rig.ERUPT) / 1.6)
}

/** How far each ring is thrown up by the blast, and how it has come back down: heavy, once bounced. */
function ringJump(i: number, t: number): number {
  const e = t - rig.ERUPT
  if (e < 0) {
    // A shiver on each rattle, most in the top ring.
    let y = 0
    for (const r of rig.RATTLES) {
      const u = t - r
      if (u > 0 && u < 0.16) y += 0.01 * (i + 1) * Math.sin((Math.PI * u) / 0.16)
    }
    return y
  }
  const up = 0.05 + 0.06 * i
  const T = 0.2 + 0.05 * i
  if (e < T) return up * 4 * (e / T) * (1 - e / T)
  const e2 = e - T
  if (e2 < T * 0.35) return up * 0.18 * 4 * (e2 / (T * 0.35)) * (1 - e2 / (T * 0.35))
  return 0
}

/** Where ring `i`'s face is at `t` (its centre), and how it is tipped: stacked by hand, never quite square. */
function ringAt(i: number, t: number): { x: number; y: number; tip: number } {
  const e = t - rig.ERUPT
  const top = i === rig.RING_W.length - 1
  const jit = top ? 0 : (hash(i, 61) - 0.5) * 0.05
  const lean = top ? 0 : (hash(i, 62) - 0.5) * 0.05
  const tip = lean + (e > 0 && e < 0.7 ? 0.06 * (i % 2 ? 1 : -1) * Math.sin((Math.PI * e) / 0.7) : 0)
  return { x: rig.VX + jit, y: rig.TOP - rig.ringFace(i) - ringJump(i, t), tip }
}

/**
 * One onion ring, seen a little from above: its side, its face, and its hole. Drawn about its face's centre, in a
 * frame already moved there. `front` draws only the part in front of the hole (the rim over a ball sitting in it).
 */
function onionRing(pen: Pen, wd: number, side: string, face: string, hole: string, front = false): void {
  const { p } = pen
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const rx = wd / 2
  const ry = rx * rig.RING_Q
  const ix = rx - rig.TUBE
  const iy = ix * rig.RING_Q
  const h = rig.RING_H
  const Xp = (v: number) => X(pen, v)
  if (front) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(Xp(-rx - 0.1), 0, Xp(2 * rx + 0.2), Xp(h + ry + 0.1))
    ctx.clip()
  }
  // The side, down to the bottom rim.
  p.noStroke()
  p.fill(side)
  p.rect(0, Xp(h / 2), Xp(2 * rx), Xp(h))
  p.ellipse(0, Xp(h), Xp(2 * rx), Xp(2 * ry))
  outline(pen, pen.w)
  p.line(Xp(-rx), 0, Xp(-rx), Xp(h))
  p.line(Xp(rx), 0, Xp(rx), Xp(h))
  p.arc(0, Xp(h), Xp(2 * rx), Xp(2 * ry), 0, Math.PI)
  p.stroke(alpha(p, H.soy, 0.55))
  p.strokeWeight(pen.w * 0.9)
  p.arc(0, Xp(h - 0.018), Xp(2 * rx - 0.03), Xp(2 * ry - 0.01), 0.15, Math.PI - 0.15)
  // The face, with a layer line round it, and the hole.
  solid(p, pen.ink, pen.w, face)
  if (front) {
    ctx.beginPath()
    ctx.ellipse(0, 0, Xp(rx), Xp(ry), 0, 0, Math.PI * 2)
    ctx.ellipse(0, 0, Xp(ix), Xp(iy), 0, 0, Math.PI * 2)
    ctx.fillStyle = face
    ctx.fill('evenodd')
    ctx.stroke()
  } else {
    p.ellipse(0, 0, Xp(2 * rx), Xp(2 * ry))
    solid(p, pen.ink, pen.w * 0.8, hole)
    p.ellipse(0, 0, Xp(2 * ix), Xp(2 * iy))
  }
  p.stroke(alpha(p, pen.ink, 0.4))
  p.strokeWeight(pen.w * 0.5)
  p.noFill()
  const mx = (rx + ix) / 2
  p.arc(0, 0, Xp(2 * mx), Xp(2 * mx * rig.RING_Q), front ? 0 : Math.PI * 0.08, front ? Math.PI : Math.PI * 0.92)
  if (front) ctx.restore()
}

function outline(pen: Pen, w: number): void {
  pen.p.stroke(pen.ink)
  pen.p.strokeWeight(w)
  pen.p.noFill()
}

/** The column of flame: how tall it stands at `t`. */
function columnHeight(t: number): number {
  const e = t - rig.ERUPT
  if (e < 0) return 0
  let h = 2.35 * easeOutCubic(clamp(e / 0.14))
  for (const f of rig.FLARES) {
    const u = t - f
    if (u > -0.03) h += 0.45 * Math.exp(-Math.max(0, u) / 0.16) * clamp((u + 0.03) / 0.03)
  }
  const fade = span(t, rig.SPOON - 0.05, rig.SPOON + 0.75)
  return h * (1 - easeInOutSine(fade) * 0.9) * (t > rig.SPOON + 1.5 ? Math.max(0, 1 - (t - rig.SPOON - 1.5) / 0.4) : 1)
}

function drawFlameTongue(pen: Pen, x: number, base: number, h: number, wd: number, seed: number, fill: string, neck = 0.1): void {
  const { t } = pen
  if (h < 0.02) return
  const n = 12
  const left: Pt[] = []
  const right: Pt[] = []
  const b0 = Math.min(1, neck / Math.max(0.01, wd))
  for (let i = 0; i <= n; i++) {
    const u = i / n
    // Out of the hole's width, swelling a third of the way up, licking to a point; its edges flicker.
    const swell = b0 + (1 - b0) * Math.sin((Math.PI / 2) * Math.min(1, u / 0.32))
    const prof = swell * Math.pow(1 - u, 0.75)
    const fl = 0.05 * Math.sin(t * 23 + seed + u * 7) + 0.04 * Math.sin(t * 37 + seed * 2 - u * 11)
    const lean = 0.1 * Math.sin(t * 5 + seed) * u * u
    const y = base - h * u
    left.push([x - wd * prof * (1 + fl) + lean, y])
    right.push([x + wd * prof * (1 - fl) + lean, y])
  }
  fillPoly(pen, [...left, ...right.reverse()], fill, null)
}

function ringColours(t: number): { side: string; face: string; hole: string } {
  const burnt = clamp((t - rig.ERUPT) / 0.8)
  const hot = heat(t)
  const face = mixHex(mixHex(H.onion, H.soy, 0.25 * burnt), H.flameHot, 0.12 * hot)
  const side = mixHex(mixHex(mixHex(H.onion, H.soy, 0.14), H.soy, 0.3 * burnt), H.flame, 0.22 * hot)
  const hole = mixHex(mixHex(BG, H.flame, Math.min(1, hot * 1.3)), H.flameHot, Math.max(0, hot - 0.6))
  return { side, face, hole }
}

export function drawVolcano(pen: Pen): void {
  const { p, t } = pen
  const e = t - rig.ERUPT
  const hot = heat(t)
  const { side, face, hole } = ringColours(t)
  // The heat inside shows as a glow round the stack.
  if (hot > 0.02) glow(pen, rig.VX, rig.TOP - rig.STACK * 0.6, 0.9, H.flame, 0.32 * hot)
  // The rings, from the bottom up.
  for (let i = 0; i < rig.RING_W.length; i++) {
    const r = ringAt(i, t)
    p.push()
    p.translate(X(pen, r.x), X(pen, r.y))
    p.rotate(r.tip)
    onionRing(pen, rig.RING_W[i], side, face, hole)
    p.pop()
  }
  // Steam spits out round her on every rattle: white, quick, gone.
  for (const [n, r] of rig.RATTLES.entries()) {
    const u = (t - r) / 0.5
    if (u < 0 || u > 1) continue
    const a = 0.92 * (1 - u) ** 0.35
    const size = (0.05 + 0.05 * u) * (1 - u * u)
    for (const s of [-1, 1]) vapour(pen, rig.VX + s * (0.16 + u * 0.2), rig.CORK[1] + 0.02 - u * 0.36, size * (s === (n % 2 ? 1 : -1) ? 1 : 0.75), a, H.hat)
  }
  // The column, its glow, and the embers it throws.
  const hCol = columnHeight(t)
  if (hCol > 0.02) {
    const top = ringAt(rig.RING_W.length - 1, t).y
    glow(pen, rig.VX, top - hCol * 0.45, hCol * 0.9 + 0.3, H.flameHot, 0.35)
    // The blast itself: a fireball blooming out of the top on the hit, rolling up into the column.
    const b = e / 0.42
    if (b < 1) {
      const up = easeOutCubic(b)
      const size = Math.sin(Math.PI * Math.min(1, b * 1.4)) * (1 - 0.5 * b)
      glow(pen, rig.VX, top - 0.4 - up * 0.5, 1.6, H.flameHot, 0.55 * (1 - b))
      drawFlameTongue(pen, rig.VX, top + 0.08, 0.5 + up * 1.1, 0.62 * size + 0.05, 7.7, H.flame)
      drawFlameTongue(pen, rig.VX, top + 0.05, 0.35 + up * 0.8, 0.42 * size + 0.03, 9.1, H.flameHot)
    }
    drawFlameTongue(pen, rig.VX, top + 0.02, hCol, 0.34, 1, H.flame)
    drawFlameTongue(pen, rig.VX, top + 0.01, hCol * 0.78, 0.2, 2.3, H.flameHot)
    drawFlameTongue(pen, rig.VX, top, hCol * 0.45, 0.08, 4.1, H.onion, 0.05)
  }
  if (hCol > 0.02) {
    const r = ringAt(rig.RING_W.length - 1, t)
    p.push()
    p.translate(X(pen, r.x), X(pen, r.y))
    p.rotate(r.tip)
    onionRing(pen, rig.RING_W[rig.RING_W.length - 1], side, face, hole, true)
    p.pop()
  }
  if (e > 0 && e < 2.2) {
    for (let i = 0; i < 9; i++) {
      const born = 0.05 + hash(i, 5) * 0.9
      const age = e - born
      if (age < 0 || age > 0.9) continue
      const x = rig.VX + (hash(i, 6) - 0.5) * 0.5 + (hash(i, 7) - 0.5) * age * 1.2
      const yy = rig.TOP - rig.STACK - 0.4 - (1.2 + hash(i, 8) * 1.4) * age
      p.noStroke()
      p.fill(alpha(p, H.flameHot, 1 - age / 0.9))
      p.circle(X(pen, x), X(pen, yy), X(pen, 0.03))
    }
  }
  // Smoke off the charred stack through the breath.
  if (e > 1.2 && e < 4.6) {
    for (let i = 0; i < 3; i++) {
      const born = 1.2 + i * 0.8
      const age = e - born
      if (age < 0 || age > 2.4) continue
      const u = age / 2.4
      vapour(pen, rig.VX + 0.1 * Math.sin(age * 1.7 + i), rig.TOP - rig.STACK - 0.1 - age * 0.55, 0.07 + u * 0.2, 0.3 * Math.sin(Math.PI * u), mixHex(H.raccoon, H.onion, 0.4))
    }
  }
}

/** The top ring's front rim again, over her, while she sits in its hole. */
export function drawCorkRing(pen: Pen): void {
  const { p, t } = pen
  if (t < rig.CORKED - 0.03 || t > rig.ERUPT + 0.03) return
  const i = rig.RING_W.length - 1
  const r = ringAt(i, t)
  const { side, face, hole } = ringColours(t)
  p.push()
  p.translate(X(pen, r.x), X(pen, r.y))
  onionRing(pen, rig.RING_W[i], side, face, hole, true)
  p.pop()
}

/* ------------------------------------------------------------------ sizzle */

/** Steam off the hot steel: where she lands, round her in the breath, and off the frying egg. */
export function drawSizzle(pen: Pen, where: (t: number) => Pt): void {
  const { t } = pen
  const puffs: { at: number; x: number; y: number; r: number; a: number }[] = []
  const land = rig.LAND_AT
  puffs.push({ at: rig.LAND, x: land[0] - 0.14, y: rig.TOP - 0.06, r: 0.06, a: 0.8 }, { at: rig.LAND + 0.02, x: land[0] + 0.16, y: rig.TOP - 0.06, r: 0.055, a: 0.7 })
  for (let i = 0; i < 5; i++) {
    const at = 115.4 + i * 0.62 + hash(i, 44) * 0.2
    const q = where(at)
    puffs.push({ at, x: q[0] + (hash(i, 45) - 0.5) * 0.34, y: rig.TOP - 0.08, r: 0.045 + 0.025 * hash(i, 46), a: 0.62 })
  }
  for (let i = 0; i < 3; i++) puffs.push({ at: rig.SPLAT + i * 0.05, x: FRY[0] + (i - 1) * 0.16, y: rig.TOP - 0.06, r: 0.06, a: 0.8 })
  for (const f of puffs) {
    const age = t - f.at
    if (age < 0 || age > 0.75) continue
    const u = age / 0.75
    vapour(pen, f.x + 0.05 * Math.sin(age * 4 + f.x * 5), f.y - age * 0.55, f.r * (1 + u * 0.6) * (1 - u * u), 0.9 * (1 - u) ** 0.35 * Math.min(1, age / 0.06), H.hat)
  }
}

