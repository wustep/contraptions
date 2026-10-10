import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { drawScreen, inkRing, mix, PLACES, rgba } from '../cast'
import { SHANG, TENT } from '../worlds'
import { closeFlare, linkDrop, linkLit, linkSpan, panelAngle, redCast, screenFlash, screenOn } from './timeline'

/**
 * The ring: twelve screens on one circular rig like a clock face, each showing a shell over its own place, each
 * joined to the next by a lit link. The links together are a logogram's ring (the shape of `inkRing(12)`, gently):
 * the world talking to itself, written in light.
 *
 * Montana (0) is at the bottom, at six o'clock, just over the table; the rest go clockwise from it. Every screen
 * stands on its mount on the rig, hinged at its bottom left corner; let go, it tips over sideways on that corner like
 * a domino and hangs crooked against its stop, dark, its face still to us. Every link is a cable of light along the
 * ring from its mount to the next, drawn taut; let go at its latch, it goes slack and sags, a dark cable, until the
 * call draws it taut and lit again.
 *
 * All in the tent's own cells (the set stands at 0, 0); the table's top is y = 0.13 (a ball on it is at y = 0).
 */

/** Montana's hinge: the bottom of the ring, over the phone on the table. */
export const MONTANA: Pt = [0.3, -1.5]
/** The rig's radius to the mounts. */
export const RM = 4
/** A screen's panel (its frame), and the glass in it. */
export const PW = 1.62
export const PH = 1.04
const FR = 0.065
const GW = PW - 2 * FR
const GH = PH - 2 * FR
/** A link's width taut and lit; the width of the slack cable it becomes; how far it sags. */
const LW = 0.25
const ROPE = 0.13
const SAG = 0.75
/** How far a fallen screen hangs over on its corner (radians, clockwise). */
const STOP = 0.52

const RING = inkRing(12)
/** The ring's radius at an angle, as a share of RM: a logogram's ring, but only a little out of true (it is a rig). */
const wob = (a: number) => 1 + 0.28 * (RING.r(a) - 1)
/** Screen i's angle round the ring (y down: π/2 is six o'clock, and clockwise is increasing). */
export const angleOf = (i: number) => Math.PI / 2 + (i * Math.PI) / 6
export const CENTRE: Pt = [MONTANA[0], MONTANA[1] - RM * wob(angleOf(0))]
/** A point on the ring's middle line at angle a. */
export const ringAt = (a: number): Pt => [CENTRE[0] + Math.cos(a) * RM * wob(a), CENTRE[1] + Math.sin(a) * RM * wob(a)]
export const mountAt = (i: number): Pt => ringAt(angleOf(i))

/** The ring's top, for framing: the top of the screen at twelve o'clock. */
export const RING_TOP = mountAt(6)[1] - PH

/**
 * The ring whole, its screens on it, in world cells: what Overview must take in in the tent besides the table. (Framed
 * by her parts alone, all along the table, Overview saw the bottom of the ring and not the world it is.)
 */
export const TENT_RING = (() => {
  const xs = Array.from({ length: 12 }, (_, i) => mountAt(i)[0])
  return { x0: Math.min(...xs) - PW, y0: RING_TOP - 0.3, x1: Math.max(...xs) + PW, y1: MONTANA[1] }
})()

/** A link's band: points along the ring from a0 to a1, each with its width. */
function band(a0: number, a1: number, widen: number, n = 28, taper = 0): { outer: Pt[]; inner: Pt[] } {
  const outer: Pt[] = []
  const inner: Pt[] = []
  for (let s = 0; s <= n; s++) {
    const a = a0 + ((a1 - a0) * s) / n
    const [x, y] = ringAt(a)
    // A glow tapers off at its ends instead of stopping square.
    const end = taper > 0 ? Math.min(1, Math.min(Math.abs(a - a0), Math.abs(a1 - a)) / taper) : 1
    const w = LW * widen * Math.max(0.6, Math.min(1.45, RING.w(a) / 0.11)) * (taper > 0 ? Math.sqrt(end * (2 - end)) : 1)
    outer.push([x + (Math.cos(a) * w) / 2, y + (Math.sin(a) * w) / 2])
    inner.push([x - (Math.cos(a) * w) / 2, y - (Math.sin(a) * w) / 2])
  }
  return { outer, inner }
}

function fillBand(ctx: CanvasRenderingContext2D, k: number, b: { outer: Pt[]; inner: Pt[] }, style: string): void {
  ctx.beginPath()
  ctx.moveTo(b.outer[0][0] * k, b.outer[0][1] * k)
  for (const q of b.outer) ctx.lineTo(q[0] * k, q[1] * k)
  for (let n = b.inner.length - 1; n >= 0; n--) ctx.lineTo(b.inner[n][0] * k, b.inner[n][1] * k)
  ctx.closePath()
  ctx.fillStyle = style
  ctx.fill()
}

/** A link's glow: widths (shares of the link's) and the alpha of each. */
const GLOW: [number, number][] = [[4.2, 0.03], [3.4, 0.035], [2.7, 0.045], [2.1, 0.06], [1.6, 0.08]]

/** The inset of a link's ends from the mounts, radians: room for the hinge blocks. */
const INSET = 0.05

/** A link as it hangs at t: its middle line from its latch end (u = 0) to its hinge end (u = 1), and its widths. */
interface Cable {
  pts: Pt[]
  nrm: Pt[]
  w: number[]
}
const LN = 32
function cable(j: number, t: number): Cable {
  // 0 taut along the ring, 1 slack (and a little more or less as it bounces and sways).
  const slack = linkDrop(j, t)
  const a0 = angleOf(j) + INSET
  const a1 = angleOf(j + 1) - INSET
  const p0 = ringAt(a0)
  const p1 = ringAt(a1)
  // It sags down, leaning out from the ring: into the ring at the top, out below it at the bottom and the sides.
  const mid = ringAt((a0 + a1) / 2)
  const ol = Math.hypot(mid[0] - CENTRE[0], mid[1] - CENTRE[1]) || 1
  const dx = ((mid[0] - CENTRE[0]) / ol) * 0.8
  const dy = 1 + ((mid[1] - CENTRE[1]) / ol) * 0.8
  const dl = Math.hypot(dx, dy) || 1
  const sag = SAG * slack * (1 + 0.07 * Math.sin(t * 2.1 + j * 1.9))
  const f = Math.min(1, Math.max(0, slack))
  const pts: Pt[] = []
  const w: number[] = []
  for (let n = 0; n <= LN; n++) {
    const u = n / LN
    const a = a0 + (a1 - a0) * u
    const arc = ringAt(a)
    const bow = 4 * u * (1 - u) * sag
    pts.push([arc[0] + (p0[0] + (p1[0] - p0[0]) * u - arc[0]) * f + (dx / dl) * bow, arc[1] + (p0[1] + (p1[1] - p0[1]) * u - arc[1]) * f + (dy / dl) * bow])
    w.push(LW * Math.max(0.6, Math.min(1.45, RING.w(a) / 0.11)) * (1 - f) + ROPE * f)
  }
  const nrm: Pt[] = pts.map((_, n) => {
    const a = pts[Math.max(0, n - 1)]
    const b = pts[Math.min(LN, n + 1)]
    const tx = b[0] - a[0]
    const ty = b[1] - a[1]
    const l = Math.hypot(tx, ty) || 1
    return [-ty / l, tx / l]
  })
  return { pts, nrm, w }
}

/** Fill a stretch of a cable, from u0 to u1, `widen` times its width, tapering at its ends if asked. */
function fillCable(ctx: CanvasRenderingContext2D, k: number, c: Cable, u0: number, u1: number, widen: number, style: string, taper = 0): void {
  if (u1 - u0 < 1e-4) return
  const at = (u: number, side: number): Pt => {
    const x = Math.max(0, Math.min(LN, u * LN))
    const n = Math.min(LN - 1, Math.floor(x))
    const f = x - n
    const lerp = (a: number, b: number) => a + (b - a) * f
    const end = taper > 0 ? Math.min(1, Math.min(u - u0, u1 - u) / taper) : 1
    const w = lerp(c.w[n], c.w[n + 1]) * widen * (taper > 0 ? Math.sqrt(Math.max(0, end * (2 - end))) : 1)
    return [(lerp(c.pts[n][0], c.pts[n + 1][0]) + side * lerp(c.nrm[n][0], c.nrm[n + 1][0]) * (w / 2)) * k, (lerp(c.pts[n][1], c.pts[n + 1][1]) + side * lerp(c.nrm[n][1], c.nrm[n + 1][1]) * (w / 2)) * k]
  }
  const m = Math.max(3, Math.ceil((u1 - u0) * LN))
  ctx.beginPath()
  for (let s = 0; s <= m; s++) {
    const [x, y] = at(u0 + ((u1 - u0) * s) / m, 1)
    if (s === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  for (let s = m; s >= 0; s--) {
    const [x, y] = at(u0 + ((u1 - u0) * s) / m, -1)
    ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = style
  ctx.fill()
}

function drawLink(ctx: CanvasRenderingContext2D, k: number, j: number, t: number): void {
  const c = cable(j, t)
  const span = linkSpan(j, t)
  const g = Math.min(2.2, linkLit(j, t))
  const lit = !!span && span.to - span.from > 0.002
  if (lit) for (const [w, al] of GLOW) fillCable(ctx, k, c, span.from, span.to, w, rgba(TENT.signal, al * g), 0.012 * w)
  // The cable itself, solid and dark; the light in it where it is lit.
  fillCable(ctx, k, c, 0, 1, 1, mix(TENT.frame, TENT.canvasLit, 0.3))
  if (lit) {
    const core = g > 1 ? mix(TENT.signal, TENT.screenOn, Math.min(1, (g - 1) / 1.4)) : TENT.signal
    fillCable(ctx, k, c, span.from, span.to, 0.78, core)
    if (span.front !== null) {
      // The moving edge of the light, like a fuse's: bright at the front, fading back into the lit part.
      const n = 7
      for (let m = 0; m < n; m++) {
        const b0 = span.front + m * 0.028
        if (b0 >= span.to) break
        fillCable(ctx, k, c, b0, Math.min(span.to, b0 + 0.028), 0.72, rgba('#FFFFFF', 0.95 * (1 - m / n) ** 1.5))
      }
    }
  }
}

/** A fallen screen's tilt from its angle in the clock (0 upright, π/2 fallen): its turn on its corner hinge. */
const tilt = (th: number) => (th / (Math.PI / 2)) * STOP
/** The corner a screen tips over on: its bottom left. */
const pivotOf = (i: number): Pt => [mountAt(i)[0] - PW / 2, mountAt(i)[1]]
/** Where a point of screen i (in its own frame, from its pivot) is with it turned by ψ. */
const turned = (i: number, psi: number, x: number, y: number): Pt => {
  const [px, py] = pivotOf(i)
  return [px + x * Math.cos(psi) - y * Math.sin(psi), py + x * Math.sin(psi) + y * Math.cos(psi)]
}

/**
 * Screen i on its corner hinge at angle θ (0 upright, π/2 fallen, hanging over crooked), its picture `on`. Always a
 * screen: its face to us, lit, dark glass with the room in it, red with Shang on the line, or flashing as it comes home.
 */
function drawPanel(p: p5, k: number, i: number, t: number, th: number, on: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const [px, py] = pivotOf(i)
  ctx.save()
  ctx.translate(px * k, py * k)
  ctx.rotate(tilt(th))
  ctx.fillStyle = TENT.frame
  ctx.fillRect(0, -PH * k, PW * k, PH * k)
  drawScreen(p, k, FR, -PH + FR, GW, GH, { on, place: PLACES[i], t, glow: 0, bezel: TENT.frame })
  if (on < 0.99) {
    // Dead, it is still a screen: dull glass with the room in it, and a sheen across it.
    const dead = 1 - on
    ctx.fillStyle = rgba(mix(TENT.screenOff, TENT.canvasLit, 0.45), 0.8 * dead)
    ctx.fillRect(FR * k, (-PH + FR) * k, GW * k, GH * k)
    const sh = ctx.createLinearGradient(FR * k, (-PH + FR) * k, (FR + GW * 0.7) * k, -FR * k)
    sh.addColorStop(0, rgba(TENT.screenOn, 0.2 * dead))
    sh.addColorStop(0.45, rgba(TENT.screenOn, 0.04 * dead))
    sh.addColorStop(0.6, rgba(TENT.screenOn, 0.1 * dead))
    sh.addColorStop(1, rgba(TENT.screenOn, 0))
    ctx.fillStyle = sh
    ctx.fillRect(FR * k, (-PH + FR) * k, GW * k, GH * k)
    // The shell still there in the dead glass, a ghost of the last picture: the world gone dark, not the shell.
    ctx.fillStyle = rgba(mix(TENT.screenOff, TENT.screenOn, 0.5), 0.35 * dead)
    ctx.beginPath()
    ctx.ellipse((FR + GW / 2) * k, (-PH + FR + GH * 0.42) * k, GH * 0.13 * k, GH * 0.27 * k, 0, 0, Math.PI * 2)
    ctx.fill()
    // Its frame catching the room's light along the top and the side toward the lamp, so it reads as a set, not a slab.
    ctx.strokeStyle = rgba(mix(TENT.canvasLit, TENT.screenOn, 0.3), 0.45 * dead)
    ctx.lineWidth = Math.max(1, 0.03 * k)
    ctx.beginPath()
    ctx.moveTo(0.02 * k, -0.02 * k)
    ctx.lineTo(0.02 * k, (-PH + 0.02) * k)
    ctx.lineTo((PW - 0.02) * k, (-PH + 0.02) * k)
    ctx.stroke()
    ctx.strokeStyle = rgba('#000000', 0.35 * dead)
    ctx.strokeRect(FR * k, (-PH + FR) * k, GW * k, GH * k)
  }
  const red = redCast(i, t)
  if (red > 0.01) {
    // China's screen, with Shang on the line: its picture up in a red light before it settles to its own. (A flat red
    // over the dead glass read as a blank screen, an error, not a place coming back.)
    if (red > on) drawScreen(p, k, FR, -PH + FR, GW, GH, { on: red, place: PLACES[i], t, glow: 0, bezel: TENT.frame })
    const g = ctx.createLinearGradient(0, 0, 0, -PH * k)
    g.addColorStop(0, rgba(SHANG, 0.55 * red))
    g.addColorStop(1, rgba(mix(SHANG, TENT.screenOn, 0.35), 0.35 * red))
    ctx.fillStyle = g
    ctx.fillRect(FR * k, (-PH + FR) * k, GW * k, GH * k)
    ctx.strokeStyle = rgba(SHANG, 0.9 * red)
    ctx.lineWidth = Math.max(1.5, 0.04 * k)
    ctx.strokeRect(FR * k, (-PH + FR) * k, GW * k, GH * k)
  }
  const flash = screenFlash(i, t)
  if (flash > 0.01) {
    ctx.fillStyle = rgba('#FFFFFF', 0.55 * flash)
    ctx.fillRect(FR * k, (-PH + FR) * k, GW * k, GH * k)
  }
  ctx.restore()
}

/** The glow a lit screen casts on the canvas behind it and round it (red while Shang is on the line). */
function drawGlow(ctx: CanvasRenderingContext2D, k: number, i: number, t: number, th: number, on: number): void {
  const red = redCast(i, t)
  if (on <= 0.01 && red <= 0.01) return
  const [cx, cy] = turned(i, tilt(th), PW / 2, -PH / 2)
  const r = PW * 1.25 * k
  const g = ctx.createRadialGradient(cx * k, cy * k, PW * 0.3 * k, cx * k, cy * k, r)
  const col = red > 0.01 ? mix(TENT.screenGlow, SHANG, red) : TENT.screenGlow
  g.addColorStop(0, rgba(col, 0.2 * Math.max(on, red)))
  g.addColorStop(1, rgba(col, 0))
  ctx.fillStyle = g
  ctx.fillRect(cx * k - r, cy * k - r, 2 * r, 2 * r)
}

/** A mount on the rig, the block the links meet at (behind its screen). */
function drawMount(ctx: CanvasRenderingContext2D, k: number, i: number): void {
  const [x, y] = mountAt(i)
  const w = 0.3
  const h = 0.13
  ctx.fillStyle = TENT.cable
  ctx.fillRect((x - w / 2) * k, (y - h / 2) * k, w * k, h * k)
  ctx.fillStyle = rgba(TENT.canvasLit, 0.8)
  ctx.fillRect((x - w / 2) * k, (y - h / 2) * k, w * k, 0.025 * k)
}
/** The knuckle of a screen's corner hinge, over its corner. */
function drawKnuckle(ctx: CanvasRenderingContext2D, k: number, i: number): void {
  const [px, py] = pivotOf(i)
  ctx.fillStyle = TENT.cable
  ctx.fillRect((px - 0.07) * k, (py - 0.07) * k, 0.14 * k, 0.14 * k)
}

/** The ring, all of it, at show time t: the rig, the glows, the links, the screens, and their hinges. */
export function drawRing(p: p5, k: number, t: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  // The rig: hung from the beam on two cables, and the dark track the links lie in.
  ctx.strokeStyle = TENT.cable
  ctx.lineWidth = Math.max(1, 0.05 * k)
  for (const i of [4.5, 7.5]) {
    const [x, y] = ringAt(angleOf(i))
    ctx.beginPath()
    ctx.moveTo(x * k, y * k)
    ctx.lineTo((x + (i < 6 ? -0.5 : 0.5)) * k, (y - 14) * k)
    ctx.stroke()
  }
  fillBand(ctx, k, band(0, Math.PI * 2, 1.45, 180), TENT.frame)

  const th = Array.from({ length: 12 }, (_, i) => panelAngle(i, t))
  const on = Array.from({ length: 12 }, (_, i) => screenOn(i, t))
  for (let i = 0; i < 12; i++) drawGlow(ctx, k, i, t, th[i], on[i])
  const flare = closeFlare(t)
  // The flare as it closes: a soft light all round the ring, wider than it, dying away.
  if (flare > 0.01) {
    const r0 = (RM - 1.8) * k
    const r1 = (RM + 1.8) * k
    const g = ctx.createRadialGradient(CENTRE[0] * k, CENTRE[1] * k, r0, CENTRE[0] * k, CENTRE[1] * k, r1)
    g.addColorStop(0, rgba(TENT.screenGlow, 0))
    g.addColorStop(0.5, rgba(TENT.screenGlow, 0.32 * flare))
    g.addColorStop(1, rgba(TENT.screenGlow, 0))
    ctx.fillStyle = g
    ctx.fillRect(CENTRE[0] * k - r1, CENTRE[1] * k - r1, 2 * r1, 2 * r1)
  }
  for (let j = 0; j < 12; j++) drawLink(ctx, k, j, t)
  // What hangs over goes behind what stands.
  const order = Array.from({ length: 12 }, (_, i) => i).sort((a, b) => th[b] - th[a])
  for (let i = 0; i < 12; i++) drawMount(ctx, k, i)
  for (const i of order) drawPanel(p, k, i, t, th[i], on[i])
  for (let i = 0; i < 12; i++) drawKnuckle(ctx, k, i)
  ctx.restore()
}
