import type p5 from 'p5'
import type { Pt, Seg } from '../../../../../parts'
import { box, carried, part, smooth, type Companion, type Ctx, type PartShot, type Pose, type Slot } from '../kit'
import { AGE, AT, bar, beat, SEAM } from '../music'
import { G_EARTH } from '../physics'
import { BOW_FROM, HALF } from '../cast'
import { BASKET, drawBasket } from '../props/basket'
import { DESK, drawDesk, drawDoor, drawDusk, drawSunWedge, drawGramophone, drawHanger, drawLampLight, drawPainting, drawTicket, drawWheelFrame, MACHINE, PEDAL, WHEEL } from './ties-set'
import { BOW, drawTie, TIES } from './ties-tie'

/**
 * TIES: the hall, through the years (jar bars 37 to 61, 140.655 to 167.706).
 *
 * The tie wheel. By the doorway from the living room stands a wheel on an easel of a stand, like a small Ferris wheel,
 * and from its six hangers hang a shirt collar and a tie each: the ties of all their years, there to be seen from the
 * start, the bow tie waiting at the lower left. Carl hops onto the brass plate under it (bar 38) and it wakes: on
 * every odd downbeat it turns a sixth, the pawl clicking home, and the next collar comes down onto him (the tie he
 * wore swinging away on its hanger); on every even downbeat Ellie rolls in and straightens it, the knot snugging up
 * under the collar, as she did every morning. Five mornings, five decades: the skinny tie, the striped, the knit, the
 * loud one on the waltz's big accent (bar 45), and last the bow tie. The years go by in their colours and in her pace:
 * her taps gentler, his nods slower, the wheel's turns softer.
 *
 * The dance. She bumps the gramophone's lever (bar 49); the needle drops (bar 50); they meet (bar 51) at the loudest
 * of the waltz and dance the length of the hall, old and slow, she passing round behind him and back on every bar, and
 * come to rest in each other's arms on the accent of bar 55.
 *
 * The tickets. The evening comes in, and the lamp over her painting of Paradise Falls lights (bar 56): he sees it, a
 * long look. He steps onto the pedal in the floor by the desk (bar 57); the desk's leaf lets go and the picnic basket
 * drops onto his top (57's second beat). She is at the front door, looking out, and opens it (bar 58). He pumps the
 * pedal (bars 58, 59, 60) and the ticket machine's reel rolls through the places, the city, the sea, the mountains, to
 * the falls; on the cadence it stamps two tickets (166.934, 167.277) that jump from its slot into the basket; the
 * second lands and the lid shuts on 167.706 as he walks out after her: the cut to the hill.
 *
 * The part's frame: Carl enters at (-0.5, 0), the doorway from the living room (INSIDE 13.05); the hall and its
 * props are in `ties-set.ts`, the ties in `ties-tie.ts`.
 */

/** Unused: this part carries on from the one before it in the house's one long take (the score chains it). */
export const TIES_AT: Pt = [0, 0]

/**
 * Whether the last tie, the bow tie, stays on Carl once the wheel lets him go (the film's old Carl wears one from then
 * on). If the cast does not carry it across the cut to the hill it vanishes there: then either set this false (it
 * stays on its hanger and he walks away without it) or draw `drawBowTie` (ties-tie.ts) in `cast.ts` from `BOW_ON` on
 * and set `BOW_IN_CAST` true, so it is drawn once.
 */
export const BOW_STAYS = true
export const BOW_IN_CAST = true

/* ------------------------------------------------------------------ the clock (show seconds) */

const J = (n: number) => bar('jar', n)
const ENTER = SEAM.ties
/** He hops onto the wheel's plate. */
const PLATE = J(38)
/** Each a collar and tie coming down onto him; each her straightening it. */
const TURNS = [39, 41, 43, 45, 47].map(J)
const CINCH = [40, 42, 44, 46, 48].map(J)
/** The bow tie is his from here (she has tied it). */
export const BOW_ON = CINCH[4]
/** She bumps the gramophone's lever; the needle drops. */
const LEVER = J(49)
const NEEDLE = J(50)
/** They meet; the dance's steps; the embrace on the accent. */
const DANCE = [51, 52, 53, 54, 55].map(J)
const EMBRACE = DANCE[4]
/** The picture lamp lights; he steps onto the pedal; the basket lands on him; she opens the door; he pumps. */
const LAMP = J(56)
const PEDAL_ON = J(57)
const BASKET_IN = beat('jar', 57, 2)
const PUMPS = [58, 59, 60].map(J)
const DOOR_OPEN = PUMPS[0]
const [STAMP1, STAMP2, SHUT] = AT.cadence
const HOPS = [...PUMPS, STAMP1, STAMP2]

/** Every strike of this part, in show seconds (check:shows holds each to the music). */
export const TIES_HITS: number[] = [PLATE, ...TURNS, ...CINCH, LEVER, NEEDLE, ...DANCE, LAMP, PEDAL_ON, BASKET_IN, ...PUMPS, STAMP1, STAMP2, SHUT].sort((a, b) => a - b)

/* ------------------------------------------------------------------ motion helpers */

interface Knot {
  t: number
  x: number
  v: number
}

/** A cubic between two knots that leaves the first at its speed and arrives at the second at its. */
function hermite(a: Knot, b: Knot, t: number): number {
  const H = b.t - a.t
  const u = Math.max(0, Math.min(1, (t - a.t) / H))
  const u2 = u * u
  const u3 = u2 * u
  return (2 * u3 - 3 * u2 + 1) * a.x + (u3 - 2 * u2 + u) * H * a.v + (-2 * u3 + 3 * u2) * b.x + (u3 - u2) * H * b.v
}

/** Through knots, C1: speed continuous at every knot. Held at the ends. */
function spline(knots: Knot[]): (t: number) => number {
  return (t) => {
    if (t <= knots[0].t) return knots[0].x
    for (let i = 1; i < knots.length; i++) if (t <= knots[i].t) return hermite(knots[i - 1], knots[i], t)
    return knots[knots.length - 1].x
  }
}

/** A push of `a` that comes in quickly and goes out slowly: the squash of a landing (0 before `at`). */
const impulse = (T: number, at: number, a: number, decay = 0.14): number => {
  const dt = T - at
  return dt < 0 ? 0 : a * (1 - Math.exp(-dt / 0.018)) * Math.exp(-dt / decay)
}

/** Out over `out` from `at`, held, back over `back`: 0..1. */
const gesture = (T: number, at: number, out: number, hold: number, back: number): number => smooth(T, at, at + out) * (1 - smooth(T, at + out + hold, at + out + hold + back))

const sineEase = (u: number): number => (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, u)))) / 2
const wrap = (a: number): number => a - 2 * Math.PI * Math.round(a / (2 * Math.PI))

/* ------------------------------------------------------------------ the tie wheel */

const STEP = Math.PI / 3
/** How long each turn takes: brisk when they are young, slower as they age. */
const turnDur = (j: number): number => 0.52 + 0.22 * AGE(TURNS[j])

/** The wheel's angle: a sixth a morning, landing on the downbeat with the pawl's click and a small rebound. */
function wheelTurn(T: number): number {
  let n = 0
  while (n < TURNS.length && T >= TURNS[n]) n++
  // n turns have landed; the next (if any) may be under way.
  let th = n * STEP
  if (n > 0) {
    const dt = T - TURNS[n - 1]
    th -= 0.04 * (1 - 0.5 * AGE(TURNS[n - 1])) * Math.sin(dt * 15) * Math.exp(-dt / 0.13)
  }
  if (n < TURNS.length) {
    const D = turnDur(n)
    const t0 = TURNS[n] - D
    // The pawl lifts: a small back-rock; then it goes, gathering, and lands with some speed left (less when old).
    if (T > t0 - 0.2 && T < t0) th -= 0.03 * Math.sin((Math.PI * (T - (t0 - 0.2))) / 0.2)
    if (T >= t0) {
      const u = (T - t0) / D
      const b = 0.25 + 0.7 * AGE(TURNS[n])
      th += STEP * (u * u + b * u * u * (1 - u))
    }
  }
  return th
}

/** How far the pawl is lifted off the ratchet: up through each turn, dropping home on the downbeat. */
function pawlAt(T: number): number {
  let a = 0
  for (let j = 0; j < TURNS.length; j++) {
    const t0 = TURNS[j] - turnDur(j)
    a = Math.max(a, smooth(T, t0 - 0.2, t0) * (1 - smooth(T, TURNS[j] - 0.06, TURNS[j])))
  }
  return a
}

/** Hanger i's angle from the hub (screen radians, y down): hanger 0 starts at the bottom, empty; 1 to 5 hold the ties. */
const hangerAngle = (i: number, T: number): number => Math.PI / 2 - i * STEP + wheelTurn(T)
const pinAt = (i: number, T: number): Pt => {
  const a = hangerAngle(i, T)
  return [WHEEL.x + WHEEL.r * Math.cos(a), WHEEL.y + WHEEL.r * Math.sin(a)]
}

/**
 * How each hanging collar swings: a pendulum on its pin, driven by the pin's acceleration as the wheel turns and
 * stops, damped. Integrated once for the part's whole slot (the times are the music's), read back by time.
 */
const SIM = { t0: ENTER - 0.5, t1: SHUT + 0.6, dt: 1 / 600, store: 1 / 120, len: 0.3, damp: 3.4 }
const swings: Float32Array[] = (() => {
  const n = Math.ceil((SIM.t1 - SIM.t0) / SIM.store) + 1
  const out = [0, 1, 2, 3, 4, 5].map(() => new Float32Array(n))
  const every = Math.round(SIM.store / SIM.dt)
  const h = SIM.dt
  for (let i = 0; i < 6; i++) {
    let psi = 0
    let w = 0
    for (let step = 0; step < n * every; step++) {
      const t = SIM.t0 + step * h
      if (step % every === 0) out[i][step / every] = psi
      const a = pinAt(i, t - h)
      const b = pinAt(i, t)
      const c = pinAt(i, t + h)
      const ax = (a[0] - 2 * b[0] + c[0]) / (h * h)
      const ay = (a[1] - 2 * b[1] + c[1]) / (h * h)
      const acc = (-ax * Math.cos(psi) - (G_EARTH - ay) * Math.sin(psi)) / SIM.len - SIM.damp * w
      w += acc * h
      psi += w * h
    }
  }
  return out
})()
/** How far a hanger reaches below its pin while it travels (all the way, `WHEEL.hang`, only at the bottom). */
const SHORT = 0.05
const swingOf = (i: number, T: number): number => {
  const f = (Math.max(SIM.t0, Math.min(SIM.t1, T)) - SIM.t0) / SIM.store
  const j = Math.max(0, Math.min(swings[i].length - 2, Math.floor(f)))
  const u = Math.max(0, Math.min(1, f - j))
  return swings[i][j] * (1 - u) + swings[i][j + 1] * u
}

/* ------------------------------------------------------------------ the dance */

/** The pair's middle, travelling down the hall with the waltz's lilt (quick on the first beats, easing into each downbeat). */
const M0 = 3.1
const M1 = 6.3
const pairAt = spline([
  { t: DANCE[0], x: M0, v: 0 },
  { t: DANCE[1], x: 3.85, v: 0.45 },
  { t: DANCE[2], x: 4.7, v: 0.45 },
  { t: DANCE[3], x: 5.55, v: 0.4 },
  { t: DANCE[4], x: M1, v: 0 },
])
/** Where she is round him: 0 at his right (ahead), π at his left; she passes behind him every bar, and back. */
function turnOf(T: number): number {
  for (let i = 0; i < 4; i++) {
    if (T < DANCE[i + 1]) {
      const u = sineEase((T - DANCE[i]) / (DANCE[i + 1] - DANCE[i]))
      return i % 2 === 0 ? Math.PI * u : Math.PI * (1 - u)
    }
  }
  return 0
}
/** How far apart, centre to centre: a little space while they turn, closer in the embrace. */
const apart = (T: number): number => 0.28 - 0.02 * smooth(T, DANCE[3] + 0.4, EMBRACE)
/** Behind him she is a little higher and smaller: further away. */
const BEHIND = { rise: 0.1, shrink: 0.12 }

/* ------------------------------------------------------------------ Carl */

const TAKEOFF = PLATE - 0.3
/**
 * A step up that rises from rest and comes down onto its beat: u²(1 - u), scaled (its peak is 0.148 of `c`), so the
 * lift is gentle and the landing is the sharp moment, on the music.
 */
const rise = (u: number, c: number): number => c * u * u * (1 - u)
const carlIn = spline([
  { t: ENTER, x: -0.5, v: 0.8 },
  { t: TAKEOFF, x: 0.43, v: (0.72 - 0.43) / (PLATE - TAKEOFF) },
])
const carlSettle = spline([
  { t: PLATE, x: 0.72, v: 0.3 },
  { t: PLATE + 0.22, x: WHEEL.x, v: 0 },
])
/** When he steps off the plate, after the bow tie. */
const LEAVE = BOW_ON + 0.38
const carlToDance = spline([
  { t: LEAVE, x: WHEEL.x, v: 0 },
  { t: 154.2, x: 1.45, v: 0.62 },
  { t: DANCE[0], x: M0 - 0.14, v: 0 },
])
const carlToDesk = spline([
  { t: EMBRACE, x: M1 - 0.13, v: 0 },
  { t: EMBRACE + 0.3, x: M1 - 0.12, v: 0.05 },
  { t: LAMP + 0.2, x: 6.95, v: 0.45 },
  { t: PEDAL_ON, x: PEDAL.x, v: 0 },
])
/** The walk out: from rest on the pedal to 0.6 cells a second at the cut, evenly gathering. */
const WALK_A = 0.6 / (SHUT - STAMP2)

/** The plate under the wheel: it takes his weight with a little give. */
function plateSink(T: number): number {
  if (T < PLATE) return 0
  const dt = T - PLATE
  return 0.014 * (1 - Math.exp(-dt / 0.05)) + 0.01 * Math.exp(-dt / 0.1) * Math.sin(dt * 28)
}

/** How far down he stands on the pedal since the landing at `L`, and the extra dip of the basket arriving. */
function onPedal(T: number, L: number): number {
  const dt = T - L
  const basket = T >= BASKET_IN ? 0.004 * (1 - Math.exp(-(T - BASKET_IN) / 0.06)) + impulse(T, BASKET_IN, 0.012, 0.1) : 0
  return 0.012 * (1 - Math.exp(-dt / 0.05)) + impulse(T, L, 0.014, 0.09) + basket
}

/** His pumps on the pedal: a lift and a stamp down, each landing on its beat. */
const HOP_T = 0.26
const HOP_C = 0.3
const lastLanding = (T: number): number => {
  let last = PEDAL_ON
  for (const h of HOPS) if (T >= h) last = h
  return last
}
/** The hop under way at T, if any: its landing time. */
const hopAt = (T: number): number | null => HOPS.find((h) => T > h - HOP_T && T < h) ?? null
function pedalY(T: number): number {
  const h = hopAt(T)
  if (h !== null) {
    const y0 = onPedal(h - HOP_T, lastLanding(h - HOP_T))
    const u = (T - (h - HOP_T)) / HOP_T
    return y0 * (1 - u * u) - rise(u, h === STAMP2 ? HOP_C * 0.7 : HOP_C)
  }
  return onPedal(T, lastLanding(T))
}

/** Carl at show time T, in the part's frame. */
function carlAt(T: number): Pt {
  if (T < TAKEOFF) return [carlIn(T), 0]
  if (T < PLATE) {
    const u = (T - TAKEOFF) / (PLATE - TAKEOFF)
    return [0.43 + (0.72 - 0.43) * u, -rise(u, 0.42)]
  }
  if (T < LEAVE) return [T < PLATE + 0.22 ? carlSettle(T) : WHEEL.x, plateSink(T)]
  if (T < DANCE[0]) {
    const x = carlToDance(T)
    return [x, plateSink(T) * (1 - smooth(x, WHEEL.x + 0.08, WHEEL.x + 0.22))]
  }
  if (T < EMBRACE) return [pairAt(T) - (apart(T) / 2) * Math.cos(turnOf(T)), 0]
  if (T < PEDAL_ON) return [carlToDesk(T), 0]
  if (T < STAMP2) return [PEDAL.x, pedalY(T)]
  const dt = Math.min(T, SHUT) - STAMP2
  return [PEDAL.x + 0.5 * WALK_A * dt * dt, pedalY(T) * (1 - smooth(T, STAMP2 + 0.04, SHUT - 0.1))]
}

/** How he holds himself: nods, stretches, the lean of the dance, the squash of each landing. */
function carlPose(T: number): { tilt: number; squash: number } {
  let tilt = 0
  let sq = 0
  const crouch = (at: number, a: number) => a * gesture(T, at - 0.14, 0.1, 0, 0.06)
  // The hop onto the plate.
  sq += crouch(TAKEOFF, 0.07) + impulse(T, PLATE, 0.14)
  // A nod as each collar comes down on him; a stretch, chin up, as she snugs each knot (gentler as he ages).
  for (const t of TURNS) sq += impulse(T, t, 0.055 * (1 - 0.3 * AGE(t)), 0.16)
  for (const t of CINCH) sq -= impulse(T, t, 0.07 * (1 - 0.3 * AGE(t)), 0.22)
  // The dance: leaning to her side as she goes round him, a settle on each step.
  const inDance = smooth(T, DANCE[0] - 0.3, DANCE[0] + 0.15) * (1 - smooth(T, EMBRACE + 0.5, EMBRACE + 1.4))
  if (inDance > 0) {
    tilt += 0.08 * Math.cos(turnOf(T)) * inDance
    for (const t of DANCE.slice(1)) sq += impulse(T, t, 0.04, 0.2)
  }
  // Into her arms on the accent, a lean towards her held and let go.
  tilt += 0.06 * gesture(T, EMBRACE - 0.25, 0.3, 0.5, 0.8)
  // The look up at the painting: he straightens.
  sq -= 0.05 * gesture(T, LAMP - 0.05, 0.35, 0.45, 0.4)
  // The pedal, the basket landing on him, the pumps.
  sq += impulse(T, PEDAL_ON, 0.07) + impulse(T, BASKET_IN, 0.13, 0.18)
  for (const h of HOPS) sq += crouch(h - HOP_T, 0.06) + impulse(T, h, 0.1, 0.12)
  return { tilt, squash: sq }
}

/** Where his top edge is (its middle), with his lean and squash: where a collar or a basket sits on him. */
function carlTop(T: number): { x: number; y: number; tilt: number } {
  const [x, y] = carlAt(T)
  const { tilt, squash } = carlPose(T)
  const h = 2 * HALF * (1 - squash)
  const d = HALF - h
  return { x: x - Math.sin(tilt) * d, y: y + Math.cos(tilt) * d, tilt }
}

/* ------------------------------------------------------------------ Ellie */

/** Where she stands beside him at the wheel, clear of the ties going by. */
const ELLIE_BY = 0.4
const ellieIn = spline([
  { t: ENTER, x: -0.14, v: 0.8 },
  { t: 141.6, x: 0.95, v: 0.6 },
  { t: 142.3, x: WHEEL.x + ELLIE_BY, v: 0 },
])
/** Her straightening of each tie: a small draw back, a roll in to touch him on the downbeat, and back to her place. */
const TAP = 0.265 - ELLIE_BY
function cinchOff(T: number, Tc: number): number {
  const age = AGE(Tc)
  const back = 0.04 * (1 - 0.5 * age)
  const inDur = 0.4 + 0.16 * age
  const outDur = 0.8 + 0.35 * age
  const tIn = Tc - inDur
  if (T < tIn) return back * smooth(T, tIn - 0.4, tIn)
  if (T < Tc) {
    const u = (T - tIn) / inDur
    return back + (TAP - back) * u * u
  }
  const u = Math.min(1, (T - Tc) / outDur)
  return TAP * (1 - u) ** 3
}
const ellieToLever = spline([
  { t: BOW_ON, x: WHEEL.x + 0.265, v: 0.3 },
  { t: LEVER, x: 1.82, v: 0.35 },
])
const ellieToDance = spline([
  { t: LEVER, x: 1.82, v: 0.1 },
  { t: 155.95, x: M0 + 0.14, v: 0 },
])
const ellieToDoor = spline([
  { t: EMBRACE, x: M1 + 0.13, v: 0 },
  { t: EMBRACE + 0.3, x: M1 + 0.14, v: 0.05 },
  { t: LAMP, x: 7.2, v: 0.6 },
  { t: PEDAL_ON, x: 7.95, v: 0.2 },
  { t: DOOR_OPEN, x: 8.2, v: 0.12 },
])
/** After the door: back from it to wait beside him, a lean out to look at the evening, and waiting. */
const ELLIE_WAIT = PEDAL.x + 0.36
const ellieAtDoor = spline([
  { t: DOOR_OPEN, x: 8.2, v: -0.1 },
  { t: 164.9, x: ELLIE_WAIT, v: 0 },
  { t: 165.35, x: ELLIE_WAIT, v: 0 },
  { t: 165.95, x: ELLIE_WAIT + 0.08, v: 0 },
  { t: 166.6, x: ELLIE_WAIT, v: 0 },
])

function ellieAt(T: number): Companion {
  if (T < 142.3) return { x: ellieIn(T), y: 0 }
  if (T < BOW_ON) {
    let off = ELLIE_BY
    for (const Tc of CINCH) off += cinchOff(T, Tc)
    return { x: WHEEL.x + off, y: 0 }
  }
  if (T < LEVER) return { x: ellieToLever(T), y: 0 }
  if (T < DANCE[0]) return { x: ellieToDance(T), y: 0 }
  if (T < EMBRACE) {
    const phi = turnOf(T)
    const s = Math.sin(phi)
    return { x: pairAt(T) + (apart(T) / 2) * Math.cos(phi), y: -BEHIND.rise * s, scale: 1 - BEHIND.shrink * s }
  }
  if (T < DOOR_OPEN) return { x: ellieToDoor(T), y: 0 }
  if (T < STAMP2) return { x: ellieAtDoor(T), y: 0 }
  const dt = Math.min(T, SHUT) - STAMP2
  return { x: ELLIE_WAIT + 0.5 * WALK_A * dt * dt, y: 0 }
}

/* ------------------------------------------------------------------ the machines' states */

/** The gramophone: the lever bumped, the arm over, the needle down, the record turning; the auto-stop after the dance. */
const SPIN = (() => {
  const t0 = LEVER - 0.1
  const dt = 1 / 120
  const n = Math.ceil((SHUT + 2 - t0) / dt)
  const out = new Float32Array(n + 1)
  let a = 0
  for (let i = 1; i <= n; i++) {
    const t = t0 + i * dt
    a += 8.2 * smooth(t, LEVER, LEVER + 0.8) * (1 - smooth(t, LAMP, LAMP + 1.3)) * dt
    out[i] = a
  }
  return { t0, dt, out }
})()
function gramAt(T: number) {
  const i = Math.max(0, Math.min(SPIN.out.length - 1, Math.floor((T - SPIN.t0) / SPIN.dt)))
  const lever = smooth(T, LEVER - 0.02, LEVER + 0.06) * (1 - smooth(T, LAMP, LAMP + 0.18))
  const arm = smooth(T, LEVER + 0.3, NEEDLE - 0.35) * (1 - smooth(T, LAMP + 0.15, LAMP + 0.9))
  const lowering = T < NEEDLE ? smooth(T, NEEDLE - 0.3, NEEDLE) ** 2 : 1 - 0.3 * Math.sin((T - NEEDLE) * 30) * Math.exp(-(T - NEEDLE) / 0.06)
  const down = Math.max(0, lowering) * (1 - smooth(T, LAMP - 0.02, LAMP + 0.12))
  return { lever, arm, down, spin: SPIN.out[i] }
}

/** The basket's drop: from the desk's leaf onto his top, landing on 57's second beat. */
const BASKET_REST: Pt = [PEDAL.x, DESK.top]
const FALL = (() => {
  const h = carlTop(BASKET_IN).y - BASKET_REST[1]
  return { from: BASKET_IN - Math.sqrt((2 * h) / G_EARTH), h }
})()

/** The ticket machine's reel: a place for each pump, rolling up and clicking home; the stamp; the pedal; its shiver. */
function deskAt(T: number) {
  let reel = 0
  for (let j = 0; j < PUMPS.length; j++) {
    const P = PUMPS[j]
    if (T >= P) reel = j + 1 - 0.1 * Math.sin((T - P) * 15) * Math.exp(-(T - P) / 0.17)
    else {
      if (T > P - 0.26) {
        const u = (T - (P - 0.26)) / 0.26
        reel = j + u * u
      }
      break
    }
  }
  let stamp = 0
  for (const S of [STAMP1, STAMP2]) {
    if (T > S - 0.07 && T <= S) stamp = Math.max(stamp, ((T - (S - 0.07)) / 0.07) ** 2)
    else if (T > S) stamp = Math.max(stamp, Math.exp(-(T - S) / 0.08) * (1 + (T - S) / 0.08))
  }
  let shake = 0
  for (const L of [PEDAL_ON, ...HOPS]) if (T >= L) shake += Math.sin((T - L) * 55) * Math.exp(-(T - L) / 0.07)
  const dl = T - (FALL.from - 0.03)
  const leaf = dl <= 0 ? 0 : 1 - Math.exp(-dl / 0.08) * Math.cos(dl * 12)
  // The pedal carries him down; while he is in the air it springs back up, and it is up again once he is off it.
  let pedal = 0
  if (T >= PEDAL_ON && T <= SHUT) {
    const h = hopAt(T)
    if (h !== null) pedal = onPedal(h - HOP_T, lastLanding(h - HOP_T)) * Math.exp(-(T - (h - HOP_T)) / 0.035)
    else pedal = Math.max(0, carlAt(T)[1])
  }
  return { leaf: Math.max(0, Math.min(1.08, leaf)), reel: Math.max(0, Math.min(3.2, reel)), stamp, pedal, shake }
}

/** The front door swinging out onto the porch, bumping its stop and settling. */
const doorAt = (T: number): number => (T <= DOOR_OPEN ? 0 : 1 - Math.exp(-(T - DOOR_OPEN) / 0.15) * Math.cos((T - DOOR_OPEN) * 6))
/** The lamp over the painting: it catches on the downbeat and warms. */
const lampAt = (T: number): number => smooth(T, LAMP - 0.01, LAMP + 0.03) * (0.55 + 0.45 * smooth(T, LAMP, LAMP + 0.7))
/** The low evening sun through the front door, lying along the hall as they dance, going as the dance ends. */
const sunAt = (T: number): number => smooth(T, 153.4, 155.6) * (1 - smooth(T, 158.8, 161.3))
/** The evening coming into the hall as the dance ends. */
const duskAt = (T: number): number => 0.14 * smooth(T, 158.2, 162.2)

/** A seated tie's set on him: askew on arrival (with the jolt), straightened and snugged by her on the downbeat. */
function seated(j: number, T: number): { angle: number; snug: number } {
  const arrive = TURNS[j]
  const Tc = CINCH[j]
  const da = Math.max(0, T - arrive)
  const loose = (0.13 + 0.07 * Math.sin(da * 13) * Math.exp(-da / 0.25)) * (1 - smooth(T, Tc - 0.03, Tc + 0.06))
  const dc = T - Tc
  const jiggle = dc > 0 ? 0.06 * Math.sin(dc * 19) * Math.exp(-dc / 0.16) : 0
  return { angle: loose + jiggle, snug: smooth(T, Tc - 0.03, Tc + 0.05) }
}

/** The tickets' flights: from the machine's slot, up and over into the basket on his top. */
const SLOT: Pt = [MACHINE.x + MACHINE.half + 0.03, MACHINE.wy - 0.02]
function ticketAt(from: number, to: number, T: number): { x: number; y: number; a: number } | null {
  if (T < from || T >= to) return null
  const top = carlTop(to)
  const tx = top.x + 0.07
  const ty = top.y - BASKET.h + 0.08
  const D = to - from
  const vx = (tx - SLOT[0]) / D
  const vy = (ty - SLOT[1] - 0.5 * G_EARTH * D * D) / D
  const dt = T - from
  return { x: SLOT[0] + vx * dt, y: SLOT[1] + vy * dt + 0.5 * G_EARTH * dt * dt, a: -0.3 + dt * 9 }
}

/* ------------------------------------------------------------------ the part */

interface TiesState {
  begin: number
}

export const ties = part<TiesState>(
  {
    name: 'ties',
    draw: (p: p5, s: TiesState, c: Ctx) => {
      const T = c.t + s.begin
      const { k, weight } = c
      const age = AGE(T)
      drawSunWedge(p, k, sunAt(T), 5.6 - 1.4 * smooth(T, 158.6, 161.4))
      drawPainting(p, k, weight, age)
      const plate = T >= PLATE ? plateSink(T) * (1 - smooth(carlAt(T)[0], WHEEL.x + 0.08, WHEEL.x + 0.22)) : 0
      drawWheelFrame(p, k, weight, wheelTurn(T), pawlAt(T), plate, age)
      drawGramophone(p, k, weight, gramAt(T), age)
      drawDesk(p, k, weight, deskAt(T), age)
      drawDoor(p, k, weight, doorAt(T), age)
    },
    over: (p: p5, s: TiesState, c: Ctx) => {
      const T = c.t + s.begin
      const { k, weight } = c
      const age = AGE(T)
      const [cx] = carlAt(T)
      const top = carlTop(T)
      // He stands under the wheel from the hop to stepping off: while he does, the collar at the bottom sits on him.
      const under = T >= PLATE - 0.05 ? 1 - smooth(Math.abs(cx - WHEEL.x), 0.03, 0.12) : 0
      for (let i = 0; i < 6; i++) {
        const pin = pinAt(i, T)
        const psi = swingOf(i, T)
        // The hangers telescope: each rides up close under the rim, and only the one coming to the bottom reaches
        // down onto him (so the ties travel over her head, not across her).
        const d = Math.abs(wrap(hangerAngle(i, T) - Math.PI / 2))
        const reach = SHORT + (WHEEL.hang - SHORT) * (1 - smooth(d, 0.04, 0.22))
        const hang: Pt = [pin[0] + reach * Math.sin(psi), pin[1] + reach * Math.cos(psi)]
        const w = under * (1 - smooth(d, 0.02, 0.1))
        const clip: Pt = [hang[0] + (top.x - hang[0]) * w, hang[1] + (top.y - hang[1]) * w]
        // The bow tie is his once she has tied it (if it stays): its hanger lets go, and is empty after.
        const gone = i === 5 && BOW_STAYS && T >= BOW_ON
        const open = i === 0 ? 0.6 : gone ? smooth(T, BOW_ON, BOW_ON + 0.15) : 0
        drawHanger(p, k, weight, pin, clip, open, age)
        if (i === 0 || gone) continue
        const j = i - 1
        const set = seated(j, T)
        const angle = -psi * (1 - w) + (top.tilt + set.angle) * w
        const snug = 1 - w * (1 - set.snug)
        drawTie(p, k, weight, TIES[j], clip[0], clip[1], angle, snug)
      }
      // The bow tie on him, from her knot to the cut (drawn here unless the cast has taken it over).
      if (BOW_STAYS && T >= BOW_ON && T <= SHUT && (!BOW_IN_CAST || T < BOW_FROM)) {
        const set = seated(4, T)
        drawTie(p, k, weight, BOW, top.x, top.y, top.tilt + set.angle, set.snug)
      }
      // The tickets in the air, then the basket over them (they fall in behind its front).
      for (const [a, b] of [
        [STAMP1, STAMP2],
        [STAMP2, SHUT],
      ]) {
        const tk = ticketAt(a, b, T)
        if (tk) drawTicket(p, k, weight, tk.x, tk.y, tk.a)
      }
      if (T < FALL.from) drawBasket(p, k, weight, BASKET_REST[0], BASKET_REST[1], { open: 0 })
      else if (T < BASKET_IN) {
        const u = (T - FALL.from) / (BASKET_IN - FALL.from)
        drawBasket(p, k, weight, BASKET_REST[0], BASKET_REST[1] + FALL.h * u * u, { open: 0, tilt: 0.05 * Math.sin(u * 3) })
      } else if (T <= SHUT + 0.001) {
        const dt = T - BASKET_IN
        const wobble = 0.07 * Math.sin(dt * 17) * Math.exp(-dt / 0.2)
        const pop = smooth(T, BASKET_IN, BASKET_IN + 0.1) * (1 + 0.15 * Math.sin(dt * 14) * Math.exp(-dt / 0.2))
        const shut = T < SHUT - 0.13 ? 0 : ((T - (SHUT - 0.13)) / 0.13) ** 2
        drawBasket(p, k, weight, top.x, top.y, { open: Math.max(0, pop * (1 - shut)), tilt: top.tilt + wobble })
      }
      // The evening over the hall, and the lamp's light on her painting over that.
      drawDusk(p, k, duskAt(T))
      drawLampLight(p, k, lampAt(T))
    },
  },
  (slot: Slot) => {
    if (Math.abs(slot.begin - ENTER) > 1e-6 || Math.abs(slot.end - SHUT) > 1e-6) console.warn(`married life: ties is timed for ${ENTER}–${SHUT}, given ${slot.begin}–${slot.end}`)
    // The lane: sampled from the same function the drawing reads, broken at every moment it turns a corner (a hop's
    // take-off and landing, each phase), so a strike is at its instant exactly.
    const breaks = [ENTER, TAKEOFF, PLATE, PLATE + 0.22, LEAVE, DANCE[0], ...DANCE.slice(1), PEDAL_ON, BASKET_IN, ...HOPS.flatMap((h) => [h - HOP_T, h]), SHUT]
      .filter((t) => t >= ENTER && t <= SHUT)
      .sort((a, b) => a - b)
      .filter((t, i, all) => i === 0 || t - all[i - 1] > 1e-6)
    const segs: Seg[] = []
    for (let i = 1; i < breaks.length; i++) {
      const a = breaks[i - 1]
      const b = breaks[i]
      segs.push(...carried((t) => carlAt(t + ENTER), a - ENTER, b - ENTER, Math.max(1, Math.ceil((b - a) / 0.02))))
    }
    const end = carlAt(SHUT)
    const pose: Pose[] = [{ from: ENTER, to: SHUT, at: carlPose }]
    return {
      cells: box(-1, -3, 10, 1),
      exit: [end[0] + 0.5, end[1]] as Pt,
      lane: { segs, fire: PLATE - ENTER },
      state: { begin: slot.begin },
      company: [{ from: ENTER, to: SHUT, at: ellieAt }],
      pose,
    }
  },
  (): PartShot[] => {
    const cut = carlAt(SHUT)
    return [
      // The mornings: close on the wheel and the two of them, drifting slowly across as the years go.
      { t: 142.4, cells: 2.95, hold: [0.55, -0.82], w: 1 },
      { t: 147.6, cells: 2.6, hold: [1.0, -0.72], w: 1 },
      { t: 152.5, cells: 2.35, hold: [1.35, -0.62], w: 1 },
      // The gramophone, and after her to the floor.
      { t: 154.7, cells: 2.55, hold: [2.05, -0.62], w: 0.8 },
      // The dance, on the loudest bars of the cue: the whole of it in one wide, the gramophone playing at the left, her
      // painting over the desk at the right, and the two of them turning down the hall between, drifting with them.
      { t: DANCE[0] + 0.25, cells: 3.5, hold: [4.85, -1.12], w: 1 },
      { t: EMBRACE - 0.2, cells: 3.3, hold: [5.35, -1.08], w: 1 },
      // The painting, lit: a long look, him small under it.
      { t: LAMP + 0.45, cells: 3.35, hold: [7.15, -1.1], w: 1 },
      // In on the machine, the basket and him; her at the door.
      { t: 163.6, cells: 2.55, hold: [7.45, -0.62], w: 1 },
      { t: 165.95, cells: 2.6, hold: [7.55, -0.66], w: 1 },
      // The cut: out after her, framed as `CUTS.climb` says.
      { t: SHUT, cells: 5, hold: [cut[0] + 0.8, cut[1] - 0.9], w: 1 },
    ]
  },
)
