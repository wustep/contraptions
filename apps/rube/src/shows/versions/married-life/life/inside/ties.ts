import type p5 from 'p5'
import { mixHex, R, type Pt, type Seg } from '../../../../../parts'
import { alpha, box, carried, part, smooth, type Companion, type Ctx, type PartShot, type Pose, type Slot } from '../kit'
import { AGE, AT, bar, beat, SEAM } from '../music'
import { G_EARTH } from '../physics'
import { BOW_FROM, HALF } from '../cast'
import { CHURCH, HOME, INK } from '../worlds'
import { BASKET, drawBasket } from '../props/basket'
import { CUTS } from '../seams'
import { DESK, drawDesk, drawDoor, drawDusk, drawSunWedge, drawGramophone, drawHanger, drawLampLight, drawPainting, drawTicket, drawWheelFrame, FLOOR, MACHINE, PEDAL, WHEEL } from './ties-set'
import { BOW, drawTie } from './ties-tie'

/**
 * TIES: the hall, through the years (jar bars 37 to 61, 140.655 to 167.706).
 *
 * The tie wheel. By the doorway from the living room stands a wheel on an easel of a stand, like a small Ferris wheel,
 * and from its six hangers hang a shirt collar and a tie each: the ties of all their years, there to be seen from the
 * start, the bow tie waiting at the lower left. Carl hops onto the brass plate under it (bar 38) and it wakes. Every
 * morning is two bars. On the first downbeat the wheel turns a sixth (his weight on the plate lifts the pawl) and the
 * next collar comes down onto him; the clip lets it go, and he steps out towards the front door, where she waits; on
 * the second downbeat she rolls in and knots it snug, as she did every morning. Then he steps back onto the plate: the
 * empty clip takes back his old tie, the wheel turns, it swings away up and the next one comes down. Five mornings,
 * five decades: a wide stripe, polka dots, a thin black one, a loud one in blocks of colour, and last the bow tie,
 * each a little greyer than the one before. The light the front door's glass throws on the wall behind them jumps a
 * step on every downbeat, morning to evening and season to season; his steps shorten, her rolls slow.
 *
 * The dance. She bumps the gramophone's lever (bar 49); the needle drops (bar 50); they meet (bar 51) at the loudest
 * of the waltz and waltz the length of the hall in a pool of warm light, in hold, she at his right: a rise on every
 * downbeat, a sway on the two and three; on bar 53 she turns out under his arm and back; they come to rest in each
 * other's arms on the accent of bar 55. The camera has the gramophone whole at the start and the desk and her
 * painting whole at the end, and all of it at the top of its crane.
 *
 * The tickets. The evening comes in, and the lamp over her painting of Paradise Falls lights (bar 56): he sees it, a
 * long look. He steps onto the pedal in the floor by the desk (bar 57); the desk's leaf lets go and the picnic basket
 * drops onto his top (57's second beat). She is at the front door, looking out, and opens it (bar 58). He pumps the
 * pedal (bars 58, 59, 60) and the ticket machine's reel rolls through the places, the city, the sea, the mountains, to
 * the falls; on the cadence it stamps two tickets (166.934, 167.277) that jump from its slot into the basket; the
 * second lands and the lid shuts on 167.706 as he walks out after her: the cut to the hill.
 *
 * The part's frame: Carl enters at (-0.5, 0), the doorway from the living room (INSIDE 13.05); the hall and its
 * props are in `ties-set.ts`, the bow tie in `ties-tie.ts`; the four long ties are drawn here (`drawLook`).
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
/** Each a collar and tie coming down onto him; each her knotting it. */
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

const wrap = (a: number): number => a - 2 * Math.PI * Math.round(a / (2 * Math.PI))
const clamp01 = (u: number): number => Math.max(0, Math.min(1, u))

/* ------------------------------------------------------------------ the mornings */

/** How long each turn takes: brisk when they are young, slower as they age. */
const turnDur = (j: number): number => 0.36 + 0.1 * AGE(TURNS[j])
const turnFrom = (j: number): number => TURNS[j] - turnDur(j)
/** When he is back on the plate for morning j: the empty clip takes his old tie back, and his weight lifts the pawl. */
const BACK_ON = TURNS.map((_, j) => turnFrom(j) - 0.08)
/** How far he steps out towards the front door each morning: shorter steps as the years go. */
const STEP_OUT = [0.48, 0.43, 0.38, 0.33, 0.28]
const OUT_FROM = TURNS.map((t) => t + 0.26)
const OUT_TO = CINCH.map((t) => t - 0.1)
const BACK_FROM = CINCH.map((t) => t + 0.06)
/** Each tie is his from when the clip lets it go (after the nod) until the clip takes it back the next morning. */
const RELEASE = TURNS.map((t) => t + 0.2)
const RETURN = [BACK_ON[1], BACK_ON[2], BACK_ON[3], BACK_ON[4], Infinity]

/* ------------------------------------------------------------------ the tie wheel */

const STEP = Math.PI / 3

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
    if (T >= t0) {
      const u = (T - t0) / D
      const b = 0.25 + 0.7 * AGE(TURNS[n])
      th += STEP * (u * u + b * u * u * (1 - u))
    }
  }
  return th
}

/** How far the pawl is lifted off the ratchet: up as his weight comes onto the plate, dropping home on the downbeat. */
function pawlAt(T: number): number {
  let a = 0
  for (let j = 0; j < TURNS.length; j++) {
    const t0 = turnFrom(j)
    a = Math.max(a, smooth(T, t0 - 0.1, t0) * (1 - smooth(T, TURNS[j] - 0.06, TURNS[j])))
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

/* ------------------------------------------------------------------ the four long ties */

type LookKind = 'stripe' | 'dots' | 'thin' | 'block'
interface Look {
  kind: LookKind
  /** The blade's widest, in cells. */
  w: number
  color: string
  accent: string
}
/** Each decade's tie a step greyer than the last (and Carl greying under them). */
const FADE_TO = '#8A847E'
const FADE = [0.04, 0.14, 0.24, 0.32]
const LOOKS: Look[] = (
  [
    { kind: 'stripe', w: 0.13, color: mixHex(CHURCH.glassGreen, INK, 0.3), accent: HOME.trim },
    { kind: 'dots', w: 0.125, color: CHURCH.glassRed, accent: HOME.trim },
    { kind: 'thin', w: 0.05, color: mixHex(INK, '#1E1B1A', 0.5), accent: '#6A625D' },
    { kind: 'block', w: 0.15, color: HOME.yellow, accent: mixHex(HOME.pink, CHURCH.glassRed, 0.35) },
  ] as Look[]
).map((l, j) => ({ ...l, color: mixHex(l.color, FADE_TO, FADE[j]), accent: mixHex(l.accent, FADE_TO, FADE[j] * 0.6) }))

/** The collar: a cream band whose two points turn down either side of the knot. */
function collar(p: p5, k: number, weight: number): void {
  p.stroke(alpha(p, INK, 0.9))
  p.strokeWeight(weight * 0.55)
  p.fill(HOME.trim)
  p.beginShape()
  p.vertex(-0.09 * k, 0)
  p.vertex(0.09 * k, 0)
  p.vertex(0.075 * k, 0.062 * k)
  p.vertex(0.016 * k, 0.03 * k)
  p.vertex(-0.016 * k, 0.03 * k)
  p.vertex(-0.075 * k, 0.062 * k)
  p.endShape(p.CLOSE)
}

/** The blade's outline in pixels: from under the knot, widening, to its point. Ends a little above his bottom. */
function bladePath(look: Look, k: number): [number, number][] {
  const half = look.w / 2
  const neck = look.kind === 'thin' ? 0.012 : 0.02
  const low = look.kind === 'thin' ? 0.2 : 0.182
  return [
    [-neck, 0.056],
    [neck, 0.056],
    [half, low],
    [0, 0.226],
    [-half, low],
  ].map(([x, y]) => [x * k, y * k])
}

/** The pattern on the blade, clipped to it: each readable at a glance from across the hall. */
function pattern(p: p5, look: Look, k: number, weight: number): void {
  const half = look.w / 2
  if (look.kind === 'stripe') {
    // Wide regimental stripes, running down to the left.
    p.noFill()
    p.stroke(look.accent)
    p.strokeWeight(0.026 * k)
    for (let i = -1; i <= 5; i++) {
      const y = 0.05 + i * 0.062
      p.line(-half * 1.5 * k, (y + 0.05) * k, half * 1.5 * k, (y - 0.05) * k)
    }
  } else if (look.kind === 'dots') {
    // Polka dots, in offset rows.
    p.noStroke()
    p.fill(look.accent)
    for (let r = 0; r < 5; r++) {
      const y = 0.085 + r * 0.036
      for (let c = -2; c <= 2; c++) p.circle((c * 0.044 + (r % 2 ? 0.022 : 0)) * k, y * k, 0.019 * k)
    }
  } else if (look.kind === 'block') {
    // Blocks of colour: the loud one, the seventies'. A broad band across its lower half, a cream line between.
    p.noStroke()
    p.fill(look.accent)
    p.rect(-half * k, 0.128 * k, look.w * k, 0.12 * k)
    p.stroke(HOME.trim)
    p.strokeWeight(0.014 * k)
    p.line(-half * k, 0.128 * k, half * k, 0.128 * k)
  } else {
    // The thin black tie: plain, one lighter line of its sheen.
    p.noFill()
    p.stroke(look.accent)
    p.strokeWeight(weight * 0.45)
    p.line(-0.004 * k, 0.07 * k, -0.008 * k, 0.19 * k)
  }
}

/**
 * How much larger than drawn the long ties are, across and down: broad enough that each change reads at a glance on
 * him from across the hall, the point still a little above his bottom edge (0.226 × 1.08 of his 0.26).
 */
const LOOK_SIZE: Pt = [1.3, 1.08]

/** A collar and one of the long ties, at (`x`, `y`) in cells (the collar's top middle), hanging along `angle`. */
function drawLook(p: p5, k: number, weight: number, look: Look, x: number, y: number, angle = 0, snug = 1): void {
  p.push()
  p.translate(x * k, y * k)
  p.rotate(angle)
  p.scale(LOOK_SIZE[0], LOOK_SIZE[1])
  // Its lines as thick as everything else's.
  weight /= Math.sqrt(LOOK_SIZE[0] * LOOK_SIZE[1])
  p.rectMode(p.CORNER)
  // Loose, the knot sits a little low and the blade with it.
  p.translate(0, (1 - snug) * 0.016 * k)
  const path = bladePath(look, k)
  p.stroke(INK)
  p.strokeWeight(weight * 0.6)
  p.fill(look.color)
  p.beginShape()
  for (const [px, py] of path) p.vertex(px, py)
  p.endShape(p.CLOSE)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  path.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)))
  ctx.closePath()
  ctx.clip()
  pattern(p, look, k, weight)
  ctx.restore()
  // The outline again over the pattern's ends.
  p.noFill()
  p.stroke(INK)
  p.strokeWeight(weight * 0.6)
  p.beginShape()
  for (const [px, py] of path) p.vertex(px, py)
  p.endShape(p.CLOSE)
  // The knot: a tapered block under the collar.
  p.fill(mixHex(look.color, INK, 0.15))
  const kw = look.kind === 'thin' ? 0.02 : 0.03
  p.quad(-kw * k, 0.016 * k, kw * k, 0.016 * k, kw * 0.65 * k, 0.062 * k, -kw * 0.65 * k, 0.062 * k)
  p.translate(0, -(1 - snug) * 0.016 * k)
  collar(p, k, weight)
  p.pop()
}

/** A tie by its number: the four long ones drawn here, the bow tie by the cast's own drawing. */
function drawTieNo(p: p5, k: number, weight: number, j: number, x: number, y: number, angle: number, snug: number): void {
  if (j === 4) drawTie(p, k, weight, BOW, x, y, angle, snug)
  else drawLook(p, k, weight, LOOKS[j], x, y, angle, snug)
}

/* ------------------------------------------------------------------ the dance */

/** The dance's four bars, their lengths. */
const BAR_LEN = [0, 1, 2, 3].map((i) => DANCE[i + 1] - DANCE[i])

/**
 * A waltz's lilt through five values at the dance's five downbeats: quick off each downbeat, easing through the two
 * and three, at `V` (value a second) on every inner downbeat; from rest on the first, to rest on the last.
 */
function lilted(X: number[], V: number): (T: number) => number {
  return (T) => {
    if (T <= DANCE[0]) return X[0]
    if (T >= EMBRACE) return X[4]
    let i = 0
    while (i < 3 && T >= DANCE[i + 1]) i++
    const L = BAR_LEN[i]
    const d = X[i + 1] - X[i]
    const u = (T - DANCE[i]) / L
    let g: number
    if (i === 0) {
      const m = (V * L) / d
      g = -2 * u ** 3 + 3 * u * u + m * (u ** 3 - u * u)
    } else if (i === 3) {
      const m = (V * L) / d
      g = -2 * u ** 3 + 3 * u * u + m * (u ** 3 - 2 * u * u + u)
    } else {
      const a = (V * L) / d - 1
      g = u + (a / (2 * Math.PI)) * Math.sin(2 * Math.PI * u)
    }
    return X[i] + d * g
  }
}

/** Carl down the hall, the length of the open floor between the gramophone and the desk, a bar at a time. */
const P0 = 3.25
const M1 = 6.05
const pairAt = lilted([P0, 3.95, 4.65, 5.35, M1], 0.8)
/**
 * Where she is: always at his right, in hold, a little apart, so the two never run together into one shape. Bars 51
 * and 52 they waltz in hold; on 53, the loudest bar, she turns out under his arm to arm's length and rolls back in by
 * its end; on 54 they close into the embrace, still a little apart. Her roll out and back turns her through most of
 * a turn and back.
 */
const HOLD_GAP = 0.32
const EMBRACE_GAP = 0.28
const TURN_OUT = 0.26
/** Her turn out under his arm, 0..1..0 over bar 53: out through its first two beats, back in on its third. */
const turnOutAt = (T: number): number => {
  const L = DANCE[3] - DANCE[2]
  return smooth(T, DANCE[2] + 0.04 * L, DANCE[2] + 0.46 * L) * (1 - smooth(T, DANCE[2] + 0.5 * L, DANCE[3] - 0.02 * L))
}
const gapAt = (T: number): number => HOLD_GAP + TURN_OUT * turnOutAt(T) - (HOLD_GAP - EMBRACE_GAP) * smooth(T, DANCE[3] + 0.2, EMBRACE)
/** The bar the dance is in, and how far through it. */
function danceBar(T: number): { i: number; u: number } | null {
  if (T < DANCE[0] || T >= EMBRACE) return null
  let i = 0
  while (i < 3 && T >= DANCE[i + 1]) i++
  return { i, u: (T - DANCE[i]) / BAR_LEN[i] }
}
/** The rise: up off each downbeat, highest on the two, lowering through the three. */
function riseAt(T: number): number {
  const b = danceBar(T)
  return b ? 6.75 * b.u * (1 - b.u) ** 2 : 0
}
/** The sway of the waltz: one way through the two and three of a bar, the other way through the next. */
function swayAt(T: number): number {
  const b = danceBar(T)
  return b ? (b.i % 2 ? -1 : 1) * Math.sin(Math.PI * clamp01((b.u - 0.3) / 0.7)) : 0
}
/** How much they are in the dance: in from the approach, out through the embrace. */
const inDanceAt = (T: number): number => smooth(T, DANCE[0] - 0.3, DANCE[0] + 0.15) * (1 - smooth(T, EMBRACE - 0.4, EMBRACE + 0.3))
/** The warm pool of light they dance in: it gathers as the needle drops and gives way to the picture lamp. */
const poolAt = (T: number): number => smooth(T, NEEDLE + 0.2, DANCE[0] + 0.5) * (1 - smooth(T, EMBRACE + 0.4, LAMP + 0.6))

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
/** Each morning: out to her after the tie comes down, back onto the plate after she has knotted it. */
function morningX(T: number): number {
  let x = WHEEL.x
  for (let j = 0; j < 5; j++) {
    x += STEP_OUT[j] * smooth(T, OUT_FROM[j], OUT_TO[j])
    if (j < 4) x -= STEP_OUT[j] * smooth(T, BACK_FROM[j], BACK_ON[j + 1])
  }
  return x
}
/** When he sets off for the dance floor, after the bow tie. */
const LEAVE = BOW_ON + 0.38
const OUT_LAST = WHEEL.x + STEP_OUT[4]
const carlToDance = spline([
  { t: LEAVE, x: OUT_LAST, v: 0 },
  { t: 154.3, x: 1.62, v: 0.72 },
  { t: 155.3, x: 2.6, v: 0.85 },
  { t: DANCE[0], x: P0, v: 0 },
])
const carlToDesk = spline([
  { t: EMBRACE, x: M1, v: 0 },
  { t: EMBRACE + 0.35, x: M1 + 0.02, v: 0.08 },
  { t: LAMP + 0.3, x: 6.95, v: 0.6 },
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
/** How much of his weight is on the plate, from where he stands. */
const onPlate = (x: number): number => 1 - smooth(Math.abs(x - WHEEL.x), 0.1, 0.3)
const plateY = (T: number, x: number): number => plateSink(T) * onPlate(x)

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

/** How high the two of them rise on the downbeats (cells). */
const RISE_CARL = 0.05
const RISE_ELLIE = 0.07

/** Carl at show time T, in the part's frame. */
function carlAt(T: number): Pt {
  if (T < TAKEOFF) return [carlIn(T), 0]
  if (T < PLATE) {
    const u = (T - TAKEOFF) / (PLATE - TAKEOFF)
    return [0.43 + (0.72 - 0.43) * u, -rise(u, 0.42)]
  }
  if (T < LEAVE) {
    const x = T < PLATE + 0.22 ? carlSettle(T) : morningX(T)
    return [x, plateY(T, x)]
  }
  if (T < DANCE[0]) {
    const x = carlToDance(T)
    return [x, plateY(T, x)]
  }
  if (T < EMBRACE) return [pairAt(T), -RISE_CARL * riseAt(T)]
  if (T < PEDAL_ON) return [carlToDesk(T), 0]
  if (T < STAMP2) return [PEDAL.x, pedalY(T)]
  const dt = Math.min(T, SHUT) - STAMP2
  return [PEDAL.x + 0.5 * WALK_A * dt * dt, pedalY(T) * (1 - smooth(T, STAMP2 + 0.04, SHUT - 0.1))]
}

/** His speed along the floor (cells a second), for the lean of his walk. */
const speedAt = (T: number): number => (carlAt(T + 0.01)[0] - carlAt(T - 0.01)[0]) / 0.02

/** How he holds himself: nods, the lean of his steps, the sway of the dance, the squash of each landing. */
function carlPose(T: number): { tilt: number; squash: number } {
  let tilt = 0
  let sq = 0
  const crouch = (at: number, a: number) => a * gesture(T, at - 0.14, 0.1, 0, 0.06)
  // The hop onto the plate.
  sq += crouch(TAKEOFF, 0.07) + impulse(T, PLATE, 0.14)
  // A nod as each collar comes down on him; a squash as she pulls each knot snug (gentler as he ages).
  for (const t of TURNS) sq += impulse(T, t, 0.055 * (1 - 0.3 * AGE(t)), 0.16)
  for (const t of CINCH) sq += impulse(T, t, 0.11 * (1 - 0.3 * AGE(t)), 0.2)
  // His steps out and back each morning, and the walk to the dance floor: a lean into the way he goes. (His speed is
  // nil at both ends of each window, so the lean comes and goes with it.)
  if ((T > PLATE + 0.22 && T < DANCE[0]) || (T > EMBRACE && T < PEDAL_ON)) tilt += Math.max(-0.12, Math.min(0.12, 0.1 * speedAt(T)))
  // The dance: a lean towards her in hold, a sway on the two and three (one way, then the other), the push up off each
  // downbeat; as she turns out under his arm he draws himself up and leans after her.
  const inDance = inDanceAt(T)
  if (inDance > 0) {
    tilt += (0.04 + 0.07 * swayAt(T)) * inDance
    const out = turnOutAt(T)
    tilt += 0.05 * out
    sq -= 0.07 * out
    for (const t of DANCE.slice(0, 4)) sq += impulse(T, t, 0.045, 0.16)
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

/** She waits a step ahead of where he steps out to each morning: towards the door. */
const GAP = 0.42
const WAIT = STEP_OUT.map((d) => WHEEL.x + d + GAP)
const ellieIn = spline([
  { t: ENTER, x: -0.14, v: 0.8 },
  { t: 141.6, x: 1.1, v: 0.7 },
  { t: 142.4, x: WAIT[0], v: 0 },
])
/** Where she waits, moving up a little with each morning as his steps shorten. */
function waitAt(T: number): number {
  let x = WAIT[0]
  for (let j = 1; j < 5; j++) x += (WAIT[j] - WAIT[j - 1]) * smooth(T, TURNS[j] - 0.2, TURNS[j] + 0.5)
  return x
}
/** Her knotting of each tie: a small draw back, a roll in to touch him on the downbeat, and back to her place. */
const TAP = HALF + R + 0.005 - GAP
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
const TIED_AT = OUT_LAST + HALF + R + 0.005
const ellieToLever = spline([
  { t: BOW_ON, x: TIED_AT, v: 0.3 },
  { t: LEVER, x: 1.82, v: 0.15 },
])
const ellieToDance = spline([
  { t: LEVER, x: 1.82, v: 0.15 },
  { t: 155.2, x: 2.9, v: 0.8 },
  { t: DANCE[0], x: P0 + HOLD_GAP, v: 0 },
])
const ellieToDoor = spline([
  { t: EMBRACE, x: M1 + EMBRACE_GAP, v: 0 },
  { t: EMBRACE + 0.35, x: M1 + EMBRACE_GAP + 0.02, v: 0.08 },
  { t: LAMP + 0.1, x: 7.1, v: 0.6 },
  { t: PEDAL_ON, x: 7.9, v: 0.25 },
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

/**
 * Her place in the dance: at his right, rising with him on each downbeat, leaning into the sway opposite his (towards
 * him when he leans to her), a little taller on the rise.
 */
function ellieDancing(T: number): Companion {
  const inDance = inDanceAt(T)
  return {
    x: pairAt(T) + gapAt(T),
    y: -RISE_ELLIE * riseAt(T),
    stretch: 1 - 0.05 * riseAt(T) * inDance - 0.03 * inDance,
    angle: -0.09 * swayAt(T) * inDance,
  }
}

function ellieAt(T: number): Companion {
  if (T < 142.4) return { x: ellieIn(T), y: 0 }
  if (T < BOW_ON) {
    let x = waitAt(T)
    for (const Tc of CINCH) x += cinchOff(T, Tc)
    return { x, y: 0 }
  }
  if (T < LEVER) return { x: ellieToLever(T), y: 0 }
  if (T < DANCE[0]) return { x: ellieToDance(T), y: 0 }
  if (T < EMBRACE) return ellieDancing(T)
  if (T < DOOR_OPEN) return { x: ellieToDoor(T), y: 0 }
  if (T < STAMP2) return { x: ellieAtDoor(T), y: 0 }
  const dt = Math.min(T, SHUT) - STAMP2
  return { x: ELLIE_WAIT + 0.5 * WALK_A * dt * dt, y: 0 }
}

/* ------------------------------------------------------------------ the light through the door */

/**
 * The patch of low sun the front door's glass (four panes) throws on the hall's far wall, behind them. It jumps a
 * step on every downbeat of the mornings: the first dawn (bar 38), then each tie's morning and that day's evening,
 * spring, summer, autumn, winter, and a pale last spring. Evening lies lower and longer, reaching back to the wheel.
 */
interface Light {
  rgb: [number, number, number]
  a: number
  x0: number
  w: number
  top: number
  skew: number
}
const MORN = (rgb: [number, number, number], a: number, dx = 0): Light => ({ rgb, a, x0: 1.72 + dx, w: 0.6, top: -1.22, skew: 0.32 })
const EVE = (rgb: [number, number, number], a: number): Light => ({ rgb, a, x0: 1.36, w: 0.92, top: -0.98, skew: 0.72 })
const LIGHTS: { t: number; l: Light }[] = [
  { t: -Infinity, l: MORN([255, 242, 216], 0.26, 0.08) },
  { t: TURNS[0], l: MORN([255, 240, 190], 0.44) },
  { t: CINCH[0], l: EVE([255, 186, 132], 0.32) },
  { t: TURNS[1], l: MORN([255, 246, 200], 0.5, -0.04) },
  { t: CINCH[1], l: EVE([255, 170, 112], 0.34) },
  { t: TURNS[2], l: MORN([255, 210, 140], 0.44, 0.04) },
  { t: CINCH[2], l: EVE([238, 150, 104], 0.3) },
  { t: TURNS[3], l: MORN([220, 232, 252], 0.46, 0.02) },
  { t: CINCH[3], l: EVE([196, 186, 214], 0.3) },
  { t: TURNS[4], l: MORN([250, 238, 214], 0.38) },
  { t: CINCH[4], l: EVE([240, 188, 150], 0.28) },
]
/** The patch is there while the mornings are (from the hall's first sight to the sun wedge of the dance). */
const lightEnv = (T: number): number => smooth(T, ENTER - 0.3, ENTER + 0.9) * (1 - smooth(T, 153.7, 154.9))

function drawLightPatch(p: p5, k: number, l: Light, a: number): void {
  if (a <= 0.002) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const H = 0.8
  const gap = 0.05
  const pw = (l.w - gap) / 2
  const ph = (H - gap) / 2
  const [r, g, b] = l.rgb
  ctx.save()
  // Three layers, each a little larger and fainter: a soft edge, a penumbra, not a cut.
  for (const [grow, f] of [
    [0.05, 0.22],
    [0.024, 0.3],
    [0, 0.48],
  ] as [number, number][]) {
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a * f})`
    ctx.beginPath()
    for (let cx = 0; cx < 2; cx++) {
      for (let cy = 0; cy < 2; cy++) {
        const y0 = l.top + cy * (ph + gap) - grow
        const y1 = y0 + ph + 2 * grow
        const sx = (y: number) => -l.skew * ((y - l.top) / H)
        const x0 = l.x0 + cx * (pw + gap) - grow
        const x1 = x0 + pw + 2 * grow
        ctx.moveTo((x0 + sx(y0)) * k, y0 * k)
        ctx.lineTo((x1 + sx(y0)) * k, y0 * k)
        ctx.lineTo((x1 + sx(y1)) * k, y1 * k)
        ctx.lineTo((x0 + sx(y1)) * k, y1 * k)
        ctx.closePath()
      }
    }
    ctx.fill()
  }
  ctx.restore()
}

function drawDoorLight(p: p5, k: number, T: number): void {
  const env = lightEnv(T)
  if (env <= 0.002) return
  let n = 0
  while (n + 1 < LIGHTS.length && T >= LIGHTS[n + 1].t - 0.02) n++
  // Each step is quick, on its downbeat: the last light going as the new one comes.
  const s = n === 0 ? 1 : smooth(T, LIGHTS[n].t - 0.02, LIGHTS[n].t + 0.1)
  if (n > 0 && s < 1) drawLightPatch(p, k, LIGHTS[n - 1].l, LIGHTS[n - 1].l.a * env * (1 - s))
  drawLightPatch(p, k, LIGHTS[n].l, LIGHTS[n].l.a * env * s)
}

/** The warm pool they dance in: on the wall behind them, following them down the hall. */
function drawPool(p: p5, k: number, x: number, a: number): void {
  if (a <= 0.002) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  ctx.rect((x - 2.2) * k, -2.6 * k, 4.4 * k, (2.6 + FLOOR) * k)
  ctx.clip()
  ctx.translate(x * k, -0.4 * k)
  ctx.scale(1, 0.72)
  const r = 1.9 * k
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
  g.addColorStop(0, `rgba(255, 227, 166, ${0.4 * a})`)
  g.addColorStop(0.4, `rgba(255, 227, 166, ${0.24 * a})`)
  g.addColorStop(1, 'rgba(255, 227, 166, 0)')
  ctx.fillStyle = g
  ctx.fillRect(-r, -r, 2 * r, 2 * r)
  ctx.restore()
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
      drawDoorLight(p, k, T)
      drawSunWedge(p, k, sunAt(T), 5.6 - 1.4 * smooth(T, 158.6, 161.4))
      drawPool(p, k, pairAt(T) + 0.2, poolAt(T))
      drawPainting(p, k, weight, age)
      const [cx] = carlAt(T)
      drawWheelFrame(p, k, weight, wheelTurn(T), pawlAt(T), plateY(T, cx), age)
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
      // While he stands under the wheel, the collar at the bottom sits on him.
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
        // Its tie is his from the clip letting go until it takes it back the next morning (the bow tie for good).
        const j = i - 1
        const worn = j >= 0 && T >= RELEASE[j] && T < RETURN[j] && (j < 4 || BOW_STAYS)
        const open = i === 0 ? 0.6 : j >= 0 ? smooth(T, RELEASE[j], RELEASE[j] + 0.1) * (1 - smooth(T, RETURN[j] - 0.08, RETURN[j])) : 0
        drawHanger(p, k, weight, pin, clip, open, age)
        if (i === 0 || worn) continue
        const set = seated(j, T)
        const angle = -psi * (1 - w) + (top.tilt + set.angle) * w
        const snug = 1 - w * (1 - set.snug)
        drawTieNo(p, k, weight, j, clip[0], clip[1], angle, snug)
      }
      // The tie he is wearing, out at the door with her (the bow tie until the cast takes it over).
      for (let j = 0; j < 5; j++) {
        if (T < RELEASE[j] || T >= RETURN[j]) continue
        if (j === 4 && (!BOW_STAYS || T > SHUT || (BOW_IN_CAST && T >= BOW_FROM))) continue
        const set = seated(j, T)
        drawTieNo(p, k, weight, j, top.x, top.y, top.tilt + set.angle, set.snug)
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
    const breaks = [ENTER, TAKEOFF, PLATE, PLATE + 0.22, ...OUT_FROM, ...OUT_TO, ...BACK_FROM, ...BACK_ON, LEAVE, ...DANCE, PEDAL_ON, BASKET_IN, ...HOPS.flatMap((h) => [h - HOP_T, h]), SHUT]
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
    /**
     * The frame's middle as low as it may sit with `cells` and still keep his whole square (and her ball beside him)
     * inside the Zoom frame (1.5× closer, about the same middle), with a little to spare: the lower the middle, the
     * more of the wall above them is in the picture, the wheel's top, her painting.
     */
    const low = (cells: number): number => -(cells / 3 - HALF - 0.06)
    const key = (t: number, cells: number, x: number, y = low(cells)): PartShot => ({ t, cells, hold: [x, y], w: 1 })
    return [
      // The mornings: the whole wheel, its top and its drop rod, with the two of them under it and the light behind
      // them, closing in a little as the years go and opening again for the bow tie.
      key(TURNS[0], 2.8, 1.0),
      key(TURNS[1], 2.72, 1.05),
      key(TURNS[2], 2.66, 1.08),
      key(TURNS[3], 2.62, 1.08),
      key(TURNS[4], 2.68, 1.08),
      // Off to the gramophone after her, the wheel left behind.
      key(153.5, 2.76, 1.9),
      key(155.1, 2.92, 3.25),
      // The dance, on the loudest bars of the cue. On its first downbeat the gramophone is whole in the left third,
      // its record turning, the two of them coming into the middle of the frame; a slow crane up and out as they waltz
      // down the hall, until on the turn out (bar 53) the whole of it is in: the gramophone, the floor, the desk and
      // her painting; then in again onto the embrace, the desk and the painting whole at the right.
      key(DANCE[0], 3.1, 4.3),
      key(DANCE[2] + 0.2, 3.5, 4.93),
      key(EMBRACE, 3.3, 5.9),
      // The painting, lit: a long look, him small under it.
      key(LAMP + 0.45, 3.45, 7.15),
      // On the machine, the basket and him, her at the door, the painting whole over them all the way to the cut, so
      // the two tickets are seen leaving the slot and dropping into the basket under it; then out after her on the
      // follow-through, into the cut.
      key(163.6, 3.4, 7.5),
      key(166.95, 3.3, 7.9),
      // The cut: framed as `CUTS.climb` says.
      { t: SHUT, cells: CUTS.climb.cells, hold: [cut[0] + CUTS.climb.frame[0], cut[1] + CUTS.climb.frame[1]], w: 1 },
    ]
  },
)
