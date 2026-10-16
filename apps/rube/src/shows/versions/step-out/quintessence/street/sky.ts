import type { Pt } from '../../../../../parts'
import { layer, sway, type View } from '../depth'
import { hash } from '../kit'
import { mix, rgba } from '../negatives/hand'
import { steam } from './city'
import { FRONTS } from './fronts'
import { goldAt, morning, S, skyAt, sunAt, whiteAt } from './light'

/**
 * The sky over the street and the city behind it (the street's own): three planes of towers going back into the haze
 * down the avenue, the low sun in the avenue's gap between them, a plane drawing its contrail across the top, gulls
 * far off, steam off the roofs. Everything far is pale: the credits are set over this sky, so nothing behind them
 * is dark or quick. The planes are composed for the long view at the end (`ANCHOR`, `REF`) and slide under the
 * camera at their own depths.
 */

type C2 = CanvasRenderingContext2D

/** Where the far planes coincide with the street, and at what distance: the long view the credits hold on. */
export const ANCHOR: Pt = [11, -3]
export const REF = 10.5

/** The avenue: where it opens between the corner and the far side, and where it meets the haze. */
const AVENUE = 16.2

interface Tower {
  x0: number
  x1: number
  top: number
  /** Setbacks: [inset each side, how far down from the top]. */
  tiers: [number, number][]
  crown: 'flat' | 'spire' | 'pyramid' | 'tank'
  seed: number
}

/** Towers on a plane, scattered from a seed across `x0..x1`, leaving the avenue's gap (`gap` either side of it) open. */
function towers(seed: number, x0: number, x1: number, gap: number, h: Pt, w: Pt): Tower[] {
  const out: Tower[] = []
  let x = x0
  let i = 0
  while (x < x1) {
    const width = w[0] + (w[1] - w[0]) * hash(i, 1, seed)
    const a = x
    const b = x + width
    x = b + 0.15 + 0.6 * hash(i, 2, seed)
    i++
    if (b > AVENUE - gap && a < AVENUE + gap) continue
    const top = -(h[0] + (h[1] - h[0]) * hash(i, 3, seed) ** 1.4)
    // Setbacks from the lowest up: each higher, each further in.
    const tiers: [number, number][] = []
    const n = Math.floor(hash(i, 4, seed) * 3)
    for (let k = 0; k < n; k++) tiers.push([width * (0.1 + 0.08 * k), 0.6 + (n - 1 - k) * 0.8 + hash(i, 5 + k, seed) * 0.3])
    const c = hash(i, 9, seed)
    out.push({ x0: a, x1: b, top, tiers, crown: c < 0.18 ? 'spire' : c < 0.32 ? 'pyramid' : c < 0.55 ? 'tank' : 'flat', seed: i })
  }
  return out
}

const FAR = towers(31, -6, 30, 0.7, [5.6, 10.5], [0.9, 1.8])
const MID = towers(47, -6, 30, 1.0, [4.2, 7.4], [1.2, 2.4])
const NEAR = towers(53, -6, 32, 1.45, [4.4, 6.4], [1.6, 3.2])

/** One tower: its tiers stepping in toward the top, its crown, the sun on its right edge; windows when `panes` is given. */
function tower(ctx: C2, k: number, w: Tower, ground: number, body: string, lit: string, panes: Path2D | null): void {
  const { x0, x1, top, tiers } = w
  // The tiers from the lowest setback up, each stepping further in.
  const n = tiers.length
  const level = (j: number) => top + tiers[j][1]
  const inset = (j: number) => (j < 0 ? 0 : tiers[j][0])
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.moveTo(x0 * k, ground * k)
  for (let j = 0; j < n; j++) {
    ctx.lineTo((x0 + inset(j - 1)) * k, level(j) * k)
    ctx.lineTo((x0 + inset(j)) * k, level(j) * k)
  }
  const l = x0 + inset(n - 1)
  const r = x1 - inset(n - 1)
  const cx = (l + r) / 2
  ctx.lineTo(l * k, top * k)
  if (w.crown === 'spire') {
    ctx.lineTo((cx - (r - l) * 0.18) * k, top * k)
    ctx.lineTo((cx - (r - l) * 0.08) * k, (top - 0.7) * k)
    ctx.lineTo(cx * k, (top - 1.6) * k)
    ctx.lineTo((cx + (r - l) * 0.08) * k, (top - 0.7) * k)
    ctx.lineTo((cx + (r - l) * 0.18) * k, top * k)
  } else if (w.crown === 'pyramid') ctx.lineTo(cx * k, (top - (r - l) * 0.45) * k)
  ctx.lineTo(r * k, top * k)
  for (let j = n - 1; j >= 0; j--) {
    ctx.lineTo((x1 - inset(j)) * k, level(j) * k)
    ctx.lineTo((x1 - inset(j - 1)) * k, level(j) * k)
  }
  ctx.lineTo(x1 * k, ground * k)
  ctx.closePath()
  ctx.fill()
  // The sun on its right edge, tier by tier.
  ctx.fillStyle = lit
  const e = Math.min(0.2, (x1 - x0) * 0.14)
  for (let j = -1; j < n; j++) {
    const yb = j < 0 ? ground : level(j)
    const yt = j + 1 < n ? level(j + 1) : top
    ctx.fillRect((x1 - inset(j) - e) * k, yt * k, e * k, (yb - yt) * k)
  }
  if (w.crown === 'tank') {
    // A water tower on the roof: a barrel and a cone, on legs.
    const tx = l + (r - l) * (0.25 + 0.5 * hash(w.seed, 11))
    ctx.fillStyle = body
    ctx.fillRect((tx - 0.2) * k, (top - 0.55) * k, 0.4 * k, 0.4 * k)
    ctx.beginPath()
    ctx.moveTo((tx - 0.24) * k, (top - 0.55) * k)
    ctx.lineTo(tx * k, (top - 0.8) * k)
    ctx.lineTo((tx + 0.24) * k, (top - 0.55) * k)
    ctx.fill()
    ctx.fillRect((tx - 0.18) * k, (top - 0.16) * k, 0.04 * k, 0.16 * k)
    ctx.fillRect((tx + 0.14) * k, (top - 0.16) * k, 0.04 * k, 0.16 * k)
  }
  if (!panes) return
  // Windows: rows of faint panes.
  const cols = Math.max(2, Math.round((x1 - x0) / 0.32))
  const cw = (x1 - x0) / cols
  for (let y = top + 0.35; y < ground - 0.4; y += 0.42) {
    let ins = 0
    for (let j = 0; j < n; j++) if (y < level(j)) ins = inset(j)
    for (let i = 0; i < cols; i++) {
      const wx = x0 + i * cw + cw * 0.3
      if (wx < x0 + ins || wx + cw * 0.4 > x1 - ins) continue
      panes.rect(wx * k, y * k, cw * 0.4 * k, 0.2 * k)
    }
  }
}


/** A box of the street (cells) in a plane's own cells, at this frame (the inverse of `layer`'s placing). */
function inPlane(v: View, z: number, x0: number, y0: number, x1: number, y1: number): [number, number, number, number] {
  const s = Math.pow(v.h / REF, 1 - z)
  const ox = ANCHOR[0] + z * (v.cx - ANCHOR[0])
  const oy = ANCHOR[1] + z * (v.cy - ANCHOR[1])
  return [ox + (x0 - v.cx) / s, oy + (y0 - v.cy) / s, ox + (x1 - v.cx) / s, oy + (y1 - v.cy) / s]
}

/**
 * The boxes of sky to be seen at this frame past the fronts along the street, in a plane's cells: over each front down
 * to its roof, and down the gaps between them (the avenue's) to the street. What the fronts hide is never painted.
 */
function openSky(v: View, z: number): [number, number, number, number][] {
  const out: [number, number, number, number][] = []
  const top = v.y0 - 0.5
  let x = v.x0 - 0.5
  const end = v.x1 + 0.5
  for (const f of FRONTS) {
    if (f.x1 <= x) continue
    if (x >= end) break
    if (f.x0 > x) {
      out.push(inPlane(v, z, x, top, Math.min(f.x0, end), 1.0))
      x = f.x0
      if (x >= end) break
    }
    const floor = f.top - 0.15
    if (floor > top) out.push(inPlane(v, z, x, top, Math.min(f.x1, end), floor))
    x = f.x1
  }
  if (x < end) out.push(inPlane(v, z, x, top, end, 1.0))
  return out
}

/** Draw within each of the open sky's boxes in turn (a plane's cells), clipped to it: a plain box is a cheap clip. */
function inOpen(ctx: C2, k: number, boxes: [number, number, number, number][], draw: (box: [number, number, number, number]) => void): void {
  for (const box of boxes) {
    const [x0, y0, x1, y1] = box
    ctx.save()
    ctx.beginPath()
    ctx.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
    ctx.clip()
    draw(box)
    ctx.restore()
  }
}

/** The sky: pale over the gold of the horizon, the sun a plain disc low in the avenue, a plane's contrail across the top. */
export function drawSky(ctx: C2, v: View, t: number): void {
  const k = v.k
  const sky = skyAt(t)
  const boxes = openSky(v, 0.04)
  layer(ctx, v, 0.04, ANCHOR, REF, () => {
    // The sky, laid only where it is seen: pale overhead, warming toward the avenue's end, the warmth climbing as the
    // sun does.
    const m = morning(t)
    const gold = goldAt(t)
    const g = ctx.createLinearGradient(0, -11 * k, 0, -0.6 * k)
    g.addColorStop(0, sky.high)
    g.addColorStop(0.62 - 0.22 * m, sky.low)
    g.addColorStop(1, mix(sky.low, S.gold, 0.3 * gold + 0.15 * m))
    ctx.fillStyle = g
    for (const [x0, y0, x1, y1] of boxes) ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
    // The sun: a plain disc in the haze.
    const [sx, sy] = sunAt(t)
    ctx.fillStyle = sky.sun
    ctx.beginPath()
    ctx.arc(sx * k, sy * k, 0.42 * k, 0, Math.PI * 2)
    ctx.fill()
    // The far end of the avenue: low blocks and a tower, pale in the haze, the sun between them.
    const end = new Path2D()
    for (const [x0, x1, top] of [[AVENUE - 1.5, AVENUE - 0.9, -1.6], [AVENUE - 0.95, AVENUE - 0.45, -2.6], [AVENUE + 0.55, AVENUE + 1.0, -1.9], [AVENUE + 0.95, AVENUE + 1.6, -3.1], [AVENUE + 1.55, AVENUE + 2.1, -1.4]]) end.rect(x0 * k, top * k, (x1 - x0) * k, (-0.7 - top) * k)
    end.moveTo((AVENUE + 1.27) * k, -3.1 * k)
    end.lineTo((AVENUE + 1.27) * k, -3.8 * k)
    end.lineTo((AVENUE + 1.31) * k, -3.1 * k)
    ctx.fillStyle = rgba(mix(sky.low, '#A9A598', 0.55), 0.7)
    ctx.fill(end)
    contrail(ctx, k, t, sky.high)
  })
}

/** The plane high over the street, from 230 s: where it is `s` seconds into its crossing (the sky's plane's cells). */
const planeAt = (s: number): Pt => [-3 + 0.7 * s, -7.8 + 0.0125 * s]

/**
 * A plane crossing high up, and its contrail: laid behind it as it goes, each stretch of it drifting off on the wind
 * after it is laid, spreading wider and fainter the older it is.
 */
function contrail(ctx: C2, k: number, t: number, high: string): void {
  const s = t - 230
  if (s <= 0) return
  const AGE = 24
  const n = 12
  const drift: Pt = [0.06, 0.025]
  const point = (age: number): Pt => {
    const [x, y] = planeAt(s - age)
    return [x + drift[0] * age, y + drift[1] * age]
  }
  const oldest = Math.min(s, AGE)
  ctx.lineCap = 'round'
  for (let i = 0; i < n; i++) {
    const a0 = (oldest * i) / n
    const a1 = (oldest * (i + 1)) / n
    const age = (a0 + a1) / 2
    const [x0, y0] = point(a0)
    const [x1, y1] = point(a1)
    ctx.strokeStyle = rgba('#FFFFFF', 0.75 * (1 - age / AGE))
    ctx.lineWidth = (0.035 + 0.009 * age) * k
    ctx.beginPath()
    ctx.moveTo(x0 * k, y0 * k)
    ctx.lineTo(x1 * k, y1 * k)
    ctx.stroke()
  }
  // The plane: a speck with its wings, a little darker than the sky.
  const [px, py] = planeAt(s)
  ctx.fillStyle = mix(high, '#6E777D', 0.45)
  ctx.fillRect((px - 0.07) * k, (py - 0.012) * k, 0.14 * k, 0.024 * k)
  ctx.fillRect((px - 0.015) * k, (py - 0.05) * k, 0.03 * k, 0.1 * k)
}

/** The city behind the street, on three planes, each paler for its distance; and gulls wheeling far off. */
export function drawCity(ctx: C2, v: View, t: number): void {
  const k = v.k
  const sky = skyAt(t)
  const haze = sky.low
  const w = whiteAt(t)
  const m = morning(t)
  // Far: the tall towers, flat values just darker than the sky, their sunward edges catching; a haze along their feet.
  layer(ctx, v, 0.15, ANCHOR, REF, () => {
    const body = mix(mix(S.far, haze, 0.52), '#F6F3EC', w * 0.2)
    const lit = mix(body, sky.sun, 0.6)
    const rib = mix(body, '#8E979D', 0.22)
    const g = ctx.createLinearGradient(0, -4.5 * k, 0, -0.4 * k)
    g.addColorStop(0, rgba(haze, 0))
    g.addColorStop(1, rgba(haze, 0.85))
    inOpen(ctx, k, openSky(v, 0.15), ([x0, , x1]) => {
      const ribs = new Path2D()
      for (const tw of FAR) {
        if (tw.x1 <= x0 || tw.x0 >= x1) continue
        tower(ctx, k, tw, -0.6, body, lit, null)
        // Its piers, faint, up the narrowest of its tiers.
        const ins = tw.tiers.length ? tw.tiers[tw.tiers.length - 1][0] : 0
        for (let x = tw.x0 + ins + 0.12; x < tw.x1 - ins - 0.1; x += 0.3) ribs.rect(x * k, (tw.top + 0.25) * k, 0.05 * k, (-0.6 - tw.top - 0.25) * k)
      }
      ctx.fillStyle = rib
      ctx.fill(ribs)
      ctx.fillStyle = g
      ctx.fillRect((x0 - 1) * k, -4.5 * k, (x1 - x0 + 2) * k, 4.2 * k)
    })
  })
  // Middle: the next towers, their windows in rows; gulls wheeling low in the avenue's gap, across the sun.
  layer(ctx, v, 0.35, ANCHOR, REF, () => {
    const body = mix(mix('#BABDBB', haze, 0.42), '#F3F0E8', w * 0.2)
    const lit = mix(mix('#E9D6B4', sky.sun, 0.3), '#FFFFFF', w * 0.3)
    const g = ctx.createLinearGradient(0, -3.2 * k, 0, -0.1 * k)
    g.addColorStop(0, rgba(haze, 0))
    g.addColorStop(1, rgba(haze, 0.7))
    inOpen(ctx, k, openSky(v, 0.35), ([x0, , x1]) => {
      const panes = new Path2D()
      for (const tw of MID) if (tw.x1 > x0 && tw.x0 < x1) tower(ctx, k, tw, -0.3, body, lit, panes)
      ctx.fillStyle = rgba(mix(body, '#7F8C96', 0.35), 0.55)
      ctx.fill(panes)
      ctx.fillStyle = g
      ctx.fillRect((x0 - 1) * k, -3.2 * k, (x1 - x0 + 2) * k, 3.1 * k)
    })
    const gulls = new Path2D()
    for (let i = 0; i < 7; i++) {
      const a = t * 0.3 + i * 0.55
      const cx = AVENUE + 0.6 + 1.5 * Math.cos(a) + 0.4 * sway(t, 0.07, i)
      const cy = -2.9 + 0.45 * Math.sin(a * 1.3) + 0.03 * i
      const flap = Math.sin(t * 7.5 + i * 1.9)
      const s = 0.09
      gulls.moveTo((cx - s) * k, (cy - flap * s * 0.6) * k)
      gulls.lineTo(cx * k, cy * k)
      gulls.lineTo((cx + s) * k, (cy - flap * s * 0.6) * k)
    }
    ctx.strokeStyle = rgba(mix('#4A5258', haze, 0.35), 0.8)
    ctx.lineWidth = Math.max(1, 0.022 * k)
    ctx.stroke(gulls)
  })
  // Near: the next block's roofs over the low fronts, and down the avenue its corners, the traffic crossing there.
  layer(ctx, v, 0.6, ANCHOR, REF, (f) => {
    const body = mix(mix('#C7B8A3', haze, 0.2), '#F1EDE4', w * 0.3)
    const lit = mix('#F0DDBC', sky.sun, 0.25 + 0.5 * w)
    const g = ctx.createLinearGradient(0, -2.2 * k, 0, 0.2 * k)
    g.addColorStop(0, rgba(haze, 0))
    g.addColorStop(1, rgba(haze, 0.45))
    inOpen(ctx, k, openSky(v, 0.6), ([x0, , x1, y1]) => {
      // Far down the avenue, a cross street: its traffic passing behind the corners.
      if (y1 > -0.5) farTraffic(ctx, k, t, haze)
      const panes = new Path2D()
      for (const tw of NEAR) if (tw.x1 > x0 && tw.x0 < x1) tower(ctx, k, tw, 0.05, body, lit, panes)
      ctx.fillStyle = rgba(mix(body, '#6E7C86', 0.45), 0.6)
      ctx.fill(panes)
      ctx.fillStyle = g
      ctx.fillRect((x0 - 1) * k, -2.2 * k, (x1 - x0 + 2) * k, 2.4 * k)
    })
    // Steam off a roof, always: a vent on the far side's roofs breathing out.
    steam(ctx, f, t, 21.2, -4.7, 3.6, 8, 8, 0.75 + 0.25 * m)
  })
}

/**
 * Down the avenue's gap, at its own depths, the avenue's furniture against the sun: signal masts reaching out over
 * it with their heads hung (seen against the light, unlit), and lamp posts along its kerb, each smaller and paler the
 * further it is, each sliding at its own pace as the camera goes along.
 */
const MASTS: [number, number][] = [[0.86, 1], [0.66, -1], [0.48, 1], [0.34, -1], [0.22, 1]]
export function drawAvenue(ctx: C2, v: View, t: number): void {
  const k = v.k
  const sky = skyAt(t)
  for (const [z, side] of MASTS) {
    const size = 0.25 + 0.75 * z
    const ground = -0.75 + 0.85 * z
    const fade = 0.75 - 0.55 * z
    layer(ctx, v, z, ANCHOR, REF, () => {
      inOpen(ctx, k, openSky(v, z), () => {
        const c = mix('#3A3E40', sky.low, fade)
        const px = AVENUE + side * 1.25 * size
        const top = ground - 3.1 * size
        ctx.fillStyle = c
        ctx.fillRect((px - 0.04 * size) * k, top * k, 0.08 * size * k, (ground - top) * k)
        // The arm out over the avenue, the head hung from it.
        const arm = px - side * 1.5 * size
        ctx.fillRect(Math.min(px, arm) * k, top * k, Math.abs(px - arm) * k, 0.05 * size * k)
        const hx = px - side * 1.1 * size
        ctx.fillRect((hx - 0.1 * size) * k, (top + 0.05 * size) * k, 0.2 * size * k, 0.52 * size * k)
        // A lamp post on the other kerb.
        const lx = AVENUE - side * 1.35 * size
        ctx.fillRect((lx - 0.03 * size) * k, (ground - 2.6 * size) * k, 0.06 * size * k, 2.6 * size * k)
        ctx.fillRect((lx - 0.03 * size + side * 0.0) * k, (ground - 2.6 * size) * k, side * 0.4 * size * k, 0.05 * size * k)
        ctx.fillRect((lx + side * 0.3 * size - 0.08 * size) * k, (ground - 2.6 * size) * k, 0.16 * size * k, 0.07 * size * k)
      })
    })
  }
}

/** Down the avenue, far off: cabs and a bus crossing the far cross street, and people on its corners, small and hazed. */
function farTraffic(ctx: C2, k: number, t: number, haze: string): void {
  const y = 0.05
  ctx.fillStyle = mix('#4A4F55', haze, 0.45)
  for (let i = 0; i < 5; i++) {
    const dir = i % 2 ? -1 : 1
    const span = 5.5
    const ph = (((t * (0.32 + 0.1 * hash(i, 3, 79)) + hash(i, 4, 79) * span) % span) + span) % span
    const x = AVENUE + dir * (ph - span / 2)
    const step = Math.sin(t * 6 + i) * 0.025
    ctx.fillRect((x - 0.035) * k, (y - 0.38) * k, 0.07 * k, 0.24 * k)
    ctx.fillRect((x - 0.03 + step) * k, (y - 0.15) * k, 0.025 * k, 0.15 * k)
    ctx.fillRect((x + 0.005 - step) * k, (y - 0.15) * k, 0.025 * k, 0.15 * k)
    ctx.beginPath()
    ctx.arc(x * k, (y - 0.43) * k, 0.04 * k, 0, Math.PI * 2)
    ctx.fill()
  }
  const span = 9
  for (let i = 0; i < 6; i++) {
    const dir = i % 2 ? -1 : 1
    const speed = 2.2 + hash(i, 1, 77) * 1.4
    const len = i === 3 ? 1.5 : 0.62
    const h = i === 3 ? 0.42 : 0.22
    const ph = (((t * speed + hash(i, 2, 77) * span * 3) % (span * 1.6)) + span * 1.6) % (span * 1.6)
    const x = dir > 0 ? AVENUE - span / 2 + ph - len : AVENUE + span / 2 - ph
    const c = i === 3 ? '#E4E1D8' : i % 3 === 0 ? '#D9A93A' : i % 3 === 1 ? '#7C8694' : '#D9A93A'
    ctx.fillStyle = mix(c, haze, 0.45)
    ctx.fillRect(x * k, (y - h) * k, len * k, h * k)
    ctx.fillStyle = mix('#3A3E40', haze, 0.5)
    ctx.fillRect((x + len * 0.15) * k, (y - 0.04) * k, 0.08 * k, 0.05 * k)
    ctx.fillRect((x + len * 0.75) * k, (y - 0.04) * k, 0.08 * k, 0.05 * k)
  }
}
