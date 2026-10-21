import { beat, M, strongest } from '../../music'
import { T, END } from '../../timeline'
import { clamp01, lerp, smooth, smoother, type Pt } from '../../paint'

/**
 * The charge's plan: when everything happens, on the `charge` comb (0.587 s quickening to 0.551 s), and where.
 *
 * The place is the basin before Arrakeen, x about 9000, the flat at y = 0. The storm comes from the west (left); the
 * Emperor's camp stands to the east of the basin: three ranks of Sardaukar in front, two small ships among them, and the
 * great ovoid ship behind. The worms come out of the storm's foot and run east; the lead worm, with Paul and Chani on
 * its back, goes through the first rank and the first ship, then on to the Emperor's ship, rears over it on the peak and
 * brings it down. Two more worms run in further back (smaller, drawn in layers behind the action's plane).
 */

/** The comb's beats this plan turns on. */
export const B = {
  first: beat('charge', 0),
  w2: beat('charge', 11),
  w3: beat('charge', 13),
  cutTrack: beat('charge', 15),
  rankA: beat('charge', 18),
  ship1: beat('charge', 19),
  ship1Down: beat('charge', 22),
  cutWide: beat('charge', 26),
  peak: beat('charge', 42),
  crash: beat('charge', 49),
  ship1Bump: beat('charge', 52),
  ground: beat('charge', 54),
  cutClose: beat('charge', 56),
  off: beat('charge', 69),
  dive: beat('charge', 73),
  dive2: beat('charge', 76),
  last: beat('charge', 84),
} as const

/** The lead worm comes out of the storm's skirt on this onset: up to it, it runs inside the dust. */
export const BREACH = strongest(266.2, 266.6)
/** Worm 2 knocks the second ship down on this onset; its fall lands on the next. */
export const SHIP2_HIT = strongest(280.3, 280.7)

export const FROM = T.charge
export const TO = END

/** Where the storm's front is, at the foot (world x in its layer, as if in the action's plane). */
export const stormFront = (t: number): number => {
  const on = 8932 + 1.1 * (Math.min(t, 312) - FROM)
  // After the music the storm goes on east, over the camp and away, thinning.
  return on
}
/** How much of the storm is left, 1 in the charge, going as the evening comes. */
export const stormLeft = (t: number): number => 1 - smoother(t, 309, 324)

/* ---------------------------------------------------------------- the ground */

/** The rise Paul stands on at the end, between the ranks and the great ship. */
export const RISE = { x: 9090, h: 1.9, w: 8.5 }

/** The basin's surface in the action's plane: the flat, and the rise. */
export function ground(x: number): number {
  const d = (x - RISE.x) / RISE.w
  if (Math.abs(d) >= 1) return 0
  const u = 1 - d * d
  return -RISE.h * u * u
}

/* ---------------------------------------------------------------- the camp */

/** The ranks in the action's plane: [x0, x1]. */
export const RANKS: [number, number][] = [
  [9030, 9047],
  [9055, 9071],
]
/** The first small ship: it stands just behind the first rank; the lead worm takes its legs. */
export const SHIP1 = { x: 9046, h: 11, w: 3.6 }
/** The Emperor's ship: an upright ovoid on short legs. */
export const EMPEROR = { x: 9122, w: 12, h: 15, legs: 1.8 }

/* ---------------------------------------------------------------- the lead worm */

/** The ridden worm's radius, cells. */
export const WR = 3.7
/** How far behind the head its neck bends when it rears. */
export const NECK = 28
/** How far behind the head the riders sit, and how far its body runs above the sand. */
export const SEAT = 33
export const LENGTH = 74

const keysX: [number, number][] = [
  [FROM, 8922],
  [BREACH, 8958],
  [B.rankA, 9034],
  [B.ship1, 9041],
  [B.cutWide, 9068],
  [B.peak - 2.5, 9096],
  [B.peak, 9104],
  [B.crash, 9116],
  [B.ground, 9118],
  [B.cutClose + 1, 9118.5],
]

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

/** Where the lead worm's head is along the flat. */
export const headX = curveOf(keysX)

/**
 * How far out of the sand the lead worm is, 0 (under) to 1: it rides high through the charge (it comes out of the storm
 * already up, its riders on its back), lowers its riders to the sand after the crash, and goes down for good on the dive.
 */
export function emerge(t: number): number {
  const up = 1
  const lower = 0.5 * smoother(t, B.cutClose + 0.6, B.off - 0.15)
  const down = 0.5 * smoother(t, B.dive, B.dive + 4.2)
  return Math.max(0, up - lower - down)
}

/**
 * The neck's bend, radians up from the body's line: nothing until the peak, then up over the ship, a sway at the top,
 * and down onto it on the crash, settling into the wreck.
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
  // On the strike, the head against the ship's flank; as the ship goes over, down after it into the sand; then still.
  const after = lerp(0.24, -0.16, smoother(t, B.crash + 0.25, B.ground + 0.3))
  return after + 0.05 * Math.sin((t - B.crash) * 9) * Math.exp(-(t - B.crash) / 0.35)
}

/** How far the head curls forward over the top of the rear, so its mouth faces down onto the ship. */
export const rearCurl = (t: number): number => 1.5 * smooth(t, B.peak + 0.5, B.peak + 2.2) * (1 - 0.83 * smooth(t, B.crash - 0.6, B.crash))

/** How open its mouth is: shut while it runs, open as it rears, shut again in the wreck. */
export const mouthOpen = (t: number): number => smooth(t, B.peak + 0.2, B.peak + 1.3) * (1 - smooth(t, B.crash + 0.6, B.crash + 2.2))

/** The body's height over the flat at `s` cells behind the head, at full emergence: the spine's centre. */
function profile(s: number): number {
  // From the head, just out of the sand, up to the hump over the seat, then down under the sand behind.
  if (s <= SEAT) return lerp(WR * 0.25, WR + 2.2, smoother(s, 0, SEAT - 6))
  if (s <= SEAT + 9) return WR + 2.2
  return lerp(WR + 2.2, -WR * 1.4, smoother(s, SEAT + 9, LENGTH))
}

export interface WormBody {
  spine: Pt[]
  radius: number[]
  /** The spine's direction at the head, radians (0 east, negative up). */
  headDir: number
  /** Where the body's back is at `s` behind the head (a rider's seat), cells. */
  backAt(s: number, lift?: number): Pt
}

let cached: { t: number; body: WormBody } | null = null

/** The lead worm at `t`: its spine head first, its radius, and its back. */
export function leadWorm(t: number): WormBody {
  if (cached && cached.t === t) return cached.body
  const hx = headX(t)
  const e = emerge(t)
  const sink = (1 - e) * (WR * 2 + 4.6)
  const step = 0.6
  const n = Math.ceil(LENGTH / step)
  const base: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const s = i * step
    base.push([hx - s, -profile(s) + sink])
  }
  // The neck: from the bend NECK behind the head forward, each step turned a little more up, by the rear.
  const phi = rear(t)
  const curl = rearCurl(t)
  const k = Math.round(NECK / step)
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
  const radius = spine.map((_, i) => {
    const s = i * step
    // A blunt head, full through the body, narrowing a little toward the tail.
    return WR * (0.82 + 0.18 * smooth(s, 0, 5)) * (1 - 0.18 * smooth(s, SEAT + 12, LENGTH))
  })
  const headDir = Math.atan2(spine[0][1] - spine[2][1], spine[0][0] - spine[2][0])
  const backAt = (s: number, lift = 0): Pt => {
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
    return [spine[i][0] + nx * r, spine[i][1] + ny * r]
  }
  const body = { spine, radius, headDir, backAt }
  cached = { t, body }
  return body
}

/** Whether the lead worm is drawn at all. */
export const leadOn = (t: number): boolean => emerge(t) > 0.002

/** The music's own end, for the ending's light. */
export const CHORD_DIES = M.end + 2
