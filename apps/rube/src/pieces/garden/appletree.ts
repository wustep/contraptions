import { outline, solid } from '../../../../../src/core/draw'
import { easeOutQuad } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, ball, definePiece, fly, over, rail, ramp, roll, wait, type BallChange, type Lane, type Pt } from '../../parts'
import { leaf, tuft } from './green'

/**
 * A dwarf apple tree with its trunk on the path. The ball runs into the
 * trunk and stops dead; the knock goes up the tree, the crown shudders, a
 * leaf or two comes down — and the one ripe apple on the far bough lets
 * go, drops, bounces once on the path and rolls on with the thread. The
 * ball that arrived stays where the trunk stopped it, for good. Newton.
 *
 * The apple is a ball, the size of the one that came: the piece draws it
 * on its twig until the knock, the show draws it from then on, and the
 * piece draws the ball it kept.
 */
const TRUNK_X = -0.04
const TRUNK_W = 0.09
/** The ball's centre with its front on the bark, and where it comes to rest after the knock throws it back a hair. */
const SEAT = TRUNK_X - TRUNK_W / 2 - R
const REST = SEAT - 0.035
const T_HIT = (0.5 + SEAT) / ROLL
/** The apple on its twig, and the twig's root in the crown. */
const HANG: Pt = [0.25, -0.27]
const TWIG: Pt = [0.2, -0.45]
/** The shudder takes this long to reach the stalk. */
const LOOSE = 0.22
const DROP = 0.17
const LAND: Pt = [0.28, 0]
const HOP: Pt = [0.37, 0]
/** The crown: lobes as [x, y, r], the big one last so it sits on the others. */
const CROWN: [number, number, number][] = [
  [-0.19, -0.3, 0.115],
  [0.14, -0.33, 0.125],
  [-0.03, -0.35, 0.145],
]
/** Where the falling leaves start in the crown, where they lie after, how they lean, and how long after the knock they let go. */
const LEAVES: { from: Pt; to: Pt; lean: number; at: number }[] = [
  { from: [-0.3, -0.24], to: [-0.27, 0.47], lean: 2.7, at: 0.05 },
  { from: [0.06, -0.2], to: [0.13, 0.47], lean: 0.5, at: 0.2 },
]
const LEAF_FALL = 1.5

/** How light a colour is. */
const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return (((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) / 255
}

export const appletree = definePiece<{ color: string; fruit: string }>({
  name: 'appletree',
  weight: 0.9,
  dynamic: true,
  place: ({ rng, color, fits, theme, ball: arriving }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    // The apple is never the colour of the ball that knocks it down; with nothing else to offer, the tree stays out of the map.
    const others = theme.colors.filter((c) => c !== arriving.color)
    if (!others.length) return null
    // And the crown is not the apple's colour, so the apple reads on the tree.
    const fruit = color !== arriving.color ? color : rng.pick(others)
    // A crown as pale as the paper is a cloud on a stick, so it takes a colour that stands off the paper when there is one.
    const rest = theme.colors.filter((c) => c !== fruit)
    const leafy = rest.filter((c) => Math.abs(luminance(c) - luminance(theme.bg)) > 0.18)
    const crown = rng.pick(leafy.length ? leafy : rest)
    const lane: Lane = {
      segs: [
        roll([-0.5, 0], [SEAT, 0], ROLL),
        // The thread is the apple's from the knock: on its twig while the shudder climbs, then down.
        wait(HANG, LOOSE),
        { from: HANG, to: LAND, dur: DROP, ease: 'in' },
        fly(LAND, HOP, 0.16, 0.07),
        ramp(HOP, [0.5, 0], 1.3, ROLL),
      ],
      fire: T_HIT,
    }
    const changes: BallChange[] = [{ at: T_HIT, relay: true, color: fruit }]
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane, state: { color: crown, fruit }, changes }
  },
  draw: (p, s, { k, since, ink, bg, weight, color }) => {
    // The knock: the crown shudders and the trunk with it, less.
    const shake = since < 0 ? 0 : 0.02 * Math.sin(since * 46) * Math.exp(-since * 5)
    const landed = since - LOOSE - DROP

    // The path either side of the trunk, the ground, and a tuft at the tree's foot.
    rail(p, k, ink, weight, -0.5, TRUNK_X - TRUNK_W / 2)
    rail(p, k, ink, weight, TRUNK_X + TRUNK_W / 2, 0.5)
    outline(p, ink, weight)
    p.line(-0.5 * k, 0.5 * k, 0.5 * k, 0.5 * k)
    tuft(p, k, ink, weight, TRUNK_X + 0.13, 0.5, 0.08, 0.02)
    tuft(p, k, ink, weight, -0.4, 0.5, 0.06, -0.01)

    // The trunk: up from the ground through the path's line, leaning with the shudder toward the top.
    const top = -0.24
    solid(p, ink, weight, bg)
    p.quad(
      (TRUNK_X - TRUNK_W / 2 - 0.015) * k, 0.5 * k,
      (TRUNK_X + TRUNK_W / 2 + 0.015) * k, 0.5 * k,
      (TRUNK_X + TRUNK_W / 2 + shake) * k, top * k,
      (TRUNK_X - TRUNK_W / 2 + shake) * k, top * k,
    )
    // Bark, and the bough the apple's twig grows from.
    outline(p, ink, weight * 0.7)
    p.line((TRUNK_X - 0.012) * k, 0.38 * k, (TRUNK_X - 0.012) * k, 0.27 * k)
    p.line((TRUNK_X + 0.018) * k, 0.2 * k, (TRUNK_X + 0.018) * k, 0.31 * k)
    outline(p, ink, weight * 1.2)
    p.noFill()
    p.beginShape()
    p.vertex((TRUNK_X + TRUNK_W / 2 + shake) * k, (top + 0.04) * k)
    p.quadraticVertex((TWIG[0] - 0.08 + shake) * k, (top - 0.02) * k, (TWIG[0] + shake * 1.5) * k, TWIG[1] * k)
    p.endShape()

    // The crown: lobes that read as one shape — outlined, then filled again on top.
    p.push()
    p.translate(shake * 1.5 * k, 0)
    solid(p, ink, weight, s.color)
    for (const [x, y, r] of CROWN) p.circle(x * k, y * k, r * 2 * k)
    p.noStroke()
    p.fill(s.color)
    for (const [x, y, r] of CROWN) p.circle(x * k, y * k, (r * 2 - weight / k) * k)
    p.pop()

    // The leaves the knock brings down: side to side on the way, then lying where they landed.
    for (const l of LEAVES) {
      const f = over(since, l.at, l.at + LEAF_FALL)
      if (f <= 0) continue
      const x = l.from[0] + (l.to[0] - l.from[0]) * f + 0.06 * Math.sin(f * Math.PI * 3) * (1 - f)
      const y = l.from[1] + (l.to[1] - l.from[1]) * (0.35 * f + 0.65 * f * f)
      const a = l.lean + 0.9 * Math.sin(f * Math.PI * 3) * (1 - f)
      leaf(p, k, ink, weight * 0.7, s.color, x, y, 0.13, a, 0.5)
    }

    // The apple on its twig until the knock; the show draws it from then on.
    if (since < 0) ball(p, k, ink, weight, s.fruit, HANG[0] * k, HANG[1] * k, 0.9)
    // The ball that arrived, thrown back a hair by the trunk, at rest against it for good.
    if (since >= 0) {
      const x = SEAT + (REST - SEAT) * easeOutQuad(over(since, 0, 0.16))
      ball(p, k, ink, weight, color, x * k, 0, x / R)
    }

    // The knock on the bark, and the apple's bounce on the path.
    if (since > 0 && since < 0.2) {
      const f = over(since, 0, 0.2)
      p.push()
      p.stroke(ink)
      p.strokeWeight(weight)
      // It comes out of the trunk's far side: the jolt went through.
      const cx = TRUNK_X + TRUNK_W / 2
      for (const a of [-0.6, 0, 0.6]) {
        const r0 = 0.04 + 0.07 * f
        p.line((cx + Math.cos(a) * r0) * k, Math.sin(a) * r0 * k, (cx + Math.cos(a) * (r0 + 0.05 * (1 - f))) * k, Math.sin(a) * (r0 + 0.05 * (1 - f)) * k)
      }
      p.pop()
    }
    if (landed > 0 && landed < 0.2) {
      const f = over(landed, 0, 0.2)
      p.push()
      p.stroke(s.fruit)
      p.strokeWeight(weight)
      for (const a of [-2.7, -0.45]) {
        const r0 = 0.15 + 0.08 * f
        p.line((LAND[0] + Math.cos(a) * r0) * k, (FLOOR + Math.sin(a) * r0 * 0.5) * k, (LAND[0] + Math.cos(a) * (r0 + 0.05)) * k, (FLOOR + Math.sin(a) * (r0 + 0.05) * 0.5) * k)
      }
      p.pop()
    }
  },
  over: (p, s, { k, since, ink, weight }) => {
    // The twig the apple hangs from, and its one leaf, in front of the apple; the twig springs up when the weight goes.
    const shake = since < 0 ? 0 : 0.02 * Math.sin(since * 46) * Math.exp(-since * 5)
    const gone = since - LOOSE
    const spring = gone < 0 ? 0 : 0.035 * (1 - Math.exp(-gone * 10) * Math.cos(gone * 22))
    const tipX = HANG[0] - 0.005 + shake * 1.5
    const tipY = HANG[1] - R + 0.015 - spring
    outline(p, ink, weight)
    p.line((TWIG[0] + shake * 1.5) * k, TWIG[1] * k, tipX * k, tipY * k)
    leaf(p, k, ink, weight * 0.8, s.color, tipX, tipY - 0.015, 0.11, -0.35 - spring * 4)
  },
})
