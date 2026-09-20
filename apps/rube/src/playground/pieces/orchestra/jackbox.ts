import { coil, outline, solid } from '../../../../../../src/core/draw'
import { clamp } from '../../../../../../src/core/ease'
import { FLOOR, R, ROLL, arrive, arriveAt, definePiece, fly, post, ramp, rankBy, wait, type Lane, type Pt } from '../../../parts'
import { brass, feltColor, ivory, stage } from './hall'

/**
 * A jack-in-the-box. Its lid is the stage's last half cell, two leaves
 * meeting in the middle; the ball rolls out onto the seam and stops. Its
 * weight lets the crank go: round it comes on the box's face, three turns,
 * each quicker than the last, the box beginning to tremble. Pop: the leaves
 * fly back and Jack comes up under the ball on his spring, the ball in the
 * fork of his cap, and at the top of the spring's push he lets it go: up
 * past the end of a shelf a floor or two above, and down onto it. Jack
 * stays out, nodding on his spring till he is still.
 *
 * The push is one steady acceleration along the spring, which leans a
 * little the way the ball is going; the ball leaves it at the pace the
 * flight needs, and Jack's head goes on from that same pace into the
 * spring's own bob.
 */
export interface JackboxState {
  color: string
  cap: string
  floors: 1 | 2
}

const G = 24
/** The box: half its width; its lid is the stage's line. */
const BOX = 0.27
const BOTTOM = 0.5
/** Jack: his head's radius, and how far over its middle the ball sits in the fork of his cap. */
const HEAD = 0.12
const SEAT = HEAD + 0.11
/** How far the spring's push carries the ball before it lets go, and how far over the shelf the flight tops out. */
const PUSH = 0.3
const OVER = 0.3
const LAND_X = 0.37
/** The settle on the lid, and the crank's three turns. */
const SETTLE = 0.12
const WIND = 0.95
const TURNS = 3
const ARRIVE = arriveAt(0)
const FIRE = ARRIVE + SETTLE + WIND
/** Where Jack's head stands over the lid once he is still, along the spring. */
const REST = 0.5
/** The spring's bob. */
const OMEGA = 21
const DAMP = 3.4

interface Plan {
  lane: Lane
  /** The spring's lean, the push's length in time and the pace it ends at. */
  lean: number
  push: number
  v0: number
  shelf: number
}

function plan(floors: 1 | 2): Plan {
  const rise = floors + OVER - PUSH
  const vy = Math.sqrt(2 * G * rise)
  const flight = vy / G + Math.sqrt((2 * OVER) / G)
  const vx = LAND_X / (flight + PUSH / vy)
  const lean = Math.atan2(vx, vy)
  const v0 = Math.hypot(vx, vy)
  const push = (2 * PUSH) / vy
  const off: Pt = [PUSH * Math.tan(lean), -PUSH]
  const land: Pt = [off[0] + vx * flight, -floors]
  // The ball's top reaches the shelf's line this long after it is let go; the shelf begins clear of it there.
  const past = (vy - Math.sqrt(vy * vy - 2 * G * (-PUSH + floors - 2 * R))) / G
  return {
    lane: {
      segs: [
        ...arrive([-0.5, 0], [0, 0]),
        wait([0, 0], SETTLE + WIND),
        { from: [0, 0], to: off, dur: push, ease: 'in' },
        fly(off, land, flight, (G * flight * flight) / 8),
        { ...ramp(land, [0.5, -floors], 1.1, ROLL), arc: 0.02 },
      ],
      fire: FIRE,
    },
    lean,
    push,
    v0,
    shelf: off[0] + vx * past + R + 0.03,
  }
}

const PLANS = { 1: plan(1), 2: plan(2) } as const

/** How far along the spring Jack's head is, measured from where it sits under the closed lid. */
function headAt(since: number, pl: Plan): number {
  if (since <= 0) return 0
  if (since <= pl.push) return (PUSH * (since / pl.push) ** 2) / Math.cos(pl.lean)
  // Let go of, the head runs on at that pace into the spring's bob about its rest.
  const s = since - pl.push
  const from = PUSH / Math.cos(pl.lean) - REST
  const e = Math.exp(-DAMP * s)
  return REST + e * (from * Math.cos(OMEGA * s) + ((pl.v0 + DAMP * from) / OMEGA) * Math.sin(OMEGA * s))
}

export const jackbox = definePiece<JackboxState>({
  name: 'jackbox',
  flight: true,
  weight: 0.9,
  place: ({ rng, color, fits, theme, ball, taste }) => {
    const tall = taste.weights['lift-tall'] ?? 1
    for (const floors of rankBy(rng, [1, 2] as const, (f) => (f === 2 ? tall : 1.4))) {
      const cells: Pt[] = [[0, 0]]
      for (let i = 1; i <= floors; i++) cells.push([0, -i])
      const exit: Pt = [1, -floors]
      if (!fits(cells, exit)) continue
      const body = feltColor(theme, color, ball.color)
      const cap = theme.colors.find((c) => c !== body && c !== ball.color && c !== ivory(theme)) ?? body
      return { cells, exit: { at: exit, dir: 1 }, lane: PLANS[floors].lane, state: { color: body, cap, floors } }
    }
    return null
  },
  draw: (p, s, { k, t, since, ink, weight, theme }) => {
    const pl = PLANS[s.floors]
    const wound = clamp((t - ARRIVE - SETTLE) / WIND)
    // The box trembles as the crank comes round to the pop, and jumps at it.
    const tremble = since < 0 ? 0.007 * wound ** 3 * Math.sin(t * 90) : 0.012 * Math.exp(-since * 9) * Math.sin(since * 60)
    const h = headAt(since, pl)
    // Jack nods on his spring once he is out: about the lean he came up at, less and less.
    const nod = since < pl.push ? 0 : 0.2 * Math.exp(-(since - pl.push) * 1.8) * Math.sin((since - pl.push) * 9)
    const axis = pl.lean + nod

    // The stage to the box, and the shelf above on its post.
    stage(p, k, ink, weight, -0.5, -BOX)
    stage(p, k, ink, weight, pl.shelf, 0.5, -s.floors + FLOOR)
    post(p, k, ink, weight, 0.42, -s.floors + FLOOR, -s.floors + 0.5)

    p.push()
    p.translate(tremble * k, 0)

    // Jack, behind the box's face: the spring from the box's floor, his head, the two horns of his cap.
    if (since > 0) {
      const foot: Pt = [0, BOTTOM - 0.06]
      // His head sits under the lid with the ball's seat on the lid's line; from there it goes up the spring's axis.
      const hx = Math.sin(axis) * h - Math.sin(pl.lean) * SEAT
      const hy = -Math.cos(axis) * h + Math.cos(pl.lean) * SEAT
      outline(p, ink, weight)
      coil(p, foot[0] * k, foot[1] * k, hx * k, (hy + HEAD) * k, 6, 0.07 * k)
      p.push()
      p.translate(hx * k, hy * k)
      p.rotate(axis)
      solid(p, ink, weight, s.cap)
      for (const side of [-1, 1]) {
        p.beginShape()
        p.vertex(side * HEAD * 0.95 * k, -HEAD * 0.3 * k)
        p.quadraticVertex(side * 0.22 * k, -0.17 * k, side * 0.18 * k, -0.3 * k)
        p.quadraticVertex(side * 0.1 * k, -0.19 * k, 0, -HEAD * 0.85 * k)
        p.endShape(p.CLOSE)
      }
      solid(p, ink, weight, ivory(theme))
      p.circle(0, 0, HEAD * 2 * k)
      // A face: two eyes and a grin.
      p.noStroke()
      p.fill(ink)
      p.circle(-0.04 * k, -0.02 * k, 0.03 * k)
      p.circle(0.05 * k, -0.02 * k, 0.03 * k)
      outline(p, ink, weight * 0.7)
      p.arc(0.005 * k, 0.02 * k, 0.11 * k, 0.085 * k, 0.15, Math.PI - 0.15)
      p.pop()
    }

    // The box, its face to us; the crank on it.
    solid(p, ink, weight, s.color)
    p.rect(0, ((FLOOR + BOTTOM) / 2) * k, BOX * 2 * k, (BOTTOM - FLOOR) * k, 0.02 * k)
    const turn = TURNS * Math.PI * 2 * wound ** 1.7
    const hub: Pt = [0, (FLOOR + BOTTOM) / 2 + 0.005]
    const arm = 0.11
    outline(p, ink, weight * 1.5)
    p.line(hub[0] * k, hub[1] * k, (hub[0] + Math.cos(turn) * arm) * k, (hub[1] + Math.sin(turn) * arm) * k)
    solid(p, ink, weight, brass(theme))
    p.circle((hub[0] + Math.cos(turn) * arm) * k, (hub[1] + Math.sin(turn) * arm) * k, 0.1 * k)

    // The lid's two leaves: shut as the stage's line, thrown back at the pop with a shudder.
    const open = since <= 0 ? 0 : 2.05 * (1 - Math.exp(-since * 38) * Math.cos(since * 30)) + 0.12 * Math.exp(-since * 4) * Math.sin(since * 24)
    for (const side of [-1, 1]) {
      p.push()
      p.translate(side * BOX * k, FLOOR * k)
      p.rotate(side * open)
      solid(p, ink, weight, s.color)
      p.rect(-side * (BOX / 2) * k, -0.018 * k, BOX * k, 0.036 * k, 0.012 * k)
      p.pop()
    }
    p.pop()
  },
})
