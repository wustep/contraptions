import { outline, solid } from '../../../../../../src/core/draw'
import { clamp, easeInOutSine, easeInQuad, easeOutQuad } from '../../../../../../src/core/ease'
import { FAST, R, ROLL, arrive, arriveAt, definePiece, ramp, wait, type Lane, type Pt } from '../../../parts'
import { feltColor, stage } from './hall'
import { brassFor, ivoryFor, partColor } from './parts-a'

/**
 * A metronome as tall as two cells stands behind the line, its rod clipped
 * upright at the head of the case, and a felt hammer on an arbor in its
 * front is cocked back over the ball's way in. The ball rolls in under the
 * hammer and comes to rest in front of the case. The clip lets the rod go:
 * tick, to the east; tock, to the west; tick; and on the fourth beat, as
 * the rod reaches the west again, the hammer comes down on the ball's back
 * and sends it off twice as fast as it came. This is the bar bell of a
 * real metronome, which strikes on the first of every four, with a ball
 * where the bell would be. The rod ticks on for a bar by itself and runs
 * down to upright, the clip drops over it, and the works wind the hammer
 * back.
 *
 * The rod is a pendulum on a clock: every beat is the same length, the
 * hammer's blow lands on a beat and not after it, and the ball's wait is
 * three and a half of them.
 */
/** The case: where it stands, its half widths at the floor and at the head, and its head's height. */
const MX = 0.1
const BASE = 0.34
const CROWN = 0.09
const TOP = -1.22
const halfAt = (y: number) => CROWN + ((BASE - CROWN) * (y - TOP)) / (0.5 - TOP)
/** The rod: its pivot, its length, how far it swings, and where the weight sits on it. */
const PIVOT: Pt = [MX, -0.3]
const ROD = 0.86
const SWING = 0.42
const WEIGHT_AT = 0.52
/** A beat, and how long the clip takes to let go once the ball is at rest. */
const BEAT = 0.3
const UNCLIP = 0.08
/** The hammer: its arbor in the case's front, its arm, its felt head, and how far back it is cocked. */
const ARBOR: Pt = [MX - 0.16, -0.39]
const ARM = 0.36
/** The head is a mallet's: this long across the arm, this thick along it. */
const HEAD_L = 0.16
const HEAD_T = 0.1
const COCKED = 1.2
/** The blow takes this long to fall; the follow through goes this far past plumb. */
const WHIP = 0.11
const THROUGH = 0.42
/** The ball at rest: where the head's face, with the hammer hanging plumb, just touches its back. */
const XW = ARBOR[0] + HEAD_L / 2 + R

const START = arriveAt(XW) + UNCLIP
const KICK = START + 3.5 * BEAT
/** It ticks on for this many beats after the blow, then runs down over this long. */
const ON = 4
const RUN_DOWN = 1.5
const STILL = KICK + ON * BEAT + RUN_DOWN

const LANE: Lane = {
  segs: [...arrive([-0.5, 0], [XW, 0]), wait([XW, 0], KICK - arriveAt(XW)), ramp([XW, 0], [0.5, 0], FAST, ROLL)],
  fire: KICK,
}

/** The rod's lean to the east, `t` seconds into the piece. */
function rodAt(t: number): number {
  if (t <= START || t >= STILL) return 0
  const fade = 1 - easeInOutSine(clamp((t - (KICK + ON * BEAT)) / RUN_DOWN))
  return SWING * Math.sin((Math.PI * (t - START)) / BEAT) * fade
}
/** The hammer's angle back from plumb, `t` seconds into the piece: cocked, the blow, through, and wound back. */
function hammerAt(t: number): number {
  const s = t - KICK
  if (s <= -WHIP) return COCKED
  if (s <= 0) return COCKED * (1 - easeInQuad((s + WHIP) / WHIP))
  if (s <= 0.14) return -THROUGH * easeOutQuad(s / 0.14)
  if (s <= 0.5) return -THROUGH * (1 - easeInOutSine((s - 0.14) / 0.36))
  return COCKED * easeInOutSine(clamp((s - 0.9) / 1.4))
}

export const metronome = definePiece<{ color: string; face: string; brass: string }>({
  name: 'metronome',
  weight: 1,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, -1],
    ]
    if (!fits(cells, [1, 0])) return null
    const wood = partColor(theme, feltColor(theme, color, ball.color), ball.color)
    const face = ivoryFor(theme, ball.color, wood)
    return { cells, exit: { at: [1, 0], dir: 1 }, lane: LANE, state: { color: wood, face, brass: brassFor(theme, ball.color, wood, face) } }
  },
  draw: (p, s, { k, t, ink, weight }) => {
    // The case: a tall pyramid on the floor behind the line, a cap on its head, and the scale's plate up its front.
    solid(p, ink, weight, s.color)
    p.quad((MX - BASE) * k, 0.5 * k, (MX + BASE) * k, 0.5 * k, (MX + CROWN) * k, TOP * k, (MX - CROWN) * k, TOP * k)
    p.rect(MX * k, (TOP - 0.025) * k, (CROWN * 2 + 0.07) * k, 0.05 * k, 0.015 * k)
    const y0 = -0.2
    const y1 = TOP + 0.1
    solid(p, ink, weight * 0.8, s.face)
    p.quad((MX - halfAt(y0) + 0.085) * k, y0 * k, (MX + halfAt(y0) - 0.085) * k, y0 * k, (MX + halfAt(y1) - 0.05) * k, y1 * k, (MX - halfAt(y1) + 0.05) * k, y1 * k)

    // The rod on its pivot, with the sliding weight; and the clip at the case's head, down over its tip or sprung open.
    const a = rodAt(t)
    const tip: Pt = [PIVOT[0] + ROD * Math.sin(a), PIVOT[1] - ROD * Math.cos(a)]
    outline(p, ink, weight)
    p.line(PIVOT[0] * k, PIVOT[1] * k, tip[0] * k, tip[1] * k)
    p.push()
    p.translate((PIVOT[0] + ROD * WEIGHT_AT * Math.sin(a)) * k, (PIVOT[1] - ROD * WEIGHT_AT * Math.cos(a)) * k)
    p.rotate(a)
    solid(p, ink, weight * 0.8, s.brass)
    p.quad(-0.06 * k, 0.045 * k, 0.06 * k, 0.045 * k, 0.04 * k, -0.045 * k, -0.04 * k, -0.045 * k)
    p.pop()
    solid(p, ink, weight, ink)
    p.circle(PIVOT[0] * k, PIVOT[1] * k, 0.045 * k)
    const open = t > START - UNCLIP * 0.5 && t < STILL
    outline(p, ink, weight)
    if (open) p.line((MX + 0.02) * k, (TOP + 0.02) * k, (MX + 0.1) * k, (TOP + 0.02) * k)
    else p.line(MX * k, (TOP + 0.02) * k, MX * k, (TOP + 0.1) * k)

    stage(p, k, ink, weight, -0.5, 0.5)
  },
  over: (p, s, { k, t, ink, weight }) => {
    // The hammer, in front of the case and of the ball's way in: an arm on an arbor and a felt head.
    const h = hammerAt(t)
    p.push()
    p.translate(ARBOR[0] * k, ARBOR[1] * k)
    p.rotate(h)
    outline(p, ink, weight)
    p.line(0, 0, 0, ARM * k)
    solid(p, ink, weight, s.face)
    p.rect(0, ARM * k, HEAD_L * k, HEAD_T * k, 0.035 * k)
    p.pop()
    solid(p, ink, weight, s.brass)
    p.circle(ARBOR[0] * k, ARBOR[1] * k, 0.07 * k)
  },
})
