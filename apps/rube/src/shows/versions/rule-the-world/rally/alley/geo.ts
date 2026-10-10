import { laneAt, R, type Pt, type Seg } from '../../../../../parts'
import { CAB } from '../cab'
import { carried, hash, route, type Way } from '../kit'
import { a, at, SEAM } from '../music'
import { G } from '../physics'

/**
 * The bowling alley's clock and ground (121.018 → 138.142, bars 57 to 64), in the place's own cells. The band has
 * dropped out: the synth alone over the shuffle, the hats and the kick, the bat and the table.
 *
 * Left to right: the night street, and Wally's cab at the curb; the front wall and its glass door; the carpet with the
 * ball rack, the lunch counter at the back wall, Wally and the second mark by it; the lanes running away to the right,
 * and upstage of them, in the back, the table-tennis table with Marty's sprung bat clamped to its near end and the
 * mark who plays at its far end; at the lanes' end the pins, the pit and the masking board. Under the near lane, seen
 * in section, the ball return's track runs back from the pit to the rack.
 *
 * Depth is drawn the stage's way: what is further back stands higher on the screen. Marty rolls on the front line
 * (`FLOOR`, the near lane's middle); the table and the people stand on the back aisle (`FB`).
 */

export const T0 = SEAM.alley
export const T1 = SEAM.jersey

/* ------------------------------------------------------------------ the ground */

/** The front line: the carpet and the near lane, where he rolls. */
export const FLOOR = R
/** The back aisle: where the table and the people stand. */
export const FB = -0.8
/** The back wall's foot. */
export const BACK = -1.02
/** The long low ceiling. */
export const CEIL = -4.4
/** The front wall, outside face to inside face; the door's head. */
export const WALL: [number, number] = [-1.15, -0.9]
export const HEAD = FLOOR - 2.6
/** Outside: the sidewalk's edge, and the road's level. */
export const CURB = -2.0
export const ROAD = 0.28
/** The near sidewalk, in front of the cab along the whole street: its top's near and far edges, and a ball on it. */
export const WALK: [number, number] = [0.44, 0.82]
export const SIDE_Y = 0.62 - R
/** Where he sits on the cab's back seat at the cut: the cab is drawn from here. */
export const SEAT: Pt = [-6.8, ROAD - CAB.road]
/** The foul line, where the lanes begin; the lanes' end (the pin deck's back edge); the pit; the end wall. */
export const FOUL = 1.7
export const HEADPIN = 18.6
export const DECK_END = 19.8
export const PIT: [number, number] = [19.8, 21.0]
export const PIT_FLOOR = 0.63
export const END_WALL = 21.2
/** The ball return's track under the near lane (its rails' top), and the lift up into the rack's hood. */
export const TRACK = 0.85
export const LIFT_X = 1.5
/** The lanes, seen from a little above: the near lane's band, the gutter, the far lane's, the back aisle's. */
export const NEAR: [number, number] = [-0.1, 0.36]
export const FAR: [number, number] = [-0.56, -0.17]
export const AISLE: [number, number] = [BACK, -0.62]
/** The front edge of the floor, where the section begins. */
export const EDGE = 0.44

/** The ball rack: its ends, its rails' top, its hood over the lift; the two house balls on it. */
export const RACK: [number, number] = [0.08, 1.66]
export const RAIL = -0.37
export const HOOD: [number, number] = [1.2, 1.66]
export const BOWL_R = 0.19
export const BOWLS0 = [0.55, 1.0]

/** The table: its ends, the net, the top's front edge, how far back its back edge is drawn, and its middle line. */
export const TABLE: [number, number] = [3.0, 8.5]
export const NET_X = 5.75
export const TOP = FB - 1.25
export const DEPTH: Pt = [0.12, -0.22]
export const MID = TOP + DEPTH[1] / 2
/** A ball on the table's middle line. */
export const CT = MID - R
/** Marty's pan, off the near end, and where he sits in it; the sprung arm's pivot under the end, and its length. */
export const PAN: Pt = [2.6, MID + 0.12 - R]
export const PIVOT: Pt = [3.13, PAN[1] + 0.53]
export const ARM = 0.75

/** The people: the mark who plays (at the far end), the mark who bets and Wally (by the counter). */
export const MARK_X = 9.7
export const MARK2_X = 0.75
export const WALLY_X = -0.32
/** The lunch counter along the back wall. */
export const COUNTER: [number, number] = [-0.7, 2.75]

/* ------------------------------------------------------------------ the clock */

/** The door swings shut behind him as the band drops out. */
export const DOOR_SHUT = at(57, 1)
const START = T0 + 0.18
/** A bounce on the carpet; onto the rack's rail; the house ball he nudged knocks the other. */
export const CARPET = at(57, 2)
export const RAIL_LAND = at(57, 3)
export const CLACK = at(57, 4)
/** Into the pan at the table's end: the arm cocks. */
export const PAN_IN = at(58, 1)
/** The mark knocks his bat on the table: ready. */
export const TAPS = [at(58, 2), at(60, 1)]
/** The first point, given away: his serve, the mark's return, the clumsy fire, the net. */
export const SERVE = at(58, 3)
export const CLUMSY = at(59, 1)
export const NET_HIT = at(59, 2)
export const DRIBBLE = [a(59, 2), at(59, 3)]
/** Back into the pan; the bettor slaps a fatter roll into Wally's hand. */
export const PAN_BACK = at(59, 4)
export const RAISE = at(59, 4)
/** The real rally: every beat a bat, every "a" the table. The last of Marty's is the winner. */
export const HITS = [at(60, 2), at(60, 3), at(60, 4), at(61, 1), at(61, 2), at(61, 3), at(61, 4), at(62, 1), at(62, 2), at(62, 3), at(62, 4)]
export const BOUNCES = [a(60, 2), a(60, 3), a(60, 4), a(61, 1), a(61, 2), a(61, 3), a(61, 4), a(62, 1), a(62, 2), a(62, 3), a(62, 4)]
export const WINNER = at(62, 4)
/** The mark swings, late, over it; it lands on the near lane; the strike; into the pit; the hats come off. */
export const WHIFF = at(63, 1)
export const LANE_LAND = at(63, 2)
export const STRIKE = at(63, 3)
export const PIT_LAND = a(63, 3)
export const HATS = at(63, 4)
/** Up out of the rack's hood as Wally pockets the cash; the sidewalk; the back seat; the settle; the headlights. */
export const POP = at(64, 1)
export const POCKET = at(64, 1)
export const SIDEWALK = a(64, 1)
export const SKIP = at(64, 2)
export const CURB_KICK = at(64, 3)
export const SEAT_LAND = at(64, 4)
export const LIGHTS = a(64, 4)
/** Where he kicks up off the sidewalk behind the cab. */
export const KICK_X = -9.4

/** The fires of Marty's bat, and which kind. */
export const FIRES: { t: number; kind: 'serve' | 'clumsy' | 'hit' | 'winner' }[] = [
  { t: SERVE, kind: 'serve' },
  { t: CLUMSY, kind: 'clumsy' },
  ...HITS.filter((_, i) => i % 2 === 0).map((t) => ({ t, kind: t === WINNER ? ('winner' as const) : ('hit' as const) })),
]
/** The mark's strokes: where his bat meets the ball (or misses it). */
export interface Stroke {
  t: number
  p: Pt
  miss?: boolean
}

/* ------------------------------------------------------------------ the rally's places */

const markBat = (i: number): Pt => [8.82 + 0.1 * (hash(i, 3) - 0.5), -2.58 + 0.16 * (hash(i, 4) - 0.5)]
const markSide = (i: number): number => 6.95 + 0.6 * (hash(i, 5) - 0.5)
const martySide = (i: number): number => 4.75 + 0.5 * (hash(i, 6) - 0.5)
/** How high a crossing flies over the net, and the little rise off the table up to the bat. */
const CROSS = 0.6
const RISE = 0.1

/** The winner: low over the net, deep on his side, past him and down onto the near lane. */
const WIN_BOUNCE: Pt = [7.75, CT]
export const LAND_X = 13.9
/** Where he meets the head pin. */
export const STRIKE_X = HEADPIN - R - 0.09

/** The mark's strokes, in order. */
export const STROKES: Stroke[] = [{ t: at(58, 4), p: markBat(0) }, ...HITS.map((t, i) => ({ t, p: markBat(i + 1) })).filter((_, i) => i % 2 === 1), { t: WHIFF, p: [9.0, -2.92], miss: true }]

/* ------------------------------------------------------------------ the way */

function wobbly(from: Pt, to: Pt, t0: number, t1: number, arc: number): Seg[] {
  // A loopy pop off the edge of the bat, wobbling as it goes.
  const f = (t: number): Pt => {
    const s = (t - t0) / (t1 - t0)
    const x = from[0] + (to[0] - from[0]) * s
    const y = from[1] + (to[1] - from[1]) * s - arc * 4 * s * (1 - s)
    const w = 0.09 * Math.sin(s * Math.PI * 3) * Math.sin(s * Math.PI)
    return [x + w * 0.4, y + w]
  }
  return carried(f, t0, t1, 16)
}

/** Seconds into the slot a show time is. */
const into = (t: number) => t - T0

export function alleyWay(): { segs: Seg[]; at: (t: number) => Pt } {
  const segs: Seg[] = []
  const add = (ways: Way[]) => segs.push(...route(ways.map((w) => ({ ...w, at: into(w.at) }))))
  const g = (T: number) => (G * T * T) / 8

  // In at the door, at rest; a bounce on the carpet, onto the rack's rail, and the lob into the pan.
  const RAIL_AT: Pt = [BOWLS0[0] - BOWL_R - R, RAIL - R]
  add([
    { at: T0, p: [-0.5, 0] },
    { at: START, p: [-0.5, 0] },
    { at: CARPET, p: [-0.15, 0], arc: g(CARPET - START) },
    { at: RAIL_LAND, p: RAIL_AT, arc: g(RAIL_LAND - CARPET) },
    { at: PAN_IN, p: PAN, arc: 1.4 },
    { at: SERVE, p: PAN },
    // The first point: a soft serve, the mark's return, back onto his half and into the pan.
    { at: a(58, 3), p: [markSide(0), CT], arc: CROSS + 0.15 },
    { at: at(58, 4), p: markBat(0), arc: RISE },
    { at: a(58, 4), p: [martySide(0), CT], arc: CROSS },
    { at: CLUMSY, p: PAN, arc: RISE },
  ])
  // The clumsy fire: a wobbling pop that dies in the net.
  const netFace: Pt = [NET_X - R - 0.03, MID - 0.24]
  segs.push(...wobbly(PAN, netFace, into(CLUMSY), into(NET_HIT), 0.95))
  add([
    { at: NET_HIT, p: netFace },
    { at: DRIBBLE[0], p: [5.12, CT], arc: 0.05 },
    { at: DRIBBLE[1], p: [4.45, CT], arc: 0.045 },
    { at: PAN_BACK - 0.16, p: [TABLE[0] + 0.05, CT] },
    { at: PAN_BACK, p: PAN, arc: 0.02 },
    { at: HITS[0], p: PAN },
  ])
  // The real rally.
  const ways: Way[] = [{ at: HITS[0], p: PAN }]
  for (let i = 0; i < HITS.length - 1; i++) {
    const marty = i % 2 === 0
    ways.push({ at: BOUNCES[i], p: [marty ? markSide(i + 1) : martySide(i + 1), CT], arc: CROSS })
    ways.push({ at: HITS[i + 1], p: marty ? markBat(Math.floor(i / 2) + 1) : PAN, arc: RISE })
  }
  // The winner: low over the net, deep, past the mark's late swing, down onto the near lane and along it.
  ways.push({ at: BOUNCES[HITS.length - 1], p: WIN_BOUNCE, arc: 0.5 })
  ways.push({ at: LANE_LAND, p: [LAND_X, 0], arc: g(LANE_LAND - BOUNCES[HITS.length - 1]) })
  const vIn = (LAND_X - WIN_BOUNCE[0]) / (LANE_LAND - BOUNCES[HITS.length - 1])
  const vStrike = (2 * (STRIKE_X - LAND_X)) / (STRIKE - LANE_LAND) - vIn
  ways.push({ at: STRIKE, p: [STRIKE_X, 0], ramp: [vIn, vStrike] })
  // Through the pins and into the pit, off its cushion and down into the return's track, back under the lanes
  // (seen in section), and up the lift into the rack's hood.
  const pitAt: Pt = [PIT[0] + 0.62, PIT_FLOOR - R]
  ways.push({ at: PIT_LAND, p: pitAt, arc: g(PIT_LAND - STRIKE) })
  ways.push({ at: PIT_LAND + 0.1, p: [PIT[0] + 0.12, TRACK - R], ease: 'in' })
  ways.push({ at: POP - 0.1, p: [LIFT_X + 0.08, TRACK - R] })
  ways.push({ at: POP, p: [HOOD[0] + 0.24, RAIL - 0.5], hidden: true })
  // Out of the hood, through the door onto the sidewalk, and up over the cab's nose into its back seat.
  // Out of the hood, through the door, down onto the sidewalk in front of the cab; along it under the cab's flank, past
  // its rear bumper; a kick up off the curb behind it, over the trunk and down through the rear window onto the seat.
  ways.push({ at: SIDEWALK, p: [-1.9, SIDE_Y], arc: 0.55 })
  ways.push({ at: SKIP, p: [-3.5, SIDE_Y], arc: 0.035 })
  ways.push({ at: CURB_KICK, p: [KICK_X, SIDE_Y] })
  ways.push({ at: SEAT_LAND, p: SEAT, arc: 1.3 })
  ways.push({ at: T1, p: SEAT })
  add(ways)
  return {
    segs,
    at: (t) => {
      const q = laneAt({ segs, fire: 0 }, t - T0)
      return [q.x, q.y]
    },
  }
}
export const WAY = alleyWay()

/* ------------------------------------------------------------------ Wally's walk out */

export const WALK0 = HATS + 0.1
export const WALK1 = SEAT_LAND - 0.05
/** Where Wally's feet are: by the counter, then out of the door, off the curb and round behind the cab to its driver's door. */
export function wallyAt(t: number): { x: number; y: number; walking: boolean; face: 1 | -1; sink: number } {
  const driver = SEAT[0] + CAB.driver
  if (t < WALK0) return { x: WALLY_X, y: FB, walking: false, face: 1, sink: 0 }
  const u = Math.min(1, (t - WALK0) / (WALK1 - WALK0))
  const e = u < 0.08 ? (u * u) / 0.16 : u > 0.9 ? 0.91 - ((1 - u) * (1 - u)) / 0.2 : u - 0.04
  const s = Math.max(0, Math.min(1, e / 0.91))
  const x = WALLY_X + (driver - WALLY_X) * s
  // Out of the door to the sidewalk's edge, then off the curb into the road on the cab's far side: the roof at his chest.
  const off = Math.max(0, Math.min(1, (CURB - x) / 0.6))
  const y = FB + (-0.22 - FB) * Math.min(1, s * 1.6) + (ROAD + 0.22) * off * off * (3 - 2 * off)
  const sink = Math.max(0, (t - (WALK1 - 0.3)) / 0.35)
  return { x, y, walking: u < 1, face: -1, sink: Math.min(1, sink) }
}

/** The door: shut (0) to wide open (1). Shut at the cut, rattling; Wally pushes it open, it swings to behind them. */
export function doorOpen(t: number): number {
  const open0 = WALK0 + 0.28
  if (t < open0) return 0
  if (t < open0 + 0.22) return (t - open0) / 0.22
  const shut0 = SIDEWALK + 0.35
  if (t < shut0) return 1
  return Math.max(0, 1 - (t - shut0) / 0.7)
}

/* ------------------------------------------------------------------ strikes */

export const ALLEY_STRIKES: number[] = [
  DOOR_SHUT,
  CARPET,
  RAIL_LAND,
  CLACK,
  PAN_IN,
  ...TAPS,
  SERVE,
  a(58, 3),
  at(58, 4),
  a(58, 4),
  CLUMSY,
  NET_HIT,
  ...DRIBBLE,
  PAN_BACK,
  ...HITS,
  ...BOUNCES,
  WHIFF,
  LANE_LAND,
  STRIKE,
  PIT_LAND,
  HATS,
  POP,
  SIDEWALK,
  SKIP,
  CURB_KICK,
  SEAT_LAND,
  LIGHTS,
]
  .filter((t, i, all) => all.findIndex((u) => Math.abs(u - t) < 1e-6) === i)
  .sort((x, y) => x - y)
