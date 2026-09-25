import type { Pt } from '../../../../parts'
import type { Framing } from '../../../registry'
import { director, type Shot } from './camera'
import { box, lay, standing } from './kit'
import { BUILD, CHORUS, DURATION, HOME, KISS, STARS, STRUCK, SWING_FROM, SWING_MID, SWING_SOFT, swing } from './music'
import { EpilogueShow } from './show'
import { BACKLOT, CLUB, DREAM, SEB, SEBS } from './worlds'
import { room } from './room'
import { piano } from './piano'
import { kiss } from './kiss'
import { freeway } from './freeway'
import { studio } from './studio'
import { paris } from './paris'
import { stars } from './stars'
import { number } from './number'
import { home } from './home'
import { sebs } from './sebs'
import { finale } from './finale'

/**
 * The whole show, in order: who has the ball from when to when. Every part
 * is told its slot and builds to it; this file only says the order and the
 * seams, which are all on the music:
 *
 *   0        the club: Seb on the keys, the theme (piano, rubato); the silence; he rolls to her table
 *   65.32    the kiss: the burst. The room turns into the dream; up the stairs and out (the swell)
 *   b161     the freeway (the swing)
 *   b221     the studio (the swing's loudest bar)
 *   b282     Paris: the soft swing, then the musette waltz, and the cadence
 *   167.65   the stars: the flying rig; the crescendo
 *   192.96   the number: the build to the top of the stairs, then down them on the beat
 *   238.06   home
 *   272.44   the street to Seb's, and Seb's: the choral waltz, to its peak
 *   336.2    the set is struck: the club again. The piano's four notes, the look, the last chords, the credits
 */

/** Show times at which the stage changes universe: into the dream, and out of it. */
export const INTO = KISS
export const OUT = STRUCK

export function compose(): { show: EpilogueShow; camera: (t: number) => Framing } {
  const club = lay({ col: 0, row: 0, begin: 0, ball: { color: SEB, ghost: false, id: 0 } }, [{ part: piano, end: KISS }])
  const dream = lay(club.next, [
    { part: kiss, end: swing(SWING_FROM) },
    { part: freeway, end: swing(SWING_MID) },
    { part: studio, end: swing(SWING_SOFT) },
    { part: paris, end: STARS },
    { part: stars, end: BUILD },
    { part: number, end: HOME },
    { part: home, end: CHORUS },
    { part: sebs, end: STRUCK },
  ])
  const back = lay(dream.next, [{ part: finale, end: DURATION }])

  // The real room, at the start and at the end: its origin is the entry cell of the part that has the ball in it, and
  // the ball comes in at the left end of the keys, where it begins and where it is when the set is struck.
  const roomCells = (x: number, y: number) => box(x - 6, y - 8, x + 28, y + 4, 2)
  const end = back.placed[0]
  const show = new EpilogueShow(
    [
      {
        world: SEBS,
        theme: CLUB,
        scenery: [standing(room, 0, 0, roomCells(0, 0), { dream: false }, DURATION)],
        chain: club.placed,
        from: 0,
      },
      {
        world: BACKLOT,
        theme: DREAM,
        scenery: [standing(room, 0, 0, roomCells(0, 0), { dream: true }, DURATION)],
        chain: dream.placed,
        from: INTO,
      },
      {
        world: SEBS,
        theme: CLUB,
        scenery: [standing(room, end.col, end.row, roomCells(end.col, end.row), { dream: false }, DURATION)],
        chain: back.placed,
        from: OUT,
      },
    ],
    DURATION,
    [...club.riders, ...dream.riders, ...back.riders],
    [...club.company, ...dream.company, ...back.company].sort((a, b) => a.from - b.from),
  )

  const shots: Shot[] = [...club.shots, ...dream.shots, ...back.shots]
  if (!shots.some((s) => s.t <= 0)) shots.unshift({ t: 0, cells: 5 })
  if (!shots.some((s) => s.t >= DURATION)) shots.push({ t: DURATION, cells: 5 })
  // Match cuts: the first key of the dream keeps the room's last framing, so the kiss is one picture with the light
  // changed; and the first key after the set is struck keeps the dream club's last framing.
  for (const at of [INTO, OUT]) {
    const before = [...shots].filter((s) => s.t <= at - 1e-6).sort((a, b) => b.t - a.t)[0]
    const first = shots.find((s) => Math.abs(s.t - at) < 1e-6)
    if (before && first && before.hold && !first.hold) Object.assign(first, { cells: before.cells, hold: before.hold, w: before.w ?? 1, off: undefined })
  }
  const follow = director((t) => show.where(t) as Pt, shots, DURATION)
  return { show, camera: follow }
}
