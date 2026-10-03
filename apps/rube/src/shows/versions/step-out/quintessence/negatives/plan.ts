import type { Lane, Pt, Seg } from '../../../../../parts'
import { laneAt } from '../../../../../parts'
import { at, SEAM } from '../music'

/**
 * The negatives room's numbers and clocks (the B1 builder's). One frame for the whole room: the set, the opening and
 * the clues all think in these cells (the opening's origin is the room's origin; the clues' is `CLUES_AT`). A ball on
 * the light table's lip has its centre at y 0; the lip's top is at y 0.13.
 *
 * Left to right: the shelves going into the dark; the enlarger on its column; the light table, its glass tilted up at
 * us with the strip of negatives lying on it (frames 20 to 27, frame 25 missing: the blank); the bench running on to
 * the right; the frosted door in the far wall behind the bench; more shelves.
 */

/* ------------------------------------------------------------------ the table and the strip */

export const LIP = 0.13
/** One frame of the strip a cell; frame `n`'s middle. Walter starts on frame 20, at the strip's near end. */
export const PITCH = 1
export const frameX = (n: number): number => -0.5 + (n - 20) * PITCH
export const FRAMES = [20, 21, 22, 23, 24, 26, 27]
export const BLANK = 25
export const GAP_X = frameX(BLANK)
/** The strip: its ends, and its edges (top, the image's top and bottom, the bottom). */
export const STRIP = { x0: -1.0, x1: 7.0, top: -0.92, imgTop: -0.7, imgBot: -0.08, bot: LIP }
/** The image in a frame: its width. */
export const IMG_W = 0.86
/** The glass the strip lies on, and the table's housing. */
export const GLASS = { x0: -1.15, x1: 7.15, top: -1.06 }
/** The gate under the blank: a notch in the lip the ball settles in. */
export const NOTCH = { x: GAP_X, half: 0.3, depth: 0.1 }
/** Where a ball's centre sits on the lip at `x` (the notch dips it). */
export function lipY(x: number): number {
  const u = (x - NOTCH.x) / NOTCH.half
  if (Math.abs(u) >= 1) return 0
  const c = Math.cos((u * Math.PI) / 2)
  return NOTCH.depth * c * c
}
/** The bench the table is let into: on to the right at the lip's height. */
export const BENCH = { x0: GLASS.x1, x1: 15, top: LIP }
export const FLOOR = 1.95

/** The loupe's carriage, on a rail along the glass's top edge: parked over frame 27; its lens hangs over a frame's image. */
export const LOUPE = { park: frameX(27), y: (STRIP.imgTop + STRIP.imgBot) / 2, r: 0.37, rail: GLASS.top - 0.05 }

/** The frosted door in the far wall, behind the bench; its pane. */
export const DOOR = { x0: 6.95, x1: 8.15, top: -2.6, pane: { x0: 7.1, x1: 8.0, y0: -2.35, y1: -1.2 } }

/** The enlarger: its column, the carriage tray that rides it (Walter rides up on it), its head and lens at the top. */
export const ENLARGER = { col: -2.12, tray: { x0: -1.74, x1: -1.13 }, low: LIP, high: -1.75, head: { x0: -2.55, x1: -1.25, y0: -3.45, y1: -2.55 }, lens: [-1.05, -2.72] as Pt }
export const TRAY_X = (ENLARGER.tray.x0 + ENLARGER.tray.x1) / 2
/** The shelf in front of the wall he rolls off along, at the tray's top height. */
export const SHELF = { x0: ENLARGER.tray.x1, x1: 4.2, top: ENLARGER.high }
/** The picture the enlarger throws on the far wall, over the light table. */
export const PICTURE = { x0: -1.7, x1: 6.45, y0: -4.75, y1: -1.22, horizon: -2.62 }

/* ------------------------------------------------------------------ the clock */

/** The opening: the swell (the tubes strike and catch), then the lead, a frame a bar. */
export const TUBE = { strike: 0.088, flick: [0.343, 0.622], catch: 0.97, second: 3.356 }
/** His landings in the lead: frames 21, 22, 23 on the downbeats, 24 on the half bar, the blank on bar 0. */
export const LANDS = [at(-3), at(-2), at(-1), at(-1, 3), at(0)]
export const STEPS: [number, number, number][] = [
  // [from frame, leave, land]
  [20, 2.72, LANDS[0]],
  [21, 4.42, LANDS[1]],
  [22, 6.12, LANDS[2]],
  [23, 7.16, LANDS[3]],
  [24, 8.0, LANDS[4]],
]
export const DREAM = SEAM.dream
export const OFFICE = SEAM.office
export const NUUK = SEAM.nuuk

/** The clues. */
export const RAPS = [at(10, 2), at(10, 3)]
export const CHERYL_STOP = at(10)
export const CLUE_STEPS: [number, number, number, number][] = [
  // [from frame, to frame, leave, land]
  [BLANK, 24, 26.32, at(11)],
  [24, 23, 27.93, at(12)],
  [23, 22, 29.6, at(13)],
  [22, 21, 31.24, at(14)],
]
/** Off frame 21 for the enlarger's tray; up the column (its ratchet ticks); home into the head, the lamp on; focus. */
export const TO_TRAY = { leave: 32.35, land: at(15) }
export const LIFT = { from: 33.95, to: at(16) }
export const RATCHET = [at(15, 2), at(15, 3), at(15, 4)]
export const LAMP = at(16)
export const FOCUS = at(16, 3)
export const ROLL_OFF = { from: LAMP + 0.09, up: 0.7, v: 1 }

/* ------------------------------------------------------------------ ways */

const sine = (u: number): number => -(Math.cos(Math.PI * Math.max(0, Math.min(1, u))) - 1) / 2

/** A lane built forward in show time from a point: rests, steps along the lip, rides and runs. */
export class Way {
  segs: Seg[] = []
  constructor(
    public p: Pt,
    public t: number,
  ) {}
  rest(until: number): this {
    if (until > this.t + 1e-9) this.segs.push({ from: this.p, to: this.p, dur: until - this.t })
    this.t = Math.max(this.t, until)
    return this
  }
  /** Along `fn(u)` (u 0..1 eased by `ease`) to `until`, in `n` straight pieces. */
  along(fn: (u: number) => Pt, until: number, n: number, ease: (u: number) => number = sine): this {
    const t0 = this.t
    const dt = (until - t0) / n
    for (let i = 0; i < n; i++) {
      const a = fn(ease(i / n))
      const b = fn(ease((i + 1) / n))
      this.segs.push({ from: a, to: b, dur: dt })
    }
    this.p = fn(1)
    this.t = until
    return this
  }
  /** Along the lip from where it is to `x`, landing at `until`: a step, from rest to rest. */
  step(x: number, until: number, n = 16): this {
    const x0 = this.p[0]
    return this.along((u) => [x0 + (x - x0) * u, lipY(x0 + (x - x0) * u)], until, n)
  }
  /** Riding something that moves on its own clock. */
  ride(fn: (t: number) => Pt, until: number, n: number): this {
    const t0 = this.t
    const dt = (until - t0) / n
    for (let i = 0; i < n; i++) this.segs.push({ from: fn(t0 + i * dt), to: fn(t0 + (i + 1) * dt), dur: dt })
    this.p = fn(until)
    this.t = until
    return this
  }
  /** A straight run to `to` from `v0` to `v1` cells a second, changing evenly. */
  run(to: Pt, v0: number, v1: number): this {
    const L = Math.hypot(to[0] - this.p[0], to[1] - this.p[1])
    const dur = L / ((v0 + v1) / 2)
    this.segs.push({ from: this.p, to, dur, ramp: [v0, v1] })
    this.p = to
    this.t += dur
    return this
  }
  /** A straight run at `v` to `until`. */
  cruise(v: number, until: number): this {
    const to: Pt = [this.p[0] + v * (until - this.t), this.p[1]]
    this.segs.push({ from: this.p, to, dur: until - this.t })
    this.p = to
    this.t = until
    return this
  }
}

/** The tray's height (its top) at show time `t`. */
export function trayTop(t: number): number {
  return ENLARGER.low + (ENLARGER.high - ENLARGER.low) * sine((t - LIFT.from) / (LIFT.to - LIFT.from))
}

/** Walter in the opening: from frame 20, a frame a bar, into the blank. Room cells, from show 0. */
function openingWay(): Way {
  const w = new Way([frameX(20), 0], 0)
  for (const [from, leave, land] of STEPS) {
    w.rest(leave).step(from === 24 ? GAP_X : frameX(from + 1), land, from === 24 ? 24 : 14)
  }
  return w.rest(DREAM)
}
export const OPENING_WAY = openingWay()
export const OPENING_LANE: Lane = { segs: OPENING_WAY.segs, fire: LANDS[4] }
/** Where the clues pick him up: the blank, in the room's cells. The clues' origin is half a cell on. */
export const IN_BLANK: Pt = OPENING_WAY.p
export const CLUES_AT: Pt = [IN_BLANK[0] + 0.5, IN_BLANK[1]]

/** Walter in the clues, in room cells, from the office cut. */
function cluesWay(): Way {
  const w = new Way(IN_BLANK, OFFICE)
  for (const [, to, leave, land] of CLUE_STEPS) w.rest(leave).step(frameX(to), land, 14)
  w.rest(TO_TRAY.leave).along((u) => [frameX(21) + (TRAY_X - frameX(21)) * u, 0], TO_TRAY.land, 12)
  w.rest(LIFT.from).ride((t) => [TRAY_X, trayTop(t) - LIP], LIFT.to, 24)
  w.rest(ROLL_OFF.from)
  w.run([w.p[0] + (ROLL_OFF.v * ROLL_OFF.up) / 2, w.p[1]], 0, ROLL_OFF.v)
  return w.cruise(ROLL_OFF.v, NUUK)
}
export const CLUES_WAY = cluesWay()
export const CLUES_LANE_ROOM: Lane = { segs: CLUES_WAY.segs, fire: LAMP - OFFICE }

/** Walter in the room at show time `t`, in room cells, from whichever leg has him. */
export function walterAt(t: number): Pt {
  if (t < OFFICE) {
    const q = laneAt(OPENING_LANE, Math.min(t, DREAM))
    return [q.x, q.y]
  }
  const q = laneAt(CLUES_LANE_ROOM, t - OFFICE)
  return [q.x, q.y]
}

/* ------------------------------------------------------------------ Cheryl and the loupe */

/** Cheryl: in from the right along the bench after the cut, pushing the loupe's carriage; at his side; after him. */
const CHERYL_FROM = 7.62
const CHERYL_V = 2.0
const CHERYL_DECEL = 0.8
const CHERYL_GAP = 0.56
const BESIDE = 0.31
const LAG = 0.12
function cherylWay(): Way {
  const w = new Way([CHERYL_FROM, 0], OFFICE)
  // A brisk roll in, slowing to stop beside him (a little apart) as the loupe she has pushed clicks over the blank.
  const stop = GAP_X + CHERYL_GAP
  const cruiseEnd = CHERYL_STOP - CHERYL_DECEL
  const x1 = stop + (CHERYL_V * CHERYL_DECEL) / 2
  w.segs.push({ from: w.p, to: [x1, 0], dur: cruiseEnd - OFFICE })
  w.p = [x1, 0]
  w.t = cruiseEnd
  w.segs.push({ from: w.p, to: [stop, lipY(stop)], dur: CHERYL_DECEL, ramp: [CHERYL_V, 0] })
  w.p = [stop, lipY(stop)]
  w.t = CHERYL_STOP
  // After him, a frame at a time, at his right hand.
  for (const [, to, leave, land] of CLUE_STEPS) w.rest(leave + LAG).step(frameX(to) + BESIDE, land + LAG, 14)
  // After him toward the enlarger, stopping at the strip's near end to watch him go up.
  w.rest(TO_TRAY.leave + 0.25).step(frameX(20) - 0.12, TO_TRAY.land + 0.45, 14)
  return w.rest(NUUK)
}
export const CHERYL_WAY = cherylWay()
export const CHERYL_LANE: Lane = { segs: CHERYL_WAY.segs, fire: 0 }
export function cherylAt(t: number): Pt {
  const q = laneAt(CHERYL_LANE, t - OFFICE)
  return [q.x, q.y]
}

/** The loupe's carriage: parked; pushed in by Cheryl (her tab on it); over his frame as he goes; left on frame 21. */
export function loupeX(t: number): number {
  if (t < OFFICE) return LOUPE.park
  if (t < CHERYL_STOP + 0.01) {
    const pushed = cherylAt(t)[0] - CHERYL_GAP
    return Math.min(LOUPE.park, pushed)
  }
  if (t < TO_TRAY.leave) return Math.min(GAP_X, walterAt(t)[0])
  return frameX(21)
}
/** The loupe's clicks: set down over the blank as Cheryl stops, then on each frame as he lands. */
export const LOUPE_CLICKS = [CHERYL_STOP, ...CLUE_STEPS.map((s) => s[3])]

/** Which frame he has landed on most recently (opening), for its light. */
export const FRAME_LANDS: Record<number, number[]> = {
  21: [LANDS[0], at(14)],
  22: [LANDS[1], at(13)],
  23: [LANDS[2], at(12)],
  24: [LANDS[3], at(11)],
}

/** Every strike in the room, in show seconds. */
export const ROOM_HITS: number[] = [
  // The swell: the tubes strike, stutter, and strike again before the lead.
  TUBE.strike,
  ...TUBE.flick,
  TUBE.second,
  // The lead: a frame a bar, and into the blank.
  ...LANDS,
  // Back in the room: the tubes tick as the daydream lets go.
  OFFICE,
  // The loupe set down over the blank as Cheryl stops; Ted's two raps.
  CHERYL_STOP,
  ...RAPS,
  // Back through the strip, the loupe clicking down on each.
  ...CLUE_STEPS.map((s) => s[3]),
  // Onto the enlarger's tray; its ratchet up the column; home, the lamp; the focus.
  TO_TRAY.land,
  ...RATCHET,
  LAMP,
  FOCUS,
]
