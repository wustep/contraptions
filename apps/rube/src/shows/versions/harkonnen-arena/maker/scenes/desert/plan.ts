import { R } from '../../../../../../parts'
import { beat, beatsIn, M, onsetNear } from '../../music'
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
  /** Two seconds on, an accent in the drum: the rock again, from far off. */
  after: onsetNear(99.5, 0.6, 0.2),
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
  let h = 3.4 + 3.6 * smooth(t, W.boom, W.alarm)
  for (const b of beatsIn('booms', W.boom - 0.01, W.alarm)) h += 1.6 * b.s * heave(t, b.t)
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

/**
 * The mouth: how high its lip stands over the flat (negative up). It breaks the sand round the machine on the fourth blow
 * and stands up out of the funnel, quick at first and slowing, its lip four times the machine's height up;
 * it gulps a little higher on each step the machine goes down; on the fifth blow it goes straight back down.
 */
export function mawRise(t: number): number {
  if (t < W.maw - 0.45) return 11
  const u = clamp01((t - W.maw + 0.45) / 7.5)
  const up = 1 - Math.pow(1 - u, 2.5)
  let gulp = 0
  for (const at of SWALLOW) gulp += 0.7 * heave(t, at)
  const down = smoother(t, W.gone, W.gone + 3.4)
  return 11 - 36 * up - gulp * (1 - down) + 39 * down
}
export const MAW_R = 16
/** How round the mouth is seen, its height against its width: it tips a little toward us as it stands. */
export const mawTip = (t: number): number => 0.36 + 0.1 * smooth(t, W.maw, W.maw + 6)

/** The drum under the mouth, every other beat: the machine goes down its throat a step on each. */
export const SWALLOW = [89.36, 91.38, 93.44, 95.43].map((t) => onsetNear(t, 0.25, 0.15))

/** How far the machine is down in the mouth: its tracks' foot under the lip, cells. */
function inMouth(t: number): number {
  let d = 4.4
  for (const at of SWALLOW) d += 3.2 * smoother(t, at, at + 0.55)
  return d
}

/**
 * The harvester's middle at `t`: crawling, held, sinking into the funnel; then carried up in the mouth that comes up
 * round it, tipping, and going down its throat.
 */
export function harvesterAt(t: number): { x: number; y: number; tilt: number } {
  const x = harvesterX(t)
  // Held, it comes up off the sand a little, and on each beat of the drum the carryall's tug lifts it and it settles.
  const lift = -(0.7 * smooth(t, W.lock + 0.4, W.lock + 6) + 0.28 * tugs(t)) * (1 - smooth(t, W.sink, W.sink + 2))
  let y = lift + funnelDepth(t) * 0.8
  if (t > W.maw - 0.45) {
    const carried = mawRise(t) + inMouth(t)
    y = t < W.gone ? Math.min(y, carried) : carried
  }
  const tilt = 0.05 * smooth(t, W.sink, W.maw) - 0.2 * smooth(t, W.maw + 1, SWALLOW[3])
  return { x, y, tilt }
}

/**
 * The beats of the drum under the lift: the carryall heaves on each. Where the drum's hit lands a little after the beat,
 * the heave takes the hit, so it never comes before it (62.14 to 62.32).
 */
export const LIFT_BEATS = beatsIn('phrases', W.lock + 0.3, W.sink - 0.1).map((b) => onsetNear(b.t, 0.8, 0.25))

/** The carryall's tugs, one a beat: up over a third of a second, settling back over the next. */
export function tugs(t: number): number {
  let u = 0
  for (const at of LIFT_BEATS) {
    const s = t - at
    if (s > 0) u += smooth(s, 0, 0.32) * Math.exp(-Math.max(0, s - 0.32) / 0.75)
  }
  return u
}
