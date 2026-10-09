import type { Pt, Seg } from '../../../../../parts'
import { follower } from '../camera'
import { box, frame, part, scenery, type Company, type PartShot, type Slot } from '../kit'
import { SEAMS } from '../seams'
import { drawCabin, drawLight } from './plane-cabin'
import {
  ARIADNE_WAKES,
  AT_BOOTH,
  BACK0,
  BACK1,
  BOARD,
  CLEAR,
  DOCK,
  DOOR,
  DRIPS,
  DROP_T,
  GASP_T,
  GEAR,
  GEAR_T,
  GLASS,
  HOME,
  INSIDE,
  LEAN0,
  LEAVE,
  LET_GO,
  LID,
  OUT,
  PLUNGE,
  SETTLE,
  SHADE,
  STAMP,
  STIR,
  TOUCH,
  UNDER,
  WAKE,
  ariadneAt,
  cobbAt,
  fischerAt,
} from './plane-geo'
import { drawHall, drawHallOver } from './plane-hall'
import { penFor } from './plane-kit'
import { drawAirframe, drawCloudFog, drawSky, drawSmoke } from './plane-sky'

/**
 * PLANE: the flight from Sydney (the PLANE builder's). Two parts in one place, the plane's own world:
 *
 * - `boarding` (61.342 → 68.970, the pulse's first two bars): the first-class cabin at night, in cross-section. Cobb
 *   awake in his seat, Ariadne beside him, Fischer asleep across the aisle with one of the team. The silver case open
 *   on the console between Cobb and Ariadne; its drip counts the pulse, a drop on each beat, a bead of the compound
 *   down every line to every wrist. On bar 17 he leans on the plunger at his hip; the drip quickens to the eighths;
 *   his lamp goes out as the blink comes down.
 * - `waking` (213.717 → 244.187, the release): he wakes with a start, in the morning; the case lets go of their wrists
 *   and Ariadne shuts it (bar 57); Fischer, dazed, puts up his own shade and turns into the sun (bar 58); the plane
 *   goes down through the cloud, the gear locks (bar 59), the wheels touch (bar 60); the jet bridge docks, the door
 *   lifts (bar 61); he rolls out along the bridge into the hall (bar 62); the officer stamps his passport (bar 63);
 *   and out through the glass doors into the morning's glare.
 *
 * `plane-geo.ts` has the clock, the places and every sleeper's motion; the set draws everything from show time.
 */

/** Both parts are laid at his seat: the ball enters at (-0.5, 0) of the frame, the seat at (0, 0) of the world. */
export const PLANE_AT: Pt = [0.5, 0]
export const WAKE_AT: Pt = [0.5, 0]

/** Every cell the camera may look at in the plane's world: the airframe's wings, the ground, the hall. */
export const PLANE_CELLS: Pt[] = box(-16, -12, 22, 9, 2)

export const planeSet = scenery<null>({
  name: 'plane-set',
  draw: (p, _s, c) => {
    const t = c.t
    const f = frame(p, c.k)
    const pen = penFor(p, c.k, c.weight)
    pen.ctx.save()
    drawSky(pen, t, f)
    drawAirframe(pen, t, f)
    drawCabin(pen, t, f)
    drawHall(pen, t, f)
    drawSmoke(pen, t)
    pen.ctx.restore()
  },
  over: (p, _s, c) => {
    const t = c.t
    const f = frame(p, c.k)
    const pen = penFor(p, c.k, c.weight)
    pen.ctx.save()
    drawLight(pen, t, true)
    drawHallOver(pen, t, f)
    drawCloudFog(pen, t, f)
    pen.ctx.restore()
  },
})

/* ------------------------------------------------------------------ the strikes */

/** Every strike, both parts, in show seconds. */
export const PLANE_HITS: number[] = [
  // Boarding: the drip on every beat (the pulse's downbeat first), the plunger on bar 17, the drip on every eighth after.
  ...DRIPS,
  PLUNGE,
  // Bar 18: the lamp's last light dies as his eyes shut (the blink over the cut into the rain).
  UNDER,
  // Waking: the gasp; the lines let go; the lid; Fischer stirs, and his shade; the gear; the wheels; the bridge; the
  // door; he gets down; the hall's door; the stamp; clear; the glass doors.
  WAKE,
  ARIADNE_WAKES,
  LET_GO,
  LID,
  STIR,
  SHADE,
  GEAR,
  TOUCH,
  DOCK,
  DOOR,
  OUT,
  INSIDE,
  STAMP,
  CLEAR,
  GLASS,
]
  .filter((t, i, all) => all.findIndex((u) => Math.abs(u - t) < 1e-6) === i)
  .sort((a, b) => a - b)

/* ------------------------------------------------------------------ the lanes */

/** His lane between show times `knots`, read off `cobbAt` (world) into the part's frame; straight stretches merged. */
function laneOf(at: Pt, knots: number[]): Seg[] {
  const where = (t: number): Pt => {
    const [x, y] = cobbAt(t)
    return [x - at[0], y - at[1]]
  }
  const fine: Seg[] = []
  for (let i = 1; i < knots.length; i++) {
    const a = knots[i - 1]
    const b = knots[i]
    if (b - a <= 1e-9) continue
    const n = Math.max(1, Math.ceil((b - a) * 60))
    for (let j = 0; j < n; j++) {
      const t0 = a + ((b - a) * j) / n
      const t1 = a + ((b - a) * (j + 1)) / n
      fine.push({ from: where(t0), to: where(t1), dur: t1 - t0 })
    }
  }
  // Merge runs of pieces at the same velocity (a rest, a steady roll) into one.
  const out: Seg[] = []
  const vel = (s: Seg): Pt => [(s.to[0] - s.from[0]) / s.dur, (s.to[1] - s.from[1]) / s.dur]
  for (const s of fine) {
    const last = out[out.length - 1]
    if (last) {
      const v0 = vel(last)
      const v1 = vel(s)
      if (Math.hypot(v0[0] - v1[0], v0[1] - v1[1]) < 1e-4) {
        out[out.length - 1] = { from: last.from, to: s.to, dur: last.dur + s.dur }
        continue
      }
    }
    out.push({ ...s })
  }
  return out
}

const BOARD_KNOTS = [BOARD, LEAN0, PLUNGE, BACK0, BACK1, UNDER]
const WAKE_KNOTS = [WAKE, WAKE + GASP_T, WAKE + GASP_T + SETTLE, GEAR - GEAR_T, GEAR, TOUCH, OUT - DROP_T, OUT, AT_BOOTH, CLEAR, HOME]

const frameOf = (at: Pt, [x, y]: Pt): Pt => [x - at[0], y - at[1]]

interface PlaneState {
  begin: number
}

/* ------------------------------------------------------------------ the camera */

/** A hold on a point of the world (moved into the part's frame). */
const hold = (at: Pt, t: number, cells: number, q: Pt): PartShot => ({ t, cells, hold: frameOf(at, q), w: 1 })
const follow = (t: number, cells: number, off: Pt): PartShot => ({ t, cells, off, w: 0 })

function boardingShots(slot: Slot): PartShot[] {
  const at = PLANE_AT
  const seam = SEAMS.rain
  const end = cobbAt(slot.end)
  return [
    // In from the seam's framing, closing slowly on the case as the drip counts; in close for the plunger and the
    // quickening; and back out to the seam's, on him, as the lamp goes and the blink comes down.
    hold(at, slot.begin + 1.3, 3.7, [0.36, -0.5]),
    hold(at, LEAN0 - 0.2, 2.9, [0.0, -0.18]),
    hold(at, PLUNGE, 2.4, [-0.16, -0.04]),
    hold(at, PLUNGE + 1.25, 2.5, [-0.12, -0.08]),
    hold(at, slot.end, seam.cells, [end[0] + seam.frame[0], end[1] + seam.frame[1]]),
  ]
}

function wakingShots(slot: Slot): PartShot[] {
  const at = WAKE_AT
  const seam = SEAMS.home
  // The seam's framing at the veil exactly: the follow the score makes, offset to put him where the seam says.
  const where = (s: number): Pt => {
    const q = s > slot.end ? [LEAVE[0] + seam.v[0] * (s - slot.end), LEAVE[1]] : cobbAt(Math.max(s, slot.begin))
    return frameOf(at, q as Pt)
  }
  const fl = follower(where, 400)(slot.end)
  const endAt = frameOf(at, LEAVE)
  const offEnd: Pt = [endAt[0] + seam.frame[0] - fl[0], endAt[1] + seam.frame[1] - fl[1]]
  return [
    // The gasp, held; closing on the case and the two of them as it lets go and shuts.
    hold(at, slot.begin + 0.9, 3.85, [0.38, -0.55]),
    hold(at, LET_GO + 0.3, 3.45, [0.05, -0.3]),
    hold(at, LID + 0.2, 3.2, [-0.2, -0.16]),
    // Across the aisle to Fischer as he stirs, and the sun he lets in.
    hold(at, STIR + 0.3, 3.6, [1.35, -0.36]),
    hold(at, SHADE + 0.35, 3.95, [1.2, -0.36]),
    // Out: the whole plane in the morning sky, going down through the cloud; the gear; the runway coming up; the touch.
    hold(at, SHADE + 1.25, 5.3, [1.1, -0.25]),
    hold(at, GEAR - 0.45, 11.0, [-0.45, 0.95]),
    hold(at, GEAR + 1.2, 12.0, [-0.55, 1.2]),
    hold(at, TOUCH, 11.4, [-0.6, 1.4]),
    // To the right, as the bridge comes out of the terminal and closes on the door; in on the door as it lifts.
    hold(at, TOUCH + 1.6, 8.6, [3.2, 0.9]),
    hold(at, DOCK, 6.2, [3.1, -0.2]),
    hold(at, DOOR + 0.3, 5.0, [2.4, -0.4]),
    // With him out, along the bridge, into the hall.
    hold(at, OUT + 0.2, 4.7, [1.75, -0.35]),
    follow(OUT + 1.8, 4.5, [1.15, -0.72]),
    follow(INSIDE + 0.6, 4.4, [1.25, -0.72]),
    // At the booth; in close on the passport for the stamp, a beat on the mark it leaves; then on with him.
    hold(at, AT_BOOTH - 0.35, 3.5, [11.2, -0.3]),
    hold(at, STAMP - 0.15, 2.55, [11.5, -0.18]),
    hold(at, STAMP + 0.6, 2.5, [11.52, -0.17]),
    // Clear, on to the glass doors and into the glare.
    follow(GLASS + 0.2, 3.9, [0.95, -0.7]),
    follow(slot.end, seam.cells, offEnd),
  ]
}

/* ------------------------------------------------------------------ the parts */

const nothing = (): void => {}

export const boarding = part<PlaneState>(
  { name: 'boarding', draw: nothing },
  (slot) => {
    const at = PLANE_AT
    const segs = laneOf(at, [slot.begin, ...BOARD_KNOTS.filter((t) => t > slot.begin && t < slot.end), slot.end])
    const last = segs[segs.length - 1].to
    const company: Company[] = [
      { who: 'ariadne', from: slot.begin, to: slot.end, at: (t) => { const a = ariadneAt(t); return { x: a.x - at[0], y: a.y - at[1], spin: a.spin } } },
      { who: 'fischer', from: slot.begin, to: slot.end, at: (t) => { const f = fischerAt(t); return { x: f.x - at[0], y: f.y - at[1], spin: f.spin } } },
    ]
    return {
      cells: box(-2.5, -3.5, 4.5, 2),
      exit: [last[0] + 0.5, last[1]],
      lane: { segs, fire: PLUNGE - slot.begin },
      state: { begin: slot.begin },
      company,
    }
  },
  boardingShots,
)

export const waking = part<PlaneState>(
  { name: 'waking', draw: nothing },
  (slot) => {
    const at = WAKE_AT
    const segs = laneOf(at, [slot.begin, ...WAKE_KNOTS.filter((t) => t > slot.begin && t < slot.end), slot.end])
    const last = segs[segs.length - 1].to
    const company: Company[] = [
      { who: 'ariadne', from: slot.begin, to: slot.end, at: (t) => { const a = ariadneAt(t); return { x: a.x - at[0], y: a.y - at[1], spin: a.spin } } },
      { who: 'fischer', from: slot.begin, to: slot.end, at: (t) => { const f = fischerAt(t); return { x: f.x - at[0], y: f.y - at[1], spin: f.spin } } },
    ]
    return {
      cells: box(-2.5, -3.5, 15, 5),
      exit: [last[0] + 0.5, last[1]],
      lane: { segs, fire: TOUCH - slot.begin },
      state: { begin: slot.begin },
      company,
    }
  },
  wakingShots,
)
