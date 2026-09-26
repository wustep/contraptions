import type p5 from 'p5'
import { R, mixHex } from '../../../../parts'
import { drawLick, type Lick } from './fire'
import { frame, hash, scenery, smooth } from './kit'
import { WICK_BACK, WICK_LEFT } from './loft/sneak-beats'
import { FESTIVAL, KNOCKS, LAST, ROLL, SILENCE, THEME, level } from './music'
import type { SparkShow } from './show'
import { ASH, FIRES, FLAME_CORE, FLAME_RIM, LOFT, SPARK, type WorldKey } from './worlds'

/**
 * What makes the ball a spark, over every world: its flame, and the veil of fire at every door. The director's file:
 * parts never draw either. A part only has to keep the spark's flame in mind (it rises over the ball, a little under
 * a cell tall at the start and more than a cell by the fireworks) and mark a segment `hidden` where something in front
 * covers the spark, or its flame would show through.
 */

/* ------------------------------------------------------------------ heat */

/**
 * How big the spark's flame is at `t`: 1 is a candle's flame. It follows the orchestra (`level`), so the spark grows
 * as the music does, from a careful flicker in the loft to a comet on the night express. In the silence it all but
 * goes out; the roll fans it back; on the first last chord the wick catches (a flare that settles to a candle's
 * flame), and on the second the slam's draught makes it flinch.
 */
export function heat(t: number): number {
  if (t < THEME) return 1
  const grown = 0.7 + 1.9 * Math.pow(level(t), 1.4)
  // The silence: it sinks to an ember at once (the silence is the stillest frame), and the roll brings it roaring back.
  const out = smooth(t, SILENCE - 0.05, SILENCE + 0.3) * (1 - smooth(t, ROLL, ROLL + 0.12))
  const flare = t >= ROLL ? 1.6 * Math.exp(-(t - ROLL) / 0.8) : 0
  // Nothing shrinks before the chord: the ease down to a candle's flame starts on it, under the wick's catch.
  const home = smooth(t, LAST[0], LAST[0] + 0.9)
  const live = grown * (1 - out) + 0.06 * out + flare
  return (live * (1 - home) + 1 * home + catching(t)) * freeze(t) * draught(t)
}

/** The wick catching on the first last chord: a flare up in 25 ms, dying back with the ease (tau 0.35 s). */
function catching(t: number): number {
  return 1.1 * wickCatch(t)
}

/**
 * The wick catching, 0..1: up in 25 ms on the first last chord, dying back over about a second. The flame flares by
 * it, and the loft's light lifts with it (`set.ts`, `stove-light.ts`), which otherwise tops out below the spark's heat.
 */
export function wickCatch(t: number): number {
  const u = t - LAST[0]
  if (u <= 0 || u > 2.5) return 0
  return smooth(u, 0, 0.025) * Math.exp(-Math.max(0, u - 0.025) / 0.35)
}

/** The stove door's slam on the second last chord: its draught ducks the flame to about 70%, back within 0.4 s. */
function draught(t: number): number {
  const u = t - LAST[1]
  if (u <= 0 || u > 2) return 1
  return 1 - 0.3 * smooth(u, 0, 0.02) * Math.exp(-Math.max(0, u - 0.02) / 0.14)
}

/**
 * On the rack, when the candles knock and the cat half wakes (`KNOCKS`), the spark holds its breath: its flame
 * ducks to about 60% at once and comes back over most of a second.
 */
function freeze(t: number): number {
  let d = 0
  for (const at of KNOCKS) {
    const u = t - at
    if (u <= 0 || u > 1.6) continue
    d = Math.max(d, smooth(u, 0, 0.1) * Math.exp(-Math.max(0, u - 0.1) / 0.32))
  }
  return 1 - 0.4 * d
}

/* ------------------------------------------------------------------ where the spark is, for the sets it lights */

/** Bound by the score once the show is built. */
export const bound: { show: SparkShow | null } = { show: null }

/**
 * Where the spark is at show time `t` if it is in `world` then, in that world's cells, with its heat and whether it is
 * out of sight: what a dark set (the loft, the night) lights itself by. Null in any other world, or before the show
 * is built. A part placed at (col, row) subtracts its own origin (the loft's are in `loft/layout.ts`).
 */
export function sparkIn(world: WorldKey, t: number): { x: number; y: number; heat: number; hidden: boolean } | null {
  const show = bound.show
  if (!show || show.worldKey(t) !== world) return null
  const here = show.at(t)
  return { x: here.x, y: here.y, heat: heat(t), hidden: here.hidden || here.scale <= 0.05 }
}

/* ------------------------------------------------------------------ the flame */

export interface FlameState {
  /** Bound once the show is built: the flame reads where the spark is from it. */
  show: SparkShow | null
  world: WorldKey
}

/** A flame's teardrop: base at (x, y), `h` tall, `w` wide at its belly, its tip swung `lean` (cells) sideways. */
function tongue(p: p5, k: number, x: number, y: number, w: number, h: number, lean: number, fill: string): void {
  p.fill(fill)
  p.beginShape()
  const n = 18
  for (let i = 0; i <= n; i++) {
    // Round the drop: the belly low, a point at the tip.
    const a = (i / n) * Math.PI * 2
    const u = (1 - Math.cos(a)) / 2 // 0 at the base, 1 at the tip, back to 0
    const side = Math.sin(a)
    const belly = Math.sin(Math.PI * Math.pow(u, 0.7)) * (1 - 0.35 * u)
    const px = x + side * w * 0.5 * belly + lean * u * u
    const py = y - h * u + w * 0.25 * (1 - u) * Math.abs(side) * 0.3
    p.vertex(px * k, py * k)
  }
  p.endShape(p.CLOSE)
}

/**
 * How much bigger than its true size the flame draws, so heart and flame stay about 6% of the frame's 16:9 band (`hb`,
 * cells) however wide the camera is: 1 when close, up to 2.6 in the widest frames. Taken from the flame's steady
 * length, so its flicker still shows. None while it is a candle on its wick (it eases in off the wick and out onto it).
 */
export function flameBoost(t: number, hb: number, h: number): number {
  const steady = 2 * R + R * 2.1 * h
  const want = Math.max(1, Math.min(2.6, (0.06 * hb) / steady))
  const free = smooth(t, WICK_LEFT, WICK_LEFT + 0.8) * (1 - smooth(t, WICK_BACK - 0.35, WICK_BACK))
  return 1 + (want - 1) * free
}

/** The spark's flame, drawn over it in the world on the stage. One of these stands last in each world's `after`. */
export const flame = () =>
  scenery<FlameState>({
    name: 'spark-flame',
    draw: () => {},
    over: (p, s, c) => {
      const show = s.show
      if (!show) return
      const t = c.t
      if (show.worldKey(t) !== s.world) return
      const here = show.at(t)
      if (here.hidden || here.scale <= 0.05) return
      const h = heat(t)
      if (h <= 0.01) return
      // All but out (the silence): no flame to speak of, but a tiny guttering tongue off the coal that flickers up on
      // each breath and nearly dies between, so it is still a fire.
      const ash = 1 - smooth(h, 0.1, 0.45)
      if (ash > 0.02) guttering(p, c.k, here.x, here.y, t, ash)
      if (ash > 0.98) return
      // The spark's velocity over the last few hundredths, in its own leg: the flame streams back from it.
      const a = show.where(t - 0.04)
      const b = show.where(t)
      const same = show.owner(t - 0.04) === show.owner(t)
      const vx = same ? (b[0] - a[0]) / 0.04 : 0
      const vy = same ? (b[1] - a[1]) / 0.04 : 0
      const flick = 0.12 * Math.sin(t * 23 + 1.3) + 0.08 * Math.sin(t * 37.7) + 0.05 * (hash(Math.floor(t * 30)) - 0.5)
      const { k } = c
      // Findable at a glance in a wide frame (on a phone held upright the 16:9 band is about 220 px tall): the flame
      // never draws smaller than about 6% of the band, heart and all. The heart keeps its true size, so every socket
      // and contact still holds; only the flame grows. A candle burning on its wick is a candle, at any distance.
      const f = frame(p, k)
      const hb = Math.min(f.y1 - f.y0, ((f.x1 - f.x0) * 9) / 16)
      const boost = flameBoost(t, hb, h)
      const len = R * (2.1 + 0.25 * flick) * h * boost
      const wide = R * 1.55 * Math.sqrt(h) * (1 + 0.1 * flick) * Math.sqrt(boost)
      // Speed lays the flame back along the way it came, up to nearly flat.
      const lean = Math.max(-1.6, Math.min(1.6, -vx * 0.09)) * len + flick * R * 0.6
      const up = Math.max(0.35, 1 - Math.max(0, vy) * 0.05)
      const x = here.x
      const y = here.y - R * 0.35
      p.push()
      p.noStroke()
      const ctx = p.drawingContext as CanvasRenderingContext2D
      // Among the festival's bursts (gold stars on gold stars) a soft dusk round it, clear of the heart, so it stands
      // in front of the fire instead of being one more spark of it. No edge: it fades in off the heart and out again.
      if (s.world === 'railway' && t > FESTIVAL - 0.2 && t < SILENCE + 0.3) {
        const on = smooth(t, FESTIVAL - 0.2, FESTIVAL + 0.6) * (1 - smooth(t, SILENCE - 0.3, SILENCE + 0.3))
        shadow(ctx, k, here.x, here.y, R * here.scale, Math.max(R * 4, 0.036 * hb), 0.5 * on)
      }
      // A soft warm light round it, wide and faint: never a bright core of its own. It too keeps a size on the screen.
      // It blooms as the wick catches on the first last chord.
      const caught = wickCatch(t)
      const glow = Math.max(R * (5 + 6 * Math.min(2.5, h)), 0.11 * hb * Math.min(1, boost)) * (1 + 0.3 * caught) * k
      const g = ctx.createRadialGradient(x * k, y * k, R * k, x * k, y * k, glow)
      const dark = s.world === 'loft' || s.world === 'railway'
      g.addColorStop(0, `rgba(255, 196, 120, ${((dark ? 0.2 : 0.1) + 0.12 * caught) * (1 - 0.45 * ash)})`)
      g.addColorStop(1, 'rgba(255, 196, 120, 0)')
      ctx.fillStyle = g
      ctx.fillRect(x * k - glow, y * k - glow, glow * 2, glow * 2)
      if (!dark) {
        // By day the sky is as bright as the spark: a warm light added over it lifts the spark off the sunset and the
        // whitewash, the way a flame outshines daylight close to.
        const halo = Math.max(R * 3.2, 0.05 * hb) * k
        const lg = ctx.createRadialGradient(x * k, (y - len * 0.25) * k, 0, x * k, (y - len * 0.25) * k, halo)
        lg.addColorStop(0, `rgba(255, 190, 110, ${0.18 * (1 - ash)})`)
        lg.addColorStop(0.45, `rgba(255, 170, 90, ${0.08 * (1 - ash)})`)
        lg.addColorStop(1, 'rgba(255, 160, 80, 0)')
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.fillStyle = lg
        ctx.fillRect(x * k - halo, (y - len * 0.25) * k - halo, halo * 2, halo * 2)
        ctx.restore()
      }
      if (ash > 0.02) ctx.globalAlpha = 1 - ash
      tongue(p, k, x, y, wide * 1.15, len * up * 1.1, lean, FLAME_RIM)
      tongue(p, k, x, y, wide * 0.8, len * up * 0.82, lean * 0.85, SPARK)
      tongue(p, k, x, y + R * 0.1, wide * 0.42, len * up * 0.5, lean * 0.6, FLAME_CORE)
      p.pop()
    },
  })

/**
 * A soft shadow round the spark (cells: the heart's radius `r`, the shadow's reach `out`), clear of the heart itself
 * so it never dulls it: what lifts it off a bright fire behind it. Drawn before the flame.
 */
export function shadow(ctx: CanvasRenderingContext2D, k: number, x: number, y: number, r: number, out: number, a: number): void {
  if (a <= 0.01 || out <= r) return
  const g = ctx.createRadialGradient(x * k, y * k, r * 0.95 * k, x * k, y * k, out * k)
  const col = '12, 10, 22'
  g.addColorStop(0, `rgba(${col}, 0)`)
  g.addColorStop(Math.min(0.5, (r * 0.6) / out + 0.08), `rgba(${col}, ${(a * 0.9).toFixed(3)})`)
  g.addColorStop(0.55, `rgba(${col}, ${(a * 0.45).toFixed(3)})`)
  g.addColorStop(1, `rgba(${col}, 0)`)
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect((x - out) * k, (y - out) * k, out * 2 * k, out * 2 * k)
  ctx.restore()
}

/** The ember's last tongue: a small flame off the top of the coal, rising on its breath and all but gone between. */
function guttering(p: p5, k: number, x: number, y: number, t: number, ash: number): void {
  const b = emberBreath(t - 0.12)
  const g = b * b
  const flick = 0.5 + 0.5 * Math.sin(t * 29 + 0.7) * Math.sin(t * 17.3)
  const len = R * (0.35 + 1.35 * g) * (0.85 + 0.3 * flick)
  const wide = R * (0.5 + 0.35 * g)
  const lean = R * 0.35 * Math.sin(t * 3.1) + R * 0.15 * (flick - 0.5)
  const base = y - R * 0.05
  p.push()
  p.noStroke()
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.globalAlpha = ash * smooth(g, 0.04, 0.5)
  tongue(p, k, x + R * 0.1, base, wide, len, lean, FLAME_RIM)
  tongue(p, k, x + R * 0.1, base + R * 0.04, wide * 0.6, len * 0.66, lean * 0.7, SPARK)
  ctx.globalAlpha = ash * smooth(g, 0.3, 0.9)
  tongue(p, k, x + R * 0.1, base + R * 0.06, wide * 0.3, len * 0.36, lean * 0.5, FLAME_CORE)
  p.pop()
}

/* ------------------------------------------------------------------ the spark itself */

const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]

/**
 * The spark's heart: the ball, drawn here instead of by the stage (the show hands the stage no ball, `SparkShow.at`),
 * so it is a flame's heart and not a marble: no ink ring, no spinning dot, no trail of beads. Hot, it is gold going to
 * orange at its edge; in the silence it is an ember gone to ash with a dull red heart that breathes. Drawn out along
 * its way at a door, as the stage would.
 */
export function drawSpark(p: p5, k: number, x: number, y: number, t: number, scale = 1, stretch = 1, angle = 0): void {
  if (scale <= 0.02) return
  const r = R * k * scale
  // 0 while it burns; 1 in the silence, when it is all but out.
  const ash = 1 - smooth(heat(t), 0.1, 0.45)
  const breathe = emberBreath(t)
  const core = mixHex(FLAME_CORE, mixHex(FLAME_RIM, ASH, 0.35 - 0.2 * breathe), ash)
  const body = mixHex(SPARK, mixHex(ASH, FLAME_RIM, 0.25), ash)
  const edge = mixHex(FLAME_RIM, mixHex(ASH, LOFT.soot, 0.45), ash)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.translate(x * k, y * k)
  ctx.rotate(angle)
  ctx.scale(Math.max(1, stretch), 1)
  if (ash < 0.02) {
    const g = ctx.createRadialGradient(0, -0.25 * r, 0.05 * r, 0, 0, r)
    g.addColorStop(0, core)
    g.addColorStop(0.55, body)
    g.addColorStop(1, edge)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    return
  }
  // Going out, it is a coal and not a coin: a small, flat, broken clinker lying in the ash, crusted dark grey, lit
  // from under where it lies and through its cracks by a red heart that breathes.
  const n = 8
  const shrink = 1 - 0.18 * ash
  const outline: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.2
    const lump = 1 + ash * (0.3 * (hash(i, 71) - 0.5))
    const wide = 1 + 0.22 * ash
    const flat = 1 - 0.36 * ash
    outline.push([Math.cos(a) * r * lump * wide * shrink, (Math.sin(a) * lump * flat + 0.3 * ash) * r * shrink])
  }
  const path = () => {
    ctx.beginPath()
    for (let i = 0; i <= n; i++) {
      const [ax, ay] = outline[i % n]
      const [bx, by] = outline[(i + 1) % n]
      // Mostly straight broken faces, their corners only a little rounded.
      const mx = (ax + bx) / 2
      const my = (ay + by) / 2
      if (i === 0) ctx.moveTo(mx, my)
      else {
        const [px, py] = outline[(i - 1 + n) % n]
        ctx.lineTo(ax + (px - ax) * 0.18, ay + (py - ay) * 0.18)
        ctx.quadraticCurveTo(ax, ay, ax + (bx - ax) * 0.18, ay + (by - ay) * 0.18)
        ctx.lineTo(mx, my)
      }
    }
    ctx.closePath()
  }
  const crust = mixHex(ASH, LOFT.soot, 0.35)
  const [er, eg, eb] = rgb(mixHex(FLAME_RIM, SPARK, 0.3 * breathe))
  path()
  const g = ctx.createLinearGradient(0, -r * 0.6, 0, r * 0.75)
  g.addColorStop(0, mixHex(edge, mixHex(crust, ASH, 0.25), ash))
  g.addColorStop(0.55, mixHex(body, crust, ash))
  g.addColorStop(1, mixHex(core, mixHex(crust, FLAME_RIM, 0.35 + 0.35 * breathe), ash))
  ctx.fillStyle = g
  ctx.fill()
  ctx.save()
  path()
  ctx.clip()
  // Its underside glows where it lies in the ash, swelling and ebbing with each breath.
  const under = ctx.createRadialGradient(0, 0.9 * r, 0, 0, 0.9 * r, 1.1 * r)
  under.addColorStop(0, `rgba(${er}, ${eg}, ${eb}, ${((0.35 + 0.55 * breathe) * ash).toFixed(3)})`)
  under.addColorStop(1, `rgba(${er}, ${eg}, ${eb}, 0)`)
  ctx.fillStyle = under
  ctx.fillRect(-r * 1.6, -r * 1.2, r * 3.2, r * 2.6)
  // Cracks across its crust, glowing through: fine wandering lines that run mostly across it, brighter on the breath.
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = `rgba(${er}, ${eg}, ${eb}, ${((0.2 + 0.6 * breathe) * ash).toFixed(3)})`
  ctx.lineWidth = Math.max(0.7, 0.06 * r)
  for (let i = 0; i < 2; i++) {
    let cx = -0.75 * r + 0.35 * r * hash(i, 81)
    let cy = (0.05 + 0.3 * i + 0.1 * hash(i, 82)) * r
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    for (let j = 0; j < 5; j++) {
      cx += (0.22 + 0.16 * hash(i, j, 83)) * r
      cy += (hash(i, j, 84) - 0.5) * 0.22 * r
      ctx.lineTo(cx, cy)
    }
    ctx.stroke()
  }
  ctx.restore()
  ctx.restore()
}

/**
 * The ember's breath in the silence, 0..1: it glows up and ebbs about once a second, never quite steady, the way a
 * coal does in a draught.
 */
export function emberBreath(t: number): number {
  const b = 0.5 + 0.5 * Math.sin(t * 5.4 + 0.35 * Math.sin(t * 2.1))
  return b * b * (3 - 2 * b)
}

/**
 * The spark on the stage: the first thing in each world's pieces, so its `over` comes before every part's (a pan's
 * lip or a socket drawn over it still covers it, as it did the stage's ball) and before the veil and the flame.
 */
export const ember = () =>
  scenery<FlameState>({
    name: 'spark-ember',
    draw: () => {},
    over: (p, s, c) => {
      const show = s.show
      if (!show) return
      const t = c.t
      if (show.worldKey(t) !== s.world) return
      const here = show.at(t)
      if (here.hidden || here.scale <= 0.05) return
      drawSpark(p, c.k, here.x, here.y, t, here.scale, here.stretch, here.angle)
    },
  })

/* ------------------------------------------------------------------ the veil at a door */

export interface VeilState {
  show: SparkShow | null
  world: WorldKey
}

/**
 * How long before and after a door its fire is in the frame. The three doors out are a fire the camera goes through
 * with the spark: it comes in from the way the spark is going, covers the frame on the cut, and leaves behind it. The
 * dash home is three doors in a sixth of a second, on the roll's strokes: each is a flash of fire and no more, so the
 * worlds it goes back through are seen, a few frames each (a burner, the glory hole), before the loft.
 */
const VEIL = { before: 0.3, after: 0.34 }
const FLASH = { before: 0.022, after: 0.028 }

/**
 * The veil's licks: scattered at random over the frame (no rows), sized on a power law (a few tall, many short), each
 * on its own clock as the band rises through the frame. The first few are big dark-red licks at the back, for depth.
 */
interface VeilLick {
  u: number
  v: number
  size: number
  rate: number
  seed: number
  back: boolean
}
const VEIL_BACK = 6
const VEIL_LICKS: VeilLick[] = Array.from({ length: 34 }, (_, i) => ({
  u: hash(i, 401),
  v: hash(i, 402),
  size: i < VEIL_BACK ? 0.75 + 0.25 * hash(i, 403) : 0.32 + 0.68 * Math.pow(hash(i, 403), 2.2),
  rate: 0.75 + 0.5 * hash(i, 404),
  seed: 500 + i * 3.7,
  back: i < VEIL_BACK,
}))

type RGB = [number, number, number]
const lerp3 = (a: RGB, b: RGB, f: number): RGB => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]
const css = (c: RGB, al: number): string => `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${Math.max(0, Math.min(1, al))})`
const palette = (x: { rim: string; body: string; heart: string }): { rim: RGB; body: RGB; heart: RGB } => ({ rim: rgb(x.rim), body: rgb(x.body), heart: rgb(x.heart) })
/** Where one world's fire meets the next at a door: white heat, which any fire's colours go to without turning grey. */
const HOT: RGB = rgb('#FFF6E0')

/** The fire over the frame at a door, from the world left's fire to the world come to's. */
export const veil = () =>
  scenery<VeilState>({
    name: 'fire-veil',
    draw: () => {},
    over: (p, s, c) => {
      const show = s.show
      if (!show) return
      const t = c.t
      if (show.worldKey(t) !== s.world) return
      // The door nearest now, if its fire is up.
      let best = -1
      let d = Infinity
      for (let i = 1; i < show.legs.length; i++) {
        const e = t - show.legs[i].from
        const span = i >= 4 ? FLASH : VEIL
        if (e > -span.before && e < span.after && Math.abs(e) < Math.abs(d)) {
          best = i
          d = e
        }
      }
      if (best < 0) return
      const flash = best >= 4
      const span = flash ? FLASH : VEIL
      const door = show.legs[best].from
      // The two fires, each in its own world's colours. They never mix: blue and orange mixed are a flat grey.
      const OLD = palette(FIRES[show.legs[best - 1].world])
      const NEW = palette(FIRES[show.legs[best].world])

      const { k } = c
      const f = frame(p, k)
      const w = f.x1 - f.x0
      const hgt = f.y1 - f.y0
      const cx = (f.x0 + f.x1) / 2
      const cy = (f.y0 + f.y1) / 2
      // The way the spark goes through this door: the fire comes at the frame from there and leaves behind it.
      const a = show.where(door - 0.03)
      const b = show.where(door - 0.001)
      let ux = b[0] - a[0]
      let uy = b[1] - a[1]
      const ul = Math.hypot(ux, uy)
      if (ul < 1e-6) {
        ux = 0
        uy = -1
      } else {
        ux /= ul
        uy /= ul
      }
      const reach = (Math.abs(ux) * w + Math.abs(uy) * hgt) / 2
      // 0 at the frame's trailing edge, 1 at its leading edge.
      const sOf = (x: number, y: number) => 0.5 + ((x - cx) * ux + (y - cy) * uy) / (2 * reach)
      const q = (d + span.before) / (span.before + span.after)
      const band = flash ? 0.5 : 2.0 - 3.0 * q
      const cover = (sv: number) => (flash ? smooth(d, -span.before, -span.before * 0.3) * (1 - smooth(d, span.after * 0.3, span.after)) : 1 - smooth(Math.abs(sv - band), 0.62, 1.0))
      // Which fire a point is in. The band comes in as the old world's fire and goes out as the new one's: behind its
      // middle it is the new fire, ahead of it the old, and where they meet it is white-hot. A flash (the dash home) is
      // the old fire up to the cut and the new one after it.
      const sideOf = (sv: number): number => (flash ? (d < 0 ? -1 : 1) : sv - band)
      const seam = (side: number): number => (flash ? 0 : Math.exp(-((side / 0.11) ** 2)))

      const ctx = p.drawingContext as CanvasRenderingContext2D
      ctx.save()
      // The wash: dark rim at the fire's edges, the body where it is thickest; white-hot where the two fires meet.
      const g = ctx.createLinearGradient((cx - ux * reach) * k, (cy - uy * reach) * k, (cx + ux * reach) * k, (cy + uy * reach) * k)
      for (let i = 0; i <= 24; i++) {
        const sv = i / 24
        const cv = cover(sv)
        const side = sideOf(sv)
        const P = side < 0 ? OLD : NEW
        g.addColorStop(sv, css(lerp3(lerp3(P.rim, P.body, 0.55 * cv * cv), HOT, 0.75 * seam(side)), 0.94 * cv))
      }
      ctx.fillStyle = g
      ctx.fillRect(f.x0 * k, f.y0 * k, w * k, hgt * k)
      ctx.restore()
      // The licks, rising through it: the band climbs the frame, its tips drifting up and off the top, hotter toward
      // the middle of the fire. Each is one fire's or the other's, whole; the line between them is ragged. The big dark
      // ones burn at the back.
      const ctx2 = p.drawingContext as CanvasRenderingContext2D
      const since = d + span.before
      for (const pass of [true, false]) {
        ctx2.save()
        ctx2.globalCompositeOperation = pass ? 'source-over' : 'screen'
        for (const L of VEIL_LICKS) {
          if (L.back !== pass) continue
          // Where its root is now: coming up from under the frame and rising off its top.
          const life = (L.v + since * L.rate * 1.1) % 1
          const bx = f.x0 + w * (-0.05 + 1.1 * L.u)
          const by = f.y1 + hgt * (0.3 - 1.25 * life)
          const hh = hgt * (L.back ? 0.75 : 0.55) * L.size
          const sv = sOf(bx, by - hh * 0.4)
          const cv = cover(sv)
          if (cv < 0.03) continue
          const side = sideOf(sv + 0.22 * (hash(L.seed, 7) - 0.5))
          const P = side < 0 ? OLD : NEW
          const hot = 0.6 * seam(side)
          const fade = Math.sin(Math.PI * Math.min(1, life * 1.15))
          const lick: Lick = {
            x: bx,
            y: by,
            w: Math.min(w * 0.075 * (0.6 + L.size), hh * 0.4),
            h: hh * (0.55 + 0.45 * cv),
            lean: w * 0.03 * Math.sin(t * 2.3 + L.seed),
            t,
            seed: L.seed,
            root: L.back ? lerp3(P.rim, P.body, 0.5) : lerp3(lerp3(P.heart, P.body, 0.2), HOT, hot),
            mid: L.back ? lerp3(P.rim, [20, 10, 8], 0.2) : lerp3(P.body, HOT, hot),
            rim: L.back ? lerp3(P.rim, [20, 10, 8], 0.45) : lerp3(P.rim, HOT, hot * 0.6),
            a: (L.back ? 0.7 : 0.75) * cv * fade,
            tips: L.size > 0.55 ? (hash(L.seed, 9) > 0.6 ? 3 : 2) : 1,
          }
          drawLick(ctx2, k, lick)
        }
        ctx2.restore()
      }
      // The spark itself stays in front of its fire: a door never hides it.
      // A soft shadow round it first (no edge), so its clean teardrop and gold heart stand in front of the fire.
      const here = show.at(t)
      if (!here.hidden && here.scale > 0.05) {
        shadow(ctx2, k, here.x, here.y, R * here.scale, R * here.scale + 0.5, 0.55 * (flash ? 0.6 : 1))
        drawSpark(p, k, here.x, here.y, t, here.scale, here.stretch, here.angle)
      }
    },
  })
