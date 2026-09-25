import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { clamp } from '../../../../../../../../src/core/ease'
import { FLOOR, mixHex, type Pt } from '../../../../../parts'
import { alpha, hash } from '../kit'
import { HOME } from '../worlds'
import { EVELYN, JOY, WAYMOND } from '../worlds'
import { lantern, lanternLit, LIGHTS, WASHER, washerBody, washerDoor, type Pen, type WasherLook } from './set'
import {
  BEGIN,
  bodyJolt,
  BURSTS,
  buttonDown,
  CAM_BULB,
  CAM_LAMP,
  CAM_SLOT,
  CAMERA,
  CREEP,
  doorAt,
  drumTurn,
  FLASH,
  J_LAND,
  onCamera,
  photoAt,
  PHOTO,
  PORT,
  PRESS,
  runLamp,
  STRING,
  STRING_X,
  stringY,
  SWITCH,
  timerLamp,
  W0,
  windowLight,
} from './finale-plan'

/**
 * The finale's drawings: the washer by the door (drawn whole over the laundromat part's, from just before the jump),
 * the light in its window, the party lights' foot switch and its cord, the lantern string over the family, the
 * portrait camera on its tripod, its flash and the photograph, and the fireworks over the street. All in the room's
 * cells, from show time.
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

/* ------------------------------------------------------------------ the foot switch, its cord, the lantern string */

const SKIRT = FLOOR - 0.03
/** Where the switch's cord goes up the wall, between the door and the washer, to the lantern string. */
const RISER = STRING.a[0] - 0.02

export function drawSwitch(pen: Pen, t: number): void {
  const { p, k, ink, w } = pen
  const { x, w: W, h } = SWITCH
  // The wall socket in the kick plate under the window, the plug in it, and the short cord down to the switch.
  const sock: Pt = [x - 0.42, -0.16]
  outline(p, CORD, Math.max(1, w * 0.9))
  p.noFill()
  p.beginShape()
  p.vertex(sock[0] * k, (sock[1] + 0.06) * k)
  p.bezierVertex(sock[0] * k, (SKIRT - 0.02) * k, (x - W / 2 - 0.1) * k, SKIRT * k, (x - W / 2 + 0.03) * k, (FLOOR - h * 0.4) * k)
  p.endShape()
  solid(p, ink, w * 0.6, HOME.enamel)
  p.rect(sock[0] * k, sock[1] * k, 0.13 * k, 0.17 * k, 0.03 * k)
  solid(p, ink, w * 0.5, IRON)
  p.rect(sock[0] * k, (sock[1] + 0.02) * k, 0.07 * k, 0.07 * k, 0.015 * k)
  // The cord out of its right side: along the floor under the tripod, up the wall to the string.
  outline(p, CORD, Math.max(1, w * 0.9))
  p.line((x + W / 2 - 0.02) * k, SKIRT * k, (RISER - 0.1) * k, SKIRT * k)
  p.noFill()
  p.beginShape()
  p.vertex((RISER - 0.1) * k, SKIRT * k)
  p.bezierVertex(RISER * k, SKIRT * k, RISER * k, SKIRT * k, RISER * k, (SKIRT - 0.1) * k)
  p.vertex(RISER * k, (STRING.a[1] + 0.02) * k)
  p.endShape()
  // The camera's own lead, down from its tripod's head to the cord.
  p.beginShape()
  const [hx, hy] = onCamera(-0.05, 0.08)
  p.vertex(hx * k, hy * k)
  p.bezierVertex((hx - 0.05) * k, (hy + 0.25) * k, (CAMERA.x + 0.05) * k, (SKIRT - 0.1) * k, (CAMERA.x + 0.12) * k, SKIRT * k)
  p.endShape()
  solid(p, ink, w * 0.4, HOME.paper)
  for (const cy of [-1.4, -2.6]) p.rect(RISER * k, cy * k, 0.06 * k, 0.04 * k, 0.01 * k)
  // The switch: a squat dome with a red button, pressed on 286.2, and its little lamp.
  const down = buttonDown(t)
  solid(p, ink, w, IRON)
  p.beginShape()
  p.vertex((x - W / 2) * k, FLOOR * k)
  p.bezierVertex((x - W / 2) * k, (FLOOR - h) * k, (x + W / 2) * k, (FLOOR - h) * k, (x + W / 2) * k, FLOOR * k)
  p.endShape(p.CLOSE)
  solid(p, ink, w * 0.7, HOME.red)
  p.rect(x * k, (FLOOR - h * 0.78 - SWITCH.button * 0.5 * (1 - down)) * k, 0.12 * k, (SWITCH.button * (1 - down) + 0.02) * k, 0.015 * k)
  solid(p, ink, w * 0.4, t > PRESS ? HOME.gold : HOME.steelDark)
  p.circle((x + W * 0.28) * k, (FLOOR - h * 0.45) * k, 0.035 * k)
}

/** The lantern string over the family: its wire, and its lanterns, lit one a beat from the switch. */
export function drawLanternString(pen: Pen, t: number): void {
  const { p, k, ink, w } = pen
  const { a, b } = STRING
  outline(p, ink, w * 0.5)
  p.noFill()
  p.beginShape()
  for (let i = 0; i <= 16; i++) {
    const x = a[0] + ((b[0] - a[0]) * i) / 16
    p.vertex(x * k, stringY(x) * k)
  }
  p.endShape()
  solid(p, ink, w * 0.6, HOME.steelDark)
  for (const [ax, ay] of [a, b]) p.circle(ax * k, ay * k, 0.07 * k)
  STRING_X.forEach((x, i) => {
    const lit = lanternLit(i, t)
    const at = LIGHTS.lanterns[i] ?? Infinity
    // Each gives a little start as it catches, and sways.
    const u = t - at
    const sway = 0.02 * Math.sin(t * 1.1 + i * 1.7) + (u > 0 ? 0.12 * Math.exp(-u / 0.5) * Math.sin(u * 9) : 0)
    lantern(pen, x, stringY(x), { open: 1, lit, sway, size: STRING.size })
  })
}

/** How the string's lanterns light the room (for its light map). */
export function stringGlows(t: number): { x: number; y: number; a: number }[] {
  return STRING_X.map((x, i) => ({ x, y: stringY(x) + 0.35, a: lanternLit(i, t) }))
}

/* ------------------------------------------------------------------ the camera */

/** The portrait camera on its tripod: the tripod's back legs, the camera, its bellows and flash, its timer lamp. */
export function drawCamera(pen: Pen, t: number): void {
  const { p, k, ink, w } = pen
  const { x, head } = CAMERA
  // The tripod's back legs (its front one is drawn over her as she passes under).
  outline(p, ink, w * 1.3)
  p.line(x * k, head * k, (x - 0.3) * k, FLOOR * k)
  p.line(x * k, head * k, (x + 0.06) * k, FLOOR * k)
  outline(p, HOME.wood, Math.max(1, w * 0.6))
  p.line(x * k, head * k, (x - 0.3) * k, FLOOR * k)
  p.line(x * k, head * k, (x + 0.06) * k, FLOOR * k)
  solid(p, ink, w * 0.7, HOME.steelDark)
  p.rect(x * k, (head + 0.02) * k, 0.14 * k, 0.06 * k, 0.015 * k)
  // The camera, tipped a little down at them.
  p.push()
  p.translate(x * k, head * k)
  p.rotate(CAMERA.tilt)
  const R_ = (cx: number, cy: number, rw: number, rh: number, r = 0.02) => p.rect(cx * k, cy * k, rw * k, rh * k, r * k)
  // The box.
  solid(p, ink, w, HOME.wood)
  R_(-0.04, -0.17, 0.3, 0.28, 0.03)
  outline(p, mixHex(HOME.wood, HOME.steelDark, 0.5), Math.max(1, w * 0.4))
  p.line(-0.17 * k, -0.25 * k, 0.09 * k, -0.25 * k)
  // The bellows, pleated, out to the lens board.
  solid(p, ink, w * 0.8, IRON)
  p.beginShape()
  p.vertex(0.11 * k, -0.29 * k)
  p.vertex(0.29 * k, -0.25 * k)
  p.vertex(0.29 * k, -0.07 * k)
  p.vertex(0.11 * k, -0.04 * k)
  p.endShape(p.CLOSE)
  outline(p, mixHex(HOME.steelDark, HOME.steel, 0.5), Math.max(1, w * 0.45))
  for (let i = 1; i < 4; i++) {
    const bx = 0.11 + 0.045 * i
    p.line(bx * k, (-0.29 + 0.01 * i) * k, bx * k, (-0.04 - 0.008 * i) * k)
  }
  // The lens board and the lens.
  solid(p, ink, w * 0.8, HOME.wood)
  R_(0.305, -0.16, 0.04, 0.22, 0.01)
  solid(p, ink, w * 0.8, HOME.steel)
  R_(0.355, -0.16, 0.07, 0.13, 0.02)
  solid(p, ink, w * 0.6, HOME.glassDeep)
  p.ellipse(0.39 * k, -0.16 * k, 0.03 * k, 0.1 * k)
  // The slot the photograph comes out of, under the lens.
  outline(p, ink, w * 0.6)
  p.line(0.27 * k, (CAM_SLOT[1] + 0.005) * k, 0.34 * k, (CAM_SLOT[1] + 0.005) * k)
  // The flash: a bracket, a round reflector facing them, its bulb.
  outline(p, ink, w * 0.9)
  p.line(-0.1 * k, -0.31 * k, -0.08 * k, (CAM_BULB[1] + 0.08) * k)
  solid(p, ink, w * 0.8, HOME.steel)
  p.arc(CAM_BULB[0] * k, CAM_BULB[1] * k, 0.32 * k, 0.32 * k, -Math.PI / 2, Math.PI / 2, p.CHORD)
  solid(p, ink, w * 0.5, mixHex(HOME.steel, HOME.paper, 0.6))
  p.arc((CAM_BULB[0] + 0.015) * k, CAM_BULB[1] * k, 0.24 * k, 0.24 * k, -Math.PI / 2, Math.PI / 2, p.CHORD)
  const pop = t >= FLASH ? Math.exp(-(t - FLASH) / 0.25) : 0
  solid(p, ink, w * 0.5, t >= FLASH ? mixHex(HOME.steelDark, HOME.paper, 0.3 + 0.7 * pop) : HOME.paper)
  p.circle((CAM_BULB[0] + 0.05) * k, CAM_BULB[1] * k, 0.075 * k)
  p.pop()
  // The self-timer's lamp, on the box's shoulder: blinking faster and faster.
  const lamp = timerLamp(t)
  const [lx, ly] = onCamera(CAM_LAMP[0], CAM_LAMP[1])
  solid(p, ink, w * 0.6, lamp > 0.05 ? mixHex(HOME.red, HOME.paper, 0.35 * lamp) : mixHex(HOME.red, HOME.night, 0.45))
  p.circle(lx * k, ly * k, 0.085 * k)
  if (lamp > 0.25) {
    p.noStroke()
    p.fill(alpha(p, HOME.red, 0.45 * lamp))
    p.circle(lx * k, ly * k, 0.24 * k)
  }
}

/** The tripod's front leg, over her as she rolls under it. Shaded by hand in the dark (it is drawn after the light). */
export function drawTripodFront(pen: Pen, t: number, shade: (hex: string, x: number, y: number) => string): void {
  const { p, k, ink, w } = pen
  const { x, head } = CAMERA
  outline(p, shade(ink, x + 0.15, -0.1), w * 1.3)
  p.line(x * k, head * k, (x + 0.3) * k, FLOOR * k)
  outline(p, shade(HOME.wood, x + 0.15, -0.1), Math.max(1, w * 0.6))
  p.line(x * k, head * k, (x + 0.3) * k, FLOOR * k)
  void t
}

/* ------------------------------------------------------------------ the flash */

/** The family's shadows thrown on the washer by the flash, behind them (drawn before the balls). */
export function drawFlashShadows(pen: Pen, t: number, family: Pt[]): void {
  const u = t - FLASH
  if (u < 0 || u > 0.6) return
  const { p, k } = pen
  const a = Math.exp(-u / 0.14)
  const [fx] = onCamera(CAM_BULB[0], CAM_BULB[1])
  p.noStroke()
  for (const [bx, by] of family) {
    // Thrown away from the bulb, up the washer's face a little, larger than they are.
    const d = bx - fx
    const sx = bx + 0.12 + 0.12 * d
    p.fill(alpha(p, HOME.night, 0.42 * a))
    p.ellipse(sx * k, (by - 0.06) * k, 0.34 * k, 0.32 * k)
  }
}

/** The flash: the bulb bursting, and the room lit white from its side, gone in a moment. */
export function drawFlash(pen: Pen, t: number, frameBox: { x0: number; y0: number; x1: number; y1: number }): void {
  const u = t - FLASH
  if (u < 0 || u > 0.8) return
  const { p, k } = pen
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const a = Math.exp(-u / 0.1) * 0.8 + 0.2 * Math.exp(-u / 0.35)
  const [fx, fy] = onCamera(CAM_BULB[0] + 0.05, CAM_BULB[1])
  ctx.save()
  // The room, lit from the camera's side.
  const g = ctx.createRadialGradient(fx * k, fy * k, 0, fx * k, fy * k, 9 * k)
  g.addColorStop(0, `rgba(255, 254, 248, ${Math.min(1, 1.0 * a)})`)
  g.addColorStop(0.2, `rgba(255, 252, 242, ${0.8 * a})`)
  g.addColorStop(1, `rgba(255, 250, 236, ${0.3 * a})`)
  ctx.fillStyle = g
  const { x0, y0, x1, y1 } = frameBox
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  // The bulb: a star of light.
  const b = Math.exp(-u / 0.06)
  const s = ctx.createRadialGradient(fx * k, fy * k, 0, fx * k, fy * k, 0.7 * k)
  s.addColorStop(0, `rgba(255, 255, 255, ${b})`)
  s.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = s
  ctx.fillRect((fx - 0.7) * k, (fy - 0.7) * k, 1.4 * k, 1.4 * k)
  ctx.restore()
}

/* ------------------------------------------------------------------ the photograph */

/** The instant photograph: a white card, its picture developing out of white, of the three of them by the washer. */
export function drawPhoto(pen: Pen, t: number): void {
  const ph = photoAt(t)
  if (!ph) return
  const { p, k, ink, w } = pen
  const { w: W, h: H } = PHOTO
  p.push()
  p.translate(ph.at[0] * k, ph.at[1] * k)
  p.rotate(ph.turn)
  p.scale(Math.max(0.06, ph.face), 1)
  solid(p, ink, w * 0.6, HOME.paper)
  p.rect(0, 0, W * k, H * k, 0.01 * k)
  // The picture: a square near its top, white at first, the picture coming up through it.
  const pw = W - 0.05
  const py = -H / 2 + 0.025 + pw / 2
  p.noStroke()
  p.fill(mixHex(HOME.paper, HOME.glassDeep, 0.85 * ph.dev))
  p.rect(0, py * k, pw * k, pw * k)
  if (ph.dev > 0.02) {
    const d = ph.dev
    // The washer's window behind them, glowing.
    p.fill(alpha(p, mixHex(HOME.light, HOME.gold, 0.4), d))
    p.circle(0, (py - 0.03) * k, 0.13 * k)
    // The three of them, eyes and all.
    const cols = [EVELYN, JOY, WAYMOND]
    cols.forEach((c, i) => {
      const bx = (i - 1) * 0.07
      const by = py + 0.065
      p.fill(alpha(p, c, d))
      p.circle(bx * k, by * k, 0.065 * k)
      p.fill(alpha(p, HOME.paper, d))
      p.circle(bx * k, (by - 0.004) * k, 0.036 * k)
      p.fill(alpha(p, HOME.night, d))
      p.circle(bx * k, (by + 0.004) * k, 0.018 * k)
    })
  }
  outline(p, ink, w * 0.4)
  p.rect(0, py * k, pw * k, pw * k)
  p.pop()
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
    p.fill(alpha(p, col, 0.32 * bloom))
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
      p.stroke(alpha(p, col, 0.8 * fade * tw))
      p.strokeWeight(Math.max(1, 0.035 * k))
      p.line(x0 * k, y0 * k, x * k, y * k)
      p.noStroke()
      p.fill(alpha(p, i % 3 === 0 ? HOME.light : col, fade * tw))
      p.circle(x * k, y * k, 0.07 * k)
    }
  }
  ctx.restore()
}

/** The fireworks' light on the floor in front of the window, a moment each (over the room, as light). */
export function fireworkFloor(pen: Pen, t: number): void {
  const { p, k } = pen
  const ctx = p.drawingContext as CanvasRenderingContext2D
  for (const b of BURSTS) {
    const u = t - b.at
    if (u < 0 || u > 1.6) continue
    const a = 0.4 * (1 - Math.exp(-u / 0.03)) * Math.exp(-u / 0.4)
    const col = BURST_COLOR[b.color]
    ctx.save()
    ctx.translate(-6.4 * k, (FLOOR + 0.1) * k)
    ctx.scale(1, 0.28)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 2.4 * k)
    g.addColorStop(0, rgba(p, col, a))
    g.addColorStop(1, rgba(p, col, 0))
    ctx.fillStyle = g
    ctx.fillRect(-2.4 * k, -2.4 * k, 4.8 * k, 4.8 * k)
    ctx.restore()
  }
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
