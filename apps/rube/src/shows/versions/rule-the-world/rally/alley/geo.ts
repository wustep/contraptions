import { laneAt, R, type Pt, type Seg } from '../../../../../parts'
import { CAB } from '../cab'
import { carried, route, smooth, type Way } from '../kit'
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

/**
 * The real rally's shots, in order, alternating from Marty's on 60.2: what kind each is. Marty's sprung bat is fixed,
 * so his variety is in the flight (a flat drive, a smash off the high ball); the mark's is in where he has to be: in
 * close to block, back off the table to fish up a lob, stretched out low for one that kicks away from him.
 */
export type Shot = 'serve' | 'drive' | 'smash' | 'winner' | 'push' | 'lob' | 'block' | 'stretch'
export const RALLY: { t: number; bounce: number; kind: Shot }[] = [
  { t: HITS[0], bounce: BOUNCES[0], kind: 'serve' },
  { t: HITS[1], bounce: BOUNCES[1], kind: 'push' },
  { t: HITS[2], bounce: BOUNCES[2], kind: 'drive' },
  { t: HITS[3], bounce: BOUNCES[3], kind: 'lob' },
  { t: HITS[4], bounce: BOUNCES[4], kind: 'smash' },
  { t: HITS[5], bounce: BOUNCES[5], kind: 'block' },
  { t: HITS[6], bounce: BOUNCES[6], kind: 'drive' },
  { t: HITS[7], bounce: BOUNCES[7], kind: 'stretch' },
  { t: HITS[8], bounce: BOUNCES[8], kind: 'drive' },
  { t: HITS[9], bounce: BOUNCES[9], kind: 'push' },
  { t: HITS[10], bounce: BOUNCES[10], kind: 'winner' },
]
/** Marty's power shots: the camera punches in on them (`ALLEY_PUNCHES`). */
export const SMASH = HITS[4]

/** The fires of Marty's bat, and which kind. */
export const FIRES: { t: number; kind: 'serve' | 'clumsy' | 'hit' | 'smash' | 'winner' }[] = [
  { t: SERVE, kind: 'serve' },
  { t: CLUMSY, kind: 'clumsy' },
  ...RALLY.filter((_, i) => i % 2 === 0).map((r) => ({ t: r.t, kind: r.kind === 'winner' ? ('winner' as const) : r.kind === 'smash' ? ('smash' as const) : ('hit' as const) })),
]
/** The mark's strokes: where his bat meets the ball (or misses it), and how. */
export interface Stroke {
  t: number
  p: Pt
  miss?: boolean
  kind?: Shot
}

/* ------------------------------------------------------------------ the rally's places */

/** How high a crossing flies over the net, and the little rise off the table up to the bat. */
const CROSS = 0.6
const RISE = 0.1
/** How high each kind of shot flies over the net. */
const ARC: Record<Shot, number> = { serve: 0.6, drive: 0.36, smash: 0.24, winner: 0.5, push: 0.55, lob: 1.55, block: 0.4, stretch: 0.62 }
/** Where the mark meets the ball, shot by shot (the first is his return of the given point's serve). */
const MARK_AT: Pt[] = [[8.84, -2.6], [8.86, -2.56], [9.78, -2.08], [8.62, -2.44], [9.5, -2.16], [8.92, -2.74]]
/** Where each of Marty's shots lands on the mark's side, and each of the mark's on his. */
const ON_MARK = [7.0, 7.95, 6.55, 8.05, 7.55]
const ON_MARTY = [4.85, 3.85, 5.3, 4.2, 4.7]
/** How high the ball kicks up off his side to the pan: the lob's comes down steep and sits up high. */
const KICK = [RISE, 0.55, RISE, 0.16, RISE]

/** The winner: low over the net, deep on his side, past him and down onto the near lane. */
const WIN_BOUNCE: Pt = [7.75, CT]
export const LAND_X = 13.9
/** Where he meets the head pin. */
export const STRIKE_X = HEADPIN - R - 0.09

/** The mark's strokes, in order. */
export const STROKES: Stroke[] = [
  { t: at(58, 4), p: MARK_AT[0], kind: 'push' },
  ...RALLY.map((r, i) => ({ r, i })).filter(({ i }) => i % 2 === 1).map(({ r, i }) => ({ t: r.t, p: MARK_AT[(i + 1) / 2], kind: r.kind })),
  { t: WHIFF, p: [9.0, -2.92], miss: true },
]

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
    { at: a(58, 3), p: [6.95, CT], arc: CROSS + 0.15 },
    { at: at(58, 4), p: MARK_AT[0], arc: RISE },
    { at: a(58, 4), p: [4.75, CT], arc: CROSS },
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
  for (let i = 0; i < RALLY.length - 1; i++) {
    const marty = i % 2 === 0
    const j = Math.floor(i / 2)
    ways.push({ at: RALLY[i].bounce, p: [marty ? ON_MARK[j] : ON_MARTY[j], CT], arc: ARC[RALLY[i].kind] })
    // Up off the table to the next bat: to the mark's, which is further off it the further back he is.
    const to = marty ? MARK_AT[j + 1] : PAN
    ways.push({ at: RALLY[i + 1].t, p: to, arc: marty ? RISE + 0.12 * Math.max(0, to[0] - 9) : KICK[j] })
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

/* ------------------------------------------------------------------ the mark's feet */

/**
 * The mark who plays: where he stands (his feet's x), how far he leans into the shot, how low he gets. He is driven
 * back off the table by Marty's drives and comes in again for the short ones, a step to every stroke; stretched out
 * low for the one that kicks away; and after the whiff he stands where it left him.
 */
export function markPose(t: number): { x: number; lean: number; crouch: number } {
  const keys: [number, number, number, number][] = [[T0, MARK_X, 0.12, 0]]
  for (const st of STROKES) {
    const stretch = st.kind === 'stretch'
    const low = st.kind === 'lob' || stretch
    keys.push([st.t - 0.12, st.p[0] + 0.86 + (stretch ? 0.3 : 0), stretch ? 0.38 : 0.2, low ? 0.2 : 0.06])
    keys.push([st.t + 0.16, st.p[0] + 0.86 + (stretch ? 0.3 : 0), st.miss ? 0.3 : 0.12, low ? 0.08 : 0])
  }
  keys.sort((p, q) => p[0] - q[0])
  let i = 0
  while (i + 1 < keys.length && keys[i + 1][0] <= t) i++
  if (i + 1 >= keys.length || t <= keys[0][0]) {
    const k = keys[Math.min(i, keys.length - 1)]
    return { x: k[1], lean: k[2], crouch: k[3] }
  }
  const [t0, x0, l0, c0] = keys[i]
  const [t1, x1, l1, c1] = keys[i + 1]
  const u = smooth(t, t0, t1)
  return { x: x0 + (x1 - x0) * u, lean: l0 + (l1 - l0) * u, crouch: c0 + (c1 - c0) * u }
}

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
  // Across the carpet to the door, his feet on its sill as he goes through; then off the step into the road on the
  // cab's far side: the roof at his chest.
  const sill = WALL[1] - 0.15
  const to = Math.max(0, Math.min(1, (WALLY_X - x) / (WALLY_X - sill)))
  const off = Math.max(0, Math.min(1, (CURB - x) / 0.6))
  const y = FB + (FLOOR - FB) * to * to * (3 - 2 * to) + (ROAD - FLOOR) * off * off * (3 - 2 * off)
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
