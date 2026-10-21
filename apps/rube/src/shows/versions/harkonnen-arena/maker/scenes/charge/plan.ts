import { beat, M, strongest } from '../../music'
import { T, END } from '../../timeline'
import { clamp01, lerp, smooth, smoother, type Pt } from '../../paint'

/**
 * The charge's plan: when everything happens, on the `charge` comb (0.587 s quickening to 0.551 s), and where.
 *
 * The place is the basin before Arrakeen, x about 9000, the flat at y = 0 with a few low swells on it. The storm comes
 * from the west (left); the Emperor's camp stands to the east of the basin: two blocks of Sardaukar in front, two small
 * ships among them, and the great ovoid ship behind. The worms come out of the storm's foot and run east. The lead worm,
 * with Paul and Chani on its back, goes through the first block and the first ship, then on to the great ship, rears over
 * it on the peak and brings it down. A second worm runs in just beyond it with three Fremen on its back, knocks the
 * second ship over and runs on east toward the city. A third runs in far back, in the dust.
 */

/** The comb's beats this plan turns on. */
export const B = {
  first: beat('charge', 0),
  w2: beat('charge', 11),
  w3: beat('charge', 13),
  close: beat('charge', 14),
  rankA: beat('charge', 18),
  ship1: beat('charge', 19),
  ship1Down: beat('charge', 22),
  wave: beat('charge', 26),
  run: beat('charge', 35),
  peak: beat('charge', 42),
  crash: beat('charge', 49),
  ground: beat('charge', 54),
  cutClose: beat('charge', 56),
  off: beat('charge', 69),
  dive: beat('charge', 73),
  dive2: beat('charge', 76),
  last: beat('charge', 84),
} as const

/** The lead worm comes out of the storm's skirt on this onset: up to it, it runs inside the dust. */
export const BREACH = strongest(266.2, 266.6)
/** The second worm knocks the second ship down on this onset; its fall lands on the beat the lead worm goes on. */
export const SHIP2_HIT = strongest(282.6, 282.9)

export const FROM = T.charge
export const TO = END

/** Where the storm's front is, at the foot (world x in its layer, as if in the action's plane). */
export const stormFront = (t: number): number => 8932 + 1.1 * (Math.min(t, 312) - FROM)
/** How much of the storm is left, 1 in the charge, going as the evening comes. */
export const stormLeft = (t: number): number => 1 - smoother(t, 309, 318.5)

/* ---------------------------------------------------------------- the ground */

/** The rise Paul stands on at the end, between the blocks and the great ship. */
export const RISE = { x: 9090, h: 1.9, w: 8.5 }
/** The basin floor's low swells: what a camera going with a worm sees go by, and what Chani goes down over at the end. */
const SWELLS: { x: number; h: number; w: number }[] = [
  { x: 8968, h: 0.9, w: 10 },
  { x: 8991, h: 1.2, w: 12 },
  { x: 9013, h: 0.8, w: 9 },
  { x: 9074, h: 0.9, w: 6.5 },
  RISE,
]

const bump = (x: number, s: { x: number; h: number; w: number }): number => {
  const d = (x - s.x) / s.w
  if (Math.abs(d) >= 1) return 0
  const u = 1 - d * d
  return s.h * u * u
}

/** The basin's surface in the action's plane: the flat, its swells, and the rise. */
export function ground(x: number): number {
  let h = 0
  for (const s of SWELLS) h = Math.max(h, bump(x, s))
  return -h
}
/** The swells, for the painter. */
export const GROUND_SWELLS = SWELLS

/* ---------------------------------------------------------------- the camp */

/** The blocks in the action's plane: [x0, x1]. */
export const RANKS: [number, number][] = [
  [9030, 9047],
  [9053, 9068],
]
/** The first small ship: it stands just behind the first block. (The second stands in the second worm's plane.) */
export const SHIP1 = { x: 9046, h: 11, w: 3.6 }
/** The Emperor's ship: an upright ovoid on a low plinth. */
export const EMPEROR = { x: 9122, w: 12, h: 15, legs: 1.8 }

/* ---------------------------------------------------------------- the worms */

/** A monotone cubic through [t, v] keys, flat outside them. */
export function curveOf(keys: [number, number][]): (t: number) => number {
  const ks = [...keys].sort((a, b) => a[0] - b[0])
  const n = ks.length
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) d.push((ks[i + 1][1] - ks[i][1]) / Math.max(1e-9, ks[i + 1][0] - ks[i][0]))
  const m: number[] = [d[0], ...new Array(Math.max(0, n - 2)).fill(0), d[n - 2]]
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i])
  return (t: number) => {
    if (t <= ks[0][0]) return ks[0][1]
    if (t >= ks[n - 1][0]) return ks[n - 1][1]
    let i = 0
    while (i + 1 < n && ks[i + 1][0] <= t) i++
    const h = ks[i + 1][0] - ks[i][0]
    const u = (t - ks[i][0]) / h
    const u2 = u * u
    const u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * ks[i][1] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * ks[i + 1][1] + (u3 - u2) * h * m[i + 1]
  }
}

export interface WormSpec {
  name: string
  /** Its radius, cells. */
  r: number
  /** Where its head is along the flat. */
  headX: (t: number) => number
  /** How far out of the sand it is, 0 (under) to 1. */
  emerge: (t: number) => number
  /** Its neck's bend up from the body's line, and how far its head curls forward over the bend, radians. */
  rear?: (t: number) => number
  curl?: (t: number) => number
  /** How far behind the head the neck bends; where the riders sit; how long its body runs above the sand. */
  neck: number
  seat: number
  length: number
}

/** The ridden worm's radius, cells. */
export const WR = 3.7

/** The lead worm's head along the flat: out of the storm, through the first block and ship, slowing to the great ship. */
const leadX = curveOf([
  [FROM, 8922],
  [BREACH, 8958],
  [B.rankA, 9034],
  [B.ship1, 9041],
  [B.wave, 9068],
  [B.peak - 2.5, 9096],
  [B.peak, 9104],
  [B.crash, 9116],
  [B.ground, 9118],
  [B.cutClose + 1, 9118.5],
])

/**
 * The lead worm out of the sand: up through the whole charge (it comes out of the storm already up, its riders on its
 * back), lowering its riders to the sand after the crash, and down for good on the dive.
 */
const leadEmerge = (t: number): number => {
  const lower = 0.5 * smoother(t, B.cutClose + 0.6, B.off - 0.15)
  const down = 0.5 * smoother(t, B.dive, B.dive + 4.2)
  return Math.max(0, 1 - lower - down)
}

/** How far it has rolled back after the crash: a settle that swings and dies away. */
const settle = (t: number): number => (t <= B.crash ? 0 : 0.13 * Math.sin((t - B.crash) * 7.5) * Math.exp(-(t - B.crash) / 0.55))

/**
 * The neck's bend: nothing until the peak, then up over the ship, a sway at the top, down onto it on the crash, and,
 * as the ship goes over, after it into the sand, with a damped settle.
 */
export function rear(t: number): number {
  if (t <= B.peak) return 0
  const up = 1.38 * (1 - Math.pow(1 - clamp01((t - B.peak) / 1.5), 3))
  const sway = 0.05 * Math.sin((t - B.peak) * 2.2) * smooth(t, B.peak + 0.8, B.peak + 1.6) * (1 - smooth(t, B.crash - 0.9, B.crash - 0.6))
  if (t <= B.crash - 0.62) return up + sway
  // The fall onto the ship: from the top to the strike in 0.62 s, accelerating.
  const top = 1.38 + 0.05 * Math.sin((B.crash - 0.62 - B.peak) * 2.2)
  if (t <= B.crash) {
    const u = (t - (B.crash - 0.62)) / 0.62
    return lerp(top, 0.24, u * u)
  }
  return lerp(0.24, -0.16, smoother(t, B.crash + 0.25, B.ground + 0.3)) + settle(t)
}

/** How far the head curls forward over the top of the rear, so its mouth faces down onto the ship. */
export const rearCurl = (t: number): number => 1.5 * smooth(t, B.peak + 0.5, B.peak + 2.2) * (1 - 0.83 * smooth(t, B.crash - 0.6, B.crash))

/** How open its mouth is: shut while it runs, wide as it rears, shut again in the wreck. */
export const mouthOpen = (t: number): number => smooth(t, B.peak + 0.2, B.peak + 1.3) * (1 - smooth(t, B.crash + 0.6, B.crash + 2.2))

/** How much the neck has thickened with the rear: a worm that rears gathers itself. */
export const rearing = (t: number): number => smooth(t, B.peak - 0.2, B.peak + 1.2) * (1 - smooth(t, B.ground, B.cutClose + 2))

export const LEAD: WormSpec = { name: 'lead', r: WR, headX: leadX, emerge: leadEmerge, rear, curl: rearCurl, neck: 28, seat: 33, length: 74 }

/**
 * The second worm, a little beyond the action's plane (drawn in a layer, `FAR` in `worms.ts`): out of the storm on the
 * beat after the lead worm, through the second ship, and on east toward the city, its riders still on its back.
 */
export const SECOND: WormSpec = {
  name: 'second',
  r: 3.4,
  headX: curveOf([[FROM, 8884], [B.w2, 8958], [B.wave, 9052], [SHIP2_HIT, 9095], [B.run, 9118], [B.peak, 9166], [305, 9310]]),
  emerge: () => 1,
  neck: 26,
  seat: 30,
  length: 66,
}

/** The third worm, far back in the dust: it comes out after the second, and goes down on the dive. */
export const THIRD: WormSpec = {
  name: 'third',
  r: 3.3,
  headX: curveOf([[263, 8870], [B.w3, 8958], [281.658, 9040], [292, 9086], [B.dive, 9112]]),
  emerge: (t) => 1 - smoother(t, B.dive + 1.2, B.dive + 5.2),
  neck: 26,
  seat: 30,
  length: 64,
}

/** The body's height over the flat at `s` cells behind the head, at full emergence: the spine's centre. */
function profile(w: WormSpec, s: number): number {
  // From the head, just out of the sand, up to the hump over the seat, then down under the sand behind.
  const top = w.r + 2.2
  if (s <= w.seat) return lerp(w.r * 0.25, top, smoother(s, 0, w.seat - 6))
  if (s <= w.seat + 9) return top
  return lerp(top, -w.r * 1.4, smoother(s, w.seat + 9, w.length))
}

export interface WormBody {
  spine: Pt[]
  radius: number[]
  /** The spine's direction at the head, radians (0 east, negative up). */
  headDir: number
  /** Where the body's back is at `s` behind the head (a rider's seat), cells. */
  backAt(s: number, lift?: number): Pt
  /** Where its underside is at `s` behind the head. */
  bellyAt(s: number): Pt
}

const cache = new Map<string, { t: number; body: WormBody }>()

/** A worm at `t`: its spine head first, its radius, its back and its belly. */
export function wormAt(w: WormSpec, t: number): WormBody {
  const hit = cache.get(w.name)
  if (hit && hit.t === t) return hit.body
  const hx = w.headX(t)
  const e = w.emerge(t)
  const sink = (1 - e) * (w.r * 2 + 4.6)
  const step = 0.6
  const n = Math.ceil(w.length / step)
  const base: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const s = i * step
    base.push([hx - s, -profile(w, s) + sink])
  }
  // The neck: from the bend forward, each step turned a little more up by the rear, the head curling over at the top.
  const phi = w.rear ? w.rear(t) : 0
  const curl = w.curl ? w.curl(t) : 0
  const k = Math.round(w.neck / step)
  const spine: Pt[] = base.map((p) => [p[0], p[1]])
  if (Math.abs(phi) > 1e-4) {
    let [px, py] = base[k]
    for (let i = k - 1; i >= 0; i--) {
      const u = (k - i) / k
      const dirBase = Math.atan2(base[i][1] - base[i + 1][1], base[i][0] - base[i + 1][0])
      const a = dirBase - phi * Math.pow(u, 0.45) + curl * Math.pow(u, 5)
      px += Math.cos(a) * step
      py += Math.sin(a) * step
      spine[i] = [px, py]
    }
  }
  const thick = w === LEAD ? rearing(t) : 0
  const radius = spine.map((_, i) => {
    const s = i * step
    // A blunt head, full through the body, narrowing a little toward the tail; the neck fuller when it rears.
    const neck = 1 + 0.16 * thick * (1 - smooth(s, w.neck - 4, w.neck + 6))
    return w.r * (0.82 + 0.18 * smooth(s, 0, 5) + 0.12 * thick * (1 - smooth(s, 0, 5))) * neck * (1 - 0.18 * smooth(s, w.seat + 12, w.length))
  })
  const headDir = Math.atan2(spine[0][1] - spine[2][1], spine[0][0] - spine[2][0])
  const side = (s: number, sign: 1 | -1, lift: number): Pt => {
    const i = Math.max(1, Math.min(n - 1, Math.round(s / step)))
    const [ax, ay] = spine[i - 1]
    const [bx, by] = spine[i + 1]
    let nx = by - ay
    let ny = -(bx - ax)
    const l = Math.hypot(nx, ny) || 1
    nx /= l
    ny /= l
    if (ny > 0) {
      nx = -nx
      ny = -ny
    }
    const r = radius[i] + lift
    return [spine[i][0] + sign * nx * r, spine[i][1] + sign * ny * r]
  }
  const body: WormBody = { spine, radius, headDir, backAt: (s, lift = 0) => side(s, 1, lift), bellyAt: (s) => side(s, -1, 0) }
  cache.set(w.name, { t, body })
  return body
}

/** The lead worm at `t`. */
export const leadWorm = (t: number): WormBody => wormAt(LEAD, t)
/** Where the lead worm's head is. */
export const headX = leadX
/** Whether a worm is drawn at all. */
export const wormOn = (w: WormSpec, t: number): boolean => w.emerge(t) > 0.002

/** The music's own end, for the ending's light. */
export const CHORD_DIES = M.end + 2
