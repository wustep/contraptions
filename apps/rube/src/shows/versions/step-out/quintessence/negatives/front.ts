import { scenery } from '../kit'
import { glow, layer, motes, rgbaOf, view, type View } from '../depth'
import { revealAt } from './archive'
import { lampAt, tubeAt } from './draw'
import { clamp01, knock, ramp } from './hand'
import { DOOR, ENLARGER, GLASS, LAMP, LIP, NUUK, OFFICE, PICTURE, RAPS } from './plan'

/**
 * What stands between the camera and the machine in this place, and the light over all of it: the near plane, the
 * air, the grade. Drawn after the set and the parts and before Walter (`depth.ts`), so nothing here hides him or
 * changes his colour. It is handed show time as `t`.
 *
 * The room's air: dust going up through the table's glow, warm close to it and cool above, flaring with the tubes
 * when they strike; the table's bloom; the corridor's light through the frosted door; the enlarger's cone, full of
 * dust, once its lamp is on. Nearest of all, out of focus along the bottom of the frame, the desk's edge and what is
 * left on it: a reel, the loupe's case, a roll of tape. Over everything, a cold teal and the frame's edges falling
 * away.
 */

type C2 = CanvasRenderingContext2D

const ANCHOR: [number, number] = [2.6, -0.6]
const REF = 3.4

/* ------------------------------------------------------------------ the air */

function air(ctx: C2, v: View, t: number, light: number, flash: number): void {
  // Warm dust, rising slowly through the table's light (which the eye finds before the tubes are fully up).
  const eased = 1 - (1 - light) * (1 - light)
  const warm = 0.6 * eased + 0.5 * flash
  if (warm > 0.02) {
    ctx.save()
    ctx.globalAlpha = clamp01(warm)
    motes(ctx, v, t, {
      n: 34,
      seed: 3,
      tile: [2.6, 1.9],
      r: [0.006, 0.014],
      v: [0.02, -0.07],
      spread: 0.5,
      sway: [0.05, 0.13],
      color: 'rgba(255, 236, 206, 0.55)',
      twinkle: 0.6,
      within: { x0: GLASS.x0 - 0.6, y0: GLASS.top - 1.6, x1: GLASS.x1 + 0.6, y1: GLASS.top + 0.05 },
    })
    ctx.restore()
  }
  // Cooler dust higher up, in the tubes' light, and through the whole room when they flash.
  const cool = 0.4 * eased + 0.65 * flash
  if (cool > 0.02) {
    ctx.save()
    ctx.globalAlpha = clamp01(cool)
    motes(ctx, v, t, {
      n: 34,
      seed: 4,
      tile: [3.1, 2.3],
      r: [0.005, 0.012],
      v: [-0.03, -0.035],
      spread: 0.6,
      sway: [0.06, 0.09],
      color: 'rgba(196, 222, 222, 0.45)',
      twinkle: 0.5,
      within: flash > 0.2 ? { x0: v.x0, y0: v.y0, x1: v.x1, y1: GLASS.top - 0.6 } : { x0: GLASS.x0 - 1.2, y0: GLASS.top - 3.2, x1: GLASS.x1 + 1.2, y1: GLASS.top - 0.6 },
    })
    ctx.restore()
  }
}

/* ------------------------------------------------------------------ the light */

/** The table's bloom: its light lifting off the glass into the dark above it. */
function bloom(ctx: C2, k: number, light: number): void {
  if (light <= 0.02) return
  const top = GLASS.top - 0.08
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createLinearGradient(0, top * k, 0, (top - 0.45) * k)
  g.addColorStop(0, rgbaOf('#FFE9C8', 0.16 * light))
  g.addColorStop(0.35, rgbaOf('#FFE9C8', 0.05 * light))
  g.addColorStop(1, rgbaOf('#FFE9C8', 0))
  ctx.fillStyle = g
  ctx.fillRect((GLASS.x0 - 0.2) * k, (top - 0.45) * k, (GLASS.x1 - GLASS.x0 + 0.4) * k, 0.45 * k)
  ctx.restore()
}

/** The corridor's light through the frosted door, into the room: a glow on the pane and a fall of light below it. */
function corridor(ctx: C2, k: number, t: number): void {
  const { pane } = DOOR
  const lit = 0.5 + 0.5 * ramp(t, OFFICE - 0.5, OFFICE + 0.2)
  // Ted's shape on the glass takes some of it; the raps shake it.
  const ted = ramp(t, RAPS[0] - 0.75, RAPS[0] - 0.4) * (1 - ramp(t, RAPS[1] + 0.35, RAPS[1] + 0.95))
  const rap = RAPS.reduce((s, r) => s + knock(t, r, 0.07), 0)
  const a = lit * (1 - 0.35 * ted) * (1 + 0.25 * Math.min(1, rap))
  const cx = (pane.x0 + pane.x1) / 2
  const cy = (pane.y0 + pane.y1) / 2
  glow(ctx, k, cx, cy, 1.15, '#D6E4E2', 0.09 * a, true, 1.2)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createLinearGradient(0, pane.y1 * k, 0, (LIP + 0.5) * k)
  g.addColorStop(0, rgbaOf('#CFDEDC', 0.07 * a))
  g.addColorStop(1, rgbaOf('#CFDEDC', 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(pane.x0 * k, pane.y1 * k)
  ctx.lineTo(pane.x1 * k, pane.y1 * k)
  ctx.lineTo((pane.x1 - 0.2) * k, (LIP + 0.5) * k)
  ctx.lineTo((pane.x0 - 0.9) * k, (LIP + 0.5) * k)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/** The enlarger's cone, once its lamp is on: from the lens to the picture, brightest at the lens, full of dust. */
function cone(ctx: C2, v: View, t: number): void {
  const on = lampAt(t)
  if (on <= 0) return
  const k = v.k
  const [lx, ly] = ENLARGER.lens
  const { x1, y0, y1 } = PICTURE
  const beam = new Path2D()
  beam.moveTo((lx + 0.04) * k, (ly - 0.06) * k)
  beam.lineTo(x1 * k, y0 * k)
  beam.lineTo(x1 * k, y1 * k)
  beam.lineTo((lx + 0.04) * k, (ly + 0.06) * k)
  beam.closePath()
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createRadialGradient(lx * k, ly * k, 0, lx * k, ly * k, 4.2 * k)
  g.addColorStop(0, rgbaOf('#F4F2EA', 0.16 * on))
  g.addColorStop(0.3, rgbaOf('#F4F2EA', 0.05 * on))
  g.addColorStop(1, rgbaOf('#F4F2EA', 0))
  ctx.fillStyle = g
  ctx.fill(beam)
  ctx.clip(beam)
  // Dust turning over in the beam, catching its light.
  motes(ctx, v, t, {
    n: 40,
    seed: 9,
    tile: [2.4, 1.6],
    r: [0.006, 0.016],
    v: [0.035, -0.02],
    spread: 0.7,
    sway: [0.05, 0.17],
    color: rgbaOf('#FFF7E6', 0.55 * on),
    twinkle: 0.7,
    within: { x0: lx, y0: y0, x1: x1, y1: y1 },
  })
  ctx.restore()
}

/* ------------------------------------------------------------------ the near plane */

/** A soft-edged out-of-focus disc, near the lens: its rim falls away rather than ending. */
function softDisc(ctx: C2, x: number, y: number, r: number, hex: string, a: number, k: number): void {
  if (a <= 0.003) return
  const g = ctx.createRadialGradient(x * k, y * k, r * 0.55 * k, x * k, y * k, r * 1.12 * k)
  g.addColorStop(0, rgbaOf(hex, a))
  g.addColorStop(1, rgbaOf(hex, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x * k, y * k, r * 1.12 * k, 0, Math.PI * 2)
  ctx.fill()
}

/** What is on the desk nearest the camera, in its own plane's cells: [kind, x]. */
const NEAR_THINGS: [string, number][] = [
  ['loupe', -5.8],
  ['reel', -1.9],
  ['loupe', 2.25],
  ['tape', 6.7],
  ['reel', 10.6],
]
const DESK = 1.1

function nearPlane(ctx: C2, v: View, light: number): void {
  layer(ctx, v, 1.4, ANCHOR, REF, (inner) => {
    const k = inner.k
    if (inner.y1 < DESK - 0.6 || light < 0.01) return
    const lit = light
    ctx.globalAlpha = Math.min(1, light * 2.5)
    // The desk's edge, soft, its lip catching the table's light.
    const g = ctx.createLinearGradient(0, (DESK - 0.06) * k, 0, (DESK + 0.04) * k)
    g.addColorStop(0, rgbaOf('#0A0D0E', 0))
    g.addColorStop(1, rgbaOf('#0A0D0E', 0.95))
    ctx.fillStyle = g
    ctx.fillRect((inner.x0 - 0.2) * k, (DESK - 0.06) * k, (inner.w + 0.4) * k, 0.1 * k)
    ctx.fillStyle = rgbaOf('#0A0D0E', 0.95)
    ctx.fillRect((inner.x0 - 0.2) * k, (DESK + 0.04) * k, (inner.w + 0.4) * k, (inner.y1 - DESK + 0.2) * k)
    const edge = ctx.createLinearGradient(0, (DESK - 0.035) * k, 0, (DESK + 0.05) * k)
    edge.addColorStop(0, rgbaOf('#6E6758', 0))
    edge.addColorStop(0.5, rgbaOf('#6E6758', 0.35 * lit))
    edge.addColorStop(1, rgbaOf('#6E6758', 0))
    ctx.fillStyle = edge
    ctx.fillRect((inner.x0 - 0.2) * k, (DESK - 0.035) * k, (inner.w + 0.4) * k, 0.085 * k)
    for (const [kind, x] of NEAR_THINGS) {
      if (x < inner.x0 - 1 || x > inner.x1 + 1) continue
      if (kind === 'reel') {
        // A reel stood on its edge, out of focus: its dark flange, the light through its three windows, its hub.
        const r = 0.34
        const cy = DESK - r + 0.02
        softDisc(ctx, x, cy, r, '#0B0E0F', 0.96, k)
        for (let i = 0; i < 3; i++) {
          const a = -Math.PI / 2 + (i * Math.PI * 2) / 3 + 0.3
          softDisc(ctx, x + Math.cos(a) * r * 0.52, cy + Math.sin(a) * r * 0.52, r * 0.22, '#3B3E3A', 0.45 * lit, k)
        }
        softDisc(ctx, x, cy, r * 0.14, '#55524A', 0.5 * lit, k)
        // The rim's highlight where the table's light finds it.
        ctx.strokeStyle = rgbaOf('#8C836F', 0.2 * lit)
        ctx.lineWidth = 0.05 * k
        ctx.beginPath()
        ctx.arc(x * k, cy * k, r * 0.88 * k, -2.5, -0.9)
        ctx.stroke()
      } else if (kind === 'loupe') {
        // The loupe stood on the desk, out of focus: a soft black body, and its lens's rim a ring of the table's light.
        const top = DESK - 0.26
        ctx.save()
        ctx.translate(x * k, (DESK - 0.13) * k)
        ctx.scale(1, 0.75)
        softDisc(ctx, 0, 0, 0.2, '#0B0E0F', 0.95, k)
        ctx.restore()
        ctx.save()
        ctx.translate(x * k, top * k)
        ctx.scale(1, 0.32)
        const rim = ctx.createRadialGradient(0, 0, 0.06 * k, 0, 0, 0.2 * k)
        rim.addColorStop(0, rgbaOf('#A69D86', 0))
        rim.addColorStop(0.6, rgbaOf('#C8BFA6', 0.3 * lit))
        rim.addColorStop(1, rgbaOf('#A69D86', 0))
        ctx.fillStyle = rim
        ctx.fillRect(-0.2 * k, -0.2 * k, 0.4 * k, 0.4 * k)
        ctx.restore()
      } else {
        // Cans lying flat in a short stack, out of focus: soft dark discs edge-on, their rims lit.
        for (let i = 0; i < 3; i++) {
          const cy = DESK - 0.05 - i * 0.075
          ctx.save()
          ctx.translate((x + i * 0.03) * k, cy * k)
          ctx.scale(1, 0.16)
          softDisc(ctx, 0, 0, 0.36, '#0D1011', 0.95, k)
          ctx.restore()
          const g2 = ctx.createLinearGradient(0, (cy - 0.03) * k, 0, (cy + 0.01) * k)
          g2.addColorStop(0, rgbaOf('#7E7666', 0))
          g2.addColorStop(0.5, rgbaOf('#7E7666', 0.16 * lit))
          g2.addColorStop(1, rgbaOf('#7E7666', 0))
          ctx.fillStyle = g2
          ctx.fillRect((x + i * 0.03 - 0.3) * k, (cy - 0.03) * k, 0.6 * k, 0.04 * k)
        }
      }
    }
  })
}

/* ------------------------------------------------------------------ the grade */

/** The frame's top falling away into the dark over the room (its bottom is the desk's, its sides the room's own dark). */
function ceiling(ctx: C2, v: View, hex: string, a: number): void {
  const k = v.k
  const h = v.h * 0.22
  const g = ctx.createLinearGradient(0, v.y0 * k, 0, (v.y0 + h) * k)
  g.addColorStop(0, rgbaOf(hex, a))
  g.addColorStop(1, rgbaOf(hex, 0))
  ctx.fillStyle = g
  ctx.fillRect((v.x0 - 0.05) * k, (v.y0 - 0.05) * k, (v.w + 0.1) * k, (h + 0.05) * k)
}

export const negativesFront = scenery<null>({
  name: 'negatives-front',
  draw: (p, _s, c) => {
    const t = c.t
    const ctx = p.drawingContext as C2
    const v = view(p, c.k)
    const light = tubeAt(t)
    const flash = revealAt(t)
    ctx.save()
    bloom(ctx, c.k, light)
    if (v.x1 > DOOR.x0 - 1.2) corridor(ctx, c.k, t)
    if (t > LAMP - 0.1 && t < NUUK + 1.5) cone(ctx, v, t)
    air(ctx, v, t, light, flash)
    nearPlane(ctx, v, light)
    // A cold teal over the room's darks, and the frame's edges going into them.
    ctx.fillStyle = 'rgba(30, 64, 66, 0.07)'
    ctx.fillRect((v.x0 - 0.1) * c.k, (v.y0 - 0.1) * c.k, (v.w + 0.2) * c.k, (v.h + 0.2) * c.k)
    ceiling(ctx, v, '#060A0B', 0.6)
    ctx.restore()
  },
})
