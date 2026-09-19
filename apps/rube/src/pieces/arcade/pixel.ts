import { R, ROLL, definePiece, laneAt, laneReach, mixHex, over, post, rail, ramp, roll, type BallChange, type Lane } from '../../parts'
import { glow } from './neon'
import { BEZEL, pixel as square, screen } from './screen'

/**
 * A palette swap. A screen stands on a stand in front of the lane, and
 * what goes behind it is seen on it the way the screen sees things: in
 * squares. The ball slides behind the bezel and comes onto the screen as a
 * sprite, six squares across, snapped to the screen's grid and moving a
 * square at a time, at the screen's own pace; a scanline comes down it and
 * leaves it another colour, row by row, while the cursor under the palette
 * along the top hops from the old colour to the new; and it rolls out from
 * behind the far bezel a ball again, in that colour, for good. Left alone,
 * the screen runs its demo: the cursor steps along the palette, dim.
 *
 * The screen stands in front of the ball, and the ball is out of sight for
 * as long as it is wholly behind the glass.
 */
/** One square of the screen: a sixth of the ball. The window is twelve across and thirteen down. */
const PX = (2 * R) / 6
const COLS = 12
const ROWS = 13
const X0 = (-COLS / 2) * PX
const Y0 = -R - 5 * PX
const X1 = X0 + COLS * PX
const Y1 = Y0 + ROWS * PX
/** The rows the ball's sprite fills, and the row the rail is. */
const BALL_ROW = 5
const RAIL_ROW = 11
/** Behind the glass the ball goes at the screen's pace. */
const V_SCREEN = 0.9
const SLOW = -0.42
const GONE = X0 + R
const BACK = X1 - R
const LANE: Lane = {
  segs: [
    roll([-0.5, 0], [SLOW, 0], ROLL),
    ramp([SLOW, 0], [GONE, 0], ROLL, V_SCREEN),
    { ...roll([GONE, 0], [BACK, 0], V_SCREEN), hidden: true },
    ramp([BACK, 0], [-SLOW, 0], V_SCREEN, ROLL),
    roll([-SLOW, 0], [0.5, 0], ROLL),
  ],
  fire: 0,
}
const T_MID = laneReach(LANE, 0)
LANE.fire = T_MID
/** The scanline takes this long to come down the sprite, centred on the fire. */
const SWEEP = 0.24
/** On screen from the moment the ball's front is behind the glass until its back is out from behind it. */
const T_ON = laneReach(LANE, X0 - R)
const T_OFF = laneReach(LANE, X1 + R)

/** The sprite: a ball in six by six, its corners off. */
const SPRITE = [0b011110, 0b111111, 0b111111, 0b111111, 0b111111, 0b011110]

export const pixel = definePiece<{ color: string; paint: string; palette: string[] }>({
  name: 'pixel',
  weight: 0.9,
  dynamic: true,
  place: ({ rng, color, fits, theme, ball }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    // The new colour is never the one the ball arrives in; with nothing else to offer, the screen stays out of the map.
    const pool = theme.colors.filter((c) => c !== ball.color)
    if (!pool.length) return null
    const paint = rng.pick(pool)
    const changes: BallChange[] = [{ at: T_MID, color: paint }]
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane: LANE, state: { color, paint, palette: theme.colors }, changes }
  },
  draw: (p, s, { k, t, since, ink, weight }) => {
    const on = t > T_ON && t < T_OFF ? 1 : t >= T_OFF ? 1 - over(t, T_OFF, T_OFF + 0.5) : 0
    rail(p, k, ink, weight, -0.5, 0.5)
    // The stand, and the screen's light on the night behind it while it has something to show.
    post(p, k, ink, weight, 0, Y1 + BEZEL, 0.5)
    glow(p, k, since < 0 ? s.color : s.paint, 0, (Y0 + Y1) / 2, 0.26, on)
  },
  over: (p, s, { k, t, since, ink, bg, weight, color }) => {
    const on = t > T_ON && t < T_OFF
    const dim = mixHex(bg, ink, 0.42)
    screen(p, k, ink, weight, s.color, bg, X0, Y0, X1, Y1)

    // The palette along the top, two squares a colour, and the cursor under the one in use.
    s.palette.forEach((c, i) => square(p, k, c, X0 + (1 + 2 * i) * PX, Y0 + PX, PX, 2, 1))
    const swapped = since >= 0
    const shown = t > T_ON && t < T_OFF + 1.6
    const at = s.palette.indexOf(swapped ? s.paint : color)
    // The cursor blinks on the new colour as it lands there.
    const blink = swapped && since < 0.45 && Math.floor(since * 14) % 2 === 1
    if (shown && at >= 0 && !blink) square(p, k, ink, X0 + (1 + 2 * at) * PX, Y0 + 2.5 * PX, PX, 2, 0.5)
    // With nothing to show it runs its demo: the cursor steps along the palette, dim.
    if (!shown) square(p, k, dim, X0 + (1 + 2 * (((Math.floor(t * 1.5) % 5) + 5) % 5)) * PX, Y0 + 2.5 * PX, PX, 2, 0.5)

    // The rail, as the screen sees it: a row of squares, bright while the ball is on screen.
    square(p, k, on ? ink : dim, X0, Y0 + RAIL_ROW * PX, PX, COLS, 0.5)

    if (on) {
      // The sprite: where the ball is, snapped to the grid, and only what is behind the glass.
      const bx = laneAt(LANE, t).x
      const col0 = Math.round((bx - R - X0) / PX)
      // The scanline: a row a beat, from above the sprite to below it; what it has passed is the new colour.
      const sweep = (since + SWEEP / 2) / SWEEP
      const line = Math.floor(sweep * 8) - 1
      // The spot that shows it turning, a square of its own.
      const spin = bx / R
      const dotC = Math.min(4, Math.max(1, Math.round(2.5 + 1.6 * Math.cos(spin))))
      const dotR = Math.min(4, Math.max(1, Math.round(2.5 + 1.6 * Math.sin(spin))))
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
          if (!(SPRITE[r] & (1 << (5 - c)))) continue
          const col = col0 + c
          if (col < 0 || col >= COLS) continue
          const fill = c === dotC && r === dotR ? ink : r < line ? s.paint : color
          square(p, k, fill, X0 + col * PX, Y0 + (BALL_ROW + r) * PX, PX)
        }
      }
      if (line >= -1 && line <= 6) square(p, k, s.paint, X0, Y0 + (BALL_ROW + line) * PX, PX, COLS, 1)
    }
  },
})
