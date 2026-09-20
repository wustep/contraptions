import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeInQuad } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, fly, over, post, rail, ramp, roll, trace, type Lane, type Pt } from '../../parts'
import { aboveWater } from './creatures'
import { WATER, bodyColor, piling, seaWater, splash, water } from './sea'

/**
 * An oar. It lies in a rowlock on a post at the deck's end, its blade
 * toward the ball with its upper edge level with the deck, and its handle
 * out over the water. A bucket full of sea water hangs there by its bail,
 * over the grip — and over a hook on the piling of the deck above, which
 * stands a hair higher than the grip and is what carries the weight. The
 * ball rolls off the deck's end onto the blade, and its weight is enough:
 * the blade dips, the handle comes up under the bail and lifts it clear
 * off the hook. Now the bucket hangs on the oar. It swings in and drops,
 * hits the sea with a splash, and the blade whips up and throws the ball
 * up onto the deck a floor above. The oar lies there handle down, the
 * bucket under the water.
 *
 * The ball rides the blade: its lane there is sampled from the oar's own
 * angle, the one the oar is drawn with, until the blade lets it go.
 */
/** The deck's end, and the oar in its own frame: along x from the blade's tip to the grip, the blade this wide either side of its spine. */
const WEST = -0.3
const TIP = -0.42
const BLADE_END = -0.1
const GRIP = 0.3
const BLADE = 0.045
const SHAFT = 0.018
/** The rowlock, low enough that the blade's upper edge carries on from the deck. */
const PIVOT: Pt = [0.1, FLOOR + BLADE]
/** The ball sits on the blade's edge, here along the oar. */
const SEAT = -0.27
/** The piling of the upper deck, with the hook on it; the upper deck, which stops short of the ball's way up; where the ball lands. */
const POST_X = 0.47
const UPPER_X0 = 0.14
const LAND: Pt = [0.25, -1]
/** The hook's crook: over the grip's end, and just higher than the grip's top when the oar lies level. */
const HOOK: Pt = [PIVOT[0] + GRIP, PIVOT[1] - SHAFT - 0.02]
/** The bucket: its width, its depth, and how far its bail hangs it under what carries it. */
const BUCKET_W = 0.13
const BUCKET_H = 0.13
const BAIL = 0.05

/** Onto the blade; the dip; the bail off the hook; the whip; the throw. */
const T_EDGE = (WEST + 0.5) / ROLL
const T_SEAT = T_EDGE + 0.12
const FIRE = T_SEAT + 0.15
const WHIP = 0.2
const T_RELEASE = FIRE + 0.12
const FLIGHT = 0.55
const LOFT = 0.5
/** The oar's angle: level; dipped under the ball; whipped up as the bucket drops; and lying there after. */
const DIP = -0.2
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
/** The ball along the blade: in off the deck's end to its seat, slowing; and on the blade's upper edge. */
const alongAt = (t: number) => TIP + 0.02 + (SEAT - TIP - 0.02) * (1 - Math.pow(1 - over(t, T_EDGE, T_SEAT), 2))
const ballAt = (t: number): Pt => onOar([alongAt(t), -BLADE - R], t)

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
  draw: (p, s, { k, t, since, ink, bg, weight, theme }) => {
    const a = angleAt(t)
    const grip = onOar([GRIP, -SHAFT], t)
    // The bail hangs on whichever is higher, the hook or the grip; once the grip has lifted it off, it stays on the grip.
    const carried: Pt = since < 0 && HOOK[1] < grip[1] ? HOOK : grip

    // The deck the ball comes off, on its piling; the rowlock's post; the upper deck on a tall piling, braced.
    rail(p, k, ink, weight, -0.5, WEST)
    piling(p, k, ink, weight, -0.4)
    post(p, k, ink, weight, PIVOT[0], PIVOT[1] + 0.05)
    piling(p, k, ink, weight, POST_X, -1 + FLOOR, 0.5)
    rail(p, k, ink, weight, UPPER_X0, 0.5, -1 + FLOOR)
    outline(p, ink, weight)
    p.line(POST_X * k, (-1 + FLOOR + 0.16) * k, (UPPER_X0 + 0.04) * k, (-1 + FLOOR) * k)
    // The hook: an arm off the piling, its tip turned up.
    p.noFill()
    p.beginShape()
    p.vertex(POST_X * k, (HOOK[1] + 0.012) * k)
    p.vertex((HOOK[0] - 0.015) * k, (HOOK[1] + 0.012) * k)
    p.vertex((HOOK[0] - 0.03) * k, (HOOK[1] - 0.03) * k)
    p.endShape()

    // The bucket, hanging by its bail: on the hook, then on the grip, swinging in as the oar takes it down. What goes under the water is not seen.
    const sw = since < 0 ? 0 : 0.35 * Math.sin(Math.min(since, 0.4) * 8) * Math.exp(-Math.max(0, since - 0.4) * 2.5)
    p.push()
    aboveWater(p, k, -0.5, 0.5)
    p.translate(carried[0] * k, carried[1] * k)
    p.rotate(sw)
    outline(p, ink, weight)
    p.noFill()
    p.arc(0, BAIL * k, BUCKET_W * 0.8 * k, BAIL * 2 * k, Math.PI, Math.PI * 2)
    solid(p, ink, weight, s.color)
    p.quad(-(BUCKET_W / 2) * k, BAIL * k, (BUCKET_W / 2) * k, BAIL * k, (BUCKET_W / 2 - 0.015) * k, (BAIL + BUCKET_H) * k, -(BUCKET_W / 2 - 0.015) * k, (BAIL + BUCKET_H) * k)
    p.pop()

    // The oar: a loom through the rowlock with a knob of a grip on the sea's side, and the blade on the ball's.
    p.push()
    p.translate(PIVOT[0] * k, PIVOT[1] * k)
    p.rotate(a)
    solid(p, ink, weight, bg)
    p.rect(((BLADE_END + GRIP) / 2 - 0.02) * k, 0, (GRIP - BLADE_END + 0.04) * k, SHAFT * 2 * k, SHAFT * k)
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex((TIP + 0.03) * k, -BLADE * k)
    p.vertex((BLADE_END - 0.09) * k, -BLADE * k)
    p.bezierVertex((BLADE_END - 0.04) * k, -BLADE * k, (BLADE_END - 0.03) * k, -SHAFT * k, BLADE_END * k, -SHAFT * k)
    p.vertex(BLADE_END * k, SHAFT * k)
    p.bezierVertex((BLADE_END - 0.03) * k, SHAFT * k, (BLADE_END - 0.04) * k, BLADE * k, (BLADE_END - 0.09) * k, BLADE * k)
    p.vertex((TIP + 0.03) * k, BLADE * k)
    p.bezierVertex(TIP * k, BLADE * k, TIP * k, -BLADE * k, (TIP + 0.03) * k, -BLADE * k)
    p.endShape(p.CLOSE)
    p.pop()
    // The rowlock's horns either side of the loom.
    outline(p, ink, weight)
    for (const dx of [-0.04, 0.04]) p.line((PIVOT[0] + dx) * k, (PIVOT[1] + 0.05) * k, (PIVOT[0] + dx) * k, (PIVOT[1] - 0.055) * k)
    p.line((PIVOT[0] - 0.04) * k, (PIVOT[1] + 0.05) * k, (PIVOT[0] + 0.04) * k, (PIVOT[1] + 0.05) * k)

    // The sea in front, and the bucket's splash as it goes in.
    water(p, k, ink, weight, -0.5, 0.5)
    splash(p, k, seaWater(theme), weight, grip[0], WATER, over(t, T_SPLASH, T_SPLASH + 0.5), 1)
  },
})
