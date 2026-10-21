import { blob, curve, fill, mix, poly, rgba, stroke, type Paint } from '../draw'
import type { Pt } from '../path'
import { slope, surface } from './sea'

/**
 * A black ship: a long, low hull tarred black, its stern swept up and over like a scorpion's tail, a ram at the bow
 * under a painted eye, one mast and one square sail, a bank of oars, and the steering oar at the stern. The men sit
 * along the deck (balls, drawn by the stage); the deck is at DECK above the waterline, in the ship's own frame.
 */

/** The ship's length, in cells, and its deck's height over the waterline (its own frame: y up is negative). */
export const LENGTH = 4.4
export const DECK = -0.22

export interface Pose {
  x: number
  y: number
  /** Turned this far, radians, clockwise on the screen (bow down is positive when sailing right). */
  a: number
}

/** A ship's pose on the sea at `x`, `t`: riding the swell, leaning with it, with a little pitch of its own. */
export function floatAt(x: number, t: number, heave = 0): Pose {
  const y = surface(x, t) + heave
  const a = slope(x, t, LENGTH * 0.8) * 0.9
  return { x, y, a }
}

/** A point of the ship's own frame (cells from the waterline under its middle), in the world. */
export function onShip(p: Pose, local: Pt): Pt {
  const c = Math.cos(p.a)
  const s = Math.sin(p.a)
  return [p.x + local[0] * c - local[1] * s, p.y + local[0] * s + local[1] * c]
}

export interface ShipLook {
  /** The sail: 0 furled to the yard, 1 full. */
  sail: number
  /** How full of wind the sail is, -1 to 1 (bellied forward is positive). */
  belly?: number
  /** The oars' stroke, in strokes (a whole number is the catch). Left out, the oars are shipped. */
  stroke?: number
  /** The hull's colour (black, tarred), the trim, and the sail's. */
  hull?: string
  trim?: string
  canvas?: string
  /** The ink of every line. */
  ink: string
  /** Broken: 0 whole, 1 split in two at the mast (the storm). */
  broken?: number
  /** The mast gone (struck): 0 standing, 1 down. */
  mastDown?: number
  /** Facing: 1 sailing right, -1 left. */
  dir?: 1 | -1
  /** How far off it is (0 near, 1 at the horizon): paler and lighter-lined. */
  far?: number
  /** The air it is seen through, for `far`. */
  air?: string
}

/** The hull's outline in its own frame, bow to the right: the ram, the eye, the deck line, the stern's curl. */
const HULL: Pt[] = [
  [2.35, 0.12], // the ram's point, at the waterline
  [2.05, 0.06],
  [2.0, -0.2], // the stem
  [2.12, -0.42], // the bow's cap
  [1.9, -0.3],
  [1.3, DECK],
  [-1.2, DECK],
  [-1.75, -0.32],
  [-2.05, -0.6],
  [-2.1, -0.95], // the stern's tail, rising
  [-1.95, -1.18],
  [-1.8, -1.1], // and curling back over
  [-1.95, -0.88],
  [-1.98, -0.6],
  [-2.2, -0.2],
  [-2.05, 0.18],
  [-1.6, 0.38],
  [-0.5, 0.46], // the keel
  [0.9, 0.44],
  [1.75, 0.3],
]

export function drawShip(g: Paint, pose: Pose, look: ShipLook): void {
  const { ctx } = g
  const dir = look.dir ?? 1
  const far = look.far ?? 0
  const air = look.air ?? '#8899a0'
  const hull = mix(look.hull ?? '#1A1A1E', air, far * 0.8)
  const trim = mix(look.trim ?? '#9A4B2A', air, far * 0.8)
  const canvas = mix(look.canvas ?? '#D8CBB0', air, far * 0.7)
  const ink = mix(look.ink, air, far * 0.8)
  const lw = 2.2 * (1 - far * 0.6)
  ctx.save()
  ctx.translate(pose.x, pose.y)
  ctx.rotate(pose.a)
  ctx.scale(dir, 1)
  const broken = look.broken ?? 0
  const halves = broken > 0 ? 2 : 1
  for (let h = 0; h < halves; h++) {
    ctx.save()
    if (broken > 0) {
      // Split at the mast: the bow half pitches down and away, the stern half up and back.
      const side = h === 0 ? 1 : -1
      ctx.translate(side * 0.5 * broken, 0.9 * broken)
      ctx.rotate(side * 0.6 * broken)
      ctx.beginPath()
      ctx.rect(side > 0 ? 0.04 : -3, -2, 3, 3)
      ctx.clip()
    }
    drawOars(g, look, ink)
    // The hull.
    blob(ctx, HULL)
    fill(ctx, hull)
    stroke(g, ink, lw)
    // The trim along the gunwale, and the eye on the bow.
    poly(ctx, [[1.88, -0.27], [1.3, DECK + 0.06], [-1.2, DECK + 0.06], [-1.7, -0.27], [-1.68, -0.2], [-1.2, DECK + 0.13], [1.3, DECK + 0.13], [1.86, -0.2]])
    fill(ctx, trim)
    ctx.beginPath()
    ctx.ellipse(1.82, -0.06, 0.1, 0.06, 0, 0, Math.PI * 2)
    fill(ctx, mix('#E8DFC8', air, far * 0.7))
    ctx.beginPath()
    ctx.arc(1.84, -0.06, 0.035, 0, Math.PI * 2)
    fill(ctx, hull)
    // The steering oar at the stern.
    ctx.beginPath()
    ctx.moveTo(-1.5, -0.45)
    ctx.lineTo(-2.05, 0.55)
    stroke(g, ink, lw)
    poly(ctx, [[-1.98, 0.38], [-2.18, 0.72], [-2.1, 0.76], [-1.9, 0.42]])
    fill(ctx, hull)
    stroke(g, ink, lw * 0.8)
    ctx.restore()
  }
  // The mast and the sail stand on the deck at the middle, unless struck.
  const down = look.mastDown ?? 0
  if (down < 1 && broken < 0.5) {
    ctx.save()
    ctx.translate(0.15, DECK)
    ctx.rotate(-1.35 * down)
    const H = 2.4
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(0, -H)
    stroke(g, ink, lw * 1.3)
    // The yard, and the sail hung from it: furled up to the yard, or let down and filled.
    const yard = -H + 0.25
    ctx.beginPath()
    ctx.moveTo(-1.05, yard)
    ctx.lineTo(1.05, yard)
    stroke(g, ink, lw * 1.1)
    const s = Math.max(0, Math.min(1, look.sail))
    const belly = (look.belly ?? 0.5) * 0.28 * s
    if (s > 0.02) {
      const foot = yard + 0.12 + 1.6 * s
      ctx.beginPath()
      ctx.moveTo(-1.0, yard)
      ctx.lineTo(1.0, yard)
      ctx.quadraticCurveTo(1.0 + belly, (yard + foot) / 2, 0.95, foot)
      ctx.quadraticCurveTo(0, foot + belly * 0.4, -0.95, foot)
      ctx.quadraticCurveTo(-1.0 + belly, (yard + foot) / 2, -1.0, yard)
      ctx.closePath()
      fill(ctx, canvas)
      stroke(g, ink, lw * 0.9)
      // A band across the sail in the trim's colour: the one mark that tells this ship from far off.
      ctx.save()
      ctx.clip()
      ctx.fillStyle = rgba(trim, 0.85)
      ctx.fillRect(-1.3, yard + (foot - yard) * 0.42, 2.6, (foot - yard) * 0.16)
      ctx.restore()
    } else {
      // Furled: the sail bundled up along the yard, a slim roll in the canvas's own shadow, not a white disc.
      const roll = mix(canvas, ink, 0.3)
      ctx.beginPath()
      ctx.moveTo(-0.98, yard + 0.02)
      ctx.quadraticCurveTo(0, yard + 0.14, 0.98, yard + 0.02)
      ctx.lineTo(0.98, yard + 0.07)
      ctx.quadraticCurveTo(0, yard + 0.19, -0.98, yard + 0.07)
      ctx.closePath()
      fill(ctx, roll)
      stroke(g, ink, lw * 0.7)
    }
    // Stays from the masthead to the bow and the stern.
    ctx.beginPath()
    ctx.moveTo(0, -H)
    ctx.lineTo(1.7, 0.02)
    ctx.moveTo(0, -H)
    ctx.lineTo(-1.65, -0.05)
    stroke(g, rgba(ink, 0.6), Math.max(1.25, lw * 0.5))
    ctx.restore()
  }
  ctx.restore()
}

/** The oars, a bank of them along the side, sweeping on the stroke; or shipped, lying along the gunwale. */
function drawOars(g: Paint, look: ShipLook, ink: string): void {
  const { ctx } = g
  const n = 7
  const far = look.far ?? 0
  const lw = 1.8 * (1 - far * 0.6)
  for (let i = 0; i < n; i++) {
    const x = -1.05 + (2.1 * i) / (n - 1)
    let a0: Pt
    let a1: Pt
    if (look.stroke === undefined) {
      a0 = [x - 0.4, DECK + 0.02]
      a1 = [x + 0.5, DECK - 0.02]
    } else {
      // A stroke: the blade swings aft through the water and comes back over it.
      const ph = look.stroke - Math.floor(look.stroke)
      const sweep = Math.cos(ph * Math.PI * 2)
      const lift = ph < 0.5 ? 0 : Math.sin((ph - 0.5) * Math.PI * 2) * 0.12
      a0 = [x, DECK + 0.08]
      a1 = [x + 0.38 * sweep, 0.55 - lift]
    }
    ctx.beginPath()
    ctx.moveTo(a0[0], a0[1])
    ctx.lineTo(a1[0], a1[1])
    stroke(g, ink, lw)
  }
  void curve
}
