import { R } from '../../../../../../parts'
import { beatsIn, M } from '../../music'
import { circle, clamp01, composed, ellipse, mix, poly, smooth, type Brush, type Pt } from '../../paint'
import { T } from '../../timeline'
import type { Far } from '../../world/land'
import { depthScale, farDesert, frameH, horizonOf, SAND } from '../../world/land'
import { paintRange } from '../../world/dunes'
import { paintSky, skyOf, type SkyKey } from '../../world/sky'
import { CREST, LEAP, SWALLOW, THUMPER_X } from './worm'

/**
 * The place of the ride: another day, further out. A mesa of dark rock stands over the open sand, and the Fremen watch
 * from its top; west of it a dune, the one he waits on; between the two, on the flat, the thumper. Everything stands on
 * the flat at y = 0, and the light is from the east, the right, where the sun goes down at the end.
 */

/** The mesa, west flank first: the ridge he comes down, its flat top, its east face. */
export const MESA: Pt[] = [
  [1059.6, 0.3], [1061.2, -0.9], [1062.6, -2.4], [1064.2, -4.3], [1065.6, -6.6], [1066.8, -8.6], [1067.9, -10.9],
  [1069.2, -12.6], [1071.0, -13.2], [1076, -13.45], [1083, -13.6], [1090, -13.5], [1096.5, -13.3], [1099.4, -12.5],
  [1101.0, -10.2], [1102.6, -7.4], [1104.8, -4.2], [1107.4, -1.6], [1110.5, 0.3],
]
/** The mesa's top, where the Fremen stand: its surface y at x (between 1071 and 1096.5). */
export function mesaTop(x: number): number {
  for (let i = 9; i < 14; i++) {
    const [ax, ay] = MESA[i - 1]
    const [bx, by] = MESA[i]
    if (x >= ax && x <= bx) return ay + ((by - ay) * (x - ax)) / (bx - ax)
  }
  return -13.4
}
/** The way down the west ridge, for Paul: points on the rock, a ball's radius out. */
export const RIDGE: Pt[] = [
  [1066.55, -7.7], [1065.45, -6.75], [1064.05, -4.45], [1062.45, -2.55], [1061.05, -1.05], [1059.9, -0.13],
]

/** The dune he waits on: crest at CREST, its slip face west, its long back east to the thumper. */
const FACE = 8.4
const BACK = 13.2
/** How much of the dune is left: all of it until he leaps, then it slumps into the worm's wake. */
export const duneLeft = (t: number): number => 1 - smooth(t, LEAP - 0.1, LEAP + 1.9)
export function duneY(x: number, t = 0): number {
  const h = -CREST[1] * duneLeft(t)
  const d = x - CREST[0]
  if (d >= 0) {
    if (d >= BACK) return 0
    const u = 1 - d / BACK
    return -h * u * u * (1.55 - 0.55 * u)
  }
  if (-d >= FACE) return 0
  const u = 1 + d / FACE
  return -h * (u > 0.1 ? u : 0.1 * Math.pow(u / 0.1, 2) * 0.5 + u * 0.5)
}

/** When the thumper beats: every beat of the drive from its planting, and of the run until the worm takes it. */
export const PLANT = beatsIn('drive', 110.4, 110.6)[0].t
export const THUMPS: number[] = [...beatsIn('drive', PLANT, 128), ...beatsIn('run', 127.9, SWALLOW - 0.3)].map((b) => b.t)

/** The day's sky, then the late light, then the eclipse, over the ride. */
export const SKY: SkyKey[] = [
  // By day the sun is high, over the frame: its light is on the sand and in the shade under the crests.
  { t: T.thumper, top: '#CDB79B', low: '#F0D6B2', sun: { x: 0.8, y: -0.3, r: 0.028, color: '#FFF2DC' }, eclipse: 0 },
  { t: 158, top: '#C9AC8B', low: '#EFCDA0', sun: { x: 0.74, y: -0.3, r: 0.04, color: '#FFEBC9' }, eclipse: 0 },
  // As the camera draws back from him and turns ahead, it comes into the frame from the east, low, and the moon comes
  // over it.
  { t: M.fall, top: '#B88E6A', low: '#EDB880', sun: { x: 1.14, y: 0.4, r: 0.05, color: '#FFE2B8' }, eclipse: 0 },
  { t: 170.5, top: '#A67A58', low: '#E8A870', sun: { x: 0.56, y: 0.35, r: 0.05, color: '#FFDDB0' }, eclipse: 0.03 },
  { t: 176.5, top: '#24160F', low: '#6A4630', sun: { x: 0.505, y: 0.335, r: 0.05, color: '#FFE6C4' }, eclipse: 1 },
  { t: T.arena, top: '#140D09', low: '#3C2A1F', sun: { x: 0.5, y: 0.34, r: 0.05, color: '#FFEAD0' }, eclipse: 1 },
]

/** The light going under the eclipse, 0 (day) to 1 (the sun gone): the land darkens with the sky. */
export const dusk = (t: number): number => smooth(t, 169.5, 176.5)

const DARK = '#1C120D'
const FAR = farDesert(40)

/** The far ranges at `t`, gone toward the dark as the moon covers the sun. */
function farAt(t: number): Far[] {
  const d = dusk(t) * 0.8
  if (d <= 0.001) return FAR
  return FAR.map((r) => ({
    ...r,
    look: { lit: mix(r.look.lit, DARK, d), shade: mix(r.look.shade, DARK, d * 0.9), air: mix(r.look.air ?? SAND.air, '#5A3A28', d), pale: r.look.pale },
  }))
}

/** The sand's colours at `t`, darkened under the eclipse. */
export function sandAt(t: number): { lit: string; shade: string; air: string } {
  const d = dusk(t) * 0.82
  return { lit: mix(SAND.lit, DARK, d), shade: mix(SAND.shade, DARK, d * 0.9), air: mix(SAND.air, '#5A3A28', d) }
}

/** The sky and the far desert, the horizon at the eye (`tilt`). */
export function paintBack(b: Brush, tilt: number): void {
  const hy = horizonOf(b.view, tilt)
  const sky = skyOf(SKY, b.t)
  // The sky without its sun, which is drawn here: the moon is only seen where it is over the sun.
  paintSky(b, { ...sky, sun: { ...sky.sun, r: 0 }, eclipse: 0 }, hy)
  paintEclipse(b, sky)
  for (const r of farAt(b.t)) paintRange(b, r.range, depthScale(frameH(b.view), r.d), hy, r.look)
}

/**
 * The sun as a flat disc, and the moon coming over it from the west: dark against the sun and nowhere else (against a
 * daylit sky the moon is not seen), until only a thin rim of the sun is left round it.
 */
function paintEclipse(b: Brush, s: SkyKey): void {
  const { ctx, view } = b
  // Shares of the composed 16:9 frame (where the stage puts it in a frame of another shape), so the black sun is where
  // Giedi Prime's will be on a phone held upright as on a wide screen.
  const f = composed(view)
  const r = s.sun.r * f.h
  const x = f.cx + (s.sun.x - 0.5) * f.h * (16 / 9)
  const y = f.cy + (s.sun.y - 0.5) * f.h
  if (x + r < view.x0 || x - r > view.x1 || y + r < view.y0 || y - r > view.y1) return
  ctx.fillStyle = b.c(s.sun.color)
  circle(ctx, x, y, r)
  ctx.fill()
  const e = clamp01(s.eclipse)
  if (e <= 0.001) return
  ctx.save()
  circle(ctx, x, y, r)
  ctx.clip()
  ctx.fillStyle = b.c('#0B0907')
  circle(ctx, x - (1 - e) * r * 2.05, y, r * 0.965)
  ctx.fill()
  ctx.restore()
}

/** The flat the action stands on, to the frame's foot. */
export function paintFlat(b: Brush): void {
  const { ctx, view } = b
  ctx.fillStyle = b.c(sandAt(b.t).lit)
  ctx.fillRect(view.x0 - 1, 0, view.w + 2, Math.max(0, view.y1) + 1)
}

/** The mesa: its dark body, its lit top and east shoulder, a band of paler stone across its face. */
export function paintMesa(b: Brush): void {
  const { ctx, view } = b
  if (view.x1 < 1055 || view.x0 > 1115 || view.y1 < -16) return
  const d = dusk(b.t) * 0.7
  poly(ctx, MESA)
  ctx.fillStyle = b.c(mix('#55372A', DARK, d))
  ctx.fill()
  poly(ctx, [[1069.2, -12.6], [1071.0, -13.2], [1076, -13.45], [1083, -13.6], [1090, -13.5], [1096.5, -13.3], [1099.4, -12.5], [1096, -12.4], [1088, -12.75], [1078, -12.6], [1071.5, -12.2]])
  ctx.fillStyle = b.c(mix('#83573A', DARK, d))
  ctx.fill()
  poly(ctx, [[1099.4, -12.5], [1101.0, -10.2], [1102.6, -7.4], [1104.8, -4.2], [1107.4, -1.6], [1110.5, 0.3], [1106.5, 0.3], [1103.4, -3.3], [1101.2, -7.0], [1099.8, -10.0], [1098.2, -12.3]])
  ctx.fillStyle = b.c(mix('#704630', DARK, d))
  ctx.fill()
  // A pale stratum across the face, broken where the west ridge falls away.
  poly(ctx, [[1066.4, -7.6], [1073, -7.9], [1084, -8.2], [1095, -8.0], [1101.9, -8.5], [1102.3, -7.9], [1095, -7.45], [1084, -7.6], [1073, -7.3], [1066.0, -7.0]])
  ctx.fillStyle = b.c(mix('#64412F', DARK, d))
  ctx.fill()
}

/** The dune he waits on, drawn in front of the worm: lit back, its slip face in shade. */
export function paintDune(b: Brush): void {
  const { ctx, view, t } = b
  if (view.x1 < CREST[0] - FACE - 1 || view.x0 > CREST[0] + BACK + 1) return
  const left = duneLeft(t)
  if (left <= 0.002) return
  const s = sandAt(t)
  const pts: Pt[] = []
  for (let x = CREST[0] - FACE; x <= CREST[0] + BACK; x += 0.3) pts.push([x, duneY(x, t)])
  ctx.beginPath()
  ctx.moveTo(pts[0][0], 0.05)
  for (const p of pts) ctx.lineTo(p[0], p[1])
  ctx.lineTo(pts[pts.length - 1][0], 0.05)
  ctx.closePath()
  ctx.fillStyle = b.c(s.lit)
  ctx.fill()
  // The slip face: from the crest down the west side, and a terminator falling from the crest a little east of it.
  const top = duneY(CREST[0], t)
  ctx.beginPath()
  ctx.moveTo(CREST[0], top)
  for (const p of pts) if (p[0] < CREST[0]) ctx.lineTo(p[0], p[1])
  ctx.lineTo(CREST[0] - FACE, 0.05)
  ctx.lineTo(CREST[0] + 1.2 * left, 0.05)
  ctx.quadraticCurveTo(CREST[0] + 1.0 * left, top * 0.45, CREST[0] + 0.05, top)
  ctx.closePath()
  // As it slumps, its face goes into the lit sand with it.
  ctx.fillStyle = b.ca(s.shade, smooth(left, 0.25, 0.85))
  ctx.fill()
}

/**
 * The thumper: a stake of iron driven into the sand, a weight on a spring at its head. Between beats the spring draws
 * the weight up, and on the beat it lets go and the weight strikes the stake's collar: one calm ring goes out over the
 * sand. It does one thing, and the desert answers it.
 */
const STAKE = 0.46
export function thumperHit(t: number): { lift: number; since: number } {
  let last = -Infinity
  let next = Infinity
  for (const at of THUMPS) {
    if (at <= t) last = at
    else {
      next = at
      break
    }
  }
  if (last === -Infinity) return { lift: t >= PLANT - 2.5 ? 0 : 0, since: Infinity }
  const since = t - last
  // Up on the spring until the next beat (eased, slow at the top), and down at once on it.
  const span = Math.min(0.66, (next === Infinity ? 0.62 : next - last))
  const lift = since < 0.05 ? 1 - since / 0.05 : smooth(since, 0.05, span * 0.92)
  return { lift: next === Infinity && since > 0.66 ? 0 : lift, since }
}

/** The thumper at the foot (`at`): carried (`carried`, by Paul at `at`), or planted at THUMPER_X. */
export function paintThumper(b: Brush, at: Pt | null): void {
  const { ctx, t } = b
  if (t >= SWALLOW) return
  // Carried, it is slung on his back, leaning; as he stops he swings it down and stands it in the sand beside him, and
  // on the beat drives it in.
  const k = at ? 1 - smooth(t, PLANT - 1.25, PLANT - 0.3) : 0
  const carry: Pt = at ? [at[0] + 0.2, at[1] - 0.02] : [THUMPER_X, 0]
  const x = THUMPER_X + (carry[0] - THUMPER_X) * k
  const foot = (0.05 + (carry[1] - 0.05) * k) - 0.12 * smooth(t, PLANT - 0.12, PLANT)
  const lean = 0.55 * k
  const planted = k <= 0.001
  const ux = Math.sin(lean)
  const uy = -Math.cos(lean)
  const top: Pt = [x + ux * STAKE, foot + uy * STAKE]
  ctx.beginPath()
  ctx.moveTo(x, foot)
  ctx.lineTo(top[0], top[1])
  ctx.strokeStyle = b.c('#2A211B')
  ctx.lineWidth = Math.max(1.25 * b.px, 0.03)
  ctx.stroke()
  // The collar it strikes, and the weight on its spring above it.
  const { lift } = planted ? thumperHit(t) : { lift: 0.4 }
  const collar: Pt = [x + ux * STAKE * 0.62, foot + uy * STAKE * 0.62]
  ctx.fillStyle = b.c('#3A2E25')
  ctx.beginPath()
  ctx.rect(collar[0] - 0.05, collar[1] - 0.025, 0.1, 0.05)
  ctx.fill()
  const wy = collar[1] - 0.06 - lift * 0.17
  // The spring: a few turns between the collar and the weight.
  ctx.beginPath()
  const turns = 4
  for (let i = 0; i <= turns * 2; i++) {
    const y = collar[1] - 0.025 - ((collar[1] - 0.025 - (wy + 0.035)) * i) / (turns * 2)
    const xx = collar[0] + ux * ((collar[1] - y) / -uy || 0) + (i % 2 ? 0.035 : -0.035)
    if (i) ctx.lineTo(xx, y)
    else ctx.moveTo(xx, y)
  }
  ctx.strokeStyle = b.c('#5A4A3C')
  ctx.lineWidth = Math.max(1.25 * b.px, 0.012)
  ctx.stroke()
  ctx.fillStyle = b.c('#30251E')
  ctx.beginPath()
  ctx.rect(collar[0] - 0.075 + ux * 0.1, wy - 0.035, 0.15, 0.07)
  ctx.fill()
}

/** The rings the thumper sends over the sand: one a beat, going out and fading. A ring is an ellipse on the flat. */
export function paintRings(b: Brush): void {
  const { ctx, t, view } = b
  if (t < PLANT || t > SWALLOW + 1.6) return
  if (view.x1 < THUMPER_X - 12 || view.x0 > THUMPER_X + 12) return
  const s = sandAt(t)
  for (const at of THUMPS) {
    const since = t - at
    if (since < 0) break
    if (since > 1.5) continue
    const u = clamp01(since / 1.5)
    const r = 0.25 + 5.5 * (1 - (1 - u) * (1 - u))
    ellipse(ctx, THUMPER_X, 0.02, r, r * 0.07)
    ctx.strokeStyle = b.ca(s.shade, 0.55 * (1 - u))
    ctx.lineWidth = Math.max(1.25 * b.px, 0.05 * (1 - u * 0.6))
    ctx.stroke()
  }
}

/** For the cast: the ridge's way down and the crest they wait on, as points a ball's radius off the ground. */
export const ON_CREST: Pt = [CREST[0], CREST[1] - R]
