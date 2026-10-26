import { fill, hash, mix, poly, rect, rgba, stroke, type Paint } from '../../draw'
import { M } from '../../music'
import { skyAt } from '../../world/sky'
import type { Pt } from '../../path'
import { glide } from '../../voyage'
import { smoother } from '../../draw'
import { horizonOf, slope, surface } from '../../world/sea'
import { JETTY, MOORING, TRIAL } from './geo'
import { CLOTH, MADDER, TIMBER, outdoors } from './look'

/**
 * The west: a skiff at the harbour's jetty, and in it, after everything, the two of them; their son on the jetty beside
 * them. The dissolve from the hall comes down on the three of them together again, close; the son casts off the line
 * and they go out under a small sail towards where the sun is going down, and he stays. As they go the camera draws
 * back and up, slowly, until it holds the whole harbour, the cliff and its olive over him, and the skiff goes away from
 * us into the sun: smaller and smaller, up the sun's path on the water towards the horizon under it, the way a boat goes
 * when it is going west and we are staying, while the sun goes down into the sea ahead of it. Nolan's last image is the
 * two of them chasing the escaping sun; so is ours, with the son left on the shore as king.
 */

/** The last shot, held: the olive on the west cliff at its left, the jetty under it with their son on it, the sun ahead. */
export const WEST_CAM = { x: 839.0, y: -4.95, cells: 11.6 }
/** Where the west opens: close on the jetty's end, the skiff at it and the three of them, the low sun ahead. */
const WEST_CLOSE = { x: 841.25, y: -1.25, cells: 3.4 }
/** The draw back: held close while they cast off, then back and up to the held wide. */
const BACK: [number, number] = [TRIAL.fade + 3.2, TRIAL.fade + 20]

/** The west's framing at `t`: close, then drawn back to WEST_CAM (the camera's keys are laid on it, `home.ts`). */
export function westView(t: number): { x: number; y: number; cells: number } {
  const u = smoother(t, BACK[0], BACK[1])
  return {
    x: WEST_CLOSE.x + (WEST_CAM.x - WEST_CLOSE.x) * u,
    y: WEST_CLOSE.y + (WEST_CAM.y - WEST_CLOSE.y) * u,
    cells: Math.exp(Math.log(WEST_CLOSE.cells) + (Math.log(WEST_CAM.cells) - Math.log(WEST_CLOSE.cells)) * u),
  }
}
/** The keys for it: dense enough that the camera's cubic lies on `westView`. */
export const WEST_KEYS = Array.from({ length: Math.ceil((BACK[1] - BACK[0]) / 0.5) + 1 }, (_, i) => Math.min(BACK[1], BACK[0] + i * 0.5)).map((t) => {
  const v = westView(t)
  return { t, cells: v.cells, at: [v.x, v.y] as Pt }
})
/** The horizon of the frame at `t`, where the skiff goes; and the point on it under the sun (four fifths across). */
const horizonAt = (t: number): number => {
  const v = westView(t)
  return horizonOf({ cy: v.y, h: v.cells })
}
const sunXAt = (t: number): number => {
  const v = westView(t)
  return v.x + ((0.8 - 0.5) * v.cells * 16) / 9
}

/** The skiff's length, and where the two sit in it (its own frame, the waterline under its middle at 0). */
const L = 1.25
const SEATS: Pt[] = [[-0.22, -0.2], [0.07, -0.2]]

/** Along the sea, near: moored until the dissolve, then out from the jetty and round into the sun's path. */
const track = glide([
  [TRIAL.fade, MOORING, 0],
  [TRIAL.fade + 6, MOORING + 0.8, 0.3],
  [549, WEST_CAM.x + ((0.8 - 0.5) * WEST_CAM.cells * 16) / 9 + 0.4, 0.04],
])

/** How far off it has gone, as the share of its size it is seen at: 1 at the jetty, less and less as it goes west. */
export function skiffScale(t: number): number {
  return 1 - 0.86 * smoother(t, TRIAL.fade + 4.5, 549)
}

export interface Skiff {
  x: number
  y: number
  a: number
  s: number
}

export function skiffAt(t: number): Skiff {
  const near = track(Math.max(t, TRIAL.fade))
  const s = skiffScale(t)
  // Going away: towards the point on the horizon under the sun, as far as it has gone (the perspective of the frame).
  const sx = sunXAt(t)
  const x = sx + (near - sx) * s
  const y = horizonAt(t) * (1 - s) + (surface(near, t) - 0.02) * s
  return { x, y, a: slope(near, t, L) * 0.8 * s, s }
}

/** Where seat `i` is at `t` (0 his, at the stern; 1 hers). */
export function skiffSeat(t: number, i: number): Pt {
  const k = skiffAt(t)
  const [lx, ly] = SEATS[i]
  const c = Math.cos(k.a)
  const n = Math.sin(k.a)
  const r = i === 0 ? 0.13 : 0.125
  const px = lx * k.s
  const py = (ly - r) * k.s
  return [k.x + px * c - py * n, k.y + px * n + py * c]
}

/**
 * The sun's path on the water, under it to the horizon, that the skiff goes up: the low sun's light laid on the sea as
 * one flat, paler band, narrowing away from us, and warmer as the sun goes down. Light where it falls, nothing more.
 */
function drawSunPath(g: Paint): void {
  const { ctx, t, view } = g
  // Only in the west: before the cut to it the camera is in the hall, and the band would lie over the stairs.
  if (t < TRIAL.fade) return
  const d = skyAt(t).disc
  if (!d || d.a < 0.01) return
  const hy = horizonOf(view)
  const x = view.x0 + (view.x1 - view.x0) * d.x
  const r = d.r * view.h
  const low = smoother(t, M.fade, 549)
  const near = Math.min(view.y1, 0.1)
  // Broken by the swell into flat slivers, as light on water is: one, two or three to a row, of uneven lengths and set
  // off the middle by uneven amounts, the rows unevenly spaced and closing up towards the horizon, so it is the sea lit
  // and not a ladder; each a little longer and thicker nearer us, drifting slowly as the swell moves under it.
  ctx.fillStyle = rgba(d.color, 0.2 + 0.1 * low)
  ctx.beginPath()
  const n = 17
  for (let i = 0; i < n; i++) {
    const u = (i + 0.3 + 0.4 * hash(i, 41)) / n
    if (u > 0.86) continue
    const v = u * u
    const y = hy + (near - hy) * v
    const span = r * (0.45 + 2.0 * v)
    const h = Math.max(1.6 * g.px, (0.025 + 0.07 * v) * (1 - 0.4 * u))
    const pieces = 1 + (hash(i, 43) > 0.4 ? 1 : 0) + (v > 0.2 && hash(i, 47) > 0.55 ? 1 : 0)
    for (let j = 0; j < pieces; j++) {
      const cx = x + (hash(i, 51 + j) - 0.5) * span * 1.3 + r * 0.18 * Math.sin(t * 0.35 + i * 1.3 + j * 2.1)
      const half = span * (0.16 + 0.3 * hash(i, 61 + j)) * (0.7 + 0.3 * Math.sin(t * 0.55 + i * 2.1 + j * 1.7) ** 2)
      ctx.moveTo(cx - half, y)
      ctx.lineTo(cx + half, y)
      ctx.lineTo(cx + half * 0.9, y + h)
      ctx.lineTo(cx - half * 0.9, y + h)
      ctx.closePath()
    }
  }
  ctx.fill()
}

/** The skiff: a small hull, a mast and a square sail with a madder band, lifting a little in the evening wind. */
export function drawSkiff(g: Paint): void {
  const { ctx, t, view } = g
  drawSunPath(g)
  const s = skiffAt(t)
  if (s.x < view.x0 - 3 || s.x > view.x1 + 3) return
  const ink = outdoors('#2A2420', t)
  ctx.save()
  ctx.translate(s.x, s.y)
  ctx.rotate(s.a)
  ctx.scale(s.s, s.s)
  // The mast and the sail, set once they are under way.
  const set = Math.min(1, Math.max(0, (t - TRIAL.fade - 1.5) / 3))
  rect(ctx, 0.3, -1.05, 0.03, 0.85)
  fill(ctx, outdoors(TIMBER, t))
  if (set > 0) {
    const foot = -1.0 + 0.62 * set
    const belly = 0.06 * set * (1 + 0.15 * Math.sin(t * 0.9))
    ctx.beginPath()
    ctx.moveTo(0.02, -1.0)
    ctx.lineTo(0.6, -1.0)
    ctx.quadraticCurveTo(0.6 + belly, (foot - 1.0) / 2, 0.58, foot)
    ctx.lineTo(0.04, foot)
    ctx.quadraticCurveTo(0.02 + belly, (foot - 1.0) / 2, 0.02, -1.0)
    ctx.closePath()
    // Seen against the light on the water: the sail goes down to the dusk's dark as they go out into the sun's path.
    fill(ctx, mix(outdoors(CLOTH, t), '#3A3034', 0.35 + 0.5 * (1 - s.s)))
    stroke(g, ink, 1.4)
    rect(ctx, 0.03, -1.0 + 0.62 * set * 0.45, 0.56, 0.62 * set * 0.12)
    fill(ctx, mix(outdoors(MADDER, t), '#2A2024', 0.5 * (1 - s.s)))
  }
  // The hull: low, a little rise at either end.
  poly(ctx, [[-L / 2, -0.2], [-L / 2 + 0.08, 0.06], [L / 2 - 0.12, 0.06], [L / 2, -0.24], [L / 2 - 0.06, -0.16], [-L / 2 + 0.05, -0.15]])
  fill(ctx, mix(outdoors('#3A3029', t), '#1C1814', 0.3))
  stroke(g, ink, 1.4)
  ctx.restore()
  // The mooring line to the jetty's bollard, until they cast off.
  if (t < TRIAL.fade + 1.2 && s.s > 0.99) {
    ctx.beginPath()
    ctx.moveTo(s.x - L / 2 + 0.05, s.y - 0.15)
    ctx.quadraticCurveTo((s.x + JETTY.x1 - 0.5) / 2, s.y + 0.05, JETTY.x1 - 0.5, JETTY.top - 0.1)
    stroke(g, outdoors('#6A5A44', t), 1.0)
  }
}
