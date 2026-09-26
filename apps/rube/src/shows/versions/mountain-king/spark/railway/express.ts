import type { Pt, Seg } from '../../../../../parts'
import { R } from '../../../../../parts'
import { box, frame, knock, part, route, smooth, type PartShot } from '../kit'
import { beat, DOORS, FESTIVAL } from '../music'
import { G_RAIL } from '../physics'
import {
  BOARD,
  BOILER,
  BOSS,
  CYL,
  DOME,
  LEAD,
  LIP_V,
  LIP_OUT,
  MAIN_ROD,
  MOUTH,
  RAIL_Y,
  THROWN,
  TRAIL,
  T_BRAKE,
  T_IN,
  T_OUT,
  T_STOP,
  T_SUCK,
  VALVES,
  bodyPoint,
  engineX,
  pinAt,
  speed,
} from './express-line'
import { poseAt, train } from './express-train'
import { halt, ground, poles, terminus, track, trestle, valley } from './express-scene'
import { blowOff, brakeSparks, burst, cocks, draught, eruption, exhaust, firebox, impact, lipFlash, stackSparks, whistle } from './express-fx'

/**
 * EXPRESS: the night express, from the third door (`DOORS.railway`, statement 3's first note, fortissimo) to the
 * festival (`FESTIVAL`, phrase 16).
 *
 * The fireworks special stands at a little halt under the moon with steam up and no one on the footplate. On the first
 * chuff of the fortissimo the chimney throws up a column of fire and a fountain of sparks, the spark bursts out of it,
 * and the train lurches off under it: a runaway. The spark comes down on the brass steam dome (it rings), rolls back
 * along the boiler into the safety valves, which blow off and toss it over the side onto the running board; the rail
 * joints knock it up off the board a backbeat at a time, and it drops onto the trailing crank pin at the top of its
 * turn. The wheels are the music: from full speed the drivers turn once every two quarters, so the pins are at the top
 * on every backbeat, the chuffs, the rail joints and the telegraph poles come on the beat, and the train speeds up
 * exactly as the orchestra does.
 *
 * Phrase 13 is a tour of the motion, a move a backbeat: round on the trailing pin, along the whirling coupling rod to
 * the leading pin, down the main rod to the crosshead, two strokes to and fro in the slide bars, and back. In the B
 * phrases the line crosses the long trestle over the river: the camera pulls out and lags, so the whole train crosses
 * the frame and the moon's face while the whistle shrieks, the spark a light going round at its wheels. Off the
 * trestle the terminus comes on down the line; at the bottom of its turn the fire's own draught snatches the spark off
 * the pin into the glowing ashpan; the fire roars, and its heat runs through the iron up the boiler to the chimney
 * (hidden 1.3 s, and shown the whole way) while the engine passes the red signal and its brakes lock the wheels in a
 * shriek of sparks; and on the last backbeat the spark comes up out of the chimney it came in by, flung up and on as
 * the engine slides into the buffer stops at the festival: `SEAMS.festival`, moving (4.5, -2.5), the camera at 6 cells.
 *
 * The leg is laid at [0, 0] in the railway's cells, so this part's frame is the world's: the entry (-0.5, 0) is the
 * chimney's lip at the door. The train and the line are drawn in `express-train.ts` and `express-scene.ts`, the
 * smoke, steam, fire and sparks in `express-fx.ts`, and where it all is and when in `express-line.ts`.
 */

/* ------------------------------------------------------------------ the beats it plays */

const bb = (k: number) => beat(k)
/** Onto the dome; into the safety valves; onto the running board; the three rail-joint knocks; onto the crank pin. */
const T_DOME = bb(195)
const T_VALVES = bb(197)
const T_BOARD = bb(199)
const JOLTS = [bb(201), bb(203), bb(205)]
const T_PIN = bb(207)

/**
 * The strikes (show seconds), every one a backbeat of statement 3 (eighths 2, 6, … 30 of its phrases) but the last:
 * the second chuff as the drivers take hold; the dome, the valves, the running board; three rail joints; the catch on
 * the pin; on every backbeat of phrase 13 the pins at the top, the big chuff, and a move of the tour (onto the
 * coupling rod, the leading pin, the main rod, the crosshead, back); in phrase 14 the whistle a bar and the pins
 * between; phrase 15's pins, into the fire, the brakes, out of the chimney; and the buffer stops at the festival.
 */
export const EXPRESS_HITS: number[] = [
  bb(193),
  T_DOME,
  T_VALVES,
  T_BOARD,
  ...JOLTS,
  T_PIN,
  ...Array.from({ length: 21 }, (_, i) => bb(209 + 2 * i)),
  T_IN,
  T_BRAKE,
  T_OUT,
  T_STOP,
]

/* ------------------------------------------------------------------ where the spark is */

const DOME_BASE = BOILER.v + BOILER.r - 0.05
/** The dome's skin at `u` (v up), 0 off it. */
function domeSkin(u: number): number {
  const s = (u - DOME.u) / (DOME.w / 2)
  if (Math.abs(s) >= 1) return 0
  return DOME_BASE + (DOME.top - DOME_BASE) * Math.pow(1 - Math.pow(Math.abs(s), 2.2), 0.6)
}
const BOILER_TOP = BOILER.v + BOILER.r
const ON_BOILER = (u: number): number => Math.max(BOILER_TOP, domeSkin(u)) + R

/** A soft bob: up quick off a knock, down again softly (zero speed when it lands), `h` high over `T` seconds. */
const bob = (s: number): number => (s <= 0 || s >= 1 ? 0 : (27 / 4) * s * (1 - s) * (1 - s))

/** Cubic Hermite from a (moving va) to b (moving vb) over T, at fraction s. */
function hermite(a: number, va: number, b: number, vb: number, T: number, s: number): number {
  const s2 = s * s
  const s3 = s2 * s
  return (2 * s3 - 3 * s2 + 1) * a + (s3 - 2 * s2 + s) * T * va + (-2 * s3 + 3 * s2) * b + (s3 - s2) * T * vb
}

interface Path {
  /** Where the spark lands on the dome, in the engine's cells. */
  land: Pt
  /** Where it meets the safety valves, and where it lands on the running board. */
  valves: Pt
  board: Pt
  /** When it steps off the running board to fall onto the pin. */
  drop: number
  /** The flight out of the chimney, world: tuned so it lands on the dome exactly. */
  flyLand: Pt
  apex: number
  rise: number
  /** What the solved flight misses the dome by (a hair), taken up over the flight. */
  miss: number
}

function plan(): Path {
  const T1 = T_DOME - DOORS.railway
  // Out of the chimney at (0.3, -3.4) in the column of the first chuff; the train pulls out from under it.
  const xLand = -0.5 + 0.3 * T1
  const uLand = xLand - engineX(T_DOME)
  const land: Pt = [uLand, domeSkin(uLand) + R]
  const flyLand = bodyPoint(T_DOME, land[0], land[1])
  // The column holds it up and lets it go at its top; from there it falls under the line's gravity. Solve for the top.
  let lo = 0.2
  let hi = T1 - 0.05
  for (let i = 0; i < 50; i++) {
    const ta = (lo + hi) / 2
    const y = -1.7 * ta + 0.5 * G_RAIL * (T1 - ta) ** 2
    if (y > flyLand[1]) lo = ta
    else hi = ta
  }
  const apex = (lo + hi) / 2
  const miss = flyLand[1] - (-1.7 * apex + 0.5 * G_RAIL * (T1 - apex) ** 2)
  const valves: Pt = [VALVES.u + VALVES.w / 2 + R * 0.95, BOILER_TOP + R]
  const board: Pt = [valves[0] - 0.46, BOARD.v + R]
  // Off the running board to fall straight onto the pin at the top of its turn.
  const pinTop = pinAt(T_PIN, TRAIL)[1] - BOSS
  const boardY = bodyPoint(T_PIN - 0.3, TRAIL, BOARD.v + R)[1]
  const drop = T_PIN - Math.sqrt((2 * (pinTop - boardY)) / G_RAIL)
  return { land, valves, board, drop, flyLand, apex, rise: 3.4 / apex, miss }
}

const P = plan()

/** The spark at show time `t` (world cells), from the door until it comes out of the chimney. */
export function sparkAt(t: number): Pt {
  const T1 = T_DOME - DOORS.railway
  // A. Out of the chimney, up in the chuff's column and down onto the steam dome.
  if (t <= T_DOME) {
    const a = t - DOORS.railway
    const s = a / T1
    const x = -0.5 + 0.3 * a + (P.flyLand[0] - (-0.5 + 0.3 * T1)) * s * s
    const y = a < P.apex ? -3.4 * a + 0.5 * P.rise * a * a : -1.7 * P.apex + 0.5 * G_RAIL * (a - P.apex) ** 2
    return [x, y + P.miss * s * s]
  }
  // B. A little bob off the dome, then blown back down its far side and along the boiler into the safety valves.
  if (t <= T_VALVES) {
    const T = T_VALVES - T_DOME
    const s = (t - T_DOME) / T
    const u = hermite(P.land[0], -0.45, P.valves[0], -1.5, T, s)
    const v = ON_BOILER(u) + 0.07 * bob((t - T_DOME) / 0.26)
    return bodyPoint(t, u, v)
  }
  // C. Knocked up off the valves and over the side, down onto the running board.
  if (t <= T_BOARD) {
    const T = T_BOARD - T_VALVES
    const s = (t - T_VALVES) / T
    const u = P.valves[0] + (P.board[0] - P.valves[0]) * s
    const v = P.valves[1] + (P.board[1] - P.valves[1]) * s + ((G_RAIL * T * T) / 8) * 4 * s * (1 - s)
    return bodyPoint(t, u, v)
  }
  // D. Rattled along the running board by the rail joints, blown back to stand over the trailing wheel.
  if (t <= P.drop) {
    const T = P.drop - T_BOARD
    const s = (t - T_BOARD) / T
    const u = hermite(P.board[0], (P.board[0] - P.valves[0]) / (T_BOARD - T_VALVES) * 0.5, TRAIL, 0, T, s)
    let v = P.board[1]
    // Each rail joint knocks it up off the board; it floats down in the wind and settles before the next.
    JOLTS.forEach((j, i) => (v += [0.34, 0.27, 0.26][i] * bob((t - j) / [0.52, 0.52, 0.4][i])))
    return bodyPoint(t, u, v)
  }
  // E. Off the edge, straight down onto the crank pin as it comes up to the top.
  if (t <= T_PIN) {
    const T = T_PIN - P.drop
    const s = (t - P.drop) / T
    const from = bodyPoint(P.drop, TRAIL, P.board[1])
    const to = pinAt(T_PIN, TRAIL)
    const ex = engineX(t) + TRAIL
    return [ex + (from[0] - (engineX(P.drop) + TRAIL)) * (1 - s) + (to[0] - (engineX(T_PIN) + TRAIL)) * s, from[1] + (to[1] - BOSS - from[1]) * s * s]
  }
  // F. On the motion: round on the pins, along the rods, back and forth on the crosshead, back to the trailing pin.
  if (t <= T_SUCK) return motionAt(t)
  // G. Snatched off the pin at the rear of its turn by the draught into the ashpan's mouth.
  if (t <= T_IN) {
    const T = T_IN - T_SUCK
    const s = (t - T_SUCK) / T
    const a = sparkAt(T_SUCK - 1e-4)
    const a0 = sparkAt(T_SUCK - 0.004)
    const va: Pt = [(a[0] - a0[0]) / (0.004 - 1e-4), (a[1] - a0[1]) / (0.004 - 1e-4)]
    const b = bodyPoint(T_IN, (MOUTH.u0 + MOUTH.u1) / 2, (MOUTH.v0 + MOUTH.v1) / 2 - 0.05)
    const vb: Pt = [speed(T_IN) - 2.6, 0.4]
    return [hermite(a[0], va[0], b[0], vb[0], T, s), hermite(a[1], va[1], b[1], vb[1], T, s)]
  }
  // H. Inside: up through the fire and along the tubes, the smokebox, up the chimney.
  return inside(t)
}

/* ------------------------------------------------------------------ the tour of the motion (phrase 13) */

/**
 * Phrase 13, a move a backbeat (the pins are at the top on every one): a turn on the trailing pin; along the coupling
 * rod to the leading pin as the rod whirls; a turn there; down the main rod to the crosshead; two strokes shuttling
 * in the slide bars on the crosshead; back up the main rod and along the coupling rod to the trailing pin, where it
 * rides the rest of the way. Every piece of the motion carries it the way it moves: round, round-while-level, to and
 * fro.
 */
const ROD_OUT: [number, number] = [bb(209), bb(211)]
const MAIN_OUT: [number, number] = [bb(213), bb(215)]
const MAIN_BACK: [number, number] = [bb(219), bb(221)]
const ROD_BACK: [number, number] = [bb(221), bb(223)]

/** The crosshead's middle at `t`, world cells: where the main rod from the leading pin meets the cylinder's axis. */
function crossheadAt(t: number): Pt {
  const lead = pinAt(t, LEAD)
  const y = RAIL_Y - CYL.v
  return [lead[0] + Math.sqrt(MAIN_ROD * MAIN_ROD - (y - lead[1]) ** 2), y]
}

/** The spark on the motion at `t` (world cells): riding on top of whatever carries it. */
function motionAt(t: number): Pt {
  const across = ([a, b]: [number, number]) => {
    const u = Math.max(0, Math.min(1, (t - a) / (b - a)))
    return u * u * (3 - 2 * u)
  }
  const mix = (p: Pt, q: Pt, s: number): Pt => [p[0] + (q[0] - p[0]) * s, p[1] + (q[1] - p[1]) * s - BOSS]
  if (t < ROD_OUT[0] || t >= ROD_BACK[1]) return mix(pinAt(t, TRAIL), pinAt(t, TRAIL), 0)
  if (t < ROD_OUT[1]) return mix(pinAt(t, TRAIL), pinAt(t, LEAD), across(ROD_OUT))
  if (t < MAIN_OUT[0]) return mix(pinAt(t, LEAD), pinAt(t, LEAD), 0)
  if (t < MAIN_OUT[1]) return mix(pinAt(t, LEAD), crossheadAt(t), across(MAIN_OUT))
  if (t < MAIN_BACK[0]) return mix(crossheadAt(t), crossheadAt(t), 0)
  if (t < MAIN_BACK[1]) return mix(crossheadAt(t), pinAt(t, LEAD), across(MAIN_BACK))
  return mix(pinAt(t, LEAD), pinAt(t, TRAIL), across(ROD_BACK))
}

/** The way through the engine, in its cells: the ashpan, the firebox, the tubes, the smokebox, the chimney. */
const WAY: Pt[] = [
  [(MOUTH.u0 + MOUTH.u1) / 2, (MOUTH.v0 + MOUTH.v1) / 2 - 0.05],
  [-5.45, 1.7],
  [-5.0, 2.75],
  [-4.2, 2.98],
  [-1.0, 2.98],
  [-0.3, 3.05],
  [0, 3.6],
  [0, LIP_V],
]
const WAY_LEN: number[] = (() => {
  const out = [0]
  for (let i = 1; i < WAY.length; i++) out.push(out[i - 1] + Math.hypot(WAY[i][0] - WAY[i - 1][0], WAY[i][1] - WAY[i - 1][1]))
  return out
})()
/** Where the spark is inside the engine at `t`, in the engine's cells. */
function insideUV(t: number): Pt {
  const s = Math.max(0, Math.min(1, (t - T_IN) / (T_OUT - T_IN)))
  // Drawn in slowly, then faster and faster up the chimney with the blast.
  const e = s * s * (1.6 - 0.6 * s)
  const d = e * WAY_LEN[WAY_LEN.length - 1]
  let i = 1
  while (i < WAY.length - 1 && WAY_LEN[i] < d) i++
  const f = (d - WAY_LEN[i - 1]) / (WAY_LEN[i] - WAY_LEN[i - 1])
  return [WAY[i - 1][0] + (WAY[i][0] - WAY[i - 1][0]) * f, WAY[i - 1][1] + (WAY[i][1] - WAY[i - 1][1]) * f]
}
function inside(t: number): Pt {
  const [u, v] = insideUV(t)
  return bodyPoint(t, u, v)
}

/**
 * The spark's heat through the iron at `t`: where it is inside the engine, glowing, and the way it came, cooling
 * behind it (and in the chimney for a moment after it has gone out of it).
 */
function heatAt(t: number): { u: number; v: number; a: number }[] {
  if (t < T_IN || t > T_OUT + 0.6) return []
  const out: { u: number; v: number; a: number }[] = []
  if (t < T_OUT) {
    const [u, v] = insideUV(t)
    out.push({ u, v, a: Math.min(1, (t - T_IN) / 0.05) })
  }
  for (let j = 1; j <= 10; j++) {
    const s = t - j * 0.055
    if (s < T_IN || s > T_OUT) continue
    const [u, v] = insideUV(s)
    out.push({ u, v, a: 0.7 * Math.exp(-(t - s) / 0.22) })
  }
  return out
}

/* ------------------------------------------------------------------ the part */

interface State {
  begin: number
}

/**
 * The trestle's wide shot: the camera holds a point on the line with weight `w` and follows the spark with the rest,
 * so it runs slower than the train and the train crosses the frame. Solved so the spark goes from 7.5 cells left of
 * the frame's middle to 7.5 right of it (inside the frame under Zoom): the director's camera frames
 * `(1 - w)(follow + off) + w hold`, and its follow leads the spark by about 0.1 s of travel.
 */
const CROSS = (() => {
  const a = sparkAt(bb(229))
  const b = sparkAt(bb(239))
  const lead = 0.1 * ((b[0] - a[0]) / (bb(239) - bb(229)))
  const w = 15 / (b[0] - a[0])
  const mid = sparkAt((bb(229) + bb(239)) / 2)
  return { w, hold: [a[0] + (7.5 - (1 - w) * lead) / w, mid[1] + 0.9 + 0.3] as Pt }
})()

/** Straight pieces through `at` from show time a to b, `n` a second; the lane's time runs from the slot's start. */
function sampled(at: (t: number) => Pt, a: number, b: number, rate = 120, hidden = false): Seg[] {
  const n = Math.max(1, Math.ceil((b - a) * rate))
  const out: Seg[] = []
  for (let i = 0; i < n; i++) {
    const t0 = a + ((b - a) * i) / n
    const t1 = a + ((b - a) * (i + 1)) / n
    const seg: Seg = { from: at(t0), to: at(t1), dur: t1 - t0 }
    if (hidden) seg.hidden = true
    out.push(seg)
  }
  return out
}

export const express = part<State>(
  {
    name: 'express',
    flight: true,
    draw: (p, s, c) => {
      const { k, weight: w } = c
      const t = c.t + s.begin
      const f = frame(p, k)
      p.push()
      // Behind the line: the poles, the halt, the signal and the stops; the valley and its trestle.
      poles(p, k, f, w)
      halt(p, k, f, w)
      terminus(p, k, f, w, t)
      valley(p, k, f, w, t)
      trestle(p, k, f, w)
      ground(p, k, f, w, t)
      track(p, k, f, w)
      // The firebox's glow on the ballast under the engine.
      const e = poseAt(t)
      // The fire draws harder as the spark comes round to the ashpan, roars as it goes in, and burns high while it is in.
      const glow = 1 + (t < T_IN ? 1.2 * smooth(t, T_SUCK - 0.6, T_IN) : 0) + 1.8 * knock(t - T_IN, 0.45) + (t > T_IN && t < T_OUT ? 0.6 : 0)
      {
        const [gx, gy] = [e.x - 5.5, RAIL_Y]
        const ctx = p.drawingContext as CanvasRenderingContext2D
        const g = ctx.createRadialGradient(gx * k, gy * k, 0, gx * k, gy * k, 1.8 * k)
        g.addColorStop(0, `rgba(255, 150, 60, ${Math.min(0.6, 0.28 * glow)})`)
        g.addColorStop(1, 'rgba(255, 107, 44, 0)')
        ctx.fillStyle = g
        ctx.fillRect((gx - 1.8) * k, (gy - 1.8) * k, 3.6 * k, 3.6 * k)
      }
      // The train, then what it breathes over it.
      if (e.x + 3 > f.x0 && e.x - 25 < f.x1) train(p, k, e, w, { glow, inside: heatAt(t), ring: knock(t - T_DOME, 0.28), valves: t < T_VALVES ? 0 : knock(t - T_VALVES - 0.25, 0.3) + (t < T_VALVES + 0.25 ? 1 : 0) })
      exhaust(p, k, t, f.x0 - 2, f.x1 + 2)
      stackSparks(p, k, t, f.x0, f.x1)
      cocks(p, k, t)
      whistle(p, k, t)
      blowOff(p, k, t, T_VALVES)
      draught(p, k, t)
      firebox(p, k, t)
      brakeSparks(p, k, t)
      lipFlash(p, k, t)
      eruption(p, k, t)
      burst(p, k, t)
      impact(p, k, t)
      p.pop()
    },
  },
  (slot) => {
    const at = (t: number) => t - slot.begin
    const segs: Seg[] = [
      ...sampled(sparkAt, slot.begin, T_DOME),
      ...sampled(sparkAt, T_DOME, T_VALVES),
      ...sampled(sparkAt, T_VALVES, T_BOARD),
      ...sampled(sparkAt, T_BOARD, P.drop),
      ...sampled(sparkAt, P.drop, T_PIN),
      ...sampled(sparkAt, T_PIN, T_SUCK),
      ...sampled(sparkAt, T_SUCK, T_IN),
      ...sampled(inside, T_IN, T_OUT, 90, true),
      // I. Out of the chimney on the last backbeat, up and on over the stopping engine: SEAMS.festival at the end.
      ...route([
        { at: at(T_OUT), p: LIP_OUT },
        { at: at(slot.end), p: THROWN, arc: (G_RAIL * (slot.end - T_OUT) ** 2) / 8 },
      ]),
    ]
    return {
      cells: box(-27, -9, 176, 14, 2),
      exit: [THROWN[0] + 0.5, THROWN[1]],
      lane: { segs, fire: at(T_DOME) },
      state: { begin: slot.begin },
    }
  },
  (slot) => {
    const shots: PartShot[] = [
      // Out of the fire at the chimney, the camera comes up and back with the spark as it rises.
      { t: slot.begin + 0.45, cells: 3.4, w: 0, off: [0, 0.25] },
      // The halt, the engine, the spark coming down on the dome: the train pulling out.
      { t: bb(195), cells: 5.6, w: 0, off: [-0.4, 1.0] },
      { t: bb(199), cells: 5.2, w: 0, off: [0.3, 0.8] },
      { t: bb(205), cells: 4.8, w: 0, off: [0.3, 0.45] },
      // Down to the wheels: the spark on the crank pin, the rods; creeping in over the phrase as it builds.
      { t: bb(208), cells: 4.3, w: 0, off: [0.1, -0.35] },
      { t: bb(216), cells: 3.9, w: 0, off: [0.0, -0.3] },
      { t: bb(223), cells: 3.5, w: 0, off: [-0.1, -0.25] },
      { t: bb(224) + 0.1, cells: 3.6, w: 0, off: [0.0, -0.3] },
      // The trestle: out to the whole train, and the camera lags it, so the train crosses the frame and the moon's
      // face from left to right while the whistle shrieks (see `crossing`).
      { t: bb(227), cells: 9.5, hold: CROSS.hold, w: 0.12, off: [0, 0.6] },
      { t: bb(229), cells: 17, hold: CROSS.hold, w: CROSS.w, off: [0, 0.9] },
      { t: bb(239), cells: 16, hold: CROSS.hold, w: CROSS.w, off: [0, 0.9] },
      // Off the trestle, in on the whole engine, looking on down the line to the terminus; along the boiler after the
      // hidden spark to the chimney; up with it as it is thrown.
      { t: bb(243), cells: 7.0, w: 0, off: [1.9, -1.2] },
      { t: bb(249), cells: 6.3, w: 0, off: [1.8, -1.15] },
      { t: T_IN, cells: 6.2, w: 0, off: [1.3, -0.9] },
      // The brakes: low enough to see the wheels grind the rail as the heat runs up the boiler to the chimney.
      { t: T_BRAKE, cells: 6.4, w: 0, off: [1.8, 0.5] },
      { t: T_OUT, cells: 6.2, w: 0, off: [1.0, 1.3] },
      { t: slot.end, cells: 6, w: 0, off: [0.9, 0.85] },
    ]
    return shots.filter((s) => s.t > slot.begin && s.t <= slot.end + 1e-6)
  },
)

/** For the check and the director: where the spark leaves the express (world cells), and its velocity then. */
export const EXPRESS_EXIT: Pt = [THROWN[0] + 0.5, THROWN[1]]
export const EXPRESS_OUT = { at: FESTIVAL, v: [4.5, -2.5] as Pt }