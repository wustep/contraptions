import type p5 from 'p5'
import { frame, hash } from '../kit'
import { flicker, view } from '../depth'
import { archiveLights, drawArchive } from './archive'
import { at } from '../music'
import { CHERYL } from '../worlds'
import { clamp01, INK, knock, mix, pool, ramp, rgba, rule, settle, slab } from './hand'
import {
  BENCH,
  BLANK,
  cherylAt,
  DOOR,
  DREAM,
  ENLARGER,
  FLOOR,
  FOCUS,
  FRAME_LANDS,
  frameX,
  FRAMES,
  GAP_X,
  GLASS,
  IMG_W,
  LAMP,
  LIFT,
  LIP,
  lipY,
  LOUPE,
  LOUPE_CLICKS,
  loupeX,
  NOTCH,
  NUUK,
  OFFICE,
  PICTURE,
  RAPS,
  RATCHET,
  SHELF,
  STRIP,
  TO_TRAY,
  trayTop,
  TRAY_X,
  TUBE,
  walterAt,
} from './plan'

/**
 * The negatives room, drawn (the B1 builder's). One standing drawing for both visits, on show time: the dark, the
 * shelves going into it, the light table and its strip, the loupe on its rail, the frosted door, the enlarger and the
 * picture it throws. Nothing here is a ball; the balls are lit by it in `drawOver`.
 */

type C2 = CanvasRenderingContext2D

/** The room's values: all cool greys, the light a little green-white like old tubes. */
const R = {
  dark: '#121517',
  wall: '#1C2023',
  wallLit: '#3A4246',
  shelf: '#2A2F33',
  can: '#353B3F',
  canLit: '#5B656A',
  housing: '#2B3034',
  housingLit: '#4A5257',
  glass: '#E4ECE8',
  tube: '#F2F7F3',
  base: '#2C2A27',
  clear: '#EEF2EE',
  dense: '#26241F',
  metal: '#5E676C',
  wood: '#34302B',
  pane: '#8E9A9B',
  picSky: '#D5DAD7',
  picSea: '#8A9596',
  picDeep: '#6E797B',
}

/* ------------------------------------------------------------------ light */

/** The table's light, 0 (off) to 1: the tubes strike on the swell, stutter, catch, and strike again before the lead. */
export function tubeAt(t: number): number {
  if (t < TUBE.strike) return 0
  const glow = 0.07 * ramp(t, TUBE.strike, TUBE.strike + 0.3)
  const first = 0.5 * ramp(t, TUBE.catch, TUBE.catch + 0.9)
  const second = 0.4 * ramp(t, TUBE.second + 0.05, TUBE.second + 0.35)
  // The tube's hum as it warms: a faint unsteadiness that settles by the second strike.
  const hum = t < TUBE.second ? 0.05 * Math.sin(t * 61) * Math.sin(t * 7.3) * ramp(t, TUBE.catch, TUBE.catch + 0.4) : 0
  // The dip before the second strike, and the flashes.
  const dip = 0.32 * ramp(t, TUBE.second - 0.16, TUBE.second - 0.02) * (1 - ramp(t, TUBE.second, TUBE.second + 0.05))
  const flash =
    0.9 * knock(t, TUBE.strike, 0.07) +
    0.55 * knock(t, TUBE.flick[0], 0.05) +
    0.62 * knock(t, TUBE.flick[1], 0.06) +
    0.45 * knock(t, TUBE.second, 0.09)
  // Back from the daydream: the tubes tick once.
  const tick = t >= OFFICE ? -0.28 * knock(t, OFFICE, 0.1) : 0
  // Caught, they still hum: a faint, slow unsteadiness in the light, never quite still.
  const steady = t >= TUBE.second ? 0.014 * Math.sin(t * 5.3) * Math.sin(t * 1.9 + 0.7) : 0
  return clamp01(glow + first + second + hum - dip + flash + tick + steady)
}

/** How hard the blank glows past the rest of the glass: up as he stares into it, down again once he is back. */
export function blankAt(t: number): number {
  if (t < OFFICE) return ramp(t, at(0) - 0.1, DREAM) * (0.55 + 0.45 * ramp(t, DREAM - 0.6, DREAM))
  return 1 - ramp(t, OFFICE + 0.05, OFFICE + 1.6)
}

/** A frame's own light over the glass's: up as he lands on it, held while he is on it. */
function frameLight(n: number, t: number): number {
  let v = 0
  for (const land of FRAME_LANDS[n] ?? []) v = Math.max(v, 0.55 * knock(t, land, 0.35))
  const [wx] = walterAt(t)
  const on = 1 - clamp01(Math.abs(wx - frameX(n)) / 0.5)
  if (n === 21 && t > TO_TRAY.leave) v = Math.max(v, 0.5)
  return clamp01(v + 0.45 * on * on)
}

/** The lamp in the enlarger's head: off, then on at once as the tray goes home; the picture's focus after. */
export const lampAt = (t: number): number => (t < LAMP ? 0 : 1 - 0.25 * knock(t, LAMP, 0.05) * Math.cos((t - LAMP) * 90))
const focusAt = (t: number): number => (t < LAMP ? 0 : t < FOCUS ? 0.45 + 0.3 * ramp(t, LAMP, FOCUS) : 1)

/* ------------------------------------------------------------------ the pictures */

type Tone = (v: number) => string
/** The negative: clear film where the picture is dark, dense where it is light. */
const negative = (light: number): Tone => (v) => mix(R.dark, mix(R.clear, R.dense, v), light)
/** The print the enlarger throws: a grey daylight. */
const positive = (light: number): Tone => (v) => mix(R.dark, mix('#3A4246', '#E2E7E3', v), light)

/** One of the clues, or another frame of the roll, into the unit box (x 0..1, y 0..1) of the transform. */
function picture(ctx: C2, which: number, tone: Tone): void {
  const fill = (v: number) => (ctx.fillStyle = tone(v))
  const rect = (x0: number, y0: number, x1: number, y1: number, v: number) => {
    fill(v)
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0)
  }
  const strokeLine = (pts: [number, number][], v: number, w: number) => {
    ctx.strokeStyle = tone(v)
    ctx.lineWidth = w
    ctx.beginPath()
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.stroke()
  }
  const poly = (pts: [number, number][], v: number) => {
    fill(v)
    ctx.beginPath()
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.closePath()
    ctx.fill()
  }
  if (which === 24 || which === 21) {
    // Water: a pale sky with a streak of cloud, a low headland, the grey sea with its ripples and the light on it.
    // 21 is the same water, close, with a ship.
    const h = which === 24 ? 0.46 : 0.3
    rect(0, 0, 1, h, 0.86)
    rect(0.08, h * 0.35, 0.55, h * 0.35 + 0.03, 0.94)
    rect(0.3, h * 0.6, 0.85, h * 0.6 + 0.025, 0.92)
    rect(0, h, 1, 1, 0.48)
    if (which === 21) rect(0, h, 1, h + 0.025, 0.36)
    for (let i = 0; i < 12; i++) {
      const y = h + 0.05 + i * ((1 - h) / 12.5)
      const x = hash(i, which) * 0.6
      strokeLine([[x, y], [x + 0.15 + hash(i, which, 1) * 0.3 + i * 0.015, y]], 0.56 + 0.1 * hash(i, which, 2), 0.018 + i * 0.002)
    }
    for (let i = 0; i < 5; i++) rect(0.12 + i * 0.07 + hash(i, which, 3) * 0.04, h + 0.04 + i * 0.03, 0.17 + i * 0.07 + hash(i, which, 3) * 0.04, h + 0.055 + i * 0.03, 0.78)
    if (which === 24) {
      fill(0.3)
      ctx.beginPath()
      ctx.moveTo(0, h)
      ctx.quadraticCurveTo(0.12, h - 0.1, 0.32, h)
      ctx.fill()
    } else {
      // The ship on the horizon, and its reflection broken on the water under it.
      const sx = 0.62
      fill(0.12)
      ctx.beginPath()
      ctx.moveTo(sx - 0.13, h - 0.035)
      ctx.lineTo(sx + 0.14, h - 0.035)
      ctx.lineTo(sx + 0.11, h)
      ctx.lineTo(sx - 0.11, h)
      ctx.closePath()
      ctx.fill()
      ctx.fillRect(sx - 0.05, h - 0.09, 0.07, 0.06)
      ctx.fillRect(sx + 0.005, h - 0.15, 0.012, 0.07)
      for (let i = 0; i < 6; i++) {
        const y = h + 0.03 + i * 0.07
        const w = 0.2 - i * 0.022
        const dx = (hash(i, 7) - 0.5) * 0.05
        rect(sx - w / 2 + dx, y, sx + w / 2 + dx, y + 0.035, 0.22 + i * 0.04)
      }
    }
    return
  }
  if (which === 23) {
    // A thumb over the lens: the scene soft behind (a low roofline), the thumb's dark round coming up from the
    // corner, its whorl just caught.
    rect(0, 0, 1, 1, 0.7)
    rect(0, 0.55, 1, 1, 0.55)
    for (const [x0, w, hgt] of [[0.02, 0.1, 0.12], [0.13, 0.07, 0.2], [0.22, 0.12, 0.08], [0.36, 0.06, 0.16]]) rect(x0, 0.55 - hgt, x0 + w, 0.55, 0.5)
    fill(0.2)
    ctx.beginPath()
    ctx.ellipse(0.84, 0.92, 0.36, 0.5, -0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = tone(0.29)
    ctx.lineWidth = 0.014
    for (let i = 1; i <= 5; i++) {
      ctx.beginPath()
      ctx.ellipse(0.8, 0.86, 0.05 * i, 0.075 * i, -0.5, Math.PI * 0.9, Math.PI * 1.95)
      ctx.stroke()
    }
    fill(0.32)
    ctx.beginPath()
    ctx.ellipse(0.74, 0.66, 0.1, 0.07, -0.5, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  if (which === 22) {
    // A curve: a long bright edge sweeping round in the dark (it will be the piano's), and its echoes in the lacquer.
    rect(0, 0, 1, 1, 0.16)
    strokeLine([[0.05, 0.75], [0.3, 0.74], [0.5, 0.62], [0.6, 0.4], [0.74, 0.22], [0.98, 0.17]], 0.26, 0.02)
    strokeLine([[0.05, 0.85], [0.3, 0.84], [0.52, 0.72], [0.62, 0.48], [0.76, 0.3], [0.98, 0.26]], 0.92, 0.07)
    strokeLine([[0.05, 0.95], [0.3, 0.94], [0.56, 0.84], [0.7, 0.6], [0.82, 0.44], [0.98, 0.42]], 0.4, 0.03)
    strokeLine([[0.4, 1], [0.66, 0.78], [0.84, 0.6], [1, 0.55]], 0.27, 0.018)
    return
  }
  if (which === 20) {
    // Mountains under a pale sky: a far range behind, snow down the near one's gullies, a streak of cloud.
    rect(0, 0, 1, 1, 0.82)
    rect(0.1, 0.16, 0.45, 0.185, 0.93)
    rect(0.55, 0.1, 0.92, 0.12, 0.92)
    poly([[0, 0.66], [0.12, 0.5], [0.3, 0.57], [0.46, 0.36], [0.7, 0.45], [0.9, 0.34], [1, 0.4], [1, 0.8], [0, 0.8]], 0.55)
    fill(0.3)
    ctx.beginPath()
    ctx.moveTo(0, 1)
    ctx.lineTo(0, 0.7)
    ctx.lineTo(0.22, 0.42)
    ctx.lineTo(0.38, 0.6)
    ctx.lineTo(0.6, 0.22)
    ctx.lineTo(0.84, 0.58)
    ctx.lineTo(1, 0.5)
    ctx.lineTo(1, 1)
    ctx.fill()
    fill(0.95)
    ctx.beginPath()
    ctx.moveTo(0.6, 0.22)
    ctx.lineTo(0.66, 0.31)
    ctx.lineTo(0.55, 0.3)
    ctx.fill()
    for (const [x, y, dx, dy] of [[0.58, 0.32, -0.04, 0.16], [0.63, 0.33, 0.05, 0.14], [0.22, 0.45, 0.03, 0.12], [0.8, 0.53, 0.03, 0.1]]) strokeLine([[x, y], [x + dx, y + dy]], 0.72, 0.016)
    rect(0, 0.9, 1, 1, 0.22)
    return
  }
  if (which === 26) {
    // An open door onto a bright day: a dark room, a pale doorway, its light thrown across the floorboards, a chair.
    rect(0, 0, 1, 1, 0.22)
    rect(0.36, 0.11, 0.72, 1, 0.12)
    rect(0.4, 0.15, 0.68, 1, 0.92)
    rect(0.4, 0.82, 0.68, 1, 0.7)
    poly([[0.4, 1], [0.68, 1], [0.86, 1.2], [0.2, 1.2]], 0.5)
    for (const x of [0.06, 0.18, 0.3, 0.78, 0.9]) strokeLine([[x, 0.8], [x + (x - 0.54) * 0.6, 1]], 0.3, 0.012)
    poly([[0.12, 0.62], [0.16, 0.62], [0.16, 0.76], [0.26, 0.76], [0.26, 0.9], [0.24, 0.9], [0.24, 0.8], [0.14, 0.8], [0.14, 0.9], [0.12, 0.9]], 0.1)
    return
  }
  // 27: a street of tall fronts, light at the far end: their windows, a lamp, the road's line going away.
  rect(0, 0, 1, 1, 0.75)
  rect(0, 0, 0.3, 1, 0.3)
  rect(0.72, 0, 1, 1, 0.38)
  rect(0, 0.8, 1, 1, 0.5)
  fill(0.44)
  for (let r = 0; r < 5; r++) for (let c = 0; c < 2; c++) ctx.fillRect(0.04 + c * 0.13, 0.08 + r * 0.14, 0.07, 0.08)
  fill(0.52)
  for (let r = 0; r < 5; r++) for (let c = 0; c < 2; c++) ctx.fillRect(0.76 + c * 0.12, 0.1 + r * 0.14, 0.06, 0.08)
  strokeLine([[0.62, 0.2], [0.62, 0.8]], 0.2, 0.014)
  strokeLine([[0.51, 0.82], [0.48, 1]], 0.88, 0.02)
}

/* ------------------------------------------------------------------ the room */

function shelves(ctx: C2, k: number, light: number, x0: number, x1: number, y0: number, rows: number, seed: number, fall: (x: number, y: number) => number): void {
  const gap = 0.92
  for (let r = 0; r < rows; r++) {
    const y = y0 + r * gap
    // The plank, and the cans and boxes on it, each lit by how near the table it is.
    for (let x = x0; x < x1; ) {
      const w = 0.28 + hash(r, Math.floor(x * 10), seed) * 0.5
      const kind = hash(r, Math.floor(x * 10), seed + 1)
      const lit = light * fall(x + w / 2, y)
      if (kind < 0.62) {
        // A stack of flat cans.
        const n = 2 + Math.floor(hash(r, Math.floor(x * 10), seed + 2) * 5)
        for (let i = 0; i < n; i++) {
          const cy = y - (i + 1) * 0.09
          slab(ctx, k, x, cy, x + w * 0.9, cy + 0.075, mix(R.can, R.canLit, lit))
          rule(ctx, k, x, cy + 0.075, x + w * 0.9, cy + 0.075, rgba(R.dark, 0.6), 0.6)
        }
      } else if (kind < 0.85) {
        // An archive box.
        const h = 0.32 + hash(r, Math.floor(x * 10), seed + 3) * 0.22
        slab(ctx, k, x, y - h, x + w, y, mix(R.shelf, R.canLit, lit * 0.8))
        slab(ctx, k, x + w * 0.3, y - h * 0.62, x + w * 0.7, y - h * 0.46, mix(R.shelf, R.wallLit, lit * 0.9))
      }
      x += w + 0.04 + hash(r, Math.floor(x * 10), seed + 4) * 0.25
    }
    const plankL = light * fall((x0 + x1) / 2, y)
    slab(ctx, k, x0 - 0.1, y, x1 + 0.1, y + 0.06, mix(R.shelf, R.wallLit, plankL))
  }
  // The uprights.
  for (const x of [x0 - 0.12, x1 + 0.06]) slab(ctx, k, x, y0 - 0.9, x + 0.06, y0 + (rows - 1) * gap + 0.9, mix(R.shelf, R.wallLit, light * fall(x, y0 + rows * 0.4) * 0.8))
}

/** The light table's spill on the room: strongest at the glass, gone in a few cells. */
function spillAt(x: number, y: number): number {
  const cx = Math.max(GLASS.x0, Math.min(GLASS.x1, x))
  const d = Math.hypot((x - cx) * 0.9, (y - (GLASS.top + LIP) / 2) * 1.1)
  return Math.exp(-d / 1.7)
}

function drawDoor(ctx: C2, k: number, t: number, light: number, pane_: boolean): void {
  const { x0, x1, top, pane } = DOOR
  if (!pane_) {
    slab(ctx, k, x0, top, x1, FLOOR, mix(R.wall, R.wallLit, light * spillAt(x0, -1) * 0.7))
    slab(ctx, k, x0 + 0.05, top + 0.05, x1 - 0.05, FLOOR, mix('#202427', '#353C40', light * spillAt(x0, -1)), { color: rgba(INK, 0.9), w: 1 })
    slab(ctx, k, x0 + 0.12, -0.25, x0 + 0.28, -0.2, mix(R.metal, R.glass, light * spillAt(x0, 0) * 0.4))
    return
  }
  // The pane: frosted, lit from the corridor; it rattles in its frame when he raps.
  const rattle = RAPS.reduce((s, r) => s + 0.012 * settle(t, r, 14, 0.07), 0)
  const px0 = pane.x0 + rattle
  const px1 = pane.x1 + rattle
  const corridor = 0.5 + 0.12 * ramp(t, OFFICE - 0.5, OFFICE + 0.2)
  const g = ctx.createLinearGradient(0, pane.y0 * k, 0, pane.y1 * k)
  g.addColorStop(0, rgba(mix(R.dark, R.pane, corridor + 0.08), 1))
  g.addColorStop(1, rgba(mix(R.dark, R.pane, corridor - 0.06), 1))
  slab(ctx, k, px0, pane.y0, px1, pane.y1, g)
  // Ted: a hard dark shape against the glass (the beard is enough), two raps, and gone.
  const here = ramp(t, RAPS[0] - 0.75, RAPS[0] - 0.4) * (1 - ramp(t, RAPS[1] + 0.35, RAPS[1] + 0.95))
  if (here > 0.003) {
    const away = ramp(t, RAPS[1] + 0.35, RAPS[1] + 0.95)
    ctx.save()
    ctx.beginPath()
    ctx.rect(px0 * k, pane.y0 * k, (px1 - px0) * k, (pane.y1 - pane.y0) * k)
    ctx.clip()
    const hx = (px0 + px1) / 2 + 0.06 + away * 0.15
    const hy = pane.y0 + 0.62
    const ted = new Path2D()
    // Head, with the beard dropping the jaw into a square chin; then the shoulders.
    ted.ellipse(hx * k, hy * k, 0.19 * k, 0.23 * k, 0, 0, Math.PI * 2)
    ted.moveTo((hx - 0.19) * k, (hy + 0.02) * k)
    ted.lineTo((hx - 0.15) * k, (hy + 0.3) * k)
    ted.quadraticCurveTo(hx * k, (hy + 0.4) * k, (hx + 0.15) * k, (hy + 0.3) * k)
    ted.lineTo((hx + 0.19) * k, (hy + 0.02) * k)
    ted.closePath()
    ted.moveTo((hx - 0.55) * k, (pane.y1 + 0.1) * k)
    ted.quadraticCurveTo((hx - 0.5) * k, (hy + 0.36) * k, hx * k, (hy + 0.34) * k)
    ted.quadraticCurveTo((hx + 0.5) * k, (hy + 0.36) * k, (hx + 0.55) * k, (pane.y1 + 0.1) * k)
    ted.closePath()
    // His arm, raised for the knock and held up between the two raps; the knuckles come to the glass on each.
    const raised = ramp(t, RAPS[0] - 0.35, RAPS[0] - 0.1) * (1 - ramp(t, RAPS[1] + 0.1, RAPS[1] + 0.4))
    const fist = RAPS.reduce((s, r) => Math.max(s, ramp(t, r - 0.2, r - 0.02) * (1 - ramp(t, r + 0.05, r + 0.3))), 0)
    if (raised > 0.01) {
      const fx = hx - 0.42
      const fy = hy + 0.06 + 0.5 * (1 - raised) - 0.05 * fist
      const sh: [number, number] = [hx - 0.36, hy + 0.5]
      ted.moveTo((sh[0] - 0.12) * k, sh[1] * k)
      ted.lineTo((fx - 0.07) * k, (fy + 0.05) * k)
      ted.lineTo((fx + 0.07) * k, (fy + 0.07) * k)
      ted.lineTo((sh[0] + 0.14) * k, (sh[1] - 0.02) * k)
      ted.closePath()
      ted.moveTo((fx + 0.085 + 0.012 * fist) * k, fy * k)
      ted.ellipse(fx * k, fy * k, (0.085 + 0.012 * fist) * k, (0.075 + 0.012 * fist) * k, 0, 0, Math.PI * 2)
    }
    if (away <= 0.01) {
      ctx.fillStyle = rgba('#0E1012', here * 0.95)
      ctx.fill(ted)
    } else {
      // Going, he smears along the frosted glass: the same shape laid four times, spread as he moves off.
      const b = away * 0.16 * k
      ctx.fillStyle = rgba('#0E1012', here * 0.42)
      for (const dx of [-b, -b / 3, b / 3, b]) {
        ctx.save()
        ctx.translate(dx, 0)
        ctx.fill(ted)
        ctx.restore()
      }
    }
    ctx.restore()
  }
  slab(ctx, k, px0, pane.y0, px1, pane.y1, null, { color: rgba(INK, 0.95), w: 1.2 })
}

/**
 * The picture the enlarger throws on the far wall: the water and the ship, out of focus and then in. It is projected
 * light, so it is never quite still: the lamp's flicker in it, a hair and two specks in the gate, and its edges not
 * cut but falling off into the dark as soft light. The defocus is drawn, not filtered: the horizon spread into a
 * band, the ripples gone, the ship laid over itself, spread, until the focus finds it.
 */
function drawPicture(ctx: C2, k: number, t: number): void {
  const on = lampAt(t)
  if (on <= 0) return
  const { x0, x1, y0, y1, horizon } = PICTURE
  const sharp = focusAt(t)
  const blur = 1 - sharp
  const light = on * (0.7 + 0.3 * ramp(t, LAMP, LAMP + 0.5)) * flicker(t, 5, 0.035)
  const tone = positive(light)
  // The soft light past its edges: the throw does not stop at the frame.
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const spill = 0.32
  const edgeA = 0.07 * on
  for (const [ax, ay, bx, by, rx, ry, rw, rh] of [
    [0, y0, 0, y0 - spill, x0, y0 - spill, x1 - x0, spill],
    [0, y1, 0, y1 + spill, x0, y1, x1 - x0, spill],
    [x0, 0, x0 - spill, 0, x0 - spill, y0, spill, y1 - y0],
    [x1, 0, x1 + spill, 0, x1, y0, spill, y1 - y0],
  ] as const) {
    const e = ctx.createLinearGradient(ax * k, ay * k, bx * k, by * k)
    e.addColorStop(0, rgba(R.picSky, edgeA))
    e.addColorStop(1, rgba(R.picSky, 0))
    ctx.fillStyle = e
    ctx.fillRect(rx * k, ry * k, rw * k, rh * k)
  }
  ctx.restore()
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  ctx.clip()
  // Sky and sea in one wash, the horizon a hard line once the focus has it, a wide band before.
  const h = (horizon - y0) / (y1 - y0)
  const spread = 0.004 + 0.09 * blur
  const g = ctx.createLinearGradient(0, y0 * k, 0, y1 * k)
  g.addColorStop(0, tone(0.78))
  g.addColorStop(Math.max(0, h - spread), tone(0.9))
  g.addColorStop(Math.min(1, h + spread), tone(0.56))
  g.addColorStop(1, tone(0.42))
  ctx.fillStyle = g
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  // A low far shore on the left; the ripples, longer near, only once they can be seen.
  ctx.fillStyle = tone(0.5 + 0.12 * blur)
  ctx.beginPath()
  ctx.moveTo(x0 * k, horizon * k)
  ctx.quadraticCurveTo((x0 + 1.4) * k, (horizon - 0.32) * k, (x0 + 3.2) * k, horizon * k)
  ctx.fill()
  if (sharp > 0.5) {
    ctx.globalAlpha = (sharp - 0.5) * 2
    ctx.strokeStyle = tone(0.66)
    for (let i = 0; i < 9; i++) {
      const y = horizon + 0.14 + i * i * 0.022 + i * 0.05
      if (y > y1) break
      const x = x0 + hash(i, 3) * (x1 - x0) * 0.8
      ctx.lineWidth = (0.012 + i * 0.004) * k
      ctx.beginPath()
      ctx.moveTo(x * k, y * k)
      ctx.lineTo((x + 0.6 + i * 0.2) * k, y * k)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }
  // The ship, a trawler on the horizon, and its reflection under it.
  const sx = 2.9
  const ship = new Path2D()
  ship.moveTo((sx - 0.62) * k, (horizon - 0.12) * k)
  ship.lineTo((sx + 0.7) * k, (horizon - 0.12) * k)
  ship.lineTo((sx + 0.55) * k, (horizon + 0.02) * k)
  ship.lineTo((sx - 0.5) * k, (horizon + 0.02) * k)
  ship.closePath()
  ship.rect((sx - 0.25) * k, (horizon - 0.38) * k, 0.38 * k, 0.27 * k)
  ship.rect((sx + 0.02) * k, (horizon - 0.75) * k, 0.04 * k, 0.4 * k)
  ship.rect((sx + 0.42) * k, (horizon - 0.5) * k, 0.03 * k, 0.4 * k)
  const wake = new Path2D()
  for (let i = 0; i < 7; i++) {
    const y = horizon + 0.08 + i * 0.13
    const w = 1.1 - i * 0.12
    const dx = (hash(i, 9) - 0.5) * 0.2
    wake.rect((sx - w / 2 + dx) * k, y * k, w * k, 0.055 * k)
  }
  const b = 0.16 * blur * k
  const copies: [number, number][] = blur > 0.01 ? [[-b, 0], [b, 0], [0, -b * 0.7], [0, b * 0.7], [0, 0]] : [[0, 0]]
  const each = blur > 0.01 ? 0.32 + 0.68 * sharp * sharp : 1
  for (const [dx, dy] of copies) {
    ctx.save()
    ctx.translate(dx, dy)
    ctx.globalAlpha = each
    ctx.fillStyle = tone(0.14 + 0.2 * blur)
    ctx.fill(ship)
    ctx.fillStyle = tone(0.3 + 0.15 * blur)
    ctx.fill(wake)
    ctx.restore()
  }
  // A hair and two specks of dust in the gate, thrown large and soft.
  ctx.strokeStyle = tone(0.3)
  ctx.globalAlpha = 0.35 + 0.3 * sharp
  ctx.lineWidth = 0.025 * k
  ctx.beginPath()
  const hx = x0 + 6.3 + 0.03 * Math.sin(t * 1.3)
  ctx.moveTo(hx * k, (y0 + 0.4) * k)
  ctx.bezierCurveTo((hx + 0.3) * k, (y0 + 0.9) * k, (hx - 0.2) * k, (y0 + 1.2) * k, (hx + 0.15) * k, (y0 + 1.6) * k)
  ctx.stroke()
  ctx.fillStyle = tone(0.28)
  for (const [px, py, r] of [[x0 + 1.1, y1 - 0.7, 0.05], [x0 + 4.6, y0 + 0.5, 0.035]] as const) {
    ctx.beginPath()
    ctx.arc((px + 0.02 * Math.sin(t * 2.1 + px)) * k, py * k, r * k, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.restore()
  // The picture's light on its own edges: the throw's falloff.
  const v = ctx.createRadialGradient(((x0 + x1) / 2) * k, ((y0 + y1) / 2) * k, 0.5 * k, ((x0 + x1) / 2) * k, ((y0 + y1) / 2) * k, ((x1 - x0) * 0.62) * k)
  v.addColorStop(0, rgba(R.dark, 0))
  v.addColorStop(1, rgba(R.dark, 0.32 * on))
  ctx.fillStyle = v
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
}

function drawEnlarger(ctx: C2, k: number, _t: number, light: number): void {
  const E = ENLARGER
  const lit = (x: number, y: number) => light * spillAt(x, y)
  // The baseboard cabinet it stands on, the column, its teeth.
  slab(ctx, k, -2.75, LIP + 0.1, GLASS.x0 - 0.02, FLOOR, mix(R.housing, R.housingLit, lit(-1.6, 0.6) * 0.6), { color: rgba(INK, 0.8), w: 1 })
  slab(ctx, k, -2.85, LIP, GLASS.x0 - 0.02, LIP + 0.1, mix(R.housing, R.housingLit, lit(-1.6, LIP)), { color: rgba(INK, 0.8), w: 1 })
  const colTop = E.head.y0 + 0.05
  slab(ctx, k, E.col - 0.06, colTop, E.col + 0.06, LIP, mix(R.metal, R.glass, lit(E.col, -0.6) * 0.45), { color: rgba(INK, 0.9), w: 1 })
  ctx.strokeStyle = rgba(INK, 0.7)
  ctx.lineWidth = 0.8
  for (let y = LIP - 0.1; y > E.high - 0.05; y -= 0.11) {
    ctx.beginPath()
    ctx.moveTo((E.col + 0.06) * k, y * k)
    ctx.lineTo((E.col + 0.1) * k, (y - 0.04) * k)
    ctx.stroke()
  }
}

/** The enlarger's head, over the picture it throws: the lamp house and its vents, the bellows, the lens, the focus knob. */
function drawHead(ctx: C2, k: number, t: number, light: number): void {
  const E = ENLARGER
  const h = E.head
  slab(ctx, k, h.x0, h.y0, h.x1, h.y1, mix(R.housing, R.housingLit, 0.25 + 0.2 * light), { color: rgba(INK, 0.95), w: 1.1 })
  for (let i = 0; i < 4; i++) {
    const y = h.y0 + 0.16 + i * 0.13
    slab(ctx, k, h.x0 + 0.18, y, h.x1 - 0.42, y + 0.05, rgba(R.dark, 0.8))
  }
  // Bellows to the lens, pointing at the wall.
  const bx0 = h.x1
  const bx1 = E.lens[0] - 0.08
  ctx.fillStyle = mix('#1A1D1F', '#2E3438', 0.5)
  ctx.beginPath()
  ctx.moveTo(bx0 * k, (h.y0 + 0.2) * k)
  ctx.lineTo(bx1 * k, (E.lens[1] - 0.13) * k)
  ctx.lineTo(bx1 * k, (E.lens[1] + 0.13) * k)
  ctx.lineTo(bx0 * k, (h.y1 - 0.1) * k)
  ctx.fill()
  slab(ctx, k, bx1, E.lens[1] - 0.12, E.lens[0] + 0.06, E.lens[1] + 0.12, mix(R.metal, R.glass, 0.15), { color: rgba(INK, 0.95), w: 1 })
  // The focus knob turns as the picture comes sharp.
  const turn = (t < LAMP ? 0 : ramp(t, LAMP + 0.2, FOCUS)) * Math.PI * 1.5
  const kx = h.x1 - 0.22
  const ky = h.y1 + 0.18
  slab(ctx, k, kx - 0.08, ky - 0.06, kx + 0.08, ky + 0.06, mix(R.metal, R.glass, 0.12), { color: rgba(INK, 0.9), w: 1 })
  rule(ctx, k, kx, ky, kx + Math.cos(turn) * 0.09, ky + Math.sin(turn) * 0.09, INK, 1)
}

/** The enlarger's own light, once its lamp is on: at its vents and its lens. */
function enlargerLight(ctx: C2, k: number, t: number): void {
  const on = lampAt(t)
  if (on <= 0) return
  const E = ENLARGER
  const h = E.head
  for (let i = 0; i < 4; i++) {
    const y = h.y0 + 0.16 + i * 0.13
    slab(ctx, k, h.x0 + 0.18, y, h.x1 - 0.42, y + 0.05, rgba(R.tube, 0.35 + 0.6 * on))
  }
  pool(ctx, k, (h.x0 + h.x1) / 2, h.y0 + 0.3, 1.0, R.tube, 0.18 * on, 0.7)
  pool(ctx, k, E.lens[0] + 0.06, E.lens[1], 0.35, R.tube, 0.7 * on)
}

/**
 * The dark over the room: all but the table's neighbourhood falls away into it, and before the tubes strike, all.
 * The eye opens to the room faster than the tubes come up (the room's own colours already follow them), so the dark
 * lifts on an eased curve of their light.
 */
function darkness(ctx: C2, k: number, f: { x0: number; y0: number; x1: number; y1: number }, tubes: number): void {
  const light = 1 - (1 - tubes) * (1 - tubes)
  const cx = (GLASS.x0 + GLASS.x1) / 2
  // Centred a little over the glass: tilted up at the room, it lights what is above it more than what is under it.
  const cy = GLASS.top - 0.25
  ctx.save()
  ctx.translate(cx * k, cy * k)
  ctx.scale(2.1, 1)
  const r = 4.2 * k
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
  const near = 1 - 0.95 * light
  const far = 1 - 0.3 * light
  g.addColorStop(0, rgba(R.dark, near))
  g.addColorStop(0.45, rgba(R.dark, near + (far - near) * 0.35))
  g.addColorStop(1, rgba(R.dark, far))
  ctx.fillStyle = g
  ctx.fillRect(-r, -r, 2 * r, 2 * r)
  ctx.restore()
  // Past the gradient's reach, the far dark.
  ctx.fillStyle = rgba(R.dark, 1 - 0.3 * light)
  const ex0 = cx - 4.2 * 2.1
  const ex1 = cx + 4.2 * 2.1
  if (f.x0 - 1 < ex0) ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (ex0 - f.x0 + 1) * k, (f.y1 - f.y0 + 2) * k)
  if (f.x1 + 1 > ex1) ctx.fillRect(ex1 * k, (f.y0 - 1) * k, (f.x1 + 1 - ex1) * k, (f.y1 - f.y0 + 2) * k)
  if (f.y0 - 1 < cy - 4.2) ctx.fillRect(ex0 * k, (f.y0 - 1) * k, (ex1 - ex0) * k, (cy - 4.2 - f.y0 + 1) * k)
  if (f.y1 + 1 > cy + 4.2) ctx.fillRect(ex0 * k, (cy + 4.2) * k, (ex1 - ex0) * k, (f.y1 + 1 - cy - 4.2) * k)
}

/** The tray on its carriage, at its height: behind the ball (its floor and arm). Its front lip is drawn over him. */
function drawTray(ctx: C2, k: number, t: number, light: number, front: boolean): void {
  const E = ENLARGER
  const y = trayTop(t)
  const lit = light * spillAt(TRAY_X, y)
  const col = mix(R.metal, R.glass, 0.1 + lit * 0.4)
  if (!front) {
    // The carriage on the column, its pawl kicking at each tooth.
    slab(ctx, k, E.col - 0.1, y - 0.12, E.col + 0.14, y + 0.16, mix(R.housing, R.housingLit, 0.3 + lit * 0.5), { color: rgba(INK, 0.9), w: 1 })
    const kick = RATCHET.reduce((s, r) => s + knock(t, r, 0.08), 0) + knock(t, LIFT.to, 0.1)
    rule(ctx, k, E.col + 0.14, y - 0.06, E.col + 0.22, y - 0.06 - 0.05 * Math.min(1, kick), INK, 1.2)
    slab(ctx, k, E.col + 0.14, y + 0.02, E.tray.x0, y + 0.08, col)
    slab(ctx, k, E.tray.x0, y, E.tray.x1, y + 0.07, col, { color: rgba(INK, 0.9), w: 1 })
    return
  }
  // The tray's low front rail, in front of the ball.
  slab(ctx, k, E.tray.x0, y - 0.05, E.tray.x1, y + 0.02, rgba(mix(R.dark, mix(R.metal, R.glass, lit * 0.3), Math.max(light, lampAt(t)) * 0.8 + 0.1), 0.9))
}

/**
 * The housing's face: its panels and their screws, the louvres the tubes' light leaks through (their hum is in it),
 * the maker's plate (no lettering), the switch with its pilot lamp, and the flex down to the floor.
 */
function housing(ctx: C2, k: number, light: number, t: number): void {
  const x0 = GLASS.x0 + 0.1
  const x1 = GLASS.x1 - 0.1
  const panels = 4
  const w = (x1 - x0) / panels
  const seams = new Path2D()
  const screws = new Path2D()
  const gaps = new Path2D()
  const lips = new Path2D()
  for (let i = 0; i < panels; i++) {
    const a = x0 + i * w
    if (i > 0) seams.rect((a - 0.006) * k, (LIP + 0.14) * k, 0.012 * k, (0.92 - LIP - 0.18) * k)
    for (const [sx, sy] of [[a + 0.09, LIP + 0.2], [a + w - 0.09, LIP + 0.2], [a + 0.09, 0.84], [a + w - 0.09, 0.84]]) {
      screws.moveTo((sx + 0.016) * k, sy * k)
      screws.arc(sx * k, sy * k, 0.016 * k, 0, Math.PI * 2)
    }
    // The panel's louvres, the whole of its face: a slit and the lip of the slat under it, row on row.
    const l0 = a + (i === 0 ? 0.52 : 0.07)
    const l1 = a + w - (i === panels - 1 ? 0.92 : 0.07)
    for (let y = LIP + 0.17; y < 0.86; y += 0.068) {
      gaps.rect(l0 * k, y * k, (l1 - l0) * k, 0.026 * k)
      lips.rect(l0 * k, (y + 0.026) * k, (l1 - l0) * k, 0.012 * k)
    }
  }
  ctx.fillStyle = rgba(INK, 0.55)
  ctx.fill(seams)
  ctx.fillStyle = mix('#1E2225', '#57605F', light * 0.6)
  ctx.fill(screws)
  ctx.fillStyle = '#0F1214'
  ctx.fill(gaps)
  ctx.fillStyle = mix('#23282B', '#4E5658', light * 0.7)
  ctx.fill(lips)
  void t
  // The maker's plate and the switch with its pilot lamp, at the near end.
  slab(ctx, k, x1 - 0.85, 0.64, x1 - 0.4, 0.74, mix('#22262A', '#4A4C48', light * 0.6), { color: rgba(INK, 0.8), w: 0.8 })
  slab(ctx, k, x0 + 0.25, 0.6, x0 + 0.45, 0.78, mix('#1C2023', '#3F474B', light * 0.6), { color: rgba(INK, 0.9), w: 0.8 })
  pool(ctx, k, x0 + 0.35, 0.65, 0.07, '#F2B866', 0.6 * ramp(light, 0.05, 0.3), 1)
  slab(ctx, k, x0 + 0.33, 0.63, x0 + 0.37, 0.67, mix('#2A2622', '#F6C47A', ramp(light, 0.05, 0.3)))
  // The flex, from the switch's box down over the housing's edge to the floor.
  ctx.strokeStyle = mix('#0E1112', '#262B2D', light * 0.6)
  ctx.lineWidth = Math.max(1, 0.03 * k)
  ctx.beginPath()
  ctx.moveTo((x0 + 0.35) * k, 0.78 * k)
  ctx.bezierCurveTo((x0 + 0.35) * k, 1.2 * k, (x0 - 0.15) * k, 1.4 * k, (x0 - 0.45) * k, FLOOR * k)
  ctx.stroke()
}

/**
 * The tubes' light through the housing's louvres: drawn over the room's dark, since it is the tubes themselves
 * seen through the slits, so it strikes and stutters with them and hums a little once they have caught.
 */
function louvreLight(ctx: C2, k: number, t: number, light: number): void {
  if (light <= 0.01) return
  const x0 = GLASS.x0 + 0.1
  const x1 = GLASS.x1 - 0.1
  const panels = 4
  const w = (x1 - x0) / panels
  const slits = new Path2D()
  for (let i = 0; i < panels; i++) {
    const a = x0 + i * w
    const l0 = a + (i === 0 ? 0.52 : 0.07)
    const l1 = a + w - (i === panels - 1 ? 0.92 : 0.07)
    for (let y = LIP + 0.17, row = 0; y < 0.86; y += 0.068, row++) slits.rect(l0 * k, (y + 0.006) * k, (l1 - l0) * k, 0.014 * k)
  }
  const hum = 1 - 0.08 * (0.5 + 0.5 * Math.sin(t * 7.3) * Math.sin(t * 2.9 + 1))
  ctx.fillStyle = rgba('#8C8270', clamp01(0.55 * light * hum))
  ctx.fill(slits)
}

function drawTable(ctx: C2, k: number, light: number, t: number): void {
  // The housing under the glass, its legs; the bench on to the right, and its legs.
  const face = ctx.createLinearGradient(0, (LIP + 0.1) * k, 0, 0.92 * k)
  face.addColorStop(0, mix(R.housing, R.housingLit, light * 0.6))
  face.addColorStop(1, mix(R.dark, R.housing, 0.6))
  slab(ctx, k, GLASS.x0 - 0.05, LIP + 0.1, GLASS.x1 + 0.05, 0.92, face, { color: rgba(INK, 0.9), w: 1 })
  rule(ctx, k, GLASS.x0 + 0.1, 0.5, GLASS.x1 - 0.1, 0.5, rgba(INK, 0.6), 0.8)
  housing(ctx, k, light, t)
  for (const x of [GLASS.x0 + 0.15, GLASS.x1 - 0.3]) slab(ctx, k, x, 0.92, x + 0.12, FLOOR, mix(R.housing, R.housingLit, light * 0.15))
  slab(ctx, k, BENCH.x0, BENCH.top, BENCH.x1, BENCH.top + 0.14, mix(R.wood, '#4D473F', light * spillAt(BENCH.x0 + 1, 0) * 0.8), { color: rgba(INK, 0.9), w: 1 })
  for (const x of [BENCH.x0 + 1.6, BENCH.x1 - 0.5]) slab(ctx, k, x, BENCH.top + 0.14, x + 0.12, FLOOR, mix(R.wood, '#3E3933', light * spillAt(x, 1) * 0.5))
}

function drawGlass(ctx: C2, k: number, t: number, light: number): void {
  // The glass: the light itself.
  const glass = mix(R.dark, R.glass, light)
  slab(ctx, k, GLASS.x0, GLASS.top, GLASS.x1, LIP, glass)
  // The housing's rim round the glass, and the rail the loupe runs on.
  slab(ctx, k, GLASS.x0 - 0.05, GLASS.top - 0.08, GLASS.x1 + 0.05, GLASS.top, mix(R.dark, R.housingLit, light * 0.8), { color: rgba(INK, 0.9), w: 1 })
  // The strip: the film's base, its sprocket holes letting the light through.
  const base = mix(R.dark, R.base, light)
  ctx.fillStyle = base
  ctx.fillRect(STRIP.x0 * k, STRIP.top * k, (GAP_X - 0.5 - STRIP.x0) * k, (STRIP.bot - STRIP.top) * k)
  ctx.fillRect((GAP_X + 0.5) * k, STRIP.top * k, (STRIP.x1 - GAP_X - 0.5) * k, (STRIP.bot - STRIP.top) * k)
  const holes = new Path2D()
  for (let x = STRIP.x0 + 0.06; x < STRIP.x1 - 0.05; x += 0.125) {
    if (x > GAP_X - 0.5 - 0.02 && x < GAP_X + 0.5) continue
    for (const y of [STRIP.top + 0.06, STRIP.imgBot + 0.06]) holes.roundRect(x * k, y * k, 0.07 * k, 0.07 * k, 0.015 * k)
  }
  ctx.fillStyle = mix(R.dark, R.glass, light * 0.85)
  ctx.fill(holes)
  // The frames, each lit by the glass and more as he lands on it.
  for (const n of FRAMES) {
    const cx = frameX(n)
    const b = light * (0.42 + 0.58 * frameLight(n, t))
    ctx.save()
    ctx.translate((cx - IMG_W / 2) * k, STRIP.imgTop * k)
    ctx.scale(IMG_W * k, (STRIP.imgBot - STRIP.imgTop) * k)
    ctx.beginPath()
    ctx.rect(0, 0, 1, 1)
    ctx.clip()
    picture(ctx, n, negative(b))
    ctx.restore()
  }
  // The blank where frame 25 should be: the glass alone, and brighter as he stares into it.
  const blank = blankAt(t)
  const white = mix(R.dark, mix(R.glass, '#FFFFFF', blank), Math.min(1, light * (1 + 0.25 * blank)))
  slab(ctx, k, GAP_X - 0.5, STRIP.top, GAP_X + 0.5, LIP, white)
  rule(ctx, k, GAP_X - 0.5, STRIP.top, GAP_X - 0.5, LIP, rgba(INK, 0.5), 0.8)
  rule(ctx, k, GAP_X + 0.5, STRIP.top, GAP_X + 0.5, LIP, rgba(INK, 0.5), 0.8)
  if (blank > 0) pool(ctx, k, GAP_X, (STRIP.top + LIP) / 2, 0.6 + 1.6 * blank, '#FFFFFF', 0.5 * blank * light)
  // What an editor leaves on a light table: tape holding the strip's ends down, and grease-pencil ticks over the
  // frames that matter (graphite; a cross over the one that is missing).
  if (light > 0.02) {
    ctx.fillStyle = rgba('#CFC5A8', 0.3 * light)
    for (const [tx0, tx1] of [[STRIP.x0 - 0.12, STRIP.x0 + 0.05], [STRIP.x1 - 0.05, STRIP.x1 + 0.12]]) {
      ctx.fillRect(tx0 * k, (STRIP.top + 0.16) * k, (tx1 - tx0) * k, 0.5 * k)
    }
    const marks = new Path2D()
    for (const n of [21, 24]) {
      marks.moveTo((frameX(n) - 0.03) * k, (GLASS.top + 0.03) * k)
      marks.lineTo((frameX(n) + 0.02) * k, (STRIP.top - 0.02) * k)
    }
    for (const d of [-1, 1]) {
      marks.moveTo((GAP_X - 0.05) * k, (GLASS.top + 0.03) * k)
      marks.lineTo((GAP_X + 0.05) * k, (STRIP.top - 0.02) * k)
      marks.moveTo((GAP_X + 0.05 * d) * k, (GLASS.top + 0.03) * k)
      marks.lineTo((GAP_X - 0.05 * d) * k, (STRIP.top - 0.02) * k)
    }
    ctx.strokeStyle = rgba('#3B3D3C', 0.55 * light)
    ctx.lineWidth = Math.max(1, 0.016 * k)
    ctx.lineCap = 'round'
    ctx.stroke(marks)
  }
  // The lip the balls roll on, with the notch under the blank.
  ctx.fillStyle = mix(R.dark, '#4E575D', light)
  ctx.beginPath()
  ctx.moveTo((GLASS.x0 - 0.05) * k, (LIP + 0.11) * k)
  for (let x = GLASS.x0 - 0.05; x <= GLASS.x1 + 0.05001; x += 0.02) ctx.lineTo(x * k, (LIP + lipY(x)) * k)
  ctx.lineTo((GLASS.x1 + 0.05) * k, (LIP + 0.11) * k)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = rgba(INK, 0.95)
  ctx.lineWidth = 1
  ctx.stroke()
  void NOTCH
}

function drawLoupe(ctx: C2, k: number, t: number, light: number, magnify: boolean): void {
  const x = loupeX(t)
  const moving = Math.abs(loupeX(t + 0.03) - loupeX(t - 0.03)) > 0.004
  const lift = moving ? 0.035 : 0
  const y = LOUPE.y - lift
  const r = LOUPE.r
  const click = LOUPE_CLICKS.reduce((s, c) => s + knock(t, c, 0.1), 0)
  // The rail on the glass's rim, and the carriage's arm down to the ring.
  rule(ctx, k, x, LOUPE.rail, x, y - r, rgba(mix(R.metal, R.glass, light * 0.3), 0.9), 1.6)
  slab(ctx, k, x - 0.12, LOUPE.rail - 0.06, x + 0.12, LOUPE.rail + 0.03, mix(R.housing, R.housingLit, 0.5 + light * 0.3), { color: rgba(INK, 0.9), w: 1 })
  if (!magnify) {
    // Parked: only the ring, over frame 27.
  } else {
    // What it sees: the frame under it, magnified (21, the ship, the closest).
    const n = Math.round(x + 0.5) + 20
    const which = n === BLANK ? -1 : n
    const zoom = which === 21 ? 2.4 : 1.8
    ctx.save()
    ctx.beginPath()
    ctx.arc(x * k, y * k, r * k, 0, Math.PI * 2)
    ctx.clip()
    const b = light * (0.5 + 0.5 * frameLight(Math.max(20, Math.min(27, n)), t))
    if (which < 0 || !FRAMES.includes(which)) {
      ctx.fillStyle = mix(R.dark, '#FFFFFF', light)
      ctx.fillRect((x - r) * k, (y - r) * k, 2 * r * k, 2 * r * k)
    } else {
      const fx = frameX(which)
      const w = IMG_W * zoom
      const h = (STRIP.imgBot - STRIP.imgTop) * zoom
      // The magnified frame, centred on the ring, its own middle (the ship's middle, for 21) under the glass.
      const ax = which === 21 ? 0.62 : 0.5
      const ay = which === 21 ? 0.36 : 0.5
      ctx.translate((x - (x - fx) * zoom - w * ax) * k, (y - h * ay) * k)
      ctx.scale(w * k, h * k)
      picture(ctx, which, negative(b))
    }
    ctx.restore()
  }
  // The ring's glint and its rim; a flash round it as it clicks down.
  ctx.strokeStyle = rgba(INK, 1)
  ctx.lineWidth = Math.max(1.6, 0.05 * k)
  ctx.beginPath()
  ctx.arc(x * k, y * k, r * k, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = rgba('#FFFFFF', (0.25 + 0.5 * Math.min(1, click)) * light)
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.arc(x * k, y * k, (r - 0.04) * k, -2.4, -1.3)
  ctx.stroke()
  if (lift > 0) pool(ctx, k, x + 0.04, y + 0.06, r * 1.1, R.dark, 0.25 * light)
}

/* ------------------------------------------------------------------ the set */

export function drawRoom(p: p5, k: number, t: number): void {
  const ctx = p.drawingContext as C2
  const f = frame(p, k)
  const light = tubeAt(t)
  ctx.save()
  // The dark, and the archive going back into it behind the table (`archive.ts`), lit by the table's spill.
  ctx.fillStyle = R.dark
  ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
  const v = view(p, k)
  drawArchive(ctx, v, t, light)
  // The floor, just there.
  slab(ctx, k, f.x0 - 1, FLOOR, f.x1 + 1, f.y1 + 1, rgba('#0D0F11', 1))
  pool(ctx, k, (GLASS.x0 + GLASS.x1) / 2, FLOOR, 5, R.wallLit, 0.12 * light, 0.12)
  // Shelves going into the dark: behind the enlarger, behind and past the door, and high over the picture's wall.
  const fall = (x: number, y: number) => spillAt(x, y) * 0.9 + 0.04
  shelves(ctx, k, light, -7.5, -2.95, -3.2, 5, 11, fall)
  shelves(ctx, k, light, 8.7, 13.5, -3.3, 5, 12, fall)
  shelves(ctx, k, light, -1.0, 6.4, -5.5, 1, 13, fall)
  drawDoor(ctx, k, t, light, false)
  drawEnlarger(ctx, k, t, light)
  drawTable(ctx, k, light, t)
  darkness(ctx, k, f, light)
  louvreLight(ctx, k, t, light)
  archiveLights(ctx, v, t, light)
  // What gives light, over the dark: the picture, the corridor through the pane, the lamp, the glass. And what
  // stands in front of the picture, seen by the table's light or the lamp's.
  drawPicture(ctx, k, t)
  ctx.globalAlpha = clamp01(Math.max(light * 0.9, lampAt(t)))
  drawHead(ctx, k, t, light)
  // The shelf on the wall he rolls off along, under the picture.
  slab(ctx, k, SHELF.x0, SHELF.top, SHELF.x1, SHELF.top + 0.08, mix(R.shelf, '#6B767B', light * 0.4), { color: rgba(INK, 0.9), w: 1 })
  for (const x of [SHELF.x0 + 0.6, SHELF.x1 - 0.5]) {
    ctx.fillStyle = mix(R.shelf, R.wallLit, light * 0.3)
    ctx.beginPath()
    ctx.moveTo(x * k, (SHELF.top + 0.08) * k)
    ctx.lineTo((x + 0.22) * k, (SHELF.top + 0.08) * k)
    ctx.lineTo(x * k, (SHELF.top + 0.3) * k)
    ctx.fill()
  }
  drawTray(ctx, k, t, light, false)
  ctx.globalAlpha = 1
  drawDoor(ctx, k, t, light, true)
  enlargerLight(ctx, k, t)
  drawGlass(ctx, k, t, light)
  drawLoupe(ctx, k, t, light, t >= OFFICE)
  ctx.restore()
}

/** Over the balls: the light from the glass on them from below, strongest in the blank; the tray's front rail. */
export function drawRoomOver(p: p5, k: number, t: number): void {
  const ctx = p.drawingContext as C2
  const light = tubeAt(t)
  ctx.save()
  const [wx, wy] = walterAt(Math.min(t, NUUK))
  const onTable = wy > -0.3
  if (onTable) {
    const inBlank = 1 - clamp01(Math.abs(wx - GAP_X) / 0.5)
    const blank = blankAt(t) * inBlank
    pool(ctx, k, wx, wy + 0.1, 0.2 + 0.12 * blank, '#FFFFFF', light * (0.16 + 0.42 * blank), 0.75)
  }
  if (t >= OFFICE) {
    const [cx, cy] = cherylAt(t)
    pool(ctx, k, cx, cy + 0.1, 0.2, '#FFFFFF', light * 0.14, 0.75)
    void CHERYL
  }
  // In the picture's light, once the lamp is on: he takes its grey on his top.
  if (t >= LAMP && !onTable) pool(ctx, k, wx, wy - 0.08, 0.22, R.picSky, 0.22 * lampAt(t), 0.8)
  drawTray(ctx, k, t, light, true)
  ctx.restore()
}
