import { outline, solid } from '../../../../../../src/core/draw'
import { FLOOR, R, ROLL, arrive, arriveAt, definePiece, fly, over, post, rail, ramp, trace, wait, type Lane, type Pt } from '../../../parts'

/**
 * A tape measure that reels itself in. Its blade is pulled out three cells
 * and hooked over the far rail's end post, and the case lies at the near
 * end with the lock on, its flat top level with the rail. The
 * ball rolls out onto the case and fetches up against the lip at the top's
 * far edge; the bump jumps the lock; and since the hook cannot come to the
 * case, the case goes to the hook: it zips along its own blade, faster and
 * faster, the ball on its roof, the reel in its side whirling, until its
 * mouth meets the hook with a clack and it stops dead. The ball does not.
 * It skips the lip and rolls on. The case stays where it fetched up, the
 * blade all in.
 *
 * A spring pulls with one force all the way, so the run is one steady
 * acceleration; the ball's lane is the case's own motion.
 */
/** The case: how wide and tall, where its middle is to begin with, and how far it runs. */
const W = 0.46
const H = 0.36
const X0 = -0.1
const RUN = 1.9
/** The lip at the roof's far edge, and where the ball sits against it, from the case's middle. */
const LIP = 0.045
const SEAT = W / 2 - 0.03 - R
/** The spring's pull, cells a second a second. */
const PULL = 8
/** The bump, then the lock lets go this long after. */
const ARRIVE = arriveAt(X0 + SEAT)
const LOCK = 0.24
const FIRE = ARRIVE + LOCK
const ZIP = Math.sqrt((2 * RUN) / PULL)
const TOP_SPEED = PULL * ZIP
/** The skip over the lip when the case stops dead, and the pace the ball keeps out of it. */
const SKIP = 0.34
const KEPT = 4.6
const SKIP_T = SKIP / ((TOP_SPEED + KEPT) / 2)
/** The blade, out of the mouth high on the case's face, and the peg its hook is over: the far rail's own end post. */
const BLADE_Y = FLOOR + 0.1
const BLADE_H = 0.075
const PEG = X0 + RUN + W / 2 + 0.03

/** How far the case has run, `since` seconds after the lock let go. */
const runAt = (since: number) => (since <= 0 ? 0 : since >= ZIP ? RUN : 0.5 * PULL * since * since)

const LANE: Lane = (() => {
  const from: Pt = [X0 + SEAT, 0]
  const to: Pt = [X0 + SEAT + RUN, 0]
  const land: Pt = [to[0] + SKIP, 0]
  return {
    segs: [
      ...arrive([-0.5, 0], from),
      wait(from, LOCK),
      ...trace((t) => [from[0] + runAt(t), 0], 0, ZIP, 24),
      fly(to, land, SKIP_T, 0.018),
      ramp(land, [2.5, 0], KEPT, ROLL),
    ],
    fire: FIRE,
  }
})()

export const tapemeasure = definePiece<{ color: string }>({
  name: 'tapemeasure',
  weight: 0.9,
  flight: true,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [2, 0],
    ]
    if (!fits(cells, [3, 0])) return null
    return { cells, exit: { at: [3, 0], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const run = runAt(since)
    // The bump shivers the case; the clack at the far end jolts it back a hair.
    const bumped = t < ARRIVE || since > 0 ? 0 : 0.012 * Math.exp(-(t - ARRIVE) * 9) * Math.sin((t - ARRIVE) * 60)
    const clack = since < ZIP ? 0 : 0.02 * Math.exp(-(since - ZIP) * 14) * Math.sin((since - ZIP) * 50)
    const cx = X0 + run + bumped - Math.abs(clack)
    const top = FLOOR
    const mouth = cx + W / 2

    // The rail in, the ground the case slides on, the rail out on its post, and the peg.
    rail(p, k, ink, weight, -0.5, X0 - W / 2 - 0.02)
    post(p, k, ink, weight, -0.44)
    outline(p, ink, weight)
    p.line((X0 - W / 2 - 0.06) * k, 0.5 * k, (PEG + 0.08) * k, 0.5 * k)
    rail(p, k, ink, weight, PEG - 0.01, 2.5)
    post(p, k, ink, weight, 2.38)
    outline(p, ink, weight)
    p.line(PEG * k, top * k, PEG * k, 0.5 * k)

    // The blade, from the case's mouth to the hook over the peg: a band with a tick every eighth, and no numerals.
    const end = PEG - 0.035
    if (end - mouth > 0.01) {
      solid(p, ink, weight * 0.8, bg)
      p.rect(((mouth - 0.02 + end) / 2) * k, BLADE_Y * k, (end - mouth + 0.02) * k, BLADE_H * k)
      outline(p, ink, weight * 0.7)
      for (let i = 1; end - i * 0.125 > mouth + 0.03; i++) {
        const x = end - i * 0.125
        p.line(x * k, (BLADE_Y - BLADE_H / 2) * k, x * k, (BLADE_Y - BLADE_H / 2 + (i % 2 ? 0.03 : 0.045)) * k)
      }
    }
    // The hook: a tab on the blade's end, turned down over the peg's far side.
    outline(p, ink, weight)
    p.line((end - 0.01) * k, (BLADE_Y - BLADE_H / 2) * k, (PEG + 0.04) * k, (BLADE_Y - BLADE_H / 2) * k)
    p.line((PEG + 0.04) * k, (BLADE_Y - BLADE_H / 2) * k, (PEG + 0.04) * k, (BLADE_Y + 0.07) * k)

    // The case: one rounded block, its roof the ball's road, a lip at the roof's far edge.
    solid(p, ink, weight, s.color)
    p.rect(cx * k, (top + H / 2) * k, W * k, H * k, 0.07 * k)
    p.rect((cx + W / 2 - 0.03) * k, (top - LIP / 2) * k, 0.04 * k, LIP * k, 0.01 * k)
    // The reel in its side, turning as the blade comes in.
    solid(p, ink, weight, bg)
    p.circle((cx - 0.03) * k, (top + H / 2) * k, 0.2 * k)
    p.push()
    p.translate((cx - 0.03) * k, (top + H / 2) * k)
    p.rotate(run / 0.1)
    outline(p, ink, weight)
    p.line(-0.055 * k, 0, 0.055 * k, 0)
    p.pop()
    // The lock: a slide on the case's face, down while it holds and jumped up when the bump lets it go.
    const free = t < ARRIVE ? 0 : over(t, FIRE - 0.06, FIRE)
    solid(p, ink, weight, free > 0.5 ? bg : ink)
    p.rect((cx + W / 2 - 0.09) * k, (top + 0.13 - 0.05 * free) * k, 0.05 * k, 0.09 * k, 0.012 * k)
  },
})
