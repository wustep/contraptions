import { outline, solid } from '../../../../src/core/draw'
import { FALL, FLOOR, R, ROLL, arcPts, chain, definePiece, flick, over, roll, segTime, type Lane, type Placement, type Pt } from '../parts'

/**
 * A fall. The rail runs out to a lip over a tube; the ball drops one, two or
 * three floors, kicking a hinged flap in every cell it passes, and a
 * quarter-pipe at the bottom turns the drop back into a roll — the way it
 * was going, or back the other way. Gravity is the machine here.
 */
export interface DropState {
  color: string
  floors: number
  /** 1: carries on east. -1: turns back west. */
  turn: 1 | -1
  /** Seconds after entry at which the ball passes each middle cell's flap. */
  flapAt: number[]
}

const TUBE = R + 0.04
const ARC = 0.24
const ARC_WALL = ARC + FLOOR

export const drop = definePiece<DropState>({
  name: 'drop',
  weight: 1.3,
  place: ({ rng, color, fits, taste }) => {
    const options = rng.shuffle([1, 2, 3].flatMap((floors) => [1, -1].map((turn) => ({ floors, turn: turn as 1 | -1 }))))
    const deep = taste.weights['drop-deep'] ?? 1
    const pool = [...options]
    const ordered: typeof options = []
    while (pool.length) {
      const pick = rng.weighted(pool, (o) => Math.pow(deep, o.floors - 1))
      ordered.push(pick)
      pool.splice(pool.indexOf(pick), 1)
    }
    for (const { floors, turn } of ordered) {
      const cells: Pt[] = []
      for (let i = 0; i <= floors; i++) cells.push([0, i])
      const exit: Pt = [turn, floors]
      if (!fits(cells, exit)) continue
      const bottom = floors
      const dropSeg = { from: [0, 0] as Pt, to: [0, bottom - ARC] as Pt, dur: (bottom - ARC) / FALL, ease: 'in' as const }
      const bend = chain(arcPts(turn * ARC, bottom - ARC, ARC, Math.PI * (turn > 0 ? 1 : 0), Math.PI / 2, 4), 0.11)
      const segs = [
        roll([-0.5, 0], [0, 0], ROLL),
        dropSeg,
        ...bend,
        roll([turn * ARC, bottom], [turn * 0.5, bottom], ROLL * 1.2, 'out'),
      ]
      const arrive = 0.5 / ROLL
      const lane: Lane = { segs, fire: arrive + dropSeg.dur + segTime(bend) }
      // Ease-in fall: y = d * (τ/dur)^2, so τ = dur * sqrt(y / d).
      const flapAt: number[] = []
      for (let i = 1; i < floors; i++) flapAt.push(arrive + dropSeg.dur * Math.sqrt(i / (bottom - ARC)))
      const state: DropState = { color, floors, turn, flapAt }
      return { cells, exit: { at: exit, dir: turn }, lane, state } satisfies Placement<DropState>
    }
    return null
  },
  draw: (p, s, { k, t, since, ink, weight }) => {
    const { floors, turn } = s
    const bottom = floors
    // The rail to the lip.
    outline(p, ink, weight)
    p.line(-0.5 * k, FLOOR * k, 0.05 * k, FLOOR * k)
    // The tube: near wall from under the lip, far wall up past it as a backstop.
    p.line(-TUBE * k, (FLOOR + 0.06) * k, -TUBE * k, (bottom - ARC_WALL) * k)
    p.line(TUBE * k, -0.3 * k, TUBE * k, (bottom - 0.2) * k)
    p.line(TUBE * k, -0.3 * k, (TUBE + 0.12) * k, -0.25 * k)
    // Ties every so often, so the tube is fixed to something.
    for (let y = 0.4; y < bottom - 0.3; y += 0.24) {
      for (const x of [-TUBE, TUBE]) p.line(x * k, y * k, (x + Math.sign(x) * 0.06) * k, y * k)
    }
    // The backstop pad the ball knocks on its way over the lip.
    const knock = t < 0.5 / ROLL ? 0 : flick(t - 0.5 / ROLL, 0.04, 0.08, 0.4)
    solid(p, ink, weight, s.color)
    p.rect((TUBE + 0.035 + knock * 0.03) * k, -0.05 * k, 0.07 * k, 0.2 * k)

    // The flaps: hinged on the near wall, hanging into the tube, kicked flat.
    for (let i = 1; i < floors; i++) {
      const swing = flick(t - s.flapAt[i - 1], 0.04, 0.1, 0.6)
      p.push()
      p.translate(-TUBE * k, (i - 0.02) * k)
      p.rotate(-0.55 + (t < s.flapAt[i - 1] ? 0 : swing) * 1.1)
      solid(p, ink, weight, s.color)
      p.rect(0.09 * k, 0, 0.18 * k, 0.05 * k)
      outline(p, ink, weight)
      p.circle(0, 0, 0.05 * k)
      p.pop()
    }

    // The catch: a quarter-pipe from the near wall onto the floor, in the
    // direction the ball leaves.
    p.push()
    p.translate(0, bottom * k)
    p.scale(turn, 1)
    outline(p, ink, weight)
    p.arc(ARC * k, -ARC * k, ARC_WALL * 2 * k, ARC_WALL * 2 * k, Math.PI / 2, Math.PI)
    p.line(ARC * k, FLOOR * k, 0.5 * k, FLOOR * k)
    p.line(-TUBE * k, -0.5 * k, -TUBE * k, -0.25 * k)
    // The cushion under the bend, squashed by the landing.
    const squash = since < 0 ? 0 : 1 - over(since, 0, 0.35)
    solid(p, ink, weight, s.color)
    p.rect(0.04 * k, (FLOOR + 0.12 + squash * 0.02) * k, 0.24 * k, (0.09 - squash * 0.03) * k)
    outline(p, ink, weight)
    p.line(0.04 * k, (FLOOR + 0.17) * k, 0.04 * k, 0.5 * k)
    p.line(0.36 * k, FLOOR * k, 0.36 * k, 0.5 * k)
    p.pop()
  },
})
