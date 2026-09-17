import { outline, solid } from '../../../../../src/core/draw'
import { easeInQuad, easeOutQuad } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, fly, over, post, rail, ramp, rankBy, roll, wait, type Lane, type Pt } from '../../parts'
import { bloom, pot, soil, stem, tuft } from './green'

/**
 * A spade across a log: a lever. Its blade lies at the rail's end, its
 * handle up in the air at the far side, and over the handle a heavy
 * flowerpot stands half off a shelf, propped there by a twig whose foot is
 * on the spade's grip. The ball rolls onto the blade, up against its
 * tread, and stops; the blade sinks a hair and the grip kicks up — and
 * kicks the twig out. The pot comes down on the handle, the blade flips,
 * and the ball goes up off its face, a floor or two, over the top and down
 * onto a ledge, on or back the way it came. Soil flies. The pot stays on
 * the handle, its flower nodding, and the twig lies where it fell.
 *
 * The blade's face throws the ball along its own normal, so the angle the
 * blade has reached when the ball leaves it is the lean of the throw: a
 * little past level for a ball going on, a little short of it for one
 * going back.
 */
export interface SpadeState {
  color: string
  floors: number
  turn: 1 | -1
}

/** The top of the log, where the spade rocks. */
const PIVOT: Pt = [0.2, 0.105]
const LOG_R = 0.185
/** Along the spade from the pivot: the blade's tip and tread on one side, the grip's end on the other. */
const TIP = -0.37
const TREAD = -0.11
const GRIP = 0.24
/** The blade, seen a little from above: how far its face reaches behind the spade's line and in front of it. */
const FACE: [number, number] = [-0.045, 0.065]
/** Half the shaft's thickness. */
const SHAFT = 0.025
/** Where the ball sits along the blade, in its dish, and how far its centre stands off the spade's line. */
const SEAT_R = TREAD - R - 0.02
const SEAT_UP = R - 0.012
/** The spade's tilt: at rest with the blade down, sunk a little further under the ball, and thrown over onto its stop. */
const REST0 = -0.1
const REST = -0.17
const STOP = 0.27
/** Where the pot comes down on the handle. */
const POT_R = 0.115
const POT_W = 0.15
const POT_H = 0.14
const SHELF_Y = -0.25
const POST_X = 0.46
/** The twig: its foot on the grip, its fork under the pot's overhang. */
const TWIG_R = 0.215
const TWIG_TOP: Pt = [0.255, SHELF_Y]
const TWIG_LIES: Pt = [0.33, 0.485]

/** Cartoon gravity for the throw, and how far it peaks over the ledge's ball line. */
const G = 16
const LOFT = 0.3
/** Where the ball comes down on the ledge, from the cell's middle. */
const LAND_X = 0.38

/** A point `r` along the spade and `up` off its centreline, with the spade tilted `a`. */
const onSpade = (a: number, r: number, up = 0): Pt => [PIVOT[0] + r * Math.cos(a) + up * Math.sin(a), PIVOT[1] + r * Math.sin(a) - up * Math.cos(a)]
/** The ball's centre in its seat on the blade. */
const seatAt = (a: number): Pt => onSpade(a, SEAT_R, SEAT_UP)

const SEAT0 = seatAt(REST0)
const SEAT = seatAt(REST)
/** Rolls in at the rail's pace and slows to a stop against the tread, up the blade's slight slope. */
const SLOW: Pt = [SEAT0[0] - 0.16, 0]
const ARRIVE = (SLOW[0] + 0.5) / ROLL + Math.hypot(SEAT0[0] - SLOW[0], SEAT0[1]) / (ROLL / 2)
const SINK = 0.08
const T_TWIG = ARRIVE + SINK * 0.5
const T_POT = ARRIVE + SINK + 0.03
/** The pot's fall, from the shelf to the handle. */
const POT_FROM: Pt = [0.315, SHELF_Y]
const POT_ON = onSpade(REST, POT_R, SHAFT)
const FALL_T = Math.sqrt((2 * (POT_ON[1] - POT_FROM[1])) / G)
const FIRE = T_POT + FALL_T

/** Everything about one throw: a floor or two, on or back. */
interface Throw {
  /** The blade's tilt as the ball leaves it, and how long the snap takes to get there and to the stop. */
  launch: number
  snap: number
  c: number
  from: Pt
  land: Pt
  dur: number
  arc: number
  /** The ledge's near end, clear of the ball on its way up past it. */
  ledge: number
}

const THROWS = new Map<string, Throw>()
function throwFor(floors: number, turn: 1 | -1): Throw {
  const key = `${floors}:${turn}`
  const known = THROWS.get(key)
  if (known) return known
  const land: Pt = [turn * LAND_X, -floors]
  // The lean of the throw sets the angle the ball leaves the blade at, which sets where it leaves from; twice round settles it.
  let launch = 0
  let from = seatAt(launch)
  let tUp = 0
  let dur = 0
  for (let i = 0; i < 3; i++) {
    from = seatAt(launch)
    tUp = Math.sqrt((2 * (from[1] - land[1] + LOFT)) / G)
    dur = tUp + Math.sqrt((2 * LOFT) / G)
    launch = Math.atan2((land[0] - from[0]) / dur, G * tUp)
  }
  const arc = Math.pow(Math.sqrt(from[1] - land[1] + LOFT) + Math.sqrt(LOFT), 2) / 4
  // The blade's face moves at the ball's speed as it lets go.
  const v = Math.hypot((land[0] - from[0]) / dur, G * tUp)
  const push = Math.hypot(from[0] - SEAT[0], from[1] - SEAT[1])
  const c = (launch - REST) / (STOP - REST)
  const snap = (2 * push) / v / c
  // When the ball's top clears the ledge's line on the way up, and where it is then.
  const rise = from[1] - (land[1] + 2 * R)
  const tPast = (G * tUp - Math.sqrt(Math.max(0, G * G * tUp * tUp - 2 * G * rise))) / G
  const xPast = from[0] + ((land[0] - from[0]) * tPast) / dur
  const ledge = Math.max(0.16, Math.abs(xPast) + R + 0.02)
  const out = { launch, snap, c, from, land, dur, arc, ledge }
  THROWS.set(key, out)
  return out
}

/** The snap, 0 → 1: hard up to the launch angle, then the follow-through to the stop. */
const snapAt = (u: number, c: number): number => (u < c ? c * (u / c) * (u / c) : c + (1 - c) * (1 - Math.pow(1 - (u - c) / (1 - c), 2)))

/** The spade's tilt at piece time `t`. */
function tiltAt(t: number, th: Throw): number {
  if (t < ARRIVE) return REST0
  if (t < FIRE) return REST0 + (REST - REST0) * easeOutQuad(over(t, ARRIVE, ARRIVE + SINK))
  const since = t - FIRE
  if (since < th.snap) return REST + (STOP - REST) * snapAt(since / th.snap, th.c)
  const s = since - th.snap
  return STOP - 0.035 * Math.exp(-s * 14) * Math.sin(s * 60)
}

export const spade = definePiece<SpadeState>({
  name: 'spade',
  weight: 1,
  flight: true,
  place: ({ rng, color, fits, taste }) => {
    const tall = taste.weights['lift-tall'] ?? 1
    const options = rng.shuffle([1, 2].flatMap((floors) => [1, -1].map((turn) => ({ floors, turn: turn as 1 | -1 }))))
    for (const { floors, turn } of rankBy(rng, options, (o) => Math.pow(tall, o.floors - 1))) {
      const cells: Pt[] = []
      for (let i = 0; i <= floors; i++) cells.push([0, -i])
      const exit: Pt = [turn, -floors]
      if (!fits(cells, exit)) continue
      const th = throwFor(floors, turn)
      const lane: Lane = {
        segs: [
          roll([-0.5, 0], SLOW, ROLL),
          ramp(SLOW, SEAT0, ROLL, 0),
          { from: SEAT0, to: SEAT, dur: SINK, ease: 'out' },
          wait(SEAT, FIRE - ARRIVE - SINK),
          { from: SEAT, to: th.from, dur: th.c * th.snap, ease: 'in' },
          fly(th.from, th.land, th.dur, th.arc),
          ramp(th.land, [turn * 0.5, -floors], 1.3, ROLL),
        ],
        fire: FIRE,
      }
      return { cells, exit: { at: exit, dir: turn }, lane, state: { color, floors, turn } }
    }
    return null
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const { floors, turn } = s
    const th = throwFor(floors, turn)
    const a = tiltAt(t, th)
    const top = -floors
    const railEnd = onSpade(REST0, TIP)[0] - 0.015

    // The path in to its last stake, the ground, and the ledge above on its post.
    rail(p, k, ink, weight, -0.5, railEnd)
    post(p, k, ink, weight, railEnd)
    soil(p, k, ink, weight, -0.5, -0.02)
    outline(p, ink, weight)
    p.line(-0.02 * k, 0.5 * k, 0.5 * k, 0.5 * k)
    tuft(p, k, ink, weight, -0.42, 0.5, 0.11, 0.03)
    rail(p, k, ink, weight, turn * th.ledge, turn * 0.5, top + FLOOR)
    // The shelf's post; it carries the ledge too when the ledge is on its side.
    if (turn > 0) {
      post(p, k, ink, weight, POST_X, top + FLOOR, 0.5)
      outline(p, ink, weight)
      p.line(POST_X * k, (top + FLOOR + 0.16) * k, (th.ledge + 0.03) * k, (top + FLOOR) * k)
    } else {
      post(p, k, ink, weight, POST_X, SHELF_Y, 0.5)
      post(p, k, ink, weight, -0.44, top + FLOOR, 0.5)
      outline(p, ink, weight)
      p.line(-0.44 * k, (top + FLOOR + 0.16) * k, (-th.ledge - 0.03) * k, (top + FLOOR) * k)
    }
    // The shelf the pot stands half off, and the peg the grip comes down on.
    outline(p, ink, weight)
    p.line(POST_X * k, SHELF_Y * k, 0.295 * k, SHELF_Y * k)
    const stop = onSpade(STOP, GRIP - 0.03, -SHAFT)
    p.line(POST_X * k, (stop[1] + 0.02) * k, (stop[0] - 0.04) * k, (stop[1] + 0.02) * k)

    // The log, seen a little from the side: its bark running back, and the sawn end with one ring and a check.
    const logY = PIVOT[1] + SHAFT + LOG_R
    const back = 0.075
    solid(p, ink, weight, bg)
    p.circle((PIVOT[0] + back) * k, logY * k, LOG_R * 2 * k)
    p.noStroke()
    p.rect((PIVOT[0] + back / 2) * k, logY * k, back * k, LOG_R * 2 * k)
    outline(p, ink, weight)
    p.line(PIVOT[0] * k, (logY - LOG_R) * k, (PIVOT[0] + back) * k, (logY - LOG_R) * k)
    p.line(PIVOT[0] * k, (logY + LOG_R) * k, (PIVOT[0] + back) * k, (logY + LOG_R) * k)
    solid(p, ink, weight, bg)
    p.circle(PIVOT[0] * k, logY * k, LOG_R * 2 * k)
    outline(p, ink, weight * 0.55)
    p.circle((PIVOT[0] + 0.01) * k, (logY + 0.01) * k, LOG_R * 0.9 * k)
    p.line((PIVOT[0] - LOG_R * 0.9) * k, (logY + LOG_R * 0.12) * k, (PIVOT[0] - LOG_R * 0.52) * k, (logY + LOG_R * 0.06) * k)

    // The twig: propping the pot until the grip kicks it out; then it tumbles down and lies by the log.
    const foot0 = onSpade(REST0, TWIG_R, SHAFT)
    const twigLen = Math.hypot(TWIG_TOP[0] - foot0[0], TWIG_TOP[1] - foot0[1])
    const propped = Math.atan2(TWIG_TOP[1] - foot0[1], TWIG_TOP[0] - foot0[0])
    const fallen = over(t, T_TWIG, T_TWIG + 0.5)
    p.push()
    if (fallen <= 0) {
      p.translate(((foot0[0] + TWIG_TOP[0]) / 2) * k, ((foot0[1] + TWIG_TOP[1]) / 2) * k)
      p.rotate(propped)
    } else {
      const from: Pt = [(foot0[0] + TWIG_TOP[0]) / 2, (foot0[1] + TWIG_TOP[1]) / 2]
      const kick = 0.08 * Math.sin(Math.PI * Math.min(1, fallen * 2.2))
      p.translate((from[0] + (TWIG_LIES[0] - from[0]) * easeOutQuad(fallen)) * k, (from[1] + (TWIG_LIES[1] - from[1]) * easeInQuad(fallen) - kick) * k)
      p.rotate(propped + (Math.PI * 2 - propped) * easeOutQuad(fallen))
    }
    outline(p, ink, weight * 1.1)
    p.line((-twigLen / 2) * k, 0, (twigLen / 2) * k, 0)
    p.line(twigLen * 0.2 * k, 0, (twigLen * 0.2 + 0.045) * k, 0.04 * k)
    p.pop()

    // The spade, about the top of the log: the shaft and its grip, then the blade, seen a little from above.
    p.push()
    p.translate(PIVOT[0] * k, PIVOT[1] * k)
    p.rotate(a)
    solid(p, ink, weight, bg)
    p.rect(((TREAD + GRIP - 0.06) / 2) * k, 0, (GRIP - 0.06 - TREAD) * k, SHAFT * 2 * k, 0.01 * k)
    solid(p, ink, weight, s.color)
    p.circle((GRIP - 0.045) * k, 0, 0.1 * k)
    solid(p, ink, weight * 0.8, bg)
    p.circle((GRIP - 0.045) * k, 0, 0.04 * k)
    // The blade: square shoulders, a rounded point, and the socket the shaft goes into.
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(TREAD * k, FACE[0] * k)
    p.vertex((TIP + 0.1) * k, FACE[0] * k)
    p.bezierVertex((TIP + 0.03) * k, FACE[0] * k, TIP * k, (FACE[0] * 0.3 + FACE[1] * 0.2) * k, TIP * k, ((FACE[0] + FACE[1]) / 2) * k)
    p.bezierVertex(TIP * k, (FACE[1] * 0.8) * k, (TIP + 0.03) * k, FACE[1] * k, (TIP + 0.1) * k, FACE[1] * k)
    p.vertex(TREAD * k, FACE[1] * k)
    p.endShape(p.CLOSE)
    solid(p, ink, weight, ink)
    p.triangle(TREAD * k, -SHAFT * k, TREAD * k, SHAFT * k, (TREAD - 0.07) * k, 0.008 * k)
    p.pop()

    // The pot: on the shelf, over the edge and down, then riding the handle for good.
    const falling = over(t, T_POT, FIRE)
    const base: Pt = t < T_POT ? POT_FROM : t < FIRE ? [POT_FROM[0] + (POT_ON[0] - POT_FROM[0]) * falling, POT_FROM[1] + (POT_ON[1] - POT_FROM[1]) * easeInQuad(falling)] : onSpade(a, POT_R, SHAFT)
    const lean = t < T_POT ? 0 : t < FIRE ? -0.28 * Math.sin(Math.PI * Math.min(1, falling * 1.15)) + REST * falling : a
    const nod = since > 0 ? 0.5 * Math.exp(-since * 3) * Math.sin(since * 22) : t > T_TWIG && t < T_POT ? 0.06 * Math.sin(t * 70) : 0
    p.push()
    p.translate(base[0] * k, base[1] * k)
    p.rotate(lean)
    stem(p, k, ink, weight, -0.01, -POT_H, -0.025 + nod * 0.05, -POT_H - 0.09, nod * 0.04)
    bloom(p, k, ink, weight, s.color, bg, -0.025 + nod * 0.05, -POT_H - 0.1, 0.055, 5, 1, nod)
    pot(p, k, ink, weight, s.color, 0, 0, POT_W, POT_H)
    p.pop()

    // Soil off the blade as it flips, and the crack of the pot on the handle.
    if (since > 0 && since < 0.5) {
      const f = over(since, 0, 0.5)
      const tip = onSpade(REST, TIP + 0.1, 0.03)
      p.push()
      p.noStroke()
      p.fill(ink)
      for (let i = 0; i < 5; i++) {
        const vx = -0.35 - 0.12 * i + 0.25 * (i % 2)
        const vy = -2.0 + 0.22 * i
        p.circle((tip[0] + vx * since) * k, (tip[1] + vy * since + 3.6 * since * since) * k, (0.042 - 0.02 * f) * (0.7 + 0.3 * (i % 2)) * k)
      }
      p.pop()
    }
    if (since > 0 && since < 0.18) {
      const f = over(since, 0, 0.18)
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      for (const dx of [-0.11, 0.11]) {
        p.line((POT_ON[0] + dx * (1 + 0.4 * f)) * k, (POT_ON[1] - 0.03) * k, (POT_ON[0] + dx * (1.4 + 0.6 * f)) * k, (POT_ON[1] - 0.07 - 0.03 * f) * k)
      }
      p.pop()
    }
  },
})
