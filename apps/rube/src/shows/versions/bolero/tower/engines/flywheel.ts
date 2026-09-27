import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { mixHex } from '../../../../../parts'
import type { Engine } from './kit'
import { BAR, T0 } from '../music'
import { BRASS, GOLD, INK, IRON, PAPER, clamp, deep, pale, smooth } from '../look'

/**
 * The flywheel: a steam engine, run from the mast. A belt from a pulley on the mast drives a pulley on the flywheel's
 * shaft, behind the wheel; the wheel carries the crank, the connecting rod crosses the mast to the crosshead in its
 * guides, and the piston rod works the piston in the cylinder on the other side. It turns once every two bars, the
 * drum's own turn, and heaves a little on every downbeat (the strings' low pluck): a kick, and the wheel's weight
 * carrying it on.
 *
 * Until it is let in it stands still with the crank on a dead centre and a brake band clamped round the wheel; as it
 * is let in the brake lever is thrown, the band lets go, and the engine runs up to speed over two bars.
 */

const CYCLE = 2 * BAR
const OMEGA = (2 * Math.PI) / CYCLE
/** When the machine stops for good: the collapse. */
const STOP = 845
const STOP_RUN = 2.6

/** The shaft (heights below the box's top) and the wheel. */
const SHAFT = { x: -1.2, y: 0.68 }
const WHEEL = 0.6
const RIM = 0.1
/** The crank's throw and the connecting rod. */
const THROW = 0.3
const ROD = 2.3
/** The mast's pulley, and the drive pulley behind the wheel. */
const PULLEY = { x: 0, y: 0.3, r: 0.17 }
const DRIVE = 0.3
/** The crosshead's guides, the cylinder, and from the crosshead to the piston. */
const GUIDES: [number, number] = [0.52, 1.78]
const CYL: [number, number] = [1.86, 3.22]
const BORE: [number, number] = [2.0, 3.08]
const PISTON = 1.4
const CYL_R = 0.27
/** The bed the engine stands on, and the brake lever's pivot. */
const BED: [number, number, number, number] = [-2.0, 1.24, 3.4, 1.34]
const LEVER = { x: -2.28, y: 1.24, len: 0.84 }
/** The brake band's span round the wheel (radians, y down: from the lower left round to the top). */
const BAND: [number, number] = [(140 * Math.PI) / 180, (252 * Math.PI) / 180]

/** ∫ smoothstep from 0 to u. */
const S = (u: number): number => {
  const v = clamp(u)
  return v * v * v - (v * v * v * v) / 2
}

/** Seconds run at full speed since `a`: running up over `d`, and running down to rest from the collapse. */
function run(t: number, a: number, d: number): number {
  if (t <= a) return 0
  let s = d * S((t - a) / d) + Math.max(0, t - a - d)
  if (t > STOP) s -= STOP_RUN * S((t - STOP) / STOP_RUN) + Math.max(0, t - STOP - STOP_RUN)
  return s
}
/** How fast it is running, 0 to 1. */
const pace = (t: number, a: number, d: number): number => smooth(t, a, a + d) * (1 - smooth(t, STOP, STOP + STOP_RUN))

/**
 * The heave: over each bar, a kick on the downbeat and the wheel's weight carrying it on, as an angle added to the
 * steady turn. Its slope jumps on the downbeat and decays through the bar; over a whole bar it adds nothing.
 */
const TAU = 0.2
const heave = (u: number): number => TAU * (1 - Math.exp(-u / TAU)) - u * TAU * (1 - Math.exp(-1 / TAU))

type Pt = { x: number; y: number }

/** A bar with rounded ends: an ink line under a narrower line of its fill. */
function bar(p: p5, k: number, a: Pt, b: Pt, w: number, fill: string, edge: number): void {
  p.noFill()
  p.stroke(INK)
  p.strokeWeight(w * k + 2 * edge)
  p.line(a.x * k, a.y * k, b.x * k, b.y * k)
  p.stroke(fill)
  p.strokeWeight(w * k)
  p.line(a.x * k, a.y * k, b.x * k, b.y * k)
}

/** The two straight runs of an open belt round two pulleys (c1 the bigger): the points where each leaves each pulley. */
function belt(c1: Pt, r1: number, c2: Pt, r2: number): [Pt, Pt, Pt, Pt] {
  const dx = c2.x - c1.x
  const dy = c2.y - c1.y
  const d = Math.hypot(dx, dy)
  const base = Math.atan2(dy, dx)
  const off = Math.acos((r1 - r2) / d)
  const at = (c: Pt, r: number, a: number): Pt => ({ x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) })
  return [at(c1, r1, base + off), at(c2, r2, base + off), at(c1, r1, base - off), at(c2, r2, base - off)]
}

export const flywheel: Engine = (p, c, _st, t, e) => {
  if (e.open < 0.75) return
  const { k, weight } = c
  const y0 = e.box.y0
  const Y = (y: number): number => y0 + y
  const gild = (hex: string): string => (e.gold > 0 ? mixHex(hex, GOLD, 0.5 * e.gold) : hex)
  const at = t - e.since
  const push = clamp((e.amp - 0.72) / 0.26)

  // The turn: at rest on a dead centre until let in, then running up over two bars into step with the drum, with
  // the heave on every downbeat once it is going.
  const a = at + 0.3
  const runUp = 4.4
  const going = pace(t, a, runUp)
  const bars = (t - T0) / BAR
  const turn = OMEGA * (run(t, a, runUp) + a + runUp / 2 - T0) + (0.75 + 0.8 * push) * going * heave(bars - Math.floor(bars))
  const brake = 1 - e.on

  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.push()
  ctx.globalAlpha *= smooth(e.open, 0.75, 1)

  const color = e.color
  const iron = gild(pale(IRON, 0.12))
  const steel = gild(pale(IRON, 0.4))
  const brass = gild(BRASS)
  const wine = gild(color)
  const bedFill = gild(deep(color, 0.35))
  const leather = gild(deep(color, 0.2))
  const fine = weight * 0.5
  const S0 = { x: SHAFT.x, y: Y(SHAFT.y) }
  const pin: Pt = { x: S0.x + THROW * Math.cos(turn + Math.PI), y: S0.y + THROW * Math.sin(turn + Math.PI) }
  const xh = pin.x + Math.sqrt(ROD * ROD - (pin.y - S0.y) ** 2)
  const X = { x: xh, y: S0.y }
  p.rectMode(p.CORNERS)

  // The bed, bolted to the mast and hung from the storey's hangers.
  solid(p, INK, weight, bedFill)
  p.rect(BED[0] * k, Y(BED[1]) * k, BED[2] * k, Y(BED[3]) * k, 0.03 * k)

  // The wheel's pedestal, behind it.
  bar(p, k, { x: S0.x - 0.34, y: Y(BED[1]) }, S0, 0.07, iron, weight * 0.6)
  bar(p, k, { x: S0.x + 0.34, y: Y(BED[1]) }, S0, 0.07, iron, weight * 0.6)

  // The drive: the mast's pulley, the belt, and the pulley on the shaft behind the wheel.
  const P0 = { x: PULLEY.x, y: Y(PULLEY.y) }
  const [a1, b1, a2, b2] = belt(S0, DRIVE, P0, PULLEY.r)
  bar(p, k, a1, b1, 0.035, leather, weight * 0.5)
  bar(p, k, a2, b2, 0.035, leather, weight * 0.5)
  solid(p, INK, weight, gild(pale(color, 0.3)))
  p.circle(S0.x * k, S0.y * k, (DRIVE + 0.02) * 2 * k)
  outline(p, INK, fine)
  p.circle(S0.x * k, S0.y * k, (DRIVE - 0.05) * 2 * k)
  pulley(p, k, weight, P0, PULLEY.r, (turn * DRIVE) / PULLEY.r, steel, brass)

  // The wheel: a heavy rim, six spokes, the hub.
  p.push()
  p.translate(S0.x * k, S0.y * k)
  p.rotate(turn)
  for (let i = 0; i < 6; i++) {
    const g = (i * Math.PI) / 3
    const inner = { x: Math.cos(g) * 0.08, y: Math.sin(g) * 0.08 }
    const outer = { x: Math.cos(g) * (WHEEL - RIM / 2), y: Math.sin(g) * (WHEEL - RIM / 2) }
    bar(p, k, inner, outer, 0.055, iron, weight * 0.6)
  }
  p.noFill()
  p.stroke(INK)
  p.strokeWeight(RIM * k + 2 * weight)
  p.circle(0, 0, (WHEEL - RIM / 2) * 2 * k)
  p.stroke(iron)
  p.strokeWeight(RIM * k)
  p.circle(0, 0, (WHEEL - RIM / 2) * 2 * k)
  outline(p, INK, fine)
  p.circle(0, 0, (WHEEL - RIM * 0.72) * 2 * k)
  p.pop()

  // The brake: a band round the wheel's upper left, one end hung from the ceiling, the other on the lever's short arm.
  const bandR = WHEEL + 0.03 + 0.05 * (1 - brake)
  const lean = -0.42 * brake + 0.2 * (1 - brake)
  const L0 = { x: LEVER.x, y: Y(LEVER.y) }
  const lever = { x: L0.x + Math.sin(lean) * LEVER.len, y: L0.y - Math.cos(lean) * LEVER.len }
  const short = { x: L0.x + Math.sin(lean) * 0.26, y: L0.y - Math.cos(lean) * 0.26 }
  const bandA = { x: S0.x + Math.cos(BAND[1]) * bandR, y: S0.y + Math.sin(BAND[1]) * bandR }
  const bandB = { x: S0.x + Math.cos(BAND[0]) * bandR, y: S0.y + Math.sin(BAND[0]) * bandR }
  p.noFill()
  p.stroke(INK)
  p.strokeWeight(0.04 * k + 2 * fine)
  p.arc(S0.x * k, S0.y * k, bandR * 2 * k, bandR * 2 * k, BAND[0], BAND[1])
  p.stroke(steel)
  p.strokeWeight(0.04 * k)
  p.arc(S0.x * k, S0.y * k, bandR * 2 * k, bandR * 2 * k, BAND[0], BAND[1])
  bar(p, k, bandA, { x: bandA.x - 0.06, y: y0 - 0.05 }, 0.03, steel, fine)
  bar(p, k, bandB, short, 0.03, steel, fine)
  bar(p, k, L0, lever, 0.05, iron, weight * 0.6)
  solid(p, INK, fine, brass)
  p.circle(lever.x * k, lever.y * k, 0.09 * k)
  p.circle(L0.x * k, L0.y * k, 0.06 * k)
  p.circle(bandB.x * k, bandB.y * k, 0.045 * k)

  // The cylinder on its foot, its steam chest, and the crosshead's guides on their trunk.
  bar(p, k, { x: GUIDES[0] + 0.12, y: S0.y + 0.11 }, { x: GUIDES[0] + 0.02, y: Y(BED[1]) }, 0.06, iron, weight * 0.6)
  bar(p, k, { x: GUIDES[1] - 0.12, y: S0.y + 0.11 }, { x: GUIDES[1] - 0.02, y: Y(BED[1]) }, 0.06, iron, weight * 0.6)
  solid(p, INK, weight, iron)
  p.quad((CYL[0] + 0.26) * k, (S0.y + CYL_R) * k, (CYL[1] - 0.26) * k, (S0.y + CYL_R) * k, (CYL[1] - 0.1) * k, Y(BED[1]) * k, (CYL[0] + 0.1) * k, Y(BED[1]) * k)
  solid(p, INK, weight, wine)
  p.rect(CYL[0] * k, (S0.y - CYL_R) * k, CYL[1] * k, (S0.y + CYL_R) * k, 0.02 * k)
  solid(p, INK, weight, gild(deep(color, 0.25)))
  p.rect((CYL[0] + 0.24) * k, (S0.y - CYL_R - 0.15) * k, (CYL[1] - 0.24) * k, (S0.y - CYL_R) * k, 0.02 * k, 0.02 * k, 0, 0)
  // The bore, open to show the piston.
  solid(p, INK, fine, gild(pale(color, 0.62)))
  p.rect(BORE[0] * k, (S0.y - CYL_R + 0.09) * k, BORE[1] * k, (S0.y + CYL_R - 0.09) * k)
  const px = X.x + PISTON
  bar(p, k, X, { x: px, y: X.y }, 0.04, steel, fine)
  solid(p, INK, fine, iron)
  p.rect((px - 0.07) * k, (S0.y - CYL_R + 0.09) * k, (px + 0.07) * k, (S0.y + CYL_R - 0.09) * k)
  // The covers and the gland, brass.
  solid(p, INK, fine, brass)
  p.rect((CYL[0] - 0.05) * k, (S0.y - CYL_R - 0.04) * k, (CYL[0] + 0.05) * k, (S0.y + CYL_R + 0.04) * k, 0.02 * k)
  p.rect((CYL[1] - 0.05) * k, (S0.y - CYL_R - 0.04) * k, (CYL[1] + 0.05) * k, (S0.y + CYL_R + 0.04) * k, 0.02 * k)
  p.rect((CYL[0] - 0.13) * k, (S0.y - 0.08) * k, (CYL[0] - 0.05) * k, (S0.y + 0.08) * k, 0.01 * k)
  // The guides and the crosshead between them.
  bar(p, k, { x: GUIDES[0], y: S0.y - 0.11 }, { x: GUIDES[1], y: S0.y - 0.11 }, 0.04, iron, fine)
  bar(p, k, { x: GUIDES[0], y: S0.y + 0.11 }, { x: GUIDES[1], y: S0.y + 0.11 }, 0.04, iron, fine)
  solid(p, INK, weight * 0.7, brass)
  p.rect((X.x - 0.12) * k, (S0.y - 0.085) * k, (X.x + 0.12) * k, (S0.y + 0.085) * k, 0.02 * k)

  // The crank on the wheel, the connecting rod across the mast, and the pins.
  p.push()
  p.translate(S0.x * k, S0.y * k)
  p.rotate(turn + Math.PI)
  solid(p, INK, weight * 0.8, brass)
  p.beginShape()
  p.vertex(0, -0.11 * k)
  p.vertex(THROW * k, -0.06 * k)
  p.vertex(THROW * k, 0.06 * k)
  p.vertex(0, 0.11 * k)
  p.endShape(p.CLOSE)
  p.pop()
  solid(p, INK, weight * 0.7, brass)
  p.circle(S0.x * k, S0.y * k, 0.17 * k)
  bar(p, k, pin, X, 0.07, steel, weight * 0.6)
  solid(p, INK, weight * 0.7, brass)
  p.circle(pin.x * k, pin.y * k, 0.12 * k)
  p.circle(X.x * k, X.y * k, 0.08 * k)
  solid(p, INK, fine, PAPER)
  p.circle(S0.x * k, S0.y * k, 0.05 * k)
  p.pop()
}

/** A spoked pulley at `c`, turned by `a`. */
function pulley(p: p5, k: number, weight: number, c: Pt, r: number, a: number, fill: string, hub: string): void {
  p.push()
  p.translate(c.x * k, c.y * k)
  solid(p, INK, weight, fill)
  p.circle(0, 0, r * 2 * k)
  p.rotate(a)
  outline(p, INK, weight * 0.6)
  p.circle(0, 0, (r - 0.04) * 2 * k)
  for (let i = 0; i < 4; i++) {
    const g = (i * Math.PI) / 2
    p.line(0, 0, Math.cos(g) * (r - 0.04) * k, Math.sin(g) * (r - 0.04) * k)
  }
  solid(p, INK, weight * 0.6, hub)
  p.circle(0, 0, 0.08 * k)
  p.pop()
}
