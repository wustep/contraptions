import type p5 from 'p5'
import { clamp, easeOutCubic } from '../../../../../../../../src/core/ease'
import { mixHex, type Pt } from '../../../../../parts'
import { frame, hash, knock, scenery } from '../kit'
import { fight } from '../music'
import { VOID } from '../worlds'
import { drawThing, type Thing } from './bagelThings'
import { BRINK, CENTRE, evelyn, FIRST_IN, HOLE, JOY_LIGHT, REVEAL, TIP_IN } from './pullPath'

export { drawThing, THING_WORLD, type Thing } from './bagelThings'

/**
 * The everything bagel: Jobu's, in the dark. A black, glossy torus seen face-on, colossal, its crust seeded (sesame,
 * poppy, salt, garlic, onion) and crusted with small things from every world, its hole a well of darkness. Shared
 * scenery of the dark: the score stands it at `BAGEL.at` for the whole show, and it is drawn from show time.
 *
 * The pull (`pull.ts`, 127.79 to 165.62) lights it and draws things into it; the peak (`peak.ts`, 241.76 to 264.14)
 * spins it backwards and shrinks it until its hole is a washer's window.
 *
 * API, for the peak:
 *
 * - `BAGEL`: its centre in the dark's cells (`at`), its outer radius (`r`) and its hole's (`hole`), at scale 1.
 * - `bagelPose(t)`: everything the drawing reads at show time `t` (a `BagelPose`): how far it has turned, its scale,
 *   its light, the glow in its hole, an offset of its centre. The pull's own timeline, then whatever `driveBagel`
 *   has laid over it.
 * - `driveBagel({ from, to, pose })`: take it over from show time `from`. `pose(t, base)` returns the fields to
 *   change (a `Partial<BagelPose>`); `base` is the pose without this drive. Past `to` the drive's pose at `to` holds.
 *   Call it once, at module load (e.g. at the top of `peak.ts`). The last drive registered wins where two overlap.
 * - `bagelTurn(t)` and `bagelSpin(t)`: the pull's own turn (radians) and its rate (radians a second) at `t`, to take
 *   it over without a jolt. `turn` is positive the way the pull turns it (counterclockwise on the screen), so to
 *   spin it backwards, make `turn` go down.
 * - `scaleForHole(r)`: the scale at which its hole's radius is `r` cells (`scaleForHole(HOME_CIRCLE.r)` for the
 *   last frame of the peak). `holeAt(t)`: the hole's radius at `t`, with any drive. The hole is a true circle
 *   (only the outer edge is lumpy), so it can match a washer's window exactly.
 * - `edgeAt(pose, phi)`: the outer edge's distance from the centre at screen angle `phi` (it is hand-rolled, a
 *   little lumpy, and the lumps turn with it): where a rope wound round it, or a ball sitting on it, goes.
 * - `SWALLOWED`: what went down the hole, in order, and when (show seconds, each on a beat of the pull), with how
 *   big it was (cells) and how hard the beat was. `swallowedBy(t)`: how many had gone by `t`.
 * - `inward(i, u)`: where swallowed thing `i` was, relative to the bagel's centre at scale 1, `u` seconds before
 *   it went in (u >= 0 on its slow spiral in; the path to reverse, if the peak gives it back the way it came).
 * - `drawThing(p, k, ink, weight, thing, x, y, size, angle, dark?, variant?)`: draw one of the things (x, y in cells
 *   from the current origin), the same drawing the pull swallows.
 * - `drawBagel(p, k, ink, weight, pose)`: the whole bagel at the current origin, for a part that wants to draw it
 *   itself (it is already drawn as scenery; this is for a copy, or a close-up).
 * - The pull's landmarks, show seconds: `JOY_LIGHT`, `REVEAL`, `FIRST_IN`, `BRINK`, `TIP_IN`.
 *
 * Left alone after the pull, it stays lit all round (`lit` and `sweep` 1), Joy's spot on the crown goes out
 * (`pool` 0 by 168), it turns on slowly the pull's way at 0.012 radians a second, scale 1, and the well keeps a faint
 * glow (`gulp` 0.12). A drive for the peak will likely want its own `turn`, `scale` and `gulp`.
 */

/** Its centre in the dark's own cells, and its outer radius and its hole's, in cells at scale 1. */
export const BAGEL = {
  at: CENTRE,
  r: 6.4,
  hole: HOLE,
}

/** Everything the drawing of the bagel reads. */
export interface BagelPose {
  /** How far it has turned, radians, positive the pull's way (counterclockwise on the screen). */
  turn: number
  /** Its size: 1 as the pull has it (colossal). The hole's radius is `BAGEL.hole * scale`. */
  scale: number
  /** The great light over it, 0 (unseen in the dark) to 1. */
  lit: number
  /** How far round from its crown the great light has spread, 0 to 1 (all the way round to the bottom). */
  sweep: number
  /** The spot on its crown, where Joy sits: 0 to 1. Lights the crown whatever `lit` is. */
  pool: number
  /** The cold glow down the hole, 0 (none) to about 1.5: it flares as something goes in. */
  gulp: number
  /** Its centre moved from `BAGEL.at`, cells. */
  dx: number
  dy: number
  /**
   * Before any of it is lit (the hush): a far light just grazing its rim on the side Evelyn drifts in on, 0 to 1,
   * so something colossal is felt in the dark before it is seen. Optional; 0 when left out.
   */
  glint?: number
}

/* ------------------------------------------------------------------ the pull's timeline (show seconds) */

/**
 * A light finds Joy on the crown; the whole bagel is lit; the pull takes hold (the first thing goes in); Evelyn at the
 * brink (the fight's beat 56); the tip in, on beat 59 (the jump). Kept with her way in `pullPath.ts`.
 */
export { BRINK, FIRST_IN, JOY_LIGHT, REVEAL, TIP_IN } from './pullPath'

/** One thing that went down the hole. */
export interface Swallowed {
  thing: Thing
  /** Show seconds it went over the lip: on a beat. */
  at: number
  /** Cells across its longest way. */
  size: number
  /** How hard the beat was (the recording's strength there, about 0.5 to 1.4). */
  s: number
  /** A colour variant, where the thing has more than one. */
  variant: number
  /** Where it came from: the angle round the bagel it started its spiral at (radians, screen), and how far out (cells). */
  from: number
  far: number
  /** How long its spiral in took, seconds, and how many turns it made. */
  dur: number
  turns: number
}

/**
 * What goes down the hole, one on each chosen beat of the pull: the first on the hush's last onset (138.32), then
 * one on beat 6, the gentle run 13 to 20, the swell 25, 26 and 31 to 37, and the strong beats 42, 43 and 46 to 53.
 * Small things on the soft beats, big ones on the loud: the dog on 36, the trophy (her hopes and dreams) on 53.
 */
const PLAN: [number, Thing, number, number][] = [
  // [fight beat (or a show time when negative), thing, size, variant]
  [-FIRST_IN, 'receipt', 0.85, 0],
  [6, 'sock', 0.72, 0],
  [13, 'hanger', 0.7, 0],
  [14, 'mustard', 0.62, 0],
  [15, 'chopsticks', 0.8, 0],
  [16, 'report', 0.7, 0],
  [17, 'hotdog', 0.82, 0],
  [18, 'shoe', 0.66, 0],
  [19, 'pack', 0.72, 0],
  [20, 'flashbulb', 0.66, 0],
  [25, 'spatula', 0.9, 0],
  [26, 'fan', 0.8, 0],
  [31, 'sock', 0.74, 1],
  [32, 'shard', 0.66, 0],
  [33, 'tail', 0.9, 0],
  [34, 'receipt', 0.7, 0],
  [35, 'hotdog', 0.9, 0],
  [36, 'dog', 1.05, 0],
  [37, 'report', 0.78, 0],
  [42, 'hanger', 0.9, 0],
  [43, 'flashbulb', 0.72, 0],
  [46, 'mustard', 0.72, 0],
  [47, 'chopsticks', 0.95, 0],
  [48, 'sock', 0.8, 2],
  [49, 'spatula', 0.95, 0],
  [50, 'fan', 0.9, 0],
  [51, 'tail', 0.95, 0],
  [52, 'dog', 1.0, 0],
  [53, 'trophy', 1.15, 0],
]

const STRENGTH: Record<number, number> = {
  6: 0.69, 13: 0.51, 14: 0.51, 15: 0.48, 16: 0.52, 17: 0.65, 18: 0.49, 19: 0.58, 20: 0.59, 25: 0.7, 26: 0.77, 31: 0.9, 32: 0.83, 33: 0.95, 34: 1.09,
  35: 1.23, 36: 1.35, 37: 1.05, 42: 0.96, 43: 0.94, 46: 0.96, 47: 1.05, 48: 1.16, 49: 1.24, 50: 1.38, 51: 1.39, 52: 1.33, 53: 1.42,
}

/**
 * From here on the camera rides with Evelyn round the hole, so each thing is sent over the lip beside her: just ahead
 * of her on her way round, its last second drifting past her as it goes in.
 */
const AIM_FROM = 149.4
const AIM_LEAD = 0.2

export const SWALLOWED: readonly Swallowed[] = PLAN.map(([b, thing, size, variant], i) => {
  const at = b < 0 ? -b : fight(b)
  // They come in from all round, spread by a golden angle; the later ones from further out (off the frame as the
  // camera comes in), each on a spiral of about one turn, longer for the early, lazy ones.
  const turns = 0.8 + 0.35 * hash(i, 17)
  let from = -Math.PI / 2 + i * 2.39996 + (hash(i, 7) - 0.5) * 0.5
  if (at >= AIM_FROM) {
    const [ex, ey] = evelyn(at)
    from = Math.atan2(ey, ex) - AIM_LEAD + turns * 2 * Math.PI
  }
  const far = 8.6 + 3.2 * hash(i, 11) + (at > 150 ? 2.4 : 0)
  const dur = at < 150 ? 7.5 + 2 * hash(i, 13) : 6 + 1.6 * hash(i, 13)
  return { thing, at, size, s: b < 0 ? 0.51 : STRENGTH[b] ?? 0.6, variant, from, far, dur, turns }
})

/** The show times of the heavy swallows, the loudest beats of the pull (36, and 48 to 53): they go down harder. */
export const HEAVY: readonly number[] = [36, 48, 49, 50, 51, 52, 53].map(fight)

/** How many things had gone down the hole by show time `t`. */
export const swallowedBy = (t: number): number => SWALLOWED.filter((s) => s.at <= t).length

/**
 * Where swallowed thing `i` was `u` seconds before it went over the lip, relative to the bagel's centre at scale 1:
 * a slow spiral in from `far` to the hole's edge, turning the pull's way, faster as it closes (it keeps its
 * angular momentum), and for u < 0 the last plunge from the lip toward the middle, where it is gone.
 */
export function inward(i: number, u: number): Pt {
  const s = SWALLOWED[i]
  const h = BAGEL.hole
  if (u <= 0) {
    // Over the lip and down: on toward the middle, slowing as it sinks.
    const d = Math.min(1, -u / 0.45)
    const r = h * (1 - 0.8 * easeOutCubic(d))
    const a = angleAt(s, 0) - 1.6 * easeOutCubic(d)
    return [r * Math.cos(a), r * Math.sin(a)]
  }
  const q = clamp(u / s.dur)
  const r = radiusAt(s, q)
  const a = angleAt(s, q)
  return [r * Math.cos(a), r * Math.sin(a)]
}

/** A swallowed thing's distance from the centre, `q` (0 at the lip .. 1 at the start) of its time before the lip. */
function radiusAt(s: Swallowed, q: number): number {
  // Eased at the far end (it starts from rest), arriving at the lip still moving in.
  const e = q * q * (3 - 2 * q) * 0.55 + q * 0.45
  return BAGEL.hole + (s.far - BAGEL.hole) * e
}
/** Its angle (screen radians) at `q`: counterclockwise, the pull's way, going down as time goes on. */
function angleAt(s: Swallowed, q: number): number {
  // The swept angle from the start to q: more of the turn near the hole, where it is quicker.
  const total = s.turns * Math.PI * 2
  const swept = (g: number) => 1 - Math.pow(g, 0.7)
  return s.from - total * swept(q) + 0 * total
}

/* ------------------------------------------------------------------ the pose */

/** Its turn rate, the pull's way, radians a second: a crawl, quickening with the pull, all but still on the break. */
function rate(t: number): number {
  const pull = 0.006 + 0.07 * Math.pow(clampS(t, FIRST_IN, BRINK - 1.2), 1.4)
  const brake = 1 - 0.9 * clampS(t, BRINK - 0.6, TIP_IN - 0.3)
  const after = clampS(t, TIP_IN + 0.3, TIP_IN + 5)
  return pull * brake * (1 - after) + 0.012 * after
}
const clampS = (t: number, a: number, b: number): number => {
  const u = clamp((t - a) / (b - a))
  return u * u * (3 - 2 * u)
}

const STEP = 0.02
const TURN: Float64Array = (() => {
  const n = Math.ceil(340 / STEP) + 2
  const out = new Float64Array(n)
  for (let i = 1; i < n; i++) out[i] = out[i - 1] + ((rate((i - 1) * STEP) + rate(i * STEP)) / 2) * STEP
  return out
})()

/** The pull's own turn at show time `t`, radians, positive the pull's way. */
export function bagelTurn(t: number): number {
  const i = Math.max(0, Math.min(TURN.length - 2, t / STEP))
  const j = Math.floor(i)
  return TURN[j] + (TURN[j + 1] - TURN[j]) * (i - j)
}
/** The pull's own turn rate at show time `t`, radians a second. */
export const bagelSpin = (t: number): number => rate(t)

/** The pull's own pose at `t`, before any drive. */
function base(t: number): BagelPose {
  // The spot strikes like a lamp: on, a flicker, on.
  const s = t - JOY_LIGHT
  // After the pull it goes out (the peak has no one on the crown).
  const pool = s < 0 ? 0 : clamp(s / 0.04) * (1 - 0.45 * Math.exp(-(((s - 0.12) / 0.035) ** 2))) * (1 - clampS(t, TIP_IN + 0.5, TIP_IN + 2.5))
  const lit = t < REVEAL ? 0 : clamp((t - REVEAL) / 0.08)
  const sweep = t < REVEAL ? 0 : easeOutCubic(clamp((t - REVEAL) / 1.5))
  let gulp = 0.12 * lit
  // Each thing down the hole: the well's glow flares on the beat, and the whole of it gives a heavy little throb,
  // swelling a few hundredths of a second after and settling.
  let throb = 0
  for (const w of SWALLOWED) {
    const x = t - w.at
    if (x < 0 || x > 1.8) continue
    // The big beats (36, and 48 to 53) go down heavier: a deeper flare, a bigger, slower throb.
    const big = HEAVY.includes(w.at)
    gulp += w.s * (big ? 1.35 : 0.8) * knock(x, big ? 0.42 : 0.32)
    const rise = big ? 0.09 : 0.07
    throb += (big ? 0.016 : 0.0065) * w.s * (x / rise) * Math.exp(1 - x / rise)
  }
  const glint = clampS(t, 128.4, JOY_LIGHT - 0.2) * (1 - clampS(t, REVEAL, REVEAL + 1.2))
  return { turn: bagelTurn(t), scale: 1 + throb, lit, sweep, pool, gulp, dx: 0, dy: 0, glint }
}

interface Drive {
  from: number
  to: number
  pose: (t: number, base: BagelPose) => Partial<BagelPose>
}
const DRIVES: Drive[] = []

/** Take the bagel over from show time `from` (see the API above). */
export function driveBagel(drive: { from: number; to?: number; pose: (t: number, base: BagelPose) => Partial<BagelPose> }): void {
  DRIVES.push({ from: drive.from, to: drive.to ?? Infinity, pose: drive.pose })
}

/** The bagel at show time `t`: the pull's pose, and every drive over it. */
export function bagelPose(t: number): BagelPose {
  let pose = base(t)
  for (const d of DRIVES) {
    if (t < d.from) continue
    pose = { ...pose, ...d.pose(Math.min(t, d.to), pose) }
  }
  return pose
}

/**
 * How far its outer edge is from its centre (cells) at screen angle `phi` (radians, 0 to the right, down positive),
 * in `pose`: the hand-rolled lumps turning with it. What sits on it (Joy on the crown) or winds round it sits here.
 */
export const edgeAt = (pose: BagelPose, phi: number): number => BAGEL.r * pose.scale * lump(phi + pose.turn)

/** The scale at which the hole's radius is `r` cells. */
export const scaleForHole = (r: number): number => r / BAGEL.hole
/** The hole's radius at show time `t`, cells. */
export const holeAt = (t: number): number => BAGEL.hole * bagelPose(t).scale

/* ------------------------------------------------------------------ drawing */

const TAU = Math.PI * 2
const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`
}
const smooth = (x: number, a: number, b: number): number => {
  const u = clamp((x - a) / (b - a))
  return u * u * (3 - 2 * u)
}
/** The dark's own paper: what is down the hole. */
const DARK = '#0A090C'

/**
 * Hand-rolled: its outer edge is a little lumpy, by the angle round the bagel itself (so the lumps turn with it).
 * Its hole is true, so that at the peak it can become a washer's window exactly.
 */
const lump = (a: number): number => 1 + 0.021 * Math.sin(2 * a + 0.7) + 0.013 * Math.sin(3 * a + 2.1) + 0.007 * Math.sin(5 * a + 4.0)

/**
 * The light on it, from high above and a little in front. A point of its tube is at screen angle `phi` round the
 * ring and `beta` across the tube (0 facing us, +90° its outer side, -90° its hole's side); it faces the light by
 * `A cos(beta) + B sin(beta)`. So the lit side of the tube is its outer edge at the top and its hole's edge at the
 * bottom, which is what makes it read as a ring of dough and not a flat disc.
 */
const L = { y: -0.8, z: 0.6 }
const litAB = (phi: number): [number, number] => [L.z, L.y * Math.sin(phi)]
const facing = (phi: number, rho: number): number => {
  const [A, B] = litAB(phi)
  return Math.max(0, A * Math.sqrt(Math.max(0, 1 - rho * rho)) + B * rho)
}

/** Where across the tube (sin beta: -1 at the hole's edge, 1 at the outer) light `ab` beats `c`, or null. */
function band(ab: [number, number], c: number): [number, number] | null {
  const [A, B] = ab
  const M = Math.hypot(A, B)
  if (M <= c) return null
  const b0 = Math.atan2(B, A)
  const d = Math.acos(c / M)
  const lo = Math.max(-Math.PI / 2, b0 - d)
  const hi = Math.min(Math.PI / 2, b0 + d)
  if (lo >= hi) return null
  return [Math.sin(lo), Math.sin(hi)]
}

/** How much light reaches screen angle `phi` round the ring: the spot on the crown, and the great light spreading. */
function lightAt(pose: BagelPose, phi: number): number {
  let d = Math.abs(phi + Math.PI / 2) % TAU
  if (d > Math.PI) d = TAU - d
  const reach = pose.sweep * Math.PI * 1.15
  // The light is high over it: the underside of the ring gets less of it.
  const fall = 0.4 + 0.6 * (1 - Math.sin(phi)) / 2
  const great = pose.lit * (1 - smooth(d, reach - 0.5, reach)) * fall
  const spot = pose.pool * (1 - smooth(d, 0.06, 0.26))
  return Math.max(great, spot)
}

/**
 * The spot on the crown, where Joy sits, at a point of the face (pixels from the centre, scale `S` pixels a cell): a
 * round pool of light, not a wedge of the ring. The great light as `lightAt` has it.
 */
/** Where on the rim the far light grazes it in the hush (screen radians: up and to the left), and how wide. */
const GLINT_AT = -2.3
const glintAt = (pose: BagelPose, phi: number): number => {
  const g = pose.glint ?? 0
  if (g <= 0.001) return 0
  let d = Math.abs(phi - GLINT_AT) % TAU
  if (d > Math.PI) d = TAU - d
  return g * (1 - smooth(d, 0.25, 1.0))
}

function lightOn(pose: BagelPose, phi: number, x: number, y: number, S: number): number {
  const great = Math.max(lightAt({ ...pose, pool: 0 }, phi), 0.13 * glintAt(pose, phi))
  if (pose.pool <= 0.001) return great
  const d = Math.hypot(x / S, y / S + BAGEL.r)
  return Math.max(great, pose.pool * (1 - smooth(d, 0.7, 2.3)))
}

/** A conic fill of `hex` at alpha `a`, times the light round the ring (never under `floor`), times `by(phi)`. */
function conic(ctx: CanvasRenderingContext2D, pose: BagelPose, hex: string, a: number, floor = 0, by: (phi: number) => number = () => 1): CanvasGradient {
  const g = ctx.createConicGradient(0, 0, 0)
  const n = 48
  for (let i = 0; i <= n; i++) {
    const phi = (i / n) * TAU
    g.addColorStop(i / n, rgba(hex, a * (floor + (1 - floor) * lightAt(pose, phi)) * by(phi)))
  }
  return g
}

/** The ring's shape on the screen now, in pixels: its hole, and its lumpy outer edge at a screen angle. */
interface Geo {
  h: number
  outer: (phi: number) => number
}
const across = (g: Geo, phi: number, rho: number): number => {
  const o = g.outer(phi)
  return (o + g.h) / 2 + ((o - g.h) / 2) * rho
}

/** The path of a band of the tube where `range(phi)` says it covers (in sin beta), round the whole ring. */
function bandPath(ctx: CanvasRenderingContext2D, g: Geo, range: (phi: number) => [number, number] | null): boolean {
  const N = 160
  const rs: ([number, number] | null)[] = []
  for (let j = 0; j < N; j++) rs.push(range((j / N) * TAU))
  const start = rs.findIndex((r) => r === null)
  ctx.beginPath()
  const at = (j: number, rho: number): [number, number] => {
    const a = (j / N) * TAU
    const r = across(g, a, rho)
    return [r * Math.cos(a), r * Math.sin(a)]
  }
  if (start < 0) {
    for (let j = 0; j <= N; j++) {
      const [x, y] = at(j, rs[j % N]![1])
      if (j === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    for (let j = N; j >= 0; j--) {
      const [x, y] = at(j, rs[j % N]![0])
      if (j === N) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    return true
  }
  let any = false
  let run: number[] = []
  const flush = () => {
    if (run.length >= 2) {
      any = true
      // The ends taper to a point half a step out.
      const first = run[0]
      const last = run[run.length - 1]
      const [x0, y0] = at(first - 0.5, (rs[first]![0] + rs[first]![1]) / 2)
      ctx.moveTo(x0, y0)
      for (const j of run) {
        const [x, y] = at(j, rs[j]![1])
        ctx.lineTo(x, y)
      }
      const [x1, y1] = at(last + 0.5, (rs[last]![0] + rs[last]![1]) / 2)
      ctx.lineTo(x1, y1)
      for (let q = run.length - 1; q >= 0; q--) {
        const [x, y] = at(run[q], rs[run[q]]![0])
        ctx.lineTo(x, y)
      }
      ctx.closePath()
    }
    run = []
  }
  for (let q = 1; q <= N; q++) {
    const j = (start + q) % N
    if (rs[j]) run.push(j)
    else flush()
  }
  flush()
  return any
}

/**
 * A streak of gloss along the tube: centred on screen angle `mid`, `spread` either side, riding at `rho(phi)` across
 * the tube, `half` thick at its middle and tapering to points.
 */
function streak(ctx: CanvasRenderingContext2D, g: Geo, mid: number, spread: number, rho: (phi: number) => number, half: number): void {
  const N = 40
  ctx.beginPath()
  for (let j = 0; j <= N; j++) {
    const a = mid - spread + (2 * spread * j) / N
    const taper = Math.pow(Math.sin((Math.PI * j) / N), 0.9)
    const r = across(g, a, rho(a) + half * taper)
    if (j === 0) ctx.moveTo(r * Math.cos(a), r * Math.sin(a))
    else ctx.lineTo(r * Math.cos(a), r * Math.sin(a))
  }
  for (let j = N; j >= 0; j--) {
    const a = mid - spread + (2 * spread * j) / N
    const taper = Math.pow(Math.sin((Math.PI * j) / N), 0.9)
    const r = across(g, a, rho(a) - half * taper)
    ctx.lineTo(r * Math.cos(a), r * Math.sin(a))
  }
  ctx.closePath()
}

/** The things crusted into it: a sock, a receipt, a flashbulb, a hot dog, a spatula, a fan. None round, none ball-sized. */
const CRUST: [Thing, number, number, number, number, number][] = [
  // [thing, phi (screen radians at the reveal), rho, size, angle from the tangent, variant]. None under Joy's light on
  // the crown while the pull turns it (a little over a radian, counterclockwise, by the brink).
  ['hotdog', 0.17, 0.05, 1.4, 0.25, 0],
  ['spatula', 1.22, -0.2, 1.45, -0.6, 0],
  ['fan', 2.18, 0.3, 1.2, 0.3, 0],
  ['sock', 2.88, 0.1, 1.2, 0.5, 1],
  ['receipt', 3.75, -0.3, 1.1, -0.3, 0],
  ['flashbulb', 4.1, 0.32, 1.05, 2.2, 0],
]
/** The crust is laid out as it is at the reveal: this much turn has gone by then. */
const CRUST_TURN = bagelTurn(REVEAL)
/** Whether a seed at (phi, rho) would sit on one of the crusted things: the dough is bare round each. */
const underCrust = (phi: number, rho: number): boolean => {
  const m = (BAGEL.r + BAGEL.hole) / 2
  const w = (BAGEL.r - BAGEL.hole) / 2
  return CRUST.some(([, pc, rc, size]) => {
    let d = Math.abs(phi - pc - CRUST_TURN) % TAU
    if (d > Math.PI) d = TAU - d
    return Math.hypot(d * (m + w * rc), (rho - rc) * w) < size * 0.6
  })
}

/* The seeds, laid once: where round the ring (radians, at turn 0), where across the tube (sin beta), which way,
 * how big, what. Thick across the face and thin toward its edges, in drifts, the way the topping sits on a bagel. */
type SeedKind = 'sesame' | 'poppy' | 'salt' | 'garlic' | 'onion'
interface Seed {
  phi: number
  rho: number
  dir: number
  len: number
  wid: number
  kind: SeedKind
  h: number
  lump: number
}
const SEED_KINDS: SeedKind[] = ['poppy', 'onion', 'garlic', 'sesame', 'salt']
const SEED_COLOR: Record<SeedKind, string> = { sesame: VOID.sesame, poppy: VOID.poppy, salt: VOID.salt, garlic: VOID.garlic, onion: VOID.onion }
const SEED_ALPHA: Record<SeedKind, number> = { sesame: 0.85, poppy: 1, salt: 0.95, garlic: 0.75, onion: 0.85 }
const SEEDS: Seed[] = (() => {
  const out: Seed[] = []
  const counts: [SeedKind, number, number, number][] = [
    ['sesame', 300, 0.28, 0.13],
    ['poppy', 520, 0.085, 0.075],
    ['salt', 70, 0.12, 0.1],
    ['garlic', 45, 0.2, 0.14],
    ['onion', 55, 0.22, 0.12],
  ]
  let n = 0
  for (const [kind, count, len, wid] of counts) {
    let made = 0
    let tries = 0
    while (made < count && tries < count * 30) {
      tries++
      n++
      const rho = (hash(n, 1, 3) * 2 - 1) * 0.96
      const phi = hash(n, 3, 3) * TAU
      // Thinner toward the tube's edges; as many to the area inside as out; and in drifts round the ring.
      const drift = 0.5 + 0.5 * Math.sin(7 * phi + 2.3 * rho + 1.3) * Math.sin(4 * phi - 3 * rho + 0.2)
      const keep = Math.pow(1 - rho * rho, 1.8) * (0.62 + 0.38 * (rho + 1) / 2) * (0.45 + 0.55 * drift)
      if (hash(n, 2, 3) > keep || underCrust(phi, rho)) continue
      made++
      out.push({ phi, rho, dir: hash(n, 4, 3) * TAU, len: len * (0.8 + 0.4 * hash(n, 5, 3)), wid: wid * (0.85 + 0.3 * hash(n, 6, 3)), kind, h: hash(n, 7, 3), lump: lump(phi) })
    }
  }
  return out
})()

/** Draw the bagel in `pose` at the current origin (its centre before `pose.dx, dy`). */
export function drawBagel(p: p5, k: number, ink: string, weight: number, pose: BagelPose): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const S = pose.scale * k
  const g: Geo = { h: BAGEL.hole * S, outer: (phi) => BAGEL.r * S * lump(phi + pose.turn) }
  const h = g.h
  const seen = Math.max(pose.lit, pose.pool)
  ctx.save()
  ctx.translate(pose.dx * k, pose.dy * k)

  // The body: the bagel's own black, a shade up from the dark, the lumps of its outer edge turning with it.
  ctx.beginPath()
  const N = 180
  for (let j = 0; j <= N; j++) {
    const a = (j / N) * TAU
    const r = g.outer(a)
    if (j === 0) ctx.moveTo(r * Math.cos(a), r * Math.sin(a))
    else ctx.lineTo(r * Math.cos(a), r * Math.sin(a))
  }
  ctx.closePath()
  ctx.moveTo(h, 0)
  ctx.arc(0, 0, h, 0, TAU, true)
  // Unlit, it is all but lost in the dark: a presence, no more.
  ctx.fillStyle = mixHex(DARK, VOID.bagel, (0.22 + 0.78 * pose.lit) * 0.72)
  ctx.fill()
  if (pose.pool > 0.001) {
    // The pool of Joy's light on its crown.
    const cy = -g.outer(-Math.PI / 2)
    const pool = ctx.createRadialGradient(0, cy, 0, 0, cy, 2.6 * S)
    pool.addColorStop(0, rgba(VOID.bagelRim, 0.9 * pose.pool * (1 - 0.6 * pose.lit)))
    pool.addColorStop(0.45, rgba(VOID.bagelRim, 0.5 * pose.pool * (1 - 0.6 * pose.lit)))
    pool.addColorStop(1, rgba(VOID.bagelRim, 0))
    ctx.fillStyle = pool
    ctx.fill()
  }
  if ((pose.glint ?? 0) > 0.001) {
    // In the hush, a far light grazing its rim: a sliver of its edge and a whisper of gloss, and no more.
    ctx.save()
    ctx.lineWidth = Math.max(0.6, weight * 0.9)
    ctx.strokeStyle = conic(ctx, pose, VOID.rimLight, 0.3, 1, (phi) => glintAt(pose, phi))
    ctx.beginPath()
    for (let j = 0; j <= N; j++) {
      const a = (j / N) * TAU
      const r = g.outer(a)
      if (j === 0) ctx.moveTo(r * Math.cos(a), r * Math.sin(a))
      else ctx.lineTo(r * Math.cos(a), r * Math.sin(a))
    }
    ctx.closePath()
    ctx.stroke()
    streak(ctx, g, GLINT_AT + 0.1, 0.75, () => 0.55, 0.03)
    ctx.fillStyle = conic(ctx, pose, VOID.rimLight, 0.09, 1, (phi) => glintAt(pose, phi))
    ctx.fill()
    ctx.restore()
  }

  if (seen > 0.001) {
    // The side of the tube that faces the light, in two flat steps, and only where the light has reached.
    // And the side turned away from it, darker: the underside of the ring's outer edge, the top of the hole's.
    if (bandPath(ctx, g, (phi) => {
      const [A, B] = litAB(phi)
      return band([-A, -B], -0.12)
    })) {
      ctx.fillStyle = conic(ctx, pose, mixHex(VOID.bagel, DARK, 0.72), 1)
      ctx.fill()
    }
    if (bandPath(ctx, g, (phi) => band(litAB(phi), 0.72))) {
      ctx.fillStyle = conic(ctx, pose, mixHex(VOID.bagel, VOID.bagelRim, 0.7), 1)
      ctx.fill()
    }
    if (bandPath(ctx, g, (phi) => band(litAB(phi), 0.93))) {
      ctx.fillStyle = conic(ctx, pose, VOID.bagelRim, 1)
      ctx.fill()
    }
  }

  // The seeds, turning with it, each lit as its place on the tube is.
  drawSeeds(ctx, pose, S, h)

  // The things crusted in.
  for (const [thing, phi0, rho, size, ang, variant] of CRUST) {
    const phi = phi0 - (pose.turn - CRUST_TURN)
    const r = across(g, phi, rho) / k
    // (Only the real light shows them: the far glint of the hush does not.)
    const light = lightOn({ ...pose, glint: 0 }, phi, r * k * Math.cos(phi), r * k * Math.sin(phi), S) * (0.3 + 0.7 * facing(phi, rho))
    if (light < 0.03) continue
    drawThing(p, k, ink, weight, thing, r * Math.cos(phi), r * Math.sin(phi), size * pose.scale, phi + Math.PI / 2 + ang, 1 - light * 0.9, variant)
  }

  if (seen > 0.001) {
    // The glaze: a long hard gloss along the top of the ring.
    const top = (phi: number) => {
      const b = L.y * Math.sin(phi)
      return 0.78 * Math.sin(Math.atan2(b, L.z + 1))
    }
    streak(ctx, g, -Math.PI / 2 - 0.06, 0.95, top, 0.07)
    ctx.fillStyle = conic(ctx, pose, VOID.rimLight, 0.32)
    ctx.fill()
    streak(ctx, g, -Math.PI / 2 - 0.1, 0.62, top, 0.026)
    ctx.fillStyle = conic(ctx, pose, VOID.salt, 0.8)
    ctx.fill()
    // And a short second glint up on the left, nearer the hole: the gloss of a glaze, not the shine of a plate.
    streak(ctx, g, -Math.PI * 0.8, 0.2, () => -0.28, 0.03)
    ctx.fillStyle = conic(ctx, pose, VOID.rimLight, 0.4)
    ctx.fill()
  }

  // The hole: a well. Its wall in two steps going down, darker, and the dark at the bottom of it.
  // (Unlit, its wall is as lost in the dark as the rest of it.)
  const wallSeen = (0.22 + 0.78 * pose.lit) * 0.72 + 0.28 * pose.lit
  ctx.beginPath()
  ctx.arc(0, 0, h, 0, TAU)
  ctx.fillStyle = mixHex(DARK, mixHex(VOID.bagel, DARK, 0.35), wallSeen)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(0, 0, h * 0.88, 0, TAU)
  ctx.fillStyle = mixHex(DARK, mixHex(VOID.bagel, DARK, 0.7), wallSeen)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(0, 0, h * 0.76, 0, TAU)
  ctx.fillStyle = DARK
  ctx.fill()
  if (seen > 0.001) {
    // The far side of its wall, low down, catches the light from above.
    ctx.save()
    ctx.beginPath()
    ctx.arc(0, 0, h, 0, TAU)
    ctx.clip()
    ctx.beginPath()
    ctx.arc(0, 0, h, 0, TAU)
    ctx.moveTo(h * 0.93, -h * 0.07)
    ctx.arc(0, -h * 0.07, h * 0.93, 0, TAU, true)
    ctx.fillStyle = conic(ctx, pose, VOID.bagelRim, 0.95)
    ctx.fill('evenodd')
    ctx.restore()
  }
  // The cold glow down the well, flaring as something goes in.
  if (pose.gulp > 0.005) {
    // Far down: small, and deep in the dark core, so the hole stays a well and not a lamp.
    // A heavy one lights more of the well, up to its wall.
    const reachOut = h * (0.72 + 0.24 * clamp((pose.gulp - 1) / 1.2))
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, reachOut)
    const a = Math.min(0.62, 0.26 * pose.gulp)
    gr.addColorStop(0, rgba(VOID.glow, a))
    gr.addColorStop(0.35, rgba(VOID.glow, a * 0.45))
    gr.addColorStop(1, rgba(VOID.glow, 0))
    ctx.beginPath()
    ctx.arc(0, 0, reachOut, 0, TAU)
    ctx.fillStyle = gr
    ctx.fill()
  }

  // Its line, in the dark's bone ink, strongest where the light is.
  if (seen > 0.001) {
    ctx.lineJoin = 'round'
    // The outer edge is lit where it faces up, and lost in the dark underneath; the hole's the other way about.
    ctx.lineWidth = Math.max(0.6, weight * 0.9)
    ctx.strokeStyle = conic(ctx, pose, ink, 0.85, 0.1 * pose.lit, (phi) => 0.12 + 0.88 * Math.pow(Math.max(0, 0.15 - 0.85 * Math.sin(phi)), 1.2))
    ctx.beginPath()
    for (let j = 0; j <= N; j++) {
      const a = (j / N) * TAU
      const r = g.outer(a)
      if (j === 0) ctx.moveTo(r * Math.cos(a), r * Math.sin(a))
      else ctx.lineTo(r * Math.cos(a), r * Math.sin(a))
    }
    ctx.closePath()
    ctx.stroke()
    const flare = Math.min(0.5, 0.3 * Math.max(0, pose.gulp - 0.12))
    ctx.lineWidth = Math.max(0.6, weight * 0.75)
    ctx.strokeStyle = conic(ctx, pose, ink, 0.7, 0.1 * pose.lit, (phi) => Math.min(1, 0.42 + flare + 0.5 * Math.max(0, Math.sin(phi))))
    ctx.beginPath()
    ctx.arc(0, 0, h, 0, TAU)
    ctx.stroke()
  }
  ctx.restore()
}

function drawSeeds(ctx: CanvasRenderingContext2D, pose: BagelPose, S: number, h: number): void {
  const BINS = 4
  const paths: Record<SeedKind, Path2D[]> = { sesame: [], poppy: [], salt: [], garlic: [], onion: [] }
  for (const kind of SEED_KINDS) for (let b = 0; b < BINS; b++) paths[kind].push(new Path2D())
  const cosT = Math.cos(-pose.turn)
  const sinT = Math.sin(-pose.turn)
  const R = BAGEL.r * S
  for (const s of SEEDS) {
    // Its angle on the screen now, turned the pull's way (counterclockwise).
    const c0 = Math.cos(s.phi)
    const s0 = Math.sin(s.phi)
    const ca = c0 * cosT - s0 * sinT
    const sa = s0 * cosT + c0 * sinT
    const phi = Math.atan2(sa, ca)
    const o = R * s.lump
    const r = (o + h) / 2 + ((o - h) / 2) * s.rho
    const cx = r * ca
    const cy = r * sa
    const bright = lightOn(pose, phi, cx, cy, S) * (0.08 + 0.92 * Math.pow(facing(phi, s.rho), 1.3))
    if (bright < 0.05) continue
    const bin = Math.min(BINS - 1, Math.floor(bright * BINS))
    const path = paths[s.kind][bin]
    // Its own frame: along the radius it is squeezed by how far the tube turns away there.
    const fore = Math.sqrt(Math.max(0.05, 1 - s.rho * s.rho))
    const cd = Math.cos(s.dir)
    const sd = Math.sin(s.dir)
    const P = (a: number, b: number): [number, number] => {
      const u = (a * cd - b * sd) * fore
      const v = a * sd + b * cd
      return [cx + (u * ca - v * sa) * S, cy + (u * sa + v * ca) * S]
    }
    const L2 = s.len / 2
    const W2 = s.wid / 2
    if (s.kind === 'sesame') {
      // A teardrop.
      const t0 = P(L2, 0)
      const a1 = P(0.15 * s.len, W2 * 1.15)
      const b1 = P(-L2, W2 * 1.05)
      const e1 = P(-L2, 0)
      const a2 = P(-L2, -W2 * 1.05)
      const b2 = P(0.15 * s.len, -W2 * 1.15)
      path.moveTo(t0[0], t0[1])
      path.bezierCurveTo(a1[0], a1[1], b1[0], b1[1], e1[0], e1[1])
      path.bezierCurveTo(a2[0], a2[1], b2[0], b2[1], t0[0], t0[1])
    } else if (s.kind === 'poppy') {
      const q = P(0, 0)
      const rx = W2 * S
      path.moveTo(q[0] + rx, q[1])
      path.ellipse(q[0], q[1], rx, rx * (0.55 + 0.45 * fore), phi, 0, TAU)
    } else if (s.kind === 'salt') {
      const a = P(L2, 0)
      const b = P(0, W2)
      const c = P(-L2, 0)
      const d = P(0, -W2)
      path.moveTo(a[0], a[1])
      path.lineTo(b[0], b[1])
      path.lineTo(c[0], c[1])
      path.lineTo(d[0], d[1])
      path.closePath()
    } else {
      // A flake: five points, torn.
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * TAU
        const rr = 0.55 + 0.45 * hash(i, Math.floor(s.h * 1000), 5)
        const q = P(Math.cos(ang) * L2 * rr, Math.sin(ang) * W2 * rr)
        if (i === 0) path.moveTo(q[0], q[1])
        else path.lineTo(q[0], q[1])
      }
      path.closePath()
    }
  }
  for (const kind of SEED_KINDS) {
    for (let b = 0; b < BINS; b++) {
      ctx.fillStyle = rgba(SEED_COLOR[kind], SEED_ALPHA[kind] * ((b + 0.75) / BINS))
      ctx.fill(paths[kind][b])
    }
  }
}

/** The bagel, where the score stands it in the dark, drawn from show time. */
export const bagel = scenery<null>({
  name: 'bagel',
  draw: (p, _s, c) => {
    const pose = bagelPose(c.t)
    const k = c.k
    // The great light's haze, high over it: what the black of it stands against once it is lit.
    if (pose.lit > 0.001 || pose.pool > 0.001) {
      const ctx = p.drawingContext as CanvasRenderingContext2D
      const f = frame(p, k)
      const S = pose.scale * k
      const cx = pose.dx * k
      const cy = (pose.dy - BAGEL.r * pose.scale * 1.05) * k
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, BAGEL.r * S * 2.1)
      const a = 0.085 * pose.lit + 0.03 * pose.pool
      gr.addColorStop(0, rgba(VOID.rimLight, a))
      gr.addColorStop(0.5, rgba(VOID.rimLight, a * 0.35))
      gr.addColorStop(1, rgba(VOID.rimLight, 0))
      ctx.fillStyle = gr
      ctx.fillRect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
    }
    drawBagel(p, k, c.ink, c.weight, pose)
  },
})
