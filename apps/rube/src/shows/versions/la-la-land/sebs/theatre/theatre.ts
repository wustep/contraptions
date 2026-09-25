import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { FLOOR, R, mixHex, type Pt } from '../../../../../parts'
import { alpha, beam, box, carried, frame, glow, knock, lastOf, part, rgba, ring, route, type Companion, type Ctx, type PartShot, type Way } from '../kit'
import { DREAM_PERIOD, dream, notes, snap } from '../music'
import { G, hop } from '../physics'
import { THEATRE_INK, THEATRE_MAT as M } from '../worlds'

/**
 * The theatre: her one-woman show, and the full house the film's version
 * never had. A small proscenium house drawn the way every building here is,
 * its front wall cut away, and he runs its machinery from the street in.
 *
 * The velvet parts on a night street: the theatre's side wall, a marquee
 * jutting over the pavement, a blade sign above it. He rolls in under the
 * marquee and over the brass plate at its foot on the big hit (93.26): the
 * marquee blazes and its bulbs chase on the eighths; the blade's three great
 * lamps light top to bottom and the star over them (her name in lights, with
 * no letters). He knocks the stage door open (94.90) and rolls in onto the
 * lift in the wing: its catch lets go (96.07), the sandbag drops past him and
 * he rises to the fly gallery, where the lift knocks up the house-light
 * switch as it arrives (98.87) and the house goes down. Along the gallery onto
 * the counterweight arbor (100.28): his weight is the difference, and the
 * arbor starts down; the spot bangs on against the closed curtain (100.75),
 * and the curtain flies out through it, slowly, as the arbor comes down,
 * showing her standing in the pool of light. The arbor lands on its stop
 * (104.98): the stage lights come up on her window.
 *
 * He hops off, round the proscenium, and down off the stage into his seat in
 * the front row, and she plays: a roll, a leap, a hop home to her mark, and
 * the house holds its breath through the lead-in bar. On the downbeat (115.52)
 * he is on his feet first; the house rises behind him row by row on the next
 * hits, every seat's paddles up and clapping with the band, and the last row's
 * rising sends a rose up through the light to land at her feet on the
 * downbeat (119.28), where she bows. She bows again, turns to him, and he leaps
 * up onto the stage beside her (125.27). The curtain comes in behind them, they
 * bow together, and on the last hits every light in the house comes up, into
 * the white.
 *
 * The frame: the ball comes in on the pavement (y = 0, which is the stage
 * floor's level too). The building's left wall stands at x 7.7; the stage's
 * arch is x 12.6 to 19.8, centred on 16.2; the house's four rows are in front
 * of the stage, lower in the picture, their backs to us.
 */

/* ------------------------------------------------------------------ the clock (show seconds) */

const on = (t: number): number => snap(t, 0.03)?.t ?? t

/** The brass plate at the marquee's foot, on the biggest hit of the bar: the marquee blazes. */
const TREADLE = on(93.263)
/** The blade's three great lamps, top to bottom, and the star over them. */
const BLADE = [on(93.716), on(93.96), on(94.343)]
const STAR = on(94.656)
/** He knocks the stage door open. */
const KNOCK = on(94.9)
/** Onto the lift: its catch lets go. */
const HOIST = on(96.073)
/** The lift arrives at the fly gallery and knocks the house-light switch up. */
const ARRIVE = on(98.871)
/** Onto the arbor: it starts down. */
const ARBOR = on(100.275)
/** The spot bangs on against the closed curtain. */
const SPOT = on(100.751)
/** The arbor lands on its stop; the curtain is out, the stage lights up. */
const THUD = on(104.977)
/** Off the arbor onto the wing floor, off the stage's lip, into his seat. */
const OFF = on(105.895)
const LIP = on(106.835)
const SEAT = on(107.299)
/** Her show: a roll to stage right, a leap back, a hop home to her mark. */
const SHOW: { t0: number; t1: number; x: number; lift: number }[] = [
  { t0: on(108.251), t1: on(108.716), x: 16.95, lift: 0 },
  { t0: on(110.121), t1: on(110.585), x: 15.75, lift: 0.42 },
  { t0: on(112.466), t1: on(112.919), x: 16.2, lift: 0.3 },
]
/** The footlights answer her: where her roll lands, as she leaps, where the leap lands, where she comes home. */
const FOOT = [on(108.716), on(110.121), SHOW[1].t1, SHOW[2].t1]
/** The work lights in the wing, each switched on as the machine goes past it: three up the lift's shaft, three down the arbor's track. */
const LIFT_LAMPS = [on(96.769), on(97.71), on(98.058)]
const ARBOR_LAMPS = [on(102.4), on(103.573), on(104.037)]
/** He is on his feet (dream(105)). */
const SPRING = on(115.519)
/** The rows rise behind him, one a hit; the last sends the rose up. */
const ROWS = [on(115.995), on(116.599), on(116.947), on(117.388)]
/** The rose lands at her feet on the downbeat (dream(113)), and she bows. */
const BOW1 = on(119.281)
const BOW2 = on(121.15)
/** She turns to him; he leaps up beside her; she comes to meet him. */
const BECKON = on(123.716)
const LEAP = on(124.656)
const LAND = on(125.272)
const TOUCH = on(125.585)
/** The curtain comes in behind them. */
const CURTAIN_IN: [number, number] = [on(127.443), on(128.627)]
const BOW3 = on(130.055)
/** The last two hits: every light in the house comes up, into the white. */
const FINAL = [on(130.984), on(131.216)]
/** The white cover's start: her span runs on under it until it is full. */
const WHITE = 133.352 - 0.5

/** The house's paddles clap with the band's accents from the moment the front row is up. */
const CLAPS = (() => {
  const out: number[] = []
  for (const n of notes(ROWS[0] + 0.2, WHITE - 0.05, 0.45)) if (!out.length || n.t - out[out.length - 1] > 0.19) out.push(n.t)
  return out
})()

/* ------------------------------------------------------------------ the house, in the part's cells */

/** The building's left wall (a section: its cut face from 7.7 to 8.0), its roof, its right wall. */
const WALL = 7.7
const WALL_IN = 8.0
const DOOR_TOP = -1.32
const ROOF = -9.4
const RIGHT = 21.4
/** The proscenium: the arch, its gold frame, its top. */
const ARCH0 = 12.6
const ARCH1 = 19.8
const ARCH_TOP = -3.9
const FRAME_W = 0.4
const MID = (ARCH0 + ARCH1) / 2
/** The stage's front face runs down to here; the house's rows stand below it. */
const APRON = 0.72
/** The main curtain: its height, and how far the arbor flies it. */
const CURTAIN_H = FLOOR - ARCH_TOP + 0.1
const TRAVEL = 4.3
/** The fly gallery's deck, from the lift's shaft to the arbor. */
const GAL = -5.02
const GAL0 = 9.6
const GAL1 = 11.33
/** The lift: its deck (top at DECK0 at rest), its sandbag, its block. */
const HOIST_X = 9.3
const HOIST_HW = 0.3
const DECK0 = 0
const BAG_X = 8.8
const BAG_TOP = GAL - 0.05
const BAG_H = 0.36
const HBLOCK: Pt = [9.05, -6.05]
const HBLOCK_R = 0.25
/** The arbor: its track, its top plate (flush with the gallery while the curtain is in), its body. */
const ARBOR_X = 11.55
const ARBOR_HW = 0.19
const ARBOR_H = 0.85
const HEAD: Pt = [ARBOR_X + 0.28, -8.6]
const HEAD_R = 0.28
const LINE_Y = HEAD[1] - HEAD_R
const LOFT = [13.1, 16.1, 19.1]
const LOFT_R = 0.15
/** The marquee jutting over the pavement, and the blade sign above it. */
const MQ = { x0: 4.0, x1: WALL, y0: -2.3, y1: -1.55 }
const BL = { x0: 6.35, x1: WALL - 0.04, y0: -5.25, y1: -2.62 }
const STAR_AT: Pt = [(BL.x0 + BL.x1) / 2, BL.y0 - 0.42]
/** The rows: their floors, seats a row, pitch. */
const ROW_Y = [1.05, 1.47, 1.89, 2.31]
const PITCH = 0.48
const SEAT_W = 0.4
const LOW = 0.2
const HIGH = 0.44
const seatX = (r: number, i: number): number => 12.26 + PITCH * i + (r % 2) * (PITCH / 2)
const PER_ROW = 17
/** His seat (front row), and where he sits and stands in it. */
const HIS = 5
const SEAT_X = seatX(0, HIS)
const SEATED_Y = ROW_Y[0] - LOW - R + 0.045
const STAND_Y = ROW_Y[0] - HIGH - 0.19
/** The rose's seat: the back row, in the middle. */
const ROSE_SEAT: [number, number] = [3, 8]
/** Where he lands on the stage beside her, and where she meets him. */
const LAND_X = 15.6
const MEET_X = LAND_X + 2 * R
/** The spot's lamp, on its pipe in front of the arch. */
const LAMP: Pt = [MID, -4.72]

/* ------------------------------------------------------------------ motion */

const clamp01 = (u: number): number => Math.max(0, Math.min(1, u))
const ease = (u: number): number => {
  const v = clamp01(u)
  return v * v * (3 - 2 * v)
}
const soft = (u: number): number => {
  const v = clamp01(u)
  return v * v * v * (10 - 15 * v + 6 * v * v)
}
const lerp = (a: number, b: number, u: number): number => a + (b - a) * u

/**
 * A heavy thing let go on a rope: it gathers speed evenly to `a` of the way through its time, then is braked down to
 * `r` of its best speed, which it still has when it meets its stop. 0..1 → 0..1.
 */
function run(u: number, a: number, r: number): number {
  const v = clamp01(u)
  const vm = 2 / (a + (1 + r) * (1 - a))
  if (v <= a) return (vm / (2 * a)) * v * v
  const d = v - a
  return (vm * a) / 2 + vm * d - ((vm - r * vm) * d * d) / (2 * (1 - a))
}

/** The lift's deck top, at show time `t`: a dip as he lands on it, the ride up, a clack into the gallery's stop. */
function deckY(t: number): number {
  if (t <= HOIST) return DECK0
  if (t < ARRIVE) {
    const dip = 0.03 * Math.sin(Math.min(Math.PI, (t - HOIST) * 14)) * Math.exp(-(t - HOIST) / 0.12)
    return DECK0 + (GAL - DECK0) * run((t - HOIST) / (ARRIVE - HOIST), 0.62, 0.3) + dip
  }
  return GAL - 0.035 * ring(t - ARRIVE, 3.2, 0.14)
}

/** The sandbag's centre: it falls as far as the lift rises, and slumps on the floor. */
function bagY(t: number): number {
  const top = BAG_TOP
  if (t < ARRIVE) return top + (DECK0 - deckY(t))
  return top + (DECK0 - GAL)
}

/** How far out the main curtain is flown, 0 (in) to 1 (out): the arbor comes down as it goes up. */
function flown(t: number): number {
  if (t <= ARBOR) return 0
  if (t < THUD) return run((t - ARBOR) / (THUD - ARBOR), 0.72, 0.28)
  if (t < CURTAIN_IN[0]) return 1 - 0.012 * Math.max(0, ring(t - THUD, 2.4, 0.2))
  if (t < CURTAIN_IN[1]) return 1 - soft((t - CURTAIN_IN[0]) / (CURTAIN_IN[1] - CURTAIN_IN[0]))
  return 0.006 * Math.max(0, ring(t - CURTAIN_IN[1], 1.8, 0.25))
}
const hemAt = (t: number): number => FLOOR - TRAVEL * flown(t)
const plateAt = (t: number): number => GAL + TRAVEL * flown(t)

/** Where the work lights' trip arms pivot: on the lift's guide beside its shaft, and on the arbor's own track. */
const RAIL_LIFT = HOIST_X + HOIST_HW + 0.14
const RAIL_ARBOR = ARBOR_X + ARBOR_HW + 0.07
/** Each work light: when it is switched, and the height of its trip arm (where the lift's deck, or the arbor's foot, meets it). */
const WORK = [
  ...LIFT_LAMPS.map((t) => ({ t, y: deckY(t), lift: true })),
  ...ARBOR_LAMPS.map((t) => ({ t, y: plateAt(t) + ARBOR_H, lift: false })),
]

/** 0 before a seat rises, then up with a kick past its height and a heavy settle. */
function risen(since: number): number {
  if (since <= 0) return 0
  const up = 1 - Math.exp(-since / 0.045)
  return up + 0.14 * Math.exp(-since / 0.16) * Math.sin(since * 2 * Math.PI * 2.6)
}

/** A bow: down quickly, held, up slowly. 0..1. */
function bow(since: number, hold = 0.28): number {
  if (since < -0.12 || since > 0.12 + hold + 0.45) return 0
  if (since < 0) return soft((since + 0.12) / 0.12)
  if (since < hold) return 1
  return 1 - soft((since - hold) / 0.45)
}

/** Where the rose is, and its turn, at show time `t`: on its seat, up through the light, at her feet. */
const ROSE_G = 0.42 * G
function roseAt(t: number): { x: number; y: number; a: number } {
  const [r, i] = ROSE_SEAT
  const from: Pt = [seatX(r, i), ROW_Y[r] - HIGH - 0.03]
  const to: Pt = [16.52, FLOOR - 0.045]
  const t0 = ROWS[3]
  const t1 = BOW1
  if (t < t0) return { x: from[0], y: ROW_Y[r] - LOW - 0.03, a: 0 }
  if (t < t1) {
    const u = (t - t0) / (t1 - t0)
    const T = t1 - t0
    const arc = (ROSE_G * T * T) / 8
    return { x: lerp(from[0], to[0], u), y: lerp(from[1], to[1], u) - arc * 4 * u * (1 - u), a: -u * Math.PI * 3.5 }
  }
  const k = t - t1
  return { x: to[0], y: to[1] - 0.05 * Math.max(0, Math.sin(Math.min(Math.PI, k * 9))) * Math.exp(-k / 0.1), a: -Math.PI * 3.5 * Math.exp(-k / 0.08) }
}

/** Mia: behind the curtain on her mark, then her show, her bows, and him. */
function miaAt(t: number): Companion {
  let x = MID
  let y = 0
  const moves = [...SHOW, { t0: BECKON, t1: BECKON + 0.5, x: LAND_X + 0.4, lift: 0 }, { t0: TOUCH - 0.18, t1: TOUCH, x: MEET_X, lift: 0 }]
  for (const m of moves) {
    if (t >= m.t1) x = m.x
    else if (t > m.t0) {
      const u = (t - m.t0) / (m.t1 - m.t0)
      x = lerp(x, m.x, m.lift > 0 ? u : ease(u))
      y = -m.lift * 4 * u * (1 - u)
      break
    } else break
  }
  // A breath as the lights come up on her; the bows.
  const b = Math.max(bow(t - BOW1, 0.34), bow(t - BOW2, 0.22), bow(t - BOW3, 0.3))
  const lift = 0.025 * Math.sin(Math.PI * clamp01((t - THUD) / 0.9))
  const stretch = 1 - 0.18 * b
  return { x, y: y - lift + R * (1 - stretch), stretch, angle: Math.PI / 2 }
}

/* ------------------------------------------------------------------ light */

/** The footlights, along the stage's lip inside the arch; and where she is on each move they answer. */
const FOOT_X = Array.from({ length: 13 }, (_, i) => ARCH0 + 0.4 + (i * (ARCH1 - ARCH0 - 0.8)) / 12)
const FOOT_AT = FOOT.map((t) => ({ t, x: miaAt(t).x }))

/** The house lights: up, down as the lift arrives, half up for the bows, full for the end. */
const houseAt = (t: number): number => 1 - 0.88 * ease((t - ARRIVE) / 0.7) + 0.45 * ease((t - BOW2) / 1.2) + 0.45 * ease((t - FINAL[0]) / 0.5)
/** The stage lights on her window: out behind the curtain, up on the thud, up again at the end. */
const stageAt = (t: number): number => ease((t - THUD) / 0.35) + 0.5 * ease((t - FINAL[0]) / 0.6)
/** The spot: bang on, and a little over-bright at the end. */
const spotAt = (t: number): number => (t < SPOT ? 0 : Math.min(1, (t - SPOT) / 0.05) * (1 + 0.12 * Math.exp(-(t - SPOT) / 0.25))) + 0.25 * ease((t - FINAL[0]) / 0.6)
/** Where the spot is aimed: her, followed a little late; both of them once he is up beside her. */
function spotX(t: number): number {
  let sum = 0
  let w = 0
  for (let j = 0; j < 6; j++) {
    const s = t - j * 0.06
    sum += miaAt(s).x
    w += 1
  }
  const her = sum / w
  return lerp(her, (LAND_X + MEET_X) / 2, ease((t - LAND) / 0.5))
}
/** How much light is on the main curtain: the house's, and the stage's spill. */
const curtainLitAt = (t: number): number => Math.min(1, 0.25 + 0.6 * Math.min(1, Math.max(0, houseAt(t))) + 0.3 * stageAt(t))
/** The curtain is in front of her until it has flown out; once it comes in again it is behind the two of them. */
const BEHIND = CURTAIN_IN[0] - 0.5
/** The chase: which eighth of the dream's comb it is. */
const eighth = (t: number): number => Math.floor((t - dream(0)) / (DREAM_PERIOD / 2) + 1e-6)

/* ------------------------------------------------------------------ the part */

interface TheatreState {
  begin: number
  /** Where the brass plate is: where he is on the hit. */
  treadle: number
  /** Each seat: row, x, when it rises (Infinity for his, which he stands out of). */
  seats: { r: number; x: number; up: number; his: boolean }[]
}

export const THEATRE_HITS: number[] = [
  TREADLE, ...BLADE, STAR, KNOCK, HOIST, ARRIVE, ARBOR, SPOT, THUD, OFF, SEAT,
  SHOW[1].t1, SHOW[2].t1, ...FOOT, ...LIFT_LAMPS, ...ARBOR_LAMPS,
  SPRING, ...ROWS, BOW1, BOW2, LAND, TOUCH, CURTAIN_IN[1], BOW3, ...FINAL,
  ...CLAPS,
].filter((t, i, all) => all.indexOf(t) === i).sort((a, b) => a - b)

export const theatre = part<TheatreState>(
  {
    name: 'theatre',
    draw: (p, s, c) => drawHouse(p, s, c),
    over: (p, s, c) => overHouse(p, s, c),
  },
  (slot) => {
    const B = slot.begin
    const at = (t: number) => t - B
    const T = slot.end - B

    // Along the pavement under the marquee, gathering pace, over the brass plate on the hit, to the stage door.
    const kx = WALL - 0.02 - R
    const T1 = at(KNOCK)
    const L1 = kx + 0.5
    const v0 = 1.15
    const v1 = (2 * L1) / T1 - v0
    const treadle = -0.5 + v0 * at(TREADLE) + ((v1 - v0) * at(TREADLE) ** 2) / (2 * T1)
    // The door gives: through it, slower, and a step up onto the lift's deck as its catch lets go.
    const edge = HOIST_X - HOIST_HW - 0.12
    const step = at(HOIST) - 0.3
    const L2 = edge - kx
    const va = 1.7
    const vb = (2 * L2) / (step - T1) - va
    const ways: Way[] = [
      { at: 0, p: [-0.5, 0] },
      { at: T1, p: [kx, 0], ramp: [v0, v1] },
      { at: step, p: [edge, 0], ramp: [va, vb] },
    ]
    ways.push(hop(ways[2], [HOIST_X, DECK0 - R], at(HOIST)))
    const segs = route(ways)
    // Up with the lift.
    const lifted = at(ARRIVE) + 0.28
    segs.push(...carried((u) => [HOIST_X, deckY(u + B) - R], at(HOIST), lifted, 60))
    // Along the gallery and onto the arbor's plate, into its stop.
    const g0: Way = { at: lifted, p: [HOIST_X, deckY(lifted + B) - R] }
    const g1: Way = { at: at(ARBOR), p: [ARBOR_X, GAL - R] }
    const L3 = ARBOR_X - HOIST_X
    const w0 = 0.25
    g1.ramp = [w0, (2 * L3) / (g1.at - g0.at) - w0]
    segs.push(...route([g0, g1]))
    // Down with the arbor as the curtain flies out, and a moment on it after the thud.
    const ride = at(THUD) + 0.47
    segs.push(...carried((u) => [ARBOR_X, plateAt(u + B) - R], at(ARBOR), ride, 90))
    // Off it onto the wing floor, round the proscenium, off the stage's lip and into his seat.
    const o0: Way = { at: ride, p: [ARBOR_X, plateAt(ride + B) - R] }
    const o1 = hop(o0, [12.05, 0], at(OFF))
    const lip: Way = { at: at(LIP), p: [13.75, 0], ramp: [1.1, (2 * 1.7) / (at(LIP) - at(OFF)) - 1.1] }
    const seat = hop(lip, [SEAT_X, SEATED_Y], at(SEAT))
    const sat: Way = { at: at(SPRING), p: [SEAT_X, SEATED_Y] }
    // On his feet on the downbeat.
    const up = hop(sat, [SEAT_X, STAND_Y], at(SPRING) + 0.3)
    const stand: Way = { at: at(LEAP), p: [SEAT_X, STAND_Y] }
    // Up onto the stage beside her.
    const land = hop(stand, [LAND_X, 0], at(LAND))
    // A nod with her bow, and still, into the white.
    const nod0: Way = { at: at(BOW3) - 0.08, p: [LAND_X, 0] }
    const nod1: Way = { ...hop(nod0, [LAND_X, 0], at(BOW3) + 0.14, G * 0.5) }
    const end: Way = { at: T, p: [LAND_X, 0] }
    segs.push(...route([o0, o1, lip, seat, sat, up, stand, land, nod0, nod1, end]))

    const seats: TheatreState['seats'] = []
    for (let r = 0; r < ROW_Y.length; r++) {
      for (let i = 0; i < PER_ROW; i++) {
        const x = seatX(r, i)
        const his = r === 0 && i === HIS
        // Each row rises from his place outward, a seat a few hundredths after the next.
        const up = ROWS[r] + Math.abs(x - SEAT_X) * 0.035
        seats.push({ r, x, up: his ? Infinity : up, his })
      }
    }
    // The seat that throws the rose rises on the hit exactly.
    for (const st of seats) if (st.r === ROSE_SEAT[0] && Math.abs(st.x - seatX(ROSE_SEAT[0], ROSE_SEAT[1])) < 1e-6) st.up = ROWS[3]

    return {
      cells: box(-4, -10, 22, 3),
      exit: [LAND_X + 0.5, 0],
      lane: { segs, fire: at(TREADLE) },
      state: { begin: B, treadle, seats },
      company: [{ from: dream(51.5), to: 133.352, who: 'mia', at: miaAt }],
    }
  },
  (slot): PartShot[] => [
    { t: slot.begin, cells: 6.8, hold: [3.9, -1.9] },
    { t: TREADLE, cells: 6.6, hold: [4.9, -1.95] },
    { t: KNOCK, cells: 6.2, hold: [6.9, -2.0] },
    { t: HOIST + 0.3, cells: 6.3, hold: [9.1, -2.3] },
    { t: ARRIVE, cells: 7.0, hold: [10.3, -4.1] },
    { t: ARBOR + 0.3, cells: 10.2, hold: [15.2, -3.2] },
    { t: THUD, cells: 7.4, hold: [15.5, -1.4] },
    // He hops off the arbor, round the arch, and into his seat.
    { t: SEAT + 0.2, cells: 5.3, hold: [15.5, -0.3] },
    // Her show: in on her in the spot, the house cut to the front row's backs, and his, along the foot of the frame.
    { t: SHOW[0].t1, cells: 4.2, hold: [16.3, -0.75] },
    { t: SHOW[1].t1, cells: 4.0, hold: [16.05, -0.8] },
    { t: SHOW[2].t1, cells: 3.85, hold: [16.15, -0.8] },
    // The lead-in bar: the house holds its breath; back a little, to him.
    { t: 114.9, cells: 4.4, hold: [15.8, -0.45] },
    { t: SPRING, cells: 5.2, hold: [15.9, 0.0] },
    { t: ROWS[3], cells: 7.0, hold: [16.1, -0.3] },
    { t: BOW1, cells: 5.8, hold: [16.1, -0.25] },
    // The curtain calls: close on the two of them at the stage's edge.
    { t: BOW2 + 0.3, cells: 4.7, hold: [15.95, -0.35] },
    { t: LAND, cells: 4.5, hold: [15.8, -0.3] },
    { t: CURTAIN_IN[1], cells: 4.5, hold: [15.8, -0.55] },
    { t: BOW3, cells: 4.3, hold: [15.8, -0.45] },
    { t: WHITE, cells: 4.5, hold: [15.8, -0.5] },
  ],
)

/* ------------------------------------------------------------------ drawing */

type Shape = Pt[]

function poly(p: p5, k: number, pts: Shape): void {
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

function rrect(p: p5, k: number, x0: number, y0: number, x1: number, y1: number, r = 0): void {
  p.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k, r * k)
}

/** A bulb: lit, a warm dot with a halo; out, a dull one. */
function bulb(p: p5, k: number, x: number, y: number, r: number, lit: number): void {
  p.noStroke()
  if (lit > 0.02) {
    p.fill(alpha(p, M.bulb, 0.22 * lit))
    p.circle(x * k, y * k, r * 4.4 * k)
  }
  p.fill(lit > 0.02 ? mixHex(mixHex(M.gold, THEATRE_INK.bg, 0.55), M.bulb, lit) : mixHex(M.gold, THEATRE_INK.bg, 0.55))
  p.circle(x * k, y * k, r * 2 * k)
}

/** A five-pointed star. */
function star(p: p5, k: number, cx: number, cy: number, r: number): void {
  p.beginShape()
  for (let j = 0; j < 10; j++) {
    const a = -Math.PI / 2 + (j * Math.PI) / 5
    const rr = j % 2 ? r * 0.44 : r
    p.vertex((cx + Math.cos(a) * rr) * k, (cy + Math.sin(a) * rr) * k)
  }
  p.endShape(p.CLOSE)
}

/** Velvet: a panel with soft vertical folds, darker in the troughs. The folds' phase can drift so it sways. */
function velvet(p: p5, k: number, x0: number, y0: number, x1: number, y1: number, lit: number, folds: number, sway = 0): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  if (y1 - y0 < 0.01) return
  ctx.save()
  ctx.fillStyle = mixHex(M.velvetDeep, M.velvet, 0.35 + 0.65 * lit)
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  const w = (x1 - x0) / folds
  const g = ctx.createLinearGradient(x0 * k, 0, x1 * k, 0)
  for (let i = 0; i <= folds; i++) {
    const u = i / folds
    const o = Math.min(1, Math.max(0, u + sway * Math.sin(i * 1.7) * 0.01))
    g.addColorStop(o, rgba(M.velvetDeep, 0.75))
    if (i < folds) {
      g.addColorStop(Math.min(1, (i + 0.5) / folds), rgba(M.velvet, 0.25 * lit))
    }
  }
  ctx.fillStyle = g
  ctx.fillRect(x0 * k, y0 * k, w * folds * k, (y1 - y0) * k)
  ctx.restore()
}

function drawHouse(p: p5, s: TheatreState, c: Ctx): void {
  // The stage draws rectangles from their centres; everything here is laid out by its corners.
  p.rectMode(p.CORNER)
  const { k, ink, weight } = c
  const t = c.t + s.begin
  const f = frame(p, k)
  const bg = THEATRE_INK.bg
  const house = Math.max(0, Math.min(1.2, houseAt(t)))
  const stage = stageAt(t)

  /* ---- outside: the pavement and the street, the marquee, the blade, the stage door */
  if (f.x0 < WALL + 0.5) {
    // The pavement, its kerb, the street.
    p.noStroke()
    p.fill(mixHex(bg, ink, 0.1))
    rrect(p, k, Math.min(f.x0, -4) - 1, FLOOR, WALL, FLOOR + 0.22)
    p.fill(mixHex(bg, ink, 0.05))
    rrect(p, k, Math.min(f.x0, -4) - 1, FLOOR + 0.22, WALL, 3.2)
    outline(p, ink, weight * 0.8)
    p.line((Math.min(f.x0, -4) - 1) * k, FLOOR * k, WALL * k, FLOOR * k)
    p.stroke(alpha(p, ink, 0.3))
    p.strokeWeight(weight * 0.5)
    p.line((Math.min(f.x0, -4) - 1) * k, (FLOOR + 0.22) * k, WALL * k, (FLOOR + 0.22) * k)
    drawMarquee(p, s, c, t)
  }

  /* ---- inside: the back wall, the fly loft, the stage behind the arch */
  const wallCol = mixHex(bg, M.velvetDeep, 0.3 + 0.25 * Math.min(1, house))
  p.noStroke()
  p.fill(wallCol)
  rrect(p, k, WALL_IN, ROOF, RIGHT, FLOOR)
  // The loft over the arch is darker; the stage behind the arch warms when its lights come up.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  {
    const g = ctx.createLinearGradient(0, ROOF * k, 0, ARCH_TOP * k)
    g.addColorStop(0, rgba(bg, 0.75))
    g.addColorStop(1, rgba(bg, 0.25))
    ctx.fillStyle = g
    ctx.fillRect(WALL_IN * k, ROOF * k, (RIGHT - WALL_IN) * k, (ARCH_TOP - ROOF) * k)
  }
  // Behind the arch: the stage's back wall, dark velvet, and her window flown in against it.
  p.fill(mixHex(bg, M.velvetDeep, 0.55))
  rrect(p, k, ARCH0, ARCH_TOP, ARCH1, FLOOR)
  if (stage > 0.01) {
    glow(p, k, MID, -1.9, 3.6, M.bulb, 0.22 * Math.min(1, stage), 1.25, 0.85)
  }
  drawWindow(p, k, ink, weight, stage)

  // The spot's pool on the stage floor (under the curtain as it rises), and on the curtain once it is in behind them.
  const spot = spotAt(t)
  if (spot > 0.01) {
    const sx = spotX(t)
    glow(p, k, sx, FLOOR - 0.02, 0.95, M.spot, 0.5 * Math.min(1.2, spot), 1, 0.28)
    glow(p, k, sx, -0.35, 0.8, M.spot, 0.16 * Math.min(1.2, spot), 0.8, 1.1)
  }

  /* ---- the fly loft: the grid, the blocks, the lines; the curtain, once it is behind them */
  drawLoft(p, k, ink, weight, t)
  if (t >= BEHIND) drawCurtain(p, k, ink, weight, t, curtainLitAt(t))

  /* ---- the wing: the lift, the gallery, the arbor */
  drawWing(p, c, t)

  /* ---- the stage floor, the stage's front face, the floor under the wings */
  // The wing floor and the stage floor are one line; under the wings the floor is cut (a section).
  p.noStroke()
  p.fill(mixHex(M.velvetDeep, bg, 0.45))
  rrect(p, k, WALL_IN, FLOOR, ARCH0 - FRAME_W - 0.2, 3.0)
  rrect(p, k, ARCH1 + FRAME_W + 0.2, FLOOR, RIGHT + 0.3, 3.0)
  // The stage's front face: boards, a gold nosing, the footlight hoods.
  const lip0 = ARCH0 - FRAME_W - 0.2
  const lip1 = ARCH1 + FRAME_W + 0.2
  solid(p, ink, weight * 0.8, mixHex(bg, M.boards, 0.55 + 0.35 * Math.min(1, Math.max(house, stage * 0.6))))
  rrect(p, k, lip0, FLOOR, lip1, APRON)
  p.noStroke()
  p.fill(M.gold)
  rrect(p, k, lip0, FLOOR, lip1, FLOOR + 0.05)
  // The house floor, dark, under the rows.
  p.fill(mixHex(bg, M.velvetDeep, 0.2))
  rrect(p, k, lip0, APRON, lip1, 3.0)
  outline(p, ink, weight)
  p.line(WALL_IN * k, FLOOR * k, lip0 * k, FLOOR * k)
  p.line(lip1 * k, FLOOR * k, RIGHT * k, FLOOR * k)
  drawFoot(p, k, ink, weight, t, stage)
  // A light on the stage's boards where the spot and the stage lights fall.
  if (stage > 0.01) glow(p, k, MID, FLOOR, 3.4, M.bulb, 0.12 * Math.min(1, stage), 1, 0.12)

  /* ---- the building's shell, in section: the left wall with its door, the roof, the right wall */
  const cut = mixHex(M.velvetDeep, bg, 0.3)
  solid(p, ink, weight, cut)
  poly(p, k, [
    [WALL, ROOF - 0.3], [RIGHT + 0.3, ROOF - 0.3], [RIGHT + 0.3, 3.0], [RIGHT, 3.0], [RIGHT, ROOF], [WALL_IN, ROOF], [WALL_IN, DOOR_TOP], [WALL, DOOR_TOP],
  ])
  // Below the door, the wall's footing.
  p.noStroke()
  p.fill(cut)
  rrect(p, k, WALL, FLOOR, WALL_IN, 3.0)
  outline(p, ink, weight)
  p.line(WALL * k, FLOOR * k, WALL * k, 3.0 * k)
  drawDoor(p, k, ink, weight, t)
}

/** The footlights: low hoods on the lip, up with the stage lights, and flaring under her where she lands and leaps. */
function drawFoot(p: p5, k: number, ink: string, weight: number, t: number, stage: number): void {
  const bg = THEATRE_INK.bg
  const base = Math.min(1, Math.max(0, stage))
  const dim = mixHex(bg, M.gold, 0.4)
  for (const x of FOOT_X) {
    let fl = 0
    for (const f of FOOT_AT) fl = Math.max(fl, knock(t - f.t, 0.26) * Math.exp(-(((x - f.x) / 0.75) ** 2)))
    if (base + fl > 0.01) glow(p, k, x, FLOOR - 0.05, 0.4 + 0.22 * fl, M.bulb, 0.12 * base + 0.3 * fl, 1.2, 1.3)
    solid(p, ink, weight * 0.45, mixHex(bg, M.gold, 0.55))
    p.beginShape()
    p.vertex((x - 0.13) * k, FLOOR * k)
    p.vertex((x - 0.09) * k, (FLOOR - 0.06) * k)
    p.vertex((x + 0.09) * k, (FLOOR - 0.06) * k)
    p.vertex((x + 0.13) * k, FLOOR * k)
    p.endShape(p.CLOSE)
    p.noStroke()
    p.fill(mixHex(dim, M.bulb, Math.min(1, 0.55 * base + fl)))
    p.ellipse(x * k, (FLOOR - 0.062) * k, 0.15 * k, 0.03 * k)
  }
}

/** The work lights in the wing: shaded lamps on the lift's guide and on the arbor's track, each with a trip arm out into the machine's way. */
function drawWork(p: p5, k: number, ink: string, weight: number, t: number): void {
  const bg = THEATRE_INK.bg
  // The lift's guide (the arbor's track is drawn with the arbor).
  outline(p, alpha(p, ink, 0.45).toString(), weight * 0.5)
  p.line(RAIL_LIFT * k, (GAL + 0.1) * k, RAIL_LIFT * k, FLOOR * k)
  for (const w of WORK) {
    const since = t - w.t
    const rail = w.lift ? RAIL_LIFT : RAIL_ARBOR
    // The lamp hangs just outside the machine's way, on the far side of its rail.
    const lx = rail + 0.2
    const ly = w.y - 0.26
    const fl = knock(since, 0.22)
    if (since >= 0) glow(p, k, lx, ly + 0.05, 0.8 + 0.45 * fl, M.bulb, 0.15 + 0.32 * fl, 1, 1.15)
    outline(p, alpha(p, ink, 0.7).toString(), weight * 0.45)
    p.line(rail * k, (ly - 0.06) * k, lx * k, (ly - 0.06) * k)
    // The bulb under its shade.
    p.noStroke()
    p.fill(since >= 0 ? mixHex(M.bulb, M.spot, 0.5 * fl) : mixHex(bg, M.gold, 0.3))
    p.circle(lx * k, (ly + 0.02) * k, 0.09 * k)
    solid(p, ink, weight * 0.45, mixHex(bg, M.gold, 0.5))
    p.arc(lx * k, (ly + 0.01) * k, 0.2 * k, 0.16 * k, Math.PI, Math.PI * 2, p.CHORD)
    // The trip arm: level into the machine's way; knocked up by the lift's deck, down by the arbor's foot.
    const thrown = since < 0 ? 0 : Math.min(1, since / 0.06) + 0.1 * Math.max(0, ring(since - 0.06, 3, 0.12))
    const a = w.lift ? Math.PI + 0.95 * thrown : Math.PI - 0.95 * thrown
    p.push()
    p.translate(rail * k, w.y * k)
    p.rotate(a)
    outline(p, ink, weight * 0.55)
    p.line(0, 0, 0.24 * k, 0)
    solid(p, ink, weight * 0.35, M.gold)
    p.circle(0.24 * k, 0, 0.05 * k)
    p.pop()
  }
}

/** The marquee over the pavement, the brass plate at its foot, and the blade sign above it. */
function drawMarquee(p: p5, s: TheatreState, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const bg = THEATRE_INK.bg
  const lit = t >= TREADLE ? 1 : 0
  const e = eighth(t)
  const blaze = t >= TREADLE ? 1 : 0

  // The pool of light it throws on the pavement.
  if (blaze) glow(p, k, (MQ.x0 + MQ.x1) / 2, FLOOR, 2.6, M.bulb, 0.28, 1, 0.28)
  // Its tie rods up to the wall.
  outline(p, ink, weight * 0.6)
  p.line(MQ.x0 * k, MQ.y0 * k, WALL * k, (MQ.y0 - 1.25) * k)
  p.line((MQ.x0 + 1.6) * k, MQ.y0 * k, WALL * k, (MQ.y0 - 0.85) * k)
  // The box: a gold frame, a light box in it, rows of bulbs along its top and bottom.
  solid(p, ink, weight, M.gold)
  rrect(p, k, MQ.x0, MQ.y0, MQ.x1, MQ.y1)
  p.noStroke()
  p.fill(blaze ? mixHex(M.bulb, M.spot, 0.4) : mixHex(bg, M.gold, 0.28))
  rrect(p, k, MQ.x0 + 0.12, MQ.y0 + 0.2, MQ.x1 - 0.06, MQ.y1 - 0.2)
  if (blaze) {
    // The light box is the play's card: no name, a red rose laid across it.
    p.fill(alpha(p, M.velvet, 0.9))
    const cx = (MQ.x0 + MQ.x1) / 2
    const cy = (MQ.y0 + MQ.y1) / 2
    p.circle(cx * k, cy * k, 0.2 * k)
    p.stroke(alpha(p, M.velvetDeep, 0.9))
    p.strokeWeight(weight * 0.8)
    p.line((cx - 0.9) * k, (cy + 0.05) * k, (cx - 0.1) * k, cy * k)
  }
  // Underneath, a soffit of lamps.
  p.noStroke()
  p.fill(mixHex(bg, M.gold, 0.4))
  rrect(p, k, MQ.x0 + 0.05, MQ.y1, MQ.x1, MQ.y1 + 0.07)
  const n = 18
  for (const [row, y] of [[0, MQ.y0 + 0.1], [1, MQ.y1 - 0.1]] as const) {
    for (let i = 0; i < n; i++) {
      const x = MQ.x0 + 0.12 + ((MQ.x1 - MQ.x0 - 0.2) * (i + 0.5)) / n
      // Three-phase chase, running toward the wall along the top, back along the bottom.
      const j = row === 0 ? i : n - 1 - i
      bulb(p, k, x, y, 0.045, lit && (j - e) % 3 !== 0 ? 1 : 0)
    }
  }
  // Its cresting.
  solid(p, ink, weight * 0.7, M.gold)
  rrect(p, k, MQ.x0 + 0.1, MQ.y0 - 0.1, MQ.x1, MQ.y0)

  // The brass plate in the pavement at the marquee's foot, and its rod up the post to the marquee's switch.
  const px = s.treadle
  const dip = t >= TREADLE ? 0.03 * Math.exp(-(t - TREADLE) / 0.2) : 0
  outline(p, ink, weight * 0.6)
  p.stroke(alpha(p, M.gold, 0.9))
  p.line((px + 0.28) * k, (FLOOR - 0.02) * k, (px + 0.28) * k, MQ.y1 * k)
  solid(p, ink, weight * 0.7, M.gold)
  rrect(p, k, px - 0.2, FLOOR - 0.035 + dip, px + 0.34, FLOOR + 0.01 + dip)

  // The blade: a tall sign on the wall, gold-framed, its border of bulbs chasing up, three great lamps, the star.
  solid(p, ink, weight, M.gold)
  rrect(p, k, BL.x0, BL.y0, BL.x1, BL.y1, 0.06)
  p.noStroke()
  p.fill(mixHex(bg, M.velvetDeep, blaze ? 0.9 : 0.5))
  rrect(p, k, BL.x0 + 0.1, BL.y0 + 0.1, BL.x1 - 0.1, BL.y1 - 0.1, 0.04)
  const side = 12
  for (let i = 0; i < side; i++) {
    const y = BL.y1 - 0.18 - ((BL.y1 - BL.y0 - 0.36) * i) / (side - 1)
    const chase = lit && (i - e) % 3 !== 0 ? 1 : 0
    bulb(p, k, BL.x0 + 0.1, y, 0.038, chase)
    bulb(p, k, BL.x1 - 0.1, y, 0.038, chase)
  }
  for (let j = 0; j < 3; j++) {
    const y = BL.y0 + 0.62 + j * 0.7
    const since = t - BLADE[j]
    const flash = knock(since, 0.15)
    if (since >= 0) glow(p, k, (BL.x0 + BL.x1) / 2, y, 0.5 + 0.2 * flash, M.bulb, 0.35 + 0.3 * flash)
    bulb(p, k, (BL.x0 + BL.x1) / 2, y, 0.17, since >= 0 ? 1 : 0)
  }
  // The star on top.
  const sOn = t >= STAR ? 1 : 0
  if (sOn) glow(p, k, STAR_AT[0], STAR_AT[1], 0.9 + 0.3 * knock(t - STAR, 0.2), M.bulb, 0.3 + 0.3 * knock(t - STAR, 0.2))
  solid(p, ink, weight * 0.8, sOn ? M.bulb : mixHex(bg, M.gold, 0.45))
  star(p, k, STAR_AT[0], STAR_AT[1], 0.32)
  outline(p, ink, weight * 0.7)
  p.line(STAR_AT[0] * k, (STAR_AT[1] + 0.2) * k, STAR_AT[0] * k, BL.y0 * k)
}

/** The stage door in the wall: shut (its edge in the wall), knocked open to swing in behind him, easing shut again. */
function drawDoor(p: p5, k: number, ink: string, weight: number, t: number): void {
  const bg = THEATRE_INK.bg
  let open = 0
  if (t > KNOCK) {
    const d = t - KNOCK
    open = d < 0.22 ? Math.sin((Math.PI / 2) * (d / 0.22)) : 1
    const shut = HOIST + 0.15
    if (t > shut) open = Math.max(0, 1 - soft((t - shut) / 0.9)) + 0.03 * Math.max(0, ring(t - shut - 0.9, 2, 0.15))
    open = Math.max(0, Math.min(1.05, open))
  }
  // The lamp over it, in its cage.
  glow(p, k, WALL - 0.12, DOOR_TOP - 0.25, 0.7, M.bulb, 0.3)
  solid(p, ink, weight * 0.6, M.bulb)
  p.circle((WALL - 0.12) * k, (DOOR_TOP - 0.25) * k, 0.1 * k)
  outline(p, ink, weight * 0.6)
  p.line((WALL - 0.12) * k, (DOOR_TOP - 0.3) * k, WALL * k, (DOOR_TOP - 0.3) * k)
  // The opening, dark behind; the leaf: its edge while shut, its face as it swings in.
  p.noStroke()
  p.fill(mixHex(bg, M.velvetDeep, 0.4))
  rrect(p, k, WALL, DOOR_TOP, WALL_IN, FLOOR)
  const leafW = 0.72 * Math.sin((Math.PI / 2) * Math.min(1, open))
  if (leafW > 0.02) {
    solid(p, ink, weight * 0.8, mixHex(M.boards, bg, 0.2))
    rrect(p, k, WALL_IN, DOOR_TOP + 0.03, WALL_IN + leafW, FLOOR)
    outline(p, alpha(p, ink, 0.5).toString(), weight * 0.5)
    rrect(p, k, WALL_IN + leafW * 0.18, DOOR_TOP + 0.2, WALL_IN + leafW * 0.82, -0.6)
  }
  const edgeW = 0.1 * (1 - Math.min(1, open))
  if (edgeW > 0.01) {
    solid(p, ink, weight * 0.8, M.boards)
    rrect(p, k, (WALL + WALL_IN) / 2 - edgeW / 2, DOOR_TOP, (WALL + WALL_IN) / 2 + edgeW / 2, FLOOR)
  }
}

/** Her window, flown in against the back wall: the set of her show. Dark until the stage lights come up on it. */
function drawWindow(p: p5, k: number, ink: string, weight: number, stage: number): void {
  const bg = THEATRE_INK.bg
  const x0 = MID - 0.85
  const x1 = MID + 0.85
  const y0 = -3.05
  const y1 = -1.05
  // Its lines up into the loft.
  outline(p, alpha(p, ink, 0.35).toString(), weight * 0.5)
  p.line((x0 + 0.2) * k, y0 * k, (x0 + 0.2) * k, (ARCH_TOP - 0.2) * k)
  p.line((x1 - 0.2) * k, y0 * k, (x1 - 0.2) * k, (ARCH_TOP - 0.2) * k)
  const lit = Math.min(1, stage)
  if (lit > 0.01) glow(p, k, MID, (y0 + y1) / 2, 1.7, M.bulb, 0.3 * lit)
  solid(p, ink, weight * 0.9, mixHex(bg, M.boards, 0.6 + 0.4 * lit))
  rrect(p, k, x0, y0, x1, y1)
  p.noStroke()
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(0, (y0 + 0.12) * k, 0, (y1 - 0.12) * k)
  g.addColorStop(0, mixHex(mixHex(bg, M.velvetDeep, 0.6), M.bulb, lit * 0.55))
  g.addColorStop(1, mixHex(mixHex(bg, M.velvetDeep, 0.6), M.spot, lit * 0.9))
  ctx.fillStyle = g
  ctx.fillRect((x0 + 0.12) * k, (y0 + 0.12) * k, (x1 - x0 - 0.24) * k, (y1 - y0 - 0.24) * k)
  outline(p, mixHex(bg, M.boards, 0.6 + 0.4 * lit), weight * 1.1)
  p.line(MID * k, (y0 + 0.12) * k, MID * k, (y1 - 0.12) * k)
  p.line((x0 + 0.12) * k, ((y0 + y1) / 2) * k, (x1 - 0.12) * k, ((y0 + y1) / 2) * k)
  // Its sill.
  solid(p, ink, weight * 0.8, mixHex(bg, M.gold, 0.4 + 0.5 * lit))
  rrect(p, k, x0 - 0.1, y1, x1 + 0.1, y1 + 0.08)
  // Tied-back drapes either side.
  p.noStroke()
  p.fill(mixHex(M.velvetDeep, M.velvet, 0.3 + 0.6 * lit))
  for (const sd of [-1, 1]) {
    const xa = sd < 0 ? x0 + 0.02 : x1 - 0.02
    p.beginShape()
    p.vertex(xa * k, (y0 + 0.02) * k)
    p.vertex((xa - sd * 0.36) * k, (y0 + 0.02) * k)
    p.quadraticVertex((xa - sd * 0.04) * k, ((y0 + y1) / 2) * k, (xa - sd * 0.3) * k, (y1 - 0.02) * k)
    p.vertex(xa * k, (y1 - 0.02) * k)
    p.endShape(p.CLOSE)
  }
}

/** The fly loft: the grid, the head block and the loft blocks, the lines to the arbor and the batten, the flown curtain. */
function drawLoft(p: p5, k: number, ink: string, weight: number, t: number): void {
  const bg = THEATRE_INK.bg
  const plate = plateAt(t)
  const hem = hemAt(t)
  const top = hem - CURTAIN_H
  // The grid: a steel beam across the top of the tower.
  solid(p, ink, weight * 0.7, mixHex(bg, M.boards, 0.5))
  rrect(p, k, WALL_IN, -9.12, RIGHT, -8.95)
  // The lines: from the arbor's top up to the head block, over it, along under the grid, over each loft block, down to the batten.
  const line = alpha(p, ink, 0.55)
  p.stroke(line)
  p.strokeWeight(weight * 0.55)
  p.noFill()
  const arborTop = plate - 0.1
  p.line(ARBOR_X * k, arborTop * k, ARBOR_X * k, HEAD[1] * k)
  p.arc(HEAD[0] * k, HEAD[1] * k, HEAD_R * 2 * k, HEAD_R * 2 * k, Math.PI, Math.PI * 1.5)
  p.line(HEAD[0] * k, LINE_Y * k, (LOFT[LOFT.length - 1] + 0.02) * k, LINE_Y * k)
  for (const lx of LOFT) {
    p.line((lx + LOFT_R) * k, (LINE_Y + LOFT_R) * k, (lx + LOFT_R) * k, top * k)
  }
  // The blocks.
  solid(p, ink, weight * 0.7, mixHex(bg, M.gold, 0.55))
  p.circle(HEAD[0] * k, HEAD[1] * k, HEAD_R * 2 * k)
  for (const lx of LOFT) p.circle(lx * k, (LINE_Y + LOFT_R) * k, LOFT_R * 2 * k)
  p.noStroke()
  p.fill(mixHex(bg, M.gold, 0.25))
  p.circle(HEAD[0] * k, HEAD[1] * k, HEAD_R * 0.7 * k)
  // Hangers from the grid down to the head block's frame.
  outline(p, alpha(p, ink, 0.5).toString(), weight * 0.5)
  p.line(HEAD[0] * k, (HEAD[1] - HEAD_R) * k, HEAD[0] * k, -8.95 * k)
}

/** The main curtain, from its batten to its hem: velvet with a gold fringe; `lit` is how much light is on it. */
function drawCurtain(p: p5, k: number, ink: string, weight: number, t: number, lit: number): void {
  const hem = hemAt(t)
  const top = hem - CURTAIN_H
  const x0 = ARCH0 - 0.12
  const x1 = ARCH1 + 0.12
  // A little sway as it travels.
  const speed = Math.abs(hemAt(t + 0.02) - hemAt(t - 0.02)) / 0.04
  velvet(p, k, x0, top, x1, hem, lit, 14, speed)
  // The hem's gold fringe, and a band of gold above it.
  p.noStroke()
  p.fill(alpha(p, M.gold, 0.55 + 0.4 * lit))
  rrect(p, k, x0, hem - 0.24, x1, hem - 0.2)
  p.fill(mixHex(M.velvetDeep, M.gold, 0.5 + 0.4 * lit))
  rrect(p, k, x0, hem - 0.07, x1, hem)
  // The batten.
  solid(p, ink, weight * 0.6, mixHex(THEATRE_INK.bg, M.boards, 0.6))
  rrect(p, k, x0 - 0.05, top - 0.06, x1 + 0.05, top + 0.02)
  // The spot on the velvet, where it is still in the beam.
  const spot = spotAt(t)
  if (spot > 0.01) {
    const sx = spotX(t)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    ctx.beginPath()
    ctx.rect(x0 * k, top * k, (x1 - x0) * k, (hem - top) * k)
    ctx.clip()
    glow(p, k, sx, -0.7, 1.15, M.spot, 0.42 * Math.min(1.2, spot), 0.85, 1.1)
    ctx.restore()
  }
}

/** The wing: the lift and its sandbag, the house-light switch, the gallery, the arbor on its track, the work light. */
function drawWing(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const bg = THEATRE_INK.bg
  // A work light on the wing's wall; the lamps the machines switch on as they pass.
  glow(p, k, 10.3, -2.6, 2.6, M.bulb, 0.13)
  drawWork(p, k, ink, weight, t)
  // The lift's block, high on its hanger.
  outline(p, alpha(p, ink, 0.5).toString(), weight * 0.5)
  p.line(HBLOCK[0] * k, (HBLOCK[1] - HBLOCK_R) * k, HBLOCK[0] * k, -8.95 * k)
  const deck = deckY(t)
  const bag = bagY(t)
  // Its rope: down one side to the lift's bridle, the other to the sandbag.
  p.stroke(alpha(p, ink, 0.6))
  p.strokeWeight(weight * 0.55)
  const ringY = deck - 0.55
  p.line(HOIST_X * k, HBLOCK[1] * k, HOIST_X * k, ringY * k)
  p.line(BAG_X * k, HBLOCK[1] * k, BAG_X * k, (bag - BAG_H / 2) * k)
  p.noFill()
  p.arc(HBLOCK[0] * k, HBLOCK[1] * k, HBLOCK_R * 2 * k, HBLOCK_R * 2 * k, Math.PI, Math.PI * 2)
  solid(p, ink, weight * 0.7, mixHex(bg, M.gold, 0.55))
  p.circle(HBLOCK[0] * k, HBLOCK[1] * k, HBLOCK_R * 2 * k)
  p.noStroke()
  p.fill(mixHex(bg, M.gold, 0.25))
  p.circle(HBLOCK[0] * k, HBLOCK[1] * k, HBLOCK_R * 0.6 * k)
  // The sandbag: a canvas sack on its rope, slumping when it lands.
  const slump = t >= ARRIVE ? Math.min(1, (t - ARRIVE) / 0.08) * (0.12 + 0.05 * Math.max(0, ring(t - ARRIVE, 2.5, 0.15))) : 0
  const bh = BAG_H * (1 - slump)
  const bw = 0.34 * (1 + slump * 0.8)
  const bb = bag + BAG_H / 2
  solid(p, ink, weight * 0.8, mixHex(M.boards, M.bulb, 0.25))
  p.beginShape()
  p.vertex((BAG_X - 0.05) * k, (bb - bh) * k)
  p.vertex((BAG_X + 0.05) * k, (bb - bh) * k)
  p.quadraticVertex((BAG_X + bw / 2 + 0.03) * k, (bb - bh * 0.35) * k, (BAG_X + bw / 2) * k, bb * k)
  p.vertex((BAG_X - bw / 2) * k, bb * k)
  p.quadraticVertex((BAG_X - bw / 2 - 0.03) * k, (bb - bh * 0.35) * k, (BAG_X - 0.05) * k, (bb - bh) * k)
  p.endShape(p.CLOSE)
  // The lift: a bridle from its ring to the deck's corners, the deck.
  outline(p, ink, weight * 0.6)
  p.line(HOIST_X * k, ringY * k, (HOIST_X - HOIST_HW + 0.03) * k, deck * k)
  p.line(HOIST_X * k, ringY * k, (HOIST_X + HOIST_HW - 0.03) * k, deck * k)
  solid(p, ink, weight * 0.7, M.gold)
  p.circle(HOIST_X * k, ringY * k, 0.07 * k)
  solid(p, ink, weight * 0.9, M.boards)
  rrect(p, k, HOIST_X - HOIST_HW, deck, HOIST_X + HOIST_HW, deck + 0.1)
  // Its catch at the floor: a hook on the deck's eye, flicked open as he lands.
  const hook = t >= HOIST ? Math.min(1, (t - HOIST) / 0.08) : 0
  p.push()
  p.translate((HOIST_X - 0.12) * k, (FLOOR - 0.01) * k)
  p.rotate(-hook * 1.1)
  outline(p, M.gold, weight * 0.9)
  p.line(0, 0, 0, -0.14 * k)
  p.line(0, -0.14 * k, 0.07 * k, -0.14 * k)
  p.pop()
  // The house-light switch at the top of the shaft: its handle hangs in the lift's way and is knocked up as it arrives.
  const sw: Pt = [GAL0 + 0.18, GAL - 0.52]
  const thrown = t >= ARRIVE ? Math.min(1, (t - ARRIVE) / 0.07) : 0
  solid(p, ink, weight * 0.7, mixHex(bg, M.boards, 0.7))
  rrect(p, k, sw[0] - 0.08, sw[1] - 0.2, sw[0] + 0.14, sw[1] + 0.06)
  p.push()
  p.translate(sw[0] * k, sw[1] * k)
  p.rotate(2.3 - thrown * 2.0 - 0.06 * Math.max(0, ring(t - ARRIVE - 0.07, 3, 0.12)))
  outline(p, ink, weight * 0.9)
  p.line(0, 0, 0.32 * k, 0)
  solid(p, ink, weight * 0.6, M.gold)
  p.circle(0.32 * k, 0, 0.07 * k)
  p.pop()
  if (thrown > 0 && t < ARRIVE + 0.25) glow(p, k, sw[0], sw[1], 0.25, M.bulb, 0.6 * (1 - (t - ARRIVE) / 0.25))
  // The gallery: a deck on brackets from the wall; its rail is in front of him (drawn over).
  solid(p, ink, weight * 0.9, M.boards)
  rrect(p, k, GAL0, GAL, GAL1, GAL + 0.1)
  outline(p, alpha(p, ink, 0.6).toString(), weight * 0.6)
  for (const bx of [GAL0 + 0.35, GAL1 - 0.35]) p.line(bx * k, (GAL + 0.1) * k, (bx - 0.35) * k, (GAL + 0.55) * k)
  // The arbor's track, its stop at the floor.
  solid(p, ink, weight * 0.6, mixHex(bg, M.boards, 0.55))
  rrect(p, k, ARBOR_X + ARBOR_HW + 0.02, GAL - 0.3, ARBOR_X + ARBOR_HW + 0.09, FLOOR)
  solid(p, ink, weight * 0.7, mixHex(bg, M.velvetDeep, 0.8))
  rrect(p, k, ARBOR_X - ARBOR_HW, FLOOR - 0.06, ARBOR_X + ARBOR_HW, FLOOR)
  // The arbor: its top plate (with a stop at its far end), rods, the stacked weights.
  const plate = plateAt(t)
  const bot = plate + ARBOR_H
  outline(p, ink, weight * 0.8)
  p.line((ARBOR_X - ARBOR_HW + 0.03) * k, plate * k, (ARBOR_X - ARBOR_HW + 0.03) * k, bot * k)
  p.line((ARBOR_X + ARBOR_HW - 0.03) * k, plate * k, (ARBOR_X + ARBOR_HW - 0.03) * k, bot * k)
  const bricks = 5
  for (let j = 0; j < bricks; j++) {
    const y = bot - 0.06 - (j + 1) * 0.12
    solid(p, ink, weight * 0.6, mixHex(bg, M.boards, 0.75))
    rrect(p, k, ARBOR_X - ARBOR_HW + 0.05, y, ARBOR_X + ARBOR_HW - 0.05, y + 0.11)
  }
  solid(p, ink, weight * 0.9, M.gold)
  rrect(p, k, ARBOR_X - ARBOR_HW, plate, ARBOR_X + ARBOR_HW, plate + 0.07)
  rrect(p, k, ARBOR_X + ARBOR_HW - 0.05, plate - 0.09, ARBOR_X + ARBOR_HW, plate)
  rrect(p, k, ARBOR_X - ARBOR_HW, bot - 0.05, ARBOR_X + ARBOR_HW, bot)
}

/** In front of the balls: the curtain while she is behind it, the proscenium, the gallery's rail, the rows, the rose, the beam. */
function overHouse(p: p5, s: TheatreState, c: Ctx): void {
  p.rectMode(p.CORNER)
  const { k, ink, weight } = c
  const t = c.t + s.begin
  const bg = THEATRE_INK.bg
  const house = Math.max(0, Math.min(1.2, houseAt(t)))
  const stage = stageAt(t)
  const spot = spotAt(t)
  const curtainLit = curtainLitAt(t)

  // The curtain, while she is behind it.
  if (t < BEHIND) drawCurtain(p, k, ink, weight, t, curtainLit)

  // The gallery's rail, in front of him as he crosses it.
  outline(p, ink, weight * 0.7)
  p.line(GAL0 * k, (GAL - 0.5) * k, (GAL1 - 0.05) * k, (GAL - 0.5) * k)
  for (let x = GAL0 + 0.2; x < GAL1; x += 0.55) p.line(x * k, (GAL - 0.5) * k, x * k, GAL * k)

  // The proscenium's gold frame, its valance, the house's sconces on its pillars.
  const gold = mixHex(mixHex(bg, M.gold, 0.55), M.gold, Math.min(1, 0.3 + 0.5 * house + 0.5 * stage))
  solid(p, ink, weight, gold)
  poly(p, k, [
    [ARCH0 - FRAME_W, FLOOR], [ARCH0 - FRAME_W, ARCH_TOP - FRAME_W], [ARCH1 + FRAME_W, ARCH_TOP - FRAME_W], [ARCH1 + FRAME_W, FLOOR],
    [ARCH1, FLOOR], [ARCH1, ARCH_TOP], [ARCH0, ARCH_TOP], [ARCH0, FLOOR],
  ])
  outline(p, alpha(p, ink, 0.4).toString(), weight * 0.5)
  rrect(p, k, ARCH0 - FRAME_W + 0.08, ARCH_TOP - FRAME_W + 0.08, ARCH1 + FRAME_W - 0.08, FLOOR - 0.02)
  // A cartouche at the top of the arch.
  solid(p, ink, weight * 0.8, gold)
  p.ellipse(MID * k, (ARCH_TOP - FRAME_W / 2) * k, 0.62 * k, 0.5 * k)
  p.noStroke()
  p.fill(mixHex(M.velvetDeep, M.velvet, curtainLit))
  p.ellipse(MID * k, (ARCH_TOP - FRAME_W / 2) * k, 0.36 * k, 0.28 * k)
  // The valance: a swagged pelmet across the top of the arch.
  solid(p, ink, weight * 0.7, mixHex(M.velvetDeep, M.velvet, curtainLit))
  p.beginShape()
  p.vertex(ARCH0 * k, ARCH_TOP * k)
  p.vertex(ARCH1 * k, ARCH_TOP * k)
  const swags = 5
  const sw = (ARCH1 - ARCH0) / swags
  for (let i = swags; i > 0; i--) {
    const xa = ARCH0 + i * sw
    const xb = xa - sw
    p.vertex(xa * k, (ARCH_TOP + 0.34) * k)
    p.quadraticVertex(((xa + xb) / 2) * k, (ARCH_TOP + 0.62) * k, xb * k, (ARCH_TOP + 0.34) * k)
  }
  p.endShape(p.CLOSE)
  p.noStroke()
  p.fill(alpha(p, M.gold, 0.8))
  for (let i = 0; i <= swags; i++) p.circle((ARCH0 + i * sw) * k, (ARCH_TOP + 0.36) * k, 0.1 * k)
  for (const x of [ARCH0 - FRAME_W / 2, ARCH1 + FRAME_W / 2]) sconce(p, k, ink, weight, x, -2.35, house)

  // The spot's lamp on its pipe in front of the arch, turning to follow her; its beam.
  if (spot > 0.01) {
    const sx = spotX(t)
    const a = Math.atan2(FLOOR - LAMP[1], sx - LAMP[0])
    const ex = LAMP[0] + Math.cos(a) * 0.2
    const ey = LAMP[1] + Math.sin(a) * 0.2
    beam(p, k, ex, ey, sx, FLOOR - 0.05, 0.12, 0.95, M.spot, 0.12 * Math.min(1.2, spot))
  }
  drawLamp(p, k, ink, weight, t)

  // The rows of the house, from the front row back, and the rose.
  drawRows(p, s, c, t, house, stage + spot * 0.5)
  drawRose(p, k, ink, weight, t)
}

function sconce(p: p5, k: number, ink: string, weight: number, x: number, y: number, on: number): void {
  const lit = Math.min(1, on)
  if (lit > 0.05) glow(p, k, x, y - 0.1, 1.1, M.bulb, 0.35 * lit)
  solid(p, ink, weight * 0.6, M.gold)
  p.beginShape()
  p.vertex((x - 0.13) * k, (y - 0.22) * k)
  p.vertex((x + 0.13) * k, (y - 0.22) * k)
  p.vertex((x + 0.07) * k, (y - 0.02) * k)
  p.vertex((x - 0.07) * k, (y - 0.02) * k)
  p.endShape(p.CLOSE)
  p.noStroke()
  p.fill(lit > 0.05 ? mixHex(mixHex(M.gold, THEATRE_INK.bg, 0.5), M.bulb, lit) : mixHex(M.gold, THEATRE_INK.bg, 0.5))
  p.ellipse(x * k, (y - 0.3) * k, 0.14 * k, 0.16 * k)
}

function drawLamp(p: p5, k: number, ink: string, weight: number, t: number): void {
  const bg = THEATRE_INK.bg
  const spot = spotAt(t)
  const sx = spot > 0.01 ? spotX(t) : MID
  const a = Math.atan2(FLOOR - LAMP[1], sx - LAMP[0])
  // The pipe it hangs from, across the front of the arch; its yoke; the can, turned on the target.
  outline(p, ink, weight * 0.8)
  p.line((ARCH0 + 1.2) * k, (LAMP[1] - 0.26) * k, (ARCH1 - 1.2) * k, (LAMP[1] - 0.26) * k)
  p.line(LAMP[0] * k, (LAMP[1] - 0.26) * k, LAMP[0] * k, (LAMP[1] - 0.08) * k)
  p.push()
  p.translate(LAMP[0] * k, LAMP[1] * k)
  p.rotate(a)
  solid(p, ink, weight * 0.8, mixHex(bg, M.boards, 0.5))
  rrect(p, k, -0.22, -0.1, 0.18, 0.1, 0.03)
  p.noStroke()
  p.fill(spot > 0.01 ? M.spot : mixHex(bg, M.gold, 0.4))
  rrect(p, k, 0.16, -0.08, 0.2, 0.08)
  p.pop()
}

/** The rows: seat backs with their backs to us, low while the house sits, up on their hits with their paddles clapping. */
function drawRows(p: p5, s: TheatreState, c: Ctx, t: number, house: number, stage: number): void {
  const { k, ink, weight } = c
  const bg = THEATRE_INK.bg
  const warm = Math.min(1, house)
  const fill = mixHex(mixHex(bg, M.seat, 0.3), M.seat, warm)
  const rim = mixHex(mixHex(bg, M.gold, 0.35), M.gold, Math.min(1, warm + 0.4 * Math.min(1, stage)))
  const paddle = mixHex(mixHex(bg, M.bulb, 0.5), M.bulb, warm)
  const last = lastOf(CLAPS, t)
  let next = Infinity
  for (const cl of CLAPS) if (cl > t) {
    next = cl
    break
  }
  // How shut the paddles are: closing just before a clap, meeting on it, opening after.
  const shut = Math.max(last.ago < Infinity ? Math.exp(-last.ago / 0.09) : 0, next < Infinity ? soft(1 - (next - t) / 0.1) : 0)
  for (let r = 0; r < ROW_Y.length; r++) {
    const base = ROW_Y[r]
    // The glow of the stage on the backs of the front rows.
    for (const st of s.seats) {
      if (st.r !== r) continue
      const up = risen(t - st.up)
      const h = LOW + (HIGH - LOW) * up
      const x0 = st.x - SEAT_W / 2
      const top = base - h
      p.stroke(alpha(p, ink, 0.28 + 0.2 * warm))
      p.strokeWeight(weight * 0.5)
      p.fill(fill)
      p.rect(x0 * k, top * k, SEAT_W * k, (h + 0.2) * k, 0.12 * k, 0.12 * k, 0, 0)
      p.stroke(rim)
      p.strokeWeight(weight * 0.7)
      p.noFill()
      p.arc(st.x * k, (top + 0.12) * k, (SEAT_W - 0.04) * k, 0.22 * k, Math.PI * 1.1, Math.PI * 1.9)
      // The paddles, once it is up: two on stalks from its shoulders, clapping over it.
      if (up > 0.2 && !st.his) {
        const open = 0.6 * (1 - shut)
        const u = Math.min(1, up)
        const len = 0.24 * u
        for (const sd of [-1, 1]) {
          const bx = st.x + sd * 0.1
          const by = top + 0.02
          const ang = -Math.PI / 2 + sd * (0.06 + open)
          const tx = bx + Math.cos(ang) * len - sd * 0.05 * (1 - open / 0.6)
          const ty = by + Math.sin(ang) * len
          p.stroke(alpha(p, ink, 0.45))
          p.strokeWeight(weight * 0.45)
          p.line(bx * k, by * k, tx * k, ty * k)
          p.noStroke()
          p.fill(paddle)
          p.push()
          p.translate(tx * k, ty * k)
          p.rotate(ang + Math.PI / 2 - sd * 0.25)
          p.ellipse(0, 0, 0.1 * k, 0.13 * k)
          p.pop()
        }
      }
    }
  }
}

function drawRose(p: p5, k: number, ink: string, weight: number, t: number): void {
  const r = roseAt(t)
  p.push()
  p.translate(r.x * k, r.y * k)
  p.rotate(r.a)
  // The stem, a leaf, the bloom.
  p.stroke(mixHex(M.velvetDeep, M.boards, 0.4))
  p.strokeWeight(weight * 0.7)
  p.line(-0.2 * k, 0.01 * k, 0.06 * k, 0)
  p.noStroke()
  p.fill(mixHex(M.velvetDeep, M.boards, 0.5))
  p.ellipse(-0.08 * k, -0.03 * k, 0.07 * k, 0.035 * k)
  solid(p, ink, weight * 0.5, M.rose)
  p.circle(0.1 * k, 0, 0.1 * k)
  p.noStroke()
  p.fill(M.velvet)
  p.circle(0.11 * k, -0.005 * k, 0.045 * k)
  p.pop()
}
