import { FRIGATE, drawFrigate, type FrigateLook, type FrigatePose } from '../../craft/frigate'
import { HARKONNEN, drawThopter, drawThopterOver, seat, thopterLook, type ThopterPose } from '../../craft/thopter'
import { TICK } from '../../music'
import { circle, ellipse, fill, kick, line, mix, poly, rect, rgba, ring, smooth, smoother, stroke, vgrad, type Paint, type Pt } from '../../paint'
import { PAD } from '../../plan'
import { CRATE, FRIGATE_AT, FRIGATE_FOLD, HOOK, LEVER_END, LEVER_PIVOT, PULLEY, RAMP_FOOT, WINCH } from './geo'
import { ARRIVAL, ATTACK } from './times'

/**
 * The machines of Arrakeen: the frigate that brings the house down out of the fold onto the field, its hatch and its
 * ramp; the winch in the great hall that hangs the bull's head again, a notch for each of Paul's steps on its foot
 * lever; and the Harkonnen ornithopter that takes Paul and Jessica off the roof on the night.
 */

/** A cubic through [t, v] keys with its slopes eased to rest at the first and last. */
function through(keys: [number, number][]): (t: number) => number {
  const n = keys.length
  const m = keys.map((_, i) => {
    if (i === 0 || i === n - 1) return 0
    const [t0, v0] = keys[i - 1]
    const [t2, v2] = keys[i + 1]
    const a = (keys[i][1] - v0) / (keys[i][0] - t0)
    const b = (v2 - keys[i][1]) / (t2 - keys[i][0])
    return a * b <= 0 ? 0 : (2 * a * b) / (a + b)
  })
  return (t) => {
    if (t <= keys[0][0]) return keys[0][1]
    if (t >= keys[n - 1][0]) return keys[n - 1][1]
    let i = 0
    while (keys[i + 1][0] <= t) i++
    const [ta, va] = keys[i]
    const [tb, vb] = keys[i + 1]
    const h = tb - ta
    const u = (t - ta) / h
    const u2 = u * u
    const u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * va + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * vb + (u3 - u2) * h * m[i + 1]
  }
}

/* ------------------------------------------------------------------ the frigate */

const [d0, d1, d2] = ARRIVAL.descent
const descent = through([
  [d0, FRIGATE_FOLD[1]],
  [d1, FRIGATE_FOLD[1] + 1.2],
  [d2, -6.2],
  [ARRIVAL.touch, FRIGATE_AT[1]],
])

/** Where the frigate is: down out of the fold onto the field, a little give on its legs as it settles. */
export function frigateAt(t: number): FrigatePose {
  const y = descent(t) + 0.05 * ring(t, ARRIVAL.touch, 1.4, 0.4) - 0.03 * ring(t, ARRIVAL.settle, 1.8, 0.3)
  const burn = 1 - smooth(t, ARRIVAL.touch - 0.4, ARRIVAL.touch + 1.4)
  return { x: FRIGATE_AT[0], y, burn, reach: 1.2 + 0.8 * smooth(t, d2, ARRIVAL.touch) }
}

/** The legs, out from the hull as it comes down: 0 drawn up, 1 standing. */
const legs = (t: number) => smoother(t, d2, ARRIVAL.touch - 0.25)
/** The hatch's door going up into the hull, and the ramp running out of its sill down to the field. */
export const hatchOpen = (t: number): number => (t >= ATTACK.from ? 0 : smoother(t, ARRIVAL.settle, ARRIVAL.settle + 0.55))
export const rampOut = (t: number): number => (t >= ATTACK.from ? 0 : smoother(t, ARRIVAL.settle + 0.35, ARRIVAL.ramp))

/** The hatch in the frigate's side, in its own cells (east end, low), and its sill (where the ramp is hinged). */
const HATCH_L = { x0: 3.7, x1: 5.6, y0: -0.5, y1: 1.5 }
const sillOf = (p: FrigatePose): Pt => [p.x + HATCH_L.x1, p.y + HATCH_L.y1]
export const SILL: Pt = [FRIGATE_AT[0] + HATCH_L.x1, FRIGATE_AT[1] + HATCH_L.y1]

/** Where a ball of radius `r` stands in the hold, `dx` cells from the hatch's east edge (negative is further in). */
export function inHold(t: number, dx: number, r: number): Pt {
  const p = frigateAt(t)
  const [sx, sy] = sillOf(p)
  return [sx + dx, sy - r]
}

/** A ball of radius `r` on the ramp, `u` of the way from the sill to its foot. */
export function onRamp(u: number, r: number): Pt {
  const [sx, sy] = SILL
  const [fx, fy] = RAMP_FOOT
  const dx = fx - sx
  const dy = fy - sy
  const n = Math.hypot(dx, dy)
  return [sx + dx * u + (dy / n) * r, sy + dy * u - (dx / n) * r]
}

/** The frigate's look by day, and at night, dark on the field. */
const NIGHT_FRIGATE: FrigateLook = { ...FRIGATE, hull: mix(FRIGATE.hull, '#0E1320', 0.55), belly: mix(FRIGATE.belly, '#0E1320', 0.5), band: mix(FRIGATE.band, '#0E1320', 0.55), port: '#5B5E62' }

/** Under the balls: the legs, the hold's dark behind its hatch, and the ramp once it is down. */
export function drawFrigateUnder(g: Paint, t: number, night: boolean): void {
  const p = frigateAt(t)
  const ctx = g.ctx
  const look = night ? NIGHT_FRIGATE : FRIGATE
  // Legs: struts from the belly to pads on the ground.
  const out = legs(t)
  if (out > 0.01) {
    for (const lx of [-5.6, -2.2, 1.0, 3.0]) {
      const top: Pt = [p.x + lx, p.y + 1.6]
      const foot: Pt = [p.x + lx * 1.08, p.y + 1.6 + (FRIGATE_AT[1] + 2.6 - (p.y + 1.6)) * out + 0.0]
      line(g, top, foot, look.belly, 0.16)
      rect(ctx, foot[0] - 0.35, foot[1] - 0.08, 0.7, 0.1)
      fill(ctx, look.belly)
    }
  }
  // The hold, dark, seen through the hatch while it is open.
  if (hatchOpen(t) > 0.001) {
    // By day, dark high up inside and lighter toward its floor, where the light off the field comes in; the hull's
    // own thickness a shadow under the lintel.
    const y0 = p.y + HATCH_L.y0
    const y1 = p.y + HATCH_L.y1
    rect(ctx, p.x + HATCH_L.x0, y0, HATCH_L.x1 - HATCH_L.x0, y1 - y0)
    fill(ctx, night ? '#07090D' : vgrad(ctx, y0, y1, [[0, '#3C342C'], [0.5, '#5B4F42'], [1, '#76685A']]))
    if (!night) {
      rect(ctx, p.x + HATCH_L.x0, y0, HATCH_L.x1 - HATCH_L.x0, 0.22)
      fill(ctx, vgrad(ctx, y0, y0 + 0.22, [[0, rgba('#1C1916', 0.7)], [1, rgba('#1C1916', 0)]]))
    }
    // Its floor, where the family stands.
    rect(ctx, p.x + HATCH_L.x0, p.y + HATCH_L.y1 - 0.06, HATCH_L.x1 - HATCH_L.x0, 0.06)
    fill(ctx, mix(look.belly, '#000000', 0.3))
  }
  // The ramp, once it is out.
  const u = rampOut(t)
  if (u > 0.001) {
    const [sx, sy] = sillOf(p)
    const [fx, fy] = RAMP_FOOT
    const ex = sx + (fx - sx) * u
    const ey = sy + (fy - sy) * u
    const dx = fx - sx
    const dy = fy - sy
    const n = Math.hypot(dx, dy)
    // A plank with a deck: its top the colour of the hold's floor in the light, its edge darker under it.
    const th = 0.2
    poly(ctx, [[sx, sy], [ex, ey], [ex - (dy / n) * th, ey + (dx / n) * th], [sx - (dy / n) * th, sy + (dx / n) * th]])
    fill(ctx, mix(look.belly, '#000000', 0.2))
    poly(ctx, [[sx, sy], [ex, ey], [ex - (dy / n) * 0.07, ey + (dx / n) * 0.07], [sx - (dy / n) * 0.07, sy + (dx / n) * 0.07]])
    fill(ctx, mix(look.hull, '#D8C7A8', night ? 0.05 : 0.35))
  }
}

/** Over the balls: the hull (the family is behind it until the hatch is open), the hatch's door, and dust at the touch. */
export function drawFrigateOver(g: Paint, t: number, night: boolean, sand: string): void {
  const p = frigateAt(t)
  const ctx = g.ctx
  const look = night ? NIGHT_FRIGATE : FRIGATE
  const open = hatchOpen(t)
  ctx.save()
  if (open > 0.001) {
    // Everything but the hatch: the hold behind it shows, and whoever stands in it.
    ctx.beginPath()
    ctx.rect(p.x - 40, p.y - 40, 80, 80)
    ctx.rect(p.x + HATCH_L.x0, p.y + HATCH_L.y0, HATCH_L.x1 - HATCH_L.x0, HATCH_L.y1 - HATCH_L.y0)
    ctx.clip('evenodd')
  }
  drawFrigate(g, p, look)
  ctx.restore()
  // The hatch's door, sliding up into the hull.
  if (open < 0.999) {
    const h = (HATCH_L.y1 - HATCH_L.y0) * (1 - open)
    rect(ctx, p.x + HATCH_L.x0, p.y + HATCH_L.y0, HATCH_L.x1 - HATCH_L.x0, h)
    fill(ctx, mix(look.hull, look.belly, 0.35))
  }
  // Dust off the field where it touches: low flat drifts that spread and settle.
  const since = t - ARRIVAL.touch + 1.2
  if (!night && since > 0 && since < 7) {
    const grow = 1 - Math.exp(-since / 0.9)
    const a = 0.3 * smooth(since, 0, 0.6) * (1 - smooth(since, 2.0, 7))
    for (const [side, k] of [[-1, 1], [1, 0.9]] as [number, number][]) {
      const cx = FRIGATE_AT[0] + side * (6 + 8 * grow * k)
      ellipse(ctx, cx, -0.15 - 0.3 * grow * k, 5 * k + 4 * grow, 0.3 + 0.55 * grow * k, 0)
      fill(ctx, rgba(sand, a))
    }
  }
}

/* ------------------------------------------------------------------ the winch */

/** How far Paul's steps have pressed the foot lever down (0 up, 1 down) at `t`. */
export const press = (t: number): number => Math.min(1, ARRIVAL.pulls.reduce((s, at) => s + kick(t, at, 0.07, 0.36), 0))
/** The lever's angle down from its rest. */
const leverAngle = (t: number) => 0.34 * press(t)

/** The lever's end (the top of its bar there), where Paul lands. */
export function leverEnd(t: number): Pt {
  const a = leverAngle(t)
  const dx = LEVER_END[0] - LEVER_PIVOT[0]
  const dy = LEVER_END[1] - LEVER_PIVOT[1]
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [LEVER_PIVOT[0] + dx * c - dy * s, LEVER_PIVOT[1] + dx * s + dy * c]
}

/** Where the bull's plaque hangs from (its top): in the crate, then a notch up for each step on the lever. */
const IN_CRATE = -1.45
export function bullTop(t: number): Pt {
  const notch = (IN_CRATE - HOOK[1]) / ARRIVAL.pulls.length
  let up = 0
  for (const at of ARRIVAL.pulls) up += smoother(t, at, at + 0.2)
  const seat = 0.04 * ring(t, ARRIVAL.pulls[ARRIVAL.pulls.length - 1] + 0.2, 1.6, 0.35)
  return [HOOK[0], IN_CRATE - notch * up + seat]
}

/** The bull's swing on the chain, as each pull jerks it up. */
export const bullSwing = (t: number): number =>
  ARRIVAL.pulls.reduce((s, at) => s + 0.045 * ring(t, at + 0.12, 1.1, 0.55), 0) * (1 - smooth(t, ARRIVAL.pulls[3] + 0.15, ARRIVAL.pulls[3] + 0.3))

/** The winch on its frame by the wall, its chain over the pulley in the vault, the foot lever; the crate. */
export function drawWinch(g: Paint, t: number, iron: string, wood: string, chain: string): void {
  const ctx = g.ctx
  const [wx, wy] = WINCH
  // The frame: two legs to the floor.
  poly(ctx, [[wx - 0.5, 0], [wx - 0.08, wy - 0.05], [wx + 0.08, wy - 0.05], [wx + 0.5, 0], [wx + 0.36, 0], [wx, wy + 0.22], [wx - 0.36, 0]])
  fill(ctx, iron)
  // The chain: from the drum up to the pulley, and down to the plaque.
  const [bx, by] = bullTop(t)
  line(g, [wx - 0.12, wy - 0.3], [PULLEY[0] + 0.22, PULLEY[1]], chain, 0.045)
  line(g, [PULLEY[0] - 0.02, PULLEY[1] + 0.2], [bx, by], chain, 0.045)
  circle(ctx, PULLEY[0], PULLEY[1], 0.24)
  fill(ctx, iron)
  // The ratchet wheel, turned a tooth for each notch.
  const turn = ARRIVAL.pulls.reduce((s, at) => s + smoother(t, at, at + 0.2), 0) * ((Math.PI * 2) / 10)
  ctx.beginPath()
  for (let i = 0; i < 20; i++) {
    const a = turn + (i * Math.PI) / 10
    const r = i % 2 ? 0.3 : 0.4
    const x = wx + Math.cos(a) * r
    const y = wy + Math.sin(a) * r
    if (i) ctx.lineTo(x, y)
    else ctx.moveTo(x, y)
  }
  ctx.closePath()
  fill(ctx, iron)
  circle(ctx, wx, wy, 0.1)
  fill(ctx, mix(iron, '#000000', 0.4))
  // The foot lever.
  const [ex, ey] = leverEnd(t)
  line(g, [wx, wy], [ex, ey + 0.04], wood, 0.1)
  // The crate, open, its front over the head while the head is in it.
  rect(ctx, CRATE.x0, CRATE.top, CRATE.x1 - CRATE.x0, -CRATE.top)
  fill(ctx, wood)
}

/** The crate's front: drawn after the head, so the head is seen standing in it. */
export function drawCrateFront(g: Paint, wood: string): void {
  rect(g.ctx, CRATE.x0 - 0.05, CRATE.top + 0.15, CRATE.x1 - CRATE.x0 + 0.1, -CRATE.top - 0.15)
  fill(g.ctx, mix(wood, '#000000', 0.15))
}

/* ------------------------------------------------------------------ the Harkonnen ornithopter */

/** It comes in out of the east during the bombardment and sets down on the pad. */
export const HARK_IN: [number, number] = [ATTACK.terrace - 1.4, ATTACK.landed]
const PERCH: Pt = [PAD[0], PAD[1] - 0.6]
/** On the pad, its skids on the pad's top; up on the lift, and away east. */
export function harkAt(t: number): ThopterPose {
  const come = smoother(t, HARK_IN[0], HARK_IN[1])
  const fromX = PERCH[0] + 26 * (1 - come)
  const fromY = PERCH[1] - 10 * (1 - come) * (1 - come)
  const up = smoother(t, ATTACK.lift, ATTACK.lift + 1.2) * 1.4
  const go = Math.max(0, t - ATTACK.away)
  return { x: fromX + 4 * go * go, y: fromY - up - 2.2 * go * go, face: 1, pitch: 0.1 * smooth(t, ATTACK.away - 0.2, ATTACK.away + 0.6) - 0.08 * (1 - come) }
}
/** Its wings beat on the click while it flies, and lie back while it stands on the pad. */
const wingsOut = (t: number) => (1 - smooth(t, HARK_IN[1] - 0.2, HARK_IN[1] + 0.8)) + smooth(t, ATTACK.lift - 0.9, ATTACK.lift)
const harkLook = (t: number) =>
  thopterLook(HARKONNEN, ((t - HARK_IN[0]) / TICK) * Math.PI * 2, Math.min(1, wingsOut(t)), 1 - smooth(t, ATTACK.lift + 0.3, ATTACK.lift + 1.1))

/** Where its riders sit: the pilot and the guard in the nose, Paul and Jessica in the hold behind them. */
export const harkSeat = (t: number, i: 0 | 1): Pt => seat(harkAt(t), i)
export function harkHold(t: number, i: 0 | 1): Pt {
  const p = harkAt(t)
  const lx = i === 0 ? -0.18 : -0.52
  const ly = -0.02
  const a = (p.pitch ?? 0) * p.face
  return [p.x + lx * Math.cos(a) - ly * Math.sin(a), p.y + lx * Math.sin(a) + ly * Math.cos(a)]
}
/** The hold's doorway, set into the hull behind the cabin (the same opening as the storm's craft). */
const HARK_DOOR: Pt[] = [[-0.74, -0.22], [0.24, -0.26], [0.26, 0.17], [-0.7, 0.18]]
/** The hold's door: open while they are taken aboard, then shut over them. */
const holdShut = (t: number) => smoother(t, ATTACK.lift - 0.75, ATTACK.lift - 0.3)

export function drawHark(g: Paint, t: number): void {
  if (t < HARK_IN[0] || t > ATTACK.hall) return
  const p = harkAt(t)
  drawThopter(g, p, harkLook(t))
  // The hold's opening in the rear of the body: the hull's own dark, inside it, not a black hole.
  const ctx = g.ctx
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate((p.pitch ?? 0) * p.face)
  poly(ctx, HARK_DOOR)
  fill(ctx, mix(harkLook(t).body, '#000000', 0.6))
  ctx.restore()
}

export function drawHarkOver(g: Paint, t: number): void {
  if (t < HARK_IN[0] || t > ATTACK.hall) return
  const p = harkAt(t)
  const ctx = g.ctx
  // The hold's door, shutting over them.
  const shut = holdShut(t)
  if (shut > 0.001) {
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate((p.pitch ?? 0) * p.face)
    const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = HARK_DOOR
    poly(ctx, [[x0, y0], [x0 + (x1 - x0) * shut, y0 + (y1 - y0) * shut], [x3 + (x2 - x3) * shut, y3 + (y2 - y3) * shut], [x3, y3]])
    fill(ctx, mix(harkLook(t).body, '#000000', 0.12))
    stroke(g, rgba(harkLook(t).belly, 0.8), 0.02)
    ctx.restore()
  }
  drawThopterOver(g, p, harkLook(t))
}
