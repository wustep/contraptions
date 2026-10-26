import { R } from '../../../../../../parts'
import { FREMEN, FREMEN_RIM } from '../../cast'
import { circle, clamp01, hash, noise1, smooth, type Brush, type Pt } from '../../paint'
import { paintBody, paintMouth, SKIN } from '../../world/worm'
import { paintPuff } from './dust'
import { B, LEAD, SECOND, THIRD, ground, mouthOpen, rearing, wormAt, wormOn, type WormBody, type WormSpec } from './plan'
import { sandAt } from './storm'

/**
 * The worms of the charge. The lead worm in the action's plane, with Paul and Chani on its back (balls, in `people.ts`);
 * the second just beyond it and the third far back, each in its layer with a few Fremen on it (drawn here: they are the
 * far worms' riders, too far to be the show's own balls).
 *
 * A running worm is a long low arch over the sand, its head just above the surface pushing a bow of sand before it, its
 * hump high over its riders, its tail going down under the sand behind. The rings stay on the body. When the lead worm
 * rears, its neck gathers and thickens, sand pours off its underside, and its mouth opens wide on its teeth.
 */

/** The head: a blunt cap of plates, or the mouth, opening. */
function paintHead(b: Brush, w: WormBody, open: number): void {
  const { ctx } = b
  const [x, y] = w.spine[0]
  const r = w.radius[0]
  const dir = w.headDir
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(dir)
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
    // The mouth faces the way the head goes: opened, it turns toward us, a wide ring of teeth round the throat.
    ctx.save()
    ctx.translate(x + Math.cos(dir) * r * 0.35, y + Math.sin(dir) * r * 0.35)
    ctx.rotate(dir + Math.PI / 2)
    paintMouth(b, 0, 0, r * (1 + 0.36 * open), 0.2 + 0.5 * open, open)
    ctx.restore()
  }
}

/** The bow of sand a running head pushes before it: by the head's speed. */
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

/** One worm: its body, its head, and the bow of sand before a running head. */
function paintWorm(b: Brush, spec: WormSpec, open = 0): WormBody | null {
  const t = b.t
  if (!wormOn(spec, t)) return null
  const w = wormAt(spec, t)
  const { view } = b
  if (w.spine[0][0] + 12 < view.x0 || w.spine[w.spine.length - 1][0] - 12 > view.x1) return null
  paintBody(b, { spine: w.spine, radius: w.radius, travel: 0 })
  paintHead(b, w, open)
  const speed = (spec.headX(t + 0.05) - spec.headX(t - 0.05)) / 0.1
  if (w.spine[0][1] > -spec.r * 1.6) paintBow(b, w.spine[0][0] + w.radius[0] * 0.4, speed, sandAt(t).lit)
  return w
}

/**
 * Sand pouring off the rearing neck's underside, in long curtains to the floor: as it lifts out of the sand, and from its
 * head when it comes down. Pale against the storm, thinning as it falls, gone in a few seconds.
 */
function paintPour(b: Brush): void {
  const t = b.t
  const up = smooth(t, B.peak, B.peak + 0.5) * (1 - smooth(t, B.peak + 1.8, B.peak + 3.6))
  const down = smooth(t, B.crash - 0.05, B.crash + 0.2) * (1 - smooth(t, B.crash + 0.8, B.crash + 2.4))
  if (up <= 0.002 && down <= 0.002) return
  const w = wormAt(LEAD, t)
  const { ctx } = b
  const color = sandAt(t).lit
  const streams: [number, number][] = [
    [5, down],
    [9, Math.max(up, down * 0.7)],
    [13, up],
    [17, up],
    [21, up * 0.8],
  ]
  for (const [s, a] of streams) {
    if (a <= 0.002) continue
    const [x, y] = w.bellyAt(s)
    if (y > -0.4) continue
    const half = 0.5 + 0.35 * hash(s, 3)
    const drift = -0.6 - 0.5 * hash(s, 4)
    // Necking as it falls and spreading where it lands, its edges wavering downward, so it reads as sand falling and not
    // as a pale ruled strip from the belly to the floor.
    const m = 14
    const edge = (sgn: number): Pt[] => {
      const pts: Pt[] = []
      for (let j = 0; j <= m; j++) {
        const u = j / m
        const yy = y + (0.2 - y) * u
        const hw = half * (1 - 0.6 * u + 0.8 * u * u * u) * (1 + 0.35 * noise1((yy - 10 * t) * 0.25, s * 3 + sgn))
        pts.push([x + drift * u * u + sgn * hw, yy])
      }
      return pts
    }
    const l = edge(-1)
    const r = edge(1)
    ctx.beginPath()
    ctx.moveTo(l[0][0], l[0][1])
    for (const p of l) ctx.lineTo(p[0], p[1])
    for (let j = m; j >= 0; j--) ctx.lineTo(r[j][0], r[j][1])
    ctx.closePath()
    const gr = ctx.createLinearGradient(0, y, 0, 0.2)
    gr.addColorStop(0, b.ca(color, 0.3 * a))
    gr.addColorStop(0.08, b.ca(color, 0.7 * a))
    gr.addColorStop(0.5, b.ca(color, 0.35 * a))
    gr.addColorStop(1, b.ca(color, 0.1 * a))
    ctx.fillStyle = gr
    ctx.fill()
  }
}

/**
 * The lead worm in the action's plane, with the sand off its rear, and the burst where its head comes down: thrown up off
 * the sand under the blow and drawn behind the worm, so it never lies over the open mouth as a halo.
 */
export function paintLead(b: Brush): void {
  paintPour(b)
  if (b.t > B.crash && b.t < B.crash + 3) {
    const tip = wormAt(LEAD, B.crash).spine[0]
    const x = tip[0] + 1.5
    paintPuff(b, { x, y: ground(x) - 0.4, at: B.crash, size: 8 + 2 * rearing(b.t), drift: 0.9, life: 2.4 }, sandAt(b.t).lit)
  }
  paintWorm(b, LEAD, mouthOpen(b.t))
}

/* ---------------------------------------------------------------- the far worms */

export interface Far {
  spec: WormSpec
  /** How far behind the action's plane, cells. */
  d: number
  /** Where its riders sit, cells behind its head. */
  riders: number[]
  /** The small ship in its layer, and when it is struck and lands. */
  ship: { x: number; h: number; w: number; hit: number; land: number }
}

/** A far worm and its riders, in its layer (drawn by the scene with its ship and its sand). */
export function paintFarWorm(b: Brush, far: Far, riders: Brush): void {
  const w = paintWorm(b, far.spec)
  if (!w) return
  // The riders: dun, each on the back, a little apart, in their own colour: what is on a worm is not the dust.
  const { ctx } = riders
  for (const s of far.riders) {
    const [x, y] = w.backAt(s, R * 0.94)
    circle(ctx, x, y, R * 0.94)
    ctx.fillStyle = riders.c(FREMEN)
    ctx.fill()
    ctx.lineWidth = Math.max(1.25 * riders.px, R * 0.22)
    ctx.strokeStyle = riders.c(FREMEN_RIM)
    ctx.stroke()
  }
}

export { SECOND, THIRD }
