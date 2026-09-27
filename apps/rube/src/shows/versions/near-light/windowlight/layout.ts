import { add, dir, fly, G, scale, type Pt } from './kit'
import { BAR } from './music'

/**
 * Where everything stands, in cells: x to the right, y down, the sill's top at y = 0. The window's glass runs from
 * one side of the frame to the other and from the sill up to its head; the machine stands on the sill in front of
 * it, and the lamp hangs in front of it from the ceiling.
 *
 * The ball goes round the machine once a period, anticlockwise on the screen: down the cups on the left, through
 * the trough along the bottom, up the screw on the right, back along the rail under the window's head, round the lamp
 * on the wheel, and down the felt chute to the first cup again.
 */

/** The glass: from the frame's inside edges. */
export const GLASS = { x0: -17.4, x1: 17.4, y0: -24.2, y1: -0.7 }
/** The window's bars: one across and two up, six panes. */
export const BARS_X = [-5.8, 5.8]
export const BAR_Y = -12.45
/** The frame round the glass, and the wall round the frame. */
export const FRAME = 0.7

/** The trough: the radius of the circle its ball rolls on (its floor is where the last cup pours), and how far up each side it goes, radians. */
export const TROUGH_R = 5.5
export const TROUGH_LEFT = -0.62
export const TROUGH_LIP = 0.55

/** The screw's top: where its axis ends under the window's head. */
export const SCREW_TOP: Pt = [13.1, -19.4]
export const SCREW_RADIUS = 0.34

/** The rail: from beside the screw's head to over the wheel's top, clear of the gondolas going round. */
export const RAIL_TO: Pt = [-10.55, -17.35]

/** The lamp: its bulb, and the wheel round it. */
export const LAMP: Pt = [-11.5, -15.2]
export const WHEEL_R = 1.45
/** From a gondola's pin to the ball sitting in it. */
export const HANG = 0.3
export const GONDOLAS = 6
/** Seconds the wheel takes to turn once: three bars. */
export const WHEEL_TURN = 3 * BAR
/** How fast a gondola goes at the wheel's rim, cells a second. */
export const RIM_SPEED = (2 * Math.PI * WHEEL_R) / WHEEL_TURN

/**
 * The chute, from the wheel's foot to the first cup: it rises as far as the ball, coming off the wheel at the rim's
 * speed, can roll up (so it all but stops at the crest), and falls again as far as it needs to roll off its lip at
 * LIP_SPEED. A rolling ball's speed and height trade as v² = (10/7) g h.
 */
export const CHUTE_FROM: Pt = [LAMP[0] + 0.42, LAMP[1] + WHEEL_R + HANG + 0.03]
const rise = (v: number): number => (7 * v * v) / (10 * G)
export const LIP_SPEED = 0.8
export const CHUTE_CREST: Pt = add(CHUTE_FROM, [2.1, -rise(RIM_SPEED)])
export const CHUTE_LIP: Pt = add(CHUTE_CREST, [0.9, rise(LIP_SPEED)])
/** The lip's slope, and how long the ball falls from it into the first cup. */
export const LIP_SLOPE = 0.3
export const INTO_FIRST = 0.4
/** The first cup: the ball at rest in it, where the chute pours it. The others follow from where each pours it (`cups.ts`). */
export const CUPS_FROM: Pt = fly(CHUTE_LIP, scale(dir(LIP_SLOPE), LIP_SPEED), INTO_FIRST)
