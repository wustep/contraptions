import { R, laneAt, mixHex, type Lane, type Pt, type Seg } from '../../../../../parts'
import type { ShowBall } from '../../../../../show'
import { tear } from '../cast'
import { box, carried, frame, part, scenery, type Company, type PartShot, type Riders, type Slot } from '../kit'
import { FIRST, SEAMS } from '../seams'
import { beat, half } from '../music'
import { G } from '../physics'
import { DOWN, FISCHER_DOWN, FISCHER_UP, ORIGIN, UP, exitFor, local } from '../stack'
import { KID_DARK, KID_ID, KID_SCALE, LIMBO, SLEEP } from '../worlds'
import {
  A_KICK_AT,
  BOTTOM,
  BREAK_X,
  CABIN,
  CABIN_DOOR_X,
  EDGE_X,
  FALL_G,
  FIRST_AT,
  F_KICK_AT,
  GARDEN_VIEW,
  HIS,
  KICK_AT,
  KIDS_AT,
  MAL_P_FROM,
  MAL_R_FROM,
  MAL_R_TO,
  ON_ROOF,
  P,
  Q,
  RUN_UP,
  RUN_V,
  SEA,
  SPOTS,
  TOP_OF_SKY,
  WAIT_X,
  ariadneAt,
  cabinY,
  fischerAt,
  kickPath,
  lerp,
  malPrologue,
  malReturn,
  sandY,
  sm,
  smoother,
} from './limbo-geo'
import { drawCity, drawFarSea, drawGarden, drawGardenAir, drawGround, drawSea, drawSeaOver, drawSky, surface } from './limbo-land'
import { ctxOf, soft, type Pen } from './limbo-pen'
import { drawTowerBack, drawTowerFront } from './limbo-tower'

/**
 * LIMBO (the LIMBO builder's): the dream's bottom. A grey sea at dusk, a pale shore, the tower they built on the column
 * with its lift and the great wheel, their room at the top behind the long lit window, the walled garden of their old
 * house at its foot (the children there, their backs to us), and the city they built out on the far water, calving
 * into it. Two parts:
 *
 * - `shore` (0 → the cut into Paris, the pad): the show's first frame. The waves, one on each chord, wash him up the
 *   sand; he rolls up to the tower, and the lift carries him up as the weight comes down through the room; he sets the
 *   top spinning on the table, and it does not slow. Mal, a still wine shape in the dark behind him, for the last bar.
 * - `limbo` (the peak: out of the dark into limbo's sky → the kick): they fall into the sea; the waves wash him up
 *   where the show began (the circle); up the tower the same way; the room, Mal at the table and the top still
 *   spinning; she stands on the weight and holds on, and he draws the bolt: she goes down into the dark and the same
 *   rope carries him up to the roof. Ariadne pushes Fischer off the edge (the beat before bar 47) and on bar 47 his fall
 *   throws him up; she leaps and he steps off after her, and on the summit's downbeat the fall throws them straight up
 *   out of limbo.
 *
 * Everything is drawn by the set (`limboSet`) from show time: the parts only lay the lanes and the company on it.
 */

/** The prologue's origin: he comes in at (-0.5, 0) from it, face down in the surf at the sea's edge. */
export const SHORE_AT: Pt = [FIRST_AT[0] + 0.5, FIRST_AT[1]]
export const LIMBO_CELLS: Pt[] = box(-70, TOP_OF_SKY, 80, BOTTOM, 3)

/* ------------------------------------------------------------------ the strikes */

export const LIMBO_HITS: number[] = [
  // The prologue: a wave on each chord, the lift (its catch let go; half way up the lamp in their room comes on, and a
  // slab in the city slips on its crack; the bolt at the top), the room's gate, the top, the cut down to the children
  // in the garden (bar 6) and back to the room as the curtain breathes (bar 7).
  P.wave0,
  P.wave1,
  P.gateShut,
  P.liftGo,
  P.crack,
  P.arrive,
  P.gateOpen,
  P.spin,
  P.breath6,
  P.breath7,
  // The return: the city falling on the drums (the tower by the garden breaks on the peak's downbeat and goes in on
  // beat 162; the tower behind the house breaks on 163's eighth and goes in on 165's; the bay's great tower on bar 41,
  // the rest of it breaking on beat 170 and going on bar 43), the plunge, the undertow and the swell, the circle, the
  // lift, the bolt, the hatch, Mal's hold, the cut to the children, the lever and the letting go, the roof, the push,
  // Fischer's kick, the leap, the step, the kick.
  Q.begin,
  beat(162),
  Q.splash,
  half(163),
  Q.under,
  Q.lift,
  Q.circle,
  beat(170),
  Q.gateShut,
  Q.liftGo,
  beat(174),
  Q.arrive,
  Q.gateOpen,
  Q.hatch,
  Q.hold,
  Q.children,
  Q.lever,
  Q.letGo,
  Q.roof,
  Q.push,
  Q.fischerKick,
  Q.ariadneLeap,
  Q.stepOff,
  Q.kick,
  Q.tear,
]

/* ------------------------------------------------------------------ the set */

export const limboSet = scenery<null>({
  name: 'limbo-set',
  draw: (p, _s, c) => {
    const f = frame(p, c.k)
    if (f.y1 < TOP_OF_SKY || f.y0 > BOTTOM) return
    const pen: Pen = { p, k: c.k, ink: c.ink, w: c.weight }
    const t = c.t
    const ctx = ctxOf(p)
    ctx.save()
    ctx.beginPath()
    ctx.rect((f.x0 - 2) * c.k, TOP_OF_SKY * c.k, (f.x1 - f.x0 + 4) * c.k, (BOTTOM - TOP_OF_SKY) * c.k)
    ctx.clip()
    p.push()
    drawSky(pen, t, f)
    drawFarSea(pen, t, f)
    drawCity(pen, t, f)
    drawSea(pen, t, f)
    drawGround(pen, f)
    drawGarden(pen, t, f)
    drawTowerBack(pen, t, f)
    p.pop()
    ctx.restore()
  },
  over: (p, _s, c) => {
    const f = frame(p, c.k)
    if (f.y1 < TOP_OF_SKY || f.y0 > BOTTOM) return
    const pen: Pen = { p, k: c.k, ink: c.ink, w: c.weight }
    const t = c.t
    const ctx = ctxOf(p)
    ctx.save()
    ctx.beginPath()
    ctx.rect((f.x0 - 2) * c.k, TOP_OF_SKY * c.k, (f.x1 - f.x0 + 4) * c.k, (BOTTOM - TOP_OF_SKY) * c.k)
    ctx.clip()
    p.push()
    drawGardenAir(pen, t, f)
    drawSeaOver(pen, t, f)
    drawTowerFront(pen, t, f)
    // Mal in the prologue, out of the lamp's light: a still shape in the dark.
    if (t > MAL_P_FROM && t < P.cut + 0.5) {
      const m = malPrologue(t)
      soft(pen, m[0], m[1], 0.4, 0.4, SLEEP.deep, 0.42)
    }
    drawPlunge(pen, t)
    drawKicks(pen, t)
    p.pop()
    ctx.restore()
  },
})

/** Where they go into the sea: a crown of spray, and the water closing over them. */
function drawPlunge(pen: Pen, t: number): void {
  for (const [x, at] of [
    [DOWN.limbo.at[0], Q.splash],
    [DOWN.limbo.at[0] + DOWN.limbo.ariadne![0], Q.splash + 0.08],
  ] as const) {
    const u = t - at
    if (u < 0 || u > 3) continue
    const y = surface(x, t)
    const rise = 1 - Math.exp(-u / 0.14)
    const fall = u < 0.4 ? 1 : Math.exp(-(u - 0.4) / 0.5)
    for (const side of [-1, 1]) soft(pen, x + side * (0.14 + 0.35 * sm(u / 0.6)), y - 0.55 * rise * fall + 0.3 * Math.max(0, u - 0.5) ** 2, 0.16, 0.34 * fall + 0.05, LIMBO.foam, 0.6 * fall)
    soft(pen, x, y - 0.3 * rise * fall, 0.12, 0.3 * fall + 0.04, LIMBO.foam, 0.5 * fall)
    soft(pen, x, y + 0.02, 0.3 + 0.9 * sm(u / 1.6), 0.08, LIMBO.foam, 0.55 * Math.exp(-u / 0.9))
  }
}

/** The kicks: where the fall turns into the throw, a soft flare in the air; and where they leave limbo's sky, the tear. */
function drawKicks(pen: Pen, t: number): void {
  const flare = (at: Pt, when: number) => {
    const u = t - when
    if (u < 0 || u > 1.2) return
    // A shock in the air, wide and flat, gone at once: not a glow.
    soft(pen, at[0], at[1] + 0.1, 1.2 + 1.8 * sm(u / 0.4), 0.18 + 0.12 * sm(u / 0.4), LIMBO.foam, 0.4 * Math.exp(-u / 0.2))
  }
  flare(KICK_AT, Q.kick)
  flare(A_KICK_AT, Q.kick)
  flare(F_KICK_AT, Q.fischerKick)
  // The tear in the top of the sky, as they go up out of it into the dark.
  const through = (x: number, when: number) => tear(pen.p, pen.k, [x, TOP_OF_SKY + 0.6], t - when, 1.2, LIMBO.foam)
  through(FISCHER_UP.at[0], FISCHER_UP.t - 0.13)
  through(UP.snow.at[0], Q.tear)
  through(UP.snow.at[0] + UP.snow.ariadne![0], Q.tear + 0.02)
}

/* ------------------------------------------------------------------ the children (his memory) */

/** The warm rim the low sun behind them puts round the children, dark against it (home's children have one too). */
const RIM = mixHex(LIMBO.lamp, LIMBO.skyWarm, 0.35)
/** At play, as home's children are before they turn: small shifts of weight, the same two, on the same clock. */
const play = (i: number, t: number): number => (i === 0 ? 0.045 * Math.sin((2 * Math.PI * t) / 4.3 + 0.4) : 0.1 * Math.sin((2 * Math.PI * t) / 3.3 + 2.1))
function kids(origin: Pt): Riders {
  return (t: number, hero: ShowBall) => [
    hero,
    ...KIDS_AT.map(([x, y], i): ShowBall => ({
      id: KID_ID + i,
      x: x + play(i, t) - origin[0],
      y: y - R * KID_SCALE - origin[1],
      color: KID_DARK,
      scale: KID_SCALE,
      spin: null,
      rim: RIM,
    })),
  ]
}

/* ------------------------------------------------------------------ lanes */

/** A ball on the ground at x: the sand, which runs level into the tower's floor. */
const onGround = (x: number): Pt => [x, sandY(x) - R]

/** A roll along the ground from x0 to x1 between t0 and t1, eased in and out (sine). */
const rollOver = (x0: number, x1: number) => (u: number): Pt => onGround(lerp(x0, x1, (1 - Math.cos(Math.PI * u)) / 2))
/** A wave's carry up the sand: pushed hard on the chord, slowing as the wash runs out, lifted a little by the water. */
const carryUp = (x0: number, x1: number) => (u: number): Pt => {
  const x = lerp(x0, x1, 1 - (1 - u) * (1 - u))
  return [x, sandY(x) - R - 0.07 * Math.sin(Math.PI * u)]
}
/** Sample `fn(u)` for u in [0, 1] between slot times a and b as carried pieces. */
const over = (fn: (u: number) => Pt, a: number, b: number, n: number): Seg[] => carried((s) => fn((s - a) / (b - a)), a, b, n)

/** Lanes in world cells, moved into a part's frame. */
const moved = (segs: Seg[], origin: Pt): Seg[] => segs.map((s) => ({ ...s, from: local(origin, s.from), to: local(origin, s.to) }))
const still = (at: Pt, dur: number): Seg => ({ from: at, to: at, dur })
const lastTo = (segs: Seg[]): Pt => segs[segs.length - 1].to

/** The prologue's lane, world cells, in show seconds from 0. */
function shoreLane(): Seg[] {
  const segs: Seg[] = []
  const push = (...s: Seg[]) => segs.push(...s)
  const t = () => segs.reduce((a, s) => a + s.dur, 0)
  push(still(FIRST_AT, P.wave0))
  push(...over(carryUp(FIRST_AT[0], SPOTS.wave0[0]), P.wave0, P.wave0 + 1.6, 16))
  push(still(lastTo(segs), P.wave1 - t()))
  push(...over(carryUp(SPOTS.wave0[0], SPOTS.wave1[0]), P.wave1, P.wave1 + 1.4, 16))
  // He lies a moment as the wash runs back, and then he rolls up the sand, up the step and into the lift.
  const wake = 5.652
  push(still(lastTo(segs), wake - t()))
  push(...over(rollOver(SPOTS.wave1[0], CABIN.x), wake, P.gateShut - 0.18, 18))
  push(still(lastTo(segs), P.liftGo - t()))
  push(...carried((s) => [CABIN.x, cabinY(s) - R], P.liftGo, P.arrive, 36))
  push(still(lastTo(segs), P.gateOpen + 0.25 - t()))
  push(...over((u) => [lerp(CABIN.x, HIS[0], (1 - Math.cos(Math.PI * u)) / 2), HIS[1]], P.gateOpen + 0.25, P.spin - 0.95, 16))
  push(still(HIS, P.spin - 0.5 - t()))
  // Up to the table's edge, and on the chord the top is spinning; back a little, and still.
  const touch: Pt = [HIS[0] + 0.09, HIS[1]]
  push({ from: HIS, to: touch, dur: 0.5, ease: 'in' })
  push({ from: touch, to: HIS, dur: 0.9, ease: 'out' })
  push(still(HIS, P.cut - t()))
  return segs
}

/** The return's lane, world cells, from the crossing (slot time 0 is Q.begin). */
function limboLane(): Seg[] {
  const b = Q.begin
  const segs: Seg[] = []
  const push = (...s: Seg[]) => segs.push(...s)
  const now = () => b + segs.reduce((a, s) => a + s.dur, 0)
  const at = (s: number) => s - b
  // Out of the dark, falling at 5 c/s under a dream's soft gravity, into the sea.
  const T = Q.splash - Q.begin
  const splashAt: Pt = [DOWN.limbo.at[0], SEA]
  push({ from: DOWN.limbo.at, to: splashAt, dur: T, arc: (FALL_G * T * T) / 8 })
  // Under: the water takes the fall from him quickly.
  const vIn = DOWN.limbo.v[1] + FALL_G * T
  const TAU = 0.12
  const sink = (s: number): Pt => [splashAt[0], SEA + vIn * TAU * (1 - Math.exp(-(s - Q.splash) / TAU))]
  push(...carried((s) => sink(s + b), at(Q.splash), at(Q.under), 12))
  const deep = sink(Q.under)
  // The undertow draws them in along the bottom, the swell lifts them, and the breaker brings them to the shore.
  const toShore = (s: number): Pt => {
    const u = (s - Q.under) / (Q.circle - Q.under)
    const x = lerp(deep[0], BREAK_X + 0.05, smoother(u))
    const yUnder = lerp(deep[1], SEA + 0.95, sm((s - Q.under) / 1.2))
    const yFloat = surface(x, s) - 0.02
    return [x, lerp(yUnder, yFloat, smoother((s - Q.lift) / 1.3))]
  }
  push(...carried((s) => toShore(s + b), at(Q.under), at(Q.circle), 36))
  // The circle: the wave washes him up where the show began, and leaves him there as it runs back.
  const crest = toShore(Q.circle)
  const wash = (u: number): Pt => {
    const x = lerp(crest[0], FIRST_AT[0], 1 - (1 - u) * (1 - u))
    return [x, lerp(crest[1], sandY(x) - R, sm(u * 1.4))]
  }
  push(...over(wash, at(Q.circle), at(Q.circle + 0.72), 12))
  push(still(FIRST_AT, Q.circle + 1.0 - now()))
  // Up the beach to the lift, Ariadne ahead of him; up the tower as he went before.
  push(...over(rollOver(FIRST_AT[0], CABIN.x - 0.2), at(Q.circle + 1.0), at(Q.gateShut - 0.1), 24))
  push(still(lastTo(segs), Q.liftGo - now()))
  push(...carried((s) => [CABIN.x - 0.2, cabinY(s + b) - R], at(Q.liftGo), at(Q.arrive), 24))
  // In the room: to the cabin's door when she is out; and there he stays, face to face with Mal.
  push(still(lastTo(segs), 169.4 - now()))
  push({ from: lastTo(segs), to: [CABIN_DOOR_X, lastTo(segs)[1]], dur: 0.8, ease: 'inout' })
  push(still(lastTo(segs), Q.letGo - now()))
  // He lets go: the same rope carries him up to the roof.
  push(...carried((s) => [CABIN_DOOR_X, cabinY(s + b) - R], at(Q.letGo), at(Q.roof), 20))
  push(still(lastTo(segs), Q.roof + 0.55 - now()))
  push(...over((u) => [lerp(CABIN_DOOR_X, WAIT_X, (1 - Math.cos(Math.PI * u)) / 2), ON_ROOF], at(Q.roof + 0.55), at(180.9), 20))
  push(still(lastTo(segs), Q.stepOff - RUN_UP - now()))
  push({ from: [WAIT_X, ON_ROOF], to: [EDGE_X, ON_ROOF], dur: RUN_UP, ramp: [0, RUN_V] })
  // He steps off the edge, and falls.
  const Tf = Q.kick - Q.stepOff
  push({ from: [EDGE_X, ON_ROOF], to: KICK_AT, dur: Tf, arc: (G * Tf * Tf) / 8 })
  // The kick: thrown straight up the column, out of limbo.
  const up = kickPath(KICK_AT[0], KICK_AT[1], Q.kick, UP.snow.at[0], UP.snow.at[1], Q.end, UP.snow.v[1])
  push(...carried((s) => up(s + b), at(Q.kick), at(Q.end), 72))
  return segs
}

/* ------------------------------------------------------------------ the parts */

interface LimboState {
  begin: number
}

/** A world-cell path function, as a companion in a part's frame. */
const companion = (fn: (t: number) => Pt, origin: Pt, extra?: (t: number, at: Pt) => Partial<ShowBall>) => (t: number) => {
  const p = fn(t)
  return { x: p[0] - origin[0], y: p[1] - origin[1], ...(extra ? extra(t, p) : {}) }
}

export const shore = part<LimboState>(
  { name: 'shore', draw: () => {} },
  (slot: Slot) => {
    const O = SHORE_AT
    const world = shoreLane()
    const segs = moved(world, O)
    const end = lastTo(world)
    const lane: Lane = { segs, fire: P.wave0 - slot.begin }
    const cobb = (t: number): Pt => {
      const q = laneAt(lane, t - slot.begin)
      return [q.x + O[0], q.y + O[1]]
    }
    const company: Company[] = [
      {
        who: 'mal',
        from: MAL_P_FROM,
        to: slot.end,
        // She does not roll: she comes down the ladder in the dark and stands too still, her eye on him.
        at: companion(malPrologue, O, (t, m) => {
          const c = cobb(t)
          return { spin: Math.atan2(c[1] - m[1], c[0] - m[0]) }
        }),
      },
    ]
    return {
      cells: box(-4, -12, 8, 2),
      exit: [end[0] - O[0] + 0.5, end[1] - O[1]],
      lane,
      state: { begin: slot.begin },
      riders: kids(O),
      company,
    }
  },
  (slot) => shoreShots(slot),
)

export const limbo = part<LimboState>(
  { name: 'limbo', draw: () => {} },
  (slot: Slot) => {
    const O = ORIGIN.limbo
    const world = limboLane()
    const segs = moved(world, O)
    const lane: Lane = { segs, fire: Q.splash - slot.begin }
    const cobb = (t: number): Pt => {
      const q = laneAt(lane, t - slot.begin)
      return [q.x + O[0], q.y + O[1]]
    }
    const company: Company[] = [
      { who: 'ariadne', from: slot.begin, to: slot.end, at: companion((t) => ariadneAt(t, cobb), O) },
      { who: 'fischer', from: FISCHER_DOWN.t, to: FISCHER_UP.t, at: companion(fischerAt, O) },
      {
        who: 'mal',
        from: MAL_R_FROM,
        to: MAL_R_TO,
        at: companion(malReturn, O, (t, m) => {
          const c = t < slot.begin ? fischerAt(t) : cobb(t)
          return { spin: Math.atan2(c[1] - m[1], c[0] - m[0]) }
        }),
      },
    ]
    return {
      cells: box(-2, -2, 12, 22),
      exit: exitFor(ORIGIN.limbo, ORIGIN.vault),
      lane,
      state: { begin: slot.begin },
      riders: kids(O),
      company,
    }
  },
  (slot) => limboShots(slot),
)

/* ------------------------------------------------------------------ the camera */

const hold = (origin: Pt) => (t: number, cells: number, at: Pt): PartShot => ({ t, cells, hold: local(origin, at), w: 1 })
const plus = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]]

/**
 * The prologue: the show's first frame held on him in the surf through the first two waves; out and up with him as he
 * goes to the tower; the whole tower as the lift carries him up (the weight coming down, the lit window, the garden far
 * below with the children in it); in to the room; close on the top as it spins; out a little for the cut, Mal behind.
 */
function shoreShots(slot: Slot): PartShot[] {
  const h = hold(SHORE_AT)
  const first = plus(FIRST_AT, FIRST.frame)
  return [
    h(3.2, FIRST.cells, first),
    h(5.2, FIRST.cells * 1.04, plus(first, [0.35, -0.05])),
    h(7.5, 6.8, [-2.7, 85.25]),
    h(11.8, 11.6, [-0.8, 81.2]),
    h(13.9, 14.8, [0.9, 79.6]),
    h(P.arrive, 9.5, [-0.4, 77.9]),
    h(18.9, 5.6, [0.1, 77.25]),
    h(21.9, 4.1, [0.1, 77.6]),
    // Bar 6: a cut down to the garden at the tower's foot, the children by the swing, their backs to us; and on bar 7
    // back to the top, spinning, as Mal comes down in the dark behind him.
    { ...h(P.breath6, 3.45, GARDEN_VIEW), cut: true },
    h(P.breath7 - 0.1, 3.2, plus(GARDEN_VIEW, [0.1, 0.05])),
    { ...h(P.breath7, 3.3, [0.05, 77.78]), cut: true },
    h(28.6, 3.1, [0.14, 77.82]),
    h(slot.end, SEAMS.paris.cells, plus(HIS, SEAMS.paris.frame as Pt)),
  ]
}

/**
 * The return: down with them out of the dark into the sky; the great wide (the endless sea, the shore, the tower, the
 * city calving) as they go into the sea; in to the shore and the circle (the show's first frame again); with him to the
 * tower and up it; the room (the top close, then all of them); the choice, holding the two of them; up with him to the
 * roof; the push, Fischer's kick, the step, the fall; and the kick, wide, as they go up out of the frame's top.
 */
function limboShots(_slot: Slot): PartShot[] {
  const O = ORIGIN.limbo
  const h = hold(O)
  return [
    { t: 153.9, cells: 10, off: [4.6, 0.8], w: 0 },
    h(155.9, 18.5, [1.0, 80.6]),
    h(157.4, 15.5, [-1.2, 82.6]),
    h(159.3, 9.5, [-5.8, 85.8]),
    h(Q.circle + 0.72, FIRST.cells, plus(FIRST_AT, FIRST.frame)),
    h(Q.circle + 1.2, FIRST.cells, plus(FIRST_AT, FIRST.frame)),
    h(162.6, 7.0, [-3.4, 85.0]),
    h(164.0, 11, [3.6, 83.0]),
    h(165.8, 11.5, [3.2, 81.9]),
    h(166.9, 7.8, [-0.6, 79.9]),
    h(Q.arrive, 5.4, [-0.6, 77.4]),
    h(169.9, 3.8, [-0.35, 77.75]),
    h(171.3, 4.3, [-0.9, 77.55]),
    h(172.2, 4.0, [-1.05, 77.55]),
    // She holds on; a cut to the children in the garden below, their backs to us; and back as he takes the lever.
    { ...h(Q.children, 3.4, GARDEN_VIEW), cut: true },
    h(Q.lever - 0.1, 3.15, plus(GARDEN_VIEW, [0.1, 0.05])),
    { ...h(Q.lever, 3.8, [-1.1, 77.6]), cut: true },
    h(Q.letGo, 3.7, [-1.12, 77.6]),
    // Up with him as the cage rises, so under Zoom too he stays in the picture.
    h(176.9, 4.4, [-1.3, 76.25]),
    h(177.4, 5.0, [-1.05, 75.55]),
    h(178.3, 7.2, [0.2, 75.45]),
    h(Q.fischerKick + 0.35, 7.5, [0.9, 75.4]),
    // Fischer gone, in close on the two of them at the edge: her leap, and him a beat behind her.
    h(Q.ariadneLeap - 0.2, 4.4, [0.95, 74.35]),
    h(Q.stepOff, 5.8, [1.05, 74.9]),
    h(Q.kick, 7.6, [1.1, 77.0]),
    // The kick: the camera goes up with them, keeping them in the frame's upper third, at their speed into the dark.
    { t: Q.end, cells: 9, off: [0.25, 2.4], w: 0 },
  ]
}

/** The stretches where he is small or out of the Zoom frame (the director adds them to the check). */
export const LIMBO_WIDE: [number, number][] = [
  // The garden cutaways: he is in the room, out of the frame.
  [P.breath6, P.breath7],
  [Q.children, Q.lever],
  // The great wide as they go into the sea.
  [155.4, 158.6],
]

