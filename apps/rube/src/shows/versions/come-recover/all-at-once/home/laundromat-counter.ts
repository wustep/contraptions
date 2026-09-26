import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { clamp, easeInOutSine, easeOutCubic } from '../../../../../../../../src/core/ease'
import { FLOOR, R, mixHex, type Pt } from '../../../../../parts'
import { alpha, hash, knock, smooth } from '../kit'
import { HOME } from '../worlds'
import { COUNTER, type Pen } from './set'

/**
 * The taxes, on the service counter: the adding machine with its keys, its crank and its paper tape; the heap of
 * receipts the ball lands in on the great hit's swell; the receipt spike; and the audit letter, which comes down
 * last of all and is spiked on top of the receipts.
 *
 * All drawn from show time. The ball's own path over them is the laundromat part's; these are what it touches.
 */

const TOP = COUNTER.top

/* ------------------------------------------------------------------ the adding machine */

/** Its body (a box on the counter), and the long stepped ramp of keys down its right side. */
export const MACHINE = { x0: 0.46, x1: 1.0, top: TOP - 0.3 }
const RAMP_A: Pt = [1.0, TOP - 0.29]
const RAMP_B: Pt = [1.94, TOP - 0.02]
export const KEY_N = 7
const RAMP_DIR: Pt = (() => {
  const l = Math.hypot(RAMP_A[0] - RAMP_B[0], RAMP_A[1] - RAMP_B[1])
  return [(RAMP_A[0] - RAMP_B[0]) / l, (RAMP_A[1] - RAMP_B[1]) / l]
})()
/** The ramp's normal, out of its face (up and to the right). */
const RAMP_N: Pt = [-RAMP_DIR[1], RAMP_DIR[0]]
const KEY_H = 0.055

/** Key i's cap (0 the lowest, at the ramp's foot; KEY_N - 1 the highest). */
function keyBase(i: number): Pt {
  const f = 0.08 + (0.84 * i) / (KEY_N - 1)
  return [RAMP_B[0] + (RAMP_A[0] - RAMP_B[0]) * f, RAMP_B[1] + (RAMP_A[1] - RAMP_B[1]) * f]
}

/** Where the ball sits on key i (pressed). */
export function onKey(i: number): Pt {
  const [x, y] = keyBase(i)
  // A key pressed sits flush with the ramp: the ball rests on its cap, a key's height up, straight above.
  const up = KEY_H * 0.4 + R + 0.01
  return [x, y - up / Math.max(0.5, -RAMP_N[1])]
}

/**
 * The ball's strokes on the keys: when each is struck, and which (0 the lowest, at the ramp's foot; 6 the top). She
 * works the whole keyboard: rolls to a key on a long gap, bounces from key to key on the quick notes of the soft run
 * (a run up the keys on 25.2 to 25.8, a hop-scotch on 27.1 to 28.5), and the machine works for her on every one.
 */
export const KEYSTROKES: [number, number][] = [
  [19.783, 0],
  [20.538, 2],
  [21.165, 3],
  [23.394, 5],
  [23.742, 2],
  [25.217, 1],
  [25.287, 2],
  [25.472, 3],
  [25.6, 4],
  [25.716, 5],
  [25.844, 6],
  [26.413, 4],
  [27.051, 6],
  [27.411, 3],
  [27.748, 5],
  [28.154, 2],
  [28.537, 4],
  [29.373, 6],
  [29.443, 5],
  [30.093, 6],
]

/** How far key i is down at `t`, 0..1: struck, held while she is on it, sprung back as she leaves. */
export function keyDown(i: number, t: number): number {
  let v = 0
  for (let j = 0; j < KEYSTROKES.length; j++) {
    const [at, key] = KEYSTROKES[j]
    if (key !== i || t < at - 0.02) continue
    const leave = j + 1 < KEYSTROKES.length ? KEYSTROKES[j + 1][0] - 0.06 : THE_TOTAL - 0.35
    const down = smooth(t, at - 0.02, at + 0.015)
    const up = t > leave ? Math.exp(-(t - leave) / 0.05) : 1
    v = Math.max(v, down * up)
  }
  return v
}

/* ------------------------------------------------------------------ the crank */

/** The crank on the machine's left side: its pivot, length, and the swing of its arm (radians above level, out to the left). */
export const CRANK = { pivot: [MACHINE.x0, TOP - 0.25] as Pt, len: 0.44 }
/** She rolls out onto the crank's arm, it goes down under her to its stop (the total, on the first big hit), and its spring throws her. */
export const ONTO_CRANK = 30.36
export const THE_TOTAL = 30.65
/** How long the spring takes to throw the arm back up to where she leaves it, and the angle she leaves at. */
export const THROW = { dur: 0.12, from: -0.66, at: 0.3 }
export const RELEASE = THE_TOTAL + THROW.dur

/** The crank's angle at `t` (radians above level): at rest, down under her, thrown, and ringing to rest. */
export function crankAngle(t: number): number {
  if (t < ONTO_CRANK + 0.08) return ratchet(t)
  if (t < THE_TOTAL) {
    // Her weight takes it down, faster and faster, to its stop.
    const u = (t - ONTO_CRANK - 0.08) / (THE_TOTAL - ONTO_CRANK - 0.08)
    return THROW.from * u * u
  }
  if (t < RELEASE) {
    // The spring: the stop's knock, then up, fastest as she leaves it.
    const u = (t - THE_TOTAL) / THROW.dur
    return THROW.from + (THROW.at - THROW.from) * u * u
  }
  // Free of her it goes on up past, and rings down to rest.
  const u = t - RELEASE
  const w = (2 * (THROW.at - THROW.from)) / THROW.dur
  return (THROW.at + (w / 14) * Math.sin(u * 14)) * Math.exp(-u / 0.22)
}

/** The machine working: on every key the crank ratchets down a notch and springs back, and the body clacks. */
export function ratchet(t: number): number {
  let a = 0
  for (const [at] of KEYSTROKES) {
    const u = t - at
    if (u < 0 || u > 0.6) continue
    a += u < 0.025 ? (-0.13 * u) / 0.025 : -0.13 * Math.exp(-(u - 0.025) / 0.09) * Math.cos((u - 0.025) * 26)
  }
  return a
}

/** The machine's body, jolted by each stroke (cells, up). */
export function clack(t: number): number {
  let v = 0
  for (const [at] of KEYSTROKES) v += 0.014 * knock(t - at, 0.05)
  return v + 0.03 * knock(t - THE_TOTAL, 0.08)
}

/** A point on the crank's arm, `s` along it from the pivot, at angle `a`. */
export function crankPoint(s: number, a: number): Pt {
  const [px, py] = CRANK.pivot
  return [px - Math.cos(a) * s, py - Math.sin(a) * s]
}

/** Where the ball sits in the crank's cup, at angle `a`. */
export function inCup(a: number): Pt {
  const [cx, cy] = crankPoint(CRANK.len - 0.06, a)
  // Up off the arm, square to it.
  const nx = Math.sin(a)
  const ny = -Math.cos(a)
  return [cx + nx * (R + 0.035), cy + ny * (R + 0.035)]
}

/** How far the cup's tip moves per radian: the arm's throw speed at release, cells a second. */
export const THROW_SPEED = ((2 * (THROW.at - THROW.from)) / THROW.dur) * (CRANK.len - 0.06)

/* ------------------------------------------------------------------ the tape */

/** How much tape is out at `t`: a curl to start, a bit more with every key, a long run on the total. */
export function tapeOut(t: number): number {
  let n = 0.28
  for (const [at] of KEYSTROKES) n += 0.19 * clamp((t - at) / 0.12)
  n += 1.05 * easeOutCubic(clamp((t - THE_TOTAL) / 0.45))
  return n
}

/** The tape's path: out of the machine's left face, over the counter's end, down its face, and in loops on the floor. */
const TAPE_PATH: Pt[] = (() => {
  const pts: Pt[] = []
  const x0 = MACHINE.x0
  const y0 = TOP - 0.1
  pts.push([x0, y0])
  pts.push([x0 - 0.08, y0 - 0.01])
  // Over the counter's left end in a curl.
  for (let i = 0; i <= 6; i++) {
    const a = -Math.PI / 2 - (i / 6) * (Math.PI / 2)
    pts.push([COUNTER.x0 + 0.06 + Math.cos(a) * 0.12, y0 + 0.12 + Math.sin(a) * 0.12])
  }
  // Down the counter's end, swaying as it falls.
  for (let y = y0 + 0.2; y < FLOOR - 0.16; y += 0.08) pts.push([COUNTER.x0 - 0.1 + 0.035 * Math.sin(y * 7), y])
  // On the floor, in loops that pile up as more comes: each loop a curl, the pile spreading left and rising.
  for (let i = 0; i < 16; i++) {
    const cx = COUNTER.x0 - 0.16 - 0.055 * i
    const cyc = FLOOR - 0.14 - Math.min(0.2, 0.018 * i)
    const r = 0.12 + 0.05 * hash(i, 4)
    for (let j = 0; j <= 10; j++) {
      const a = Math.PI / 2 + (j / 10) * Math.PI * 2 * (i % 2 ? 1 : -1)
      pts.push([cx + Math.cos(a) * r * 1.1, cyc + Math.sin(a) * r * 0.8])
    }
  }
  return pts
})()
const TAPE_LEN: number[] = (() => {
  const out = [0]
  for (let i = 1; i < TAPE_PATH.length; i++) out.push(out[i - 1] + Math.hypot(TAPE_PATH[i][0] - TAPE_PATH[i - 1][0], TAPE_PATH[i][1] - TAPE_PATH[i - 1][1]))
  return out
})()

function drawTape(pen: Pen, t: number): void {
  const { p, k, ink } = pen
  const L = tapeOut(t)
  const pts: Pt[] = []
  for (let i = 0; i < TAPE_PATH.length; i++) {
    if (TAPE_LEN[i] > L) {
      const a = TAPE_PATH[i - 1]
      const b = TAPE_PATH[i]
      const f = (L - TAPE_LEN[i - 1]) / (TAPE_LEN[i] - TAPE_LEN[i - 1])
      pts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f])
      break
    }
    pts.push(TAPE_PATH[i])
  }
  // A strip of paper: ink round it, paper in it. It trembles a little each time it is fed.
  const feed = KEYSTROKES.reduce((m, [at]) => Math.max(m, knock(t - at, 0.08)), 0) + knock(t - THE_TOTAL, 0.15)
  for (const [col, wt] of [[ink, 0.075], [HOME.paper, 0.045]] as [string, number][]) {
    p.noFill()
    p.stroke(col)
    p.strokeWeight(Math.max(1.5, wt * k))
    p.beginShape()
    pts.forEach(([x, y], i) => p.vertex((x - (i < 4 ? feed * 0.01 : 0)) * k, y * k))
    p.endShape()
  }
}

/* ------------------------------------------------------------------ the receipts, the spike, the letter */

/** The heap she lands in, and the spike beside it. */
export const HEAP_X = 2.24
export const SPIKE_X = 2.64
/** The swell after the great hit: she comes down into the heap and it goes up. */
export const INTO_HEAP = 13.665
/** Receipts coming down onto the spike, and the audit letter last, on the spike over them. */
export const SPIKED = [14.687, 14.768, 14.826, 15.197]
export const LETTER_SPIKED = 16.776
const SPIKE_TOP = TOP - 0.56

interface Slip {
  /** Where it was in the heap, where it flies to (the top of its flight), and where and when it comes to rest. */
  from: Pt
  peak: Pt
  land: Pt
  at: number
  /** When it reaches its peak. */
  top: number
  /** Its size and colour. */
  w: number
  h: number
  tint: string
  spin: number
  /** On the spike: its stack height there. */
  spiked?: number
}

const SLIPS: Slip[] = (() => {
  const out: Slip[] = []
  const N = 22
  for (let i = 0; i < N; i++) {
    const r1 = hash(i, 1, 7)
    const r2 = hash(i, 2, 7)
    const r3 = hash(i, 3, 7)
    const from: Pt = [HEAP_X - 0.3 + 0.6 * r1, TOP - 0.1 - 0.18 * r2]
    const spike = i < SPIKED.length ? i : -1
    const peak: Pt = spike >= 0 ? [SPIKE_X + (r1 - 0.5) * 0.5, TOP - 1.3 - 0.4 * r2] : [HEAP_X + (r1 - 0.45) * 3.4, TOP - 0.9 - 1.5 * r2]
    const top = INTO_HEAP + 0.28 + 0.2 * r3
    let land: Pt
    let at: number
    if (spike >= 0) {
      land = [SPIKE_X, TOP - 0.06 - 0.035 * spike]
      at = SPIKED[spike]
    } else {
      const lx = peak[0] + (r3 - 0.5) * 0.8
      const onCounter = lx > COUNTER.x0 + 0.05 && lx < COUNTER.x1 - 0.05 && Math.abs(lx - SPIKE_X) > 0.12
      const onMachine = lx > MACHINE.x0 && lx < RAMP_B[0]
      land = [lx, onMachine ? TOP - 0.3 : onCounter ? TOP - 0.01 : FLOOR - 0.01]
      at = top + 1.2 + 2.6 * hash(i, 4, 7) + (onCounter ? 0 : 0.6)
    }
    out.push({ from, peak, land, at, top, w: 0.15 + 0.06 * r2, h: 0.2 + 0.1 * r1, tint: i % 5 === 3 ? mixHex(HOME.paper, HOME.rose, 0.35) : i % 4 === 1 ? mixHex(HOME.paper, HOME.butter, 0.35) : HOME.paper, spin: (r3 - 0.5) * 6, spiked: spike >= 0 ? spike : undefined })
  }
  return out
})()

/** A slip in flight at `t`: thrown up from the heap, then fluttering down to where it lands. */
function slipAt(s: Slip, t: number): { x: number; y: number; a: number; flat: number } {
  if (t < INTO_HEAP) return { x: s.from[0], y: s.from[1], a: 0, flat: 1 }
  if (t < s.top) {
    const u = easeOutCubic((t - INTO_HEAP) / (s.top - INTO_HEAP))
    return { x: s.from[0] + (s.peak[0] - s.from[0]) * u, y: s.from[1] + (s.peak[1] - s.from[1]) * u, a: s.spin * u, flat: 1 - 0.6 * u }
  }
  if (t < s.at) {
    const d = s.at - s.top
    const u = (t - s.top) / d
    // Falling like paper: evenly, swinging side to side, turning over as it swings.
    const fall = u * u * (3 - 2 * u) * 0.35 + u * 0.65
    const sway = Math.sin((t - s.top) * 5.5 + s.spin) * 0.18 * (1 - u)
    const x = s.peak[0] + (s.land[0] - s.peak[0]) * u + sway
    const y = s.peak[1] + (s.land[1] - s.peak[1]) * fall
    return { x, y, a: s.spin + Math.sin((t - s.top) * 5.5 + s.spin) * 0.8 * (1 - u), flat: 0.35 + 0.65 * Math.abs(Math.cos((t - s.top) * 5.5 + s.spin)) }
  }
  return { x: s.land[0], y: s.land[1], a: 0, flat: 0 }
}

/**
 * Two receipts that slide off the spent heap while she works, and flutter down past the counter's front to the
 * floor: the taxes getting away from her. When each starts, where it lands, and when.
 */
const SLIDERS: { from: Pt; at: number; land: Pt; down: number; tint: string }[] = [
  { from: [2.3, TOP - 0.05], at: 24.3, land: [2.62, FLOOR - 0.012], down: 25.9, tint: HOME.paper },
  { from: [2.12, TOP - 0.06], at: 27.2, land: [1.78, FLOOR - 0.012], down: 28.75, tint: mixHex(HOME.paper, HOME.butter, 0.35) },
]

function sliderAt(s: (typeof SLIDERS)[number], t: number): { x: number; y: number; a: number; flat: number } | null {
  if (t < s.at) return null
  const slide = 0.3
  if (t < s.at + slide) {
    const u = easeInOutSine((t - s.at) / slide)
    return { x: s.from[0] + 0.12 * u, y: s.from[1], a: 0.2 * u, flat: 0.25 }
  }
  if (t < s.down) {
    const u = (t - s.at - slide) / (s.down - s.at - slide)
    const x0 = s.from[0] + 0.12
    const ph = (t - s.at) * 5
    return {
      x: x0 + (s.land[0] - x0) * easeInOutSine(u) + 0.14 * Math.sin(ph) * (1 - u),
      y: s.from[1] + (s.land[1] - s.from[1]) * (0.3 * u * u + 0.7 * u),
      a: 0.7 * Math.sin(ph + 0.5) * (1 - u),
      flat: 0.35 + 0.65 * Math.abs(Math.cos(ph)) * (1 - u),
    }
  }
  return { x: s.land[0], y: s.land[1], a: 0, flat: 0 }
}

/** The audit letter: from under the heap, highest of all, down last, onto the spike. */
const LETTER = { from: [HEAP_X, TOP - 0.1] as Pt, peak: [HEAP_X - 0.5, TOP - 2.35] as Pt, top: INTO_HEAP + 0.5, rest: [SPIKE_X, TOP - 0.38] as Pt, w: 0.5, h: 0.32 }

function letterAt(t: number): { x: number; y: number; a: number; flat: number } {
  if (t < INTO_HEAP) return { x: LETTER.from[0], y: LETTER.from[1], a: 0, flat: 0 }
  if (t < LETTER.top) {
    const u = easeOutCubic((t - INTO_HEAP) / (LETTER.top - INTO_HEAP))
    return { x: LETTER.from[0] + (LETTER.peak[0] - LETTER.from[0]) * u, y: LETTER.from[1] + (LETTER.peak[1] - LETTER.from[1]) * u, a: -0.6 * u, flat: u }
  }
  if (t < LETTER_SPIKED) {
    const d = LETTER_SPIKED - LETTER.top
    const u = (t - LETTER.top) / d
    // A falling leaf: wide swings, slow at each end of them, and it comes in square over the spike.
    const ph = (t - LETTER.top) * 2.6
    const sway = Math.sin(ph) * 0.55 * (1 - u * u)
    const x = LETTER.peak[0] + (LETTER.rest[0] - LETTER.peak[0]) * easeInOutSine(u) + sway
    const y = LETTER.peak[1] + (LETTER.rest[1] - 0.08 - LETTER.peak[1]) * u
    return { x, y, a: Math.cos(ph) * 0.5 * (1 - u), flat: 0.55 + 0.45 * Math.abs(Math.sin(ph + 0.6)) * (1 - u) + 0.45 * u }
  }
  // Spiked: it drops the last way down the nail and rings on it.
  const u = t - LETTER_SPIKED
  const y = LETTER.rest[1] - 0.08 * Math.exp(-u / 0.03)
  return { x: LETTER.rest[0], y, a: 0.07 * Math.exp(-u / 0.35) * Math.sin(u * 20), flat: 1 }
}

function drawSlip(pen: Pen, x: number, y: number, sw: number, sh: number, a: number, flat: number, tint: string): void {
  const { p, k, ink, w } = pen
  p.push()
  p.translate(x * k, y * k)
  p.rotate(a)
  solid(p, ink, w * 0.45, tint)
  const fh = Math.max(0.025, sh * flat)
  p.rect(0, 0, sw * k, fh * k, 0.01 * k)
  if (flat > 0.5) {
    p.strokeWeight(Math.max(1, w * 0.3))
    p.stroke(alpha(p, ink, 0.3))
    p.line(-sw * 0.3 * k, -fh * 0.2 * k, sw * 0.25 * k, -fh * 0.2 * k)
    p.line(-sw * 0.3 * k, fh * 0.1 * k, sw * 0.1 * k, fh * 0.1 * k)
  }
  p.pop()
}

/** The letter: an envelope with its window and a red band across it. */
function drawLetter(pen: Pen, t: number): void {
  const { p, k, ink, w } = pen
  const L = letterAt(t)
  if (t < INTO_HEAP) return
  p.push()
  p.translate(L.x * k, L.y * k)
  p.rotate(L.a)
  const h = Math.max(0.03, LETTER.h * L.flat)
  solid(p, ink, w * 0.7, HOME.paper)
  p.rect(0, 0, LETTER.w * k, h * k, 0.015 * k)
  if (L.flat > 0.3) {
    p.noStroke()
    p.fill(HOME.red)
    p.rect(0, (-h / 2 + h * 0.13) * k, (LETTER.w - 0.03) * k, h * 0.14 * k)
    solid(p, ink, w * 0.45, mixHex(HOME.glass, HOME.paper, 0.35))
    p.rect(-LETTER.w * 0.12 * k, h * 0.12 * k, LETTER.w * 0.46 * k, h * 0.3 * k, 0.01 * k)
  }
  p.pop()
}

function drawSpike(pen: Pen, t: number): void {
  const { p, k, ink, w } = pen
  // The nail, then what is on it, then its base.
  const ring = SPIKED.reduce((m, at) => Math.max(m, knock(t - at, 0.1) * Math.sin(Math.max(0, t - at) * 60)), 0) + knock(t - LETTER_SPIKED, 0.2) * Math.sin(Math.max(0, t - LETTER_SPIKED) * 40)
  outline(p, ink, w * 0.9)
  p.stroke(HOME.steelDark)
  p.strokeWeight(Math.max(1.5, 0.035 * k))
  p.line(SPIKE_X * k, TOP * k, (SPIKE_X + ring * 0.01) * k, SPIKE_TOP * k)
  solid(p, ink, w * 0.7, HOME.steel)
  p.ellipse(SPIKE_X * k, (TOP - 0.025) * k, 0.26 * k, 0.07 * k)
}

/* ------------------------------------------------------------------ drawing */

/** The heap on the counter: whole before she lands in it, spent after. */
function drawHeap(pen: Pen, t: number): void {
  const { p, k, ink, w } = pen
  const spent = smooth(t, INTO_HEAP, INTO_HEAP + 0.25)
  const h = 0.3 * (1 - 0.7 * spent)
  const n = 9
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1)) * 2 - 1
    const x = HEAP_X + u * 0.26 * (1 - 0.15 * spent)
    const y = TOP - 0.03 - (1 - u * u) * h * (0.6 + 0.4 * hash(i, 9)) - 0.02
    p.push()
    p.translate(x * k, y * k)
    p.rotate((hash(i, 8) - 0.5) * 1.2)
    solid(p, ink, w * 0.45, i % 3 === 1 ? mixHex(HOME.paper, HOME.butter, 0.35) : HOME.paper)
    p.rect(0, 0, 0.2 * k, 0.12 * k, 0.01 * k)
    p.pop()
  }
}

function drawMachine(pen: Pen, t: number): void {
  const { p, k, ink, w } = pen
  const { x0, x1, top } = MACHINE
  // Every stroke clacks the machine on the counter.
  p.push()
  p.translate(0, -clack(t) * k)
  // The paper roll on its arm over the machine, turning as it feeds.
  const turn = tapeOut(t) / 0.1
  outline(p, ink, w * 0.7)
  p.line((x0 + 0.14) * k, top * k, (x0 + 0.14) * k, (top - 0.3) * k)
  solid(p, ink, w * 0.7, HOME.paper)
  p.circle((x0 + 0.14) * k, (top - 0.3) * k, 0.2 * k)
  solid(p, ink, w * 0.5, HOME.steel)
  p.circle((x0 + 0.14) * k, (top - 0.3) * k, 0.06 * k)
  outline(p, ink, w * 0.4)
  p.line((x0 + 0.14) * k, (top - 0.3) * k, (x0 + 0.14 + Math.cos(turn) * 0.08) * k, (top - 0.3 + Math.sin(turn) * 0.08) * k)
  // The body: grey-green enamel, a dark window where the figures print (no figures).
  solid(p, ink, w, mixHex(HOME.tileDeep, HOME.steel, 0.5))
  p.rect(((x0 + x1) / 2) * k, ((top + TOP) / 2) * k, (x1 - x0) * k, (TOP - top) * k, 0.04 * k)
  solid(p, ink, w * 0.6, mixHex(HOME.night, HOME.steelDark, 0.4))
  p.rect((x0 + 0.2) * k, (top + 0.09) * k, 0.2 * k, 0.07 * k, 0.01 * k)
  // The ramp of keys down its right side, and the keys on it.
  solid(p, ink, w, mixHex(HOME.tileDeep, HOME.steel, 0.5))
  p.beginShape()
  p.vertex(x1 * k, (top + 0.02) * k)
  p.vertex(RAMP_A[0] * k, RAMP_A[1] * k)
  p.vertex(RAMP_B[0] * k, RAMP_B[1] * k)
  p.vertex(RAMP_B[0] * k, TOP * k)
  p.vertex(x1 * k, TOP * k)
  p.endShape(p.CLOSE)
  for (let i = 0; i < KEY_N; i++) {
    const [bx, by] = keyBase(i)
    const d = keyDown(i, t)
    const hgt = KEY_H * (1 - 0.6 * d)
    solid(p, ink, w * 0.6, i === 0 ? HOME.red : HOME.paper)
    p.rect(bx * k, (by - hgt / 2) * k, 0.075 * k, hgt * k, 0.015 * k)
  }
  p.pop()
  // The crank: its arm out to the left, a cup at its end, on a hub.
  const a = crankAngle(t)
  const [ex, ey] = crankPoint(CRANK.len, a)
  p.stroke(ink)
  p.strokeWeight(Math.max(2, 0.055 * k))
  p.line(CRANK.pivot[0] * k, CRANK.pivot[1] * k, ex * k, ey * k)
  p.stroke(HOME.steel)
  p.strokeWeight(Math.max(1, 0.03 * k))
  p.line(CRANK.pivot[0] * k, CRANK.pivot[1] * k, ex * k, ey * k)
  const [cx, cy] = crankPoint(CRANK.len - 0.06, a)
  p.push()
  p.translate(cx * k, cy * k)
  p.rotate(a)
  solid(p, ink, w * 0.7, HOME.red)
  p.arc(0, -0.01 * k, 0.2 * k, 0.12 * k, 0, Math.PI, p.CHORD)
  p.pop()
  solid(p, ink, w * 0.7, HOME.steelDark)
  p.circle(CRANK.pivot[0] * k, CRANK.pivot[1] * k, 0.09 * k)
}

/** Everything on and round the counter that goes behind the ball. */
export function counterBack(pen: Pen, t: number): void {
  drawTape(pen, t)
  drawSpike(pen, t)
  // On the spike, the spiked receipts, in the order they came.
  for (const s of SLIPS) {
    if (s.spiked === undefined || t < s.at) continue
    const u = t - s.at
    const y = s.land[1] - 0.12 * Math.exp(-u / 0.03)
    drawSlip(pen, SPIKE_X, y, s.w, s.h, 0.2 * (hash(s.spiked, 4) - 0.5) + 0.12 * Math.exp(-u / 0.2) * Math.sin(u * 30), 0.2, s.tint)
  }
  if (t >= LETTER_SPIKED) drawLetter(pen, t)
  drawMachine(pen, t)
  drawHeap(pen, t)
  // Slips that have come down, lying where they fell.
  for (const s of SLIPS) {
    if (s.spiked !== undefined || t < s.at) continue
    drawSlip(pen, s.land[0], s.land[1] - 0.012, s.w, s.h, 0, 0.12, s.tint)
  }
  for (const sl of SLIDERS) if (t >= sl.down) drawSlip(pen, sl.land[0], sl.land[1], 0.17, 0.24, 0, 0.12, sl.tint)
}

/** What flies over everything: the receipts in the air, and the letter until it is spiked. */
export function counterAir(pen: Pen, t: number): void {
  for (const sl of SLIDERS) {
    const q = sliderAt(sl, t)
    if (q && t < sl.down) drawSlip(pen, q.x, q.y, 0.17, 0.24, q.a, q.flat, sl.tint)
  }
  if (t < INTO_HEAP || t > 21) return
  for (const s of SLIPS) {
    if (t >= s.at) continue
    const q = slipAt(s, t)
    drawSlip(pen, q.x, q.y, s.w, s.h, q.a, q.flat, s.tint)
  }
  if (t < LETTER_SPIKED) drawLetter(pen, t)
  // The spike pokes up through the letter once it is on.
}

/** The nail's point, over the letter spiked on it. */
export function spikeTip(pen: Pen, t: number): void {
  if (t < LETTER_SPIKED) return
  const { p, k } = pen
  p.stroke(HOME.steelDark)
  p.strokeWeight(Math.max(1.5, 0.035 * k))
  p.line(SPIKE_X * k, (LETTER.rest[1] - 0.12) * k, SPIKE_X * k, SPIKE_TOP * k)
}

/** Where the ball comes down into the heap, and where it rests in it. */
export const HEAP_IN: Pt = [HEAP_X, TOP - R - 0.2]
export const HEAP_REST: Pt = [HEAP_X - 0.05, TOP - R - 0.03]

/** The foot of the key ramp, on the counter: where she comes to it. */
export const RAMP_FOOT: Pt = [RAMP_B[0] + 0.12, TOP - R]
/** The machine's top, where she crosses to the crank. */
export const MACHINE_TOP: Pt = [MACHINE.x0 + 0.14, MACHINE.top - R]

export type { p5 }
