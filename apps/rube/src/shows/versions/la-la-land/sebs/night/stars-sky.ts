import type p5 from 'p5'
import { frame, glow, rgba, smooth } from '../kit'
import { NIGHT_MAT } from '../worlds'
import { CLOCK_X, FLY_SET, FLY_SKY, LAMPS, POLE, scatter, skyAngle, UPSTAGE } from './painted-waltz'

/**
 * The real sky behind the painted one, and the floor both stand on. Drawn in
 * the NIGHT frame by the painted part (it has to be behind the flats), and
 * only once the painted sky has started to fly.
 *
 * The sky is a wheel of stars round POLE, where the two of them will be at
 * the top of the swell, geared to their turning: it turns with them, and it
 * stops when they stop. A band of the galaxy crosses it through the pole, so
 * the turning reads at any size, and where it turns fast the brighter stars
 * draw arcs. Below the horizon (UPSTAGE) the floor is dark glass: it holds
 * the sky upside down.
 */

const TAU = Math.PI * 2
const COLORS = [NIGHT_MAT.star, NIGHT_MAT.white, NIGHT_MAT.gold]

/** Every star, in the sky's own frame (from the pole, before it turns): a scatter over the disc, and the band. */
const N = 2600
const SX = new Float32Array(N)
const SY = new Float32Array(N)
const SZ = new Float32Array(N)
const SB = new Float32Array(N)
const SC = new Uint8Array(N)
const STW = new Float32Array(N)
const SPH = new Float32Array(N)
/** The band's direction in the sky's frame. */
const BAND = -0.55
;(() => {
  for (let i = 0; i < N; i++) {
    let x: number
    let y: number
    const s = scatter(i, 3)
    if (i < 1300) {
      const r = 0.6 + 30 * Math.sqrt(scatter(i, 1))
      const a = scatter(i, 2) * TAU
      x = r * Math.cos(a)
      y = r * Math.sin(a)
      SZ[i] = 0.008 + 0.03 * s * s * s
      SB[i] = 0.3 + 0.7 * scatter(i, 5)
    } else {
      // The band: long along its direction, soft across it; small faint stars, thick.
      const u = (scatter(i, 1) * 2 - 1) * 32
      const v = (scatter(i, 2) + scatter(i, 8) + scatter(i, 9) - 1.5) * 2.6 * (1 + 0.25 * Math.sin(u * 0.4))
      x = u * Math.cos(BAND) - v * Math.sin(BAND)
      y = u * Math.sin(BAND) + v * Math.cos(BAND)
      SZ[i] = 0.007 + 0.014 * s * s
      SB[i] = 0.25 + 0.55 * scatter(i, 5)
    }
    SX[i] = x
    SY[i] = y
    const c = scatter(i, 4)
    SC[i] = c < 0.13 ? 2 : c < 0.3 ? 1 : 0
    STW[i] = 0.5 + 1.8 * scatter(i, 6)
    SPH[i] = scatter(i, 7) * TAU
  }
})()

/** The band's haze: soft blobs along it. */
const HAZE = Array.from({ length: 18 }, (_, i) => {
  const u = -26 + (52 * (i + 0.5)) / 18 + 1.5 * (scatter(i, 20) - 0.5)
  const v = 0.9 * (scatter(i, 21) - 0.5)
  return { x: u * Math.cos(BAND) - v * Math.sin(BAND), y: u * Math.sin(BAND) + v * Math.cos(BAND), size: 2.2 + 1.6 * scatter(i, 22), a: 0.07 + 0.06 * scatter(i, 23) }
})

/** How much of the real sky is uncovered: none until the painted sky starts to fly. */
export const skyShown = (T: number): number => smooth(T, FLY_SKY - 0.05, FLY_SKY + 1.2)

/** How much lamplight is on the floor: the lamps fly out with the set. */
export const lampLight = (T: number): number => 1 - smooth(T, FLY_SET + 0.4, FLY_SET + 2.4)

/** How fast the sky is turning, radians over the last `back` seconds: what the brighter stars draw as arcs. */
export const skySweep = (T: number, back = 0.9): number => skyAngle(T) - skyAngle(T - back)

/**
 * The stars at show time `T`, clipped to the sky above the horizon (`mirror`
 * false) or upside down in the floor below it (`mirror` true).
 */
function starField(p: p5, k: number, T: number, mirror: boolean, fade: number): void {
  if (fade <= 0.004) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const f = frame(p, k)
  const phi = skyAngle(T)
  const cs = Math.cos(phi)
  const sn = Math.sin(phi)
  const sweep = skySweep(T)
  const px = POLE[0]
  const py = POLE[1]
  const m = mirror ? 0.42 : 1
  ctx.save()
  ctx.beginPath()
  if (mirror) ctx.rect((f.x0 - 1) * k, UPSTAGE * k, (f.x1 - f.x0 + 2) * k, (f.y1 - UPSTAGE + 1) * k)
  else ctx.rect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (UPSTAGE - f.y0 + 1) * k)
  ctx.clip()
  // The band's haze.
  for (const h of HAZE) {
    const x = px + h.x * cs - h.y * sn
    const yy = py + h.x * sn + h.y * cs
    const y = mirror ? 2 * UPSTAGE - yy : yy
    if (x < f.x0 - 5 || x > f.x1 + 5 || y < f.y0 - 5 || y > f.y1 + 5) continue
    glow(p, k, x, y, h.size, NIGHT_MAT.swirl, h.a * fade * m, 1.2, 0.85)
  }
  // Paths by colour and brightness, so a thousand stars are a dozen fills.
  const LV = 4
  const paths: Path2D[] = []
  for (let j = 0; j < 3 * LV; j++) paths.push(new Path2D())
  const trails: Path2D[] = [new Path2D(), new Path2D(), new Path2D()]
  const trailOn = Math.abs(sweep) > 0.12
  const x0 = f.x0 - 0.5
  const x1 = f.x1 + 0.5
  const y0 = f.y0 - 0.5
  const y1 = f.y1 + 0.5
  const pole = mirror ? 2 * UPSTAGE - py : py
  for (let i = 0; i < N; i++) {
    const x = px + SX[i] * cs - SY[i] * sn
    const yy = py + SX[i] * sn + SY[i] * cs
    if (yy > UPSTAGE + 0.02) continue
    const y = mirror ? 2 * UPSTAGE - yy : yy
    if (x < x0 || x > x1 || y < y0 || y > y1) continue
    const tw = 0.75 + 0.25 * Math.sin(T * STW[i] + SPH[i])
    const al = SB[i] * tw
    const lv = Math.min(LV - 1, Math.floor(al * LV))
    const r = Math.max(0.45, SZ[i] * k)
    const path = paths[SC[i] * LV + lv]
    path.moveTo(x * k + r, y * k)
    path.arc(x * k, y * k, r, 0, TAU)
    if (trailOn && SZ[i] > 0.014) {
      const rr = Math.hypot(SX[i], SY[i])
      const a1 = Math.atan2(yy - py, x - px)
      const lo = Math.min(a1, a1 - sweep)
      const hi = Math.max(a1, a1 - sweep)
      const t = trails[SC[i]]
      if (mirror) {
        t.moveTo((px + rr * Math.cos(-hi)) * k, (pole + rr * Math.sin(-hi)) * k)
        t.arc(px * k, pole * k, rr * k, -hi, -lo)
      } else {
        t.moveTo((px + rr * Math.cos(lo)) * k, (py + rr * Math.sin(lo)) * k)
        t.arc(px * k, py * k, rr * k, lo, hi)
      }
    }
  }
  if (trailOn) {
    const ta = Math.min(1, (Math.abs(sweep) - 0.12) / 0.12) * 0.42 * fade * m
    ctx.lineCap = 'round'
    ctx.lineWidth = Math.max(0.6, 0.02 * k)
    for (let c = 0; c < 3; c++) {
      ctx.strokeStyle = rgba(COLORS[c], ta)
      ctx.stroke(trails[c])
    }
  }
  for (let c = 0; c < 3; c++)
    for (let lv = 0; lv < LV; lv++) {
      ctx.fillStyle = rgba(COLORS[c], ((lv + 0.7) / LV) * fade * m)
      ctx.fill(paths[c * LV + lv])
    }
  ctx.restore()
}

/** The sky above the horizon: the deep of the night, the wheel of stars, a faint glow along the far edge of the floor. */
export function drawSky(p: p5, k: number, T: number): void {
  const shown = skyShown(T)
  if (shown <= 0.002) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const f = frame(p, k)
  const top = f.y0 - 1
  if (top < UPSTAGE) {
    ctx.fillStyle = NIGHT_MAT.deep
    ctx.fillRect((f.x0 - 1) * k, top * k, (f.x1 - f.x0 + 2) * k, (UPSTAGE - top) * k)
    // Low down, the night thins to blue at the horizon.
    const g = ctx.createLinearGradient(0, (UPSTAGE - 3.2) * k, 0, UPSTAGE * k)
    g.addColorStop(0, rgba(NIGHT_MAT.cobalt, 0))
    g.addColorStop(0.7, rgba(NIGHT_MAT.cobalt, 0.75))
    g.addColorStop(1, rgba(NIGHT_MAT.ultramarine, 0.9))
    ctx.fillStyle = g
    ctx.fillRect((f.x0 - 1) * k, (UPSTAGE - 3.2) * k, (f.x1 - f.x0 + 2) * k, 3.2 * k)
  }
  starField(p, k, T, false, shown)
}

/** The wet cobbles of the quay, painted: long broken strokes, lit by the lamps, and gone dark when the lamps go. */
const COBBLES: { x: number; y: number; w: number; tone: number }[] = (() => {
  const out: { x: number; y: number; w: number; tone: number }[] = []
  let row = 0
  // Rows get further apart toward us, as a floor in perspective does.
  for (let y = UPSTAGE + 0.12; y < 6; y += 0.16 + 0.1 * Math.max(0, y - UPSTAGE)) {
    let x = -12 + scatter(row, 50) * 1.2
    let i = 0
    while (x < 26) {
      const w = 0.5 + 1.2 * scatter(row * 97 + i, 51)
      out.push({ x, y: y + 0.03 * (scatter(row * 97 + i, 52) - 0.5), w, tone: scatter(row * 97 + i, 53) })
      x += w + 0.25 + 0.6 * scatter(row * 97 + i, 54)
      i++
    }
    row++
  }
  return out
})()

/**
 * The floor, from the far edge down: in painted Paris wet cobbles in the lamps' light, with the lamps and the
 * clock's face drawn down into it as long reflections; among the stars, dark glass that holds the sky.
 */
export function drawFloor(p: p5, k: number, T: number, set: { lift: (T: number, layer: number) => number }): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const f = frame(p, k)
  const bottom = f.y1 + 1
  if (bottom <= UPSTAGE) return
  const light = lampLight(T)
  const shown = skyShown(T)
  ctx.fillStyle = NIGHT_MAT.deep
  ctx.fillRect((f.x0 - 1) * k, UPSTAGE * k, (f.x1 - f.x0 + 2) * k, (bottom - UPSTAGE) * k)
  // The wet street takes the painted blue near its far edge; the glass takes the horizon's glow the same way.
  const g = ctx.createLinearGradient(0, UPSTAGE * k, 0, (UPSTAGE + 2.6) * k)
  g.addColorStop(0, rgba(NIGHT_MAT.ultramarine, 0.9 * light + 0.75 * (1 - light) * shown))
  g.addColorStop(0.3, rgba(NIGHT_MAT.cobalt, 0.55 * light + 0.45 * (1 - light) * shown))
  g.addColorStop(1, rgba(NIGHT_MAT.cobalt, 0))
  ctx.fillStyle = g
  ctx.fillRect((f.x0 - 1) * k, UPSTAGE * k, (f.x1 - f.x0 + 2) * k, 2.6 * k)
  if (light > 0.003) {
    // The painted cobbles, strongest in the lamps' pools.
    ctx.lineCap = 'round'
    for (const c of COBBLES) {
      if (c.x + c.w < f.x0 - 0.5 || c.x > f.x1 + 0.5 || c.y < f.y0 - 0.5 || c.y > f.y1 + 0.5) continue
      let near = 0.28
      for (const lx of LAMPS) near += 0.9 * Math.exp(-(((c.x + c.w / 2 - lx) / 2.4) ** 2)) * Math.exp(-Math.max(0, c.y - 0.2) / 2.2)
      near += 0.55 * Math.exp(-(((c.x + c.w / 2 - CLOCK_X) / 1.8) ** 2)) * Math.exp(-Math.max(0, c.y - 0.2) / 2)
      const al = Math.min(0.75, near) * light * (0.35 + 0.3 * c.tone)
      ctx.strokeStyle = rgba(c.tone > 0.72 ? NIGHT_MAT.swirl : NIGHT_MAT.ultramarine, al)
      ctx.lineWidth = (0.035 + 0.03 * Math.max(0, c.y - UPSTAGE) * 0.3) * k
      ctx.beginPath()
      ctx.moveTo(c.x * k, c.y * k)
      ctx.lineTo((c.x + c.w) * k, c.y * k)
      ctx.stroke()
    }
    // The lamps' pools and their long wet reflections, which go up with the lamps.
    const up = set.lift(T, 2)
    for (const lx of LAMPS) {
      const a = light * Math.max(0, 1 - up / 3)
      glow(p, k, lx, -0.3, 1.8, NIGHT_MAT.gold, 0.3 * a, 1.5, 0.32)
      glow(p, k, lx, 1.7 + up, 1.9, NIGHT_MAT.gold, 0.3 * a, 0.16, 1.2)
    }
    glow(p, k, CLOCK_X, 2.4 + up, 1.6, NIGHT_MAT.white, 0.16 * light * Math.max(0, 1 - up / 3), 0.26, 1.25)
  }
  // The glass: the sky, upside down.
  if (shown > 0.002) starField(p, k, T, true, shown)
}
