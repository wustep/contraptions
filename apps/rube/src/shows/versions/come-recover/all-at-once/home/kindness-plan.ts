import { clamp } from '../../../../../../../../src/core/ease'
import { FLOOR, R, type Pt } from '../../../../../parts'
import { fight, JUMPS } from '../music'
import { G, launch } from '../physics'

/**
 * The kindness, worked out once: where everything in the party corner is at any show time. The part's lane and its
 * drawing both read these, so the ball never slides off what carries it. Everything is in the room's own cells
 * (`set.ts`): the floor is y = FLOOR, a ball on it has its centre at y = 0.
 *
 * The fight's last bars (beats 123 to 144, a beat every 0.4 s):
 *
 *   123  the great hit. She has come to rest on the floor of the party corner, alone, with her new eye. Round her,
 *        still, Jobu's jumpers: a gift box, a steel trap, a mallet hung from the ceiling, an arm folded high on the wall.
 *   124  the gift box's lid bursts off and a boxing glove on a spring rears up out of it.
 *   125  it punches her. On the touch an eye lands on it, and the punch goes soft: a push that rolls her away.
 *   126  the lid comes down on the stool, and she hops the trap's near jaw. The glove, gentle now, waves.
 *   127  she drops onto the trap's pan: it twitches.
 *   128  it snaps. An eye lands on it, and the bite is a toss: the jaws squeeze her up and out, and bob.
 *   129  the mallet has pulled itself back, cocked.
 *   130  it swings. An eye lands on it, and the blow is a scoop: it lobs her up under the ceiling.
 *   132  the arm on the far wall shoots out at her, claw open.
 *   133  it grabs her. An eye lands on it, and the grab is a cradle.
 *   134-137  it bounces her, softly, like a baby, while the whole corner sways in time.
 *   141  it sets her down on the top of a stack of dumpling steamers on the party table.
 *   142, 143  she steps down, a steamer a beat,
 *   144  and lands on the table beside Waymond, and the room goes still.
 */

export const B = fight
export const BEGIN = JUMPS.eye
export const END = JUMPS.rocks
/** When Jobu's jumpers are in the room: a little before the great hit (the flickers show them). */
export const APPEAR = 189.4

/* ------------------------------------------------------------------ the layout (room cells) */

/** Where she comes to rest on the great hit: the ball's centre. */
export const E0: Pt = [27.4, 0]

/** The gift box on the floor (its middle, width, height). */
export const GIFT = { x: 26.25, w: 0.56, h: 0.5 }
/** The spring's foot, in the box's open top. */
export const SPRING_FOOT: Pt = [GIFT.x, FLOOR - GIFT.h + 0.06]
/** Where the lid lands: on the seat of the stool by the folding table (`set.ts` has one at 25.4). */
export const LID_REST: Pt = [25.42, FLOOR - 0.75 - 0.1]

/**
 * The steel jaw trap, set on the floor: its base plate, the hinge both jaws turn on, a jaw's length, and how far
 * open they are set (radians from upright).
 */
export const TRAP = { x0: 28.45, x1: 29.25, plate: 0.05, jaw: 0.46, set: 1.31 }
export const HINGE: Pt = [28.85, FLOOR - TRAP.plate - 0.01]
/** The pan between the open jaws, where she drops in: the ball's centre on it. */
export const PAN: Pt = [HINGE[0], FLOOR - TRAP.plate - 0.03 - R]
/** Where she leaves the floor to hop the near jaw. */
const HOP_FROM: Pt = [28.15, 0]

/** The mallet, hung from the ceiling: pivot, handle length (to the head's middle), head size, the angle it hits at. */
export const HAMMER = { pivot: [28.3, -4.1] as Pt, L: 2.9, headW: 0.52, headH: 0.3, contact: 0.62 }

/** The party table, its top, and the dumpling steamers stacked as three steps down to where she ends. */
export const TABLE = { x0: 30.9, x1: 34.2, top: -1.0 }
export const STEAM = { w: 0.4, h: 0.17 }
/** Each stack: its left edge and how many steamers high. Highest first, stepping down to the right. */
export const STACKS: { x0: number; n: number }[] = [
  { x0: 32.01, n: 3 },
  { x0: 32.41, n: 2 },
  { x0: 32.81, n: 1 },
]
/** Where she rolls at down the steps, cells a second: a stack's width a beat. */
const STAIR_V = STEAM.w / 0.4
/** The drop from one step to the next, and how long it takes. */
const DROP_T = Math.sqrt((2 * STEAM.h) / G)
/** Where the arm sets her down (on the top step), and where she ends (on the table, touching Waymond). */
export const SET_DOWN: Pt = [STACKS[0].x0 + STEAM.w - STAIR_V * (0.4 - DROP_T), TABLE.top - 3 * STEAM.h - R]
export const FINAL: Pt = [STACKS[2].x0 + STEAM.w + STAIR_V * DROP_T, TABLE.top - R]
/** Waymond waits on the table's end: she comes to rest touching him, and the table's edge is just past him. */
export const WAYMOND_AT: Pt = [FINAL[0] + 2 * R + 0.022, TABLE.top - R]

/** The karaoke machine on the table's near end. */
export const KARAOKE = { x0: 31.05, x1: 31.7, h: 0.45 }

/** The arm: its wall mount, links, the claw's palm (from the tongs' end to where she sits in it). */
export const ARM = { mount: [36.2, -3.75] as Pt, units: 6, link: 0.75, palm: 0.21 }


/** The office desk with the taxes, against the far wall. */
export const DESK = { x0: 36.95, x1: 38.35, top: -1.05 }

/* ------------------------------------------------------------------ the eyes, and when they land */

/** When each hostile machine is touched and given its eye. */
export const EYE_AT = { glove: B(125), trap: B(128), hammer: B(130), claw: B(133) }

/** How an eye lands: pops on with an overshoot. 0 before. */
export function eyeScale(t: number, at: number): number {
  const u = t - at
  if (u < 0) return 0
  return (1 - Math.exp(-u / 0.025)) * (1 + 0.4 * Math.exp(-u / 0.09) * Math.sin(u * 32))
}

/** The eye's pupil as it lands: thrown up the white, swinging, settling. */
export function eyeSwing(t: number, at: number): { swing: number; lift: number } {
  const u = t - at
  if (u < 0) return { swing: 0, lift: 0 }
  return { swing: 1.1 * Math.exp(-u / 0.45) * Math.sin(u * 13), lift: clamp(1.1 * Math.exp(-u / 0.12)) }
}

/* ------------------------------------------------------------------ small tools */

const lerp = (a: number, b: number, u: number) => a + (b - a) * u
const smooth01 = (u: number) => {
  const v = clamp(u)
  return v * v * (3 - 2 * v)
}

/** Cubic Hermite from (p0, v0) at t0 to (p1, v1) at t1, evaluated at t. */
function hermite(t: number, t0: number, t1: number, p0: Pt, v0: Pt, p1: Pt, v1: Pt): Pt {
  const T = t1 - t0
  const s = clamp((t - t0) / T)
  const s2 = s * s
  const s3 = s2 * s
  const h00 = 2 * s3 - 3 * s2 + 1
  const h10 = s3 - 2 * s2 + s
  const h01 = -2 * s3 + 3 * s2
  const h11 = s3 - s2
  return [
    h00 * p0[0] + h10 * T * v0[0] + h01 * p1[0] + h11 * T * v1[0],
    h00 * p0[1] + h10 * T * v0[1] + h01 * p1[1] + h11 * T * v1[1],
  ]
}

/** A parabola under G from `p` with velocity `v`, `s` seconds on. */
const ballistic = (p: Pt, v: Pt, s: number): Pt => [p[0] + v[0] * s, p[1] + v[1] * s + 0.5 * G * s * s]

/* ------------------------------------------------------------------ the mallet */

/** The head's middle at swing angle `phi` (0 straight down, + to the right). */
export function headAt(phi: number): Pt {
  const [px, py] = HAMMER.pivot
  return [px + HAMMER.L * Math.sin(phi), py + HAMMER.L * Math.cos(phi)]
}

/** Where the mallet meets her: its striking face, a ball's radius on. */
export const HIT: Pt = (() => {
  const phi = HAMMER.contact
  const [hx, hy] = headAt(phi)
  const tx = Math.cos(phi)
  const ty = -Math.sin(phi)
  const d = HAMMER.headW / 2 + R
  return [hx + tx * d, hy + ty * d]
})()

/** Where the claw catches her, falling out of the mallet's lob. */
export const CATCH: Pt = [32.62, -1.92]

/* ------------------------------------------------------------------ her way through it (room cells) */

const T125 = B(125)
const T127 = B(127)
const T128 = B(128)
const T130 = B(130)
const T133 = B(133)
const T141 = B(141)
const T144 = B(144)

const T126 = B(126)

/** The glove's push: she rolls off it, slowing, to the trap. */
const ROLL_V1 = (PAN[0] - HOP_FROM[0]) / (T127 - T126)
const ROLL_V0 = (2 * (HOP_FROM[0] - E0[0])) / (T126 - T125) - ROLL_V1
function rollToTrap(t: number): Pt {
  const s = t - T125
  const T = T126 - T125
  return [E0[0] + ROLL_V0 * s + ((ROLL_V1 - ROLL_V0) / (2 * T)) * s * s, 0]
}
/** Over the near jaw and down into the pan. */
const HOP = launch(HOP_FROM, PAN, T127 - T126)

/**
 * The snap: the jaws close on her and squeeze her up out of their top (a closing V pushes what is in it upward),
 * the near jaw leading, so she goes up and to the right. She is pressed from rest to her flight's speed over
 * SQUEEZE seconds, and flies on from there to the mallet.
 */
export const SQUEEZE = 0.05
const LOB1 = (() => {
  let v: Pt = [0, 0]
  for (let i = 0; i < 6; i++) {
    const from: Pt = [PAN[0] + (v[0] * SQUEEZE) / 2, PAN[1] + (v[1] * SQUEEZE) / 2]
    v = launch(from, HIT, T130 - T128 - SQUEEZE).out
  }
  const from: Pt = [PAN[0] + (v[0] * SQUEEZE) / 2, PAN[1] + (v[1] * SQUEEZE) / 2]
  return { from, out: v }
})()

/** The lob from the mallet to the claw. */
const LOB2 = launch(HIT, CATCH, T133 - T130)
export const LOB2_V = LOB2.out

/**
 * The cradle: after the catch the claw bounces her, three small tosses landing on 134, 136 and 137, lower each
 * time, and then carries her down in a slow swing and sets her on the top step on 141, moving on to the right. A
 * toss leaves the claw moving as the claw moves (no jolt); a landing is a jolt, on the beat.
 */
interface Toss {
  /** When it leaves and lands, where, and its velocity leaving. */
  t0: number
  t1: number
  p0: Pt
  p1: Pt
  v0: Pt
}
const ABSORB: Pt = [0, 0.35]
const TOSSES: Toss[] = (() => {
  const plan: { land: number; air: number; p0: Pt; p1: Pt }[] = [
    { land: B(134), air: 0.33, p0: [32.65, -1.87], p1: [32.5, -1.95] },
    { land: B(136), air: 0.3, p0: [32.36, -1.96], p1: [32.26, -1.98] },
    { land: B(137), air: 0.24, p0: [32.2, -1.97], p1: [32.12, -1.97] },
  ]
  return plan.map(({ land, air, p0, p1 }) => ({ t0: land - air, t1: land, p0, p1, v0: launch(p0, p1, air).out }))
})()
/** How she comes onto the top step: moving right at the stairs' pace, and a little down. */
const SET_V: Pt = [STAIR_V, 0.3]

/** The ball in the claw, B(133) to B(141): rides and tosses. */
function cradle(t: number): Pt {
  const vin = LOB2.in
  // The catch: the claw gives under her, then springs her up again.
  const catchV: Pt = [vin[0] * 0.2, vin[1] * 0.2]
  let from: Pt = CATCH
  let fromV: Pt = catchV
  let fromT = T133
  for (const toss of TOSSES) {
    if (t < toss.t0) return hermite(t, fromT, toss.t0, from, fromV, toss.p0, toss.v0)
    if (t < toss.t1) return ballistic(toss.p0, toss.v0, t - toss.t0)
    from = toss.p1
    fromV = ABSORB
    fromT = toss.t1
  }
  return hermite(t, fromT, T141, from, fromV, SET_DOWN, SET_V)
}

/** Down the steamer steps: roll, drop, land on the beat; three times. */
function stairs(t: number): Pt {
  const s = t - T141
  const k = Math.min(2, Math.floor(s / 0.4))
  const u = s - k * 0.4
  const x0 = SET_DOWN[0] + STEAM.w * k
  const y0 = TABLE.top - (3 - k) * STEAM.h - R
  const x = x0 + STAIR_V * u
  const roll = 0.4 - DROP_T
  if (u <= roll) return [x, y0]
  const f = u - roll
  return [x, Math.min(y0 + STEAM.h, y0 + 0.5 * G * f * f)]
}

/** Where she is at show time `t`, in the room's cells. */
export function ballAt(t: number): Pt {
  if (t < T125) return E0
  if (t < T126) return rollToTrap(t)
  if (t < T127) return ballistic(HOP_FROM, HOP.out, t - T126)
  if (t < T128) return PAN
  if (t < T128 + SQUEEZE) {
    const s = t - T128
    return [PAN[0] + (LOB1.out[0] * s * s) / (2 * SQUEEZE), PAN[1] + (LOB1.out[1] * s * s) / (2 * SQUEEZE)]
  }
  if (t < T130) return ballistic(LOB1.from, LOB1.out, t - T128 - SQUEEZE)
  if (t < T133) return ballistic(HIT, LOB2.out, t - T130)
  if (t < T141) return cradle(t)
  if (t < T144) return stairs(t)
  return FINAL
}

/**
 * The lane's pieces, split at every jolt (so a jolt falls between two samples, not across one): a list of
 * [from, to] show times and whether the ball is still over it.
 */
export const PIECES: { a: number; b: number; still?: boolean }[] = (() => {
  const cuts = [BEGIN, T125, T126, T127, T128, T128 + SQUEEZE, T130, T133, ...TOSSES.flatMap((x) => [x.t0, x.t1]), T141, B(142), B(143), T144, END]
  const out: { a: number; b: number; still?: boolean }[] = []
  for (let i = 1; i < cuts.length; i++) {
    const a = cuts[i - 1]
    const b = cuts[i]
    out.push({ a, b, still: (a === BEGIN && b === T125) || (a === T127 && b === T128) || a === T144 })
  }
  return out
})()

/* ------------------------------------------------------------------ the glove */

export interface GlovePose {
  /** 0 hidden in the box; else out. */
  out: boolean
  /** The spring's end (the glove's cuff), and which way the fist points (radians, 0 = right, y down). */
  end: Pt
  aim: number
  /** How squashed it is against her. */
  squash: number
}

/** Where the glove rears to, over the box, facing her. */
const REAR: Pt = [GIFT.x - 0.08, -1.02]
const REAR_AIM = 0.5
/** Where it strikes: its fist on her upper left. */
const PUNCH_AIM = Math.atan2(E0[1] - 0.06 - SPRING_FOOT[1], E0[0] - SPRING_FOOT[0])
const FIST = 0.17
const PUNCH_END: Pt = [E0[0] - (R + FIST * 2) * Math.cos(PUNCH_AIM), E0[1] - 0.05 - (R + FIST * 2) * Math.sin(PUNCH_AIM)]
/** Where it waves from: stood up over the box, fist to the sky. */
const WAVE: Pt = [GIFT.x + 0.06, -1.12]

export function gloveAt(t: number): GlovePose {
  const t124 = B(124)
  if (t < t124 - 0.02) return { out: false, end: SPRING_FOOT, aim: -Math.PI / 2, squash: 0 }
  // Bursting up and rearing back, with a wobble.
  if (t < T125 - 0.13) {
    const u = t - (t124 - 0.02)
    const k = 1 - Math.exp(-u / 0.06) * Math.cos(u * 22)
    const end: Pt = [lerp(SPRING_FOOT[0], REAR[0], k), lerp(SPRING_FOOT[1], REAR[1], k)]
    return { out: true, end, aim: lerp(-Math.PI / 2, REAR_AIM, clamp(k * 1.1)), squash: 0 }
  }
  // The punch: fast, and on the touch it goes soft, pressing her on her way.
  if (t < T125) {
    const u = (t - (T125 - 0.13)) / 0.13
    const f = u * u
    return { out: true, end: [lerp(REAR[0], PUNCH_END[0], f), lerp(REAR[1], PUNCH_END[1], f)], aim: lerp(REAR_AIM, PUNCH_AIM, f), squash: 0 }
  }
  const u = t - T125
  // Following her a little, softly, then drawing back and standing up to wave.
  const follow = 0.1 * Math.sin(Math.PI * clamp(u / 0.3))
  const lift = smooth01(u / 0.55)
  const base: Pt = [lerp(PUNCH_END[0] + follow * Math.cos(PUNCH_AIM), WAVE[0], lift), lerp(PUNCH_END[1] + follow * Math.sin(PUNCH_AIM), WAVE[1], lift)]
  // The wave: a sway either way with its ends on the beats, dying away by the last hit.
  const env = clamp((t - B(125.6)) / 0.3) * (1 - smooth01((t - B(138)) / (B(144) - B(138))))
  const sway = 0.42 * env * Math.sin((Math.PI * (t - B(125.5))) / 0.4)
  const aim = lerp(PUNCH_AIM, -Math.PI / 2, lift) + sway
  const end: Pt = [base[0] + 0.22 * Math.sin(sway), base[1] + 0.05 * Math.abs(Math.sin(sway))]
  return { out: true, end, aim, squash: 0.35 * Math.exp(-u / 0.08) }
}

/** The lid: sat on the box, then flung off on 124, tumbling onto the stool's seat on 126, rocking there. */
export function lidAt(t: number): { at: Pt; turn: number } {
  const t124 = B(124)
  const t126 = B(126)
  const on: Pt = [GIFT.x, FLOOR - GIFT.h - 0.04]
  if (t < t124) return { at: on, turn: 0 }
  if (t < t126) {
    const s = (t - t124) / (t126 - t124)
    const T = t126 - t124
    const v = launch(on, LID_REST, T).out
    const p = ballistic(on, v, s * T)
    return { at: p, turn: -Math.PI * 2 * s }
  }
  const u = t - t126
  return { at: LID_REST, turn: 0.22 * Math.exp(-u / 0.18) * Math.sin(u * 26) }
}

/* ------------------------------------------------------------------ the jaws */

/**
 * The trap's jaws at `t`: how open (radians from upright, each jaw), and how the whole closed trap sways on its
 * hinge. Set wide open; a twitch as she drops on the pan (127); the snap on 128, closing past her as she is
 * squeezed out, clapping shut, and (gentle now) bobbing to and fro on the beats, still by the last hit.
 */
export function jawsAt(t: number): { open: number; sway: number } {
  if (t < T127) return { open: TRAP.set, sway: 0 }
  if (t < T128) {
    const u = t - T127
    return { open: TRAP.set - 0.06 * Math.exp(-u / 0.05) * Math.sin(u * 60), sway: 0 }
  }
  const u = t - T128
  const SNAP = 0.085
  if (u < SNAP) {
    const f = u / SNAP
    return { open: TRAP.set * (1 - f * Math.sqrt(f)), sway: 0 }
  }
  const w = u - SNAP
  const open = 0.22 * Math.exp(-w / 0.12) * Math.abs(Math.sin(w * 16))
  // The bob: ends on the beats, from 129.
  const env = smooth01(w / 0.3) * Math.exp(-(t - B(129)) / 2.2) * (1 - smooth01((t - B(140)) / (B(144) - B(140))))
  const sway = 0.3 * Math.min(1, env) * Math.sin((Math.PI * (t - B(128.5))) / 0.4)
  return { open, sway }
}

/* ------------------------------------------------------------------ the mallet's swing */

export function swingAt(t: number): number {
  const t129 = B(129)
  const cock = -1.0
  if (t < t129 - 0.42) return 0
  // Hauled back, stopping hard at the top on 129.
  if (t < t129) {
    const s = (t - (t129 - 0.42)) / 0.42
    return cock * (s * s * (3 - 2 * s) * 0.2 + 0.8 * s * s)
  }
  const u = t - t129
  if (u < 0.12) return cock + 0.04 * Math.sin((u / 0.12) * Math.PI) * Math.exp(-u / 0.05)
  // The swing: accelerating down through the bottom to the touch on 130.
  if (t < T130) {
    const s = (t - (t129 + 0.12)) / (T130 - (t129 + 0.12))
    return lerp(cock, HAMMER.contact, s * s * (1.6 - 0.6 * s))
  }
  // On the touch it goes soft: carries on up gently, and sways, its ends on the beats, dying to still by 144.
  const w = t - T130
  const reach = 0.3
  if (w < 0.4) return HAMMER.contact + reach * Math.sin((Math.PI / 2) * (w / 0.4))
  const k = Math.floor((w - 0.4) / 0.4)
  const peak = (n: number) => (HAMMER.contact + reach) * Math.pow(-0.45, n) * (1 - smooth01((T130 + 0.4 + 0.4 * n - B(140)) / (B(144) - B(140))))
  const a = peak(k)
  const b = peak(k + 1)
  const f = (w - 0.4 - 0.4 * k) / 0.4
  return lerp(a, b, (1 - Math.cos(Math.PI * f)) / 2)
}

/* ------------------------------------------------------------------ the lanterns */

/** The paper lanterns hung from the ceiling over the table's far end: where each hangs from, its cord, its size. */
export const LANTERNS: { x: number; cord: number; size: number }[] = [
  { x: 33.3, cord: 0.5, size: 0.85 },
  { x: 34.6, cord: 0.42, size: 0.8 },
]

/** A lantern's swing (radians about its ceiling hook): a slow drift in the room's air; the arm's rush past stirs them. */
export function lanternSway(i: number, t: number): number {
  const idle = 0.02 * Math.sin(t * 1.3 + i * 2.1)
  const u = t - B(132) - 0.1 * i
  if (u < 0) return idle
  return idle + (0.12 - 0.04 * i) * Math.exp(-u / 1.4) * Math.sin(u * 3.6)
}

/* ------------------------------------------------------------------ the arm */

export interface ArmPose {
  /** Where the claw's cup is (where she sits in it). */
  cup: Pt
  /** 0 shut, 1 wide open. */
  open: number
  /** Whether she is in it (so its front finger goes over her). */
  holding: boolean
}

const FOLD = 0.62
const T132 = B(132)
const FOLDED: Pt = [ARM.mount[0] - FOLD - ARM.palm, ARM.mount[1] + 0.05]
/** The claw waits for her where she will fall into it, a little up and to the left of where it catches her. */
const WAIT: Pt = [CATCH[0], CATCH[1] - 0.02]

/** The claw's cup while she is in the air over it: under her, following. */
function cupUnder(t: number): Pt {
  for (const toss of TOSSES) {
    if (t >= toss.t0 && t < toss.t1) return hermite(t, toss.t0, toss.t1, toss.p0, [toss.v0[0] * 0.35, toss.v0[1] * 0.35], toss.p1, ABSORB)
  }
  return ballAt(t)
}

export function armAt(t: number): ArmPose {
  if (t < T132 - 0.13) {
    // Folded on its mount, twitching now and then like a thing waiting.
    const twitch = t > APPEAR ? 0.015 * Math.max(0, Math.sin(t * 5.3)) ** 8 : 0
    return { cup: [FOLDED[0] - twitch, FOLDED[1]], open: 0, holding: false }
  }
  if (t < T132) {
    const s = (t - (T132 - 0.13)) / 0.13
    const f = s * s
    return { cup: [lerp(FOLDED[0], WAIT[0], f), lerp(FOLDED[1], WAIT[1], f)], open: 0.3 + 0.7 * f, holding: false }
  }
  if (t < T133) {
    // Shot out: it overshoots and rings, then waits, open, tracking her down.
    const u = t - T132
    const ring = 0.12 * Math.exp(-u / 0.09) * Math.sin(u * 30)
    return { cup: [WAIT[0] - ring, WAIT[1] + 0.02 * smooth01(u / 0.4)], open: 1 + 0.15 * Math.exp(-u / 0.1), holding: false }
  }
  if (t < T141) return { cup: cupUnder(t), open: 0.08 + 0.1 * Math.exp(-(t - T133) / 0.12), holding: true }
  // Let go on 141, lift away, and fold back up to the wall.
  const u = t - T141
  const lift = smooth01(u / 1.1)
  const from: Pt = [SET_DOWN[0] + 0.05, SET_DOWN[1] - 0.12]
  const cup: Pt = [lerp(from[0], FOLDED[0], lift), lerp(from[1], FOLDED[1], lift) - 0.18 * Math.sin(Math.PI * lift)]
  if (u < 0.12) return { cup: [lerp(SET_DOWN[0], from[0], u / 0.12), lerp(SET_DOWN[1], from[1], u / 0.12)], open: 0.1 + 0.6 * (u / 0.12), holding: false }
  return { cup, open: 0.7 * (1 - lift), holding: false }
}

/* ------------------------------------------------------------------ Waymond */

/** Waymond on the table's end: a flinch when the arm shoots out, back when he sees it is gentle; nudged on 144. */
export function waymondAt(t: number): Pt {
  const flinch = 0.07 * (smooth01((t - (T132 - 0.05)) / 0.25) - smooth01((t - (T133 + 0.25)) / 0.5))
  const u = t - T144
  const nudge = u > 0 ? 0.035 * (1 - Math.exp(-u / 0.04)) * Math.exp(-u / 0.22) : 0
  return [WAYMOND_AT[0] + flinch + nudge, WAYMOND_AT[1]]
}
