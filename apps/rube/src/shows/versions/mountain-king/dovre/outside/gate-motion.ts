import { laneAt, R, type Pt } from '../../../../../parts'
import { route, smooth, type Way } from '../kit'
import { skyline } from '../mountain'
import { beatAt, eighth, quarterAt } from '../music'
import { G_EARTH, hop } from '../physics'

/**
 * The gate's clock and geometry: where everything is and when (the gate part's frame is the world's: it is the first
 * part, laid at 0, 0). `gate-set.ts` and `gate-pig.ts` draw from these; `gate.ts` builds the lane from them, so the
 * drawing and the ball read the same functions and nothing slides.
 *
 * The story, on the music (`eighth(j)`: phrase 0 is eighths 0–31, phrase 1 is 32–63):
 *
 *   0 → 4.36    the horns' note: the mountain at night; the great pig trotting up the west flank, both on its back.
 *   4.36 → 8.4  the theme (phrase 0): the pig trots on the plucked notes; heavy steps toss them on 4.36, 6.71, 7.86.
 *               It stops at the foot of the trolls' stair.
 *   8.43 → 10.7 bar 3's run (B C# D E F# D F#): she leaps off and he follows, and they hop up the stair, a step a
 *               note, the melody climbing with them. The stair rings under them.
 *   11.24       she knocks at the door, twice (bar 4's A and F#), bouncing off it; backs off and throws her weight
 *               at it (12.35, bar 4's last A): it doesn't give, the pawl only rattles. She rolls back from it.
 *   13.47       phrase 1: he, idle, turns back to the top of the stair and nudges a pebble off it (the careful tip).
 *               It clatters down the stair, a step a note (C# D E F# D F#), and he goes down after it, a step a note
 *               and one behind, to the foot, where he leans over the drain as it drops in beside the pig's snout,
 *   15.70       into the counterweight's pan under the path (the phrase's strongest note): a spark, and the lamp in
 *               the works catches. The pan sinks; the chain runs under the stair;
 *   15.98→20.11 the door sinks into the floor a notch a note, the pawl clicking on its rack (fourteen notes). He hops
 *               back up the stair on the first clicks to the top tread; she hurries back to the door and presses at
 *               it. When its top is in reach she springs up onto it (18.47 → 19.01, click to click) and rides it
 *               down a notch a click until it is the doorstep; he hops back up onto the landing.
 *   20.11 → end she rolls in over the sunk door, he follows; at rest inside on 22.32, she a cell ahead.
 */

const E = eighth

/* ------------------------------------------------------------------ the stair and the gate */

/** A step's rise. The balls hop it with a quick hop; the pebble drops it. */
export const RISE = 0.23
/** The landing before the door: the top of the stair, level with the threshold (the exit's floor). */
export const LANDING = { x0: 18.2, x1: 20.05, top: -3.87 }
/** The five treads below it, top to bottom (T1 under the landing, T5 at the foot). */
export const TREADS = [0, 1, 2, 3, 4].map((i) => {
  const x1 = LANDING.x0 - 0.8 * i
  return { x0: x1 - 0.8, x1, top: LANDING.top + RISE * (i + 1), mid: x1 - 0.4 }
})
/** The foot stone at the bottom of the stair, the lip of the drain. */
export const LIP = { x0: 14.0, x1: 14.24, top: -2.63 }
/** The drain: a hole in the path at the stair's foot, down into the works. */
export const DRAIN = { x0: 13.36, x1: 14.0 }

/** The mouth in the cliff's foot and the door that shuts it: a slab of stone that sinks into a slot in the floor. */
export const MOUTH = { floor: -3.87, ceil: -6.07, x1: 22.9 }
export const DOOR = { x0: 20.05, x1: 20.6, travel: MOUTH.floor - MOUTH.ceil }
/** The lintel over the mouth: the cliff's rock dressed square over the door. */
export const LINTEL = { x0: 19.82, x1: 21.3, y0: -6.85, y1: MOUTH.ceil }

/**
 * The works under the path (the mountain in cross-section): a chamber under the drain where the counterweight's pan
 * hangs over its pit; the chain from the pan up over P1, east along a channel under the stair, under P2 below the
 * door's slot and up to the door's foot. The pan sinking pulls the door down.
 */
export const PULLEY_R = 0.2
export const P2: Pt = [20.15, -1.35]
export const P1: Pt = [13.95, P2[1] + 2 * PULLEY_R]
/** The chain's run along the channel: P1's top, P2's bottom. */
export const RUN_Y = P1[1] - PULLEY_R
export const CHAMBER = { x0: 12.9, x1: 14.4, y0: -1.8, y1: 0.05 }
export const PIT = { x0: 13.28, x1: 14.2, y1: 3.1 }
export const CHANNEL = { x0: 14.1, x1: 20.45, y0: RUN_Y - 0.2, y1: RUN_Y + 0.22 }
export const SLOT = { x0: DOOR.x0, x1: DOOR.x1, y0: MOUTH.floor, y1: MOUTH.floor + DOOR.travel }
/** The pan: its ring hangs from P1's west side on a rod; the dish at the rod's foot, the counterweight's block under it. */
export const PAN = { x: P1[0] - PULLEY_R, ring: -0.42, dish: -0.2, w: 0.6 }
/** The lamp in the works, hanging from the chamber's roof: lit by the pebble's spark. */
export const WORKS_LAMP: Pt = [13.16, CHAMBER.y0]

/* ------------------------------------------------------------------ the times */

export const TIMES = {
  /** The pig's heavy steps: the riders tossed and landing (the theme's first note, bar 2's two figures). */
  heavy: [E(0), E(8), E(12)],
  /** She leaps off the pig and lands on the stair's foot; then up it, a step a note. */
  womanLeap: [E(14), E(16)] as const,
  womanHops: [E(17), E(18), E(19), E(20), E(21)],
  /** He follows a note behind. */
  peerLeap: [E(15), E(17)] as const,
  peerHops: [E(18), E(19), E(20), E(21), E(22)],
  /** She knocks at the door: bar 4's downbeat. */
  knock: E(24),
  /** The second knock, and her shove at it (bar 4's F# and its last A); `knock` and these are all on the theme. */
  knocks: [E(24), E(25), E(28)] as const,
  /** He nudges the pebble off the top step: phrase 1's first note. */
  tip: E(32),
  /** The pebble on T1 … T5 and the foot stone. */
  pebble: [E(33), E(34), E(35), E(36), E(37), E(38)],
  /** Into the pan: the phrase's strongest note. */
  pan: E(40),
  /** The door's clicks: every note of bars 2–4 until it is down. */
  clicks: [41, 42, 44, 45, 46, 48, 49, 50, 51, 52, 53, 54, 55, 56].map(E),
  /** He goes down the stair after the pebble, a note behind it: T1 … T5 (the pebble's T2 … lip). */
  peerDown: [E(34), E(35), E(36), E(37), E(38)],
  /**
   * And back up it on the door's clicks: T4, T3, T2 on the first three (the held note, eighth 43, he waits on T3);
   * T1 when she lands on the door's top (the tenth click).
   */
  peerUp: [E(41), E(42), E(44), E(52)],
  /** The door is down (the last click): she goes in. */
  open: E(56),
  /** He follows. */
  follow: E(57),
}

/* ------------------------------------------------------------------ the pig */

/** Where the pig stands at rest, the foot of the stair (its middle, on the path), and when it gets there. */
export const PIG_X0 = -2.2
export const PIG_STOP = 12.8
const PIG_T1 = 7.0
const PIG_T2 = 8.3
/** Its cruising speed: it covers the flank in the time it has. */
const PIG_V = (PIG_STOP - PIG_X0) / (PIG_T1 + (PIG_T2 - PIG_T1) / 2)

/** The pig's distance along the path: steady, then easing to a stop at the stair. */
export function pigX(t: number): number {
  if (t <= PIG_T1) return PIG_X0 + PIG_V * t
  if (t >= PIG_T2) return PIG_STOP
  const d = t - PIG_T1
  const D = PIG_T2 - PIG_T1
  return PIG_X0 + PIG_V * PIG_T1 + PIG_V * (d - (d * d) / (2 * D))
}
export function pigV(t: number): number {
  if (t <= PIG_T1) return PIG_V
  if (t >= PIG_T2) return 0
  return PIG_V * (1 - (t - PIG_T1) / (PIG_T2 - PIG_T1))
}

/** The ground's slope at x (dy/dx, y down: negative climbing east), over the pig's wheelbase. */
const slopeAt = (x: number): number => (skyline(x + 0.45) - skyline(x - 0.45)) / 0.9

/** How a heavy step lifts the riders: a toss that lands exactly on the step. */
const TOSS_T = 0.34
const TOSS_H = 0.1
function toss(t: number): number {
  for (const h of TIMES.heavy) {
    const d = t - (h - TOSS_T)
    if (d > 0 && d < TOSS_T) {
      // Lifted gently by the pig's heave (no kick at the start), and down hard on the step.
      const u = d / TOSS_T
      return TOSS_H * 6.75 * u * u * (1 - u)
    }
  }
  return 0
}

/** After a heavy step the body gives under the weight and comes back, long and damped. */
function squash(t: number): number {
  let s = 0
  for (const h of TIMES.heavy) {
    const d = t - h
    if (d > 0 && d < 1.2) s += 0.035 * (d / 0.08) * Math.exp(1 - d / 0.08)
  }
  return s
}

export interface PigPose {
  /** The point on the path under the pig's middle, world cells. */
  x: number
  y: number
  /** The body's tilt (radians; negative is nose up, as p5 turns with y down). */
  a: number
  /** The gait's phase (cycles), how far the feet swing (cells) and lift. */
  phase: number
  amp: number
  lift: number
  /** The body's rise and fall (cells, + is down). */
  bob: number
  /** The head's turn about the neck (radians, + is nose down), the ears (0 flopped, 1 pricked), the eyes (0 shut). */
  head: number
  ears: number
  eyes: number
  /** Breathing, 0..1. */
  breath: number
}

export function pigPose(t: number): PigPose {
  const x = pigX(t)
  const v = pigV(t)
  const q = quarterAt(t)
  // A stride a beat: a diagonal pair of trotters comes down on every eighth, the plucked notes (a pair lands at
  // phase 0, on the beat, the other at 0.5).
  const phase = beatAt(t)
  const f = 1 / q
  const amp = v / (2 * Math.PI * f)
  const moving = v / PIG_V
  const bob = 0.018 * moving * Math.cos(phase * 4 * Math.PI) + squash(t)
  const a = Math.atan(slopeAt(x))
  // The head: nodding with the trot; a nod on each heavy step; looking up the stair as they climb; down to sniff the
  // drain as the pebble comes; flung up by the spark; drooping into a doze once they are in.
  let head = 0.03 * moving * Math.sin(phase * 4 * Math.PI + 0.6)
  for (const h of TIMES.heavy) {
    const d = t - h
    if (d > -0.1 && d < 1) head += 0.1 * Math.max(0, d + 0.1) / 0.18 * Math.exp(1 - Math.max(0, d + 0.1) / 0.18)
  }
  const lookUp = smooth(t, 8.6, 9.6) * (1 - smooth(t, 11.6, 12.8))
  const sniff = smooth(t, 14.7, 15.4) * (1 - smooth(t, TIMES.pan, TIMES.pan + 0.25))
  const since = t - TIMES.pan
  const startle = since <= 0 ? 0 : smooth(since, 0, 0.16) * Math.exp(-Math.max(0, since - 0.16) / 1.3)
  const doze = smooth(t, 19.0, 21.5)
  // Each clatter of the pebble down the stair: its ears prick and its head comes up a little toward the sound.
  let clatter = 0
  for (const c of TIMES.pebble) {
    const d = t - c
    if (d > 0 && d < 1.2) clatter = Math.max(clatter, smooth(d, 0, 0.06) * Math.exp(-d / 0.3))
  }
  head += -0.22 * lookUp + 0.5 * sniff - 0.38 * startle + 0.34 * doze - 0.07 * clatter
  const ears = Math.min(1, 0.25 + 0.5 * lookUp + 0.9 * startle - 0.25 * doze + 0.3 * sniff + 0.45 * clatter)
  const eyes = 1 - doze + 0.3 * startle
  const breath = 0.5 + 0.5 * Math.sin(t * (doze > 0.5 ? 1.6 : 2.6))
  const lift = 0.07 * moving
  return { x, y: skyline(x), a, phase, amp, lift, bob, head, ears, eyes, breath }
}

/** Where a rider sits, in the pig's own cells (x forward, y down, the ground under its middle at 0, 0). */
export const SEAT = { peer: [-0.12, -1.07] as Pt, woman: [0.27, -1.12] as Pt }

/** A point of the pig's body in the world, for a pose. */
export function pigPoint(pose: PigPose, lx: number, ly: number): Pt {
  const c = Math.cos(pose.a)
  const s = Math.sin(pose.a)
  return [pose.x + lx * c - ly * s, pose.y + lx * s + ly * c + pose.bob]
}

/** A rider's centre, world cells, riding the pig at `t` (the toss lifts both on a heavy step). */
export function riderAt(t: number, who: 'peer' | 'woman'): Pt {
  const pose = pigPose(t)
  const [sx, sy] = SEAT[who]
  const [x, y] = pigPoint(pose, sx, sy - R)
  return [x, y - toss(t)]
}

/* ------------------------------------------------------------------ the balls' ways */

/** A ball resting on a tread (or the landing) at x. */
const onTread = (i: number, x: number): Pt => [x, TREADS[i].top - R]
const onLanding = (x: number): Pt => [x, LANDING.top - R]
/** Up the stair a step a note: quick hops (a stiff gravity, so a hop in an eighth still clears the nosing). */
const G_STEP = 30

/** Where she presses at the door: against the rack's teeth down its west face. */
const PRESS_X = DOOR.x0 - 0.075 - R - 0.012
/** Where she gathers for the spring onto the door's top, and where she lands on it (its middle). */
const LEAP_X = 19.5
const DOOR_MID = (DOOR.x0 + DOOR.x1) / 2
/** She takes off on one click and lands on the top on the click after next (indices into `TIMES.clicks`). */
const LEAP = [7, 9] as const
/** The spring's gravity: a real leap, high enough to clear the door's corner as it sinks under her. */
const G_LEAP = 16
/** How long the door takes to drop a notch (`doorDrop`: it falls into each click over this, easing in). */
const NOTCH = 0.13
/** A ball riding the door's top at `t`. */
const onDoor = (t: number): Pt => [DOOR_MID, MOUTH.ceil + doorDrop(t) - R]
/** Where he watches from: the top tread, a step down from the landing. */
const WATCH_X = 17.78
/** Where his roll back to the stair stops, at the landing's edge (the pebble goes off it ahead of him). */
const TIP_EDGE = 18.3
/** Where he lands on T1 … T5 going down after the pebble (a little east of the pebble's own marks). */
const DOWN_X = [17.8, 17.0, 16.2, 15.4, 14.75]
/** Where he leans over the drain: the foot tread's west edge. */
const FOOT_EDGE = 14.42

/** Her ways from the moment she leaves the pig (show seconds; she is the pig's until then). */
export function womanWays(end: number): Way[] {
  const [t0, t1] = TIMES.womanLeap
  const w: Way[] = [{ at: t0, p: riderAt(t0, 'woman') }]
  w.push(hop(w[w.length - 1], onTread(4, TREADS[4].mid - 0.1), t1, G_EARTH))
  TIMES.womanHops.forEach((at, i) => {
    const to = i < 4 ? onTread(3 - i, TREADS[3 - i].mid) : onLanding(18.66)
    w.push(hop(w[w.length - 1], to, at, G_STEP))
  })
  // Along the landing to the door, and a knock on it, twice (bar 4's A and F#): she raps it and bounces off.
  const [k1, k2, k3] = TIMES.knocks
  w.push({ at: E(23), p: onLanding(19.5), ease: 'out' })
  w.push({ at: k1, p: onLanding(PRESS_X), ease: 'in' })
  w.push({ at: (k1 + k2) / 2, p: onLanding(PRESS_X - 0.14), ease: 'out' })
  w.push({ at: k2, p: onLanding(PRESS_X), ease: 'in' })
  // Nothing. She backs off, gathers, and throws her weight at it on the last note of the bar; she leans on it; it
  // doesn't give (the pawl rattles in its notch, and that is all). She rolls back from it, beaten.
  w.push({ at: k2 + 0.38, p: onLanding(19.42), ease: 'out' })
  w.push({ at: k3 - 0.3, p: onLanding(19.36), ease: 'inout' })
  w.push({ at: k3, p: onLanding(PRESS_X), ease: 'in' })
  w.push({ at: k3 + 0.4, p: onLanding(PRESS_X + 0.01) })
  // She rolls back from it, over to the landing's edge behind him, and watches him go down after the pebble.
  w.push({ at: E(35), p: onLanding(18.72), ease: 'inout' })
  // The spark, and the door moves: she hurries back to it and presses at it (against the rack's teeth), as if she
  // could help it down.
  const C = TIMES.clicks
  w.push({ at: TIMES.pan, p: onLanding(18.72) })
  w.push({ at: C[2], p: onLanding(PRESS_X), ease: 'inout' })
  w.push({ at: C[4], p: onLanding(PRESS_X) })
  // As its top comes down within reach she draws back, gathers, and springs up onto it on a click ...
  w.push({ at: C[5], p: onLanding(LEAP_X), ease: 'inout' })
  w.push({ at: C[LEAP[0]], p: onLanding(LEAP_X) })
  w.push(hop(w[w.length - 1], onDoor(C[LEAP[1]]), C[LEAP[1]], G_LEAP))
  // ... and rides it down, a notch a note (the pawl's clicks), until its top is the doorstep.
  for (let i = LEAP[1] + 1; i < C.length; i++) {
    w.push({ at: C[i] - NOTCH, p: onDoor(C[i] - NOTCH) })
    w.push({ at: C[i], p: onDoor(C[i]), ease: 'in' })
  }
  // In over the sunk door, and at rest a cell ahead of where he will stop.
  w.push({ at: end, p: onLanding(22.5), ease: 'inout' })
  return w
}

/** His ways from the moment he leaves the pig. */
export function peerWays(end: number): Way[] {
  const [t0, t1] = TIMES.peerLeap
  const w: Way[] = [{ at: t0, p: riderAt(t0, 'peer') }]
  w.push(hop(w[w.length - 1], onTread(4, TREADS[4].mid - 0.1), t1, G_EARTH))
  TIMES.peerHops.forEach((at, i) => {
    const to = i < 4 ? onTread(3 - i, TREADS[3 - i].mid) : onLanding(18.46)
    w.push(hop(w[w.length - 1], to, at, G_STEP))
  })
  // After her toward the door, and he watches her knock and shove at it.
  w.push({ at: 11.6, p: onLanding(18.86), ease: 'out' })
  w.push({ at: TIMES.knocks[2] + 0.15, p: onLanding(18.86) })
  // It won't open. He turns back to the top of the stair, idle, and his roll carries a pebble off its edge on the
  // phrase's first note: the careful tip. He stops at the edge as it drops ...
  w.push({ at: TIMES.pebble[0], p: onLanding(TIP_EDGE), ease: 'inout' })
  // ... and goes down the stair after it, a step a note and one behind it, the stones ringing under both of them.
  TIMES.peerDown.forEach((at, i) => w.push(hop(w[w.length - 1], onTread(i, DOWN_X[i]), at, G_STEP)))
  // At the foot he rolls on to the edge of the step and leans over the drain as the pebble drops in.
  w.push({ at: TIMES.peerDown[4] + 0.3, p: onTread(4, FOOT_EDGE), ease: 'out' })
  w.push({ at: TIMES.pan - 0.04, p: onTread(4, FOOT_EDGE - 0.03), ease: 'inout' })
  w.push({ at: TIMES.pan, p: onTread(4, FOOT_EDGE - 0.03) })
  // The spark under him, and the door's first clicks up at the top: back up the stair on the clicks (on the held
  // note between the second and third he waits a beat), to the second tread, from where he watches the door go down
  // and her press at it, edging up his step.
  const [u0, u1, u2, u3] = TIMES.peerUp
  const C = TIMES.clicks
  w.push(hop(w[w.length - 1], onTread(3, DOWN_X[3]), u0, G_STEP))
  w.push(hop(w[w.length - 1], onTread(2, DOWN_X[2]), u1, G_STEP))
  w.push({ at: E(43), p: onTread(2, DOWN_X[2] + 0.04), ease: 'out' })
  w.push(hop(w[w.length - 1], onTread(1, DOWN_X[1]), u2, G_STEP))
  w.push({ at: u2 + 0.3, p: onTread(1, DOWN_X[1] + 0.08), ease: 'out' })
  w.push({ at: C[8], p: onTread(1, DOWN_X[1] + 0.22), ease: 'inout' })
  // Up to the top tread as she lands on the door's top, and he edges forward on it to see her ride it down.
  w.push(hop(w[w.length - 1], onTread(0, WATCH_X), u3, G_STEP))
  w.push({ at: C[11], p: onTread(0, WATCH_X + 0.2), ease: 'out' })
  // When she is nearly down, up onto the landing, and in after her.
  w.push(hop(w[w.length - 1], onLanding(18.62), C[12], G_STEP))
  w.push({ at: TIMES.follow, p: onLanding(18.62) })
  w.push({ at: end, p: onLanding(21.5), ease: 'inout' })
  return w
}

/** Peer on the landing at `t` (his ways after the leap), for the pebble to meet him. */
export function peerOnLanding(t: number, end: number): Pt {
  const ways = peerWays(end)
  const t0 = ways[0].at
  const lane = { segs: route(ways), fire: 0 }
  const at = laneAt(lane, t - t0)
  return [at.x, at.y]
}

/* ------------------------------------------------------------------ the pebble */

export const PEBBLE_R = 0.06

/** Where the pebble is at rest on the top step's very edge (where his nudge on the phrase's first note meets it). */
export function pebbleRest(end: number): Pt {
  const at = peerOnLanding(TIMES.tip, end)
  return [at[0] - R - PEBBLE_R - 0.004, LANDING.top - PEBBLE_R]
}

export interface PebbleStop {
  at: number
  p: Pt
}

/** The pebble's bounces: its landing places, in order, and when. */
export function pebbleStops(end: number): PebbleStop[] {
  const [rx, ry] = pebbleRest(end)
  const on = (i: number, x: number): Pt => [x, TREADS[i].top - PEBBLE_R]
  return [
    { at: TIMES.tip, p: [rx, ry] },
    // Pushed over the edge, it teeters and drops.
    { at: TIMES.tip + 0.075, p: [Math.min(rx, LANDING.x0) - 0.03, ry + 0.01] },
    { at: TIMES.pebble[0], p: on(0, 17.97) },
    { at: TIMES.pebble[1], p: on(1, 17.13) },
    { at: TIMES.pebble[2], p: on(2, 16.3) },
    { at: TIMES.pebble[3], p: on(3, 15.46) },
    { at: TIMES.pebble[4], p: on(4, 14.62) },
    { at: TIMES.pebble[5], p: [LIP.x0 + 0.09, LIP.top - PEBBLE_R] },
    { at: TIMES.pan, p: [PAN.x - 0.19, PAN.dish - PEBBLE_R + 0.01] },
  ]
}

/** Where the pebble is at `t`, and how far it has turned. After the pan, it rides it down. */
export function pebbleAt(t: number, stops: PebbleStop[], drop: number): { p: Pt; turn: number } {
  if (t <= stops[0].at) return { p: stops[0].p, turn: 0 }
  const last = stops[stops.length - 1]
  if (t >= last.at) return { p: [last.p[0], last.p[1] + drop], turn: 9.5 }
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1]
    const b = stops[i]
    if (t > b.at) continue
    const T = b.at - a.at
    const u = (t - a.at) / T
    // The push over the edge is a slide; the rest are flights under gravity.
    const arc = i === 1 ? 0 : (G_EARTH * T * T) / 8
    const x = a.p[0] + (b.p[0] - a.p[0]) * u
    const y = a.p[1] + (b.p[1] - a.p[1]) * u - arc * 4 * u * (1 - u)
    return { p: [x, y], turn: (i - 1 + u) * 1.1 }
  }
  return { p: last.p, turn: 0 }
}

/* ------------------------------------------------------------------ the door and the works */

/** How far the door has sunk at `t` (0 shut, DOOR.travel down): a notch on each click, dropping into it. */
export function doorDrop(t: number): number {
  const step = DOOR.travel / TIMES.clicks.length
  let d = 0
  for (const c of TIMES.clicks) {
    const u = (t - (c - NOTCH)) / NOTCH
    if (u <= 0) break
    d += step * (u >= 1 ? 1 : u * u)
  }
  // The catch takes up the chain's slack.
  d += 0.02 * smooth(t, TIMES.pan, TIMES.pan + 0.2) * (1 - smooth(t, TIMES.clicks[0] - 0.13, TIMES.clicks[0]))
  return Math.min(DOOR.travel, d)
}

/** The pawl: 0 in its notch, 1 lifted as a tooth passes under it; it drops in on each click. */
export function pawlLift(t: number): number {
  for (const c of TIMES.clicks) {
    const d = t - c
    if (d > -0.13 && d < 0) return (d + 0.13) / 0.13
    if (d >= 0 && d < 0.2) return Math.exp(-d / 0.03) * 0.15
  }
  // Her knocks only rattle it in its notch (the shove harder): the door is held.
  let r = 0
  TIMES.knocks.forEach((k, i) => {
    const d = t - k
    if (d > 0 && d < 0.6) r += (i === 2 ? 0.55 : 0.3) * (d / 0.035) * Math.exp(1 - d / 0.035)
  })
  return r
}

/**
 * The door's shake under her knocks (cells east, for `drawDoor`'s `knock`): a knock nudges the slab a hair into its
 * slot and it settles back; it never gives.
 */
export function doorKnock(t: number): number {
  let x = 0
  TIMES.knocks.forEach((k, i) => {
    const d = t - k
    if (d > 0 && d < 0.6) x += (i === 2 ? 0.014 : 0.007) * (d / 0.03) * Math.exp(1 - d / 0.03)
  })
  return x
}

/** The pan's jolt when the pebble lands in it: a small dip and a long settle. */
export function panJolt(t: number): number {
  const d = t - TIMES.pan
  if (d < 0) return 0
  return 0.035 * (d / 0.05) * Math.exp(1 - d / 0.05) * (d < 2 ? 1 : 0)
}

/** The lamp in the works: dark until the spark, then it catches over a third of a second. */
export const worksLamp = (t: number): number => smooth(t, TIMES.pan + 0.05, TIMES.pan + 0.45)

/**
 * The trickle of burning oil: the lamp catching spills a drop of fire into the oil gutter under the chain, and it runs
 * east along the channel under the stair to the pulley under the door, where it lights the second lamp on the last
 * click. Where it has been, the gutter goes on burning low: the path of the machine, lit.
 */
export const FLAME = { t0: TIMES.pan + 0.42, t1: TIMES.open, x0: CHAMBER.x1 - 0.1, x1: P2[0] + 0.5 }
export const SLOT_LAMP: Pt = [P2[0] + 0.62, P2[1] - 0.3]
/** How far along the gutter the fire has run at `t` (x, world cells), or null before it starts. */
export function flameFront(t: number): number | null {
  if (t < FLAME.t0) return null
  const u = Math.min(1, (t - FLAME.t0) / (FLAME.t1 - FLAME.t0))
  // It catches slowly, then runs.
  const s = u < 0.15 ? (u * u) / 0.3 : 0.075 + (u - 0.15) * (1 - 0.075) / 0.85
  return FLAME.x0 + (FLAME.x1 - FLAME.x0) * Math.min(1, s)
}
/**
 * The lamp under the door: catches as the fire reaches it, on the last click, and with the door down (its job done)
 * burns down to embers over two seconds, so the slot and the works under it go dark before the tunnels (the lit
 * pulley and a black notch cut into its glow sat at the frame's foot through the seam).
 */
export const slotLamp = (t: number): number =>
  smooth(t, TIMES.open - 0.05, TIMES.open + 0.35) * (1 - 0.96 * smooth(t, TIMES.open + 0.5, TIMES.open + 2.5))

/** How bright a stair stone rings after something lands on it (0..1). */
export function ring(times: readonly number[], t: number): number {
  let r = 0
  for (const h of times) {
    const d = t - h
    if (d >= 0 && d < 1.2) r = Math.max(r, Math.exp(-d / 0.28))
  }
  return r
}

/**
 * Every landing on each tread, T1 (under the landing) … T5 (the foot), for the stones' ringing: the two of them
 * going up (she lands on T5 from the pig, then a step a note; he a note behind) and the pebble coming down.
 */
export const TREAD_HITS: number[][] = [0, 1, 2, 3, 4].map((i) => {
  const up = i === 4 ? [TIMES.womanLeap[1], TIMES.peerLeap[1]] : [TIMES.womanHops[3 - i], TIMES.peerHops[3 - i]]
  // His way down after the pebble and back up on the clicks (T5 is the bottom; he turns there).
  const again = [TIMES.peerDown[i], ...(i < 4 ? [TIMES.peerUp[3 - i]] : [])]
  return [...up, TIMES.pebble[i], ...again].sort((a, b) => a - b)
})
export const LANDING_HITS = [TIMES.womanHops[4], TIMES.peerHops[4], TIMES.clicks[12]]
