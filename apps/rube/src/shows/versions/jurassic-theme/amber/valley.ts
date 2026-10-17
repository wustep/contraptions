import type p5 from 'p5'
import { FLOOR } from '../../../../parts'
import { box, frame, hash, part, sample, type Clock, type Ctx } from './kit'
import { BOARD, CLEAR } from './music'
import {
  CANOPY,
  GATE_TOP,
  JEEP_X0,
  POST_L,
  POST_R,
  SHOULDER,
  birdAt,
  cageAt,
  ellieValley,
  gateOpen,
  grantValley,
  jeepX,
  neckAng,
} from './motion'
import { ellipse, fillBox, line, mixHex, shape, vgrad, type C2D } from './pen'
import { VALLEY } from './worlds'

/**
 * The valley. The gates open, the jeep drives, a lift carries them onto the shoulder, and the neck rises until the
 * birds leave it. The trees are still. The animal does nothing but grow tall.
 */

const GROUND = FLOOR
const NECK_LEN = 16.2

function sky(ctx: C2D, k: number, f: ReturnType<typeof frame>): void {
  fillBox(ctx, k, f.x0 - 2, f.y0 - 2, f.x1 + 2, 1.2, vgrad(ctx, k, f.y0 - 2, 1.2, [[0, VALLEY.skyHigh], [0.55, VALLEY.sky], [1, mixHex(VALLEY.sky, VALLEY.haze, 0.45)]]))
}

function hills(ctx: C2D, k: number, f: ReturnType<typeof frame>, top: number, fill: string, depth: number, seed: number): void {
  const x0 = f.x0 - 2
  const x1 = f.x1 + 2
  const pts: [number, number][] = [[x0, 1.4]]
  for (let x = x0; x <= x1; x += 0.8) {
    const world = x - (f.cx - 8) * depth
    const h = hash(Math.floor(world * 0.7), seed)
    pts.push([x, top + Math.sin(world * 0.35 + seed) * 0.35 + h * 0.6])
  }
  pts.push([x1, 1.4])
  shape(ctx, k, pts, fill)
}

function ground(ctx: C2D, k: number, f: ReturnType<typeof frame>): void {
  fillBox(ctx, k, f.x0 - 2, GROUND + 0.42, f.x1 + 2, f.y1 + 2, vgrad(ctx, k, GROUND + 0.42, GROUND + 4, [[0, VALLEY.ground], [1, VALLEY.groundDark]]))
  fillBox(ctx, k, f.x0 - 2, GROUND, f.x1 + 2, GROUND + 0.42, VALLEY.grass)
  // A worn strip through the gate to where the jeep stops. It is the surface, not a platform.
  fillBox(ctx, k, -1.5, GROUND, 22.6, GROUND + 0.13, VALLEY.road)
  line(ctx, k, [f.x0 - 2, GROUND], [f.x1 + 2, GROUND], VALLEY.groundDark, Math.max(1, k * 0.012))
}

function trunk(ctx: C2D, k: number, x: number, top: number, seed: number): void {
  const lean = (hash(seed, 4) - 0.5) * 0.45
  const w = 0.32 + hash(seed, 5) * 0.16
  shape(ctx, k, [
    [x - w, GROUND],
    [x + w * 0.85, GROUND],
    [x + w * 0.28 + lean, top + 2.2],
    [x - w * 0.4 + lean, top + 2.2],
  ], VALLEY.tree)
}

function crown(ctx: C2D, k: number, x: number, top: number, seed: number): void {
  // The tallest leaf is the canopy line, so a head above that line has cleared the tree.
  const s = 0.88 + hash(seed, 2) * 0.28
  const fill = hash(seed, 6) > 0.5 ? VALLEY.canopy : VALLEY.canopyDeep
  ellipse(ctx, k, x, top + 2.3 * s, 3.15 * s, 2.3 * s, fill)
  ellipse(ctx, k, x - 1.45 * s, top + 3.05 * s, 1.7 * s, 1.45 * s, VALLEY.canopyDeep)
  ellipse(ctx, k, x + 1.5 * s, top + 2.9 * s, 1.55 * s, 1.35 * s, VALLEY.canopy)
}

const TREES: { x: number; drop: number }[] = [
  { x: -4.2, drop: 6.5 },
  { x: 11.5, drop: 3.2 },
  { x: 16.8, drop: 1.4 },
  { x: 21.4, drop: 4.8 },
  { x: 29.0, drop: 2.2 },
  { x: 33.4, drop: 0.4 },
  { x: 36.8, drop: 0 },
  { x: 42.0, drop: 3.6 },
]

/** How thick the neck is below the line the balls ride. Thick along its length, then a small head. */
function neckWidth(f: number): number {
  const taper = f < 0.78 ? 0 : (f - 0.78) / 0.22
  const u = taper * taper * (3 - 2 * taper)
  return 0.2 + 1.22 * (1 - u)
}

function animal(ctx: C2D, k: number, t: number): void {
  const a = neckAng(t)
  const dx = Math.cos(a)
  const dy = -Math.sin(a)
  // Points down-screen when the neck points right, so the mass hangs below the line they ride.
  const px = Math.sin(a)
  const py = Math.cos(a)
  const at = (f: number): [number, number] => [SHOULDER[0] + dx * NECK_LEN * f, SHOULDER[1] + dy * NECK_LEN * f]
  const hung = (f: number, down: number): [number, number] => {
    const [x, y] = at(f)
    return [x + px * down, y + py * down]
  }
  const leg = (x: number, top: number, w: number, fill: string) => {
    shape(ctx, k, [
      [x, top],
      [x + w * 0.7, top + 0.18],
      [x + w * 0.58, GROUND - 0.02],
      [x + w * 0.92, GROUND + 0.015],
      [x - w * 0.22, GROUND + 0.015],
      [x - w * 0.06, GROUND - 0.02],
    ], fill)
  }
  leg(14.6, -6.6, 0.9, VALLEY.hideDark)
  leg(17.0, -6.4, 0.95, VALLEY.hide)
  leg(20.3, -6.9, 0.95, VALLEY.hideDark)
  leg(22.6, -6.7, 1.05, VALLEY.hide)
  // Level back, deep chest, tail clear of the gate. The shoulder point is where the neck leaves.
  shape(ctx, k, [
    [10.4, -5.15],
    [12.2, -6.25],
    [14.6, -7.05],
    [17.4, -7.45],
    [20.2, -7.62],
    [22.8, -7.6],
    [24.2, -6.55],
    [25.05, -5.2],
    [24.7, -4.15],
    [22.2, -3.8],
    [19.0, -3.7],
    [15.8, -3.95],
    [13.2, -4.45],
    [11.4, -4.85],
    [10.6, -4.7],
  ], VALLEY.hide)
  // Neck: the balls ride the top edge. The mass hangs below it and meets the shoulder.
  const n = 16
  const back: [number, number][] = [hung(-0.08, 0)]
  const under: [number, number][] = []
  for (let i = 0; i <= n; i++) {
    const f = i / n
    back.push(hung(f, 0))
    under.push(hung(f, neckWidth(f)))
  }
  under.push(hung(-0.08, neckWidth(0)))
  const tip = at(1)
  const skull: [number, number][] = [
    [tip[0] - px * 0.2 + dx * 0.1, tip[1] - py * 0.2 + dy * 0.1],
    [tip[0] - px * 0.26 + dx * 0.55, tip[1] - py * 0.26 + dy * 0.55],
    [tip[0] - px * 0.06 + dx * 1.15, tip[1] - py * 0.06 + dy * 1.15],
    [tip[0] + dx * 1.4, tip[1] + dy * 1.4],
    [tip[0] + px * 0.16 + dx * 0.85, tip[1] + py * 0.16 + dy * 0.85],
    [tip[0] + px * 0.36 + dx * 0.12, tip[1] + py * 0.36 + dy * 0.12],
  ]
  shape(ctx, k, [...back, ...skull, ...under.reverse()], VALLEY.hide)
  const eye: [number, number] = [tip[0] + dx * 0.36 - px * 0.04, tip[1] + dy * 0.36 - py * 0.04]
  ellipse(ctx, k, eye[0], eye[1], 0.045, 0.045, VALLEY.ink)
  // The basket is a short rail on the line they ride, nothing above them.
  const cage = cageAt(t)
  const reach = 0.52
  shape(ctx, k, [
    [cage[0] - dx * 0.2, cage[1] - dy * 0.2],
    [cage[0] + dx * (reach + 0.22), cage[1] + dy * (reach + 0.22)],
    [cage[0] + dx * (reach + 0.22) + px * 0.07, cage[1] + dy * (reach + 0.22) + py * 0.07],
    [cage[0] - dx * 0.2 + px * 0.07, cage[1] - dy * 0.2 + py * 0.07],
  ], VALLEY.jeepDark)
}

function jeep(ctx: C2D, k: number, t: number): void {
  const x = jeepX(Math.max(t, 0))
  const spin = (x - JEEP_X0) / 0.3
  const wheel = (wx: number) => {
    ellipse(ctx, k, wx, -0.16, 0.3, 0.3, VALLEY.tire)
    ctx.save()
    ctx.translate(wx * k, -0.16 * k)
    ctx.rotate(spin)
    ctx.strokeStyle = VALLEY.steelEdge
    ctx.lineWidth = Math.max(1, k * 0.015)
    ctx.beginPath()
    ctx.moveTo(-0.18 * k, 0)
    ctx.lineTo(0.18 * k, 0)
    ctx.moveTo(0, -0.18 * k)
    ctx.lineTo(0, 0.18 * k)
    ctx.stroke()
    ctx.restore()
  }
  wheel(x + 0.42)
  wheel(x + 1.95)
  shape(ctx, k, [
    [x + 0.02, 0.06],
    [x + 0.28, -0.22],
    [x + 1.2, -0.28],
    [x + 1.48, -0.52],
    [x + 2.28, -0.52],
    [x + 2.42, 0.08],
    [x + 0.12, 0.1],
  ], VALLEY.jeepDark)
  fillBox(ctx, k, x + 0.32, -0.24, x + 1.18, -0.1, VALLEY.jeep)
  shape(ctx, k, [
    [x + 1.46, -0.28],
    [x + 1.58, -0.72],
    [x + 2.16, -0.72],
    [x + 2.26, -0.28],
  ], VALLEY.steel)
  fillBox(ctx, k, x + 2.22, -0.22, x + 2.34, 0.06, VALLEY.steel)
}

function gates(ctx: C2D, k: number, t: number): void {
  const open = Math.max(0, Math.min(1, gateOpen(t)))
  const top = GATE_TOP
  const fence = (x0: number, x1: number) => {
    for (const x of [x0, (x0 + x1) / 2, x1]) fillBox(ctx, k, x - 0.08, -1.85, x + 0.08, GROUND, VALLEY.steelDark)
    for (const y of [-1.7, -1.05, -0.4]) line(ctx, k, [x0, y], [x1, y], VALLEY.steel, Math.max(1, k * 0.02))
  }
  fence(-8, POST_L - 0.45)
  fence(POST_R + 0.45, 16)
  fillBox(ctx, k, POST_L - 0.28, top, POST_L + 0.28, GROUND, VALLEY.steel)
  fillBox(ctx, k, POST_R - 0.28, top, POST_R + 0.28, GROUND, VALLEY.steel)
  fillBox(ctx, k, POST_L - 0.42, top, POST_L + 0.42, top + 0.28, VALLEY.steelDark)
  fillBox(ctx, k, POST_R - 0.42, top, POST_R + 0.42, top + 0.28, VALLEY.steelDark)
  const full = (POST_R - POST_L) / 2 - 0.4
  const remain = 1 - 0.78 * open
  const leaf = (hinge: number, dir: number) => {
    const w = full * remain
    const x0 = dir > 0 ? hinge : hinge - w
    const x1 = dir > 0 ? hinge + w : hinge
    const yTop = top + 0.32
    const span = GROUND - 0.04 - yTop
    const count = 10
    const step = span / count
    for (let i = 0; i < count; i++) {
      const y = yTop + step * i
      fillBox(ctx, k, x0, y, x1, y + step * 0.58, i % 2 ? VALLEY.steel : VALLEY.steelDark)
    }
    line(ctx, k, [hinge, yTop], [hinge, GROUND], VALLEY.steelDark, Math.max(1.5, k * 0.04))
  }
  leaf(POST_L + 0.22, 1)
  leaf(POST_R - 0.22, -1)
}

function lift(ctx: C2D, k: number, t: number): void {
  // The platform exists only while it is climbing. At the crest it is the basket.
  if (t < BOARD || t > CLEAR) return
  const g = grantValley(t)
  const e = ellieValley(t)
  const x0 = Math.min(g[0], e[0]) - 0.35
  const x1 = Math.max(g[0], e[0]) + 0.35
  const y = Math.max(g[1], e[1]) + 0.16
  fillBox(ctx, k, x0, y, x1, y + 0.08, VALLEY.jeepDark)
}

function birds(ctx: C2D, k: number, t: number): void {
  ctx.strokeStyle = VALLEY.ink
  ctx.lineWidth = Math.max(1, k * 0.02)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  for (let i = 0; i < 7; i++) {
    const [x, y] = birdAt(t, i)
    const s = 0.18 + (i % 3) * 0.04
    ctx.beginPath()
    ctx.moveTo((x - s) * k, (y + s * 0.55) * k)
    ctx.lineTo(x * k, y * k)
    ctx.lineTo((x + s) * k, (y + s * 0.7) * k)
    ctx.stroke()
  }
}

function drawValley(p: p5, s: Clock, c: Ctx, over: boolean): void {
  const t = s.t0 + c.t
  const ctx = p.drawingContext as C2D
  const f = frame(p, c.k)
  if (!over) {
    sky(ctx, c.k, f)
    hills(ctx, c.k, f, -2.4, VALLEY.hillFar, 0.55, 1)
    hills(ctx, c.k, f, -0.6, VALLEY.hill, 0.22, 2)
    ground(ctx, c.k, f)
    for (const tree of TREES) trunk(ctx, c.k, tree.x, CANOPY + tree.drop, Math.round(tree.x * 10))
    animal(ctx, c.k, t)
    jeep(ctx, c.k, t)
    gates(ctx, c.k, t)
    lift(ctx, c.k, t)
    return
  }
  for (const tree of TREES) crown(ctx, c.k, tree.x, CANOPY + tree.drop, Math.round(tree.x * 10))
  // A roll bar over the open jeep, so the two of them read as in it.
  if (t < CLEAR) {
    const x = jeepX(t)
    ctx.strokeStyle = VALLEY.steelDark
    ctx.lineWidth = Math.max(1, c.k * 0.035)
    ctx.beginPath()
    ctx.moveTo((x + 0.25) * c.k, -0.05 * c.k)
    ctx.lineTo((x + 0.25) * c.k, -0.72 * c.k)
    ctx.lineTo((x + 1.7) * c.k, -0.72 * c.k)
    ctx.lineTo((x + 1.7) * c.k, -0.05 * c.k)
    ctx.stroke()
  }
  birds(ctx, c.k, t)
}

export const valley = part<Clock>(
  {
    name: 'valley',
    draw: (p, s, c) => drawValley(p, s, c, false),
    over: (p, s, c) => drawValley(p, s, c, true),
  },
  (slot) =>
    sample(slot, grantValley, box(-20, -52, 60, 14), [
      { from: slot.begin, to: slot.end, who: 'ellie', at: (t) => ({ x: ellieValley(t)[0], y: ellieValley(t)[1] }) },
    ]),
)
