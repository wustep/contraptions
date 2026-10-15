import { hash } from '../kit'
import { rgbaOf, sway, type View } from '../depth'
import { drawCity } from './city'
import { FLOOR, LAID, STAIR, TABLE, UP } from './press-plan'

/**
 * Ted's office (the PRESS builder's): the conference room on the mezzanine at the hall's left end. Floor-to-ceiling
 * windows behind the long table, Manhattan at dawn through them; the pier at the room's end with two of the magazine's
 * old covers framed on it; the pendant over the table. Under the mezzanine, the paper store: reels on their sides.
 * Ted is drawn with the table (`press-draw.ts`), dark against the window.
 */

type C2 = CanvasRenderingContext2D

export const OFFICE = { top: -3.6, x1: 2.15 }
/** The windows, each its left and right edge; from the ceiling's cornice to just over the floor. */
export const PANES: [number, number][] = [
  [-7.4, -5.6],
  [-5.2, -3.4],
  [-3.0, -1.2],
  [-0.8, 0.55],
]
const WIN = { y0: OFFICE.top + 0.32, y1: UP - 0.12, transom: OFFICE.top + 1.15 }

export const OP = {
  wall: '#201C1A',
  panel: '#2B2522',
  ceiling: '#171413',
  mullion: '#0E0D0D',
  frame: '#1E1C1B',
  lamp: '#F4BE72',
  slab: '#1F272B',
  under: '#0F1316',
  reel: '#B7AF9C',
  reelEdge: '#8F8878',
}

export function drawOffice(ctx: C2, v: View, t: number, cover: (g: C2, k: number, x: number, y: number, w: number, h: number) => void): void {
  const k = v.k
  const x0 = v.x0 - 1
  const x1 = OFFICE.x1
  if (x0 > x1) return
  // The city, inside the panes only.
  const panes = new Path2D()
  for (const [a, b] of PANES) if (b > v.x0 && a < v.x1) panes.rect(a * k, WIN.y0 * k, (b - a) * k, (WIN.y1 - WIN.y0) * k)
  ctx.save()
  ctx.clip(panes)
  drawCity(ctx, v, t)
  ctx.restore()

  ctx.save()
  ctx.scale(k, k)
  // The wall round the panes, and its panelling.
  const wall = new Path2D()
  wall.rect(x0, OFFICE.top, x1 - x0, UP - OFFICE.top)
  for (const [a, b] of PANES) if (b > x0) wall.rect(a, WIN.y0, b - a, WIN.y1 - WIN.y0)
  ctx.fillStyle = OP.wall
  ctx.fill(wall, 'evenodd')
  // Walnut boards between the panes, a dado rail, a skirting; the cornice.
  const panel = new Path2D()
  for (let x = Math.ceil(x0 / 0.13) * 0.13; x < x1; x += 0.13) {
    if (PANES.some(([a, b]) => x > a - 0.05 && x < b + 0.05)) continue
    panel.rect(x, WIN.y0, 0.01, WIN.y1 - WIN.y0)
  }
  panel.rect(x0, WIN.y0 - 0.06, x1 - x0, 0.02)
  panel.rect(x0, OFFICE.top, x1 - x0, 0.14)
  panel.rect(x0, UP - 1.0, x1 - x0, 0.035)
  panel.rect(x0, UP - 0.16, x1 - x0, 0.16)
  ctx.fillStyle = OP.panel
  ctx.fill(panel)
  ctx.fillStyle = OP.ceiling
  ctx.fillRect(x0, OFFICE.top, x1 - x0, 0.1)
  // The panes' frames: mullions, the transom, the sill; the dawn on the frames' edges; a long reflection in the glass.
  const bars = new Path2D()
  const glint = new Path2D()
  for (const [a, b] of PANES) {
    if (b < x0) continue
    bars.rect(a - 0.05, WIN.y0, 0.07, WIN.y1 - WIN.y0)
    bars.rect(b - 0.02, WIN.y0, 0.07, WIN.y1 - WIN.y0)
    bars.rect((a + b) / 2 - 0.02, WIN.y0, 0.04, WIN.y1 - WIN.y0)
    bars.rect(a, WIN.transom - 0.025, b - a, 0.05)
    bars.rect(a - 0.05, WIN.y1 - 0.02, b - a + 0.12, 0.09)
    glint.rect(a + 0.02, WIN.y0, 0.025, WIN.y1 - WIN.y0)
  }
  ctx.fillStyle = OP.mullion
  ctx.fill(bars)
  ctx.fillStyle = rgbaOf('#E8C899', 0.45)
  ctx.fill(glint)
  // The glass: a faint sheen sliding across it as the camera goes, the room's lamp in it.
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const sheen = new Path2D()
  for (const [a, b] of PANES) {
    if (b < x0) continue
    const sx = a + (b - a) * (0.25 + 0.5 * (((v.cx * 0.35 - a) % 1.7) + 1.7) % 1.7 / 1.7)
    sheen.moveTo(sx, WIN.y0)
    sheen.lineTo(sx + 0.28, WIN.y0)
    sheen.lineTo(sx - 0.42, WIN.y1)
    sheen.lineTo(sx - 0.7, WIN.y1)
    sheen.closePath()
  }
  ctx.clip(new Path2D(PANES.map(([a, b]) => `M${a} ${WIN.y0}H${b}V${WIN.y1}H${a}Z`).join('')))
  ctx.fillStyle = 'rgba(200, 220, 228, 0.06)'
  ctx.fill(sheen)
  ctx.restore()

  // Two of the magazine's old covers, framed on the pier at the room's end.
  for (const fx of [0.82, 1.42]) {
    ctx.fillStyle = OP.frame
    ctx.fillRect(fx - 0.06, -2.26, 0.56, 0.78)
    ctx.save()
    ctx.globalAlpha = 0.5
    ctx.scale(1 / k, 1 / k)
    cover(ctx, k, fx, -2.2, 0.44, 0.66)
    ctx.restore()
    ctx.fillStyle = rgbaOf('#F4D9A8', 0.12)
    ctx.fillRect(fx - 0.06, -2.26, 0.56, 0.03)
  }

  // The pendant over the table: its cord, its shade, the bulb; it stirs as the negative lands.
  const stir = 0.035 * Math.exp(-Math.max(0, t - LAID) / 1.6) * Math.sin(Math.max(0, t - LAID) * 3.1) + 0.006 * sway(t, 0.21)
  const px = -1.1
  const py = -2.78
  ctx.save()
  ctx.translate(px, OFFICE.top)
  ctx.rotate(stir)
  ctx.fillStyle = OP.frame
  ctx.fillRect(-0.012, 0, 0.024, py - OFFICE.top)
  ctx.beginPath()
  ctx.moveTo(-0.36, py - OFFICE.top + 0.1)
  ctx.lineTo(0.36, py - OFFICE.top + 0.1)
  ctx.lineTo(0.12, py - OFFICE.top - 0.08)
  ctx.lineTo(-0.12, py - OFFICE.top - 0.08)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = rgbaOf('#F7D9A0', 0.9)
  ctx.beginPath()
  ctx.ellipse(0, py - OFFICE.top + 0.1, 0.3, 0.035, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // The mezzanine's slab, its edge, and the paper store under it.
  const sx1 = STAIR.x0
  ctx.fillStyle = OP.slab
  ctx.fillRect(x0, UP, sx1 - x0, 0.32)
  ctx.fillStyle = rgbaOf('#6E5848', 1)
  ctx.fillRect(x0, UP - 0.02, sx1 - x0, 0.04)
  ctx.fillStyle = '#2C383E'
  ctx.fillRect(x0, UP + 0.28, sx1 - x0, 0.04)
  ctx.fillStyle = OP.under
  ctx.fillRect(x0, UP + 0.32, sx1 - x0, FLOOR - UP - 0.32)
  // Reels on their sides, two high, and a caged lamp over them.
  const faces = new Path2D()
  const rings = new Path2D()
  const cores = new Path2D()
  const r = 0.5
  for (let i = Math.floor((x0 + 1) / 1.05); i * 1.05 < -0.45; i++) {
    const cx = i * 1.05 + 0.1 * hash(i, 1)
    const rows = hash(i, 2) < 0.7 ? 2 : 1
    for (let j = 0; j < rows; j++) {
      const cy = FLOOR - r - j * 2 * r * 0.98
      if (cy - r < UP + 0.36) continue
      faces.moveTo(cx + r, cy)
      faces.arc(cx, cy, r, 0, Math.PI * 2)
      for (const q of [0.45, 0.62, 0.8]) {
        rings.moveTo(cx + r * q, cy)
        rings.arc(cx, cy, r * q, 0, Math.PI * 2)
      }
      cores.moveTo(cx + 0.11, cy)
      cores.arc(cx, cy, 0.11, 0, Math.PI * 2)
    }
  }
  ctx.fillStyle = rgbaOf(OP.reel, 0.55)
  ctx.fill(faces)
  ctx.strokeStyle = rgbaOf(OP.reelEdge, 0.5)
  ctx.lineWidth = 0.012
  ctx.stroke(rings)
  ctx.fillStyle = '#252B2E'
  ctx.fill(cores)
  // A rack of bundles waiting for the vans, by the stair's foot; a caged lamp over it, and the pipes along the slab.
  const rack = new Path2D()
  const bundles = new Path2D()
  const straps = new Path2D()
  const rx0 = 0.15
  const rx1 = STAIR.x0 - 0.12
  for (const y of [UP + 1.05, UP + 1.95, FLOOR - 0.04]) rack.rect(rx0, y, rx1 - rx0, 0.05)
  for (const x of [rx0, (rx0 + rx1) / 2, rx1 - 0.05]) rack.rect(x, UP + 0.35, 0.05, FLOOR - UP - 0.35)
  for (const [y, n] of [[UP + 1.05, 3], [UP + 1.95, 3], [FLOOR - 0.04, 2]] as const) {
    for (let i = 0; i < n; i++) {
      const bw = 0.5
      const bx = rx0 + 0.12 + i * 0.62 + 0.05 * hash(i, y)
      const bh = 0.36 + 0.12 * hash(i, y, 2)
      bundles.rect(bx, y - bh, bw, bh)
      straps.rect(bx + bw / 2 - 0.012, y - bh, 0.024, bh)
      for (let c = y - 0.05; c > y - bh; c -= 0.05) straps.rect(bx, c, bw, 0.006)
    }
  }
  rack.rect(x0, UP + 0.36, sx1 - x0, 0.06)
  rack.rect(x0, UP + 0.46, sx1 - x0, 0.04)
  ctx.fillStyle = '#1B2328'
  ctx.fill(rack)
  ctx.fillStyle = rgbaOf(OP.reel, 0.42)
  ctx.fill(bundles)
  ctx.fillStyle = rgbaOf('#3A4247', 0.7)
  ctx.fill(straps)
  const lx = 1.25
  ctx.fillStyle = '#10161A'
  ctx.fillRect(lx - 0.012, UP + 0.32, 0.024, 0.2)
  ctx.fillRect(lx - 0.1, UP + 0.52, 0.2, 0.1)
  ctx.fillStyle = rgbaOf('#F4C27A', 0.9)
  ctx.fillRect(lx - 0.06, UP + 0.6, 0.12, 0.04)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = rgbaOf('#F4C27A', 0.05)
  for (const w of [1.6, 0.9]) {
    ctx.beginPath()
    ctx.moveTo(lx - 0.1, UP + 0.62)
    ctx.lineTo(lx + 0.1, UP + 0.62)
    ctx.lineTo(lx + w, FLOOR)
    ctx.lineTo(lx - w, FLOOR)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  // The columns under the mezzanine.
  ctx.fillStyle = '#182024'
  for (const cx of [-3.6, -0.4]) if (cx > x0 - 1) ctx.fillRect(cx - 0.1, UP + 0.32, 0.2, FLOOR - UP - 0.32)
  ctx.restore()

  // The partition at the room's end: a door frame, and glass over the stairhead.
  ctx.save()
  ctx.scale(k, k)
  ctx.fillStyle = OP.frame
  ctx.fillRect(x1 - 0.08, OFFICE.top, 0.12, UP - 2.3 - OFFICE.top)
  ctx.fillRect(x1 - 0.08, UP - 2.36, 0.5, 0.08)
  ctx.restore()
  void TABLE
}
