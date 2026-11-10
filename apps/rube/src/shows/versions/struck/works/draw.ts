import type p5 from 'p5'
import {
  BALL_COLORS, BOW_T, CHORD_T, HAIR, HAIR_FROM, HAIR_UNDER, HAMMER, LANES, LAST_STROKE, R, SLOPE, VX,
  ballAt, balls, cellos, contacts, cups, lineY, rails, timeOf, trips, type Cello, type Contact, type Rail,
} from './layout'
import { SIXTEENTHS } from './prelude'

/**
 * The machine, drawn: the inside of an instrument in daylight. Everything is pinned to one long spruce soundboard, its
 * grain running down the machine's slope and a rib across it at every bar line. Steel tines, brass rails with felt on
 * them, pear-wood pipes on leather bellows, hammers with red felt, wire, and a row of cellos behind it all.
 *
 * A part is still until its ball lands on it, and then it is seen sounding in that ball's colour for as long as it
 * rings: a tine and a string as the blur of their swing, a pipe as the air in it, a cello's string under the bow.
 *
 * In cells, on the canvas with the stage's transform scaled by a cell. Nothing is written.
 */

export const COLORS = {
  board: '#EEE2C6',
  grain: '#D9C7A0',
  rib: '#E2D2AE',
  ink: '#3A2A1F',
  walnut: '#6E4B33',
  walnutLight: '#94694A',
  maple: '#DDBB82',
  brass: '#B48B36',
  brassLight: '#E8CB7C',
  steel: '#8C9BA6',
  steelLight: '#DCE4E9',
  steelDark: '#56636E',
  felt: '#B8382F',
  green: '#4F7F5C',
  ivory: '#FBF5E6',
  ebony: '#241D19',
  wire: '#6F6252',
  copper: '#A8673C',
  leather: '#A8734F',
  leatherDark: '#74492F',
  pipe: '#C5D0D7',
  pipeDark: '#8795A0',
  pipeLight: '#F0F5F7',
  varnish: '#B05F2E',
  varnishLight: '#D08A4C',
  varnishDark: '#74391A',
  hair: '#FFFDF4',
  stick: '#7A3F22',
  shadow: 'rgba(74, 48, 22, 0.17)',
}
const C = COLORS

type G = CanvasRenderingContext2D
interface View { x0: number; y0: number; x1: number; y1: number }

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const TAU = Math.PI * 2

function rgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
}
function mix(a: string, b: string, f: number): string {
  const [r1, g1, b1] = rgb(a)
  const [r2, g2, b2] = rgb(b)
  const k = clamp(f)
  return `rgb(${Math.round(r1 + (r2 - r1) * k)},${Math.round(g1 + (g2 - g1) * k)},${Math.round(b1 + (b2 - b1) * k)})`
}
function rgba(hex: string, a: number): string {
  const [r, g, b] = rgb(hex)
  return `rgba(${r},${g},${b},${clamp(a).toFixed(3)})`
}

function viewOf(g: G): View {
  const m = g.getTransform().inverse()
  const c = g.canvas
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const [px, py] of [[0, 0], [c.width, 0], [0, c.height], [c.width, c.height]]) {
    const x = m.a * px + m.c * py + m.e
    const y = m.b * px + m.d * py + m.f
    x0 = Math.min(x0, x)
    x1 = Math.max(x1, x)
    y0 = Math.min(y0, y)
    y1 = Math.max(y1, y)
  }
  return { x0, y0, x1, y1 }
}

/** The first index whose `x` is at least `x`, in a list sorted by it. */
function from<T extends { x: number }>(list: T[], x: number): number {
  let lo = 0
  let hi = list.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (list[mid].x < x) lo = mid + 1
    else hi = mid
  }
  return lo
}

/** How long each kind is seen ringing, seconds to 1/e: about a third of what the voice takes to die away. */
export const ringOf = (c: Contact): number =>
  c.kind === 'tine' ? 0.5 * Math.sqrt(523.25 / c.hz) : c.kind === 'piano' ? clamp(0.95 * Math.pow(130.8 / c.hz, 0.3), 0.4, 1.1) : 0.07

const BAR_X = Array.from({ length: SIXTEENTHS / 16 + 1 }, (_, b) => VX * timeOf(b * 16))
const railsByX = rails.map((r) => ({ ...r, x: r.x0 })).sort((a, b) => a.x - b.x)
const cellosByX = cellos.map((c, n) => ({ ...c, n }))
const lastPipe = contacts.find((c) => c.kind === 'pipe' && c.i === SIXTEENTHS)

/** A seeded number in 0 to 1 for a whole number. */
const hash = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

function board(g: G, v: View, px: number): void {
  g.fillStyle = C.board
  g.fillRect(v.x0 - 1, v.y0 - 1, v.x1 - v.x0 + 2, v.y1 - v.y0 + 2)
  // The ribs: one across the board at every bar line, a slighter one at the half bar.
  for (let b = 0; b < BAR_X.length; b++) {
    const x = BAR_X[b]
    if (x > v.x1 + 1) break
    if (x > v.x0 - 1) {
      g.fillStyle = C.rib
      g.fillRect(x - 0.55, v.y0 - 1, 0.5, v.y1 - v.y0 + 2)
      g.fillStyle = rgba(C.grain, 0.5)
      g.fillRect(x - 0.05 - 2 * px, v.y0 - 1, 2 * px, v.y1 - v.y0 + 2)
    }
    const half = b + 1 < BAR_X.length ? (x + BAR_X[b + 1]) / 2 : Infinity
    if (half > v.x0 - 1 && half < v.x1 + 1) {
      g.fillStyle = rgba(C.rib, 0.55)
      g.fillRect(half - 0.42, v.y0 - 1, 0.24, v.y1 - v.y0 + 2)
    }
  }
  // The grain, down the slope.
  const step = 0.62
  const c0 = Math.floor((v.y0 - SLOPE * v.x1) / step) - 1
  const c1 = Math.ceil((v.y1 - SLOPE * v.x0) / step) + 1
  g.lineWidth = Math.max(px, 0.022)
  for (let n = c0; n <= c1; n++) {
    const h = hash(n)
    if (h < 0.28) continue
    g.strokeStyle = rgba(C.grain, 0.2 + 0.4 * h)
    const c = n * step + (hash(n + 0.5) - 0.5) * 0.3
    g.beginPath()
    g.moveTo(v.x0 - 1, c + SLOPE * (v.x0 - 1))
    g.lineTo(v.x1 + 1, c + SLOPE * (v.x1 + 1))
    g.stroke()
  }
}

/** A filled lens between two points: the blur of something swinging `a` either side of the line between them. */
function lens(g: G, x0: number, y0: number, x1: number, y1: number, a: number, peak: number, fill: string): void {
  const nx = -(y1 - y0)
  const ny = x1 - x0
  const len = Math.hypot(nx, ny) || 1
  const mx = x0 + (x1 - x0) * peak
  const my = y0 + (y1 - y0) * peak
  const ox = (nx / len) * a * 2
  const oy = (ny / len) * a * 2
  g.fillStyle = fill
  g.beginPath()
  g.moveTo(x0, y0)
  g.quadraticCurveTo(mx + ox, my + oy, x1, y1)
  g.quadraticCurveTo(mx - ox, my - oy, x0, y0)
  g.fill()
}

function tine(g: G, c: Contact, t: number): void {
  const ys = c.y + R
  const tip = c.x + 0.26
  const root = tip - c.len
  const age = t - c.sound
  const env = age < 0 ? 0 : Math.exp(-age / ringOf(c)) * Math.min(1.25, c.vin / 24)
  const hue = BALL_COLORS[c.ball]
  // Its bridge, pinned to the board, and the bar that holds it down.
  g.fillStyle = C.shadow
  g.fillRect(root - 0.02, ys + 0.12, 0.4, 0.32)
  g.fillRect(root + 0.4, ys + 0.2, c.len - 0.4, 0.07)
  g.fillStyle = C.walnut
  g.fillRect(root - 0.08, ys + 0.05, 0.4, 0.3)
  g.fillStyle = C.walnutLight
  g.fillRect(root - 0.08, ys + 0.05, 0.4, 0.07)
  if (env > 0.015) lens(g, root + 0.3, ys, tip, ys, 0.2 * env, 0.92, rgba(hue, 0.3 * Math.min(1, env * 1.6)))
  const swing = env > 0.004 ? 0.2 * env * Math.sin(TAU * (9 + (c.midi % 7)) * age) : 0
  g.lineCap = 'round'
  g.strokeStyle = mix(C.steelDark, hue, 0.55 * Math.min(1, env * 1.5))
  g.lineWidth = 0.13
  g.beginPath()
  g.moveTo(root, ys + 0.055)
  g.quadraticCurveTo(root + c.len * 0.5, ys + 0.055, tip, ys + 0.055 + swing)
  g.stroke()
  g.strokeStyle = mix(C.steelLight, hue, 0.35 * Math.min(1, env * 1.5))
  g.lineWidth = 0.05
  g.beginPath()
  g.moveTo(root, ys + 0.025)
  g.quadraticCurveTo(root + c.len * 0.5, ys + 0.025, tip, ys + 0.025 + swing)
  g.stroke()
  g.lineCap = 'butt'
  g.fillStyle = C.brass
  g.beginPath()
  g.arc(root + 0.2, ys - 0.06, 0.09, 0, TAU)
  g.fill()
}

/** How far a hammer has swung at `age` after its ball lands, 0 to 1 at the string: thrown, then back with a bob. */
function swing(age: number): number {
  if (age < 0) return 0
  if (age < HAMMER) return age / HAMMER
  const back = age - HAMMER
  return Math.exp(-back / 0.06) * Math.cos(back * 18)
}

function action(g: G, c: Contact, t: number, px: number): void {
  const ys = c.y + R
  const pivotX = c.x - 0.78
  const pivotY = ys + 0.17
  const SHANK = 1.2
  const REACH = 0.2
  const hue = BALL_COLORS[c.ball]
  const age = t - c.sound
  const env = age < 0 ? 0 : Math.exp(-age / ringOf(c)) * Math.min(1.25, c.vin / 26)
  // The string: from its pin down to its hitch, struck an eighth of the way along or less.
  const sx = pivotX - SHANK * Math.sin(REACH) - 0.24
  const top = pivotY + 0.42
  const bottom = top + c.len
  const wound = c.midi < 50
  if (env > 0.015) lens(g, sx, top, sx, bottom, 0.11 * env, 0.5, rgba(hue, 0.32 * Math.min(1, env * 1.6)))
  g.strokeStyle = mix(wound ? C.copper : C.wire, hue, 0.6 * Math.min(1, env * 1.5))
  g.lineWidth = Math.max(px, wound ? 0.1 : 0.055)
  g.beginPath()
  g.moveTo(sx, top)
  g.lineTo(sx + (env > 0.004 ? 0.05 * env * Math.sin(TAU * 11 * age) : 0), (top + bottom) / 2)
  g.lineTo(sx, bottom)
  g.stroke()
  g.fillStyle = C.brass
  g.beginPath()
  g.arc(sx, top, 0.09, 0, TAU)
  g.arc(sx, bottom, 0.09, 0, TAU)
  g.fill()
  g.fillStyle = C.walnut
  g.fillRect(sx - 0.24, bottom + 0.06, 0.48, 0.16)
  // The hammer: a crank on a pin. The ball lands on its pad, and its felt goes over to the string.
  const a = REACH * swing(t - c.t)
  g.save()
  g.translate(pivotX, pivotY)
  g.rotate(a)
  g.lineCap = 'round'
  g.strokeStyle = C.maple
  g.lineWidth = 0.09
  g.beginPath()
  g.moveTo(0, 0)
  g.lineTo(0, SHANK)
  g.stroke()
  g.strokeStyle = C.walnutLight
  g.lineWidth = 0.17
  g.beginPath()
  g.moveTo(0, 0)
  g.lineTo(0.98, -0.05)
  g.stroke()
  g.lineCap = 'butt'
  g.fillStyle = C.ivory
  g.fillRect(0.5, -0.17, 0.56, 0.07)
  g.fillStyle = C.walnut
  g.beginPath()
  g.ellipse(0.02, SHANK, 0.13, 0.22, 0, 0, TAU)
  g.fill()
  g.fillStyle = C.felt
  g.beginPath()
  g.ellipse(-0.1, SHANK, 0.14, 0.27, 0, 0, TAU)
  g.fill()
  g.restore()
  g.fillStyle = C.brass
  g.beginPath()
  g.arc(pivotX, pivotY, 0.1, 0, TAU)
  g.fill()
}

/** A pipe, standing behind its bellows: drawn before the lane in front of it. */
function pipe(g: G, c: Contact, t: number, px: number): void {
  const ys = c.y + R
  const w = 0.46
  const x0 = c.x - 0.86
  const foot = ys + 0.62
  const mouth = ys - 0.32
  const top = mouth - c.len
  const hue = BALL_COLORS[c.ball]
  const age = t - c.sound
  const long = c === lastPipe
  const air = age < 0 ? 0 : long ? clamp(age / 0.05) * Math.max(0, 1 - age / 4.4) ** 0.7 : age < 0.17 ? clamp(age / 0.02) : Math.exp(-(age - 0.17) / 0.07)
  g.fillStyle = C.shadow
  g.fillRect(x0 + 0.1, top + 0.14, w, foot - top)
  g.fillStyle = C.pipe
  g.fillRect(x0, top, w, foot - top)
  if (air > 0.01) {
    // The air in it: a stopped pipe's note presses hardest under its stopper and not at all at its mouth.
    const grad = g.createLinearGradient(0, top, 0, mouth)
    for (let j = 0; j <= 6; j++) grad.addColorStop(j / 6, rgba(hue, 0.62 * air * Math.cos((Math.PI * j) / 12)))
    g.fillStyle = grad
    g.fillRect(x0, top, w, mouth - top)
  }
  g.fillStyle = C.pipeLight
  g.fillRect(x0 + 0.07, top, 0.08, foot - top)
  g.fillStyle = C.pipeDark
  g.fillRect(x0 + w - 0.09, top, 0.09, foot - top)
  // Its stopper: a pipe shut at the top sounds an octave under an open one of its length.
  g.fillStyle = C.walnut
  g.fillRect(x0 - 0.03, top - 0.05, w + 0.06, 0.2)
  g.fillRect(x0 + w / 2 - 0.05, top - 0.3, 0.1, 0.27)
  g.fillStyle = C.pipeDark
  // The mouth: the slot the wind comes out of, and the lips it breaks on, pressed into the metal above and below.
  g.beginPath()
  g.moveTo(x0 + 0.06, mouth)
  g.lineTo(x0 + w - 0.06, mouth)
  g.lineTo(x0 + w / 2, mouth - 0.3)
  g.moveTo(x0 + 0.06, mouth + 0.13)
  g.lineTo(x0 + w - 0.06, mouth + 0.13)
  g.lineTo(x0 + w / 2, mouth + 0.36)
  g.fill()
  g.fillStyle = C.ink
  g.fillRect(x0 + 0.06, mouth, w - 0.12, 0.13)
  if (air > 0.03) {
    g.strokeStyle = rgba(hue, 0.5 * air)
    g.lineWidth = Math.max(px, 0.035)
    for (let j = 0; j < 3; j++) {
      const f = ((long ? age * 1.3 : age * 4) + j / 3) % 1
      g.beginPath()
      g.arc(x0 + w / 2, mouth + 0.08, 0.26 + f * 0.5, -Math.PI * 0.42 - f * 0.2, -Math.PI * 0.08)
      g.stroke()
    }
  }
}

/** How far a bellows' board is pressed at `age` after its ball lands, cells. */
function pressed(c: Contact, age: number): number {
  if (age < 0) return 0
  if (c === lastPipe) return 0.3 * (1 - Math.exp(-age / 1.3))
  return 0.26 * (age < 0.035 ? age / 0.035 : Math.exp(-(age - 0.035) / 0.11))
}

function bellows(g: G, c: Contact, t: number): void {
  const ys = c.y + R
  const dip = pressed(c, t - c.t)
  const left = c.x - 0.66
  const right = c.x + 0.52
  const base = ys + 0.5
  const hinge = base - 0.1
  const lip = ys + dip
  g.fillStyle = C.shadow
  g.fillRect(left + 0.08, base + 0.06, right - left, 0.2)
  // The leather, in two folds.
  g.fillStyle = C.leather
  g.beginPath()
  g.moveTo(left, hinge)
  g.lineTo(right, lip + 0.05)
  g.lineTo(right - 0.12, (lip + base) / 2)
  g.lineTo(right, base)
  g.lineTo(left, base)
  g.fill()
  g.strokeStyle = C.leatherDark
  g.lineWidth = 0.035
  g.beginPath()
  g.moveTo(left + 0.1, (hinge + base) / 2)
  g.lineTo(right - 0.12, (lip + base) / 2)
  g.stroke()
  g.lineCap = 'round'
  g.strokeStyle = C.walnut
  g.lineWidth = 0.13
  g.beginPath()
  g.moveTo(left, base + 0.05)
  g.lineTo(right, base + 0.05)
  g.stroke()
  g.strokeStyle = C.walnutLight
  g.lineWidth = 0.1
  g.beginPath()
  g.moveTo(left, hinge)
  g.lineTo(right + 0.04, lip + 0.05)
  if (c === lastPipe) g.lineTo(right + 0.1, lip - 0.2)
  g.stroke()
  g.lineCap = 'butt'
}

function rail(g: G, r: Rail, t: number): void {
  const y = r.y + R
  let x0 = r.x0
  g.lineCap = 'round'
  if (r.shelf) {
    // The shelf the ball waits on, its ramp, and the latch that keeps it.
    const sy = r.shelf.y + R
    x0 = r.shelf.x - 0.55
    g.strokeStyle = C.shadow
    g.lineWidth = 0.12
    g.beginPath()
    g.moveTo(x0 + 0.08, sy + 0.2)
    g.lineTo(r.shelf.x + 0.08, sy + 0.2)
    g.lineTo(r.x0 + 0.08, y + 0.2)
    g.stroke()
    g.strokeStyle = C.brass
    g.lineWidth = 0.11
    g.beginPath()
    g.moveTo(x0, sy - 0.25)
    g.lineTo(x0, sy + 0.06)
    g.lineTo(r.shelf.x, sy + 0.06)
    g.lineTo(r.x0, y + 0.06)
    g.stroke()
    const open = clamp((t - r.shelf.release) / 0.09)
    g.save()
    g.translate(r.shelf.x + R + 0.1, sy - 0.62)
    g.rotate(-1.15 * open)
    g.strokeStyle = C.ink
    g.lineWidth = 0.08
    g.beginPath()
    g.moveTo(0, 0)
    g.lineTo(0, 0.56)
    g.stroke()
    g.restore()
    g.fillStyle = C.brass
    g.beginPath()
    g.arc(r.shelf.x + R + 0.1, sy - 0.62, 0.09, 0, TAU)
    g.fill()
  }
  g.strokeStyle = C.shadow
  g.lineWidth = 0.12
  g.beginPath()
  g.moveTo(r.x0 + 0.08, y + 0.2)
  g.lineTo(r.x1 + 0.08, y + 0.2)
  g.stroke()
  g.strokeStyle = C.brass
  g.lineWidth = 0.11
  g.beginPath()
  g.moveTo(r.x0, y + 0.06)
  g.lineTo(r.x1, y + 0.06)
  g.stroke()
  g.strokeStyle = C.green
  g.lineWidth = 0.05
  g.beginPath()
  g.moveTo(r.x0, y + 0.015)
  g.lineTo(r.x1 - 0.04, y + 0.015)
  g.stroke()
  g.lineCap = 'butt'
  g.fillStyle = C.walnut
  g.fillRect(r.x0 + 0.1, y + 0.1, 0.12, 0.2)
  g.fillRect(r.x1 - 0.3, y + 0.1, 0.12, 0.2)
}

function cup(g: G, x: number, y: number): void {
  g.lineCap = 'round'
  g.strokeStyle = C.walnut
  g.lineWidth = 0.14
  g.beginPath()
  g.arc(x, y, R + 0.13, -0.15, Math.PI + 0.15)
  g.stroke()
  g.strokeStyle = C.felt
  g.lineWidth = 0.06
  g.beginPath()
  g.arc(x, y, R + 0.04, -0.1, Math.PI + 0.1)
  g.stroke()
  g.lineCap = 'butt'
}

/** How much a cello's string is sounding under the bow at `t`. */
function bowed(c: Cello, t: number): number {
  if (t < c.t0) return 0
  if (c.last) {
    const f = (t - c.t0) / LAST_STROKE
    return f < 1 ? clamp((t - c.t0) / 0.08) * Math.sqrt(1 - f) * 0.9 + 0.1 : 0.1 * Math.exp(-(t - c.t0 - LAST_STROKE) / 0.9)
  }
  return t < c.t1 ? clamp((t - c.t0) / 0.08) : Math.exp(-(t - c.t1) / 0.45)
}

/** One side of a cello's outline, from the top of its body round to the bottom, about its middle line. */
function side(g: G, s: 1 | -1): void {
  g.bezierCurveTo(s * 1.9, -8.05, s * 3.45, -7.6, s * 3.4, -6)
  g.bezierCurveTo(s * 3.38, -5.1, s * 3.3, -4.3, s * 3.05, -3.75)
  g.bezierCurveTo(s * 2.1, -3.3, s * 2.1, 0.1, s * 3.25, 0.55)
  g.bezierCurveTo(s * 3.9, 1.3, s * 4.4, 2.3, s * 4.4, 3.7)
  g.bezierCurveTo(s * 4.4, 5.9, s * 2.6, 7.1, 0, 7.1)
}

function cello(g: G, c: Cello, t: number, px: number): void {
  // The string under the bow stands at the cello's place across; the bridge is a little under the hair.
  const which = c.midi < 40 ? 0 : 1
  const at = (n: number, y: number) => (-0.48 + 0.32 * n) * (0.44 + 0.56 * clamp((y + 13.8) / 13.8))
  const ox = c.x - at(which, -1.4)
  const oy = c.y + 1.4
  const env = bowed(c, t)
  const hue = BALL_COLORS[1]
  g.save()
  g.translate(ox, oy)
  const body = () => {
    g.beginPath()
    g.moveTo(0, -8)
    side(g, 1)
    g.moveTo(0, -8)
    side(g, -1)
  }
  g.save()
  g.translate(0.22, 0.3)
  g.fillStyle = C.shadow
  body()
  g.fill()
  g.restore()
  // The neck and the scroll, behind the fingerboard.
  g.fillStyle = C.varnishDark
  g.fillRect(-0.36, -14.4, 0.72, 6.6)
  g.beginPath()
  g.moveTo(-0.4, -13.8)
  g.lineTo(-0.52, -15.9)
  g.lineTo(0.52, -15.9)
  g.lineTo(0.4, -13.8)
  g.fill()
  g.beginPath()
  g.arc(0, -16.3, 0.62, 0, TAU)
  g.fill()
  g.fillStyle = C.varnish
  g.beginPath()
  g.arc(0, -16.3, 0.3, 0, TAU)
  g.fill()
  g.fillStyle = C.ebony
  for (const [px0, py0] of [[-0.95, -15.5], [0.5, -15.1], [-0.95, -14.7], [0.5, -14.3]]) g.fillRect(px0, py0, 0.45, 0.2)
  const grad = g.createLinearGradient(-4.4, 0, 4.4, 0)
  grad.addColorStop(0, C.varnish)
  grad.addColorStop(0.45, C.varnishLight)
  grad.addColorStop(1, C.varnish)
  g.fillStyle = grad
  body()
  g.fill()
  g.strokeStyle = C.varnishDark
  g.lineWidth = 0.12
  g.stroke()
  g.save()
  g.scale(0.94, 0.955)
  g.strokeStyle = rgba(C.varnishDark, 0.5)
  g.lineWidth = Math.max(px, 0.035)
  body()
  g.stroke()
  g.restore()
  // The f-holes.
  g.strokeStyle = C.ebony
  g.lineCap = 'round'
  for (const s of [1, -1]) {
    g.lineWidth = 0.15
    g.beginPath()
    g.moveTo(s * 1.38, -1.7)
    g.bezierCurveTo(s * 1.0, -1.1, s * 2.25, 0.4, s * 1.85, 1.2)
    g.stroke()
    g.fillStyle = C.ebony
    g.beginPath()
    g.arc(s * 1.52, -1.72, 0.15, 0, TAU)
    g.arc(s * 1.7, 1.25, 0.2, 0, TAU)
    g.fill()
  }
  g.lineCap = 'butt'
  // The fingerboard, the tailpiece, the pin.
  g.fillStyle = C.ebony
  g.beginPath()
  g.moveTo(-0.31, -13.8)
  g.lineTo(0.31, -13.8)
  g.lineTo(0.64, -2.9)
  g.lineTo(-0.64, -2.9)
  g.fill()
  g.beginPath()
  g.moveTo(-0.52, 1.9)
  g.lineTo(0.52, 1.9)
  g.lineTo(0.3, 5.7)
  g.lineTo(-0.3, 5.7)
  g.fill()
  g.fillStyle = C.steel
  g.fillRect(-0.06, 7.1, 0.12, 3.2)
  g.fillStyle = C.ivory
  g.fillRect(-0.33, -13.92, 0.66, 0.14)
  // The strings: the bowed one swings.
  for (let n = 0; n < 4; n++) {
    const live = n === which ? env : 0
    const xn = at(n, -13.8)
    const xb = at(n, 0)
    if (live > 0.015) lens(g, xn, -13.8, xb, 0, 0.11 * live, 0.55, rgba(hue, 0.4 * live))
    g.strokeStyle = mix(n < 2 ? C.steelDark : C.wire, hue, 0.7 * live)
    g.lineWidth = Math.max(px, 0.075 - 0.012 * n)
    g.beginPath()
    g.moveTo(xn, -13.8)
    g.lineTo(xb + (live > 0.01 ? 0.03 * live * Math.sin(TAU * 13 * t) : 0), 0)
    g.lineTo((-0.3 + 0.2 * n) * 1, 1.95)
    g.stroke()
  }
  g.fillStyle = C.maple
  g.beginPath()
  g.moveTo(-0.95, 0.14)
  g.lineTo(-0.8, -0.14)
  g.lineTo(0.8, -0.14)
  g.lineTo(0.95, 0.14)
  g.fill()
  g.restore()
}

/** The bow, and the rail it runs down: its frog is where the bass ball is, once the ball is in it. */
function bow(g: G, t: number, v: View): void {
  const x = t < BOW_T ? VX * BOW_T : ballAt(balls[1], t).x
  const y = lineY(LANES.bass, x)
  const x0 = VX * BOW_T - 1.2
  const x1 = cellos[cellos.length - 1].x + 2
  if (x1 < v.x0 || x0 > v.x1) return
  const at = (dx: number, under: number): [number, number] => [x + dx, y + SLOPE * dx + under]
  g.lineCap = 'round'
  // The rail under it.
  g.strokeStyle = C.shadow
  g.lineWidth = 0.1
  g.beginPath()
  g.moveTo(x0 + 0.08, lineY(LANES.bass, x0) + 1.2)
  g.lineTo(x1 + 0.08, lineY(LANES.bass, x1) + 1.2)
  g.stroke()
  g.strokeStyle = C.brass
  g.lineWidth = 0.065
  g.beginPath()
  g.moveTo(x0, lineY(LANES.bass, x0) + 1.05)
  g.lineTo(x1, lineY(LANES.bass, x1) + 1.05)
  g.stroke()
  // The stick, sprung toward the hair in its middle, and the hair.
  const tipX = HAIR_FROM + HAIR
  g.strokeStyle = C.stick
  g.lineWidth = 0.13
  g.beginPath()
  g.moveTo(...at(-0.45, 0.36))
  g.quadraticCurveTo(...at(tipX / 2, HAIR_UNDER - 0.02), ...at(tipX + 0.25, 0.3))
  g.stroke()
  g.strokeStyle = C.hair
  g.lineWidth = 0.085
  g.beginPath()
  g.moveTo(...at(HAIR_FROM - 0.2, HAIR_UNDER))
  g.lineTo(...at(tipX, HAIR_UNDER))
  g.stroke()
  g.lineCap = 'butt'
  g.fillStyle = C.stick
  g.beginPath()
  g.moveTo(...at(tipX - 0.12, HAIR_UNDER + 0.04))
  g.lineTo(...at(tipX + 0.32, 0.26))
  g.lineTo(...at(tipX - 0.05, 0.3))
  g.fill()
  // The frog: ebony, with a cup the ball sits in and a wheel on the rail.
  g.fillStyle = C.ebony
  g.beginPath()
  g.moveTo(...at(-0.5, 0.3))
  g.lineTo(...at(0.62, 0.3))
  g.lineTo(...at(0.62, HAIR_UNDER + 0.07))
  g.lineTo(...at(-0.5, HAIR_UNDER + 0.07))
  g.fill()
  g.strokeStyle = C.brass
  g.lineWidth = 0.07
  g.beginPath()
  g.arc(x, y, R + 0.05, 0.25, Math.PI - 0.25)
  g.stroke()
  g.lineWidth = 0.06
  g.beginPath()
  g.moveTo(...at(0, HAIR_UNDER + 0.07))
  g.lineTo(...at(0, 0.9))
  g.stroke()
  g.fillStyle = C.brassLight
  g.beginPath()
  g.arc(...at(0, 0.9), 0.13, 0, TAU)
  g.fill()
}

function ball(g: G, n: number, t: number): void {
  const b = balls[n]
  const p = ballAt(b, t)
  const hue = b.color
  g.fillStyle = 'rgba(74, 48, 22, 0.2)'
  g.beginPath()
  g.ellipse(p.x + 0.13, p.y + 0.19, R, R * 0.95, 0, 0, TAU)
  g.fill()
  const grad = g.createRadialGradient(p.x - 0.1, p.y - 0.12, 0.02, p.x, p.y, R)
  grad.addColorStop(0, mix(hue, '#FFFFFF', 0.45))
  grad.addColorStop(0.45, hue)
  grad.addColorStop(1, mix(hue, '#000000', 0.35))
  g.fillStyle = grad
  g.beginPath()
  g.arc(p.x, p.y, R, 0, TAU)
  g.fill()
  // A fleck that goes round as it rolls; the ball in the bow's frog is held.
  const turn = (n === 1 && t > BOW_T ? VX * BOW_T : p.x) / R
  g.fillStyle = mix(hue, '#000000', 0.3)
  g.beginPath()
  g.arc(p.x + Math.cos(turn) * R * 0.52, p.y + Math.sin(turn) * R * 0.52, 0.055, 0, TAU)
  g.fill()
  g.fillStyle = 'rgba(255,255,255,0.75)'
  g.beginPath()
  g.arc(p.x - 0.11, p.y - 0.13, 0.06, 0, TAU)
  g.fill()
}

export interface Drawing {
  draw(p: p5, t: number, k: number): void
  over(p: p5, t: number, k: number): void
}

export function makeDrawing(): Drawing {
  return {
    draw(p, t, k) {
      const g = p.drawingContext as G
      g.save()
      g.scale(k, k)
      const px = 1 / k
      const v = viewOf(g)
      board(g, v, px)
      for (const c of cellosByX) if (c.x > v.x0 - 6 && c.x < v.x1 + 6) cello(g, c, t, px)
      const a = from(contacts, v.x0 - 1.5)
      const b = from(contacts, v.x1 + 3)
      for (let i = a; i < b; i++) if (contacts[i].kind === 'pipe') pipe(g, contacts[i], t, px)
      // What lets a ball go: a wire from the part that is struck to the latch.
      for (const w of trips) {
        if (Math.max(w.x0, w.x1) < v.x0 || Math.min(w.x0, w.x1) > v.x1) continue
        const pull = clamp(1 - Math.abs(t - w.t) / 0.25)
        g.strokeStyle = rgba(C.ink, 0.35 + 0.5 * pull)
        g.lineWidth = Math.max(px, 0.03)
        g.beginPath()
        g.moveTo(w.x0 - 0.5, w.y0 + 0.2)
        g.lineTo(w.x1 + R + 0.1, w.y1 + R - 0.62)
        g.stroke()
      }
      for (let i = from(railsByX, v.x0 - 50); i < railsByX.length && railsByX[i].x < v.x1 + 2; i++) {
        if (railsByX[i].x1 > v.x0 - 1) rail(g, railsByX[i], t)
      }
      for (let i = a; i < b; i++) {
        const c = contacts[i]
        if (c.kind === 'tine') tine(g, c, t)
        else if (c.kind === 'piano') action(g, c, t, px)
        else bellows(g, c, t)
      }
      for (const c of cups) if (c.x > v.x0 - 1 && c.x < v.x1 + 1) cup(g, c.x, c.y)
      bow(g, t, v)
      for (let n = 0; n < balls.length; n++) ball(g, n, t)
      g.restore()
    },
    over(p, t, k) {
      const g = p.drawingContext as G
      g.save()
      g.scale(k, k)
      const px = 1 / k
      // Every strike, seen: a ring in the ball's colour going out from where it landed, as big as the blow.
      const LIFE = 0.55
      const a = from(contacts, VX * (t - LIFE) - 0.5)
      const b = from(contacts, VX * t + 0.5)
      for (let i = a; i < b; i++) {
        const c = contacts[i]
        const age = t - c.t
        if (age < 0 || age > LIFE) continue
        const f = age / LIFE
        const size = (c.i === SIXTEENTHS ? 1.5 : 0.95) * Math.min(1.3, c.vin / 24)
        g.strokeStyle = rgba(BALL_COLORS[c.ball], 0.55 * (1 - f) ** 2)
        g.lineWidth = Math.max(px, 0.05 * (1 - f) + 0.012)
        g.beginPath()
        g.arc(c.x, c.y + R, 0.25 + size * (1 - (1 - f) ** 3), 0, TAU)
        g.stroke()
      }
      // The chord: one wide ring from its middle.
      const age = t - CHORD_T
      if (age > 0 && age < 1.6) {
        const f = age / 1.6
        const x = VX * CHORD_T
        g.strokeStyle = rgba(C.ink, 0.22 * (1 - f) ** 2)
        g.lineWidth = Math.max(px, 0.06 * (1 - f))
        g.beginPath()
        g.arc(x, lineY(LANES.tine, x) + 1.5, 1 + 9 * (1 - (1 - f) ** 3), 0, TAU)
        g.stroke()
      }
      g.restore()
    },
  }
}
