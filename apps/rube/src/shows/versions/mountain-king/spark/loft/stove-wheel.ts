import type p5 from 'p5'
import { R, mixHex, type Pt } from '../../../../../parts'
import { hash } from '../kit'
import { LOFT_SEAM } from '../music'
import { G } from '../physics'
import { SEAMS } from '../seams'
import { LOFT } from '../worlds'
import { FLOOR_Y, HANDOFF, WHEEL } from './layout'
import { lightOn, poly, shade, type Light } from './stove-light'

/**
 * The dipping wheel (LOFT-B's): a wooden wheel of eight arms on a trestle over a vat of warm tallow. From each arm
 * hangs a frame, a bar with three half-dipped candles on their wicks, that stays level as the wheel turns and swings
 * when it lurches; at the bottom the frames dip their candles in the vat. A ratchet on the hub and a pawl let it turn
 * only one way, a click at a time.
 *
 * The wheel is balanced and still until the spark drops onto a frame at its east side (31.465). Its weight turns the
 * wheel, click by click on the strong notes, and carries it round and down: four clicks, and the wheel stops, its
 * frame low over the vat. A ladle leans on the vat, bowl hooked over the rim, handle to the floor: the way down.
 *
 * Everything here is in the loft's world cells.
 */

export const C: Pt = [WHEEL.cx, WHEEL.cy]
const RIM = WHEEL.r
const ARMS = 8
/** One click of the ratchet: a sixteenth of a turn. */
export const NOTCH = (2 * Math.PI) / 16
/** The frames: hanger length (pivot to bar top), the bar's half-length and thickness, where the spark sits on it. */
export const HANG = 1.0
const BAR = { half: 1.05, thick: 0.13 }
/** Candles along the bar (offsets from its middle), their length. The spark sits east of them, clear of the wicks. */
const CANDLES = [-0.74, -0.24, 0.26]
const CANDLE_LEN = 1.22

/** The clicks: the strong notes of phrase 3, each a sixteenth of a turn; on the last it stops. */
export const CLICKS = [32.307, 33.433, 34.553, 35.672]
/** The spark lands on its frame (the eighth after phrase 3's first note). */
export const LAND = 31.465
/** The spark leaves its frame for the ladle, on the eighth before the ladle's note (after a crouch). */
export const TAKEOFF = 36.236

/** Where the spark lands: carried on from LOFT-A's drop at the seam's velocity, under the loft's gravity. */
const T0 = LAND - LOFT_SEAM
export const LANDED: Pt = [HANDOFF[0] + SEAMS.loft.v[0] * T0, HANDOFF[1] + SEAMS.loft.v[1] * T0 + 0.5 * G * T0 * T0]

/** The frame the spark lands on hangs from an arm at this angle (y down, clockwise), its bar under the spark. */
const pivotY = LANDED[1] - (HANG - R)
const THETA0 = Math.asin((pivotY - C[1]) / RIM)
/** Where on the bar (from its middle) the spark stands. */
export const SEAT = LANDED[0] - (C[0] + RIM * Math.cos(THETA0))

/* ------------------------------------------------------------------ the turn */

/**
 * The ratchet. Between two notes the spark's weight creeps the wheel round, slowly, as the pawl rides up a tooth; it
 * slows as the pawl nears the crest. Off the crest the pawl drops, the wheel lurches the rest of the notch, faster and
 * faster, and the pawl lands in the root on the note: the speed's peak is the click. Then it creeps again from rest.
 */
/** The share of a notch the wheel creeps (the pawl riding up a tooth); it drops the rest on the note. */
const CREEP = 0.68
/** How long the drop takes, ending on the note. */
export const DROP = 0.06
/** The creep's speed at the crest, as a share of its mean: it slows as the pawl rides up. */
const CREST = 0.5

/** Hermite on the unit interval with end slopes m0, m1. */
const herm = (u: number, m0: number, m1: number): number => {
  const u2 = u * u
  const u3 = u2 * u
  return m0 * (u3 - 2 * u2 + u) + (-2 * u3 + 3 * u2) + m1 * (u3 - u2)
}

/** Where the wheel is in its current notch at `t`: which notch (0-based), and how far through it (0..1). */
function notchAt(t: number): { i: number; f: number; crest: number; b: number } {
  const ends = [LAND, ...CLICKS]
  const last = ends.length - 1
  if (t <= LAND) return { i: 0, f: 0, crest: ends[1] - DROP, b: ends[1] }
  if (t >= ends[last]) return { i: last, f: 0, crest: Infinity, b: Infinity }
  let i = 0
  while (i + 1 < last && t >= ends[i + 1]) i++
  const a = ends[i]
  const b = ends[i + 1]
  const crest = b - DROP
  const Tc = crest - a
  if (t < crest) return { i, f: CREEP * herm((t - a) / Tc, 0, CREST), crest, b }
  // Off the crest: from the creep's last speed, a steady acceleration that covers the rest of the notch by the note.
  const s = t - crest
  const vc = (CREEP * CREST) / Tc
  const acc = (2 * (1 - CREEP - vc * DROP)) / (DROP * DROP)
  return { i, f: CREEP + vc * s + 0.5 * acc * s * s, crest, b }
}

/** How far the wheel has turned since the spark landed, radians (clockwise). */
export function turn(t: number): number {
  const { i, f } = notchAt(t)
  return (i + f) * NOTCH
}

/** Arm `k`'s angle at `t` (arm 0 carries the spark). */
export const armAngle = (k: number, t: number): number => THETA0 + (k * 2 * Math.PI) / ARMS + turn(t)
/** Arm `k`'s pivot, where its frame hangs. */
export const pivotOf = (k: number, t: number): Pt => {
  const a = armAngle(k, t)
  return [C[0] + RIM * Math.cos(a), C[1] + RIM * Math.sin(a)]
}

/* ------------------------------------------------------------------ the frames' swing */

/** The vat: a tall tub of staves and hoops, its rim, the warm tallow in it. */
export const VAT = { x0: -23.35, x1: -18.55, rim: 6.3, wax: 6.52, lip: 0.2 }
/** How far a frame's candles hang below its pin, to their feet (cells). */
const DEPTH = 2.45
/** How deep in the tallow frame `k`'s candles are at `t`, 0 (clear) to 1 (half a cell or more). */
const dipOf = (k: number, t: number): number => {
  const [x, y] = pivotOf(k, t)
  if (x < VAT.x0 || x > VAT.x1) return 0
  return Math.max(0, Math.min(1, (y + DEPTH - VAT.wax) / 0.5))
}

/**
 * Each frame is a damped pendulum on its pin. While the wheel creeps it hangs, leaning a little as the pivot eases
 * off and on. The drop is too quick for it to lag, so it rides the lurch with its arm; when the wheel stops dead on
 * the note it swings on the way it was going, a long damped sway (`TAU`), and the spark rides its frame's swing.
 * The spark's frame also tips on its load: the spark stands east of its middle, so a stop going down dips that end.
 * A frame whose candles are down in the tallow is held by it: it swings less and settles sooner (the last click, with
 * the spark's frame low over the vat, comes to rest).
 * Integrated once, over the time the wheel moves and a while after, and read back by time.
 */
const SWING = { from: LAND - 0.2, to: 70, dt: 0.001, every: 5 }
/** The frame's length for the pivot's pull (cells), its sway's period (s) and its decay's time constant (s). */
const LEN = 1.5
const PERIOD = 1.0
const TAU = 0.4
const K = (2 * Math.PI / PERIOD) ** 2
/** How much of the pivot's speed at the stop the frame carries on with (a stiff pin keeps it from all of it). */
const KICK = 0.24
/** The spark's weight on its frame, east of the middle: its lean (radians, at rest) and its lever on a stop. */
const LEAN = 0.05
const LEVER = 0.2
const swings: Float32Array[] = []
function integrate(): void {
  const steps = Math.round((SWING.to - SWING.from) / SWING.dt)
  const h = 0.002
  const vel = (k: number, t: number): Pt => {
    const p0 = pivotOf(k, t - 2e-4)
    const p1 = pivotOf(k, t - 1e-4)
    return [(p1[0] - p0[0]) / 1e-4, (p1[1] - p0[1]) / 1e-4]
  }
  for (let k = 0; k < ARMS; k++) {
    const out = new Float32Array(Math.floor(steps / SWING.every) + 2)
    let a = 0
    let w = 0
    let next = 0
    for (let s = 0; s <= steps; s++) {
      const t = SWING.from + s * SWING.dt
      if (s % SWING.every === 0) out[s / SWING.every] = a
      const laden = k === 0 && t >= LAND && t < TAKEOFF
      // The pivot's pull, except over a drop: the frame is carried through the lurch with its arm.
      const inDrop = CLICKS.some((c) => t > c - DROP - 2 * h && t < c + 2 * h)
      let force = 0
      if (!inDrop) {
        const p0 = pivotOf(k, t - h)
        const p1 = pivotOf(k, t)
        const p2 = pivotOf(k, t + h)
        const ax = (p2[0] - 2 * p1[0] + p0[0]) / (h * h)
        const ay = (p2[1] - 2 * p1[1] + p0[1]) / (h * h)
        force = (ax * Math.cos(a) + ay * Math.sin(a)) / LEN
      }
      const dip = dipOf(k, t)
      let acc = -K * Math.sin(a) + force - ((2 + 4 * dip) / TAU) * w + (laden ? K * LEAN * Math.cos(a) : 0)
      if (!Number.isFinite(acc)) acc = 0
      w += acc * SWING.dt
      a += w * SWING.dt
      // The stop on the note: the frame swings on with the speed its pin had (and the spark's frame tips on its load).
      if (next < CLICKS.length && t >= CLICKS[next]) {
        const [vx, vy] = vel(k, CLICKS[next])
        const held = 1 - 0.45 * dip
        w += held * ((KICK * -(vx * Math.cos(a) + vy * Math.sin(a))) / LEN + (laden ? (LEVER * vy) / LEN : 0))
        next++
      }
      if (k === 0 && Math.abs(t - LAND) < SWING.dt / 2) w += 0.6
      if (k === 0 && Math.abs(t - TAKEOFF) < SWING.dt / 2) w -= 0.45
    }
    swings.push(out)
  }
}
integrate()

/** Frame `k`'s swing at `t`, radians (clockwise: its bar's east end dips). */
export function swingOf(k: number, t: number): number {
  if (t <= SWING.from) return 0
  const table = swings[k]
  const f = (t - SWING.from) / (SWING.dt * SWING.every)
  const i = Math.floor(f)
  if (i >= table.length - 1) return table[table.length - 1] * Math.exp(-(t - SWING.to))
  return table[i] + (table[i + 1] - table[i]) * (f - i)
}

/** A point of frame `k`, from its pivot in the frame's own cells (x along the bar, y down the hanger), at `t`. */
export function onFrame(k: number, t: number, lx: number, ly: number): Pt {
  const [px, py] = pivotOf(k, t)
  const a = swingOf(k, t)
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [px + lx * c - ly * s, py + lx * s + ly * c]
}

/** Where the spark is while it rides its frame. */
export const seatAt = (t: number): Pt => onFrame(0, t, SEAT, HANG - R)

/* ------------------------------------------------------------------ the vat and the ladle */

/** The ladle leaning on the vat: its bowl hooked over the east rim, its handle's end on the floor. */
export const LADLE = { top: [VAT.x1 + 0.12, VAT.rim + 0.14] as Pt, foot: [-13.2, FLOOR_Y - 0.06] as Pt, thick: 0.19 }
const LDX = LADLE.foot[0] - LADLE.top[0]
const LDY = LADLE.foot[1] - LADLE.top[1]
export const LADLE_LEN = Math.hypot(LDX, LDY)
const LU: Pt = [LDX / LADLE_LEN, LDY / LADLE_LEN]
/** The spark's centre `s` cells down the handle from its top (it rides on the handle, `R` and half the rod above it). */
export const onLadle = (s: number): Pt => {
  const off = R + LADLE.thick / 2
  return [LADLE.top[0] + LU[0] * s + LU[1] * off, LADLE.top[1] + LU[1] * s - LU[0] * off]
}

/* ------------------------------------------------------------------ the ratchet and its pawl */

/** The ratchet's teeth: root and crest radii, and the steep face's share of a notch. */
const ROOT = 0.745
const TOP = 0.88
const FACE = 0.06
/** The pawl: its hinge from the axle, its length. Its angle `pa` points hinge → tip (y down); smaller is lifted. */
const HINGE: Pt = [-1.02, -0.88]
const PAWL = 0.64
const tipOf = (pa: number): Pt => [HINGE[0] + PAWL * Math.cos(pa), HINGE[1] + PAWL * Math.sin(pa)]
/** The pawl's angle with its tip on a crest; the teeth are laid so a crest is under it as each drop begins. */
const PA_C = (() => {
  let lo = -0.3
  let hi = 0.7
  for (let n = 0; n < 40; n++) {
    const m = (lo + hi) / 2
    if (Math.hypot(...tipOf(m)) > TOP) lo = m
    else hi = m
  }
  return (lo + hi) / 2
})()
/** Where the teeth sit on the wheel: set so the pawl slips off a crest just as each drop begins (calibrated below). */
let PHI_C = Math.atan2(tipOf(PA_C)[1], tipOf(PA_C)[0])

/** The teeth's radius at angle `phi` (about the axle) when the wheel has turned `rot`. */
function toothR(phi: number, rot: number): number {
  const N = NOTCH
  let psi = (phi - rot - PHI_C) % N
  if (psi < 0) psi += N
  const u = psi / N
  if (u < 1 - CREEP - FACE) return ROOT
  if (u < 1 - CREEP) return ROOT + ((TOP - ROOT) * (u - (1 - CREEP - FACE))) / FACE
  return TOP - ((TOP - ROOT) * (u - (1 - CREEP))) / CREEP
}

/** Where the pawl rests on the teeth at a turn `rot`: lowered from lifted until its tip first touches. */
function restPa(rot: number): number {
  const touches = (pa: number) => {
    const [x, y] = tipOf(pa)
    return Math.hypot(x, y) <= toothR(Math.atan2(y, x), rot)
  }
  let lo = -0.3
  let hi = lo
  for (let pa = -0.3; pa <= 0.7; pa += 0.01) {
    if (touches(pa)) {
      hi = pa
      break
    }
    lo = pa
    hi = 0.7
  }
  for (let n = 0; n < 8; n++) {
    const m = (lo + hi) / 2
    if (touches(m)) hi = m
    else lo = m
  }
  return lo
}

// The tip meets the crest a hair before the arithmetic says (it is a point, and swings as it lifts): find where it
// slips off, and turn the teeth back by that much and a little more, so it leaves the crest inside the drop.
{
  let lo = 0.4 * NOTCH
  let hi = CREEP * NOTCH
  const high = restPa(lo)
  for (let n = 0; n < 30; n++) {
    const m = (lo + hi) / 2
    if (restPa(m) - high < 0.1) lo = m
    else hi = m
  }
  PHI_C -= CREEP * NOTCH - lo + 0.004 * NOTCH
}

/**
 * The pawl's angle at `t`. It rides up each tooth's ramp as the wheel creeps; off the crest it falls (gravity: slow,
 * then fast) while the wheel lurches, and lands on the next tooth on the note, bouncing twice, smaller.
 */
export function pawlAngle(t: number): number {
  let pa = restPa(turn(t))
  const { crest, b } = notchAt(t)
  if (t > crest && t < b) {
    const top = restPa(turn(crest))
    const land = restPa(turn(b))
    const x = (t - crest) / DROP
    pa = Math.min(pa, top + (land - top) * x * x)
  }
  for (const c of CLICKS) {
    const dt = t - c
    if (dt >= 0 && dt < 0.3) pa -= 0.07 * Math.exp(-dt / 0.06) * Math.abs(Math.sin((Math.PI * dt) / 0.055))
  }
  return pa
}

/* ------------------------------------------------------------------ drawing */

const F = FLOOR_Y

function ring(cx: number, cy: number, r: number, n = 48): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  return out
}

/** The whole wheel, its trestle, the vat and the ladle, at show time `t`. */
export function drawWheel(p: p5, k: number, ink: string, weight: number, L: Light, t: number): void {
  const w = weight
  const wood = (x: number, y: number, amb = 0.5) => shade(L, x, y, LOFT.wood, LOFT.woodLit, amb)
  const iron = (x: number, y: number) => shade(L, x, y, LOFT.iron, LOFT.ironLit, 0.7)
  const moonWood = (x: number, y: number) => mixHex(wood(x, y), LOFT.moonDeep, 0.18)
  p.push()
  p.stroke(ink)
  p.strokeJoin(p.ROUND)

  // The trestle behind: an A of two oak legs from the axle's block to the floor, and a stretcher low between them.
  const apex: Pt = [C[0], C[1] - 0.55]
  const footW: Pt = [C[0] - 3.95, F]
  const footE: Pt = [C[0] + 3.95, F]
  const legPoly = (a: Pt, b: Pt, wd: number): Pt[] => {
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l = Math.hypot(dx, dy)
    const nx = (-dy / l) * wd
    const ny = (dx / l) * wd
    return [
      [a[0] + nx, a[1] + ny],
      [b[0] + nx, b[1] + ny],
      [b[0] - nx, b[1] - ny],
      [a[0] - nx, a[1] - ny],
    ]
  }
  p.strokeWeight(w * 0.8)
  for (const foot of [footW, footE]) {
    const pts = legPoly(apex, foot, 0.2)
    p.fill(moonWood((apex[0] + foot[0]) / 2, 7))
    poly(p, k, pts)
    lightOn(p, k, L, pts, LOFT.woodLit, 0.7)
  }
  const st = 9.0
  const sx = (y: number, foot: Pt) => apex[0] + ((foot[0] - apex[0]) * (y - apex[1])) / (foot[1] - apex[1])
  p.fill(moonWood(C[0], st))
  poly(p, k, [[sx(st - 0.15, footW), st - 0.15], [sx(st - 0.15, footE), st - 0.15], [sx(st + 0.15, footE), st + 0.15], [sx(st + 0.15, footW), st + 0.15]])

  // The vat's back half and the tallow's surface, seen a little from above.
  const vcx = (VAT.x0 + VAT.x1) / 2
  const vr = (VAT.x1 - VAT.x0) / 2
  const oval = (y: number, rx: number, ry: number, from: number, to: number, n = 24): Pt[] => {
    const out: Pt[] = []
    for (let i = 0; i <= n; i++) {
      const a = from + ((to - from) * i) / n
      out.push([vcx + Math.cos(a) * rx, y + Math.sin(a) * ry])
    }
    return out
  }
  p.fill(mixHex(wood(vcx, VAT.rim), LOFT.night, 0.35))
  p.strokeWeight(w * 0.7)
  poly(p, k, oval(VAT.rim, vr, VAT.lip, 0, Math.PI * 2, 32))
  // The tallow: warm ivory, ringed where the candles go in.
  const tallowDark = mixHex(LOFT.tallow, LOFT.beeswax, 0.35)
  p.fill(shade(L, vcx, VAT.wax, mixHex(tallowDark, LOFT.night, 0.3), tallowDark, 0.4))
  p.strokeWeight(w * 0.5)
  poly(p, k, oval(VAT.rim + 0.06, vr - 0.16, VAT.lip * 0.7, 0, Math.PI * 2, 32))

  // The wheel: rim, spokes, hub. Then the ratchet on the hub and the pawl on the trestle.
  const rot = turn(t)
  const base = armAngle(0, t) - rot
  p.fill(wood(C[0], C[1], 0.45))
  p.strokeWeight(w * 0.85)
  const outer = ring(C[0], C[1], RIM + 0.12, 64)
  const inner = ring(C[0], C[1], RIM - 0.12, 64)
  // The rim as a band: outer circle, then the inner one backwards (the canvas fills the band between).
  p.beginShape()
  for (const [x, y] of outer) p.vertex(x * k, y * k)
  p.beginContour()
  for (const [x, y] of [...inner].reverse()) p.vertex(x * k, y * k)
  p.endContour()
  p.endShape(p.CLOSE)
  lightOn(p, k, L, outer, LOFT.woodLit, 0.6)
  for (let j = 0; j < ARMS; j++) {
    const a = base + rot + (j * 2 * Math.PI) / ARMS
    const c = Math.cos(a)
    const s = Math.sin(a)
    const nx = -s * 0.09
    const ny = c * 0.09
    p.fill(wood(C[0] + c * 1.6, C[1] + s * 1.6, 0.45))
    p.strokeWeight(w * 0.7)
    poly(p, k, [
      [C[0] + c * 0.4 + nx, C[1] + s * 0.4 + ny],
      [C[0] + c * (RIM - 0.1) + nx, C[1] + s * (RIM - 0.1) + ny],
      [C[0] + c * (RIM - 0.1) - nx, C[1] + s * (RIM - 0.1) - ny],
      [C[0] + c * 0.4 - nx, C[1] + s * 0.4 - ny],
    ])
  }
  // The ratchet: sixteen teeth, raked the way it turns (a long ramp the pawl rides up, a short steep face it drops off).
  const a0 = rot + PHI_C
  const teeth: Pt[] = []
  for (let j = 0; j < 16; j++) {
    const a = a0 + j * NOTCH
    for (const [f, r] of [[0, ROOT], [1 - CREEP - FACE, ROOT], [1 - CREEP, TOP]] as const) {
      teeth.push([C[0] + Math.cos(a + f * NOTCH) * r, C[1] + Math.sin(a + f * NOTCH) * r])
    }
  }
  p.fill(iron(C[0], C[1]))
  p.strokeWeight(w * 0.7)
  poly(p, k, teeth)
  lightOn(p, k, L, teeth, LOFT.glow, 0.4)
  // The axle's square end.
  p.fill(mixHex(iron(C[0], C[1]), LOFT.pewter, 0.25))
  const q = 0.2
  const ca = Math.cos(base + rot)
  const sa = Math.sin(base + rot)
  poly(p, k, [
    [C[0] + (ca - sa) * q, C[1] + (sa + ca) * q],
    [C[0] + (-ca - sa) * q, C[1] + (-sa + ca) * q],
    [C[0] + (-ca + sa) * q, C[1] + (-sa - ca) * q],
    [C[0] + (ca + sa) * q, C[1] + (sa - ca) * q],
  ])
  // The pawl: hinged on a bracket off the axle's block, its tip riding the teeth (see `pawlAngle`).
  const hinge: Pt = [C[0] + HINGE[0], C[1] + HINGE[1]]
  const pa = pawlAngle(t)
  const tip: Pt = [hinge[0] + PAWL * Math.cos(pa), hinge[1] + PAWL * Math.sin(pa)]
  const ux = Math.cos(pa)
  const uy = Math.sin(pa)
  p.fill(iron(hinge[0], hinge[1]))
  p.strokeWeight(w * 0.6)
  poly(p, k, [[apex[0] - 0.1, apex[1] - 0.05], [hinge[0] - 0.05, hinge[1] - 0.08], [hinge[0] - 0.05, hinge[1] + 0.08], [apex[0] - 0.1, apex[1] + 0.12]])
  p.strokeWeight(w * 0.7)
  poly(p, k, [
    [hinge[0] - uy * 0.08, hinge[1] + ux * 0.08],
    [tip[0], tip[1]],
    [hinge[0] + uy * 0.08, hinge[1] - ux * 0.08],
    [hinge[0] - ux * 0.1, hinge[1] - uy * 0.1],
  ])

  // The frames, each on its arm's pin: hanger, bar, candles on their wicks.
  for (let j = 0; j < ARMS; j++) drawFrame(p, k, ink, w, L, t, j)

  // The vat's front, over the dipped candles: staves, three hoops, and the near half of its rim.
  const body: Pt[] = [[VAT.x1, VAT.rim], ...oval(VAT.rim, vr, VAT.lip, 0, Math.PI, 20).slice(1), [VAT.x0, VAT.rim], [VAT.x0 + 0.12, F], [VAT.x1 - 0.12, F]]
  p.fill(moonWood(vcx, 8.5))
  p.strokeWeight(w * 0.85)
  poly(p, k, body)
  lightOn(p, k, L, body, LOFT.woodLit, 0.75)
  p.strokeWeight(w * 0.45)
  for (let j = 1; j < 7; j++) {
    const x = VAT.x0 + ((VAT.x1 - VAT.x0) * j) / 7
    const yTop = VAT.rim + VAT.lip * Math.sin(Math.acos(Math.max(-1, Math.min(1, (x - vcx) / vr))))
    p.line(x * k, (yTop + 0.02) * k, (x + (x - vcx) * -0.02) * k, (F - 0.02) * k)
  }
  p.fill(iron(vcx, 8))
  p.strokeWeight(w * 0.6)
  for (const y of [7.35, 9.0, 10.55]) {
    const hoop = [...oval(y - 0.09, vr + 0.03, VAT.lip * 0.9, 0, Math.PI, 16), ...oval(y + 0.09, vr + 0.03, VAT.lip * 0.9, Math.PI, 0, 16)]
    poly(p, k, hoop)
  }

  // The ladle, leaning on the vat: its bowl hooked over the rim, the iron handle down to the floor. A dark iron shaft
  // in the shadow under the bench, lit only where the spark (or the fire) is near it: never a pale line across the room.
  const [lx0, ly0] = LADLE.top
  const [lx1, ly1] = LADLE.foot
  const nx = -LU[1] * LADLE.thick * 0.5
  const ny = LU[0] * LADLE.thick * 0.5
  const handle: Pt[] = [[lx0 + nx, ly0 + ny], [lx1 + nx, ly1 + ny], [lx1 - nx, ly1 - ny], [lx0 - nx, ly0 - ny]]
  p.fill(shade(L, (lx0 + lx1) / 2, (ly0 + ly1) / 2, LOFT.iron, mixHex(LOFT.ironLit, LOFT.pewter, 0.5), 0.55, false))
  p.strokeWeight(w * 0.7)
  poly(p, k, handle)
  lightOn(p, k, L, handle, mixHex(LOFT.pewter, LOFT.glow, 0.4), 0.8)
  // The bowl: a shallow cup over the rim, its mouth to the vat.
  const bowl: Pt[] = []
  for (let j = 0; j <= 12; j++) {
    const a = Math.PI * (j / 12)
    bowl.push([lx0 - 0.05 - Math.cos(a) * 0.36, ly0 - 0.08 + Math.sin(a) * 0.24])
  }
  p.fill(mixHex(iron(lx0, ly0), LOFT.pewter, 0.3))
  p.strokeWeight(w * 0.65)
  poly(p, k, [[lx0 - 0.44, ly0 - 0.12], ...bowl.map(([x, y]) => [x - 0.08, y] as Pt), [lx0 + 0.3, ly0 - 0.12]])
  // A hook at the handle's end, on the floor.
  p.noFill()
  p.strokeWeight(w * 0.7)
  p.beginShape()
  for (let j = 0; j <= 8; j++) {
    const a = Math.PI * 0.5 + (j / 8) * Math.PI * 1.1
    p.vertex((lx1 + LU[0] * 0.05 + Math.cos(a) * 0.1) * k, (ly1 - 0.1 + Math.sin(a) * 0.1) * k)
  }
  p.endShape()

  p.pop()
}

/** One frame: its hanger from the arm's pin, its bar, its three candles. */
function drawFrame(p: p5, k: number, ink: string, w: number, L: Light, t: number, j: number): void {
  const at = (lx: number, ly: number) => onFrame(j, t, lx, ly)
  const [px, py] = pivotOf(j, t)
  const tallow = (x: number, y: number) => shade(L, x, y, LOFT.tallow, LOFT.tallow, 0.3)
  // The pin and the hanger: a flat iron strap down to the bar's middle.
  p.fill(shade(L, px, py, LOFT.iron, LOFT.ironLit, 0.7))
  p.strokeWeight(w * 0.55)
  poly(p, k, [at(-0.045, 0), at(0.045, 0), at(0.045, HANG), at(-0.045, HANG)])
  poly(p, k, [
    [px - 0.07, py - 0.07],
    [px + 0.07, py - 0.07],
    [px + 0.07, py + 0.07],
    [px - 0.07, py + 0.07],
  ])
  // The candles, each hanging by its wick from the bar; fatter the more they have been dipped (frame by frame).
  const fat = 0.1 + 0.035 * ((j * 3) % 8) * 0.5 + 0.02 * hash(j, 1)
  for (let i = 0; i < CANDLES.length; i++) {
    const cx = CANDLES[i] + 0.02 * (hash(j, i) - 0.5)
    const wickTop = at(cx, HANG + BAR.thick * 0.5)
    const top = at(cx, HANG + BAR.thick + 0.1)
    const len = CANDLE_LEN * (0.92 + 0.12 * hash(j, i + 7))
    const w0 = 0.07 + fat * 0.5
    const w1 = 0.1 + fat
    // A dipped taper: slim at the wick, fuller below, and a soft round foot where the last dip dripped.
    const y0 = HANG + BAR.thick + 0.1
    const foot = y0 + len - w1 * 0.4
    const pts: Pt[] = [at(cx - w0 / 2, y0), at(cx + w0 / 2, y0), at(cx + w1 / 2, foot)]
    for (let m = 1; m < 8; m++) {
      const a = (m / 8) * Math.PI
      pts.push(at(cx + (Math.cos(a) * w1) / 2, foot + Math.sin(a) * w1 * 0.4))
    }
    pts.push(at(cx - w1 / 2, foot))
    p.fill(tallow(top[0], top[1] + 0.5))
    p.stroke(ink)
    p.strokeWeight(w * 0.5)
    poly(p, k, pts)
    lightOn(p, k, L, pts, LOFT.glow, 0.8)
    // The wick, over the bar.
    p.stroke(shade(L, top[0], top[1], LOFT.wick, LOFT.wick, 0.45))
    p.strokeWeight(w * 0.55)
    p.line(wickTop[0] * k, wickTop[1] * k, top[0] * k, top[1] * k)
  }
  // The bar.
  const bar: Pt[] = [at(-BAR.half, HANG), at(BAR.half, HANG), at(BAR.half, HANG + BAR.thick), at(-BAR.half, HANG + BAR.thick)]
  const [bx, by] = at(0, HANG)
  p.fill(shade(L, bx, by, LOFT.wood, LOFT.woodLit, 0.5))
  p.stroke(ink)
  p.strokeWeight(w * 0.6)
  poly(p, k, bar)
  lightOn(p, k, L, bar, LOFT.woodLit, 0.8)
}

/** Every cell the wheel, its vat and ladle cover (world cells). */
export function wheelCells(): Pt[] {
  const out: Pt[] = []
  for (let x = Math.floor(C[0] - RIM - 2.5); x <= Math.ceil(LADLE.foot[0] + 1); x++) for (let y = Math.floor(C[1] - RIM - 1.5); y <= Math.ceil(F + 0.5); y++) out.push([x, y])
  return out
}
