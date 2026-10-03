import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { frame, hash, knock, lastOf, smooth } from '../kit'
import { drawBoatAbove } from '../sea/boat'
import { beatPhase, BEGIN, BUMPS, H, heli, IN, JUMP, LIFT, LOOK, NO, onHeli, PARCEL_OFF, PARCEL_SEAT, QUAY_X, STEP, STROBES, SURF } from './sky-plan'
import { ctxOf, glow, mix, oval, poly, rgba, rrect, vgrad, type C2 } from './paint'

/**
 * How the sky is drawn (B3's): the harbour and its pad, the overcast, the grey-green sea going away to the ice and
 * the far coast, the boat, and the postal helicopter. Everything in the place's cells times `k`, from show time.
 *
 * The sea is a plane seen from the camera's height: its horizon is at the camera's eye (the frame's middle), and a
 * floe `z` cells away is drawn `F / z` of its size, between the horizon and the water's near edge, which is the
 * plane the action is in (the quay, the boat, the splash). So the floes go by slower the farther they are, and from
 * the cruise they lie far down under him.
 */

export const SKY = {
  top: '#8B979E',
  low: '#CDD3D1',
  cloud: '#B4BDBF',
  cloudDark: '#97A2A6',
  coast: '#7D898C',
  snow: '#E2E7E5',
  seaFar: '#9AA7A2',
  sea: '#6C7F78',
  seaNear: '#4C5F59',
  seaDeep: '#33443F',
  floe: '#E6EAE8',
  floeShade: '#B7C3C3',
  quayTop: '#9EA29E',
  quayFace: '#6C716F',
  pad: '#4E5558',
  white: '#EEF0EC',
  belly: '#A6AEB0',
  stripe: '#25313A',
  glass: '#3A4B54',
  glassHi: '#9AAEB5',
  inside: '#182024',
  metal: '#5A6468',
  rotor: '#262E33',
  parcel: '#A07E57',
  twine: '#E3D8C0',
  pilot: '#11181C',
}

/** The camera's eye: where the horizon is (cells), from the frame; never under the water's near edge. */
export const horizon = (cy: number): number => Math.min(cy, SURF - 0.9)
/** The plane the action is in, as a distance from the eye. */
const F = 10

/* ------------------------------------------------------------------ the set */

export function drawSkySet(p: p5, k: number, t: number): void {
  const g = ctxOf(p)
  const f = frame(p, k)
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  const y0 = f.y0 - 1
  const y1 = f.y1 + 1
  const hz = horizon(f.cy)
  const fh = f.y1 - f.y0
  // The overcast.
  g.fillStyle = vgrad(g, k, hz - fh * 0.9, hz, [
    [0, SKY.top],
    [0.75, mix(SKY.top, SKY.low, 0.7)],
    [1, SKY.low],
  ])
  g.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (hz - y0 + 0.05) * k)
  drawClouds(g, k, f, hz, t)
  drawCoast(g, k, f, hz)
  // The sea, from the horizon to the near water.
  const e = SURF - hz
  g.fillStyle = vgrad(g, k, hz, SURF + 2, [
    [0, SKY.seaFar],
    [0.12, mix(SKY.seaFar, SKY.sea, 0.6)],
    [Math.min(0.95, e / (e + 2)), SKY.sea],
    [1, SKY.seaNear],
  ])
  g.fillRect(x0 * k, hz * k, (x1 - x0) * k, (y1 - hz + 1) * k)
  // A haze on the horizon.
  g.fillStyle = vgrad(g, k, hz - 0.35, hz + 0.45, [
    [0, rgba(SKY.low, 0)],
    [0.45, rgba(SKY.low, 0.75)],
    [1, rgba(SKY.seaFar, 0)],
  ])
  g.fillRect(x0 * k, (hz - 0.35) * k, (x1 - x0) * k, 0.8 * k)
  drawHarbourFar(g, k, f, hz)
  drawFloes(g, k, f, hz, t)
  drawNearWater(g, k, f, t)
  drawQuay(g, k, f, t)
}

function drawClouds(g: C2, k: number, f: ReturnType<typeof frame>, hz: number, t: number): void {
  // Long low bands of cloud, slower than anything: the overcast's own texture.
  for (let i = 0; i < 9; i++) {
    const depth = 0.9 + 0.08 * hash(i, 1)
    const span = 26
    const base = (hash(i, 2) - 0.5) * span + t * 0.05
    let x = base + f.cx * depth
    // Keep the bands round the frame: wrap them every `span`.
    x = f.cx + ((((x - f.cx) % span) + span * 1.5) % span) - span / 2
    const y = hz - 0.6 - hash(i, 3) * 4.5
    const w = 3.5 + hash(i, 4) * 6
    const h = 0.3 + hash(i, 5) * 0.5
    // Soft-edged: a round glow stretched long.
    g.save()
    g.translate(x * k, y * k)
    g.scale(w / h, 1)
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, h * k)
    const col = i % 3 === 0 ? SKY.cloudDark : SKY.cloud
    const a = 0.3 + 0.25 * hash(i, 6)
    gr.addColorStop(0, rgba(col, a))
    gr.addColorStop(0.6, rgba(col, a * 0.6))
    gr.addColorStop(1, rgba(col, 0))
    g.fillStyle = gr
    g.beginPath()
    g.arc(0, 0, h * k, 0, Math.PI * 2)
    g.fill()
    g.restore()
  }
}

function drawCoast(g: C2, k: number, f: ReturnType<typeof frame>, hz: number): void {
  // The far coast of Greenland: low rock under its ice, on the horizon, all but still.
  const par = 0.985
  const step = 0.35
  const xa = Math.floor((f.x0 - 1 - f.cx * par) / step) * step
  const pts: [number, number][] = []
  const peaks: [number, number][] = []
  for (let u = xa; u <= f.x1 + 1 - f.cx * par + step; u += step) {
    const i = Math.round(u / step)
    const ridge = 0.25 + 0.55 * Math.max(0, Math.sin(i * 0.13 + 1.3)) * (0.5 + 0.5 * hash(i >> 3, 7)) + 0.12 * hash(i, 8)
    pts.push([u + f.cx * par, hz - ridge])
    peaks.push([u + f.cx * par, ridge])
  }
  g.fillStyle = mix(SKY.coast, SKY.low, 0.35)
  g.beginPath()
  g.moveTo(pts[0][0] * k, (hz + 0.05) * k)
  for (const [x, y] of pts) g.lineTo(x * k, y * k)
  g.lineTo(pts[pts.length - 1][0] * k, (hz + 0.05) * k)
  g.closePath()
  g.fill()
  // The ice on the high ground.
  g.fillStyle = rgba(SKY.snow, 0.85)
  g.beginPath()
  g.moveTo(pts[0][0] * k, pts[0][1] * k)
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i]
    const r = peaks[i][1]
    g.lineTo(x * k, (y + Math.max(0, r - 0.3) * 0.55) * k)
  }
  for (let i = pts.length - 1; i >= 0; i--) g.lineTo(pts[i][0] * k, pts[i][1] * k)
  g.closePath()
  g.fill()
}

/** A point of the sea plane `z` cells from the eye and `gx` along: where it is drawn, and how big. */
function project(f: ReturnType<typeof frame>, hz: number, gx: number, z: number): { x: number; y: number; s: number } {
  const s = F / z
  return { x: f.cx + (gx - f.cx) * s, y: hz + (SURF - hz) * s, s }
}

function drawHarbourFar(g: C2, k: number, f: ReturnType<typeof frame>, hz: number): void {
  // Across the harbour from the pad: a low dark shore and a few small houses, muted: Nuuk behind him as he goes.
  const z = F * 2.4
  const a = project(f, hz, -34, z)
  const b = project(f, hz, 16, z)
  if (b.x < f.x0 - 1 || a.x > f.x1 + 1) return
  const top = a.y - 0.75 * a.s
  g.fillStyle = mix(SKY.coast, SKY.seaFar, 0.3)
  g.beginPath()
  g.moveTo(a.x * k, (a.y + 0.05) * k)
  g.lineTo(a.x * k, (top + 0.2 * a.s) * k)
  g.quadraticCurveTo(((a.x + b.x) / 2) * k, (top - 0.4 * a.s) * k, (b.x - 1.4 * a.s) * k, (top + 0.25 * a.s) * k)
  g.lineTo(b.x * k, (a.y + 0.05) * k)
  g.closePath()
  g.fill()
  const HOUSES = ['#6F8497', '#A99A6A', '#6E8A78', '#8E9AA4', '#9C8D74', '#E2E4DE']
  for (let i = 0; i < 16; i++) {
    const gx = -30 + i * 2.6 + hash(i, 11) * 1.4
    const q = project(f, hz, gx, z + hash(i, 12) * 4)
    const w = (0.6 + 0.5 * hash(i, 13)) * q.s
    const h = (0.45 + 0.4 * hash(i, 14)) * q.s
    const base = q.y - 0.1 * q.s - hash(i, 15) * 0.35 * q.s
    g.fillStyle = mix(HOUSES[i % HOUSES.length], SKY.low, 0.35)
    g.fillRect((q.x - w / 2) * k, (base - h) * k, w * k, h * k)
    g.fillStyle = mix('#3E4A50', SKY.low, 0.4)
    poly(g, k, [
      [q.x - w / 2 - 0.05 * q.s, base - h],
      [q.x, base - h - 0.3 * q.s],
      [q.x + w / 2 + 0.05 * q.s, base - h],
    ])
    g.fill()
  }
}

function drawFloes(g: C2, k: number, f: ReturnType<typeof frame>, hz: number, t: number): void {
  const e = SURF - hz
  // From the far ones in: layer by layer, each a row of floes at its own distance.
  for (let L = 44; L >= 1; L--) {
    const z = F * Math.pow(1.09, L) + 0.4
    const s = F / z
    const spacing = 1.9 / s
    const halfW = (f.x1 - f.x0) / 2 + 2
    const n0 = Math.floor((f.cx - halfW / s) / spacing)
    const n1 = Math.ceil((f.cx + halfW / s) / spacing)
    const fog = Math.pow(1 - s, 1.6)
    // The ice thins out away from the coast: floes are fewer near, more toward the far ice.
    const density = 0.22 + 0.4 * (1 - s)
    for (let n = n0; n <= n1; n++) {
      if (hash(n, L, 21) > density) continue
      const gx = (n + hash(n, L, 22)) * spacing + Math.sin(t * 0.15 + n) * 0.05
      const q = project(f, hz, gx, z)
      const w = (0.35 + 1.4 * Math.pow(hash(n, L, 23), 2)) * s
      const squash = Math.max(0.07, Math.min(0.6, e / z))
      const h = w * squash
      const fill = mix(SKY.floe, SKY.seaFar, fog * 0.75)
      const shade = mix(SKY.floeShade, SKY.seaFar, fog * 0.7)
      // An uneven slab: its top lit, its near edge in shadow.
      const pts: [number, number][] = []
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2
        const r = 0.75 + 0.35 * hash(n, L, 30 + i)
        pts.push([q.x + Math.cos(a) * w * r, q.y + Math.sin(a) * h * r])
      }
      poly(g, k, pts.map(([x, y]) => [x, y + h * 0.45]))
      g.fillStyle = shade
      g.fill()
      poly(g, k, pts)
      g.fillStyle = fill
      g.fill()
    }
  }
}

function drawNearWater(g: C2, k: number, f: ReturnType<typeof frame>, t: number): void {
  if (f.y1 < SURF - 0.5) return
  // The water at the plane of action and nearer: darker, a few long glints on its swell.
  g.fillStyle = vgrad(g, k, SURF, SURF + 3, [
    [0, SKY.sea],
    [0.4, SKY.seaNear],
    [1, SKY.seaDeep],
  ])
  g.fillRect((f.x0 - 1) * k, SURF * k, (f.x1 - f.x0 + 2) * k, (f.y1 - SURF + 2) * k)
  g.strokeStyle = rgba(SKY.low, 0.28)
  g.lineWidth = Math.max(0.8, 0.02 * k)
  for (let i = 0; i < 40; i++) {
    const y = SURF + 0.06 + Math.pow(hash(i, 41), 1.5) * 2.6
    const x = Math.floor(f.x0) - 2 + hash(i, 42) * (f.x1 - f.x0 + 4) + Math.sin(t * 0.4 + i) * 0.2
    const w = 0.3 + hash(i, 43) * 0.9 * (1 + (y - SURF))
    g.beginPath()
    g.moveTo(x * k, y * k)
    g.lineTo((x + w) * k, y * k)
    g.stroke()
  }
}

/** The quay at the harbour's edge, the pad on it, the windsock. */
function drawQuay(g: C2, k: number, f: ReturnType<typeof frame>, t: number): void {
  if (f.x0 > QUAY_X + 1) return
  const top = 0.13
  const back = -0.32
  const xa = Math.min(-14, f.x0 - 2)
  // The quay's top, seen a little from above, and its face down into the water.
  poly(g, k, [
    [xa, top],
    [QUAY_X, top],
    [QUAY_X - 0.12, back],
    [xa, back],
  ])
  g.fillStyle = SKY.quayTop
  g.fill()
  g.fillStyle = vgrad(g, k, top, SURF + 0.3, [
    [0, SKY.quayFace],
    [0.8, mix(SKY.quayFace, SKY.seaDeep, 0.35)],
    [1, mix(SKY.quayFace, SKY.seaDeep, 0.7)],
  ])
  g.fillRect(xa * k, top * k, (QUAY_X - xa) * k, (SURF + 0.3 - top) * k)
  g.fillStyle = rgba('#2E3835', 0.35)
  g.fillRect(xa * k, (SURF - 0.45) * k, (QUAY_X - xa) * k, 0.45 * k)
  g.fillStyle = rgba(SKY.white, 0.22)
  g.fillRect(xa * k, top * k, (QUAY_X - xa) * k, 0.04 * k)
  // Bollards on the edge.
  for (const bx of [-9.5, -4.5, 6.6]) {
    rrect(g, k, bx - 0.11, top - 0.3, bx + 0.11, top + 0.01, 0.06)
    g.fillStyle = '#3B4446'
    g.fill()
  }
  // The pad: a dark disc on the quay's top, a white ring round it, its lights on the near edge.
  const cx = 3.2
  oval(g, k, cx, (top + back) / 2 + 0.02, 3.1, 0.21, SKY.pad)
  g.strokeStyle = rgba(SKY.white, 0.85)
  g.lineWidth = Math.max(1, 0.035 * k)
  g.beginPath()
  g.ellipse(cx * k, ((top + back) / 2 + 0.02) * k, 2.4 * k, 0.15 * k, 0, 0, Math.PI * 2)
  g.stroke()
  g.lineWidth = Math.max(1, 0.05 * k)
  g.beginPath()
  g.moveTo((cx - 3.0) * k, (top - 0.015) * k)
  g.lineTo((cx + 3.0) * k, (top - 0.015) * k)
  g.stroke()
  for (let i = -2; i <= 2; i++) {
    const lx = cx + i * 1.45
    glow(g, k, lx, top - 0.05, 0.22, '#E9F0D8', 0.45)
    oval(g, k, lx, top - 0.05, 0.05, 0.035, '#F4F7EA')
  }
  // The windsock on its pole, streaming in the wind off the sea; the rotor's wash lifts it after the lift.
  const px = -2.6
  g.strokeStyle = '#3E4749'
  g.lineWidth = Math.max(1, 0.04 * k)
  g.beginPath()
  g.moveTo(px * k, (back + 0.05) * k)
  g.lineTo(px * k, -2.25 * k)
  g.stroke()
  const lift = 0.55 + 0.45 * smooth(t, LIFT - 1.2, LIFT + 0.4)
  const pts: [number, number][] = []
  const lower: [number, number][] = []
  for (let i = 0; i <= 8; i++) {
    const u = i / 8
    const x = px + u * 1.05
    const droop = (1 - lift) * u * u * 0.9
    const flap = 0.04 * Math.sin(t * 9 - u * 6) * u
    const r = 0.13 * (1 - 0.55 * u)
    pts.push([x, -2.18 + droop + flap - r])
    lower.push([x, -2.18 + droop + flap + r])
  }
  poly(g, k, [...pts, ...lower.reverse()])
  g.fillStyle = '#E3E6E1'
  g.fill()
  g.fillStyle = SKY.stripe
  const m = 4
  poly(g, k, [pts[m], pts[m + 1], lower[8 - m - 1], lower[8 - m]])
  g.fill()
}

/* ------------------------------------------------------------------ the boat, from the air */

export function drawBoat(p: p5, k: number, x0: number): void {
  const g = ctxOf(p)
  drawBoatAbove(g, k, x0, SURF, 0)
}

/* ------------------------------------------------------------------ the helicopter */

/** The main rotor's two blades, turning once a beat: each as [how far it reaches along the disc, toward us or away]. */
function blades(t: number): [number, number][] {
  const ph = beatPhase(t) * Math.PI * 2
  return [0, Math.PI].map((o) => [Math.cos(ph + o), Math.sin(ph + o)])
}

/** The helicopter, at `t`: body, glass, pilot, open door with its dark inside, skids, boom, rotors and strobe. */
export function drawHeli(p: p5, k: number, t: number): void {
  const g = ctxOf(p)
  const h = heli(t)
  g.save()
  g.translate(h.x * k, h.y * k)
  g.rotate(h.a)
  const b = H.body
  // The rotor's disc first, so the mast stands in front of its far half.
  drawRotor(g, k, t, -1)
  // The tail boom and fin.
  poly(g, k, [
    [b.x0 + 0.05, -1.02],
    [H.boom.x1, -0.95],
    [H.boom.x1, -0.74],
    [b.x0 + 0.05, -0.42],
  ])
  g.fillStyle = SKY.white
  g.fill()
  poly(g, k, [
    [b.x0 + 0.05, -0.62],
    [H.boom.x1, -0.8],
    [H.boom.x1, -0.74],
    [b.x0 + 0.05, -0.42],
  ])
  g.fillStyle = SKY.belly
  g.fill()
  // The stripe runs back along the boom.
  poly(g, k, [
    [b.x0 + 0.05, -0.86],
    [H.boom.x1 + 0.05, -0.88],
    [H.boom.x1 + 0.05, -0.84],
    [b.x0 + 0.05, -0.76],
  ])
  g.fillStyle = SKY.stripe
  g.fill()
  poly(g, k, [
    [H.boom.x1 + 0.45, -0.9],
    [H.boom.x1 - 0.05, -1.75],
    [H.boom.x1 - 0.32, -1.75],
    [H.boom.x1 - 0.12, -0.72],
  ])
  g.fillStyle = SKY.white
  g.fill()
  poly(g, k, [
    [H.boom.x1 + 0.15, -0.82],
    [H.boom.x1 + 0.55, -0.78],
    [H.boom.x1 + 0.55, -0.72],
    [H.boom.x1 + 0.1, -0.74],
  ])
  g.fillStyle = SKY.belly
  g.fill()
  drawTailRotor(g, k, t)
  // The skids and their struts.
  g.strokeStyle = SKY.metal
  g.lineCap = 'round'
  g.lineWidth = Math.max(1, 0.06 * k)
  g.beginPath()
  g.moveTo(-0.55 * k, 0.32 * k)
  g.lineTo(-0.75 * k, (H.skid.y + 0.02) * k)
  g.moveTo(1.15 * k, 0.32 * k)
  g.lineTo(1.3 * k, (H.skid.y + 0.02) * k)
  g.stroke()
  g.lineWidth = Math.max(1, H.skid.h * k)
  g.beginPath()
  g.moveTo(H.skid.x0 * k, (H.skid.y + H.skid.h / 2) * k)
  g.lineTo((H.skid.x1 - 0.1) * k, (H.skid.y + H.skid.h / 2) * k)
  g.quadraticCurveTo((H.skid.x1 + 0.12) * k, (H.skid.y + H.skid.h / 2) * k, (H.skid.x1 + 0.18) * k, (H.skid.y - 0.12) * k)
  g.stroke()
  // The cabin and the nose.
  const body = () => {
    g.beginPath()
    g.moveTo((b.x0 + 0.05) * k, -1.08 * k)
    g.quadraticCurveTo((b.x0 + 0.2) * k, b.top * k, (b.x0 + 0.55) * k, b.top * k)
    g.lineTo(0.75 * k, b.top * k)
    g.bezierCurveTo(1.55 * k, (b.top - 0.02) * k, 2.2 * k, -0.95 * k, 2.3 * k, -0.35 * k)
    g.bezierCurveTo(2.35 * k, 0.1 * k, 1.9 * k, b.bottom * k, 1.35 * k, b.bottom * k)
    g.lineTo(-1.0 * k, b.bottom * k)
    g.bezierCurveTo((b.x0 + 0.02) * k, b.bottom * k, (b.x0 - 0.02) * k, 0.1 * k, b.x0 * k, -0.45 * k)
    g.closePath()
  }
  body()
  g.fillStyle = SKY.white
  g.fill()
  g.save()
  body()
  g.clip()
  // The grey belly, and the one dark stripe.
  g.fillStyle = SKY.belly
  g.fillRect((b.x0 - 1) * k, 0.06 * k, 5 * k, 1 * k)
  g.fillStyle = SKY.stripe
  g.fillRect((b.x0 - 1) * k, -0.4 * k, 5 * k, 0.15 * k)
  // A shade down the body's lower half and its rear, for its roundness.
  g.fillStyle = vgrad(g, k, b.top, b.bottom, [
    [0, rgba('#FFFFFF', 0.25)],
    [0.45, rgba('#FFFFFF', 0)],
    [1, rgba('#3A4448', 0.25)],
  ])
  g.fillRect((b.x0 - 1) * k, b.top * k, 5 * k, (b.bottom - b.top) * k)
  // The cockpit's glass, the pilot dark behind it.
  g.beginPath()
  g.moveTo(H.glass.x0 * k, (b.top + 0.05) * k)
  g.lineTo(0.95 * k, (b.top + 0.02) * k)
  g.bezierCurveTo(1.6 * k, (b.top + 0.02) * k, 2.15 * k, -0.95 * k, 2.26 * k, -0.42 * k)
  g.lineTo(H.glass.x0 * k, -0.42 * k)
  g.closePath()
  g.fillStyle = SKY.glass
  g.fill()
  drawPilot(g, k, t)
  g.fillStyle = vgrad(g, k, b.top, -0.42, [
    [0, rgba(SKY.glassHi, 0.45)],
    [0.35, rgba(SKY.glassHi, 0.12)],
    [1, rgba(SKY.glassHi, 0)],
  ])
  g.beginPath()
  g.moveTo(1.05 * k, (b.top + 0.04) * k)
  g.bezierCurveTo(1.6 * k, (b.top + 0.05) * k, 2.05 * k, -0.95 * k, 2.15 * k, -0.6 * k)
  g.lineTo(1.95 * k, -0.6 * k)
  g.bezierCurveTo(1.85 * k, -0.95 * k, 1.5 * k, (b.top + 0.13) * k, 1.05 * k, (b.top + 0.13) * k)
  g.closePath()
  g.fill()
  // The frame between the glass and the door.
  g.fillStyle = SKY.white
  g.fillRect((H.glass.x0 - 0.06) * k, b.top * k, 0.14 * k, 0.9 * k)
  g.restore()
  // The engine's cowling and the mast.
  rrect(g, k, -1.0, b.top - 0.28, 0.75, b.top + 0.04, 0.12)
  g.fillStyle = mix(SKY.white, SKY.belly, 0.25)
  g.fill()
  g.fillStyle = SKY.metal
  g.fillRect(-0.85 * k, (b.top - 0.18) * k, 0.4 * k, 0.07 * k)
  g.fillRect((H.mast.x - 0.05) * k, H.mast.y * k, 0.1 * k, (b.top - 0.25 - H.mast.y) * k)
  // The open door: the cabin's dark inside, a seat back, a strap swaying; the door slid back along its rail.
  const d = H.door
  rrect(g, k, d.x0, d.top, d.x1, H.floor + 0.02, 0.06)
  g.fillStyle = SKY.inside
  g.fill()
  g.fillStyle = mix(SKY.inside, SKY.metal, 0.35)
  rrect(g, k, d.x0 + 0.06, -0.72, d.x0 + 0.3, -0.05, 0.05)
  g.fill()
  const sway = 0.12 * Math.sin(t * 2.2) * smooth(t, LIFT, LIFT + 1) + 0.25 * (heli(t + 0.05).a - h.a) * 10
  g.strokeStyle = mix(SKY.inside, SKY.belly, 0.45)
  g.lineWidth = Math.max(1, 0.03 * k)
  g.beginPath()
  g.moveTo(0.38 * k, (d.top + 0.04) * k)
  g.lineTo((0.38 + sway * 0.4) * k, (d.top + 0.42) * k)
  g.stroke()
  g.strokeStyle = SKY.stripe
  g.lineWidth = Math.max(1, 0.03 * k)
  g.beginPath()
  g.moveTo((d.x0 - 1.4) * k, (d.top - 0.05) * k)
  g.lineTo((d.x1 + 0.05) * k, (d.top - 0.05) * k)
  g.stroke()
  // The slid-back door panel over the cabin's rear, its window.
  rrect(g, k, d.x0 - 1.33, d.top - 0.02, d.x0 - 0.02, H.floor + 0.06, 0.06)
  g.fillStyle = mix(SKY.white, SKY.belly, 0.15)
  g.fill()
  g.strokeStyle = rgba(SKY.metal, 0.6)
  g.lineWidth = Math.max(0.6, 0.015 * k)
  g.stroke()
  rrect(g, k, d.x0 - 1.1, d.top + 0.12, d.x0 - 0.25, d.top + 0.5, 0.05)
  g.fillStyle = SKY.glass
  g.fill()
  // The parcel on the floor beside him, until he takes it out onto the skid.
  if (t < STEP - 0.34) drawParcel(g, k, PARCEL_SEAT[0], PARCEL_SEAT[1], 0)
  // The near half of the rotor, over the mast.
  drawRotor(g, k, t, 1)
  // The strobe on the fin's top, on every downbeat.
  const s = lastOf(STROBES, t)
  const flash = knock(s.ago, 0.07)
  oval(g, k, H.boom.x1 - 0.2, -1.78, 0.05, 0.05, flash > 0.1 ? '#FFFFFF' : '#C9CFD0')
  glow(g, k, H.boom.x1 - 0.2, -1.78, 0.9, '#FFFFFF', 0.85 * flash)
  g.restore()
}

/** The parcel: a small box in brown paper, tied with twine. Its foot at (x, y) in whatever frame is current. */
export function drawParcel(g: C2, k: number, x: number, y: number, rot: number): void {
  g.save()
  g.translate(x * k, y * k)
  g.rotate(rot)
  rrect(g, k, -0.15, -0.23, 0.15, 0, 0.02)
  g.fillStyle = SKY.parcel
  g.fill()
  g.fillStyle = rgba('#000000', 0.16)
  g.fillRect(0.06 * k, -0.23 * k, 0.09 * k, 0.23 * k)
  g.strokeStyle = SKY.twine
  g.lineWidth = Math.max(0.8, 0.018 * k)
  g.beginPath()
  g.moveTo(-0.15 * k, -0.11 * k)
  g.lineTo(0.15 * k, -0.11 * k)
  g.moveTo(-0.01 * k, -0.23 * k)
  g.lineTo(-0.01 * k, 0)
  g.stroke()
  g.restore()
}

function drawRotor(g: C2, k: number, t: number, side: number): void {
  const { x, y } = H.mast
  const L = H.blade
  // The disc: a thin blur across the blades' sweep, brighter on the beat.
  const ph = beatPhase(t)
  const pulse = Math.pow(Math.cos(ph * Math.PI) ** 2, 6)
  if (side < 0) {
    oval(g, k, x, y, L, 0.07, rgba(SKY.rotor, 0.12 + 0.06 * pulse))
  }
  g.strokeStyle = SKY.rotor
  g.lineCap = 'round'
  for (const [c, n] of blades(t)) {
    // A blade toward us is drawn over the mast; away from us, behind it.
    if ((side > 0) !== n >= 0) continue
    const reach = c * L
    for (let j = 0; j < 4; j++) {
      // A little smear behind each blade, the way a quick thing is seen.
      const back = reach * (1 - j * 0.07)
      g.strokeStyle = rgba(SKY.rotor, j === 0 ? 0.9 : 0.16)
      g.lineWidth = Math.max(1, (0.07 - j * 0.012) * k)
      g.beginPath()
      g.moveTo(x * k, (y + 0.01) * k)
      g.lineTo((x + back) * k, (y + 0.03 * n) * k)
      g.stroke()
    }
  }
  if (side > 0) {
    oval(g, k, x, y + 0.02, 0.13, 0.07, SKY.metal)
  }
}

function drawTailRotor(g: C2, k: number, t: number): void {
  const cx = H.tail.x
  const cy = H.tail.y
  const r = H.tail.r
  oval(g, k, cx, cy, r, r, rgba(SKY.rotor, 0.1))
  const a = beatPhase(t) * Math.PI * 2 * 3
  g.strokeStyle = rgba(SKY.rotor, 0.75)
  g.lineWidth = Math.max(1, 0.05 * k)
  g.beginPath()
  g.moveTo((cx - Math.cos(a) * r) * k, (cy - Math.sin(a) * r) * k)
  g.lineTo((cx + Math.cos(a) * r) * k, (cy + Math.sin(a) * r) * k)
  g.stroke()
  oval(g, k, cx, cy, 0.06, 0.06, SKY.metal)
}

/** The pilot: a drawn silhouette at the controls, headset on; he looks back at Walter, and shakes his head. */
function drawPilot(g: C2, k: number, t: number): void {
  const look = smooth(t, LOOK - 0.3, LOOK + 0.2) * (1 - smooth(t, NO + 1.0, NO + 1.6))
  const shake = t > NO - 0.05 && t < NO + 0.95 ? 0.07 * Math.sin((t - NO) * Math.PI * 2 * 2.4) * (1 - (t - NO) / 1.0) : 0
  const hx = 1.42 - 0.08 * look + shake
  const hy = -0.86
  g.fillStyle = SKY.pilot
  // Shoulders and the seat's back.
  g.beginPath()
  g.moveTo(1.05 * k, -0.42 * k)
  g.quadraticCurveTo(1.1 * k, -0.68 * k, 1.38 * k, -0.68 * k)
  g.quadraticCurveTo(1.68 * k, -0.68 * k, 1.75 * k, -0.42 * k)
  g.closePath()
  g.fill()
  oval(g, k, hx, hy, 0.15, 0.17, SKY.pilot)
  // The headset's band and cup.
  g.strokeStyle = SKY.pilot
  g.lineWidth = Math.max(1, 0.035 * k)
  g.beginPath()
  g.arc(hx * k, hy * k, 0.19 * k, Math.PI * 1.05, Math.PI * 1.95)
  g.stroke()
  oval(g, k, hx - 0.06 * look, hy + 0.01, 0.06, 0.08, SKY.pilot)
  // Facing forward, his nose and the mic's arm; turned back, the back of his head.
  if (look < 0.5) {
    oval(g, k, hx + 0.15, hy + 0.02, 0.035, 0.03, SKY.pilot)
    g.beginPath()
    g.moveTo((hx + 0.05) * k, (hy + 0.06) * k)
    g.quadraticCurveTo((hx + 0.1) * k, (hy + 0.18) * k, (hx + 0.2) * k, (hy + 0.12) * k)
    g.stroke()
  } else {
    oval(g, k, hx - 0.15, hy + 0.02, 0.035, 0.03, SKY.pilot)
  }
  // His hand on the cyclic.
  g.lineWidth = Math.max(1, 0.05 * k)
  g.beginPath()
  g.moveTo(1.55 * k, -0.55 * k)
  g.lineTo(1.75 * k, -0.47 * k)
  g.stroke()
}

/* ------------------------------------------------------------------ the wash and the spray */

/** Under the helicopter: on the pad, the wash flattening the puddles as it lifts; over the sea, rings and spray. */
export function drawWash(p: p5, k: number, t: number): void {
  const g = ctxOf(p)
  const h = heli(t)
  const height = SURF - (h.y + H.skid.y)
  // On the pad: dust and spray thrown out flat along the quay, round the lift.
  if (t > LIFT - 1.5 && t < LIFT + 3) {
    const a = smooth(t, LIFT - 1.5, LIFT) * (1 - smooth(t, LIFT + 1, LIFT + 3))
    for (let i = 0; i < 18; i++) {
      const u = ((t * 1.3 + hash(i, 51)) % 1)
      const dir = i % 2 ? 1 : -1
      const x = h.x + 0.4 + dir * (0.6 + u * 3.2)
      oval(g, k, x, 0.04 - u * 0.12, 0.25 + u * 0.4, 0.03 + u * 0.05, rgba('#DDE2E0', a * 0.35 * (1 - u)))
    }
  }
  // Over the water, when it is low: rings going out on the sea, and spray.
  if (height < 4.5 && t > BEGIN + 10) {
    const a = smooth(-height, -4.5, -2.0)
    for (let i = 0; i < 5; i++) {
      const u = ((t * 0.7 + i / 5) % 1)
      const r = 0.6 + u * 3.6
      g.strokeStyle = rgba('#DCE3E0', a * 0.5 * (1 - u))
      g.lineWidth = Math.max(1, 0.03 * k)
      g.beginPath()
      g.ellipse((h.x + 0.4) * k, (SURF + 0.06) * k, r * k, r * 0.07 * k, 0, 0, Math.PI * 2)
      g.stroke()
    }
    for (let i = 0; i < 26; i++) {
      const u = ((t * 1.1 + hash(i, 61)) % 1)
      const dir = hash(i, 62) < 0.5 ? -1 : 1
      const x = h.x + 0.4 + dir * (0.4 + u * (1.5 + 2 * hash(i, 63)))
      const y = SURF - 0.05 - Math.sin(u * Math.PI) * (0.25 + 0.3 * hash(i, 64))
      oval(g, k, x, y, 0.05 + 0.08 * u, 0.04 + 0.05 * u, rgba('#E9EEEC', a * 0.45 * (1 - u)))
    }
  }
}

/* ------------------------------------------------------------------ the parcel, as he goes */

/** Where the parcel is from the step out of the door on: with him on the skid, and beside him in the fall. */
export function parcelWith(walter: Pt, t: number): { p: Pt; rot: number } {
  const a = smooth(t, STEP - 0.34, STEP)
  void a
  const rot = t > JUMP ? (t - JUMP) * 1.4 : 0
  return { p: [walter[0] + PARCEL_OFF[0], walter[1] + PARCEL_OFF[1] + 0.115], rot }
}

/** On the step down, the parcel goes from its place on the floor to beside him: carried in the helicopter's frame. */
export function parcelAt(t: number, walter: Pt): { p: Pt; rot: number; local: boolean } {
  if (t < STEP - 0.34) return { p: PARCEL_SEAT, rot: 0, local: true }
  if (t < STEP) {
    const u = smooth(t, STEP - 0.34, STEP)
    const seat = onHeli(t, PARCEL_SEAT)
    const by = parcelWith(walter, t).p
    return { p: [seat[0] + (by[0] - seat[0]) * u, seat[1] + (by[1] - seat[1]) * u], rot: 0, local: false }
  }
  return { ...parcelWith(walter, t), local: false }
}

export { BUMPS, IN, H }

/* ------------------------------------------------------------------ the going */

/**
 * Wisps of low cloud between us and the helicopter in the cruise, going by fast at the frame's top and foot: what
 * says how quick it is when the sea below hardly moves. Never across the middle, where he is.
 */
export function drawWisps(p: p5, k: number, t: number, from: number, to: number): void {
  const a = smooth(t, from, from + 1) * (1 - smooth(t, to - 1, to))
  if (a <= 0.01) return
  const g = ctxOf(p)
  const f = frame(p, k)
  const fh = f.y1 - f.y0
  const fw = f.x1 - f.x0
  for (let i = 0; i < 5; i++) {
    const period = 2.6 + hash(i, 91) * 1.4
    const u = (((t - from) / period + hash(i, 92)) % 1 + 1) % 1
    const x = f.x1 + 3 - u * (fw + 9)
    const band = i % 2 ? 0.08 + 0.08 * hash(i, 93) : 0.86 + 0.1 * hash(i, 93)
    const y = f.y0 + fh * band
    const w = 2.2 + hash(i, 94) * 2.5
    const h = 0.25 + hash(i, 95) * 0.3
    g.save()
    g.translate(x * k, y * k)
    g.scale(w / h, 1)
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, h * k)
    gr.addColorStop(0, rgba('#E4E8E7', 0.42 * a))
    gr.addColorStop(1, rgba('#E4E8E7', 0))
    g.fillStyle = gr
    g.beginPath()
    g.arc(0, 0, h * k, 0, Math.PI * 2)
    g.fill()
    g.restore()
  }
}
