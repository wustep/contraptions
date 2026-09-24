import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { clamp, easeInOutSine, easeInQuad, easeOutCubic } from '../../../../../../../../src/core/ease'
import { FLOOR, R, laneAt, mixHex, puff, type Lane, type Pt } from '../../../../../parts'
import type { ShowBall } from '../../../../../show'
import { alpha, box, carried, frame, hash, knock, part, route, smooth, type Ctx, type PartShot } from '../kit'
import { ACT1_END, beat, LAST } from '../music'
import { dropTime, G_EARTH } from '../physics'
import { bookAt, bookRests, drawToy, FALL_NOTES, LANDER_X, SHELF_TOP, stayRow, TOY_HOME, type Fallen } from '../earth/house'
import { BALL, DARK, DUST, FARM, VOID } from '../worlds'
import { MILLER_HANDOFF } from './miller'

/**
 * Gargantua, the tesseract, and home.
 *
 * The black hole is the one that hung small in Miller's sky, and it swells
 * as the ball rises at it. The Ranger that stood on Miller's water lifts off
 * (181), picks TARS up on its back (182½), draws away toward the hole as it
 * climbs, and comes round with a claw on a tether and takes the ball on the
 * downbeat (184): one ship all the way, so there is never a second Ranger in
 * the frame. TARS lets go of its back on 185 and
 * goes in first. The Ranger swings the ball round the hole: down through the
 * disk on 186, behind the dark on 187 (its light wraps the rim), up through
 * the disk on the loudest eighth (187½) with the engine lit, and over the
 * top it opens the claw on the downbeat (188) and burns away. The ball
 * falls in, slows, and stops at the centre on 189; the dark opens round it.
 *
 * Inside is the back of Murph's bookcase, in a lattice of frames. The ball
 * comes down onto a rail by the end of the top shelf on 190 and rolls in
 * behind the model lander, and on the last hit (191) it is the ghost, and
 * the lander tips away from us into the room. Then the tesseract lets go
 * and the room comes up from the front, round the ghost: Murph's room at
 * dusk, framed as the show began. The ghost goes along behind the row and
 * pushes the ten books off, one at a time, in the opening's own rhythm
 * (S-T-A-Y, the same offsets from the lander), and they fall and lie where
 * the opening left them. It comes to rest at the end of the row, where the
 * first frame had it, glowing.
 *
 * The part's frame: the ball comes off the wave's lip at (-0.5, 0). Miller's
 * Gargantua stands at C in this frame; ours is drawn on it, concentric.
 */

const TAU = Math.PI * 2

/* ------------------------------------------------------------------ the clock (show seconds) */

const CATCH = beat(184)
/** TARS lets go of the Ranger's back. */
const LATCH = beat(185)
/** Down through the disk on the right. */
const NODE_A = beat(186)
/** TARS is gone. */
const SWALLOW = beat(186.5)
/** Behind the dark: the ball's light wraps the rim. */
const BEHIND = beat(187)
/** Up through the disk on the left, close in, the engine lit: the loudest eighth. */
const NODE_B = beat(187.5)
const RELEASE = beat(188)
/** At the centre; the dark opens. */
const HORIZON = beat(189)
const LAND = beat(190)
/** The last hit: the ball is the ghost, and the lander goes. */
const PUSH = LAST
/**
 * The ten books go at the opening's own offsets from the lander, counted now
 * from the last hit: the decay has nothing to strike, and the rhythm the
 * opening had is the rhyme. Not strikes on the music, so not in the list.
 */
const PUSHES = FALL_NOTES.books.map((n) => PUSH + (n - FALL_NOTES.lander))
/** The turn: the back of the case and the lattice go, and the room comes up from the front, round the ghost. */
const TURN0 = PUSH + 0.55
const TURN1 = PUSH + 1.45
/** It sets off along the row once the room is up, and is at rest at the end of it a moment after the last book. */
const SET_OFF = TURN1 + 0.1
const AT_REST = PUSHES[PUSHES.length - 1] + 0.4
/** The watch keeps time in the silence after the music: two ticks, not counted as strikes. */
const TICKS = [beat(200), beat(202)]

/** The strikes, on the music. */
export const GARGANTUA_HITS = [CATCH, LATCH, NODE_A, SWALLOW, BEHIND, NODE_B, RELEASE, HORIZON, LAND, PUSH]

/* ------------------------------------------------------------------ the hole */

/** Gargantua, just up and on from the lip: small, as it hangs in Miller's sky, until the Ranger takes the ball in. */
const C: Pt = [0.95, -0.85]
/** The dark's radius: as Miller draws it far off, and as big as it gets. */
const S0 = 0.3
const S1 = 0.7
/** The disk's tilt, as Miller has it. */
const TILT = -0.07
/** In units of the dark's radius: the lensed far side of the disk over the top and under, and the disk's reach. */
const ARC_TOP = 1.31
const ARC_LOW = 1.25
const RING = 1.04
const DISK = 4.7

/** How big the dark is (cells) at `T`: Miller's size until the catch, then it swells as the ball is carried in. */
const sizeAt = (T: number): number => S0 + (S1 - S0) * easeInOutSine(clamp((T - (CATCH - 0.2)) / (beat(186.25) - CATCH + 0.2)))

const rot = (x: number, y: number, a = TILT): Pt => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]
/** A point of the hole's own plane (units of its dark), on the stage at `T`. */
const onStage = (v: Pt, T: number): Pt => {
  const s = sizeAt(T)
  const [x, y] = rot(v[0] * s, v[1] * s)
  return [C[0] + x, C[1] + y]
}

/* ------------------------------------------------------------------ the swing */

/**
 * The claw's path round the hole, in the hole's units: an inclined orbit,
 * seen so its near half is the top of the ellipse, its far half the bottom
 * (behind the dark), and it passes through the disk's plane on the right and
 * the left. Clockwise on the screen, spiralling in.
 */
const QT = 0.46
const QB = 0.3
const squash = (th: number) => QB + (QT - QB) * (1 + Math.sin(th)) / 2
const TH_CATCH = Math.PI - 0.3
const TH_REL = -1.5 * Math.PI
const rOrbit = (th: number) => 2.4 - 0.146 * (TH_CATCH - th)
const orbitPt = (r: number, th: number): Pt => [r * Math.cos(th), -r * Math.sin(th) * squash(th)]

/** Monotone cubic through knots: the claw's angle against time. */
function pchip(xs: number[], ys: number[]): { at: (x: number) => number; slope: (x: number) => number } {
  const n = xs.length
  const h: number[] = []
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) {
    h.push(xs[i + 1] - xs[i])
    d.push((ys[i + 1] - ys[i]) / h[i])
  }
  const m: number[] = new Array(n).fill(0)
  m[0] = d[0]
  m[n - 1] = d[n - 2]
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0
    else {
      const w1 = 2 * h[i] + h[i - 1]
      const w2 = h[i] + 2 * h[i - 1]
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
    }
  }
  const seg = (x: number) => {
    let i = 0
    while (i < n - 2 && x > xs[i + 1]) i++
    return i
  }
  return {
    at(x) {
      if (x <= xs[0]) return ys[0] + m[0] * (x - xs[0])
      if (x >= xs[n - 1]) return ys[n - 1] + m[n - 1] * (x - xs[n - 1])
      const i = seg(x)
      const u = (x - xs[i]) / h[i]
      const h00 = 2 * u ** 3 - 3 * u * u + 1
      const h10 = u ** 3 - 2 * u * u + u
      const h01 = -2 * u ** 3 + 3 * u * u
      const h11 = u ** 3 - u * u
      return h00 * ys[i] + h10 * h[i] * m[i] + h01 * ys[i + 1] + h11 * h[i] * m[i + 1]
    },
    slope(x) {
      const e = 1e-4
      return (this.at(x + e) - this.at(x - e)) / (2 * e)
    },
  }
}

const theta = pchip([CATCH, LATCH, NODE_A, BEHIND, NODE_B, RELEASE], [TH_CATCH, Math.PI / 2, 0, -Math.PI / 2, -Math.PI, TH_REL])

/** Let go over the top, the ball goes on round and in, slower and slower, and stops: the far end of time. */
const TH_F = TH_REL - 0.9
const R_REL = rOrbit(TH_REL)
const R_F = 1.0
const DRAIN = HORIZON - RELEASE
const M_REL = Math.max(theta.slope(RELEASE), (2.6 * (TH_F - TH_REL)) / DRAIN)
function drainTheta(T: number): number {
  const u = clamp((T - RELEASE) / DRAIN)
  const h10 = u ** 3 - 2 * u * u + u
  const h01 = -2 * u ** 3 + 3 * u * u
  return TH_REL * (2 * u ** 3 - 3 * u * u + 1) + h10 * DRAIN * M_REL + h01 * TH_F
}
function drainR(th: number): number {
  const s = clamp((th - TH_REL) / (TH_F - TH_REL))
  const a = -0.146 * (TH_REL - TH_F)
  return R_REL + a * s + (R_F - R_REL - a) * s * s
}

/** Where the ball freezes: the centre it falls from into the lattice. */
const F: Pt = onStage(orbitPt(R_F, TH_F), HORIZON)

/** The ball as the swing has it (claw included), on the stage, and whether it is on the far side. */
function swingAt(T: number): { p: Pt; behind: boolean } {
  if (T <= RELEASE) {
    const th = theta.at(T)
    return { p: onStage(orbitPt(rOrbit(th), th), T), behind: Math.sin(th) < -1e-6 && T >= CATCH }
  }
  const th = drainTheta(T)
  return { p: onStage(orbitPt(drainR(th), th), T), behind: false }
}

const vel = (fn: (T: number) => Pt, T: number): Pt => {
  const e = 1e-3
  const a = fn(T - e)
  const b = fn(T + e)
  return [(b[0] - a[0]) / (2 * e), (b[1] - a[1]) / (2 * e)]
}
const swingPt = (T: number): Pt => swingAt(T).p

/** The flight off the lip to the claw: the lip's own speed out, the claw's in. */
const E: Pt = [-0.5, 0]
/** How the wave lets it go (cells a second), as Miller's ride ends. */
const V_LIP: Pt = [0.96, -2.02]
function hermite(p0: Pt, v0: Pt, p1: Pt, v1: Pt, D: number, u: number): Pt {
  const h00 = 2 * u ** 3 - 3 * u * u + 1
  const h10 = u ** 3 - 2 * u * u + u
  const h01 = -2 * u ** 3 + 3 * u * u
  const h11 = u ** 3 - u * u
  return [h00 * p0[0] + h10 * D * v0[0] + h01 * p1[0] + h11 * D * v1[0], h00 * p0[1] + h10 * D * v0[1] + h01 * p1[1] + h11 * D * v1[1]]
}

/* ------------------------------------------------------------------ the Ranger */

const TETHER = 0.52
/**
 * The Ranger is Miller's: it sits on the water in Miller's part until the ball
 * meets the wave (beat 181), and from then this part draws it, the same hull at
 * the same size, lifting off, skimming the wave to take TARS on its back
 * (182½), and climbing away toward the hole, smaller as it goes, to catch the
 * ball on 184.
 */
const MILLER_END = MILLER_HANDOFF.exitEnd()
const fromMiller = (q: Pt): Pt => [q[0] - MILLER_END[0] - 0.5, q[1] - MILLER_END[1]]
const LIFT = MILLER_HANDOFF.lift
const PICK = MILLER_HANDOFF.picked
const LANDED = fromMiller(MILLER_HANDOFF.ranger)
const tarsOnWave = (T: number): Pt => fromMiller(MILLER_HANDOFF.tars(T))
/** The Ranger's size: Miller's on the water, a third of it by the catch, out toward the hole. */
const shipScale = (T: number): number => (T <= LIFT ? 1 : T >= CATCH ? 0.32 : 1 - 0.68 * easeInOutSine((T - LIFT) / (CATCH - LIFT)))
/** How far TARS's back is from the Ranger's belly line, at its size. */
const backOff = (T: number): number => 0.53 * shipScale(T)
function approachAt(T: number): Pt {
  const s1 = shipAt(CATCH)
  const v1 = vel((u) => shipAt(Math.max(u, CATCH)), CATCH + 0.002)
  // Where it has to be for TARS, on the wave, to be on its back.
  const hub = tarsOnWave(PICK)
  const dx = hub[0] - C[0]
  const dy = hub[1] - C[1]
  const d = Math.hypot(dx, dy) || 1
  const pick: Pt = [hub[0] - (dx / d) * backOff(PICK), hub[1] - (dy / d) * backOff(PICK)]
  const vPick: Pt = [(s1[0] - LANDED[0]) / (CATCH - LIFT) * 1.15, (s1[1] - LANDED[1]) / (CATCH - LIFT) * 0.6]
  if (T < PICK) return hermite(LANDED, [0.8, -2.2], pick, vPick, PICK - LIFT, clamp((T - LIFT) / (PICK - LIFT)))
  return hermite(pick, vPick, s1, v1, CATCH - PICK, clamp((T - PICK) / (CATCH - PICK)))
}

function shipAt(T: number): Pt {
  if (T < CATCH) return T <= LIFT ? LANDED : approachAt(T)
  if (T <= RELEASE) {
    const b = swingPt(T)
    const dx = b[0] - C[0]
    const dy = b[1] - C[1]
    const d = Math.hypot(dx, dy) || 1
    return [b[0] + (TETHER * dx) / d, b[1] + (TETHER * dy) / d]
  }
  const s = shipAt(RELEASE)
  const v = vel((u) => shipAt(Math.min(u, RELEASE)), RELEASE - 0.002)
  const sp = Math.hypot(v[0], v[1]) || 1
  const tau = T - RELEASE
  const go = sp * tau + 2.8 * tau * tau
  return [s[0] + (v[0] / sp) * go, s[1] + (v[1] / sp) * go]
}

/* ------------------------------------------------------------------ inside */

/**
 * Where the ghost comes to rest, and so where this part hands Act II its ball:
 * fixed by the first cut of this part (a run along a rail to the last book)
 * and kept to the cell, since the station is placed from it.
 */
const RUN = 2.6
const LAND_PT: Pt = [F[0] + (RUN * (LAND - HORIZON)) / 2, F[1] + 1.55]
const Y_BALL = LAND_PT[1]
const SURF = Y_BALL + R
const ROW = stayRow()
const B: Pt = [LAND_PT[0] + RUN * (PUSH - LAND) + 0.45 + ROW[ROW.length - 1].x, SURF - SHELF_TOP]
const X_REST = B[0] - ROW[ROW.length - 1].x - 0.45 + 0.09
const Y_REST = Y_BALL
/** Where the ghost rests at the end, in the bookcase's own cells (the shelf part's frame): Act II's replica room starts from it. */
export const GHOST_ON_SHELF = (): Pt => [B[0] - X_REST, Y_REST - B[1]]
/** The room, seen from the front: the case's frame, so the ghost's rest in it is where it rests here. */
const BF: Pt = [X_REST - (B[0] - X_REST), B[1]]
/** A point of the shelf's frame, seen from the front. */
const front = (x: number): number => BF[0] + x
/**
 * The case seen from behind, mirrored (x here = BK.x - x there), placed so
 * that the ghost behind the lander is in the same place seen from either
 * side: the turn from the back to the front happens round it.
 */
const BK: Pt = [BF[0] + 2 * LANDER_X, B[1]]
const back = (x: number): number => BK[0] - x
/** The ghost behind the lander, and where the ball comes down on the rail before it rolls in there. */
const P_L: Pt = [back(LANDER_X), Y_BALL]
const LAND2: Pt = [P_L[0] + 0.75, Y_BALL]
/** The books where they come to rest on the floor, as the opening left them. */
const RESTS: Fallen[] = bookRests()

/**
 * Along the back of the row, seen from the front: to each book a moment
 * before its note, a push on the note, and on to the next once it has gone.
 */
function along(at: (T: number) => number): { at: number; p: Pt; ease?: 'inout' }[] {
  const out: { at: number; p: Pt; ease?: 'inout' }[] = []
  for (let i = 0; i < ROW.length; i++) {
    const prev = i === 0 ? SET_OFF : PUSHES[i - 1]
    const next = i === ROW.length - 1 ? AT_REST : PUSHES[i + 1]
    const early = Math.min(0.08, (PUSHES[i] - prev) / 4)
    const late = Math.min(0.06, (next - PUSHES[i]) / 4)
    const p: Pt = [front(ROW[i].x), Y_BALL]
    out.push({ at: at(PUSHES[i] - early), p, ease: 'inout' }, { at: at(PUSHES[i] + late), p })
  }
  return out
}

/** The ghost's lean into each push, as a change in its size: smaller going away from us (the lander, from behind), larger coming at us (the books). */
function shoveAt(T: number): number {
  let v = -0.08 * leanPulse(T - PUSH)
  for (const at of PUSHES) v += 0.07 * leanPulse(T - at)
  return v
}
const leanPulse = (s: number): number => (s < -0.06 || s > 0.3 ? 0 : s < 0 ? smooth(s, -0.06, 0) : Math.exp(-s / 0.08))

/* ------------------------------------------------------------------ the part */

interface GargState {
  begin: number
  lane: Lane
}

export const gargantua = part<GargState>(
  {
    name: 'gargantua',
    flight: true,
    dynamic: true,
    draw: (p, s, c) => drawAll(p, s, c),
    over: (p, s, c) => drawOver(p, s, c),
  },
  (slot) => {
    const at = (T: number) => T - slot.begin
    const flight = (u: number): Pt => {
      const T = u + slot.begin
      const D = CATCH - slot.begin
      return hermite(E, V_LIP, swingPt(CATCH), [vel(swingPt, CATCH + 0.002)[0] * 0.55, vel(swingPt, CATCH + 0.002)[1] * 0.55], D, clamp((T - slot.begin) / D))
    }
    const swing = (u: number): Pt => swingPt(u + slot.begin)
    const segs = [
      ...carried(flight, 0, at(CATCH), 16),
      ...carried(swing, at(CATCH), at(RELEASE), 90),
      ...carried(swing, at(RELEASE), at(HORIZON), 36),
      ...route([
        { at: at(HORIZON), p: F },
        // Out of the centre onto the rail by the case's end, and in along it behind the lander, slowing.
        { at: at(LAND), p: LAND2, ease: 'in' },
        { at: at(PUSH), p: P_L, ramp: [1.7, 0.6] },
        // It stays there, the lander gone, while the room turns round it.
        { at: at(SET_OFF), p: P_L },
        ...along(at),
        { at: at(AT_REST), p: [X_REST, Y_REST], ease: 'inout' },
        { at: slot.end - slot.begin, p: [X_REST, Y_REST] },
      ]),
    ]
    const lane: Lane = { segs, fire: at(CATCH) }
    const riders = (t: number, hero: ShowBall): ShowBall[] | null => {
      // Near the centre it is drawn out toward it, and stays so, stopped, until the dark opens.
      const pull = smooth(t, RELEASE + 0.25, HORIZON) * (1 - smooth(t, HORIZON + 0.05, HORIZON + 0.4))
      if (pull > 0) {
        const angle = Math.atan2(C[1] - hero.y, C[0] - hero.x)
        return [{ ...hero, stretch: 1 + 0.55 * pull, angle, scale: (hero.scale ?? 1) * (1 - 0.18 * pull) }]
      }
      // Each push is a lean: away from us into the lander (seen from behind), toward us into each book (from the front).
      const lean = shoveAt(t)
      if (Math.abs(lean) < 0.002) return null
      return [{ ...hero, scale: (hero.scale ?? 1) * (1 + lean) }]
    }
    return {
      cells: box(-9, -5, 9, 4),
      exit: [X_REST + 0.5, Y_REST],
      lane,
      state: { begin: slot.begin, lane },
      changes: [{ at: at(PUSH), ghost: true }],
      riders,
    }
  },
  (slot) => {
    const shots: PartShot[] = [
      // Miller's last framing, then out to the hole as the Ranger comes round.
      { t: slot.begin, cells: 8, hold: [-1.44, 0.43], w: 0.85 },
      { t: CATCH, cells: 5.4, hold: [C[0] + 0.55, C[1] + 0.1], w: 0.75 },
      { t: beat(186), cells: 5.8, hold: [C[0] + 0.1, C[1] + 0.15], w: 0.85 },
      { t: RELEASE, cells: 5.2, hold: [C[0], C[1]], w: 0.9 },
      { t: HORIZON, cells: 3.4, hold: F, w: 1 },
      // Down into the lattice, the back of the case under it; in close behind the lander for the last hit.
      { t: LAND, cells: 3.3, hold: [LAND2[0] - 0.55, Y_BALL - 0.45], w: 1 },
      { t: PUSH, cells: 2.3, hold: [P_L[0] - 0.15, Y_BALL - 0.2], w: 1 },
      { t: TURN0, cells: 2.3, hold: [P_L[0] - 0.15, Y_BALL - 0.2], w: 1 },
      // The turn, round the ghost: the room from the front, framed as the show began, for the books.
      { t: TURN1, cells: 2.9, hold: [BF[0] + 0.75, BF[1] - 0.55], w: 1 },
      { t: ACT1_END, cells: 2.9, hold: [BF[0] + 0.75, BF[1] - 0.55], w: 1 },
    ]
    return shots
  },
)

/* ------------------------------------------------------------------ drawing */

const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`
}

function glow(p: p5, x: number, y: number, r: number, hex: string, a: number): void {
  if (a <= 0.005 || r <= 0) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, rgba(hex, a))
  g.addColorStop(0.4, rgba(hex, a * 0.45))
  g.addColorStop(1, rgba(hex, 0))
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r)
}

function bar(p: p5, ink: string, weight: number, fill: string, w: number, pts: Pt[]): void {
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(w + weight * 2)
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x, y)
  p.endShape()
  p.stroke(fill)
  p.strokeWeight(Math.max(1, w))
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x, y)
  p.endShape()
}

/** How far the dark has opened round the ball: 1 until the horizon, then fast past the frame. */
const swellAt = (T: number): number => 1 + 30 * easeInQuad(clamp((T - HORIZON) / 0.62))
/** How much of the inside is up: the lattice, the rail, the case. */
const insideAt = (T: number): number => smooth(T, HORIZON + 0.25, HORIZON + 0.7)
/**
 * The turn: the back of the case goes first, and for a moment the ghost is
 * alone in the lattice; then the lattice goes as the room comes up from the
 * front, round it. Never the two sides of the case at once.
 */
const backAt = (T: number): number => insideAt(T) * (1 - smooth(T, TURN0, TURN0 + 0.35))
const latticeAt = (T: number): number => insideAt(T) * (1 - smooth(T, TURN0 + 0.45, TURN1))
const roomAt = (T: number): number => smooth(T, TURN0 + 0.4, TURN1)

function drawAll(p: p5, s: GargState, c: Ctx): void {
  const T = s.begin + c.t
  if (T < HORIZON + 0.62) drawGargantua(p, s, c, T)
  if (T > HORIZON + 0.1) drawInside(p, s, c, T)
}

/* ------------------------------------------------------------------ Gargantua */

interface HoleLook {
  cx: number
  cy: number
  /** The dark's radius, cells. */
  r: number
}

function holeLook(T: number): HoleLook {
  const g = swellAt(T)
  const r = sizeAt(T) * g
  // It opens about the ball's stopping place.
  return { cx: F[0] + (C[0] - F[0]) * g, cy: F[1] + (C[1] - F[1]) * g, r }
}

/**
 * The hole's hard parts, flat, as Miller draws it far off: the disk edge on,
 * a line of amber and gold; the dark; the far side of the disk bent up over
 * the top and down under the bottom; and the near side of the disk crossing
 * in front of the dark, hottest at the middle. Drawn again over the ball
 * when the ball is behind. `bright` is a flash along the disk; `fade` is how
 * much of the light is left while the dark opens.
 */
function holeSolid(p: p5, c: Ctx, h: HoleLook, bright = 0, fade = 1): void {
  const { k } = c
  const X = (v: number) => v * k
  const r = h.r
  // Line weights in cells, as Miller's at its size, thinning a little as it grows.
  const m = Math.pow(r / S0, 0.72)
  const W = (w: number) => Math.max(1, k * w * m)
  const line = (x0: number, x1: number, w: number, col: string, a: number) => {
    if (a <= 0.004) return
    p.stroke(alpha(p, col, a))
    p.strokeWeight(W(w))
    p.line(X(x0 * r), 0, X(x1 * r), 0)
  }
  const hot = (col: string) => mixHex(col, VOID.ink, 0.6 * bright)
  p.push()
  p.translate(X(h.cx), X(h.cy))
  p.rotate(TILT)
  p.noFill()
  line(-DISK, DISK, 0.036, hot(DARK.amber), 0.55 * fade)
  line(-DISK * 0.7, DISK * 0.7, 0.025, hot(DARK.gold), 0.95 * fade)
  p.noStroke()
  p.fill(VOID.bg)
  p.circle(0, 0, X(2 * r))
  p.noFill()
  p.stroke(alpha(p, DARK.gold, 0.95 * fade))
  p.strokeWeight(W(0.05))
  p.arc(0, 0, X(2 * ARC_TOP * r), X(2 * ARC_TOP * r), Math.PI + 0.2, TAU - 0.2)
  p.strokeWeight(W(0.022))
  p.arc(0, 0, X(2 * ARC_LOW * r), X(2 * ARC_LOW * r), 0.35, Math.PI - 0.35)
  line(-DISK * 0.33, DISK * 0.33, 0.025, hot(DARK.gold), 0.95 * fade)
  line(-DISK * 0.2, DISK * 0.2, 0.011, hot(DARK.hull), 0.9 * fade)
  p.pop()
}

/** In Miller's sky it is a quiet thing until the ball comes off the crest at it: then it is the only thing. */
const presentAt = (T: number): number => 0.42 + 0.58 * smooth(T, beat(182.2), beat(183.2))

function drawGargantua(p: p5, _s: GargState, c: Ctx, T: number): void {
  const { k } = c
  const X = (v: number) => v * k
  const ctx0 = p.drawingContext as CanvasRenderingContext2D
  const was = ctx0.globalAlpha
  ctx0.globalAlpha = was * presentAt(T)
  const h = holeLook(T)
  // Its light goes first as the dark opens.
  const fade = 1 - smooth(T, HORIZON - 0.02, HORIZON + 0.22)
  glow(p, X(h.cx), X(h.cy), X(4.6 * h.r), DARK.amber, 0.16 * fade)

  // Behind the hole: the Ranger and the ball's tether when they are on the far side.
  const sw = swingAt(T)
  const shipBehind = T >= CATCH && T <= RELEASE && sw.behind
  // The Ranger and TARS are not the hole: they keep their full strength.
  const full = (fn: () => void) => { ctx0.globalAlpha = was; fn(); ctx0.globalAlpha = was * presentAt(T) }
  if (shipBehind) full(() => drawRanger(p, c, T))

  // The disk rings when something goes through it.
  let bright = 0
  for (const at of [NODE_A, NODE_B]) bright = Math.max(bright, (at === NODE_B ? 1 : 0.7) * knock(T - at, 0.22))
  holeSolid(p, c, h, bright, fade)

  // Where the claw went through the disk: a burst of disk-stuff, flung along its way.
  for (const [at, power, seed] of [[NODE_A, 0.7, 1], [NODE_B, 1, 2]] as [number, number, number][]) {
    const since = T - at
    if (since < 0 || since > 0.7) continue
    const [bx, by] = swingPt(at)
    const [vx, vy] = vel(swingPt, at)
    const a0 = Math.atan2(vy, vx)
    glow(p, X(bx), X(by), X(0.2 + 0.35 * since), VOID.ink, 0.75 * power * knock(since, 0.12))
    p.noStroke()
    for (let i = 0; i < 9; i++) {
      const a = a0 + (hash(i, seed, 3) - 0.5) * 1.6
      const sp = 0.6 + 1.4 * hash(i, seed, 5)
      const d = sp * 0.35 * (1 - Math.exp(-since / 0.35))
      p.fill(alpha(p, i % 3 === 0 ? VOID.ink : DARK.gold, power * (1 - since / 0.7)))
      p.circle(X(bx + Math.cos(a) * d), X(by + Math.sin(a) * d), X(0.035 * (1 - since / 0.7) + 0.01))
    }
  }

  // Behind the dark, the ball's own light wraps its rim: two arcs that close into a ring as it passes the middle.
  if (sw.behind && T > NODE_A && T < NODE_B) einstein(p, c, h, sw.p)

  // TARS, gone in: the rim flickers once where it went.
  const sw2 = T - SWALLOW
  if (sw2 >= 0 && sw2 < 0.5) {
    p.noFill()
    p.stroke(alpha(p, VOID.ink, 0.7 * (1 - sw2 / 0.5)))
    p.strokeWeight(Math.max(1, k * 0.02))
    p.circle(X(h.cx), X(h.cy), X(2 * h.r * (1.02 + 0.25 * sw2)))
  }
  // The horizon: a thin white line runs round the dark's edge, and the dark opens past the frame.
  const hz = T - HORIZON
  if (hz >= 0 && hz < 0.62) {
    const a = knock(hz, 0.2)
    p.noFill()
    p.stroke(alpha(p, VOID.ink, 0.85 * a))
    p.strokeWeight(Math.max(1, k * 0.022))
    p.circle(X(h.cx), X(h.cy), X(2 * h.r * RING))
  }

  full(() => drawTars(p, c, T))
  if (!shipBehind) full(() => drawRanger(p, c, T))
  ctx0.globalAlpha = was
}

/** The lensed image of the ball behind the dark. */
function einstein(p: p5, c: Ctx, h: HoleLook, at: Pt): void {
  const { k } = c
  const X = (v: number) => v * k
  const dx = at[0] - h.cx
  const dy = at[1] - h.cy
  const d = Math.hypot(dx, dy) / h.r
  const e = clamp(1 - (d - 0.3) / 1.2)
  if (e <= 0) return
  const phi = Math.atan2(dy, dx)
  const wide = Math.PI * 0.92 * Math.pow(e, 0.8)
  const rr = X(2 * h.r * 1.07)
  p.noFill()
  // A soft underlayer, then the bright line.
  for (const [w, a] of [[0.09, 0.28], [0.035, 1]] as Pt[]) {
    p.stroke(alpha(p, BALL, a * e))
    p.strokeWeight(Math.max(1, k * w))
    p.arc(X(h.cx), X(h.cy), rr, rr, phi - wide, phi + wide)
    const back = wide * Math.pow(e, 0.7) - 0.25
    if (back > 0.02) p.arc(X(h.cx), X(h.cy), rr, rr, phi + Math.PI - back, phi + Math.PI + back)
  }
}

/** The Ranger, the tether and the claw's mount; the claw's jaws are drawn over the ball. */
function drawRanger(p: p5, c: Ctx, T: number): void {
  if (T < LIFT || T > RELEASE + 3) return
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const sp = shipAt(T)
  const v = vel(shipAt, T)
  const vs = Math.hypot(v[0], v[1]) || 1
  const f: Pt = [v[0] / vs, v[1] / vs]
  // Its belly to the hole: the tether hangs that way.
  let bx = C[0] - sp[0]
  let by = C[1] - sp[1]
  const bl = Math.hypot(bx, by) || 1
  bx /= bl
  by /= bl
  // Keep the belly square to the heading.
  const side = f[0] * by - f[1] * bx >= 0 ? 1 : -1
  let b: Pt = [-f[1] * side, f[0] * side]
  // Off the water it turns from Miller's pose (nose on, belly down) to its heading.
  const turn = smooth(T, LIFT, LIFT + 0.5)
  if (turn < 1) {
    const fx = 1 + (f[0] - 1) * turn
    const fy = f[1] * turn
    const fl = Math.hypot(fx, fy) || 1
    f[0] = fx / fl
    f[1] = fy / fl
    const bx2 = b[0] * turn
    const by2 = 1 + (b[1] - 1) * turn
    const bl2 = Math.hypot(bx2, by2) || 1
    b = [bx2 / bl2, by2 / bl2]
  }
  const S = shipScale(T)
  // The lift: a burst of spray off the water under it.
  const lifted = T - LIFT
  if (lifted >= 0 && lifted < 0.7) {
    const u = lifted / 0.7
    p.push()
    ;(p.drawingContext as CanvasRenderingContext2D).globalAlpha = 0.8 * (1 - u)
    for (const dx of [-0.6, 0, 0.6]) puff(p, k, ink, weight * 0.45, DARK.hull, LANDED[0] + dx * (1 + u), LANDED[1] + 0.35 - 0.2 * u, 0.12 + 0.25 * u)
    p.pop()
  }
  const W = (x: number, y: number): Pt => [sp[0] + (x * f[0] + y * b[0]) * S, sp[1] + (x * f[1] + y * b[1]) * S]
  const V = (x: number, y: number) => {
    const [a, bb] = W(x, y)
    p.vertex(X(a), X(bb))
  }
  const claw = clawAt(T)
  // The tether, from the winch under the belly to the claw.
  const winch = W(0.1, 0.12)
  outline(p, ink, weight * 0.55)
  p.line(X(winch[0]), X(winch[1]), X(claw.base[0]), X(claw.base[1]))
  // The claw's mount at the tether's end.
  solid(p, ink, weight * 0.6, DARK.slate)
  p.circle(X(claw.base[0]), X(claw.base[1]), X(0.09))
  // The engine: lit at the periapsis and as it goes.
  const burn = Math.max(knock(T - NODE_B, 0.35) * smooth(T, NODE_B - 0.03, NODE_B), smooth(T, RELEASE, RELEASE + 0.15))
  if (burn > 0.02) {
    const flick = 0.85 + 0.15 * Math.sin(T * 61)
    const [ex, ey] = W(-1.2, -0.18)
    glow(p, X(ex), X(ey), X(0.3 + 0.25 * burn), DARK.amber, 0.7 * burn)
    solid(p, ink, weight * 0.5, DARK.amber)
    p.beginShape()
    V(-1.2, -0.3)
    V(-1.2 - 1.6 * burn * flick, -0.18)
    V(-1.2, -0.06)
    p.endShape(p.CLOSE)
  }
  // The hull: Miller's Ranger, small, a low wedge nose-first, belly to the hole.
  solid(p, ink, weight * 0.8, DARK.hull)
  p.beginShape()
  for (const [x, y] of [[-1.15, 0], [1.12, 0], [1.2, -0.05], [0.9, -0.2], [0.45, -0.4], [-0.2, -0.42], [-1.0, -0.36], [-1.18, -0.3]] as Pt[]) V(x, y)
  p.endShape(p.CLOSE)
  solid(p, ink, weight * 0.5, DARK.slate)
  p.beginShape()
  for (const [x, y] of [[-1.15, 0], [1.12, 0], [1.05, -0.07], [-1.12, -0.09]] as Pt[]) V(x, y)
  p.endShape(p.CLOSE)
  solid(p, ink, weight * 0.5, VOID.bg)
  p.beginShape()
  for (const [x, y] of [[0.55, -0.34], [0.86, -0.2], [0.98, -0.14], [0.6, -0.26]] as Pt[]) V(x, y)
  p.endShape(p.CLOSE)
  // The latch on its back that holds TARS, and lets go on 185.
  const pop = T >= LATCH ? smooth(T, LATCH - 0.03, LATCH) : 0
  const [l0x, l0y] = W(-0.3, -0.42)
  const [l1x, l1y] = W(-0.3 - 0.25 * pop, -0.42 - 0.3 * pop)
  outline(p, ink, weight * 0.8)
  p.line(X(l0x), X(l0y), X(l1x), X(l1y))
  const gas = T - LATCH
  if (gas >= 0 && gas < 0.8) {
    const u = gas / 0.8
    const [gx, gy] = W(-0.3, -0.62 - 0.9 * Math.sqrt(u))
    p.push()
    ;(p.drawingContext as CanvasRenderingContext2D).globalAlpha = 0.7 * (1 - u)
    puff(p, k, ink, weight * 0.45, DARK.hull, gx, gy, 0.035 + 0.06 * Math.sqrt(u))
    p.pop()
  }
  const rel = T - RELEASE
  if (rel >= 0 && rel < 0.8) {
    const u = rel / 0.8
    p.push()
    ;(p.drawingContext as CanvasRenderingContext2D).globalAlpha = 0.6 * (1 - u)
    puff(p, k, ink, weight * 0.45, DARK.hull, claw.base[0] + (claw.dir[0] * 0.1 + 0.05) * (1 + u), claw.base[1] + claw.dir[1] * 0.1 * (1 + u), 0.03 + 0.05 * Math.sqrt(u))
    p.pop()
  }
}

/** The claw at `T`: its mount, the way it points (to the ball), and how open its jaws are. */
function clawAt(T: number): { base: Pt; dir: Pt; open: number; ball: Pt } {
  const sp = shipAt(T)
  let ball: Pt
  if (T >= CATCH && T <= RELEASE) ball = swingPt(T)
  else {
    // Empty, it hangs from the Ranger toward the hole.
    const dx = C[0] - sp[0]
    const dy = C[1] - sp[1]
    const d = Math.hypot(dx, dy) || 1
    ball = [sp[0] + (TETHER * dx) / d, sp[1] + (TETHER * dy) / d]
  }
  const dx = ball[0] - sp[0]
  const dy = ball[1] - sp[1]
  const d = Math.hypot(dx, dy) || 1
  const dir: Pt = [dx / d, dy / d]
  const base: Pt = [ball[0] - dir[0] * (R + 0.07), ball[1] - dir[1] * (R + 0.07)]
  let open = 0.95
  if (T > CATCH - 0.08) {
    const u = smooth(T, CATCH - 0.08, CATCH)
    const over = T > CATCH ? -0.1 * Math.exp(-(T - CATCH) / 0.08) * Math.cos((T - CATCH) * 30) : 0
    open = 0.95 * (1 - u) + over
  }
  if (T > RELEASE - 0.02) open = 1.1 * easeOutCubic(clamp((T - RELEASE + 0.02) / 0.12))
  return { base, dir, open, ball }
}

/** The jaws, over the ball. */
function drawJaws(p: p5, c: Ctx, T: number): void {
  if (T < CATCH - 2.5 || T > RELEASE + 3) return
  const { k, ink, weight } = c
  const { base, dir, open } = clawAt(T)
  const nx = -dir[1]
  const ny = dir[0]
  const W = (along: number, out: number): Pt => [(base[0] + nx * along + dir[0] * out) * k, (base[1] + ny * along + dir[1] * out) * k]
  for (const side of [-1, 1]) {
    const piv: Pt = [side * 0.07, 0]
    const pts: Pt[] = [
      [side * 0.07, 0],
      [side * 0.16, 0.1],
      [side * 0.12, 0.22],
    ]
    const ang = side * open
    const rotd = pts.map(([a, o]) => {
      const da = a - piv[0]
      const dO = o - piv[1]
      return W(piv[0] + da * Math.cos(ang) + dO * Math.sin(ang), piv[1] - da * Math.sin(ang) + dO * Math.cos(ang))
    })
    bar(p, ink, weight * 0.5, DARK.hull, k * 0.04, rotd)
  }
  // The catch: a ring of ice light off the jaws.
  const since = T - CATCH
  if (since >= 0 && since < 0.5) {
    const b = swingPt(T)
    const u = since / 0.5
    p.noFill()
    p.stroke(alpha(p, DARK.ice, 0.9 * (1 - u)))
    p.strokeWeight(weight * (1.2 - 0.6 * u))
    p.circle(b[0] * k, b[1] * k, k * (2 * R + 0.08 + 0.7 * Math.sqrt(u)))
  }
}

/** TARS: on the Ranger's back, then let go on 185 and in, turning, slower and slower, gone on 186½. */
function tarsAt(T: number): { p: Pt; a: number; s: number; on: number } | null {
  const shipBack = (u: number): Pt => {
    const sp = shipAt(u)
    const dx = sp[0] - C[0]
    const dy = sp[1] - C[1]
    const d = Math.hypot(dx, dy) || 1
    return [sp[0] + (dx / d) * backOff(u), sp[1] + (dy / d) * backOff(u)]
  }
  // Before the pickup TARS is Miller's, on the wave; from it, on the Ranger's back, at the Ranger's size.
  if (T < PICK) return null
  const big = 1 + 2.76 * clamp((shipScale(T) - 0.32) / 0.68)
  if (T < LATCH) return { p: shipBack(T), a: 0.4, s: big, on: 1 }
  if (T > SWALLOW) return null
  const p0 = shipBack(LATCH)
  const v0 = vel(shipBack, LATCH - 0.003)
  const target = onStage([-0.15, -0.42], T)
  const D = SWALLOW - LATCH
  const u = clamp((T - LATCH) / D)
  // It goes in with the Ranger's speed and a push toward the hole, and time stops for it.
  const kick: Pt = [(C[0] - p0[0]) * 0.9, (C[1] - p0[1]) * 0.9]
  const pt = hermite(p0, [v0[0] * 0.35 + kick[0], v0[1] * 0.35 + kick[1]], target, [0, 0], D, easeOutCubic(u) * 0.35 + u * 0.65)
  return { p: pt, a: 0.4 + 5 * (1 - Math.pow(1 - u, 2.2)), s: 1 - 0.55 * u, on: 1 - 0.55 * u }
}

function drawTars(p: p5, c: Ctx, T: number): void {
  const t = tarsAt(T)
  if (!t) return
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const L = 0.17 * t.s
  const Wd = 0.05 * t.s
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.push()
  ctx.globalAlpha = t.on
  for (let q = 0; q < 4; q++) {
    const a = t.a + (q * Math.PI) / 2
    p.push()
    p.translate(X(t.p[0] + Math.cos(a) * L * 0.5), X(t.p[1] + Math.sin(a) * L * 0.5))
    p.rotate(a)
    solid(p, ink, weight * 0.5, mixHex(DARK.slate, DARK.hull, 0.22))
    p.rect(0, 0, X(L), X(Wd), X(0.008))
    if (q === 1) {
      p.noStroke()
      p.fill(DARK.ice)
      p.rect(X(L * 0.15), 0, X(L * 0.25), X(Wd * 0.4))
    }
    p.pop()
  }
  p.pop()
}

/* ------------------------------------------------------------------ the tesseract */

function drawInside(p: p5, s: GargState, c: Ctx, T: number): void {
  const { k } = c
  const X = (v: number) => v * k
  const f = frame(p, k)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // Inside the dark: nothing but what the lattice is made of.
  const dark = smooth(T, HORIZON + 0.35, HORIZON + 0.62)
  if (dark > 0) {
    p.noStroke()
    p.fill(alpha(p, VOID.bg, dark))
    p.rect(X(f.cx), X(f.cy), X(f.x1 - f.x0 + 0.2), X(f.y1 - f.y0 + 0.2))
  }
  const lat = latticeAt(T)
  const bk = backAt(T)
  if (bk > 0.002) {
    ctx.save()
    ctx.globalAlpha = bk
    // The light of the room through the case spills into the dark.
    glow(p, X(back(0.78)), X(BK[1] - 0.65), X(2.6), DUST.light, 0.22)
    ctx.restore()
  }
  if (lat > 0.002) drawLattice(p, c, T, lat, f)
  if (bk > 0.002) {
    ctx.save()
    ctx.globalAlpha = bk
    drawCaseBack(p, c, T)
    drawRail(p, c, T)
    ctx.restore()
  }
  const room = roomAt(T)
  if (room > 0.002) {
    ctx.save()
    ctx.globalAlpha = room
    drawRoom(p, c, T, f)
    ctx.restore()
  }
  void s
}

/**
 * The lattice: the case again, as a frame, every way — beside it, above,
 * below — and the same again deeper in, smaller, toward one point behind
 * the lander. Lines only, gold, faint; the rail the ball comes in on is one
 * of its beams, run on out of the case.
 */
function drawLattice(p: p5, c: Ctx, T: number, on: number, f: ReturnType<typeof frame>): void {
  const { k } = c
  const X = (v: number) => v * k
  const vp: Pt = [P_L[0], SURF - 0.2]
  const x0 = back(2.0)
  const x1 = back(-0.45)
  const y0 = BK[1] + SHELF_TOP - 0.665
  const y1 = BK[1] + FLOOR
  const PX = 3.1
  const PY = 2.25
  // The depths drift in toward the point, slowly, the whole time.
  const drift = ((T - HORIZON) * 0.09) % 1
  const depths = [2.2, 1.2].map((d) => d - drift + 0.5)
  p.noFill()
  for (const d of [...depths, 0]) {
    const sc = 1 / (1 + 0.75 * d)
    const a = on * (d === 0 ? 0.24 : 0.2 * (1 - d / 3.2)) * (d === 0 ? 1 : smooth(T, HORIZON + 0.25 + 0.1 * d, HORIZON + 0.6 + 0.1 * d))
    if (a <= 0.004) continue
    const Q = (x: number, y: number): [number, number] => [X(vp[0] + (x - vp[0]) * sc), X(vp[1] + (y - vp[1]) * sc)]
    p.strokeWeight(Math.max(0.7, k * 0.014 * (0.5 + 0.5 * sc)))
    const reach = d === 0 ? 2 : 1
    for (let i = -reach; i <= reach; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0 && d < 1.2) continue
        const ox = i * PX
        const oy = j * PY
        const [ax, ay] = Q(x0 + ox, y0 + oy)
        const [bx, by] = Q(x1 + ox, y1 + oy)
        p.stroke(alpha(p, DARK.gold, a))
        p.rect((ax + bx) / 2, (ay + by) / 2, bx - ax, by - ay)
        // Its two shelves, and the room's light a thread under each.
        for (const lv of [SHELF_TOP, SHELF_TOP + 0.46]) {
          const [u0, v0] = Q(x0 + ox, BK[1] + lv + oy)
          const [u1] = Q(x1 + ox, BK[1] + lv + oy)
          p.stroke(alpha(p, DARK.gold, a * 0.6))
          p.line(u0, v0, u1, v0)
          const [w0, z0] = Q(x0 + ox + 0.12, BK[1] + lv - 0.28 + oy)
          const [w1] = Q(x1 + ox - 0.12, BK[1] + lv - 0.28 + oy)
          p.stroke(alpha(p, DUST.light, a * 0.5))
          p.line(w0, z0, w1, z0)
        }
      }
    }
  }
  // The beam the ball comes in on, out of the case's end, and the corners of the near frames run in toward the point.
  p.stroke(alpha(p, DARK.gold, on * 0.3))
  p.strokeWeight(Math.max(0.8, k * 0.014))
  p.line(X(f.x0 - 1), X(SURF), X(x0 - 0.1), X(SURF))
  p.line(X(LAND2[0] + 0.55), X(SURF), X(f.x1 + 1), X(SURF))
  p.stroke(alpha(p, DARK.gold, on * 0.14))
  p.strokeWeight(Math.max(0.6, k * 0.009))
  const sc = 1 / (1 + 0.75 * (depths[0] + 0.3))
  for (const i of [-1, 1]) {
    for (const [cx, cy] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]] as Pt[]) {
      const px = cx + i * PX
      p.line(X(px), X(cy), X(vp[0] + (px - vp[0]) * sc), X(vp[1] + (cy - vp[1]) * sc))
    }
  }
}

/** The lander from behind, pushed on the last hit: it tips away from us into the room and is gone over the edge. */
function landerAway(T: number): { tip: number; drop: number; gone: boolean } {
  const s = T - PUSH
  if (s < 0) return { tip: 0, drop: 0, gone: false }
  const tip = (Math.PI / 2) * easeInQuad(clamp(s / 0.42))
  const drop = 0.5 * G_EARTH * Math.max(0, s - 0.26) ** 2
  return { tip, drop, gone: s > 0.46 }
}

/** Murph's bookcase from behind: its frame dark against the room's light, the books' page-edges to us. */
function drawCaseBack(p: p5, c: Ctx, T: number): void {
  const { k } = c
  const X = (v: number) => v * k
  const ink = FARM.ink
  const w = c.weight
  const CAP = SHELF_TOP - 0.6
  const MIDY = SHELF_TOP + 0.46
  const L = -0.45
  const Rr = 2.0
  // Everything here is in the shelf's own frame, mirrored.
  p.push()
  p.translate(X(BK[0]), X(BK[1]))
  p.scale(-1, 1)
  // The room beyond: warm plaster lit by the window, the paper's thin stripes; brighter for a moment as the lander goes.
  const lit = knock(T - PUSH - 0.1, 0.5)
  p.noStroke()
  p.fill(mixHex(DUST.wall, DUST.light, 0.35 + 0.35 * lit))
  p.rect(X((L + Rr) / 2), X((CAP + FLOOR) / 2), X(Rr - L - 0.1), X(FLOOR - CAP))
  p.stroke(alpha(p, DUST.shade, 0.6))
  p.strokeWeight(Math.max(1, k * 0.012))
  for (let x = L + 0.12; x < Rr - 0.05; x += 0.22) p.line(X(x), X(CAP + 0.03), X(x), X(FLOOR - 0.02))

  // The books of the top row: page edges toward us, their covers a line either side. Nothing has touched them yet.
  for (const b of ROW) backOfBook(p, c, b.x, SHELF_TOP, b.w, b.h, b.color, ink)
  // The lander model, a dark shape against the light; pushed, it tips away (shorter as it turns from us) and drops.
  const la = landerAway(T)
  if (!la.gone) {
    const sq = Math.cos(la.tip)
    p.push()
    p.translate(X(LANDER_X), X(SHELF_TOP + la.drop))
    p.scale(1 - 0.15 * Math.sin(la.tip), Math.max(0.02, sq))
    solid(p, ink, w * 0.6, mixHex(DUST.corn, ink, 0.55))
    p.rect(0, X(-0.08), X(0.12), X(0.06))
    p.beginShape()
    for (const [x, y] of [[-0.05, -0.11], [0.05, -0.11], [0.035, -0.17], [-0.035, -0.17]] as Pt[]) p.vertex(X(x), X(y))
    p.endShape(p.CLOSE)
    outline(p, ink, w * 0.6)
    for (const sgn of [-1, 1]) p.line(X(sgn * 0.04), X(-0.07), X(sgn * 0.09), 0)
    p.pop()
  }
  // Where it stood, the room's light comes through.
  if (T >= PUSH) glow(p, X(LANDER_X), X(SHELF_TOP - 0.12), X(0.55), DUST.light, 0.75 * knock(T - PUSH - 0.12, 0.35) * smooth(T, PUSH, PUSH + 0.12))
  // The middle shelf, from behind, and the bottom one's stack and box.
  const mid = [
    [0.1, 0.3, DUST.denim], [0.09, 0.32, DUST.bone], [0.12, 0.28, DUST.rust], [0.08, 0.3, DUST.sage], [0.1, 0.34, DUST.corn],
    [0.11, 0.3, DUST.teal], [0.09, 0.26, DUST.rust], [0.12, 0.33, DUST.bone],
  ] as const
  let x = L + 0.1
  for (const [bw, bh, col] of mid) {
    backOfBook(p, c, x + bw / 2, MIDY, bw, bh, col, ink)
    x += bw + 0.01
  }
  solid(p, ink, w * 0.6, mixHex(DUST.light, ink, 0.4))
  p.rect(X(1.55), X(MIDY - 0.1), X(0.18), X(0.2), X(0.02))
  for (let j = 0; j < 3; j++) {
    solid(p, ink, w * 0.6, mixHex([DUST.teal, DUST.rust, DUST.corn][j], ink, 0.5))
    p.rect(X(-0.1 + j * 0.03), X(FLOOR - 0.08 - 0.045 - j * 0.09), X(0.5 - j * 0.06), X(0.09))
  }
  solid(p, ink, w * 0.6, mixHex(DUST.sage, ink, 0.5))
  p.rect(X(0.85), X(FLOOR - 0.08 - 0.13), X(0.4), X(0.26), X(0.01))
  for (let j = 0; j < 5; j++) backOfBook(p, c, 1.3 + j * 0.1, FLOOR - 0.08, 0.09, 0.28 - (j % 2) * 0.03, [DUST.teal, DUST.rust, DUST.corn, DUST.denim, DUST.sage][j], ink)

  // The frame: sides, cap, boards, in shadow.
  const wood = mixHex(DUST.wood, ink, 0.62)
  solid(p, ink, w * 0.8, wood)
  for (const sx of [L + 0.035, Rr - 0.035]) p.rect(X(sx), X((CAP + FLOOR) / 2), X(0.07), X(FLOOR - CAP))
  p.rect(X((L + Rr) / 2), X(CAP - 0.03), X(Rr - L + 0.1), X(0.07))
  for (const y of [SHELF_TOP, MIDY]) p.rect(X((L + Rr) / 2), X(y + 0.025), X(Rr - L - 0.14), X(0.05))
  p.rect(X((L + Rr) / 2), X(FLOOR - 0.04), X(Rr - L - 0.14), X(0.08))

  // The watch on the cap, seen from behind: the hand goes the other way round.
  drawWatch(p, c, T, 1.45, CAP - 0.11, ink)
  p.pop()
}

/** A book seen from behind: the page block, pale, between two edges of its cover. */
function backOfBook(p: p5, c: Ctx, x: number, foot: number, w: number, h: number, color: string, ink: string): void {
  const { k } = c
  if (h <= 0.004) return
  const X = (v: number) => v * k
  solid(p, ink, c.weight * 0.55, mixHex(color, ink, 0.62))
  p.rect(X(x), X(foot - h / 2), X(w), X(h), X(0.006))
  p.noStroke()
  p.fill(mixHex(DUST.bone, ink, 0.5))
  const ih = Math.max(0, h - 0.035)
  if (ih > 0.01) p.rect(X(x), X(foot - h / 2), X(Math.max(0.01, w - 0.03)), X(ih))
}

/** The watch, lying on the cap: a round face, its strap, the second hand, keeping time in the silence at the end. */
function drawWatch(p: p5, c: Ctx, T: number, wx: number, wy: number, ink: string): void {
  const { k } = c
  const X = (v: number) => v * k
  const w = c.weight
  solid(p, ink, w * 0.7, DUST.wood)
  p.rect(X(wx - 0.13), X(wy + 0.03), X(0.14), X(0.04), X(0.01))
  p.rect(X(wx + 0.13), X(wy + 0.03), X(0.14), X(0.04), X(0.01))
  solid(p, ink, w * 0.7, DUST.bone)
  p.ellipse(X(wx), X(wy), X(0.13), X(0.1))
  let ticks = 0
  for (const t of TICKS) if (T >= t) ticks += 1 - Math.exp(-(T - t) / 0.03)
  const a = -Math.PI / 2 + 0.95 + (ticks * Math.PI) / 30
  outline(p, ink, w * 0.6)
  p.line(X(wx), X(wy), X(wx + Math.cos(a) * 0.05), X(wy + Math.sin(a) * 0.038))
}

/** The rail the ball comes down on: the top board's line run on out past the case's end into the lattice. */
function drawRail(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const r0 = back(-0.45) - 0.02
  const r1 = LAND2[0] + 0.55
  solid(p, ink, weight * 0.6, mixHex(DARK.hull, DARK.slate, 0.35))
  p.rect(X((r0 + r1) / 2), X(SURF + 0.03), X(r1 - r0), X(0.06))
  // Where the ball comes down on it, on 190: a flash along the rail.
  const since = T - LAND
  if (since >= 0 && since < 0.4) glow(p, X(LAND2[0]), X(SURF), X(0.35), DARK.amber, 0.8 * knock(since, 0.1))
}

/* ------------------------------------------------------------------ the room */

function spine(p: p5, c: Ctx, x: number, foot: number, w: number, h: number, color: string, lean: number, ink: string): void {
  const { k } = c
  p.push()
  p.translate(x * k, foot * k)
  p.rotate(lean)
  solid(p, ink, c.weight * 0.9, color)
  p.rect(0, (-h / 2) * k, w * k, h * k, 0.008 * k)
  outline(p, ink, c.weight * 0.55)
  p.line((-w / 2) * k, (-h + 0.035) * k, (w / 2) * k, (-h + 0.035) * k)
  p.line((-w / 2) * k, -0.035 * k, (w / 2) * k, -0.035 * k)
  if (h > 0.26) p.rect(0, -h * 0.55 * k, w * 0.5 * k, 0.05 * k)
  p.pop()
}

/** Murph's room at dusk, seen from the front as the show began: the case and what stays on it, the toy, the watch. The top row, the lander and the dusk itself are drawn over the ghost (`drawOver`). */
function drawRoom(p: p5, c: Ctx, T: number, f: ReturnType<typeof frame>): void {
  const { k } = c
  const X = (v: number) => v * k
  const ink = FARM.ink
  const w = c.weight
  const CAP = SHELF_TOP - 0.6
  const MIDY = SHELF_TOP + 0.46
  const WALL_L = -1.0
  const CEIL = -1.78
  const WIN = { x0: 2.95, x1: 3.8, y0: -1.38, y1: -0.5 }
  p.push()
  p.translate(X(BF[0]), X(BF[1]))
  // Outside, dusk; the room, its plaster and paper; the floor and the ceiling.
  const fx0 = f.x0 - BF[0] - 0.5
  const fx1 = f.x1 - BF[0] + 0.5
  const fy0 = f.y0 - BF[1] - 0.5
  const fy1 = f.y1 - BF[1] + 0.5
  p.noStroke()
  p.fill(mixHex(DARK.deep, DARK.violet, 0.25))
  p.rect(X((fx0 + fx1) / 2), X((fy0 + fy1) / 2), X(fx1 - fx0), X(fy1 - fy0))
  // The house round the room: the attic and its roof over the ceiling, the ground floor under the boards.
  p.fill(DUST.shade)
  p.triangle(X(WALL_L - 0.2), X(CEIL), X(3.65), X(-3.25), X(8.5), X(CEIL))
  p.fill(DUST.wall)
  p.rect(X((WALL_L + fx1) / 2), X((CEIL + fy1) / 2), X(fx1 - WALL_L), X(fy1 - CEIL))
  p.stroke(alpha(p, DUST.shade, 0.55))
  p.strokeWeight(Math.max(1, k * 0.012))
  for (let x = WALL_L + 0.2; x < fx1; x += 0.22) p.line(X(x), X(CEIL + 0.05), X(x), X(FLOOR - 0.02))
  // The window: the last of the day in it.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const sky = ctx.createLinearGradient(0, X(WIN.y0), 0, X(WIN.y1))
  sky.addColorStop(0, DARK.deep)
  sky.addColorStop(0.7, mixHex(DARK.violet, DARK.deep, 0.45))
  sky.addColorStop(1, mixHex(DUST.corn, DARK.violet, 0.45))
  ctx.fillStyle = sky
  ctx.fillRect(X(WIN.x0), X(WIN.y0), X(WIN.x1 - WIN.x0), X(WIN.y1 - WIN.y0))
  outline(p, ink, w)
  p.rect(X((WIN.x0 + WIN.x1) / 2), X((WIN.y0 + WIN.y1) / 2), X(WIN.x1 - WIN.x0), X(WIN.y1 - WIN.y0))
  p.line(X((WIN.x0 + WIN.x1) / 2), X(WIN.y0), X((WIN.x0 + WIN.x1) / 2), X(WIN.y1))
  p.line(X(WIN.x0), X((WIN.y0 + WIN.y1) / 2), X(WIN.x1), X((WIN.y0 + WIN.y1) / 2))
  solid(p, ink, w * 0.8, DUST.teal)
  for (const sd of [-1, 1]) {
    const x = sd < 0 ? WIN.x0 : WIN.x1
    p.beginShape()
    p.vertex(X(x - sd * 0.02), X(WIN.y0 - 0.1))
    p.vertex(X(x + sd * 0.16), X(WIN.y0 - 0.1))
    p.vertex(X(x + sd * 0.04), X(WIN.y1 - 0.25))
    p.vertex(X(x + sd * 0.1), X(WIN.y1 + 0.08))
    p.vertex(X(x - sd * 0.02), X(WIN.y1 + 0.08))
    p.endShape(p.CLOSE)
  }
  solid(p, ink, w, DUST.wood)
  p.rect(X((WIN.x0 + WIN.x1) / 2), X(WIN.y1 + 0.03), X(WIN.x1 - WIN.x0 + 0.16), X(0.06))
  p.rect(X((WALL_L + fx1) / 2), X(FLOOR + 0.08), X(fx1 - WALL_L), X(0.16))
  p.rect(X((WALL_L + fx1) / 2), X(CEIL + 0.06), X(fx1 - WALL_L), X(0.12))
  solid(p, ink, w, DUST.bone)
  p.rect(X(WALL_L), X((CEIL + fy1) / 2), X(0.13), X(fy1 - CEIL))
  // The roof's edge, cut, over the attic.
  solid(p, ink, w, DUST.rust)
  p.beginShape()
  for (const [rx, ry] of [[WALL_L - 0.35, CEIL + 0.05], [3.65, -3.47], [8.65, CEIL + 0.05], [8.65, CEIL - 0.08], [3.65, -3.65], [WALL_L - 0.35, CEIL - 0.08]] as Pt[]) p.vertex(X(rx), X(ry))
  p.endShape(p.CLOSE)

  // The case, from the front.
  const L = -0.45
  const Rr = 2.0
  solid(p, ink, w, DUST.shade)
  p.rect(X((L + Rr) / 2), X((CAP + FLOOR) / 2), X(Rr - L), X(FLOOR - CAP))
  solid(p, ink, w, DUST.wood)
  for (const sx of [L + 0.035, Rr - 0.035]) p.rect(X(sx), X((CAP + FLOOR) / 2), X(0.07), X(FLOOR - CAP))
  p.rect(X((L + Rr) / 2), X(CAP - 0.03), X(Rr - L + 0.1), X(0.07))
  for (const y of [SHELF_TOP, MIDY]) p.rect(X((L + Rr) / 2), X(y + 0.025), X(Rr - L - 0.14), X(0.05))
  p.rect(X((L + Rr) / 2), X(FLOOR - 0.04), X(Rr - L - 0.14), X(0.08))
  const mid = [
    [0.1, 0.3, DUST.denim], [0.09, 0.32, DUST.bone], [0.12, 0.28, DUST.rust], [0.08, 0.3, DUST.sage], [0.1, 0.34, DUST.corn],
    [0.11, 0.3, DUST.teal], [0.09, 0.26, DUST.rust], [0.12, 0.33, DUST.bone],
  ] as const
  let x = L + 0.1
  for (const [bw, bh, col] of mid) {
    spine(p, c, x + bw / 2, MIDY, bw, bh, col, 0, ink)
    x += bw + 0.01
  }
  spine(p, c, x + 0.17, MIDY, 0.1, 0.3, DUST.sage, 0.45, ink)
  solid(p, ink, w, DUST.light)
  p.rect(X(1.55), X(MIDY + 0.05 + 0.13), X(0.18), X(0.22), X(0.02))
  outline(p, ink, w * 0.8)
  for (const dx of [-0.04, 0.0, 0.05]) p.line(X(1.55 + dx), X(MIDY + 0.1), X(1.55 + dx * 1.8), X(MIDY - 0.02))
  for (let j = 0; j < 3; j++) {
    solid(p, ink, w, [DUST.teal, DUST.rust, DUST.corn][j])
    p.rect(X(-0.1 + j * 0.03), X(FLOOR - 0.08 - 0.045 - j * 0.09), X(0.5 - j * 0.06), X(0.09))
  }
  solid(p, ink, w, DUST.sage)
  p.rect(X(0.85), X(FLOOR - 0.08 - 0.13), X(0.4), X(0.26), X(0.01))
  const BOOKS = [DUST.rust, DUST.teal, DUST.corn, DUST.denim, DUST.sage, DUST.bone]
  for (let j = 0; j < 5; j++) spine(p, c, 1.3 + j * 0.1, FLOOR - 0.08, 0.09, 0.28 - (j % 2) * 0.03, BOOKS[(j + 2) % 6], 0, ink)
  // Murph's toy, where it stood in the first frame.
  drawToy(p, { k, ink, weight: w }, TOY_HOME[0], TOY_HOME[1] + 2)
  // The watch on the cap.
  drawWatch(p, c, T, 1.45, CAP - 0.11, ink)
  p.pop()
}

/** The lander model from the front, as the opening draws it: knocked at `since` = 0, over the edge and down on its side (shelf cells). */
function landerFront(p: p5, c: { k: number; ink: string; weight: number }, x0: number, since: number): void {
  const { k, ink, weight } = c
  let x = x0
  let y = SHELF_TOP
  let a = 0
  if (since >= 0) {
    const tip = 0.25
    if (since < tip) a = -0.5 * easeOutCubic(since / tip)
    else {
      const f = since - tip
      const T = dropTime(FLOOR - SHELF_TOP)
      const u = Math.min(1, f / T)
      x = x0 - 0.18 * u
      y = SHELF_TOP + Math.min(FLOOR - SHELF_TOP, 0.5 * G_EARTH * f * f)
      a = -0.5 - (Math.PI / 2 - 0.5 + 0.35) * easeInOutSine(u)
      if (f > T) a += Math.exp(-(f - T) / 0.1) * Math.sin((f - T) * 30) * 0.12
    }
  }
  p.push()
  p.translate(x * k, y * k)
  p.rotate(a)
  outline(p, ink, weight * 0.7)
  for (const s of [-1, 1]) {
    p.line(s * 0.04 * k, -0.07 * k, s * 0.09 * k, 0)
    p.line(s * 0.11 * k, 0, s * 0.07 * k, 0)
  }
  solid(p, ink, weight * 0.8, DUST.corn)
  p.rect(0, -0.08 * k, 0.12 * k, 0.06 * k)
  solid(p, ink, weight * 0.8, DUST.bone)
  p.beginShape()
  p.vertex(-0.05 * k, -0.11 * k)
  p.vertex(0.05 * k, -0.11 * k)
  p.vertex(0.035 * k, -0.17 * k)
  p.vertex(-0.035 * k, -0.17 * k)
  p.endShape(p.CLOSE)
  outline(p, ink, weight * 0.6)
  p.line(0, -0.17 * k, 0, -0.2 * k)
  p.pop()
}

/**
 * The top row from the front, `since` seconds after each book was pushed
 * (negative: still standing), the lander `lander` seconds after it went, and
 * a thud of dust where each lands: in the shelf's cells. With everything long
 * gone it is the room as the opening left it, which is how Act II's replica
 * finds it (`act2/replica.ts`).
 */
export function drawFallen(p: p5, c: { k: number; ink: string; weight: number }, lander: number, since: (i: number) => number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  landerFront(p, c, LANDER_X, lander)
  for (let i = 0; i < RESTS.length; i++) {
    const b = RESTS[i]
    const at = bookAt(b, since(i))
    p.push()
    p.translate(X(at.x), X(at.y))
    p.rotate(at.a)
    frontBook(p, k, ink, weight, 0, b.h / 2, b.w, b.h, b.color)
    p.pop()
  }
  p.noStroke()
  for (let i = 0; i < RESTS.length; i++) {
    const b = RESTS[i]
    const s = since(i) - 0.12 - dropTime(b.land[1] - (SHELF_TOP - b.h / 2))
    if (s < 0 || s > 0.6) continue
    const u = s / 0.6
    p.fill(alpha(p, DUST.shade, 0.7 * (1 - u)))
    for (const side of [-1, 1]) p.circle(X(b.land[0] + side * (b.h / 2 + 0.05 + u * 0.12)), X(b.land[1] + b.w / 2 - 0.02 - u * 0.04), X(0.05 + u * 0.05))
  }
}

/** A book standing with its foot at `(x, foot)`, spine out, as the opening draws it. */
function frontBook(p: p5, k: number, ink: string, weight: number, x: number, foot: number, w: number, h: number, color: string): void {
  p.push()
  p.translate(x * k, foot * k)
  solid(p, ink, weight * 0.9, color)
  p.rect(0, (-h / 2) * k, w * k, h * k, 0.008 * k)
  outline(p, ink, weight * 0.55)
  p.line((-w / 2) * k, (-h + 0.035) * k, (w / 2) * k, (-h + 0.035) * k)
  p.line((-w / 2) * k, -0.035 * k, (w / 2) * k, -0.035 * k)
  if (h > 0.26) p.rect(0, -h * 0.55 * k, w * 0.5 * k, 0.05 * k)
  p.pop()
}

/* ------------------------------------------------------------------ over the ball */

function drawOver(p: p5, s: GargState, c: Ctx): void {
  const T = s.begin + c.t
  const { k } = c
  const X = (v: number) => v * k
  if (T < HORIZON) {
    drawJaws(p, c, T)
    // Behind the hole, the dark and the disk stand in front of the ball and the claw.
    const sw = swingAt(T)
    if (sw.behind && T >= CATCH) {
      const ctx = p.drawingContext as CanvasRenderingContext2D
      const at = laneAt(s.lane, c.t)
      ctx.save()
      ctx.beginPath()
      ctx.arc(X(at.x), X(at.y), X(R + 0.14), 0, TAU)
      for (let i = 1; i <= 4; i++) {
        const b = laneAt(s.lane, c.t - i * 0.022)
        ctx.moveTo(X(b.x) + X(R + 0.02), X(b.y))
        ctx.arc(X(b.x), X(b.y), X(R + 0.02), 0, TAU)
      }
      ctx.clip()
      let bright = 0
      for (const t of [NODE_A, NODE_B]) bright = Math.max(bright, (t === NODE_B ? 1 : 0.7) * knock(T - t, 0.22))
      holeSolid(p, c, holeLook(T), bright)
      einstein(p, c, holeLook(T), sw.p)
      ctx.restore()
    }
    return
  }
  const room = roomAt(T)
  const at = laneAt(s.lane, c.t)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  if (room > 0.002) {
    ctx.save()
    ctx.globalAlpha = room
    // The row in front of the ghost, the lander, the books as it pushes them, and where they come down.
    p.push()
    p.translate(X(BF[0]), X(BF[1]))
    drawFallen(p, { k, ink: FARM.ink, weight: c.weight }, T - PUSH, (i) => T - PUSHES[i])
    p.pop()
    // Dusk: darkest away from the ghost. Its own light keeps the dark off it wherever it is, as at the start.
    const f = frame(p, k)
    const gx = X(at.x)
    const gy = X(at.y)
    const dusk = ctx.createRadialGradient(gx, gy, X(0.12), gx, gy, X(3.2))
    dusk.addColorStop(0, rgba(DARK.deep, 0.1))
    dusk.addColorStop(0.25, rgba(DARK.deep, 0.62))
    dusk.addColorStop(1, rgba(DARK.deep, 0.92))
    ctx.fillStyle = dusk
    ctx.fillRect(X(f.x0 - 0.5), X(f.y0 - 0.5), X(f.x1 - f.x0 + 1), X(f.y1 - f.y0 + 1))
    ctx.restore()
  }
  // The ghost gives off a little light of its own, as it did at the start; a little more on each push.
  if (T >= PUSH) {
    const push = Math.max(0, shoveAt(T)) / 0.07
    const a = smooth(T, PUSH, PUSH + 0.35) * (0.38 + 0.12 * room + 0.2 * push)
    const x = X(at.x)
    const y = X(at.y)
    const g = ctx.createRadialGradient(x, y, 0, x, y, 0.45 * k)
    g.addColorStop(0, `rgba(255, 246, 214, ${a})`)
    g.addColorStop(0.35, `rgba(255, 236, 190, ${a * 0.5})`)
    g.addColorStop(1, 'rgba(255, 236, 190, 0)')
    ctx.fillStyle = g
    ctx.fillRect(x - 0.45 * k, y - 0.45 * k, 0.9 * k, 0.9 * k)
  }
}
