import type { Pt, Seg } from '../../../../../parts'
import { laneAt, R } from '../../../../../parts'
import { box, carried, frame, lookFrom, looks, part, type Look, type PartShot } from '../kit'
import { BURST1, pulse, SEAM } from '../music'
import { G, dropTime } from '../physics'
import { SEAMS } from '../seams'
import { BUCKET, bucketSeat, drawBucket, CATCH, COUGHS, drawFloods, drawLight, drawMast, drawStarter, drawSteps, drawSwitch, FLOOD_ON, HEAD, IAN_TIP, INTO_BUCKET, LAMPS, PLANK, PLANK_TIP, plankAt, plankTop, THUD, TIP, TIPPED, tipSeat } from './base-machine'
import { PAD } from './camp'
import { PAD_AT, seatAt } from './flight'
import { LIFT_AT, MEADOW } from './geo'
import { DOOR_OPEN, heliAt, heliPoint, IAN_SEAT } from './heli'

/**
 * The base (22.059 → 43.758), the valley builder's: the camp under the shell, from the pad to the lift.
 *
 * The skids are down; the rotor winds down a blade a pulse. The cabin door slides back (23.24); she hops out and down
 * onto the helideck (23.957), Ian a step behind (24.911). She rolls along the deck and off its edge into the bucket
 * hanging there (26.604): her weight takes it down, the rope pulls the generator's flywheel round, the bucket thuds
 * onto the meadow (27.028) and tips her out (27.307); the engine coughs (27.55, 27.776) and catches (28.021), and from
 * then on it puffs on every pulse. Ian jumps down after (28.253). She rolls up the plank switch, and it tips under
 * her onto its contact (29.681): the power goes up the lamp mast, a lamp a pulse, and its head lights looking up at
 * the belly (36.13). They stop under the shell, Ian catching up after he has tipped the plank again (32.549).
 *
 * The first burst (36.368 → 37.808): the slot in the belly opens in six steps (the set draws it), its light spilling
 * down on the camp; the camera cuts wide under the belly to see it, holds it open, and cuts back in on the floods'
 * first answer. The floodlights answer: 38.534, 38.772,
 * 39.735. Then up the steps onto the lift's deck, she first (41.848, 42.086, 42.324), Ian after (42.568, 42.8,
 * 43.056): at rest on the deck at 43.758, Ian on her left.
 *
 * The frame's origin is PAD_AT (she sits in the cabin at (-0.5, 0)); everything is laid out in the valley's cells
 * and moved into it.
 */

interface BaseState {
  begin: number
}

const B0 = SEAM.base
const B1 = SEAM.lift
const F = (p: Pt): Pt => [p[0] - PAD_AT[0], p[1] - PAD_AT[1]]
const ON_DECK = MEADOW - 1 - R
const ON_PAD = PAD.top - R
const ON_MEADOW = MEADOW - R

/* ------------------------------------------------------------------ lanes, in world cells and show seconds */

/** A lane being laid: its segments (in the part's frame), and where and when it has got to. */
class Path {
  segs: Seg[] = []
  constructor(public at: Pt, public t: number) {}
  /** Carried by something from now to `t1`, sampled from `fn` (world, show time). */
  carry(fn: (t: number) => Pt, t1: number, n = 0, hidden = false): this {
    const steps = n || Math.max(2, Math.ceil((t1 - this.t) * 40))
    this.segs.push(...carried((t) => F(fn(t)), this.t, t1, steps, hidden))
    this.at = fn(t1)
    this.t = t1
    return this
  }
  /** Still until `t1`. */
  rest(t1: number): this {
    if (t1 > this.t + 1e-9) this.segs.push({ from: F(this.at), to: F(this.at), dur: t1 - this.t })
    this.t = Math.max(this.t, t1)
    return this
  }
  /** A flight under gravity to `to`, landing at `t1`. */
  fly(to: Pt, t1: number): this {
    const T = t1 - this.t
    this.segs.push({ from: F(this.at), to: F(to), dur: T, arc: (G * T * T) / 8 })
    this.at = to
    this.t = t1
    return this
  }
  /** Rolling straight to `to` by `t1`, from speed v0 to v1 through one middle speed: two even changes of pace. */
  roll(to: Pt, t1: number, v0: number, v1: number, f = 0.5): this {
    const T = t1 - this.t
    const D = Math.hypot(to[0] - this.at[0], to[1] - this.at[1])
    const t1a = T * f
    const t2a = T - t1a
    let vm = (2 * D - v0 * t1a - v1 * t2a) / T
    if (vm < 0) {
      console.warn(`logogram: base: a roll of ${D.toFixed(2)} in ${T.toFixed(2)}s from ${v0.toFixed(2)} to ${v1.toFixed(2)} cannot be made`)
      vm = 0
    }
    const d1 = ((v0 + vm) / 2) * t1a
    const mid: Pt = [this.at[0] + ((to[0] - this.at[0]) * d1) / D, this.at[1] + ((to[1] - this.at[1]) * d1) / D]
    const seg = (a: Pt, b: Pt, dur: number, r0: number, r1: number): Seg => (r0 + r1 > 1e-6 ? { from: F(a), to: F(b), dur, ramp: [r0, r1] } : { from: F(a), to: F(b), dur })
    this.segs.push(seg(this.at, mid, t1a, v0, vm), seg(mid, to, t2a, vm, v1))
    this.at = to
    this.t = t1
    return this
  }
}

/**
 * Down the tipped plank from its pivot to its far end, and off it onto the meadow: a ball rolling down a slope
 * gathers at 5/7 of g along it. It starts down at V0; `DOWN` is the start and pace down, and the landing comes four
 * pulses after the tip (the pace is found so that it does).
 */
const V0 = 0.25
const RUN = PLANK.half - 0.02
function runDown(a: number): { time: number; speed: number; fall: number } {
  const time = (-V0 + Math.sqrt(V0 * V0 + 2 * a * RUN)) / a
  const speed = V0 + a * time
  const end = plankTop(0.02 + RUN, PLANK_TIP)
  const vy = speed * Math.sin(PLANK_TIP)
  const drop = ON_MEADOW - end[1]
  const fall = (-vy + Math.sqrt(vy * vy + 2 * G * drop)) / G
  return { time, speed, fall }
}
/** The pace down the plank that lands her `after` seconds after the tip. */
function paceFor(after: number): number {
  let lo = 0.5
  let hi = 8
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2
    const r = runDown(mid)
    if (r.time + r.fall > after) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}
/** Rolling up the plank at `v`, reaching its pivot as it starts to tip (85 ms before `tip`), tipping, and down it. */
function overPlank(path: Path, tip: number, v: number, land: number): number {
  const at = tip - 0.085
  const foot = at - PLANK.half / v
  const a = paceFor(land - tip)
  const { time, speed } = runDown(a)
  path.carry((t) => plankTop(-PLANK.half + v * (t - foot), plankAt(t)), at)
  path.carry((t) => plankTop(0.02 * ((t - at) / 0.085), plankAt(t)), tip, 6)
  path.carry((t) => plankTop(0.02 + V0 * (t - tip) + 0.5 * a * (t - tip) ** 2, plankAt(t)), tip + time)
  // Off its far end, with the speed it gave: a short fall onto the meadow, on the pulse.
  const vx = speed * Math.cos(PLANK_TIP)
  path.fly([path.at[0] + vx * (land - path.t), ON_MEADOW], land)
  return vx
}
/** Where the plank's near end is (the ball on it), for a roll to meet it. */
const PLANK_FOOT = plankTop(-PLANK.half, plankAt(0))

/** The hops up the steps: the takeoff before the first tread, the treads, the landing. */
const HOP_FROM: Pt = [-3.3, ON_MEADOW]
const HOPS: Pt[] = [
  [-2.95, MEADOW - 0.33 - R],
  [-2.62, MEADOW - 0.67 - R],
  [-2.0, ON_DECK],
]

/** Louise's lane, in the world. */
const HOP_OUT = 0.38
function louise(): Path {
  const seat = (t: number) => seatAt(t)
  const out = pulse(98)
  const lands = pulse(100)
  const path = new Path(seat(B0), B0)
  path.carry(seat, out)
  // She hops out of the door and down onto the deck: a short hop, so she is high in it as she passes Ian on her right.
  path.fly([path.at[0] + HOP_OUT, ON_PAD], lands)
  const vHop = HOP_OUT / (lands - out)
  // Along the deck and off its edge, into the bucket: the deck's edge is at the bucket's rim, so she hops it (twice a
  // plain drop's time, a ball's height up), clear of the rim until she is over the bucket, not through its wall.
  const inBucket = bucketSeat(INTO_BUCKET)
  const hop = 2.1 * dropTime(inBucket[1] - ON_PAD)
  const edge: Pt = [PAD.x1, ON_PAD]
  const vEdge = (inBucket[0] - edge[0]) / hop
  path.roll(edge, INTO_BUCKET - hop, vHop, vEdge, 0.45)
  path.fly(inBucket, INTO_BUCKET)
  // Down with it, inside it (out of sight for 0.7 s, the bucket where she is); tipped out.
  path.carry(bucketSeat, THUD, 0, true)
  path.carry(tipSeat, TIPPED, 0, true)
  // Out of its mouth and on to the plank, up it, and over.
  const vUp = 1.0
  const tipOut = tipSeat(TIPPED + 1e-3)
  const vOut = Math.max(0.2, (tipOut[0] - tipSeat(TIPPED - 0.02)[0]) / 0.02)
  path.roll(PLANK_FOOT, TIP - 0.085 - PLANK.half / vUp, vOut, vUp, 0.45)
  const landV = overPlank(path, TIP, vUp, pulse(128))
  // On under the shell, slowing, to where she stops and looks up.
  path.roll([-5.8, ON_MEADOW], 35.8, landV, 0, 0.68)
  path.rest(39.93)
  // To the steps, and up them.
  // Up: off on a pulse, a tread a pulse.
  const up = pulse(174)
  path.roll(HOP_FROM, up, 0, (HOPS[0][0] - HOP_FROM[0]) / (pulse(175) - up), 0.5)
  path.fly(HOPS[0], pulse(175))
  path.fly(HOPS[1], pulse(176))
  path.fly(HOPS[2], pulse(177))
  // Onto the deck, to her place on it.
  const v3 = (HOPS[2][0] - HOPS[1][0]) / (pulse(177) - pulse(176))
  path.roll([LIFT_AT[0] - 0.5, LIFT_AT[1]], 43.19, v3, 0)
  path.rest(B1)
  return path
}

/** Ian's lane, in the world: with her all the way, a step behind. */
function ian(): Path {
  const seat = (t: number) => heliPoint(heliAt(t), IAN_SEAT[0], IAN_SEAT[1])
  const out = pulse(102)
  const lands = pulse(104)
  const path = new Path(seat(B0), B0)
  path.carry(seat, out)
  path.fly([path.at[0] + 0.5, ON_PAD], lands)
  const vHop = 0.5 / (lands - out)
  // Along the deck behind her, and he waits at its edge while the engine starts.
  path.roll([-20.45, ON_PAD], 26.4, vHop, 0, 0.5)
  const jump = 27.806
  const vJump = 3.0
  const run = (2 * 0.7) / vJump
  path.rest(jump - run)
  path.roll([-19.75, ON_PAD], jump, 0, vJump, 1)
  // Off the edge, clear of the bucket, onto the meadow.
  const T = dropTime(ON_MEADOW - ON_PAD)
  path.fly([-19.75 + vJump * T, ON_MEADOW], jump + T)
  // He stops by the generator to watch it run, then follows her over the plank.
  path.roll([-17.3, ON_MEADOW], 29.3, vJump, 0, 0.35)
  path.rest(30.6)
  const vUp = 1.1
  path.roll(PLANK_FOOT, IAN_TIP - 0.085 - PLANK.half / vUp, 0, vUp, 0.5)
  const landV = overPlank(path, IAN_TIP, vUp, pulse(140))
  path.roll([-6.22, ON_MEADOW], 37.6, landV, 0, 0.6)
  path.rest(40.3)
  const up = pulse(176)
  path.roll(HOP_FROM, up, 0, (HOPS[0][0] - HOP_FROM[0]) / (pulse(177) - up), 0.5)
  path.fly(HOPS[0], pulse(177))
  path.fly(HOPS[1], pulse(178))
  path.fly(HOPS[2], pulse(179))
  const v3 = (HOPS[2][0] - HOPS[1][0]) / (pulse(179) - pulse(178))
  path.roll([LIFT_AT[0] - 0.5 - 0.42, LIFT_AT[1]], 43.62, v3, 0)
  path.rest(B1)
  return path
}

/** Every strike, in order. */
export const BASE_HITS: number[] = [
  DOOR_OPEN,
  pulse(98),
  pulse(100),
  pulse(102),
  pulse(104),
  INTO_BUCKET,
  THUD,
  TIPPED,
  ...COUGHS,
  CATCH,
  pulse(118),
  TIP,
  pulse(128),
  pulse(140),
  ...LAMPS,
  IAN_TIP,
  HEAD,
  ...BURST1,
  ...FLOOD_ON,
  pulse(174),
  pulse(175),
  pulse(176),
  pulse(177),
  pulse(178),
  pulse(179),
].sort((a, b) => a - b)

/**
 * Where they look, stopped under the belly: up at the slot as it opens over them in its six steps, and holding there
 * as the floods answer, until they set off for the lift. Elsewhere their eyes roll with them.
 */
const UP_AT_SLOT = -Math.PI / 2 + 0.15
const LOUISE_LOOKS: Look[] = [{ from: 36.0, to: 39.5, at: () => UP_AT_SLOT }]
const IAN_LOOKS: Look[] = [{ from: 37.75, to: 39.85, at: () => UP_AT_SLOT }]

export const base = part<BaseState>(
  {
    name: 'base',
    draw: (p, s, c) => {
      const t = c.t + s.begin
      const f = frame(p, c.k)
      // Everything here is laid out in the valley's cells: draw it there.
      const wx0 = f.x0 + PAD_AT[0]
      const wx1 = f.x1 + PAD_AT[0]
      const wy1 = f.y1 + PAD_AT[1]
      if (wx1 < -21 || wx0 > 9 || wy1 < -18) return
      p.push()
      p.translate(-PAD_AT[0] * c.k, -PAD_AT[1] * c.k)
      const ink = { ink: c.ink, weight: c.weight }
      drawLight(p, c.k, t)
      drawStarter(p, c.k, t, ink)
      drawSwitch(p, c.k, t, ink)
      drawMast(p, c.k, t, ink)
      drawFloods(p, c.k, t, ink)
      drawSteps(p, c.k, ink)
      p.pop()
    },
    over: (p, s, c) => {
      // The bucket, in front of her while she is in it.
      const t = c.t + s.begin
      const f = frame(p, c.k)
      const bx = BUCKET.x - PAD_AT[0]
      if (bx + 2 < f.x0 || bx - 2 > f.x1) return
      p.push()
      p.translate(-PAD_AT[0] * c.k, -PAD_AT[1] * c.k)
      drawBucket(p, c.k, t, { ink: c.ink, weight: c.weight })
      p.pop()
    },
  },
  (slot) => {
    const L = louise()
    const I = ian()
    const begin = slot.begin
    const ianLane = { segs: I.segs, fire: 0 }
    const exit = F(LIFT_AT)
    return {
      cells: box(F([-22, 0])[0], F([0, -17])[1], F([10, 0])[0], F([0, 1.5])[1], 2),
      exit,
      lane: { segs: L.segs, fire: INTO_BUCKET - begin },
      state: { begin },
      riders: looks(LOUISE_LOOKS),
      company: [
        {
          who: 'ian',
          from: begin,
          to: slot.end,
          at: (t: number) => {
            const q = laneAt(ianLane, t - begin)
            return { x: q.x, y: q.y, look: (roll: number) => lookFrom(IAN_LOOKS, t, roll) }
          },
        },
      ],
    }
  },
  (slot, built) => shotsFor(slot.begin, slot.end, built.lane),
)

/**
 * The camera: close on the cabin as the door slides back and she hops down; with her along the deck; on the bucket
 * and the generator as the engine catches; with her to the plank; then drawing back and up the mast as its lamps
 * come on, her low in the frame. On the burst, a cut wide under the belly to see the slot open, and a cut back in on
 * its last step, to the two of them in its light as the floodlights answer; in with them to the steps, and the seam's
 * framing on the deck.
 */
function shotsFor(begin: number, end: number, lane: { segs: Seg[]; fire: number }): PartShot[] {
  const her = (t: number): Pt => {
    const q = laneAt(lane, t - begin)
    return [q.x + PAD_AT[0], q.y + PAD_AT[1]]
  }
  const hold = (t: number, cells: number, at: Pt, cut = false): PartShot => ({ t, cells, hold: F(at), w: 1, cut })
  const s0 = her(begin)
  const seam = SEAMS.base
  const lift = SEAMS.lift
  const e = her(end)
  return [
    // Still while the door opens, then down with her as she drops to the deck, and along it with her.
    hold(23.1, seam.cells, [s0[0] + seam.frame[0], s0[1] + seam.frame[1]]),
    hold(24.6, 6.15, [s0[0] + 1.6, PAD.top - R - 1.3]),
    { t: 25.35, cells: 6.3, off: [1.3, -1.45], w: 0 },
    hold(26.2, 6.6, [BUCKET.x + 0.5, -2.3]),
    hold(27.5, 7.0, [-18.1, -2.4]),
    hold(28.7, 7.4, [-16.9, -2.45]),
    hold(29.9, 8.2, [-15.0, -2.55]),
    hold(31.3, 10.4, [-13.4, -3.3]),
    hold(33.0, 12.8, [-12.2, -4.0]),
    hold(34.7, 15.6, [-11.2, -4.9]),
    hold(36.2, 16.2, [-10.6, -5.05]),
    // The first burst: cut wide under the belly on its first step (the helicopter out of the picture), held on the
    // slot through all six and open, and back in on the first flood's answer.
    hold(BURST1[0], 25, [3.4, -8.1], true),
    hold(FLOOD_ON[0] - 0.1, 25.6, [3.4, -8.2]),
    hold(FLOOD_ON[0], 16.9, [-2.4, -5.5], true),
    hold(39.9, 16.2, [-2.6, -5.3]),
    hold(41.2, 11, [-3.2, -3.4]),
    hold(42.2, 7.6, [-2.0, -2.6]),
    hold(end, lift.cells, [e[0] + lift.frame[0], e[1] + lift.frame[1]]),
  ]
}
