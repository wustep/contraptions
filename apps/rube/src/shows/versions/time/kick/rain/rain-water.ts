import { mixHex, type Pt } from '../../../../../parts'
import { beam, bloom, rgba } from '../cast'
import { hash } from '../kit'
import { BAND, RAIN_GEO, SPLASH, clock, rate, vanAt } from '../stack'
import { RAIN } from '../worlds'
import { QUAY_L, QUAY_R, seen, type Pen, type View } from './rain-city'
import { eff, sm, vanPoint } from './rain-geo'

/**
 * The rain, and the river. The rain falls on the rain's own clock: while he is in the rain it falls in long soft
 * streaks; while he is deeper it all but stops, and each drop hangs in the air as a short streak with a bead of light at
 * its head (the time a level above him is twenty times slower). It is drawn at a density held to the frame, so a wide
 * of the whole stack costs what a close shot does. The river is drawn over the balls, so whoever is in it is seen
 * through the water; the van's splash, the show's biggest, is here too.
 */

const SLANT = -0.21
const TILE = 4
/** Where the rain stops falling: the street and the far bank at 0, the river at its surface. */
const groundAt = (x: number): number => (x < QUAY_L || x > QUAY_R + 1 ? 0 : RAIN_GEO.river)

/** The rain; with `tint`, only the drops, lit (the caller clips them to a beam). */
export function drawRain(pen: Pen, f: View, t: number, tint?: { color: string; a: number }): void {
  const { ctx, k } = pen
  const top = BAND.rain.top
  const y0 = Math.max(top + 0.4, f.y0 - 1)
  const y1 = Math.min(RAIN_GEO.river, f.y1 + 1)
  if (y1 <= y0) return
  const c = clock('rain', t)
  const r = Math.min(1, rate('rain', t))
  const run = Math.sqrt(r)
  const still = 1 - run
  // Sheets: broad soft slanted bands of heavier rain drifting through, the rain's volume at any distance; only in
  // the air (over the street, and down over the river).
  if (!tint) {
  ctx.save()
  ctx.beginPath()
  ctx.rect((f.x0 - 2) * k, y0 * k, (f.x1 - f.x0 + 4) * k, (Math.min(0, y1) - y0) * k)
  if (y1 > 0) ctx.rect(QUAY_L * k, 0, (QUAY_R + 1 - QUAY_L) * k, y1 * k)
  ctx.clip()
  for (let i = 0; i < 7; i++) {
    const span = 70
    const x = f.x0 - 10 + ((hash(i, 1, 5) * span + c * (0.9 + 0.5 * hash(i, 2, 5))) % span) * ((f.x1 - f.x0 + 20) / span)
    const wide = 2.5 + 4 * hash(i, 3, 5)
    const h = y1 - y0
    const g = ctx.createLinearGradient((x - wide) * k, 0, (x + wide) * k, 0)
    const a = 0.05 + 0.04 * hash(i, 4, 5)
    g.addColorStop(0, rgba(RAIN.rain, 0))
    g.addColorStop(0.5, rgba(RAIN.rain, a))
    g.addColorStop(1, rgba(RAIN.rain, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo((x - wide) * k, y0 * k)
    ctx.lineTo((x + wide) * k, y0 * k)
    ctx.lineTo((x + wide + SLANT * h) * k, y1 * k)
    ctx.lineTo((x - wide + SLANT * h) * k, y1 * k)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  }
  // The drops, held to a density the frame can afford.
  const area = (f.x1 - f.x0 + 2) * (y1 - y0)
  const per = Math.min(4.2, 1500 / Math.max(1, area)) * TILE * TILE
  const n = Math.max(1, Math.round(per))
  const lenK = 0.24 + 0.76 * run
  const minL = 2.6 / k
  const layers = [new Path2D(), new Path2D(), new Path2D()]
  const beads = new Path2D()
  const bead = still > 0.05 && k > 9
  const tx0 = Math.floor((f.x0 - 2) / TILE)
  const tx1 = Math.floor((f.x1 + 2) / TILE)
  const ty0 = Math.floor(y0 / TILE)
  const ty1 = Math.floor(y1 / TILE)
  for (let tx = tx0; tx <= tx1; tx++) {
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let j = 0; j < n; j++) {
        const id = ty * 131 + j
        const h1 = hash(tx, id, 7)
        const h2 = hash(tx, id, 8)
        const h3 = hash(tx, id, 9)
        const v = 11 + 6 * h3
        const dy = (((h2 * TILE + v * c) % TILE) + TILE) % TILE
        const y = ty * TILE + dy
        const slant = SLANT + (hash(tx, id, 11) - 0.5) * 0.06
        const x = tx * TILE + h1 * TILE + slant * dy
        if (y < top + 0.3 || y > groundAt(x) || x < f.x0 - 1 || x > f.x1 + 1 || y < f.y0 - 1 || y > f.y1 + 1) continue
        const layer = h3 < 0.25 ? 0 : h3 < 0.65 ? 1 : 2
        const L = Math.max(minL, (0.2 + 0.75 * hash(tx, id, 10)) * lenK * (layer === 0 ? 1 : layer === 1 ? 0.75 : 0.55))
        const path = layers[layer]
        path.moveTo(x * k, y * k)
        path.lineTo((x - slant * L) * k, (y - L) * k)
        if (bead && layer === 0) {
          beads.moveTo(x * k, y * k)
          beads.lineTo(x * k, (y + 0.004) * k)
        }
      }
    }
  }
  ctx.save()
  ctx.lineCap = 'round'
  const widths = [0.018, 0.013, 0.01]
  const alphas = [0.4, 0.27, 0.16]
  const color = tint ? mixHex(RAIN.rain, tint.color, 0.55) : RAIN.rain
  const boost = tint ? 2.4 * tint.a : 1
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = rgba(color, Math.min(1, alphas[i] * (1 + 0.3 * still) * boost))
    ctx.lineWidth = Math.max(0.6, widths[i] * k)
    ctx.stroke(layers[i])
  }
  if (bead) {
    ctx.strokeStyle = rgba(mixHex(RAIN.rain, RAIN.window, 0.5), 0.55 * still)
    ctx.lineWidth = Math.max(1.1, 0.03 * k)
    ctx.stroke(beads)
  }
  ctx.restore()
}

/** Where the rain hits: small crowns of spray on the street, the deck and the river's surface. */
export function drawTicks(pen: Pen, f: View, t: number): void {
  const { ctx, k } = pen
  if (k < 14) return
  const c = clock('rain', t)
  const x0 = Math.floor(f.x0 - 1)
  const x1 = Math.ceil(f.x1 + 1)
  const path = new Path2D()
  const per = 5
  for (let i = x0 * per; i <= x1 * per; i++) {
    const x = i / per + hash(i, 1, 13) / per
    const g = x < QUAY_L || x > QUAY_R + 1 ? 0 : x < RAIN_GEO.deckEnd && hash(i, 4, 13) < 0.5 ? 0 : RAIN_GEO.river
    if (g < f.y0 - 0.2 || g > f.y1 + 0.2) continue
    const ph = (c * (1.6 + hash(i, 2, 13)) + hash(i, 3, 13)) % 1
    if (ph > 0.28) continue
    const u = ph / 0.28
    const h = 0.09 * Math.sin(Math.PI * u)
    const s = 0.04 + 0.05 * u
    path.moveTo((x - s) * k, (g - h * 0.6) * k)
    path.lineTo(x * k, g * k)
    path.lineTo((x + s) * k, (g - h * 0.6) * k)
  }
  ctx.save()
  ctx.strokeStyle = rgba(RAIN.rain, 0.5)
  ctx.lineWidth = Math.max(0.7, 0.012 * k)
  ctx.stroke(path)
  ctx.restore()
}

/* ------------------------------------------------------------------ the river, over the balls */

const E_SPLASH = eff(SPLASH)
/** Where the van's nose meets the water. */
const IMPACT: Pt = [vanPoint(vanAt(SPLASH), 1.05, 0.2)[0], RAIN_GEO.river]

/** The surface's height at `x`: small waves on the rain's clock, and the surge the van throws up. */
export function surfaceAt(x: number, t: number): number {
  const c = clock('rain', t)
  let y = RAIN_GEO.river + 0.03 * Math.sin(x * 1.7 + c * 1.1) + 0.02 * Math.sin(x * 3.3 - c * 1.9)
  const a = eff(t) - E_SPLASH
  if (a > 0 && a < 6) {
    const reach = 0.8 + 2.6 * a
    y -= 0.32 * Math.exp(-a / 1.4) * Math.exp(-(((x - IMPACT[0]) / reach) ** 2)) * Math.cos((x - IMPACT[0]) * 1.8 - a * 3)
  }
  return y
}

/** The river's water, over whatever is in it; its surface; light coming down through it; the van's bubbles. */
export function overRiver(pen: Pen, f: View, t: number): void {
  const { ctx, k } = pen
  if (!seen(f, QUAY_L, QUAY_R, RAIN_GEO.river - 0.6, RAIN_GEO.bed)) return
  const x0 = Math.max(QUAY_L, f.x0 - 1)
  const x1 = Math.min(QUAY_R, f.x1 + 1)
  const step = Math.max(0.12, 3 / k)
  const body = new Path2D()
  body.moveTo(x0 * k, RAIN_GEO.bed * k)
  for (let x = x0; x <= x1 + step; x += step) body.lineTo(Math.min(x, x1) * k, surfaceAt(Math.min(x, x1), t) * k)
  body.lineTo(x1 * k, RAIN_GEO.bed * k)
  body.closePath()
  const g = ctx.createLinearGradient(0, RAIN_GEO.river * k, 0, RAIN_GEO.bed * k)
  g.addColorStop(0, rgba(RAIN.river, 0.4))
  g.addColorStop(0.5, rgba(mixHex(RAIN.river, RAIN.street, 0.2), 0.55))
  g.addColorStop(1, rgba(mixHex(RAIN.river, RAIN.street, 0.45), 0.72))
  ctx.save()
  ctx.fillStyle = g
  ctx.fill(body)
  // Light down through it, the rays drifting: only close enough to see.
  if (k > 9) {
    ctx.clip(body)
    const c = clock('rain', t)
    for (let i = 0; i < 9; i++) {
      const x = x0 + ((hash(i, 1, 17) * 60 + c * 0.25) % 60)
      if (x < f.x0 - 2 || x > f.x1 + 2) continue
      beam(pen.p, k, [x, RAIN_GEO.river], [x - 0.9, RAIN_GEO.bed], 0.5, 1.6, RAIN.riverLight, 0.1 + 0.05 * Math.sin(c * 0.7 + i))
    }
  }
  ctx.restore()
  // The surface: a pale line where it meets the air, and the air's grey on it.
  const line = new Path2D()
  for (let x = x0; x <= x1 + step; x += step) {
    const xx = Math.min(x, x1)
    if (x === x0) line.moveTo(xx * k, surfaceAt(xx, t) * k)
    else line.lineTo(xx * k, surfaceAt(xx, t) * k)
  }
  ctx.save()
  ctx.strokeStyle = rgba(RAIN.riverLight, 0.9)
  ctx.lineWidth = Math.max(1, 0.045 * k)
  ctx.stroke(line)
  ctx.restore()
  bubbles(pen, f, t)
}

/** The van's air going up out of it as it sinks: small, many, never ball-sized. */
function bubbles(pen: Pen, f: View, t: number): void {
  const a = eff(t) - E_SPLASH
  if (a < 0.2 || a > 14 || pen.k < 8) return
  const { ctx, k } = pen
  ctx.save()
  ctx.fillStyle = rgba(RAIN.window, 0.5)
  for (let i = 0; i < 40; i++) {
    const born = hash(i, 1, 19) * 9
    const age = a - 0.2 - born
    if (age < 0 || age > 2.2) continue
    const src = vanPoint(vanAt(SPLASH + 0.2 + born), -0.6 + hash(i, 2, 19) * 1.6, -0.3 + hash(i, 3, 19) * 0.5)
    const x = src[0] + 0.12 * Math.sin(age * 5 + i)
    const y = src[1] - age * (0.7 + 0.5 * hash(i, 4, 19))
    if (y < surfaceAt(x, t) + 0.05) continue
    if (x < f.x0 - 1 || x > f.x1 + 1) continue
    const r = (0.018 + 0.022 * hash(i, 5, 19)) * k
    ctx.beginPath()
    ctx.arc(x * k, y * k, Math.max(0.7, r), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/**
 * A plume where something goes into the water or comes out of it: the white of the hit at once, a crown of jets thrown
 * up and out that fall back under gravity, drops, and a mist that spreads and thins. `age` in seconds since, `size` 1
 * for the van. Soft, never outlined.
 */
export function plume(pen: Pen, at: Pt, age: number, size: number, seed: number): void {
  const life = 1.1 + 2.6 * size
  if (age < 0 || age > life) return
  const { p, k, ctx } = pen
  const [x0, y0] = at
  const fade = 1 - age / life
  // The hit: a flash of white where it goes in, and a low dome of water heaved up round it.
  bloom(p, k, [x0, y0 - 0.25 * size], 0.5 + 1.7 * size, RAIN.window, 0.6 * Math.exp(-age / 0.16))
  if (age < 0.6) {
    const rx = (0.5 + 2.6 * age) * size + 0.2
    const ry = (0.35 + 0.8 * size) * (1 - age / 0.6)
    const g = ctx.createRadialGradient(x0 * k, y0 * k, 0, x0 * k, y0 * k, rx * k)
    g.addColorStop(0, rgba(RAIN.window, 0.55 * (1 - age / 0.6)))
    g.addColorStop(0.7, rgba(RAIN.rain, 0.25 * (1 - age / 0.6)))
    g.addColorStop(1, rgba(RAIN.rain, 0))
    ctx.save()
    ctx.translate(x0 * k, y0 * k)
    ctx.scale(1, ry / rx)
    ctx.translate(-x0 * k, -y0 * k)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x0 * k, y0 * k, rx * k, Math.PI, 0)
    ctx.fill()
    ctx.restore()
  }
  // The mist, spreading and thinning.
  bloom(p, k, [x0, y0 - 1.1 * size], (1.2 + 2.2 * age) * size, RAIN.rain, 0.42 * Math.exp(-age / (0.6 + 1.1 * size)))
  // The crown: jets thrown up and out, each on its own arc; each thins away as it tops out and falls back as drops.
  ctx.save()
  ctx.lineCap = 'round'
  const n = Math.round(12 + 40 * size)
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1) - 0.5
    const ang = u * 1.75 + (hash(i, 1, seed) - 0.5) * 0.3
    const sp = (2.8 + 7.4 * size) * (0.5 + 0.5 * Math.cos(u * 2.6)) * (0.8 + 0.4 * hash(i, 2, seed))
    const vx = Math.sin(ang) * sp * 0.7
    const vy = Math.cos(ang) * sp
    const top = vy / 12
    const gone = sm((age - top * 0.8) / (0.18 + 0.1 * size))
    if (gone >= 1) continue
    const bx = x0 + u * 1.2 * size
    const pt = (a: number): Pt => [bx + vx * a, y0 - vy * a + 6 * a * a]
    const root = Math.max(0, age - 0.18 - 0.25 * size)
    const tip = pt(age)
    const mid = pt((root + age) / 2)
    const r0 = pt(root)
    if (tip[1] > y0 || mid[1] > y0 || r0[1] > y0 + 0.02) continue
    ctx.strokeStyle = rgba(RAIN.rain, (0.12 + 0.12 * hash(i, 3, seed)) * (1 - gone))
    ctx.lineWidth = Math.max(1, (0.1 + 0.26 * size) * k * (1 - Math.abs(u) * 0.85))
    ctx.beginPath()
    ctx.moveTo(r0[0] * k, r0[1] * k)
    ctx.quadraticCurveTo(2 * mid[0] * k - (r0[0] + tip[0]) * k / 2, 2 * mid[1] * k - (r0[1] + tip[1]) * k / 2, tip[0] * k, tip[1] * k)
    ctx.stroke()
  }
  ctx.restore()
  // The drops: thrown up faster still, falling back into the river.
  ctx.save()
  ctx.fillStyle = rgba(mixHex(RAIN.rain, RAIN.window, 0.4), 0.85 * fade)
  const m = Math.round(24 + 190 * size)
  const drops = new Path2D()
  for (let i = 0; i < m; i++) {
    const ang = (hash(i, 4, seed) - 0.5) * 2.8
    const sp = (2.6 + 11 * size) * (0.35 + 0.65 * hash(i, 5, seed))
    const vx = Math.sin(ang) * sp * 0.8
    const vy = -Math.cos(ang) * sp
    const x = x0 + (hash(i, 6, seed) - 0.5) * 1.2 * size + vx * age
    const y = y0 + vy * age + 6 * age * age
    if (y > y0 + 0.02) continue
    const r = Math.max(0.7, (0.018 + 0.03 * hash(i, 7, seed)) * k)
    drops.moveTo(x * k + r, y * k)
    drops.arc(x * k, y * k, r, 0, Math.PI * 2)
  }
  ctx.fill(drops)
  ctx.restore()
}

/** The van into the river on the rain's kick. */
export function drawSplash(pen: Pen, f: View, t: number): void {
  const a = eff(t) - E_SPLASH
  if (a < 0 || a > 5) return
  if (!seen(f, IMPACT[0] - 8, IMPACT[0] + 8, IMPACT[1] - 7, IMPACT[1] + 1)) return
  plume(pen, IMPACT, a, 1.15, 23)
  plume(pen, [IMPACT[0] - 1.2, IMPACT[1]], a - 0.1, 0.6, 29)
  plume(pen, [IMPACT[0] + 0.9, IMPACT[1]], a - 0.05, 0.5, 31)
  // Foam on the surface, spreading and thinning.
  const { ctx, k } = pen
  const wide = 1.2 + 2.2 * a
  const g = ctx.createRadialGradient(IMPACT[0] * k, IMPACT[1] * k, 0, IMPACT[0] * k, IMPACT[1] * k, wide * k)
  g.addColorStop(0, rgba(RAIN.window, 0.45 * Math.exp(-a / 1.6)))
  g.addColorStop(1, rgba(RAIN.window, 0))
  ctx.save()
  ctx.translate(0, IMPACT[1] * k)
  ctx.scale(1, 0.12)
  ctx.translate(0, -IMPACT[1] * k)
  ctx.fillStyle = g
  ctx.fillRect((IMPACT[0] - wide) * k, (IMPACT[1] - wide) * k, 2 * wide * k, 2 * wide * k)
  ctx.restore()
}
