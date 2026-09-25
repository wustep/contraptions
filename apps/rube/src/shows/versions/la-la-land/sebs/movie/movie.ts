import type p5 from 'p5'
import type { Pt, Seg } from '../../../../../parts'
import { alpha, box, carried, frame, glow, hash, part, ring, rgba, route, smooth, type Companion, type Ctx, type PartShot, type Way } from '../kit'
import { hop } from '../physics'
import { MOVIE_MAT as M } from '../worlds'
import { box2, lerp, seg, shape, soft, trackAt, vgrad, type Key } from './movie-kit'

/**
 * The home movie: their life on eight-millimetre film, as it might have been.
 *
 * The cover lifts on a projector in a dark room, its reels turning, its beam
 * on a screen; the camera goes in until the film is the frame. Then the life,
 * in six shots joined by match cuts: at every splice the three of them stay
 * exactly where they are and the world changes round them, a year gone in a
 * frame. He comes home up the porch steps on the melody's climb and lands, on
 * its top note, at the boy's first birthday; he knocks the present and the
 * balloons go up one to a note; the sea chases them up the beach; he bounces
 * on the diving board, higher, higher, and dives on the loudest note; they
 * roll home through a field that flowers as he passes; evening on the couch,
 * the boy asleep, and he puts the lamp out. The camera comes back out of the
 * screen as the film runs out through the gate, white, and the dark comes.
 *
 * Everything in the film is drawn inside the gate; everything outside it is
 * the room, which is drawn over the balls, so nothing of the film is ever
 * seen outside the film. The film's warm wash, its flicker and its gate's
 * soft corners lie over the balls too: they are in the film.
 *
 * The part's frame: he comes in on the garden path (0, 0 is the path, a ball
 * resting on it); the house stands to the left, its porch 0.6 up.
 */

/* ------------------------------------------------------------------ the reel */

const BEGIN = 340.5
const END = 395.3
/** The gate opens from the screen to the frame, and closes back to the screen at the end. */
const GATE0 = 345.9
const GATE1 = 347.5
const BACK0 = 390.0
const BACK1 = 392.9
/** The splices, each on the note that makes it: the party, the beach, the pool, the field, home. */
const CUTS = [349.89, 358.539, 364.275, 373.516, 381.887]
/** The film's tail through the gate: bare light. */
const TAIL = 393.137

const shotAt = (t: number): number => {
  let i = 0
  while (i < CUTS.length && t >= CUTS[i]) i++
  return i
}

/** The projected picture on the screen, at the start (round the house) and at the end (round the couch). */
interface Rect {
  x0: number
  y0: number
  x1: number
  y1: number
}
const IMG1: Rect = { x0: -7.3, y0: -4.25, x1: 1.5, y1: 2.35 }
const IMG2: Rect = { x0: 2.0, y0: -3.05, x1: 8.4, y1: 1.75 }

/* ------------------------------------------------------------------ the music it strikes */

/** The garden gate: he pushes it on the first note of the movie; its spring shuts it on a later one. */
const GATE_PUSH = 345.095
const GATE_SHUT = 347.521
/** The melody climbs: a step to a note, and the top of it is the splice. */
const STEPS = [348.891, 349.309, 349.53, 349.89]
/** The present: he knocks it, the lid flies, a balloon goes up on each note of the tune; the lid lands. */
const KNOCK = 351.852
const BALLOONS = [351.852, 352.247, 352.491, 352.874, 353.117, 353.489]
const LID_DOWN = 352.491
const CANDLE = 356.508
/** The boy climbs down from his chair. */
const SON_DOWN = 357.97
/** The sea: three small waves on the climb, the big one on the loudest note, and he lands in its wash. */
const WAVES = [358.539, 358.946, 359.189]
const BREAKER = 359.549
const WASHED = 360.13
const TIP_BUCKET = 361.883
const LAST_WAVE = 363.102
/** The diving board: three little bounces on the beat, two big ones, and the dive. */
const LANDS = [366.005, 366.597, 367.154, 368.327, 369.476]
const SPLASH = 370.614
const SON_SPLASH = 372.355
/** The field: a flower opens as he passes on each of these. */
const BLOOMS = [374.921, 375.908, 376.349, 376.732, 377.347, 379.693, 380.308, 380.97]
/** Home: the cushions take them; the boy nods off against her; he puts the lamp out. */
const ASLEEP = 387.019
const LAMP_OFF = 391.93

/** Every strike of the home movie (show seconds): the splices are struck too, each a frame of light on its note. */
export const MOVIE_HITS = [GATE_PUSH, GATE_SHUT, ...STEPS, ...BALLOONS, LID_DOWN, CANDLE, SON_DOWN, ...WAVES, BREAKER, WASHED, TIP_BUCKET, LAST_WAVE, CUTS[2], ...LANDS, SPLASH, SON_SPLASH, CUTS[3], ...BLOOMS, CUTS[4], ASLEEP, LAMP_OFF]
  .filter((t, i, a) => a.indexOf(t) === i)
  .sort((a, b) => a - b)

/* ------------------------------------------------------------------ the places */

/** Where a ball resting on the ground is (its centre), for a ball of radius r, at the level the shots share. */
const LAWN = -0.47
const R = 0.13
const SON_R = (s: number) => 0.13 * 0.62 * s
/** How big the boy is in each shot (a baby, one, then a boy). */
const SON_SIZE = [0.72, 0.85, 1, 1, 1, 1]

/** The porch steps, from the path up to the porch: tops and the x of each riser (they rise to the left). */
const STEP_TOP = [-0.02, -0.17, -0.32, LAWN]
const STEP_X = [-2.8, -3.08, -3.36, -3.64]
/** The garden gate: hinged at the left post, its latch edge on the right. */
const GATE_HINGE = -1.47
const GATE_W = 0.66
/** The pram on the porch, and the boy in it. */
const PRAM_X = -4.95
/** The present on the lawn at the party. */
const GIFT: Rect = { x0: -3.32, y0: LAWN - 0.3, x1: -2.98, y1: LAWN }
/** The high chair's seat (the boy sits where the pram had him). */
const CHAIR_X = PRAM_X - 0.02
const CHAIR_SEAT = -0.93
/** The beach: flat sand to the left, the sea from the right; the water's level. */
const SEA_EDGE = -2.55
const SEA = -0.38
/** The pool: the diving board's root and tip; the water's top; the pool's near wall. */
const BOARD_ROOT = -3.3
const BOARD_TIP = -1.9
const POOL_X0 = -2.85
const WATER = -0.3
const DIP = 0.1
/** The couch and the lamp at home. */
const COUCH_X0 = 4.15
const COUCH_X1 = 6.1
const LAMP_X = 6.55
const BEAD: Pt = [6.25, -0.84]

/** The field's ground, a smooth line through points: down from the pool's edge into a hollow and up to the couch. */
const FIELD: Pt[] = [
  [-10, -0.55],
  [-3.55, LAWN],
  [-1.3, WATER + SON_R(1)],
  [0.0, WATER + R],
  [1.6, 0.06],
  [3.1, 0.16],
  [4.6, 0.02],
  [5.2, -0.01],
  [5.7, -0.02],
  [10, -0.4],
]
const fieldSlopes = (() => {
  const n = FIELD.length
  const d = (i: number) => (FIELD[i + 1][1] - FIELD[i][1]) / (FIELD[i + 1][0] - FIELD[i][0])
  const m: number[] = new Array(n).fill(0)
  for (let i = 1; i < n - 1; i++) {
    const a = d(i - 1)
    const b = d(i)
    m[i] = a * b <= 0 ? 0 : (2 * a * b) / (a + b)
  }
  m[0] = d(0)
  m[n - 1] = d(n - 2)
  return m
})()
function ground(x: number): number {
  const P = FIELD
  if (x <= P[0][0]) return P[0][1]
  for (let i = 0; i < P.length - 1; i++) {
    if (x > P[i + 1][0]) continue
    const h = P[i + 1][0] - P[i][0]
    const u = (x - P[i][0]) / h
    const u2 = u * u
    const u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * P[i][1] + (u3 - 2 * u2 + u) * h * fieldSlopes[i] + (-2 * u3 + 3 * u2) * P[i + 1][1] + (u3 - u2) * h * fieldSlopes[i + 1]
  }
  return P[P.length - 1][1]
}

/* ------------------------------------------------------------------ Sebastian's path */

/** In the field he rolls from where he came up out of the pool to the couch's end, easing out and in. */
const FIELD_GO = CUTS[3]
const FIELD_HOP = 381.4
const FIELD_X0 = 0.0
const FIELD_X1 = 5.3
const SEAT_X = 5.62
const fieldX = (t: number): number => FIELD_X0 + (FIELD_X1 - FIELD_X0) * (0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, (t - FIELD_GO) / (FIELD_HOP - FIELD_GO)))))
const onField = (x: number, r: number): Pt => [x, ground(x) - r]
/** Where each flower stands: where he is when it opens. */
const FLOWER_X = BLOOMS.map((t) => fieldX(t) + 0.14)

/** Afloat after the dive, he comes up and rides the water, and is still by the splice. */
const floatAt = (t: number): Pt => [-0.1 + 0.1 * smooth(t, 371.7, 373.4), WATER - 0.018 * Math.sin((t - 371.7) * 4.2) * (1 - smooth(t, 372.6, 373.45))]

/** His ways, in show time: the lane is made from these. */
function sebSegs(begin: number): Seg[] {
  const w = (t: number, p: Pt, extra: Partial<Way> = {}): Way => ({ at: t - begin, p, ...extra })
  const fit = (a: Pt, b: Pt, T: number, v0: number): [number, number] => {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1])
    return [v0, Math.max(0, (2 * L) / T - v0)]
  }
  const ways: Way[] = []
  const push = (x: Way) => ways.push(x)
  // The garden: at rest on the path; a push at the gate; along to the steps; up them on the climb.
  push(w(BEGIN, [-0.5, 0]))
  push(w(344.45, [-0.5, 0]))
  const gate: Pt = [GATE_HINGE + GATE_W + R, 0]
  push(w(GATE_PUSH, gate, { ease: 'in' }))
  const foot: Pt = [STEP_X[0] + 0.2, 0]
  push(w(348.5, foot, { ramp: fit(gate, foot, 348.5 - GATE_PUSH, 0.62) }))
  const stepsAt: Pt[] = [
    [-2.94, STEP_TOP[0] - R],
    [-3.22, STEP_TOP[1] - R],
    [-3.5, STEP_TOP[2] - R],
    [-3.9, LAWN - R],
  ]
  for (let i = 0; i < 4; i++) push(hop(ways[ways.length - 1], stepsAt[i], STEPS[i] - begin))
  // The party: he skids on a little from the landing, turns back, knocks the present, rolls back off it.
  push(w(350.25, [-4.02, LAWN - R], { ease: 'out' }))
  push(w(350.75, [-4.02, LAWN - R]))
  push(w(KNOCK, [GIFT.x0 - R, LAWN - R], { ease: 'in' }))
  push(w(352.35, [-3.6, LAWN - R], { ease: 'out' }))
  push(w(355.2, [-3.6, LAWN - R]))
  // To the chair for the candle, and on down to the sea across the splice.
  push(w(356.3, [-4.08, LAWN - R]))
  push(w(357.3, [-4.08, LAWN - R]))
  push(w(359.15, [-2.98, LAWN - R]))
  // The breaker: it hits him and he jumps back up the beach, down in its wash; out of the wet, then along.
  push(w(BREAKER, [-2.98, LAWN - R]))
  push(hop(ways[ways.length - 1], [-3.5, LAWN - R], WASHED - begin))
  push(w(360.6, [-3.66, LAWN - R], { ease: 'out' }))
  push(w(362.9, [-3.66, LAWN - R]))
  push(w(364.6, [-3.45, LAWN - R]))
  // The pool: out along the board to its end; small bounces, big bounces, the dive.
  const tip: Pt = [BOARD_TIP + 0.06, LAWN - R]
  push(w(365.6, tip))
  let last = ways[ways.length - 1]
  push(hop(last, tip, LANDS[0] - begin))
  for (let i = 0; i < LANDS.length; i++) {
    const L = LANDS[i]
    push(w(L + 0.08, [tip[0], tip[1] + DIP], { ease: 'out' }))
    push(w(L + 0.16, tip, { ease: 'in' }))
    last = ways[ways.length - 1]
    if (i + 1 < LANDS.length) push(hop(last, tip, LANDS[i + 1] - begin))
  }
  push(hop(last, [-0.2, WATER], SPLASH - begin))
  push(w(370.95, [-0.14, WATER + 0.5], { ease: 'out' }))
  push(w(371.7, floatAt(371.7)))
  const segs = route(ways)
  segs.push(...carried(floatAt, 371.7, CUTS[3], 12))
  // The field, along the ground to the couch's end, and a hop up onto the cushion on the splice.
  const fieldPos = (t: number): Pt => onField(fieldX(t), R)
  segs.push(...carried(fieldPos, CUTS[3], FIELD_HOP, 60))
  const home: Pt = [SEAT_X, seatY(SEAT_X, R)]
  const rest = route([
    { at: FIELD_HOP - begin, p: fieldPos(FIELD_HOP) },
    hop({ at: FIELD_HOP - begin, p: fieldPos(FIELD_HOP) }, home, CUTS[4] - begin),
    { at: 391.4 - begin, p: home },
  ])
  segs.push(...rest)
  // The lamp: up to its chain, and back down beside the boy.
  const back: Pt = [SEAT_X + 0.08, seatY(SEAT_X + 0.08, R)]
  const up: Way = { at: 391.4 - begin, p: home }
  const touch = hop(up, BEAD, LAMP_OFF - begin)
  const down = hop(touch, back, 392.4 - begin)
  segs.push(...route([up, touch, down, { at: END - begin, p: back }]))
  return segs
}

/** Where a ball of radius r sits on the couch at x (the seat, dipped by whoever sits there). */
function seatY(x: number, r: number): number {
  return -0.01 + 0.012 * Math.cos((x - COUCH_X0) * 3) - r
}

/* ------------------------------------------------------------------ Mia, and the boy */

/** Mia: rocking the pram on the porch; at the party; stepping back from the sea; on the deck; home through the field. */
const MIA_KEYS: Key[] = [
  { t: BEGIN, p: [-5.75, LAWN - R] },
  { t: 347.9, p: [-5.75, LAWN - R] },
  { t: 349.2, p: [-5.62, LAWN - R] },
  { t: 352.0, p: [-5.62, LAWN - R] },
  { t: 353.4, p: [-5.5, LAWN - R] },
  { t: 356.0, p: [-5.5, LAWN - R] },
  { t: 356.9, p: [-5.42, LAWN - R] },
  { t: 358.2, p: [-5.55, LAWN - R] },
  { t: 359.85, p: [-5.55, LAWN - R] },
  { t: 360.7, p: [-5.9, LAWN - R] },
  { t: 361.6, p: [-5.9, LAWN - R] },
  { t: 363.4, p: [-5.45, LAWN - R] },
  { t: 370.9, p: [-5.45, LAWN - R] },
  { t: 372.9, p: [-3.55, LAWN - R] },
]
function miaAt(t: number): Pt {
  if (t >= CUTS[3]) return fieldFollow(t, -3.55, 4.62, 373.75, 0.78, R)
  const [x, y] = trackAt(MIA_KEYS, t)
  return [x + rockAt(t), y]
}

/** Her hand on the pram's handle, rocking it, until he is nearly home. */
const rockAt = (t: number): number => (t < 349 ? 0.035 * Math.sin((t - BEGIN) * 2.6) * (1 - smooth(t, 347.2, 348.6)) : 0)

/** Follow through the field from x0 (at rest at the splice) to x1 on the couch, landing on the cut. */
function fieldFollow(t: number, x0: number, x1: number, go: number, hopLen: number, r: number): Pt {
  const up = FIELD_HOP
  const xh = x1 - hopLen * 0.45
  if (t < up) {
    const u = Math.max(0, Math.min(1, (t - go) / (up - go)))
    return onField(x0 + (xh - x0) * (0.5 - 0.5 * Math.cos(Math.PI * u)), r)
  }
  if (t < CUTS[4]) {
    const a = onField(xh, r)
    const b: Pt = [x1, seatY(x1, r)]
    return trackAt([{ t: up, p: a }, { t: CUTS[4], p: b, how: 'hop' }], t)
  }
  return [x1, seatY(x1, r)]
}

/** The boy: in the pram, in the high chair, down on the lawn, at the sea with his bucket, off the board, home. */
function sonAt(t: number): Companion {
  const shot = shotAt(t)
  const scale = SON_SIZE[shot]
  const r = SON_R(scale)
  let p: Pt
  if (shot === 0) {
    const bob = smooth(t, 340, 341) * (1 - smooth(t, 348.4, 349.6))
    p = [CHAIR_X + rockAt(t), CHAIR_SEAT + 0.012 * Math.sin(t * 5.2 + 1) * bob]
  } else if (shot === 1) {
    // Bouncing in his chair as the balloons go; a lean to the candle; down to the lawn.
    let y = CHAIR_SEAT - 0.035 * Math.abs(Math.sin((t - KNOCK) * 7)) * smooth(t, KNOCK, KNOCK + 0.2) * (1 - smooth(t, 353.6, 354.2))
    let x = CHAIR_X + 0.05 * smooth(t, CANDLE - 0.35, CANDLE - 0.05) * (1 - smooth(t, CANDLE + 0.3, CANDLE + 0.8))
    if (t > 357.4) [x, y] = trackAt([{ t: 357.4, p: [CHAIR_X, CHAIR_SEAT] }, { t: SON_DOWN, p: [-4.4, LAWN - r], how: 'hop' }], t)
    p = [x, y]
  } else if (shot === 2) {
    // The breaker's wash reaches him: a hop over it; back to his bucket, and a push that tips it.
    p = trackAt(
      [
        { t: CUTS[1], p: [-4.4, LAWN - r] },
        { t: 359.98, p: [-4.4, LAWN - r] },
        { t: 360.44, p: [-4.62, LAWN - r], how: 'hop' },
        { t: 361.2, p: [-4.62, LAWN - r] },
        { t: TIP_BUCKET, p: [BUCKET_X - 0.1 - r, LAWN - r], how: 'in' },
        { t: 362.3, p: [-4.5, LAWN - r], how: 'out' },
      ],
      t,
    )
  } else if (shot === 3) {
    // On the deck; out along the board after him, and off its end.
    p = trackAt(
      [
        { t: CUTS[2], p: [-4.5, LAWN - r] },
        { t: 370.9, p: [-4.5, LAWN - r] },
        { t: 371.8, p: [BOARD_TIP + 0.02, LAWN - r] },
        { t: 371.9, p: [BOARD_TIP + 0.02, LAWN - r] },
        { t: SON_SPLASH, p: [-1.3, WATER], how: 'hop' },
        { t: 372.6, p: [-1.28, WATER + 0.28], how: 'out' },
        { t: 373.2, p: [-1.3, WATER] },
      ],
      t,
    )
  } else if (shot === 4) p = fieldFollow(t, -1.3, 5.12, CUTS[3] + 0.2, 0.6, r)
  else {
    // Home: he sinks into the cushion, and nods off against her.
    const lean = smooth(t, ASLEEP - 0.5, ASLEEP)
    p = [5.12 - 0.2 * lean, seatY(5.12 - 0.2 * lean, r) + 0.02 * lean]
  }
  return { x: p[0], y: p[1], scale }
}

/** The bucket, beside the boy on the beach. */
const BUCKET_X = -4.15

/* ------------------------------------------------------------------ the part */

interface MovieState {
  begin: number
}

export const movie = part<MovieState>(
  {
    name: 'movie',
    draw: (p, s, c) => drawFilm(p, c.t + s.begin, c),
    over: (p, s, c) => overFilm(p, c.t + s.begin, c),
  },
  (slot) => {
    const segs = sebSegs(slot.begin)
    const back: Pt = [SEAT_X + 0.08, seatY(SEAT_X + 0.08, R)]
    return {
      cells: box(-17, -8, 12, 6, 2),
      exit: [back[0] + 0.5, back[1]],
      lane: { segs, fire: GATE_PUSH - slot.begin },
      state: { begin: slot.begin },
      company: [
        { from: BEGIN, to: END, who: 'mia', at: (t) => { const [x, y] = miaAt(t); return { x, y } } },
        { from: BEGIN, to: END, who: 'son', at: sonAt },
      ],
    }
  },
  (): PartShot[] => [
    // The room: the projector at the left, its beam, the picture on the screen.
    { t: BEGIN, cells: 12.6, hold: [-8.4, -0.85] },
    { t: 342.9, cells: 12.6, hold: [-8.4, -0.85] },
    // In to the picture, and the gate opens to the frame.
    { t: 347.3, cells: 4.9, hold: [-3.0, -1.05] },
    { t: 349.6, cells: 4.3, hold: [-4.2, -1.0] },
    // The party; up with the balloons a little; back down for the candle.
    { t: 352.2, cells: 4.3, hold: [-4.25, -1.1] },
    { t: 355.0, cells: 4.8, hold: [-3.9, -1.75] },
    { t: 357.4, cells: 4.2, hold: [-4.1, -0.95] },
    // The beach.
    { t: 359.4, cells: 4.4, hold: [-3.6, -0.95] },
    { t: 363.3, cells: 4.4, hold: [-3.9, -0.95] },
    // The pool: wider for the bounces, and the dive.
    { t: 365.6, cells: 4.9, hold: [-2.7, -1.15] },
    { t: 368.2, cells: 5.8, hold: [-2.0, -1.55] },
    { t: SPLASH, cells: 5.4, hold: [-1.6, -1.05] },
    { t: 373.2, cells: 4.6, hold: [-1.9, -0.75] },
    // The field, along with them.
    { t: 376.0, cells: 4.6, hold: [1.5, -0.6], w: 0.4 },
    { t: 380.4, cells: 4.4, hold: [4.2, -0.6], w: 0.5 },
    // Home: on the couch; and out of the screen as the film runs out.
    { t: 382.6, cells: 3.9, hold: [5.2, -0.62] },
    { t: BACK0, cells: 3.7, hold: [5.3, -0.62] },
    { t: 392.8, cells: 11.5, hold: [0.3, -0.45] },
    { t: 395.0, cells: 11.7, hold: [0.3, -0.45] },
  ],
)

/* ------------------------------------------------------------------ the gate */

/** The film's gate at t, in the part's cells: the screen's picture, opening to the frame, and back. */
function gateAt(t: number, fr: Rect): { g: Rect; v: Rect; img: Rect } {
  const pad = 1.5
  const out: Rect = { x0: fr.x0 - pad, y0: fr.y0 - pad, x1: fr.x1 + pad, y1: fr.y1 + pad }
  const mix = (a: Rect, b: Rect, f: number): Rect => ({ x0: lerp(a.x0, b.x0, f), y0: lerp(a.y0, b.y0, f), x1: lerp(a.x1, b.x1, f), y1: lerp(a.y1, b.y1, f) })
  if (t < 370) {
    const f = soft((t - GATE0) / (GATE1 - GATE0))
    return { g: mix(IMG1, out, f), v: mix(IMG1, fr, f), img: IMG1 }
  }
  const f = soft((t - BACK0) / (BACK1 - BACK0))
  return { g: mix(out, IMG2, f), v: mix(fr, IMG2, f), img: IMG2 }
}

/** One frame of film is 1/18 s: what the flicker, the weave and the dust change on. */
const frameOf = (t: number): number => Math.floor(t * 18)

function drawFilm(p: p5, t: number, c: Ctx): void {
  const { k } = c
  const fr = frame(p, k)
  const { g } = gateAt(t, fr)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  ctx.rect(g.x0 * k, g.y0 * k, (g.x1 - g.x0) * k, (g.y1 - g.y0) * k)
  ctx.clip()
  const shot = shotAt(t)
  const bx: Rect = { x0: Math.min(g.x0, fr.x0) - 1, y0: Math.min(g.y0, fr.y0) - 1, x1: Math.max(g.x1, fr.x1) + 1, y1: Math.max(g.y1, fr.y1) + 1 }
  if (shot === 0) drawHouse(p, t, c, bx)
  else if (shot === 1) drawParty(p, t, c, bx)
  else if (shot === 2) drawBeach(p, t, c, bx)
  else if (shot === 3) drawPool(p, t, c, bx)
  else if (shot === 4) drawField(p, t, c, bx)
  else drawHome(p, t, c, bx)
  ctx.restore()
}

function overFilm(p: p5, t: number, c: Ctx): void {
  const { k } = c
  const fr = frame(p, k)
  const { g, v, img } = gateAt(t, fr)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const fi = frameOf(t)
  ctx.save()
  ctx.beginPath()
  ctx.rect(g.x0 * k, g.y0 * k, (g.x1 - g.x0) * k, (g.y1 - g.y0) * k)
  ctx.clip()
  // What lies in front of the balls in the film: the pool's water, the couch's arm.
  const shot = shotAt(t)
  if (shot === 3) overPool(p, t, c)
  if (shot === 5) overHome(p, t, c)
  // The film itself: its warm wash, its flicker, its weave, a speck of dust now and then, the gate's soft corners.
  const weave = (hash(fi, 3) - 0.5) * 0.022 + spliceJump(t)
  const flick = 0.07 + 0.035 * hash(fi, 5)
  ctx.fillStyle = rgba(M.warm, flick)
  ctx.fillRect(g.x0 * k, g.y0 * k, (g.x1 - g.x0) * k, (g.y1 - g.y0) * k)
  const vx = (v.x0 + v.x1) / 2
  const vy = (v.y0 + v.y1) / 2 + weave
  const vw = v.x1 - v.x0
  const vh = v.y1 - v.y0
  const rad = Math.hypot(vw, vh) / 2
  const vg = ctx.createRadialGradient(vx * k, vy * k, rad * 0.5 * k, vx * k, vy * k, rad * 1.02 * k)
  vg.addColorStop(0, rgba(M.room, 0))
  vg.addColorStop(0.6, rgba(M.room, 0.16))
  vg.addColorStop(1, rgba(M.room, 0.62))
  ctx.fillStyle = vg
  ctx.fillRect(g.x0 * k, g.y0 * k, (g.x1 - g.x0) * k, (g.y1 - g.y0) * k)
  // The gate's corners: the picture's edge is a rounded box, soft.
  const corner = vh * 0.09
  for (const [inset, a] of [[0, 0.9], [vh * 0.012, 0.35], [vh * 0.026, 0.14]] as [number, number][]) {
    ctx.beginPath()
    ctx.rect(g.x0 * k, g.y0 * k, (g.x1 - g.x0) * k, (g.y1 - g.y0) * k)
    ctx.roundRect((v.x0 + inset) * k, (v.y0 + inset + weave) * k, (vw - 2 * inset) * k, (vh - 2 * inset) * k, (corner + inset) * k)
    ctx.fillStyle = rgba(M.room, a)
    ctx.fill('evenodd')
  }
  // Dust: a speck on some frames, a hair at the gate's edge on a few.
  if (t < TAIL + 0.3) dust(p, k, fi, v, weave)
  // A splice: a frame gone to light.
  const sp = spliceFlash(t)
  if (sp > 0) {
    ctx.fillStyle = rgba(M.beam, sp)
    ctx.fillRect(g.x0 * k, g.y0 * k, (g.x1 - g.x0) * k, (g.y1 - g.y0) * k)
  }
  // The lamp going out at home, and the tail: bare light through an empty gate.
  const bare = smooth(t, TAIL - 0.04, TAIL + 0.2)
  if (bare > 0) {
    ctx.fillStyle = rgba(M.beam, bare * (0.93 + 0.07 * hash(fi, 9)))
    ctx.fillRect(v.x0 * k, v.y0 * k, vw * k, vh * k)
  }
  ctx.restore()
  // Outside the gate: the room.
  const inside = g.x0 <= fr.x0 && g.y0 <= fr.y0 && g.x1 >= fr.x1 && g.y1 >= fr.y1
  if (!inside) drawRoom(p, t, c, fr, g, img)
}

/** A splice's flash: bright on the frame of the cut, gone in two more. */
function spliceFlash(t: number): number {
  for (const cut of CUTS) {
    const s = t - cut
    if (s >= -0.001 && s < 0.2) return s < 1 / 18 ? 0.55 : 0.55 * Math.exp(-(s - 1 / 18) / 0.05)
  }
  return 0
}
/** And the picture jumps in the gate as the splice goes through. */
function spliceJump(t: number): number {
  for (const cut of CUTS) {
    const s = t - cut
    if (s >= 0 && s < 0.12) return 0.05 * (1 - s / 0.12)
  }
  return 0
}

function dust(p: p5, k: number, fi: number, v: Rect, weave: number): void {
  const w = v.x1 - v.x0
  const h = v.y1 - v.y0
  if (hash(fi, 11) < 0.42) {
    const x = v.x0 + w * (0.08 + 0.84 * hash(fi, 12))
    const y = v.y0 + h * (0.1 + 0.8 * hash(fi, 13))
    const r = h * (0.004 + 0.006 * hash(fi, 14))
    p.noStroke()
    p.fill(alpha(p, M.room, 0.55))
    p.beginShape()
    for (let j = 0; j < 5; j++) {
      const a = (j / 5) * Math.PI * 2 + hash(fi, j + 20) * 0.9
      const rr = r * (0.6 + 0.7 * hash(fi, j + 30))
      p.vertex((x + Math.cos(a) * rr) * k, (y + Math.sin(a) * rr) * k)
    }
    p.endShape(p.CLOSE)
  }
  // A hair caught in the gate stays a few frames, then goes.
  const hairAt = Math.floor(fi / 40)
  if (hash(hairAt, 41) < 0.35 && fi % 40 < 4) {
    const side = hash(hairAt, 42) < 0.5 ? v.x0 + w * 0.04 : v.x1 - w * 0.04
    const y = v.y0 + h * (0.2 + 0.5 * hash(hairAt, 43))
    p.noFill()
    p.stroke(alpha(p, M.room, 0.5))
    p.strokeWeight(Math.max(1, k * 0.012))
    p.bezier(side * k, y * k, (side + w * 0.02) * k, (y + h * 0.05) * k, (side - w * 0.015) * k, (y + h * 0.1) * k, (side + w * 0.01) * k, (y + h * 0.16 + weave) * k)
  }
}

/* ------------------------------------------------------------------ the room */

/** The projector in the dark, its beam on the screen, the reels turning; drawn outside the gate only. */
function drawRoom(p: p5, t: number, c: Ctx, fr: Rect, g: Rect, img: Rect): void {
  const { k, weight } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const pad = 2
  ctx.save()
  ctx.beginPath()
  ctx.rect((fr.x0 - pad) * k, (fr.y0 - pad) * k, (fr.x1 - fr.x0 + 2 * pad) * k, (fr.y1 - fr.y0 + 2 * pad) * k)
  ctx.rect(g.x0 * k, g.y0 * k, (g.x1 - g.x0) * k, (g.y1 - g.y0) * k)
  ctx.clip('evenodd')
  ctx.fillStyle = M.room
  ctx.fillRect((fr.x0 - pad) * k, (fr.y0 - pad) * k, (fr.x1 - fr.x0 + 2 * pad) * k, (fr.y1 - fr.y0 + 2 * pad) * k)
  const h = img.y1 - img.y0
  const cy = (img.y0 + img.y1) / 2
  const floor = img.y1 + 1.35
  // The screen round the picture: its matte white, lit a little by the spill; its stand down to the floor.
  const m = 0.16
  const lit = t < TAIL ? 0.5 : 0.8
  shape(p, k, [[img.x0 - m, img.y0 - m], [img.x1 + m, img.y0 - m], [img.x1 + m, img.y1 + m], [img.x0 - m, img.y1 + m]], alpha(p, M.cream, 0.28 * lit), null)
  const sx = (img.x0 + img.x1) / 2
  seg(p, k, [sx, img.y1 + m], [sx, floor - 0.05], alpha(p, M.warm, 0.18), weight * 0.9)
  seg(p, k, [sx, floor - 0.35], [sx - 0.55, floor], alpha(p, M.warm, 0.16), weight * 0.8)
  seg(p, k, [sx, floor - 0.35], [sx + 0.55, floor], alpha(p, M.warm, 0.16), weight * 0.8)
  seg(p, k, [img.x0 - m, img.y0 - m - 0.06], [img.x1 + m, img.y0 - m - 0.06], alpha(p, M.warm, 0.2), weight * 1.2)
  // The floor, barely: where the beam's spill reaches.
  vgrad(p, k, fr.x0 - pad, floor, fr.x1 + pad, fr.y1 + pad, [[0, rgba(M.warm, 0.06)], [0.4, rgba(M.warm, 0)]])
  // The projector: its lens level with the picture's middle, well back from it.
  const lx = img.x0 - 5.2
  const ly = cy
  const run = t < TAIL ? 1 : 1 + 2.2 * smooth(t, TAIL, TAIL + 0.3)
  // The beam: a soft wedge from the lens to the screen, flickering with the shutter.
  const shutter = 0.9 + 0.1 * Math.sin(t * 2 * Math.PI * 18)
  ctx.save()
  const bg = ctx.createLinearGradient(lx * k, 0, img.x0 * k, 0)
  const ba = (t < TAIL ? 0.16 : 0.24) * shutter
  bg.addColorStop(0, rgba(M.beam, ba * 1.6))
  bg.addColorStop(1, rgba(M.beam, ba * 0.45))
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.moveTo(lx * k, (ly - 0.05) * k)
  ctx.lineTo(img.x0 * k, img.y0 * k)
  ctx.lineTo(img.x0 * k, img.y1 * k)
  ctx.lineTo(lx * k, (ly + 0.05) * k)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  // Motes turning slowly in the beam.
  for (let i = 0; i < 9; i++) {
    const u = (hash(i, 61) + t * 0.012 * (0.5 + hash(i, 62))) % 1
    const x = lerp(lx + 0.4, img.x0 - 0.2, u)
    const spread = (x - lx) / (img.x0 - lx)
    const y = ly + (hash(i, 63) - 0.5) * h * 0.8 * spread + Math.sin(t * 0.4 + i) * 0.05
    p.noStroke()
    p.fill(alpha(p, M.beam, 0.28 * (0.5 + 0.5 * Math.sin(t * 0.7 + i * 1.7))))
    p.circle(x * k, y * k, Math.max(1.2, 0.028 * k))
  }
  glow(p, k, lx + 0.05, ly, 0.5, M.beam, 0.42 * shutter)
  drawProjector(p, k, weight, lx, ly, floor, t, run)
  ctx.restore()
}

/** An eight-millimetre projector seen from the side, lens to the right at (lx, ly), on a small table. */
function drawProjector(p: p5, k: number, weight: number, lx: number, ly: number, floor: number, t: number, run: number): void {
  const body = alpha(p, M.teal, 0.55)
  const dark = M.room
  const edge = alpha(p, M.warm, 0.35)
  const w = weight * 0.8
  // The table.
  const top = ly + 0.42
  shape(p, k, [[lx - 1.95, top], [lx + 0.25, top], [lx + 0.25, top + 0.08], [lx - 1.95, top + 0.08]], alpha(p, M.orange, 0.22), edge, w)
  for (const x of [lx - 1.8, lx + 0.1]) seg(p, k, [x, top + 0.08], [x + (x < lx ? -0.08 : 0.08), floor], alpha(p, M.orange, 0.2), weight * 1.1)
  // Body and lamp house, the lens barrel.
  box2(p, k, lx - 1.55, ly - 0.3, lx - 0.3, top, body, edge, w, 0.1)
  box2(p, k, lx - 1.85, ly - 0.2, lx - 1.5, top - 0.03, alpha(p, M.teal, 0.45), edge, w, 0.06)
  // The lamp's light through the vents.
  for (let i = 0; i < 3; i++) {
    const y = ly - 0.1 + i * 0.12
    seg(p, k, [lx - 1.8, y], [lx - 1.56, y], alpha(p, M.beam, 0.5 + 0.12 * Math.sin(t * 9 + i)), weight * 0.9)
  }
  glow(p, k, lx - 1.68, ly + 0.02, 0.45, M.orange, 0.16)
  box2(p, k, lx - 0.34, ly - 0.1, lx, ly + 0.1, dark, edge, w, 0.02)
  shape(p, k, [[lx - 0.02, ly - 0.1], [lx + 0.02, ly - 0.1], [lx + 0.02, ly + 0.1], [lx - 0.02, ly + 0.1]], alpha(p, M.beam, 0.85), null)
  // The arms and reels: feed at the front, take-up at the back, turning at their own rates as the film goes over.
  const feed: Pt = [lx - 0.62, ly - 1.05]
  const take: Pt = [lx - 1.55, ly - 0.92]
  seg(p, k, [lx - 0.62, ly - 0.3], feed, edge, weight * 1.2)
  seg(p, k, [lx - 1.3, ly - 0.3], take, edge, weight * 1.2)
  const spent = Math.max(0, Math.min(1, (t - BEGIN) / (TAIL - BEGIN)))
  const R0 = 0.5
  // The film in the path: from the feed reel down to the gate behind the lens, and from under it back up to the take-up.
  const packF = t < TAIL ? 0.14 + 0.3 * (1 - spent) : 0.1
  const packT = 0.14 + 0.3 * spent
  p.noFill()
  p.stroke(alpha(p, M.orange, 0.55))
  p.strokeWeight(Math.max(1, weight * 0.8))
  if (t < TAIL) p.line((feed[0] + packF) * k, feed[1] * k, (lx - 0.4) * k, (ly - 0.25) * k)
  p.line((take[0] + packT * 0.7) * k, (take[1] + packT * 0.7) * k, (lx - 0.8) * k, (ly - 0.25) * k)
  reel(p, k, weight, feed, R0, packF, -t * 1.9 * run * (0.45 / packF))
  reel(p, k, weight, take, R0, packT, -t * 1.9 * run * (0.45 / packT))
  // Once it has run out, the tail slaps round on the take-up reel.
  if (t >= TAIL) {
    const a = -t * 1.9 * run * (0.45 / packT) * 1.0
    const tip: Pt = [take[0] + Math.cos(a) * (packT + 0.28), take[1] + Math.sin(a) * (packT + 0.28)]
    seg(p, k, [take[0] + Math.cos(a) * packT, take[1] + Math.sin(a) * packT], tip, alpha(p, M.orange, 0.6), weight * 0.9)
  }
}

/** A reel: its flanges seen flat, three windows turning, the film wound on it to `pack`. */
function reel(p: p5, k: number, weight: number, at: Pt, r: number, pack: number, a: number): void {
  const [x, y] = at
  p.stroke(alpha(p, M.warm, 0.45))
  p.strokeWeight(weight * 0.8)
  p.fill(alpha(p, M.teal, 0.28))
  p.circle(x * k, y * k, 2 * r * k)
  p.noStroke()
  p.fill(alpha(p, M.orange, 0.35))
  p.circle(x * k, y * k, 2 * pack * k)
  p.fill(M.room)
  for (let i = 0; i < 3; i++) {
    const b = a + (i * Math.PI * 2) / 3
    const cx = x + Math.cos(b) * r * 0.62
    const cy = y + Math.sin(b) * r * 0.62
    if (Math.hypot(cx - x, cy - y) > pack + 0.06) p.circle(cx * k, cy * k, r * 0.46 * k)
  }
  p.fill(alpha(p, M.warm, 0.5))
  p.circle(x * k, y * k, 0.07 * k)
}

/* ------------------------------------------------------------------ the shots */

/** The sky of a shot: a gradient over the whole box, `top` to `low` at the horizon `yh`. */
function sky(p: p5, k: number, b: Rect, top: string, low: string, yh: number): void {
  vgrad(p, k, b.x0, b.y0, b.x1, b.y1, [[0, top], [Math.max(0.01, (yh - b.y0) / (b.y1 - b.y0)), low], [1, low]])
}

/** Flat ground from `y` down, across the box. */
function flat(p: p5, k: number, b: Rect, y: number, fill: string | p5.Color, ink: string, w: number): void {
  shape(p, k, [[b.x0, y], [b.x1, y], [b.x1, b.y1], [b.x0, b.y1]], fill, null)
  seg(p, k, [b.x0, y], [b.x1, y], ink, w)
}

/** Shot one: the house, the path, the gate, the steps; Mia and the pram on the porch. */
function drawHouse(p: p5, t: number, c: Ctx, b: Rect): void {
  const { k, ink, weight } = c
  const w = weight
  sky(p, k, b, M.sky, M.cream, 0.2)
  // A low sun behind the palm, very soft.
  glow(p, k, 0.3, -2.6, 2.4, M.cream, 0.55)
  // The lawn and the path.
  flat(p, k, b, FLOORY, M.grass, ink, w)
  shape(p, k, [[STEP_X[0] - 0.1, FLOORY], [b.x1, FLOORY], [b.x1, FLOORY + 0.1], [STEP_X[0] - 0.1, FLOORY + 0.1]], M.warm, null)
  // The palm on the right of the garden.
  palm(p, k, ink, w, 1.05, FLOORY, 2.7, t)
  // The house: its wall, the window lit warm, the door; the roof. Then the porch in front, and its steps.
  const wx0 = -8.2
  const wx1 = -3.95
  const eave = -2.2
  shape(p, k, [[wx0, LAWN], [wx1, LAWN], [wx1, eave], [wx0, eave]], M.cream, ink, w)
  shape(p, k, [[wx0 - 0.3, eave], [wx1 + 0.3, eave], [(wx0 + wx1) / 2, -3.15]], M.orange, ink, w)
  seg(p, k, [wx0 - 0.3, eave], [wx1 + 0.3, eave], ink, w * 1.2)
  box2(p, k, -7.4, -1.75, -6.5, -0.95, M.sun, ink, w * 0.9)
  seg(p, k, [-6.95, -1.75], [-6.95, -0.95], ink, w * 0.6)
  seg(p, k, [-7.4, -1.35], [-6.5, -1.35], ink, w * 0.6)
  box2(p, k, -4.75, -1.5, -4.2, LAWN, M.teal, ink, w * 0.9)
  p.noStroke()
  p.fill(M.sun)
  p.circle(-4.3 * k, -0.95 * k, 0.05 * k)
  // The porch: its floor and face, and the steps down to the path.
  shape(p, k, [[-8.4, LAWN], [STEP_X[3], LAWN], [STEP_X[3], FLOORY], [-8.4, FLOORY]], M.warm, ink, w)
  for (let i = 0; i < 3; i++) {
    const x0 = STEP_X[i + 1]
    const x1 = STEP_X[i]
    shape(p, k, [[x0, STEP_TOP[i]], [x1, STEP_TOP[i]], [x1, FLOORY], [x0, FLOORY]], M.warm, ink, w * 0.9)
  }
  seg(p, k, [-8.4, LAWN + 0.08], [STEP_X[3], LAWN + 0.08], alpha(p, ink, 0.3), w * 0.6)
  // The pram, rocked by her hand on its handle.
  pram(p, k, ink, w, PRAM_X + rockAt(t), t)
  // The gate: he pushes it on its latch side; it swings away round its hinge and its spring brings it back.
  gate(p, k, ink, w, gateOpen(t))
}

/** The garden's ground in the first shot. */
const FLOORY = 0.13

/** How far open the gate is, 0..1 (1 is square to us, as far as it goes). */
function gateOpen(t: number): number {
  const s = t - GATE_PUSH
  if (s < 0) return 0
  if (t < 346.95) return 0.86 * (1 - Math.exp(-s / 0.22)) + 0.05 * Math.exp(-s / 0.3) * Math.sin(s * 9)
  const shut = smooth(t, 346.95, GATE_SHUT)
  const open = 0.86 * (1 - Math.exp(-(346.95 - GATE_PUSH) / 0.22))
  if (t < GATE_SHUT) return open * (1 - shut * shut)
  return 0.05 * Math.abs(ring(t - GATE_SHUT, 2.6, 0.16))
}

function gate(p: p5, k: number, ink: string, w: number, open: number): void {
  const hx = GATE_HINGE
  const c = Math.cos(open * (Math.PI / 2))
  // The hinge post, then the pickets foreshortened toward it.
  box2(p, k, hx - 0.07, FLOORY - 0.62, hx + 0.01, FLOORY, M.warm, ink, w * 0.9)
  const n = 5
  for (let i = 0; i < n; i++) {
    const u0 = (i + 0.12) / n
    const u1 = (i + 0.88) / n
    const x0 = hx + GATE_W * u0 * c
    const x1 = hx + GATE_W * u1 * c
    const top = FLOORY - 0.52
    shape(p, k, [[x0, FLOORY - 0.02], [x1, FLOORY - 0.02], [x1, top], [(x0 + x1) / 2, top - 0.07], [x0, top]], M.cream, ink, w * 0.7)
  }
  for (const y of [FLOORY - 0.14, FLOORY - 0.4]) seg(p, k, [hx, y], [hx + GATE_W * c, y], ink, w * 0.9)
}

/** A palm: a leaning trunk and a crown of fronds that stir. */
function palm(p: p5, k: number, ink: string, w: number, x: number, foot: number, h: number, t: number): void {
  const lean = 0.35
  const topX = x - lean
  const topY = foot - h
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(w * 2.4)
  p.bezier(x * k, foot * k, x * k, (foot - h * 0.5) * k, (topX + 0.1) * k, (topY + 0.4) * k, topX * k, topY * k)
  p.stroke(M.warm)
  p.strokeWeight(w * 1.2)
  p.bezier(x * k, foot * k, x * k, (foot - h * 0.5) * k, (topX + 0.1) * k, (topY + 0.4) * k, topX * k, topY * k)
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.48 + 0.05 * Math.sin(t * 0.9 + i)
    const L = 0.85 + 0.2 * hash(i, 7)
    const ex = topX + Math.cos(a) * L
    const ey = topY + Math.sin(a) * L * 0.55 + 0.35 * Math.abs(Math.cos(a))
    const mx = topX + Math.cos(a) * L * 0.5
    const my = topY + Math.sin(a) * L * 0.5 - 0.12
    p.fill(i % 2 ? M.teal : M.grass)
    p.stroke(ink)
    p.strokeWeight(w * 0.7)
    p.beginShape()
    p.vertex(topX * k, topY * k)
    p.quadraticVertex((mx + 0.06) * k, (my - 0.08) * k, ex * k, ey * k)
    p.quadraticVertex((mx - 0.04) * k, (my + 0.1) * k, topX * k, topY * k)
    p.endShape(p.CLOSE)
  }
}

/** The pram: a deep basket on springs over two wheels, its hood up at the far end, its handle to her. */
function pram(p: p5, k: number, ink: string, w: number, x: number, t: number): void {
  const bob = 0.012 * Math.sin(t * 5.2 + 1) * (1 - smooth(t, 348.4, 349.6))
  const y0 = LAWN
  for (const wx of [x - 0.28, x + 0.28]) {
    p.fill(M.room)
    p.stroke(ink)
    p.strokeWeight(w * 0.8)
    p.circle(wx * k, (y0 - 0.11) * k, 0.22 * k)
    p.fill(M.warm)
    p.circle(wx * k, (y0 - 0.11) * k, 0.07 * k)
  }
  seg(p, k, [x - 0.28, y0 - 0.11], [x - 0.1, y0 - 0.34 + bob], ink, w * 0.8)
  seg(p, k, [x + 0.28, y0 - 0.11], [x + 0.1, y0 - 0.34 + bob], ink, w * 0.8)
  // The basket.
  const top = CHAIR_SEAT + 0.02 + bob
  p.fill(M.teal)
  p.stroke(ink)
  p.strokeWeight(w)
  p.beginShape()
  p.vertex((x - 0.4) * k, top * k)
  p.vertex((x + 0.4) * k, top * k)
  p.quadraticVertex((x + 0.38) * k, (y0 - 0.3 + bob) * k, (x + 0.15) * k, (y0 - 0.3 + bob) * k)
  p.vertex((x - 0.15) * k, (y0 - 0.3 + bob) * k)
  p.quadraticVertex((x - 0.38) * k, (y0 - 0.3 + bob) * k, (x - 0.4) * k, top * k)
  p.endShape(p.CLOSE)
  // The hood over his head, at the right.
  p.fill(M.cream)
  p.beginShape()
  p.vertex((x + 0.4) * k, top * k)
  p.bezierVertex((x + 0.42) * k, (top - 0.3) * k, (x + 0.15) * k, (top - 0.36) * k, (x + 0.02) * k, (top - 0.3) * k)
  p.vertex((x + 0.1) * k, top * k)
  p.endShape(p.CLOSE)
  // The handle, up to her.
  seg(p, k, [x - 0.38, top + 0.02], [x - 0.6, top - 0.28], ink, w * 1.1)
  seg(p, k, [x - 0.64, top - 0.28], [x - 0.56, top - 0.3], ink, w * 1.6)
}

/** Shot two: his first birthday on the lawn: the high chair, the cake with its candle, the present, the balloons. */
function drawParty(p: p5, t: number, c: Ctx, b: Rect): void {
  const { k, ink, weight } = c
  const w = weight
  sky(p, k, b, M.sky, M.cream, LAWN - 0.8)
  glow(p, k, -1.6, -3.0, 2.2, M.cream, 0.5)
  // The hedge along the back of the garden, and the lawn.
  p.fill(alpha(p, M.teal, 0.75))
  p.stroke(ink)
  p.strokeWeight(w * 0.8)
  p.beginShape()
  p.vertex(b.x0 * k, (LAWN + 0.01) * k)
  for (let x = Math.floor(b.x0); x <= b.x1 + 1; x += 0.5) p.vertex(x * k, (LAWN - 0.62 - 0.08 * Math.sin(x * 2.3) - 0.05 * hash(Math.round(x * 2), 3)) * k)
  p.vertex(b.x1 * k, (LAWN + 0.01) * k)
  p.endShape(p.CLOSE)
  flat(p, k, b, LAWN, M.grass, ink, w)
  // The high chair: splayed legs, the seat he sits in, the tray with his cake.
  const cx = CHAIR_X
  const seat = CHAIR_SEAT + SON_R(0.85)
  seg(p, k, [cx - 0.16, seat], [cx - 0.3, LAWN], ink, w * 1.1)
  seg(p, k, [cx + 0.14, seat], [cx + 0.26, LAWN], ink, w * 1.1)
  seg(p, k, [cx - 0.23, (seat + LAWN) / 2 + 0.05], [cx + 0.2, (seat + LAWN) / 2 + 0.05], ink, w * 0.7)
  box2(p, k, cx - 0.2, seat, cx + 0.16, seat + 0.05, M.orange, ink, w * 0.9)
  box2(p, k, cx - 0.22, seat - 0.34, cx - 0.16, seat, M.orange, ink, w * 0.9)
  box2(p, k, cx + 0.1, seat - 0.12, cx + 0.44, seat - 0.08, M.orange, ink, w * 0.9)
  // The cake on the tray, and its one candle.
  box2(p, k, cx + 0.2, seat - 0.24, cx + 0.38, seat - 0.12, M.cream, ink, w * 0.8, 0.02)
  box2(p, k, cx + 0.2, seat - 0.24, cx + 0.38, seat - 0.2, M.pink, null)
  const wick: Pt = [cx + 0.29, seat - 0.34]
  box2(p, k, wick[0] - 0.012, wick[1], wick[0] + 0.012, seat - 0.24, M.sky, ink, w * 0.5)
  const out = smooth(t, CANDLE, CANDLE + 0.12)
  if (out < 1) {
    // The flame: a drop, leaning away from his breath as it goes.
    const lean = 0.06 * smooth(t, CANDLE - 0.12, CANDLE)
    const s = 1 - out
    glow(p, k, wick[0] + lean, wick[1] - 0.05, 0.22, M.sun, 0.35 * s)
    p.noStroke()
    p.fill(M.orange)
    p.beginShape()
    p.vertex(wick[0] * k, wick[1] * k)
    p.quadraticVertex((wick[0] - 0.035 * s) * k, (wick[1] - 0.04 * s) * k, (wick[0] + lean) * k, (wick[1] - 0.11 * s) * k)
    p.quadraticVertex((wick[0] + 0.035 * s) * k, (wick[1] - 0.04 * s) * k, wick[0] * k, wick[1] * k)
    p.endShape(p.CLOSE)
  }
  // The smoke from the wick: one thin curl rising and thinning.
  const sm = t - CANDLE
  if (sm > 0 && sm < 2.2) {
    p.noFill()
    p.stroke(alpha(p, ink, 0.35 * (1 - sm / 2.2)))
    p.strokeWeight(w * 0.8)
    const h = 0.2 + sm * 0.25
    p.bezier(wick[0] * k, wick[1] * k, (wick[0] + 0.08) * k, (wick[1] - h * 0.3) * k, (wick[0] - 0.08) * k, (wick[1] - h * 0.6) * k, (wick[0] + 0.03 * Math.sin(sm * 3)) * k, (wick[1] - h) * k)
  }
  // The present: a box with its bow; knocked, its lid flies up and over and lands on the lawn.
  const g = GIFT
  box2(p, k, g.x0, g.y0 + 0.06, g.x1, g.y1, M.pink, ink, w)
  box2(p, k, (g.x0 + g.x1) / 2 - 0.03, g.y0 + 0.06, (g.x0 + g.x1) / 2 + 0.03, g.y1, M.cream, null)
  const lid = lidAt(t)
  p.push()
  p.translate(lid.x * k, lid.y * k)
  p.rotate(lid.a)
  box2(p, k, -0.2, -0.03, 0.2, 0.05, M.pink, ink, w)
  box2(p, k, -0.03, -0.03, 0.03, 0.05, M.cream, null)
  p.fill(M.cream)
  p.stroke(ink)
  p.strokeWeight(w * 0.6)
  p.ellipse(-0.06 * k, -0.07 * k, 0.12 * k, 0.07 * k)
  p.ellipse(0.06 * k, -0.07 * k, 0.12 * k, 0.07 * k)
  p.pop()
  // The balloons, one out of the box on each note of the tune, up and away over the hedge.
  for (let i = 0; i < BALLOONS.length; i++) balloon(p, k, ink, w, i, t - BALLOONS[i])
}

/** The lid: shut on the box until the knock; then up, over, and down on the lawn on a note. */
function lidAt(t: number): { x: number; y: number; a: number } {
  const home = { x: (GIFT.x0 + GIFT.x1) / 2, y: GIFT.y0 + 0.03, a: 0 }
  const s = t - KNOCK
  if (s < 0) return home
  const T = LID_DOWN - KNOCK
  if (s < T) {
    const u = s / T
    const land = { x: GIFT.x1 + 0.35, y: LAWN - 0.05 }
    return { x: lerp(home.x, land.x, u), y: lerp(home.y, land.y, u) - (16 * T * T) / 2 * u * (1 - u), a: -Math.PI * 1.0 * u }
  }
  const r = s - T
  return { x: GIFT.x1 + 0.35, y: LAWN - 0.05, a: -Math.PI + 0.08 * ring(r, 3, 0.15) }
}

const BALLOON_COLORS = [M.orange, M.teal, M.pink, M.pool, M.cream, M.orange]

/** A balloon: it pops up out of the box, then floats up and off, swaying, its string trailing. */
function balloon(p: p5, k: number, ink: string, w: number, i: number, s: number): void {
  if (s < -0.02) return
  const ox = (GIFT.x0 + GIFT.x1) / 2
  const oy = GIFT.y0
  const pop = Math.min(1, Math.max(0, s) / 0.18)
  const rise = Math.max(0, s - 0.1)
  const y = oy - 0.18 - 0.12 * pop - rise * (0.62 + 0.08 * rise) - 0.07 * (i % 3)
  const drift = 0.18 * rise + (i - 2.5) * 0.07 * Math.min(1, rise * 1.2)
  const x = ox + drift + 0.05 * Math.sin(rise * 2.3 + i * 1.3)
  const r = 0.12 + 0.015 * (i % 2)
  // The string, lagging below.
  p.noFill()
  p.stroke(alpha(p, ink, 0.7))
  p.strokeWeight(w * 0.55)
  const tailX = x - 0.05 * Math.sin(rise * 2.3 + i * 1.3 - 0.8)
  p.bezier(x * k, (y + r) * k, (x + 0.05) * k, (y + r + 0.18) * k, (tailX - 0.05) * k, (y + r + 0.32) * k, tailX * k, (y + r + 0.5 * pop) * k)
  // The balloon, a little taller than wide, and its knot.
  p.fill(BALLOON_COLORS[i])
  p.stroke(ink)
  p.strokeWeight(w * 0.8)
  p.ellipse(x * k, y * k, 2 * r * k * (0.7 + 0.3 * pop), 2.35 * r * k * (0.7 + 0.3 * pop))
  shape(p, k, [[x - 0.025, y + r * 1.12], [x + 0.025, y + r * 1.12], [x, y + r * 1.02]], BALLOON_COLORS[i], ink, w * 0.5)
  p.noStroke()
  p.fill(alpha(p, M.cream, 0.55))
  p.ellipse((x - r * 0.35) * k, (y - r * 0.4) * k, r * 0.35 * k, r * 0.55 * k)
}

/** Shot three: the beach. The sea comes in from the right: three little waves, then the breaker, then its last reach. */
function drawBeach(p: p5, t: number, c: Ctx, b: Rect): void {
  const { k, ink, weight } = c
  const w = weight
  sky(p, k, b, M.sky, M.cream, SEA - 0.2)
  glow(p, k, 1.5, -2.2, 2.6, M.cream, 0.6)
  // The far sea, a band to the horizon.
  shape(p, k, [[b.x0, SEA - 0.72], [b.x1, SEA - 0.72], [b.x1, b.y1], [b.x0, b.y1]], alpha(p, M.pool, 0.85), null)
  seg(p, k, [b.x0, SEA - 0.72], [b.x1, SEA - 0.72], alpha(p, ink, 0.5), w * 0.6)
  // The sand: flat, then sloping down into the sea at the right.
  const sand = (x: number) => (x < SEA_EDGE ? LAWN : LAWN + (x - SEA_EDGE) * 0.22)
  p.fill(M.cream)
  p.stroke(ink)
  p.strokeWeight(w)
  p.beginShape()
  p.vertex(b.x0 * k, b.y1 * k)
  for (let x = b.x0; x <= b.x1 + 0.2; x += 0.25) p.vertex(x * k, sand(x) * k)
  p.vertex(b.x1 * k, b.y1 * k)
  p.endShape(p.CLOSE)
  // The wet sand the waves have reached, darker.
  const reach = washAt(t)
  const wetTo = Math.min(reach.x, reach.far)
  p.noStroke()
  p.fill(alpha(p, M.orange, 0.18))
  p.beginShape()
  p.vertex(reach.far * k, (sand(reach.far) + 0.02) * k)
  for (let x = reach.far; x <= b.x1 + 0.2; x += 0.25) p.vertex(x * k, (sand(x) + 0.02) * k)
  p.vertex(b.x1 * k, (sand(b.x1) + 0.14) * k)
  p.vertex(reach.far * k, (sand(reach.far) + 0.14) * k)
  p.endShape(p.CLOSE)
  // The sea at the shore, and the swash running up the sand: water between its surface and the sand, a lip at its front.
  const x0 = wetTo
  const surf = (x: number) => Math.min(sand(x) - Math.min(0.05, 0.05 * Math.max(0, x - x0) / 0.3) - reach.h * Math.exp(-Math.max(0, x - x0) / 0.5), SEA + 0.015 * Math.sin(x * 3 + t * 2))
  p.fill(M.pool)
  p.stroke(ink)
  p.strokeWeight(w * 0.8)
  p.beginShape()
  for (let x = x0; x <= b.x1 + 0.2; x += 0.15) p.vertex(x * k, surf(x) * k)
  for (let x = b.x1 + 0.2; x >= x0; x -= 0.25) p.vertex(x * k, sand(x) * k)
  p.endShape(p.CLOSE)
  const seaTop = SEA
  // Foam along the swash's edge.
  p.noStroke()
  p.fill(M.cream)
  for (let j = 0; j < 5; j++) {
    const fx = x0 + 0.06 + j * 0.13
    p.ellipse(fx * k, (Math.min(sand(fx), seaTop) - 0.015) * k, 0.16 * k, (0.045 + 0.03 * hash(j, 2)) * k)
  }
  // The breaker: a wall of water that stands up and falls on the note.
  const br = t - BREAKER
  if (br > -0.5 && br < 0.5) breaker(p, k, ink, w, br)
  // The bucket, the boy's, yellow; full of sea after the wave; tipped by him, the water running out.
  bucket(p, k, ink, w, t)
}

/** The swash: how far up the sand the water reaches (x, smaller is further), how high its lip, and the furthest it has been. */
function washAt(t: number): { x: number; h: number; far: number } {
  let x = SEA_EDGE + 0.45
  let h = 0.02
  let far = x
  const push = (at: number, to: number, hh: number, dur: number) => {
    const s = t - at
    if (s < -0.25) return
    // Up the sand quickly to its reach on the note, and back more slowly.
    const up = s < 0 ? 1 - smooth(s, -0.25, 0) : 0
    const inn = s < 0 ? smooth(s, -0.25, 0) : Math.exp(-s / dur)
    const at2 = SEA_EDGE + 0.45 + (to - SEA_EDGE - 0.45) * inn
    if (at2 < x) {
      x = at2
      h = hh * (s < 0 ? 1 : Math.exp(-s / 0.3)) + 0.02 * up
    }
    far = Math.min(far, s >= 0 ? to : at2)
  }
  push(WAVES[0], SEA_EDGE - 0.02, 0.05, 0.4)
  push(WAVES[1], SEA_EDGE - 0.18, 0.06, 0.4)
  push(WAVES[2], SEA_EDGE - 0.32, 0.06, 0.4)
  push(BREAKER + 0.12, -4.35, 0.12, 0.75)
  push(LAST_WAVE, SEA_EDGE - 0.5, 0.05, 0.5)
  return { x, h, far: Math.max(-4.4, far) }
}

/** The breaker, from 0.5 s before its fall to 0.5 s after: a curl of water rising and crashing into foam. */
function breaker(p: p5, k: number, ink: string, w: number, s: number): void {
  const x = SEA_EDGE + 0.55
  const rise = s < 0 ? smooth(s, -0.5, -0.05) : 1 - smooth(s, 0, 0.35)
  const h = 0.55 * rise
  const fall = s < 0 ? 0 : smooth(s, 0, 0.18)
  const lean = 0.25 + 0.35 * fall
  if (h < 0.01) return
  p.fill(M.pool)
  p.stroke(ink)
  p.strokeWeight(w * 0.9)
  p.beginShape()
  p.vertex((x + 1.4) * k, SEA * k)
  p.bezierVertex((x + 0.8) * k, (SEA - h * 0.4) * k, (x + 0.2) * k, (SEA - h) * k, (x - lean) * k, (SEA - h * (1 - fall * 0.6)) * k)
  p.bezierVertex((x - lean + 0.1) * k, (SEA - h * 0.6) * k, (x - 0.1) * k, (SEA - 0.05) * k, (x - 0.35) * k, SEA * k)
  p.endShape(p.CLOSE)
  p.noStroke()
  p.fill(M.cream)
  p.ellipse((x - lean * 0.8) * k, (SEA - h * (1 - fall * 0.6) + 0.04) * k, (0.3 + 0.4 * fall) * k, (0.1 + 0.15 * fall) * k)
}

/** The boy's bucket: upright beside him, filled by the breaker, tipped over by him on a note. */
function bucket(p: p5, k: number, ink: string, w: number, t: number): void {
  const tip = smooth(t, TIP_BUCKET, TIP_BUCKET + 0.22)
  const settle = t > TIP_BUCKET + 0.22 ? 0.06 * ring(t - TIP_BUCKET - 0.22, 2.4, 0.2) : 0
  const a = (Math.PI / 2) * tip + settle
  const bx = BUCKET_X + 0.12
  p.push()
  p.translate(bx * k, LAWN * k)
  p.rotate(a)
  shape(p, k, [[-0.12, 0], [0.12, 0], [0.15, -0.26], [-0.15, -0.26]], M.sun, ink, w)
  const full = smooth(t, BREAKER + 0.3, BREAKER + 0.5) * (1 - tip)
  if (full > 0) shape(p, k, [[-0.13, -0.19], [0.13, -0.19], [0.14, -0.24], [-0.14, -0.24]], alpha(p, M.pool, full), null)
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(w * 0.7)
  p.arc(0, -0.26 * k, 0.3 * k, 0.24 * k, Math.PI, 0)
  p.pop()
  // The water running out of it over the sand.
  const run = t - TIP_BUCKET - 0.1
  if (run > 0 && run < 1.5 && full === 0) {
    const L = 0.1 + 0.5 * smooth(run, 0, 0.6)
    p.noStroke()
    p.fill(alpha(p, M.pool, 0.75 * (1 - smooth(run, 0.7, 1.5))))
    p.ellipse((bx + 0.28 + L / 2) * k, (LAWN + 0.015) * k, L * k, 0.05 * k)
  }
}

/** Shot four: the pool, the diving board, the splash. */
function drawPool(p: p5, t: number, c: Ctx, b: Rect): void {
  const { k, ink, weight } = c
  const w = weight
  sky(p, k, b, M.sky, M.cream, LAWN - 0.7)
  glow(p, k, 1.2, -3.4, 2.4, M.cream, 0.6)
  // A palm over the far side of the pool.
  palm(p, k, ink, w, 2.6, LAWN, 2.9, t)
  // The deck, terracotta tiles, and the pool sunk in it: its water, its lip, the depth.
  flat(p, k, b, LAWN, M.orange, ink, w)
  for (let x = Math.floor(b.x0); x < b.x1; x += 0.5) if (x < POOL_X0) seg(p, k, [x, LAWN], [x, LAWN + 0.5], alpha(p, ink, 0.18), w * 0.5)
  const x1 = b.x1 + 1
  shape(p, k, [[POOL_X0, LAWN], [x1, LAWN], [x1, 1.2], [POOL_X0, 1.2]], M.teal, ink, w)
  const water = waterAt(t)
  p.fill(M.pool)
  p.noStroke()
  p.beginShape()
  for (let x = POOL_X0 + 0.04; x <= x1; x += 0.12) p.vertex(x * k, (WATER + water(x)) * k)
  p.vertex(x1 * k, 1.2 * k)
  p.vertex((POOL_X0 + 0.04) * k, 1.2 * k)
  p.endShape(p.CLOSE)
  // The light on the pool floor, wavering.
  for (let i = 0; i < 6; i++) {
    const x = POOL_X0 + 0.5 + i * 0.75 + 0.1 * Math.sin(t * 0.9 + i)
    p.stroke(alpha(p, M.cream, 0.35))
    p.strokeWeight(w * 0.7)
    p.noFill()
    p.bezier(x * k, 0.95 * k, (x + 0.15) * k, 0.9 * k, (x + 0.25) * k, 1.0 * k, (x + 0.4) * k, 0.95 * k)
  }
  seg(p, k, [POOL_X0, LAWN], [POOL_X0, 1.2], ink, w)
  // The board: its stand on the deck, the plank out over the water, bending at its tip on each landing.
  box2(p, k, BOARD_ROOT - 0.15, LAWN + 0.06, BOARD_ROOT + 0.2, LAWN + 0.2, M.teal, ink, w * 0.8)
  const d = boardDip(t)
  p.fill(M.cream)
  p.stroke(ink)
  p.strokeWeight(w)
  p.beginShape()
  const L = BOARD_TIP - BOARD_ROOT
  const n = 10
  for (let i = 0; i <= n; i++) {
    const u = i / n
    p.vertex((BOARD_ROOT + L * u) * k, (LAWN + d * u * u) * k)
  }
  for (let i = n; i >= 0; i--) {
    const u = i / n
    p.vertex((BOARD_ROOT + L * u) * k, (LAWN + 0.1 + d * u * u) * k)
  }
  p.endShape(p.CLOSE)
  // The fulcrum under the plank, and its spring.
  shape(p, k, [[BOARD_ROOT + 0.45, LAWN + 0.2], [BOARD_ROOT + 0.75, LAWN + 0.2], [BOARD_ROOT + 0.6, LAWN + 0.06 + d * 0.12]], M.orange, ink, w * 0.8)
  // The splashes: a crown of water where he goes in, and the boy's smaller one.
  splash(p, k, ink, w, t - SPLASH, -0.2, 1)
  splash(p, k, ink, w, t - SON_SPLASH, -1.3, 0.55)
}

/** The water's surface at x: a flat pool, raised in a swell round each splash and rocking after. */
function waterAt(t: number): (x: number) => number {
  const s1 = t - SPLASH
  const s2 = t - SON_SPLASH
  return (x) => {
    let y = 0.008 * Math.sin(x * 4 + t * 1.8)
    if (s1 > 0) y += 0.07 * Math.exp(-s1 / 0.9) * Math.cos((x + 0.2) * 5 - s1 * 7) * Math.exp(-Math.abs(x + 0.2) / (0.4 + s1))
    if (s2 > 0) y += 0.04 * Math.exp(-s2 / 0.8) * Math.cos((x + 1.3) * 6 - s2 * 7) * Math.exp(-Math.abs(x + 1.3) / (0.3 + s2))
    return y
  }
}

/** A crown of water thrown up where something went in at x, and falling back. */
function splash(p: p5, k: number, ink: string, w: number, s: number, x: number, size: number): void {
  if (s < 0 || s > 0.9) return
  const up = smooth(s, 0, 0.12) * (1 - smooth(s, 0.3, 0.9))
  const h = 0.55 * size * up
  const spread = 0.12 + 0.35 * size * smooth(s, 0, 0.5)
  if (h > 0.01) {
    p.fill(alpha(p, M.pool, 0.95))
    p.stroke(ink)
    p.strokeWeight(w * 0.7)
    p.beginShape()
    p.vertex((x - spread - 0.1 * size) * k, WATER * k)
    p.quadraticVertex((x - spread * 0.8) * k, (WATER - h * 0.9) * k, (x - spread * 0.55) * k, (WATER - h) * k)
    p.quadraticVertex((x - spread * 0.3) * k, (WATER - h * 0.3) * k, x * k, (WATER - h * 0.25) * k)
    p.quadraticVertex((x + spread * 0.3) * k, (WATER - h * 0.3) * k, (x + spread * 0.55) * k, (WATER - h) * k)
    p.quadraticVertex((x + spread * 0.8) * k, (WATER - h * 0.9) * k, (x + spread + 0.1 * size) * k, WATER * k)
    p.endShape(p.CLOSE)
    p.noStroke()
    p.fill(alpha(p, M.cream, 0.8))
    p.ellipse((x - spread * 0.55) * k, (WATER - h) * k, 0.08 * size * k, 0.05 * size * k)
    p.ellipse((x + spread * 0.55) * k, (WATER - h) * k, 0.08 * size * k, 0.05 * size * k)
  }
  // Drops thrown out in arcs, falling back in.
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1
    const vx = side * (0.5 + 0.5 * hash(i, 71)) * size
    const vy = -(2.2 + 1.4 * hash(i, 72)) * Math.sqrt(size)
    const dx = x + vx * s
    const dy = WATER - 0.1 * size + vy * s + 8 * s * s
    if (dy > WATER || s > 0.8) continue
    p.noStroke()
    p.fill(alpha(p, M.pool, 0.9))
    p.ellipse(dx * k, dy * k, 0.045 * size * k, 0.06 * size * k)
  }
}

/** How far the board's tip is bent down at t: carried down by his landing, then ringing out heavy. */
function boardDip(t: number): number {
  let d = 0
  for (const L of LANDS) {
    const s = t - L
    if (s < 0) continue
    if (s < 0.16) d += DIP * Math.sin((Math.PI * s) / 0.16) * (s < 0.08 ? 1 : 1)
    else d += -DIP * 0.55 * ring(s - 0.16, 2.6, 0.22) * Math.sin(Math.PI * 0.5)
  }
  // The launch off the tip for the dive.
  return d
}

/** In front of the balls at the pool: the water's face, so what is in it is in it. */
function overPool(p: p5, t: number, c: Ctx): void {
  const { k, ink, weight } = c
  const water = waterAt(t)
  const fr = frame(p, k)
  const x1 = fr.x1 + 1
  p.fill(alpha(p, M.pool, 0.55))
  p.noStroke()
  p.beginShape()
  for (let x = POOL_X0 + 0.04; x <= x1; x += 0.12) p.vertex(x * k, (WATER + water(x)) * k)
  p.vertex(x1 * k, 1.2 * k)
  p.vertex((POOL_X0 + 0.04) * k, 1.2 * k)
  p.endShape(p.CLOSE)
  p.noFill()
  p.stroke(alpha(p, M.cream, 0.8))
  p.strokeWeight(weight * 0.9)
  p.beginShape()
  for (let x = POOL_X0 + 0.04; x <= x1; x += 0.12) p.vertex(x * k, (WATER + water(x)) * k)
  p.endShape()
  seg(p, k, [POOL_X0, LAWN], [POOL_X0, 1.2], ink, weight)
}

/** Shot five: the field of flowers. The ground falls into a hollow and rises; a flower opens as he brushes it. */
function drawField(p: p5, t: number, c: Ctx, b: Rect): void {
  const { k, ink, weight } = c
  const w = weight
  const late = smooth(t, CUTS[3], CUTS[4])
  sky(p, k, b, M.sky, M.cream, -0.9)
  glow(p, k, 6.5, -1.3, 3.2, M.orange, 0.25 + 0.2 * late)
  // Far hills, soft.
  p.fill(alpha(p, M.teal, 0.55))
  p.noStroke()
  p.beginShape()
  p.vertex(b.x0 * k, b.y1 * k)
  for (let x = b.x0; x <= b.x1 + 0.5; x += 0.5) p.vertex(x * k, (-1.0 - 0.35 * Math.sin(x * 0.55 + 1) - 0.15 * Math.sin(x * 1.3)) * k)
  p.vertex(b.x1 * k, b.y1 * k)
  p.endShape(p.CLOSE)
  // The meadow.
  p.fill(M.grass)
  p.stroke(ink)
  p.strokeWeight(w)
  p.beginShape()
  p.vertex(b.x0 * k, b.y1 * k)
  for (let x = b.x0; x <= b.x1 + 0.2; x += 0.15) p.vertex(x * k, ground(x) * k)
  p.vertex(b.x1 * k, b.y1 * k)
  p.endShape(p.CLOSE)
  // Flowers in the grass everywhere, open already: a scatter, not a row.
  p.noStroke()
  for (let i = 0; i < 70; i++) {
    const x = -5 + 13 * hash(i, 81)
    if (x < b.x0 || x > b.x1) continue
    const depth = hash(i, 82)
    const y = ground(x) + 0.05 + depth * 0.5
    if (y > b.y1) continue
    const r = 0.025 + 0.035 * depth * hash(i, 83)
    p.fill(i % 3 === 0 ? M.pink : i % 3 === 1 ? M.cream : M.orange)
    p.ellipse(x * k, y * k, 2 * r * k, 1.6 * r * k)
  }
  // The tall ones along his way, each opening on its note as he goes by.
  for (let i = 0; i < FLOWER_X.length; i++) flower(p, k, ink, w, FLOWER_X[i], t - BLOOMS[i], i)
}

/** A tall flower at x: a stem that he brushes, a bud that bursts open on the note, petals settling. */
function flower(p: p5, k: number, ink: string, w: number, x: number, s: number, i: number): void {
  const foot = ground(x)
  const h = 0.42 + 0.12 * hash(i, 91)
  const bend = s > -0.2 ? 0.12 * Math.exp(-Math.max(0, s) / 0.35) * Math.sin(Math.min(Math.PI, (s + 0.2) * 6)) : 0
  const top: Pt = [x + bend, foot - h]
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(w * 0.9)
  p.bezier(x * k, foot * k, x * k, (foot - h * 0.5) * k, top[0] * k, (top[1] + h * 0.3) * k, top[0] * k, top[1] * k)
  // A leaf.
  shape(p, k, [[x, foot - h * 0.3], [x + 0.12, foot - h * 0.42], [x + 0.03, foot - h * 0.36]], M.teal, ink, w * 0.5)
  const open = s < 0 ? 0 : 1 - Math.exp(-s / 0.09) + 0.08 * Math.exp(-s / 0.2) * Math.sin(s * 18)
  const col = i % 2 ? M.pink : M.orange
  if (open <= 0.02) {
    p.fill(M.teal)
    p.stroke(ink)
    p.strokeWeight(w * 0.6)
    p.ellipse(top[0] * k, (top[1] - 0.04) * k, 0.08 * k, 0.12 * k)
    return
  }
  const pr = 0.09 * Math.min(1.1, open)
  p.fill(col)
  p.stroke(ink)
  p.strokeWeight(w * 0.6)
  for (let j = 0; j < 5; j++) {
    const a = -Math.PI / 2 + (j - 2) * 0.62 * Math.min(1, open)
    p.ellipse((top[0] + Math.cos(a) * pr) * k, (top[1] - 0.03 + Math.sin(a) * pr) * k, 0.1 * k, 0.07 * k)
  }
  p.fill(M.sun)
  p.circle(top[0] * k, (top[1] - 0.03) * k, 0.06 * k)
}

/** Shot six: evening at home, the couch under the window, the lamp. */
function drawHome(p: p5, t: number, c: Ctx, b: Rect): void {
  const { k, ink, weight } = c
  const w = weight
  const off = smooth(t, LAMP_OFF, LAMP_OFF + 0.06)
  const dusk = smooth(t, CUTS[4], 392)
  // The wall, warm in the lamplight; dim blue once it is out.
  shape(p, k, [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]], M.warm, null)
  const floor = 0.45
  // The window over the couch: the evening going from orange to teal.
  const wx0 = 4.05
  const wx1 = 5.95
  const wy0 = -2.0
  const wy1 = -0.95
  vgrad(p, k, wx0, wy0, wx1, wy1, [[0, rgba(M.teal, 0.5 + 0.4 * dusk)], [1, rgba(M.orange, 0.9 - 0.5 * dusk)]])
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(w)
  p.rect(((wx0 + wx1) / 2) * k, ((wy0 + wy1) / 2) * k, (wx1 - wx0) * k, (wy1 - wy0) * k)
  seg(p, k, [(wx0 + wx1) / 2, wy0], [(wx0 + wx1) / 2, wy1], ink, w * 0.7)
  // The floor.
  shape(p, k, [[b.x0, floor], [b.x1, floor], [b.x1, b.y1], [b.x0, b.y1]], M.orange, ink, w)
  // The lamp: a pole and a shade, its light on the wall.
  const lampOn = 1 - off
  glow(p, k, LAMP_X, -1.45, 2.0, M.sun, 0.55 * lampOn)
  seg(p, k, [LAMP_X, floor], [LAMP_X, -1.35], ink, w * 1.2)
  box2(p, k, LAMP_X - 0.2, floor - 0.04, LAMP_X + 0.2, floor, M.teal, ink, w * 0.8)
  shape(p, k, [[LAMP_X - 0.2, -1.33], [LAMP_X + 0.2, -1.33], [LAMP_X + 0.13, -1.62], [LAMP_X - 0.13, -1.62]], lampOn > 0.5 ? M.sun : M.orange, ink, w)
  // The chain, and its bead, swung by his touch.
  const sw = t > LAMP_OFF ? 0.12 * ring(t - LAMP_OFF, 1.6, 0.35) : 0
  const bead: Pt = [BEAD[0] + sw, BEAD[1] - 0.01]
  seg(p, k, [LAMP_X - 0.1, -1.33], bead, alpha(p, ink, 0.8), w * 0.6)
  p.fill(M.sun)
  p.stroke(ink)
  p.strokeWeight(w * 0.5)
  p.circle(bead[0] * k, bead[1] * k, 0.05 * k)
  // The couch: its back and seat and arms.
  const y = seatY(COUCH_X0, 0) + 0.01
  shape(p, k, [[COUCH_X0 - 0.05, y - 0.72], [COUCH_X1 + 0.05, y - 0.72], [COUCH_X1 + 0.05, y], [COUCH_X0 - 0.05, y]], M.teal, ink, w)
  shape(p, k, [[COUCH_X0 - 0.1, y], [COUCH_X1 + 0.1, y], [COUCH_X1 + 0.1, floor - 0.12], [COUCH_X0 - 0.1, floor - 0.12]], M.teal, ink, w)
  for (const lx of [COUCH_X0 + 0.05, COUCH_X1 - 0.05]) seg(p, k, [lx, floor - 0.12], [lx, floor], ink, w * 1.3)
  // Cushion seams.
  for (const sx of [4.8, 5.45]) seg(p, k, [sx, y - 0.68], [sx, y - 0.05], alpha(p, ink, 0.45), w * 0.6)
  // Dusk comes on in the room as the lamp goes.
  const dim = 0.5 * off + 0.12 * dusk
  if (dim > 0) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.fillStyle = rgba(M.room, dim)
    ctx.fillRect(b.x0 * k, b.y0 * k, (b.x1 - b.x0) * k, (b.y1 - b.y0) * k)
  }
}

/** In front of them at home: the couch's arms, and the room's dark once the lamp is out. */
function overHome(p: p5, t: number, c: Ctx): void {
  const { k, ink, weight } = c
  const w = weight
  const y = seatY(COUCH_X0, 0) + 0.01
  box2(p, k, COUCH_X0 - 0.22, y - 0.34, COUCH_X0 + 0.05, y + 0.02, M.teal, ink, w, 0.06)
  box2(p, k, COUCH_X1 - 0.05, y - 0.34, COUCH_X1 + 0.22, y + 0.02, M.teal, ink, w, 0.06)
  const off = smooth(t, LAMP_OFF, LAMP_OFF + 0.06)
  if (off > 0) {
    const fr = frame(p, k)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.fillStyle = rgba(M.room, 0.25 * off)
    ctx.fillRect((fr.x0 - 1) * k, (fr.y0 - 1) * k, (fr.x1 - fr.x0 + 2) * k, (fr.y1 - fr.y0 + 2) * k)
  }
}
