import type p5 from 'p5'
import { outline, solid } from '../../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, fly, laneAt, ramp, rankBy, roll, wait, type Lane, type Pt, type Seg } from '../../../parts'
import { feltColor, string } from './hall'

/**
 * A staff, and the ball is the note. Five lines a quarter of a floor apart
 * between two bar posts, so the ball is exactly a space tall: the top line
 * is the rail it comes in on and the bottom line the rail it leaves by, and
 * the three between are strings. The top line stops at a lip. The ball
 * drops off it onto the first string, which takes it like a note on a line,
 * stretched to a V under it, holds it a moment, and lets it slip; it falls
 * a space onto the next, and the next, a note further along each time, each
 * string twanging straight behind it and sounding on. Off the last it lands
 * in the bottom space and rolls out along the bottom line: F, A, C, E,
 * going down.
 *
 * A string caught near one end is a lopsided V, steep on its short side,
 * and it shoves what it holds toward its long side. Dropped in near the
 * west post the ball is handed down the staff eastward and leaves heading
 * on; carried further along the top line and dropped in near the east post
 * it is handed back westward and leaves heading back. The clef stands at
 * the end the ball does not leave by, behind the lines.
 */
export interface StaffState {
  color: string
  turn: 1 | -1
  /** When each string catches the ball and when it lets go, in piece seconds. */
  catches: [number, number][]
}

/** Line spacing: a quarter of a floor, which is the ball's own height near enough. */
const S = 0.25
const lineY = (i: number) => FLOOR + i * S
/** The bar posts. */
const XW = -0.43
const XE = 1.43
/** Where the top line stops, going on and going back, and how far along the staff each string hands the ball. */
const LIP = { on: -0.15, back: 0.4 }
const STEP = 0.25
/** Cartoon gravity; how long a string holds its note. */
const G = 24
const HOLD = 0.1
/** A string stretches until the ball's centre is on its line. */
const SINK = R

function laneFor(turn: 1 | -1): { lane: Lane; catches: [number, number][] } {
  const lip = turn > 0 ? LIP.on : LIP.back
  const segs: Seg[] = [roll([-0.5, 0], [lip, 0], ROLL)]
  const catches: [number, number][] = []
  let t = segs[0].dur
  // Off the lip as a thing thrown level: down to where its foot meets the first string.
  const dy = lineY(1) - R
  const tf = Math.sqrt((2 * dy) / G)
  const touch: Pt = [lip + ROLL * tf, dy]
  segs.push(fly([lip, 0], touch, tf, dy / 4))
  t += tf
  // The string takes its way off it along the line it came down.
  const vy = G * tf
  const v = Math.hypot(ROLL, vy)
  const first: Pt = [touch[0] + (SINK * ROLL) / vy, lineY(1)]
  const brake = (2 * Math.hypot(first[0] - touch[0], SINK)) / v
  segs.push({ from: touch, to: first, dur: brake, ease: 'out' })
  let at = first
  let caught = t
  t += brake
  for (let i = 1; i <= 3; i++) {
    segs.push(wait(at, HOLD))
    t += HOLD
    catches.push([caught, t])
    // Let go down the string's long side: a fall to the next string's touch, and that string's catch.
    const next: Pt = [at[0] + turn * STEP, at[1] + S]
    const last = i === 3
    const drop = S - SINK
    const f = drop / S
    const mid: Pt = [at[0] + (next[0] - at[0]) * f, at[1] + drop]
    const len = Math.hypot(mid[0] - at[0], mid[1] - at[1])
    const td = Math.sqrt((2 * drop) / G)
    segs.push({ from: at, to: mid, dur: td, ease: 'in' })
    t += td
    if (last) {
      // The bottom line is a rail: it lands in the bottom space and rolls out, keeping the way it had along the staff.
      const vx = ((2 * len) / td) * (Math.abs(mid[0] - at[0]) / len)
      segs.push(ramp([mid[0], 1], [turn > 0 ? 1.5 : -0.5, 1], Math.max(1.2, vx), ROLL))
      break
    }
    const rest = Math.hypot(next[0] - mid[0], next[1] - mid[1])
    const tb = (td * rest) / len
    segs.push({ from: mid, to: next, dur: tb, ease: 'out' })
    caught = t
    t += tb
    at = next
  }
  return { lane: { segs, fire: catches[0][0] }, catches }
}
const LANES = { on: laneFor(1), back: laneFor(-1) }

/** A treble clef in ink, its curl round the G line at (x, y), a space `u` tall; `hand` -1 draws it the right way round in a mirrored piece. */
function clef(p: p5, k: number, ink: string, weight: number, x: number, y: number, u: number, hand: 1 | -1): void {
  const pts: Pt[] = [
    [-0.32, 1.72], [-0.05, 1.98], [0.22, 1.6], [0.1, 0.4], [-0.08, -1.3], [-0.18, -2.25], [0.12, -2.8], [0.42, -2.3], [0.1, -1.45],
    [-0.72, -0.35], [-0.5, 0.75], [0.3, 0.92], [0.78, 0.25], [0.3, -0.62], [-0.3, -0.28], [-0.18, 0.3],
  ]
  p.push()
  p.translate(x * k, y * k)
  p.scale(hand, 1)
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(weight * 1.5)
  p.beginShape()
  p.curveVertex(pts[0][0] * u * k, pts[0][1] * u * k)
  for (const [px, py] of pts) p.curveVertex(px * u * k, py * u * k)
  const end = pts[pts.length - 1]
  p.curveVertex(end[0] * u * k, end[1] * u * k)
  p.endShape()
  p.fill(ink)
  p.noStroke()
  p.circle(pts[0][0] * u * k, pts[0][1] * u * k, 0.3 * u * k)
  p.pop()
}

export const staff = definePiece<StaffState>({
  name: 'staff',
  weight: 1,
  place: ({ rng, color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]
    for (const turn of rankBy(rng, [1, -1] as const, () => 1)) {
      const exit: Pt = turn > 0 ? [2, 1] : [-1, 1]
      if (!fits(cells, exit)) continue
      const { lane, catches } = turn > 0 ? LANES.on : LANES.back
      return { cells, exit: { at: exit, dir: turn }, lane, state: { color: feltColor(theme, color, ball.color), turn, catches } }
    }
    return null
  },
  draw: (p, s, c) => {
    const { k, t, ink, weight } = c
    const { lane } = s.turn > 0 ? LANES.on : LANES.back
    const lip = s.turn > 0 ? LIP.on : LIP.back

    // The bar posts, standing on the floor below behind the lines, a cap on each.
    for (const x of [XW, XE]) {
      solid(p, ink, weight, s.color)
      p.rect(x * k, ((lineY(0) + 1.5) / 2) * k, 0.05 * k, (1.5 - lineY(0)) * k)
      p.rect(x * k, (lineY(0) - 0.02) * k, 0.09 * k, 0.04 * k, 0.01 * k)
    }
    // The clef, at the end the ball does not leave by, the right way round in either hand.
    const mirrored = c.spin(1) < c.spin(0)
    clef(p, k, ink, weight, s.turn > 0 ? -0.2 : 1.22, lineY(3), S * 0.92, mirrored ? -1 : 1)

    // The top line: the rail in to the lip, and on again past where the ball comes down through it.
    outline(p, ink, weight)
    p.line(-0.5 * k, lineY(0) * k, lip * k, lineY(0) * k)
    if (s.turn > 0) p.line((lip + 0.62) * k, lineY(0) * k, XE * k, lineY(0) * k)
    // The bottom line: the rail out, to whichever edge it leaves by.
    p.line((s.turn > 0 ? XW : -0.5) * k, lineY(4) * k, (s.turn > 0 ? 1.5 : XE) * k, lineY(4) * k)

    // The three strings: a V under the ball while one holds it, and sounding after it lets go.
    for (let i = 1; i <= 3; i++) {
      const [from, to] = s.catches[i - 1]
      const y = lineY(i)
      if (t >= from && t < to) {
        const at = laneAt(lane, t)
        outline(p, ink, weight)
        p.line(XW * k, y * k, at.x * k, (at.y + R) * k)
        p.line(at.x * k, (at.y + R) * k, XE * k, y * k)
      } else {
        const dt = t - to
        const amp = dt > 0 ? 0.045 * Math.exp(-dt * 2.6) : 0
        string(p, k, ink, weight * 1.4, XW, y, XE, y, amp, dt * 46)
      }
    }
  },
})
