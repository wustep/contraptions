import { outline } from '../../../../../src/core/draw'
import { easeInOutSine, easeOutBack } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, arrive, arriveAt, definePiece, over, rail, ramp, rankBy, wait, type Lane, type Pt } from '../../parts'
import { bloom, leaf, pot, stem } from './green'

/**
 * A vine on a trellis. A pot at the foot with one big leaf lying across
 * the path; the ball rolls onto the leaf and it sags, and the vine wakes:
 * the stem shoots up the trellis carrying the leaf and the ball with it,
 * side leaves unfurling as it passes, one or two floors to a rail at the
 * top. There the flower opens, the leaf droops toward the rail under the
 * ball's weight, and the ball rolls down it and off — on, or back the way
 * it came. The vine stays grown, the leaf stays drooped.
 */
export interface VineState {
  color: string
  floors: number
  turn: 1 | -1
}

const ARRIVE = arriveAt(0)
const WAKE = 0.3
/** The leaf holds the ball this far above the rail at the top, and droops by this much to let it go. */
const HOLD = 0.05
const DROOP = 0.22
const DROOP_AT = 0.05
const DROOP_T = 0.3
/** The ball starts rolling this long after the leaf starts to droop, and leaves it here. */
const ROLL_AT = 0.12
const OFF = 0.22
const growTime = (floors: number) => 0.5 + 0.6 * floors

export const vine = definePiece<VineState>({
  name: 'vine',
  weight: 1.1,
  place: ({ rng, color, fits, taste }) => {
    const tall = taste.weights['lift-tall'] ?? 1
    const options = rng.shuffle([1, 2].flatMap((floors) => [1, -1].map((turn) => ({ floors, turn: turn as 1 | -1 }))))
    for (const { floors, turn } of rankBy(rng, options, (o) => Math.pow(tall, o.floors - 1))) {
      const cells: Pt[] = []
      for (let i = 0; i <= floors; i++) cells.push([0, -i])
      const exit: Pt = [turn, -floors]
      if (!fits(cells, exit)) continue
      const lane: Lane = {
        segs: [
          ...arrive([-0.5, 0], [0, 0]),
          wait([0, 0], WAKE),
          { from: [0, 0], to: [0, -floors - HOLD], dur: growTime(floors), ease: 'inout' },
          wait([0, -floors - HOLD], ROLL_AT),
          ramp([0, -floors - HOLD], [turn * OFF, -floors], 0, 1.4),
          ramp([turn * OFF, -floors], [turn * 0.5, -floors], 1.4, ROLL),
        ],
        fire: ARRIVE + WAKE,
      }
      return { cells, exit: { at: exit, dir: turn }, lane, state: { color, floors, turn } }
    }
    return null
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const { floors, turn } = s
    const top = -floors
    const grow = growTime(floors)
    const up = since < 0 ? 0 : easeInOutSine(over(since, 0, grow))
    const y = up * (top - HOLD)
    // At the top the leaf droops toward the rail, and the ball rolls down it.
    const droop = since < grow + DROOP_AT ? 0 : DROOP * easeInOutSine(over(since, grow + DROOP_AT, grow + DROOP_AT + DROOP_T))
    // The leaf sags under the ball, and quivers before the vine wakes.
    const sag = t < ARRIVE ? 0 : 0.02 * Math.min(1, over(t, ARRIVE, ARRIVE + 0.1))
    const quiver = t > ARRIVE + 0.1 && since < 0 ? 0.03 * Math.sin(t * 40) * over(t, ARRIVE + 0.1, ARRIVE + WAKE) : 0

    // The trellis: an open lattice behind everything, from the pot to above
    // the top rail — wide diamonds, light lines, so the vine reads over it.
    const lat0 = 0.3
    const lat1 = top - 0.35
    p.push()
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.beginPath()
    ctx.rect(-0.3 * k, lat1 * k, 0.6 * k, (lat0 - lat1) * k)
    ctx.clip()
    outline(p, ink, weight * 0.6)
    const span = lat0 - lat1
    for (let d = -span; d <= 0.6; d += 0.5) {
      p.line((-0.3 + d) * k, lat0 * k, (-0.3 + d + span) * k, lat1 * k)
      p.line((0.3 - d) * k, lat0 * k, (0.3 - d - span) * k, lat1 * k)
    }
    p.pop()
    outline(p, ink, weight)
    for (const x of [-0.3, 0.3]) p.line(x * k, 0.5 * k, x * k, lat1 * k)
    p.line(-0.32 * k, lat1 * k, 0.32 * k, lat1 * k)
    // The rails: in, to the leaf; out, from the stem at the top.
    rail(p, k, ink, weight, -0.5, -0.24)
    rail(p, k, ink, weight, turn * 0.16, turn * 0.5, top + FLOOR)
    // The pot, and the stem growing out of it up to the leaf.
    pot(p, k, ink, weight, s.color, 0, 0.5, 0.34, 0.2)
    const stemTop = y + R + 0.04 + sag
    stem(p, k, ink, weight * 1.3, 0.02, 0.3, 0, stemTop, 0.06 * Math.sin(t * 2) * (1 + up))
    // Side leaves along the stem, unfurling as the stem passes them.
    for (let ly = 0.05; ly > top + 0.25; ly -= 0.28) {
      const side = Math.round((0.05 - ly) / 0.28) % 2 ? -1 : 1
      const open = ly > stemTop ? Math.min(1, (ly - stemTop) / 0.2) : 0
      if (open <= 0) continue
      const len = 0.18 * easeOutBack(open)
      leaf(p, k, ink, weight, s.color, 0.01, ly, len, side > 0 ? -0.6 : Math.PI + 0.6)
    }
    // Tendrils curling off the stem.
    if (up > 0.2) {
      outline(p, ink, weight * 0.8)
      p.noFill()
      for (const [ly, side] of [
        [top + 0.5, 1],
        [top + 0.9, -1],
      ] as [number, number][]) {
        if (ly < stemTop) continue
        p.arc((0.03 + side * 0.06) * k, ly * k, 0.1 * k, 0.1 * k, side > 0 ? Math.PI : 0, side > 0 ? Math.PI * 2.6 : Math.PI * 1.6)
      }
    }
    // The flower at the top, opening once the ball is up.
    const opened = since > grow ? over(since, grow, grow + 0.5) : 0
    if (opened > 0) bloom(p, k, ink, weight, s.color, bg, -0.08 * turn, top - 0.2, 0.09, 6, opened, since)
    // The big leaf the ball rides: under the ball, sagging, in front of the
    // stem; it lies with its tip toward the way out, and droops there.
    p.push()
    p.translate(0, (y + R + 0.02 + sag) * k)
    p.rotate(quiver + turn * droop)
    leaf(p, k, ink, weight, s.color, -turn * 0.24, 0.02, 0.48, turn > 0 ? 0 : Math.PI, 0.3)
    p.pop()
  },
})
