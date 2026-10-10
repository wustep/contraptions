import type p5 from 'p5'
import { mixHex, R, type Pt } from '../../../../parts'
import { alpha, hash } from './kit'
import { softBeam } from './valley/set-air'
import { FOG, SHELL, VALLEY } from './worlds'

/**
 * The canonical drawings of the show's recurring things (the director's): the shell, the heptapods, their ink, and
 * the lift's deck. Every part that shows one of these calls it from here, so the shell is one shell and a heptapod is
 * one heptapod everywhere. If one needs something it does not do, say so in your report; do not draw your own.
 *
 * Every function draws in cells about the origin the caller has translated to (`p.translate(x * k, y * k)`), with
 * `k` pixels a cell, and leaves p5's state as it found it. None of them draws text, dashed lines or hairline rings.
 * None is inked: the shell is a mass against the sky, the heptapods are shapes in fog, the ink is ink.
 */

const TAU = Math.PI * 2
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const smooth01 = (u: number) => {
  const v = clamp01(u)
  return v * v * (3 - 2 * v)
}

/* ------------------------------------------------------------------ the shell */

export interface ShellOpts {
  /** Show time: for the slow drift of its haze. */
  t: number
  /** Height in cells (150 over the meadow). Its width is `w` (0.42 of the height if unset). */
  h?: number
  w?: number
  /** The slot in its belly: 0 shut, 1 open (a dark slot `slotW` cells wide, its light spilling down). */
  slot?: number
  slotW?: number
  /** 0 solid .. 1 gone: it turns to vapour from its edges in and its top down, and the vapour drifts up. */
  vanish?: number
  /** 0 clear .. 1 lost in the cloud: how far the air between us and it pales it. */
  haze?: number
  /** The colour the air pales it toward (the sky's, by default). */
  air?: string
  /**
   * Optional (the valley builder's): whether it draws its own vapour puffs as it goes. Unset, it does; the valley's set
   * passes false and draws the vapour itself, soft, along the line where it thins.
   */
  puffs?: boolean
  /**
   * Optional: how it goes. 'crown' (unset: it thins from the top down, the part still there below a line) or 'fade'
   * (the whole of it pales into the air at once, no line anywhere: for a shell that rises into cloud, the cloud drawn
   * over its top by the caller).
   */
  goes?: 'crown' | 'fade'
}

/** How far the belly's oval is sunk below the belly's line and cut flat there: the keel the slot is in. */
export const KEEL = 0.45

/** The shell's half-width at `u` from its top (0) to its belly (1), as a share of its width: a stone stood on edge. */
export function shellHalf(u: number): number {
  const v = clamp01(u)
  // An upright oval, a little fuller in its lower half, round at the crown and at the belly: never a point.
  const q = Math.pow(v, 1.08)
  return 0.5 * Math.pow(Math.sin(Math.PI * q), 0.52) * (1 + 0.03 * Math.sin(TAU * q + 0.6))
}

/**
 * A soft puff of `hex` at (x, y) cells, `rx` by `ry`: dense at its middle and nothing at its edge, so puffs that
 * overlap make one cloud, never a cluster of discs.
 */
function softPuff(ctx: CanvasRenderingContext2D, k: number, x: number, y: number, rx: number, ry: number, hex: string, a: number): void {
  if (a <= 0.004 || rx * k < 0.5 || ry * k < 0.3) return
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  ctx.save()
  ctx.translate(x * k, y * k)
  ctx.scale(1, ry / rx)
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * k)
  grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${a})`)
  grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${a * 0.7})`)
  grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
  ctx.fillStyle = grad
  ctx.fillRect(-rx * k, -rx * k, 2 * rx * k, 2 * rx * k)
  ctx.restore()
}

/** Down the slot's spill: brightest at the mouth, gone 14 cells down. */
const spillAlong = (v: number): number => 1 - v

/**
 * The shell, hanging: its belly's lowest point at the origin, its top `h` cells up. A smooth dark stone of a thing,
 * lens-thin, its left edge catching the sky, faint strata across its face, and the slot in its belly when it opens.
 */
export function drawShell(p: p5, k: number, o: ShellOpts): void {
  const h = o.h ?? 150
  const w = o.w ?? h * 0.42
  const vanish = clamp01(o.vanish ?? 0)
  const haze = clamp01(o.haze ?? 0)
  const air = o.air ?? VALLEY.sky
  if (vanish >= 0.999) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const n = 140
  // The outline, from the top round the right side to the belly and back up the left.
  const pts: Pt[] = []
  // Sampled closer together toward its ends, where it turns fastest, so the crown and the belly are round, not cut.
  const at = (i: number) => (1 - Math.cos((Math.PI * i) / n)) / 2
  // Its underside is a shallow flat keel where the slot is: the oval sunk KEEL cells and cut flat at the belly's line,
  // so the slot is a clean mouth in a flat patch (about six cells across), not a box on a round bottom.
  for (let i = 0; i <= n; i++) {
    const u = at(i)
    pts.push([shellHalf(u) * w, Math.min(0, -h + u * h + KEEL)])
  }
  for (let i = n; i >= 0; i--) {
    const u = at(i)
    pts.push([-shellHalf(u) * w, Math.min(0, -h + u * h + KEEL)])
  }
  // As it goes, it thins from the top down: the part still there is below `keep`.
  const keep = vanish <= 0 || o.goes === 'fade' ? -h - 1 : -h + h * smooth01(vanish * 1.15)
  const body = mixHex(VALLEY.shell, air, haze * 0.85)
  const bodyDark = mixHex(VALLEY.shellDark, air, haze * 0.8)
  const rim = mixHex(VALLEY.shellLight, air, haze * 0.7)
  const fade = o.goes === 'fade' ? 1 - smooth01(vanish) : 1 - smooth01((vanish - 0.35) / 0.65)
  ctx.save()
  ctx.globalAlpha *= fade
  // The body: lighter where the sky is on it (top and left), darkest at the belly.
  const g = ctx.createLinearGradient(-w * 0.5 * k, -h * k, w * 0.35 * k, 0)
  g.addColorStop(0, rim)
  g.addColorStop(0.35, body)
  g.addColorStop(1, bodyDark)
  ctx.fillStyle = g
  const hull = new Path2D()
  pts.forEach(([x, y], i) => (i ? hull.lineTo(x * k, Math.max(y, keep) * k) : hull.moveTo(x * k, Math.max(y, keep) * k)))
  hull.closePath()
  ctx.fill(hull)
  // The rim light down its left edge, soft.
  ctx.save()
  ctx.clip(hull)
  const rl = ctx.createLinearGradient(-w * 0.5 * k, 0, -w * 0.3 * k, 0)
  rl.addColorStop(0, mixHex(VALLEY.shellLight, air, 0.25 + haze * 0.5))
  rl.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.globalAlpha *= 0.55
  ctx.fillStyle = rl
  ctx.fillRect(-w * 0.55 * k, -h * k, w * 0.3 * k, h * k)
  ctx.globalAlpha /= 0.55
  // Its grain: a few broad, soft, uneven bands of shade across its face, never lines.
  const bands = 6
  for (let b = 0; b < bands; b++) {
    const y = -h * (0.14 + 0.76 * (b / bands) + 0.06 * (hash(b, 3, 11) - 0.5))
    const bh = h * (0.035 + 0.03 * hash(b, 5, 11))
    const sg = ctx.createLinearGradient(0, y * k, 0, (y + bh) * k)
    const a = (b % 2 ? 0.018 : 0.035) * (1 - haze)
    const tone = b % 2 ? '255,255,255' : '0,0,0'
    sg.addColorStop(0, `rgba(${tone},0)`)
    sg.addColorStop(0.5, `rgba(${tone},${a})`)
    sg.addColorStop(1, `rgba(${tone},0)`)
    ctx.fillStyle = sg
    ctx.fillRect(-w * 0.6 * k, y * k, w * 1.2 * k, bh * k)
  }
  ctx.restore()
  // The slot: a dark mouth in the belly, its light spilling down in a soft fall.
  const slot = clamp01(o.slot ?? 0)
  if (slot > 0.001 && vanish < 0.3) {
    const sw = (o.slotW ?? 2.6) * slot
    const sd = 0.9
    // Soft across, as the valley's own fall of light under it is: never a pane with straight sides.
    softBeam(ctx, k, [0, 0], [0, 14], sw * 1.3, sw * 3.8, '243, 241, 230', 0.45 * slot * (1 - haze), 'spill', spillAlong, true)
    // The mouth itself is cut into the hull: clipped to its outline, so nothing of it hangs below the round belly.
    ctx.save()
    ctx.clip(hull)
    ctx.fillStyle = mixHex(VALLEY.slot, air, haze * 0.6)
    ctx.fillRect(-sw * 0.5 * k, -sd * k, sw * k, (sd + 0.05) * k)
    // The light caught on its far lip: a soft band, not a bar with edges.
    const lip = 0.5 * slot * (1 - haze)
    const lg = ctx.createLinearGradient(0, -sd * 0.6 * k, 0, -sd * 0.02 * k)
    lg.addColorStop(0, 'rgba(243,241,230,0)')
    lg.addColorStop(0.55, `rgba(243,241,230,${lip})`)
    lg.addColorStop(1, 'rgba(243,241,230,0)')
    ctx.fillStyle = lg
    ctx.fillRect(-sw * 0.5 * k, -sd * 0.6 * k, sw * k, sd * 0.58 * k)
    ctx.restore()
  }
  ctx.restore()
  // The vapour it goes to: soft puffs peeling off its edges and rising.
  if (vanish > 0.02 && o.puffs !== false) {
    const puffs = 42
    for (let i = 0; i < puffs; i++) {
      const u = 0.05 + 0.9 * hash(i, 1, 31)
      const side = hash(i, 2, 31) < 0.5 ? -1 : 1
      const born = 0.05 + 0.75 * (1 - u) * 0.8 + 0.15 * hash(i, 3, 31)
      const life = clamp01((vanish - born) / 0.45)
      if (life <= 0 || life >= 1) continue
      const x0 = side * shellHalf(u) * w * (0.8 + 0.2 * hash(i, 4, 31))
      const y0 = -h + u * h
      const x = x0 + side * life * w * 0.25
      const y = y0 - life * h * 0.35
      const r = (2 + 5 * hash(i, 5, 31)) * (0.6 + life)
      // A little wider than the old flat puffs, as a soft edge reaches further than a hard one.
      softPuff(p.drawingContext as CanvasRenderingContext2D, k, x, y, r * 1.25, r * 0.8, mixHex(VALLEY.cloud, air, 0.3), 0.7 * Math.sin(Math.PI * life))
    }
  }
}

/* ------------------------------------------------------------------ the heptapods */

export interface HeptapodOpts {
  /** Show time: its limbs sway on their own slow clocks, never on the music. */
  t: number
  /** Height from the floor to the top of its body, cells. */
  h: number
  /** Which one: Abbott (0, the larger, stiller) or Costello (1). It changes the gait and the lean. */
  who?: 0 | 1
  /** How deep in the fog: 0 clear, 1 gone. It pales and softens. */
  fog?: number
  /** The fog's colour, which it pales toward. */
  air?: string
  /** Its colour when clear. */
  color?: string
  /** Opacity. */
  light?: number
  /**
   * A limb reaching out: which limb (0..6, 3 is the middle one, toward us), the point it reaches for (cells from the
   * origin), and how far it has gone (0 standing .. 1 there). At the end of its reach the tip opens into a palm.
   * Optional `bow` (the fog builder's): a long reach bows instead of straightening, by this share of its length to
   * one side (positive to its right as it goes, negative to its left), and slims toward its tip.
   */
  reach?: { limb: number; to: Pt; u: number; bow?: number }
  /** More limbs reaching at once, each on a limb of its own (the fog builder's: one limb draws back as the next comes). */
  also?: { limb: number; to: Pt; u: number; bow?: number }[]
  /**
   * Optional (the chamber builder's): how deep in the fog the reaching limb and its palm are once it has reached, 0
   * clear .. 1 gone; a limb reaching for the glass comes out of the fog the body is in. Unset, it is the body's `fog`.
   */
  reachFog?: number
  /** How open the reaching limb's palm is, 0 a closed tip .. 1 the seven fingers splayed flat on the glass. */
  palm?: number
  /**
   * Optional (the director's, for the first logogram): how deep in the fog the limbs it stands on are, when deeper
   * than its body: the fog thickening round its feet while its reaching limb and its body stay as they are.
   */
  limbFog?: number
  /** Lean, radians, the whole body (a slow sway toward something). */
  lean?: number
  /**
   * Optional (the chamber builder's, for a gait): where each limb's tip is, cells from the origin, in place of its
   * standing foot and sway. A part that walks a heptapod lifts and sets each tip down itself; a limb left undefined
   * stands on its own foot. A `reach` still applies on top.
   */
  tips?: (Pt | undefined)[]
}

/** The seven limbs' feet, as shares of `h` from the origin, left to right; 3 is the front one, toward us. */
const FEET: Pt[] = [
  [-0.62, 0.02],
  [-0.4, 0.05],
  [-0.2, -0.02],
  [0.02, 0.06],
  [0.22, -0.01],
  [0.43, 0.04],
  [0.6, 0.0],
]
/** How far back each limb is (0 the front, toward us .. 1 behind): the back ones are paler. */
const DEPTH = [0.7, 0.35, 0.8, 0, 0.75, 0.3, 0.65]

/** The reach limb `i` is making, if any. */
function reachOf(o: HeptapodOpts, i: number): HeptapodOpts['reach'] {
  if (o.reach && o.reach.limb === i) return o.reach
  return o.also?.find((r) => r.limb === i)
}

/** Where limb `i`'s tip is (cells from the origin), standing or reaching: where its ink comes from. */
export function heptapodTip(o: HeptapodOpts, i: number): Pt {
  const { h, t } = o
  const who = o.who ?? 0
  const f = FEET[i]
  const sway = Math.sin(t * (0.55 + 0.07 * i + 0.05 * who) + i * 1.7) * 0.02
  const own = o.tips?.[i]
  let x = own ? own[0] : (f[0] + sway) * h
  let y = own ? own[1] : f[1] * h
  const r = reachOf(o, i)
  if (r) {
    const u = smooth01(r.u)
    x += (r.to[0] - x) * u
    y += (r.to[1] - y) * u
  }
  return [x, y]
}

/**
 * A soft edge round a silhouette (`shapes`, polygons in cells, and `dots`, circles [x, y, r]): its blur alone, `blur`
 * cells wide in `color` at `a`, the shape itself never painted (it is drawn far off the canvas and only its shadow
 * brought back), so it can go under translucent parts without darkening them.
 */
function softSilhouette(ctx: CanvasRenderingContext2D, k: number, shapes: Pt[][], dots: [number, number, number][], color: string, a: number, blur: number): void {
  if (a <= 0.004 || blur * k < 0.5) return
  const m = ctx.getTransform()
  const px = Math.hypot(m.a, m.b)
  const off = 30000
  const inv = m.inverse()
  const [ux, uy] = [inv.a * off, inv.b * off]
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16))
  ctx.save()
  ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${a})`
  ctx.shadowBlur = blur * k * px
  ctx.shadowOffsetX = off
  ctx.shadowOffsetY = 0
  ctx.fillStyle = '#000'
  ctx.beginPath()
  for (const pts of shapes) {
    // All the same way round, so the union is filled once (nonzero).
    let area = 0
    for (let i = 0; i < pts.length; i++) area += pts[i][0] * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * pts[i][1]
    const seq = area < 0 ? pts.slice().reverse() : pts
    seq.forEach(([x, y], i) => (i ? ctx.lineTo(x * k - ux, y * k - uy) : ctx.moveTo(x * k - ux, y * k - uy)))
    ctx.closePath()
  }
  for (const [x, y, rr] of dots) {
    ctx.moveTo((x + rr) * k - ux, y * k - uy)
    ctx.arc(x * k - ux, y * k - uy, rr * k, 0, Math.PI * 2)
  }
  ctx.fill()
  ctx.restore()
}

/**
 * A heptapod standing in fog, its origin on the floor under its body: a tall trunk of a body, seven limbs arching
 * down from under it to the floor like the fingers of a hand stood on its fingertips. Uninked: a shape in the fog,
 * its back limbs paler than its front ones, its edges softened by the air. The limbs sway on slow clocks of their own.
 */
export function drawHeptapod(p: p5, k: number, o: HeptapodOpts): void {
  const { h, t } = o
  const who = o.who ?? 0
  const fog = clamp01(o.fog ?? 0)
  const air = o.air ?? FOG.white
  const base = o.color ?? FOG.heptapod
  const light = o.light ?? 1
  if (light <= 0.01 || fog >= 0.995 || h * k < 2) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const bob = Math.sin(t * 0.37 + who * 2.1) * 0.012 * h
  const lean = (o.lean ?? 0) + Math.sin(t * 0.21 + who) * 0.02
  // The body: from its crown down to where the limbs leave it.
  const top = -h + bob
  const hip = -0.5 * h + bob
  const bw = (0.17 + 0.02 * who) * h
  const colorAt = (depth: number) => mixHex(base, air, Math.min(1, fog + depth * 0.35 * (1 - fog)))
  ctx.save()
  // Deepest in the fog it goes by fading, not by paling further: its colour is the air's at the fog's whitest, and
  // against fog that is greyer in places it would stand out as white limbs, a ghost brighter than what it is in.
  ctx.globalAlpha *= light * Math.min(1, (1 - fog) / 0.15)
  p.push()
  p.noStroke()
  // One creature, not layers: every soft edge first (so none lies over another part), then the limbs solid, the back
  // ones before the front, then the body over all their roots (the front limb comes out from under its hip, never a
  // disc stuck on it), its folds, and last any palm.
  const order = [0, 2, 4, 6, 1, 5, 3]
  const limb = (i: number) => {
    const d = DEPTH[i]
    // Each limb leaves the body from inside it, just above the hip, so no limb's root is ever a cut end.
    const rootX = (i - 3) * 0.036 * h + Math.sin(lean) * (hip - top) * 0.2
    const root: Pt = [rootX, hip - 0.05 * h]
    const tip = heptapodTip(o, i)
    const its = reachOf(o, i)
    const reaching = its ? smooth01(its.u) : 0
    // Out from under the body and down to the floor, like the ribs of an umbrella: a shoulder that rises a little as
    // it leaves, then a long fall to the tip. A reaching limb straightens toward what it reaches for.
    const out = tip[0] - root[0]
    const drop = tip[1] - root[1]
    const sway = Math.sin(t * (0.43 + 0.05 * i) + i * 2.3 + who) * 0.02 * h
    const rise = (0.03 + 0.05 * (Math.abs(i - 3) / 3)) * h
    const c1: Pt = [root[0] + out * 0.38 + sway * 0.5, root[1] - rise * (1 - reaching)]
    const c2: Pt = [tip[0] - out * (0.12 - 0.1 * reaching) + sway, root[1] + drop * (0.1 + 0.55 * reaching) - rise * 0.35 * (1 - reaching)]
    // A bowed reach: its middle pushed off the straight line to one side (only where `reach.bow` is given).
    const bow = reaching > 0 && its?.bow ? its.bow * reaching : 0
    if (bow) {
      const len = Math.hypot(out, drop) || 1
      const bx = (-drop / len) * bow * len
      const by = (out / len) * bow * len
      c1[0] += bx * 0.95
      c1[1] += by * 0.95
      c2[0] += bx * 0.6
      c2[1] += by * 0.6
    }
    const slim = 1 - 0.4 * Math.min(1, Math.abs(bow) * 3)
    // Heavy limbs, like trunks: thick well out from the body, tapering late to a blunt tip.
    const w0 = (0.072 - 0.012 * d) * h
    const w1 = 0.011 * h
    const n = 28
    const left: Pt[] = []
    const right: Pt[] = []
    let px = root[0]
    let py = root[1]
    for (let j = 0; j <= n; j++) {
      const u = j / n
      const a = (1 - u) ** 3
      const b = 3 * u * (1 - u) ** 2
      const c = 3 * u * u * (1 - u)
      const e = u ** 3
      const x = a * root[0] + b * c1[0] + c * c2[0] + e * tip[0]
      const y = a * root[1] + b * c1[1] + c * c2[1] + e * tip[1]
      const dx = j ? x - px : c1[0] - root[0]
      const dy = j ? y - py : c1[1] - root[1]
      const l = Math.hypot(dx, dy) || 1
      // Thick from the body through the shoulder, then tapering long to a fine tip; the skin's folds a faint pulse.
      const width = (w1 + (w0 - w1) * (1 - u) ** 1.25) * (1 + 0.08 * Math.sin(Math.PI * Math.min(1, u * 1.6)) + 0.03 * Math.sin(u * 29 + i)) * (1 - (1 - slim) * u)
      left.push([x - (dy / l) * width, y + (dx / l) * width])
      right.push([x + (dy / l) * width, y - (dx / l) * width])
      px = x
      py = y
    }
    const standing = o.limbFog !== undefined && reaching <= 0 ? clamp01(Math.max(fog, o.limbFog)) : fog
    const col =
      reaching > 0 && o.reachFog !== undefined
        ? mixHex(base, air, Math.min(1, fog + (clamp01(o.reachFog) - fog) * reaching + d * 0.35 * (1 - fog)))
        : mixHex(base, air, Math.min(1, standing + d * 0.35 * (1 - standing)))
    return { left, right, col, root, w0, tip, reaching }
  }
  const limbs = order.map(limb)
  type LimbShape = (typeof limbs)[number]
  // The limb's outline at `grow` times its width, and its blunt round tip: in a close frame the limb's end is seen,
  // and it is never a square cut.
  const outline = (g: LimbShape, grow: number) => {
    const { left, right } = g
    p.beginShape()
    for (let j = 0; j < left.length; j++) {
      const mx = (left[j][0] + right[j][0]) / 2
      const my = (left[j][1] + right[j][1]) / 2
      p.vertex((mx + (left[j][0] - mx) * grow) * k, (my + (left[j][1] - my) * grow) * k)
    }
    for (let j = right.length - 1; j >= 0; j--) {
      const mx = (left[j][0] + right[j][0]) / 2
      const my = (left[j][1] + right[j][1]) / 2
      p.vertex((mx + (right[j][0] - mx) * grow) * k, (my + (right[j][1] - my) * grow) * k)
    }
    p.endShape(p.CLOSE)
    const e = left.length - 1
    const tw = Math.hypot(left[e][0] - right[e][0], left[e][1] - right[e][1]) * grow
    p.ellipse(((left[e][0] + right[e][0]) / 2) * k, ((left[e][1] + right[e][1]) / 2) * k, tw * k, tw * k)
  }
  // The body: a tall trunk, rounded at the crown, fullest a third of the way down, drawing in to the hip where the
  // limbs leave it; a little lean, and a few soft folds down it.
  const col = colorAt(0.1)
  const bodyPts: Pt[] = []
  const nb = 56
  const bodyH = hip - top + 0.06 * h
  for (let j = 0; j <= nb; j++) {
    const a = (j / nb) * TAU
    // v: 0 at the crown, 1 at the hip, round the right side and back up the left.
    const v = (1 - Math.cos(a)) / 2
    const side = Math.sin(a) >= 0 ? 1 : -1
    // A domed crown and a rounded hip (never a flat cut across either end), fullest a third of the way down.
    const profile = Math.pow(Math.sin(Math.PI * v), 0.55) * (1 - 0.32 * v * v)
    const half = bw * profile * (1 + 0.04 * Math.sin(5 * v + who * 2 + (side > 0 ? 0 : 1.3)))
    const x = side * half + Math.sin(lean) * (1 - v) * bodyH * 0.35
    const y = top + bodyH * v
    bodyPts.push([x, y])
  }
  // The soft edge: one true blur round the whole of it, limbs and body together, under everything solid (never a
  // fainter copy of each part, whose edges would stand as outlines).
  const tips = limbs.map((g): [number, number, number] => {
    const e = g.left.length - 1
    return [(g.left[e][0] + g.right[e][0]) / 2, (g.left[e][1] + g.right[e][1]) / 2, Math.hypot(g.left[e][0] - g.right[e][0], g.left[e][1] - g.right[e][1]) / 2]
  })
  softSilhouette(ctx, k, [...limbs.map((g) => [...g.left, ...g.right.slice().reverse()]), bodyPts], tips, col, 0.4, 0.035 * h)
  // The limbs, solid, back to front, each with its root rounded inside where the body will be.
  for (const g of limbs) {
    p.fill(g.col)
    p.ellipse(g.root[0] * k, g.root[1] * k, g.w0 * 2.05 * k, g.w0 * 2.05 * k)
    outline(g, 1)
  }
  p.fill(col)
  p.beginShape()
  for (const [x, y] of bodyPts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
  // The crown going up into the air: what is highest is the most fogged, so the head is lost in the white rather than
  // ending on a line.
  ctx.save()
  ctx.beginPath()
  bodyPts.forEach(([x, y], j) => (j ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.closePath()
  ctx.clip()
  const [ar, ag, ab] = [1, 3, 5].map((i) => parseInt(air.slice(i, i + 2), 16))
  const crown = ctx.createLinearGradient(0, top * k, 0, (top + bodyH * 0.45) * k)
  crown.addColorStop(0, `rgba(${ar}, ${ag}, ${ab}, ${0.5 * (1 - fog)})`)
  crown.addColorStop(1, `rgba(${ar}, ${ag}, ${ab}, 0)`)
  ctx.fillStyle = crown
  ctx.fillRect((-bw * 1.6 - bodyH * 0.4) * k, top * k, (bw * 3.2 + bodyH * 0.8) * k, bodyH * 0.45 * k)
  ctx.restore()
  // Folds: three long soft darker bands down the trunk, blurred and fading out at both ends (never lines that stop
  // square), kept inside the body.
  const fold = mixHex(col, '#000000', 0.12 * (1 - fog))
  const folds: Pt[][] = []
  for (let f = 0; f < 3; f++) {
    const fx = (-0.45 + 0.42 * f + 0.06 * who) * bw
    const edge = (sgn: number): Pt[] =>
      Array.from({ length: 13 }, (_, j) => {
        const u = j / 12
        const v = 0.15 + 0.75 * u
        const w = bw * 0.06 * Math.sin(Math.PI * u)
        return [fx + Math.sin(lean) * (1 - v) * bodyH * 0.35 + sgn * w, top + bodyH * v]
      })
    folds.push([...edge(-1), ...edge(1).reverse()])
  }
  ctx.save()
  ctx.beginPath()
  bodyPts.forEach(([x, y], j) => (j ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.closePath()
  ctx.clip()
  softSilhouette(ctx, k, folds, [], fold, 0.35, bw * 0.08)
  ctx.restore()
  // The palm: at the end of a reach the tip opens into seven fingers, flat against whatever it touches.
  limbs.forEach((g, n) => {
    if (g.reaching > 0.6 && (o.palm ?? 0) > 0.01) drawPalm(p, k, g.tip, 0.1 * h * (o.palm ?? 0), g.col, t + order[n])
  })
  p.pop()
  ctx.restore()
}

/**
 * A palm pressed flat: a round centre and seven fingers splayed evenly round it, each tapering to a blunt tip. `r`
 * is the fingers' reach in cells. Drawn in `col` about `at`.
 */
export function drawPalm(p: p5, k: number, at: Pt, r: number, col: string, phase = 0): void {
  if (r * k < 1) return
  p.push()
  p.noStroke()
  // Solid: one hand, its fingers, pads and the limb's end under it never showing through each other.
  p.fill(col)
  p.translate(at[0] * k, at[1] * k)
  p.circle(0, 0, r * 0.7 * k)
  // Seven fingers, each a living thing: a full root out of the palm, a long taper with a little curl of its own, and a
  // soft round pad at its tip where it presses. A hand of seven, never a star of seven points.
  const n = 10
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i / 7) * TAU + 0.03 * Math.sin(phase * 0.3 + i)
    // The first points up the limb, behind its wrist: seen only as far as it is hidden there (its pad, curling out
    // past the narrow wrist, read as a knob on the limb, not a finger).
    const behind = i === 0
    const len = behind ? r * 0.4 : r * (0.92 + 0.08 * Math.sin(i * 2.1))
    const curl = behind ? 0 : 0.16 * Math.sin(i * 1.7 + 0.6) + 0.04 * Math.sin(phase * 0.2 + i)
    const w0 = r * 0.19
    const w1 = r * 0.078
    const left: Pt[] = []
    const right: Pt[] = []
    let tip: Pt = [0, 0]
    for (let j = 0; j <= n; j++) {
      const u = j / n
      const d = r * 0.18 + (len - r * 0.18) * u
      const ang = a + curl * u * u
      const x = Math.cos(ang) * d
      const y = Math.sin(ang) * d
      // The side, across the finger's own direction (its spine's, curl and all).
      const dir = a + 2 * curl * u
      const w = w1 + (w0 - w1) * (1 - u) ** 1.1
      left.push([x - Math.sin(dir) * w, y + Math.cos(dir) * w])
      right.push([x + Math.sin(dir) * w, y - Math.cos(dir) * w])
      tip = [x, y]
    }
    p.beginShape()
    for (const [x, y] of left) p.vertex(x * k, y * k)
    for (let j = right.length - 1; j >= 0; j--) p.vertex(right[j][0] * k, right[j][1] * k)
    p.endShape(p.CLOSE)
    p.circle(tip[0] * k, tip[1] * k, w1 * 2.25 * k)
  }
  p.pop()
}

/* ------------------------------------------------------------------ their ink */

export interface LogogramOpts {
  /** Radius of its ring, cells. */
  r: number
  /** Which sentence: every seed is its own logogram (its thickness, its blots, its tendrils). */
  seed: number
  /** Show time: the ink breathes and drifts. */
  t: number
  /** How far it has formed, 0 nothing .. 1 whole. The ring closes by 0.7, its tendrils reach out after. */
  form: number
  /** How far it has gone, 0 whole .. 1 gone: it softens, spreads and pales. */
  fade?: number
  /** Where on the ring it began, radians (0 is to the right, going clockwise on the screen). */
  start?: number
  /** Its turn, radians. */
  spin?: number
  /** Its colour. */
  color?: string
  /** Opacity. */
  light?: number
  /**
   * Optional (the fog builder's): blots besides its own, where a writer pressed: each at `a` (in its own turn, like
   * `start`), `size` and `width` as the seed's own blots have them, swelling in with `grow` (0 none .. 1 whole; 1 if
   * unset). `logogramAt` counts them, so a ball ridden on the ring rides over them.
   */
  marks?: { a: number; size: number; width: number; grow?: number }[]
  /** Optional (the fog builder's): radians over which a forming end tapers (0.5 if unset). */
  taper?: number
  /**
   * Optional (the director's): where a ball sits on the ring (in its own turn, like `start`). No tendril grows out of
   * her: one near her draws back as she comes, so none ever reads as a stalk on the ball.
   */
  clear?: number
}

interface Blot {
  a: number
  size: number
  width: number
}
interface Tendril {
  a: number
  len: number
  curl: number
  inward: boolean
  drop: boolean
}
interface Shape {
  phases: number[]
  blots: Blot[]
  tendrils: Tendril[]
}

const shapes = new Map<number, Shape>()
function shapeOf(seed: number): Shape {
  const got = shapes.get(seed)
  if (got) return got
  const phases = [0, 1, 2, 3, 4].map((i) => hash(seed, i, 71) * TAU)
  const blots: Blot[] = []
  const nb = 3 + Math.floor(hash(seed, 9, 71) * 3)
  for (let i = 0; i < nb; i++) blots.push({ a: hash(seed, 10 + i, 71) * TAU, size: 0.05 + 0.07 * hash(seed, 20 + i, 71), width: 0.18 + 0.25 * hash(seed, 30 + i, 71) })
  const tendrils: Tendril[] = []
  const nt = 4 + Math.floor(hash(seed, 40, 71) * 4)
  for (let i = 0; i < nt; i++) {
    tendrils.push({
      a: hash(seed, 41 + i, 71) * TAU,
      len: 0.18 + 0.4 * hash(seed, 51 + i, 71),
      curl: (hash(seed, 61 + i, 71) - 0.5) * 1.6,
      inward: hash(seed, 71 + i, 71) < 0.25,
      drop: hash(seed, 81 + i, 71) < 0.55,
    })
  }
  const s = { phases, blots, tendrils }
  shapes.set(seed, s)
  return s
}

/** Angular distance, wrapped to [0, π]. */
const angDist = (a: number, b: number) => {
  const d = Math.abs((((a - b) % TAU) + TAU) % TAU)
  return Math.min(d, TAU - d)
}

/**
 * The ring at angle `a` (radians, in the logogram's own turn, before `spin`): the radius of its middle line and its
 * half-thickness, in cells. What a part rides the ball on: the inner edge is at `mid - half`, the outer at
 * `mid + half`, so a ball rolling inside it sits at `mid - half - R` from the centre.
 */
export function logogramAt(o: Pick<LogogramOpts, 'r' | 'seed' | 'marks'>, a: number): { mid: number; half: number } {
  const s = shapeOf(o.seed)
  const [p0, p1, p2, p3, p4] = s.phases
  const mid = o.r * (1 + 0.03 * Math.sin(3 * a + p0) + 0.018 * Math.sin(5 * a + p1) + 0.01 * Math.sin(9 * a + p2))
  let half = o.r * (0.03 + 0.022 * (0.5 + 0.5 * Math.sin(2 * a + p3)) + 0.008 * Math.sin(7 * a + p4))
  for (const b of s.blots) {
    const d = angDist(a, b.a) / b.width
    half += o.r * b.size * Math.exp(-d * d * 2)
  }
  if (o.marks) {
    for (const b of o.marks) {
      const d = angDist(a, b.a) / b.width
      if (d < 4) half += o.r * b.size * clamp01(b.grow ?? 1) * Math.exp(-d * d * 2)
    }
  }
  return { mid, half }
}

/**
 * A logogram: a ring of ink hanging in the air, thick and thin by turns, with blots on it and tendrils curling off
 * it, some ending in a drop, its edges soft the way ink is in water. It forms from where it began both ways round
 * at once (a heptapod writes the whole sentence at once), closes, then puts out its tendrils.
 */
export function drawLogogram(p: p5, k: number, o: LogogramOpts): void {
  const form = clamp01(o.form)
  const fade = clamp01(o.fade ?? 0)
  const light = (o.light ?? 1) * (1 - smooth01(fade))
  if (form <= 0.001 || light <= 0.01 || o.r * k < 2) return
  const s = shapeOf(o.seed)
  const color = o.color ?? FOG.ink
  const start = o.start ?? -Math.PI / 2
  const spin = o.spin ?? 0
  const ring = smooth01(form / 0.7)
  const reach = smooth01((form - 0.62) / 0.38)
  const spread = 1 + 0.5 * fade
  const breathe = 1 + 0.01 * Math.sin(o.t * 0.9 + o.seed)
  const n = 160
  // The arc that has formed: from `start` both ways, meeting on the far side as `ring` reaches 1.
  const span = Math.PI * ring
  const inArc = (a: number) => angDist(a, start) <= span + 1e-6
  const outer: Pt[] = []
  const inner: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const a = start - span + (2 * span * i) / n
    const { mid, half } = logogramAt(o, a)
    // The leading ends taper as they form, so the ink reads as running round, not as a cut.
    const toEnd = Math.min(angDist(a, start + span), angDist(a, start - span))
    const taper = ring >= 0.999 ? 1 : smooth01(toEnd / Math.max(1e-3, o.taper ?? 0.5))
    const hw = half * taper * spread
    const c = Math.cos(a + spin)
    const si = Math.sin(a + spin)
    outer.push([c * (mid + hw) * breathe, si * (mid + hw) * breathe])
    inner.push([c * (mid - hw) * breathe, si * (mid - hw) * breathe])
  }
  // The ring and its tendrils are one body of ink, filled at once: where a tendril leaves the ring there is no darker
  // overlap. Its haze is a true blur round the whole of it (the soft edge of ink in water), never stepped outlines.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const m = ctx.getTransform()
  const px = Math.hypot(m.a, m.b)
  const body = (fade > 0 ? 0.9 - 0.4 * fade : 0.92) * light
  const shapes: Pt[][] = [[...outer, ...inner.slice().reverse()]]
  const drops: { x: number; y: number; rx: number; ry: number; a: number }[] = []
  // Tendrils: curling strokes off the ring, tapering, some ending in a drop.
  if (reach > 0.001) {
    s.tendrils.forEach((td, i) => {
      if (!inArc(td.a)) return
      const away = o.clear === undefined ? 1 : smooth01((angDist(td.a, o.clear) - 0.22) / 0.3)
      const grow = smooth01((reach - i * 0.06) / 0.7) * away
      if (grow <= 0.001) return
      const { mid, half } = logogramAt(o, td.a)
      const dir = td.inward ? -1 : 1
      const r0 = mid + dir * half * 0.6
      const len = td.len * o.r * grow
      const steps = 14
      const left: Pt[] = []
      const right: Pt[] = []
      for (let j = 0; j <= steps; j++) {
        const u = j / steps
        const rr = r0 + dir * len * u
        const aa = td.a + td.curl * u * u * (len / Math.max(0.1, o.r)) + 0.02 * Math.sin(o.t * 0.7 + i + u * 3)
        const x = Math.cos(aa + spin) * rr * breathe
        const y = Math.sin(aa + spin) * rr * breathe
        const w = half * 0.55 * (1 - u * 0.85) * spread
        const tx = -Math.sin(aa + spin)
        const ty = Math.cos(aa + spin)
        left.push([x + tx * w, y + ty * w])
        right.push([x - tx * w, y - ty * w])
      }
      shapes.push([...left, ...right.slice().reverse()])
      if (td.drop && grow > 0.85) {
        const u = 1.12
        const rr = r0 + dir * len * u
        const aa = td.a + td.curl * (len / Math.max(0.1, o.r))
        // A drop: small, dark, never ball-sized (its width is a fraction of the ring's thickness).
        const d = Math.min(half * 0.9, R * 0.6) * spread
        drops.push({ x: Math.cos(aa + spin) * rr * breathe, y: Math.sin(aa + spin) * rr * breathe, rx: d, ry: d * 0.8, a: (0.85 - 0.4 * fade) * light * smooth01((grow - 0.85) / 0.15) })
      }
    })
  }
  const [cr, cg, cb] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16))
  ctx.save()
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
  // As wide as the old outer haze reached past the ink's edge, and as faint.
  ctx.shadowBlur = o.r * 0.16 * spread * k * px
  ctx.shadowColor = `rgba(${cr}, ${cg}, ${cb}, ${0.6 * light})`
  ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${body})`
  ctx.beginPath()
  for (const pts of shapes) {
    // All the same way round, so where they overlap the ink is filled once (nonzero), never cut out.
    let area = 0
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i]
      const [x1, y1] = pts[(i + 1) % pts.length]
      area += x0 * y1 - x1 * y0
    }
    const seq = area < 0 ? pts.slice().reverse() : pts
    seq.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
    ctx.closePath()
  }
  ctx.fill()
  for (const d of drops) {
    if (d.a <= 0.004) continue
    ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${d.a})`
    ctx.beginPath()
    ctx.ellipse(d.x * k, d.y * k, d.rx * k, d.ry * k, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/**
 * A jet of ink leaving a limb's tip toward where a logogram will form, the way ink squirted into water goes: a thin
 * dark stream from the tip, widening as it goes, its head billowing out into a soft cloud that spreads as it slows.
 * `u` is how far it has gone (0 at the tip .. 1 arrived, when the logogram begins to form there); past 1 its cloud
 * lingers there and thins by 1.6. Uninked, soft.
 */
export function drawSpray(p: p5, k: number, from: Pt, to: Pt, u: number, color = FOG.ink, light = 1): void {
  // Past 1 the stream is gone and its cloud lingers where it arrived, thinning, while the logogram forms out of it.
  if (u <= 0 || u >= 1.6 || light <= 0.01) return
  const v = Math.min(1, u)
  const linger = 1 - smooth01((u - 1) / 0.6)
  light *= linger
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1
  // The head decelerates as it goes (ink in water): fast out of the tip, slowing into its cloud.
  const reach = 1 - (1 - v) * (1 - v)
  const nx = -(to[1] - from[1]) / len
  const ny = (to[0] - from[0]) / len
  const bow = 0.12 * len
  const at = (w: number): Pt => [
    from[0] + (to[0] - from[0]) * w + nx * bow * Math.sin(Math.PI * w),
    from[1] + (to[1] - from[1]) * w + ny * bow * Math.sin(Math.PI * w),
  ]
  const fade = 1 - smooth01((v - 0.7) / 0.3)
  p.push()
  p.noStroke()
  // The stream: from the tip to the head, thin at the tip, widening; thinning away as the head arrives.
  const n = 18
  const left: Pt[] = []
  const right: Pt[] = []
  for (let j = 0; j <= n; j++) {
    const w = (j / n) * reach
    const [x, y] = at(w)
    const [x2, y2] = at(Math.min(1, w + 0.01))
    const dx = x2 - x
    const dy = y2 - y
    const l = Math.hypot(dx, dy) || 1
    const half = (0.015 + 0.07 * (j / n) * reach) * len * 0.35 * (0.6 + 0.4 * fade)
    left.push([x - (dy / l) * half, y + (dx / l) * half])
    right.push([x + (dy / l) * half, y - (dx / l) * half])
  }
  p.fill(alpha(p, color, 0.55 * fade * light))
  p.beginShape()
  for (const [x, y] of left) p.vertex(x * k, y * k)
  // Its end in the head is round, never a square cut where the head is thin enough to show it.
  const [ex, ey] = at(reach)
  const [lx, ly] = left[n]
  const ca = Math.atan2(ly - ey, lx - ex)
  const cr = Math.hypot(lx - ex, ly - ey)
  // Round from its left edge through the way it is going to its right.
  const [px, py] = at(Math.max(0, reach - 0.01))
  const sweep = Math.sign((lx - ex) * (ey - py) - (ly - ey) * (ex - px)) || 1
  for (let j = 1; j < 8; j++) p.vertex((ex + Math.cos(ca + sweep * (Math.PI * j) / 8) * cr) * k, (ey + Math.sin(ca + sweep * (Math.PI * j) / 8) * cr) * k)
  for (let j = right.length - 1; j >= 0; j--) p.vertex(right[j][0] * k, right[j][1] * k)
  p.endShape(p.CLOSE)
  // The head: a billow of soft overlapping clouds, opening as it slows: each dense at its middle and nothing at its
  // edge, so the billow is one soft cloud, never a cluster of discs.
  const [hx, hy] = at(reach)
  const r = (0.06 + 0.22 * reach) * len * 0.5
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const puff = (x: number, y: number, rx: number, ry: number, a: number) => softPuff(ctx, k, x, y, rx, ry, color, a)
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + v * 1.3
    const off = r * (0.25 + 0.35 * reach)
    // Half-widths a little past the old discs', as a soft edge reaches further than a hard one.
    puff(hx + Math.cos(a) * off, hy + Math.sin(a) * off, r * (1.1 + 0.3 * Math.sin(i * 2.3)) * 0.65, r * (0.9 + 0.3 * Math.cos(i * 1.7)) * 0.65, (0.24 + 0.08 * (i % 2)) * light * (0.5 + 0.5 * fade))
  }
  puff(hx, hy, r * 0.6, r * 0.5, 0.5 * light * fade)
  p.pop()
}

/* ------------------------------------------------------------------ the lift's deck */

/**
 * The scissor lift's deck, which carries them up into the shell: seen side on, the ball's rest line at y = 0 (the
 * deck's top at y = R), from `x0` to `x1` cells. A steel plate with a toe board, and a guard rail behind: two end
 * posts and a top rail and mid rail. `over` draws only the near toe board, for a part to draw after the ball.
 * The lift builder and the shaft builder both show it, so it is one deck.
 */
export function drawDeck(p: p5, k: number, x0: number, x1: number, o: { ink: string; weight: number; steel?: string; over?: boolean; lamp?: DeckLamp }): void {
  const steel = o.steel ?? VALLEY.steel
  const top = R
  const plate = 0.14
  p.push()
  p.rectMode(p.CORNER)
  p.stroke(o.ink)
  p.strokeWeight(o.weight)
  if (o.over) {
    // The near toe board: a low lip along the deck's front edge.
    p.fill(mixHex(steel, '#000000', 0.12))
    p.rect(x0 * k, (top - 0.06) * k, (x1 - x0) * k, 0.06 * k)
    p.pop()
    return
  }
  // The rail behind: posts at the ends and every cell and a half, a top rail and a mid rail.
  const railH = 1.05
  p.strokeWeight(o.weight * 0.9)
  p.stroke(mixHex(o.ink, steel, 0.35))
  const posts = Math.max(2, Math.round((x1 - x0) / 1.5) + 1)
  for (let i = 0; i < posts; i++) {
    const x = x0 + 0.06 + ((x1 - x0 - 0.12) * i) / (posts - 1)
    p.line(x * k, top * k, x * k, (top - railH) * k)
  }
  p.line((x0 + 0.06) * k, (top - railH) * k, (x1 - 0.06) * k, (top - railH) * k)
  p.line((x0 + 0.06) * k, (top - railH * 0.5) * k, (x1 - 0.06) * k, (top - railH * 0.5) * k)
  // The plate.
  p.stroke(o.ink)
  p.strokeWeight(o.weight)
  p.fill(steel)
  p.rect(x0 * k, top * k, (x1 - x0) * k, plate * k)
  if (o.lamp) drawDeckLamp(p, k, x1, o.lamp, o.ink, o.weight, steel)
  p.pop()
}

/**
 * Optional (the shaft builder's): the deck's work light. A hooded floodlight on the far (x1) end post's top, looking
 * up (the deck's own up), its switch a small box on the plate with its button toward the near end, its cable along the
 * plate and up the post. `on` 0 dark .. 1 lit; `press` 0 .. 1 how far the button is in; `switchAt` the switch's near
 * face; `tilt` how far the lamp leans toward the near end (radians). The shaft lights it; the lift side can show it
 * dark (`on: 0`), so the deck is one deck across the cut.
 */
export interface DeckLamp {
  on: number
  switchAt: number
  press?: number
  tilt?: number
  /** The housing's and the switch's colour (a dark steel, by default). */
  body?: string
}
/** Where the lamp's lens is, from the deck's rest line at its far end: along the deck, and up (the deck's own -y). */
export const DECK_LAMP_LENS = { back: 0.13, up: 1.32 - R }
function drawDeckLamp(p: p5, k: number, x1: number, l: DeckLamp, ink: string, weight: number, steel: string): void {
  const top = R
  const body = l.body ?? mixHex(VALLEY.steelDark, steel, 0.25)
  const press = Math.max(0, Math.min(1, l.press ?? 0))
  const on = Math.max(0, Math.min(1, l.on))
  const post = x1 - 0.06
  const railTop = top - 1.05
  // The switch, and its button toward the near end.
  p.stroke(ink)
  p.strokeWeight(weight * 0.8)
  p.fill(body)
  p.rect(l.switchAt * k, (top - 0.12) * k, 0.2 * k, 0.12 * k)
  p.fill(mixHex(steel, SHELL.glow, 0.3))
  p.rect((l.switchAt - 0.035 * (1 - press) - 0.004) * k, (top - 0.085) * k, (0.035 * (1 - press) + 0.004) * k, 0.05 * k)
  // Its cable, along the plate and up the far post.
  p.noFill()
  p.stroke(alpha(p, ink, 0.55))
  p.strokeWeight(weight * 0.55)
  p.beginShape()
  p.vertex((l.switchAt + 0.2) * k, (top - 0.03) * k)
  p.vertex((post - 0.05) * k, (top - 0.03) * k)
  p.vertex((post - 0.05) * k, (railTop + 0.05) * k)
  p.endShape()
  // The lamp on a short yoke on the post's top: a hooded box, its lens on the face that looks up.
  const fu = x1 - DECK_LAMP_LENS.back
  const fy = railTop - 0.14
  p.stroke(ink)
  p.strokeWeight(weight * 0.8)
  p.line((post - 0.1) * k, railTop * k, (fu - 0.02) * k, (fy + 0.1) * k)
  p.push()
  p.translate(fu * k, fy * k)
  p.rotate(-(l.tilt ?? 0))
  p.fill(body)
  p.rect(-0.15 * k, -0.11 * k, 0.3 * k, 0.2 * k)
  p.fill(mixHex(SHELL.wall, SHELL.glow, on))
  p.rect(-0.12 * k, -0.15 * k, 0.24 * k, 0.05 * k)
  p.pop()
}

/* ------------------------------------------------------------------ the chamber's glass */

/** The glass's light: the white the chamber's far wall is, and the colour the fog behind it is lit. */
export const GLASS = { face: SHELL.screen, edge: SHELL.screenEdge, fog: SHELL.fogLit }
