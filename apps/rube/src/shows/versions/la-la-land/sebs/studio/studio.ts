import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { FLOOR, mixHex, type Pt } from '../../../../../parts'
import { beam, box, carried, frame, glow, part, rgba, ring, smooth, type Companion, type Ctx } from '../kit'
import { AT, snap } from '../music'
import { STUDIO_MAT as M } from '../worlds'

/**
 * The white studio (133.352 → 143.639): out of the white, a sound stage. A
 * run of flats stands on the floor, braced at the ends, with a red stage door
 * in the last. He and she roll through the white side by side, slowly, the
 * music breathing in threes; on each phrase's head a painted cut-out rises
 * from the floor on its hinge, like a page of a pop-up book: a palm, the
 * radio towers, the round tower, a streetlamp. Each one stands up behind them
 * as they come to it, and they stop to look. On the last phrase the stage door
 * opens for them and a rose light pours out of it onto the floor.
 *
 * The stage itself is this part's too, for the whole number after it: the
 * painted cloth (the violet-to-rose sky, the mountain, the nine blocks of the
 * sign) hangs in the flies above the flats, drops in front of them to land on
 * the burst (143.639), and colour floods out from the door over the cut-outs
 * and the floor. The Hollywood part stands its machines in front of it.
 *
 * Frame: the ball comes in at (-0.5, 0) under the white and stops on the trap
 * in front of the door, at (DOOR_X, 0), on the burst. The Hollywood part's
 * frame starts at `EXIT`: its x is this frame's x minus `EXIT[0]`.
 */

/** Show seconds. */
const BEGIN = AT.studio
export const BURST = AT.hollywood
/** The phrase heads the cut-outs stand up on: the melody's top notes, 1.86 s apart. */
const onset = (t: number) => snap(t, 0.02)?.t ?? t
const POP_AT = [135.593, 137.451, 139.343, 141.201].map(onset)
/** The last phrase head: the door. */
const DOOR_AT = onset(143.058)
export const STUDIO_HITS: number[] = [...POP_AT, DOOR_AT]

/** Where the flats and the cloth stand, behind the path; the cut-outs' hinges, just behind the balls. */
export const Y_BACK = FLOOR - 0.3
const Y_CLOTH = FLOOR - 0.24
const HINGE = FLOOR - 0.12
/** The trap in front of the door, where he waits for the burst. */
export const DOOR_X = 7.0
export const EXIT: Pt = [DOOR_X + 0.5, 0]
/** The door in its flat. */
const DOOR_W = 0.74
const DOOR_H = 1.62
const DOOR_L = DOOR_X - DOOR_W / 2

/* ------------------------------------------------------------------ the cloth */

/**
 * The painted cloth: its bottom batten hangs at CLOTH_UP in the flies, falls
 * from DROP to land on the burst, and bounces once on the floor. Everything
 * painted on it moves with it: `clothDrop(t)` is how far above its landing it
 * is, and the Hollywood part lights the sign with the same offset.
 */
const CLOTH_UP = -11
const DROP = BURST - 0.46
export function clothDrop(t: number): number {
  if (t < DROP) return Y_CLOTH - CLOTH_UP
  if (t < BURST) {
    const u = (t - DROP) / (BURST - DROP)
    return (Y_CLOTH - CLOTH_UP) * (1 - u * u)
  }
  const s = t - BURST
  // The batten's bounce: up off the floor and down again, twice, dying.
  return 0.16 * Math.exp(-s / 0.11) * Math.abs(Math.sin((Math.PI * s) / 0.13))
}
/** The cloth's extent, in this frame (landed). */
const CLOTH_X0 = -9
const CLOTH_X1 = 44
const CLOTH_TOP = -19

/** The painted mountain the sign stands on, in the Hollywood part's frame (x from its door), landed. */
const H = (x: number) => x + EXIT[0]
const MOUNTAIN: Pt[] = [
  [-10, -3.2], [-4, -4.4], [1, -5.6], [5, -7.4], [8.5, -9.4], [11.5, -10.6], [13.2, -11.5], [14.6, -11.9], [16.2, -11.4], [18.4, -10.9],
  [20.5, -10.1], [23, -9.2], [26, -7.2], [30, -5.8], [36, -4.4], [44, -3.6],
].map(([x, y]) => [H(x), y])
const RIDGE: Pt[] = [
  [-10, -5.2], [-6, -6.8], [-2, -7.6], [2, -8.8], [6, -9.3], [9, -8.6], [24, -8.2], [28, -9.6], [32, -10.3], [36, -9.1], [40, -8.2], [44, -7.4],
].map(([x, y]) => [H(x), y])
/**
 * The sign: nine white blocks along the mountain's face, never letters. Widths vary the way a word's letters do;
 * each sits on the slope, a little out of true. Hollywood frame, landed: base centre, width, height, tilt.
 */
export const SIGN: { x: number; y: number; w: number; h: number; tilt: number }[] = [
  [9.4, 0.62], [10.45, 0.66], [11.45, 0.46], [12.3, 0.46], [13.25, 0.6], [14.4, 0.86], [15.55, 0.64], [16.6, 0.64], [17.7, 0.7],
].map(([x, w], i) => ({ x, y: -8.95 - 0.34 * Math.sin((i / 8) * Math.PI) + 0.05 * (i % 2), w, h: 0.98 - 0.04 * (i % 3), tilt: [0.03, -0.02, 0.01, 0.04, -0.03, 0.02, -0.01, 0.03, -0.02][i] }))

/* ------------------------------------------------------------------ the flood */

/** How far the colour has come at `x` (this frame) at show time `t`: out from the door, both ways, on the burst. */
export function flood(x: number, t: number): number {
  const at = BURST + Math.abs(x - DOOR_X) / 22
  return smooth(t, at, at + 0.28)
}

/* ------------------------------------------------------------------ the walk */

/** A smooth curve through timed knots that never runs backwards: speeds carry through a knot, and stop where two agree. */
export function monotone(knots: [number, number][]): (t: number) => number {
  const n = knots.length
  const ts = knots.map((k) => k[0])
  const vs = knots.map((k) => k[1])
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) d.push((vs[i + 1] - vs[i]) / (ts[i + 1] - ts[i]))
  const m: number[] = new Array(n).fill(0)
  m[0] = d[0]
  m[n - 1] = d[n - 2]
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) continue
    const h0 = ts[i] - ts[i - 1]
    const h1 = ts[i + 1] - ts[i]
    const w1 = 2 * h1 + h0
    const w2 = h1 + 2 * h0
    m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
  }
  return (t) => {
    if (t <= ts[0]) return vs[0] + m[0] * (t - ts[0])
    if (t >= ts[n - 1]) return vs[n - 1] + m[n - 1] * (t - ts[n - 1])
    let i = 0
    while (i < n - 2 && t > ts[i + 1]) i++
    const h = ts[i + 1] - ts[i]
    const u = (t - ts[i]) / h
    const u2 = u * u
    const u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * vs[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * vs[i + 1] + (u3 - u2) * h * m[i + 1]
  }
}

/** The cut-outs, where they stand (this frame): each a hair ahead of where the two of them are when it rises. */
type Kind = 'palm' | 'towers' | 'tower' | 'lamp'
const CUTS: { kind: Kind; x: number; at: number }[] = [
  { kind: 'palm', x: 1.05, at: POP_AT[0] },
  { kind: 'towers', x: 2.62, at: POP_AT[1] },
  { kind: 'tower', x: 4.2, at: POP_AT[2] },
  { kind: 'lamp', x: 5.72, at: POP_AT[3] },
]
/** How long a cut-out takes to swing up: it is let go this long before its note and stands on it. */
const SWING = 0.5

/** His roll through the white, show time to x: rolling on between the phrases, all but stopping as each cut-out stands. */
const sebX = (() => {
  const k: [number, number][] = [[BEGIN, -0.5]]
  const xs = [0.62, 2.18, 3.77, 5.3]
  for (let i = 0; i < 4; i++) {
    k.push([POP_AT[i] - 0.62, xs[i]])
    k.push([POP_AT[i] + 0.28, xs[i] + 0.3])
  }
  k.push([DOOR_AT - 0.2, 6.62], [DOOR_AT + 0.42, DOOR_X], [BURST, DOOR_X])
  return monotone(k)
})()
/** She keeps beside him, a little behind; at each cut-out she stops to look a moment longer, then catches him up. */
function miaX(t: number): number {
  let lag = 0.3 - 0.2 * smooth(t, BURST - 1.6, BURST - 0.5)
  for (const at of POP_AT) lag += 0.36 * smooth(t, at - 0.25, at + 0.35) * (1 - smooth(t, at + 0.55, at + 1.35))
  return sebX(t - lag) - 0.42
}
export const MIA_AT_BURST = miaX(BURST) - EXIT[0]

/* ------------------------------------------------------------------ drawing */

interface StudioState {
  begin: number
}

const X = (k: number, x: number) => x * k

/** The run of flats: left, right, height. The last holds the door. */
const FLATS: [number, number, number][] = [
  [-5.6, -3.7, 3.3], [-3.62, -1.86, 3.05], [-1.78, 0.3, 3.3], [0.38, 2.02, 3.1], [2.1, 3.96, 3.3], [4.04, 5.5, 3.05], [5.58, 8.1, 3.4],
]

function drawFlats(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  // Once the cloth is down they are behind it: nothing of them shows.
  if (t > BURST + 0.05) return
  for (const [x0, x1, h] of FLATS) {
    const top = Y_BACK - h
    solid(p, ink, weight * 0.6, M.flat)
    p.rect(X(k, x0), X(k, top), X(k, x1 - x0), X(k, h))
    // The seam each flat makes with the next: a soft shade down its left edge.
    p.noStroke()
    p.fill(M.shadow)
    p.rect(X(k, x0 + 0.02), X(k, top + 0.02), X(k, 0.07), X(k, h - 0.04))
  }
  // A brace at each free end: a timber strut out to a sandbag on the floor.
  for (const [x, side, h] of [[FLATS[0][0], -1, FLATS[0][2]], [FLATS[FLATS.length - 1][1], 1, FLATS[FLATS.length - 1][2]]] as const) {
    const top = Y_BACK - h + 0.7
    const foot = x + side * 1.05
    outline(p, ink, weight * 0.7)
    p.stroke(mixHex(M.shadow, ink, 0.45))
    p.strokeWeight(Math.max(1, X(k, 0.05)))
    p.line(X(k, x), X(k, top), X(k, foot), X(k, Y_BACK - 0.02))
    p.line(X(k, x), X(k, Y_BACK - 0.25), X(k, foot - side * 0.05), X(k, Y_BACK - 0.05))
    solid(p, ink, weight * 0.6, M.shadow)
    p.rect(X(k, foot - 0.17), X(k, Y_BACK - 0.13), X(k, 0.34), X(k, 0.13), X(k, 0.05))
  }
  drawDoor(p, c, t)
}

/** How far the door is open, 0..1: on the last phrase head it swings out, bangs against its stop, and settles. */
function doorOpen(t: number): number {
  const s = t - DOOR_AT
  if (s <= 0) return 0
  const swing = 1 - Math.pow(1 - Math.min(1, s / 0.3), 3)
  return Math.min(1.02, swing - (s > 0.3 ? 0.07 * ring(s - 0.3, 2.4, 0.18) : 0))
}

function drawDoor(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const top = Y_BACK - DOOR_H
  const o = doorOpen(t)
  // The doorway, when there is one: the painted world beyond, violet going to rose.
  if (o > 0) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const g = ctx.createLinearGradient(0, X(k, top), 0, X(k, Y_BACK))
    g.addColorStop(0, M.skyTop)
    g.addColorStop(1, M.skyLow)
    ctx.fillStyle = g
    ctx.fillRect(X(k, DOOR_L), X(k, top), X(k, DOOR_W), X(k, DOOR_H))
  }
  outline(p, ink, weight * 0.7)
  p.noFill()
  p.rect(X(k, DOOR_L - 0.05), X(k, top - 0.05), X(k, DOOR_W + 0.1), X(k, DOOR_H + 0.05))
  // The door on its left hinges, swinging out toward us: narrower as it turns, its free edge coming nearer (lower, a hair taller).
  const a = o * 1.25
  const w = DOOR_W * Math.cos(a)
  const near = Math.sin(a)
  solid(p, ink, weight * 0.8, M.door)
  p.beginShape()
  p.vertex(X(k, DOOR_L), X(k, top))
  p.vertex(X(k, DOOR_L + w), X(k, top - 0.06 * near))
  p.vertex(X(k, DOOR_L + w), X(k, Y_BACK + 0.1 * near))
  p.vertex(X(k, DOOR_L), X(k, Y_BACK))
  p.endShape(p.CLOSE)
  // Two sunk panels and the knob, turning with it.
  p.stroke(rgba(ink, 0.5))
  p.strokeWeight(weight * 0.5)
  p.noFill()
  if (w > 0.2) {
    const f = w / DOOR_W
    p.rect(X(k, DOOR_L + 0.13 * f), X(k, top + 0.16), X(k, (DOOR_W - 0.26) * f), X(k, 0.56))
    p.rect(X(k, DOOR_L + 0.13 * f), X(k, top + 0.86), X(k, (DOOR_W - 0.26) * f), X(k, 0.6))
  }
  solid(p, ink, weight * 0.5, M.bush)
  p.circle(X(k, DOOR_L + w - 0.1 * Math.cos(a)), X(k, top + 0.84 + 0.04 * near), X(k, 0.07))
}

/** The light out of the open door, pooling on the white floor in front of it. Under the cloth after the burst. */
function drawSpill(p: p5, c: Ctx, t: number): void {
  const o = doorOpen(t) * (1 - smooth(t, BURST - 0.05, BURST + 0.3))
  if (o <= 0.01) return
  const { k } = c
  beam(p, k, DOOR_X, Y_BACK - 0.02, DOOR_X, FLOOR + 0.55, DOOR_W * 0.95, DOOR_W * 2.6, M.skyLow, 0.34 * o)
  glow(p, k, DOOR_X, FLOOR + 0.02, 1.25, M.skyLow, 0.28 * o, 1.4, 0.42)
}

function drawCloth(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const dy = -clothDrop(t)
  const bottom = Y_CLOTH + dy
  const f = frame(p, k)
  const x0 = Math.max(CLOTH_X0, f.x0 - 1)
  const x1 = Math.min(CLOTH_X1, f.x1 + 1)
  const y0 = Math.max(CLOTH_TOP + dy, f.y0 - 1)
  if (x1 <= x0 || bottom <= y0) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  // The painted sky: violet overhead to rose at the horizon.
  const g = ctx.createLinearGradient(0, X(k, -14 + dy), 0, X(k, -1.5 + dy))
  g.addColorStop(0, M.skyTop)
  g.addColorStop(0.5, mixHex(M.skyTop, M.skyLow, 0.42))
  g.addColorStop(1, M.skyLow)
  ctx.fillStyle = g
  ctx.fillRect(X(k, x0), X(k, y0), X(k, x1 - x0), X(k, bottom - y0))
  ctx.restore()
  // The far ridge, hazed in the rose; the mountain in front of it, a deeper violet. Painted: flat, and no ink.
  p.noStroke()
  const ridge = (pts: Pt[], fill: string) => {
    p.fill(fill)
    p.beginShape()
    p.vertex(X(k, pts[0][0]), X(k, bottom))
    for (const [x, y] of pts) p.vertex(X(k, x), X(k, y + dy))
    p.vertex(X(k, pts[pts.length - 1][0]), X(k, bottom))
    p.endShape(p.CLOSE)
  }
  ridge(RIDGE, mixHex(M.hill, M.skyLow, 0.5))
  ridge(MOUNTAIN, mixHex(M.hill, M.skyTop, 0.5))
  // A soft band of rose light low on the cloth, behind the set: the painted sunset.
  ctx.save()
  const band = ctx.createLinearGradient(0, X(k, -3.4 + dy), 0, X(k, bottom))
  band.addColorStop(0, rgba(M.skyLow, 0))
  band.addColorStop(1, rgba(M.skyLow, 0.55))
  ctx.fillStyle = band
  ctx.fillRect(X(k, x0), X(k, -3.4 + dy), X(k, x1 - x0), X(k, bottom + 3.4 - dy))
  ctx.restore()
  // The sign, painted, unlit: nine pale blocks on the mountain's face.
  for (const b of SIGN) {
    p.push()
    p.translate(X(k, H(b.x)), X(k, b.y + dy))
    p.rotate(b.tilt)
    p.noStroke()
    p.fill(mixHex(M.sign, M.hill, 0.42))
    p.rect(X(k, -b.w / 2), X(k, -b.h), X(k, b.w), X(k, b.h))
    p.pop()
  }
  // The batten along its foot, and the lines it hangs on, up into the flies.
  solid(p, ink, weight * 0.8, mixHex(M.skyLow, ink, 0.35))
  p.rect(X(k, x0), X(k, bottom - 0.07), X(k, x1 - x0), X(k, 0.07))
  if (dy < -0.5) {
    outline(p, ink, weight * 0.6)
    for (let x = Math.ceil(x0 / 6) * 6; x < x1; x += 6) p.line(X(k, x), X(k, CLOTH_TOP + dy), X(k, x), X(k, f.y0 - 2))
  }
}

/** The stage floor: white, and then (as the colour comes) the painted street's deep violet. Under everything. */
function drawFloor(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const f = frame(p, k)
  const x0 = Math.max(CLOTH_X0, f.x0 - 1)
  const x1 = Math.min(CLOTH_X1, f.x1 + 1)
  if (x1 <= x0) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const white = M.shadow
  const painted = mixHex(M.skyTop, ink, 0.45)
  const front = FLOOR + 0.5
  // The floor's top, between the back line and the path, then its front edge down to the stage face.
  const fill = (a: number, b: number, y0: number, y1: number, from: string, to: string) => {
    ctx.fillStyle = from === to ? from : (() => {
      const g = ctx.createLinearGradient(X(k, a), 0, X(k, b), 0)
      g.addColorStop(0, from)
      g.addColorStop(1, to)
      return g
    })()
    ctx.fillRect(X(k, a), X(k, y0), X(k, b - a), X(k, y1 - y0))
  }
  // The colour runs out from the door both ways: painted inside the front, white beyond it, a short blend between.
  const reach = Math.max(0, (t - BURST) * 22)
  const blend = 0.8
  const bands: [number, number, string, string][] = []
  if (reach <= 0) bands.push([x0, x1, white, white])
  else {
    const l = DOOR_X - reach
    const r = DOOR_X + reach
    if (x0 < l - blend) bands.push([x0, l - blend, white, white])
    bands.push([Math.max(x0, l - blend), Math.max(x0, l), white, painted])
    bands.push([Math.max(x0, l), Math.min(x1, r), painted, painted])
    bands.push([Math.min(x1, r), Math.min(x1, r + blend), painted, white])
    if (x1 > r + blend) bands.push([r + blend, x1, white, white])
  }
  for (const [a, b, from, to] of bands) if (b > a) fill(a, b, Y_BACK, front, from, to)
  // The stage face below: the paper of the studio, a little shaded under the lip.
  ctx.save()
  const g = ctx.createLinearGradient(0, X(k, front), 0, X(k, front + 0.8))
  g.addColorStop(0, rgba(M.shadow, 1))
  g.addColorStop(1, rgba(M.shadow, 0))
  ctx.fillStyle = g
  ctx.fillRect(X(k, x0), X(k, front), X(k, x1 - x0), X(k, 0.8))
  ctx.restore()
  outline(p, ink, weight * 0.7)
  p.line(X(k, x0), X(k, front), X(k, x1), X(k, front))
  p.stroke(rgba(ink, 0.35))
  p.line(X(k, x0), X(k, Y_BACK), X(k, x1), X(k, Y_BACK))
}

/** The fly battens overhead and the work lights on them: a sound stage's ceiling, gone once the cloth is down. */
function drawGrid(p: p5, c: Ctx, t: number): void {
  if (t > BURST + 0.05) return
  const { k, ink, weight } = c
  const y = -4.35
  outline(p, ink, weight * 0.6)
  p.stroke(mixHex(M.shadow, ink, 0.5))
  p.line(X(k, -6), X(k, y), X(k, 9.2), X(k, y))
  for (const x of [-4.2, -0.6, 3.1, 6.6]) {
    p.line(X(k, x), X(k, y), X(k, x), X(k, y - 3))
    // A work light hanging off the pipe, and the pale cone it throws down the flats.
    solid(p, ink, weight * 0.6, M.shadow)
    p.rect(X(k, x + 0.55), X(k, y + 0.04), X(k, 0.26), X(k, 0.2), X(k, 0.04))
    beam(p, k, x + 0.68, y + 0.24, x + 0.95, Y_BACK - 0.4, 0.2, 1.5, M.flat, 0.35)
  }
}

/* ------------------------------------------------------------------ the cut-outs */

/** How far up a cut-out has swung, 0 (lying back on the floor) to 1 (standing), with the knock of its hinge stop. */
function stand(at: number, t: number): { up: number; knock: number } {
  const s = t - (at - SWING)
  if (s <= 0) return { up: 0, knock: 0 }
  if (s < SWING) {
    // Let go, it swings up faster and faster, like a page springing open.
    const u = s / SWING
    return { up: u * u * (1.35 - 0.35 * u), knock: 0 }
  }
  const after = s - SWING
  return { up: 1, knock: ring(after, 2.6, 0.2) }
}

/**
 * A cut-out, drawn about its hinge with its heights squashed by `sy`: lying back on the floor it is a sliver
 * (the floor seen from a little above), standing it is itself. `paint` is how much colour the flood has put on it.
 */
function drawCut(p: p5, c: Ctx, kind: Kind, x: number, sy: number, paint: number, lit: number, shade?: string): void {
  const { k, weight } = c
  // As a shadow: every shape in one flat colour, no line, no light.
  const ink = shade ?? c.ink
  const P = (a: string) => shade ?? mixHex(M.flat, a, paint)
  if (shade) lit = 0
  const V = (px: number, py: number): [number, number] => [X(k, x + px), X(k, HINGE + py * sy)]
  const poly = (pts: [number, number][], fill: string, w = weight * 0.8) => {
    solid(p, ink, w, fill)
    p.beginShape()
    for (const [a, b] of pts) p.vertex(...V(a, b))
    p.endShape(p.CLOSE)
  }
  const line = (a: number, b: number, c2: number, d: number, w = weight * 0.5, col: string = ink) => {
    p.stroke(col)
    p.strokeWeight(w)
    p.line(...V(a, b), ...V(c2, d))
  }
  if (kind === 'palm') {
    // A trunk that leans and curves, ringed; six fronds drooping from its crown.
    const trunk: [number, number][] = []
    const n = 8
    for (let i = 0; i <= n; i++) {
      const u = i / n
      trunk.push([0.28 * u * u - 0.09 * (1 - u), -2.05 * u])
    }
    const L = trunk.map(([a, b], i) => [a - 0.1 + 0.04 * (i / n), b] as [number, number])
    const R = trunk.map(([a, b], i) => [a + 0.1 - 0.04 * (i / n), b] as [number, number]).reverse()
    poly([...L, ...R], P(mixHex(M.bushShade, ink, 0.4)))
    for (let i = 1; i < n; i++) line(L[i][0], L[i][1], L[i][0] + 0.2 - 0.08 * (i / n), L[i][1] + 0.05, weight * 0.4, rgba(ink, 0.6))
    const [cx, cy] = trunk[n]
    for (let j = 0; j < 6; j++) {
      const side = j < 3 ? -1 : 1
      const reach = [0.95, 0.8, 0.55][j % 3]
      const lift = [0.35, 0.05, -0.3][j % 3]
      const tip: [number, number] = [cx + side * reach, cy + 0.45 - lift]
      const mid: [number, number] = [cx + side * reach * 0.55, cy - 0.12 - lift * 0.8]
      const leaf: [number, number][] = []
      for (let q = 0; q <= 6; q++) {
        const u = q / 6
        const bx = (1 - u) * (1 - u) * cx + 2 * u * (1 - u) * mid[0] + u * u * tip[0]
        const by = (1 - u) * (1 - u) * cy + 2 * u * (1 - u) * mid[1] + u * u * tip[1]
        leaf.push([bx, by - 0.09 * Math.sin(Math.PI * u)])
      }
      for (let q = 6; q >= 0; q--) {
        const u = q / 6
        const bx = (1 - u) * (1 - u) * cx + 2 * u * (1 - u) * mid[0] + u * u * tip[0]
        const by = (1 - u) * (1 - u) * cy + 2 * u * (1 - u) * mid[1] + u * u * tip[1]
        leaf.push([bx, by + 0.08 * Math.sin(Math.PI * u)])
      }
      poly(leaf, P(M.palm), weight * 0.7)
    }
  } else if (kind === 'towers') {
    // Two lattice masts, a tall and a short, banded, each with its beacon.
    for (const [mx, h, w] of [[-0.3, 2.85, 0.44], [0.42, 2.15, 0.36]] as const) {
      poly([[mx - w / 2, 0], [mx - 0.035, -h], [mx + 0.035, -h], [mx + w / 2, 0]], P(M.flat))
      const bands = 5
      for (let i = 0; i < bands; i++) {
        if (i % 2 === 1) continue
        const a = (i / bands) * h
        const b = ((i + 1) / bands) * h
        const wa = (w / 2) * (1 - a / h) + 0.035 * (a / h)
        const wb = (w / 2) * (1 - b / h) + 0.035 * (b / h)
        poly([[mx - wa, -a], [mx - wb, -b], [mx + wb, -b], [mx + wa, -a]], P(M.door), weight * 0.5)
      }
      // The lattice: one brace across each band.
      for (let i = 0; i < bands; i++) {
        const a = (i / bands) * h
        const b = ((i + 1) / bands) * h
        const wa = (w / 2) * (1 - a / h) + 0.035 * (a / h)
        const wb = (w / 2) * (1 - b / h) + 0.035 * (b / h)
        line(mx - wa, -a, mx + wb, -b, weight * 0.4, rgba(ink, 0.7))
      }
      solid(p, ink, weight * 0.6, P(M.door))
      p.circle(...V(mx, -h - 0.06), X(k, 0.12))
      if (lit > 0) glow(p, k, x + mx, HINGE + (-h - 0.06) * sy, 0.35, M.door, 0.5 * lit)
    }
  } else if (kind === 'tower') {
    // The round tower: a drum of stacked floors, each with its sunshade, a spire, a light on the spire.
    const w = 0.92
    const h = 2.5
    const floors = 9
    poly([[-w / 2, 0], [-w / 2, -h + 0.1], [-w / 2 + 0.12, -h], [w / 2 - 0.12, -h], [w / 2, -h + 0.1], [w / 2, 0]], P(M.flat))
    for (let i = 1; i < floors; i++) {
      const y = -(i / floors) * h
      solid(p, ink, weight * 0.4, P(M.purple))
      p.beginShape()
      p.vertex(...V(-w / 2 - 0.06, y))
      p.vertex(...V(w / 2 + 0.06, y))
      p.vertex(...V(w / 2 + 0.02, y + 0.08))
      p.vertex(...V(-w / 2 - 0.02, y + 0.08))
      p.endShape(p.CLOSE)
    }
    line(0, -h, 0, -h - 0.62, weight * 0.8)
    solid(p, ink, weight * 0.5, P(M.door))
    p.circle(...V(0, -h - 0.64), X(k, 0.1))
    if (lit > 0) glow(p, k, x, HINGE + (-h - 0.64) * sy, 0.3, M.door, 0.55 * lit)
  } else {
    // A streetlamp: a fluted post on a plinth, a lantern on a curled bracket.
    poly([[-0.14, 0], [-0.1, -0.2], [0.1, -0.2], [0.14, 0]], P(mixHex(M.purple, ink, 0.4)))
    poly([[-0.045, -0.2], [-0.03, -1.7], [0.03, -1.7], [0.045, -0.2]], P(mixHex(M.purple, ink, 0.4)), weight * 0.6)
    poly([[-0.2, -1.78], [-0.13, -2.08], [0.13, -2.08], [0.2, -1.78]], P(M.lamp))
    poly([[-0.22, -1.72], [0.22, -1.72], [0.16, -1.8], [-0.16, -1.8]], P(mixHex(M.purple, ink, 0.4)), weight * 0.6)
    poly([[-0.16, -2.08], [0, -2.2], [0.16, -2.08]], P(mixHex(M.purple, ink, 0.4)), weight * 0.6)
    if (lit > 0) glow(p, k, x, HINGE - 1.94 * sy, 0.9, M.lamp, 0.55 * lit)
  }
}

function drawCuts(p: p5, c: Ctx, t: number): void {
  const { k } = c
  // The floor seen from a little above: lying back, a cut-out's far end shows this high.
  const tilt = 0.1
  for (const cut of CUTS) {
    const { up, knock } = stand(cut.at, t)
    const theta = up * (Math.PI / 2) + 0.05 * knock
    const sy = Math.sin(theta + tilt)
    const paint = flood(cut.x, t)
    // Standing, it throws a soft shadow up the flat behind it (and later, the cloth).
    if (up > 0.6) {
      p.push()
      p.drawingContext.globalAlpha = 0.28 * smooth(up, 0.6, 1)
      p.translate(X(k, 0.12), X(k, -0.05))
      drawCut(p, c, cut.kind, cut.x, sy, 0, 0, mixHex(M.shadow, M.purple, 0.35))
      p.pop()
    }
    drawCut(p, c, cut.kind, cut.x, sy, paint, paint)
  }
}

function drawStudio(p: p5, s: StudioState, c: Ctx): void {
  const t = c.t + s.begin
  p.rectMode(p.CORNER)
  p.ellipseMode(p.CENTER)
  drawGrid(p, c, t)
  drawFlats(p, c, t)
  drawCloth(p, c, t)
  drawFloor(p, c, t)
  drawSpill(p, c, t)
  drawCuts(p, c, t)
}

export const studio = part<StudioState>(
  { name: 'studio', draw: drawStudio },
  (slot) => {
    const T = slot.end - slot.begin
    const at = (t: number): Pt => [sebX(t + slot.begin), 0]
    const segs = carried(at, 0, T, 90)
    const mia: Companion = { x: 0, y: 0 }
    return {
      // The whole stage: the cloth hangs over all of the number, so this is drawn wherever the camera is.
      cells: box(CLOTH_X0, -20, CLOTH_X1, 4, 2),
      exit: EXIT,
      lane: { segs, fire: POP_AT[0] - slot.begin },
      state: { begin: slot.begin },
      company: [{ from: slot.begin, to: slot.end, who: 'mia', at: (t) => ({ ...mia, x: miaX(t), y: 0 }) }],
    }
  },
  (slot) => [
    // Out of the white, wide enough for the flats and the grid above them.
    { t: slot.begin + 0.02, cells: 5.9, off: [0.9, -1.45], w: 0 },
    { t: POP_AT[1], cells: 5.7, off: [0.7, -1.4], w: 0 },
    { t: DOOR_AT - 0.4, cells: 5.4, off: [0.35, -1.35], w: 0 },
  ],
)
