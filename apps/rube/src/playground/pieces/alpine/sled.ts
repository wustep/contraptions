import type p5 from 'p5'
import { outline, solid } from '../../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, flick, fly, rail, ramp, trace, type Lane, type Pt } from '../../../parts'
import { body, ride, rounded, trackOf } from './parts-b'
import { gearColor, powder, snowWhite } from './snow'

/**
 * A sledge at the head of a slope. It stands on the hill's crown with its
 * deck level with the rail and its nose out over the brink; the ball rolls
 * onto the deck and fetches up against the horns at its bow, and the thump
 * is enough: the sledge noses over and goes, slowly and then faster all
 * the way down, and runs its bow into a soft heap at the foot and stops
 * dead. Its tail kicks up, and the ball, which nothing was holding, is
 * pitched out over the horns and the heap onto the rail a floor down. The
 * sledge stays where it stuck.
 *
 * The slope is one line and the sledge is two points on it, so it rides the
 * brink and the foot the way a rigid thing does; the ball's seat is a place
 * on the deck, and the lane is that place for as long as the sledge has it.
 */
/** The crown the sledge stands on, a deck's height under the rail, and tipped a little toward the brink. */
const DECK = 0.12
const CROWN = FLOOR + DECK
const LINE = rounded([
  [-0.5, CROWN],
  [0.02, CROWN + 0.035, 0.2],
  [0.86, 1.36, 0.5],
  [1.5, 1.352],
])
const TRACK = trackOf(LINE)
/** Half the runners' length, and where on the deck the ball rides: against the horns. */
const HALF = 0.18
const SEAT = 0.05
/** The heap at the foot, and the rail beyond it. */
const HEAP: [number, number] = [0.95, 1.43]
const RAIL_X = 1.36
const G = 5.2
const DRAG = 0.3

/** The sledge with its middle `s` along the line: where that middle is, and how it lies. */
function pose(s: number): { x: number; y: number; a: number } {
  const a = TRACK.at(s - HALF).at
  const b = TRACK.at(s + HALF).at
  return { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, a: Math.atan2(b[1] - a[1], b[0] - a[0]) }
}
/** A place on the sledge, `along` its deck from the middle and `up` off its runners, in the cell. */
function on(s: number, along: number, up: number): Pt {
  const { x, y, a } = pose(s)
  return [x + along * Math.cos(a) + up * Math.sin(a), y + along * Math.sin(a) - up * Math.cos(a)]
}

/** Where it stands, and where its bow meets the heap. */
const S0 = TRACK.reach(-0.28)
const S_HEAP = TRACK.reach(HEAP[0] + 0.03) - HALF - 0.08
/** The ball rolls up the deck, slowing, to the horns; the thump sets the sledge going. */
const SEAT0 = on(S0, SEAT, DECK + R)
const ABOARD = ramp([-0.5, 0], SEAT0, ROLL, 0.5)
const T_GO = ABOARD.dur
const SHOVE = 0.55
/** The run down to the heap, and the plough into it. */
const RUN = ride(TRACK, S0, SHOVE, G, DRAG, (s) => s >= S_HEAP)
const V_HIT = RUN.v(RUN.dur)
const STOP = ride(TRACK, S_HEAP, V_HIT, 0, 0, (_s, v) => v <= 0.05, () => -70)
const T_HIT = T_GO + RUN.dur
const sledAt = (t: number): number => (t <= T_HIT ? RUN.s(t - T_GO) : STOP.s(t - T_HIT))
const seatAt = (t: number): Pt => on(sledAt(t), SEAT, DECK + R)

/** Pitched out at the pace the sledge had: over the horns and the heap, onto the rail's end. */
const OUT = seatAt(T_HIT)
const LAND: Pt = [RAIL_X + 0.03, 1]
const V_OUT = V_HIT * 0.8
const PITCH = (LAND[0] - OUT[0]) / V_OUT

const LANE: Lane = {
  segs: [ABOARD, ...trace(seatAt, T_GO, T_HIT, 40), fly(OUT, LAND, PITCH, 0.07), ramp(LAND, [1.5, 1], V_OUT, ROLL)],
  fire: T_HIT,
}

/** The sledge in its own frame: runners along y = 0, bow to the right. */
function sledge(p: p5, k: number, ink: string, weight: number, color: string): void {
  // The runner, curling up into the horn at the bow; three struts.
  outline(p, ink, weight * 1.15)
  p.noFill()
  p.beginShape()
  p.vertex(-0.22 * k, 0)
  p.vertex(0.13 * k, 0)
  p.bezierVertex(0.25 * k, 0, 0.29 * k, -0.1 * k, 0.215 * k, -(DECK + 0.1) * k)
  p.endShape()
  outline(p, ink, weight)
  for (const x of [-0.16, -0.02, 0.11]) p.line(x * k, 0, x * k, -(DECK - 0.07) * k)
  // The deck, and the horn's knob, which the ball fetches up against.
  solid(p, ink, weight, color)
  p.rect(-0.02 * k, -(DECK - 0.0375) * k, 0.4 * k, 0.075 * k, 0.02 * k)
  p.circle(0.215 * k, -(DECK + 0.1) * k, 0.055 * k)
}

export const sled = definePiece<{ color: string; white: string }>({
  name: 'sled',
  weight: 1,
  flight: true,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]
    if (!fits(cells, [2, 1])) return null
    return { cells, exit: { at: [2, 1], dir: 1 }, lane: LANE, state: { color: gearColor(theme, color, ball.color), white: snowWhite(theme) } }
  },
  draw: (p, s, { k, t, since, ink, weight }) => {
    body(p, k, ink, weight, s.white, LINE, 1.5, 0.95)
    rail(p, k, ink, weight, RAIL_X, 1.5, 1 + FLOOR)

    // The sledge: where it is, how it lies, and its tail kicked up about the bow when it sticks.
    const at = sledAt(Math.max(T_GO, t))
    const { x, y, a } = pose(at)
    const kick = since > 0 ? 0.3 * flick(since, 0.07, 0.12, 0.55) : 0
    p.push()
    p.translate(x * k, y * k)
    p.rotate(a)
    p.translate(HALF * k, 0)
    p.rotate(kick)
    p.translate(-HALF * k, 0)
    sledge(p, k, ink, weight, s.color)
    p.pop()
  },
  over: (p, s, { k, since, ink, weight }) => {
    // The heap, in front of the bow that ploughs into it: a mound on the slope's own line, which slumps when it is hit.
    const h = since > 0 ? 0.15 : 0.18
    const n = 24
    const ground = (x: number) => TRACK.at(TRACK.reach(x)).at[1]
    const top = (i: number): Pt => {
      const x = HEAP[0] + ((HEAP[1] - HEAP[0]) * i) / n
      return [x, ground(x) - h * Math.sin((Math.PI * i) / n) ** 2]
    }
    p.noStroke()
    p.fill(s.white)
    p.beginShape()
    for (let i = 0; i <= n; i++) p.vertex(top(i)[0] * k, top(i)[1] * k)
    // Filled a line's width into the hill, so the two are one snow; less where the hill thins toward its cell's edge.
    for (let i = n; i >= 0; i--) p.vertex(top(i)[0] * k, (ground(top(i)[0]) + 0.03 * Math.min(1, Math.max(0, (1.43 - top(i)[0]) / 0.1))) * k)
    p.endShape(p.CLOSE)
    outline(p, ink, weight)
    p.beginShape()
    for (let i = 0; i <= n; i++) p.vertex(top(i)[0] * k, top(i)[1] * k)
    p.endShape()
    powder(p, k, ink, weight, s.white, HEAP[0] + 0.08, 1.26, since / 0.5, 1.3)
  },
})
