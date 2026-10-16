import { rgbaOf, type View } from '../depth'

/**
 * The frame's edges falling away into `hex`, with its middle left out of the fill, so
 * the part of the frame it does not darken costs nothing, and its centre raised by `lift` of the frame's height, so
 * the dark gathers more at the foot than the head (the deep under him, the floor of a room).
 */
export function edgeDark(g: CanvasRenderingContext2D, v: View, hex: string, a: number, inner = 0.5, lift = 0): void {
  if (a <= 0.003) return
  const k = v.k
  const rx = (v.w / 2) * 1.42
  const ry = (v.h / 2) * 1.42
  const cx = v.cx
  const cy = v.cy - lift * v.h
  g.save()
  g.beginPath()
  g.rect((v.x0 - 0.5) * k, (v.y0 - 0.5) * k, (v.w + 1) * k, (v.h + 1) * k)
  g.ellipse(cx * k, cy * k, rx * inner * k, ry * inner * k, 0, 0, Math.PI * 2)
  g.translate(cx * k, cy * k)
  g.scale(1, ry / rx)
  const gr = g.createRadialGradient(0, 0, rx * inner * k, 0, 0, rx * (1 + lift) * k)
  gr.addColorStop(0, rgbaOf(hex, 0))
  gr.addColorStop(1, rgbaOf(hex, a))
  g.fillStyle = gr
  g.fill('evenodd')
  g.restore()
}

