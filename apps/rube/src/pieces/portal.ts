import { outline, solid } from '../../../../src/core/draw'
import { easeOutCubic, seg } from '../../../../src/core/ease'
import { FLOOR, ROLL, TRANSIT, burst, definePiece, over, rail, roll, wait, type Lane, type Placement } from '../parts'

/**
 * A portal: a ring standing on the rail. The ball rolls into it and is gone,
 * or steps out of it and rolls on. Every section of the chain starts and
 * ends with one, and the pair at a universe's edges is the bigger kind — a
 * framed gate with antennae — so a hop between worlds reads as a bigger
 * event than a hop between rooms.
 *
 * The planner places portals by hand, so the piece weighs nothing.
 */
export interface PortalState {
  color: string
  kind: 'in' | 'out'
  /** The gate between universes. */
  hop: boolean
}

/** Where the ring stands: just inside the edge the ball crosses. */
const RING_X = 0.2
const RING_W = 0.17
const RING_H = 0.6
const HOP_H = 0.78

export function portalPlacement(kind: 'in' | 'out', hop: boolean, color: string): Placement<PortalState> {
  const x = kind === 'in' ? -RING_X : RING_X
  const lane: Lane =
    kind === 'in'
      ? { segs: [wait([x, 0], TRANSIT, { portal: 'in' }), roll([x, 0], [0.5, 0], ROLL)], fire: 0 }
      : { segs: [roll([-0.5, 0], [x, 0], ROLL), wait([x, 0], TRANSIT, { portal: 'out' })], fire: (0.5 + x) / ROLL }
  return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane, state: { color, kind, hop } }
}

export const portal = definePiece<PortalState>({
  name: 'portal',
  weight: 0,
  place: () => null,
  draw: (p, s, { k, t, since, ink, bg, weight, color }) => {
    const x = s.kind === 'in' ? -RING_X : RING_X
    const h = s.hop ? HOP_H : RING_H
    const cy = FLOOR - h / 2
    // The rail runs from the ring to the edge the ball rolls across.
    if (s.kind === 'in') rail(p, k, ink, weight, x, 0.5)
    else rail(p, k, ink, weight, -0.5, x)

    // A pedestal under the ring.
    solid(p, ink, weight, s.color)
    p.quad((x - 0.16) * k, (FLOOR + 0.1) * k, (x + 0.16) * k, (FLOOR + 0.1) * k, (x + 0.1) * k, FLOOR * k, (x - 0.1) * k, FLOOR * k)
    outline(p, ink, weight)
    p.line(x * k, (FLOOR + 0.1) * k, x * k, 0.5 * k)
    p.line((x - 0.12) * k, 0.5 * k, (x + 0.12) * k, 0.5 * k)

    if (s.hop) {
      // The frame: a taller gate with antennae, so a world's edge reads as one.
      outline(p, ink, weight)
      const fw = RING_W * 2.1
      p.rect(x * k, (cy - 0.02) * k, fw * k, (h + 0.16) * k, 0.06 * k)
      for (const dx of [-0.5, 0, 0.5]) {
        const ax = x + dx * fw * 0.8
        const top = cy - h / 2 - 0.1
        p.line(ax * k, top * k, ax * k, (top - 0.08 - Math.abs(dx) * 0.04) * k)
        solid(p, ink, weight, color)
        p.circle(ax * k, (top - 0.1 - Math.abs(dx) * 0.04) * k, 0.045 * k)
        outline(p, ink, weight)
      }
    }

    // The ring, and the hole in the world inside it. The hole breathes.
    const breathe = 1 + 0.06 * Math.sin(t * 2.4)
    solid(p, ink, weight, s.color)
    p.ellipse(x * k, cy * k, RING_W * 2 * k, h * k)
    solid(p, ink, weight, bg)
    p.ellipse(x * k, cy * k, RING_W * 1.1 * breathe * k, h * 0.72 * breathe * k)
    p.push()
    p.noFill()
    p.stroke(s.color)
    p.strokeWeight(weight * 0.8)
    for (let i = 1; i <= 2; i++) {
      const f = ((t * 0.5 + i / 2) % 1)
      p.ellipse(x * k, cy * k, RING_W * 1.1 * f * k, h * 0.72 * f * k)
    }
    p.pop()

    // The event: a wash of rings and spokes as the ball crosses.
    const active = s.kind === 'in' ? over(since, 0, 0.5) : over(since, 0, TRANSIT + 0.25)
    if (since >= 0 && active < 1) {
      const f = easeOutCubic(active)
      p.push()
      p.noFill()
      p.stroke(s.color)
      p.strokeWeight(weight * (1.6 - f))
      p.ellipse(x * k, cy * k, (RING_W * 2 + 0.5 * f) * k, (h + 0.5 * f) * k)
      p.stroke(ink)
      p.strokeWeight(weight)
      burst(p, x * k, cy * k, (0.14 + 0.3 * f) * k, (0.2 + 0.36 * f) * k, 8, f * 0.6)
      p.pop()
    }
    // A wink while a ball is waiting to be born: an 'in' portal fills a beat
    // before it delivers, so a cut to a new section is not a cut to nothing.
    if (s.kind === 'in' && since < 0 && since > -0.4) {
      const f = seg(since, -0.4, 0)
      p.push()
      p.noStroke()
      p.fill(s.color)
      p.ellipse(x * k, cy * k, RING_W * 1.1 * f * k, h * 0.72 * f * k)
      p.pop()
    }
  },
  // The near half of the ring is drawn in front of the ball, so the ball
  // visibly passes *through* it rather than over it.
  over: (p, s, { k, ink, weight }) => {
    const x = s.kind === 'in' ? -RING_X : RING_X
    const h = s.hop ? HOP_H : RING_H
    const cy = FLOOR - h / 2
    solid(p, ink, weight, s.color)
    p.arc(x * k, cy * k, RING_W * 2 * k, h * k, -Math.PI / 2, Math.PI / 2, p.CHORD)
    solid(p, ink, weight, s.color)
    p.arc(x * k, cy * k, RING_W * 2 * k, h * k, -Math.PI / 2, Math.PI / 2, p.OPEN)
  },
})
