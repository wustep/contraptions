import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { drawTroll, type Pen, type TrollLook } from '../troll'
import { TROLL } from '../worlds'
import {
  BELLOWS,
  BREAK,
  CHIMNEY_X,
  DECK,
  FLY,
  GOVERNOR,
  GOV_SNAP,
  GOV_STOPS,
  GOV_WEIGHTS,
  PAH,
  PISTONS,
  PIT,
  T0,
  VALVE,
  VALVE_AT,
  VALVE_THROW,
  clamp01,
  ease,
  lerp,
  since,
  smoothstep,
  valveLift,
} from './heart-clock'
import { ON_YOKE, peerAt } from './heart-path'

/**
 * The heart's trolls, drawn with the canonical `drawTroll`: the keeper on the ledge, the stoker at the small bellows,
 * and two who come after Peer through the machine. Each is a function of show time: where it stands and how it
 * looks. Nobody is ever a ball.
 *
 *   the keeper    asleep against the ledge's wall; the first flare wakes him; he watches; he throws the governor in
 *                 (124.01) and grabs at Peer on its yoke, too late; when the valve blows (129.11) he sits on its lever
 *                 to hold it down, and it throws him off (131.58); the bells freeze him; he flees by the ledge's door
 *   the stoker    asleep by the small bellows; wakes on the first flare and works the bellows on every 2 and 4;
 *                 shoves the pinion into the flywheel (107.75); freezes at the bells; flees by the gallery's door
 *   the chasers   in by the gallery's door as Peer rides the flywheel; down into the pit and onto the pumps' case,
 *                 grabbing at him as he bounces on the heads; look up as the governor lifts him; scatter when its
 *                 spindle comes down (133.67); freeze; flee
 */

/** Where one of them is and how it looks at T (feet at x, y; rotated `rot` about the feet when thrown). */
interface Pose {
  x: number
  y: number
  look: TrollLook
  rot?: number
  /** 0..1 how far into a doorway (drawn darker, then gone). */
  gone?: number
}

/** Where Peer is, smoothed a little, for a glance to follow without whipping on every hop. */
function peerSeen(T: number): Pt {
  let x = 0
  let y = 0
  let n = 0
  for (let j = 0; j <= 8; j++) {
    const q = peerAt(Math.max(T0, T - j * 0.06))
    x += q[0]
    y += q[1]
    n++
  }
  return [x / n, y / n]
}
/** A face turned toward Peer from x (the nose swings over), within `reach`. */
const aim = (x: number, T: number, reach = 2.2): number => Math.max(-1, Math.min(1, (peerSeen(T)[0] - x) / reach))

/** A walk from a to b between t0 and t1, eased; the stride's phase with it. */
function walk(T: number, t0: number, t1: number, a: number, b: number, stride = 0.55): { x: number; phase: number; moving: boolean } {
  const u = clamp01((T - t0) / (t1 - t0))
  const e = ease(u)
  const x = lerp(a, b, e)
  return { x, phase: Math.abs(x - a) / stride, moving: u > 0 && u < 1 }
}

/**
 * The bells (Ibsen's turn, the coda's first chord): every troll in the heart stops dead and looks up, head back,
 * toward the thread of daylight coming down the chimney, all on the same chord. A unison upward look is what reads as
 * "heard something above", not "startled by the crash". `h` is how far into it (0..1, over a quarter second); they
 * hold it, dead still, until they bolt on the pickup and the crash.
 */
function hark(T: number, x: number): { h: number; face: number; slump: number; eyes: number; mouth: number; arms: number } {
  const h = smoothstep(T, BREAK - 0.05, BREAK + 0.25)
  return { h, face: 0.6 * Math.max(-1, Math.min(1, (CHIMNEY_X - x) / 2.5)), slump: -0.35, eyes: 1.5, mouth: 0.35, arms: 0 }
}
/** Out of the look up as one bolts at `go`: the head comes down and round over a fifth of a second (never a snap). */
const unhark = (T: number, go: number): number => 1 - smoothstep(T, go, go + 0.2)

/** The pumping beat: 1 on each flare, falling back over the beat (the push down on the bellows' board). */
function push(T: number): number {
  const { i, ago } = since(PAH, T)
  const next = PAH[i + 1]
  if (next !== undefined && next - T < 0.12) return 1 - (next - T) / 0.12
  if (i < 0) return 0
  return Math.max(0, 1 - ago / 0.2)
}

/* ------------------------------------------------------------------ the keeper */

const WAKE = PAH[0]
const KEEP = { x: 14.72, size: 1.85, seed: 3 }
/** Where the governor's lever's handle is, off and on (he pulls it down on GOVERNOR). */
export const GOV_LEVER = { pivot: [13.02, DECK - 0.42] as Pt, len: 0.72, off: -0.35, on: 0.85 }
export function govLever(T: number): number {
  const pull = smoothstep(T, GOVERNOR - 0.2, GOVERNOR)
  return lerp(GOV_LEVER.off, GOV_LEVER.on, pull * pull)
}

function keeper(T: number): Pose {
  const base: TrollLook = { size: KEEP.size, hide: TROLL.old, seed: KEEP.seed }
  // Asleep, sitting against the wall.
  if (T < WAKE) return { x: KEEP.x, y: DECK, look: { ...base, pose: 'doze', face: -0.3, rise: 0 } }
  const startle = Math.exp(-Math.max(0, T - WAKE) / 0.5)
  // Awake: he gets up and watches, the nose following Peer.
  if (T < GOVERNOR - 1.25) {
    const rise = smoothstep(T, WAKE + 0.35, WAKE + 1.1)
    const shout = Math.max(smoothstep(T, PISTONS - 0.1, PISTONS + 0.1) * (1 - smoothstep(T, PISTONS + 0.6, PISTONS + 1.2)), 0)
    return {
      x: KEEP.x,
      y: DECK,
      look: { ...base, pose: rise < 0.5 ? 'sit' : 'stand', rise, face: aim(KEEP.x, T, 3), eyes: 1 + 0.5 * startle, slump: 0.6 * (1 - rise), mouth: 0.7 * shout, arms: 0.55 * shout },
    }
  }
  // To the governor's lever, and he pulls it: the governor comes in.
  const leverX = 13.95
  if (T < GOVERNOR + 0.6) {
    const w = walk(T, GOVERNOR - 1.25, GOVERNOR - 0.35, KEEP.x, leverX)
    // Reaching up for the handle, then hauling it down onto the beat.
    const pulled = T >= GOVERNOR - 0.08
    return {
      x: w.x,
      y: DECK,
      look: { ...base, pose: w.moving ? 'run' : pulled ? 'stand' : 'reach', phase: w.phase, face: -0.8, arms: pulled ? 0.15 * (1 - smoothstep(T, GOVERNOR, GOVERNOR + 0.4)) : 0, slump: pulled ? 0.25 * (1 - smoothstep(T, GOVERNOR, GOVERNOR + 0.5)) : 0, eyes: 1.1 },
    }
  }
  // Peer lands on the yoke by his head: he grabs up at him, and the yoke lifts him out of reach.
  if (T < VALVE_AT - 0.4) {
    const grab = smoothstep(T, ON_YOKE - 0.25, ON_YOKE + 0.05)
    const { ago } = since(PAH, T)
    const snatch = Number.isFinite(ago) ? Math.exp(-ago / 0.18) : 0
    // He steps back from under the yoke to reach up at him: a little space between them.
    const x = lerp(leverX, 14.92, smoothstep(T, GOVERNOR + 0.1, GOVERNOR + 0.9))
    return {
      x,
      y: DECK,
      look: { ...base, pose: grab > 0.5 ? 'reach' : 'stand', face: aim(x, T, 1.0), arms: 0.1 * snatch, mouth: 0.5 * grab + 0.3 * snatch * grab, eyes: 1.2 },
    }
  }
  // The valve blows beside him: he sits on its lever to hold it down, and rides its bucking.
  const seatX = VALVE.pivot[0] + 0.78
  if (T < VALVE_THROW) {
    const w = walk(T, VALVE_AT - 0.4, VALVE_AT + 0.05, 14.92, seatX)
    const lift = valveLift(T)
    const seatY = VALVE.pivot[1] - Math.sin(lift) * 0.78 + 0.02
    const sit = smoothstep(T, VALVE_AT - 0.05, VALVE_AT + 0.12)
    return {
      x: w.x,
      y: lerp(DECK, seatY, sit),
      look: { ...base, pose: sit > 0.5 ? 'sit' : 'run', phase: w.phase, rise: sit > 0.5 ? 0 : undefined, face: aim(seatX, T, 2) * 0.7, eyes: 1.35, mouth: 0.35 + 0.3 * lift / 0.2, slump: 0.1 },
    }
  }
  // Thrown off: up and back against the wall, down on his rump, dazed.
  const a = T - VALVE_THROW
  const fly = 0.5
  if (a < fly) {
    const u = a / fly
    const x = lerp(seatX, 15.02, u)
    const y = lerp(VALVE.pivot[1], DECK, u) - 1.1 * 4 * u * (1 - u)
    return { x, y, rot: 0.3 * Math.sin(u * Math.PI), look: { ...base, pose: 'sit', rise: 0, face: -0.4, eyes: 1.5, mouth: 0.8, arms: 0.8 * (1 - u) } }
  }
  // Down, dazed; ducking the governor's weights; then the bells: he looks up the chimney, and gets up and goes.
  const hk = hark(T, 15.02)
  const duck = smoothstep(T, GOV_STOPS - 0.1, GOV_STOPS + 0.1) * (1 - smoothstep(T, BREAK - 0.2, BREAK))
  if (T < PICK - 0.25) {
    const dazed = { face: -0.5, eyes: 0.7 + 0.5 * duck, slump: 0.5 + 0.5 * duck, arms: 0.45 * duck, mouth: 0 }
    return {
      x: 15.02,
      y: DECK,
      look: {
        ...base,
        pose: 'sit',
        rise: 0,
        face: lerp(dazed.face, hk.face, hk.h),
        eyes: lerp(dazed.eyes, hk.eyes, hk.h),
        slump: lerp(dazed.slump, hk.slump, hk.h),
        arms: lerp(dazed.arms, hk.arms, hk.h),
        mouth: lerp(dazed.mouth, hk.mouth, hk.h),
      },
    }
  }
  // Up on the pickup, and out of the ledge's door on the crash.
  const up = smoothstep(T, PICK - 0.25, PICK + 0.05)
  const w = walk(T, CRASH - 0.05, CRASH + 0.9, 15.02, 16.2, 0.5)
  const held = unhark(T, PICK - 0.25)
  return {
    x: w.x,
    y: DECK,
    gone: smoothstep(T, CRASH + 0.35, CRASH + 0.9),
    look: { ...base, pose: up < 1 ? 'sit' : 'run', rise: up, phase: w.phase, face: lerp(1, hk.face, held), slump: hk.slump * held, eyes: lerp(1.4, 1.5, held), mouth: lerp(0.6, 0.35, held) },
  }
}

/** The coda's pickup and crash (the chord pair after the bells): the crew bolt on them. */
const PICK = 135.146
const CRASH = 135.411

/* ------------------------------------------------------------------ the stoker */

const STOKE = { x: 4.22, size: 1.55, seed: 11 }

function stoker(T: number): Pose {
  const base: TrollLook = { size: STOKE.size, seed: STOKE.seed }
  if (T < WAKE) return { x: STOKE.x - 0.1, y: PIT, look: { ...base, pose: 'doze', face: 0.4, rise: 0 } }
  const startle = Math.exp(-Math.max(0, T - WAKE) / 0.45)
  const rise = smoothstep(T, WAKE + 0.2, WAKE + 0.75)
  if (rise < 1) return { x: STOKE.x - 0.1 * (1 - rise), y: PIT, look: { ...base, pose: 'sit', rise, face: 0.2, eyes: 1 + 0.5 * startle } }
  // The pinion: he shoves its arm up into the flywheel's teeth on FLY.
  const shove = smoothstep(T, FLY - 0.35, FLY - 0.08) * (1 - smoothstep(T, FLY + 0.15, FLY + 0.55))
  // After the bells: he bolts on the pickup, for the gallery's door, the look up coming down off him as he runs.
  if (T >= PICK - 0.05) {
    const w = walk(T, PICK - 0.05, PICK + 1.35, STOKE.x, DOOR_L, 0.5)
    const hk = hark(T, STOKE.x)
    const held = unhark(T, PICK - 0.05)
    return {
      x: w.x,
      y: PIT,
      gone: smoothstep(T, PICK + 0.9, PICK + 1.35),
      look: { ...base, pose: w.moving ? 'run' : 'stand', phase: w.phase, face: lerp(-1, hk.face, held), slump: hk.slump * held, eyes: 1.5, mouth: lerp(0.5, hk.mouth, held), arms: 0 },
    }
  }
  // Working the bells into him: whatever he was doing, he stops and looks up the chimney on the chord.
  const hk = hark(T, STOKE.x)
  const pump = push(T) * (1 - hk.h)
  // Glances at Peer between strokes; the pumping itself looks down at the board.
  const glance = aim(STOKE.x, T, 3)
  return {
    x: STOKE.x + 0.12 * shove,
    y: PIT,
    look: {
      ...base,
      pose: shove > 0.3 ? 'reach' : 'stand',
      face: lerp(shove > 0.3 ? 0.9 : lerp(-0.35, glance, 0.35), hk.face, hk.h),
      arms: lerp(shove > 0.3 ? 0 : 0.42 * (1 - pump), hk.arms, hk.h),
      slump: lerp(0.25 * pump, hk.slump, hk.h),
      eyes: lerp(1.05, hk.eyes, hk.h),
      mouth: lerp(0.25 * pump, hk.mouth, hk.h),
    },
  }
}

/* ------------------------------------------------------------------ the chasers */

const DOOR_L = 1.75
const CHASE = [
  // The first goes to the great bellows when the keeper shouts; the second stays at the pumps after Peer.
  { size: 1.9, seed: 21, enter: FLY + 1.2, stand: 9.85, pump: 9.45 },
  { size: 1.78, seed: 22, enter: FLY + 1.9, stand: 11.5, pump: 11.5 },
]

function chaser(j: number, T: number): Pose | null {
  const ch = CHASE[j]
  const base: TrollLook = { size: ch.size, seed: ch.seed }
  if (T < ch.enter) return null
  // Out of the tunnel in the pit's back wall, and across the pit (in front of the furnace) to the pumps.
  const at = PISTONS - 0.45 + j * 0.35
  if (T < at) {
    const w = walk(T, ch.enter, at, DOOR_L, ch.stand, 0.6)
    return { x: w.x, y: PIT, gone: 1 - smoothstep(T, ch.enter, ch.enter + 0.5), look: { ...base, pose: w.moving ? 'run' : 'stand', phase: w.phase, face: 1, eyes: 1.15, mouth: 0.35 } }
  }
  // In front of the pumps: grabbing up at him each time he comes down on a head beside them.
  const toBellows = j === 0 ? BELLOWS - 0.75 : GOVERNOR + 0.8
  if (T < toBellows) {
    const p = peerSeen(T)
    const near = clamp01(1 - Math.abs(p[0] - ch.stand) / 1.4) * (p[1] > -1.6 ? 1 : 0.3)
    const { ago } = since(PAH, T)
    const snatch = Number.isFinite(ago) ? Math.exp(-ago / 0.15) : 0
    return {
      x: ch.stand,
      y: PIT,
      look: { ...base, pose: near > 0.2 ? 'reach' : 'stand', face: aim(ch.stand, T, 1.2), arms: 0.12 * snatch * near, mouth: 0.3 + 0.5 * near * snatch, eyes: 1.1 },
    }
  }
  // The keeper's shout sends them to the great bellows: they work it on every 2 and 4, and the furnace goes white.
  if (T < GOV_SNAP) {
    const w = walk(T, toBellows, BELLOWS - 0.05, ch.stand, ch.pump, 0.6)
    const pump = j === 0 && T >= BELLOWS - 0.1 && T < GOVERNOR + 0.8 ? push(T) : 0
    const up = T > GOVERNOR + 0.8
    const duck = smoothstep(T, GOV_WEIGHTS[j] - 0.1, GOV_WEIGHTS[j] + 0.08) * (1 - smoothstep(T, GOV_WEIGHTS[j] + 0.5, GOV_WEIGHTS[j] + 0.8))
    return {
      x: w.x,
      y: PIT,
      look: {
        ...base,
        pose: w.moving ? 'run' : 'stand',
        phase: w.phase,
        face: w.moving ? -1 : up ? 0.5 + 0.1 * j : -0.3 + 0.6 * j,
        arms: duck > 0.3 ? 0.5 : up ? 0.2 : 0.42 * (1 - pump),
        slump: 0.25 * pump + 0.8 * duck,
        mouth: up ? 0.55 : 0.2 + 0.2 * pump,
        eyes: 1.05 + 0.4 * duck + (up ? 0.3 : 0),
      },
    }
  }
  // The governor's spindle comes down across the pumps: they throw themselves clear, back across the pit; the bells
  // freeze them; then away into the tunnel.
  const x0 = ch.pump - 1.5 - 0.7 * j
  const bolt = (j === 0 ? PICK : CRASH) - 0.05
  const hk = hark(T, x0)
  if (T < bolt) {
    const w = walk(T, GOV_SNAP, GOV_SNAP + 0.55, ch.pump, x0, 0.6)
    return {
      x: w.x,
      y: PIT,
      look: { ...base, pose: w.moving ? 'run' : 'stand', phase: w.phase, face: lerp(-1, hk.face, hk.h), slump: hk.slump * hk.h, eyes: 1.5, mouth: lerp(0.7, hk.mouth, hk.h), arms: lerp(0.2, hk.arms, hk.h) },
    }
  }
  // The bells freeze them; they bolt on the pickup and the crash, one each, for the tunnel.
  const w = walk(T, bolt, bolt + 1.5 + 0.2 * j, x0, DOOR_L, 0.6)
  const held = unhark(T, bolt)
  return {
    x: w.x,
    y: PIT,
    gone: smoothstep(T, bolt + 1.0 + 0.2 * j, bolt + 1.5 + 0.2 * j),
    look: { ...base, pose: 'run', phase: w.phase, face: lerp(-1, hk.face, held), slump: hk.slump * held, eyes: lerp(1.4, 1.5, held), mouth: lerp(0.6, hk.mouth, held) },
  }
}

/* ------------------------------------------------------------------ drawing */

/** Draw the heart's trolls at T; `litAt(x)` is how lit the room is where one stands; `layer` picks who. */
export function drawTrolls(p: p5, c: Pen, T: number, litAt: (x: number) => number, layer: 'pit' | 'ledge'): void {
  const poses: Pose[] = []
  if (layer === 'pit') {
    poses.push(stoker(T))
    for (let j = 0; j < CHASE.length; j++) {
      const q = chaser(j, T)
      if (q) poses.push(q)
    }
  } else poses.push(keeper(T))
  for (const q of poses) {
    const g = clamp01(q.gone ?? 0)
    if (g >= 0.999) continue
    const lit = litAt(q.x) * (1 - g)
    p.push()
    if (q.rot) {
      p.translate(q.x * c.k, q.y * c.k)
      p.rotate(q.rot)
      p.translate(-q.x * c.k, -q.y * c.k)
    }
    drawTroll(p, c, q.x, q.y, { ...q.look, lit: Math.max(0.05, lit) })
    p.pop()
  }
}
