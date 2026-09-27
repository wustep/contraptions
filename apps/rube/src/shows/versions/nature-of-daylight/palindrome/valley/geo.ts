import { R, type Pt } from '../../../../../parts'
import { smooth } from '../kit'
import { ARRIVAL, RELEASE, SEAM } from '../music'
import { shellDown, SHELL_UP } from '../shell-path'

/**
 * Montana's geometry and the clock of everything in it that moves on its own (the VALLEY builder's). World cells, y
 * down; a ball resting on the meadow has its centre at y = 0 (the grass is at y = R). Every moving thing here is a
 * function of show time, so the set, the parts' drawings and the lanes all read the same numbers.
 */

/* ------------------------------------------------------------------ the land */

/** The meadow's surface: a ball on it has its centre at y = 0. */
export const MEADOW = R

/* ------------------------------------------------------------------ the shell */

/** The shell: its height, the line it hangs on, how far its belly clears the meadow at rest, how far it travels. */
export const SHELL_H = 72
export const SHELL_X = 0
export const GAP = 4.5
export const TRAVEL = 60
/** Its centre when it hangs at its height. */
export const REST_CY = MEADOW - GAP - SHELL_H / 2
/** The belly's lowest point at rest. */
export const BELLY = MEADOW - GAP

/**
 * The slot, as `drawShell` cuts it: `0.035 h` wide, `0.045 h` tall when open, its foot `0.035 h` above the belly. The
 * valley draws the throat below it (from its foot down through the belly) so the lift can rise into it.
 */
export const SLOT_W = 0.035 * SHELL_H
export const SLOT_TALL = 0.045 * SHELL_H
export const SLOT_FOOT = BELLY - 0.035 * SHELL_H

/**
 * The shell over the valley at show time `t`: its centre and height, and how much of it has gone to vapour (none: it
 * goes by paling as a whole into the cloud, `shellSeen`). It comes down out of the cloud over SHELL_DOWN and goes back
 * up over SHELL_UP on the same path, backwards: everything here is a function of `shellDown`.
 */
export function shellAt(t: number): { c: Pt; h: number; vapour: number } {
  const d = shellDown(t)
  return { c: [SHELL_X, REST_CY - (1 - d) * TRAVEL], h: SHELL_H, vapour: 0 }
}

/** How much of the shell is still to be seen as it rises into the cloud (or came out of it): it pales as a whole. */
export function shellSeen(t: number): number {
  // Coming down it is whole: the cloud veil in front of its crown hides what is still up in it. Going up, it pales
  // into the cloud as a whole, and is gone as the high violins stop.
  if (t < 200) return 1
  return 1 - smooth(t, RELEASE - 3.4, RELEASE)
}

/* ------------------------------------------------------------------ the cloud */

/** The cloud deck: clear under CLOUD_LOW, thickening up to all but solid at CLOUD_HIGH (the television's picture). */
export const CLOUD_LOW = -44
export const CLOUD_HIGH = -98

/* ------------------------------------------------------------------ the music it keeps */

/** The arrival (102.110 → 129.556). */
export const A = {
  /** The double bass: the valley opens on the shell. */
  bass: ARRIVAL,
  /** The helicopter tops the ridge on the bass's first hard note. */
  crest: 104.861,
  /** The shell comes to rest: the fog it pushed down rolls out from under it along the meadow. */
  settle: 106.742,
  /** The helicopter flares over the pad: nose up, its wash on the grass. */
  flare: 108.716,
  /** Out of the door of the hovering helicopter, she drops onto the meadow. */
  touch: 110.655,
  /** The helicopter climbs away. */
  out: 111.624,
  /** Out of the decon tent's far door in her suit, its flap flung back. */
  suited: 112.536,
  /** The ramp swings up behind her and latches: the gate shut, the pump kicks, the first surge. */
  go: 114.364,
  /** The second surge: the deck up under the belly. */
  surge2: 118.027,
  /** A crack of light at the slot. */
  crack: 120.796,
  /** The slot opens. */
  open: 121.754,
  /** The third surge: up into the slot. */
  surge3: 125.643,
  /** The deck at the top of its travel. */
  top: 128.551,
  end: SEAM.contact,
} as const

/** The going (311.293 → 334.031). */
export const G = {
  /** The slot shuts: its light goes out on her. */
  shut: SEAM.going,
  /** She rolls onto the pedal: the valve opens and the deck starts down. */
  pedal: 312.221,
  /** The deck drops a step at a time, the pawls catching on the beats; the last is the deck on its base. */
  drop1: 313.086,
  drop2: 314.015,
  down: 314.926,
  /** The cloud heaves round the shell as it pushes up into it, twice, rolling out along the deck's underside. */
  heave1: 315.971,
  heave2: 316.865,
  /** The shell's wake sweeps the meadow as it goes into the cloud. */
  wake: 317.748,
  /** Gone, as the high violins stop. */
  gone: RELEASE,
  /** Daylight: the cloud opens where it was. */
  sun: 322.606,
  /** The light reaches her; she goes to him. */
  lit: 326.258,
  /** They touch. */
  touch: 330.17,
  end: SEAM.home,
} as const

/* ------------------------------------------------------------------ the camp */

/**
 * The camp's tents: where, how wide, how tall (to the ridge). The first is the decon tent, between the pad and the lift,
 * with a door at either end: Ian comes out of it in his suit, and she goes in one end and comes out the other in hers.
 */
export const TENTS = [
  { x: 4.35, w: 2.6, h: 1.6 },
  { x: -12.2, w: 3.4, h: 1.95 },
  { x: -16.4, w: 2.5, h: 1.6 },
  { x: 25.6, w: 3.4, h: 1.9 },
  { x: 29.9, w: 2.4, h: 1.5 },
]

/* ------------------------------------------------------------------ the lift */

/** The lift: its base (a skid on the meadow), the deck's half-width, its thickness, and where its top rests. */
export const LIFT = {
  x: SHELL_X,
  half: 1.1,
  thick: 0.12,
  baseHalf: 1.45,
  baseTop: MEADOW - 0.12,
  /** The deck's top at rest, and at the top of its travel (the slot's foot). */
  rest: MEADOW - 0.4,
  top: SLOT_FOOT,
  /** The ramps: their length, hinged at the deck's ends; standing, they are its end gates. */
  ramp: 0.86,
  /** How high the rail along the deck stands. */
  rail: 0.6,
  /** Stages of the scissor. */
  stages: 6,
}
/** When each rolls off the ramp onto the deck (it dips a little under them). */
export const IAN_ON = 110.95
export const HER_ON = 113.45
/** The deck's top after the first and second surges (the second leaves the gates' tops just under the belly). */
const L1 = LIFT.rest - 1.35
const L2 = BELLY + LIFT.ramp + 0.08

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
/** A surge: kicked on `t0`, easing to a stop at `t0 + dur` with a little overshoot, then bobbing to rest. */
function surge(t: number, t0: number, dur: number, from: number, to: number): number {
  if (t <= t0) return from
  const u = (t - t0) / dur
  if (u < 1) {
    // A hard start, a long ease to the stop: the pump's kick, the ram's end.
    const e = 1 - Math.pow(1 - u, 2.6)
    return from + (to - from) * (e + 0.05 * Math.sin(Math.PI * u) * u)
  }
  const s = t - (t0 + dur)
  return to + (to - from) * 0.035 * Math.exp(-s / 0.45) * Math.sin(s * 9)
}
/** A drop: let go on `t0`, falling faster until the pawl catches it on `t1` with a clack and a bounce. */
function drop(t: number, t0: number, t1: number, from: number, to: number): number {
  if (t <= t0) return from
  if (t < t1) {
    const u = (t - t0) / (t1 - t0)
    return from + (to - from) * u * u
  }
  const s = t - t1
  return to - Math.abs(to - from) * 0.05 * Math.exp(-s / 0.18) * Math.sin(s * 22)
}

/** The deck's top (world y) at show time `t`: up on the arrival's chords, down on the going's beats. */
export function deckAt(t: number): number {
  if (t < A.go) {
    // Down: a dip under Ian as he rolls on, and under her.
    const dip = (at: number) => (t > at ? 0.03 * Math.exp(-(t - at) / 0.25) * Math.sin((t - at) * 14) : 0)
    return LIFT.rest + dip(IAN_ON) + dip(HER_ON)
  }
  if (t < A.surge2) return surge(t, A.go, 2.2, LIFT.rest, L1)
  if (t < A.surge3) return surge(t, A.surge2, 2.3, L1, L2)
  if (t < G.pedal) return surge(t, A.surge3, A.top - A.surge3, L2, LIFT.top)
  if (t < G.drop1) return drop(t, G.pedal, G.drop1, LIFT.top, L2)
  if (t < G.drop2) return drop(t, G.drop1, G.drop2, L2, L1)
  return drop(t, G.drop2, G.down, L1, LIFT.rest)
}

/**
 * The ramps (radians from the deck's plane: 0 flat out, negative down to the meadow, π/2 standing as a gate). Each
 * lies on the meadow until its rider is off it, then springs up and latches; at the end each falls back open.
 */
const lying = (t: number) => -Math.asin(Math.max(0, Math.min(1, (MEADOW - deckAt(t)) / LIFT.ramp)))
const RAMP_DOWN = -Math.asin((MEADOW - LIFT.rest) / LIFT.ramp)
export function rampAt(t: number, side: 'her' | 'ian'): number {
  // Both come aboard up the ramp at the deck's right end; the one at its left end stands as a gate until the end.
  const up = side === 'her' ? A.go : -Infinity
  // Once up, the gates stay up: the deck comes down with them standing.
  const fall = Infinity
  const swing = 0.5
  const gate = Math.PI / 2
  // Lying on the meadow, its foot on the grass (it follows the deck's little dips).
  if (t < up - swing) return lying(t)
  if (t < up) {
    const u = (t - (up - swing)) / swing
    return RAMP_DOWN + (gate - RAMP_DOWN) * u * u
  }
  if (t < fall - 0.62) {
    const s = t - up
    return s > 30 ? gate : gate - 0.12 * Math.exp(-s / 0.12) * Math.abs(Math.sin(s * 20))
  }
  if (t < fall) {
    const u = (t - (fall - 0.62)) / 0.62
    return gate + (RAMP_DOWN - gate) * u * u
  }
  const s = t - fall
  return RAMP_DOWN + 0.16 * Math.exp(-s / 0.1) * Math.abs(Math.sin(s * 24))
}
/** Where a ramp's hinge is: the deck's end, on its top. */
export function hingeAt(t: number, side: 'her' | 'ian'): Pt {
  return [LIFT.x + (side === 'her' ? LIFT.half : -LIFT.half), deckAt(t)]
}
/** The unit along a ramp from its hinge (away from the deck), and the normal out of its top face. */
export function rampFrame(t: number, side: 'her' | 'ian'): { u: Pt; n: Pt } {
  const a = rampAt(t, side)
  const dir = side === 'her' ? 1 : -1
  const u: Pt = [dir * Math.cos(a), -Math.sin(a)]
  const n: Pt = dir > 0 ? [u[1], -u[0]] : [-u[1], u[0]]
  return { u, n }
}
/** A point `s` along a ramp from its hinge, lifted `lift` off its top face (the ball's centre, when lift = R). */
export function rampPoint(t: number, side: 'her' | 'ian', s: number, lift = R): Pt {
  const [hx, hy] = hingeAt(t, side)
  const { u, n } = rampFrame(t, side)
  return [hx + u[0] * s + n[0] * lift, hy + u[1] * s + n[1] * lift]
}

/* ------------------------------------------------------------------ the slot */

/**
 * How open the slot is, and how much light comes down it from inside, at `t`. It is dark in there: the light is a
 * paleness high up the throat, strongest as it opens, and all but gone once they are up inside it.
 */
export function slotAt(t: number): { open: number; light: number } {
  if (t < A.crack - 0.05) return { open: 0, light: 0 }
  if (t < A.open) {
    // A crack of light at its seam: the doors part a finger's width.
    const s = t - A.crack
    const u = smooth(s, -0.05, 0.12)
    return { open: 0.1 * u, light: 0.55 * u + 0.35 * Math.exp(-Math.max(0, s) / 0.25) * u }
  }
  if (t < G.shut) {
    const s = t - A.open
    const open = 0.1 + 0.9 * (1 - Math.pow(1 - clamp01(s / 1.1), 3))
    // A flare as it opens, then the steady light; fading as they go up into it, to the dark inside.
    const flare = 0.4 * Math.exp(-s / 0.6)
    // The morning after, it has been open all night: its light pale in the grey.
    if (t > 250) return { open: 1, light: 0.75 }
    const inside = 1 - 0.8 * smooth(t, A.surge3 + 0.8, A.end - 0.3)
    return { open, light: (0.9 + flare) * inside }
  }
  const s = t - G.shut
  const u = clamp01(s / 1.2)
  return { open: 1 - u * u * (3 - 2 * u), light: 0.75 * (1 - smooth(s, 0, 1.1)) }
}

/* ------------------------------------------------------------------ the pedal (the going) */

/** The pedal that lets the deck down: a plate hinged at its far end (x1), its near end (x0) raised; she rolls onto it. */
export const PEDAL = { x0: 3.0, x1: 3.5, rise: 0.17 }
/** How far down the pedal is (0 up, 1 pressed flat): pressed on the push, held while the deck comes down, back up after. */
export function pedalAt(t: number): number {
  if (t < G.pedal - 0.2) return 0
  if (t < G.pedal) return smooth(t, G.pedal - 0.2, G.pedal)
  const back = G.down + 0.95
  if (t < back) return 1 - 0.1 * Math.exp(-(t - G.pedal) / 0.1) * Math.abs(Math.sin((t - G.pedal) * 25))
  return 1 - smooth(t, back, back + 0.25) + 0.12 * (t > back + 0.25 ? Math.exp(-(t - back - 0.25) / 0.15) * Math.sin((t - back - 0.25) * 20) : 0)
}

/* ------------------------------------------------------------------ the daylight */

/**
 * Where the cloud breaks: low along the valley's left wall, off to one side of where the shell went. The sun comes in
 * low through it and rakes across the valley.
 */
export const SUN_BREAK: Pt = [-52, -44]
/** Where she watches the shell go from: the light's edge, sweeping along the floor, reaches her there on the chord. */
export const WATCH_X = 11
/** Where the light first lies on the floor as the cloud breaks. */
const EDGE_FROM = -34

/**
 * How far the daylight has come: `glow`, the edge of the cloud along the ridge brightening in the hush; `sun` 0..1, on
 * at once as the cloud breaks; `edge`, how far along the valley floor from the left the light has swept (a cloud's
 * shadow racing off), reaching her on the chord after (G.lit) and going on past her.
 */
export function daylight(t: number): { glow: number; sun: number; edge: number } {
  if (t < G.gone) return { glow: 0, sun: 0, edge: -Infinity }
  const glow = smooth(t, G.gone + 1.2, G.sun + 0.2)
  const sun = smooth(t, G.sun - 0.05, G.sun + 0.6)
  const rate = (WATCH_X - EDGE_FROM) / (G.lit - G.sun)
  const s = Math.max(0, t - G.sun)
  // A little slow to start (the light has to find the floor), then racing along it; slower once past her.
  const lag = 0.4 * (1 - Math.exp(-s / 0.4)) - 0.4 * (1 - Math.exp(-(G.lit - G.sun) / 0.4)) * smooth(s, 0, G.lit - G.sun)
  const edge = t < G.sun ? -Infinity : EDGE_FROM + rate * (Math.min(s, G.lit - G.sun) - lag) + rate * 0.55 * Math.max(0, s - (G.lit - G.sun))
  return { glow, sun, edge }
}

export { SHELL_UP }
