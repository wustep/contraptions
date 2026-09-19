import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, arrive, arriveAt, definePiece, over, rail, ramp, rankBy, wait, type Lane, type Pt } from '../../parts'
import { piling, water } from './sea'

/**
 * A lighthouse. The deck runs to its door; the door opens and the ball
 * rolls in through it and is gone behind the wall; a lit window climbs
 * the tower floor by floor as it goes up the stair inside; at the top the
 * lamp comes on and its beam starts to turn, and the ball comes out of
 * the lantern room's door onto the gallery one or two floors up and rolls
 * off along the rail — on, or back the way it came. The lamp keeps
 * turning a while, for the ships.
 *
 * The tower stands in front of the ball, with the doorway a hole cut
 * through it onto the dark inside, so the ball is seen on the threshold
 * and goes in behind the jamb — the toaster's slot, the changer's. Both
 * doors are the ball's size. The lantern room stands in front too, so the
 * ball comes *out* of it instead of appearing beside it.
 */
export interface LighthouseState {
  color: string
  floors: number
  turn: 1 | -1
}

const BASE = 0.3
const TOP_W = 0.2
/** The doorway at the foot: wide and tall enough for the ball, an arch, on the pier's side. */
const DOOR_X0 = -0.24
const DOOR_W = 0.3
const DOOR_H = 0.36
/** The ball stops on the threshold, in the middle of the doorway. */
const DOOR = DOOR_X0 + DOOR_W / 2
/**
 * Where the ball is gone: a little up the stair, and no further in than the
 * tower is wide. The wall beside the door is narrower than the ball, so
 * behind the far jamb would put it out through the tower's other side;
 * here the wall covers most of it and the dark inside takes the rest.
 */
const INSIDE: Pt = [BASE - 0.07 - R, -0.05]
const ARRIVE = arriveAt(DOOR)
const IN = 0.15
const TOP_WAIT = 0.22
/** The lantern room's half-width: wider than the ball, so the ball is out of sight inside it; and its height. */
const ROOM = 0.15
const ROOM_H = 0.34
const climbTime = (floors: number) => 0.35 + 0.45 * floors

/**
 * The tower's one opening shape: straight jambs under a round head, as a
 * path on the canvas from the sill round and back. The doorway, the door
 * that fills it and every window up the stair are this, at their own sizes.
 */
function arched(ctx: CanvasRenderingContext2D, k: number, x0: number, sill: number, w: number, h: number): void {
  const r = w / 2
  const spring = sill - h + r
  ctx.moveTo(x0 * k, sill * k)
  ctx.lineTo(x0 * k, spring * k)
  ctx.arc((x0 + r) * k, spring * k, r * k, Math.PI, 0)
  ctx.lineTo((x0 + w) * k, sill * k)
  ctx.closePath()
}
const doorway = (ctx: CanvasRenderingContext2D, k: number) => arched(ctx, k, DOOR_X0, FLOOR, DOOR_W, DOOR_H)
/** A window: the doorway's shape, a third its size. */
const WIN_W = 0.1
const WIN_H = 0.13

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
          { from: [DOOR, 0], to: INSIDE, dur: IN, ease: 'in' },
          { from: INSIDE, to: [0, top], dur: climbTime(floors), ease: 'inout', hidden: true },
          wait([0, top], TOP_WAIT, { hidden: true }),
          ramp([0, top], [turn * 0.5, top], 1.6, ROLL),
        ],
        fire: ARRIVE + IN + climbTime(floors),
      }
      return { cells, exit: { at: exit, dir: turn }, lane, state: { color, floors, turn } }
    }
    return null
  },
  draw: (p, s, { k, ink, weight }) => {
    const { floors, turn } = s
    const gallery = -floors + FLOOR
    const ctx = p.drawingContext as CanvasRenderingContext2D

    // The pier to the door, over water, and the ground the tower stands on.
    water(p, k, ink, weight, -0.5, -BASE)
    rail(p, k, ink, weight, -0.5, -BASE)
    piling(p, k, ink, weight, -0.4)
    outline(p, ink, weight)
    p.line(-0.4 * k, 0.5 * k, 0.4 * k, 0.5 * k)

    // The dark inside the doorway, behind the ball on the threshold.
    p.push()
    p.noStroke()
    p.fill(ink)
    ctx.beginPath()
    doorway(ctx, k)
    ctx.fill()
    p.pop()

    // The gallery: a platform with a railing behind the ball, and the rail out.
    solid(p, ink, weight, ink)
    p.rect(0, (gallery + 0.03) * k, 0.68 * k, 0.06 * k)
    outline(p, ink, weight)
    for (const x of [-0.3, -0.15, 0.15, 0.3]) p.line(x * k, gallery * k, x * k, (gallery - 0.2) * k)
    p.line(-0.32 * k, (gallery - 0.2) * k, 0.32 * k, (gallery - 0.2) * k)
    rail(p, k, ink, weight, turn * ROOM, turn * 0.5, gallery)
  },
  over: (p, s, { k, t, since, ink, bg, weight }) => {
    const { floors, turn } = s
    const top = -floors
    const gallery = top + FLOOR
    const climb = climbTime(floors)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    // How far up the stair the ball is, in floors.
    const startClimb = ARRIVE + IN
    const up = t < startClimb ? -0.15 : t < startClimb + climb ? -0.15 + (top + 0.15) * easeInOutSine(over(t, startClimb, startClimb + climb)) : top
    // The door swings in as the ball comes, and shuts once it is inside.
    const doorOpen = t < ARRIVE ? over(t, ARRIVE - 0.3, ARRIVE - 0.1) : 1 - over(t, startClimb + 0.1, startClimb + 0.4)
    const lit = since > 0 ? 1 - over(since, 3.2, 4) : 0
    const galleryDoor = since > TOP_WAIT - 0.1 && since < TOP_WAIT + 0.5 ? 1 : 0

    // The tower, in front of the ball: a tapering shaft with bands, from
    // the ground to the gallery, with the doorway cut out of it.
    const widthAt = (y: number) => BASE + (TOP_W - BASE) * ((0.5 - y) / (0.5 - gallery))
    p.push()
    ctx.beginPath()
    ctx.rect(-0.5 * k, (gallery - 0.1) * k, 1 * k, (0.7 - gallery) * k)
    doorway(ctx, k)
    ctx.clip('evenodd')
    // Paint first, edge to edge, and the ink last over all of it: a band
    // that stops short of the wall, or laps onto the ink, puts a step in
    // the tower's line at every stripe.
    p.noStroke()
    p.fill(s.color)
    p.quad(-BASE * k, 0.5 * k, BASE * k, 0.5 * k, TOP_W * k, gallery * k, -TOP_W * k, gallery * k)
    p.fill(bg)
    for (let y = 0.5 - 0.3; y > gallery + 0.1; y -= 0.6) {
      const y1 = Math.max(gallery, y - 0.28)
      const w0 = widthAt(y)
      const w1 = widthAt(y1)
      p.quad(-w0 * k, y * k, w0 * k, y * k, w1 * k, y1 * k, -w1 * k, y1 * k)
    }
    outline(p, ink, weight)
    p.quad(-BASE * k, 0.5 * k, BASE * k, 0.5 * k, TOP_W * k, gallery * k, -TOP_W * k, gallery * k)
    p.pop()
    // The dark inside closes over the ball as it goes in, so it is gone into it and not cut off at the jamb.
    const gone = t < startClimb ? over(t, ARRIVE, startClimb) : 0
    if (gone > 0) {
      const dark = p.color(ink)
      dark.setAlpha(255 * gone)
      p.push()
      p.noStroke()
      p.fill(dark)
      ctx.beginPath()
      doorway(ctx, k)
      ctx.fill()
      p.pop()
    }
    // The doorway's jambs and arch, and the door on its hinge at the near jamb, swinging in.
    p.push()
    p.noFill()
    p.stroke(ink)
    p.strokeWeight(weight)
    ctx.beginPath()
    doorway(ctx, k)
    ctx.stroke()
    p.pop()
    p.push()
    p.translate(DOOR_X0 * k, 0)
    p.scale(Math.max(0.12, 1 - doorOpen), 1)
    // The door is the doorway's own shape, so shut it fills it and the two read as one.
    solid(p, ink, weight, s.color)
    ctx.beginPath()
    arched(ctx, k, 0, FLOOR, DOOR_W, DOOR_H)
    ctx.fill()
    ctx.stroke()
    p.fill(ink)
    p.noStroke()
    p.circle((DOOR_W - 0.06) * k, (FLOOR - DOOR_H / 2 + 0.05) * k, 0.03 * k)
    p.pop()
    // A window a floor, lit as the ball climbs past.
    for (let i = 0; i < floors; i++) {
      const wy = -i - 0.45
      const near = Math.max(0, 1 - Math.abs(up - (wy + 0.15)) / 0.4)
      solid(p, ink, weight, near > 0.3 ? s.color : bg)
      ctx.beginPath()
      arched(ctx, k, 0.02 - WIN_W / 2, wy + 0.045, WIN_W, WIN_H)
      ctx.fill()
      ctx.stroke()
    }

    // The lantern room, in front of the ball: glass on a drum, a domed roof, and the lamp inside.
    solid(p, ink, weight, s.color)
    p.rect(0, (gallery - 0.03) * k, (ROOM * 2 + 0.08) * k, 0.06 * k)
    solid(p, ink, weight, bg)
    p.rect(0, (gallery - 0.06 - ROOM_H / 2) * k, ROOM * 2 * k, ROOM_H * k)
    outline(p, ink, weight * 0.8)
    for (const x of [-0.05, 0.05]) p.line(x * k, (gallery - 0.06 - ROOM_H) * k, x * k, (gallery - 0.06) * k)
    solid(p, ink, weight, s.color)
    p.arc(0, (gallery - 0.06 - ROOM_H) * k, (ROOM * 2 + 0.06) * k, 0.22 * k, Math.PI, Math.PI * 2, p.CHORD)
    p.line(0, (gallery - 0.17 - ROOM_H) * k, 0, (gallery - 0.24 - ROOM_H) * k)
    // The gallery door the ball comes out of, in the room's far wall: as tall as the ball.
    solid(p, ink, weight, galleryDoor ? ink : s.color)
    p.rect(turn * (ROOM - 0.03) * k, (gallery - 0.06 - ROOM_H / 2) * k, 0.06 * k, (ROOM_H - 0.04) * k)
    // The lamp, and its beam turning.
    const lampY = gallery - 0.06 - ROOM_H / 2
    if (lit > 0.02) {
      const beam = p.color(s.color)
      beam.setAlpha(70 * lit)
      p.push()
      p.translate(0, lampY * k)
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
    p.circle(0, lampY * k, 0.1 * k)
  },
})
