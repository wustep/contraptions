import type { Pt } from '../../../../../parts'
import { layer, motes, rain, sway, type Frame } from '../depth'
import { hash, smooth } from '../kit'
import { at } from '../music'
import { ctxOf, ease, line, mix, rect, rgba, type Pen } from '../pen'
import { FLIP_A, FLIP_B, FLIP_M, T0, WINNER } from './geo'
import { busy, hush } from './mood'
import { C } from './palette'

/**
 * The hall above the crowd: the world up there and beyond it. Through the glass roof and the tall arched windows, the
 * grey London sky with its clouds going over (far off, d 0.15), the roofs and chimney pots of the street behind (d 0.2
 * to 0.3), their smoke blowing the same way as the clouds, and the rain on the glass. Under the roof a second row of
 * iron trusses (d 0.7) behind the near one, so the roof moves as the camera does. On the wall, the long banners hanging
 * in the draught, the tournament board with its flip cards; strung along the front of the gallery, the bunting. The
 * daylight comes down from the roof in a few faint cold shafts with a little dust in them, brightening and dimming as
 * the clouds go by; pigeons that have got in cross the hall now and then.
 */

export const WALL_TOP = -6.2
export const GALLERY_TOP = -4.0
/** The tall arched windows along the wall: their pitch and offset, half-width, the arch's spring and the sill. */
const WIN_PITCH = 2.4
const WIN_OFF = 0.3
const WIN_W = 0.62
const WIN_SPRING = WALL_TOP + 0.75
const WIN_SILL = GALLERY_TOP - 0.25
/** Where the far layers are laid out against: about where the camera stands to see the whole hall. */
const ANCHOR: Pt = [7, -1.5]
/** The wind outside, cells a second: the clouds and the chimney smoke go with it. */
const WIND = 0.09

const TAU = Math.PI * 2

/* ------------------------------------------------------------------ the glass: what is seen through it */

/** The windows' outlines, as subpaths of the path being built. */
function windowPath(ctx: CanvasRenderingContext2D, k: number, x0: number, x1: number): void {
  for (let n = Math.floor((x0 - WIN_OFF) / WIN_PITCH) - 1; n * WIN_PITCH + WIN_OFF <= x1 + WIN_PITCH; n++) {
    const cx = n * WIN_PITCH + WIN_OFF
    ctx.moveTo((cx - WIN_W) * k, WIN_SILL * k)
    ctx.lineTo((cx - WIN_W) * k, WIN_SPRING * k)
    ctx.arc(cx * k, WIN_SPRING * k, WIN_W * k, Math.PI, TAU)
    ctx.lineTo((cx + WIN_W) * k, WIN_SILL * k)
    ctx.closePath()
  }
}

/**
 * Everything seen through the glass, roof and windows alike, inside one clip: the sky, the clouds, the street's roofs
 * and smoke; the glass's own grime over it, the rain running down it, and under the roof the far row of trusses.
 */
export function glazing(pen: Pen, t: number, f: Frame, x0: number, x1: number): void {
  if (f.y0 > WIN_SILL) return
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const roofOn = f.y0 < WALL_TOP + 0.2
  const yTop = f.y0 - 1
  ctx.save()
  ctx.beginPath()
  if (roofOn) ctx.rect(x0 * k, yTop * k, (x1 - x0) * k, (WALL_TOP - yTop) * k)
  windowPath(ctx, k, x0, x1)
  ctx.clip()
  // The sky, darker looking up through the roof than out through the windows at the horizon.
  layer(
    pen,
    f,
    0.15,
    (g) => {
      const grad = ctx.createLinearGradient(0, -10 * k, 0, -4.2 * k)
      grad.addColorStop(0, rgba(pen, C.skyTop, 1))
      grad.addColorStop(0.62, rgba(pen, C.sky, 1))
      grad.addColorStop(1, rgba(pen, C.skyLow, 1))
      ctx.fillStyle = grad
      ctx.fillRect((g.x0 - 1) * k, (g.y0 - 1) * k, (g.x1 - g.x0 + 2) * k, (g.y1 - g.y0 + 2) * k)
      clouds(pen, t, g)
    },
    ANCHOR,
  )
  // Out of the windows only (not up through the roof), the street behind the hall: a far row of roofs, and a
  // nearer one with its chimneys smoking.
  const windowsOnly = (draw: () => void) => {
    if (!roofOn) return draw()
    ctx.save()
    ctx.beginPath()
    windowPath(ctx, k, x0, x1)
    ctx.clip()
    draw()
    ctx.restore()
  }
  windowsOnly(() => {
    layer(pen, f, 0.2, (g) => city(pen, t, g, 0.88, -4.95, C.cityFar, 11, false), ANCHOR)
    layer(pen, f, 0.3, (g) => city(pen, t, g, 1.15, -4.6, C.city, 23, true), ANCHOR)
  })
  // The glass: a little grime, the rain coming down outside, and the drops running down the panes.
  ctx.fillStyle = rgba(pen, C.glassTint, 0.24)
  ctx.fillRect(x0 * k, yTop * k, (x1 - x0) * k, (WIN_SILL - yTop) * k)
  const wet = 0.75 + 0.25 * busy(t)
  rain(pen, t, f, { seed: 31, density: 4, speed: 8, slant: 0.07, len: 0.34, color: C.rain, alpha: 0.13 * wet, lw: 0.32, x: [x0, x1], y: [WIN_SPRING - WIN_W, WIN_SILL] })
  rain(pen, t, f, { seed: 37, density: 2.5, speed: 0.42, slant: 0.0, len: 0.13, color: C.rain, alpha: 0.3, lw: 0.55, x: [x0, x1], y: [WIN_SPRING - WIN_W, WIN_SILL] })
  if (roofOn) {
    rain(pen, t, f, { seed: 41, density: 3, speed: 1.1, slant: 0.02, len: 0.2, color: C.rain, alpha: 0.2, lw: 0.45, x: [x0, x1], y: [yTop, WALL_TOP] })
    // The far row of trusses, under the glass, a little hazed: the roof's depth.
    layer(pen, f, 0.7, (g) => trusses(pen, g, 3.0, C.trussFar, 0.95), [ANCHOR[0], -1.9])
  }
  ctx.restore()
}

/** The clouds going over, far off: lit tops and grey undersides, in a few fills. */
function clouds(pen: Pen, t: number, g: Frame): void {
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const drift = WIND * t
  const k0 = Math.floor((g.x0 - drift - 3) / 3.4)
  const k1 = Math.ceil((g.x1 - drift + 1) / 3.4)
  for (const pass of [0, 1]) {
    ctx.beginPath()
    for (let n = k0; n <= k1; n++) {
      const w = 1.1 + 1.8 * hash(n, 2, 7)
      const x = n * 3.4 + 2 * hash(n, 1, 7) + drift
      const y = -9.4 + 5.0 * hash(n, 3, 7)
      if (pass === 0) {
        ctx.moveTo((x + 0.6 * w) * k, (y + 0.08 * w) * k)
        ctx.ellipse(x * k, (y + 0.08 * w) * k, 0.6 * w * k, 0.13 * w * k, 0, 0, TAU)
        continue
      }
      for (let m = 0; m < 5; m++) {
        const u = m / 4
        const px = x + (u - 0.5) * w
        const py = y - 0.2 * w * Math.sin(Math.PI * u) * (0.6 + 0.4 * hash(n, m, 8))
        const r = 0.2 * w * (0.7 + 0.5 * hash(n, m, 9))
        ctx.moveTo((px + r) * k, py * k)
        ctx.arc(px * k, py * k, r * k, 0, TAU)
      }
    }
    ctx.fillStyle = rgba(pen, pass === 0 ? C.cloudDark : C.cloudLit, pass === 0 ? 0.32 : 0.3)
    ctx.fill()
  }
}

/** Smoking chimneys of the near row, gathered as it is drawn (cells of its layer), and drawn after it in one go. */
const stacks: number[] = []

/**
 * A row of the street's roofs, flat, pitched and mansard, with chimney stacks and their pots, and here and there a
 * church's spire or a dome: one silhouette in one fill. The near row's chimneys smoke.
 */
function city(pen: Pen, t: number, g: Frame, pitch: number, base: number, col: string, seed: number, smoke: boolean): void {
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const bottom = base + 4
  stacks.length = 0
  ctx.beginPath()
  const box = (a: number, b: number, c: number, d: number) => ctx.rect(a * k, b * k, (c - a) * k, (d - b) * k)
  for (let i = Math.floor(g.x0 / pitch) - 1; i <= Math.ceil(g.x1 / pitch) + 1; i++) {
    const xa = i * pitch
    const xb = xa + pitch * (0.94 + 0.06 * hash(i, seed, 1))
    const top = base - 0.08 - 0.62 * Math.pow(hash(i, seed, 2), 1.4)
    const kind = hash(i, seed, 3)
    ctx.moveTo(xa * k, bottom * k)
    ctx.lineTo(xa * k, top * k)
    if (kind < 0.35) {
      // A pitched roof, its ridge along the street: a gable end.
      ctx.lineTo(((xa + xb) / 2) * k, (top - 0.28 * pitch) * k)
    } else if (kind < 0.6) {
      // Mansard.
      ctx.lineTo((xa + 0.12 * pitch) * k, (top - 0.2) * k)
      ctx.lineTo((xb - 0.12 * pitch) * k, (top - 0.2) * k)
    }
    ctx.lineTo(xb * k, top * k)
    ctx.lineTo(xb * k, bottom * k)
    ctx.closePath()
    // Chimney stacks, with their pots.
    const nStacks = hash(i, seed, 4) < 0.7 ? 1 + (hash(i, seed, 5) < 0.4 ? 1 : 0) : 0
    for (let s = 0; s < nStacks; s++) {
      const sx = xa + pitch * (0.18 + 0.64 * hash(i, seed, 6 + s))
      const sTop = top - (kind < 0.35 ? 0.14 : 0.04) - 0.2
      box(sx - 0.07, sTop, sx + 0.07, top + 0.05)
      for (let q = 0; q < 3; q++) box(sx - 0.055 + q * 0.04, sTop - 0.07, sx - 0.035 + q * 0.04, sTop)
      if (smoke && hash(i, seed, 9 + s) < 0.55) stacks.push(sx, sTop - 0.07, hash(i, seed, 12 + s))
    }
    const mark = hash(i, seed, 14)
    if (mark < 0.05) {
      // A church: its tower and spire.
      const sx = (xa + xb) / 2
      box(sx - 0.13, top - 0.55, sx + 0.13, top)
      ctx.moveTo((sx - 0.13) * k, (top - 0.55) * k)
      ctx.lineTo(sx * k, (top - 1.55) * k)
      ctx.lineTo((sx + 0.13) * k, (top - 0.55) * k)
      ctx.closePath()
    } else if (mark < 0.08) {
      // A dome on its drum, and its lantern.
      const sx = (xa + xb) / 2
      box(sx - 0.34, top - 0.28, sx + 0.34, top)
      ctx.moveTo((sx + 0.32) * k, (top - 0.28) * k)
      ctx.arc(sx * k, (top - 0.28) * k, 0.32 * k, 0, Math.PI, true)
      box(sx - 0.04, top - 0.75, sx + 0.04, top - 0.58)
    }
  }
  ctx.fillStyle = rgba(pen, col, 1)
  ctx.fill()
  if (smoke && stacks.length) chimneySmoke(pen, t)
}

/** The chimneys' smoke, blown downwind and spreading as it goes: three fills for all of it. */
function chimneySmoke(pen: Pen, t: number): void {
  const { k } = pen
  const ctx = ctxOf(pen.p)
  for (let b = 0; b < 3; b++) {
    ctx.beginPath()
    for (let s = 0; s < stacks.length; s += 3) {
      const [sx, sy, h] = [stacks[s], stacks[s + 1], stacks[s + 2]]
      for (let j = 0; j < 6; j++) {
        const u = (((t / 3.4 + j / 6 + h) % 1) + 1) % 1
        const a = (1 - u) * Math.min(1, u * 6)
        if (Math.min(2, Math.floor(a * 3)) !== b) continue
        const px = sx + 0.95 * u + 0.06 * Math.sin(u * 6 + j + h * 9)
        const py = sy - 0.55 * u - 0.05
        const r = 0.05 + 0.15 * u
        ctx.moveTo((px + r) * k, py * k)
        ctx.arc(px * k, py * k, r * k, 0, TAU)
      }
    }
    ctx.fillStyle = rgba(pen, C.smoke, 0.1 + 0.11 * b)
    ctx.fill()
  }
}

/** A row of the roof's arched iron trusses, every 6 cells from `phase`: the far row thinner and hazed. */
function trusses(pen: Pen, g: Frame, phase: number, col: string, weight: number): void {
  const { k } = pen
  const ctx = ctxOf(pen.p)
  ctx.save()
  ctx.strokeStyle = rgba(pen, col, 1)
  ctx.lineCap = 'round'
  for (const [off, lw] of [[0, 2.6], [-0.3, 1.1]] as const) {
    ctx.lineWidth = pen.w * lw * weight
    ctx.beginPath()
    for (let n = Math.floor((g.x0 - phase - 3) / 6); n * 6 + phase - 3 <= g.x1; n++) {
      const cx = n * 6 + phase
      for (let i = 0; i <= 20; i++) {
        const u = i / 20
        const x = cx - 3 + 6 * u
        const y = WALL_TOP - 0.1 - 2.6 * Math.sin(Math.PI * u) + off
        if (i) ctx.lineTo(x * k, y * k)
        else ctx.moveTo(x * k, y * k)
      }
    }
    ctx.stroke()
  }
  // The lattice between the two chords.
  ctx.lineWidth = pen.w * 0.7 * weight
  ctx.beginPath()
  for (let n = Math.floor((g.x0 - phase - 3) / 6); n * 6 + phase - 3 <= g.x1; n++) {
    const cx = n * 6 + phase
    for (let i = 1; i < 20; i += 2) {
      const u0 = i / 20
      const u1 = (i + 1) / 20
      ctx.moveTo((cx - 3 + 6 * u0) * k, (WALL_TOP - 0.1 - 2.6 * Math.sin(Math.PI * u0)) * k)
      ctx.lineTo((cx - 3 + 6 * u1) * k, (WALL_TOP - 0.4 - 2.6 * Math.sin(Math.PI * u1)) * k)
    }
  }
  ctx.stroke()
  ctx.restore()
}

/* ------------------------------------------------------------------ the roof's and the wall's iron */

/** The roof's glazing bars and the near row of trusses (the far row is under the glass, in `glazing`). */
export function roofIron(pen: Pen, f: Frame, x0: number, x1: number): void {
  if (f.y0 > WALL_TOP + 0.2) return
  const yTop = f.y0 - 1
  for (let x = Math.floor(x0 / 0.55) * 0.55; x <= x1; x += 0.55) line(pen, [x, yTop], [x, WALL_TOP], C.iron, 0.6)
  for (let y = WALL_TOP - 0.9; y > yTop; y -= 0.9) line(pen, [x0, y], [x1, y], C.iron, 0.9)
  trusses(pen, f, 0.6, C.iron, 1.25)
  rect(pen, x0, WALL_TOP - 0.15, x1, WALL_TOP + 0.1, C.iron)
}

/** The wall and the windows' frames, under the glass's view. */
export function wallBack(pen: Pen, x0: number, x1: number): void {
  rect(pen, x0, WALL_TOP, x1, GALLERY_TOP, C.wall)
  for (let n = Math.floor((x0 - WIN_OFF) / WIN_PITCH) - 1; n * WIN_PITCH + WIN_OFF <= x1 + WIN_PITCH; n++) {
    const cx = n * WIN_PITCH + WIN_OFF
    rect(pen, cx - WIN_W - 0.06, WIN_SPRING, cx + WIN_W + 0.06, WIN_SILL + 0.06, C.wallHi)
  }
}

/** The windows' mullions and transoms over the glass, the gallery's top beam. */
export function wallIron(pen: Pen, x0: number, x1: number): void {
  const { k } = pen
  const ctx = ctxOf(pen.p)
  ctx.save()
  ctx.strokeStyle = rgba(pen, C.iron, 1)
  ctx.lineWidth = pen.w * 0.7
  ctx.beginPath()
  for (let n = Math.floor((x0 - WIN_OFF) / WIN_PITCH) - 1; n * WIN_PITCH + WIN_OFF <= x1 + WIN_PITCH; n++) {
    const cx = n * WIN_PITCH + WIN_OFF
    ctx.moveTo(cx * k, (WIN_SPRING - WIN_W) * k)
    ctx.lineTo(cx * k, WIN_SILL * k)
    for (let y = WIN_SPRING + 0.35; y < WIN_SILL; y += 0.42) {
      ctx.moveTo((cx - WIN_W) * k, y * k)
      ctx.lineTo((cx + WIN_W) * k, y * k)
    }
  }
  ctx.stroke()
  ctx.restore()
  rect(pen, x0, GALLERY_TOP - 0.12, x1, GALLERY_TOP, C.iron)
}

/* ------------------------------------------------------------------ the hall's dressing */

/** The long banners hanging from the eaves between the windows, in the club colours, swaying in the draught. */
const BANNERS: [number, string, string][] = [
  [-3.3, C.pennantNavy, C.pennantCream],
  [1.5, C.pennantRed, C.pennantCream],
  [11.1, C.pennantGreen, C.pennantCream],
  [15.9, C.pennantRed, C.pennantNavy],
  [20.7, C.pennantNavy, C.pennantCream],
]
export function banners(pen: Pen, t: number, f: Frame): void {
  if (f.y0 > GALLERY_TOP - 0.3) return
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const top = WALL_TOP + 0.12
  const len = 1.6
  const hw = 0.24
  const amp = 0.07 + 0.05 * busy(t)
  for (const [bx, a, b] of BANNERS) {
    if (bx + 1 < f.x0 || bx - 1 > f.x1) continue
    const sw = sway(t, bx, 4.6)
    const flutter = sway(t * 2.3, bx + 3, 1.7)
    // Each band of the banner, from s0 to s1 down its length: its left edge down, its right edge back up.
    const at = (s: number, side: number): Pt => {
      const dx = amp * s * s * sw
      const w = hw * (1 - 0.1 * s * Math.abs(flutter))
      return [bx + dx + side * w, top + len * s]
    }
    const band = (s0: number, s1: number, col: string, tail: boolean) => {
      ctx.beginPath()
      const n = 4
      for (let i = 0; i <= n; i++) {
        const p = at(s0 + ((s1 - s0) * i) / n, -1)
        if (i) ctx.lineTo(p[0] * k, p[1] * k)
        else ctx.moveTo(p[0] * k, p[1] * k)
      }
      if (tail) {
        // The swallowtail.
        const m = at(s1 - 0.11, 0)
        ctx.lineTo(m[0] * k, m[1] * k)
      }
      for (let i = n; i >= 0; i--) {
        const p = at(s0 + ((s1 - s0) * i) / n, 1)
        ctx.lineTo(p[0] * k, p[1] * k)
      }
      ctx.closePath()
      ctx.fillStyle = rgba(pen, col, 1)
      ctx.fill()
    }
    band(0, 0.4, a, false)
    band(0.4, 0.55, b, false)
    band(0.55, 1, a, true)
    line(pen, [bx - hw - 0.06, top], [bx + hw + 0.06, top], C.ironHi, 1.4)
  }
}

/** The bunting strung along the front of the gallery from hook to hook, sagging, its pennants fluttering. */
const HOOK0 = -5.2
const HOOK_GAP = 3.94
const SAG = 0.5
const PENNANTS = [C.pennantRed, C.pennantCream, C.pennantNavy, C.pennantCream, C.pennantGreen, C.pennantCream]
export function bunting(pen: Pen, t: number, f: Frame): void {
  if (f.y0 > GALLERY_TOP + SAG + 0.35) return
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const y0 = GALLERY_TOP + 0.02
  const j0 = Math.floor((f.x0 - HOOK0) / HOOK_GAP) - 1
  const j1 = Math.ceil((f.x1 - HOOK0) / HOOK_GAP)
  const gust = 0.6 + 0.4 * busy(t)
  // The strings.
  ctx.save()
  ctx.strokeStyle = rgba(pen, C.ironHi, 1)
  ctx.lineWidth = pen.w * 0.45
  ctx.beginPath()
  const stringAt = (j: number, s: number): Pt => {
    const xa = HOOK0 + j * HOOK_GAP
    const sw = 0.05 * gust * sway(t, j * 1.7, 3.8)
    return [xa + HOOK_GAP * s + sw * Math.sin(Math.PI * s), y0 + SAG * 4 * s * (1 - s) * (1 + 0.06 * sway(t, j + 0.4, 3.1))]
  }
  for (let j = j0; j <= j1; j++) {
    for (let i = 0; i <= 12; i++) {
      const p = stringAt(j, i / 12)
      if (i) ctx.lineTo(p[0] * k, p[1] * k)
      else ctx.moveTo(p[0] * k, p[1] * k)
    }
  }
  ctx.stroke()
  // The pennants, one fill a colour.
  for (let c = 0; c < 4; c++) {
    const col = [C.pennantRed, C.pennantCream, C.pennantNavy, C.pennantGreen][c]
    ctx.beginPath()
    for (let j = j0; j <= j1; j++) {
      for (let i = 1; i < 11; i++) {
        const pc = PENNANTS[(i + j * 3 + 600) % PENNANTS.length]
        if (pc !== col) continue
        const s = i / 11
        const a = stringAt(j, s - 0.022)
        const b = stringAt(j, s + 0.022)
        const m: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
        const tilt = 0.22 * gust * sway(t * 1.6, i * 2.3 + j, 2.2)
        const tip: Pt = [m[0] + Math.sin(tilt) * 0.27, m[1] + Math.cos(tilt) * 0.27]
        ctx.moveTo(a[0] * k, a[1] * k)
        ctx.lineTo(b[0] * k, b[1] * k)
        ctx.lineTo(tip[0] * k, tip[1] * k)
        ctx.closePath()
      }
    }
    ctx.fillStyle = rgba(pen, col, 0.92)
    ctx.fill()
  }
  ctx.restore()
}

/**
 * The tournament's board, hung on its chains from the eaves over the wall between two windows: a row a match (the two
 * semifinals, the final, the doubles), each a pair of flip cards in pips. The semifinal's turns as the umpire's does,
 * and the final's; the other rows turn on their own as their matches go on elsewhere.
 */
const BOARD_X = 8.7
const BOARD_Y0 = -5.95
const BOARD_Y1 = -4.55
type Row = { flips: [number, 0 | 1, number][]; start: [number, number] }
const ROWS: Row[] = [
  // The semifinal: Marty levels at two all before the cut, and takes it on the umpire's card.
  { start: [2, 2], flips: [[FLIP_A + 0.6, 0, 3]] },
  // The other semifinal, Endo's, long done.
  { start: [0, 3], flips: [] },
  // The final: a game down, levelled, lost.
  { start: [0, 0], flips: [[at(32, 4), 0, 1], [at(33, 1), 1, 2], [FLIP_M + 0.5, 0, 2], [FLIP_B + 0.6, 1, 3]] },
  // The doubles, going on in the far hall.
  { start: [1, 0], flips: [[T0 + 4.1, 1, 1], [T0 + 9.6, 0, 2], [T0 + 15.2, 1, 2], [WINNER - 2.2, 0, 3]] },
]
function cardOf(row: Row, side: 0 | 1, t: number): { n: number; was: number; since: number } {
  let n = row.start[side]
  let was = n
  let since = Infinity
  for (const [ft, s, v] of row.flips) {
    if (s !== side || t < ft) continue
    was = n
    n = v
    since = t - ft
  }
  return { n, was, since }
}
export function scoreboard(pen: Pen, t: number, f: Frame): void {
  if (f.y0 > BOARD_Y1 || BOARD_X + 1.3 < f.x0 || BOARD_X - 1.3 > f.x1) return
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const x0 = BOARD_X - 1.1
  const x1 = BOARD_X + 1.1
  line(pen, [x0 + 0.2, WALL_TOP], [x0 + 0.2, BOARD_Y0], C.ironHi, 0.8)
  line(pen, [x1 - 0.2, WALL_TOP], [x1 - 0.2, BOARD_Y0], C.ironHi, 0.8)
  rect(pen, x0 - 0.06, BOARD_Y0 - 0.06, x1 + 0.06, BOARD_Y1 + 0.06, C.boardFrame)
  rect(pen, x0, BOARD_Y0, x1, BOARD_Y1, C.board)
  const rowH = (BOARD_Y1 - BOARD_Y0) / ROWS.length
  const box = (a: number, b: number, c: number, d: number) => ctx.rect(a * k, b * k, (c - a) * k, (d - b) * k)
  const W = 0.17
  const H = 0.13
  // The rows' numbers, in brass studs; the cards; the pips on them; the fold of a card turning.
  ctx.save()
  ctx.fillStyle = rgba(pen, C.brass, 1)
  ctx.beginPath()
  ROWS.forEach((_, r) => {
    const y = BOARD_Y0 + rowH * (r + 0.5)
    for (let i = 0; i <= r; i++) box(x0 + 0.16 + i * 0.09, y - 0.03, x0 + 0.21 + i * 0.09, y + 0.03)
  })
  ctx.fill()
  ctx.fillStyle = rgba(pen, mix(C.board, C.card, 0.72), 1)
  ctx.beginPath()
  ROWS.forEach((_, r) => {
    const y = BOARD_Y0 + rowH * (r + 0.5)
    for (const side of [0, 1]) box(x0 + 1.15 + side * 0.5 - W, y - H, x0 + 1.15 + side * 0.5 + W, y + H)
  })
  ctx.fill()
  const folds: Pt[] = []
  ctx.fillStyle = rgba(pen, C.cardInk, 1)
  ctx.beginPath()
  ROWS.forEach((row, r) => {
    const y = BOARD_Y0 + rowH * (r + 0.5)
    for (const side of [0, 1] as const) {
      const cx = x0 + 1.15 + side * 0.5
      const c = cardOf(row, side, t)
      // While it turns, the new leaf comes down over the old: its pips once the fold is past them.
      const folding = c.since >= 0 && c.since < 0.22
      const yl = y - H + 2 * H * ease(c.since / 0.22)
      const v = folding && yl < y ? c.was : c.n
      for (let i = 0; i < v; i++) {
        const px = cx + (i - (v - 1) / 2) * 0.09
        box(px - 0.022, y - 0.022, px + 0.022, y + 0.022)
      }
      if (folding) folds.push([cx, yl])
    }
  })
  ctx.fill()
  if (folds.length) {
    ctx.fillStyle = rgba(pen, '#8C8A84', 1)
    ctx.beginPath()
    for (const [cx, yl] of folds) box(cx - W, yl - 0.012, cx + W, yl + 0.012)
    ctx.fill()
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ the daylight */

/** How bright the day is through the roof: the clouds going over the sun; greyer once the last point is lost. */
const sun = (t: number, seed: number): number => (0.5 + 0.5 * Math.max(0, Math.sin((t * TAU) / (10 + 4 * hash(seed, 1, 5)) + 7 * hash(seed, 2, 5)))) * (1 - 0.6 * hush(t))
const SHAFT_TOP = -7.2
const SHAFT_BOT = 0.7
const SLANT = 0.3
const SHAFT_PITCH = 4.6
const shaftW = (n: number) => 0.7 + 0.8 * hash(n, 3, 5)
/** Whether the roof lets a shaft down at `n`: only here and there, where a pane is clean and the sun finds it. */
const shafted = (n: number) => hash(n, 4, 5) < 0.5

/**
 * The cold daylight down from the roof in a few long slanting shafts through the hall's haze (a little behind the
 * play, d 0.85), faint, laid over the hall rather than added to it, each brightening and dimming as the clouds go
 * over, with a little dust turning in them.
 */
export function daylight(pen: Pen, t: number, f: Frame): void {
  if (f.y1 < SHAFT_TOP || f.y0 > SHAFT_BOT) return
  const { k } = pen
  const ctx = ctxOf(pen.p)
  layer(
    pen,
    f,
    0.85,
    (g) => {
      const grad = ctx.createLinearGradient(0, SHAFT_TOP * k, 0, SHAFT_BOT * k)
      grad.addColorStop(0, rgba(pen, C.day, 0.06))
      grad.addColorStop(0.5, rgba(pen, C.day, 0.025))
      grad.addColorStop(1, rgba(pen, C.day, 0))
      ctx.save()
      ctx.fillStyle = grad
      const dx = SLANT * (SHAFT_BOT - SHAFT_TOP)
      for (let n = Math.floor((g.x0 - dx - 2) / SHAFT_PITCH); n * SHAFT_PITCH <= g.x1 + 1; n++) {
        const x = n * SHAFT_PITCH + 0.8
        if (!shafted(n)) continue
        const w = shaftW(n)
        const a = sun(t, n)
        if (a < 0.03) continue
        ctx.globalAlpha = a
        ctx.beginPath()
        ctx.moveTo(x * k, SHAFT_TOP * k)
        ctx.lineTo((x + w) * k, SHAFT_TOP * k)
        ctx.lineTo((x + w + dx) * k, SHAFT_BOT * k)
        ctx.lineTo((x + dx) * k, SHAFT_BOT * k)
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()
      // A little dust in them, fine and steady.
      motes(pen, t, {
        n: 120,
        seed: 61,
        box: [-12, -6.6, 26, 0.6],
        size: [0.008, 0.018],
        color: C.day,
        alpha: 0.3,
        drift: [0.05, -0.02],
        wander: 0.2,
        twinkle: 0,
        light: (x, y) => {
          if (x < g.x0 || x > g.x1 || y < g.y0 || y > g.y1) return 0
          const s = x - SLANT * (y - SHAFT_TOP)
          const n = Math.floor((s - 0.8) / SHAFT_PITCH)
          const u = (s - 0.8 - n * SHAFT_PITCH) / shaftW(n)
          if (u < 0 || u > 1 || !shafted(n)) return 0
          return Math.sin(Math.PI * u) * sun(t, n) * (1 - smooth(y, -2, SHAFT_BOT))
        },
      })
    },
    ANCHOR,
  )
}

/* ------------------------------------------------------------------ pigeons */

/**
 * Pigeons that have got in under the roof, crossing the hall now and then (a little behind the play): one along the
 * top of the stand early in the semifinal, a few in front of the windows, a flock off the trusses as the hall is seen
 * whole, more through the final. And one on the far lamp over the final's table, which goes up at Marty's winner.
 */
interface Flight {
  t: number
  dur: number
  x0: number
  x1: number
  y: number
  n: number
}
const FLIGHTS: Flight[] = [
  { t: 55.0, dur: 5.2, x0: -6, x1: 9, y: -3.25, n: 1 },
  { t: 61.1, dur: 5.5, x0: 11, x1: -6, y: -4.85, n: 3 },
  { t: 67.5, dur: 6.0, x0: -5, x1: 20, y: -6.0, n: 4 },
  { t: 74.6, dur: 4.6, x0: 19, x1: 6, y: -3.3, n: 1 },
  { t: 77.6, dur: 5.0, x0: 6, x1: 20, y: -3.55, n: 2 },
  { t: 80.5, dur: 5.0, x0: 21, x1: 4, y: -4.6, n: 3 },
  { t: 83.0, dur: 4.4, x0: 4, x1: 20, y: -3.4, n: 2 },
]
/** When the pigeon on the final's far lamp goes up. */
const PERCH_OFF = WINNER + 0.12

/** One pigeon, side on, flying toward `dir`: its body, head and tail one shape; its wings, up or down, another. */
function pigeon(ctx: CanvasRenderingContext2D, k: number, p: Pt, dir: number, flap: number, sc: number, body: boolean): void {
  const [x, y] = p
  if (body) {
    ctx.moveTo((x + 0.17 * sc * dir) * k, y * k)
    ctx.ellipse(x * k, y * k, 0.17 * sc * k, 0.065 * sc * k, 0, 0, TAU)
    ctx.moveTo((x + 0.24 * sc * dir) * k, (y - 0.03 * sc) * k)
    ctx.arc((x + 0.18 * sc * dir) * k, (y - 0.03 * sc) * k, 0.055 * sc * k, 0, TAU)
    ctx.moveTo((x - 0.12 * sc * dir) * k, (y - 0.02 * sc) * k)
    ctx.lineTo((x - 0.3 * sc * dir) * k, (y - 0.04 * sc) * k)
    ctx.lineTo((x - 0.3 * sc * dir) * k, (y + 0.05 * sc) * k)
    ctx.lineTo((x - 0.12 * sc * dir) * k, (y + 0.03 * sc) * k)
    ctx.closePath()
    return
  }
  // The wing: from the shoulder out and up (flap 1) or down (-1), a long swept triangle.
  const tipY = y - 0.34 * sc * flap
  ctx.moveTo((x + 0.09 * sc * dir) * k, (y - 0.01 * sc) * k)
  ctx.lineTo((x - 0.02 * sc * dir) * k, (y - 0.2 * sc * flap) * k)
  ctx.lineTo((x - 0.12 * sc * dir) * k, tipY * k)
  ctx.lineTo((x - 0.2 * sc * dir) * k, (tipY + 0.06 * sc * flap) * k)
  ctx.lineTo((x - 0.09 * sc * dir) * k, (y + 0.02 * sc) * k)
  ctx.closePath()
}

export function pigeons(pen: Pen, t: number, f: Frame): void {
  live.length = 0
  for (const fl of FLIGHTS) {
    const u0 = (t - fl.t) / fl.dur
    if (u0 < -0.2 || u0 > 1.3) continue
    const dir = fl.x1 > fl.x0 ? 1 : -1
    for (let i = 0; i < fl.n; i++) {
      const u = u0 - i * 0.05 * (0.7 + 0.6 * hash(i, fl.t | 0, 3))
      if (u < 0 || u > 1) continue
      const tt = t + i * 0.37
      const x = fl.x0 + (fl.x1 - fl.x0) * u
      const y = fl.y + (hash(i, fl.t | 0, 4) - 0.5) * 0.5 - 0.35 * Math.sin(Math.PI * u) + 0.03 * Math.sin(tt * 14)
      // Flap in bursts, glide between.
      const flap = Math.sin(tt * 1.9 + i) > 0.35 ? 0.15 : Math.sin(tt * TAU * 6.5)
      live.push({ p: [x, y], dir, flap })
    }
  }
  if (!live.length) return
  layer(
    pen,
    f,
    0.85,
    (g) => {
      const vis = live.filter(({ p }) => p[0] > g.x0 - 0.5 && p[0] < g.x1 + 0.5 && p[1] > g.y0 - 0.5 && p[1] < g.y1 + 0.5)
      if (vis.length) flock(pen, vis, 0.85)
    },
    ANCHOR,
  )
}

/** Pigeons in flight this frame (reused). */
const live: Bird[] = []
interface Bird {
  p: Pt
  dir: number
  flap: number
}
/** Birds drawn together: every wing in one fill, every body in another. */
function flock(pen: Pen, birds: Bird[], sc: number): void {
  const { k } = pen
  const ctx = ctxOf(pen.p)
  ctx.save()
  ctx.beginPath()
  for (const b of birds) pigeon(ctx, k, b.p, b.dir, b.flap, sc, false)
  ctx.fillStyle = rgba(pen, C.pigeonDark, 1)
  ctx.fill()
  ctx.beginPath()
  for (const b of birds) pigeon(ctx, k, b.p, b.dir, b.flap, sc, true)
  ctx.fillStyle = rgba(pen, C.pigeon, 1)
  ctx.fill()
  ctx.restore()
}

/**
 * The pigeon on the far lamp over the final's table (drawn with the lamp, at `top` on its shade, so it sways with it):
 * settled, its head bobbing now and then; up and away over the gallery when the house goes up for Marty's winner.
 */
export function lampPigeon(pen: Pen, t: number, top: Pt): void {
  const off = t - PERCH_OFF
  if (off > 2.6) return
  const bob = Math.sin(t * 1.3) > 0.6 ? 0.012 * Math.max(0, Math.sin(t * 11)) : 0
  const p: Pt = off < 0 ? [top[0] - 0.08, top[1] - 0.07 + bob] : [top[0] - 0.08 + 2.4 * off, top[1] - 0.07 - 1.5 * off + 0.12 * off * off]
  flock(pen, [{ p, dir: 1, flap: off < 0 ? -0.2 : Math.sin(t * TAU * 7) }], 0.8)
}
