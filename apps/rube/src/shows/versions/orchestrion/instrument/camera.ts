import type { Framing } from '../../../registry'
import type { Performance } from './run'
import type { Note } from './score'

/**
 * The camera keeps the instrument in view and leans towards the music. At 16:9 a frame tall enough for one bay, rail
 * to pipe, is already most of the instrument wide, so it does not cut in to a bay: it holds the whole of it, or nearly,
 * and drifts towards what is sounding — the bars and strings struck in the last few seconds and the next half second,
 * weighted by how hard and how recently — a little closer when the sound is all in one place, wide when it is spread.
 * A slow spring between, so it drifts and never jumps.
 *
 * Before the first ball it rests on the jar and the escapement, and follows that ball down its bay; it is a minute
 * before it settles back to the whole. The last ball through the coda it leans in on, and when it has gone it draws
 * back to the whole instrument, at rest, the bowl full.
 */

const RATE = 10
const WIDE_PAD = 1.05

export function makeCamera(perf: Performance, list: Note[]): (t: number) => Framing {
  const box = perf.machine.box
  const whole: Framing = {
    x: (box.x0 + box.x1) / 2,
    y: (box.y0 + box.y1) / 2,
    cells: Math.max(box.y1 - box.y0, ((box.x1 - box.x0) * 9) / 16) * WIDE_PAD,
  }
  const wide = whole.cells
  const sounding = list.filter((n) => n.kind === 'bar' || n.kind === 'string' || n.kind === 'pipe')
  const last = sounding.length ? sounding[sounding.length - 1].t : 0
  const first = perf.releases[0]?.t ?? 0
  const coda = perf.releases[perf.releases.length - 1]?.t ?? Infinity
  const opening: Framing = { x: 1.2, y: 0.2, cells: 8 }
  /** How close it may come, over the show: close on the first ball, then held back, then a little in for the coda. */
  const closest = (t: number): number => {
    if (t > coda - 1) return 15.5
    const early = 11
    const held = 21.6
    if (t < 16) return early
    if (t > 40) return held
    return early + (held - early) * ((t - 16) / 24)
  }

  const target = (t: number): Framing => {
    if (t < first + 0.4) return opening
    let sw = 0
    let sx = 0
    let sy = 0
    let sxx = 0
    let syy = 0
    for (const n of sounding) {
      if (n.t > t + 0.5) break
      const age = t - n.t
      if (age > 4) continue
      const w = Math.exp(-Math.abs(age) / 1.4)
      sw += w
      sx += w * n.x
      sy += w * n.y
      sxx += w * n.x * n.x
      syy += w * n.y * n.y
    }
    if (sw < 0.15 || t > last + 1.5) return whole
    const mx = sx / sw
    const my = sy / sw
    const vx = Math.sqrt(Math.max(0, sxx / sw - mx * mx))
    const vy = Math.sqrt(Math.max(0, syy / sw - my * my))
    const near = closest(t)
    const cells = Math.max(near, Math.min(wide, Math.max(vy * 2.4 + 9.5, ((vx * 2.4 + 12) * 9) / 16)))
    // The frame is drawn in toward the whole instrument as it widens, so the widest is the whole.
    const f = Math.pow((cells - 11) / (wide - 11), 0.6)
    return { x: mx + (whole.x - mx) * f, y: my + 1 + (whole.y - my - 1) * f, cells }
  }

  // The spring, run once over the whole show.
  const n = Math.ceil(perf.duration * RATE) + 2
  const xs = new Float64Array(n)
  const ys = new Float64Array(n)
  const cs = new Float64Array(n)
  let x = opening.x
  let y = opening.y
  let c = opening.cells
  let vx = 0
  let vy = 0
  let vc = 0
  const w = 0.75
  const sub = 10
  for (let i = 0; i < n; i++) {
    const t = i / RATE
    const tg = target(t)
    for (let s = 0; s < sub; s++) {
      const dt = 1 / RATE / sub
      vx += (w * w * (tg.x - x) - 2 * w * vx) * dt
      vy += (w * w * (tg.y - y) - 2 * w * vy) * dt
      vc += (w * w * (tg.cells - c) - 2 * w * vc) * dt
      x += vx * dt
      y += vy * dt
      c += vc * dt
    }
    xs[i] = x
    ys[i] = y
    cs[i] = c
  }
  return (t: number): Framing => {
    const at = Math.max(0, Math.min(n - 1.001, t * RATE))
    const i = Math.floor(at)
    const f = at - i
    return { x: xs[i] + (xs[i + 1] - xs[i]) * f, y: ys[i] + (ys[i + 1] - ys[i]) * f, cells: cs[i] + (cs[i + 1] - cs[i]) * f }
  }
}
