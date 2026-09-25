import type p5 from 'p5'
import { type Pt, type Seg } from '../../../../parts'
import { box, part, smooth, type Companion, type Ctx } from './kit'
import { DURATION, LAST_CHORDS, PIANO2, STRUCK } from './music'
import { G_EARTH } from './physics'
import { dipAt, doorLight, drawPiano, keyAt, lampLight, ROOM, STEPS, treadBall, treadX, type Strike } from './room'
import { BAR } from './worlds'
import { gesture, hopAt, pchip, stroll } from './club-motion'

/**
 * The set is struck: the real club again, at the far end of the chain.
 *
 * The music drops out of its peak and the dream is gone: Seb at the bass
 * end of the keys, alone, one lamp, the last chord dying in the strings.
 * Then four notes: he rolls right over four keys, a hammer on each, and
 * stops. The strings come in under the last of them, and the camera pulls
 * back to the room: Mia at her table, her husband beside her. The look.
 * They rise and cross to the stairs, she first; at their foot she stops
 * and turns back toward the piano; he turns toward her, a nod; the swell.
 * On its peak she turns to the stairs, and they go up, a step at a time,
 * her husband a step behind; she stops in the door a moment; they go.
 * The last phrase: Seb alone, and he turns back to the keys. Then the
 * last chords, each ringing into its own silence, a hammer and a deep dip
 * on each, the room otherwise empty. On the last the lamp goes down, and
 * the room goes to the dark.
 *
 * The part's frame is the room's (`room.ts`).
 */

/* ------------------------------------------------------------------ the clock (show seconds) */

/** The four notes. */
const NOTES = PIANO2
/** The look: she rises from the table; she reaches the stairs; she turns back; his nod. */
const RISE = 352.044
const AT_STAIRS = 358.348
const TURN_BACK = 359.352
const NOD = 361.332
/** The swell's peak: she turns to the stairs. */
const GO = 370.416
/** Her steps up the stairs, a landing each, and his a step behind. */
const HER_STEPS = [373.325, 374.491, 375.71, 376.541, 377.156, 378.143]
const HIS_STEPS = [374.491, 375.71, 376.541, 377.156, 378.143, 379.495]
/** She reaches the door and stops; he comes up beside her; they go out. */
const AT_DOOR = 380.116
const BESIDE = 381.695
const OUT = 383.837
/** He turns back to the keys, before the last chords. */
const BACK = 396.997
export const FINALE_HITS: number[] = [...NOTES, ...LAST_CHORDS]

/* ------------------------------------------------------------------ him */

/** The four notes: from the left end of the keys, over four keys, and still. */
const notes = pchip([NOTES[0] - 0.25, NOTES[0] + 0.05, NOTES[1] + 0.03, NOTES[2] + 0.03, NOTES[3] + 0.05, NOTES[3] + 0.42], [-0.5, -0.42, -0.28, -0.13, 0.02, 0.07])

/** Where he is along the keys at show time `T`: the four notes, the nod toward her, and the turn back to the keys. */
function himX(T: number): number {
  return notes(T) + 0.07 * gesture(T, NOD, 0.35, 0.5, 1.1) + 0.08 * smooth(T, BACK, BACK + 0.9)
}

/** What he plays: the four notes, one key each, and the last chords, three hammers and a deep dip, ringing long. */
const STRIKES: Strike[] = [
  ...NOTES.map((t): Strike => ({ t, keys: [keyAt(himX(t))], depth: 1 })),
  ...LAST_CHORDS.map((t, i): Strike => {
    const key = keyAt(himX(t))
    return { t, keys: [key, key + 4, key + 7, key + 12], depth: 1.7, sustain: i === LAST_CHORDS.length - 1 ? 2.2 : 1.5 }
  }),
]

const him = (T: number): Pt => {
  const x = himX(T)
  return [x, dipAt(STRIKES, T, keyAt(x))]
}

/* ------------------------------------------------------------------ her, and her husband */

/** Where a ball rests on step `i`. */
const step = (i: number): Pt => [treadX(i), treadBall(i)]
const FOOT = ROOM.stairs[0] - 0.2
const DOOR: Pt = [ROOM.door[0], ROOM.door[1]]
/** Where they are once they are out: past the door, out of every frame. */
const GONE_X = ROOM.door[0] + 2.6
const HOP = 0.3

/** A climb of the stairs, a landing on each `lands[i]` (step i), from `from` on the floor; where the climber is at `T`, or null before it starts. */
function climbing(T: number, from: Pt, lands: number[]): Pt | null {
  if (T < lands[0] - HOP) return null
  let at = from
  for (let i = 0; i < lands.length; i++) {
    const to = step(i)
    if (T < lands[i]) return hopAt(at, to, HOP, G_EARTH, (T - (lands[i] - HOP)) / HOP)
    if (i + 1 < lands.length && T < lands[i + 1] - HOP) return to
    at = to
  }
  return step(lands.length - 1)
}

/** She: at her table; across to the stairs; back a step; up them; in the door; out. */
function her(T: number): Companion {
  const y = ROOM.floorBall
  if (T < RISE) return { x: ROOM.table, y }
  if (T < AT_STAIRS) return { x: ROOM.table + (FOOT - ROOM.table) * stroll((T - RISE) / (AT_STAIRS - RISE)), y }
  // She turns back toward the piano (a small roll back), holds through the swell, and turns to the stairs on its peak.
  const back = 0.28 * (smooth(T, TURN_BACK, TURN_BACK + 0.55) - smooth(T, GO, GO + 0.7))
  const top = step(STEPS - 1)
  if (T < HER_STEPS[0] - HOP) return { x: FOOT - back, y }
  const up = climbing(T, [FOOT, y], HER_STEPS)
  if (up && T < HER_STEPS[HER_STEPS.length - 1]) return { x: up[0], y: up[1] }
  // Along the top to the door, a stop in it, and out.
  if (T < AT_DOOR) return { x: top[0] + (DOOR[0] - top[0]) * stroll((T - HER_STEPS[HER_STEPS.length - 1]) / (AT_DOOR - HER_STEPS[HER_STEPS.length - 1])), y: DOOR[1] }
  if (T < OUT) return { x: DOOR[0], y: DOOR[1] }
  return { x: DOOR[0] + (GONE_X - DOOR[0]) * smooth(T, OUT, OUT + 1.9), y: DOOR[1] }
}

/** Her husband: beside her at the table; after her to the stairs, a step behind; up them a step behind; beside her in the door; out. */
function husband(T: number): Companion {
  const y = ROOM.floorBall
  const seat = ROOM.table + 0.36
  const wait = FOOT - 0.42
  if (T < RISE + 0.5) return { x: seat, y }
  if (T < AT_STAIRS + 0.55) return { x: seat + (wait - seat) * stroll((T - RISE - 0.5) / (AT_STAIRS + 0.05 - RISE)), y }
  if (T < HIS_STEPS[0] - HOP) return { x: wait, y }
  const up = climbing(T, [wait, y], HIS_STEPS)
  const last = HIS_STEPS[HIS_STEPS.length - 1]
  if (up && T < last) return { x: up[0], y: up[1] }
  const top = step(STEPS - 1)
  const side = DOOR[0] - 0.32
  if (T < BESIDE) return { x: top[0] + (side - top[0]) * stroll((T - last) / (BESIDE - last)), y: DOOR[1] }
  if (T < OUT + 0.25) return { x: side, y: DOOR[1] }
  return { x: side + (GONE_X - 0.32 - side) * smooth(T, OUT + 0.25, OUT + 2.15), y: DOOR[1] }
}

/* ------------------------------------------------------------------ the part */

interface FinaleState {
  begin: number
}

/** The lane: his position sampled finely where something happens (the notes, the nod, the turn, every chord), and one straight piece between. */
function laneOf(begin: number, end: number): Seg[] {
  const windows: [number, number][] = [
    [NOTES[0] - 0.3, NOTES[3] + 0.6],
    [NOD - 0.02, NOD + 2.2],
    [BACK - 0.02, BACK + 1.1],
    ...LAST_CHORDS.map((t): [number, number] => [t - 0.03, t + 0.7]),
  ]
  const segs: Seg[] = []
  let t = begin
  let at = him(t)
  const push = (to: number) => {
    const p = him(to)
    segs.push({ from: at, to: p, dur: to - t })
    at = p
    t = to
  }
  for (const [a, b] of windows) {
    if (a > t) push(a)
    for (let s = a + 0.015; s < b; s += 0.015) push(s)
    push(b)
  }
  push(end)
  return segs
}

export const finale = part<FinaleState>(
  {
    name: 'finale',
    draw: (p: p5, s: FinaleState, c: Ctx) => {
      const T = c.t + s.begin
      const light = lampLight({ dream: false }, T)
      // The struck chord's last shimmer in the strings, dying over the silence before the four notes.
      const shimmer = 0.9 * (1 - smooth(T, STRUCK + 1.5, NOTES[0] - 0.3))
      drawPiano(p, c, false, { strikes: STRIKES, now: T, light, shimmer })
      // The street's light through the door as she opens it to go, and gone once the door swings to behind them.
      const open = smooth(T, AT_DOOR - 0.5, AT_DOOR + 0.3) * (1 - smooth(T, OUT + 1.8, OUT + 3.2))
      doorLight(p, c, 0.55 * open, BAR.smoke)
    },
    over: (p: p5, s: FinaleState, c: Ctx) => {
      // The dark, after the last chord.
      const T = c.t + s.begin
      const dark = smooth(T, LAST_CHORDS[LAST_CHORDS.length - 1] + 0.6, DURATION - 0.1)
      if (dark <= 0.001) return
      const { k } = c
      const ctx = p.drawingContext as CanvasRenderingContext2D
      ctx.save()
      ctx.fillStyle = `rgba(7, 8, 11, ${0.94 * dark})`
      ctx.fillRect(-40 * k, -40 * k, 80 * k, 80 * k)
      ctx.restore()
    },
  },
  (slot) => {
    const segs = laneOf(slot.begin, slot.end)
    const last = segs[segs.length - 1].to
    return {
      cells: box(-8, -10, 27, 4),
      exit: [last[0] + 0.5, last[1]],
      lane: { segs, fire: NOTES[0] - slot.begin },
      state: { begin: slot.begin },
      company: [
        { from: slot.begin, to: slot.end + 1, at: her },
        { from: slot.begin, to: slot.end + 1, at: husband, who: 'husband' },
      ],
    }
  },
  (slot) => [
    // Tight on him at the bass end of the keys, through the decay and the four notes.
    { t: slot.begin, cells: 3, hold: [0.35, -0.5], w: 1 },
    { t: NOTES[3], cells: 3, hold: [0.35, -0.5], w: 1 },
    // The look: the room, the two of them at the table, in one pull-back.
    { t: NOTES[3] + 1.7, cells: 11, hold: [8.4, -1.6], w: 1 },
    { t: TURN_BACK, cells: 12, hold: [10.1, -2.0], w: 1 },
    { t: GO + 0.6, cells: 12, hold: [10.1, -2.0], w: 1 },
    // With them up the stairs, to the door.
    { t: HER_STEPS[0], cells: 10, hold: [14.5, -2.2], w: 1 },
    { t: AT_DOOR, cells: 9.5, hold: [15.2, -2.3], w: 1 },
    { t: OUT + 0.7, cells: 9.5, hold: [15.2, -2.3], w: 1 },
    // Back to him for the last chords, and still under the credits (the lamp above the frame, the top third dark).
    { t: BACK, cells: 8.5, hold: [7.0, -0.3], w: 1 },
    { t: LAST_CHORDS[7], cells: 8.5, hold: [7.0, -0.3], w: 1 },
    // The end: wide and still, the lamp in the frame to go down.
    { t: LAST_CHORDS[8], cells: 10.5, hold: [8.3, -1.6], w: 1 },
    { t: slot.end, cells: 10.5, hold: [8.3, -1.6], w: 1 },
  ],
)
