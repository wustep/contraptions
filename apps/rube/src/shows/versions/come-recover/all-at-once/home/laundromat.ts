import { solid } from '../../../../../../../../src/core/draw'
import { easeInOutSine } from '../../../../../../../../src/core/ease'
import { FLOOR, R, type Lane, type Pt, type Seg } from '../../../../../parts'
import { alpha, box, carried, knock, part, route, smooth, type Companion, type PartShot, type Way } from '../kit'
import { CHORD, ENTRY, GREAT } from '../music'
import { hop } from '../physics'
import { HOME, JOY, WAYMOND } from '../worlds'
import { CATCH, STOP, seatAt, POPS } from './set-garland'
import {

  HEAP_IN,
  HEAP_REST,
  INTO_HEAP,
  KEYSTROKES,
  LETTER_SPIKED,
  ONTO_CRANK,
  RAMP_FOOT,
  RELEASE,
  SPIKED,
  THE_TOTAL,
  THROW,
  counterAir,
  counterBack,
  crankAngle,
  inCup,
  onKey,
  spikeTip,
} from './laundromat-counter'
import { COUNTER, DOOR, DOOR_OPENS, ROOM_HITS, STOREFRONT, WASHER, WASHERS, bag, penOf, washerBody, washerDoor, type Pen, type WasherLook } from './set'

/**
 * EVERYTHING. The Wang family laundromat at night, from the first chord to the big dryer.
 *
 * The cold open: the room in the dark, the red neon washer glowing in the window. On the chord the tubes blink and
 * catch one by one (the room does that, `set.ts`), over her first. The silence holds the reveal: the washers' round
 * windows, the googly-eyed bags, and Waymond, who rolls over and sets a slumped bag of washing back on its bottom.
 *
 * 7.93: she starts. She rolls onto the foot lever of the washer by the door (8.31), and four quarters drop from the
 * column on its console one on each note of the little run; on the last (8.99) the washer starts. It fills, turns,
 * spins up, shaking harder and harder, walking on the floor towards its lever; on the great hit (12.79) it jumps
 * and comes down on the lever's end, and she is thrown across the shop into the heap of receipts on the counter.
 * The receipts go up on the swell and come down, some onto the spike (14.69 to 15.20), and last of all the audit
 * letter, spiked on top of them (16.78). She looks at it. Then the adding machine: she rolls up its keys (19.78) and
 * taps and taps on the soft run.
 *
 * 20.19: the bell. Joy comes in off the street, and waits by the door. Her mother does not look up. Waymond goes a
 * little way towards her, and stops. On 29.37 the bell again, and Joy has gone.
 *
 * 30.65, the total: she rolls out onto the machine's crank, it goes down under her to its stop, and it throws her
 * up into the wire basket hung on the lantern string (31.46). She rides the string down over the shop, and every
 * paper lantern the hanger knocks drops open on a note: the party's prep. On 34.33 it hits the stop over the big
 * dryer's mouth (the dryer's part).
 */

/* ------------------------------------------------------------------ the washer by the door */

const W0 = WASHERS[0].x
/** The foot lever: its pivot (the bar's top edge line), its tread out to the right, its short end under the washer's corner. */
const PIVOT: Pt = [-1.1, -0.01]
const TREAD = 0.44
const SHORT = 0.4
const CUP = 0.24
/** Its tilt (the tread's angle below level): resting on its tip, pressed, and thrown over. */
const REST = 0.297
const PRESSED = 0.323
const THROWN = -0.33
/** The onsets of the little run: she presses the lever, and a quarter drops on each note after; the last starts it. */
const PRESS = 8.313
const COINS = [8.464, 8.719, 8.858, 8.986]
const START = COINS[3]
/** The spin-up, and the jump onto the lever's end. */
const SPIN_UP = 10.9
const HOP = 12.6
const FULL = 30

/** The drum's turn at `t`: still, the agitate, the spin-up, full spin, the spin down, a slow tumble, stopped. */
function drumTurn(t: number): { turn: number; w: number } {
  const agitate = (u: number) => 0.9 * Math.sin((2 * Math.PI * u) / 1.2) * smooth(u, 0, 0.3)
  if (t < 9.3) return { turn: 0, w: 0 }
  if (t < SPIN_UP) return { turn: agitate(t - 9.3), w: 0 }
  const a0 = agitate(SPIN_UP - 9.3)
  const D = GREAT - SPIN_UP
  if (t < GREAT) {
    const u = (t - SPIN_UP) / D
    return { turn: a0 + (FULL * D * u * u * u) / 3, w: FULL * u * u }
  }
  const a1 = a0 + (FULL * D) / 3
  if (t < 19.5) return { turn: a1 + FULL * (t - GREAT), w: FULL }
  const a2 = a1 + FULL * (19.5 - GREAT)
  const D2 = 2.5
  if (t < 22) {
    const v = (t - 19.5) / D2
    return { turn: a2 + (FULL * D2 * (1 - (1 - v) ** 3)) / 3, w: FULL * (1 - v) ** 2 }
  }
  const a3 = a2 + (FULL * D2) / 3
  const slow = 1.4
  const end = 70
  const tt = Math.min(t, end)
  return { turn: a3 + slow * (tt - 22) * smooth(tt, 22, 24) - slow * 1 * smooth(tt, 22, 24) * 0, w: t < end ? slow : 0 }
}

/** How hard it shakes (cells), how far it has walked towards the lever, and its jump. */
const shakeAmp = (t: number): number => (t < GREAT ? 0.03 * smooth(t, 11.2, 12.5) : t < 19.5 ? 0.006 : 0.006 * (1 - smooth(t, 19.5, 21)))
const creep = (t: number): number => 0.09 * smooth(t, 11.4, 12.55) + 0.03 * smooth(t, HOP, GREAT)

function washerLook(t: number): WasherLook {
  const { turn, w } = drumTurn(t)
  const A = shakeAmp(t)
  let dy = -A * 0.5 * Math.abs(Math.sin(t * 29))
  let rock = 0
  if (t >= HOP && t < GREAT) {
    // Up, and down with its right corner leading, onto the lever's end.
    const u = (t - HOP) / (GREAT - HOP)
    dy -= 0.2 * 4 * u * (1 - u)
    rock = 0.05 * Math.sin(Math.PI * u)
  } else if (t >= GREAT) {
    const u = t - GREAT
    dy -= 0.035 * Math.exp(-u / 0.07) * Math.abs(Math.sin(u * 30))
    rock = 0.025 * Math.exp(-u / 0.15) * Math.sin(u * 25)
  }
  const fill = smooth(t, START, 10.2) * (1 - smooth(t, 11.6, 12.6))
  const lamp = t < START ? 0 : t < 70 ? 1 : 0
  return {
    turn,
    water: 0.45 * fill,
    slosh: t < SPIN_UP ? 0.25 * Math.sin((2 * Math.PI * (t - 9.3)) / 1.2 + 0.8) * fill : 0,
    load: [HOME.rose, HOME.denim, HOME.butter, HOME.paper],
    fling: smooth(w, 6, 14),
    blur: smooth(w, 12, 24),
    lamp2: lamp,
    dx: creep(t) + A * Math.sin(t * 57),
    dy,
    rock,
  }
}

/** The lever's tilt at `t`. */
function leverTilt(t: number): number {
  if (t < PRESS) return REST
  if (t < GREAT) {
    const u = t - PRESS
    const clack = PRESSED - 0.012 * Math.exp(-u / 0.05) * Math.cos(u * 45)
    return clack + 0.022 * (shakeAmp(t) / 0.03) * Math.sin(t * 57 + 1)
  }
  const u = t - GREAT
  return THROWN + (PRESSED - THROWN) * Math.exp(-u / 0.012) + 0.05 * Math.exp(-u / 0.15) * Math.sin(u * 45)
}

/** A point `s` along the lever from its pivot (+ out along the tread), `h` up off its top face, at tilt `a`. */
function leverPoint(s: number, h: number, a: number): Pt {
  const dx = Math.cos(a)
  const dy = Math.sin(a)
  // The top face's normal: up, and a little towards the tread's side when it slopes down.
  return [PIVOT[0] + dx * s + dy * h, PIVOT[1] + dy * s - dx * h]
}

/** The ball in the lever's cup. */
const inLeverCup = (t: number): Pt => leverPoint(CUP, R + 0.035, leverTilt(t))

function drawLever(pen: Pen, t: number): void {
  const { p, k, ink, w } = pen
  const a = leverTilt(t)
  // Its fulcrum: a steel block on the floor.
  solid(p, ink, w * 0.8, HOME.steelDark)
  p.beginShape()
  p.vertex((PIVOT[0] - 0.09) * k, FLOOR * k)
  p.vertex((PIVOT[0] - 0.035) * k, (PIVOT[1] + 0.04) * k)
  p.vertex((PIVOT[0] + 0.035) * k, (PIVOT[1] + 0.04) * k)
  p.vertex((PIVOT[0] + 0.09) * k, FLOOR * k)
  p.endShape(p.CLOSE)
  // The bar, a tread at its end with a cup in it.
  const [ax, ay] = leverPoint(-SHORT, -0.02, a)
  const [bx, by] = leverPoint(TREAD, -0.02, a)
  p.stroke(ink)
  p.strokeWeight(Math.max(2, 0.06 * k))
  p.line(ax * k, ay * k, bx * k, by * k)
  p.stroke(HOME.steel)
  p.strokeWeight(Math.max(1, 0.032 * k))
  p.line(ax * k, ay * k, bx * k, by * k)
  const [cx, cy] = leverPoint(CUP, 0.0, a)
  p.push()
  p.translate(cx * k, cy * k)
  p.rotate(a)
  solid(p, ink, w * 0.7, HOME.red)
  p.arc(0, 0, 0.26 * k, 0.12 * k, 0, Math.PI, p.CHORD)
  solid(p, ink, w * 0.6, HOME.steelDark)
  p.rect((TREAD - CUP - 0.02) * k, 0.01 * k, 0.12 * k, 0.05 * k, 0.015 * k)
  p.pop()
  solid(p, ink, w * 0.6, HOME.steel)
  p.circle(PIVOT[0] * k, (PIVOT[1] + 0.005) * k, 0.06 * k)
}

/** The coin column on the washer's console: four quarters, dropping into the slot one by one. */
function drawCoins(pen: Pen, t: number, look: WasherLook): void {
  const { p, k, ink, w } = pen
  const x = W0 + 0.45 + (look.dx ?? 0)
  const base = WASHER.top - 0.02 + (look.dy ?? 0)
  const tubeH = 0.46
  const step = 0.085
  // The glass tube.
  p.stroke(ink)
  p.strokeWeight(w * 0.7)
  p.fill(alpha(p, HOME.glass, 0.4))
  p.rect(x * k, (base - tubeH / 2) * k, 0.22 * k, tubeH * k, 0.04 * k)
  // The quarters still in it; the one going in drops through the slot.
  let gone = 0
  for (const at of COINS) if (t >= at) gone++
  const last = gone > 0 ? COINS[gone - 1] : -1
  const u = gone > 0 ? t - last : Infinity
  // The stack settles a step down after each drop, with a small bounce.
  const settle = gone > 0 ? step * Math.exp(-u / 0.035) * Math.cos(Math.min(u * 40, Math.PI / 2)) : 0
  for (let j = gone; j < 4; j++) {
    const y = base - 0.06 - (j - gone) * step - settle
    solid(p, ink, w * 0.6, HOME.gold)
    p.ellipse(x * k, y * k, 0.17 * k, 0.07 * k)
    p.stroke(alpha(p, HOME.paper, 0.7))
    p.strokeWeight(Math.max(1, 0.012 * k))
    p.line((x - 0.05) * k, (y - 0.012) * k, (x + 0.02) * k, (y - 0.012) * k)
  }
  if (gone > 0 && u < 0.12) {
    // Going in: it slips down edge-on into the slot.
    const f = u / 0.12
    solid(p, ink, w * 0.6, HOME.gold)
    p.ellipse(x * k, (base - 0.04 + 0.08 * f) * k, 0.17 * (1 - 0.6 * f) * k, 0.07 * k)
  }
  // The slot's lip, over the coin going in.
  solid(p, ink, w * 0.6, HOME.steelDark)
  p.rect(x * k, (base + 0.01) * k, 0.26 * k, 0.04 * k, 0.01 * k)
  // Its lamp lights with each coin.
  if (gone > 0 && u < 0.3) {
    p.noStroke()
    p.fill(alpha(p, HOME.gold, 0.55 * (1 - u / 0.3)))
    p.circle(x * k, (base - 0.02) * k, 0.3 * k)
  }
}

/* ------------------------------------------------------------------ the bag Waymond sets up */

const SLUMPED: { x: number; foot: number } = { x: 3.12, foot: FLOOR }
const NUDGE = 4.45
/** Its tilt: slumped over towards him (to the left) until he rights it; it sways up, overshoots, and settles. */
function bagTilt(t: number): number {
  const slump = -0.5
  if (t < NUDGE) return slump
  const u = t - NUDGE
  const up = smooth(u, 0, 0.7)
  return slump * (1 - up) + 0.09 * Math.exp(-(u - 0.7) / 0.35) * Math.sin(Math.max(0, u - 0.7) * 9) * smooth(u, 0.6, 0.75)
}

/* ------------------------------------------------------------------ the family */

/** Waymond: sets the bag up, watches her work, goes a little way towards Joy and stops, and watches her mother fly. */
function waymondAt(t: number): Pt {
  const X = (pts: [number, number][], ease = easeInOutSine): number => {
    let x = pts[0][1]
    for (let i = 1; i < pts.length; i++) {
      const [t0, x0] = pts[i - 1]
      const [t1, x1] = pts[i]
      if (t >= t1) x = x1
      else if (t > t0) {
        x = x0 + (x1 - x0) * ease((t - t0) / (t1 - t0))
        break
      }
    }
    return x
  }
  const x = X([
    [2.6, 2.3],
    [4.25, 2.7],
    [4.85, 2.78],
    [6.2, 2.5],
    [20.4, 2.5],
    [21.3, 2.12],
    [23.9, 2.12],
    [24.5, 1.98],
    [27.7, 1.98],
    [28.9, 1.5],
    [31.7, 1.5],
    [32.3, 1.75],
  ])
  // The great hit shakes the floor under him.
  const shiver = 0.02 * knock(t - GREAT, 0.12) * Math.sin(Math.max(0, t - GREAT) * 60)
  return [x + shiver, 0]
}

/** Joy: up the street behind the glass, in at the door on the bell, waiting, a step towards her mother, and gone. */
const JOY_IN = 20.19
const JOY_OUT = 29.373
function joyAt(t: number): Pt {
  const legs: [number, number][] = [
    [18.2, -6.35],
    [19.95, -4.52],
    [JOY_IN, -4.52],
    // In, and all the way across the shop to the counter, to stop right under her mother.
    [22.25, 0.32],
    // A hesitation; then a second, smaller step in, on the note.
    [22.7, 0.26],
    [23.394, 0.26],
    [23.742, 0.8],
    // Waiting under her. A lean towards her as her mother runs up the keys, and back.
    [25.9, 0.8],
    [26.35, 1.04],
    [26.9, 0.92],
    [27.35, 0.92],
    // She goes: back across the shop and out on the bell.
    [JOY_OUT, -3.95],
    [30.0, -4.55],
    [31.6, -6.45],
  ]
  let x = legs[0][1]
  for (let i = 1; i < legs.length; i++) {
    const [t0, x0] = legs[i - 1]
    const [t1, x1] = legs[i]
    if (t >= t1) x = x1
    else if (t > t0) {
      // Up the street at a walk; indoors, easing to each stop.
      const u = (t - t0) / (t1 - t0)
      const e = i === 1 ? u * (2 - u) : i === legs.length - 1 ? u * u : easeInOutSine(u)
      x = x0 + (x1 - x0) * e
      break
    }
  }
  return [x, 0]
}

DOOR_OPENS.push({ at: JOY_IN, shut: 20.95 }, { at: JOY_OUT, shut: 30.1 })

/* ------------------------------------------------------------------ the part */

interface LaundromatState {
  lane: Lane
}

const KEY_TIMES = KEYSTROKES.map(([at]) => at)

/** Every strike this part makes, in show seconds. */
export const LAUNDROMAT_HITS: number[] = [
  ...ROOM_HITS,
  ENTRY,
  PRESS,
  ...COINS,
  GREAT,
  ...SPIKED,
  LETTER_SPIKED,
  ...KEY_TIMES,
  JOY_IN,
  JOY_OUT,
  THE_TOTAL,
  CATCH,
  ...POPS,
]
  .filter((t, i, all) => all.indexOf(t) === i)
  .sort((a, b) => a - b)

/** Is Joy behind the storefront's glass (outside) at `t`? */
const joyOutside = (t: number): boolean => {
  if (t < 18.2 || t > 31.6) return false
  const [x] = joyAt(t)
  return x < DOOR.x1 - 0.05 && (t < JOY_IN + 0.25 || t > JOY_OUT + 0.3)
}

export const laundromat = part<LaundromatState>(
  {
    name: 'laundromat',
    flight: true,
    draw: (p, _s, c) => {
      const pen = penOf(p, c)
      const t = c.t
      const look = washerLook(t)
      washerBody(pen, W0, look)
      washerDoor(pen, W0, look)
      drawCoins(pen, t, look)
      drawLever(pen, t)
      bag(pen, SLUMPED.x, SLUMPED.foot - 0.12 * Math.max(0, knock(t - GREAT, 0.1) * Math.sin(Math.max(0, t - GREAT) * 30)), {
        color: HOME.denim,
        size: 0.62,
        tilt: bagTilt(t),
        swing: -0.9 * (bagTilt(t) + 0.2) + 0.5 * knock(t - GREAT, 0.25) * Math.sin(Math.max(0, t - GREAT) * 20),
        lift: 0.6 * knock(t - GREAT, 0.15),
      })
      counterBack(pen, t)
    },
    over: (p, _s, c) => {
      const pen = penOf(p, c)
      const t = c.t
      // In the heap: the receipts round her as she sinks into it.
      if (t > INTO_HEAP && t < 15.4) {
        const f = smooth(t, INTO_HEAP, INTO_HEAP + 0.1) * (1 - smooth(t, 14.9, 15.4))
        for (let i = 0; i < 4; i++) {
          p.push()
          p.translate((HEAP_REST[0] - 0.2 + i * 0.13) * c.k, (COUNTER.top - 0.07 - 0.04 * (i % 2)) * c.k)
          p.rotate((i - 1.5) * 0.35)
          solid(p, c.ink, c.weight * 0.45, i === 2 ? HOME.butter : HOME.paper)
          p.rect(0, 0, 0.19 * c.k, 0.11 * f * c.k, 0.01 * c.k)
          p.pop()
        }
      }
      counterAir(pen, t)
      spikeTip(pen, t)
      // Joy outside, behind the glass: a glaze of the glass's light over her, and the window's bottom rail.
      if (joyOutside(t)) {
        const [jx] = joyAt(t)
        const k = c.k
        const ctx = p.drawingContext as CanvasRenderingContext2D
        const g = ctx.createRadialGradient(jx * k, -0.03 * k, 0, jx * k, -0.03 * k, 0.3 * k)
        g.addColorStop(0, 'rgba(159, 201, 200, 0.3)')
        g.addColorStop(1, 'rgba(159, 201, 200, 0)')
        ctx.fillStyle = g
        ctx.fillRect((jx - 0.3) * k, -0.33 * k, 0.6 * k, 0.6 * k)
        const onWindow = jx > STOREFRONT.x0 && jx < STOREFRONT.x1 + 0.1
        if (onWindow) {
          solid(p, c.ink, c.weight, HOME.steel)
          p.rect(jx * k, ((STOREFRONT.sill + FLOOR) / 2) * k, 0.42 * k, (FLOOR - STOREFRONT.sill) * k)
        }
      }
    },
  },
  (slot) => {
    const at = (T: number) => T - slot.begin
    const segs: Seg[] = []
    // At rest in the dark, and through the silence.
    const start: Pt = [-0.5, 0]
    const cup0 = inLeverCup(ENTRY)
    const tip: Pt = [-0.66, -0.005]
    segs.push(...route([{ at: 0, p: start }, { at: at(ENTRY), p: start }]))
    // 7.93: off, onto the lever's tread, and up it into its cup, slowing.
    const d1 = Math.hypot(tip[0] - start[0], tip[1] - start[1])
    const d2 = Math.hypot(cup0[0] - tip[0], cup0[1] - tip[1])
    const T = PRESS - ENTRY
    // A push to v0, slowing up the tread to stop in the cup: times split so the two ramps meet.
    const v0 = 1.9
    // T = 2 d1 / (v0 + v1) + 2 d2 / v1: find v1.
    let lo = 0.05
    let hi = 6
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2
      if ((2 * d1) / (v0 + mid) + (2 * d2) / mid > T) lo = mid
      else hi = mid
    }
    const v1 = (lo + hi) / 2
    const t1 = (2 * d1) / (v0 + v1)
    segs.push({ from: start, to: tip, dur: t1, ramp: [v0, v1] })
    segs.push({ from: tip, to: cup0, dur: T - t1, ramp: [v1, 0] })
    // Pressed, and carried by the lever as the washer shakes the floor.
    segs.push(...carried((a) => inLeverCup(a + slot.begin), at(PRESS), at(GREAT), 60))
    // The great hit: thrown across the shop into the heap on the counter.
    const thrown: Way = { at: at(GREAT), p: inLeverCup(GREAT - 1e-4) }
    segs.push(...route([thrown, hop(thrown, HEAP_IN, at(INTO_HEAP))]))
    // Down into the heap as it goes up round her; out of it; to the machine; the letter comes down behind her.
    const beside: Pt = [2.07, COUNTER.top - R]
    const look: Pt = [2.3, COUNTER.top - R]
    segs.push(
      ...route([
        { at: at(INTO_HEAP), p: HEAP_IN },
        { at: at(INTO_HEAP) + 0.25, p: HEAP_REST, ease: 'out' },
        { at: at(15.1), p: HEAP_REST },
        { at: at(16.5), p: beside, ease: 'inout' },
        { at: at(LETTER_SPIKED), p: beside },
        { at: at(LETTER_SPIKED) + 0.12, p: [beside[0] - 0.035, beside[1]], ease: 'out' },
        { at: at(LETTER_SPIKED) + 0.5, p: beside, ease: 'inout' },
        { at: at(17.6), p: look, ease: 'inout' },
        { at: at(18.55), p: look },
      ]),
    )
    // To the machine and up onto its first key: speeding up, then easing onto it, one move.
    {
      const d1 = Math.hypot(RAMP_FOOT[0] - look[0], RAMP_FOOT[1] - look[1])
      const k0 = onKey(0)
      const d2 = Math.hypot(k0[0] - RAMP_FOOT[0], k0[1] - RAMP_FOOT[1])
      const T = KEYSTROKES[0][0] - 18.55
      const t1 = 18.55 + (T * d1) / (d1 + d2)
      segs.push(...route([{ at: at(18.55), p: look }, { at: at(t1), p: RAMP_FOOT, ease: 'in' }, { at: at(KEYSTROKES[0][0]), p: k0, ease: 'out' }]))
    }
    // The keys: to each on its note.
    // Over a long gap she rolls to the next key; on the quick notes she bounces key to key, taking off as she lands.
    const keyWays: Way[] = [{ at: at(KEYSTROKES[0][0]), p: onKey(KEYSTROKES[0][1]) }]
    for (let j = 1; j < KEYSTROKES.length; j++) {
      const [t0, k0] = KEYSTROKES[j - 1]
      const [t1k, key] = KEYSTROKES[j]
      const gap = t1k - t0
      if (gap <= 0.45) keyWays.push(hop({ at: at(t0), p: onKey(k0) }, onKey(key), at(t1k)))
      else {
        const move = Math.min(0.42, gap * 0.6)
        keyWays.push({ at: at(t1k - move), p: onKey(k0) })
        keyWays.push({ at: at(t1k), p: onKey(key), ease: 'inout' })
      }
    }
    segs.push(...route(keyWays))
    // Up over the machine's top and out along the crank's arm into its cup.
    const lastKey = onKey(KEYSTROKES[KEYSTROKES.length - 1][1])
    const cupStart = inCup(0)
    segs.push(
      ...route([
        { at: at(KEYSTROKES[KEYSTROKES.length - 1][0]), p: lastKey },
        { at: at(ONTO_CRANK + 0.08), p: cupStart, ease: 'inout' },
      ]),
    )
    // Down with the arm to its stop, and thrown with it.
    segs.push(...carried((a) => inCup(crankAngle(a + slot.begin)), at(ONTO_CRANK + 0.08), at(RELEASE), 24))
    // Up into the basket.
    const thrownUp: Way = { at: at(RELEASE), p: inCup(THROW.at) }
    segs.push(...route([thrownUp, hop(thrownUp, seatAt(CATCH), at(CATCH))]))
    // The ride.
    segs.push(...carried((a) => seatAt(a + slot.begin), at(CATCH), at(STOP), 90))
    const lane: Lane = { segs, fire: at(ENTRY) }
    const end = seatAt(STOP)
    return {
      cells: box(-8, -5, 11, 1, 1),
      exit: [end[0] + 0.5, end[1]],
      lane,
      state: { lane },
      company: [
        { who: 'waymond', from: 0, to: 40, at: (t): Companion | null => ({ x: waymondAt(t)[0], y: waymondAt(t)[1], color: WAYMOND }) },
        { who: 'joy', from: 18.2, to: 31.6, at: (t): Companion | null => ({ x: joyAt(t)[0], y: joyAt(t)[1], color: JOY }) },
      ],
    }
  },
  (slot) => shotsFor(slot),
)

/* ------------------------------------------------------------------ the camera */

function shotsFor(_slot: { begin: number; end: number }): PartShot[] {
  return [
    // The cold open: the whole shop, lit box in the dark street, from the window to the counter; held through the
    // silence, drifting in.
    { t: 0.12, cells: 6.3, hold: [-1.85, -1.95] },
    { t: CHORD + 1.3, cells: 6.2, hold: [-1.8, -1.92] },
    { t: 7.4, cells: 5.4, hold: [-1.3, -1.52] },
    // In on the washer by the door and its lever as she starts it, and closer as it winds up.
    { t: 8.25, cells: 3.8, hold: [-1.05, -1.1] },
    { t: 12.35, cells: 3.4, hold: [-0.9, -0.95] },
    // The throw, across to the counter; the receipts and the spike, the letter.
    { t: 13.3, cells: 3.9, hold: [0.55, -1.45] },
    { t: 14.5, cells: 3.35, hold: [1.75, -1.55] },
    { t: 18.3, cells: 3.3, hold: [1.05, -1.5] },
    // Out to the door as the bell goes; with Joy across the shop to her mother, and in close on the two of them, her
    // mother working above her, Waymond watching; out again after her as she goes.
    { t: 20.1, cells: 4.3, hold: [-0.42, -1.45] },
    { t: 22.3, cells: 2.95, hold: [0.95, -1.2] },
    { t: 27.2, cells: 2.8, hold: [1.1, -1.2] },
    { t: 28.3, cells: 3.3, hold: [0.45, -1.3] },
    { t: 29.45, cells: 4.3, hold: [-0.3, -1.45] },
    // The total, and the throw up into the basket.
    { t: 31.5, cells: 4.5, hold: [1.7, -2.45], off: [0.4, 0.62], w: 0.35 },
    // With her down the string, over the shop, to the big dryer.
    { t: 32.4, cells: 4.6, off: [0.7, 0.6], w: 0 },
    { t: 33.6, cells: 4.6, off: [0.6, 0.5], w: 0 },
    { t: STOP, cells: 4.6, hold: [8.3, -2.15], w: 0.6 },
  ]
}

