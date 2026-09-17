import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeOutCubic } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, arrive, arriveAt, definePiece, over, post, rail, ramp, rankBy, trace, wait, type Lane, type PieceCtx, type Pt } from '../../parts'
import { tuft } from './green'

/**
 * A dandelion seed the size of a parasol, tethered to a peg: a cup for a
 * seed, two threads up from its rim to a stalk, and a fan of down on top.
 * The ball rolls off the path's end into the cup; the cup sinks under it
 * and the tether's loop slips off the peg; and the seed goes up on the
 * air, slowly, swinging from side to side and leaning into each swing, a
 * floor or two, with the small seeds off the dandelion clock at its foot
 * drifting up after it. At the top its stalk snags in the fork of a twig;
 * the cup swings on under it, tips, and the ball rolls out onto the rail,
 * on or back. The seed stays caught in the fork, tugging at it.
 *
 * Seed and ball are one motion: the lane is traced from the same function
 * the seed is drawn with, so the ball is in the cup the whole way up.
 */
export interface DandelionState {
  color: string
  floors: number
  turn: 1 | -1
}

const EDGE = -0.17
const ARRIVE = arriveAt(0)
const JOLT = 0.32
const FIRE = ARRIVE + JOLT
const riseTime = (floors: number) => 0.8 + 0.65 * floors
/** It docks a hair above the rail, so the ball rolls down out of the cup. */
const HOLD = 0.04
const SWING = 0.1
const PERIOD = 1.05
const DOCK = 0.1
/** The cup gives this much under the ball, over this long; that is what slips the tether. */
const SINK = 0.022
const GIVE = 0.08
const SPILL = 0.2
/** The cup: how wide, where its rim is against the ball's centre, and the seed's point under it. */
const CUP_W = 0.31
const RIM = 0.035
const POINT = 0.31
/** The threads join here above the ball's centre; the stalk runs on up to the hub, where the down fans out. */
const KNOT = -0.19
const HUB = -0.29
/** The down's reach: wide and shallow, a parasol. */
const DOWN: Pt = [0.29, 0.17]
const PEG: Pt = [0.1, 0.5]
const CLOCK: Pt = [0.3, 0.27]

/** Where the cup's seat is, `u` seconds after it lifts off: up, easing, and swinging less the nearer it gets. */
function seatAt(u: number, floors: number): Pt {
  const f = over(u, 0, riseTime(floors))
  const swing = SWING * Math.sin((2 * Math.PI * u) / PERIOD) * Math.sin(Math.PI * f) * (1 - 0.6 * f)
  return [swing, SINK * (1 - over(u, 0, 0.25)) - (floors + HOLD) * easeInOutSine(f)]
}
/** How it leans: into the swing, by how fast it is going sideways. */
const leanAt = (u: number, floors: number) => (u <= 0 || u >= riseTime(floors) ? 0 : -0.5 * ((seatAt(u + 0.02, floors)[0] - seatAt(u - 0.02, floors)[0]) / 0.04))

export const dandelion = definePiece<DandelionState>({
  name: 'dandelion',
  weight: 0.9,
  place: ({ rng, color, fits, taste }) => {
    const tall = taste.weights['lift-tall'] ?? 1
    const options = rng.shuffle([1, 2].flatMap((floors) => [1, -1].map((turn) => ({ floors, turn: turn as 1 | -1 }))))
    for (const { floors, turn } of rankBy(rng, options, (o) => Math.pow(tall, o.floors - 1))) {
      const cells: Pt[] = []
      for (let i = 0; i <= floors; i++) cells.push([0, -i])
      const exit: Pt = [turn, -floors]
      if (!fits(cells, exit)) continue
      const rise = riseTime(floors)
      const docked: Pt = [0, -floors - HOLD]
      const lane: Lane = {
        segs: [
          ...arrive([-0.5, 0], [0, 0]),
          { from: [0, 0], to: [0, SINK], dur: GIVE, ease: 'out' },
          wait([0, SINK], JOLT - GIVE),
          ...trace((t) => seatAt(t - FIRE, floors), FIRE, FIRE + rise, 16 + 14 * floors),
          wait(docked, DOCK),
          ramp(docked, [turn * SPILL, -floors], 0, 1.4),
          ramp([turn * SPILL, -floors], [turn * 0.5, -floors], 1.4, ROLL),
        ],
        fire: FIRE,
      }
      return { cells, exit: { at: exit, dir: turn }, lane, state: { color, floors, turn } }
    }
    return null
  },
  draw: (p, s, c) => {
    const { k, t, since, ink, bg, weight } = c
    const { floors, turn } = s
    const top = -floors
    const rise = riseTime(floors)
    const slipped = t > ARRIVE + GIVE

    // The path in, the ground, the peg the seed was tied to.
    rail(p, k, ink, weight, -0.5, EDGE)
    post(p, k, ink, weight, EDGE - 0.06)
    outline(p, ink, weight)
    p.line(-0.5 * k, 0.5 * k, 0.5 * k, 0.5 * k)
    tuft(p, k, ink, weight, -0.3, 0.5, 0.08, 0.02)
    outline(p, ink, weight * 1.3)
    p.line(PEG[0] * k, PEG[1] * k, (PEG[0] + 0.03) * k, (PEG[1] - 0.09) * k)
    // The dandelion clock at its foot: a globe of down until the seed goes up, a bald knob with a straggler or two after.
    const bald = easeOutCubic(over(since, 0, 0.5))
    outline(p, ink, weight)
    p.noFill()
    p.beginShape()
    p.vertex((CLOCK[0] + 0.02) * k, 0.5 * k)
    p.quadraticVertex((CLOCK[0] + 0.05) * k, 0.4 * k, CLOCK[0] * k, CLOCK[1] * k)
    p.endShape()
    outline(p, ink, weight * 0.6)
    for (let i = 0; i < 12; i++) {
      // The stragglers stay; the rest go.
      const keep = i === 2 || i === 9 ? 1 : 1 - bald
      if (keep <= 0.02) continue
      const a = (i / 12) * Math.PI * 2 + 0.2
      p.line(CLOCK[0] * k, CLOCK[1] * k, (CLOCK[0] + Math.cos(a) * 0.075 * keep) * k, (CLOCK[1] + Math.sin(a) * 0.075 * keep) * k)
    }
    solid(p, ink, weight * 0.8, bg)
    p.circle(CLOCK[0] * k, CLOCK[1] * k, 0.035 * k)

    // The way out at the top, on a long stake that runs on up to a forked twig over the drop.
    rail(p, k, ink, weight, turn * 0.17, turn * 0.5, top + FLOOR)
    post(p, k, ink, weight, turn * 0.43, top - 0.36, 0.5)
    outline(p, ink, weight * 1.1)
    p.noFill()
    p.beginShape()
    p.vertex(turn * 0.43 * k, (top - 0.34) * k)
    p.quadraticVertex(turn * 0.25 * k, (top - 0.36) * k, turn * 0.07 * k, (top + KNOT - HOLD - 0.035) * k)
    p.endShape()
    p.line(turn * 0.07 * k, (top + KNOT - HOLD - 0.035) * k, turn * 0.005 * k, (top + KNOT - HOLD - 0.085) * k)
    p.line(turn * 0.07 * k, (top + KNOT - HOLD - 0.035) * k, turn * 0.03 * k, (top + KNOT - HOLD + 0.03) * k)

    // The small seeds off the clock, drifting up after the big one and thinning away at the top.
    for (let i = 0; i < 3; i++) {
      const u = since - 0.1 - i * 0.22
      const life = rise + 1.2 + i * 0.3
      if (u <= 0 || u >= life) continue
      const f = u / life
      const x = CLOCK[0] - 0.05 - 0.1 * i + 0.06 * Math.sin(u * 2.6 + i * 2) * (0.3 + f)
      const y = CLOCK[1] - (floors + 0.55 - 0.12 * i) * f
      seedling(p, c, x, y, 0.3 * Math.cos(u * 2.6 + i * 2), 1 - over(f, 0.75, 1))
    }

    // The seed: down, stalk, threads, and the back of the cup; the ball goes in front of these.
    const pose = poseAt(t, s)
    seed(p, s.color, c, pose, false)
    // The tether: taut to the peg, then slipped and trailing under the seed.
    const [px, py] = pose.point
    outline(p, ink, weight * 0.7)
    p.noFill()
    if (!slipped) p.line(px * k, py * k, (PEG[0] + 0.03) * k, (PEG[1] - 0.085) * k)
    else {
      const trail = 0.05 * Math.sin(t * 3.1) - pose.lean * 0.3
      p.beginShape()
      p.vertex(px * k, py * k)
      p.quadraticVertex((px + trail * 0.4) * k, (py + 0.08) * k, (px + trail) * k, (py + 0.15) * k)
      p.endShape()
      p.circle((px + trail) * k, (py + 0.165) * k, 0.03 * k)
    }
  },
  over: (p, s, c) => seed(p, s.color, c, poseAt(c.t, s), true),
})

interface Pose {
  /** The ball's seat in the cup. */
  at: Pt
  /** The whole seed's lean about the seat, and the cup's own tip at the top. */
  lean: number
  tip: number
  /** The seed's point, where the tether is tied, in the piece's frame. */
  point: Pt
}

function poseAt(t: number, { floors, turn }: DandelionState): Pose {
  const rise = riseTime(floors)
  const u = t - FIRE
  // Sunk a little under the ball before it goes; docked, it bobs against the fork.
  const sink = t < ARRIVE ? 0 : u < 0 ? SINK * (1 - Math.pow(1 - over(t, ARRIVE, ARRIVE + GIVE), 2)) : 0
  const docked = u > rise
  const bob = docked ? 0.008 * Math.sin(t * 2.3) : 0
  const [x, y] = u < 0 ? [0, sink] : seatAt(u, floors)
  const at: Pt = [x, y + bob]
  // The swing the cup makes under the fork when the stalk snags: toward the way out, and it stays a little askew.
  const after = u - rise
  const tip = !docked ? 0 : turn * (0.22 + 0.3 * Math.exp(-after * 3) * Math.sin(Math.min(after, 0.35) * (Math.PI / 0.35) * 0.5))
  const lean = docked ? 0.05 * Math.sin(t * 1.7) * Math.min(1, after) : leanAt(u, floors)
  const a = lean + tip
  return { at, lean, tip, point: [at[0] - Math.sin(a) * POINT, at[1] + Math.cos(a) * POINT] }
}

/** The seed about the ball's seat. `front` draws only what stands in front of the ball: the near wall of the cup. */
function seed(p: p5, color: string, { k, t, ink, bg, weight }: PieceCtx, pose: Pose, front: boolean): void {
  p.push()
  p.translate(pose.at[0] * k, pose.at[1] * k)
  if (!front) {
    // The stalk and the down lean with the swing; the cup swings a little further under them.
    p.push()
    p.rotate(pose.lean)
    outline(p, ink, weight * 0.9)
    p.line(-CUP_W * 0.45 * k, RIM * k, 0, KNOT * k)
    p.line(CUP_W * 0.45 * k, RIM * k, 0, KNOT * k)
    outline(p, ink, weight * 1.2)
    p.line(0, KNOT * k, 0, HUB * k)
    // The down: a fan of filaments, each with a bead of fluff, breathing a little.
    const n = 13
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * (0.06 + (0.88 * i) / (n - 1)) + 0.03 * Math.sin(t * 2 + i)
      const len = 0.88 + 0.12 * Math.sin(i * 2.4 + 1)
      const x = Math.cos(a) * DOWN[0] * len
      const y = HUB + Math.sin(a) * DOWN[1] * len
      outline(p, ink, weight * 0.6)
      p.line(0, HUB * k, x * k, y * k)
      solid(p, ink, weight * 0.6, bg)
      p.circle(x * k, y * k, 0.035 * k)
    }
    solid(p, ink, weight * 0.8, ink)
    p.circle(0, HUB * k, 0.04 * k)
    p.pop()
  }
  p.rotate(pose.lean + pose.tip)
  solid(p, ink, weight, color)
  if (!front) {
    // The cup's far wall and the seed's long point under it.
    p.arc(0, RIM * k, CUP_W * k, (R + 0.06 - RIM) * 2 * k, 0, Math.PI, p.CHORD)
    p.beginShape()
    p.vertex(-0.075 * k, (R + 0.03) * k)
    p.quadraticVertex(-0.02 * k, (POINT - 0.08) * k, 0, POINT * k)
    p.quadraticVertex(0.02 * k, (POINT - 0.08) * k, 0.075 * k, (R + 0.03) * k)
    p.endShape(p.CLOSE)
  } else {
    // The near wall: the same cup, from just under the ball's middle down.
    p.arc(0, RIM * k, CUP_W * k, (R + 0.06 - RIM) * 2 * k, 0, Math.PI, p.CHORD)
    outline(p, ink, weight * 0.7)
    for (const dx of [-0.07, 0, 0.07]) p.line(dx * k, (RIM + 0.03) * k, dx * 0.8 * k, (R + 0.02) * k)
  }
  p.pop()
}

/** One of the clock's own seeds: a stalk and a little fan, thinning as `life` runs out. */
function seedling(p: p5, { k, ink, weight }: PieceCtx, x: number, y: number, lean: number, life: number): void {
  if (life <= 0) return
  p.push()
  p.translate(x * k, y * k)
  p.rotate(lean)
  outline(p, ink, weight * 0.6)
  p.line(0, 0.04 * k, 0, -0.01 * k)
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI * (0.15 + 0.175 * i)
    p.line(0, -0.01 * k, Math.cos(a) * 0.04 * life * k, (-0.01 + Math.sin(a) * 0.04 * life) * k)
  }
  p.pop()
}
