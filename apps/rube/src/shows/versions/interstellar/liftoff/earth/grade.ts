import type p5 from 'p5'
import { frame, scenery, smooth } from '../kit'
import { dayAt } from './light'

/**
 * The day's grade over the whole frame (`light.ts`), drawn over everything (its `over`): nothing in the morning and at
 * noon, warming through the afternoon, and the ochre of the storm light by the launch, eased off as the rocket climbs
 * toward the cloud.
 *
 * (This was the farm's near ground too: weeds, seed heads and stones along the bottom of the frame, stalk tips
 * whipping past in the corn chase, fence posts with a sagging wire past the dam, dust blowing low. Drawn over the
 * machine, its stems reached up into the truck and the channel's ramp, the stalks cut across the road and the dam's
 * post, and the wire ran over the cattle grid's pit; a strip of clutter along the foot of every outdoor shot. It went.)
 */
export const grade = scenery<null>({
  name: 'grade',
  draw: () => {},
  over: (p: p5, _s, c) => {
    const { k, t } = c
    if (t > 90) return
    const day = dayAt(t)
    if (day.gradeA <= 0.01) return
    const f = frame(p, k)
    const up = smooth(-f.cy, 4, 24)
    // The afternoon's warmth over the whole frame, multiplied in, gone as the rocket climbs.
    const a = day.gradeA * (1 - up) * (1 - smooth(t, 87.5, 88.6))
    if (a <= 0.01) return
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    ctx.globalAlpha = a
    ctx.fillStyle = day.grade
    const X = (x: number) => x * k
    ctx.fillRect(X(f.x0 - 1), X(f.y0 - 1), X(f.x1 - f.x0 + 2), X(f.y1 - f.y0 + 2))
    ctx.restore()
  },
})
