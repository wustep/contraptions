import type p5 from 'p5'
import { R, ball, type Piece, type PieceCtx, type Pt } from '../../../../parts'
import type { Placed } from '../../../../plan'
import type { Universe } from '../../../../universe'
import { frame, hash, scenery } from './kit'
import { SEAM } from './music'
import type { QuintessenceShow } from './show'

/**
 * The passages: every change of place is something that happens in the picture, never a cut.
 *
 * The cuts stay where they were, on Walter (`score.ts`): on the screen he holds still while the place changes round
 * him. What changes is that for a second or so either side of each one, both places are on the screen at once. The
 * place he is going to is drawn whole into a second canvas, by the camera carried across the cut, and laid over the
 * place he is in through a shape that grows out of something already in the picture: the blank frame he stares into
 * opens into the daydream and closes on it again, the projector's light, the bar's door thrown open, the sea's skin
 * coming up past the lens, Sean's notes on the wrapper unfolding into the road, the last negative opening on the
 * snow, Sean's shutter, and the loading door's strip curtain. After the cut it is the other way about: the place he
 * has left is laid over the one he is in, through what is left of the shape.
 *
 * The ash (`score.ts`) is the one passage under a cover, and stays its own.
 *
 * Walter is drawn by the place he is in. Where the shape lays the other place over him, he is drawn again on top,
 * as he is: nothing here changes his colour.
 */

type C2 = CanvasRenderingContext2D

/** How a passage shapes the place he is going to, at `u` (0 to 1 across its window), in device pixels. */
interface Shape {
  /** The region where the new place is seen. Undefined: none of it (the shutter, which covers both). */
  region?(u: number, W: number, H: number, him: Pt, s: number): Path2D
  /** The region is a ring (the frame less a hole), filled even-odd. */
  evenodd?: boolean
  /** What is drawn on the seam: a glow on the edge, the blades, the foam. Over everything, under Walter. */
  deco?(ctx: C2, u: number, W: number, H: number, him: Pt, s: number, t: number): void
}

interface Passage extends Shape {
  /** The cut's show time. */
  at: number
  /** Seconds before and after the cut it runs. */
  before: number
  after: number
  /** How `u` goes: the shape's own pace. */
  ease?: (x: number) => number
}

const clamp = (x: number) => Math.max(0, Math.min(1, x))
const smooth = (x: number) => { const u = clamp(x); return u * u * (3 - 2 * u) }
const easeIn = (x: number) => { const u = clamp(x); return u * u * u }
const easeOut = (x: number) => { const u = clamp(x); return 1 - Math.pow(1 - u, 3) }
/** Out of the dark slowly, then all at once, settling: a reveal that bursts on the cut. */
const burst = (x: number) => { const u = clamp(x); return u < 0.35 ? 0.12 * (u / 0.35) ** 2 : 0.12 + 0.88 * easeOut((u - 0.35) / 0.65) }

/** A rectangle round `him`, half-sizes `hw`, `hh`, with its corners rounded by `r`. */
function rounded(cx: number, cy: number, hw: number, hh: number, r: number): Path2D {
  const path = new Path2D()
  const rr = Math.max(0, Math.min(r, hw, hh))
  path.roundRect(cx - hw, cy - hh, 2 * hw, 2 * hh, rr)
  return path
}

/** The distance from `him` to the frame's farthest corner: how big a shape round him has to grow to fill it. */
const reach = (W: number, H: number, him: Pt) => Math.max(Math.hypot(him[0], him[1]), Math.hypot(W - him[0], him[1]), Math.hypot(him[0], H - him[1]), Math.hypot(W - him[0], H - him[1]))

/** A soft bloom along a path's edge: the light the opening lets through. */
function edgeGlow(ctx: C2, path: Path2D, color: string, width: number, a: number): void {
  if (a <= 0.01) return
  ctx.save()
  ctx.globalAlpha = a
  ctx.strokeStyle = color
  ctx.lineJoin = 'round'
  for (const [w, al] of [[width * 3.2, 0.18], [width * 1.6, 0.35], [width * 0.5, 0.9]] as const) {
    ctx.globalAlpha = a * al
    ctx.lineWidth = w
    ctx.stroke(path)
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ the shapes */

/** The blank frame he stares into opens, and the daydream pours out of it. */
const frameOut: Shape = {
  region(u, W, H, him, s) {
    const r = reach(W, H, him)
    const hw = 0.5 * s + (r * 1.2 - 0.5 * s) * u
    const hh = 0.38 * s + (r * 1.2 - 0.38 * s) * u
    return rounded(him[0], him[1] - 0.12 * s * (1 - u), hw, hh, 0.05 * s)
  },
  deco(ctx, u, W, H, him, s) {
    const path = this.region!(u, W, H, him, s)
    edgeGlow(ctx, path, '#FFF6E8', 0.09 * s, Math.sin(Math.PI * clamp(u * 1.15)) * 0.95)
    // The light table's white, flaring as the frame opens.
    const flare = Math.max(0, 1 - Math.abs(u - 0.3) / 0.3)
    if (flare > 0) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const g = ctx.createRadialGradient(him[0], him[1], 0, him[0], him[1], 2.4 * s)
      g.addColorStop(0, `rgba(255, 246, 228, ${0.55 * flare})`)
      g.addColorStop(1, 'rgba(255, 246, 228, 0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
      ctx.restore()
    }
  },
}

/** …and closes again on the daydream, drained grey, back into the blank frame. */
const frameIn: Shape = {
  evenodd: true,
  region(u, W, H, him, s) {
    // The office is everything but the shrinking frame the daydream is still in.
    const r = reach(W, H, him)
    const v = 1 - u
    const hw = Math.max(0, 0.5 * s * smooth(v * 3) + (r * 1.2 - 0.5 * s) * easeIn(v))
    const hh = Math.max(0, 0.38 * s * smooth(v * 3) + (r * 1.2 - 0.38 * s) * easeIn(v))
    const path = new Path2D()
    path.rect(-10, -10, W + 20, H + 20)
    path.addPath(rounded(him[0], him[1] - 0.12 * s * u, hw, hh, 0.05 * s))
    return path
  },
  deco(ctx, u, W, H, him, s) {
    const r = reach(W, H, him)
    const v = 1 - u
    const hw = Math.max(0, 0.5 * s * smooth(v * 3) + (r * 1.2 - 0.5 * s) * easeIn(v))
    const hh = Math.max(0, 0.38 * s * smooth(v * 3) + (r * 1.2 - 0.38 * s) * easeIn(v))
    if (hw < 1) return
    edgeGlow(ctx, rounded(him[0], him[1] - 0.12 * s * u, hw, hh, 0.05 * s), '#E8ECEC', 0.07 * s, Math.sin(Math.PI * clamp(u)) * 0.85)
  },
}

/** The projector's light: an iris out of the ship's picture, its rim burning amber like film in the gate. */
const projector: Shape = {
  region(u, W, H, him) {
    const r = reach(W, H, him) * 1.08 * u
    const path = new Path2D()
    // A circle that wavers a little, as a burn does.
    const n = 48
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2
      const w = 1 + 0.06 * Math.sin(a * 5 + u * 9) + 0.04 * Math.sin(a * 9 - u * 13)
      const x = him[0] + Math.cos(a) * r * w
      const y = him[1] + Math.sin(a) * r * w
      if (i === 0) path.moveTo(x, y)
      else path.lineTo(x, y)
    }
    path.closePath()
    return path
  },
  deco(ctx, u, W, H, him, s) {
    if (u <= 0 || u >= 1) return
    const path = this.region!(u, W, H, him, s)
    const a = Math.sin(Math.PI * u)
    edgeGlow(ctx, path, '#F2B35A', 0.16 * s, a)
    edgeGlow(ctx, path, '#FFF1D2', 0.05 * s, a)
  },
}

/** The bar's door thrown open on the daylight: the light comes in as a slab from him, blinding, and opens to both sides. */
const doorAt = (u: number, W: number, him: Pt) => ({
  left: him[0] - (him[0] + 40) * easeIn(u * 1.05) - 4,
  right: him[0] + (W - him[0] + 40) * easeOut(u) + 4,
})
const door: Shape = {
  region(u, W, H, him) {
    const { left, right } = doorAt(u, W, him)
    const path = new Path2D()
    path.rect(left, -10, right - left, H + 20)
    return path
  },
  deco(ctx, u, W, H, him, s) {
    const { left, right } = doorAt(u, W, him)
    const a = Math.sin(Math.PI * clamp(u * 1.1))
    if (a <= 0.01) return
    ctx.save()
    // The bar goes darker beside the light: the eye stopping down for the day outside.
    ctx.fillStyle = `rgba(14, 10, 8, ${0.45 * a})`
    ctx.fillRect(-10, -10, Math.max(0, left + 10), H + 20)
    ctx.fillRect(right, -10, W + 10 - right, H + 20)
    ctx.globalCompositeOperation = 'lighter'
    // The day, blown out where it first comes in, and settling to the pad as the eye adjusts.
    const g0 = ctx.createLinearGradient(0, 0, 0, H)
    g0.addColorStop(0, `rgba(250, 252, 255, ${0.85 * a * (1 - u * 0.8)})`)
    g0.addColorStop(1, `rgba(250, 252, 255, ${0.55 * a * (1 - u * 0.8)})`)
    ctx.fillStyle = g0
    ctx.fillRect(left, 0, right - left, H)
    // Light spilling round the jambs.
    for (const x of [left, right]) {
      const g = ctx.createLinearGradient(x - 1.2 * s, 0, x + 1.2 * s, 0)
      g.addColorStop(0, 'rgba(255, 250, 236, 0)')
      g.addColorStop(0.5, `rgba(255, 250, 236, ${0.85 * a})`)
      g.addColorStop(1, 'rgba(255, 250, 236, 0)')
      ctx.fillStyle = g
      ctx.fillRect(x - 1.2 * s, 0, 2.4 * s, H)
    }
    ctx.restore()
  },
}

/** The sea's skin: the line of the water comes up past the lens as he goes in, foam on it, bubbles under it. */
const waterAt = (u: number, H: number, s: number, x: number) => {
  const base = H * 1.15 - (H * 1.35) * smooth(u)
  return base + 0.12 * s * Math.sin(x / (1.3 * s) + u * 7) + 0.06 * s * Math.sin(x / (0.47 * s) - u * 11)
}
const waterline: Shape = {
  region(u, W, H, _him, s) {
    const path = new Path2D()
    path.moveTo(-10, H + 20)
    for (let x = -10; x <= W + 10; x += Math.max(6, W / 60)) path.lineTo(x, waterAt(u, H, s, x))
    path.lineTo(W + 10, waterAt(u, H, s, W + 10))
    path.lineTo(W + 10, H + 20)
    path.closePath()
    return path
  },
  deco(ctx, u, W, H, _him, s, t) {
    if (u <= 0 || u >= 1) return
    const line = new Path2D()
    for (let x = -10; x <= W + 10; x += Math.max(6, W / 60)) {
      const y = waterAt(u, H, s, x)
      if (x === -10) line.moveTo(x, y)
      else line.lineTo(x, y)
    }
    ctx.save()
    ctx.lineJoin = 'round'
    ctx.strokeStyle = 'rgba(236, 244, 244, 0.85)'
    ctx.lineWidth = 0.07 * s
    ctx.stroke(line)
    ctx.strokeStyle = 'rgba(236, 244, 244, 0.3)'
    ctx.lineWidth = 0.22 * s
    ctx.stroke(line)
    // Bubbles carried down under the skin, and spray thrown up over it.
    const bubbles = new Path2D()
    const spray = new Path2D()
    for (let i = 0; i < 70; i++) {
      const x = hash(i, 1, 31) * W
      const y0 = waterAt(u, H, s, x)
      const d = (hash(i, 2, 31) * 1.6 + 0.1) * s
      const r = (0.025 + hash(i, 3, 31) * 0.06) * s
      const by = y0 + d + Math.sin(t * 9 + i) * 0.03 * s
      bubbles.moveTo(x + r, by)
      bubbles.arc(x, by, r, 0, Math.PI * 2)
      if (i < 40) {
        const sy = y0 - (hash(i, 4, 31) * 0.9) * s * Math.sin(Math.PI * u)
        spray.moveTo(x + r * 0.7, sy)
        spray.arc(x, sy, r * 0.7, 0, Math.PI * 2)
      }
    }
    ctx.strokeStyle = 'rgba(220, 238, 242, 0.7)'
    ctx.lineWidth = Math.max(1, 0.012 * s)
    ctx.stroke(bubbles)
    ctx.fillStyle = 'rgba(240, 246, 246, 0.8)'
    ctx.fill(spray)
    ctx.restore()
  },
}

/** Sean's notes on the wrapper, unfolding: a fold of paper sweeps across, and Iceland is on the other side of it. */
const foldAt = (u: number, W: number, H: number, s: number) => {
  // The fold's line: from off the right, across to off the left, leaning.
  const x = W + 2 * s - (W + 4 * s + H * 0.4) * smooth(u)
  return { x0: x + H * 0.4, x1: x }
}
const paper: Shape = {
  region(u, W, H, _him, s) {
    const { x0, x1 } = foldAt(u, W, H, s)
    const path = new Path2D()
    path.moveTo(x0, -10)
    path.lineTo(W + 10, -10)
    path.lineTo(W + 10, H + 10)
    path.lineTo(x1, H + 10)
    path.closePath()
    return path
  },
  deco(ctx, u, W, H, _him, s) {
    if (u <= 0 || u >= 1) return
    const { x0, x1 } = foldAt(u, W, H, s)
    // The paper's back, folding over: a band behind the edge, lit along the crease, with the notes' scribble on it.
    const band = 0.55 * s * Math.sin(Math.PI * u)
    const path = new Path2D()
    path.moveTo(x0, -10)
    path.lineTo(x1, H + 10)
    path.lineTo(x1 - band, H + 10)
    path.lineTo(x0 - band, -10)
    path.closePath()
    ctx.save()
    ctx.fillStyle = '#EFE6D2'
    ctx.fill(path)
    ctx.clip(path)
    ctx.strokeStyle = 'rgba(70, 64, 58, 0.45)'
    ctx.lineWidth = Math.max(1, 0.02 * s)
    ctx.beginPath()
    for (let i = 0; i < 9; i++) {
      const y = (i + 0.5) * (H / 9)
      const xx = x0 + (x1 - x0) * (y / H) - band * 0.85
      ctx.moveTo(xx, y)
      for (let j = 1; j <= 6; j++) ctx.lineTo(xx + (j / 6) * band * 0.7, y + Math.sin(j * 2.1 + i) * 0.04 * s)
    }
    ctx.stroke()
    ctx.restore()
    ctx.save()
    ctx.strokeStyle = 'rgba(60, 50, 40, 0.35)'
    ctx.lineWidth = Math.max(1, 0.03 * s)
    ctx.beginPath()
    ctx.moveTo(x0, -10)
    ctx.lineTo(x1, H + 10)
    ctx.stroke()
    // The shadow the fold throws on the road.
    const g = ctx.createLinearGradient(x1, 0, x1 + 0.6 * s, 0)
    g.addColorStop(0, 'rgba(30, 30, 30, 0.25)')
    g.addColorStop(1, 'rgba(30, 30, 30, 0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(x0, -10)
    ctx.lineTo(x1, H + 10)
    ctx.lineTo(x1 + 0.6 * s, H + 10)
    ctx.lineTo(x0 + 0.6 * s, -10)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  },
}

/** The last negative, held up to the light: its frame opens on the snow, sprockets and all, and a gust comes through. */
const negativeRect = (u: number, W: number, H: number, him: Pt, s: number) => {
  const r = reach(W, H, him)
  const e = burst(u)
  return { cx: him[0] + 0.3 * s * (1 - e), cy: him[1] - 0.3 * s * (1 - e), hw: 0.62 * s + (r * 1.25 - 0.62 * s) * e, hh: 0.42 * s + (r * 1.25 - 0.42 * s) * e }
}
const negative: Shape = {
  region(u, W, H, him, s) {
    const { cx, cy, hw, hh } = negativeRect(u, W, H, him, s)
    return rounded(cx, cy, hw, hh, 0.03 * s)
  },
  deco(ctx, u, W, H, him, s, t) {
    if (u <= 0 || u >= 1) return
    const { cx, cy, hw, hh } = negativeRect(u, W, H, him, s)
    const a = Math.sin(Math.PI * u)
    // The film's edge round the opening: a dark band with its sprocket holes, above and below.
    const band = Math.max(0.16 * s, hh * 0.2)
    ctx.save()
    ctx.globalAlpha = Math.min(1, a * 1.4)
    ctx.fillStyle = '#20262B'
    for (const sgn of [-1, 1]) {
      const y = cy + sgn * (hh + band / 2)
      ctx.fillRect(cx - hw - band, y - band / 2, 2 * (hw + band), band)
      ctx.fillStyle = 'rgba(232, 238, 240, 0.85)'
      const step = band * 1.1
      const off = ((t * 2.5 * s) % step + step) % step
      for (let x = cx - hw - band + off; x < cx + hw + band; x += step) ctx.fillRect(x, y - band * 0.22, band * 0.42, band * 0.44)
      ctx.fillStyle = '#20262B'
    }
    ctx.fillRect(cx - hw - band, cy - hh - band, band, 2 * (hh + band))
    ctx.fillRect(cx + hw, cy - hh - band, band, 2 * (hh + band))
    ctx.restore()
    edgeGlow(ctx, rounded(cx, cy, hw, hh, 0.03 * s), '#F4F7FA', 0.06 * s, a * 0.8)
    // The gust: snow driven across the opening.
    ctx.save()
    ctx.fillStyle = `rgba(250, 252, 255, ${0.85 * a})`
    ctx.beginPath()
    for (let i = 0; i < 120; i++) {
      const x = ((hash(i, 1, 77) * W * 1.4 + u * W * 1.6 + t * 0) % (W * 1.4)) - W * 0.2
      const y = hash(i, 2, 77) * H + Math.sin(i + u * 6) * 0.2 * s
      const r = (0.02 + hash(i, 3, 77) * 0.05) * s
      ctx.moveTo(x + r, y)
      ctx.arc(x, y, r, 0, Math.PI * 2)
    }
    ctx.fill()
    ctx.restore()
  },
}

/** Sean's shutter: the blades close on the mountain and open on Ted's table, a photograph taken on the peak. */
const apertureAt = (u: number, W: number, H: number, him: Pt, s: number) => {
  const r = reach(W, H, him) * 1.05
  // Closed at the cut (u = 0.5), never shut on him: a ring a cell and a half across.
  const shut = 1 - Math.abs(u - 0.5) * 2
  const e = Math.pow(clamp(shut), 1.6)
  return r - (r - 0.95 * s) * e
}
const shutter: Shape = {
  deco(ctx, u, W, H, him, s) {
    if (u <= 0 || u >= 1) return
    const r = apertureAt(u, W, H, him, s)
    const R2 = reach(W, H, him) * 1.6
    const blades = 7
    const turn = (1 - Math.abs(u - 0.5) * 2) * 0.9
    ctx.save()
    // The blades: each a wide plate whose inner edge is one side of the opening.
    for (let i = 0; i < blades; i++) {
      const a0 = (i / blades) * Math.PI * 2 + turn
      const a1 = ((i + 1) / blades) * Math.PI * 2 + turn
      const p0: Pt = [him[0] + Math.cos(a0) * r, him[1] + Math.sin(a0) * r]
      const p1: Pt = [him[0] + Math.cos(a1) * r, him[1] + Math.sin(a1) * r]
      const ext = (q: Pt, a: number): Pt => [q[0] + Math.cos(a + 1.2) * R2, q[1] + Math.sin(a + 1.2) * R2]
      ctx.beginPath()
      ctx.moveTo(p0[0], p0[1])
      ctx.lineTo(p1[0], p1[1])
      const e1 = ext(p1, a1)
      const e0 = ext(p0, a0)
      ctx.lineTo(e1[0], e1[1])
      ctx.lineTo(e0[0], e0[1])
      ctx.closePath()
      const g = ctx.createLinearGradient(p0[0], p0[1], e0[0], e0[1])
      g.addColorStop(0, i % 2 ? '#3A3D42' : '#33363B')
      g.addColorStop(0.05, '#24262A')
      g.addColorStop(0.4, '#1A1C1F')
      g.addColorStop(1, '#111214')
      ctx.fillStyle = g
      ctx.fill()
      ctx.strokeStyle = 'rgba(150, 156, 162, 0.55)'
      ctx.lineWidth = Math.max(1, 0.018 * s)
      ctx.beginPath()
      ctx.moveTo(p0[0], p0[1])
      ctx.lineTo(p1[0], p1[1])
      ctx.stroke()
    }
    // The blades' shadow falling inward on the picture, so the opening has depth.
    const sh = ctx.createRadialGradient(him[0], him[1], r * 0.7, him[0], him[1], r * 1.02)
    sh.addColorStop(0, 'rgba(10, 11, 13, 0)')
    sh.addColorStop(1, `rgba(10, 11, 13, ${0.55 * Math.min(1, (1 - Math.abs(u - 0.5) * 2) * 2)})`)
    ctx.fillStyle = sh
    ctx.beginPath()
    ctx.arc(him[0], him[1], r * 1.02, 0, Math.PI * 2)
    ctx.fill()
    // The glint on the glass as it closes.
    const shut = 1 - Math.abs(u - 0.5) * 2
    if (shut > 0.6) {
      ctx.globalCompositeOperation = 'lighter'
      const g = ctx.createRadialGradient(him[0], him[1], r * 0.6, him[0], him[1], r * 1.4)
      g.addColorStop(0, 'rgba(255, 255, 255, 0)')
      g.addColorStop(0.5, `rgba(240, 236, 226, ${0.16 * (shut - 0.6) / 0.4})`)
      g.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = g
      ctx.fillRect(him[0] - r * 1.5, him[1] - r * 1.5, r * 3, r * 3)
    }
    ctx.restore()
  },
}

/**
 * The loading door's strip curtain: he goes through it on the cut, and the morning is on the other side. The curtain's
 * plane sweeps across the frame from the right, passing him on the cut; ahead of it is the street, behind it the hall.
 * Its strips hang in front, clear plastic catching the light, pushed aside where he goes through.
 */
const CUT_U = 0.3 / 1.15
const curtainX = (u: number, W: number, him: Pt) => him[0] + (CUT_U - u) * W * 1.7
const strips: Shape = {
  region(u, W, H, him) {
    const x = curtainX(u, W, him)
    const path = new Path2D()
    path.rect(x, -10, W + 10 - x + Math.max(0, -x), H + 20)
    return path
  },
  deco(ctx, u, W, H, him, s, t) {
    if (u <= 0 || u >= 1) return
    const x = curtainX(u, W, him)
    const fade = 1 - smooth((u - 0.75) / 0.25)
    ctx.save()
    // The morning pouring in at the curtain's edge.
    ctx.globalCompositeOperation = 'lighter'
    const g = ctx.createLinearGradient(x - 0.4 * s, 0, x + 2.2 * s, 0)
    g.addColorStop(0, 'rgba(255, 238, 205, 0)')
    g.addColorStop(0.2, `rgba(255, 238, 205, ${0.7 * fade})`)
    g.addColorStop(1, 'rgba(255, 238, 205, 0)')
    ctx.fillStyle = g
    ctx.fillRect(x - 0.4 * s, 0, 2.6 * s, H)
    ctx.globalCompositeOperation = 'source-over'
    // The strips: a curtain a cell and a half deep about the plane, each swinging, parted round him.
    const w = 0.42 * s
    for (let i = -5; i <= 5; i++) {
      const cx = x + i * w * 0.86
      const near = Math.max(0, 1 - Math.abs(cx - him[0]) / (1.1 * s))
      const push = (cx < him[0] ? -1 : 1) * near * 0.5 * s * Math.sin(Math.PI * clamp((u - CUT_U + 0.2) / 0.5))
      const swing = 0.08 * s * Math.sin(t * 5 + i * 1.7)
      const foot = cx + push + swing
      const a = 0.32 * fade * (1 - Math.abs(i) / 6)
      if (a <= 0.01) continue
      ctx.fillStyle = `rgba(214, 226, 230, ${a})`
      ctx.beginPath()
      ctx.moveTo(cx - w / 2, -10)
      ctx.lineTo(cx + w / 2, -10)
      ctx.quadraticCurveTo(cx + w / 2 + push * 0.3, H * 0.6, foot + w / 2, H + 10)
      ctx.lineTo(foot - w / 2, H + 10)
      ctx.quadraticCurveTo(cx - w / 2 + push * 0.3, H * 0.6, cx - w / 2, -10)
      ctx.fill()
      ctx.strokeStyle = `rgba(255, 255, 255, ${a * 1.6})`
      ctx.lineWidth = Math.max(1, 0.015 * s)
      ctx.beginPath()
      ctx.moveTo(cx + w / 2, -10)
      ctx.quadraticCurveTo(cx + w / 2 + push * 0.3, H * 0.6, foot + w / 2, H + 10)
      ctx.stroke()
    }
    ctx.restore()
  },
}

/* ------------------------------------------------------------------ the passages, in order */

export const PASSAGES: Passage[] = [
  { at: SEAM.dream, before: 0.32, after: 0.7, ...frameOut, ease: burst },
  { at: SEAM.office, before: 0.3, after: 0.75, ...frameIn, ease: smooth },
  { at: SEAM.nuuk, before: 0.35, after: 0.85, ...projector, ease: (x) => easeIn(x) * 0.25 + smooth(x) * 0.75 },
  { at: SEAM.sky, before: 0.3, after: 0.6, ...door, ease: smooth },
  { at: SEAM.sea, before: 0.4, after: 0.5, ...waterline, ease: (x) => x },
  { at: SEAM.iceland, before: 0.35, after: 0.95, ...paper, ease: (x) => x },
  { at: SEAM.himalaya, before: 0.3, after: 1.0, ...negative, ease: (x) => x },
  { at: SEAM.press, before: 0.42, after: 0.55, ...shutter, ease: (x) => x },
  { at: SEAM.street, before: 0.3, after: 0.85, ...strips, ease: (x) => x },
]

/** The passage running at `t`, and how far through it is. */
export function passageAt(t: number): { passage: Passage; u: number } | null {
  for (const passage of PASSAGES) {
    const a = passage.at - passage.before
    const b = passage.at + passage.after
    if (t > a && t < b) {
      // `u` crosses the cut where the shape says it is: the share of the window before it.
      const x = (t - a) / (b - a)
      return { passage, u: clamp((passage.ease ?? smooth)(x)) }
    }
  }
  return null
}

/* ------------------------------------------------------------------ the drawing */

/** A second canvas the size of the frame, one per p5 sketch, made again when the frame changes size. */
const spares = new WeakMap<p5, p5.Graphics>()
function spareFor(p: p5): p5.Graphics {
  const d = p.pixelDensity()
  let g = spares.get(p)
  if (!g || g.width !== p.width || g.height !== p.height || g.pixelDensity() !== d) {
    g?.remove()
    g = p.createGraphics(p.width, p.height)
    g.pixelDensity(d)
    // The modes every piece is drawn in (the stage's `drawingModes`).
    g.rectMode(g.CENTER)
    g.angleMode(g.RADIANS)
    g.strokeCap(g.ROUND)
    g.strokeJoin(g.ROUND)
    spares.set(p, g)
  }
  return g
}

/**
 * The other place at `t`, without Walter, as the stage would draw it (`engine.ts`, drawWorld) with the camera at `x,
 * y`: its paper, then every piece in view in two passes. Every place of this show has a plain backdrop and no cut
 * drawn, so that is all of it.
 */
function paintPlace(g: p5, u: Universe, t: number, x: number, y: number, k: number): void {
  const W = g.width
  const H = g.height
  const { theme } = u
  const weight = Math.max(0.75, k * 0.037) * (theme.weight ?? 1)
  g.push()
  g.noStroke()
  g.fill(theme.bg)
  g.rect(W / 2, H / 2, W, H)
  const x0 = x - W / 2 / k - 1.5
  const x1 = x + W / 2 / k + 1.5
  const y0 = y - H / 2 / k - 1.5
  const y1 = y + H / 2 / k + 1.5
  const visible = u.pieces.filter((pl) => pl.cells.some(([c, r]) => c >= x0 && c <= x1 && r >= y0 && r <= y1))
  const ctxFor = (pl: Placed): PieceCtx => ({
    k,
    t: t - pl.start,
    since: t - pl.start - pl.lane.fire,
    ink: theme.ink,
    bg: theme.bg,
    weight,
    color: pl.ballIn.color,
    theme,
    spin: (sx) => {
      const turned = (pl.col + pl.mirror * sx - u.pieces[0].col) / R
      return pl.mirror > 0 ? turned : Math.PI - turned
    },
  })
  for (const which of ['draw', 'over'] as const) {
    for (const pl of visible) {
      const fn = pl.piece[which]
      if (!fn) continue
      g.push()
      g.translate(W / 2 + (pl.col - x) * k, H / 2 + (pl.row - y) * k)
      g.scale(pl.mirror, 1)
      fn.call(pl.piece, g, pl.state, ctxFor(pl))
      g.pop()
    }
  }
  g.pop()
}

let drawingOther = false

/**
 * The piece that lays the other place over this one through the passage's shape. It stands in every place, last of
 * what is drawn over it, and is handed the show once it is made (`bind`).
 */
export function passages(): { piece: Piece<null>; bind(show: QuintessenceShow): void } {
  let show: QuintessenceShow | null = null
  const piece = scenery<null>({
    name: 'passage',
    draw: () => {},
    over: (p, _s, c) => {
      if (!show || drawingOther) return
      const t = c.t
      const on = passageAt(t)
      if (!on) return
      const { passage, u } = on
      const main = show.owner(t)
      const before = t < passage.at
      const other = before ? main + 1 : main - 1
      if (other < 0 || other >= show.legs.length) return
      const ctx = p.drawingContext as C2
      const k = c.k
      const d = p.pixelDensity()
      const W = p.width * d
      const H = p.height * d
      const here = show.at(t)
      const m = ctx.getTransform()
      const him: Pt = [m.a * here.x * k + m.c * here.y * k + m.e, m.b * here.x * k + m.d * here.y * k + m.f]
      const s = Math.hypot(m.a, m.b) * k

      let clip: Path2D | null = null
      let rule: CanvasFillRule = 'nonzero'
      if (passage.region) {
        const region = passage.region(u, W, H, him, s)
        if (before) {
          clip = region
          if (passage.evenodd) rule = 'evenodd'
        } else {
          // What is not yet the new place: the frame less the region (a ring less a hole is the hole, even-odd).
          clip = new Path2D()
          clip.rect(-20, -20, W + 40, H + 40)
          clip.addPath(region)
          rule = 'evenodd'
        }
        // The other place, by this camera carried across the cut.
        const f = frame(p, k)
        const [dx, dy] = show.shift(main, other)
        const world = show.legs[other].world
        const universe = show.universeOf(world)
        if (universe) {
          const g = spareFor(p)
          drawingOther = true
          try {
            paintPlace(g as unknown as p5, universe, t, f.cx + dx, f.cy + dy, k)
          } finally {
            drawingOther = false
          }
          ctx.save()
          ctx.setTransform(1, 0, 0, 1, 0, 0)
          ctx.clip(clip, rule)
          ctx.drawImage(g.elt as HTMLCanvasElement, 0, 0, W, H)
          ctx.restore()
        }
      }
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      passage.deco?.(ctx, u, W, H, him, s, t)
      ctx.restore()

      // Walter, again, wherever the other place or the seam was laid over him: as he is, his own colour.
      const over = clip ? ctx.isPointInPath(clip, him[0], him[1], rule) : false
      if ((over || passage.deco) && !here.hidden && here.scale > 0.02) {
        const u0 = here.universe
        const spin = (here.x - u0.pieces[0].col) / R
        const angle = Math.atan2(Math.sin(here.angle), here.placed.mirror * Math.cos(here.angle))
        const balls = here.balls ?? [{ id: here.ball.id, x: here.x, y: here.y, color: here.ball.color, ghost: here.ball.ghost, scale: here.scale, stretch: here.stretch, angle }]
        for (const b of balls) {
          if ((b.scale ?? 1) <= 0.02) continue
          ball(p, k, c.ink, c.weight, b.color, b.x * k, b.y * k, b.id === here.ball.id ? spin : (b.x - u0.pieces[0].col) / R, b.scale ?? 1, b.stretch ?? 1, b.angle ?? 0, b.ghost ?? false)
        }
      }
    },
  })
  return { piece, bind: (s) => { show = s } }
}
