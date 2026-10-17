import { hash } from '../kit'
import { layer, rgbaOf, type View } from '../depth'
import { ANCHOR, figure, floorAt, floorOf, REF } from './hall'
import { DOOR_X, FLOOR, T0, WALL } from './press-plan'
import { steam } from './steam'

/**
 * The street through the loading door (the PRESS builder's): the New York morning he is shoved out into. A pale gold
 * sky, the avenue's towers in the haze down the far end, the fronts across the road in cream and tan stone with their
 * fire escapes and green awnings, the low sun raking along them and the shadows cool; a taxi going by, people on the
 * far pavement, steam off a manhole; and the near pavement he lands on, its joints running back to the eye.
 *
 * It stands on the hall's planes (`hall.ts`), so it moves under the camera as the hall does, and is drawn only right
 * of the door.
 */

type C2 = CanvasRenderingContext2D

const SKY: [number, string][] = [
  [0, '#C4D6DB'],
  [0.55, '#F1E1C0'],
  [1, '#F6CF92'],
]
const STONE = ['#DCD2C1', '#C8B79F', '#D7C7AC', '#BCA88E']
/** The fronts across the road, side by side from a fixed corner, in their plane's cells: each its left edge, width and height. */
const FRONTS: { i: number; x: number; w: number; h: number }[] = (() => {
  const out: { i: number; x: number; w: number; h: number }[] = []
  for (let i = 0, x = 4; x < 40; i++) {
    const w = 1.5 + 0.8 * hash(i, 1, 93)
    out.push({ i, x, w, h: 2.6 + 2.4 * hash(i, 2, 93) })
    x += w
  }
  return out
})()

export function drawOutside(ctx: C2, v: View, t: number): void {
  if (v.x1 < DOOR_X) return
  const k = v.k
  ctx.save()
  // Right of the door; under the floor's line, right of the end wall's foot as it runs out toward the eye.
  ctx.beginPath()
  const drop = FLOOR - v.cy
  const yb = v.y1 + 1
  const xb = drop > 0.05 ? v.cx + (WALL.x1 - v.cx) * ((yb - v.cy) / drop) : WALL.x1
  ctx.moveTo(DOOR_X * k, (v.y0 - 1) * k)
  ctx.lineTo((Math.max(v.x1, xb) + 1) * k, (v.y0 - 1) * k)
  ctx.lineTo((Math.max(v.x1, xb) + 1) * k, yb * k)
  ctx.lineTo(xb * k, yb * k)
  ctx.lineTo(WALL.x1 * k, FLOOR * k)
  ctx.lineTo(DOOR_X * k, FLOOR * k)
  ctx.closePath()
  ctx.clip()
  // Where the street's ground starts, left of the clip's edge wherever that is.
  const x0 = Math.min(DOOR_X, xb) - 0.5
  // The sky, near the lens.
  const g = ctx.createLinearGradient(0, (v.y0 - 0.2) * k, 0, floorAt(v, 0.3) * k)
  for (const [u, c] of SKY) g.addColorStop(u, c)
  ctx.fillStyle = g
  ctx.fillRect(DOOR_X * k, (v.y0 - 1) * k, (v.x1 - DOOR_X + 1) * k, (floorAt(v, 0.3) - v.y0 + 1) * k)
  // The avenue's towers down the far end, pale in the gold haze.
  layer(ctx, v, 0.28, ANCHOR, REF, (s) => {
    ctx.save()
    ctx.scale(k, k)
    const base = floorOf(0.28)
    const p = new Path2D()
    for (let i = Math.floor(s.x0 / 0.7); i * 0.7 < s.x1 + 0.7; i++) {
      const w = 0.4 + 0.35 * hash(i, 1, 91)
      const h = 1.2 + 2.6 * hash(i, 2, 91) * hash(i, 3, 91)
      p.rect(i * 0.7, base - h, w, h)
      if (hash(i, 4, 91) > 0.7) p.rect(i * 0.7 + w * 0.4, base - h - 0.4, w * 0.2, 0.4)
    }
    ctx.fillStyle = '#E2CFAE'
    ctx.fill(p)
    ctx.fillStyle = rgbaOf('#F7E3BE', 0.5)
    ctx.fillRect(s.x0, base - 1.2, s.w, 1.3)
    ctx.restore()
  })
  // The fronts across the road.
  layer(ctx, v, 0.55, ANCHOR, REF, (s) => {
    ctx.save()
    ctx.scale(k, k)
    const base = floorOf(0.55)
    const sunlit = new Path2D()
    const shade = new Path2D()
    const glass = new Path2D()
    const gold = new Path2D()
    const iron = new Path2D()
    const awning = new Path2D()
    for (const { i, x, w, h } of FRONTS) {
      if (x > s.x1 + 0.5 || x + w < s.x0 - 0.5) continue
      ctx.fillStyle = STONE[Math.floor(hash(i, 3, 93) * STONE.length)]
      ctx.fillRect(x, base - h, w - 0.02, h)
      // Its cornice catching the sun; the cool shadow down its returns.
      sunlit.rect(x - 0.03, base - h - 0.06, w + 0.04, 0.08)
      shade.rect(x + w - 0.16, base - h, 0.14, h)
      shade.rect(x - 0.03, base - h + 0.02, w + 0.04, 0.05)
      // Windows: rows of them, a few catching the low sun.
      for (let y = base - h + 0.32; y < base - 0.8; y += 0.42) {
        for (let wx = x + 0.18; wx < x + w - 0.3; wx += 0.3) {
          const lit = hash(Math.round(wx * 10), Math.round(y * 10), 94) > 0.93
          ;(lit ? gold : glass).rect(wx, y, 0.16, 0.24)
        }
      }
      // A fire escape down every other front: landings and their ladders.
      if (i % 2 === 0) {
        const fx = x + w * 0.3
        for (let y = base - h + 0.62; y < base - 0.9; y += 0.42) {
          iron.rect(fx, y, w * 0.4, 0.025)
          iron.rect(fx, y - 0.14, w * 0.4, 0.008)
          iron.moveTo(fx + w * 0.05, y)
          iron.lineTo(fx + w * 0.35, y + 0.42)
          iron.lineTo(fx + w * 0.35 + 0.015, y + 0.42)
          iron.lineTo(fx + w * 0.05 + 0.015, y)
          iron.closePath()
        }
      }
      // A shop at its foot under a green awning.
      shade.rect(x, base - 0.75, w - 0.02, 0.75)
      awning.moveTo(x + 0.08, base - 0.78)
      awning.lineTo(x + w - 0.1, base - 0.78)
      awning.lineTo(x + w - 0.02, base - 0.58)
      awning.lineTo(x, base - 0.58)
      awning.closePath()
    }
    ctx.fillStyle = rgbaOf('#F7D9A2', 0.55)
    ctx.fill(sunlit)
    ctx.fillStyle = rgbaOf('#6D7F90', 0.35)
    ctx.fill(shade)
    ctx.fillStyle = '#9A9C98'
    ctx.fill(glass)
    ctx.fillStyle = '#F4D49C'
    ctx.fill(gold)
    ctx.fillStyle = rgbaOf('#3A4247', 0.5)
    ctx.fill(iron)
    ctx.fillStyle = '#4F6A58'
    ctx.fill(awning)
    // People on the far pavement, walking to work, each on their own way through the morning.
    const men = new Path2D()
    for (let j = 0; j < 4; j++) {
      const vx = (hash(j, 1, 95) < 0.5 ? -1 : 1) * (0.18 + 0.1 * hash(j, 2, 95))
      const px = 15 + 10 * hash(j, 3, 95) + vx * (t - T0)
      if (px < s.x0 - 0.5 || px > s.x1 + 0.5) continue
      figure(men, px, base + 0.02 - 0.012 * Math.abs(Math.sin(t * 5 + j)), 0.5, Math.sin(t * 5 + j), vx)
    }
    ctx.fillStyle = rgbaOf('#4A4440', 0.85)
    ctx.fill(men)
    ctx.restore()
  })
  // The road: its far kerb, the asphalt, a dashed line down it; steam off a manhole.
  layer(ctx, v, 0.75, ANCHOR, REF, (s) => {
    ctx.save()
    ctx.scale(k, k)
    const kerb = floorOf(0.55)
    const mid = floorOf(0.75)
    ctx.fillStyle = '#B9AD9A'
    ctx.fillRect(s.x0 - 0.5, kerb - 0.02, s.w + 1, 0.08)
    ctx.fillStyle = '#5F5B57'
    ctx.fillRect(s.x0 - 0.5, kerb + 0.06, s.w + 1, s.y1 - kerb)
    const dash = new Path2D()
    for (let x = Math.floor(s.x0 / 0.9) * 0.9; x < s.x1 + 0.5; x += 0.9) dash.rect(x, mid - 0.02, 0.45, 0.035)
    ctx.fillStyle = rgbaOf('#ECE6D6', 0.7)
    ctx.fill(dash)
    // Steam off the manholes in the road, one every seven cells.
    for (let mx = Math.floor((s.x0 - 1) / 7) * 7 + 3.5; mx < s.x1 + 2; mx += 7) {
      ctx.fillStyle = '#56524E'
      ctx.beginPath()
      ctx.ellipse(mx, mid + 0.25, 0.3, 0.05, 0, 0, Math.PI * 2)
      ctx.fill()
      steam(ctx, t, mx, mid + 0.22, mx, 1)
    }
    ctx.restore()
  })
  // A taxi going by in the far lane while he rides out, gone before he is on the pavement.
  layer(ctx, v, 0.62, ANCHOR, REF, (s) => {
    const cx = 16.5 + 3.1 * (t - 221)
    if (cx < s.x0 - 1 || cx > s.x1 + 1) return
    const cy = floorOf(0.62)
    ctx.save()
    ctx.scale(k, k)
    ctx.translate(cx, cy)
    ctx.scale(0.72, 0.72)
    ctx.fillStyle = '#D9A13E'
    ctx.beginPath()
    ctx.moveTo(-0.9, 0)
    ctx.lineTo(-0.9, -0.24)
    ctx.lineTo(-0.45, -0.27)
    ctx.lineTo(-0.28, -0.5)
    ctx.lineTo(0.36, -0.5)
    ctx.lineTo(0.58, -0.27)
    ctx.lineTo(0.9, -0.22)
    ctx.lineTo(0.9, 0)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#3B464C'
    ctx.fillRect(-0.22, -0.46, 0.25, 0.17)
    ctx.fillRect(0.07, -0.46, 0.24, 0.17)
    ctx.fillStyle = '#1D2124'
    for (const wx of [-0.55, 0.55]) {
      ctx.beginPath()
      ctx.arc(wx, 0, 0.13, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = rgbaOf('#FFF3D6', 0.8)
    ctx.fillRect(-0.3, -0.5, 0.64, 0.025)
    ctx.restore()
  })
  // The near pavement, from the kerb to under the camera: warm stone, its joints running back to the eye.
  ctx.save()
  ctx.scale(k, k)
  const kerb = floorAt(v, 0.88)
  ctx.fillStyle = '#C9BBA4'
  ctx.fillRect(x0, kerb - 0.03, v.x1 - x0 + 1, 0.06)
  // Warm stone, the low sun full on it.
  ctx.fillStyle = '#B4A68F'
  ctx.fillRect(x0, kerb + 0.03, v.x1 - x0 + 1, v.y1 - kerb + 1)
  const joints = new Path2D()
  if (drop > 0.05) {
    for (let z = 0.9; z < 12; z *= 1.32) {
      const y = floorAt(v, z)
      if (y < kerb || y > v.y1 + 0.2) continue
      joints.rect(x0, y, v.x1 - x0 + 1, 0.012)
    }
    const fa = (kerb - v.cy) / drop
    const fb = (v.y1 + 0.2 - v.cy) / drop
    for (let x = Math.floor((x0 - 8) / 0.9) * 0.9; x < v.x1 + 8; x += 0.9) {
      const ax = v.cx + (x - v.cx) * fa
      const bx = v.cx + (x - v.cx) * fb
      if (Math.max(ax, bx) < x0 || Math.min(ax, bx) > v.x1 + 0.5) continue
      joints.moveTo(ax, kerb)
      joints.lineTo(bx, v.y1 + 0.2)
      joints.lineTo(bx + 0.015, v.y1 + 0.2)
      joints.lineTo(ax + 0.01, kerb)
      joints.closePath()
    }
  }
  ctx.fillStyle = rgbaOf('#857A6B', 0.6)
  ctx.fill(joints)
  ctx.restore()
  // A lamppost at the kerb, and its long morning shadow raking across the pavement.
  layer(ctx, v, 0.93, ANCHOR, REF, (s) => {
    const px = 22.6
    if (px < s.x0 - 3 || px > s.x1 + 0.5) return
    const fy = floorOf(0.93)
    ctx.save()
    ctx.scale(k, k)
    ctx.fillStyle = rgbaOf('#5E7186', 0.28)
    ctx.beginPath()
    ctx.moveTo(px - 0.05, fy)
    ctx.lineTo(px + 0.05, fy)
    ctx.lineTo(px + 3.4, fy + 0.95)
    ctx.lineTo(px + 3.2, fy + 0.95)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#3D4A47'
    ctx.fillRect(px - 0.035, fy - 3.4, 0.07, 3.4)
    ctx.fillRect(px - 0.08, fy - 0.35, 0.16, 0.35)
    ctx.fillRect(px - 0.035, fy - 3.4, 0.6, 0.05)
    ctx.beginPath()
    ctx.moveTo(px + 0.42, fy - 3.37)
    ctx.lineTo(px + 0.72, fy - 3.37)
    ctx.lineTo(px + 0.66, fy - 3.25)
    ctx.lineTo(px + 0.48, fy - 3.25)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = rgbaOf('#F7DDA8', 0.6)
    ctx.fillRect(px + 0.02, fy - 3.4, 0.016, 3.05)
    ctx.restore()
  })
  ctx.restore()
}
