import { R } from '../../../../../../parts'
import { FREMEN, FREMEN_RIM } from '../../cast'
import { circle, clamp01, smooth, smoother, type Brush, type Pt } from '../../paint'
import { paintBody, paintMouth, SKIN } from '../../world/worm'
import { curveOf, headX, leadOn, leadWorm, mouthOpen, WR, type WormBody } from './plan'
import { sandAt } from './storm'

/**
 * The worms of the charge. The lead worm in the action's plane, with Paul and Chani on its back (balls, in `people.ts`);
 * two more further back, smaller in their layers, each with a few Fremen on it (drawn here, as the far worm's riders
 * are too small and too far to be the show's own balls).
 *
 * A running worm is a long low arch over the sand, its head just above the surface pushing a bow of sand before it, its
 * hump high over its riders, its tail going down under the sand behind. The rings stay on the body.
 */

/** The head: a blunt cap of plates, or the mouth, opening, when it rears. */
function paintHead(b: Brush, w: WormBody, open: number): void {
  const { ctx } = b
  const [x, y] = w.spine[0]
  const r = w.radius[0]
  const dir = w.headDir
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(dir)
  // The cap: the front of the tube, rounded off.
  ctx.beginPath()
  ctx.ellipse(0, 0, r * 0.55, r, 0, -Math.PI / 2, Math.PI / 2)
  ctx.closePath()
  ctx.fillStyle = b.c(SKIN.side)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(0, 0, r * 0.55, r, 0, -Math.PI / 2, -Math.PI / 6)
  ctx.lineTo(0, 0)
  ctx.closePath()
  ctx.fillStyle = b.c(SKIN.back)
  ctx.fill()
  ctx.restore()
  if (open > 0.02) {
    // The mouth faces the way the head goes: seen from the side, an ellipse across the end of the tube.
    ctx.save()
    ctx.translate(x + Math.cos(dir) * r * 0.3, y + Math.sin(dir) * r * 0.3)
    ctx.rotate(dir + Math.PI / 2)
    paintMouth(b, 0, 0, r * (0.9 + 0.12 * open), 0.18 + 0.32 * open, open)
    ctx.restore()
  }
}

/** The bow of sand a running head pushes before it, and the spray thrown back off it: by the head's speed. */
function paintBow(b: Brush, hx: number, speed: number, color: string): void {
  const { ctx } = b
  const k = clamp01(speed / 9)
  if (k < 0.03) return
  const h = 2.6 * k
  ctx.beginPath()
  ctx.moveTo(hx - 3.5, 0.3)
  ctx.quadraticCurveTo(hx - 0.5, -h * 1.1, hx + 1.2, -h)
  ctx.quadraticCurveTo(hx + 3.2, -h * 0.5, hx + 5.5 * k + 1, 0.3)
  ctx.closePath()
  ctx.fillStyle = b.c(color)
  ctx.fill()
}

/** The lead worm in the action's plane. */
export function paintLead(b: Brush): void {
  const t = b.t
  if (!leadOn(t)) return
  const w = leadWorm(t)
  const { view } = b
  if (w.spine[0][0] + 10 < view.x0 || w.spine[w.spine.length - 1][0] - 10 > view.x1) return
  paintBody(b, { spine: w.spine, radius: w.radius, travel: 0, ring: 3.3 })
  paintHead(b, w, mouthOpen(t))
  const sand = sandAt(t)
  const speed = (headX(t + 0.05) - headX(t - 0.05)) / 0.1
  // The bow while it runs along the flat with its head down.
  if (w.spine[0][1] > -WR * 1.6) paintBow(b, w.spine[0][0] + w.radius[0] * 0.4, speed, sand.lit)
}

/* ---------------------------------------------------------------- far worms */

interface FarWorm {
  /** How far behind the action's plane, cells (`depthScale`). */
  d: number
  r: number
  /** Its head along the flat, as if in the action's plane. */
  x: (t: number) => number
  /** Down into the sand from this time, over four seconds. */
  dive: number
  riders: number[]
}

function farBody(fw: FarWorm, t: number): WormBody | null {
  const hx = fw.x(t)
  const down = smoother(t, fw.dive, fw.dive + 4)
  if (down >= 0.999) return null
  const sink = down * (fw.r * 2 + 6)
  const L = 64
  const step = 0.8
  const spine: Pt[] = []
  const radius: number[] = []
  for (let s = 0; s <= L; s += step) {
    const h = s <= 28 ? fw.r * 0.25 + (fw.r + 1.8 - fw.r * 0.25) * smoother(s, 0, 22) : (fw.r + 1.8) - (fw.r * 2.6 + 1.8) * smoother(s, 34, L)
    spine.push([hx - s, -h + sink])
    radius.push(fw.r * (0.82 + 0.18 * smooth(s, 0, 5)) * (1 - 0.15 * smooth(s, 40, L)))
  }
  const headDir = Math.atan2(spine[0][1] - spine[2][1], spine[0][0] - spine[2][0])
  const backAt = (s: number, lift = 0): Pt => {
    const i = Math.max(1, Math.min(spine.length - 2, Math.round(s / step)))
    const [ax, ay] = spine[i - 1]
    const [bx, by] = spine[i + 1]
    let nx = by - ay
    let ny = -(bx - ax)
    const l = Math.hypot(nx, ny) || 1
    nx /= l
    ny /= l
    if (ny > 0) {
      nx = -nx
      ny = -ny
    }
    return [spine[i][0] + nx * (radius[i] + lift), spine[i][1] + ny * (radius[i] + lift)]
  }
  return { spine, radius, headDir, backAt }
}

export const FAR_WORMS: FarWorm[] = [
  {
    d: 44,
    r: 3.4,
    x: curveOf([[263, 8885], [270.437, 8958], [279.795, 9022], [280.514, 9026], [290, 9070], [300, 9092], [307.862, 9100]]),
    dive: 307.862,
    riders: [29, 31.5, 34, 36.5],
  },
  {
    d: 100,
    r: 3.3,
    x: curveOf([[263, 8870], [271.615, 8958], [281.658, 9040], [292, 9086], [306.202, 9112]]),
    dive: 306.202 + 1.2,
    riders: [30, 33, 36],
  },
]

/** A far worm and its riders, in its layer: drawn after its layer's camp, before its layer's sand. */
export function paintFarWorm(b: Brush, fw: FarWorm): void {
  const w = farBody(fw, b.t)
  if (!w) return
  const { view } = b
  if (w.spine[0][0] + 8 < view.x0 || w.spine[w.spine.length - 1][0] - 8 > view.x1) return
  paintBody(b, { spine: w.spine, radius: w.radius, travel: 0, ring: 3.3 })
  paintHead(b, w, 0)
  const speed = (fw.x(b.t + 0.05) - fw.x(b.t - 0.05)) / 0.1
  paintBow(b, w.spine[0][0] + w.radius[0] * 0.4, speed, sandAt(b.t).lit)
  // The riders: dun, each on the back, a little apart.
  const { ctx } = b
  for (const s of fw.riders) {
    const [x, y] = w.backAt(s, R * 0.94)
    circle(ctx, x, y, R * 0.94)
    ctx.fillStyle = b.c(FREMEN)
    ctx.fill()
    ctx.lineWidth = Math.max(1.25 * b.px, R * 0.22)
    ctx.strokeStyle = b.c(FREMEN_RIM)
    ctx.stroke()
  }
}

