import { R, type Pt } from '../../../../../parts'
import { box, carried, ease, lookFrom, looks, part, turnTo, type Look, type PartShot } from '../kit'
import { pulse } from '../music'
import { SEAMS } from '../seams'
import { MEADOW } from './geo'
import { DEPART } from './set'
import { sm } from './set-air'

/**
 * The departure (185.330 → 196.783), the valley builder's: the meadow after. She is on the grass in the open,
 * under the shell's flank, looking up. The pulse thins.
 *
 * On 186.288 the shell lifts (a cut to the wide to see it go): it rises slowly into the cloud and goes to vapour from
 * its crown down, the cloud opening over the valley and the light coming through, the fog lifting off the meadow
 * (the set draws all of it by show time). Ian, far off across the meadow, sets off toward her on 190.822. On 192.238 the
 * camera cuts back in to the two of them; he comes to her side and meets her as she leans to him on the touch
 * (195.344), and stays against her as she settles. The camera comes in on them, the sky where the shell was, to the
 * framing the lake house opens on.
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
export const CUT_IN = pulse(805)
/** Her glance up, between the cut in and his reaching her. */
const GLANCE = 193.0
/** Where Ian waits, far off across the meadow. */
const IAN_FROM = 22.2

/** Every strike: the shell lifts (and the cut to the wide), Ian sets off, the cut back in, the touch. */
export const DEPART_HITS: number[] = [DEPART, IAN_GO, CUT_IN, TOUCH]

/** Her lean to him round the touch: in as he comes, and back to her mark (the circle's first frame is hers there). */
const leanAt = (t: number): number => 0.035 * Math.sin(Math.PI * sm(t, TOUCH - 0.5, TOUCH + 0.9))
/** From the touch on he stays against her, coming with her as she settles back: they end the meadow together. */
const AGAINST = 2 * R + 0.006

/**
 * Where they look on the meadow: she up and back to where the shell went, as it lifts and goes and the light comes
 * through; then at Ian as he comes to her, and from the touch on at him and a little up, which is how her eye stands
 * as the lake house opens on the first frame. He, once he is at her side, at her.
 */
const LOUISE_LOOKS: Look[] = [
  {
    from: 185.6,
    to: Infinity,
    at: (t) => {
      const toIan = -2.0 + turnTo(-2.0, -0.15) * ease((t - 192.7) / 0.6)
      return toIan + turnTo(toIan, -0.55) * ease((t - TOUCH) / 0.5)
    },
  },
]
const IAN_LOOKS: Look[] = [{ from: TOUCH + 0.05, to: Infinity, at: () => Math.PI - 0.35 }]

/** Her, in the part's frame at show time `t`: still, but for a look up as the shell lifts, and a lean to him. */
function herAt(t: number): Pt {
  const look = t > DEPART ? -0.05 * Math.sin(Math.PI * Math.min(1, (t - DEPART) / 1.6)) * Math.exp(-Math.max(0, t - DEPART - 0.8) / 0.6) : 0
  const lean = leanAt(t)
  // A glance up to where it went (back and up to her left), before he reaches her.
  const g = Math.max(0, Math.min(1, (t - GLANCE) / 1.7))
  const glance = -0.07 * Math.sin(Math.PI * g) ** 2
  return [-0.5 + look + lean + glance, 0]
}

/** Ian's x from her (frame cells) at `t`: waiting, rolling to her side, easing into her on the touch, then with her. */
function ianX(t: number): number {
  const from = IAN_FROM - AFTER_AT[0] + 0.5
  const to = AGAINST + leanAt(TOUCH)
  if (t <= IAN_GO) return from
  if (t >= TOUCH) return AGAINST + leanAt(t)
  // Off from rest on the pulse (quickly up to pace), a steady roll, and a short braking into her side: speed rising
  // over the first `a` of it, even, then falling steadily to nothing over the last `b`, so the gap is still seen
  // closing up to the touch (a long soft ease had it shut to the eye half a second early).
  const u = (t - IAN_GO) / (TOUCH - IAN_GO)
  const a = 0.14
  const b = 0.2
  const vmax = 1 / (a / 2 + 1 - a - b + b / 2)
  let s: number
  if (u < a) s = (vmax * u * u) / (2 * a)
  else if (u < 1 - b) s = vmax * (a / 2 + (u - a))
  else {
    const w = (u - (1 - b)) / b
    s = vmax * (a / 2 + (1 - a - b) + (b * (1 - (1 - w) ** 2)) / 2)
  }
  return from + (to - from) * Math.min(1, s)
}

export const depart = part<DepartState>(
  {
    name: 'depart',
    // The meadow, the light and the fog are the set's; the part draws nothing of its own.
    draw: () => {},
  },
  (slot) => {
    const dur = slot.end - slot.begin
    const lane = carried((t) => herAt(slot.begin + t), 0, dur, Math.ceil(dur * 30))
    return {
      cells: box(-12, -4, 12, 1),
      exit: [0, 0],
      lane: { segs: lane, fire: DEPART - slot.begin },
      state: { begin: slot.begin },
      riders: looks(LOUISE_LOOKS),
      company: [{ who: 'ian', from: slot.begin, to: slot.end, at: (t: number) => ({ x: -0.5 + ianX(t), y: 0, look: (roll: number) => lookFrom(IAN_LOOKS, t, roll) }) }],
    }
  },
  (slot) => shotsFor(slot.end),
)

/**
 * The camera: on her looking up, tilting a little with her; the cut to the wide on the shell's lift (60 cells, her
 * small on the meadow under it), which rises slowly with the shell; the cut back in on 192.238, and from there one
 * steady push in on her to the framing the lake house opens on. Her place on the screen is the first frame's from
 * the cut back in (the frame scaled about her), so the push only gathers the meadow in round her, Ian coming into
 * it from her right and the sky where the shell was over them, and it settles on the last clear pulse without ever
 * sliding her across the picture to her mark.
 */
function shotsFor(end: number): PartShot[] {
  const w = (x: number, y: number): Pt => [x - AFTER_AT[0], y - AFTER_AT[1]]
  const her: Pt = [-0.5, 0]
  const seam = SEAMS.after
  const last = SEAMS.end
  // Her place in the first frame, at `cells` tall: the camera's centre from her.
  const first = (cells: number): Pt => [her[0] + (last.frame[0] * cells) / last.cells, her[1] + (last.frame[1] * cells) / last.cells]
  return [
    // Wide from the cut (the great logogram's framing, carried): the meadow round her, the sky over her; a breath back.
    { t: 185.9, cells: 11.9, hold: [her[0] + seam.frame[0], her[1] + seam.frame[1] - 0.05], w: 1 },
    { t: DEPART - 0.02, cells: 12.1, hold: [her[0] + seam.frame[0], her[1] + seam.frame[1] - 0.12], w: 1 },
    // The wide: the whole shell over the meadow, as it was revealed, now going up into the cloud.
    // A slow push in as it goes, the meadow held at the frame's foot, its crown going up out of the top into the cloud.
    { t: DEPART, cells: 172, hold: w(-8, -84), w: 1, cut: true },
    { t: 189.2, cells: 161, hold: w(-8, -78.8), w: 1 },
    { t: CUT_IN - 0.03, cells: 149, hold: w(-8, -72.8), w: 1 },
    { t: CUT_IN, cells: 11, hold: first(11), w: 1, cut: true },
    { t: 194.5, cells: 5.8, hold: first(5.8), w: 1 },
    { t: end, cells: last.cells, hold: first(last.cells), w: 1 },
  ]
}

