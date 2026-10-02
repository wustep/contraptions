import type p5 from 'p5'
import { solid } from '../../../../../../../../src/core/draw'
import type { Pt } from '../../../../../parts'
import { alpha, scenery } from '../kit'
import { DUST } from '../worlds'

/**
 * The drone they chase: a long solar wing, a little pod, twin booms. Drawn
 * from a little below and to the side, so the wing reads as a wing and not a
 * line: one long dark slab across a pale body, the silhouette you can pick
 * out of a dusty sky at a glance. It is scenery with a flight of its own
 * (`at`, show time to world cells), not a ball.
 */
export interface Flight {
  /** Where it is, its bank (radians), 0..1 for how much of it there is to see, the ground under it, and the sun off its wing (0..1). */
  at(t: number): { p: Pt; bank: number; seen: number; ground: number | null; glint?: number }
}

export const drone = scenery<Flight>({
  name: 'drone',
  draw: (p, s, c) => {
    const { p: at, bank, seen, ground, glint } = s.at(c.t)
    if (seen <= 0) return
    drawDrone(p, c.k, c.ink, c.weight, at, bank, seen, ground, glint ?? 0)
  },
})

/** Half-span of the near wing and the far one (foreshortened), and the chord at the root. */
const NEAR = 1.0
const FAR = 0.62
const CHORD = 0.17

/**
 * The drone at `at` (cells, in whatever frame the caller draws in), banked by
 * `bank`, `seen` its opacity, with its shadow on `ground` if given, and
 * `glint` (0..1) for the sun catching the near wing.
 */
export function drawDrone(p: p5, k: number, ink: string, weight: number, at: Pt, bank: number, seen = 1, ground: number | null = null, glint = 0): void {
  const X = (x: number) => x * k
  if (ground !== null) {
    p.noStroke()
    p.fill(alpha(p, ink, 0.1 * seen))
    p.ellipse(X(at[0] + 0.2), X(ground), X(1.7), X(0.14))
  }
  p.push()
  p.translate(X(at[0]), X(at[1]))
  p.rotate(bank)
  p.drawingContext.globalAlpha = seen
  const w = weight * 1.1
  // The far wing, behind the pod: up and back.
  wing(p, k, ink, w, [-0.02, -0.02], [-0.5, -FAR * 0.42], FAR, 0)
  // Booms and the tail.
  solid(p, ink, w * 0.8, DUST.bone)
  p.quad(X(-0.1), X(-0.03), X(-0.78), X(-0.02), X(-0.78), X(0.03), X(-0.1), X(0.04))
  p.quad(X(-0.74), X(-0.16), X(-0.66), X(-0.16), X(-0.62), X(0.03), X(-0.8), X(0.03))
  // The pod: a teardrop, a dark lens under its nose.
  solid(p, ink, w, DUST.bone)
  p.beginShape()
  p.vertex(X(0.3), X(0.0))
  p.bezierVertex(X(0.24), X(-0.12), X(-0.1), X(-0.11), X(-0.16), X(0.0))
  p.bezierVertex(X(-0.1), X(0.09), X(0.24), X(0.09), X(0.3), X(0.0))
  p.endShape(p.CLOSE)
  solid(p, ink, w * 0.6, ink)
  p.circle(X(0.14), X(0.075), X(0.06))
  // The prop behind the pod: a blur of a disc.
  p.noFill()
  p.stroke(alpha(p, ink, 0.45))
  p.strokeWeight(w * 0.7)
  p.ellipse(X(-0.2), 0, X(0.05), X(0.26))
  // The near wing, over the pod: down and toward us.
  wing(p, k, ink, w, [0.04, 0.02], [0.55, NEAR * 0.3], NEAR, glint)
  p.pop()
}

/** One wing from `root` out to `tip` (a direction scaled by `span`), a dark panel of cells, tapering; `glint` a flash of sun along it. */
function wing(p: p5, k: number, ink: string, weight: number, root: Pt, dir: Pt, span: number, glint: number): void {
  const X = (x: number) => x * k
  const len = Math.hypot(dir[0], dir[1])
  const ux = dir[0] / len
  const uy = dir[1] / len
  // Across the wing: its chord runs fore and aft, along the body.
  const tip: Pt = [root[0] + ux * span, root[1] + uy * span]
  const c0 = CHORD
  const c1 = CHORD * 0.6
  const pts: Pt[] = [
    [root[0] + c0 * 0.55, root[1]],
    [tip[0] + c1 * 0.5, tip[1]],
    [tip[0] - c1 * 0.5, tip[1] + 0.012],
    [root[0] - c0 * 0.45, root[1] + 0.02],
  ]
  solid(p, ink, weight, DUST.denim)
  p.beginShape()
  for (const [x, y] of pts) p.vertex(X(x), X(y))
  p.endShape(p.CLOSE)
  // The cells: short rules across the panel.
  p.stroke(alpha(p, DUST.sky, 0.7))
  p.strokeWeight(Math.max(0.8, weight * 0.45))
  for (let i = 1; i < 7; i++) {
    const u = i / 7
    const a: Pt = [pts[0][0] + (pts[1][0] - pts[0][0]) * u, pts[0][1] + (pts[1][1] - pts[0][1]) * u]
    const b: Pt = [pts[3][0] + (pts[2][0] - pts[3][0]) * u, pts[3][1] + (pts[2][1] - pts[3][1]) * u]
    p.line(X(a[0]), X(a[1]), X(b[0]), X(b[1]))
  }
  // The sun, running out along the wing on the downbeat.
  if (glint > 0.02) {
    const u = 1 - glint
    const a: Pt = [pts[0][0] + (pts[1][0] - pts[0][0]) * (0.1 + 0.7 * u), pts[0][1] + (pts[1][1] - pts[0][1]) * (0.1 + 0.7 * u)]
    p.stroke(alpha(p, '#FFFBEA', glint))
    p.strokeWeight(weight * 1.6)
    p.line(X(a[0] - ux * 0.12), X(a[1] - uy * 0.12 + 0.01), X(a[0] + ux * 0.12), X(a[1] + uy * 0.12 + 0.01))
  }
}
