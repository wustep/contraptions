import type p5 from 'p5'
import { FLOOR } from '../../../../parts'
import { box, frame, part, sample, type Clock, type Ctx } from './kit'
import { EGG_X, ELLIE_LAB, caneOpen, eggOpen, grantLab, pipetteAng } from './motion'
import { ellipse, fillBox, line, vgrad, type C2D } from './pen'
import { LAB } from './worlds'

/**
 * The lab. The cane opens, the rack tips, the egg opens. She is already beside the egg and she stays there. The bench
 * is one long table; he rolls along the top of it.
 */

const TOP = FLOOR

function room(ctx: C2D, k: number, f: ReturnType<typeof frame>): void {
  fillBox(ctx, k, f.x0 - 1, f.y0 - 1, f.x1 + 1, TOP, vgrad(ctx, k, f.y0 - 1, TOP, [[0, LAB.wall], [0.72, LAB.wall], [1, LAB.wallShade]]))
  // A window: flat glass, a mullion. Light is a paler rectangle, not a glow.
  fillBox(ctx, k, 3.2, -3.55, 8.4, -1.15, LAB.glass)
  line(ctx, k, [5.8, -3.55], [5.8, -1.15], LAB.wallShade, k * 0.02)
  line(ctx, k, [3.2, -2.35], [8.4, -2.35], LAB.wallShade, k * 0.02)
  fillBox(ctx, k, f.x0 - 1, TOP, f.x1 + 1, f.y1 + 2, LAB.wallShade)
}

function bench(ctx: C2D, k: number, f: ReturnType<typeof frame>, front: boolean): void {
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  if (!front) {
    fillBox(ctx, k, x0, TOP, x1, TOP + 0.42, LAB.bench)
    // Legs, under the top, behind the front edge.
    for (const x of [-0.2, 4.6, 9.4, 14.2, 19]) fillBox(ctx, k, x, TOP + 0.42, x + 0.28, TOP + 1.55, LAB.benchEdge)
    return
  }
  fillBox(ctx, k, x0, TOP + 0.02, x1, TOP + 0.16, LAB.benchEdge)
}

function cane(ctx: C2D, k: number, t: number): void {
  const open = caneOpen(t)
  const x = 1.85
  const headY = -1.85
  fillBox(ctx, k, x - 0.035, headY + 0.28, x + 0.035, TOP, LAB.cane)
  // The amber splits along its middle. Each half turns out from the centre.
  const spread = open * 0.5
  const half = (sign: number) => {
    ctx.save()
    ctx.translate(x * k, headY * k)
    ctx.rotate(sign * spread)
    ctx.beginPath()
    ctx.ellipse(sign * open * 0.06 * k, 0, 0.34 * k, 0.46 * k, 0, sign > 0 ? -Math.PI / 2 : Math.PI / 2, sign > 0 ? Math.PI / 2 : Math.PI * 1.5)
    ctx.closePath()
    ctx.fillStyle = LAB.amber
    ctx.fill()
    ctx.restore()
  }
  half(-1)
  half(1)
  // The rim, and the speck, which the opening shows.
  if (open > 0.15) {
    ellipse(ctx, k, x, headY, 0.05, 0.035, LAB.ink)
    line(ctx, k, [x - 0.02, headY - 0.04], [x - 0.09, headY - 0.14], LAB.ink, k * 0.01)
    line(ctx, k, [x + 0.02, headY - 0.03], [x + 0.1, headY - 0.12], LAB.ink, k * 0.01)
  }
  ellipse(ctx, k, x, headY + 0.42, 0.07, 0.05, LAB.amberDeep)
}

function pipettes(ctx: C2D, k: number, t: number): void {
  const ang = pipetteAng(t)
  const x = 7.15
  const y = TOP
  const pivot = 0.6
  fillBox(ctx, k, x - 0.15, TOP - 0.06, x + 1.7, TOP + 0.02, LAB.steel)
  ctx.save()
  // Nothing below the bench top. A tipped tube meets the top and stops.
  ctx.beginPath()
  ctx.rect((x - 2) * k, -6 * k, 8 * k, (y + 0.01 + 6) * k)
  ctx.clip()
  ctx.translate((x + pivot) * k, y * k)
  ctx.rotate(ang)
  fillBox(ctx, k, -0.15 - pivot, -0.08, 1.35 - pivot, -0.01, LAB.steel)
  for (let i = 0; i < 5; i++) {
    const px = 0.08 + i * 0.24 - pivot
    fillBox(ctx, k, px, -1.15, px + 0.07, -0.08, LAB.glass)
    fillBox(ctx, k, px, -0.28, px + 0.07, -0.08, LAB.amberDeep)
  }
  ctx.restore()
}

function egg(ctx: C2D, k: number, t: number): void {
  const open = eggOpen(t)
  const x = EGG_X
  const y = -0.28
  // The stand.
  fillBox(ctx, k, x - 0.55, TOP - 0.08, x + 0.55, TOP + 0.06, LAB.steel)
  fillBox(ctx, k, x - 0.7, TOP + 0.06, x + 0.7, TOP + 0.16, LAB.benchEdge)
  const gap = open * 0.22
  // The two halves of the shell, turning out. The inside is the deep amber, flat.
  const half = (sign: number) => {
    ctx.save()
    ctx.translate(x * k, y * k)
    ctx.rotate(sign * open * 0.28)
    ctx.beginPath()
    ctx.ellipse(sign * gap * k, 0, 0.58 * k, 0.72 * k, 0, sign > 0 ? -Math.PI / 2 : Math.PI / 2, sign > 0 ? Math.PI / 2 : Math.PI * 1.5)
    ctx.closePath()
    ctx.fillStyle = open > 0.4 ? LAB.eggShade : LAB.egg
    ctx.fill()
    ctx.restore()
  }
  if (open > 0.05) {
    ctx.save()
    ctx.translate(x * k, y * k)
    ctx.beginPath()
    ctx.ellipse(0, 0, 0.36 * k, 0.5 * k, 0, 0, Math.PI * 2)
    ctx.fillStyle = LAB.amberDeep
    ctx.fill()
    ctx.restore()
  }
  half(-1)
  half(1)
  // A crack line on the shut shell, growing into the gap.
  if (open < 0.85) {
    line(ctx, k, [x, y - 0.55], [x + 0.04, y - 0.1], LAB.eggShade, k * 0.016)
    line(ctx, k, [x + 0.04, y - 0.1], [x - 0.03, y + 0.35], LAB.eggShade, k * 0.016)
  }
}

function drawLab(p: p5, s: Clock, c: Ctx, over: boolean): void {
  const t = s.t0 + c.t
  const ctx = p.drawingContext as C2D
  const f = frame(p, c.k)
  if (!over) {
    room(ctx, c.k, f)
    bench(ctx, c.k, f, false)
    cane(ctx, c.k, t)
    pipettes(ctx, c.k, t)
    egg(ctx, c.k, t)
    return
  }
  bench(ctx, c.k, f, true)
}

export const lab = part<Clock>(
  {
    name: 'lab',
    draw: (p, s, c) => drawLab(p, s, c, false),
    over: (p, s, c) => drawLab(p, s, c, true),
  },
  (slot) =>
    sample(slot, grantLab, box(-8, -12, 26, 8), [
      {
        from: slot.begin,
        to: slot.end,
        who: 'ellie',
        at: () => ({ x: ELLIE_LAB[0], y: ELLIE_LAB[1] }),
      },
    ]),
)
