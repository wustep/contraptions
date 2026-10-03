import type { Lane, Pt } from '../../../../../parts'
import { laneAt } from '../../../../../parts'
import { box, part, scenery, type PartShot } from '../kit'
import { at, SEAM } from '../music'
import { BEGIN, BUMPS, END, heli, IN, JUMP, LIFT, onHeli, plan, STEP, STROBES, SURF, WIDE_FROM, WIDE_TO } from './sky-plan'
import { drawBoat, drawHeli, drawParcel, drawSkySet, drawWash, drawWisps, parcelAt } from './sky-draw'
import { ctxOf } from './paint'
import { WALTER_WARM } from '../worlds'

/**
 * Over the Sea (50.411 → 70.398, bars 25 to 36; the band at its fullest so far), B3's.
 *
 * Out of the bar's door at a run, and the place changes round him: a helipad on the quay at Nuuk, the postal
 * helicopter on it, white and grey with its one dark stripe, its rotor already turning. He runs at it and leaps into
 * the open side door on bar 26; on bar 27 its skids leave the pad. Up over the harbour, the houses falling behind,
 * and out over the grey-green sea and its ice under the overcast, the rotor turning once a beat and the tail's white
 * strobe on every downbeat; the air drops from under the cabin three times and catches him on the downbeat each time.
 * The camera cuts out wide on bar 33: the helicopter small in a big sky, coming down toward a fishing boat. On bar 35
 * it is close again: he steps down out of the door onto the skid with the parcel (the radio in its box). The pilot
 * looks back, and shakes his head: he will not set down. On beat 3 of bar 36 Walter jumps, and hits the sea on bar
 * 37 exactly, as everything over the bass drops out.
 */

/** The place's first part starts at its origin. */
export const SKY_AT: Pt = [0, 0]

const PLAN = plan(BEGIN)
/** Where he goes into the water (the sea's entry), and the boat: its transom a little right of him. */
export const SPLASH = PLAN.splash
export const BOAT_X0 = SPLASH[0] + 1.7

/** Everything the place's set draws, claimed coarsely so the stage draws it wherever the camera is. */
export const SKY_CELLS = box(-16, -16, Math.ceil(SPLASH[0]) + 16, 6, 2)

export const skySet = scenery<null>({
  name: 'sky-set',
  draw: (p, _s, c) => {
    const g = ctxOf(p)
    g.save()
    drawSkySet(p, c.k, c.t)
    drawBoat(p, c.k, BOAT_X0)
    g.restore()
  },
})

interface State {
  lane: Lane
}

/** The helicopter: the pad, the lift, the flight over the sea, the boat it will not land by, and the jump. */
export const helicopter = part<State>(
  {
    name: 'helicopter',
    flight: true,
    draw: (p, s, c) => {
      const t = BEGIN + c.t
      const g = ctxOf(p)
      g.save()
      drawWash(p, c.k, t)
      drawHeli(p, c.k, t)
      // The parcel, once it is out of the cabin: on the skid by him, and then falling with him.
      const w = laneAt(s.lane, c.t)
      const q = parcelAt(t, [w.x, w.y])
      if (!q.local) drawParcel(g, c.k, q.p[0], q.p[1], q.rot)
      g.restore()
    },
    over: (p, _s, c) => {
      const g = ctxOf(p)
      g.save()
      drawWisps(p, c.k, BEGIN + c.t, at(28), WIDE_FROM)
      g.restore()
    },
  },
  (slot) => {
    const lane: Lane = { segs: PLAN.segs, fire: LIFT - slot.begin }
    return {
      cells: box(-8, -14, Math.ceil(SPLASH[0]) + 10, 4, 2),
      exit: [SPLASH[0] + 0.5, SPLASH[1]] as Pt,
      lane,
      state: { lane },
      // He is Life's red from the hinge at Nuuk on; said again here, so the sky never shows him otherwise.
      changes: [{ at: 0, color: WALTER_WARM }],
    }
  },
  () => shots(),
)

/** The camera: with him to the door, the helicopter whole as it lifts and climbs, out wide, close for the jump. */
function shots(): PartShot[] {
  const follow = (t: number, cells: number, off: Pt): PartShot => ({ t, cells, w: 0, off })
  const hold = (t: number, cells: number, p: Pt, cut = false): PartShot => ({ t, cells, hold: p, w: 1, ...(cut ? { cut } : {}) })
  const on = (t: number, l: Pt): Pt => onHeli(t, l)
  const leave = PLAN.leave
  // The wide: from where the helicopter is as the cut comes, to the boat ahead and below.
  const a = heli(WIDE_FROM)
  const b = heli(WIDE_TO)
  const wide: Pt = [(a.x + b.x) / 2 + 1.2, (a.y + SURF) / 2 - 0.3]
  return [
    follow(BEGIN + 0.9, 4.6, [1.0, -0.55]),
    hold(IN + 0.3, 5.4, on(IN + 0.3, [0.35, -0.5])),
    hold(LIFT - 0.1, 5.6, on(LIFT, [0.35, -0.55])),
    follow(LIFT + 1.6, 6.0, [0.45, -0.5]),
    follow(at(29) - 0.6, 6.5, [0.55, -0.45]),
    follow(WIDE_FROM - 0.25, 6.7, [0.55, -0.4]),
    hold(WIDE_FROM, 16, wide, true),
    hold(WIDE_TO - 0.4, 15.6, [wide[0] + 0.6, wide[1] + 0.2]),
    hold(WIDE_TO, 5.6, on(WIDE_TO, [0.45, -0.1]), true),
    hold(JUMP - 0.45, 5.3, [leave[0] + 0.25, leave[1] + 0.1]),
    follow(JUMP + 0.25, 5.15, [0.2, 0.1]),
    hold(END, 5.0, [SPLASH[0] + 0.2, SPLASH[1] + 0.4]),
  ]
}

/** Every strike this place makes, in show seconds. */
export const SKY_HITS: readonly number[] = [...new Set([
  // The tail's strobe on every downbeat (the cut lands on the first).
  ...STROBES,
  // Into the door; the skids off the pad; the three bumps of the air, each caught on its downbeat.
  IN,
  LIFT,
  ...BUMPS,
  // Down onto the skid; the push off it; the splash, as everything over the bass drops out.
  STEP,
  JUMP,
  SEAM.sea,
])].sort((x, y) => x - y)

/** The one wide: the helicopter small over the sea, coming down toward the boat (bars 33 and 34). */
export const SKY_WIDE: [number, number][] = [[WIDE_FROM, WIDE_TO]]

export { END as SKY_END, SURF as SKY_SURF }
