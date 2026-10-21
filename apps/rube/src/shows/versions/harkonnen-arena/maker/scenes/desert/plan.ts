import { R } from '../../../../../../parts'
import { beat, beatsIn, M } from '../../music'
import { clamp01, smooth, smoother, type Pt } from '../../paint'
import { T } from '../../timeline'

/**
 * The deep desert's plan: when everything happens, and where. The two of them sit on a rock at the west end; a long
 * way east on the flat the harvester crawls west, its plume going up and leaning away downwind. Worm sign comes in from
 * the east on the booms, the carryall comes down on the first great blow, takes hold on the second, the sand goes down
 * round the machine on the third, the mouth comes up out of it on the fourth, and on the fifth it goes back down with
 * the harvester in it.
 */

export const W = {
  open: T.open,
  /** The two hits in the chant: cut to the machine at work. */
  machine: 12.603,
  /** The first boom: the two of them on the rock hear it. */
  boom: M.firstBoom,
  /** The second: worm sign. */
  sign: beat('booms', 5),
  /** The first great blow: the carryall comes down. */
  alarm: M.phrase1,
  /** The second: its grapples take hold. */
  lock: M.phrase2,
  /** The third: the sand goes down round the machine. */
  sink: M.phrase3,
  /** The fourth: the mouth breaks the sand; the cables part. */
  maw: M.phrase4,
  /** The fifth: it goes back down. */
  gone: M.phrase5,
  end: T.thumper,
} as const

/**
 * The rock the two of them watch from: a mesa of dark sandstone over the flat at the desert's west end, cliffed on both
 * sides, its top a little uneven, a talus apron to the east.
 */
export const ROCK: Pt[] = [
  [-19, 0.4], [-17.5, -3.5], [-16.8, -6.2], [-15.2, -8.4], [-12.5, -9.3], [-8, -9.8], [-3, -10.2], [1.5, -10.0], [4.6, -10.3],
  [6.3, -10.05], [7.0, -8.6], [7.6, -6.0], [8.6, -4.2], [10.8, -2.2], [13.5, 0.4],
]
/** Where they sit: at the east end of its top, looking out over the flat. */
export const PAUL_SEAT: Pt = [5.25, -10.2 - R]
export const CHANI_SEAT: Pt = [4.25, -10.27 - R * 0.96]

/** The harvester: its length and height (cells), and where its middle is: it crawls west until it is held. */
export const RIG = { len: 18, h: 6.4 }
export const harvesterX = (t: number): number => 113 - 0.08 * Math.min(t, W.lock)

/** Where it is held, and where the mouth comes up. */
export const XH = harvesterX(W.lock)

/** Worm sign: the swell's middle, from far east to under the machine by the third blow. */
export function swellX(t: number): number {
  const u = clamp01((t - W.boom) / (W.sink - W.boom))
  // Quick from far off, slowing as it comes under the machine.
  return 238 + (XH - 238) * (1 - Math.pow(1 - u, 1.5))
}

/** How high the swell stands: it rises from the first boom, heaves on each boom and blow, and is gone into the hole. */
export function swellH(t: number): number {
  if (t < W.boom || t > W.sink + 3) return 0
  let h = 2.6 + 3.0 * smooth(t, W.boom, W.alarm)
  for (const b of beatsIn('booms', W.boom - 0.01, W.alarm)) h += 1.3 * b.s * heave(t, b.t)
  for (const at of [W.alarm, W.lock]) h += 1.8 * heave(t, at)
  return h * (1 - smooth(t, W.sink - 1, W.sink + 2.5))
}

/** A heave: up quickly, down slowly. */
export function heave(t: number, at: number): number {
  const s = t - at
  if (s <= 0) return 0
  return smooth(s, 0, 0.18) * Math.exp(-Math.max(0, s - 0.18) / 0.9)
}

/** The funnel round the machine: how deep it has gone, cells; it goes down a step on each beat of the drum. */
export function funnelDepth(t: number): number {
  if (t < W.sink) return 0
  const steps = beatsIn('phrases', W.sink, W.maw)
  let d = 0.9 * smoother(t, W.sink, W.sink + 1.2)
  for (const b of steps) d += 0.2 * smoother(t, b.t, b.t + 0.5)
  return d * (1 - smoother(t, W.gone + 0.4, W.gone + 6))
}
export const FUNNEL_R = 15

/** The mouth: how high its lip stands over the flat (negative up), and how far it has gone back down. */
export function mawRise(t: number): number {
  if (t < W.maw - 0.6) return 3
  const up = smoother(t, W.maw - 0.6, W.maw + 7.5)
  const down = smoother(t, W.gone, W.gone + 3.2)
  return 3 - 9.5 * up + 15 * down
}
export const MAW_R = 16

/** The harvester's middle at `t`: crawling, held, sinking into the funnel and then into the throat. */
export function harvesterAt(t: number): { x: number; y: number; tilt: number } {
  const x = harvesterX(t)
  const lift = -0.7 * smooth(t, W.lock + 0.4, W.lock + 6) * (1 - smooth(t, W.sink, W.sink + 2))
  const sink = funnelDepth(t) * 0.8 + 2.4 * smoother(t, W.maw, W.gone) + 11 * smoother(t, W.gone, W.gone + 2.4)
  const tilt = 0.05 * smooth(t, W.sink, W.maw) - 0.08 * smooth(t, W.maw, W.gone)
  return { x, y: lift + sink, tilt }
}

/** The beats of the drum under the lift: the carryall heaves on each. */
export const LIFT_BEATS = beatsIn('phrases', W.lock + 0.3, W.sink - 0.1).map((b) => b.t)
