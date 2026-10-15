import type { Pt } from '../../../../../parts'
import { layer, onLayer, rgbaOf, sway, type View } from '../depth'
import { hash, smooth } from '../kit'
import { FLOOR, OUT } from './geo'

/**
 * The harbour at Nuuk, outside the bar (B's): what is seen past the doors and through the window, on its own planes
 * behind the room so it moves slower than the room as the camera goes. Far off, Sermitsiaq's dark bulk under its snow
 * and the cloud going over it; across the water, the town's houses in their colours (ochre, teal, mustard, blue,
 * white); boats at their moorings bobbing on the swell; the swell itself, slow far off and quicker near; gulls; and
 * the light changing on all of it as the cloud goes over. Drawn straight onto the canvas in the place's cells.
 */

type C2 = CanvasRenderingContext2D

/** Where the camera mostly is in the bar, and how tall its frame: what the planes here are composed against. */
export const BAR_AT: Pt = [1.4, -0.9]
export const BAR_REF = 3.6

const H = {
  sky: '#AEB9BC',
  skyHigh: '#8F9DA3',
  cloud: '#C3CBCC',
  cloudDark: '#99A5AA',
  rock: '#56636A',
  rockFar: '#7D8A8F',
  snow: '#D9DFDF',
  shore: '#4C585E',
  water: '#6F7E84',
  waterFar: '#8C989C',
  crest: '#B4BFC1',
  trough: '#4E5C63',
  roof: '#2F3638',
  hull: '#2C4650',
  hullPale: '#D9DDD8',
  cabin: '#E2E4DF',
  gull: '#EEF0EC',
  gullDark: '#4B565B',
}
const HOUSES = ['#C08A3E', '#4F8C88', '#CFA43E', '#4E6F94', '#E4E6E1', '#C7A15A']

/** The light outside, 0.8 to 1: cloud going over the sun and off it again, the big banks slowly, the rags quicker. */
export const daylight = (t: number): number => 0.9 + 0.07 * sway(t, 1 / 23, 4) + 0.03 * Math.sin(t * 0.9)

/** The water's level out in the harbour (where the far shore meets it), on the town's plane. */
const SHORE_Y = -1.0

/**
 * The harbour, whole, over the view `v`: sky, cloud, the mountain, the town, the water and its swell, the boats and
 * the gulls. The caller clips it to where it can be seen (outside the walls, the window).
 */
export function drawHarbour(g: C2, v: View, t: number): void {
  const k = v.k
  // The sky: brighter low down, a little darker overhead.
  const gr = g.createLinearGradient(0, (v.y0 - 0.5) * k, 0, SHORE_Y * k)
  gr.addColorStop(0, H.skyHigh)
  gr.addColorStop(1, H.sky)
  g.fillStyle = gr
  g.fillRect((v.x0 - 1) * k, (v.y0 - 1) * k, (v.w + 2) * k, (SHORE_Y - v.y0 + 1.2) * k)
  // The cloud going over, far off: long flat banks in two values, drifting.
  layer(g, v, 0.06, BAR_AT, BAR_REF, (inner) => clouds(g, inner, t))
  layer(g, v, 0.14, BAR_AT, BAR_REF, (inner) => mountain(g, inner))
  // The water, from the far shore to the quay.
  const shore = onLayer(v, 0.3, BAR_AT, BAR_REF, [v.cx, SHORE_Y])[1]
  const wg = g.createLinearGradient(0, shore * k, 0, (FLOOR + 0.2) * k)
  wg.addColorStop(0, H.waterFar)
  wg.addColorStop(1, H.water)
  g.fillStyle = wg
  g.fillRect((v.x0 - 1) * k, shore * k, (v.w + 2) * k, (v.y1 - shore + 1) * k)
  layer(g, v, 0.3, BAR_AT, BAR_REF, (inner) => town(g, inner, t))
  swell(g, v, t, shore)
  layer(g, v, 0.5, BAR_AT, BAR_REF, (inner) => boats(g, inner, t))
  layer(g, v, 0.75, BAR_AT, BAR_REF, (inner) => gulls(g, inner, t))
  // The cloud's shadow coming and going over all of it.
  const dim = 1 - daylight(t)
  if (dim > 0.005) {
    g.fillStyle = rgbaOf('#2E3A40', dim * 1.6)
    g.fillRect((v.x0 - 1) * k, (v.y0 - 1) * k, (v.w + 2) * k, (v.h + 2) * k)
  }
}

function clouds(g: C2, v: View, t: number): void {
  const k = v.k
  const light = new Path2D()
  const dark = new Path2D()
  const span = 14
  for (let i = 0; i < 9; i++) {
    const gx = hash(i, 1, 5) * span + t * 0.12
    const x = v.x0 - 3 + ((((gx - (v.x0 - 3)) % span) + span) % span)
    const y = -3.4 + 2.0 * hash(i, 2, 5)
    const w = 1.2 + 1.8 * hash(i, 3, 5)
    const h = 0.12 + 0.12 * hash(i, 4, 5)
    const p = i % 3 === 0 ? dark : light
    for (let j = 0; j < 3; j++) {
      const ox = (j - 1) * w * 0.5
      const ww = w * (0.45 + 0.2 * hash(i, j, 6))
      p.moveTo((x + ox + ww) * k, (y + (j === 1 ? -h * 0.4 : 0)) * k)
      p.ellipse((x + ox) * k, (y + (j === 1 ? -h * 0.4 : 0)) * k, ww * k, h * k, 0, 0, Math.PI * 2)
    }
  }
  g.fillStyle = rgbaOf(H.cloud, 0.7)
  g.fill(light)
  g.fillStyle = rgbaOf(H.cloudDark, 0.45)
  g.fill(dark)
}

/** Sermitsiaq over the fjord, and the lower ridges beside it, under snow: the far rock pale in the haze. */
function mountain(g: C2, v: View): void {
  const k = v.k
  const ridges: { pts: Pt[]; rock: string; line: number }[] = [
    { pts: [[-9, -1.0], [-7.2, -1.55], [-5.8, -1.4], [-4.4, -1.85], [-3.1, -1.65], [-1.6, -2.05], [-0.4, -1.8], [1.0, -1.45], [2.6, -1.7], [4.0, -1.35], [5.6, -1.6], [7.4, -1.3], [9.5, -1.55], [11.5, -1.25], [13.5, -1.0]], rock: H.rockFar, line: 0.16 },
    { pts: [[-2.6, -1.0], [-1.4, -1.4], [-0.2, -1.85], [0.7, -2.5], [1.2, -2.62], [1.9, -2.58], [2.6, -2.3], [3.6, -1.95], [4.8, -1.55], [6.0, -1.25], [7.2, -1.0]], rock: H.rock, line: 0.14 },
  ]
  for (const r of ridges) {
    const rock = new Path2D()
    r.pts.forEach(([x, y], i) => (i ? rock.lineTo(x * k, y * k) : rock.moveTo(x * k, y * k)))
    rock.closePath()
    g.fillStyle = r.rock
    g.fill(rock)
    // The snow: from the ridge down a ragged way, deeper in the gullies.
    const snow = new Path2D()
    r.pts.forEach(([x, y], i) => (i ? snow.lineTo(x * k, y * k) : snow.moveTo(x * k, y * k)))
    for (let i = r.pts.length - 1; i >= 0; i--) {
      const [x, y] = r.pts[i]
      const d = Math.max(0, SHORE_Y - y) * (r.line + 0.12 * hash(i, 7, r.pts.length))
      snow.lineTo((x + 0.1 * (hash(i, 8) - 0.5)) * k, (y + d) * k)
    }
    snow.closePath()
    g.fillStyle = r.rock === H.rockFar ? '#C5CDCF' : H.snow
    g.fill(snow)
  }
}

/** The town across the water: the low shore and the houses up it in their colours, roofs dark, a window lit here and there. */
function town(g: C2, v: View, t: number): void {
  const k = v.k
  const shore = new Path2D()
  const x0 = v.x0 - 1
  const x1 = v.x1 + 1
  const hill = (x: number) => 0.14 + 0.09 * Math.sin(x * 0.9) + 0.06 * Math.sin(x * 2.3 + 1)
  shore.moveTo(x0 * k, (SHORE_Y + 0.03) * k)
  for (let x = x0; x <= x1 + 0.2; x += 0.2) shore.lineTo(x * k, (SHORE_Y - hill(x)) * k)
  shore.lineTo(x1 * k, (SHORE_Y + 0.03) * k)
  shore.closePath()
  g.fillStyle = H.shore
  g.fill(shore)
  const walls = HOUSES.map(() => new Path2D())
  const roofs = new Path2D()
  const lit = new Path2D()
  const step = 0.2
  for (let i = Math.floor(x0 / step); i * step < x1; i++) {
    if (hash(i, 31) > 0.68) continue
    const x = i * step + hash(i, 32) * 0.1
    const w = 0.09 + 0.05 * hash(i, 33)
    const h = 0.065 + 0.04 * hash(i, 34)
    const y = SHORE_Y - hill(x) * (0.25 + 0.8 * hash(i, 35))
    walls[Math.floor(hash(i, 36) * HOUSES.length)].rect(x * k, (y - h) * k, w * k, h * k)
    roofs.moveTo((x - 0.015) * k, (y - h) * k)
    roofs.lineTo((x + w / 2) * k, (y - h - 0.045) * k)
    roofs.lineTo((x + w + 0.015) * k, (y - h) * k)
    roofs.closePath()
    if (hash(i, 37) < 0.35) lit.rect((x + w * 0.3) * k, (y - h * 0.65) * k, w * 0.22 * k, h * 0.3 * k)
  }
  walls.forEach((p, i) => {
    g.fillStyle = HOUSES[i]
    g.fill(p)
  })
  g.fillStyle = H.roof
  g.fill(roofs)
  g.fillStyle = rgbaOf('#F6DDA2', 0.7 + 0.15 * Math.sin(t * 0.6))
  g.fill(lit)
}

/**
 * The swell across the harbour: rows of short dashes from the far shore to the quay, pale crests and dark troughs,
 * each row going by at its own pace and with its own parallax (the far rows slow and short, the near quick and long).
 */
function swell(g: C2, v: View, t: number, shore: number): void {
  const k = v.k
  const crests = new Path2D()
  const troughs = new Path2D()
  const near = FLOOR + 0.05
  for (let r = 0; r < 14; r++) {
    const u = Math.pow((r + 0.5) / 14, 1.4)
    const y = shore + 0.04 + (near - shore - 0.04) * u
    if (y < v.y0 - 0.1 || y > v.y1 + 0.1) continue
    const z = 0.3 + 0.7 * u
    const shift = (1 - z) * (v.cx - BAR_AT[0])
    const len = 0.12 + 0.45 * u
    const gap = 0.35 + 0.9 * u
    const speed = 0.08 + 0.3 * u
    const off = hash(r, 41) * gap + t * speed * (r % 2 ? 1 : -0.6)
    const i0 = Math.floor((v.x0 - shift - off) / gap) - 1
    const i1 = Math.ceil((v.x1 - shift - off) / gap) + 1
    for (let i = i0; i <= i1; i++) {
      if (hash(i, r, 42) < 0.3) continue
      const x = i * gap + off + shift + (hash(i, r, 43) - 0.5) * gap * 0.6
      const yy = y + 0.012 * u * Math.sin(t * 1.4 + i * 1.7 + r)
      const p = hash(i, r, 44) < 0.5 ? crests : troughs
      p.moveTo(x * k, yy * k)
      p.lineTo((x + len * (0.6 + 0.6 * hash(i, r, 45))) * k, yy * k)
    }
  }
  g.lineWidth = Math.max(0.8, 0.012 * k)
  g.strokeStyle = rgbaOf(H.crest, 0.6)
  g.stroke(crests)
  g.strokeStyle = rgbaOf(H.trough, 0.5)
  g.stroke(troughs)
}

/** Small boats at their moorings, each riding the swell on its own: a hull, a wheelhouse, a mast. */
function boats(g: C2, v: View, t: number): void {
  const k = v.k
  for (const [bx, s, pale, seed] of [[-3.4, 1, 0, 1], [3.9, 0.8, 1, 2], [7.6, 1.1, 0, 3], [11.4, 0.9, 1, 4], [-7.2, 0.85, 1, 5]] as [number, number, number, number][]) {
    if (bx + 1 < v.x0 || bx - 1 > v.x1) continue
    const wy = -0.78 + 0.03 * Math.sin(t * 1.1 + seed * 2)
    const roll = 0.06 * Math.sin(t * 0.9 + seed * 1.3)
    g.save()
    g.translate(bx * k, wy * k)
    g.rotate(roll)
    g.scale(s, s)
    g.fillStyle = pale ? H.hullPale : H.hull
    g.beginPath()
    g.moveTo(-0.42 * k, -0.1 * k)
    g.lineTo(0.5 * k, -0.12 * k)
    g.lineTo(0.38 * k, 0.03 * k)
    g.lineTo(-0.36 * k, 0.03 * k)
    g.closePath()
    g.fill()
    g.fillStyle = H.cabin
    g.fillRect(-0.12 * k, -0.27 * k, 0.24 * k, 0.16 * k)
    g.fillStyle = '#33424A'
    g.fillRect(-0.06 * k, -0.24 * k, 0.12 * k, 0.05 * k)
    g.strokeStyle = '#3A4448'
    g.lineWidth = Math.max(0.8, 0.012 * k)
    g.beginPath()
    g.moveTo(0.05 * k, -0.27 * k)
    g.lineTo(0.05 * k, -0.62 * k)
    g.moveTo(0.05 * k, -0.6 * k)
    g.lineTo(-0.38 * k, -0.11 * k)
    g.stroke()
    g.restore()
  }
}

/** Gulls over the water, wheeling slowly on stiff wings, now and then a beat. */
function gulls(g: C2, v: View, t: number): void {
  const k = v.k
  const path = new Path2D()
  for (let i = 0; i < 4; i++) {
    const cx = -2.5 + i * 3.6 + 0.4 * Math.sin(t * 0.05 + i)
    const cy = -2.3 + 0.35 * hash(i, 51)
    const a = t * (0.32 + 0.1 * hash(i, 52)) * (i % 2 ? 1 : -1) + i * 2
    const x = cx + 0.9 * Math.cos(a)
    const y = cy + 0.25 * Math.sin(a)
    const span = 0.12
    const beat = smooth(Math.sin(t * 1.3 + i * 2), 0.6, 1) * Math.sin(t * 14 + i)
    const lift = 0.35 + 0.35 * beat
    path.moveTo((x - span) * k, (y - span * lift) * k)
    path.quadraticCurveTo((x - span * 0.4) * k, (y - span * 0.45) * k, x * k, y * k)
    path.quadraticCurveTo((x + span * 0.4) * k, (y - span * 0.45) * k, (x + span) * k, (y - span * lift) * k)
  }
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.lineWidth = Math.max(1, 0.018 * k)
  g.strokeStyle = H.gullDark
  g.stroke(path)
}

/** How much the grey daylight has flooded into the room through the back door, banged open as he runs out. */
export const flood = (t: number): number => smooth(t, OUT - 0.05, OUT + 0.6)
