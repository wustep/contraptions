import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { hash, scenery } from '../kit'
import { glow, layer, motes, rgbaOf, shaft, sway, view, type View } from '../depth'
import { ANCHOR, farWindows, REF } from './hall'
import { LAMP_Y, LAMPS } from './press-draw'
import { CUT_START, CUTS, DOOR_TOP, DOOR_X, FLOOR, LAID, NOSE, SHOVE, T0, TABLE, TREADLE, UP } from './press-plan'
import { lampsOn, lastDown, thump } from './pulse'
import { OFFICE } from './office'

/**
 * What stands between the camera and the machine in this place, and the light over all of it: the near plane, the
 * air, the grade. Drawn after the set and the parts and before Walter (`depth.ts`), so nothing here hides him or
 * changes his colour. It is handed show time as `t`.
 *
 * Upstairs, the pendant's warm cone on the table. In the hall, the sodium lamps' cones through the haze, the dawn in
 * long shafts from the far windows, the morning in at the loading door; paper dust and ink mist in the light; the
 * chips off the folder's knife. On every beat of the peak the lamps thump, and on every bar's first beat a band of
 * light sweeps the hall. Near the lens an overhead girder with chains and a lamp swinging from it, and the feet of the
 * nearest machines and their stock going by along the bottom of the frame. Then the grade: steel-cool over the top,
 * amber under the lamps, and the edges falling away into ink.
 */

type C2 = CanvasRenderingContext2D

const SODIUM = '#F2A94E'
const DAWN = '#E9CC9C'
const INK = '#06080A'


/* ------------------------------------------------------------------ upstairs */

function office(ctx: C2, v: View, t: number): void {
  const k = v.k
  ctx.save()
  ctx.beginPath()
  ctx.rect((v.x0 - 1) * k, (OFFICE.top - 1) * k, (OFFICE.x1 - v.x0 + 1) * k, (UP - OFFICE.top + 1) * k)
  ctx.clip()
  // The pendant's cone onto the table, its bloom, the pool on the table's top.
  shaft(ctx, k, [-1.1, -2.66], 0.62, [-1.1, TABLE.top + 0.1], 3.2, '#F4C27A', 0.08, true)
  glow(ctx, k, -1.1, -2.66, 0.9, '#FFD9A0', 0.35, true, 0.5)
  glow(ctx, k, -1.1, TABLE.top - 0.08, 1.7, '#F4C27A', 0.14, true, 0.14)
  // The dust turning in it, stirred when the negative lands.
  const stir = Math.exp(-Math.max(0, t - LAID) / 1.4)
  motes(ctx, v, t, { n: 26, seed: 31, tile: [2.4, 2.8], r: [0.006, 0.014], v: [0.02 + 0.08 * stir, -0.03], sway: [0.05, 0.2], color: rgbaOf('#FFE2B0', 0.55), twinkle: 0.6, within: { x0: -2.4, y0: -2.6, x1: 0.2, y1: TABLE.top } })
  ctx.restore()
}

/* ------------------------------------------------------------------ the hall */

/** The sodium lamps over the machine: their cones through the haze, their blooms, the pools they make on the floor. */
function lamps(ctx: C2, v: View, t: number, xr: number): void {
  const k = v.k
  const on = lampsOn(t, 0)
  // The loudest hit of the stretch, the shove: every lamp flares with it.
  const loud = t >= SHOVE ? Math.exp(-(t - SHOVE) / 0.3) : 0
  const beat = thump(t, 0.11) + 1.2 * loud
  for (const lx of LAMPS) {
    if (lx - 2.2 > v.x1 || lx + 2.2 < v.x0 || lx > xr + 1) continue
    cone(ctx, k, lx, LAMP_Y + 0.1, 0.6, FLOOR, 3.8, SODIUM, on * (0.09 + 0.11 * beat))
    glow(ctx, k, lx, LAMP_Y + 0.12, 0.9 + 0.25 * beat, '#FFD38C', Math.min(0.95, 0.25 * on + 0.3 * beat), true, 0.6)
  }
}

/**
 * A lamp's cone through the haze, from its shade at `y0` (`w0` wide) to the floor at `y1` (`w1` wide), brightest at
 * the top: three flat layers, each shorter and narrower, rather than a gradient, which the software rasteriser pays
 * for pixel by pixel.
 */
function cone(ctx: C2, k: number, x: number, y0: number, w0: number, y1: number, w1: number, hex: string, a: number): void {
  if (a <= 0.003) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = rgbaOf(hex, a * 0.55)
  for (const f of [1, 0.45]) {
    const y = y0 + (y1 - y0) * f
    const w = w0 + (w1 - w0) * f * (0.75 + 0.25 * f)
    ctx.beginPath()
    ctx.moveTo((x - w0 / 2) * k, y0 * k)
    ctx.lineTo((x + w0 / 2) * k, y0 * k)
    ctx.lineTo((x + w / 2) * k, y * k)
    ctx.lineTo((x - w / 2) * k, y * k)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

/** The lamps in the floor: a warm pool under each, and in the oiled plates a faint streak running toward the camera. */
function reflections(ctx: C2, v: View, t: number, xr: number): void {
  if (v.y1 < FLOOR + 0.1) return
  const k = v.k
  const on = lampsOn(t, 0)
  const beat = thump(t, 0.11)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const streak = new Path2D()
  for (const lx of LAMPS) {
    if (lx - 1.5 > v.x1 || lx + 1.5 < v.x0 || lx > xr) continue
    glow(ctx, k, lx, FLOOR + 0.12, 1.5, SODIUM, (0.12 + 0.05 * beat) * on, false, 0.14)
    streak.moveTo((lx - 0.035) * k, (FLOOR + 0.05) * k)
    streak.lineTo((lx + 0.035) * k, (FLOOR + 0.05) * k)
    streak.lineTo((lx + 0.09) * k, (FLOOR + 1.1) * k)
    streak.lineTo((lx - 0.09) * k, (FLOOR + 1.1) * k)
    streak.closePath()
  }
  ctx.fillStyle = rgbaOf(SODIUM, (0.06 + 0.03 * beat) * on)
  ctx.fill(streak)
  // The window wall in the floor: a pale cool streak under each window, broken by the floor's seams.
  const glass = new Path2D()
  for (const w of farWindows(v)) {
    if (w.x > xr - 0.2) continue
    const top = FLOOR + 0.04
    glass.rect((w.x + w.w * 0.2) * k, top * k, w.w * 0.6 * k, Math.min(1.6, v.y1 - top) * k)
  }
  ctx.fillStyle = rgbaOf('#9EC0CC', 0.035)
  ctx.fill(glass)
  ctx.restore()
}

/** The dawn in long shafts from the far wall's windows, down through the haze to the floor: one path, one gradient. */
function dawn(ctx: C2, v: View, t: number, xr: number): void {
  const k = v.k
  const wins = farWindows(v).filter((w, i) => w.x < xr && i % 2 === 0)
  if (!wins.length) return
  const path = new Path2D()
  const lean = 0.85
  const foot = FLOOR + 0.6
  for (const w of wins) {
    const run = lean * (foot - w.y0)
    path.moveTo(w.x * k, w.y0 * k)
    path.lineTo((w.x + w.w) * k, w.y0 * k)
    path.lineTo((w.x + w.w + run + 0.25) * k, foot * k)
    path.lineTo((w.x + run - 0.1) * k, foot * k)
    path.closePath()
  }
  const breathe = 0.85 + 0.15 * Math.sin(t * 0.7)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = rgbaOf(DAWN, 0.045 * breathe)
  ctx.fill(path)
  ctx.restore()
}

/** On each bar's first beat a band of light sweeps the hall, crossing the frame in under half a second. */
function sweep(ctx: C2, v: View, t: number): void {
  const { ago, w } = lastDown(t)
  if (!w || ago > 0.5) return
  const k = v.k
  const a = 0.11 * w * (1 - ago / 0.5)
  const x = v.x0 - 1.2 + (v.w + 2.4) * (ago / 0.5)
  const y0 = (v.y0 - 0.5) * k
  const h = (Math.min(v.y1, FLOOR) - v.y0 + 0.5) * k
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = rgbaOf('#CFE6EC', a * 0.45)
  for (const w of [1.2, 0.7, 0.3]) ctx.fillRect((x - w) * k, y0, 2 * w * k, h)
  ctx.restore()
}

/** The morning in at the loading door: a warm wedge across the hall's floor, and the haze lit in the doorway. */
function door(ctx: C2, v: View, t: number): void {
  if (v.x1 < DOOR_X - 7 || v.x0 > DOOR_X + 1) return
  const k = v.k
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = rgbaOf('#F4C98A', 0.055)
  // The morning thrown in across the floor: a fan from the threshold, longest along the floor's line.
  for (const len of [6, 3.6, 1.8]) {
    ctx.beginPath()
    ctx.moveTo(DOOR_X * k, (FLOOR - 0.01) * k)
    ctx.lineTo((DOOR_X - len) * k, (FLOOR + 0.02 * len) * k)
    ctx.lineTo((DOOR_X - 0.35 * len) * k, (FLOOR + 0.22 * len) * k)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  glow(ctx, k, DOOR_X - 0.1, (FLOOR + DOOR_TOP) / 2, 1.3, '#F4D2A0', 0.14 + 0.02 * Math.sin(t * 1.3), true, 1.8)
}

/** The air: paper dust and ink mist in the lamps' light, lifting a little on the beats. */
function air(ctx: C2, v: View, t: number, xr: number): void {
  const on = lampsOn(t, 0)
  const lift = 0.04 * thump(t, 0.3)
  const box = { x0: v.x0 - 1, y0: v.y0 - 1, x1: Math.min(v.x1 + 1, xr), y1: FLOOR }
  // Dust everywhere in the hall, catching what light there is.
  motes(ctx, v, t, { n: 34, seed: 41, tile: [4, 3.2], r: [0.007, 0.016], v: [0.05, -0.04 - lift], sway: [0.08, 0.13], color: rgbaOf('#E9D8B8', 0.32 + 0.2 * on), twinkle: 0.5, square: true, within: box })
  // Thicker in the lamps' cones: paper dust warm, ink mist cool.
  for (const lx of LAMPS) {
    if (lx - 2 > v.x1 || lx + 2 < v.x0 || lx > xr + 1) continue
    const cone = { x0: lx - 1.5, y0: LAMP_Y + 0.4, x1: lx + 1.5, y1: FLOOR - 0.1 }
    motes(ctx, v, t, { n: 22, seed: 51 + lx, tile: [3, 4.2], r: [0.008, 0.02], v: [0.04, -0.06 - lift * 2], sway: [0.06, 0.25], color: rgbaOf('#FFD79A', 0.45 * on), square: true, within: cone })
    motes(ctx, v, t, { n: 14, seed: 61 + lx, tile: [3, 4.2], r: [0.012, 0.03], v: [-0.03, 0.02], sway: [0.1, 0.11], color: rgbaOf('#9CC2CC', 0.18 * on), square: true, within: cone })
  }
}

/** Chips off the folder's knife: on every cut a spray of paper flecks out of its mouth, falling and turning to the floor. */
function chips(ctx: C2, v: View, t: number): void {
  if (t < CUT_START || NOSE[0] + 3 < v.x0 || NOSE[0] - 3 > v.x1) return
  const k = v.k
  const ox = NOSE[0] - 0.585
  const oy = NOSE[1] + 0.37
  const path = new Path2D()
  for (let c = CUTS.length - 1; c >= 0; c--) {
    const u = t - CUTS[c]
    if (u < 0) continue
    if (u > 0.9) break
    for (let i = 0; i < 9; i++) {
      const side = hash(c, i, 74) < 0.5 ? -1 : 1
      const a = -Math.PI * (0.12 + 0.3 * hash(c, i, 71))
      const sp = 1.0 + 1.4 * hash(c, i, 73)
      const x = ox + side * Math.cos(a) * sp * u
      const y = oy + Math.sin(a) * sp * u + 4.5 * u * u
      if (y > FLOOR) continue
      const s = 0.018 + 0.016 * hash(c, i, 75)
      const turn = u * 14 + i
      path.moveTo((x + Math.cos(turn) * s) * k, (y + Math.sin(turn) * s * 0.4) * k)
      path.lineTo((x - Math.sin(turn) * s * 0.5) * k, (y + Math.cos(turn) * s) * k)
      path.lineTo((x - Math.cos(turn) * s) * k, (y - Math.sin(turn) * s * 0.4) * k)
      path.closePath()
    }
  }
  ctx.fillStyle = rgbaOf('#F6F1E4', 0.9)
  ctx.fill(path)
}

/* ------------------------------------------------------------------ near the lens */

const NEAR = 1.42
/** The overhead girder close to the lens, its chains, and the lamp that swings from it. */
const GIRDER_Y = -0.62
const CHAINS = [5.2, 11.6, 18.9, 24.4]
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
    const dark = new Path2D()
    const rim = new Path2D()
    // The girder: an I-beam, its web stiffened every half cell.
    if (s.y0 < GIRDER_Y + 0.3) {
      const xa = s.x0 - 0.5
      const xb = Math.min(s.x1 + 0.5, xEnd)
      if (xb > xa) {
        dark.rect(xa, GIRDER_Y - 0.36, xb - xa, 0.07)
        dark.rect(xa, GIRDER_Y - 0.3, xb - xa, 0.26)
        // Its hangers up into the roof.
        for (let x = Math.floor(xa / 3.3) * 3.3 + 1.1; x < xb; x += 3.3) dark.rect(x, s.y0 - 0.5, 0.05, GIRDER_Y - 0.36 - s.y0 + 0.5)
        dark.rect(xa, GIRDER_Y - 0.04, xb - xa, 0.09)
        rim.rect(xa, GIRDER_Y + 0.045, xb - xa, 0.014)
        rim.rect(xa, GIRDER_Y - 0.295, xb - xa, 0.01)
        for (let x = Math.floor(xa / 0.55) * 0.55; x < xb; x += 0.55) {
          rim.rect(x, GIRDER_Y - 0.29, 0.02, 0.25)
          for (const dy of [-0.33, 0.0]) rim.rect(x + 0.12, GIRDER_Y + dy, 0.03, 0.03)
        }
      }
    }
    // Its chains, swaying, each with a hook.
    for (const cx of CHAINS) {
      if (cx < s.x0 - 1 || cx > s.x1 + 1 || cx > xEnd) continue
      const len = 0.85 + 0.25 * hash(cx, 3)
      const a = 0.05 * sway(t, 0.31 + 0.05 * hash(cx, 1), cx) + 0.03 * thump(t, 0.4)
      const bx = cx + Math.sin(a) * len
      const by = GIRDER_Y + Math.cos(a) * len
      const n = Math.floor(len / 0.07)
      for (let i = 0; i < n; i++) {
        const u = i / n
        const x = cx + (bx - cx) * u
        const y = GIRDER_Y + (by - GIRDER_Y) * u
        if (i % 2) dark.rect(x - 0.012, y, 0.024, 0.075)
        else dark.rect(x - 0.03, y + 0.01, 0.06, 0.055)
      }
      dark.moveTo(bx + 0.02, by)
      dark.arc(bx - 0.05, by + 0.08, 0.07, 0, Math.PI * 0.9)
      dark.lineTo(bx - 0.08, by + 0.07)
      dark.arc(bx - 0.05, by + 0.08, 0.035, Math.PI * 0.9, 0, true)
      dark.closePath()
    }
    ctx.fillStyle = '#05070A'
    ctx.fill(dark)
    ctx.fillStyle = rgbaOf('#6F98A6', 0.55)
    ctx.fill(rim)
    // The lamp swinging close: its cord, its shade, its bulb and bloom.
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
      ctx.restore()
      const on = lampsOn(t, 0)
      ctx.scale(1 / k, 1 / k)
      glow(ctx, k, px - Math.sin(a) * 0.25, py + Math.cos(a) * 0.25, 0.75, '#FFD08A', 0.55 * on + 0.15, true, 0.7)
      ctx.scale(k, k)
    }
    ctx.restore()
  })
}

/**
 * The edges falling away into ink, as `vignette` draws them, but only where there is any: the clear middle is left out
 * of the fill, so the rasteriser does not shade the part of the frame the gradient leaves alone.
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
    if (v.x0 < OFFICE.x1) office(ctx, v, t)
    // The hall's light, kept off the office and the street outside.
    if (v.x1 > OFFICE.x1 || v.y0 < OFFICE.top || v.y1 > UP + 0.3) {
      const xl = v.x0 < OFFICE.x1 && v.y0 > OFFICE.top && v.y1 < FLOOR + 0.2 ? OFFICE.x1 : v.x0 - 1
      const xr = Math.min(v.x1 + 1, DOOR_X)
      if (xr > xl) {
        ctx.save()
        ctx.beginPath()
        ctx.rect(xl * c.k, (v.y0 - 1) * c.k, (xr - xl) * c.k, (v.h + 2) * c.k)
        ctx.clip()
        dawn(ctx, v, t, xr)
        if (t > TREADLE - 0.5) lamps(ctx, v, t, xr)
        reflections(ctx, v, t, xr)
        sweep(ctx, v, t)
        air(ctx, v, t, xr)
        chips(ctx, v, t)
        door(ctx, v, t)
        near(ctx, v, t, xr)
        ctx.restore()
      }
    }
    // The edges falling away into ink.
    ring(ctx, v, INK, 0.62, 0.66)
    ctx.restore()
  },
})
