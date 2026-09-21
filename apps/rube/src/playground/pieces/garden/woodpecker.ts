import type p5 from 'p5'
import { outline, solid } from '../../../../../../src/core/draw'
import { clamp, easeOutQuad } from '../../../../../../src/core/ease'
import { FLOOR, R, ROLL, arrive, arriveAt, definePiece, post, rail, ramp, rankBy, trace, type Lane, type Pt } from '../../../parts'
import { nearestHue, soil, tuft } from '../../../pieces/garden/green'

/**
 * The pecking bird. A pole stands up through the floors, and on it a loose
 * collar with a woodpecker sprung off one side and a little tray off the
 * other, level with the path's end. The collar is a shade too big for the
 * pole: cocked over it bites, level it slips. The ball rolls onto the tray
 * and stops in its dish, and the jolt sets the bird nodding on its spring;
 * every nod rocks the collar through level, and every time it is level it
 * slips a notch, so bird, tray and ball judder down the pole, a rock and a
 * drop, a rock and a drop, the beak knocking the pole at the end of every
 * other one. At the foot the collar lands on a stop, the tray tips, and the
 * ball rolls off it onto the path a floor or two down: off the tray's open
 * end, back the way it came, or off its near end past the pole and on. The
 * bird nods itself still.
 *
 * Collar, tray, bird and ball are one motion: how far the collar has slipped
 * and how far it is cocked, both from the one nod. The lane is the tray's
 * dish traced from it, so the ball is on the tray at every frame.
 */
export interface WoodpeckerState {
  color: string
  crest: string
  floors: number
  turn: 1 | -1
}

/** The pole, and the tray off the collar: its two ends and its dish, measured from the pole along the tray. */
const POLE = 0
const TRAY: [number, number] = [-0.34, -0.05]
const DISH = -0.2
/** The path's end, a hair short of the tray. */
const RAIL_END = POLE + TRAY[0] - 0.015
/** A nod takes this long; the collar slips this far at each pass through level, and is cocked this far between. */
const NOD = 0.19
const NOTCH = 0.1
const COCK = 0.085
/** The slip is the first part of each half nod: level, slipping, then cocked enough to bite. */
const SLIP = 0.42
/** How far the tray ends up tipped on the stop, radians, and how long that takes. */
const TIP = 0.19
const TIP_T = 0.16
/** How hard the ball is sent along the tipped tray, cells a second squared. */
const SHED = 7
/** The bird: how long its spring is, where the spring leaves the collar, and how it leans at rest, radians up from level. */
const SPRING = 0.416
const SPRING_AT: Pt = [0.05, -0.09]
const LEAN = 0.956
const NODS = 0.1

const SEAT_X = POLE + DISH
const ARRIVE = arriveAt(SEAT_X)
const START = ARRIVE + 0.07

interface Drop {
  /** Half nods on the way down, when the collar lands, and how far it has come by then. */
  halves: number
  lands: number
  fall: number
  /** When the ball starts along the tray, where along the tray it leaves it, and when. */
  sheds: number
  edge: number
  leaves: number
  end: number
}

const DROPS = new Map<string, Drop>()
function dropFor(floors: number, turn: 1 | -1): Drop {
  const key = `${floors}:${turn}`
  const known = DROPS.get(key)
  if (known) return known
  // The tray's low end comes to rest level with the path below: its open end for a ball that turns back, its near end for one that goes on.
  const edge = turn > 0 ? TRAY[1] : TRAY[0]
  const fall = floors - edge * Math.sin(turn * TIP)
  const halves = Math.round(fall / NOTCH)
  const lands = START + (halves * NOD) / 2
  const sheds = lands + TIP_T * 0.55
  const leaves = sheds + Math.sqrt((2 * Math.abs(edge - DISH)) / SHED)
  const out = { halves, lands, fall, sheds, edge, leaves, end: 0 }
  DROPS.set(key, out)
  return out
}

/** The collar at piece time `t`: how far down the pole, how far cocked (clockwise positive), and the nod's phase. */
function collarAt(t: number, d: Drop, turn: 1 | -1): { y: number; tilt: number; nod: number } {
  if (t < START) {
    // The tray gives a hair as the ball comes onto it.
    const give = t < ARRIVE - 0.12 ? 0 : 0.012 * Math.sin(Math.PI * clamp((t - ARRIVE + 0.12) / 0.19))
    return { y: FLOOR + give, tilt: 0, nod: 0 }
  }
  const v = Math.min(d.halves, (t - START) / (NOD / 2))
  const i = Math.floor(v)
  const f = v - i
  const slipped = i >= d.halves ? d.halves : i + Math.pow(clamp(f / SLIP), 2)
  // After it lands the nodding dies away, and the collar goes over onto the stop.
  const after = Math.max(0, t - d.lands)
  const dying = Math.exp(-after * 7)
  const phase = Math.PI * ((t - START) / (NOD / 2))
  const tip = turn * TIP * (easeOutQuad(clamp(after / TIP_T)) + 0.18 * Math.exp(-after * 9) * Math.sin(after * 30) * clamp(after / 0.05))
  return { y: FLOOR + (slipped / d.halves) * d.fall, tilt: COCK * Math.sin(phase) * dying * clamp((t - START) / NOD) + (after > 0 ? tip : 0), nod: Math.sin(phase - 0.5) * dying }
}

/** A point `u` along the tray from the pole and `up` off its top, with the collar at `c`. */
const onTray = (c: { y: number; tilt: number }, u: number, up: number): Pt => [POLE + u * Math.cos(c.tilt) + up * Math.sin(c.tilt), c.y + u * Math.sin(c.tilt) - up * Math.cos(c.tilt)]

/** Where along the tray the ball is at piece time `t`. */
function alongAt(t: number, d: Drop, turn: 1 | -1): number {
  if (t < d.sheds) return DISH
  const run = 0.5 * SHED * Math.pow(t - d.sheds, 2)
  return turn > 0 ? Math.min(d.edge, DISH + run) : Math.max(d.edge, DISH - run)
}

const ballAt = (t: number, d: Drop, turn: 1 | -1): Pt => onTray(collarAt(t, d, turn), alongAt(t, d, turn), R)

function laneFor(floors: number, turn: 1 | -1): Lane {
  const d = dropFor(floors, turn)
  const off = ballAt(d.leaves, d, turn)
  const pace = SHED * (d.leaves - d.sheds)
  return {
    segs: [
      ...arrive([-0.5, 0], [SEAT_X, 0]),
      ...trace((t) => ballAt(t, d, turn), ARRIVE, d.leaves, Math.round((d.leaves - ARRIVE) * 90)),
      ramp(off, [turn * 0.5, floors], pace, ROLL),
    ],
    fire: START,
  }
}

const LANES = new Map<string, Lane>()
const lane = (floors: number, turn: 1 | -1): Lane => {
  const key = `${floors}:${turn}`
  if (!LANES.has(key)) LANES.set(key, laneFor(floors, turn))
  return LANES.get(key)!
}

/** The bird, drawn about the end of its spring, beak toward the pole (to the left), leaning `a` radians beak down. */
function bird(p: p5, k: number, ink: string, weight: number, body: string, crest: string, a: number): void {
  p.push()
  p.rotate(a)
  p.scale(1.12)
  // Tail, body, head: three shapes, one bird.
  solid(p, ink, weight, body)
  p.triangle(0.04 * k, 0.0, 0.165 * k, 0.075 * k, 0.15 * k, -0.015 * k)
  p.ellipse(0, 0, 0.2 * k, 0.135 * k)
  solid(p, ink, weight, crest)
  p.triangle(-0.1 * k, -0.115 * k, -0.02 * k, -0.17 * k, -0.035 * k, -0.085 * k)
  solid(p, ink, weight, body)
  p.circle(-0.085 * k, -0.065 * k, 0.105 * k)
  p.fill(ink)
  p.noStroke()
  p.triangle(-0.128 * k, -0.09 * k, -0.128 * k, -0.04 * k, -0.215 * k, -0.06 * k)
  p.circle(-0.095 * k, -0.075 * k, 0.024 * k)
  p.pop()
}

export const woodpecker = definePiece<WoodpeckerState>({
  name: 'woodpecker',
  weight: 1,
  place: ({ rng, color, fits, taste, theme, ball }) => {
    const deep = taste.weights['drop-deep'] ?? 1
    const options = rng.shuffle([1, 2].flatMap((floors) => [1, -1].map((turn) => ({ floors, turn: turn as 1 | -1 }))))
    for (const { floors, turn } of rankBy(rng, options, (o) => Math.pow(deep, o.floors - 1))) {
      const cells: Pt[] = []
      for (let i = 0; i <= floors; i++) cells.push([0, i])
      const exit: Pt = [turn, floors]
      if (!fits(cells, exit)) continue
      // A woodpecker's cap is red, or the nearest the palette has to it that is not the bird's own colour.
      const red = nearestHue(theme, 5, color)
      const crest = red === color ? theme.colors.find((c) => c !== color && c !== ball.color) ?? red : red
      return { cells, exit: { at: exit, dir: turn }, lane: lane(floors, turn), state: { color, crest, floors, turn } }
    }
    return null
  },
  draw: (p, s, { k, t, ink, bg, weight }) => {
    const { floors, turn } = s
    const d = dropFor(floors, turn)
    const c = collarAt(t, d, turn)
    const ground = floors + 0.5

    // The ground; the pole, its knob and its foot, and the stop the collar lands on.
    soil(p, k, ink, weight, -0.5, 0.5, ground)
    tuft(p, k, ink, weight, 0.38, ground, 0.1, -0.02)
    solid(p, ink, weight, bg)
    p.rect(POLE * k, ((-0.43 + ground) / 2) * k, 0.045 * k, (ground + 0.43) * k, 0.015 * k)
    solid(p, ink, weight, s.color)
    p.circle(POLE * k, -0.43 * k, 0.085 * k)
    p.rect(POLE * k, (ground - 0.03) * k, 0.2 * k, 0.06 * k, 0.015 * k)
    p.rect(POLE * k, (FLOOR + d.fall + 0.08) * k, 0.1 * k, 0.04 * k, 0.012 * k)
    // The path in on its long stake, and the path out below, which the tray's low end comes down level with.
    post(p, k, ink, weight, -0.43, FLOOR, ground)
    rail(p, k, ink, weight, -0.5, RAIL_END)
    const rest = onTray({ y: FLOOR + d.fall, tilt: turn * TIP }, d.edge, 0)
    if (turn > 0) rail(p, k, ink, weight, rest[0] + 0.01, 0.5, floors + FLOOR)
    else rail(p, k, ink, weight, -0.5, rest[0] - 0.01, floors + FLOOR)

    // The bird on its spring, off the collar's far side.
    p.push()
    p.translate(POLE * k, c.y * k)
    p.rotate(c.tilt)
    const lean = LEAN - NODS * c.nod
    const at: Pt = [SPRING_AT[0] + SPRING * Math.cos(lean), SPRING_AT[1] - SPRING * Math.sin(lean)]
    // The spring: a zigzag from the collar to the bird's breast.
    outline(p, ink, weight * 0.8)
    p.noFill()
    p.beginShape()
    const turns = 5
    for (let i = 0; i <= turns * 2; i++) {
      const f = i / (turns * 2)
      const side = i === 0 || i === turns * 2 ? 0 : i % 2 ? 0.028 : -0.028
      p.vertex((SPRING_AT[0] + (at[0] - SPRING_AT[0]) * f + side * Math.sin(lean)) * k, (SPRING_AT[1] + (at[1] - SPRING_AT[1]) * f + side * Math.cos(lean)) * k)
    }
    p.endShape()
    p.push()
    p.translate(at[0] * k, at[1] * k)
    bird(p, k, ink, weight / 1.12, s.color, s.crest, -0.2 + 0.45 * c.nod)
    p.pop()
    // The collar, and the tray with its dish.
    solid(p, ink, weight, s.crest)
    p.rect(0, -0.04 * k, 0.1 * k, 0.12 * k, 0.015 * k)
    solid(p, ink, weight, bg)
    p.beginShape()
    p.vertex(TRAY[0] * k, 0)
    p.vertex(TRAY[1] * k, 0)
    p.vertex((TRAY[1] - 0.02) * k, 0.045 * k)
    p.vertex((TRAY[0] + 0.04) * k, 0.045 * k)
    p.endShape(p.CLOSE)
    p.pop()
  },
})
