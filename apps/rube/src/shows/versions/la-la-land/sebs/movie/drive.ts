import type p5 from 'p5'
import { mixHex, type Pt, type Seg } from '../../../../../parts'
import { neonArrow, ROOM } from '../club/room'
import { alpha, box, carried, frame, glow, hash, knock, part, ring, rgba, smooth, type Ctx, type PartShot } from '../kit'
import { DRIVE_MAT as D } from '../worlds'
import { lightBatch } from '../city'
import { box2, seg, shape, soft, trackAt, vgrad, type Key } from './movie-kit'

/**
 * The drive home, and out again: night on the freeway, the first scene of the
 * film come round at the other end of the day. They sit in his convertible in
 * a jam on the high interchange, the city lit beyond it. The music comes in
 * phrases with silence between, and the jam moves on them: a wave of brake
 * lights comes back down the line, one car inching up and stopping on each
 * note, and theirs last. In the silences nothing moves.
 *
 * On the third phrase he pulls out of the line and down the exit ramp, the
 * wheels knocking over its joints on the notes; on the fourth the sodium lamps
 * of the street below come on one ahead of another as they pass under them,
 * and he stops on its last note, short of a door. They sit in the dark. On the
 * last phrase the blue neon arrow over the door buzzes on, pointing down; the
 * car door swings open, they go to the door together, and the dark comes.
 *
 * The part's frame: he sits at the wheel (0.5 left of 0, 0), the car on the
 * freeway's deck, its road 0.42 below him; the street is 3.4 lower.
 */

/* ------------------------------------------------------------------ the music */

const BEGIN = 395.3
const END = 423.4
/** The jam: a car stops on each note, from the front of the line back to them. */
const P1 = [396.144, 396.655, 397.201, 397.711, 398.315, 398.907]
const P2 = [402.262, 402.866, 403.331, 403.76, 404.225, 404.91, 405.513]
/** Out of the line, and the ramp's joints under the wheels. */
const PULL = 408.776
const JOINTS = [409.263, 409.67, 410.575, 411.167, 411.771]
/** The street's lamps coming on ahead of them, and the stop. */
const LAMPS = [414.917, 415.846, 416.752]
const STOP = 418.017
/** The neon over the door; the car door. */
const NEON = 421.059
const OPEN = 421.709

export const DRIVE_HITS = [...P1, ...P2, PULL, ...JOINTS, ...LAMPS, STOP, NEON, OPEN]

/* ------------------------------------------------------------------ the road */

const RD = 0.52
const STREET = RD + 3.4
/**
 * The deck has two lanes, seen from a little above: the jam stands in the far one (its road is RD), and the near one
 * runs along the deck's edge, this much lower, where the exit ramp leaves. Pulling out, he swings down into the near
 * lane, so he passes in front of the car ahead and not into it.
 */
const FAR = 0.13
const EDGE = RD + FAR
const TOP = 0.24
const laneAt = (t: number): number => -FAR * (1 - smooth(t, PULL + 0.05, PULL + 0.75))
/** The car: its length, its wheels (from the rear bumper), the beltline; where each of them sits on the bench. */
const LEN = 2.3
const WB: [number, number] = [0.45, 1.85]
const WR = 0.19
const BELT = 0.42
/** Their centres above the road: well up over the door, so the two of them read in the open car. */
const SIT = RD
const SEB_U = 1.28
const MIA_U = 0.98
/** Their car's rear bumper at the start, and the spacing of the line. */
const X0 = -0.5 - SEB_U
const GAP = 2.85
const INCH = 0.55

/** The jam's cars ahead of theirs (1 is the next) and behind (-1): each stops on its note in each phrase. */
function stopsOf(i: number): number[] {
  const out: number[] = []
  if (i >= 1 && i <= 5) out.push(P1[5 - i], P2[5 - i])
  if (i === 0) out.push(P1[5], P2[5])
  if (i === -1) out.push(P2[6])
  return out
}
const CARS = [-2, -1, 1, 2, 3, 4, 5, 6, 7, 8]
/** How far a car of the line has inched at t: each move eases up to its stop on the note. */
function inched(i: number, t: number): number {
  let d = 0
  for (const n of stopsOf(i)) d += INCH * smooth(t, n - 0.55, n)
  return d
}

/** Their speed after pulling out (cells a second), and the distance that makes, tabulated. */
function speedAt(t: number): number {
  if (t <= PULL) return 0
  if (t < 409.5) return 2.4 * soft((t - PULL) / (409.5 - PULL))
  if (t < 412.2) return 2.4 + 0.8 * soft((t - 409.5) / 2.7)
  if (t < 415.0) return 3.2 - 1.0 * soft((t - 412.2) / 2.8)
  if (t < 417.3) return 2.2 - 0.8 * soft((t - 415.0) / 2.3)
  if (t < STOP) return 1.4 * (1 - (t - 417.3) / (STOP - 417.3)) ** 2
  return 0
}
const DT = 1 / 240
const RUN = (() => {
  const n = Math.ceil((STOP + 0.1 - PULL) / DT)
  const out = new Float64Array(n + 1)
  for (let i = 1; i <= n; i++) {
    const a = PULL + (i - 1) * DT
    out[i] = out[i - 1] + (DT / 6) * (speedAt(a) + 4 * speedAt(a + DT / 2) + speedAt(a + DT))
  }
  return out
})()
function driven(t: number): number {
  if (t <= PULL) return 0
  const f = Math.min(RUN.length - 1, (t - PULL) / DT)
  const i = Math.min(RUN.length - 2, Math.floor(f))
  return RUN[i] + (RUN[i + 1] - RUN[i]) * (f - i)
}
/** Their rear bumper at t. */
const rearAt = (t: number): number => X0 + inched(0, t) + driven(t)

/** The exit ramp: it leaves the deck just ahead of where they wait and comes down to the street. */
const RAMP0 = rearAt(PULL) + LEN + 0.3
const RAMP1 = RAMP0 + 11
const roadAt = (x: number): number => EDGE + (STREET - EDGE) * smooth(x, RAMP0, RAMP1)

/** Where they stop, the kerb, and the club's door: its wall's outer face and the threshold (a ball's centre on it). */
const PARK = rearAt(STOP + 1)
const KERB = PARK + LEN + 0.3
const WALK = STREET - 0.08
const DOOR_X = PARK + LEN + 1.35
const WALL = DOOR_X - (ROOM.wallL1 - ROOM.wallL0) / 2
const DOOR_Y = WALK - 0.13
/** The door's head above the walk, as the club has it. */
const DOOR_TOP = WALK - (ROOM.floor - ROOM.doorTop)

/* ------------------------------------------------------------------ their car */

interface Pose {
  x: number
  y: number
  a: number
}

/** Their car at t: its rear wheel's contact, and its tilt (the road's slope, the brakes, the joints). */
function poseAt(t: number): Pose {
  const x = rearAt(t)
  const yb = roadAt(x + WB[0])
  const yf = roadAt(x + WB[1])
  let a = Math.atan2(yf - yb, WB[1] - WB[0])
  let lift = 0
  // A nose-dip at each stop, settling heavy; a squat as he pulls away.
  for (const n of [P1[5], P2[5], STOP]) a += 0.035 * ring(t - n, 1.3, 0.28)
  const go = t - PULL
  if (go > 0) a -= 0.03 * (1 - Math.exp(-go / 0.15)) * Math.exp(-go / 0.5)
  // Each joint of the ramp: a knock up through the springs.
  for (const j of JOINTS) lift += 0.04 * ring(t - j, 2.6, 0.16)
  return { x: x + WB[0], y: yb - lift + laneAt(t), a }
}

/** A point of their car's body (u from the rear bumper, v up from the road) at t. */
function bodyAt(ps: Pose, u: number, v: number): Pt {
  const du = u - WB[0]
  const c = Math.cos(ps.a)
  const s = Math.sin(ps.a)
  return [ps.x + du * c + v * s, ps.y + du * s - v * c]
}
const seatAt = (u: number) => (t: number): Pt => bodyAt(poseAt(t), u, SIT)

/** The near door: 0 shut, 1 swung wide. */
const doorAt = (t: number): number => (t < OPEN ? 0 : soft((t - OPEN) / 0.35) - 0.06 * Math.max(0, ring(t - OPEN - 0.35, 1.8, 0.3)))

/** When he starts out of the car: from then the car is behind them. */
const OUT = 421.75

/** Out through the open door and down beside the car, then along the walk to the threshold. */
function walkKeys(u: number, off: number, go: number): Key[] {
  return [
    { t: go, p: seatAt(u)(go) },
    { t: go + 0.42, p: [PARK + u + 0.25, STREET - 0.13] },
    { t: END, p: [DOOR_X - off, DOOR_Y] },
  ]
}
const SEB_WALK = walkKeys(SEB_U, 0, OUT)
const MIA_WALK = walkKeys(MIA_U, 0.33, 422.02)

/* ------------------------------------------------------------------ the part */

interface DriveState {
  begin: number
}

export const drive = part<DriveState>(
  {
    name: 'drive',
    draw: (p, s, c) => drawDrive(p, c.t + s.begin, c),
    over: (p, s, c) => {
      const t = c.t + s.begin
      if (t < OUT) carBody(p, c, t, true)
    },
  },
  (slot) => {
    const b = slot.begin
    const segs: Seg[] = carried(seatAt(SEB_U), b, SEB_WALK[0].t, Math.ceil((SEB_WALK[0].t - b) * 24))
    // Out of the car and to the door, sampled from the same keys her walk uses.
    segs.push(...carried((t) => trackAt(SEB_WALK, t), SEB_WALK[0].t, END, 40))
    // (Round the lane's sampled end onto the threshold exactly.)
    segs[segs.length - 1].to = [DOOR_X, DOOR_Y]
    return {
      cells: box(-8, -9, DOOR_X + 8, STREET + 3, 2),
      exit: [DOOR_X + 0.5, DOOR_Y],
      lane: { segs, fire: P1[5] - b },
      state: { begin: b },
      company: [
        {
          from: BEGIN,
          to: END,
          who: 'mia',
          at: (t) => {
            // She sits close beside him; in the silence after the first phrase she leans in to him, and again when they have stopped.
            const lean = 0.05 * smooth(t, 399.3, 400.4) * (1 - smooth(t, 401.8, 402.3)) + 0.05 * smooth(t, 418.6, 419.6) * (1 - smooth(t, 421.0, 421.5))
            const [x, y] = t < MIA_WALK[0].t ? bodyAt(poseAt(t), MIA_U + lean, SIT) : trackAt(MIA_WALK, t)
            return { x, y }
          },
        },
      ],
    }
  },
  (): PartShot[] => [
    // The jam, from beside them: the next cars ahead, the wave coming back down the line.
    { t: BEGIN, cells: 6.4, hold: [1.2, -0.55] },
    { t: 398.9, cells: 6.2, hold: [1.0, -0.5] },
    // In the silence between the waves, close on the two of them in his car, her leaning in to him, the city and the
    // river of lights going by behind them; out again as the wave comes back down the line to them.
    { t: 400.3, cells: 2.6, hold: [-0.55, -0.42] },
    { t: 403.9, cells: 2.45, hold: [-0.5, -0.42] },
    { t: 405.3, cells: 6.2, hold: [1.3, -0.55] },
    // The long silence: out wide, the line of lights along the high road, the ramp going down, the city under the stars.
    { t: 407.6, cells: 10.6, hold: [5.8, -0.1] },
    { t: PULL + 0.4, cells: 10.2, hold: [6.2, 0.05] },
    // Down the ramp with them, and along the street under its lamps.
    { t: 411.2, cells: 8.5, w: 0, off: [1.2, -0.6] },
    { t: 415.2, cells: 6.2, w: 0, off: [1.4, -0.7] },
    { t: STOP, cells: 5.4, hold: [PARK + 2.2, STREET - 1.75] },
    // Parked at the door, the sign, the two of them going in.
    { t: 420.6, cells: 5.0, hold: [PARK + 2.3, STREET - 1.85] },
    { t: 422.9, cells: 4.4, hold: [DOOR_X - 0.9, STREET - 1.0] },
  ],
)

/* ------------------------------------------------------------------ the drawing */

/** The city beyond: buildings with some windows lit, far off (it moves half as fast as the road). */
const TOWERS = Array.from({ length: 44 }, (_, i) => {
  const x = -30 + i * 1.9 + hash(i, 1) * 1.2
  const w = 1.1 + 1.6 * hash(i, 2)
  const h = 2.5 + 7 * hash(i, 3) * hash(i, 4) + 1.5 * hash(i, 5)
  const lit: [number, number, number][] = []
  for (let cx = 0.2; cx < w - 0.15; cx += 0.36) for (let cy = 0.4; cy < h - 0.2; cy += 0.5) {
    const v = hash(i * 97 + Math.round(cx * 10), Math.round(cy * 10), 7)
    if (v < 0.3) lit.push([cx, cy, v < 0.07 ? 1 : 0])
  }
  // On its roof: the tallest a red lamp; two of the lower ones a billboard; some an old water tank.
  const r = hash(i, 6)
  const roof: 'beacon' | 'board' | 'tank' | null = i === 13 || i === 25 ? 'board' : h > 6.5 ? 'beacon' : w > 1.5 && r < 0.45 ? 'tank' : null
  return { x, w, h, lit, roof, board: i === 13 ? 1 : 0 }
})
/** The sky over it: stars, and the hills along the far side of the basin (both all but still as the camera goes). */
const SKY_STARS = Array.from({ length: 320 }, (_, i) => ({ x: -40 + hash(i, 21) * 110, y: -11 + hash(i, 22) * 10.2, r: 0.02 + 0.035 * hash(i, 23) ** 2, a: 0.35 + 0.55 * hash(i, 24) }))
const RIDGE: Pt[] = Array.from({ length: 401 }, (_, i) => {
  const x = -40 + i * 0.3
  return [x, -0.7 - 1.3 * Math.sin(x * 0.19 + 1.3) ** 2 - 0.45 * Math.sin(x * 0.53 + 0.4) ** 2]
})

function drawDrive(p: p5, t: number, c: Ctx): void {
  const { k, ink, weight } = c
  const w = weight
  const fr = frame(p, k)
  const line = rgba(ink, 0.3)
  // The night: deep overhead, indigo lower, and the city's own glow on the haze over the basin.
  {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const g = ctx.createLinearGradient(0, -10 * k, 0, (STREET - 0.5) * k)
    g.addColorStop(0, D.night)
    g.addColorStop(0.5, D.dusk)
    g.addColorStop(0.85, D.glowLow)
    g.addColorStop(1, mixHex(D.glowLow, D.sodium, 0.35))
    ctx.fillStyle = g
    ctx.fillRect((fr.x0 - 1) * k, (fr.y0 - 1) * k, (fr.x1 - fr.x0 + 2) * k, (fr.y1 - fr.y0 + 2) * k)
  }
  // The stars and the far hills, the sodium haze along their foot.
  const far = fr.cx * 0.85
  p.noStroke()
  for (const st of SKY_STARS) {
    const x = st.x + far
    if (x < fr.x0 - 0.2 || x > fr.x1 + 0.2 || st.y < fr.y0 - 0.2 || st.y > fr.y1) continue
    p.fill(alpha(p, D.head, st.a))
    p.circle(x * k, st.y * k, 2 * st.r * k)
  }
  // Planes in a line on their way down, steady landing lights each a little after the last, the way the night sky
  // over the basin always has them.
  planes(p, k, t, fr)
  const hills = fr.cx * 0.7
  p.fill(alpha(p, D.brick, 0.5))
  p.beginShape()
  p.vertex((RIDGE[0][0] + hills) * k, (STREET + 1) * k)
  for (const [x, y] of RIDGE) p.vertex((x + hills) * k, y * k)
  p.vertex((RIDGE[RIDGE.length - 1][0] + hills) * k, (STREET + 1) * k)
  p.endShape(p.CLOSE)
  // The city, half as fast as the road.
  const par = 0.5
  const ox = fr.cx * par
  const base = STREET + 0.8
  const ctx = p.drawingContext as CanvasRenderingContext2D
  for (const tw of TOWERS) {
    const x0 = tw.x + ox
    if (x0 > fr.x1 + 1 || x0 + tw.w < fr.x0 - 1) continue
    // Cool in the dark, its top catching the haze's warmth; a fine light edge along its roof.
    const g = ctx.createLinearGradient(0, (base - tw.h) * k, 0, (base - tw.h + 2.5) * k)
    g.addColorStop(0, D.towerTop)
    g.addColorStop(1, D.tower)
    p.noStroke()
    p.fill(D.tower)
    ctx.fillStyle = g
    // (This drawing's rects are centred.)
    p.rect((x0 + tw.w / 2) * k, (base - tw.h / 2) * k, tw.w * k, tw.h * k)
    p.stroke(rgba(D.sodium, 0.22))
    p.strokeWeight(Math.max(1, w * 0.5))
    p.line(x0 * k, (base - tw.h) * k, (x0 + tw.w) * k, (base - tw.h) * k)
    p.noStroke()
    for (const [lx, ly, cool] of tw.lit) {
      p.fill(cool ? alpha(p, D.white, 0.5) : alpha(p, D.sodium, 0.7))
      p.rect((x0 + lx) * k, (base - tw.h + ly) * k, 0.12 * k, 0.16 * k)
    }
    // What stands on the roofs: a water tank on its legs, a billboard lit from below, or on the tallest a red lamp for
    // the planes, blinking slowly, each in its own time.
    roof(p, k, t, tw, x0, base - tw.h)
  }
  // Across the basin, another freeway, and it is moving: a river of tail lights going one way and headlights the
  // other, as far as the eye goes, under and beyond their jam.
  river(p, k, t, fr, ox)
  // Nearer, behind the jam: the Metro on its viaduct, and the freeway's other carriageway, which is moving.
  metro(p, k, t, fr)
  oncoming(p, k, ink, w, t, fr)
  // The street below, and the ground under it falling away into the dark.
  shape(p, k, [[fr.x0 - 1, STREET], [fr.x1 + 1, STREET], [fr.x1 + 1, fr.y1 + 1], [fr.x0 - 1, fr.y1 + 1]], D.asphalt, null)
  vgrad(p, k, fr.x0 - 1, STREET + 0.3, fr.x1 + 1, Math.max(STREET + 1.5, fr.y1 + 1), [[0, rgba(D.frame, 0)], [1, rgba(D.frame, 0.85)]])
  seg(p, k, [fr.x0 - 1, STREET], [fr.x1 + 1, STREET], line, w)
  // Its lanes: a dashed line down the middle.
  if (STREET + 0.3 < fr.y1 + 1) {
    const ctx0 = p.drawingContext as CanvasRenderingContext2D
    ctx0.fillStyle = rgba(D.head, 0.16)
    for (let x = Math.floor(fr.x0 - 1); x < fr.x1 + 1; x += 1.4) ctx0.fillRect(x * k, (STREET + 0.25) * k, 0.65 * k, 0.035 * k)
  }
  // The freeway: its piers, its far rail, its deck.
  for (let x = Math.floor((fr.x0 - 2) / 6) * 6; x < fr.x1 + 2; x += 6) shape(p, k, [[x - 0.22, EDGE + 0.35], [x + 0.22, EDGE + 0.35], [x + 0.3, STREET], [x - 0.3, STREET]], rgba(D.brick, 0.9), line, w * 0.6)
  seg(p, k, [fr.x0 - 1, EDGE - TOP - 0.5], [fr.x1 + 1, EDGE - TOP - 0.5], rgba(ink, 0.18), w * 0.8)
  for (let x = Math.floor(fr.x0); x < fr.x1 + 1; x += 1) seg(p, k, [x, EDGE - TOP - 0.5], [x, EDGE - TOP], rgba(ink, 0.1), w * 0.5)
  // The deck's top, its two lanes and the dashes between them; then its edge.
  shape(p, k, [[fr.x0 - 1, EDGE - TOP], [fr.x1 + 1, EDGE - TOP], [fr.x1 + 1, EDGE], [fr.x0 - 1, EDGE]], D.asphalt, null)
  vgrad(p, k, fr.x0 - 1, EDGE - TOP, fr.x1 + 1, EDGE, [[0, rgba(D.frame, 0.35)], [1, rgba(D.frame, 0)]])
  for (let x = Math.floor(fr.x0 - 1); x < fr.x1 + 1; x += 1.2) seg(p, k, [x, RD + 0.06], [x + 0.5, RD + 0.06], rgba(ink, 0.12), w * 0.5)
  seg(p, k, [fr.x0 - 1, EDGE - TOP], [fr.x1 + 1, EDGE - TOP], rgba(ink, 0.15), w * 0.6)
  shape(p, k, [[fr.x0 - 1, EDGE], [fr.x1 + 1, EDGE], [fr.x1 + 1, EDGE + 0.35], [fr.x0 - 1, EDGE + 0.35]], D.asphalt, line, w)
  // The freeway's tall lamps, and their pools on the deck.
  for (let x = Math.floor((fr.x0 - 3) / 7) * 7 + 3; x < fr.x1 + 3; x += 7) sodium(p, k, ink, w, x, EDGE - TOP, 2.6, 1)
  // The line of cars: headlamps on the car ahead's tail, tails flaring as each stops.
  for (const i of CARS) {
    const x = X0 + i * GAP + inched(i, t)
    if (x > fr.x1 + 1 || x + LEN < fr.x0 - 1) continue
    sedan(p, k, ink, w, x, i, t)
  }
  // Further along the line, and back down it: only their lights.
  for (let j = 9; j < 26; j++) lights(p, k, X0 + j * GAP, fr)
  for (let j = -3; j > -12; j--) lights(p, k, X0 + j * GAP, fr)
  // The exit ramp, in front of the deck, coming down to the street, its joints; its thin piers.
  ramp(p, k, ink, w, fr)
  // The street's lamps, lit one ahead of another as they come.
  for (let i = 0; i < LAMPS.length; i++) streetLamp(p, k, ink, w, i, t)
  // The club: its wall and door, the awning, the neon.
  club(p, k, ink, w, t, fr)
  // People out on the walk, under the club's window.
  walkers(p, k, t, fr)
  // Their car: the body drawn over them while they sit in it (see `over`), behind them once they are out.
  carBody(p, c, t, false)
  if (t >= OUT) carBody(p, c, t, true)
  // Nearest of all, between us and the road: the near sidewalk, its meters and its lamps, which go by faster than
  // anything when the camera moves.
  nearSide(p, k, fr)
}

/** The far freeway: its height on the picture, and its two streams' cars (where each starts, its gap, its speed). */
const RIVER_Y = 1.75
const RIVER2_Y = 1.32
const STREAMS = [
  { y: RIVER_Y - 0.05, v: -1.15, color: D.tail, cars: Array.from({ length: 90 }, (_, i) => -40 + i * 1.05 + 0.6 * hash(i, 91)) },
  { y: RIVER_Y + 0.05, v: 1.35, color: D.head, cars: Array.from({ length: 90 }, (_, i) => -40 + i * 1.1 + 0.7 * hash(i, 92)) },
  { y: RIVER2_Y - 0.03, v: 0.8, color: D.tail, cars: Array.from({ length: 110 }, (_, i) => -40 + i * 0.86 + 0.5 * hash(i, 93)) },
  { y: RIVER2_Y + 0.03, v: -0.7, color: D.head, cars: Array.from({ length: 110 }, (_, i) => -40 + i * 0.9 + 0.5 * hash(i, 94)) },
]
function river(p: p5, k: number, t: number, fr: { x0: number; x1: number; y0: number; y1: number; cx: number }, ox: number): void {
  if (RIVER_Y < fr.y0 - 1 || RIVER_Y > fr.y1 + 1) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // Further off, a second road across the basin, its lights smaller and slower, one more depth before the hills.
  const ox2 = fr.cx * 0.62
  ctx.fillStyle = rgba(D.frame, 0.6)
  ctx.fillRect((fr.x0 - 1) * k, (RIVER2_Y + 0.05) * k, (fr.x1 - fr.x0 + 2) * k, 0.04 * k)
  // Its deck, a dark band, and its tall lamps along it, a dotted line of sodium.
  ctx.fillStyle = rgba(D.frame, 0.85)
  ctx.fillRect((fr.x0 - 1) * k, (RIVER_Y + 0.1) * k, (fr.x1 - fr.x0 + 2) * k, 0.07 * k)
  ctx.fillStyle = rgba(D.sodium, 0.55)
  for (let x = Math.floor((fr.x0 - ox) / 1.6) * 1.6; x + ox < fr.x1 + 1; x += 1.6) ctx.fillRect((x + ox) * k, (RIVER_Y - 0.32) * k, 0.07 * k, 0.03 * k)
  const span = 95
  const dots = lightBatch()
  for (const [st, o, sc] of [[STREAMS[2], ox2, 0.6], [STREAMS[3], ox2, 0.6], [STREAMS[0], ox, 1], [STREAMS[1], ox, 1]] as const) {
    for (const c0 of st.cars) {
      let x = c0 + st.v * (t - BEGIN)
      x = ((((x + 40) % span) + span) % span) - 40 + o
      if (x < fr.x0 - 0.3 || x > fr.x1 + 0.3) continue
      // A car's pair of lamps, and the faint light of them on the road.
      dots.rect(st.color, 0.18, (x - 0.16 * sc) * k, (st.y + 0.02) * k, 0.32 * sc * k, 0.03 * k)
      dots.dot(st.color, 0.95, (x - 0.035 * sc) * k, st.y * k, 0.026 * sc * k)
      dots.dot(st.color, 0.95, (x + 0.035 * sc) * k, st.y * k, 0.026 * sc * k)
    }
  }
  dots.fill(ctx)
}

/* ------------------------------------------------------------------ round the jam */

/** The planes' line in the sky (in the sky's own slow layer): from high on the left, coming down to the right. */
const PLANE_A: Pt = [-34, -8.2]
const PLANE_B: Pt = [44, -3.4]
/** One along the line every so many seconds; how long one takes from end to end. */
const PLANE_EVERY = 9
const PLANE_RUN = 100
function planes(p: p5, k: number, t: number, fr: { x0: number; x1: number; y0: number; y1: number; cx: number }): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const ox = fr.cx * 0.88
  const px = Math.max(1, ((fr.y1 - fr.y0) * k) / 540)
  for (let i = -1; i < PLANE_RUN / PLANE_EVERY + 1; i++) {
    const u = (t - BEGIN + 37 + i * PLANE_EVERY) / PLANE_RUN
    const f = u - Math.floor(u)
    const x = PLANE_A[0] + (PLANE_B[0] - PLANE_A[0]) * f + ox
    const y = PLANE_A[1] + (PLANE_B[1] - PLANE_A[1]) * f
    if (x < fr.x0 - 0.5 || x > fr.x1 + 0.5 || y < fr.y0 - 0.5 || y > fr.y1 + 0.5) continue
    // Nearer as it comes down, so a little larger.
    const s = 0.75 + 0.5 * f
    ctx.fillStyle = rgba('#FFF4DC', 0.92)
    ctx.beginPath()
    ctx.arc(x * k, y * k, Math.max(1.1 * px, 0.035 * s * k), 0, Math.PI * 2)
    ctx.fill()
    // Its wingtips, red and green, and the faint shape of it against the haze.
    ctx.fillStyle = rgba(D.beacon, 0.85)
    ctx.fillRect((x - 0.16 * s) * k - px * 0.6, (y - 0.03 * s) * k, px * 1.2, px * 1.2)
    ctx.fillStyle = rgba('#5BD08A', 0.85)
    ctx.fillRect((x + 0.16 * s) * k - px * 0.6, (y - 0.03 * s) * k, px * 1.2, px * 1.2)
  }
}

/** What stands on a tower's roof, by its place in the skyline: a water tank, a billboard, a red lamp. */
function roof(p: p5, k: number, t: number, tw: (typeof TOWERS)[number], x0: number, top: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const kind = tw.roof
  if (kind === 'tank') {
    // A wooden water tank on four legs, its conical cap; the haze's warmth on its round side.
    const cx = x0 + tw.w * (0.3 + 0.4 * hash(tw.x * 10, 5))
    const r = 0.32
    ctx.strokeStyle = rgba(D.frame, 0.95)
    ctx.lineWidth = Math.max(1, 0.035 * k)
    ctx.beginPath()
    for (const dx of [-0.26, -0.09, 0.09, 0.26]) {
      ctx.moveTo((cx + dx) * k, top * k)
      ctx.lineTo((cx + dx * 0.85) * k, (top - 0.42) * k)
    }
    ctx.moveTo((cx - 0.26) * k, (top - 0.2) * k)
    ctx.lineTo((cx + 0.26) * k, (top - 0.2) * k)
    ctx.stroke()
    const g = ctx.createLinearGradient((cx - r) * k, 0, (cx + r) * k, 0)
    g.addColorStop(0, D.towerTop)
    g.addColorStop(1, D.tower)
    ctx.fillStyle = g
    ctx.fillRect((cx - r) * k, (top - 1.05) * k, 2 * r * k, 0.63 * k)
    ctx.beginPath()
    ctx.moveTo((cx - r - 0.03) * k, (top - 1.05) * k)
    ctx.lineTo(cx * k, (top - 1.32) * k)
    ctx.lineTo((cx + r + 0.03) * k, (top - 1.05) * k)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = rgba(D.sodium, 0.18)
    ctx.lineWidth = Math.max(0.6, 0.02 * k)
    ctx.beginPath()
    for (const y of [top - 0.6, top - 0.84]) {
      ctx.moveTo((cx - r) * k, y * k)
      ctx.lineTo((cx + r) * k, y * k)
    }
    ctx.stroke()
  } else if (kind === 'board') {
    billboard(ctx, k, x0 + tw.w / 2, top, tw.board)
  } else if (kind === 'beacon') {
    // A red lamp for the planes, a plain point, on and off in its own time.
    const on = Math.sin(t * 2.2 + tw.x) > 0.55
    const px = Math.max(1, k * 0.045)
    ctx.fillStyle = rgba(D.beacon, on ? 0.95 : 0.25)
    ctx.fillRect((x0 + tw.w / 2) * k - px, (top - 0.14) * k - px, 2 * px, 2 * px)
  }
}

/**
 * A billboard on its frame, lit from below by its lamps: the light lies brightest along its foot and falls off up the
 * picture. Painted, not lettered: a sunset over the sea with a palm, or her picture's poster, a figure in a yellow dress
 * on rose, the dream's version of her name in lights.
 */
function billboard(ctx: CanvasRenderingContext2D, k: number, cx: number, top: number, which: number): void {
  const W = 2.3
  const H = 1.05
  const x0 = cx - W / 2
  const y1 = top - 0.32
  const y0 = y1 - H
  // The frame's legs and catwalk.
  ctx.fillStyle = D.frame
  for (const dx of [0.3, W - 0.36]) ctx.fillRect((x0 + dx) * k, y1 * k, 0.06 * k, (top - y1) * k)
  ctx.fillRect((x0 - 0.05) * k, y1 * k, (W + 0.1) * k, 0.05 * k)
  // The picture.
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0 * k, y0 * k, W * k, H * k)
  ctx.clip()
  if (which === 0) {
    const sky = ctx.createLinearGradient(0, y0 * k, 0, y1 * k)
    sky.addColorStop(0, '#E2836A')
    sky.addColorStop(0.62, '#F3C27A')
    sky.addColorStop(0.63, '#3F7FA6')
    sky.addColorStop(1, '#2C5677')
    ctx.fillStyle = sky
    ctx.fillRect(x0 * k, y0 * k, W * k, H * k)
    ctx.fillStyle = '#FBE3A4'
    ctx.beginPath()
    ctx.arc((x0 + W * 0.62) * k, (y0 + H * 0.62) * k, H * 0.2 * k, Math.PI, 0)
    ctx.fill()
    // The palm on the left, in silhouette.
    ctx.strokeStyle = '#2A1C2C'
    ctx.lineWidth = 0.05 * k
    ctx.beginPath()
    ctx.moveTo((x0 + 0.42) * k, y1 * k)
    ctx.quadraticCurveTo((x0 + 0.36) * k, (y0 + 0.5) * k, (x0 + 0.5) * k, (y0 + 0.24) * k)
    ctx.stroke()
    ctx.fillStyle = '#2A1C2C'
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.55
      ctx.beginPath()
      ctx.moveTo((x0 + 0.5) * k, (y0 + 0.24) * k)
      ctx.quadraticCurveTo((x0 + 0.5 + Math.cos(a) * 0.22) * k, (y0 + 0.2 + Math.sin(a) * 0.15) * k, (x0 + 0.5 + Math.cos(a) * 0.36) * k, (y0 + 0.3 + Math.sin(a) * 0.12 + 0.1 * Math.abs(Math.cos(a))) * k)
      ctx.lineTo((x0 + 0.5) * k, (y0 + 0.28) * k)
      ctx.fill()
    }
  } else {
    ctx.fillStyle = '#B84F6E'
    ctx.fillRect(x0 * k, y0 * k, W * k, H * k)
    ctx.fillStyle = '#8E3555'
    ctx.fillRect(x0 * k, (y0 + H * 0.78) * k, W * k, H * 0.22 * k)
    // The figure: a yellow dress turning, her arms out, dark hair; a dancer's shadow beside her.
    const fx = x0 + W * 0.38
    ctx.fillStyle = '#F2C230'
    ctx.beginPath()
    ctx.moveTo((fx - 0.05) * k, (y0 + 0.36) * k)
    ctx.lineTo((fx + 0.05) * k, (y0 + 0.36) * k)
    ctx.quadraticCurveTo((fx + 0.12) * k, (y0 + 0.6) * k, (fx + 0.3) * k, (y0 + 0.8) * k)
    ctx.lineTo((fx - 0.24) * k, (y0 + 0.8) * k)
    ctx.quadraticCurveTo((fx - 0.1) * k, (y0 + 0.6) * k, (fx - 0.05) * k, (y0 + 0.36) * k)
    ctx.fill()
    ctx.strokeStyle = '#F2C230'
    ctx.lineWidth = 0.035 * k
    ctx.beginPath()
    ctx.moveTo((fx - 0.04) * k, (y0 + 0.4) * k)
    ctx.lineTo((fx - 0.22) * k, (y0 + 0.28) * k)
    ctx.moveTo((fx + 0.04) * k, (y0 + 0.4) * k)
    ctx.lineTo((fx + 0.2) * k, (y0 + 0.3) * k)
    ctx.stroke()
    ctx.fillStyle = '#3A2230'
    ctx.beginPath()
    ctx.ellipse(fx * k, (y0 + 0.28) * k, 0.065 * k, 0.075 * k, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#E8B98F'
    ctx.fillRect((fx - 0.02) * k, (y0 + 0.33) * k, 0.04 * k, 0.04 * k)
    // A skyline painted along its foot.
    ctx.fillStyle = '#5A2440'
    for (let i = 0; i < 8; i++) {
      const bx = x0 + W * 0.55 + i * 0.13
      const bh = 0.12 + 0.18 * hash(i, 77)
      ctx.fillRect(bx * k, (y0 + H * 0.78 - bh) * k, 0.11 * k, (bh + 0.01) * k)
    }
  }
  // The lamps' light, strongest at its foot, fading up the picture; the dark of night over its top edge.
  const lit = ctx.createLinearGradient(0, y1 * k, 0, y0 * k)
  lit.addColorStop(0, 'rgba(255,240,205,0.12)')
  lit.addColorStop(0.55, 'rgba(10,8,25,0.18)')
  lit.addColorStop(1, 'rgba(10,8,25,0.5)')
  ctx.fillStyle = lit
  ctx.fillRect(x0 * k, y0 * k, W * k, H * k)
  ctx.restore()
  ctx.strokeStyle = D.frame
  ctx.lineWidth = Math.max(1, 0.04 * k)
  ctx.strokeRect(x0 * k, y0 * k, W * k, H * k)
  // Three lamps on goosenecks along its foot.
  ctx.fillStyle = D.frame
  for (let i = 0; i < 3; i++) {
    const lx = x0 + W * (0.2 + 0.3 * i)
    ctx.fillRect(lx * k, (y1 - 0.02) * k, 0.03 * k, 0.12 * k)
    ctx.fillStyle = rgba('#FFF0CF', 0.9)
    ctx.fillRect((lx - 0.04) * k, (y1 - 0.05) * k, 0.1 * k, 0.04 * k)
    ctx.fillStyle = D.frame
  }
}

/**
 * The Metro, on a viaduct beyond the far rail: two trains, one each way, lit windows and the odd passenger, gliding
 * past while the jam cannot move. The first goes behind the two of them in the silence while she leans in; the second
 * runs the length of the line in the long silence, out wide.
 */
const METRO_PAR = 0.3
const METRO_Y = -1.08
const CAR_L = 2.05
const TRAINS = [
  { at: 400.35, x: 2.6, v: -4.1, cars: 4 },
  { at: 405.6, x: -6.4, v: 4.4, cars: 5 },
]
function metro(p: p5, k: number, t: number, fr: { x0: number; x1: number; y0: number; y1: number; cx: number }): void {
  if (METRO_Y - 0.8 > fr.y1 || METRO_Y + 0.3 < fr.y0) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const ox = fr.cx * METRO_PAR
  const xa = fr.x0 - 1
  const xb = fr.x1 + 1
  // The viaduct: a girder on piers every six cells, the catenary's masts and its wire.
  ctx.fillStyle = '#251D33'
  ctx.fillRect(xa * k, METRO_Y * k, (xb - xa) * k, 0.16 * k)
  ctx.fillStyle = rgba(D.sodium, 0.16)
  ctx.fillRect(xa * k, METRO_Y * k, (xb - xa) * k, 0.025 * k)
  ctx.fillStyle = '#211A2E'
  for (let x = Math.floor((xa - ox) / 6) * 6; x + ox < xb; x += 6) ctx.fillRect((x + ox - 0.16) * k, (METRO_Y + 0.16) * k, 0.32 * k, (STREET - METRO_Y) * k)
  ctx.fillStyle = rgba(D.frame, 0.9)
  for (let x = Math.floor((xa - ox) / 3) * 3 + 1.5; x + ox < xb; x += 3) {
    ctx.fillRect((x + ox - 0.025) * k, (METRO_Y - 0.82) * k, 0.05 * k, 0.82 * k)
    ctx.fillRect((x + ox - 0.025) * k, (METRO_Y - 0.82) * k, 0.3 * k, 0.03 * k)
  }
  ctx.strokeStyle = rgba(D.frame, 0.9)
  ctx.lineWidth = Math.max(0.6, 0.015 * k)
  ctx.beginPath()
  ctx.moveTo(xa * k, (METRO_Y - 0.74) * k)
  ctx.lineTo(xb * k, (METRO_Y - 0.74) * k)
  ctx.stroke()
  for (const tr of TRAINS) {
    const head = tr.x + tr.v * (t - tr.at)
    const dir = Math.sign(tr.v)
    const L = tr.cars * CAR_L
    const left = (dir > 0 ? head - L : head) + ox
    if (left > xb || left + L < xa) continue
    for (let c = 0; c < tr.cars; c++) {
      const cx0 = left + c * CAR_L + 0.04
      const cx1 = cx0 + CAR_L - 0.08
      const bodyTop = METRO_Y - 0.6
      // The body, the dark silver of a car at night; the roof's edge catching the haze.
      ctx.fillStyle = '#4A4A5E'
      ctx.beginPath()
      const nose = (c === 0 && dir < 0) || (c === tr.cars - 1 && dir > 0)
      const tail = (c === 0 && dir > 0) || (c === tr.cars - 1 && dir < 0)
      const lx = cx0 + (c === 0 ? 0.12 : 0)
      const rx = cx1 - (c === tr.cars - 1 ? 0.12 : 0)
      ctx.moveTo(cx0 * k, (METRO_Y - 0.04) * k)
      ctx.lineTo(cx0 * k, (bodyTop + 0.15) * k)
      ctx.lineTo(lx * k, bodyTop * k)
      ctx.lineTo(rx * k, bodyTop * k)
      ctx.lineTo(cx1 * k, (bodyTop + 0.15) * k)
      ctx.lineTo(cx1 * k, (METRO_Y - 0.04) * k)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = rgba('#B23A48', 0.8)
      ctx.fillRect(cx0 * k, (METRO_Y - 0.17) * k, (cx1 - cx0) * k, 0.05 * k)
      // The windows, lit; a passenger in some, standing or sitting, a dark shape against the light.
      for (let wi = 0; wi < 5; wi++) {
        const wx = cx0 + 0.18 + wi * 0.36
        ctx.fillStyle = rgba('#F4E7C8', 0.88)
        ctx.fillRect(wx * k, (bodyTop + 0.13) * k, 0.26 * k, 0.22 * k)
        const who = hash(c * 7 + wi, tr.cars, 41)
        if (who < 0.45) {
          ctx.fillStyle = '#2B2333'
          const hx = wx + 0.07 + 0.12 * hash(c, wi, 43)
          const sit = who < 0.25
          ctx.beginPath()
          ctx.ellipse(hx * k, (bodyTop + (sit ? 0.24 : 0.19)) * k, 0.035 * k, 0.04 * k, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillRect((hx - 0.055) * k, (bodyTop + (sit ? 0.28 : 0.23)) * k, 0.11 * k, (sit ? 0.07 : 0.12) * k)
        }
      }
      // The pantograph, up to the wire, on the middle car.
      if (c === Math.floor(tr.cars / 2)) {
        ctx.strokeStyle = '#2B2333'
        ctx.lineWidth = Math.max(0.6, 0.02 * k)
        const mx = (cx0 + cx1) / 2
        ctx.beginPath()
        ctx.moveTo((mx - 0.14) * k, bodyTop * k)
        ctx.lineTo(mx * k, (METRO_Y - 0.74) * k)
        ctx.lineTo((mx + 0.14) * k, bodyTop * k)
        ctx.stroke()
      }
      if (nose) {
        const fx = dir > 0 ? cx1 - 0.03 : cx0 + 0.03
        ctx.fillStyle = rgba('#FFF4DC', 0.95)
        ctx.fillRect((fx - 0.03) * k, (METRO_Y - 0.26) * k, 0.06 * k, 0.05 * k)
      }
      if (tail) {
        const fx = dir > 0 ? cx0 + 0.03 : cx1 - 0.03
        ctx.fillStyle = rgba(D.tail, 0.95)
        ctx.fillRect((fx - 0.03) * k, (METRO_Y - 0.26) * k, 0.06 * k, 0.05 * k)
      }
    }
  }
}

/**
 * The freeway's other carriageway, beyond the far rail, going the other way, and moving: the cars come by the jam with
 * their headlamps on the road ahead of them. It never stops, which is the point.
 */
const OPP_Y = -0.3
const OPP_S = 0.64
const OPP_SPAN = 84
const OPP = Array.from({ length: 30 }, (_, i) => ({ x: -20 + i * 2.8 + 1.6 * hash(i, 61), col: 1 + (i * 3) % 4, v: 4.8 + 1.2 * hash(i, 62) }))
function oncoming(p: p5, k: number, ink: string, w: number, t: number, fr: { x0: number; x1: number; y0: number; y1: number }): void {
  if (OPP_Y - 0.8 > fr.y1 || OPP_Y < fr.y0 - 0.2) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // Its road, its far rail, and the median wall between the carriageways.
  ctx.fillStyle = D.asphalt
  ctx.fillRect((fr.x0 - 1) * k, (OPP_Y - 0.06) * k, (fr.x1 - fr.x0 + 2) * k, 0.16 * k)
  ctx.fillStyle = rgba(D.frame, 0.9)
  ctx.fillRect((fr.x0 - 1) * k, (OPP_Y - 0.12) * k, (fr.x1 - fr.x0 + 2) * k, 0.06 * k)
  const line = rgba(ink, 0.22)
  for (const c of OPP) {
    let x = c.x - c.v * (t - BEGIN)
    x = ((((x + 20) % OPP_SPAN) + OPP_SPAN) % OPP_SPAN) - 20
    const len = LEN * OPP_S
    if (x > fr.x1 + 2 || x + len < fr.x0 - 2) continue
    // Facing left: its nose at x, its headlamps' light lying on the road ahead of it.
    ctx.fillStyle = rgba(D.head, 0.14)
    ctx.beginPath()
    ctx.ellipse((x - 0.75) * k, (OPP_Y + 0.02) * k, 0.75 * k, 0.05 * k, 0, 0, Math.PI * 2)
    ctx.fill()
    const U = (u: number) => x + (LEN - u) * OPP_S
    const V = (v: number) => OPP_Y + v * OPP_S
    const body = mixHex(D.car[c.col], D.night, 0.55)
    shape(p, k, [[U(0), V(-0.16)], [U(LEN), V(-0.16)], [U(LEN), V(-0.36)], [U(LEN - 0.55), V(-0.46)], [U(1.55), V(-0.47)], [U(1.3), V(-0.78)], [U(0.62), V(-0.78)], [U(0.35), V(-0.48)], [U(0), V(-0.45)]], body, line, w * 0.6)
    shape(p, k, [[U(0.7), V(-0.5)], [U(1.2), V(-0.5)], [U(1.2), V(-0.72)], [U(0.72), V(-0.72)]], alpha(p, D.asphalt, 0.9), null)
    ctx.fillStyle = D.asphalt
    for (const u of WB) {
      ctx.beginPath()
      ctx.arc(U(u) * k, V(-WR) * k, WR * OPP_S * k, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = D.head
    ctx.fillRect((U(LEN) - 0.02) * k, V(-0.36) * k, 0.08 * k, 0.08 * k)
    ctx.fillStyle = rgba(D.tail, 0.8)
    ctx.fillRect((U(0) - 0.05) * k, V(-0.42) * k, 0.06 * k, 0.09 * k)
  }
}

/**
 * The walk outside the club at the end of the street: three people under its window, talking, turning to whoever is
 * speaking.
 */
const STANDERS: { x: number; h: number; coat: string; facing: number }[] = [
  { x: 25.55, h: 0.74, coat: '#2B2138', facing: 1 },
  { x: 26.0, h: 0.68, coat: '#3A2131', facing: -1 },
  { x: 26.5, h: 0.71, coat: '#22283A', facing: -1 },
]
export function figure(ctx: CanvasRenderingContext2D, k: number, x: number, foot: number, h: number, coat: string, facing: number, stride: number, turn: number): void {
  // A person in a coat: legs, the coat's tapered body, the shoulders, a head; lit from the lamps above, a warm edge
  // along the top of the shoulders and head.
  const legW = 0.075 * h
  ctx.fillStyle = '#120E18'
  const s = stride * 0.12 * h
  ctx.beginPath()
  ctx.moveTo((x - legW + s) * k, foot * k)
  ctx.lineTo((x - legW * 0.4) * k, (foot - 0.42 * h) * k)
  ctx.lineTo((x + legW * 0.4) * k, (foot - 0.42 * h) * k)
  ctx.lineTo((x + legW - s) * k, foot * k)
  ctx.lineTo((x + legW * 0.3 - s) * k, foot * k)
  ctx.lineTo(x * k, (foot - 0.3 * h) * k)
  ctx.lineTo((x - legW * 0.3 + s) * k, foot * k)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = coat
  ctx.beginPath()
  ctx.moveTo((x - 0.16 * h) * k, (foot - 0.3 * h) * k)
  ctx.lineTo((x - 0.12 * h) * k, (foot - 0.78 * h) * k)
  ctx.quadraticCurveTo(x * k, (foot - 0.84 * h) * k, (x + 0.12 * h) * k, (foot - 0.78 * h) * k)
  ctx.lineTo((x + 0.16 * h) * k, (foot - 0.3 * h) * k)
  ctx.closePath()
  ctx.fill()
  const hx = x + facing * 0.02 * h + turn * 0.03 * h
  ctx.fillStyle = '#17111D'
  ctx.beginPath()
  ctx.ellipse(hx * k, (foot - 0.9 * h) * k, 0.075 * h * k, 0.09 * h * k, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = rgba(D.sodium, 0.45)
  ctx.lineWidth = Math.max(0.6, 0.012 * k)
  ctx.beginPath()
  ctx.ellipse(hx * k, (foot - 0.9 * h) * k, 0.075 * h * k, 0.09 * h * k, 0, Math.PI * 1.1, Math.PI * 1.9)
  ctx.moveTo((x - 0.12 * h) * k, (foot - 0.78 * h) * k)
  ctx.quadraticCurveTo(x * k, (foot - 0.84 * h) * k, (x + 0.12 * h) * k, (foot - 0.78 * h) * k)
  ctx.stroke()
}
function walkers(p: p5, k: number, t: number, fr: { x0: number; x1: number; y0: number; y1: number }): void {
  if (WALK - 1 > fr.y1 || WALK < fr.y0 || WALL - 6 > fr.x1) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  for (const [i, f] of STANDERS.entries()) {
    if (f.x < fr.x0 - 1 || f.x > fr.x1 + 1) continue
    // They talk: a turn of the head to whoever is speaking, a weight shift now and then.
    const turn = Math.sin((t - 410) * 0.9 + i * 2.1)
    const sway = 0.012 * Math.sin((t - 400) * 0.7 + i * 1.7)
    figure(ctx, k, f.x + sway, WALK, f.h, f.coat, f.facing, 0, turn)
  }
}

/**
 * The near side of the street, nearest the lens: its sidewalk, with parking meters and a fire plug along the kerb and
 * the street's near lamps over it, which go by faster than anything when the camera moves.
 */
const NEAR_PAR = -0.45
const KY = STREET + 0.78
function nearSide(p: p5, k: number, fr: { x0: number; x1: number; y0: number; y1: number; cx: number }): void {
  if (1.5 > fr.y1) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const ox = fr.cx * NEAR_PAR
  const xa = fr.x0 - 1
  const xb = fr.x1 + 1
  // The sidewalk: its slab, the kerb's lit edge, the joints in its paving, and the lamps' pools on it.
  ctx.fillStyle = '#16121F'
  ctx.fillRect(xa * k, KY * k, (xb - xa) * k, (Math.max(fr.y1, KY) - KY + 1) * k)
  ctx.fillStyle = rgba(D.sodium, 0.22)
  ctx.fillRect(xa * k, KY * k, (xb - xa) * k, 0.035 * k)
  ctx.fillStyle = rgba('#0A0810', 0.6)
  for (let x = Math.floor((xa - ox) / 0.9) * 0.9; x + ox < xb; x += 0.9) ctx.fillRect((x + ox) * k, (KY + 0.05) * k, 0.025 * k, 2 * k)
  ctx.fillRect(xa * k, (KY + 0.42) * k, (xb - xa) * k, 0.025 * k)
  for (let x = Math.floor((xa - ox) / LAMP_EVERY) * LAMP_EVERY + LAMP_AT; x + ox < xb + 2; x += LAMP_EVERY) glow(p, k, x + ox + 0.75, KY + 0.35, 1.6, D.sodium, 0.2, 1.3, 0.3)
  // Along the kerb: meters, now and then a fire plug.
  ctx.fillStyle = '#0B0912'
  for (let x = Math.floor((xa - ox) / 2.2) * 2.2; x + ox < xb; x += 2.2) {
    const X = x + ox
    const kind = Math.floor(hash(Math.round(x / 2.2), 3, 51) * 5)
    if (kind <= 2) {
      ctx.fillRect((X - 0.025) * k, (KY - 0.5) * k, 0.05 * k, 0.5 * k)
      ctx.beginPath()
      ctx.ellipse(X * k, (KY - 0.58) * k, 0.07 * k, 0.1 * k, 0, 0, Math.PI * 2)
      ctx.fill()
    } else if (kind === 3) {
      ctx.fillRect((X - 0.07) * k, (KY - 0.28) * k, 0.14 * k, 0.28 * k)
      ctx.fillRect((X - 0.11) * k, (KY - 0.2) * k, 0.22 * k, 0.05 * k)
      ctx.beginPath()
      ctx.arc(X * k, (KY - 0.28) * k, 0.07 * k, Math.PI, 0)
      ctx.fill()
    }
  }
  // The near lamps: a post up from the kerb, its arm over the street, its head lit.
  for (let x = Math.floor((xa - 2 - ox) / LAMP_EVERY) * LAMP_EVERY + LAMP_AT; x + ox < xb + 2; x += LAMP_EVERY) {
    const X = x + ox
    ctx.fillStyle = '#0B0912'
    ctx.beginPath()
    ctx.moveTo((X - 0.07) * k, (KY + 0.05) * k)
    ctx.lineTo((X - 0.045) * k, LAMP_TOP * k)
    ctx.lineTo((X + 0.045) * k, LAMP_TOP * k)
    ctx.lineTo((X + 0.07) * k, (KY + 0.05) * k)
    ctx.fill()
    ctx.strokeStyle = '#0B0912'
    ctx.lineWidth = 0.06 * k
    ctx.beginPath()
    ctx.moveTo(X * k, (LAMP_TOP + 0.02) * k)
    ctx.quadraticCurveTo(X * k, (LAMP_TOP - 0.3) * k, (X + 0.55) * k, (LAMP_TOP - 0.24) * k)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo((X + 0.42) * k, (LAMP_TOP - 0.26) * k)
    ctx.lineTo((X + 0.86) * k, (LAMP_TOP - 0.2) * k)
    ctx.lineTo((X + 0.8) * k, (LAMP_TOP - 0.12) * k)
    ctx.lineTo((X + 0.48) * k, (LAMP_TOP - 0.15) * k)
    ctx.closePath()
    ctx.fillStyle = '#0B0912'
    ctx.fill()
    ctx.fillStyle = D.sodium
    ctx.fillRect((X + 0.5) * k, (LAMP_TOP - 0.15) * k, 0.3 * k, 0.03 * k)
    // A sodium edge down the post where the next lamp catches it.
    ctx.fillStyle = rgba(D.sodium, 0.2)
    ctx.fillRect((X + 0.035) * k, LAMP_TOP * k, 0.02 * k, (KY - LAMP_TOP) * k)
  }
}
const LAMP_EVERY = 9
const LAMP_AT = 2
const LAMP_TOP = 1.75

/** A tall sodium lamp at x, standing on `foot`, its head `h` up, its pool of orange on the road. */
function sodium(p: p5, k: number, ink: string, w: number, x: number, foot: number, h: number, on: number): void {
  // Its light where it falls, an orange pool on the road; the lamp itself is only its lit glass.
  if (on > 0) glow(p, k, x + 0.55, foot - 0.05, 1.3, D.sodium, 0.28 * on, 1.4, 0.35)
  seg(p, k, [x, foot], [x, foot - h], rgba(ink, 0.35), w * 0.9)
  seg(p, k, [x, foot - h], [x + 0.5, foot - h + 0.05], rgba(ink, 0.35), w * 0.9)
  shape(p, k, [[x + 0.38, foot - h + 0.03], [x + 0.66, foot - h + 0.06], [x + 0.6, foot - h + 0.12], [x + 0.42, foot - h + 0.1]], on > 0.5 ? D.sodium : alpha(p, D.tail, 0.35 + 0.3 * on), rgba(ink, 0.4), w * 0.6)
}

/** A car of the jam: a closed sedan, its colour by its place in the line; nose-dips as it stops, tails flaring. */
function sedan(p: p5, k: number, ink: string, w: number, x: number, i: number, t: number): void {
  const col = D.car[1 + (((i % 4) + 4) % 4)]
  let dip = 0
  let flare = 0
  let moving = false
  for (const n of stopsOf(i)) {
    dip += 0.03 * Math.max(0, ring(t - n, 1.3, 0.28))
    flare = Math.max(flare, knock(t - n, 0.5))
    if (t > n - 0.55 && t < n) moving = true
  }
  const brake = moving ? 0.25 : 0.7 + 0.3 * flare
  p.push()
  p.translate((x + WB[0]) * k, RD * k)
  p.rotate(dip)
  const X = (u: number) => u - WB[0]
  const line = rgba(ink, 0.35)
  // The headlamps' light lying on the deck between it and the car ahead, not a beam in the air.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.fillStyle = rgba(D.head, 0.16)
  ctx.beginPath()
  ctx.ellipse(X(LEN + 0.7) * k, 0.01 * k, 0.7 * k, 0.06 * k, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = rgba(D.head, 0.12)
  ctx.beginPath()
  ctx.ellipse(X(LEN + 0.4) * k, 0.01 * k, 0.38 * k, 0.04 * k, 0, 0, Math.PI * 2)
  ctx.fill()
  shape(p, k, [[X(0), -0.16], [X(LEN), -0.16], [X(LEN), -0.36], [X(LEN - 0.55), -0.46], [X(1.55), -0.47], [X(1.3), -0.78], [X(0.62), -0.78], [X(0.35), -0.48], [X(0), -0.45]], col, line, w * 0.8)
  shape(p, k, [[X(0.7), -0.5], [X(1.2), -0.5], [X(1.2), -0.72], [X(0.72), -0.72]], alpha(p, D.asphalt, 0.9), null)
  shape(p, k, [[X(1.28), -0.5], [X(1.48), -0.5], [X(1.26), -0.72]], alpha(p, D.asphalt, 0.9), null)
  for (const u of WB) {
    p.fill(D.asphalt)
    p.stroke(line)
    p.strokeWeight(w * 0.6)
    p.circle(X(u) * k, -WR * k, 2 * WR * k)
  }
  // Tail and head; the brake light lying red on the deck behind it.
  glow(p, k, X(-0.25), 0.04, 0.7, D.tail, 0.22 * brake, 1.4, 0.22)
  box2(p, k, X(-0.02), -0.42, X(0.08), -0.3, brake > 0.6 ? D.tail : alpha(p, D.tail, 0.6), null)
  box2(p, k, X(LEN - 0.08), -0.36, X(LEN + 0.02), -0.26, D.head, null)
  p.pop()
}

/** A car too far along the line to draw: its tail and head lamps in the dark. */
function lights(p: p5, k: number, x: number, fr: { x0: number; x1: number }): void {
  if (x > fr.x1 + 1 || x + LEN < fr.x0 - 1) return
  p.noStroke()
  p.fill(alpha(p, D.tail, 0.75))
  p.rect(x * k, (RD - 0.36) * k, 0.1 * k, 0.1 * k)
  p.fill(alpha(p, D.head, 0.7))
  p.rect((x + LEN) * k, (RD - 0.31) * k, 0.1 * k, 0.08 * k)
  p.fill(alpha(p, D.car[2], 0.18))
  p.rect((x + LEN / 2) * k, (RD - 0.35) * k, LEN * k, 0.34 * k)
}

/** The exit ramp: a slab from the deck down to the street, in front of the deck; the joints he knocks over. */
function ramp(p: p5, k: number, ink: string, w: number, fr: { x0: number; x1: number }): void {
  const line = rgba(ink, 0.35)
  const x0 = RAMP0 - 1.2
  const x1 = Math.min(RAMP1 + 0.5, fr.x1 + 1)
  if (x1 < fr.x0 - 1) return
  for (let x = RAMP0 + 2.5; x < RAMP1 - 1; x += 3) shape(p, k, [[x - 0.14, roadAt(x) + 0.25], [x + 0.14, roadAt(x) + 0.25], [x + 0.18, STREET], [x - 0.18, STREET]], rgba(D.brick, 0.95), line, w * 0.6)
  p.fill(D.asphalt)
  p.stroke(line)
  p.strokeWeight(w)
  p.beginShape()
  for (let x = x0; x <= x1; x += 0.2) p.vertex(x * k, roadAt(x) * k)
  for (let x = x1; x >= x0; x -= 0.2) p.vertex(x * k, (Math.min(STREET, roadAt(x) + 0.26)) * k)
  p.endShape(p.CLOSE)
  for (const j of JOINTS) {
    const x = rearAt(j) + WB[1]
    seg(p, k, [x, roadAt(x) - 0.01], [x, roadAt(x) + 0.12], rgba(ink, 0.45), w * 0.9)
  }
}

/** The i-th lamp of the street: where the car's nose is when it comes on, a little ahead. */
const LAMP_X = LAMPS.map((t) => rearAt(t) + LEN + 1.1)
function streetLamp(p: p5, k: number, ink: string, w: number, i: number, t: number): void {
  const s = t - LAMPS[i]
  // It strikes, flickers once and comes up to full.
  const on = s < 0 ? 0 : s < 0.05 ? 1 : s < 0.12 ? 0.35 : Math.min(1, 0.6 + s * 1.5)
  sodium(p, k, ink, w, LAMP_X[i] - 0.5, STREET, 2.2, on)
}

/** The club's wall at the end of the street, its door, the awning, and the neon arrow, dark until its note. */
function club(p: p5, k: number, ink: string, w: number, t: number, fr: { x0: number; x1: number }): void {
  if (WALL - 2 > fr.x1 + 1) return
  const line = rgba(ink, 0.35)
  const thick = ROOM.wallL1 - ROOM.wallL0
  const top = WALK - 9.5
  // The walk from the kerb to the door.
  shape(p, k, [[KERB, WALK], [WALL + 8, WALK], [WALL + 8, STREET + 0.4], [KERB, STREET + 0.4]], D.brick, line, w * 0.8)
  // The building: brick, and a window high up where the stage light shows.
  shape(p, k, [[WALL, WALK], [WALL + 12, WALK], [WALL + 12, top], [WALL, top]], D.brick, line, w)
  for (let y = WALK - 0.6; y > top; y -= 0.6) seg(p, k, [WALL + thick, y], [WALL + 12, y], rgba(ink, 0.06), w * 0.5)
  // The window: the room's rose stage light behind a half-drawn curtain, four panes, a stone sill.
  const [wx0, wy0, wx1, wy1] = [WALL + 1.5, WALK - 4.2, WALL + 3.2, WALK - 3.0]
  box2(p, k, wx0, wy0, wx1, wy1, alpha(p, D.rose, 0.55), null)
  box2(p, k, wx0, (wy0 + wy1) / 2, wx1, wy1, alpha(p, D.sodium, 0.22), null)
  shape(p, k, [[wx0, wy0], [wx0 + 0.45, wy0], [wx0 + 0.2, wy0 + 0.5], [wx0 + 0.12, wy1], [wx0, wy1]], D.car[0], null)
  shape(p, k, [[wx1, wy0], [wx1 - 0.45, wy0], [wx1 - 0.2, wy0 + 0.5], [wx1 - 0.12, wy1], [wx1, wy1]], D.car[0], null)
  const mull = D.frame
  seg(p, k, [(wx0 + wx1) / 2, wy0], [(wx0 + wx1) / 2, wy1], mull, w * 1.6)
  seg(p, k, [wx0, wy0 + 0.5], [wx1, wy0 + 0.5], mull, w * 1.6)
  box2(p, k, wx0, wy0, wx1, wy1, null, mull, w * 2.4)
  box2(p, k, wx0 - 0.12, wy1, wx1 + 0.12, wy1 + 0.1, D.sill, line, w * 0.8)
  // The doorway, lit from inside once the door opens; the door swung out onto the walk.
  const open = doorOpen(t)
  box2(p, k, WALL, DOOR_TOP, WALL + thick, WALK, alpha(p, D.asphalt, 1), line, w)
  if (open > 0) {
    box2(p, k, WALL, DOOR_TOP, WALL + thick, WALK, alpha(p, D.sodium, 0.55 * open), null)
    glow(p, k, WALL - 0.2, WALK - 0.2, 1.1, D.sodium, 0.35 * open, 1, 0.4)
  }
  const dw = 0.62 * Math.cos(open * 1.3)
  const dx0 = WALL - (1 - Math.cos(open * 1.3)) * 0.02
  const dx1 = WALL + Math.max(0.06, dw * (1 - open) + 0.05)
  box2(p, k, dx0, DOOR_TOP + 0.02, dx1, WALK - 0.01, D.car[0], line, w * 0.8)
  // Two sunk panels and a brass knob, while the door is face on enough to show them.
  const face = dx1 - dx0
  if (face > 0.3) {
    const m = face * 0.16
    const mid = DOOR_TOP + (WALK - DOOR_TOP) * 0.42
    box2(p, k, dx0 + m, DOOR_TOP + 0.14, dx1 - m, mid - 0.06, null, alpha(p, D.frame, 0.55), w * 0.8)
    box2(p, k, dx0 + m, mid + 0.06, dx1 - m, WALK - 0.14, null, alpha(p, D.frame, 0.55), w * 0.8)
    p.noStroke()
    p.fill(D.sodium)
    p.circle((dx1 - face * 0.14) * k, (mid + 0.02) * k, 0.07 * k)
  }
  // The awning, and the neon over it.
  const a0 = WALL
  const a1 = WALL - 0.95
  shape(p, k, [[a0, DOOR_TOP - 0.22], [a1, DOOR_TOP - 0.05], [a1, DOOR_TOP + 0.07], [a0, DOOR_TOP + 0.02]], D.car[0], line, w * 0.7)
  const { tube, head, note, left } = neonArrow(WALL - 0.55, DOOR_TOP - 0.42)
  seg(p, k, [a0, tube[0][1] - 0.18], [left, tube[0][1] - 0.18], line, w * 0.55)
  seg(p, k, [note[1][1][0], tube[0][1] - 0.18], note[1][1], line, w * 0.55)
  seg(p, k, [tube[0][0] + 0.1, tube[0][1] - 0.18], [tube[0][0] + 0.1, tube[0][1] - 0.04], line, w * 0.55)
  const s = t - NEON
  // Dark glass until its note; then it buzzes on, a stutter, and holds.
  const lit = s < 0 ? 0 : s < 0.06 ? 1 : s < 0.14 ? 0.2 : s < 0.2 ? 0.9 : s < 0.26 ? 0.4 : 0.92 + 0.08 * Math.sin(t * 13) * Math.sin(t * 5.3)
  // (The tube is its own light: no halo round it.)
  const pass: [string, number][] = lit > 0 ? [[rgba(D.neon, 0.25 + 0.65 * lit), 0.085], [rgba(D.neonCore, lit), 0.03]] : [[rgba(D.neon, 0.18), 0.085]]
  for (const [col, sw] of pass) {
    p.stroke(col)
    p.strokeWeight(sw * k)
    p.noFill()
    p.beginShape()
    for (const [x, y] of tube) p.vertex(x * k, y * k)
    p.endShape()
    p.beginShape()
    for (const [x, y] of head) p.vertex(x * k, y * k)
    p.endShape()
    for (const tubeLine of note) {
      p.beginShape()
      for (const [x, y] of tubeLine) p.vertex(x * k, y * k)
      p.endShape()
    }
  }
}
/** The club's door: shut until they are nearly at it. */
const doorOpen = (t: number): number => soft((t - 422.2) / 0.5)

/** Their convertible: behind them the bench, the wheel and the glass; in front of them (`front`) the body and door. */
function carBody(p: p5, c: Ctx, t: number, front: boolean): void {
  const { k, ink, weight } = c
  const w = weight
  const ps = poseAt(t)
  const B = (u: number, v: number) => bodyAt(ps, u, v)
  const at = (pts: Pt[]) => pts.map(([u, v]) => B(u, v))
  const line = rgba(ink, 0.45)
  const brake = t < PULL ? 0.75 + 0.25 * Math.max(knock(t - P1[5], 0.5), knock(t - P2[5], 0.5)) : t > STOP - 0.4 ? 0.8 + 0.2 * knock(t - STOP, 0.5) : 0.3
  if (!front) {
    // Its headlamps' light lying on the road ahead of it (brighter once they are rolling on the street), not a beam.
    const on = t > PULL ? 1 : 0.6
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const ahead = B(LEN + 0.95, -0.02)
    const near = B(LEN + 0.5, -0.02)
    ctx.fillStyle = rgba(D.head, 0.15 * on)
    ctx.beginPath()
    ctx.ellipse(ahead[0] * k, ahead[1] * k, 0.95 * k, 0.07 * k, ps.a, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = rgba(D.head, 0.12 * on)
    ctx.beginPath()
    ctx.ellipse(near[0] * k, near[1] * k, 0.5 * k, 0.045 * k, ps.a, 0, Math.PI * 2)
    ctx.fill()
    // The bench's back, the far side's inside, the wheel, the windscreen.
    shape(p, k, at([[0.62, BELT - 0.02], [0.8, BELT - 0.02], [0.78, 0.66], [0.68, 0.7], [0.6, 0.62]]), D.head, line, w * 0.8)
    shape(p, k, at([[0.6, 0.3], [1.62, 0.3], [1.62, BELT + 0.02], [0.6, BELT + 0.02]]), alpha(p, D.car[0], 0.7), null)
    const hub = B(1.52, 0.6)
    const col = B(1.64, 0.42)
    seg(p, k, hub, col, line, w * 0.9)
    p.push()
    p.translate(hub[0] * k, hub[1] * k)
    p.rotate(0.45 + ps.a)
    p.noFill()
    p.stroke(D.head)
    p.strokeWeight(w * 1.1)
    p.ellipse(0, 0, 0.06 * k, 0.26 * k)
    p.pop()
    shape(p, k, at([[1.62, BELT + 0.03], [1.7, BELT + 0.03], [1.52, 0.83], [1.46, 0.83]]), alpha(p, D.neonCore, 0.25), line, w * 0.8)
    return
  }
  // The body: tail fin, doors, hood; chrome along it; the door open once he is out.
  const col = D.car[0]
  const d = doorAt(t)
  const body: Pt[] = [[-0.03, 0.18], [LEN + 0.02, 0.16], [LEN + 0.04, 0.34], [LEN - 0.1, BELT + 0.02], [1.62, BELT + 0.04], [0.3, BELT + 0.04], [0.02, BELT + 0.1], [-0.06, 0.34]]
  shape(p, k, at(body), col, line, w)
  seg(p, k, B(0.1, 0.3), B(LEN - 0.05, 0.3), rgba(D.neonCore, 0.45), w * 0.7)
  // Where the door is swung open, the inside shows, and the door stands out toward us.
  if (d > 0.01) {
    shape(p, k, at([[0.78, 0.2], [1.58, 0.2], [1.58, BELT + 0.04], [0.78, BELT + 0.04]]), alpha(p, D.car[0], 0.55), line, w * 0.8)
    const cw = Math.cos(d * 1.2)
    const f = (u: number) => 1.58 - (1.58 - u) * cw
    shape(p, k, at([[f(0.78), 0.2], [1.58, 0.2], [1.58, BELT + 0.04], [f(0.78), BELT + 0.04]]), col, line, w)
    const e = B(f(0.78), 0.2)
    const e2 = B(f(0.78), BELT + 0.04)
    seg(p, k, e, [e2[0], e2[1]], rgba(D.neonCore, 0.35), w * 0.9)
  } else seg(p, k, B(0.78, 0.2), B(0.78, BELT + 0.02), rgba(ink, 0.3), w * 0.6)
  for (const u of WB) {
    const [x, y] = B(u, WR)
    p.fill(D.asphalt)
    p.stroke(line)
    p.strokeWeight(w * 0.7)
    p.circle(x * k, y * k, 2 * WR * k)
    p.fill(rgba(D.neonCore, 0.5))
    p.noStroke()
    p.circle(x * k, y * k, 0.12 * k)
  }
  // Tail lamp and head lamp.
  // The brake light's red on the road behind, not round the lamp.
  const tl = B(-0.3, -0.02)
  glow(p, k, tl[0], tl[1], 0.6, D.tail, 0.2 * brake, 1.4, 0.22)
  shape(p, k, at([[-0.06, 0.26], [0.04, 0.26], [0.04, 0.36], [-0.06, 0.36]]), brake > 0.6 ? D.tail : alpha(p, D.tail, 0.6), null)
  shape(p, k, at([[LEN - 0.04, 0.26], [LEN + 0.04, 0.26], [LEN + 0.04, 0.34], [LEN - 0.04, 0.34]]), D.head, null)
}
