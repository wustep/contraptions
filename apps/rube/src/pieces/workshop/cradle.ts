import { outline } from '../../../../../src/core/draw'
import { R, ROLL, ball, chain, definePiece, fly, over, rail, ramp, roll, type BallChange, type Lane, type Pt } from '../../parts'

/**
 * A Newton's cradle across the line. Three balls hang from a beam on
 * strings, the last of them on a hook. The ball rolls in and strikes the
 * first; it stops dead, and the thread passes to the far ball, which
 * swings out and, still climbing, slips its hook — so it leaves the swing
 * along its tangent, up and forward, and lands on the rail to carry on.
 * The one that arrived hangs there for ever, and so do the two that never
 * moved.
 */
const BEAM_Y = -0.62
const STRING = BEAM_Y * -1
const FIRST = 0.24
const GAP = 2 * R
const N = 3
const LAST = FIRST + GAP * (N - 1)
const SEAT = FIRST - GAP
const ARRIVE = (0.5 + SEAT) / ROLL
/** The swing the far ball would make, and the angle at which the hook lets it go. */
const SWING = 0.3
const MAX = 1.15
const RELEASE = 0.8
const OMEGA = Math.PI / 2 / SWING
const T_RELEASE = Math.asin(RELEASE / MAX) / OMEGA
const FLIGHT = 0.23
const REACH = 0.45

/** The far ball's angle from the vertical: a pendulum's rise, until the hook slips. */
const angleAt = (since: number) => (since <= 0 ? 0 : MAX * Math.sin(Math.min(since, T_RELEASE) * OMEGA))
const farAt = (a: number): Pt => [LAST + Math.sin(a) * STRING, -STRING + Math.cos(a) * STRING]
const APEX = farAt(RELEASE)
const LAND: Pt = [APEX[0] + REACH, 0]

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
    const pool = theme.colors.filter((c) => c !== arriving.color)
    const next = rng.pick(pool.length ? pool : theme.colors)
    const n = 8
    const arc: Pt[] = []
    for (let i = 0; i <= n; i++) arc.push(farAt(angleAt((T_RELEASE * i) / n)))
    const swing = chain(arc, T_RELEASE).map((seg) => ({ ...seg, dur: T_RELEASE / n }))
    const lane: Lane = {
      segs: [
        roll([-0.5, 0], [SEAT, 0], ROLL),
        ...swing,
        fly(APEX, LAND, FLIGHT, 0.16),
        ramp(LAND, [1.5, 0], 2.2, ROLL),
      ],
      fire: ARRIVE,
    }
    const changes: BallChange[] = [{ at: ARRIVE, relay: true, color: next }]
    return { cells, exit: { at: [2, 0], dir: 1 }, lane, state: { color, next }, changes }
  },
  draw: (p, s, { k, since, ink, weight, color }) => {
    rail(p, k, ink, weight, -0.5, 1.5)
    // The frame: a beam on two posts to the ground.
    outline(p, ink, weight)
    p.line(-0.2 * k, BEAM_Y * k, 1.42 * k, BEAM_Y * k)
    for (const x of [-0.15, 1.36]) {
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
    // The far ball's string: with it until the hook slips; then hanging
    // free from the hook, swinging back to rest.
    if (since < T_RELEASE) {
      const [fx, fy] = farAt(angleAt(since))
      outline(p, ink, weight)
      p.line(LAST * k, BEAM_Y * k, fx * k, (fy - R) * k)
    } else {
      const back = RELEASE * 0.6 * Math.exp(-(since - T_RELEASE) * 2) * Math.cos((since - T_RELEASE) * 9)
      outline(p, ink, weight)
      p.line(LAST * k, BEAM_Y * k, (LAST + Math.sin(back) * STRING * 0.9) * k, (BEAM_Y + Math.cos(back) * STRING * 0.9) * k)
    }
    if (since < 0) ball(p, k, ink, weight, s.next, LAST * k, 0, 0)
    // The hook on the beam that the far string slips.
    p.push()
    p.translate(LAST * k, BEAM_Y * k)
    p.rotate(since < T_RELEASE ? 0 : 0.8)
    outline(p, ink, weight)
    p.line(0, 0, 0.06 * k, 0.05 * k)
    p.pop()
    // The ball that arrived, parked against the first, in the colour it came in.
    if (since >= 0) ball(p, k, ink, weight, color, SEAT * k, 0, SEAT / R)
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
