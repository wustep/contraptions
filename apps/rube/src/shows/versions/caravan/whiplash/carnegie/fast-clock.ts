import { BUILD, KICKS, RUBATO, SNARES, level } from '../music'

/**
 * The build's clock (369.98 → 423.34): every moment of the engine, in show seconds, read from the recording's
 * measured strokes (`KICKS`, `SNARES`), so the drawing and the lane agree and a strike is where the music is by
 * construction.
 *
 * The engine: Andrew stomps a lever beside the snare (every stomp a kick); the lever's pushrod drives a flywheel
 * one turn a stomp; the flywheel's belt drives a camshaft over the snare, and its two sticks strike the head. Slow,
 * one stick plays, on the stomps. From the roll (383) the second stick drops in and the camshaft runs at the roll's
 * own pace, a stroke every 70 ms, too fast to count: a blur. Near the end the sticks let go, the head folds away,
 * and he rolls home to the snare, where the ride begins (423.34).
 */

type Stroke = { t: number; s: number }

/** The measured stroke of `list` nearest `t` (within 40 ms): a moment named by ear, pinned to the recording. */
function snap(list: readonly Stroke[], t: number): number {
  let best = list[0]
  for (const o of list) if (Math.abs(o.t - t) < Math.abs(best.t - t)) best = o
  if (Math.abs(best.t - t) > 0.04) throw new Error(`fast: no stroke near ${t}`)
  return best.t
}

/* ------------------------------------------------------------------ the moments */

/** He lands on the snare from the hush: the build's first stroke. */
export const LAND = BUILD
/** The engine rises out of the stage floor beside the snare. */
export const RISE: [number, number] = [BUILD + 0.06, BUILD + 1.75]
/** Two strokes on the snare while it rises; the second the loudest of the build's first bars. */
export const BOUNCE = snap(SNARES, 370.393)
export const SLAM = snap(SNARES, 371.763)
/** He rolls across to the lever, and hops onto it: the first stomp, a kick. */
export const GO = SLAM + 0.16
export const HOP = 372.52
export const FIRST = snap(KICKS, 372.866)
/** The head swings round from the post over the snare, and drops onto its seat: the first stick stroke. */
export const SWING: [number, number] = [373.55, 374.3]
export const LATCH = snap(KICKS, 374.666)
/** The spin-up's biggest stomp, the build's loudest kick. */
export const BIG = snap(KICKS, 377.487)
/** The roll: the second stick drops in and the camshaft runs at the roll's pace. */
export const SHIFT = snap(KICKS, 383.002)
/** The sticks let go; the head lifts and folds back to its post, and knocks home against it on the fill's accent. */
export const UNWIND = 421.72
export const FOLD: [number, number] = [421.95, snap(SNARES, 422.818)]
/** His last stomp, then home: he rolls back to the snare and settles there as the ride begins. */
export const LAST = snap(KICKS, 422.301)
export const HOME = RUBATO
/** The engine sinks back into the stage. */
export const SINK: [number, number] = [RUBATO + 0.25, RUBATO + 2.3]

/* ------------------------------------------------------------------ the stomps */

/**
 * How long the ball's stomp-hops are in the spin-up, as it gathers: about 0.55 s apart at the first stomp, 0.15 by
 * the roll (a curve the choice leans toward, not a grid: the stomps are the recording's kicks).
 */
const lean = (t: number): number => {
  const u = Math.max(0, Math.min(1, (t - FIRST) / (SHIFT - FIRST)))
  return 0.56 * Math.pow(0.15 / 0.56, Math.pow(u, 0.85))
}

/** A leg of stomps from `a` to `b` (both kept), through the kicks between, leaning toward `lean`'s spacing. */
function leg(a: number, b: number): number[] {
  const kicks = KICKS.filter((k) => k.s >= 0.4 && k.t > a + 0.1 && k.t < b - 0.1)
  const nodes: Stroke[] = [{ t: a, s: 1 }, ...kicks, { t: b, s: 1 }]
  const n = nodes.length
  const cost = new Array<number>(n).fill(Infinity)
  const from = new Array<number>(n).fill(-1)
  cost[0] = 0
  for (let j = 1; j < n; j++) {
    for (let i = 0; i < j; i++) {
      if (cost[i] === Infinity) continue
      const d = nodes[j].t - nodes[i].t
      if (d < 0.12 || d > 1.0) continue
      const want = lean(nodes[i].t)
      const miss = Math.log(d / want)
      const c = cost[i] + 3 * miss * miss - 0.35 * nodes[j].s
      if (c < cost[j]) {
        cost[j] = c
        from[j] = i
      }
    }
  }
  const out: number[] = []
  for (let j = n - 1; j >= 0; j = from[j]) {
    out.unshift(nodes[j].t)
    if (j === 0) break
  }
  return out
}

/** The roll's stomps: every kick, the weaker of two closer than 0.1 s dropped; a big kick gets a bigger stomp. */
function roll(a: number, b: number): number[] {
  const kicks = KICKS.filter((k) => k.s >= 0.38 && k.t > a + 0.09 && k.t <= b + 1e-6)
  const kept: Stroke[] = [{ t: a, s: 1 }]
  for (const k of kicks) {
    const last = kept[kept.length - 1]
    if (k.t - last.t >= 0.1) kept.push(k)
    else if (k.s > last.s && kept.length > 1) kept[kept.length - 1] = k
  }
  // Before a big kick (1.4 and up), the stomp before it goes, so he rises higher and comes down harder.
  for (let i = kept.length - 1; i >= 2; i--) {
    if (kept[i].s >= 1.4 && kept[i].t - kept[i - 2].t <= 0.42) kept.splice(i - 1, 1)
  }
  return kept.map((k) => k.t)
}

/** Every stomp: he lands on the lever, the lever drives the flywheel a turn, the kick sounds. */
export const STOMPS: readonly number[] = (() => {
  const a = leg(FIRST, LATCH)
  const b = leg(LATCH, SHIFT)
  const c = roll(SHIFT, LAST)
  return [...a, ...b.slice(1), ...c.slice(1)]
})()

/* ------------------------------------------------------------------ the flywheel: one turn a stomp */

/** Monotone cubic through knots (Fritsch-Carlson), with its slopes, so a phase through them never runs backwards. */
function pchip(xs: readonly number[], ys: readonly number[]): { at: (x: number) => number; slope: (x: number) => number; m: number[] } {
  const n = xs.length
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]))
  const m = new Array<number>(n).fill(0)
  m[0] = d[0]
  m[n - 1] = d[n - 2]
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) continue
    const h0 = xs[i] - xs[i - 1]
    const h1 = xs[i + 1] - xs[i]
    const w1 = 2 * h1 + h0
    const w2 = h1 + 2 * h0
    m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
  }
  const find = (x: number): number => {
    let lo = 0
    let hi = n - 2
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (xs[mid] <= x) lo = mid
      else hi = mid - 1
    }
    return lo
  }
  const at = (x: number): number => {
    if (x <= xs[0]) return ys[0]
    if (x >= xs[n - 1]) return ys[n - 1]
    const i = find(x)
    const h = xs[i + 1] - xs[i]
    const u = (x - xs[i]) / h
    const u2 = u * u
    const u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * h * m[i + 1]
  }
  const slope = (x: number): number => {
    if (x < xs[0] || x > xs[n - 1]) return 0
    const i = Math.min(find(x), n - 2)
    const h = xs[i + 1] - xs[i]
    const u = (x - xs[i]) / h
    return ((6 * u * u - 6 * u) * ys[i] + (3 * u * u - 4 * u + 1) * h * m[i] + (-6 * u * u + 6 * u) * ys[i + 1] + (3 * u * u - 2 * u) * h * m[i + 1]) / h
  }
  return { at, slope, m }
}

// The wheel starts from rest on the first stomp: a knot a moment before it at the same phase keeps its slope nil there.
const wheel = pchip([FIRST - 0.3, ...STOMPS], [0, ...STOMPS.map((_, i) => i)])
const TURNS = STOMPS.length - 1
/** How fast the wheel is turning as he leaves it (turns a second), and how long it takes to run down. */
const COAST_V = wheel.m[wheel.m.length - 1]
const COAST = 0.85

/** The flywheel's turns since the first stomp at show time `t`: whole at every stomp; coasting down after the last. */
export function turns(t: number): number {
  if (t <= LAST) return wheel.at(t)
  return TURNS + COAST_V * COAST * (1 - Math.exp(-(t - LAST) / COAST))
}

/** How fast the wheel turns at `t`, turns a second. */
export function spin(t: number): number {
  if (t <= LAST) return wheel.slope(t)
  return COAST_V * Math.exp(-(t - LAST) / COAST)
}

/* ------------------------------------------------------------------ the camshaft: the sticks */

/** The roll's pace, turns of the camshaft a second (two strokes a turn): 11 to 15 strokes a second, with the music. */
const rollPace = (t: number): number => 5.6 + 1.8 * level(t)

/**
 * The roll's accents: the snare's strongest strokes in it (0.6 and up, none closer than 0.12 s). A stick lands on
 * each (the camshaft's phase is fitted to them) and is thrown higher just before it, so the accent is a bigger stroke.
 */
export const ACCENTS: readonly { t: number; s: number }[] = (() => {
  const out: { t: number; s: number }[] = []
  for (const o of SNARES) {
    if (o.s < 0.6 || o.t <= SHIFT + 0.2 || o.t >= UNWIND - 0.05) continue
    if (out.length && o.t - out[out.length - 1].t < 0.12) continue
    out.push(o)
  }
  return out
})()

const STEP = 0.004
const CAM0 = SHIFT
const CAM1 = SINK[1] + 1
const camTable: Float64Array = (() => {
  const n = Math.ceil((CAM1 - CAM0) / STEP) + 1
  const raw = new Float64Array(n)
  const v0 = wheel.slope(SHIFT)
  raw[0] = wheel.at(SHIFT)
  const rate = (t: number): number => {
    // From the wheel's pace at the shift to the roll's over a third of a second, and after the unwind, braked to rest.
    const u = Math.max(0, Math.min(1, (t - SHIFT) / 0.35))
    const s = u * u * (3 - 2 * u)
    const r = v0 + (rollPace(t) - v0) * s
    return t < UNWIND ? r : r * Math.exp(-(t - UNWIND) / 0.22)
  }
  for (let i = 1; i < n; i++) {
    const t = CAM0 + i * STEP
    raw[i] = raw[i - 1] + ((rate(t - STEP) + rate(t)) / 2) * STEP
  }
  // Fitted to the accents: between two, the camshaft turns a whole number of half turns (a stroke each), its pace
  // stretched a little to make it so; at the shift it starts on a whole turn (the shift is a stomp's stroke).
  const rawAt = (t: number): number => {
    const i = (t - CAM0) / STEP
    const j = Math.max(0, Math.min(n - 2, Math.floor(i)))
    return raw[j] + (raw[j + 1] - raw[j]) * Math.min(1, i - j)
  }
  const knots = [SHIFT, ...ACCENTS.map((a) => a.t)]
  const out = new Float64Array(n)
  let k = 0
  let base = raw[0]
  let from = raw[0]
  let scale = 1
  const next = (): void => {
    if (k >= knots.length - 1) {
      scale = 1
      return
    }
    const d = rawAt(knots[k + 1]) - rawAt(knots[k])
    const halves = Math.max(1, Math.round(2 * d))
    scale = halves / 2 / d
  }
  next()
  for (let i = 0; i < n; i++) {
    const t = CAM0 + i * STEP
    while (k < knots.length - 1 && t >= knots[k + 1]) {
      base = base + (rawAt(knots[k + 1]) - from) * scale
      from = rawAt(knots[k + 1])
      base = Math.round(base * 2) / 2
      k++
      next()
    }
    out[i] = base + (raw[i] - from) * scale
  }
  return out
})()

/** The camshaft's turns at `t`: the wheel's own until the shift (one stroke a stomp), the roll's after it. */
export function cams(t: number): number {
  if (t <= CAM0) return t < FIRST ? 0 : wheel.at(t)
  const i = (t - CAM0) / STEP
  const j = Math.min(camTable.length - 2, Math.floor(i))
  const f = Math.min(1, i - j)
  return camTable[j] + (camTable[j + 1] - camTable[j]) * f
}

/**
 * Every stroke of the sticks in the roll, as the camshaft has them (a half turn each; `left` on the whole turns):
 * what the sweat flies from. Show seconds.
 */
export const CONTACTS: readonly { t: number; left: boolean }[] = (() => {
  const out: { t: number; left: boolean }[] = []
  let prev = cams(SHIFT + 0.13)
  for (let t = SHIFT + 0.13 + STEP; t < UNWIND; t += STEP) {
    const now = cams(t)
    const k = Math.floor(prev * 2 + 1e-9)
    if (Math.floor(now * 2 + 1e-9) > k) out.push({ t: t - (STEP * (now * 2 - Math.floor(now * 2))) / Math.max(1e-6, now * 2 - prev * 2), left: (k + 1) % 2 === 0 })
    prev = now
  }
  return out
})()

const clamp01 = (u: number): number => Math.max(0, Math.min(1, u))
const ease = (u: number): number => {
  const v = clamp01(u)
  return v * v * (3 - 2 * v)
}

/** A stick's bounce off the head over one turn of its cam: 0 on the head, 1 at the top; sharp at the head, slow at the top. */
const bounce = (u: number): number => {
  const f = u - Math.floor(u)
  return 4 * f * (1 - f)
}

/** How high a stick's cam throws it, cells at the tip: big and slow in the spin-up, low and fast in the roll, higher before an accent. */
function throwAt(t: number): number {
  const slow = 0.3
  const fast = 0.1 + 0.05 * level(t)
  let lift = 0
  for (const a of ACCENTS) {
    const x = t - (a.t - 0.07)
    if (x < -0.2) break
    if (x > 0.2) continue
    lift += 0.075 * Math.min(1.5, a.s) * Math.exp(-(x * x) / (2 * 0.045 * 0.045))
  }
  return slow + (fast - slow) * ease((t - SHIFT) / 0.3) + lift
}

/** How far a stick is held up off its cam at `t`, cells at the tip: the right one until the roll; both after the unwind. */
const HELD = 0.34
function heldAt(t: number, right: boolean): number {
  const off = HELD * ease((t - UNWIND) / 0.28)
  if (!right) return off
  return Math.max(off, HELD * (1 - ease((t - SHIFT) / 0.12)))
}

/**
 * How high each stick's tip is over the drumhead at `t`, in cells, as its own cam and hold have it (the head's
 * swing and drop are the head's pose, not this): 0 is a stroke.
 */
export function sticks(t: number): { left: number; right: number } {
  const psi = cams(t)
  const amp = throwAt(t) * (1 - ease((t - UNWIND) / 0.3))
  // The right stick is held clear of its cam until the roll, and then drops onto it.
  const rightOn = ease((t - SHIFT) / 0.12)
  return {
    left: heldAt(t, false) + amp * bounce(psi),
    right: heldAt(t, true) + amp * rightOn * bounce(psi + 0.5),
  }
}

/** How fast the sticks go at `t`, strokes a second: what the drawing blurs by. */
export function strokeRate(t: number): number {
  if (t < FIRST) return 0
  if (t <= SHIFT) return spin(t)
  const i = Math.max(0, Math.min(camTable.length - 2, Math.floor((t - CAM0) / STEP)))
  return 2 * Math.max(0, (camTable[i + 1] - camTable[i]) / STEP)
}

/* ------------------------------------------------------------------ the head: swing, drop, fold */

/**
 * The head's pose at `t`: `yaw` 1 is folded edge-on at its post, 0 swung round over the snare; `lift` is how far
 * its arm is raised up the post, cells (0 on its seat, where the sticks reach the head).
 */
export function head(t: number): { yaw: number; lift: number } {
  const RAISED = 0.45
  // In: swing round at the raised height, then drop onto the seat on the latch.
  let yaw = 1 - ease((t - SWING[0]) / (SWING[1] - SWING[0]))
  let lift = RAISED * (1 - dropIn(t))
  // Out: lift, then fold back.
  if (t > FOLD[0]) {
    const u = (t - FOLD[0]) / (FOLD[1] - FOLD[0])
    lift = RAISED * ease(u / 0.4)
    // Faster and faster round to the post, and a knock against its stop, rocking back a little and settling.
    const v = clamp01((u - 0.2) / 0.8)
    const x = t - FOLD[1]
    yaw = x < 0 ? v * v : 1 - 0.07 * Math.exp(-x / 0.13) * Math.abs(Math.sin(x * 21))
  }
  return { yaw, lift }
}
/** The drop onto the seat: slow at first, arriving on the latch with the stroke. */
function dropIn(t: number): number {
  const a = SWING[1] - 0.05
  if (t <= a) return 0
  if (t >= LATCH) return 1
  const u = (t - a) / (LATCH - a)
  return u * u
}

/* ------------------------------------------------------------------ the rise and the sink */

/** How far below its place the engine is, cells: all of it under the stage before the rise and after the sink. */
export function sunk(t: number): number {
  const DEPTH = 4.2
  if (t < SINK[0]) return DEPTH * (1 - rise(t))
  return DEPTH * ease((t - SINK[0]) / (SINK[1] - SINK[0]))
}
/** The rise: slow off the bottom, a long slow settle into place. */
function rise(t: number): number {
  const u = clamp01((t - RISE[0]) / (RISE[1] - RISE[0]))
  return 1 - Math.pow(1 - u * u * (3 - 2 * u), 1.6)
}

/* ------------------------------------------------------------------ the lever */

/** The height of the ball's stomp-hop over a gap of `gap` seconds (a long gap is a rest, then a hop of `HOP_MAX`). */
export const HOP_MAX = 0.42
export function hopHeight(gap: number): number {
  const d = Math.min(gap, HOP_MAX)
  const g = d <= 0.2 ? 26 : 26 - (14 * (d - 0.2)) / (HOP_MAX - 0.2)
  return Math.min(0.3, (g * d * d) / 8)
}

/** How deep a stomp presses the lever, cells at the ball: more after a bigger hop. */
export const PRESS: readonly number[] = STOMPS.map((s, i) => {
  const gap = i ? s - STOMPS[i - 1] : 0.35
  return 0.025 + 0.12 * Math.min(0.3, hopHeight(gap))
})

/** The take-offs after a rest on the lever long enough to crouch in: he crouches into it before each, and springs. */
const TAKEOFFS: readonly { t: number; w: number }[] = STOMPS.flatMap((s, i) => {
  if (!i) return []
  const rest = s - STOMPS[i - 1] - HOP_MAX
  return rest >= 0.12 ? [{ t: s - HOP_MAX, w: Math.min(0.16, rest - 0.06) }] : []
})
const CROUCH = 0.04

/** How far the lever is pressed below its rest at the ball at `t`, cells: each stomp a quick press and a damped return; a crouch before a take-off. */
export function pressAt(t: number): number {
  let out = 0
  for (let i = STOMPS.length - 1; i >= 0; i--) {
    const x = t - STOMPS[i]
    if (x < 0) continue
    if (x > 0.6) break
    out += PRESS[i] * (1 - Math.exp(-x / 0.012)) * Math.exp(-x / 0.075)
  }
  for (const tk of TAKEOFFS) {
    const x = t - tk.t
    if (x < -tk.w || x > 0.4) continue
    out += x < 0 ? CROUCH * ease((x + tk.w) / tk.w) : CROUCH * Math.exp(-x / 0.05) * Math.cos(x * 30)
  }
  return out
}
