import { R } from '../../../../../parts'
import { HAKU_SIZE } from '../cast'
import type { Pt } from '../paint'
import { clamp01, smooth } from '../paint'
import { M } from '../music'
import { RIVER } from '../geo'
import { HEAD, heading, seat, trail } from '../world/dragon'

/**
 * The flight home and the fall, shared by the name (M.summit → M.home) and home (M.home → the end): the dragon's way
 * west over the cloud, his burst on the cadence, and the two of them falling together, turning, down through the cloud
 * into the dawn and on to the river of stones, where they come to rest side by side.
 */

/** The dragon's head over the cloud, flying west, rising and falling a little. */
export function head(t: number): Pt {
  const u = t - M.summit
  return [64 - 4.1 * u, -25.4 + 0.5 * Math.sin(0.85 * u) - 0.25 * Math.sin(0.37 * u + 1)]
}

/** His back is to the sky flying west. */
export const UP = -1

/** The scales come off him on the cadence, quickly; the last of him is the boy. */
export const BURST = { at: M.cadence, dur: 2.0 }
export const burstAt = (t: number) => clamp01((t - BURST.at) / BURST.dur)

/** His spine at `t`. */
export const spineAt = (t: number) => trail(head, t)

/** Where she sits on his back at `t`. */
export const seatAt = (t: number): Pt => seat(spineAt(t), UP)

/** Where the boy is as the dragon's head becomes him: the head's middle. */
export function hakuOut(t: number): Pt {
  const sp = spineAt(t)
  const a = heading(sp)
  return [sp[0][0] + Math.cos(a) * HEAD * 0.42, sp[0][1] + Math.sin(a) * HEAD * 0.42]
}

/** When the dragon is gone and the two of them are falling free. */
export const FREE = BURST.at + BURST.dur * 0.98
/** When they come down on the river bed, side by side, she on its west, he on its east. */
export const LAND = M.home + 5.7
const HR = R * HAKU_SIZE
export const SHE_LANDS: Pt = [RIVER.x1 - 0.7, RIVER.bed - R]
export const HE_LANDS: Pt = [SHE_LANDS[0] + R + HR + 0.004, RIVER.bed - HR]

const S0 = seatAt(FREE)
const H0 = hakuOut(FREE)
const C0: Pt = [(S0[0] + H0[0]) / 2, (S0[1] + H0[1]) / 2]
const D0 = Math.hypot(H0[0] - S0[0], H0[1] - S0[1])
const TH0 = Math.atan2(H0[1] - S0[1], H0[0] - S0[0])
const CL: Pt = [(SHE_LANDS[0] + HE_LANDS[0]) / 2, (SHE_LANDS[1] + HE_LANDS[1]) / 2]

/** Off the dragon: going on west a while as the air slows them, sinking faster and faster to a slow, held fall. */
const free = (u: number): Pt => [C0[0] - 4.1 * 0.9 * (1 - Math.exp(-u / 0.9)), C0[1] + 2.6 * (u - 1.2 * (1 - Math.exp(-u / 1.2)))]
const freeV = (u: number): Pt => [-4.1 * Math.exp(-u / 0.9), 2.6 * (1 - Math.exp(-u / 1.2))]

/** From M.home the fall is a long glide down through the cloud to the river bed, slowing to a touch. */
const G0 = M.home
const P0 = free(G0 - FREE)
const V0 = freeV(G0 - FREE)
const T = LAND - G0
const c1: Pt = [P0[0] + (V0[0] * T) / 3, P0[1] + (V0[1] * T) / 3]
const c2: Pt = [CL[0], CL[1] - 0.7]

function centre(t: number): Pt {
  if (t <= G0) return free(Math.max(0, t - FREE))
  const u = clamp01((t - G0) / T)
  const v = 1 - u
  return [
    v * v * v * P0[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * CL[0],
    v * v * v * P0[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * CL[1],
  ]
}

/** The pair: how far apart (they come together to touch), and how they are turned (over each other, slowly). */
function pair(t: number): { c: Pt; d: number; th: number } {
  const c = centre(t)
  const d = D0 + (R + HR + 0.004 - D0) * smooth(t, FREE, FREE + 0.9)
  // From where they were to side by side, she west: once and a half round over each other, slowing into the landing.
  const th = TH0 + (-2 * Math.PI - TH0) * smooth(t, FREE, LAND)
  return { c, d, th }
}

/** Her and him, falling together. */
export const sheFalls = (t: number): Pt => {
  const { c, d, th } = pair(t)
  return [c[0] - (d / 2) * Math.cos(th), c[1] - (d / 2) * Math.sin(th)]
}
export const heFalls = (t: number): Pt => {
  const { c, d, th } = pair(t)
  return [c[0] + (d / 2) * Math.cos(th), c[1] + (d / 2) * Math.sin(th)]
}
