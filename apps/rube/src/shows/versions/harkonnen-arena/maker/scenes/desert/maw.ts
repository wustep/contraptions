import { hash, mix, smooth, type Brush } from '../../paint'
import { SAND } from '../../world/land'
import { SKIN } from '../../world/worm'
import { MAW_R, W, XH, mawRise } from './plan'

/**
 * The mouth that comes up round the harvester: a great ring of plates rising out of the funnel, seen a little from above,
 * so its far inside is seen, ringed with teeth, going down into the dark; then the machine in it; then the near side of
 * the body, a wall of rings, down into the sand, with the sand pouring off its lip. On the last blow it goes back down.
 *
 * Drawn in two halves round the machine: `paintMawBack` (the far inside, the teeth, the throat) and `paintMawFront`
 * (the near wall and lip, and the sand falling from it).
 */

const RY = 0.36

const live = (t: number) => t > W.maw - 0.6 && mawRise(t) < 2.8

export function paintMawBack(b: Brush, t: number): void {
  if (!live(t)) return
  const { ctx } = b
  const y = mawRise(t)
  const rx = MAW_R
  const ry = rx * RY
  // The lip all round, then the inside: flesh near the lip, darker down the throat, and the teeth on the far half.
  ctx.beginPath()
  ctx.ellipse(XH, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.fillStyle = b.c(SKIN.plate)
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

export function paintMawFront(b: Brush, t: number): void {
  if (!live(t)) return
  const { ctx } = b
  const y = mawRise(t)
  const rx = MAW_R
  const ry = rx * RY
  // Down under the sand in front: the funnel's near rim hides its foot.
  const foot = 6
  // The near wall: from the lip's front arc down into the sand, ringed.
  ctx.beginPath()
  ctx.moveTo(XH - rx, y)
  ctx.ellipse(XH, y, rx, ry, 0, Math.PI, 0, true)
  ctx.lineTo(XH + rx, foot)
  ctx.lineTo(XH - rx, foot)
  ctx.closePath()
  ctx.fillStyle = b.c(SKIN.side)
  ctx.fill()
  // Its east side lit, its west in shade: two long bands down the wall.
  ctx.save()
  ctx.clip()
  const gr = ctx.createLinearGradient(XH - rx, 0, XH + rx, 0)
  gr.addColorStop(0, b.ca(SKIN.belly, 0.85))
  gr.addColorStop(0.35, b.ca(SKIN.side, 0))
  gr.addColorStop(0.75, b.ca(SKIN.back, 0))
  gr.addColorStop(1, b.ca(SKIN.back, 0.9))
  ctx.fillStyle = gr
  ctx.fillRect(XH - rx - 1, y - ry - 1, 2 * rx + 2, foot - y + ry + 2)
  // The rings: arcs parallel to the lip, every two cells down the wall, each a seam over a paler plate.
  for (let k = 1; k < 9; k++) {
    const yy = y + k * 3.4
    if (yy > foot + ry) break
    ctx.beginPath()
    ctx.ellipse(XH, yy, rx, ry, 0, Math.PI, 0, true)
    ctx.strokeStyle = b.ca(SKIN.seam, 0.45)
    ctx.lineWidth = Math.max(1.25 * b.px, 0.1)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(XH, yy + 0.35, rx, ry, 0, Math.PI * 1.05, Math.PI * 1.95, true)
    ctx.strokeStyle = b.ca(SKIN.plate, 0.22)
    ctx.lineWidth = Math.max(1.25 * b.px, 0.6)
    ctx.stroke()
  }
  ctx.restore()
  // The lip's near edge: a thick band of plates.
  ctx.beginPath()
  ctx.ellipse(XH, y, rx, ry, 0, Math.PI, 0, true)
  ctx.ellipse(XH, y + 0.25, rx * 0.985, ry * 0.95, 0, 0, Math.PI, false)
  ctx.closePath()
  ctx.fillStyle = b.c(mix(SKIN.plate, SKIN.back, 0.3))
  ctx.fill()
}

/** The dust it leaves when it goes down: a few great slow clouds going up and west, thinning. */
export function paintDust(b: Brush, t: number): void {
  const s = t - W.gone - 1.2
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
