import type { Pt } from '../../../../parts'
import type { Placed } from '../../../../plan'
import type { Framing } from '../../../registry'
import { director, type Shot } from './camera'
import { box, lay, standing } from './kit'
import { DURATION } from './credits'
import { CODA, P } from './music'
import { MountainShow } from './show'
import { PLAN } from './seams'
import { DOVRE, MOUNTAIN_THEME, PEER } from './worlds'
import { mountain } from './mountain'
import { gate } from './outside/gate'
import { deep } from './deep/deep'
import { court } from './hall/court'
import { wake } from './hall/wake'
import { mine } from './under/mine'
import { drum } from './under/drum'
import { gears } from './heart/gears'
import { runaway } from './heart/runaway'
import { fall } from './finale/fall'

/**
 * The whole show, in order: who has the ball from when to when. Every part is told its slot and builds to it; this
 * file only says the order, the folds and the seams, which are all on the phrases of the theme (`music.ts`):
 *
 *   0        the horns' low note; the flank at night, Peer and the Woman in Green climbing to the troll gate
 *   4.36     the theme, pianissimo: the gate (A A)
 *   22.32    down the tunnels, dripping stalactites (B B)
 *   40.19    the hall: the court asleep, the King on his throne; she brings Peer before him (A A)
 *   58.02    the second statement, faster: the court wakes, heads turning in time; "Slay him!"; the chase (A A)
 *   74.42    through the floor into the mines: the carts, running back west under the hall (B B)
 *   89.23    down again: the trolls' great drum (A A), to the fortissimo
 *   101.95   the third statement, fortissimo: the mountain's heart, its gears (A A B B)
 *   124.01   the runaway: the whole machine past all control (A A)
 *   134.25   the coda: the bells; the hall comes down; up the chimney through every level; out at the summit on
 *            the last two chords (149.52, 149.82); the dawn; the credits
 *
 * The folds: the mine and the heart are laid mirrored (`seams.ts`), so the levels stack under the hall and the
 * chimney rises through all of them.
 */

export function compose(): { show: MountainShow; camera: (t: number) => Framing } {
  const chain = lay({ col: 0, row: 0, begin: 0, ball: { color: PEER, ghost: false, id: 0 } }, [
    { part: gate, end: PLAN.gate.end },
    { part: deep, end: PLAN.deep.end, mirror: PLAN.deep.mirror },
    { part: court, end: PLAN.court.end, mirror: PLAN.court.mirror },
    { part: wake, end: PLAN.wake.end, mirror: PLAN.wake.mirror },
    { part: mine, end: PLAN.mine.end, mirror: PLAN.mine.mirror },
    { part: drum, end: PLAN.drum.end, mirror: PLAN.drum.mirror },
    { part: gears, end: PLAN.gears.end, mirror: PLAN.gears.mirror },
    { part: runaway, end: PLAN.runaway.end, mirror: PLAN.runaway.mirror },
    { part: fall, end: DURATION },
  ])

  // The sky and the far valley stand behind everything, in world cells (they are drawn only where there is sky).
  const sky: Placed = standing(mountain, 0, 0, box(-90, -70, 170, 40, 4), { on: true as const }, DURATION)

  const show = new MountainShow(
    [{ world: DOVRE, theme: MOUNTAIN_THEME, scenery: [sky], chain: chain.placed, from: 0 }],
    DURATION,
    chain.riders,
    [...chain.company].sort((a, b) => a.from - b.from),
  )

  let shots: Shot[] = [...chain.shots]
  if (!shots.some((s) => s.t <= 0)) shots.unshift({ t: 0, cells: 6 })
  if (!shots.some((s) => s.t >= DURATION)) shots.push({ t: DURATION, cells: 14 })
  // At every seam the two parts each put a key on the same instant; where they differ, the part being entered
  // wins, so no seam is a cut: the camera is one continuous take.
  shots = shots.filter((s, i) => !shots.some((o, j) => j > i && Math.abs(o.t - s.t) < 1e-6))
  const follow = director((t) => show.where(t) as Pt, shots, DURATION)
  return { show, camera: follow }
}

/** The part names in order, for the check and the log. */
export const ORDER = ['gate', 'deep', 'court', 'wake', 'mine', 'drum', 'gears', 'runaway', 'fall'] as const
/** The seams, in show seconds (each the start of a phrase, and the coda's first chord). */
export const SEAMS = [P[2], P[4], P[6], P[8], P[10], P[12], P[16], CODA] as const
