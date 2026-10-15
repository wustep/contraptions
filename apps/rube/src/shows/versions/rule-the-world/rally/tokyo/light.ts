import type { Pt } from '../../../../../parts'
import { motes, parallax, rising, type Frame } from '../depth'
import { smooth } from '../kit'
import { ctxOf, type Pen } from '../pen'
import { oval, rgbaOf } from './batch'
import { rowDepth } from './crowd'
import { FLASH_IN, FLOOR, LAMP, LIGHTS_DOWN, NET_X, STOMPS, TOP, TURN, XL, XR } from './geo'
import { ANCHOR, heat, HIGH } from './mood'
import { C } from './palette'

/**
 * The arena's working light, over and through the house: the spotlights on the roof's truss, of which only the inner
 * pair is ever lit, put on the table with the first stomp and left there, still and faint, until the house goes down;
 * the dust and the cigarette smoke in the one lamp's cone; and the one press flash in the dark stands on the broken-off
 * line. The flash bulbs of the match are the press photographers' at the court's side (`press.ts`), nobody else's.
 */

/* ------------------------------------------------------------------ the spotlights */

/** The roof's truss (its own frame moves at 0.8 of the table's speed, laid out from the wide's view). */
export const TRUSS_D = 0.8
export const TRUSS_Y = -6.05
/** The spotlights along the truss (their x), outermost first on each side. */
export const SPOTS = [NET_X - 9.5, NET_X - 5.8, NET_X - 2.6, NET_X + 2.6, NET_X + 5.8, NET_X + 9.5]
/** The inner pair, which are lit: on with the first stomp, with the inner sections, and out with them. */
const LIT = [2, 3]
const ON = STOMPS[0]
const OFF = LIGHTS_DOWN[2]
const SPREAD = 0.085

export interface Beam {
  from: Pt
  to: Pt
  /** How bright, 0 off to 1. */
  a: number
}

/**
 * Where each spotlight is pointed: the lit pair each on its own half of the table; the others, unlit, turned down at
 * the floor a little in from under them, where they were left.
 */
const AIM: Pt[] = SPOTS.map((x, i) => (LIT.includes(i) ? [NET_X + (x < NET_X ? -1.3 : 1.3), TOP] : [x + (x < NET_X ? 1.2 : -1.2), FLOOR]))

/** The six spotlights at `t`, in the frame `f` (their lamps on the truss move with it). */
export function beamsAt(t: number, f: Frame): Beam[] {
  const [dx, dy] = parallax(f, TRUSS_D, HIGH)
  const lit = t < ON ? 0 : Math.min(1, (t - ON) / 0.06) * (1 - smooth(t, OFF, OFF + 0.15))
  return SPOTS.map((x, i) => ({ from: [x + dx, TRUSS_Y + 0.22 + dy] as Pt, to: AIM[i], a: LIT.includes(i) ? lit : 0 }))
}

/** The lit pair's beams, faint through the house's air, down onto the table: laid over what is behind the table. */
export function drawBeams(pen: Pen, t: number, f: Frame): void {
  const beams = beamsAt(t, f)
  if (!beams.some((b) => b.a > 0.01)) return
  const ctx = ctxOf(pen.p)
  const { k } = pen
  const half = Math.tan(SPREAD / 2)
  ctx.save()
  for (const b of beams) {
    if (b.a <= 0.01) continue
    const ux = b.to[0] - b.from[0]
    const uy = b.to[1] - b.from[1]
    const l = Math.hypot(ux, uy) || 1
    const dxn = ux / l
    const dyn = uy / l
    // On down through the table to the floor.
    const len = Math.min(16, (FLOOR + 0.3 - b.from[1]) / Math.max(0.1, dyn))
    const ex = b.from[0] + dxn * len
    const ey = b.from[1] + dyn * len
    if (Math.max(b.from[0], ex) + len * half < f.x0 || Math.min(b.from[0], ex) - len * half > f.x1) continue
    const w = len * half
    const g = ctx.createLinearGradient(b.from[0] * k, b.from[1] * k, ex * k, ey * k)
    g.addColorStop(0, rgbaOf(pen, C.beam, 0.08 * b.a))
    g.addColorStop(0.4, rgbaOf(pen, C.beam, 0.04 * b.a))
    g.addColorStop(1, rgbaOf(pen, C.beam, 0.02 * b.a))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo((b.from[0] - dyn * 0.06) * k, (b.from[1] + dxn * 0.06) * k)
    ctx.lineTo((b.from[0] + dyn * 0.06) * k, (b.from[1] - dxn * 0.06) * k)
    ctx.lineTo((ex + dyn * w) * k, (ey - dxn * w) * k)
    ctx.lineTo((ex - dyn * w) * k, (ey + dxn * w) * k)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ the lamp's air */

/** How far inside the lamp's cone a point is, 0 to 1. */
function inCone(x: number, y: number): number {
  const top = LAMP[1] + 0.22
  if (y < top || y > TOP) return 0
  const u = (y - top) / (TOP - top)
  const hw = 0.3 + u * ((XR - XL) / 2 + 0.3)
  const d = Math.abs(x - LAMP[0]) / hw
  return d >= 1 ? 0 : 0.35 + 0.65 * (1 - d)
}

/** Dust turning slowly in the one lamp's cone, and cigarette smoke drifting up through it; more smoke in the quiet. */
export function drawLampAir(pen: Pen, t: number): void {
  const quiet = smooth(t, TURN, TURN + 3)
  rising(pen, t, {
    seed: 61,
    n: 22,
    from: [XL + 0.4, XR - 0.4, 0.2],
    rise: 3.2,
    life: 7.5,
    spread: 1.1,
    size: [0.22, 0.55],
    color: C.smoke,
    alpha: 0.05 + 0.03 * quiet - 0.02 * heat(t),
  })
  motes(pen, t, {
    n: 45,
    seed: 67,
    box: [XL - 0.6, LAMP[1] + 0.22, XR + 0.6, TOP],
    size: [0.01, 0.022],
    color: C.lamp,
    alpha: 0.38,
    drift: [0.04, -0.02],
    wander: 0.25,
    twinkle: 0.1,
    light: inCone,
  })
}

/* ------------------------------------------------------------------ the one flash on the broken-off line */

/**
 * As he comes in, in the dark front rows just behind the table, somebody's press camera fires at him: the bulb in its
 * reflector white for a moment and gone, near enough that the seam's opening finds it while it is still lit. No more
 * than the bulb itself.
 */
export function drawFlashIn(pen: Pen, t: number, f: Frame): void {
  const u = t - FLASH_IN
  if (u < 0 || u > 0.22) return
  const [dx, dy] = parallax(f, rowDepth(1), ANCHOR)
  const at: Pt = [-0.05 + dx, -0.45 + dy]
  if (at[0] < f.x0 - 0.2 || at[0] > f.x1 + 0.2 || at[1] < f.y0 - 0.2 || at[1] > f.y1 + 0.2) return
  const p = new Path2D()
  oval(p, pen.k, at[0], at[1], 0.05, 0.075)
  const ctx = ctxOf(pen.p)
  ctx.save()
  // It burns a moment at full, then dies.
  ctx.fillStyle = rgbaOf(pen, C.bulb, u < 0.08 ? 1 : Math.exp(-(u - 0.08) / 0.05))
  ctx.fill(p)
  ctx.restore()
}
