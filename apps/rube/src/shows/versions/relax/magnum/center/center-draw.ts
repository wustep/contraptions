import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { mixHex } from '../../../../../parts'
import { bloom, flashBurst, glint, pool, rgba } from '../cast'
import { hash, type Ctx } from '../kit'
import { level } from '../music'
import { AWARDS, CENTER, CENTER_THEME } from '../worlds'
import {
  BRANCH_Y,
  BUMP,
  cameraUp,
  D,
  DEREK_END,
  DOORS,
  doorsAt,
  FULL,
  GROUND,
  GROWS,
  HANSEL_END,
  LIFTED,
  liftAt,
  MODEL,
  MODEL_X,
  onPedal,
  pedalAngle,
  pedalAt,
  PHOTO,
  LAMP_H,
  lanternLitAt,
  litAt,
  PRESS,
  PRESS_FOOT,
  pressWalk,
  PUMP_GONE,
  TAIL_BY,
  TAIL_FLASHES,
  WINDOW_KIDS,
  PRESS_SCALE,
  PULL_X,
  PUMP,
  scaleAt,
  shiverAt,
  hiccupAt,
  STOMPS,
  TAP,
  AIR,
  TREE,
  WEIGHT,
} from './center-plan'

/**
 * How the Center is drawn (the CENTER builder's): the building at any size, trees, the unveiling's tree and sheet,
 * the foot pump and its hose, the press. Everything in the part's own cells times `k`, from show time.
 */

const INK = CENTER_THEME.ink
/** The dark inside the open doors, a little warm: what the kids go into. */
export const INTERIOR = mixHex(mixHex(INK, CENTER.brass, 0.22), CENTER.roof, 0.18)
/** The pump's boards, its leather, and the hose. */
const WOOD = mixHex(CENTER.brass, CENTER.path, 0.35)
const LEATHER = mixHex(mixHex(CENTER.brass, INK, 0.52), CENTER.roof, 0.2)
const HOSE = mixHex(INK, CENTER.roof, 0.35)
/** The press: one dark mass, rimmed where the light falls. */
const PRESS_DARK = mixHex(INK, CENTER.roof, 0.28)
const PRESS_RIM = mixHex(CENTER.stone, AWARDS.warm, 0.35)

/**
 * The dusk (the tail's): what the land and the building turn toward as the day goes, and how far it has gone. The
 * set and the part set it from show time at the start of each frame's drawing.
 */
const NIGHT_LAND = mixHex(AWARDS.house, CENTER.roof, 0.38)
/** A lit window at dusk, and the warm dark inside the open doors at dusk. */
export const LIT = mixHex(AWARDS.warm, CENTER.brass, 0.22)
let DUSK = 0
export const setDusk = (d: number): void => {
  DUSK = d
}
/** A colour gone toward dusk, `a` of the way at full dusk. */
export const dk = (hex: string, a = 0.5): string => (DUSK > 0.001 ? mixHex(hex, NIGHT_LAND, a * DUSK) : hex)

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const sm = (v: number) => {
  const u = clamp01(v)
  return u * u * (3 - 2 * u)
}

/** Stroke and fill for an inked solid; `w` in pixels. */
function inked(p: p5, w: number, fill: string, ink = INK): void {
  p.stroke(ink)
  p.strokeWeight(Math.max(0.3, w))
  p.fill(fill)
}
/** Rect from corners (cells → pixels). */
function box(p: p5, k: number, x0: number, y0: number, x1: number, y1: number): void {
  p.rect(Math.min(x0, x1) * k, Math.min(y0, y1) * k, Math.abs(x1 - x0) * k, Math.abs(y1 - y0) * k)
}
function poly(p: p5, k: number, pts: Pt[], close = true): void {
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  if (close) p.endShape(p.CLOSE)
  else p.endShape()
}

/* ------------------------------------------------------------------ trees */

export interface TreeSpec {
  x: number
  /** Its foot. */
  y: number
  h: number
  w: number
  seed: number
  /** Line weight in pixels (0 for none). */
  lw: number
  /** Sway, cells at the top. */
  sway: number
  fade?: number
  /** Draw only the crown (a trunk drawn elsewhere). */
  crownOnly?: boolean
}

/** A tree: a trunk and a crown of overlapping rounds, shaded toward its foot and right; the sun from the upper left. */
export function drawTree(p: p5, k: number, s: TreeSpec): void {
  const { x, y, h, w, seed, lw, sway } = s
  const fade = s.fade ?? 0
  const leaf = dk(mixHex(CENTER.tree, CENTER.sky, fade), 0.62)
  const shade = dk(mixHex(CENTER.treeDark, CENTER.sky, fade), 0.62)
  const light = dk(mixHex(mixHex(CENTER.tree, CENTER.lawn, 0.55), CENTER.sky, fade), 0.66)
  const bark = dk(mixHex(mixHex(CENTER.treeDark, INK, 0.35), CENTER.sky, fade), 0.5)
  const cx = x + sway * 0.6
  const cy = y - h * 0.63
  // The trunk: tapering up into the crown.
  p.push()
  if (s.crownOnly) p.noFill()
  if (lw > 0) inked(p, lw, bark)
  else {
    p.noStroke()
    p.fill(bark)
  }
  const tw = w * 0.07
  if (!s.crownOnly) poly(p, k, [
    [x - tw, y],
    [x - tw * 0.55 + sway * 0.2, y - h * 0.5],
    [x + tw * 0.55 + sway * 0.2, y - h * 0.5],
    [x + tw, y],
  ])
  p.pop()
  // The crown: rounds scattered on an oval.
  const n = 8
  const blobs: [number, number, number, number][] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + hash(seed, i, 1) * 0.6
    const r = 0.55 + 0.3 * hash(seed, i, 2)
    blobs.push([cx + Math.cos(a) * w * 0.28 * r + sway * 0.3 * (1 - Math.sin(a)), cy + Math.sin(a) * h * 0.2 * r, w * (0.42 + 0.14 * hash(seed, i, 3)), h * (0.3 + 0.08 * hash(seed, i, 4))])
  }
  blobs.push([cx, cy, w * 0.62, h * 0.5])
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.push()
  if (lw > 0) {
    p.stroke(INK)
    p.strokeWeight(lw * 2)
    p.noFill()
    for (const [bx, by, bw, bh] of blobs) p.ellipse(bx * k, by * k, bw * k, bh * k)
  }
  p.noStroke()
  p.fill(leaf)
  for (const [bx, by, bw, bh] of blobs) p.ellipse(bx * k, by * k, bw * k, bh * k)
  // Shade and light inside the crown only.
  ctx.save()
  ctx.beginPath()
  for (const [bx, by, bw, bh] of blobs) {
    ctx.moveTo((bx + bw / 2) * k, by * k)
    ctx.ellipse(bx * k, by * k, (bw / 2) * k, (bh / 2) * k, 0, 0, Math.PI * 2)
  }
  ctx.clip()
  p.fill(shade)
  for (const [bx, by, bw, bh] of blobs) p.ellipse((bx + w * 0.09) * k, (by + h * 0.08) * k, bw * 0.9 * k, bh * 0.8 * k)
  p.fill(leaf)
  for (const [bx, by, bw, bh] of blobs) p.ellipse((bx - w * 0.02) * k, (by - h * 0.03) * k, bw * 0.78 * k, bh * 0.7 * k)
  p.fill(light)
  for (const [bx, by, bw, bh] of blobs.slice(0, 4)) p.ellipse((bx - w * 0.07) * k, (by - h * 0.07) * k, bw * 0.38 * k, bh * 0.32 * k)
  ctx.restore()
  p.pop()
}

/* ------------------------------------------------------------------ the building */

/** The building's own line weight: it follows the building's size on the screen, never heavier than the stage's. */
export const buildingWeight = (c: Ctx, S: number): number => Math.min(c.weight, Math.max(0.35, c.k * S * MODEL.h * 0.0085))

/**
 * The Center at scale `S` (1 is the model, 27 the building), from its left foot: the same drawing at every size.
 * Its parts arrive a little apart on a jump: it goes up first, then out; the roofs and pediment unfold after, the
 * lantern lifts last, and the trees after that.
 */
export function drawBuilding(p: p5, c: Ctx, t: number): void {
  const { k } = c
  const shiver = shiverAt(t)
  const Sx = scaleAt(t, 0.018, 0.62, 30) * (1 - shiver * 0.6)
  const Sy = scaleAt(t, 0, 0.6, 30) * (1 + shiver)
  const Sr = scaleAt(t, 0.04, 0.5, 26)
  const Sl = scaleAt(t, 0.065, 0.42, 24)
  const St = scaleAt(t, 0.09, 0.45, 20)
  const fx = Sx / FULL
  const fy = Sy / FULL
  const lift = hiccupAt(t)
  const X = (v: number) => MODEL.x0 + v * fx
  const Y = (v: number) => GROUND - lift - v * fy
  const lw = buildingWeight(c, Sy)
  const thin = lw * 0.55
  const breeze = Math.sin(t * 0.9) * 0.5 + Math.sin(t * 0.37 + 1) * 0.5

  // Its trees: the one behind the right wing first.
  const tree = (i: number) => {
    const tr = D.trees[i]
    const f = St / FULL
    drawTree(p, k, { x: X(tr.x), y: GROUND - lift, h: tr.h * f, w: tr.w * f, seed: tr.seed + 40, lw: lw * 0.8, sway: breeze * 0.05 * tr.h * f })
  }
  tree(0)

  p.push()
  // The plinth and the stair.
  inked(p, lw, dk(CENTER.stoneShade, 0.46))
  box(p, k, X(0), Y(0), X(D.W), Y(D.plinth))
  inked(p, lw, dk(CENTER.stone, 0.46))
  box(p, k, X(-0.08), Y(D.plinth - 0.1), X(D.W + 0.08), Y(D.plinth))
  inked(p, lw, dk(CENTER.plinth, 0.46))
  box(p, k, X(D.stair.x0), Y(0), X(D.stair.x1), Y(D.plinth))
  outline(p, lw * 0.8)
  for (let s = 1; s < D.stair.n; s++) {
    const yy = Y((D.plinth * s) / D.stair.n)
    p.line(X(D.stair.x0) * k, yy * k, X(D.stair.x1) * k, yy * k)
  }

  // The central block behind the portico, in its shade; the door in it.
  inked(p, lw, dk(CENTER.stoneShade, 0.46))
  box(p, k, X(D.wings[0][1]), Y(D.plinth), X(D.wings[1][0]), Y(5.9))
  drawDoor(p, c, t, X, Y, lw)

  // The wings, their cornices and their tall windows.
  for (const [a, b] of D.wings) {
    inked(p, lw, dk(CENTER.stone, 0.46))
    box(p, k, X(a), Y(D.plinth), X(b), Y(D.wingTop))
    inked(p, lw, dk(CENTER.stone, 0.46))
    box(p, k, X(a - 0.12), Y(D.wingTop - 0.28), X(b + 0.12), Y(D.wingTop))
    p.noStroke()
    p.fill(dk(CENTER.stoneShade, 0.46))
    box(p, k, X(a - 0.12), Y(D.wingTop - 0.28), X(b + 0.12), Y(D.wingTop - 0.36))
  }
  D.windows.forEach((wx, i) => drawWindow(p, c, t, i, X, Y, wx, lw, thin))

  // The wings' slate roofs, unfolding after the walls.
  const fr = Sr / FULL
  const RY = (v: number) => Y(D.wingTop) - v * fr
  inked(p, lw, dk(CENTER.roof, 0.46))
  for (const [a, b] of D.wings) {
    poly(p, k, [
      [X(a - 0.05), RY(0)],
      [X(a + 0.45), RY(0.72)],
      [X(b - 0.45), RY(0.72)],
      [X(b + 0.05), RY(0)],
    ])
  }
  // The central roof behind the pediment, and the lantern lifting out of it.
  const PY = (v: number) => Y(D.portico.top) - v * fr
  inked(p, lw, dk(CENTER.roof, 0.46))
  poly(p, k, [
    [X(4.75), PY(0.2)],
    [X(5.4), PY(0.85)],
    [X(8.1), PY(0.85)],
    [X(8.75), PY(0.2)],
  ])
  drawLantern(p, c, t, X, PY(0.75), Sl / FULL, lw, thin)

  // The portico: the columns in the light before the shaded wall, the entablature, the pediment.
  for (const cx of D.columns) {
    inked(p, lw, dk(CENTER.stone, 0.46))
    box(p, k, X(cx - 0.18), Y(D.plinth + 0.14), X(cx + 0.18), Y(4.72))
    inked(p, lw, dk(CENTER.plinth, 0.46))
    box(p, k, X(cx - 0.27), Y(D.plinth), X(cx + 0.27), Y(D.plinth + 0.16))
    box(p, k, X(cx - 0.28), Y(4.7), X(cx + 0.28), Y(4.9))
    outline(p, thin, dk(CENTER.stoneShade, 0.46))
    p.line(X(cx - 0.06) * k, Y(D.plinth + 0.3) * k, X(cx - 0.06) * k, Y(4.6) * k)
    p.line(X(cx + 0.08) * k, Y(D.plinth + 0.3) * k, X(cx + 0.08) * k, Y(4.6) * k)
  }
  inked(p, lw, dk(CENTER.stone, 0.46))
  box(p, k, X(D.portico.x0), Y(4.9), X(D.portico.x1), Y(D.portico.top))
  outline(p, thin)
  p.line(X(D.portico.x0) * k, Y(5.2) * k, X(D.portico.x1) * k, Y(5.2) * k)
  inked(p, lw, dk(CENTER.stone, 0.46))
  poly(p, k, [
    [X(D.portico.x0 - 0.12), PY(0)],
    [X(6.75), PY(D.portico.apex - D.portico.top)],
    [X(D.portico.x1 + 0.12), PY(0)],
  ])
  inked(p, thin, dk(CENTER.stoneShade, 0.46))
  poly(p, k, [
    [X(D.portico.x0 + 0.45), PY(0.16)],
    [X(6.75), PY(D.portico.apex - D.portico.top - 0.26)],
    [X(D.portico.x1 - 0.45), PY(0.16)],
  ])
  p.pop()

  tree(1)
}

function outline(p: p5, w: number, ink = INK): void {
  p.stroke(ink)
  p.strokeWeight(Math.max(0.3, w))
  p.noFill()
}

/** A tall window: its stone frame, glass with the sky in it, glazing bars, and a little cornice over it. */
function drawWindow(p: p5, c: Ctx, t: number, i: number, X: (v: number) => number, Y: (v: number) => number, wx: number, lw: number, thin: number): void {
  const { k } = c
  const { w, y0, y1 } = D.window
  inked(p, lw, dk(CENTER.stoneShade, 0.46))
  box(p, k, X(wx - w / 2 - 0.1), Y(y0 - 0.1), X(wx + w / 2 + 0.1), Y(y1 + 0.1))
  const lit = litAt(i, t)
  inked(p, lw, mixHex(dk(CENTER.glass, 0.62), LIT, lit))
  box(p, k, X(wx - w / 2), Y(y0), X(wx + w / 2), Y(y1))
  // The sky's light across the glass, going with the day; or a lamp's, inside.
  p.noStroke()
  p.fill(rgba(CENTER.cloud, 0.45 * (1 - DUSK) * (1 - lit)))
  poly(p, k, [
    [X(wx - w / 2), Y(y1 - 0.9)],
    [X(wx - w / 2), Y(y1 - 0.35)],
    [X(wx + w / 2), Y(y1 - 1.45)],
    [X(wx + w / 2), Y(y1 - 2.0)],
  ])
  outline(p, thin, mixHex(INK, dk(CENTER.stone, 0.46), 0.35))
  p.line(X(wx) * k, Y(y0) * k, X(wx) * k, Y(y1) * k)
  for (const f of [0.34, 0.67]) {
    const yy = Y(y0 + (y1 - y0) * f)
    p.line(X(wx - w / 2) * k, yy * k, X(wx + w / 2) * k, yy * k)
  }
  inked(p, lw, dk(CENTER.stone, 0.46))
  box(p, k, X(wx - w / 2 - 0.2), Y(y1 + 0.12), X(wx + w / 2 + 0.2), Y(y1 + 0.26))
}

/** The lantern on the roof: a drum with two dark lights, a dome and a brass finial. `fl` its own scale over FULL. */
function drawLantern(p: p5, c: Ctx, t: number, X: (v: number) => number, base: number, fl: number, lw: number, thin: number): void {
  const { k } = c
  const cx = X(6.75)
  const hw = 0.6 * fl
  const LY = (v: number) => base - v * fl
  inked(p, lw, dk(CENTER.stone, 0.46))
  box(p, k, cx - hw, LY(0), cx + hw, LY(1.0))
  p.noStroke()
  ;[-0.26, 0.26].forEach((o, i) => {
    p.fill(mixHex(mixHex(dk(CENTER.roof, 0.46), INK, 0.3), LIT, lanternLitAt(i, t)))
    box(p, k, cx + (o - 0.1) * fl, LY(0.25), cx + (o + 0.1) * fl, LY(0.8))
  })
  inked(p, lw, dk(CENTER.stone, 0.46))
  box(p, k, cx - hw - 0.08 * fl, LY(0.95), cx + hw + 0.08 * fl, LY(1.08))
  inked(p, lw, dk(CENTER.roof, 0.46))
  p.arc(cx * k, LY(1.08) * k, 2 * hw * k, 2 * 0.62 * fl * k, Math.PI, Math.PI * 2, p.CHORD)
  outline(p, Math.max(thin, 0.4), CENTER.brass)
  p.line(cx * k, LY(1.68) * k, cx * k, LY(1.9) * k)
}

/** The doorway: brass leaves, shut, until the fourth stomp's air blows them open onto the warm dark inside. */
function drawDoor(p: p5, c: Ctx, t: number, X: (v: number) => number, Y: (v: number) => number, lw: number): void {
  const { k } = c
  const { x0, x1, top } = D.door
  // Its surround and the cornice over it.
  inked(p, lw, dk(CENTER.stone, 0.46))
  box(p, k, X(x0 - 0.2), Y(D.plinth), X(x1 + 0.2), Y(top + 0.2))
  box(p, k, X(x0 - 0.36), Y(top + 0.26), X(x1 + 0.36), Y(top + 0.46))
  const open = doorsAt(t)
  inked(p, lw, mixHex(INTERIOR, mixHex(INTERIOR, LIT, 0.4), DUSK))
  box(p, k, X(x0), Y(D.plinth), X(x1), Y(top))
  if (open > 0.001) {
    // A warm light far inside, warmer as the day goes.
    const f = X(1) - X(0)
    bloom(p, k, [X((x0 + x1) / 2), Y(D.plinth + 1.0)], 1.3 * f, mixHex(CENTER.brass, CENTER.cloud, 0.35), (0.3 + 0.3 * DUSK) * clamp01(open))
  }
  // The leaves, each turning on its outer hinge: its face narrows and darkens as it swings in.
  const a = Math.min(1.1, open) * 1.36
  const face = Math.max(0.06, Math.cos(a))
  const lit = mixHex(CENTER.brass, INK, 0.12 + 0.45 * Math.sin(Math.min(a, Math.PI / 2)))
  const half = (x1 - x0) / 2
  for (const side of [0, 1]) {
    const h0 = side === 0 ? x0 : x1
    const h1 = side === 0 ? x0 + half * face : x1 - half * face
    inked(p, lw, lit)
    box(p, k, X(h0), Y(D.plinth), X(h1), Y(top))
    if (face > 0.3) {
      outline(p, lw * 0.6, mixHex(lit, INK, 0.35))
      const m0 = X(Math.min(h0, h1) + half * face * 0.18)
      const m1 = X(Math.max(h0, h1) - half * face * 0.18)
      box(p, k, m0, Y(D.plinth + 0.3), m1, Y(D.plinth + 1.2))
      box(p, k, m0, Y(D.plinth + 1.45), m1, Y(top - 0.3))
    }
  }
}

/* ------------------------------------------------------------------ the unveiling */

/** The sheet at lift `h`: draped over the model at 0, hanging from its peak as it is hauled up. */
function sheetShape(h: number, t: number): Pt[] {
  const pull = sm(h / 0.3)
  const peakY = GROUND - MODEL.h - 0.035 - h
  // Its half-width down from the peak: over the lantern, out over the roofs, down the walls; or a bell, hanging.
  const draped: Pt[] = [[0, 0.02], [0.05, 0.07], [0.1, 0.21], [0.14, 0.27], [0.3, 0.3], [0.36, 0.33]]
  const hang: Pt[] = [[0, 0.015], [0.05, 0.045], [0.13, 0.085], [0.26, 0.12], [0.38, 0.145], [0.43, 0.16]]
  // Up at the limb it gathers against the pulley, a bundle among the leaves.
  const gather = t > LIFTED ? 1 - 0.55 * sm((t - LIFTED) / 0.9) : 1
  const prof = draped.map(([dy, w], i): Pt => [(dy + (hang[i][0] - dy) * pull) * gather, (w + (hang[i][1] - w) * pull) * (0.6 + 0.4 * gather)])
  const L = prof[prof.length - 1][0]
  const swing = t > LIFTED ? 0.09 * Math.exp(-(t - LIFTED) / 0.8) * Math.sin((t - LIFTED) * 6.5) : 0
  const lean = (dy: number) => swing * (dy / L) ** 2
  const cx = MODEL_X
  const right = prof.map(([dy, w]): Pt => [cx + w + lean(dy), Math.min(GROUND, peakY + dy)])
  const left = prof.map(([dy, w]): Pt => [cx - w + lean(dy), Math.min(GROUND, peakY + dy)]).reverse()
  const hemY = right[right.length - 1][1]
  const hr = right[right.length - 1][0]
  const hl = left[0][0]
  const hem: Pt[] = []
  const waves = 6
  for (let i = 1; i < waves; i++) {
    const f = i / waves
    hem.push([hr + (hl - hr) * f, hemY - (i % 2 ? 0.016 : 0) * (0.4 + 0.6 * pull)])
  }
  return [...right, ...hem, ...left]
}

/** The old tree's trunk and limb, the cords, the counterweight and the bell-pull; the sheet; the crown. */
export function drawRigBack(p: p5, c: Ctx, t: number): void {
  const { k, weight } = c
  const lw = weight * 0.7
  const bark = mixHex(CENTER.treeDark, INK, 0.35)
  p.push()
  // The counterweight, on its line down behind the trunk: let go, it drops, and the sheet goes up.
  const h = liftAt(t)
  const wy = WEIGHT.y0 + h
  const tx = TREE.x
  const hw = TREE.trunk / 2
  outline(p, Math.max(0.5, lw * 0.6), mixHex(INK, CENTER.brass, 0.4))
  p.line(WEIGHT.x * k, (BRANCH_Y + 0.12) * k, WEIGHT.x * k, (wy - 0.11) * k)
  inked(p, lw, CENTER.brass)
  box(p, k, WEIGHT.x - 0.06, wy - 0.11, WEIGHT.x + 0.06, wy + 0.11)
  // The trunk, and its limb out over the model.
  inked(p, lw, bark)
  poly(p, k, [
    [tx - hw, GROUND],
    [tx - hw * 0.7, TREE.fork],
    [tx - hw * 0.2, BRANCH_Y - 0.5],
    [tx + hw * 0.6, BRANCH_Y - 0.5],
    [tx + hw * 0.75, TREE.fork],
    [tx + hw, GROUND],
  ])
  poly(p, k, [
    [tx - hw * 0.6, TREE.fork + 0.05],
    [MODEL_X - 0.4, BRANCH_Y + 0.02],
    [MODEL_X - 0.45, BRANCH_Y - 0.08],
    [tx - hw * 0.4, TREE.fork - 0.18],
  ])
  // The bell-pull: its cord down the trunk to a brass tassel; bumped, it swings, and the latch lifts it clear.
  const since = t - BUMP
  const swing = since > 0 ? -0.16 * Math.exp(-since / 0.9) * Math.sin(since * 5.2) : 0
  const up = since > 0 ? sm((since - 0.05) / 0.4) * 0.72 : 0
  const bottom: Pt = [PULL_X + swing, -0.02 - up]
  outline(p, Math.max(0.6, lw * 0.7), CENTER.brass)
  p.noFill()
  p.beginShape()
  p.vertex((TREE.x + hw * 0.55) * k, (BRANCH_Y + 0.25) * k)
  p.quadraticVertex((PULL_X + swing * 0.3) * k, ((BRANCH_Y + bottom[1]) / 2) * k, bottom[0] * k, (bottom[1] - 0.06) * k)
  p.endShape()
  inked(p, lw * 0.8, CENTER.brass)
  poly(p, k, [
    [bottom[0] - 0.02, bottom[1] - 0.08],
    [bottom[0] + 0.02, bottom[1] - 0.08],
    [bottom[0] + 0.04, bottom[1] + 0.04],
    [bottom[0] - 0.04, bottom[1] + 0.04],
  ])
  p.pop()
}

/** The sheet, and its cord up to the limb. */
export function drawSheet(p: p5, c: Ctx, t: number): void {
  const { k, weight } = c
  const h = liftAt(t)
  const pts = sheetShape(h, t)
  const lw = Math.min(weight * 0.6, Math.max(0.4, k * 0.004))
  p.push()
  outline(p, Math.max(0.5, lw * 0.8), mixHex(INK, CENTER.brass, 0.4))
  p.line((MODEL_X + (pts[0][0] - MODEL_X)) * k, (pts[0][1] + 0.01) * k, MODEL_X * k, (BRANCH_Y + 0.04) * k)
  inked(p, lw, CENTER.sheet)
  p.beginShape()
  p.curveVertex(pts[0][0] * k, pts[0][1] * k)
  for (const [x, y] of pts) p.curveVertex(x * k, y * k)
  p.curveVertex(pts[pts.length - 1][0] * k, pts[pts.length - 1][1] * k)
  p.endShape(p.CLOSE)
  // Its folds, from the peak toward the hem.
  outline(p, lw * 0.6, mixHex(CENTER.sheet, CENTER.stoneShade, 0.75))
  const hemR = pts[5]
  const peak = pts[0]
  for (const f of [-0.5, 0.05, 0.55]) {
    const x = MODEL_X + f * (hemR[0] - MODEL_X)
    p.line((peak[0] + f * 0.02) * k, (peak[1] + 0.06) * k, x * k, (hemR[1] - 0.04) * k)
  }
  p.pop()
}

/** The old tree's crown. */
export function drawRigCrown(p: p5, c: Ctx, t: number): void {
  const sway = Math.sin(t * 0.8 + 0.4) * 0.05 + Math.sin(t * 0.31) * 0.04
  drawTree(p, c.k, { x: MODEL_X + 0.3, y: GROUND - 1.25, h: 4.1, w: 3.0, seed: 11, lw: c.weight * 0.7, sway, crownOnly: true })
}

/* ------------------------------------------------------------------ the pump */

/** The foot pump, and its hose along the path to the model's foot, swelling where the air is. */
export function drawPump(p: p5, c: Ctx, t: number): void {
  if (t >= PUMP_GONE) return
  const { k, weight } = c
  const lw = weight * 0.85
  const press = pedalAt(t)
  const a = pedalAngle(press)
  const hx = PUMP.hingeX
  const hy = PUMP.base
  const end: Pt = [hx + PUMP.len * Math.cos(a), hy - PUMP.len * Math.sin(a)]
  p.push()
  // The hose: a tube along the path, a bulge running down it on each stomp.
  const from: Pt = [PUMP.x1 + 0.04, GROUND - 0.075]
  const to: Pt = [MODEL.x0 - 0.02, GROUND - 0.075]
  const n = 36
  const pts: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const f = i / n
    pts.push([from[0] + (to[0] - from[0]) * f, from[1] + (to[1] - from[1]) * f + 0.012 * Math.sin(f * Math.PI) - 0.006 * Math.sin(f * Math.PI * 3)])
  }
  const bulge = (f: number) => {
    let b = 0
    for (const [s, a] of [[TAP, 0.45], ...STOMPS.map((x) => [x, 1])]) {
      const q = (t - s) / AIR
      if (q < -0.2 || q > 1.6) continue
      b += a * Math.exp(-(((f - q) / 0.14) ** 2)) * (q > 1 ? Math.max(0, 1 - (q - 1) / 0.6) : 1)
    }
    return b
  }
  const tube = 0.02
  p.strokeCap(p.ROUND)
  for (const pass of [0, 1]) {
    for (let i = 0; i < n; i++) {
      const f = (i + 0.5) / n
      const w = (tube + 0.026 * bulge(f)) * k
      p.stroke(pass === 0 ? INK : HOSE)
      p.strokeWeight(pass === 0 ? w + 2 * Math.min(lw * 0.45, tube * k * 0.25) : w)
      p.line(pts[i][0] * k, pts[i][1] * k, pts[i + 1][0] * k, pts[i + 1][1] * k)
    }
  }
  // The brass unions at both ends.
  inked(p, lw * 0.7, CENTER.brass)
  box(p, k, from[0] - 0.05, from[1] - 0.028, from[0] + 0.02, from[1] + 0.028)
  box(p, k, to[0] - 0.02, to[1] - 0.03, to[0] + 0.035, to[1] + 0.03)
  // The bellows: leather between the base and the pedal, folded.
  inked(p, lw, LEATHER)
  const lip = 0.035
  const pleats = 5
  const edge: Pt[] = []
  for (let i = 0; i <= pleats * 2; i++) {
    const f = i / (pleats * 2)
    const ang = a * (1 - f)
    const r = PUMP.len - 0.05 + (i % 2 ? -lip : 0)
    edge.push([hx + r * Math.cos(ang), hy - r * Math.sin(ang) - 0.005])
  }
  poly(p, k, [[hx, hy], ...edge.reverse()])
  outline(p, lw * 0.5, mixHex(LEATHER, INK, 0.4))
  for (let i = 1; i < pleats; i++) {
    const ang = (a * i) / pleats
    p.line(hx * k, hy * k, (hx + (PUMP.len - 0.05 - lip) * Math.cos(ang)) * k, (hy - (PUMP.len - 0.05 - lip) * Math.sin(ang)) * k)
  }
  // The base board, and the pedal on its hinge.
  inked(p, lw, WOOD)
  box(p, k, PUMP.x0, PUMP.base, PUMP.x1, GROUND)
  const n0: Pt = [-Math.sin(a) * PUMP.board, -Math.cos(a) * PUMP.board]
  poly(p, k, [
    [hx, hy],
    end,
    [end[0] + n0[0], end[1] + n0[1]],
    [hx + n0[0], hy + n0[1]],
  ])
  // The brass tread where a foot goes.
  const t0 = onPedal(press, 0.16)
  const t1 = onPedal(press, 0.58)
  const t2 = onPedal(press, 0.58, 0.022)
  const t3 = onPedal(press, 0.16, 0.022)
  inked(p, lw * 0.6, CENTER.brass)
  poly(p, k, [t0, t1, t2, t3])
  inked(p, lw * 0.7, CENTER.brass)
  p.circle(hx * k, hy * k, 0.05 * k)
  p.pop()
}

/* ------------------------------------------------------------------ the lamps */

/** A lamp on the path: a slim post, a lantern on it, lit `on` 0..1: its glass, its glow and its pool on the path. */
export function drawLamp(p: p5, c: Ctx, x: number, on: number): void {
  const { k, weight } = c
  const lw = weight * 0.7
  const top = GROUND - LAMP_H
  const post = mixHex(INK, CENTER.roof, 0.3)
  p.push()
  if (on > 0.01) pool(p, k, [x, GROUND + 0.03], 1.7, 0.18, LIT, 0.5 * on)
  inked(p, lw, post)
  box(p, k, x - 0.1, GROUND - 0.28, x + 0.1, GROUND)
  box(p, k, x - 0.035, top + 0.02, x + 0.035, GROUND - 0.28)
  // The lantern: a little glazed box, its cap and finial.
  inked(p, lw, mixHex(dk(CENTER.glass, 0.62), LIT, on))
  poly(p, k, [
    [x - 0.12, top - 0.36],
    [x + 0.12, top - 0.36],
    [x + 0.09, top],
    [x - 0.09, top],
  ])
  inked(p, lw, post)
  poly(p, k, [
    [x - 0.17, top - 0.36],
    [x, top - 0.52],
    [x + 0.17, top - 0.36],
  ])
  box(p, k, x - 0.1, top - 0.02, x + 0.1, top + 0.04)
  p.pop()
  if (on > 0.01) {
    bloom(p, k, [x, top - 0.18], 1.4, LIT, 0.42 * on)
    bloom(p, k, [x, top - 0.18], 0.36, mixHex(LIT, CENTER.cloud, 0.5), 0.6 * on)
  }
}

/* ------------------------------------------------------------------ the press */

/** One of the press, `i`: where he stands (in the lawn before the path, nearer us than the path), how big, his head, his camera. */
function pressman(i: number, t: number) {
  const up = cameraUp(t)
  const heave = level(t) * 0.02
  const s = PRESS_SCALE * [1.0, 0.95, 1.05][i]
  const walk = pressWalk(i, t)
  const x = PRESS[i] + walk
  const foot = PRESS_FOOT + [0, 0.12, 0.04][i]
  // Hurrying off, a trot.
  const trot = walk > 0 ? Math.abs(Math.sin(walk * 2.4 + i)) * 0.07 * s : 0
  const bob = Math.sin(t * 2.1 + i * 1.7) * heave - trot
  const headY = foot - 1.3 * s + bob
  const lean = walk > 0 ? Math.min(1, walk / 0.8) * 0.08 * s : 0
  const hx = x + 0.02 * s + lean
  const cy = headY + (0.5 * (1 - up) + 0.02) * s
  const cx = hx - (0.2 + 0.06 * up) * s
  return { x, foot, s, headY, hx, cx, cy, lean, flash: [cx - 0.01 * s, cy - 0.31 * s] as Pt }
}

/**
 * The press at the opening: three of them in the lawn before the path, one dark mass rimmed on its lit side (bare
 * heads: a quiff, a bob, a cap), cameras coming up for the picture; then, their pictures taken, off at a trot.
 */
export function drawPress(p: p5, c: Ctx, t: number): void {
  const { k } = c
  const shapes = (ox: number, oy: number) => {
    PRESS.forEach((_, i) => {
      const { x: x0, foot: f0, s, headY: h0, hx: hx0, cx: cx0, cy: cy0, lean } = pressman(i, t)
      const x = x0 + (pressWalk(i, t) > 0.02 ? -ox : ox)
      const foot = f0 + oy
      const headY = h0 + oy
      const hx = hx0 + (x - x0)
      const cx = cx0 + (x - x0)
      const cy = cy0 + oy
      const S = (v: number) => v * s
      // Going, each turns his back on the door and faces the way he goes.
      const going = pressWalk(i, t) > 0.02
      p.push()
      if (going) {
        p.translate(x * k, 0)
        p.scale(-1, 1)
        p.translate(-x * k, 0)
      }
      // Legs (a stride when they go), a coat, shoulders, the head.
      const stride = pressWalk(i, t) > 0 ? Math.sin(pressWalk(i, t) * 2.4 + i) * S(0.1) : 0
      box(p, k, x - S(0.14) + stride, foot - S(0.42), x - S(0.03) + stride, foot)
      box(p, k, x + S(0.03) - stride, foot - S(0.42), x + S(0.14) - stride, foot)
      poly(p, k, [
        [x - S(0.24), foot - S(0.36)],
        [x - S(0.2) + lean, headY + S(0.28)],
        [x + S(0.2) + lean, headY + S(0.28)],
        [x + S(0.25), foot - S(0.36)],
      ])
      p.ellipse((x + lean) * k, (headY + S(0.3)) * k, S(0.46) * k, S(0.16) * k)
      p.ellipse(hx * k, headY * k, S(0.24) * k, S(0.28) * k)
      if (i === 0) {
        // A cap, its peak forward.
        p.arc(hx * k, (headY - S(0.04)) * k, S(0.27) * k, S(0.26) * k, Math.PI, Math.PI * 2, p.CHORD)
        poly(p, k, [
          [hx - S(0.02), headY - S(0.05)],
          [hx - S(0.21), headY - S(0.03)],
          [hx - S(0.02), headY - S(0.01)],
        ])
      } else if (i === 1) {
        // A bob, cut at the jaw.
        box(p, k, hx - S(0.1), headY - S(0.1), hx + S(0.15), headY + S(0.1))
        p.ellipse((hx + S(0.02)) * k, (headY - S(0.05)) * k, S(0.3) * k, S(0.24) * k)
      } else {
        // A quiff.
        p.ellipse((hx - S(0.05)) * k, (headY - S(0.14)) * k, S(0.2) * k, S(0.1) * k)
      }
      // The camera, held at the chest and coming up to the face, facing the door; its flash on a bracket.
      p.quad((x - S(0.12) + lean) * k, (headY + S(0.36)) * k, (x + S(0.12) + lean) * k, (headY + S(0.36)) * k, (cx + S(0.08)) * k, (cy + S(0.07)) * k, (cx - S(0.02)) * k, (cy + S(0.1)) * k)
      box(p, k, cx - S(0.16), cy - S(0.08), cx + S(0.1), cy + S(0.08))
      box(p, k, cx - S(0.24), cy - S(0.04), cx - S(0.14), cy + S(0.05))
      box(p, k, cx - S(0.02), cy - S(0.28), cx + S(0.02), cy - S(0.08))
      box(p, k, cx - S(0.09), cy - S(0.36), cx + S(0.07), cy - S(0.26))
      p.pop()
    })
  }
  p.push()
  p.noStroke()
  // The rim: the light from the left (the day's sun; at dusk the glow of the doors and the horizon).
  p.fill(rgba(PRESS_RIM, 0.75))
  shapes(-0.035, -0.02)
  p.fill(PRESS_DARK)
  shapes(0, 0)
  p.pop()
}

/** Where each press camera's flash is at `t`. */
export const flashHeads = (t: number): Pt[] => PRESS.map((_, i) => pressman(i, t).flash)

/* ------------------------------------------------------------------ over everything */

/** The air: stone dust puffing from the foot of each jump, and out of the doors; the last photograph. */
export function drawOver(p: p5, c: Ctx, t: number): void {
  const { k } = c
  drawPress(p, c, t)
  GROWS.forEach((g, i) => {
    const u = t - g
    if (u < 0 || u > 1.6) return
    const S = Math.pow(3, i + 1)
    const f = S / FULL
    const a = 0.42 * Math.exp(-u / 0.4) * sm(u / 0.05)
    for (const [X, dir] of [
      [0.2, -1],
      [D.W - 0.2, 1],
      [6.75, 0],
    ] as [number, number][]) {
      const x = MODEL.x0 + X * f + dir * u * 1.4 * f * 3
      const r = (0.9 + 2.2 * u) * f * 3
      bloom(p, k, [x, GROUND - r * 0.35], r, mixHex(CENTER.cloud, CENTER.path, 0.4), a * (dir === 0 ? 0.6 : 1))
    }
  })
  const ut = t - TAP - AIR
  if (ut > 0 && ut < 1.2) {
    for (const dir of [-1, 0, 1]) {
      const x = MODEL.x0 + MODEL.w * (dir + 1) * 0.5 + dir * ut * 0.2
      bloom(p, k, [x, GROUND - 0.05 - ut * 0.12], 0.13 + 0.38 * ut, mixHex(CENTER.cloud, CENTER.path, 0.3), (dir === 0 ? 0.55 : 0.8) * Math.exp(-ut / 0.45) * sm(ut / 0.05))
    }
  }
  const u = t - DOORS
  if (u > 0 && u < 2) {
    const [dx] = [MODEL.x0 + ((D.door.x0 + D.door.x1) / 2)]
    bloom(p, k, [dx + u * 0.3, GROUND - D.plinth - 1.1 + 0.1 * u], 1.2 + 1.4 * u, CENTER.cloud, 0.35 * Math.exp(-u / 0.5) * sm(u / 0.06))
  }
  // The last photograph: the press fire, and they give the look; then two more, smaller, as it fades.
  const since = t - PHOTO
  if (since > -0.01 && since < 1.3) {
    flashHeads(t).forEach((at, i) => flashBurst(p, k, at, since, i === 0 ? 1.7 : 1.15))
    glint(p, k, [DEREK_END[0] + 0.09, DEREK_END[1] - 0.09], since, 0.45)
    glint(p, k, [HANSEL_END[0] + 0.09, HANSEL_END[1] - 0.09], since, 0.45)
  }
  // The lit windows: a little of their light out on the stone, and the glass and its bar before the kids at them.
  if (t > 230) {
    D.windows.forEach((wx, i) => {
      const lit = litAt(i, t)
      if (lit <= 0) return
      const x = MODEL.x0 + wx
      const { w, y0, y1 } = D.window
      bloom(p, k, [x, GROUND - (y0 + y1) / 2], 1.5, LIT, 0.1 * lit)
      if (!WINDOW_KIDS.some((q) => q.window === i)) return
      p.push()
      p.noStroke()
      p.fill(rgba(LIT, 0.2 * lit))
      box(p, k, x - w / 2, GROUND - y0 - 0.26, x + w / 2, GROUND - y0)
      outline(p, buildingWeight(c, FULL) * 0.55, mixHex(INK, CENTER.stone, 0.35))
      p.line(x * k, (GROUND - y0 - 0.3) * k, x * k, (GROUND - y0) * k)
      inked(p, buildingWeight(c, FULL), dk(CENTER.stoneShade, 0.46))
      box(p, k, x - w / 2 - 0.1, GROUND - y0, x + w / 2 + 0.1, GROUND - y0 + 0.1)
      p.pop()
    })
  }
  TAIL_FLASHES.forEach((at, j) => {
    const u = t - at
    if (u > -0.01 && u < 1.3) flashBurst(p, k, flashHeads(t)[TAIL_BY[j]], u, j === 0 ? 0.8 : 0.6)
  })
}

