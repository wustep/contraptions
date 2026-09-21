import { outline, solid } from '../../../../../../src/core/draw'
import { R, ROLL, definePiece, laneAt, rail, ramp, roll, type Lane, type Pt } from '../../../parts'
import { brassOf } from './parts-f'
import { snow, snowAt } from './snow'

/**
 * A strap of sleigh bells, slung in a swag between two poles across the
 * track. Five round bells ride the strap, and the lowest hangs a finger's
 * width into the ball's way. The ball brushes under it and lifts it; the
 * bell drops back jingling, and the jingle runs out along the strap both
 * ways, bell to bell, each swinging a little later and a little less than
 * the one that woke it, and dies. Punctuation: the ball is hardly checked.
 *
 * The wave is a struck rope's, across the strap: each bell is thrown up off
 * the strap's line and falls back through it, one damped swing from the
 * moment the ball touches the lowest, and the strap is drawn through the
 * bells, so it ripples because they do. The lowest bell is never inside the
 * ball: while the ball is under it, it rides up over the ball's crown.
 */
/** The poles, the height of their tops, and the lowest bell at rest. */
const POLE = 0.45
const TOP = -0.46
const TIE = TOP + 0.03
const LOW = -0.165
/** The bells: how far apart along the track, and how big. */
const STEP = 0.16
const BELL = 0.07
/** Where the ball first touches the lowest bell, and how much the brush checks it. */
const X_TOUCH = -Math.sqrt((R + BELL) ** 2 - LOW ** 2)
const CHECK = 2.25
const T_TOUCH = (X_TOUCH + 0.5) / ROLL
/** The wave: how long it takes to reach the next bell, how much of it arrives, how fast it swings and dies. */
const HOP = 0.06
const PASS = 0.62
const SWING = 15
const DIE = 2.6
const KICK = 0.065

const LANE: Lane = {
  segs: [roll([-0.5, 0], [X_TOUCH, 0], ROLL), ramp([X_TOUCH, 0], [0, 0], ROLL, CHECK), ramp([0, 0], [-X_TOUCH, 0], CHECK, ROLL), roll([-X_TOUCH, 0], [0.5, 0], ROLL)],
  fire: T_TOUCH,
}

/** Where bell `i` (-2 to 2) hangs at rest: on a parabola from pole to pole through the lowest. */
const restOf = (i: number): Pt => [i * STEP, LOW + (TIE - LOW) * ((i * STEP) / POLE) ** 2]

/** Bell `i`, `since` seconds after the touch: thrown up off the strap's line and falling back through it, and rocking as it jingles. */
function bellAt(i: number, since: number, ballX: number): { at: Pt; turn: number } {
  const [rx, ry] = restOf(i)
  const tau = since - Math.abs(i) * HOP
  let x = rx
  let y = ry
  let turn = 0
  if (tau > 0) {
    const a = KICK * PASS ** Math.abs(i) * Math.exp(-tau * DIE) * Math.sin(tau * SWING)
    // A struck rope's wave is across it: the bell moves along the strap's normal there, up first, as the ball threw it.
    const slope = (2 * (TIE - LOW) * rx) / (POLE * POLE)
    const len = Math.hypot(1, slope)
    x += (a * slope) / len
    y -= a / len
    turn = 7 * a * (i % 2 === 0 ? 1 : -1)
  }
  // Never inside the ball: while the ball is under it, it rides up over the ball's crown.
  const dx = x - ballX
  if (Math.abs(dx) < R + BELL) y = Math.min(y, -Math.sqrt((R + BELL) ** 2 - dx * dx))
  return { at: [x, y], turn }
}

export const sleighbells = definePiece<{ bell: string }>({
  name: 'sleighbells',
  weight: 0.9,
  place: ({ fits, theme, ball }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    // Bells are brass, whatever colour the map hands the piece.
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane: LANE, state: { bell: brassOf(theme, ball.color) } }
  },
  draw: (p, s, { k, t, since, ink, weight }) => {
    snow(p, k, ink, weight, -0.5, 0.5)
    rail(p, k, ink, weight, -0.5, 0.5)
    // The poles, stood in the snow behind the track.
    outline(p, ink, weight)
    for (const x of [-POLE, POLE]) p.line(x * k, TOP * k, x * k, (snowAt(x) + 0.03) * k)

    const ballX = t < 0 ? -9 : laneAt(LANE, t).x
    const bells = [-2, -1, 0, 1, 2].map((i) => bellAt(i, since, ballX))

    // The strap: from pole to pole through every bell, one heavy line of leather.
    const through: Pt[] = [[-POLE, TIE], ...bells.map((b) => b.at), [POLE, TIE]]
    outline(p, ink, weight * 1.5)
    p.beginShape()
    p.curveVertex(through[0][0] * k, through[0][1] * k)
    for (const [x, y] of through) p.curveVertex(x * k, y * k)
    p.curveVertex(through[through.length - 1][0] * k, through[through.length - 1][1] * k)
    p.endShape()

    // The bells: round, a slit across the mouth that rocks as they jingle.
    for (const b of bells) {
      p.push()
      p.translate(b.at[0] * k, b.at[1] * k)
      p.rotate(b.turn)
      solid(p, ink, weight, s.bell)
      p.circle(0, 0, BELL * 2 * k)
      outline(p, ink, weight * 0.8)
      p.line(-BELL * 0.5 * k, BELL * 0.28 * k, BELL * 0.5 * k, BELL * 0.28 * k)
      p.pop()
    }
  },
})
