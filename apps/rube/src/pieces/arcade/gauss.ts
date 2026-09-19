import { outline, solid } from '../../../../../src/core/draw'
import { FLOOR, R, ROLL, ball, definePiece, over, post, rail, ramp, roll, type BallChange, type Lane, type Pt } from '../../parts'
import { display, flash, glow, lamp } from './neon'

/**
 * A Gauss gun: the desk toy. A magnet block is clamped across the lane
 * with two balls resting against its far face. The ball comes into the
 * field and is pulled in over the last stretch, faster and faster, the
 * field's arcs lighting ahead of it; clack; it stops dead on the near
 * face, and the far ball — which only ever felt the magnet through the
 * one between — fires off with the thread at well over a kick's pace. It
 * runs through a speed trap under the rail, two lamps and a display that
 * reads what it clocked, and is down to the rail's pace by the edge. The
 * ball that arrived stays on the magnet, and so does the one in the
 * middle.
 */
const MAG = 0.1
const HALF = 0.11
/** The magnet block: from above the ball's top to a clamp's depth under the rail. */
const MAG_TOP = -0.2
const MAG_FOOT = FLOOR + 0.07
const SEAT = MAG - HALF - R
const B1 = MAG + HALF + R
const B2 = B1 + 2 * R
/** Where the field takes hold, and the pace it has the ball at when it lands. */
const PULL = -0.4
const V_SNAP = 6.2
const V_FIRE = 7.4
const T_PULL = (0.5 + PULL) / ROLL
const FIRE = T_PULL + (SEAT - PULL) / ((ROLL + V_SNAP) / 2)
/** The speed trap: two lamps on stubs under the rail, and the display between them. */
const GATE1 = 0.86
const GATE2 = 1.26
const TRAP_Y = FLOOR + 0.22
/** The field's arcs on the near side: their radii from the near face's middle, all clear of the ball that comes to rest there, and as tall as it. */
const ARCS = [2 * R + 0.05, 2 * R + 0.12, 2 * R + 0.19]
const ARC_H = 0.15

/** The fired ball's pace `d` cells into its run: a steady slowing from V_FIRE to the rail's pace. */
const RUN = 1.5 - B2
const paceAt = (d: number) => Math.sqrt(V_FIRE * V_FIRE - ((V_FIRE * V_FIRE - ROLL * ROLL) * d) / RUN)
/** Seconds after the clack at which it is `d` cells into its run. */
const timeAt = (d: number) => (V_FIRE - paceAt(d)) / ((V_FIRE - ROLL) / (RUN / ((V_FIRE + ROLL) / 2)))
const T_GATE1 = timeAt(GATE1 - B2)
const T_GATE2 = timeAt(GATE2 - B2)
/** What the trap reads: the mean pace between the lamps, in tenths of a cell a second. */
const CLOCKED = String(Math.round(((GATE2 - GATE1) / (T_GATE2 - T_GATE1)) * 10))

export const gauss = definePiece<{ color: string; next: string }>({
  name: 'gauss',
  points: 100,
  weight: 0.9,
  dynamic: true,
  place: ({ rng, color, fits, theme, ball: arriving }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    // The far ball is never the colour the arriving one is — nor the magnet's, when there is a choice; with nothing else to offer, the gun stays out of the map.
    const others = theme.colors.filter((c) => c !== arriving.color)
    if (!others.length) return null
    const pool = others.filter((c) => c !== color)
    const next = rng.pick(pool.length ? pool : others)
    const lane: Lane = {
      segs: [roll([-0.5, 0], [PULL, 0], ROLL), ramp([PULL, 0], [SEAT, 0], ROLL, V_SNAP), ramp([B2, 0], [1.5, 0], V_FIRE, ROLL)],
      fire: FIRE,
    }
    const changes: BallChange[] = [{ at: FIRE, relay: true, color: next }]
    return { cells, exit: { at: [2, 0], dir: 1 }, lane, state: { color, next }, changes }
  },
  draw: (p, s, { k, t, since, ink, bg, weight, color, spin }) => {
    // The field wakes as the ball comes into it, flares on the clack and dies down.
    const pulled = t < T_PULL ? 0 : since < 0 ? over(t, T_PULL, FIRE) : 1
    const flare = since < 0 ? 0 : 1 - over(since, 0.05, 0.6)
    // The ball's front on its way in: the pull's own law, so the arcs light as it reaches them.
    const front = PULL + ((SEAT - PULL) * pulled * (2 * ROLL + (V_SNAP - ROLL) * pulled)) / (ROLL + V_SNAP) + R
    const clocked = since > T_GATE2
    const shown = clocked ? 1 - over(since, T_GATE2 + 2.4, T_GATE2 + 3.2) : 0

    rail(p, k, ink, weight, -0.5, 1.5)

    // The field: arcs on the near side, each coming on as the ball's front reaches it.
    p.push()
    p.noFill()
    for (const r of ARCS) {
      const a = Math.asin(ARC_H / r)
      const reached = since < 0 ? (pulled > 0 && front > MAG - HALF - r ? 1 : 0) : flare
      if (reached > 0.05) {
        const halo = p.color(s.color)
        halo.setAlpha(40 * reached)
        p.stroke(halo)
        p.strokeWeight(weight * 3)
        p.arc((MAG - HALF) * k, 0, r * 2 * k, r * 2 * k, Math.PI - a, Math.PI + a)
      }
      p.stroke(reached > 0.5 ? s.color : ink)
      p.strokeWeight(weight * 0.8)
      p.arc((MAG - HALF) * k, 0, r * 2 * k, r * 2 * k, Math.PI - a, Math.PI + a)
    }
    p.pop()

    // The magnet: a block across the lane, clamped to the rail, standing on a post; its poles are its two halves, one in the colour and one in the ink.
    glow(p, k, s.color, MAG, (MAG_TOP + FLOOR) / 2, 0.2, flare)
    post(p, k, ink, weight, MAG, MAG_FOOT)
    solid(p, ink, weight, s.color)
    p.rect(MAG * k, ((MAG_TOP + MAG_FOOT) / 2) * k, HALF * 2 * k, (MAG_FOOT - MAG_TOP) * k, 0.015 * k)
    solid(p, ink, weight, ink)
    p.rect((MAG + HALF / 2) * k, ((MAG_TOP + MAG_FOOT) / 2) * k, HALF * k, (MAG_FOOT - MAG_TOP) * k, 0.015 * k)

    // The balls the magnet holds: the one between, which never moves but
    // shivers on the clack; the far one until it fires; the one that came, for good.
    const shiver = since > 0 ? 0.012 * Math.sin(since * 80) * Math.exp(-since * 9) : 0
    ball(p, k, ink, weight, s.next, (B1 + shiver) * k, 0, 0.6)
    if (since < 0) ball(p, k, ink, weight, s.next, B2 * k, 0, spin(B2))
    else ball(p, k, ink, weight, color, SEAT * k, 0, spin(SEAT))

    // The speed trap under the rail: a lamp at each end that comes on as
    // the ball goes over it, wired to a display that reads what it clocked.
    post(p, k, ink, weight, (GATE1 + GATE2) / 2, TRAP_Y)
    outline(p, ink, weight)
    for (const x of [GATE1, GATE2]) p.line(x * k, FLOOR * k, x * k, (TRAP_Y - 0.04) * k)
    p.line(GATE1 * k, TRAP_Y * k, GATE2 * k, TRAP_Y * k)
    lamp(p, k, ink, weight, s.next, bg, GATE1, TRAP_Y, 0.035, since > T_GATE1 ? 1 - over(since, T_GATE1 + 0.25, T_GATE1 + 0.9) : 0)
    lamp(p, k, ink, weight, s.next, bg, GATE2, TRAP_Y, 0.035, clocked ? 1 - over(since, T_GATE2 + 0.25, T_GATE2 + 0.9) : 0)
    glow(p, k, s.next, (GATE1 + GATE2) / 2, TRAP_Y, 0.14, shown * 0.8)
    display(p, k, ink, weight, bg, (GATE1 + GATE2) / 2, TRAP_Y, 0.22, 0.15, shown > 0 ? CLOCKED : '00', s.next, shown > 0.5)

    // The clack on the near face, and the shot off the far ball.
    flash(p, k, s.color, weight, MAG - HALF, 0, since, 0.2, 0.06, 0.2)
    flash(p, k, s.next, weight, B2, 0, since, 0.18, 0.13, 0.26)
  },
})
