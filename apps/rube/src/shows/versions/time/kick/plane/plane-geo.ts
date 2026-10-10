import { R, type Pt } from '../../../../../parts'
import { bar, beat, half, onset, SEAM } from '../music'

/**
 * The plane's clock and its fixed places (the PLANE builder's). One place in the plane's own world, drawn in its own
 * cells: a 747's first-class cabin seen in cross-section, looking aft from the nose (the seats face us), the wings and
 * engines behind it, the nose gear under it; and, to its right, the jet bridge and the arrivals hall it docks to.
 *
 * Cobb's seat is at (0, 0): a ball resting on its cushion (the cushion's top at y R). Both parts are laid so that their
 * entry is that seat (PLANE_AT = WAKE_AT = [0.5, 0]), and everything here is in the world's cells.
 */

/* ------------------------------------------------------------------ the slots */

/** The cut in, on the pulse; the blink out, going under; the cut in, awake, on the release; the veil out, home. */
export const BOARD = SEAM.plane
export const UNDER = SEAM.rain
export const WAKE = SEAM.wake
export const HOME = SEAM.home

/* ------------------------------------------------------------------ boarding: the drip, the plunger */

/** He presses the case's plunger on bar 17. */
export const PLUNGE = bar(17)
/**
 * The drip counts the pulse: a drop lands on every beat of the two bars (from the cut), and from the plunger on every
 * eighth. Each time is when the drop lands in the chamber's pool (and a bead of the compound starts down the lines).
 */
export const DRIPS: number[] = [...[64, 65, 66, 67, 68, 69, 70, 71].map(beat), ...[68, 69, 70, 71].map(half)].sort((a, b) => a - b)
/** How long a drop takes to fall from the nozzle to the pool. */
export const DROP_FALL = 0.14
/**
 * The plunger stands up out of the case on the floor, just under him: he gathers himself (a little up off the cushion
 * from the beat before), then leans his weight down onto it, gathering speed, stopped dead by its stop on the beat; he
 * holds it down a moment and settles back.
 */
export const LEAN0 = beat(67) + 0.05
export const GATHER = 0.05
export const PRESS0 = PLUNGE - 0.36
export const PRESS = 0.13
export const BACK0 = PLUNGE + 0.32
export const BACK1 = BACK0 + 1.3
/** His reading lamp goes out as his eyes close, the last of it on bar 18 as the director's blink shuts over the cut. */
export const LAMP_OUT: [number, number] = [beat(71) - 0.35, UNDER]

/* ------------------------------------------------------------------ waking */

/** The gasp: up off the cushion at 2.4 c/s (the seam's speed), slowing to a stop, then settling softly back. */
export const GASP_UP = 0.28
export const GASP_T = GASP_UP / 1.2
export const SETTLE = 1.1
/** Ariadne's own start, on the piano's note half a beat after his. */
export const ARIADNE_WAKES = onset(214.21, 1.0)
/** The case: its lines let go of their wrists and reel home (on the piano's next note); its chamber sinks; Ariadne shuts its lid on bar 57. */
export const LET_GO = onset(215.15, 1.0)
export const LID = bar(57)
/** Fischer stirs, dazed; on bar 58 he puts up his own shade and the sun comes in on him. */
export const STIR = onset(219.34, 0.8)
export const SHADE = bar(58)
/** The team's sleeper wakes. */
export const TEAM_WAKES = half(229)
/** The approach: the nose gear locks down on bar 59; the wheels touch on bar 60. */
export const GEAR = bar(59)
export const GEAR_T = 1.1
export const TOUCH = bar(60)
/** At the gate: the jet bridge docks; the door lifts on bar 61; he gets down out of his seat. */
export const DOCK = beat(243)
export const DOOR = bar(61)
export const OUT = beat(245)
/** The hall's door at the jet bridge's end opens on bar 62; the stamp on bar 63; clear, he rolls on; the glass doors part. */
export const INSIDE = bar(62)
export const STAMP = bar(63)
export const CLEAR = beat(253)
export const GLASS = beat(254)

/* ------------------------------------------------------------------ the cabin */

/** The fuselage's section: a circle (its lining inside `rIn`, its skin out to `rOut`), the floor, the ceiling. */
export const CAB = { cx: 1.0, cy: -0.6, rIn: 2.3, rOut: 2.55, floor: 0.55, beam: 0.74, ceil: -2.45, bin: -1.55 }
/** Where each sleeper sits (a ball's centre, at y 0): Ariadne on his left, the case between; across the aisle one of the team, and Fischer by the window. */
export const SEAT = { ariadne: -0.62, cobb: 0, team: 1.98, fischer: 2.6 }
export const CASE_X = -0.31
/**
 * The silver case, open on the floor in front of the two of them: its body, its lid up behind, the drip's glass
 * chamber standing in the lid between them, and the plunger's T-handle rising out of its right end, just under Cobb.
 */
export const CASE = { x0: CASE_X - 0.36, x1: CASE_X + 0.3, top: 0.3, bottom: 0.55, lid: 0.36, chamber: [-0.06, 0.28] as [number, number], plungeX: -0.02, handle: 0.15 }
/** A ball on the cabin floor (or the bridge's, or the hall's: one level all the way). */
export const ON_FLOOR = CAB.floor - R
/** The inside of the fuselage's lining at height y (its left and right). */
export const wallAt = (y: number, r = CAB.rIn): [number, number] => {
  const d = Math.sqrt(Math.max(0, r * r - (y - CAB.cy) ** 2))
  return [CAB.cx - d, CAB.cx + d]
}
/** The windows: one each side, at a seated head's height. */
export const WIN = { y0: -0.66, y1: -0.1 }
/** The door, in the right wall, from the floor up. */
export const DOOR_TOP = -1.8

/* ------------------------------------------------------------------ outside: the airframe, the ground */

/** The runway (and the apron at the gate): where the wheels stand. */
export const GROUND = 4.4
/** The engines: inboard and outboard, each side (their nacelles' centres from the fuselage's middle). */
export const ENGINES = [6.2, 11.6]
export const NACELLE = 0.95
/** The wing: its top at a distance d out from the fuselage's middle (dihedral: it rises going out). */
export const wingY = (d: number): number => 1.5 - 0.11 * Math.max(0, Math.abs(d) - 2.2)

/* ------------------------------------------------------------------ the arrivals hall */

/**
 * The terminal: its airside wall at `air` (where the jet bridge meets it, and the door into the hall), the booth where
 * he stops at `stop`, the booth itself, and the glass wall onto the morning at `land`.
 */
export const TERM = { air: 10.0, stop: 11.2, booth0: 11.36, booth1: 12.3, ledge: 0.12, land: 13.25, ceil: -2.35, roof: -2.95, foot: 0.14 }
/** The jet bridge: its cab's front when docked (against the hull), and where it grows out of the terminal. */
export const BRIDGE = { front: 3.3, base: TERM.air, ceil: -1.95 }

/* ------------------------------------------------------------------ easing */

export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v))
/** 0 until a, 1 from b, smooth (cosine) between. */
export const sm = (t: number, a: number, b: number): number => {
  const u = clamp01((t - a) / (b - a))
  return 0.5 - 0.5 * Math.cos(Math.PI * u)
}
export const lerp = (a: number, b: number, u: number): number => a + (b - a) * u

/* ------------------------------------------------------------------ the descent */

/**
 * How far the world outside has risen past the plane (cells): nothing at cruise; from 222.5 the plane goes down through
 * the cloud deck (quickly) and the ground comes up under it, slower and slower as it flares, the wheels meeting it on
 * bar 60 at about half a cell a second.
 */
const D0 = 222.35
const D1 = 223.15
const D2 = 225.2
const VMAX = 9
const V_TOUCH = 0.55
const TAU = (TOUCH - D2) / Math.log(VMAX / V_TOUCH)
const vSink = (t: number): number => {
  if (t <= D0 || t >= TOUCH) return 0
  if (t < D1) return VMAX * sm(t, D0, D1)
  if (t < D2) return VMAX
  return VMAX * Math.exp(-(t - D2) / TAU)
}
const SINK_DT = 1 / 400
const SINK_TABLE: number[] = (() => {
  const out = [0]
  let s = 0
  for (let t = D0; t < TOUCH + SINK_DT; t += SINK_DT) {
    s += 0.5 * (vSink(t) + vSink(t + SINK_DT)) * SINK_DT
    out.push(s)
  }
  return out
})()
export const sinkAt = (t: number): number => {
  if (t <= D0) return 0
  const i = (Math.min(t, TOUCH) - D0) / SINK_DT
  const j = Math.floor(i)
  const f = i - j
  return SINK_TABLE[Math.min(j, SINK_TABLE.length - 1)] * (1 - f) + SINK_TABLE[Math.min(j + 1, SINK_TABLE.length - 1)] * f
}
export const SINK_TD = sinkAt(TOUCH)
/** The ground's top (only drawn in the morning, once it has come up into sight). */
export const groundAt = (t: number): number => (t < 150 ? Infinity : GROUND + SINK_TD - sinkAt(t))
/** The cloud deck's top (it lies just under the belly at cruise, and goes up past the plane as it descends). */
export const CLOUD_TOP = 1.15
export const CLOUD_DEPTH = 5.5
export const cloudAt = (t: number): number => CLOUD_TOP - sinkAt(t)

/* ------------------------------------------------------------------ the gear and the cabin's jolts */

/** How far the gear is down: 0 stowed, 1 locked (swinging down over the second before bar 59). */
export const gearDown = (t: number): number => (t < 150 ? 0 : sm(t, GEAR - GEAR_T, GEAR) ** 1.4)

/**
 * The cabin's jolts, y down: a small clunk as the gear locks, and the touchdown: the whole plane settles on its struts
 * (sharp on the beat, the recovery long and damped).
 */
export function jolt(t: number): number {
  let dy = 0
  const g = t - GEAR
  if (g >= 0 && g < 2) dy += 0.03 * Math.exp(-g / 0.28) * Math.sin(g * 13)
  const u = t - TOUCH
  if (u >= 0 && u < 4) dy += 0.2 * Math.exp(-u / 0.55) * Math.sin(u * 7) + 0.025 * Math.exp(-u / 0.9) * Math.sin(u * 23)
  return dy
}

/** The wings' flex (y down) at `d` out from the fuselage's middle: they dip as the wheels take the weight, and bounce. */
export function flexAt(t: number, d: number): number {
  const u = t - TOUCH
  if (u < 0 || u > 5) return 0
  const out = Math.max(0, Math.abs(d) - 2.2) / 20
  return 0.55 * out * Math.exp(-u / 0.8) * Math.sin(u * 5.2 + 0.25)
}

/* ------------------------------------------------------------------ Cobb */

/** His roll out: from rest on the floor after he gets down, up to pace, on, and to a stop at the booth. */
const RUN_UP = 1.0
const RUN_DOWN = 1.4
/** When he gets to the booth: a beat before the stamp. */
export const AT_BOOTH = STAMP - 0.88
const RUN_T = AT_BOOTH - OUT
const RUN_V = (TERM.stop - 0) / (RUN_T - RUN_UP / 2 - RUN_DOWN / 2)
/** The drop from his seat to the floor. */
export const DROP_T = Math.sqrt((2 * ON_FLOOR) / 12)
/** On from the booth, gathering to the seam's pace (1.0 c/s) as he comes to the doors. */
const GO_UP = 0.8
const GO_V = 1.0

/** Where he is along his roll out, and how fast, `u` seconds after he lands on the floor. */
function runX(u: number): number {
  if (u <= 0) return 0
  if (u < RUN_UP) return (RUN_V * u * u) / (2 * RUN_UP)
  const a = (RUN_V * RUN_UP) / 2
  if (u < RUN_T - RUN_DOWN) return a + RUN_V * (u - RUN_UP)
  const b = a + RUN_V * (RUN_T - RUN_DOWN - RUN_UP)
  const w = Math.min(u, RUN_T) - (RUN_T - RUN_DOWN)
  return b + RUN_V * w - (RUN_V * w * w) / (2 * RUN_DOWN)
}
function goX(u: number): number {
  if (u <= 0) return 0
  if (u < GO_UP) return (GO_V * u * u) / (2 * GO_UP)
  return (GO_V * GO_UP) / 2 + GO_V * (u - GO_UP)
}

/** A small turn of the head, rolled: he looks about him after the gasp (x only). */
function looks(t: number): number {
  return -0.05 * (sm(t, 215.1, 216.2) - sm(t, 217.9, 218.9)) + 0.06 * (sm(t, 218.9, 219.9) - sm(t, 222.3, 223.6))
}

/** Cobb, in the world's cells, at show time `t` (both slots). */
export function cobbAt(t: number): Pt {
  if (t < 150) {
    // Boarding: at rest; he gathers himself, leans his weight down on the plunger (stopped dead by its stop on the
    // beat), holds it down a moment, and settles back into the cushion.
    let y = 0
    if (t >= LEAN0 && t < PRESS0) y = -GATHER * sm(t, LEAN0, PRESS0)
    else if (t >= PRESS0 && t < PLUNGE) {
      const u = (t - PRESS0) / (PLUNGE - PRESS0)
      y = lerp(-GATHER, PRESS, u * u)
    } else if (t >= PLUNGE && t < BACK0) y = PRESS
    else if (t >= BACK0) y = PRESS * (1 - sm(t, BACK0, BACK1))
    return [0, y]
  }
  const u = t - WAKE
  if (t < OUT - DROP_T) {
    let y = 0
    if (u < GASP_T) y = -(2.4 * u - (1.2 / GASP_T) * u * u)
    else if (u < GASP_T + SETTLE) y = -GASP_UP * (1 - sm(u, GASP_T, GASP_T + SETTLE))
    return [looks(t), y + jolt(t)]
  }
  if (t < OUT) {
    const d = t - (OUT - DROP_T)
    return [0, 6 * d * d]
  }
  if (t < CLEAR) return [runX(t - OUT), ON_FLOOR]
  return [TERM.stop + goX(t - CLEAR), ON_FLOOR]
}

/** Where he leaves the plane's world at the veil (the waking part's exit, less half a cell, in the world's cells). */
export const LEAVE: Pt = cobbAt(HOME)

/* ------------------------------------------------------------------ Ariadne and Fischer */

const TAU2 = Math.PI * 2
/** An angle eased from a to b the short way round. */
const turnTo = (a: number, b: number, u: number): number => {
  let d = (((b - a) % TAU2) + TAU2 * 1.5) % TAU2 - Math.PI
  return a + d * u
}

/** Ariadne: where she is (world cells) and where her eyes are (the mark's angle). */
export function ariadneAt(t: number): { x: number; y: number; spin: number } {
  const x0 = SEAT.ariadne
  if (t < 150) {
    // Awake beside him, watching him; her eyes close as the drip takes her.
    const spin = turnTo(0.15, 1.35, sm(t, beat(69), UNDER - 0.25))
    return { x: x0, y: 0, spin }
  }
  // She wakes with him (a smaller start), looks to him; shuts the case on bar 57; turns to the sun when it comes in;
  // her eyes go with him when he leaves.
  const u = t - ARIADNE_WAKES
  let y = 0
  if (u > 0 && u < 0.18) y = -0.12 * Math.sin((u / 0.18) * Math.PI * 0.5)
  else if (u >= 0.18) y = -0.12 * (1 - sm(u, 0.18, 1.1))
  // To the case: gathering, the lid coming down under her on the beat; back again.
  const LEAN_A = 0.1
  const lean = t < LID ? LEAN_A * clamp01((t - (LID - 0.55)) / 0.55) ** 2 : LEAN_A * (1 - sm(t, LID + 0.15, LID + 1.1))
  let spin = turnTo(1.35, 0.05, sm(t, ARIADNE_WAKES, ARIADNE_WAKES + 1.1))
  spin = turnTo(spin, 0.55, sm(t, LID - 0.8, LID - 0.3))
  spin = turnTo(spin, 0.05, sm(t, LID + 0.4, LID + 1.2))
  spin = turnTo(spin, -0.2, sm(t, SHADE + 0.2, SHADE + 1.4))
  if (t > OUT - 0.6) {
    const c = cobbAt(t)
    const look = Math.atan2(c[1] - 0, c[0] - x0)
    spin = turnTo(spin, look, sm(t, OUT - 0.6, OUT + 0.3))
  }
  // Her goodbye, as he rolls away up the aisle: a little hop toward him on the next beat, and back into her seat, her
  // eyes still on him (only her eyes went with him, and from the first wide she seemed simply left behind).
  const BYE = beat(246)
  const b = (t - BYE) / 0.55
  let hop = 0
  let lean2 = 0
  if (b > 0 && b < 1) {
    hop = -0.34 * Math.sin(b * Math.PI)
    lean2 = 0.14 * Math.sin(b * Math.PI)
  }
  return { x: x0 + lean + lean2, y: y + 0.5 * lean + hop + jolt(t), spin }
}

/** Fischer: asleep until he stirs; he puts up his shade on bar 58 and turns into the light; he watches Cobb go by. */
export function fischerAt(t: number): { x: number; y: number; spin: number } {
  const x0 = SEAT.fischer
  const asleep = 1.45
  if (t < 150) return { x: x0, y: 0, spin: asleep }
  const s = t - STIR
  let y = 0
  if (s > 0 && s < 0.25) y = -0.07 * Math.sin((s / 0.25) * Math.PI * 0.5)
  else if (s >= 0.25) y = -0.07 * (1 - sm(s, 0.25, 1.0))
  // To the window: gathering, the shade goes on the beat; he stays there in the light a moment, and settles back.
  const reach = 0.2
  let x = x0
  let lift = 0
  if (t >= SHADE - 0.8 && t < SHADE) {
    const u = ((t - (SHADE - 0.8)) / 0.8) ** 2
    x = x0 + reach * u
    lift = 0.06 * u
  } else if (t >= SHADE) {
    const back = 1 - sm(t, SHADE + 0.45, SHADE + 1.9)
    x = x0 + reach * back
    lift = 0.06 * back
  }
  y -= lift
  // His eyes: shut; open, dazed, wandering; to the window; into the light, and there they stay.
  let spin = asleep
  spin = turnTo(spin, -0.9, sm(t, STIR, STIR + 0.6))
  spin = turnTo(spin, 2.2, sm(t, STIR + 0.6, STIR + 1.3))
  spin = turnTo(spin, 0.2, sm(t, STIR + 1.3, SHADE - 0.5))
  spin = turnTo(spin, -0.4, sm(t, SHADE - 0.1, SHADE + 0.6))
  // Cobb goes by below him, out of the door: his eyes follow him, a moment, and go back to the window.
  if (t > OUT) {
    const c = cobbAt(t)
    const look = Math.atan2(c[1] - y, c[0] - x)
    const w = sm(t, OUT + 0.9, OUT + 1.5) * (1 - sm(t, OUT + 2.6, OUT + 3.4))
    spin = turnTo(spin, look, w)
  }
  return { x, y: y + jolt(t), spin }
}

/** The team's sleeper across the aisle: his head's tilt (0 upright), asleep until he wakes. */
export const teamNod = (t: number): number => (t < 150 ? 1 : 1 - sm(t, TEAM_WAKES, TEAM_WAKES + 1.2))
