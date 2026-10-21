import { R } from '../../../../../../parts'
import { beat, M } from '../../music'
import { clamp01, mix, pulse, smooth, smoother, type Brush, type Pt } from '../../paint'
import { paintBody, SKIN } from '../../world/worm'

/**
 * The worm he rides: one body, and everything that rides on it reads it from here, so Paul is always where the seam is
 * and the seam is always where it is drawn.
 *
 * It comes from the west under the sand, a swell at first, and breaks the surface at the dune. Its exposed back has a
 * fixed shape behind the head, a long low arch (the head plowing, the back highest some ten cells behind it, the tail
 * going under again), so the body moves with the head and a seam on it stays put on it: the one the hooks go into is
 * HOOK_S cells behind the head. Its speed is steady, and a surge on the run's hardest beat sends it faster and higher.
 */

/** When the hooks bite, the thumper is swallowed, and the run's hardest beat. */
export const LEAP = beat('run', 9)
export const BITE = beat('run', 10)
export const SWALLOW = beat('run', 11)
export const OPEN = beat('run', 14)
export const SURGE = beat('run', 25)

/** The tube's radius, cells: about 45 m through. */
export const RAD = 3.2
/** Where the hooks go in: this far behind the head, on a seam (the body's rings are every RING cells from TRAVEL). */
export const HOOK_S = 8
const RING = 2.2
const TRAVEL = HOOK_S + RING * 10
/** The dune he waits on, its crest; the worm's body passes it on the leap. */
export const CREST: Pt = [1042, -6]
/** The thumper, where the head swallows it. */
export const THUMPER_X = 1057.1

const V0 = 6
const V1 = 7.6
const SURGE_LEN = 1.6
/** How far the head has gone at `t` (cells, from its place on the leap). */
function travelled(t: number): number {
  const base = V0 * (t - LEAP)
  if (t <= SURGE) return base
  const u = Math.min(1, (t - SURGE) / SURGE_LEN)
  const extra = (V1 - V0) * SURGE_LEN * (u * u * u - (u * u * u * u) / 2)
  return base + extra + (t > SURGE + SURGE_LEN ? (V1 - V0) * (t - SURGE - SURGE_LEN) : 0)
}

/** The head's x: on the leap the hooked seam is at the crest. */
export function headX(t: number): number {
  return CREST[0] + HOOK_S + travelled(t)
}

/** The worm's speed at `t`, cells a second. */
export const speed = (t: number): number => V0 + (V1 - V0) * smooth(t, SURGE, SURGE + SURGE_LEN)

/** How far out of the sand it has come, 0 (a swell under the surface) to 1 (its back in the air). */
export const emerged = (t: number): number => smoother(t, 128.6, 133.2)

/** The back's line behind the head when it is out: the spine's height at `s` cells behind the head. */
function profile(s: number): number {
  return -1.7 - 3.0 * smooth(s, 0, 9) + 8.4 * smooth(s, 15, 44)
}

/** The spine's height at `s` behind the head, at `t`: rising out of the sand, the surge's heave, a slow breathing bob. */
export function spineY(s: number, t: number): number {
  const sunk = (1 - emerged(t)) * (RAD + 4.2)
  const heave = -1.1 * pulse(t, SURGE, 0.35, 1.8) * smooth(s, 0, 4) * (1 - smooth(s, 26, 42))
  const bob = 0.16 * Math.sin((2 * Math.PI * t) / 2.7 - s / 5.5) * emerged(t)
  return profile(s) + sunk + heave + bob
}

/** The tube's radius at `s` behind the head (a little narrower at the head). */
export const radiusAt = (s: number): number => RAD * (0.8 + 0.2 * smooth(s, 0, 6))

export const LENGTH = 46

/** The spine at `t`, head first, every half cell. */
export function spineAt(t: number): { spine: Pt[]; radius: number[] } {
  const hx = headX(t)
  const spine: Pt[] = []
  const radius: number[] = []
  for (let s = 0; s <= LENGTH; s += 0.5) {
    spine.push([hx - s, spineY(s, t)])
    radius.push(radiusAt(s))
  }
  return { spine, radius }
}

/** The up-normal of the spine at `s` behind the head (pointing to the back). */
function normalAt(s: number, t: number): Pt {
  const hx = headX(t)
  const a: Pt = [hx - (s - 0.25), spineY(s - 0.25, t)]
  const b: Pt = [hx - (s + 0.25), spineY(s + 0.25, t)]
  const tx = b[0] - a[0]
  const ty = b[1] - a[1]
  const l = Math.hypot(tx, ty) || 1
  let n: Pt = [ty / l, -tx / l]
  if (n[1] > 0) n = [-n[0], -n[1]]
  return n
}

/** A point on the seam the hooks go into, `v` from its belly (-1) to its back (1), and `out` cells off the skin. */
export function onSeam(t: number, v: number, out = 0): Pt {
  const hx = headX(t)
  const y = spineY(HOOK_S, t)
  const n = normalAt(HOOK_S, t)
  const r = radiusAt(HOOK_S)
  const k = r * v + (v >= 0.999 ? out : 0)
  return [hx - HOOK_S + n[0] * k, y + n[1] * k]
}

/**
 * How far the worm has rolled, as the height `v` on the seam where the hooks are: they bite low on the flank, the worm
 * rolls its open side up and carries them high, and the surge throws them higher still.
 */
export function hookV(t: number): number {
  return 0.12 + 0.5 * smoother(t, OPEN, SURGE - 0.4) + 0.14 * smoother(t, SURGE, SURGE + 1.4)
}

/** How far the seam has opened, 0 to 1. */
export const opened = (t: number): number => smoother(t, BITE + 0.15, OPEN + 1.2)

/** The ridden worm: its body, the seam open where the hooks are, the sand it plows and pours. */
export function paintWorm(b: Brush, t: number, dark: number): void {
  const { ctx } = b
  const e = emerged(t)
  if (e <= 0.001) return
  const { spine, radius } = spineAt(t)
  ctx.save()
  // Only what is above the sand is drawn: the flat is y = 0, and what is under it is the sand's.
  ctx.beginPath()
  ctx.rect(b.view.x0 - 1, b.view.y0 - 50, b.view.w + 2, 50 - b.view.y0 + 0.02)
  ctx.clip()
  paintBody(b, { spine, radius, travel: TRAVEL })
  paintHead(b, t, spine[0], radius[0])
  if (dark > 0) {
    // The eclipse's dusk on the skin: drawn as a veil over the body, not as new colours.
    ctx.fillStyle = b.ca('#120B08', dark * 0.55)
    outline(ctx, spine, radius, t)
    ctx.fill()
  }
  paintSeam(b, t)
  ctx.restore()
}

function outline(ctx: CanvasRenderingContext2D, spine: Pt[], radius: number[], _t: number): void {
  const n = spine.length
  const top: Pt[] = []
  const bot: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = spine[Math.max(0, i - 1)]
    const c = spine[Math.min(n - 1, i + 1)]
    const tx = c[0] - a[0]
    const ty = c[1] - a[1]
    const l = Math.hypot(tx, ty) || 1
    let nx = ty / l
    let ny = -tx / l
    if (ny > 0) {
      nx = -nx
      ny = -ny
    }
    top.push([spine[i][0] + nx * radius[i], spine[i][1] + ny * radius[i]])
    bot.push([spine[i][0] - nx * radius[i], spine[i][1] - ny * radius[i]])
  }
  ctx.beginPath()
  ctx.moveTo(top[0][0], top[0][1])
  for (let i = 1; i < n; i++) ctx.lineTo(top[i][0], top[i][1])
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1])
  ctx.closePath()
}

/** The head: the blunt front of the tube, its mouth shut, a lip of plates round it, plowing. */
function paintHead(b: Brush, t: number, p: Pt, r: number): void {
  const { ctx } = b
  // The cap: a half round on the front of the tube, a little flattened, leaning forward.
  ctx.beginPath()
  ctx.ellipse(p[0], p[1], r * 0.62, r, 0, -Math.PI / 2, Math.PI / 2)
  ctx.fillStyle = b.c(SKIN.side)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(p[0], p[1], r * 0.62, r, 0, -Math.PI / 2, -Math.PI * 0.12)
  ctx.lineTo(p[0], p[1] - r * 0.35)
  ctx.closePath()
  ctx.fillStyle = b.c(SKIN.back)
  ctx.fill()
  // The shut mouth: the petals' seams, three lines from the lip to the tip.
  ctx.beginPath()
  for (const k of [-0.55, 0, 0.55]) {
    ctx.moveTo(p[0] + r * 0.05, p[1] + r * k)
    ctx.quadraticCurveTo(p[0] + r * 0.45, p[1] + r * k * 0.7, p[0] + r * 0.6, p[1] + r * k * 0.18)
  }
  ctx.strokeStyle = b.ca(SKIN.seam, 0.6)
  ctx.lineWidth = Math.max(1.25 * b.px, r * 0.03)
  ctx.stroke()
  void t
}

/** The seam the hooks are in: a dark line, and as the worm takes the hooks, the flesh showing pink in the opening. */
function paintSeam(b: Brush, t: number): void {
  if (t < BITE - 0.05) return
  const { ctx } = b
  const o = opened(t)
  const v = hookV(t)
  const a = Math.max(-0.95, v - 0.38)
  const c = Math.min(0.97, v + 0.3)
  const pts: Pt[] = []
  const m = 10
  for (let i = 0; i <= m; i++) pts.push(onSeam(t, a + ((c - a) * i) / m))
  const wide = 0.06 + 0.42 * o
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i <= m; i++) {
    const u = i / m
    const bulge = Math.sin(u * Math.PI) * wide
    ctx.lineTo(pts[i][0] + bulge * 0.5, pts[i][1])
  }
  for (let i = m; i >= 0; i--) {
    const u = i / m
    const bulge = Math.sin(u * Math.PI) * wide
    ctx.lineTo(pts[i][0] - bulge * 0.5, pts[i][1])
  }
  ctx.closePath()
  ctx.fillStyle = b.c(mix(SKIN.flesh, SKIN.seam, 0.15 * (1 - o)))
  ctx.fill()
}

/** Paul on the worm: where he is at `t` once he is on it (the hooks hold him; he climbs; he stands). */
export const CLIMB = [29, 31, 33, 35, 37, 39, 41].map((n) => beat('run', n))
export const STAND = beat('run', 50)

/** His height on the seam, as `v`: under the hook as it is carried up, then a step a beat up to the back. */
export function paulV(t: number): number {
  const hang = hookV(t) - 0.2
  if (t < CLIMB[0]) return hang
  // From where the hook left him to the top of the back, in even steps, each one a quick pull and a rest.
  const from = hookV(CLIMB[0]) - 0.2
  const steps = CLIMB.length
  let k = 0
  for (let i = 0; i < steps; i++) k += smooth(t, CLIMB[i], CLIMB[i] + 0.22)
  return from + (0.93 - from) * (k / steps)
}

/** Where Paul is on the worm at `t` (from the bite on). */
export function paulOnWorm(t: number): Pt {
  if (t < STAND - 0.05) {
    const [x, y] = onSeam(t, paulV(t))
    // He hangs off the seam's near face: a little forward of it, toward the head.
    return [x + 0.12, y]
  }
  // Standing: on the back's top line above the seam, risen onto it on the stand.
  const u = smooth(t, STAND - 0.05, STAND + 0.4)
  const [lx, ly] = onSeam(t, 0.93)
  const [tx, ty] = onSeam(t, 1, R)
  return [lx + 0.12 + (tx - lx - 0.12) * u, ly + (ty - ly) * u]
}

/** The hooks' staffs: from the seam, out toward Paul (their ropes in his hands); upright on the back once he stands. */
export function paintHooks(b: Brush, t: number, paul: Pt): void {
  if (t < BITE - 0.02) return
  const { ctx } = b
  const v = hookV(t)
  const stand = smooth(t, STAND, STAND + 0.6)
  for (const side of [-1, 1]) {
    const base = onSeam(t, Math.min(0.99, v + side * 0.07))
    const lean = side * 0.18
    // A staff of about two metres, leaning out of the seam; once he stands, pulled forward toward the head, so its rope
    // runs back from its head to his hands like a rein.
    const hang = Math.PI * 0.12 + lean
    const rein = -Math.PI * 0.2 + lean * 0.5
    const ang = hang + (rein - hang) * stand
    const len = 0.42 + 0.16 * stand
    const tip: Pt = [base[0] + Math.cos(ang) * len, base[1] + Math.sin(ang) * len]
    ctx.beginPath()
    ctx.moveTo(base[0], base[1])
    ctx.lineTo(tip[0], tip[1])
    ctx.strokeStyle = b.c('#2A1E16')
    ctx.lineWidth = Math.max(1.25 * b.px, 0.035)
    ctx.stroke()
    // The rope from the staff's head to his hands, taut.
    ctx.beginPath()
    ctx.moveTo(tip[0], tip[1])
    ctx.lineTo(paul[0] + side * 0.03, paul[1] - 0.02)
    ctx.strokeStyle = b.c('#2E2118')
    ctx.lineWidth = Math.max(1.25 * b.px, 0.022)
    ctx.stroke()
  }
}

/**
 * The sand the worm moves: before it breaks the surface, the swell over it (a long low mound running before it, its
 * west face in shade); as it rises and rides, the bow wave at the head and the sheets of sand pouring off its back, and
 * behind it the furrow it leaves.
 */
export function paintSand(b: Brush, t: number, sand: { lit: string; shade: string }): void {
  const { ctx, view } = b
  const hx = headX(t)
  const e = emerged(t)
  if (hx + 12 < view.x0 || hx - LENGTH - 80 > view.x1) return
  // The swell: from the worm sign on, a long low ridge of sand running before it, growing as it nears; gone into the
  // body as it breaks out. Its east face takes the sun, its long west back is in shade, a pale plume goes up off its
  // front, and a furrow trails behind it.
  const sw = smooth(t, 118.1, 119.4) * (1 + 0.45 * smooth(t, 121, 130)) * (1 - smooth(t, 131.5, 134))
  if (sw > 0.001) {
    const h = 2.6 * sw
    const crestS = 3
    const pts: Pt[] = []
    for (let s = -6; s <= 38; s += 0.75) {
      // A rounded front up to the crest, then a long back easing down into the furrow.
      const y = s < crestS ? -h * Math.sin((Math.PI / 2) * clamp01((s + 6) / (crestS + 6))) : -h * (1 - smooth(s, crestS, 38))
      pts.push([hx - s, y])
    }
    // The whole mound lit, then its long back in shade, from a line down from the crest.
    ctx.beginPath()
    ctx.moveTo(pts[0][0], 0.05)
    for (const p of pts) ctx.lineTo(p[0], p[1])
    ctx.lineTo(pts[pts.length - 1][0], 0.05)
    ctx.closePath()
    ctx.fillStyle = b.c(sand.lit)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(hx - crestS, -h)
    for (const p of pts) if (p[0] < hx - crestS) ctx.lineTo(p[0], p[1])
    ctx.lineTo(pts[pts.length - 1][0], 0.05)
    ctx.lineTo(hx - crestS - h * 1.2, 0.05)
    ctx.quadraticCurveTo(hx - crestS - h * 0.2, -h * 0.55, hx - crestS, -h)
    ctx.closePath()
    ctx.fillStyle = b.c(sand.shade)
    ctx.fill()
    // The plume off its front: sand thrown up as it comes, a soft pale fan leaning back over it.
    const gr = ctx.createLinearGradient(0, -h * 3.2, 0, -h * 0.6)
    gr.addColorStop(0, b.ca(sand.lit, 0))
    gr.addColorStop(1, b.ca(sand.lit, 0.62 * Math.min(1, sw)))
    ctx.fillStyle = gr
    ctx.beginPath()
    ctx.moveTo(hx + 1.5, -h * 0.4)
    ctx.quadraticCurveTo(hx + 0.5, -h * 2.6, hx - 6, -h * 3.2)
    ctx.quadraticCurveTo(hx - 2.5, -h * 1.6, hx - crestS - 2, -h * 0.85)
    ctx.closePath()
    ctx.fill()
    // The furrow behind it.
    const fur = ctx.createLinearGradient(hx - 30, 0, hx - 90, 0)
    fur.addColorStop(0, b.ca(sand.shade, 0.6 * sw))
    fur.addColorStop(1, b.ca(sand.shade, 0))
    ctx.fillStyle = fur
    ctx.beginPath()
    ctx.moveTo(hx - 30, -h * 0.25)
    ctx.quadraticCurveTo(hx - 60, -0.1, hx - 90, 0.02)
    ctx.lineTo(hx - 30, 0.05)
    ctx.closePath()
    ctx.fill()
  }
  if (e <= 0.001) return
  // The furrow behind it: a low dark trough trailing back, fading.
  const tail = hx - LENGTH + 4
  const len = Math.min(140, Math.max(0, (t - 130) * speed(t) * 0.9))
  if (len > 1) {
    const gr = ctx.createLinearGradient(tail, 0, tail - len, 0)
    gr.addColorStop(0, b.ca(sand.shade, 0.75 * e))
    gr.addColorStop(1, b.ca(sand.shade, 0))
    ctx.fillStyle = gr
    ctx.beginPath()
    ctx.moveTo(tail, -0.35)
    ctx.quadraticCurveTo(tail - len * 0.5, -0.12, tail - len, 0.02)
    ctx.lineTo(tail, 0.05)
    ctx.closePath()
    ctx.fill()
  }
  // The sand banked up along the body where it comes out of the ground, a lip the length of it.
  ctx.beginPath()
  ctx.moveTo(hx + 3.2, 0.05)
  ctx.quadraticCurveTo(hx + 1.6, -1.5 * e, hx - 1.5, -1.25 * e)
  ctx.quadraticCurveTo(hx - 20, -0.55 * e, hx - LENGTH + 2, -0.7 * e)
  ctx.lineTo(hx - LENGTH - 2, 0.05)
  ctx.closePath()
  ctx.fillStyle = b.c(sand.lit)
  ctx.fill()
}

/**
 * The sand coming off it: sheets pouring down its flank from the back as it rises (heavy) and as it rides (light),
 * each a long pale tongue that falls and thins; and at the head, the spray it throws up, two or three big soft shapes.
 */
export function paintPour(b: Brush, t: number, sand: { lit: string; air: string }): void {
  const { ctx } = b
  const e = emerged(t)
  if (e <= 0.001) return
  const hx = headX(t)
  // It comes up out of the dune coated in sand, and the coat slides down its flanks and off as it rises, the grey skin
  // showing from the back down: a sheet whose lower edge hangs in tongues, falling and thinning.
  const coat = 1 - smooth(t, 130.4, 136.2)
  if (coat > 0.005) {
    const slide = 1 - coat
    const top: Pt[] = []
    const low: Pt[] = []
    for (let s = 0; s <= 40; s += 1) {
      const r = radiusAt(s)
      const y = spineY(s, t)
      top.push([hx - s, y - r * 1.03])
      const v = 0.45 - 1.6 * slide + 0.16 * Math.sin(s * 0.85 + 1.3) + 0.08 * Math.sin(s * 2.3)
      low.push([hx - s, y - r * Math.max(-1.05, Math.min(1.0, v))])
    }
    ctx.beginPath()
    ctx.moveTo(top[0][0], top[0][1])
    for (const p of top) ctx.lineTo(p[0], p[1])
    for (let i = low.length - 1; i >= 0; i--) ctx.lineTo(low[i][0], low[i][1])
    ctx.closePath()
    ctx.fillStyle = b.ca(sand.lit, Math.min(1, coat * 1.4))
    ctx.fill()
  }
  // On the surge it heaves up out of the sand and throws a fringe of it off its back.
  const thrown = pulse(t, SURGE, 0.3, 1.1)
  if (thrown > 0.01) {
    ctx.beginPath()
    for (let s = 2; s <= 32; s += 1) {
      const y = spineY(s, t) - radiusAt(s) * 0.98 - 1.1 * thrown * Math.sin((Math.PI * (s - 2)) / 30)
      if (s === 2) ctx.moveTo(hx - s - 0.6 * thrown, y)
      else ctx.lineTo(hx - s - 0.6 * thrown, y)
    }
    for (let s = 32; s >= 2; s -= 1) ctx.lineTo(hx - s, spineY(s, t) - radiusAt(s) * 0.9)
    ctx.closePath()
    const gr = ctx.createLinearGradient(0, spineY(12, t) - radiusAt(12) - 1.2, 0, spineY(12, t) - radiusAt(12) * 0.9)
    gr.addColorStop(0, b.ca(sand.lit, 0))
    gr.addColorStop(1, b.ca(sand.lit, 0.65 * thrown))
    ctx.fillStyle = gr
    ctx.fill()
  }
  // The bow wave: the sand the head pushes before it, banked up its front and curling back over it.
  const r0 = radiusAt(0)
  const y0 = spineY(0, t)
  const heap = 0.8 + 0.25 * Math.sin(t * 2.1)
  ctx.fillStyle = b.c(sand.lit)
  ctx.beginPath()
  ctx.moveTo(hx - 1, 0.05)
  ctx.quadraticCurveTo(hx + r0 * 0.7, y0 + r0 * 0.55, hx + r0 * 0.9 + heap, -0.25)
  ctx.quadraticCurveTo(hx + r0 * 1.4 + heap, -0.05, hx + r0 * 2.2 + heap, 0.05)
  ctx.closePath()
  ctx.fill()
  const gr = ctx.createLinearGradient(0, y0 - r0 * 1.2, 0, 0)
  gr.addColorStop(0, b.ca(mix(sand.lit, sand.air, 0.4), 0))
  gr.addColorStop(0.5, b.ca(mix(sand.lit, sand.air, 0.3), 0.38 * e))
  gr.addColorStop(1, b.ca(sand.lit, 0.55 * e))
  ctx.fillStyle = gr
  ctx.beginPath()
  ctx.moveTo(hx + r0 * 1.9 + heap, 0.05)
  ctx.quadraticCurveTo(hx + r0 * 1.2, y0 - r0 * 0.9, hx - r0 * 0.4, y0 - r0 * 1.15)
  ctx.quadraticCurveTo(hx + r0 * 0.3, y0 - r0 * 0.5, hx + r0 * 0.6, y0 + r0 * 0.4)
  ctx.closePath()
  ctx.fill()
}

/** For the scene: the land's dusk under the eclipse, 0 (day) to 1 (the sun gone). */
export const duskAt = (t: number): number => smooth(t, M.fall + 3, M.silence)
