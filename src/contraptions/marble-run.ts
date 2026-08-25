import { defineContraption } from '../core/define'
import { clipBox, outline, solid } from '../core/draw'
import { easeInQuad, lerp, seg } from '../core/ease'

/**
 * A ball working its way down a switchback chute.
 *
 * Each ramp is a roll followed by a real fall onto the next one. The earlier
 * version cut straight from the end of one ramp to the start of the next, so
 * the ball teleported down the gap — which is precisely the moment that makes a
 * marble run fun to watch.
 */
export const marbleRun = defineContraption({
  name: 'marble-run',
  label: 'Marble Run',
  tags: ['track', 'ball'],
  span: [2, 2],
  rotations: [0],
  setup: ({ color, rng }) => ({ color, ramps: rng.pick([3, 4, 4]) }),
  draw: (p, s, { w, h, size, u, ink, weight }) => {
    const n = s.ramps
    const d = size * 0.4
    const edge = w / 2 - weight
    const travel = edge - d * 0.55
    const pitch = h / (n + 0.5)
    // Steep enough that the switchback fills its square instead of reading as
    // two long horizontals with air between them.
    const tilt = pitch * 0.62
    const lip = d * 0.75
    /** Mid-height of ramp i. */
    const mid = (i: number) => -h / 2 + pitch * (i + 0.55)
    /** Ramps alternate; even ramps run left to right. */
    const rightward = (i: number) => i % 2 === 0

    // Each ramp gets a roll and then a drop onto the one below.
    const stage = Math.min(n - 1, Math.floor(u * n))
    const local = seg(u * n - stage, 0, 1)
    const rolling = Math.min(1, local / 0.74)
    const dropping = seg(local, 0.74, 1)
    const dir = rightward(stage)
    const exit = dir ? travel : -travel
    const restY = mid(stage) + tilt / 2 - d / 2

    const bx = dropping > 0 ? exit : lerp(dir ? -travel : travel, exit, rolling)
    const by =
      dropping > 0
        ? // Fall onto the high end of the next ramp, or out of the bottom.
          lerp(restY, stage === n - 1 ? h / 2 + d : mid(stage + 1) - tilt / 2 - d / 2, easeInQuad(dropping))
        : lerp(mid(stage) - tilt / 2, mid(stage) + tilt / 2, rolling) - d / 2

    clipBox(p, w, h, () => {
      outline(p, ink, weight)
      for (let i = 0; i < n; i++) {
        const goingRight = rightward(i)
        const x0 = goingRight ? -edge : edge
        const x1 = goingRight ? edge : -edge
        const y0 = mid(i) - tilt / 2
        const y1 = mid(i) + tilt / 2
        p.line(x0, y0, x1, y1)
        // A wall at the top end catches the ball dropping from above; the lip
        // at the bottom end is what turns it back the other way.
        p.line(x0, y0, x0, y0 - lip)
        p.line(x1, y1, x1, y1 - lip * 0.55)
      }

      solid(p, ink, weight, s.color)
      p.circle(bx, by, d)
    })
  },
})
