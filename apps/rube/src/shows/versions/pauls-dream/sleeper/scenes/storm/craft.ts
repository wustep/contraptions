import { drift, fill, mix, poly, rgba, ring, smooth, stroke, type Paint, type Pt } from '../../paint'
import { TICK } from '../../music'
import { HARKONNEN, drawThopter, drawThopterOver, thopterLook, type ThopterLook, type ThopterPose } from '../../craft/thopter'
import { LANDING, STORM, T, backAt, frontAt, ground, keyed } from './geo'

/**
 * The Harkonnen ornithopter that carries Paul and Jessica out into the night, comes down on the dune when the Voice
 * turns its crew on each other, waits through the night by the tent, and at dawn is Paul's: up on the fill, east to the
 * storm, into it with its wings folded, and out of its back into the morning.
 *
 * Paul and Jessica ride its hold, behind the cabin, out of sight under a sliding door (`drawHold`, over the balls) that
 * opens once it is down.
 */

/** Where its skids put its middle when it stands on the floor at `x`. */
const standing = (x: number) => ground(x) - 0.6

const x = keyed([
  [T.dissolve, 707.2],
  [276.2, 712.3],
  [T.voice, 716.3],
  [277.6, 718.6],
  [278.2, 720.9],
  [T.land, LANDING],
  [T.lift, LANDING],
  [313.9, LANDING + 0.7],
  [T.wall, 724.6],
  [315, 727.6],
  [316, 732.8],
  [318, 744],
  [320, 755.5],
  [322, 766.5],
  [T.enter, STORM.front],
  [T.fold, 784.5],
  [326.5, 792.5],
  [328, 800],
  [329.5, 807.5],
  [331, 815],
  [332.4, 822],
  [T.burst, 828],
  [333.95, 832.4],
  [T.glide, 839],
  [336.2, 846],
])

const y = keyed([
  [T.dissolve, -3.3],
  [276.2, -3.15],
  [T.voice, -3.0],
  [277.5, -2.85],
  [278.1, -2.0],
  [278.55, standing(LANDING) - 0.1],
  [T.land, standing(LANDING)],
  [T.lift, standing(LANDING)],
  [313.9, standing(LANDING) - 0.5],
  [T.wall, -2.6],
  [315, -3.6],
  [316, -4.4],
  [318, -5.0],
  [320, -5.4],
  [322, -5.6],
  [T.enter, -5.7],
  [T.fold, -5.9],
  [325.6, -5.5],
  [326.6, -4.2],
  [327.6, -3.2],
  [328.7, -2.7],
  [330, -2.5],
  [331.5, -2.6],
  [332.6, -2.8],
  [T.open, -3.0],
  [333.7, -3.6],
  [334.3, -3.95],
  [T.glide, -3.9],
  [336.2, -3.4],
])

const pitch = keyed([
  [T.dissolve, 0.06],
  [T.voice, 0.06],
  [277.4, 0.3],
  [277.9, 0.42],
  [278.4, 0.22],
  [T.land, 0.07],
  [T.lift, 0.07],
  [313.9, -0.12],
  [T.wall, 0.02],
  [316, 0.1],
  [320, 0.08],
  [T.enter, 0.06],
  [T.fold, 0.05],
  [326.2, 0.32],
  [327.6, 0.24],
  [329, 0.08],
  [T.open, 0.06],
  [333.6, -0.16],
  [334.4, -0.06],
  [T.glide, 0.03],
  [336.2, 0.05],
])

/** How far into the storm it is: 0 outside, 1 a few cells in. */
export const inStorm = (px: number, t: number): number => smooth(px, frontAt(t) - 1, frontAt(t) + 4) * (1 - smooth(px, backAt(t) - 4, backAt(t) + 1))

/**
 * How the storm rolls it, radians: a slow roll one way and back over two or three seconds, with a smaller slower one
 * under it, never a judder. The camera inside drifts with it (`storm.ts`).
 */
export const wobble = (t: number): number => inStorm(x(t), t) * (0.17 * drift(t * 0.38, 47) + 0.05 * drift(t * 0.9, 48))

/** How far the storm heaves it up or down (cells), `s` how far into the storm it is. */
export const heaveAt = (t: number, s = inStorm(x(t), t)): number => s * (0.32 * drift(t * 0.9, 41) + 0.1 * drift(t * 1.7, 43))

export function pose(t: number): ThopterPose {
  const px = x(t)
  // Buffeted inside the storm: slow heaves and a slow roll.
  const s = inStorm(px, t)
  const heave = heaveAt(t, s)
  // The landing's jolt, rung down.
  const jolt = 0.07 * ring(t, T.land, 2.6, 0.22)
  return { x: px, y: y(t) + heave + jolt, face: 1, pitch: pitch(t) + wobble(t) }
}

/** The wings: beating as it flies, stuttering as it falls, folded on the dune, open at dawn, folded in the storm. */
function spread(t: number): number {
  if (t < T.voice) return 1
  if (t < T.land + 0.6) return 0.9 * (1 - smooth(t, T.voice, T.land + 0.5)) * (0.6 + 0.4 * Math.abs(Math.sin((t - T.voice) * 5)))
  if (t < T.board) return 0
  if (t < T.enter) return smooth(t, T.board + 0.05, T.lift + 0.1)
  if (t < T.open) return 1 - smooth(t, T.fold - 0.2, T.fold + 0.4)
  return smooth(t, T.open - 0.05, T.open + 0.35)
}

function gear(t: number): number {
  if (t < T.land) return smooth(t, 278.0, 278.55)
  if (t < T.lift) return 1
  return 1 - smooth(t, 313.8, 314.6)
}

export function look(t: number): ThopterLook {
  return thopterLook(HARKONNEN, ((t - 0.057) / TICK) * Math.PI * 2, spread(t), gear(t))
}

/** A point given in the thopter's own cells (facing right, its middle at the origin), in the world. */
export function onCraft(p: ThopterPose, [lx, ly]: Pt): Pt {
  const a = (p.pitch ?? 0) * p.face
  const c = Math.cos(a)
  const s = Math.sin(a)
  const lxx = lx * p.face
  return [p.x + lxx * c - ly * s, p.y + lxx * s + ly * c]
}

/** The hold, behind the cabin: where Paul and Jessica ride, bound. */
export const HOLD = { paul: [-0.12, 0.02] as Pt, jessica: [-0.5, 0.02] as Pt }

/** How far the hold's door has slid back (0 shut, 1 open): open from the hatch until dawn's boarding. */
export const door = (t: number): number => smooth(t, T.hatch, T.hatch + 0.45)

export function drawCraft(g: Paint): void {
  drawThopter(g, pose(g.t), look(g.t))
}

/**
 * Over the balls: the hold's side (so the two in it are out of sight), its sliding door, the glass and the near wings.
 * Once the door is open the hold is a dark doorway they come out of.
 */
export function drawCraftOver(g: Paint): void {
  const p = pose(g.t)
  const lk = look(g.t)
  const ctx = g.ctx
  const open = door(g.t)
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate((p.pitch ?? 0) * p.face)
  if (open < 0.999) {
    // The hull's side over the hold, in the hull's own colours, with the door's seam.
    poly(ctx, [[-0.86, -0.27], [0.33, -0.33], [0.36, 0.12], [0.36, 0.25], [-0.72, 0.23], [-0.9, -0.02]])
    fill(ctx, lk.body)
    poly(ctx, [[-0.82, 0.08], [0.36, 0.1], [0.36, 0.25], [-0.72, 0.23]])
    fill(ctx, lk.belly)
  }
  // The door: a panel over the hold, sliding back along the hull.
  const slide = -1.05 * open
  const fade = 1 - smooth(open, 0.75, 1)
  if (fade > 0.01) {
    poly(ctx, [[-0.74 + slide, -0.22], [0.24 + slide, -0.26], [0.26 + slide, 0.17], [-0.7 + slide, 0.18]])
    fill(ctx, rgba(mix(lk.body, '#000000', 0.12), fade))
    stroke(g, rgba(lk.belly, 0.8 * fade), 0.02)
  }
  ctx.restore()
  drawThopterOver(g, p, lk)
}

/** The doorway behind the balls once it is open: the dark of the hold. */
export function drawDoorway(g: Paint): void {
  const open = door(g.t)
  if (open <= 0.001) return
  const p = pose(g.t)
  const ctx = g.ctx
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate((p.pitch ?? 0) * p.face)
  poly(ctx, [[-0.74, -0.22], [0.24, -0.26], [0.26, 0.17], [-0.7, 0.18]])
  fill(ctx, rgba('#0B0C0E', open))
  ctx.restore()
}

/** Where the thopter is at `t` (for the camera and the hunters). */
export const craftAt = (t: number): Pt => {
  const p = pose(t)
  return [p.x, p.y]
}
