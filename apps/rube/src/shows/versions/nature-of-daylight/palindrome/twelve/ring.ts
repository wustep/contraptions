import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { drawScreen, inkRing, mix, PLACES, rgba } from '../cast'
import { frame } from '../kit'
import { level } from '../music'
import { TENT } from '../worlds'
import { closeFlare, linkDrop, linkLit, linkSpan, panelAngle, pulsesAt, screenFlash, screenOn } from './timeline'

/**
 * The ring: twelve screens on one circular rig like a clock face, each showing a shell over its own place, each
 * joined to the next by a lit link. The links together are a logogram's ring (the shape of `inkRing(12)`, gently):
 * the world talking to itself, written in light.
 *
 * Montana (0) is at the bottom, at six o'clock, just over the table; the rest go clockwise from it. Every screen
 * stands on a hinge along its bottom edge at its mount on the rig; let go, it falls back about it like a domino and
 * lies flat on the stop behind, edge on to us. Every link is an arc of the ring from its mount to the next, hinged at
 * the clockwise end and latched at the other; let go, it drops on its hinge to a stop.
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
/** A link's width, and how far it drops when let go (radians). */
const LW = 0.25
const DROP = 0.5

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

/** Which way link j drops about its hinge: the way gravity turns it (y down, so + is clockwise on the screen). */
const DROP_SIGN: number[] = Array.from({ length: 12 }, (_, j) => {
  const b = band(angleOf(j), angleOf(j + 1), 1)
  const cx = b.outer.reduce((s, q) => s + q[0], 0) / b.outer.length
  return cx >= mountAt(j + 1)[0] ? 1 : -1
})

/** A link's glow: widths (shares of the link's) and the alpha of each. */
const GLOW: [number, number][] = [[4.2, 0.03], [3.4, 0.035], [2.7, 0.045], [2.1, 0.06], [1.6, 0.08]]

/** The inset of a link's ends from the mounts, radians: room for the hinge blocks. */
const INSET = 0.05

function drawLink(ctx: CanvasRenderingContext2D, k: number, j: number, t: number): void {
  const drop = linkDrop(j, t)
  const [hx, hy] = mountAt(j + 1)
  ctx.save()
  ctx.translate(hx * k, hy * k)
  // Hanging on its hinge, it never quite stops: a slow sway, as much as it has dropped.
  const sway = 0.035 * Math.sin(t * 2.1 + j * 1.9) * drop
  ctx.rotate(DROP_SIGN[j] * DROP * drop + sway)
  ctx.translate(-hx * k, -hy * k)
  const a0 = angleOf(j) + INSET
  const a1 = angleOf(j + 1) - INSET
  const span = linkSpan(j, t)
  // The lit part of it, from its latch end (0) to its hinge end (1).
  const l0 = span ? a0 + (a1 - a0) * span.from : 0
  const l1 = span ? a0 + (a1 - a0) * span.to : 0
  const lit = span && l1 - l0 > 0.004
  const g = Math.min(2.2, linkLit(j, t))
  // The light in the links breathes with the music.
  const breath = 0.7 + 0.6 * level(t)
  if (lit) {
    // Its glow, in soft steps out from it.
    for (const [w, al] of GLOW) fillBand(ctx, k, band(l0, l1, w, 28, 0.03 * w), rgba(TENT.signal, al * g * breath))
  }
  // The link itself: dark metal, catching the room's light along its edge, and the light in it.
  fillBand(ctx, k, band(a0, a1, 1), TENT.frame)
  fillBand(ctx, k, band(a0, a1, 0.45), rgba(TENT.canvasLit, 0.3))
  if (lit) {
    const core = g > 1 ? mix(TENT.signal, TENT.screenOn, Math.min(1, (g - 1) / 1.4)) : TENT.signal
    fillBand(ctx, k, band(l0, l1, 0.78), core)
    if (span.front !== null) {
      // The moving edge of the light, like a fuse's: bright at the front, fading back into the lit part.
      const dir = a1 > a0 ? 1 : -1
      const f = a0 + (a1 - a0) * span.front
      const n = 7
      for (let m = 0; m < n; m++) {
        const b0 = f + dir * m * 0.022
        const b1 = b0 + dir * 0.022
        if ((b1 - l1) * dir > 0) break
        fillBand(ctx, k, band(Math.min(b0, b1), Math.max(b0, b1), 0.7, 3), rgba('#FFFFFF', 0.95 * (1 - m / n) ** 1.5))
      }
    }
  }
  ctx.restore()
}

/**
 * Screen i's panel on its hinge at angle θ (0 up, π/2 flat on its back), its picture `on`. Seen from `eye` (how far
 * the hinge is above the camera's middle, cells): a panel lying flat above the eye shows a sliver of its back under
 * the hinge, one below it a sliver of its face.
 */
function drawPanel(p: p5, k: number, i: number, t: number, th: number, on: number, eye: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const [hx, hy] = mountAt(i)
  const c = Math.cos(th)
  const s = Math.sin(th)
  const tilt = Math.max(-0.18, Math.min(0.18, -eye * 0.04))
  const h = c + s * tilt
  const X = hx * k
  const Y = hy * k
  const wb = (PW * k) / 2
  const wt = wb * (1 - 0.14 * s)
  ctx.save()
  ctx.translate(X, Y)
  if (h > 0.004) {
    // The face, tilting back away from us: shorter, its far edge narrower, darker as it turns from the room.
    const top = PH * k * h
    ctx.beginPath()
    ctx.moveTo(-wb, 0)
    ctx.lineTo(wb, 0)
    ctx.lineTo(wt, -top)
    ctx.lineTo(-wt, -top)
    ctx.closePath()
    ctx.clip()
    ctx.scale(1, h)
    ctx.fillStyle = TENT.frame
    ctx.fillRect(-wb, -PH * k, 2 * wb, PH * k)
    drawScreen(p, k, -GW / 2, -PH + FR, GW, GH, { on, place: PLACES[i], t, glow: 0, bezel: TENT.frame })
    const flash = screenFlash(i, t)
    if (flash > 0.01) {
      ctx.fillStyle = rgba('#FFFFFF', 0.55 * flash)
      ctx.fillRect((-GW / 2) * k, (-PH + FR) * k, GW * k, GH * k)
    }
    if (s > 0.01) {
      ctx.fillStyle = rgba('#000000', 0.6 * s)
      ctx.fillRect(-wb, -PH * k, 2 * wb, PH * k)
    }
  } else if (h < -0.004) {
    // Its back, from below: a dark plate.
    const down = PH * k * -h
    ctx.beginPath()
    ctx.moveTo(-wb, 0)
    ctx.lineTo(wb, 0)
    ctx.lineTo(wt, down)
    ctx.lineTo(-wt, down)
    ctx.closePath()
    ctx.fillStyle = mix(TENT.frame, TENT.cable, 0.5)
    ctx.fill()
  }
  // The panel's own thickness along its hinge, seen as it goes edge on.
  if (s > 0.05) {
    ctx.fillStyle = mix(TENT.frame, TENT.canvasLit, 0.45)
    ctx.fillRect(-wb, -0.03 * k, 2 * wb, 0.06 * k * s)
  }
  ctx.restore()
}

/** The glow a lit screen casts on the canvas behind it and round it. */
function drawGlow(ctx: CanvasRenderingContext2D, k: number, i: number, th: number, on: number): void {
  const c = Math.cos(th)
  if (on <= 0.01 || c <= 0.05) return
  const [hx, hy] = mountAt(i)
  const cx = hx * k
  const cy = (hy - (PH / 2) * c) * k
  const r = PW * 1.25 * k
  const g = ctx.createRadialGradient(cx, cy, PW * 0.3 * k, cx, cy, r)
  g.addColorStop(0, rgba(TENT.screenGlow, 0.2 * on * c))
  g.addColorStop(1, rgba(TENT.screenGlow, 0))
  ctx.fillStyle = g
  ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r)
}

/** A hinge block at a mount: the rig's hardware, a small dark block with a lit edge. */
function drawMount(ctx: CanvasRenderingContext2D, k: number, i: number): void {
  const [x, y] = mountAt(i)
  const w = 0.34
  const h = 0.13
  ctx.fillStyle = TENT.cable
  ctx.fillRect((x - w / 2) * k, (y - h / 2) * k, w * k, h * k)
  ctx.fillStyle = rgba(TENT.canvasLit, 0.8)
  ctx.fillRect((x - w / 2) * k, (y - h / 2) * k, w * k, 0.025 * k)
}

/** The ring, all of it, at show time t: the rig, the glows, the links, the screens, their hinges, and the pulses. */
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
  const eyeY = frame(p, k).cy

  const th = Array.from({ length: 12 }, (_, i) => panelAngle(i, t))
  const on = Array.from({ length: 12 }, (_, i) => screenOn(i, t))
  for (let i = 0; i < 12; i++) drawGlow(ctx, k, i, th[i], on[i])
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
  drawPulses(ctx, k, t)
  for (let i = 0; i < 12; i++) drawPanel(p, k, i, t, th[i], on[i], eyeY - mountAt(i)[1])
  for (let i = 0; i < 12; i++) drawMount(ctx, k, i)
  ctx.restore()
}

/** After it closes: the signal goes round, both ways from Montana at once, and meets itself at the top. */
function drawPulses(ctx: CanvasRenderingContext2D, k: number, t: number): void {
  for (const { u, a } of pulsesAt(t)) {
    for (const dir of [1, -1]) {
      const head = angleOf(0) + dir * u * Math.PI
      const seg = (from: number, len: number, widen: number, style: string) => {
        const lo = Math.min(from, from - dir * len)
        const hi = Math.max(from, from - dir * len)
        fillBand(ctx, k, band(lo, hi, widen, 8), style)
      }
      seg(head, 0.7, 4, rgba(TENT.screenGlow, 0.18 * a))
      seg(head, 0.45, 2.2, rgba(TENT.screenOn, 0.28 * a))
      for (let n = 0; n < 8; n++) seg(head - dir * n * 0.055, 0.055, 1.25, rgba('#FFFFFF', a * 0.95 * (1 - n / 8)))
    }
    // Where the two meet at the top, a moment's brighter light.
    if (u > 0.92) {
      const top = angleOf(6)
      fillBand(ctx, k, band(top - 0.12, top + 0.12, 2.4, 8), rgba(TENT.screenOn, 0.5 * a * ((u - 0.92) / 0.08)))
    }
  }
}

