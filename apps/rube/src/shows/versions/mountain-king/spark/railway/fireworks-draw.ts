import type p5 from 'p5'
import { mixHex, R, type Pt } from '../../../../../parts'
import { hash, smooth } from '../kit'
import { heat } from '../fx'
import { FIRES, RAILWAY } from '../worlds'
import { horizonAt, moonAt, moonLight } from './night'
import {
  BATTERY_X0,
  BURSTS,
  CRASH,
  CRASH_AT,
  CRATE,
  DIVE,
  DRIVERS_AT,
  FLARE,
  FLANK,
  FLING,
  GERB,
  GERB_AT,
  GUNS,
  GY,
  HANG,
  HUSH,
  IN,
  jetTop,
  LEADER_AT,
  LEADER_FOOT,
  LIP,
  MAST_A,
  MAST_B,
  MINES_X,
  omega,
  OUT,
  POUR,
  RACK_AT,
  RACK_N,
  RACK_X,
  rackTube,
  REST,
  riseAt,
  RISES,
  ROPE_Y,
  ropeY,
  SALUTE_RACK,
  SALUTES,
  sparkAt,
  starAt,
  TITAN_BURST,
  TITAN_FIRE,
  TITAN_W,
  TITAN_X,
  TUBE_H,
  turned,
  UNIT_AT,
  STOPS,
  WHEEL,
  WHEEL_AT,
  WHEEL_R,
  WIND,
  wireY,
  burntTo,
  PIECES,
  type Burst,
  type Gun,
  type Puff,
  type Rise,
} from './fireworks-plan'

/**
 * FIREWORKS's drawings, all from show time, in the part's own cells: the riverside field below the end of the line,
 * the racks and their quick-match, the gerb, the Niagara wire, the finale's battery and mines, the great wheel, the
 * Titan and the guns that flank it, the salute rack, the crate, the ash; and everything that goes up: comets, shells'
 * rising tails, bursts (streaks and falling trails, never round blobs), smoke, and the light it all throws.
 *
 * The field is at night: things are dark shapes with a moonlit edge, lit up warm by whatever is burning near them.
 */

const FW = RAILWAY

/* ------------------------------------------------------------------ pen, colour */

export interface Pen {
  p: p5
  k: number
  ctx: CanvasRenderingContext2D
  /** Show time. */
  t: number
  /** The visible frame, in the part's cells. */
  f: { x0: number; y0: number; x1: number; y1: number }
}

const RGB = new Map<string, [number, number, number]>()
function rgb(hex: string): [number, number, number] {
  let c = RGB.get(hex)
  if (!c) {
    c = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
    RGB.set(hex, c)
  }
  return c
}
export const rgba = (hex: string, a: number): string => {
  const [r, g, b] = rgb(hex)
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`
}
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** Dark things by night: the timber, the tubes, the iron. */
const WOOD = mixHex(FW.crate, FW.iron, 0.55)
const WOOD_LIT = FW.crateLit
const TUBE = mixHex(FW.tube, FW.iron, 0.35)
const TUBE_LIT = mixHex(FW.tube, FW.crateLit, 0.55)
const CHAR = mixHex(FW.iron, FW.tube, 0.25)
const IRON_LIT = FW.ironLit
const GROUND = mixHex(FW.plain, FW.iron, 0.45)
const ASHC = mixHex(FW.smoke, FW.iron, 0.55)

/* ------------------------------------------------------------------ where the salutes break */

/**
 * How near (cells) a salute may break to the spark. The plan sets each one off the spark's path by an offset (some as
 * close as 1.7); where it is drawn, it is pushed out along the line from the spark until it is this far from it at
 * the bang and for the moment after, so its flash is a bang beside the spark, not a second light on top of it.
 */
const SALUTE_GAP = 2.15
const SALUTE_AT = new Map<number, Pt>()
for (const b of BURSTS) {
  if (b.kind !== 'salute') continue
  const q: Pt = [b.x, b.y]
  for (let it = 0; it < 3; it++) {
    for (const dt of [0, 0.08, 0.16, 0.24]) {
      const sp = sparkAt(b.at + dt)
      const dx = q[0] - sp[0]
      const dy = q[1] - sp[1]
      const d = Math.hypot(dx, dy) || 1e-6
      if (d < SALUTE_GAP) {
        q[0] = sp[0] + (dx / d) * SALUTE_GAP
        q[1] = sp[1] + (dy / d) * SALUTE_GAP
      }
      // Never down on the field: if the floor holds it, it goes out sideways instead.
      if (q[1] > GY - 1.6) {
        q[1] = GY - 1.6
        const ry = q[1] - sp[1]
        const need = Math.sqrt(Math.max(0, SALUTE_GAP * SALUTE_GAP - ry * ry))
        if (Math.abs(q[0] - sp[0]) < need) q[0] = sp[0] + Math.sign(q[0] - sp[0] || 1) * need
      }
    }
  }
  SALUTE_AT.set(b.at, q)
}
/** A burst as it is drawn: a salute at its drawn place, anything else as planned. */
function placed(b: Burst): Burst {
  if (b.kind !== 'salute') return b
  const q = SALUTE_AT.get(b.at)
  return q ? { ...b, x: q[0], y: q[1] } : b
}
/** A rise as it is drawn: a salute's shell goes up to where its salute is drawn. */
function placedRise(r: Rise): Rise {
  if (r.col !== FW.fwWhite) return r
  const q = SALUTE_AT.get(r.to)
  return q ? { ...r, b: q } : r
}
/** A salute's light: warm (a hot gold), never white, so its glow on the smoke and the ground is fire, not fog. */
const SALUTE_LIGHT = mixHex(FW.fwGold, FW.coalHot, 0.45)

/* ------------------------------------------------------------------ the sky's glow */

/*
 * From the crash to the silence the finale lights the whole night. Every burst adds its own colour to the sky, laid
 * on with 'screen' as a vertical gradient strongest at the height its shells are breaking (0.35-0.45 at the heavy
 * chords), and it dies over about 0.35 s with a remainder that lasts as long as its stars burn. Under it all is a floor
 * of smoke-lit amber that rises through the coda (0.08 at the crash, 0.18 at the Titan), so between chords the sky
 * never goes back to plain navy. The Titan turns the whole sky gold for about 0.6 s. The river, the field, the smoke and
 * the silhouettes' sky-facing edges all take this light. On the silence everything it lit goes out inside 70 ms and
 * the night is a notch darker than it was before the festival: the silence is black, and the ember is its one light.
 */

/** Everything the finale lights goes out with the silence: from 50 ms before it to 20 ms after, 70 ms in all. */
const KILL_A = HUSH - 0.05
const KILL_B = HUSH + 0.02
const hushKill = (t: number): number => 1 - smooth(t, KILL_A, KILL_B)
/** How far the silence's night has gone dark, 0..1: down with the silence, held to the first door home. */
const hushDark = (t: number): number => (t > OUT + 0.35 ? 0 : smooth(t, KILL_A, KILL_B))
/** The silence's night: the sky's navy all but gone to black. */
const NIGHT_DEEP = '#04060D'
/**
 * How much of `NIGHT_DEEP` lies over the sky in the silence: most at the top of the frame, less down to the horizon,
 * none on the plain, so the far country still stands against the sky and the spark's own light never shows as a disc
 * on a uniform black.
 */
const DEEP_SKY = 0.34
const DEEP_LOW = 0.1

/** The floor's colour: the finale's smoke lit amber from below by the fire on the field. */
const FLOOR_SKY = mixHex(FW.coal, FW.fwGold, 0.4)
/** The Titan's light on the sky: gold, a little deeper than its stars so the sky reads gold, not khaki. */
const TITAN_SKY = mixHex(FW.fwGold, FW.coal, 0.18)
const MINE_SKY = mixHex(FW.fwBlue, FW.fwWhite, 0.3)
/** The light a burst throws on the sky: its own colour, a white shell's warmed so it lights and does not fog. */
function skyColOf(b: Burst): string {
  if (b.kind === 'titan') return TITAN_SKY
  if (b.kind === 'salute') return SALUTE_LIGHT
  // The mines' fans are white, blue and violet: their light on the sky is a cold silver, never lilac.
  if (b.kind === 'mine') return MINE_SKY
  // Every light a little toward the fire's orange: a gold shell lights the night amber, not khaki.
  if (b.col === FW.fwWhite) return mixHex(mixHex(FW.fwWhite, FW.fwGold, 0.45), FW.coal, 0.18)
  return mixHex(mixHex(b.col, FW.fwGold, 0.15), FW.coal, 0.18)
}

/** The floor under the finale's sky, before the silence takes it. */
function skyFloor(t: number): number {
  if (t < CRASH) return 0
  return smooth(t, CRASH, CRASH + 0.12) * (0.08 + 0.1 * clamp01((t - CRASH) / (TITAN_BURST - CRASH)))
}

/**
 * How much burst `b` lights the sky `s` seconds after it breaks, before the cap: a flash that dies on a 0.35 s tau and
 * a remainder held while its stars burn. It goes by the shell's own flash (`wash`): the battery's heavy-chord shells
 * (wash 0.85-0.9) reach about 0.3, the barrage's many small-flash shells a few hundredths each (together they tint the
 * sky each chord's hue), the far ones next to nothing. A salute is a hard short warm hit, so each hammer blow is its
 * own step; the Titan holds its gold about 0.3 s and lets it go by 0.75.
 */
function skyOf(b: Burst, s: number): number {
  if (s < 0 || b.at < CRASH - 1e-3) return 0
  const L = lifeOf(b)
  if (s > L + 1.2) return 0
  const atk = smooth(s, 0, 0.03)
  const live = 1 - smooth(s, L * 0.3, L)
  const shape = 0.8 * Math.exp(-s / 0.35) + 0.2 * live
  switch (b.kind) {
    case 'titan':
      return atk * (0.4 * (1 - smooth(s, 0.3, 0.75)) + 0.08 * live)
    case 'salute':
      return atk * 0.17 * (b.wash / 0.6) ** 0.5 * Math.exp(-s / 0.2)
    case 'small':
      return atk * 0.006 * shape
    case 'mine':
      return atk * (0.02 + 0.2 * Math.min(1, b.wash)) * shape
    default:
      return atk * (0.012 + 0.32 * Math.min(1, b.wash) ** 1.1) * shape
  }
}
/** Where a burst's light on the sky is strongest: its break, drooping with its stars; a mine's high over its gun. */
const skyYOf = (b: Burst, s: number): number => (b.kind === 'mine' ? b.y - 6 : b.y + 0.3 * s)

interface SkyLayer {
  x: number
  y: number
  a: number
  col: string
  /** How evenly it lies over the whole sky, 0..1 (the Titan's gold is everywhere). */
  flat: number
}
export interface SkyGlow {
  /** How lit the sky is, all together (floor and bursts), 0..~0.58. */
  a: number
  /** The colour of that light, the strongest bursts' most. */
  col: string
  /** Where the light mostly comes from across the field, or NaN when it is only the floor (from all over). */
  x: number
  floor: number
  /** The bursts' light by colour (every shell of one hue together), strongest last; at most `SKY_LAYERS`. */
  layers: SkyLayer[]
}
const SKY_LAYERS = 4
const NO_SKY: SkyGlow = { a: 0, col: FLOOR_SKY, x: NaN, floor: 0, layers: [] }
let skyMemo: { t: number; v: SkyGlow } = { t: NaN, v: NO_SKY }

/** The finale's light on the sky at `t` (see above): zero before the crash and from the silence on. */
export function skyGlow(t: number): SkyGlow {
  if (skyMemo.t === t) return skyMemo.v
  let v = NO_SKY
  const kill = hushKill(t)
  if (t >= CRASH && kill > 0) {
    const floor = skyFloor(t)
    // Every shell of one hue lights the sky as one: summed, at their mean height and place, weighted by light.
    const byCol = new Map<string, SkyLayer>()
    let sum = 0
    let titan = 0
    for (const b0 of BURSTS) {
      const s = t - b0.at
      const a = skyOf(b0, s)
      if (a < 0.002) continue
      const b = placed(b0)
      if (b.kind === 'titan') titan = Math.max(titan, a / 0.48)
      const col = skyColOf(b)
      const flat = b.kind === 'titan' ? 0.75 : b.kind === 'mine' ? 0.35 : 0.15
      const l = byCol.get(col)
      if (!l) byCol.set(col, { x: b.x * a, y: skyYOf(b, s) * a, a, col, flat: flat * a })
      else {
        l.x += b.x * a
        l.y += skyYOf(b, s) * a
        l.a += a
        l.flat += flat * a
      }
      sum += a
    }
    const layers = [...byCol.values()]
    for (const l of layers) {
      l.x /= l.a
      l.y /= l.a
      l.flat /= l.a
    }
    layers.sort((p, q) => p.a - q.a)
    // The faintest hues go: what is left is still the sky's light, all of it (renormalised below).
    const kept = layers.slice(-SKY_LAYERS)
    const keptSum = kept.reduce((m, l) => m + l.a, 0)
    // Capped, so a pile of shells lights the sky and never fogs it: 0.46 at most, the Titan's gold a little more.
    const cap = 0.45 + 0.12 * clamp01(titan)
    const total = Math.min(sum, Math.max(0, cap - floor))
    const scale = keptSum > 0 ? (total / keptSum) * kill : 0
    let col = FLOOR_SKY
    let w = floor * floor
    let xw = 0
    let xs = 0
    for (const l of kept) {
      l.a *= scale
      const lw = l.a * l.a
      if (lw > 0) col = mixHex(col, l.col, lw / (w + lw))
      w += lw
      xw += l.a * l.x
      xs += l.a
    }
    const fl = floor * kill
    v = { a: fl + total * kill, col, x: xs > 0.01 ? xw / xs : NaN, floor: fl, layers: kept }
  }
  skyMemo = { t, v }
  return v
}

/**
 * A light's colour made vivid: pushed away from its own grey, so light laid on the navy colours it and never greys
 * it (a pale gold on a blue night is a khaki fog; a deep amber is fire).
 */
const VIVID = new Map<string, string>()
function vivid(col: string): string {
  let v = VIVID.get(col)
  if (!v) {
    const [r, g, b] = rgb(col)
    const m = (r + g + b) / 3
    const c = [r, g, b].map((x) => Math.round(Math.max(0, Math.min(255, m + (x - m) * 1.7))))
    v = '#' + c.map((x) => x.toString(16).padStart(2, '0')).join('')
    VIVID.set(col, v)
  }
  return v
}
/** A hue's dark: what the night under that light is tinted toward before the light itself is laid on. */
const DARK_OF = new Map<string, string>()
function darkOf(col: string): string {
  let d = DARK_OF.get(col)
  if (!d) {
    d = mixHex(vivid(col), '#000000', 0.78)
    DARK_OF.set(col, d)
  }
  return d
}
/** The floor's dark: the night under the finale's smoke goes plum, not grey (amber into navy cancels to grey). */
const FLOOR_DEEP = '#2B1024'

/**
 * The sky's glow, laid over the night before anything of the festival's is drawn (so every silhouette stays dark
 * against it), and in the silence the night taken a notch darker than it was before the festival.
 *
 * Each light is laid twice: first the navy is tinted toward that hue's own dark (so a warm light on a blue night makes
 * a warm night, not a grey-lilac one), then the light is added with 'screen'. Both are one vertical gradient across
 * the whole frame, strongest at the height the shells are breaking.
 */
function drawSky(pen: Pen): void {
  const { t, ctx, k, f } = pen
  const dark = hushDark(t)
  if (dark > 0.002) {
    const hy0 = horizonAt(pen.p, k)
    if (hy0 > f.y0) {
      const gr = ctx.createLinearGradient(0, f.y0 * k, 0, hy0 * k)
      gr.addColorStop(0, rgba(NIGHT_DEEP, DEEP_SKY * dark))
      gr.addColorStop(1, rgba(NIGHT_DEEP, DEEP_LOW * dark))
      ctx.fillStyle = gr
      ctx.fillRect(f.x0 * k - 2, f.y0 * k - 2, (f.x1 - f.x0) * k + 4, (hy0 - f.y0) * k + 2)
    }
  }
  const g = skyGlow(t)
  if (g.a < 0.004) return
  const hy = horizonAt(pen.p, k)
  // Down to the river's far side: the water and the field are laid over everything below it.
  const yb = Math.min(f.y1, Math.max(GY - 1.3, hy + 0.08) + 0.05)
  if (yb <= f.y0 + 0.1) return
  const W = f.x1 - f.x0
  const H = f.y1 - f.y0
  const span = yb - f.y0
  // The glow has no edges in it, so it is laid at a sixth of the frame's resolution and drawn up over the night in one
  // image (one fill of the frame instead of one per light).
  // It overhangs the frame by a few of its own pixels on every side, so its soft edge (where the image is sampled
  // against nothing) is always outside the picture.
  const Kd = k / SKY_DOWN
  const mg = 3 / Kd
  const pw = Math.max(8, Math.ceil((W + 2 * mg) * Kd))
  const ph = Math.max(4, Math.ceil((span + 2 * mg) * Kd))
  const oc = skyCanvas(pw, ph)
  const c = oc ?? ctx
  const K = oc ? Kd : k
  const ox = oc ? f.x0 - mg : 0
  const oy = oc ? f.y0 - mg : 0
  const X = (x: number) => (x - ox) * K
  const Y = (y: number) => (y - oy) * K
  c.save()
  if (oc) {
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.globalCompositeOperation = 'source-over'
    c.clearRect(0, 0, pw, ph)
  }
  const u = (y: number) => clamp01((y - f.y0) / span)
  const uh = Math.min(0.97, u(hy))
  const lay = (y: number, a: number, col: string, flat: number) => {
    if (a < 0.003) return
    const gr = c.createLinearGradient(0, Y(f.y0), 0, Y(yb))
    // Strongest at its height, falling off up to the frame's top and down to the horizon (the plain under it takes
    // less, and the field is laid over it); `flat` evens it out over the whole sky.
    const up = Math.max(0.02, Math.min(uh - 0.02, u(y)))
    gr.addColorStop(0, rgba(col, a * (0.18 + 0.62 * flat)))
    gr.addColorStop(up, rgba(col, a))
    gr.addColorStop(uh, rgba(col, a * (0.3 + 0.45 * flat)))
    gr.addColorStop(1, rgba(col, a * (0.12 + 0.35 * flat)))
    c.fillStyle = gr
    c.fillRect(X(f.x0 - mg) - 1, Y(f.y0 - mg) - 1, (W + 2 * mg) * K + 2, (span + 2 * mg) * K + 2)
  }
  /**
   * A hue's light: a very wide ellipse round where its shells are breaking (most of the frame's width and height, the
   * Titan's wider still), so the sky is lit toward the bursts and keeps some of its night at the far corners; what is
   * outside the ellipse keeps a little of it, so the whole frame changes colour on the chord.
   */
  const pool = (l: SkyLayer, a: number, col: string) => {
    if (a < 0.003) return
    const ry = H * (0.62 + 0.5 * l.flat)
    const rx = W * (0.6 + 0.5 * l.flat)
    const cy = Math.min(l.y, hy - 0.1 * H)
    c.save()
    c.translate(X(l.x), Y(cy))
    c.scale(rx / ry, 1)
    const gr = c.createRadialGradient(0, 0, 0, 0, 0, ry * K)
    const rest = a * (0.12 + 0.45 * l.flat)
    gr.addColorStop(0, rgba(col, a))
    gr.addColorStop(0.4, rgba(col, rest + (a - rest) * 0.62))
    gr.addColorStop(0.75, rgba(col, rest + (a - rest) * 0.2))
    gr.addColorStop(1, rgba(col, rest))
    c.fillStyle = gr
    // The frame (to the river), in the ellipse's own scaled units.
    const sx = ry / rx
    c.fillRect((f.x0 - mg - l.x) * K * sx - 1, (f.y0 - mg - cy) * K - 1, (W + 2 * mg) * K * sx + 2, (span + 2 * mg) * K + 2)
    c.restore()
  }
  // The floor lies high over the whole sky: the finale's smoke hanging over the field, lit from below.
  const fy = f.y0 + (hy - f.y0) * 0.5
  const ft = Math.min(0.45, 2.2 * g.floor)
  lay(fy, ft, litOver(FLOOR_DEEP, vivid(FLOOR_SKY), ft, 0.65 * g.floor), 0.6)
  // Then each hue round its shells, strongest last.
  // (The Titan's gold goes on at full strength: for its 0.6 s the whole sky is gold, not khaki.)
  for (const l of g.layers) {
    const titan = l.flat > 0.5
    const tau = Math.min(titan ? 0.5 : 0.45, TINT * l.a)
    pool(l, tau, litOver(darkOf(l.col), vivid(l.col), tau, (titan ? 1 : LIFT) * l.a))
  }
  c.restore()
  if (oc) ctx.drawImage(oc.canvas, ox * k, oy * k, (pw / K) * k, (ph / K) * k)
}
/** How hard a light tints the night toward its hue, and how much of it is added as light, for its strength. */
const TINT = 1.0
const LIFT = 0.72
/** The sky's glow is laid at 1/SKY_DOWN of the frame's resolution (it has no edges to lose). */
const SKY_DOWN = 6
let SKY_CANVAS: HTMLCanvasElement | null = null
/** The small canvas the sky's glow is laid in, `w` × `h` pixels; none where there is no document. */
function skyCanvas(w: number, h: number): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null
  if (!SKY_CANVAS) SKY_CANVAS = document.createElement('canvas')
  if (SKY_CANVAS.width !== w) SKY_CANVAS.width = w
  if (SKY_CANVAS.height !== h) SKY_CANVAS.height = h
  return SKY_CANVAS.getContext('2d')
}

/**
 * One source-over colour that does what tinting the night toward `dark` by `tau` and then screening `light` over it
 * by `lam` would: on a dark night (under about a fifth of full) screening adds about 0.8 of the light, so the pair is
 * `dark` + 0.82 × lam / tau × `light`, laid at `tau`. One fill instead of two, and no 'screen' (slow in software).
 */
function litOver(dark: string, light: string, tau: number, lam: number): string {
  if (tau <= 1e-4) return dark
  const d = rgb(dark)
  const l = rgb(light)
  const m = (0.82 * lam) / tau
  return '#' + [0, 1, 2].map((i) => Math.round(Math.min(255, d[i] + m * l[i])).toString(16).padStart(2, '0')).join('')
}

/** The sky's light on a silhouette's edges: how strong, what colour, and how much on its left and right flanks. */
function rimAt(t: number, x: number): { a: number; col: string; left: number; right: number } {
  const g = skyGlow(t)
  const a = Math.min(0.7, 1.55 * g.a)
  const col = mixHex(g.col, FW.fwWhite, 0.3)
  if (Number.isNaN(g.x)) return { a, col, left: 0.55, right: 0.55 }
  const right = 0.2 + 0.8 * smooth(g.x - x, -2, 2)
  return { a, col, left: 1.2 - right, right }
}
/** A strip of rim light from `a` (its lit end) to `b`, fading to `fade` of itself there. */
function rimStrip(pen: Pen, a: Pt, b: Pt, w: number, col: string, al: number, fade = 0.2): void {
  if (al < 0.01) return
  const { ctx, k } = pen
  const gr = ctx.createLinearGradient(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
  gr.addColorStop(0, rgba(col, al))
  gr.addColorStop(1, rgba(col, al * fade))
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const l = Math.hypot(dx, dy) || 1
  const nx = (-dy / l) * (w / 2)
  const ny = (dx / l) * (w / 2)
  ctx.fillStyle = gr
  ctx.beginPath()
  ctx.moveTo((a[0] + nx) * k, (a[1] + ny) * k)
  ctx.lineTo((b[0] + nx) * k, (b[1] + ny) * k)
  ctx.lineTo((b[0] - nx) * k, (b[1] - ny) * k)
  ctx.lineTo((a[0] - nx) * k, (a[1] - ny) * k)
  ctx.closePath()
  ctx.fill()
}
/** A tube's mouth catching the sky: the far half of its rim, lit. */
function rimMouth(pen: Pen, at: Pt, lean: number, rx: number, col: string, al: number): void {
  if (al < 0.01) return
  const { ctx, k } = pen
  ctx.save()
  ctx.translate(at[0] * k, at[1] * k)
  ctx.rotate(lean)
  ctx.strokeStyle = rgba(col, al)
  ctx.lineWidth = Math.max(0.8, rx * 0.16 * k)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.ellipse(0, 0, rx * 0.94 * k, rx * 0.34 * k, 0, Math.PI * 1.08, Math.PI * 1.92)
  ctx.stroke()
  ctx.restore()
}

/**
 * The finale's light inside a bank of smoke at (x, y): the bursts near it, by how bright they are now and how near,
 * in the colour of the nearest bright one. Zero outside the finale.
 */
function smokeLight(t: number, x: number, y: number): { a: number; col: string } {
  const g = skyGlow(t)
  if (g.a < 0.004) return { a: 0, col: FLOOR_SKY }
  let a = 0
  let best = 0
  let col = g.col
  for (const l of g.layers) {
    const d = Math.hypot(x - l.x, y - l.y)
    const reach = l.flat > 0.5 ? 9 : 4.5
    const v = (l.a / 0.33) * Math.exp(-((d / reach) ** 2))
    a += v
    if (v > best) {
      best = v
      col = l.col
    }
  }
  return { a: Math.min(1, a), col }
}

/* ------------------------------------------------------------------ light */

export interface Light {
  x: number
  y: number
  r: number
  a: number
  col: string
}

/** Everything giving light at `t`: the spark, the bursts, the flashes at the muzzles, the fountains, the fire. */
export function lightsAt(t: number): Light[] {
  const out: Light[] = []
  if (t >= IN && t <= OUT + 0.05) {
    const hidden = PIECES.some((pc) => pc.hidden && t > pc.a && t < pc.b)
    if (!hidden) {
      const [x, y] = sparkAt(t)
      const h = heat(t)
      out.push({ x, y, r: 1.4 + 1.1 * Math.min(2.6, h), a: 0.55 * Math.min(1, 0.25 + h * 0.4), col: FW.fwGold })
    }
  }
  // What the shells and their guns throw on the ground goes out with the silence, as the sky's glow does.
  const kill = hushKill(t)
  if (kill <= 0) {
    pushFires(out, t)
    return out
  }
  for (const b0 of BURSTS) {
    const s = t - b0.at
    if (s < 0 || s > 1.8) continue
    const b = placed(b0)
    const size = b.kind === 'titan' ? 1.4 : b.kind === 'salute' ? 0.8 : b.kind === 'small' ? 0.25 : b.kind === 'mine' ? 0.28 : 0.75
    const decay = b.kind === 'salute' ? Math.exp(-s / 0.12) : 0.75 * Math.exp(-s / 0.3) + 0.25 * Math.exp(-s / 1.1)
    out.push({ x: b.x, y: b.y + (b.kind === 'mine' ? -1.5 : 0.4 * s), r: 2.5 + (b.v / b.k) * 1.2, a: size * decay * kill, col: b.kind === 'salute' ? SALUTE_LIGHT : b.col })
  }
  for (const r of RISES) {
    const s = t - r.from
    if (s < 0 || s > 0.35) continue
    out.push({ x: r.a[0], y: r.a[1] - 0.3, r: r.comet ? 1.6 : 2.4, a: (r.comet ? 0.45 : r.col === FW.fwWhite ? 0.25 : 0.7) * Math.exp(-s / 0.08) * kill, col: FW.fwGold })
  }
  const jet = jetTop(t)
  if (jet > 0.05) out.push({ x: GERB[0], y: GERB[1] - jet * 0.5, r: 2 + jet * 0.6, a: 0.5 * clamp01(jet / 2), col: FW.fwGold })
  for (let j = 0; j < UNIT_AT.length; j++) {
    const a = pourAt(j, t)
    if (a > 0.02) out.push({ x: HANG[j], y: wireY(HANG[j]) + 1.8, r: 2.4, a: 0.35 * a, col: FW.fwGold })
  }
  const lit = driversLit(t)
  if (lit > 0.05) out.push({ x: wheelAt(t)[0], y: wheelAt(t)[1], r: 3.2, a: 0.08 * lit, col: FW.fwWhite })
  const blast = t - TITAN_FIRE
  if (blast >= 0 && blast < 0.8) out.push({ x: TITAN_X, y: LIP - 0.8, r: 5, a: 1.1 * Math.exp(-blast / 0.14), col: FW.fwWhite })
  pushFires(out, t)
  return out
}
/** The crate's fire and its smoulder: the light that is left in the silence. */
function pushFires(out: Light[], t: number): void {
  const fire = crateFire(t)
  if (fire > 0.02) out.push({ x: CRATE.x1 - 0.35, y: GY - 0.8, r: 2.2 + 1.4 * fire, a: 0.65 * fire * (0.9 + 0.1 * Math.sin(t * 17)), col: FW.coal })
  const sm = crateSmoulder(t)
  if (sm > 0.02) out.push({ x: CRATE.x1 - 0.25, y: GY - 0.3, r: 1.3, a: 0.2 * sm * breath(t), col: FW.coal })
}

/** How lit a point is, 0..1, and by what colour most. */
function litAt(L: Light[], x: number, y: number): { a: number; col: string } {
  let a = 0
  let best = 0
  let col: string = FW.fwGold
  for (const l of L) {
    const d2 = ((x - l.x) ** 2 + (y - l.y) ** 2) / (l.r * l.r)
    if (d2 >= 1) continue
    const v = l.a * (1 - d2) * (1 - d2)
    a += v
    if (v > best) {
      best = v
      col = l.col
    }
  }
  return { a: clamp01(a), col }
}
const shade = (L: Light[], dark: string, lit: string, x: number, y: number, base = 0): string => mixHex(dark, lit, clamp01(base + litAt(L, x, y).a))

/* ------------------------------------------------------------------ small shapes */

function quad(pen: Pen, pts: Pt[], fill: string): void {
  const { ctx, k } = pen
  ctx.fillStyle = fill
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.closePath()
  ctx.fill()
}
/** A bar from a to b, `w` wide. */
function bar(pen: Pen, a: Pt, b: Pt, w: number, fill: string): void {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const l = Math.hypot(dx, dy) || 1
  const nx = (-dy / l) * (w / 2)
  const ny = (dx / l) * (w / 2)
  quad(pen, [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]], fill)
}
function rectC(pen: Pen, x0: number, y0: number, x1: number, y1: number, fill: string): void {
  quad(pen, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], fill)
}
function line(pen: Pen, pts: Pt[], w: number, stroke: string): void {
  const { ctx, k } = pen
  ctx.strokeStyle = stroke
  ctx.lineWidth = Math.max(0.6, w * k)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.stroke()
}
/** A soft round glow: light only, never a solid disc. */
function glow(pen: Pen, x: number, y: number, r: number, col: string, a: number, sy = 1): void {
  if (a <= 0.004 || r <= 0) return
  const { ctx, k } = pen
  ctx.save()
  ctx.translate(x * k, y * k)
  if (sy !== 1) ctx.scale(1, sy)
  const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, r * k)
  gr.addColorStop(0, rgba(col, a * 0.8))
  gr.addColorStop(0.35, rgba(col, a * 0.35))
  gr.addColorStop(1, rgba(col, 0))
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = gr
  ctx.fillRect(-r * k, -r * k, 2 * r * k, 2 * r * k)
  ctx.restore()
}
/** Draw what `fn` draws as light: added to what is under it, so fire brightens the night instead of greying it. */
function additive(pen: Pen, fn: () => void): void {
  pen.ctx.save()
  pen.ctx.globalCompositeOperation = 'lighter'
  fn()
  pen.ctx.restore()
}
export { additive }
/** A tube (a mortar, a gerb, a driver): its base at `a`, leaning `lean` from upright, `w` wide, `h` tall. */
function tube(pen: Pen, a: Pt, lean: number, w: number, h: number, body: string, rim: string, dy = 0): Pt {
  const top: Pt = [a[0] + Math.sin(lean) * h, a[1] + dy - Math.cos(lean) * h]
  bar(pen, [a[0], a[1] + dy], top, w, body)
  // Its round side: a lit strip down one flank.
  const off = w * 0.22
  bar(pen, [a[0] - off * Math.cos(lean), a[1] + dy - off * Math.sin(lean)], [top[0] - off * Math.cos(lean), top[1] - off * Math.sin(lean)], w * 0.16, rgba(FW.crateLit, 0.18))
  // The rim, a little wider, and its bore seen a little from above: filled dark.
  mouth(pen, top, lean, w * 0.58, rim)
  return top
}
/** A tube's mouth: its rim and its dark bore, an ellipse turned with the tube. */
function mouth(pen: Pen, at: Pt, lean: number, rx: number, rim: string, bore: string = FW.iron): void {
  const { ctx, k } = pen
  ctx.save()
  ctx.translate(at[0] * k, at[1] * k)
  ctx.rotate(lean)
  ctx.fillStyle = rim
  ctx.beginPath()
  ctx.ellipse(0, 0, rx * k, rx * 0.36 * k, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = bore
  ctx.beginPath()
  ctx.ellipse(0, -rx * 0.04 * k, rx * 0.74 * k, rx * 0.24 * k, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/* ------------------------------------------------------------------ the ground */

/**
 * The field: the rail's level past the buffer stops. The night's plain runs to the horizon behind it (EXPRESS's
 * `night.ts`, which keeps the horizon at the camera's eye); between the plain and the field lies the river, where
 * everything that burns in the sky burns again, smeared straight down.
 */
export function drawGround(pen: Pen, L: Light[]): void {
  const { f, t, ctx, k } = pen
  drawSky(pen)
  const x0 = Math.max(f.x0, STOPS + 0.2)
  const x1 = f.x1
  if (x1 <= x0) return
  const hy = horizonAt(pen.p, k)
  const top = Math.max(GY - 1.3, hy + 0.08)
  const bank = GY - 0.34
  const sky = skyGlow(t)
  // In the silence the water and the field go down with the sky.
  const dark = hushDark(t)
  // The field fades in from under the line's end, so the two grounds meet without a seam.
  const fadeIn = (x: number) => clamp01((x - STOPS - 0.2) / 1.6)
  const edge = ctx.createLinearGradient((STOPS + 0.2) * k, 0, (STOPS + 1.8) * k, 0)
  if (top < bank) {
    const water = mixHex(FW.river, NIGHT_DEEP, 0.3 * dark)
    edge.addColorStop(0, rgba(water, 0))
    edge.addColorStop(1, rgba(water, 1))
    ctx.fillStyle = edge
    ctx.fillRect(x0 * k, top * k, (x1 - x0) * k, (bank - top) * k)
    // The water gives back the sky: the finale's glow over the whole band, a little more at the far side.
    if (sky.a > 0.004) {
      // Water stays dark: its blue is warmed toward the light's hue, and only a little of the light itself is added.
      const xa = Math.max(x0, STOPS + 1.8)
      const tau = Math.min(0.55, 1.2 * sky.a)
      const lift = ctx.createLinearGradient(0, top * k, 0, bank * k)
      lift.addColorStop(0, rgba(litOver(darkOf(sky.col), sky.col, tau, Math.min(0.12, 0.26 * sky.a)), tau))
      lift.addColorStop(1, rgba(litOver(darkOf(sky.col), sky.col, tau, Math.min(0.07, 0.15 * sky.a)), tau))
      ctx.fillStyle = lift
      ctx.fillRect(xa * k, top * k, (x1 - xa) * k, (bank - top) * k)
    }
    // The water's own light: a few soft glints, only where something shines on it (the moon, a live burst), in a
    // loose cluster under it, fading with distance from it. Soft tapered smears (a flattened glow), never hairlines, and
    // never at an even pitch. Clipped to the river so none spills on the bank.
    ctx.save()
    ctx.beginPath()
    ctx.rect(x0 * k, top * k, (x1 - x0) * k, (bank - top) * k)
    ctx.clip()
    const band = bank - top
    const glints = (lx: number, a0: number, spread: number, n: number, col: string, seed: number) => {
      for (let i = 0; i < n; i++) {
        // Nearer the source: a little more of them, and brighter; they thin out with distance down and sideways.
        const u = hash(i, seed, 1) ** 1.4
        const y = top + 0.06 + (band - 0.1) * u
        const side = (hash(i, seed, 2) - 0.5) * 2
        const drift = 0.12 * Math.sin(t * (0.6 + 0.5 * hash(i, seed, 3)) + i * 2.3)
        const x = lx + side * spread * (0.3 + 0.7 * u) + drift
        const d = Math.abs(x - lx) / Math.max(0.2, spread)
        const shimmer = 0.6 + 0.4 * Math.sin(t * (1.4 + 1.2 * hash(i, seed, 4)) + i * 1.7)
        const a = a0 * (1 - 0.55 * u) * Math.max(0, 1 - 0.8 * d) * shimmer * fadeIn(x)
        if (a < 0.006) continue
        const w = (0.28 + 0.4 * hash(i, seed, 5)) * (0.7 + 0.6 * u) * Math.max(0.4, spread / 1.2)
        glow(pen, x, y, w, col, a, 0.09 + 0.05 * hash(i, seed, 6))
      }
    }
    const m = moonAt(pen.p, k, t)
    glints(m.x, 0.22 * moonLight(t) * (1 - 0.7 * dark), 0.7 + 0.8 * m.r, 7, FW.moonHalo, 11)
    // What burns in the sky burns in the river too, under it, shivering as the water moves.
    for (const l of L) {
      if (l.y > GY - 1.5 || l.a < 0.04) continue
      const a0 = 0.5 * Math.min(1, l.a)
      if (a0 < 0.02) continue
      glints(l.x, a0, Math.min(1.6, 0.35 + l.r * 0.3), 4, l.col, 20 + parseInt(l.col.slice(1, 3), 16))
    }
    drawRiverColumns(pen, top, bank, fadeIn)
    ctx.restore()
  }
  const ground = mixHex(GROUND, NIGHT_DEEP, 0.12 * dark)
  const g2 = ctx.createLinearGradient((STOPS + 0.2) * k, 0, (STOPS + 1.8) * k, 0)
  g2.addColorStop(0, rgba(ground, 0))
  g2.addColorStop(1, rgba(ground, 1))
  ctx.fillStyle = g2
  ctx.fillRect(x0 * k, bank * k, (x1 - x0) * k, (f.y1 + 1 - bank) * k)
  // The field takes the sky's light: brightest at the far bank under the bursts, less toward us.
  const fa = Math.min(0.12, 0.26 * sky.a)
  if (fa > 0.004) {
    const xa = Math.max(x0, STOPS + 1.8)
    // Warmed toward the light's hue as it is lit, so the lit field is a firelit field and not a grey one.
    const tau = Math.min(0.3, 1.4 * fa)
    const wash = ctx.createLinearGradient(0, bank * k, 0, (f.y1 + 1) * k)
    wash.addColorStop(0, rgba(litOver(darkOf(sky.col), sky.col, tau, fa), tau))
    wash.addColorStop(Math.min(0.9, 1.6 / Math.max(1.7, f.y1 + 1 - bank)), rgba(litOver(darkOf(sky.col), sky.col, tau, fa * 0.72), tau))
    wash.addColorStop(1, rgba(litOver(darkOf(sky.col), sky.col, tau, fa * 0.35), tau * 0.8))
    ctx.fillStyle = wash
    ctx.fillRect(xa * k, bank * k, (x1 - xa) * k, (f.y1 + 1 - bank) * k)
  }
  // The bank's moonlit lip: a soft band fading down into the field, not a ruled line.
  const g3 = ctx.createLinearGradient(0, (bank - 0.02) * k, 0, (bank + 0.12) * k)
  g3.addColorStop(0, rgba(FW.moonHalo, 0))
  g3.addColorStop(0.3, rgba(FW.moonHalo, 0.07 * (1 - 0.7 * dark)))
  g3.addColorStop(1, rgba(FW.moonHalo, 0))
  ctx.fillStyle = g3
  ctx.fillRect(Math.max(x0, STOPS + 1.2) * k, (bank - 0.02) * k, (x1 - Math.max(x0, STOPS + 1.2)) * k, 0.14 * k)
  // Light on the ground under whatever is burning.
  for (const l of L) {
    if (l.a < 0.03) continue
    const rx = l.r * 1.1
    const d = Math.max(0, GY - l.y)
    const a = Math.min(0.35, l.a * 0.28 * Math.max(0, 1 - d / (l.r * 1.6))) * fadeIn(l.x)
    if (a < 0.01) continue
    ctx.save()
    ctx.beginPath()
    ctx.rect((l.x - rx) * k, bank * k, 2 * rx * k, (f.y1 + 1 - bank) * k)
    ctx.clip()
    glow(pen, l.x, GY - 0.1, rx, l.col, a)
    ctx.restore()
  }
}

/**
 * How brightly burst `b` stands in the river `s` seconds after it breaks, 0..~0.8: the flash, then held for as long
 * as its stars burn, so a flower's column lasts its whole life and does not blink out with the flash.
 */
function riverOf(b: Burst, s: number): number {
  if (s < 0 || b.at < CRASH - 1e-3) return 0
  const L = lifeOf(b)
  if (s > L) return 0
  const atk = smooth(s, 0, 0.04)
  const live = 1 - smooth(s, L * 0.4, L)
  const both = 0.35 * Math.exp(-s / 0.25) + 0.65 * live
  switch (b.kind) {
    case 'titan':
      return atk * both
    case 'salute':
      return atk * 0.8 * Math.exp(-s / 0.16)
    case 'small':
      return atk * 0.25 * both
    case 'mine':
      return atk * 0.45 * both
    default:
      return atk * 0.9 * (0.35 + 0.65 * Math.min(1, b.wash)) * both
  }
}

/**
 * Every burst in the finale mirrored in the river: a broken vertical column of its colour straight down the water
 * under it, a stack of short ripples from the far side to the bank, each its own width and brightness and shivering
 * sideways on its own clock, widening a little toward us, so it is a reflection and never a ruled bar. Clipped to the
 * river by the caller.
 */
function drawRiverColumns(pen: Pen, top: number, bank: number, fadeIn: (x: number) => number): void {
  const { t, f } = pen
  const kill = hushKill(t)
  if (kill <= 0 || t < CRASH) return
  const band = bank - top
  if (band < 0.08) return
  const { ctx, k } = pen
  const N = Math.max(8, Math.min(22, Math.round(band / 0.05)))
  const thick = (0.62 * band) / N
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const b0 of BURSTS) {
    const s = t - b0.at
    const A = riverOf(b0, s) * kill
    if (A < 0.02) continue
    const b = placed(b0)
    // About the width of the flower's heart (a mine's fan, a salute's flash: narrower).
    const R = Math.min(5, b.v / b.k) * (1 - Math.exp(-b.k * Math.max(0, s)))
    const half = Math.min(1.0, b.kind === 'salute' ? 0.35 : b.kind === 'mine' ? 0.3 : 0.14 + 0.1 * R)
    if (b.x + half * 2 < f.x0 || b.x - half * 2 > f.x1) continue
    const col = b.kind === 'titan' ? FW.fwGold : b.kind === 'salute' ? SALUTE_LIGHT : b.col === FW.fwWhite ? mixHex(FW.fwWhite, FW.fwGold, 0.3) : b.col
    const seed = Math.round(b.at * 100) % 997
    const fx = fadeIn(b.x)
    for (let i = 0; i < N; i++) {
      const u = (i + 0.5) / N
      const h = (m: number) => hash(i, seed, 300 + m)
      const y = top + band * u + (h(1) - 0.5) * (band / N) * 0.5
      // Broken: each ripple breathes on its own clock, bright and dim, never quite out.
      const br = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * (2.1 + 2.6 * h(2)) + i * 2.9 + seed)) ** 1.5
      const a = Math.min(0.95, A * br * (1 - 0.25 * u) * fx)
      if (a < 0.015) continue
      const w = half * (0.7 + 0.5 * u) * (0.3 + 0.8 * h(3) ** 1.3)
      const x = b.x + (h(4) - 0.5) * 0.6 * half + 0.08 * Math.sin(t * (0.9 + 0.8 * h(5)) + i * 1.7)
      const hh = thick * (0.6 + 0.6 * h(6))
      ctx.save()
      ctx.translate(x * k, y * k)
      ctx.scale(1, hh / w)
      const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, w * k)
      gr.addColorStop(0, rgba(col, a))
      gr.addColorStop(0.45, rgba(col, a * 0.6))
      gr.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = gr
      ctx.fillRect(-w * k, -w * k, 2 * w * k, 2 * w * k)
      ctx.restore()
    }
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ the racks and the match */

const dip = (s: number, size = 0.05, tau = 0.06): number => (s <= 0 ? 0 : size * (s / tau) * Math.exp(1 - s / tau))

/** A rack tube's paper: dark kraft with a red band under the mouth. */
const PAPER = mixHex(FW.tube, FW.iron, 0.25)
const BAND = mixHex(FW.signalRed, FW.iron, 0.45)

export function drawRacks(pen: Pen, L: Light[]): void {
  const { t } = pen
  for (let i = 0; i < 4; i++) {
    const n = RACK_N[i]
    const x = RACK_X[i]
    if (x < pen.f.x0 - 2 || x > pen.f.x1 + 2) continue
    const half = 0.15 * n + 0.2
    const dy = dip(t - RACK_AT[i], 0.045)
    const wood = shade(L, mixHex(WOOD, WOOD_LIT, 0.25), WOOD_LIT, x, GY - 0.6)
    const top = ROPE_Y + 0.14 + dy
    // The tubes, standing up through the frame, a little fanned; each kicks down into it as it fires.
    const fired = t >= RACK_AT[i]
    for (let j = 0; j < n; j++) {
      const tb = rackTube(i, j)
      const kick = dy + dip(t - RACK_AT[i], 0.06, 0.05)
      const body = shade(L, fired ? CHAR : PAPER, TUBE_LIT, tb.x, GY - 0.8)
      const mouthAt = tube(pen, [tb.x, GY - 0.02], tb.lean, 0.24, TUBE_H, body, mixHex(body, FW.iron, 0.45), kick)
      // The paper band a little under the mouth.
      const dir: Pt = [Math.sin(tb.lean), -Math.cos(tb.lean)]
      const a: Pt = [mouthAt[0] - dir[0] * 0.34, mouthAt[1] - dir[1] * 0.34]
      const b: Pt = [mouthAt[0] - dir[0] * 0.2, mouthAt[1] - dir[1] * 0.2]
      bar(pen, a, b, 0.245, shade(L, fired ? mixHex(BAND, CHAR, 0.5) : BAND, FW.signalRed, tb.x, GY - 1, -0.1))
    }
    // The frame: two uprights, a rail across the tubes where the match lies, and a sill.
    rectC(pen, x - half - 0.04, top, x - half + 0.05, GY, wood)
    rectC(pen, x + half - 0.05, top, x + half + 0.04, GY, wood)
    rectC(pen, x - half - 0.1, top - 0.02, x + half + 0.1, top + 0.08, wood)
    rectC(pen, x - half - 0.14, GY - 0.12, x + half + 0.14, GY, wood)
  }
}

/** The quick-match: pale where it has yet to burn, black and smoking behind the spark. */
export function drawMatch(pen: Pen): void {
  const { t } = pen
  const burnt = burntTo(t)
  const x0 = RACK_X[0] - 0.35
  const x1 = GERB[0]
  const pts = (a: number, b: number): Pt[] => {
    const out: Pt[] = []
    const n = Math.max(2, Math.ceil((b - a) / 0.12))
    for (let i = 0; i <= n; i++) {
      const x = a + ((b - a) * i) / n
      out.push([x, x < RACK_X[0] ? ROPE_Y + 0.08 * (RACK_X[0] - x) : ropeY(x)])
    }
    return out
  }
  const cut = Math.max(x0, Math.min(x1, burnt))
  if (cut > x0) line(pen, pts(x0, cut), 0.035, rgba(FW.sleeper, 0.95))
  if (cut < x1) line(pen, pts(cut, x1), 0.04, FW.fuse)
  // A thread of smoke off the burnt match, thinning as it rises.
  if (t > RACK_AT[0] && t < RACK_AT[0] + 7) {
    for (let i = 0; i < 40; i++) {
      const x = x0 + (i / 39) * (x1 - x0)
      const s = t - burntAt(x)
      if (s < 0 || s > 2.2) continue
      const y = ropeY(x) - 0.08 - s * 0.45
      const wx = x + WIND[0] * s + 0.06 * Math.sin(s * 5 + i)
      pen.ctx.fillStyle = rgba(FW.smoke, 0.16 * (1 - s / 2.2))
      pen.ctx.fillRect((wx - 0.03 - 0.03 * s) * pen.k, y * pen.k, (0.06 + 0.06 * s) * pen.k, 0.12 * pen.k)
    }
  }
}
/** When the burning reached `x` along the match. */
function burntAt(x: number): number {
  let lo = RACK_AT[0]
  let hi = GERB_AT
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (burntTo(mid) < x) lo = mid
    else hi = mid
  }
  return lo
}

/* ------------------------------------------------------------------ the gerb */

export function drawGerb(pen: Pen, L: Light[]): void {
  const x = GERB[0]
  if (x < pen.f.x0 - 3 || x > pen.f.x1 + 3) return
  const wood = shade(L, WOOD, WOOD_LIT, x, GY - 0.3)
  rectC(pen, x - 0.34, GY - 0.22, x + 0.34, GY, wood)
  const body = shade(L, pen.t > GERB_AT ? CHAR : TUBE, TUBE_LIT, x, GY - 0.6)
  bar(pen, [x, GY - 0.2], [x, GERB[1] + 0.12], 0.34, body)
  // Its choke: a short cone at the mouth.
  quad(pen, [[x - 0.17, GERB[1] + 0.13], [x + 0.17, GERB[1] + 0.13], [x + 0.08, GERB[1] + 0.01], [x - 0.08, GERB[1] + 0.01]], mixHex(body, FW.iron, 0.4))
}

/**
 * The gerb's fountain: a column of sparks standing as high as `jetTop` (each one's arc scaled to the jet as it is now,
 * so the column rises and surges with it and the spark rides in its crown), and a wider, lower spray falling away.
 */
export function drawFountain(pen: Pen): void {
  const { t, ctx, k } = pen
  if (t < GERB_AT || t > 133) return
  const H = jetTop(t)
  if (H < 0.03) return
  const x0 = GERB[0]
  const y0 = GERB[1]
  ctx.lineCap = 'round'
  glow(pen, x0, y0 - 0.25, 0.8, FW.fwGold, 0.45 * clamp01(H / 1.5))
  const rate = 260
  const from = GERB_AT
  const start = Math.max(from, t - 1.0)
  for (let i = Math.floor((start - from) * rate); i <= (t - from) * rate; i++) {
    const born = from + (i + 0.9 * (hash(i, 17) - 0.5)) / rate
    const a = t - born
    if (a < 0) continue
    const core = hash(i, 6) < 0.6
    const life = core ? 0.7 + 0.25 * hash(i, 7) : 0.55 + 0.3 * hash(i, 7)
    if (a > life) continue
    const peak = H * (core ? 0.94 + 0.14 * hash(i, 5) : 0.3 + 0.35 * hash(i, 5))
    const T = life * (core ? 0.55 : 0.45)
    const lean = (hash(i, 3) - 0.5) * (core ? 0.22 : 1.3) + 0.05
    const at = (s: number): Pt => {
      const u = s / T
      return [x0 + lean * peak * 0.55 * u, y0 - peak * u * (2 - u)]
    }
    const [x, y] = at(a)
    const [px, py] = at(Math.max(0, a - 0.05))
    const fade = 1 - smooth(a, life * 0.65, life)
    ctx.strokeStyle = rgba(a < 0.1 ? FW.fwWhite : FW.fwGold, 0.85 * fade)
    ctx.lineWidth = Math.max(0.7, 0.04 * k)
    ctx.beginPath()
    ctx.moveTo(px * k, py * k)
    ctx.lineTo(x * k, y * k)
    ctx.stroke()
  }
}

/* ------------------------------------------------------------------ the Niagara wire */

/** How strongly the Niagara's `j`th length is pouring at `t`, 0..1. */
export function pourAt(j: number, t: number): number {
  const s = t - UNIT_AT[j]
  if (s < 0) return 0
  return smooth(s, 0, 0.12) * (1 - smooth(s, POUR - 0.9, POUR)) * (1 - smooth(t, burnOut(j) - 0.45, burnOut(j)))
}
/**
 * When the `j`th length has burnt out: the curtain dies from the first length to the last as the spark leaves the
 * wire, thinning and sputtering, all of it gone by about 134.6 so the frame's left is clear for the crash.
 */
const burnOut = (j: number): number => 133.75 + 0.1 * j
/** What is still in the air from the `j`th length burns out with it. */
const curtainLeft = (j: number, t: number): number => 1 - smooth(t, burnOut(j) - 0.3, burnOut(j) + 0.08)
/** The lances along a length: short tubes at uneven spacing, each its own length, a little askew. */
const LANCES = HANG.map((_, j) => {
  const out: { x: number; len: number; lean: number }[] = []
  let x = -0.78 + 0.1 * hash(j, 201)
  for (let i = 0; x < 0.8; i++) {
    out.push({ x, len: 0.2 + 0.16 * hash(i, j, 202), lean: (hash(i, j, 203) - 0.5) * 0.22 })
    // Bundled: some shoulder to shoulder, some with a gap.
    x += hash(i, j, 204) < 0.6 ? 0.1 + 0.03 * hash(i, j, 205) : 0.2 + 0.14 * hash(i, j, 205)
  }
  return out
})

export function drawWire(pen: Pen, L: Light[]): void {
  const { f } = pen
  if (MAST_B < f.x0 - 2 || MAST_A > f.x1 + 2) return
  // The two masts.
  for (const x of [MAST_A, MAST_B]) {
    const wood = shade(L, WOOD, WOOD_LIT, x, wireY(x) + 1.5)
    bar(pen, [x, GY], [x, wireY(x) - 0.28], 0.15, wood)
    bar(pen, [x - 0.2, wireY(x) - 0.03], [x + 0.2, wireY(x) - 0.03], 0.06, wood)
    quad(pen, [[x - 0.1, wireY(x) - 0.28], [x + 0.1, wireY(x) - 0.28], [x, wireY(x) - 0.42]], wood)
  }
  // The wire.
  const pts: Pt[] = []
  for (let x = MAST_A; x <= MAST_B + 1e-6; x += 0.25) pts.push([x, wireY(x)])
  line(pen, pts, 0.022, rgba(FW.rail, 0.85))
  // The Niagara's lengths, lashed along under it: each a loose bundle of short paper lances hanging mouth down, at
  // uneven spacing and lengths, out of which the curtain pours.
  for (let j = 0; j < HANG.length; j++) {
    const cx = HANG[j]
    if (cx < f.x0 - 2 || cx > f.x1 + 2) continue
    const lit = pourAt(j, pen.t)
    const spent = pen.t > UNIT_AT[j]
    // Kraft paper by night: dark, warmed only by what burns near it (itself, once lit).
    const dark = mixHex(spent ? CHAR : TUBE, FW.iron, 0.35)
    // A thin lashing along the wire that holds the bundle.
    const run: Pt[] = []
    for (let i = 0; i <= 8; i++) {
      const x = cx - 0.84 + (1.68 * i) / 8
      run.push([x, wireY(x) + 0.06])
    }
    line(pen, run, 0.03, shade(L, dark, TUBE_LIT, cx, wireY(cx) + 0.2, 0.15 * lit))
    for (const ln of LANCES[j]) {
      const x = cx + ln.x
      const y = wireY(x) + 0.04
      const end: Pt = [x + Math.sin(ln.lean) * ln.len, y + Math.cos(ln.lean) * ln.len]
      const body = shade(L, dark, TUBE_LIT, end[0], end[1], 0.3 * lit)
      // A fat little paper tube hanging off the wire: its body, a lit flank, and its mouth at the foot, dark until
      // it catches and hot while it pours.
      bar(pen, [x, y], end, 0.085, body)
      bar(pen, [x - 0.022, y + 0.02], [end[0] - 0.022, end[1] - 0.02], 0.016, rgba(FW.crateLit, 0.08 + 0.25 * lit))
      mouth(pen, end, ln.lean + Math.PI, 0.05, mixHex(body, FW.iron, 0.4), lit > 0.05 ? mixHex(FW.coal, FW.fwGold, 0.5 * lit) : FW.iron)
    }
  }
}

/**
 * The curtain: gold falling from every lit length, the newest flaring as it catches. Soft glowing streaks, each its
 * own length and pace (a few quick and bright, most slower and dimmer), over a warm haze hanging under the wire; it
 * thins and dies length by length as the spark leaves the wire (`burnOut`).
 */
export function drawCurtain(pen: Pen): void {
  const { t, ctx, k, f } = pen
  ctx.lineCap = 'round'
  for (let j = 0; j < HANG.length; j++) {
    const cx = HANG[j]
    if (cx < f.x0 - 2 || cx > f.x1 + 2) continue
    const s0 = t - UNIT_AT[j]
    const left = curtainLeft(j, t)
    if (s0 < 0 || s0 > POUR + 1.2 || left <= 0.004) continue
    const y0 = wireY(cx) + 0.38
    const on = pourAt(j, t)
    // The haze: the light of the fall on its own smoke, a warm glow under the length, taller than wide.
    if (on > 0.02) {
      const hz = on * (0.85 + 0.15 * Math.sin(t * 7.3 + j * 2.1))
      glow(pen, cx, y0 + 0.9, 1.25, FW.fwGold, 0.26 * hz, 1.35)
      glow(pen, cx + 0.3 * Math.sin(t * 0.9 + j), y0 + 1.8, 1.1, FW.coal, 0.1 * hz, 1.2)
    }
    // It catches ON the backbeat: the flare along its length is brightest in the frame the cymbal is heard in and dies
    // over about 0.15 s, and a gush of white sparks is spat down and out from every lance within 20 ms of it.
    if (s0 < 0.45) glow(pen, cx, y0, 1.3, FW.fwWhite, 0.7 * Math.exp(-s0 / 0.15), 0.3)
    if (s0 < 0.6) {
      const gn = 6.5
      for (let i = 0; i < 36; i++) {
        // Spat over the first 20 ms, not all in one instant (which would be a row of beads), and fast out of the mouth.
        const sa = s0 - 0.02 * hash(i, j, 34)
        if (sa < 0.003 || sa > 0.55) continue
        const x = cx + (hash(i, j, 31) - 0.5) * 1.5
        const ly = wireY(x) + 0.33
        const vx = (hash(i, j, 32) - 0.5) * 2.6
        const vy = 2.2 + 3.3 * hash(i, j, 33)
        const at = (s: number): Pt => [x + vx * s, ly + vy * s + 0.5 * gn * s * s]
        const [px, py] = at(sa)
        const [qx, qy] = at(Math.max(0, sa - 0.07))
        const fade = 1 - sa / 0.55
        ctx.strokeStyle = rgba(sa < 0.18 ? FW.fwWhite : FW.fwGold, 0.9 * fade * left)
        ctx.lineWidth = Math.max(0.7, 0.035 * k)
        ctx.beginPath()
        ctx.moveTo(qx * k, qy * k)
        ctx.lineTo(px * k, py * k)
        ctx.stroke()
      }
    }
    const rate = 120
    const from = UNIT_AT[j]
    const start = Math.max(from, t - 1.3)
    for (let i = Math.floor((start - from) * rate); i <= (t - from) * rate; i++) {
      const born = from + (i + 0.95 * (hash(i, j, 7) - 0.5)) / rate
      const a = t - born
      if (a < 0) continue
      const pour = pourAt(j, born)
      if (pour < 0.05 || hash(i, j, 9) > pour) continue
      // Each its own kind: a few quick hot ones, most slower, heavier with smoke, and dimmer.
      const quick = hash(i, j, 5)
      const gn = 3.2 + 4.2 * quick
      const life = (0.7 + 0.55 * hash(i, j, 2)) * (1.15 - 0.3 * quick)
      if (a > life) continue
      const x = cx + (hash(i, j, 3) - 0.5) * 1.62
      const ly = wireY(x) + 0.3 + 0.08 * hash(i, j, 6)
      const vx = 0.08 + 0.4 * (hash(i, j, 4) - 0.5)
      const vy = 0.1 + 0.7 * hash(i, j, 8)
      const at = (s: number): Pt => [x + vx * s, ly + vy * s + 0.5 * gn * s * s]
      // Its streak: how far back in time it shows, varied, so the fall is never a ruled hatch.
      const tail = 0.035 + 0.11 * hash(i, j, 10) ** 1.5
      const fade = (1 - a / life) ** 1.3 * left * (0.45 + 0.55 * quick) * (0.85 + 0.15 * Math.sin(t * 31 + i))
      if (fade < 0.02) continue
      const hot = a < 0.08 ? FW.fwWhite : FW.fwGold
      const p1 = at(a)
      const pm = at(Math.max(0, a - tail * 0.45))
      const p0 = at(Math.max(0, a - tail))
      // A soft wide glow along it, then the bright thread at its head.
      ctx.strokeStyle = rgba(FW.fwGold, 0.22 * fade)
      ctx.lineWidth = Math.max(1.2, (0.07 + 0.04 * quick) * k)
      ctx.beginPath()
      ctx.moveTo(p0[0] * k, p0[1] * k)
      ctx.lineTo(p1[0] * k, p1[1] * k)
      ctx.stroke()
      ctx.strokeStyle = rgba(hot, 0.35 * fade)
      ctx.lineWidth = Math.max(0.6, 0.022 * k)
      ctx.beginPath()
      ctx.moveTo(p0[0] * k, p0[1] * k)
      ctx.lineTo(pm[0] * k, pm[1] * k)
      ctx.stroke()
      ctx.strokeStyle = rgba(hot, 0.85 * fade)
      ctx.lineWidth = Math.max(0.7, 0.03 * k)
      ctx.beginPath()
      ctx.moveTo(pm[0] * k, pm[1] * k)
      ctx.lineTo(p1[0] * k, p1[1] * k)
      ctx.stroke()
    }
  }
}

/* ------------------------------------------------------------------ guns */

function drawGun(pen: Pen, L: Light[], gun: Gun, base: string): void {
  const { t } = pen
  const fired = t >= gun.fires[0]
  const dy = dip(t - gun.fires[0], 0.07, 0.07)
  const body = shade(L, fired ? CHAR : base, TUBE_LIT, gun.x, gun.y - gun.h / 2)
  const top = tube(pen, [gun.x, gun.y - 0.02], gun.lean, gun.w, gun.h, body, mixHex(body, FW.iron, 0.5), dy)
  // Its paper band under the mouth, as the racks' tubes have.
  const dir: Pt = [Math.sin(gun.lean), -Math.cos(gun.lean)]
  const a: Pt = [top[0] - dir[0] * gun.h * 0.3, top[1] - dir[1] * gun.h * 0.3]
  const b: Pt = [top[0] - dir[0] * gun.h * 0.18, top[1] - dir[1] * gun.h * 0.18]
  bar(pen, a, b, gun.w * 1.02, shade(L, fired ? mixHex(BAND, CHAR, 0.5) : BAND, FW.signalRed, gun.x, gun.y - gun.h, -0.1))
  // The sky's light down its flank toward the bursts, fading to the foot, and on the far lip of its mouth.
  const rim = rimAt(t, gun.x)
  if (rim.a > 0.01) {
    const foot: Pt = [gun.x, gun.y - 0.02 + dy]
    const nrm: Pt = [Math.cos(gun.lean), Math.sin(gun.lean)]
    for (const [side, amt] of [[-1, rim.left], [1, rim.right]] as const) {
      const off = gun.w * 0.42 * side
      rimStrip(pen, [top[0] + nrm[0] * off, top[1] + nrm[1] * off], [foot[0] + nrm[0] * off, foot[1] + nrm[1] * off], gun.w * 0.14, rim.col, 0.8 * rim.a * amt, 0.15)
    }
    rimMouth(pen, top, gun.lean, gun.w * 0.58, rim.col, 0.9 * rim.a)
  }
}

/** A muzzle's flash as it fires: a short stab of flame and sparks along the tube, `s` seconds after. */
function muzzleFlash(pen: Pen, at: Pt, lean: number, s: number, size: number): void {
  if (s < 0 || s > 0.35) return
  const e = Math.exp(-s / 0.07)
  const dir: Pt = [Math.sin(lean), -Math.cos(lean)]
  glow(pen, at[0] + dir[0] * 0.5, at[1] + dir[1] * 0.5, 1.4 * size, FW.fwGold, 0.3 * e)
  const n = 9
  for (let i = 0; i < n; i++) {
    const a = lean + (hash(i, 31, size * 10) - 0.5) * 0.7
    const len = size * (0.5 + 0.9 * hash(i, 32)) * (0.4 + 1.6 * (1 - e))
    const b: Pt = [at[0] + Math.sin(a) * len, at[1] - Math.cos(a) * len]
    line(pen, [at, b], 0.05 * size, rgba(i % 3 ? FW.fwGold : FW.fwWhite, 0.8 * e))
  }
}

export function drawBattery(pen: Pen, L: Light[]): void {
  const { f, t } = pen
  const xa = BATTERY_X0 - 0.55
  const xb = GUNS[GUNS.length - 1].x + 0.55
  if (xb < f.x0 - 3 || xa > f.x1 + 3) return
  const wood = shade(L, WOOD, WOOD_LIT, (xa + xb) / 2, GY - 0.4)
  for (const gun of GUNS) drawGun(pen, L, gun, PAPER)
  // The rack: a sill, a front rail, posts.
  rectC(pen, xa, GY - 0.14, xb, GY, wood)
  bar(pen, [xa, GY - 0.72], [xb, GY - 0.72], 0.08, wood)
  for (let x = xa + 0.04; x <= xb; x += (xb - xa - 0.08) / 4) bar(pen, [x, GY], [x, GY - 0.8], 0.08, wood)
  // The master fuse along the sill, burning from gun to gun down the coda.
  const lastFire = GUNS.filter((g) => t >= g.fires[0]).length
  const burnX = lastFire === 0 ? CRASH_AT[0] - 0.2 : GUNS[lastFire - 1].x
  line(pen, [[CRASH_AT[0] - 0.2, GY - 0.07], [burnX, GY - 0.07]], 0.03, rgba(FW.sleeper, 0.95))
  if (burnX < xb) line(pen, [[burnX, GY - 0.07], [xb - 0.1, GY - 0.07]], 0.035, FW.fuse)
  for (const gun of GUNS) {
    const s = t - gun.fires[0]
    const top: Pt = [gun.x + Math.sin(gun.lean) * gun.h, gun.y - Math.cos(gun.lean) * gun.h]
    muzzleFlash(pen, top, gun.lean, s, 1.3)
  }
  // The mines along the front: fat short tubes.
  for (let i = 0; i < MINES_X.length; i++) {
    const x = MINES_X[i]
    const body = shade(L, t >= CRASH ? CHAR : TUBE, TUBE_LIT, x, GY - 0.2)
    rectC(pen, x - 0.22, GY - 0.36, x + 0.22, GY, body)
    rectC(pen, x - 0.24, GY - 0.4, x + 0.24, GY - 0.33, mixHex(body, FW.iron, 0.5))
  }
}

/* ------------------------------------------------------------------ the great wheel */

const DRIVERS = DRIVERS_AT.length
const DRIVER_BURN = 4.6
/** Driver `j`'s place round the rim (radians, in the wheel's own turn), and when it lit. */
const driverAngle = (j: number): number => Math.PI + 0.33 + (j * 2 * Math.PI) / DRIVERS
/** How many drivers are burning, weighted by how hard. */
export function driversLit(t: number): number {
  let n = 0
  for (const at of DRIVERS_AT) n += driverOn(t - at)
  return n
}
const driverOn = (s: number): number => (s < 0 ? 0 : smooth(s, 0, 0.08) * (1 - smooth(s, DRIVER_BURN - 1.2, DRIVER_BURN)))

/*
 * The wheel comes off. Its job is done at the fling, which wrenches its pin loose (a rattle growing from `LOOSE`); on
 * the heavy chord after it (`POP`, 139.326) it jumps off the pin, drops to the field, bounces and rolls away to the
 * left into the dark, still spinning, its drivers still spraying, while the camera follows the spark the other way.
 * So it leaves the picture as part of the action and is never parked, half in frame, at the edge of the Titan's
 * shots. Its stand goes over with it: the jump wrenches the pin and pulls the post over to the left, and the tripod
 * tips on its left foot until the post's head is down on the field, one brace left pointing at the sky (`standTip`),
 * so no bare post stands at the edge of the Titan's wide frame either.
 */
const LOOSE = FLING
const POP = 139.326
const FALL_G = 12
const HOP: Pt = [-1.0, -0.4]
const ROLL_V = 5.5
const ROLL_TAU = 1.4
/** The rattle on the loosened pin (cells, off the pin), growing as it works loose. */
function rattle(t: number): Pt {
  const u = smooth(t, LOOSE, POP)
  const turn = turned(t)
  return [0.035 * u * Math.sin(3 * turn + 0.7), -0.05 * u * Math.abs(Math.sin(3 * turn))]
}
/** The wheel's turn as drawn: the plan's (its drivers burn on a while, then it runs down). */
const wheelTurn = (t: number): number => turned(t)
const R0 = rattle(POP)
const DROP = GY - WHEEL_R - (WHEEL[1] + R0[1])
const LAND_U = (-HOP[1] + Math.sqrt(HOP[1] * HOP[1] + 2 * FALL_G * DROP)) / FALL_G
const X_LAND = WHEEL[0] + R0[0] + HOP[0] * LAND_U
/** The wheel's centre: on its pin, rattling, then off it, down, and rolling away left. */
export function wheelAt(t: number): Pt {
  const [cx, cy] = WHEEL
  if (t < LOOSE) return WHEEL
  if (t < POP) {
    const r = rattle(t)
    return [cx + r[0], cy + r[1]]
  }
  const u = t - POP
  if (u < LAND_U) return [cx + R0[0] + HOP[0] * u, cy + R0[1] + HOP[1] * u + 0.5 * FALL_G * u * u]
  // On the field: it takes up its roll quickly from the drop's drift and slows over a second or two; two small bounces.
  const w = u - LAND_U
  const c = 1 / (1 / ROLL_TAU + 10)
  const x = X_LAND + HOP[0] * c * (1 - Math.exp(-w / c)) - (ROLL_V * ROLL_TAU * (1 - Math.exp(-w / ROLL_TAU)) - ROLL_V * c * (1 - Math.exp(-w / c)))
  const y = GY - WHEEL_R - 0.2 * Math.exp(-w / 0.14) * Math.abs(Math.sin((Math.PI * w) / 0.2))
  return [x, y]
}

/** The post's height, and the tip at which its head comes down on the field (the tripod on its left foot). */
const POST_H = GY - (WHEEL[1] + 0.15)
const TIP_TO = Math.PI - Math.atan(POST_H / 0.75)
const TIP_KICK = 0.14
const TIP_FALL = 0.6
/**
 * How far the stand has gone over (radians, its top to the left): jerked a little way over by the pin's wrench on the
 * jump, all but stalled at its balance, then falling faster and faster until the post's head hits the field, with a
 * small bounce.
 */
function standTip(t: number): number {
  const u = t - POP
  if (u <= 0) return 0
  const a1 = 0.36
  if (u < TIP_KICK) return a1 * (1 - (1 - u / TIP_KICK) ** 2)
  const w = u - TIP_KICK
  if (w < TIP_FALL) return a1 + (TIP_TO - a1) * (w / TIP_FALL) ** 2
  const b = w - TIP_FALL
  return TIP_TO - 0.07 * Math.exp(-b / 0.12) * Math.abs(Math.sin((Math.PI * b) / 0.16))
}

export function drawWheel(pen: Pen, L: Light[]): void {
  const { t, f } = pen
  const [sx, sy] = WHEEL
  if (sx + 4 < f.x0 - 10 || sx - 4 > f.x1) return
  // The stand: a post and its two braces, with the iron pin the wheel turned on; after the jump, going over on its
  // left foot.
  const tip = standTip(t)
  const ca = Math.cos(tip)
  const sa = Math.sin(tip)
  const px = sx - 0.75
  const T = ([x, y]: Pt): Pt => {
    const dx = x - px
    const dy = y - GY
    return [px + dx * ca + dy * sa, GY - dx * sa + dy * ca]
  }
  const wood = shade(L, WOOD, WOOD_LIT, sx, (sy + GY) / 2)
  bar(pen, T([sx, GY]), T([sx, sy + 0.15]), 0.22, wood)
  bar(pen, T([sx - 0.75, GY]), T([sx - 0.05, GY - 1.1]), 0.09, wood)
  bar(pen, T([sx + 0.75, GY]), T([sx + 0.05, GY - 1.1]), 0.09, wood)
  const [cx, cy] = wheelAt(t)
  if (t >= POP) bar(pen, T([sx, sy - 0.05]), T([sx, sy + 0.16]), 0.1, shade(L, FW.iron, IRON_LIT, sx, sy, 0.1))
  if (cx + WHEEL_R + 0.5 < f.x0 || cx - WHEEL_R - 0.5 > f.x1) return
  const turn = -wheelTurn(t)
  const rimC = shade(L, WOOD, WOOD_LIT, cx, cy, 0.1)
  const rimD = shade(L, mixHex(WOOD, CHAR, 0.55), WOOD, cx, cy, 0.1)
  // Six spokes, tapering from the hub: a cartwheel, not a cross-hair.
  for (let i = 0; i < 6; i++) {
    const a = turn + (i * Math.PI) / 3
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    const r0 = 0.2
    const r1 = WHEEL_R - 0.08
    quad(pen, [
      [cx + ca * r0 - sa * 0.07, cy + sa * r0 + ca * 0.07],
      [cx + ca * r1 - sa * 0.04, cy + sa * r1 + ca * 0.04],
      [cx + ca * r1 + sa * 0.04, cy + sa * r1 - ca * 0.04],
      [cx + ca * r0 + sa * 0.07, cy + sa * r0 - ca * 0.07],
    ], rimC)
  }
  // The rim: six lengths of broad wooden felloe, their inner edge in shade.
  const { ctx, k } = pen
  ctx.lineCap = 'butt'
  for (let i = 0; i < 6; i++) {
    const a0 = turn + (i * Math.PI) / 3
    ctx.lineWidth = 0.2 * k
    ctx.strokeStyle = rimD
    ctx.beginPath()
    ctx.arc(cx * k, cy * k, (WHEEL_R - 0.03) * k, a0 - 0.01, a0 + Math.PI / 3 + 0.01)
    ctx.stroke()
    ctx.lineWidth = 0.12 * k
    ctx.strokeStyle = rimC
    ctx.beginPath()
    ctx.arc(cx * k, cy * k, (WHEEL_R + 0.01) * k, a0 - 0.01, a0 + Math.PI / 3 + 0.01)
    ctx.stroke()
  }
  // The hub: a round wooden nave with an iron plate over it, turning.
  ctx.fillStyle = rimD
  ctx.beginPath()
  ctx.arc(cx * k, cy * k, 0.34 * k, 0, Math.PI * 2)
  ctx.fill()
  const hub: Pt[] = [0, 1, 2, 3].map((i) => [cx + 0.24 * Math.cos(turn + Math.PI / 4 + (i * Math.PI) / 2), cy + 0.24 * Math.sin(turn + Math.PI / 4 + (i * Math.PI) / 2)])
  quad(pen, hub, shade(L, FW.iron, IRON_LIT, cx, cy, 0.2))
  // The drivers: short tubes on the rim, each pointing back against the turn. Burnt out, each is split open along its
  // back half where the fire came out, the two halves of the paper curling apart.
  for (let j = 0; j < DRIVERS; j++) {
    const a = driverAngle(j) + turn
    const p0: Pt = [cx + Math.cos(a) * (WHEEL_R + 0.02), cy + Math.sin(a) * (WHEEL_R + 0.02)]
    // Tangent pointing clockwise on the screen: backwards, against the wheel's counterclockwise turn.
    const tx = -Math.sin(a)
    const ty = Math.cos(a)
    const nx = Math.cos(a)
    const ny = Math.sin(a)
    const s = t - DRIVERS_AT[j]
    const split = smooth(s, DRIVER_BURN - 0.15, DRIVER_BURN + 0.35)
    const body = shade(L, s > 0 ? CHAR : PAPER, TUBE_LIT, p0[0], p0[1], 0.1)
    // Lashed along the rim's outside, its mouth to the back.
    const ox = nx * 0.07
    const oy = ny * 0.07
    const P = (u: number, v = 0): Pt => [p0[0] + ox + tx * u + nx * v, p0[1] + oy + ty * u + ny * v]
    if (split <= 0.01) {
      bar(pen, P(-0.3), P(0.26), 0.15, body)
    } else {
      // The whole front half, then the back half as two strips of paper splayed apart, a dark bore between them.
      bar(pen, P(-0.3), P(-0.02), 0.15, body)
      const gap = 0.05 * split
      const flare = 0.07 * split
      bar(pen, P(-0.02, 0), P(0.17, 0), 0.05 * split, mixHex(CHAR, FW.iron, 0.6))
      bar(pen, P(-0.03, 0.04 + gap * 0.3), P(0.25 - 0.05 * split, 0.04 + gap + flare), 0.065, body)
      bar(pen, P(-0.03, -0.04 - gap * 0.3), P(0.24 - 0.04 * split, -0.04 - gap - flare * 0.8), 0.065, body)
    }
    bar(pen, P(-0.06), P(0.06), 0.155, shade(L, s > 0 ? mixHex(BAND, CHAR, 0.5) : BAND, FW.signalRed, p0[0], p0[1], -0.1))
  }
}

/** The drivers' fire: each lit one spraying back against the turn, so the sparks curl away in a spiral. */
export function drawDriverFire(pen: Pen): void {
  const { t, ctx, k, f } = pen
  const [cx, cy] = wheelAt(t)
  if (cx + 6 < f.x0 || cx - 6 > f.x1 || t < WHEEL_AT) return
  ctx.lineCap = 'round'
  const life = 0.6
  // Once the wheel is down on the field, what it throws at the ground stops there.
  ctx.save()
  ctx.beginPath()
  ctx.rect(f.x0 * k, (f.y0 - 1) * k, (f.x1 - f.x0) * k, (GY - 0.02 - f.y0 + 1) * k)
  ctx.clip()
  for (let j = 0; j < DRIVERS; j++) {
    const on0 = driverOn(t - DRIVERS_AT[j])
    if (on0 <= 0 && t - DRIVERS_AT[j] > DRIVER_BURN + life) continue
    const s0 = t - DRIVERS_AT[j]
    if (s0 < 0) continue
    // It catches: a spit of white.
    if (s0 < 0.15) {
      const a = driverAngle(j) - wheelTurn(t)
      glow(pen, cx + Math.cos(a) * WHEEL_R, cy + Math.sin(a) * WHEEL_R, 0.7, FW.fwWhite, 0.3 * (1 - s0 / 0.15), 0.5)
    }
    const rate = 48
    const from = DRIVERS_AT[j]
    const start = Math.max(from, t - life)
    for (let i = Math.floor((start - from) * rate); i <= (t - from) * rate; i++) {
      const born = from + (i + 0.8 * (hash(i, j, 21) - 0.5)) / rate
      const a0 = t - born
      if (a0 < 0 || a0 > life) continue
      const on = driverOn(born - from)
      if (hash(i, j, 22) > on) continue
      // Where the driver's mouth was when this spark left it, and how it was moving (the wheel's own way included,
      // once it is off its pin).
      const ang = driverAngle(j) - wheelTurn(born)
      const [bx, by] = wheelAt(born)
      const mx = bx + Math.cos(ang) * (WHEEL_R + 0.09) - Math.sin(ang) * 0.26
      const my = by + Math.sin(ang) * (WHEEL_R + 0.09) + Math.cos(ang) * 0.26
      const w = omega(born)
      const sp = 9 + 5 * hash(i, j, 23)
      const [nx1, ny1] = born > POP ? wheelAt(born + 0.01) : [bx, by]
      const vx = -Math.sin(ang) * sp + WHEEL_R * w * Math.sin(ang) + (hash(i, j, 24) - 0.5) * 0.8 + (nx1 - bx) * 100
      const vy = Math.cos(ang) * sp - WHEEL_R * w * Math.cos(ang) + (hash(i, j, 25) - 0.5) * 0.8 + (ny1 - by) * 100
      const at = (s: number): Pt => [mx + vx * s, my + vy * s + 5 * s * s]
      const [x, y] = at(a0)
      const [px, py] = at(Math.max(0, a0 - 0.06))
      const fade = 1 - a0 / life
      ctx.strokeStyle = rgba(hash(i, j, 26) < 0.7 ? FW.fwWhite : FW.fwBlue, 0.8 * fade)
      ctx.lineWidth = Math.max(0.7, 0.03 * k)
      ctx.beginPath()
      ctx.moveTo(px * k, py * k)
      ctx.lineTo(x * k, y * k)
      ctx.stroke()
    }
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ the Titan, the flanking guns, the salutes */

/** The Titan's kick as it fires: down into its cradle, and back, slowly. */
const titanDrop = (t: number): number => dip(t - TITAN_FIRE, 0.12, 0.09)

export function drawTitan(pen: Pen, L: Light[]): void {
  const { t, f } = pen
  const x = TITAN_X
  if (x + 5 < f.x0 || x - 5 > f.x1) return
  for (const gun of FLANK) drawGun(pen, L, gun, PAPER)
  // The flanking guns' A-frames.
  for (const gun of FLANK) {
    const wood = shade(L, WOOD, WOOD_LIT, gun.x, GY - 0.4)
    bar(pen, [gun.x - 0.28, GY], [gun.x, GY - 0.62], 0.06, wood)
    bar(pen, [gun.x + 0.28, GY], [gun.x, GY - 0.62], 0.06, wood)
  }
  const dy = titanDrop(t)
  const hw = TITAN_W / 2
  const body = shade(L, FW.iron, IRON_LIT, x, LIP + 1, 0.15)
  const wood = shade(L, WOOD, WOOD_LIT, x, GY - 0.6)
  const hoop = shade(L, mixHex(FW.brass, FW.iron, 0.55), FW.brass, x, LIP + 0.6, 0.05)
  // The tube: a heavy iron mortar, a little wider at its foot.
  quad(pen, [[x - hw, LIP + dy], [x + hw, LIP + dy], [x + hw + 0.06, GY], [x - hw - 0.06, GY]], body)
  // Its round side: the moon's light down the right flank, a firelit strip down the left.
  quad(pen, [[x + hw * 0.55, LIP + dy], [x + hw * 0.8, LIP + dy], [x + hw * 0.84, GY], [x + hw * 0.58, GY]], rgba(FW.moonHalo, 0.16))
  quad(pen, [[x - hw * 0.62, LIP + dy], [x - hw * 0.42, LIP + dy], [x - hw * 0.44, GY], [x - hw * 0.65, GY]], rgba(FW.crateLit, 0.12 + 0.3 * litAt(L, x - hw, LIP + 1).a))
  // Its hoops.
  for (const yb of [LIP + 0.3, LIP + 1.2, GY - 0.7]) {
    const u = (yb - LIP) / (GY - LIP)
    const w = hw + 0.06 * u + 0.05
    rectC(pen, x - w, yb + dy, x + w, yb + 0.14 + dy, hoop)
  }
  // The sky's light: down its edges (the side toward the bursts most), fading to the foot, and on its hoops' tops.
  const rim = rimAt(t, x)
  if (rim.a > 0.01) {
    rimStrip(pen, [x - hw + 0.045, LIP + dy], [x - hw - 0.015, GY], 0.09, rim.col, 0.85 * rim.a * rim.left, 0.12)
    rimStrip(pen, [x + hw - 0.045, LIP + dy], [x + hw + 0.015, GY], 0.09, rim.col, 0.85 * rim.a * rim.right, 0.12)
    for (const yb of [LIP + 0.3, LIP + 1.2, GY - 0.7]) {
      const u = (yb - LIP) / (GY - LIP)
      const w = hw + 0.06 * u + 0.05
      rimStrip(pen, [x - w, yb + dy + 0.012], [x + w, yb + dy + 0.012], 0.025, rim.col, 0.7 * rim.a * (1 - 0.5 * u), 1)
    }
  }
  // The mouth: the heavy rim, and its bore seen a little from above, glowing while the spark is down it.
  const inside = t > DIVE && t < TITAN_FIRE + 0.2
  mouth(pen, [x, LIP + dy], 0, hw + 0.08, shade(L, FW.iron, IRON_LIT, x, LIP, 0.15), inside ? mixHex(FW.iron, FW.coal, 0.45 + 0.25 * Math.sin(t * 31)) : FW.iron)
  rimMouth(pen, [x, LIP + dy], 0, hw + 0.08, rim.col, 0.9 * rim.a)
  if (inside) glow(pen, x, LIP - 0.2, 0.7, FW.coal, 0.35 * smooth(t, DIVE, DIVE + 0.2))
  // The cradle: low and heavy, two chocks and a sill either side, bracing the foot.
  for (const sx of [-1, 1]) {
    quad(pen, [[x + sx * (hw + 0.06), GY], [x + sx * (hw + 0.06), GY - 0.9], [x + sx * (hw + 0.5), GY]], wood)
    bar(pen, [x + sx * (hw + 0.12), GY - 0.05], [x + sx * (hw + 0.12), GY - 1.15], 0.1, wood)
  }
  rectC(pen, x - hw - 0.7, GY - 0.14, x + hw + 0.7, GY, wood)
  drawLeader(pen)
}

/** The leader: a fuse from the muzzle down the Titan's side to a curl on the ground, burning upward from its foot. */
function drawLeader(pen: Pen): void {
  const { t } = pen
  const wall = TITAN_X - TITAN_W / 2 - 0.035
  const dy = titanDrop(t)
  const foot = LEADER_FOOT[0]
  const path: Pt[] = [
    [foot - 0.22, GY - 0.03],
    [foot - 0.05, GY - 0.02],
    [foot + 0.12, GY - 0.05],
    [wall - 0.02, GY - 0.3],
    [wall, GY - 0.6],
    [wall, LIP + 0.05 + dy],
    [wall + 0.08, LIP - 0.05 + dy],
    [wall + 0.25, LIP + 0.05 + dy],
  ]
  // How far up it has burnt: the spark's height while it climbs; all of it once it is in.
  if (t < LEADER_AT) line(pen, path, 0.04, FW.fuse)
  else if (t >= DIVE) line(pen, path, 0.035, rgba(FW.sleeper, 0.95))
  else {
    const sy = sparkAt(t)[1] + 0.05
    const burnt: Pt[] = []
    const fresh: Pt[] = []
    for (let i = 0; i < path.length; i++) {
      const p = path[i]
      const isBurnt = i < 3 ? t > LEADER_AT + 0.25 * i : p[1] >= sy
      ;(isBurnt ? burnt : fresh).push(p)
    }
    if (burnt.length) burnt.push([wall, Math.max(LIP, sy)])
    if (fresh.length) fresh.unshift([wall, Math.max(LIP, sy)])
    if (burnt.length > 1) line(pen, burnt, 0.035, rgba(FW.sleeper, 0.95))
    if (fresh.length > 1) line(pen, fresh, 0.04, FW.fuse)
  }
}

/** The Titan's fire: a gout as the spark goes in, the great blast as it fires, the tail under the rising spark. */
export function drawTitanFire(pen: Pen): void {
  const { t } = pen
  const s = t - DIVE
  if (s >= 0 && s < 0.35) muzzleFlash(pen, [TITAN_X - 0.1, LIP], 0.1, s, 0.9)
  for (const gun of FLANK) muzzleFlash(pen, [gun.x + Math.sin(gun.lean) * gun.h, gun.y - Math.cos(gun.lean) * gun.h], gun.lean, t - gun.fires[0], 1.2)
  const b = t - TITAN_FIRE
  if (b >= 0 && b < 0.8) {
    // The blast: a column of fire and sparks thrown straight up out of the muzzle, the spark riding its head.
    const e = Math.exp(-b / 0.16)
    const reach = smooth(b, 0, 0.035)
    glow(pen, TITAN_X, LIP - 1.8, 4, FW.fwGold, 0.4 * e)
    additive(pen, () => {
      for (let i = 0; i < 48; i++) {
        const a = (hash(i, 41) - 0.5) * 0.36
        const len = (1.6 + 3.2 * hash(i, 42)) * reach * (0.55 + 0.45 * e)
        const x0 = TITAN_X + (hash(i, 43) - 0.5) * (TITAN_W - 0.3)
        const lift = 0.9 * b * hash(i, 45)
        const y0 = LIP - 0.05 - lift * 3
        const w = 0.05 + 0.08 * (1 - hash(i, 46))
        line(pen, [[x0, y0], [x0 + Math.sin(a) * len, y0 - Math.cos(a) * len]], w, rgba(i % 3 ? FW.fwGold : FW.fwWhite, 0.8 * e))
      }
      // Sparks thrown out sideways from the mouth: each a curving, falling arc of its own length, leaving at its own
      // moment, speed and angle, never a row of parallel ticks.
      for (let i = 0; i < 24; i++) {
        const side = i % 2 ? 1 : -1
        const born = 0.07 * hash(i, 50)
        const u1 = b - born
        const life = 0.42 + 0.26 * hash(i, 51)
        if (u1 <= 0 || u1 > life) continue
        const v = 2 + 4 * hash(i, 47)
        const vx = side * v * (0.3 + 0.65 * hash(i, 48))
        const vy = -v * (0.55 + 0.7 * hash(i, 49))
        const x0 = TITAN_X + side * (0.3 + 0.3 * hash(i, 52))
        const at = (u: number): Pt => [x0 + vx * u, LIP - 0.05 + vy * u + 6 * u * u]
        const trT = 0.08 + 0.2 * hash(i, 53)
        const u0 = Math.max(0, u1 - trT)
        const fade = 1 - smooth(u1, life * 0.5, life)
        const m = 6
        let prev = at(u0)
        for (let q = 1; q <= m; q++) {
          const cur = at(u0 + ((u1 - u0) * q) / m)
          const w = q / m
          line(pen, [prev, cur], (0.018 + 0.022 * hash(i, 54)) * (0.4 + 0.6 * w), rgba(i % 4 ? FW.fwGold : FW.fwWhite, 0.85 * fade * w))
          prev = cur
        }
      }
    })
  }
  // The rising tail under the spark: glitter it sheds on the way up, each grain born at its own moment a little to one
  // side of the spark's path, twinkling as it falls slowly: points of light, of every size and brightness.
  if (b >= 0 && t <= TITAN_FIRE + 1.6) {
    additive(pen, () => {
      for (let i = 0; i < 60; i++) {
        const born = TITAN_FIRE + 0.9 * hash(i, 64)
        const a = t - born
        const life = 0.4 + 0.3 * hash(i, 65)
        if (a < 0 || a > life) continue
        const [x, y] = sparkAt(born)
        const px = x + (hash(i, 44) - 0.5) * 0.55 + (hash(i, 66) - 0.5) * 0.5 * a
        const py = y + 0.12 + 0.12 * hash(i, 67) + 1.4 * a * a
        const fade = 1 - smooth(a, life * 0.4, life)
        const bright = 0.4 + 0.6 * hash(i, 68)
        const tw = 0.5 + 0.5 * Math.sin(t * (34 + 22 * hash(i, 69)) + i * 2.3)
        const r = 0.03 + 0.06 * hash(i, 70) ** 2
        glint(pen, px, py, r, i % 5 ? FW.fwGold : FW.fwWhite, 0.95 * bright * tw * fade)
      }
    })
  }
}

export function drawSaluteRack(pen: Pen, L: Light[]): void {
  const { t, f } = pen
  const [x, y] = SALUTE_RACK
  if (x + 2 < f.x0 || x - 2 > f.x1) return
  const wood = shade(L, WOOD, WOOD_LIT, x, y - 0.3)
  SALUTES.forEach((s, j) => {
    const tx = s.a[0]
    const fired = t >= s.from
    const body = shade(L, fired ? CHAR : TUBE, TUBE_LIT, tx, y - 0.3)
    tube(pen, [tx, y - 0.02], (s.b[0] - s.a[0]) * 0.03, 0.16, 0.55, body, mixHex(body, FW.iron, 0.5), dip(t - s.from, 0.03))
    void j
  })
  bar(pen, [x - 0.55, y - 0.3], [x + 0.5, y - 0.3], 0.06, wood)
  bar(pen, [x - 0.5, y], [x - 0.5, y - 0.4], 0.06, wood)
  bar(pen, [x + 0.45, y], [x + 0.45, y - 0.4], 0.06, wood)
  for (const s of SALUTES) muzzleFlash(pen, [s.a[0], s.a[1]], 0, t - s.from, 0.6)
}

/* ------------------------------------------------------------------ the crate, the ash */

/**
 * How big the crate's fire is, 0..1: caught by the Titan's blast, up through the salutes, then burning down as the
 * spark falls, out by the hush (a smoulder, `crateSmoulder`). On the roll the spark's flare catches it again, and it
 * goes up with it, roaring by the door the spark dives into.
 */
export function crateFire(t: number): number {
  if (t < TITAN_FIRE + 0.15) return 0
  const first = (0.25 + 0.75 * smooth(t, TITAN_FIRE + 0.15, 145.4)) * (1 - smooth(t, 145.85, HUSH - 0.05))
  const again = 1.1 * smooth(t, FLARE + 0.012, FLARE + 0.075)
  return Math.max(first, again)
}
/** How much the crate glows red in its slats as it smoulders, 0..1: from the fire's dying to the flare. */
export function crateSmoulder(t: number): number {
  return smooth(t, 146.1, HUSH) * (1 - smooth(t, FLARE, FLARE + 0.06))
}
/** How charred its boards are: only ever more so. */
const charred = (t: number): number => smooth(t, TITAN_FIRE + 0.15, HUSH)
/** The smoulder's slow breath. */
const breath = (t: number): number => 0.72 + 0.18 * Math.sin(t * 2.3) + 0.1 * Math.sin(t * 5.1 + 1.3)

/** The crate's broken end: a ragged mouth. */
const crateMouth = (): Pt[] => {
  const { x1, h } = CRATE
  return [[x1 - 0.42, GY - h + 0.12], [x1 + 0.01, GY - h + 0.02], [x1 + 0.01, GY], [x1 - 0.3, GY], [x1 - 0.36, GY - 0.35], [x1 - 0.5, GY - 0.6]]
}

export function drawCrate(pen: Pen, L: Light[]): void {
  const { t, f, ctx } = pen
  const { x0, x1, h } = CRATE
  if (x1 + 2 < f.x0 || x0 - 2 > f.x1) return
  const fire = crateFire(t)
  const sm = crateSmoulder(t)
  const board = shade(L, WOOD, WOOD_LIT, (x0 + x1) / 2, GY - h / 2)
  const burnt = mixHex(board, CHAR, 0.55 * charred(t))
  rectC(pen, x0, GY - h, x1, GY, burnt)
  // Its boards: three long ones, with dark seams; the right end's broken short.
  const seams = [GY - h * 0.66, GY - h * 0.33]
  for (const y of seams) rectC(pen, x0, y - 0.02, x1 - 0.28, y + 0.02, rgba(FW.iron, 0.6))
  rectC(pen, x0, GY - h, x0 + 0.1, GY, mixHex(burnt, FW.iron, 0.3))
  // The broken end: a ragged mouth, black inside, a bed of embers in it once it has burnt.
  const mouthPts = crateMouth()
  quad(pen, mouthPts, mixHex(FW.iron, FW.coal, 0.18 * fire + 0.05 * sm))
  // The sky's light along its top boards and down its whole end, when it faces the bursts.
  const rim = rimAt(t, (x0 + x1) / 2)
  if (rim.a > 0.01) {
    rimStrip(pen, [x0 + 0.02, GY - h + 0.025], [x1 - 0.44, GY - h + 0.025], 0.05, rim.col, 0.75 * rim.a, 0.55)
    rimStrip(pen, [x0 + 0.025, GY - h + 0.02], [x0 + 0.025, GY], 0.05, rim.col, 0.8 * rim.a * rim.left, 0.12)
  }
  if (sm <= 0.01) return
  const b = breath(t) * sm
  additive(pen, () => {
    // The slats smoulder: the seams and the burnt edges glow red where the fire got into them, unevenly, breathing.
    ctx.lineCap = 'round'
    seams.forEach((y, si) => {
      // One unbroken crack along each seam, its glow rising and falling along it and hottest by the broken end.
      const xa = x0 + 0.12
      const xb = x1 - 0.28
      const gr = ctx.createLinearGradient(xa * pen.k, 0, xb * pen.k, 0)
      const n = 8
      for (let i = 0; i <= n; i++) {
        const u = i / n
        const a = b * (0.1 + 0.75 * u * u) * (0.55 + 0.45 * Math.sin(t * (1.3 + 0.8 * hash(i, si, 124)) + i * 2.1 + si)) * (0.5 + 0.5 * hash(i, si, 121))
        gr.addColorStop(u, rgba(u > 0.7 ? mixHex(FW.coal, FW.coalHot, 0.4) : FW.coal, 0.75 * a))
      }
      ctx.strokeStyle = gr
      ctx.lineWidth = Math.max(0.6, 0.03 * pen.k)
      ctx.beginPath()
      ctx.moveTo(xa * pen.k, y * pen.k)
      ctx.lineTo(xb * pen.k, y * pen.k)
      ctx.stroke()
    })
    // Inside the broken end, the embers light it from below: red at the floor, gone to black by the top.
    ctx.save()
    ctx.beginPath()
    mouthPts.forEach(([x, y], i) => (i ? ctx.lineTo(x * pen.k, y * pen.k) : ctx.moveTo(x * pen.k, y * pen.k)))
    ctx.closePath()
    ctx.clip()
    const up = ctx.createLinearGradient(0, GY * pen.k, 0, (GY - h) * pen.k)
    up.addColorStop(0, rgba(FW.coal, 0.5 * b))
    up.addColorStop(0.22, rgba(FIRES.railway.rim, 0.22 * b))
    up.addColorStop(0.55, rgba(FIRES.railway.rim, 0))
    ctx.fillStyle = up
    ctx.fillRect((x1 - 0.6) * pen.k, (GY - h) * pen.k, 0.7 * pen.k, h * pen.k)
    ctx.restore()
    // The ember bed inside the mouth: a low red light, and a few coals breathing in it.
    glow(pen, x1 - 0.2, GY - 0.12, 0.55, FIRES.railway.rim, 0.9 * b, 0.45)
    for (let i = 0; i < 9; i++) {
      const x = x1 - 0.32 + 0.3 * hash(i, 125)
      const y = GY - 0.04 - 0.12 * hash(i, 126)
      const on = 0.5 + 0.5 * Math.sin(t * (1.1 + 0.9 * hash(i, 127)) + i * 1.9)
      ctx.fillStyle = rgba(i % 3 ? FW.coal : FW.coalHot, 0.7 * sm * on)
      ctx.fillRect((x - 0.025) * pen.k, (y - 0.014) * pen.k, 0.05 * pen.k, 0.028 * pen.k)
    }
  })
}

/**
 * A sheet of fire along a burning edge, from (xa..xb, y) up: a body with licks along its top that rise, sway and
 * drop back, each layer (rim, body, heart) nested in the last. Ragged, wide and low: a fire, not a flame, so the
 * spark's own teardrop never reads as one more of its tongues.
 */
function blaze(pen: Pen, xa: number, xb: number, y: number, H: number, seed: number): void {
  if (H <= 0.02 || xb <= xa) return
  const { ctx, k, t } = pen
  const F = FIRES.railway
  const m = Math.max(3, Math.round((xb - xa) / 0.2))
  const lick = (u: number): number => {
    let best = 0.22
    for (let j = 0; j < m; j++) {
      const c = (j + 0.5 + 0.3 * Math.sin(t * 1.7 + j * 2.3 + seed)) / m
      const a = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * (6.5 + j * 1.9) + j * 3.1 + seed)) * (0.7 + 0.3 * hash(j, seed, 131))
      const w = 1.25 / m
      const d = Math.abs(u - c) / w
      if (d < 1) best = Math.max(best, a * Math.pow(1 - d, 1.5))
    }
    return best
  }
  const layers: [number, number, string][] = [
    [1, 0, rgba(F.rim, 0.9)],
    [0.72, 0.12, rgba(F.body, 0.95)],
    [0.42, 0.26, rgba(F.heart, 0.92)],
  ]
  const N = 30
  for (const [sh, inset, fill] of layers) {
    const a = xa + (xb - xa) * inset
    const b = xb - (xb - xa) * inset
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.moveTo(a * k, y * k)
    for (let i = 0; i <= N; i++) {
      const u = i / N
      const uu = inset + (1 - 2 * inset) * u
      const env = Math.pow(Math.sin(Math.PI * u), 0.55)
      const hh = H * sh * env * lick(uu)
      // The tips lean downwind and waver; the foot stays put.
      const q = hh / Math.max(1e-6, H)
      const x = a + (b - a) * u + (0.1 + 0.08 * Math.sin(t * 2.3 + seed)) * H * q * q + 0.03 * Math.sin(t * 5 + uu * 9 + seed) * q
      ctx.lineTo(x * k, (y - hh) * k)
    }
    ctx.lineTo(b * k, y * k)
    ctx.closePath()
    ctx.fill()
  }
}

/**
 * The crate's fire: a sheet of flame out of its broken end and along its top, caught by the Titan's blast and burning
 * down as the spark falls; in the hush only a red smoulder and a thread of smoke (`drawCrate` draws the smoulder);
 * on the roll it goes up again with the spark's flare, and the spark dives into it.
 */
export function drawCrateFire(pen: Pen): void {
  const { t, ctx, k } = pen
  const { x0, x1, h } = CRATE
  const fire = crateFire(t)
  // The thread of smoke off the embers: thin at the mouth, then wavering more and more as it climbs (a wave running up
  // it, its swing growing with height), and breaking into wisps that drift off downwind, so it is never a ruled line.
  const thread = smooth(t, 145.9, HUSH) * (1 - smooth(t, FLARE, FLARE + 0.05))
  if (thread > 0.01) {
    const rate = 9
    const life = 3.2
    for (let i = Math.floor((t - life) * rate); i <= t * rate; i++) {
      const born = i / rate
      const a = t - born
      if (a < 0 || a > life) continue
      const u = a / life
      const swing = 0.03 + 0.42 * u ** 1.2
      const wave = Math.sin(2.4 * a - 1.1 * t + 0.6) + 0.5 * Math.sin(4.3 * a - 1.9 * t + 2.1)
      const x = x1 - 0.22 + 0.05 * (hash(i, 141) - 0.5) + (WIND[0] * 0.9 + 0.05) * a + swing * wave + 0.25 * (hash(i, 142) - 0.5) * u * u
      const y = GY - 0.25 - 0.55 * a + 0.12 * Math.sin(1.7 * a + i * 0.9) * u
      const r = 0.05 + 0.24 * u
      // Where it breaks: some puffs are born thin, and the gaps rise with the smoke, so the top comes apart in wisps.
      const gate = smooth(Math.sin(1.9 * born + 0.8 * Math.sin(0.7 * born)) + 0.25 * Math.sin(5.3 * born), -0.5, 0.5)
      const al = 0.3 * thread * smooth(a, 0, 0.3) * (1 - u) * (1 - u) * (1 - smooth(u, 0.15, 0.55) * (1 - gate))
      if (al < 0.004) continue
      ctx.save()
      ctx.translate(x * k, y * k)
      // Upright where it leaves the embers, drawn out sideways as it drifts.
      ctx.scale(1 + 0.8 * u, 1.4 - 0.6 * u)
      const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, r * k)
      gr.addColorStop(0, rgba(mixHex(FW.smoke, FW.coal, 0.12 * (1 - u)), al))
      gr.addColorStop(1, rgba(FW.smoke, 0))
      ctx.fillStyle = gr
      ctx.fillRect(-r * k, -r * k, 2 * r * k, 2 * r * k)
      ctx.restore()
    }
  }
  if (fire <= 0.02) return
  const F = FIRES.railway
  // The glow of it, soft, wide and low: light, never a disc.
  glow(pen, x1 - 0.4, GY - 0.5, 1.8 + fire, F.body, 0.26 * fire, 0.7)
  // Out of the broken end, and along the top from the end back (the far end catches last and burns least).
  blaze(pen, x1 - 0.62, x1 + 0.06, GY - 0.03, 1.25 * fire, 1)
  const along = fire * (0.55 + 0.45 * smooth(t, TITAN_FIRE + 0.6, 145.4))
  blaze(pen, x0 + 0.35 + 0.5 * (1 - along), x1 - 0.18, GY - h + 0.03, 0.62 * along, 5)
}

/**
 * The ash: two low heaps, one round the Titan's foot and one round the crate (where the spark lies in the silence),
 * each rising from nothing at both ends and feathered into the field, a shade darker than the ground's lit edge,
 * with embers breathing in them. Never one long strip along the ground.
 */
const ASH_HEAPS = [
  { c: TITAN_X + 0.1, w: 2.0, h: 0.1, seed: 1 },
  { c: (CRATE.x0 + REST[0]) / 2 + 0.25, w: (REST[0] - CRATE.x0) / 2 + 0.75, h: 0.13, seed: 2 },
]
const ASH_TOP = mixHex(GROUND, ASHC, 0.3)
export function drawAsh(pen: Pen): void {
  const { t, ctx, k, f } = pen
  const a = smooth(t, TITAN_FIRE, TITAN_FIRE + 1.5)
  if (a <= 0) return
  for (const hp of ASH_HEAPS) {
    const xa = hp.c - hp.w
    const xb = hp.c + hp.w
    if (xb < f.x0 || xa > f.x1) continue
    const hgt = (u: number): number => {
      const x = xa + (xb - xa) * u
      const lump = 0.78 + 0.14 * Math.sin(x * 5.3 + hp.seed) + 0.08 * Math.sin(x * 11.7 + 2 * hp.seed)
      return hp.h * Math.sin(Math.PI * u) ** 1.6 * lump * a
    }
    // Feathered at both ends: it fades in along its length as well as rising from nothing.
    const gx = ctx.createLinearGradient(xa * k, 0, xb * k, 0)
    gx.addColorStop(0, rgba(ASH_TOP, 0))
    gx.addColorStop(0.3, rgba(ASH_TOP, 0.9))
    gx.addColorStop(0.7, rgba(ASH_TOP, 0.9))
    gx.addColorStop(1, rgba(ASH_TOP, 0))
    ctx.fillStyle = gx
    ctx.beginPath()
    ctx.moveTo(xa * k, (GY + 0.02) * k)
    const N = 36
    for (let i = 0; i <= N; i++) {
      const u = i / N
      ctx.lineTo((xa + (xb - xa) * u) * k, (GY - hgt(u)) * k)
    }
    ctx.lineTo(xb * k, (GY + 0.02) * k)
    ctx.closePath()
    ctx.fill()
    // Embers breathing in it, in its deeper middle.
    additive(pen, () => {
      for (let i = 0; i < 11; i++) {
        const u = 0.2 + 0.6 * hash(i, 52, hp.seed)
        const x = xa + (xb - xa) * u
        const y = GY - hgt(u) * (0.25 + 0.5 * hash(i, 53, hp.seed))
        const br = 0.5 + 0.5 * Math.sin(t * (1.3 + hash(i, 54, hp.seed)) + i * 1.7)
        // Flat smudges of red in the grey, not beads: small, low and dim beside the spark lying in it.
        glint(pen, x, y, 0.035 + 0.02 * hash(i, 55, hp.seed), i % 4 ? FW.coal : mixHex(FW.coal, FW.coalHot, 0.4), 0.45 * a * br, 0.4)
      }
    })
  }
}

/* ------------------------------------------------------------------ what goes up */

/** A rising comet or shell: a head that is a short streak, and a glittering tail behind it. */
export function drawRise(pen: Pen, r0: Rise): void {
  const { t, ctx, k } = pen
  const r = placedRise(r0)
  if (t < r.from || t >= r.to) return
  // The tail, in time, but never longer than a cell and a half: a fast shell's is not a ruled line.
  const len = Math.hypot(r.b[0] - r.a[0], r.b[1] - r.a[1])
  const speed = (2 * len) / Math.max(0.05, r.to - r.from)
  const tail = Math.min(r.comet ? 0.34 : 0.24, 1.5 / Math.max(1e-6, speed))
  const n = 8
  ctx.lineCap = 'round'
  let prev = riseAt(r, Math.max(r.from, t - tail))
  for (let i = 1; i <= n; i++) {
    const s = t - tail + (tail * i) / n
    if (s < r.from) continue
    const q = riseAt(r, s)
    const u = i / n
    ctx.strokeStyle = rgba(r.comet ? r.col : FW.fwGold, (r.comet ? 0.8 : 0.55) * u * u)
    ctx.lineWidth = Math.max(0.6, (r.comet ? 0.07 : 0.035) * u * k)
    ctx.beginPath()
    ctx.moveTo(prev[0] * k, prev[1] * k)
    ctx.lineTo(q[0] * k, q[1] * k)
    ctx.stroke()
    prev = q
  }
  // The head: a short white streak along its way (never shorter than a fifth of a cell, so never a dot).
  const h = riseAt(r, t)
  const dx = r.b[0] - r.a[0]
  const dy = r.b[1] - r.a[1]
  const dl = Math.hypot(dx, dy) || 1
  const h0: Pt = [h[0] - (dx / dl) * 0.2, h[1] - (dy / dl) * 0.2]
  ctx.strokeStyle = rgba(FW.fwWhite, 0.95)
  ctx.lineWidth = Math.max(0.8, (r.comet ? 0.06 : 0.04) * k)
  ctx.beginPath()
  ctx.moveTo(h0[0] * k, h0[1] * k)
  ctx.lineTo(h[0] * k, h[1] * k)
  ctx.stroke()
  // Sparks shed from the tail, falling away.
  for (let i = 0; i < (r.comet ? 10 : 5); i++) {
    const born = t - 0.5 * hash(i, 61, r.from * 7)
    if (born < r.from) continue
    const a = t - born
    const p0 = riseAt(r, born)
    const x = p0[0] + (hash(i, 62) - 0.5) * 0.4 * a
    const y = p0[1] + 2.5 * a * a
    ctx.fillStyle = rgba(r.comet ? r.col : FW.fwGold, 0.7 * (1 - a / 0.5))
    ctx.fillRect((x - 0.012) * k, (y - 0.03) * k, 0.024 * k, 0.06 * k)
  }
}

/**
 * A trail as one filled, tapered ribbon along `pts` (tail first): `w(u)` its width and `c(u)` its colour at u along it
 * (0 tail, 1 head), laid on as a gradient from the tail's end to the head. At least a pixel wide, so it never breaks up.
 */
function ribbon(pen: Pen, pts: Pt[], w: (u: number) => number, c: (u: number) => string): void {
  const { ctx, k } = pen
  const n = pts.length - 1
  if (n < 1) return
  const a = pts[0]
  const z = pts[n]
  if (Math.hypot(z[0] - a[0], z[1] - a[1]) * k < 0.5) return
  const left: Pt[] = []
  const right: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[Math.min(n, i + 1)]
    const dx = p1[0] - p0[0]
    const dy = p1[1] - p0[1]
    const l = Math.hypot(dx, dy) || 1
    const hw = Math.max(0.5 / k, w(i / n) / 2)
    left.push([pts[i][0] - (dy / l) * hw, pts[i][1] + (dx / l) * hw])
    right.push([pts[i][0] + (dy / l) * hw, pts[i][1] - (dx / l) * hw])
  }
  const gr = ctx.createLinearGradient(a[0] * k, a[1] * k, z[0] * k, z[1] * k)
  for (const u of [0, 0.3, 0.55, 0.75, 0.9, 1]) gr.addColorStop(u, c(u))
  ctx.fillStyle = gr
  ctx.beginPath()
  left.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  for (let i = n; i >= 0; i--) ctx.lineTo(right[i][0] * k, right[i][1] * k)
  ctx.closePath()
  ctx.fill()
}

/**
 * Star `i` of `count`'s launch velocity: round the break (or in its fan), each at its own speed. The speeds spread
 * from 0.6 to 1.14 of the shell's, so the break opens as a spray and never as a ring of equal spokes; the Titan's a
 * little less, so its flower stays round.
 */
function starV(b: Burst, i: number, count: number, speed: number, salt: number): Pt {
  let ang: number
  if (b.fan !== undefined) ang = -Math.PI / 2 + (i / (count - 1) - 0.5) * 2 * b.fan + (hash(i, salt, b.seed) - 0.5) * 0.08
  else ang = (2 * Math.PI * (i + 0.6 * hash(i, salt, b.seed))) / count + b.seed
  const lo = b.kind === 'titan' ? 0.72 : 0.6
  const v = speed * (lo + (1.14 - lo) * hash(i, salt + 1, b.seed) ** 0.8)
  return [Math.cos(ang) * v, Math.sin(ang) * v]
}

/** A star's own fire: it burns out at its own time, head and tail together (never a headless tail). */
const starOwn = (b: Burst, i: number, salt: number, s: number): number => {
  const end = lifeOf(b) * (0.62 + 0.38 * hash(i, salt + 2, b.seed))
  return 1 - smooth(s, end * 0.7, end)
}

/** A tiny soft point of light (a grain of glitter, a crackle): round, with a short falling-off edge, never a square. */
function glint(pen: Pen, x: number, y: number, r: number, col: string, a: number, sy = 1): void {
  if (a <= 0.01 || r <= 0) return
  const { ctx, k } = pen
  const R = Math.max(1, r * k)
  if (sy !== 1) {
    ctx.save()
    ctx.translate(x * k, y * k)
    ctx.scale(1, sy)
    ctx.translate(-x * k, -y * k)
  }
  const gr = ctx.createRadialGradient(x * k, y * k, 0, x * k, y * k, R)
  gr.addColorStop(0, rgba(col, a))
  gr.addColorStop(0.35, rgba(col, a * 0.5))
  gr.addColorStop(1, rgba(col, 0))
  ctx.fillStyle = gr
  ctx.beginPath()
  ctx.arc(x * k, y * k, R, 0, Math.PI * 2)
  ctx.fill()
  if (sy !== 1) ctx.restore()
}

type Stars = (count: number, speed: number, trail: number, col: string, tail: string, width: number, salt: number, opt?: { gain?: number; stop?: number }) => void

/** A burst: streaks out from where it broke, slowing, drooping, fading; never a disc, never a ring. */
export function drawBurst(pen: Pen, b: Burst): void {
  const { t, ctx, k, f } = pen
  const s = t - b.at
  if (b.kind === 'salute') return drawSalute(pen, placed(b), s)
  if (b.kind === 'small') return drawSmall(pen, b, s)
  // Not in its first hundredth: a burst that small is a dot, and a dot near the spark is a second ball.
  if (s < 0.01 || s > lifeOf(b)) return
  const reach = b.v / b.k + 2
  if (b.x + reach < f.x0 || b.x - reach > f.x1 || b.y + reach + 3 < f.y0 || b.y - reach > f.y1) return
  ctx.lineCap = 'round'
  const fadeAll = 1 - smooth(s, lifeOf(b) * 0.45, lifeOf(b))
  // The break opens from a point: the stars come out of it thin (their width ramps up from about a third) with their
  // trails running back to the centre for the first moments, so the break is a spray out of one point, never a ring.
  const open = smooth(s, 0.02, 0.18)
  const wRamp = 0.3 + 0.7 * open
  const toCentre = 1 - smooth(s, 0.08, 0.2)
  const stars: Stars = (count, speed, trail, col, tail, width, salt, opt) => {
    const gain = opt?.gain ?? 1
    const sHead = Math.min(s, opt?.stop ?? s)
    // Colour and light run smoothly from the dim tail up into the head: no step at the head (a step reads as a dash).
    const m = 6
    const segCol: string[] = []
    for (let q = 1; q <= m; q++) segCol.push(mixHex(tail, col, smooth(q / m, 0.45, 1)))
    for (let i = 0; i < count; i++) {
      const [vx, vy] = starV(b, i, count, speed, salt)
      // Faint for the first moments (the point-flash is the break), catching as they fly out of it; the Titan's white
      // heart is its own.
      const own = starOwn(b, i, salt, s) * fadeAll * gain * (b.kind === 'titan' ? 1 : 0.3 + 0.7 * open)
      if (own <= 0.01) continue
      // Glitter: willows and the Titan's stars twinkle as they burn down.
      const tw = b.kind === 'willow' || b.kind === 'titan' || b.kind === 'chrys' ? 0.75 + 0.25 * Math.sin(t * 40 + i * 2.1) : 1
      // Burning out, its tail draws in toward its head, so what is left is a short dying streak, not a hairline.
      const tr = trail * (0.35 + 0.65 * own)
      const late = Math.max(s - tr, s * (b.kind === 'palm' ? 0.06 : 0.22))
      const from = Math.min(sHead - 0.002, late * (1 - toCentre))
      if (from >= sHead) continue
      // One tapered ribbon with its light and colour graded from tail to head: no joints to bead, no colour bands.
      const pts: Pt[] = []
      for (let q = 0; q <= m; q++) pts.push(starAt(b, vx, vy, from + ((sHead - from) * q) / m))
      const wAt = (u: number) => width * (0.35 + 0.65 * u) * wRamp * (u > 0.9 ? 1 - 3 * (u - 0.9) : 1)
      const aAt = (u: number) => (0.08 + 0.87 * u ** 1.6) * own ** (1.5 - 0.5 * u) * tw
      ribbon(pen, pts, wAt, (u) => rgba(segCol[Math.max(0, Math.round(u * m) - 1)], aAt(u)))
      // A palm's heavy comets shed glitter off their trails: grains that hang a moment below where they left it,
      // twinkling, so a frond is a glittering, drooping branch and not a painted spoke.
      if (b.kind === 'palm' && s > 0.12) {
        for (let g = 0; g < 5; g++) {
          const ago = 0.08 + 0.4 * hash(i, g, b.seed + 91)
          const sb = sHead - ago
          if (sb < 0.05) continue
          const q0 = starAt(b, vx, vy, sb)
          const x = q0[0] + (hash(i, g, b.seed + 92) - 0.5) * 0.18
          const y = q0[1] + 0.8 * ago * ago + 0.05
          const twg = 0.4 + 0.6 * Math.abs(Math.sin(t * (22 + 18 * hash(i, g, b.seed + 93)) + g * 1.9 + i))
          glint(pen, x, y, 0.035 + 0.03 * hash(i, g, b.seed + 94), mixHex(tail, FW.fwGold, 0.5), 0.75 * own * twg * (1 - ago / 0.5))
        }
      }
    }
  }
  // A star that comes down to the field has burnt out: nothing from the sky is drawn over the ground.
  const clipped = b.kind !== 'mine'
  if (clipped) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(f.x0 * k, (f.y0 - 1) * k, (f.x1 - f.x0) * k, (GY - 0.04 - f.y0 + 1) * k)
    ctx.clip()
  }
  // The break itself: a small warm point-flash the stars come out of (the Titan has its own white-hot heart; a mine
  // breaks at the ground, where its gun's flash is).
  if (b.kind !== 'titan' && b.kind !== 'mine' && s < 0.16) {
    const fl = smooth(s, 0.01, 0.025) * Math.exp(-s / 0.045)
    const warm = mixHex(mixHex(FW.fwGold, FW.coalHot, 0.4), b.col, 0.2)
    const r = Math.min(0.55, 0.28 + 0.05 * (b.v / b.k))
    glow(pen, b.x, b.y, r, warm, 0.8 * fl)
    glint(pen, b.x, b.y, r * 0.32, mixHex(warm, FW.fwWhite, 0.4), 0.7 * fl)
  }
  drawStarsOf(pen, b, s, stars)
  if (clipped) ctx.restore()
}

/**
 * How long a burst's stars burn: their own life, but every star in the sky is out by the silence (`HUSH`), so the
 * silence is the stillest frame of the show and nothing is still falling in it.
 */
const lifeOf = (b: Burst): number => (b.at < HUSH ? Math.min(b.life, HUSH - 0.04 - b.at) : b.life)

/** A crossette splits here (seconds after its break). */
const SPLIT = 0.34

function drawStarsOf(pen: Pen, b: Burst, s: number, stars: Stars): void {
  switch (b.kind) {
    case 'crossette': {
      // The stars go out, and each one's trail runs on into its split point and fades there over a tenth of a second.
      if (s < SPLIT + 0.12) stars(b.n, b.v, b.trail, b.col, b.col, 0.06, 1, { stop: SPLIT + 0.06, gain: 1 - smooth(s, SPLIT + 0.02, SPLIT + 0.12) })
      if (s >= SPLIT) drawCrossetteSplit(pen, b, s - SPLIT)
      break
    }
    case 'titan': {
      stars(b.n, b.v, b.trail, s < 0.25 ? FW.fwWhite : FW.fwGold, b.tail ?? b.col, 0.07, 1)
      // A pistil of white inside it.
      stars(22, b.v * 0.42, 0.2, FW.fwWhite, FW.fwWhite, 0.05, 7)
      drawTitanHeart(pen, b, s)
      break
    }
    case 'palm':
      stars(b.n, b.v, b.trail, b.col, b.tail ?? b.col, 0.13, 1)
      break
    default:
      stars(b.n, b.v, b.trail, b.col, b.tail ?? b.col, b.kind === 'mine' ? 0.075 : 0.065, 1)
  }
}

/** The Titan's heart: its inner shell's colours, from a glittering tail (burnt gold) up into the head (gold). */
const HEART_TAIL = mixHex(FW.fwGold, FW.coal, 0.4)
const HEART_COL = Array.from({ length: 6 }, (_, q) => mixHex(HEART_TAIL, FW.fwGold, smooth((q + 1) / 6, 0.3, 1)))
const HEART_N = 120

/**
 * The Titan's heart: a dense inner shell of short gold glitter thrown out at about half the outer stars' speed (0.24
 * to 0.6 of it, most near the middle of that), so the flower is full to its middle and never a ring round a hole.
 * Each star is a short tapered streak twinkling fast, shedding grains that hang and fall behind it; they burn out one
 * by one before the outer stars do. Kept off the spark, which rides down through it.
 */
function drawTitanHeart(pen: Pen, b: Burst, s: number): void {
  const { t } = pen
  const L = lifeOf(b)
  if (s < 0.015 || s > L) return
  const fadeAll = 1 - smooth(s, L * 0.45, L)
  const open = smooth(s, 0.02, 0.16)
  const sp = sparkAt(t)
  for (let i = 0; i < HEART_N; i++) {
    const h = (m: number) => hash(i, m, b.seed + 300)
    const ang = (2 * Math.PI * (i + 0.85 * h(1))) / HEART_N + b.seed * 1.3
    const v = b.v * (0.24 + 0.36 * h(2) ** 0.8)
    const vx = Math.cos(ang) * v
    const vy = Math.sin(ang) * v
    const end = L * (0.62 + 0.36 * h(3))
    const own = (1 - smooth(s, end * 0.7, end)) * fadeAll
    if (own <= 0.01) continue
    const head = starAt(b, vx, vy, s)
    // Nothing of it on the spark: it thins out within a cell of it.
    const clear = smooth(Math.hypot(head[0] - sp[0], head[1] - sp[1]), 0.45, 1.05)
    if (clear <= 0.01) continue
    const tw = 0.45 + 0.55 * Math.abs(Math.sin(t * (24 + 26 * h(4)) + i * 1.3))
    const tr = (0.06 + 0.07 * h(5)) * (0.45 + 0.55 * own)
    const from = Math.max(s * 0.3, s - tr)
    const pts: Pt[] = []
    for (let q = 0; q <= 5; q++) pts.push(starAt(b, vx, vy, from + ((s - from) * q) / 5))
    const wid = 0.042 * (0.35 + 0.65 * open)
    ribbon(pen, pts, (u) => wid * (0.3 + 0.7 * u) * (u > 0.9 ? 1 - 3 * (u - 0.9) : 1), (u) => rgba(HEART_COL[Math.max(0, Math.round(u * 5) - 1)], (0.1 + 0.8 * u ** 1.5) * own * tw * clear * (0.4 + 0.6 * open)))
    // Glitter shed behind it: grains that hang a moment and fall, each twinkling on its own.
    if (s > 0.1) {
      for (let g = 0; g < 2; g++) {
        const ago = 0.06 + 0.3 * h(6 + g)
        const sb = s - ago
        if (sb < 0.05) continue
        const q0 = starAt(b, vx, vy, sb)
        const gx = q0[0] + (h(8 + g) - 0.5) * 0.14
        const gy = q0[1] + 0.9 * ago * ago + 0.03
        if (Math.hypot(gx - sp[0], gy - sp[1]) < 0.7) continue
        const twg = 0.3 + 0.7 * Math.abs(Math.sin(t * (30 + 20 * h(10 + g)) + g * 2.1 + i))
        glint(pen, gx, gy, 0.03 + 0.03 * h(12 + g), g ? FW.fwGold : mixHex(FW.fwGold, FW.fwWhite, 0.4), 0.8 * own * twg * (1 - ago / 0.4))
      }
    }
  }
}

/**
 * A crossette's split, `cs` seconds after it: each star goes out with a small warm glint where it breaks, and three or
 * four children fly off it, carrying some of its way on, each at its own speed and angle, slowing and falling under
 * their own drag, each a real falling trail that burns out at its own time.
 */
function drawCrossetteSplit(pen: Pen, b: Burst, cs: number): void {
  const { t } = pen
  const fadeAll = 1 - smooth(cs + SPLIT, lifeOf(b) * 0.45, lifeOf(b))
  const warm = mixHex(FW.fwGold, FW.coalHot, 0.35)
  const tail = mixHex(b.col, FW.smoke, 0.25)
  const KID_COL = Array.from({ length: 7 }, (_, q) => mixHex(tail, b.col, smooth((q + 1) / 7, 0.45, 1)))
  for (let i = 0; i < b.n; i++) {
    const [pvx, pvy] = starV(b, i, b.n, b.v, 1)
    const at = starAt(b, pvx, pvy, SPLIT)
    // Its velocity at the split.
    const e = Math.exp(-b.k * SPLIT)
    const vpx = pvx * e
    const vpy = pvy * e + (b.gs / b.k) * (1 - e)
    if (cs < 0.14) glint(pen, at[0], at[1], 0.09 + 0.04 * hash(i, 3, b.seed), warm, 0.85 * (1 - cs / 0.14) * smooth(cs, 0, 0.015))
    const child: Burst = { ...b, x: at[0], y: at[1], k: b.k * 1.5, gs: b.gs * 1.2, fan: undefined }
    const nc = hash(i, 5, b.seed) > 0.35 ? 4 : 3
    const rot = 2 * Math.PI * hash(i, 6, b.seed)
    for (let c = 0; c < nc; c++) {
      const h = (n: number) => hash(i * 7 + c, n, b.seed)
      const ca = rot + (2 * Math.PI * c) / nc + (h(8) - 0.5) * 1.1
      const cv = b.v * 0.42 * (0.6 + 0.8 * h(9))
      const vx = vpx * 0.5 + Math.cos(ca) * cv
      const vy = vpy * 0.5 + Math.sin(ca) * cv
      // Each child breaks off at its own moment (the split crackles over a tenth of a second rather than going off as
      // one cross) and catches as it flies, so no star is ever a set of equal spokes from one point.
      const off = 0.1 * h(12)
      const cc = cs - off
      if (cc <= 0) continue
      const life = 0.45 + 0.5 * h(10)
      const own = (1 - smooth(cc, life * 0.55, life)) * fadeAll * smooth(cc, 0.02 + 0.05 * h(13), 0.1 + 0.08 * h(13))
      if (own <= 0.01) continue
      // It starts where its parent is by then (the parent goes on a moment after the first child breaks off).
      const ps = starAt(b, pvx, pvy, SPLIT + off)
      const kid: Burst = { ...child, x: ps[0], y: ps[1] }
      const trT = (0.35 + 0.15 * h(11)) * (0.4 + 0.6 * own)
      const from = Math.max(0, cc - trT)
      const tw = 0.8 + 0.2 * Math.sin(t * 36 + i * 1.7 + c * 2.9)
      const m = 7
      const pts: Pt[] = []
      for (let q = 0; q <= m; q++) pts.push(starAt(kid, vx, vy, from + ((cc - from) * q) / m))
      const wid = 0.045 * (0.45 + 0.55 * smooth(cc, 0, 0.1))
      ribbon(pen, pts, (u) => wid * (0.3 + 0.7 * u) * (u > 0.9 ? 1 - 3 * (u - 0.9) : 1), (u) => rgba(KID_COL[Math.max(0, Math.round(u * m) - 1)], (0.06 + 0.84 * u ** 1.5) * own ** (1.5 - 0.5 * u) * tw))
    }
  }
}

/**
 * A star's trail: its path back in time from `s`, never longer than `maxLen` cells nor older than `maxT` seconds, so
 * a fast star shows a short streak and a slow, falling one a short curve hanging from it. Head first.
 */
function trailOf(b: Burst, vx: number, vy: number, s: number, maxLen: number, maxT: number, steps = 8): Pt[] {
  const out: Pt[] = [starAt(b, vx, vy, s)]
  let len = 0
  for (let q = 1; q <= steps; q++) {
    const ss = s - (maxT * q) / steps
    if (ss < 0) break
    const p = starAt(b, vx, vy, ss)
    const last = out[out.length - 1]
    const d = Math.hypot(p[0] - last[0], p[1] - last[1])
    if (len + d > maxLen) {
      const u = (maxLen - len) / Math.max(1e-9, d)
      out.push([last[0] + (p[0] - last[0]) * u, last[1] + (p[1] - last[1]) * u])
      break
    }
    out.push(p)
    len += d
  }
  return out
}

/**
 * A rack comet's little shell: a handful of stars thrown out unevenly (no two alike in speed, none on a shared
 * circle), that slow at once and droop, each with a short falling trail. Never a star of spokes.
 */
function drawSmall(pen: Pen, b: Burst, s: number): void {
  const { ctx, k, t } = pen
  if (s < 0.025 || s > b.life + 0.35) return
  // Heavier drag and a little more droop than the plan's stars: out, over and falling.
  const bb: Burst = { ...b, k: b.k * 1.5, gs: b.gs * 1.25 }
  const fade = 1 - smooth(s, b.life * 0.45, b.life + 0.35)
  // It opens from a small warm point-flash, its stars coming out of it thin and warm before they take their colour.
  const open = smooth(s, 0.03, 0.2)
  const warm = mixHex(FW.fwGold, FW.coalHot, 0.4)
  const head = mixHex(b.col, warm, 0.55 * (1 - open))
  if (s < 0.16) {
    const fl = smooth(s, 0.025, 0.04) * Math.exp(-(s - 0.025) / 0.04)
    glow(pen, b.x, b.y, 0.3, mixHex(warm, b.col, 0.2), 0.7 * fl)
    glint(pen, b.x, b.y, 0.09, mixHex(warm, FW.fwWhite, 0.4), 0.6 * fl)
  }
  ctx.lineCap = 'butt'
  for (let i = 0; i < b.n; i++) {
    const ang = (2 * Math.PI * (i + 0.85 * hash(i, 11, b.seed))) / b.n + b.seed
    const v = b.v * (0.42 + 0.72 * hash(i, 12, b.seed))
    const vx = Math.cos(ang) * v
    const vy = Math.sin(ang) * v
    // Each burns out at its own time.
    // ... and catches at its own time too, fading up as it flies, so the break is never a star of equal spokes.
    const lit0 = 0.02 + 0.09 * hash(i, 15, b.seed)
    const own = fade * smooth(s, lit0, lit0 + 0.1) * (1 - smooth(s, b.life * (0.55 + 0.35 * hash(i, 13, b.seed)), b.life + 0.35 * hash(i, 14, b.seed)))
    if (own <= 0.01) continue
    const tw = 0.8 + 0.2 * Math.sin(t * 38 + i * 2.7)
    const pts = trailOf(bb, vx, vy, s, 0.16 + 0.22 * smooth(s, 0.1, 0.5), 0.3)
    for (let q = 1; q < pts.length; q++) {
      const u = 1 - q / pts.length
      ctx.strokeStyle = rgba(head, 0.85 * u * own * tw)
      ctx.lineWidth = Math.max(0.6, 0.045 * (0.4 + 0.6 * u) * (0.3 + 0.7 * open) * k)
      ctx.beginPath()
      ctx.moveTo(pts[q - 1][0] * k, pts[q - 1][1] * k)
      ctx.lineTo(pts[q][0] * k, pts[q][1] * k)
      ctx.stroke()
    }
  }
}

/** How close (cells) a salute's streaks may come to the spark before they are cut short. */
const CLEAR = 0.6
/** The distance from `q` to the segment a..b. */
function segDist(q: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const l2 = dx * dx + dy * dy || 1e-9
  const u = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2))
  return Math.hypot(q[0] - a[0] - u * dx, q[1] - a[1] - u * dy)
}

/**
 * A salute's smoke: a torn, irregular sheet (notched and spiked round its edge, never a disc), `R` across at its
 * widest, flattened on the side toward the spark so it never reaches for it. `bright` is how lit from inside.
 */
function tornSmoke(pen: Pen, cx: number, cy: number, R: number, seed: number, toward: number, a: number, heart: string, rim: string, s: number): void {
  if (a < 0.004) return
  const { ctx, k } = pen
  const N = 30
  const pts: Pt[] = []
  for (let i = 0; i < N; i++) {
    const th = (2 * Math.PI * (i + 0.5 * (hash(i, seed, 171) - 0.5))) / N
    let r = 0.62 + 0.3 * hash(i, seed, 172) + 0.18 * Math.sin(th * 2 + seed) + 0.1 * Math.sin(th * 3 + seed * 1.7)
    const tear = hash(i, seed, 173)
    if (tear < 0.22) r *= 0.55 + 0.2 * hash(i, seed, 174)
    else if (tear > 0.86) r *= 1.18 + 0.15 * hash(i, seed, 175)
    // Flattened toward the spark.
    r *= 1 - 0.38 * Math.max(0, Math.cos(th - toward))
    // It stirs as it spreads.
    r *= 1 + 0.05 * Math.sin(s * 3 + i * 1.3)
    pts.push([cx + Math.cos(th) * r * R, cy + Math.sin(th) * r * R * 0.78])
  }
  ctx.save()
  // Torn at the bang, softening as it spreads: smoke, not paper.
  const soft = (0.015 + 0.16 * Math.min(1, s / 0.6)) * R * k
  if (soft > 0.6) ctx.filter = `blur(${soft.toFixed(1)}px)`
  const gr = ctx.createRadialGradient(cx * k, cy * k, 0, cx * k, cy * k, R * 1.2 * k)
  gr.addColorStop(0, rgba(heart, a))
  gr.addColorStop(0.45, rgba(mixHex(heart, rim, 0.5), a * 0.8))
  gr.addColorStop(1, rgba(rim, a * 0.18))
  ctx.fillStyle = gr
  // Its edge: the midpoints joined by curves through the torn points, soft-cornered but ragged.
  ctx.beginPath()
  const mid = (i: number): Pt => {
    const a0 = pts[i % N]
    const b0 = pts[(i + 1) % N]
    return [(a0[0] + b0[0]) / 2, (a0[1] + b0[1]) / 2]
  }
  const m0 = mid(0)
  ctx.moveTo(m0[0] * k, m0[1] * k)
  for (let i = 1; i <= N; i++) {
    const c = pts[i % N]
    const m = mid(i)
    ctx.quadraticCurveTo(c[0] * k, c[1] * k, m[0] * k, m[1] * k)
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/**
 * A salute: a flash-bang, not a flower. The whole frame flashes (`drawWash`); where it broke, a ragged starburst of
 * short hard white streaks 3-4 cells across, gone in a fifth of a second; behind it a torn sheet of smoke at least 2
 * cells wide, lit white-gold from inside for about 0.2 s and cooling to grey as it spreads and drifts; a few crackles
 * in it. The spark, 1.7 cells or more away, flinches: a spit of sparks thrown off it, away from the bang.
 */
function drawSalute(pen: Pen, b: Burst, s: number): void {
  const { ctx, f } = pen
  const LIFE = 1.4
  if (s < 0 || s > LIFE) return
  if (b.x + 3.5 < f.x0 || b.x - 3.5 > f.x1 || b.y + 3.5 < f.y0 || b.y - 3.5 > f.y1) return
  const sp = sparkAt(pen.t)
  const cx = b.x + WIND[0] * s
  const cy = b.y + WIND[1] * s
  const toward = Math.atan2(sp[1] - cy, sp[0] - cx)
  const flash = Math.exp(-s / 0.04)
  // Lit from inside for about 0.2 s, then only smoke.
  const inner = 1 - smooth(s, 0.06, 0.3)
  const body = smooth(s, 0, 0.012) * (1 - smooth(s, 0.22, 0.8))
  const R = 0.95 + 0.5 * (1 - Math.exp(-s / 0.04)) + 0.3 * s
  ctx.save()
  ctx.globalCompositeOperation = 'source-over'
  // Lit from inside by fire: hot gold going to orange as it cools, never white (a white-hot heart the size of the
  // spark, beside it, reads as a second spark), and thin: smoke with a fire in it, not a pale cloud.
  const fire = mixHex(FW.fwGold, FW.coal, 0.3)
  const heart = mixHex(mixHex(FW.smoke, fire, 0.8 * inner), FW.coalHot, 0.55 * flash)
  const rim = mixHex(FW.smoke, mixHex(FW.fwGold, FW.coal, 0.5), 0.45 * inner)
  // An outer sheet, and a smaller brighter core torn differently, a little off the middle, away from the spark.
  tornSmoke(pen, cx, cy, R, b.seed, toward, body * (0.28 + 0.14 * inner), heart, rim, s)
  const ox = -Math.cos(toward) * 0.22 * R
  const oy = -Math.sin(toward) * 0.17 * R
  tornSmoke(pen, cx + ox, cy + oy, R * 0.62, b.seed + 17, toward, body * (0.06 + 0.22 * inner), mixHex(heart, FW.coalHot, 0.25 * inner), heart, s)
  ctx.restore()
  // The starburst: short hard streaks thrown out in the first fifth of a second, at clumped, uneven angles and
  // reaches (some barely out of the smoke, some flung two cells), each a tapering sliver, thickest at its head.
  if (s < 0.26) {
    const n = 30
    for (let i = 0; i < n; i++) {
      const ang = 2 * Math.PI * hash(i, b.seed, 181)
      const reach = 0.7 + 1.45 * hash(i, b.seed, 182) ** 0.8
      const head = reach * (0.3 + 0.7 * (1 - Math.exp(-s / (0.02 + 0.03 * hash(i, b.seed, 183)))))
      const len = (0.12 + 0.55 * hash(i, b.seed, 184) ** 1.5) * (0.5 + 0.5 * reach / 2.1)
      const tail = Math.max(0.2 + 0.3 * hash(i, b.seed, 188), head - len)
      const al = 1 - smooth(s, 0.03 + 0.06 * hash(i, b.seed, 185), 0.14 + 0.1 * hash(i, b.seed, 186))
      if (al <= 0.01 || head <= tail + 0.04) continue
      const c = Math.cos(ang)
      const sn = Math.sin(ang) * 0.85
      // A little droop and a kink: thrown, not ruled.
      const bend = (hash(i, b.seed, 189) - 0.5) * 0.12
      const a: Pt = [b.x + c * tail, b.y + sn * tail]
      const e: Pt = [b.x + c * head - sn * bend, b.y + sn * head + c * bend + 0.4 * s * s]
      // Cut short of the spark.
      if (segDist(sp, a, e) < CLEAR) continue
      const wd = (0.018 + 0.04 * hash(i, b.seed, 187)) * (0.6 + 0.4 * reach / 2.1)
      const dx = e[0] - a[0]
      const dy = e[1] - a[1]
      const l = Math.hypot(dx, dy) || 1
      const nx = (-dy / l) * wd
      const ny = (dx / l) * wd
      quad(pen, [[a[0], a[1]], [e[0] - dx / l * wd * 0.6 + nx, e[1] - dy / l * wd * 0.6 + ny], [e[0], e[1]], [e[0] - dx / l * wd * 0.6 - nx, e[1] - dy / l * wd * 0.6 - ny]], rgba(i % 5 ? FW.fwWhite : FW.fwGold, 0.95 * al))
    }
  }
  // The crackle: a few grains of glitter going off together at their own places in the smoke and their own moments,
  // all of it done by the silence (`HUSH`), as every star is: the last hammer's salute crackles only until then.
  const room = HUSH - 0.04 - b.at
  const span = Math.max(0, Math.min(0.55, room - 0.1 - 0.08))
  for (let i = 0; i < 14; i++) {
    const at = 0.08 + span * hash(i, b.seed, 161) ** 1.3
    const dur = 0.05 + 0.05 * hash(i, b.seed, 162)
    if (at + dur > room) continue
    const u = (s - at) / dur
    if (u < 0 || u > 1) continue
    const ang = 2 * Math.PI * hash(i, b.seed, 163)
    const d = R * (0.1 + 0.8 * hash(i, b.seed, 164))
    const x = cx + Math.cos(ang) * d
    const y = cy + Math.sin(ang) * d * 0.75 + 0.4 * (s - at)
    if (Math.hypot(x - sp[0], y - sp[1]) < CLEAR + 0.2) continue
    const a = Math.sin(Math.PI * u)
    for (let g = 0; g < 4; g++) {
      const gx = x + (hash(i, g, b.seed + 167) - 0.5) * 0.18
      const gy = y + (hash(i, g, b.seed + 168) - 0.5) * 0.14
      const sz = 0.025 + 0.025 * hash(i, g, b.seed + 169)
      glint(pen, gx, gy, sz * 1.5, g % 3 ? FW.fwWhite : FW.fwGold, 0.95 * a)
    }
  }
  flinch(pen, b, s)
}

/**
 * The spark flinches at a salute: the blast strips a spit of fire off it, thrown away from the bang and falling, and
 * its warmth flares for a moment. (The spark itself is `fx.ts`'s; this is only what it sheds.)
 */
function flinch(pen: Pen, b: Burst, s: number): void {
  if (s < 0 || s > 0.4) return
  const { ctx, k } = pen
  const p0 = sparkAt(b.at)
  const p1 = sparkAt(b.at + 0.02)
  const sv: Pt = [(p1[0] - p0[0]) / 0.02, (p1[1] - p0[1]) / 0.02]
  const away = Math.atan2(p0[1] - b.y, p0[0] - b.x)
  const here = sparkAt(pen.t)
  glow(pen, here[0], here[1], 0.9, FW.fwGold, 0.3 * Math.exp(-s / 0.08), 1.2)
  // What is thrown down stops at the field.
  ctx.save()
  ctx.beginPath()
  ctx.rect(pen.f.x0 * k, (pen.f.y0 - 1) * k, (pen.f.x1 - pen.f.x0) * k, (GY - 0.02 - pen.f.y0 + 1) * k)
  ctx.clip()
  ctx.lineCap = 'round'
  for (let i = 0; i < 14; i++) {
    const ang = away + (hash(i, b.seed, 191) - 0.5) * 1.6
    const v = 2.4 + 3.2 * hash(i, b.seed, 192)
    const vx = sv[0] * 0.8 + Math.cos(ang) * v
    const vy = sv[1] * 0.8 + Math.sin(ang) * v
    const life = 0.2 + 0.18 * hash(i, b.seed, 193)
    if (s > life) continue
    const at = (u: number): Pt => [p0[0] + vx * u, p0[1] + vy * u + 3 * u * u]
    const q1 = at(s)
    const q0 = at(Math.max(0, s - 0.045))
    ctx.strokeStyle = rgba(i % 3 ? FW.fwGold : FW.fwWhite, 0.9 * (1 - s / life))
    ctx.lineWidth = Math.max(0.7, 0.035 * k)
    ctx.beginPath()
    ctx.moveTo(q0[0] * k, q0[1] * k)
    ctx.lineTo(q1[0] * k, q1[1] * k)
    ctx.stroke()
  }
  ctx.restore()
}

/** The Titan's stars crackle on the chord after it: white flecks all over, a moment. */
export function drawCrackle(pen: Pen, at: number): void {
  const { t } = pen
  const s = t - at
  if (s < 0 || s > 0.55) return
  const b = BURSTS.find((x) => x.kind === 'titan')
  if (!b) return
  const u = t - b.at
  for (let i = 0; i < 70; i++) {
    const ang = 2 * Math.PI * hash(i, 71)
    const v = b.v * (0.5 + 0.55 * hash(i, 72))
    const [x, y] = starAt(b, Math.cos(ang) * v, Math.sin(ang) * v, u)
    const on = hash(i, 73, Math.floor(t * 30)) > 0.45 ? 1 : 0
    const a = on * (1 - s / 0.55) * (0.55 + 0.45 * hash(i, 74))
    if (a <= 0) continue
    glint(pen, x, y, 0.045 + 0.04 * hash(i, 75), i % 4 ? FW.fwWhite : FW.fwGold, 0.9 * a)
  }
}

/* ------------------------------------------------------------------ smoke, embers */

/** A puff of smoke: soft layered clouds (gradients, no edges), drifting with the wind, lit by what burns near it. */
export function drawPuff(pen: Pen, L: Light[], q: Puff): void {
  const { t, ctx, k, f } = pen
  const s = t - q.at
  if (s < 0 || s > q.life) return
  const grow = 1 - Math.exp(-s / (q.life * 0.22))
  const r = q.r0 + (q.r1 - q.r0) * grow
  const x = q.x + WIND[0] * s + 0.15 * Math.sin(s * 0.7 + q.seed)
  const y = q.y + WIND[1] * s
  if (x + r * 2 < f.x0 || x - r * 2 > f.x1 || y + r * 2 < f.y0 || y - r * 2 > f.y1) return
  const env = smooth(s, 0, 0.5) * (1 - smooth(s, q.life * 0.4, q.life))
  if (env <= 0.01) return
  const lit = litAt(L, x, y)
  // In the finale the smoke takes the sky's colour, and the bursts near it light it from inside.
  const sky = skyGlow(t)
  const inner = smokeLight(t, x, y)
  // (Low banks lie over the field: less, so the ground stays night.)
  const low = y > GY - 2.2 ? 0.5 : 1
  // Lit from within: the bank itself takes the colour of the nearest bright burst (its own lobes, so its shape stays
  // smoke's), a little brighter for it; the sky's colour over all of it.
  const within = Math.min(0.6, 0.75 * inner.a) * low
  const col = mixHex(mixHex(mixHex(FW.smoke, lit.col, Math.min(0.45, lit.a * 0.6)), vivid(inner.col), within), sky.col, Math.min(0.3, 0.6 * sky.a) * low)
  const lift = 1 + 0.35 * within
  for (let i = 0; i < 3; i++) {
    const ox = (hash(q.seed, i, 81) - 0.5) * r * 1.2
    const oy = (hash(q.seed, i, 82) - 0.5) * r * 0.5
    const rr = r * (0.6 + 0.45 * hash(q.seed, i, 83))
    const a = q.a * env * (0.5 + 0.3 * hash(q.seed, i, 84)) * lift
    ctx.save()
    ctx.translate((x + ox) * k, (y + oy) * k)
    ctx.scale(1, 0.68)
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rr * k)
    gr.addColorStop(0, rgba(col, a))
    gr.addColorStop(0.5, rgba(col, a * 0.65))
    gr.addColorStop(1, rgba(col, 0))
    ctx.fillStyle = gr
    ctx.fillRect(-rr * k, -rr * k, 2 * rr * k, 2 * rr * k)
    ctx.restore()
  }
}

/**
 * In the hush, the finale's smoke drifts across the moon: a soft bank that comes in from its left with the wind and
 * dims it, and is still on it as the roll comes. (The moon holds its place in the frame: EXPRESS's `moonAt`.)
 */
export function drawMoonSmoke(pen: Pen): void {
  const { t, ctx, k, p } = pen
  if (t < 146.2 || t > OUT + 0.3) return
  const m = moonAt(p, k, t)
  const u = (t - 146.2) / (OUT - 146.2)
  const env = smooth(t, 146.2, 146.9)
  // Lit by the last of the finale's sky, then as dark as the silence's night round it.
  const sky = skyGlow(t)
  const smoke = mixHex(mixHex(FW.smoke, sky.col, Math.min(0.4, 0.9 * sky.a)), NIGHT_DEEP, 0.4 * hushDark(t))
  for (let i = 0; i < 4; i++) {
    const x = m.x + m.r * (-4.2 + 4.6 * u + 1.3 * i - 1.2 * hash(i, 101))
    const y = m.y + m.r * (0.6 * (hash(i, 102) - 0.5) + 0.25 * Math.sin(t * 0.6 + i))
    const rr = m.r * (1.5 + 0.8 * hash(i, 103))
    ctx.save()
    ctx.translate(x * k, y * k)
    ctx.scale(1, 0.55)
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rr * k)
    gr.addColorStop(0, rgba(smoke, 0.55 * env))
    gr.addColorStop(0.55, rgba(smoke, 0.35 * env))
    gr.addColorStop(1, rgba(smoke, 0))
    ctx.fillStyle = gr
    ctx.fillRect(-rr * k, -rr * k, 2 * rr * k, 2 * rr * k)
    ctx.restore()
  }
}

/** Embers coming down slowly through the smoke after the finale, round where the spark lies. */
export function drawEmbers(pen: Pen): void {
  const { t, ctx, k } = pen
  if (t < 145.3 || t > OUT + 0.3) return
  // They go out as the silence falls (a spark in the air cools in a breath), so the ember is its one light.
  const left = 1 - smooth(t, HUSH - 0.05, HUSH + 0.2)
  if (left <= 0) return
  const cx = REST[0]
  for (let i = 0; i < 26; i++) {
    const life = 2.2 + 1.4 * hash(i, 91)
    const born = 145.3 + ((hash(i, 92) * 3 + i * 0.07) % 3) - 0.8
    const s = t - born
    if (s < 0 || s > life) continue
    const x = cx - 4.5 + 9 * hash(i, 93) + WIND[0] * s + 0.1 * Math.sin(s * 2 + i)
    const y = GY - 6.5 + 2.5 * hash(i, 94) + 1.5 * s
    if (y > GY - 0.05) continue
    const b = (0.6 + 0.4 * Math.sin(t * (7 + 5 * hash(i, 95)) + i)) * (1 - s / life) * left
    ctx.fillStyle = rgba(i % 4 ? FW.coal : FW.coalHot, 0.8 * b)
    ctx.fillRect((x - 0.012) * k, (y - 0.012) * k, 0.024 * k, 0.024 * k)
  }
}

/**
 * The flash of a heavy shell or a salute: light thrown out from where it broke, warm for a moment and gone. Pools of
 * light round the bursts, never a flat veil: added light on a night sky greys it, so the sky away from the bang keeps
 * its dark blue and the stars their contrast.
 *
 * - A salute is a flash-bang: a hot-gold pool about 4.5 cells round the bang, gone in a third of a second, over the
 *   faintest warm lift of the whole frame (a tenth at most).
 * - The Titan's flash is a warm gold pool round its heart that falls to nothing about 40% of the frame's width out.
 * - Everything together is capped (`WASH_CAP` at the brightest point, `FLAT_CAP` for the whole frame), so when the
 *   salutes go off over the Titan's flower the frame is lit, not fogged.
 */
const WASH_CAP = 0.34
const FLAT_CAP = 0.07
export function drawWash(pen: Pen): void {
  const { t, ctx, k, f } = pen
  const w = f.x1 - f.x0
  const h = f.y1 - f.y0
  const reach = Math.hypot(w, h)
  interface Pool {
    x: number
    y: number
    col: string
    /** At its heart. */
    a: number
    /** Where it has fallen to nothing (cells). */
    r: number
    /** How it falls off: the share of `a` left at 0.3 of the way out, and of that at 0.65 (0.5 is a straight fall). */
    mid: number
    tail: number
  }
  const pools: Pool[] = []
  let flat = 0
  let flatCol: string = FW.fwGold
  for (const b0 of BURSTS) {
    const s = t - b0.at
    if (s < 0 || s > 0.6 || b0.wash <= 0) continue
    const b = placed(b0)
    if (b.kind === 'salute') {
      const A = Math.min(0.5, 0.45 * (b.wash / 0.6) ** 0.5)
      const a = A * (0.3 * Math.exp(-s / 0.025) + 0.7 * Math.exp(-s / 0.11))
      if (a < 0.004) continue
      pools.push({ x: b.x, y: b.y, col: SALUTE_LIGHT, a: 0.62 * a, r: 4.5, mid: 0.4, tail: 0.3 })
      if (0.16 * a > flat) {
        flat = 0.16 * a
        flatCol = mixHex(FW.fwGold, FW.coalHot, 0.3)
      }
      continue
    }
    if (b.kind === 'titan') {
      // Held at its brightest for a moment (wash over 1), then gone by about 0.45 s.
      const a = Math.min(0.3, b.wash * 0.24 * Math.exp(-s / 0.11))
      pools.push({ x: b.x, y: b.y, col: mixHex(FW.fwGold, FW.coalHot, 0.35), a, r: 0.4 * w, mid: 0.5, tail: 0.3 })
      continue
    }
    const a = Math.min(0.32, b.wash * 0.24 * Math.exp(-s / 0.11))
    if (b.kind === 'mine') {
      // The mines light the battery and the smoke over it, low and warm, not the whole sky.
      pools.push({ x: b.x, y: b.y - 1.2, col: FW.coalHot, a, r: 0.42 * w, mid: 0.45, tail: 0.35 })
      continue
    }
    pools.push({ x: b.x, y: b.y, col: mixHex(b.col, FW.fwGold, 0.5), a, r: Math.min(reach, 0.75 * w), mid: 0.45, tail: 0.4 })
  }
  const blast = t - TITAN_FIRE
  // The Titan's launch lights the mortar and the smoke round it, not the whole sky.
  if (blast >= 0 && blast < 0.5) pools.push({ x: TITAN_X, y: LIP - 1, col: FW.fwGold, a: Math.min(0.32, 0.26 * Math.exp(-blast / 0.08)), r: 0.42 * w, mid: 0.45, tail: 0.35 })
  if (!pools.length && flat < 0.004) return
  // The cap: where the pools overlap most they add up to no more than `WASH_CAP`.
  let peak = 0
  for (const q of pools) {
    let sum = 0
    for (const o of pools) {
      const d = Math.hypot(q.x - o.x, q.y - o.y) / o.r
      if (d < 1) sum += o.a * (d < 0.3 ? 1 - (1 - o.mid) * (d / 0.3) : o.mid * (1 - (d - 0.3) / 0.7))
    }
    peak = Math.max(peak, sum)
  }
  // Gone with the silence, as the sky's glow is.
  const kill = hushKill(t)
  const scale = (peak > WASH_CAP ? WASH_CAP / peak : 1) * kill
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const fa = Math.min(FLAT_CAP, flat) * kill
  if (fa >= 0.004) {
    ctx.fillStyle = rgba(flatCol, fa)
    ctx.fillRect(f.x0 * k, f.y0 * k, w * k, h * k)
  }
  for (const q of pools) {
    const a = q.a * scale
    if (a < 0.004) continue
    const x0 = Math.max(f.x0, q.x - q.r)
    const x1 = Math.min(f.x1, q.x + q.r)
    const y0 = Math.max(f.y0, q.y - q.r)
    const y1 = Math.min(f.y1, q.y + q.r)
    if (x1 <= x0 || y1 <= y0) continue
    const gr = ctx.createRadialGradient(q.x * k, q.y * k, 0, q.x * k, q.y * k, q.r * k)
    gr.addColorStop(0, rgba(q.col, a))
    gr.addColorStop(0.3, rgba(q.col, a * q.mid))
    gr.addColorStop(0.65, rgba(q.col, a * q.mid * q.tail))
    gr.addColorStop(1, rgba(q.col, 0))
    ctx.fillStyle = gr
    ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  }
  ctx.restore()
}

export { R }
