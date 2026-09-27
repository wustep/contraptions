import played from '../../../../../../../scripts/shows/plans/satie-performance.json'

/**
 * The music, as it was played. `scripts/shows/satie-render.py` plays Gymnopédie
 * No. 1, Gnossienne No. 1 and Gnossienne No. 3 on the Salamander Grand's
 * samples, from the Mutopia engravings, and writes down every note as it lands
 * in the file (`scripts/shows/plans/satie-performance.json`). Nothing here is
 * measured off the audio and nothing needs to be: these are the notes the file
 * was made from, to the sample.
 *
 * The file is one period of a circle: the last piece's resonance runs on into
 * the first bar of the first. So the show is too. Show time runs from 0 to
 * PERIOD and is then 0 again, and everything in it is a function of show time
 * taken round that circle.
 */

export type Role = 'melody' | 'bass' | 'chord' | 'grace' | 'inner'

export interface Note {
  /** Show seconds: where the hammer lands in the file. */
  t: number
  /** MIDI pitch. */
  p: number
  /** Velocity it was played at. */
  v: number
  r: Role
  /** Which piece: 0 Gymnopédie No. 1, 1 Gnossienne No. 1, 2 Gnossienne No. 3. */
  piece: number
}

export interface Piece {
  key: string
  title: string
  marking: string
  /** Show time of its first bar, of its last note's onset, and of its last note's end. */
  from: number
  last: number
  end: number
  bars: number[]
}

/** Seconds of one time round. */
export const PERIOD: number = played.period
/** Where the show's zero is in the recording: the file carries this much of its own end before it, and of its start after it. */
export const MARGIN: number = played.margin
export const PIECES: Piece[] = played.pieces
export const NOTES: Note[] = played.notes.map((n) => ({ t: n.t, p: n.p, v: n.v, r: n.r as Role, piece: n.piece }))

export const MELODY = NOTES.filter((n) => n.r === 'melody')
export const BASS = NOTES.filter((n) => n.r === 'bass')
export const GRACES = NOTES.filter((n) => n.r === 'grace')

/** A chord as it is heard: its notes, rolled a few milliseconds apart from the bottom, as one. */
export interface Chord {
  /** Its lowest note's attack. */
  t: number
  /** Its loudest note's velocity. */
  v: number
  piece: number
}

export const CHORDS: Chord[] = []
for (const n of NOTES) {
  if (n.r !== 'chord') continue
  const last = CHORDS[CHORDS.length - 1]
  if (last && n.t - last.t < 0.08) last.v = Math.max(last.v, n.v)
  else CHORDS.push({ t: n.t, v: n.v, piece: n.piece })
}

/**
 * Where the melody breathes: a note held two seconds or more before the next phrase begins (the Gymnopédie's long
 * notes, the Gnossiennes' phrase ends). Not the long silences between pieces and round the seam, which the camera's
 * own keys take care of.
 */
export interface Breath {
  /** The held note's attack, and the next phrase's first. */
  at: number
  next: number
}

export const BREATHS: Breath[] = MELODY.slice(0, -1)
  .map((n, i) => ({ at: n.t, next: MELODY[i + 1].t }))
  .filter((b) => b.next - b.at >= 2.05 && b.next - b.at < 12)

/** Show time round the circle: any time at all, taken into [0, PERIOD). */
export const wrap = (t: number): number => {
  const u = t % PERIOD
  return u < 0 ? u + PERIOD : u
}

/**
 * A slow oscillation that comes round with the period: the nearest whole number of cycles a period to `hz`. What
 * anything that shimmers or sways runs on, so that nothing jumps at the end of the period.
 */
export const osc = (t: number, hz: number, phase = 0): number => {
  const n = Math.max(1, Math.round(hz * PERIOD))
  return Math.sin((2 * Math.PI * n * wrap(t)) / PERIOD + phase)
}

/** Which piece is playing (or last played) at show time `t`. */
export function pieceAt(t: number): number {
  const u = wrap(t)
  let i = PIECES.length - 1
  for (let j = 0; j < PIECES.length; j++) if (u >= PIECES[j].from) i = j
  // Before the first piece's first bar it is still the last piece's resonance.
  return u < PIECES[0].from ? PIECES.length - 1 : i
}

/**
 * How full the music is at show time `t`, 0 to 1: every note's weight (the melody most, then the bass, the chords
 * least), each dying away over a second and a half, smoothed over a few seconds and taken round the circle. It rises
 * through a phrase and falls in its breath, and is highest where the Gnossiennes run on. The render's own loudness
 * barely moves (a sustained, pedalled piano, played softly throughout), so this is the loudness the show answers.
 */
export const loudness: (t: number) => number = (() => {
  const STEP = 0.25
  const n = Math.round(PERIOD / STEP)
  const weight: Record<Role, number> = { melody: 1, bass: 0.8, chord: 0.35, grace: 0.3, inner: 0.3 }
  const raw = new Float64Array(n)
  for (const note of NOTES) {
    const w = weight[note.r] * (note.v / 50) ** 2
    const i0 = Math.ceil(note.t / STEP)
    for (let j = 0; j < 40; j++) {
      const s = (i0 + j) * STEP - note.t
      raw[(i0 + j) % n] += w * Math.exp(-s / 1.6)
    }
  }
  // Smoothed with a gaussian of two seconds, round the circle.
  const half = 16
  const kernel = Array.from({ length: 2 * half + 1 }, (_, j) => Math.exp(-0.5 * (((j - half) * STEP) / 2) ** 2))
  const total = kernel.reduce((a, b) => a + b, 0)
  const soft = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    let acc = 0
    for (let j = -half; j <= half; j++) acc += raw[(i + j + n) % n] * kernel[j + half]
    soft[i] = acc / total
  }
  // Scaled so the quiet twentieth of the period is 0 and the loud twentieth 1.
  const sorted = Array.from(soft).sort((a, b) => a - b)
  const lo = sorted[Math.floor(n * 0.05)]
  const hi = sorted[Math.floor(n * 0.95)]
  const level = Array.from(soft, (v) => Math.max(0, Math.min(1, (v - lo) / (hi - lo))))
  return (t: number) => {
    const x = wrap(t) / STEP
    const i = Math.floor(x)
    const f = x - i
    return level[i % n] * (1 - f) + level[(i + 1) % n] * f
  }
})()
