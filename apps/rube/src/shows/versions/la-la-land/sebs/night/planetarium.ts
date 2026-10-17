import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { frame, rgba, smooth } from '../kit'
import { NIGHT_MAT } from '../worlds'
import { APEX, LIFT, POLE, scatter, skyAngle, UPSTAGE } from './painted-waltz'

/**
 * The planetarium the stars are thrown in, as the film's is: Griffith's, where they float up out of its seats into
 * its sky. All of it is in the NIGHT frame (`painted-waltz.ts`).
 *
 * - The cove: round the foot of the dome, the city's skyline in silhouette, as Griffith's planetarium has it: the
 *   hills, the towers downtown, palms, and the observatory on its own hill. It stands on the horizon behind painted
 *   Paris, so when the painted roofs fly out it is what was behind them.
 * - The seats: the front row, near, along the foot of the picture, coming up through the floor in a wave out from the
 *   projector once they have pushed off, and sliding by faster than the room as the camera moves. Empty: the two of
 *   them are alone in it.
 * - What the projector throws besides the stars: two planets on their slow paths, a ringed one and a red one, turning
 *   with the sky.
 */

const TAU = Math.PI * 2
const rot = (q: Pt, a: number): Pt => [q[0] * Math.cos(a) - q[1] * Math.sin(a), q[0] * Math.sin(a) + q[1] * Math.cos(a)]

/** The silhouettes' ink: darker than the night at the horizon, so they read against its glow. */
const SIL = '#080C27'
/** The projected sky's light on the tops of things. */
const RIM = '#5A78D8'

/* ------------------------------------------------------------------ the cove */

/** The cove's hills: a long low swell, a rise or two, and the observatory's hill (heights above the horizon, cells). */
const OBS_X = 15.2
const hill = (x: number): number =>
  0.11 + 0.07 * Math.sin(x * 0.21 + 0.6) + 0.05 * Math.sin(x * 0.53 + 1.7) + 0.2 * Math.exp(-(((x - OBS_X) / 2.4) ** 2)) + 0.12 * Math.exp(-(((x + 3) / 3.5) ** 2))
const COVE: Pt[] = (() => {
  const out: Pt[] = []
  for (let x = -16; x <= 36 + 1e-9; x += 0.1) out.push([x, hill(x)])
  return out
})()
/**
 * The towers: downtown's cluster, a lower one out west, and a smaller one far off along the cove. Each its width and height, a setback a
 * third of the way down from its top for some, a mast on the tallest.
 */
const TOWERS: { x: number; w: number; h: number; step?: number; mast?: number }[] = [
  { x: 5.42, w: 0.1, h: 0.2 },
  { x: 5.58, w: 0.13, h: 0.3, step: 0.08 },
  { x: 5.74, w: 0.09, h: 0.24 },
  { x: 5.9, w: 0.15, h: 0.46, step: 0.12 },
  { x: 6.06, w: 0.1, h: 0.34 },
  { x: 6.22, w: 0.16, h: 0.58, mast: 0.12 },
  { x: 6.4, w: 0.12, h: 0.4, step: 0.1 },
  { x: 6.56, w: 0.14, h: 0.5 },
  { x: 6.72, w: 0.09, h: 0.27 },
  { x: 6.86, w: 0.12, h: 0.36, step: 0.09 },
  { x: 7.02, w: 0.1, h: 0.22 },
  // A second, lower cluster further along, under where they float in the quiet: the towers out west.
  { x: 7.55, w: 0.08, h: 0.17 },
  { x: 7.67, w: 0.11, h: 0.27, step: 0.06 },
  { x: 7.8, w: 0.09, h: 0.21 },
  { x: 7.93, w: 0.13, h: 0.34, mast: 0.08 },
  { x: 8.07, w: 0.08, h: 0.19 },
  { x: 12.95, w: 0.1, h: 0.26 },
  { x: 13.1, w: 0.12, h: 0.34, step: 0.08 },
  { x: 13.26, w: 0.09, h: 0.22 },
]
/** The palms along the cove: a trunk and a crown of fronds, each its own height and lean. */
const PALMS = [-6.8, -6.3, -1.2, 2.4, 2.75, 4.6, 8.4, 8.9, 12.2, 17.6, 18.0, 21.5, 25.0, 25.4].map((x, i) => ({ x, h: 0.32 + 0.18 * scatter(i, 300), lean: (scatter(i, 301) - 0.5) * 0.1 }))

/** The cove, upright on the horizon (or, `mirror`, upside down in the glass). Drawn in cell units: the caller has scaled by k. */
function coveShape(ctx: CanvasRenderingContext2D, T: number, mirror: boolean, x0: number, x1: number): void {
  const s = mirror ? -1 : 1
  const Y = (h: number) => UPSTAGE - s * h
  ctx.beginPath()
  ctx.moveTo(x0 - 1, UPSTAGE + s * 0.02)
  for (const [x, h] of COVE) if (x >= x0 - 1 && x <= x1 + 1) ctx.lineTo(x, Y(h))
  ctx.lineTo(x1 + 1, UPSTAGE + s * 0.02)
  ctx.closePath()
  // The towers, standing in the hills.
  for (const tw of TOWERS) {
    if (tw.x < x0 - 1 || tw.x > x1 + 1) continue
    const foot = hill(tw.x) - 0.04
    const l = tw.x - tw.w / 2
    const r = tw.x + tw.w / 2
    const st = tw.step ?? 0
    ctx.moveTo(l, Y(foot))
    ctx.lineTo(l, Y(tw.h - st))
    ctx.lineTo(l + tw.w * 0.18 * (st ? 1 : 0), Y(tw.h - st))
    ctx.lineTo(l + tw.w * 0.18 * (st ? 1 : 0), Y(tw.h))
    ctx.lineTo(r - tw.w * 0.18 * (st ? 1 : 0), Y(tw.h))
    ctx.lineTo(r - tw.w * 0.18 * (st ? 1 : 0), Y(tw.h - st))
    ctx.lineTo(r, Y(tw.h - st))
    ctx.lineTo(r, Y(foot))
    ctx.closePath()
    if (tw.mast) {
      ctx.moveTo(tw.x - 0.008, Y(tw.h))
      ctx.lineTo(tw.x, Y(tw.h + tw.mast))
      ctx.lineTo(tw.x + 0.008, Y(tw.h))
      ctx.closePath()
    }
  }
  // The observatory, on the hill's crest.
  const base = hill(OBS_X)
  if (OBS_X > x0 - 2 && OBS_X < x1 + 2) {
    ctx.rect(OBS_X - 0.44, Math.min(Y(base - 0.02), Y(base + 0.11)), 0.88, 0.13)
    for (const [dx, r] of [[0, 0.14], [-0.37, 0.07], [0.37, 0.07]] as const) {
      const cy = Y(base + 0.11)
      ctx.moveTo(OBS_X + dx + r, cy)
      ctx.ellipse(OBS_X + dx, cy, r, r, 0, 0, Math.PI, !mirror)
      ctx.closePath()
    }
  }
  // The palms: a fine trunk and a crown of fronds.
  for (const pm of PALMS) {
    if (pm.x < x0 - 1 || pm.x > x1 + 1) continue
    const foot = hill(pm.x)
    const topX = pm.x + pm.lean
    const topH = foot + pm.h
    ctx.moveTo(pm.x - 0.018, Y(foot - 0.05))
    ctx.lineTo(topX - 0.012, Y(topH))
    ctx.lineTo(topX + 0.012, Y(topH))
    ctx.lineTo(pm.x + 0.018, Y(foot - 0.05))
    ctx.closePath()
    // The fronds, a fan drooping at its ends; they stir as the projector's draught goes by, each in its own time.
    const stir = 0.05 * Math.sin(T * 0.9 + pm.x * 2.1)
    for (let f = 0; f < 7; f++) {
      const ang = Math.PI * (0.06 + (0.88 * f) / 6) + stir
      const L = 0.2 + 0.04 * Math.cos(f * 1.7)
      const droop = 0.05 + 0.1 * Math.abs(f - 3) / 3
      const ex = topX + Math.cos(ang) * L
      const eh = topH + 0.06 * Math.sin(ang) - droop
      ctx.moveTo(topX, Y(topH))
      ctx.quadraticCurveTo(topX + Math.cos(ang) * L * 0.5, Y(topH + 0.05 + 0.06 * Math.sin(ang)), ex, Y(eh))
      ctx.quadraticCurveTo(topX + Math.cos(ang) * L * 0.45, Y(topH + 0.01 + 0.03 * Math.sin(ang)), topX, Y(topH - 0.025))
    }
  }
}

/**
 * The cove: the skyline round the foot of the dome, dark against the horizon's glow, with the projected sky's light
 * along its tops. In the glass, upside down and dimmer.
 */
export function drawCove(p: p5, k: number, T: number, shown: number, mirror: boolean): void {
  if (shown <= 0.003) return
  const f = frame(p, k)
  if (mirror ? f.y1 < UPSTAGE : f.y0 > UPSTAGE + 0.1) return
  if (!mirror && f.y1 < UPSTAGE - 1.4) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.scale(k, k)
  ctx.globalAlpha = shown * (mirror ? 0.5 : 1)
  coveShape(ctx, T, mirror, f.x0, f.x1)
  ctx.fillStyle = mirror ? mixHex(SIL, NIGHT_MAT.cobalt, 0.25) : SIL
  ctx.fill('nonzero')
  ctx.restore()
}

/* ------------------------------------------------------------------ the seats */

/** When the seat at `x` has come up through the floor: once they have pushed off, in a wave out from the projector. */
function seatRisen(T: number, x: number): number {
  const a = LIFT + 0.3 + 1.1 * Math.min(1, Math.abs(x - 11) / 9)
  return smooth(T, a, a + 1.2)
}

/**
 * The front row: near, so larger, and sliding past faster than the room as the camera moves (half as far again
 * across, a third again up and down), along the foot of the picture, with an aisle down the middle where the two of
 * them pushed off and the projector stands. Seen from behind, each seat is a tall back with a rounded head, an arm
 * lower between each two; the projected sky's light lies along their tops. Drawn over the balls: it is between us
 * and them.
 */
const NEAR = { top: 0.5, back: 0.44, gap: 0.62, aisle: [8.35, 12.35] as [number, number], par: [1.45, 1.3] as [number, number], ref: [10.25, -1.8] as Pt }
export function drawNearSeats(p: p5, k: number, T: number): void {
  if (T < LIFT + 0.3) return
  const f = frame(p, k)
  const dx = -(f.cx - NEAR.ref[0]) * (NEAR.par[0] - 1)
  const dy = -(f.cy - NEAR.ref[1]) * (NEAR.par[1] - 1)
  if (NEAR.top + dy > f.y1 + 0.05) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const bottom = f.y1 + 1
  const body = new Path2D()
  const rims = new Path2D()
  const n0 = Math.floor((f.x0 - dx - 1) / NEAR.gap)
  const n1 = Math.ceil((f.x1 - dx + 1) / NEAR.gap)
  for (let n = n0; n <= n1; n++) {
    const cx = n * NEAR.gap + NEAR.gap / 2
    if (cx > NEAR.aisle[0] && cx < NEAR.aisle[1]) continue
    const up = seatRisen(T, cx)
    if (up <= 0.002) continue
    // The row curves round the room: further from the middle, a little nearer us and lower in the picture.
    const top = NEAR.top + dy + 0.012 * (cx - 10.3) ** 2 + (1 - up) * 1.6
    const x = cx + dx
    const hw = NEAR.back / 2
    const lean = 0.04
    const head = 0.2
    // The back: straight sides up to a rounded head, leaning back a little.
    body.moveTo(x - hw, bottom)
    body.lineTo(x - hw + lean * 0.5, top + head)
    body.bezierCurveTo(x - hw + lean * 0.5, top + 0.02, x - hw * 0.4 + lean, top - 0.012, x + lean, top - 0.012)
    body.bezierCurveTo(x + hw * 0.4 + lean, top - 0.012, x + hw + lean * 0.5, top + 0.02, x + hw + lean * 0.5, top + head)
    body.lineTo(x + hw, bottom)
    body.closePath()
    // The arm on its right, low, unless the aisle is there.
    const ax = cx + NEAR.gap / 2
    if (!(ax > NEAR.aisle[0] - 0.01 && ax < NEAR.aisle[1] + 0.01)) body.rect(x + hw - 0.02, top + 0.42, NEAR.gap - NEAR.back + 0.04, bottom - top - 0.42)
    rims.moveTo(x - hw * 0.72 + lean * 0.6, top + 0.07)
    rims.bezierCurveTo(x - hw * 0.4 + lean, top + 0.004, x + hw * 0.4 + lean, top + 0.004, x + hw * 0.72 + lean * 0.6, top + 0.07)
  }
  ctx.save()
  ctx.scale(k, k)
  ctx.fillStyle = '#05081B'
  ctx.fill(body)
  ctx.strokeStyle = rgba(RIM, 0.75)
  ctx.lineWidth = Math.max(1.2 / k, 0.016)
  ctx.lineCap = 'round'
  ctx.stroke(rims)
  ctx.restore()
}

/* ------------------------------------------------------------------ the planets */

interface Planet {
  /** Where it is in the sky's own frame (from the pole) when it comes up, and its own slow way across it. */
  r: number
  a0: number
  w: number
  size: number
  color: string
  shade: string
  ring?: string
  /** When the projector throws it, and (for the ringed one) takes it away again. */
  from: number
  to?: number
}
export const PLANETS: Planet[] = [
  // The red one, far out on the wheel: up as they reach the top of the float.
  { r: 2.85, a0: 1.56, w: 0.006, size: 0.11, color: '#C8674A', shade: '#6E2E25', from: APEX + 0.6 },
  // The ringed one, nearer and larger: thrown as the waltz goes quiet, so it drifts across the sky's upper left over the
  // two of them in each other's arms, balancing the machine low on the right, and taken away as the swell begins,
  // before the piano is drawn round them (both orbits are chosen, by search, to keep a ball's width and more from
  // them, and clear of every star they light).
  { r: 1.85, a0: 5.32, w: -0.004, size: 0.165, color: '#E6D3A0', shade: '#8E7A55', ring: '#D8C38E', from: 325.5, to: 332.4 },
]
/** A planet's place at `T`, in the NIGHT frame. */
export function planetAt(q: Planet, T: number): Pt {
  const a = q.a0 + q.w * (T - q.from)
  const v = rot([q.r * Math.cos(a), q.r * Math.sin(a)], skyAngle(T))
  return [POLE[0] + v[0], POLE[1] + v[1]]
}

/** The projected planets, while the projector's lamps are on (`on`); `mirror` draws them upside down in the glass. */
export function drawPlanets(p: p5, k: number, T: number, on: number, mirror: boolean): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const f = frame(p, k)
  for (const q of PLANETS) {
    const a = smooth(T, q.from, q.from + 1.8) * (q.to ? 1 - smooth(T, q.to, q.to + 1.2) : 1) * on
    if (a <= 0.01) continue
    const [x, y0] = planetAt(q, T)
    if (y0 > UPSTAGE - q.size) continue
    const y = mirror ? 2 * UPSTAGE - y0 : y0
    if (x < f.x0 - 1 || x > f.x1 + 1 || y < f.y0 - 1 || y > f.y1 + 1) continue
    ctx.save()
    ctx.translate(x * k, y * k)
    if (mirror) ctx.scale(1, -1)
    ctx.globalAlpha = a * (mirror ? 0.3 : 0.92)
    const r = q.size * k
    const tilt = -0.32
    // The far half of the ring, behind the planet.
    if (q.ring) {
      ctx.strokeStyle = q.ring
      ctx.lineWidth = Math.max(1, 0.035 * k)
      ctx.beginPath()
      ctx.ellipse(0, 0, r * 2.15, r * 0.6, tilt, Math.PI, TAU)
      ctx.stroke()
    }
    ctx.fillStyle = q.shade
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, TAU)
    ctx.fill()
    // Its day side: the sun is off to the upper left of the dome, so the night is a crescent to the lower right.
    ctx.save()
    ctx.clip()
    ctx.fillStyle = q.color
    ctx.beginPath()
    ctx.arc(-r * 0.3, -r * 0.26, r * 1.0, 0, TAU)
    ctx.fill()
    if (q.ring) {
      // Its bands.
      ctx.strokeStyle = rgba(q.shade, 0.5)
      ctx.lineWidth = Math.max(0.8, 0.012 * k)
      for (const b of [-0.35, 0.12]) {
        ctx.beginPath()
        ctx.moveTo(-r, b * r)
        ctx.lineTo(r, b * r + Math.tan(tilt) * r * 2)
        ctx.stroke()
      }
    }
    ctx.restore()
    // The near half of the ring, across it.
    if (q.ring) {
      ctx.strokeStyle = q.ring
      ctx.lineWidth = Math.max(1, 0.035 * k)
      ctx.beginPath()
      ctx.ellipse(0, 0, r * 2.15, r * 0.6, tilt, 0, Math.PI)
      ctx.stroke()
    }
    ctx.restore()
  }
}

/* ------------------------------------------------------------------ the push-off */

/** Where they push off the glass: two rings spread out on it under them, the second a beat behind. */
export function drawPushRings(p: p5, k: number, T: number, x: number): void {
  const s = T - LIFT
  if (s < 0 || s > 1.6) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  for (const [lag, w] of [[0, 1], [0.22, 0.6]] as const) {
    const v = (s - lag) / (1.6 - lag)
    if (v <= 0) continue
    const r = 0.15 + 1.6 * Math.sqrt(v)
    ctx.strokeStyle = rgba(NIGHT_MAT.swirl, 0.75 * w * (1 - v) ** 1.4)
    ctx.lineWidth = Math.max(1.2, 0.03 * k * (1 - 0.5 * v))
    ctx.beginPath()
    ctx.ellipse(x * k, 0.02 * k, r * k, r * 0.26 * k, 0, 0, TAU)
    ctx.stroke()
  }
  ctx.restore()
}
