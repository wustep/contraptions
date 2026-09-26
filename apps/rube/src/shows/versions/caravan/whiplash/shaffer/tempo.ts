import type { Pt } from '../../../../../parts'
import { box, part, type PartShot, type Slot } from '../kit'
import { ONSETS, QUIET, TEMPO } from '../music'
import { PIT, ROOM_TOP, TEMPO_AT, WALL_R, toTempo } from './band-plan'
import { ROOM_KIT } from './band-people'
import { drawFarCorridor, drawSnareOver } from './bandroom'
import {
  CRASH, DROP_OFF, DUCK, GO, PEEK, PUSH, RUSH, SLAM, SLAP3, STOP2, TANNER_ON, TEMPO_END, TEMPO_WALK, THROW, WALL, WITH,
} from './tempo-motion'

/**
 * "Not quite my tempo" (80.79 → 130.5, beats 188 → 304). The band plays on; the test is a machine: Fletcher's
 * hand keeps a tempo over the snare and the ball has to meet it.
 *
 * Andrew on Tanner's kit. Fletcher comes from his podium and crouches beside it; his hand counts him in. He plays
 * two strokes with it and then rushes (a stroke every quarter, twice the hand), and the palm comes down flat on the
 * head beside him (196). Again: he drags (a high slow stroke every beat and a half), and the palm again (208.94).
 * Fletcher leans in close. Again, in time; and Fletcher walks away from him, to the alternate's chair, lifts it,
 * carries it back, and on 228 throws it: Andrew ducks behind the snare, the chair flies over him into the wall
 * behind the kit (229½) and comes down behind the drums (231). The counts: three strokes and, on four, the hand
 * slapped down on the hoop by his ear; again; his answer, a small roll toward him; the last slap (252). Again, in
 * time with the hand, stroke for stroke, to the last stop (276): not quite. Fletcher points him off: Tanner. He
 * drops to the floor; Tanner hops up over him onto his kit. A look back; then out, the door pushed on the band's
 * hit (298.71) and slammed behind him on its last (300), and down the dark corridor as the band drops out.
 *
 * The room is drawn by the band part (`bandroom.ts`); this part draws the far corridor, and the snare over him
 * while he ducks. Its frame is the band's moved to the snare (`TEMPO_AT`).
 */

const kit = ROOM_KIT.filter((s) => s.t >= TEMPO - 0.02 && s.t <= QUIET).map((s) => s.t)
const accents = ONSETS.filter((o) => o.t >= TEMPO && o.t < QUIET && o.s >= 0.9).map((o) => o.t)

/** Every strike this part makes, in show seconds (`hits.ts` gathers them; `check:shows` holds them to the music). */
export const TEMPO_HITS: number[] = [
  ...new Set([...kit, THROW, WALL, CRASH, DROP_OFF, TANNER_ON, PUSH, SLAM, ...accents].map((t) => Math.round(t * 1e4) / 1e4)),
].sort((a, b) => a - b)

interface TempoState {
  begin: number
}

/** The frame's shift: this part draws in the band's frame. */
const [OX, OY] = TEMPO_AT
const END = toTempo(TEMPO_END)

export const tempo = part<TempoState>(
  {
    name: 'tempo',
    draw: (p, s, c) => {
      const T = c.t + s.begin
      p.push()
      p.translate(-OX * c.k, -OY * c.k)
      drawFarCorridor(p, c, T, TEMPO_END[0] + 0.6)
      p.pop()
    },
    over: (p, s, c) => {
      const T = c.t + s.begin
      if (T < DUCK + 0.01 || T > PEEK + 0.7) return
      p.push()
      p.translate(-OX * c.k, -OY * c.k)
      drawSnareOver(p, c, T)
      p.pop()
    },
  },
  (slot: Slot) => ({
    // The kit and the chair's flight, and the far corridor to where the next part takes him.
    cells: [...box(-3.5, ROOM_TOP - OY, 1.5, PIT - OY + 0.5), ...box(WALL_R.x0 - OX - 0.5, PIT - OY - 3, END[0] + 1, PIT - OY + 0.5)],
    exit: [END[0] + 0.5, END[1]] as Pt,
    lane: TEMPO_WALK.lane(slot.begin, RUSH[0], TEMPO_AT),
    state: { begin: slot.begin },
  }),
  (slot: Slot): PartShot[] => {
    const at = (t: number, cells: number, hold: Pt): PartShot => ({ t, cells, hold: toTempo(hold), w: 1 })
    return [
      // On the kit, Fletcher coming in beside it; close for the test.
      at(slot.begin, 4.8, [21.4, -0.1]),
      at(82.4, 3.3, [22.15, -0.12]),
      at(STOP2 + 0.6, 3.4, [22.15, -0.15]),
      at(92.6, 4.6, [21.6, -0.1]),
      // Wide enough for the chair: Fletcher going for it behind him, and back with it.
      at(94.3, 6.8, [19.7, 0.1]),
      at(97.2, 6.3, [20.7, -0.3]),
      at(WALL + 0.3, 6.3, [21.4, -0.3]),
      // Close for the counts, and for the last trial: pushing in, slowly.
      at(100.9, 3.8, [22.15, -0.1]),
      at(SLAP3 + 0.3, 3.8, [22.15, -0.1]),
      at(WITH[0] + 2.2, 5.2, [22.7, 0.35]),
      at(WITH[WITH.length - 1], 3.3, [22.15, -0.12]),
      // Off the kit; Tanner over him; the look back; out.
      at(DROP_OFF + 0.2, 5.4, [22.9, 0.9]),
      at(TANNER_ON + 0.5, 5.1, [23.3, 1.2]),
      at(GO, 5.0, [24.0, 1.3]),
      { t: PUSH, cells: 5, off: [0.9, -0.8] },
      { t: slot.end, cells: 5, off: [0.9, -0.8] },
    ]
  },
)
