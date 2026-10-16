import type { Pt } from '../../../../../parts'
import { frame, scenery, smooth } from '../kit'

/**
 * The docking port's iris, round the undock: the one change of world in Act II that is not inside a cloud or a room
 * waking up. On the second half of the last clamp's beat the port's diaphragm closes in from the frame's edges onto
 * the cockpit, until only he is left in a ring of steel. The stage changes world behind the blades (the hub's bay to
 * the outside), and on the cue's biggest step the iris opens again on the dark, its blades turning back as they go.
 *
 * It is drawn in both universes, the same both sides of the change (its own ink, not the theme's), centred on where
 * Cooper is at the change: the camera holds the ship still across it, so the ring does not move on the screen.
 */
export interface IrisState {
  /** Show time of the change of world (the undock). */
  at: number
  /** Where Cooper is at that moment, in world cells. */
  center: Pt
}

/** Seconds it takes to close, ending just before the change, and to open after it. */
const SHUT = 0.46
const OPEN = 0.72
/** The aperture at its tightest, in cells: the canopy and a little round it. */
const TIGHT = 0.46
const BLADES = 7
const INK = '#2A1F17'
const STEEL = ['#A39E92', '#948F84']
const LIP = '#6F6A60'

/** How far open the iris is at `t`: 1 is wide (gone past the frame), 0 shut to the cockpit. */
export function irisOpen(t: number, at: number): number {
  if (t < at) return 1 - smooth(t, at - SHUT - 0.04, at - 0.04)
  // Out fast on the step, easing as it clears the frame.
  const u = Math.max(0, Math.min(1, (t - at - 0.02) / OPEN))
  return 1 - (1 - u) ** 3
}

const make = (name: string, side: 'before' | 'after') =>
  scenery<IrisState>({
    name,
    draw: () => {},
    over: (p, s, c) => {
      const { k, t } = c
      if (side === 'before' ? t < s.at - SHUT - 0.04 || t >= s.at : t < s.at || t > s.at + OPEN + 0.04) return
      const open = irisOpen(t, s.at)
      const f = frame(p, k)
      const [cx, cy] = s.center
      // Far enough that a wide iris is wholly off the frame, whatever the zoom.
      const reach = Math.hypot(Math.max(Math.abs(f.x0 - cx), Math.abs(f.x1 - cx)), Math.max(Math.abs(f.y0 - cy), Math.abs(f.y1 - cy))) + 0.2
      const r = TIGHT + (reach * 1.08 - TIGHT) * open
      if (r >= reach * 1.07) return
      const X = (x: number) => x * k
      const ctx = p.drawingContext as CanvasRenderingContext2D
      const L = reach * 3 + r
      // The blades turn a little as they draw back, as a diaphragm's do.
      const turn = -0.9 * open
      const pts: { px: number; py: number; dx: number; dy: number }[] = []
      for (let i = 0; i < BLADES; i++) {
        const a = turn + (i / BLADES) * Math.PI * 2
        pts.push({ px: cx + r * Math.cos(a), py: cy + r * Math.sin(a), dx: -Math.sin(a), dy: Math.cos(a) })
      }
      ctx.save()
      ctx.lineJoin = 'round'
      // Each blade: from its tangent on the aperture out along its edge, back in along the next one's, and round the rim.
      for (let i = 0; i < BLADES; i++) {
        const a = pts[i]
        const b = pts[(i + 1) % BLADES]
        const a0 = turn + (i / BLADES) * Math.PI * 2
        ctx.beginPath()
        ctx.moveTo(X(a.px), X(a.py))
        ctx.lineTo(X(a.px + a.dx * L), X(a.py + a.dy * L))
        ctx.lineTo(X(b.px + b.dx * L), X(b.py + b.dy * L))
        ctx.lineTo(X(b.px), X(b.py))
        ctx.arc(X(cx), X(cy), X(r), a0 + (Math.PI * 2) / BLADES, a0, true)
        ctx.closePath()
        ctx.fillStyle = STEEL[i % 2]
        ctx.fill()
      }
      // Each blade lies over the next: a flat band of its shade along the edge it overlaps.
      ctx.fillStyle = 'rgba(42, 31, 23, 0.16)'
      ctx.beginPath()
      for (const q of pts) {
        const nx = q.dy
        const ny = -q.dx
        const b = 0.07
        ctx.moveTo(X(q.px), X(q.py))
        ctx.lineTo(X(q.px + q.dx * L), X(q.py + q.dy * L))
        ctx.lineTo(X(q.px + q.dx * L + nx * b), X(q.py + q.dy * L + ny * b))
        ctx.lineTo(X(q.px + nx * b), X(q.py + ny * b))
        ctx.closePath()
      }
      ctx.fill()
      // The edge of each blade, and the lip round the aperture: a darker band, then the ink.
      const w = Math.max(1, k * 0.012)
      ctx.strokeStyle = INK
      ctx.lineWidth = w
      ctx.beginPath()
      for (const q of pts) {
        ctx.moveTo(X(q.px), X(q.py))
        ctx.lineTo(X(q.px + q.dx * L), X(q.py + q.dy * L))
      }
      ctx.stroke()
      ctx.strokeStyle = LIP
      ctx.lineWidth = Math.max(1, X(0.035))
      ctx.beginPath()
      ctx.arc(X(cx), X(cy), X(r + 0.02), 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = INK
      ctx.lineWidth = w * 1.4
      ctx.beginPath()
      ctx.arc(X(cx), X(cy), X(r), 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    },
  })

/** The iris closing, in the hub's universe. */
export const irisShut = make('iris-shut', 'before')
/** The iris opening, outside. */
export const irisOpening = make('iris-open', 'after')
