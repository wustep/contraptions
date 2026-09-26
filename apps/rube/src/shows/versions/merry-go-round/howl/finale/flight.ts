import type { Pt } from '../../../../../parts'
import { box, part, type Company } from '../kit'
import { DURATION, SEAM } from '../music'
import { CASTLE, drawCastle } from '../wastes/castle'

/**
 * The finale (292.734 → the end): the director's. Calcifer comes back, the castle is made again round the plank and
 * flies, Sophie and Howl on its balcony; the last chord; the credits over the sky. A first version so the show
 * runs: the castle rising slowly to the right with the two of them at its door.
 */

const RISE: Pt = [34, -16]
const LEN = DURATION - SEAM.flight

/** Where Sophie is at `u` seconds into the finale: eased out of rest, then drifting on. */
const at = (u: number): Pt => {
  const s = Math.max(0, Math.min(1, u / LEN))
  const e = s * s * (3 - 2 * s)
  return [-0.5 + RISE[0] * e, RISE[1] * e]
}

export const flight = part<null>(
  {
    name: 'flight',
    draw: (p, _s, c) => {
      const [x, y] = at(c.t)
      const lift = Math.max(0, Math.min(1, (c.t - 2) / 8))
      p.push()
      p.translate((x - CASTLE.door[0]) * c.k, (y - CASTLE.door[1] - 0.13) * c.k)
      drawCastle(p, c.k, c.weight, c.ink, { t: SEAM.flight + c.t, step: c.t * 0.3, sit: 1 - lift, smoke: 0.4, door: 1 })
      p.pop()
    },
  },
  (slot) => {
    const dur = slot.end - slot.begin
    const n = 60
    const segs = Array.from({ length: n }, (_, i) => ({ from: at((dur * i) / n), to: at((dur * (i + 1)) / n), dur: dur / n }))
    const howl: Company = { who: 'howl', from: slot.begin, to: slot.end, at: (t) => { const [x, y] = at(t - slot.begin); return { x: x + 0.36, y } } }
    return {
      cells: box(-12, -44, RISE[0] + 12, 12),
      exit: [RISE[0], RISE[1]] as Pt,
      lane: { segs, fire: 0 },
      state: null,
      company: [howl],
    }
  },
  (slot) => [
    { t: slot.begin + 2, cells: 7 },
    { t: slot.begin + 10, cells: 22, off: [2, 2] },
    { t: slot.end - 1, cells: 30, off: [4, 4] },
  ],
)

/** Every strike of the finale, in show seconds. */
export const FLIGHT_HITS: number[] = []
