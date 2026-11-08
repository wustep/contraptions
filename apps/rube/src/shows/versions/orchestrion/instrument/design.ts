import { BALL_R, G, type Seg, type Sensor } from './sim'
import { BAYS, FLIGHT, SIXTEENTH, barLength, chimeLength, midiHz, pipeLength, stringLength, type Bay } from './tuning'

/**
 * The instrument, built from the ball's flight.
 *
 * A bay is designed the way its ball will play it. From where the ball leaves the rail, each part is put where the
 * ball will be an eighth later, a little lower and a step across. Where the ball is going after it — the next part,
 * an eighth on — fixes how it must leave: the velocity out is (step / eighth, (drop − ½g·eighth²) / eighth). The
 * velocities in and out then fix the part. The impulse is along the surface's normal, so the normal is the
 * difference of the two; and the restitution that turns the one into the other is the part's material — about 0.82,
 * a lively aluminium bar, along a row; about 0.65, a softer rosewood bar, where a row begins and has to take up the
 * speed of the drop from the row above; less again for the strings that turn the ball back. A bar is then cut to its
 * note's length and centred on the touch, and a string strung through it.
 *
 * So the rhythm is written in the placing and the pitch in the cutting, and the simulation (`sim.ts`) only has to be
 * honest for the music to come out: it is run forward over the finished instrument, and `run.ts` holds every contact
 * it makes to the one the bay was designed for.
 */

export const RAIL_Y = 0
export const RAIL_HALF = 0.045
/** Where a ball rolling on the rail has its centre. */
export const ROLL_Y = RAIL_Y - RAIL_HALF - BALL_R
/** The space between gates: one bay. */
export const BAY_W = 7.2
/** A ball rolls from one gate to the next in eight sixteenths, so every bay hears its ball on the same grid. */
export const RAIL_SPEED = BAY_W / (8 * SIXTEENTH)
/** The escapement: where it lets a ball go. */
export const RELEASE_X = 0
/** How long a ball falls from the rail's end at a gate to its bay's first string. */
const FALL = 0.24
/** The first gate's gap, placed so that its ball's first touch is three sixteenths after it was let go. */
export const GATE0 = RELEASE_X + RAIL_SPEED * (3 * SIXTEENTH - FALL)
export const GAP = 0.62

export const BAR_HALF = 0.05
export const STRING_HALF = 0.022
export const PIPE_BORE = 0.8
export const PIPE_WALL = 0.07

/** Above this restitution a bar is aluminium; below it, rosewood. */
export const METAL_E = 0.75

export type PartKind = 'bar' | 'string' | 'pipe' | 'chime'

export interface Part {
  id: number
  kind: PartKind
  bay: number
  hz: number
  midi: number
  /** Bars and strings: the segment, end to end, left to right. Pipes and chimes: the top at `a`, the foot at `b`. */
  ax: number
  ay: number
  bx: number
  by: number
  len: number
  /** Its restitution: what it is made of. */
  e: number
  /** Which station of its bay (0 for s1 …), or -1. */
  station: number
}

/** One contact the bay was designed for, relative to the ball's release. */
export interface Planned {
  part: number
  /** Seconds after release. */
  t: number
  x: number
  y: number
  /** The normal speed it was designed to arrive at. */
  v: number
}

export interface BayPlan {
  bay: number
  gateX: number
  planned: Planned[]
  /** When the ball comes into the pipe's mouth, after release. */
  pipeAt: number
  pipe: number
  /** The extent of what was built: the drawing's frame and the camera's. */
  box: { x0: number; y0: number; x1: number; y1: number }
}

export interface Machine {
  parts: Part[]
  segs: Seg[]
  sensors: Sensor[]
  bays: BayPlan[]
  /** The trough's floor at `x`: where a ball lands at the foot of the bays. */
  troughY(x: number): number
  troughX0: number
  troughX1: number
  /** The lift: where it stands, its foot and its head. */
  liftX: number
  liftFoot: number
  liftHead: number
  /** The hopper's track, from the lift's head down to the escapement. */
  track: { x0: number; y0: number; x1: number; y1: number }
  /** The beam the chimes hang from. */
  beamY: number
  /** The gate flaps: which bay, and its gap on the rail. */
  gates: { bay: number; x0: number; x1: number }[]
  rail: { x0: number; x1: number }
  /** Everything, for the camera's widest frame. */
  box: { x0: number; y0: number; x1: number; y1: number }
}

/* ------------------------------------------------------------------ the bounce */

type V2 = [number, number]

/**
 * The part at a touch: the ball arrives at `p` moving `v`, and is to come down `dx` across and `dy` lower one flight
 * of `dt` later. Its normal (out of the surface, towards the ball), the restitution that does it, and how the ball
 * arrives at the next touch.
 */
export function bounce(v: V2, dt: number, dx: number, dy: number): { n: V2; e: number; u: V2; arrive: V2 } {
  const u: V2 = [dx / dt, (dy - 0.5 * G * dt * dt) / dt]
  const d: V2 = [u[0] - v[0], u[1] - v[1]]
  const l = Math.hypot(d[0], d[1])
  const n: V2 = [d[0] / l, d[1] / l]
  const vin = v[0] * n[0] + v[1] * n[1]
  const vout = u[0] * n[0] + u[1] * n[1]
  return { n, e: -vout / vin, u, arrive: [u[0], u[1] + G * dt] }
}

/* ------------------------------------------------------------------ the build */

/** A station: what is struck, and where the ball is to go from it. */
interface Station {
  kind: 'bar' | 'string'
  midi: number
  /** Across and down to the next touch, cells. */
  dx: number
  dy: number
}

/** How far a ball comes down from bar to bar along a row, and across. */
const ROW_DROP = 0.4
const STEP_1 = 0.9
const STEP_2 = -0.95
const STEP_3 = 1.12
/** How far a string at a row's end drops the ball to the row below: clear of the arcs over that row. */
const TURN_DROP = 1.7
/**
 * The step from a row's last bar out to its string, and back from the string to the next row. The way back passes
 * under the last bar, so the string stands well out from it and the step back is short: by the time the ball is back
 * under the bar it has come down past it.
 */
const TURN_OUT = 1.18
const TURN_BACK = 0.8
/** From the last bar over its end and down into the pipe's mouth. */
const INTO_PIPE: [number, number] = [1.2, 1.1]

export function buildMachine(): Machine {
  const parts: Part[] = []
  const segs: Seg[] = []
  const sensors: Sensor[] = []
  const bays: BayPlan[] = []
  const gates: Machine['gates'] = []

  const add = (part: Omit<Part, 'id'>): Part => {
    const p = { ...part, id: parts.length }
    parts.push(p)
    return p
  }

  BAYS.forEach((bay, k) => {
    const gateX = GATE0 + k * BAY_W
    bays.push(designBay(bay, k, gateX, add, segs, sensors))
    if (k < BAYS.length - 1) gates.push({ bay: k, x0: gateX, x1: gateX + GAP })
  })

  // The rail: from the escapement to the last gate, cut at each gate's gap (the flaps fill the gaps, `run.ts`).
  const railX0 = RELEASE_X - 0.35
  const lastGate = GATE0 + (BAYS.length - 1) * BAY_W
  let from = railX0
  for (const g of gates) {
    segs.push({ ax: from, ay: RAIL_Y, bx: g.x0, by: RAIL_Y, half: RAIL_HALF, e: 0, material: 'rail', caps: false, part: -1 })
    from = g.x1
  }
  segs.push({ ax: from, ay: RAIL_Y, bx: lastGate, by: RAIL_Y, half: RAIL_HALF, e: 0, material: 'rail', caps: false, part: -1 })

  // The chimes: one over each bay, left of its gate, hung from the beam.
  const beamY = -3.7
  BAYS.forEach((bay, k) => {
    const hz = midiHz(bay.chime)
    const len = chimeLength(hz)
    const x = GATE0 + k * BAY_W - 0.5
    add({ kind: 'chime', bay: k, hz, midi: bay.chime, ax: x, ay: beamY + 0.3, bx: x, by: beamY + 0.3 + len, len, e: 0, station: -1 })
  })

  // The trough: under every pipe, falling to the left, to the lift's foot.
  const liftX = -2.1
  const troughBase = Math.max(...bays.map((b) => b.box.y1)) + 0.75
  const troughX0 = liftX + 0.25
  const troughX1 = GATE0 + (BAYS.length - 1) * BAY_W + 6.6
  const slope = 0.03
  const troughY = (x: number): number => troughBase + (troughX1 - x) * slope

  const liftHead = -2.6
  const track = { x0: liftX + 0.4, y0: liftHead + 0.3, x1: RELEASE_X - 0.02, y1: ROLL_Y }

  const box = {
    x0: liftX - 1.6,
    y0: beamY - 0.6,
    x1: Math.max(troughX1, ...bays.map((b) => b.box.x1)) + 0.4,
    y1: troughY(troughX0) + 0.6,
  }

  return { parts, segs, sensors, bays, troughY, troughX0, troughX1, liftX, liftFoot: troughY(troughX0), liftHead, track, beamY, gates, rail: { x0: railX0, x1: lastGate }, box }
}

function designBay(bay: Bay, k: number, gateX: number, add: (part: Omit<Part, 'id'>) => Part, segs: Seg[], sensors: Sensor[]): BayPlan {
  const planned: Planned[] = []
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }
  const grow = (x: number, y: number) => {
    box.x0 = Math.min(box.x0, x)
    box.x1 = Math.max(box.x1, x)
    box.y0 = Math.min(box.y0, y)
    box.y1 = Math.max(box.y1, y)
  }

  // Off the rail's end at the gate, the ball falls to the first string.
  const tEdge = (gateX - RELEASE_X) / RAIL_SPEED
  let p: V2 = [gateX + RAIL_SPEED * FALL, ROLL_Y + 0.5 * G * FALL * FALL]
  let v: V2 = [RAIL_SPEED, G * FALL]
  let t = tEdge + FALL

  const row = (notes: number[], step: number, turn: number): Station[] =>
    notes.map((midi, i) => ({ kind: 'bar' as const, midi, dx: i === notes.length - 1 ? turn : step, dy: ROW_DROP }))
  const r1 = row(bay.row1, STEP_1, TURN_OUT)
  const r2 = row(bay.row2, STEP_2, -TURN_OUT - 0.08)
  const r3 = row(bay.row3, STEP_3, INTO_PIPE[0])
  r3[r3.length - 1].dy = INTO_PIPE[1]
  const stations: Station[] = [
    // The first string takes the fall from the rail, and bounces the ball low enough to pass under the rail again.
    { kind: 'string', midi: bay.s1, dx: STEP_1, dy: 0.62 },
    ...r1,
    { kind: 'string', midi: bay.s2, dx: -TURN_BACK, dy: TURN_DROP },
    ...r2,
    { kind: 'string', midi: bay.s3, dx: TURN_BACK, dy: TURN_DROP },
    ...r3,
  ]

  stations.forEach((st, i) => {
    const b = bounce(v, FLIGHT, st.dx, st.dy)
    if (!(b.e > 0.2 && b.e < 0.97)) throw new Error(`orchestrion: bay ${bay.name}, station ${i} would need a restitution of ${b.e.toFixed(3)}`)
    const half = st.kind === 'bar' ? BAR_HALF : STRING_HALF
    // The surface under the ball, and the part's centre line through it.
    const cx = p[0] - b.n[0] * (BALL_R + half)
    const cy = p[1] - b.n[1] * (BALL_R + half)
    // Along the part, left to right.
    let tx = -b.n[1]
    let ty = b.n[0]
    if (tx < 0) {
      tx = -tx
      ty = -ty
    }
    const hz = midiHz(st.midi)
    const len = st.kind === 'bar' ? barLength(hz) : stringLength(hz)
    // A bar is struck at its middle. A string is struck near one end, and strung back the way the ball came, so it
    // never reaches over the part the ball is going to.
    const along = st.kind === 'bar' ? 0.5 : st.dx > 0 ? 0.88 : 0.12
    const ax = cx - tx * len * along
    const ay = cy - ty * len * along
    const bx = cx + tx * len * (1 - along)
    const by = cy + ty * len * (1 - along)
    const part = add({ kind: st.kind, bay: k, hz, midi: st.midi, ax, ay, bx, by, len, e: b.e, station: i })
    segs.push({ ax, ay, bx, by, half, e: b.e, material: st.kind === 'bar' ? 'bar' : 'string', caps: true, part: part.id })
    planned.push({ part: part.id, t, x: p[0], y: p[1], v: -(v[0] * b.n[0] + v[1] * b.n[1]) })
    grow(ax, ay)
    grow(bx, by)
    p = [p[0] + st.dx, p[1] + st.dy]
    v = b.arrive
    t += FLIGHT
  })

  // The pipe, its mouth where the ball comes down after the last bar.
  const hz = midiHz(bay.pipe)
  const len = pipeLength(hz)
  const px = p[0]
  const top = p[1]
  const pipe = add({ kind: 'pipe', bay: k, hz, midi: bay.pipe, ax: px, ay: top, bx: px, by: top + len, len, e: 0.35, station: -1 })
  const wallX = PIPE_BORE / 2 + PIPE_WALL
  for (const side of [-1, 1]) {
    segs.push({ ax: px + side * wallX, ay: top, bx: px + side * wallX, by: top + len, half: PIPE_WALL, e: 0.35, material: 'brass', caps: true, part: pipe.id })
  }
  sensors.push({ part: pipe.id, x0: px - PIPE_BORE / 2, y0: top, x1: px + PIPE_BORE / 2, y1: top + len })
  grow(px - 0.6, top)
  grow(px + 0.6, top + len)

  return { bay: k, gateX, planned, pipeAt: t, pipe: pipe.id, box }
}
