import type p5 from 'p5'
import { outline, solid } from '../../../../../../../src/core/draw'
import { clamp, easeInOutSine, easeOutCubic } from '../../../../../../../src/core/ease'
import { FLOOR, laneAt, puff, type Lane, type Pt } from '../../../../parts'
import { alpha, box, carried, frame, hash, part, smooth, type Ctx } from './kit'
import { beat, IGNITION } from './music'
import { DUST } from './worlds'

/**
 * The rocket: the only door between the two worlds.
 *
 * It stands on the pad beside the gantry the whole show, drawn with the
 * farm's ink, and the ball goes into the round window in its nose while the
 * lamps count down. Beat 134, when the organ's pedal comes in under
 * everything: the engines light and the trench fills with smoke. Beat 136,
 * the downbeat: it lets go of the pad and climbs, slowly, then not slowly.
 * On beat 142 it goes into the cloud — and comes out of the top of it in the
 * other universe, in the other ink, the frame white for a moment between.
 * Beat 144: the first stage lets go and falls away; 145: the second lights.
 * It leans over into orbit, and on 147 the nose opens like a seed and the
 * ball floats out.
 *
 * Two ride it. The window is wide, a seat either side of the axis: his on
 * the right, and on the left Brand, who came up the gantry with
 * him. When the nose opens he floats straight out; she stays sitting on
 * the spent stage for an eighth, lets go, and drifts after him.
 *
 * The part's frame: the ball in the window is (-0.5, 0) at ignition, and
 * she is at (-0.77, 0). The rocket's own frame (its "body") has its base
 * at (0, 0) and its axis up; the window's middle is at (0, -WINDOW), his
 * seat SEAT_X to the right of it and hers SEAT_X to the left.
 */

export const WINDOW = 7.3
/** The two seats, either side of the axis. */
const SEAT_X = 0.135
/** Where the base of the rocket stands on the pad, in the part's frame: the axis between the two seats. */
const BASE: Pt = [-0.5 - SEAT_X, WINDOW]
const S1_TOP = 4.4
const S2_TOP = 6.3
/** The fairing: it flares out from the second stage to a wide drum with the window in it, and closes to a point. */
const FAIR0 = 6.6
const FAIR1 = 7.72
const NOSE = 8.55
const W1 = 0.74
const W2 = 0.6
const WF = 0.94
/** The window: a slot with round ends, wide enough for two. Half its straight length, and its ends' radius. */
const WIN_L = 0.165
const WIN_R = 0.18

export const LIFTOFF = beat(136)
/** Inside the cloud: the stage changes universe here. */
export const PUNCH = beat(142)
export const STAGING = beat(144)
export const SECOND = beat(145)
export const OPEN = beat(147)
export const RELEASE = beat(148)
/** Where the first stage's burn starts to lean the rocket over, and where it is flat. */
const TURN0 = beat(141)
const TURN1 = beat(147)

/** The engine surges on every beat of the climb the music has no other event on: a bright pulse through the flame. */
const SURGES = [135, 137, 138, 139, 140, 141, 143, 146].map(beat)
export const ROCKET_HITS = [IGNITION, LIFTOFF, PUNCH, STAGING, SECOND, OPEN, ...SURGES].sort((a, b) => a - b)

/**
 * How far it has flown, `s` seconds after liftoff: it lets go gently, and
 * the first stage burns harder and harder; after staging the second stage
 * only has to hold it, and the frame settles to the pace of an orbit (what
 * the ball is let go at).
 */
const BURN = STAGING - LIFTOFF
const COAST = 1.4
const SETTLE = 0.6
const burnLen = (s: number): number => 0.42 * s * s + 0.075 * s * s * s
const burnRate = (s: number): number => 0.84 * s + 0.225 * s * s
/** After the nose opens the spent stage drops back from the ball it let go: it slows to a drift. */
const SPENT = 0.25
const FALLBACK = 0.5
function travelled(s: number): number {
  if (s <= 0) return 0
  if (s <= BURN) return burnLen(s)
  const x = s - BURN
  let d = burnLen(BURN) + COAST * x + (burnRate(BURN) - COAST) * SETTLE * (1 - Math.exp(-x / SETTLE))
  const after = s - (OPEN - LIFTOFF)
  if (after > 0) d -= (COAST - SPENT) * (after - FALLBACK * (1 - Math.exp(-after / FALLBACK)))
  return d
}

/** How far over it leans, 0 upright to π/2 flat, at show time `t`. */
const lean = (t: number): number => (Math.PI / 2) * 0.92 * easeInOutSine(clamp((t - TURN0) / (TURN1 - TURN0)))

/**
 * Where the rocket is: its base in the part's frame, and its lean. Integrated
 * from the climb rate along the lean, so a rocket leaning over goes on
 * forward as fast as it was going up.
 */
function flightAt(t: number): { base: Pt; lean: number } {
  if (t <= LIFTOFF) return { base: BASE, lean: 0 }
  const n = Math.max(1, Math.ceil((t - LIFTOFF) * 30))
  const dt = (t - LIFTOFF) / n
  let x = BASE[0]
  let y = BASE[1]
  let prev = 0
  for (let i = 1; i <= n; i++) {
    const s = i * dt
    const h = travelled(s)
    const d = h - prev
    prev = h
    const a = lean(LIFTOFF + s - dt / 2)
    x += Math.sin(a) * d
    y -= Math.cos(a) * d
  }
  return { base: [x, y], lean: lean(t) }
}

const cache = new Map<number, { base: Pt; lean: number }>()
/** The flight at a 240th of a second, cached. */
function flightKey(key: number): { base: Pt; lean: number } {
  let v = cache.get(key)
  if (!v) {
    v = flightAt(key / 240)
    if (cache.size > 20000) cache.clear()
    cache.set(key, v)
  }
  return v
}
/** The flight at show time `t`, between the two nearest cached keys, so a thing riding it moves smoothly. */
function flight(t: number): { base: Pt; lean: number } {
  const f = t * 240
  const k0 = Math.floor(f)
  const u = f - k0
  const a = flightKey(k0)
  if (u < 1e-9) return a
  const b = flightKey(k0 + 1)
  return { base: [a.base[0] + (b.base[0] - a.base[0]) * u, a.base[1] + (b.base[1] - a.base[1]) * u], lean: a.lean + (b.lean - a.lean) * u }
}
/** A point of the body as the rocket's first cut had it (the flight at the nearest key): what the seams are measured from. */
function bodyAtKey(t: number, x: number, y: number): Pt {
  const { base, lean: a } = flightKey(Math.round(t * 240))
  const bx = x + shakeAt(t)
  return [base[0] + bx * Math.cos(a) + y * Math.sin(a), base[1] + bx * Math.sin(a) - y * Math.cos(a)]
}

/** A point of the rocket's body (x across, y up from the base) in the part's frame, at show time `t`, with its shake. */
function body(t: number, x: number, y: number, shake = true): Pt {
  const { base, lean: a } = flight(t)
  const s = shake ? shakeAt(t) : 0
  const bx = x + s
  return [base[0] + bx * Math.cos(a) + y * Math.sin(a), base[1] + bx * Math.sin(a) - y * Math.cos(a)]
}

/** The engines' shake: nothing on the pad, hard at ignition and as it lets go, less as it climbs. */
function shakeAt(t: number): number {
  if (t < IGNITION) return 0
  const hard = 0.018 * (0.6 + 0.4 * smooth(t, IGNITION, LIFTOFF)) * (1 - 0.7 * smooth(t, LIFTOFF + 1, LIFTOFF + 4))
  return hard * Math.sin(t * 97) * Math.sin(t * 31 + 1)
}

/** Where the ball is while it rides in the window: his seat. */
export const windowAt = (t: number): Pt => body(t, SEAT_X, WINDOW)
/** Her seat from his: across the window, turning as the rocket leans over. */
const seatGap = (t: number): Pt => {
  const a = lean(t)
  return [-2 * SEAT_X * Math.cos(a), -2 * SEAT_X * Math.sin(a)]
}

/** The ball's way out: from the window's middle, forward and a little up, going about 1.4 cells a second as it leaves. */
const EXIT: Pt = (() => {
  const mid = bodyAtKey(OPEN, 0, WINDOW)
  return [mid[0] + SEAT_X + 1.3, mid[1] - 0.25]
})()

/** Where the ball is after the nose opens: it floats out ahead of the rocket, and away. */
function floatAt(t: number, exit: Pt): Pt {
  const from = windowAt(OPEN)
  const u = clamp((t - OPEN) / (RELEASE - OPEN))
  // Eased out of the window, then going at the pace the ring's builder was promised: straight out along the
  // axis first, clear of her, and up to the line of the drift after, arriving level.
  const e = u * u * (3 - 2 * u) * 0.35 + u * 0.65
  const rise = u * u * u * (10 - 15 * u + 6 * u * u)
  return [from[0] + (exit[0] - from[0]) * e, from[1] + (exit[1] - from[1]) * rise]
}


/* ------------------------------------------------------------------ her, after the nose opens */

/** The beacon on the ring's driver blinks on these; she answers each with a stroke that brings her up beside him. */
const CALLS = [149, 150, 151, 152].map(beat)
/** Her offset from him as the nose opens (her seat from his), and how it goes on: she drifts out after him, up a little, and falls back. */
const OUT0: Pt = [-2 * SEAT_X * Math.cos(lean(OPEN)), -2 * SEAT_X * Math.sin(lean(OPEN))]
/** How she is moving in her seat, from him, as the nose opens (the lean still turning): she drifts out from that, no kick. */
const SEAT_V: Pt = (() => {
  const a = seatGap(OPEN - 0.002)
  const b = seatGap(OPEN)
  return [(b[0] - a[0]) / 0.002, (b[1] - a[1]) / 0.002]
})()
const LAGGING: Pt = [-0.62, -0.4]
const LAGGING_V: Pt = [-0.45, 0.12]
/** As far back as she drifts before the first blink, from him. */
const FARTHEST: Pt = [-0.92, -0.24]

const lerp2 = (a: Pt, b: Pt, u: number): Pt => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]
/** A cubic Hermite from (p0, m0) to (p1, m1) over h seconds, at 0..1. */
function hermite(p0: Pt, m0: Pt, p1: Pt, m1: Pt, h: number, u: number): Pt {
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1
  const h10 = u ** 3 - 2 * u ** 2 + u
  const h01 = -2 * u ** 3 + 3 * u ** 2
  const h11 = u ** 3 - u ** 2
  return [h00 * p0[0] + h10 * h * m0[0] + h01 * p1[0] + h11 * h * m1[0], h00 * p0[1] + h10 * h * m0[1] + h01 * p1[1] + h11 * h * m1[1]]
}

/** A stroke, 0..1 over a beat: it builds from nothing on the beat, is quickest a third of the way in, and fades to nothing. */
const stroke = (u: number): number => 1 - (1 - u) ** 3 * (1 + 3 * u)

/**
 * Brand's offset from him from the nose opening until the cradle takes them
 * both (beat 152), where she is at `cradle` from him. She drifts out a step
 * behind him and falls back; then each blink of the beacon is a stroke: a
 * surge that builds from the beat and fades by the next, less each time,
 * until she is at his back as the cradle closes.
 */
export function brandDrift(t: number, cradle: Pt = [0, 0]): Pt {
  if (t <= RELEASE) return hermite(OUT0, SEAT_V, LAGGING, LAGGING_V, RELEASE - OPEN, clamp((t - OPEN) / (RELEASE - OPEN)))
  if (t <= CALLS[0]) return hermite(LAGGING, LAGGING_V, FARTHEST, [0, 0], CALLS[0] - RELEASE, clamp((t - RELEASE) / (CALLS[0] - RELEASE)))
  const keys: Pt[] = [FARTHEST, lerp2(FARTHEST, cradle, 0.45), lerp2(FARTHEST, cradle, 0.8), cradle]
  let i = 0
  while (i < 2 && t >= CALLS[i + 1]) i++
  const u = clamp((t - CALLS[i]) / (CALLS[i + 1] - CALLS[i]))
  return lerp2(keys[i], keys[i + 1], stroke(u))
}

/** Where she is in this part's frame at show time `t`, from where the hero is (his lane, so the two shake as one): in her seat, then after him. */
function brandAt(lane: Lane, begin: number, t: number): Pt {
  const h = laneAt(lane, t - begin)
  const o = t < OPEN ? seatGap(t) : brandDrift(t)
  return [h.x + o[0], h.y + o[1]]
}

interface RocketState {
  begin: number
  exit: Pt
}

/** The rocket's body frame at show time `t`, shaken: what the stack, the window and its glass are drawn in. */
function bodyFrame(p: p5, k: number, t: number): void {
  const { base, lean: a } = flight(t)
  const s = shakeAt(t)
  p.translate((base[0] + s * Math.cos(a)) * k, (base[1] + s * Math.sin(a)) * k)
  p.rotate(a)
}

export const rocket = part<RocketState>(
  {
    name: 'rocket',
    flight: true,
    draw: (p, s, c) => drawRocket(p, s, c),
    over: (p, s, c) => {
      const t = c.t + s.begin
      const { k, ink, weight } = c
      // The billow off the pad, in front of the ground and everything standing on it.
      if (c.theme.name === 'dust-bowl') padSmoke(p, k, ink, weight, t)
      // The window's glass and rim over the two in it, while the nose is shut.
      if (t >= OPEN) return
      p.push()
      bodyFrame(p, k, t)
      p.noFill()
      p.stroke(ink)
      p.strokeWeight(weight * 1.1)
      pill(p, k, 0, -WINDOW, WIN_L, WIN_R)
      // A sheen across the upper half of the glass: two short strokes, the way light lies on a curved pane.
      p.stroke(alpha(p, '#FFFFFF', 0.3))
      p.strokeWeight(Math.max(1, k * 0.028))
      p.strokeCap(p.ROUND)
      p.line(-WIN_L * 1.25 * k, (-WINDOW - WIN_R * 0.58) * k, -WIN_L * 0.2 * k, (-WINDOW - WIN_R * 0.58) * k)
      p.line(WIN_L * 0.35 * k, (-WINDOW - WIN_R * 0.58) * k, WIN_L * 0.75 * k, (-WINDOW - WIN_R * 0.58) * k)
      p.pop()
    },
  },
  (slot) => {
    const at = (t: number) => t - slot.begin
    const s: RocketState = { begin: slot.begin, exit: EXIT }
    const ride = (t: number) => windowAt(t + slot.begin)
    const float = (t: number) => floatAt(t + slot.begin, EXIT)
    const segs = [
      ...carried(ride, 0, at(OPEN), Math.ceil(at(OPEN) * 30)),
      ...carried(float, at(OPEN), at(slot.end), 24),
    ]
    const top = Math.min(...[LIFTOFF, PUNCH, STAGING, OPEN, slot.end].map((t) => windowAt(t)[1])) - 4
    const right = Math.max(...[OPEN, slot.end].map((t) => windowAt(t)[0])) + 4
    const lane: Lane = { segs, fire: at(IGNITION) }
    return {
      cells: box(-5, top, right, WINDOW + 4),
      exit: [EXIT[0] + 0.5, EXIT[1]],
      lane,
      state: s,
      company: [{ from: slot.begin, to: slot.end, at: (t) => { const [x, y] = brandAt(lane, slot.begin, t); return { x, y } } }],
    }
  },
  () => {
    // On the pad: the whole stack, and high enough that the two in the window stay in it under Zoom. It lets go
    // and the frame goes with it, low, so the pad drops away under it.
    const [hx, hy] = [-0.5, WINDOW]
    return [
      { t: IGNITION, cells: 10.6, hold: [hx - 0.3, hy - 4.1] },
      { t: LIFTOFF + 0.2, cells: 10.8, hold: [hx - 0.1, hy - 4.0] },
      { t: LIFTOFF + 1.6, cells: 9.5, off: [0.2, 2.6] },
      { t: PUNCH - 0.4, cells: 8.2, off: [0.1, 1.8] },
      { t: STAGING + 0.4, cells: 8.6, off: [0.3, 1.6] },
      { t: OPEN - 0.5, cells: 6.2, off: [0.6, 0.4] },
      { t: RELEASE, cells: 6.2, off: [0.8, 0] },
    ]
  },
)

/** The billow off the pad from ignition: out of the trench both ways, rolling over whatever stands near the pad. */
function padSmoke(p: p5, k: number, ink: string, weight: number, t: number): void {
  if (t <= IGNITION - 0.1) return
  const f = frame(p, k)
  const [bx, by] = BASE
  p.push()
  for (let i = 0; i < 26; i++) {
    const born = IGNITION + i * 0.12
    if (born > t) break
    const age = t - born
    const side = i % 2 ? 1 : -1
    const x = bx + side * (0.6 + age * (1.1 + hash(i, 1) * 0.6))
    const y = by + 0.7 - age * (0.25 + hash(i, 2) * 0.25)
    const r = 0.25 + age * 0.35
    if (x < f.x0 - 2 || x > f.x1 + 2) continue
    p.drawingContext.globalAlpha = Math.max(0, 1 - age / 5)
    puff(p, k, ink, weight * 0.7, DUST.bone, x, y, r)
  }
  p.pop()
}

/** The cabin behind the window glass, lamplit: amber, a middle tone between the two who sit in it. */
const CABIN = '#C98A45'
/** The cabin's lamp, over their heads: a warm pool of light at the top of the glass. */
function cabinLamp(p: p5, k: number, t: number): void {
  if (t >= OPEN) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createRadialGradient(0, (-WINDOW - WIN_R * 0.55) * k, 0, 0, (-WINDOW - WIN_R * 0.55) * k, (WIN_L + WIN_R) * k)
  g.addColorStop(0, 'rgba(255, 236, 190, 0.55)')
  g.addColorStop(1, 'rgba(255, 236, 190, 0)')
  ctx.fillStyle = g
  p.push()
  p.noStroke()
  ctx.beginPath()
  ctx.ellipse(0, -WINDOW * k, (WIN_L + WIN_R) * k, WIN_R * k, 0, 0, Math.PI * 2)
  ctx.fill()
  p.pop()
}

/** A slot with round ends, centred at (x, y) in the current frame: the window. */
function pill(p: p5, k: number, x: number, y: number, l: number, r: number): void {
  p.beginShape()
  for (let i = 0; i <= 10; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / 10
    p.vertex((x + l + Math.cos(a) * r) * k, (y + Math.sin(a) * r) * k)
  }
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI / 2 + (Math.PI * i) / 10
    p.vertex((x - l + Math.cos(a) * r) * k, (y + Math.sin(a) * r) * k)
  }
  p.endShape(p.CLOSE)
}

/** The rocket's base and lean at show time `t`, in this part's frame: what the cloud draws its shadow from. */
export const rocketPose = (t: number): { base: Pt; lean: number } => flight(t)
export const ROCKET_LENGTH = NOSE

/** Show time the rocket's window is in the cloud: for the score, which puts the cloud there. */
export const punchHeight = (): number => body(PUNCH, 0, WINDOW)[1]

function drawRocket(p: p5, s: RocketState, c: Ctx): void {
  const { k, ink, weight } = c
  const t = c.t + s.begin
  const X = (x: number) => x * k
  const f = frame(p, k)
  const farm = c.theme.name === 'dust-bowl'
  const hull = farm ? DUST.bone : '#D9D4C6'
  const band = farm ? DUST.denim : '#3A4257'
  const flameHot = '#FFF1C9'
  const flameMid = '#F4B24A'
  const flameEdge = DUST.rust

  // The pad: the mount, the trench, the deflector. On the farm only; from above the cloud it is long gone.
  if (farm) {
    const [bx, by] = BASE
    solid(p, ink, weight, DUST.shade)
    p.rect(X(bx - 1.9), X(by + 0.35 + (FLOOR + 0.2) / 2), X(1.6), X(FLOOR + 0.2))
    p.rect(X(bx + 1.9), X(by + 0.35 + (FLOOR + 0.2) / 2), X(1.6), X(FLOOR + 0.2))
    outline(p, ink, weight)
    p.line(X(bx - 1.1), X(by + 0.35 + FLOOR + 0.2), X(bx - 0.4), X(by + 0.35 + FLOOR + 1.0))
    p.line(X(bx + 1.1), X(by + 0.35 + FLOOR + 0.2), X(bx + 0.4), X(by + 0.35 + FLOOR + 1.0))
    // The mount's arms hold the base until the rocket lets go, and fall back.
    const let_go = easeOutCubic(clamp((t - LIFTOFF) / 0.5))
    solid(p, ink, weight, DUST.wood)
    for (const side of [-1, 1]) {
      p.push()
      p.translate(X(bx + side * 0.95), X(by + 0.35))
      p.rotate(side * let_go * 0.7)
      p.rect(X(-side * 0.25), X(-0.12), X(0.55), X(0.12))
      p.pop()
    }
  }

  // Smoke in the air: a column left where it has been, behind the flame that goes up through it. (The billow on the
  // pad is drawn in `over`, in front of everything on the ground: the bunker, the tower's foot.)
  if (farm && t > LIFTOFF) {
    p.push()
    for (let i = 0; i < 40; i++) {
      const born = LIFTOFF + i * 0.1
      if (born > t) break
      const age = t - born
      const at = body(born, 0, -0.4, false)
      const r = 0.22 + age * 0.22
      if (at[1] < f.y0 - 2 || at[1] > f.y1 + 2) continue
      p.drawingContext.globalAlpha = Math.max(0, 0.85 - age / 4)
      puff(p, k, ink, weight * 0.6, DUST.bone, at[0] + (hash(i, 3) - 0.5) * 0.3, at[1] + age * 0.2, r)
    }
    p.pop()
  }

  // The first stage, once it lets go: it drifts back and down, turning, with a last cough of flame.
  if (t >= STAGING && t < STAGING + 6) {
    // It goes on along the same path on a slower clock, so it drops back from the ship, sinking and turning over.
    const since = t - STAGING
    const slow = STAGING + since * 0.45 - Math.min(since, 0.3) * 0.02
    const at = flight(slow)
    const pivot = body(slow, 0, S1_TOP / 2, false)
    p.push()
    p.translate(X(pivot[0] - 0.2 * since), X(pivot[1] + 0.3 * since * since))
    p.rotate(at.lean - since * 0.45)
    stage1(p, k, ink, weight, hull, band, S1_TOP / 2)
    p.pop()
  }

  // The flame: long and bright under the first stage, a short blue-white tongue under the second.
  const lit = t >= IGNITION && t < STAGING ? 1 : t >= SECOND && t < OPEN + 0.3 ? 0.55 : 0
  if (lit > 0) {
    const from = t < STAGING ? 0 : S1_TOP
    // A surge on the beat: the flame lengthens and a bright diamond runs down it.
    const surge = SURGES.reduce((m, at) => Math.max(m, t >= at ? Math.exp(-(t - at) / 0.16) : 0), 0)
    const flick = (0.85 + 0.15 * Math.sin(t * 57) * Math.sin(t * 23)) * (1 + 0.35 * surge)
    const grow = t < STAGING ? (0.4 + 0.6 * smooth(t, IGNITION, LIFTOFF)) * (1 + 0.8 * smooth(t, LIFTOFF, LIFTOFF + 3)) : smooth(t, SECOND, SECOND + 0.3)
    const len = (t < STAGING ? 1.6 : 0.9) * grow * flick
    const wide = t < STAGING ? W1 * 0.62 : W2 * 0.45
    const tongue = (w: number, l: number, fill: string) => {
      const pts: Pt[] = [body(t, -w, from + 0.02), body(t, w, from + 0.02), body(t, w * 0.35, from - l), body(t, 0, from - l * 1.12), body(t, -w * 0.35, from - l)]
      p.fill(fill)
      p.beginShape()
      for (const [x, y] of pts) p.vertex(X(x), X(y))
      p.endShape(p.CLOSE)
    }
    p.push()
    p.stroke(ink)
    p.strokeWeight(weight * 0.8)
    tongue(wide, len, t < STAGING ? flameEdge : '#8FC6E6')
    p.noStroke()
    tongue(wide * 0.72, len * 0.8, flameMid)
    tongue(wide * 0.4, len * 0.55, flameHot)
    if (surge > 0.05) {
      // The shock diamond: a bright lozenge that runs down the flame and fades.
      const [dx, dy] = body(t, 0, from - len * (0.25 + 0.4 * (1 - surge)))
      p.fill(alpha(p, '#FFFBEA', surge))
      p.ellipse(X(dx), X(dy), X(wide * 0.9), X(0.2))
    }
    p.pop()
    // Light off the flame on the pad and the smoke.
    if (farm && t < LIFTOFF + 2.5) {
      const ctx = p.drawingContext as CanvasRenderingContext2D
      const [lx, ly] = body(t, 0, -0.6)
      const g = ctx.createRadialGradient(X(lx), X(ly), 0, X(lx), X(ly), X(3.2))
      g.addColorStop(0, `rgba(255, 214, 140, ${0.45 * grow})`)
      g.addColorStop(1, 'rgba(255, 214, 140, 0)')
      ctx.fillStyle = g
      ctx.fillRect(X(lx - 3.2), X(ly - 3.2), X(6.4), X(6.4))
    }
  }

  // The stack: the first stage until it goes, the second, and the fairing.
  p.push()
  bodyFrame(p, k, t)
  if (t < STAGING) stage1(p, k, ink, weight, hull, band, 0)
  // The second stage: plain, one band, its small bell.
  solid(p, ink, weight, hull)
  p.rect(0, X(-(S1_TOP + S2_TOP) / 2), X(W2), X(S2_TOP - S1_TOP))
  solid(p, ink, weight, band)
  p.rect(0, X(-S2_TOP + 0.35), X(W2), X(0.16))
  solid(p, ink, weight * 0.8, DUST.shade)
  p.quad(X(-0.16), X(-S1_TOP), X(0.16), X(-S1_TOP), X(0.22), X(-S1_TOP + 0.22), X(-0.22), X(-S1_TOP + 0.22))
  // Pyro ring: a flash where the stages part.
  const pyro = t - STAGING
  if (pyro > 0 && pyro < 0.35) {
    p.noStroke()
    p.fill(alpha(p, '#FFF6DE', 1 - pyro / 0.35))
    p.ellipse(0, X(-S1_TOP), X(W1 * (1.4 + pyro * 4)), X(0.3 + pyro))
  }
  // The fairing: two halves split down the axis, each with its half of the window. They open on beat 147.
  const open = easeOutCubic(clamp((t - OPEN) / 0.35))
  const away = Math.max(0, t - OPEN - 0.25)
  for (const side of [-1, 1] as const) {
    if (away > 6) continue
    p.push()
    // Hinged at the foot of the flare and opened on the beat, then let go: each half sails off to its own side,
    // turning over, and is out of the frame before it is let go of here (no fading through the picture).
    const off = away * 1.6
    p.translate(X(side * W2 * 0.5 + side * off), X(-S2_TOP - away * 0.35))
    p.rotate(side * open * 1.0 + side * away * 1.6)
    fairingHalf(p, k, ink, weight, hull, band, side, 1 - smooth(open, 0.05, 0.5))
    p.pop()
  }
  // The cabin's lamp, over the two in the window (the glass and its rim go over them, in `over`).
  cabinLamp(p, k, t)
  p.pop()
}

/** One half of the fairing in its own frame: the hinge at the origin (the foot of the flare), the axis at x = -side·W2/2. */
function fairingHalf(p: p5, k: number, ink: string, weight: number, hull: string, band: string, side: -1 | 1, glass: number): void {
  const X = (x: number) => x * k
  // Body coords (x across, y up) to the half's frame.
  const H = (x: number, y: number): [number, number] => [X(x - side * W2 * 0.5), X(-(y - S2_TOP))]
  solid(p, ink, weight, hull)
  p.beginShape()
  p.vertex(...H(0, S2_TOP))
  p.vertex(...H(side * W2 * 0.5, S2_TOP))
  p.vertex(...H(side * WF * 0.5, FAIR0))
  p.vertex(...H(side * WF * 0.5, FAIR1))
  p.bezierVertex(...H(side * WF * 0.5, FAIR1 + 0.4), ...H(side * WF * 0.2, NOSE - 0.1), ...H(0, NOSE))
  p.endShape(p.CLOSE)
  // A band round the drum's foot.
  solid(p, ink, weight * 0.8, band)
  p.beginShape()
  for (const [x, y] of [[0, FAIR0 + 0.04], [side * WF * 0.5, FAIR0 + 0.04], [side * WF * 0.5, FAIR0 + 0.14], [0, FAIR0 + 0.14]] as Pt[]) p.vertex(...H(x, y))
  p.endShape(p.CLOSE)
  // Its half of the window: the cabin behind the glass, lamplit (a warm middle tone, so the sand ball reads lighter
  // than it and the blue one darker), fading as the half swings open.
  if (glass > 0.01) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const was = ctx.globalAlpha
    ctx.globalAlpha = was * glass
    solid(p, ink, weight, CABIN)
    p.beginShape()
    p.vertex(...H(0, WINDOW + WIN_R))
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI / 2 - (Math.PI * i) / 10
      p.vertex(...H(side * (WIN_L + Math.cos(a) * WIN_R), WINDOW + Math.sin(a) * WIN_R))
    }
    p.vertex(...H(0, WINDOW - WIN_R))
    p.endShape(p.CLOSE)
    ctx.globalAlpha = was
  }
  // The seam down the axis, heavier: where the halves part.
  outline(p, ink, weight * 1.1)
  p.line(...H(0, S2_TOP), ...H(0, NOSE))
}

/** The first stage in its own frame, base at (0, y0): a white body with a band, fins, the bell. */
function stage1(p: p5, k: number, ink: string, weight: number, hull: string, band: string, y0: number): void {
  const X = (x: number) => x * k
  solid(p, ink, weight, hull)
  p.rect(0, X(y0 - S1_TOP / 2), X(W1), X(S1_TOP))
  solid(p, ink, weight, band)
  p.rect(0, X(y0 - S1_TOP + 0.5), X(W1), X(0.22))
  p.rect(0, X(y0 - 0.9), X(W1), X(0.12))
  // Fins.
  solid(p, ink, weight, band)
  for (const side of [-1, 1]) {
    p.quad(X(side * W1 * 0.5), X(y0 - 1.1), X(side * (W1 * 0.5 + 0.28)), X(y0 - 0.2), X(side * (W1 * 0.5 + 0.28)), X(y0), X(side * W1 * 0.5), X(y0 - 0.25))
  }
  // The bell.
  solid(p, ink, weight * 0.8, '#8A8578')
  p.quad(X(-0.18), X(y0), X(0.18), X(y0), X(0.28), X(y0 + 0.28), X(-0.28), X(y0 + 0.28))
  // The line down the side: a seam, to catch the light.
  outline(p, ink, weight * 0.5)
  p.line(X(W1 * 0.22), X(y0 - S1_TOP + 0.1), X(W1 * 0.22), X(y0 - 1.0))
}
