import { laneAt, type Lane, type Pt, type Seg } from '../../../../../parts'
import { box, carried, part, type Companion, type PartShot, type Pose } from '../kit'
import { beatsIn } from '../music'
import { drawRoom } from './jar-draw'
import { HOME_BY, walkHome } from './yard'
import { drawStormOver, type Figure } from './jar-storm'
import {
  BEGIN, BOARDS, C_OFF, CLIMB, COCKED, DOWN, END, E_OFF, FALL, FELL, FIXED, FLASH1, FLASH2, FOOT, HIS, HUBCAP, KICK, LAMP_OUT,
  COUNTS, LANDS, ONTO_PLANK, PERCH, POURS, PUSH1, PUSH2, SEAT, SETTLE, SLAMS, SUN, T1, T2, THUNDER, TO_HIM, TOPPLE, TOUCH, TREE, TYRE,
  UP1, UP2, WINCH, AGAINST, TOUCHDOWN, SKIP, plankAt, ring, smoothstep, standing,
} from './jar-clock'

/**
 * JAR: the living room, and the Paradise Falls jar (103.288 to 140.655, jar bars 3 to 36). The jar builder's.
 *
 * They come in from the yard with the book's falls still in their eyes. Ellie runs ahead and leaps onto the
 * stepladder by the fireplace (bar 5), her seat for watching; Carl hops onto his end of the seesaw in front of the
 * fireplace, and the house's savings machine starts on the waltz: on every downbeat he lands on his end, the other end
 * whips up out of the coin box, and a handful of coins goes up over the room and drops into the slot of the jar on
 * the mantle on the next downbeat, the brass rising behind her painting. The counterweight lifts him back up between.
 *
 * Then life breaks it open, three times, each on the music's big onsets:
 * - the tyre (bar 11's third beat, after a held breath): through the left-hand window their car drops on its rear,
 *   the hubcap flies. Ellie climbs up to the mantle, rolls to the jar and pushes it over on its hinge (bar 15); the
 *   coins pour off the mantle and skitter away; outside the car stands level again.
 * - the leg: his next strokes shake the lamp out (bar 17); he climbs the ladder for it, the ladder kicks, and he
 *   falls (bar 19). She comes down to him, and a bandage wraps round his foot where she touches him. Up she goes
 *   again (bars 21, 22) and gives the jar over (bar 23). He limps back to his seesaw.
 * - the tree: a storm gathers in the windows; lightning; the garden tree's great limb comes down through the roof
 *   into the nursery (`TREE_AT`), and the blow throws the jar over by itself, pouring what they had put back (the
 *   thunder, bar 27). Nobody chooses it this time.
 * The limb is winched out and three boards are nailed over the hole (bars 33 to 35). They let the jar be: a few coins
 * in it, the dust starting. She rolls down his plank ahead of him, he walks down after her, and they go on to the
 * hall, older (AGE 0.12 to 0.35), into the ties.
 *
 * The part's frame: its entry cell is half a cell ahead of where Carl comes in (INSIDE (-0.46, 0), just inside the back
 * door, on his walk home); everything here is placed in INSIDE cells and moved by ENTRY.
 */

/** Unused: this part carries on from the one before it in the house's one long take (the score chains it). */
export const JAR_AT: Pt = [0, 0]

/** When the tree comes through the roof over the nursery (the house's front is patched from then on). */
export const TREE_AT = TREE

/** This part's entry cell, in the house's INSIDE cells. */
const ENTRY: Pt = [walkHome(BEGIN) + 0.5, 0]
const L = (q: Pt): Pt => [q[0] - ENTRY[0], q[1] - ENTRY[1]]
const G = 12

/** A path built piece by piece in INSIDE cells and show time: runs with ramps, hops, holds, rides on what moves. */
class Path {
  segs: Seg[] = []
  constructor(public p: Pt, public t: number, public v = 0) {}
  private add(seg: Seg, to: Pt, at: number): void {
    this.segs.push(seg)
    this.p = to
    this.t = at
  }
  hold(until: number): this {
    if (until > this.t + 1e-9) this.add({ from: L(this.p), to: L(this.p), dur: until - this.t }, this.p, until)
    this.v = 0
    return this
  }
  /** A level run to `x1` arriving at `at`: from the speed it has, through a peak, to `vEnd`. */
  glide(x1: number, at: number, vEnd = 0, split = 0.45): this {
    const T = at - this.t
    const dist = Math.abs(x1 - this.p[0])
    const dir = Math.sign(x1 - this.p[0]) || 1
    const T1 = T * split
    const T2 = T - T1
    const v = (2 * dist - T1 * this.v - T2 * vEnd) / T
    if (v < 0 || this.v + v <= 0 || v + vEnd <= 0) console.warn(`married life: jar: a glide to ${x1} by ${at.toFixed(3)} cannot be run (peak ${v.toFixed(2)})`)
    const y = this.p[1]
    const xm = this.p[0] + (dir * T1 * (this.v + v)) / 2
    this.add({ from: L(this.p), to: L([xm, y]), dur: T1, ramp: [this.v, v] }, [xm, y], this.t + T1)
    this.add({ from: L([xm, y]), to: L([x1, y]), dur: T2, ramp: [v, vEnd] }, [x1, y], at)
    this.v = vEnd
    return this
  }
  /** A level run at speeds given: from `v0` to `v1` over `dur` seconds. */
  run(v0: number, v1: number, dur: number): this {
    const x1 = this.p[0] + (dur * (v0 + v1)) / 2
    this.add({ from: L(this.p), to: L([x1, this.p[1]]), dur, ramp: [v0, v1] }, [x1, this.p[1]], this.t + dur)
    this.v = v1
    return this
  }
  /** A flight to `to`, landing at `at` (the parabola gravity draws), or a smaller hop with `arc` given. */
  hop(to: Pt, at: number, arc?: number): this {
    const T = at - this.t
    this.v = Math.abs(to[0] - this.p[0]) / T
    this.add({ from: L(this.p), to: L(to), dur: T, arc: arc ?? (G * T * T) / 8 }, to, at)
    return this
  }
  /** A small bob in place, landing at `at`. */
  bob(at: number, dur: number, lift: number): this {
    return this.hold(at - dur).hop(this.p, at, lift)
  }
  /** Carried by something that moves (sampled from the same function its drawing reads). */
  ride(fn: (t: number) => Pt, until: number, perSec = 40): this {
    const n = Math.max(1, Math.ceil((until - this.t) * perSec))
    this.segs.push(...carried((t) => L(fn(t)), this.t, until, n))
    this.p = fn(until)
    this.t = until
    this.v = 0
    return this
  }
}

/* ------------------------------------------------------------------ Carl */

const ON: Pt = standing(HIS, COCKED)
/**
 * Every hop onto his end (the first up from its foot, and each in place between strokes, once the counterweight has
 * lifted him back) takes off on beat 3 of the bar before its stroke, the waltz's pickup, where the music lifts him,
 * and lands TOUCHDOWN before the stroke's downbeat. `LIFT[i]` is the takeoff before `SLAMS[i]`.
 */
const LIFT: number[] = SLAMS.map((down) => {
  const three = beatsIn(down - 0.6, down).filter((b) => b.pos === 3)
  if (!three.length) throw new Error(`married life: jar: no pickup before the stroke at ${down}`)
  return three[three.length - 1].t
})
/** The hop up onto his end from where he stands at its foot: how fast it carries him across, so the run into it matches. */
const ontoV = (i: number): number => (ON[0] - FOOT[0]) / (SLAMS[i] - TOUCHDOWN - LIFT[i])
const onPlank = (t: number): Pt => standing(HIS, plankAt(t))
/** Walking down his plank, over its axle, to its low end (in the coin box's lee), at the end. */
const DOWN_PLANK: [number, number] = [131.1, 133.5]
const OFF_PLANK: Pt = [6.75, 0]
const walkDown = (t: number): Pt => standing(HIS + (0.5 - HIS) * smoothstep((t - DOWN_PLANK[0]) / (DOWN_PLANK[1] - DOWN_PLANK[0])), COCKED)
/** Out to the hall at the end: from rest by his plank to the doorway, moving on at the seam's pace. */
const OUT_FROM = 134.3
const SEAM_V = 0.8
/** How fast his limp reaches the plank's foot. */
const LIMP_V = 0.7

function carlPath(): Path {
  // In from the yard at the walk he came home at (yard.ts `walkHome`, one walk across the seam), onto his end: the
  // first stroke on bar 7.
  if (Math.abs(HOME_BY - LIFT[0]) > 1e-6) throw new Error('married life: jar: the walk home ends off the first takeoff')
  const c = new Path([walkHome(BEGIN), 0], BEGIN)
  c.ride((t) => [walkHome(t), 0], LIFT[0], 60).hop(ON, SLAMS[0] - TOUCHDOWN)
  for (let i = 1; i <= 3; i++) c.ride(onPlank, LIFT[i]).hop(ON, SLAMS[i] - TOUCHDOWN)
  // Down off it, pleased, as the fourth handful lands.
  c.ride(onPlank, DOWN - 0.366).hop(FOOT, DOWN)
  // The tyre: he goes to the window to look, and back to his seesaw.
  c.hold(TYRE + 0.45).glide(3.2, 114.5, 0).hold(115.7).glide(FOOT[0], LIFT[4], ontoV(4)).hop(ON, SLAMS[4] - TOUCHDOWN)
  c.ride(onPlank, LIFT[5]).hop(ON, SLAMS[5] - TOUCHDOWN)
  // The lamp goes out: up the ladder, a reach, the kick, the fall.
  c.ride(onPlank, CLIMB[0] - 0.36).hop(T1, CLIMB[0]).hop(T2, CLIMB[1]).hold(KICK).hop(FELL, FALL)
  // Hurt, bandaged; he limps back to his machine and strokes twice more, lower now.
  // (A limp does not break into a run: he comes to the foot at a walk and the hop's own spring carries him across.)
  c.hold(123.1).glide(FOOT[0], LIFT[6], LIMP_V, 0.5).hop(ON, SLAMS[6] - TOUCHDOWN)
  c.ride(onPlank, LIFT[7]).hop(ON, SLAMS[7] - TOUCHDOWN, 0.12)
  // The storm. Then down his plank after her, off its end, and out.
  c.ride(onPlank, DOWN_PLANK[0]).ride(walkDown, DOWN_PLANK[1]).hop(OFF_PLANK, C_OFF).hold(OUT_FROM)
  const T = END - OUT_FROM
  const exitX = 13.05
  const Tc = T - 3.6
  const v = (exitX - OFF_PLANK[0] - SEAM_V * 0.8) / (1.0 + Tc + 0.8)
  c.run(0, v, 2.0).run(v, v, Tc).run(v, SEAM_V, 1.6)
  return c
}

/* ------------------------------------------------------------------ Ellie */

function elliePath(carlX: (t: number) => number): Path {
  const e = new Path([0.66, 0], BEGIN, SEAM_V)
  // She runs ahead and leaps onto the ladder's first tread: her seat to watch from.
  const leap = 0.65
  const Tr = PERCH - leap - BEGIN
  const vt = (T1[0] - 0.66 - Tr * (SEAM_V / 2)) / (leap + Tr / 2)
  e.run(SEAM_V, vt, Tr).hop(T1, PERCH)
  e.bob(SETTLE, 0.3, 0.05)
  // Her job while he works the plank: she counts each handful in, up off her tread as it drops into the slot and down
  // on the two (`COUNTS`), each hop a little higher than the last as the brass climbs.
  for (let i = 0; i < 4; i++) e.bob(COUNTS[i], COUNTS[i] - LANDS[i], 0.1 + 0.025 * i)
  // The tyre: a start; then up to the jar and over with it.
  e.hold(TYRE).hop(T1, HUBCAP, 0.08)
  e.hold(113.85).hop(T2, UP1[0]).hold(114.7).hop(SEAT, UP1[1])
  e.hold(115.45).glide(AGAINST[0], PUSH1, 0.3).glide(AGAINST[0] + 0.07, PUSH1 + 0.3, 0)
  e.hold(116.9).glide(SEAT[0], 118.0, 0)
  // He falls: down to him; she touches him; the bandage. Then up again, and she gives the jar over a second time.
  e.hold(120.85).hop([3.6, 0], TO_HIM).glide(FELL[0] + 0.37, TOUCH, 0)
  // (The last leap, onto the mantle, is quicker and flatter than the first: the camera is drawing back from the
  // bandage then, and holds the two of them whole.)
  e.hold(122.55).hop(T1, UP2[0]).hop(T2, UP2[1]).hold(123.62).hop(SEAT, UP2[2], 0.22)
  e.hold(124.25).glide(AGAINST[0], PUSH2, 0.3).glide(AGAINST[0] + 0.07, PUSH2 + 0.3, 0)
  e.hold(125.7).glide(SEAT[0], 126.8, 0)
  // The tree: a start. Then down onto his plank, ahead of him, down it, off it, and on with him to the hall.
  e.hold(TREE).hop(SEAT, TOPPLE, 0.1)
  const dE = (t: number) => -0.35 + 0.85 * smoothstep((t - 131.0) / (E_OFF - 0.55 - 131.0))
  e.hold(130.25).hop(standing(-0.35, COCKED), ONTO_PLANK).hold(131.0).ride((t) => standing(dE(t), COCKED), E_OFF - 0.55)
  e.hop([6.9, 0], E_OFF).glide(7.2, E_OFF + 0.4, 0).hold(OUT_FROM)
  // A skip, as they reach the door: her spirit back.
  const skip = (t: number) => { const u = (t - (SKIP - 0.36)) / 0.36; return u > 0 && u < 1 ? -0.5 * 4 * u * (1 - u) * 0.22 : 0 }
  e.ride((t) => [carlX(t) + 0.36 + 0.09 * (1 - smoothstep((t - OUT_FROM) / 2.5)), skip(t)], END, 40)
  return e
}

/* ------------------------------------------------------------------ how he holds himself */

/** Times he is standing on his plank (and leans with it), from landing to leaving. */
const ON_PLANK: [number, number][] = [
  [SLAMS[0] - TOUCHDOWN, DOWN - 0.366],
  [SLAMS[4] - TOUCHDOWN, CLIMB[0] - 0.36],
  [SLAMS[6] - TOUCHDOWN, DOWN_PLANK[1]],
]

function tiltAt(t: number): number {
  let tilt = 0
  for (const [a, b] of ON_PLANK) {
    // Onto it and off it, he comes to its slope and leaves it through the air, not at a snap.
    const w = smoothstep((t - (a - 0.2)) / 0.2) * (1 - smoothstep((t - b) / 0.2))
    tilt += plankAt(t) * w
  }
  // He looks out at the car; he turns to watch her give the jar over.
  tilt += -0.1 * smoothstep((t - TYRE - 0.1) / 0.5) * (1 - smoothstep((t - 115.0) / 0.6))
  tilt += 0.07 * smoothstep((t - 115.9) / 0.4) * (1 - smoothstep((t - 116.9) / 0.5))
  // The fall: he tumbles, lands askew, and rights himself slowly.
  if (t >= KICK) {
    const u = smoothstep((t - KICK) / (FALL - KICK))
    const flail = -0.55 * Math.sin(Math.PI * Math.min(1, (t - KICK) / (FALL - KICK)))
    const askew = -0.16 * u * (1 - smoothstep((t - FALL - 0.4) / 1.6))
    tilt += t < FALL ? flail * 0.9 + askew : askew
  }
  // The limp back to the seesaw, and the last of it on the way out.
  if (t > 123.1 && t < LIFT[6]) tilt += 0.07 * Math.sin((2 * Math.PI * (t - 123.1)) / 0.75) * smoothstep((t - 123.1) / 0.4) * (1 - smoothstep((t - (LIFT[6] - 0.4)) / 0.4))
  if (t > OUT_FROM && t < SUN + 0.8) tilt += 0.04 * Math.sin((2 * Math.PI * (t - OUT_FROM)) / 0.7) * (1 - smoothstep((t - OUT_FROM) / (SUN + 0.8 - OUT_FROM)))
  // The blow shakes him where he stands.
  tilt += 0.08 * ring(t - TREE, 0.25, 18)
  return tilt
}

/** Every takeoff: he crouches a moment before it (what makes a hop read as meant). */
const TAKEOFFS: number[] = [...LIFT, DOWN - 0.366, CLIMB[0] - 0.36, KICK, DOWN_PLANK[1]]

function squashAt(t: number): number {
  let s = 0
  const land = (at: number, a: number, tau = 0.07) => { if (t >= at) s = Math.max(s, a * Math.exp(-(t - at) / tau)) }
  for (const at of SLAMS) land(at, 0.13)
  land(DOWN, 0.1)
  land(CLIMB[0], 0.06)
  land(CLIMB[1], 0.06)
  land(C_OFF, 0.09)
  for (const at of TAKEOFFS) if (t < at && t > at - 0.16) s = Math.max(s, 0.08 * Math.sin((Math.PI * (t - (at - 0.16))) / 0.16))
  // The fall: flattened, and slow to come back up.
  if (t >= FALL) s = Math.max(s, 0.3 * Math.exp(-(t - FALL) / 0.08) + 0.12 * (1 - smoothstep((t - FALL - 0.3) / 1.6)))
  land(TREE, 0.08, 0.1)
  return s
}

/* ------------------------------------------------------------------ the part */

interface JarState {
  begin: number
  carl: Lane
}

function figure(s: JarState, T: number): Figure | null {
  if (T < s.begin - 0.5 || T > END + 0.01) return null
  const at = laneAt(s.carl, T - s.begin)
  return { x: at.x + ENTRY[0], y: at.y + ENTRY[1], tilt: tiltAt(T), squash: squashAt(T) }
}

export const jar = part<JarState>(
  {
    name: 'jar',
    draw: (p, s, c) => {
      p.push()
      p.translate(-ENTRY[0] * c.k, -ENTRY[1] * c.k)
      drawRoom(p, c, c.t + s.begin)
      p.pop()
    },
    over: (p, s, c) => {
      const T = c.t + s.begin
      p.push()
      p.translate(-ENTRY[0] * c.k, -ENTRY[1] * c.k)
      drawStormOver(p, c, T, T >= BEGIN && T < END ? figure(s, T) : null)
      p.pop()
    },
  },
  (slot) => {
    const carl = carlPath()
    const lane: Lane = { segs: carl.segs, fire: SLAMS[0] - slot.begin }
    const carlX = (t: number) => laneAt(lane, t - slot.begin).x + ENTRY[0]
    const ellie = elliePath(carlX)
    const her: Lane = { segs: ellie.segs, fire: 0 }
    const pose: Pose[] = [{ from: slot.begin, to: slot.end, at: (t) => ({ tilt: tiltAt(t), squash: squashAt(t) }) }]
    return {
      cells: box(-1.7 - ENTRY[0], -13, 15.3 - ENTRY[0], 1),
      exit: [13.55 - ENTRY[0], 0],
      lane,
      state: { begin: slot.begin, carl: lane },
      company: [{ from: slot.begin, to: slot.end, at: (t): Companion => { const at = laneAt(her, t - slot.begin); return { x: at.x, y: at.y } } }],
      pose,
    }
  },
  () => shots(),
)

/**
 * The camera: a step in on each handful; then a few long moves, each landed before its event. Left and out to the
 * room between the car and the jar before the tyre goes; one move right onto the cradle, the chute and his machine
 * for the pour, held there through the refill and the lamp; one push in as he climbs and falls, landed close on her
 * touch; then one long draw back (never faster than 0.25 of a log step a second until the storm gathers) past the
 * second pour to the whole house, so the limb breaks through the roof inside the frame and the roof is patched in
 * it; and in again to follow them into the hall. Both stay whole inside the Zoom frame throughout (two thirds of the height,
 * 16:9, from the middle): with Carl on the floor at y 0 that keeps the middle within cells / 3 - 0.13 of it, and
 * while Ellie is on the mantle (y -1.48) or in the air over it, the frame can come no closer than about 2.8 cells
 * (3.4 at the top of her hops up onto it).
 */
/**
 * The storm's pull-out as keys along one curve: the zoom's pace in log cells a second picks up from the draw-back's
 * (DRAW_BACK) as she reaches the jar (STORM_FROM), eases up to an even cruise, and eases down to rest at STORM_WIDE on
 * STORM_IN, running on into the slight drift after; across, even in the zoom's progress; the frame's middle rising
 * with the cells it opens (nearly linear in cells), which keeps Carl on his plank (y -0.48) inside the Zoom frame all
 * the way out, and at the widest puts the crown's top (y -14.45) inside the frame. It is as long as the storm allows,
 * landing just before the limb starts down (TREE - 0.22), and a cruise rather than a bell, so its fastest (about 0.55
 * log/s) is no faster than the gust needs. Sampled finely, so the director's monotone cubic through them is the curve.
 */
const DRAW_BACK = { t: 123.9, cells: 2.97, at: [3.9, -0.82] as Pt, pace: 0.196 }
const STORM_FROM = 124.9
const STORM_IN = 128.55
const STORM_WIDE = { cells: 17.2, at: [10.4, -5.95] as Pt }
/** Where the draw-back has the frame at `t`: on its way to the pour's framing (3.85 cells at (5.2, -1.05) on PUSH2). */
function drawBackAt(t: number): { cells: number; at: Pt } {
  const f = (t - DRAW_BACK.t) / (PUSH2 - DRAW_BACK.t)
  const [x, y] = DRAW_BACK.at
  return { cells: DRAW_BACK.cells * Math.exp(DRAW_BACK.pace * (t - DRAW_BACK.t)), at: [x + (5.2 - x) * f, y + (-1.05 - y) * f] }
}
function stormOut(k: (t: number, cells: number, hold: Pt) => PartShot): PartShot[] {
  const { cells: c0, at: [x0, y0] } = drawBackAt(STORM_FROM)
  const { cells: c1, at: [x1, y1] } = STORM_WIDE
  const T = STORM_IN - STORM_FROM
  const L0 = Math.log(c0)
  const L1 = Math.log(c1)
  // The pace: from the draw-back's, a raised-cosine ease up over UP s to the cruise, and one down over DOWN s to the
  // drift's. The cruise is what makes the whole come out at L1.
  const v0 = DRAW_BACK.pace
  const v1 = Math.log(17.4 / c1) / (130.4 - STORM_IN)
  const UP = 0.7
  const DOWN = 1.15
  const vp = (L1 - L0 - (UP * v0) / 2 - (DOWN * v1) / 2) / (T - UP / 2 - DOWN / 2)
  /** Log cells gone `x` s into an ease from pace `a` to `b` over `len` s. */
  const ease = (a: number, b: number, len: number, x: number) => ((a + b) / 2) * x + ((a - b) / 2) * (len / Math.PI) * Math.sin((Math.PI * x) / len)
  const logAt = (tau: number): number => {
    if (tau <= UP) return L0 + ease(v0, vp, UP, tau)
    const cruise = L0 + ease(v0, vp, UP, UP) + vp * (tau - UP)
    return tau <= T - DOWN ? cruise : cruise - vp * (tau - (T - DOWN)) + ease(vp, v1, DOWN, tau - (T - DOWN))
  }
  const out: PartShot[] = []
  const n = 28
  for (let i = 0; i <= n; i++) {
    const tau = (T * i) / n
    const L = i === n ? L1 : logAt(tau)
    const c = Math.exp(L)
    const s = (L - L0) / (L1 - L0)
    // (A little behind the cells: his last stroke, 127.431, drops his end of the plank as the frame opens.)
    const up = ((c - c0) / (c1 - c0)) ** 1.15
    out.push(k(STORM_FROM + tau, c, [x0 + (x1 - x0) * s, y0 + (y1 - y0) * up]))
  }
  return out
}

function shots(): PartShot[] {
  const k = (t: number, cells: number, hold: Pt, w = 1): PartShot => ({ t, cells, hold: L(hold), w })
  /** A step in that lands on `at` and rests there a moment (the frame settles with the coins, then moves on). */
  const step = (at: number, cells: number, hold: Pt): PartShot[] => [k(at, cells, hold), k(at + 0.27, cells, hold)]
  return [
    // In with him to the machine, the yard's move carried on at his pace, landed before the first stroke. Then a step
    // in on each handful as it drops into the slot, pushing off as the next flies: his plank, the jar filling a notch
    // at a time, and her on the ladder counting them in. The slot stays in the top of the frame; the coins' apex may
    // leave it.
    k(104.4, 4.1, [1.4, -1.0]),
    k(105.5, 4.05, [3.0, -1.02]),
    k(106.5, 3.8, [4.35, -1.02]),
    k(107.35, 3.65, [5.2, -1.03]),
    k(SLAMS[0] + 0.13, 3.65, [5.2, -1.03]),
    ...step(LANDS[0], 3.45, [5.3, -0.99]),
    ...step(LANDS[1], 3.25, [5.4, -0.93]),
    ...step(LANDS[2], 3.1, [5.45, -0.88]),
    // The tyre: one move left and out from the third handful (the fourth still lands in the frame) to the whole room
    // between the car in the window and the jar on the mantle, landed before the blow, so the tyre goes in a still
    // frame with what it will cost in it; then a slow drift right with her up the ladder (the top of her hop onto the
    // mantle wants 3.4 cells), gathering into one move onto the cradle, the chute and his machine as she pushes. The
    // frame stays there through the pour and the refill's two strokes while the car drives off at the other edge.
    k(LANDS[3], 3.32, [4.66, -0.9]),
    k(112.5, 3.5, [4.25, -0.95]),
    k(115.1, 3.56, [4.5, -1.0]),
    k(PUSH1 - 0.1, 4.0, [5.42, -1.1]),
    // The lamp: the refill's second stroke shakes it and it sputters out, whole in the frame's top with its cord going
    // up out of it; the frame looks up with him as he climbs to it (as low as Zoom lets it go while he is still on
    // the plank), and holds the lamp over him on the ladder's top as the ladder kicks, so it is the lamp he falls
    // reaching for.
    k(LAMP_OUT, 3.92, [5.1, -1.18]),
    k(KICK, 3.7, [4.35, -1.3]),
    // In, all the way, as he falls and she comes down to him: landed close on her touch, a drift while the bandage
    // wraps. (At 120.2 he is at the top of his fall, and at 121.0 she is at the top of her hop down off the mantle:
    // no closer than 2.8 there.)
    k(FALL, 3.1, [3.75, -0.85]),
    k(TOUCH, 2.38, [3.07, -0.62]),
    // Then one long move out toward the storm: gently at first, faster as she climbs the ladder and leaps to the
    // mantle (she stays whole in Zoom: 2.5 cells as she reaches the tread, 2.95 at the top of her leap), past the
    // cradle as she gives the jar over again, gathering into the storm's reveal.
    k(UP2[0], 2.5, [3.25, -0.66]),
    k(DRAW_BACK.t, DRAW_BACK.cells, DRAW_BACK.at),
    // The storm gathers: as she reaches the jar, one move out and up past the nursery to the whole house, its roof and the
    // garden tree's whole crown over the ridge, landed before the limb comes down (TREE), so the limb, the jar thrown
    // over by the blow and the thunder all fall in a still frame; a slight drift; then in again as the cradle rights and
    // the limb is winched out, the nursery's ceiling well inside the frame while the hole is boarded.
    ...stormOut(k),
    k(130.4, 17.4, [10.45, -6.0]),
    k(131.7, 12.0, [9.05, -3.9]),
    k(133.3, 10.0, [8.6, -3.1]),
    k(135.3, 9.2, [9.3, -2.85]),
    // The sun: in again to the two of them, on their way to the hall.
    k(137.3, 5.8, [10.9, -1.6], 0.75),
    { t: END, cells: 5.6, off: [0.9, -1.1], w: 0 },
  ]
}

/** Every strike of this part, in show seconds (check:shows holds each to the music). */
export const JAR_HITS: number[] = [
  PERCH, SETTLE, ...LIFT, ...SLAMS, ...LANDS, ...COUNTS, DOWN, TYRE, HUBCAP, ...UP1, PUSH1, POURS[0].stop, FIXED, LAMP_OUT, ...CLIMB, KICK, FALL,
  TO_HIM, TOUCH, ...UP2, PUSH2, POURS[1].stop, FLASH1, TREE, TOPPLE, THUNDER, ONTO_PLANK, FLASH2, E_OFF, C_OFF, WINCH, ...BOARDS, SUN, SKIP,
]
  .filter((t, i, all) => all.findIndex((u) => Math.abs(u - t) < 1e-6) === i)
  .sort((a, b) => a - b)
