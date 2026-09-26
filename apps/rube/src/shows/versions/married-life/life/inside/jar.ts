import { laneAt, type Lane, type Pt, type Seg } from '../../../../../parts'
import { box, carried, part, type Companion, type PartShot, type Pose } from '../kit'
import { drawRoom } from './jar-draw'
import { drawStormOver, type Figure } from './jar-storm'
import {
  BEGIN, BOARDS, C_OFF, CLIMB, COCKED, DOWN, END, E_OFF, FALL, FELL, FIXED, FLASH1, FLASH2, FOOT, HIS, HUBCAP, KICK, LAMP_OUT,
  LANDS, ONTO_PLANK, PERCH, POURS, PUSH1, PUSH2, SEAT, SETTLE, SLAMS, SUN, T1, T2, THUNDER, TO_HIM, TOPPLE, TOUCH, TREE, TYRE,
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
 * The part's frame: its entry cell is INSIDE (0.8, 0); everything here is placed in INSIDE cells and moved by ENTRY.
 */

/** Unused: this part carries on from the one before it in the house's one long take (the score chains it). */
export const JAR_AT: Pt = [0, 0]

/** When the tree comes through the roof over the nursery (the house's front is patched from then on). */
export const TREE_AT = TREE

/** This part's entry cell, in the house's INSIDE cells. */
const ENTRY: Pt = [0.8, 0]
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
/** The little hop up onto his end of the plank, from where he stands at its foot. */
const ONTO = 0.5
const ONTO_V = (ON[0] - FOOT[0]) / ONTO
/** The in-place hop between strokes: the counterweight has lifted him back; he hops, and lands on the beat. */
const HOP = 0.36
const onPlank = (t: number): Pt => standing(HIS, plankAt(t))
/** Walking down his plank, over its axle, to its low end (in the coin box's lee), at the end. */
const DOWN_PLANK: [number, number] = [131.1, 133.5]
const OFF_PLANK: Pt = [6.75, 0]
const walkDown = (t: number): Pt => standing(HIS + (0.5 - HIS) * smoothstep((t - DOWN_PLANK[0]) / (DOWN_PLANK[1] - DOWN_PLANK[0])), COCKED)
/** Out to the hall at the end: from rest by his plank to the doorway, moving on at the seam's pace. */
const OUT_FROM = 134.3
const SEAM_V = 0.8

function carlPath(): Path {
  const c = new Path([0.3, 0], BEGIN, SEAM_V)
  // In from the yard, onto his end: the first stroke on bar 7.
  c.glide(FOOT[0], SLAMS[0] - TOUCHDOWN - ONTO, ONTO_V).hop(ON, SLAMS[0] - TOUCHDOWN)
  for (let i = 1; i <= 3; i++) c.ride(onPlank, SLAMS[i] - TOUCHDOWN - HOP).hop(ON, SLAMS[i] - TOUCHDOWN)
  // Down off it, pleased, as the fourth handful lands.
  c.ride(onPlank, DOWN - 0.366).hop(FOOT, DOWN)
  // The tyre: he goes to the window to look, and back to his seesaw.
  c.hold(TYRE + 0.45).glide(3.2, 114.5, 0).hold(115.7).glide(FOOT[0], SLAMS[4] - TOUCHDOWN - ONTO, ONTO_V).hop(ON, SLAMS[4] - TOUCHDOWN)
  c.ride(onPlank, SLAMS[5] - TOUCHDOWN - HOP).hop(ON, SLAMS[5] - TOUCHDOWN)
  // The lamp goes out: up the ladder, a reach, the kick, the fall.
  c.ride(onPlank, CLIMB[0] - 0.36).hop(T1, CLIMB[0]).hop(T2, CLIMB[1]).hold(KICK).hop(FELL, FALL)
  // Hurt, bandaged; he limps back to his machine and strokes twice more, lower now.
  c.hold(123.1).glide(FOOT[0], SLAMS[6] - TOUCHDOWN - ONTO, ONTO_V, 0.5).hop(ON, SLAMS[6] - TOUCHDOWN)
  c.ride(onPlank, SLAMS[7] - TOUCHDOWN - HOP).hop(ON, SLAMS[7] - TOUCHDOWN, 0.12)
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
  // Her job while he works the plank: she counts each handful in, a hop on her tread as it drops into the slot, each
  // a little higher than the last as the brass climbs.
  for (let i = 0; i < 4; i++) e.bob(LANDS[i], 0.36, 0.1 + 0.025 * i)
  // The tyre: a start; then up to the jar and over with it.
  e.hold(TYRE).hop(T1, HUBCAP, 0.08)
  e.hold(113.85).hop(T2, UP1[0]).hold(114.7).hop(SEAT, UP1[1])
  e.hold(115.45).glide(AGAINST[0], PUSH1, 0.3).glide(AGAINST[0] + 0.07, PUSH1 + 0.3, 0)
  e.hold(116.9).glide(SEAT[0], 118.0, 0)
  // He falls: down to him; she touches him; the bandage. Then up again, and she gives the jar over a second time.
  e.hold(120.85).hop([3.6, 0], TO_HIM).glide(FELL[0] + 0.37, TOUCH, 0)
  e.hold(122.55).hop(T1, UP2[0]).hop(T2, UP2[1]).hold(123.5).hop(SEAT, UP2[2])
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
  if (t > 123.1 && t < SLAMS[6] - ONTO) tilt += 0.07 * Math.sin((2 * Math.PI * (t - 123.1)) / 0.75) * smoothstep((t - 123.1) / 0.4) * (1 - smoothstep((t - (SLAMS[6] - ONTO - 0.4)) / 0.4))
  if (t > OUT_FROM && t < SUN + 0.8) tilt += 0.04 * Math.sin((2 * Math.PI * (t - OUT_FROM)) / 0.7) * (1 - smoothstep((t - OUT_FROM) / (SUN + 0.8 - OUT_FROM)))
  // The blow shakes him where he stands.
  tilt += 0.08 * ring(t - TREE, 0.25, 18)
  return tilt
}

/** Every takeoff: he crouches a moment before it (what makes a hop read as meant). */
const TAKEOFFS: number[] = [
  SLAMS[0] - TOUCHDOWN - ONTO, ...[1, 2, 3, 5, 7].map((i) => SLAMS[i] - TOUCHDOWN - HOP), DOWN - 0.366, SLAMS[4] - TOUCHDOWN - ONTO,
  CLIMB[0] - 0.36, KICK, SLAMS[6] - TOUCHDOWN - ONTO, DOWN_PLANK[1],
]

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
      cells: box(-2.5, -13, 14.5, 1),
      exit: [12.75, 0],
      lane,
      state: { begin: slot.begin, carl: lane },
      company: [{ from: slot.begin, to: slot.end, at: (t): Companion => { const at = laneAt(her, t - slot.begin); return { x: at.x, y: at.y } } }],
      pose,
    }
  },
  () => shots(),
)

/**
 * The camera: every event its own move. A step in on each handful; left to the car as the tyre goes; in on the
 * cradle as she pushes, then out and right after the coins, down the chute to the wall; back to the ladder and the
 * lamp; in as he falls, and closer on the two of them for the bandage; the second pour the same in and out; out wide
 * as the storm comes, so the limb breaks through the roof inside the frame and the roof is patched in it; and in
 * again to follow them into the hall. Both stay whole inside the Zoom frame throughout (two thirds of the height,
 * 16:9, from the middle): with Carl on the floor at y 0 that keeps the middle within cells / 3 - 0.13 of it, and
 * while Ellie is on the mantle (y -1.48) or in the air over it, the frame can come no closer than about 2.8 cells
 * (3.4 at the top of her hops up onto it).
 */
function shots(): PartShot[] {
  const k = (t: number, cells: number, hold: Pt, w = 1): PartShot => ({ t, cells, hold: L(hold), w })
  /** A step in that lands on `at` and rests there a moment (the frame settles with the coins, then moves on). */
  const step = (at: number, cells: number, hold: Pt): PartShot[] => [k(at, cells, hold), k(at + 0.27, cells, hold)]
  return [
    // In with him to the machine. Then a step in on each handful as it drops into the slot, pushing off as the next
    // flies: his plank, the jar filling a notch at a time, and her on the ladder counting them in. The slot stays in
    // the top of the frame; the coins' apex may leave it.
    k(104.6, 4.6, [3.6, -1.2], 0.6),
    k(106.9, 3.65, [5.2, -1.03], 0.95),
    k(SLAMS[0] + 0.13, 3.65, [5.2, -1.03]),
    ...step(LANDS[0], 3.45, [5.3, -0.99]),
    ...step(LANDS[1], 3.25, [5.4, -0.93]),
    ...step(LANDS[2], 3.1, [5.45, -0.88]),
    k(LANDS[3], 3.0, [4.95, -0.85]),
    // The tyre: left to the car in the window as it goes (the whole car in frame by the blow), settling as the hubcap
    // lands; held as he goes over to look. Then up with her as she climbs to the jar (the top of her hop onto the
    // mantle sets 3.45).
    k(113.05, 3.3, [3.5, -0.96]),
    k(114.2, 3.3, [3.4, -0.96]),
    k(115.05, 3.45, [4.2, -1.0]),
    // Along the mantle with her, in on the cradle as she pushes; then out and right after the coins, down the chute
    // to the slot in the wall; then back in to the machine for the refill's handful.
    k(PUSH1, 3.1, [5.3, -0.9]),
    k(117.6, 4.0, [6.3, -0.9]),
    k(LANDS[4], 3.4, [5.2, -1.0]),
    // The ladder and the lamp going out; in as he falls; closer on the two of them for her touch and the bandage. (At
    // 121.0 she is at the top of her hop down off the mantle, and the frame can be no closer than 2.8 there.)
    k(119.6, 3.45, [3.85, -1.38]),
    k(FALL, 2.95, [3.78, -0.84]),
    k(121.0, 2.82, [3.72, -0.795]),
    k(122.3, 2.2, [3.04, -0.575]),
    // Back out as she climbs again, along the mantle with her, in on the cradle for the second pour, out after it.
    k(123.85, 3.5, [3.95, -1.0]),
    k(PUSH2 + 0.05, 3.1, [5.3, -0.9]),
    k(126.4, 4.2, [6.35, -1.1]),
    // The storm gathers; out wide for the tree through the roof and the jar thrown over by the blow, the roof
    // above the nursery's ceiling in the frame; the limb winched out and the hole boarded.
    k(127.0, 5.4, [6.4, -1.62]),
    k(128.4, 8.3, [7.25, -2.78]),
    k(129.9, 9.45, [7.7, -3.2]),
    k(131.4, 9.5, [7.95, -3.15]),
    k(133.3, 8.8, [8.35, -2.72]),
    k(135.3, 8.1, [9.3, -2.55]),
    // The sun: in again to the two of them, on their way to the hall.
    k(137.3, 5.8, [10.9, -1.6], 0.75),
    { t: END, cells: 5.6, off: [0.9, -1.1], w: 0 },
  ]
}

/** Every strike of this part, in show seconds (check:shows holds each to the music). */
export const JAR_HITS: number[] = [
  PERCH, SETTLE, ...SLAMS, ...LANDS, DOWN, TYRE, HUBCAP, ...UP1, PUSH1, POURS[0].stop, FIXED, LAMP_OUT, ...CLIMB, KICK, FALL,
  TO_HIM, TOUCH, ...UP2, PUSH2, POURS[1].stop, FLASH1, TREE, TOPPLE, THUNDER, ONTO_PLANK, FLASH2, E_OFF, C_OFF, WINCH, ...BOARDS, SUN, SKIP,
]
  .filter((t, i, all) => all.findIndex((u) => Math.abs(u - t) < 1e-6) === i)
  .sort((a, b) => a - b)
