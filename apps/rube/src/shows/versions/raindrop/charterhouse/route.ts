import { R, type Pt } from '../../../../parts'
import { CISTERN, GATE, GUTTER, PIPE, RILL, SPUR, T1CH, T2CH, T3CH, chanY, gutterY, rillY } from './geo'
import { DOWN_TO } from './garden'
import { FLOAT_FROM, OUT, OVER_LIP, STEPS, afloat, stepAt } from './cistern'
import { OVER as HAMMER_OVER, inHammer, onChute } from './terraces'

/** Down the wall from each hammer onto the next terrace's channel: a beat after it goes over. */
const HAMMER_LAND = [at(46, 1), at(48, 1)]
/** Into each hammer's trough off its channel's end: the first offstage, the others a beat before they go over. */
const HAMMER_IN = [at(39, 3.5), at(47, 3), at(49, 3)]
import { BOARD, LET_GO, SPILL, inPot, spoonAt } from './noria'
import { AT_DOOR, IN_CATCH, IN_CUP, ON_ROOF, OPENS, TO_CHUTE, TO_STEP, cupAt, inCatch, roofY } from './gate'
import { INTO_BUCKET, LANDS, TIPS, bucketTop, onTile } from './garden'
import { BALL_START, TIP } from './jar'
import { at } from './music'
import { BallPath, Route } from './path'

/**
 * The ball's whole way, from the gutter's latch to the gate, every arrival on a note. Each stretch names the bars
 * it is timed to; the pieces it passes through read their own moments from here (`MOMENTS`).
 */

/** The pipe's lengths, top to bottom, each knocked as the ball comes down inside it. */
export const KNOCKS = [at(10, 0.5), at(10, 1), at(10, 1.5), at(10, 2), at(10, 3)]
/** Into the rainwater head: the end of the gutter, bar 10's downbeat. */
export const INTO_HEAD = at(10, 0)
/** Out of the shoe at the pipe's foot, into the rill: bar 11's downbeat. */
export const OUT_SHOE = at(11, 0)

const foot = (x: number, y: number): Pt => [x, y - R]

export function route(end: number): BallPath {
  const r = new Route(BALL_START, 0)
  r.rest(TIP)
  // Bars 9 and 10: along the gutter from the latch to its end, gathering pace.
  const gx = GUTTER.x1 - 0.08
  r.roll(INTO_HEAD - 0.12, [foot(gx, gutterY(gx))], 0.4, 4.4)
  // Off the gutter's end and down into the head.
  r.fly(INTO_HEAD, [PIPE.x - 0.05, PIPE.head.y0 + 0.25])
  // Inside the pipe: out of sight, down from length to length (`KNOCKS`), to the shoe.
  r.hide(OUT_SHOE - 0.16, [PIPE.mouth[0] - 0.05, PIPE.mouth[1]])
  // Out of the shoe and into the rill, a bounce, then away east along it.
  const land = foot(16.1, rillY(16.1))
  r.fly(OUT_SHOE, land)
  const land2 = foot(16.75, rillY(16.75))
  r.fly(at(11, 0.5), land2)
  // Bars 11 to 13: along the rill under the lemon tree, to its end over the first tile.
  const rx = RILL.x1 - 0.05
  r.roll(LANDS[0] - 0.12, [foot(rx, rillY(rx))], 1.6, 3.0)
  // Bars 14 to 18: the chime. Off the rill onto the first tile; on each, a rock in its hollow, a run east as it tips,
  // and a toss onto the next.
  r.fly(LANDS[0], onTile(0, LANDS[0]))
  for (let i = 0; i < LANDS.length; i++) {
    r.ride(TIPS[i], (t) => onTile(i, t))
    if (i + 1 < LANDS.length) r.fly(LANDS[i + 1], onTile(i + 1, LANDS[i + 1]))
  }
  // Bar 19: the last tile tosses it into the well's bucket.
  const [bx, by] = bucketTop(INTO_BUCKET)
  r.fly(INTO_BUCKET, [bx, by + 0.45])
  // In the bucket, out of sight, while the rain fills it; down the well with it from bar 27.
  const inBucket = (t: number): Pt => {
    const [x, y] = bucketTop(t)
    return [x, y + 0.45]
  }
  r.ride(DOWN_TO + 0.3, inBucket, true)
  // Bar 28: the bucket meets the water and tips; the ball floats out, and drifts east on the overflow's draw.
  r.fly(FLOAT_FROM, afloat(FLOAT_FROM))
  r.ride(OVER_LIP - 0.45, afloat)
  r.roll(OVER_LIP - 0.3, [[CISTERN.lip[0] + 0.15, CISTERN.lip[1] - 0.05 - R]])
  // Bars 32 to 34: down the overflow's three steps, one a bar, in the dark.
  for (let i = 0; i < STEPS.length; i++) {
    const [sx, sy] = stepAt(i)
    r.fly(STEPS[i], [sx - 0.65, sy])
    const next = i + 1 < STEPS.length ? STEPS[i + 1] - 0.22 : OUT - 0.32
    r.roll(next, [[sx + 0.95, sy]], 0.6, 1.4)
  }
  // Bar 35: out through the outlet in the terrace wall, into the storm, onto the first terrace's channel.
  r.roll(OUT - 0.04, [[CISTERN.outlet[0], CISTERN.outlet[1] - 0.02 - R]], 1.4, 2.2)
  const t1 = T1CH.x0 + 0.5
  r.fly(at(35, 0.5), [t1, chanY(T1CH, t1) - R])
  // Bars 35 to 39: along the first terrace in the rising storm, to the first hammer, and into it.
  const t1e = T1CH.x1 - 0.08
  r.roll(at(39, 3.5) - 0.3, [[t1e, chanY(T1CH, t1e) - R]], 1.4, 2.4)
  r.fly(at(39, 3.5), inHammer(0, at(39, 3.5)))
  // Bars 44 to 50: the hammers. Each goes over on a downbeat; the ball goes with the water down the wall, along the
  // next terrace, and into the next.
  const chans = [T2CH, T3CH]
  for (let i = 0; i < 3; i++) {
    r.ride(HAMMER_OVER[i], (t) => inHammer(i, t))
    if (i < 2) {
      const ch = chans[i]
      const x0 = ch.x0 + 0.55
      r.fly(HAMMER_LAND[i], [x0, chanY(ch, x0) - R])
      const xe = ch.x1 - 0.08
      r.roll(HAMMER_IN[i + 1] - 0.25, [[xe, chanY(ch, xe) - R]], 2.0, 4.0)
      r.fly(HAMMER_IN[i + 1], inHammer(i + 1, HAMMER_IN[i + 1]))
    }
  }
  // Bar 50: the last hammer empties it into the chute down the gully's wall, and the chute into the wheel's lowest pot.
  r.fly(at(50, 0.5), onChute(0.04))
  const chute: Pt[] = []
  for (let k = 1; k <= 12; k++) chute.push(onChute(0.04 + (0.96 * k) / 12))
  r.roll(BOARD - 0.22, chute, 1.5, 9)
  r.fly(BOARD, inPot(BOARD))
  // Bars 51 to 55: up the wheel, as the crescendo goes up.
  r.ride(SPILL, inPot)
  // Over the top: spilt into the sling's spoon.
  r.fly(at(55, 3.5), spoonAt(at(55, 3.5)))
  r.ride(LET_GO, spoonAt)
  // Bar 56: thrown. Over the gully onto the gate's roof, a bounce, then along the roof's ridge to the catch.
  const roof1 = 168.9
  r.fly(ON_ROOF, [roof1, roofY(roof1) - R])
  const roof2 = 169.9
  r.fly(at(56, 3), [roof2, roofY(roof2) - R])
  const re = GATE.roof.x1 - 0.1
  r.roll(IN_CATCH - 0.2, [[re, roofY(re) - R]], 1.2, 0.7)
  r.fly(IN_CATCH, inCatch(IN_CATCH))
  // Bars 60 to 63: in the catch, while the lantern goes down to the candle and comes up lit.
  r.ride(TO_CHUTE, inCatch)
  // Down the chute on the wall into the bell rope's cup: bar 64. Its weight rings the bell.
  const ch = GATE.chute
  r.roll(IN_CUP - 0.16, ch.map(([x, y]) => [x, y - R - 0.04] as Pt), 1.5, 5)
  const inCup = (t: number): Pt => {
    const [x, y] = cupAt(t)
    return [x, y - 0.25]
  }
  r.fly(IN_CUP, inCup(IN_CUP))
  r.ride(TO_STEP, inCup)
  // The bell done: out onto the doorstep, a bounce, and still against the door.
  const step: Pt = [GATE.door.x0 + 0.6, SPUR.y - R]
  r.fly(at(67, 3), step)
  r.fly(at(67, 3.5), [step[0] + 0.45, step[1]])
  r.roll(AT_DOOR, [[GATE.door.x0 + 1.5, SPUR.y - R]], 1.4, 0)
  r.rest(OPENS + 0.35)
  // Bar 79: the door opens and it goes in, first.
  r.roll(OPENS + 1.4, [[GATE.door.x0 + 2.4, SPUR.y - R - 0.25]], 0, 1.2)
  return r.build(end)
}

/** How big the ball looks: going in at the door, smaller as it goes away up the passage, then not at all. */
export function ballScale(t: number): number {
  const u = Math.max(0, Math.min(1, (t - (OPENS + 0.35)) / 1.05))
  return t > OPENS + 1.4 ? 0 : 1 - 0.3 * u
}
