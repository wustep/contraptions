import { circle, clamp01, fill, hash, lerp, mix, poly, rgba, smooth, smoother, stroke, type Paint } from '../../draw'
import type { Pt } from '../../path'
import { layer } from '../../world/depth'
import { surface } from '../../world/sea'
import { skyAt } from '../../world/sky'
import { CLIFF, FLIGHT, GIANTS, THROWS, TOP, sideOf, type Giant, type Throw } from './plan'

/**
 * Telepylus, drawn: the fjord's far walls going back into the fog, the cliff along its back with pines on its top and
 * on its ledges, the giants behind the pines in armour like poured steel, the fog lying in long bands across all of it,
 * and the boulders and what they do to the water.
 *
 * The giants are seen from the hips up over the pines, facing the water, each in a crested helmet with a T for its
 * eyes and mouth and nothing in it, one hand on the pommel of a sword stood point down beside it. A throw is an arm
 * lifted with a boulder over the helmet, held, brought down and forward, and let go out level; the boulder is picked up
 * below the pine tops, out of sight. Fog is a few long, slow bands, each a stack of faint shapes so it has no edge;
 * nothing here is a field of small marks.
 */

const INK = '#15191B'
/** Steel: the lit plane, the plane turned away, the deep shade, and the dark of the helmet's T. */
const STEEL = { lit: '#A7AFB3', side: '#79838A', deep: '#4A5359', slit: '#14181B' }
const ROCK = { face: '#353F3D', lit: '#4A5552', dark: '#222A29', wet: '#182020' }
const PINE = '#1A2420'

/** The fog's colour at `t`: the low sky's, a little greyer. */
const fogOf = (t: number): string => mix(skyAt(t).low, '#9DA29E', 0.25)

/** Where the top of the cliff drops into a gully: [x, half width, depth]. */
const GULLIES: [number, number, number][] = [
  [206, 2.2, 2.4],
  [239, 2.8, 3.0],
  [252, 1.6, 1.4],
]

/** The cliff's top edge at `x`: broken, cut by gullies, coming down to the water at both ends. */
export function cliffTop(x: number): number {
  const ends = smooth(x, CLIFF.x0, CLIFF.x0 + 9) * (1 - smooth(x, CLIFF.x1 - 10, CLIFF.x1))
  const bumps = 1.1 * Math.sin(x * 0.21 + 0.4) + 0.6 * Math.sin(x * 0.57 + 2.1) + 0.2 * Math.sin(x * 1.7)
  let gully = 0
  for (const [gx, w, d] of GULLIES) gully += d * Math.max(0, 1 - Math.abs(x - gx) / w) ** 1.5
  return lerp(CLIFF.foot, TOP + bumps * 0.7 + gully, ends)
}

/* ------------------------------------------------------------------ the far walls */

/** The fjord's sides going away: two walls of rock and pine at two depths, each paler into the fog than the last. */
export function drawFar(g: Paint): void {
  const { ctx, t, view } = g
  const fog = fogOf(t)
  for (const [d, h, pale] of [
    [70, 20, 0.8],
    [26, 14, 0.6],
  ] as const) {
    const L = layer(view, d)
    const lx0 = view.cx + (view.x0 - view.cx) / L.s
    const lx1 = view.cx + (view.x1 - view.cx) / L.s
    const a = Math.max(CLIFF.x0 - 6, lx0 - 2)
    const b = Math.min(CLIFF.x1 + 10, lx1 + 2)
    if (b <= a) continue
    const step = 1.4
    const top = (x: number) => {
      const ends = smooth(x, CLIFF.x0 - 6, CLIFF.x0 + 10) * (1 - smooth(x, CLIFF.x1 - 4, CLIFF.x1 + 10))
      return -(h + 2.2 * Math.sin(x * 0.11 + d) + 1.4 * Math.sin(x * 0.27 + d * 0.3)) * ends
    }
    ctx.beginPath()
    ctx.moveTo(L.x(a), L.y(0.2))
    for (let x = a; x <= b + step; x += step) {
      // A saw of pine tops along the crest.
      const y = top(x) - (Math.floor(x / step) % 2 ? 0 : 0.9)
      ctx.lineTo(L.x(x), L.y(y))
    }
    ctx.lineTo(L.x(b + step), L.y(0.2))
    ctx.closePath()
    fill(ctx, mix(ROCK.face, fog, pale))
  }
}

/* ------------------------------------------------------------------ the cliff */

/**
 * The cliff: one dark face with its upper part catching the fog's light, and its wet foot at the water, running down
 * into the water at both ends.
 */
export function drawCliff(g: Paint): void {
  const { ctx, t, view } = g
  const a = Math.max(CLIFF.x0, view.x0 - 1)
  const b = Math.min(CLIFF.x1, view.x1 + 1)
  if (b <= a || view.y1 < TOP - 3) return
  const fog = fogOf(t)
  const step = 0.4
  const outline = () => {
    ctx.beginPath()
    ctx.moveTo(a, CLIFF.foot)
    for (let x = a; x <= b + step; x += step) ctx.lineTo(Math.min(b, x), cliffTop(Math.min(b, x)))
    ctx.lineTo(b, CLIFF.foot)
    ctx.closePath()
  }
  outline()
  fill(ctx, mix(ROCK.face, fog, 0.28))
  ctx.save()
  ctx.clip()
  // The upper face, lit from the fog overhead: a band under the top edge whose lower edge wanders.
  ctx.beginPath()
  for (let x = a - 1; x <= b + 1; x += 0.8) {
    const y = cliffTop(x) - 0.5
    if (x === a - 1) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  for (let x = b + 1; x >= a - 1; x -= 0.8) ctx.lineTo(x, cliffTop(x) + 2.2 + 0.9 * Math.sin(x * 0.33 + 1.2) + 0.5 * Math.sin(x * 0.9))
  ctx.closePath()
  fill(ctx, mix(ROCK.lit, fog, 0.3))
  // The wet foot of it, at the water.
  ctx.fillStyle = mix(ROCK.wet, fog, 0.12)
  ctx.fillRect(a, CLIFF.foot - 0.6, b - a, 0.7)
  ctx.restore()
  outline()
  stroke(g, mix(INK, fog, 0.4), 2.2)
}

/* ------------------------------------------------------------------ pines */

/** One pine: a dark spire of three tiers, its trunk hidden in the tier under it. */
function pine(ctx: CanvasRenderingContext2D, x: number, base: number, h: number, w: number): void {
  ctx.moveTo(x, base - h)
  for (let i = 0; i < 3; i++) {
    const y = base - h + (h * (i + 1)) / 3.2
    const half = (w * (i + 1)) / 3
    ctx.lineTo(x + half, y)
    ctx.lineTo(x + half * 0.45, y - h * 0.05)
  }
  ctx.lineTo(x + w * 0.12, base)
  ctx.lineTo(x - w * 0.12, base)
  for (let i = 2; i >= 0; i--) {
    const y = base - h + (h * (i + 1)) / 3.2
    const half = (w * (i + 1)) / 3
    ctx.lineTo(x - half * 0.45, y - h * 0.05)
    ctx.lineTo(x - half, y)
  }
  ctx.closePath()
}

/**
 * The pines on the cliff's top, in two rows, standing in clumps of different heights with gaps between, and a few on
 * the ledges: in front of the giants' hips, so a giant stands in the wood.
 */
export function drawPines(g: Paint, row: 'back' | 'front'): void {
  const { ctx, t, view } = g
  const fog = fogOf(t)
  const a = Math.max(CLIFF.x0 + 3, view.x0 - 2)
  const b = Math.min(CLIFF.x1 - 3, view.x1 + 2)
  if (b <= a) return
  const spacing = row === 'back' ? 0.8 : 1.05
  ctx.beginPath()
  for (let i = Math.floor(a / spacing); i <= Math.ceil(b / spacing); i++) {
    const x = i * spacing + 0.45 * hash(i, row === 'back' ? 7 : 8)
    const top = cliffTop(x)
    if (top > TOP + 3.2) continue
    // Clumps: the wood is taller in some stretches than in others, and thin in a few.
    const clump = 0.5 + 0.5 * Math.sin(x * 0.16 + (row === 'back' ? 0 : 2.4))
    if (row === 'front' && clump < 0.18 && hash(i, 15) < 0.6) continue
    const h = (row === 'back' ? 2.6 : 2.2) + 1.6 * clump + 0.9 * hash(i, 9)
    pine(ctx, x, top + (row === 'back' ? -0.1 : 0.4), h, h * 0.4)
  }
  if (row === 'front') {
    // A few on the ledges, clinging.
    for (let i = Math.floor(a / 11); i <= Math.ceil(b / 11); i++) {
      if (hash(i, 24) < 0.35 || hash(i, 28) < 0.4) continue
      const x = i * 11 + 4 * hash(i, 25) + 0.6
      const y = TOP + 3.5 + 3.5 * hash(i, 26)
      const h = 1.1 + 0.7 * hash(i, 14)
      pine(ctx, x, y + 0.05, h, h * 0.42)
      pine(ctx, x + 0.9, y, h * 0.8, h * 0.36)
    }
  }
  fill(ctx, mix(PINE, fog, row === 'back' ? 0.45 : 0.2))
}

/* ------------------------------------------------------------------ fog */

/**
 * A band of fog lying across the fjord: one long shape whose top and bottom slowly undulate and drift, filled with the
 * fog thickest along its middle and thinning to nothing at both edges, and fading out along its length past the
 * cliff's ends, so it has no edge anywhere.
 */
export function drawFogBand(g: Paint, y: number, h: number, a: number, drift: number, seed: number): void {
  const { ctx, t, view } = g
  if (a <= 0.003) return
  if (y + h < view.y0 - 1 || y - h > view.y1 + 1) return
  const fog = fogOf(t)
  const x0 = Math.max(CLIFF.x0 - 14, view.x0 - 2)
  const x1 = Math.min(CLIFF.x1 + 14, view.x1 + 2)
  if (x1 <= x0) return
  const fade = (x: number) => smooth(x, CLIFF.x0 - 14, CLIFF.x0 + 2) * (1 - smooth(x, CLIFF.x1 - 2, CLIFF.x1 + 14))
  const top = (x: number) => y - h * (0.75 + 0.25 * Math.sin(x * 0.06 + t * drift + seed))
  const bottom = (x: number) => y + h * 0.6 * (0.75 + 0.25 * Math.sin(x * 0.045 - t * drift * 0.7 + seed * 2))
  // The fog is gone before either edge of the shape is reached, wherever the edges wander to.
  const gr = ctx.createLinearGradient(0, y - h * 0.5, 0, y + h * 0.3)
  // A broad bank, thickest through its middle: never a thin bright line, which reads as light and not as fog.
  gr.addColorStop(0, rgba(fog, 0))
  gr.addColorStop(0.35, rgba(fog, a * 0.85))
  gr.addColorStop(0.78, rgba(fog, a * 0.85))
  gr.addColorStop(1, rgba(fog, 0))
  ctx.save()
  ctx.fillStyle = gr
  // Along the cliff it is one shape; past its ends, where it thins away, it is laid in strips, each as thick as the fog
  // is there (a single shape has no seams for the eye to find where the fog is even).
  const whole = (xa: number, xb: number) => {
    const step = Math.max(0.6, (xb - xa) / 60)
    ctx.beginPath()
    ctx.moveTo(xa, top(xa))
    for (let x = xa + step; x < xb; x += step) ctx.lineTo(x, top(x))
    ctx.lineTo(xb, top(xb))
    ctx.lineTo(xb, bottom(xb))
    for (let x = xb - step; x > xa; x -= step) ctx.lineTo(x, bottom(x))
    ctx.lineTo(xa, bottom(xa))
    ctx.closePath()
    ctx.fill()
  }
  const m0 = Math.max(x0, CLIFF.x0 + 2)
  const m1 = Math.min(x1, CLIFF.x1 - 2)
  if (m1 > m0) whole(m0, m1)
  const strips = (xa: number, xb: number) => {
    if (xb <= xa) return
    const n = Math.max(1, Math.ceil((xb - xa) / 1.0))
    const w = (xb - xa) / n
    for (let i = 0; i < n; i++) {
      const sa = xa + i * w
      const f = fade(sa + w / 2)
      if (f <= 0.003) continue
      ctx.globalAlpha = f
      ctx.beginPath()
      ctx.moveTo(sa, top(sa))
      ctx.lineTo(sa + w, top(sa + w))
      ctx.lineTo(sa + w, bottom(sa + w))
      ctx.lineTo(sa, bottom(sa))
      ctx.closePath()
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
  strips(x0, Math.min(x1, CLIFF.x0 + 2))
  strips(Math.max(x0, CLIFF.x1 - 2), x1)
  ctx.restore()
}

/**
 * The fog lying on the water under the cliff: the lower face going pale into it, so the wall stands in the air and the
 * ships come out of the white in front of it. Laid on the face itself, so it ends where the cliff does.
 */
export function drawLowFog(g: Paint, a: number): void {
  const { ctx, t, view } = g
  const x0 = Math.max(CLIFF.x0, view.x0 - 1)
  const x1 = Math.min(CLIFF.x1, view.x1 + 1)
  if (x1 <= x0 || a <= 0.003) return
  const fog = fogOf(t)
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(x0, CLIFF.foot)
  for (let x = x0; x <= x1 + 0.4; x += 0.4) ctx.lineTo(Math.min(x1, x), cliffTop(Math.min(x1, x)))
  ctx.lineTo(x1, CLIFF.foot)
  ctx.closePath()
  ctx.clip()
  const gr = ctx.createLinearGradient(0, TOP + 1.5, 0, CLIFF.foot)
  gr.addColorStop(0, rgba(fog, 0))
  gr.addColorStop(1, rgba(fog, a))
  ctx.fillStyle = gr
  ctx.fillRect(x0, TOP - 1, x1 - x0, CLIFF.foot - TOP + 1.05)
  ctx.restore()
}

/** How thick the fog is at `t`: coming down as they row in, thickest as the giants come out of it, lifting a little after. */
export const fogAt = (t: number): number => 0.55 + 0.35 * smooth(t, 189, 197) - 0.3 * smooth(t, 209, 220)

/* ------------------------------------------------------------------ the giants */

/** How much of a giant the fog still hides, 1 to 0.3: it comes out over two beats and is never clear of it. */
const veilOf = (gi: Giant, t: number): number => 1 - 0.7 * smoother(t, gi.emerge - 0.4, gi.emerge + 2.0)
/** How far below its full height it still is: it rises out of the wood as it comes out of the fog. */
const sunkOf = (gi: Giant, t: number): number => 1.6 * (1 - smoother(t, gi.emerge - 0.4, gi.emerge + 2.2))

/** The throw a giant is making at `t`, if any, and its release time. */
function throwOf(gi: number, t: number): { th: Throw; tr: number } | null {
  for (const th of THROWS) {
    if (th.giant !== gi) continue
    const tr = th.land - FLIGHT
    if (t >= tr - 2.2 && t <= tr + 2.3) return { th, tr }
  }
  return null
}

/** The shoulder's place on a giant (x by side), and the arm's two bones, all in the giant's units. */
const SHOULDER: Pt = [1.85, -6.9]
const UPPER = 2.5
const FORE = 2.4

/** Where a giant's throwing hand is, from its shoulder, at `t` into a throw released at `tr` (giant's units, y down). */
function handOf(t: number, tr: number): Pt {
  const keys: [number, Pt][] = [
    [tr - 2.1, [0.45, 4.3]],
    [tr - 1.1, [0.5, -3.6]],
    [tr - 0.38, [0.2, -4.2]],
    [tr, [1.2, -1.6]],
    [tr + 0.45, [1.0, 2.2]],
    [tr + 2.2, [0.45, 4.3]],
  ]
  if (t <= keys[0][0]) return keys[0][1]
  let i = 0
  while (i + 1 < keys.length && keys[i + 1][0] <= t) i++
  if (i >= keys.length - 1) return keys[keys.length - 1][1]
  const [ta, pa] = keys[i]
  const [tb, pb] = keys[i + 1]
  let u = clamp01((t - ta) / (tb - ta))
  // The throw itself gathers speed into the release and spends it after; everything else eases.
  u = i === 2 ? u * u : i === 3 ? 1 - (1 - u) * (1 - u) : u * u * (3 - 2 * u)
  return [lerp(pa[0], pb[0], u), lerp(pa[1], pb[1], u)]
}

/** The elbow of a two-bone arm from `sh` to `hand`: bent outwards, away from the body (towards `side`). */
function elbow(sh: Pt, hand: Pt, a: number, b: number, side: 1 | -1): Pt {
  const dx = hand[0] - sh[0]
  const dy = hand[1] - sh[1]
  const d = Math.max(1e-6, Math.min(a + b - 1e-3, Math.hypot(dx, dy)))
  const along = (a * a - b * b + d * d) / (2 * d)
  const off = Math.sqrt(Math.max(0, a * a - along * along))
  const ux = dx / d
  const uy = dy / d
  const one: Pt = [sh[0] + ux * along - uy * off, sh[1] + uy * along + ux * off]
  const two: Pt = [sh[0] + ux * along + uy * off, sh[1] + uy * along - ux * off]
  return (one[0] - sh[0]) * side >= (two[0] - sh[0]) * side ? one : two
}

/** A limb from `p` to `q`, `w` wide, with rounded ends, added to the path as its own shape. */
function limbTo(ctx: CanvasRenderingContext2D, p: Pt, q: Pt, w: number): void {
  const a = Math.atan2(q[1] - p[1], q[0] - p[0])
  ctx.moveTo(p[0] + Math.cos(a + Math.PI / 2) * (w / 2), p[1] + Math.sin(a + Math.PI / 2) * (w / 2))
  ctx.arc(p[0], p[1], w / 2, a + Math.PI / 2, a - Math.PI / 2)
  ctx.arc(q[0], q[1], w / 2, a - Math.PI / 2, a + Math.PI / 2)
  ctx.closePath()
}

/** The hand of giant `gi` at `t`, in the world, and the boulder in it (before it is let go). */
export function heldAt(gi: number, t: number): { hand: Pt; boulder: Throw | null } {
  const G = GIANTS[gi]
  const s = G.size
  const base = TOP + sunkOf(G, t)
  const cur = throwOf(gi, t)
  const side = cur ? sideOf(cur.th) : 1
  const rel = cur ? handOf(t, cur.tr) : ([0.45, 4.3] as Pt)
  return {
    hand: [G.x + (SHOULDER[0] + rel[0]) * side * s, base + (SHOULDER[1] + rel[1]) * s],
    boulder: cur && t < cur.tr ? cur.th : null,
  }
}

export function drawGiant(g: Paint, gi: number): void {
  const { ctx, t, view } = g
  const G = GIANTS[gi]
  const s = G.size
  if (G.x + 6 * s < view.x0 || G.x - 6 * s > view.x1) return
  const veil = veilOf(G, t)
  if (veil >= 0.995) return
  const fog = fogOf(t)
  const c = (hex: string) => mix(hex, fog, 0.12 + veil * 0.88)
  const base = TOP + sunkOf(G, t)
  // A slow breath in the chest and shoulders.
  const breath = 0.07 * Math.sin(t * 1.25 + gi * 1.7)
  const X = (v: number): number => G.x + v * s
  const Y = (v: number): number => base + (v + (v < -3.5 ? breath : 0)) * s
  const P = (v: Pt): Pt => [X(v[0]), Y(v[1])]
  const cur = throwOf(gi, t)
  const side = cur ? sideOf(cur.th) : 1
  // The head turns a little to where it is throwing.
  const look = cur ? side * 0.16 * smoother(t, cur.tr - 2.0, cur.tr - 1.2) * (1 - smoother(t, cur.tr + 0.6, cur.tr + 2.0)) : 0
  // The fog takes it by colour alone, all of it at once, so no part of it is ever seen through another; and nothing of
  // it is ever below the cliff's top, where the wood stands.
  ctx.save()
  ctx.beginPath()
  ctx.rect(view.x0 - 1, view.y0 - 1, view.x1 - view.x0 + 2, TOP - view.y0 + 1)
  ctx.clip()
  const lw = 3.2
  const ink = c(INK)
  // The throwing arm, from its shoulder to its hand, the elbow out.
  const throwArm = (): [Pt, Pt, Pt] => {
    const sh: Pt = [SHOULDER[0] * side, SHOULDER[1]]
    const rel = cur ? handOf(t, cur.tr) : ([0.45, 4.3] as Pt)
    const hand: Pt = [sh[0] + rel[0] * side, sh[1] + rel[1]]
    return [P(sh), P(elbow(sh, hand, UPPER, FORE, side)), P(hand)]
  }
  const [tsh, tel, thd] = throwArm()
  const raised = thd[1] < tsh[1]
  // An arm is one bent shape, upper arm, forearm and fist outlined together (the ink laid first and the steel over it,
  // so no joint is drawn), not a chain of parts.
  const drawArm = ([sh, el, hd]: [Pt, Pt, Pt]) => {
    ctx.beginPath()
    limbTo(ctx, sh, el, 0.95 * s)
    limbTo(ctx, el, hd, 0.84 * s)
    const rot = Math.atan2(hd[1] - el[1], hd[0] - el[0])
    ctx.moveTo(hd[0] + 0.46 * s * Math.cos(rot), hd[1] + 0.46 * s * Math.sin(rot))
    ctx.ellipse(hd[0], hd[1], 0.46 * s, 0.4 * s, rot, 0, Math.PI * 2)
    stroke(g, ink, 2 * lw)
    fill(ctx, c(STEEL.side))
  }
  // The other arm: its hand on the pommel of a great sword stood point down at its side, the blade into the wood.
  const off = -side as 1 | -1
  const pommel: Pt = [3.0 * off, -4.4]
  const osh: Pt = [SHOULDER[0] * off, SHOULDER[1]]
  const oel = elbow(osh, pommel, UPPER, FORE, off)
  // The sword first, behind the hand: grip, a wide crossguard, and the blade going down out of sight.
  poly(ctx, [P([pommel[0] - 0.22, -4.0]), P([pommel[0] + 0.22, -4.0]), P([pommel[0] + 0.2, -0.9]), P([pommel[0], -0.5]), P([pommel[0] - 0.2, -0.9])])
  fill(ctx, c(STEEL.lit))
  stroke(g, ink, lw)
  poly(ctx, [P([pommel[0] - 0.95, -3.55]), P([pommel[0] + 0.95, -3.55]), P([pommel[0] + 0.85, -3.25]), P([pommel[0] - 0.85, -3.25])])
  fill(ctx, c(STEEL.deep))
  stroke(g, ink, lw)
  if (!raised) drawArm([tsh, tel, thd])
  // The body: a cuirass in two planes, its chest drawn on it in one line, and a belt.
  poly(ctx, [P([-2.2, -7.4]), P([2.2, -7.4]), P([1.35, -3.1]), P([-1.35, -3.1])])
  fill(ctx, c(STEEL.lit))
  stroke(g, ink, lw)
  poly(ctx, [P([0.1, -7.4]), P([2.2, -7.4]), P([1.35, -3.1]), P([0.1, -3.1])])
  fill(ctx, c(STEEL.side))
  ctx.beginPath()
  const ch = P([-1.55, -5.6])
  ctx.moveTo(ch[0], ch[1])
  const cm = P([0, -5.0])
  const ce = P([1.55, -5.6])
  ctx.quadraticCurveTo(cm[0], cm[1] + 0.35 * s, ce[0], ce[1])
  stroke(g, rgba(ink, 0.7), lw * 0.7)
  poly(ctx, [P([-1.45, -3.7]), P([1.45, -3.7]), P([1.35, -3.05]), P([-1.35, -3.05])])
  fill(ctx, c(STEEL.deep))
  stroke(g, ink, lw)
  // A plate over each shoulder.
  for (const w of [-1, 1] as const) {
    ctx.beginPath()
    const c0 = P([w * 1.95, -7.1])
    ctx.ellipse(c0[0], c0[1], 1.1 * s, 0.7 * s, w * 0.28, 0, Math.PI * 2)
    fill(ctx, c(w < 0 ? STEEL.lit : STEEL.side))
    stroke(g, ink, lw)
  }
  // The arm on the sword, over the body.
  drawArm([P(osh), P(oel), P(pommel)])
  // The helmet: a dome coming down into cheek guards, a crest standing up off it, and a T cut through the front for
  // the eyes and the mouth, dark all the way in.
  const hx = look
  ctx.beginPath()
  const hp = (v: Pt): Pt => P([v[0] + hx * (v[1] < -9 ? 0.4 : 1), v[1]])
  const h0 = hp([-0.85, -7.35])
  ctx.moveTo(h0[0], h0[1])
  for (const v of [
    [-0.95, -9.0],
    [-0.75, -10.05],
    [0, -10.35],
    [0.75, -10.05],
    [0.95, -9.0],
    [0.85, -7.35],
    [0.3, -7.55],
    [-0.3, -7.55],
  ] as Pt[]) {
    const q = hp(v)
    ctx.lineTo(q[0], q[1])
  }
  ctx.closePath()
  fill(ctx, c(STEEL.lit))
  stroke(g, ink, lw)
  poly(ctx, [hp([0.05, -10.35]), hp([0.75, -10.05]), hp([0.95, -9.0]), hp([0.85, -7.35]), hp([0.3, -7.55]), hp([0.05, -7.6])])
  fill(ctx, c(STEEL.side))
  // The crest: a fin from the brow back over the crown.
  poly(ctx, [hp([-0.12, -10.3]), hp([-0.2, -11.3]), hp([0.15, -11.55]), hp([0.22, -10.3])])
  fill(ctx, c(STEEL.deep))
  stroke(g, ink, lw)
  // The T.
  poly(ctx, [hp([-0.62, -9.1]), hp([0.62, -9.1]), hp([0.6, -8.82]), hp([0.13, -8.82]), hp([0.11, -7.55]), hp([-0.11, -7.55]), hp([-0.13, -8.82]), hp([-0.6, -8.82])])
  fill(ctx, c(STEEL.slit))
  // The raised arm in front of the helmet, and the boulder in its hand until it is let go.
  if (raised) drawArm([tsh, tel, thd])
  const held = heldAt(gi, t)
  if (held.boulder) drawBoulder(g, held.hand[0], held.hand[1] - 0.3 * s, held.boulder.r, held.boulder.spin * 0.2 * t, c)
  ctx.restore()
}

/* ------------------------------------------------------------------ boulders */

/** A boulder: an uneven lump of grey rock, its top lit, turned by `a`. */
function drawBoulder(g: Paint, x: number, y: number, r: number, a: number, c: (hex: string) => string = (h) => h): void {
  const { ctx } = g
  const pts: Pt[] = []
  for (let i = 0; i < 9; i++) {
    const th = a + (i / 9) * Math.PI * 2
    const rr = r * (0.82 + 0.22 * Math.sin(i * 2.7 + 1.1))
    pts.push([x + Math.cos(th) * rr, y + Math.sin(th) * rr * 0.9])
  }
  poly(ctx, pts)
  fill(ctx, c('#5C615E'))
  stroke(g, c(INK), 3)
  ctx.save()
  ctx.clip()
  ctx.beginPath()
  ctx.ellipse(x - r * 0.25, y - r * 0.45, r * 0.75, r * 0.45, -0.3, 0, Math.PI * 2)
  fill(ctx, c('#878D89'))
  ctx.restore()
}

/**
 * Where a thrown boulder is at `t`: out of the hand at release, under gravity, onto its mark; and after it, on through
 * the deck or the surface and down into the water, its speed given up to the water, sinking out of sight in the dark.
 */
function flightOf(th: Throw, t: number): Pt | null {
  const tr = th.land - FLIGHT
  if (t < tr || t > th.land + 3.5) return null
  const from = heldAt(th.giant, tr).hand
  const start: Pt = [from[0], from[1] - 0.25 * GIANTS[th.giant].size]
  const vx = (th.at[0] - start[0]) / FLIGHT
  const vy = (th.at[1] - start[1] - 0.5 * 26 * FLIGHT * FLIGHT) / FLIGHT
  if (t <= th.land) {
    const s = t - tr
    return [start[0] + vx * s, start[1] + vy * s + 0.5 * 26 * s * s]
  }
  const s = t - th.land
  const vIn = vy + 26 * FLIGHT
  const tau = 0.22
  const e = 1 - Math.exp(-s / tau)
  return [th.at[0] + vx * tau * e * 0.3, th.at[1] + vIn * tau * e + 1.4 * (s - tau * e)]
}

/** The boulders in the air, and those that struck a ship, going down with it. */
export function drawFlights(g: Paint): void {
  const { t, view } = g
  for (const th of THROWS) {
    const p = flightOf(th, t)
    if (!p || p[0] < view.x0 - 2 || p[0] > view.x1 + 2) continue
    drawBoulder(g, p[0], p[1], th.r, th.spin * (t - th.land + FLIGHT) * 2.4)
  }
}

/* ------------------------------------------------------------------ the water thrown up */

/**
 * Where a boulder comes down: the water thrown up as a crown that rises and falls under gravity, a few big drops
 * thrown out of it, and a ring going out over the water. A strike on a ship throws up more, and splinters.
 */
export function drawSplashes(g: Paint): void {
  const { ctx, t, view } = g
  for (const th of THROWS) {
    const s = t - th.land
    if (s < 0 || s > 2.6) continue
    const [x, y0] = th.at
    if (x < view.x0 - 4 || x > view.x1 + 4) continue
    const big = th.ship ? 1.35 : 1
    const L = skyAt(t)
    const water = mix(L.lit, L.far, 0.35)
    const y = th.ship ? surface(x, t) : y0
    // The crown: two sheets of water thrown up and out on either side of where it went in, rising at 8 cells a
    // second and falling back, thinning as they go.
    const up = 6.8 * big
    const h = Math.max(0, up * s - 13 * s * s)
    const w = (0.6 + 1.0 * clamp01(s / 0.5)) * big
    const fade = 1 - smooth(s, 0.4, 0.68)
    if (h > 0.02 && fade > 0.01) {
      for (const side of [-1, 1] as const) {
        ctx.beginPath()
        ctx.moveTo(x + side * w * 0.15, y)
        ctx.quadraticCurveTo(x + side * w * 0.35, y - h * 0.6, x + side * w * 0.95, y - h)
        ctx.quadraticCurveTo(x + side * w * 0.75, y - h * 0.45, x + side * w * 1.05, y)
        ctx.closePath()
        fill(ctx, rgba(water, 0.7 * fade))
      }
      // The column standing in the middle, lower.
      ctx.beginPath()
      ctx.ellipse(x, y - h * 0.32, w * 0.22, h * 0.36, 0, 0, Math.PI * 2)
      fill(ctx, rgba(water, 0.5 * fade))
    }
    // Drops: five, thrown out and up, falling back.
    for (let i = 0; i < 5; i++) {
      const dir = (i - 2) * 0.55 + 0.2 * Math.sin(i * 3.1)
      const vx = 3.2 * dir * big
      const vy = -(6 + 2.5 * hash(i, 31)) * big
      const px = x + vx * s
      const py = y + vy * s + 13 * s * s
      if (py > y + 0.1) continue
      circle(ctx, px, py, (0.12 + 0.06 * hash(i, 32)) * big)
      fill(ctx, rgba(water, 0.75))
    }
    // The ring.
    const rr = 0.4 + 2.6 * (1 - Math.exp(-s / 0.7))
    ctx.beginPath()
    ctx.ellipse(x, y + 0.05, rr * big, 0.16 * big, 0, 0, Math.PI * 2)
    stroke(g, rgba(water, 0.6 * (1 - smooth(s, 0.3, 2.4))), 3)
    // Splinters off a struck hull: a few dark staves thrown up and turning.
    if (th.ship) {
      for (let i = 0; i < 4; i++) {
        const vx = (i - 1.5) * 2.2
        const vy = -(5 + 1.5 * hash(i, 41))
        const px = x + vx * s
        const py = y - 0.4 + vy * s + 13 * s * s
        if (py > y + 0.3) continue
        const a = s * (3 + i) * (i % 2 ? 1 : -1)
        ctx.beginPath()
        ctx.moveTo(px - Math.cos(a) * 0.32, py - Math.sin(a) * 0.32)
        ctx.lineTo(px + Math.cos(a) * 0.32, py + Math.sin(a) * 0.32)
        stroke(g, '#1A1A1E', 6)
      }
    }
  }
}
