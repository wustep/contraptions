import type { Light } from '../light'
import { circle, curve, fill, hash, ink, lerp, lit, mix, poly, rgba, smooth, type Paint, type Pt } from '../paint'

/**
 * Haku as the dragon: long and white, a serpent's body that goes where its head has been, a mane of sea-green down the
 * back of the neck, two pale horns, four small legs held back in flight. He is drawn as the film draws him, plainly:
 * one white with a cream belly and a thin dark line round it, the mane in two greens.
 *
 * The body is a spine of points from the head back to the tail. Flying, the spine is the head's own path behind it
 * (`trail`), with a slow wave running down it. Lying still, a scene lays the spine itself.
 *
 * When his name comes back to him the white comes off him in scales from the tail forward (`burst`, 0 to 1): the body
 * shortens from its tail as flakes peel away from where it was, and the last of him is the boy.
 */

/** His length, in cells, nose to tail. A ball is 0.26 across: he is some twenty of her long. */
export const LENGTH = 5.6
/** The head, from the neck's joint to the nose. */
export const HEAD = 0.7

const WHITE = '#F3F6F1'
const BELLY = '#DCE3D3'
const LINE = '#2D4B4A'
const MANE = '#4F9F8F'
const MANE_DARK = '#2F7466'
const HORN = '#EDE4CC'

const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1])

/**
 * The spine behind a head that has been flying along `head`: `n` + 1 points `len` cells apart in all, the first at the
 * head at `t`, each further one where the head was. A slow wave runs down it from head to tail (`wave` cells high at
 * its middle). Where the head has not come far enough in the last six seconds, the spine goes on straight back.
 */
export function trail(head: (t: number) => Pt, t: number, len = LENGTH - HEAD, n = 48, wave = 0.16): Pt[] {
  const seg = len / n
  const out: Pt[] = [head(t)]
  let prev = out[0]
  let acc = 0
  let s = t
  const dt = 1 / 90
  while (out.length <= n && s > t - 6) {
    s -= dt
    const p = head(s)
    const d = dist(prev, p)
    if (d <= 1e-9) continue
    acc += d
    while (acc >= seg && out.length <= n) {
      const over = acc - seg
      const f = 1 - over / d
      out.push([prev[0] + (p[0] - prev[0]) * f, prev[1] + (p[1] - prev[1]) * f])
      acc = over
    }
    prev = p
  }
  // Not far enough: straight on back the way the last of it lay.
  while (out.length <= n) {
    const a = out[out.length - 1]
    const b = out.length > 1 ? out[out.length - 2] : [a[0] + 1, a[1]]
    const d = dist(a, b as Pt) || 1
    out.push([a[0] + ((a[0] - b[0]) / d) * seg, a[1] + ((a[1] - b[1]) / d) * seg])
  }
  if (wave > 0) {
    const waved: Pt[] = [out[0]]
    for (let i = 1; i <= n; i++) {
      const [nx, ny] = normalAt(out, i)
      const u = i / n
      const a = wave * Math.sin(Math.PI * Math.min(1, u * 1.4)) * Math.sin(2 * Math.PI * (u * 1.6 - t * 0.55))
      waved.push([out[i][0] + nx * a, out[i][1] + ny * a])
    }
    return waved
  }
  return out
}

/** The unit normal at spine point `i` (to the left of the way from tail to head: up for a dragon flying east). */
function normalAt(sp: Pt[], i: number): Pt {
  const a = sp[Math.max(0, i - 1)]
  const b = sp[Math.min(sp.length - 1, i + 1)]
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  const d = Math.hypot(dx, dy) || 1
  return [dy / d, -dx / d]
}

/**
 * Which side of the spine is his back at point `i`: the side that faces up on the screen, so his back is to the sky
 * whichever way he goes and however he is coiled; eased through 0 where the spine runs straight up or down, where
 * he is seen side on to the turn. Multiplies the normal.
 */
function sideOf(sp: Pt[], i: number): number {
  const [, ny] = normalAt(sp, i)
  return Math.max(-1, Math.min(1, -ny * 2.5))
}
const sgn = (v: number) => (v >= 0 ? 1 : -1)

/** The way the head points: from the second spine point to the first. */
export function heading(sp: Pt[]): number {
  return Math.atan2(sp[0][1] - sp[1][1], sp[0][0] - sp[1][0])
}

/** His body's width at share `u` of the way from the neck to the tail. */
const widthAt = (u: number): number => {
  if (u < 0.2) return lerp(0.19, 0.23, u / 0.2)
  if (u < 0.6) return lerp(0.23, 0.18, (u - 0.2) / 0.4)
  return lerp(0.18, 0.02, Math.pow((u - 0.6) / 0.4, 0.85))
}

/** Where a rider sits on his back: on the spine `s` of the way back, up off it by the body's half width and her radius. */
export function seat(sp: Pt[], up: number, s = 0.13, r = 0.13): Pt {
  const n = sp.length - 1
  const f = s * n
  const i = Math.floor(f)
  const u = f - i
  const a = sp[i]
  const b = sp[Math.min(n, i + 1)]
  const p: Pt = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]
  const [nx, ny] = normalAt(sp, i)
  const h = widthAt(s) / 2 + r * 0.92
  const side = sgn(sideOf(sp, i) || up)
  return [p[0] + nx * h * side, p[1] + ny * h * side]
}

export interface DragonLook {
  /** No longer read: his back is to the sky along the whole of him (`sideOf`). Kept for the callers that pass it. */
  up?: number
  /** How far the scales have come off him, 0 to 1. */
  burst?: number
  /** How much he is seen, 0 to 1 (into the haze, behind cloud). */
  alpha?: number
  /** His legs: 0 held back in flight, 1 reaching forward (to land, to hold). */
  reach?: number
  /** His eyes shut (hurt, asleep): 0 open, 1 shut. */
  shut?: number
}

/**
 * The dragon along `sp` (head first). His mane streams back off the neck and stirs; his legs are held back unless
 * `reach` brings them forward; the scales come off from the tail as `burst` goes to 1.
 */
export function drawDragon(g: Paint, sp: Pt[], L: Light, look: DragonLook): void {
  const { ctx } = g
  const n = sp.length - 1
  const burst = look.burst ?? 0
  const alpha = look.alpha ?? 1
  if (alpha <= 0.01) return
  // How much of him is left: the spine from the head back to `keep` of its length.
  const keep = 1 - smooth(burst, 0, 0.85)
  const last = Math.max(1, Math.round(n * keep))
  const white = lit(WHITE, L.ambient, 0.8)
  const belly = lit(BELLY, L.ambient, 0.72)
  const line = mix(LINE, L.top, 0.2)
  ctx.save()
  ctx.globalAlpha = alpha
  if (keep > 0.03) {
    // The body: its two edges, the tail end rounded off where the scales are coming away.
    const left: Pt[] = []
    const right: Pt[] = []
    for (let i = 0; i <= last; i++) {
      const u = i / n
      let w = widthAt(u) / 2
      if (keep < 1 && i > last - 3) w *= Math.max(0.15, (last - i) / 3)
      const [nx, ny] = normalAt(sp, i)
      left.push([sp[i][0] + nx * w, sp[i][1] + ny * w])
      right.push([sp[i][0] - nx * w, sp[i][1] - ny * w])
    }
    // The legs first, so the body covers their roots.
    drawLegs(g, sp, look.reach ?? 0, last, white, line)
    ctx.beginPath()
    ctx.moveTo(left[0][0], left[0][1])
    for (let i = 1; i <= last; i++) ctx.lineTo(left[i][0], left[i][1])
    for (let i = last; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1])
    ctx.closePath()
    fill(ctx, white)
    ink(g, line, 1.6)
    // The belly: a cream band along the underside, a third of the width, wherever the underside is.
    const under: Pt[] = []
    const mid: Pt[] = []
    for (let i = 0; i <= last; i++) {
      const u = i / n
      const [nx, ny] = normalAt(sp, i)
      const side = sideOf(sp, i)
      let w = widthAt(u) / 2
      if (keep < 1 && i > last - 3) w *= Math.max(0.15, (last - i) / 3)
      under.push([sp[i][0] - nx * w * side, sp[i][1] - ny * w * side])
      mid.push([sp[i][0] - nx * w * 0.35 * side, sp[i][1] - ny * w * 0.35 * side])
    }
    ctx.beginPath()
    ctx.moveTo(under[0][0], under[0][1])
    for (let i = 1; i <= last; i++) ctx.lineTo(under[i][0], under[i][1])
    for (let i = last; i >= 0; i--) ctx.lineTo(mid[i][0], mid[i][1])
    ctx.closePath()
    fill(ctx, belly)
    // The tail's tuft, while there is a tail.
    if (keep > 0.97) drawTuft(g, sp, L)
  }
  // The mane, over the neck, and the head.
  if (keep > 0.01) drawMane(g, sp, L, keep)
  drawHead(g, sp, L, look.shut ?? 0, 1 - smooth(burst, 0.82, 1))
  ctx.restore()
}

function drawLegs(g: Paint, sp: Pt[], reach: number, last: number, white: string, line: string): void {
  const n = sp.length - 1
  for (const [s, side] of [
    [0.16, 1],
    [0.19, -1],
    [0.58, 1],
    [0.61, -1],
  ] as const) {
    const i = Math.round(s * n)
    if (i > last - 1) continue
    const [nx, ny] = normalAt(sp, i)
    const [tx, ty] = [sp[Math.max(0, i - 1)][0] - sp[i][0], sp[Math.max(0, i - 1)][1] - sp[i][1]]
    const td = Math.hypot(tx, ty) || 1
    const fx = tx / td
    const fy = ty / td
    // The hip on the underside; the leg goes down and back (or forward, reaching).
    const w = widthAt(s) / 2
    const down = sgn(sideOf(sp, i))
    const dn: Pt = [-nx * down, -ny * down]
    const hip: Pt = [sp[i][0] + dn[0] * w * 0.4, sp[i][1] + dn[1] * w * 0.4]
    const back = lerp(-0.7, 0.55, reach)
    const knee: Pt = [hip[0] + dn[0] * 0.14 + fx * back * 0.1, hip[1] + dn[1] * 0.14 + fy * back * 0.1]
    const foot: Pt = [knee[0] + dn[0] * 0.08 + fx * back * 0.13, knee[1] + dn[1] * 0.08 + fy * back * 0.13]
    const far = side < 0
    g.ctx.lineCap = 'round'
    g.ctx.beginPath()
    g.ctx.moveTo(hip[0], hip[1])
    g.ctx.lineTo(knee[0], knee[1])
    g.ctx.lineTo(foot[0], foot[1])
    g.ctx.strokeStyle = line
    g.ctx.lineWidth = 0.075
    g.ctx.stroke()
    g.ctx.strokeStyle = far ? mix(white, line, 0.25) : white
    g.ctx.lineWidth = 0.05
    g.ctx.stroke()
    // Three claws.
    for (const c of [-0.6, 0, 0.6]) {
      const a = Math.atan2(foot[1] - knee[1], foot[0] - knee[0]) + c
      poly(g.ctx, [foot, [foot[0] + Math.cos(a) * 0.05, foot[1] + Math.sin(a) * 0.05]], false)
      ink(g, line, 1.3)
    }
    g.ctx.lineCap = 'butt'
  }
}

function drawMane(g: Paint, sp: Pt[], L: Light, keep: number): void {
  const { ctx } = g
  const n = sp.length - 1
  const end = Math.min(Math.round(n * 0.2), Math.round(n * keep))
  if (end < 2) return
  const mane = lit(MANE, L.ambient, 0.5)
  const dark = lit(MANE_DARK, L.ambient, 0.5)
  // Long locks from the back of the head, lying back along the neck and lifting off it at their ends, streaming in
  // the wind of his going: the far layer darker, the near one lighter, each a few long tapering strands.
  for (const [col, locks, lift, off] of [
    [dark, 4, 0.16, 0.9],
    [mane, 5, 0.11, 0],
  ] as const) {
    for (let k = 0; k < locks; k++) {
      const root = Math.min(end - 1, Math.round((k / locks) * end * 0.55))
      const tip = Math.min(n, root + Math.round(end * (0.9 + 0.5 * hash(k, 77))))
      const pts: Pt[] = []
      const back: Pt[] = []
      for (let i = root; i <= tip; i++) {
        const u = (i - root) / Math.max(1, tip - root)
        const [nx, ny] = normalAt(sp, i)
        const w = widthAt(i / n) / 2
        const stir = 0.035 * Math.sin(g.t * 3.4 - i * 0.8 + k * 1.3 + off) * u
        const h = w * 0.7 + lift * Math.sin(Math.PI * Math.min(1, u * 1.15)) * (1 - 0.3 * u) + stir
        const side = sideOf(sp, i)
        pts.push([sp[i][0] + nx * h * side, sp[i][1] + ny * h * side])
        const h2 = w * 0.55 + lift * 0.25 * (1 - u)
        back.push([sp[i][0] + nx * h2 * side, sp[i][1] + ny * h2 * side])
      }
      ctx.beginPath()
      ctx.moveTo(back[0][0], back[0][1])
      for (const p of pts) ctx.lineTo(p[0], p[1])
      for (let i = back.length - 1; i >= 0; i--) ctx.lineTo(back[i][0], back[i][1])
      ctx.closePath()
      fill(ctx, col)
    }
  }
}

function drawTuft(g: Paint, sp: Pt[], L: Light): void {
  const n = sp.length - 1
  const tip = sp[n]
  const prev = sp[n - 3]
  const a = Math.atan2(tip[1] - prev[1], tip[0] - prev[0])
  const { ctx } = g
  ctx.save()
  ctx.translate(tip[0], tip[1])
  ctx.rotate(a)
  ctx.scale(1, sgn(sideOf(sp, n - 2)))
  const stir = 0.03 * Math.sin(g.t * 2.7)
  poly(ctx, [
    [-0.06, 0],
    [0.12, -0.07 + stir],
    [0.22, -0.02 + stir],
    [0.1, 0.03],
    [0.2, 0.07 + stir],
    [0.02, 0.03],
  ])
  fill(ctx, lit(MANE, L.ambient, 0.3))
  ctx.restore()
}

function drawHead(g: Paint, sp: Pt[], L: Light, shut: number, size: number): void {
  if (size <= 0.01) return
  const { ctx } = g
  const a = heading(sp)
  const s = HEAD * size
  ctx.save()
  ctx.translate(sp[0][0], sp[0][1])
  ctx.rotate(a)
  // Flying west he rolls over: his back stays to the sky.
  const side = sideOf(sp, 1)
  ctx.scale(s, s * sgn(side) * Math.max(0.35, Math.abs(side)))
  const white = lit(WHITE, L.ambient, 0.8)
  const line = mix(LINE, L.top, 0.2)
  const px = g.px / s
  const inkIn = (c: string, w: number) => {
    ctx.strokeStyle = c
    ctx.lineWidth = Math.max(1.25 * px, w / 108 / s)
    ctx.stroke()
  }
  // Horns: two, swept back off the brow, pale.
  for (const [hx, hy, tx, ty] of [
    [0.32, -0.3, -0.25, -0.62],
    [0.22, -0.28, -0.32, -0.48],
  ]) {
    ctx.beginPath()
    ctx.moveTo(hx, hy)
    ctx.quadraticCurveTo(hx - 0.2, hy - 0.22, tx, ty)
    ctx.quadraticCurveTo(hx - 0.12, hy - 0.08, hx + 0.1, hy + 0.02)
    ctx.closePath()
    fill(ctx, lit(HORN, L.ambient, 0.35))
    inkIn(line, 1.4)
  }
  // The head: the skull, the long muzzle, the jaw.
  ctx.beginPath()
  ctx.moveTo(-0.05, -0.2)
  ctx.bezierCurveTo(0.1, -0.36, 0.38, -0.34, 0.55, -0.24)
  ctx.bezierCurveTo(0.75, -0.16, 0.95, -0.12, 1.02, -0.05)
  ctx.bezierCurveTo(1.05, 0.0, 1.0, 0.05, 0.92, 0.06)
  ctx.bezierCurveTo(0.7, 0.1, 0.45, 0.22, 0.2, 0.22)
  ctx.bezierCurveTo(0.05, 0.21, -0.06, 0.12, -0.08, 0.0)
  ctx.closePath()
  fill(ctx, white)
  inkIn(line, 1.6)
  // The mouth's line, and the nostril.
  ctx.beginPath()
  ctx.moveTo(1.0, 0.0)
  ctx.quadraticCurveTo(0.75, 0.04, 0.52, 0.06)
  inkIn(line, 1.2)
  circle(ctx, 0.96, -0.07, 0.02)
  fill(ctx, line)
  // The eye: dark, under the brow; a line when shut.
  if (shut < 0.5) {
    ctx.beginPath()
    ctx.ellipse(0.46, -0.13, 0.055, 0.045 * (1 - shut * 1.6), -0.2, 0, Math.PI * 2)
    fill(ctx, '#1E2A2C')
  } else {
    ctx.beginPath()
    ctx.moveTo(0.4, -0.12)
    ctx.quadraticCurveTo(0.46, -0.09, 0.52, -0.13)
    inkIn('#1E2A2C', 1.5)
  }
  // A whisker trailing back from the muzzle.
  ctx.beginPath()
  ctx.moveTo(0.86, 0.02)
  const w = 0.05 * Math.sin(g.t * 2.3)
  ctx.bezierCurveTo(0.6, 0.18, 0.3, 0.32 + w, 0.0, 0.42 + w)
  inkIn(lit('#9FB7B0', L.ambient, 0.3), 1.2)
  ctx.restore()
}

/**
 * The scales that came off him: each leaves the body from where the vanishing end was when it came away, drifts back
 * and up behind him, turning, and is gone in a few seconds. `bodyAt(te)` is his spine at the time a scale came away;
 * `from` is when the burst began and `dur` how long it took. Flat white flakes, a few dozen at a time, never a glitter.
 */
export function drawScales(g: Paint, L: Light, bodyAt: (t: number) => Pt[], from: number, dur: number, count = 90): void {
  const { ctx, t } = g
  if (t < from) return
  const white = lit(WHITE, L.ambient, 0.8)
  const edge = lit('#C9D6CE', L.ambient, 0.55)
  for (let i = 0; i < count; i++) {
    const te = from + (i / count) * dur * 0.85
    const age = t - te
    if (age < 0 || age > 3.2) continue
    const sp = bodyAt(te)
    const n = sp.length - 1
    const keep = 1 - smooth(te, from, from + dur * 0.85)
    const at = sp[Math.max(0, Math.min(n, Math.round(n * keep)))]
    const h1 = hash(i, 101)
    const h2 = hash(i, 102)
    // Off the way he was going and up, slowing.
    const a = heading(sp) + Math.PI + (h1 - 0.5) * 1.6
    const v = 0.7 + 1.2 * h2
    const go = (1 - Math.exp(-age * 1.3)) / 1.3
    const x = at[0] + Math.cos(a) * v * go
    const y = at[1] + Math.sin(a) * v * go - 0.25 * age + 0.04 * age * age
    const fade = 1 - smooth(age, 1.6, 3.2)
    const spin = age * (2 + 3 * h1) + i
    const r = 0.045 + 0.03 * hash(i, 103)
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(spin)
    ctx.scale(1, 0.45 + 0.55 * Math.abs(Math.cos(age * 3 + i)))
    ctx.beginPath()
    ctx.moveTo(-r, 0)
    ctx.quadraticCurveTo(0, -r * 1.1, r, 0)
    ctx.quadraticCurveTo(0, -r * 0.35, -r, 0)
    ctx.closePath()
    fill(ctx, rgba(i % 3 ? white : edge, fade))
    ctx.restore()
  }
}

export { curve }
