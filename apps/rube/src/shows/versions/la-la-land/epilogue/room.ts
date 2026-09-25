import type p5 from 'p5'
import { outline, solid } from '../../../../../../../src/core/draw'
import { clamp } from '../../../../../../../src/core/ease'
import { mixHex, R, type Pt } from '../../../../parts'
import { alpha, frame, hash, knock, scenery, smooth, type Ctx } from './kit'
import { DURATION, KISS, KISS_PEAK, LAST_CHORDS } from './music'
import { beam, flat, glow, hexA } from './rig'
import { BAR, CLUB, DREAM, PAINT } from './worlds'

/**
 * Seb's: the room, and where everything in it stands. One layout, used
 * three times: the real club at the start (the piano, and Mia at her
 * table), the same room the moment it turns into the dream (the kiss), and
 * the real club again at the end, drawn at the far end of the chain where
 * the dream's last set was struck. The parts place themselves against
 * these numbers, so a match cut lands.
 *
 * Cells, in the frame of the part that has the ball in this room: the piano
 * part at the start, the kiss, and the finale at the end. In each the room's
 * origin is the part's entry cell, and the ball comes in at (-0.5, 0), which
 * is the left end of the piano's keys, at the height it rolls on them. The
 * piano is drawn from the front, its keys along the frame, its lid up
 * behind. It is a big piano: the camera is close, and a key is a ball's
 * width and a bit.
 */
export const ROOM = {
  /** The keys run from KEYS[0] to KEYS[1]; the ball rolls along them at y = 0, its centre a ball's radius over the key tops. */
  keys: [-0.5, 11.8] as Pt,
  /** Number of keys. */
  keyCount: 88,
  /** The club's floor, below the keys: a ball on it has its centre at floorBall. */
  floor: 1.0,
  floorBall: 1.0 - R,
  /** Mia's table, to the right of the piano; her ball rests on the floor beside it, at rest, facing the piano. */
  table: 17.0,
  /** The stairs up to the street, and the door at their top. */
  stairs: [19.5, 23] as Pt,
  door: [23, -2] as Pt,
  /** The top of the piano's case over the keys, and the peak of its raised lid. */
  case: -2.4,
  lid: -4.2,
  /** The lamp over the piano: the one light in the real room. */
  lamp: [5.5, -5.2] as Pt,
}

/** Where the kiss lands: Seb's ball touching hers, on the floor beside her table. */
export const KISS_AT: Pt = [ROOM.table - 2 * R - 0.02, ROOM.floorBall]

/* ------------------------------------------------------------------ the keyboard and the stairs, as numbers */

/** One key's width. */
export const KEY_W = (ROOM.keys[1] - ROOM.keys[0]) / ROOM.keyCount
/** The key under a ball at `x`. */
export const keyAt = (x: number): number => clamp(Math.floor((x - ROOM.keys[0]) / KEY_W), 0, ROOM.keyCount - 1)
/** The middle of key `i`. */
export const keyX = (i: number): number => ROOM.keys[0] + (i + 0.5) * KEY_W
/** A black key: the keyboard starts on A. */
const black = (i: number): boolean => [1, 4, 6, 9, 11].includes(i % 12)

export const STEPS = 6
export const STEP_W = (ROOM.stairs[1] - ROOM.stairs[0]) / STEPS
export const STEP_H = (ROOM.floor - (ROOM.door[1] + R)) / STEPS
/** The tread of step `i` (0 is the first up from the floor): its top, and where a ball resting on it has its centre. */
export const treadY = (i: number): number => ROOM.floor - STEP_H * (i + 1)
export const treadBall = (i: number): number => treadY(i) - R
export const treadX = (i: number): number => ROOM.stairs[0] + STEP_W * (i + 0.5)
/** The doorway at the top of the stairs: its jambs and its head. */
export const DOOR = { x0: ROOM.door[0] - 0.25, x1: ROOM.door[0] + 0.65, top: ROOM.door[1] - 1.95, sill: ROOM.door[1] + R }

/* ------------------------------------------------------------------ the piano's action */

/** The top of the white keys (the rail the ball rolls on), and the strip's foot. */
const KEY_TOP = R
const KEY_FOOT = R + 0.42
const BLACK_FOOT = R + 0.2
/** How far a key sinks under a note. */
const SINK = 0.06
/** The hammer rail, the head at rest, and the lift of a stroke; the strings' foot (the bridge), where the head hits. */
const RAIL_Y = -0.34
const HEAD_REST = -0.62
const LIFT = 0.3
const BRIDGE = -0.98
const DAMPER_Y = -1.12
/** Where the strings end, rising to the lid: the bass strings the tallest, the fan leaning in toward the middle. */
const stringTop = (i: number): Pt => [keyX(i) + (5.6 - keyX(i)) * 0.22, -3.85 + 0.85 * (i / ROOM.keyCount)]
/** The case: its left cheek, its right, and the lid over it. */
const CASE_L = ROOM.keys[0] - 0.55
const CASE_R = ROOM.keys[1] + 0.55
const CASE_FOOT = 0.72
const LID: Pt[] = [
  [CASE_L + 0.3, ROOM.case],
  [CASE_R, ROOM.case],
  [CASE_R + 0.35, ROOM.lid],
  [CASE_L + 0.85, ROOM.lid + 0.75],
]

/** A note struck on the piano: when (in the caller's clock), which keys, and how deep (1 is a note, more is a chord leaned on). */
export interface Strike {
  t: number
  keys: number[]
  depth: number
  /** How long the string rings, seconds (the decay's time constant); a note's is 0.7. */
  sustain?: number
}

/** What the part that has the piano tells the drawing: its strikes, the time now on the same clock, and the lamp's light (0..1). */
export interface PianoPlay {
  strikes: Strike[]
  now: number
  light?: number
  /** The strings all faintly alight, 0..1: the last of a chord dying away. */
  shimmer?: number
}

/** How far down a key is at `since` seconds after its note: sharp on the hit, a slow damped rise after. */
export const sunk = (since: number, depth = 1): number => {
  if (since < 0) return 0
  const down = smooth(since, 0, 0.03)
  const up = since < 0.09 ? 0 : 1 - Math.exp(-(since - 0.09) / 0.16)
  return SINK * depth * down * (1 - up)
}
/** The hammer's lift at `since`: up in a flash, on the string at the note, and back down slower, with a small check. */
const hammerUp = (since: number, depth = 1): number => {
  if (since < -0.045) return 0
  const s = since + 0.045
  if (s < 0.045) return smooth(s, 0, 0.045)
  const back = s - 0.045
  const fall = Math.exp(-back / 0.11)
  const check = 0.08 * Math.exp(-back / 0.25) * Math.sin(back * 24) * smooth(back, 0.04, 0.12)
  return Math.min(1, fall + check) * Math.min(1, 0.8 + depth * 0.2)
}
/** The damper: off the string while the key is down, then back on it. */
const damperUp = (since: number): number => (since < 0 ? 0 : smooth(since, 0, 0.05) * (1 - smooth(since, 0.45, 0.85)))
/** The string's ring: bright on the hit, dying over a second and a half. */
const ring = (since: number, depth = 1, sustain = 0.7): number => (since < 0 ? 0 : Math.min(1, depth) * knock(since, sustain))

/** The ball's dip with the keys under it at `now`: the deepest sunk key among those it sits on. */
export function dipAt(strikes: Strike[], now: number, key: number): number {
  let d = 0
  for (const s of strikes) {
    if (s.t > now || now - s.t > 1.2) continue
    if (!s.keys.includes(key)) continue
    d = Math.max(d, sunk(now - s.t, s.depth))
  }
  return d
}

/** The piano's colours, in the club and in the dream. */
function pianoLook(dream: boolean) {
  return dream
    ? { case: PAINT.deep, rim: PAINT.gold, white: PAINT.cream, black: DREAM.bg, felt: PAINT.red, string: PAINT.gold, wood: PAINT.timber, gap: DREAM.ink }
    : { case: BAR.black, rim: BAR.brass, white: BAR.wire, black: BAR.black, felt: BAR.felt, string: BAR.wire, wood: BAR.wood, gap: CLUB.ink }
}

/**
 * The piano, from the front, in the room's cells: the case and the raised
 * lid, the strings rising to it as a fan, the row of hammers and the
 * dampers over the keys, and the keys themselves, which are the machine.
 * `play` says which keys are down and which hammers are flying; without it
 * the piano is at rest. In the club the lamp's pool falls on it here, over
 * everything, so the piano is what the one light lights.
 */
export function drawPiano(p: p5, c: Ctx, dream: boolean, play?: PianoPlay): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const L = pianoLook(dream)
  const f = frame(p, k)
  const now = play?.now ?? 0
  const live = (play?.strikes ?? []).filter((s) => now - s.t > -0.06 && now - s.t < 2.5 * (s.sustain ?? 0.7) + 0.5)
  const struck = (i: number): { since: number; depth: number; sustain: number } | null => {
    let best: { since: number; depth: number; sustain: number } | null = null
    for (const s of live) if (s.keys.includes(i) && (!best || now - s.t < best.since)) best = { since: now - s.t, depth: s.depth, sustain: s.sustain ?? 0.7 }
    return best
  }
  const shimmer = play?.shimmer ?? 0

  // The lid, up on its stick, and the case: the inside is what the strings and hammers are seen against.
  p.push()
  solid(p, ink, weight * 0.8, L.case)
  p.beginShape()
  for (const [x, y] of LID) p.vertex(X(x), X(y))
  p.endShape(p.CLOSE)
  p.noStroke()
  p.fill(L.case)
  p.rect(X((CASE_L + CASE_R) / 2), X((ROOM.case + CASE_FOOT) / 2), X(CASE_R - CASE_L), X(CASE_FOOT - ROOM.case))
  // The legs, and the lyre with the pedals.
  p.fill(L.case)
  for (const x of [CASE_L + 0.5, CASE_R - 0.5]) p.rect(X(x), X((CASE_FOOT + ROOM.floor) / 2), X(0.22), X(ROOM.floor - CASE_FOOT))
  p.rect(X(5.65), X((CASE_FOOT + ROOM.floor) / 2 - 0.02), X(0.1), X(ROOM.floor - CASE_FOOT - 0.06))
  solid(p, ink, weight * 0.6, L.rim)
  p.rect(X(5.65), X(ROOM.floor - 0.08), X(0.5), X(0.05))
  // The prop stick.
  outline(p, ink, weight * 0.7)
  p.line(X(CASE_R - 1.9), X(ROOM.case), X(CASE_R - 0.35), X(ROOM.lid + 0.35))

  // The strings: a fan of bright lines from the bridge to the lid, faint until struck, then ringing.
  const i0 = clamp(Math.floor((f.x0 - 1.5 - ROOM.keys[0]) / KEY_W), 0, ROOM.keyCount - 1)
  const i1 = clamp(Math.ceil((f.x1 + 1.5 - ROOM.keys[0]) / KEY_W), 0, ROOM.keyCount - 1)
  const wire = Math.max(0.8, k * 0.012)
  for (let i = i0; i <= i1; i++) {
    const [tx, ty] = stringTop(i)
    const hit = struck(i)
    const r = Math.max(hit ? ring(hit.since, hit.depth, hit.sustain) : 0, shimmer * (0.35 + 0.35 * hash(i, Math.floor(now * 14))))
    p.stroke(alpha(p, L.string, 0.26 + 0.74 * r))
    p.strokeWeight(wire * (1 + 1.2 * r))
    p.line(X(keyX(i)), X(BRIDGE), X(tx), X(ty))
  }
  // A struck string's shimmer: a soft light along it while it rings.
  for (let i = i0; i <= i1; i++) {
    const hit = struck(i)
    if (!hit) continue
    const r = ring(hit.since, hit.depth, hit.sustain)
    if (r < 0.03) continue
    const [tx, ty] = stringTop(i)
    beam(p, c, [keyX(i), BRIDGE], [tx * 0.45 + keyX(i) * 0.55, ty * 0.45 + BRIDGE * 0.55], 0.14, 0.3 * r, dream ? PAINT.gold : BAR.lamp)
  }
  // The bridge the strings rise from, and the damper rail above the hammers.
  solid(p, ink, weight * 0.7, L.wood)
  p.rect(X((ROOM.keys[0] + ROOM.keys[1]) / 2), X(BRIDGE + 0.05), X(ROOM.keys[1] - ROOM.keys[0] + 0.2), X(0.09))
  // The dampers: felts on the strings, one a key; a struck one lifts off.
  for (let i = i0; i <= i1; i++) {
    const hit = struck(i)
    const up = hit ? damperUp(hit.since) : 0
    const y = DAMPER_Y - 0.09 * up
    solid(p, ink, weight * 0.5, L.wood)
    p.rect(X(keyX(i)), X(y), X(KEY_W * 0.62), X(0.07))
  }
  // The hammer rail, and the hammers: a shank up from the rail to a felt head, which flies up to the string on a note.
  solid(p, ink, weight * 0.7, L.wood)
  p.rect(X((ROOM.keys[0] + ROOM.keys[1]) / 2), X(RAIL_Y), X(ROOM.keys[1] - ROOM.keys[0] + 0.2), X(0.07))
  for (let i = i0; i <= i1; i++) {
    const hit = struck(i)
    const up = hit ? hammerUp(hit.since, hit.depth) : 0
    const x = keyX(i)
    const head = HEAD_REST - LIFT * up
    outline(p, ink, weight * 0.55)
    p.line(X(x), X(RAIL_Y - 0.03), X(x), X(head + 0.03))
    solid(p, ink, weight * 0.5, L.felt)
    p.ellipse(X(x), X(head), X(KEY_W * 0.66), X(0.085))
  }

  // The keys: a strip of white, the black ones set into its top; a struck key sinks.
  const kx0 = ROOM.keys[0] + i0 * KEY_W
  const kx1 = ROOM.keys[0] + (i1 + 1) * KEY_W
  p.noStroke()
  p.fill(L.white)
  p.rect(X((kx0 + kx1) / 2), X((KEY_TOP + KEY_FOOT) / 2), X(kx1 - kx0), X(KEY_FOOT - KEY_TOP))
  for (let i = i0; i <= i1; i++) {
    const hit = struck(i)
    const d = hit ? sunk(hit.since, hit.depth) : 0
    const x = keyX(i)
    if (black(i)) {
      p.noStroke()
      p.fill(L.black)
      p.rect(X(x), X((KEY_TOP + d + BLACK_FOOT) / 2), X(KEY_W * 0.72), X(BLACK_FOOT - KEY_TOP - d))
    } else if (d > 0.001) {
      // A sunk white key: its top moves down, and the strip shows dark above it.
      p.noStroke()
      p.fill(L.case)
      p.rect(X(x), X(KEY_TOP + d / 2), X(KEY_W), X(d))
    }
  }
  // The gaps between the keys.
  p.stroke(alpha(p, L.gap, 0.35))
  p.strokeWeight(Math.max(0.6, weight * 0.35))
  for (let i = i0; i <= i1 + 1; i++) {
    const x = ROOM.keys[0] + i * KEY_W
    p.line(X(x), X(KEY_TOP), X(x), X(KEY_FOOT))
  }
  // The key bed's lip, and the cheeks either side of the keys, in the lamp's edge.
  solid(p, ink, weight * 0.7, L.case)
  p.rect(X((CASE_L + CASE_R) / 2), X(KEY_FOOT + 0.06), X(CASE_R - CASE_L), X(0.12))
  for (const [x0, x1] of [[CASE_L, ROOM.keys[0]], [ROOM.keys[1], CASE_R]]) p.rect(X((x0 + x1) / 2), X((KEY_TOP + KEY_FOOT) / 2), X(x1 - x0), X(KEY_FOOT - KEY_TOP))
  p.stroke(alpha(p, L.rim, 0.85))
  p.strokeWeight(weight * 0.6)
  p.line(X(CASE_L), X(KEY_FOOT + 0.12), X(CASE_R), X(KEY_FOOT + 0.12))
  p.line(X(CASE_L), X(ROOM.case), X(CASE_R), X(ROOM.case))
  p.line(X(LID[1][0]), X(LID[1][1]), X(LID[2][0]), X(LID[2][1]))
  p.line(X(LID[2][0]), X(LID[2][1]), X(LID[3][0]), X(LID[3][1]))

  // The lamp's pool: the one light in the club, on the keys and the action.
  if (!dream) {
    const light = play?.light ?? 1
    if (light > 0.01) {
      glow(p, c, ROOM.lamp[0], -1.6, 7.5, 0.13 * light, BAR.lamp)
      glow(p, c, ROOM.lamp[0], 0.1, 4.5, 0.07 * light, BAR.lamp)
    }
  }
  p.pop()
}

/* ------------------------------------------------------------------ the room */

export interface RoomState {
  /** Whether the room is dressed as the dream (the kiss and after) or is itself. */
  dream: boolean
  /**
   * How far the curtain is open, 0..1, when dressed. Unset, it opens on the
   * kiss when `c.t` is the show's own clock (the scenery), and is open for a
   * part drawing the dream club on its own clock.
   */
  open?: number
  /** The lamp's light, 0..1. Unset, it is on, and in the club it dims after the last chord (show time). */
  light?: number
}

/**
 * The room as scenery (the walls, the floor, the tables, the bar, the lamp,
 * the stairs), drawn behind the parts. The piano is the part's own, since
 * its keys are the machine.
 */
export const room = scenery<RoomState>({
  name: 'room',
  draw: (p: p5, s: RoomState, c: Ctx) => drawRoom(p, s, c),
})

/** The room's materials. */
function roomLook(dream: boolean) {
  return dream
    ? { wall: PAINT.deep, floor: mixHex(PAINT.timber, DREAM.bg, 0.86), curtain: mixHex(PAINT.red, DREAM.bg, 0.18), fold: mixHex(PAINT.red, DREAM.bg, 0.45), dark: PAINT.deep, wood: PAINT.timber, rim: PAINT.gold, lamp: PAINT.beam, glass: PAINT.sea, cloth: PAINT.pink }
    : { wall: BAR.deep, floor: mixHex(BAR.wood, CLUB.bg, 0.86), curtain: mixHex(BAR.oxblood, CLUB.bg, 0.55), fold: mixHex(BAR.oxblood, CLUB.bg, 0.72), dark: BAR.black, wood: BAR.wood, rim: BAR.brass, lamp: BAR.lamp, glass: BAR.green, cloth: BAR.felt }
}

/** How open the curtain is, by the state or the clock (see `RoomState.open`). */
export function curtainOpen(s: RoomState, t: number): number {
  if (!s.dream) return 0
  if (s.open !== undefined) return s.open
  return t >= KISS - 1 && t < DURATION ? smooth(t, KISS_PEAK, KISS_PEAK + 2.6) : 1
}

/* ------------------------------------------------------------------ the fly: the furniture leaves on the burst */

/** A stage fly: how far (cells) a thing on a wire has risen `d` seconds after the wire takes it: a gather, then a steady pull, and gone. */
const FLY_V = 2.4
const flown = (d: number): number => (d <= 0 ? 0 : Math.min(14, FLY_V * (d <= 0.3 ? (d * d) / 0.6 : d - 0.15)))
/**
 * When the stagehands fly each piece of the club's furniture out for the dream, show seconds: from the burst's
 * peak, one after another, the last (her table) clearing the frame on the cymbal's hit at 68.336.
 */
export const FLY_AT = { nearChair: 65.85, nearTable: 66.35, herChairs: 66.9, herTable: 67.38 }
/** How far a piece has flown, and how much of its wire shows (it appears a moment before the pull). Only the dream's own scenery, on show time. */
function flyOf(s: RoomState, t: number, t0: number): { lift: number; wire: number } {
  if (!s.dream || s.open !== undefined || t < KISS - 1 || t >= DURATION) return { lift: 0, wire: 0 }
  return { lift: flown(t - t0), wire: smooth(t, t0 - 0.3, t0 - 0.08) }
}

/** The lamp's light, by the state or the clock. In the club it goes down after the last chord. */
export function lampLight(s: RoomState, t: number): number {
  if (s.light !== undefined) return s.light
  if (s.dream) return 1
  const last = LAST_CHORDS[LAST_CHORDS.length - 1]
  return t > last - 1 ? 1 - smooth(t, last, DURATION - 0.3) : 1
}

/**
 * The room, in the room's cells. As itself: a dark room, the floor, a bar at
 * the left, the curtain behind the piano, tables and chairs in silhouette,
 * the stairs up to the door at the right, the lamp on its cord. Dressed as
 * the dream: the same shapes in paint, the curtain open on a band, the
 * lamp a spotlight, colour on everything.
 */
export function drawRoom(p: p5, s: RoomState, c: Ctx): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const L = roomLook(s.dream)
  const f = frame(p, k)
  const open = curtainOpen(s, c.t)
  const light = lampLight(s, c.t)
  p.push()

  // The floor: a plane below the floor line, to the stairs, and the wall above it (the paper).
  p.noStroke()
  p.fill(L.floor)
  const fx0 = Math.max(f.x0 - 1, -12)
  const fx1 = Math.min(f.x1 + 1, ROOM.stairs[0] + 0.02)
  if (fx1 > fx0) p.rect(X((fx0 + fx1) / 2), X(ROOM.floor + 1.5), X(fx1 - fx0), X(3))
  outline(p, ink, weight * 0.7)
  if (fx1 > fx0) p.line(X(fx0), X(ROOM.floor), X(fx1), X(ROOM.floor))

  // The stage behind the piano: a curtain across it. In the dream it is drawn open, on the band.
  const stageL = -2.2
  const stageR = 13.6
  const stageTop = -9
  if (s.dream) {
    // The flat behind the band: a painted sky, lit as the curtain opens.
    if (open > 0.01) {
      flat(p, c, stageL + 0.3, stageTop + 1.2, stageR - stageL - 0.6, ROOM.floor - stageTop - 1.2, mixHex(PAINT.violet, DREAM.bg, 1 - open), mixHex(PAINT.rose, DREAM.bg, 1 - open), false)
      drawBand(p, c, open)
    }
    // The riser the band stands on, in front of the flat, behind the piano.
    p.noStroke()
    p.fill(L.dark)
    p.rect(X((stageL + stageR) / 2), X(-2.6), X(stageR - stageL - 0.4), X(0.9))
  }
  drawCurtain(p, c, stageL, stageR, stageTop, open, L.curtain, L.fold)
  // The pelmet over it.
  solid(p, ink, weight * 0.7, L.fold)
  p.rect(X((stageL + stageR) / 2), X(stageTop + 1.05), X(stageR - stageL + 0.4), X(0.5))

  // The bar, at the left: the counter, the shelves behind it, bottles catching the lamp.
  if (f.x0 < -1.5) drawBar(p, c, L, light)

  // The tables and the chairs: Mia's, and one nearer the piano. In the dream they fly out on the burst.
  drawTable(p, c, L, ROOM.table, true, flyOf(s, c.t, FLY_AT.herChairs), flyOf(s, c.t, FLY_AT.herTable))
  drawTable(p, c, L, 14.1, false, flyOf(s, c.t, FLY_AT.nearChair), flyOf(s, c.t, FLY_AT.nearTable))

  // The stairs up to the street and the door at their top.
  drawStairs(p, c, L)

  // The lamp on its cord over the piano; in the dream, a spotlight on a yoke.
  drawLamp(p, c, L, s.dream, light)
  p.pop()
}

function drawCurtain(p: p5, c: Ctx, x0: number, x1: number, top: number, open: number, colour: string, fold: string): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const bottom = ROOM.floor + 0.02
  const mid = (x0 + x1) / 2
  const half = (x1 - x0) / 2
  // Each half draws back to its side, gathering as it goes: its width shrinks, its folds crowd.
  for (const side of [-1, 1]) {
    const w = half * (1 - 0.86 * open)
    const inner = mid + side * (half - w)
    const outer = mid + side * half
    p.noStroke()
    p.fill(colour)
    p.rect(X((inner + outer) / 2), X((top + bottom) / 2), X(w), X(bottom - top))
    // Folds: the cloth's shadow lines, closer as it gathers.
    const n = Math.max(3, Math.round(w / (0.55 - 0.32 * open)))
    p.stroke(fold)
    p.strokeWeight(Math.max(1, k * 0.045))
    for (let i = 1; i < n; i++) {
      const x = Math.min(inner, outer) + ((Math.max(inner, outer) - Math.min(inner, outer)) * i) / n
      p.line(X(x), X(top + 1.3), X(x + 0.06 * Math.sin(i * 1.7)), X(bottom - 0.6))
    }
    // A leading edge on the cloth, once it has drawn back (closed, the halves meet, and the seam is a fold).
    if (open > 0.02) {
      outline(p, ink, weight * 0.5)
      p.line(X(inner), X(top + 1.3), X(inner), X(bottom))
    }
  }
}

/** The band, in silhouette on the riser behind the piano, tall enough to show over the lid: drums, an upright bass, a trumpet. */
function drawBand(p: p5, c: Ctx, open: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const a = smooth(open, 0.25, 1)
  if (a <= 0.01) return
  const dark = alpha(p, PAINT.deep, a)
  const riser = -3.05
  p.push()
  p.noStroke()
  p.fill(dark)
  // The drummer, at the left: a figure on a stool, the kit before him, a cymbal on a stand high at his side.
  const dx = 0.6
  p.ellipse(X(dx), X(riser - 2.55), X(0.5), X(0.5))
  p.rect(X(dx), X(riser - 1.55), X(0.75), X(1.5), X(0.15))
  p.ellipse(X(dx - 0.95), X(riser - 0.75), X(1.4), X(1.4))
  p.rect(X(dx + 1.0), X(riser - 1.35), X(0.06), X(2.7))
  p.ellipse(X(dx + 1.0), X(riser - 2.7), X(1.3), X(0.12))
  // The bass player, at the right: the upright bass's body and its long neck up over everything.
  const bx = 10.6
  p.ellipse(X(bx), X(riser - 2.55), X(0.5), X(0.5))
  p.rect(X(bx), X(riser - 1.5), X(0.8), X(1.6), X(0.15))
  p.ellipse(X(bx + 0.9), X(riser - 1.35), X(1.35), X(2.0))
  p.ellipse(X(bx + 0.9), X(riser - 2.45), X(1.05), X(1.3))
  p.rect(X(bx + 0.9), X(riser - 4.1), X(0.16), X(3.0))
  // The trumpet, in the middle: a figure, the horn up and out to the right.
  const tx = 5.4
  p.ellipse(X(tx), X(riser - 2.7), X(0.5), X(0.5))
  p.rect(X(tx), X(riser - 1.6), X(0.75), X(1.7), X(0.15))
  p.push()
  p.translate(X(tx + 0.3), X(riser - 2.55))
  p.rotate(-0.45)
  p.rect(X(0.7), 0, X(1.4), X(0.14))
  p.triangle(X(1.35), X(-0.08), X(1.35), X(0.08), X(1.95), X(0.32))
  p.triangle(X(1.35), X(-0.08), X(1.95), X(-0.32), X(1.95), X(0.32))
  p.pop()
  // The stands' feet, and the riser's edge.
  outline(p, alpha(p, ink, 0.5 * a).toString(), weight * 0.5)
  p.line(X(-1.6), X(riser), X(12.9), X(riser))
  p.pop()
}

function drawBar(p: p5, c: Ctx, L: ReturnType<typeof roomLook>, light: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const x0 = -7.6
  const x1 = -2.3
  // The back bar: two shelves against the wall, bottles on them.
  p.noStroke()
  p.fill(L.wall)
  p.rect(X((x0 + x1) / 2), X(-1.6), X(x1 - x0 - 0.2), X(3.6))
  for (const y of [-2.75, -1.75]) {
    solid(p, ink, weight * 0.6, L.wood)
    p.rect(X((x0 + x1) / 2), X(y), X(x1 - x0 - 0.5), X(0.08))
    for (let i = 0; i < 9; i++) {
      const bx = x0 + 0.55 + i * 0.52 + (hash(i, 3) - 0.5) * 0.1
      const h = 0.45 + hash(i, 7 + y) * 0.35
      p.noStroke()
      p.fill(i % 3 === 1 ? L.dark : L.glass)
      p.rect(X(bx), X(y - h / 2 - 0.04), X(0.17), X(h), X(0.03))
      p.rect(X(bx), X(y - h - 0.12), X(0.06), X(0.18))
      // The lamp on the glass: one bright point a bottle.
      p.fill(alpha(p, L.lamp, 0.75 * light))
      p.circle(X(bx + 0.045), X(y - h * 0.55), X(0.035))
    }
  }
  // The counter, and its front, and the rail along it.
  solid(p, ink, weight * 0.7, L.dark)
  p.rect(X((x0 + x1) / 2), X(0.42), X(x1 - x0), X(1.16))
  solid(p, ink, weight * 0.7, L.wood)
  p.rect(X((x0 + x1) / 2), X(-0.2), X(x1 - x0 + 0.2), X(0.12))
  p.stroke(alpha(p, L.rim, 0.8 * light))
  p.strokeWeight(weight * 0.6)
  p.line(X(x0 - 0.05), X(0.72), X(x1 + 0.05), X(0.72))
  // Stools.
  for (const sx of [-6.4, -4.9, -3.4]) {
    solid(p, ink, weight * 0.6, L.dark)
    p.rect(X(sx), X(0.14), X(0.42), X(0.1))
    outline(p, ink, weight * 0.6)
    p.line(X(sx), X(0.19), X(sx), X(ROOM.floor))
  }
}

type Fly = { lift: number; wire: number }
const STILL: Fly = { lift: 0, wire: 0 }

/** A wire from (x, y) up out of the frame, as much of it as shows. */
function wire(p: p5, c: Ctx, x: number, y: number, a: number): void {
  if (a <= 0.01) return
  const { k, ink, weight } = c
  p.stroke(alpha(p, ink, 0.9 * a))
  p.strokeWeight(weight * 0.45)
  p.noFill()
  p.line(x * k, y * k, x * k, (y - 60) * k)
}

function drawTable(p: p5, c: Ctx, L: ReturnType<typeof roomLook>, x: number, near: boolean, chairs: Fly = STILL, table: Fly = STILL): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const floor = ROOM.floor
  const w = near ? 1.15 : 1.0
  // Chairs, in silhouette, either side; flown out on their wires when the dream takes the room.
  for (const side of near ? [-1, 1] : [1]) {
    const cx = x + side * (w / 2 + 0.36)
    const f = floor - chairs.lift
    wire(p, c, cx - side * 0.15, f - 1.12, chairs.wire)
    p.noStroke()
    p.fill(L.dark)
    p.rect(X(cx), X(f - 0.42), X(0.34), X(0.09))
    p.rect(X(cx - side * 0.15), X(f - 0.75), X(0.07), X(0.75))
    outline(p, ink, weight * 0.55)
    for (const dx of [-0.13, 0.13]) p.line(X(cx + dx), X(f - 0.4), X(cx + dx), X(f))
  }
  // The table: a round top with a cloth, on a pedestal.
  const top = floor - table.lift - 0.62
  const foot = floor - table.lift
  wire(p, c, x, top - (near ? 0.22 : 0.08), table.wire)
  p.noStroke()
  p.fill(L.dark)
  p.rect(X(x), X((top + foot) / 2 + 0.05), X(0.1), X(foot - top - 0.1))
  p.rect(X(x), X(foot - 0.04), X(0.5), X(0.08))
  solid(p, ink, weight * 0.6, L.cloth)
  p.ellipse(X(x), X(top), X(w), X(0.16))
  // A candle in a glass on Mia's table: the one small light at her end of the room.
  if (near) {
    solid(p, ink, weight * 0.5, L.glass)
    p.rect(X(x), X(top - 0.12), X(0.1), X(0.16), X(0.02))
    p.noStroke()
    p.fill(L.lamp)
    p.circle(X(x), X(top - 0.14), X(0.045))
    glow(p, c, x, top - 0.14, 0.7, 0.35, L.lamp)
  }
}

function drawStairs(p: p5, c: Ctx, L: ReturnType<typeof roomLook>): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  // The flight: the dark under the steps, the treads and risers as one line, the rail above.
  p.noStroke()
  p.fill(L.dark)
  p.beginShape()
  p.vertex(X(ROOM.stairs[0]), X(ROOM.floor))
  for (let i = 0; i < STEPS; i++) {
    p.vertex(X(ROOM.stairs[0] + STEP_W * i), X(treadY(i)))
    p.vertex(X(ROOM.stairs[0] + STEP_W * (i + 1)), X(treadY(i)))
  }
  p.vertex(X(DOOR.x1 + 0.4), X(DOOR.sill))
  p.vertex(X(DOOR.x1 + 0.4), X(ROOM.floor + 3))
  p.vertex(X(ROOM.stairs[0]), X(ROOM.floor + 3))
  p.endShape(p.CLOSE)
  outline(p, ink, weight * 0.75)
  p.beginShape()
  p.vertex(X(ROOM.stairs[0]), X(ROOM.floor))
  for (let i = 0; i < STEPS; i++) {
    p.vertex(X(ROOM.stairs[0] + STEP_W * i), X(treadY(i)))
    p.vertex(X(ROOM.stairs[0] + STEP_W * (i + 1)), X(treadY(i)))
  }
  p.vertex(X(DOOR.x1 + 0.4), X(DOOR.sill))
  p.endShape()
  // The rail: a line the nosings' height above, on three posts.
  const railUp = 0.95
  outline(p, ink, weight * 0.6)
  p.line(X(ROOM.stairs[0]), X(ROOM.floor - railUp), X(ROOM.stairs[1]), X(DOOR.sill - railUp))
  for (const i of [0, 3, 5.7]) {
    const x = ROOM.stairs[0] + STEP_W * i + 0.05
    const y = ROOM.floor - STEP_H * i
    p.line(X(x), X(y), X(x), X(y - railUp))
  }
  // The doorway at the top: the jambs and the head, and the dark of the street beyond, until it is opened.
  p.noStroke()
  p.fill(L.dark)
  p.rect(X((DOOR.x0 + DOOR.x1) / 2), X((DOOR.top + DOOR.sill) / 2), X(DOOR.x1 - DOOR.x0), X(DOOR.sill - DOOR.top))
  outline(p, ink, weight * 0.8)
  p.line(X(DOOR.x0), X(DOOR.sill), X(DOOR.x0), X(DOOR.top))
  p.line(X(DOOR.x0), X(DOOR.top), X(DOOR.x1), X(DOOR.top))
  p.line(X(DOOR.x1), X(DOOR.top), X(DOOR.x1), X(DOOR.sill))
  solid(p, ink, weight * 0.6, L.wood)
  p.rect(X((DOOR.x0 + DOOR.x1) / 2), X(DOOR.top - 0.06), X(DOOR.x1 - DOOR.x0 + 0.3), X(0.12))
}

function drawLamp(p: p5, c: Ctx, L: ReturnType<typeof roomLook>, dream: boolean, light: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const [lx, ly] = ROOM.lamp
  outline(p, ink, weight * 0.55)
  p.line(X(lx), X(ly - 6), X(lx), X(ly - 0.3))
  if (dream) {
    // A spotlight on a yoke, aimed down the room.
    solid(p, ink, weight * 0.7, PAINT.timber)
    p.rect(X(lx), X(ly - 0.2), X(0.5), X(0.1))
    p.push()
    p.translate(X(lx), X(ly + 0.05))
    p.rotate(0.5)
    solid(p, ink, weight * 0.7, PAINT.deep)
    p.rect(0, 0, X(0.5), X(0.36), X(0.04))
    solid(p, ink, weight * 0.6, L.lamp)
    p.rect(X(0.02), X(0.2), X(0.5), X(0.06))
    p.pop()
    return
  }
  // A brass shade on its cord, the bulb under it.
  solid(p, ink, weight * 0.7, L.rim)
  p.quad(X(lx - 0.16), X(ly - 0.3), X(lx + 0.16), X(ly - 0.3), X(lx + 0.5), X(ly + 0.12), X(lx - 0.5), X(ly + 0.12))
  p.noStroke()
  p.fill(alpha(p, L.lamp, light))
  p.ellipse(X(lx), X(ly + 0.12), X(0.98), X(0.1))
  if (light > 0.01) glow(p, c, lx, ly + 0.2, 1.1, 0.6 * light, L.lamp)
}

/** The street's light through the door, down the stairs: for the kiss, and the dream club. */
export function doorLight(p: p5, c: Ctx, open: number, colour = PAINT.beam): void {
  if (open <= 0.01) return
  const { k } = c
  const X = (v: number) => v * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.push()
  p.noStroke()
  ctx.fillStyle = hexA(colour, 0.85 * open)
  ctx.fillRect(X(DOOR.x0 + 0.03), X(DOOR.top + 0.03), X((DOOR.x1 - DOOR.x0 - 0.06) * open), X(DOOR.sill - DOOR.top - 0.03))
  beam(p, c, [DOOR.x0 + 0.2, DOOR.sill - 0.9], [ROOM.stairs[0] - 1.2, ROOM.floor + 0.3], 3.2, 0.32 * open, colour)
  p.pop()
}
