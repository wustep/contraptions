import type { Light } from '../../light'
import { circle, ellipse, fill, hash, ink, knock, lerp, lit, mix, poly, rgba, ring, smooth, smoother, type Paint, type Pt } from '../../paint'
import { BATH } from '../../geo'
import { G } from '../../path'
import { AWAY, FREE, HEAVE, HOOK, JUNK, LAUGHS, RISE, SPIRIT_IN } from './beats'
import { DOORWAY, THORN, hauled, inside } from './hall'

/**
 * The river's spirit. He comes in through the back doors from the night as a heaving mound of sludge, grey-brown,
 * and heaves himself up into the tub. A bicycle's handlebar sticks out of his side, the thorn. Hauled on, it comes
 * free with the bicycle on it, and what was in him pours out after it, a thing a note. Clean, he rises out of the
 * water: an old man's smiling face on a column of clear water. He laughs, and goes: up, over the tub, out through
 * the back doors as a long ribbon of water, away over the sea.
 */

const T = BATH.tub
const FLOOR = BATH.hall.y1
const MUD = '#6E5D46'
const MUD_DARK = '#4C3F2F'
const MUD_LIGHT = '#8E7C60'
const WATER = '#A4D7DA'

/** Where the mound's middle is, how big, as he comes in and heaves himself into the tub. */
function moundAt(t: number): { x: number; base: number; s: number; seen: number } {
  // In from the doorway along the floor, growing as he comes from the night into the hall.
  const come = smoother(t, SPIRIT_IN, HEAVE - 0.15)
  const inX = lerp((DOORWAY.x0 + DOORWAY.x1) / 2, 66.55, come)
  const inS = lerp(0.42, 0.78, come)
  // Then up over the tub's east rim and down into it.
  const heave = smoother(t, HEAVE, HEAVE + 0.75)
  const x = lerp(inX, 63.1, heave)
  const lift = Math.sin(Math.PI * heave) * 0.55
  // Along the floor from the back wall's foot towards the tub, then up into it.
  const floor = lerp(DOORWAY.y1, -1.4, come)
  const base = lerp(floor, T.rim + 0.55, heave) - lift
  const s = lerp(inS, 1, heave)
  // He clears, shrinks into the water, after the thorn: the mud going out of him.
  const seen = 1 - smooth(t, FREE + 0.5, RISE - 0.1)
  return { x, base, s, seen }
}

/** The thorn: the handlebar's end, where it sticks out of his west side; hauled up after the hook takes it. */
export function thornAt(t: number): Pt {
  return [THORN[0], THORN[1] - (t >= HOOK ? hauled(t) : 0)]
}

/** Is he in the hall yet, or still in the doorway (seen only through it)? */
export const throughDoor = (t: number): boolean => t >= SPIRIT_IN + 0.6

/** The mound, under the tub's front (it sits in the tub) and over the back wall. */
export function drawMound(g: Paint, L: Light): void {
  const { ctx, t } = g
  if (t < SPIRIT_IN - 0.05) return
  const m = moundAt(t)
  if (m.seen <= 0.01) return
  const IN = inside(L)
  const clear = 1 - m.seen
  const body = mix(lit(MUD, IN), mix(WATER, IN, 0.2), clear)
  const dark = mix(lit(MUD_DARK, IN), mix(WATER, IN, 0.3), clear)
  const heave = 1 + 0.03 * Math.sin(t * 1.3) + 0.04 * knock(t, HEAVE + 0.75, 0.1, 0.5)
  const w = 2.05 * m.s
  const h = 1.45 * m.s * heave * lerp(1, 0.35, smooth(t, FREE + 0.5, RISE - 0.1))
  const clipped = !throughDoor(t)
  ctx.save()
  if (clipped) {
    ctx.beginPath()
    ctx.rect(DOORWAY.x0, DOORWAY.y0, DOORWAY.x1 - DOORWAY.x0, DOORWAY.y1 - DOORWAY.y0 + 0.3)
    ctx.clip()
  }
  ctx.globalAlpha = Math.min(1, m.seen * 1.4)
  // A heap of lobes, lopsided, slumping as it moves.
  const lobes: [number, number, number][] = [
    [-0.75, -0.3, 0.42],
    [-0.35, -0.62, 0.5],
    [0.15, -0.78, 0.55],
    [0.6, -0.55, 0.48],
    [0.9, -0.25, 0.36],
  ]
  ctx.beginPath()
  for (const [i, [lx, ly, r]] of lobes.entries()) {
    const wob = 0.04 * Math.sin(t * 1.7 + i * 1.9)
    const cx = m.x + lx * w * 0.5
    const cy = m.base + ly * h + wob * h
    ctx.moveTo(cx + r * w * 0.5, cy)
    ctx.arc(cx, cy, r * w * 0.5, 0, Math.PI * 2)
  }
  ctx.rect(m.x - w * 0.55, m.base - h * 0.35, w * 1.1, h * 0.35 + 0.02)
  fill(ctx, body)
  // His underside darker, and a few slow drips of the darker mud down him.
  ctx.save()
  ctx.clip()
  ctx.fillStyle = rgba(dark, 0.9)
  ctx.fillRect(m.x - w, m.base - h * 0.32, w * 2, h)
  for (let i = 0; i < 4; i++) {
    const dx = (hash(i, 3) - 0.5) * w * 0.8
    const len = (0.25 + 0.35 * ((t * 0.12 + hash(i, 4)) % 1)) * h
    ctx.beginPath()
    ctx.moveTo(m.x + dx - 0.04, m.base - h * 0.85)
    ctx.quadraticCurveTo(m.x + dx, m.base - h * 0.85 + len, m.x + dx + 0.04, m.base - h * 0.85)
    fill(ctx, rgba(dark, 0.7))
  }
  // A lighter wet sheen across his top.
  ctx.beginPath()
  ctx.ellipse(m.x - w * 0.08, m.base - h * 0.78, w * 0.3, h * 0.08, -0.15, 0, Math.PI * 2)
  fill(ctx, rgba(mix(lit(MUD_LIGHT, IN), '#E8F2EE', clear), 0.55))
  ctx.restore()
  ctx.restore()
}

/** The neck of mud the hauled thorn draws up out of him, and the handlebar itself. */
export function drawThorn(g: Paint, L: Light): void {
  const { ctx, t } = g
  if (t < HEAVE + 0.6 || t >= FREE) return
  const IN = inside(L)
  const m = moundAt(t)
  const [tx, ty] = thornAt(t)
  // The neck: from deep in his flank up to the bar, sagging back towards him and thinner the further it is drawn.
  const up = THORN[1] - ty
  if (up > 0.01) {
    const base = THORN[1] + 0.3
    const thin = 1 / Math.sqrt(1 + up * 2.5)
    ctx.beginPath()
    ctx.moveTo(tx + 0.12 - 0.3 * thin, base)
    ctx.bezierCurveTo(tx + 0.1 - 0.12 * thin, base - up * 0.45, tx + 0.02, ty + up * 0.3, tx + 0.03, ty + 0.04)
    ctx.lineTo(tx + 0.13, ty + 0.05)
    ctx.bezierCurveTo(tx + 0.16, ty + up * 0.35, tx + 0.22 + 0.2 * thin, base - up * 0.3, tx + 0.55 + 0.2 * thin, base + 0.05)
    ctx.closePath()
    fill(ctx, lit(MUD, IN))
    // A drip hanging off its underside, lengthening as it is drawn.
    const dy = ty + up * 0.55
    const dx = tx + 0.16 + 0.12 * thin
    ctx.beginPath()
    ctx.moveTo(dx - 0.035, dy)
    ctx.quadraticCurveTo(dx, dy + 0.1 + up * 0.12, dx + 0.035, dy)
    fill(ctx, lit(MUD, IN))
  }
  // The handlebar: a curved bar out of the mud, a grip on its end, rusted.
  const shake = 0.012 * ring(t, HOOK, 6, 0.25)
  ctx.save()
  ctx.translate(tx + shake, ty)
  ctx.beginPath()
  ctx.moveTo(0.14, 0.04)
  ctx.quadraticCurveTo(-0.12, 0.02, -0.28, -0.15)
  ctx.lineCap = 'round'
  ctx.strokeStyle = lit('#2A2624', IN)
  ctx.lineWidth = 0.075
  ctx.stroke()
  ctx.strokeStyle = lit('#8A847A', IN)
  ctx.lineWidth = 0.045
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-0.26, -0.13)
  ctx.lineTo(-0.37, -0.25)
  ctx.strokeStyle = lit('#2A2624', IN)
  ctx.lineWidth = 0.08
  ctx.stroke()
  ctx.lineCap = 'butt'
  ctx.restore()
  void m
}

/* ------------------------------------------------------------------ the junk */

interface Junk {
  kind: 'tyre' | 'drum' | 'net' | 'crate' | 'tyre2'
  at: number
  to: Pt
  roll: number
}

/** What pours out of him after the bicycle, a thing a note, and where each comes to rest on the boards. */
export const JUNKS: Junk[] = [
  { kind: 'tyre', at: JUNK[0], to: [66.1, FLOOR], roll: 0.55 },
  { kind: 'drum', at: JUNK[1], to: [67.35, FLOOR], roll: 0.05 },
  { kind: 'tyre2', at: JUNK[2], to: [65.75, FLOOR], roll: 1.05 },
  { kind: 'net', at: JUNK[3], to: [64.95, T.rim], roll: 0 },
  { kind: 'crate', at: JUNK[4], to: [68.15, FLOOR], roll: 0.1 },
]

const SPOUT_TOP: Pt = [63.15, -3.1]

/** A thing's flight from his top to where it lands, then a damped roll along the boards. */
function junkAt(j: Junk, t: number): { p: Pt; a: number; on: boolean } {
  const T1 = 0.72
  const s = t - j.at
  if (s < 0) return { p: SPOUT_TOP, a: 0, on: false }
  const half = j.kind === 'drum' || j.kind === 'crate' ? 0.2 : j.kind === 'net' ? 0.04 : 0.17
  const end: Pt = [j.to[0], j.to[1] - half]
  if (s < T1) {
    const vx = (end[0] - SPOUT_TOP[0]) / T1
    const vy = (end[1] - SPOUT_TOP[1] - 0.5 * G * T1 * T1) / T1
    return { p: [SPOUT_TOP[0] + vx * s, SPOUT_TOP[1] + vy * s + 0.5 * G * s * s], a: s * 5, on: true }
  }
  const u = s - T1
  const go = j.roll * (1 - Math.exp(-u * 2.2))
  const bounce = j.kind === 'net' ? 0 : 0.06 * Math.abs(Math.sin(u * 9)) * Math.exp(-u * 5)
  return { p: [end[0] + go, end[1] - bounce], a: T1 * 5 + go / Math.max(half, 0.05), on: true }
}

function drawJunkOne(g: Paint, L: Light, j: Junk): void {
  const { ctx, t } = g
  const { p, a, on } = junkAt(j, t)
  if (!on) return
  const IN = inside(L)
  const muck = lit('#4E4234', IN)
  const line = lit('#221A12', IN)
  ctx.save()
  ctx.translate(p[0], p[1])
  if (j.kind === 'tyre' || j.kind === 'tyre2') {
    ctx.rotate(a)
    circle(ctx, 0, 0, 0.17)
    fill(ctx, lit('#2C2A28', IN))
    circle(ctx, 0, 0, 0.09)
    fill(ctx, lit('#7A6650', IN))
    ink(g, line, 1)
    poly(ctx, [[-0.15, 0], [-0.05, 0]], false)
    ink(g, lit('#4A4642', IN), 1.4)
  } else if (j.kind === 'drum') {
    ctx.rotate(Math.min(a, 0.3) * 0.2)
    ctx.fillStyle = lit('#8A4A2E', IN)
    ctx.fillRect(-0.15, -0.2, 0.3, 0.4)
    ctx.strokeStyle = line
    ctx.lineWidth = Math.max(1.25 * g.px, 1.2 / 108)
    ctx.strokeRect(-0.15, -0.2, 0.3, 0.4)
    for (const y of [-0.08, 0.08]) {
      poly(ctx, [[-0.15, y], [0.15, y]], false)
      ink(g, lit('#5A2E1C', IN), 1.4)
    }
    ctx.fillStyle = rgba(muck, 0.7)
    ctx.fillRect(-0.15, 0.05, 0.3, 0.15)
  } else if (j.kind === 'crate') {
    ctx.rotate(Math.sin(a) * 0.15)
    ctx.fillStyle = lit('#9A7A50', IN)
    ctx.fillRect(-0.2, -0.17, 0.4, 0.37)
    ctx.strokeStyle = line
    ctx.lineWidth = Math.max(1.25 * g.px, 1.2 / 108)
    ctx.strokeRect(-0.2, -0.17, 0.4, 0.37)
    poly(ctx, [[-0.2, -0.17], [0.2, 0.2]], false)
    ink(g, lit('#6A5034', IN), 1.3)
  } else {
    // The fishing line: a tangle, with a red float, draped over the rim where it fell.
    ctx.beginPath()
    for (let i = 0; i < 7; i++) {
      const r = 0.06 + 0.06 * hash(i, 9)
      const cx = (hash(i, 7) - 0.5) * 0.3
      const cy = (hash(i, 8) - 0.5) * 0.1
      ctx.moveTo(cx + r, cy)
      ctx.ellipse(cx, cy, r, r * 0.6, i, 0, Math.PI * 2)
    }
    ink(g, lit('#B9B2A0', IN), 1.1)
    circle(ctx, 0.12, 0.08, 0.04)
    fill(ctx, lit('#C8402E', IN))
  }
  ctx.restore()
}

export function drawJunk(g: Paint, L: Light): void {
  for (const j of JUNKS) drawJunkOne(g, L, j)
}

/**
 * The bicycle, on the hook once it is free: it comes up out of him on the rope and hangs from the pulley's hook by its
 * bars, swinging and dripping, as the hands, the rope gone slack, tumble back on the gallery.
 */
export function drawBicycle(g: Paint, L: Light, hook: Pt): void {
  const { ctx, t } = g
  if (t < FREE) return
  const IN = inside(L)
  const swing = 0.35 * ring(t, FREE, 0.7, 1.6)
  const frame = lit('#5A4A3E', IN)
  ctx.save()
  ctx.translate(hook[0], hook[1] + 0.04)
  ctx.rotate(swing)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const w = (c: string, lw: number) => {
    ctx.strokeStyle = c
    ctx.lineWidth = lw
    ctx.stroke()
  }
  // Hanging by its bars: the front wheel under the bars, the frame back and down to the rear wheel.
  const front: Pt = [0.05, 0.38]
  const rear: Pt = [0.5, 0.62]
  for (const [cx, cy] of [front, rear]) {
    circle(ctx, cx, cy, 0.19)
    w(lit('#24201C', IN), 0.05)
    circle(ctx, cx, cy, 0.02)
    fill(ctx, lit('#24201C', IN))
  }
  ctx.beginPath()
  ctx.moveTo(-0.04, 0.02)
  ctx.lineTo(front[0], front[1])
  ctx.moveTo(0.0, 0.12)
  ctx.lineTo(0.36, 0.26)
  ctx.lineTo(rear[0], rear[1])
  ctx.moveTo(0.36, 0.26)
  ctx.lineTo(0.22, 0.5)
  ctx.lineTo(0.03, 0.2)
  w(frame, 0.05)
  // The bars, and the seat.
  ctx.beginPath()
  ctx.moveTo(-0.14, 0.0)
  ctx.lineTo(0.08, 0.02)
  w(lit('#3E3A36', IN), 0.035)
  ctx.beginPath()
  ctx.ellipse(0.38, 0.22, 0.07, 0.025, 0.2, 0, Math.PI * 2)
  fill(ctx, lit('#2A2420', IN))
  // Mud still on it, dripping off.
  for (let i = 0; i < 3; i++) {
    const age = (t - FREE + i * 0.45) % 1.35
    const x = [0.1, 0.42, 0.25][i]
    const y = [0.55, 0.78, 0.5][i] + age * age * 2.2
    if (t - FREE + i * 0.45 > 6) continue
    ellipse(ctx, x, y, 0.016, 0.026)
    fill(ctx, rgba(lit(MUD_DARK, IN), 0.8 * (1 - age / 1.35)))
  }
  ctx.lineCap = 'butt'
  ctx.lineJoin = 'miter'
  ctx.restore()
}

/* ------------------------------------------------------------------ the spirit, clean */

/** The face's middle and size as he rises, laughs and goes: in the hall, up out of the water to under the ceiling. */
export function faceAt(t: number): { p: Pt; s: number; out: boolean } {
  const rise = smoother(t, RISE, RISE + 1.4)
  const bob = LAUGHS.reduce((b, l) => b - 0.07 * knock(t, l, 0.08, 0.32) + 0.03 * ring(t, l + 0.15, 2.4, 0.35), 0)
  const rest: Pt = [63.15, lerp(T.rim - 0.15, -3.62, rise) + bob]
  if (t < AWAY) return { p: rest, s: lerp(0.6, 1, rise), out: false }
  // Away: up and east over the spout, then down through the doorway into the night, smaller as he goes.
  const u = smoother(t, AWAY, AWAY + 1.45)
  const mid: Pt = [66.0, -3.95]
  const door: Pt = [(DOORWAY.x0 + DOORWAY.x1) / 2, -2.55]
  const v = 1 - u
  const p: Pt = [v * v * rest[0] + 2 * v * u * mid[0] + u * u * door[0], v * v * rest[1] + 2 * v * u * mid[1] + u * u * door[1]]
  const beyond = smooth(t, AWAY + 1.45, AWAY + 2.6)
  if (beyond <= 0) return { p, s: lerp(1, 0.75, u), out: false }
  return { p: [door[0] + 0.15 * beyond, door[1] - 0.45 * beyond], s: lerp(0.75, 0.12, beyond), out: true }
}

/** The ribbon behind the face: points where the face has been, with how big it was there, back to `len` cells. */
function ribbon(head: (t: number) => { p: Pt; s: number }, t: number, len: number, n = 36): { p: Pt; s: number; at: number }[] {
  const seg = len / n
  const h0 = head(t)
  const out: { p: Pt; s: number; at: number }[] = [{ ...h0, at: t }]
  let prev = h0.p
  let acc = 0
  let s = t
  const dt = 1 / 120
  while (out.length <= n && s > t - 8) {
    s -= dt
    const h = head(s)
    const d = Math.hypot(h.p[0] - prev[0], h.p[1] - prev[1])
    if (d <= 1e-9) continue
    acc += d
    while (acc >= seg && out.length <= n) {
      const f = 1 - (acc - seg) / d
      out.push({ p: [prev[0] + (h.p[0] - prev[0]) * f, prev[1] + (h.p[1] - prev[1]) * f], s: h.s, at: s })
      acc -= seg
    }
    prev = h.p
  }
  // Still in the water: the rest of him goes straight down into the tub.
  while (out.length <= n) {
    const last = out[out.length - 1]
    out.push({ p: [last.p[0], last.p[1] + seg], s: last.s, at: last.at })
  }
  return out
}

/** A run of the ribbon as one shape: `pts` head first, its width at each (`w`), filled in water, its core lit. */
function band(g: Paint, pts: { p: Pt; s: number }[], w: (i: number) => number, color: string, a: number, wave: number): void {
  const { ctx, t } = g
  if (pts.length < 2) return
  const L: Pt[] = []
  const R: Pt[] = []
  for (let i = 0; i < pts.length; i++) {
    const a0 = pts[Math.max(0, i - 1)].p
    const b0 = pts[Math.min(pts.length - 1, i + 1)].p
    const dx = a0[0] - b0[0]
    const dy = a0[1] - b0[1]
    const d = Math.hypot(dx, dy) || 1
    const nx = dy / d
    const ny = -dx / d
    const ww = w(i) * (1 + wave * 0.12 * Math.sin(t * 6 - i * 0.7))
    L.push([pts[i].p[0] + nx * ww, pts[i].p[1] + ny * ww])
    R.push([pts[i].p[0] - nx * ww, pts[i].p[1] - ny * ww])
  }
  ctx.beginPath()
  ctx.moveTo(L[0][0], L[0][1])
  for (const p of L) ctx.lineTo(p[0], p[1])
  for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1])
  ctx.closePath()
  fill(ctx, rgba(color, a))
  ctx.beginPath()
  ctx.moveTo(pts[0].p[0], pts[0].p[1])
  for (const p of pts) ctx.lineTo(p.p[0] - 0.02, p.p[1])
  ink(g, rgba('#F6FCF8', a * 0.65), 2.4)
}

/** The mask: an old man's face, white, smiling, his eyes shut crescents, white brows, his beard into the water. */
export function drawFace(g: Paint, p: Pt, s: number, laugh: number, light: string): void {
  const { ctx } = g
  ctx.save()
  ctx.translate(p[0], p[1])
  ctx.scale(s, s)
  const face = mix('#F3EEE2', light, 0.15)
  const shade = mix('#D8CFBC', light, 0.15)
  const line = mix('#5A4A3A', light, 0.2)
  // The beard: long strands down into the water.
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath()
    ctx.moveTo(i * 0.06, 0.18)
    ctx.quadraticCurveTo(i * 0.09 + 0.03 * Math.sin(g.t * 3 + i), 0.45, i * 0.05, 0.62 + 0.04 * (2 - Math.abs(i)))
    ctx.lineTo(i * 0.06 + 0.04, 0.18)
    ctx.closePath()
    fill(ctx, rgba(face, 0.9))
  }
  ellipse(ctx, 0, 0, 0.24, 0.3)
  fill(ctx, face)
  // The cheeks' shade, low.
  ellipse(ctx, 0, 0.12, 0.2, 0.12)
  fill(ctx, rgba(shade, 0.6))
  // The eyes: shut, smiling crescents, deeper as he laughs.
  for (const sx of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(sx * 0.15, -0.02)
    ctx.quadraticCurveTo(sx * 0.09, -0.08 - laugh * 0.03, sx * 0.03, -0.02)
    ink(g, line, 2.2 / s)
    // The brows: white tufts.
    ellipse(ctx, sx * 0.1, -0.13, 0.08, 0.035, sx * -0.25)
    fill(ctx, '#FFFFFF')
  }
  // The mouth: a wide smile, open a little in the laugh.
  ctx.beginPath()
  ctx.moveTo(-0.1, 0.12)
  ctx.quadraticCurveTo(0, 0.2 + laugh * 0.06, 0.1, 0.12)
  ctx.quadraticCurveTo(0, 0.16, -0.1, 0.12)
  fill(ctx, line)
  ctx.restore()
}

/** The spirit in the hall: the column of him up out of the tub, and his face; away through the doors after. */
export function drawSpirit(g: Paint, L: Light): void {
  const { ctx, t } = g
  if (t < RISE - 0.05 || t > AWAY + 3.2) return
  const IN = inside(L)
  const water = mix(WATER, IN, 0.15)
  const pts = ribbon((s) => faceAt(Math.max(RISE, s)), t, 2.6)
  const laugh = LAUGHS.reduce((m, l) => Math.max(m, knock(t, l, 0.06, 0.4)), 0)
  const rise = smooth(t, RISE, RISE + 0.6)
  const width = (i: number, ps: { s: number }[]) => (0.24 + 0.24 * (i / ps.length)) * ps[i].s * rise
  const inHall = pts.filter((q) => !faceAt(q.at).out)
  const outside = pts.filter((q) => faceAt(q.at).out)
  // The part still in the hall, down into the tub's water and no further.
  ctx.save()
  ctx.beginPath()
  ctx.rect(BATH.hall.x0, BATH.hall.y0, BATH.hall.x1 - BATH.hall.x0, T.bed - BATH.hall.y0)
  ctx.clip()
  band(g, inHall, (i) => width(i, inHall), water, 0.72, 1)
  ctx.restore()
  // The part already gone through the doors: seen only through them, against the night.
  if (outside.length > 1) {
    const d = DOORWAY
    ctx.save()
    ctx.beginPath()
    ctx.rect(d.x0, d.y0, d.x1 - d.x0, d.y1 - d.y0)
    ctx.clip()
    band(g, outside, (i) => width(i, outside), mix(WATER, L.ambient, 0.4), 0.8, 1)
    ctx.restore()
  }
  const f = faceAt(t)
  if (f.out) {
    const d = DOORWAY
    ctx.save()
    ctx.beginPath()
    ctx.rect(d.x0, d.y0, d.x1 - d.x0, d.y1 - d.y0)
    ctx.clip()
    drawFace(g, f.p, f.s * rise, laugh, L.ambient)
    ctx.restore()
  } else {
    drawFace(g, f.p, f.s * rise, laugh, IN)
  }
}

/** Outside, wide: the ribbon of him coming up from behind the bathhouse and away east over the sea, smaller and smaller. */
export function outsideAt(t: number, from: number): { p: Pt; s: number } {
  // Already up over the roofs at the cut, so the shot is never empty: sweeping up and out over the sea, going away.
  const u = smoother(t, from - 1.0, from + 3.2)
  const a: Pt = [66.8, -8.6]
  const b: Pt = [70.5, -17.5]
  const c: Pt = [86.0, -16.0]
  const v = 1 - u
  const p: Pt = [v * v * a[0] + 2 * v * u * b[0] + u * u * c[0], v * v * a[1] + 2 * v * u * b[1] + u * u * c[1]]
  return { p, s: lerp(1.25, 0.3, u) }
}

export function drawSpiritOutside(g: Paint, L: Light, from: number, until: number): void {
  const { t } = g
  if (t < from || t >= until) return
  // Clear water lit by the moon: paler than the smoke, fuller, with the old face at its head.
  const water = mix(mix(WATER, '#FFFFFF', 0.5), L.ambient, 0.18)
  const pts = ribbon((s) => outsideAt(s, from), t, 6.0, 40)
  band(g, pts, (i) => (0.42 + 0.3 * Math.sin(Math.PI * Math.min(1, i / pts.length + 0.15))) * pts[i].s, water, 0.86, 1)
  const f = outsideAt(t, from)
  drawFace(g, f.p, f.s * 1.05, 0, '#FFFFFF')
}
