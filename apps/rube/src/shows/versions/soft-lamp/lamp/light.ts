import { mixHex } from '../../../../parts'
import { rgba, viewOf } from './canvas'
import { DESK, GLASS, WALKMAN } from './desk'
import { spillShare } from './spill'
import { bulbsAt, sweepAt } from './decor'
import { MUSIC_END, smooth } from './music'
import { MOUTH, coverAt, lampAt, lightAt, nightAt, skyAt } from './world'

/**
 * The room's light. Everything is drawn in its own colours, lit by the lamp where it faces it; this lays the room's
 * dark over all of it, as a lofi room is lit: the lamp's pool, the window, the fairy lights and a passing car's lights
 * keep what they reach, and the rest of the room falls away into the night, cool and deeper as the night goes on.
 *
 * It is a light map, multiplied over the frame (the glass itself is left alone: it is a light, not lit). Each light
 * keeps a share of the room from the dark: `1 - (1 - ambient) * (1 - lamp) * (1 - window) * ...`. The lamp's share is
 * its own cone (`lightAt`), worked out once over the room; the window's is a soft round of the glass, strong at dusk,
 * moonlit late, a little stronger once the snow has settled; each bulb keeps a little round of its own.
 *
 * So the lamp coming on is the room changing, not only a bulb; and when it goes down at the end, the room goes back to
 * the window and the moon.
 */

type Ctx = CanvasRenderingContext2D

/** The room's own extent (cells), over which the still lights are worked out once. */
const ROOM = { x0: -12, x1: 12, y0: -9, y1: 5.5 }
/** Pixels per cell for those maps: light has no detail to keep. */
const PX = 12

let lampMap: HTMLCanvasElement | null = null
let windowMap: HTMLCanvasElement | null = null
let map: HTMLCanvasElement | null = null

/** A map of how much of a light reaches each point of the room, `f(x, y)` 0 to 1, as white at that alpha. */
function bake(f: (x: number, y: number) => number): HTMLCanvasElement {
  const w = Math.ceil((ROOM.x1 - ROOM.x0) * PX)
  const h = Math.ceil((ROOM.y1 - ROOM.y0) * PX)
  const c = Object.assign(document.createElement('canvas'), { width: w, height: h })
  const g = c.getContext('2d')!
  const img = g.createImageData(w, h)
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const v = Math.max(0, Math.min(1, f(ROOM.x0 + (i + 0.5) / PX, ROOM.y0 + (j + 0.5) / PX)))
      const k = (j * w + i) * 4
      img.data[k] = 255
      img.data[k + 1] = 255
      img.data[k + 2] = 255
      img.data[k + 3] = Math.round(v * 255)
    }
  }
  g.putImageData(img, 0, 0)
  return c
}

/** The lamp's share: its cone on the desk and the wall, and the glow round the shade. */
const lampShare = (x: number, y: number): number => {
  // Under the desk's top the lamp does not reach, but for the desk's own front edge.
  const under = smooth(y, DESK.top + 0.05, DESK.face + 0.4)
  // Its cone, softly edged, and round it a broad low glow off the desk and the wall, so the cone has no line.
  const cone = Math.min(1, lightAt(x, y, 1) * 1.3)
  const d = Math.hypot(x - MOUTH.x, y - MOUTH.y)
  const round = 0.45 * Math.exp(-((d / 2.8) ** 2))
  return (1 - (1 - cone) * (1 - round)) * (1 - 0.85 * under)
}

/** The window's share: a soft round of the glass, its light spilling down over the sill and the desk under it. */
const windowShare = (x: number, y: number): number => {
  const dx = Math.max(GLASS.x0 - x, 0, x - GLASS.x1)
  const dy = Math.max(GLASS.y0 - y, 0, y - GLASS.y1)
  // More of it falls down onto the sill and the desk than up the wall.
  const d = Math.hypot(dx, dy * (y > GLASS.y1 ? 0.7 : 1.2))
  return Math.exp(-((d / 0.95) ** 2))
}

/** How dark the room is away from its lights, as a colour (multiplied): the dusk's soft violet, then the night's blue. */
function ambientAt(t: number): string {
  const sky = skyAt(t)
  const night = smooth(nightAt(t), 0.04, 0.3)
  const base = mixHex('#DCD2E6', '#62669C', night)
  // The white roofs give a little back.
  return mixHex(base, '#B4B8DA', 0.35 * coverAt(t) * night * (1 - sky.dusk))
}

/** Lay the room's light over the frame. In cells, after everything in the room is drawn. */
export function light(ctx: Ctx, t: number): void {
  if (typeof document === 'undefined') return
  lampMap ??= bake(lampShare)
  windowMap ??= bake(windowShare)
  const cw = ctx.canvas.width
  const ch = ctx.canvas.height
  // The frame's map, small: a quarter of the frame's pixels across at most, and no more than light needs.
  const mw = Math.max(64, Math.min(480, Math.round(cw / 4)))
  const mh = Math.max(36, Math.round((mw * ch) / cw))
  map ??= document.createElement('canvas')
  if (map.width !== mw || map.height !== mh) {
    map.width = mw
    map.height = mh
  }
  const g = map.getContext('2d')!
  const m = ctx.getTransform()
  g.setTransform(new DOMMatrix().scale(mw / cw, mh / ch).multiply(m))
  const v = viewOf(ctx)
  g.globalCompositeOperation = 'source-over'
  g.globalAlpha = 1
  g.fillStyle = ambientAt(t)
  g.fillRect(v.x0 - 1, v.y0 - 1, v.x1 - v.x0 + 2, v.y1 - v.y0 + 2)
  g.imageSmoothingEnabled = true
  const room = (c: HTMLCanvasElement, a: number) => {
    if (a <= 0.003) return
    g.globalAlpha = Math.min(1, a)
    g.drawImage(c, ROOM.x0, ROOM.y0, ROOM.x1 - ROOM.x0, ROOM.y1 - ROOM.y0)
  }
  // The lamp: as bright as it is (it is off as the show opens, and down to a glow at the end).
  room(lampMap, Math.min(1, lampAt(t) * 1.05))
  // The window: strongest at dusk, moonlit late, a little more once the snow lies; and all that is left at the end.
  const sky = skyAt(t)
  const moon = smooth(nightAt(t), 0.55, 0.7)
  const end = smooth(t, MUSIC_END - 2, MUSIC_END + 4)
  room(windowMap, 0.5 + 0.4 * sky.dusk + 0.15 * moon + 0.12 * coverAt(t) + 0.1 * end)
  g.globalAlpha = 1
  // The window's light lying on the desk.
  spillShare(g, t)
  // Each bulb of the fairy lights keeps a little round of the wall round it.
  for (const b of bulbsAt(t)) {
    if (b.a < 0.02) continue
    const r = 0.55
    const rg = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, r)
    rg.addColorStop(0, rgba('#FFF4E6', 0.32 * b.a))
    rg.addColorStop(1, rgba('#FFF4E6', 0))
    g.fillStyle = rg
    g.fillRect(b.x - r, b.y - r, r * 2, r * 2)
  }
  // The Walkman's light, and a passing car's on the wall.
  const wx = WALKMAN.x0 + 0.15
  const wy = -WALKMAN.h + 0.1
  const wg = g.createRadialGradient(wx, wy, 0, wx, wy, 0.12)
  wg.addColorStop(0, 'rgba(255, 255, 255, 0.6)')
  wg.addColorStop(1, 'rgba(255, 255, 255, 0)')
  g.fillStyle = wg
  g.fillRect(wx - 0.12, wy - 0.12, 0.24, 0.24)
  const sw = sweepAt(t)
  if (sw.a > 0.01) {
    g.save()
    g.translate(sw.x, -4)
    g.scale(1.6, 4)
    const sg = g.createRadialGradient(0, 0, 0, 0, 0, 1)
    sg.addColorStop(0, rgba('#F2F4FF', 0.35 * sw.a))
    sg.addColorStop(1, rgba('#F2F4FF', 0))
    g.fillStyle = sg
    g.fillRect(-1, -1, 2, 2)
    g.restore()
  }
  // Over the frame, all but the glass.
  ctx.save()
  ctx.beginPath()
  ctx.rect(v.x0 - 1, v.y0 - 1, v.x1 - v.x0 + 2, v.y1 - v.y0 + 2)
  ctx.rect(GLASS.x0, GLASS.y0, GLASS.x1 - GLASS.x0, GLASS.y1 - GLASS.y0)
  ctx.clip('evenodd')
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalCompositeOperation = 'multiply'
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(map, 0, 0, cw, ch)
  ctx.restore()
}
