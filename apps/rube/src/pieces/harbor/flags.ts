import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { easeInQuad, easeOutBack, easeOutCubic } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, over, rail, roll, trace, type Lane, type Pt } from '../../parts'
import { WATER, luminance, piling, seaWater, splash, water } from './sea'

/**
 * A signal mast on the pier. Three flags, a pennant, a square and a
 * swallowtail, are bent on to the halyard a finger apart, rolled
 * up tight against the mast; the halyard goes over the sheave at the
 * masthead and down the far side, through the deck, to a lead weight held
 * up under the planks by a pawl. A plank of the deck is a treadle: the
 * ball's weight sinks it, the pawl under it is knocked away, and the
 * lead drops into the water — and the hoist runs up the mast by as much as
 * the lead went down, each flag breaking out as it clears the ball's
 * height, to fly there for good. Punctuation: the ball barely notices.
 */
/** The treadle: a plank hinged at its west end, and how far its east end sinks. */
const HINGE = -0.44
const PLANK_E = -0.19
const SINK = 0.016
/** The mast, the sheave on its head, and where the two parts of the halyard hang. */
const MAST = -0.04
const SHEAVE: Pt = [MAST, -0.44]
const SHEAVE_R = 0.065
const HOIST_X = MAST + SHEAVE_R
const FALL_X = MAST - SHEAVE_R
/**
 * Three flags down the hoist, a finger of halyard between each; how far the
 * hoist runs; the height each flag's middle breaks out at: clear of the
 * ball's top while it is under them. A hoist is read by its shapes before
 * its colours, so the three are the three shapes a signal locker has,
 * a pennant, a square and a swallowtail, each its own length.
 */
const FLAGS = 3
const PITCH = 0.1
const FLAG_H = 0.08
const FLAG_W = [0.31, 0.2, 0.27]
const TOP = -0.42
const RUN = 0.22
const BREAK = [-0.225, -0.225, -0.15]
/** The lead under the deck: where it hangs, and how long it takes to fall the run. */
const LEAD_W = 0.08
const LEAD_H = 0.1
const LEAD_Y = FLOOR + 0.04 + LEAD_H / 2
const FALL = 0.32

/** When the ball is over the hinge, when its weight has the plank down, and when it is off the plank. */
const T_ON = (HINGE + 0.5) / ROLL
const PRESS = 0.05
const FIRE = T_ON + PRESS
const T_OFF = (PLANK_E + 0.5) / ROLL

/** How far the plank is down, 0 to 1: pressed as the ball comes onto it, sprung back once it is off. */
const pressAt = (t: number) => (t < T_ON ? 0 : t < T_OFF ? over(t, T_ON, FIRE) : 1 - easeOutCubic(over(t, T_OFF, T_OFF + 0.18)))
const plankAngle = (t: number) => Math.atan(SINK / (PLANK_E - HINGE)) * pressAt(t)
/** Where the ball's rim meets the fixed deck's corner, coming up off the sunken plank. */
const CORNER = PLANK_E - Math.sqrt(2 * R * SINK - SINK * SINK)
/** The ball on the plank: on the rail's line, lowered by as much as the plank has sunk under it, and up over the deck's corner at its end. */
const onPlank = (t: number): Pt => {
  const x = -0.5 + ROLL * t
  const dip = (at: number) => (at - HINGE) * Math.tan(plankAngle(t))
  return [x, x <= CORNER ? dip(x) : dip(CORNER) * (1 - over(x, CORNER, PLANK_E))]
}
const RIDE = trace(onPlank, T_ON, T_OFF, 10)
const LANE: Lane = {
  segs: [roll([-0.5, 0], [HINGE, 0], ROLL), ...RIDE, roll([PLANK_E, 0], [0.5, 0], ROLL)],
  fire: FIRE,
}

/** How far the hoist has run, in cells: with the lead's fall, and a bounce as it fetches up. */
function runAt(since: number): number {
  if (since < 0) return 0
  if (since < FALL) return RUN * easeInQuad(since / FALL)
  const s = since - FALL
  return RUN * (1 - 0.05 * Math.exp(-s * 7) * Math.cos(s * 26))
}

export const flags = definePiece<{ color: string }>({
  name: 'flags',
  weight: 0.8,
  place: ({ color, fits }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight, theme }) => {
    const run = runAt(since)
    const angle = plankAngle(t)
    // The hoist's colours: the piece's own first, then round the palette,
    // leaving out any so near the paper that a flag of it would be a hole in the hoist.
    const paper = luminance(bg)
    const bold = theme.colors.filter((c) => Math.abs(luminance(c) - paper) > 0.25)
    const at = Math.max(0, bold.indexOf(s.color))
    const colours = Array.from({ length: FLAGS }, (_, i) => bold[(at + i) % bold.length])

    water(p, k, ink, weight, -0.5, 0.5)
    piling(p, k, ink, weight, 0.36)
    // The deck, with the treadle let into it.
    rail(p, k, ink, weight, -0.5, HINGE)
    rail(p, k, ink, weight, PLANK_E, 0.5)
    // The mast: a spar from the seabed up through the deck, with the sheave on its head.
    outline(p, ink, weight * 1.3)
    p.line(MAST * k, 0.5 * k, MAST * k, SHEAVE[1] * k)
    outline(p, ink, weight)
    p.line((MAST - 0.06) * k, 0.5 * k, (MAST + 0.06) * k, 0.5 * k)
    // The halyard: down the far side through the deck to the lead, and down the near side to its cleat.
    const leadY = LEAD_Y + run
    outline(p, ink, weight * 0.5)
    p.line(FALL_X * k, SHEAVE[1] * k, FALL_X * k, (leadY - LEAD_H / 2) * k)
    p.line(HOIST_X * k, SHEAVE[1] * k, HOIST_X * k, (FLOOR - 0.03) * k)
    solid(p, ink, weight, bg)
    p.circle(SHEAVE[0] * k, SHEAVE[1] * k, SHEAVE_R * 2 * k)
    p.push()
    p.translate(SHEAVE[0] * k, SHEAVE[1] * k)
    p.rotate(run / SHEAVE_R)
    outline(p, ink, weight * 0.8)
    p.line(-SHEAVE_R * 0.55 * k, 0, SHEAVE_R * 0.55 * k, 0)
    p.pop()

    // The flags, head to tail down the hoist: rolled against the mast until each clears the break.
    for (let i = 0; i < FLAGS; i++) {
      const y = TOP + RUN - run + (i + 0.5) * PITCH
      const open = since < 0 ? 0 : easeOutBack(over(y, BREAK[i] + 0.005, BREAK[i] - 0.03))
      flag(p, k, ink, weight, colours[i], colours[(i + 2) % FLAGS], HOIST_X, y, open, t * 7 - i * 1.3, i)
    }

    // The treadle.
    p.push()
    p.translate(HINGE * k, FLOOR * k)
    p.rotate(angle)
    solid(p, ink, weight, s.color)
    p.rect(((PLANK_E - HINGE) / 2) * k, 0.012 * k, (PLANK_E - HINGE) * k, 0.04 * k, 0.008 * k)
    p.pop()
    solid(p, ink, weight, ink)
    p.circle(HINGE * k, (FLOOR + 0.012) * k, 0.035 * k)
    // The pawl under the treadle's free end: a finger under the lead's lug, knocked away at the fire.
    const away = since < 0 ? 0 : easeOutCubic(over(since, 0, 0.1))
    p.push()
    p.translate((PLANK_E - 0.06) * k, (FLOOR + 0.05) * k)
    p.rotate(0.3 + 1.2 * away)
    outline(p, ink, weight)
    p.line(0, 0, (FALL_X - LEAD_W / 2 - PLANK_E + 0.06) * k, 0)
    p.pop()

    // The lead: a block with a lug for the pawl and an eye for the halyard; it goes to the bottom and stays.
    solid(p, ink, weight, s.color)
    p.rect(FALL_X * k, leadY * k, LEAD_W * k, LEAD_H * k, 0.012 * k)
    p.fill(ink)
    p.noStroke()
    p.rect(FALL_X * k, (leadY - LEAD_H / 2 + 0.02) * k, LEAD_W * k, 0.03 * k)
    // It breaks the surface part way down.
    const wet = FALL * Math.sqrt((WATER - LEAD_Y - LEAD_H / 2) / RUN)
    splash(p, k, seaWater(theme), weight, FALL_X - 0.04, WATER, over(since, wet, wet + 0.5), 0.7)
  },
})

/**
 * One signal flag on the hoist at (x, y): rolled to a finger's width at
 * `open` 0, flying at 1, its fly rippling on `phase`. Three shapes, so the
 * hoist reads as a signal and not as bunting: a pennant that tapers to a
 * blunt point, a square halved in two colours, and a swallowtail.
 */
function flag(p: p5, k: number, ink: string, weight: number, color: string, second: string, x: number, y: number, open: number, phase: number, kind: number): void {
  const w = 0.05 + (FLAG_W[kind % 3] - 0.05) * open
  const h = FLAG_H
  const ripple = (u: number) => 0.016 * open * u * Math.sin(phase - u * 5)
  const N = 6
  /** Half the flag's height at `u` along it: a pennant tapers as it opens, the others are square-cut. */
  const half = (u: number) => (kind % 3 === 0 ? (h / 2) * (1 - 0.72 * u * open) : h / 2)
  const shape = (u0: number, u1: number, inset: number, tail: boolean) => {
    p.beginShape()
    for (let j = 0; j <= N; j++) {
      const u = u0 + ((u1 - u0) * j) / N
      p.vertex((x + w * u) * k, (y - half(u) + inset + ripple(u)) * k)
    }
    if (tail) p.vertex((x + w * (u1 - 0.32 * open)) * k, (y + ripple(u1 - 0.32)) * k)
    for (let j = N; j >= 0; j--) {
      const u = u0 + ((u1 - u0) * j) / N
      p.vertex((x + w * u) * k, (y + half(u) - inset + ripple(u)) * k)
    }
    p.endShape(p.CLOSE)
  }
  // Rolled, the flag is a band of its colour on the hoist: a thinner line, so the colour is not lost in it.
  solid(p, ink, weight * (open > 0.2 ? 0.9 : 0.6), color)
  shape(0, 1, 0, kind % 3 === 2)
  // The square is halved: its fly in a second colour.
  if (open > 0.5 && kind % 3 === 1) {
    solid(p, ink, weight * 0.6, second)
    shape(0.5, 1, 0, false)
  }
}
