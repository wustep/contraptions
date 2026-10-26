import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { FLOOR, R, mixHex, type Pt } from '../../../../../parts'
import { alpha, box, carried, frame, glow, hash, lastOf, part, rgba, ring, route, smooth, type Companion, type Ctx, type PartShot, type Way } from '../kit'
import { DREAM_PERIOD, dream, level, notes, snap } from '../music'
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
 * marquee lights, all its bulbs on; the blade's three great
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
  // As the house rises for her, row by row, a little hop of joy on each.
  let joy = 0
  for (const r of ROWS) {
    const u = (t - r) / 0.26
    if (u > 0 && u < 1) joy = Math.max(joy, 0.12 * Math.sin(Math.PI * u))
  }
  const stretch = 1 - 0.18 * b
  return { x, y: y - lift - joy + R * (1 - stretch), stretch, angle: Math.PI / 2 }
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
const spotAt = (t: number): number => (t < SPOT ? 0 : Math.min(1, (t - SPOT) / 0.05)) + 0.25 * ease((t - FINAL[0]) / 0.6)
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
/**
 * The spot's circle where it lands behind them, as [centre y, rx, ry]: on her, low enough that the floor cuts it under
 * her; opening to take in both of them once he is up beside her, so it is round the two of them and not over them.
 */
function spotShape(t: number): [number, number, number] {
  const both = ease((t - LAND) / 0.5)
  return [lerp(-0.2, -0.14, both), lerp(0.4, 0.6, both), lerp(0.36, 0.5, both)]
}
/** How much light is on the main curtain: the house's, and the stage's spill. */
const curtainLitAt = (t: number): number => Math.min(1, 0.25 + 0.6 * Math.min(1, Math.max(0, houseAt(t))) + 0.3 * stageAt(t))
/** The curtain is in front of her until it has flown out; once it comes in again it is behind the two of them. */
const BEHIND = CURTAIN_IN[0] - 0.5

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
    // Standing, cheering her: a small bounce landing on the house's claps, until he goes up to her.
    const cheer: Way[] = []
    let lastC = SPRING + 0.3
    for (const c of CLAPS) {
      if (c < SPRING + 0.75 || c > LEAP - 0.6 || c - lastC < 0.42) continue
      const rest: Way = { at: at(c) - 0.2, p: [SEAT_X, STAND_Y] }
      cheer.push(rest, hop(rest, [SEAT_X, STAND_Y], at(c), G * 1.6))
      lastC = c
    }
    const stand: Way = { at: at(LEAP), p: [SEAT_X, STAND_Y] }
    // Up onto the stage beside her.
    const land = hop(stand, [LAND_X, 0], at(LAND))
    // A nod with her bow, and still, into the white.
    const nod0: Way = { at: at(BOW3) - 0.08, p: [LAND_X, 0] }
    const nod1: Way = { ...hop(nod0, [LAND_X, 0], at(BOW3) + 0.14, G * 0.5) }
    const end: Way = { at: T, p: [LAND_X, 0] }
    segs.push(...route([o0, o1, lip, seat, sat, up, ...cheer, stand, land, nod0, nod1, end]))

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
    // Her show: in on her in the spot, the house cut to the front row's backs, and him whole among them along the foot
    // of the frame; her window whole over her.
    { t: SHOW[0].t1, cells: 5.0, hold: [16.3, -0.78] },
    { t: SHOW[1].t1, cells: 4.85, hold: [16.05, -0.8] },
    { t: SHOW[2].t1, cells: 4.75, hold: [16.15, -0.8] },
    // The lead-in bar: the house holds its breath; back a little, to him.
    { t: 114.9, cells: 4.9, hold: [15.8, -0.62] },
    { t: SPRING, cells: 5.6, hold: [15.9, -0.35] },
    { t: ROWS[3], cells: 7.0, hold: [16.1, -0.3] },
    { t: BOW1, cells: 6.0, hold: [16.1, -0.3] },
    // The curtain calls: close on the two of them at the stage's edge, her window whole over them.
    // One slow push in on the two of them through the calls, the curtain coming in behind them, and back a little
    // for the house's lights coming up.
    { t: BOW2 + 0.3, cells: 5.25, hold: [16.0, -0.72] },
    { t: LAND, cells: 4.85, hold: [15.82, -0.76] },
    { t: CURTAIN_IN[1], cells: 4.45, hold: [15.74, -0.84] },
    { t: BOW3, cells: 4.4, hold: [15.74, -0.86] },
    { t: WHITE, cells: 4.8, hold: [15.8, -0.8] },
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

/** A bulb: lit, a warm dot; out, a dull one. */
function bulb(p: p5, k: number, x: number, y: number, r: number, lit: number): void {
  p.noStroke()
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

/**
 * Velvet: a panel with soft vertical folds, darker in the troughs. The folds' phase can drift so it sways. `inLight`
 * draws it as it looks in the spot: the cloth a brighter red and its folds' crests catching the light.
 */
const VELVET_LIT = '#C93A48'
const VELVET_CREST = '#EE7A76'
function velvet(p: p5, k: number, x0: number, y0: number, x1: number, y1: number, lit: number, folds: number, sway = 0, inLight = false): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  if (y1 - y0 < 0.01) return
  ctx.save()
  const base = mixHex(M.velvetDeep, M.velvet, 0.35 + 0.65 * lit)
  ctx.fillStyle = inLight ? VELVET_LIT : base
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  const w = (x1 - x0) / folds
  const g = ctx.createLinearGradient(x0 * k, 0, x1 * k, 0)
  const trough = rgba(M.velvetDeep, inLight ? 0.62 : 0.75)
  const crest = inLight ? rgba(VELVET_CREST, 0.55) : rgba(M.velvet, 0.25 * lit)
  for (let i = 0; i <= folds; i++) {
    const u = i / folds
    const o = Math.min(1, Math.max(0, u + sway * Math.sin(i * 1.7) * 0.01))
    g.addColorStop(o, trough)
    if (i < folds) {
      g.addColorStop(Math.min(1, (i + 0.5) / folds), crest)
    }
  }
  ctx.fillStyle = g
  ctx.fillRect(x0 * k, y0 * k, w * folds * k, (y1 - y0) * k)
  ctx.restore()
}

/**
 * A follow spot's circle lying on a surface: `paint` draws the surface again as it looks in the light, inside the
 * circle. A follow spot's edge is hard (its iris and its lens): two passes, the outer a hair larger, so the edge is
 * softened over a pixel or two and no more. The light is on the thing, not in the air in front of it.
 */
const SPOT_EDGE: [number, number][] = [[1.025, 0.3], [1, 0.7]]
function spotCircle(ctx: CanvasRenderingContext2D, k: number, cx: number, cy: number, rx: number, ry: number, a: number, paint: () => void): void {
  if (a <= 0.01) return
  for (const [grow, strength] of SPOT_EDGE) {
    ctx.save()
    ctx.beginPath()
    ctx.ellipse(cx * k, cy * k, rx * grow * k, ry * grow * k, 0, 0, Math.PI * 2)
    ctx.clip()
    ctx.globalAlpha = Math.min(1, a) * strength
    paint()
    ctx.restore()
  }
}

/**
 * Light lying on a wall from a shaded lamp: even across most of its width and falling off only at its edge (not a
 * glow's bright middle), cut off sharply on the side the shade hides.
 */
function shadeLight(ctx: CanvasRenderingContext2D, k: number, x: number, edge: number, dir: -1 | 1, rx: number, ry: number, color: string, a: number): void {
  if (a <= 0.003) return
  const cy = edge + dir * ry * 0.35
  ctx.save()
  ctx.beginPath()
  ctx.rect((x - rx) * k, Math.min(edge, edge + dir * ry * 2) * k, 2 * rx * k, ry * 2 * k)
  ctx.clip()
  ctx.translate(x * k, cy * k)
  ctx.scale(1, ry / rx)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * k)
  g.addColorStop(0, rgba(color, a))
  g.addColorStop(0.6, rgba(color, a * 0.8))
  g.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = g
  ctx.fillRect(-rx * k, -rx * k, 2 * rx * k, 2 * rx * k)
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
    drawStreet(p, k, ink, weight, t, f)
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
    drawStreetLife(p, k, t, t >= TREADLE ? 1 : 0)
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
  // Behind the arch: her play's set, a room, lit from below by the footlights and by the spot where she stands, and
  // her window flown in against it. While she plays, the stage's light on it breathes with the music: up as a phrase
  // swells, down in its rests, so the set plays with her. Steady again for the ovation.
  const playing = Math.min(1, (t - THUD) / 1.2) * (1 - Math.min(1, Math.max(0, (t - SPRING + 0.8) / 0.8)))
  const breath = t > THUD && t < SPRING ? 1 + 0.45 * (level(t) - 0.55) * Math.max(0, playing) : 1
  const lit = stage * breath
  const spot = spotAt(t)
  drawSet(p, k, weight, t, lit, spot)
  drawWindow(p, k, ink, weight, lit, t)
  drawDressing(p, k, ink, weight, t, lit)

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
  // The face is panelled, with a moulding along its foot.
  outline(p, alpha(p, M.gold, 0.16 + 0.22 * Math.min(1, house)).toString(), weight * 0.5)
  const panels = Math.floor((lip1 - lip0 - 0.3) / 0.95)
  const panel0 = lip0 + (lip1 - lip0 - (panels * 0.95 - 0.2)) / 2
  for (let i = 0; i < panels; i++) rrect(p, k, panel0 + i * 0.95, FLOOR + 0.17, panel0 + i * 0.95 + 0.75, APRON - 0.11)
  p.line(lip0 * k, (APRON - 0.05) * k, lip1 * k, (APRON - 0.05) * k)
  p.noStroke()
  p.fill(M.gold)
  rrect(p, k, lip0, FLOOR, lip1, FLOOR + 0.05)
  // The house floor, dark, under the rows.
  p.fill(mixHex(bg, M.velvetDeep, 0.2))
  rrect(p, k, lip0, APRON, lip1, 3.0)
  outline(p, ink, weight)
  p.line(WALL_IN * k, FLOOR * k, lip0 * k, FLOOR * k)
  p.line(lip1 * k, FLOOR * k, RIGHT * k, FLOOR * k)
  // The spot's light on the boards at her feet: a stretch of the stage's lip lit under her, and nothing round her.
  if (spot > 0.01) {
    const sx = spotX(t)
    const a = 0.5 * Math.min(1, spot)
    const g = ctx.createLinearGradient((sx - 0.72) * k, 0, (sx + 0.72) * k, 0)
    g.addColorStop(0, rgba(M.spot, 0))
    g.addColorStop(0.3, rgba(M.spot, a))
    g.addColorStop(0.7, rgba(M.spot, a))
    g.addColorStop(1, rgba(M.spot, 0))
    ctx.fillStyle = g
    ctx.fillRect((sx - 0.72) * k, (FLOOR - 0.022) * k, 1.44 * k, 0.072 * k)
  }
  drawFoot(p, k, ink, weight, t, stage)

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

/**
 * Her play's set: a room in the small town she is leaving. A papered wall, panelling below a dado rail; at one side a
 * picture of the desert, a little table with a lamp and a chair turned to the window; at the other her coat and hat on
 * their pegs and her suitcase packed on the floor under them. The room is dark until the stage lights come up on the
 * thud (the spot alone finds her as the curtain flies out), and its lamp burns brighter while her window is at night.
 */
const SET_PAPER = '#7A4150'
const SET_STRIPE = '#5A2A38'
const SET_WOOD = '#5C3A2C'
/** The paper and the panelling in the spot. */
const SET_PAPER_LIT = '#C47A78'
const SET_WOOD_LIT = '#A06E4E'
const DADO = -0.62
/** What of the set catches the stage's light, `l` of the way up from the dark. */
const setLit = (c: string, l: number): string => mixHex(mixHex(THEATRE_INK.bg, c, 0.3), c, l)

function drawSet(p: p5, k: number, weight: number, t: number, lit: number, spot: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const l = Math.min(1, lit)
  const paper = setLit(SET_PAPER, l)
  const wood = setLit(SET_WOOD, l)
  const w = ARCH1 - ARCH0
  const fill = (top: string, foot: string): void => {
    ctx.fillStyle = top
    ctx.fillRect(ARCH0 * k, ARCH_TOP * k, w * k, (DADO - ARCH_TOP) * k)
    ctx.fillStyle = foot
    ctx.fillRect(ARCH0 * k, DADO * k, w * k, (FLOOR - DADO) * k)
  }
  fill(paper, wood)
  // The paper's broad stripe.
  ctx.fillStyle = rgba(SET_STRIPE, 0.22)
  ctx.beginPath()
  for (let x = ARCH0 + 0.12; x < ARCH1; x += 0.36) ctx.rect(x * k, ARCH_TOP * k, 0.14 * k, (DADO - ARCH_TOP) * k)
  ctx.fill()
  // The footlights' light up the wall from the boards, fading as it climbs.
  if (lit > 0.01) {
    const g = ctx.createLinearGradient(0, FLOOR * k, 0, (FLOOR - 2.3) * k)
    g.addColorStop(0, rgba(M.bulb, 0.18 * Math.min(1.3, lit)))
    g.addColorStop(1, rgba(M.bulb, 0))
    ctx.fillStyle = g
    ctx.fillRect(ARCH0 * k, (FLOOR - 2.3) * k, w * k, 2.3 * k)
  }
  // The spot's circle on the wall behind her, tight on her as a follow spot is: the paper and the panelling as they
  // look in its light.
  if (spot > 0.01) {
    const [cy, rx, ry] = spotShape(t)
    spotCircle(ctx, k, spotX(t), cy, rx, ry, spot, () => {
      fill(SET_PAPER_LIT, SET_WOOD_LIT)
      ctx.fillStyle = rgba(SET_STRIPE, 0.22)
      ctx.beginPath()
      for (let x = ARCH0 + 0.12; x < ARCH1; x += 0.36) ctx.rect(x * k, ARCH_TOP * k, 0.14 * k, (DADO - ARCH_TOP) * k)
      ctx.fill()
    })
  }
  // The dado rail, the panels under it, the skirting.
  p.noStroke()
  p.fill(setLit(mixHex(SET_WOOD, M.gold, 0.3), l))
  rrect(p, k, ARCH0, DADO - 0.035, ARCH1, DADO + 0.03)
  p.fill(setLit(mixHex(SET_WOOD, '#000000', 0.25), l))
  rrect(p, k, ARCH0, FLOOR - 0.08, ARCH1, FLOOR)
  outline(p, rgba(mixHex(SET_WOOD, '#000000', 0.45), 0.7), weight * 0.45)
  for (let x = ARCH0 + 0.1; x + 0.62 < ARCH1; x += 0.74) rrect(p, k, x, DADO + 0.1, x + 0.62, FLOOR - 0.15)
}

/** The things on her set, either side of the window, clear of where she plays. */
function drawDressing(p: p5, k: number, ink: string, weight: number, t: number, lit: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const l = Math.min(1, lit)
  const line = rgba(ink, 0.25 + 0.3 * l)
  const w = weight * 0.5
  // A picture of the desert on a wire from its nail: a pale sky, a mesa, the sand.
  {
    const x0 = 13.78
    const x1 = 14.3
    const y0 = -2.42
    const y1 = -2.02
    outline(p, line, w)
    p.line(((x0 + x1) / 2) * k, (y0 - 0.3) * k, (x0 + 0.06) * k, y0 * k)
    p.line(((x0 + x1) / 2) * k, (y0 - 0.3) * k, (x1 - 0.06) * k, y0 * k)
    solid(p, line, w, setLit(M.gold, 0.6 * l))
    rrect(p, k, x0, y0, x1, y1)
    p.noStroke()
    p.fill(setLit('#E7BE8E', l))
    rrect(p, k, x0 + 0.05, y0 + 0.05, x1 - 0.05, y1 - 0.05)
    p.fill(setLit('#C98B5C', l))
    rrect(p, k, x0 + 0.05, y1 - 0.13, x1 - 0.05, y1 - 0.05)
    p.fill(setLit('#8E4B3A', l))
    poly(p, k, [[x0 + 0.08, y1 - 0.13], [x0 + 0.14, y1 - 0.25], [x0 + 0.3, y1 - 0.25], [x0 + 0.36, y1 - 0.13]])
  }
  // The little table, its lamp on it. The lamp is lit with the stage, and brighter while her window is at night: its
  // light lies on the wall above and below the shade and on the table top, and the shade is the lamp.
  {
    const tx = 13.7
    const top = -0.36
    const on = smooth(t, THUD - 0.05, THUD + 0.3)
    const night = on * viewAt(t).night
    const glowA = on * (0.55 + 0.45 * night) * Math.min(1.2, Math.max(0.6, lit))
    const shadeTop = -0.8
    const shadeFoot = -0.61
    shadeLight(ctx, k, tx, shadeTop, -1, 0.24, 0.26, M.bulb, 0.11 * glowA)
    shadeLight(ctx, k, tx, shadeFoot, 1, 0.34, 0.125, M.bulb, 0.1 * glowA)
    solid(p, line, w, setLit(SET_WOOD, 0.4 + 0.6 * l))
    rrect(p, k, tx - 0.04 - 0.24, top + 0.04, tx - 0.24, FLOOR)
    rrect(p, k, tx + 0.24, top + 0.04, tx + 0.24 + 0.04, FLOOR)
    rrect(p, k, tx - 0.34, top, tx + 0.34, top + 0.045)
    p.noStroke()
    p.fill(rgba(M.bulb, 0.35 * glowA))
    rrect(p, k, tx - 0.3, top, tx + 0.3, top + 0.012)
    // The lamp: a turned base, its stem, the shade.
    solid(p, line, w, setLit(M.gold, 0.5 * l))
    p.ellipse(tx * k, (top - 0.03) * k, 0.16 * k, 0.06 * k)
    p.rect((tx - 0.012) * k, shadeFoot * k, 0.024 * k, (top - 0.04 - shadeFoot) * k)
    solid(p, line, w, mixHex(setLit('#C9A47E', 0.5 * l), M.bulb, 0.85 * glowA))
    poly(p, k, [[tx - 0.15, shadeFoot], [tx - 0.09, shadeTop], [tx + 0.09, shadeTop], [tx + 0.15, shadeFoot]])
  }
  // A chair turned to the window: its back on the far side, its seat, its legs.
  {
    const cx0 = 14.32
    const cx1 = 14.66
    const seat = -0.24
    const wood = setLit(mixHex(SET_WOOD, M.boards, 0.5), 0.4 + 0.6 * l)
    solid(p, line, w, wood)
    rrect(p, k, cx0, seat, cx1, seat + 0.035)
    poly(p, k, [[cx0, FLOOR], [cx0 + 0.035, FLOOR], [cx0 + 0.035, seat], [cx0 - 0.015, seat - 0.36], [cx0 - 0.05, seat - 0.36]])
    rrect(p, k, cx1 - 0.035, seat + 0.035, cx1, FLOOR)
    p.line((cx0 - 0.02) * k, (seat - 0.2) * k, (cx0 + 0.03) * k, (seat - 0.2) * k)
  }
  // Her coat and hat on their pegs, her suitcase packed under them.
  {
    const rail = -1.12
    const px = [17.95, 18.42]
    solid(p, line, w, setLit(SET_WOOD, 0.4 + 0.6 * l))
    rrect(p, k, 17.75, rail - 0.04, 18.62, rail + 0.03)
    p.noStroke()
    p.fill(setLit(M.gold, 0.6 * l))
    for (const x of px) p.circle(x * k, (rail + 0.05) * k, 0.045 * k)
    // The coat: hung by its collar, falling to its hem, a belt across it.
    const coat = setLit('#8C6A3A', 0.4 + 0.6 * l)
    const cx = px[0]
    solid(p, line, w, coat)
    poly(p, k, [[cx - 0.06, rail + 0.06], [cx + 0.06, rail + 0.06], [cx + 0.15, rail + 0.2], [cx + 0.19, rail + 0.7], [cx - 0.19, rail + 0.7], [cx - 0.15, rail + 0.2]])
    outline(p, rgba(mixHex('#8C6A3A', '#000000', 0.5), 0.6), w)
    p.line(cx * k, (rail + 0.16) * k, cx * k, (rail + 0.7) * k)
    p.line((cx - 0.06) * k, (rail + 0.06) * k, cx * k, (rail + 0.16) * k)
    p.line((cx + 0.06) * k, (rail + 0.06) * k, cx * k, (rail + 0.16) * k)
    for (const sd of [-1, 1]) p.line((cx + sd * 0.13) * k, (rail + 0.2) * k, (cx + sd * 0.12) * k, (rail + 0.5) * k)
    p.line((cx - 0.17) * k, (rail + 0.38) * k, (cx + 0.17) * k, (rail + 0.38) * k)
    // The hat: a crown and a brim, a band round it.
    const hx = px[1]
    solid(p, line, w, setLit(M.velvetDeep, 0.5 + 0.5 * l))
    p.arc(hx * k, (rail + 0.13) * k, 0.2 * k, 0.2 * k, Math.PI, Math.PI * 2, p.CHORD)
    p.ellipse(hx * k, (rail + 0.14) * k, 0.32 * k, 0.05 * k)
    p.noStroke()
    p.fill(setLit(M.rose, 0.4 + 0.6 * l))
    p.rect((hx - 0.1) * k, (rail + 0.09) * k, 0.2 * k, 0.03 * k)
    // The suitcase on the floor: its straps, its handle, its clasps.
    const s0 = 18.08
    const s1 = 18.56
    const sTop = -0.27
    outline(p, line, w)
    p.noFill()
    p.arc(((s0 + s1) / 2) * k, sTop * k, 0.14 * k, 0.1 * k, Math.PI, Math.PI * 2)
    solid(p, line, w, setLit('#6E4530', 0.4 + 0.6 * l))
    rrect(p, k, s0, sTop, s1, FLOOR, 0.03)
    p.noStroke()
    p.fill(setLit('#9B6A44', 0.4 + 0.6 * l))
    for (const x of [s0 + 0.11, s1 - 0.15]) p.rect(x * k, sTop * k, 0.04 * k, -sTop * k)
    p.fill(setLit(M.gold, 0.6 * l))
    for (const x of [s0 + 0.08, s1 - 0.08]) p.rect((x - 0.02) * k, (sTop + 0.03) * k, 0.04 * k, 0.03 * k)
  }
}

/** The street across from the theatre: a row of buildings in the dark, a few windows lit, and a lamp at the kerb. */
const BLOCKS: { x0: number; x1: number; top: number }[] = [
  { x0: -14, x1: -10.6, top: -6.2 },
  { x0: -10.6, x1: -7.4, top: -4.6 },
  { x0: -7.4, x1: -3.6, top: -7.4 },
  { x0: -3.6, x1: -0.6, top: -5.2 },
  { x0: -0.6, x1: 3.4, top: -6.6 },
  { x0: 3.4, x1: WALL, top: -4.9 },
]
const STREET_LAMP = 1.2
function drawStreet(p: p5, k: number, ink: string, weight: number, t: number, f: { x0: number; x1: number }): void {
  const bg = THEATRE_INK.bg
  const marquee = t >= TREADLE ? 1 : 0
  for (const [i, b] of BLOCKS.entries()) {
    if (b.x1 < f.x0 - 1) continue
    p.noStroke()
    p.fill(mixHex(bg, M.velvetDeep, 0.1 + 0.04 * (i % 2)))
    rrect(p, k, b.x0, b.top, b.x1, FLOOR)
    p.stroke(alpha(p, ink, 0.12))
    p.strokeWeight(weight * 0.5)
    p.line(b.x0 * k, b.top * k, b.x1 * k, b.top * k)
    // Windows, a grid of them, a few lit warm; the ones nearest the marquee catch its light when it blazes.
    p.noStroke()
    for (let y = b.top + 0.7; y < FLOOR - 1.6; y += 0.95) {
      for (let x = b.x0 + 0.45; x < b.x1 - 0.5; x += 0.8) {
        const h = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1
        const lit = h > 0.72
        p.fill(lit ? rgba(M.bulb, 0.32) : mixHex(bg, M.velvetDeep, 0.04))
        rrect(p, k, x, y, x + 0.3, y + 0.42)
      }
    }
  }
  drawWindowLife(p, k, t)
  // The lamp at the kerb: a post, a lantern, its pool on the pavement.
  const lx = STREET_LAMP
  glow(p, k, lx, FLOOR, 1.8, M.bulb, 0.12 + 0.04 * marquee, 1, 0.22)
  solid(p, ink, weight * 0.7, mixHex(bg, ink, 0.18))
  rrect(p, k, lx - 0.05, -3.1, lx + 0.05, FLOOR)
  rrect(p, k, lx - 0.13, FLOOR - 0.25, lx + 0.13, FLOOR)
  p.noStroke()
  p.fill(alpha(p, M.bulb, 0.9))
  p.beginShape()
  p.vertex((lx - 0.16) * k, -3.6 * k)
  p.vertex((lx + 0.16) * k, -3.6 * k)
  p.vertex((lx + 0.1) * k, -3.1 * k)
  p.vertex((lx - 0.1) * k, -3.1 * k)
  p.endShape(p.CLOSE)
  solid(p, ink, weight * 0.6, mixHex(bg, ink, 0.18))
  p.triangle((lx - 0.2) * k, -3.6 * k, (lx + 0.2) * k, -3.6 * k, lx * k, -3.85 * k)
}

/**
 * The street's own life on the night of her show. Across the road, someone crossing a lit room behind a half-drawn
 * curtain, and a cat on a lit sill, its tail going. On the pavement a newsboy by the lamp, holding up the evening
 * paper on the beat; a couple come along under the marquee and stop to look up at it as it blazes, and go on; a man
 * in a hat hurries the other way. At the kerb a parked car, the marquee's light along its chrome; once the marquee is
 * lit its driver starts it, its lamps come on, and it pulls out and away up the street. People, not balls:
 * shapes in the dark, with the light along their edges.
 */
const LIFE_WIN: [number, number] = [-6.6, -4.6]
function figure(ctx: CanvasRenderingContext2D, k: number, x: number, foot: number, s: number, step: number, dir: number, fill: string, hat = false, skirt = false, look = 0): void {
  const swing = Math.sin(step * Math.PI * 2)
  const hip = foot - 0.48 * s
  const sh = foot - 0.86 * s
  ctx.fillStyle = fill
  ctx.strokeStyle = fill
  ctx.lineCap = 'round'
  ctx.lineWidth = 0.065 * s * k
  ctx.beginPath()
  ctx.moveTo(x * k, hip * k)
  ctx.lineTo((x + 0.13 * s * swing) * k, foot * k)
  ctx.moveTo(x * k, hip * k)
  ctx.lineTo((x - 0.13 * s * swing) * k, foot * k)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo((x - 0.1 * s) * k, sh * k)
  ctx.lineTo((x + 0.1 * s) * k, sh * k)
  const hem = skirt ? 0.2 : 0.14
  ctx.lineTo((x + hem * s) * k, (hip + (skirt ? 0.2 : 0.12) * s) * k)
  ctx.lineTo((x - hem * s) * k, (hip + (skirt ? 0.2 : 0.12) * s) * k)
  ctx.closePath()
  ctx.fill()
  const hx = x + 0.02 * dir * s
  const hy = sh - 0.13 * s - 0.03 * look * s
  ctx.beginPath()
  ctx.arc(hx * k, hy * k, 0.085 * s * k, 0, Math.PI * 2)
  ctx.fill()
  if (hat) {
    ctx.fillRect((hx - 0.12 * s) * k, (hy - 0.06 * s) * k, 0.24 * s * k, 0.03 * s * k)
    ctx.fillRect((hx - 0.07 * s) * k, (hy - 0.14 * s) * k, 0.14 * s * k, 0.09 * s * k)
  }
}
/** The couple: along to under the marquee, stopping to look up as it blazes, and on back the way they came. */
function couple(t: number): { x: number; step: number; dir: number; look: number } | null {
  if (t < 89.8 || t > 99.5) return null
  const stopAt = 3.35
  if (t < 92.9) {
    const u = (t - 89.8) / (92.9 - 89.8)
    return { x: -3.4 + (stopAt + 3.4) * (1 - (1 - u) ** 1.6), step: (t * 1.7) % 1, dir: 1, look: 0 }
  }
  if (t < 96.2) return { x: stopAt, step: 0, dir: 1, look: smooth(t, TREADLE - 0.1, TREADLE + 0.4) * (1 - smooth(t, 95.4, 96.2)) }
  const u = (t - 96.2) / 3.3
  return { x: stopAt - 6.5 * u, step: (t * 1.7) % 1, dir: -1, look: 0 }
}
function drawStreetLife(p: p5, k: number, t: number, lit: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const bg = THEATRE_INK.bg
  const fill = mixHex(bg, '#000000', 0.45)
  const rim = rgba(M.bulb, 0.25 + 0.35 * lit)
  // The newsboy by the lamp, a paper up in his hand on the beat (a blank sheet: nothing printed on it).
  {
    const x = STREET_LAMP + 0.45
    const beatPh = ((t - dream(0)) / DREAM_PERIOD) % 2
    const up = beatPh < 0 ? 0 : Math.max(0, Math.sin(Math.PI * Math.min(1, beatPh / 0.6)))
    figure(ctx, k, x, FLOOR, 0.82, 0, -1, fill, true)
    const sh = FLOOR - 0.86 * 0.82
    ctx.lineWidth = 0.05 * k
    ctx.beginPath()
    ctx.moveTo((x - 0.05) * k, (sh + 0.04) * k)
    ctx.lineTo((x - 0.16) * k, (sh - 0.12 - 0.12 * up) * k)
    ctx.stroke()
    ctx.fillStyle = mixHex(M.spot, bg, 0.55)
    ctx.fillRect((x - 0.27) * k, (sh - 0.36 - 0.12 * up) * k, 0.2 * k, 0.26 * k)
    // His stack of papers at his feet.
    ctx.fillStyle = mixHex(M.spot, bg, 0.65)
    ctx.fillRect((x + 0.08) * k, (FLOOR - 0.12) * k, 0.24 * k, 0.12 * k)
  }
  // The couple, arm in arm.
  const c = couple(t)
  if (c) {
    figure(ctx, k, c.x, FLOOR, 0.95, c.step, c.dir, fill, true, false, c.look)
    figure(ctx, k, c.x + 0.28 * c.dir, FLOOR, 0.86, (c.step + 0.5) % 1, c.dir, mixHex(M.velvetDeep, '#000000', 0.45), false, true, c.look)
    ctx.strokeStyle = rim
    ctx.lineWidth = Math.max(1, 0.014 * k)
    ctx.beginPath()
    ctx.arc((c.x + 0.02 * c.dir * 0.95) * k, (FLOOR - 0.86 * 0.95 - 0.13 * 0.95 - 0.03 * c.look) * k, 0.085 * 0.95 * k, Math.PI * 1.1, Math.PI * 1.9)
    ctx.stroke()
  }
  // The man in a hat, hurrying the other way, late for something.
  if (t > 90.6 && t < 95.5) {
    const u = (t - 90.6) / 4.9
    figure(ctx, k, 6.9 - 10.5 * u, FLOOR, 0.98, (t * 2.3) % 1, -1, fill, true)
  }
  // The parked car at the kerb, nearer than the pavement: its body, its windows, its wheels; chrome along its waist.
  // Started after the marquee lights (a shudder as it catches), its lamps on, it pulls out and goes off up the street.
  const START = TREADLE + 0.45
  const GO = START + 0.45
  const run = Math.max(0, t - GO)
  const dx = -(run < 1.2 ? 1.6 * run * run : 2.3 + 3.84 * (run - 1.2))
  if (dx > -9) {
    const x0 = 0.3 + dx
    const x1 = 3.3 + dx
    const shake = t > START && t < GO + 0.2 ? 0.012 * Math.sin((t - START) * 70) * (1 - smooth(t, GO, GO + 0.2)) : 0
    const base = FLOOR + 0.98 + shake
    ctx.fillStyle = mixHex(bg, '#000000', 0.35)
    ctx.beginPath()
    ctx.moveTo(x0 * k, base * k)
    ctx.lineTo(x0 * k, (base - 0.38) * k)
    ctx.lineTo((x0 + 0.5) * k, (base - 0.44) * k)
    ctx.lineTo((x0 + 0.95) * k, (base - 0.78) * k)
    ctx.lineTo((x1 - 1.0) * k, (base - 0.8) * k)
    ctx.lineTo((x1 - 0.55) * k, (base - 0.44) * k)
    ctx.lineTo(x1 * k, (base - 0.38) * k)
    ctx.lineTo(x1 * k, base * k)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = mixHex(bg, M.velvetDeep, 0.35)
    ctx.beginPath()
    ctx.moveTo((x0 + 1.02) * k, (base - 0.72) * k)
    ctx.lineTo((x1 - 1.05) * k, (base - 0.73) * k)
    ctx.lineTo((x1 - 0.68) * k, (base - 0.47) * k)
    ctx.lineTo((x0 + 0.62) * k, (base - 0.47) * k)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = rgba(M.bulb, 0.3 + 0.35 * lit)
    ctx.lineWidth = Math.max(1, 0.02 * k)
    ctx.beginPath()
    ctx.moveTo((x0 + 0.05) * k, (base - 0.3) * k)
    ctx.lineTo((x1 - 0.05) * k, (base - 0.3) * k)
    ctx.stroke()
    // Its lamps once it is started: a head lamp at the front (it goes off to the left), a tail lamp at the back.
    if (t > START) {
      ctx.fillStyle = M.bulb
      ctx.fillRect((x0 + 0.02) * k, (base - 0.36) * k, 0.07 * k, 0.07 * k)
      ctx.fillStyle = '#C8352E'
      ctx.fillRect((x1 - 0.08) * k, (base - 0.35) * k, 0.06 * k, 0.09 * k)
    }
    ctx.fillStyle = mixHex(bg, '#000000', 0.6)
    for (const wx of [x0 + 0.62, x1 - 0.62]) {
      ctx.beginPath()
      ctx.arc(wx * k, base * k, 0.22 * k, 0, Math.PI * 2)
      ctx.fill()
    }
    // The hubs, turning as it goes.
    ctx.fillStyle = mixHex(bg, M.gold, 0.35)
    const turn = dx / 0.22
    for (const wx of [x0 + 0.62, x1 - 0.62]) {
      ctx.beginPath()
      ctx.arc((wx + 0.1 * Math.cos(turn)) * k, (base + 0.1 * Math.sin(turn)) * k, 0.035 * k, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
/** Across the road: the lit room with someone crossing it, and the cat on a sill. Drawn with the buildings. */
function drawWindowLife(p: p5, k: number, t: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const bg = THEATRE_INK.bg
  const [x0, x1] = LIFE_WIN
  const y0 = -3.55
  const y1 = -2.75
  ctx.fillStyle = rgba(M.bulb, 0.42)
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  // Someone crossing the room, now and then, and back.
  const cyc = ((t - 88) % 7 + 7) % 7
  if (cyc < 3.2) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
    ctx.clip()
    const dir = Math.floor((t - 88) / 7) % 2 ? -1 : 1
    const u = cyc / 3.2
    const x = dir > 0 ? x0 - 0.3 + u * (x1 - x0 + 0.6) : x1 + 0.3 - u * (x1 - x0 + 0.6)
    ctx.fillStyle = mixHex(bg, '#000000', 0.3)
    ctx.beginPath()
    ctx.arc(x * k, (y0 + 0.28) * k, 0.12 * k, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillRect((x - 0.18) * k, (y0 + 0.42) * k, 0.36 * k, 0.6 * k)
    ctx.restore()
  }
  // The curtain half drawn across it.
  ctx.fillStyle = mixHex(M.velvetDeep, bg, 0.4)
  ctx.fillRect(x0 * k, y0 * k, 0.55 * k, (y1 - y0) * k)
  ctx.strokeStyle = rgba(M.bulb, 0.25)
  ctx.lineWidth = Math.max(1, 0.015 * k)
  ctx.strokeRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  // The cat on the next sill along, sitting, its tail going.
  const cx = -1.9
  const sill = -4.82
  ctx.fillStyle = rgba(M.bulb, 0.32)
  ctx.fillRect((cx - 0.4) * k, (sill - 0.72) * k, 0.8 * k, 0.72 * k)
  ctx.fillStyle = mixHex(bg, '#000000', 0.4)
  ctx.fillRect((cx - 0.48) * k, sill * k, 0.96 * k, 0.05 * k)
  ctx.beginPath()
  ctx.ellipse(cx * k, (sill - 0.16) * k, 0.12 * k, 0.17 * k, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc((cx + 0.02) * k, (sill - 0.36) * k, 0.08 * k, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo((cx - 0.03) * k, (sill - 0.42) * k)
  ctx.lineTo((cx - 0.06) * k, (sill - 0.5) * k)
  ctx.lineTo((cx + 0.02) * k, (sill - 0.44) * k)
  ctx.moveTo((cx + 0.05) * k, (sill - 0.43) * k)
  ctx.lineTo((cx + 0.09) * k, (sill - 0.5) * k)
  ctx.lineTo((cx + 0.1) * k, (sill - 0.4) * k)
  ctx.fill()
  const tail = 0.5 * Math.sin(t * 2.1) + 0.25 * Math.sin(t * 5.3)
  ctx.strokeStyle = ctx.fillStyle
  ctx.lineWidth = 0.035 * k
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo((cx + 0.08) * k, (sill - 0.04) * k)
  ctx.quadraticCurveTo((cx + 0.3) * k, (sill + 0.05) * k, (cx + 0.3 + 0.08 * Math.sin(tail)) * k, (sill + 0.18 + 0.06 * Math.cos(tail)) * k)
  ctx.stroke()
}

/**
 * The footlights: low hoods on the lip, up with the stage lights; their light is on the set's wall behind her
 * (`drawSet`), and their mouths are the lamps. Where she lands and leaps the boards give a little under her, hoods and
 * all: her landing is the event, not a pop of light.
 */
function drawFoot(p: p5, k: number, ink: string, weight: number, t: number, stage: number): void {
  const bg = THEATRE_INK.bg
  const base = Math.min(1, Math.max(0, stage))
  const dim = mixHex(bg, M.gold, 0.4)
  for (const x of FOOT_X) {
    let give = 0
    for (const f of FOOT_AT) give = Math.max(give, Math.max(0, ring(t - f.t, 3.2, 0.12)) * Math.exp(-(((x - f.x) / 0.75) ** 2)))
    const dy = 0.025 * give
    solid(p, ink, weight * 0.45, mixHex(bg, M.gold, 0.55))
    p.beginShape()
    p.vertex((x - 0.13) * k, (FLOOR + dy) * k)
    p.vertex((x - 0.09) * k, (FLOOR - 0.06 + dy) * k)
    p.vertex((x + 0.09) * k, (FLOOR - 0.06 + dy) * k)
    p.vertex((x + 0.13) * k, (FLOOR + dy) * k)
    p.endShape(p.CLOSE)
    p.noStroke()
    p.fill(mixHex(dim, M.bulb, Math.min(1, 0.55 * base)))
    p.ellipse(x * k, (FLOOR - 0.062 + dy) * k, 0.15 * k, 0.03 * k)
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
    outline(p, alpha(p, ink, 0.7).toString(), weight * 0.45)
    p.line(rail * k, (ly - 0.06) * k, lx * k, (ly - 0.06) * k)
    // The bulb under its shade.
    p.noStroke()
    p.fill(since >= 0 ? M.bulb : mixHex(bg, M.gold, 0.3))
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
    const cx = (MQ.x0 + MQ.x1) / 2 + 0.25
    const cy = (MQ.y0 + MQ.y1) / 2
    // The stem, lying a little aslant, and two leaves off it.
    p.noFill()
    p.stroke('#3E6B3A')
    p.strokeWeight(weight * 0.9)
    p.line((cx - 1.15) * k, (cy + 0.07) * k, (cx - 0.12) * k, cy * k)
    p.noStroke()
    p.fill('#4F8048')
    p.ellipse((cx - 0.75) * k, (cy - 0.03) * k, 0.24 * k, 0.09 * k)
    p.ellipse((cx - 0.45) * k, (cy + 0.07) * k, 0.2 * k, 0.08 * k)
    // The bloom: a cup of petals, darker at the heart.
    p.fill(M.velvet)
    p.ellipse((cx - 0.02) * k, cy * k, 0.3 * k, 0.24 * k)
    p.fill(M.rose)
    p.ellipse((cx + 0.04) * k, (cy - 0.03) * k, 0.2 * k, 0.17 * k)
    p.fill(M.velvetDeep)
    p.ellipse((cx + 0.06) * k, (cy - 0.04) * k, 0.08 * k, 0.07 * k)
  }
  // Underneath, a soffit of lamps.
  p.noStroke()
  p.fill(mixHex(bg, M.gold, 0.4))
  rrect(p, k, MQ.x0 + 0.05, MQ.y1, MQ.x1, MQ.y1 + 0.07)
  const n = 18
  for (const y of [MQ.y0 + 0.1, MQ.y1 - 0.1]) {
    for (let i = 0; i < n; i++) {
      const x = MQ.x0 + 0.12 + ((MQ.x1 - MQ.x0 - 0.2) * (i + 0.5)) / n
      // Lit, all of them, and steady: a marquee that is on, not one that chases.
      bulb(p, k, x, y, 0.045, lit)
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

  // The blade: a tall sign on the wall, gold-framed, its border of bulbs lit, three great lamps, the star.
  solid(p, ink, weight, M.gold)
  rrect(p, k, BL.x0, BL.y0, BL.x1, BL.y1, 0.06)
  p.noStroke()
  p.fill(mixHex(bg, M.velvetDeep, blaze ? 0.9 : 0.5))
  rrect(p, k, BL.x0 + 0.1, BL.y0 + 0.1, BL.x1 - 0.1, BL.y1 - 0.1, 0.04)
  const side = 12
  for (let i = 0; i < side; i++) {
    const y = BL.y1 - 0.18 - ((BL.y1 - BL.y0 - 0.36) * i) / (side - 1)
    bulb(p, k, BL.x0 + 0.1, y, 0.038, lit)
    bulb(p, k, BL.x1 - 0.1, y, 0.038, lit)
  }
  for (let j = 0; j < 3; j++) {
    const y = BL.y0 + 0.62 + j * 0.7
    const since = t - BLADE[j]
    bulb(p, k, (BL.x0 + BL.x1) / 2, y, 0.17, since >= 0 ? 1 : 0)
  }
  // The star on top.
  const sOn = t >= STAR ? 1 : 0
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
  // The lamp over it, in its cage, its light on the step and the pavement under it.
  glow(p, k, WALL - 0.3, FLOOR, 0.85, M.bulb, 0.16, 1, 0.25)
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
/**
 * What her window looks out on: the day of her show, told while she plays it. Before she begins, the warm light of
 * the stage. Then dawn on her roll, a blue sky with its clouds on her leap, dusk as she hops home, and night, a moon
 * and stars, while the house holds its breath; when the house rises for her it goes to the stage's warm light again,
 * brighter. Each change is a breath of crossfade, on her moves.
 */
interface View {
  top: string
  low: string
  sun: number
  clouds: number
  night: number
  /** How fully the panes show a sky (the stage's warm light is only half up in them). */
  sky: number
}
const VIEWS: [number, View][] = [
  [0, { top: M.bulb, low: M.spot, sun: 0, clouds: 0, night: 0, sky: 0 }],
  [SHOW[0].t0, { top: '#E7A2B6', low: '#FFD69C', sun: 1, clouds: 0, night: 0, sky: 1 }],
  [SHOW[1].t0, { top: '#78AEE6', low: '#D5EAF6', sun: 0, clouds: 1, night: 0, sky: 1 }],
  [SHOW[2].t0, { top: '#5B3D88', low: '#F0885A', sun: 0.6, clouds: 0, night: 0, sky: 1 }],
  [SHOW[2].t1 + 0.45, { top: '#121A44', low: '#2C3B78', sun: 0, clouds: 0, night: 1, sky: 1 }],
  [SPRING, { top: M.bulb, low: M.spot, sun: 0, clouds: 0, night: 0, sky: 0 }],
]
function viewAt(t: number): View {
  let i = 0
  while (i + 1 < VIEWS.length && t >= VIEWS[i + 1][0]) i++
  const [t0, a] = VIEWS[i]
  const prev = VIEWS[Math.max(0, i - 1)][1]
  const f = i === 0 ? 1 : Math.min(1, Math.max(0, (t - t0) / 0.6))
  const u = f * f * (3 - 2 * f)
  const mix = (x: number, y: number) => x + (y - x) * u
  return { top: mixHex(prev.top, a.top, u), low: mixHex(prev.low, a.low, u), sun: mix(prev.sun, a.sun), clouds: mix(prev.clouds, a.clouds), night: mix(prev.night, a.night), sky: mix(prev.sky, a.sky) }
}

function drawWindow(p: p5, k: number, ink: string, weight: number, stage: number, t: number): void {
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
  solid(p, ink, weight * 0.9, mixHex(bg, M.boards, 0.6 + 0.4 * lit))
  rrect(p, k, x0, y0, x1, y1)
  p.noStroke()
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const v = viewAt(t)
  const dark = mixHex(bg, M.velvetDeep, 0.6)
  const g = ctx.createLinearGradient(0, (y0 + 0.12) * k, 0, (y1 - 0.12) * k)
  g.addColorStop(0, mixHex(dark, v.top, lit * (0.55 + 0.4 * v.sky)))
  g.addColorStop(1, mixHex(dark, v.low, lit * 0.9))
  ctx.fillStyle = g
  const px0 = x0 + 0.12
  const py0 = y0 + 0.12
  const pw = x1 - x0 - 0.24
  const ph = y1 - y0 - 0.24
  ctx.fillRect(px0 * k, py0 * k, pw * k, ph * k)
  // The view's sun, clouds, moon and stars, inside the panes.
  if (lit > 0.05 && (v.sun > 0.01 || v.clouds > 0.01 || v.night > 0.01)) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(px0 * k, py0 * k, pw * k, ph * k)
    ctx.clip()
    if (v.sun > 0.01) {
      ctx.fillStyle = rgba('#FFF0C8', 0.95 * v.sun * lit)
      ctx.beginPath()
      ctx.arc((MID + 0.3) * k, (py0 + ph * 0.8) * k, 0.2 * k, 0, Math.PI * 2)
      ctx.fill()
    }
    if (v.clouds > 0.01) {
      ctx.fillStyle = rgba('#FFFFFF', 0.85 * v.clouds * lit)
      for (const [cx, cy, rx] of [[MID - 0.35, py0 + ph * 0.3, 0.32], [MID + 0.4, py0 + ph * 0.55, 0.26]] as const) {
        ctx.beginPath()
        ctx.ellipse(cx * k, cy * k, rx * k, rx * 0.36 * k, 0, 0, Math.PI * 2)
        ctx.ellipse((cx + rx * 0.45) * k, (cy - rx * 0.18) * k, rx * 0.55 * k, rx * 0.35 * k, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    if (v.night > 0.01) {
      ctx.fillStyle = rgba('#F4EEDC', 0.95 * v.night * lit)
      ctx.beginPath()
      ctx.arc((MID - 0.35) * k, (py0 + ph * 0.28) * k, 0.16 * k, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = mixHex(v.top, v.low, 0.2)
      ctx.beginPath()
      ctx.arc((MID - 0.29) * k, (py0 + ph * 0.25) * k, 0.14 * k, 0, Math.PI * 2)
      ctx.fill()
      for (let i = 0; i < 14; i++) {
        const sx = px0 + pw * hash(i, 61)
        const sy = py0 + ph * 0.75 * hash(i, 62)
        ctx.fillStyle = rgba('#FFFFFF', 0.85 * v.night * lit)
        ctx.beginPath()
        ctx.arc(sx * k, sy * k, (0.018 + 0.014 * hash(i, 63)) * k, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.restore()
  }
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
  // The spot on the velvet, where it is still in the beam: a circle of the cloth as it looks in the light.
  const spot = spotAt(t)
  if (spot > 0.01) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    ctx.beginPath()
    ctx.rect(x0 * k, top * k, (x1 - x0) * k, (hem - top) * k)
    ctx.clip()
    const [cy, rx, ry] = spotShape(t)
    spotCircle(ctx, k, spotX(t), cy, rx * 1.05, ry * 1.05, spot * 0.85, () => velvet(p, k, x0, top, x1, hem, lit, 14, speed, true))
    ctx.restore()
  }
  // The hem's gold fringe, and a band of gold above it.
  p.noStroke()
  p.fill(alpha(p, M.gold, 0.55 + 0.4 * lit))
  rrect(p, k, x0, hem - 0.24, x1, hem - 0.2)
  p.fill(mixHex(M.velvetDeep, M.gold, 0.5 + 0.4 * lit))
  rrect(p, k, x0, hem - 0.07, x1, hem)
  // The batten.
  solid(p, ink, weight * 0.6, mixHex(THEATRE_INK.bg, M.boards, 0.6))
  rrect(p, k, x0 - 0.05, top - 0.06, x1 + 0.05, top + 0.02)
}

/** The wing: the lift and its sandbag, the house-light switch, the gallery, the arbor on its track, the work light. */
/**
 * The other line sets in the wing: ropes from the grid down past the gallery, each with its sandbag hanging, the
 * counterweights of the borders and drops not flown tonight. They hang still, swaying a little, and sway harder when
 * the lift clacks into the gallery and when the arbor lands on its stop, the whole wing shaken.
 */
const SETS = [{ x: 10.15, bag: -3.1 }, { x: 10.5, bag: -2.15 }, { x: 10.85, bag: -3.7 }]
function drawSets(p: p5, k: number, ink: string, weight: number, t: number): void {
  const bg = THEATRE_INK.bg
  for (const [i, st] of SETS.entries()) {
    const shake = 0.05 * ring(t - ARRIVE - 0.02 * i, 0.8 + 0.1 * i, 1.2) + 0.07 * ring(t - THUD - 0.03 * i, 0.75 + 0.1 * i, 1.4)
    const sway = 0.012 * Math.sin(t * (0.6 + 0.13 * i) + i * 2) + shake
    const len = st.bag - GAL
    const bx = st.x + sway * len
    outline(p, alpha(p, ink, 0.45).toString(), weight * 0.45)
    p.line(st.x * k, ROOF * k, st.x * k, GAL * k)
    p.line(st.x * k, GAL * k, bx * k, (st.bag - 0.17) * k)
    solid(p, ink, weight * 0.6, mixHex(M.boards, bg, 0.35))
    p.beginShape()
    p.vertex((bx - 0.04) * k, (st.bag - 0.17) * k)
    p.vertex((bx + 0.04) * k, (st.bag - 0.17) * k)
    p.quadraticVertex((bx + 0.15) * k, (st.bag + 0.02) * k, (bx + 0.12) * k, (st.bag + 0.15) * k)
    p.vertex((bx - 0.12) * k, (st.bag + 0.15) * k)
    p.quadraticVertex((bx - 0.15) * k, (st.bag + 0.02) * k, (bx - 0.04) * k, (st.bag - 0.17) * k)
    p.endShape(p.CLOSE)
  }
  // Their ropes tied off on the gallery's pin rail, coiled over the pins.
  outline(p, alpha(p, M.boards, 0.9).toString(), weight * 0.6)
  for (const st of SETS) {
    p.noFill()
    p.ellipse(st.x * k, (GAL - 0.32) * k, 0.12 * k, 0.26 * k)
  }
}

function drawWing(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const bg = THEATRE_INK.bg
  // The lamps the machines switch on as they pass.
  drawSets(p, k, ink, weight, t)
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

  // The spot's lamp on its pipe in front of the arch, turning to follow her: its light is the pool on the boards and
  // on her, and nothing in the air between.
  drawLamp(p, k, ink, weight, t)

  // The rows of the house, from the front row back, and the rose.
  drawRows(p, s, c, t, house, stage + spot * 0.5)
  drawRose(p, k, ink, weight, t)
  drawBoxes(p, k, t, house, stage + spot * 0.5)
}

/**
 * The boxes either side of the house, nearer to us than anything on the stage: a velvet front with a gold rail, a
 * swagged drape over it, and people in each, leaning on the rail toward the stage, lit along the side that faces it.
 * They are at the edges of the picture whenever it is close on her show, near and big, cut by the frame, and they
 * drift across it faster than the stage as the camera goes. They watch her play, are not there for the other road's
 * empty breath, stand and clap with the house, and lean out for the bows.
 */
function drawBoxes(p: p5, k: number, t: number, house: number, stage: number): void {
  if (t < THUD - 1) return
  const f = frame(p, k)
  const fh = f.y1 - f.y0
  const fw = f.x1 - f.x0
  // Only in the close shots of her show: the wide ones have the wing's machinery at the sides.
  const close = 1 - smooth(fh, 5.6, 6.6)
  if (close <= 0.01) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const bg = THEATRE_INK.bg
  const there = (1 - emptyAt(t)) * smooth(t, THUD - 1, THUD)
  const lit = Math.min(1, 0.15 + 0.5 * Math.min(1, house) + 0.5 * Math.min(1, stage))
  const standing = smooth(t, ROWS[0] - 0.05, ROWS[0] + 0.3)
  const u = fh / 5
  // Nearer than the stage: as the camera pans they slide the other way across the frame.
  const drift = -(f.cx - MID) * 0.35
  ctx.save()
  ctx.globalAlpha = close
  for (const side of [-1, 1]) {
    const cx = (side < 0 ? f.x0 + 0.02 * fw : f.x1 - 0.02 * fw) + drift
    const half = 0.95 * u
    const x0 = cx - half
    const x1 = cx + half
    const front = f.y0 + 0.36 * fh
    const top = front - 1.25 * u
    const X = (v: number) => v * k
    // The box's dark inside, the people in it, the drape over it.
    ctx.fillStyle = mixHex(bg, M.velvetDeep, 0.35)
    ctx.fillRect(X(x0), X(top), X(x1 - x0), X(front - top))
    ctx.save()
    ctx.globalAlpha = close * there
    for (const [i, dx] of [-0.5, 0, 0.48].entries()) {
      const hx = cx + dx * u
      const lean = (0.06 * -side * (1 - standing) + 0.05 * -side * bow(t - BOW1 - 0.1 * i, 0.3)) * u
      const clap = standing * Math.max(0, Math.sin((t - ROWS[0]) * 9 + i * 1.3))
      const hy = front - (0.32 + 0.26 * standing - 0.02 * Math.sin(t * 1.3 + i)) * u
      ctx.fillStyle = mixHex(bg, '#000000', 0.45)
      ctx.beginPath()
      ctx.ellipse(X(hx + lean * 0.5), X(hy + 0.24 * u), X(0.17 * u), X(0.15 * u), 0, Math.PI, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(X(hx + lean * 0.5 - 0.17 * u), X(hy + 0.24 * u), X(0.34 * u), X(0.3 * u))
      ctx.beginPath()
      ctx.arc(X(hx + lean), X(hy), X(0.085 * u), 0, Math.PI * 2)
      ctx.fill()
      // Hands together, up, once the house is on its feet.
      if (standing > 0.05) {
        ctx.beginPath()
        ctx.arc(X(hx + lean + 0.05 * u * (1 - clap)), X(hy + (0.12 - 0.04 * clap) * u), X(0.03 * u), 0, Math.PI * 2)
        ctx.arc(X(hx + lean - 0.05 * u * (1 - clap)), X(hy + (0.12 - 0.04 * clap) * u), X(0.03 * u), 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.strokeStyle = rgba(M.bulb, 0.45 * lit)
      ctx.lineWidth = Math.max(1, X(0.012 * u))
      ctx.beginPath()
      const a0 = side < 0 ? -0.9 : Math.PI - 0.1
      ctx.arc(X(hx + lean), X(hy), X(0.085 * u), a0, a0 + 1.0)
      ctx.stroke()
    }
    ctx.restore()
    // The front: velvet, a gold rail along its top and a band across it, bellied out.
    ctx.fillStyle = mixHex(M.velvetDeep, M.velvet, 0.25 + 0.6 * lit)
    ctx.beginPath()
    ctx.moveTo(X(x0), X(front))
    ctx.lineTo(X(x1), X(front))
    ctx.quadraticCurveTo(X(x1 + 0.05 * u), X(front + 0.42 * u), X(cx), X(front + 0.62 * u))
    ctx.quadraticCurveTo(X(x0 - 0.05 * u), X(front + 0.42 * u), X(x0), X(front))
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = mixHex(mixHex(bg, M.gold, 0.5), M.gold, lit)
    ctx.fillRect(X(x0 - 0.04 * u), X(front - 0.06 * u), X(x1 - x0 + 0.08 * u), X(0.08 * u))
    ctx.strokeStyle = ctx.fillStyle
    ctx.lineWidth = X(0.03 * u)
    ctx.beginPath()
    ctx.moveTo(X(x0 + 0.1 * u), X(front + 0.22 * u))
    ctx.quadraticCurveTo(X(cx), X(front + 0.42 * u), X(x1 - 0.1 * u), X(front + 0.22 * u))
    ctx.stroke()
    // The drape over the box: a swag across its top, tied back at its sides.
    ctx.fillStyle = mixHex(M.velvetDeep, M.velvet, 0.15 + 0.5 * lit)
    ctx.beginPath()
    ctx.moveTo(X(x0 - 0.1 * u), X(top - 0.15 * u))
    ctx.lineTo(X(x1 + 0.1 * u), X(top - 0.15 * u))
    ctx.lineTo(X(x1 + 0.1 * u), X(top + 0.9 * u))
    ctx.quadraticCurveTo(X(x1 - 0.08 * u), X(top + 0.5 * u), X(x1 - 0.25 * u), X(top + 0.2 * u))
    ctx.quadraticCurveTo(X(cx), X(top + 0.58 * u), X(x0 + 0.25 * u), X(top + 0.2 * u))
    ctx.quadraticCurveTo(X(x0 + 0.08 * u), X(top + 0.5 * u), X(x0 - 0.1 * u), X(top + 0.9 * u))
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

function sconce(p: p5, k: number, ink: string, weight: number, x: number, y: number, on: number): void {
  const lit = Math.min(1, on)
  // Its light up the pillar from the cup's rim.
  if (lit > 0.05) shadeLight(p.drawingContext as CanvasRenderingContext2D, k, x, y - 0.22, -1, 0.19, 0.7, M.bulb, 0.18 * lit)
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
/**
 * The other road, at her show: in the film her play went on to a near-empty house, and he wasn't there. In the lead-in
 * bar, while the house holds its breath, that night shows through for a breath: the seats empty, flickering like old
 * film, and the house goes grey behind him. On the downbeat he springs up, and the full house is back as it rises.
 */
export const EMPTY: [number, number, number] = [113.45, 114.0, SPRING - 0.06]
export function emptyAt(t: number): number {
  if (t < EMPTY[0] || t > SPRING + 0.02) return 0
  const up = Math.min(1, (t - EMPTY[0]) / (EMPTY[1] - EMPTY[0]))
  const back = t < EMPTY[2] ? 1 : Math.max(0, 1 - (t - EMPTY[2]) / 0.08)
  const flicker = 0.82 + 0.18 * hash(Math.floor(t * 14), 5, 9)
  return up * up * back * flicker
}

/** How much of the stage's light reaches each row's backs, the front row (nearest the stage) first. */
const ROW_LIGHT = [1, 0.58, 0.36, 0.2]
function drawRows(p: p5, s: TheatreState, c: Ctx, t: number, house: number, stage: number): void {
  const empty = emptyAt(t)
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
  // Through her show the house follows her across the stage, each row a moment after the one in front of it.
  const follow = smooth(t, SEAT - 0.2, SEAT + 0.8) * (1 - smooth(t, SPRING - 0.25, SPRING + 0.1))
  for (let r = 0; r < ROW_Y.length; r++) {
    const base = ROW_Y[r]
    const her = follow > 0.01 ? miaAt(t - 0.12 - 0.07 * r).x : 0
    // The stage's light on the backs of the house falls off row by row away from it, so the rows nearest us are dark
    // shapes against the lit ones and the house has depth, not a pattern; with the house lights up, it fills back in.
    const lit = ROW_LIGHT[r] + (1 - ROW_LIGHT[r]) * warm
    const rowFill = mixHex(fill, bg, 0.45 * (1 - lit))
    const rowRim = mixHex(rim, bg, 0.7 * (1 - lit))
    const rowPaddle = mixHex(paddle, bg, 0.88 * (1 - lit))
    for (const st of s.seats) {
      if (st.r !== r) continue
      const up = risen(t - st.up)
      const h = LOW + (HIGH - LOW) * up
      const x0 = st.x - SEAT_W / 2
      const top = base - h
      // Someone in every seat but his: the back of a head over the seat-back, the stage's light along its crown. A full
      // house, the one the film's version never had. They stand with their seats.
      if (!st.his && empty < 0.97) {
        const hr = 0.115
        p.drawingContext.globalAlpha = 1 - empty
        const hy = top - 0.05 - 0.06 * up
        const hx = st.x + (follow > 0.01 ? follow * 0.05 * Math.max(-1, Math.min(1, (her - st.x) / 2.2)) : 0)
        p.noStroke()
        p.fill('#1A0A0E')
        p.circle(hx * k, hy * k, 2 * hr * k)
        p.noFill()
        p.stroke(alpha(p, M.bulb, (0.4 + 0.35 * Math.min(1, stage) + 0.15 * warm) * lit))
        p.strokeWeight(weight * 0.9)
        p.arc(hx * k, hy * k, 2 * hr * k, 2 * hr * k, Math.PI * 1.15, Math.PI * 1.85)
        p.drawingContext.globalAlpha = 1
      }
      p.stroke(alpha(p, ink, (0.28 + 0.2 * warm) * (0.35 + 0.65 * lit)))
      p.strokeWeight(weight * 0.5)
      p.fill(rowFill)
      p.rect(x0 * k, top * k, SEAT_W * k, (h + 0.2) * k, 0.12 * k, 0.12 * k, 0, 0)
      p.stroke(rowRim)
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
          p.stroke(alpha(p, ink, 0.45 * (0.3 + 0.7 * lit)))
          p.strokeWeight(weight * 0.45)
          p.line(bx * k, by * k, tx * k, ty * k)
          p.noStroke()
          p.fill(rowPaddle)
          p.push()
          p.translate(tx * k, ty * k)
          p.rotate(ang + Math.PI / 2 - sd * 0.25)
          p.ellipse(0, 0, 0.1 * k, 0.13 * k)
          p.pop()
        }
      }
    }
  }
  // And the house goes grey behind him while it is empty: the real night's colour. Not him: in grey he would read as
  // David, and he is the one who is there.
  if (empty > 0.01) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    ctx.globalCompositeOperation = 'saturation'
    ctx.fillStyle = rgba('#808080', 0.85 * empty)
    const top = ROW_Y[0] + 0.08
    ctx.fillRect((ARCH0 - 1) * k, top * k, (RIGHT - ARCH0 + 1) * k, (ROW_Y[ROW_Y.length - 1] - top + 0.5) * k)
    ctx.restore()
  }
}

/**
 * The ovation: after the first rose, more come, thrown from all over the house on its claps, each up through the light
 * and down onto the stage, until by the curtain the boards round her are strewn with them. Each lands clear of the two
 * of them, and lies where it fell.
 */
const ROSE_TRIP = 0.85
/* (A rose's spin is in half turns, a whole number of them and a hair, so it comes down lying flat on the boards.) */
const THROWN = (() => {
  const out: { t: number; from: Pt; to: Pt; spin: number }[] = []
  const slots: number[] = []
  for (let x = ARCH0 + 0.75; x < ARCH1 - 0.7; x += 0.19) slots.push(x)
  const used: number[] = [16.52]
  let n = 0
  for (const c of CLAPS) {
    if (c < BOW1 + 0.35 || c > CURTAIN_IN[0] - 0.4 || n >= 22) continue
    const land = c + ROSE_TRIP
    // Clear of her where she is when it lands, and of him once he is up on the stage beside her.
    const her = miaAt(land).x
    const free = slots.filter((x) => Math.abs(x - her) > 0.42 && (land < LEAP || Math.abs(x - LAND_X) > 0.45) && (land < TOUCH || Math.abs(x - MEET_X) > 0.45) && used.every((u) => Math.abs(u - x) > 0.17))
    if (!free.length) continue
    const x = free[Math.floor(hash(n, 81) * free.length)]
    used.push(x)
    const r = Math.floor(hash(n, 82) * 4)
    let i = Math.floor(hash(n, 83) * PER_ROW)
    if (r === 0 && i === HIS) i = (i + 3) % PER_ROW
    out.push({ t: c, from: [seatX(r, i), ROW_Y[r] - HIGH - 0.03], to: [x, FLOOR - 0.045], spin: (hash(n, 84) > 0.5 ? 1 : -1) * (2 + Math.floor(3 * hash(n, 85))) + 0.04 * (hash(n, 86) - 0.5) })
    n++
  }
  return out
})()
function thrownAt(r: (typeof THROWN)[number], t: number): { x: number; y: number; a: number } | null {
  const s = t - r.t
  if (s < 0) return null
  if (s < ROSE_TRIP) {
    const u = s / ROSE_TRIP
    const arc = (ROSE_G * 1.4 * ROSE_TRIP * ROSE_TRIP) / 8 + 0.6
    return { x: lerp(r.from[0], r.to[0], u), y: lerp(r.from[1], r.to[1], u) - arc * 4 * u * (1 - u), a: r.spin * u * Math.PI }
  }
  const k = s - ROSE_TRIP
  return { x: r.to[0], y: r.to[1] - 0.04 * Math.max(0, Math.sin(Math.min(Math.PI, k * 9))) * Math.exp(-k / 0.1), a: r.spin * Math.PI }
}

function drawRose(p: p5, k: number, ink: string, weight: number, t: number): void {
  for (const th of THROWN) {
    const q = thrownAt(th, t)
    if (q) roseShape(p, k, ink, weight, q)
  }
  roseShape(p, k, ink, weight, roseAt(t))
}

function roseShape(p: p5, k: number, ink: string, weight: number, r: { x: number; y: number; a: number }): void {
  p.push()
  p.translate(r.x * k, r.y * k)
  p.rotate(r.a)
  // The stem and two leaves, green as on the marquee's card (a stem the colour of the boards left a red dot on a
  // stick: a match, not a rose).
  p.stroke('#3E6B3A')
  p.strokeWeight(weight * 0.8)
  p.line(-0.22 * k, 0.015 * k, 0.05 * k, 0)
  p.noStroke()
  p.fill('#4F8048')
  p.ellipse(-0.1 * k, -0.03 * k, 0.09 * k, 0.04 * k)
  p.ellipse(-0.02 * k, 0.028 * k, 0.08 * k, 0.034 * k)
  // The bloom: a cup of petals, longer than it is wide, a petal's edge curling in at the heart.
  solid(p, ink, weight * 0.5, M.velvet)
  p.ellipse(0.1 * k, 0, 0.13 * k, 0.11 * k)
  p.noStroke()
  p.fill(M.rose)
  p.ellipse(0.115 * k, -0.01 * k, 0.09 * k, 0.075 * k)
  p.noFill()
  p.stroke(M.velvetDeep)
  p.strokeWeight(weight * 0.6)
  p.arc(0.12 * k, -0.008 * k, 0.05 * k, 0.04 * k, -Math.PI * 0.85, Math.PI * 0.25)
  p.pop()
}
