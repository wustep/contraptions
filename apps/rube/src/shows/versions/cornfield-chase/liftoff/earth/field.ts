import { outline, solid } from '../../../../../../../../src/core/draw'
import { clamp } from '../../../../../../../../src/core/ease'
import { FLOOR, R, laneAt, type Pt } from '../../../../../parts'
import { alpha, box, frame, hash, part, route, smooth, type Way } from '../kit'
import { DUST } from '../worlds'
import { cornWall, stalk } from './corn'
import { GOLD_POOL, HEAD_BACK, YARD_EXIT } from './yard'

/**
 * The irrigation channel along the top of the bank. The pump in the yard has
 * just filled its head and thrown the ball in, and the water carries it along
 * under the corn at an even pace. Across the channel are four flap gates,
 * boards hung from a bar; the floating ball shoulders each one open on a note
 * of the piano. At the end the channel spills over the edge of the bank, where
 * the truck is waiting below.
 *
 * She came down in the pool at the channel's head a note before him and waits
 * there; his splash sets her going, and she floats after him, a step behind.
 * A gate he opens does not close between them: its board lies on his back,
 * slides off onto hers, and slaps shut behind her.
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
/** The channel's head: back under the pump's spout, a pool. */
const HEAD = -HEAD_BACK
/** Where she comes down in the pool, in this frame. */
const POOL: Pt = [GOLD_POOL.p[0] - YARD_EXIT[0], GOLD_POOL.p[1] - YARD_EXIT[1]]
/** How far behind the channel's end she is when the truck takes her over, drifting at the water's pace. */
const HANDOFF_BACK = 1.15
/** How long she takes to get going once his splash reaches her. */
const GETAWAY = 0.44
/** A gate's board: how hard it falls (its hinge is stiff with dust), and the rate its swing is worked out at. */
const FALL = 90
const HINGE_DRAG = 3
const RATE = 240

interface Gate {
  x: number
  at: number
  strong: boolean
  /** The board's angle from `t0` (show time), RATE samples a second, and the show times it slaps shut. */
  t0: number
  swing: Float32Array
  slaps: number[]
}

interface RowState {
  gates: Gate[]
  length: number
  begin: number
}

/** How far a board has to be swung open (radians, downstream) to clear a ball at (x, y), hung at `gx`. */
function clearing(x: number, y: number, gx: number): number {
  const dx = x - gx
  const dy = y - HINGE
  const rho = Math.hypot(dx, dy)
  const r = R + 0.03
  if (rho <= r) return Math.PI / 2
  const phi = Math.atan2(dx, dy)
  let a = 0
  // Along its face, or, once the ball is past its reach, on its bottom edge.
  if (rho <= Math.hypot(FLAP, r)) a = phi + Math.asin(r / rho)
  else if (rho < FLAP + r) a = phi + Math.acos((FLAP * FLAP + rho * rho - r * r) / (2 * FLAP * rho))
  return Math.max(0, a)
}

/** A board's angle at show time `t`. */
function swingAt(g: Gate, t: number): number {
  const i = (t - g.t0) * RATE
  if (i <= 0 || i >= g.swing.length - 1) return 0
  const j = Math.floor(i)
  return g.swing[j] + (g.swing[j + 1] - g.swing[j]) * (i - j)
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
      const show = t + s.begin
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
      p.vertex((HEAD - 0.4) * k, (1 + FLOOR + 0.02) * k)
      p.vertex(HEAD * k, FLOOR * k)
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
      // The channel cut into the bank's top: its far wall and its bed, from the pool at its head.
      const mid = (HEAD + s.length + 0.5) / 2
      const span = s.length + 0.5 - HEAD
      solid(p, ink, weight, DUST.wood)
      p.rect(X(mid), X(FLOOR - 0.06), X(span), X(0.12))
      p.rect(X(mid), X(BED + 0.03), X(span), X(0.06))
      // The gates' bars and boards (the near wall and the water are drawn over the balls).
      for (const g of s.gates) {
        const a = swingAt(g, show)
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
        for (const at of g.slaps) {
          const shut = show - at
          if (shut <= 0 || shut >= 0.4) continue
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
      // The water over the balls' lower halves, and the channel's near wall, low so the balls show above it.
      const { k, ink, weight } = c
      const X = (x: number) => x * k
      const show = c.t + s.begin
      const mid = (HEAD + s.length + 0.5) / 2
      const span = s.length + 0.5 - HEAD
      p.noStroke()
      // The pool fills when the pump's water comes down into it.
      p.fill(alpha(p, DUST.teal, 0.55 * smooth(show, GOLD_POOL.at - 0.65, GOLD_POOL.at - 0.3)))
      p.rect(X(mid), X((WATER + BED) / 2), X(span), X(BED - WATER))
      p.stroke(alpha(p, DUST.light, 0.8 * smooth(c.t, -0.6, 0)))
      p.strokeWeight(Math.max(1, weight * 0.7))
      for (let i = 0; i < span * 3; i++) {
        const m = span - 0.2
        const x = HEAD + 0.1 + ((((i / 3 + c.t * PACE * 0.9) % m) + m) % m)
        p.line(X(x), X(WATER + 0.01), X(Math.min(x + 0.1, s.length + 0.5)), X(WATER + 0.01))
      }
      // Where each of them comes down in it: her in the pool, and him in front of her a note later.
      for (const [at, x] of [[GOLD_POOL.at, POOL[0]], [s.begin, -0.5]]) {
        const sp = show - at
        if (sp <= 0 || sp >= 0.6) continue
        const u = sp / 0.6
        p.noFill()
        p.stroke(alpha(p, DUST.teal, 1 - u))
        p.strokeWeight(Math.max(1, weight))
        p.ellipse(X(x), X(WATER - 0.02), X(0.3 + u * 0.6), X(0.06 + u * 0.08))
      }
      solid(p, ink, weight, DUST.wood)
      p.rect(X(mid), X(0.21), X(span), X(0.12))
    },
  },
  (slot) => {
    const at = (t: number) => t - slot.begin
    const length = PACE * (slot.end - slot.begin)
    const end = length - 0.5
    const gates: Gate[] = NOTES.map(([n, strong]) => ({ x: -0.5 + PACE * at(n) + 0.02, at: at(n), strong, t0: 0, swing: new Float32Array(0), slaps: [] }))
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
    const lane = { segs: route(ways), fire: gates[0].at }

    // Her: still in the pool until his splash reaches her, then getting going, and at the water's pace from there on,
    // so that she is HANDOFF_BACK short of the end at the hand-off, drifting, and no longer bobbing.
    const away = slot.end - GETAWAY / 2 - (length - HANDOFF_BACK - POOL[0]) / PACE
    const gold = (t: number): Pt => {
      let x = POOL[0]
      if (t > away + GETAWAY) x = POOL[0] + (PACE * GETAWAY) / 2 + PACE * (t - away - GETAWAY)
      else if (t > away) {
        const u = (t - away) / GETAWAY
        x = POOL[0] + PACE * GETAWAY * (u * u * u - (u * u * u * u) / 2)
      }
      const s = t - GOLD_POOL.at
      const land = s > 0 ? 0.05 * Math.exp(-s / 0.12) * Math.sin(s * 18) : 0
      const bob = 0.012 * Math.sin(s * 6.3) * smooth(t, GOLD_POOL.at + 0.15, GOLD_POOL.at + 0.6) * (1 - smooth(t, slot.end - 0.9, slot.end - 0.25))
      return [x, land + bob]
    }

    // The boards, worked out once: each lies on whichever ball is under it, and falls when there is none.
    // Past the hand-off both drift on at the water's pace (the truck's part has them there), well past the last gate.
    const drift = (x: number): Pt => [x, 0]
    const hero = (t: number): Pt => {
      if (t < slot.end) {
        const q = laneAt(lane, t - slot.begin)
        return [q.x, q.y]
      }
      return drift(end + PACE * (t - slot.end))
    }
    const her = (t: number): Pt => (t < slot.end ? gold(t) : drift(length - HANDOFF_BACK + PACE * (t - slot.end)))
    for (const g of gates) {
      g.t0 = slot.begin + g.at - 0.4
      const n = Math.ceil((slot.end + 1.6 - g.t0) * RATE)
      g.swing = new Float32Array(n)
      let a = 0
      let w = 0
      let need0 = 0
      for (let i = 0; i < n; i++) {
        const t = g.t0 + i / RATE
        const [hx, hy] = hero(t)
        const [gx, gy] = her(t)
        const need = Math.max(clearing(hx, hy, g.x), clearing(gx, gy, g.x))
        w += (-FALL * Math.sin(a) - HINGE_DRAG * w) / RATE
        a += w / RATE
        if (a < 0) {
          if (w < -1.5) g.slaps.push(t)
          a = 0
          w = -w * 0.25
        }
        if (a < need) {
          a = need
          w = Math.max(w, (need - need0) * RATE)
        }
        need0 = need
        g.swing[i] = a
      }
    }

    return {
      cells: box(HEAD - 1, -3, Math.ceil(length) + 1, 2),
      exit: [end + 0.5, 0],
      lane,
      state: { gates, length, begin: slot.begin },
      company: [{ from: GOLD_POOL.at, to: slot.end, at: (t) => { const [x, y] = gold(t); return { x, y } } }],
    }
  },
)
