import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { frame, hash, lastOf, smooth } from '../kit'
import { drawBoatAbove } from '../sea/boat'
import { beatPhase, BEGIN, BUMPS, END, H, heli, IN, JUMP, LIFT, LOOK, NO, onHeli, PARCEL_OFF, PARCEL_SEAT, QUAY_X, STEP, STROBES, SURF, WIDE_FROM } from './sky-plan'
import { ctxOf, mix, oval, poly, rgba, rrect, vgrad, type C2 } from './paint'
import { drawBanks, drawBergs, drawDeck, drawRanges, drawSkein, drawSun, drawSunPath, drawSwell, drawTown, F, type Eye } from './air'

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
  top: '#B9C1C3',
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

/** When the skein of birds comes in from ahead, flying the other way. */
const SKEIN = LIFT + 3.4

/** The camera's eye: where the horizon is (cells), from the frame; never under the water's near edge. */
export const horizon = (cy: number): number => Math.min(cy, SURF - 0.9)

/* ------------------------------------------------------------------ the set */

/**
 * The set: the overcast, the far world and the sea. `under` when the sea draws it from under the skin, where all
 * below the surface is its own water: then nothing is drawn there.
 */
export function drawSkySet(p: p5, k: number, t: number, under = false): void {
  const g = ctxOf(p)
  const f = frame(p, k)
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  const y0 = f.y0 - 1
  const y1 = f.y1 + 1
  const hz = horizon(f.cy)
  const fh = f.y1 - f.y0
  const e: Eye = { ...f, hz, fh, fw: f.x1 - f.x0 }
  // The overcast: pearl, brightening toward the horizon.
  if (hz > f.y0) {
    g.fillStyle = vgrad(g, k, hz - fh * 0.9, hz, [
      [0, SKY.top],
      [0.75, mix(SKY.top, SKY.low, 0.7)],
      [1, SKY.low],
    ])
    g.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (hz - y0 + 0.05) * k)
    drawSun(g, k, e, t)
    drawDeck(g, k, e, t)
    drawBanks(g, k, e, t)
    drawRanges(g, k, e, t)
  }
  // The sea, from the horizon to the near water.
  const ed = SURF - hz
  g.fillStyle = vgrad(g, k, hz, SURF + 2, [
    [0, SKY.seaFar],
    [0.12, mix(SKY.seaFar, SKY.sea, 0.6)],
    [Math.min(0.95, ed / (ed + 2)), SKY.sea],
    [1, SKY.seaNear],
  ])
  g.fillRect(x0 * k, hz * k, (x1 - x0) * k, ((under ? Math.min(y1, SURF + 0.1) : y1) - hz + 1) * k)
  // A haze on the horizon.
  g.fillStyle = vgrad(g, k, hz - 0.35, hz + 0.45, [
    [0, rgba(SKY.low, 0)],
    [0.45, rgba(SKY.low, 0.75)],
    [1, rgba(SKY.seaFar, 0)],
  ])
  g.fillRect(x0 * k, (hz - 0.35) * k, (x1 - x0) * k, 0.8 * k)
  drawTown(g, k, e, t, SURF, SKY.seaFar)
  drawBergs(g, k, e, t, SURF, SKY.seaFar)
  drawSwell(g, k, e, t, SURF)
  drawSunPath(g, k, e, t, SURF)
  drawFloes(g, k, f, hz, t)
  drawSkein(g, k, e, t, SKEIN, WIDE_FROM, 30, -8.4, heli(SKEIN).x + 26, -3, 15)
  if (!under) drawNearWater(g, k, f, t)
  drawQuay(g, k, f, t)
  if (t < END) drawGulls(g, k, f, t, QUAY_Y)
}

/** The quay's top, where things stand on it: midway between its near and far edges. */
const QUAY_Y = -0.095

function drawFloes(g: C2, k: number, f: ReturnType<typeof frame>, hz: number, t: number): void {
  const e = SURF - hz
  // From the far ones in: layer by layer, each a row of floes at its own distance. They are gathered by how lost in
  // the haze they are, five bands, and each band is two fills (the slabs' shaded edges, then their lit tops).
  const BANDS = 5
  const shades = Array.from({ length: BANDS }, () => new Path2D())
  const tops = Array.from({ length: BANDS }, () => new Path2D())
  const ring = (path: Path2D, pts: [number, number][], dy: number) => {
    pts.forEach(([x, y], i) => (i ? path.lineTo(x * k, (y + dy) * k) : path.moveTo(x * k, (y + dy) * k)))
    path.closePath()
  }
  for (let L = 44; L >= 1; L--) {
    const z = F * Math.pow(1.09, L) + 0.4
    const s = F / z
    const spacing = 1.9 / s
    const halfW = (f.x1 - f.x0) / 2 + 2
    const n0 = Math.floor((f.cx - halfW / s) / spacing)
    const n1 = Math.ceil((f.cx + halfW / s) / spacing)
    const y = hz + e * s
    if (y < f.y0 - 1 || y > f.y1 + 1) continue
    const fog = Math.pow(1 - s, 1.6)
    const band = Math.min(BANDS - 1, Math.floor(fog * BANDS))
    // The ice thins out away from the coast: floes are fewer near, more toward the far ice.
    const density = 0.22 + 0.4 * (1 - s)
    const squash = Math.max(0.07, Math.min(0.6, e / z))
    for (let n = n0; n <= n1; n++) {
      if (hash(n, L, 21) > density) continue
      const gx = (n + hash(n, L, 22)) * spacing + Math.sin(t * 0.15 + n) * 0.05
      const x = f.cx + (gx - f.cx) * s
      const w = (0.35 + 1.4 * Math.pow(hash(n, L, 23), 2)) * s
      if (x + w < f.x0 - 0.5 || x - w > f.x1 + 0.5) continue
      const h = w * squash
      // An uneven slab: its top lit, its near edge in shadow.
      const pts: [number, number][] = []
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2
        const r = 0.75 + 0.35 * hash(n, L, 30 + i)
        pts.push([x + Math.cos(a) * w * r, y + Math.sin(a) * h * r])
      }
      ring(shades[band], pts, h * 0.45)
      ring(tops[band], pts, 0)
    }
  }
  for (let b = BANDS - 1; b >= 0; b--) {
    const fog = (b + 0.5) / BANDS
    g.fillStyle = mix(SKY.floeShade, SKY.seaFar, fog * 0.7)
    g.fill(shades[b])
    g.fillStyle = mix(SKY.floe, SKY.seaFar, fog * 0.75)
    g.fill(tops[b])
  }
}

function drawNearWater(g: C2, k: number, f: ReturnType<typeof frame>, t: number): void {
  if (f.y1 < SURF - 0.5) return
  // The water at the plane of action and nearer: darker, the long pale crests of its swell.
  g.fillStyle = vgrad(g, k, SURF, SURF + 3, [
    [0, SKY.sea],
    [0.4, SKY.seaNear],
    [1, SKY.seaDeep],
  ])
  g.fillRect((f.x0 - 1) * k, SURF * k, (f.x1 - f.x0 + 2) * k, (f.y1 - SURF + 2) * k)
  // The swell's crests running by at the near water's own pace, the nearer the quicker.
  const crests = new Path2D()
  const span = f.x1 - f.x0 + 4
  for (let i = 0; i < 70; i++) {
    const v = Math.pow(hash(i, 41), 1.5)
    const y = SURF + 0.06 + v * 2.6 + 0.02 * Math.sin(t * 1.5 + i)
    const x = f.x0 - 2 + ((((hash(i, 42) * span + t * (0.3 + 0.6 * v) * (i % 3 ? 1 : -1)) % span) + span) % span)
    const w = 0.3 + hash(i, 43) * 0.9 * (1 + (y - SURF))
    crests.moveTo(x * k, y * k)
    crests.lineTo((x + w) * k, y * k)
  }
  g.strokeStyle = rgba(SKY.low, 0.28)
  g.lineWidth = Math.max(0.8, 0.02 * k)
  g.stroke(crests)
}

/**
 * The quay's face: its courses of stone and their joints, old tyres hung on chains for fenders, an iron ladder down to
 * the water, and the wet dark of it running down from the top. One stroke for the joints, one fill for the tyres.
 */
function drawQuayFace(g: C2, k: number, xa: number, xb: number, top: number, t: number): void {
  if (xb <= xa) return
  const foot = SURF + 0.3
  const joints = new Path2D()
  let row = 0
  for (let y = top + 0.3; y < foot; y += 0.3, row++) {
    joints.moveTo(xa * k, y * k)
    joints.lineTo(xb * k, y * k)
    for (let x = Math.floor(xa / 1.1) * 1.1 + (row % 2) * 0.55; x < xb; x += 1.1) {
      joints.moveTo(x * k, (y - 0.3) * k)
      joints.lineTo(x * k, y * k)
    }
  }
  g.strokeStyle = rgba('#3E4744', 0.32)
  g.lineWidth = Math.max(0.8, 0.018 * k)
  g.stroke(joints)
  // Wet streaks down from the edge.
  const wet = new Path2D()
  for (let i = Math.floor(xa / 0.45); i * 0.45 < xb; i++) {
    if (hash(i, 111) < 0.55) continue
    const x = i * 0.45 + hash(i, 112) * 0.3
    wet.rect(x * k, (top + 0.04) * k, (0.03 + 0.05 * hash(i, 113)) * k, (0.2 + 0.7 * hash(i, 114)) * k)
  }
  g.fillStyle = rgba('#2F3735', 0.22)
  g.fill(wet)
  // Tyres on chains, and the ladder.
  const tyres = new Path2D()
  const chains = new Path2D()
  for (let x = Math.ceil((xa - 1.75) / 3.5) * 3.5 + 1.75; x < xb; x += 3.5) {
    if (x > 6.8) continue
    const sw = 0.04 * Math.sin(t * 1.1 + x)
    tyres.moveTo((x + 0.24 + sw) * k, (top + 0.62) * k)
    tyres.ellipse((x + sw) * k, (top + 0.62) * k, 0.24 * k, 0.3 * k, 0, 0, Math.PI * 2)
    tyres.moveTo((x + 0.12 + sw) * k, (top + 0.62) * k)
    tyres.ellipse((x + sw) * k, (top + 0.62) * k, 0.12 * k, 0.17 * k, 0, 0, Math.PI * 2, true)
    chains.moveTo(x * k, top * k)
    chains.lineTo((x + sw) * k, (top + 0.33) * k)
  }
  g.fillStyle = '#23292A'
  g.fill(tyres)
  const lx = 5.7
  if (lx > xa && lx < xb) {
    for (const rx of [lx - 0.14, lx + 0.14]) {
      chains.moveTo(rx * k, (top - 0.12) * k)
      chains.lineTo(rx * k, (SURF + 0.25) * k)
    }
    for (let y = top + 0.12; y < SURF + 0.2; y += 0.17) {
      chains.moveTo((lx - 0.14) * k, y * k)
      chains.lineTo((lx + 0.14) * k, y * k)
    }
  }
  g.strokeStyle = '#3A4244'
  g.lineWidth = Math.max(1, 0.03 * k)
  g.stroke(chains)
}

/**
 * The sea at the quay's foot, in front of its face: the swell running along the stone and rising and falling on it,
 * a line of foam where it slaps.
 */
function drawLapping(g: C2, k: number, f: ReturnType<typeof frame>, xa: number, xb: number, t: number): void {
  if (xb <= xa || f.y1 < SURF - 0.3) return
  const wl = (x: number) => SURF - 0.04 + 0.06 * Math.sin(x * 1.3 - t * 1.7) + 0.03 * Math.sin(x * 3.7 + t * 2.4)
  const water = new Path2D()
  const foam = new Path2D()
  const bottom = f.y1 + 1
  water.moveTo(xa * k, bottom * k)
  foam.moveTo(xa * k, wl(xa) * k)
  for (let x = xa; x < xb + 0.1; x += 0.12) {
    const xx = Math.min(x, xb)
    water.lineTo(xx * k, wl(xx) * k)
    foam.lineTo(xx * k, wl(xx) * k)
  }
  water.lineTo(xb * k, bottom * k)
  water.closePath()
  g.fillStyle = vgrad(g, k, SURF - 0.1, SURF + 3, [
    [0, SKY.sea],
    [0.4, SKY.seaNear],
    [1, SKY.seaDeep],
  ])
  g.fill(water)
  g.strokeStyle = rgba('#DDE4E1', 0.7)
  g.lineWidth = Math.max(1, 0.025 * k)
  g.stroke(foam)
}

/** Rain lying on the quay's top in puddles that hold the sky; the rotor's wash shivers them into rings as it lifts. */
function drawPuddles(g: C2, k: number, f: ReturnType<typeof frame>, top: number, back: number, t: number): void {
  const wash = smooth(t, LIFT - 1.6, LIFT - 0.2) * (1 - smooth(t, LIFT + 1.5, LIFT + 3.5))
  const pools = new Path2D()
  const rings = new Path2D()
  const y = (top + back) / 2 + 0.03
  for (const [x, w] of [[-8.6, 0.9], [-6.1, 0.6], [-1.6, 1.1], [6.9, 0.35], [-11.8, 0.8]] as [number, number][]) {
    if (x + w < f.x0 || x - w > f.x1) continue
    pools.moveTo((x + w) * k, y * k)
    pools.ellipse(x * k, y * k, w * k, 0.06 * k, 0, 0, Math.PI * 2)
    // Rings going out from the middle of each, quicker as the wash comes on; a slow few from the drizzle anyway.
    for (let j = 0; j < 3; j++) {
      const u = (((t * (0.5 + 1.6 * wash) + j / 3 + x * 0.37) % 1) + 1) % 1
      const r = 0.08 + u * w * 0.85
      rings.moveTo((x + r) * k, y * k)
      rings.ellipse(x * k, y * k, r * k, r * 0.07 * k, 0, 0, Math.PI * 2)
    }
  }
  g.fillStyle = rgba(SKY.low, 0.7)
  g.fill(pools)
  g.strokeStyle = rgba('#7F8A89', 0.35 + 0.3 * wash)
  g.lineWidth = Math.max(0.6, 0.012 * k)
  g.stroke(rings)
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
  drawQuayFace(g, k, Math.max(xa, f.x0 - 1), Math.min(QUAY_X, f.x1 + 1), top, t)
  drawLapping(g, k, f, Math.max(xa, f.x0 - 1), Math.min(QUAY_X, f.x1 + 1), t)
  drawPuddles(g, k, f, top, back, t)
  // Bollards on the edge.
  for (const bx of [-9.5, -4.5, 6.6]) {
    rrect(g, k, bx - 0.11, top - 0.3, bx + 0.11, top + 0.01, 0.06)
    g.fillStyle = '#3B4446'
    g.fill()
  }
  // The pad: a dark disc on the quay's top, a white ring round it, its lamps on the near edge.
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
  // The harbour's flag on its mast at the quay's far end: white with a band of the sea's blue, snapping in the wind
  // and harder in the wash.
  const fx = -7.2
  if (fx > f.x0 - 2 && fx < f.x1 + 1) {
    g.strokeStyle = '#4A5355'
    g.lineWidth = Math.max(1, 0.035 * k)
    g.beginPath()
    g.moveTo(fx * k, (back + 0.05) * k)
    g.lineTo(fx * k, -3.1 * k)
    g.stroke()
    const hard = 1 + 1.5 * smooth(t, LIFT - 1.2, LIFT + 0.4) * (1 - smooth(t, LIFT + 2, LIFT + 4))
    const top: [number, number][] = []
    const bot: [number, number][] = []
    for (let i = 0; i <= 10; i++) {
      const u = i / 10
      const wave = 0.07 * Math.sin(t * 7 * hard - u * 7) * u
      top.push([fx + u * 1.0, -3.05 + wave + u * 0.06 * (1 - lift)])
      bot.push([fx + u * 0.95, -2.5 + wave * 1.1 + u * 0.12 * (1 - lift)])
    }
    poly(g, k, [...top, ...bot.reverse()])
    g.fillStyle = '#E6E8E3'
    g.fill()
    const mid = top.map(([x, y], i): [number, number] => [x, y + (bot[10 - i][1] - y) * 0.42])
    const mid2 = top.map(([x, y], i): [number, number] => [x, y + (bot[10 - i][1] - y) * 0.62])
    poly(g, k, [...mid, ...mid2.reverse()])
    g.fillStyle = '#4E6F94'
    g.fill()
  }
}

/** The gulls on the quay's end: where each stands, when the wash puts it up, and how it goes. */
const GULLS: { x: number; up: number; vx: number; vy: number }[] = [
  { x: 5.95, up: LIFT - 1.4, vx: 1.0, vy: -2.4 },
  { x: 6.3, up: LIFT - 1.15, vx: 1.4, vy: -2.0 },
  { x: 6.95, up: LIFT - 0.95, vx: 0.8, vy: -2.6 },
  { x: 7.2, up: LIFT - 0.7, vx: 1.2, vy: -2.2 },
  { x: 5.6, up: LIFT - 0.5, vx: 0.6, vy: -2.3 },
  { x: 7.05, up: LIFT - 0.3, vx: 1.1, vy: -2.5 },
]

/**
 * Gulls standing about on the quay's end, past the pad. As the rotor's wash comes on they go up one after another,
 * wings beating, and wheel over the quay on the wind, complaining. Each a white body, grey back and dark wingtips;
 * one stroke for all the wings in the air.
 */
function drawGulls(g: C2, k: number, f: ReturnType<typeof frame>, t: number, y0: number): void {
  const wings = new Path2D()
  const tips = new Path2D()
  for (let i = 0; i < GULLS.length; i++) {
    const b = GULLS[i]
    const s = t - b.up
    const dir = i % 2 ? -1 : 1
    if (s < 0) {
      if (b.x < f.x0 - 0.3 || b.x > f.x1 + 0.3) continue
      // Standing: a body, a folded wing, a head that turns now and then, legs.
      const look = Math.sin(t * 0.9 + i * 2.3) > 0.4 ? -dir : dir
      const x = b.x
      g.fillStyle = '#E9ECE9'
      g.beginPath()
      g.ellipse(x * k, (y0 - 0.1) * k, 0.1 * k, 0.05 * k, 0, 0, Math.PI * 2)
      g.ellipse((x + look * 0.08) * k, (y0 - 0.17) * k, 0.035 * k, 0.032 * k, 0, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#98A3A6'
      g.beginPath()
      g.ellipse((x - look * 0.02) * k, (y0 - 0.12) * k, 0.075 * k, 0.03 * k, 0, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#2E3538'
      g.fillRect((x - look * 0.11) * k, (y0 - 0.12) * k, 0.04 * k, 0.025 * k)
      g.strokeStyle = '#C8A04E'
      g.lineWidth = Math.max(1, 0.012 * k)
      g.beginPath()
      g.moveTo((x - 0.02) * k, (y0 - 0.06) * k)
      g.lineTo((x - 0.02) * k, y0 * k)
      g.moveTo((x + 0.02) * k, (y0 - 0.06) * k)
      g.lineTo((x + 0.02) * k, y0 * k)
      g.moveTo((x + look * 0.11) * k, (y0 - 0.17) * k)
      g.lineTo((x + look * 0.15) * k, (y0 - 0.165) * k)
      g.stroke()
      continue
    }
    // In the air: up off the quay beating hard, then wheeling on the wind, the circle drifting downwind.
    const climb = Math.min(s, 0.8)
    const turn = Math.max(0, s - 0.8)
    const r = 0.9 + 0.4 * (i % 3)
    const a0 = i * 1.7
    const a = a0 + turn * (1.1 + 0.15 * i) * dir
    const x = b.x + b.vx * climb + r * (Math.cos(a) - Math.cos(a0)) + 0.5 * turn
    const y = y0 - 0.12 + b.vy * climb + 0.45 * climb * climb + 0.35 * r * (Math.sin(a) - Math.sin(a0))
    if (y < f.y0 - 0.5 || x > f.x1 + 0.5 || x < f.x0 - 0.5) continue
    const span = 0.2
    const beat = Math.sin(s * (s < 0.8 ? 30 : 9) + i)
    const lift = s < 0.8 ? 0.15 + 0.5 * beat : 0.3 + 0.15 * beat
    wings.moveTo((x - span) * k, (y - span * lift) * k)
    wings.quadraticCurveTo((x - span * 0.4) * k, (y - span * 0.3) * k, x * k, y * k)
    wings.quadraticCurveTo((x + span * 0.4) * k, (y - span * 0.3) * k, (x + span) * k, (y - span * lift) * k)
    tips.moveTo((x - span) * k, (y - span * lift) * k)
    tips.lineTo((x - span * 0.75) * k, (y - span * lift * 0.85) * k)
    tips.moveTo((x + span) * k, (y - span * lift) * k)
    tips.lineTo((x + span * 0.75) * k, (y - span * lift * 0.85) * k)
  }
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.lineWidth = Math.max(1.2, 0.03 * k)
  g.strokeStyle = '#E9ECE9'
  g.stroke(wings)
  g.strokeStyle = '#2E3538'
  g.stroke(tips)
}

/* ------------------------------------------------------------------ the boat, from the air */

export function drawBoat(p: p5, k: number, x0: number, t: number): void {
  const g = ctxOf(p)
  drawBoatAbove(g, k, x0, SURF, 0, 0, t)
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
  // The overcast in the glass: one paler band along its top.
  g.fillStyle = rgba(SKY.glassHi, 0.22)
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
  // The strobe on the fin's top: a plain lamp, lit for a moment on every downbeat.
  const s = lastOf(STROBES, t)
  oval(g, k, H.boom.x1 - 0.2, -1.78, 0.055, 0.055, s.ago < 0.16 ? '#FFFFFF' : '#9EA7AA')
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
