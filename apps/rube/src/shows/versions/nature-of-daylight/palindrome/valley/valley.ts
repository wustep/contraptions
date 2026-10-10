import type { Pt } from '../../../../../parts'
import { box, carried, part, scenery, type PartShot } from '../kit'
import type { ShellSpot } from '../seams'
import { SHELL_DOWN, SHELL_UP } from '../shell-path'
import { A, deckAt, G, shellAt } from './geo'
import { herArrive, herGoing, HER_START, ianArrive, ianGoing, MEET } from './paths'
import { drawValley, drawValleyOver } from './set'

/**
 * Montana (the VALLEY builder's): a green valley under low cloud, the camp at the shell's foot, and the shell that
 * comes down out of the cloud on the double bass and goes back up into it at the end. Files: `geo.ts` (the land, the
 * shell, the lift, the slot, the daylight, all by show time), `heli.ts`, `paths.ts` (where she and Ian are), `set.ts`
 * (the drawing), `light.ts` (the daylight).
 *
 * - arrive (102.110 → 129.556): the valley opens on the shell as it comes down, the television's picture become the
 *   real thing (the same size, the same place). It comes down through the picture as the bass swells, the camera
 *   drawing back and up so its height reads against the ridges and the helicopter's speck (round the near ridge's
 *   shoulder on 104.861); the air it drives down ahead of it rolls out along the valley floor as fog (106.742). The
 *   helicopter flares over the pad (108.716), a cut in to the camp under the settling belly, and she drops out of its
 *   door onto the meadow (110.655). It climbs away and turns (111.624) as she rolls into the decon tent; Ian has
 *   come out of it in his suit and gone up the lift's ramp first. She comes out of its far door in hers, its flap
 *   flung back (112.536), rolls up the ramp beside him; it swings up behind her and latches (114.364): the pump kicks
 *   and the scissor surges. Again (118.027): the deck under the belly. A seam of light (120.796); the slot opens
 *   (121.754), its light down on them; up into it (125.643), at the top (128.551), at rest in its dark.
 * - going (311.293 → 334.031): the morning after, the shell already stirring. The slot shuts (311.293), its light
 *   going off the meadow; she rolls onto the lift's pedal (312.221) and holds it while the empty deck comes down a
 *   step a beat (313.086, 314.015), onto its base (314.926), where the picture cuts to the valley whole. The shell goes
 *   up the way it came, the cloud it shoulders aside rolling out along the deck (315.971, 316.865), its wake sweeping
 *   the meadow (317.748); it pales into the cloud and the cloud closes over it as the high violins stop (318.711).
 *   The cloud churns where it went. Daylight: the cloud breaks low along the valley's left wall (322.606), off to one
 *   side, and the low sun rakes across the valley, the light sweeping along the floor from the left; it reaches her on
 *   the chord (326.258), a cut in to them, and she goes to meet Ian coming across it; they touch (330.170), a cut to the
 *   two of them, and hold. Where the shell was, the cloud only thins.
 */

/* ------------------------------------------------------------------ the set */

/** Every cell the valley claims, so the stage draws it whenever any of it is in view. */
export const VALLEY_CELLS: Pt[] = box(-180, -210, 180, 90, 6)

export const valleySet = scenery<null>({
  name: 'valley-set',
  draw: (p, _s, c) => drawValley(p, c.k, c.t),
  over: (p, _s, c) => drawValleyOver(p, c.k, c.t),
})

/* ------------------------------------------------------------------ the shell */

export { SHELL_DOWN, SHELL_UP, shellAt }

/** The real shell at the cut in (valley world cells): its centre and height. */
export const SHELL_CUT: ShellSpot = (() => {
  const s = shellAt(A.bass)
  return { c: [s.c[0], s.c[1]], h: s.h }
})()

/* ------------------------------------------------------------------ where the legs start */

/** Where the arrival and the going start, in the valley's world cells (the ball comes in at (-0.5, 0) from them). */
export const ARRIVE_AT: Pt = (() => {
  const [x, y] = herArrive(A.bass)
  return [x + 0.5, y]
})()
export const GOING_AT: Pt = [HER_START[0] + 0.5, HER_START[1]]

/* ------------------------------------------------------------------ the parts */

const at = (o: Pt, fn: (t: number) => Pt) => (t: number): Pt => {
  const [x, y] = fn(t)
  return [x - o[0], y - o[1]]
}
/** A camera key held on a world point, moved into the part's frame. */
const hold = (o: Pt, t: number, cells: number, x: number, y: number): PartShot => ({ t, cells, hold: [x - o[0], y - o[1]], w: 1 })

export interface ValleyState {
  begin: number
}

export const arrive = part<ValleyState>(
  { name: 'arrive', draw: () => {} },
  (slot) => {
    const o = ARRIVE_AT
    const her = at(o, herArrive)
    const ian = at(o, ianArrive)
    const T = (s: number) => s - slot.begin
    const lane = carried((s) => her(slot.begin + s), 0, T(slot.end), Math.round((slot.end - slot.begin) / 0.02))
    const end = her(slot.end)
    return {
      cells: box(-12, -10, 70, 2, 2).map(([x, y]) => [x - o[0] + 10, y - o[1]] as Pt),
      exit: [end[0] + 0.5, end[1]],
      lane: { segs: lane, fire: T(A.go) },
      state: { begin: slot.begin },
      company: [{ who: 'ian', from: slot.begin, to: slot.end, at: (t) => { const [x, y] = ian(t); return { x, y } } }],
    }
  },
  (slot) => {
    const o = ARRIVE_AT
    const deck = (t: number) => deckAt(t)
    const keys: PartShot[] = [
      // The valley opens on the television's picture: the shell's belly just out of the cloud at the top of the
      // frame. It comes down into the picture; the camera draws back and up slowly, so its height reads against the
      // ridges and the helicopter's speck as it comes down and settles.
      hold(o, 103.6, 150, -15, 6),
      hold(o, 105.2, 158, -13, -9),
      hold(o, 106.8, 168, -11, -19),
      hold(o, 108.2, 174, -10, -24),
      // The helicopter flares over the pad: cut in to the camp, the belly settling over it.
      { ...hold(o, A.flare, 32, 11, -7), cut: true },
      hold(o, 109.8, 27, 9, -5),
      hold(o, A.touch, 22, 7.2, -3.2),
      hold(o, 112.0, 13, 4.2, -2.0),
      hold(o, 113.2, 10.4, 2.2, -1.9),
      hold(o, A.go, 9.0, 0.9, -2.3),
      // Up with the deck, the belly coming down over them; back a little to see the slot open over them.
      hold(o, 116.2, 9.0, 0.3, deck(116.2) - 1.6),
      hold(o, A.surge2, 9.2, 0.3, deck(A.surge2) - 2.0),
      hold(o, 120.0, 10.0, 0.3, deck(120.0) - 2.7),
      hold(o, A.open, 11.0, 0.3, -6.4),
      hold(o, 123.8, 10.6, 0.3, -6.4),
      hold(o, A.surge3, 9.6, 0.4, deck(A.surge3) - 3.0),
      hold(o, 127.6, 6.4, 0.9, deck(127.6) - 1.4),
    ]
    // At rest on the deck in the slot's dark, the camera close: the contact seam (4.2 cells, [0.85, -0.7]).
    const [hx, hy] = herArrive(slot.end)
    keys.push(hold(o, slot.end, 4.2, hx + 0.85, hy - 0.7))
    return keys.filter((k) => k.t > slot.begin + 0.4 && k.t <= slot.end + 1e-6)
  },
)

export const going = part<ValleyState>(
  { name: 'going', draw: () => {} },
  (slot) => {
    const o = GOING_AT
    const her = at(o, herGoing)
    const ian = at(o, ianGoing)
    const T = (s: number) => s - slot.begin
    const lane = carried((s) => her(slot.begin + s), 0, T(slot.end), Math.round((slot.end - slot.begin) / 0.02))
    const end = her(slot.end)
    return {
      cells: box(-4, -8, 22, 2, 2).map(([x, y]) => [x - o[0], y - o[1]] as Pt),
      exit: [end[0] + 0.5, end[1]],
      lane: { segs: lane, fire: T(G.pedal) },
      state: { begin: slot.begin },
      company: [{ who: 'ian', from: slot.begin, to: slot.end, at: (t) => { const [x, y] = ian(t); return { x, y } } }],
    }
  },
  (slot) => {
    const o = GOING_AT
    const keys: PartShot[] = [
      // Close: she rolls onto the pedal and holds it while the empty deck comes down a step a beat.
      hold(o, 312.4, 5.0, 3.0, -1.3),
      hold(o, 313.6, 7.4, 2.3, -2.2),
      hold(o, 314.5, 7.8, 2.1, -2.3),
      // The deck lands: cut to the valley whole, the shell going up into the cloud the way it came.
      { ...hold(o, G.down, 88, 2, -40), cut: true },
      hold(o, 316.8, 88, 2, -41),
      hold(o, G.gone, 86, 1, -40),
      // The hush: the cloud churning where it went; a slow push toward the place.
      hold(o, 320.7, 78, -1, -36),
      // The cloud breaks along the left ridge and the low sun rakes across: drift with the light toward her.
      hold(o, G.sun, 72, -6, -31),
      hold(o, 324.4, 68, -12, -27),
      hold(o, 326.0, 64, -8, -24),
      // The light reaches her: cut in to them, low in the frame with the light coming down over them, as he comes
      // across it. (Framed with the horizon high, the meadow had two thirds of the picture and they were dots on the
      // treeline: the meeting the whole film comes to, buried in grass.)
      { ...hold(o, G.lit, 7.2, 15.2, -1.0), cut: true },
      hold(o, 328.3, 7.0, 14.9, -1.1),
      hold(o, 329.9, 6.8, 14.8, -1.1),
      // They touch: cut in close on the two of them, and hold, breathing back out to the home seam.
      { ...hold(o, G.touch, 3.6, MEET[0] + 0.62, MEET[1] - 0.55), cut: true },
      hold(o, 332.2, 3.9, MEET[0] + 0.7, MEET[1] - 0.65),
      // The home seam: 4.4 cells, [0.8, -0.8] on her.
      hold(o, slot.end, 4.4, MEET[0] + 0.8, MEET[1] - 0.8),
    ]
    return keys.filter((k) => k.t > slot.begin + 0.4 && k.t <= slot.end + 1e-6)
  },
)

/* ------------------------------------------------------------------ the strikes */

/** Every strike of the valley's two parts, on the recording's chords, beats and onsets. */
export const VALLEY_HITS: number[] = [
  A.bass, A.crest, A.settle, A.flare, A.touch, A.out, A.suited, A.go, A.surge2, A.crack, A.open, A.surge3, A.top,
  G.shut, G.pedal, G.drop1, G.drop2, G.down, G.heave1, G.heave2, G.wake, G.gone, G.sun, G.lit, G.touch,
]
