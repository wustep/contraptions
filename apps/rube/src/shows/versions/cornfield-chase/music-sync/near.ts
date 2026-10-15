import { mixHex } from '../../../../parts'
import { hash, type Screen } from './screen'

/**
 * The corn at your feet, in front of the machine: a few clumps of big leaves up out of the foot of the frame, by day,
 * going past quicker than the machine does, since they are nearer than it. Low, so they never stand in front of the
 * ball (which the camera keeps in the middle), and in clumps with gaps between, so the machine's lower floors show
 * through. They bend with the same wind as the rows.
 */
export function nearCorn(s: Screen, t: number, dusk: number, wind: (x: number) => number): void {
  const { ctx, cx, f, w } = s
  // The foot: the 16:9 frame's, or the canvas's, whichever is lower (a phone held upright sees the field go on).
  const foot = Math.max(s.h, s.cy + 0.5 * f)
  if (foot - f * 0.16 > s.h) return
  const W = (f * 16) / 9
  const pace = s.cell * 1.5
  const gap = f * 0.3
  const off = -s.camX * pace
  const k0 = Math.floor((-off - gap) / gap)
  const k1 = Math.ceil((w - off + gap) / gap)
  const blade = mixHex('#5A7A3C', '#4B3238', dusk)
  const rib = mixHex('#3F5A2A', '#352229', dusk)
  const leaves = new Path2D()
  const ribs = new Path2D()
  for (let k = k0; k <= k1; k++) {
    // Not every slot has a plant: the field at your feet is uneven.
    if (hash(k, 101) < 0.4) continue
    const x = off + k * gap + (hash(k, 102) - 0.5) * gap * 0.6
    const across = (x - (cx - W / 2)) / W
    const gust = wind(Math.max(0, Math.min(1, across)))
    const tall = f * (0.06 + 0.06 * hash(k, 103))
    const sway = Math.sin(t * (0.8 + 0.4 * hash(k, 106)) + k) * 0.04 + 0.12 * gust
    // The stalk, up out of the foot of the frame, leaning with the wind.
    const top = foot - tall
    ribs.moveTo(x, foot + f * 0.01)
    ribs.quadraticCurveTo(x, foot - tall * 0.5, x + sway * tall, top)
    // Its leaves, one each way up it: long, narrow, arching out and over, the tips down and carried by the wind.
    const n = 3 + Math.floor(hash(k, 104) * 2)
    for (let j = 0; j < n; j++) {
      const key = k * 13 + j
      const side = (j + Math.floor(hash(k, 107) * 2)) % 2 ? 1 : -1
      const up = (j + 0.5) / n
      const bx = x + sway * tall * up * up
      const by = foot - tall * up
      const L = f * (0.07 + 0.06 * hash(key, 105)) * (1.1 - 0.4 * up)
      const width = f * (0.0045 + 0.002 * hash(key, 109))
      const lift = 0.45 + 0.25 * hash(key, 108)
      const blow = (Math.sin(t * 1.1 + key) * 0.06 + 0.25 * gust) * L
      const p1 = [bx + side * 0.2 * L, by - lift * L]
      const p2 = [bx + side * 0.62 * L + blow * 0.5, by - lift * 0.95 * L]
      const tip = [bx + side * 0.95 * L + blow, by - (lift * 0.35 - 0.1) * L + Math.abs(blow) * 0.2]
      leaves.moveTo(bx - side * width, by)
      leaves.bezierCurveTo(p1[0] - side * width, p1[1] - width, p2[0], p2[1] - width * 1.2, tip[0], tip[1])
      leaves.bezierCurveTo(p2[0], p2[1] + width * 1.2, p1[0] + side * width, p1[1] + width, bx + side * width, by + width)
      leaves.closePath()
    }
  }
  ctx.fillStyle = blade
  ctx.fill(leaves)
  ctx.strokeStyle = rib
  ctx.lineWidth = Math.max(1, f * 0.004)
  ctx.lineCap = 'round'
  ctx.stroke(ribs)
}
