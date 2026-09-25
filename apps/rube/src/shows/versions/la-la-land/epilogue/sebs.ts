import type p5 from 'p5'
import { outline, solid } from '../../../../../../../src/core/draw'
import { easeInQuad, easeInOutSine, easeOutQuad } from '../../../../../../../src/core/ease'
import { laneAt, mixHex, R, type Lane, type Pt } from '../../../../parts'
import { alpha, box, carried, hash, part, route, smooth, type Companion, type Ctx, type PartShot, type Way } from './kit'
import { CHORUS, STRUCK } from './music'
import { beam, flat, glow } from './rig'
import { DOOR, ROOM, drawPiano, drawRoom } from './room'
import { DREAM, PAINT } from './worlds'

/**
 * Seb's, in the dream: the choral waltz (272.44 → 336.2), one long swell to
 * its peak, and almost nothing in it to strike.
 *
 * A street at night, painted, receding behind a pavement the two walk along
 * at a stroll. Streetlamps light ahead of them as they come. A neon sign
 * projects from the building: a grand piano in red neon and a gold note,
 * flickering on as the chorus comes in (272.44). At the end of the block a
 * stairwell goes down under the pavement, a switchback, to the door of a
 * basement club: the door is thrown open for them on the swell's biggest
 * accent (292.70) and the club's light comes up the stairs. Inside, the
 * club dressed as the dream, drawn in cutaway under the street: the room
 * and the piano are the club builder's (`room.ts`), laid out exactly as the
 * real one, with the finale's room's origin at this part's exit. Down the
 * room's own stairs, across to her table; he sits, she comes a beat behind
 * and taps him (298.64). They sit through the swell. As it gathers he
 * leaves her and crosses to the piano; on the hush before the peak the
 * pianist is flown out and his bench sinks into a trap; Seb rolls onto it
 * and the trap lifts him to the keys through the peak (335), where the
 * whole club's light swells; he rolls onto the keys' left end and is at
 * rest there as the music drops out (336.2), the set is struck, and the
 * finale opens on the same framing.
 *
 * The part's frame: the ball comes in at (-0.5, 0) on the pavement at a
 * cell a second, she (-0.32, 0) behind him. The exit is at (E, 8): the
 * finale's entry cell, so the room's origin is there and its floor at 9.
 */

/* ------------------------------------------------------------------ the clock (show seconds) */

/** The neon flickers on as the chorus enters. */
const NEON = CHORUS
/** The club's door is thrown open for them, on the loudest accent of the stretch. */
const DOOR_OPEN = 292.7
/** She catches up at the table and taps him. */
const TAP = 298.64
export const SEBS_HITS: number[] = [NEON, DOOR_OPEN, TAP]

/** He leaves her at the table. */
const LEAVE = 322.3
/** The hush before the peak: the pianist rises (flown out), and the bench sinks into its trap. */
const FLY = 328.0
const SINK0 = 328.4
const SINK1 = 329.6
/** He is on the bench, and the trap lifts him to the keys through the peak. */
const LIFT0 = 330.64
const LIFT1 = 334.6
/** The music drops out; he is at rest on the keys' left end. */
const END = STRUCK

/* ------------------------------------------------------------------ the set */

/** The room's origin in this frame: the exit cell. The room's numbers (`ROOM`) are offset by this. */
const O: Pt = [-13.7, 8]
const rx = (x: number): number => O[0] + x
const ry = (y: number): number => O[1] + y

/** The stairhead: where the pavement ends and the stairwell goes down; its far wall. */
const SH = 10.4
const WELL_R = SH + 4
/** The half landing (a turn), and the landing outside the door. */
const HALF_Y = 3
const LAND_Y = ry(ROOM.door[1])
const LAND_X = SH + 1
/** The doorway, in this frame. */
const DOOR_L = rx(DOOR.x0)
const DOOR_R = rx(DOOR.x1)
const DOOR_TOP = ry(DOOR.top)
const SILL = ry(DOOR.sill)
/** The club's ceiling: the underside of the street. */
const CEIL = ry(-6)
/** The floor, and a ball on it. */
const FLOOR_LINE = ry(ROOM.floor)
const FLOOR_Y = ry(ROOM.floorBall)
/** The foot of the room's stairs, and her table. */
const FOOT: Pt = [rx(ROOM.stairs[0]), FLOOR_Y]
const TABLE_X = rx(ROOM.table)
/** Where he sits: touching her, on the piano side of the table. */
const SEAT_X = TABLE_X - 2 * R - 0.02
/** The pianist's bench, before the bass end of the keys, and its top at rest; the trap it sits on. */
const BENCH_X = rx(1.15)
const BENCH_W = 1.1
const BENCH_TOP = ry(0.45)
/** The keys' left end (the lane's end) and the ball's height on the keys. */
const KEYS_L = rx(ROOM.keys[0])
const KEY_Y = ry(0)
const KEY_TOP = ry(R)
/** The set's extent: the bar's back at the left, the painted street's far edge at the right. */
const X0 = -22
const X1 = 21

/** The streetlamps along the pavement, and the neon sign projecting over it before the stairwell. */
const LAMPS = [1.4, 4.6, 7.0]
const LAMP_H = 2.05
/**
 * The sconces down the stairwell: on its back wall at the stairhead, over the turn, between the flights, and over
 * the door; and the show time each comes up (null: on throughout), a little before the two reach the flight above it.
 */
const SCONCES: [number, number, number | null][] = [
  [SH + 0.5, 0.95, 280.7],
  [WELL_R - 0.5, 1.65, 282.0],
  [SH + 2.2, 3.55, 286.3],
  [DOOR_R + 0.6, DOOR_TOP - 0.55, null],
]
const SIGN: Pt = [9.0, -2.55]

/* ------------------------------------------------------------------ the mechanisms' clocks */

/** The bench's top at show time `T`: at rest, sunk flush into its trap, and lifted to the key tops. */
function benchTop(T: number): number {
  if (T < SINK0) return BENCH_TOP
  if (T < SINK1) return BENCH_TOP + (FLOOR_LINE - BENCH_TOP) * easeInOutSine((T - SINK0) / (SINK1 - SINK0))
  if (T < LIFT0) return FLOOR_LINE
  if (T < LIFT1) return FLOOR_LINE + (KEY_TOP - FLOOR_LINE) * easeInOutSine((T - LIFT0) / (LIFT1 - LIFT0))
  return KEY_TOP
}

/** The door's angle, 0 shut to 1 open: thrown open in a flash, with a small shiver on its stop. */
function doorOpen(T: number): number {
  const s = T - DOOR_OPEN
  if (s < -0.16) return 0
  if (s < 0) return easeOutQuad((s + 0.16) / 0.16)
  return 1 - 0.07 * Math.exp(-s / 0.14) * Math.sin(s * 34)
}

/** The neon's brightness: dark, then on with a flicker, then steady with the faintest hum. */
function neonOn(T: number): number {
  const s = T - NEON
  if (s < 0) return 0
  if (s < 0.08) return 1
  if (s < 0.16) return 0.12
  if (s < 0.22) return 0.9
  if (s < 0.3) return 0.08
  if (s < 0.36) return 1
  if (s < 0.42) return 0.3
  return 1 - 0.035 * (0.5 + 0.5 * Math.sin(T * 6.3))
}

/** The club's light: on, a shade down on the hush, and swelling to the peak. */
function clubLight(T: number): number {
  return 0.78 - 0.14 * smooth(T, 326.8, 328.4) + 0.36 * smooth(T, 328.8, 335)
}

/** How far up the pianist has been flown, in cells (0 while he plays). */
function pianistUp(T: number): number {
  return 8 * easeInQuad(smooth(T, FLY, FLY + 2.1))
}

interface SebsState {
  begin: number
  /** When he passes each streetlamp, so each lights ahead of him and stays lit. */
  lampAt: number[]
}

export const sebs = part<SebsState>(
  {
    name: 'sebs',
    draw: (p, s, c) => drawSebs(p, s, c),
  },
  (slot) => {
    const at = (T: number) => T - slot.begin
    const end = at(END)
    // The street, at a stroll; the stairhead; down the switchback to the door, which opens as he reaches it.
    const stairhead = 281.92
    const f1 = stairhead + 4.24
    const half = f1 + 1.0
    const f2 = half + 4.24
    const jamb = f2 + (LAND_X - DOOR_R)
    const through = jamb + 0.75
    const foot = through + 2.71
    const ways: Way[] = [
      { at: 0, p: [-0.5, 0] },
      { at: at(stairhead), p: [SH, 0] },
      { at: at(f1), p: [SH + 3, HALF_Y] },
      { at: at(half), p: [WELL_R, HALF_Y] },
      { at: at(f2), p: [LAND_X, LAND_Y] },
      { at: at(jamb), p: [DOOR_R, LAND_Y] },
      { at: at(through), p: [DOOR_L, LAND_Y], ramp: [1.0, 1.4] },
      { at: at(foot), p: FOOT, ramp: [1.4, 1.8] },
      { at: at(foot + 0.78), p: [FOOT[0] - 1.4, FLOOR_Y] },
      { at: at(298.54), p: [SEAT_X, FLOOR_Y], ramp: [1.8, 0] },
      // Her tap: a small give, and back.
      { at: at(TAP), p: [SEAT_X, FLOOR_Y] },
      { at: at(TAP) + 0.12, p: [SEAT_X - 0.035, FLOOR_Y], ease: 'out' },
      { at: at(TAP) + 0.5, p: [SEAT_X, FLOOR_Y], ease: 'inout' },
      // Sitting with her through the swell: one lean toward her.
      { at: at(310.0), p: [SEAT_X, FLOOR_Y] },
      { at: at(311.2), p: [SEAT_X + 0.05, FLOOR_Y], ease: 'inout' },
      { at: at(313.2), p: [SEAT_X, FLOOR_Y], ease: 'inout' },
      // He leaves her and crosses to the piano, arriving on the sunk bench.
      { at: at(LEAVE), p: [SEAT_X, FLOOR_Y] },
      { at: at(LEAVE) + 2.2, p: [SEAT_X - 2.75, FLOOR_Y], ramp: [0, 2.5] },
      { at: at(LEAVE) + 2.2 + (SEAT_X - 2.75 - (BENCH_X + 2.4)) / 2.5, p: [BENCH_X + 2.4, FLOOR_Y] },
      { at: at(LIFT0), p: [BENCH_X, FLOOR_Y], ramp: [2.5, 0] },
    ]
    const segs = route(ways)
    // The trap lifts him to the keys.
    segs.push(...carried((t) => [BENCH_X, benchTop(t + slot.begin) - R], at(LIFT0), at(LIFT1), 48))
    // Off the bench onto the keys' left end, at rest as the music drops out.
    const last = end - at(LIFT1)
    const v = (2 * (BENCH_X - KEYS_L)) / last
    // From rest, gathering over the first half and easing to rest over the second: no kink off the bench.
    segs.push(...route([
      { at: at(LIFT1), p: [BENCH_X, KEY_Y] },
      { at: at(LIFT1) + last / 2, p: [(BENCH_X + KEYS_L) / 2, KEY_Y], ramp: [0, v] },
      { at: end, p: [KEYS_L, KEY_Y], ramp: [v, 0] },
    ]))
    const lane: Lane = { segs, fire: at(DOOR_OPEN) }

    // Mia: a step behind him all the way (her delay grows where she hesitates and shrinks where she catches up), and
    // at the table she stops on her own side, touching him, on the tap. Then at her table to the end.
    const behind = (T: number, d: number, pt: Pt, extra: Partial<Way> = {}): Way => ({ at: at(T) + d, p: pt, ...extra })
    const mways: Way[] = [
      { at: 0, p: [-0.82, 0] },
      behind(stairhead, 0.32, [SH, 0]),
      behind(stairhead, 0.85, [SH, 0]),
      behind(f1, 0.55, [SH + 3, HALF_Y]),
      behind(half, 0.45, [WELL_R, HALF_Y]),
      behind(f2, 0.4, [LAND_X, LAND_Y]),
      behind(jamb, 0.4, [DOOR_R, LAND_Y]),
      behind(through, 0.4, [DOOR_L, LAND_Y], { ramp: [1.0, 1.4] }),
      behind(foot, 0.4, FOOT, { ramp: [1.4, 1.8] }),
      { at: at(TAP), p: [TABLE_X, FLOOR_Y], ramp: [1.8, (2 * (FOOT[0] - TABLE_X)) / (TAP - foot - 0.4) - 1.8] },
      // A lean toward him as they settle; a start after him as he leaves, and back to her place.
      { at: at(306.0), p: [TABLE_X, FLOOR_Y] },
      { at: at(306.9), p: [TABLE_X - 0.04, FLOOR_Y], ease: 'inout' },
      { at: at(308.4), p: [TABLE_X, FLOOR_Y], ease: 'inout' },
      { at: at(LEAVE) + 0.5, p: [TABLE_X, FLOOR_Y] },
      { at: at(LEAVE) + 1.7, p: [TABLE_X - 0.16, FLOOR_Y], ease: 'inout' },
      { at: at(LEAVE) + 3.2, p: [TABLE_X - 0.16, FLOOR_Y] },
      { at: at(331.0), p: [TABLE_X, FLOOR_Y], ease: 'inout' },
      { at: end, p: [TABLE_X, FLOOR_Y] },
    ]
    const mia: Lane = { segs: route(mways), fire: 0 }
    const her = (T: number): Companion => {
      const q = laneAt(mia, T - slot.begin)
      return { x: q.x, y: q.y }
    }

    const lampAt = LAMPS.map((x) => slot.begin + ((x + 0.5) * at(stairhead)) / (SH + 0.5))
    return {
      cells: box(X0, -7, X1, 12, 2),
      exit: [O[0], O[1]],
      lane,
      state: { begin: slot.begin, lampAt },
      company: [{ from: slot.begin, to: slot.end, at: her }],
    }
  },
  (slot) => shotsFor(slot),
)

/* ------------------------------------------------------------------ the camera */

function shotsFor(slot: { begin: number; end: number }): PartShot[] {
  return [
    // A wide of the street: the sign at the end of the block flickers on, and the two cross the frame toward it.
    { t: slot.begin, cells: 7.4, hold: [4.5, -2.1] },
    { t: 280.6, cells: 7.4, hold: [4.5, -2.1] },
    // A wide of the stairwell: they go down the switchback across it, and the door at its foot opens for them.
    { t: 284.2, cells: 7.8, hold: [11.4, 2.9] },
    { t: 291.4, cells: 7.8, hold: [11.4, 2.9] },
    // Down into the room with them, to her table.
    { t: 296.4, cells: 8.2, hold: [rx(15.4), 6.4], w: 0.7 },
    { t: TAP, cells: 7.4, hold: [rx(14.6), 6.9] },
    // From the tap to the end, one move that never parks: a slow draw back from the table to the whole club through
    // the swell, drifting left across the room toward the piano the whole while (every key carries the move on), so
    // that when he leaves her the camera is already leading him there; then in with him onto the keys.
    { t: 306, cells: 8.6, hold: [rx(13.8), 6.75] },
    { t: 313, cells: 10.4, hold: [rx(12.4), 6.55] },
    { t: LEAVE, cells: 11.4, hold: [rx(10.6), 6.45] },
    { t: 328.5, cells: 11.7, hold: [rx(9.0), 6.4] },
    { t: 334.0, cells: 10.6, hold: [rx(8.1), 6.7] },
    // Through the peak, in on him at the keys: the finale copies this for the match cut.
    { t: slot.end, cells: 3.0, hold: [KEYS_L, KEY_Y - 0.45] },
  ]
}

/* ------------------------------------------------------------------ drawing */

function drawSebs(p: p5, s: SebsState, c: Ctx): void {
  const T = c.t + s.begin
  // The club under the street exists only once this part has them: nothing of it before, in the last part's space.
  if (c.t >= 0) drawClub(p, c, T)
  drawStreet(p, s, c, T)
  drawStairwell(p, c, T)
}

/** The street, in front of a painted flat: the sky, a skyline, the road receding; the pavement, its lamps, the sign. */
function drawStreet(p: p5, s: SebsState, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const top = -7.2
  // The flat: a night sky, violet at the horizon with the city's glow. Its left end is not a standing edge beside the
  // last part's lighter sky: it fades in over three cells, and the ground under the pavement with it.
  flat(p, c, -0.5, top, X1 + 0.5, R - top, PAINT.deep, PAINT.violet, false)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const fadeFrom = -3.5
  const slices = 24
  const sky = ctx.createLinearGradient(0, X(top), 0, X(R))
  sky.addColorStop(0, PAINT.deep)
  sky.addColorStop(1, PAINT.violet)
  ctx.save()
  for (let i = 0; i < slices; i++) {
    const x0 = fadeFrom + ((-0.5 - fadeFrom) * i) / slices
    const x1 = fadeFrom + ((-0.5 - fadeFrom) * (i + 1)) / slices
    ctx.globalAlpha = smooth((i + 0.5) / slices, 0, 1)
    ctx.fillStyle = sky
    ctx.fillRect(X(x0), X(top), X(x1 - x0) + 0.5, X(R - top))
    ctx.fillStyle = PAINT.deep
    ctx.fillRect(X(x0), X(R), X(x1 - x0) + 0.5, X(CEIL - R))
  }
  ctx.restore()
  outline(p, ink, weight * 0.7)
  p.line(X(X1), X(top), X(X1), X(R))
  const horizon = -2.35
  // The skyline, painted: blocks standing on the horizon, a few windows lit.
  p.push()
  p.noStroke()
  const blocks: [number, number, number][] = [
    [-0.5, 2.6, 1.7],
    [2.1, 1.9, 2.6],
    [4.0, 1.4, 1.3],
    [5.4, 2.2, 2.1],
    [11.2, 1.8, 1.5],
    [13.0, 2.4, 2.9],
    [15.4, 1.5, 1.2],
    [16.9, 2.3, 2.3],
    [19.2, 2.3, 1.6],
  ]
  for (let i = 0; i < blocks.length; i++) {
    const [x, w, h] = blocks[i]
    solid(p, ink, weight * 0.45, DREAM.bg)
    p.rect(X(x + w / 2), X(horizon - h / 2), X(w), X(h))
    p.noStroke()
    p.fill(PAINT.gold)
    const n = 1 + Math.floor(hash(i, 2) * 2)
    for (let j = 0; j < n; j++) {
      const wx = x + 0.25 + hash(i, j, 5) * (w - 0.5)
      const wy = horizon - 0.35 - hash(i, j, 9) * (h - 0.7)
      p.rect(X(wx), X(wy), X(0.11), X(0.16))
    }
  }
  // The road, receding to a point on the horizon, and painted lamps along it going small.
  const vp: Pt = [7.4, horizon]
  p.noStroke()
  p.fill(PAINT.deep)
  p.triangle(X(1.9), X(R + 0.02), X(12.9), X(R + 0.02), X(vp[0]), X(vp[1]))
  for (const u of [0.22, 0.46, 0.66, 0.8]) {
    const y = R + (vp[1] - R) * u
    const h = 1.5 * (1 - u)
    for (const side of [-1, 1]) {
      const x = vp[0] + side * (5.5 * (1 - u) + 0.15)
      outline(p, ink, weight * 0.4)
      p.line(X(x), X(y), X(x), X(y - h))
      p.noStroke()
      p.fill(PAINT.gold)
      p.rect(X(x), X(y - h), X(0.1 * (1 - u) + 0.04), X(0.08 * (1 - u) + 0.03))
    }
  }
  p.pop()
  // The pavement: a slab to the stairhead, and on past the stairwell; the kerb along its top.
  p.push()
  p.noStroke()
  p.fill(PAINT.deep)
  p.rect(X((SH - 0.5) / 2), X((R + CEIL) / 2), X(SH + 0.5), X(CEIL - R))
  p.rect(X((WELL_R + X1) / 2), X((R + CEIL) / 2), X(X1 - WELL_R), X(CEIL - R))
  outline(p, ink, weight * 0.8)
  p.line(X(-0.5), X(R), X(SH), X(R))
  p.line(X(WELL_R), X(R), X(X1), X(R))
  p.pop()
  // The streetlamps: each lights as they come under it, and stays lit. Nothing lights before the chorus is in.
  for (let i = 0; i < LAMPS.length; i++) {
    const x = LAMPS[i]
    const lit = smooth(T, Math.max(s.lampAt[i] - 2.3, s.begin), s.lampAt[i] - 0.7)
    drawLamp(p, c, x, lit)
  }
  drawSign(p, c, neonOn(T))
}

/**
 * A streetlamp on the pavement at `x`, the same lamp as the one outside the house in `home.ts` (a post, a short arm
 * to the left, a flat head, a cone of light down to the pavement), so the street is one street across the seam.
 * `lit` 0..1: it comes up as the two come under it.
 */
function drawLamp(p: p5, c: Ctx, x: number, lit: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const top = -LAMP_H
  const hx = x - 0.3
  p.push()
  solid(p, ink, weight * 0.9, PAINT.deep)
  p.rect(X(x), X((top + R) / 2), X(0.08), X(R - top))
  outline(p, ink, weight * 0.8)
  p.line(X(x), X(top), X(hx), X(top - 0.05))
  const head = () => p.quad(X(hx - 0.1), X(top - 0.05), X(hx + 0.1), X(top - 0.05), X(hx + 0.13), X(top + 0.12), X(hx - 0.13), X(top + 0.12))
  solid(p, ink, weight * 0.7, PAINT.deep)
  head()
  if (lit > 0.01) {
    p.noStroke()
    p.fill(alpha(p, PAINT.beam, lit))
    head()
    glow(p, c, hx, top + 0.06, 1.3, 0.45 * lit, PAINT.beam)
    beam(p, c, [hx, top + 0.12], [hx, R], 2.2, 0.1 * lit)
  }
  p.pop()
}

/** The club's sign, in neon on a bracket over the pavement: a grand piano, side on, in red, and a note in gold. */
function drawSign(p: p5, c: Ctx, on: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const [sx, sy] = SIGN
  p.push()
  // The bracket from the building's face (behind the flat's edge), and the sign's dark board.
  outline(p, ink, weight * 0.7)
  p.line(X(sx + 0.95), X(sy - 0.75), X(sx + 0.95), X(sy + 0.2))
  p.line(X(sx + 0.95), X(sy - 0.6), X(sx - 0.9), X(sy - 0.6))
  solid(p, ink, weight * 0.6, DREAM.bg)
  p.rect(X(sx), X(sy), X(1.9), X(1.25), X(0.06))
  if (on > 0.01) glow(p, c, sx, sy, 1.9, 0.38 * on, PAINT.red)
  const red = on > 0.01 ? alpha(p, PAINT.red, 0.2 + 0.8 * on) : alpha(p, PAINT.red, 0.2)
  const tube = (colour: p5.Color, w: number) => {
    p.stroke(colour)
    p.strokeWeight(w)
    p.noFill()
  }
  // The piano, side on: the case with its curved tail, the lid up on its stick, the keyboard at the left, two legs.
  const piano = (w: number, colour: p5.Color) => {
    tube(colour, w)
    p.beginShape()
    p.vertex(X(sx - 0.7), X(sy + 0.05))
    p.vertex(X(sx + 0.45), X(sy + 0.05))
    p.quadraticVertex(X(sx + 0.78), X(sy + 0.05), X(sx + 0.78), X(sy - 0.14))
    p.vertex(X(sx + 0.78), X(sy - 0.24))
    p.vertex(X(sx - 0.7), X(sy - 0.24))
    p.endShape(p.CLOSE)
    p.line(X(sx - 0.7), X(sy - 0.24), X(sx - 0.86), X(sy - 0.24))
    p.line(X(sx - 0.86), X(sy - 0.24), X(sx - 0.86), X(sy - 0.1))
    p.line(X(sx - 0.86), X(sy - 0.1), X(sx - 0.7), X(sy - 0.1))
    p.line(X(sx + 0.72), X(sy - 0.24), X(sx - 0.2), X(sy - 0.62))
    p.line(X(sx + 0.15), X(sy - 0.24), X(sx + 0.3), X(sy - 0.45))
    for (const lx of [sx - 0.55, sx + 0.55]) p.line(X(lx), X(sy + 0.05), X(lx), X(sy + 0.34))
  }
  piano(weight * 1.6, red)
  if (on > 0.3) piano(weight * 0.55, alpha(p, PAINT.cream, 0.55 * on))
  // The note, in gold: a head, a stem, a flag.
  const gold = on > 0.01 ? alpha(p, PAINT.gold, 0.2 + 0.8 * on) : alpha(p, PAINT.gold, 0.2)
  const note = (w: number, colour: p5.Color) => {
    tube(colour, w)
    p.push()
    p.translate(X(sx + 0.45), X(sy - 0.47))
    p.rotate(-0.4)
    p.ellipse(0, 0, X(0.2), X(0.14))
    p.pop()
    p.line(X(sx + 0.53), X(sy - 0.5), X(sx + 0.53), X(sy - 0.98))
    p.bezier(X(sx + 0.53), X(sy - 0.98), X(sx + 0.68), X(sy - 0.9), X(sx + 0.72), X(sy - 0.78), X(sx + 0.6), X(sy - 0.66))
  }
  note(weight * 1.5, gold)
  if (on > 0.3) note(weight * 0.5, alpha(p, PAINT.cream, 0.55 * on))
  p.pop()
}

/** The stairwell down from the pavement: two flights and a turn, to the landing outside the door. */
function drawStairwell(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  p.push()
  // The well, cut into the ground: its back wall a shade of warmth over the paper, so it reads as a lit stairwell.
  p.noStroke()
  p.fill(mixHex(PAINT.deep, PAINT.violet, 0.2))
  p.rect(X((SH + WELL_R) / 2), X((R + SILL) / 2), X(WELL_R - SH), X(SILL - R))
  // The dark under each flight, then the treads.
  const flight = (x0: number, y0: number, x1: number, y1: number) => {
    const n = 6
    p.noStroke()
    p.fill(PAINT.deep)
    p.beginShape()
    p.vertex(X(x0), X(y0))
    for (let i = 0; i < n; i++) {
      const xa = x0 + ((x1 - x0) * i) / n
      const xb = x0 + ((x1 - x0) * (i + 1)) / n
      const ya = y0 + ((y1 - y0) * (i + 1)) / n
      p.vertex(X(xa), X(ya))
      p.vertex(X(xb), X(ya))
    }
    p.vertex(X(x1), X(y1 + 0.5))
    p.vertex(X(x0), X(y1 + 0.5))
    p.endShape(p.CLOSE)
    outline(p, ink, weight * 0.75)
    p.beginShape()
    p.vertex(X(x0), X(y0))
    for (let i = 0; i < n; i++) {
      const xa = x0 + ((x1 - x0) * i) / n
      const xb = x0 + ((x1 - x0) * (i + 1)) / n
      const ya = y0 + ((y1 - y0) * (i + 1)) / n
      p.vertex(X(xa), X(ya))
      p.vertex(X(xb), X(ya))
    }
    p.endShape()
  }
  // Down and right to the turn, then down and left to the door.
  flight(SH, R, SH + 3, HALF_Y + R)
  p.noStroke()
  p.fill(PAINT.deep)
  p.rect(X((SH + 3 + WELL_R) / 2), X((HALF_Y + R + SILL + 0.5) / 2), X(WELL_R - SH - 3), X(SILL + 0.5 - HALF_Y - R))
  outline(p, ink, weight * 0.75)
  p.line(X(SH + 3), X(HALF_Y + R), X(WELL_R), X(HALF_Y + R))
  flight(WELL_R, HALF_Y + R, LAND_X, SILL)
  // The landing to the door, and the well's walls.
  p.noStroke()
  p.fill(PAINT.deep)
  p.rect(X((DOOR_R + LAND_X + 0.02) / 2), X(SILL + 0.3), X(LAND_X + 0.02 - DOOR_R), X(0.6))
  outline(p, ink, weight * 0.75)
  p.line(X(DOOR_R), X(SILL), X(LAND_X), X(SILL))
  outline(p, ink, weight * 0.8)
  p.line(X(WELL_R), X(R), X(WELL_R), X(HALF_Y + R))
  p.line(X(SH), X(R), X(SH), X(CEIL))
  // Sconces on the well's wall, one at each turn of the switchback, each coming up ahead of the two as they reach
  // the flight above it, so the well lights stepwise down to the door; the one over the door is on throughout.
  for (const [sx, sy, from] of SCONCES) sconce(p, c, sx, sy, from === null ? 1 : smooth(T, from, from + 1.2))
  // The club's light through the open door, up the well: by how much of the doorway the leaf has cleared.
  const open = 1 - Math.cos((doorOpen(T) * Math.PI) / 2)
  if (open > 0.01) {
    beam(p, c, [DOOR_R + 0.1, SILL - 1.0], [WELL_R + 0.4, HALF_Y - 1.4], 3.4, 0.34 * open, PAINT.beam)
    glow(p, c, DOOR_R + 0.35, SILL - 0.9, 1.6, 0.4 * open, PAINT.beam)
  }
  p.pop()
}

/** A wall sconce at (x, y): a small shade on its bracket, and when lit a warm glow and a cone down the wall and steps. */
function sconce(p: p5, c: Ctx, x: number, y: number, lit: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  p.push()
  if (lit > 0.01) {
    glow(p, c, x, y + 0.1, 1.15, 0.4 * lit, PAINT.gold)
    beam(p, c, [x, y + 0.12], [x, y + 1.7], 1.5, 0.13 * lit, PAINT.gold)
  }
  solid(p, ink, weight * 0.7, PAINT.deep)
  p.quad(X(x - 0.2), X(y - 0.1), X(x + 0.2), X(y - 0.1), X(x + 0.14), X(y + 0.12), X(x - 0.14), X(y + 0.12))
  p.line(X(x), X(y - 0.1), X(x), X(y - 0.3))
  p.noStroke()
  p.fill(alpha(p, PAINT.gold, 0.25 + 0.75 * lit))
  p.ellipse(X(x), X(y + 0.12), X(0.26), X(0.06))
  p.pop()
}

/** The club, in cutaway under the street: the room and the piano (the club builder's), the crowd, the pianist and his bench, the door, the light. */
function drawClub(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const light = clubLight(T)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.push()
  // Everything in the club is cut off at the ceiling: the street lies over it; and at the stairwell's wall.
  ctx.beginPath()
  ctx.rect(X(X0), X(CEIL), X(SH - X0), X(12.5 - CEIL))
  ctx.clip()
  // The ground the club is dug into, and the room's walls: the paper.
  p.noStroke()
  p.fill(PAINT.deep)
  p.rect(X((X0 + X1) / 2), X((CEIL + 12.5) / 2), X(X1 - X0), X(12.5 - CEIL))
  p.fill(DREAM.bg)
  p.rect(X((X0 + DOOR_R) / 2), X((CEIL + FLOOR_LINE) / 2), X(DOOR_R - X0), X(FLOOR_LINE - CEIL))

  p.push()
  p.translate(X(O[0]), X(O[1]))
  const cr: Ctx = { ...c }
  drawRoom(p, { dream: true, open: 1, light }, cr)
  // The doorway, open: the well's wall beyond it, lit by the room.
  const open = doorOpen(T)
  const cleared = 1 - Math.cos((open * Math.PI) / 2)
  if (cleared > 0.01) {
    p.noStroke()
    p.fill(alpha(p, PAINT.beam, 0.5 * cleared * light))
    p.rect(X((DOOR.x0 + DOOR.x1) / 2), X((DOOR.top + DOOR.sill) / 2), X(DOOR.x1 - DOOR.x0 - 0.04), X(DOOR.sill - DOOR.top - 0.03))
  }
  drawCrowd(p, c, T)
  // The spot on the piano's bass end: the pianist's, then Seb's.
  beam(p, c, [ROOM.lamp[0], ROOM.lamp[1] + 0.25], [1.6, 0.9], 5.6, 0.17 * light, PAINT.beam)
  // The dream piano's strings alight with the room: a faint shimmer across the whole fan that grows with the swell,
  // so the peak reads on the instrument itself, with no note to strike.
  drawPiano(p, cr, true, { strikes: [], now: T, light, shimmer: 0.15 + 0.6 * Math.max(0, light - 0.2) })
  p.pop()

  drawBench(p, c, T)
  drawPianist(p, c, T)
  drawDoor(p, c, open)
  // The peak: the whole club's light swells.
  const peak = smooth(T, 329.5, 335)
  if (peak > 0.01) {
    glow(p, c, rx(4.5), ry(-1.2), 12, 0.2 * peak, PAINT.gold)
    glow(p, c, rx(1.0), ry(0.2), 4.5, 0.22 * peak, PAINT.beam)
  }
  // The ceiling: the underside of the street, and the wall over the door.
  outline(p, ink, weight * 0.8)
  p.line(X(X0), X(CEIL), X(SH), X(CEIL))
  p.line(X(SH - 0.02), X(CEIL), X(SH - 0.02), X(DOOR_TOP - 0.12))
  p.pop()
}

/** The crowd: silhouettes at the bar and the tables, and one standing by the piano, swaying to the waltz. */
function drawCrowd(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const bar = Math.PI * 2 / 3.66
  const figure = (x: number, hips: number, seated: boolean, phase: number, face: 1 | -1) => {
    const sway = 0.03 * Math.sin(T * bar + phase)
    p.push()
    p.translate(X(x + sway), X(hips))
    solid(p, ink, weight * 0.5, DREAM.bg)
    if (seated) {
      // Hips on the seat, the torso up and a little forward, the head.
      p.beginShape()
      p.vertex(X(-0.3), 0)
      p.vertex(X(0.3), 0)
      p.vertex(X(0.26 + face * 0.06), X(-0.95))
      p.vertex(X(-0.26 + face * 0.06), X(-0.95))
      p.endShape(p.CLOSE)
      p.ellipse(X(face * 0.06), X(-1.18), X(0.44), X(0.46))
    } else {
      p.beginShape()
      p.vertex(X(-0.22), 0)
      p.vertex(X(0.22), 0)
      p.vertex(X(0.3), X(-1.45))
      p.vertex(X(-0.3), X(-1.45))
      p.endShape(p.CLOSE)
      p.ellipse(X(face * 0.05), X(-1.7), X(0.44), X(0.46))
    }
    p.pop()
  }
  // Two at the bar, on its stools; one at the nearer table, facing the piano; the host standing at the foot of the stairs.
  figure(-4.9, 0.14, true, 0.4, 1)
  figure(-3.4, 0.14, true, 2.1, -1)
  figure(14.96, ROOM.floor - 0.42, true, 3.4, -1)
  figure(18.9, ROOM.floor, false, 1.3, 1)
}

/** The pianist's bench on its trap: at rest, sunk flush, and lifting to the keys. */
function drawBench(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const top = benchTop(T)
  p.push()
  // The trap: a dark slot in the floor, once the bench has gone into it.
  const open = smooth(T, SINK0, SINK0 + 0.3)
  if (open > 0.01) {
    p.noStroke()
    p.fill(alpha(p, DREAM.bg, open))
    p.rect(X(BENCH_X), X(FLOOR_LINE + 0.32), X(BENCH_W + 0.2), X(0.64))
    outline(p, alpha(p, ink, 0.6 * open).toString(), weight * 0.5)
    p.line(X(BENCH_X - BENCH_W / 2 - 0.1), X(FLOOR_LINE), X(BENCH_X - BENCH_W / 2 - 0.1), X(FLOOR_LINE + 0.64))
    p.line(X(BENCH_X + BENCH_W / 2 + 0.1), X(FLOOR_LINE), X(BENCH_X + BENCH_W / 2 + 0.1), X(FLOOR_LINE + 0.64))
  }
  // The lift's plate under the bench, once it is lifting: what carries it.
  if (T > SINK1) {
    const plate = top + 0.5
    solid(p, ink, weight * 0.6, PAINT.deep)
    p.rect(X(BENCH_X), X(plate), X(BENCH_W + 0.1), X(0.1))
    outline(p, ink, weight * 0.5)
    p.line(X(BENCH_X), X(plate + 0.05), X(BENCH_X), X(FLOOR_LINE + 0.64))
  }
  // The bench: a padded top on two legs.
  outline(p, ink, weight * 0.7)
  for (const dx of [-0.42, 0.42]) p.line(X(BENCH_X + dx), X(top + 0.07), X(BENCH_X + dx), X(top + 0.5))
  solid(p, ink, weight * 0.7, PAINT.timber)
  p.rect(X(BENCH_X), X(top + 0.07), X(BENCH_W), X(0.14), X(0.03))
  p.pop()
}

/** The pianist, seated at the bass end, back to us, hands drifting on the keys; flown out on the hush. */
function drawPianist(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const up = pianistUp(T)
  if (up > 7.5) return
  const hips = benchTop(T) - up
  const playing = 1 - smooth(T, FLY, FLY + 0.3)
  const drift = 0.18 * Math.sin(T * 1.7) * playing
  p.push()
  p.translate(X(BENCH_X), X(hips))
  // The wire he is flown on, from the shoulders up out of the light.
  if (up > 0.001) {
    outline(p, alpha(p, ink, 0.8).toString(), weight * 0.45)
    p.line(X(0.05), X(-1.05), X(0.05), X(-40))
  }
  solid(p, ink, weight * 0.55, DREAM.bg)
  // The torso, leaning to the keys; the head; the arms out to the keys.
  p.beginShape()
  p.vertex(X(-0.34), 0)
  p.vertex(X(0.34), 0)
  p.vertex(X(0.3), X(-1.05))
  p.vertex(X(-0.3), X(-1.05))
  p.endShape(p.CLOSE)
  p.ellipse(0, X(-1.3), X(0.46), X(0.48))
  // The arms: out to the keys while he plays; drawn in as he is lifted.
  outline(p, ink, weight * 0.9)
  const keyY = (KEY_TOP - hips - 0.02) * playing + -0.55 * (1 - playing)
  const reach = 0.72 * playing + 0.3 * (1 - playing)
  p.line(X(-0.28), X(-0.9), X(-reach + drift), X(keyY))
  p.line(X(0.28), X(-0.9), X(reach - 0.1 + drift), X(keyY))
  p.pop()
}

/** The club's door in the doorway at the top of the room's stairs, hinged at the left, thrown open toward us. */
function drawDoor(p: p5, c: Ctx, open: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const a = (open * Math.PI) / 2
  const w = Math.max(0.05, (DOOR_R - DOOR_L - 0.03) * Math.cos(a))
  const swell = 0.13 * Math.sin(a)
  p.push()
  solid(p, ink, weight * 0.8, PAINT.red)
  p.quad(X(DOOR_L + 0.015), X(DOOR_TOP + 0.02), X(DOOR_L + w), X(DOOR_TOP + 0.02 - swell), X(DOOR_L + w), X(SILL + swell), X(DOOR_L + 0.015), X(SILL))
  // A round window in it, lit from inside.
  if (w > 0.3) {
    solid(p, ink, weight * 0.6, PAINT.gold)
    p.ellipse(X(DOOR_L + w * 0.5), X(DOOR_TOP + 0.72), X(0.24 * Math.cos(a)), X(0.24))
  }
  p.pop()
}
