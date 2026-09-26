import type p5 from 'p5'
import { R, mixHex, type Pt } from '../../../../../parts'
import { LOFT } from '../worlds'
import { CAT_CUES } from './cat'
import { FLOOR_Y } from './layout'
import { lightOn, poly, shade, type Light } from './stove-light'

/**
 * The reel of wick on the floor: LOFT-B's floor stretch (phrase 4's tiptoe). Off the ladle the spark skids along the
 * boards and hops up onto a wooden reel of cotton wick lying on its side under the bench (38.465), and its weight and
 * speed set the reel rolling east toward the sleeping cat. It runs on top of it, a step a note, like a log-roller,
 * while the reel slows; and the reel comes to rest, gently, against the tip of the cat's tail on 42.455, which
 * twitches. The spark flinches on top of it, then gathers itself and hops off onto the tail (43.57).
 */

/** The reel: its flanges' radius; where it lies from the start, and where it comes to rest against the tail's tip. */
export const SPOOL = { r: 0.36, x0: -10.2, x1: -1.82 }
/** The spark lands on it; its steps on top, one a note; the reel touches the tail as the tail twitches. */
export const ON_SPOOL = 38.465
export const SPOOL_STEPS = [39.018, 39.648, 40.193, 40.776, 41.335]
export const TOUCH = CAT_CUES.stir[0]
/** How fast the reel starts off under the spark (cells/s). */
const V0 = 2.3
/** Each step's shove: the reel's speed jumps by `KICK` (cells/s) as the spark comes down on it, dying over `KICK_TAU`. */
const KICK = 0.55
const KICK_TAU = 0.25
const KICK_RISE = 0.025
/** How far one step's shove has carried the reel `s` seconds after the note (its speed's integral). */
function shoved(s: number): number {
  if (s <= 0) return 0
  // speed: KICK (1 - e^(-s/KICK_RISE)) e^(-s/KICK_TAU)
  const a = 1 / KICK_TAU
  const b = 1 / KICK_RISE + 1 / KICK_TAU
  return KICK * ((1 - Math.exp(-a * s)) / a - (1 - Math.exp(-b * s)) / b)
}
/** All the steps' shoves by `t`; by the touch they are spent. */
const shoves = (t: number): number => SPOOL_STEPS.reduce((d, at) => d + shoved(t - at), 0)

/**
 * The reel's middle (x) at `t`: lying still, then rolling east from the landing, slowing to rest on the tail's tip.
 * Under the slow-down each step shoves it on (a bump of speed on the note), and the slow-down is laid so that with
 * the shoves it still comes to rest against the tail on the twitch.
 */
export function spoolX(t: number): number {
  const { x0, x1 } = SPOOL
  if (t <= ON_SPOOL) return x0
  const T = TOUCH - ON_SPOOL
  if (t < TOUCH) {
    const u = (t - ON_SPOOL) / T
    const u2 = u * u
    const u3 = u2 * u
    // Leaves at the spark's own speed and eases to a stop against the tail, the steps' shoves on top.
    const rest = x1 - x0 - shoves(TOUCH)
    return x0 + (u3 - 2 * u2 + u) * T * V0 + (-2 * u3 + 3 * u2) * rest + shoves(t)
  }
  // The tail's twitch nudges it back a little; it rocks and settles against it.
  const s = t - TOUCH
  return x1 - 0.1 * (1 - Math.exp(-s / 0.05)) * Math.exp(-s / 0.3)
}
/** The reel's centre (y). */
export const SPOOL_Y = FLOOR_Y - SPOOL.r
/** How far it has turned (radians): it rolls. */
export const spoolTurn = (t: number): number => (spoolX(t) - SPOOL.x0) / SPOOL.r

/**
 * The spark on top of the reel: riding it, with a hop up before each of its steps that comes down on the note (a step
 * a note), shoving the reel on as it lands.
 */
export function onSpool(t: number): Pt {
  const x = spoolX(t)
  let up = 0
  for (const at of SPOOL_STEPS) {
    const u = (t - (at - 0.24)) / 0.24
    if (u > 0 && u < 1) up = Math.max(up, 0.17 * 4 * u * (1 - u))
  }
  return [x, SPOOL_Y - SPOOL.r - R - up]
}

/** Every cell the reel covers along its roll (world cells). */
export function spoolCells(): Pt[] {
  const out: Pt[] = []
  for (let x = Math.floor(SPOOL.x0 - 1); x <= Math.ceil(SPOOL.x1 + 1); x++) for (let y = Math.floor(FLOOR_Y - 1.5); y <= Math.ceil(FLOOR_Y); y++) out.push([x, y])
  return out
}

/**
 * The reel, lying on its side, seen end-on: the far flange a little up and behind, the cream wick wound between, the
 * near flange of oak with its hub and a pin through it, turning as it rolls; lit by the spark riding it.
 */
export function drawSpool(p: p5, k: number, ink: string, weight: number, L: Light, t: number): void {
  const x = spoolX(t)
  const y = SPOOL_Y
  const r = SPOOL.r
  const a = spoolTurn(t)
  const ring = (cx: number, cy: number, rr: number, n = 28): Pt[] => Array.from({ length: n }, (_, i) => [cx + rr * Math.cos((i / n) * Math.PI * 2), cy + rr * Math.sin((i / n) * Math.PI * 2)] as Pt)
  const wood = shade(L, x, y, LOFT.wood, LOFT.woodLit, 0.5)
  const woodDeep = mixHex(wood, LOFT.soot, 0.35)
  const wick = shade(L, x, y - 0.1, mixHex(LOFT.wick, LOFT.night, 0.35), LOFT.wick, 0.45)
  p.push()
  p.stroke(ink)
  p.strokeJoin(p.ROUND)
  // Its shadow on the boards.
  p.noStroke()
  p.fill(mixHex(LOFT.soot, LOFT.night, 0.3))
  p.ellipse(x * k, (FLOOR_Y - 0.01) * k, r * 2.3 * k, 0.07 * k)
  // The far flange, up and behind; the wick wound between, seen as a band.
  const back: Pt = [x + 0.11, y - 0.09]
  p.stroke(ink)
  p.strokeWeight(weight * 0.6)
  p.fill(woodDeep)
  poly(p, k, ring(back[0], back[1], r))
  p.fill(wick)
  p.strokeWeight(weight * 0.5)
  poly(p, k, [
    [x + r * 0.62 * Math.cos(-2.2), y + r * 0.62 * Math.sin(-2.2)],
    [back[0] + r * 0.62 * Math.cos(-2.2), back[1] + r * 0.62 * Math.sin(-2.2)],
    [back[0] + r * 0.62 * Math.cos(0.9), back[1] + r * 0.62 * Math.sin(0.9)],
    [x + r * 0.62 * Math.cos(0.9), y + r * 0.62 * Math.sin(0.9)],
  ])
  // The near flange: oak, a rim a shade darker, the hub.
  const face = ring(x, y, r)
  p.fill(wood)
  p.strokeWeight(weight * 0.75)
  poly(p, k, face)
  lightOn(p, k, L, face, LOFT.woodLit, 0.8)
  p.noFill()
  p.stroke(mixHex(woodDeep, LOFT.soot, 0.2))
  p.strokeWeight(Math.max(1, 0.03 * k))
  p.circle(x * k, y * k, r * 1.62 * k)
  // The grain: two arcs that turn with it, so the roll reads.
  p.stroke(mixHex(wood, woodDeep, 0.6))
  p.strokeWeight(Math.max(0.8, 0.02 * k))
  for (const off of [0.4, 3.4]) p.arc(x * k, y * k, r * 1.15 * k, r * 1.15 * k, a + off, a + off + 1.3)
  // The hub, and a pin through it.
  p.stroke(ink)
  p.strokeWeight(weight * 0.5)
  p.fill(mixHex(LOFT.soot, wood, 0.25))
  poly(p, k, ring(x, y, r * 0.22, 12))
  const pin: Pt = [x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5]
  p.fill(shade(L, pin[0], pin[1], LOFT.iron, LOFT.ironLit, 0.6))
  poly(p, k, ring(pin[0], pin[1], 0.035, 8))
  p.pop()
}
