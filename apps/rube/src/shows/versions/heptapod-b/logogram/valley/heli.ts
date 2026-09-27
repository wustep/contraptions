import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { mixHex, R, type Pt } from '../../../../../parts'
import { alpha, knock, lastOf } from '../kit'
import { onset, PULSES, pulse, SEAM } from '../music'
import { VALLEY } from '../worlds'
import { PAD } from './camp'
import { clamp01, lerp, lobe, rgbOf, sm } from './set-air'

/**
 * The helicopter (the valley builder's), for the flight and the base: a military utility helicopter on skids, side
 * on, nose to the right, about 12 cells long. Where it is at any show time (`heliAt`): hanging in the cloud at the
 * cut, off through the cloud and out of it, over the near ridge, down onto the helideck and set down on the base's
 * seam; then parked there, the rotor winding down a blade a pulse, and the cabin door sliding back.
 *
 * Its own frame: u along it (the nose is +u), v up from the bottom of the skids, the mast at u = MAST. Louise sits
 * on the bench at SEAT, Ian beside her on her right at IAN_SEAT, seen through the cabin door's window in flight and
 * through the open door after.
 */

/** Where its body turns when it pitches: about under the mast. */
const PIV: Pt = [-0.3, 2.0]
const MAST = -0.3
const HUB_V = 4.15
const ROTOR = 5.6
const BELLY_V = 0.95
const ROOF_V = 2.95
const NOSE_U = 4.5
const TAIL_U = -7.4
/** The cabin's door opening, and the sliding door's window. */
const DOOR: [number, number, number, number] = [-1.4, 0.9, 1.05, 2.72]
const WIN: [number, number, number, number] = [-1.02, 0.62, 1.33, 2.36]
/** How far the door slides back to open. */
const SLIDE = 2.38
/** The bench along the cabin's back wall: its top. */
const BENCH_V = 1.4
export const SEAT: Pt = [-0.36, BENCH_V + R]
export const IAN_SEAT: Pt = [SEAT[0] + 0.36, SEAT[1]]

/** How it stands at a moment. */
export interface HeliPose {
  /** Where its pivot is (world cells), and its pitch (radians, nose down positive). */
  x: number
  y: number
  pitch: number
  /** The main rotor: how many half-turns it has made (a blade is broadside on each whole number), and how fast. */
  turns: number
  rate: number
  /** The cabin door: 0 shut .. 1 slid back. */
  door: number
}

/** A point of its body (u, v) in the world, as it stands. */
export function heliPoint(h: HeliPose, u: number, v: number): Pt {
  const x = u - PIV[0]
  const y = -(v - PIV[1])
  const c = Math.cos(h.pitch)
  const s = Math.sin(h.pitch)
  return [h.x + x * c - y * s, h.y + x * s + y * c]
}

/* ------------------------------------------------------------------ where it flies */

/** The first great pulse, touchdown, and the moments of the flight. */
const T0 = SEAM.flight
const LAND = SEAM.base
/** Off as the white clears (a lurch on the onset 9.741); out of the cloud; over the ridge (its nose dips); the nose up for the descent. */
const GO = onset(9.741, 0.8)
const RAMP = 11.9
const OUT = pulse(46)
const CREST = pulse(68)
const FLARE = pulse(75)
/** Its cruise, cells a second. */
const CRUISE = 11
/** Parked: the pivot over the helideck (the skids on its matting). */
export const PARK: Pt = [-24.5, PAD.top - PIV[1]]
/** Where it crosses the ridge's crest, on CREST. */
const CREST_X = -68

/** Distance along x flown since GO, at `t`. */
function flown(t: number): number {
  if (t <= GO) return 0
  const T = RAMP - GO
  if (t <= RAMP) {
    const u = (t - GO) / T
    return CRUISE * T * (u * u * u - (u * u * u * u) / 2)
  }
  const ramp = (CRUISE * T) / 2
  if (t <= FLARE) return ramp + CRUISE * (t - RAMP)
  // From the flare, slowing to a stop exactly at touchdown: the speed falls as 1 - smoothstep.
  const D = LAND - FLARE
  const u = Math.min(1, (t - FLARE) / D)
  const s = u - u * u * u + (u * u * u * u) / 2
  return ramp + CRUISE * (FLARE - RAMP) + CRUISE * D * s
}
/** Where x starts, so that it crosses the crest on CREST; and the distance it lands short of the park (a check). */
const X0 = CREST_X - flown(CREST)
const X_END = X0 + flown(LAND)

/** Heights (pivot y) through the flight: a monotone cubic through these. */
const YK: Pt[] = [
  [T0, -50],
  [GO, -50],
  [OUT, -50.3],
  [13.6, -46],
  [15.2, -39.5],
  [CREST, -33.8],
  [FLARE, -23.6],
  [19.8, -12.4],
  [21.0, -5.8],
  [21.6, -4.0],
  [LAND, PARK[1]],
]
const ySlopes = (() => {
  const n = YK.length
  const d = YK.slice(0, -1).map((a, i) => (YK[i + 1][1] - a[1]) / (YK[i + 1][0] - a[0]))
  const m = new Array(n).fill(0)
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) continue
    const h0 = YK[i][0] - YK[i - 1][0]
    const h1 = YK[i + 1][0] - YK[i][0]
    const w1 = 2 * h1 + h0
    const w2 = h1 + 2 * h0
    m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
  }
  // It sets down gently: still sinking a little as the skids touch (the struts take it).
  m[n - 1] = 0.6
  m[0] = 0
  return m
})()
function yAt(t: number): number {
  if (t <= YK[0][0]) return YK[0][1]
  for (let i = 0; i < YK.length - 1; i++) {
    const [ta, ya] = YK[i]
    const [tb, yb] = YK[i + 1]
    if (t > tb) continue
    const h = tb - ta
    const u = (t - ta) / h
    const u2 = u * u
    const u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * ya + (u3 - 2 * u2 + u) * h * ySlopes[i] + (-2 * u3 + 3 * u2) * yb + (u3 - u2) * h * ySlopes[i + 1]
  }
  return YK[YK.length - 1][1]
}

/** Pitch through the flight: level in the cloud, nose down to go, a dip over the crest, the nose up on the flare. */
function pitchAt(t: number): number {
  if (t <= GO) return 0
  let a = 0.13 * sm(t, GO, 10.7) - 0.06 * sm(t, 10.9, 12.6)
  // Over the crest: the nose dips on the pulse, and comes back slowly.
  const dip = t - CREST
  if (dip > -0.12) a += 0.09 * sm(dip, -0.12, 0.05) * (dip > 0.05 ? Math.exp(-(dip - 0.05) / 0.9) : 1) + 0.02 * sm(dip, 0, 1)
  // The flare: the nose comes up for the descent, and levels as it slows; level on the skids.
  const fl = t - FLARE
  if (fl > -0.3) a += -0.26 * sm(fl, -0.3, 0.05) + 0.1 * sm(fl, 0.4, 2.2)
  // Level, and still, as the skids touch.
  return a * (1 - sm(t, 20.6, LAND))
}

/** The struts taking its weight at touchdown: a damped settle from the speed it came down at. */
function sinkAt(t: number): number {
  const u = t - LAND
  if (u <= 0) return 0
  const w = 14
  const z = 0.5
  const wd = w * Math.sqrt(1 - z * z)
  const A = -0.05
  const B = (0.6 + z * w * A) / wd
  return 0.05 + Math.exp(-z * w * u) * (A * Math.cos(wd * u) + B * Math.sin(wd * u))
}

/* ------------------------------------------------------------------ the rotor and the door */

/**
 * The main rotor. In flight it spins fast (a blur, its blades strobing once a pulse). From touchdown it winds down:
 * a blade broadside on a pulse, then every other pulse, then fewer, until it stops broadside (along the fuselage) on
 * pulse 117. The half-turns at those pulses are whole numbers; between them it turns smoothly, slowing.
 */
const WIND_K = [92, 93, 94, 95, 96, 97, 99, 101, 103, 106, 109, 113, 117]
const WIND: Pt[] = WIND_K.map((k, i) => [pulse(k), i])
/** Half-turns a second in flight (a blur). */
const SPIN = 11
/** Half-turns a second as touchdown comes: the pilot takes the power off over the last second and a half. */
const EASE0 = LAND - 1.5
const R_LAND = SPIN * 0.45
function turnsAt(t: number): { turns: number; rate: number } {
  if (t <= LAND) {
    // The rate falls from SPIN to R_LAND over EASE0 .. LAND (as 1 - smoothstep); the half-turns count back from 0 at touchdown.
    const D = LAND - EASE0
    const S = (u: number) => u * u * u - (u * u * u * u) / 2
    const u = Math.max(0, (t - EASE0) / D)
    const at = (v: number) => SPIN * v * D - (SPIN - R_LAND) * D * S(v)
    const turns = t <= EASE0 ? (t - EASE0) * SPIN - at(1) : at(u) - at(1)
    const rate = SPIN - (SPIN - R_LAND) * (u * u * (3 - 2 * u))
    return { turns, rate }
  }
  const last = WIND[WIND.length - 1]
  if (t >= last[0]) return { turns: last[1], rate: 0 }
  // Hermite through the whole-number broadsides, slowing: the rate at each is the mean of its neighbours' gaps, and
  // nothing at the stop. From touchdown's SPIN it falls quickly to a blade a pulse.
  const rates = WIND.map((w, i) => {
    if (i === 0) return R_LAND
    if (i === WIND.length - 1) return 0
    return 0.5 * (1 / (w[0] - WIND[i - 1][0]) + 1 / (WIND[i + 1][0] - w[0]))
  })
  for (let i = 0; i < WIND.length - 1; i++) {
    const [ta, na] = WIND[i]
    const [tb, nb] = WIND[i + 1]
    if (t > tb) continue
    const h = tb - ta
    const u = (t - ta) / h
    const u2 = u * u
    const u3 = u2 * u
    const turns = (2 * u3 - 3 * u2 + 1) * na + (u3 - 2 * u2 + u) * h * rates[i] + (-2 * u3 + 3 * u2) * nb + (u3 - u2) * h * rates[i + 1]
    const rate = ((6 * u2 - 6 * u) * na + (3 * u2 - 4 * u + 1) * h * rates[i] + (-6 * u2 + 6 * u) * nb + (3 * u2 - 2 * u) * h * rates[i + 1]) / h
    return { turns, rate: Math.max(0, rate) }
  }
  return { turns: last[1], rate: 0 }
}

/** The cabin door: shut in flight; slid back on the base's first clear pulse (it hits its stop on it). */
export const DOOR_OPEN = pulse(97)
function doorAt(t: number): number {
  const u = t - (DOOR_OPEN - 0.34)
  if (u <= 0) return 0
  // Pushed along its track, quickening, to its stop; a small knock back off the stop, and still.
  const run = Math.min(1, u / 0.34)
  const v = run * run * (1.6 - 0.6 * run)
  const after = t - DOOR_OPEN
  return after > 0 ? 1 - 0.035 * Math.sin(Math.min(Math.PI, after * 11)) * Math.exp(-after / 0.12) : v
}

/** Where it is and how it stands at show time `t`. */
export function heliAt(t: number): HeliPose {
  const { turns, rate } = turnsAt(t)
  if (t >= LAND) return { x: PARK[0], y: PARK[1] + sinkAt(t), pitch: 0, turns, rate, door: doorAt(t) }
  const x = X0 + flown(t) + (PARK[0] - X_END) * sm(t, FLARE, LAND)
  // Hanging in the cloud it rides a little on the air: a slow bob from the cut (from rest), gone once it is off.
  const u = t - T0
  const bob = u > 0 ? 0.035 * (1 - Math.cos((2 * Math.PI * u) / 1.9)) * (1 - sm(t, GO, GO + 1.2)) : 0
  return { x, y: yAt(t) + bob, pitch: pitchAt(t), turns, rate, door: 0 }
}

/** Show times the rotor strobes in flight (every pulse), for the drawing. */
const FLIGHT_PULSES = PULSES.filter((p) => p.t >= T0 - 1 && p.t <= LAND + 0.5).map((p) => p.t)

/* ------------------------------------------------------------------ drawing */

type Body = (u: number, v: number) => Pt

function shape(p: p5, k: number, B: Body, pts: Pt[]): void {
  p.beginShape()
  for (const [u, v] of pts) {
    const [x, y] = B(u, v)
    p.vertex(x * k, y * k)
  }
  p.endShape(p.CLOSE)
}
/** A smooth run of body points: a quadratic from a through the control c to b, `n` pieces. */
function curve(a: Pt, c: Pt, b: Pt, n = 6): Pt[] {
  const out: Pt[] = []
  for (let i = 1; i <= n; i++) {
    const s = i / n
    out.push([(1 - s) * (1 - s) * a[0] + 2 * s * (1 - s) * c[0] + s * s * b[0], (1 - s) * (1 - s) * a[1] + 2 * s * (1 - s) * c[1] + s * s * b[1]])
  }
  return out
}

/** The fuselage's outline, from the belly's back round the nose, over the roof, down the boom and back. */
const HULL: Pt[] = [
  [-4.4, 1.32],
  [-3.7, BELLY_V],
  [3.2, BELLY_V],
  ...curve([3.2, BELLY_V], [4.3, BELLY_V + 0.02], [NOSE_U, 1.62]),
  ...curve([NOSE_U, 1.62], [4.55, 2.2], [3.45, ROOF_V - 0.05]),
  [3.1, ROOF_V],
  [-3.9, ROOF_V],
  [-4.5, 2.78],
  [TAIL_U + 0.25, 2.5],
  [TAIL_U + 0.05, 2.36],
  [TAIL_U + 0.25, 2.2],
  [-4.4, 1.9],
]
const ENGINE: Pt[] = [
  [-3.3, ROOF_V],
  [1.35, ROOF_V],
  ...curve([1.35, ROOF_V], [1.3, ROOF_V + 0.52], [0.7, ROOF_V + 0.58]),
  [-2.4, ROOF_V + 0.6],
  [-3.9, ROOF_V + 0.18],
  [-3.95, ROOF_V],
]
const FIN: Pt[] = [
  [TAIL_U + 0.95, 2.45],
  [TAIL_U + 0.3, 3.95],
  [TAIL_U + 0.02, 4.02],
  [TAIL_U + 0.1, 3.7],
  [TAIL_U + 0.25, 2.3],
]
const STAB: Pt[] = [
  [-5.55, 2.28],
  [-4.55, 2.33],
  [-4.5, 2.2],
  [-5.5, 2.17],
]
const NOSE_GLASS: Pt[] = [
  [3.35, 2.84],
  ...curve([3.35, 2.84], [4.3, 2.55], [4.38, 1.95], 5),
  [3.85, 1.95],
  [3.2, 2.7],
]
const CHIN: Pt[] = [
  [3.72, 1.2],
  [4.28, 1.2],
  ...curve([4.28, 1.2], [4.45, 1.45], [4.4, 1.82], 4),
  [3.78, 1.82],
]
const COCKPIT_WIN: Pt[] = [
  [1.25, 1.72],
  [2.72, 1.72],
  [2.95, 2.68],
  [1.25, 2.68],
]

export interface HeliDraw {
  ink: string
  weight: number
  t: number
}

/**
 * Everything of it behind the balls: the tail, the hull, the inside of the cabin through its door or its window, the
 * cockpit's glass, the skids, the engine, the rotors. Drawn in the world's cells (the caller has translated to its
 * own origin: pass `off`, the world point at that origin).
 */
export function drawHeli(p: p5, k: number, h: HeliPose, d: HeliDraw, off: Pt = [0, 0]): void {
  const { ink, weight } = d
  const B: Body = (u, v) => {
    const [x, y] = heliPoint(h, u, v)
    return [x - off[0], y - off[1]]
  }
  const body = VALLEY.olive
  const dark = VALLEY.oliveDark
  const glass = mixHex(VALLEY.sky, VALLEY.steelDark, 0.4)
  const inside = mixHex(dark, ink, 0.55)
  p.push()
  // The tail's fin and stabiliser, behind the boom.
  solid(p, ink, weight, dark)
  shape(p, k, B, FIN)
  shape(p, k, B, STAB)
  // The hull.
  solid(p, ink, weight, body)
  shape(p, k, B, HULL)
  // The underside's shade, and the boom's.
  p.noStroke()
  p.fill(mixHex(body, ink, 0.18))
  shape(p, k, B, [[-3.7, BELLY_V + 0.02], [3.2, BELLY_V + 0.02], [3.3, BELLY_V + 0.22], [-3.9, BELLY_V + 0.25]])
  // The cabin: its inside where the door has slid back from, and through the window.
  const [d0, d1, dv0, dv1] = DOOR
  // The whole opening is dark inside; the door (drawn over the balls) covers what it covers.
  solid(p, ink, weight * 0.7, inside)
  shape(p, k, B, [[d0, dv0], [d1, dv0], [d1, dv1], [d0, dv1]])
  // The far side's window, pale, and the bench along the back wall.
  p.noStroke()
  p.fill(mixHex(glass, VALLEY.sky, 0.35))
  shape(p, k, B, [[-1.05, 1.75], [0.55, 1.75], [0.55, 2.42], [-1.05, 2.42]])
  solid(p, ink, weight * 0.6, VALLEY.canvas)
  shape(p, k, B, [[d0 + 0.05, BENCH_V - 0.1], [d1 - 0.05, BENCH_V - 0.1], [d1 - 0.05, BENCH_V], [d0 + 0.05, BENCH_V]])
  outline(p, ink, weight * 0.5)
  for (const u of [-1.0, -0.2, 0.6]) {
    const [a0, a1] = [B(u, BENCH_V - 0.1), B(u, dv0)]
    p.line(a0[0] * k, a0[1] * k, a1[0] * k, a1[1] * k)
  }
  // The door's track, a line over the opening.
  const [r0, r1] = [B(-4.2, dv1 + 0.06), B(d1, dv1 + 0.06)]
  p.line(r0[0] * k, r0[1] * k, r1[0] * k, r1[1] * k)
  // The cockpit door and its window, the nose's glass and the chin window.
  solid(p, ink, weight * 0.8, glass)
  shape(p, k, B, COCKPIT_WIN)
  shape(p, k, B, NOSE_GLASS)
  shape(p, k, B, CHIN)
  // Glass catches the sky: one soft pale streak on each.
  p.noStroke()
  p.fill(alpha(p, VALLEY.cloud, 0.35))
  shape(p, k, B, [[1.45, 2.5], [1.75, 2.62], [2.2, 1.85], [1.95, 1.78]])
  shape(p, k, B, [[3.55, 2.72], [3.75, 2.68], [4.05, 2.05], [3.9, 2.05]])
  outline(p, ink, weight * 0.7)
  const cd = [B(1.05, BELLY_V + 0.1), B(1.05, ROOF_V - 0.05)]
  p.line(cd[0][0] * k, cd[0][1] * k, cd[1][0] * k, cd[1][1] * k)
  // Skids and their cross tubes.
  solid(p, ink, weight, dark)
  for (const u of [-1.55, 1.25]) shape(p, k, B, [[u - 0.08, 0.08], [u + 0.04, 0.08], [u + 0.2, BELLY_V + 0.02], [u + 0.08, BELLY_V + 0.02]])
  shape(p, k, B, [[-2.5, 0], [2.35, 0], ...curve([2.35, 0], [2.85, 0.02], [2.95, 0.34], 4), [2.82, 0.36], ...curve([2.82, 0.36], [2.7, 0.12], [2.3, 0.12], 3), [-2.5, 0.12]])
  // The engine's housing, its intake and exhaust.
  solid(p, ink, weight, body)
  shape(p, k, B, ENGINE)
  solid(p, ink, weight * 0.7, dark)
  shape(p, k, B, [[-3.55, ROOF_V + 0.12], [-3.2, ROOF_V + 0.12], [-3.25, ROOF_V + 0.42], [-3.6, ROOF_V + 0.34]])
  // The mast.
  solid(p, ink, weight * 0.8, dark)
  shape(p, k, B, [[MAST - 0.1, ROOF_V + 0.55], [MAST + 0.1, ROOF_V + 0.55], [MAST + 0.07, HUB_V], [MAST - 0.07, HUB_V]])
  drawRotor(p, k, h, B, d)
  drawTailRotor(p, k, h, B, d)
  p.pop()
}

/** The main rotor: a thin blurred disc whose blades strobe once a pulse in flight; the blades themselves as it slows. */
function drawRotor(p: p5, k: number, h: HeliPose, B: Body, d: HeliDraw): void {
  const { ink, weight, t } = d
  const blur = clamp01((h.rate - 3) / 5)
  const [hx, hy] = B(MAST, HUB_V)
  const [ax, ay] = B(MAST - ROTOR, HUB_V + 0.12)
  const [bx, by] = B(MAST + ROTOR, HUB_V + 0.12)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  if (blur > 0.01) {
    // The disc: a long thin lens, a little coned up at its rim, soft.
    const ang = Math.atan2(by - ay, bx - ax)
    ctx.save()
    ctx.translate(hx * k, hy * k)
    ctx.rotate(ang)
    const L = ROTOR * k
    const g = ctx.createLinearGradient(-L, 0, L, 0)
    const c = rgbOf(ink)
    g.addColorStop(0, `rgba(${c}, 0)`)
    g.addColorStop(0.12, `rgba(${c}, ${0.16 * blur})`)
    g.addColorStop(0.5, `rgba(${c}, ${0.24 * blur})`)
    g.addColorStop(0.88, `rgba(${c}, ${0.16 * blur})`)
    g.addColorStop(1, `rgba(${c}, 0)`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(0, -0.1 * k, L, Math.max(0.06 * k, 1), 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    // The strobe: once a pulse the blades are seen, broadside, for a moment.
    const { ago } = lastOf(FLIGHT_PULSES, t)
    const s = knock(ago, 0.07) * blur
    if (s > 0.02) {
      p.stroke(alpha(p, ink, 0.75 * s))
      p.strokeWeight(Math.max(1, weight * 1.1))
      p.line(ax * k, (ay - 0.1) * k, bx * k, (by - 0.1) * k)
    }
  }
  if (blur < 0.99) {
    // The blades, turning: each is seen at the length its angle shows it; broadside on a whole half-turn.
    const phi = h.turns * Math.PI
    const droop = 0.26 * (1 - clamp01(h.rate / 2))
    solid(p, ink, weight * 0.7, VALLEY.oliveDark)
    p.push()
    const a = 1 - blur
    ctx.globalAlpha *= a
    for (const side of [1, -1]) {
      const reach = side * Math.cos(phi) * ROTOR
      if (Math.abs(reach) < 0.05) continue
      const tip = B(MAST + reach, HUB_V + 0.02 - droop * Math.abs(reach / ROTOR) ** 2)
      const root = B(MAST, HUB_V + 0.05)
      const nx = -(tip[1] - root[1])
      const ny = tip[0] - root[0]
      const n = Math.hypot(nx, ny) || 1
      const w = 0.06
      p.beginShape()
      p.vertex((root[0] + (nx / n) * w) * k, (root[1] + (ny / n) * w) * k)
      p.vertex((tip[0] + (nx / n) * w * 0.8) * k, (tip[1] + (ny / n) * w * 0.8) * k)
      p.vertex((tip[0] - (nx / n) * w * 0.8) * k, (tip[1] - (ny / n) * w * 0.8) * k)
      p.vertex((root[0] - (nx / n) * w) * k, (root[1] - (ny / n) * w) * k)
      p.endShape(p.CLOSE)
    }
    p.pop()
  }
  // The hub.
  solid(p, ink, weight * 0.7, VALLEY.steelDark)
  const hub = B(MAST, HUB_V + 0.05)
  p.rectMode(p.CENTER)
  p.push()
  p.translate(hub[0] * k, hub[1] * k)
  p.rotate(h.pitch)
  p.rect(0, 0, 0.5 * k, 0.16 * k, 0.05 * k)
  p.pop()
}

/** The tail rotor on the fin's near side: a small soft disc while it spins fast, its two blades as it slows. */
function drawTailRotor(p: p5, k: number, h: HeliPose, B: Body, d: HeliDraw): void {
  const { ink, weight } = d
  const c = B(TAIL_U + 0.3, 3.3)
  const r = 0.78
  const blur = clamp01((h.rate - 1.5) / 3)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  if (blur > 0.01) lobe(ctx, k, c[0], c[1], r, r, rgbOf(ink), 0.16 * blur, 0.85)
  const psi = h.turns * Math.PI * 4.3 + h.pitch
  p.push()
  ctx.globalAlpha *= 1 - blur * 0.85
  outline(p, VALLEY.oliveDark, Math.max(1, weight * 1.4))
  p.line((c[0] - Math.cos(psi) * r) * k, (c[1] - Math.sin(psi) * r) * k, (c[0] + Math.cos(psi) * r) * k, (c[1] + Math.sin(psi) * r) * k)
  p.pop()
  solid(p, ink, weight * 0.6, VALLEY.steelDark)
  p.rectMode(p.CENTER)
  p.rect(c[0] * k, c[1] * k, 0.14 * k, 0.14 * k)
}

/**
 * Over the balls: the cabin's sliding door, its window cut out and glazed, slid back by `door`. While it is shut the
 * two of them are seen through its window.
 */
export function drawHeliDoor(p: p5, k: number, h: HeliPose, d: HeliDraw, off: Pt = [0, 0]): void {
  const { ink, weight } = d
  const B: Body = (u, v) => {
    const [x, y] = heliPoint(h, u, v)
    return [x - off[0], y - off[1]]
  }
  const s = -h.door * SLIDE
  const [d0, d1, dv0, dv1] = DOOR
  const [w0, w1, wv0, wv1] = WIN
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const P = (u: number, v: number) => {
    const [x, y] = B(u + s, v)
    return [x * k, y * k] as const
  }
  // The door panel with its window cut out (even-odd), in the hull's olive, inked.
  ctx.save()
  ctx.beginPath()
  const rect = (u0: number, u1: number, v0: number, v1: number, rr: number) => {
    const corners: [number, number][] = [[u0 + rr, v0], [u1 - rr, v0], [u1, v0 + rr], [u1, v1 - rr], [u1 - rr, v1], [u0 + rr, v1], [u0, v1 - rr], [u0, v0 + rr]]
    corners.forEach(([u, v], i) => {
      const [x, y] = P(u, v)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.closePath()
  }
  rect(d0, d1, dv0, dv1, 0.04)
  rect(w0, w1, wv0, wv1, 0.12)
  ctx.fillStyle = VALLEY.olive
  ctx.fill('evenodd')
  ctx.strokeStyle = ink
  ctx.lineWidth = weight
  ctx.stroke()
  // The glass in the window: a faint grey, and one soft streak of the sky on it, over the two of them.
  ctx.beginPath()
  rect(w0, w1, wv0, wv1, 0.12)
  ctx.fillStyle = `rgba(${rgbOf(VALLEY.sky)}, 0.12)`
  ctx.fill()
  ctx.clip()
  // (up in its far corner, clear of the two of them on the bench)
  const [sx0, sy0] = P(w1 - 0.5, wv1 + 0.05)
  const [sx1, sy1] = P(w1 - 0.12, 1.78)
  ctx.strokeStyle = `rgba(${rgbOf(VALLEY.cloud)}, 0.3)`
  ctx.lineWidth = 0.14 * k
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(sx0, sy0)
  ctx.lineTo(sx1, sy1)
  ctx.stroke()
  ctx.restore()
  // Its handle.
  solid(p, ink, weight * 0.6, VALLEY.steelDark)
  const hd = B(d1 - 0.18 + s, 1.9)
  p.rectMode(p.CENTER)
  p.rect(hd[0] * k, hd[1] * k, 0.08 * k, 0.22 * k)
}

/** The rotor's wash on the ground as it comes down and while it winds down: soft mist blown out along the deck. */
export function drawWash(p: p5, k: number, t: number, off: Pt = [0, 0]): void {
  const h = heliAt(t)
  const height = PAD.top - (h.y + PIV[1])
  const near = sm(-height, -9, -1)
  const strength = near * (t < LAND ? 1 : clamp01(h.rate / SPIN) + 0.15 * Math.exp(-(t - LAND) / 1.5))
  if (strength <= 0.02) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const fog = rgbOf(mixHex(VALLEY.fog, VALLEY.road, 0.3))
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? 1 : -1
    const ph = (t * 0.9 + i * 0.137) % 1
    const x = h.x + side * lerp(1, 8, ph) - off[0]
    const y = PAD.top - 0.35 - 0.6 * ph - off[1]
    const r = 0.8 + 1.8 * ph
    lobe(ctx, k, x, y, r, r * 0.45, fog, 0.3 * strength * Math.sin(Math.PI * ph), 0.4)
  }
}
