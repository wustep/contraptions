// Order matters, and this line comes first: the strokes live in a file of their own, so that `strokes.ts` (which
// gathers every Carnegie part's `*_KIT` from here, and which the metronome's drawing below reads for the kit's
// clock) finds them set whichever of the two is loaded first.
export { RUBATO_KIT, RUBATO_HITS } from './rubato-hits'
import type { Pt, Seg } from '../../../../../parts'
import { clamp, easeInSine } from '../../../../../../../../src/core/ease'
import { CRASH, RACK, SNARE, cymbalSwing } from '../drums'
import { box, part } from '../kit'
import { RIDE, SNARES } from '../music'
import { G_EARTH } from '../physics'
import { BOARD, CRASH_AT, RACK_AT, RACK_TAP, TAPS } from './rubato-hits'
import { COCK, LANDING, PIVOT_X, RELEASE, RIDE_END, drawMetronome, riding, seatOnCymbal, seatOnDrum } from './rubato-metronome'
import { CLOSE } from './stage'

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
 * - 483.92, the roll, too fast to count: the swing collapses into a shimmer, a blur of the rod that grows with the
 *   swell while the camera pushes in on him, at the bottom of his range. The rod leans back with him and tosses him
 *   off: he lands on the snare on the burst (503.995). The rod, without its weight, rings down to upright and sinks
 *   into the stage.
 *
 * The metronome's geometry, clock and drawing are in `rubato-metronome.ts`; the strokes in `rubato-hits.ts`.
 * Fletcher is the director's (close by, watching); this part draws nobody.
 */

/** How strong the measured snare stroke at `t` is: a tap's height follows it. */
const snareStrength = (t: number): number => SNARES.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a)).s

/** Where he lands on the crash: right of its bell, on its rising side; and how far he leans toward the metronome. */
const CRASH_LX = 0.32
const LEAN = 0.1

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
    draw: (p, s, c) => drawMetronome(p, c, s.begin + c.t),
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
    // On the weight: every stroke a sample, and the swing between them; the roll; the lean back; the toss.
    path.ride(riding, RELEASE, 100, [...RIDE, RIDE_END + 1e-3, COCK])
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
      // The roll: the whole machine, the hall's light rising; then one long push in on him as the tremble grows, and
      // down with him onto the snare on the burst.
      { t: 486.5, cells: 6.8, hold: at(-1.65, -1.9), w: 1 },
      { t: 502.3, cells: 3.6, hold: at(M + 0.1, -2.3), w: 1 },
      { t: slot.end, cells: CLOSE.cells, hold: CLOSE.hold, w: 1 },
    ]
  },
)
