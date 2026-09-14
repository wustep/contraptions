import { outline } from '../../../../src/core/draw'
import { R, ROLL, ball, chain, definePiece, fall, fly, over, rail, ramp, roll, type BallChange, type Lane, type Pt } from '../parts'

/**
 * A Newton's cradle across the line. Three balls hang from a beam on
 * strings, the last of them on a hook. The ball rolls in and strikes the
 * first; it stops dead, and the thread passes to the far ball, which
 * swings out, slips its hook at the top of the swing, and drops onto the
 * rail to carry on. The one that arrived hangs there for ever, and so do
 * the two that never moved.
 */
const BEAM_Y = -0.62
const STRING = BEAM_Y * -1
const FIRST = 0.24
const GAP = 2 * R
const N = 3
const LAST = FIRST + GAP * (N - 1)
const SEAT = FIRST - GAP
const ARRIVE = (0.5 + SEAT) / ROLL
const SWING = 0.3
const MAX = 1.15
const LAND: Pt = [LAST + Math.sin(MAX) * STRING + 0.06, 0]

/** The far ball's angle from the vertical over its swing, decelerating into the hook's slip. */
const angleAt = (since: number) => (since <= 0 ? 0 : since < SWING ? MAX * Math.sin((Math.min(since, SWING) / SWING) * (Math.PI / 2)) : MAX)
const farAt = (a: number): Pt => [LAST + Math.sin(a) * STRING, -STRING + Math.cos(a) * STRING]

export const cradle = definePiece<{ color: string; next: string }>({
  name: 'cradle',
  weight: 0.9,
  place: ({ rng, color, fits, theme, ball: arriving }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    const pool = theme.colors.filter((c) => c !== arriving.color)
    const next = rng.pick(pool.length ? pool : theme.colors)
    const n = 10
    const arc: Pt[] = []
    for (let i = 0; i <= n; i++) arc.push(farAt(MAX * Math.sin((i / n) * (Math.PI / 2))))
    const swing = chain(arc, SWING, (i) => 1.6 - i / n)
    const apex = arc[arc.length - 1]
    const lane: Lane = {
      segs: [
        roll([-0.5, 0], [SEAT, 0], ROLL),
        ...swing,
        fall(apex, LAND, 4.5),
        fly(LAND, [LAND[0] + 0.08, 0], 0.05, 0.015),
        ramp([LAND[0] + 0.08, 0], [1.5, 0], 1.5, ROLL),
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
    // The far ball, on its string, until the thread takes it at the strike; the string swings with it and slips the hook.
    const a = angleAt(since)
    const [fx, fy] = farAt(a)
    if (since < SWING) {
      outline(p, ink, weight)
      p.line(LAST * k, BEAM_Y * k, fx * k, (fy - R) * k)
    } else {
      // The slipped string hangs from the hook, swinging back to rest.
      const back = MAX * 0.5 * Math.exp(-(since - SWING) * 2) * Math.cos((since - SWING) * 9)
      outline(p, ink, weight)
      p.line(LAST * k, BEAM_Y * k, (LAST + Math.sin(back) * STRING * 0.9) * k, (BEAM_Y + Math.cos(back) * STRING * 0.9) * k)
    }
    if (since < 0) ball(p, k, ink, weight, s.next, LAST * k, 0, 0)
    // The hook on the beam that the far string slips.
    p.push()
    p.translate(LAST * k, BEAM_Y * k)
    p.rotate(since < SWING ? 0 : 0.8)
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
