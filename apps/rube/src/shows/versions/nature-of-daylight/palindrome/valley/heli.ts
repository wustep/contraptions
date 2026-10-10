import type p5 from 'p5'
import { R, type Pt } from '../../../../../parts'
import { mix, rgba } from '../cast'
import { smooth } from '../kit'
import { VALLEY } from '../worlds'
import { A, MEADOW } from './geo'

/**
 * The helicopter that brings her (the VALLEY builder's): it comes over the ridge on the bass's first hard note, glides
 * down the valley toward the shell's foot, flares, and hangs low over the pad; she drops out of its door onto the
 * meadow as the chord changes, and it climbs away.
 * It faces left (its nose the way it flies). Local frame: the skid's foot at the origin, y down; the heli is turned
 * about its centre of mass by its pitch.
 */

/** Where it hovers over the pad to let her out: the skid's foot a little over the grass. */
export const HOVER: Pt = [9.5, MEADOW - 0.62]
/** Her seat in the door, the centre of mass, in the local frame. */
export const SEAT_L: Pt = [0.18, -0.36 - R]
const COM: Pt = [0.35, -0.75]

/** When it holds its hover, and when it climbs away. */
export const HOLD = 110.0
export const AWAY = 111.624

/** Keys of its flight: time, where the skid's foot is, its velocity. A cubic Hermite between them. */
const KEYS: { t: number; p: Pt; v: Pt }[] = [
  { t: A.bass, p: [83, -7.5], v: [0, 0] },
  { t: A.crest, p: [62, -27], v: [-8.5, -1.4] },
  { t: 107.3, p: [31, -12.5], v: [-10.5, 4.6] },
  { t: A.flare, p: [17.6, -4.6], v: [-5.0, 2.4] },
  { t: HOLD, p: HOVER, v: [0, 0] },
  { t: AWAY, p: HOVER, v: [0, 0] },
  { t: 113.0, p: [12.6, -3.2], v: [3.4, -3.6] },
  { t: 115.2, p: [24, -12], v: [7, -4.4] },
  { t: 118.5, p: [50, -24], v: [9, -3] },
]

function hermite(t: number): { p: Pt; v: Pt; a: Pt } {
  if (t <= KEYS[0].t) return { p: KEYS[0].p, v: [0, 0], a: [0, 0] }
  const last = KEYS[KEYS.length - 1]
  if (t >= last.t) return { p: last.p, v: [0, 0], a: [0, 0] }
  let i = 0
  while (i + 1 < KEYS.length - 1 && KEYS[i + 1].t <= t) i++
  const a = KEYS[i]
  const b = KEYS[i + 1]
  const h = b.t - a.t
  const u = (t - a.t) / h
  const u2 = u * u
  const u3 = u2 * u
  const h00 = 2 * u3 - 3 * u2 + 1
  const h10 = u3 - 2 * u2 + u
  const h01 = -2 * u3 + 3 * u2
  const h11 = u3 - u2
  const d00 = (6 * u2 - 6 * u) / h
  const d10 = (3 * u2 - 4 * u + 1)
  const d01 = (-6 * u2 + 6 * u) / h
  const d11 = (3 * u2 - 2 * u)
  const e00 = (12 * u - 6) / (h * h)
  const e10 = (6 * u - 4) / h
  const e01 = (-12 * u + 6) / (h * h)
  const e11 = (6 * u - 2) / h
  const ch = (k: 0 | 1) => ({
    p: h00 * a.p[k] + h10 * h * a.v[k] + h01 * b.p[k] + h11 * h * b.v[k],
    v: d00 * a.p[k] + d10 * a.v[k] + d01 * b.p[k] + d11 * b.v[k],
    a: e00 * a.p[k] + e10 * a.v[k] + e01 * b.p[k] + e11 * b.v[k],
  })
  const x = ch(0)
  const y = ch(1)
  return { p: [x.p, y.p], v: [x.v, y.v], a: [x.a, y.a] }
}

/** The heli at show time `t`: where its skid's foot is, its pitch (radians; negative is nose down, to its left). */
export function heliAt(t: number): { p: Pt; pitch: number } {
  const { p, v, a } = hermite(t)
  // Nose down into its speed, up as it slows (the flare), and the slow roll of the air under it. Climbing away to the
  // right it turns its tail to us no more than a side view allows: its nose simply lifts and it goes.
  const pitch = Math.max(-0.3, Math.min(0.26, 0.022 * v[0] + 0.05 * a[0])) + 0.012 * Math.sin(t * 1.7)
  // In the hover it rides the air under it: a slow bob.
  const bob = t > HOLD - 0.4 && t < AWAY + 0.6 ? 0.04 * Math.sin((t - HOLD) * 3.1) * smooth(t, HOLD - 0.4, HOLD + 0.3) * (1 - smooth(t, AWAY, AWAY + 0.6)) : 0
  return { p: [p[0], p[1] + bob], pitch }
}

/** A local point of the heli taken into the world at `t`. */
export function heliPoint(t: number, q: Pt): Pt {
  const { p, pitch } = heliAt(t)
  const c = Math.cos(pitch)
  const s = Math.sin(pitch)
  const dx = q[0] - COM[0]
  const dy = q[1] - COM[1]
  return [p[0] + COM[0] + dx * c - dy * s, p[1] + COM[1] + dx * s + dy * c]
}

/** Her seat in the door, in the world. */
export const seatAt = (t: number): Pt => heliPoint(t, SEAT_L)

/** How fast its rotor turns: always flying. */
function rotorAt(_t: number): number {
  return 1
}

/** How hard its wash beats on the meadow under it: its rotor's speed, and how near the ground it is. */
export function washAt(t: number): number {
  const { p } = heliAt(t)
  const h = MEADOW - p[1]
  return rotorAt(t) * Math.max(0, 1 - h / 7) ** 1.5
}

/**
 * The heli, drawn in the world (cells times k). A dark olive body, its nose glazed, the door slid back (dark, where she
 * sits), the tail boom and fin, the main rotor seen edge on as a blur with a blade flickering through it.
 */
export function drawHeli(p: p5, k: number, t: number): void {
  if (t < A.bass - 0.5 || t > 118.5) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const { p: at, pitch } = heliAt(t)
  ctx.save()
  ctx.translate((at[0] + COM[0]) * k, (at[1] + COM[1]) * k)
  ctx.rotate(pitch)
  // Climbing away it turns round to fly off nose first: seen from the side, its length narrows and opens again. Never
  // narrower than a third: squeezed to a sliver mid-turn, its body, skid and tail stood on end and it read as falling.
  const turn = Math.cos(Math.PI * smooth(t, AWAY + 0.25, AWAY + 1.45))
  ctx.scale(Math.sign(turn || 1) * Math.max(0.35, Math.abs(turn)), 1)
  ctx.translate(-COM[0] * k, -COM[1] * k)
  const K = k
  const P = (x: number, y: number): [number, number] => [x * K, y * K]
  const body = VALLEY.olive
  const dark = VALLEY.oliveDark
  const poly = (pts: Pt[]) => {
    ctx.beginPath()
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * K, y * K) : ctx.moveTo(x * K, y * K)))
    ctx.closePath()
  }
  // The skid: a runner with its toe turned up, on two struts.
  ctx.fillStyle = mix(dark, VALLEY.shellDark, 0.4)
  poly([[-1.15, -0.07], [-1.0, -0.035], [1.05, -0.035], [1.05, 0], [-1.02, 0], [-1.2, -0.05]])
  ctx.fill()
  for (const x of [-0.55, 0.6]) {
    poly([[x - 0.035, -0.02], [x + 0.035, -0.02], [x + 0.06, -0.33], [x - 0.01, -0.33]])
    ctx.fill()
  }
  // The tail boom, tapering, and its fin and little wing.
  ctx.fillStyle = dark
  poly([[0.85, -1.0], [3.35, -1.12], [3.45, -1.02], [3.35, -0.96], [0.85, -0.66]])
  ctx.fill()
  poly([[3.05, -1.08], [3.25, -1.62], [3.45, -1.64], [3.46, -1.05]])
  ctx.fill()
  poly([[2.55, -0.99], [2.95, -0.99], [2.95, -0.93], [2.5, -0.93]])
  ctx.fill()
  // The cabin: a rounded body, fuller at the back, the nose low and forward.
  ctx.beginPath()
  ctx.moveTo(...P(0.98, -0.32))
  ctx.lineTo(...P(-0.95, -0.32))
  ctx.bezierCurveTo(...P(-1.45, -0.32), ...P(-1.6, -0.55), ...P(-1.55, -0.72))
  ctx.bezierCurveTo(...P(-1.45, -1.0), ...P(-1.05, -1.2), ...P(-0.6, -1.22))
  ctx.lineTo(...P(0.7, -1.24))
  ctx.bezierCurveTo(...P(1.0, -1.22), ...P(1.12, -1.0), ...P(1.1, -0.72))
  ctx.bezierCurveTo(...P(1.08, -0.5), ...P(1.05, -0.36), ...P(0.98, -0.32))
  ctx.closePath()
  const g = ctx.createLinearGradient(0, -1.24 * K, 0, -0.32 * K)
  g.addColorStop(0, mix(body, VALLEY.steel, 0.25))
  g.addColorStop(0.5, body)
  g.addColorStop(1, mix(body, VALLEY.shellDark, 0.35))
  ctx.fillStyle = g
  ctx.fill()
  // The glazing over the nose: the sky's grey in it.
  ctx.beginPath()
  ctx.moveTo(...P(-1.5, -0.7))
  ctx.bezierCurveTo(...P(-1.42, -0.98), ...P(-1.05, -1.15), ...P(-0.62, -1.16))
  ctx.lineTo(...P(-0.62, -0.72))
  ctx.closePath()
  ctx.fillStyle = mix(VALLEY.sky, VALLEY.steelDark, 0.45)
  ctx.fill()
  // The door, slid back: the dark of the cabin, where she sits, and the door itself over the back of the cabin.
  ctx.fillStyle = mix(VALLEY.shellDark, dark, 0.3)
  ctx.fillRect(-0.3 * K, -1.08 * K, 0.86 * K, 0.72 * K)
  ctx.fillStyle = mix(body, VALLEY.steel, 0.12)
  ctx.fillRect(0.58 * K, -1.1 * K, 0.34 * K, 0.76 * K)
  // The engine's cowl on top, and the mast.
  ctx.fillStyle = mix(dark, VALLEY.shellDark, 0.2)
  poly([[-0.55, -1.22], [-0.35, -1.42], [0.8, -1.42], [0.95, -1.22]])
  ctx.fill()
  ctx.fillRect(0.12 * K, -1.62 * K, 0.08 * K, 0.22 * K)
  // The main rotor, edge on: a blur, and a blade flickering through it as it turns.
  const spin = rotorAt(t)
  const reach = 2.7
  const hub: Pt = [0.16, -1.63]
  if (spin > 0.02) {
    const blur = ctx.createLinearGradient((hub[0] - reach) * K, 0, (hub[0] + reach) * K, 0)
    blur.addColorStop(0, rgba(VALLEY.steelDark, 0))
    blur.addColorStop(0.15, rgba(VALLEY.steelDark, 0.3 * spin))
    blur.addColorStop(0.5, rgba(VALLEY.steelDark, 0.45 * spin))
    blur.addColorStop(0.85, rgba(VALLEY.steelDark, 0.3 * spin))
    blur.addColorStop(1, rgba(VALLEY.steelDark, 0))
    ctx.fillStyle = blur
    ctx.beginPath()
    ctx.ellipse(hub[0] * K, hub[1] * K, reach * K, 0.06 * K, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  // The blade's angle: fast while flying (the eye sees it flicker), slowing to a stop.
  const turns = t * 5.3
  const phase = turns * Math.PI * 2
  ctx.strokeStyle = rgba(VALLEY.shellDark, 0.35 + 0.55 * (1 - spin))
  ctx.lineWidth = Math.max(1, 0.05 * K)
  ctx.lineCap = 'round'
  for (const off of [0, Math.PI]) {
    const len = reach * Math.cos(phase + off)
    ctx.beginPath()
    ctx.moveTo(hub[0] * K, hub[1] * K)
    ctx.lineTo((hub[0] + len) * K, (hub[1] + 0.03 * Math.sin(phase + off)) * K)
    ctx.stroke()
  }
  // The tail rotor, seen face on: two blades, a faint blur while they turn.
  const tr: Pt = [3.33, -1.28]
  if (spin > 0.02) {
    ctx.fillStyle = rgba(VALLEY.steelDark, 0.14 * spin)
    ctx.beginPath()
    ctx.arc(tr[0] * K, tr[1] * K, 0.34 * K, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.strokeStyle = rgba(VALLEY.shellDark, 0.4 + 0.5 * (1 - spin))
  ctx.lineWidth = Math.max(0.8, 0.035 * K)
  const tp = phase * 1.6
  ctx.beginPath()
  ctx.moveTo((tr[0] - Math.cos(tp) * 0.32) * K, (tr[1] - Math.sin(tp) * 0.32) * K)
  ctx.lineTo((tr[0] + Math.cos(tp) * 0.32) * K, (tr[1] + Math.sin(tp) * 0.32) * K)
  ctx.stroke()
  ctx.restore()
}
