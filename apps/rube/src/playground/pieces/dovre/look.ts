import type p5 from 'p5'
import { outline, solid } from '../../../../../../src/core/draw'
import type { Theme } from '../../../../../../src/core/themes'
import { FLOOR, mixHex, type Pt } from '../../../parts'

/**
 * What the troll mountain is made of, and who lives in it.
 *
 * Three materials and one people. **Stone** is the paper darkened toward
 * the ink, never a palette colour, so the palette is kept for the things
 * that matter. **Timber** is the gold darkened: pit props, planks, the
 * trolls' crude joinery, held with **iron** that is plain ink. On anything
 * a troll is proud of (a door, a cart, a tankard) there is **rosemaling**,
 * the painted tulip and scrolls of a Norwegian farmhouse, small.
 *
 * And the **trolls**: round mossy lumps with a long drooping nose, two
 * small eyes close together above it, and a tuft on top. Asleep, the eyes
 * are two lids. Every troll in the world is drawn by `troll()`, whether it
 * is buried to the nose, sitting up behind the line, or a ball in a Show,
 * so they are one people. `stone` turns one to stone, as daylight does.
 */

/* ------------------------------------------------------------------ colours, by role */

const hue = (hex: string): number => {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  if (d < 0.08) return -1
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return (h * 60 + 360) % 360
}
const luma = (hex: string) => 0.2126 * parseInt(hex.slice(1, 3), 16) + 0.7152 * parseInt(hex.slice(3, 5), 16) + 0.0722 * parseInt(hex.slice(5, 7), 16)
const nearest = (theme: Theme, target: number): string => {
  const off = (hex: string) => {
    const h = hue(hex)
    if (h < 0) return 999
    const d = Math.abs(h - target)
    return Math.min(d, 360 - d)
  }
  return [...theme.colors].sort((a, b) => off(a) - off(b))[0]
}

/** Moss: the palette's green. What a troll is covered in. */
export const moss = (theme: Theme): string => nearest(theme, 105)
/** The painted red of rosemaling, and of a troll's nose. */
export const red = (theme: Theme): string => nearest(theme, 8)
/** Lamplight, and troll gold. */
export const gold = (theme: Theme): string => nearest(theme, 42)
/** Water and cold iron-blue. */
export const fjord = (theme: Theme): string => nearest(theme, 195)
/** Birch bark, bone, candle wax: the palette's lightest. */
export const pale = (theme: Theme): string => [...theme.colors].sort((a, b) => luma(b) - luma(a))[0]

/** Stone: the paper, darkened toward the ink. The mountain itself, and a troll the sun has caught. */
export const stone = (theme: Theme): string => mixHex(theme.bg, theme.ink, 0.2)
/** The shadowed face of stone, and the inside of a hole. */
export const rockShade = (theme: Theme): string => mixHex(theme.bg, theme.ink, 0.36)
/** Timber: the gold, darkened. Props, planks, handles, barrels. */
export const wood = (theme: Theme): string => mixHex(gold(theme), theme.ink, 0.3)
/** A troll's nose: its own moss, gone ruddy. */
export const nose = (theme: Theme, body = moss(theme)): string => mixHex(body, red(theme), 0.42)

/* ------------------------------------------------------------------ the mountain */

/** The gallery floor from x0 to x1: the rail's own line. */
export function floor(p: p5, k: number, ink: string, weight: number, x0: number, x1: number, y = FLOOR): void {
  outline(p, ink, weight)
  p.line(x0 * k, y * k, x1 * k, y * k)
}

/** A pit prop: a squared timber post from under the floor to the ground, a cap block under the floor and a wedge at the foot. */
export function prop(p: p5, k: number, ink: string, weight: number, fill: string, x: number, y0 = FLOOR, y1 = 0.5): void {
  const w = 0.075
  solid(p, ink, weight * 0.85, fill)
  p.rect(x * k, ((y0 + y1) / 2) * k, w * k, (y1 - y0) * k)
  p.rect(x * k, (y0 + 0.03) * k, (w + 0.08) * k, 0.06 * k)
  outline(p, ink, weight * 0.85)
  p.line((x - w / 2 - 0.05) * k, y1 * k, (x + w / 2 + 0.05) * k, y1 * k)
}

/** A plank from x0 to x1 at y, `t` thick, with its end grain showing. */
export function plank(p: p5, k: number, ink: string, weight: number, fill: string, x0: number, x1: number, y: number, t = 0.07): void {
  solid(p, ink, weight * 0.85, fill)
  p.rect(((x0 + x1) / 2) * k, (y + t / 2) * k, (x1 - x0) * k, t * k, 0.012 * k)
}

/** A cheap stable hash, so a rock is the same rock every frame. */
const hash = (a: number, b: number): number => {
  let h = (a * 374761393 + b * 668265263) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/**
 * A lumpy rounded mass: a boulder, a troll's back, a heap of moss. `seed`
 * picks the lumps; `flat` squares off the bottom (0 round, 1 flat on the
 * ground). Drawn as one smooth closed outline.
 */
export function boulder(p: p5, k: number, ink: string, weight: number, fill: string, cx: number, cy: number, rx: number, ry: number, seed = 0, flat = 0): void {
  const n = 9
  const pts: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2
    const j = 1 + (hash(seed, i) - 0.5) * 0.16
    let x = Math.cos(a) * rx * j
    let y = Math.sin(a) * ry * j
    if (flat > 0 && y > 0) y *= 1 - flat * 0.35
    pts.push([cx + x, cy + y])
  }
  solid(p, ink, weight, fill)
  p.beginShape()
  for (let i = 0; i < n + 3; i++) {
    const [x, y] = pts[i % n]
    p.curveVertex(x * k, y * k)
  }
  p.endShape()
}

/** Two short chisel strokes on stone: a crack, the mark of a stone thing. */
export function crack(p: p5, k: number, ink: string, weight: number, x: number, y: number, size: number, seed = 0): void {
  outline(p, ink, weight * 0.6)
  const a = (hash(seed, 7) - 0.5) * 1.2
  const x1 = x + Math.cos(a) * size
  const y1 = y + Math.sin(a) * size
  p.line(x * k, y * k, x1 * k, y1 * k)
  p.line(x1 * k, y1 * k, (x1 + size * 0.5) * k, (y1 + size * 0.45) * k)
}

/**
 * Rosemaling: a tulip on two scrolls, the painted flower of a Norwegian
 * farmhouse, `size` cells tall, standing on (x, y). Drawn on troll-made
 * wood: a door, a cart's side, a tankard.
 */
export function rosette(p: p5, k: number, ink: string, weight: number, petal: string, leaf: string, x: number, y: number, size: number): void {
  const s = size
  const w = Math.max(0.6, weight * 0.55)
  // Two C-scrolls for leaves, curling out from the foot.
  outline(p, leaf, w * 1.6)
  p.noFill()
  p.arc((x - s * 0.22) * k, (y - s * 0.18) * k, s * 0.4 * k, s * 0.34 * k, Math.PI * 0.1, Math.PI * 1.25)
  p.arc((x + s * 0.22) * k, (y - s * 0.18) * k, s * 0.4 * k, s * 0.34 * k, -Math.PI * 0.25, Math.PI * 0.9)
  // The tulip: three petals.
  p.stroke(ink)
  p.strokeWeight(w)
  p.fill(petal)
  p.beginShape()
  p.vertex(x * k, (y - s * 0.28) * k)
  p.bezierVertex((x - s * 0.34) * k, (y - s * 0.34) * k, (x - s * 0.3) * k, (y - s * 0.9) * k, (x - s * 0.14) * k, (y - s * 0.98) * k)
  p.bezierVertex((x - s * 0.08) * k, (y - s * 0.78) * k, (x + s * 0.08) * k, (y - s * 0.78) * k, (x + s * 0.14) * k, (y - s * 0.98) * k)
  p.bezierVertex((x + s * 0.3) * k, (y - s * 0.9) * k, (x + s * 0.34) * k, (y - s * 0.34) * k, x * k, (y - s * 0.28) * k)
  p.endShape(p.CLOSE)
  p.line(x * k, (y - s * 0.28) * k, x * k, y * k)
}

/** A miner's lamp hung from a nail: a hook, a little cage, lamplight in the glass. */
export function lamp(p: p5, k: number, ink: string, weight: number, glow: string, x: number, y: number, flicker = 0): void {
  outline(p, ink, weight * 0.8)
  p.line(x * k, (y - 0.12) * k, x * k, (y - 0.05) * k)
  const halo = p.color(glow)
  halo.setAlpha(40 + 18 * flicker)
  p.noStroke()
  p.fill(halo)
  p.circle(x * k, (y + 0.05) * k, 0.3 * k)
  solid(p, ink, weight * 0.8, glow)
  p.rect(x * k, (y + 0.05) * k, 0.08 * k, 0.1 * k, 0.02 * k)
  outline(p, ink, weight * 0.8)
  p.line((x - 0.06) * k, (y - 0.01) * k, (x + 0.06) * k, (y - 0.01) * k)
  p.line((x - 0.06) * k, (y + 0.11) * k, (x + 0.06) * k, (y + 0.11) * k)
}

/* ------------------------------------------------------------------ the trolls */

export interface TrollLook {
  /** The middle of the body, in cells. */
  x: number
  y: number
  /** The body's radius, in cells. A ball is `R`; a troll behind the line is two or three of those. */
  r: number
  /** Which way the nose points. */
  facing: 1 | -1
  /** 0 asleep (two lids), 1 wide awake. In between, a squint. */
  open: number
  /** Where the pupils look, as a direction; [0, 0] straight ahead. */
  look?: [number, number]
  /** 0 a troll, 1 a stone: the sun has caught it. */
  stone?: number
  /** The hair on top. Leave it off for a head that is all there is to see of a troll. */
  tuft?: boolean
  /** A crown, in this colour: the King. */
  crown?: string
  /** The body's fill. Moss when left out. */
  fill?: string
  /** A frown (1), or worried brows (-1); none at 0. */
  brow?: number
  /** How far the body squashes on a landing: 0 round, 0.3 a good thump. */
  squash?: number
  /** Leave the body undrawn, and put only the face (and tuft, crown) on a round shape drawn elsewhere. */
  faceOnly?: boolean
}

/**
 * A troll. A round mossy body; a long nose drooping forward from the middle
 * of the face; two small eyes above it, close together; a tuft of hair.
 * Everything is in proportion to `r`, so the same troll reads as a pebble
 * or a hillside.
 */
export function troll(p: p5, k: number, ink: string, weight: number, theme: Theme, t: TrollLook): void {
  const { x, y, r, facing } = t
  const st = Math.max(0, Math.min(1, t.stone ?? 0))
  const grey = stone(theme)
  const body = mixHex(t.fill ?? moss(theme), grey, st)
  const snout = mixHex(nose(theme, t.fill ?? moss(theme)), grey, st)
  const sq = t.squash ?? 0
  const w = weight * Math.min(1.25, 0.7 + r * 1.6)
  p.push()
  p.translate(x * k, y * k)
  p.scale(facing, 1)

  if (!t.faceOnly) {
    solid(p, ink, w, body)
    p.ellipse(0, (sq * r * 0.35) * k, 2 * r * (1 + sq * 0.35) * k, 2 * r * (1 - sq * 0.35) * k)
  }

  // The tuft: three strokes of hair or moss from the crown, swept back.
  if (t.tuft !== false && !t.crown) {
    outline(p, ink, w)
    const top = -r * (1 - sq * 0.35)
    for (const [dx, lean, h] of [[-0.18, -0.5, 0.34], [0, -0.25, 0.42], [0.16, -0.05, 0.3]] as const) {
      const bx = dx * r
      const by = top + Math.abs(dx) * r * 0.25
      p.noFill()
      p.bezier(bx * k, by * k, bx * k, (by - h * r * 0.6) * k, (bx + lean * r * 0.5) * k, (by - h * r) * k, (bx + lean * r * 0.8) * k, (by - h * r * 1.05) * k)
    }
  }
  if (t.crown) {
    // A crown of three points, set a little back on the head.
    const top = -r * (1 - sq * 0.35)
    const cw = r * 0.95
    const ch = r * 0.55
    solid(p, ink, w, mixHex(t.crown, grey, st))
    p.beginShape()
    p.vertex((-cw / 2 - r * 0.06) * k, (top + ch * 0.35) * k)
    p.vertex((-cw / 2) * k, (top - ch * 0.7) * k)
    p.vertex((-cw / 4) * k, (top - ch * 0.15) * k)
    p.vertex(0, (top - ch) * k)
    p.vertex((cw / 4) * k, (top - ch * 0.15) * k)
    p.vertex((cw / 2) * k, (top - ch * 0.7) * k)
    p.vertex((cw / 2 + r * 0.06) * k, (top + ch * 0.35) * k)
    p.endShape(p.CLOSE)
  }

  // The eyes, close together over the bridge of the nose.
  const open = st > 0.5 ? 0 : Math.max(0, Math.min(1, t.open))
  const er = r * 0.15
  const eyes: [number, number][] = [
    [r * 0.08, -r * 0.3],
    [r * 0.42, -r * 0.3],
  ]
  const [lx, ly] = t.look ?? [0, 0]
  const ll = Math.hypot(lx, ly) || 1
  for (const [ex, ey] of eyes) {
    if (open < 0.08) {
      // Asleep: a lid, curved down.
      outline(p, ink, w * 0.9)
      p.arc(ex * k, (ey - er * 0.2) * k, er * 2.1 * k, er * 1.5 * k, Math.PI * 0.1, Math.PI * 0.9)
      continue
    }
    solid(p, ink, w * 0.8, mixHex(pale(theme), grey, st))
    p.ellipse(ex * k, ey * k, er * 2 * k, er * 2 * open * k)
    p.noStroke()
    p.fill(ink)
    const pr = er * 0.55 * Math.min(1, open * 1.3)
    const px = ex + (lx / ll) * er * 0.4 * Math.min(1, ll)
    const py = ey + (ly / ll) * er * 0.4 * Math.min(1, ll) * open
    p.circle(px * k, py * k, pr * 2 * k)
  }
  if (t.brow) {
    outline(p, ink, w)
    const b = t.brow
    for (const [ex, ey] of eyes) {
      const tilt = b * er * 0.7 * (ex < r * 0.25 ? -1 : 1)
      p.line((ex - er * 1.1) * k, (ey - er * 1.5 - tilt) * k, (ex + er * 1.1) * k, (ey - er * 1.5 + tilt) * k)
    }
  }

  // The nose: from the bridge between the eyes, long and drooping, to a bulb, with a nostril under it.
  solid(p, ink, w, snout)
  p.beginShape()
  p.vertex(r * 0.16 * k, -r * 0.16 * k)
  p.bezierVertex(r * 0.6 * k, -r * 0.16 * k, r * 0.98 * k, r * 0.08 * k, r * 1.04 * k, r * 0.42 * k)
  p.bezierVertex(r * 1.1 * k, r * 0.8 * k, r * 0.62 * k, r * 0.9 * k, r * 0.5 * k, r * 0.6 * k)
  p.bezierVertex(r * 0.44 * k, r * 0.42 * k, r * 0.32 * k, r * 0.28 * k, r * 0.16 * k, r * 0.26 * k)
  p.endShape(p.CLOSE)
  outline(p, ink, w * 0.7)
  p.arc(r * 0.8 * k, r * 0.66 * k, r * 0.2 * k, r * 0.12 * k, Math.PI * 1.1, Math.PI * 1.9)

  if (st > 0.02) {
    const a = p.color(ink)
    a.setAlpha(255 * st)
    p.stroke(a)
    p.strokeWeight(w * 0.6)
    p.noFill()
    p.line(-r * 0.55 * k, -r * 0.1 * k, -r * 0.3 * k, r * 0.2 * k)
    p.line(-r * 0.3 * k, r * 0.2 * k, -r * 0.4 * k, r * 0.45 * k)
  }
  p.pop()
}
