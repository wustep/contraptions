import { scenery } from '../kit'
import { frame } from '../kit'
import { RAILWAY } from '../worlds'

/**
 * EXPRESS's file (a stub until built): the railway world's night, drawn from show time wherever the camera is: the
 * sky, the moon, the plain and the river. FIREWORKS's festival stands in it too, so land it early and keep its name;
 * FIREWORKS draws the festival's own sky (smoke, bursts) over it.
 */
export const night = scenery<null>({
  name: 'railway-night',
  draw: (p, _s, c) => {
    const { k } = c
    const f = frame(p, k)
    p.push()
    p.noStroke()
    p.rectMode(p.CORNER)
    p.fill(RAILWAY.sky)
    p.rect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
    p.fill(RAILWAY.plain)
    p.rect(f.x0 * k, 0.6 * k, (f.x1 - f.x0) * k, Math.max(0, f.y1 - 0.6) * k)
    p.pop()
  },
})
