import type p5 from 'p5'
import type { Pt, Seg } from '../../../../../parts'
import { neonArrow, ROOM } from '../club/room'
import { alpha, box, carried, frame, glow, hash, knock, part, ring, rgba, smooth, type Ctx, type PartShot } from '../kit'
import { DRIVE_MAT as D } from '../worlds'
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
const roadAt = (x: number): number => RD + (STREET - RD) * smooth(x, RAMP0, RAMP1)

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
  return { x: x + WB[0], y: yb - lift, a }
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
    // In the silence, in on the two of them.
    { t: 401.4, cells: 3.8, hold: [-0.35, -0.25] },
    { t: 402.3, cells: 3.9, hold: [-0.3, -0.25] },
    { t: 404.6, cells: 6.2, hold: [1.3, -0.55] },
    // The long silence: out wide, the line of lights along the high road, the ramp going down, the city.
    { t: 407.6, cells: 14, hold: [6.0, 0.9] },
    { t: PULL + 0.4, cells: 13.5, hold: [6.4, 1.0] },
    // Down the ramp with them, and along the street under its lamps.
    { t: 411.2, cells: 8.5, w: 0, off: [1.2, -0.6] },
    { t: 415.2, cells: 6.2, w: 0, off: [1.4, -0.7] },
    { t: STOP, cells: 5.4, hold: [PARK + 2.2, STREET - 1.2] },
    // Parked at the door, the sign, the two of them going in.
    { t: 420.6, cells: 5.0, hold: [PARK + 2.3, STREET - 1.35] },
    { t: 422.9, cells: 4.4, hold: [DOOR_X - 0.9, STREET - 1.0] },
  ],
)

/* ------------------------------------------------------------------ the drawing */

/** The city beyond: buildings with some windows lit, far off (it moves half as fast as the road). */
const TOWERS = Array.from({ length: 44 }, (_, i) => {
  const x = -30 + i * 1.9 + hash(i, 1) * 1.2
  const w = 1.1 + 1.6 * hash(i, 2)
  const h = 2.5 + 7 * hash(i, 3) * hash(i, 4) + 1.5 * hash(i, 5)
  const lit: Pt[] = []
  for (let cx = 0.2; cx < w - 0.15; cx += 0.36) for (let cy = 0.4; cy < h - 0.2; cy += 0.5) if (hash(i * 97 + Math.round(cx * 10), Math.round(cy * 10), 7) < 0.2) lit.push([cx, cy])
  return { x, w, h, lit }
})

function drawDrive(p: p5, t: number, c: Ctx): void {
  const { k, ink, weight } = c
  const w = weight
  const fr = frame(p, k)
  const line = rgba(ink, 0.3)
  // The night: dark overhead, a sodium haze low over the city.
  vgrad(p, k, fr.x0 - 1, fr.y0 - 1, fr.x1 + 1, fr.y1 + 1, [[0, rgba(D.asphalt, 0)], [Math.max(0.02, Math.min(0.98, (STREET - 1.5 - fr.y0) / (fr.y1 - fr.y0 + 2))), rgba(D.sodium, 0.14)], [1, rgba(D.asphalt, 0.6)]])
  // The city, half as fast as the road.
  const par = 0.5
  const ox = fr.cx * par
  const base = STREET + 0.8
  for (const tw of TOWERS) {
    const x0 = tw.x + ox
    if (x0 > fr.x1 + 1 || x0 + tw.w < fr.x0 - 1) continue
    shape(p, k, [[x0, base], [x0 + tw.w, base], [x0 + tw.w, base - tw.h], [x0, base - tw.h]], D.brick, null)
    p.noStroke()
    p.fill(alpha(p, D.sodium, 0.55))
    for (const [lx, ly] of tw.lit) p.rect((x0 + lx) * k, (base - tw.h + ly) * k, 0.12 * k, 0.16 * k)
  }
  // The street below, and the ground.
  shape(p, k, [[fr.x0 - 1, STREET], [fr.x1 + 1, STREET], [fr.x1 + 1, fr.y1 + 1], [fr.x0 - 1, fr.y1 + 1]], D.asphalt, null)
  seg(p, k, [fr.x0 - 1, STREET], [fr.x1 + 1, STREET], line, w)
  // The freeway: its piers, its far rail, its deck.
  for (let x = Math.floor((fr.x0 - 2) / 6) * 6; x < fr.x1 + 2; x += 6) shape(p, k, [[x - 0.22, RD + 0.35], [x + 0.22, RD + 0.35], [x + 0.3, STREET], [x - 0.3, STREET]], rgba(D.brick, 0.9), line, w * 0.6)
  seg(p, k, [fr.x0 - 1, RD - 0.5], [fr.x1 + 1, RD - 0.5], rgba(ink, 0.18), w * 0.8)
  for (let x = Math.floor(fr.x0); x < fr.x1 + 1; x += 1) seg(p, k, [x, RD - 0.5], [x, RD], rgba(ink, 0.1), w * 0.5)
  shape(p, k, [[fr.x0 - 1, RD], [fr.x1 + 1, RD], [fr.x1 + 1, RD + 0.35], [fr.x0 - 1, RD + 0.35]], D.asphalt, line, w)
  // The freeway's tall lamps, and their pools on the deck.
  for (let x = Math.floor((fr.x0 - 3) / 7) * 7 + 3; x < fr.x1 + 3; x += 7) sodium(p, k, ink, w, x, RD, 2.6, 1)
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
  // Their car: the body drawn over them while they sit in it (see `over`), behind them once they are out.
  carBody(p, c, t, false)
  if (t >= OUT) carBody(p, c, t, true)
}

/** A tall sodium lamp at x, standing on `foot`, its head `h` up, its pool of orange on the road. */
function sodium(p: p5, k: number, ink: string, w: number, x: number, foot: number, h: number, on: number): void {
  if (on > 0) {
    glow(p, k, x + 0.55, foot - 0.05, 1.3, D.sodium, 0.28 * on, 1.4, 0.35)
    glow(p, k, x + 0.55, foot - h + 0.1, 0.5, D.sodium, 0.35 * on)
  }
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
  // The headlamp's throw along the deck to the car ahead.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(X(LEN) * k, 0, X(LEN + 1.4) * k, 0)
  g.addColorStop(0, rgba(D.head, 0.3))
  g.addColorStop(1, rgba(D.head, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(X(LEN) * k, -0.3 * k)
  ctx.lineTo(X(LEN + 1.4) * k, -0.45 * k)
  ctx.lineTo(X(LEN + 1.4) * k, 0)
  ctx.lineTo(X(LEN) * k, -0.2 * k)
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
  // Tail and head.
  glow(p, k, X(0.02), -0.36, 0.45, D.tail, 0.45 * brake)
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
  box2(p, k, WALL + 1.5, WALK - 4.2, WALL + 3.2, WALK - 3.0, alpha(p, D.neon, 0.45), line, w * 0.8)
  glow(p, k, WALL + 2.35, WALK - 3.6, 1.1, D.neon, 0.18)
  // The doorway, lit from inside once the door opens; the door swung out onto the walk.
  const open = doorOpen(t)
  box2(p, k, WALL, DOOR_TOP, WALL + thick, WALK, alpha(p, D.asphalt, 1), line, w)
  if (open > 0) {
    box2(p, k, WALL, DOOR_TOP, WALL + thick, WALK, alpha(p, D.sodium, 0.55 * open), null)
    glow(p, k, WALL - 0.2, WALK - 0.2, 1.1, D.sodium, 0.35 * open, 1, 0.4)
  }
  const dw = 0.62 * Math.cos(open * 1.3)
  box2(p, k, WALL - (1 - Math.cos(open * 1.3)) * 0.02, DOOR_TOP + 0.02, WALL + Math.max(0.06, dw * (1 - open) + 0.05), WALK - 0.01, D.car[0], line, w * 0.8)
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
  if (lit > 0) glow(p, k, WALL - 1.0, DOOR_TOP - 0.97, 1.5, D.neon, 0.3 * lit, 1.2, 0.9)
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
    // Headlamp beam, once they are rolling at night on the street.
    const hl = B(LEN, 0.3)
    const on = t > PULL ? 1 : 0.6
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const g = ctx.createLinearGradient(hl[0] * k, 0, (hl[0] + 1.8) * k, 0)
    g.addColorStop(0, rgba(D.head, 0.35 * on))
    g.addColorStop(1, rgba(D.head, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    const e0 = B(LEN + 1.8, 0.5)
    const e1 = B(LEN + 1.8, -0.05)
    ctx.moveTo(hl[0] * k, (hl[1] - 0.04) * k)
    ctx.lineTo(e0[0] * k, e0[1] * k)
    ctx.lineTo(e1[0] * k, e1[1] * k)
    ctx.lineTo(hl[0] * k, (hl[1] + 0.04) * k)
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
  const tl = B(-0.02, 0.3)
  glow(p, k, tl[0], tl[1], 0.4, D.tail, 0.45 * brake)
  shape(p, k, at([[-0.06, 0.26], [0.04, 0.26], [0.04, 0.36], [-0.06, 0.36]]), brake > 0.6 ? D.tail : alpha(p, D.tail, 0.6), null)
  shape(p, k, at([[LEN - 0.04, 0.26], [LEN + 0.04, 0.26], [LEN + 0.04, 0.34], [LEN - 0.04, 0.34]]), D.head, null)
}
