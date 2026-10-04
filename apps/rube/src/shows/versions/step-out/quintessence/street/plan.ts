import type { Lane, Pt } from '../../../../../parts'
import { laneAt } from '../../../../../parts'
import { at, DURATION, LAST, onset, SEAM } from '../music'
import { Way } from '../negatives/plan'

/**
 * The street's numbers and clocks (the B1 builder's). The set and the part share one frame: the part's origin is the
 * street's, Walter comes in at (-0.5, 0), a ball on the pavement has its centre at y 0 and the pavement's top is at
 * y 0.13. Left to right: a pair of cellar doors in the pavement; a lamp post; the newsstand, shuttered; the long
 * pavement up to the corner, where the avenue opens; the far side.
 */

export const PAVE = 0.13
export const KERB = 0.52
export const IN = SEAM.street
export const V_IN = 1.2

/** Walter in at 1.2 cells a second; where he is at `t` while he still has that speed. */
const xIn = (t: number): number => -0.5 + V_IN * (t - IN)

/** The cellar doors: two steel plates he rolls over, each a clank (its near edge, its middle seam). */
export const CLANKS = [at(131, 3), at(131, 4)]
export const CELLAR = { x0: xIn(CLANKS[0]), mid: xIn(CLANKS[1]), x1: xIn(CLANKS[1]) + (xIn(CLANKS[1]) - xIn(CLANKS[0])) }

/** She comes to him on the strong third beat of bar 132, and they stop touching. */
export const MEET = at(132, 3)
export const TOUCH = 0.27
/** They set off together on the bar's last beat. */
export const SET_OFF = at(132, 4)

/** The newsstand: its body, its shutter (rolled up in two hauls), the front rack's three slots (Life the middle). */
export const STAND = { x0: 4.95, x1: 7.85, roof: -2.45, eave: -2.62, open: { x0: 5.08, x1: 7.72, top: -2.28 } }
export const HAULS = [onset(229.873, 0.5), at(133, 3)]
/** The three issues flipped down onto the front rack by the man inside: the last, Life, on the beat before the chord. */
export const FLIPS = [onset(231.498, 0.5), onset(232.23, 0.5), at(134, 4)]
export const SLOT_W = 0.78
export const SLOTS = [5.17, 6.07, 6.97]
export const COVER = { x0: SLOTS[1], x1: SLOTS[1] + SLOT_W, y0: -1.5, y1: -0.42 }
export const COVER_X = (COVER.x0 + COVER.x1) / 2
/** They stop before the cover on the last chord. */
export const STOP = LAST
/** They look a while; then they go on up the street together, and stop at the corner. */
export const ON = 235.3
export const CORNER = { x: 14.2, kerb: 14.55 }
export const FINAL = { cells: 10, x: 9.7, y: -2.75 }

/* ------------------------------------------------------------------ ways */

/** A run from rest to rest over `dist`: up to `v` over `up` s, on, down over `down` s, ending at `until` exactly. */
function glide(w: Way, dist: number, up: number, down: number, until: number): Way {
  const T = until - w.t
  const v = dist / (T - up / 2 - down / 2)
  const y = w.p[1]
  w.run([w.p[0] + (v * up) / 2, y], 0, v)
  const cruiseTo = until - down
  w.cruise(v, cruiseTo)
  w.run([w.p[0] + (v * down) / 2, y], v, 0)
  // Snap the last point's time to `until` (the runs' durations are exact; this only absorbs float error).
  w.t = until
  return w
}

const WALTER_STOP = COVER_X - 0.15
const WALTER_CORNER = CORNER.x - 0.3

function walterWay(): Way {
  const w = new Way([-0.5, 0], IN)
  w.cruise(V_IN, CLANKS[1])
  // Slowing as she comes, to a stop against her.
  w.run([w.p[0] + (V_IN * (MEET - CLANKS[1])) / 2, 0], V_IN, 0)
  w.rest(SET_OFF)
  glide(w, WALTER_STOP - w.p[0], 1.0, 1.6, STOP)
  w.rest(ON)
  glide(w, WALTER_CORNER - w.p[0], 1.4, 2.4, 245.6)
  return w.rest(DURATION)
}
export const WALTER_WAY = walterWay()
export const WALTER_LANE: Lane = { segs: WALTER_WAY.segs, fire: STOP - IN }
export const walterAt = (t: number): Pt => {
  const q = laneAt(WALTER_LANE, t - IN)
  return [q.x, q.y]
}

/** Cheryl: in from the right, out of shot, coming to him; then at his right hand all the way. */
const CHERYL_V = 1.4
function cherylWay(): Way {
  const meetX = walterAt(MEET)[0] + TOUCH
  const T = MEET - IN
  // A steady roll at 1.4, then slowing to meet him: 1.4·T1 + 0.7·T2 = distance, T1 + T2 = T. She starts far enough out.
  const T2 = 1.15
  const T1 = T - T2
  const from = meetX + CHERYL_V * T1 + (CHERYL_V * T2) / 2
  const w = new Way([from, 0], IN)
  w.cruise(-CHERYL_V, IN + T1)
  w.run([meetX, 0], CHERYL_V, 0)
  w.rest(SET_OFF + 0.06)
  glide(w, WALTER_STOP + TOUCH - w.p[0], 0.95, 1.6, STOP + 0.04)
  w.rest(ON + 0.1)
  glide(w, WALTER_CORNER + TOUCH - w.p[0], 1.4, 2.4, 245.7)
  return w.rest(DURATION)
}
export const CHERYL_WAY = cherylWay()
export const CHERYL_LANE: Lane = { segs: CHERYL_WAY.segs, fire: 0 }
export const cherylAt = (t: number): Pt => {
  const q = laneAt(CHERYL_LANE, t - IN)
  return [q.x, q.y]
}

/** Every strike on the street, in show seconds. */
export const STREET_STRIKES: number[] = [...CLANKS, MEET, ...HAULS, ...FLIPS, STOP]
