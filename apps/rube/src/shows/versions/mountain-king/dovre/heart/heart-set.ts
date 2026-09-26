import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { hash } from '../kit'
import { drawLantern, drawTorch, flame, flicker, glow } from '../lantern'
import { quake } from '../rock'
import { LAMP, SKY, STONE, WORKS } from '../worlds'
import type { Pen } from '../troll'
import {
  ANVIL,
  BELLOWS,
  BELLOWS_SMALL,
  BREAK,
  CAM,
  CHIMNEY_HALF,
  CHIMNEY_X,
  DECK,
  FLY,
  FLYWHEEL,
  FLY_R,
  FURNACE,
  GALLERY_LIP,
  GOV,
  GOVERNOR,
  GOV_SNAP,
  GOV_STOPS,
  GOV_WEIGHTS,
  HAMMER,
  HEAD_T,
  HEAD_W,
  LEDGE_LIP,
  OOM,
  PAH,
  PINION,
  PINION_AT,
  PINION_PIVOT,
  PINION_R,
  PIPE_Y,
  PIT,
  PISTONS,
  PISTON_X,
  SHAFT,
  SPLIT_DIR,
  T0,
  VALVE,
  VALVE_AT,
  WALL_L,
  WALL_R,
  YOKE_GOES,
  YOKE_SEAT,
  camAngle,
  clamp01,
  ease,
  flyAngle,
  flySpin,
  flySplit,
  furnace,
  govAlpha,
  govSpin,
  hammerPhi,
  knock,
  lerp,
  onHelve,
  pinionAngle,
  pinionAt,
  pistonTop,
  since,
  sleeveY,
  smoothstep,
  spindleFall,
  valveLift,
  valveSpit,
  yokeHangY,
  yokeSeatY,
} from './heart-clock'
import { LAND_ANGLE } from './heart-path'
import { GOV_LEVER, drawTrolls, govLever } from './heart-trolls'

/**
 * The mountain's heart, drawn: the room, the furnace, the machine, and what the machine does to itself. Everything is
 * a function of show time T, in gears' frame. `drawHeart` is behind the ball; `drawHeartOver` (the dust after the
 * break) in front of it.
 *
 * Light: the room is dark until the first blow's sparks light the furnace; from then its glow fills the pit, and it
 * flares on every 2 and 4 (the cymbals). Each part of the machine is darker until it starts, and a lamp catches as it
 * does, so every phrase the lit machine is bigger.
 */

/* ------------------------------------------------------------------ light and colour */

const SHADOW = mixHex(STONE.deep, STONE.dark, 0.5)
/** A colour in the light `lit` (0 a silhouette a step above the rock, 1 fully lit). */
const tone = (hex: string, lit: number): string => mixHex(SHADOW, hex, 0.16 + 0.84 * clamp01(lit))
/**
 * The iron's edge: a thin line darker than the metal, so every part reads as a lit mass against the rock, never as a
 * pale outline (the machine is mass, not line art).
 */
const inkOf = (_c: Pen, lit: number): string => mixHex(mixHex(STONE.deep, '#000000', 0.35), STONE.dark, 0.35 * clamp01(lit))
/** A lamp's own iron: its cage keeps the old, lighter edge (a lantern is drawn by its line). */
const lampInk = (c: Pen, lit: number): string => mixHex(STONE.dark, c.ink, 0.1 + 0.36 * clamp01(lit))
/** Iron as the furnace lights it: a warm grey, lighter than the rock behind it. */
const IRON = mixHex(WORKS.iron, WORKS.steel, 0.42)
const IRON_DARK = mixHex(WORKS.iron, WORKS.steel, 0.15)
/** A lit iron face (the flywheel's, the pumps' barrels): a step lighter again, so the big parts read as weight. */
const IRON_FACE = mixHex(WORKS.iron, WORKS.steel, 0.62)
/** Warmed by the fire on a flare (a surface facing the furnace). */
const warm = (hex: string, f: number): string => mixHex(hex, LAMP.glow, clamp01(f) * 0.22)

/**
 * The surges: the ff's downbeat (he lands, and the banked coals breathe up) and each new mechanism as it engages. The
 * furnace and every lamp flare on them, rising over the 40 ms before (so the light lands on the note) and dying
 * over half a second.
 */
const KICKS: [number, number][] = [[T0, 1.5], [FLY, 1], [PISTONS, 1], [BELLOWS, 1], [GOVERNOR, 1.1], [VALVE_AT, 1.1]]
function surge(T: number): number {
  let s = 0
  for (const [t, size] of KICKS) {
    const a = T - t
    if (a < -0.04) continue
    s += size * (a < 0 ? 1 + a / 0.04 : Math.exp(-a / 0.45))
  }
  return s
}
/** The furnace as the set draws it: the clock's fire, woken on the downbeat by his landing, flaring on the surges. */
function fireAt(T: number): ReturnType<typeof furnace> {
  const f = furnace(T)
  const woke = smoothstep(T, T0 - 0.03, T0 + 0.05)
  const s = surge(T) * (T >= BREAK ? 0 : 1)
  // The flywheel's halves crash down in front of it: the furnace blasts out once.
  const blast = T >= HALVES_LAND - 0.03 ? 2.4 * (T < HALVES_LAND ? 1 + (T - HALVES_LAND) / 0.03 : Math.exp(-(T - HALVES_LAND) / 0.4)) : 0
  return { base: Math.max(f.base, 0.28 * woke * (T >= BREAK ? 0.6 : 1)), flare: Math.max(f.flare, s, blast), heat: f.heat }
}

/**
 * Each mechanism is a near-black silhouette (the rock's own colour, no lit edge) until the furnace's flare on its
 * first note lights it, and it stays lit: so each phrase the lit machine is visibly bigger, and there is one hero
 * silhouette at a time (the flywheel, the pumps, the great bellows, the governor).
 */
const SLEEP = 0.1
const woken = (T: number, at: number): number => smoothstep(T, at - 0.04, at + 0.1)
const awake = (T: number, at: number): number => lerp(SLEEP, 1, woken(T, at))
/** How many of the four mechanisms are lit (0 to 1): the room brightens a step with each. */
const mechanisms = (T: number): number => (woken(T, FLY) + woken(T, PISTONS) + woken(T, BELLOWS) + woken(T, GOVERNOR)) / 4

/** The room's light at T: the furnace's (its base and the flare on the backbeat, and the surges), and a step up for each mechanism lit. */
export function roomLight(T: number): { lit: number; flare: number; fire: ReturnType<typeof furnace> } {
  const fire = fireAt(T)
  const lit = 0.08 + 0.92 * clamp01(fire.base) + 0.12 * fire.flare + 0.18 * surge(T) + 0.4 * mechanisms(T)
  return { lit: clamp01(lit), flare: fire.flare, fire }
}
/** How lit a thing standing at x is: the furnace is in the middle of the pit, the ends of the room darker. */
const litAt = (L: number, x: number, own = 0): number => clamp01(L * (1 - 0.04 * Math.abs(x - FURNACE.x)) + own)

/** The lamps: each caught as its part of the machine starts, and burning from then on. */
const LAMPS: { at: Pt; on: number; hang: number; torch?: number }[] = [
  { at: [-1.3, -2.4], on: T0, hang: 0, torch: 1 },
  { at: [0.95, -5.98], on: PAH[0], hang: 0.55 },
  { at: [9.95, -6.12], on: FLY, hang: 0.85 },
  { at: [11.35, -6.05], on: PISTONS, hang: 0.72 },
  { at: [WALL_R, -2.6], on: GOVERNOR, hang: 0, torch: -1 },
]
/** A lamp catches on its note (a short rise into it, so it is burning on the beat). */
const lampLit = (T: number, on: number): number => smoothstep(T, on - 0.04, on + 0.06)
/** The light a lamp throws on things near it. */
function lampsAt(T: number, x: number): number {
  let l = 0
  for (const lp of LAMPS) l += lampLit(T, lp.on) * Math.max(0, 1 - Math.abs(x - lp.at[0]) / 2.6) * 0.25
  return l
}

/* ------------------------------------------------------------------ small drawing helpers */

function poly(p: p5, k: number, pts: Pt[]): void {
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}
function bar(p: p5, k: number, a: Pt, b: Pt, w0: number, w1 = w0): void {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  const nx = -(b[1] - a[1]) / L
  const ny = (b[0] - a[0]) / L
  poly(p, k, [
    [a[0] + (nx * w0) / 2, a[1] + (ny * w0) / 2],
    [b[0] + (nx * w1) / 2, b[1] + (ny * w1) / 2],
    [b[0] - (nx * w1) / 2, b[1] - (ny * w1) / 2],
    [a[0] - (nx * w0) / 2, a[1] - (ny * w0) / 2],
  ])
}
function alphaFill(p: p5, hex: string, a: number): void {
  const col = p.color(hex)
  col.setAlpha(255 * clamp01(a))
  p.fill(col)
}
function alphaStroke(p: p5, hex: string, a: number): void {
  const col = p.color(hex)
  col.setAlpha(255 * clamp01(a))
  p.stroke(col)
}
const rotAbout = (q: Pt, o: Pt, a: number): Pt => {
  const dx = q[0] - o[0]
  const dy = q[1] - o[1]
  return [o[0] + dx * Math.cos(a) - dy * Math.sin(a), o[1] + dx * Math.sin(a) + dy * Math.cos(a)]
}

/**
 * A spur gear: `teeth` teeth on pitch radius r, turned by `angle` (a tooth is centred on angle + j·2π/teeth). The body
 * is a ring on spokes (`spokes` > 0) or a solid web. `blur` 0..1 smears the spokes and teeth as it spins fast.
 */
function gear(
  p: p5,
  c: Pen,
  at: Pt,
  r: number,
  teeth: number,
  angle: number,
  o: { fill: string; ink: string; w: number; spokes?: number; rim?: number; hub?: number; blur?: number; lip?: string; spoke?: number },
): void {
  const { k } = c
  const add = 0.11
  const ded = 0.1
  const blur = clamp01(o.blur ?? 0)
  const rimIn = r - ded - (o.rim ?? 0.3)
  p.push()
  p.translate(at[0] * k, at[1] * k)
  p.strokeJoin(p.ROUND)
  p.stroke(o.ink)
  p.strokeWeight(o.w)
  p.fill(o.fill)
  const w = (Math.PI * 2) / teeth
  p.beginShape()
  for (let j = 0; j < teeth; j++) {
    const a0 = angle + j * w
    const pts: [number, number][] =
      blur > 0.6
        ? [[r + add * 0.3, a0 - 0.5 * w], [r + add * 0.3, a0]]
        : [
            [r - ded, a0 - 0.5 * w],
            [r - ded, a0 - 0.3 * w],
            [r + add, a0 - 0.17 * w],
            [r + add, a0 + 0.17 * w],
            [r - ded, a0 + 0.3 * w],
          ]
    for (const [rr, aa] of pts) p.vertex(Math.cos(aa) * rr * k, Math.sin(aa) * rr * k)
  }
  if (o.spokes) {
    p.beginContour()
    const n = 56
    for (let j = n; j > 0; j--) {
      const aa = (j / n) * Math.PI * 2
      p.vertex(Math.cos(aa) * rimIn * k, Math.sin(aa) * rimIn * k)
    }
    p.endContour()
  }
  p.endShape(p.CLOSE)
  if (o.lip) {
    // The rim's faces toward the fire (below) catch it: broad bands of light on the iron, not lines. The light is
    // fixed while the wheel turns under it, so a fast wheel keeps a steady lit rim.
    p.noFill()
    p.strokeCap(p.SQUARE)
    const band = (o.rim ?? 0.3) * 0.34
    alphaStroke(p, o.lip, 0.7)
    p.strokeWeight(band * k)
    p.arc(0, 0, (rimIn + band / 2) * 2 * k, (rimIn + band / 2) * 2 * k, Math.PI * 0.18, Math.PI * 0.82)
    alphaStroke(p, o.lip, 0.35)
    p.strokeWeight(band * 0.8 * k)
    p.arc(0, 0, (r - ded - band * 0.4) * 2 * k, (r - ded - band * 0.4) * 2 * k, Math.PI * 0.25, Math.PI * 0.75)
    p.strokeCap(p.ROUND)
  }
  if (o.spokes) {
    const hub = o.hub ?? 0.36
    const sw = o.spoke ?? 0.26
    const drawSpokes = (off: number, a: number, grow: number, inked: boolean) => {
      if (inked) {
        alphaStroke(p, o.ink, a)
        p.strokeWeight(o.w)
      } else p.noStroke()
      alphaFill(p, o.fill, a)
      for (let s = 0; s < o.spokes!; s++) {
        const aa = angle + off + (s / o.spokes!) * Math.PI * 2
        const ca = Math.cos(aa)
        const sa = Math.sin(aa)
        const nx = -sa
        const ny = ca
        const w0 = sw * grow
        const w1 = sw * 0.62 * grow
        p.beginShape()
        p.vertex((ca * hub * 0.8 + (nx * w0) / 2) * k, (sa * hub * 0.8 + (ny * w0) / 2) * k)
        p.vertex((ca * (rimIn + 0.03) + (nx * w1) / 2) * k, (sa * (rimIn + 0.03) + (ny * w1) / 2) * k)
        p.vertex((ca * (rimIn + 0.03) - (nx * w1) / 2) * k, (sa * (rimIn + 0.03) - (ny * w1) / 2) * k)
        p.vertex((ca * hub * 0.8 - (nx * w0) / 2) * k, (sa * hub * 0.8 - (ny * w0) / 2) * k)
        p.endShape(p.CLOSE)
      }
    }
    if (blur > 0.02) {
      // Too fast to see: the web a translucent disc of its own iron, the spokes two or three soft ghosts smeared
      // behind the true one (filled, never lines or rings).
      p.noStroke()
      alphaFill(p, o.fill, 0.22 + 0.4 * blur)
      p.circle(0, 0, (rimIn + 0.02) * 2 * k)
      const ghosts = blur > 0.5 ? 3 : 2
      for (let g = ghosts - 1; g >= 0; g--) {
        const a = g === 0 ? 1 - 0.7 * blur : (0.42 - 0.12 * g) * (0.5 + 0.5 * blur)
        drawSpokes(-g * 0.17 * blur, a, 1 + 0.9 * blur * (g + 1) * 0.5, g === 0 && blur < 0.3)
      }
    } else drawSpokes(0, 1, 1, true)
    p.stroke(o.ink)
    p.strokeWeight(o.w)
    p.fill(o.fill)
    p.circle(0, 0, hub * 2 * k)
    p.fill(mixHex(o.fill, o.ink, 0.22))
    p.push()
    p.rotate(angle)
    p.rectMode(p.CENTER)
    p.rect(0, 0, hub * 0.8 * k, hub * 0.8 * k, hub * 0.1 * k)
    p.pop()
  } else {
    p.noFill()
    p.stroke(o.ink)
    p.strokeWeight(o.w * 0.7)
    p.circle(0, 0, (r - ded - 0.1) * 2 * k)
    p.fill(mixHex(o.fill, o.ink, 0.2))
    p.strokeWeight(o.w)
    p.circle(0, 0, (o.hub ?? 0.18) * 2 * k)
    p.push()
    p.rotate(angle)
    p.line(-(o.hub ?? 0.18) * 0.6 * k, 0, (o.hub ?? 0.18) * 0.6 * k, 0)
    p.pop()
  }
  p.pop()
}

/* ------------------------------------------------------------------ the room */

/** The room's air: the drum's shaft comes in at the top left, the chimney goes up at the right. */
const HOLLOW: Pt[] = [
  [WALL_L, PIT + 0.4],
  [WALL_L - 0.08, -1.6],
  [WALL_L + 0.02, -3.9],
  [-1.46, -5.55],
  [SHAFT[0], -6.5],
  [SHAFT[1], -6.5],
  [0.62, -5.98],
  [1.6, -6.12],
  [2.9, -5.95],
  [4.2, -6.16],
  [5.6, -6.04],
  [7.1, -6.24],
  [8.6, -6.05],
  [10.1, -6.18],
  [11.6, -6.0],
  [CHIMNEY_X - CHIMNEY_HALF - 0.08, -6.08],
  [CHIMNEY_X - CHIMNEY_HALF, -6.5],
  [CHIMNEY_X + CHIMNEY_HALF, -6.5],
  [CHIMNEY_X + CHIMNEY_HALF + 0.1, -6.02],
  [14.7, -5.7],
  [WALL_R - 0.05, -4.6],
  [WALL_R + 0.05, -2.2],
  [WALL_R, PIT + 0.4],
]
/** Tunnel mouths: one in the pit's back wall (behind the anvil's left), one in the ledge's wall under its torch. */
export const DOORS: { x0: number; x1: number; floor: number; top: number }[] = [
  { x0: 1.28, x1: 2.25, floor: PIT, top: 0.75 },
  { x0: WALL_R - 0.62, x1: WALL_R + 0.02, floor: DECK, top: -1.85 },
]
const DRIPSTONE: { x: number; len: number; w: number }[] = [
  { x: 1.3, len: 0.3, w: 0.22 },
  { x: 3.7, len: 0.26, w: 0.2 },
  { x: 5.05, len: 0.4, w: 0.24 },
  { x: 8.1, len: 0.34, w: 0.22 },
  { x: 10.65, len: 0.28, w: 0.2 },
  { x: 14.6, len: 0.36, w: 0.24 },
]
function ceilingAt(x: number): number {
  for (let i = 0; i + 1 < HOLLOW.length; i++) {
    const [x0, y0] = HOLLOW[i]
    const [x1, y1] = HOLLOW[i + 1]
    if (x >= Math.min(x0, x1) && x <= Math.max(x0, x1) && y0 < -5 && y1 < -5) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1)
  }
  return -6.1
}

function drawRoom(p: p5, c: Pen, L: number, lift = 0): void {
  const { k } = c
  p.noStroke()
  // The back wall: dark rock, a little lighter with each mechanism the fire has lit (the runaway is the brightest
  // room in the mountain).
  p.fill(mixHex(mixHex(mixHex(STONE.deep, STONE.dark, 0.45), STONE.dark, L), STONE.mid, 0.3 * clamp01(lift)))
  poly(p, k, HOLLOW)
  // The tunnel mouths: a dark arch with a lit jamb.
  for (const d of DOORS) {
    const cx = (d.x0 + d.x1) / 2
    const hw = (d.x1 - d.x0) / 2
    const arch = (inset: number) => {
      p.beginShape()
      p.vertex((d.x0 - inset) * k, (d.floor + 0.02) * k)
      p.vertex((d.x0 - inset) * k, (d.top + hw * 0.6) * k)
      p.bezierVertex((d.x0 - inset) * k, (d.top - inset) * k, (cx - hw * 0.4) * k, (d.top - inset) * k, cx * k, (d.top - inset) * k)
      p.bezierVertex((cx + hw * 0.4) * k, (d.top - inset) * k, (d.x1 + inset) * k, (d.top - inset) * k, (d.x1 + inset) * k, (d.top + hw * 0.6) * k)
      p.vertex((d.x1 + inset) * k, (d.floor + 0.02) * k)
      p.endShape(p.CLOSE)
    }
    p.fill(tone(STONE.mid, L * 0.55))
    arch(0.1)
    p.fill(mixHex(STONE.deep, '#000000', 0.3))
    arch(0)
  }
  // The rock's grain on the back wall: a few long faint bands.
  p.noFill()
  alphaStroke(p, STONE.mid, 0.14 * L)
  p.strokeWeight(c.weight * 0.9)
  for (let i = 0; i < 3; i++) {
    const y = -4.8 + i * 1.3
    p.beginShape()
    for (let x = WALL_L + 0.6; x <= WALL_R - 0.6; x += 0.5) p.vertex(x * k, (y + 0.2 * Math.sin(x * 0.7 + i * 1.9) + 0.07 * Math.sin(x * 2.3 + i)) * k)
    p.endShape()
  }
  for (const d of DRIPSTONE) {
    const y = ceilingAt(d.x)
    p.noStroke()
    p.fill(tone(STONE.mid, L * 0.8))
    p.beginShape()
    p.vertex((d.x - d.w / 2) * k, (y - 0.05) * k)
    p.bezierVertex((d.x - d.w * 0.4) * k, (y + d.len * 0.4) * k, (d.x - 0.03) * k, (y + d.len * 0.8) * k, d.x * k, (y + d.len) * k)
    p.bezierVertex((d.x + 0.03) * k, (y + d.len * 0.8) * k, (d.x + d.w * 0.4) * k, (y + d.len * 0.4) * k, (d.x + d.w / 2) * k, (y - 0.05) * k)
    p.endShape(p.CLOSE)
  }
}

/** The furnace's mouth in the pit's back wall: a stone arch, the coals, the fire. */
function drawFurnace(p: p5, c: Pen, T: number, L: number): void {
  const { k } = c
  const { base, flare, heat } = fireAt(T)
  const x0 = FURNACE.x - FURNACE.w / 2
  const x1 = FURNACE.x + FURNACE.w / 2
  const top = FURNACE.top
  const bot = FURNACE.bottom
  const arch = (inset: number): Pt[] => {
    const pts: Pt[] = [[x0 - inset, bot]]
    const r = (x1 - x0) / 2 + inset
    const cy = top + r * 0.55
    for (let i = 0; i <= 16; i++) {
      const a = Math.PI + (i / 16) * Math.PI
      pts.push([FURNACE.x + Math.cos(a) * r, cy + Math.sin(a) * r * 0.55])
    }
    pts.push([x1 + inset, bot])
    return pts
  }
  p.stroke(inkOf(c, L * 0.8))
  p.strokeWeight(c.weight)
  p.fill(warm(tone(STONE.light, L * 0.8), flare))
  poly(p, k, arch(0.34))
  // Voussoirs: the arch's stones.
  p.noFill()
  alphaStroke(p, inkOf(c, L * 0.8), 0.55)
  const rr = (x1 - x0) / 2
  const cy = top + rr * 0.55
  for (let i = 1; i < 9; i++) {
    const a = Math.PI + (i / 9) * Math.PI
    p.line((FURNACE.x + Math.cos(a) * rr) * k, (cy + Math.sin(a) * rr * 0.55) * k, (FURNACE.x + Math.cos(a) * (rr + 0.34)) * k, (cy + Math.sin(a) * (rr + 0.34) * 0.55) * k)
  }
  p.stroke(inkOf(c, L * 0.8))
  p.fill(mixHex('#140d09', WORKS.rust, 0.3 * base + 0.2 * flare))
  poly(p, k, arch(0))
  const hot = clamp01(0.25 + 0.6 * base + 0.5 * flare)
  const coal = mixHex(mixHex('#2a1a12', WORKS.rust, hot), LAMP.flame, clamp01(heat * 0.55 + flare * 0.3))
  p.noStroke()
  p.fill(coal)
  p.beginShape()
  p.vertex((x0 + 0.1) * k, bot * k)
  for (let i = 0; i <= 12; i++) {
    const u = i / 12
    const x = lerp(x0 + 0.1, x1 - 0.1, u)
    const hgt = 0.45 + 0.18 * Math.sin(u * Math.PI) + 0.07 * Math.sin(i * 2.7 + 1)
    p.vertex(x * k, (bot - hgt) * k)
  }
  p.vertex((x1 - 0.1) * k, bot * k)
  p.endShape(p.CLOSE)
  p.fill(mixHex(coal, LAMP.core, 0.28 * hot))
  for (let i = 0; i < 7; i++) {
    const x = lerp(x0 + 0.35, x1 - 0.35, i / 6)
    const y = bot - 0.35 - 0.12 * Math.sin(i * 1.3)
    p.quad((x - 0.14) * k, y * k, x * k, (y - 0.08) * k, (x + 0.15) * k, (y + 0.02) * k, (x + 0.02) * k, (y + 0.09) * k)
  }
  if (base > 0.01) {
    for (let i = 0; i < 7; i++) {
      const x = lerp(x0 + 0.4, x1 - 0.4, i / 6)
      const h = (0.35 + 0.45 * base + 1.0 * flare * (0.7 + 0.3 * Math.sin(i * 2.1)) + 0.5 * heat) * (0.85 + 0.15 * flicker(T, i))
      flame(p, c, x, bot - 0.5 + 0.08 * Math.sin(i * 1.7), Math.min(h, bot - 0.5 - top - 0.25), T, i * 3 + 1, clamp01(base * 1.5))
    }
  }
}

/** Solid rock: the gallery and the ledge (blocks the trolls dressed), and the pit's floor. */
function drawFloors(p: p5, c: Pen, L: number): void {
  const { k } = c
  const face = tone(STONE.mid, L * 0.8)
  const lip = tone(STONE.light, L * 0.95)
  p.noStroke()
  p.fill(face)
  poly(p, k, [[GALLERY_LIP - 0.2, PIT], [LEDGE_LIP + 0.2, PIT], [LEDGE_LIP + 0.2, PIT + 0.45], [GALLERY_LIP - 0.2, PIT + 0.45]])
  p.fill(lip)
  p.rectMode(p.CORNER)
  p.rect(GALLERY_LIP * k, PIT * k, (LEDGE_LIP - GALLERY_LIP) * k, Math.max(1, 0.06 * k))
  // The gallery (its lip on its right) and the ledge (on its left).
  p.fill(face)
  poly(p, k, [[WALL_L - 0.3, DECK], [GALLERY_LIP, DECK], [GALLERY_LIP + 0.05, DECK + 0.6], [GALLERY_LIP - 0.04, 1.4], [GALLERY_LIP + 0.06, PIT + 0.45], [WALL_L - 0.3, PIT + 0.45]])
  poly(p, k, [[LEDGE_LIP, DECK], [WALL_R + 0.3, DECK], [WALL_R + 0.3, PIT + 0.45], [LEDGE_LIP - 0.06, PIT + 0.45], [LEDGE_LIP + 0.04, 1.4], [LEDGE_LIP - 0.05, DECK + 0.6]])
  p.fill(lip)
  p.rect((WALL_L - 0.3) * k, DECK * k, (GALLERY_LIP - WALL_L + 0.3) * k, Math.max(1, 0.06 * k))
  p.rect(LEDGE_LIP * k, DECK * k, (WALL_R + 0.3 - LEDGE_LIP) * k, Math.max(1, 0.06 * k))
  // Coursed stone in their faces, so they read as masonry the trolls laid.
  p.noFill()
  alphaStroke(p, STONE.deep, 0.45)
  p.strokeWeight(c.weight * 0.8)
  for (const [x0, x1] of [[WALL_L, GALLERY_LIP], [LEDGE_LIP, WALL_R]] as const) {
    for (let row = 0; row < 3; row++) {
      const y = DECK + 0.55 + row * 0.72
      p.line((x0 + 0.05) * k, y * k, (x1 - 0.05) * k, y * k)
      for (let j = 0; j < 6; j++) {
        const x = x0 + ((j + (row % 2) * 0.5 + 0.3) * (x1 - x0)) / 6
        if (x > x0 + 0.1 && x < x1 - 0.1) p.line(x * k, y * k, x * k, (y + 0.72) * k)
      }
    }
  }
}

/* ------------------------------------------------------------------ the hammer */

function drawHammer(p: p5, c: Pen, T: number, L: number): void {
  const { k } = c
  const lit = litAt(L, 1.8, lampsAt(T, 1.8))
  const ink = inkOf(c, lit)
  const w = c.weight
  const phi = hammerPhi(T)
  const f = fireAt(T).flare
  const timber = tone(WORKS.wood, lit)
  const timberLit = warm(tone(WORKS.timber, lit), f)
  const iron = warm(tone(IRON, lit), f)
  const steel = tone(WORKS.steel, lit)
  // The anvil's stone, and the anvil: a flat face, the horn toward the furnace, a waist, a broad foot.
  const [ax, ay] = ANVIL
  p.stroke(ink)
  p.strokeWeight(w)
  p.fill(tone(STONE.light, lit * 0.85))
  poly(p, k, [[ax - 0.42, ay + 0.34], [ax + 0.46, ay + 0.34], [ax + 0.52, PIT], [ax - 0.5, PIT]])
  p.fill(iron)
  p.beginShape()
  p.vertex((ax - 0.36) * k, ay * k)
  p.vertex((ax + 0.3) * k, ay * k)
  p.bezierVertex((ax + 0.5) * k, ay * k, (ax + 0.62) * k, (ay + 0.03) * k, (ax + 0.72) * k, (ay + 0.06) * k)
  p.bezierVertex((ax + 0.55) * k, (ay + 0.12) * k, (ax + 0.36) * k, (ay + 0.14) * k, (ax + 0.22) * k, (ay + 0.16) * k)
  p.vertex((ax + 0.14) * k, (ay + 0.26) * k)
  p.vertex((ax + 0.3) * k, (ay + 0.34) * k)
  p.vertex((ax - 0.34) * k, (ay + 0.34) * k)
  p.vertex((ax - 0.2) * k, (ay + 0.26) * k)
  p.vertex((ax - 0.24) * k, (ay + 0.14) * k)
  p.vertex((ax - 0.36) * k, (ay + 0.12) * k)
  p.endShape(p.CLOSE)
  const { ago } = since(OOM, T)
  const hot = knock(ago, 0.25) * (T >= OOM[0] ? 1 : 0)
  p.noStroke()
  p.fill(mixHex(steel, LAMP.core, 0.65 * hot))
  p.rectMode(p.CORNER)
  p.rect((ax - 0.34) * k, ay * k, 0.64 * k, 0.05 * k)

  // The frame on the gallery's edge: a post with the trunnion, and a beam out over the tail that holds the cam.
  const [px, py] = HAMMER.pivot
  p.stroke(ink)
  p.strokeWeight(w)
  p.fill(timber)
  poly(p, k, [[px - 0.17, DECK], [px - 0.11, CAM.at[1] - 0.34], [px + 0.11, CAM.at[1] - 0.34], [px + 0.17, DECK]])
  bar(p, k, [px - 0.08, CAM.at[1] + 0.3], [px - 0.6, DECK], 0.12)
  poly(p, k, [[CAM.at[0] - 0.2, CAM.at[1] - 0.44], [px + 0.15, CAM.at[1] - 0.44], [px + 0.15, CAM.at[1] - 0.25], [CAM.at[0] - 0.2, CAM.at[1] - 0.25]])
  p.fill(iron)
  poly(p, k, [[CAM.at[0] - 0.08, CAM.at[1] - 0.27], [CAM.at[0] + 0.08, CAM.at[1] - 0.27], [CAM.at[0] + 0.06, CAM.at[1]], [CAM.at[0] - 0.06, CAM.at[1]]])
  // The cam: a teardrop turning once a blow, its nose pressing the tail down.
  p.push()
  p.translate(CAM.at[0] * k, CAM.at[1] * k)
  p.rotate(camAngle(T))
  p.fill(iron)
  const b = CAM.base
  const n = 0.78
  p.beginShape()
  p.vertex(n * k, 0)
  p.bezierVertex(n * 0.6 * k, b * 0.9 * k, b * 0.6 * k, b * 1.05 * k, 0, b * k)
  p.bezierVertex(-b * 1.35 * k, b * 0.9 * k, -b * 1.35 * k, -b * 0.9 * k, 0, -b * k)
  p.bezierVertex(b * 0.6 * k, -b * 1.05 * k, n * 0.6 * k, -b * 0.9 * k, n * k, 0)
  p.endShape(p.CLOSE)
  p.fill(steel)
  p.rectMode(p.CENTER)
  p.rect(0, 0, 0.12 * k, 0.12 * k)
  p.pop()

  // The helve: timber, iron-banded; the head at its end.
  const t0 = onHelve(phi, -HAMMER.tail, 0)
  const t1 = onHelve(phi, HAMMER.head + 0.1, 0)
  p.stroke(ink)
  p.strokeWeight(w)
  p.fill(timberLit)
  bar(p, k, t0, t1, HAMMER.thick, HAMMER.thick * 1.18)
  p.fill(iron)
  for (const s of [-1.45, -0.2, 0.9, 1.85]) bar(p, k, onHelve(phi, s - 0.05, 0), onHelve(phi, s + 0.05, 0), HAMMER.thick + 0.05)
  p.push()
  p.translate(px * k, py * k)
  p.rotate(phi)
  p.fill(steel)
  p.rectMode(p.CENTER)
  p.rect(0, 0, 0.16 * k, 0.16 * k, 0.02 * k)
  p.pop()
  p.push()
  const hx = onHelve(phi, HAMMER.head, 0)
  p.translate(hx[0] * k, hx[1] * k)
  p.rotate(phi)
  p.fill(iron)
  const hw = HAMMER.headW / 2
  const hh = HAMMER.headH
  const ht = HAMMER.thick / 2
  p.beginShape()
  p.vertex(-hw * k, -(ht + 0.06) * k)
  p.vertex(hw * k, -(ht + 0.06) * k)
  p.vertex(hw * k, (ht + hh - 0.08) * k)
  p.vertex((hw - 0.06) * k, (ht + hh) * k)
  p.vertex(-(hw - 0.06) * k, (ht + hh) * k)
  p.vertex(-hw * k, (ht + hh - 0.08) * k)
  p.endShape(p.CLOSE)
  p.fill(steel)
  p.rectMode(p.CORNER)
  p.rect(-hw * k, (ht + 0.14) * k, hw * 2 * k, 0.07 * k)
  p.pop()
}

/** Sparks off the anvil on every blow: short bright streaks thrown up and out, falling, gone in half a second. */
function drawSparks(p: p5, c: Pen, T: number): void {
  const { k } = c
  const { i } = since(OOM, T)
  for (let j = Math.max(0, i - 1); j <= i; j++) {
    const a = T - OOM[j]
    if (a < 0 || a > 0.7) continue
    const first = j === 0
    const n = first ? 16 : 9
    for (let s = 0; s < n; s++) {
      const h1 = hash(j, s, 3)
      const h2 = hash(j, s, 7)
      // The first blow throws its sparks right, into the furnace's mouth: they light it.
      const ang = first ? -0.65 + 0.7 * h1 : -Math.PI / 2 + (h1 - 0.5) * 2.4
      const sp = first ? 4.0 + 2.4 * h2 : 2.2 + 2.6 * h2
      const vx = Math.cos(ang) * sp
      const vy = Math.sin(ang) * sp
      const life = first ? 0.55 : 0.3 + 0.35 * hash(j, s, 11)
      if (a > life) continue
      const x = ANVIL[0] + 0.1 + vx * a
      const y = ANVIL[1] - 0.02 + vy * a + 0.5 * 9 * a * a
      const dt = 0.035
      alphaStroke(p, s % 3 ? LAMP.flame : LAMP.core, 1 - a / life)
      p.strokeWeight(c.weight * 0.9)
      p.line(x * k, y * k, (x - vx * dt) * k, (y - (vy + 9 * a) * dt) * k)
    }
  }
}

/* ------------------------------------------------------------------ the bellows */

/** A bellows lying on the floor, its nozzle toward the fire: two boards and the leather between; `open` 0..1. */
function bellows(p: p5, c: Pen, x0: number, x1: number, floor: number, open: number, nozzleRight: boolean, lit: number, size = 1): void {
  const { k } = c
  const ink = inkOf(c, lit)
  const noz = nozzleRight ? x1 : x0
  const back = nozzleRight ? x0 : x1
  const dir = nozzleRight ? 1 : -1
  const hBack = (0.14 + 0.5 * open) * size
  const bottom = floor - 0.08
  const topBack: Pt = [back, bottom - 0.1 - hBack]
  const topNoz: Pt = [noz - dir * 0.28 * size, bottom - 0.14]
  p.stroke(ink)
  p.strokeWeight(c.weight)
  p.fill(tone(mixHex(WORKS.rope, WORKS.wood, 0.45), lit))
  poly(p, k, [[noz - dir * 0.28 * size, bottom - 0.06], [back, bottom - 0.06], topBack, topNoz])
  p.noFill()
  alphaStroke(p, ink, 0.6)
  for (let j = 1; j <= 3; j++) {
    const u = j / 4
    const xb = lerp(noz - dir * 0.28 * size, back, u)
    const yt = lerp(topNoz[1], topBack[1], u)
    const mid = yt + (bottom - 0.06 - yt) * 0.5
    p.line(xb * k, (bottom - 0.06) * k, (xb - dir * 0.08) * k, mid * k)
    p.line((xb - dir * 0.08) * k, mid * k, xb * k, yt * k)
  }
  p.stroke(ink)
  p.fill(tone(WORKS.timber, lit))
  bar(p, k, [noz - dir * 0.28 * size, bottom], [back + dir * 0.06, bottom], 0.1)
  bar(p, k, topNoz, [topBack[0] + dir * 0.06, topBack[1]], 0.1)
  p.fill(tone(IRON, lit))
  poly(p, k, [[noz - dir * 0.3 * size, bottom - 0.2], [noz + dir * 0.12, bottom - 0.12], [noz + dir * 0.12, bottom - 0.06], [noz - dir * 0.3 * size, bottom + 0.0]])
}

/**
 * The great bellows (118.72, "everything"): two cells long, raised on a trestle at its nozzle end so it points up
 * into the furnace's mouth, its boards closing hard on every stroke. Drawn in front of the troll who works it.
 */
const GREAT = { x0: 7.05, x1: 9.05, tilt: 0.2, size: 1.45 }
function drawGreatBellows(p: p5, c: Pen, T: number, lit: number): void {
  const { k } = c
  const open = T < BELLOWS - 0.2 ? 0.8 : bellowsOpen(T, BELLOWS - 0.2)
  const pivot: Pt = [GREAT.x1, PIT - 0.08]
  // The trestle under the raised nozzle end: two splayed legs and a cross-bar.
  const lift = (GREAT.x1 - GREAT.x0 - 0.35) * Math.sin(GREAT.tilt)
  const lx = GREAT.x0 + 0.45
  p.stroke(inkOf(c, lit))
  p.strokeWeight(c.weight)
  p.fill(tone(WORKS.wood, lit * 0.9))
  bar(p, k, [lx - 0.22, PIT], [lx, PIT - 0.1 - lift], 0.1, 0.08)
  bar(p, k, [lx + 0.22, PIT], [lx, PIT - 0.1 - lift], 0.1, 0.08)
  p.push()
  p.translate(pivot[0] * k, pivot[1] * k)
  p.rotate(GREAT.tilt)
  p.translate(-pivot[0] * k, -pivot[1] * k)
  bellows(p, c, GREAT.x0, GREAT.x1, PIT, open, false, lit, GREAT.size)
  p.pop()
}

/** How open a bellows is at T: it closes onto every flare (the puff), and opens again slowly. */
function bellowsOpen(T: number, from: number): number {
  if (T < from) return 0.85
  const { i, ago } = since(PAH, T)
  const next = PAH[i + 1]
  const close = 0.13
  if (next !== undefined && next - T < close) return lerp(0.85, 0.1, (1 - (next - T) / close) ** 2)
  if (i < 0) return 0.85
  return lerp(0.1, 0.85, 1 - Math.exp(-ago / 0.14))
}

/* ------------------------------------------------------------------ the flywheel and the pinion */

const FLY_W = (Math.PI * 2) / FLYWHEEL.teeth
/** The flywheel's teeth are set so a gap is where he lands, and stays under him as it turns. */
const FLY_PHASE = LAND_ANGLE - 0.5 * FLY_W
const PIN_W = (Math.PI * 2) / PINION.teeth
const MESH = Math.atan2(PINION_AT[1] - FLYWHEEL.at[1], PINION_AT[0] - FLYWHEEL.at[0])
/** The pinion's teeth set to fall between the flywheel's at the mesh. */
const PIN_PHASE = (() => {
  const frac = (x: number) => x - Math.floor(x)
  const uf = frac((MESH - FLY_PHASE - flyAngle(FLY)) / FLY_W)
  return MESH + Math.PI - pinionAngle(FLY) - frac(0.5 - uf) * PIN_W
})()

function drawFlywheelFrame(p: p5, c: Pen, lit: number): void {
  const { k } = c
  const [fx, fy] = FLYWHEEL.at
  p.stroke(inkOf(c, lit))
  p.strokeWeight(c.weight)
  p.fill(tone(WORKS.wood, lit * 0.9))
  bar(p, k, [fx - 1.35, PIT], [fx - 0.12, fy + 0.1], 0.32, 0.22)
  bar(p, k, [fx + 1.35, PIT], [fx + 0.12, fy + 0.1], 0.32, 0.22)
  bar(p, k, [fx - 0.92, 0.95], [fx + 0.92, 0.95], 0.14)
}

/** The flywheel's halves after the break: when they hit the pit's floor (the furnace blasts out as they do). */
const HALF_TEAR = 0.1
const HALF_FALL = 0.42
export const HALVES_LAND = BREAK + HALF_TEAR + HALF_FALL
/**
 * Where one half of the flywheel is at T (side 1 or -1 of the split): the wheel's centre as that half carries it, and
 * how far it has turned. It tears off along the split (0.1 s), falls to the pit's floor turning (gravity), lands on its
 * rim and rolls on it, rocking to rest bowl-down (a half disc rests with its cut face up), the two apart.
 */
function halfPose(side: number, T: number): { x: number; y: number; turn: number } {
  const [fx, fy] = FLYWHEEL.at
  const Rr = FLY_R + 0.12
  const d: Pt = [Math.cos(SPLIT_DIR), Math.sin(SPLIT_DIR)]
  const out: Pt = [-d[1] * side, d[0] * side]
  // Turned so this half's inside points straight down: at rest on its rim. The nearer of the two ways round.
  let rest = Math.PI / 2 - Math.atan2(out[1], out[0])
  while (rest > Math.PI) rest -= 2 * Math.PI
  while (rest < -Math.PI) rest += 2 * Math.PI
  const dir = Math.sign(out[0]) || side
  // Lands turned a little past its rest toward where it is going, and rolls back and forth to rest.
  const over = -dir * 0.42
  const restX = fx + dir * 1.75
  const floorY = PIT - Rr
  const a = T - BREAK
  if (a <= 0) return { x: fx, y: fy, turn: 0 }
  if (a < HALF_TEAR) {
    const u = ease(a / HALF_TEAR)
    return { x: fx + out[0] * 0.14 * u, y: fy + out[1] * 0.14 * u, turn: side * 0.06 * u }
  }
  const x0 = fx + out[0] * 0.14
  const y0 = fy + out[1] * 0.14
  const landX = restX + Rr * over
  if (a < HALF_TEAR + HALF_FALL) {
    const u = (a - HALF_TEAR) / HALF_FALL
    const turn = lerp(side * 0.06, rest + over, u * (0.6 + 0.4 * u))
    return { x: lerp(x0, landX, 1 - (1 - u) * (1 - u)), y: y0 + (floorY - y0) * u * u, turn }
  }
  // On the floor: a damped rock about the rest, rolling on the rim (x follows the turn).
  const b = a - HALF_TEAR - HALF_FALL
  const rock = over * Math.exp(-b / 0.45) * Math.cos(b * 7.5)
  return { x: restX + Rr * rock, y: floorY, turn: rest + rock }
}

function drawFlywheel(p: p5, c: Pen, T: number, L: number): void {
  const { k } = c
  const [fx, fy] = FLYWHEEL.at
  const aw = awake(T, FLY)
  const lit = litAt(L, fx, lampsAt(T, fx)) * aw
  const ink = inkOf(c, lit)
  const f = fireAt(T).flare * aw
  // The hero's weight: a near-black silhouette against the fire until it engages; then a lit iron face (about 0.6
  // of full light), warmed on the flares; its lower half stands dark against the fire behind it.
  const face = clamp01(L * 1.25) * 0.64 * aw
  const iron = warm(tone(IRON_FACE, face), f * 0.5)
  drawFlywheelFrame(p, c, lit)
  const spin = Math.abs(flySpin(T))
  const lip = mixHex(iron, warm(mixHex(tone(WORKS.steel, face + 0.2), LAMP.glow, 0.25), f), woken(T, FLY))
  const opts = { fill: iron, ink, w: c.weight * 0.9, spokes: FLYWHEEL.spokes, rim: 0.62, hub: 0.62, blur: clamp01((spin - 2.2) / 3.5), lip, spoke: 0.44 }
  const angle = FLY_PHASE + flyAngle(T)
  const split = flySplit(T)
  if (split <= 0) {
    gear(p, c, FLYWHEEL.at, FLY_R, FLYWHEEL.teeth, angle, opts)
  } else {
    // Split along the line the spindle struck: the two halves tear off the axle, fall into the pit (one tumbling
    // over as it goes), crash onto its floor in front of the furnace, and rock to rest bowl-down on their rims.
    const d: Pt = [Math.cos(SPLIT_DIR), Math.sin(SPLIT_DIR)]
    const nrm: Pt = [-d[1], d[0]]
    const ctx = p.drawingContext as CanvasRenderingContext2D
    for (const side of [1, -1]) {
      const R = FLY_R + 0.4
      const half: Pt[] = [
        [fx + d[0] * R, fy + d[1] * R],
        [fx + d[0] * R + nrm[0] * side * R, fy + d[1] * R + nrm[1] * side * R],
        [fx - d[0] * R + nrm[0] * side * R, fy - d[1] * R + nrm[1] * side * R],
        [fx - d[0] * R, fy - d[1] * R],
      ]
      const pose = halfPose(side, T)
      p.push()
      p.translate(pose.x * k, pose.y * k)
      p.rotate(pose.turn)
      p.translate(-fx * k, -fy * k)
      ctx.save()
      ctx.beginPath()
      half.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
      ctx.closePath()
      ctx.clip()
      gear(p, c, FLYWHEEL.at, FLY_R, FLYWHEEL.teeth, angle, { ...opts, blur: clamp01((spin - 2.2) / 3.5) * (1 - split) })
      ctx.restore()
      // The broken edge: a jagged dark crack along the cut.
      p.stroke(ink)
      p.strokeWeight(c.weight * 1.2)
      p.noFill()
      p.beginShape()
      for (let j = -6; j <= 6; j++) {
        const t = (j / 6) * (FLY_R + 0.1)
        const jag = 0.06 * (hash(j, side, 5) - 0.5)
        p.vertex((fx + d[0] * t + nrm[0] * (side * 0.02 + jag)) * k, (fy + d[1] * t + nrm[1] * (side * 0.02 + jag)) * k)
      }
      p.endShape()
      p.pop()
    }
  }
  // The bearing block over the hub.
  if (split <= 0) {
    p.stroke(ink)
    p.strokeWeight(c.weight)
    p.fill(tone(WORKS.steel, lit * 0.9))
    p.rectMode(p.CENTER)
    p.rect(fx * k, (fy - 0.02) * k, 0.28 * k, 0.28 * k, 0.03 * k)
  }
}

function drawPinion(p: p5, c: Pen, T: number, L: number): void {
  const { k } = c
  let at = pinionAt(T)
  const lit = litAt(L, at[0], lampsAt(T, at[0])) * 0.95 * awake(T, FLY)
  const ink = inkOf(c, lit)
  // After the break its arm has snapped and it has dropped to the pit's floor.
  const fall = T >= BREAK ? ease((T - BREAK) / 0.35) : 0
  if (fall > 0) at = [at[0] + 0.25 * fall, lerp(at[1], PIT - PINION_R - 0.11, fall)]
  p.stroke(ink)
  p.strokeWeight(c.weight)
  p.fill(tone(STONE.light, lit * 0.8))
  poly(p, k, [[PINION_PIVOT[0] - 0.3, PINION_PIVOT[1] + 0.2], [PINION_PIVOT[0] + 0.3, PINION_PIVOT[1] + 0.2], [PINION_PIVOT[0] + 0.38, PIT], [PINION_PIVOT[0] - 0.38, PIT]])
  p.fill(tone(IRON, lit))
  if (fall <= 0) bar(p, k, PINION_PIVOT, at, 0.2, 0.16)
  else bar(p, k, PINION_PIVOT, [PINION_PIVOT[0] + 0.45, PINION_PIVOT[1] - 0.35], 0.2, 0.17)
  gear(p, c, at, PINION_R, PINION.teeth, PIN_PHASE + pinionAngle(Math.min(T, BREAK)) + fall * 0.6, { fill: tone(WORKS.steel, lit * 0.85), ink, w: c.weight, hub: 0.13 })
  p.fill(tone(WORKS.steel, lit))
  p.rectMode(p.CENTER)
  p.rect(PINION_PIVOT[0] * k, PINION_PIVOT[1] * k, 0.18 * k, 0.18 * k, 0.03 * k)
}

/* ------------------------------------------------------------------ the pumps, the pipe and the valve */

function drawPistons(p: p5, c: Pen, T: number, L: number): void {
  const { k } = c
  const lit = litAt(L, 10.5, lampsAt(T, 10.5)) * awake(T, PISTONS)
  const ink = inkOf(c, lit)
  const f = fireAt(T).flare * woken(T, PISTONS)
  const iron = warm(tone(IRON_FACE, lit * 0.9), f * 0.5)
  const dark = tone(IRON, lit * 0.8)
  const steel = tone(WORKS.steel, lit)
  p.stroke(ink)
  p.strokeWeight(c.weight)
  p.rectMode(p.CORNER)
  // The pumps' case along the pit's floor, and the pipe from its end, in under the ledge to the rising main.
  const cx0 = PISTON_X[0] - 0.6
  const cx1 = PISTON_X[2] + 0.62
  p.fill(dark)
  p.rect(cx0 * k, 1.72 * k, (cx1 - cx0) * k, (PIT - 1.72) * k, 0.08 * k)
  p.noStroke()
  p.fill(steel)
  for (let x = cx0 + 0.3; x < cx1 - 0.1; x += 0.5) p.rect((x - 0.03) * k, 1.84 * k, 0.06 * k, 0.06 * k)
  for (let i = 0; i < 3; i++) {
    const x = PISTON_X[i]
    const top = pistonTop(i, T)
    p.stroke(ink)
    p.strokeWeight(c.weight)
    // The cylinder (a pump barrel), its glands.
    p.fill(iron)
    p.rect((x - 0.32) * k, 0.6 * k, 0.64 * k, (1.72 - 0.6) * k, 0.05 * k)
    p.fill(steel)
    p.rect((x - 0.38) * k, 0.52 * k, 0.76 * k, 0.15 * k, 0.03 * k)
    p.rect((x - 0.38) * k, 1.6 * k, 0.76 * k, 0.13 * k, 0.03 * k)
    // The rod, and the crosshead on it: a heavy flat head.
    p.fill(steel)
    p.rect((x - 0.08) * k, (top + HEAD_T) * k, 0.16 * k, (0.54 - top - HEAD_T) * k)
    p.fill(iron)
    p.rect((x - HEAD_W / 2) * k, top * k, HEAD_W * k, (HEAD_T + 0.04) * k, 0.03 * k)
    p.fill(dark)
    p.rect((x - 0.14) * k, (top + HEAD_T + 0.02) * k, 0.28 * k, 0.1 * k, 0.02 * k)
    p.noStroke()
    p.fill(warm(steel, f))
    p.rect((x - HEAD_W / 2 + 0.05) * k, (top + 0.02) * k, (HEAD_W - 0.1) * k, 0.04 * k)
  }
}

/** The pipe from the pumps under the ledge to the rising main at the chimney's foot, and the valve on it. */
function drawPipe(p: p5, c: Pen, T: number, L: number): void {
  const { k } = c
  const lit = litAt(L, 13, lampsAt(T, 13.5)) * awake(T, PISTONS)
  const ink = inkOf(c, lit)
  const iron = tone(IRON, lit)
  const steel = tone(WORKS.steel, lit)
  const x0 = PISTON_X[2] + 0.6
  const r = 0.11
  p.stroke(ink)
  p.strokeWeight(c.weight)
  p.fill(iron)
  p.rectMode(p.CORNER)
  // Along under the ledge (the section through its rock shows it), up to the main's foot, and a branch to the valve.
  p.rect(x0 * k, (PIPE_Y - r) * k, (VALVE.x + r - x0) * k, 2 * r * k)
  p.rect((CHIMNEY_X - r) * k, 1.15 * k, 2 * r * k, (PIPE_Y - 1.15) * k)
  p.rect((VALVE.x - r) * k, (DECK + 0.02) * k, 2 * r * k, (PIPE_Y - DECK) * k)
  p.fill(steel)
  for (const fx of [x0 + 0.08, LEDGE_LIP + 0.25, CHIMNEY_X + 0.35]) p.rect((fx - 0.05) * k, (PIPE_Y - r - 0.05) * k, 0.1 * k, (2 * r + 0.1) * k, 0.02 * k)
  p.rect((CHIMNEY_X - r - 0.05) * k, 1.3 * k, (2 * r + 0.1) * k, 0.1 * k, 0.02 * k)
  // The joints leak in the runaway: a spurt of spray on every blow, more as it goes.
  if (T >= GOVERNOR && T < BREAK + 1.5) {
    const { ago } = since(OOM, T)
    const leak = smoothstep(T, GOVERNOR, BREAK) * (Number.isFinite(ago) ? Math.exp(-ago / 0.2) : 0)
    for (const [jx, jy, dx] of [[LEDGE_LIP + 0.25, PIPE_Y - r - 0.02, -0.25], [CHIMNEY_X + 0.35, PIPE_Y - r - 0.02, 0.2]] as const) {
      for (let s = 0; s < 4; s++) {
        const a = Number.isFinite(ago) ? ago : 1
        const u = clamp01(a / 0.35)
        const x = jx + dx * u * (0.6 + 0.4 * hash(s, 1, 3)) + 0.05 * s
        const y = jy - 0.35 * u * (0.7 + 0.3 * hash(s, 2, 3)) + 0.9 * u * u * 0.3
        alphaStroke(p, mixHex(STONE.wet, SKY.star, 0.4), 0.7 * leak * (1 - u))
        p.strokeWeight(c.weight * 0.9)
        p.line(jx * k, jy * k, x * k, y * k)
      }
    }
  }
  // The valve on the ledge: a squat body on the branch, its spindle, and the weighted lever over it.
  const vx = VALVE.x
  p.stroke(ink)
  p.fill(iron)
  p.rect((vx - 0.2) * k, (DECK - 0.3) * k, 0.4 * k, 0.32 * k, 0.05 * k)
  p.fill(steel)
  p.rect((vx - 0.25) * k, (DECK - 0.36) * k, 0.5 * k, 0.08 * k, 0.02 * k)
  const lift = valveLift(T)
  const [pvx, pvy] = VALVE.pivot
  const end: Pt = [pvx + VALVE.len * Math.cos(-lift), pvy + VALVE.len * Math.sin(-lift)]
  // The spindle from the valve up to the lever.
  const onLever = pvy - (vx - pvx) * Math.tan(lift)
  p.rect((vx - 0.04) * k, onLever * k, 0.08 * k, (DECK - 0.36 - onLever) * k)
  // The lever's post and the lever.
  p.fill(tone(WORKS.wood, lit))
  p.rect((pvx - 0.07) * k, pvy * k, 0.14 * k, (DECK - pvy) * k)
  p.fill(iron)
  bar(p, k, [pvx - 0.05, pvy], end, 0.1, 0.08)
  // The weight at its end: a flat iron slab hung on a hook (not round).
  const wt: Pt = [end[0] - 0.05, end[1] + 0.12]
  p.line((end[0] - 0.05) * k, end[1] * k, wt[0] * k, wt[1] * k)
  p.rect((wt[0] - 0.14) * k, wt[1] * k, 0.28 * k, 0.2 * k, 0.03 * k)
  // The blow: steam out of the valve in soft billows that rise, spread and thin (never a solid jet).
  drawSteam(p, c, vx, DECK - 0.4, T)
}

/**
 * The safety valve's steam: soft billows that rise from its mouth, spreading and thinning as they go. A stream of
 * small puffs (choked while the keeper holds the lever down, full once it throws him), a bigger billow on every blow.
 * Each puff is three unequal lobes at low alpha, so they merge into cloud and never read as beads or a cone.
 */
const STEAM_DT = 0.075
const STEAM_LIFE = 1.35
function drawSteam(p: p5, c: Pen, x0: number, y0: number, T: number): void {
  if (T < VALVE_AT - 0.02 || T > BREAK + 0.6 + STEAM_LIFE) return
  const { k } = c
  const cool = mixHex(STONE.wet, SKY.star, 0.5)
  // The side toward the forge is warmed by it.
  const fired = mixHex(cool, LAMP.glow, 0.18)
  p.noStroke()
  const puff = (e: number, s: number, big: boolean, seed: number) => {
    const a = T - e
    if (a < 0 || a > STEAM_LIFE || s <= 0.01) return
    const u = a / STEAM_LIFE
    const v0 = (2.0 + 2.4 * s) * (big ? 1.2 : 1)
    const tau = 0.5
    const rise = v0 * tau * (1 - Math.exp(-a / tau))
    const drift = (hash(seed, 7, 1) - 0.5) * 0.8 * u + 0.2 * u * u
    const r = (0.09 + (big ? 0.78 : 0.5) * Math.pow(u, 0.55)) * (0.75 + 0.5 * s) * (0.8 + 0.4 * hash(seed, 3, 2))
    // Thin at the mouth (a young puff is small and would read as a bead), fullest as it opens out, thinning away.
    const alpha = (big ? 0.26 : 0.15) * s * Math.pow(1 - u, 1.7) * smoothstep(a, 0, 0.16)
    const cx = x0 + drift
    const cy = y0 - 0.05 - rise
    for (let j = 0; j < 3; j++) {
      const ang = hash(seed, j, 4) * Math.PI * 2 + a * 1.1 * (j % 2 ? 1 : -1)
      const d = r * 0.55
      const rr = r * (0.58 + 0.34 * hash(seed, j, 5))
      alphaFill(p, j === 0 ? fired : cool, alpha)
      p.ellipse((cx + Math.cos(ang) * d) * k, (cy + Math.sin(ang) * d * 0.6) * k, rr * 2.5 * k, rr * 1.8 * k)
    }
  }
  const j0 = Math.max(0, Math.ceil((T - STEAM_LIFE - VALVE_AT) / STEAM_DT))
  const j1 = Math.floor((T - VALVE_AT) / STEAM_DT)
  for (let j = j0; j <= j1; j++) {
    const e = VALVE_AT + j * STEAM_DT
    const { ago } = since(OOM, e)
    const pulse = Number.isFinite(ago) && ago >= 0 ? 0.5 + 0.5 * Math.exp(-ago / 0.12) : 0.5
    puff(e, valveSpit(e) * pulse, false, j)
  }
  for (let i = 0; i < OOM.length; i++) {
    const e = OOM[i]
    if (e > T) break
    if (e < VALVE_AT - 0.02 || e < T - STEAM_LIFE) continue
    puff(e + 0.01, valveSpit(e + 0.01), true, 500 + i)
  }
}

/* ------------------------------------------------------------------ the governor */

/**
 * Its weights, once they fly: from where each let go, thrown out and up, and down under their weight onto the floor
 * below (the pit's, or the ledge's after striking the wall), where they lie: nothing hangs in the air or vanishes.
 */
function flyingWeight(j: number, T: number): Pt | null {
  const t0 = GOV_WEIGHTS[j]
  if (T < t0) return null
  const a = T - t0
  const alpha = govAlpha(t0)
  const r = GOV.arm * Math.sin(alpha)
  const y0 = GOV.top + GOV.arm * Math.cos(alpha)
  const side = j === 0 ? -1 : 1
  const vx = j === 0 ? 5.2 : 3.4
  const g = 12
  const x0 = GOV.x + side * r
  let x = x0 + side * vx * a
  // The east one strikes the wall and drops down it.
  const wall = WALL_R - 0.4
  if (x > wall) x = wall
  const floor = (x > LEDGE_LIP ? DECK : PIT) - 0.24
  const y = y0 - 3.0 * a + 0.5 * g * a * a
  if (y < floor) return [x, y]
  // Down: where it lands it lies, with a small skip.
  const land = (3.0 + Math.sqrt(9 + 2 * g * (floor - y0))) / g
  const after = a - land
  return [x, floor - 0.12 * Math.max(0, Math.sin(after * 11)) * Math.exp(-after / 0.12)]
}

function drawGovernor(p: p5, c: Pen, T: number, L: number, part: 'back' | 'front'): void {
  const { k } = c
  const on = T >= GOVERNOR
  const lit = litAt(L, GOV.x, lampsAt(T, GOV.x) + (on ? 0.1 : 0)) * awake(T, GOVERNOR)
  const ink = inkOf(c, lit)
  const iron = tone(IRON_FACE, lit * 0.9)
  const steel = tone(WORKS.steel, lit)
  const gx = GOV.x
  const foot: Pt = [gx, DECK - 0.55]
  const fall = spindleFall(T)
  // Every point above the base turns with the spindle's fall (about its foot).
  const tp = (q: Pt): Pt => (fall ? rotAbout(q, foot, fall) : q)
  const alpha = govAlpha(Math.min(T, GOV_SNAP))
  const spin = govSpin(Math.min(T, GOV_SNAP + 0.3))
  const a = GOV.arm
  const top = GOV.top
  const sy = sleeveY(Math.min(T, GOV_SNAP))
  const wy = top + a * Math.cos(alpha)
  const r = a * Math.sin(alpha)
  const wts = [0, Math.PI].map((o, j) => ({ j, x: gx + r * Math.cos(spin + o), front: Math.sin(spin + o) > 0, gone: T >= GOV_WEIGHTS[j] }))
  const bell = (q: Pt) => {
    const [x, y] = q
    p.stroke(ink)
    p.strokeWeight(c.weight)
    p.fill(iron)
    p.beginShape()
    p.vertex((x - 0.13) * k, (y - 0.24) * k)
    p.vertex((x + 0.13) * k, (y - 0.24) * k)
    p.bezierVertex((x + 0.16) * k, (y - 0.02) * k, (x + 0.3) * k, (y + 0.1) * k, (x + 0.3) * k, (y + 0.24) * k)
    p.vertex((x - 0.3) * k, (y + 0.24) * k)
    p.bezierVertex((x - 0.3) * k, (y + 0.1) * k, (x - 0.16) * k, (y - 0.02) * k, (x - 0.13) * k, (y - 0.24) * k)
    p.endShape(p.CLOSE)
    p.noStroke()
    p.fill(steel)
    p.rectMode(p.CORNER)
    p.rect((x - 0.26) * k, (y + 0.14) * k, 0.52 * k, 0.05 * k)
  }
  // Its arms are forged bars with weight, not wires.
  const rod = (a0: Pt, b0: Pt) => {
    const A = tp(a0)
    const B = tp(b0)
    p.stroke(ink)
    p.strokeWeight(c.weight * 0.6)
    p.fill(iron)
    bar(p, k, A, B, 0.19, 0.15)
  }
  const arms = (wt: (typeof wts)[number]) => {
    if (wt.gone) {
      // Its arm snapped: a stub off the pivot, swinging.
      const since0 = T - GOV_WEIGHTS[wt.j]
      const ang = Math.atan2(wy - top, wt.x - gx) + 0.6 * Math.sin(since0 * 9) * Math.exp(-since0 / 0.6)
      rod([gx, top], [gx + 0.7 * Math.cos(ang), top + 0.7 * Math.sin(ang)])
      return
    }
    rod([gx, top], [wt.x, wy])
    rod([wt.x, wy], [gx, sy])
  }
  if (part === 'back') {
    // The base on the ledge (its bevel gears inside), and the lever the keeper throws.
    p.stroke(ink)
    p.strokeWeight(c.weight)
    p.fill(tone(IRON_DARK, lit))
    p.rectMode(p.CORNER)
    p.rect((gx - 0.38) * k, (DECK - 0.5) * k, 0.76 * k, 0.5 * k, 0.05 * k)
    p.fill(steel)
    p.rect((gx - 0.44) * k, (DECK - 0.57) * k, 0.88 * k, 0.1 * k, 0.02 * k)
    const la = govLever(T)
    const lv = GOV_LEVER
    const lend: Pt = [lv.pivot[0] + lv.len * Math.sin(la), lv.pivot[1] - lv.len * Math.cos(la)]
    p.fill(iron)
    bar(p, k, lv.pivot, lend, 0.09, 0.07)
    p.fill(tone(WORKS.wood, lit))
    bar(p, k, lend, [lend[0] + 0.12 * Math.sin(la), lend[1] - 0.12 * Math.cos(la)], 0.12)
    for (const wt of wts) if (!wt.front) {
      arms(wt)
      if (!wt.gone) bell(tp([wt.x, wy]))
    }
    // The spindle, snapped at its foot once it falls.
    const s0 = tp([gx, top])
    const s1 = tp(foot)
    // A turned steel shaft with body, not a stroke.
    p.stroke(ink)
    p.strokeWeight(c.weight * 0.7)
    p.fill(steel)
    bar(p, k, s0, s1, 0.15)
    // The cap on top.
    p.push()
    p.translate(s0[0] * k, s0[1] * k)
    p.rotate(fall)
    p.stroke(ink)
    p.strokeWeight(c.weight)
    p.fill(iron)
    p.triangle(-0.17 * k, 0.05 * k, 0.17 * k, 0.05 * k, 0, -0.24 * k)
    p.pop()
  } else {
    for (const wt of wts) if (wt.front) {
      arms(wt)
      if (!wt.gone) bell(tp([wt.x, wy]))
    }
    for (let j = 0; j < 2; j++) {
      const q = flyingWeight(j, T)
      if (q) bell(q)
    }
    // The sleeve's collar.
    const col = tp([gx, sy])
    p.push()
    p.translate(col[0] * k, col[1] * k)
    p.rotate(fall)
    p.stroke(ink)
    p.strokeWeight(c.weight)
    p.fill(steel)
    p.rectMode(p.CENTER)
    p.rect(0, 0, 0.4 * k, 0.26 * k, 0.04 * k)
    p.pop()
    // The yoke hung from the collar, its seat out under the chimney. When it goes it swings away from under him.
    // The arm hangs level from its bar; its seat end flexes down under his landings (`yokeGive`).
    const seat = yokeHangY(T) - sy
    const give = yokeSeatY(T) - yokeHangY(T)
    const swing = T < YOKE_GOES ? 0 : 1.35 * ease((T - YOKE_GOES) / 0.3) + 0.12 * Math.sin((T - YOKE_GOES) * 7) * Math.exp(-(T - YOKE_GOES) / 0.5)
    const hang = (q: Pt): Pt => tp(rotAbout([gx + q[0], sy + q[1]], [gx + 0.21, sy], swing))
    p.stroke(ink)
    p.strokeWeight(c.weight)
    p.fill(iron)
    poly(p, k, [hang([0.16, 0]), hang([0.26, 0]), hang([0.26, seat]), hang([0.16, seat])])
    const end = seat + give * ((YOKE_SEAT + 0.42 - gx - 0.16) / (YOKE_SEAT - gx - 0.16))
    poly(p, k, [hang([0.16, seat]), hang([YOKE_SEAT + 0.42 - gx, end]), hang([YOKE_SEAT + 0.42 - gx, end + 0.1]), hang([0.16, seat + 0.1])])
    poly(p, k, [hang([YOKE_SEAT + 0.34 - gx, end - 0.12]), hang([YOKE_SEAT + 0.42 - gx, end - 0.12]), hang([YOKE_SEAT + 0.42 - gx, end]), hang([YOKE_SEAT + 0.34 - gx, end])])
  }
  // The stops: a clang off the pivot, a brief warm flash on the iron and a spray of sparks falling away (no ring of
  // rays).
  if (part === 'front' && T >= GOV_STOPS && T < GOV_STOPS + 0.7) {
    const a0 = T - GOV_STOPS
    const flash = Math.exp(-a0 / 0.07)
    p.noStroke()
    alphaFill(p, LAMP.glow, 0.28 * flash)
    p.ellipse(gx * k, (top + 0.05) * k, 0.9 * k, 0.6 * k)
    for (let s = 0; s < 9; s++) {
      const ang = -Math.PI / 2 + (hash(s, 61) - 0.5) * 2.6
      const v = 1.6 + 1.8 * hash(s, 62)
      const life = 0.35 + 0.3 * hash(s, 63)
      if (a0 > life) continue
      const x = gx + Math.cos(ang) * v * a0
      const y = top + Math.sin(ang) * v * a0 + 6 * a0 * a0
      const len = 0.05 + 0.05 * hash(s, 64)
      alphaStroke(p, LAMP.core, 1 - a0 / life)
      p.strokeWeight(c.weight * 0.8)
      const vx = Math.cos(ang) * v
      const vy = Math.sin(ang) * v + 12 * a0
      const n = Math.hypot(vx, vy) || 1
      p.line(x * k, y * k, (x - (vx / n) * len) * k, (y - (vy / n) * len) * k)
    }
  }
}

/* ------------------------------------------------------------------ the whole */

export function drawHeart(p: p5, c: Pen, T: number): void {
  const { k } = c
  const { lit: L } = roomLight(T)
  const [qx, qy] = quake(T)
  p.push()
  p.translate(qx * k, qy * k)
  const lift = mechanisms(T)
  drawRoom(p, c, L, lift)
  drawPitLight(p, c, T)
  const fire = fireAt(T)
  const s = surge(T)
  // The fire's light over the whole room, stepping up with each mechanism it has lit.
  glow(p, c, FURNACE.x + 1.5, -1.6, 9.5, 0.09 * lift * (0.85 + 0.15 * fire.flare), LAMP.glow)
  // The forge is the light: a low warm pool over the pit (not a haze over the room), and the fire's own blaze on the
  // back wall right behind the flywheel's lower half, so the wheel stands dark against it.
  glow(p, c, FURNACE.x, 1.3, 5.4 + 0.8 * fire.heat, 0.05 + 0.12 * fire.base + 0.1 * fire.flare)
  glow(p, c, FURNACE.x, 1.4, 3.4, 0.1 * fire.base + 0.3 * fire.flare, WORKS.rust)
  glow(p, c, FURNACE.x, -0.45, 3.1 + 0.3 * fire.heat, clamp01(0.3 * fire.base + 0.22 * fire.flare + 0.12 * fire.heat), WORKS.rust)
  glow(p, c, FURNACE.x, -0.3, 2.3, clamp01(0.22 * fire.base + 0.26 * fire.flare), LAMP.flame)
  if (T < PAH[0]) glow(p, c, FURNACE.x, 2.2, 1.6, 0.12, WORKS.rust)
  // The lamps' pools are small: each lights its own bit of rock, and swells on the surges.
  for (const l of LAMPS) {
    const on = lampLit(T, l.on)
    if (on > 0) glow(p, c, l.at[0], l.at[1] + l.hang + 0.25, 0.8 + 0.25 * s, clamp01(0.3 * on * flicker(T, l.at[0]) * (1 + 0.6 * s)))
  }
  for (const l of LAMPS) {
    const on = lampLit(T, l.on)
    const swing = 0.04 * Math.sin(T * 1.7 + l.at[0]) * smoothstep(T, T0, T0 + 3) + 0.3 * quake(T)[0]
    // A cold lamp is iron in the dark: its ink as dim as the room round it until it catches.
    const pen = { ...c, ink: lampInk(c, Math.max(on, litAt(L, l.at[0]))) }
    if (l.torch) drawTorch(p, pen, l.at[0] + (l.torch > 0 ? 0.03 : -0.03), l.at[1], { lit: on, t: T, seed: l.at[0], side: l.torch })
    else drawLantern(p, pen, l.at[0], l.at[1], { lit: on, t: T, seed: l.at[0], hang: l.hang, swing })
  }
  drawFurnace(p, c, T, L)
  drawFloors(p, c, L)
  const lit = (x: number) => litAt(L, x, lampsAt(T, x))
  drawPipe(p, c, T, L)
  bellows(p, c, BELLOWS_SMALL.x0, BELLOWS_SMALL.x1, PIT, bellowsOpen(T, PAH[1] - 0.2), true, lit(4.2), 0.8)
  drawFlywheel(p, c, T, L)
  drawPinion(p, c, T, L)
  drawPistons(p, c, T, L)
  drawGovernor(p, c, T, L, 'back')
  drawHammer(p, c, T, L)
  drawTrolls(p, c, T, lit, 'pit')
  // The great bellows in front of the troll who works it (he stands at its back end, behind it).
  drawGreatBellows(p, c, T, lit(8.2) * awake(T, BELLOWS))
  drawTrolls(p, c, T, lit, 'ledge')
  drawGovernor(p, c, T, L, 'front')
  drawSparks(p, c, T)
  void VALVE_AT
  p.pop()
  // Dark until he drops into it (the drum's frames look down the pit and must see only rock). As he falls through
  // its ceiling the cover lifts from the top down, a little ahead of him, so he is seen falling into a place: the
  // room under the drum's firelight down the shaft and the banked coals, the machine near-black against it. The
  // furnace wakes it on the downbeat he lands on.
  const edge = coverEdge(T)
  if (edge < COVER_BOTTOM) {
    p.noStroke()
    p.rectMode(p.CORNER)
    const x0 = (WALL_L - 0.6) * k
    const w = (WALL_R - WALL_L + 1.2) * k
    const top = Math.max(ROOM_TOP, edge)
    alphaFill(p, STONE.deep, 1)
    p.rect(x0, top * k, w, (COVER_BOTTOM - top) * k)
    // The cover's upper edge is soft: a feather of bands over the cell above it.
    if (edge > ROOM_TOP) {
      const n = 10
      for (let i = 0; i < n; i++) {
        const y0 = edge - COVER_FEATHER * (1 - i / n)
        if (y0 + COVER_FEATHER / n <= ROOM_TOP) continue
        const yy = Math.max(ROOM_TOP, y0)
        alphaFill(p, STONE.deep, (i + 0.5) / n)
        p.rect(x0, yy * k, w, (y0 + COVER_FEATHER / n - yy) * k)
      }
    }
  }
}

/** The top of the heart's room (frame y), for the cover before its slot. */
const ROOM_TOP = -6.3
const COVER_BOTTOM = PIT + 0.7
const COVER_FEATHER = 1.0
/**
 * When the cover lifts: he passes the room's ceiling about half a second before he lands (T0), and the cover's edge
 * sweeps from the ceiling to the pit's floor in 0.42 s, starting slower than him (so it stays over his head until he
 * is through) and running ahead of him (so the room is all there before he lands on the hammer).
 */
const OPEN_FROM = T0 - 0.5
const OPEN_FOR = 0.42
const coverEdge = (T: number): number => ROOM_TOP + (COVER_BOTTOM + COVER_FEATHER - ROOM_TOP) * smoothstep(T, OPEN_FROM, OPEN_FROM + OPEN_FOR)

/**
 * The drum's firelight falling down its pit into the heart as the skin bursts (he falls through the hole in the
 * room's ceiling): a warm shaft widening to the floor by the hammer, and a pool where it lands. It is the room's only
 * light till the furnace wakes, then it fades to a glimmer under the furnace's.
 */
function drawPitLight(p: p5, c: Pen, T: number): void {
  const a = 0.16 * smoothstep(T, OPEN_FROM - 0.2, OPEN_FROM + 0.3) * (1 - 0.85 * smoothstep(T, T0, T0 + 1.6))
  if (a <= 0.003) return
  const { k } = c
  const hx = (SHAFT[0] + SHAFT[1]) / 2
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const col = p.color(LAMP.glow)
  const rgb = `${p.red(col)},${p.green(col)},${p.blue(col)}`
  ctx.save()
  // Three widths laid over each other, so the light is brightest down its middle and has no hard edge.
  for (const [top, left, right, f] of [[0.3, 0.3, 1.5, 0.45], [0.55, 0.6, 2.4, 0.33], [0.85, 1.0, 3.3, 0.22]]) {
    const g = ctx.createLinearGradient(0, ROOM_TOP * k, 0, PIT * k)
    g.addColorStop(0, `rgba(${rgb},${a * f})`)
    g.addColorStop(0.6, `rgba(${rgb},${a * f * 0.55})`)
    g.addColorStop(1, `rgba(${rgb},${a * f * 0.25})`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo((hx - top) * k, ROOM_TOP * k)
    ctx.lineTo((hx + top) * k, ROOM_TOP * k)
    ctx.lineTo((hx + right) * k, PIT * k)
    ctx.lineTo((hx - left) * k, PIT * k)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  glow(p, c, hx + 0.9, 0.2, 2.2, a * 1.3)
}

/** The furnace blowing out as the halves crash into its mouth: a spray of embers up and out of it, once. */
function drawBlast(p: p5, c: Pen, T: number): void {
  const a = T - HALVES_LAND
  if (a < 0 || a > 1.2) return
  const { k } = c
  for (let s = 0; s < 26; s++) {
    const h1 = hash(s, 3, 9)
    const h2 = hash(s, 5, 9)
    const life = 0.5 + 0.6 * hash(s, 7, 9)
    if (a > life) continue
    const ang = -Math.PI / 2 + (h1 - 0.5) * 2.6
    const sp = 3.5 + 4.5 * h2
    const vx = Math.cos(ang) * sp
    const vy = Math.sin(ang) * sp
    const x = FURNACE.x + (h1 - 0.5) * 1.6 + vx * a
    const y = FURNACE.top + 0.6 + vy * a + 0.5 * 11 * a * a
    const dt = 0.04
    alphaStroke(p, s % 3 ? LAMP.flame : LAMP.core, (1 - a / life) * 0.95)
    p.strokeWeight(c.weight * 1.1)
    p.line(x * k, y * k, (x - vx * dt) * k, (y - (vy + 11 * a) * dt) * k)
  }
}

/** In front of the ball: the dust the break shakes down, and what rises from the pit where the wheel's halves fell. */
export function drawHeartOver(p: p5, c: Pen, T: number): void {
  if (T < T0) return
  drawBlast(p, c, T)
  if (T < HALVES_LAND || T > HALVES_LAND + 6) return
  const { k } = c
  const a = T - HALVES_LAND
  const [qx, qy] = quake(T)
  p.push()
  p.translate(qx * k, qy * k)
  p.noStroke()
  // Dust from the pit where the flywheel's halves came down: a low haze that rises and thins.
  for (let s = 0; s < 9; s++) {
    const x = FLYWHEEL.at[0] - 2.6 + (s / 8) * 5.2 + 0.4 * Math.sin(s * 2.3)
    const rise = 1.2 * (1 - Math.exp(-a / 1.2))
    const y = PIT - 0.3 - rise * (0.6 + 0.4 * hash(s, 4, 2))
    const r = 0.6 + 0.9 * (1 - Math.exp(-a / 0.8)) + 0.3 * hash(s, 5, 2)
    alphaFill(p, STONE.light, 0.16 * Math.exp(-a / 2.2) * smoothstep(a, 0, 0.15))
    p.ellipse(x * k, y * k, r * 2.2 * k, r * 1.1 * k)
  }
  p.pop()
}
