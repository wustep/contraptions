// Order matters, and this line comes first: the strokes live in a file of their own, so that `strokes.ts` (which
// gathers every Carnegie part's `*_KIT` from here, and which the metronome's drawing below reads for the kit's
// clock) finds them set whichever of the two is loaded first.
export { RUBATO_KIT, RUBATO_HITS } from './rubato-hits'
import type p5 from 'p5'
import type { Pt, Seg } from '../../../../../parts'
import { clamp, easeInSine } from '../../../../../../../../src/core/ease'
import { CRASH, RACK, SNARE, cymbalSwing } from '../drums'
import { box, part, smooth, type Ctx } from '../kit'
import { RIDE, SNARES, level } from '../music'
import { G_EARTH } from '../physics'
import { BOARD, CRASH_AT, LAND, RACK_AT, RACK_TAP, TAPS } from './rubato-hits'
import {
  COCK,
  LANDING,
  PIVOT_X,
  PIVOT_Y,
  RELEASE,
  RIDE_END,
  drawMetronome,
  lift,
  riding,
  rodAt,
  seatOnCymbal,
  seatOnDrum,
  weightAt,
} from './rubato-metronome'
import { CLOSE, KIT_AT } from './stage'

/**
 * Carnegie Hall, 423.34 → 504.0: the rubato. The heart of the show, and its answer to the house Metronome ("not
 * quite my tempo"): a tempo that will not hold still, kept by a metronome whose weight is Andrew.
 *
 * - 423.34, the wind-up. After the loudest, fastest playing, the ride soft and dense. He taps the snare softly, a
 *   pulse already slowing, while a great metronome rises out of the stage behind the kit, walnut and gilt, its rod
 *   upright between the ride and the crash. He climbs the kit to it: the rack tom, a tap, a leap onto the crash, a
 *   leap onto the weight (432.34), and his weight pushes the rod off.
 * - 432.72, the rubato: every stroke of `RIDE` (162), the rod's side on the ride's rim at the left of its swing
 *   (tick) and on the crash's at the right (tock). He sits where the tempo says, as a real metronome's weight does:
 *   the stroke doubles at 436.06 and he drops down the rod; then, as the strokes lengthen, he climbs, and the swing
 *   slows to one stroke in 0.9 s at 458.58, nearly silent, the rod arriving at each cymbal nearly at rest; then he
 *   comes down again as it quickens, faster, to a stroke every 0.13 s.
 * - 483.92, the roll, too fast to count: the swing collapses into a shimmer. He sits still at the centre of it, at
 *   the bottom of his range; only the rod trembles under him, and its blur widens into a fan as the swell grows,
 *   the hall's light rising with it, while the camera draws back from him to the whole machine, the kit and
 *   Fletcher on his podium. The rod leans back with him and flings him off; the camera comes down with him, and he
 *   lands on the snare on the burst (503.995) as the hall's light slams up. The rod, without its weight, rings down
 *   to upright and sinks into the stage.
 *
 * The metronome's geometry, clock and drawing are in `rubato-metronome.ts`; the strokes in `rubato-hits.ts`.
 * Fletcher is the director's (close by, watching); this part draws nobody.
 */

/** How strong the measured snare stroke at `t` is: a tap's height follows it. */
const snareStrength = (t: number): number => SNARES.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a)).s

/** Where he lands on the crash: right of its bell, on its rising side; and how far he leans toward the metronome. */
const CRASH_LX = 0.32
const LEAN = 0.1

/* ------------------------------------------------------------------ the swell */

/**
 * How much of the rod's swing he rides at `T`: all of it while it keeps the rubato and from the cock on; none of the
 * roll's shimmer (he sits at the centre of the blur, and only the rod trembles). Through the collapse into the
 * shimmer he lets go of the swing smoothly. The shimmer is gone by the cock, so taking the swing back there is seamless.
 */
function rides(T: number): number {
  if (T <= RIDE_END || T >= COCK) return 1
  return 1 - smooth(T, RIDE_END, RIDE_END + 0.45)
}
/** Where he is on the weight at `T`: the rod's angle as far as he rides it (the metronome's `riding`, steadied). */
const seated = (T: number): Pt => {
  const th = rodAt(T) * rides(T)
  const r = weightAt(T)
  return [PIVOT_X + r * Math.sin(th), PIVOT_Y + lift(T) - r * Math.cos(th)]
}

/** How far through the swell `T` is, 0..1: by the clock and by the music's level together. */
function swell(T: number): number {
  const clock = smooth(T, RIDE_END + 0.6, COCK - 0.3)
  const loud = clamp((level(T) - 0.3) / 0.26)
  return 0.6 * clock + 0.4 * loud * smooth(T, RIDE_END, RIDE_END + 1.5)
}

const rgb = (hex: string): string => `${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}`
/** The stage's gold, and the burst's white-gold. */
const GOLD = rgb('#E3B05B')
const FLASH = rgb('#FFF1CF')
/** The swell's light on the stage at `T` (added to the hall's), held after the burst and let down slowly. */
function swellLight(T: number): number {
  const at = (u: number) => 0.1 * swell(u) * smooth(u, RIDE_END + 0.3, RIDE_END + 2)
  if (T <= RIDE_END) return 0
  if (T < LAND) return at(T)
  return at(LAND) * (1 - smooth(T, LAND + 0.4, LAND + 4.5))
}
/** The burst: the hall's light slams up on the landing, and comes down long and damped. */
function slam(T: number): number {
  const s = T - LAND
  if (s < 0 || s > 9) return 0
  return 0.2 * Math.exp(-s / 0.3) + 0.09 * Math.exp(-s / 1.7)
}

/** The hall's light rising with the swell, and slamming up on the burst: over the whole stage, and a pool on the snare. */
function drawLight(p: p5, c: Ctx, T: number): void {
  const wash = swellLight(T) + 0.55 * slam(T)
  const pool = slam(T)
  if (wash < 0.003 && pool < 0.003) return
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const glow = (x: number, y: number, r: number, color: string, a: number) => {
    if (a < 0.003) return
    const g = ctx.createRadialGradient(x * k, y * k, 0, x * k, y * k, r * k)
    g.addColorStop(0, `rgba(${color}, ${a.toFixed(3)})`)
    g.addColorStop(0.55, `rgba(${color}, ${(a * 0.45).toFixed(3)})`)
    g.addColorStop(1, `rgba(${color}, 0)`)
    ctx.fillStyle = g
    ctx.fillRect((x - r) * k, (y - r) * k, 2 * r * k, 2 * r * k)
  }
  // Over the stage: the metronome, the kit and the podium.
  glow(-0.8, -1.9, 9, GOLD, wash)
  // On the snare where he lands.
  glow(KIT_AT[0], KIT_AT[1] - 0.3, 2.6, FLASH, pool)
  ctx.restore()
}

/** A lane written forward in show time: rests, flights under gravity, and rides on things that move. */
class Path {
  readonly segs: Seg[] = []
  constructor(
    public t: number,
    public p: Pt,
  ) {}
  private to(q: Pt, at: number, extra: Partial<Seg> = {}): void {
    if (at <= this.t) return
    this.segs.push({ from: this.p, to: q, dur: at - this.t, ...extra })
    this.t = at
    this.p = q
  }
  /** Still where he is until `until`. */
  rest(until: number): void {
    this.to(this.p, until)
  }
  /** A flight to `q`, landing at `at`: the parabola gravity `g` draws in that time. */
  hop(q: Pt, at: number, g = G_EARTH): void {
    const T = at - this.t
    this.to(q, at, { arc: (g * T * T) / 8 })
  }
  /** Carried by `fn` (a point of show time) until `until`, sampled `hz` a second and on every one of `marks`. */
  ride(fn: (T: number) => Pt, until: number, hz: number, marks: readonly number[] = []): void {
    const cuts = [this.t, ...marks.filter((m) => m > this.t + 1e-6 && m < until - 1e-6), until]
    for (let i = 1; i < cuts.length; i++) {
      const a = cuts[i - 1]
      const b = cuts[i]
      const n = Math.max(1, Math.ceil((b - a) * hz))
      for (let j = 1; j <= n; j++) {
        const T = j === n ? b : a + ((b - a) * j) / n
        this.to(fn(T), T)
      }
    }
  }
}

export const rubato = part<{ begin: number }>(
  {
    name: 'rubato',
    draw: (p, s, c) => {
      const T = s.begin + c.t
      drawMetronome(p, c, T)
      drawLight(p, c, T)
    },
  },
  (slot) => {
    const snare = (since: number) => seatOnDrum(SNARE, 0.045, since)
    // On the rack tom left of its middle, so the leap to the crash clears the crash's rim.
    const rack = (since: number) => seatOnDrum(RACK, 0.05, since, -0.2)
    const path = new Path(slot.begin, snare(Infinity))

    // The wind-up: soft taps on the snare, each a small lift and a landing that the head gives under.
    let last = -Infinity
    for (const t of TAPS) {
      const lift = 0.07 + 0.09 * clamp((snareStrength(t) - 0.6) / 0.25)
      const air = 0.24
      if (last > -Infinity) path.ride((T) => snare(T - last), Math.min(last + 0.3, t - air), 120)
      path.rest(t - air)
      path.hop(snare(0), t, (8 * lift) / (air * air))
      last = t
    }
    // Off the last tap, up onto the rack tom: a long hop, high enough to clear its rim.
    path.hop(rack(0), RACK_AT)
    path.ride((T) => rack(T - RACK_AT), RACK_AT + 0.3, 120)
    path.rest(RACK_TAP - 0.2)
    path.hop(rack(0), RACK_TAP, (8 * 0.07) / (0.2 * 0.2))
    // The leap onto the crash, riding it as it swings under him; a lean toward the metronome (his glance at it),
    // and the leap onto the weight.
    const lean = (T: number) => CRASH_LX - LEAN * easeInSine(clamp((T - (BOARD - 1.0)) / 0.4))
    const onCrash = (T: number) => seatOnCymbal(CRASH, lean(T), cymbalSwing(T - CRASH_AT, 0.16, 1.2))
    path.hop(onCrash(CRASH_AT), CRASH_AT)
    path.ride(onCrash, BOARD - 0.6, 120)
    path.hop(riding(BOARD), BOARD)
    // On the weight: every stroke a sample, and the swing between them; the roll (still, at the centre of the
    // shimmer); the lean back; the toss.
    path.ride(seated, RELEASE, 100, [...RIDE, RIDE_END + 1e-3, RIDE_END + 0.45, COCK])
    // Free, onto the snare, on the burst.
    path.hop(LANDING, slot.end)

    return {
      cells: box(-5, -6, 2, 3),
      exit: [0, 0] as Pt,
      lane: { segs: path.segs, fire: RIDE[0] - slot.begin },
      state: { begin: slot.begin },
    }
  },
  (slot) => {
    const at = (x: number, y: number): Pt => [x, y]
    const M = PIVOT_X
    return [
      // On the kit, where the build left him; back and up as the metronome rises behind it.
      { t: slot.begin, cells: CLOSE.cells, hold: CLOSE.hold, w: 1 },
      { t: 425.4, cells: 4.8, hold: at(-1.3, -0.9), w: 1 },
      { t: 428.8, cells: 6.3, hold: at(-1.45, -1.75), w: 1 },
      // The climb, and onto the weight: the metronome's head, the two cymbals, the swing.
      { t: 431.3, cells: 6.1, hold: at(-1.5, -2.05), w: 1 },
      { t: 433.6, cells: 5.4, hold: at(M, -2.55), w: 1 },
      // Slowing: in, and up with him, drifting a little toward the ride as it nears the slowest stroke (on the ride).
      { t: 442, cells: 5.15, hold: at(M, -2.7), w: 1 },
      { t: 451, cells: 4.8, hold: at(M - 0.2, -2.9), w: 1 },
      { t: 458.6, cells: 4.5, hold: at(M - 0.3, -3.0), w: 1 },
      // Quickening: back out, drifting back.
      { t: 466, cells: 4.8, hold: at(M + 0.1, -2.9), w: 1 },
      { t: 474, cells: 5.4, hold: at(M, -2.6), w: 1 },
      { t: 481, cells: 6.2, hold: at(-1.8, -2.2), w: 1 },
      // The roll: in on him as the swing collapses into the shimmer; then one long draw back through the swell as
      // the blur widens and the light rises, to the whole machine, the kit and Fletcher on his podium; then down
      // with him as the rod flings him, landing close on the snare on the burst (the finale's key there is CLOSE).
      { t: 485.0, cells: 4.4, hold: at(M + 0.15, -3.25), w: 1 },
      { t: 502.2, cells: 8.6, hold: at(-1.0, -1.7), w: 1 },
      { t: 503.35, cells: 5.6, hold: at(-1.6, -2.2), w: 1 },
      { t: slot.end, cells: CLOSE.cells, hold: CLOSE.hold, w: 1 },
    ]
  },
)
