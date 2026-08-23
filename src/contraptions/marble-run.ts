import { defineContraption } from '../core/define'
import { clipBox, outline, solid } from '../core/draw'
import { easeInQuad, lerp, seg } from '../core/ease'

/** A ball working its way down a switchback chute. */
export const marbleRun = defineContraption({
  name: 'marble-run',
  label: 'Marble Run',
  tags: ['track', 'ball'],
  span: [2, 2],
  rotations: [0],
  setup: ({ color, rng }) => ({ color, ramps: rng.pick([3, 3, 4]) }),
  draw: (p, s, { w, h, size, u, ink, weight }) => {
    const n = s.ramps
    const d = size * 0.34
    const edge = w / 2 - weight / 2
    const travel = edge - d * 0.65
    const pitch = h / (n + 0.35)
    const drop = pitch * 0.55
    /** Mid-height of ramp i. */
    const mid = (i: number) => -h / 2 + pitch * (i + 0.6)
    /** Ramps alternate; even ramps run left to right. */
    const rightward = (i: number) => i % 2 === 0

    const stage = Math.min(n, Math.floor(u * (n + 1)))
    const local = seg(u * (n + 1) - stage, 0, 1)

    let bx = 0
    let by = 0
    if (stage < n) {
      const dir = rightward(stage)
      bx = lerp(dir ? -travel : travel, dir ? travel : -travel, local)
      by = lerp(mid(stage) - drop / 2, mid(stage) + drop / 2, local) - d / 2
    } else {
      const dir = rightward(n - 1)
      bx = dir ? travel : -travel
      by = mid(n - 1) + drop / 2 - d / 2 + easeInQuad(local) * h
    }

    clipBox(p, w, h, () => {
      outline(p, ink, weight)
      for (let i = 0; i < n; i++) {
        const dir = rightward(i)
        const x0 = dir ? -edge : edge
        const x1 = dir ? edge : -edge
        p.line(x0, mid(i) - drop / 2, x1, mid(i) + drop / 2)
        // The stop at the low end that turns the ball back the other way.
        p.line(x1, mid(i) + drop / 2, x1, mid(i) + drop / 2 - d)
      }
      solid(p, ink, weight, s.color)
      p.circle(bx, by, d)
    })
  },
})
