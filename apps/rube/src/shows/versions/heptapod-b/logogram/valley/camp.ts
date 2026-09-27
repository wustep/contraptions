import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha } from '../kit'
import { VALLEY } from '../worlds'
import { MEADOW } from './geo'

/**
 * The camp at the shell's foot (the valley builder's): where everything stands, and the standing hardware drawn in
 * the set. The base's machine (the generator, the lamp mast, the floodlights, the steps) is the base part's; the lift
 * is the lift builder's, and its footprint (x -4 to 3) is kept clear. Valley cells, y down, the meadow at y = 0.
 *
 * Left of the lift: the helideck (a raised deck of steel matting on a timber crib, its ramp down to the road), and
 * beyond it the tents and a truck by the road in. Right of the lift, past the open meadow (where Ian waits at the end,
 * nothing near him), more tents and the comms mast.
 */

/** The helideck: its ends and the top of its matting. The helicopter sets down on it. */
export const PAD = { x0: -34.5, x1: -19.6, top: MEADOW - 1.2 }

/** A rectangle from its left, top, width and height (the stage's rectMode is CENTER). */
export function box(p: p5, k: number, x: number, y: number, w: number, h: number): void {
  p.rect((x + w / 2) * k, (y + h / 2) * k, w * k, h * k)
}

function poly(p: p5, k: number, pts: Pt[]): void {
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

/** The helideck, its crib, and the ramp down to the road at its left end. */
export function drawPad(p: p5, k: number, ink: string, weight: number): void {
  const { x0, x1, top } = PAD
  const crib = mixHex(VALLEY.oliveDark, VALLEY.rock, 0.45)
  // The crib: a dark timber stack under the deck, posts along it.
  solid(p, ink, weight * 0.8, crib)
  box(p, k, x0 + 0.35, top + 0.14, x1 - x0 - 0.7, MEADOW - top - 0.14)
  p.noFill()
  p.stroke(alpha(p, ink, 0.45))
  p.strokeWeight(weight * 0.6)
  for (let x = x0 + 1.4; x < x1 - 0.8; x += 2.1) p.line(x * k, (top + 0.14) * k, x * k, MEADOW * k)
  p.line((x0 + 0.35) * k, (top + 0.5) * k, (x1 - 0.35) * k, (top + 0.5) * k)
  // The ramp at its left end, down to the road.
  solid(p, ink, weight * 0.8, VALLEY.pad)
  poly(p, k, [[x0 - 3, MEADOW], [x0 + 0.02, top], [x0 + 0.02, top + 0.14], [x0 - 2.6, MEADOW]])
  // The deck: steel matting, a lighter lip along its top.
  solid(p, ink, weight, VALLEY.pad)
  box(p, k, x0, top, x1 - x0, 0.14)
  p.noStroke()
  p.fill(mixHex(VALLEY.pad, VALLEY.sky, 0.35))
  box(p, k, x0 + 0.02, top + 0.015, x1 - x0 - 0.04, 0.035)
}

/** A long military tent, side on: walls, eaves, the roof up to its ridge; its foot at (x, MEADOW), `len` long. */
export function drawTent(p: p5, k: number, ink: string, weight: number, x: number, len: number, tone = VALLEY.olive): void {
  const wall = 1.25
  const ridge = 2.45
  const y = MEADOW
  solid(p, ink, weight, tone)
  poly(p, k, [[x, y], [x + len, y], [x + len, y - wall], [x + len - 0.9, y - ridge], [x + 0.9, y - ridge], [x, y - wall]])
  // The roof a shade lighter (the sky on it), the eave line, the seams down the walls.
  p.noStroke()
  p.fill(mixHex(tone, VALLEY.sky, 0.18))
  poly(p, k, [[x + 0.06, y - wall], [x + len - 0.06, y - wall], [x + len - 0.92, y - ridge + 0.05], [x + 0.92, y - ridge + 0.05]])
  outline(p, ink, weight * 0.6)
  p.line(x * k, (y - wall) * k, (x + len) * k, (y - wall) * k)
  p.stroke(alpha(p, ink, 0.35))
  for (let s = x + 1.6; s < x + len - 0.8; s += 1.7) p.line(s * k, (y - wall) * k, s * k, y * k)
  // A door flap, rolled up.
  p.stroke(ink)
  p.fill(mixHex(tone, '#000000', 0.35))
  box(p, k, x + len * 0.5 - 0.35, y - wall + 0.12, 0.7, wall - 0.12)
}

/** A cargo truck, side on, facing `dir` (1 right, -1 left), its rear at x on the road: cab, hood, canvas-covered bed. */
export function drawTruck(p: p5, k: number, ink: string, weight: number, x: number, dir: 1 | -1): void {
  const y = MEADOW
  p.push()
  p.translate(x * k, 0)
  p.scale(dir, 1)
  const X = (u: number) => u
  // The bed under its canvas, on its bows.
  solid(p, ink, weight, VALLEY.canvas)
  poly(p, k, [[X(0), y - 1.05], [X(3.4), y - 1.05], [X(3.4), y - 2.35], [X(3.15), y - 2.55], [X(0.25), y - 2.55], [X(0), y - 2.35]])
  p.noFill()
  p.stroke(alpha(p, ink, 0.35))
  p.strokeWeight(weight * 0.6)
  for (const u of [1.1, 2.25]) p.line(X(u) * k, (y - 2.55) * k, X(u) * k, (y - 1.05) * k)
  // The chassis, the cab and the hood.
  solid(p, ink, weight, VALLEY.oliveDark)
  box(p, k, 0, y - 1.05, 5.5, 0.32)
  solid(p, ink, weight, VALLEY.olive)
  poly(p, k, [[X(3.55), y - 0.8], [X(4.6), y - 0.8], [X(4.6), y - 2.25], [X(3.7), y - 2.25], [X(3.55), y - 2.05]])
  poly(p, k, [[X(4.6), y - 0.8], [X(5.55), y - 0.8], [X(5.55), y - 1.5], [X(4.6), y - 1.62]])
  // The cab's window.
  p.fill(mixHex(VALLEY.sky, VALLEY.steelDark, 0.35))
  poly(p, k, [[X(3.95), y - 1.55], [X(4.45), y - 1.55], [X(4.45), y - 2.08], [X(3.95), y - 2.08]])
  // Wheels.
  for (const u of [0.95, 2.05, 4.75]) {
    solid(p, ink, weight, ink)
    p.circle(X(u) * k, (y - 0.42) * k, 0.84 * k)
    solid(p, ink, weight * 0.6, VALLEY.steelDark)
    p.circle(X(u) * k, (y - 0.42) * k, 0.34 * k)
  }
  p.pop()
}

/** The comms mast: a tall lattice, guyed, a dish and a whip antenna at its head, a shelter at its foot. */
export function drawCommsMast(p: p5, k: number, ink: string, weight: number, x: number, t: number): void {
  const y = MEADOW
  const h = 17
  const w = 0.42
  // Guys, faint, from three heights to anchors on the meadow.
  p.stroke(alpha(p, ink, 0.28))
  p.strokeWeight(Math.max(0.5, weight * 0.45))
  for (const [hy, dx] of [[0.45, 5.5], [0.8, 8.5]] as const) {
    p.line(x * k, (y - h * hy) * k, (x - dx) * k, y * k)
    p.line(x * k, (y - h * hy) * k, (x + dx) * k, y * k)
  }
  // The lattice: two rails and a zig-zag of bracing between them.
  outline(p, ink, weight * 0.7)
  p.line((x - w / 2) * k, y * k, (x - w / 2) * k, (y - h) * k)
  p.line((x + w / 2) * k, y * k, (x + w / 2) * k, (y - h) * k)
  p.strokeWeight(weight * 0.45)
  p.beginShape()
  p.noFill()
  for (let i = 0; i <= 26; i++) p.vertex((x + (i % 2 ? w / 2 : -w / 2)) * k, (y - (h * i) / 26) * k)
  p.endShape()
  // The dish, side on (a shallow bowl on a bracket), and the whip, swaying a little.
  const dy = y - h * 0.78
  solid(p, ink, weight * 0.8, VALLEY.steel)
  p.beginShape()
  p.vertex((x + w / 2) * k, (dy - 0.75) * k)
  p.quadraticVertex((x + w / 2 + 0.55) * k, dy * k, (x + w / 2) * k, (dy + 0.75) * k)
  p.endShape(p.CLOSE)
  outline(p, ink, weight * 0.6)
  const sway = Math.sin(t * 0.7) * 0.12
  p.line(x * k, (y - h) * k, (x + sway) * k, (y - h - 2.4) * k)
  // The shelter at its foot.
  solid(p, ink, weight, VALLEY.canvas)
  box(p, k, x + 0.5, y - 1.5, 2.2, 1.5)
  p.fill(mixHex(VALLEY.canvas, '#000000', 0.3))
  box(p, k, x + 1.3, y - 1.1, 0.5, 1.1)
}

/** The gravel road in along the meadow's top, from the left hill's foot to the helideck's ramp. */
export function drawRoad(p: p5, k: number, x0: number, x1: number): void {
  p.noStroke()
  p.fill(VALLEY.road)
  box(p, k, x0, MEADOW, x1 - x0, 0.1)
  p.fill(mixHex(VALLEY.road, VALLEY.meadowDark, 0.5))
  box(p, k, x0, MEADOW + 0.1, x1 - x0, 0.05)
}

/** Where the standing camp's props are, for culling: each prop's x-extent and its height. */
export const CAMP_PROPS: { x0: number; x1: number; h: number; draw: (p: p5, k: number, ink: string, weight: number, t: number) => void }[] = [
  { x0: -62, x1: -54, h: 2.6, draw: (p, k, ink, w) => drawTent(p, k, ink, w, -62, 7.6) },
  { x0: -52.5, x1: -46, h: 2.6, draw: (p, k, ink, w) => drawTent(p, k, ink, w, -52.5, 6.2, mixHex(VALLEY.olive, VALLEY.canvas, 0.4)) },
  { x0: -45, x1: -39.5, h: 2.6, draw: (p, k, ink, w) => drawTruck(p, k, ink, w, -45, 1) },
  { x0: 30, x1: 37.6, h: 2.6, draw: (p, k, ink, w) => drawTent(p, k, ink, w, 30, 7.6) },
  { x0: 39, x1: 44.5, h: 2.6, draw: (p, k, ink, w) => drawTent(p, k, ink, w, 39, 5.5, mixHex(VALLEY.olive, VALLEY.canvas, 0.4)) },
  { x0: 40, x1: 58, h: 20, draw: (p, k, ink, w, t) => drawCommsMast(p, k, ink, w, 49, t) },
]
