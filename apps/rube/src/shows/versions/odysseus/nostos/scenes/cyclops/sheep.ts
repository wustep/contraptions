import { mix, smooth, type Paint } from '../../draw'
import type { Pt } from '../../path'
import { glide } from '../../voyage'
import { ground, T } from './plan'

/**
 * His flock: four ewes and the ram. They graze on the shelf by the mouth before anyone comes, go in ahead of the men
 * and lie down just inside the door; in the morning they go out one at a time under his hand, a man tucked into the
 * wool of each, and the hero under the ram, last. A ewe is a little longer than a ball; the ram longer.
 *
 * Each is a pure function of time: where it is along the ground, which way it faces (turning, never flipping), whether
 * it is walking, and whether it lies down.
 */

export interface Sheep {
  /** Its length, and how far its belly is off the ground. */
  len: number
  legs: number
  /** Where it is (x along the ground) at `t`. */
  x(t: number): number
  /** Which way it faces at `t`: 1 east, -1 west, and between while it turns. */
  face(t: number): number
  /** How far it is lying down, 0 standing to 1 lying. */
  down(t: number): number
  ram: boolean
}

/** Where each grazes, where each lies inside, where each stops on the shelf after; in order of going out. */
const GRAZE = [93.3, 93.78, 94.36, 94.92, 95.45]
const REST = [98.0, 98.45, 98.9, 99.4, 99.9]
const OUT = [93.25, 93.7, 94.15, 94.6, 95.1]
/** Going in: the ram first and deepest, the ewes after it; so the ewe nearest the door goes out first. */
const IN_AT = [146.8, 146.55, 146.3, 146.05, 145.8]
/** Where the hand rests across the door: each passes under it at its pat. */
export const HAND_X = 97.3

function walker(i: number): Sheep {
  const ram = i === 4
  const len = ram ? 0.4 : 0.32
  const legs = ram ? 0.13 : 0.12
  // In: from grazing to its place inside at a walk (1.3 cells a second), gathering way and coming to rest.
  const t0 = IN_AT[i]
  const t1 = t0 + 1.2 + (REST[i] - GRAZE[i] - 0.78) / 1.3
  const inside = glide([
    [t0, GRAZE[i], 0],
    [t0 + 0.6, GRAZE[i] + 0.39, 1.3],
    [t1 - 0.6, REST[i] - 0.39, 1.3],
    [t1, REST[i], 0],
  ])
  // Out: each shuffles up to the door as the one before it goes, passes under the hand on its pat, and walks on down
  // the shelf to where it stops.
  const pat = T.pats[i]
  const leave = pat - (REST[i] - HAND_X) / 0.95
  const stop = pat + (HAND_X - OUT[i]) / 1.0 + 0.5
  const outside = glide([
    [leave, REST[i], 0],
    [pat, HAND_X, -1.05],
    [stop, OUT[i], 0],
  ])
  return {
    len,
    legs,
    ram,
    x: (t) => (t < t1 ? (t < t0 ? GRAZE[i] : inside(t)) : t < leave ? REST[i] : t < stop ? outside(t) : OUT[i]),
    // East in, west out: turning over half a second before each walk, and back east once it stops outside to graze.
    face: (t) => {
      const turnOut = smooth(t, leave - 0.5, leave)
      const turnBack = smooth(t, stop + 0.4, stop + 1.0)
      return Math.cos(Math.PI * (turnOut - turnBack))
    },
    down: (t) => smooth(t, t1 + 0.4, t1 + 1.6) * (1 - smooth(t, T.strike + 0.2, T.strike + 0.9)),
  }
}

export const FLOCK: Sheep[] = [0, 1, 2, 3, 4].map(walker)

/** The time each one leaves its place inside to go out (`FLOCK[i]`), for the man under it. */
export const leaveAt = (i: number): number => T.pats[i] - (REST[i] - HAND_X) / 0.95
/** The time each one stops on the shelf outside. */
export const stopAt = (i: number): number => T.pats[i] + (HAND_X - OUT[i]) / 1.0 + 0.5
export const REST_X = REST
export const OUT_X = OUT

/** Whether sheep `i` has a man tucked under it at `t` (then the whole of it is drawn over him, the wool hiding his top). */
let carrying: (i: number, t: number) => boolean = () => false
export function setCarrying(fn: (i: number, t: number) => boolean): void {
  carrying = fn
}
export const carries = (i: number, t: number): boolean => carrying(i, t)

/** Where a ball of radius `r` rides tucked in the wool under sheep `i` at `t`. */
export function under(i: number, t: number, r: number): Pt {
  const x = FLOCK[i].x(t)
  return [x, ground(x) - r]
}

/** How fast it is walking at `t` (cells a second), for its gait. */
function speed(s: Sheep, t: number): number {
  return Math.abs(s.x(t + 0.02) - s.x(t - 0.02)) / 0.04
}

/**
 * A sheep: a cloud of wool, a dark face low at the front, four thin legs that step while it walks. `wool` and `face`
 * are its colours as the light has them; `near` draws only its near legs (over the ball tucked under it).
 */
export function drawSheep(g: Paint, s: Sheep, t: number, wool: string, face: string, ink: string, near = false): void {
  const { ctx } = g
  const x = s.x(t)
  const y = ground(x)
  const f = s.face(t)
  const v = speed(s, t)
  const walking = Math.min(1, v / 0.6)
  const down = s.down(t)
  const L = s.len
  const legs = s.legs * (1 - 0.75 * down)
  const step = (t * 5.2 + x * 3.1) % 1
  const bob = walking * 0.012 * Math.sin(step * Math.PI * 4)
  const cy = y - legs - L * 0.24 + bob
  ctx.save()
  ctx.translate(x, 0)
  ctx.scale(f, 1)
  const lw = Math.max(1.25 * g.px, 1.5 / 108)
  // The legs: far pair first (behind the wool), near pair over a tucked ball.
  const leg = (lx: number, phase: number) => {
    const swing = walking * 0.05 * Math.sin((step + phase) * Math.PI * 2)
    ctx.beginPath()
    ctx.moveTo(lx * L, cy + L * 0.12)
    ctx.lineTo(lx * L + swing, y)
    ctx.strokeStyle = face
    ctx.lineWidth = Math.max(1.25 * g.px, L * 0.07)
    ctx.stroke()
  }
  if (!near) {
    leg(-0.28, 0.5)
    leg(0.22, 0)
    // The wool: three overlapping lobes in one silhouette.
    ctx.beginPath()
    ctx.ellipse(0, cy, L * 0.5, L * 0.27, 0, 0, Math.PI * 2)
    ctx.moveTo(-L * 0.12 + L * 0.2, cy - L * 0.16)
    ctx.ellipse(-L * 0.12, cy - L * 0.16, L * 0.2, L * 0.15, 0, 0, Math.PI * 2)
    ctx.moveTo(L * 0.16 + L * 0.19, cy - L * 0.12)
    ctx.ellipse(L * 0.16, cy - L * 0.12, L * 0.19, L * 0.14, 0, 0, Math.PI * 2)
    ctx.fillStyle = wool
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(0, cy, L * 0.5, L * 0.27, 0, 0, Math.PI * 2)
    ctx.strokeStyle = ink
    ctx.lineWidth = lw
    ctx.stroke()
    // The face, low and forward; grazing, it goes down to the grass. A ram's horn curls round it.
    const graze = (1 - walking) * (1 - down) * 0.5 * (1 + Math.sin(t * 0.9 + x * 7))
    const hx = L * 0.5
    const hy = cy - L * 0.02 + graze * L * 0.28
    ctx.beginPath()
    ctx.ellipse(hx, hy, L * 0.15, L * 0.1, 0.35 + graze * 0.5, 0, Math.PI * 2)
    ctx.fillStyle = face
    ctx.fill()
    if (s.ram) {
      ctx.beginPath()
      ctx.arc(hx - L * 0.06, hy - L * 0.06, L * 0.1, Math.PI * 0.9, Math.PI * 2.4)
      ctx.strokeStyle = mix(wool, face, 0.45)
      ctx.lineWidth = Math.max(1.25 * g.px, L * 0.06)
      ctx.stroke()
    }
  } else {
    leg(-0.2, 0)
    leg(0.3, 0.5)
  }
  ctx.restore()
}
