import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { clamp, easeInOutSine, easeInQuad, easeOutCubic } from '../../../../../../../../src/core/ease'
import { FLOOR, R, laneAt, mixHex, puff, type Lane, type Pt } from '../../../../../parts'
import type { ShowBall } from '../../../../../show'
import { alpha, box, carried, frame, hash, knock, part, route, smooth, type Ctx, type PartShot } from '../kit'
import { ACT1_END, ACT2, beat, LAST } from '../music'
import { G_EARTH } from '../physics'
import { drawLander, FALL_NOTES, LANDER_X, SHELF_TOP, stayRow } from '../earth/house'
import { drawWatch, WATCH_ON_SHELF } from '../earth/watch'
import { BALL, DARK, DUST, FARM, VOID } from '../worlds'
import { drawRoom, IN_BED, nightOver, overRoom, ROOM_CELLS, ROOM_HOLD, WAKE } from '../act2/replica'
import { BED_REST } from '../act2/station'
import { MILLER_HANDOFF } from './miller'

/**
 * Gargantua, the tesseract, and home.
 *
 * The black hole is the one that hung small in Miller's sky, and it swells
 * as the ball rises at it. The Ranger that stood on Miller's water lifts off
 * (178), picks TARS up on its back (179½), draws away toward the hole as it
 * climbs, and comes round with a claw on a tether and takes the ball on 181:
 * one ship all the way, so there is never a second Ranger in the frame. TARS
 * lets go of its back on 182 and goes in first (183½). Then the slingshot,
 * two turns round the hole, spiralling in and faster as it goes: down through
 * the disk on 183, behind the dark on 184 (the ball's light wraps the rim),
 * up through the disk on 185 while the camera stands back for the whole of
 * it, the disk and its halo; over the top close in on 186, the lensed halo
 * filling the frame; down through the disk on 186½, behind on 187, up through
 * the disk on the loudest eighth (187½) with the engine lit, and over the
 * top it opens the claw on the downbeat (188) and burns away. The ball falls
 * in, slows, and stops at the centre on 189; the dark opens round it.
 *
 * The dark opens and he is a ghost, in a lattice of frames going on every
 * way, and he goes looking. Out of its depth rooms come at him and go round
 * him, each Murph's bookcase from behind at another time and another way up:
 * on its side in moonlight after the books have gone (190), upside down in
 * the sepia of years before, on the last hit (191). Then Murph's own comes
 * up out of the depth, slowly, upright and lamplit, and he is behind its
 * model lander on 193; it tips away from us into the room, and he goes along
 * behind the row and pushes the ten books off, one after another, in the
 * opening's order and its rhythm run three and a half times as fast: S-T-A-Y,
 * from this side. At the row's end he touches Cooper's watch, and its second
 * hand, still until then, starts to tick its Morse.
 *
 * Then the tesseract lets him go. The back of the case falls away above him
 * and he falls back, slowly, through the lattice, its lines streaming up past
 * him and away into the dark; he drifts on through the black toward a small
 * warm light, and the light opens round him into a room: Murph's room,
 * rebuilt as the museum on Cooper Station, at night, and he settles down into
 * the pillow of the bed under its window. He wakes a ball again, the quilt
 * slides, and the room holds, dim, until the station's lights come up on
 * Act II (`act2/replica.ts` draws the room, both sides of the cut).
 *
 * The part's frame: the ball comes off the wave's lip at (-0.5, 0). Miller's
 * Gargantua stands at C in this frame; ours is drawn on it, concentric.
 */

const TAU = Math.PI * 2

/* ------------------------------------------------------------------ the clock (show seconds) */

const CATCH = beat(181)
/** TARS lets go of the Ranger's back. */
const LATCH = beat(182)
/** Down through the disk on the right. */
const NODE_A = beat(183)
/** TARS is gone. */
const SWALLOW = beat(183.5)
/** Behind the dark: the ball's light wraps the rim. */
const BEHIND = beat(184)
/** Up through the disk on the left. */
const NODE_B = beat(185)
/** Over the top again, close in: the lensed halo fills the frame. */
const CREST = beat(186)
/** The second turn, twice as fast: down through the disk, behind the dark. */
const NODE_A2 = beat(186.5)
const BEHIND2 = beat(187)
/** Up through the disk on the left, close in, the engine lit: the loudest eighth. */
const NODE_B2 = beat(187.5)
const RELEASE = beat(188)
/** Where the ball goes through the disk: when, how hard it rings, and a seed for its spray. */
const NODES: [number, number, number][] = [
  [NODE_A, 0.7, 1],
  [NODE_B, 0.75, 2],
  [NODE_A2, 0.85, 3],
  [NODE_B2, 1, 4],
]
/** At the centre; the dark opens. */
const HORIZON = beat(189)
/**
 * He does not land on Murph's case: he goes looking for it, into the
 * tesseract's depth. Two other rooms come at him out of it and go past round
 * him, the same case at other times and other ways up: the first, on its
 * side in moonlight after the books have gone, on 190; the second, upside
 * down in the sepia of years before, on the last hit (191), its frame
 * ringing. Then Murph's comes up out of the depth, slowing as it comes,
 * upright and lamplit, and he is behind its lander on 193, and it goes.
 * (The lander was on 191 until the dive was given twice the time: the last
 * hit is the room he goes through now, and the lander keeps an eighth of the
 * comb in the decay.)
 */
const PASS_A = beat(190)
const PASS_B = LAST
const LAND = beat(193)
/**
 * Then the ten books, in the opening's order and its Morse run about three
 * and a half times as fast: the first a quarter second after the lander, the
 * last 1.44 s after it. Only the lander is on a strike; the books keep the Morse.
 */
const FIRST_BOOK = LAND + 0.26
const SQUEEZE = (FALL_NOTES.books[FALL_NOTES.books.length - 1] - FALL_NOTES.books[0]) / (LAND + 1.441 - FIRST_BOOK)
const PUSHES = FALL_NOTES.books.map((n) => FIRST_BOOK + (n - FALL_NOTES.books[0]) / SQUEEZE)
/** The last book goes, and he goes back along the row to Cooper's watch at its end. */
const LAST_BOOK = PUSHES[PUSHES.length - 1]
const TO_WATCH = LAST_BOOK + 0.12
const AT_WATCH = LAST_BOOK + 0.5
/** He touches the watch, on an eighth: until then its second hand is still at 45; from then it ticks the message. */
const TOUCH = beat(196.5)
/** The grand pull-back from the watch, once its hand has ticked twice, out to the tesseract's rooms going on every way. */
const PULL0 = TOUCH + 0.6
/** Then it lets him go: the bridge, the fall back through it and the dark into the bed (IN_BED), and the wake (WAKE). */
const CLOSE = PULL0 + 0.85
/** The warm light he drifts toward, and the room opening out of it round him. */
const GLOW_ON = CLOSE + 0.5
const OPEN0 = CLOSE + 0.9

/** The strikes, on the music. */
export const GARGANTUA_HITS = [CATCH, LATCH, NODE_A, SWALLOW, BEHIND, NODE_B, CREST, NODE_A2, BEHIND2, NODE_B2, RELEASE, HORIZON, PASS_A, PASS_B, LAND, TOUCH]

/* ------------------------------------------------------------------ the hole */

/** Gargantua, just up and on from the lip: small, as it hangs in Miller's sky, until the Ranger takes the ball in. */
const C: Pt = [0.95, -0.85]
/** The dark's radius: as Miller draws it far off, and as big as it gets. */
const S0 = 0.3
const S1 = 1.25
/** The disk's tilt, as Miller has it. */
const TILT = -0.07
/** In units of the dark's radius: the lensed far side of the disk over the top and under, and the disk's reach. */
const ARC_TOP = 1.31
const ARC_LOW = 1.25
const DISK = 4.7

/** How big the dark is (cells) at `T`: Miller's size until the catch, then it swells as the ball is carried in. */
const sizeAt = (T: number): number => S0 + (S1 - S0) * easeInOutSine(clamp((T - (CATCH - 0.2)) / (beat(184.5) - CATCH + 0.2)))

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
const TH_REL = -3.5 * Math.PI
/** Spiralling in over the two turns, from well out to just clear of the dark. */
const R_SLOPE = 1.3 / (TH_CATCH - TH_REL)
const rOrbit = (th: number) => 2.6 - R_SLOPE * (TH_CATCH - th)
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

const theta = pchip(
  [CATCH, LATCH, NODE_A, BEHIND, NODE_B, CREST, NODE_A2, BEHIND2, NODE_B2, RELEASE],
  [TH_CATCH, Math.PI / 2, 0, -Math.PI / 2, -Math.PI, -1.5 * Math.PI, -2 * Math.PI, -2.5 * Math.PI, -3 * Math.PI, TH_REL],
)

/** Let go over the top, the ball goes on round and in, slower and slower, and stops: the far end of time. */
const TH_F = TH_REL - 2.0
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
  const a = -R_SLOPE * (TH_REL - TH_F)
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

/** The top board's line, and the ghost on it: straight down from where the ball stopped. */
const Y_BALL = F[1] + 1.55
const SURF = Y_BALL + R
const ROW = stayRow()
/** The ghost behind the lander, a little right of and below where it stopped: he comes down onto the board there on 191. */
const P_L: Pt = [F[0] + 0.35, Y_BALL]
/** The case seen from behind, mirrored (x here = BK.x - x there), with the lander's back at P_L. */
const BK: Pt = [P_L[0] + LANDER_X, SURF - SHELF_TOP]
const back = (x: number): number => BK[0] - x
/** Behind the last book; and beside Cooper's watch at the row's end (its left end from the front; here, mirrored, the right). */
const LAST_AT: Pt = [back(ROW[ROW.length - 1].x), Y_BALL]
/** The one point the tesseract's depths all go toward: just over the top board behind the lander. */
const VP: Pt = [P_L[0], SURF - 0.2]
/** A point of a room at scale `sc` of its depth, seen toward the one point. */
const toward = (q: Pt, sc: number): Pt => [VP[0] + (q[0] - VP[0]) * sc, VP[1] + (q[1] - VP[1]) * sc]
const WATCH_X = back(WATCH_ON_SHELF[0])
/** Against the watch's case: where he touches it, and stays. */
const BY_WATCH: Pt = [back(WATCH_ON_SHELF[0] + 0.21), Y_BALL]
/** Where he stops short of it, a moment, before he reaches out. */
const SHORT_OF_WATCH: Pt = [back(WATCH_ON_SHELF[0] + 0.33), Y_BALL]
/**
 * The bed, in this part's frame: a long way below where the last book went,
 * the fall out of the tesseract. The next part (the replica) is placed so
 * its entry is the ball there, so our exit is half a cell on.
 */
const IN_PILLOW: Pt = [BY_WATCH[0] + 0.25, BY_WATCH[1] + 3.6]
/**
 * The fall, `u` 0..1 of it: gathering from rest behind the row, fastest a
 * third of the way, then a long slow drift that settles into the pillow at
 * no speed at all; a little way sideways, and a slow sway as it floats.
 */
function fallAt(u: number): Pt {
  const v = clamp(u)
  const s = 6 * v * v - 8 * v * v * v + 3 * v ** 4
  const x0 = BY_WATCH[0]
  return [x0 + (IN_PILLOW[0] - x0) * v * v * (3 - 2 * v) + 0.07 * Math.sin(Math.PI * v) * Math.sin(Math.PI * v * 1.5), BY_WATCH[1] + (IN_PILLOW[1] - BY_WATCH[1]) * s]
}
const EXIT: Pt = [IN_PILLOW[0] + 0.5, IN_PILLOW[1]]
/** A point of Act I's house (the replica's) in this frame. */
const roomPt = (h: Pt): Pt => [IN_PILLOW[0] + h[0] - BED_REST[0], IN_PILLOW[1] + h[1] - BED_REST[1]]
/** Where he rests at the end of Act I, and Act II begins: in the bed, in Act I's house cells (`act2/station.ts`). */
export const WAKE_REST: Pt = BED_REST
/** The same, in the bookcase's own cells (the shelf part's frame, the house's plus 2 down): the name the checks know. */
export const GHOST_ON_SHELF = (): Pt => [BED_REST[0], BED_REST[1] + 2]

/**
 * Along the back of the row: one glide, faster and slower, that has him
 * behind each book on its push, so the flurry reads as one sweep.
 */
const sweep = pchip([LAND, ...PUSHES, TO_WATCH], [P_L[0], ...ROW.map((b) => back(b.x)), LAST_AT[0] + 0.015])

/**
 * How many rooms deep Murph's still is, as he goes through the tesseract to
 * it: gathering out of the stop, through the two between, and slowing the
 * whole way as Murph's comes up round him, there on 193. Each room is drawn at its depth past this one (`depthScale`).
 */
const DIVE0 = 3.4
const DIVE = pchip([HORIZON - 0.3, HORIZON, PASS_A, PASS_B, LAND, LAND + 0.4], [DIVE0, DIVE0, 2, 1, 0, 0])
const diveAt = (T: number): number => (T <= HORIZON ? DIVE0 : T >= LAND ? 0 : DIVE.at(T))
const depthScale = (rel: number): number => 1 / (1 + 0.75 * Math.max(-1.2, rel))
/**
 * His way there: out of the stop, down a little and left as the first room
 * goes round him, right as the second does, and down onto the board behind
 * the lander, arriving as it goes.
 */
const approachX = pchip([HORIZON - 0.3, HORIZON, PASS_A, PASS_B, LAND, LAND + 0.3], [F[0], F[0], F[0] - 0.14, F[0] + 0.16, P_L[0], sweep.at(LAND + 0.3)])
const approachY = pchip([HORIZON - 0.3, HORIZON, PASS_A, PASS_B, LAND, LAND + 0.3], [F[1], F[1], F[1] + 0.42, F[1] + 1.0, P_L[1], P_L[1]])

/** The ghost's lean into each push, as a change in its size: smaller as it goes away from us, into the lander and each book. */
function shoveAt(T: number): number {
  let v = 0
  for (const at of [LAND, ...PUSHES]) v -= 0.07 * leanPulse(T - at)
  v -= 0.05 * leanPulse(T - TOUCH)
  return v
}
const leanPulse = (s: number): number => (s < -0.04 || s > 0.2 ? 0 : s < 0 ? smooth(s, -0.04, 0) : Math.exp(-s / 0.06))

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
      ...carried(swing, at(CATCH), at(RELEASE), 280),
      ...carried(swing, at(RELEASE), at(HORIZON), 36),
      // Out of the centre and through the tesseract's rooms to Murph's, onto the top board behind the lander: it goes on 191.
      ...carried((u) => [approachX.at(u + slot.begin), approachY.at(u + slot.begin)], at(HORIZON), at(LAND), 120),
      // Along the back of the row, the books going one after another.
      ...carried((u) => [sweep.at(u + slot.begin), Y_BALL], at(LAND), at(TO_WATCH), 240),
      // Back along the empty row to the watch; a moment short of it; then in against its case on the eighth, and there
      // while its hand ticks and the rooms open out round it.
      ...route([
        { at: at(TO_WATCH), p: [LAST_AT[0] + 0.015, Y_BALL] },
        { at: at(AT_WATCH), p: SHORT_OF_WATCH, ease: 'inout' },
        { at: at(TOUCH - 0.13), p: SHORT_OF_WATCH },
        { at: at(TOUCH), p: BY_WATCH, ease: 'in' },
        { at: at(CLOSE), p: BY_WATCH },
      ]),
      // The tesseract lets him go: back and down through it, through the dark, and into the pillow.
      ...carried((u) => fallAt((u + slot.begin - CLOSE) / (IN_BED - CLOSE)), at(CLOSE), at(IN_BED), 160),
      ...route([
        { at: at(IN_BED), p: IN_PILLOW },
        // He wakes: a stir, this way and that, and still.
        { at: at(WAKE), p: IN_PILLOW },
        { at: at(WAKE) + 0.2, p: [IN_PILLOW[0] - 0.03, IN_PILLOW[1]], ease: 'inout' },
        { at: at(WAKE) + 0.45, p: [IN_PILLOW[0] + 0.012, IN_PILLOW[1]], ease: 'inout' },
        { at: at(WAKE) + 0.65, p: IN_PILLOW, ease: 'inout' },
        { at: slot.end - slot.begin, p: IN_PILLOW },
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
      // Each push is a lean away from us, into the lander and each book.
      const lean = shoveAt(t)
      if (Math.abs(lean) < 0.002) return null
      return [{ ...hero, scale: (hero.scale ?? 1) * (1 + lean) }]
    }
    return {
      cells: box(-9, -5, 9, 4),
      exit: EXIT,
      lane,
      state: { begin: slot.begin, lane },
      // A ghost as the dark opens; a ball again when he wakes in the bed.
      changes: [{ at: at(HORIZON), ghost: true }, { at: at(WAKE), ghost: false }],
      riders,
    }
  },
  (slot) => {
    const shots: PartShot[] = [
      // Miller's last framing, then out to the hole as the Ranger comes round.
      { t: slot.begin, cells: 8, hold: [-1.44, 0.43], w: 0.85 },
      { t: CATCH, cells: 5.4, hold: [C[0] + 0.55, C[1] + 0.1], w: 0.75 },
      { t: NODE_A, cells: 6.8, hold: [C[0] + 0.25, C[1] + 0.1], w: 0.85 },
      // Stand back for the whole of it: the disk end to end, the dark, the halo over it.
      { t: BEHIND + 0.3, cells: 7.6, hold: [C[0], C[1] - 0.1], w: 1 },
      { t: NODE_B, cells: 7.2, hold: [C[0], C[1] - 0.1], w: 1 },
      // The second pass, close in over the top: the lensed halo fills the frame.
      { t: CREST, cells: 4.0, hold: [C[0], C[1] - 0.45], w: 0.92 },
      { t: NODE_B2, cells: 4.3, hold: [C[0], C[1] - 0.05], w: 0.95 },
      { t: RELEASE, cells: 4.6, hold: [C[0], C[1]], w: 0.95 },
      { t: HORIZON, cells: 3.4, hold: F, w: 1 },
      // Into the lattice with him, the rooms coming at us round him; Murph's comes up, the whole row from behind, the lander
      // at its right-hand end, for the sweep.
      { t: PASS_A, cells: 3.0, hold: [(F[0] + P_L[0]) / 2, F[1] + 0.55], w: 1 },
      { t: LAND, cells: 2.35, hold: [back(0.5), Y_BALL - 0.12], w: 1 },
      { t: LAST_BOOK, cells: 2.35, hold: [back(0.5), Y_BALL - 0.12], w: 1 },
      // In on the watch as he comes to it, and closer as he touches it, so its hand is seen to start.
      { t: AT_WATCH + 0.1, cells: 1.35, hold: [(SHORT_OF_WATCH[0] + WATCH_X) / 2, Y_BALL - 0.06], w: 1 },
      { t: TOUCH + 0.25, cells: 0.95, hold: [WATCH_X - 0.08, Y_BALL - 0.04], w: 1 },
      { t: PULL0, cells: 0.9, hold: [WATCH_X - 0.08, Y_BALL - 0.04], w: 1 },
      // The grand pull-back: Murph's bookcase is one of rooms going on every way, into the depth.
      { t: CLOSE, cells: 9.5, hold: [back(0.75), Y_BALL - 0.25], w: 1 },
      // It lets him go: with him as he falls back through it, closer, looking the way he goes; the room opens under him.
      { t: CLOSE + 0.55, cells: 4.6, off: [0.05, 0.45], w: 0 },
      { t: OPEN0, cells: 3.0, off: [0.05, 0.45], w: 0 },
      // Down with him out of the tesseract, to the room at night, a little wide, the bed and the window. While he lies
      // awake the camera comes in on him, slowly, the whole of the decay, and arrives on the framing Act II opens on.
      { t: IN_BED + 0.15, cells: ROOM_CELLS + 0.5, hold: roomPt([ROOM_HOLD[0] - 0.08, ROOM_HOLD[1] + 0.12]), w: 1 },
      { t: WAKE + 0.8, cells: ROOM_CELLS + 0.46, hold: roomPt([ROOM_HOLD[0] - 0.07, ROOM_HOLD[1] + 0.11]), w: 1 },
      { t: ACT1_END, cells: ROOM_CELLS, hold: roomPt(ROOM_HOLD), w: 1 },
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
 * The bridge: the back of the case falls away above him as he goes, and the
 * lattice folds in behind him and fades as he falls through it; then only
 * the dark, and the warm light ahead, and the room opening out of the light.
 */
const closeAt = (T: number): number => smooth(T, CLOSE - 0.05, CLOSE + 1.05)
const backAt = (T: number): number => insideAt(T) * (1 - smooth(T, CLOSE + 0.1, CLOSE + 0.75))
const latticeAt = (T: number): number => insideAt(T) * (1 - smooth(T, CLOSE + 0.35, CLOSE + 1.15))
/** How far the room has opened round the warm light, as a radius (cells): shut, then out past the frame by the time he is down. */
const openAt = (T: number): number => (T <= OPEN0 ? 0 : 0.12 + 7 * easeInQuad(clamp((T - OPEN0) / (IN_BED + 0.1 - OPEN0))))
/** The room is fully there (no window onto it) once it has opened past the frame. */
const roomAt = (T: number): number => (T >= IN_BED + 0.1 ? 1 : T > OPEN0 ? 0.999 : 0)

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
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // Line weights in cells, as Miller's at its size, thinning a little as it grows.
  const m = Math.pow(r / S0, 0.72)
  const W = (w: number) => Math.max(1, k * w * m)
  // Far off it is Miller's flat drawing, lines; near and big it is light. `flat` is how much of the lines is left.
  const big = smooth(r, 0.45, 1.1)
  const flat = 1 - big
  const line = (x0: number, x1: number, w: number, col: string, a: number) => {
    if (a <= 0.004) return
    p.stroke(alpha(p, col, a))
    p.strokeWeight(W(w))
    p.line(X(x0 * r), 0, X(x1 * r), 0)
  }
  const hot = (col: string) => mixHex(col, VOID.ink, 0.6 * bright)
  const A = big * fade
  const WHITE = '#FFF1D2'
  p.push()
  p.translate(X(h.cx), X(h.cy))
  p.rotate(TILT)
  p.noFill()
  // The haze the disk sits in, soft and wide.
  if (big > 0.01) {
    p.strokeCap(p.ROUND)
    for (const [wd, a] of [[0.5, 0.07], [0.26, 0.12]] as Pt[]) {
      p.stroke(alpha(p, DARK.amber, a * A))
      p.strokeWeight(X(wd * r))
      p.line(X(-DISK * 0.8 * r), 0, X(DISK * 0.8 * r), 0)
    }
  }
  line(-DISK, DISK, 0.036, hot(DARK.amber), 0.55 * fade * flat)
  line(-DISK * 0.7, DISK * 0.7, 0.025, hot(DARK.gold), 0.95 * fade * flat)
  // The far side of the disk, bent over the top of the dark and under it by the lensing: near and big, broad bands of
  // light, hottest where they hug the dark and going off into the haze.
  const band = (a0: number, a1: number, rout: number, peak: number, body: number) => {
    if (peak <= 0.004) return
    ctx.save()
    const g = ctx.createRadialGradient(0, 0, X(1.0 * r), 0, 0, X(rout * r))
    g.addColorStop(0, rgba(WHITE, peak))
    g.addColorStop(0.1, rgba(DARK.gold, 0.95 * peak))
    g.addColorStop(body, rgba(DARK.gold, 0.6 * peak))
    g.addColorStop(Math.min(0.95, body + 0.3), rgba(DARK.amber, 0.22 * peak))
    g.addColorStop(1, rgba(DARK.amber, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, X(rout * r), a0, a1)
    ctx.arc(0, 0, X(1.0 * r), a1, a0, true)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
  band(Math.PI + 0.01, TAU - 0.01, 1.7, Math.min(1, 0.95 * A * (1 + 0.4 * bright)), 0.4)
  band(0.01, Math.PI - 0.01, 1.25, Math.min(1, 0.5 * A * (1 + 0.4 * bright)), 0.2)
  // The dark.
  p.noStroke()
  p.fill(VOID.bg)
  p.circle(0, 0, X(2 * r))
  p.noFill()
  // The photon ring: a crisp hair of light right at the edge of the dark.
  if (big > 0.01) {
    p.stroke(alpha(p, WHITE, 0.8 * A))
    p.strokeWeight(Math.max(1, X(0.016 * r)))
    p.circle(0, 0, X(2 * 1.015 * r))
  }
  // Far off: Miller's arcs, over and under.
  p.stroke(alpha(p, DARK.gold, 0.95 * fade * flat))
  p.strokeWeight(W(0.05))
  p.arc(0, 0, X(2 * ARC_TOP * r), X(2 * ARC_TOP * r), Math.PI + 0.2, TAU - 0.2)
  p.strokeWeight(W(0.022))
  p.arc(0, 0, X(2 * ARC_LOW * r), X(2 * ARC_LOW * r), 0.35, Math.PI - 0.35)
  // The near side of the disk, across the front of the dark: near and big, a band of light, thickest and whitest at
  // the middle, tapering to nothing out along it, its left side (coming at us) the brighter.
  if (big > 0.01) {
    const L = DISK * r
    const half = 0.085 * r
    ctx.save()
    const g = ctx.createLinearGradient(X(-L), 0, X(L), 0)
    const a = Math.min(1, A * (1 + 0.5 * bright))
    g.addColorStop(0, rgba(DARK.amber, 0))
    g.addColorStop(0.2, rgba(DARK.amber, 0.6 * a))
    g.addColorStop(0.4, rgba(DARK.gold, a))
    g.addColorStop(0.5, rgba(WHITE, a))
    g.addColorStop(0.6, rgba(DARK.gold, 0.75 * a))
    g.addColorStop(0.8, rgba(DARK.amber, 0.35 * a))
    g.addColorStop(1, rgba(DARK.amber, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(X(-L), 0)
    ctx.quadraticCurveTo(0, X(-2 * half), X(L), 0)
    ctx.quadraticCurveTo(0, X(2 * half), X(-L), 0)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    p.stroke(alpha(p, WHITE, 0.7 * a))
    p.strokeWeight(Math.max(1, X(0.012 * r)))
    p.line(X(-L * 0.55), 0, X(L * 0.55), 0)
  }
  line(-DISK * 0.33, DISK * 0.33, 0.025, hot(DARK.gold), 0.95 * fade * flat)
  line(-DISK * 0.2, DISK * 0.2, 0.011, hot(DARK.hull), 0.9 * fade * flat)
  p.pop()
}

/** In Miller's sky it is a quiet thing until the ball comes off the crest at it: then it is the only thing. */
const presentAt = (T: number): number => 0.42 + 0.58 * smooth(T, beat(179.2), beat(180.2))

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
  for (const [at, power] of NODES) bright = Math.max(bright, power * knock(T - at, 0.22))
  holeSolid(p, c, h, bright, fade)

  // Where the claw went through the disk: a burst of disk-stuff, flung along its way.
  for (const [at, power, seed] of NODES) {
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
  if (sw.behind && T > NODE_A) einstein(p, c, h, sw.p)

  // TARS, gone in: the rim flickers once where it went.
  const sw2 = T - SWALLOW
  if (sw2 >= 0 && sw2 < 0.5) {
    p.noFill()
    p.stroke(alpha(p, VOID.ink, 0.7 * (1 - sw2 / 0.5)))
    p.strokeWeight(Math.max(1, k * 0.02))
    p.circle(X(h.cx), X(h.cy), X(2 * h.r * (1.02 + 0.25 * sw2)))
  }
  // (The dark opens past the frame on its own: `swellAt`; the photon ring goes with the light.)
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
  const burn = Math.max(knock(T - NODE_B2, 0.35) * smooth(T, NODE_B2 - 0.03, NODE_B2), smooth(T, RELEASE, RELEASE + 0.15))
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
  // The latch on its back that holds TARS, and lets go on 182.
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

/** TARS: on the Ranger's back, then let go on 182 and in, turning, slower and slower, gone on 183½. */
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
  const dark = smooth(T, HORIZON + 0.1, HORIZON + 0.36)
  if (dark > 0) {
    p.noStroke()
    p.fill(alpha(p, VOID.bg, dark))
    p.rect(X(f.cx), X(f.cy), X(f.x1 - f.x0 + 0.2), X(f.y1 - f.y0 + 0.2))
  }
  const lat = latticeAt(T)
  const bk = backAt(T)
  // Murph's case, as deep in as it still is (all of it, the lattice round it included, scaled toward the one point).
  const dv = diveAt(T)
  const deep = depthScale(dv)
  if (bk > 0.002) {
    ctx.save()
    ctx.globalAlpha = bk
    // The light of the room through the case spills into the dark: warmer as he nears it.
    const [gx, gy] = toward([back(0.78), BK[1] - 0.65], deep)
    glow(p, X(gx), X(gy), X(2.6 * deep), DUST.light, 0.22 + 0.12 * (1 - smooth(dv, 0, 1.5)) * (1 - smooth(T, LAND, LAND + 0.8)))
    ctx.restore()
  }
  if (lat > 0.002) drawRooms(p, c, T, lat)
  if (lat > 0.002) drawLattice(p, c, T, lat, f)
  if (bk > 0.002) {
    // The back of the case, falling away above him as he goes: smaller, and gone.
    const away = 1 - 0.5 * smooth(T, CLOSE, CLOSE + 0.75)
    const cx = back(0.78)
    const cy = BK[1] - 0.65
    ctx.save()
    ctx.globalAlpha = bk
    p.push()
    p.translate(X(VP[0]), X(VP[1]))
    p.scale(deep)
    p.translate(-X(VP[0]), -X(VP[1]))
    p.translate(X(cx), X(cy))
    p.scale(away)
    p.translate(-X(cx), -X(cy))
    drawCaseBack(p, c, T)
    p.pop()
    ctx.restore()
  }
  if (dv > 0 && lat > 0.002) drawPassing(p, c, T, lat)
  drawStreaks(p, c, T, f)
  drawWarmth(p, c, T)
  if (roomAt(T) > 0) {
    ctx.save()
    if (T < IN_BED + 0.1) {
      ctx.beginPath()
      ctx.arc(X(OPENING[0]), X(OPENING[1]), X(openAt(T)), 0, TAU)
      ctx.clip()
    }
    p.push()
    p.translate(X(EXIT[0]), X(EXIT[1]))
    drawRoom(p, farm(c), T - ACT2)
    p.pop()
    ctx.restore()
  }
  void s
}

/**
 * The tesseract's rooms: Murph's bookcase, from behind, again and again every
 * way, beside it, above and below, and deeper in, smaller and dimmer toward
 * the one point; each its own lit room behind, its row of ten books, its
 * watch. The near ones are there from the first; the pull-back after the
 * watch shows how far they go.
 */
function drawRooms(p: p5, c: Ctx, T: number, on: number): void {
  const { k } = c
  const X = (v: number) => v * k
  const ink = FARM.ink
  const vp = VP
  const dv = diveAt(T)
  const PX = 3.1
  const PY = 2.25
  const far = smooth(T, AT_WATCH, CLOSE)
  const fold = 1 - 0.8 * closeAt(T)
  const drift = ((T - HORIZON) * 0.09) % 1
  p.push()
  p.translate(X(BY_WATCH[0]), X(BY_WATCH[1]))
  p.scale(fold)
  p.translate(-X(BY_WATCH[0]), -X(BY_WATCH[1]))
  for (const d of [2.2 - drift + 0.5, 1.2 - drift + 0.5, 0]) {
    const sc = depthScale(d + dv)
    const reach = d === 0 ? 1 + Math.round(4 * far) : 2 + Math.round(3 * far)
    for (let i = -reach; i <= reach; i++) {
      for (let j = -1 - Math.round(2 * far); j <= 1 + Math.round(3 * far); j++) {
        if (i === 0 && j === 0 && d === 0) continue
        const dist = Math.hypot(i, j * 1.3)
        const a = on * (d === 0 ? 0.5 : 0.22 * (1 - d / 3.4)) * (1 / (1 + 0.45 * dist)) * (dist <= 1.5 ? 1 : far)
        if (a <= 0.01) continue
        const ox = BK[0] + i * PX
        const oy = BK[1] + j * PY
        p.push()
        p.translate(X(vp[0] + (ox - vp[0]) * sc), X(vp[1] + (oy - vp[1]) * sc))
        p.scale(-sc, sc)
        miniCase(p, k, ink, c.weight, a)
        p.pop()
      }
    }
  }
  p.pop()
}

/** One of the tesseract's rooms, Murph's bookcase from behind, in its own (shelf) cells, `a` of it. */
function miniCase(p: p5, k: number, ink: string, weight: number, a: number): void {
  const X = (v: number) => v * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const was = ctx.globalAlpha
  ctx.globalAlpha = was * a
  const CAP = SHELF_TOP - 0.6
  const MIDY = SHELF_TOP + 0.46
  // Its room's light behind it, lamplight, and a bloom of it spilling round the case into the dark (warm, so that
  // seen dim over the dark it goes amber, not grey).
  glow(p, X(0.775), X((CAP + FLOOR) / 2), X(1.9), DARK.amber, 0.3)
  p.noStroke()
  p.fill(mixHex(DUST.light, DARK.amber, 0.4))
  p.rect(X(0.775), X((CAP + FLOOR) / 2), X(2.35), X(FLOOR - CAP))
  for (const b of ROW) {
    p.fill(mixHex(b.color, ink, 0.62))
    p.rect(X(b.x), X(SHELF_TOP - b.h / 2), X(b.w), X(b.h))
  }
  p.fill(mixHex(DUST.wood, ink, 0.5))
  for (let x = -0.3; x < 1.9; x += 0.105) p.rect(X(x), X(MIDY - 0.15), X(0.08), X(0.3))
  // Its watch, a spark at the row's end.
  p.fill(DUST.light)
  p.circle(X(WATCH_ON_SHELF[0]), X(WATCH_ON_SHELF[1] - 0.15), X(0.1))
  solid(p, ink, weight * 0.7, mixHex(DUST.wood, ink, 0.62))
  for (const sx of [-0.415, 1.965]) p.rect(X(sx), X((CAP + FLOOR) / 2), X(0.07), X(FLOOR - CAP))
  p.rect(X(0.775), X(CAP - 0.03), X(2.55), X(0.07))
  for (const y of [SHELF_TOP, MIDY]) p.rect(X(0.775), X(y + 0.025), X(2.31), X(0.05))
  p.rect(X(0.775), X(FLOOR - 0.04), X(2.31), X(0.08))
  ctx.globalAlpha = was
}

/** Where the warm light is, that the room opens out of: just over the pillow, where the window's light lies. */
const OPENING: Pt = [IN_PILLOW[0] + 0.05, IN_PILLOW[1] - 0.15]

/** How fast he is falling, 0..1 of the fastest: what the lines streaming past him go by. */
const fallPace = (T: number): number => {
  const u = (T - CLOSE) / (IN_BED - CLOSE)
  return u <= 0 || u >= 1 ? 0 : (12 * u * (1 - u) * (1 - u)) / (16 / 9)
}

/** The lattice's lines going past him as he falls: a few thin gold threads, streaming up the frame, longer the faster he goes. */
function drawStreaks(p: p5, c: Ctx, T: number, f: ReturnType<typeof frame>): void {
  const pace = fallPace(T) * (1 - smooth(T, CLOSE + 0.9, CLOSE + 1.3))
  if (pace <= 0.02) return
  const { k } = c
  const X = (v: number) => v * k
  const H = f.y1 - f.y0
  const W = f.x1 - f.x0
  const run = (T - CLOSE) * 5.5
  p.strokeCap(p.ROUND)
  for (let i = 0; i < 9; i++) {
    const x = f.x0 + W * (0.1 + 0.8 * hash(i, 61))
    if (Math.abs(x - f.cx) < 0.22) continue
    const y = f.y1 + 0.5 - ((run * (0.7 + 0.6 * hash(i, 62)) + hash(i, 63) * (H + 1)) % (H + 1))
    const len = 0.25 + 1.1 * pace * (0.6 + 0.4 * hash(i, 64))
    p.stroke(alpha(p, DARK.gold, 0.32 * pace * (0.5 + 0.5 * hash(i, 65))))
    p.strokeWeight(Math.max(0.7, k * 0.012))
    p.line(X(x), X(y), X(x), X(y + len))
  }
}

/** The warm light he drifts toward through the dark: small and far, then near; the room opens out of it. */
function drawWarmth(p: p5, c: Ctx, T: number): void {
  const on = smooth(T, GLOW_ON, GLOW_ON + 0.6) * (1 - smooth(T, IN_BED - 0.1, IN_BED + 0.4))
  if (on <= 0.005) return
  const { k } = c
  const X = (v: number) => v * k
  const grow = smooth(T, GLOW_ON, IN_BED)
  glow(p, X(OPENING[0]), X(OPENING[1]), X(0.25 + 1.6 * grow), DUST.light, 0.55 * on)
  glow(p, X(OPENING[0]), X(OPENING[1]), X(0.08 + 0.3 * grow), '#FFF6DE', 0.8 * on)
  // The rim of the opening, soft and warm, going out past the frame.
  const r = openAt(T)
  if (r > 0.05 && T < IN_BED + 0.1) {
    p.noFill()
    p.stroke(alpha(p, DUST.light, 0.5 * on * (1 - smooth(r, 2, 6))))
    p.strokeWeight(Math.max(1, X(0.03)))
    p.circle(X(OPENING[0]), X(OPENING[1]), X(2 * r))
  }
}

/** The room is the farm's, drawn in the farm's ink: the replica's own drawing, in the replica's frame (its origin is our exit). */
const farm = (c: Ctx): Ctx => ({ ...c, ink: FARM.ink, bg: FARM.bg, theme: FARM, weight: (c.weight * (FARM.weight ?? 1)) / (VOID.weight ?? 1) })

/**
 * The lattice: the case again, as a frame, every way — beside it, above,
 * below — and the same again deeper in, smaller, toward one point behind
 * the lander. Lines only, gold, faint; the rail the ball comes in on is one
 * of its beams, run on out of the case.
 */
function drawLattice(p: p5, c: Ctx, T: number, on: number, f: ReturnType<typeof frame>): void {
  const { k } = c
  const X = (v: number) => v * k
  const vp = VP
  const dv = diveAt(T)
  const sc0 = depthScale(dv)
  // As it lets him go it folds in behind him, toward where the last book went, and away.
  const fold = 1 - 0.8 * closeAt(T)
  p.push()
  p.translate(X(BY_WATCH[0]), X(BY_WATCH[1]))
  p.scale(fold)
  p.translate(-X(BY_WATCH[0]), -X(BY_WATCH[1]))
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
    const sc = depthScale(d + dv)
    const a = on * (d === 0 ? 0.24 : 0.2 * (1 - d / 3.2)) * (d === 0 ? 1 : smooth(T, HORIZON + 0.25 + 0.1 * d, HORIZON + 0.6 + 0.1 * d))
    if (a <= 0.004) continue
    const Q = (x: number, y: number): [number, number] => [X(vp[0] + (x - vp[0]) * sc), X(vp[1] + (y - vp[1]) * sc)]
    p.strokeWeight(Math.max(0.7, k * 0.014 * (0.5 + 0.5 * sc)))
    const reach = d === 0 ? 2 : 1
    // Rows below, too, for him to fall through as it lets him go.
    const below = d === 0 ? 3 : 1
    for (let i = -reach; i <= reach; i++) {
      for (let j = -1; j <= below; j++) {
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
  // The top board's line run on out of the case both ways, and the corners of the near frames run in toward the point.
  p.stroke(alpha(p, DARK.gold, on * 0.3))
  p.strokeWeight(Math.max(0.8, k * 0.014))
  const Q0 = (x: number, y: number): Pt => toward([x, y], sc0)
  const run = (a: Pt, b: Pt) => p.line(X(a[0]), X(a[1]), X(b[0]), X(b[1]))
  run(Q0(vp[0] - (vp[0] - f.x0 + 1) / sc0, SURF), Q0(x0 - 0.1, SURF))
  run(Q0(x1 + 0.1, SURF), Q0(vp[0] + (f.x1 + 1 - vp[0]) / sc0, SURF))
  p.stroke(alpha(p, DARK.gold, on * 0.14))
  p.strokeWeight(Math.max(0.6, k * 0.009))
  const sc = depthScale(depths[0] + 0.3 + dv)
  for (const i of [-1, 1]) {
    for (const [cx, cy] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]] as Pt[]) {
      const px = cx + i * PX
      run(Q0(px, cy), toward([px, cy], sc))
    }
  }
  p.pop()
}

/** A thing on the top shelf seen from behind, pushed at `at`: it tips away from us into the room (over `dur`) and is gone over the edge. */
function away(at: number, T: number, dur: number): { tip: number; drop: number; gone: boolean } {
  const s = T - at
  if (s < 0) return { tip: 0, drop: 0, gone: false }
  const tip = (Math.PI / 2) * easeInQuad(clamp(s / dur))
  const drop = 0.5 * G_EARTH * Math.max(0, s - dur * 0.6) ** 2
  return { tip, drop, gone: s > dur * 1.1 }
}

/** How one of the tesseract's rooms is: the light of its hour over it all (none for Murph's, now), and what is on its top shelf. */
interface Look {
  wash?: [string, number]
  row: boolean
  lander: boolean
  watch: boolean
}
const MURPHS: Look = { row: true, lander: true, watch: true }

/** Murph's bookcase from behind: its frame dark against the room's light, the books' page-edges to us. */
function drawCaseBack(p: p5, c: Ctx, T: number, look: Look = MURPHS): void {
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
  // The room beyond: warm plaster lit by the window, the paper's thin stripes; a little brighter as each thing goes.
  const lit = Math.min(1, [LAND, ...PUSHES].reduce((m, at) => Math.max(m, 0.6 * knock(T - at - 0.08, 0.3)), 0) + 0.4 * smooth(T, LAND, CLOSE))
  p.noStroke()
  p.fill(mixHex(DUST.wall, DUST.light, 0.35 + 0.35 * lit))
  p.rect(X((L + Rr) / 2), X((CAP + FLOOR) / 2), X(Rr - L - 0.1), X(FLOOR - CAP))
  p.stroke(alpha(p, DUST.shade, 0.6))
  p.strokeWeight(Math.max(1, k * 0.012))
  for (let x = L + 0.12; x < Rr - 0.05; x += 0.22) p.line(X(x), X(CAP + 0.03), X(x), X(FLOOR - 0.02))

  // The books of the top row: page edges toward us, their covers a line either side; pushed, each tips away (shorter
  // as it turns from us) and drops out of sight behind the board, and the room's light comes through the gap.
  ROW.forEach((b, i) => {
    const a = away(PUSHES[i], T, 0.26)
    if (a.gone || !look.row) return
    const h = b.h * Math.max(0.03, Math.cos(a.tip))
    backOfBook(p, c, b.x, SHELF_TOP + a.drop, b.w * (1 - 0.12 * Math.sin(a.tip)), h, b.color, ink)
  })
  ROW.forEach((b, i) => {
    if (T >= PUSHES[i]) glow(p, X(b.x), X(SHELF_TOP - b.h / 2), X(0.4), DUST.light, 0.6 * knock(T - PUSHES[i] - 0.1, 0.25) * smooth(T, PUSHES[i], PUSHES[i] + 0.1))
  })
  // The lander model, the opening's own; pushed, it tips away the same way (shorter as it turns from us) and drops.
  const la = away(LAND, T, 0.36)
  if (!la.gone && look.lander) {
    p.push()
    p.translate(X(LANDER_X), X(SHELF_TOP + la.drop))
    p.scale(1 - 0.15 * Math.sin(la.tip), Math.max(0.02, Math.cos(la.tip)))
    drawLander(p, { k, ink, weight: w }, 0, 0, 0)
    p.pop()
  }
  // Where it stood, the room's light comes through.
  if (T >= LAND) glow(p, X(LANDER_X), X(SHELF_TOP - 0.12), X(0.55), DUST.light, 0.75 * knock(T - LAND - 0.12, 0.35) * smooth(T, LAND, LAND + 0.12))
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

  // Cooper's watch, standing at the end of the top shelf beyond the lander: its second hand still at 45 until he touches
  // it, and from then ticking its Morse.
  if (!look.watch) {
    washOver(p, k, look, L, Rr, CAP)
    p.pop()
    return
  }
  // The case is drawn mirrored (we are behind it), but the watch faces us through the gap in the row: turn it back so its
  // dial reads true.
  p.push()
  p.translate(X(WATCH_ON_SHELF[0]), 0)
  p.scale(-1, 1)
  p.translate(-X(WATCH_ON_SHELF[0]), 0)
  drawWatch(p, k, ink, w, WATCH_ON_SHELF[0], WATCH_ON_SHELF[1], T, look === MURPHS ? { from: TOUCH } : {})
  p.pop()
  washOver(p, k, look, L, Rr, CAP)
  p.pop()
}

/** The light of another hour over a whole room of the tesseract, case and all. */
function washOver(p: p5, k: number, look: Look, L: number, Rr: number, CAP: number): void {
  if (!look.wash) return
  p.noStroke()
  p.fill(alpha(p, look.wash[0], look.wash[1]))
  p.rect(k * ((L + Rr) / 2), k * ((CAP + FLOOR) / 2), k * (Rr - L + 0.12), k * (FLOOR - CAP + 0.12))
}

/**
 * The two rooms he goes through on the way to Murph's: the same case at
 * other times and other ways up, each in its own lattice turned with it.
 * The first is on its side, in moonlight, after the books have gone (the
 * lander too; the watch is there). The second is upside down in the sepia
 * of years before: the books, the lander, no watch yet. Each comes
 * at him out of the depth, goes round him, and is gone past the frame.
 */
const PASSING: { at: number; turn: number; look: Look; hit: number; ring: number }[] = [
  { at: -2, turn: Math.PI / 2, look: { wash: ['#3E5A86', 0.42], row: false, lander: false, watch: true }, hit: PASS_A, ring: 1 },
  { at: -1, turn: Math.PI, look: { wash: ['#7A5C3E', 0.46], row: true, lander: true, watch: false }, hit: PASS_B, ring: 0.6 },
]

function drawPassing(p: p5, c: Ctx, T: number, on: number): void {
  const { k } = c
  const X = (v: number) => v * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const dv = diveAt(T)
  const CAP = SHELF_TOP - 0.6
  // The case's middle, and its outline, in this frame.
  const mid: Pt = [back(0.775), BK[1] + (CAP + FLOOR) / 2]
  const x0 = back(2.0)
  const x1 = back(-0.45)
  const y0 = BK[1] + CAP - 0.065
  const y1 = BK[1] + FLOOR
  // Deepest first.
  for (const room of [...PASSING].sort((a, b) => b.at - a.at)) {
    // Once he is through it, it goes on past him at its own pace, out of the frame, whatever the dive is doing.
    const through = room.at + dv
    const rel = through >= 0 ? through : Math.min(through, -(T - room.hit) * 2.2)
    if (rel < -0.75 || rel > 3.2) continue
    const a = on * (1 - smooth(-rel, 0, 0.45)) * (1 - smooth(rel, 1.7, 2.8))
    if (a <= 0.004) continue
    const sc = depthScale(rel)
    // Going through it: its frame rings.
    const ring = room.ring * knock(T - room.hit, 0.35)
    // Centred on him as it goes round him, at its own depth toward the one point.
    const g: Pt = [approachX.at(room.hit), approachY.at(room.hit)]
    p.push()
    p.translate(X(VP[0]), X(VP[1]))
    p.scale(sc)
    p.translate(-X(VP[0]), -X(VP[1]))
    p.translate(X(g[0]), X(g[1]))
    p.rotate(room.turn)
    p.translate(-X(mid[0]), -X(mid[1]))
    // Its lattice: the case again every way round it, lines only.
    p.noFill()
    p.strokeWeight(Math.max(0.7, (k * 0.014) / Math.max(0.6, sc)))
    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        if (i === 0 && j === 0) continue
        const ox = i * 3.1
        const oy = j * 2.25
        const fall = 1 / (1 + 0.5 * Math.hypot(i, j * 1.3))
        p.stroke(alpha(p, DARK.gold, a * (0.26 + 0.5 * ring) * fall))
        p.rect(X((x0 + x1) / 2 + ox), X((y0 + y1) / 2 + oy), X(x1 - x0), X(y1 - y0))
        p.stroke(alpha(p, DARK.gold, a * 0.16 * fall))
        for (const lv of [SHELF_TOP, SHELF_TOP + 0.46]) p.line(X(x0 + ox), X(BK[1] + lv + oy), X(x1 + ox), X(BK[1] + lv + oy))
      }
    }
    // The room itself.
    ctx.save()
    ctx.globalAlpha = a
    drawCaseBack(p, c, T, room.look)
    ctx.restore()
    if (ring > 0.01) {
      p.noFill()
      p.stroke(alpha(p, DARK.gold, 0.8 * ring * a))
      p.strokeWeight(Math.max(1, (k * 0.03) / Math.max(0.6, sc)))
      p.rect(X((x0 + x1) / 2), X((y0 + y1) / 2), X(x1 - x0 + 0.1), X(y1 - y0 + 0.1))
    }
    p.pop()
  }
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
      for (const [t, power] of NODES) bright = Math.max(bright, power * knock(T - t, 0.22))
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
    // The room's front (the dumbwaiter's wall, the toy), and its night: inside the opening while it opens.
    ctx.save()
    if (T < IN_BED + 0.1) {
      ctx.beginPath()
      ctx.arc(X(OPENING[0]), X(OPENING[1]), X(openAt(T)), 0, TAU)
      ctx.clip()
    }
    p.push()
    p.translate(X(EXIT[0]), X(EXIT[1]))
    overRoom(p, farm(c), T - ACT2)
    nightOver(p, farm(c), 1)
    p.pop()
    ctx.restore()
  }
  // While he is a ghost he gives off a little light of its own, a little more on each book he pushes (not on the watch).
  const ghost = smooth(T, HORIZON, HORIZON + 0.35) * (1 - smooth(T, WAKE - 0.05, WAKE + 0.25))
  if (ghost > 0.005) {
    const push = Math.max(0, -shoveAt(T) - 0.05 * leanPulse(T - TOUCH)) / 0.07
    const a = ghost * (0.4 + 0.25 * push)
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
