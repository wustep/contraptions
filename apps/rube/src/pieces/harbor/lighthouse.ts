import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine } from '../../../../../src/core/ease'
import { FLOOR, ROLL, arrive, arriveAt, definePiece, over, rail, ramp, rankBy, wait, type Lane, type Pt } from '../../parts'
import { piling, water } from './sea'

/**
 * A lighthouse. The deck runs to its door; the ball rolls in and is gone;
 * a lit window climbs the tower floor by floor as it goes up the stair
 * inside; at the top the lamp comes on and its beam starts to turn, and
 * the ball comes out onto the gallery one or two floors up and rolls off
 * along the rail — on, or back the way it came. The lamp keeps turning a
 * while, for the ships.
 */
export interface LighthouseState {
  color: string
  floors: number
  turn: 1 | -1
}

const BASE = 0.3
const TOP_W = 0.2
const DOOR = -0.2
const ARRIVE = arriveAt(DOOR)
const IN = 0.15
const TOP_WAIT = 0.22
const OUT = 0.12
const GALLERY = 0.22
const climbTime = (floors: number) => 0.35 + 0.45 * floors

export const lighthouse = definePiece<LighthouseState>({
  name: 'lighthouse',
  weight: 1,
  place: ({ rng, color, fits, taste }) => {
    const tall = taste.weights['lift-tall'] ?? 1
    const options = rng.shuffle([1, 2].flatMap((floors) => [1, -1].map((turn) => ({ floors, turn: turn as 1 | -1 }))))
    for (const { floors, turn } of rankBy(rng, options, (o) => Math.pow(tall, o.floors - 1))) {
      const cells: Pt[] = []
      for (let i = 0; i <= floors; i++) cells.push([0, -i])
      const exit: Pt = [turn, -floors]
      if (!fits(cells, exit)) continue
      const top = -floors
      const lane: Lane = {
        segs: [
          ...arrive([-0.5, 0], [DOOR, 0]),
          { from: [DOOR, 0], to: [0, -0.15], dur: IN, hidden: true },
          { from: [0, -0.15], to: [0, top], dur: climbTime(floors), ease: 'inout', hidden: true },
          wait([0, top], TOP_WAIT, { hidden: true }),
          { from: [0, top], to: [turn * GALLERY, top], dur: OUT, hidden: true },
          ramp([turn * GALLERY, top], [turn * 0.5, top], 1.6, ROLL),
        ],
        fire: ARRIVE + IN + climbTime(floors),
      }
      return { cells, exit: { at: exit, dir: turn }, lane, state: { color, floors, turn } }
    }
    return null
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const { floors, turn } = s
    const top = -floors
    const gallery = top + FLOOR
    const climb = climbTime(floors)
    // How far up the stair the ball is, in floors, and whether the lamp is on.
    const startClimb = ARRIVE + IN
    const up = t < startClimb ? -0.15 : t < startClimb + climb ? -0.15 + (top + 0.15) * easeInOutSine(over(t, startClimb, startClimb + climb)) : top
    const lit = since > 0 ? 1 - over(since, 3.2, 4) : 0
    const doorOpen = t > ARRIVE - 0.25 && t < ARRIVE + IN + 0.3 ? 1 : 0
    const galleryDoor = since > TOP_WAIT - 0.1 && since < TOP_WAIT + OUT + 0.4 ? 1 : 0

    // The pier to the door, over water, and the ground the tower stands on.
    water(p, k, ink, weight, -0.5, -BASE)
    rail(p, k, ink, weight, -0.5, -BASE)
    piling(p, k, ink, weight, -0.4)
    outline(p, ink, weight)
    p.line(-0.4 * k, 0.5 * k, 0.4 * k, 0.5 * k)

    // The tower: a tapering shaft with bands, from the ground to the gallery.
    const widthAt = (y: number) => BASE + (TOP_W - BASE) * ((0.5 - y) / (0.5 - gallery))
    solid(p, ink, weight, s.color)
    p.quad(-BASE * k, 0.5 * k, BASE * k, 0.5 * k, TOP_W * k, gallery * k, -TOP_W * k, gallery * k)
    p.noStroke()
    p.fill(bg)
    for (let y = 0.5 - 0.3; y > gallery + 0.1; y -= 0.6) {
      const y1 = Math.max(gallery + 0.02, y - 0.28)
      const w0 = widthAt(y) - 0.012
      const w1 = widthAt(y1) - 0.012
      p.quad(-w0 * k, y * k, w0 * k, y * k, w1 * k, y1 * k, -w1 * k, y1 * k)
    }
    // The door at the foot, on the pier's side, swinging in as the ball arrives.
    p.push()
    p.translate(DOOR * k, FLOOR * k)
    solid(p, ink, weight, ink)
    p.rect(0.02 * k, -0.11 * k, 0.16 * k, 0.24 * k, 0.03 * k)
    p.push()
    p.translate(-0.06 * k, 0)
    p.scale(1 - 0.8 * doorOpen, 1)
    solid(p, ink, weight, s.color)
    p.rect(0.08 * k, -0.11 * k, 0.14 * k, 0.22 * k, 0.02 * k)
    p.pop()
    p.pop()
    // A window a floor, lit as the ball climbs past.
    for (let i = 0; i < floors; i++) {
      const wy = -i - 0.45
      const near = Math.max(0, 1 - Math.abs(up - (wy + 0.15)) / 0.4)
      solid(p, ink, weight, near > 0.3 ? s.color : bg)
      p.arc(0.02 * k, wy * k, 0.1 * k, 0.16 * k, Math.PI, Math.PI * 2, p.CHORD)
      p.rect(0.02 * k, (wy + 0.02) * k, 0.1 * k, 0.05 * k)
    }

    // The gallery: a platform with a railing behind the ball, and the rail out.
    solid(p, ink, weight, ink)
    p.rect(0, (gallery + 0.03) * k, 0.68 * k, 0.06 * k)
    outline(p, ink, weight)
    for (const x of [-0.3, -0.15, 0.15, 0.3]) p.line(x * k, gallery * k, x * k, (gallery - 0.2) * k)
    p.line(-0.32 * k, (gallery - 0.2) * k, 0.32 * k, (gallery - 0.2) * k)
    rail(p, k, ink, weight, turn * GALLERY, turn * 0.5, gallery)
    // The lantern room: glass on a drum, a domed roof, and the lamp inside.
    solid(p, ink, weight, s.color)
    p.rect(0, (gallery - 0.03) * k, 0.34 * k, 0.06 * k)
    solid(p, ink, weight, bg)
    p.rect(0, (gallery - 0.2) * k, 0.24 * k, 0.28 * k)
    outline(p, ink, weight * 0.8)
    for (const x of [-0.04, 0.04]) p.line(x * k, (gallery - 0.34) * k, x * k, (gallery - 0.06) * k)
    solid(p, ink, weight, s.color)
    p.arc(0, (gallery - 0.34) * k, 0.3 * k, 0.22 * k, Math.PI, Math.PI * 2, p.CHORD)
    p.line(0, (gallery - 0.45) * k, 0, (gallery - 0.52) * k)
    // The gallery door the ball comes out of, on the far side.
    solid(p, ink, weight, galleryDoor ? ink : s.color)
    p.rect(turn * 0.1 * k, (gallery - 0.14) * k, 0.06 * k, 0.16 * k)
    // The lamp, and its beam turning.
    if (lit > 0.02) {
      const beam = p.color(s.color)
      beam.setAlpha(70 * lit)
      p.push()
      p.translate(0, (gallery - 0.2) * k)
      p.rotate(since * 2.2)
      p.noStroke()
      p.fill(beam)
      for (const side of [0, Math.PI]) {
        p.push()
        p.rotate(side)
        p.triangle(0, 0, 1.6 * k, -0.22 * k, 1.6 * k, 0.22 * k)
        p.pop()
      }
      p.pop()
    }
    solid(p, ink, weight, lit > 0.5 ? s.color : ink)
    p.circle(0, (gallery - 0.2) * k, 0.1 * k)
  },
})
