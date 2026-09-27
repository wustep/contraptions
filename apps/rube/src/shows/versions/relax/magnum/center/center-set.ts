import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { bloom, pool, rgba } from '../cast'
import { frame, hash, type Ctx } from '../kit'
import { AWARDS, CENTER } from '../worlds'
import { dk, drawLamp, drawTree, setDusk } from './center-draw'
import { duskAt, GROUND, lampAt, LAMPS, starAt, STARS } from './center-plan'

/**
 * The Center's standing set (the CENTER builder's): a bright morning over a lawn. The sky and a few thin clouds, far
 * low hills and a line of woods on the horizon (hazed, and moving slower than the lawn as the camera goes), the lawn
 * behind, the old trees round it, and the path in front, on which everything rolls. No ink on the land: only the
 * machines and the building are drawn in line.
 */

/** The horizon: a little over the path, so a building standing on the path stands against the woods and the sky. */
const HORIZON = GROUND - 0.12
/** The sky's stops: [y, by day, at dusk]. The top third of the credits' frame (y -8.3 and up) is dusk blue. */
const SKY_TOP = -15
const SKY: [number, string, string][] = [
  [HORIZON, mixHex(CENTER.sky, CENTER.cloud, 0.35), mixHex(AWARDS.warm, CENTER.cloud, 0.12)],
  [-1.3, CENTER.sky, mixHex(AWARDS.warm, AWARDS.curtain, 0.3)],
  [-3.6, mixHex(CENTER.sky, CENTER.skyHigh, 0.2), mixHex(CENTER.skyHigh, AWARDS.curtain, 0.5)],
  [-7.6, mixHex(CENTER.sky, CENTER.skyHigh, 0.55), mixHex(CENTER.skyHigh, AWARDS.house, 0.76)],
  [SKY_TOP, CENTER.skyHigh, mixHex(CENTER.skyHigh, AWARDS.houseDeep, 0.86)],
]
/** The old trees round the lawn: never near the model, whose first shot is as a building. */
const TREES = [
  { x: -8.4, h: 5.4, w: 3.4, seed: 21 },
  { x: -11.0, h: 6.6, w: 3.9, seed: 22 },
  { x: -13.6, h: 5.0, w: 3.2, seed: 23 },
  { x: 16.4, h: 5.8, w: 3.5, seed: 24 },
  { x: 18.9, h: 6.8, w: 3.9, seed: 25 },
  { x: 21.6, h: 5.1, w: 3.3, seed: 26 },
]

const sm01 = (v: number): number => {
  const u = Math.max(0, Math.min(1, v))
  return u * u * (3 - 2 * u)
}

export function drawSet(p: p5, c: Ctx, t: number): void {
  const { k } = c
  const f = frame(p, k)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  const d = duskAt(t)
  setDusk(d)
  // The sky, pale at the horizon and deepening overhead, anchored to the world so the camera moves through it; after
  // the last photograph it goes to dusk: warm at the horizon, a deep blue overhead, so the credits read over it.
  const top = Math.min(f.y0 - 1, -16)
  const g = ctx.createLinearGradient(0, HORIZON * k, 0, SKY_TOP * k)
  for (const [y, day, dusk] of SKY) g.addColorStop((y - HORIZON) / (SKY_TOP - HORIZON), rgba(mixHex(day, dusk, d), 1))
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect(x0 * k, top * k, (x1 - x0) * k, (HORIZON - top + 0.5) * k)
  ctx.restore()
  // The first stars, far off (they move a little less than the land), each its own size, twinkling slowly.
  if (d > 0.5) {
    const ctxStars = ctx
    ctxStars.save()
    STARS.forEach(([sx, sy, size, warm], i) => {
      const a = starAt(i, t) * sm01((d - 0.5) / 0.4)
      if (a <= 0.003) return
      const x = sx + f.cx * 0.12
      const y = sy + f.cy * 0.12
      const color = warm ? AWARDS.bulb : CENTER.cloud
      bloom(p, k, [x, y], 0.07 + 0.16 * size, color, (0.22 + 0.3 * size) * a)
      const r = Math.max(0.55, (0.5 + 1.1 * size) * (k / 22.5))
      ctxStars.fillStyle = rgba(color, Math.min(1, (0.55 + 0.45 * size) * a))
      ctxStars.beginPath()
      ctxStars.arc(x * k, y * k, r, 0, Math.PI * 2)
      ctxStars.fill()
    })
    ctxStars.restore()
  }
  // A few thin clouds, drifting.
  const clouds: [number, number, number, number][] = [
    [-6, -8.6, 3.2, 0.34],
    [9, -9.6, 4.4, 0.4],
    [22, -8.1, 3.6, 0.3],
    [2, -6.3, 2.4, 0.22],
  ]
  const cloud = mixHex(CENTER.cloud, mixHex(AWARDS.warm, AWARDS.curtain, 0.45), d)
  for (const [cx, cy, rx, a] of clouds) {
    const x = cx + t * 0.025 + f.cx * 0.12
    pool(p, k, [x, cy], rx, rx * 0.16, cloud, a * (1 - 0.72 * d))
    pool(p, k, [x + rx * 0.35, cy + 0.12], rx * 0.6, rx * 0.12, cloud, a * 0.8 * (1 - 0.72 * d))
  }
  // Far hills, then the woods on the horizon, each moving slower than the lawn.
  p.push()
  p.noStroke()
  const layer = (par: number, color: string, step: number, hMin: number, hMax: number, seed: number, round: number) => {
    const shift = f.cx * par
    p.fill(color)
    p.beginShape()
    p.vertex(x0 * k, (HORIZON + 0.02) * k)
    const i0 = Math.floor((x0 - shift) / step) - 1
    const i1 = Math.ceil((x1 - shift) / step) + 1
    for (let i = i0; i <= i1; i++) {
      const xa = i * step + shift
      const hA = hMin + (hMax - hMin) * hash(i, seed)
      const hB = hMin + (hMax - hMin) * hash(i + 1, seed)
      const segs = 6
      for (let s = 0; s < segs; s++) {
        const u = s / segs
        // A row of rounded crowns: each a half-round, higher in its middle.
        const hh = hA + (hB - hA) * u
        const bump = Math.sin(u * Math.PI) * step * round
        p.vertex((xa + u * step) * k, (HORIZON - hh - bump) * k)
      }
    }
    p.vertex(x1 * k, (HORIZON + 0.02) * k)
    p.endShape(p.CLOSE)
  }
  layer(0.8, dk(mixHex(CENTER.tree, CENTER.sky, 0.86), 0.62), 3.6, 0.06, 0.3, 5, 0.07)
  layer(0.45, dk(mixHex(CENTER.tree, CENTER.sky, 0.6), 0.66), 0.34, 0.05, 0.16, 6, 0.28)
  // The lawn behind the path.
  p.fill(dk(mixHex(CENTER.lawn, CENTER.sky, 0.28), 0.6))
  p.rect(x0 * k, HORIZON * k, (x1 - x0) * k, (GROUND - HORIZON + 0.01) * k)
  p.pop()
  // The old trees round the lawn.
  for (const tr of TREES) {
    if (tr.x + tr.w < f.x0 - 1 || tr.x - tr.w > f.x1 + 1) continue
    const sway = Math.sin(t * 0.7 + tr.seed) * 0.05 + Math.sin(t * 0.29 + tr.seed * 2) * 0.04
    drawTree(p, k, { x: tr.x, y: GROUND, h: tr.h, w: tr.w, seed: tr.seed, lw: c.weight * 0.6, sway })
  }
  // The lamps along the path, coming on down the lawn as the evening comes.
  LAMPS.forEach(([x], i) => {
    if (x < f.x0 - 2 || x > f.x1 + 2) return
    drawLamp(p, c, x, lampAt(i, t))
  })
  // The path, and the lawn in front of it to the frame's foot.
  p.push()
  p.noStroke()
  const foot = Math.max(f.y1 + 1, GROUND + 2)
  p.fill(dk(CENTER.path, 0.55))
  p.rect(x0 * k, GROUND * k, (x1 - x0) * k, 0.07 * k)
  p.fill(dk(mixHex(CENTER.path, CENTER.lawnDark, 0.35), 0.6))
  p.rect(x0 * k, (GROUND + 0.07) * k, (x1 - x0) * k, 0.025 * k)
  p.fill(dk(CENTER.lawn, 0.62))
  p.rect(x0 * k, (GROUND + 0.095) * k, (x1 - x0) * k, (foot - GROUND) * k)
  p.fill(dk(CENTER.lawnDark, 0.64))
  p.rect(x0 * k, (GROUND + 1.4) * k, (x1 - x0) * k, (foot - GROUND) * k)
  p.pop()
}
