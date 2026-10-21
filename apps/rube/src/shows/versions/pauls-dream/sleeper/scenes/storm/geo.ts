import { M } from '../../music'
import type { Pt } from '../../paint'
import { DREAM_SHOT, JAMIS_FALLS, WINDOWS } from '../../plan'

/**
 * The night desert and the storm: where everything stands and when everything happens.
 *
 * The scene runs west to east along the floor of PLACES.night: the dune where the Harkonnen ornithopter comes down and
 * the stilltent is pitched (x about 720 to 735), then the open sand Paul flies east over at dawn, the storm's front face
 * (STORM.front), its body, and its back face (STORM.back), and the clear morning past it.
 *
 * The cue here is mostly quiet: after the great blow only the low voices are left (two booms, 275.17 and 277.07, then
 * nothing until the high voice at 288.08), so what happens in the hush happens on no note. From the voice on, the
 * visions open on its attack and on the booms, and the storm keeps to the drum fills that end each phrase.
 */

export const FROM = WINDOWS.storm[0]
export const TO = WINDOWS.storm[1]

/** When things happen, show seconds. */
export const T = {
  /** The hall dissolves out over the night flight. */
  dissolve: FROM,
  dissolveFor: 2.5,
  /** Jessica's Voice: the guard turns on the pilot. The second low boom. */
  voice: 277.067,
  /** The ornithopter, flown by no one, comes down on the dune. */
  land: 278.7,
  /** The hold opens, and Paul and Jessica come out. */
  hatch: 279.5,
  /** They go up the dune to the lee of its crest and pitch the tent. */
  tentUp: [283.0, 285.0] as [number, number],
  /** Into the tent. */
  inside: [285.2, 286.4] as [number, number],
  /** The high voice: the tent, close, and the first vision. */
  voiceIn: M.voice,
  /** The visions: Chani; the duel; the rider. */
  vision1: [M.voice, 297.2] as [number, number],
  vision2: [297.494, 300.48] as [number, number],
  vision3: [300.507, 309.209] as [number, number],
  /** Dawn greys the tent. */
  dawn: [305.5, 312.4] as [number, number],
  /** Out of the tent, and back down to the ornithopter. */
  out: 310.6,
  /** The hunters come over the dunes behind. */
  hunters: 311.56,
  /** Aboard, and up, on the fill. */
  board: 312.98,
  lift: 313.37,
  /** The fill's boom: the storm wall ahead. */
  wall: M.rise,
  /** Into the wall. */
  enter: 323.164,
  /** The wings folded; the drop. */
  fold: 324.96,
  /** The hunters torn apart. */
  breaks: [327.546, 329.149] as [number, number],
  /** The wings open; out of the storm's back into the morning. */
  open: 333.154,
  burst: 333.37,
  /** The glide down. */
  glide: 334.872,
} as const

/** The visions: which later moments, and how fast they play. */
export const VISIONS = {
  /** Chani on the crest: the shot Paul dreamed on Caladan. */
  chani: { at: DREAM_SHOT.from, rate: (DREAM_SHOT.to - DREAM_SHOT.from - 0.05) / (T.vision1[1] - T.vision1[0]) },
  /**
   * The duel, at its own speed and exactly fifty seconds on: its drum fill is this one's, beat for beat (297.98, 298.14,
   * 298.37, 298.95, 299.37 here; 347.98 to 349.37 there), and Jamis goes down on 349.63, here 299.62.
   */
  duel: { at: T.vision2[0] + 50, rate: 1 },
  /** The worm and its rider, slowed: the shot of it, from its first moment, which holds the rider still in its frame. */
  rider: { at: 389.1, rate: (393.0 - 389.1) / (309.209 - 300.507) },
}
export const JAMIS_IN_VISION = JAMIS_FALLS - 50

/** The floor of the dune field round the landing: a broad dune, its crest at 734. */
export function ground(x: number): number {
  const crest = 734
  return -0.35 - 1.9 * Math.exp(-(((x - crest) / 5.2) ** 2)) - 0.5 * Math.exp(-(((x - 712) / 7) ** 2))
}

/** A point on the floor, lifted by a ball's radius. */
export const onFloor = (x: number, r: number): Pt => [x, ground(x) - r]

/** Where the ornithopter comes down, and the tent. */
export const LANDING = 722.4
export const TENT = 716.4

/** The storm: its front face, its back face (x, cells), how high it stands. */
export const STORM = { front: 774, back: 836, top: -130 } as const

/** A monotone cubic through [t, v] keys, flat outside them. */
export function keyed(keys: [number, number][]): (t: number) => number {
  const ks = [...keys].sort((a, b) => a[0] - b[0])
  const n = ks.length
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) d.push((ks[i + 1][1] - ks[i][1]) / Math.max(1e-9, ks[i + 1][0] - ks[i][0]))
  const m: number[] = new Array(n).fill(0)
  if (n > 1) {
    m[0] = d[0]
    m[n - 1] = d[n - 2]
  }
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i])
  return (t: number) => {
    if (n === 1 || t <= ks[0][0]) return ks[0][1]
    if (t >= ks[n - 1][0]) return ks[n - 1][1]
    let i = 0
    while (i + 1 < n && ks[i + 1][0] <= t) i++
    const h = ks[i + 1][0] - ks[i][0]
    const u = (t - ks[i][0]) / h
    const u2 = u * u
    const u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * ks[i][1] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * ks[i + 1][1] + (u3 - u2) * h * m[i + 1]
  }
}
