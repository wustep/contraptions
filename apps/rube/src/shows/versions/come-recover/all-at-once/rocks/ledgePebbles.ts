import { fall } from '../music'
import { G } from '../physics'
import { groundAt, LIP, PEBBLE_AT, TOP, type Ledge, type Plan } from './ledgePath'

/**
 * The three pebbles that go off the lip before anything else moves: the wind brings each to the edge, it tips, and
 * it drops on its note. The first two are grit, and lie where they land on the talus far below. The third is a real
 * stone: it hits the talus on the beat, runs down it, goes off the next cliff, ticks on the ledge under it on the
 * soft note at 205.36, and runs on down the wall out of sight. It goes the way the rocks will go.
 */

export interface Pebble {
  /** Where it sits on the rim, its size, when it goes over, a seed for its shape. */
  x: number
  r: number
  at: number
  seed: number
  /** The big one: its landings are on beats, and it bounds on out into the canyon. */
  big: boolean
}

export const PEBBLES: Pebble[] = [
  { x: LIP - 0.012, r: 0.026, at: PEBBLE_AT[0], seed: 1, big: false },
  { x: LIP - 0.13, r: 0.034, at: PEBBLE_AT[1], seed: 2, big: false },
  { x: LIP - 0.3, r: 0.062, at: PEBBLE_AT[2], seed: 3, big: true },
]
/** The big one's two landings, on the beat after it drops and on the soft note after that. */
export const PEBBLE_LANDS = [fall(10.5), fall(13)]

const DT = 1 / 240
const TIP = 0.22

export interface PebbleWay {
  pb: Pebble
  /** Sampled from the drop on. */
  xs: Float32Array
  ys: Float32Array
  as: Float32Array
  /** Where it drops from, and when it has gone out of the world for good. */
  gone: number
  lands: { t: number; x: number; y: number }[]
}

/** Where it rests on the rim, and the corner it tips over. */
const restY = (pb: Pebble) => TOP - pb.r * 0.72
const edgeX = (pb: Pebble) => LIP - pb.r * 0.4
/** How long the wind takes to bring it to the edge. */
const moveTime = (pb: Pebble) => {
  const d = Math.max(0, edgeX(pb) - pb.x)
  return d > 0.01 ? 0.55 + d * 2 : 0
}

/** The tip: turned about the lip's corner by `phi`. */
function tipped(pb: Pebble, phi: number): { x: number; y: number } {
  const dx = edgeX(pb) - LIP
  const dy = restY(pb) - TOP
  return { x: LIP + dx * Math.cos(phi) - dy * Math.sin(phi), y: TOP + dx * Math.sin(phi) + dy * Math.cos(phi) }
}
const TIP_TO = 1.0

interface Sim {
  xs: number[]
  ys: number[]
  as: number[]
  lands: { t: number; x: number; y: number }[]
}

/**
 * Run a pebble from its drop: in the air under gravity, and on landing, `onLand` says what it does (roll at a speed
 * along the ledge, or bound off). On a ledge it rolls with gravity along the slope and drag against it, and off
 * the ledge's end into the air.
 */
function simulate(pb: Pebble, ledges: Ledge[], v0: [number, number], until: number, onLand: (n: number, l: Ledge, v: [number, number]) => { roll: number } | { bound: [number, number] } | 'rest'): Sim {
  const start = tipped(pb, TIP_TO)
  let x = start.x
  let y = start.y
  let [vx, vy] = v0
  let a = TIP_TO
  let on: Ledge | null = null
  let u = 0
  const out: Sim = { xs: [], ys: [], as: [], lands: [] }
  const drag = pb.big ? 0.5 : 2.6
  for (let t = 0; t <= until; t += DT) {
    out.xs.push(x)
    out.ys.push(y)
    out.as.push(a)
    if (on) {
      const dx = on.b[0] - on.a[0]
      const dy = on.b[1] - on.a[1]
      const d = Math.hypot(dx, dy)
      const sin = dy / d
      const acc = (5 / 7) * G * sin - drag * Math.sign(u || 1)
      const u1 = u + acc * DT
      u = u > 0 && u1 < 0 ? 0 : u1
      if (u <= 0 && acc <= 0) u = 0
      x += (u * dx * DT) / d
      y += (u * dy * DT) / d
      a += (u * DT) / pb.r
      if (x > on.b[0]) {
        vx = (u * dx) / d
        vy = (u * dy) / d
        on = null
      }
      continue
    }
    vy += G * DT
    const nx = x + vx * DT
    const ny = y + vy * DT
    a += DT * 9
    for (const l of ledges) {
      if (nx < l.a[0] || nx > l.b[0]) continue
      const g = groundAt(l, nx) - pb.r * 0.8
      if (y <= groundAt(l, x) - pb.r * 0.8 + 1e-6 && ny >= g) {
        out.lands.push({ t: t + DT, x: nx, y: g })
        const what = onLand(out.lands.length - 1, l, [vx, vy])
        if (what === 'rest') {
          on = l
          u = 0.3
        } else if ('roll' in what) {
          on = l
          u = what.roll
        } else {
          ;[vx, vy] = what.bound
        }
        x = nx
        y = g
        break
      }
    }
    if (on) continue
    x = nx
    y = ny
  }
  return out
}

/** Bisect `f` (increasing or decreasing) for f(v) = 0 on [lo, hi]. */
function solve(f: (v: number) => number, lo: number, hi: number): number {
  let flo = f(lo)
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    const fm = f(mid)
    if (Math.sign(fm) === Math.sign(flo)) {
      lo = mid
      flo = fm
    } else hi = mid
  }
  return (lo + hi) / 2
}

export function pebbleWays(plan: Plan): PebbleWay[] {
  const ledges = plan.ledges.slice(1, 4)
  return PEBBLES.map((pb) => {
    const vx = 0.25 + 0.08 * pb.seed
    let sim: Sim
    if (!pb.big) {
      sim = simulate(pb, ledges, [vx, 0.2], 6, () => ({ roll: 0.5 }))
    } else {
      // Its first landing on the beat after the drop: how hard it is let go downward.
      const firstAt = PEBBLE_LANDS[0] - pb.at
      const vy = solve((v) => {
        const s = simulate(pb, ledges, [vx, v], firstAt + 0.3, () => 'rest')
        return (s.lands[0]?.t ?? 99) - firstAt
      }, -1.5, 3)
      // Its second on the soft note: how fast it runs down the talus.
      const secondAt = PEBBLE_LANDS[1] - pb.at
      const run = solve((u) => {
        const s = simulate(pb, ledges, [vx, vy], secondAt + 0.5, (n) => ({ roll: n === 0 ? u : 1.1 }))
        return (s.lands[1]?.t ?? 99) - secondAt
      }, 0.05, 4)
      sim = simulate(pb, ledges, [vx, vy], 8, (n) => ({ roll: n === 0 ? run : 1.1 }))
    }
    // The big one is let go of once it is off the last of these ledges, over the long drop, long out of the frame.
    const over = sim.xs.findIndex((x) => x > ledges[ledges.length - 1].b[0] + 0.3)
    const gone = pb.big && over > 0 ? pb.at + over * DT : Infinity
    return {
      pb,
      xs: Float32Array.from(sim.xs),
      ys: Float32Array.from(sim.ys),
      as: Float32Array.from(sim.as),
      gone,
      lands: sim.lands.map((l) => ({ ...l, t: l.t + pb.at })),
    }
  })
}

/** A pebble at show time `t`: where it is, and how far it has turned; null once it has gone for good. */
export function pebbleAt(w: PebbleWay, t: number): { x: number; y: number; a: number } | null {
  const { pb } = w
  const tm = moveTime(pb)
  const t0 = pb.at - TIP - tm
  const rest = restY(pb)
  if (t < t0) return { x: pb.x, y: rest, a: 0 }
  if (t < pb.at - TIP) {
    // The wind worries it along to the edge, tumbling.
    const u = (t - t0) / tm
    const e = u * u * (3 - 2 * u)
    const x = pb.x + (edgeX(pb) - pb.x) * e
    return { x, y: rest - 0.012 * Math.sin(Math.PI * u), a: (x - pb.x) / pb.r }
  }
  const base = (edgeX(pb) - pb.x) / pb.r
  if (t < pb.at) {
    // It tips over the corner, slowly and then not.
    const u = (t - (pb.at - TIP)) / TIP
    const phi = TIP_TO * u * u
    const p = tipped(pb, phi)
    return { x: p.x, y: p.y, a: base + phi }
  }
  if (t >= w.gone) return null
  const i = (t - pb.at) / DT
  const j = Math.min(w.xs.length - 1, Math.floor(i))
  const k = Math.min(w.xs.length - 1, j + 1)
  const f = i - j
  return { x: w.xs[j] + (w.xs[k] - w.xs[j]) * f, y: w.ys[j] + (w.ys[k] - w.ys[j]) * f, a: base + w.as[j] + (w.as[k] - w.as[j]) * f }
}
