import type p5 from 'p5'
import { R, type Pt } from '../../../../../parts'
import { mix, rgba } from '../cast'
import { drawSuitTurned } from '../chamber/set'
import { ENTRY_V, ENTER, IAN_ENTER } from '../chamber/plan'
import { box, carried, frame, hash, part, scenery, type PartShot } from '../kit'
import { SEAM, nearestBeat } from '../music'
import { LIFT, SLOT_W } from '../valley/geo'
import { SHELL, VALLEY } from '../worlds'

/**
 * The shaft (129.556 → 135.442): up out of the lift into the shell, the film's most physical moment. The deck comes up
 * against its stops in the mouth of a tall dark tunnel, the two of them in their suits on it, a white far up. On the
 * beat (130.519) she pushes off, and gravity turns under her: its pull swings round from down the shaft to the wall on
 * her right, over a second, and she floats up and across in the curve a throw takes in a turning pull, onto that wall,
 * which is now the floor (131.506). The camera turns after gravity like a heavy body on a spring, lagging it and
 * settling, so the tall tunnel lies down into a long corridor with the white at its end. Ian lets go of the rail as she
 * lands and drops onto the wall a beat after her (132.447). Then the two of them roll along it toward the light, over
 * two ribs on the beats (133.544, 134.542), and out at her speed into the chamber, where the glass wakes.
 *
 * World cells (the shaft's), y down: she rests on the deck at (0, 0). Its walls stand at XL and XR; up the shaft is -y.
 */

const b = (t: number): number => nearestBeat(t)

/**
 * The lift as the valley leaves it at the top of its travel, and the slot it came up into: the same deck, the same
 * gates standing at its ends, the same walls, so at the cut only gravity is about to change. The valley has her on the
 * deck 0.45 right of its middle, Ian 0.42 left of her.
 */
const DECK_C = -0.45
const DECK = { x0: DECK_C - LIFT.half, x1: DECK_C + LIFT.half, thick: LIFT.thick, gate: LIFT.ramp, gateW: 0.075 }
/** The walls' faces, and where her middle is on the right one once it is the floor. */
export const XL = DECK_C - SLOT_W / 2
export const XR = DECK_C + SLOT_W / 2
const WALL = XR - R

export const S = {
  /** The deck comes up against its stops: the cut. */
  in: SEAM.shaft,
  /** She pushes off the deck, and gravity starts to turn. */
  off: b(130.519),
  /** Onto the wall, now the floor. */
  lands: b(131.506),
  /** Ian lets go of the rail; he lands a beat later. */
  ianOff: b(131.506),
  ianLands: b(132.447),
  /** Over the two ribs, on the beats. */
  rib1: b(133.544),
  rib2: b(134.542),
  /** Out, into the chamber, as the glass wakes. */
  out: SEAM.contact,
}

/* ------------------------------------------------------------------ gravity */

/** The shell's pull: gentle (a third of the valley's), so they float. */
const GS = 3
const TURN_FOR = 1.1
const s5 = (u: number): number => {
  const v = Math.max(0, Math.min(1, u))
  return v * v * v * (v * (v * 6 - 15) + 10)
}
/** How far gravity has turned, 0 (down the shaft) to 1 (toward the right wall). */
export const turned = (t: number): number => s5((t - S.off) / TURN_FOR)
const pull = (t: number): Pt => {
  const a = (Math.PI / 2) * turned(t)
  return [GS * Math.sin(a), GS * Math.cos(a)]
}

/**
 * The camera's roll: a quarter turn, clockwise, after gravity, as a heavy body on a damped spring follows it: slow to
 * start, lagging it through the turn, carried a few degrees past square, and settling. Its last fraction of a degree is
 * faded out, so it is exactly a quarter turn by `ROLL_DONE`.
 */
const ROLL_W = 3.9
const ROLL_ZETA = 0.7
const ROLL_DT = 1 / 1000
const ROLL_FOR = 3.4
const ROLL_DONE = S.off + ROLL_FOR
const ROLL: number[] = (() => {
  const out: number[] = []
  let a = 0
  let v = 0
  for (let i = 0; i * ROLL_DT <= ROLL_FOR + ROLL_DT; i++) {
    out.push(a)
    const target = (Math.PI / 2) * turned(S.off + (i + 0.5) * ROLL_DT)
    v += (ROLL_W * ROLL_W * (target - a) - 2 * ROLL_ZETA * ROLL_W * v) * ROLL_DT
    a += v * ROLL_DT
  }
  return out
})()
/** The roll at show time `t`, radians, clockwise on the screen: 0 until she pushes off, a quarter turn from ROLL_DONE. */
export function rollAt(t: number): number {
  if (t <= S.off) return 0
  if (t >= ROLL_DONE) return Math.PI / 2
  const i = Math.min(ROLL.length - 1, Math.floor((t - S.off) / ROLL_DT))
  const fade = s5((t - (ROLL_DONE - 0.6)) / 0.6)
  return ROLL[i] + (Math.PI / 2 - ROLL[i]) * fade
}

/* ------------------------------------------------------------------ their paths */

/** A flight under the turning pull from `p` with velocity `v` at `t0`: where it is at each millisecond after. */
function fly(p: Pt, v: Pt, t0: number, until: (q: Pt, s: number) => boolean): { at: Pt[]; v: Pt; t: number } {
  const dt = 1 / 1000
  let [x, y] = p
  let [vx, vy] = v
  const at: Pt[] = [[x, y]]
  let t = t0
  for (let i = 0; i < 4000; i++) {
    const [gx, gy] = pull(t + dt / 2)
    vx += gx * dt
    vy += gy * dt
    x += vx * dt
    y += vy * dt
    t += dt
    at.push([x, y])
    if (until([x, y], t)) break
  }
  return { at, v: [vx, vy], t }
}

/** How fast she goes up off the deck as she pushes off (cells a second, up the shaft). */
const HOP_UP = 3.1
/** How she leaves the deck: across at whatever speed puts her on the wall on the beat. */
const herFlight = (() => {
  let lo = -1
  let hi = 3
  let best = fly([0, 0], [0, -HOP_UP], S.off, (q) => q[0] >= WALL)
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    best = fly([0, 0], [mid, -HOP_UP], S.off, (q) => q[0] >= WALL)
    if (best.t > S.lands) lo = mid
    else hi = mid
  }
  if (best.at.some(([, y]) => y > 1e-6)) console.warn('palindrome: the shaft\'s flight goes through the deck')
  return best
})()
const sampled = (path: Pt[], t0: number, t: number): Pt => {
  const i = (t - t0) * 1000
  const j = Math.max(0, Math.min(path.length - 2, Math.floor(i)))
  const f = Math.max(0, Math.min(1, i - j))
  return [path[j][0] + (path[j + 1][0] - path[j][0]) * f, path[j][1] + (path[j + 1][1] - path[j][1]) * f]
}

/** A cubic from (y0, v0) at 0 to (y1, v1) at `d`: where it is `u` seconds in. */
function hermite(u: number, d: number, y0: number, v0: number, y1: number, v1: number): number {
  const s = Math.max(0, Math.min(1, u / d))
  const s2 = s * s
  const s3 = s2 * s
  return (2 * s3 - 3 * s2 + 1) * y0 + (s3 - 2 * s2 + s) * d * v0 + (-2 * s3 + 3 * s2) * y1 + (s3 - s2) * d * v1
}
/** Off the wall again a little on landing, and back: a damped hop of `v` cells a second away from it. */
const bounce = (u: number, v: number): number => {
  const air = (2 * v) / GS
  if (u < 0 || u > air) return 0
  return v * u - (GS * u * u) / 2
}

/** Where she leaves the shaft (the chamber has her come in at ENTER at ENTRY_V), and Ian half a step behind her. */
const LAND_Y = herFlight.at[herFlight.at.length - 1][1]
/** On the wall she drifts on with what speed she landed with, dying away by ROLL_FROM; then one even pick-up. */
const ROLL_FROM = S.lands + 0.35
const DRIFT_Y = LAND_Y + (herFlight.v[1] * (ROLL_FROM - S.lands)) / 2
export const OUT_Y = DRIFT_Y - (ENTRY_V * (S.out - ROLL_FROM)) / 2
const IAN_GAP = ENTER - IAN_ENTER
/** The white at the shaft's end: as far ahead of her at the cut as the glass is in the chamber. */
export const END_Y = OUT_Y - (7 - ENTER)

/** Her height over the wall-floor as she goes over a rib: a low hop, its top on the beat. */
const RIB_H = 0.075
const RIB_HOP = 0.4
const over = (t: number, at: number): number => {
  const u = (t - at) / (RIB_HOP / 2)
  return Math.abs(u) >= 1 ? 0 : (RIB_H + 0.04) * (1 - u * u)
}

/** Louise in the shaft at show time `t` (world cells). */
export function louiseAt(t: number): Pt {
  if (t <= S.off) {
    // The deck's stop: a small give under her as it comes up against them, and back.
    const u = t - S.in
    const give = u > 0 && u < 0.5 ? 0.025 * Math.sin((u / 0.5) * Math.PI) * Math.exp(-u / 0.2) : 0
    return [0, give]
  }
  if (t < S.lands) return sampled(herFlight.at, S.off, t)
  const u = t - S.lands
  // Along the wall toward the light, at ENTRY_V by the cut.
  const y =
    t < ROLL_FROM
      ? LAND_Y + herFlight.v[1] * u * (1 - u / (2 * (ROLL_FROM - S.lands)))
      : DRIFT_Y - (ENTRY_V * (t - ROLL_FROM) ** 2) / (2 * (S.out - ROLL_FROM))
  const x = WALL - bounce(u, 0.3 * herFlight.v[0]) - over(t, S.rib1) - over(t, S.rib2)
  return [x, y]
}

/** Ian: holding the gate on the deck until she has landed, then over it and onto the wall, and after her. */
const IAN0: Pt = [-0.42, 0]
const IAN_PUSH = -1.2
const ianFlight = (() => {
  let lo = -1
  let hi = 2
  let best = fly(IAN0, [0, IAN_PUSH], S.ianOff, (q) => q[0] >= WALL)
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    best = fly(IAN0, [mid, IAN_PUSH], S.ianOff, (q) => q[0] >= WALL)
    if (best.t > S.ianLands) lo = mid
    else hi = mid
  }
  return best
})()
const IAN_LAND_Y = ianFlight.at[ianFlight.at.length - 1][1]
/** Ian along the wall, before the ribs: to half a step behind her at the cut, at her speed. */
const ianAlong = (t: number): number =>
  hermite(t - S.ianLands, S.out - S.ianLands, IAN_LAND_Y, ianFlight.v[1] * 0.4, OUT_Y + IAN_GAP, -ENTRY_V)
export function ianAt(t: number): Pt {
  if (t <= S.ianOff) return [IAN0[0], louiseAt(Math.min(t, S.off))[1]]
  if (t < S.ianLands) return sampled(ianFlight.at, S.ianOff, t)
  const u = t - S.ianLands
  let x = WALL - bounce(u, 0.3 * ianFlight.v[0])
  for (const at of IAN_RIBS) x -= over(t, at)
  return [x, ianAlong(t)]
}

/** How far each suit's foot is turned toward the right wall: hers with gravity; his once he lets go. */
const herTurn = (t: number): number => (Math.PI / 2) * turned(t)
const hisTurn = (t: number): number => (t < S.ianOff ? 0 : (Math.PI / 2) * s5((t - S.ianOff) / 0.5))

/* ------------------------------------------------------------------ the ribs and the dust */

/**
 * The ribs across the shaft: the two she goes over on the beats, and more on up the run beyond where she leaves it
 * (none between, so she never rolls through one).
 */
const RIBS: number[] = (() => {
  const a = louiseAt(S.rib1)[1]
  const b2 = louiseAt(S.rib2)[1]
  const out = [a, b2]
  for (let y = OUT_Y - 0.55; y > END_Y + 0.4; y -= 1.25) out.push(y)
  return out
})()
/** When Ian goes over the two she went over: where his run along the wall crosses each. */
const IAN_RIBS: number[] = RIBS.slice(0, 2).map((ry) => {
  let lo = S.ianLands
  let hi = S.out
  if (ianAlong(hi) > ry) return Infinity
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (ianAlong(mid) > ry) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
})

/** Specks of dust in the shaft's dark: they settle with gravity, and turn with it, a little behind it. */
const MOTES = Array.from({ length: 46 }, (_, i) => ({
  x: XL + 0.1 + (XR - XL - 0.2) * hash(i, 1, 71),
  y: -0.4 - 11 * hash(i, 2, 71),
  r: 0.008 + 0.014 * hash(i, 3, 71),
  a: 0.15 + 0.35 * hash(i, 4, 71),
  v: 0.05 + 0.07 * hash(i, 5, 71),
}))

/* ------------------------------------------------------------------ the drawing */

type Ctx = CanvasRenderingContext2D
const smooth = (t: number, a: number, b2: number): number => {
  const u = Math.max(0, Math.min(1, (t - a) / (b2 - a)))
  return u * u * (3 - 2 * u)
}

/** How bright the white at the end is: faint from the start, gathering as they come toward it. */
const whiteAt = (t: number): number => 0.35 + 0.65 * smooth(t, S.lands, S.out)

function drawShaft(p: p5, k: number, t: number): void {
  const ctx = p.drawingContext as Ctx
  const f = frame(p, k)
  const px = (v: number) => v * k
  ctx.save()
  // The shell's stone round the shaft (the grey of its belly the lift came up through, darkening).
  ctx.fillStyle = mix(SHELL.dark, SHELL.wall, 0.55)
  ctx.fillRect(px(f.x0 - 1), px(f.y0 - 1), px(f.x1 - f.x0 + 2), px(f.y1 - f.y0 + 2))
  const y0 = Math.max(f.y0 - 1, END_Y - 6)
  const y1 = f.y1 + 1
  const white = whiteAt(t)
  // The shaft itself: a little lighter than the stone, lit from its far end and, faintly, from the belly below.
  const g = ctx.createLinearGradient(0, px(END_Y), 0, px(4))
  g.addColorStop(0, mix(SHELL.wallLit, SHELL.glow, 0.25 * white))
  g.addColorStop(0.18, mix(SHELL.wall, SHELL.wallLit, 0.55 * white))
  g.addColorStop(0.55, SHELL.wall)
  g.addColorStop(0.86, mix(SHELL.dark, SHELL.wall, 0.7))
  g.addColorStop(1, mix(SHELL.wall, VALLEY.sky, 0.18))
  ctx.fillStyle = g
  ctx.fillRect(px(XL), px(y0), px(XR - XL), px(y1 - y0))
  // Broad soft bands along the stone, as in the chamber.
  for (let i = 0; i < 9; i++) {
    const by = END_Y + i * 1.6 + 0.5 * hash(i, 2, 31)
    if (by < y0 - 1 || by > y1 + 1) continue
    const bw = 0.4 + 0.7 * hash(i, 4, 31)
    const band = ctx.createLinearGradient(0, px(by - bw), 0, px(by + bw))
    const c = hash(i, 8, 31) > 0.5 ? SHELL.wallLit : SHELL.dark
    band.addColorStop(0, rgba(c, 0))
    band.addColorStop(0.5, rgba(c, 0.05 + 0.04 * hash(i, 6, 31)))
    band.addColorStop(1, rgba(c, 0))
    ctx.fillStyle = band
    ctx.fillRect(px(XL), px(by - bw), px(XR - XL), px(2 * bw))
  }
  // The white at the end: the chamber's light, filling the shaft's mouth and reaching down it.
  if (y0 < END_Y + 5) {
    const w = ctx.createLinearGradient(0, px(END_Y - 0.6), 0, px(END_Y + 4.2))
    w.addColorStop(0, rgba(SHELL.glow, 0.95 * white))
    w.addColorStop(0.12, rgba(SHELL.glow, 0.6 * white))
    w.addColorStop(0.45, rgba(SHELL.fogLit, 0.14 * white))
    w.addColorStop(1, rgba(SHELL.fogLit, 0))
    ctx.fillStyle = w
    ctx.fillRect(px(XL), px(END_Y - 6), px(XR - XL), px(10.2))
    // Past the end, the white is all there is.
    ctx.fillStyle = rgba(SHELL.glow, 0.95 * white)
    ctx.fillRect(px(XL - 0.6), px(END_Y - 8), px(XR - XL + 1.2), px(7.6))
    // The light spilling out round the mouth onto the stone.
    const spill = ctx.createRadialGradient(0, px(END_Y), 0, 0, px(END_Y), px(3.2))
    spill.addColorStop(0, rgba(SHELL.glow, 0.35 * white))
    spill.addColorStop(1, rgba(SHELL.glow, 0))
    ctx.fillStyle = spill
    ctx.fillRect(px(-3.4), px(END_Y - 3.2), px(6.8), px(6.4))
  }
  // The walls' faces, caught by the light nearer the end.
  for (const [x, s] of [[XL, -1], [XR, 1]] as const) {
    const edge = ctx.createLinearGradient(0, px(END_Y), 0, px(3))
    edge.addColorStop(0, rgba(SHELL.mist, 0.55 * white))
    edge.addColorStop(0.4, rgba(SHELL.wallLit, 0.5))
    edge.addColorStop(1, rgba(SHELL.wallLit, 0.25))
    ctx.fillStyle = edge
    ctx.fillRect(px(s > 0 ? x : x - 0.035), px(y0), px(0.035), px(y1 - y0))
  }
  // The ribs: low rounded ledges across both walls, their edges catching the light from the end.
  for (const ry of RIBS) {
    if (ry < y0 - 0.5 || ry > y1 + 0.5) continue
    const lit = 0.3 + 0.55 * Math.exp(-(ry - END_Y) / 4) * white
    for (const s of [-1, 1] as const) {
      const face = s > 0 ? XR : XL
      const x = s > 0 ? face - RIB_H : face
      ctx.fillStyle = mix(SHELL.wall, SHELL.wallLit, 0.7)
      ctx.beginPath()
      ctx.roundRect(px(x), px(ry - 0.09), px(RIB_H + 0.02), px(0.18), px(0.04))
      ctx.fill()
      ctx.fillStyle = rgba(SHELL.mist, lit)
      ctx.beginPath()
      ctx.roundRect(px(s > 0 ? x : x + RIB_H - 0.014), px(ry - 0.08), px(0.016), px(0.16), px(0.008))
      ctx.fill()
    }
  }
  // The top of the lift at the shaft's foot, as the valley drew it: the deck, its gates standing at its ends, the top
  // stage of the scissor under it going down into the dark.
  if (y1 > -1.2) {
    const steel = mix(VALLEY.steel, SHELL.dark, 0.3)
    const steelDark = mix(VALLEY.steelDark, SHELL.dark, 0.3)
    const top = R
    const hs = 1.131
    const w = 1.527
    ctx.lineCap = 'round'
    ctx.lineWidth = Math.max(1, px(0.085))
    for (const [a, c, col] of [[1, -1, steelDark], [-1, 1, steel]] as const) {
      ctx.strokeStyle = col
      ctx.beginPath()
      ctx.moveTo(px(DECK_C + (a * w) / 2), px(top + DECK.thick + hs))
      ctx.lineTo(px(DECK_C + (c * w) / 2), px(top + DECK.thick))
      ctx.stroke()
    }
    for (const xj of [DECK_C - w / 2, DECK_C + w / 2]) {
      ctx.fillStyle = mix(steelDark, SHELL.dark, 0.5)
      ctx.beginPath()
      ctx.arc(px(xj), px(top + DECK.thick + hs), Math.max(1.2, px(0.07)), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = mix(steelDark, SHELL.dark, 0.25)
    ctx.fillRect(px(DECK.x0), px(top), px(DECK.x1 - DECK.x0), px(DECK.thick))
    ctx.fillStyle = mix(steel, SHELL.glow, 0.18)
    ctx.fillRect(px(DECK.x0), px(top), px(DECK.x1 - DECK.x0), px(0.04))
    for (const [x, s] of [[DECK.x0, 1], [DECK.x1, -1]] as const) {
      ctx.fillStyle = steel
      ctx.fillRect(px(s > 0 ? x : x - DECK.gateW), px(top - DECK.gate), px(DECK.gateW), px(DECK.gate))
      ctx.fillStyle = steelDark
      ctx.fillRect(px(x - 0.045), px(top - 0.045), px(0.09), px(0.09))
    }
    // The stops it has come up against, in the walls.
    const jolt = Math.exp(-Math.max(0, t - S.in) / 0.25) * (t >= S.in ? 1 : 0)
    ctx.fillStyle = mix(SHELL.wallLit, SHELL.mist, 0.3 + 0.5 * jolt)
    ctx.fillRect(px(XL), px(top - 0.02), px(0.09), px(0.06))
    ctx.fillRect(px(XR - 0.09), px(top - 0.02), px(0.09), px(0.06))
  }
  ctx.restore()
}

/** Over the balls: their suits, the dust, the puffs where they land. */
function drawShaftOver(p: p5, k: number, t: number): void {
  const ctx = p.drawingContext as Ctx
  const px = (v: number) => v * k
  const f = frame(p, k)
  ctx.save()
  // Where they land, a breath of dust off the wall.
  for (const [at, who] of [[S.lands, louiseAt], [S.ianLands, ianAt]] as const) {
    const u = t - at
    if (u < 0 || u > 1.2) continue
    const [x, y] = who(at)
    const r = 0.12 + 0.35 * Math.sqrt(u / 1.2)
    const a = 0.32 * (1 - u / 1.2)
    const g = ctx.createRadialGradient(px(XR), px(y), 0, px(XR), px(y), px(r))
    g.addColorStop(0, rgba(SHELL.mist, a))
    g.addColorStop(1, rgba(SHELL.mist, 0))
    ctx.fillStyle = g
    ctx.fillRect(px(x - r), px(y - r), px(XR - x + r), px(2 * r))
  }
  // The suits, their feet where gravity has them.
  const light = (y: number) => 0.45 + 0.55 * whiteAt(t) * Math.exp(-(y - END_Y) / 6)
  const [lx, ly] = louiseAt(t)
  const [ix, iy] = ianAt(t)
  drawSuitTurned(p, k, ix, iy, light(iy), hisTurn(t))
  drawSuitTurned(p, k, lx, ly, light(ly), herTurn(t))
  // The dust, settling with gravity a little behind it.
  const lag = turned(t - 0.6)
  for (const m of MOTES) {
    const run = Math.max(0, t - S.in) * m.v
    // Down the shaft onto the deck, or across onto the wall become the floor: where it lands it lies.
    const x = Math.min(XR - m.r, m.x + run * Math.sin((Math.PI / 2) * lag) * 1.6)
    const y = Math.min(R - m.r, m.y + run * Math.cos((Math.PI / 2) * lag) * 0.5)
    if (y < f.y0 - 0.2 || y > f.y1 + 0.2 || x < f.x0 - 0.2 || x > f.x1 + 0.2) continue
    ctx.fillStyle = rgba(SHELL.mist, m.a * (0.5 + 0.5 * whiteAt(t)))
    ctx.beginPath()
    ctx.arc(px(x), px(y), px(m.r), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/** Every cell the shaft claims. */
export const SHAFT_CELLS = box(-4, END_Y - 5, 4, 4, 1)

export const shaftSet = scenery<null>({
  name: 'shaft-set',
  draw: (p, _s, c) => drawShaft(p, c.k, c.t),
  over: (p, _s, c) => drawShaftOver(p, c.k, c.t),
})

/* ------------------------------------------------------------------ the part */

/** The part's origin: she comes in at (-0.5, 0) from it, at rest on the deck at (0, 0). */
export const SHAFT_AT: Pt = [0.5, 0]

/** Where the camera is from her on the screen (cells: right, down), and how close, at `t`. */
const SCREEN_OFF = (t: number): Pt => {
  const u = smooth(t, S.in + 0.4, S.lands)
  return [0.85 + 0.1 * u, -0.7 - 0.05 * u]
}
const turn = (v: Pt, a: number): Pt => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)]
/** Her place smoothed over a short window that leans behind: the camera is carried after her, not pinned to her. */
const eased = (t: number): Pt => {
  let x = 0
  let y = 0
  let w = 0
  for (let j = -10; j <= 4; j++) {
    const s = Math.max(S.in, Math.min(S.out, t + j * 0.05))
    const q = 1 - Math.abs(j + 3) / 9
    const [a, c] = louiseAt(s)
    x += a * q
    y += c * q
    w += q
  }
  return [x / w, y / w]
}
/** The camera's centre in the shaft's cells at `t`: from her, by the screen offset turned back by the roll. */
export function shaftCamera(t: number): Pt {
  const [ex, ey] = eased(t)
  const [ox, oy] = turn(SCREEN_OFF(t), -rollAt(t))
  return [ex + ox, ey + oy]
}

export const shaft = part<null>(
  { name: 'shaft', draw: () => {} },
  (slot) => {
    const o = SHAFT_AT
    const n = Math.ceil((slot.end - slot.begin) * 90)
    const segs = carried((t) => {
      const [x, y] = louiseAt(t)
      return [x - o[0], y - o[1]]
    }, slot.begin, slot.end, n)
    const end = segs[segs.length - 1].to
    return {
      cells: box(-4 - o[0], END_Y - 2, 4 - o[0], 2, 1),
      exit: [end[0] + 0.5, end[1]] as Pt,
      lane: { segs, fire: S.off - slot.begin },
      state: null,
      company: [
        {
          who: 'ian',
          from: slot.begin,
          to: slot.end,
          at: (t) => {
            const [x, y] = ianAt(t)
            return { x: x - o[0], y: y - o[1] }
          },
        },
      ],
    }
  },
  (slot) => {
    const o = SHAFT_AT
    const keys: PartShot[] = []
    // Held after the cut, then carried after her through the turn and along the wall, a key every fifth of a second.
    for (let t = slot.begin + 0.6; t < slot.end - 1e-6; t += 0.2) {
      const [x, y] = shaftCamera(t)
      keys.push({ t, cells: 4.2 - 0.3 * smooth(t, S.in + 0.5, S.lands), hold: [x - o[0], y - o[1]] })
    }
    const [x, y] = shaftCamera(slot.end)
    keys.push({ t: slot.end, cells: 3.9, hold: [x - o[0], y - o[1]] })
    return keys
  },
)

/** Every strike in the shaft: the deck's stops, her push off, her landing and his, the two ribs. */
export const SHAFT_HITS: number[] = [S.in, S.off, S.lands, S.ianLands, S.rib1, S.rib2]
