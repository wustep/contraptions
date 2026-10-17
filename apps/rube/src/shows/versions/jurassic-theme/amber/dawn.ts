import type p5 from 'p5'
import { FLOOR } from '../../../../parts'
import { box, frame, hash, part, sample, type Clock, type Ctx } from './kit'
import { ellieDawn, grantDawn, heliAt, rotorSpan } from './motion'
import { ellipse, fillBox, line, shape, vgrad, type C2D } from './pen'
import { DAWN } from './worlds'

/**
 * Dawn over the island. The rotor becomes a disc, then the helicopter lifts and goes out over the sea. The island
 * does not move. Five birds are already in the air; they drift, they do not flap.
 */

const PAD = FLOOR

function sky(ctx: C2D, k: number, f: ReturnType<typeof frame>): void {
  fillBox(
    ctx,
    k,
    f.x0 - 2,
    f.y0 - 2,
    f.x1 + 2,
    f.y1 + 2,
    vgrad(ctx, k, f.y0 - 2, f.y1 + 2, [
      [0, DAWN.skyHigh],
      [0.45, DAWN.sky],
      [0.78, DAWN.skyDeep],
      [1, DAWN.seaDeep],
    ]),
  )
}

function sea(ctx: C2D, k: number, f: ReturnType<typeof frame>): void {
  const horizon = 1.15
  fillBox(ctx, k, f.x0 - 2, horizon, f.x1 + 2, f.y1 + 2, vgrad(ctx, k, horizon, horizon + 4, [[0, DAWN.sea], [1, DAWN.seaDeep]]))
  line(ctx, k, [f.x0 - 2, horizon], [f.x1 + 2, horizon], DAWN.seaDeep, Math.max(1, k * 0.012))
}

function island(ctx: C2D, k: number, f: ReturnType<typeof frame>): void {
  // A still silhouette. It lags the camera a little, so the sea has distance.
  const ox = (f.cx - 2) * 0.35
  const base = 1.15
  shape(ctx, k, [
    [-8 + ox, base],
    [-6.2 + ox, -0.2],
    [-4.4 + ox, -1.6],
    [-2.6 + ox, -3.4],
    [-1.1 + ox, -1.9],
    [0.8 + ox, -2.6],
    [2.4 + ox, -0.8],
    [4.2 + ox, 0.2],
    [6.5 + ox, base],
  ], DAWN.island)
}

function pad(ctx: C2D, k: number): void {
  // The island's near edge, the same rock, falling to the water. The deck is the only made surface.
  shape(ctx, k, [
    [-2.8, PAD + 0.22],
    [3.0, PAD + 0.22],
    [4.4, 1.15],
    [-4.1, 1.15],
  ], DAWN.island)
  fillBox(ctx, k, -2.6, PAD, 2.8, PAD + 0.22, DAWN.pad)
  line(ctx, k, [-2.6, PAD], [2.8, PAD], DAWN.ink, Math.max(1, k * 0.012))
}

function helicopter(ctx: C2D, k: number, t: number, framePass: boolean): void {
  const [hx, hy] = heliAt(t)
  const span = rotorSpan(t)
  // The cabin is drawn behind the balls. The window frame, on the over pass, sits across them.
  if (!framePass) {
    // Tail boom and fin.
    fillBox(ctx, k, hx - 2.55, hy - 0.08, hx - 0.55, hy + 0.08, DAWN.hull)
    shape(ctx, k, [
      [hx - 2.55, hy - 0.08],
      [hx - 2.15, hy - 0.55],
      [hx - 1.85, hy - 0.55],
      [hx - 2.15, hy + 0.08],
    ], DAWN.hull)
    // Cabin.
    fillBox(ctx, k, hx - 0.95, hy - 0.48, hx + 1.15, hy + 0.32, DAWN.hull)
    fillBox(ctx, k, hx - 0.7, hy - 0.32, hx + 0.85, hy + 0.16, DAWN.glass)
    // Skids.
    line(ctx, k, [hx - 0.7, hy + 0.32], [hx - 0.85, hy + 0.55], DAWN.hullLight, Math.max(1, k * 0.02))
    line(ctx, k, [hx + 0.7, hy + 0.32], [hx + 0.85, hy + 0.55], DAWN.hullLight, Math.max(1, k * 0.02))
    line(ctx, k, [hx - 1.15, hy + 0.55], [hx + 1.15, hy + 0.55], DAWN.hullLight, Math.max(1, k * 0.025))
    // Mast and the disc. The disc widens from a line; it does not spin.
    line(ctx, k, [hx + 0.15, hy - 0.48], [hx + 0.15, hy - 0.72], DAWN.rotor, Math.max(1, k * 0.02))
    const rx = 0.15 + span * 3.15
    const ry = 0.035 + span * 0.02
    ellipse(ctx, k, hx + 0.15, hy - 0.74, rx, ry, DAWN.rotor)
    return
  }
  // Window frame, over the balls, so they are seen through the glass.
  line(ctx, k, [hx + 0.05, hy - 0.32], [hx + 0.05, hy + 0.16], DAWN.hull, Math.max(1, k * 0.02))
  line(ctx, k, [hx - 0.7, hy - 0.08], [hx + 0.85, hy - 0.08], DAWN.hull, Math.max(1, k * 0.018))
}

function birds(ctx: C2D, k: number, t: number, f: ReturnType<typeof frame>): void {
  ctx.strokeStyle = DAWN.bird
  ctx.lineWidth = Math.max(1, k * 0.018)
  ctx.lineJoin = 'round'
  for (let i = 0; i < 5; i++) {
    const x = -4 + i * 3.1 + t * (0.06 + i * 0.012) - (f.cx - 4) * 0.2
    const y = -4.6 - hash(i, 8) * 2.2 - i * 0.12
    const s = 0.16 + hash(i, 1) * 0.08
    ctx.beginPath()
    ctx.moveTo((x - s) * k, (y + s * 0.5) * k)
    ctx.lineTo(x * k, y * k)
    ctx.lineTo((x + s) * k, (y + s * 0.62) * k)
    ctx.stroke()
  }
}

function drawDawn(p: p5, s: Clock, c: Ctx, over: boolean): void {
  const t = s.t0 + c.t
  const ctx = p.drawingContext as C2D
  const f = frame(p, c.k)
  if (!over) {
    sky(ctx, c.k, f)
    sea(ctx, c.k, f)
    island(ctx, c.k, f)
    pad(ctx, c.k)
    helicopter(ctx, c.k, t, false)
    birds(ctx, c.k, t, f)
    return
  }
  helicopter(ctx, c.k, t, true)
}

export const dawn = part<Clock>(
  {
    name: 'dawn',
    draw: (p, s, c) => drawDawn(p, s, c, false),
    over: (p, s, c) => drawDawn(p, s, c, true),
  },
  (slot) =>
    sample(slot, grantDawn, box(-18, -24, 40, 10), [
      { from: slot.begin, to: slot.end + 1, who: 'ellie', at: (t) => ({ x: ellieDawn(t)[0], y: ellieDawn(t)[1] }) },
    ]),
)
