import type { Pt, Seg } from '../../../../../parts'
import { box, carried, looks, part, scenery, type Look, type PartShot, type Slot } from '../kit'
import { SEAM } from '../music'
import { SEAMS } from '../seams'
import { drawFog, FOG_EXTENT } from './fog-set'
import { F4, FOG1, FOG_STRIKES, GREAT, herAt, PATH, RINGS } from './fog-plan'

/**
 * Beyond the glass (the fog builder's): the fog's standing set, and the four stretches of Louise in it between the
 * visions of the lake house. The set draws everything there is to see (the air, Abbott and Costello, every ring of
 * their ink by show time); the stretches are her lanes and the camera's keys, read from the same plan
 * (`fog-plan.ts`), so she rides exactly the ink that is drawn.
 *
 *   fog1 130.409 → 139.476  Abbott's palm lets her go into the first ring; she rocks in it as it closes over her.
 *   fog2 142.582 → 156.177  Ring to ring, each written where she comes down, each whipping her on; the last straight
 *                           up into a ring that closes under her, and she stops at its top.
 *   fog3 160.015 → 163.126  A crescent of ink spun once round on three hard pulses, her pinned in it by its turn.
 *   fog4 166.243 → 185.330  The push: flung up to where the great ring begins under her; it turns, she and Costello
 *                           each writing half of it, a blot of hers on every hard pulse; it closes on 183.182.
 */

export const FOG_BOX = FOG_EXTENT
export const fogSet = scenery<null>({ name: 'fog-set', draw: (p, _s, c) => drawFog(p, c.k, c.t) })
export const FOG_CELLS = box(FOG_BOX.x0, FOG_BOX.y0, FOG_BOX.x1, FOG_BOX.y1, 4)

const T = [SEAM.fog1, SEAM.fog2, SEAM.fog3, SEAM.fog4] as const
/** Where each stretch's frame is (her place as it begins, the lane's (-0.5, 0)), fog cells. */
export const FOG_AT: [Pt, Pt, Pt, Pt] = T.map((t) => {
  const p = herAt(t)
  return [p[0] + 0.5, p[1]] as Pt
}) as [Pt, Pt, Pt, Pt]

/** Every strike beyond the glass (show seconds). */
export const FOG_HITS: number[] = FOG_STRIKES

/** Her lane through one stretch: sampled from the plan, with a joint wherever her motion changes (a catch, a release). */
function lane(slot: Slot, o: Pt): { segs: Seg[]; end: Pt; lo: Pt; hi: Pt } {
  const fn = (s: number): Pt => {
    const p = herAt(slot.begin + s)
    return [p[0] - o[0], p[1] - o[1]]
  }
  const span = slot.end - slot.begin
  const joints = [0, ...PATH.legs.map((l) => l.t0 - slot.begin).filter((s) => s > 1e-6 && s < span - 1e-6), span]
  const segs: Seg[] = []
  for (let i = 0; i < joints.length - 1; i++) {
    const a = joints[i]
    const b = joints[i + 1]
    segs.push(...carried(fn, a, b, Math.max(1, Math.ceil((b - a) * 90))))
  }
  const lo: Pt = [Infinity, Infinity]
  const hi: Pt = [-Infinity, -Infinity]
  for (const s of segs) {
    lo[0] = Math.min(lo[0], s.to[0])
    lo[1] = Math.min(lo[1], s.to[1])
    hi[0] = Math.max(hi[0], s.to[0])
    hi[1] = Math.max(hi[1], s.to[1])
  }
  return { segs, end: fn(span), lo, hi }
}

/**
 * Where she looks, the two times it matters in the fog (elsewhere she is riding the ink and her eye rolls with her):
 * up at Abbott, in the cup of its palm beyond the glass, until it lets her go; and on the great ring's close, up
 * through it to where the two halves meet over her, hers and Costello's, held to the cut.
 */
const AT_ABBOTT = -2.0
const UP = -Math.PI / 2
const FOG_LOOKS: Look[][] = [
  [{ from: SEAM.fog1 - 1, to: FOG1.release - 0.15, at: () => AT_ABBOTT }],
  [],
  [],
  [{ from: F4.close - 0.2, to: Infinity, at: () => UP }],
]

function stretch(i: number, name: string, shots: (slot: Slot, o: Pt, at: (t: number) => Pt) => PartShot[]) {
  const o = FOG_AT[i]
  const at = (t: number): Pt => {
    const p = herAt(t)
    return [p[0] - o[0], p[1] - o[1]]
  }
  return part<null>(
    { name, draw: () => {} },
    (slot) => {
      const { segs, end, lo, hi } = lane(slot, o)
      const first = FOG_HITS.find((t) => t >= slot.begin - 1e-6 && t <= slot.end + 1e-6)
      return {
        cells: box(lo[0] - 3, lo[1] - 4, hi[0] + 3, hi[1] + 2),
        exit: [end[0] + 0.5, end[1]] as Pt,
        lane: { segs, fire: (first ?? slot.begin) - slot.begin },
        state: null,
        riders: FOG_LOOKS[i].length ? looks(FOG_LOOKS[i], (t) => herAt(t)[0]) : undefined,
      }
    },
    (slot) => shots(slot, o, at),
  )
}

/** A point of the fog in a stretch's frame. */
const local = (o: Pt, p: Pt, dx = 0, dy = 0): Pt => [p[0] - o[0] + dx, p[1] - o[1] + dy]

export const fog1 = stretch(0, 'fog1', (slot, o, at) => {
  const R1 = RINGS.find((r) => r.key === 'R1')!
  const her0 = at(slot.begin)
  return [
    // Carried in from the chamber's framing (5.8) under the white; easing in to the palm's cup as the veil clears,
    // then back a little to take in the ring written beside her.
    { t: 131.6, cells: 3.8, hold: [her0[0] + 0.1, her0[1] - 0.55], w: 1 },
    { t: 132.7, cells: 3.9, hold: local(o, R1.c, -0.9, -0.95), w: 1 },
    { t: 134.4, cells: 4.6, hold: local(o, R1.c, 0.0, 0.45), w: 1 },
    { t: 136.8, cells: 4.8, hold: local(o, R1.c, 0.15, 0.5), w: 1 },
    // Out with her as she glides through the bottom: the cut's framing, following.
    { t: 138.5, cells: 4.6, off: [0.7, -0.5], w: 0 },
    { t: slot.end, cells: 4.5, off: [0.7, -0.5], w: 0 },
  ]
})

/** How much of a long flight's framing is anchored to where she lands. */
const LEAD = 0.3
/** The framing a follow would have as she lands at `tc`: her landing point, and the follow's offset. */
const landing = (at: (t: number) => Pt, tc: number, off: Pt): Pt => {
  const p = at(tc)
  return [p[0] + off[0], p[1] + off[1]]
}

export const fog2 = stretch(1, 'fog2', (slot, _o, at) => {
  const top = at(slot.end)
  return [
    { t: 143.1, cells: 5.4, off: [0.9, -0.6], w: 0 },
    // Wide for the long arcs, leading her, so the ring written for her is seen whole, before she comes down into it,
    // and the one she leaves is still there behind her.
    { t: 145.0, cells: 8.0, off: [1.9, -0.4], w: 0 },
    // In the long flights the frame is anchored a little to where she will land (the ring written for her), so she is
    // seen to travel across it toward the ring instead of holding one place on the screen against the fog.
    { t: 147.7, cells: 8.8, off: [2.2, -0.3], hold: landing(at, 149.728, [2.2, -0.3]), w: LEAD },
    { t: 149.728, cells: 8.8, off: [2.2, -0.35], hold: landing(at, 149.728, [2.2, -0.35]), w: LEAD },
    { t: 150.8, cells: 8.8, off: [2.2, -0.4], hold: landing(at, 153.316, [2.2, -0.4]), w: LEAD },
    { t: 152.4, cells: 8.2, off: [1.6, -0.4], w: 0 },
    { t: 153.2, cells: 7.2, off: [0.6, -0.45], w: 0 },
    // The toss: the frame goes up with her and waits at the top of the ring written round her.
    { t: 154.6, cells: 5.0, off: [0.2, -0.5], w: 0 },
    { t: 155.75, cells: 4.3, hold: [top[0] + 0.45, top[1] - 0.5], w: 1 },
    { t: slot.end, cells: 4.0, hold: [top[0] + 0.5, top[1] - 0.6], w: 1 },
  ]
})

export const fog3 = stretch(2, 'fog3', (slot, o, at) => {
  const W = RINGS.find((r) => r.key === 'W')!
  const end = at(slot.end)
  return [
    { t: 160.5, cells: 4.2, hold: local(o, W.c, 0.4, 0.05), w: 1 },
    { t: 162.5, cells: 4.3, hold: local(o, W.c, 0.45, 0.0), w: 1 },
    { t: slot.end, cells: 4.0, hold: [end[0] + 0.5, end[1] - 0.6], w: 1 },
  ]
})

export const fog4 = stretch(3, 'fog4', (slot, o, at) => {
  const top = at(168.136)
  const c = local(o, GREAT.ring.c)
  const end = at(slot.end)
  return [
    // From the cut it carries her sideways drift straight on into the rise (a key at 166.7 stopped that pan dead).
    { t: 167.5, cells: 4.9, hold: [at(167.5)[0] + 0.5, at(167.5)[1] - 1.25], w: 1 },
    // Stopped at the top of her rise, where the ink begins under her; then back through the first hard run to the
    // whole of the ring the two pens will write, hers at the bottom and Costello's limb on the top, and held on it
    // (a slow breath back) while it turns, her rides up its wall and her falls, and the halves coming round; closing
    // (183.182); and held on it whole while its tendrils fling out and its turn slows to rest, the last hard pulses of
    // the push, a breath back from the punch, to the cut.
    { t: 168.4, cells: 6.0, hold: [top[0] + 0.7, top[1] - 1.6], w: 1 },
    { t: 170.3, cells: 11.0, hold: [c[0] + 0.25, c[1] + 0.45], w: 1 },
    { t: 176.8, cells: 11.6, hold: [c[0] + 0.25, c[1] + 0.4], w: 1 },
    { t: 181.8, cells: 12.0, hold: [c[0] + 0.2, c[1] + 0.35], w: 1 },
    { t: 183.182, cells: 11.5, hold: [c[0] + 0.2, c[1] + 0.4], w: 1 },
    { t: slot.end, cells: SEAMS.after.cells, hold: [end[0] + SEAMS.after.frame[0], end[1] + SEAMS.after.frame[1]], w: 1 },
  ]
})
