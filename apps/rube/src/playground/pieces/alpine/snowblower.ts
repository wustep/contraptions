import type p5 from 'p5'
import { outline, solid } from '../../../../../../src/core/draw'
import { FLOOR, R, ROLL, arcPts, arrive, arriveAt, definePiece, over, puff, rail, ramp, trace, wait, type BallChange, type Lane, type Pt, type Seg } from '../../../parts'
import { G, flightSeg, ledge, ledgeStart, secondColor, tossTo } from './parts-a'
import { gearColor, snow, snowAt, snowWhite, wand } from './snow'

/**
 * A snow blower. It stands dug into the snow at the rail's end, facing the
 * ball, its drum cut open to us so the auger is seen end on: a shaft and
 * four flights, one of them lying level with the rail as its last length,
 * the next standing upright behind it, and snow lying in the bottom of the
 * drum. The ball rolls off the rail along the level flight and fetches up
 * in the crook of the two. The flight sinks under it, slowly, the engine
 * catches with a cough, and the auger runs away: the ball is swept down the
 * front, under, and up the back, faster all the way, where the fan takes
 * it up the chute, out of sight for a tenth of a second, and out of the
 * chute's mouth on a plume of the drum's snow, up and over to a ledge a
 * floor up and a cell on. It went round the drum with the snow and comes
 * out caked in it, white. The auger runs down and stops. The drum is empty.
 *
 * The ball's seat is a point of the auger, held between two flights, the
 * shaft and the drum's wall, so its way round is the auger's own turn and
 * the lane is traced from that. Up the back it is going straight up, which
 * is the way the chute goes, and the chute bends on to the lean the throw
 * needs. One pace, gaining, from the crook to the chute's mouth.
 */

/** The auger's shaft, level with the rail so a flight can lie along it; its hub, and how far the flights reach. */
const SHAFT: Pt = [-0.08, FLOOR]
const HUB = 0.06
const REACH = 0.3
/** The circle the ball is carried round on: against the hub. And the drum's wall, just outside the ball. */
const CARRY = R + HUB
const DRUM = CARRY + R + 0.015
/** Where on that circle the ball lies with a flight level under it: and so how far the auger turns to bring it to the back. */
const A_SEAT = Math.PI + Math.asin(FLOOR / CARRY)
/** The mouth's upper lip, as an angle round the drum. */
const A_LIP = (240 / 180) * Math.PI
/** The chute: its half width, how far it goes straight up from the back of the auger, and the radius it bends on at. */
const CHUTE = DRUM - CARRY
const COWL = -0.2
const UP_TO = -0.4
const BEND = 0.42
const LOFT = 0.3
const LAND_X = 1.2
const LEDGE_X = 0.85
/** The pace at the back of the auger, as the fan takes the ball; the beat the ball lies in the crook; how long the auger takes to run down. */
const V_BACK = 4.6
const DWELL = 0.08
const RUN_DOWN = 0.4
/** How deep the snow lies in the drum, below the shaft. */
const SNOW_IN = 0.1
/** The plume: how long the chute spouts, how long a lump of it lasts, and its pace as a part of the ball's. */
const SPOUT = 0.24
const LIFE = 0.36
const PLUME_PACE = 0.62

const onCarry = (a: number): Pt => [SHAFT[0] + CARRY * Math.cos(a), SHAFT[1] + CARRY * Math.sin(a)]
const SEAT0 = onCarry(A_SEAT)
const BACK = onCarry(0)

const T_ARRIVE = arriveAt(SEAT0[0])
const T_TURN = T_ARRIVE + DWELL
/** The auger's pace as the ball comes to the back, and how long it takes from a stand: its turn goes as the cube of the time, a heavy thing starting slowly. */
const SPIN_OUT = V_BACK / CARRY
const TAU = (3 * A_SEAT) / SPIN_OUT
const T_BACK = T_TURN + TAU

/** How far the auger has turned at piece time `t`: still, then running away with the ball, then running down. */
function augerAt(t: number): number {
  if (t <= T_TURN) return 0
  if (t < T_BACK) return A_SEAT * ((t - T_TURN) / TAU) ** 3
  return A_SEAT + SPIN_OUT * RUN_DOWN * (1 - Math.exp(-(t - T_BACK) / RUN_DOWN))
}
/** How hard the engine is running, 0 to 1: up with the auger, and down with it. */
const runAt = (t: number): number => (t <= T_TURN ? 0 : t < T_BACK ? ((t - T_TURN) / TAU) ** 2 : Math.exp(-(t - T_BACK) / RUN_DOWN))
const shakeAt = (t: number): number => 0.007 * runAt(t) * Math.sin(t * 70)

/** The throw, and the chute bent on to its lean. */
const PLAN = (() => {
  // The chute's mouth is where its bend has come round to the throw's lean; a few times round settles the two.
  let mouth: Pt = [BACK[0], UP_TO - 0.15]
  let flight = tossTo(mouth, [LAND_X, -1], LOFT)
  let lean = 0
  for (let i = 0; i < 5; i++) {
    lean = Math.atan2(flight.v[0], -flight.v[1])
    mouth = [BACK[0] + BEND * (1 - Math.cos(lean)), UP_TO - BEND * Math.sin(lean)]
    flight = tossTo(mouth, [LAND_X, -1], LOFT)
  }
  const speed = Math.hypot(flight.v[0], flight.v[1])
  return { mouth, flight, lean, speed, ledge: Math.max(LEDGE_X, ledgeStart(flight, -1, 1)) }
})()

/** The chute's centre line where it bends, from the top of its straight to its mouth. */
const chuteAt = (f: number): Pt => {
  const a = PLAN.lean * f
  return [BACK[0] + BEND * (1 - Math.cos(a)), UP_TO - BEND * Math.sin(a)]
}

/** Up the chute: the fan's pace gaining evenly to the throw's, and the ball out of sight while all of it is inside. */
const CHUTE_SEGS: Seg[] = (() => {
  const pts: Pt[] = [BACK, [BACK[0], COWL - R], [BACK[0], UP_TO]]
  for (let i = 1; i <= 3; i++) pts.push(chuteAt(i / 3))
  const lens = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]))
  const whole = lens.reduce((a, b) => a + b, 0)
  const paceAt = (s: number) => V_BACK + ((PLAN.speed - V_BACK) * s) / whole
  let s = 0
  return lens.map((len, i) => {
    const seg = ramp(pts[i], pts[i + 1], paceAt(s), paceAt(s + len))
    if (i > 0) seg.hidden = true
    s += len
    return seg
  })
})()
const FIRE = T_BACK + CHUTE_SEGS.reduce((sum, seg) => sum + seg.dur, 0)

const LANE: Lane = {
  segs: [
    ...arrive([-0.5, 0], SEAT0),
    wait(SEAT0, DWELL),
    ...trace((t) => onCarry(A_SEAT - augerAt(t)), T_TURN, T_BACK, 20),
    ...CHUTE_SEGS,
    flightSeg(PLAN.flight),
    ramp(PLAN.flight.to, [1.5, -1], Math.max(1.2, PLAN.flight.v[0]), ROLL),
  ],
  fire: FIRE,
}

function shape(p: p5, k: number, pts: Pt[], close = true): void {
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  if (close) p.endShape(p.CLOSE)
  else p.endShape()
}

/** The drum and the foot of the chute as one outline, open at the mouth: from the upper lip over the top, down the back, and round under to the lower lip at the rail's end. */
const HOUSING: Pt[] = [
  ...arcPts(SHAFT[0], SHAFT[1], DRUM, A_LIP, 1.5 * Math.PI + Math.asin((CARRY - CHUTE) / DRUM), 5),
  [BACK[0] - CHUTE, COWL],
  [BACK[0] + CHUTE, COWL],
  ...arcPts(SHAFT[0], SHAFT[1], DRUM, 0, Math.PI, 20),
]

/** The chute's two walls, from the cowl up and round to the throw's lean. */
const WALLS = (() => {
  const near: Pt[] = [[BACK[0] - CHUTE, COWL]]
  const far: Pt[] = [[BACK[0] + CHUTE, COWL]]
  for (let i = 0; i <= 6; i++) {
    const a = (PLAN.lean * i) / 6
    const c = chuteAt(i / 6)
    near.push([c[0] - CHUTE * Math.cos(a), c[1] - CHUTE * Math.sin(a)])
    far.push([c[0] + CHUTE * Math.cos(a), c[1] + CHUTE * Math.sin(a)])
  }
  return { near, far }
})()

/** The snow lying in the drum, `f` of it gone: what is under a level line across the drum. */
function drumSnow(f: number): Pt[] {
  const level = SNOW_IN + (DRUM - SNOW_IN) * f
  const a = Math.asin(level / DRUM)
  return arcPts(SHAFT[0], SHAFT[1], DRUM - 0.012, a, Math.PI - a, 12)
}

/**
 * The plume, `since` after the ball left the mouth: lumps spouted after it
 * at a part of its pace, each on its own fall, swelling and thinning to
 * nothing; drawn twice over, outlined and then filled, so they are one
 * body of snow with one outline.
 */
function plume(p: p5, k: number, ink: string, weight: number, white: string, since: number): void {
  const lumps: [number, number, number][] = []
  for (let e = 0; e <= Math.min(since, SPOUT); e += 0.015) {
    const age = since - e
    if (age >= LIFE) continue
    const f = age / LIFE
    const pace = PLAN.speed * (PLUME_PACE + 0.06 * Math.cos(e * 310))
    const a = Math.atan2(PLAN.flight.v[1], PLAN.flight.v[0]) + 0.1 * Math.sin(e * 470)
    const r = (0.07 + 0.09 * f) * (1 - f ** 4) * (1 - 0.5 * (e / SPOUT))
    if (r < 0.04) continue
    lumps.push([PLAN.mouth[0] + pace * Math.cos(a) * age, PLAN.mouth[1] + pace * Math.sin(a) * age + (G * age * age) / 2, r])
  }
  solid(p, ink, weight * 0.8, white)
  for (const [x, y, r] of lumps) p.circle(x * k, y * k, r * 2 * k)
  p.noStroke()
  p.fill(white)
  for (const [x, y, r] of lumps) p.circle(x * k, y * k, Math.max(0, r * 2 * k - weight * 0.8))
}

export const snowblower = definePiece<{ color: string; engine: string }>({
  name: 'snowblower',
  weight: 0.9,
  flight: true,
  dynamic: true,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, -1],
      [1, -1],
    ]
    if (!fits(cells, [2, -1])) return null
    const body = gearColor(theme, color, ball.color)
    // Round the drum with the snow, and out caked in it; a ball that came in white has nothing to take.
    const white = snowWhite(theme)
    const changes: BallChange[] = ball.color === white ? [] : [{ at: T_TURN, color: white, over: FIRE - T_TURN }]
    return { cells, exit: { at: [2, -1], dir: 1 }, lane: LANE, state: { color: body, engine: secondColor(theme, body, ball.color) }, changes }
  },
  draw: (p, s, { k, t, since, ink, bg, weight, theme }) => {
    const white = snowWhite(theme)
    const back = SHAFT[0] + DRUM

    // The snow, the rail to the drum's lower lip on its last wand, and the ledge a cell on.
    snow(p, k, ink, weight, -0.5, 1.5)
    rail(p, k, ink, weight, -0.5, SHAFT[0] - DRUM)
    wand(p, k, ink, weight, s.engine, -0.46)
    ledge(p, k, ink, weight, PLAN.ledge, 1.5, -1, 1.45)

    // The plume, behind the machine, so it comes out of the chute's mouth.
    if (since > 0 && since < SPOUT + LIFE) plume(p, k, ink, weight, white, since)

    p.push()
    p.translate(0, shakeAt(t) * k)

    // The handles, the engine and its wheel, behind the drum.
    outline(p, ink, weight * 1.2)
    p.line((back + 0.24) * k, 0.02 * k, (back + 0.74) * k, -0.32 * k)
    p.line((back + 0.74) * k, -0.32 * k, (back + 0.85) * k, -0.32 * k)
    // The exhaust, and the cough off it as the engine catches.
    outline(p, ink, weight)
    p.line((back + 0.12) * k, 0 * k, (back + 0.12) * k, -0.09 * k)
    const cough = over(t, T_TURN + TAU * 0.35, T_TURN + TAU * 0.35 + 0.5)
    if (cough > 0 && cough < 1) puff(p, k, ink, weight * 0.8, bg, back + 0.13 + 0.08 * cough, -0.15 - 0.2 * cough, (0.035 + 0.06 * cough) * (1 - cough ** 3))
    solid(p, ink, weight, s.engine)
    p.rect((back + 0.17) * k, 0.17 * k, 0.4 * k, 0.32 * k, 0.04 * k)
    const axle: Pt = [back + 0.22, snowAt(back + 0.22) - 0.1]
    solid(p, ink, weight, bg)
    p.circle(axle[0] * k, axle[1] * k, 0.24 * k)
    p.noStroke()
    p.fill(ink)
    p.circle(axle[0] * k, axle[1] * k, 0.05 * k)

    // The drum's far side, open toward us, with the snow lying in it.
    p.noStroke()
    p.fill(s.color)
    p.circle(SHAFT[0] * k, SHAFT[1] * k, DRUM * 2 * k)
    shape(p, k, HOUSING)
    const gone = over(t, T_TURN + TAU * 0.4, T_BACK + 0.12)
    if (gone < 1) {
      p.fill(white)
      shape(p, k, drumSnow(gone))
      const top = drumSnow(gone)
      outline(p, ink, weight * 0.8)
      p.line(top[0][0] * k, top[0][1] * k, top[top.length - 1][0] * k, top[top.length - 1][1] * k)
    }
    outline(p, ink, weight)
    shape(p, k, HOUSING, false)

    // The auger end on: four flights and the hub.
    const turn = augerAt(t)
    outline(p, ink, weight * 1.5)
    for (let i = 0; i < 4; i++) {
      const a = Math.PI - turn + (i * Math.PI) / 2
      p.line((SHAFT[0] + HUB * Math.cos(a)) * k, (SHAFT[1] + HUB * Math.sin(a)) * k, (SHAFT[0] + REACH * Math.cos(a)) * k, (SHAFT[1] + REACH * Math.sin(a)) * k)
    }
    solid(p, ink, weight, bg)
    p.circle(SHAFT[0] * k, SHAFT[1] * k, HUB * 2 * k)
    p.pop()
  },
  over: (p, s, { k, t, ink, weight }) => {
    // The chute, in front of the ball on its way up it: its mouth open.
    p.push()
    p.translate(0, shakeAt(t) * k)
    p.noStroke()
    p.fill(s.color)
    shape(p, k, [...WALLS.near, ...[...WALLS.far].reverse()])
    outline(p, ink, weight)
    shape(p, k, WALLS.near, false)
    shape(p, k, WALLS.far, false)
    p.line(WALLS.near[0][0] * k, COWL * k, WALLS.far[0][0] * k, COWL * k)
    p.pop()
  },
})
