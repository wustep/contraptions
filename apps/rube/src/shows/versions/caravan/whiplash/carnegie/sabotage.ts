import type { Pt, Seg } from '../../../../../parts'
import { box, carried, part, route, type Companion, type PartShot, type Way } from '../kit'
import { CARNEGIE, SOLO, shout } from '../music'
import type { KitStroke } from '../stub'
import { BOUNCES, COUNT, DOOR_OPENS, FLING, FLOORED, HITS3, LANDED, LANDS, LIGHTS, PATH, POINT, andrewAt, fletcherAt, jimAt } from './sabotage-motion'
import { drawDoorLeaf, drawDoorway, drawFletcher, drawStand, drawVeil } from './sabotage-set'
import { CLOSE, KIT_AT, WIDE } from './stage'

/**
 * Carnegie Hall, 242.34 → 270.52: the sabotage. The last chorus (`shout`), the band's held chord, the cut-off.
 *
 * The film: Fletcher knows Andrew testified against him, and at Carnegie he hands him a piece he has no chart for.
 * The band plays; Andrew can't; he walks off into the wings, where his father holds him at the stage door; he turns
 * back, walks on, sits at the kit, and begins alone. Here, on this music:
 *
 * - **The match cut (242.34).** He sits on the snare in the road's darkness; the hall wakes on the chorus's first big
 *   hit (243.30), and the camera draws back to the whole stage: the band on its risers, Fletcher on his podium
 *   conducting with a chart in his hand, and the small yellow ball at a silent kit.
 * - **The chart (247.51 → 248.16).** Fletcher cocks his hand and flings the chart across the stage; it turns once in
 *   the air and lands square on Andrew's empty stand, which knocks and sways. His finger stays on Andrew: "you".
 * - **Silent (248.2 → 258.1).** Andrew rolls to the drum's edge to look, close; backs off; the band's three hits
 *   knock him back toward the far rim while his kit stays still, and Fletcher's finger lands on 258.11.
 * - **The walk-off (258.5 → 262.03).** He rolls off the drum, drops to the floor on the beat, and goes fast to the
 *   stage door. On the band's last hit (261.13) the door swings open and his father is standing in the light.
 * - **The chord (262.03 → 266.1).** They meet, close, not pressed, and hold while it swells. He backs off, turns.
 * - **Back (266.1 → 270.52).** He runs back and leaps; Jim steps out into the wings to watch, the door closing behind
 *   him. He lands on the snare on 269.62 as Fletcher's open hands cut the band off (not the fist: that is saved for
 *   the end), the stand with the wrong chart sinks away into its trap, and he counts himself in on the snare,
 *   269.92, 270.23, and the solo's first stroke, 270.52.
 *
 * The frame is Carnegie's (`stage.ts`): the ball enters on the snare (-0.5, 0) and leaves there, exit [0, 0]. This
 * part has Fletcher and Jim for its slot; at its end Fletcher is at FLETCHER_HOME in POSES.rest and Jim at
 * JIM_WINGS, at rest. It draws Fletcher's rig while it has him (the hall draws it after).
 */

/** His strokes on the hall's kit: none while the band plays. The landing on the cut-off, the count-in, the first stroke of the solo. */
export const SABOTAGE_KIT: KitStroke[] = [LANDED, ...COUNT, SOLO].map((t) => ({ t, piece: 'snare' as const }))

/**
 * Every strike: the lights coming up, the fling, the chart landing, the band's three hits and Fletcher's finger
 * knocking him back, his drop to the floor, the door flung open, the landing with the cut-off, the count-in and the
 * solo's first stroke.
 */
export const SABOTAGE_HITS: number[] = [LIGHTS, FLING, LANDS, ...HITS3, POINT, FLOORED, DOOR_OPENS, LANDED, ...COUNT, SOLO]

/** The chorus's beat, for anyone timing to it. */
export const SABOTAGE_BEAT = shout

interface SabotageState {
  begin: number
}

/** Andrew's lane, in slot seconds: sampled from `andrewAt` stretch by stretch, then the count-in's bounces. */
function lane(begin: number): Seg[] {
  const segs: Seg[] = []
  for (const { from, to, rate } of PATH) {
    const n = rate > 0 ? Math.max(1, Math.ceil((to - from) * rate)) : 1
    segs.push(...carried(andrewAt, from, to, n))
  }
  const hops: Way[] = [{ at: LANDED - begin, p: [...KIT_AT] as Pt }]
  for (const b of BOUNCES) hops.push({ at: b.at - begin, p: [...KIT_AT] as Pt, arc: b.arc })
  segs.push(...route(hops))
  return segs
}

/** A person's place as the stage wants it, from a function of show time. */
const person = (fn: (t: number) => Pt) => (t: number): Companion => {
  const [x, y] = fn(t)
  return { x, y }
}

export const sabotage = part<SabotageState>(
  {
    name: 'sabotage',
    draw: (p, s, c) => {
      const T = c.t + s.begin
      if (T < CARNEGIE - 0.001 || T > SOLO + 0.001) return
      drawDoorway(p, c, T)
      drawStand(p, c, T)
      if (T < SOLO) drawFletcher(p, c, T)
      drawVeil(p, c, T)
    },
    over: (p, s, c) => {
      const T = c.t + s.begin
      // The door's leaf is over the balls while Jim waits behind it; once it has shut behind him the hall's own door is the same.
      if (T < CARNEGIE - 0.001 || T > 269.4) return
      drawDoorLeaf(p, c, T)
    },
  },
  (slot) => ({
    // From the stage door (house left) to Fletcher's podium, from over the stand's desk to the floor.
    cells: box(-11, -4, 7, 3),
    exit: [0, 0] as Pt,
    lane: { segs: lane(slot.begin), fire: LIGHTS - slot.begin },
    state: { begin: slot.begin },
    company: [
      { who: 'fletcher' as const, from: slot.begin, to: slot.end, at: person(fletcherAt) },
      { who: 'jim' as const, from: slot.begin, to: slot.end, at: person(jimAt) },
    ],
  }),
  (slot): PartShot[] => [
    // The match cut: the road's frame, held on him in the dark until the lights come up.
    { t: slot.begin, cells: 3.5, hold: [...KIT_AT] as Pt, w: 1 },
    { t: LIGHTS, cells: 3.5, hold: [...KIT_AT] as Pt, w: 1 },
    // Back to the whole stage on the chorus, a breath there, then in on the two of them for the throw.
    { t: 245.8, cells: WIDE.cells, hold: WIDE.hold, w: 1 },
    { t: 247.4, cells: 6.2, hold: [2.25, -1.05], w: 1 },
    // The chart between them: Fletcher keeping time on one side, Andrew still on the other; then in on Andrew.
    { t: 248.7, cells: 5.5, hold: [1.7, -0.85], w: 1 },
    { t: 251.6, cells: 4.8, hold: [1.2, -0.7], w: 1 },
    { t: 254.5, cells: 3.1, hold: [-0.1, -0.38], w: 1 },
    // Out on the band's three hits: the band playing past the small still ball.
    { t: 255.95, cells: 10.5, hold: [4.0, -1.9], w: 1 },
    // The two of them for Fletcher's finger, already easing toward the wings he is about to go to.
    { t: 257.95, cells: 6.4, hold: [2.1, -0.95], w: 1 },
    { t: 258.8, cells: 6.6, hold: [0.5, -0.1], w: 1 },
    // Across the stage with him to the door, wide enough to see where he is going, and in on the two of them in its light.
    { t: 260.6, cells: 6.3, hold: [-4.9, 0.55], w: 1 },
    { t: 262.03, cells: 3.6, hold: [-8.95, 1.15], w: 1 },
    { t: 265.7, cells: 3.0, hold: [-8.95, 1.3], w: 1 },
    { t: 266.1, cells: 3.05, hold: [-8.85, 1.28], w: 1 },
    // Back across with him to the kit, settling on it wide enough for the leap and Fletcher's cut; in to the solo.
    { t: 267.4, cells: 6.0, hold: [-4.6, 0.55], w: 1 },
    { t: 268.75, cells: 6.6, hold: [0.3, 0.05], w: 1 },
    { t: LANDED, cells: 6.3, hold: [0.15, -0.3], w: 1 },
    { t: slot.end, cells: CLOSE.cells, hold: CLOSE.hold, w: 1 },
  ],
)
