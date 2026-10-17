import type { Pt } from '../../../../../parts'
import { layer, motes, onLayer, rgbaOf, sway, type View } from '../depth'
import { hash, smooth } from '../kit'
import { FLOOR, OUT } from './geo'

/**
 * The harbour at Nuuk, outside the bar (B's): what is seen past the doors and through the window, on its own planes
 * behind the room so it moves slower than the room as the camera goes. Far off, Sermitsiaq's dark bulk under its snow
 * and a few banks of low cloud going by on its flanks; across the water, a few of the town's houses in their colours (ochre, teal,
 * mustard, blue, white); two boats at their moorings bobbing on the swell and one going out; two gulls; a trawler tied
 * up at the quay by the harbour door; a thin sleet; and the light changing on all of it as the cloud goes over. Drawn
 * straight onto the canvas in the place's cells.
 */

type C2 = CanvasRenderingContext2D

/** Where the camera mostly is in the bar, and how tall its frame: what the planes here are composed against. */
export const BAR_AT: Pt = [1.4, -0.9]
export const BAR_REF = 3.6

const H = {
  sky: '#AEB9BC',
  skyHigh: '#8F9DA3',
  cloud: '#C3CBCC',
  rock: '#56636A',
  rockFar: '#7D8A8F',
  snow: '#D9DFDF',
  shore: '#4C585E',
  water: '#6F7E84',
  waterFar: '#8C989C',
  crest: '#B4BFC1',
  roof: '#2F3638',
  hull: '#2C4650',
  hullPale: '#D9DDD8',
  cabin: '#E2E4DF',
  gullDark: '#4B565B',
}
const HOUSES = ['#C08A3E', '#4F8C88', '#CFA43E', '#4E6F94', '#E4E6E1', '#C7A15A']

/** The light outside, 0.8 to 1: cloud going over the sun and off it again, the big banks slowly, thinner cloud quicker. */
export const daylight = (t: number): number => 0.9 + 0.07 * sway(t, 1 / 23, 4) + 0.03 * Math.sin(t * 0.9)

/** The water's level out in the harbour (where the far shore meets it), on the town's plane. */
const SHORE_Y = -1.0

/**
 * The harbour, whole, over the view `v`: sky, cloud, the mountain, the town, the water, the boats, the gulls and the
 * sleet. The caller clips it to where it can be seen (outside the walls, the window).
 */
export function drawHarbour(g: C2, v: View, t: number): void {
  const k = v.k
  // The sky: brighter low down, a little darker overhead.
  const gr = g.createLinearGradient(0, (v.y0 - 0.5) * k, 0, SHORE_Y * k)
  gr.addColorStop(0, H.skyHigh)
  gr.addColorStop(1, H.sky)
  g.fillStyle = gr
  g.fillRect((v.x0 - 1) * k, (v.y0 - 1) * k, (v.w + 2) * k, (SHORE_Y - v.y0 + 1.2) * k)
  layer(g, v, 0.14, BAR_AT, BAR_REF, (inner) => mountain(g, inner))
  // Low cloud over the mountain's flanks: a few long flat banks, drifting.
  layer(g, v, 0.18, BAR_AT, BAR_REF, (inner) => clouds(g, inner, t))
  // The water, from the far shore to the quay.
  const shore = onLayer(v, 0.3, BAR_AT, BAR_REF, [v.cx, SHORE_Y])[1]
  const wg = g.createLinearGradient(0, shore * k, 0, (FLOOR + 0.2) * k)
  wg.addColorStop(0, H.waterFar)
  wg.addColorStop(1, H.water)
  g.fillStyle = wg
  g.fillRect((v.x0 - 1) * k, shore * k, (v.w + 2) * k, (v.y1 - shore + 1) * k)
  layer(g, v, 0.3, BAR_AT, BAR_REF, (inner) => town(g, inner))
  layer(g, v, 0.5, BAR_AT, BAR_REF, (inner) => boats(g, inner, t))
  layer(g, v, 0.75, BAR_AT, BAR_REF, (inner) => gulls(g, inner, t))
  if (v.x0 < MOORED.x + 1.4) layer(g, v, 0.85, BAR_AT, BAR_REF, (inner) => moored(g, inner, t))
  // Sleet going by on the wind, thin, out here only: never in the room, never over the quay in front.
  layer(g, v, 0.85, BAR_AT, BAR_REF, (inner) => {
    motes(g, inner, t, { n: 12, seed: 41, tile: [2.2, 1.8], r: [0.0025, 0.004], v: [-1.6, 3.2], spread: 0.3, color: rgbaOf('#E8EDEC', 0.3 * daylight(t)), streak: 0.045 })
  })
  // The cloud's shadow coming and going over all of it.
  const dim = 1 - daylight(t)
  if (dim > 0.005) {
    g.fillStyle = rgbaOf('#2E3A40', dim * 1.6)
    g.fillRect((v.x0 - 1) * k, (v.y0 - 1) * k, (v.w + 2) * k, (v.h + 2) * k)
  }
}

/** Low cloud torn off the overcast, hanging on the mountain's flanks: three long flat banks, one pale value, drifting. */
function clouds(g: C2, v: View, t: number): void {
  const k = v.k
  const banks = new Path2D()
  // They wrap round a span wider than any frame by more than a bank, so none is ever seen to jump.
  const span = 18
  for (let i = 0; i < 3; i++) {
    const gx = hash(i, 1, 5) * span + t * 0.15
    const x = v.x0 - 5 + ((((gx - (v.x0 - 5)) % span) + span) % span)
    const y = -2.2 + 0.32 * i + 0.1 * hash(i, 2, 5)
    const w = 2.6 + 1.6 * hash(i, 3, 5)
    const h = 0.08 + 0.04 * hash(i, 4, 5)
    banks.moveTo((x + w) * k, y * k)
    banks.ellipse(x * k, y * k, w * k, h * k, 0, 0, Math.PI * 2)
  }
  g.fillStyle = rgbaOf(H.cloud, 0.6)
  g.fill(banks)
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

/** The town across the water: the low shore and a few houses up it in their colours, roofs dark. */
function town(g: C2, v: View): void {
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
  const step = 0.55
  for (let i = Math.floor(x0 / step); i * step < x1; i++) {
    if (hash(i, 31) > 0.6) continue
    const x = i * step + hash(i, 32) * 0.25
    const w = 0.11 + 0.05 * hash(i, 33)
    const h = 0.08 + 0.04 * hash(i, 34)
    const y = SHORE_Y - hill(x) * (0.25 + 0.8 * hash(i, 35))
    walls[Math.floor(hash(i, 36) * HOUSES.length)].rect(x * k, (y - h) * k, w * k, h * k)
    roofs.moveTo((x - 0.015) * k, (y - h) * k)
    roofs.lineTo((x + w / 2) * k, (y - h - 0.05) * k)
    roofs.lineTo((x + w + 0.015) * k, (y - h) * k)
    roofs.closePath()
  }
  walls.forEach((p, i) => {
    g.fillStyle = HOUSES[i]
    g.fill(p)
  })
  g.fillStyle = H.roof
  g.fill(roofs)
}

/**
 * Two small boats at their moorings, each riding the swell on its own: a hull, a wheelhouse, a mast. And one going
 * out across the harbour under way, nearer, its wake spreading behind it.
 */
function boats(g: C2, v: View, t: number): void {
  const k = v.k
  const out = -0.2 + 0.5 * (t - OUT_FROM)
  if (out - 1.4 < v.x1 && out + 0.8 > v.x0) {
    // The wake: two lines spreading back from the bow, and the churn under the stern.
    const wy = -0.62 + 0.025 * Math.sin(t * 1.3)
    const wake = new Path2D()
    for (const side of [-1, 1]) {
      wake.moveTo((out + 0.4) * k, (wy + 0.02) * k)
      wake.lineTo((out - 1.3) * k, (wy + 0.02 + side * 0.05 + 0.04) * k)
    }
    wake.moveTo((out - 0.55) * k, (wy + 0.04) * k)
    wake.lineTo((out - 1.0) * k, (wy + 0.05) * k)
    g.lineWidth = Math.max(0.8, 0.014 * k)
    g.strokeStyle = rgbaOf(H.crest, 0.75)
    g.stroke(wake)
    hull(g, k, out, wy, 0.75, 1, 0.04 * Math.sin(t * 1.7))
  }
  for (const [bx, s, pale, seed] of [[-3.4, 1, 0, 1], [8.6, 1.1, 0, 3]] as [number, number, number, number][]) {
    if (bx + 1 < v.x0 || bx - 1 > v.x1) continue
    const wy = -0.78 + 0.03 * Math.sin(t * 1.1 + seed * 2)
    hull(g, k, bx, wy, s, pale, 0.06 * Math.sin(t * 0.9 + seed * 1.3))
  }
}

/** When the boat going out across the harbour is off the bar's door. */
const OUT_FROM = 37

/** A boat on the water: hull, wheelhouse, mast and stay, at `x, y`, its size `s`, rolled by `roll`. */
function hull(g: C2, k: number, bx: number, wy: number, s: number, pale: number, roll: number): void {
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

/** Two gulls over the water, wheeling slowly on stiff wings, now and then a beat. */
function gulls(g: C2, v: View, t: number): void {
  const k = v.k
  const path = new Path2D()
  for (let i = 1; i < 3; i++) {
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

/** The trawler at the quay: where its middle is, on its plane (just behind the quay's), and its waterline. */
const MOORED = { x: -1.4, y: FLOOR + 0.08 }

/**
 * A small trawler tied up alongside the quay by the harbour door, its hull below the quay's edge: the sheer and its
 * stripe, tyres for fenders, the wheelhouse aft with its windows, a mast and its boom, the rigging, a flag. It rolls
 * and heaves a little on the swell, and its lines go slack and taut with it.
 */
function moored(g: C2, v: View, t: number): void {
  const k = v.k
  const roll = 0.022 * Math.sin(t * 0.85 + 1) + 0.01 * Math.sin(t * 2.1)
  const heave = 0.025 * Math.sin(t * 1.05 + 0.4)
  g.save()
  g.translate(MOORED.x * k, (MOORED.y + heave) * k)
  g.rotate(roll)
  // The hull: bow to the left, standing higher; its white stripe under the rail.
  g.fillStyle = '#2B4248'
  g.beginPath()
  g.moveTo(-0.95 * k, -0.5 * k)
  g.lineTo(0.85 * k, -0.34 * k)
  g.lineTo(0.82 * k, 0.12 * k)
  g.lineTo(-0.72 * k, 0.12 * k)
  g.closePath()
  g.fill()
  g.fillStyle = '#C9CFCD'
  g.beginPath()
  g.moveTo(-0.93 * k, -0.46 * k)
  g.lineTo(0.84 * k, -0.31 * k)
  g.lineTo(0.84 * k, -0.27 * k)
  g.lineTo(-0.91 * k, -0.42 * k)
  g.closePath()
  g.fill()
  // Tyres hung over the side.
  g.fillStyle = '#161A1B'
  for (const x of [-0.35, 0.3]) {
    g.beginPath()
    g.ellipse(x * k, -0.17 * k, 0.07 * k, 0.09 * k, 0, 0, Math.PI * 2)
    g.fill()
  }
  // The wheelhouse aft, its roof, its windows on the grey day.
  g.fillStyle = '#D5D9D6'
  g.fillRect(0.3 * k, -0.86 * k, 0.45 * k, 0.53 * k)
  g.fillStyle = '#3B474B'
  g.fillRect(0.26 * k, -0.9 * k, 0.53 * k, 0.05 * k)
  g.fillStyle = '#6F7E84'
  g.fillRect(0.35 * k, -0.78 * k, 0.15 * k, 0.12 * k)
  g.fillRect(0.55 * k, -0.78 * k, 0.15 * k, 0.12 * k)
  // The mast, the boom down to the bow, the rigging; one stroke.
  g.strokeStyle = '#2F3A3E'
  g.lineCap = 'round'
  g.lineWidth = Math.max(1, 0.03 * k)
  g.beginPath()
  g.moveTo(-0.15 * k, -0.42 * k)
  g.lineTo(-0.15 * k, -1.75 * k)
  g.moveTo(-0.15 * k, -1.2 * k)
  g.lineTo(-0.8 * k, -0.62 * k)
  g.stroke()
  g.lineWidth = Math.max(0.6, 0.01 * k)
  g.beginPath()
  g.moveTo(-0.15 * k, -1.72 * k)
  g.lineTo(-0.94 * k, -0.52 * k)
  g.moveTo(-0.15 * k, -1.72 * k)
  g.lineTo(0.5 * k, -0.9 * k)
  g.moveTo(-0.8 * k, -0.62 * k)
  g.lineTo(-0.8 * k, -0.45 * k)
  g.stroke()
  // The flag at the masthead, snapping in the wind.
  const flap = (u: number) => 0.035 * Math.sin(t * 6.5 - u * 5) * u
  g.fillStyle = '#E2E5E0'
  g.beginPath()
  g.moveTo(-0.15 * k, -1.75 * k)
  for (let i = 1; i <= 4; i++) g.lineTo((-0.15 + i * 0.07) * k, (-1.75 + flap(i / 4)) * k)
  for (let i = 4; i >= 0; i--) g.lineTo((-0.15 + i * 0.065) * k, (-1.63 + flap(i / 4)) * k)
  g.closePath()
  g.fill()
  g.restore()
  // Its lines to the quay, from bow and stern: the slack in them as it heaves.
  g.strokeStyle = '#B9A47A'
  g.lineWidth = Math.max(0.8, 0.012 * k)
  g.beginPath()
  for (const [x, to] of [[-0.85, -1.9], [0.8, 0.95]] as [number, number][]) {
    const a: Pt = [MOORED.x + x, MOORED.y + heave - 0.38 + roll * x]
    const b: Pt = [MOORED.x + to, FLOOR - 0.02]
    g.moveTo(a[0] * k, a[1] * k)
    g.quadraticCurveTo(((a[0] + b[0]) / 2) * k, (Math.max(a[1], b[1]) + 0.1 - heave * 2) * k, b[0] * k, b[1] * k)
  }
  g.stroke()
}

/** How much the grey daylight has flooded into the room through the back door, banged open as he runs out. */
export const flood = (t: number): number => smooth(t, OUT - 0.05, OUT + 0.6)
