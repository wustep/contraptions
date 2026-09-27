import type { Pt } from '../../../../../parts'
import { box, carried, frame, part, type PartShot } from '../kit'
import { pulse } from '../music'
import { SEAMS } from '../seams'
import { VALLEY } from '../worlds'
import { MEADOW } from './geo'
import { DEPART, openAt } from './set'
import { lobe, rgbOf, sm } from './set-air'

/**
 * The departure (185.330 → 196.783), the valley builder's: the meadow after. She is on the grass in the open,
 * under the shell's flank, looking up. The pulse thins.
 *
 * On 186.288 the shell lifts (a cut to the wide to see it go): it rises slowly into the cloud and goes to vapour from
 * its crown down, the cloud opening over the valley and the light coming through, the fog lifting off the meadow
 * (the set draws all of it by show time). Ian, far off by the trucks, sets off toward her on 190.822. On 192.238 the
 * camera cuts back in to the two of them; he comes to her side and stops, touching, a sliver of space between them
 * (195.344). The camera comes in on them, the sky where the shell was, to the framing the lake house opens on.
 *
 * Ian comes from the camp on her right: the seam into the lake house has him beside her on her right, and in a
 * picture seen side on he cannot come from her left and end up there.
 */

interface DepartState {
  begin: number
}

/** The frame's origin: on the meadow in the open, right of the lift, the shell's flank over it. */
export const AFTER_AT: Pt = [14.5, MEADOW - 0.13]

const IAN_GO = pulse(799)
const TOUCH = pulse(818)
const CUT_IN = pulse(805)
/** Where Ian waits, by the trucks, and where he comes to. */
const IAN_FROM = 22.2
const IAN_TO = 0.36

/** Every strike: the shell lifts (and the cut to the wide), Ian sets off, the cut back in, the touch. */
export const DEPART_HITS: number[] = [DEPART, IAN_GO, CUT_IN, TOUCH]

/** Her, in the part's frame at show time `t`: still, but for a look up as the shell lifts, and a lean to him. */
function herAt(t: number): Pt {
  const look = t > DEPART ? -0.05 * Math.sin(Math.PI * Math.min(1, (t - DEPART) / 1.6)) * Math.exp(-Math.max(0, t - DEPART - 0.8) / 0.6) : 0
  const lean = 0.035 * Math.sin(Math.PI * sm(t, TOUCH - 0.5, TOUCH + 0.9))
  return [-0.5 + look + lean, 0]
}

/** Ian's x from her (frame cells) at `t`: waiting, then rolling to her side, easing to a stop at the touch. */
function ianX(t: number): number {
  const from = IAN_FROM - AFTER_AT[0] + 0.5
  const to = IAN_TO
  if (t <= IAN_GO) return from
  if (t >= TOUCH) return to
  // Off from rest on the pulse (quickly up to pace), a steady roll, and a long easing into her side: speed rising
  // over the first `a` of it, even, then falling away to nothing (as (1 - w)^2) over the last `b`.
  const u = (t - IAN_GO) / (TOUCH - IAN_GO)
  const a = 0.14
  const b = 0.45
  const vmax = 1 / (a / 2 + 1 - a - b + b / 3)
  let s: number
  if (u < a) s = (vmax * u * u) / (2 * a)
  else if (u < 1 - b) s = vmax * (a / 2 + (u - a))
  else {
    const w = (u - (1 - b)) / b
    s = vmax * (a / 2 + (1 - a - b) + (b * (1 - (1 - w) ** 3)) / 3)
  }
  return from + (to - from) * Math.min(1, s)
}

export const depart = part<DepartState>(
  {
    name: 'depart',
    draw: (p, s, c) => {
      const t = c.t + s.begin
      const open = openAt(t)
      if (open <= 0.01) return
      // The light coming through onto the meadow round them, as the cloud opens.
      const f = frame(p, c.k)
      if (f.y1 < -3 || f.y0 > 2) return
      const ctx = p.drawingContext as CanvasRenderingContext2D
      lobe(ctx, c.k, 1.5, 0.05, 9 + 6 * open, 0.9, rgbOf(VALLEY.floodlight), 0.22 * sm(open, 0.2, 1), 0.45)
    },
  },
  (slot) => {
    const dur = slot.end - slot.begin
    const lane = carried((t) => herAt(slot.begin + t), 0, dur, Math.ceil(dur * 30))
    return {
      cells: box(-12, -4, 12, 1),
      exit: [0, 0],
      lane: { segs: lane, fire: DEPART - slot.begin },
      state: { begin: slot.begin },
      company: [{ who: 'ian', from: slot.begin, to: slot.end, at: (t: number) => ({ x: -0.5 + ianX(t), y: 0 }) }],
    }
  },
  (slot) => shotsFor(slot.end),
)

/**
 * The camera: on her looking up, tilting a little with her; the cut to the wide on the shell's lift (60 cells, her
 * small on the meadow under it), which rises slowly with the shell; the cut back in on 192.238 to the two of them,
 * and in, to the framing the lake house opens on.
 */
function shotsFor(end: number): PartShot[] {
  const w = (x: number, y: number): Pt => [x - AFTER_AT[0], y - AFTER_AT[1]]
  const her: Pt = [-0.5, 0]
  const seam = SEAMS.after
  const last = SEAMS.end
  return [
    { t: 185.9, cells: 5.15, hold: [her[0] + seam.frame[0], her[1] + seam.frame[1] - 0.2], w: 1 },
    { t: DEPART - 0.02, cells: 5.3, hold: [her[0] + seam.frame[0], her[1] + seam.frame[1] - 0.35], w: 1 },
    // The wide: the whole shell over the meadow, as it was revealed, now going up into the cloud.
    // A slow push in as it goes, the meadow held at the frame's foot, its crown going up out of the top into the cloud.
    { t: DEPART, cells: 172, hold: w(-8, -84), w: 1, cut: true },
    { t: 189.2, cells: 161, hold: w(-8, -78.8), w: 1 },
    { t: CUT_IN - 0.03, cells: 149, hold: w(-8, -72.8), w: 1 },
    { t: CUT_IN, cells: 11, hold: w(12.6, -3.1), w: 1, cut: true },
    { t: 194.0, cells: 6.6, hold: w(13.7, -1.9), w: 1 },
    { t: 195.4, cells: 4.4, hold: w(14.25, -1.2), w: 1 },
    { t: end, cells: last.cells, hold: [her[0] + last.frame[0], her[1] + last.frame[1]], w: 1 },
  ]
}

