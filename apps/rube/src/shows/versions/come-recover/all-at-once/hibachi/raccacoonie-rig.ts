import { clamp, easeInOutSine, easeInQuad, easeOutCubic, easeOutQuad } from '../../../../../../../../src/core/ease'
import { R, type Pt } from '../../../../../parts'
import { JUMPS } from '../music'
import { G, throwFor } from '../physics'
import { SEAMS } from '../seams'

/**
 * Raccacoonie's kitchen, as numbers: when everything happens (show seconds, the measured onsets) and where the rig
 * stands (the part's own cells, the entry cell's centre at 0,0, y down). The lane and the drawing both read these,
 * so the ball never slides off what carries it.
 *
 * The rig is a chef made of kitchen steel: a post behind the griddle, a crossbar for shoulders, and on top the tall
 * toque with Raccacoonie inside it. From under the hat the raccoon works two levers: the left arm is a trip hammer
 * with a cleaver on a hanging rod; the right arm is one long spatula, pivoted at the shoulder, whose blade lies on
 * the griddle. Right of the spatula a serving spoon rests across a steel block with a shrimp tail in its bowl, and
 * beyond it stands the onion volcano.
 */

/* ------------------------------------------------------------------ the clock */

export const IN = JUMPS.hibachi
export const OUT = JUMPS.surf
/** The cleaver, on the first run: two chops as she flies in, then five. */
export const CHOPS = [106.951, 107.056, 107.81, 107.938, 108.042, 108.251, 108.484]
/** She lands on the spatula's blade, and hops once on it. */
export const LAND = 107.392
export const HOP = 107.81
/** The flick into the volcano, and the drop into its top ring. */
export const LOB = 110.051
export const CORKED = 110.957
/** She rattles in the top ring like a lid on a boil. */
export const RATTLES = [111.502, 111.723, 111.827, 112.164, 112.385, 112.594]
/** The onion volcano goes up; the column flares twice. */
export const ERUPT = 112.71
export const FLARES = [113.139, 113.464]
/** She comes down on the spoon's handle and the shrimp tail goes up, over, into the hat's pocket. */
export const SPOON = 113.685
/** The breath: the raccoon peeks out, eats the tail, and ducks; the hat drops back on the last onset before the run. */
export const DUCK = 117.597
/** The last run: an egg lobbed from under the hat, cracked on the spatula's tip, and fried. */
export const EGG_TOSS = 118.027
export const EGG_READY = 118.352
export const CRACK = 118.677
export const SPLAT = 118.782
/** Tossed on the spatula, three bounces dying away, and the flip. */
export const TOSSES = [119.223, 119.769, 120.094, 120.314]
export const WIND = 120.755
export const FLIP = OUT

/** Every visible strike, in show seconds. */
export const STRIKES = [
  ...CHOPS.slice(0, 2),
  LAND,
  ...CHOPS.slice(2),
  109.041,
  LOB,
  CORKED,
  ...RATTLES,
  ERUPT,
  ...FLARES,
  SPOON,
  DUCK,
  EGG_TOSS,
  EGG_READY,
  CRACK,
  SPLAT,
  ...TOSSES,
  WIND,
  FLIP,
].sort((a, b) => a - b)

/* ------------------------------------------------------------------ helpers */

const D = Math.PI / 180

/** `q` turned about `c` by `a` radians, counter-clockwise as seen (y is down). */
export function turn(q: Pt, c: Pt, a: number): Pt {
  const dx = q[0] - c[0]
  const dy = q[1] - c[1]
  const co = Math.cos(a)
  const si = Math.sin(a)
  return [c[0] + dx * co + dy * si, c[1] - dx * si + dy * co]
}

const lerp = (a: number, b: number, u: number) => a + (b - a) * u
const span = (t: number, a: number, b: number) => clamp((t - a) / (b - a))

/* ------------------------------------------------------------------ the rig's geometry */

/** Where the flight in comes down: the spatula's blade is laid so its face is exactly there on the landing. */
const entry = throwFor({ at: 0, p: [-0.5, 0] }, SEAMS.hibachi.v, LAND - IN)
export const LAND_AT: Pt = entry.p
/** The spatula's blade: its thickness and length. */
export const BLADE_T = 0.048
export const BLADE_L = 0.74
/** The griddle's face. */
export const TOP = LAND_AT[1] + R + BLADE_T
/** The chef: its post, its shoulders (the crossbar) and the two pivots. */
export const HX = -1.8
export const SH = TOP - 1.3
export const PR: Pt = [HX + 0.5, SH]
export const PL: Pt = [HX - 0.5, SH]
/** Where the spatula's handle meets its blade (at rest, the handle at 45 degrees from the shoulder). */
export const NECK: Pt = [PR[0] + (TOP - BLADE_T / 2 - SH), TOP - BLADE_T / 2]
/** The handle's half thickness. */
export const HANDLE = 0.028

/** The ball's centre on the blade, `s` along it from the neck, with the spatula turned up by `tilt`. */
export const onBlade = (s: number, tilt: number): Pt => turn([NECK[0] + s, TOP - BLADE_T - R], PR, tilt)
/** A point of the spatula (given at rest) with the spatula turned up by `tilt`. */
export const spatula = (q: Pt, tilt: number): Pt => turn(q, PR, tilt)

/** How far along the blade the ball sits in the crook, against the handle. */
export const CROOK = (() => {
  const hx = PR[0] - NECK[0]
  const hy = PR[1] - NECK[1]
  const n = Math.hypot(hx, hy)
  const c = BLADE_T / 2 + R
  return (R + HANDLE + 0.004 - c * Math.abs(hx / n)) / Math.abs(hy / n)
})()
/** Where she lands on the blade, and where the hop leaves her. */
export const S_LAND = LAND_AT[0] - NECK[0]
const S_HOP = S_LAND + 0.13
const S_REST = S_HOP + 0.035

/**
 * The volcano: its axis, and its onion rings from the bottom up. Each ring is drawn a little from above, so its face
 * and (on the top one) its hole show: `RING_W` is a ring's full width, `RING_H` its side, `RING_Q` how far its face is
 * foreshortened, `TUBE` how thick the onion is. Each smaller ring rests on the face of the one under it.
 */
export const VX = 2.8
export const RING_W = [1.14, 1.0, 0.87, 0.75, 0.63, 0.5, 0.38]
export const RING_H = 0.078
export const RING_Q = 0.26
export const TUBE = 0.075
/** The centre of ring `i`'s face, above the griddle. */
export const ringFace = (i: number): number => (RING_W[0] / 2) * RING_Q + (i + 1) * RING_H
export const STACK = ringFace(RING_W.length - 1)
/** The top ring's hole, and where the ball sits in it: a cork. */
export const HOLE = RING_W[RING_W.length - 1] - 2 * TUBE
export const CORK: Pt = [VX, TOP - STACK - Math.sqrt(Math.max(0.0016, R * R - (HOLE / 2) * (HOLE / 2)))]

/** The serving spoon on its block: the pivot, its length, and how far it tips each way. */
export const FX = 1.47
export const FH = 0.18
export const SPOON_L = 0.86
export const SPOON_T = 0.03
export const SPOON_TIP = Math.asin((FH - 0.02) / (SPOON_L / 2))
export const FULCRUM: Pt = [FX, TOP - FH]

/* ------------------------------------------------------------------ the spatula's motion */

export interface Throw {
  /** The spatula's tilt at the release, how fast it is turning, and when its swing starts. */
  tilt: number
  omega: number
  start: number
  /** The ball at the release, and its velocity. */
  from: Pt
  v: Pt
}

/** The spatula is raised a little while it holds her, before the flick. */
/** The spatula lifted to aim: she rolls back down the blade into the crook. Then a dip, and the flick from there. */
const AIM_TILT = 6 * D
const DIP_TILT = 2 * D
const EGG_TILT = 9 * D
/** After the tosses it lifts her once more, and slaps the griddle on WIND before the flip. */
const LIFT_TILT = 5 * D
/** Where she rests on the blade for the flick into the volcano, and for the flip: the crook. */
export const S_LOB = CROOK
export const S_FLIP = CROOK

/**
 * The flick into the volcano: the tilt at which a ball turned with the blade leaves it on the parabola that drops it
 * into the top ring at CORKED. Worked back and forth a few times, since where it leaves moves with the tilt.
 */
export function lobThrow(): Throw {
  const T = CORKED - LOB
  const r0 = onBlade(S_LOB, 0)
  const a0 = Math.atan2(r0[1] - PR[1], r0[0] - PR[0])
  let tilt = 10 * D
  let from = onBlade(S_LOB, tilt)
  let v: Pt = [0, 0]
  for (let i = 0; i < 30; i++) {
    from = onBlade(S_LOB, tilt)
    v = [(CORK[0] - from[0]) / T, (CORK[1] - from[1]) / T - 0.5 * G * T]
    tilt = a0 - Math.atan2(v[0], -v[1])
  }
  const omega = Math.hypot(v[0], v[1]) / Math.hypot(from[0] - PR[0], from[1] - PR[1])
  return { tilt, omega, start: LOB - (2 * (tilt - DIP_TILT)) / omega, from, v }
}

/** The flip at the jump: the ball in the crook leaves at exactly the surf's velocity. */
export function flipThrow(): Throw & { pow: number } {
  const v = SEAMS.surf.v
  const r0 = onBlade(S_FLIP, 0)
  const a0 = Math.atan2(r0[1] - PR[1], r0[0] - PR[0])
  const tilt = a0 - Math.atan2(v[0], -v[1])
  const from = onBlade(S_FLIP, tilt)
  const omega = Math.hypot(v[0], v[1]) / Math.hypot(from[0] - PR[0], from[1] - PR[1])
  // A whip up off the slap, gathering speed to the release: tilt·u^pow, so its turning speed at the end is
  // pow·tilt/duration.
  const pow = (omega * (FLIP - WIND)) / tilt
  return { tilt, omega, start: WIND, from, v, pow }
}

const LOBT = lobThrow()
const FLIPT = flipThrow()

/** A value let go at (x0, v0) that settles to nothing, critically damped at rate w. */
const settle = (x0: number, v0: number, w: number, tau: number) => (x0 + (v0 + w * x0) * tau) * Math.exp(-w * tau)

/** She rolls back into the crook and knocks against the handle on this (soft) onset. */
export const TOCK = 109.041
const AIM_AT = 108.3
const DIP_AT = 109.55

/** The spatula's tilt at show time `t`: up is positive. */
export function tilt(t: number): number {
  // Waiting flat for her; then lifted to aim, rolling her back into the crook; a little dip; the flick.
  if (t < AIM_AT) return 0
  if (t < DIP_AT) return AIM_TILT * easeInOutSine(span(t, AIM_AT, AIM_AT + 0.55))
  if (t < LOBT.start) return lerp(AIM_TILT, DIP_TILT, easeInOutSine(span(t, DIP_AT, LOBT.start)))
  if (t < LOB) return DIP_TILT + (LOBT.tilt - DIP_TILT) * Math.pow(span(t, LOBT.start, LOB), 2)
  // It carries on past, stops, and comes back down flat.
  if (t < EGG_READY) return settle(LOBT.tilt, LOBT.omega, 11, t - LOB)
  // Up to meet the egg; knocked flat by it (the tip claps the griddle on the splat).
  if (t < CRACK) return EGG_TILT * easeOutCubic(span(t, EGG_READY, EGG_READY + 0.26))
  if (t < SPLAT) return EGG_TILT * (1 - easeInQuad(span(t, CRACK, SPLAT)))
  // A small tap under her on each toss.
  if (t < TOSSES[3]) {
    let a = 0
    for (const s of TOSSES.slice(0, 3)) {
      const u = t - s
      if (u > -0.05 && u < 0.14) a += 2.2 * D * Math.sin((Math.PI * (u + 0.05)) / 0.19)
    }
    return Math.max(0, a)
  }
  // Lifted, slapped down on the griddle, and whipped up: the flip.
  const top = WIND - 0.14
  if (t < top) return LIFT_TILT * easeInOutSine(span(t, TOSSES[3] + 0.06, top))
  if (t < WIND) return LIFT_TILT * (1 - easeInQuad(span(t, top, WIND)))
  if (t < FLIP) return FLIPT.tilt * Math.pow(span(t, WIND, FLIP), FLIPT.pow)
  return settle(FLIPT.tilt, FLIPT.omega * 0.5, 7, t - FLIP)
}

/** Her place along the blade the first time: the hop's landing, a short slide, and the roll back into the crook. */
function firstRide(t: number): number {
  if (t < HOP) return S_LAND + (S_HOP - S_LAND) * span(t, LAND, HOP)
  if (t < AIM_AT) return S_HOP + (S_REST - S_HOP) * easeOutQuad(span(t, HOP, HOP + 0.3))
  if (t < TOCK) return S_REST + (CROOK - S_REST) * easeInQuad(span(t, AIM_AT, TOCK))
  const u = span(t, TOCK, TOCK + 0.2)
  return CROOK + 0.03 * Math.sin(Math.PI * u) * (1 - u)
}

/* ------------------------------------------------------------------ the spoon */

/** When she rides the spoon's handle down, and when it stops (the tail leaves). */
export const SPOON_DOWN = SPOON + 0.045
/** She is off it by here, and it tips back to rest, slowly, bowl down. */
const SPOON_BACK = 114.05

/** The spoon's tilt: positive has the bowl (its right end) down. */
export function spoonTilt(t: number): number {
  if (t < SPOON) return SPOON_TIP
  if (t < SPOON_DOWN) return SPOON_TIP - 2 * SPOON_TIP * easeInQuad(span(t, SPOON, SPOON_DOWN))
  if (t < SPOON_BACK) return -SPOON_TIP
  return -SPOON_TIP + 2 * SPOON_TIP * easeInOutSine(span(t, SPOON_BACK, SPOON_BACK + 1.1))
}

/** A point along the spoon, `u` from its pivot (negative is the handle), lifted `up` off its top face. */
export function spoonPoint(u: number, up: number, tip: number): Pt {
  const d: Pt = [Math.cos(tip), Math.sin(tip)]
  const n: Pt = [Math.sin(tip), -Math.cos(tip)]
  return [FULCRUM[0] + d[0] * u + n[0] * (up + SPOON_T / 2), FULCRUM[1] + d[1] * u + n[1] * (up + SPOON_T / 2)]
}

/** Where she lands on the spoon: near the end of its handle. */
export const SPOON_HANDLE = -SPOON_L / 2 + 0.07

/* ------------------------------------------------------------------ her path, as functions of show time */

/** From the spoon back along the griddle and the blade to the crook, slowing to rest there. */
export const ROLL_END = 115.35
function rollHome(t: number): Pt {
  const from = spoonPoint(SPOON_HANDLE, R, -SPOON_TIP)
  const to = onBlade(CROOK, 0)
  const u = easeOutQuad(span(t, SPOON_DOWN, ROLL_END))
  const x = lerp(from[0], to[0], u)
  // Off the spoon's end onto the griddle, then up the blade's edge, by the heights of what she rolls on.
  const tipX = NECK[0] + BLADE_L
  const onSteel = clamp((tipX + 0.06 - x) / 0.1)
  const offSpoon = clamp((from[0] + 0.02 - x) / 0.14)
  const y = lerp(from[1], TOP - R, offSpoon) - BLADE_T * (onSteel * onSteel * (3 - 2 * onSteel))
  return [x, y]
}

/** Where the ball is at show time `t` while it rides something, phase by phase. */
export const ride = {
  /** On the blade after the hop, slid to rest, raised, and flicked. */
  first: (t: number): Pt => onBlade(firstRide(t), tilt(t)),
  /** Down with the spoon's handle. */
  spoon: (t: number): Pt => spoonPoint(SPOON_HANDLE, R, spoonTilt(t)),
  /** Home along the griddle and the blade. */
  home: rollHome,
  /** In the crook, turned with the spatula. */
  crook: (t: number): Pt => onBlade(CROOK, tilt(t)),
}
/** Where the hop leaves her on the blade. */
export const HOP_AT: Pt = onBlade(S_HOP, 0)

export const THROWS = { lob: LOBT, flip: FLIPT }

/* ------------------------------------------------------------------ the shrimp tail and the egg */

/** The tail's flight from the spoon's bowl to the hat's pocket. */
export const TAIL_FLY = 0.95
export const TAIL_IN = SPOON_DOWN + TAIL_FLY
/** The egg's flight from the raccoon's paw to the spatula's tip. */
export const EGG_R: Pt = [0.085, 0.11]
