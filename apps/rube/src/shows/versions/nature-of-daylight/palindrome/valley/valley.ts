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
 *   real thing (the same size, the same place), and it settles as the bass swells: the fog it pushes down rolls out
 *   along the valley floor (106.742). A helicopter comes round the near ridge's shoulder (104.861), a speck against it,
 *   and the camera comes down the valley with it; it flares (108.716) and hangs low over the pad, and she drops out of
 *   its door onto the meadow (110.655). It climbs away and turns (111.624) as she rolls into the decon tent; Ian has
 *   come out of it in his suit and gone up the lift's ramp first. She comes out of its far door in hers, its flap
 *   flung back (112.536), rolls up the ramp beside him; it swings up behind her and latches (114.364): the pump kicks
 *   and the scissor surges. Again (118.027): the deck under the belly. A seam of light (120.796); the slot opens
 *   (121.754), its light down on them; up into it (125.643), at the top (128.551), at rest in its dark.
 * - going (311.293 → 334.031): the morning after, the shell already stirring. The slot shuts (311.293), its light
 *   going off the meadow; she rolls onto the lift's pedal (312.221) and holds it while the empty deck comes down a
 *   step a beat (313.086, 314.015), onto its base (314.926), where the picture cuts to the valley whole. The shell goes
 *   up the way it came, the cloud it shoulders aside rolling out along the deck (315.971, 316.865), its wake sweeping
 *   the meadow (317.748); it pales into the cloud and the cloud closes over it as the high violins stop (318.711).
 *   Daylight: the cloud glows, then opens where it went (322.606), and the light comes down in shafts and spreads
 *   along the valley floor, reaching her on the next chord (326.258); she goes to meet Ian coming across it, and they
 *   touch (330.170), and hold.
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
      // The shell whole, settling: hold on it.
      hold(o, 103.9, 150, -14, -24),
      hold(o, 105.9, 138, -6, -21),
      // Down the valley with the helicopter to the camp at its foot.
      hold(o, 107.9, 80, 5, -13),
      hold(o, 109.5, 38, 8, -6),
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
      { ...hold(o, G.down, 72, 3, -31), cut: true },
      hold(o, 316.8, 74, 3, -33),
      hold(o, G.gone, 76, 3, -35),
      // The cloud where it went; it opens, and the light comes down the valley.
      hold(o, 320.6, 77, 2.5, -36.5),
      hold(o, G.sun, 78, 2.5, -37.5),
      hold(o, 324.3, 72, 3.5, -33),
      // Down the light to her, and Ian coming to her through it.
      hold(o, 325.6, 45, 8.5, -14),
      hold(o, 327.4, 20, 12.3, -4.6),
      hold(o, G.touch, 9, 14.5, -2.2),
      hold(o, 332.2, 5.6, 14.8, -1.3),
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
