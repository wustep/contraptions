import { M } from './music'
import type { Pt } from './path'
import { DECK } from './world/ship'

/**
 * The voyage's plan: where everything is in the world, when each scene has the stage, and how the ships and the men
 * are handed from one scene to the next.
 *
 * The world runs left to right along one sea (waterline y = 0, up negative): Troy at the left end, the islands of the
 * voyage along it, Ithaca near the right end, and past Ithaca the open sea west into the sun.
 */

/** The places, as x ranges along the sea (cells). */
export const PLACES = {
  /** Troy: the city on its hill, its walls and gate, Athena's temple, and the beach where the horse is found. */
  troy: { x0: -130, x1: 12 },
  /** The Cyclops' island: black rock, a green slope, the cave. */
  cyclops: { x0: 60, x1: 135 },
  /** Telepylus: the giants' fjord, pines in fog. */
  giants: { x0: 180, x1: 265 },
  /** The shore of the dead: black sand under a low, hazy sun. */
  hades: { x0: 310, x1: 380 },
  /** The Sirens' rocks. */
  sirens: { x0: 420, x1: 470 },
  /** Thrinacia, Apollo's island, and the open sea where the storm takes the ship. */
  storm: { x0: 500, x1: 600 },
  /** Ogygia: a white dune over a turquoise sea, Calypso's cave. */
  ogygia: { x0: 640, x1: 720 },
  /** Ithaca: the beach, the cliff, the palace on top, and the harbour on the west side. */
  ithaca: { x0: 796, x1: 850 },
} as const

/**
 * Ithaca's landmarks (cells): the drawing and every scene that looks at it agree on these. The balls are people, as
 * tokens in a human-scale world, so the palace is small: a doorway is about three and a half balls tall.
 */
export const ITHACA = {
  /** The beach on the east side, where the raft comes in. */
  beach: 801,
  /** The plateau's top (y) and its east edge (x). */
  top: -9,
  gate: 814.2,
  /** The palace: the hall's floor (y) and its walls (x), the upper room over its east half, the loom by its window. */
  hall: { x0: 818, x1: 827.4, floor: -9, ceil: -10.75 },
  room: { x0: 818, x1: 822.45, floor: -10.75, ceil: -12.2 },
  loom: { x: 819.3, floor: -10.75 },
  /** The harbour on the west side, at the cliff's foot. */
  harbour: 838,
} as const

/** When each scene has the stage, show seconds. Scenes may run their drawings past their windows; the hero and the camera are theirs only inside. */
export const WINDOWS = {
  horse: [0, M.second],
  ithaca: [M.second, M.answer],
  troy: [M.answer, 140],
  cyclops: [140, M.pulse],
  giants: [M.pulse, M.tutti],
  hades: [M.tutti, 251.36],
  sirens: [251.36, 278.36],
  storm: [278.36, M.cut],
  wreck: [M.cut, M.hush],
  ogygia: [M.hush, M.return],
  raft: [M.return, 418],
  home: [418, M.quiet],
  hall: [M.quiet, M.last],
  shot: [M.last, M.fade],
  west: [M.fade, 549],
} as const

/** The show's length: the cue, and the credits after it in the quiet. */
export const END: number = WINDOWS.west[1]

/** Ships: 0 is his own, 1 and 2 sail with it from Troy until Telepylus. */
export const SHIPS = 3

/**
 * His men, by index: 0 to 5 sail in his own ship, 6 to 9 in ship 1, 10 to 13 in ship 2. Every one of them is a ball
 * from Troy to the day he is lost, and none is seen after it but among the dead.
 */
export const MEN = 14
export const shipOf = (man: number): number => (man < 6 ? 0 : man < 10 ? 1 : 2)

/** Places on a deck, in the ship's own frame (bow to the right): the hero at the stern's helm, the men along it. */
export const HELM: Pt = [-1.15, DECK - 0.13]
export function seat(man: number): Pt {
  const s = shipOf(man)
  const i = s === 0 ? man : s === 1 ? man - 6 : man - 10
  const n = s === 0 ? 6 : 4
  const x = -0.7 + (1.85 * (i + 0.5)) / n
  return [x, DECK - 0.13 * 0.86]
}

/**
 * The seams: how each scene hands the stage to the next. At a seam's time the ships are where it says, at the speeds
 * it says (cells a second, rightwards), the weather is as it says, the camera is on the framing it says, and the hero is
 * riding his ship (or, where `hero` is given, at rest there). A scene's tracks begin and end on these (`glide` with the
 * seam's speed as the end's), so nothing steps across a seam; the score puts the camera's key at the seam itself
 * (scenes keep their own keys a second clear of it).
 */
export interface Seam {
  t: number
  /** [x, speed] per ship; null: not on the sea. */
  ships: ([number, number] | null)[]
  weather: number
  /** The camera at the seam: following the hero (`off`) or holding a point (`at`). */
  cam: { cells: number; off?: Pt; at?: Pt }
  /** Where the hero rests, when he is not on a ship. */
  hero?: Pt
}

export const SEAMS: Seam[] = [
  // Away from Troy at first light: the three ships under sail, all hands aboard.
  { t: WINDOWS.troy[1], ships: [[30, 4], [24, 4], [18, 4]], weather: 0.2, cam: { cells: 16, off: [2.5, -2.2] } },
  // Away from the Cyclops' island with the sea rising: two men fewer (4 and 5).
  { t: WINDOWS.cyclops[1], ships: [[150, 4.5], [143, 4.5], [136, 4.5]], weather: 0.45, cam: { cells: 16, off: [2.5, -2.2] } },
  // Out of the giants' fjord: one ship, men 0 to 3 aboard (6 to 13 lost with ships 1 and 2).
  { t: WINDOWS.giants[1], ships: [[268, 5], null, null], weather: 0.35, cam: { cells: 14, off: [2, -1.8] } },
  // Away from the shore of the dead.
  { t: WINDOWS.hades[1], ships: [[392, 5], null, null], weather: 0.25, cam: { cells: 14, off: [2, -1.8] } },
  // Past the Sirens: man 3 lost to them.
  { t: WINDOWS.sirens[1], ships: [[480, 4.5], null, null], weather: 0.2, cam: { cells: 14, off: [2, -1.8] } },
  // The ship struck (the cut): everything after it is the wreck's.
  // Washed up on Ogygia: no ships; the hero at rest on the sand of its west beach, in the hush.
  { t: WINDOWS.wreck[1], ships: [null, null, null], weather: 0.08, cam: { cells: 7, at: [661.6, -1.4] }, hero: [660, -0.35] },
  // Washed up on Ithaca: the hero at rest on its beach.
  { t: WINDOWS.raft[1], ships: [null, null, null], weather: 0.15, cam: { cells: 9, at: [803, -2.2] }, hero: [801.5, -0.35] },
]

/** The sand where he comes ashore: Ogygia's west beach and Ithaca's east beach are flat at y = SAND over these x. */
export const SAND = -0.22
export const OGYGIA_LANDING = { x0: 656, x1: 664 }
export const ITHACA_LANDING = { x0: 798.5, x1: 804 }

/**
 * A track through [t, x, v] keys: a cubic between each pair that leaves the first at its speed and arrives at the
 * second at its own, so a ship gathers way, keeps it and comes to rest without a step in its pace.
 */
export function glide(keys: [number, number, number][]): (t: number) => number {
  const ks = [...keys].sort((a, b) => a[0] - b[0])
  return (t: number) => {
    if (t <= ks[0][0]) return ks[0][1] + ks[0][2] * (t - ks[0][0])
    const last = ks[ks.length - 1]
    if (t >= last[0]) return last[1] + last[2] * (t - last[0])
    let i = 0
    while (i + 1 < ks.length && ks[i + 1][0] <= t) i++
    const [t0, x0, v0] = ks[i]
    const [t1, x1, v1] = ks[i + 1]
    const h = t1 - t0
    const u = (t - t0) / h
    const u2 = u * u
    const u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * x0 + (u3 - 2 * u2 + u) * h * v0 + (-2 * u3 + 3 * u2) * x1 + (u3 - u2) * h * v1
  }
}
