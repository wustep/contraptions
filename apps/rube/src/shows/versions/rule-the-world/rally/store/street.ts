import type { Pt } from '../../../../../parts'
import { layer, motes, parallax, shade, type Frame } from '../depth'
import { hash } from '../kit'
import { ctxOf, ellipse, mix, rect, rgba, shape, vgrad, type Pen } from '../pen'
import { T1, WAKE, WIN } from './geo'

/**
 * The street through the store's front window, Lower East Side, before six on a winter morning in 1952: a world going on
 * out there while the store is dark. In layers, each drawn through the glass and moving at its own speed as the camera
 * goes: the sky and a few last stars; the far side of the city low on the horizon and the Williamsburg Bridge strung
 * across it, its deck lamps still lit; the roofs of the blocks behind, water tanks on their legs and a chimney or two
 * smoking; the tenements across the street, waking a window a beat, the bakery's window lit since four; and the street
 * itself, snow coming down through the street lamp's light, steam off a manhole, a milk truck and then a cab going by,
 * whose lamps throw the window's light across the store inside (`life.ts`, `drawPassing`).
 */

/** The street lamp outside, on the pavement in front of the window; its head. */
export const LAMP_POST = -0.45
export const LAMP_HEAD: Pt = [LAMP_POST, -1.6]

/** Where the street's layers lie as they are drawn: the camera's centre through the intro. */
const ANCHOR: Pt = [0.3, -0.5]
/** The far horizon: the bridge's deck and the city's foot. */
const HORIZON = -1.36

/** What goes by in the street: when it comes in at one edge of the glass, which way, how fast (cells a second), and what. */
interface Passing {
  at: number
  dir: 1 | -1
  v: number
  kind: 'milk' | 'cab'
}
const TRAFFIC: Passing[] = [
  { at: 2.2, dir: -1, v: 1.15, kind: 'milk' },
  { at: 6.6, dir: 1, v: 2.3, kind: 'cab' },
]
/** The street layer's depth (the street is a little farther than the glass) and its span across the window, in its cells. */
const STREET_D = 0.93
const ROAD = -0.03
const LANE: [number, number] = [WIN[0] - 0.7, WIN[2] + 0.7]
const LENGTH = { milk: 0.95, cab: 0.82 }

/** Where a passing vehicle's middle is (the street layer's cells), or null while it is not at the window. */
function vehicleX(p: Passing, t: number): number | null {
  const u = t - p.at
  if (u < 0) return null
  const x = p.dir < 0 ? LANE[1] - p.v * u : LANE[0] + p.v * u
  return x < LANE[0] - 0.1 || x > LANE[1] + 0.1 ? null : x
}

/**
 * The light of whatever is passing, for the store inside: how far it has got across the window (0 at its left edge, 1
 * at its right) and how bright its lamps are on the glass (0 to 1). Its lamps lead it, so a truck going left lights the
 * glass from its right edge first.
 */
export function passing(t: number): { u: number; a: number; warm: number } | null {
  for (const p of TRAFFIC) {
    const x = vehicleX(p, t)
    if (x === null) continue
    const u = (x - LANE[0]) / (LANE[1] - LANE[0])
    const a = Math.sin(Math.PI * Math.max(0, Math.min(1, u))) ** 1.5
    return { u, a: a * (p.kind === 'milk' ? 1 : 0.85), warm: p.kind === 'milk' ? 0.6 : 1 }
  }
  return null
}

/** Everything outside, drawn through the glass (the caller clips to it). */
export function drawOutside(pen: Pen, t: number, f: Frame): void {
  const dawn = Math.min(1, t / T1)
  const [x0, y0, x1, y1] = WIN
  const low = mix('#34425A', '#9AA2A6', dawn * 0.6)
  vgrad(pen, x0, y0, x1, y1, [
    [0, mix('#111B2C', '#6B7F8E', dawn * 0.85), 1],
    [0.3, mix('#1C2A3E', '#80909A', dawn * 0.7), 1],
    [0.45, low, 1],
    [1, mix('#24303A', '#4E5A62', dawn * 0.6), 1],
  ])
  /** The window's box in a layer's own cells: what of the layer can be seen. */
  const seen = (d: number): [number, number, number, number] => {
    const [dx, dy] = parallax(f, d, ANCHOR)
    return [x0 - dx, y0 - dy, x1 - dx, y1 - dy]
  }
  layer(pen, f, 0.1, () => stars(pen, seen(0.1), dawn), ANCHOR)
  layer(pen, f, 0.2, () => city(pen, t, seen(0.2), low), ANCHOR)
  layer(pen, f, 0.3, () => bridge(pen, t, seen(0.3), low), ANCHOR)
  layer(pen, f, 0.55, () => roofs(pen, t, seen(0.55), low, dawn), ANCHOR)
  layer(pen, f, 0.85, () => across(pen, t, seen(0.85), dawn), ANCHOR)
  layer(pen, f, STREET_D, () => street(pen, t, seen(STREET_D), dawn), ANCHOR)
}

type Box = [number, number, number, number]

/** A few last stars, faint and still over the city's glow, going as the sky greys. */
function stars(pen: Pen, w: Box, dawn: number): void {
  const fade = Math.max(0, 1 - dawn * 3.2)
  if (fade <= 0.02) return
  const { k } = pen
  const ctx = ctxOf(pen.p)
  ctx.save()
  ctx.fillStyle = rgba(pen, '#C8D0DC', 0.4 * fade)
  ctx.beginPath()
  for (let i = 0; i < 14; i++) {
    const x = -4 + 8 * hash(i, 3, 41)
    const y = -2.65 + 0.85 * hash(i, 4, 41)
    if (x < w[0] || x > w[2] || y < w[1] || y > w[3]) continue
    const r = 0.003 + 0.004 * hash(i, 6, 41)
    ctx.moveTo((x + r) * k, y * k)
    ctx.arc(x * k, y * k, Math.max(0.5, r * k), 0, Math.PI * 2)
  }
  ctx.fill()
  ctx.restore()
}

/** The far side of the city on the horizon: blocks and a few towers in the haze, a light or two still on. */
function city(pen: Pen, t: number, w: Box, low: string): void {
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const W = 0.24
  const n0 = Math.floor(w[0] / W) - 1
  const n1 = Math.ceil(w[2] / W) + 1
  ctx.save()
  ctx.fillStyle = rgba(pen, mix(low, '#0A0F16', 0.3), 1)
  ctx.beginPath()
  const lit: number[] = []
  for (let n = n0; n <= n1; n++) {
    const h1 = hash(n, 1, 51)
    const tall = hash(n, 2, 51) > 0.86 ? 0.2 + 0.12 * hash(n, 3, 51) : 0
    const top = HORIZON - 0.04 - 0.13 * h1 - tall
    const x = n * W
    ctx.rect(x * k, top * k, (W + 0.01) * k, (HORIZON + 0.4 - top) * k)
    if (tall) {
      // A setback crown on the tall ones.
      ctx.rect((x + W * 0.3) * k, (top - 0.06) * k, W * 0.4 * k, 0.07 * k)
      lit.push(x + W * 0.5, top - 0.075)
    }
    for (let j = 0; j < 2; j++) if (hash(n, j, 52) > 0.7) lit.push(x + 0.04 + 0.16 * hash(n, j, 53), top + 0.04 + 0.08 * hash(n, j, 54))
  }
  ctx.fill()
  // Their lights: a few windows, and the towers' red lamps, slow.
  ctx.fillStyle = rgba(pen, '#E8D6A8', 0.55)
  ctx.beginPath()
  for (let i = 0; i < lit.length; i += 2) {
    if (i % 4 === 0) continue
    ctx.rect((lit[i] - 0.006) * k, (lit[i + 1] - 0.006) * k, 0.012 * k, 0.012 * k)
  }
  ctx.fill()
  ctx.fillStyle = rgba(pen, '#C8402E', 0.45 + 0.4 * Math.max(0, Math.sin(t * 2.4)))
  ctx.beginPath()
  for (let i = 0; i < lit.length; i += 4) {
    ctx.moveTo((lit[i] + 0.01) * k, lit[i + 1] * k)
    ctx.arc(lit[i] * k, lit[i + 1] * k, Math.max(0.6, 0.01 * k), 0, Math.PI * 2)
  }
  ctx.fill()
  ctx.restore()
}

/** The Williamsburg Bridge across the horizon: its two steel towers, the cables slung between, the deck lamps lit. */
const TOWERS = [0.15, -3.55]
const TOP = -1.9
const DECK = HORIZON - 0.02
const SAG = -1.47
const SIDE = 1.7
function cableY(x: number): number {
  const [a, b] = TOWERS
  if (x <= a && x >= b) {
    const mid = (a + b) / 2
    const u = (x - mid) / ((a - b) / 2)
    return SAG + (TOP - SAG) * u * u
  }
  const s = x > a ? (x - a) / SIDE : (b - x) / SIDE
  return TOP + (DECK - 0.01 - TOP) * Math.min(1, s) + 0.07 * s * (1 - s)
}
function bridge(pen: Pen, t: number, w: Box, low: string): void {
  const [a, b] = TOWERS
  const xa = Math.max(w[0], b - SIDE)
  const xb = Math.min(w[2], a + SIDE)
  if (xb <= xa) return
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const ink = mix(low, '#0A0F16', 0.5)
  ctx.save()
  ctx.strokeStyle = rgba(pen, ink, 1)
  ctx.fillStyle = rgba(pen, ink, 1)
  // The deck.
  ctx.fillRect(xa * k, DECK * k, (xb - xa) * k, 0.03 * k)
  // The cable and the suspenders off it.
  ctx.lineWidth = Math.max(1, pen.w * 0.7)
  ctx.beginPath()
  for (let x = xa; x <= xb + 1e-6; x += 0.05) {
    const y = cableY(x)
    if (x === xa) ctx.moveTo(x * k, y * k)
    else ctx.lineTo(x * k, y * k)
  }
  ctx.stroke()
  ctx.lineWidth = Math.max(0.6, pen.w * 0.25)
  ctx.beginPath()
  for (let x = Math.ceil(xa / 0.09) * 0.09; x < xb; x += 0.09) {
    const y = cableY(x)
    if (y > DECK - 0.015) continue
    ctx.moveTo(x * k, y * k)
    ctx.lineTo(x * k, DECK * k)
  }
  ctx.stroke()
  // The towers: two legs braced in panels, a cap.
  ctx.lineWidth = Math.max(0.6, pen.w * 0.35)
  for (const tx of TOWERS) {
    if (tx + 0.12 < w[0] || tx - 0.12 > w[2]) continue
    ctx.fillRect((tx - 0.085) * k, (TOP - 0.02) * k, 0.035 * k, (DECK + 0.25 - TOP) * k)
    ctx.fillRect((tx + 0.05) * k, (TOP - 0.02) * k, 0.035 * k, (DECK + 0.25 - TOP) * k)
    ctx.fillRect((tx - 0.1) * k, (TOP - 0.04) * k, 0.2 * k, 0.035 * k)
    ctx.beginPath()
    const panels = 3
    const ph = (DECK - TOP) / panels
    for (let i = 0; i < panels; i++) {
      const ya = TOP + i * ph
      ctx.moveTo((tx - 0.05) * k, ya * k)
      ctx.lineTo((tx + 0.05) * k, (ya + ph) * k)
      ctx.moveTo((tx + 0.05) * k, ya * k)
      ctx.lineTo((tx - 0.05) * k, (ya + ph) * k)
    }
    ctx.stroke()
  }
  // The deck lamps, a string of them, one or two out.
  ctx.fillStyle = rgba(pen, '#F0C878', 0.65)
  ctx.beginPath()
  for (let i = Math.ceil(xa / 0.14); i * 0.14 < xb; i++) {
    const x = i * 0.14
    if (hash(i, 0, 61) <= 0.12) continue
    const r = 0.009
    ctx.moveTo((x + r) * k, (DECK - 0.012) * k)
    ctx.arc(x * k, (DECK - 0.012) * k, Math.max(0.6, r * k), 0, Math.PI * 2)
  }
  ctx.fill()
  // The red lamp on the near tower's top, slow.
  const blink = Math.max(0, Math.sin((t + 0.4) * 1.9)) ** 2
  ctx.fillStyle = rgba(pen, '#C8402E', 0.25 + 0.6 * blink)
  ctx.beginPath()
  ctx.arc(a * k, (TOP - 0.06) * k, Math.max(0.8, 0.013 * k), 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** The roofs of the blocks behind: parapets, water tanks on their legs, chimneys, two of them smoking; far snow. */
function roofs(pen: Pen, t: number, w: Box, low: string, dawn: number): void {
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const ink = mix(low, '#0A0F16', 0.64)
  const W = 0.72
  const n0 = Math.floor(w[0] / W) - 1
  const n1 = Math.ceil(w[2] / W) + 1
  ctx.save()
  ctx.fillStyle = rgba(pen, ink, 1)
  ctx.strokeStyle = rgba(pen, ink, 1)
  ctx.lineWidth = Math.max(0.6, pen.w * 0.4)
  ctx.beginPath()
  const chimneys: [number, number, number][] = []
  for (let n = n0; n <= n1; n++) {
    const x = n * W
    const top = -1.26 - 0.12 * hash(n, 1, 71)
    ctx.rect(x * k, top * k, (W + 0.01) * k, (0.6) * k)
    // A water tank: a barrel on stilts, a cone for a lid.
    if (hash(n, 2, 71) > 0.45) {
      const tx = x + 0.15 + (W - 0.3) * hash(n, 3, 71)
      const tb = top - 0.07
      ctx.rect((tx - 0.07) * k, (tb - 0.14) * k, 0.14 * k, 0.14 * k)
      ctx.moveTo((tx - 0.085) * k, (tb - 0.14) * k)
      ctx.lineTo(tx * k, (tb - 0.21) * k)
      ctx.lineTo((tx + 0.085) * k, (tb - 0.14) * k)
      ctx.closePath()
      ctx.rect((tx - 0.06) * k, tb * k, 0.014 * k, 0.075 * k)
      ctx.rect((tx + 0.046) * k, tb * k, 0.014 * k, 0.075 * k)
    }
    if (hash(n, 4, 71) > 0.35) {
      const cx = x + 0.1 + (W - 0.2) * hash(n, 5, 71)
      ctx.rect((cx - 0.025) * k, (top - 0.09) * k, 0.05 * k, 0.1 * k)
      if (hash(n, 6, 71) > 0.55) chimneys.push([cx, top - 0.09, n])
    }
  }
  ctx.fill()
  ctx.restore()
  // Two chimneys smoking, bent over by the wind.
  for (const [cx, cy, n] of chimneys) plume(pen, t, [cx, cy], { seed: 80 + n, n: 18, life: 4.2, rise: 0.55, wind: 0.45, size: [0.025, 0.1], color: mix('#55606C', '#8A949C', dawn), alpha: 0.22 })
  // Far snow, small and slow.
  motes(pen, t, { n: 60, seed: 91, box: [-4.6, -3.8, 1.2, 0.2], size: [0.004, 0.009], color: '#C8D2DC', alpha: 0.42, drift: [0.05, 0.2], wander: 0.06, twinkle: 0.2 })
}

/**
 * The tenements across the street: three fronts, their rooflines, two rows of windows. A few are lit all night; the rest
 * wake on the intro's beats (`WAKE`), a light switched on in each; in one a figure crosses, in another a shade comes
 * down. On the ground floor the shops are shuttered but the bakery, lit since four, its baker going to and fro.
 */
const FRONTS: [number, number, number][] = [
  [-4.6, -1.33, -1.2],
  [-1.33, -0.55, -1.32],
  [-0.55, 2.4, -1.17],
]
const roofAt = (x: number) => (FRONTS.find((b) => x < b[1]) ?? FRONTS[FRONTS.length - 1])[2]
const winX = (i: number) => WIN[0] + 0.15 + i * 0.37
const winY = (i: number, j: number) => roofAt(winX(i) + 0.08) + 0.17 + j * 0.33
const WIN_H = 0.21
const SHOP = -0.4
const BAKERY: [number, number] = [-2.28, -1.92]
function across(pen: Pen, t: number, w: Box, dawn: number): void {
  const face = mix('#1B242C', '#38444C', dawn * 0.6)
  const cornice = mix('#0D1218', '#2A3238', dawn)
  for (const [a, b, roof] of FRONTS) {
    if (b < w[0] || a > w[2]) continue
    rect(pen, a, roof, b, w[3] + 0.3, mix(face, '#000000', a < -1.4 ? 0.08 : a < -0.6 ? 0 : 0.14))
    rect(pen, a, roof - 0.03, b, roof + 0.05, cornice)
    rect(pen, a, roof + 0.09, b, roof + 0.11, cornice)
  }
  // The windows.
  const dark = mix('#111921', '#2A343C', dawn)
  const warm = mix('#D9A85A', '#8E8A78', dawn * 0.7)
  for (let i = -4; i < 12; i++) {
    const wx = winX(i)
    if (wx + 0.16 < w[0] || wx > w[2]) continue
    for (let j = 0; j < 2; j++) {
      const wy = winY(i, j)
      const wake = WAKE.find((q) => q[1] === i && q[2] === j)
      const u = wake ? t - wake[0] : -1
      const on = hash(i, j, 7) > 0.8 ? 1 : u < 0 ? 0 : u < 0.05 ? 1 : u < 0.1 ? 0.3 : 1
      rect(pen, wx, wy, wx + 0.16, wy + WIN_H, mix(dark, warm, on))
      // Sills.
      rect(pen, wx - 0.02, wy + WIN_H, wx + 0.18, wy + WIN_H + 0.02, cornice)
      // A figure crossing the room in one; a shade coming down in another.
      if (i === 3 && j === 1 && u > 0) figure(pen, wx, wy, t, [wake![0] + 0.5, wake![0] + 2.0])
      if (i === 6 && j === 0 && u > 0) {
        const down = Math.min(1, Math.max(0, (t - wake![0] - 1.8) / 0.4))
        if (down > 0) rect(pen, wx, wy, wx + 0.16, wy + 0.11 * down, mix('#8A6A3A', '#6E6A5A', dawn))
      }
    }
  }
  // The fire escape on the right-hand front: its landings at the windows' feet, the ladders between.
  const fx0 = -0.48
  const fx1 = 0.32
  for (let j = 0; j < 2; j++) {
    const y = winY(6, j) + WIN_H + 0.03
    rect(pen, fx0, y - 0.015, fx1, y + 0.01, cornice)
    for (let x = fx0; x <= fx1 + 1e-6; x += 0.1) rect(pen, x - 0.004, y - 0.09, x + 0.004, y, cornice)
    rect(pen, fx0, y - 0.095, fx1, y - 0.085, cornice)
    shape(pen, [[fx0 + 0.06, y], [fx0 + 0.1, y], [fx1 - 0.08, y - 0.33], [fx1 - 0.12, y - 0.33]], cornice)
  }
  // The ground floor: shuttered shopfronts, and the bakery.
  rect(pen, w[0] - 0.1, SHOP - 0.03, w[2] + 0.1, SHOP, cornice)
  rect(pen, w[0] - 0.1, SHOP, w[2] + 0.1, -0.16, mix('#121820', '#2A3036', dawn))
  for (let x = Math.floor(w[0] / 0.6) * 0.6; x < w[2]; x += 0.6) {
    if (x + 0.5 > BAKERY[0] - 0.05 && x < BAKERY[1] + 0.05) continue
    for (let y = SHOP + 0.04; y < -0.2; y += 0.035) rect(pen, x + 0.06, y, x + 0.5, y + 0.012, mix('#1C242C', '#3A4248', dawn))
  }
  const [b0, b1] = BAKERY
  rect(pen, b0, SHOP + 0.03, b1, -0.2, mix('#D9A25A', '#B49A70', dawn * 0.5))
  // The baker, to and fro behind the glass with his trays.
  const bx = b0 + 0.08 + 0.2 * (0.5 + 0.5 * Math.sin(t * 0.55))
  rect(pen, bx - 0.035, SHOP + 0.09, bx + 0.035, -0.2, '#3A2A1C')
  ellipse(pen, [bx, SHOP + 0.075], 0.025, 0.028, '#3A2A1C')
  rect(pen, bx - 0.03, SHOP + 0.035, bx + 0.03, SHOP + 0.06, '#E8E0CC')
  rect(pen, b0 - 0.02, SHOP + 0.02, b1 + 0.02, SHOP + 0.035, '#2A2018')
  // Its light out on the snow of the pavement in front.
  shade(pen, [(b0 + b1) / 2, -0.15], 0.4, 0.05, '#FFC872', 0.3)
}

/** Someone crossing a lit room: head and shoulders behind the glass, between `span`. */
function figure(pen: Pen, wx: number, wy: number, t: number, span: [number, number]): void {
  const u = (t - span[0]) / (span[1] - span[0])
  if (u < 0 || u > 1) return
  const x = wx - 0.06 + 0.28 * u
  const { k } = pen
  const ctx = ctxOf(pen.p)
  ctx.save()
  ctx.beginPath()
  ctx.rect(wx * k, wy * k, 0.16 * k, WIN_H * k)
  ctx.clip()
  ctx.fillStyle = rgba(pen, '#2A1E14', 0.85)
  ctx.beginPath()
  ctx.ellipse(x * k, (wy + 0.1) * k, 0.03 * k, 0.036 * k, 0, 0, Math.PI * 2)
  ctx.rect((x - 0.06) * k, (wy + 0.14) * k, 0.12 * k, 0.12 * k)
  ctx.fill()
  ctx.restore()
}

/** The street: the far pavement, the road with its tyre tracks in the snow, steam off a manhole, what goes by, near snow. */
const MANHOLE: Pt = [0.18, ROAD - 0.02]
function street(pen: Pen, t: number, w: Box, dawn: number): void {
  const snowy = mix('#3A4652', '#7A848C', dawn * 0.6)
  rect(pen, w[0] - 0.1, -0.17, w[2] + 0.1, -0.13, mix('#4A5560', '#8A929A', dawn * 0.6))
  rect(pen, w[0] - 0.1, -0.13, w[2] + 0.1, w[3] + 0.3, snowy)
  // The tracks of whatever went by before.
  for (const y of [-0.07, -0.035, 0.01]) rect(pen, w[0] - 0.1, y, w[2] + 0.1, y + 0.012, mix('#262E36', '#4A5258', dawn * 0.6))
  ellipse(pen, MANHOLE, 0.12, 0.018, mix('#1A2026', '#3A4248', dawn * 0.6))
  // The street lamp's pool on the snow.
  shade(pen, [LAMP_POST, -0.06], 0.6, 0.1, '#E8C27A', 0.24 * (1 - 0.6 * dawn))
  // Steam off the manhole, lit from under by the lamp.
  plume(pen, t, MANHOLE, { seed: 7, n: 54, life: 3.6, rise: 1.5, wind: 0.3, size: [0.05, 0.24], color: mix('#7A8692', '#A6AEB4', dawn), hot: '#C9B48A', alpha: 0.085 })
  for (const p of TRAFFIC) {
    const x = vehicleX(p, t)
    if (x !== null) vehicle(pen, x, p)
  }
  // Near snow, larger and quicker, bright where it falls through the lamp's light or a passing vehicle's.
  const pass = passing(t)
  const head = LAMP_HEAD
  motes(pen, t, {
    n: 48,
    seed: 92,
    box: [-2.9, -2.8, 1.0, 0.2],
    size: [0.008, 0.017],
    color: '#E4EAF0',
    alpha: 0.7,
    drift: [0.09, 0.42],
    wander: 0.1,
    twinkle: 0.15,
    light: (x, y) => {
      const d2 = (x - head[0]) ** 2 + (y - head[1]) ** 2
      let L = 0.32 + 0.68 * Math.exp(-d2 / 0.3)
      if (pass) L += 0.5 * pass.a * Math.exp(-(((y - ROAD + 0.3) / 0.35) ** 2))
      return Math.min(1, L)
    },
  })
}

/** A milk truck, boxy and cream, or a cab, dark and rounded: on its wheels, its lamps leading, a red lamp behind. */
function vehicle(pen: Pen, x: number, p: Passing): void {
  const S = p.kind === 'milk' ? 1.3 : 1.4
  const L = LENGTH[p.kind] * S
  const d = p.dir
  const nose = x + (d * L) / 2
  const tail = x - (d * L) / 2
  const at = (u: number) => x + d * (u - 0.5) * L
  const lo = (u0: number, u1: number) => Math.min(at(u0), at(u1))
  const hi = (u0: number, u1: number) => Math.max(at(u0), at(u1))
  const base = ROAD - 0.06
  const Y = (v: number) => base - v * S
  if (p.kind === 'milk') {
    const body = '#56544E'
    // The box, its cab rounded at the front, a door slid open on its side; the street lamp along its roof's edge.
    shape(pen, [[at(0), base], [at(1), base], [at(1), Y(0.32)], [at(0.93), Y(0.41)], [at(0.78), Y(0.44)], [at(0.78), Y(0.46)], [at(0), Y(0.46)]], body)
    rect(pen, lo(0, 1), Y(0.14), hi(0, 1), base, '#3A3A38')
    rect(pen, lo(0.03, 0.75), Y(0.4), hi(0.03, 0.75), Y(0.37), '#46443F')
    rect(pen, lo(0.03, 0.75), Y(0.2), hi(0.03, 0.75), Y(0.17), '#46443F')
    for (const u of [0.2, 0.4]) rect(pen, at(u) - 0.006, Y(0.36), at(u) + 0.006, Y(0.2), '#46443F')
    rect(pen, lo(0, 0.78), Y(0.46), hi(0, 0.78), Y(0.44), '#8A8678')
    // The windscreen, a little cab light on in it, the milkman's shape at the wheel; crates through the open door.
    shape(pen, [[at(0.8), Y(0.41)], [at(0.92), Y(0.39)], [at(0.98), Y(0.3)], [at(0.8), Y(0.3)]], '#4A3E26')
    ellipse(pen, [at(0.86), Y(0.33)], 0.03, 0.035, '#1A140E')
    ellipse(pen, [at(0.88), Y(0.39)], 0.012, 0.008, '#E8C27A')
    rect(pen, lo(0.6, 0.72), Y(0.34), hi(0.6, 0.72), Y(0.1), '#2A2620')
    for (let i = 0; i < 3; i++) rect(pen, lo(0.61, 0.71), Y(0.12 + i * 0.07), hi(0.61, 0.71), Y(0.1 + i * 0.07), '#9A9484')
  } else {
    const body = '#2E3236'
    shape(pen, [[at(0), base], [at(1), base], [at(1), Y(0.12)], [at(0.82), Y(0.15)], [at(0.68), Y(0.27)], [at(0.3), Y(0.27)], [at(0.16), Y(0.15)], [at(0), Y(0.12)]], body)
    shape(pen, [[at(0.33), Y(0.24)], [at(0.48), Y(0.24)], [at(0.48), Y(0.15)], [at(0.22), Y(0.15)]], '#1A2028')
    shape(pen, [[at(0.52), Y(0.24)], [at(0.66), Y(0.24)], [at(0.78), Y(0.15)], [at(0.52), Y(0.15)]], '#1A2028')
    rect(pen, lo(0.02, 0.98), Y(0.07), hi(0.02, 0.98), Y(0.055), '#8A8E90')
    // Its roof light, lit: off duty, going home.
    rect(pen, at(0.49) - 0.05, Y(0.31), at(0.49) + 0.05, Y(0.27), '#E8D8A0')
  }
  // The wheels, turning.
  for (const u of [0.18, 0.82]) {
    const c: Pt = [at(u), ROAD - 0.06]
    const r = 0.065 * S
    ellipse(pen, c, r, r, '#0E1012')
    ellipse(pen, c, r * 0.45, r * 0.45, '#5A5E60')
    const a = (x / r) * d
    ellipse(pen, [c[0] + Math.cos(a) * r * 0.3, c[1] + Math.sin(a) * r * 0.3], r * 0.1, r * 0.1, '#1A1C1E')
  }
  // The lamps: its headlamp leading and its light on the snow ahead; a red lamp at the tail.
  const hy = Y(0.09)
  shade(pen, [nose + d * 0.5, ROAD - 0.02], 0.55, 0.05, '#FFE6B0', 0.28)
  ellipse(pen, [nose, hy], 0.03, 0.035, '#FFF2CC')
  ellipse(pen, [tail, hy], 0.018, 0.02, '#C0392B')
}

interface Plume {
  seed: number
  n: number
  /** A puff's life, seconds; how high it goes in it; how far the wind takes it sideways (cells, + to the right). */
  life: number
  rise: number
  wind: number
  size: [number, number]
  color: string
  /** The colour of a young puff, low down, if lit differently. */
  hot?: string
  alpha: number
}

/** Smoke or steam off a point: puffs rising, swelling and fading, leaning over with the wind. A few fills. */
export function plume(pen: Pen, t: number, from: Pt, o: Plume): void {
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const STEPS = 4
  ctx.save()
  for (const young of [false, true]) {
    if (young && !o.hot) continue
    const col = young ? o.hot! : o.color
    const buckets: number[][] = Array.from({ length: STEPS }, () => [])
    for (let i = 0; i < o.n; i++) {
      const h1 = hash(i, o.seed, 31)
      const h2 = hash(i, o.seed, 32)
      const life = o.life * (0.75 + 0.5 * h2)
      const u = (((t / life + h1) % 1) + 1) % 1
      if (o.hot && (u < 0.3) !== young) continue
      const gen = Math.floor(t / life + h1)
      const j = hash(i, gen, o.seed + 33) - 0.5
      const x = from[0] + o.wind * u ** 1.6 + j * 0.06 * (1 + 3 * u) + 0.03 * Math.sin(u * 7 + i)
      const y = from[1] - o.rise * u * (0.8 + 0.4 * h2)
      const a = Math.min(1, u * 7) * (1 - u) ** 1.4
      if (a <= 0.03) continue
      const r = o.size[0] + (o.size[1] - o.size[0]) * u
      buckets[Math.min(STEPS - 1, Math.floor(a * STEPS))].push(x * k, y * k, r * k)
    }
    for (let b = 0; b < STEPS; b++) {
      const list = buckets[b]
      if (!list.length) continue
      ctx.fillStyle = rgba(pen, col, o.alpha * ((b + 0.6) / STEPS))
      ctx.beginPath()
      for (let i = 0; i < list.length; i += 3) {
        ctx.moveTo(list[i] + list[i + 2], list[i + 1])
        ctx.arc(list[i], list[i + 1], Math.max(0.6, list[i + 2]), 0, Math.PI * 2)
      }
      ctx.fill()
    }
  }
  ctx.restore()
}

/** Whether the window, and the street through it, is in the frame. */
export const windowSeen = (f: Frame): boolean => f.x0 < WIN[2] + 0.2 && f.x1 > WIN[0] - 0.2 && f.y0 < WIN[3] && f.y1 > WIN[1]
