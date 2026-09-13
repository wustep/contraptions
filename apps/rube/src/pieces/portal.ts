import { outline, solid } from '../../../../src/core/draw'
import { easeOutCubic } from '../../../../src/core/ease'
import { FLOOR, ROLL, TRANSIT, definePiece, over, post, rail, roll, type Lane, type Placement, type Pt } from '../parts'

/**
 * A portal: a standing ring on a post with a hole in the world inside it.
 * Every map begins at one and ends at one, and the far side of every portal
 * is a whole new map. The ball rolls up, is drawn out into a streak and
 * pulled into the eye; somewhere else the eye flares and pushes it out
 * onto a rail.
 *
 * Drawn in the same hand as everything else — one ring, one post, one
 * spiral — and told apart by which way the rail leads and which way the
 * spiral turns: in at an exit, out at an entry. It wakes as the ball comes
 * near: the eye brightens and a halo of ticks comes round the ring.
 *
 * The planner places portals by hand, so the piece weighs nothing.
 */
export interface PortalState {
  color: string
  /** 'in': the ball comes out of this one. 'out': it goes in. */
  kind: 'in' | 'out'
}

/** Where the ring stands, off the cell's centre toward the side the ball crosses. */
const RX = 0.12
const RING = { w: 0.46, h: 0.68 }
const BAND = 0.06
/** Where on the rail the pull begins, or the push ends. */
const REACH = 0.24
/** The eye sits a little above the ball's line; the ball is drawn up into it. */
const LIFT = 0.06
/** The ring stands on the rail line. */
const CY = FLOOR - RING.h / 2 + 0.02

export function portalPlacement(kind: 'in' | 'out', color: string): Placement<PortalState> {
  const state: PortalState = { color, kind }
  const x = kind === 'in' ? -RX : RX
  const eye: Pt = [x, CY + LIFT]
  const lane: Lane =
    kind === 'in'
      ? {
          segs: [
            { from: eye, to: [x + REACH, 0], dur: TRANSIT, ease: 'out', portal: 'in' },
            roll([x + REACH, 0], [0.5, 0], ROLL),
          ],
          fire: 0,
        }
      : {
          segs: [
            roll([-0.5, 0], [x - REACH, 0], ROLL),
            { from: [x - REACH, 0], to: eye, dur: TRANSIT, ease: 'in', portal: 'out' },
          ],
          fire: (0.5 + x - REACH) / ROLL,
        }
  return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane, state }
}

/** A point on an ellipse of half-axes (a, b) at angle `th`. */
const onEllipse = (cx: number, cy: number, a: number, b: number, th: number): Pt => [
  cx + Math.cos(th) * a,
  cy + Math.sin(th) * b,
]

export const portal = definePiece<PortalState>({
  name: 'portal',
  weight: 0,
  place: () => null,
  draw: (p, s, { k, t, since, ink, weight }) => {
    const x = s.kind === 'in' ? -RX : RX
    const { w, h } = RING
    const a = w / 2
    const b = h / 2
    const ia = a - BAND
    const ib = b - BAND
    const out = s.kind === 'out'

    // How awake the portal is: an exit charges as the ball approaches and
    // flares as it takes it; an entry flares as it delivers, then sleeps.
    const charge = out ? over(since, -0.8, 0) * (1 - over(since, TRANSIT, TRANSIT + 0.6)) : 1 - over(since, -0.5, 0.7)
    const spin = t * (0.8 + 4 * charge) * (out ? 1 : -1)

    // The rail, up to the ring or away from it, and the post it stands on.
    if (out) rail(p, k, ink, weight, -0.5, x)
    else rail(p, k, ink, weight, x, 0.5)
    post(p, k, ink, weight, x, CY + b - 0.02, 0.5)

    // The ring, and the hole in the world inside it.
    solid(p, ink, weight, s.color)
    p.ellipse(x * k, CY * k, w * k, h * k)
    p.fill(ink)
    p.ellipse(x * k, CY * k, ia * 2 * k, ib * 2 * k)

    // The vortex: one spiral in the ring's colour, turning in at an exit
    // and out at an entry.
    p.push()
    p.noFill()
    p.stroke(s.color)
    p.strokeWeight(weight)
    p.beginShape()
    const n = 40
    for (let j = 0; j <= n; j++) {
      const f = j / n
      const th = spin * 1.5 + f * Math.PI * 2 * 2.2
      const r = 0.9 * (1 - f * 0.88)
      const [px, py] = onEllipse(x, CY, ia * r, ib * r, th)
      p.vertex(px * k, py * k)
    }
    p.endShape()
    p.pop()

    // The eye, swelling with the charge, and the halo of ticks that comes
    // round the ring while it works.
    if (charge > 0.02) {
      p.push()
      p.noStroke()
      p.fill(s.color)
      p.ellipse(x * k, (CY + LIFT * 0.5) * k, ia * 1.1 * charge * k, ib * 1.1 * charge * k)
      p.pop()
      outline(p, ink, weight)
      for (let i = 0; i < 8; i++) {
        const th = -spin * 0.5 + (i / 8) * Math.PI * 2
        const [x0, y0] = onEllipse(x, CY, a + 0.05, b + 0.05, th)
        const [x1, y1] = onEllipse(x, CY, a + 0.05 + 0.08 * charge, b + 0.05 + 0.08 * charge, th)
        p.line(x0 * k, y0 * k, x1 * k, y1 * k)
      }
    }

    // The cut: one ring going out from the eye as the ball is taken, or delivered.
    const cut = out ? since - TRANSIT : since
    if (cut > 0 && cut < 0.45) {
      const f = easeOutCubic(over(cut, 0, 0.45))
      p.push()
      p.noFill()
      p.stroke(ink)
      p.strokeWeight(weight * 1.5 * (1 - f))
      p.ellipse(x * k, CY * k, (w + 0.7 * f) * k, (h + 0.7 * f) * k)
      p.pop()
    }
  },
})
