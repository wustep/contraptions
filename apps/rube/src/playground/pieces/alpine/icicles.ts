import type p5 from 'p5'
import { solid } from '../../../../../../src/core/draw'
import { FAST, FLOOR, R, ROLL, definePiece, fly, over, rail, ramp, roll, type Lane, type Pt } from '../../../parts'
import { drift, iceBlue, powder, snow, snowAt, snowWhite } from './snow'

/**
 * A rock overhang, two cells long, on a rock wall at the near end, snow on
 * its back and four icicles under its brow. The ball rumbles in under it,
 * and the rumble is enough: each icicle trembles as the ball comes and lets
 * go, one after another, and spears down into the snow beside the track
 * just behind the ball, a radius off its heels, and stands there. The last
 * is the big one, and it is over the track: it comes down on the rail on
 * the ball's heels and bursts, and the burst kicks the ball on.
 *
 * An icicle is let go when the ball is a fixed way short of it, and falls
 * under the one gravity; the way is reckoned so that its point passes the
 * height of the ball just after the ball's back has gone by.
 */
const G = 24
/** Where each hangs, how long it is and how wide at the root. The last is the one over the track. */
const ICICLES: { x: number; len: number; wide: number }[] = [
  { x: -0.08, len: 0.32, wide: 0.085 },
  { x: 0.24, len: 0.35, wide: 0.09 },
  { x: 0.56, len: 0.3, wide: 0.08 },
  { x: 0.88, len: 0.5, wide: 0.13 },
]
const LAST = ICICLES.length - 1
/** The brow's underside, which the icicles hang from: it rises a little toward its tip. */
const browAt = (x: number): number => -1.08 - 0.05 * (x + 0.3)
/** How deep a fallen icicle's point stands in the snow. */
const BURIED = 0.13
/** The ball's back is this far past an icicle's line when its point comes by the ball's height. */
const CLEAR = R + 0.07
/** The blow: where the ball is when the last one bursts behind it, and the skip it gives. */
const X_BLOW = ICICLES[LAST].x + R + 0.05
const SKIP = 0.2

const LANE: Lane = {
  segs: [roll([-0.5, 0], [X_BLOW, 0], ROLL), fly([X_BLOW, 0], [X_BLOW + SKIP, 0], SKIP / FAST, 0.03), ramp([X_BLOW + SKIP, 0], [1.5, 0], FAST, ROLL)],
  fire: (X_BLOW + 0.5) / ROLL,
}

/** How far each falls before it stops, and the moment it is let go, in piece time. */
const FALLS = ICICLES.map((c, i) => (i === LAST ? FLOOR : snowAt(c.x) + BURIED) - (browAt(c.x) + c.len))
const LET_GO = ICICLES.map((c, i) => {
  if (i === LAST) return LANE.fire - Math.sqrt((2 * FALLS[i]) / G)
  // Its point is at the top of the ball when the ball's back is CLEAR past its line.
  const toBall = -R - (browAt(c.x) + c.len)
  return (c.x + CLEAR + 0.5) / ROLL - Math.sqrt((2 * toBall) / G)
})

/** One icicle, point down, its root's middle at the origin. */
function icicle(p: p5, k: number, ink: string, weight: number, color: string, len: number, wide: number): void {
  solid(p, ink, weight, color)
  p.beginShape()
  p.vertex((-wide / 2) * k, 0)
  p.vertex((wide / 2) * k, 0)
  p.vertex(wide * 0.12 * k, len * 0.62 * k)
  p.vertex(0, len * k)
  p.vertex(-wide * 0.16 * k, len * 0.55 * k)
  p.endShape(p.CLOSE)
}

export const icicles = definePiece<{ ice: string; white: string }>({
  name: 'icicles',
  weight: 0.9,
  place: ({ fits, theme }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, -1],
      [1, -1],
    ]
    if (!fits(cells, [2, 0])) return null
    // Ice is the palette's bluest colour and snow its whitest, whatever the map hands the piece.
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: LANE, state: { ice: iceBlue(theme), white: snowWhite(theme) } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    snow(p, k, ink, weight, -0.5, 1.5)
    rail(p, k, ink, weight, -0.5, 1.5)

    // The rock: a wall out of the snow at the near end and a brow out over the track, in one outline; snow on its back.
    drift(p, k, ink, weight, s.white, [[-0.45, -1.36], [-0.2, -1.45], [0.3, -1.43], [0.8, -1.46], [1.22, -1.37]], -1.33)
    solid(p, ink, weight, bg)
    p.beginShape()
    p.vertex(-0.47 * k, (snowAt(-0.47) + 0.03) * k)
    p.vertex(-0.47 * k, -1.36 * k)
    p.vertex(1.22 * k, -1.37 * k)
    p.vertex(1.3 * k, -1.26 * k)
    p.vertex(1.18 * k, browAt(1.18) * k)
    p.vertex(-0.22 * k, browAt(-0.22) * k)
    p.vertex(-0.3 * k, -0.6 * k)
    p.vertex(-0.26 * k, (snowAt(-0.26) + 0.03) * k)
    p.endShape(p.CLOSE)

    ICICLES.forEach((c, i) => {
      const fell = t - LET_GO[i]
      const stop = Math.sqrt((2 * FALLS[i]) / G)
      if (fell < 0) {
        // Hanging, and trembling as the ball's rumble comes on.
        const shake = 0.007 * over(fell, -0.3, 0) * Math.sin(t * 95 + i)
        p.push()
        p.translate((c.x + shake) * k, browAt(c.x) * k)
        icicle(p, k, ink, weight, s.ice, c.len, c.wide)
        p.pop()
      } else if (i < LAST || fell < stop) {
        const drop = Math.min(FALLS[i], 0.5 * G * fell * fell)
        p.push()
        p.translate(c.x * k, (browAt(c.x) + drop) * k)
        icicle(p, k, ink, weight, s.ice, c.len, c.wide)
        p.pop()
        if (i < LAST) powder(p, k, ink, weight, s.white, c.x, snowAt(c.x), over(fell, stop, stop + 0.3), 0.6)
      }
    })

    // The last one bursts on the rail: shards thrown up and out, falling, gone.
    if (since >= 0 && since < 0.45) {
      const at = ICICLES[LAST].x
      solid(p, ink, weight * 0.8, s.ice)
      const shards: [number, number, number][] = [[-1.5, 2.6, 0.06], [-0.7, 3.4, 0.075], [0.2, 3.7, 0.05], [0.9, 2.9, 0.07], [-2.1, 1.6, 0.05]]
      for (const [vx, vy, size] of shards) {
        const x = at + vx * since * 0.5
        const y = FLOOR - 0.02 - vy * since * 0.5 + 0.5 * G * 0.5 * since * since
        if (y > FLOOR + 0.02) continue
        const r = size * (1 - since / 0.45)
        p.push()
        p.translate(x * k, y * k)
        p.rotate(vx * 3 + since * vx * 9)
        p.triangle(-r * k, r * 0.6 * k, r * k, r * 0.5 * k, 0, -r * k)
        p.pop()
      }
    }
  },
})
