import type { Pt, Seg } from '../../../../../parts'
import { beam, box, carried, frame, part, rgba, type PartShot } from '../kit'
import { LIPTONS_MAT } from '../worlds'
import { K0, KISS_MIA, KISS_SEB, mia, seb, T } from './kiss-plan'
import { cupFront, lampLevel } from './room'

/**
 * The kiss, and the dream it opens: Lipton's, from the hush (61.777) to the curtain (dream(51)).
 *
 * He has run up the keyboard to its top key; she has come across the room to the piano's end. The orchestra drops
 * out, the lamps go down to embers, and in the quiet he lifts off the key, over the piano's cheek, and down beside
 * her. They touch as the orchestra comes back in (65.515), and the room lights up with it.
 *
 * Then the dream, a machine of the room's Christmas things, one job each: they go along the stage and hop into a
 * glass cup at the tree's foot, and the tree hoists them on a cord over its star (a gold counterweight going down
 * the other side), the star lighting as the band comes in; the cup tips them onto the string of bulbs, and they
 * ride its swags across the room, each swag lighting as he goes over its hook on a downbeat; down the garland to
 * the door, which they push open (the bell), out into the snow, and the door swings shut behind them (the bell
 * again) as the curtain closes.
 *
 * The frame: (-0.5, 0) is the top key, where the opening leaves him; everything is laid out in the piano's frame
 * (`kiss-plan.ts`) and moved here by `K0`. Mia is this part's from the stage light opening (39.95) to the curtain.
 */

const toK = ([x, y]: Pt): Pt => [x - K0[0], y - K0[1]]

/** The kiss itself. */
export const KISS_HITS = [T.kiss]
/** Her walk: the door's bell as she comes in, and her step up onto the stage. */
export const WALK_HITS = [T.doorIn[1], T.stepUp]
/** The dream: into the cup, the star, the tip, the swags, onto the garland, the door out, the door shut. */
export const DREAM_HITS = [T.hopMia, T.hopSeb, T.rise[1], T.tip, ...T.swags, T.doorOut, T.doorShut]

/** The hush: how dark the room goes over everything but the two of them. */
function hush(t: number): number {
  if (t < T.hush + 0.05) return 0
  const down = 0.8 * Math.min(1, Math.max(0, (t - T.hush - 0.05) / 0.8)) ** 1.5
  if (t < T.kiss) return down
  return down * Math.exp(-(t - T.kiss) / 0.2)
}

/** Where the light stays in the hush: round the piano's end, from the top key down to her. */
const POOL: Pt = [(KISS_SEB[0] + KISS_MIA[0]) / 2 - 0.2, 1.1]

/** The ball sampled from the plan between breakpoints (show seconds), at `hz`, in this frame. */
function lane(begin: number, marks: number[], hz: number[]): Seg[] {
  const at = (s: number): Pt => toK(seb(s + begin))
  const out: Seg[] = []
  for (let i = 0; i + 1 < marks.length; i++) {
    const a = marks[i] - begin
    const b = marks[i + 1] - begin
    out.push(...carried(at, a, b, Math.max(1, Math.ceil((b - a) * hz[i]))))
  }
  return out
}

export const kiss = part<null>(
  {
    name: 'kiss',
    draw: () => {},
    over(p, _s, c) {
      const t = c.t + T.hush
      const k = c.k
      // The glass cup, in front of whoever sits in it.
      const cup = toK([0, 0])
      p.push()
      p.translate(cup[0] * k, cup[1] * k)
      cupFront(p, k, c.ink, c.weight, t)
      p.pop()
      // The hush: the room goes dark round a pool of light on the piano's end, and a soft shaft down into it.
      const a = hush(t)
      if (a <= 0.003) return
      const [px, py] = toK(POOL)
      beam(p, k, px + 0.1, py - 6.8, px, py + 1.4, 0.5, 2.3, LIPTONS_MAT.lamp, 0.1 * (a / 0.8))
      const f = frame(p, k)
      const ctx = p.drawingContext as CanvasRenderingContext2D
      ctx.save()
      ctx.translate(px * k, py * k)
      ctx.scale(1, 1.25)
      const g = ctx.createRadialGradient(0, 0, 0.9 * k, 0, 0, 3.1 * k)
      g.addColorStop(0, rgba('#000000', 0))
      g.addColorStop(1, rgba('#000000', a))
      ctx.fillStyle = g
      const pad = 2
      ctx.fillRect((f.x0 - px - pad) * k, ((f.y0 - py) / 1.25 - pad) * k, (f.x1 - f.x0 + 2 * pad) * k, ((f.y1 - f.y0) / 1.25 + 2 * pad) * k)
      ctx.restore()
      void lampLevel
    },
  },
  (slot) => {
    const marks = [slot.begin, T.lift, T.kiss, T.hopSeb - 0.37, T.hopSeb, T.tip, slot.end]
    const segs = lane(slot.begin, marks, [1, 60, 30, 60, 30, 60])
    const end = toK(seb(slot.end))
    return {
      cells: box(-24, -8, 10, 4),
      exit: [end[0] + 0.5, end[1]],
      lane: { segs, fire: T.kiss - slot.begin },
      state: null,
      company: [
        {
          from: T.miaFrom,
          to: T.miaTo,
          who: 'mia',
          at: (t) => {
            const [x, y] = toK(mia(t))
            return { x, y, angle: 0 }
          },
        },
      ],
    }
  },
  () => {
    // Keys in the piano's frame, moved here.
    const keys: [number, number, Pt][] = [
      // The stage light opens on the keys where the opening left them, and draws back to the room: the door, the piano.
      [39.9, 2.8, [3.0, -0.3]],
      [42.7, 12.5, [-4.6, -0.6]],
      // Her walk, table by table, the piano coming into the right of the frame.
      [45.6, 6.5, [-8.0, 1.5]],
      [50.5, 6.2, [-5.2, 1.5]],
      [55.2, 5.8, [-2.4, 1.3]],
      // The stage: he runs up the keys, she runs along under them.
      [57.8, 5.4, [1.2, 1.1]],
      [61.5, 4.6, [4.3, 0.9]],
      // The hush: in, slowly, on the piano's end.
      [62.3, 4.6, [5.4, 0.7]],
      [64.2, 4.2, [5.85, 1.05]],
      [T.kiss, 3.4, [6.2, 1.8]],
      [66.2, 3.4, [6.25, 1.8]],
      // The bloom: back to the whole room, lit, the two of them still in each other at its middle.
      [68.4, 14, [-0.6, -1.0]],
      [69.0, 14, [-0.6, -1.0]],
      // To the tree, and up it with the cup.
      [70.8, 6.5, [8.4, 1.3]],
      [73.6, 7.6, [7.6, -0.8]],
      [76.6, 8.4, [6.8, -2.9]],
      // Across the room on the bulbs.
      [78.0, 8.8, [5.6, -2.6]],
      [85.5, 9.2, [-7.6, -1.2]],
      // Down the garland, out of the door.
      [87.2, 7.4, [-11.8, 0.6]],
      [88.6, 6, [-14.2, 1.3]],
      [90.0, 6, [-14.6, 1.4]],
    ]
    return keys.map(([t, cells, hold]): PartShot => ({ t, cells, hold: toK(hold) }))
  },
)
