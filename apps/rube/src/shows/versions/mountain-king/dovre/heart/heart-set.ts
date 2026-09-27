import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { hash } from '../kit'
import { drawLantern, drawTorch, flame, flicker, glow } from '../lantern'
import { RUIN, ruinLight } from '../music'
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
  kt,
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

/** The fortissimo's blow (beat 189, 100.83): the war-drum's skin bursts under him and he falls into the heart. */
const BURST = kt(189)

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
  // In the mountain's fall the forge burns up again for the cross-section, and leaps on the heart's chord.
  const ruin = ruinLight(T, [RUIN.heart])
  return { base: Math.max(f.base, 0.28 * woke * (T >= BREAK ? 0.6 : 1), 0.6 * ruin.up), flare: Math.max(f.flare, s, blast, 1.4 * ruin.flare), heat: f.heat }
}

/**
 * Each mechanism waits as a dark iron mass against the wall (`silhouette`) until the furnace's flare on its first
 * note lights it, and it stays lit: so each phrase the lit machine is visibly bigger, and there is one hero
 * silhouette at a time (the hammer, the flywheel, the pumps, the great bellows, the governor).
 */
const woken = (T: number, at: number): number => smoothstep(T, at - 0.04, at + 0.1)
/**
 * How far the machine has grown (0 to 1): a step as the furnace catches on the first blow (the biggest, so the
 * fortissimo's first phrase plays in a lit forge, as bright as the lit mine), then one for each phrase's new mechanism
 * (the flywheel, the pumps, the great bellows, the governor, the valve blowing), so the room brightens a step a phrase
 * and the runaway is the brightest room in the mountain.
 */
const STEPS: [number, number][] = [[PAH[0], 0.3], [FLY, 0.14], [PISTONS, 0.14], [BELLOWS, 0.14], [GOVERNOR, 0.14], [VALVE_AT, 0.14]]
const mechanisms = (T: number): number => STEPS.reduce((s, [at, w]) => s + w * woken(T, at), 0)
/** The furnace has caught (the first blow's sparks): from here its light is on the wall round the hammer. */
const caught = (T: number): number => woken(T, PAH[0])

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

/* ------------------------------------------------------------------ the wall, and what sleeps against it */

/** The back wall's own colour: dark rock, lighter and warmer with each mechanism the fire has lit. */
const wallBase = (L: number, lift: number): string => mixHex(mixHex(mixHex(STONE.deep, STONE.dark, 0.45), STONE.dark, L), WALL_LIT, 0.78 * clamp01(lift))
/** A soft pool of light laid over the room: centre, radius, alpha at its middle, colour (as `glow` draws it). */
type Pool = [number, number, number, number, string]
/**
 * The light the room lays over its back wall at T, in the order it is drawn: the forge's (`forge`: the wash over the
 * whole room; from the first blow its light on the wall round the hammer, the anvil and the furnace's mouth, washing
 * brighter on every flare; the pools over the pit, the fire's blaze on the wall behind the flywheel's lower half),
 * drawn only inside the room so the rock outside it stays dark, and each lamp's own small pool (`lamps`). `drawHeart`
 * draws exactly these, and `wallAt` reads them, so a sleeping mechanism takes the same value as the rock behind it.
 */
function roomPools(T: number, lift: number): { forge: Pool[]; lamps: Pool[] } {
  const fire = fireAt(T)
  const s = surge(T)
  const on = caught(T)
  const forge: Pool[] = [
    [FURNACE.x + 1.5, -1.6, 11, 0.27 * lift * (0.8 + 0.2 * fire.flare), LAMP.glow],
    // The forge's light on the hammer's wall: up from the furnace's mouth over the anvil and the helve, stepping up
    // with the flare on every 2 and 4 (the oom-pah as light), and fading into the room's wash as the machine grows.
    [FURNACE.x - 2.3, -0.9, 5.6 + 0.6 * fire.flare, on * (0.19 + 0.27 * fire.flare) * (1 - 0.45 * clamp01((lift - 0.3) / 0.7)), LAMP.glow],
    [FURNACE.x, 1.3, 5.4 + 0.8 * fire.heat, 0.05 + 0.12 * fire.base + 0.1 * fire.flare, LAMP.glow],
    [FURNACE.x, 1.4, 3.4, 0.1 * fire.base + 0.3 * fire.flare, WORKS.rust],
    [FURNACE.x, -0.45, 3.1 + 0.3 * fire.heat, clamp01(0.3 * fire.base + 0.22 * fire.flare + 0.12 * fire.heat), WORKS.rust],
    [FURNACE.x, -0.3, 2.3, clamp01(0.22 * fire.base + 0.26 * fire.flare), LAMP.flame],
  ]
  // The banked coals, before the catch: a low red breathing on the pit's floor in front of the mouth.
  if (T < PAH[0]) forge.push([FURNACE.x, 2.1, 2.1, 0.13 + 0.03 * Math.sin(T * 2.3), WORKS.rust])
  const lamps: Pool[] = []
  for (const l of LAMPS) {
    const on = lampLit(T, l.on)
    if (on > 0) lamps.push([l.at[0], l.at[1] + l.hang + 0.25, 0.8 + 0.25 * s + 1.2 * lift, clamp01(0.3 * on * flicker(T, l.at[0]) * (1 + 0.6 * s)), LAMP.glow])
  }
  return { forge, lamps }
}
/** The wall and its pools at T, worked out once a frame. */
let field: { T: number; base: string; forge: Pool[]; lamps: Pool[]; pools: Pool[] } | null = null
function wallField(T: number): { base: string; forge: Pool[]; lamps: Pool[]; pools: Pool[] } {
  if (field?.T !== T) {
    const lift = mechanisms(T)
    const { forge, lamps } = roomPools(T, lift)
    field = { T, base: wallBase(roomLight(T).lit, lift), forge, lamps, pools: [...forge, ...lamps] }
  }
  return field
}
/** What the back wall looks like at (x, y) at T: its rock, with every pool of light over it (`glow`'s falloff). */
function wallAt(T: number, x: number, y: number): string {
  const { base, pools } = wallField(T)
  let col = base
  for (const [gx, gy, r, a, hex] of pools) {
    if (a <= 0.003 || r <= 0) continue
    const d = Math.hypot(x - gx, y - gy) / r
    if (d >= 1) continue
    col = mixHex(col, hex, d < 0.35 ? lerp(a, 0.55 * a, d / 0.35) : lerp(0.55 * a, 0, (d - 0.35) / 0.65))
  }
  return col
}

/** How a mechanism is drawn at T: `fill` and `ink` map its lit colours; `w` is how far it has woken (0 to 1). */
interface Sleep {
  w: number
  fill: (hex: string) => string
  ink: (hex: string) => string
}
/**
 * A mechanism before its note: a dark iron mass against the forge-lit wall, one value for the whole of it and an edge
 * darker still, so it reads as weight waiting in the shadow and never as a pale drawing on the wall (no light edge, no
 * light parts). The wall shows through its gaps (the wheel's spokes, the governor's arms), which is what gives it its
 * shape. On its first note the furnace's flare gives it its full value and edge. Every waiting part of the machine is
 * drawn this way: the flywheel and its pinion, the pumps and their pipe, the great bellows, the governor, the valve.
 */
const WAITING = mixHex(SHADOW, IRON_DARK, 0.2)
function silhouette(T: number, at: number, x: number, y: number): Sleep {
  const w = woken(T, at)
  if (w >= 1) return { w, fill: (h) => h, ink: (h) => h }
  // A little of the wall's light in it, so it is a dark shape in the forge and not a hole in the picture.
  const dark = mixHex(WAITING, wallAt(T, x, y), 0.3)
  const edge = mixHex(WAITING, STONE.deep, 0.55)
  return { w, fill: (h) => mixHex(dark, h, w), ink: (h) => mixHex(edge, h, w) }
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

/** The back wall in the forge's full light: the lit rock, warmed. */
const WALL_LIT = mixHex(mixHex(STONE.mid, STONE.light, 0.25), LAMP.glow, 0.14)

function drawRoom(p: p5, c: Pen, L: number, lift = 0): void {
  const { k } = c
  p.noStroke()
  // The back wall: dark rock, lighter and warmer with each mechanism the fire has lit (the runaway is the brightest
  // room in the mountain: its walls in the forge's light).
  p.fill(wallBase(L, lift))
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
  // The drum's firelight down the shaft catches the arch's stones a little before the fire wakes.
  const archLit = L * 0.8 + pitCatch(T, FURNACE.x)
  p.stroke(inkOf(c, archLit))
  p.strokeWeight(c.weight)
  p.fill(warm(tone(STONE.light, archLit), flare))
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
  // Banked, before the first blow catches it: a low red breathing in the mouth and on the coals, no flame.
  const bank = (1 - caught(T)) * (0.85 + 0.15 * Math.sin(T * 2.3))
  p.stroke(inkOf(c, archLit))
  p.fill(mixHex('#140d09', WORKS.rust, Math.max(0.3 * base + 0.2 * flare, 0.34 * bank)))
  poly(p, k, arch(0))
  const hot = clamp01(Math.max(0.25 + 0.6 * base + 0.5 * flare, 0.62 * bank))
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
  // The drum's firelight down the shaft catches it as he falls (it is under the burst), before the furnace wakes.
  const lit = litAt(L, 1.8, lampsAt(T, 1.8) + pitCatch(T, 1.8))
  const ink = inkOf(c, lit)
  const w = c.weight
  const phi = hammerPhi(T)
  const f = fireAt(T).flare
  // Once the furnace has caught, what faces it (the anvil, its stone, the helve and the head) is in its light,
  // brighter on every flare: the forge the hammer works in.
  const forge = caught(T) * (0.55 + 0.45 * clamp01(f))
  const fired = (hex: string, u: number): string => mixHex(hex, LAMP.glow, clamp01(0.22 * f + 0.3 * u))
  const timber = tone(WORKS.wood, lit)
  const timberLit = fired(tone(WORKS.timber, lit), 0.6 * forge)
  const iron = fired(tone(IRON, lit), forge)
  const steel = tone(WORKS.steel, lit)
  // The anvil's stone, and the anvil: a flat face, the horn toward the furnace, a waist, a broad foot.
  const [ax, ay] = ANVIL
  p.stroke(ink)
  p.strokeWeight(w)
  p.fill(fired(tone(STONE.light, lit * 0.85), 0.45 * forge))
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
 * The great bellows (118.72, "everything"), on its own stage: raised on a timber trestle into the furnace's mouth, its
 * nozzle in the fire and the back of its top board at the pump heads' height, two cells long. On every 2 and 4 the
 * stroke drives its top board down: the leather sides swell hard with the air and the furnace's flare blows from the
 * nozzle into the fire; then the leather slackens into folds and the board lifts, drawing in again. The troll who
 * works it stands behind it.
 */
const GREAT = { hinge: [7.15, 1.14] as Pt, back: [9.2, 0.82] as Pt, nozzle: 0.8, gape: 1.2, board: 0.19 }
/** How hard the air is in it (0..1): rising as the board is driven down onto the flare, spent just after. */
function greatBlow(T: number): number {
  if (T < BELLOWS - 0.2) return 0
  const { i, ago } = since(PAH, T)
  const next = PAH[i + 1]
  let b = 0
  if (next !== undefined && next - T < 0.13 && next > BELLOWS - 0.2) b = (1 - (next - T) / 0.13) ** 2
  if (i >= 0 && PAH[i] > BELLOWS - 0.2) b = Math.max(b, Math.exp(-ago / 0.09))
  return b
}
function drawGreatBellows(p: p5, c: Pen, T: number, lit: number): void {
  const { k } = c
  const S = silhouette(T, BELLOWS, 8.3, 0.4)
  const ink = S.ink(inkOf(c, lit))
  const f = fireAt(T).flare * S.w
  const wood = S.fill(tone(WORKS.wood, lit * 0.9))
  const board = S.fill(warm(tone(mixHex(WORKS.wood, WORKS.timber, 0.35), lit), f))
  const boardLit = S.fill(warm(tone(WORKS.timber, lit), f * 1.5))
  const iron = S.fill(tone(IRON, lit))
  // Oxblood leather, darker and redder than the lit rock behind it, so the body reads as one mass.
  const leather = S.fill(warm(tone(mixHex(WORKS.wood, WORKS.rust, 0.4), lit * 0.9), f * 0.6))
  const [hx, hy] = GREAT.hinge
  const [bx, by] = GREAT.back
  const Lb = Math.hypot(bx - hx, by - hy)
  const dir: Pt = [(bx - hx) / Lb, (by - hy) / Lb]
  const on = (u: number): Pt => [hx + dir[0] * u, hy + dir[1] * u]

  // The trestle: two splayed timber A-frames under the bottom board, and a rail between them.
  p.stroke(ink)
  p.strokeWeight(c.weight)
  p.fill(wood)
  const feet: Pt[] = []
  for (const u of [0.42, Lb - 0.42]) {
    const [x, y] = on(u)
    bar(p, k, [x - 0.34, PIT], [x - 0.04, y + 0.06], 0.12, 0.1)
    bar(p, k, [x + 0.34, PIT], [x + 0.04, y + 0.06], 0.12, 0.1)
    feet.push([x, y])
  }
  bar(p, k, [feet[0][0] - 0.2, 1.95], [feet[1][0] + 0.2, 1.95], 0.1)
  bar(p, k, [feet[0][0] + 0.12, 1.95], [feet[1][0] - 0.1, feet[1][1] + 0.2], 0.08)

  // The body, in the bottom board's frame: x along it from the hinge, y down.
  const open = T < BELLOWS - 0.2 ? 0.85 : bellowsOpen(T, BELLOWS - 0.2)
  const blow = greatBlow(T) * S.w
  const slack = clamp01(1 - open / 0.85) * (1 - blow)
  const h = 0.14 + GREAT.gape * open
  const a = Math.asin(Math.min(0.95, h / Lb))
  const top = (u: number): Pt => [u * Math.cos(a), -u * Math.sin(a)]
  const tb = top(Lb)
  p.push()
  p.translate(hx * k, hy * k)
  p.rotate(Math.atan2(dir[1], dir[0]))
  const V = (q: Pt) => p.vertex(q[0] * k, q[1] * k)
  // The leather: bowed out at the back as the air fills it; pleated in two folds when it goes slack.
  const bulge = 0.05 + 0.22 * blow
  const fold = 0.14 * slack
  const b0: Pt = [Lb - 0.02, -0.06]
  const b1: Pt = [tb[0] - 0.02, tb[1] + 0.06]
  const mid = (u: number): Pt => [lerp(b0[0], b1[0], u), lerp(b0[1], b1[1], u)]
  const out = (q: Pt, d: number): Pt => [q[0] + d * Math.cos(a / 2), q[1] - d * Math.sin(a / 2) * 0.3]
  p.stroke(ink)
  p.fill(leather)
  p.beginShape()
  V([0.12, -0.05])
  V(b0)
  if (fold > 0.01) {
    V(out(mid(0.25), fold + bulge * 0.4))
    V(out(mid(0.5), bulge * 0.3))
    V(out(mid(0.75), fold + bulge * 0.4))
  } else {
    const m0 = out(mid(0.3), bulge * 1.33)
    const m1 = out(mid(0.7), bulge * 1.33)
    p.bezierVertex(m0[0] * k, m0[1] * k, m1[0] * k, m1[1] * k, b1[0] * k, b1[1] * k)
  }
  V(b1)
  V(top(0.14))
  p.endShape(p.CLOSE)
  // Its swell: a lit belly across the middle of the side, full when the air is hard in it.
  p.noStroke()
  alphaFill(p, S.fill(warm(mixHex(leather, WORKS.rope, 0.45), f)), 0.3 + 0.55 * blow)
  const belly = (u: number, side: number): Pt => {
    const yb = -0.08
    const yt = top(u)[1] + 0.08
    const m = (yb + yt) / 2
    const half = ((yb - yt) / 2) * (0.25 + 0.45 * blow) * Math.sin((Math.PI * (u - 0.25)) / (Lb - 0.25))
    return [u, m + side * half]
  }
  p.beginShape()
  for (let j = 0; j <= 8; j++) V(belly(lerp(0.3, Lb - 0.1, j / 8), 1))
  for (let j = 8; j >= 0; j--) V(belly(lerp(0.3, Lb - 0.1, j / 8), -1))
  p.endShape(p.CLOSE)
  // Slack, it creases: two dark folds fanning from the hinge to the back.
  if (slack > 0.02) {
    alphaFill(p, mixHex(leather, STONE.deep, 0.55), 0.7 * slack)
    for (const u of [0.36, 0.68]) {
      const e = out(mid(u), 0.02)
      const w = 0.05 * slack
      poly(p, k, [[0.35, -0.05], [e[0] - w, e[1] - w], [e[0] - 0.02, e[1] + w * 0.6]])
    }
  }
  // The boards, iron-strapped, and the nozzle.
  p.stroke(ink)
  p.strokeWeight(c.weight)
  const B = GREAT.board
  p.fill(board)
  bar(p, k, [-0.04, B / 2 - 0.06], [Lb + 0.1, B / 2 - 0.06], B)
  const tb2 = top(Lb + 0.1)
  const up: Pt = [-Math.sin(a) * (B / 2 - 0.04), -Math.cos(a) * (B / 2 - 0.04)]
  bar(p, k, [up[0], up[1]], [tb2[0] + up[0], tb2[1] + up[1]], B)
  // The top board's upper face catches the fire.
  p.noStroke()
  p.fill(boardLit)
  const up2: Pt = [up[0] * 1.9, up[1] * 1.9]
  bar(p, k, [0.1 * Math.cos(a) + up2[0], -0.1 * Math.sin(a) + up2[1]], [tb2[0] + up2[0] - 0.04, tb2[1] + up2[1]], 0.045)
  p.stroke(ink)
  p.fill(iron)
  for (const u of [0.62, Lb - 0.45]) {
    bar(p, k, [u - 0.05, B / 2 - 0.06], [u + 0.05, B / 2 - 0.06], B + 0.05)
    const q = top(u)
    bar(p, k, [q[0] + up[0] - 0.05, q[1] + up[1]], [q[0] + up[0] + 0.05, q[1] + up[1]], B + 0.05)
  }
  // The nozzle: a tapered iron pipe from the hinge block down into the fire.
  const tip: Pt = [-GREAT.nozzle, 0.2]
  poly(p, k, [[0.2, -0.26], [0.2, 0.16], [tip[0], tip[1] + 0.07], [tip[0], tip[1] - 0.07]])
  p.rectMode(p.CENTER)
  p.rect(0.14 * k, -0.05 * k, 0.24 * k, 0.46 * k, 0.03 * k)

  // The flare blowing from the nozzle into the fire on each stroke: a hot tongue, widening and gone in a beat.
  if (blow > 0.02) {
    const nd = Math.hypot(tip[0] - 0.16, tip[1] + 0.04)
    const ux = (tip[0] - 0.16) / nd
    const uy = (tip[1] + 0.04) / nd
    const tongue = (len: number, wid: number, hex: string, al: number, seed: number) => {
      const wav = 0.06 * Math.sin(T * 37 + seed)
      const pts: Pt[] = []
      for (let j = 0; j <= 10; j++) {
        const u = j / 10
        const wv = wid * Math.sin(Math.PI * Math.pow(u, 0.7)) * (1 - 0.35 * u)
        const cx = tip[0] + ux * len * u
        const cy = tip[1] + uy * len * u + wav * u * u
        pts.push([cx - uy * wv, cy + ux * wv])
      }
      for (let j = 10; j >= 0; j--) {
        const u = j / 10
        const wv = wid * Math.sin(Math.PI * Math.pow(u, 0.7)) * (1 - 0.35 * u)
        const cx = tip[0] + ux * len * u
        const cy = tip[1] + uy * len * u + wav * u * u
        pts.push([cx + uy * wv, cy - ux * wv])
      }
      alphaFill(p, hex, al)
      poly(p, k, pts)
    }
    p.noStroke()
    tongue(0.6 + 1.3 * blow, 0.14 + 0.24 * blow, WORKS.rust, 0.6 * blow, 1)
    tongue(0.5 + 1.1 * blow, 0.09 + 0.16 * blow, LAMP.flame, 0.9 * blow, 2)
    tongue(0.35 + 0.75 * blow, 0.04 + 0.07 * blow, mixHex(LAMP.core, '#FFFFFF', 0.35), 0.95 * blow, 3)
  }
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

/**
 * How far the flywheel's frame has come down (the heart's great thing in the mountain's fall, on its chord `RUIN.heart`,
 * while the room is still lit): each leg swings out about its foot, falling faster as it goes (gravity), lands against
 * the broken halves with a small damped bounce, and the cross-piece drops to the pit's floor between them. 0 before.
 */
function frameFall(T: number): { lean: number; drop: number; turn: number } {
  const a = T - RUIN.heart
  if (a <= 0) return { lean: 0, drop: 0, turn: 0 }
  const FALL = 0.42
  const u = Math.min(1, a / FALL)
  const b = Math.max(0, a - FALL)
  const lean = 0.85 * u * u - (b > 0 ? 0.06 * Math.exp(-b / 0.12) * Math.abs(Math.sin(b * 18)) : 0)
  // The cross-piece: free fall (12 cells/s²) from its pins to the floor, a slight turn as one end goes first.
  const drop = Math.min(PIT - 0.07 - 0.95, 6 * a * a)
  return { lean, drop, turn: 0.35 * Math.min(1, a / 0.5) }
}

function drawFlywheelFrame(p: p5, c: Pen, lit: number, S: Sleep, T = 0): void {
  const { k } = c
  const [fx, fy] = FLYWHEEL.at
  p.stroke(S.ink(inkOf(c, lit)))
  p.strokeWeight(c.weight)
  p.fill(S.fill(tone(WORKS.wood, lit * 0.9)))
  const f = frameFall(T)
  // Each leg about its foot, out by `lean` (the far one a little further: they never fall as a mirror pair).
  for (const side of [-1, 1]) {
    const foot: Pt = [fx + side * 1.35, PIT]
    const top: Pt = [fx + side * 0.12, fy + 0.1]
    const th = side * f.lean * (side > 0 ? 1.08 : 1)
    const dx = top[0] - foot[0]
    const dy = top[1] - foot[1]
    const cs = Math.cos(th)
    const sn = Math.sin(th)
    bar(p, k, foot, [foot[0] + dx * cs - dy * sn, foot[1] + dx * sn + dy * cs], 0.32, 0.22)
  }
  const cy = 0.95 + f.drop
  const h = 0.92
  bar(p, k, [fx - h * Math.cos(f.turn), cy - h * Math.sin(f.turn)], [fx + h * Math.cos(f.turn), cy + h * Math.sin(f.turn)], 0.14)
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
  // Before its note it waits as a dark silhouette against the forge-lit wall (a great wheel, still), its lower rim
  // catching the furnace's red below it, so the hammer is the one lit hero of the first phrase; then a lit iron face
  // (about 0.6 of full light), warmed on the flares, its lower half standing dark against the fire behind it.
  const S = silhouette(T, FLY, fx, fy)
  const lit = litAt(L, fx, lampsAt(T, fx))
  const ink = S.ink(inkOf(c, lit))
  const fire = fireAt(T)
  const f = fire.flare * S.w
  const face = clamp01(L * 1.25) * 0.64
  const litIron = warm(tone(IRON_FACE, face), f * 0.5)
  const iron = S.fill(litIron)
  drawFlywheelFrame(p, c, lit, S, T)
  const spin = Math.abs(flySpin(T))
  const ember = mixHex(iron, WORKS.rust, clamp01(0.35 * fire.base + 0.18 * fire.flare))
  const lip = mixHex(ember, warm(mixHex(tone(WORKS.steel, face + 0.2), LAMP.glow, 0.25), f), S.w)
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
    p.fill(S.fill(tone(WORKS.steel, lit * 0.9)))
    p.rectMode(p.CENTER)
    p.rect(fx * k, (fy - 0.02) * k, 0.28 * k, 0.28 * k, 0.03 * k)
  }
}

function drawPinion(p: p5, c: Pen, T: number, L: number): void {
  const { k } = c
  let at = pinionAt(T)
  const lit = litAt(L, at[0], lampsAt(T, at[0])) * 0.95
  const S = silhouette(T, FLY, at[0], at[1])
  const ink = S.ink(inkOf(c, lit))
  // After the break its arm has snapped and it has dropped to the pit's floor.
  const fall = T >= BREAK ? ease((T - BREAK) / 0.35) : 0
  if (fall > 0) at = [at[0] + 0.25 * fall, lerp(at[1], PIT - PINION_R - 0.11, fall)]
  p.stroke(ink)
  p.strokeWeight(c.weight)
  p.fill(S.fill(tone(STONE.light, lit * 0.8)))
  poly(p, k, [[PINION_PIVOT[0] - 0.3, PINION_PIVOT[1] + 0.2], [PINION_PIVOT[0] + 0.3, PINION_PIVOT[1] + 0.2], [PINION_PIVOT[0] + 0.38, PIT], [PINION_PIVOT[0] - 0.38, PIT]])
  p.fill(S.fill(tone(IRON, lit)))
  if (fall <= 0) bar(p, k, PINION_PIVOT, at, 0.2, 0.16)
  else bar(p, k, PINION_PIVOT, [PINION_PIVOT[0] + 0.45, PINION_PIVOT[1] - 0.35], 0.2, 0.17)
  gear(p, c, at, PINION_R, PINION.teeth, PIN_PHASE + pinionAngle(Math.min(T, BREAK)) + fall * 0.6, { fill: S.fill(tone(WORKS.steel, lit * 0.85)), ink, w: c.weight, hub: 0.13 })
  p.fill(S.fill(tone(WORKS.steel, lit)))
  p.rectMode(p.CENTER)
  p.rect(PINION_PIVOT[0] * k, PINION_PIVOT[1] * k, 0.18 * k, 0.18 * k, 0.03 * k)
}

/* ------------------------------------------------------------------ the pumps, the pipe and the valve */

function drawPistons(p: p5, c: Pen, T: number, L: number): void {
  const { k } = c
  const lit = litAt(L, 10.5, lampsAt(T, 10.5))
  const S = silhouette(T, PISTONS, 10.7, 0.9)
  const ink = S.ink(inkOf(c, lit))
  const f = fireAt(T).flare * S.w
  const iron = S.fill(warm(tone(IRON_FACE, lit * 0.9), f * 0.5))
  const dark = S.fill(tone(IRON, lit * 0.8))
  const steel = S.fill(tone(WORKS.steel, lit))
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
  const lit = litAt(L, 13, lampsAt(T, 13.5))
  const S = silhouette(T, PISTONS, 13.5, DECK - 0.2)
  const ink = S.ink(inkOf(c, lit))
  const iron = S.fill(tone(IRON, lit))
  const steel = S.fill(tone(WORKS.steel, lit))
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
  // The valve on the ledge: a squat body on the branch, its spindle, and the weighted lever over it. It has no job
  // until it blows, so it waits dark (its own silhouette) until VALVE_AT, when the flare lights it.
  const vx = VALVE.x
  const V = silhouette(T, VALVE_AT, vx, DECK - 0.6)
  const vIron = V.fill(tone(IRON, lit))
  const vSteel = V.fill(tone(WORKS.steel, lit))
  p.stroke(V.ink(inkOf(c, lit)))
  p.strokeWeight(c.weight)
  p.fill(vIron)
  p.rect((vx - 0.2) * k, (DECK - 0.3) * k, 0.4 * k, 0.32 * k, 0.05 * k)
  p.fill(vSteel)
  p.rect((vx - 0.25) * k, (DECK - 0.36) * k, 0.5 * k, 0.08 * k, 0.02 * k)
  const lift = valveLift(T)
  const [pvx, pvy] = VALVE.pivot
  const end: Pt = [pvx + VALVE.len * Math.cos(-lift), pvy + VALVE.len * Math.sin(-lift)]
  // The spindle from the valve up to the lever.
  const onLever = pvy - (vx - pvx) * Math.tan(lift)
  p.rect((vx - 0.04) * k, onLever * k, 0.08 * k, (DECK - 0.36 - onLever) * k)
  // The lever's post and the lever.
  p.fill(V.fill(tone(WORKS.wood, lit)))
  p.rect((pvx - 0.07) * k, pvy * k, 0.14 * k, (DECK - pvy) * k)
  p.fill(vIron)
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

/**
 * The governor is stowed until its note: hung up on its spindle wholly inside the vault's rock, so nothing of it is in
 * the room through the fortissimo (only its base and the keeper's lever stand on the ledge). Its lowest point hung is
 * the yoke's seat (≈ -0.3 at rest), under the chimney's mouth, the highest reach of the room (-6.5): STOW lifts that
 * clear with a margin. The keeper reaches for the lever and it lets go: it drops out of the rock under its own weight
 * (slow for its first moment, then falling hard), and lands in mesh on GOVERNOR with a short rebound. Cells up.
 */
const STOW = 6.4
const STOW_FALL = 0.4
function govStow(T: number): number {
  const t0 = GOVERNOR - STOW_FALL
  if (T < t0) return STOW
  if (T < GOVERNOR) {
    const u = (T - t0) / STOW_FALL
    return STOW * (1 - u * u)
  }
  const a = T - GOVERNOR
  return a > 0.6 ? 0 : 0.07 * Math.exp(-a / 0.09) * Math.abs(Math.sin(a * 24))
}

function drawGovernor(p: p5, c: Pen, T: number, L: number, part: 'back' | 'front'): void {
  const hung = govStow(T)
  if (hung <= 0.001) return drawGovernorParts(p, c, T, L, part, 0)
  // Stowed or dropping: what is up in the vault is behind its rock.
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  HOLLOW.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.closePath()
  ctx.clip()
  drawGovernorParts(p, c, T, L, part, hung)
  ctx.restore()
}

function drawGovernorParts(p: p5, c: Pen, T: number, L: number, part: 'back' | 'front', hung: number): void {
  const { k } = c
  const on = T >= GOVERNOR
  const lit = litAt(L, GOV.x, lampsAt(T, GOV.x) + (on ? 0.1 : 0))
  // Waiting, its base and lever on the ledge are dark iron (the rest is stowed up in the rock); lit as it lands.
  const S = silhouette(T, GOVERNOR, GOV.x, -2.6)
  const ink = S.ink(inkOf(c, lit))
  const iron = S.fill(tone(IRON_FACE, lit * 0.9))
  const steel = S.fill(tone(WORKS.steel, lit))
  const gx = GOV.x
  const foot: Pt = [gx, DECK - 0.55]
  const fall = spindleFall(T)
  // Every point above the base is hung up with it while it is stowed, and turns with the spindle's fall (about its
  // foot) at the end.
  const tp = (q: Pt): Pt => {
    const u: Pt = [q[0], q[1] - hung]
    return fall ? rotAbout(u, foot, fall) : u
  }
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
    p.fill(S.fill(tone(IRON_DARK, lit)))
    p.rectMode(p.CORNER)
    p.rect((gx - 0.38) * k, (DECK - 0.5) * k, 0.76 * k, 0.5 * k, 0.05 * k)
    p.fill(steel)
    p.rect((gx - 0.44) * k, (DECK - 0.57) * k, 0.88 * k, 0.1 * k, 0.02 * k)
    const la = govLever(T)
    const lv = GOV_LEVER
    const lend: Pt = [lv.pivot[0] + lv.len * Math.sin(la), lv.pivot[1] - lv.len * Math.cos(la)]
    p.fill(iron)
    bar(p, k, lv.pivot, lend, 0.09, 0.07)
    p.fill(S.fill(tone(WORKS.wood, lit)))
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
  // It lands in its base on the note: the ledge's dust puffs out from under it, low, and thins.
  if (part === 'front' && T >= GOVERNOR && T < GOVERNOR + 0.9) {
    const a0 = T - GOVERNOR
    p.noStroke()
    for (let s = 0; s < 4; s++) {
      const side = s % 2 ? 1 : -1
      const out = (0.3 + 0.55 * (1 - Math.exp(-a0 / 0.18))) * (0.8 + 0.3 * hash(s, 71))
      const r = 0.12 + 0.3 * (1 - Math.exp(-a0 / 0.25)) + 0.06 * hash(s, 72)
      alphaFill(p, STONE.light, 0.2 * Math.exp(-a0 / 0.3) * smoothstep(a0, 0, 0.05))
      p.ellipse((gx + side * out) * k, (DECK - 0.12 - 0.12 * a0 - 0.05 * s) * k, r * 2.4 * k, r * 1.2 * k)
    }
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
  // The fire's light over the whole room, stepping up with each mechanism it has lit; its light on the hammer's wall,
  // washing on every flare; the forge's pools over the pit and its blaze on the back wall behind the flywheel's lower
  // half; the lamps' small pools (`roomPools`): all on the room's walls only, never on the rock it is cut into.
  const field = wallField(T)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  HOLLOW.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.closePath()
  ctx.clip()
  drawPitLight(p, c, T)
  for (const [x, y, r, a, col] of field.pools) glow(p, c, x, y, r, a, col)
  ctx.restore()
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
  drawGreatBellows(p, c, T, lit(8.2))
  drawTrolls(p, c, T, lit, 'ledge')
  drawGovernor(p, c, T, L, 'front')
  drawSparks(p, c, T)
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

/**
 * The top of the heart's room (frame y), for the cover before its slot: over the chimney's mouth in the ceiling too
 * (-6.5; at -6.3 its notch stood uncovered under the drum room's floor from 89 s, a grey trapezoid in the rock).
 */
const ROOM_TOP = -6.6
const COVER_BOTTOM = PIT + 0.7
const COVER_FEATHER = 1.0
/**
 * When the cover lifts: from the burst, as the frame starts down after him. The fortissimo breaks the drum's skin
 * (BURST, 100.83) and he falls a second and more before he lands (T0); the frame tilts down with him from the drum's
 * wide, its bottom edge reaching the room's ceiling almost at once. The cover's edge sweeps top-down from the ceiling
 * to the pit's floor in half a second from just after the burst, running ahead of the frame's bottom edge (from
 * ~101.05) and far ahead of him, so he falls into a room, never through a black frame.
 */
const OPEN_FROM = BURST + 0.07
const OPEN_FOR = 0.5
const coverEdge = (T: number): number => ROOM_TOP + (COVER_BOTTOM + COVER_FEATHER - ROOM_TOP) * smoothstep(T, OPEN_FROM, OPEN_FROM + OPEN_FOR)

/**
 * How much of the drum's firelight falls down through the burst barrel into the heart (0 to 1): from the burst, and
 * fading to a glimmer once the furnace wakes on his landing.
 */
const pitLit = (T: number): number => smoothstep(T, BURST, BURST + 0.35) * (1 - 0.85 * smoothstep(T, T0, T0 + 1.6))
/**
 * What that light catches at x (added to a part's own light): the gallery and the hammer under the shaft most, the
 * anvil a little less, the furnace's arch a glint.
 */
const pitCatch = (T: number, x: number): number => 0.5 * pitLit(T) * clamp01(1 - Math.max(0, x - 1.6) / 6)

/**
 * The drum's firelight falling down its pit into the heart as the skin bursts (he falls through the hole in the
 * room's ceiling): a warm shaft widening to the floor by the hammer and the anvil, and a pool where it lands. With
 * the banked coals' red it is the room's only light till the furnace wakes, then it fades to a glimmer under the
 * furnace's. Drawn inside the room's clip.
 */
function drawPitLight(p: p5, c: Pen, T: number): void {
  const a = 0.2 * pitLit(T)
  if (a <= 0.003) return
  const { k } = c
  const hx = (SHAFT[0] + SHAFT[1]) / 2
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const col = p.color(LAMP.glow)
  const rgb = `${p.red(col)},${p.green(col)},${p.blue(col)}`
  ctx.save()
  // Three widths laid over each other, so the light is brightest down its middle and has no hard edge; it leans
  // toward the anvil as it widens.
  for (const [top, left, right, f] of [[0.3, 0.3, 1.9, 0.45], [0.55, 0.6, 3.0, 0.33], [0.85, 1.0, 4.3, 0.22]]) {
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
  glow(p, c, hx + 1.4, 0.3, 2.6, a * 1.3)
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
