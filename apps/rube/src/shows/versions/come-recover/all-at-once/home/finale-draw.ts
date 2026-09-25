import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { clamp } from '../../../../../../../../src/core/ease'
import { FLOOR, mixHex, type Pt } from '../../../../../parts'
import { alpha, hash } from '../kit'
import { HOME } from '../worlds'
import { GARLAND, WASHER, washerBody, washerDoor, type Pen, type WasherLook } from './set'
import {
  BEGIN,
  bodyJolt,
  BURSTS,
  buttonDown,
  CAMERA,
  CREEP,
  doorAt,
  drumTurn,
  FLASH,
  J_LAND,
  PORT,
  runLamp,
  SWITCH,
  timerLamp,
  W0,
  windowLight,
} from './finale-plan'

/**
 * The finale's drawings: the washer by the door (drawn whole over the laundromat part's, from just before the jump),
 * the light in its window, the party lights' foot switch and its cord, the camera on the counter, its flash, and the
 * fireworks over the street. All in the room's cells, from show time.
 */

const IRON = mixHex(HOME.steelDark, HOME.night, 0.35)
const CORD = mixHex(HOME.night, HOME.steelDark, 0.3)

/** The window's light: cool as the bagel's hole was, warming through the evening. */
export const lightColor = (warm: number): string => mixHex(mixHex(HOME.glass, HOME.light, 0.35), mixHex(HOME.light, HOME.gold, 0.5), warm)

function rgba(p: p5, hex: string, a: number): string {
  const c = p.color(hex)
  return `rgba(${p.red(c)}, ${p.green(c)}, ${p.blue(c)}, ${clamp(a)})`
}

/* ------------------------------------------------------------------ the washer */

export function washerLook(t: number): WasherLook {
  const light = windowLight(t)
  return {
    turn: 0.7 + drumTurn(t),
    lamp: 0.35 + 0.4 * light.warm,
    lamp2: runLamp(t),
    door: doorAt(t),
    dx: CREEP,
    dy: -Math.abs(bodyJolt(t)),
  }
}

/** Whether the door goes over a ball in the drum (the part's `over`) or is drawn with the body. */
export const doorOver = (t: number): boolean => t < J_LAND + 0.2

/** The washer's body and drum, and the light filling its window. */
export function drawWasher(pen: Pen, t: number): void {
  const look = washerLook(t)
  washerBody(pen, W0, look)
  fillWindow(pen, t, look)
  if (!doorOver(t)) washerDoor(pen, W0, look)
}

export function drawWasherDoor(pen: Pen, t: number): void {
  if (doorOver(t)) washerDoor(pen, W0, washerLook(t))
}

/** The light inside the glass, over the drum's back: strong at the jump (the hole's own light), settling. */
function fillWindow(pen: Pen, t: number, look: WasherLook): void {
  const { p, k } = pen
  const light = windowLight(t)
  if (light.a <= 0) return
  const [cx, cy] = [PORT[0], PORT[1] + (look.dy ?? 0)]
  const r = WASHER.glass
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const handover = 0.5 * (1 - clamp((t - BEGIN) / 2.2))
  const a = light.a * 0.42 + handover
  const col = lightColor(light.warm)
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx * k, cy * k, r * k, 0, Math.PI * 2)
  ctx.clip()
  const g = ctx.createRadialGradient(cx * k, (cy - r * 0.15) * k, 0, cx * k, cy * k, r * 1.05 * k)
  g.addColorStop(0, rgba(p, col, a))
  g.addColorStop(0.7, rgba(p, col, a * 0.75))
  g.addColorStop(1, rgba(p, col, a * 0.35))
  ctx.fillStyle = g
  ctx.fillRect((cx - r) * k, (cy - r) * k, 2 * r * k, 2 * r * k)
  ctx.restore()
}

/**
 * The window's glow in the dark room, over the light map: the glass lit from within, and a soft bloom round the rim.
 * Only as much as the room is dark (with the tubes on it is just a lit drum).
 */
export function drawWindowGlow(pen: Pen, t: number, dark: number): void {
  const { p, k } = pen
  const light = windowLight(t)
  if (light.a <= 0 || dark <= 0.01 || doorAt(t) > 0.05) return
  const [cx, cy] = PORT
  const r = WASHER.glass
  const col = lightColor(light.warm)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const a = light.a * dark
  ctx.save()
  const g = ctx.createRadialGradient(cx * k, cy * k, r * 0.2 * k, cx * k, cy * k, (r + 0.5) * k)
  g.addColorStop(0, rgba(p, col, 0.55 * a))
  g.addColorStop(r / (r + 0.5), rgba(p, col, 0.32 * a))
  g.addColorStop(1, rgba(p, col, 0))
  ctx.fillStyle = g
  ctx.fillRect((cx - r - 0.5) * k, (cy - r - 0.5) * k, 2 * (r + 0.5) * k, 2 * (r + 0.5) * k)
  ctx.restore()
}

/* ------------------------------------------------------------------ the foot switch and its cords */

/** Where the foot lever of the laundromat's washer crosses the skirting (the cord goes behind it). */
const BEHIND: [number, number][] = [
  [-1.52, -1.34],
  [-1.22, -0.98],
]
const SKIRT = FLOOR - 0.035

export function drawSwitch(pen: Pen, t: number): void {
  const { p, k, ink, w } = pen
  const { x, w: W, h } = SWITCH
  // The wall socket by the door, the plug in it, and the short cord down to the switch.
  const sock: Pt = [-3.5, -0.34]
  outline(p, CORD, Math.max(1, w * 0.9))
  p.noFill()
  p.beginShape()
  p.vertex(sock[0] * k, (sock[1] + 0.06) * k)
  p.bezierVertex(sock[0] * k, (SKIRT - 0.05) * k, (x - W / 2 - 0.12) * k, SKIRT * k, (x - W / 2 + 0.02) * k, (FLOOR - h * 0.4) * k)
  p.endShape()
  solid(p, ink, w * 0.6, HOME.enamel)
  p.rect(sock[0] * k, sock[1] * k, 0.13 * k, 0.19 * k, 0.03 * k)
  solid(p, ink, w * 0.5, IRON)
  p.rect(sock[0] * k, (sock[1] + 0.02) * k, 0.07 * k, 0.08 * k, 0.015 * k)
  // The cord out of its right side, along the skirting behind the washer, up the wall to the lantern string.
  const top: Pt = [GARLAND.from[0] + 0.02, GARLAND.from[1] + 0.04]
  const upX = top[0]
  const segs: [number, number][] = []
  let a = x + W / 2 - 0.02
  for (const [b0, b1] of BEHIND) {
    if (b0 > a) segs.push([a, b0])
    a = Math.max(a, b1)
  }
  segs.push([a, upX - 0.12])
  outline(p, CORD, Math.max(1, w * 0.9))
  for (const [s0, s1] of segs) p.line(s0 * k, SKIRT * k, s1 * k, SKIRT * k)
  p.noFill()
  p.beginShape()
  p.vertex((upX - 0.12) * k, SKIRT * k)
  p.bezierVertex(upX * k, SKIRT * k, upX * k, SKIRT * k, upX * k, (SKIRT - 0.12) * k)
  p.vertex(upX * k, top[1] * k)
  p.endShape()
  // Two clips holding it to the wall.
  solid(p, ink, w * 0.4, HOME.paper)
  for (const cy of [-1.6, -3.2]) p.rect(upX * k, cy * k, 0.06 * k, 0.04 * k, 0.01 * k)
  // The switch: a squat dome with a red button, pressed on 286.2.
  const down = buttonDown(t)
  solid(p, ink, w, IRON)
  p.beginShape()
  p.vertex((x - W / 2) * k, FLOOR * k)
  p.bezierVertex((x - W / 2) * k, (FLOOR - h) * k, (x + W / 2) * k, (FLOOR - h) * k, (x + W / 2) * k, FLOOR * k)
  p.endShape(p.CLOSE)
  solid(p, ink, w * 0.7, HOME.red)
  p.rect(x * k, (FLOOR - h * 0.78 - SWITCH.button * 0.5 * (1 - down)) * k, 0.11 * k, (SWITCH.button * (1 - down) + 0.02) * k, 0.015 * k)
  // Its little lamp: lit once it is on.
  const on = down > 0.5 || t > 286.3
  solid(p, ink, w * 0.4, on && t > 286.19 ? HOME.gold : HOME.steelDark)
  p.circle((x + W * 0.28) * k, (FLOOR - h * 0.45) * k, 0.035 * k)
}

/* ------------------------------------------------------------------ the camera */

/** The camera for the family portrait, on a little tripod on the counter, looking at the washer. */
export function drawCamera(pen: Pen, t: number): void {
  const { p, k, ink, w } = pen
  const { x, foot } = CAMERA
  const bodyY = foot - 0.46
  // The tripod: three thin legs, splayed.
  outline(p, ink, w * 0.9)
  p.line(x * k, (bodyY + 0.1) * k, (x - 0.16) * k, foot * k)
  p.line(x * k, (bodyY + 0.1) * k, (x + 0.16) * k, foot * k)
  p.line(x * k, (bodyY + 0.1) * k, (x + 0.03) * k, foot * k)
  solid(p, ink, w * 0.6, HOME.steelDark)
  p.rect(x * k, (bodyY + 0.12) * k, 0.1 * k, 0.05 * k, 0.01 * k)
  // The body, tipped a little down at them.
  p.push()
  p.translate(x * k, bodyY * k)
  p.rotate(0.12)
  solid(p, ink, w, IRON)
  p.rect(0, 0, 0.34 * k, 0.2 * k, 0.03 * k)
  // The lens, out to the left.
  solid(p, ink, w * 0.8, HOME.steelDark)
  p.rect(-0.22 * k, 0.01 * k, 0.12 * k, 0.15 * k, 0.02 * k)
  solid(p, ink, w * 0.6, HOME.glassDeep)
  p.ellipse(-0.285 * k, 0.01 * k, 0.03 * k, 0.12 * k)
  // The flash on top, its face towards them.
  solid(p, ink, w * 0.7, HOME.steelDark)
  p.rect(0.03 * k, -0.15 * k, 0.12 * k, 0.1 * k, 0.015 * k)
  solid(p, ink, w * 0.5, HOME.paper)
  p.rect(-0.035 * k, -0.15 * k, 0.025 * k, 0.08 * k, 0.005 * k)
  // The shutter button.
  solid(p, ink, w * 0.5, HOME.steel)
  p.rect(0.11 * k, -0.115 * k, 0.05 * k, 0.03 * k, 0.01 * k)
  p.pop()
  // The self-timer's lamp, on its front: blinking faster and faster.
  const lamp = timerLamp(t)
  const [lx, ly] = CAMERA.lamp
  solid(p, ink, w * 0.4, lamp > 0.05 ? mixHex(HOME.red, HOME.gold, 0.25 * lamp) : mixHex(HOME.red, HOME.night, 0.45))
  p.circle(lx * k, ly * k, 0.045 * k)
  if (lamp > 0.3) {
    p.noStroke()
    p.fill(alpha(p, HOME.red, 0.35 * lamp))
    p.circle(lx * k, ly * k, 0.16 * k)
  }
}

/** The flash: a burst of white from the camera over everything, gone in a moment. */
export function drawFlash(pen: Pen, t: number, frameBox: { x0: number; y0: number; x1: number; y1: number }): void {
  const u = t - FLASH
  if (u < 0 || u > 0.7) return
  const { p, k } = pen
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // A white-out for a frame or two, falling away fast, brightest at the camera.
  const a = Math.exp(-u / 0.085) * 0.75 + 0.25 * Math.exp(-u / 0.3)
  const [fx, fy] = CAMERA.flash
  ctx.save()
  const g = ctx.createRadialGradient(fx * k, fy * k, 0, fx * k, fy * k, 8 * k)
  g.addColorStop(0, `rgba(255, 254, 248, ${Math.min(1, 1.0 * a)})`)
  g.addColorStop(0.35, `rgba(255, 252, 242, ${0.85 * a})`)
  g.addColorStop(1, `rgba(255, 250, 236, ${0.6 * a})`)
  ctx.fillStyle = g
  const { x0, y0, x1, y1 } = frameBox
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  ctx.restore()
}

/* ------------------------------------------------------------------ fireworks over the street */

const BURST_COLOR = { gold: HOME.gold, rose: HOME.rose, light: HOME.light }

/** Painted into the storefront's glass by the room, over the night street (`STREET`). */
export function fireworks(p: p5, k: number, t: number): void {
  const live = BURSTS.filter((b) => t > b.at - 0.55 && t < b.at + 2.4)
  if (!live.length) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  for (const b of live) {
    const u = t - b.at
    const col = BURST_COLOR[b.color]
    if (u < 0) {
      // The rocket going up from the street: a spark and its trail.
      const s = (u + 0.55) / 0.55
      const y = b.y + 2.3 * (1 - s) * (1 - s)
      p.stroke(alpha(p, HOME.light, 0.55 * s))
      p.strokeWeight(Math.max(1, 0.02 * k))
      p.line(b.x * k, y * k, b.x * k, (y + 0.3) * k)
      p.noStroke()
      p.fill(alpha(p, HOME.light, 0.9))
      p.circle(b.x * k, y * k, 0.05 * k)
      continue
    }
    // Its light on the whole street for a moment, and the bloom where it burst.
    const bloom = Math.exp(-u / 0.14)
    p.noStroke()
    p.fill(alpha(p, col, 0.2 * bloom))
    p.rect(-6.4 * k, -2.2 * k, 4 * k, 5 * k)
    const g = ctx.createRadialGradient(b.x * k, b.y * k, 0, b.x * k, b.y * k, b.r * 2 * k)
    g.addColorStop(0, rgba(p, col, 0.55 * bloom))
    g.addColorStop(1, rgba(p, col, 0))
    ctx.fillStyle = g
    ctx.fillRect((b.x - b.r * 2) * k, (b.y - b.r * 2) * k, b.r * 4 * k, b.r * 4 * k)
    // The sparks: out fast, slowing, falling, fading, each with a short tail; a ring of them, and a few inside.
    const n = 34
    const fade = clamp(1 - u / 2.5) ** 1.6
    for (let i = 0; i < n; i++) {
      const inner = i >= 26
      const a = (i / (inner ? 8 : 26)) * Math.PI * 2 + hash(i, 3, b.at * 10) * 0.25
      const sp = b.r * (inner ? 0.45 + 0.15 * hash(i, 5) : 0.85 + 0.3 * hash(i, 7, b.at * 10))
      const at = (s: number): Pt => {
        const out = (1 - Math.exp(-s / 0.32)) * sp
        return [b.x + Math.cos(a) * out, b.y + Math.sin(a) * out + 0.45 * s * s]
      }
      const [x, y] = at(u)
      const [x0, y0] = at(Math.max(0, u - 0.1))
      const tw = 0.7 + 0.3 * Math.sin(u * 28 + i * 2.3)
      p.stroke(alpha(p, col, 0.75 * fade * tw))
      p.strokeWeight(Math.max(1, 0.028 * k))
      p.line(x0 * k, y0 * k, x * k, y * k)
      p.noStroke()
      p.fill(alpha(p, i % 3 === 0 ? HOME.light : col, fade * tw))
      p.circle(x * k, y * k, 0.05 * k)
    }
  }
  ctx.restore()
}

/** How much light the fireworks throw into the room through the window (for its light map). */
export function fireworkLight(t: number): { a: number; color: string } {
  let a = 0
  let color: string = HOME.gold
  for (const b of BURSTS) {
    const u = t - b.at
    if (u < 0 || u > 1.5) continue
    const v = Math.exp(-u / 0.35)
    if (v > a) {
      a = v
      color = BURST_COLOR[b.color]
    }
  }
  return { a, color }
}
