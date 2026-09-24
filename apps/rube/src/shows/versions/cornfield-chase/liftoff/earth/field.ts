import { outline, solid } from '../../../../../../../../src/core/draw'
import { clamp, easeOutCubic } from '../../../../../../../../src/core/ease'
import { FLOOR, type Pt } from '../../../../../parts'
import { alpha, box, frame, hash, part, route, smooth, type Way } from '../kit'
import { DUST } from '../worlds'
import { cornWall, stalk } from './corn'

/**
 * The irrigation channel along the top of the bank. The pump in the yard has
 * just filled its head and thrown the ball in, and the water carries it along
 * under the corn at an even pace. Across the channel are four flap gates,
 * boards hung from a bar; the floating ball shoulders each one open on a note
 * of the piano and it slaps shut behind it. At the end the channel spills over
 * the edge of the bank, where the truck is waiting below.
 */

/** The gates, on the piano's notes as measured. The last is the strongest. */
const NOTES: [number, boolean][] = [[27.04, false], [28.108, false], [28.532, false], [28.955, true]]
export const ROW_NOTES = NOTES.map(([t]) => t)
/** Cells a second the water carries the ball. */
const PACE = 1.25
/** The water's surface and the channel's bed, in the part's cells (the ball's centre rides at 0); the gates' hinge bar. */
const WATER = 0.05
const BED = 0.3
const HINGE = -0.28
const FLAP = BED - HINGE - 0.02

interface RowState {
  gates: { x: number; at: number; strong: boolean }[]
  length: number
  begin: number
}

/** How far a gate is swung open (radians, downstream), `since` seconds after the ball reached it. */
function flapAt(since: number): number {
  if (since < -0.12) return 0
  if (since < 0) return 0.25 * easeOutCubic((since + 0.12) / 0.12)
  // Pushed wide as the ball goes under, then down, and a slap and a shiver as it shuts.
  const open = since < 0.25 ? 0.25 + 0.95 * easeOutCubic(since / 0.25) : 1.2 * Math.exp(-(since - 0.25) / 0.18)
  const shiver = since > 0.5 ? 0.08 * Math.exp(-(since - 0.5) / 0.15) * Math.sin((since - 0.5) * 40) : 0
  return Math.max(0, open) + shiver
}

export const cornrow = part<RowState>(
  {
    name: 'channel',
    draw: (p, s, c) => {
      const { k, t, ink, weight } = c
      const f = frame(p, k)
      const X = (x: number) => x * k
      const x0 = Math.max(-0.5, f.x0 - 1)
      const x1 = Math.min(s.length + 1.5, f.x1 + 1)
      // Behind: the field below the bank, a sea of tassels out to the dust.
      cornWall(p, k, ink, weight, { x0, x1, foot: 1 + FLOOR, h: 1.55, t, fill: DUST.husk, seed: 21, taper: [-0.5, s.length + 3] })
      // A few tall stalks on the bank behind the channel, leaning over it.
      for (let i = 0; i < 6; i++) {
        const x = -0.2 + i * 0.62 + hash(i, 3) * 0.2
        if (x > s.length) break
        stalk(p, k, ink, weight, { x, foot: FLOOR - 0.12, h: 1.9 + hash(i, 4) * 0.5, seed: 40 + i, sway: 0.12 + Math.sin(t * 0.9 + i) * 0.03, plain: i % 2 === 1 })
      }
      // The bank's face down to the field road.
      solid(p, ink, weight, DUST.shade)
      p.beginShape()
      p.vertex(-0.9 * k, (1 + FLOOR + 0.02) * k)
      p.vertex(-0.5 * k, FLOOR * k)
      p.vertex((s.length + 0.5) * k, FLOOR * k)
      p.vertex((s.length + 0.5) * k, (1 + FLOOR + 0.02) * k)
      p.endShape(p.CLOSE)
      p.stroke(alpha(p, ink, 0.3))
      p.strokeWeight(Math.max(1, weight * 0.6))
      for (let i = Math.floor(x0 / 0.37); i < x1 / 0.37; i++) {
        const gx = i * 0.37 + hash(i, 13) * 0.2
        if (gx < -0.4 || gx > s.length + 0.4) continue
        const gy = FLOOR + 0.4 + hash(i, 14) * 0.5
        p.line(gx * k, gy * k, (gx + 0.1) * k, gy * k)
      }
      // The channel cut into the bank's top: its far wall and its bed.
      solid(p, ink, weight, DUST.wood)
      p.rect(X(s.length / 2), X(FLOOR - 0.06), X(s.length + 1), X(0.12))
      p.rect(X(s.length / 2), X(BED + 0.03), X(s.length + 1), X(0.06))
      // The gates' bars and flaps (the near wall and the water are drawn over the ball).
      for (const g of s.gates) {
        const since = t - g.at
        const a = flapAt(since)
        outline(p, ink, weight)
        p.line(X(g.x - 0.12), X(HINGE), X(g.x + 0.12), X(HINGE))
        p.line(X(g.x - 0.1), X(HINGE), X(g.x - 0.1), X(FLOOR - 0.12))
        solid(p, ink, weight * 0.8, g.strong ? DUST.rust : DUST.wood)
        p.push()
        p.translate(X(g.x), X(HINGE))
        p.rotate(-a)
        p.rect(0, X(FLAP / 2), X(0.06), X(FLAP), X(0.01))
        p.pop()
        solid(p, ink, weight * 0.6, DUST.bone)
        p.circle(X(g.x), X(HINGE), X(0.06))
        // The slap as it shuts: a small splash either side.
        const shut = since - 0.55
        if (shut > 0 && shut < 0.4) {
          p.noStroke()
          p.fill(alpha(p, DUST.light, 0.9 * (1 - shut / 0.4)))
          for (const side of [-1, 1]) p.circle(X(g.x + side * (0.08 + shut * 0.4)), X(WATER - 0.04 - shut * 0.15 + shut * shut * 0.8), X(0.04))
        }
      }
      // At the end of the bank the channel spills over, down past the truck.
      const lip = s.length - 0.45
      p.noFill()
      p.stroke(alpha(p, DUST.teal, 0.8))
      p.strokeWeight(Math.max(1.5, k * 0.05))
      p.beginShape()
      for (let i = 0; i <= 10; i++) {
        const u = i / 10
        p.vertex(X(lip + 0.25 * u), X(WATER + 1.05 * u * u))
      }
      p.endShape()
    },
    over: (p, s, c) => {
      // The water over the ball's lower half, and the channel's near wall, low so the ball shows above it.
      const { k, ink, weight } = c
      const X = (x: number) => x * k
      p.noStroke()
      p.fill(alpha(p, DUST.teal, 0.55 * smooth(c.t, -0.25, 0.05)))
      p.rect(X(s.length / 2), X((WATER + BED) / 2), X(s.length + 1), X(BED - WATER))
      p.stroke(alpha(p, DUST.light, 0.8))
      p.strokeWeight(Math.max(1, weight * 0.7))
      for (let i = 0; i < s.length * 3; i++) {
        const x = -0.4 + ((i / 3 + c.t * PACE * 0.9) % (s.length + 0.8))
        p.line(X(x), X(WATER + 0.01), X(x + 0.1), X(WATER + 0.01))
      }
      solid(p, ink, weight, DUST.wood)
      p.rect(X(s.length / 2), X(0.21), X(s.length + 1), X(0.12))
    },
  },
  (slot) => {
    const at = (t: number) => t - slot.begin
    const length = PACE * (slot.end - slot.begin)
    const end = length - 0.5
    const gates = NOTES.map(([n, strong]) => ({ x: -0.5 + PACE * at(n) + 0.02, at: at(n), strong }))
    // Carried on the water at the stream's pace, bobbing a little, held back a moment at each gate.
    const ways: Way[] = [{ at: 0, p: [-0.5, 0] }]
    const steps = Math.ceil((slot.end - slot.begin) * 30)
    for (let i = 1; i <= steps; i++) {
      const tt = (i / steps) * (slot.end - slot.begin)
      let x = -0.5 + PACE * tt
      for (const g of gates) {
        const since = tt - g.at
        if (since > -0.15 && since < 0.2) x -= 0.03 * Math.sin(Math.PI * clamp((since + 0.15) / 0.35))
      }
      const bob = i === steps ? 0 : 0.015 * Math.sin(tt * 7)
      ways.push({ at: tt, p: [i === steps ? end : x, bob] as Pt })
    }
    return {
      cells: box(-1, -3, Math.ceil(length) + 1, 2),
      exit: [end + 0.5, 0],
      lane: { segs: route(ways), fire: gates[0].at },
      state: { gates, length, begin: slot.begin },
    }
  },
)
