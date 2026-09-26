import type { Pt } from '../../../../../parts'
import { box, part, type PartShot, type Slot } from '../kit'
import { ONSETS, QUIET, TEMPO } from '../music'
import { PIT, ROOM_TOP, TEMPO_AT, WALL_R, toTempo } from './band-plan'
import { ROOM_KIT } from './band-people'
import { drawFarCorridor, drawSnareOver } from './bandroom'
import {
  CRASH, DROP_OFF, DUCK, GO, LEAN, PEEK, PUSH, RUSH, SLAM, SLAP1, SLAP2, SLAP3, STOP1, STOP2, STOP3, TANNER_ON, TEMPO_END, TEMPO_WALK, THROW, WALL, WITH,
} from './tempo-motion'

/**
 * "Not quite my tempo" (80.79 → 130.5, beats 188 → 304). The band plays on; the test is a machine: Fletcher's
 * hand keeps a tempo over the snare and the ball has to meet it.
 *
 * Andrew on Tanner's kit. Fletcher comes from his podium and stands over it, tall, behind the snare's right edge, his far
 * hand on his hip; his near hand counts him in. He plays
 * two strokes with it and then rushes (a stroke every quarter, twice the hand), and the palm comes down flat on the
 * head beside him (196). Again: he drags (a high slow stroke every beat and a half), and the palm again (208.94).
 * Fletcher leans in close. Again, in time; and Fletcher walks away from him, to the alternate's chair, lifts it,
 * carries it back, and on 228 throws it: Andrew ducks behind the snare, the chair flies over him into the wall
 * behind the kit (229½) and comes down behind the drums (231). The counts: his open palm up by Andrew's ear,
 * chopping down with him on one, two, three, and on four a wind-up and the palm slapped down flat on the hoop by his
 * ear, his head going down with it, Andrew knocked off his line; again; his answer, a small roll toward him; the last
 * slap (252). Again, in time with the hand, stroke for stroke, one wide shot pushing in to the last stop (276): not
 * quite. Fletcher points him off: Tanner. He
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
      // On the kit, Fletcher coming to stand beside it; the two of them for trial one, in on the palm at the stop.
      at(slot.begin, 4.8, [21.4, -0.1]),
      at(82.4, 3.7, [22.6, -0.25]),
      at(STOP1, 3.2, [22.45, -0.05]),
      // Trial two (dragging) wider: the whole kit, him standing over it, the alternate's chair at the frame's edge.
      at(86.8, 4.9, [21.0, -0.45]),
      at(STOP2, 3.2, [22.45, -0.05]),
      // Leaned in at his ear: rushing, or dragging? Close on the two heads.
      at(LEAN + 1.0, 2.9, [22.45, -0.2]),
      at(92.6, 4.6, [21.6, -0.1]),
      // Wide enough for the chair: Fletcher going for it behind him, and back with it.
      at(94.3, 6.8, [19.7, 0.1]),
      at(97.2, 6.6, [19.0, -0.7]),
      at(THROW, 6.5, [19.55, -0.7]),
      at(WALL + 0.3, 6.3, [21.3, -0.4]),
      // The counts, a steady two-shot pushing in a little on each slap: his palm raised by Andrew's ear, chopping
      // one, two, three with him, and slapped down on the hoop on four.
      at(100.9, 3.8, [22.6, -0.3]),
      at(SLAP1, 3.5, [22.5, -0.12]),
      at(104.3, 3.7, [22.6, -0.28]),
      at(SLAP2, 3.4, [22.5, -0.1]),
      at(SLAP3, 3.2, [22.5, -0.06]),
      // The last trial is one shot: out wide on its first stroke (the kit, him standing over it, Tanner waiting by
      // the door), and one long push all the way onto the palm at the stop.
      at(WITH[0] + 1.1, 7.6, [21.0, -0.9]),
      at(WITH[0] + 5.0, 7.3, [21.3, -0.8]),
      at(STOP3, 3.3, [22.45, -0.1]),
      // Off the kit; Tanner over him; the look back; out.
      at(DROP_OFF + 0.2, 5.4, [22.9, 0.9]),
      at(TANNER_ON + 0.5, 5.1, [23.3, 1.2]),
      at(GO, 5.0, [24.0, 1.3]),
      { t: PUSH, cells: 5, off: [0.9, -0.8] },
      { t: slot.end, cells: 5, off: [0.9, -0.8] },
    ]
  },
)
