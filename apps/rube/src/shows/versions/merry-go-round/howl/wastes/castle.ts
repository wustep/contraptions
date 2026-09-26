import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha, hash } from '../kit'
import { drawDoor } from '../cast'
import { CALCIFER, DIAL, ROOM, TOWN, WASTES } from '../worlds'

/**
 * Howl's castle, the show's hero machine (canonical: the castle builder's; the field, the plank and the finale draw
 * it through this API and nothing else). A heap of iron hull, stone turrets, slate cones, a timbered cottage and
 * Calcifer's brick chimney, on four iron bird legs, walking to the right with a heavy rolling lurch. Its face is at
 * the front: a round window for an eye under an iron brow, a jaw of teeth that works as it walks, a drawbridge
 * hanging out of it like a tongue, and a cannon for a nose. Its door is in the hull's near side, over a little
 * porch, with the colour dial over it; a telescoping stair hangs from the porch's left end.
 *
 * Frame: cells, origin on the ground between its feet, y down; it faces right (+x). Standing, its belly (the hull's
 * underside) is at `CASTLE.belly`, the door's sill at `CASTLE.door`, Calcifer's chimney mouth at `CASTLE.chimney`,
 * the flag's tip at about y = -25.7; nose to stern it is about 20 long (`CASTLE_BOX`). Sat, it rests on its folded
 * legs with the belly about 1.5 off the ground and the door's sill 2.3 up.
 *
 * Walking: `step` counts footfalls (a pair of feet lands at every whole number: the near front with the far back,
 * then the near back with the far front). The caller moves the origin by `STRIDE` a step (or by `travel`, when the
 * pace changes), and the feet stay planted on the ground while the body goes over them. Stand it still on a whole
 * step (all four feet are down there). `sit` folds the legs under it and lays the belly on the ground.
 */

export const STRIDE = 3.2

export const CASTLE = {
  /** The underside of the hull, standing. */
  belly: -6.0,
  /** Hip joints: the near front and the near back (the far pair is `FAR` from them, darker, behind the hull). */
  hips: [[3.9, -6.9], [-3.9, -6.9]] as Pt[],
  thigh: 4.2,
  shin: 4.2,
  /** The door's sill (the middle of its threshold), in the hull's near side, facing us. */
  door: [-0.8, -6.8] as Pt,
  /** The porch before the door: its floor runs from x0 to x1 at the sill's height. */
  porch: [-2.8, 0.3] as Pt,
  /** Where a rider stands on the porch, left of the door (her centre is FLOOR above it). */
  ride: [-1.85, -6.8] as Pt,
  /** The hanging stair from the porch's left end: its top, and its foot when it is let all the way down. */
  stairTop: [-2.4, -6.8] as Pt,
  stairFoot: [-2.4, -0.75] as Pt,
  /** Calcifer's chimney: its mouth. */
  chimney: [0.55, -22.55] as Pt,
  /** The deck on the hull's top, where the houses stand. */
  deck: -12.3,
}

/** The far pair of legs: their hips, from the near pair's. */
export const FAR: Pt = [0.75, -0.3]

export type ModuleId = 'hull' | 'jaw' | 'nose' | 'eye' | 'house' | 'chimney' | 'turretBack' | 'turretFront' | 'pipes' | 'flag' | 'cannonTop'

/**
 * What each module turns about when it is moved (`ModuleMove.rot`): its own base, in standing cells. The hull's
 * module carries the porch, the door, the stair and the fin; the eye, the jaw and the nose are the face's.
 */
export const MODULE_PIVOT: Record<ModuleId, Pt> = {
  hull: [-0.8, -9.2],
  jaw: [6.45, -8.35],
  nose: [8.9, -10.15],
  eye: [7.55, -11.05],
  house: [-0.4, -12.3],
  chimney: [0.7, -17.8],
  turretBack: [-6.6, -12.2],
  turretFront: [5.8, -12.4],
  pipes: [5.1, -12.3],
  flag: [-6.9, -23.6],
  cannonTop: [-7.7, -17.4],
}

/** How a module has moved from its place (for the collapse): offset (cells), turn (radians, about its `MODULE_PIVOT`), and how gone it is (0..1, fading). */
export interface ModuleMove {
  dx?: number
  dy?: number
  rot?: number
  gone?: number
}

export interface CastlePose {
  /** Show time: smoke, flicker, flags. */
  t: number
  /** Footfalls so far (see the header). */
  step: number
  /** 0 standing, 1 sat down on its folded legs (belly near the ground). */
  sit?: number
  /** Chimney smoke drawn with the castle (rising and trailing back), 0..1. A caller may draw its own plume instead. */
  smoke?: number
  /** Windows lit, 0..1 (they come on one by one as it rises). */
  lights?: number
  /** Night, 0..1: the iron and stone go toward the dark. */
  night?: number
  /** The door: how open, and its dial (counting along `DIAL_ORDER`: 0 green, where the castle stands). */
  door?: number
  dial?: number
  /** The collapse: per module, how it has moved. Missing modules are in place. */
  modules?: Partial<Record<ModuleId, ModuleMove>>
  /** Leave the legs out (the plank builder draws its own plank on legs). */
  noLegs?: boolean
  // Optional, added by the castle builder; each defaults to what the castle does without it.
  /** The ground's y under castle-frame x (relative to the origin's ground, y down): where the feet plant. Default flat. */
  ground?: (x: number) => number
  /** How far the origin has walked after `step` footfalls (cells). Default `STRIDE * step`. Pass it when the pace changes, so no planted foot slides. */
  travel?: (step: number) => number
  /** The body's pitch, radians, nose down positive, about the hips' middle (a slope, a lurch). */
  lean?: number
  /** The telescoping stair: 0 stowed under the porch, 1 let all the way down (its sections drop one after another). */
  stair?: number
  /** The stair's swing on its hinge, radians (positive swings its foot back, to the left). */
  swing?: number
  /** Calcifer's roar out of the chimney mouth: 0..1 (a flare of flame; the burst of smoke is the caller's). */
  roar?: number
  /** Fog: 0 clear, 1 lost in it (every colour goes toward `hazeTo`). */
  haze?: number
  hazeTo?: string
  /** Dust thrown up where the feet land, 0..1. Default 0. */
  dust?: number
  /** Steam out of the knees and the whistle as the feet land, 0..1. Default 1. */
  steam?: number
  /** The eye's glass lit from inside, 0..1, besides `lights` (a creature in the fog). */
  eye?: number
  /** How far the jaw is open, 0..1, besides its own working as it walks. */
  jaw?: number
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** How far the body has dropped at `sit` (cells, positive down): it comes to rest on its folded legs, the belly a cell and a half off the ground. */
const sag = (sit: number) => 4.5 * sit

/** The body's bob for a step phase: down just after a foot lands, up mid-stride. */
export function bob(step: number): number {
  const u = step - Math.floor(step)
  return 0.26 * Math.cos(2 * Math.PI * (u - 0.07)) - 0.02
}

/** The pivot the body pitches about: the hips' middle. */
const PIV: Pt = [0, -6.9]

/** The rolling rock of the gait, radians (nose down positive): the front sinks as the front foot lands. */
const rock = (step: number) => 0.014 * Math.sin(Math.PI * step + 0.5)

/** The body's pitch and drop at a pose. */
function carriage(pose: CastlePose): { lean: number; lift: number } {
  const sit = clamp01(pose.sit ?? 0)
  const still = 1 - sit
  return { lean: (pose.lean ?? 0) + rock(pose.step) * still, lift: bob(pose.step) * still + sag(sit) }
}

/** A standing point of the body where it is at a pose (pitched, bobbed, sat). */
function bodyAt(pose: CastlePose, at: Pt): Pt {
  const { lean, lift } = carriage(pose)
  const c = Math.cos(lean)
  const s = Math.sin(lean)
  const x = at[0] - PIV[0]
  const y = at[1] - PIV[1]
  return [PIV[0] + x * c - y * s, PIV[1] + x * s + y * c + lift]
}

/** Where the door's sill is at a pose, in the castle's frame: where Sophie steps in. */
export function doorAt(pose: CastlePose): Pt {
  return bodyAt(pose, CASTLE.door)
}

/** A point of the body (given standing) where it is at a pose: for riding the castle (`carried`). */
export function onBody(pose: CastlePose, at: Pt): Pt {
  return bodyAt(pose, at)
}

/* ------------------------------------------------------------------ the stair */

/** The stair's five sections: each is SEC long, the top one fixed under the porch, each lower one sliding out of the one above. */
const SECTIONS = 5
const SEC = 1.2
const FULL = CASTLE.stairFoot[1] - CASTLE.stairTop[1]
const SLIDE = (FULL - SEC + 0.05) / (SECTIONS - 1)

/** Where section `i` ends (cells down from the hinge) at `stair`: the sections drop one after another. */
function sectionEnd(i: number, stair: number): number {
  let b = SEC - 0.05
  for (let j = 1; j <= i; j++) b += SLIDE * clamp01(stair * (SECTIONS - 1) - (j - 1))
  return b
}

/** The stair's length at `stair` (0 stowed, 1 let down). */
export const stairLength = (stair: number): number => sectionEnd(SECTIONS - 1, clamp01(stair))

/** Where each tread is (cells down from the hinge) with the stair let all the way down, top to bottom; the last is its foot. */
export const STAIR_TREADS: number[] = (() => {
  const out: number[] = []
  for (let i = 0; i < SECTIONS; i++) {
    const b = sectionEnd(i, 1)
    out.push(b - 0.9, b - 0.3)
  }
  out.push(FULL)
  return out.sort((a, b) => a - b)
})()

/** A point `d` cells down the stair from its hinge, in the castle's frame at a pose (a rider on a tread stands FLOOR above it). */
export function stairAt(pose: CastlePose, d: number): Pt {
  const len = stairLength(pose.stair ?? 0)
  const sw = pose.swing ?? 0
  const u = Math.max(0, Math.min(len, d))
  return bodyAt(pose, [CASTLE.stairTop[0] - Math.sin(sw) * u, CASTLE.stairTop[1] + Math.cos(sw) * u])
}

/* ------------------------------------------------------------------ the legs */

/** Each leg's cycle is two steps; it is planted for this much of it, and swings for the rest. */
const DUTY = 0.6

interface LegDef {
  hip: Pt
  far: boolean
  phase: number
}
/** Drawn in this order: the far pair behind the body, then the near pair over it. */
const LEGS: LegDef[] = [
  { hip: [CASTLE.hips[1][0] + FAR[0], CASTLE.hips[1][1] + FAR[1]], far: true, phase: 0 },
  { hip: [CASTLE.hips[0][0] + FAR[0], CASTLE.hips[0][1] + FAR[1]], far: true, phase: 1 },
  { hip: CASTLE.hips[1], far: false, phase: 1 },
  { hip: CASTLE.hips[0], far: false, phase: 0 },
]

const mod2 = (v: number) => ((v % 2) + 2) % 2

/** A foot at a pose: where it is (castle frame), how long since it landed (steps), how far it is off the ground (0..1). */
function footOf(pose: CastlePose, leg: LegDef): { at: Pt; since: number; air: number } {
  const s = pose.step
  const trav = pose.travel ?? ((q: number) => STRIDE * q)
  const ground = pose.ground ?? (() => 0)
  const hx = leg.hip[0]
  const c = mod2(s - leg.phase)
  const L = s - c
  // Where it lands: half its stance's travel ahead of the hip, so it passes under the hip mid-stance.
  const land = (l: number) => trav(l) + hx + 0.5 * (trav(l + 2 * DUTY) - trav(l))
  let wx: number
  let air = 0
  let reach = 0
  if (c < 2 * DUTY) wx = land(L)
  else {
    const u = (c - 2 * DUTY) / (2 - 2 * DUTY)
    const e = u * u * (3 - 2 * u)
    const a = land(L)
    const b = land(L + 2)
    wx = a + (b - a) * e
    air = Math.sin(Math.PI * u)
    reach = Math.abs(b - a)
  }
  let fx = wx - trav(s)
  let fy = ground(fx) - air * Math.min(1.5, 0.25 + 0.36 * reach)
  const sit = clamp01(pose.sit ?? 0)
  if (sit > 0) {
    // Sitting, each foot shuffles in under its hip and the leg folds back along the ground.
    const e = sit * sit * (3 - 2 * sit)
    const sx = hx + 0.3
    fx += (sx - fx) * e
    fy += (ground(sx) - fy) * e
    air *= 1 - e
  }
  return { at: [fx, fy], since: c, air }
}

/** Where each foot of the castle is at a pose, near front first, then near back, far front, far back (castle frame): for keeping clear of them. */
export function feetAt(pose: CastlePose): { at: Pt; down: boolean }[] {
  const order = [3, 2, 1, 0]
  return order.map((i) => {
    const f = footOf(pose, LEGS[i])
    return { at: f.at, down: f.air <= 0 }
  })
}

/**
 * A bird leg from hip to foot: an armoured thigh, the joint bent backwards (a knee capped in iron with a brass
 * piston across it), a thin scaled shin, three long toes forward and a spur behind. `fold` curls the toes (a foot
 * off the ground, or tucked under a sitting castle).
 */
export function drawLeg(p: p5, k: number, weight: number, ink: string, hip: Pt, foot: Pt, color: string, fold = 0, shadow = 0): void {
  const { thigh, shin } = CASTLE
  const dx = foot[0] - hip[0]
  const dy = foot[1] - hip[1]
  const d = Math.max(Math.abs(thigh - shin) + 0.01, Math.min(thigh + shin - 0.01, Math.hypot(dx, dy)))
  const a = Math.atan2(dy, dx)
  const cosK = (thigh * thigh + d * d - shin * shin) / (2 * thigh * d)
  const off = Math.acos(Math.max(-1, Math.min(1, cosK)))
  // The joint bends backwards (to the left, away from where it walks).
  const ka = a + off
  const knee: Pt = [hip[0] + Math.cos(ka) * thigh, hip[1] + Math.sin(ka) * thigh]
  const sa = Math.atan2(foot[1] - knee[1], foot[0] - knee[0])
  const ankle: Pt = [knee[0] + Math.cos(sa) * shin, knee[1] + Math.sin(sa) * shin]
  const X = (v: number) => v * k
  const shade = mixHex(color, '#000000', 0.22)
  const pale = mixHex(mixHex(color, WASTES.stone, 0.42), color, shadow * 0.8)
  const brass = mixHex(mixHex(WASTES.brass, color, 0.28), color, shadow * 0.75)
  p.push()
  p.strokeJoin(p.ROUND)
  // The thigh: a drumstick of plate, broad at the hip, with its shaded back edge and two bands.
  p.stroke(ink)
  p.strokeWeight(weight)
  p.fill(color)
  poly(p, k, taper(hip, knee, 0.82, 0.36))
  const tx = Math.cos(ka)
  const ty = Math.sin(ka)
  const nx = -ty
  const ny = tx
  p.noStroke()
  p.fill(shade)
  p.beginShape()
  for (let i = 0; i <= 6; i++) {
    const u = i / 6
    const r = 0.82 + (0.36 - 0.82) * u
    p.vertex(X(hip[0] + tx * thigh * u + nx * r * 0.92), X(hip[1] + ty * thigh * u + ny * r * 0.92))
  }
  for (let i = 6; i >= 0; i--) {
    const u = i / 6
    const r = 0.82 + (0.36 - 0.82) * u
    p.vertex(X(hip[0] + tx * thigh * u + nx * r * 0.3), X(hip[1] + ty * thigh * u + ny * r * 0.3))
  }
  p.endShape(p.CLOSE)
  p.stroke(alpha(p, ink, 0.55))
  p.strokeWeight(weight * 0.6)
  for (const u of [0.38, 0.66]) {
    const r = 0.82 + (0.36 - 0.82) * u
    const cx = hip[0] + tx * thigh * u
    const cy = hip[1] + ty * thigh * u
    p.line(X(cx + nx * r), X(cy + ny * r), X(cx - nx * r), X(cy - ny * r))
  }
  // The piston across the knee: a brass cylinder on the thigh's front, its rod into the shin.
  const pa: Pt = [hip[0] + tx * thigh * 0.45 - nx * 0.42, hip[1] + ty * thigh * 0.45 - ny * 0.42]
  const pb: Pt = [knee[0] + Math.cos(sa) * shin * 0.3, knee[1] + Math.sin(sa) * shin * 0.3]
  const pl = Math.max(0.01, Math.hypot(pb[0] - pa[0], pb[1] - pa[1]))
  const px = (pb[0] - pa[0]) / pl
  const py = (pb[1] - pa[1]) / pl
  const cyl = Math.min(pl * 0.62, 1.25)
  p.stroke(ink)
  p.strokeWeight(weight * 1.9)
  p.line(X(pa[0]), X(pa[1]), X(pb[0]), X(pb[1]))
  p.stroke(mixHex(mixHex(color, WASTES.stone, 0.6), color, shadow * 0.8))
  p.strokeWeight(weight * 0.8)
  p.line(X(pa[0]), X(pa[1]), X(pb[0]), X(pb[1]))
  p.stroke(ink)
  p.strokeWeight(weight * 0.8)
  p.fill(brass)
  poly(p, k, taper(pa, [pa[0] + px * cyl, pa[1] + py * cyl], 0.13, 0.13))
  // The shin: thin and scaled, pale.
  p.stroke(ink)
  p.strokeWeight(weight)
  p.fill(pale)
  poly(p, k, taper(knee, ankle, 0.21, 0.13))
  const sx = -Math.sin(sa)
  const sy = Math.cos(sa)
  p.stroke(alpha(p, ink, 0.5))
  p.strokeWeight(weight * 0.5)
  for (let i = 1; i < 8; i++) {
    const u = 0.1 + (i / 8) * 0.85
    const cx = knee[0] + (ankle[0] - knee[0]) * u
    const cy = knee[1] + (ankle[1] - knee[1]) * u
    const r = 0.2 - 0.07 * u
    p.line(X(cx + sx * r), X(cy + sy * r), X(cx - sx * r * 0.6), X(cy - sy * r * 0.6 + 0.04))
  }
  // The knee: an iron cap and a brass hub.
  p.stroke(ink)
  p.strokeWeight(weight)
  p.fill(shade)
  p.circle(X(knee[0]), X(knee[1]), X(0.78))
  p.fill(brass)
  p.strokeWeight(weight * 0.7)
  p.circle(X(knee[0]), X(knee[1]), X(0.3))
  // The foot: three toes forward and a spur behind, flat on the ground, curling as it lifts.
  const curl = clamp01(fold)
  const toe = (len: number, ang: number, w: number) => {
    const bend = curl * 0.9
    const segs = 4
    let x = ankle[0]
    let y = ankle[1]
    let an = ang
    const top: Pt[] = []
    const bot: Pt[] = []
    for (let i = 0; i <= segs; i++) {
      const u = i / segs
      const r = w * (1 - 0.75 * u)
      const qx = -Math.sin(an)
      const qy = Math.cos(an)
      top.push([x - qx * r, y - qy * r])
      bot.push([x + qx * r, y + qy * r])
      if (i < segs) {
        x += Math.cos(an) * (len / segs)
        y += Math.sin(an) * (len / segs)
        an += (bend / segs) * (Math.cos(ang) >= 0 ? 1 : -1)
      }
    }
    return { pts: [...top, ...bot.reverse()], tip: [x, y] as Pt }
  }
  p.stroke(ink)
  p.strokeWeight(weight * 0.85)
  p.fill(pale)
  poly(p, k, toe(0.55, Math.PI - 0.12, 0.1).pts)
  for (const [len, ang] of [[1.05, -0.1], [1.25, 0.0], [0.95, 0.08]] as Pt[]) {
    const tt = toe(len, ang, 0.12)
    p.stroke(ink)
    p.fill(pale)
    poly(p, k, tt.pts)
    p.noStroke()
    p.fill(ink)
    p.circle(X(tt.tip[0]), X(tt.tip[1]), X(0.1))
  }
  p.stroke(ink)
  p.fill(shade)
  p.circle(X(ankle[0]), X(ankle[1]), X(0.3))
  p.pop()
}

/* ------------------------------------------------------------------ drawing helpers */

function poly(p: p5, k: number, pts: Pt[]): void {
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

/** A closed outline round two circles, one at each end (a limb, a pipe, a barrel). */
function taper(a: Pt, b: Pt, ra: number, rb: number): Pt[] {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0])
  const out: Pt[] = []
  const n = 7
  for (let i = 0; i <= n; i++) {
    const t = ang - Math.PI / 2 + (i / n) * Math.PI
    out.push([b[0] + Math.cos(t) * rb, b[1] + Math.sin(t) * rb])
  }
  for (let i = 0; i <= n; i++) {
    const t = ang + Math.PI / 2 + (i / n) * Math.PI
    out.push([a[0] + Math.cos(t) * ra, a[1] + Math.sin(t) * ra])
  }
  return out
}

/** A Catmull-Rom curve through `pts` (open), `n` samples a span. */
export function spline(pts: Pt[], n = 6): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    for (let j = 0; j < n; j++) {
      const t = j / n
      const t2 = t * t
      const t3 = t2 * t
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ])
    }
  }
  out.push(pts[pts.length - 1])
  return out
}

const RGB = new Map<string, string>()
const rgbOf = (hex: string): string => {
  let v = RGB.get(hex)
  if (!v) {
    const n = parseInt(hex.slice(1, 7), 16)
    v = `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
    RGB.set(hex, v)
  }
  return v
}

/** A soft puff (steam, smoke, dust, fog, a glow): a radial fade, never outlined. `color` is `#rrggbb`. */
export function puff(p: p5, k: number, x: number, y: number, r: number, color: string, a: number, squash = 1): void {
  if (a <= 0.004 || r <= 0.01) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const rgb = rgbOf(color)
  const al = Math.min(1, a)
  ctx.save()
  ctx.translate(x * k, y * k)
  if (squash !== 1) ctx.scale(1, squash)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * k)
  g.addColorStop(0, `rgba(${rgb}, ${al})`)
  g.addColorStop(0.5, `rgba(${rgb}, ${al * 0.72})`)
  g.addColorStop(1, `rgba(${rgb}, 0)`)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, r * k, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/* ------------------------------------------------------------------ the castle */

/** The hull's outline, standing: a patched deck line, then round under the belly and up the stern. */
const HULL: Pt[] = (() => {
  const deck: Pt[] = [[-7.65, -12.2], [-6.3, -12.5], [-4.6, -12.3], [-2.2, -12.45], [0.4, -12.2], [2.9, -12.42], [5.0, -12.3], [6.05, -12.55]]
  const under = spline([[6.05, -12.55], [6.45, -10.9], [6.75, -9.0], [6.3, -7.55], [5.1, -6.7], [3.1, -6.18], [0.8, -5.98], [-1.7, -6.03], [-3.9, -6.36], [-5.7, -7.0], [-7.1, -7.95], [-8.15, -9.15], [-8.6, -10.45], [-8.35, -11.55], [-7.65, -12.2]], 5)
  return [...deck, ...under.slice(1)]
})()
/** The belly's curve alone (the dark band under it). */
const BELLY: Pt[] = spline([[6.3, -7.55], [5.1, -6.7], [3.1, -6.18], [0.8, -5.98], [-1.7, -6.03], [-3.9, -6.36], [-5.7, -7.0], [-7.1, -7.95], [-8.15, -9.15]], 6)

/** The head over the hull's front: the brow of the face, its eye, the upper lip. */
const HEAD: Pt[] = spline([[5.7, -12.55], [7.2, -12.6], [8.35, -12.3], [9.0, -11.6], [9.2, -10.3], [9.05, -9.3], [8.6, -8.95], [7.1, -8.82], [6.3, -8.4]], 5)

/** Every cell the castle can cover about its origin, standing or sitting: for `cells` lists. */
export const CASTLE_BOX = { x0: -11, y0: -27, x1: 12, y1: 1 }

/** Draws the castle at a pose, about the caller's origin. */
export function drawCastle(p: p5, k: number, weight: number, ink: string, pose: CastlePose): void {
  const night = clamp01(pose.night ?? 0)
  const haze = clamp01(pose.haze ?? 0)
  if (haze >= 0.985) return
  const hazeTo = pose.hazeTo ?? WASTES.mist
  const tone = (c: string) => mixHex(mixHex(c, WASTES.night, night * 0.55), hazeTo, haze)
  const INK = mixHex(ink, hazeTo, haze * 0.92)
  const iron = tone(WASTES.iron)
  const ironDark = tone(WASTES.ironDark)
  const rust = tone(WASTES.rust)
  const brass = tone(WASTES.brass)
  const slate = tone(WASTES.slate)
  const stone = tone(WASTES.stone)
  const stoneDark = tone(WASTES.stoneDark)
  const wood = tone(WASTES.wood)
  const plaster = tone(TOWN.plaster)
  const timber = tone(TOWN.timber)
  const brick = tone(ROOM.brick)
  const brickDark = tone(ROOM.brickDark)
  const lights = clamp01(pose.lights ?? 0)
  const W = weight
  const X = (v: number) => v * k
  const mods = pose.modules ?? {}
  const t = pose.t
  const step = pose.step
  const sit = clamp01(pose.sit ?? 0)
  const walking = 1 - sit
  const u = step - Math.floor(step)
  const { lean, lift } = carriage(pose)
  const line = (a: Pt, b: Pt) => p.line(X(a[0]), X(a[1]), X(b[0]), X(b[1]))
  const inked = (fill: string, w = W) => {
    p.stroke(INK)
    p.strokeWeight(w)
    p.fill(fill)
  }
  // A window: dark glass by day, lit warm as the lights come up (each window at its own moment).
  let win = 0
  const glass = (x: number, y: number, w: number, h: number, r = 0.06) => {
    const i = win++
    const on = clamp01((lights - hash(i, 7) * 0.75) / 0.2)
    inked(mixHex(ironDark, tone(WASTES.window), on), W * 0.7)
    p.rect(X(x), X(y), X(w), X(h), X(r))
    if (on > 0.02) puff(p, k, x + w / 2, y + h / 2, Math.max(w, h) * 1.2, WASTES.window, 0.2 * on * (1 - haze))
  }
  // The body's transform: pitched about the hips' middle, bobbed and sat.
  const body = () => {
    p.translate(0, X(lift))
    p.translate(X(PIV[0]), X(PIV[1]))
    p.rotate(lean)
    p.translate(X(-PIV[0]), X(-PIV[1]))
  }
  // A module: drawn in the body's frame, moved and turned about its own base, fading as it goes.
  const module = (id: ModuleId, draw: () => void) => {
    const m = mods[id]
    const gone = clamp01(m?.gone ?? 0)
    if (gone >= 0.999) return
    const ctx = p.drawingContext as CanvasRenderingContext2D
    p.push()
    if (gone > 0) ctx.globalAlpha *= 1 - gone
    body()
    if (m) {
      const [px, py] = MODULE_PIVOT[id]
      p.translate(X(px + (m.dx ?? 0)), X(py + (m.dy ?? 0)))
      p.rotate(m.rot ?? 0)
      p.translate(X(-px), X(-py))
    }
    draw()
    p.pop()
  }

  p.push()
  p.rectMode(p.CORNER)
  p.strokeJoin(p.ROUND)

  // Legs: the far pair first (set back, darker), then the body, then the near pair over its belly.
  const feet = LEGS.map((leg) => footOf(pose, leg))
  // Sitting, the near legs tuck in under the body: they go behind the hull (what shows below the belly stays), their
  // front copy fading as it settles.
  const tuck = sit <= 0.35 ? 0 : sit >= 0.95 ? 1 : (() => { const v = (sit - 0.35) / 0.6; return v * v * (3 - 2 * v) })()
  const legs = (which: 'far' | 'near', a = 1) => {
    if (pose.noLegs || a <= 0.003) return
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const was = ctx.globalAlpha
    ctx.globalAlpha = was * a
    const under = sit * sit * (3 - 2 * sit)
    LEGS.forEach((leg, i) => {
      if (leg.far !== (which === 'far')) return
      const f = feet[i]
      const hip = bodyAt(pose, leg.hip)
      const color = mixHex(leg.far ? mixHex(ironDark, tone(WASTES.night), 0.2 + night * 0.2) : iron, ironDark, under * 0.7)
      drawLeg(p, k, W, INK, hip, f.at, color, Math.max(f.air * 0.8, sit * 0.35), under * 0.85)
    })
    ctx.globalAlpha = was
  }
  legs('far')
  // The near legs tucked behind the hull, once it has begun to sit.
  if (tuck > 0) legs('near')

  // The back turret: a tall stone tower at the stern with a slate cone, a gun out of it, and the flag on it.
  module('turretBack', () => {
    inked(stone)
    poly(p, k, [[-7.85, -12.0], [-5.45, -12.0], [-5.55, -20.0], [-7.95, -20.1]])
    p.noStroke()
    p.fill(stoneDark)
    poly(p, k, [[-7.85, -12.0], [-7.25, -12.0], [-7.35, -20.05], [-7.95, -20.1]])
    p.stroke(alpha(p, INK, 0.5))
    p.strokeWeight(W * 0.6)
    for (const y of [-14.5, -17.0, -19.2]) line([-7.9, y], [-5.5, y + 0.02])
    p.noFill()
    inked(stone)
    p.noFill()
    poly(p, k, [[-7.85, -12.0], [-5.45, -12.0], [-5.55, -20.0], [-7.95, -20.1]])
    inked(slate)
    poly(p, k, [[-8.35, -19.95], [-5.1, -19.95], [-6.55, -23.2], [-6.95, -23.75], [-7.05, -23.2]])
    p.stroke(alpha(p, INK, 0.45))
    p.strokeWeight(W * 0.55)
    line([-7.95, -20.9], [-5.5, -20.9])
    line([-7.5, -21.9], [-5.95, -21.9])
    glass(-6.95, -18.85, 0.5, 0.85, 0.2)
    glass(-6.95, -16.35, 0.5, 0.85, 0.2)
    glass(-6.95, -13.95, 0.5, 0.75, 0.2)
    // A bartizan hung off its stern side on a corbel.
    inked(stoneDark, W * 0.9)
    poly(p, k, [[-8.85, -17.0], [-7.9, -17.0], [-8.2, -16.25]])
    inked(stone, W * 0.9)
    poly(p, k, [[-8.85, -18.35], [-7.9, -18.35], [-7.9, -17.0], [-8.85, -17.0]])
    inked(slate, W * 0.9)
    poly(p, k, [[-9.05, -18.3], [-7.75, -18.3], [-8.4, -19.45]])
    glass(-8.55, -18.05, 0.3, 0.55, 0.12)
  })
  module('cannonTop', () => {
    inked(ironDark)
    poly(p, k, taper([-7.7, -14.75], [-9.75, -15.55], 0.24, 0.19))
    inked(brass, W * 0.8)
    poly(p, k, taper([-9.55, -15.47], [-9.82, -15.58], 0.24, 0.24))
    inked(iron)
    p.rect(X(-8.2), X(-15.25), X(0.6), X(0.95), X(0.1))
  })
  module('flag', () => {
    const fl = t * 3.4
    p.stroke(INK)
    p.strokeWeight(W * 0.9)
    line([-6.9, -23.6], [-6.9, -25.65])
    // The pennant streams back (to the left) in the wind of the walk, rippling.
    const pts: Pt[] = []
    for (let i = 0; i <= 8; i++) {
      const v = i / 8
      pts.push([-6.9 - v * 1.7, -25.55 + v * 0.2 + Math.sin(fl - v * 3.2) * 0.13 * v])
    }
    for (let i = 8; i >= 0; i--) {
      const v = i / 8
      pts.push([-6.9 - v * 1.7, -25.55 + 0.52 - v * 0.3 + Math.sin(fl - v * 3.2) * 0.13 * v])
    }
    inked(tone(mixHex(DIAL.red, WASTES.rust, 0.35)), W * 0.75)
    poly(p, k, pts)
  })

  // The cottage on the deck: plaster and timber, a steep slate roof, a dormer; a tall narrow house squeezed in
  // behind it, and a crooked cabin perched on its ridge (the film's rooms on rooms).
  module('house', () => {
    // The narrow house: two storeys and a rust gable, a little balcony.
    inked(plaster)
    poly(p, k, [[-5.4, -12.25], [-3.2, -12.25], [-3.2, -17.3], [-5.4, -17.1]])
    p.stroke(timber)
    p.strokeWeight(W * 1.4)
    line([-5.35, -14.8], [-3.25, -14.85])
    p.stroke(INK)
    p.strokeWeight(W)
    p.noFill()
    poly(p, k, [[-5.4, -12.25], [-3.2, -12.25], [-3.2, -17.3], [-5.4, -17.1]])
    inked(rust)
    poly(p, k, [[-5.75, -17.0], [-2.95, -17.4], [-4.25, -19.0]])
    glass(-4.7, -16.6, 0.62, 0.85)
    glass(-4.7, -14.1, 0.62, 0.8)
    inked(wood, W * 0.8)
    p.rect(X(-5.9), X(-15.75), X(0.55), X(0.14))
    p.stroke(INK)
    p.strokeWeight(W * 0.7)
    line([-5.85, -15.75], [-5.85, -16.2])
    line([-5.85, -16.2], [-5.4, -16.2])
    // The cabin perched on the ridge, askew.
    p.push()
    p.translate(X(-1.15), X(-19.25))
    p.rotate(-0.08)
    inked(tone(mixHex(TOWN.plaster, WASTES.stone, 0.4)))
    poly(p, k, [[-0.75, 0.1], [0.75, 0.1], [0.75, -1.15], [-0.75, -1.15]])
    inked(rust)
    poly(p, k, [[-1.0, -1.1], [1.0, -1.1], [0.1, -2.05], [-0.1, -2.05]])
    glass(-0.3, -0.95, 0.55, 0.6)
    p.pop()
    inked(plaster)
    poly(p, k, [[-3.25, -12.25], [2.7, -12.25], [2.7, -16.3], [-3.25, -16.3]])
    // Its timbers: posts, a middle beam, a brace in each bay.
    p.stroke(timber)
    p.strokeWeight(W * 1.5)
    for (const x of [-3.05, -1.2, 0.7, 2.5]) line([x, -12.3], [x, -16.25])
    line([-3.2, -14.25], [2.65, -14.25])
    line([-3.05, -14.3], [-1.2, -16.2])
    line([0.7, -14.3], [2.5, -16.2])
    line([-1.2, -12.35], [0.7, -14.2])
    p.stroke(INK)
    p.strokeWeight(W)
    p.noFill()
    poly(p, k, [[-3.25, -12.25], [2.7, -12.25], [2.7, -16.3], [-3.25, -16.3]])
    glass(-2.55, -15.95, 0.72, 0.9)
    glass(-0.6, -15.95, 0.72, 0.9)
    glass(1.3, -13.95, 0.68, 0.85)
    glass(-2.45, -13.95, 0.62, 0.8)
    // The roof: steep slate, overhanging, with its courses.
    inked(slate)
    poly(p, k, [[-3.75, -16.2], [3.2, -16.2], [1.5, -19.25], [-1.95, -19.25]])
    p.stroke(alpha(p, INK, 0.4))
    p.strokeWeight(W * 0.55)
    for (const [y, a, b] of [[-17.1, -3.2, 2.7], [-18.05, -2.65, 2.15], [-18.8, -2.2, 1.75]] as [number, number, number][]) line([a, y], [b, y])
    // The dormer.
    inked(plaster)
    poly(p, k, [[-1.35, -16.9], [-0.15, -16.9], [-0.15, -17.9], [-1.35, -17.9]])
    inked(slate)
    poly(p, k, [[-1.6, -17.85], [0.1, -17.85], [-0.75, -18.65]])
    glass(-1.05, -17.75, 0.6, 0.7)
  })

  // Calcifer's chimney: a tall brick stack out of the roof, leaning a little back, an iron cowl on it.
  module('chimney', () => {
    const back = 0.14
    const col: Pt[] = [[0.12, -17.6], [1.3, -17.6], [1.3 - back, -22.05], [0.12 - back, -22.05]]
    inked(brick)
    poly(p, k, col)
    p.stroke(brickDark)
    p.strokeWeight(W * 0.5)
    for (let i = 0; i < 12; i++) {
      const y = -17.95 - i * 0.36
      const sh = ((y + 17.6) / -4.45) * back
      line([0.14 - sh, y], [1.28 - sh, y])
      const x = i % 2 ? 0.5 : 0.85
      line([x - sh, y], [x - sh, y + 0.36])
    }
    p.stroke(INK)
    p.strokeWeight(W)
    p.noFill()
    poly(p, k, col)
    p.noStroke()
    p.fill(alpha(p, tone(ROOM.soot), 0.55))
    poly(p, k, [[0.0, -21.3], [1.18, -21.3], [1.16, -22.05], [-0.02, -22.05]])
    inked(ironDark)
    poly(p, k, [[-0.2, -22.0], [1.4, -22.0], [1.36, -22.3], [-0.24, -22.3]])
  })

  // The pipes up the front, a valve, and a steam whistle.
  module('pipes', () => {
    for (const [x, top, c] of [[4.72, -16.5, iron], [5.02, -17.35, brass], [5.3, -15.9, rust]] as [number, number, string][]) {
      p.stroke(INK)
      p.strokeWeight(W * 3.2)
      line([x, -12.3], [x, top])
      p.stroke(c)
      p.strokeWeight(W * 1.8)
      line([x, -12.3], [x, top])
    }
    p.noFill()
    for (const [x, top] of [[4.72, -16.5], [5.3, -15.9]] as Pt[]) {
      for (const [c, w] of [[INK, 3.2], [iron, 1.8]] as [string, number][]) {
        p.stroke(c)
        p.strokeWeight(W * w)
        p.arc(X(x + 0.35), X(top), X(0.7), X(0.7), Math.PI, Math.PI * 1.5)
        line([x + 0.35, top - 0.35], [6.35, top - 0.35])
      }
    }
    inked(brass, W * 0.8)
    poly(p, k, [[4.86, -17.3], [5.18, -17.3], [5.26, -17.95], [4.78, -17.95]])
    inked(ironDark, W * 0.7)
    p.rect(X(4.85), X(-18.12), X(0.34), X(0.17))
    inked(tone(DIAL.red), W * 0.8)
    p.rect(X(4.5), X(-14.35), X(0.44), X(0.14), X(0.06))
  })

  // The front turret over the face, and a little rust-capped one beside it.
  module('turretFront', () => {
    inked(stone)
    poly(p, k, [[3.3, -12.25], [4.5, -12.25], [4.45, -15.55], [3.35, -15.55]])
    inked(rust)
    poly(p, k, [[3.05, -15.5], [4.75, -15.5], [3.95, -17.55], [3.85, -17.6]])
    glass(3.66, -14.9, 0.46, 0.7, 0.15)
    inked(stone)
    poly(p, k, [[6.25, -12.4], [8.15, -12.4], [8.1, -15.95], [6.3, -15.95]])
    p.noStroke()
    p.fill(stoneDark)
    poly(p, k, [[7.55, -12.4], [8.15, -12.4], [8.1, -15.95], [7.55, -15.95]])
    p.stroke(alpha(p, INK, 0.5))
    p.strokeWeight(W * 0.6)
    line([6.3, -14.4], [8.12, -14.4])
    p.stroke(INK)
    p.strokeWeight(W)
    p.noFill()
    poly(p, k, [[6.25, -12.4], [8.15, -12.4], [8.1, -15.95], [6.3, -15.95]])
    inked(slate)
    poly(p, k, [[5.9, -15.9], [8.5, -15.9], [7.45, -18.55], [7.15, -19.05], [7.05, -18.6]])
    p.stroke(alpha(p, INK, 0.45))
    p.strokeWeight(W * 0.55)
    line([6.25, -16.8], [8.15, -16.8])
    line([6.6, -17.7], [7.8, -17.7])
    glass(6.95, -15.45, 0.45, 0.8, 0.18)
  })

  // The hull: a great iron bulk, rounded under, plated, patched, with a fin on its side, its porch and door.
  module('hull', () => {
    inked(iron)
    poly(p, k, HULL)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    ctx.beginPath()
    HULL.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), X(y)) : ctx.moveTo(X(x), X(y))))
    ctx.closePath()
    ctx.clip()
    p.noStroke()
    p.fill(ironDark)
    poly(p, k, [...BELLY, ...BELLY.map(([x, y]) => [x, y - 1.05] as Pt).reverse()])
    p.stroke(INK)
    p.strokeWeight(W * 0.7)
    p.fill(rust)
    p.rect(X(-6.6), X(-12.0), X(1.8), X(1.15), X(0.08))
    p.fill(wood)
    p.rect(X(2.1), X(-11.85), X(2.0), X(1.2), X(0.05))
    p.stroke(alpha(p, INK, 0.5))
    p.strokeWeight(W * 0.5)
    for (const y of [-11.45, -11.05]) line([2.1, y], [4.1, y])
    p.stroke(INK)
    p.strokeWeight(W * 0.7)
    p.fill(tone(mixHex(WASTES.iron, WASTES.slate, 0.5)))
    p.rect(X(0.9), X(-9.5), X(1.7), X(1.25), X(0.05))
    p.stroke(alpha(p, INK, 0.45))
    p.strokeWeight(W * 0.6)
    p.noFill()
    for (const x of [-6.1, -3.7, -1.25, 1.35, 3.85, 5.65]) {
      p.beginShape()
      for (let i = 0; i <= 8; i++) {
        const v = i / 8
        p.vertex(X(x + Math.sin(v * Math.PI) * x * 0.035), X(-12.6 + v * 7))
      }
      p.endShape()
    }
    p.beginShape()
    for (let i = 0; i <= 16; i++) {
      const x = -8.7 + (i / 16) * 15.6
      p.vertex(X(x), X(-10.05 + 0.18 * Math.sin(x * 0.4)))
    }
    p.endShape()
    p.stroke(INK)
    p.strokeWeight(W * 0.7)
    p.fill(ironDark)
    p.rect(X(-2.35), X(-11.85), X(1.1), X(0.5), X(0.08))
    for (const x of [-2.1, -1.8, -1.5]) line([x, -11.78], [x, -11.42])
    ctx.restore()
    for (const [x, y] of [[-5.75, -9.75], [3.1, -9.55]] as Pt[]) {
      glass(x, y, 0.62, 0.7)
      inked(wood, W * 0.6)
      p.rect(X(x - 0.24), X(y), X(0.22), X(0.7))
      p.rect(X(x + 0.64), X(y), X(0.22), X(0.7))
    }
    // The face: the head over the front, and the dark of the mouth behind the jaw.
    inked(iron)
    poly(p, k, HEAD)
    p.noStroke()
    p.fill(tone(ROOM.hearth))
    poly(p, k, [[6.4, -9.2], [8.9, -9.3], [8.6, -8.95], [7.1, -8.82], [6.3, -8.4]])
    // The fin: an iron fin swept back along the side, flexing as it walks.
    p.push()
    p.translate(X(-3.0), X(-10.7))
    p.rotate(0.06 * Math.sin(2 * Math.PI * u - 1.2) * walking)
    p.translate(X(3.0), X(10.7))
    inked(tone(mixHex(WASTES.slate, WASTES.iron, 0.45)))
    poly(p, k, spline([[-2.7, -10.95], [-4.1, -11.3], [-5.9, -10.8], [-7.4, -9.6], [-5.8, -9.8], [-4.2, -10.0], [-2.8, -10.4]], 4))
    p.stroke(alpha(p, INK, 0.55))
    p.strokeWeight(W * 0.6)
    line([-3.1, -10.7], [-5.6, -10.6])
    line([-3.1, -10.6], [-6.6, -10.0])
    line([-3.1, -10.5], [-5.8, -9.85])
    p.pop()
    // The porch: a plank floor on iron brackets, a rail at its right end, a slate hood over the door.
    const [x0, x1] = CASTLE.porch
    const sy = CASTLE.door[1]
    inked(ironDark, W * 0.8)
    poly(p, k, [[x0 + 0.6, sy + 0.1], [x0 + 0.82, sy + 0.1], [x0 + 1.6, sy + 0.8], [x0 + 1.4, sy + 0.8]])
    poly(p, k, [[x1 - 0.5, sy + 0.1], [x1 - 0.72, sy + 0.1], [x1 - 1.5, sy + 0.78], [x1 - 1.3, sy + 0.78]])
    inked(wood)
    p.rect(X(x0), X(sy), X(x1 - x0), X(0.2), X(0.04))
    p.stroke(alpha(p, INK, 0.5))
    p.strokeWeight(W * 0.5)
    for (let x = x0 + 0.5; x < x1; x += 0.5) line([x, sy + 0.02], [x, sy + 0.18])
    p.stroke(INK)
    p.strokeWeight(W * 0.9)
    line([x1 - 0.1, sy], [x1 - 0.1, sy - 0.62])
    line([x1 - 0.1, sy - 0.6], [x1 - 0.85, sy - 0.6])
    line([x1 - 0.8, sy], [x1 - 0.8, sy - 0.62])
    const [dx, dy] = CASTLE.door
    p.push()
    p.translate(X(dx), X(dy))
    const glow = Math.max(lights, clamp01(pose.door ?? 0))
    drawDoor(p, k, W, INK, {
      open: pose.door ?? 0,
      dial: pose.dial ?? 0,
      wood: tone(ROOM.wood),
      woodDark: tone(ROOM.woodDark),
      view: (q, b) => {
        // Inside: the room's warm dark, the hearth's light low on the right.
        q.noStroke()
        q.fill(mixHex(ROOM.night, ROOM.woodDark, 0.35 + 0.3 * glow))
        q.rect(X(b.x0), X(b.y0), X(b.x1 - b.x0), X(b.y1 - b.y0))
        puff(q, k, b.x1 - 0.1, b.y1 - 0.5, 1.7, CALCIFER.body, 0.6 * glow)
        puff(q, k, b.x1 - 0.2, b.y1 - 0.4, 0.8, WASTES.window, 0.55 * glow)
      },
    })
    p.pop()
    inked(slate, W * 0.9)
    poly(p, k, [[dx - 0.95, dy - 2.62], [dx + 0.95, dy - 2.62], [dx + 0.8, dy - 2.9], [dx - 0.8, dy - 2.9]])
  })

  // The eye: a round window in a brass rim, under an iron brow; the teeth of the upper lip.
  module('eye', () => {
    const lit = Math.max(clamp01((lights - 0.1) / 0.3), clamp01(pose.eye ?? 0))
    inked(brass)
    p.circle(X(7.55), X(-11.05), X(1.28))
    inked(mixHex(ironDark, tone(WASTES.window), lit), W * 0.8)
    p.circle(X(7.55), X(-11.05), X(0.96))
    p.stroke(alpha(p, INK, 0.8))
    p.strokeWeight(W * 0.7)
    line([7.55, -11.5], [7.55, -10.6])
    line([7.1, -11.05], [8.0, -11.05])
    if (lit > 0.02) puff(p, k, 7.55, -11.05, 1.7, WASTES.window, 0.35 * lit)
    inked(ironDark)
    poly(p, k, spline([[6.55, -11.45], [7.3, -12.0], [8.3, -11.95], [8.85, -11.5], [8.2, -11.65], [7.4, -11.7], [6.7, -11.25]], 4))
    inked(plaster, W * 0.6)
    for (let i = 0; i < 5; i++) {
      const x = 7.0 + i * 0.42
      poly(p, k, [[x - 0.13, -8.93], [x + 0.13, -8.93], [x + 0.02, -8.6]])
    }
  })

  // The nose: a cannon out of the face.
  module('nose', () => {
    inked(ironDark)
    poly(p, k, taper([8.9, -10.15], [10.75, -10.3], 0.24, 0.19))
    inked(brass, W * 0.8)
    poly(p, k, taper([10.55, -10.28], [10.85, -10.31], 0.25, 0.25))
    poly(p, k, taper([8.95, -10.15], [9.2, -10.17], 0.3, 0.3))
  })

  // The jaw: a hinged iron plate with teeth, working as it walks, and the drawbridge tongue hanging from it.
  module('jaw', () => {
    const open = (0.05 + 0.07 * Math.max(0, Math.sin(2 * Math.PI * (u - 0.15)))) * walking + 0.35 * clamp01(pose.jaw ?? 0)
    p.push()
    p.translate(X(6.45), X(-8.35))
    p.rotate(open)
    p.translate(X(-6.45), X(8.35))
    const sw = (0.18 * Math.sin(2 * Math.PI * u - 2.0) + 0.1) * walking
    const hx = 9.05
    const hy = -8.45
    const L = 1.85
    const tx = hx + Math.sin(sw) * L
    const ty = hy + Math.cos(sw) * L
    p.stroke(INK)
    p.strokeWeight(W * 0.6)
    line([hx - 0.15, hy], [tx - 0.15, ty])
    inked(wood, W * 0.85)
    poly(p, k, [[hx - 0.05, hy], [hx + 0.38, hy + 0.02], [tx + 0.38, ty], [tx - 0.05, ty]])
    p.stroke(alpha(p, INK, 0.5))
    p.strokeWeight(W * 0.5)
    for (let i = 1; i < 4; i++) {
      const v = i / 4
      line([hx - 0.05 + (tx - hx) * v, hy + (ty - hy) * v], [hx + 0.38 + (tx - hx) * v, hy + (ty - hy) * v])
    }
    inked(rust)
    poly(p, k, [[6.4, -8.5], [9.3, -8.7], [9.42, -8.35], [8.8, -7.98], [6.55, -7.92]])
    inked(plaster, W * 0.6)
    for (let i = 0; i < 5; i++) {
      const x = 7.2 + i * 0.42
      poly(p, k, [[x - 0.12, -8.6], [x + 0.12, -8.61], [x, -8.95]])
    }
    p.pop()
  })

  // The near legs over the belly (fading as they tuck in).
  legs('near', 1 - tuck)

  // The stair: five nested sections on a hinge under the porch's left end, each lower one sliding out of the one above.
  module('hull', () => {
    const st = clamp01(pose.stair ?? 0)
    const sw = pose.swing ?? 0
    const [ax, ay] = CASTLE.stairTop
    p.push()
    p.translate(X(ax), X(ay))
    p.rotate(sw)
    for (let i = SECTIONS - 1; i >= 0; i--) {
      const b = sectionEnd(i, st)
      const top = b - SEC
      const half = 0.26 - 0.022 * i
      const c = i % 2 ? ironDark : iron
      for (const y of [b - 0.9, b - 0.3]) {
        p.stroke(INK)
        p.strokeWeight(W * 2.3)
        line([-half, y], [half, y])
        p.stroke(wood)
        p.strokeWeight(W * 1.1)
        line([-half, y], [half, y])
      }
      inked(c, W * 0.8)
      p.rect(X(-half - 0.06), X(Math.max(0, top)), X(0.12), X(b - Math.max(0, top)), X(0.04))
      p.rect(X(half - 0.06), X(Math.max(0, top)), X(0.12), X(b - Math.max(0, top)), X(0.04))
    }
    // The foot plate at the bottom of the lowest section.
    const end = sectionEnd(SECTIONS - 1, st)
    inked(ironDark, W * 0.8)
    p.rect(X(-0.36), X(end - 0.06), X(0.72), X(0.12), X(0.04))
    // The hinge: an iron bracket under the porch's edge.
    inked(ironDark, W * 0.7)
    p.rect(X(-0.32), X(-0.05), X(0.64), X(0.16), X(0.03))
    p.pop()
  })

  // Steam out of the knees as each foot lands, and out of the whistle.
  const steam = clamp01(pose.steam ?? 1) * walking * (1 - haze * 0.6)
  if (steam > 0.01 && !pose.noLegs) {
    LEGS.forEach((leg, i) => {
      if (leg.far) return
      const f = feet[i]
      if (f.since > 1.0) return
      const hip = bodyAt(pose, leg.hip)
      const d = Math.min(CASTLE.thigh + CASTLE.shin - 0.01, Math.hypot(f.at[0] - hip[0], f.at[1] - hip[1]))
      const a = Math.atan2(f.at[1] - hip[1], f.at[0] - hip[0])
      const off = Math.acos(Math.max(-1, Math.min(1, d / (2 * CASTLE.thigh))))
      const kx = hip[0] + Math.cos(a + off) * CASTLE.thigh
      const ky = hip[1] + Math.sin(a + off) * CASTLE.thigh
      const age = f.since
      for (let j = 0; j < 3; j++) {
        const g = age * (0.8 + 0.25 * j)
        puff(p, k, kx - 0.4 - g * 1.6 - j * 0.2, ky - 0.2 - g * 1.1, 0.35 + g * 0.9, tone(WASTES.steam), 0.5 * steam * (1 - age) * (1 - j * 0.25))
      }
    })
    if (!(mods.pipes && (mods.pipes.gone ?? 0) > 0.5)) {
      const [wx, wy] = bodyAt(pose, [5.02, -18.1])
      for (let j = 0; j < 3; j++) {
        const g = u * (0.8 + 0.3 * j)
        puff(p, k, wx - g * 1.2, wy - 0.3 - g * 1.6, 0.25 + g * 0.8, tone(WASTES.steam), 0.45 * steam * Math.max(0, 1 - u * 1.6) * (1 - j * 0.2))
      }
    }
  }

  // Dust where the feet land.
  const dust = clamp01(pose.dust ?? 0) * (1 - haze * 0.5)
  if (dust > 0.01 && !pose.noLegs) {
    const col = tone(mixHex(WASTES.rock, WASTES.mist, 0.45))
    LEGS.forEach((leg, i) => {
      const f = feet[i]
      if (f.since > 1.2 || f.air > 0) return
      const age = f.since / 1.2
      const [fx, fy] = f.at
      for (let j = 0; j < 4; j++) {
        const side = j % 2 ? 1 : -1
        const spread = 0.4 + age * (1.3 + j * 0.25)
        puff(p, k, fx + 0.5 + side * spread, fy - 0.15 - age * 0.35 * (1 + j * 0.3), 0.35 + age * 0.9, col, 0.4 * dust * (1 - age) * (leg.far ? 0.6 : 1), 0.6)
      }
    })
  }

  // Calcifer's roar: a flare of his fire up out of the chimney's mouth.
  const roar = clamp01(pose.roar ?? 0)
  const [cx, cy] = bodyAt(pose, CASTLE.chimney)
  if (roar > 0.01 && !(mods.chimney && (mods.chimney.gone ?? 0) > 0.5)) {
    puff(p, k, cx, cy - 0.6, 3.2 * roar, CALCIFER.body, 0.35 * roar)
    p.noStroke()
    for (let i = 0; i < 3; i++) {
      const h = (1.2 + 1.1 * roar) * (1 - i * 0.28) * (0.85 + 0.15 * Math.sin(t * 17 + i * 2))
      const w = 0.62 - i * 0.14
      p.fill(alpha(p, [CALCIFER.edge, CALCIFER.body, CALCIFER.core][i], roar))
      p.beginShape()
      p.vertex(X(cx - w), X(cy + 0.1))
      p.bezierVertex(X(cx - w), X(cy - h * 0.5), X(cx - w * 0.2 + Math.sin(t * 11 + i) * 0.15), X(cy - h * 0.7), X(cx - 0.1 * i + Math.sin(t * 9 + i) * 0.2), X(cy - h))
      p.bezierVertex(X(cx + w * 0.3), X(cy - h * 0.6), X(cx + w), X(cy - h * 0.45), X(cx + w), X(cy + 0.1))
      p.endShape(p.CLOSE)
    }
  }

  // The smoke from Calcifer's chimney, when the caller has none of its own: soft rising volume, never outlined.
  const smoke = pose.smoke ?? 0
  if (smoke > 0.01 && !(mods.chimney && (mods.chimney.gone ?? 0) > 0.5)) {
    const col = tone(mixHex(WASTES.steam, WASTES.rock, 0.15))
    for (let i = 0; i < 9; i++) {
      const age = (t * 0.28 + i / 9) % 1
      const r = (0.55 + age * 2.6) * smoke
      const a = (1 - age) * (0.3 + 0.4 * Math.min(1, age * 6)) * 0.6 * smoke
      puff(p, k, cx - age * 3.6 + Math.sin(t * 0.7 + i * 2.1) * 0.35, cy - 0.3 - age * 5.2, r, col, a)
    }
  }
  p.pop()
}
