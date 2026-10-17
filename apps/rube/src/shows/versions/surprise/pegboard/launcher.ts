import type { Pt } from '../../../../parts'
import type { Brush } from './brush'
import { clamp, easeInOut, lerp, mix, rgba, ring } from './brush'
import { BLOCK, HOME, PELLET_R, PIVOT, PLINTH, TROUGH, TURNTABLE_R, muzzle } from './geo'
import { FACE, INK, PLATE, SLOT } from './look'
import { HOMEWARD, SHOTS, depth, type Shot } from './score'

/**
 * The launcher, seen from above: a plinth, a turntable on it, and on the turntable an open trough with a spring-loaded
 * block in it. The next pellet comes up through the lift in the trough's floor, at the pivot, just in front of the
 * block. The turntable swings round to aim; a ratchet draws the block back a click at a time, the spring closing up
 * behind it; and on the beat before an accent the block is let go, the pellet runs up the trough and flies, its shadow
 * on the board, to land on the accent. The turntable gives a little on each shot and comes back.
 */

/** How long the block takes to go home once let go. */
const SNAP = 0.06
/** A click: how long one step of the ratchet takes. */
const CLICK = 0.13

/** The shot being got ready at `t`: the first not yet fired. */
function next(t: number): number {
  for (let i = 0; i < SHOTS.length; i++) if (SHOTS[i].launch > t) return i
  return SHOTS.length
}

/** Where the launcher points at `t`. */
export function angleAt(t: number): number {
  let a = HOME
  for (const s of SHOTS) {
    if (t <= s.aim[0]) return a
    if (t < s.aim[1]) return lerp(a, s.angle, easeInOut((t - s.aim[0]) / (s.aim[1] - s.aim[0])))
    a = s.angle
  }
  return lerp(a, HOME, easeInOut((t - HOMEWARD[0]) / (HOMEWARD[1] - HOMEWARD[0])))
}

/** A click of the ratchet: quick, a hair past, and back. */
function click(u: number): number {
  const x = clamp(u)
  const c1 = 1.4
  return 1 + (c1 + 1) * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
}

/** How far the shot's spring is drawn, 0 to 1, at `t` before it is fired. */
function drawn(s: Shot, t: number): number {
  if (s.pull) return easeInOut((t - s.pull[0]) / (s.pull[1] - s.pull[0]))
  let k = 0
  const n = s.steps.length
  s.steps.forEach((at) => {
    if (t > at) k += click((t - at) / CLICK) / n
  })
  return k
}

/** Where the block's front face is along the trough at `t`. */
export function blockAt(t: number): number {
  const i = next(t)
  let u = BLOCK.rest
  if (i < SHOTS.length) u += (BLOCK.cocked - BLOCK.rest) * depth(SHOTS[i].s) * drawn(SHOTS[i], t)
  if (i > 0) {
    // Let go: up the trough in an instant, and back to rest on the spring.
    const fired = SHOTS[i - 1]
    const since = t - fired.launch
    if (since < SNAP) {
      const f = since / SNAP
      return lerp(BLOCK.rest + (BLOCK.cocked - BLOCK.rest) * depth(fired.s), BLOCK.fired, Math.pow(f, 1.5))
    }
    const v = since - SNAP
    if (v < 1.2) u += (BLOCK.fired - BLOCK.rest) * Math.exp(-9 * v) * Math.cos(v * 3.2 * Math.PI * 2)
  }
  return u
}

/** How far back the turntable is pushed at `t`, cells, along where it points. */
export function recoilAt(t: number): number {
  let r = 0
  for (const s of SHOTS) {
    const u = t - s.launch
    if (u > 0 && u < 1.2) r += 0.1 * (0.4 + 0.6 * s.s) * ring(u, 2.4, 7.5)
  }
  return r
}

/** Where a shot's pellet is at `t`, if anywhere: in the lift, seated, up the trough, in the air, or sinking in. */
export type Pellet =
  | { where: 'lift'; f: number }
  | { where: 'seated' }
  | { where: 'trough'; u: number }
  | { where: 'air'; x: number; y: number; h: number }
  | { where: 'in'; f: number; x: number; y: number }

export function pelletOf(s: Shot, t: number): Pellet | null {
  if (t < s.reload[0]) return null
  if (t < s.reload[1]) return { where: 'lift', f: (t - s.reload[0]) / (s.reload[1] - s.reload[0]) }
  if (t <= s.launch) return { where: 'seated' }
  const m = muzzle(s.angle)
  const air = Math.hypot(s.target[0] - m[0], s.target[1] - m[1])
  if (t < s.at) {
    const run = ((t - s.launch) / (s.at - s.launch)) * (TROUGH.muzzle + air)
    if (run < TROUGH.muzzle) return { where: 'trough', u: run }
    const w = (run - TROUGH.muzzle) / air
    const top = 0.35 + 0.14 * air
    return { where: 'air', x: lerp(m[0], s.target[0], w), y: lerp(m[1], s.target[1], w), h: top * 4 * w * (1 - w) }
  }
  if (t < s.at + 0.12) return { where: 'in', f: (t - s.at) / 0.12, x: s.target[0], y: s.target[1] }
  return null
}

/** A pellet: its colour, an edge of ink. */
function pellet(b: Brush, x: number, y: number, r: number, color: string): void {
  const { g } = b
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fillStyle = color
  g.fill()
  g.lineWidth = Math.max(b.px, 0.035)
  g.strokeStyle = INK
  g.stroke()
}

/** The machine, at the foot of the board. */
export function drawLauncher(b: Brush, t: number): void {
  const { g } = b
  const a = angleAt(t)
  const back = recoilAt(t)
  const line = Math.max(b.px, 0.04)
  // The plinth: it does not move.
  g.beginPath()
  g.roundRect(PIVOT[0] - PLINTH, PIVOT[1] - PLINTH, PLINTH * 2, PLINTH * 2, 0.32)
  g.fillStyle = FACE
  g.fill()
  g.lineWidth = line
  g.strokeStyle = INK
  g.stroke()
  g.save()
  g.translate(PIVOT[0] - Math.cos(a) * back, PIVOT[1] - Math.sin(a) * back)
  // The turntable.
  g.beginPath()
  g.arc(0, 0, TURNTABLE_R, 0, Math.PI * 2)
  g.fillStyle = PLATE
  g.fill()
  g.stroke()
  g.rotate(a)
  // The trough: its walls, its floor, the lift's hole at the pivot.
  const w = TROUGH.width / 2
  const c = TROUGH.channel / 2
  g.beginPath()
  g.roundRect(TROUGH.rear, -w, TROUGH.muzzle - TROUGH.rear, 2 * w, [0.18, 0, 0, 0.18])
  g.fillStyle = FACE
  g.fill()
  g.stroke()
  g.fillStyle = SLOT
  g.fillRect(TROUGH.cap, -c, TROUGH.muzzle - TROUGH.cap, 2 * c)
  g.beginPath()
  g.moveTo(TROUGH.cap, -c)
  g.lineTo(TROUGH.muzzle, -c)
  g.moveTo(TROUGH.cap, c)
  g.lineTo(TROUGH.muzzle, c)
  g.moveTo(TROUGH.cap, -c)
  g.lineTo(TROUGH.cap, c)
  g.lineWidth = Math.max(b.px, 0.025)
  g.stroke()
  g.beginPath()
  g.arc(0, 0, PELLET_R * 0.95, 0, Math.PI * 2)
  g.fillStyle = INK
  g.fill()
  // The spring, from the trough's back wall to the block: the same coils whatever its length, so drawn back it closes up.
  const front = blockAt(t)
  const tail = front - BLOCK.length
  const coils = 7
  g.beginPath()
  g.moveTo(TROUGH.cap, 0)
  for (let k = 0; k <= coils * 2; k++) {
    const u = TROUGH.cap + ((tail - TROUGH.cap) * (k + 0.5)) / (coils * 2 + 1)
    g.lineTo(u, k % 2 === 0 ? -c * 0.72 : c * 0.72)
  }
  g.lineTo(tail, 0)
  g.lineWidth = Math.max(b.px, 0.045)
  g.lineJoin = 'round'
  g.stroke()
  // The block.
  g.fillStyle = INK
  g.fillRect(tail, -BLOCK.width / 2, BLOCK.length, BLOCK.width)
  // The pellet in the trough, coming up the lift, seated, or on its way up the trough.
  for (const s of SHOTS) {
    const p = pelletOf(s, t)
    if (!p) continue
    if (p.where === 'lift') pellet(b, 0, 0, PELLET_R * (0.55 + 0.45 * p.f), mix(INK, s.color, p.f))
    else if (p.where === 'seated') pellet(b, 0, 0, PELLET_R, s.color)
    else if (p.where === 'trough') pellet(b, p.u, 0, PELLET_R, s.color)
  }
  g.restore()
}

/** The pellets in the air, over the board, each with its shadow; and a pellet going in where it lands. */
export function drawFlights(b: Brush, t: number): void {
  const { g } = b
  for (const s of SHOTS) {
    const p = pelletOf(s, t)
    if (!p) continue
    if (p.where === 'air') {
      // The light is high and to the left of the board: the shadow falls down and to the right, and softer the higher.
      const sx = p.x + 0.42 * p.h
      const sy = p.y + 0.58 * p.h
      g.beginPath()
      g.arc(sx, sy, PELLET_R * (1 - 0.05 * p.h), 0, Math.PI * 2)
      g.fillStyle = rgba(INK, 0.17 - 0.02 * Math.min(3, p.h))
      g.fill()
      pellet(b, p.x, p.y, PELLET_R * (1 + 0.1 * p.h), s.color)
    } else if (p.where === 'in') {
      const r = PELLET_R * (1 - p.f) * (1 - p.f)
      if (r > 0.004) pellet(b, p.x, p.y, r, s.color)
    }
  }
}

/** Where the shot in hand is aimed, for the camera's Zoom: the gap it will land in, or the launcher between shots. */
export function focusAt(t: number): Pt {
  const i = next(t)
  if (i >= SHOTS.length) return PIVOT
  return SHOTS[i].target
}
