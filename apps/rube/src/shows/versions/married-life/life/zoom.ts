import type { Framing } from '../../../registry'
import { R } from '../../../../parts'
import { BALLOON_SIZE } from './props/balloon'
import { anchorIn, BALLOON_FROM, HALF, stringAt } from './cast'
import { DURATION } from './music'
import type { LifeShow } from './show'

/**
 * Zoom's own hold, worked out once for the whole show: under Zoom (half as close again round the frame's middle) the
 * two of them stayed inside the frame but often on its very edge, a cart's handle or a ticket press's foot away from
 * being cut (at the nursery's winch, the press, the climb, the storm, the ward). This keeps both of them within
 * `MARGIN` of the Zoom frame's half height (and half width) of its middle where the frame can give it, never pushing
 * the topmost of them, or the balloon's crown, past `CEIL` of it. It is added on top of a part's own hold
 * (`Framing.zoomDrop`), sampled every tenth of a second, its need held over half a second either side and smoothed, so
 * it moves as a slow camera would and never twitches with a hop: smoothed twice, and read along a curve. The show's
 * own frame is unchanged.
 */
const MARGIN = 0.8
const CEIL = 0.92
const STEP = 0.1
const HOLD = 5
const SMOOTH = 4

type Need = { drop: number; slide: number }
/** What a moment needs, and the most it allows (down, and either way across), before holding and smoothing. */
type Raw = Need & { capDown: number; capLeft: number; capRight: number }

function needAt(show: LifeShow, f: Framing, t: number): Raw {
  const zh = f.cells / 1.5 / 2
  const zw = (zh * 16) / 9
  const zy = f.y + (f.zoomDrop ?? 0) * zh
  const h = show.at(t)
  const e = show.ellie(t)
  const bodies: [number, number, number][] = []
  if (!h.hidden && h.scale >= 0.3) bodies.push([h.x, h.y, HALF * h.scale])
  if (e && (e.scale ?? 1) >= 0.3) bodies.push([e.x, e.y, R * (e.scale ?? 1)])
  if (!bodies.length) return { drop: 0, slide: 0, capDown: 0, capLeft: 0, capRight: 0 }
  // In shares of the Zoom frame's half height and half width, from its middle.
  let low = -Infinity
  let high = Infinity
  let left = Infinity
  let right = -Infinity
  for (const [x, y, r] of bodies) {
    low = Math.max(low, (y + r - zy) / zh)
    high = Math.min(high, (y - r - zy) / zh)
    left = Math.min(left, (x - r - f.x) / zw)
    right = Math.max(right, (x + r - f.x) / zw)
  }
  // The balloon's crown, at the highest it can ride: straight up over its knot on its taut string. (Where it really is,
  // `balloonAt`, lags over a second and a half of the past and costs sixty times as much; this bound is never lower.)
  if (t >= BALLOON_FROM) {
    const [, wy] = show.where(t)
    const [, ky] = anchorIn(show, t, show.owner(t))
    const crown = h.y + (ky - wy) - stringAt(show, t) - 2 * BALLOON_SIZE.ry
    high = Math.min(high, (crown - zy) / zh)
  }
  // Down (a positive drop moves the frame's middle down, so they rise in it) only as far as the top allows; and the
  // same across, only as far as the other side allows.
  const capDown = Math.max(0, high + CEIL)
  const capLeft = Math.max(0, CEIL - right)
  const capRight = Math.max(0, CEIL + left)
  const drop = Math.min(Math.max(0, low - MARGIN), capDown)
  const slideL = Math.min(Math.max(0, -left - MARGIN), capLeft)
  const slideR = Math.min(Math.max(0, right - MARGIN), capRight)
  return { drop, slide: slideR - slideL, capDown, capLeft, capRight }
}

let table: Need[] | null = null

function build(show: LifeShow, camera: (t: number) => Framing): Need[] {
  const n = Math.ceil(DURATION / STEP) + 1
  const raw: Raw[] = []
  for (let i = 0; i < n; i++) {
    const t = Math.min(DURATION, i * STEP)
    raw.push(needAt(show, camera(t), t))
  }
  // Held: the need over half a second either side, the larger of it (by size), so a brief need is met in time.
  const held = raw.map((_, i) => {
    let d = 0
    let s = 0
    for (let j = Math.max(0, i - HOLD); j <= Math.min(n - 1, i + HOLD); j++) {
      if (raw[j].drop > d) d = raw[j].drop
      if (Math.abs(raw[j].slide) > Math.abs(s)) s = raw[j].slide
    }
    return { drop: d, slide: s }
  })
  // The allowance, held the other way (the least of it either side) and smoothed the same, so the held need, which
  // reaches half a second ahead, never takes the frame past what a neighbouring moment allows (the balloon's crown).
  const caps = raw.map((_, i) => {
    let d = Infinity
    let l = Infinity
    let r = Infinity
    for (let j = Math.max(0, i - HOLD - SMOOTH); j <= Math.min(n - 1, i + HOLD + SMOOTH); j++) {
      d = Math.min(d, raw[j].capDown)
      l = Math.min(l, raw[j].capLeft)
      r = Math.min(r, raw[j].capRight)
    }
    return { d, l, r }
  })
  // Smoothed: a triangle window, so it comes and goes as a slow camera move; then kept within the allowance.
  const smooth = held.map((_, i) => {
    let d = 0
    let s = 0
    let w = 0
    for (let j = -SMOOTH; j <= SMOOTH; j++) {
      const k = Math.max(0, Math.min(n - 1, i + j))
      const wi = SMOOTH + 1 - Math.abs(j)
      d += held[k].drop * wi
      s += held[k].slide * wi
      w += wi
    }
    return { drop: d / w, slide: s / w }
  })
  const capped = smooth.map((v, i) => {
    let d = 0
    let l = 0
    let r = 0
    let w = 0
    for (let j = -SMOOTH; j <= SMOOTH; j++) {
      const k = Math.max(0, Math.min(n - 1, i + j))
      const wi = SMOOTH + 1 - Math.abs(j)
      d += caps[k].d * wi
      l += caps[k].l * wi
      r += caps[k].r * wi
      w += wi
    }
    return { drop: Math.min(v.drop, d / w), slide: Math.max(-l / w, Math.min(r / w, v.slide)) }
  })
  // Smoothed once more, after the cap: a triangle twice over is near a bell, so the camera's speed under Zoom changes
  // as gently as its own move does (the cap is wide enough that this never takes it past an allowance; the crown's
  // check holds it to that).
  return capped.map((_, i) => {
    let d = 0
    let s = 0
    let w = 0
    for (let j = -SMOOTH; j <= SMOOTH; j++) {
      const k = Math.max(0, Math.min(n - 1, i + j))
      const wi = SMOOTH + 1 - Math.abs(j)
      d += capped[k].drop * wi
      s += capped[k].slide * wi
      w += wi
    }
    return { drop: d / w, slide: s / w }
  })
}

/** Zoom's own hold at `t`, on top of the framing `f` a part asked for. */
export function zoomHold(show: LifeShow, camera: (t: number) => Framing, t: number): Need {
  if (!table) table = build(show, camera)
  // A Catmull-Rom curve through the samples, not straight lines between them: straight lines change the camera's speed
  // abruptly at every tenth of a second, a small judder under Zoom.
  const T = table
  const u = Math.max(0, Math.min(T.length - 1, t / STEP))
  const i = Math.min(T.length - 2, Math.floor(u))
  const a = u - i
  const at = (k: number) => T[Math.max(0, Math.min(T.length - 1, k))]
  const cr = (p0: number, p1: number, p2: number, p3: number) =>
    p1 + 0.5 * a * (p2 - p0 + a * (2 * p0 - 5 * p1 + 4 * p2 - p3 + a * (3 * (p1 - p2) + p3 - p0)))
  const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
  return { drop: cr(p0.drop, p1.drop, p2.drop, p3.drop), slide: cr(p0.slide, p1.slide, p2.slide, p3.slide) }
}
