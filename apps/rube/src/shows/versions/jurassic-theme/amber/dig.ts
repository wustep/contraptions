import type p5 from 'p5'
import { FLOOR } from '../../../../parts'
import { box, frame, hash, part, sample, type Clock, type Ctx } from './kit'
import { BONE_LEN, BONE_PIVOT, boneAng, brushX, grantDig } from './motion'
import { ellipse, fillBox, line, mixHex, shape, vgrad, type C2D } from './pen'
import { DIG } from './worlds'

/**
 * Montana. A brush uncovers him, a bone stands up, and he rolls into a crate. The mesas do not move. The dust is the
 * brush's wake: it is there until the brush has passed, and then it is gone.
 */

const GROUND = FLOOR

function sky(ctx: C2D, k: number, f: ReturnType<typeof frame>): void {
  fillBox(ctx, k, f.x0 - 1, f.y0 - 1, f.x1 + 1, GROUND + 0.2, vgrad(ctx, k, f.y0 - 1, GROUND, [[0, DIG.sky], [1, DIG.skyLow]]))
}

function mesa(ctx: C2D, k: number, f: ReturnType<typeof frame>, base: number, top: number, fill: string, depth: number, seed: number): void {
  const x0 = f.x0 - 2
  const x1 = f.x1 + 2
  const pts: [number, number][] = [[x0, base]]
  // Farther ridges lag the camera, so the badlands have depth. The ridge itself does not move.
  for (let x = x0; x <= x1; x += 0.7) {
    const world = x - (f.cx - 3) * depth
    const h = hash(Math.floor(world * 1.4), seed)
    const plateau = h > 0.62
    pts.push([x, top + (plateau ? -0.35 - h * 0.5 : h * 0.18)])
  }
  pts.push([x1, base])
  shape(ctx, k, pts, fill)
}

function ground(ctx: C2D, k: number, f: ReturnType<typeof frame>): void {
  fillBox(ctx, k, f.x0 - 1, GROUND, f.x1 + 1, f.y1 + 2, vgrad(ctx, k, GROUND, GROUND + 3, [[0, DIG.ground], [1, DIG.groundDark]]))
  line(ctx, k, [f.x0 - 1, GROUND], [f.x1 + 1, GROUND], DIG.groundDark, k * 0.015)
}

function bone(ctx: C2D, k: number, t: number): void {
  const a = boneAng(t)
  const dx = Math.cos(a)
  const dy = Math.sin(a)
  const px = -dy
  const py = dx
  const top: [number, number][] = []
  const bot: [number, number][] = []
  const n = 8
  for (let i = 0; i <= n; i++) {
    const f = i / n
    const w = 0.1 + Math.sin(f * Math.PI) * 0.16
    const x = BONE_PIVOT[0] + dx * BONE_LEN * f
    const y = BONE_PIVOT[1] + dy * BONE_LEN * f
    top.push([x + px * w, y + py * w])
    bot.push([x - px * w, y - py * w])
  }
  shape(ctx, k, [...top, ...bot.reverse()], DIG.bone)
  const tipX = BONE_PIVOT[0] + dx * BONE_LEN
  const tipY = BONE_PIVOT[1] + dy * BONE_LEN
  ellipse(ctx, k, tipX, tipY, 0.28, 0.2, DIG.bone, a)
  ellipse(ctx, k, BONE_PIVOT[0], BONE_PIVOT[1], 0.22, 0.2, mixHex(DIG.bone, DIG.boneDark, 0.35), a)
}

function crate(ctx: C2D, k: number, front: boolean): void {
  const x0 = 7.15
  const x1 = 9.35
  const y0 = -0.72
  const y1 = 0.42
  if (!front) {
    fillBox(ctx, k, x0, y0, x1, y1, DIG.wood)
    line(ctx, k, [x0, y0], [x1, y0], DIG.woodDark, k * 0.02)
    line(ctx, k, [x0, -0.15], [x1, -0.15], DIG.woodDark, k * 0.015)
    return
  }
  // The near slat sits low, so he reads as in the crate.
  fillBox(ctx, k, x0, 0.1, x1, y1, DIG.woodDark)
  line(ctx, k, [x0, 0.1], [x1, 0.1], DIG.ink, k * 0.012)
}

function brush(ctx: C2D, k: number, t: number): void {
  const x = brushX(t)
  shape(ctx, k, [
    [x - 0.62, -1.22],
    [x - 0.48, -1.34],
    [x + 0.04, -0.46],
    [x - 0.1, -0.36],
  ], DIG.wood)
  fillBox(ctx, k, x - 0.24, -0.5, x + 0.24, -0.34, DIG.woodDark)
  for (let i = -3; i <= 3; i++) {
    line(ctx, k, [x + i * 0.055, -0.36], [x + i * 0.06, GROUND + 0.01], DIG.ink, Math.max(1, k * 0.012))
  }
}

function hill(ctx: C2D, k: number, x0: number, x1: number, peak: number): void {
  if (x1 - x0 < 0.08) return
  ctx.beginPath()
  ctx.moveTo(x0 * k, GROUND * k)
  const steps = 14
  for (let i = 1; i < steps; i++) {
    const u = i / steps
    const x = x0 + (x1 - x0) * u
    const hump = Math.sin(u * Math.PI)
    ctx.lineTo(x * k, (GROUND - hump * peak) * k)
  }
  ctx.lineTo(x1 * k, GROUND * k)
  ctx.closePath()
  ctx.fillStyle = DIG.dust
  ctx.fill()
}

function dust(ctx: C2D, k: number, t: number): void {
  const edge = brushX(t)
  // What still covers him, until the brush has passed.
  if (edge < 3.05) hill(ctx, k, Math.max(-1.45, edge), 3.15, 0.55)
  // The spoil the bone stands out of. The brush never reaches it.
  hill(ctx, k, 3.2, 7.05, 0.9)
}

function drawDig(p: p5, s: Clock, c: Ctx, over: boolean): void {
  const t = s.t0 + c.t
  const ctx = p.drawingContext as C2D
  const f = frame(p, c.k)
  if (!over) {
    sky(ctx, c.k, f)
    mesa(ctx, c.k, f, -0.2, -1.55, DIG.mesaFar, 0.45, 2)
    mesa(ctx, c.k, f, GROUND + 0.05, -0.85, DIG.mesa, 0.18, 5)
    ground(ctx, c.k, f)
    bone(ctx, c.k, t)
    crate(ctx, c.k, false)
    brush(ctx, c.k, t)
    return
  }
  dust(ctx, c.k, t)
  crate(ctx, c.k, true)
}

export const dig = part<Clock>(
  {
    name: 'dig',
    draw: (p, s, c) => drawDig(p, s, c, false),
    over: (p, s, c) => drawDig(p, s, c, true),
  },
  (slot) => sample(slot, grantDig, box(-12, -14, 18, 8)),
)
