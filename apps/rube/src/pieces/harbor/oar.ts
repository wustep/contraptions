import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeInQuad } from '../../../../../src/core/ease'
import { FLOOR, ROLL, definePiece, fly, over, rail, ramp, roll, trace, type Lane, type Pt } from '../../parts'
import { WATER, bodyColor, piling, seaWater, splash, water } from './sea'

/**
 * An oar. It lies across a rowlock on a post at the deck's end, its blade
 * toward the ball, level with the deck, and its handle out over the water;
 * a bucket full of sea water hangs there with its bail over the grip — and
 * over a hook on the piling of the deck above, which is what carries the
 * weight. The ball rolls off the deck's end onto the blade, and its weight
 * is enough: the blade dips, the handle lifts, and the bail comes up off
 * the hook. Now the bucket hangs on the oar. It drops, hits the sea with a
 * splash, and the blade whips up and throws the ball up onto the deck a
 * floor above. The oar lies there handle down, the bucket in the water.
 *
 * The ball rides the blade: its lane there is sampled from the oar's own
 * angle, the one the oar is drawn with, until the blade lets it go.
 */
/** The deck's end, the rowlock's post, and the oar in its own frame: along x from the blade's tip to the grip. */
const WEST = -0.3
const PIVOT: Pt = [0.1, FLOOR]
const TIP = -0.42
const BLADE_END = -0.1
const GRIP = 0.3
/** The ball sits on the blade's face, here along the oar. */
const SEAT = -0.27
/** The piling of the upper deck, with the hook on it; the upper deck; where the ball lands. */
const POST_X = 0.47
const UPPER_X0 = 0.02
const LAND: Pt = [0.25, -1]
/** The bucket: its width, its depth, and how far its bail hangs it under the grip. */
const BUCKET_W = 0.13
const BUCKET_H = 0.16
const BAIL = 0.06

/** Onto the blade; the dip; the bail off the hook; the whip; the throw. */
const T_EDGE = (WEST + 0.5) / ROLL
const T_SEAT = T_EDGE + 0.12
const FIRE = T_SEAT + 0.15
const WHIP = 0.2
const T_RELEASE = FIRE + 0.12
const FLIGHT = 0.55
const LOFT = 0.5
/** The oar's angle: level; dipped under the ball; whipped up as the bucket drops; and lying there after. */
const DIP = -0.12
const DOWN = 0.5
function angleAt(t: number): number {
  if (t < T_EDGE) return 0
  if (t < FIRE) return DIP * easeInOutSine(over(t, T_EDGE + 0.04, FIRE))
  if (t < FIRE + WHIP) return DIP + (DOWN - DIP) * easeInQuad(over(t, FIRE, FIRE + WHIP))
  const s = t - FIRE - WHIP
  return DOWN + 0.05 * Math.exp(-s * 3) * Math.cos(s * 9)
}
/** A point of the oar's frame in the cell's. */
function onOar(local: Pt, t: number): Pt {
  const a = angleAt(t)
  return [PIVOT[0] + local[0] * Math.cos(a) - local[1] * Math.sin(a), PIVOT[1] + local[0] * Math.sin(a) + local[1] * Math.cos(a)]
}
/** The ball along the blade: in off the deck's end to its seat, slowing; and on the blade's face. */
const alongAt = (t: number) => TIP + 0.02 + (SEAT - TIP - 0.02) * (1 - Math.pow(1 - over(t, T_EDGE, T_SEAT), 2))
const ballAt = (t: number): Pt => onOar([alongAt(t), -0.15], t)

const RIDE = [...trace(ballAt, T_EDGE, FIRE, 8), ...trace(ballAt, FIRE, T_RELEASE, 6)]
const OFF = RIDE[RIDE.length - 1].to
const LANE: Lane = {
  segs: [
    roll([-0.5, 0], [WEST, 0], ROLL),
    ...RIDE,
    fly(OFF, LAND, FLIGHT, LOFT),
    fly(LAND, [LAND[0] + 0.05, -1], 0.05, 0.012),
    ramp([LAND[0] + 0.05, -1], [0.5, -1], 1.2, ROLL),
  ],
  fire: FIRE,
}
/** When the bucket's bottom meets the water. */
const T_SPLASH = FIRE + 0.09

export const oar = definePiece<{ color: string }>({
  name: 'oar',
  weight: 0.9,
  flight: true,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, -1],
    ]
    if (!fits(cells, [1, -1])) return null
    return { cells, exit: { at: [1, -1], dir: 1 }, lane: LANE, state: { color: bodyColor(theme, color, ball.color) } }
  },
  draw: (p, s, { k, t, since, ink, weight, theme }) => {
    const a = angleAt(t)
    const grip = onOar([GRIP, 0], t)
    // The bail hangs on the hook until the grip lifts it off; from then on it hangs on the grip.
    const hook: Pt = [POST_X - 0.06, FLOOR - 0.01]
    const onHook = since < 0
    const bailTop: Pt = onHook ? hook : grip

    // The deck the ball comes off, on its piling; the rowlock's post; the upper deck on a tall piling, with the hook on it.
    rail(p, k, ink, weight, -0.5, WEST)
    piling(p, k, ink, weight, -0.4)
    piling(p, k, ink, weight, PIVOT[0], FLOOR + 0.05)
    piling(p, k, ink, weight, POST_X, -1 + FLOOR, 0.5)
    rail(p, k, ink, weight, UPPER_X0, 0.5, -1 + FLOOR)
    outline(p, ink, weight)
    p.line(POST_X * k, (-1 + FLOOR + 0.18) * k, (UPPER_X0 + 0.03) * k, (-1 + FLOOR) * k)
    p.noFill()
    p.arc((POST_X - 0.035) * k, (FLOOR + 0.01) * k, 0.06 * k, 0.05 * k, Math.PI * 0.5, Math.PI * 1.6)
    p.line(POST_X * k, (FLOOR - 0.02) * k, POST_X * k, (FLOOR + 0.04) * k)

    // The oar: the shaft through the rowlock, the blade on the ball's side, the grip on the sea's.
    p.push()
    p.translate(PIVOT[0] * k, PIVOT[1] * k)
    p.rotate(a)
    outline(p, ink, weight * 1.7)
    p.line(BLADE_END * k, 0, GRIP * k, 0)
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(TIP * k, 0)
    p.bezierVertex((TIP + 0.06) * k, -0.05 * k, (BLADE_END - 0.06) * k, -0.045 * k, BLADE_END * k, -0.012 * k)
    p.vertex(BLADE_END * k, 0.012 * k)
    p.bezierVertex((BLADE_END - 0.06) * k, 0.045 * k, (TIP + 0.06) * k, 0.05 * k, TIP * k, 0)
    p.endShape(p.CLOSE)
    p.rect((GRIP - 0.04) * k, 0, 0.08 * k, 0.045 * k, 0.01 * k)
    p.pop()
    // The thole pins either side of the shaft.
    outline(p, ink, weight)
    for (const dx of [-0.04, 0.04]) p.line((PIVOT[0] + dx) * k, (FLOOR + 0.05) * k, (PIVOT[0] + dx) * k, (FLOOR - 0.06) * k)

    // The bucket, hanging by its bail: on the hook, then on the grip, swinging as the oar throws it down.
    const sw = since < 0 ? 0 : 0.35 * Math.sin(Math.min(since, 0.4) * 8) * Math.exp(-Math.max(0, since - 0.4) * 2.5)
    p.push()
    p.translate(bailTop[0] * k, bailTop[1] * k)
    p.rotate(sw)
    outline(p, ink, weight)
    p.noFill()
    p.arc(0, (BAIL + 0.01) * k, BUCKET_W * 0.8 * k, BAIL * 2 * k, Math.PI, Math.PI * 2)
    solid(p, ink, weight, s.color)
    p.quad(-(BUCKET_W / 2) * k, BAIL * k, (BUCKET_W / 2) * k, BAIL * k, (BUCKET_W / 2 - 0.015) * k, (BAIL + BUCKET_H) * k, -(BUCKET_W / 2 - 0.015) * k, (BAIL + BUCKET_H) * k)
    p.pop()

    // The sea in front, and the bucket's splash as it goes in.
    water(p, k, ink, weight, -0.5, 0.5)
    splash(p, k, seaWater(theme), weight, grip[0], WATER, over(t, T_SPLASH, T_SPLASH + 0.5), 1)
    // The whip: a flick of lines off the blade's tip as it lets the ball go.
    const rel = t - T_RELEASE
    if (rel > 0 && rel < 0.18) {
      const f = rel / 0.18
      const tip = onOar([TIP, -0.03], t)
      p.push()
      p.stroke(ink)
      p.strokeWeight(weight * (1 - f))
      for (const b of [-2.2, -1.75, -1.3]) {
        const r0 = 0.06 + 0.1 * f
        p.line((tip[0] + Math.cos(b) * r0) * k, (tip[1] + Math.sin(b) * r0) * k, (tip[0] + Math.cos(b) * (r0 + 0.07)) * k, (tip[1] + Math.sin(b) * (r0 + 0.07)) * k)
      }
      p.pop()
    }
  },
})
