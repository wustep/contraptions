import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { scenery } from '../kit'
import { layer, rgbaOf, sway, view, type View } from '../depth'
import { ANCHOR, REF } from './hall'
import { BAY, bayOn, LAMPS } from './press-draw'
import { DOOR_X, FLOOR, T0, UP } from './press-plan'
import { lampsOn } from './pulse'
import { OFFICE } from './office'

/**
 * What stands between the camera and the machine in this place, and the light over all of it: the near plane, the
 * air, the grade. Drawn after the set and the parts and before Walter (`depth.ts`), so nothing here hides him or
 * changes his colour. It is handed show time as `t`.
 *
 * In the hall, the sodium lamps' light lying in pools on the floor under them, the bay lamp's by the door once it is
 * on, and the morning laid in across the floor from the loading door. Near the lens an overhead girder and a lamp
 * swinging from it. Then the frame's edges falling away into ink.
 */

type C2 = CanvasRenderingContext2D

const SODIUM = '#F2A94E'
const INK = '#06080A'

/* ------------------------------------------------------------------ the hall */

/**
 * A pool of light on the near floor under a lamp at `x`: half an ellipse from the machine's line toward the camera,
 * foreshortened as the floor is seen, in two flat steps (its middle brighter). Into `wide` and `mid`.
 */
function pool(v: View, wide: Path2D, mid: Path2D, x: number, rx: number): void {
  const k = v.k
  const ry = 0.04 + 0.1 * Math.max(0, FLOOR - v.cy)
  wide.moveTo((x + rx) * k, FLOOR * k)
  wide.ellipse(x * k, FLOOR * k, rx * k, ry * k, 0, 0, Math.PI)
  mid.moveTo((x + rx * 0.5) * k, FLOOR * k)
  mid.ellipse(x * k, FLOOR * k, rx * 0.5 * k, ry * 0.55 * k, 0, 0, Math.PI)
}

/** The lamps' light where it lands: a pool on the floor under each of the sodium lamps, and under the bay lamp once it is on. */
function pools(ctx: C2, v: View, t: number, xr: number): void {
  if (v.y1 < FLOOR + 0.02) return
  const on = lampsOn(t, 0)
  const wide = new Path2D()
  const mid = new Path2D()
  for (const lx of LAMPS) {
    if (lx - 1.6 > v.x1 || lx + 1.6 < v.x0 || lx > xr) continue
    pool(v, wide, mid, lx, 1.5)
  }
  ctx.fillStyle = rgbaOf(SODIUM, 0.075 * on)
  ctx.fill(wide)
  ctx.fillStyle = rgbaOf(SODIUM, 0.06 * on)
  ctx.fill(mid)
  const bay = bayOn(t)
  if (bay > 0 && BAY[0] - 1.2 < v.x1) {
    const bw = new Path2D()
    const bm = new Path2D()
    pool(v, bw, bm, BAY[0] - 0.1, 1.0)
    ctx.fillStyle = rgbaOf('#F6E2BC', 0.07 * bay)
    ctx.fill(bw)
    ctx.fillStyle = rgbaOf('#F6E2BC', 0.06 * bay)
    ctx.fill(bm)
  }
}

/** The morning in at the loading door, laid across the hall's floor: a fan from the threshold, longest along the floor's line. */
function door(ctx: C2, v: View): void {
  if (v.x1 < DOOR_X - 7 || v.x0 > DOOR_X + 1) return
  const k = v.k
  ctx.fillStyle = rgbaOf('#F4C98A', 0.06)
  for (const len of [5, 2.4]) {
    ctx.beginPath()
    ctx.moveTo(DOOR_X * k, (FLOOR - 0.01) * k)
    ctx.lineTo((DOOR_X - len) * k, (FLOOR + 0.02 * len) * k)
    ctx.lineTo((DOOR_X - 0.35 * len) * k, (FLOOR + 0.22 * len) * k)
    ctx.closePath()
    ctx.fill()
  }
}

/* ------------------------------------------------------------------ near the lens */

const NEAR = 1.42
/** The overhead girder close to the lens, and the lamp that swings from it. */
const GIRDER_Y = -0.62
const SWINGER: Pt = [14.8, 0.05]

function near(ctx: C2, v: View, t: number, xr: number): void {
  const k = v.k
  // It is close to the lens: as the camera draws back it goes out of the picture over the top, and with the camera up
  // at the mezzanine it would cut across the middle of the hall, so it is only there once the camera is down.
  const fade = (1 - Math.max(0, Math.min(1, (v.h - 5.6) / 1.2))) * Math.max(0, Math.min(1, (v.cy - 1.2) / 0.7))
  if (fade <= 0) return
  layer(ctx, v, NEAR, ANCHOR, REF, (s) => {
    if (s.y0 > GIRDER_Y + 1.2) return
    ctx.save()
    ctx.globalAlpha *= fade
    ctx.scale(k, k)
    // The street's side of the end wall has no girder: stop it at the wall, as this plane sees it.
    const xEnd = s.x0 + ((xr - v.x0) / v.w) * s.w
    // The girder: an I-beam, the lamps' light along its lower flange.
    if (s.y0 < GIRDER_Y + 0.3) {
      const xa = s.x0 - 0.5
      const xb = Math.min(s.x1 + 0.5, xEnd)
      if (xb > xa) {
        const dark = new Path2D()
        dark.rect(xa, GIRDER_Y - 0.36, xb - xa, 0.07)
        dark.rect(xa, GIRDER_Y - 0.3, xb - xa, 0.26)
        // Its hangers up into the roof.
        for (let x = Math.floor(xa / 3.3) * 3.3 + 1.1; x < xb; x += 3.3) dark.rect(x, s.y0 - 0.5, 0.05, GIRDER_Y - 0.36 - s.y0 + 0.5)
        dark.rect(xa, GIRDER_Y - 0.04, xb - xa, 0.09)
        ctx.fillStyle = '#05070A'
        ctx.fill(dark)
        ctx.fillStyle = rgbaOf('#6F98A6', 0.55)
        ctx.fillRect(xa, GIRDER_Y + 0.045, xb - xa, 0.014)
      }
    }
    // The lamp swinging close: its cord, its shade, the lit bulb under it.
    const [lx, ly] = SWINGER
    if (lx > s.x0 - 2 && lx < s.x1 + 2 && lx < xEnd) {
      const a = 0.11 * Math.sin(t * 1.25) + 0.03 * sway(t, 0.2, 4)
      const px = lx + Math.sin(a) * (ly - GIRDER_Y)
      const py = GIRDER_Y + Math.cos(a) * (ly - GIRDER_Y)
      ctx.strokeStyle = '#05070A'
      ctx.lineWidth = 0.025
      ctx.beginPath()
      ctx.moveTo(lx, GIRDER_Y)
      ctx.lineTo(px, py)
      ctx.stroke()
      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(-a)
      ctx.fillStyle = '#07090B'
      ctx.beginPath()
      ctx.moveTo(-0.42, 0.24)
      ctx.quadraticCurveTo(-0.36, -0.06, 0, -0.08)
      ctx.quadraticCurveTo(0.36, -0.06, 0.42, 0.24)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = rgbaOf('#6F98A6', 0.5)
      ctx.fillRect(-0.42, 0.22, 0.84, 0.02)
      ctx.fillStyle = rgbaOf('#FFD08A', 0.35 + 0.6 * lampsOn(t, 0))
      ctx.beginPath()
      ctx.ellipse(0, 0.235, 0.3, 0.045, 0, 0, Math.PI)
      ctx.fill()
      ctx.restore()
    }
    ctx.restore()
  })
}

/**
 * The edges falling away into ink, only where there is any: the clear middle is left out of the fill, so the
 * rasteriser does not shade the part of the frame the gradient leaves alone.
 */
function ring(ctx: C2, v: View, hex: string, a: number, inner: number): void {
  const k = v.k
  const rx = (v.w / 2) * 1.42
  ctx.save()
  ctx.translate(v.cx * k, v.cy * k)
  ctx.scale(1, v.h / v.w)
  const g = ctx.createRadialGradient(0, 0, rx * inner * k, 0, 0, rx * k)
  g.addColorStop(0, rgbaOf(hex, 0))
  g.addColorStop(0.45, rgbaOf(hex, a * 0.38))
  g.addColorStop(1, rgbaOf(hex, a))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.rect(-rx * k, -rx * k, 2 * rx * k, 2 * rx * k)
  ctx.arc(0, 0, rx * inner * k * 0.995, 0, Math.PI * 2, true)
  ctx.fill()
  ctx.restore()
}

/* ------------------------------------------------------------------ the whole */

export const pressFront = scenery<null>({
  name: 'press-front',
  draw: (p: p5, _s, c) => {
    const t = c.t
    if (t < T0 - 1.2) return
    const ctx = p.drawingContext as C2
    const v = view(p, c.k)
    ctx.save()
    // The hall's light, kept off the office and the street outside.
    if (v.x1 > OFFICE.x1 || v.y0 < OFFICE.top || v.y1 > UP + 0.3) {
      const xl = v.x0 < OFFICE.x1 && v.y0 > OFFICE.top && v.y1 < FLOOR + 0.2 ? OFFICE.x1 : v.x0 - 1
      const xr = Math.min(v.x1 + 1, DOOR_X)
      if (xr > xl) {
        ctx.save()
        ctx.beginPath()
        ctx.rect(xl * c.k, (v.y0 - 1) * c.k, (xr - xl) * c.k, (v.h + 2) * c.k)
        ctx.clip()
        pools(ctx, v, t, xr)
        door(ctx, v)
        near(ctx, v, t, xr)
        ctx.restore()
      }
    }
    // The edges falling away into ink.
    ring(ctx, v, INK, 0.62, 0.66)
    ctx.restore()
  },
})
