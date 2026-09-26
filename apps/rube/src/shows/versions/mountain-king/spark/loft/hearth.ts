import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { box, frame, hash, scenery, smooth } from '../kit'
import { LOFT } from '../worlds'
import { CAT_CUES, drawCat } from './cat'
import { DOOR, FLOOR_Y, STOVE } from './layout'
import { LOFT_LIGHT, type Glow } from './set'
import { DOOR_MID, DOOR_W, LATCH, doorAngle, doorOpen, fireRoar, gripDip, onDoor } from './stove-door'
import { fireLight, lightAt, lightOn, poly, rgba, shade, sparkLight, VENT, type Light } from './stove-light'

/**
 * LOFT-B's scenery for the whole show: the parlour stove, its fire, and the cat asleep at its feet. Drawn from show
 * time, over the room and under every part.
 *
 * The stove is a cast-iron potbelly on four cabriole legs: a flat top plate (the wax pot warms on it), a round
 * shoulder, the bellied firebox with its door, a flared ash pit, a moulded base, thin nickel trims (rim, collar,
 * waist, foot rail) and the pipe up through the roof. Iron is near black; it reads by its sheen and its trims, and by
 * the light of the spark and the fire.
 *
 * - From the first frame the door is shut and the slots of its vent glow with the banked fire: a small red pool on
 *   the floor, on the sleeping cat.
 * - 52.504: the spark presses the latch and the door creaks open on the fire; the doorway floods the room with red
 *   gold (`LOFT_LIGHT.hearth`). 58.024: it leaps in, the fire rising to take it. After, the door swings to.
 * - 148.44: the door bursts open from inside (the spark comes home through the fire) and the room floods again;
 *   149.815 it slams, the light is cut off on the chord, and the cat wakes, looks at the candle, and sleeps by 154.
 */

export { CAT_CUES }

export const HEARTH_CELLS = box(STOVE.x0 - 7, -14, STOVE.x1 + 3, FLOOR_Y + 1, 1)

/* ------------------------------------------------------------------ the stove's shape */

const F = FLOOR_Y
/** The stove's middle line (the firebox door is on it). */
const CX = (DOOR.x0 + DOOR.x1) / 2
/** Its parts, top to bottom (loft cells), each with its half-width. */
const TOP = { y0: STOVE.top, y1: STOVE.top + 0.22, half: 2.72 }
const RIM = { y0: TOP.y1, y1: TOP.y1 + 0.1, half: 2.52 }
const SHOULDER = { y0: RIM.y1, y1: 1.3, from: 2.3, to: 2.62 }
const COLLAR = { y0: 1.3, y1: 1.43, half: 2.68 }
const BELLY = { y0: COLLAR.y1, y1: 5.92, half: 2.6, swell: 0.3 }
const WAIST = { y0: BELLY.y1, y1: 6.07, half: 2.44 }
const ASHPIT = { y0: WAIST.y1, y1: 7.72, from: 2.3, to: 2.56 }
const BASE = { y0: ASHPIT.y1, y1: 8.06, half: 2.74 }
const RAIL = { y0: BASE.y1, y1: 8.17, half: 2.84 }
const PIPE = { x0: STOVE.pipeX - 0.45, x1: STOVE.pipeX + 0.45 }
const FRAME = { x0: DOOR.x0 - 0.18, x1: DOOR.x1 + 0.18, y0: DOOR.y0 - 0.18, y1: DOOR.y1 + 0.16 }
const ASHDOOR = { x0: CX - 1.12, x1: CX + 1.12, y0: 6.36, y1: 7.44 }

/** The belly's half-width at y: round, fullest a little above the middle. */
const bellyHalf = (y: number): number => {
  const u = (y - BELLY.y0) / (BELLY.y1 - BELLY.y0)
  return BELLY.half + BELLY.swell * Math.sin(Math.PI * Math.pow(Math.max(0, Math.min(1, u)), 0.85))
}

/** A band's outline from its half-widths down its height: `half(u)` for u 0 (top) .. 1 (bottom). */
function band(y0: number, y1: number, half: (u: number) => number, n = 14): Pt[] {
  const pts: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const u = i / n
    pts.push([CX + half(u), y0 + (y1 - y0) * u])
  }
  for (let i = n; i >= 0; i--) {
    const u = i / n
    pts.push([CX - half(u), y0 + (y1 - y0) * u])
  }
  return pts
}
const rectPts = (x0: number, y0: number, x1: number, y1: number): Pt[] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
]

const SHOULDER_PTS = band(SHOULDER.y0, SHOULDER.y1, (u) => SHOULDER.from + (SHOULDER.to - SHOULDER.from) * Math.sin((Math.PI / 2) * u))
const BELLY_PTS = band(BELLY.y0, BELLY.y1, (u) => bellyHalf(BELLY.y0 + (BELLY.y1 - BELLY.y0) * u), 20)
const ASH_PTS = band(ASHPIT.y0, ASHPIT.y1, (u) => ASHPIT.from + (ASHPIT.to - ASHPIT.from) * u * u)
/** The base: a moulding that rounds out over the rail. */
const BASE_PTS = band(BASE.y0, BASE.y1, (u) => BASE.half - 0.1 + 0.1 * Math.sin(Math.PI * u * 0.9), 6)

/**
 * A cabriole leg from under the rail to the floor: a knee out, a slim ankle, a pad of a foot. `side` -1 west, 1 east;
 * `splay` how far its foot stands out from its top.
 */
function leg(x: number, side: number, splay: number): Pt[] {
  const top = RAIL.y1
  const h = F - top
  const s = side
  const out: Pt[] = []
  const prof: [number, number, number][] = [
    // [down fraction, outer offset, inner offset]
    [0, 0.3, -0.26],
    [0.16, 0.44, -0.16],
    [0.4, 0.32, -0.09],
    [0.68, 0.13, -0.08],
    [0.86, 0.11, -0.07],
    [0.94, 0.24, -0.1],
    [1, 0.27, -0.13],
  ]
  const dx = (f: number) => s * splay * Math.pow(f, 1.6)
  for (const [f, o] of prof) out.push([x + dx(f) + s * o, top + h * f])
  for (const [f, , i] of [...prof].reverse()) out.push([x + dx(f) + s * i, top + h * f])
  return out
}

/* ------------------------------------------------------------------ the fire */

/** A flame's tongue: base at (x, y), `h` tall, `w` at its belly, its tip swung by `lean`. */
function tongue(p: p5, k: number, x: number, y: number, w: number, h: number, lean: number, fill: string): void {
  p.fill(fill)
  p.beginShape()
  const n = 16
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    const u = (1 - Math.cos(a)) / 2
    const side = Math.sin(a)
    const belly = Math.sin(Math.PI * Math.pow(u, 0.7)) * (1 - 0.35 * u)
    p.vertex((x + side * w * 0.5 * belly + lean * u * u) * k, (y - h * u) * k)
  }
  p.endShape(p.CLOSE)
}

/** The fire in the firebox: its bed of coals and its flames, seen through the doorway. Taller as it roars. */
function drawFire(p: p5, k: number, t: number, roar: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const x0 = DOOR.x0
  const x1 = DOOR.x1
  const y0 = DOOR.y0
  const y1 = DOOR.y1
  const w = x1 - x0
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0 * k, y0 * k, w * k, (y1 - y0) * k)
  ctx.clip()
  // The firebox: soot, with the back wall lit by the coals.
  ctx.fillStyle = LOFT.soot
  ctx.fillRect(x0 * k, y0 * k, w * k, (y1 - y0) * k)
  const mx = (x0 + x1) / 2
  const back = ctx.createRadialGradient(mx * k, (y1 - 0.3) * k, 0.2 * k, mx * k, (y1 - 0.3) * k, (2.4 + 0.8 * roar) * k)
  back.addColorStop(0, rgba(LOFT.emberHot, 0.55 + 0.35 * roar))
  back.addColorStop(0.5, rgba(LOFT.ember, 0.35 + 0.3 * roar))
  back.addColorStop(1, rgba(LOFT.ember, 0))
  ctx.fillStyle = back
  ctx.fillRect(x0 * k, y0 * k, w * k, (y1 - y0) * k)
  // Flames off the coals: a dim back row, and a front row of tongues each its own width, height and sway, taller
  // as the fire roars, leaning a little toward the doorway's west side, where the spark stands.
  p.push()
  p.noStroke()
  const back_: [number, number, number][] = [
    [0.12, 0.7, 1.1],
    [0.38, 0.85, 1.5],
    [0.66, 0.75, 1.25],
    [0.9, 0.6, 0.9],
  ]
  const front: [number, number, number][] = [
    [0.08, 0.42, 0.65],
    [0.27, 0.55, 1.05],
    [0.47, 0.62, 1.35],
    [0.64, 0.46, 0.8],
    [0.8, 0.58, 1.15],
    [0.95, 0.4, 0.6],
  ]
  const grow = 0.8 + 1.7 * roar
  back_.forEach(([u, wd, ht], i) => {
    const sway = Math.sin(t * (2.1 + 0.7 * i) + i * 2.3)
    const h = ht * grow * (0.85 + 0.15 * Math.sin(t * (4.3 + i) + i))
    tongue(p, k, x0 + w * u, y1 - 0.3, wd, h, 0.12 * sway - 0.1 * roar, rgba(mixHex(LOFT.ember, LOFT.soot, 0.25), 0.8))
  })
  front.forEach(([u, wd, ht], i) => {
    const sway = Math.sin(t * (2.7 + 0.9 * i) + i * 1.7)
    const flick = 0.82 + 0.12 * Math.sin(t * (6.1 + 1.3 * i) + i * 2.9) + 0.06 * Math.sin(t * (11.3 + i) + i)
    const h = ht * grow * flick
    const x = x0 + w * u + 0.05 * sway
    const lean = 0.1 * sway - 0.16 * roar
    tongue(p, k, x, y1 - 0.34, wd, h, lean, rgba(LOFT.ember, 0.92))
    tongue(p, k, x + 0.02, y1 - 0.3, wd * 0.55, h * 0.62, lean * 0.8, rgba(LOFT.emberHot, 0.9))
  })
  p.pop()
  // The bed of coals: a heaped row of dark lumps, none round and none alike, glowing in the seams between them. Dark,
  // so the spark on the sill in front of it is the brightest thing there.
  const bed = ctx.createLinearGradient(0, (y1 - 0.5) * k, 0, y1 * k)
  bed.addColorStop(0, rgba(LOFT.ember, 0.9))
  bed.addColorStop(1, rgba(mixHex(LOFT.ember, LOFT.soot, 0.55), 0.95))
  ctx.fillStyle = bed
  ctx.fillRect(x0 * k, (y1 - 0.5) * k, w * k, 0.5 * k)
  p.push()
  for (let i = 0; i < 10; i++) {
    const cx = x0 + 0.05 + (w - 0.1) * ((i + 0.3 + 0.4 * hash(i, 2)) / 10)
    const r = 0.14 + 0.1 * hash(i, 4)
    const cy = y1 - 0.13 - 0.16 * hash(i, 6)
    const glowing = 0.5 + 0.5 * Math.sin(t * (1.3 + hash(i, 8)) + i)
    p.fill(mixHex(LOFT.soot, LOFT.ember, 0.12 + 0.2 * glowing * (0.5 + 0.5 * roar)))
    p.stroke(rgba(mixHex(LOFT.ember, LOFT.emberHot, 0.4 * glowing), 0.85))
    p.strokeWeight(Math.max(0.6, k * 0.02))
    const pts: Pt[] = []
    const m = 6
    for (let j = 0; j < m; j++) {
      const a = (j / m) * Math.PI * 2 + hash(i, j) * 0.6
      const rr = r * (0.75 + 0.45 * hash(i, j + 20))
      pts.push([cx + Math.cos(a) * rr * 1.3, cy + Math.sin(a) * rr * 0.72])
    }
    poly(p, k, pts)
  }
  p.pop()
  ctx.restore()
}

/* ------------------------------------------------------------------ materials */

/**
 * Cast iron: near black, darker than the plaster behind it, `lift` toward its plain colour for a part that stands
 * proud (the door, its frame). Small fittings (`near`) take the spark's light in their fill; big castings take it as a
 * pool laid over them (`lightOn`). The stove's own fire hardly lights its face: only a little red near the vent.
 */
const IRON_NIGHT = mixHex(LOFT.soot, LOFT.iron, 0.72)
const IRON_FIRE = mixHex(LOFT.ironLit, LOFT.ember, 0.5)
function ironAt(L: Light, x: number, y: number, lift = 0, near = false): string {
  let c = mixHex(IRON_NIGHT, LOFT.iron, lift)
  if (near) c = mixHex(c, LOFT.ironLit, Math.min(1, sparkLight(L, x, y)))
  const f = fireLight(L, x, y)
  return f > 0.003 ? mixHex(c, IRON_FIRE, Math.min(0.5, 0.3 * f)) : c
}
/** Nickel trim: a little paler than the iron in the dark, bright pewter in the light. */
const NICKEL_DARK = mixHex(LOFT.iron, LOFT.pewter, 0.4)
const nickelAt = (L: Light, x: number, y: number) => shade(L, x, y, NICKEL_DARK, LOFT.pewter, 0.8)
/** The light on cast iron: a dull sheen, never paler than the metal can be. */
const IRON_SHEEN = mixHex(LOFT.ironLit, LOFT.glow, 0.3)
/** The room's cool light along the iron's curves: what makes a black stove round in the dark. */
const COOL_SHEEN = mixHex(LOFT.ironLit, LOFT.moon, 0.35)

/**
 * The sheen down a round casting, clipped to it: a soft cool band on the west of its curve (the room's light) and a
 * narrower one on the east, over the flat fill. Light, so a gradient.
 */
function sheen(p: p5, k: number, pts: Pt[], x0: number, x1: number, a: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.closePath()
  ctx.clip()
  const g = ctx.createLinearGradient(x0 * k, 0, x1 * k, 0)
  g.addColorStop(0, rgba(COOL_SHEEN, 0))
  g.addColorStop(0.1, rgba(COOL_SHEEN, a * 0.5))
  g.addColorStop(0.2, rgba(COOL_SHEEN, a))
  g.addColorStop(0.34, rgba(COOL_SHEEN, 0))
  g.addColorStop(0.82, rgba(COOL_SHEEN, 0))
  g.addColorStop(0.9, rgba(COOL_SHEEN, a * 0.45))
  g.addColorStop(1, rgba(COOL_SHEEN, 0))
  ctx.fillStyle = g
  ctx.fillRect(x0 * k, -20 * k, (x1 - x0) * k, 40 * k)
  ctx.restore()
}

/* ------------------------------------------------------------------ the door */

function drawDoor(p: p5, k: number, ink: string, weight: number, L: Light, t: number): void {
  const a = doorAngle(t)
  const out = a <= Math.PI / 2
  const q = (lx: number, y: number) => onDoor(lx, y, a)
  const panel: Pt[] = [q(0, DOOR.y0), q(DOOR_W, DOOR.y0), q(DOOR_W, DOOR.y1), q(0, DOOR.y1)]
  const cx = (panel[0][0] + panel[1][0]) / 2
  // Its face: the outer face while it is swung less than square, the sooty inner face past that.
  const face = out ? ironAt(L, cx, DOOR_MID, 0.3) : shade(L, cx, DOOR_MID, LOFT.soot, mixHex(LOFT.soot, LOFT.ember, 0.4), 0.9, false)
  p.stroke(ink)
  p.strokeWeight(weight * 0.8)
  p.fill(face)
  poly(p, k, panel)
  lightOn(p, k, L, panel, IRON_SHEEN, 0.5, out ? 0.2 : 1)
  if (out) {
    // A raised panel with an arched head, cast in the door.
    const arch: Pt[] = []
    const ax0 = 0.3
    const ax1 = DOOR_W - 0.3
    const top = DOOR.y0 + 0.34
    const spring = DOOR.y0 + 0.95
    arch.push(q(ax0, DOOR.y1 - 1.02))
    for (let i = 0; i <= 14; i++) {
      const u = i / 14
      const lx = ax0 + (ax1 - ax0) * u
      arch.push(q(lx, spring - (spring - top) * Math.sin(Math.PI * u)))
    }
    arch.push(q(ax1, DOOR.y1 - 1.02))
    p.fill(mixHex(face, COOL_SHEEN, 0.1))
    p.stroke(ink)
    p.strokeWeight(weight * 0.5)
    poly(p, k, arch)
    // The vent: five narrow slots low on the door, glowing with the fire behind it until the door swings clear.
    const shut = 1 - smooth(a, 0.35, 1.1)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    if (shut > 0) {
      // The glow over the door round the slots: low and wide, never a round core.
      const [gx, gy] = q(DOOR_W / 2, VENT.y)
      const breathe = 0.8 + 0.12 * Math.sin(t * 1.7) + 0.08 * Math.sin(t * 4.1 + 1)
      ctx.save()
      ctx.translate(gx * k, gy * k)
      ctx.scale(1, 0.42)
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1.25 * k)
      g.addColorStop(0, rgba(LOFT.ember, 0.34 * shut * breathe))
      g.addColorStop(1, rgba(LOFT.ember, 0))
      ctx.fillStyle = g
      ctx.fillRect(-1.25 * k, -1.25 * k, 2.5 * k, 2.5 * k)
      ctx.restore()
    }
    for (let i = 0; i < 5; i++) {
      const lx = DOOR_W / 2 + (i - 2) * 0.34
      const glow = 0.55 + 0.25 * Math.sin(t * 1.7 + i * 1.3) + 0.2 * Math.sin(t * 4.1 + i)
      const hot = mixHex(LOFT.ember, LOFT.emberHot, 0.3 * glow)
      p.fill(shut > 0 ? mixHex(LOFT.soot, hot, shut * (0.55 + 0.45 * glow)) : LOFT.soot)
      p.stroke(ink)
      p.strokeWeight(weight * 0.45)
      const slot: Pt[] = []
      const hw = 0.065
      for (let j = 0; j <= 6; j++) slot.push(q(lx + hw * Math.cos(Math.PI + (j / 6) * Math.PI), VENT.y - 0.2 + hw * Math.sin(Math.PI + (j / 6) * Math.PI)))
      for (let j = 0; j <= 6; j++) slot.push(q(lx + hw * Math.cos((j / 6) * Math.PI), VENT.y + 0.2 + hw * Math.sin((j / 6) * Math.PI)))
      poly(p, k, slot)
    }
    // Its hinges on the west edge: straps with a knuckle.
    p.fill(nickelAt(L, DOOR.x0, DOOR_MID))
    p.stroke(ink)
    p.strokeWeight(weight * 0.6)
    for (const y of [DOOR.y0 + 0.5, DOOR.y1 - 0.5]) {
      poly(p, k, [q(-0.12, y - 0.17), q(0.5, y - 0.1), q(0.5, y + 0.1), q(-0.12, y + 0.17)])
    }
    // The latch: a flat grip west of its pivot, a tongue east into the keeper; the grip dips when pressed.
    const d = gripDip(t)
    const at = (lx: number, dy = 0): Pt => {
      const dx = lx - LATCH.pivot
      return q(LATCH.pivot + dx * Math.cos(d), LATCH.y + dy - dx * Math.sin(d))
    }
    const th = LATCH.thick / 2
    p.fill(nickelAt(L, cx, LATCH.y))
    p.strokeWeight(weight * 0.7)
    poly(p, k, [at(LATCH.grip - 0.04, -th - 0.05), at(LATCH.grip + 0.1, -th), at(LATCH.tongue, -th + 0.02), at(LATCH.tongue, th), at(LATCH.grip + 0.1, th), at(LATCH.grip - 0.02, th + 0.02)])
    // The pivot's boss: a short square, not a ball.
    p.fill(ironAt(L, cx, LATCH.y, 0.4, true))
    poly(p, k, [at(LATCH.pivot - 0.08, -0.09), at(LATCH.pivot + 0.08, -0.09), at(LATCH.pivot + 0.08, 0.09), at(LATCH.pivot - 0.08, 0.09)])
  } else {
    // The inside: soot and scale, lit red by the fire it faced.
    p.noFill()
    p.stroke(ink)
    p.strokeWeight(weight * 0.45)
    poly(p, k, [q(0.25, DOOR.y0 + 0.3), q(DOOR_W - 0.25, DOOR.y0 + 0.3), q(DOOR_W - 0.25, DOOR.y1 - 0.3), q(0.25, DOOR.y1 - 0.3)])
  }
  // Its thickness at the free edge, seen as it turns.
  const e = 0.1 * Math.abs(Math.sin(a))
  if (e > 0.01) {
    const s = out ? 1 : -1
    p.fill(ironAt(L, panel[1][0], DOOR_MID, 0.1))
    p.stroke(ink)
    p.strokeWeight(weight * 0.5)
    poly(p, k, [panel[1], [panel[1][0] + s * e, panel[1][1]], [panel[2][0] + s * e, panel[2][1]], panel[2]])
  }
}

/* ------------------------------------------------------------------ the stove */

function drawStove(p: p5, k: number, ink: string, weight: number, L: Light, t: number): void {
  const w = weight
  const iron = (x: number, y: number, lift = 0) => ironAt(L, x, y, lift)
  const nickel = (x: number, y: number) => nickelAt(L, x, y)
  p.stroke(ink)
  p.strokeJoin(p.ROUND)

  // The pipe, up through the roof: its joints and a damper's handle.
  const f = frame(p, k)
  const pipeTop = Math.max(-14, f.y0 - 1)
  const pipe: Pt[] = rectPts(PIPE.x0, pipeTop, PIPE.x1, TOP.y0 - 0.3)
  p.fill(iron(STOVE.pipeX, 0, 0.05))
  p.strokeWeight(w * 0.8)
  poly(p, k, pipe)
  sheen(p, k, pipe, PIPE.x0, PIPE.x1, 0.3)
  p.strokeWeight(w * 0.5)
  for (let y = -2.4; y > pipeTop; y -= 3.1) p.line(PIPE.x0 * k, y * k, PIPE.x1 * k, y * k)
  p.fill(nickel(STOVE.pipeX, -1.3))
  p.strokeWeight(w * 0.6)
  poly(p, k, [[PIPE.x1, -1.4], [PIPE.x1 + 0.42, -1.37], [PIPE.x1 + 0.42, -1.27], [PIPE.x1, -1.3]])
  // The collar where it meets the top.
  p.fill(iron(STOVE.pipeX, TOP.y0))
  p.strokeWeight(w * 0.8)
  poly(p, k, [[PIPE.x0 - 0.12, TOP.y0 - 0.34], [PIPE.x1 + 0.12, TOP.y0 - 0.34], [PIPE.x1 + 0.22, TOP.y0], [PIPE.x0 - 0.22, TOP.y0]])

  // The wax pot warming on the top: an iron pot with a lip and a bail, the beeswax in it catching the light.
  const pot = { x0: 4.45, x1: 5.85, y0: TOP.y0 - 0.78 }
  p.fill(iron(5.15, -0.3, 0.2))
  p.strokeWeight(w * 0.75)
  poly(p, k, [[pot.x0, pot.y0], [pot.x1, pot.y0], [pot.x1 - 0.08, TOP.y0 - 0.12], [pot.x1 - 0.2, TOP.y0], [pot.x0 + 0.2, TOP.y0], [pot.x0 + 0.08, TOP.y0 - 0.12]])
  p.fill(shade(L, 5.15, pot.y0, mixHex(LOFT.beeswax, LOFT.night, 0.35), LOFT.beeswax, 0.55))
  p.strokeWeight(w * 0.5)
  poly(p, k, [[pot.x0 + 0.06, pot.y0 - 0.05], [pot.x1 - 0.06, pot.y0 - 0.05], [pot.x1 - 0.06, pot.y0 + 0.05], [pot.x0 + 0.06, pot.y0 + 0.05]])
  // Its lip, pouring west, and the bail over it.
  p.fill(iron(pot.x0, pot.y0, 0.2))
  poly(p, k, [[pot.x0, pot.y0 - 0.02], [pot.x0 - 0.22, pot.y0 - 0.1], [pot.x0 - 0.2, pot.y0 + 0.03], [pot.x0, pot.y0 + 0.12]])
  p.noFill()
  p.strokeWeight(w * 0.7)
  p.beginShape()
  for (let i = 0; i <= 12; i++) {
    const u = i / 12
    p.vertex((pot.x0 + 0.08 + (pot.x1 - pot.x0 - 0.16) * u) * k, (pot.y0 + 0.05 - 0.55 * Math.sin(Math.PI * u)) * k)
  }
  p.endShape()

  // The legs behind: the back two, set in and darker.
  p.strokeWeight(w * 0.75)
  p.fill(mixHex(iron(CX, 9.5), LOFT.night, 0.4))
  poly(p, k, leg(CX - 1.25, -1, 0.15))
  poly(p, k, leg(CX + 1.25, 1, 0.15))

  // The top plate: flat iron, its front edge catching the light.
  const topPts = rectPts(CX - TOP.half, TOP.y0, CX + TOP.half, TOP.y1)
  p.fill(iron(CX, TOP.y0))
  p.strokeWeight(w * 0.9)
  poly(p, k, topPts)
  p.noStroke()
  p.fill(rgba(COOL_SHEEN, 0.35))
  poly(p, k, rectPts(CX - TOP.half + 0.06, TOP.y0 + 0.03, CX + TOP.half - 0.06, TOP.y0 + 0.08))

  // The shoulder rounding out from under the top, and the belly.
  p.stroke(ink)
  p.fill(iron(CX, 0.9))
  p.strokeWeight(w * 0.85)
  poly(p, k, SHOULDER_PTS)
  sheen(p, k, SHOULDER_PTS, CX - SHOULDER.to, CX + SHOULDER.to, 0.3)
  lightOn(p, k, L, SHOULDER_PTS, IRON_SHEEN, 0.5, 0.2)
  p.fill(iron(CX, 3.5))
  p.strokeWeight(w * 0.9)
  poly(p, k, BELLY_PTS)
  sheen(p, k, BELLY_PTS, CX - BELLY.half - BELLY.swell, CX + BELLY.half + BELLY.swell, 0.34)
  lightOn(p, k, L, BELLY_PTS, IRON_SHEEN, 0.5, 0.2)

  // The door's raised frame, and the keeper its latch drops into.
  const frm = rectPts(FRAME.x0, FRAME.y0, FRAME.x1, FRAME.y1)
  p.fill(iron(CX, 4, 0.4))
  p.strokeWeight(w * 0.8)
  poly(p, k, frm)
  p.fill(iron(DOOR.x1 + 0.2, LATCH.y, 0.4))
  p.strokeWeight(w * 0.6)
  poly(p, k, rectPts(DOOR.x1 + 0.1, LATCH.y - 0.16, DOOR.x1 + 0.3, LATCH.y + 0.14))

  // The doorway: the fire behind, whenever the door is off it.
  const a = doorAngle(t)
  if (a > 0.004) drawFire(p, k, t, L.roar)
  else {
    p.fill(LOFT.soot)
    p.noStroke()
    poly(p, k, rectPts(DOOR.x0, DOOR.y0, DOOR.x1, DOOR.y1))
  }
  // The sill: the doorway's cast lip, lit from inside when it is open.
  p.stroke(ink)
  p.strokeWeight(w * 0.8)
  p.fill(mixHex(iron(CX, DOOR.y1, 0.4), LOFT.ember, 0.55 * Math.min(1, a / 0.6)))
  poly(p, k, rectPts(FRAME.x0 - 0.08, DOOR.y1, FRAME.x1 + 0.08, FRAME.y1 + 0.08))

  // The ash pit, flaring to the base, and its door with a draught register.
  p.fill(iron(CX, 6.9))
  p.strokeWeight(w * 0.85)
  poly(p, k, ASH_PTS)
  sheen(p, k, ASH_PTS, CX - ASHPIT.to, CX + ASHPIT.to, 0.28)
  lightOn(p, k, L, ASH_PTS, IRON_SHEEN, 0.5, 0.35)
  p.fill(iron(CX, 6.9, 0.3))
  p.strokeWeight(w * 0.65)
  poly(p, k, rectPts(ASHDOOR.x0, ASHDOOR.y0, ASHDOOR.x1, ASHDOOR.y1))
  // The register: a slide over three slots, its knob to one side.
  p.fill(LOFT.soot)
  p.strokeWeight(w * 0.5)
  for (let i = 0; i < 3; i++) {
    const x = CX - 0.62 + i * 0.36
    poly(p, k, rectPts(x, 6.66, x + 0.16, 7.14))
  }
  p.fill(nickel(CX + 0.75, 6.9))
  poly(p, k, rectPts(CX + 0.62, 6.8, CX + 0.86, 7.0))

  // The base's moulding and the nickel trims: rim, collar, waist, foot rail.
  p.fill(iron(CX, BASE.y0, 0.15))
  p.strokeWeight(w * 0.85)
  poly(p, k, BASE_PTS)
  sheen(p, k, BASE_PTS, CX - BASE.half, CX + BASE.half, 0.3)
  p.strokeWeight(w * 0.6)
  for (const [y0, y1, half] of [
    [COLLAR.y0, COLLAR.y1, COLLAR.half],
    [WAIST.y0, WAIST.y1, WAIST.half],
    [RAIL.y0, RAIL.y1, RAIL.half],
    [RIM.y0, RIM.y1, RIM.half],
  ] as [number, number, number][]) {
    p.fill(nickel(CX, y0))
    poly(p, k, rectPts(CX - half, y0, CX + half, y1))
  }

  // The front legs, round in the room's light.
  p.strokeWeight(w * 0.75)
  for (const side of [-1, 1]) {
    const x = CX + side * 2.2
    const pts = leg(x, side, 0.3)
    p.fill(iron(x, 9.5, 0.1))
    p.stroke(ink)
    poly(p, k, pts)
    sheen(p, k, pts, x - 0.5, x + 0.55, 0.4)
  }

  // The door itself, over the doorway.
  drawDoor(p, k, ink, weight, L, t)
}

/** The fire's light on the floor in front of the stove: a pool from the vent, a flood from the open doorway. */
function floorGlow(p: p5, k: number, L: Light): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const f = fireLight(L, CX, F - 0.3)
  if (f < 0.01) return
  ctx.save()
  const r = 3 + 4.5 * L.open + 2 * L.roar
  const g = ctx.createRadialGradient(CX * k, (F - 0.1) * k, 0, CX * k, (F - 0.1) * k, r * k)
  g.addColorStop(0, rgba(mixHex(LOFT.ember, LOFT.glow, 0.35), 0.4 * f))
  g.addColorStop(0.5, rgba(LOFT.ember, 0.16 * f))
  g.addColorStop(1, rgba(LOFT.ember, 0))
  ctx.fillStyle = g
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillRect((CX - r) * k, (F - r * 0.9) * k, 2 * r * k, r * 1.1 * k)
  ctx.restore()
}

/* ------------------------------------------------------------------ the fire's light on the room */

/**
 * The stove's light on the room (`LOFT_LIGHT.hearth`, drawn into the room's light map): the vent's small red pool
 * while the door is shut; while it is open, the doorway floods the east end of the loft, more as the fire roars.
 * When the door bangs shut on the last chord the flood is cut off with it.
 */
export function hearthGlows(t: number): Glow[] {
  const open = doorOpen(t)
  const roar = fireRoar(t)
  const flick = 1 + 0.06 * Math.sin(t * 13.1) + 0.04 * Math.sin(t * 29.3 + 1.1)
  const breathe = 1 + 0.06 * Math.sin(t * 1.3) + 0.04 * Math.sin(t * 3.1 + 1)
  const shut = 1 - open
  const out: Glow[] = []
  if (shut > 0.01) {
    out.push({ x: CX, y: VENT.y + 0.3, r: 2.8, ry: 1.6, a: 0.5 * breathe * shut, color: LOFT.ember })
    out.push({ x: CX - 0.8, y: F - 1.1, r: 5, ry: 2.4, a: 0.38 * breathe * shut, color: mixHex(LOFT.ember, LOFT.glow, 0.5) })
  }
  if (open > 0.01) {
    const hot = mixHex(LOFT.ember, LOFT.emberHot, 0.35 + 0.3 * roar)
    out.push({ x: CX, y: DOOR_MID + 0.6, r: 3.6 + 1.4 * roar, a: open * (1.0 + 0.5 * roar) * flick, color: hot })
    out.push({ x: CX - 1.5, y: DOOR_MID + 2, r: 10 + 3 * roar, ry: 7.5 + 2 * roar, a: open * (0.42 + 0.3 * roar) * flick, color: mixHex(LOFT.ember, LOFT.glow, 0.45) })
    out.push({ x: CX - 1, y: F - 0.6, r: 7 + 2 * roar, ry: 2.4, a: open * 0.55 * flick, color: mixHex(LOFT.ember, LOFT.glow, 0.3) })
  }
  return out
}
LOFT_LIGHT.hearth = hearthGlows

export const hearth = scenery<null>({
  name: 'loft-hearth',
  draw: (p, _s, c) => {
    const { k, ink, weight, t } = c
    const L = lightAt(t)
    p.push()
    floorGlow(p, k, L)
    drawStove(p, k, ink, weight, L, t)
    drawCat(p, k, ink, weight, L, t)
    p.pop()
  },
})
