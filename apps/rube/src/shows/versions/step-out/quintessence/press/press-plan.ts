import type { Pt, Seg } from '../../../../../parts'
import { R } from '../../../../../parts'
import { carried, route, type Way } from '../kit'
import { at, BEATS, SEAM } from '../music'
import { G, dropTime, throwFor } from '../physics'

/**
 * Life's numbers and clocks (the PRESS builder's). Everything is in the part's own cells: Walter comes in at
 * (-0.5, 0) on the conference table, y down, and every moving thing is a pure function of show time, so the lane and
 * the drawing read the same motion.
 *
 * Left to right: the conference table upstairs (Ted at its far end), the iron stair down into the press hall, the
 * start treadle, the paper reel, three printing units on one straight web (red, the white rule, the grey photograph),
 * the former and the folder, the stacker, the strapper, the roller conveyor out through the strip curtain of the
 * loading door, and the pavement.
 */

/* ------------------------------------------------------------------ the clock */

export const T0 = SEAM.press
export const T1 = SEAM.street
const b = (bar: number, pos = 1): number => at(bar, pos)

/** Every beat from bar.pos to bar.pos, inclusive. */
export function beatsFrom(a: [number, number], z: [number, number]): number[] {
  const t0 = b(a[0], a[1])
  const t1 = b(z[0], z[1])
  return BEATS.filter((x) => x.t >= t0 - 1e-9 && x.t <= t1 + 1e-9).map((x) => x.t)
}
/** How hard the beat at `t` is struck in the recording, 0.15..1.6: what a knock leans on. */
export function strength(t: number): number {
  let best = BEATS[0]
  for (const x of BEATS) if (Math.abs(x.t - t) < Math.abs(best.t - t)) best = x
  return Math.max(0.15, Math.min(1.6, best.s))
}

/** The negative lands on the table, on the peak's first downbeat; Ted starts back from it. */
export const LAID = b(110, 1)
export const RECOIL = b(110, 3)
/** Walter sets off along the table; off its end; down the stair a step a beat; onto the treadle. */
export const SETOFF = b(111, 1)
export const FLOOR_HIT = b(112, 1)
export const STEPS = beatsFrom([112, 2], [113, 4])
export const TREADLE = b(114, 1)
export const FLING = b(114, 2)
export const ON_WEB = b(114, 4)
/** He leaves the former's nose, and lands on the stack. */
export const ON_STACK = b(120, 4)
const NOSE_FLIGHT = 0.3
export const OFF_NOSE = ON_STACK - NOSE_FLIGHT
/** The bundle: the joggers square it, the strap goes round, the crimp, and the shove onto the conveyor. */
export const JOG = [b(126, 1), b(126, 2)]
export const STRAP_UP = b(126, 3)
export const STRAP_OVER = b(126, 4)
export const CINCH = b(127, 1)
export const CRIMP = b(127, 2)
export const SHOVE = b(127, 3)
export const RIDE = b(128, 1)
/** Through the strip curtain; off the bundle's front onto the pavement; the curtain's strips slap back. */
export const CURTAIN = b(128, 3)
export const PAVEMENT = b(130, 1)
export const SLAPS = [b(129, 2), b(129, 3)]

/** When each unit starts, the folder, the stacker's ram; when the stack is full, and the ram again for the next. */
export const UNIT_START = [b(114, 2), b(115, 1), b(116, 1)]
export const CUT_START = b(117, 1)
export const RAM_START = b(117, 2)
export const RAM_PAUSE = b(126, 1)
export const RAM_AGAIN = b(127, 4)
export const PRESS_END = b(130, 4)

/* ------------------------------------------------------------------ the ground */

/** The conference table: its top (a ball on it has its centre at y 0), its ends. */
export const TABLE = { x0: -3.25, x1: 1.0, top: R, h: 1.25 }
/** The conference floor, the mezzanine over the hall. */
export const UP = TABLE.top + TABLE.h
/** The press hall's floor, and the pavement outside: a ball on it has its centre at y 4. */
export const FLOOR = 4 + R
/** The iron stair down from the mezzanine: seven risers, the last onto the floor. */
export const STAIR = { x0: 2.4, run: 0.55, n: 7, rise: (FLOOR - UP) / 7 }
export const treadY = (k: number): number => UP + STAIR.rise * k
/** The negative, laid flat on the table beside him; Ted at the table's far end. */
export const NEG = { x: 0.08, w: 0.46 }
export const TED = { x: -2.62 }
/** The start treadle on the hall floor: its pad (left) end, its pivot; the pad's top raised and pressed. */
export const TREAD = { pad: 6.9, pivot: 7.55, end: 7.85, up: 3.74, down: FLOOR - 0.13 }
/** The paper reel on its stand, and the roller the web turns over from the reel's side onto the line. */
export const REEL = { c: [8.42, 3.3] as Pt, r: 0.8 }
export const G0 = { c: [REEL.c[0] + REEL.r + 0.17, 2.17] as Pt, r: 0.17 }
/** The web's top: one straight line through the three units. */
export const WEB_Y = 2.0
export const WEB_T = 0.09
/** The three units, each an impression cylinder under the web and a plate cylinder over it that lifts to let him by. */
export const UNITS = [11.1, 13.2, 15.3]
export const IMP_R = 0.42
export const PLATE_R = 0.34
export const LIFT = 0.52
/** Over this roller the web turns down the former's board. */
export const G4 = { c: [17.2, WEB_Y + 0.17] as Pt, r: 0.17 }
export const BOARD = 0.62
/** The stacker's deck, the strapper's and the conveyor's: one height. */
export const DECK = 3.88
export const COPY = 0.04
export const STACK_W = 1.02
/** Where he lands on the web, off the treadle. */
export const WEB_LAND = 9.95

/* ------------------------------------------------------------------ the stack */

/** The ram's shoves: each pushes one copy in under the stack, which rises one copy's thickness. */
export const RAMS: number[] = [...beatsFrom([117, 2], [125, 4])]
export const RAMS_NEXT: number[] = beatsFrom([127, 4], [130, 4])
/** The cutter's cuts: each a copy, which falls to the ram's tray and is shoved on the next beat. */
export const CUTS: number[] = [...beatsFrom([117, 1], [125, 3]), ...beatsFrom([127, 3], [130, 3])]
const easeStep = (u: number): number => (u <= 0 ? 0 : u >= 1 ? 1 : 1 - Math.pow(1 - u, 3))
const SHOVE_DUR = 0.08
/** How many copies the stack has at `t` (fractional through a shove). */
export function copiesAt(t: number, list = RAMS): number {
  let n = 0
  for (const r of list) n += easeStep((t - r) / SHOVE_DUR)
  return n
}
/** The stack's top surface at `t`, while it is still on the stacker. */
export const stackTop = (t: number): number => DECK - copiesAt(t) * COPY
export const FULL = RAMS.length

/* ------------------------------------------------------------------ the web and the nose */

/** The web's speed: solved so he reaches the nose on time and the flight from it lands on the stack. */
function solveWeb(): { v: number; Lb: number; nose: Pt; arc0: Pt; land: Pt; vel: Pt } {
  const y0 = WEB_Y - R
  const rr = G4.r + R
  const arcLen = rr * BOARD
  const arc0: Pt = [G4.c[0] + rr * Math.sin(BOARD), G4.c[1] - rr * Math.cos(BOARD)]
  const dir: Pt = [Math.cos(BOARD), Math.sin(BOARD)]
  const landY = stackTop(ON_STACK) - R
  let v = 0.9
  let Lb = 1
  for (let i = 0; i < 60; i++) {
    const vy = v * dir[1]
    // Where the nose has to be for the flight to come down on the stack's top.
    const noseY = landY - vy * NOSE_FLIGHT - 0.5 * G * NOSE_FLIGHT * NOSE_FLIGHT
    Lb = (noseY - arc0[1]) / dir[1]
    const len = G4.c[0] - WEB_LAND + arcLen + Lb
    v = len / (OFF_NOSE - ON_WEB)
  }
  const nose: Pt = [arc0[0] + dir[0] * Lb, arc0[1] + dir[1] * Lb]
  const vel: Pt = [v * dir[0], v * dir[1]]
  const land: Pt = [nose[0] + vel[0] * NOSE_FLIGHT, nose[1] + vel[1] * NOSE_FLIGHT + 0.5 * G * NOSE_FLIGHT * NOSE_FLIGHT]
  void y0
  return { v, Lb, nose, arc0, land, vel }
}
export const WEB = solveWeb()
/** The web's speed, cells a second: the paper's, and the cylinders' surfaces'. */
export const V_WEB = WEB.v

/** Walter on the web, from ON_WEB to OFF_NOSE: along the line, round the turning roller, down the board. */
export function onWeb(t: number): Pt {
  const s = Math.max(0, (t - ON_WEB) * V_WEB)
  const y0 = WEB_Y - R
  const flat = G4.c[0] - WEB_LAND
  if (s <= flat) return [WEB_LAND + s, y0]
  const rr = G4.r + R
  const arcLen = rr * BOARD
  if (s <= flat + arcLen) {
    const a = (s - flat) / rr
    return [G4.c[0] + rr * Math.sin(a), G4.c[1] - rr * Math.cos(a)]
  }
  const d = s - flat - arcLen
  return [WEB.arc0[0] + Math.cos(BOARD) * d, WEB.arc0[1] + Math.sin(BOARD) * d]
}
/** When he is over x on the web's straight run. */
export const passAt = (x: number): number => ON_WEB + (x - WEB_LAND) / V_WEB

/** The nose of the former, on the web's top (his centre is R off it). */
export const NOSE: Pt = [WEB.nose[0] - Math.sin(BOARD) * R, WEB.nose[1] + Math.cos(BOARD) * R]
/** The former's board: from where the web leaves the turning roller to the nose, on the web's top. */
export const BOARD_TOP: Pt = [G4.c[0] + G4.r * Math.sin(BOARD), G4.c[1] - G4.r * Math.cos(BOARD)]

/* ------------------------------------------------------------------ the units */

/** Each unit's lift: the beat it rises on to let him by, and the beat it drops back on. */
export const LIFTS: [number, number][] = UNITS.map((x) => {
  const near = PLATE_R + R + 0.12
  const tIn = passAt(x - near)
  const tOut = passAt(x + near)
  const up = BEATS.filter((q) => q.t <= tIn - 0.12).pop()!.t
  const down = BEATS.find((q) => q.t >= tOut + 0.02)!.t
  return [up, down]
})
/** Each unit's impressions: every beat from its start but while it is lifted, and the press's end. */
export const IMPRESSIONS: number[][] = UNITS.map((_, i) =>
  BEATS.filter((q) => q.t >= UNIT_START[i] - 1e-9 && q.t <= PRESS_END + 1e-9 && !(q.t >= LIFTS[i][0] - 1e-9 && q.t < LIFTS[i][1] - 1e-9)).map((q) => q.t),
)
/** How far unit i's plate is lifted, 0..1, at `t`. */
export function liftAt(i: number, t: number): number {
  const [up, down] = LIFTS[i]
  if (t < up || t > down + 0.3) return 0
  const rise = 1 - Math.exp(-(t - up) / 0.05)
  if (t < down) return rise
  // Back down onto the web: fast, and it sits.
  const u = (t - down) / 0.07
  return u >= 1 ? 0 : 1 - u * u
}

/* ------------------------------------------------------------------ the stack, the bundle, the conveyor */

/** He lands on the stack moving right, and the paper stops him in a short way. */
const SETTLE_TAU = 0.22
const LAND = WEB.land
export const SETTLE = WEB.vel[0] * SETTLE_TAU
/** The stack's centre: he comes to rest a little right of its middle. */
export const STACK_X = LAND[0] + SETTLE - 0.1
/** Where he sits on the stack, from its centre. */
export const SIT = LAND[0] + SETTLE - STACK_X
export const STACK_H = FULL * COPY
export const BUNDLE_TOP = DECK - STACK_H
const HALF = STACK_W / 2

/** The conveyor's speed, and the seam's. */
export const V_OUT = 1.2
/** Where he leaves the press: an exit cell, so his last x is EXIT_X - 0.5 at the seam. */
const xAtSeamFor = (shove: number): number => STACK_X + shove + SIT + V_OUT * (T1 - RIDE)
export const EXIT_X = Math.round(xAtSeamFor(2.0) + 0.5)
/** How far the shove sends the bundle (to make the exit a whole cell), and how fast it starts. */
export const SHOVE_D = EXIT_X - 0.5 - (STACK_X + SIT + V_OUT * (T1 - RIDE))
export const SHOVE_V0 = (2 * SHOVE_D) / (RIDE - SHOVE) - V_OUT
/** The drop off the bundle's front to the pavement. */
const DROP = 4 - (BUNDLE_TOP - R)
export const DROP_T = dropTime(DROP)
const EDGE_T = PAVEMENT - DROP_T
/** When the bundle stops against the bumper at the conveyor's end (he rolls on, over its front). */
export const STOP = EDGE_T - (HALF - SIT) / V_OUT

/** The bundle's centre x at `t`: on the stacker, the shove, the ride out, stopped. */
export function bundleX(t: number): number {
  if (t <= SHOVE) return STACK_X
  if (t <= RIDE) {
    const u = t - SHOVE
    const T = RIDE - SHOVE
    const a = (V_OUT - SHOVE_V0) / T
    return STACK_X + SHOVE_V0 * u + 0.5 * a * u * u
  }
  return STACK_X + SHOVE_D + V_OUT * (Math.min(t, STOP) - RIDE)
}
/** The bundle's front edge at a beat: where the conveyor's rollers are, so the front drops onto one on every beat. */
export const ROLL_BEATS = BEATS.filter((q) => q.t > RIDE + 0.05 && q.t <= STOP + 1e-6).map((q) => q.t)
const firstRoller = bundleX(RIDE) + HALF
const pitch = V_OUT * 0.42
export const ROLLERS: number[] = (() => {
  const out: number[] = []
  for (let x = firstRoller - pitch; x > STACK_X + HALF + 0.05; x -= pitch) out.unshift(x)
  out.push(firstRoller)
  for (const t of ROLL_BEATS) out.push(bundleX(t) + HALF)
  return out
})()
export const CONVEYOR = { x0: STACK_X + HALF + 0.08, x1: bundleX(STOP) + HALF + 0.12 }
/** The loading door: the bundle's front reaches its strip curtain on CURTAIN. */
export const DOOR_X = bundleX(CURTAIN) + HALF + 0.02
export const DOOR_TOP = 1.55

/* ------------------------------------------------------------------ the lane */

export interface LanePlan {
  segs: Seg[]
  /** Walter, at show time t, in the part's cells (for checking the lane against the drawing). */
}

/** Walter's path, show time to cells, exactly as the lane has him. */
export function buildLane(): Seg[] {
  const segs: Seg[] = []
  const T = (t: number) => t - T0
  // Laid down beside the negative, at rest; then off along the table, gathering speed, and off its end.
  const edgeT = FLOOR_HIT - dropTime(UP - R - 0)
  const vEdge = (2 * (TABLE.x1 - -0.5)) / (edgeT - SETOFF)
  const landX = TABLE.x1 + vEdge * (FLOOR_HIT - edgeT)
  const ways: Way[] = [
    { at: T(T0), p: [-0.5, 0] },
    { at: T(SETOFF), p: [-0.5, 0] },
    { at: T(edgeT), p: [TABLE.x1, 0], ramp: [0, vEdge] },
  ]
  ways.push(throwFor(ways[ways.length - 1], [vEdge, 0], FLOOR_HIT - edgeT))
  ways[ways.length - 1].at = T(FLOOR_HIT)
  ways[ways.length - 1].p = [landX, UP - R]
  // Down the stair, a tread a beat; the last onto the hall's floor.
  STEPS.forEach((t, i) => {
    const k = i + 1
    const p: Pt = [STAIR.x0 + STAIR.run * (k - 1) + 0.3, treadY(k) - R]
    const prev = ways[ways.length - 1]
    const dt = T(t) - prev.at
    ways.push({ at: T(t), p, arc: (G * dt * dt) / 8 })
  })
  // Onto the treadle's raised pad.
  {
    const prev = ways[ways.length - 1]
    const dt = T(TREADLE) - prev.at
    ways.push({ at: T(TREADLE), p: [TREAD.pad, TREAD.up - R], arc: (G * dt * dt) / 8 })
  }
  segs.push(...route(ways))
  // The pad goes down under him (the press starts), and springs back up, throwing him.
  segs.push(...carried((t) => [TREAD.pad, padTop(Math.min(t + T0, FLING - 1e-9)) - R], T(TREADLE), T(FLING), 6))
  {
    const from: Pt = [TREAD.pad, padTop(FLING - 1e-9) - R]
    const dt = ON_WEB - FLING
    segs.push(...route([{ at: T(FLING), p: from }, { at: T(ON_WEB), p: [WEB_LAND, WEB_Y - R], arc: (G * dt * dt) / 8 }]))
  }
  // Carried on the web through the three units, round the turning roller, down the board to the nose.
  segs.push(...carried((t) => onWeb(t + T0), T(ON_WEB), T(OFF_NOSE), 160))
  // Off the nose, onto the stack.
  segs.push(...route([{ at: T(OFF_NOSE), p: WEB.nose }, { at: T(ON_STACK), p: [LAND[0], LAND[1]], arc: (G * NOSE_FLIGHT * NOSE_FLIGHT) / 8 }]))
  // On the stack as it grows under him, the strapping, the shove, the ride out to the bumper and on over the front.
  segs.push(...carried((t) => onBundle(t + T0), T(ON_STACK), T(EDGE_T), 260))
  // Over the front and down to the pavement; then along it, at the street's pace.
  const edge: Pt = onBundle(EDGE_T)
  segs.push(...route([{ at: T(EDGE_T), p: edge }, { at: T(PAVEMENT), p: [edge[0] + V_OUT * DROP_T, 4], arc: (G * DROP_T * DROP_T) / 8 }]))
  segs.push({ from: [edge[0] + V_OUT * DROP_T, 4], to: [EXIT_X - 0.5, 4], dur: T1 - PAVEMENT })
  return segs
}

/** The treadle's pad top at `t`: raised, pressed under him, sprung back. */
export function padTop(t: number): number {
  if (t < TREADLE) return TREAD.up
  if (t < FLING) return TREAD.up + (TREAD.down - TREAD.up) * (1 - Math.exp(-(t - TREADLE) / 0.045))
  const u = t - FLING
  // Sprung: up past rest in a flash, then settling.
  return TREAD.up - 0.06 * Math.exp(-u / 0.12) * Math.cos(u * 30)
}

/** Walter on the stack, then on the bundle, then rolling on over its front. */
export function onBundle(t: number): Pt {
  if (t <= SHOVE) {
    const u = Math.max(0, t - ON_STACK)
    const x = LAND[0] + WEB.vel[0] * SETTLE_TAU * (1 - Math.exp(-u / SETTLE_TAU))
    return [x, stackTop(t) - R]
  }
  const x = bundleX(t) + SIT + (t > STOP ? V_OUT * (t - STOP) : 0)
  return [x, BUNDLE_TOP - R]
}
