import type p5 from 'p5'
import { type Pt } from '../../../../parts'
import { box, carried, part, route, type Companion, type Ctx, type Way } from './kit'
import { PIANO_END } from './music'
import { hop } from './physics'
import { dipAt, drawPiano, keyAt, KISS_AT, ROOM, type Strike } from './room'
import { gesture, pchip } from './club-motion'

/**
 * The club, after hours: Seb on the keys.
 *
 * He rolls along the keys from the bass end, and every note he plays is a
 * key that sinks under him, a hammer that flies up to its string, the string
 * ringing, the damper lifting; he dips with the key. The music is rubato,
 * and so is he: in the sparse intro he waits on a key, plays it, and rolls
 * on a little; when the theme comes he flows, paced by its phrases, faster
 * as it fills, and leans into the last chords. Then the silence: he pushes
 * off the treble end of the keys, drops to the floor, and rolls across the
 * room to her table, and touches her on the burst. Mia sits at her table
 * the whole time, and glances at the piano twice.
 *
 * The part's frame is the room's (`room.ts`): the keys along y = 0, the
 * floor at y = 1.
 */

/** The notes he plays, as measured: time and strength. Every note the theme has over 0.3, and the intro's melody over 0.2. */
const NOTES: [number, number][] = [
  [0.592, 0.56], [2.241, 0.6], [2.798, 0.22], [3.361, 0.23], [4.261, 0.26], [5.602, 0.21], [8.365, 0.49], [8.864, 0.32], [9.352, 0.36], [9.834, 0.26], [10.942, 0.22], [12.156, 0.24], [14.147, 0.23],
  [18.977, 0.88], [19.499, 0.73], [19.992, 1.52], [20.376, 0.7], [20.846, 0.6], [21.38, 0.82], [21.954, 0.31], [22.756, 0.98], [24.422, 0.57], [24.787, 0.83], [25.194, 1.3], [25.612, 0.78], [26.024, 0.69], [26.389, 0.61], [26.842, 0.77], [27.655, 0.77], [28.038, 0.98], [28.369, 0.76], [28.764, 0.47], [29.182, 0.36], [29.605, 0.69], [30.07, 0.84], [30.424, 0.83], [30.79, 0.49], [31.109, 0.56], [31.469, 0.66], [32.107, 0.61], [32.787, 0.59],
  [33.721, 1.02], [34.029, 1.11], [34.313, 1.08], [34.621, 0.56], [34.923, 0.64], [35.248, 0.54], [35.608, 0.5], [36.246, 0.73], [36.943, 0.49], [37.756, 0.75], [38.098, 0.9], [38.348, 1.28], [38.638, 0.72], [38.893, 0.83], [39.172, 0.6], [39.457, 0.86], [40.095, 0.67], [40.838, 1.09], [41.581, 0.33], [42.26, 0.94], [42.806, 1.16], [43.433, 1.01], [43.996, 0.72], [44.559, 0.54], [45.192, 0.74], [45.546, 1.2], [45.796, 0.7], [46.039, 0.55], [46.289, 0.57], [46.55, 0.53], [46.811, 0.48], [47.322, 0.54], [47.583, 0.42], [47.833, 0.7], [48.152, 0.62], [48.547, 0.58], [48.901, 0.69], [49.145, 0.59], [49.366, 0.53], [49.604, 0.71], [49.876, 0.54], [50.149, 0.73], [50.712, 0.77], [51.264, 0.54], [51.844, 0.51], [52.175, 0.7], [52.431, 0.74], [52.692, 0.39], [52.953, 0.56], [53.516, 0.58], [53.754, 0.62], [53.992, 0.91], [54.213, 0.34], [54.445, 0.6], [54.869, 0.71], [55.113, 0.46], [55.362, 0.61], [55.832, 0.51], [56.111, 0.3], [56.442, 0.76], [57.063, 0.65], [57.585, 0.37], [57.998, 0.41], [58.433, 0.61], [58.729, 0.68], [58.955, 0.42], [59.31, 0.47], [59.664, 0.44], [60.024, 0.52], [60.511, 0.5],
  [60.743, 0.65], [60.987, 1.14], [61.208, 1.48], [61.579, 1.5],
]
/** The last chords: he leans on them, and more than one hammer flies. */
const CHORDS = 60.7
export const PIANO_HITS: number[] = NOTES.map(([t]) => t)

/** Where the theme begins (the intro is a note, a rest, a note). */
const THEME = 18.977
/** The intro: where he is for each of its notes, a key or two on from the last. */
const INTRO_X = [-0.43, -0.15, -0.01, 0.13, 0.41, 0.69, 1.11, 1.25, 1.39, 1.53, 1.81, 2.09, 2.37]
/** The theme, paced by its phrases: (time, x) anchors he flows through; he leaves the keys at the end at `OFF_V`. */
const PACE: [number, number][] = [
  [THEME, 2.6], [22.9, 3.6], [24.42, 3.85], [28.5, 4.9], [33.72, 6.0], [38.35, 7.0], [45.55, 8.4], [52.2, 9.5], [58.4, 10.3], [61.58, 10.7], [62.5, 10.95], [PIANO_END, 11.85],
]
const OFF_V = 2.9
/** The case's treble cheek: he rolls over it off the case's end, and drops to the floor. */
const CASE_END = ROOM.keys[1] + 0.55
const DROP_T = Math.sqrt((2 * (ROOM.floorBall - 0)) / 12)

/** His x along the keys at `t`: a monotone cubic through the intro's steps and the theme's anchors. */
const along = (() => {
  const ts: number[] = [0]
  const xs: number[] = [-0.5]
  NOTES.slice(0, INTRO_X.length).forEach(([t], i) => {
    // He is on the key a moment before the note, and stays through most of the rest; then a short roll to the next.
    const next = i + 1 < INTRO_X.length ? NOTES[i + 1][0] : THEME
    const g = next - t
    let roll = Math.max(0.25, Math.min(0.9, g * 0.45))
    let go = next - 0.12 - roll
    if (go < t + 0.1) {
      go = t + 0.1
      roll = next - 0.12 - go
    }
    ts.push(t - 0.12, go)
    xs.push(INTRO_X[i], INTRO_X[i])
  })
  for (const [t, x] of PACE) {
    ts.push(t)
    xs.push(x)
  }
  return pchip(ts, xs, 0, OFF_V)
})()

/** What the notes are on the keys: which key he is over, how deep he leans. */
const STRIKES: Strike[] = NOTES.map(([t, s]) => {
  const key = keyAt(along(t))
  if (t < CHORDS) return { t, keys: [key], depth: 0.8 + 0.4 * Math.min(1, s) }
  const chord = s > 1.4 ? [key - 7, key, key + 4, key + 7] : s > 1 ? [key - 7, key, key + 4] : [key, key + 4]
  return { t, keys: chord, depth: 1.1 + 0.5 * Math.min(1, s / 1.5) }
})

/** The ball on the keys: along them, dipping with the key under it. */
const onKeys = (t: number): Pt => {
  const x = along(t)
  return [x, dipAt(STRIKES, t, keyAt(x))]
}

interface PianoState {
  begin: number
}

export const piano = part<PianoState>(
  {
    name: 'piano',
    draw: (p: p5, _s: PianoState, c: Ctx) => drawPiano(p, c, false, { strikes: STRIKES, now: c.t, light: 1 }),
  },
  (slot) => {
    const segs = carried(onKeys, 0, PIANO_END, Math.round(PIANO_END / 0.025))
    // Off the keys over the cheek, off the case's end, down to the floor, and across to her table: he touches her on the burst.
    const edge: Way = { at: PIANO_END + (CASE_END - 11.85) / OFF_V, p: [CASE_END, 0] }
    const land: Pt = [CASE_END + OFF_V * DROP_T, ROOM.floorBall]
    const landAt = edge.at + DROP_T
    const run = KISS_AT[0] - land[0]
    const T = slot.end - slot.begin - landAt
    const v1 = (2 * run) / T - OFF_V
    segs.push(...route([{ at: PIANO_END, p: [11.85, 0] }, edge, hop(edge, land, landAt), { at: slot.end - slot.begin, p: KISS_AT, ramp: [OFF_V, v1] }]))
    const mia = (t: number): Companion => {
      // A glance toward the piano: a small roll his way, and back by the next phrase.
      const look = gesture(t, 22.9, 0.7, 1.0, 1.6) + gesture(t, 45.6, 0.6, 1.4, 1.8)
      return { x: ROOM.table - 0.07 * look, y: ROOM.floorBall }
    }
    return {
      cells: box(-9, -10, 25, 3),
      exit: [KISS_AT[0] + 0.5, KISS_AT[1]],
      lane: { segs, fire: NOTES[0][0] },
      state: { begin: slot.begin },
      company: [{ from: slot.begin, to: slot.end, at: mia }],
    }
  },
  (slot) => [
    // The first frame is the room: the piano in its lamp, and Mia at her table across the floor. Through the sparse
    // intro the camera comes in on the keys, arriving as the theme begins; the same wide comes back for the chords.
    { t: slot.begin, cells: 10.2, hold: [8.4, -1.2], w: 1 },
    { t: THEME, cells: 3.0, off: [0.35, -0.55] },
    { t: 33.72, cells: 3.6, off: [0.45, -0.7] },
    // The second half of the theme: the camera opens out and drifts across the room to her, listening at her table,
    // with him still at the frame's left on the keys; then back in on the keys for the phrase before the chords.
    { t: 42.0, cells: 7, hold: [12.0, -1.0], w: 1 },
    { t: 48.0, cells: 7, hold: [13.0, -1.0], w: 1 },
    { t: 52.0, cells: 4.6, off: [0.6, -0.8] },
    { t: 60.5, cells: 8.5, hold: [9.9, -1.3], w: 1 },
    { t: 61.6, cells: 8.5, hold: [9.9, -1.3], w: 1 },
    { t: 64.0, cells: 5, hold: [14.4, -0.2], w: 1 },
    { t: slot.end, cells: 5, hold: [14.4, -0.2], w: 1 },
  ],
)

