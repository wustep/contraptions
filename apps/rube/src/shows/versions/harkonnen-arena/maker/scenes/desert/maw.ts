import { hash, mix, noise1, smooth, type Brush, type Pt } from '../../paint'
import { SAND } from '../../world/land'
import { SKIN } from '../../world/worm'
import { flatFill } from './ground'
import { MAW_R, W, XH, mawRise, mawTip } from './plan'

/**
 * The mouth that comes up round the harvester: a great ring of plates standing up out of the funnel, four times the
 * machine's height, seen a little from above, so its far inside is seen, ringed with teeth, going down into the dark;
 * then the machine in it; then the near side of the body, a wall of rings, down into the sand, with the sand it brought
 * up pouring off its lip. On the last blow it goes straight back down.
 *
 * Drawn in two halves round the machine: `paintMawBack` (the far inside, the teeth, the throat) and `paintMawFront`
 * (the near wall and lip, and the sand falling from it).
 */

const live = (t: number) => t > W.maw - 0.45 && t < W.gone + 3.6

/** The plates of its lip, still under the sand it came up through as it breaks the surface, bared as the sand runs off. */
const lipColor = (t: number) => mix(SAND.lit, SKIN.plate, smooth(t, W.maw + 0.5, W.maw + 4.5))

export function paintMawBack(b: Brush, t: number): void {
  if (!live(t)) return
  const { ctx } = b
  const y = mawRise(t)
  const rx = MAW_R
  const ry = rx * mawTip(t)
  // The lip all round, then the inside: flesh near the lip, darker down the throat, and the teeth on the far half.
  ctx.beginPath()
  ctx.ellipse(XH, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.fillStyle = b.c(lipColor(t))
  ctx.fill()
  const inner = 0.9
  ctx.beginPath()
  ctx.ellipse(XH, y + ry * 0.04, rx * inner, ry * inner, 0, 0, Math.PI * 2)
  ctx.fillStyle = b.c(SKIN.flesh)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(XH, y + ry * 0.25, rx * 0.74, ry * 0.68, 0, 0, Math.PI * 2)
  ctx.fillStyle = b.c(mix(SKIN.flesh, SKIN.throat, 0.55))
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(XH, y + ry * 0.42, rx * 0.52, ry * 0.45, 0, 0, Math.PI * 2)
  ctx.fillStyle = b.c(SKIN.throat)
  ctx.fill()
  // The teeth: on the far inside, from just under the lip down toward the throat, a long comb.
  const n = 44
  ctx.beginPath()
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (Math.PI * i) / n
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    const r0 = inner * (0.98 - 0.03 * hash(i, 21))
    const r1 = 0.72 + 0.06 * hash(i, 22)
    ctx.moveTo(XH + ca * rx * r0, y + sa * ry * r0 + ry * 0.05)
    ctx.lineTo(XH + ca * rx * r1, y + sa * ry * r1 + ry * 0.34)
  }
  ctx.strokeStyle = b.c('#E4D6C1')
  ctx.lineWidth = Math.max(1.25 * b.px, 0.07)
  ctx.stroke()
}

/** Where the body goes down into the sand: under the flat, and east of the lip, the way it came in. */
const FOOT = 6
/** The body's axis from the lip down to its foot: upright under the lip, bending away east lower down. */
function axis(y: number, s: number): Pt {
  const bend = 0.22 * (FOOT - y)
  const u = 1 - s
  const cy = y + (FOOT - y) * 0.55
  return [XH + bend * s * s, u * u * y + 2 * u * s * cy + s * s * FOOT]
}

export function paintMawFront(b: Brush, t: number): void {
  if (!live(t)) return
  const { ctx } = b
  const y = mawRise(t)
  const rx = MAW_R
  const ry = rx * mawTip(t)
  if (y + ry > FOOT) return
  // The near wall: from the lip's front arc down along the body into the sand.
  const n = 16
  const side: Pt[] = []
  for (let i = 0; i <= n; i++) side.push(axis(y, i / n))
  ctx.beginPath()
  ctx.moveTo(XH - rx, y)
  ctx.ellipse(XH, y, rx, ry, 0, Math.PI, 0, true)
  for (const [x, yy] of side) ctx.lineTo(x + rx, yy)
  for (let i = n; i >= 0; i--) ctx.lineTo(side[i][0] - rx, side[i][1])
  ctx.closePath()
  ctx.fillStyle = b.c(SKIN.side)
  ctx.fill()
  // Its east side lit, its west in shade: two long bands down the wall.
  ctx.save()
  ctx.clip()
  const x1 = side[n][0] + rx
  const gr = ctx.createLinearGradient(XH - rx, 0, x1, 0)
  gr.addColorStop(0, b.ca(SKIN.belly, 0.85))
  gr.addColorStop(0.35, b.ca(SKIN.side, 0))
  gr.addColorStop(0.75, b.ca(SKIN.back, 0))
  gr.addColorStop(1, b.ca(SKIN.back, 0.9))
  ctx.fillStyle = gr
  ctx.fillRect(XH - rx - 1, y - ry - 1, x1 - XH + rx + 2, FOOT - y + ry + 2)
  // The rings: a seam round the body every four and a half cells down from the lip, rising with it.
  const len = FOOT - y
  for (let k = 1; k * 4.5 < len; k++) {
    const [cx, cy] = axis(y, (k * 4.5) / len)
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0, true)
    ctx.strokeStyle = b.ca(SKIN.seam, 0.4)
    ctx.lineWidth = Math.max(1.25 * b.px, 0.1)
    ctx.stroke()
  }
  ctx.restore()
  // The lip's near edge: a thick band of plates.
  ctx.beginPath()
  ctx.ellipse(XH, y, rx, ry, 0, Math.PI, 0, true)
  ctx.ellipse(XH, y + 0.25, rx * 0.985, ry * 0.95, 0, 0, Math.PI, false)
  ctx.closePath()
  ctx.fillStyle = b.c(mix(lipColor(t), SKIN.back, 0.3))
  ctx.fill()
  paintPour(b, t, y, rx, ry)
  paintHeap(b, t, y, ry)
}

/**
 * The sand it brought up, pouring off the lip as it rises: three uneven curtains falling from its near edge into the heap
 * at its foot, necking as they fall. Each stops in turn once it stands, and the last of it falls away down the wall.
 */
const POUR: [number, number, number][] = [
  // Where on the lip (-1 west to 1 east), how wide, when it stops.
  [-0.58, 3.4, W.maw + 3.4],
  [0.04, 2.2, W.maw + 4.6],
  [0.5, 2.9, W.maw + 4.0],
]
function paintPour(b: Brush, t: number, y: number, rx: number, ry: number): void {
  const on = smooth(t, W.maw - 0.2, W.maw + 0.8)
  if (on <= 0.01) return
  const { ctx } = b
  for (let i = 0; i < POUR.length; i++) {
    const [u, w0, stop] = POUR[i]
    const arc = y + ry * Math.sqrt(1 - u * u)
    if (arc > -1) continue
    // After it stops, the tail falls: its top drops away down the wall.
    const s0 = Math.max(0, t - stop)
    const top = arc + 11 * s0 * s0
    if (top > -0.6) continue
    const x = XH + u * rx
    const w = w0 * on * (1 - 0.35 * smooth(t, stop - 1.5, stop))
    const m = 12
    const edge = (sgn: number): Pt[] => {
      const pts: Pt[] = []
      for (let j = 0; j <= m; j++) {
        const s = j / m
        const yy = top + (0.4 - top) * s
        // Narrowing as it falls, spreading where it lands; its edges rippling downward; a falling tail drawn to a point.
        const tail = s0 > 0 ? 0.15 + 0.85 * smooth(s, 0, 0.45) : 0.55 + 0.45 * smooth(s, 0, 0.12)
        const hw = (w / 2) * tail * (1 - 0.45 * s + 0.9 * s * s * s) * (1 + 0.3 * noise1((yy - 9 * t) * 0.22, i * 5 + sgn))
        pts.push([x + sgn * hw, yy])
      }
      return pts
    }
    const l = edge(-1)
    const r = edge(1)
    ctx.beginPath()
    ctx.moveTo(l[0][0], l[0][1] - 0.2)
    for (const p of l) ctx.lineTo(p[0], p[1])
    for (let j = m; j >= 0; j--) ctx.lineTo(r[j][0], r[j][1])
    ctx.lineTo(r[0][0], r[0][1] - 0.2)
    ctx.closePath()
    // Dense where it spills off the lip, thinning to a veil as it falls and spreads, so it reads as sand pouring over
    // the wall and not as pale stripes painted down it.
    // It comes over the lip thin and gathers as it falls, so its top is not a square cut under the plates; down it,
    // denser and thinner runs travel with the fall, so it is sand falling in clumps and not an even painted stripe.
    const gr = ctx.createLinearGradient(0, top, 0, 0.4)
    const K = 9
    for (let k = 0; k <= K; k++) {
      const s = k / K
      const yy = top + (0.4 - top) * s
      const base = s < 0.1 ? 0.25 + 6 * s : 0.85 - 0.55 * smooth(s, 0.1, 1)
      const clump = s < 0.1 ? 1 : 0.65 + 0.35 * noise1((yy - 9 * t) * 0.35, i * 11 + 3)
      gr.addColorStop(s, b.ca(s < 0.9 ? SAND.lit : SAND.air, base * clump))
    }
    ctx.fillStyle = gr
    ctx.fill()
  }
}

/**
 * The heap where the body breaks the flat: sand shoved up round it as it stands, its near side over the body's foot so
 * it comes up out of the sand, not off it; its west slope in shade. It slumps after the body has gone back down.
 */
function paintHeap(b: Brush, t: number, y: number, ry: number): void {
  const h = 2.8 * smooth(t, W.maw - 0.3, W.maw + 2.5) * (1 - smooth(t, W.gone + 1, W.gone + 4.5))
  if (h <= 0.02) return
  const { ctx } = b
  // Where the body crosses the flat.
  let xm = XH
  for (let i = 0; i <= 24; i++) {
    const p = axis(y, i / 24)
    if (p[1] >= 0) {
      xm = p[0]
      break
    }
  }
  const half = MAW_R + 9
  const m = 24
  const hump = () => {
    ctx.moveTo(xm - half, 0.05)
    for (let i = 0; i <= m; i++) {
      const u = -1 + (2 * i) / m
      const k = Math.max(0, 1 - u * u)
      ctx.lineTo(xm + u * half, -h * Math.pow(k, 1.4) * (1 + 0.12 * Math.sin(u * 5.3 + 1)))
    }
    ctx.lineTo(xm + half, 0.05)
  }
  // The flat in front of it, down past the body's foot: closing over the funnel's near side as the near lip comes up out
  // of it, so the body's foot is never seen. Then the heap.
  ctx.fillStyle = flatFill(b)
  const cover = smooth(-(y + ry), -3, 1)
  if (cover > 0.002) {
    ctx.globalAlpha = cover
    ctx.fillRect(xm - half, 0, 2 * half, FOOT + 1)
    ctx.globalAlpha = 1
  }
  ctx.beginPath()
  hump()
  ctx.closePath()
  ctx.fill()
  // Its west slope, above the flat, in shade.
  ctx.beginPath()
  hump()
  ctx.closePath()
  const gr = ctx.createLinearGradient(xm - half, 0, xm + half * 0.2, 0)
  gr.addColorStop(0, b.ca(SAND.shade, 0.4))
  gr.addColorStop(1, b.ca(SAND.shade, 0))
  ctx.fillStyle = gr
  ctx.fill()
}

/** The dust it leaves when it goes down: a few great slow clouds going up and west, thinning. */
export function paintDust(b: Brush, t: number): void {
  const s = t - W.gone - 2
  if (s <= 0 || s > 12) return
  const { ctx } = b
  for (let i = 0; i < 5; i++) {
    const k = s - i * 0.35
    if (k <= 0) continue
    const r = 3 + k * (1.3 + 0.4 * hash(i, 41))
    const x = XH + (hash(i, 42) - 0.5) * 16 - k * (1.1 + 0.4 * hash(i, 43))
    const y = -1 - k * (0.9 + 0.5 * hash(i, 44)) - r * 0.3
    ctx.beginPath()
    ctx.ellipse(x, y, r * 1.5, r, 0, 0, Math.PI * 2)
    ctx.fillStyle = b.ca(SAND.lit, 0.42 * smooth(k, 0, 0.8) * (1 - smooth(k, 3, 11)))
    ctx.fill()
  }
}
