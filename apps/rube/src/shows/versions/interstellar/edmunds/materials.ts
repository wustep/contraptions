import type p5 from 'p5'
import { mixHex } from '../../../../parts'

/** Take-local construction materials. Geometry, rather than a screen filter, carries the light. */
export const MAT = {
  bone: '#D8D0BE', umber: '#6B4936', charcoal: '#171C22', sage: '#68715A',
  timber: '#76523C', metal: '#A7A597', gold: '#D9AA68', shadow: '#292A28',
}

export function outline(p: p5, ink: string, weight: number): void {
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(weight * 0.58)
}

export function solid(p: p5, ink: string, weight: number, fill: string): void {
  p.fill(fill)
  // The cast is drawn by the stage. Preserve the few locally drawn young-Murph appearances too.
  const cast = fill === '#8FA8C4' || fill === '#F0C987' || fill === '#1F5E98' || fill === '#7C8C9C'
  p.stroke(cast ? ink : typeof fill === 'string' && /^#[0-9a-f]{6}$/i.test(fill) ? mixHex(fill, MAT.charcoal, 0.58) : ink)
  p.strokeWeight(weight * (cast ? 1 : 0.52))
}

/** A board or sheet with a lit cut edge, shadow thickness, and structural seams. Coordinates are cells. */
export function panel(p: p5, k: number, x: number, y: number, w: number, h: number, color: string, material: 'wood' | 'metal' | 'cloth' = 'wood'): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.translate(x * k, y * k)
  const W = w * k, H = h * k
  const g = ctx.createLinearGradient(0, 0, W * 0.8, H)
  g.addColorStop(0, mixHex(color, MAT.bone, 0.23))
  g.addColorStop(0.42, color)
  g.addColorStop(1, mixHex(color, MAT.charcoal, 0.28))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip()
  ctx.lineWidth = Math.max(0.45, k * 0.004)
  ctx.strokeStyle = mixHex(color, MAT.charcoal, 0.3)
  if (material === 'wood') {
    for (let j = 1; j < h / 0.047; j++) {
      const yy = j * 0.047 * k
      ctx.beginPath(); ctx.moveTo(0, yy)
      ctx.bezierCurveTo(W * 0.3, yy + k * 0.022, W * 0.6, yy - k * 0.014, W, yy)
      ctx.stroke()
    }
  } else if (material === 'cloth') {
    ctx.globalAlpha *= 0.3
    for (let xx = 0; xx < W; xx += k * 0.035) { ctx.beginPath(); ctx.moveTo(xx, 0); ctx.lineTo(xx, H); ctx.stroke() }
    for (let yy = 0; yy < H; yy += k * 0.04) { ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke() }
  } else {
    for (let xx = k * 0.45; xx < W; xx += k * 0.55) { ctx.beginPath(); ctx.moveTo(xx, 0); ctx.lineTo(xx, H); ctx.stroke() }
  }
  ctx.restore()
  p.noFill()
  p.stroke(mixHex(color, MAT.charcoal, 0.7)); p.strokeWeight(k * 0.012)
  p.line(x * k, (y + h) * k, (x + w) * k, (y + h) * k)
  p.stroke(mixHex(color, MAT.bone, 0.55)); p.strokeWeight(k * 0.008)
  p.line(x * k, y * k, (x + w) * k, y * k)
}
