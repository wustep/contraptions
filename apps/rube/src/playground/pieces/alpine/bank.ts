import { outline, solid } from '../../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, fly, rail, ramp, trace, type Lane, type Pt } from '../../../parts'
import { body, ride, rounded, trackOf } from './parts-b'
import { gearColor, powder, snow, snowWhite, wand } from './snow'

/**
 * A bank. The rail runs onto a roll-in: a plank that tips over and down to
 * a lip a little above the snow. The ball runs down it, drops off the lip
 * onto the flat with a thud of powder, and the flat turns up into a wall of
 * snow, a quarter-pipe taller than the ball's whole fall. It runs up the
 * wall until its way is spent, hangs there, and comes back down the way it
 * went up, across the flat, under the lip it dropped from, and out along
 * the rail a floor down, heading back.
 *
 * One gravity and one drag for all of it: the roll-in's pace is its slope's,
 * the drop off the lip is a thrown thing's, and how high the ball climbs the
 * wall is what it had left when it landed.
 */
const G = 9
const DRAG = 0.22
/** The roll-in: level with the rail, over the brink, and straight down to the lip. */
const BRINK = -0.2
const LIP: Pt = [0.34, 0.76]
const PLANK = 0.05
/** Its one leg, under the brink. */
const LEG = -0.17
const RAMP = trackOf(rounded([[-0.5, FLOOR], [BRINK, FLOOR, 0.16], LIP]))
/** The flat a floor down and the wall it turns up into. */
const FLAT = 1 + FLOOR
const WALL = 1.36
const TURN = 0.58
const PIPE = trackOf(rounded([[0.3, FLAT], [WALL, FLAT, TURN], [WALL, 0.18]]))
/** The snow the pipe is cut from, from where it comes up out of the snow's own line. */
const SNOWS: Pt[] = [...rounded([[-0.12, 1.352], [0.3, FLAT, 0.2], [0.5, FLAT]]), ...PIPE.pts.filter(([x]) => x > 0.5), [1.49, 0.18]]

/** Down the roll-in to the lip. */
const IN = ride(RAMP, 0, ROLL, G, 0, (s) => s >= RAMP.length)
const OFF = RAMP.at(RAMP.length, R)
const V_LIP = IN.v(IN.dur)
const VX = V_LIP * Math.cos(OFF.slope)
const VY = V_LIP * Math.sin(OFF.slope)
/** Off the lip, a thrown thing under the same gravity, down to the flat. */
const DROP = 1 - OFF.at[1]
const T_DROP = (-VY + Math.sqrt(VY * VY + 2 * G * DROP)) / G
const LAND: Pt = [OFF.at[0] + VX * T_DROP, 1]
/** Up the wall on what it landed with, and back, as far as the rail. */
const S_LAND = PIPE.reach(LAND[0])
const S_OUT = PIPE.reach(0.34)
const SWOOP = ride(PIPE, S_LAND, VX, G, DRAG, (s, v) => v < 0 && s <= S_OUT)
const V_BACK = -SWOOP.v(SWOOP.dur)

const T_LAND = IN.dur + T_DROP
const T_OUT = T_LAND + SWOOP.dur
const LANE: Lane = {
  segs: [
    ...trace((t) => RAMP.at(IN.s(t), R).at, 0, IN.dur, 24),
    fly(OFF.at, LAND, T_DROP, (G * T_DROP * T_DROP) / 8),
    ...trace((t) => PIPE.at(SWOOP.s(t - T_LAND), R).at, T_LAND, T_OUT, 60),
    ramp([PIPE.at(S_OUT, R).at[0], 1], [-0.5, 1], V_BACK, ROLL),
  ],
  fire: T_LAND,
}

export const bank = definePiece<{ color: string; white: string }>({
  name: 'bank',
  weight: 0.9,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]
    if (!fits(cells, [-1, 1])) return null
    return { cells, exit: { at: [-1, 1], dir: -1 }, lane: LANE, state: { color: gearColor(theme, color, ball.color), white: snowWhite(theme) } }
  },
  draw: (p, s, { k, ink, weight }) => {
    // The roll-in's one leg and its brace, behind everything: the ball comes back under the lip in front of the leg.
    const under = (x: number): Pt => RAMP.at(RAMP.reach(x), -PLANK).at
    outline(p, ink, weight)
    p.line(LEG * k, under(LEG)[1] * k, LEG * k, 1.5 * k)
    p.line((LEG - 0.06) * k, 1.5 * k, (LEG + 0.06) * k, 1.5 * k)
    p.line(LEG * k, 0.72 * k, under(0.2)[0] * k, under(0.2)[1] * k)
    // The snow: its own line from the cell's edge, then the flat and the wall, one body.
    snow(p, k, ink, weight, -0.5, -0.12, 1.36)
    body(p, k, ink, weight, s.white, SNOWS, 1.5)
    // The rail out, a floor down, and the rail in.
    rail(p, k, ink, weight, -0.5, 0.34, FLAT)
    wand(p, k, ink, weight, s.color, -0.36, FLAT, 1.36)
    rail(p, k, ink, weight, -0.5, BRINK - 0.08)
    // The roll-in: a plank from the rail's end over the brink and down to its lip.
    const from = RAMP.reach(BRINK - 0.1)
    const n = 28
    solid(p, ink, weight, s.color)
    p.beginShape()
    for (let i = 0; i <= n; i++) {
      const { at } = RAMP.at(from + ((RAMP.length - from) * i) / n)
      p.vertex(at[0] * k, at[1] * k)
    }
    for (let i = n; i >= 0; i--) {
      const { at } = RAMP.at(from + ((RAMP.length - from) * i) / n, -PLANK)
      p.vertex(at[0] * k, at[1] * k)
    }
    p.endShape(p.CLOSE)
  },
  over: (p, s, { k, since, ink, weight }) => {
    powder(p, k, ink, weight, s.white, LAND[0], FLAT, since / 0.45, 1.1)
  },
})
