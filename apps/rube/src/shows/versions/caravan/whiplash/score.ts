import type { Pt } from '../../../../parts'
import type { Framing } from '../../../registry'
import { director, type Shot } from './camera'
import { box, lay, standing, type Company } from './kit'
import { BAND, BUILD, BURST, CARNEGIE, DURATION, HUSH, LOUD, QUIET, RUBATO, SOLO, TEMPO } from './music'
import { CaravanShow } from './show'
import { ANDREW, CARNEGIE_HALL, CARNEGIE_THEME, ROADS, ROAD_THEME, SHAFFER, SHAFFER_THEME } from './worlds'
import { practice } from './shaffer/practice'
import { band } from './shaffer/band'
import { tempo } from './shaffer/tempo'
import { night } from './shaffer/night'
import { FOLDER_END, folder } from './road/folder'
import { crash } from './road/crash'
import { sabotage } from './carnegie/sabotage'
import { solo } from './carnegie/solo'
import { hush } from './carnegie/hush'
import { fast } from './carnegie/fast'
import { rubato } from './carnegie/rubato'
import { finale } from './carnegie/finale'
import { hall } from './carnegie/hall'
import { fletcherAt, jimAt } from './carnegie/conductor'
import { ARCH, LIP } from './carnegie/stage'

/**
 * The whole show, in order: who has the ball from when to when. Every part is told its slot and builds to it; this
 * file only says the order and the seams, which are all on the music:
 *
 *   0        Shaffer. The practice room at night: the drum intro, alone; Fletcher at the door when the bass comes in
 *   30.65    the band comes in: the studio band's room. Fletcher, Tanner on the kit, Andrew turning pages
 *   80.79    "not quite my tempo": Andrew on the kit, the test, the throw
 *   130.5    the band drops out: the practice room again, at night. The drill, the tape, the ice, the blood
 *   172.07   the band loud again: the road. The competition, Tanner's folder gone, Andrew takes the kit
 *   205.92   the drive, late; the crash on the stop-time breaks
 *   242.34   the last chorus: Carnegie Hall. The sabotage; the walk-off to his father; back; the band's cut-off
 *   270.52   the solo, alone
 *   323.27   the hush: Fletcher sets the cymbal straight
 *   369.98   the build
 *   423.34   the ride's rubato: the tempo that will not hold still
 *   504.0    the burst, the long roll, the nod; the silence; the last chord; the fist
 *   550.3    the credits, over the dark hall
 */

/** Show times at which the stage changes place: to the road, and to Carnegie Hall. */
export const SWITCH = { road: LOUD, carnegie: CARNEGIE }

export function compose(): { show: CaravanShow; camera: (t: number) => Framing } {
  const shaffer = lay({ col: 0, row: 0, begin: 0, ball: { color: ANDREW, ghost: false, id: 0 } }, [
    { part: practice, end: BAND },
    { part: band, end: TEMPO },
    { part: tempo, end: QUIET },
    { part: night, end: LOUD },
  ])
  const road = lay(shaffer.next, [
    { part: folder, end: FOLDER_END },
    { part: crash, end: CARNEGIE },
  ])
  const carnegie = lay(road.next, [
    { part: sabotage, end: SOLO },
    { part: solo, end: HUSH },
    { part: hush, end: BUILD },
    { part: fast, end: RUBATO },
    { part: rubato, end: BURST },
    { part: finale, end: DURATION },
  ])

  // The Carnegie frame: every Carnegie part enters at this cell (the ball on the snare), and the hall stands on it.
  const origin = carnegie.placed[0]
  const ox = origin.col
  const oy = origin.row
  const hallCells = box(ox + ARCH.x0 - 4, oy + ARCH.top, ox + ARCH.x1 + 4, oy + LIP + 4, 2)
  // Fletcher and Jim from the solo's first stroke to the end: the director's (`carnegie/conductor.ts`), in world cells.
  const people: Company[] = [
    { who: 'fletcher', from: SOLO, to: DURATION, at: (t) => { const [x, y] = fletcherAt(t); return { x: ox + x, y: oy + y } } },
    { who: 'jim', from: SOLO, to: DURATION, at: (t) => { const [x, y] = jimAt(t); return { x: ox + x, y: oy + y } } },
  ]

  const show = new CaravanShow(
    [
      { world: SHAFFER, theme: SHAFFER_THEME, scenery: [], chain: shaffer.placed, from: 0 },
      { world: ROADS, theme: ROAD_THEME, scenery: [], chain: road.placed, from: SWITCH.road },
      { world: CARNEGIE_HALL, theme: CARNEGIE_THEME, scenery: [standing(hall, ox, oy, hallCells, { on: true as const }, DURATION)], chain: carnegie.placed, from: SWITCH.carnegie },
    ],
    DURATION,
    [...shaffer.riders, ...road.riders, ...carnegie.riders],
    [...shaffer.company, ...road.company, ...carnegie.company, ...people].sort((a, b) => a.from - b.from),
  )

  let shots: Shot[] = [...shaffer.shots, ...road.shots, ...carnegie.shots]
  if (!shots.some((s) => s.t <= 0)) shots.unshift({ t: 0, cells: 5 })
  if (!shots.some((s) => s.t >= DURATION)) shots.push({ t: DURATION, cells: 9 })
  // Match cuts: at a change of place, the first key of the new place keeps the old place's last framing when it
  // has none of its own, so the ball holds still on the screen while the world round it changes.
  for (const at of [SWITCH.road, SWITCH.carnegie]) {
    const before = [...shots].filter((s) => s.t <= at - 1e-6).sort((a, b) => b.t - a.t)[0]
    const first = shots.find((s) => Math.abs(s.t - at) < 1e-6)
    if (before && first && before.hold && !first.hold) Object.assign(first, { cells: before.cells, hold: before.hold, w: before.w ?? 1, off: undefined })
  }
  // At every other seam the two parts each put a key on the same instant; where they differ, the part being entered
  // wins, so no seam is a cut: the camera is one continuous take.
  shots = shots.filter((s, i) => !shots.some((o, j) => j > i && Math.abs(o.t - s.t) < 1e-6))
  const follow = director((t) => show.where(t) as Pt, shots, DURATION)
  return { show, camera: follow }
}

/** The part names in order, for the check and the log. */
export const ORDER = ['practice', 'band', 'tempo', 'night', 'folder', 'crash', 'sabotage', 'solo', 'hush', 'fast', 'rubato', 'finale'] as const
export { BAND, TEMPO, QUIET, HUSH, BUILD, RUBATO, BURST }
