import { clamp01, hash, lerp, mix, ring, smooth, smoother, type Paint } from '../../draw'
import { M } from '../../music'
import type { Pt } from '../../path'
import { layer } from '../../world/depth'
import { SHORE, ground } from './geo'
import { BU, HEAVES, THRUSTS, horseAt, toWorld, type HorsePose } from './horse'
import { MAT, night, sun, tone } from './tone'

/**
 * The Trojans at dusk, who take the horse in. A crowd of them come down to the beach to it, thick on the sand behind the
 * line of the action; fourteen of them haul it up out of the surf on two ropes, walking back up the beach on each heave
 * and cheering when it comes; four with spears stand by its flank, and between the heaves they test it, driving their
 * spears up through its rump into the dark of its belly, one on each of the theme's notes. The last stops a finger from
 * his face.
 *
 * They are people, so they are balls, as everyone is: terracotta, Troy's own clay, drawn here and not by the stage
 * (they never touch the cast). They are gone across the dissolve to Ithaca, and the city is theirs again only as fire.
 */

export const TROJAN = '#8E4B3A'
const TROJAN_RIM = '#3A1C14'
const R = 0.13
const R_T = R * 0.86

/** A person drawn as the stage draws a ball: a flat fill, an outline, and the dot that turns as it rolls. */
export function token(g: Paint, x: number, y: number, r: number, color: string, rim: string, spin: number): void {
  const { ctx } = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.lineWidth = Math.max(0.75 * g.px, 0.037 * Math.min(1, (r / R) * 1.5 + 0.3))
  ctx.strokeStyle = rim
  ctx.stroke()
  if (r / g.px < 2.5) return
  ctx.beginPath()
  ctx.arc(x + Math.cos(spin) * r * 0.48, y + Math.sin(spin) * r * 0.48, r * 0.2, 0, Math.PI * 2)
  ctx.fillStyle = rim
  ctx.fill()
}

/* ------------------------------------------------------------------ the spears */

/** Where each spear's point goes in the horse's belly, in the horse's own units: the back of the hollow, between them. */
const TARGETS: Pt[] = [
  [-1.95, -5.85],
  [-2.02, -6.32],
  [-1.76, -6.45],
  [-1.52, -6.45],
]
/** How far a thrust drives the point (cells), and how long a spear is. */
const DRIVE = 0.55
const BEHIND = 0.75

/** How far a spearman stands from the sledge's foot (cells, up the beach): back in the crowd, then up at its flank. */
const spearOff = (j: number, t: number): number => lerp(3.0, 1.05, smoother(t, 17.0 + 0.25 * j, 19.2 + 0.25 * j)) + 0.36 * j
/** The haulers stand on, up the rope behind the spearmen. */
const haulOff = (i: number): number => 3.0 + 0.36 * 4 + 0.36 * i
const HAULERS = 14

/** Where a Trojan on the beach stands, `off` cells up from the sledge, at `t`: on the sand, rising and settling. */
function onBeach(p: HorsePose, off: number, t: number, seed: number): Pt {
  // On each heave they dig in and walk the rope back up the beach, and give a little hop of a cheer as it comes.
  let lead = 0
  let hop = 0
  for (const [at, , dur] of HEAVES) {
    lead += 0.06 * smooth(t, at - 0.35, at + 0.1) * (1 - smooth(t, at + dur * 0.55, at + dur))
    hop += 0.055 * Math.max(0, ring(t, at + dur * 0.7 + 0.12 * seed, 1.7, 0.35))
  }
  const x = p.x - off - lead
  return [x, ground(x) - R_T - hop]
}

/** The grip, the point, and how far driven a spear is at `t` (null while it is carried upright). */
function spearAt(j: number, t: number): { grip: Pt; tip: Pt; aim: number } {
  const p = horseAt(t)
  const [bx, by] = onBeach(p, spearOff(j, t), t, j)
  const grip: Pt = [bx + 0.06, by - 0.05]
  const T = THRUSTS[j]
  const hold = j === 3 ? 1.5 : 0.85
  const aim = smoother(t, T - 1.1, T - 0.45) * (1 - smoother(t, T + hold + 0.6, T + hold + 1.5))
  const drive = smooth(t, T, T + 0.12) * (1 - smooth(t, T + hold, T + hold + 0.45))
  const target = toWorld(p, TARGETS[j])
  const dx = target[0] - grip[0]
  const dy = target[1] - grip[1]
  const d = Math.hypot(dx, dy)
  const reach = d - DRIVE * (1 - drive)
  // Upright to aimed: the angle from straight up (with a little forward lean) round to the line to the target.
  const up = -Math.PI / 2 + 0.06
  const a = up + (Math.atan2(dy, dx) - up) * aim
  const len = lerp(1.6, reach, aim)
  return { grip, tip: [grip[0] + Math.cos(a) * len, grip[1] + Math.sin(a) * len], aim }
}

function spearLine(g: Paint, grip: Pt, tip: Pt, t: number): void {
  const { ctx } = g
  const dx = tip[0] - grip[0]
  const dy = tip[1] - grip[1]
  const d = Math.hypot(dx, dy) || 1
  const ux = dx / d
  const uy = dy / d
  ctx.beginPath()
  ctx.moveTo(grip[0] - ux * BEHIND, grip[1] - uy * BEHIND)
  ctx.lineTo(tip[0] - ux * 0.16, tip[1] - uy * 0.16)
  ctx.strokeStyle = tone(MAT.timber, t, { lit: 0.3 })
  ctx.lineWidth = Math.max(1.25 * g.px, 0.032)
  ctx.lineCap = 'round'
  ctx.stroke()
  // The point: a narrow leaf of bronze.
  const bx = tip[0] - ux * 0.17
  const by = tip[1] - uy * 0.17
  ctx.beginPath()
  ctx.moveTo(tip[0], tip[1])
  ctx.lineTo(bx - uy * 0.032, by + ux * 0.032)
  ctx.lineTo(bx - ux * 0.03, by - uy * 0.03)
  ctx.lineTo(bx + uy * 0.032, by - ux * 0.032)
  ctx.closePath()
  ctx.fillStyle = tone(MAT.bronze, t, { lit: 0.8 })
  ctx.fill()
  ctx.strokeStyle = tone('#2A1D12', t)
  ctx.lineWidth = Math.max(g.px, 0.012)
  ctx.stroke()
}

/** The points inside the belly, for the horse to draw over its hollow (it hands its own frame: units, turned). */
export function spearsInside(g: Paint, toLocal: (p: Pt) => Pt): void {
  const { t } = g
  if (t < THRUSTS[0] - 0.2 || t > THRUSTS[3] + 3) return
  for (let j = 0; j < THRUSTS.length; j++) {
    const s = spearAt(j, t)
    if (s.aim < 0.5) continue
    const grip = toLocal(s.grip)
    const tip = toLocal(s.tip)
    // In the horse's units the line weights are BU times larger: draw it in cells' terms by scaling back.
    g.ctx.save()
    g.ctx.scale(1 / BU, 1 / BU)
    spearLine(g, [grip[0] * BU, grip[1] * BU], [tip[0] * BU, tip[1] * BU], t)
    g.ctx.restore()
  }
}

/* ------------------------------------------------------------------ drawing */

const on = (t: number) => t < M.second + 1.2

/** The ropes' far end: the last hauler's hands. */
export function ropeEnd(t: number): number {
  const p = horseAt(t)
  return onBeach(p, haulOff(HAULERS - 1) + 0.35, t, 0)[0]
}

/** The haulers and the spearmen, on the sand in the plane of the action, and their spears (before the horse). */
export function drawTrojans(g: Paint): void {
  const { t, view } = g
  if (!on(t)) return
  const p = horseAt(t)
  if (p.x - haulOff(HAULERS) > view.x1 + 1 || p.x < view.x0 - 2) return
  const lit = 0.45 * sun(t) / 0.5
  const fill = tone(TROJAN, t, { lit })
  const rim = tone(TROJAN_RIM, t)
  for (let i = 0; i < HAULERS; i++) {
    const [x, y] = onBeach(p, haulOff(i), t, i)
    token(g, x, y, R_T * (0.94 + 0.12 * hash(i, 3)), fill, rim, x / R_T + 6 * hash(i, 4))
  }
  for (let j = 0; j < THRUSTS.length; j++) {
    const s = spearAt(j, t)
    spearLine(g, s.grip, s.tip, t)
    const [x, y] = onBeach(p, spearOff(j, t), t, j)
    token(g, x, y, R_T, fill, rim, x / R_T + 2 * j)
  }
}

/**
 * The coast behind the beach (as `drawInland` lays it: a curve from the beach's foot round a bay to the horizon far
 * inland), at the height `y` in the frame: everything left of it there is land.
 */
function coastAt(y: number, hy: number): number {
  const v = Math.max(0, Math.min(1, y / hy))
  const s = (-0.9 + Math.sqrt(0.81 + 0.4 * v)) / 0.2
  return (1 - s) * (1 - s) * SHORE + 2 * (1 - s) * s * (SHORE - 3.5) + s * s * (SHORE - 24)
}

/** The depths the crowd's ranks fill between (cells behind the haulers' line): rank r stands between bounds r and r + 1. */
const BANDS = [0.8, 1.5, 2.5, 3.9, 5.8, 8.2]

/**
 * The crowd behind: ranks of them back up the beach, smaller and paler the further; they cheer on the heaves, a hop
 * that runs through them. Within its rank every man stands at his own depth, so the crowd is never rows of dots: it
 * thickens up the beach. The thousands further back are the dusk itself.
 */
export function drawCrowd(g: Paint): void {
  const { ctx, t, view } = g
  if (!on(t) || view.x1 < -22 || view.x0 > SHORE + 1) return
  const air = mix(tone('#C9A98A', t), tone('#3A3540', t), night(t))
  for (let r = 4; r >= 0; r--) {
    const d = [1.1, 2.0, 3.2, 4.8, 7.0][r]
    const L = layer(view, d)
    const radius = R_T * L.s
    if (radius < view.h / 300) continue
    const small = 1 - smooth(radius / view.h, 1 / 300, 1 / 170)
    const fill = mix(mix(tone(TROJAN, t, { lit: 0.6 * sun(t) }), air, 0.08 + 0.09 * r), air, 0.85 * small)
    const rim = mix(tone(TROJAN_RIM, t), fill, Math.min(1, 0.2 * r + small))
    const gap = 0.27
    const x0 = -19.5 - 0.6 * r
    const x1 = SHORE - 0.7 - 0.25 * r
    ctx.beginPath()
    let any = false
    for (let j = Math.ceil(x0 / gap); j <= Math.floor(x1 / gap); j++) {
      const lx = j * gap + (r % 2 ? gap / 2 : 0) + (hash(j, r, 11) - 0.5) * gap * 0.5
      // Thinning towards their ends, and a gap here and there.
      const edge = smooth(lx, x0, x0 + 3) * (1 - smooth(lx, x1 - 1.6, x1))
      if (hash(j, r, 12) > 0.15 + 0.85 * edge) continue
      // His own depth in the rank's band.
      const Lh = layer(view, BANDS[r] + (BANDS[r + 1] - BANDS[r]) * hash(j, r, 16))
      const rh = R_T * Lh.s
      const x = Lh.x(lx)
      if (x < view.x0 - 1 || x > view.x1 + 1) continue
      let hop = 0
      for (const [at, , dur] of HEAVES) hop += Math.max(0, ring(t, at + dur * 0.65 + 0.5 * hash(j, r, 13) + 0.04 * Math.abs(lx + 9), 1.6, 0.4))
      const y = Lh.y(Math.min(0, ground(lx))) - rh - 0.05 * Lh.s * hop
      // Only on the land: thinning out towards the coast as it curves away, never out on the water.
      const coast = coastAt(y + rh, Lh.hy)
      if (x > coast - 0.4 - 1.2 * hash(j, r, 15)) continue
      ctx.moveTo(x + rh, y)
      ctx.arc(x, y, rh, 0, Math.PI * 2)
      any = true
    }
    if (!any) continue
    ctx.lineWidth = Math.max(0.75 * g.px, 0.037 * L.s * 0.8)
    ctx.strokeStyle = rim
    ctx.stroke()
    ctx.fillStyle = fill
    ctx.fill()
  }
  void clamp01
}
