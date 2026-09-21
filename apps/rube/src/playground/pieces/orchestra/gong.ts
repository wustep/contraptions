import { outline, solid } from '../../../../../../src/core/draw'
import { clamp, easeInQuad, easeOutQuad } from '../../../../../../src/core/ease'
import { ROLL, definePiece, laneReach, post, roll, type Lane, type Pt } from '../../../parts'
import { feltColor, stage } from './hall'
import { brassFor, partColor } from './parts-a'

/**
 * A gong in its frame, two cells tall, standing over the line: two posts,
 * a bar across their heads, and the gong hung from the bar on two cords,
 * its foot well clear of the ball. Under the stage a beater lies on a
 * bell crank, its felt head on the floor to the east and the crank's short
 * arm standing up through a slot in the stage to the west. The ball rolls
 * over that paddle and treads it down; the crank flies round and throws the
 * beater up, and its head meets the gong's foot just as the ball goes under
 * it. The gong swings on its cords, away and back and away, shimmering,
 * and dies down; the beater falls back on the floor with a bounce, and the
 * paddle comes up through its slot again behind the ball. The ball never
 * stops.
 */
/** The frame: its posts and the bar across them. */
const POST = 0.46
const BAR = -1.38
/** The gong, hanging at rest, and the two cords' feet on its rim. */
const GONG: Pt = [0, -0.69]
const RAD = 0.36
const CORD_X = 0.14
const CORD_Y = GONG[1] - Math.sqrt(RAD * RAD - CORD_X * CORD_X)
const CORD = CORD_Y - BAR
/** The bell crank: its pivot, the beater's arm and head, and the paddle's arm. */
const PIVOT: Pt = [-0.24, 0.3]
const ARM = 0.6
const HEAD = 0.065
const PADDLE = 0.26
/** The beater lying on the floor, and up against the gong's foot: angles above the horizontal, to the east. */
const REST = -Math.asin((0.5 - HEAD - PIVOT[1]) / ARM)
const STRIKE = (() => {
  // Where the head's rim meets the gong's.
  for (let a = 0.8; a < Math.PI / 2; a += 0.0005) {
    const hx = PIVOT[0] + ARM * Math.cos(a)
    const hy = PIVOT[1] - ARM * Math.sin(a)
    if (Math.hypot(hx - GONG[0], hy - GONG[1]) <= RAD + HEAD) return a
  }
  return Math.PI / 2
})()
/** The paddle stands this far round from the beater's arm, so that at rest its tip is just proud of the stage. */
const PADDLE_AT = Math.PI * 0.75 - REST
/** The paddle's tip at rest: where the ball treads on it. */
const TREAD = PIVOT[0] + PADDLE * Math.cos(REST + PADDLE_AT)
/** The throw up takes this long, the fall back this long, and the bounce on the floor this long. */
const UP = 0.15
const DOWN = 0.34
const BOUNCE = 0.16

const LANE: Lane = { segs: [roll([-0.5, 0], [0.5, 0], ROLL)], fire: 0 }
const TROD = laneReach(LANE, TREAD)
LANE.fire = TROD + UP

/** The beater's angle, `t` seconds into the piece. */
function beaterAt(t: number): number {
  const s = t - TROD
  if (s <= 0) return REST
  if (s <= UP) return REST + (STRIKE - REST) * easeOutQuad(s / UP)
  if (s <= UP + DOWN) return STRIKE - (STRIKE - REST) * easeInQuad((s - UP) / DOWN)
  return REST + 0.12 * Math.sin(Math.PI * clamp((s - UP - DOWN) / BOUNCE))
}
/** The gong's swing on its cords after the blow: away from the beater first. */
const swing = (since: number) => (since < 0 ? 0 : -0.2 * Math.sin(8.3 * since) * Math.exp(-since / 1.3))
const shimmer = (since: number) => (since < 0 ? 0 : 0.016 * Math.exp(-since * 1.9))

export const gong = definePiece<{ color: string; metal: string }>({
  name: 'gong',
  weight: 0.9,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, -1],
    ]
    if (!fits(cells, [1, 0])) return null
    const metal = brassFor(theme, ball.color)
    return { cells, exit: { at: [1, 0], dir: 1 }, lane: LANE, state: { color: partColor(theme, feltColor(theme, color, ball.color), ball.color, metal), metal } }
  },
  draw: (p, s, { k, t, since, ink, weight }) => {
    // The stage, with a slot where the paddle stands up through it.
    stage(p, k, ink, weight, -0.5, TREAD - 0.05)
    stage(p, k, ink, weight, TREAD + 0.05, 0.5)

    // The frame: two posts from the floor and the bar across their heads.
    post(p, k, ink, weight, -POST, BAR, 0.5)
    post(p, k, ink, weight, POST, BAR, 0.5)
    outline(p, ink, weight)
    p.line((-POST - 0.04) * k, BAR * k, (POST + 0.04) * k, BAR * k)

    // The gong on its two cords, swinging as one with them.
    const a = swing(since)
    const dx = CORD * Math.sin(a)
    const dy = CORD * (Math.cos(a) - 1)
    outline(p, ink, weight * 0.8)
    for (const side of [-1, 1]) p.line(side * CORD_X * k, BAR * k, (side * CORD_X + dx) * k, (CORD_Y + dy) * k)
    const shiver = shimmer(since)
    if (shiver > 0.002) {
      const faint = p.color(ink)
      faint.setAlpha(70)
      p.noFill()
      p.stroke(faint)
      p.strokeWeight(weight * 0.8)
      for (const side of [-1, 1]) p.circle((GONG[0] + dx + side * shiver) * k, (GONG[1] + dy) * k, (RAD * 2 + shiver * 2) * k)
    }
    solid(p, ink, weight, s.metal)
    p.circle((GONG[0] + dx) * k, (GONG[1] + dy) * k, RAD * 2 * k)
    outline(p, ink, weight * 0.8)
    p.circle((GONG[0] + dx) * k, (GONG[1] + dy) * k, RAD * 0.62 * k)

    // The bell crank on its bracket: the beater's arm and felt head, and the paddle.
    post(p, k, ink, weight, PIVOT[0], PIVOT[1], 0.5)
    const b = beaterAt(t)
    const hx = PIVOT[0] + ARM * Math.cos(b)
    const hy = PIVOT[1] - ARM * Math.sin(b)
    const px = PIVOT[0] + PADDLE * Math.cos(b + PADDLE_AT)
    const py = PIVOT[1] - PADDLE * Math.sin(b + PADDLE_AT)
    outline(p, ink, weight)
    p.line(PIVOT[0] * k, PIVOT[1] * k, hx * k, hy * k)
    p.line(PIVOT[0] * k, PIVOT[1] * k, px * k, py * k)
    solid(p, ink, weight, s.color)
    p.circle(hx * k, hy * k, HEAD * 2 * k)
    solid(p, ink, weight, ink)
    p.circle(PIVOT[0] * k, PIVOT[1] * k, 0.04 * k)
    p.circle(px * k, py * k, 0.03 * k)
  },
})
