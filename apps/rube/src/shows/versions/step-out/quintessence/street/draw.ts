import type p5 from 'p5'
import { frame, hash } from '../kit'
import { LIFE_RED, WALTER } from '../worlds'
import { contact, INK, knock, mix, pool, ramp, rgba, rule, settle, slab } from '../negatives/hand'
import { CELLAR, cherylAt, CLANKS, CORNER, COVER, FLIPS, HAULS, IN, KERB, PAVE, SLOT_W, SLOTS, STAND, STOP, walterAt } from './plan'

/**
 * The street, drawn (the B1 builder's): the negatives room's hand in a pale morning. Flat values and the one
 * graphite line; the only soft thing is the light. Nothing on it is red but the Life box on the one cover.
 */

type C2 = CanvasRenderingContext2D

const S = {
  sky: '#E9ECEA',
  skyLow: '#F3F0E8',
  sun: '#FBF5E6',
  far: '#CFCFC9',
  stone: '#D8D2C5',
  stoneDark: '#C3BCAE',
  brick: '#BFB3A3',
  glass: '#8F989B',
  glassLit: '#B9C2C3',
  pave: '#DEDAD1',
  paveLine: '#C7C2B7',
  kerb: '#CBC6BB',
  road: '#B7B5AE',
  steel: '#8D9091',
  kiosk: '#55635D',
  kioskDark: '#3E4A45',
  shutter: '#8A928C',
  paper: '#F1EEE6',
  photo: '#2F3337',
}

/* ------------------------------------------------------------------ the magazines */

/** The other issues on the stand: muted covers, blocks of tone (nothing on them is lettered, nothing red). */
const COVERS = ['#C9A75E', '#6F8C8A', '#9AA3AE', '#D9D2C2', '#7C7A86', '#B88B6A', '#8FA48B', '#CFC3A0']

function issue(ctx: C2, k: number, x0: number, y0: number, w: number, h: number, n: number): void {
  const c = COVERS[n % COVERS.length]
  slab(ctx, k, x0, y0, x0 + w, y0 + h, c, { color: rgba(INK, 0.85), w: 0.8 })
  // A masthead band and a picture block.
  slab(ctx, k, x0 + w * 0.1, y0 + h * 0.07, x0 + w * 0.9, y0 + h * 0.2, mix(c, INK, 0.35))
  slab(ctx, k, x0 + w * 0.1, y0 + h * 0.3, x0 + w * (0.55 + hash(n, 2) * 0.35), y0 + h * (0.6 + hash(n, 3) * 0.3), mix(c, S.paper, 0.45))
}

/**
 * The last issue of Life: the red box with its white rule, and the photograph: Walter, small and slate, sitting
 * outside the building looking at a contact sheet. The picture is the show's first frame again: the dark, a strip of
 * light, him at its near end.
 */
function life(ctx: C2, k: number, x0: number, y0: number, w: number, h: number): void {
  slab(ctx, k, x0, y0, x0 + w, y0 + h, S.paper, { color: rgba(INK, 0.9), w: 0.9 })
  const px0 = x0 + w * 0.06
  const px1 = x0 + w * 0.94
  const py0 = y0 + h * 0.05
  const py1 = y0 + h * 0.95
  // The photograph: the building's dark front, its pilasters just there.
  slab(ctx, k, px0, py0, px1, py1, S.photo)
  for (let i = 0; i < 4; i++) {
    const x = px0 + (px1 - px0) * (0.12 + i * 0.26)
    slab(ctx, k, x, py0, x + (px1 - px0) * 0.07, py1 - h * 0.28, '#383D41')
  }
  // A step he sits on, and the contact sheet's light on his knees: a strip, lit.
  const sy = py0 + (py1 - py0) * 0.7
  slab(ctx, k, px0, sy + h * 0.06, px1, py1, '#41474B')
  const g = ctx.createLinearGradient(0, (sy - h * 0.035) * k, 0, (sy + h * 0.035) * k)
  g.addColorStop(0, '#EEF3F0')
  g.addColorStop(1, '#CED8D4')
  slab(ctx, k, px0 + (px1 - px0) * 0.32, sy - h * 0.045, px0 + (px1 - px0) * 0.9, sy + h * 0.045, g)
  pool(ctx, k, px0 + (px1 - px0) * 0.6, sy, w * 0.5, '#E4ECE8', 0.4, 0.55)
  ctx.fillStyle = WALTER
  ctx.beginPath()
  ctx.arc((px0 + (px1 - px0) * 0.24) * k, (sy + h * 0.005) * k, w * 0.06 * k, 0, Math.PI * 2)
  ctx.fill()
  // The red box, top left, with its white rule.
  const bx0 = x0 + w * 0.08
  const by0 = y0 + h * 0.07
  const bw = w * 0.36
  const bh = h * 0.17
  slab(ctx, k, bx0, by0, bx0 + bw, by0 + bh, LIFE_RED)
  slab(ctx, k, bx0 + bw * 0.1, by0 + bh * 0.14, bx0 + bw * 0.9, by0 + bh * 0.86, null, { color: '#FFFFFF', w: Math.max(1, 0.012 * k) })
}

/** The shutter's bottom edge at `t`: down, then up in two hauls, the second to the top, latched. */
function shutterAt(t: number): number {
  const { open } = STAND
  const half = open.top + (PAVE - open.top) * 0.48
  const haul = (from: number, to: number, a: number) => from + (to - from) * ramp(t, a - 0.22, a) + 0.05 * settle(t, a, 5, 0.12)
  if (t < HAULS[1] - 0.22) return haul(PAVE, half, HAULS[0])
  return haul(half, open.top, HAULS[1])
}

/** An issue's flip down onto the rack: 0 folded up, 1 down; it slaps and settles. Life settles again on the chord. */
function flipAt(i: number, t: number): number {
  const a = FLIPS[i]
  const down = ramp(t, a - 0.16, a)
  return down + (t > a ? 0.06 * settle(t, a, 4, 0.18) : 0) + (i === 1 && t > STOP ? 0.03 * settle(t, STOP, 3, 0.3) : 0)
}

function drawStand(ctx: C2, k: number, t: number): void {
  const { x0, x1, roof, eave, open } = STAND
  // Its shadow on the pavement, long to the right in the morning.
  ctx.fillStyle = rgba(INK, 0.07)
  ctx.beginPath()
  ctx.moveTo(x1 * k, PAVE * k)
  ctx.lineTo((x1 + 1.6) * k, (PAVE + 0.32) * k)
  ctx.lineTo((x0 + 1.2) * k, (PAVE + 0.32) * k)
  ctx.lineTo(x0 * k, PAVE * k)
  ctx.fill()
  slab(ctx, k, x0, roof, x1, PAVE, S.kiosk, { color: INK, w: 1 })
  slab(ctx, k, x0 - 0.18, eave, x1 + 0.18, roof, S.kioskDark, { color: INK, w: 1 })
  // Inside: dark, the back racks of issues, the front rack's ledge and its three slots.
  slab(ctx, k, open.x0, open.top, open.x1, PAVE - 0.05, '#2C3330')
  for (let r = 0; r < 1; r++) {
    for (let i = 0; i < 5; i++) {
      const w = 0.42
      const x = open.x0 + 0.12 + i * 0.5
      const y = open.top + 0.12 + r * 0.55
      issue(ctx, k, x, y, w, 0.5, i * 3 + r * 7 + 1)
      slab(ctx, k, x, y, x + w, y + 0.5, rgba('#2C3330', 0.35))
    }
  }
  slab(ctx, k, open.x0, -0.36, open.x1, -0.28, S.kioskDark, { color: INK, w: 0.8 })
  // The front rack: a wire across, three issues hung on it, flipped down from folded as he puts them out.
  rule(ctx, k, open.x0 + 0.05, -1.58, open.x1 - 0.05, -1.58, INK, 1.1)
  SLOTS.forEach((sx, i) => {
    const f = Math.max(0, flipAt(i, t))
    const h = COVER.y1 - COVER.y0
    if (f <= 0.01) {
      slab(ctx, k, sx, COVER.y0 - 0.02, sx + SLOT_W, COVER.y0 + 0.04, S.paper, { color: rgba(INK, 0.7), w: 0.8 })
      return
    }
    ctx.save()
    ctx.translate(0, COVER.y0 * k)
    ctx.scale(1, f)
    ctx.translate(0, -COVER.y0 * k)
    if (i === 1) life(ctx, k, sx, COVER.y0, SLOT_W, h)
    else issue(ctx, k, sx, COVER.y0, SLOT_W, h, i === 0 ? 0 : 5)
    ctx.restore()
    // The clothes-peg holding it.
    slab(ctx, k, sx + SLOT_W / 2 - 0.03, COVER.y0 - 0.1, sx + SLOT_W / 2 + 0.03, COVER.y0 + 0.06, '#A89C86', { color: INK, w: 0.8 })
  })
  // The shutter, rolled up to its drum.
  const bottom = shutterAt(t)
  if (bottom > open.top + 0.01) {
    slab(ctx, k, open.x0, open.top, open.x1, bottom, S.shutter, { color: INK, w: 1 })
    ctx.strokeStyle = rgba(INK, 0.35)
    ctx.lineWidth = 0.8
    for (let y = bottom - 0.09; y > open.top; y -= 0.09) {
      ctx.beginPath()
      ctx.moveTo(open.x0 * k, y * k)
      ctx.lineTo(open.x1 * k, y * k)
      ctx.stroke()
    }
    slab(ctx, k, open.x0 + 1.2, bottom - 0.08, open.x0 + 1.45, bottom, S.steel, { color: INK, w: 0.8 })
  }
  slab(ctx, k, open.x0 - 0.04, open.top - 0.16, open.x1 + 0.04, open.top, S.kioskDark, { color: INK, w: 1 })
}

/* ------------------------------------------------------------------ the set */

function building(ctx: C2, k: number, x0: number, x1: number, top: number, fill: string, seed: number, cols: number): void {
  slab(ctx, k, x0, top, x1, PAVE, fill, { color: rgba(INK, 0.8), w: 0.9 })
  slab(ctx, k, x0 - 0.1, top - 0.14, x1 + 0.1, top, mix(fill, S.paper, 0.35), { color: rgba(INK, 0.8), w: 0.9 })
  const w = (x1 - x0) / cols
  for (let y = top + 0.7; y < PAVE - 1.4; y += 1.25) {
    for (let i = 0; i < cols; i++) {
      const wx = x0 + i * w + w * 0.28
      const lit = hash(i, Math.round(y * 10), seed) > 0.8
      slab(ctx, k, wx, y, wx + w * 0.44, y + 0.72, lit ? S.glassLit : S.glass, { color: rgba(INK, 0.7), w: 0.8 })
      rule(ctx, k, wx, y + 0.36, wx + w * 0.44, y + 0.36, rgba(INK, 0.35), 0.8)
    }
  }
}

export function drawStreet(p: p5, k: number, t: number): void {
  const ctx = p.drawingContext as C2
  const f = frame(p, k)
  ctx.save()
  // The sky: pale, a little warmer low down, the sun's haze up at the left.
  const g = ctx.createLinearGradient(0, -12 * k, 0, 0)
  g.addColorStop(0, S.sky)
  g.addColorStop(1, S.skyLow)
  ctx.fillStyle = g
  ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
  pool(ctx, k, -6, -9, 9, S.sun, 0.7, 0.8)
  // Far: the avenue's towers across it, in the haze, past the corner.
  slab(ctx, k, 15.6, -9.5, 18.4, PAVE, S.far)
  slab(ctx, k, 18.9, -7.2, 23, PAVE, mix(S.far, S.sky, 0.3))
  // The fronts along the street: a tall stone one behind the stand, a low one in the middle (the sky over it is
  // where the credits come), the corner's.
  building(ctx, k, -9, 3.6, -9.2, S.stone, 1, 7)
  building(ctx, k, 3.6, 8.6, -5.6, S.brick, 2, 3)
  building(ctx, k, 8.6, 12.6, -4.3, S.stoneDark, 3, 3)
  building(ctx, k, 12.6, CORNER.kerb, -7.6, S.stone, 4, 1)
  // Doors at the street: a dark doorway in each front.
  for (const [dx, w] of [[-3.2, 0.9], [1.6, 0.8], [10.2, 0.9]] as [number, number][]) slab(ctx, k, dx, PAVE - 1.45, dx + w, PAVE, '#6A6E6C', { color: INK, w: 0.9 })
  // The pavement, its slabs; the kerb; the road.
  slab(ctx, k, f.x0 - 1, PAVE, CORNER.kerb, KERB, S.pave)
  for (let x = Math.floor(f.x0) - 1.25; x < CORNER.kerb; x += 1.5) rule(ctx, k, x, PAVE, x - 0.12, KERB, S.paveLine, 0.9)
  rule(ctx, k, f.x0 - 1, PAVE, CORNER.kerb, PAVE, rgba(INK, 0.8), 0.9)
  slab(ctx, k, f.x0 - 1, KERB, CORNER.kerb, KERB + 0.1, S.kerb, { color: rgba(INK, 0.6), w: 0.8 })
  slab(ctx, k, f.x0 - 1, KERB + 0.1, f.x1 + 1, f.y1 + 1, S.road)
  // The corner: the pavement ends, the avenue's crossing beyond, its stripes.
  slab(ctx, k, CORNER.kerb, PAVE + 0.2, f.x1 + 1, KERB + 0.1, S.road)
  for (let i = 0; i < 6; i++) slab(ctx, k, CORNER.kerb + 0.3 + i * 0.5, PAVE + 0.32, CORNER.kerb + 0.55 + i * 0.5, KERB + 0.06, '#D7D5CF')
  // The cellar doors in the pavement: two plates that clank as he goes over.
  const dip = (a: number) => 0.02 * knock(t, a, 0.06)
  slab(ctx, k, CELLAR.x0 - 0.06, PAVE, CELLAR.x1 + 0.06, PAVE + 0.16, '#7E8282', { color: INK, w: 0.9 })
  for (const [a, b, c] of [[CELLAR.x0, CELLAR.mid, CLANKS[0]], [CELLAR.mid, CELLAR.x1, CLANKS[1]]]) {
    const y = PAVE + dip(c)
    slab(ctx, k, a, y, b, y + 0.1, S.steel, { color: INK, w: 0.9 })
    for (let x = a + 0.08; x < b - 0.04; x += 0.12) rule(ctx, k, x, y + 0.03, x + 0.05, y + 0.07, rgba(INK, 0.4), 0.8)
    // The ring on each plate's handle edge, and the knock's ring of light as it clanks.
    const flash = knock(t, c, 0.12)
    if (flash > 0.01) rule(ctx, k, a, y, b, y, rgba('#FFFFFF', 0.8 * flash), 1.6)
  }
  // A lamp post.
  slab(ctx, k, 2.85, -4.4, 2.95, PAVE, '#5C625F', { color: INK, w: 0.8 })
  slab(ctx, k, 2.7, -4.62, 3.25, -4.4, '#5C625F', { color: INK, w: 0.8 })
  drawStand(ctx, k, t)
  // The balls' shadows on the pavement, soft, from the low sun.
  if (t >= IN) {
    const [wx] = walterAt(t)
    contact(ctx, k, wx + 0.06, PAVE, 0.22)
    {
      const [cx] = cherylAt(t)
      contact(ctx, k, cx + 0.06, PAVE, 0.22)
    }
  }
  ctx.restore()
}
