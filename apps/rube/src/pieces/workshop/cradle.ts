import { outline } from '../../../../../src/core/draw'
import { R, ROLL, ball, chain, definePiece, fly, over, rail, ramp, roll, type BallChange, type Lane, type Pt } from '../../parts'

/**
 * A Newton's cradle across the line. Three balls hang from a beam on
 * strings, all alike. The ball rolls in and strikes the first; it stops
 * dead, and the thread passes to the far ball, which swings out and, still
 * climbing, slips its string — so it leaves the swing along its tangent,
 * up and forward, and lands on the rail to carry on. The string swings
 * back empty. The one that arrived stays there for ever, and so do the two
 * that never moved.
 *
 * The far ball's whole way out is one motion: it sets off at the pace the
 * arriving ball came in at, swings as a pendulum of this string's length
 * does under G, leaves with the velocity it has at the angle the hook lets
 * go, and falls under the same G to the rail. So there is no seam to see at
 * the blow or at the slip, and where it lands is where that motion lands
 * it — which the cradle is hung far enough back along the line to keep
 * inside its own two cells, with rail left over to roll out on.
 */
const BEAM_Y = -0.62
const STRING = BEAM_Y * -1
const FIRST = -0.08
const GAP = 2 * R
const N = 3
const LAST = FIRST + GAP * (N - 1)
const SEAT = FIRST - GAP
const ARRIVE = (0.5 + SEAT) / ROLL
const G = 10
/** The swing the far ball would make, struck at ROLL, and the angle at which the hook lets it go. */
const OMEGA = Math.sqrt(G / STRING)
const MAX = ROLL / (STRING * OMEGA)
const RELEASE = 0.7
const T_RELEASE = Math.asin(RELEASE / MAX) / OMEGA

/** The far ball's angle from the vertical: a pendulum's rise, until the hook slips. */
const angleAt = (since: number) => (since <= 0 ? 0 : MAX * Math.sin(Math.min(since, T_RELEASE) * OMEGA))
const farAt = (a: number): Pt => [LAST + Math.sin(a) * STRING, -STRING + Math.cos(a) * STRING]
const APEX = farAt(RELEASE)
/** What it leaves with: the swing's speed at the slip, along the tangent. */
const SPEED = ROLL * Math.cos(OMEGA * T_RELEASE)
const VX = SPEED * Math.cos(RELEASE)
const VY = -SPEED * Math.sin(RELEASE)
/** Up, over and down to the rail, under G. */
const FLIGHT = (-VY + Math.sqrt(VY * VY - 2 * G * APEX[1])) / G
const LAND: Pt = [APEX[0] + VX * FLIGHT, 0]
/** The frame's posts: behind the ball that stays, and past the far ball's reach. */
const POSTS = [SEAT - 0.1, APEX[0] + R + 0.12]

export const cradle = definePiece<{ color: string; next: string }>({
  name: 'cradle',
  dynamic: true,
  weight: 0.9,
  place: ({ rng, color, fits, theme, ball: arriving }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    // The far ball is never the colour the arriving one is; with nothing else to offer, the cradle stays out of the map.
    const pool = theme.colors.filter((c) => c !== arriving.color)
    if (!pool.length) return null
    const next = rng.pick(pool)
    const n = 8
    const arc: Pt[] = []
    for (let i = 0; i <= n; i++) arc.push(farAt(angleAt((T_RELEASE * i) / n)))
    const swing = chain(arc, T_RELEASE).map((seg) => ({ ...seg, dur: T_RELEASE / n }))
    const lane: Lane = {
      segs: [
        roll([-0.5, 0], [SEAT, 0], ROLL),
        ...swing,
        // A parabola under G, as `fly` draws one: it peaks G·T²/8 over its chord.
        fly(APEX, LAND, FLIGHT, (G * FLIGHT * FLIGHT) / 8),
        // It lands with the forward pace it flew at, and picks the rail's up from there.
        ramp(LAND, [1.5, 0], VX, ROLL),
      ],
      fire: ARRIVE,
    }
    const changes: BallChange[] = [{ at: ARRIVE, relay: true, color: next }]
    return { cells, exit: { at: [2, 0], dir: 1 }, lane, state: { color, next }, changes }
  },
  draw: (p, s, { k, since, ink, weight, color, spin }) => {
    rail(p, k, ink, weight, -0.5, 1.5)
    // The frame: a beam on two posts to the ground.
    outline(p, ink, weight)
    p.line((POSTS[0] - 0.05) * k, BEAM_Y * k, (POSTS[1] + 0.05) * k, BEAM_Y * k)
    for (const x of POSTS) {
      p.line(x * k, BEAM_Y * k, x * k, 0.5 * k)
      p.line((x - 0.06) * k, 0.5 * k, (x + 0.06) * k, 0.5 * k)
    }
    // The balls that never move, on their strings; they take the click too, and shiver.
    const shiver = since > 0 ? 0.04 * Math.sin(since * 30) * Math.exp(-since * 3) : 0
    for (let i = 0; i < N - 1; i++) {
      const x = FIRST + GAP * i + Math.sin(shiver) * STRING
      outline(p, ink, weight)
      p.line((FIRST + GAP * i) * k, BEAM_Y * k, x * k, -R * k)
      ball(p, k, ink, weight, s.next, x * k, 0, 0)
    }
    // The far ball's string, the same line as the others: to the ball's rim
    // along the string while the ball is on it; then, from the angle it let
    // go at, swinging back empty to hang at rest, its own length still.
    const tail = STRING - R
    outline(p, ink, weight)
    if (since < T_RELEASE) {
      const a = angleAt(since)
      p.line(LAST * k, BEAM_Y * k, (LAST + Math.sin(a) * tail) * k, (BEAM_Y + Math.cos(a) * tail) * k)
    } else {
      const back = RELEASE * Math.exp(-(since - T_RELEASE) * 2) * Math.cos((since - T_RELEASE) * 9)
      p.line(LAST * k, BEAM_Y * k, (LAST + Math.sin(back) * tail) * k, (BEAM_Y + Math.cos(back) * tail) * k)
    }
    if (since < 0) ball(p, k, ink, weight, s.next, LAST * k, 0, spin(LAST))
    // The ball that arrived, parked against the first, in the colour it came in.
    if (since >= 0) ball(p, k, ink, weight, color, SEAT * k, 0, spin(SEAT))
    // The click.
    if (since > 0 && since < 0.2) {
      const f = over(since, 0, 0.2)
      p.push()
      p.stroke(s.next)
      p.strokeWeight(weight)
      for (const ang of [-2.2, -1.6, -1.0]) {
        const r0 = (0.16 + 0.1 * f) * k
        p.line(FIRST * k + Math.cos(ang) * r0, Math.sin(ang) * r0, FIRST * k + Math.cos(ang) * (r0 + 0.05 * k), Math.sin(ang) * (r0 + 0.05 * k))
      }
      p.pop()
    }
  },
})
