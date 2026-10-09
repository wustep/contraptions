import type p5 from 'p5'
import { mixHex, R, type Pt } from '../../../../../parts'
import { alpha, frame, hash, type Ctx } from '../kit'
import { HOME, INK } from '../worlds'
import {
  BOARDS, FLASH1, FLASH2, HOLE, SUN, THUNDER, TOPPLE, TREE, WINCH, bandageAt, boardAt, clamp01, limbAt, smoothstep, stormAt,
} from './jar-clock'
import { INSIDE } from './inside'

/**
 * What the jar builder draws in front of everything (the part's `over`): the storm's sky round the house, the garden
 * tree's crown behind the roof (clipped to outside the house, so the roof covers its foot; nothing of the cast is
 * ever out there), the rain, the tree's limb through the roof into the nursery (and the hole, and the boards that
 * patch it), the plaster it brings down, the lightning over the house, and the bandage round Carl's foot. INSIDE
 * cells, show time `T`.
 */

const G = 12
/** The limb's root, out in the tree behind the house, and its tip where it comes to hang in the nursery. */
const ROOT: [number, number] = [11.9, -12.7]
const TIP: [number, number] = [7.7, -5.1]
const LEN = Math.hypot(TIP[0] - ROOT[0], TIP[1] - ROOT[1])
const REST = Math.atan2(TIP[1] - ROOT[1], TIP[0] - ROOT[0])
/** Where it went through the roof (just right of the ridge): patched from the last board on. */
const ROOF_HOLE: [number, number] = [10.74, -10.62]
const SLOPE = Math.atan2(3.8, 12.35)

/** The house's outline from outside (walls, eaves, roof): what the storm darkens round, not over. */
function housePath(ctx: CanvasRenderingContext2D, k: number): void {
  const [e0, e1] = INSIDE.eaves
  const [rx, ry] = INSIDE.ridge
  const pts: [number, number][] = [
    [INSIDE.backWall[0] - 0.08, INSIDE.ground + 0.32], [INSIDE.backWall[0] - 0.08, INSIDE.eavesY + 0.1], [e0 - 0.3, INSIDE.eavesY + 0.12],
    [rx, ry - 0.45], [e1 + 0.3, INSIDE.eavesY + 0.12], [INSIDE.frontWall[1] + 0.08, INSIDE.eavesY + 0.1], [INSIDE.frontWall[1] + 0.08, INSIDE.ground + 0.32],
  ]
  ctx.moveTo(pts[0][0] * k, pts[0][1] * k)
  for (let i = pts.length - 1; i >= 1; i--) ctx.lineTo(pts[i][0] * k, pts[i][1] * k)
  ctx.closePath()
}

/** The top of the roof (the outline's roof line) over `x`. */
function roofTop(x: number): number {
  const [e0, e1] = INSIDE.eaves
  const [rx, ry] = INSIDE.ridge
  const [ax, ay] = x <= rx ? [e0 - 0.3, INSIDE.eavesY + 0.12] : [e1 + 0.3, INSIDE.eavesY + 0.12]
  return ry - 0.45 + ((x - rx) / (ax - rx)) * (ay - (ry - 0.45))
}

/** The chimney above the roof line (the tree and the limb go behind it too). */
function chimneyPath(ctx: CanvasRenderingContext2D, k: number): void {
  const [c0, c1, top] = INSIDE.chimney
  const a = c0 - 0.14
  const b = c1 + 0.14
  ctx.moveTo(a * k, (top - 0.22) * k)
  ctx.lineTo(b * k, (top - 0.22) * k)
  ctx.lineTo(b * k, roofTop(b) * k)
  ctx.lineTo(a * k, roofTop(a) * k)
  ctx.closePath()
}

/** Draws `draw` only where the frame is outside the house (and its chimney): behind it, in the garden and the sky. */
function behind(p: p5, c: Ctx, draw: () => void): void {
  const { k } = c
  const f = frame(p, k)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const box = (): void => ctx.rect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
  ctx.save()
  ctx.beginPath()
  box()
  housePath(ctx, k)
  ctx.clip('evenodd')
  ctx.beginPath()
  box()
  chimneyPath(ctx, k)
  ctx.clip('evenodd')
  draw()
  ctx.restore()
}

/** The storm's sky: the garden and the sky darkened round the house, deepest high up where the weather is. */
function stormSky(p: p5, c: Ctx, T: number): void {
  const { storm } = stormAt(T)
  if (storm <= 0.01) return
  const { k } = c
  const f = frame(p, k)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  ctx.rect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
  housePath(ctx, k)
  const g = ctx.createLinearGradient(0, (INSIDE.ridge[1] - 3.5) * k, 0, INSIDE.ground * k)
  g.addColorStop(0, `rgba(36, 43, 62, ${0.66 * storm})`)
  g.addColorStop(1, `rgba(43, 52, 72, ${0.5 * storm})`)
  ctx.fillStyle = g
  ctx.fill('evenodd')
  ctx.restore()
}

/** Rain across the sky and the garden, over the tree, round the house. */
function rain(p: p5, c: Ctx, T: number): void {
  const { rain: r } = stormAt(T)
  if (r <= 0.01) return
  const { k } = c
  const f = frame(p, k)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  ctx.rect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
  housePath(ctx, k)
  ctx.clip('evenodd')
  ctx.strokeStyle = `rgba(220, 238, 243, ${0.42 * r})`
  ctx.lineWidth = Math.max(1, k * 0.014)
  ctx.beginPath()
  const span = f.x1 - f.x0 + 2
  // As many drops for a tall frame (a phone upright) as for a wide one.
  const n = Math.round(140 * Math.max(1, (f.y1 - f.y0) / ((f.x1 - f.x0) * 0.5625)))
  for (let i = 0; i < n; i++) {
    const u = (hash(i, 5, 3) + T * (1.4 + hash(i, 6, 3) * 0.5)) % 1
    const rx = f.x0 - 1 + hash(i, 7, 3) * span - 0.8 * u
    const ry = f.y0 - 0.5 + u * (f.y1 - f.y0 + 1)
    ctx.moveTo(rx * k, ry * k)
    ctx.lineTo((rx - 0.09) * k, (ry + 0.34) * k)
  }
  ctx.stroke()
  ctx.restore()
}

/** Inside, the rooms upstairs and the hall take a little of the dark too (the living room has its own, under the two of them). */
function roomsDark(p: p5, c: Ctx, T: number): void {
  const { storm } = stormAt(T)
  if (storm <= 0.01) return
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  ctx.rect(INSIDE.backWall[1] * k, INSIDE.ceilUp * k, (INSIDE.frontWall[0] - INSIDE.backWall[1]) * k, (INSIDE.groundUp - INSIDE.ceilUp) * k)
  ctx.rect(INSIDE.hall[0] * k, INSIDE.ceil * k, (INSIDE.hall[1] - INSIDE.hall[0]) * k, (INSIDE.ground - INSIDE.ceil) * k)
  ctx.fillStyle = `rgba(43, 52, 72, ${0.16 * storm})`
  ctx.fill()
  ctx.restore()
}

/* ------------------------------------------------------------------ the garden tree, behind the roof */

/**
 * The big tree in the garden behind the house: its trunk is the one seen through the right-hand window, and its crown
 * stands up behind the roof, which hides its foot. The storm's gusts lean it over from the first flash (each gust
 * sharp, each recovery long and damped, never a spring); each flash whitens it. The great limb on its left tears off
 * on the thunder and goes down its line through the roof; winched out, it is let down behind the house, and the crown
 * stands thinner on that side from then on.
 */
const DIR: Pt = [Math.cos(REST), Math.sin(REST)]
/** Where the roof hides the crown's foot, and how much of it bends in the wind above that. */
const FOOT = -10.5
const BEND = 4
/** Before it tears the limb sits this much further up its line, and turned this much shallower; it drops both as it goes. */
const SLIDE = 0.35
const PRE_TILT = 0.1
/** Winched out: turned up over the roof, then let down behind the house (a drop and a droop), and gone. */
const HAUL = 1.05
const LOWER: [number, number] = [WINCH + 1.1, WINCH + 2.5]
const SINK = 3.4
const DROOP = 0.45

/**
 * The crown's own masses, drawn as the yard's big tree is (shade first, the lit masses over it, no outline): [x, y, rx,
 * ry, lit]. An old tree's broad dome round (12.1, -12.4), about 8.8 cells across, overhanging both slopes of the roof
 * (the roof hides the lowest lobes on the left, where it stands higher); its top at about y -14.35, inside the storm's
 * wide (17.2 cells round y -5.95), and its lowest lobes low enough to show at the top of the close frames.
 */
const CROWN: [number, number, number, number, number][] = [
  [12.1, -12.55, 2.1, 1.35, 0], [10.2, -12.35, 1.35, 0.95, 0], [14.0, -12.3, 1.4, 0.95, 0], [8.9, -11.2, 1.1, 0.72, 0],
  [15.35, -10.75, 1.1, 0.7, 0], [9.9, -11.1, 0.9, 0.6, 0], [14.3, -11.0, 0.95, 0.6, 0], [11.0, -13.55, 1.2, 0.78, 0],
  [13.1, -13.6, 1.15, 0.72, 0], [9.4, -12.9, 0.85, 0.6, 0], [14.9, -12.7, 0.9, 0.62, 0], [12.1, -13.75, 0.8, 0.55, 0],
  [16.1, -11.2, 0.6, 0.45, 0], [8.1, -11.75, 0.55, 0.4, 0],
  [11.0, -13.45, 0.85, 0.5, 1], [12.9, -13.5, 0.8, 0.45, 1], [9.9, -12.6, 0.8, 0.5, 1], [12.2, -12.4, 0.95, 0.55, 1],
  [14.2, -12.45, 0.8, 0.5, 1], [9.0, -11.45, 0.6, 0.38, 1], [15.2, -11.1, 0.62, 0.38, 1], [11.3, -11.75, 0.6, 0.36, 1],
  [13.5, -11.5, 0.55, 0.34, 1],
]
/**
 * The limb's own masses, riding with it: [along it from its butt, across it (up-left), rx, ry, lit]. They are the
 * crown's left side, and it stands thinner there once they have gone.
 */
const LIMB_LEAVES: [number, number, number, number, number][] = [
  [0.98, 0.94, 0.95, 0.66, 0], [1.9, 0.86, 0.75, 0.5, 0], [0.31, 0.35, 0.62, 0.4, 1], [0.69, 0.98, 0.6, 0.38, 1],
]
const SHADE = mixHex(HOME.leaf, INK, 0.18)
const LIT = mixHex(HOME.leaf, HOME.grass, 0.45)

/** A gust's shape: in fast but smooth, out long, no overshoot. */
const gust = (s: number, rise: number, fall: number): number => (s <= 0 ? 0 : (1 - (1 + s / rise) * Math.exp(-s / rise)) * Math.exp(-s / fall))

/** The wind's lean (cells at the crown's top; negative leans it left, the way the rain drives). */
function leanAt(T: number): number {
  const { storm } = stormAt(T)
  const on = smoothstep((T - (FLASH1 - 0.8)) / 0.8) * (1 - smoothstep((T - WINCH) / (SUN - WINCH)))
  // A breeze as the storm gathers, then the wind: a steady push that breathes, and a hard gust with each flash.
  let lean = 0.05 * storm * Math.sin(T * 1.3) - on * (0.12 + 0.05 * Math.sin(T * 1.7) + 0.04 * Math.sin(T * 2.9 + 1.1))
  for (const [at, a] of [[FLASH1, 0.26], [(FLASH1 + TREE) / 2, 0.12], [TREE, 0.34], [THUNDER, 0.28], [FLASH2, 0.18]] as [number, number][]) {
    lean -= on * a * gust(T - at, 0.08, 0.85)
  }
  return lean
}

/** How far the wind carries a point of the tree at height `y` sideways: nothing at the roof, most at the top. */
const bend = (lean: number, y: number): number => lean * Math.pow(Math.max(0, Math.min(1.25, (FOOT - y) / BEND)), 1.4)

/** A leaf colour in the storm's dark, whitened by the lightning. */
function leafTone(hex: string, T: number): string {
  const { storm, flash } = stormAt(T)
  const w = Math.min(1, flash * 1.15)
  return mixHex(mixHex(hex, HOME.night, 0.28 * storm), '#DDE6E2', 0.62 * w * w)
}

/** The crown's masses of one tone (shade, or lit), each leant by the wind at its height, fluttering a little on its own. */
function masses(p: p5, c: Ctx, T: number, lit: 0 | 1): void {
  const { k } = c
  const lean = leanAt(T)
  const { storm } = stormAt(T)
  p.noStroke()
  p.fill(leafTone(lit ? LIT : SHADE, T))
  CROWN.forEach(([x, y, rx, ry, l], i) => {
    if (l !== lit) return
    const flutter = 0.03 * storm * Math.sin(T * 3.1 + i * 1.7)
    const dx = bend(lean, y)
    p.ellipse((x + dx + flutter) * k, (y + 0.08 * Math.abs(dx)) * k, 2 * rx * k, 2 * ry * k)
  })
}

/** The trunk up from behind the roof, and the boughs it opens into (mostly hidden in the leaves). */
function boughs(p: p5, c: Ctx, T: number): void {
  const { k, weight } = c
  const lean = leanAt(T)
  const x = (u: number, y: number) => (u + bend(lean, y)) * k
  const { storm, flash } = stormAt(T)
  p.stroke(alpha(p, INK, 0.75))
  p.strokeWeight(weight * 0.7)
  p.fill(mixHex(mixHex(HOME.bark, INK, 0.2 * storm), '#D8DEDC', 0.5 * Math.min(1, flash) ** 2))
  // A thick old trunk up from behind the roof (showing between the ridge and the crown), and the boughs it spreads
  // into, out under both sides of the crown.
  const limbTo = (x0: number, y0: number, w0: number, x1: number, y1: number, w1: number): void => {
    const a = Math.atan2(y1 - y0, x1 - x0)
    const nx = -Math.sin(a)
    const ny = Math.cos(a)
    p.quad(x(x0 + nx * w0, y0 + ny * w0), (y0 + ny * w0) * k, x(x1 + nx * w1, y1 + ny * w1), (y1 + ny * w1) * k,
      x(x1 - nx * w1, y1 - ny * w1), (y1 - ny * w1) * k, x(x0 - nx * w0, y0 - ny * w0), (y0 - ny * w0) * k)
  }
  limbTo(9.4, -11.75, 0.1, 12.0, -11.5, 0.2)
  limbTo(14.8, -11.65, 0.1, 12.2, -11.45, 0.2)
  limbTo(13.4, -13.3, 0.08, 12.2, -12.0, 0.17)
  limbTo(12.1, -9.8, 0.46, 12.15, -12.5, 0.26)
}

/* ------------------------------------------------------------------ the great limb */

interface LimbPose {
  /** Its butt (where it tore from the crown), and its angle. */
  butt: Pt
  ang: number
  /** How much of it shows inside the house (it has come through the roof): none, all, or up to this far along it. */
  inside: 'none' | 'all' | number
}

/** How far along the limb (from its butt) it meets the top of the roof. */
function roofCross(butt: Pt, ang: number): number {
  const dx = Math.cos(ang)
  const dy = Math.sin(ang)
  const below = (d: number) => butt[1] + dy * d >= roofTop(butt[0] + dx * d)
  if (below(0)) return 0
  let lo = 0
  let hi = LEN
  if (!below(hi)) return LEN
  for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (below(m)) hi = m; else lo = m }
  return hi
}

function limbPose(T: number): LimbPose | null {
  if (T >= LOWER[1]) return null
  const lean = leanAt(T)
  const at = (b: number, sway: number): Pt => { const y = ROOT[1] + DIR[1] * b; return [ROOT[0] + DIR[0] * b + sway * bend(lean, y), y] }
  if (T < TREE - 0.22) return { butt: at(-SLIDE, 1), ang: REST + PRE_TILT + 0.08 * lean, inside: 'none' }
  const v = limbAt(T)
  if (T < WINCH) {
    // It tears: down its line by the slide, turned down to its line, and through the roof as it goes.
    const u = clamp01(v)
    const butt = at(-SLIDE * (1 - u), 1 - u)
    const ang = REST + (PRE_TILT + 0.08 * lean) * (1 - u) - 0.95 * Math.max(0, v - 1)
    if (u >= 1) return { butt, ang, inside: 'all' }
    const cross = roofCross(butt, ang)
    return { butt, ang, inside: cross + (LEN + 0.5 - cross) * Math.pow(u, 0.7) }
  }
  if (T < LOWER[0]) return { butt: [ROOT[0], ROOT[1]], ang: REST + (v < 1 ? HAUL * (1 - v) : -0.95 * (v - 1)), inside: 'all' }
  const q = smoothstep((T - LOWER[0]) / (LOWER[1] - LOWER[0]))
  return { butt: [ROOT[0], ROOT[1] + SINK * q], ang: REST + HAUL - DROOP * q, inside: 'none' }
}

/** A point along the limb, `s` of its length out from its butt, `side` across it (up-left positive). It bows a little. */
function along(pose: LimbPose, s: number, side = 0): [number, number] {
  const c = Math.cos(pose.ang)
  const n = Math.sin(pose.ang)
  const q = side + 0.12 * Math.sin(Math.PI * Math.min(1, Math.max(0, s)))
  return [pose.butt[0] + c * LEN * s - n * q, pose.butt[1] + n * LEN * s + c * q]
}

/** The limb's half-width `s` of its length out: a heavy butt (0.3) tapering fast at first, then slowly to its tip. */
const girth = (s: number): number => 0.045 + 0.255 * Math.pow(1 - s, 1.5)

function limb(p: p5, c: Ctx, T: number, pose: LimbPose): void {
  const { k, weight } = c
  const x = (u: number) => u * k
  const { storm: wet, flash } = stormAt(T)
  p.push()
  p.stroke(alpha(p, INK, 0.9))
  p.strokeWeight(weight * 0.8)
  p.fill(mixHex(mixHex(HOME.bark, INK, 0.15 * wet), '#D8DEDC', 0.5 * Math.min(1, flash) ** 2))
  // The limb: a heavy bough, bowed a little, tapering to its end, with two side branches carrying leaves.
  p.beginShape()
  const n = 14
  for (let i = 0; i <= n; i++) { const s = i / n; const [px, py] = along(pose, s, girth(s)); p.vertex(x(px), x(py)) }
  for (let i = n; i >= 0; i--) { const s = i / n; const [px, py] = along(pose, s, -girth(s)); p.vertex(x(px), x(py)) }
  p.endShape(p.CLOSE)
  p.strokeWeight(weight * 0.6)
  for (const [s0, s1, side, w] of [[0.6, 0.8, 0.8, 0.07], [0.72, 0.9, -0.62, 0.055]] as [number, number, number, number][]) {
    const [bx, by] = along(pose, s0)
    const [ex, ey] = along(pose, s1, side)
    const a = Math.atan2(ey - by, ex - bx)
    const nx = -Math.sin(a)
    const ny = Math.cos(a)
    p.quad(x(bx + nx * w), x(by + ny * w), x(ex + nx * 0.02), x(ey + ny * 0.02), x(ex - nx * 0.02), x(ey - ny * 0.02), x(bx - nx * w), x(by - ny * w))
  }
  // The leaves at its end and on its branches, in soft lobed masses of different sizes, no outline, darker in the rain.
  p.noStroke()
  const clumps: [number, number, number][] = [
    [0.8, -0.3, 0.86], [0.9, 0.3, 0.8], [0.99, -0.05, 0.66], [0.83, 0.78, 0.7], [0.93, 0.98, 0.52], [0.72, 0.2, 0.56],
    [0.88, -0.62, 0.5],
  ]
  clumps.forEach(([s, side, r], ci) => {
    const [lx, ly] = along(pose, s, side)
    p.fill(leafTone(mixHex(HOME.leaf, '#5E8A4C', hash(ci, 2, 1)), T))
    p.beginShape()
    const lobes = 7 + (ci % 3)
    for (let i = 0; i < lobes * 4; i++) {
      const a = (i / (lobes * 4)) * Math.PI * 2
      const bump = 0.86 + 0.14 * Math.abs(Math.sin((a * lobes) / 2)) + 0.06 * (hash(ci, i, 5) - 0.5)
      p.vertex(x(lx + Math.cos(a) * r * 0.66 * bump), x(ly + Math.sin(a) * r * 0.5 * bump))
    }
    p.endShape(p.CLOSE)
  })
  // Its own share of the crown, near its butt: the crown's left side, which goes with it.
  for (const lit of [0, 1]) {
    p.fill(leafTone(lit ? LIT : SHADE, T))
    for (const [d, side, rx, ry, l] of LIMB_LEAVES) {
      if (l !== lit) continue
      const [lx, ly] = along(pose, d / LEN, side)
      p.ellipse(lx * k, ly * k, 2 * rx * k, 2 * ry * k)
    }
  }
  p.pop()
}

/** The garden tree, behind the house: the back of its crown, its boughs, the limb (while it is still up there), its front. */
function gardenTree(p: p5, c: Ctx, T: number, pose: LimbPose | null): void {
  behind(p, c, () => {
    p.push()
    masses(p, c, T, 0)
    boughs(p, c, T)
    if (pose) limb(p, c, T, pose)
    masses(p, c, T, 1)
    p.pop()
  })
}

/** What of the limb has come through the roof: over the roof, the attic and the nursery. */
function limbInside(p: p5, c: Ctx, T: number, pose: LimbPose | null): void {
  if (!pose || pose.inside === 'none') return
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  housePath(ctx, k)
  ctx.clip()
  if (typeof pose.inside === 'number') {
    // Only as far as it has broken through: everything short of a line across it there.
    const d = pose.inside
    const dx = Math.cos(pose.ang)
    const dy = Math.sin(pose.ang)
    const [bx, by] = pose.butt
    const W = 30
    ctx.beginPath()
    ctx.moveTo((bx - dx * W - dy * W) * k, (by - dy * W + dx * W) * k)
    ctx.lineTo((bx + dx * d - dy * W) * k, (by + dy * d + dx * W) * k)
    ctx.lineTo((bx + dx * d + dy * W) * k, (by + dy * d - dx * W) * k)
    ctx.lineTo((bx - dx * W + dy * W) * k, (by - dy * W - dx * W) * k)
    ctx.closePath()
    ctx.clip()
  }
  limb(p, c, T, pose)
  ctx.restore()
}

/** The hole in the nursery's ceiling (and in the roof over it), with the broken plaster's teeth hanging round it. */
function holes(p: p5, c: Ctx, T: number): void {
  if (T < TREE) return
  const { k, weight } = c
  const x = (u: number) => u * k
  const patched = T >= BOARDS[2]
  p.push()
  p.noStroke()
  p.fill('#3A2E2A')
  p.beginShape()
  const n = 9
  for (let i = 0; i <= n; i++) p.vertex(x(HOLE.x0 + (i / n) * (HOLE.x1 - HOLE.x0)), x(HOLE.y - 0.13 - 0.05 * hash(i, 1, 1)))
  for (let i = n; i >= 0; i--) p.vertex(x(HOLE.x0 + (i / n) * (HOLE.x1 - HOLE.x0)), x(HOLE.y + 0.02 + 0.07 * hash(i, 2, 1)))
  p.endShape(p.CLOSE)
  // Broken plaster hanging from the break's edge, inside its span, until the first board swings up over it.
  const teeth = 1 - clamp01(boardAt(T, 0))
  if (teeth > 0.01) {
    p.fill(alpha(p, mixHex(HOME.nursery, HOME.stone, 0.4), teeth))
    p.stroke(alpha(p, INK, 0.6 * teeth))
    p.strokeWeight(weight * 0.45)
    const TEETH = [[0.1, 0.2, 0.09], [0.46, 0.13, 0.14], [0.74, 0.17, 0.07]]
    TEETH.forEach(([u, w, d], i) => {
      const tx = HOLE.x0 + u * (HOLE.x1 - HOLE.x0)
      p.triangle(x(tx), x(HOLE.y), x(tx + w), x(HOLE.y), x(tx + w * (0.3 + 0.4 * hash(i, 3, 1))), x(HOLE.y + d))
    })
  }
  // The roof: the gap the limb tore, or (from the last board) its patch of new shingles.
  p.push()
  p.translate(x(ROOF_HOLE[0]), x(ROOF_HOLE[1]))
  p.rotate(SLOPE)
  p.rectMode(p.CENTER)
  p.stroke(alpha(p, INK, 0.8))
  p.strokeWeight(weight * 0.6)
  p.fill(patched ? mixHex(HOME.roof, HOME.trim, 0.25) : '#3A2E2A')
  p.rect(0, x(-0.2), x(0.9), x(0.44), x(0.02))
  p.pop()
  p.pop()
}

/**
 * The plaster the limb brings down: [where it comes to rest from under the hole's middle, its half-length, its
 * thickness (of its length), its rest angle, how late it falls, where it falls from (from the middle), its speed out of
 * the hole, its spin]. Chunks of clearly different sizes that land in a heap, overlapping, lying nearly flat.
 */
const CHUNKS: [number, number, number, number, number, number, number, number][] = [
  [0.0, 0.19, 0.4, 0.07, 0, -0.12, 5.3, 6],
  [-0.15, 0.11, 0.52, -0.2, 0.05, -0.36, 4.7, -8],
  [0.15, 0.075, 0.6, 0.18, 0.09, 0.3, 4.2, 9],
  [0.06, 0.045, 0.7, -0.12, 0.14, 0.12, 3.8, -11],
]
/** Each chunk's outline, irregular, as [x, y] of unit size (x along its length, y across it). */
const CHUNK_SHAPES: Pt[][] = CHUNKS.map((_, ci) => {
  const m = 6 + (ci % 2)
  return Array.from({ length: m }, (_, i) => {
    const a = ((i + 0.3 * (hash(ci, i, 11) - 0.5)) / m) * Math.PI * 2
    const r = 0.8 + 0.28 * hash(ci, i, 12)
    return [Math.cos(a) * r, Math.sin(a) * r] as Pt
  })
})
/** Plaster dust, pale on the nursery's floor. */
const DUST = mixHex(HOME.paper, '#F7F2E8', 0.55)
/** How long a chunk takes to stop sliding once it has landed. */
const SETTLE = 0.08

/** Plaster brought down by the limb: it falls into the nursery in a heap, on its own dust, and is gone by the time it is mended. */
function plaster(p: p5, c: Ctx, T: number): void {
  const s0 = T - TREE
  if (s0 < 0 || T > BOARDS[2] + 1.6) return
  const { k, weight } = c
  const x = (u: number) => u * k
  const fade = 1 - smoothstep((T - BOARDS[1]) / (BOARDS[2] + 1.6 - BOARDS[1]))
  const floor = INSIDE.groundUp
  const mid = (HOLE.x0 + HOLE.x1) / 2
  const y0 = HOLE.y + 0.05
  const poses = CHUNKS.map(([rest, size, thick, ang, lag, from, v0, spin], ci) => {
    // Where it rests: its lowest corner (at its rest angle) on the floor.
    const cs = Math.cos(ang)
    const sn = Math.sin(ang)
    const low = Math.max(...CHUNK_SHAPES[ci].map(([u, v]) => sn * u * size + cs * v * size * thick))
    const yRest = floor - low
    const tf = (-v0 + Math.sqrt(v0 * v0 + 2 * G * (yRest - y0))) / G
    // Across, at one speed through the fall, and on after it lands, slowing to rest (so it never jerks sideways).
    const vx = (rest - from) / (tf + SETTLE)
    const s = Math.max(0, s0 - lag)
    const t = Math.min(s, tf)
    const px = mid + from + vx * t + (s > tf ? vx * SETTLE * (1 - Math.exp(-(s - tf) / SETTLE)) : 0)
    const py = s < tf ? y0 + v0 * t + 0.5 * G * t * t : yRest
    return { ci, px, py, a: ang + spin * (tf - t), size, thick, landed: s >= tf, tf: tf + lag }
  })
  p.push()
  // The dust it lands in: a soft pale smear on the floor under the heap, spreading as it settles.
  const smear = smoothstep((s0 - poses[0].tf) / 0.5) * fade
  if (smear > 0.01) {
    p.noStroke()
    const spread = 0.75 + 0.25 * smear
    for (const [w, h, a] of [[1.15, 0.1, 0.12], [0.85, 0.075, 0.16], [0.55, 0.05, 0.2]]) {
      p.fill(alpha(p, DUST, a * smear))
      p.ellipse(x(mid + 0.01), x(floor - h * 0.3), x(w * spread), x(h))
    }
  }
  p.stroke(alpha(p, INK, 0.55 * fade))
  p.strokeWeight(weight * 0.4)
  for (const { ci, px, py, a, size, thick } of poses) {
    if (s0 < CHUNKS[ci][4]) continue
    p.fill(alpha(p, mixHex(HOME.nursery, HOME.stone, 0.3 + 0.12 * ci), fade))
    p.push()
    p.translate(x(px), x(py))
    p.rotate(a)
    p.beginShape()
    for (const [u, v] of CHUNK_SHAPES[ci]) p.vertex(x(u * size), x(v * size * thick))
    p.endShape(p.CLOSE)
    p.pop()
  }
  p.pop()
  void TOPPLE
}

/** The three boards nailed up under the hole, each on its downbeat: hung from one nail, swung up flat, nailed. */
function boards(p: p5, c: Ctx, T: number): void {
  const { k, weight } = c
  const x = (u: number) => u * k
  for (let i = 0; i < BOARDS.length; i++) {
    const u = boardAt(T, i)
    if (u < 0) continue
    const appear = smoothstep((T - (BOARDS[i] - 0.4)) / 0.12)
    const x0 = HOLE.x0 - 0.12 + i * 0.07
    const y = HOLE.y + 0.02 + i * 0.1
    const lean = [-0.03, 0.025, -0.015][i]
    p.push()
    p.translate(x(x0), x(y))
    p.rotate(lean + (1 - u) * 1.25)
    p.rectMode(p.CORNER)
    p.stroke(alpha(p, INK, 0.9 * appear))
    p.strokeWeight(weight * 0.6)
    p.fill(alpha(p, mixHex(HOME.wood, HOME.trim, 0.25), appear))
    p.rect(0, 0, x(HOLE.x1 - HOLE.x0 + 0.24), x(0.1), x(0.01))
    p.noStroke()
    p.fill(alpha(p, INK, appear))
    p.circle(x(0.06), x(0.05), x(0.025))
    if (u >= 1 - 1e-6 || T >= BOARDS[i]) p.circle(x(HOLE.x1 - HOLE.x0 + 0.18), x(0.05), x(0.025))
    p.pop()
  }
}

/** Plaster dust shaken down from the living room's ceiling by the blow. */
function dust(p: p5, c: Ctx, T: number): void {
  const s = T - TREE
  if (s < 0 || s > 1.8) return
  const { k } = c
  p.push()
  p.noStroke()
  for (let i = 0; i < 16; i++) {
    const lag = hash(i, 1, 4) * 0.25
    const q = s - lag
    if (q < 0) continue
    const px = 6.8 + hash(i, 2, 4) * 3.4 + 0.12 * Math.sin(q * 3 + i)
    const py = -3.58 + 1.6 * q * q + 0.2 * q
    const a = (1 - smoothstep(q / 1.5)) * 0.8
    p.fill(alpha(p, HOME.paper, a))
    p.circle(px * k, py * k, (0.018 + 0.025 * hash(i, 3, 4)) * k)
  }
  p.pop()
}

/** Lightning: the whole house lit for an instant. */
function lightning(p: p5, c: Ctx, T: number): void {
  const { flash } = stormAt(T)
  if (flash <= 0.01) return
  const { k } = c
  const f = frame(p, k)
  p.push()
  p.rectMode(p.CORNER)
  p.noStroke()
  p.fill(alpha(p, '#F4F7F2', 0.32 * flash))
  p.rect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
  p.pop()
}

/** Carl as the cast draws him, for the bandage: his centre, his tilt and his squash. */
export interface Figure {
  x: number
  y: number
  tilt: number
  squash: number
}

/** The bandage round his foot: a white band wrapped on from the side she touches him, and unwound as he heals. */
function bandage(p: p5, c: Ctx, T: number, carl: Figure): void {
  const wrap = bandageAt(T)
  if (wrap <= 0.01) return
  const { k, weight } = c
  const s = 2 * R * k
  const h = s * (1 - carl.squash)
  const w = s * (1 + carl.squash * 0.6)
  p.push()
  p.translate(carl.x * k, carl.y * k)
  p.rotate(carl.tilt)
  p.translate(0, (s - h) / 2)
  p.rectMode(p.CORNER)
  p.stroke(alpha(p, INK, 0.9))
  p.strokeWeight(weight * 0.6)
  p.fill(HOME.trim)
  // Tall enough to read at the room's framing, with its wraps crossing it, so it reads as gauze wound round him and
  // not as a white stripe.
  const band = 0.11 * k
  const len = (w + 0.02 * k) * wrap
  const x0 = w / 2 + 0.01 * k - len
  const y0 = h / 2 - band - 0.012 * k
  p.rect(x0, y0, len, band, 0.02 * k)
  p.strokeWeight(weight * 0.4)
  p.stroke(alpha(p, INK, 0.45))
  for (const u of [0.3, 0.62]) {
    const x = x0 + len * u
    if (x - 0.03 * k > x0) p.line(x - 0.03 * k, y0 + band, x + 0.03 * k, y0)
  }
  p.stroke(alpha(p, INK, 0.9))
  p.strokeWeight(weight * 0.6)
  if (wrap > 0.95) {
    // The knot, on her side.
    p.ellipse(w / 2 + 0.035 * k, h / 2 - band / 2 - 0.012 * k, 0.07 * k, 0.05 * k)
  }
  p.pop()
}

export function drawStormOver(p: p5, c: Ctx, T: number, carl: Figure | null): void {
  const pose = limbPose(T)
  stormSky(p, c, T)
  gardenTree(p, c, T, pose)
  rain(p, c, T)
  roomsDark(p, c, T)
  holes(p, c, T)
  limbInside(p, c, T, pose)
  plaster(p, c, T)
  boards(p, c, T)
  dust(p, c, T)
  if (carl) bandage(p, c, T, carl)
  lightning(p, c, T)
}
