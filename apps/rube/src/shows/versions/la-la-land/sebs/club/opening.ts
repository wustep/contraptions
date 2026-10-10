import { laneAt, mixHex, type Pt } from '../../../../../parts'
import { box, part, route, type Companion, type Company, type PartShot, type Way } from '../kit'
import { AT, notes as measured } from '../music'
import { LIPTONS_MAT, SEBS_MAT } from '../worlds'
import { HUSH_KEY, OPENING_END, PIANO } from './geometry'
import { drawPiano, heldOn, keysOf, play, PIANO_CELLS, type Keys, type Note, type Press } from './piano'
import { house, MIA_SEAT, SIDE_SEAT } from './room'
import { call, rising } from '../call'

/**
 * The opening: Seb's, now, and he is playing. The camera comes in from the city at night through the club's lit
 * section to the keys, where the thread is already at it: he hops from key to key on the melody, each key going
 * down under him on its note, its hammer up to the string. The piano's left hand plays itself, bass keys going down
 * on the strong low notes. The house lights go down to the one blue light on the piano as the first phrase settles.
 *
 * Then the camera finds her: Mia, at a table in the front row with David, lamp-lit. She is still, and then lifts
 * her eyes a hair to the stage while the theme plays on without us seeing him. Back to the keys, and the stage light
 * closes down on them. When it opens again (the stage is Lipton's now, in the dream, and the light on the same piano
 * is a warm lamp) he plays on, and the phrase before the hush runs up the keyboard in two waves to the top key,
 * landing on it on the hush.
 *
 * The part's frame is the piano's own.
 */

interface OpeningState {
  begin: number
  keys: Keys
}

/** Under this, a note is the left hand's (the piano plays it itself); from here up, his. */
const SPLIT = 61
/** Where the phrase before the hush begins: from here he runs up the keyboard. */
const FLOURISH = 58.4
/** The two of them are in the room until the stage light has closed on the keys. */
const COMPANY_TO = 39.3
/** She lifts her eyes to the stage over this. */
const TURN: [number, number] = [24.55, 25.75]

/**
 * Flux spikes in the solo intro that are not notes of the piano. Measured against the mix's amplitude
 * (formerly `la-la-land-sebs-mix-demo.mp3`; live playback is YouTube only): 1.254 is a pre-echo 120 ms before F#4 (the tone arrives at
 * 1.358), and the other four sit in the two long rests, where nothing new sounds. 14.338 is the loud one,
 * a forte hit while the camera is on the keys and the C# is only decaying.
 */
const NOT_A_NOTE = [1.254, 6.594, 7.001, 13.212, 14.338]

/** The melody he plays, and the left hand's notes, from the measured onsets. */
function theme(a: number, b: number): { melody: Note[]; bass: Note[] } {
  const all = measured(a, b, 0.1).filter((n): n is Note => n.midi !== null && !NOT_A_NOTE.some((t) => Math.abs(n.t - t) < 0.001))
  const melody: Note[] = []
  const bass: Note[] = []
  for (const n of all) {
    if (n.midi < SPLIT) {
      if (n.s >= 0.3) bass.push({ ...n })
      continue
    }
    const prev = melody[melody.length - 1]
    // Two onsets of one note, or a grace he would not reach: the first of them.
    if (prev && n.t - prev.t < 0.12) continue
    melody.push({ ...n })
  }
  // A pitch an octave off both its neighbours is the measure mistaking the octave: bring it home.
  for (let i = 1; i < melody.length - 1; i++) {
    const [p, n, q] = [melody[i - 1].midi, melody[i].midi, melody[i + 1].midi]
    for (const d of [-12, 12]) {
      if (Math.abs(n - p) > 9 && Math.abs(n - q) > 9 && Math.abs(n + d - p) < Math.abs(n - p) && Math.abs(n + d - q) < Math.abs(n - q)) melody[i].midi = n + d
    }
  }
  return { melody, bass }
}

/**
 * The run before the hush, 58.4 to 61.8 s: the measured notes' shape (up, back, up higher, the top), drawn into the
 * top two octaves of the keyboard so that it climbs to the top key, E6, on the hush.
 */
const RUN: [number, number][] = [
  [58.445, 74],
  [58.63, 79],
  [58.828, 69],
  [58.921, 69],
  [59.153, 71],
  [59.246, 72],
  [59.501, 76],
  [59.629, 76],
  [59.745, 79],
  [59.861, 81],
  [60.024, 81],
  [60.128, 79],
  [60.221, 72],
  [60.36, 72],
  [60.465, 76],
  [60.581, 79],
  [60.709, 81],
  [60.825, 83],
  [60.941, 84],
  [61.185, 88],
  [61.405, 83],
  [AT.hush, HUSH_KEY],
]

/** The key he is sitting on as the show begins, and the one he is playing into. */
const FIRST_SEAT = 64

/** Everything the opening plays, for a slot beginning at `begin` (show seconds): the ways, the keys, the company. */
function plan0(begin: number) {
  const { melody, bass } = theme(0.5, FLOURISH)
  const run: Note[] = RUN.map(([t, midi]) => ({ t, midi, s: 1 }))
  // He is on a key as we come in, and the first note is 0.789.
  const seat: Press = { midi: FIRST_SEAT, at: begin - 1, until: begin + 1, how: 'ride', s: 0.3 }
  const from: Way = { at: 0, p: heldOn(FIRST_SEAT) }
  const played = play(from, [...melody, ...run], begin, { then: 'tap', seat: { press: seat, midi: FIRST_SEAT } })
  const selves: Press[] = bass.map((n) => ({ midi: n.midi, at: n.t, until: n.t + 0.22, how: 'self' as const, s: n.s }))
  const still = (at: Pt): Companion => ({ x: at[0], y: at[1] })
  const company: Company[] = [
    {
      from: 0,
      to: COMPANY_TO,
      who: 'mia',
      at: (t) => {
        // She rolls back a hair on her seat, and her eyes come up to the stage.
        return still(miaAtTable(t))
      },
    },
    { from: 0, to: COMPANY_TO, who: 'david', at: (t) => still(davidAtTable(t)) },
  ]
  return {
    ways: [from, ...played.ways],
    keys: keysOf([seat, ...played.presses, ...selves]),
    hits: [...played.presses, ...selves].map((pr) => pr.at).sort((a, b) => a - b),
    fire: melody[0].t,
    company,
  }
}
const PLAN = plan0(0)

/** Every note of the melody he plays, show seconds and pitch, the run up to the hush included: what Lipton's sees go out to her. */
export const MELODY: { t: number; midi: number }[] = [...theme(0.5, FLOURISH).melody, ...RUN.map(([t, midi]) => ({ t, midi }))]

/** Where she sits at her table at the start, rolling back a hair as she lifts her eyes (the company's own place). */
const miaAtTable = (t: number): Pt => {
  const u = Math.max(0, Math.min(1, (t - TURN[0]) / (TURN[1] - TURN[0])))
  return [MIA_SEAT[0] + 0.074 * TOGETHER(t) - 0.058 * (u * u * (3 - 2 * u)), MIA_SEAT[1] - 0.04 * TOGETHER(t)]
}
/**
 * Who David is to her: as the camera finds their table they are leaning in together over it, touching, as the two of
 * them will at this table in the dream; then she draws back, and her eyes go up to the man at the piano.
 */
export const TOGETHER = (t: number): number => {
  const ease = (a: number, b: number) => { const v = Math.max(0, Math.min(1, (t - a) / (b - a))); return v * v * (3 - 2 * v) }
  return ease(21.9, 22.5) * (1 - ease(23.9, 24.5))
}
const davidAtTable = (t: number): Pt => [SIDE_SEAT[0] - 0.074 * TOGETHER(t), SIDE_SEAT[1] - 0.04 * TOGETHER(t)]
/**
 * At Seb's, now, the theme reaches her where she sits: the notes he plays go out to her table, the first of them a breath before she lifts her eyes to the stage. She knows it.
 */
/**
 * Before it reaches her: from his first note the theme rises off the strings into the dark of the club; then it
 * reaches her at her table. In the room as it is, which is graded grey, his music is the colour: these are gold, and
 * drawn over the grade (`score.ts`, the colour layer), the only full colour in the room.
 */
export const RISING = rising(MELODY.filter((n) => n.t < 21.6), '#F2C46B', 1.5, 4.2, 1.25, 1)
export const TABLE_CALL = call(MELODY.filter((n) => n.t > 21.6 && n.t < 30.6), miaAtTable, '#F2C46B', 0.68)

export const opening = part<OpeningState>(
  {
    name: 'opening',
    draw(p, s, c) {
      const t = c.t + s.begin
      // The same piano in both rooms: only its light changes. A cold blue at Seb's (warmed by the house lights while
      // they are up), a warm lamp at Lipton's.
      const liptons = c.theme.name === 'liptons'
      const cold = mixHex(SEBS_MAT.blue, SEBS_MAT.ivory, 0.38)
      const light = liptons ? { color: LIPTONS_MAT.lamp, lit: 1 } : { color: mixHex(cold, SEBS_MAT.candle, 0.45 * (house(t, false) - 0.12)), lit: 1 }
      drawPiano(p, c.k, c.ink, c.weight, t, s.keys, light)
    },

  },
  (slot) => {
    const plan = slot.begin === 0 ? PLAN : plan0(slot.begin)
    const [x0, y0, x1, y1] = PIANO_CELLS
    const lane = { segs: route(plan.ways), fire: plan.fire - slot.begin }
    // The what-if, as it begins: while he plays on and finds her across the room, an echo of him comes away from the
    // keys, over the case's end and down to her table, beside her; it holds there a beat, and comes apart. The dream
    // starts from that.
    const E = { from: 32.95, arrive: 34.45, to: 35.3, gone: [34.75, 35.25] as [number, number] }
    const start = laneAt(lane, E.from - slot.begin)
    // Up out of the keys, over the case's end, and down to her table, to the place beside her on the side away from
    // David: a cubic, eased so it slows as it comes. It holds there a beat, looking at her, and comes apart.
    const BESIDE: Pt = [MIA_SEAT[0] - 0.33, MIA_SEAT[1] - 0.04]
    const P: Pt[] = [[start.x, start.y], [start.x - 1.2, -0.35], [PIANO.caseX0 - 1.4, -0.4], BESIDE]
    const bez = (u: number): Pt => {
      const a = 1 - u
      const w = [a * a * a, 3 * a * a * u, 3 * a * u * u, u * u * u]
      return [w.reduce((s, c, i) => s + c * P[i][0], 0), w.reduce((s, c, i) => s + c * P[i][1], 0)]
    }
    const echo = {
      from: E.from,
      to: E.to,
      at: (t: number) => {
        const u = Math.max(0, Math.min(1, (t - E.from) / (E.arrive - E.from)))
        const [x, y] = bez(1 - (1 - u) ** 2)
        const a = Math.min(1, (t - E.from) / 0.35)
        const gone = Math.max(0, Math.min(1, (t - E.gone[0]) / (E.gone[1] - E.gone[0])))
        const spin = Math.atan2(MIA_SEAT[1] - y, MIA_SEAT[0] - x)
        return { x, y, a, spin: u < 1 ? spin : 0, gone }
      },
    }
    return {
      cells: box(x0, y0, x1, y1),
      exit: [OPENING_END[0] + 0.5, OPENING_END[1]],
      lane,
      state: { begin: slot.begin, keys: plan.keys },
      company: plan.company,
      echoes: [echo],
    }
  },
  (): PartShot[] => [
    // Wide on the city at night, the club's lit section small in it.
    { t: 0, cells: 26, hold: [0, -4.5] },
    // In through the room...
    { t: 6.5, cells: 9, hold: [1.9, -0.9] },
    // ...to the piano as the phrase settles, and on in while the lights go down on it.
    { t: 12.3, cells: 4.3, hold: [2.6, -0.75] },
    { t: 17.6, cells: 3.15, hold: [2.6, -0.38] },
    { t: 19.3, cells: 3.3, hold: [2.55, -0.3] },
    // Out to her table, and hold on her while he plays on. The move draws back on the way, so it crosses the room
    // (him at the keys, her at her table) rather than the piano's legs.
    { t: 20.75, cells: 6.2, hold: [-0.3, 1.25] },
    { t: 22.4, cells: 1.95, hold: [-2.05, 2.36] },
    // In, slowly, as she lifts her eyes to the stage.
    { t: 25.0, cells: 1.92, hold: [-2.06, 2.37] },
    { t: 31.0, cells: 1.32, hold: [-2.16, 2.44] },
    // Back to the room the same way, the two of them in one frame, and held while his eye finds her across it; then in
    // to the keys, and the stage light closes on them.
    { t: 33.0, cells: 6.7, hold: [0.05, 1.2] },
    { t: 34.6, cells: 6.6, hold: [0.05, 1.15] },
    { t: 36.0, cells: 3.0, hold: [2.95, -0.35] },
    { t: 39.4, cells: 2.8, hold: [3.0, -0.3] },
  ],
)

/** Every key struck in the opening: each note he lands on, each the left hand plays. Show seconds. */
export const OPENING_HITS: number[] = PLAN.hits
