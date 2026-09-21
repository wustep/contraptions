import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, fly, mixHex, over, rail, ramp, roll, trace, type Lane, type Pt } from '../../parts'
import { WATER, bodyColor, piling, seaWater, seabed, splash, water } from './sea'

/**
 * A chain of buoys. The deck stops, and beyond it three buoys stand in a
 * row, each on its own riser off one heavy ground chain that lies along the
 * bed from sinker to sinker: a squat can whose flat top is the height of
 * the deck, a pillar a third of a floor taller, a spar a third taller
 * again. A swell is running along the row. It lifts each buoy a third of a
 * floor and lets it down again, and each is half a swell behind the one
 * before it, so when one is on the crest the next is in the trough and
 * their tops are level. They lean with it, too: back toward the pier in the
 * trough, and over toward the next in line on the crest, where the riser
 * has come taut and holds the foot back.
 *
 * The ball rolls off the deck's end onto the can as it sits in its trough,
 * leaning back to take it. The can ducks under the weight, throws a little
 * water up either side, and the swell carries it up; near the crest it
 * heels over and the ball rolls off its top and hops the gap to the pillar,
 * which is just then at the bottom of its own trough. The pillar hands it
 * to the spar the same way, and the spar lifts it to the deck a floor up
 * and tips it off onto the planks. Each buoy bobs up when the weight leaves
 * it, rings that down, and goes on riding the swell as before.
 *
 * The swell is drawn: the sea's own colour let down into the paper, heaved
 * up off the still line, with the sea's ink line riding on its back, so it
 * is the sea's surface that is up and not a hill standing on it. The bed is
 * an eighth of a floor under the still line and a buoy goes up a third of a
 * floor, so only the sea can be what lifts it. By the pilings at either end
 * the swell dies away to the still line every pier has, so nothing jumps at
 * a cell's edge.
 *
 * Every buoy's top has one height and one heel at every instant, the swell,
 * the dip and the ring-down together, and while the ball is on a top its
 * lane is traced from them.
 */

/** The deck's end. */
const EDGE = -0.16
/** Where the three buoys are moored, and how far apart. */
const XS = [0.2, 0.9, 1.6]
const STEP = 0.7
/** The flat top every buoy wears: how wide, and how thick the plate is. */
const TREAD = 0.36
const PLATE = 0.055
/** The swell lifts the sea this far either side of its mean, this often: three rides on it make the floor, with what the ball's weight takes back from each. */
const SWELL = 0.213
const PERIOD = 1.6
/** A buoy floats with this much of it under the water, down to the foot its riser is shackled to; and it leans this far each way, about its waterline. */
const DRAFT = 0.065
const HEEL = 0.085
/** The upper deck: where it starts, its piling, and where the ball comes down on it. */
const SHELF_X = 2.06
const POST_X = 2.32
const LAND: Pt = [2.2, -1]

/** Off the deck's end onto the can: a short drop, this long and this far down. */
const T_EDGE = (EDGE + 0.5) / ROLL
const FIRST = 0.078
const DROP = 0.012
/** A hop from top to top: how long, and how high over the gap. */
const HOP = 0.2
const LOFT = 0.05
/** Each buoy is half a swell behind the one before it, so a hop is begun a little before the crest and ended this long after the next one's trough. */
const LAG = PERIOD / 2
const LATE = 0.08
const LEAD = HOP - LATE
/** When the ball lands on each buoy, when each buoy's heel passes through level, and when the ball leaves it. */
const LANDS = XS.map((_, i) => T_EDGE + FIRST + i * LAG)
const LEVELS = LANDS.map((t) => t - LATE + PERIOD / 4)
const LEAVES = LANDS.map((t) => t - LATE + PERIOD / 2 - LEAD)

/** Where the swell is in its round at `x`: nothing in the trough, half a turn on the crest. It runs east, a buoy's lag to a buoy's berth. */
const phaseAt = (x: number, t: number): number => (2 * Math.PI * (t - LANDS[0] + LATE - ((x - XS[0]) / STEP) * LAG)) / PERIOD
/** The swell dies away toward the pilings at either end, and is whole along the row. */
const shelter = (x: number): number => {
  const f = Math.min(over(x, EDGE - 0.1, XS[0] - 0.12), 1 - over(x, XS[2] + 0.12, POST_X - 0.04))
  return f * f * (3 - 2 * f)
}
/** How far the sea stands over its still line at `x`. */
const liftAt = (x: number, t: number): number => shelter(x) * SWELL * (1 - Math.cos(phaseAt(x, t)))

/** A buoy under a weight: how deep the ball's weight sits it, how hard the landing knocks it, how fast it bobs and how soon that dies. */
const DIP = 0.05
const KNOCK = 0.07
const BOB = 12
const DAMP = 0.2
const BOB_D = BOB * Math.sqrt(1 - DAMP * DAMP)
/** A weight set down on a float `s` seconds ago: down past where it will rest, back, and settled. */
const settle = (s: number): number => (s < 0 ? 0 : 1 - Math.exp(-DAMP * BOB * s) * (Math.cos(BOB_D * s) + ((DAMP * BOB) / BOB_D) * Math.sin(BOB_D * s)))
/** A knock `s` seconds ago: a bob that dies away. */
const jolt = (s: number): number => (s < 0 ? 0 : Math.exp(-DAMP * BOB * s) * Math.sin(BOB_D * s))
/** How far the ball has pushed buoy `i` down: sat on, and then let go, which is the same weight taken off again. */
const dipAt = (i: number, t: number): number => DIP * (settle(t - LANDS[i]) - settle(t - LEAVES[i])) + KNOCK * jolt(t - LANDS[i])

/** Where buoy `i` floats: the height of its waterline, which is the sea's under it and the ball's push. */
const floatAt = (i: number, t: number): number => WATER - liftAt(XS[i], t) + dipAt(i, t)
/** How far the ball landing on its near side rocks a buoy back, and how far it rocks back again when the weight rolls off its far one. */
const ROCK_ON = 0.02
const ROCK_OFF = 0.03
/** Its heel: back toward the pier in the trough, over toward the next on the crest, and the two rocks the ball gives it. */
const heelAt = (i: number, t: number): number => -HEEL * Math.cos(phaseAt(XS[i], t)) - ROCK_ON * jolt(t - LANDS[i]) - ROCK_OFF * jolt(t - LEAVES[i])

/** Where the ball lands on a top, where it comes to rest, and where it leaves, from the middle. */
const U_ON = -0.13
const U_SIT = -0.03
const U_OFF = 0.17
/** How tall each buoy stands out of the water: the can takes the ball a hair under the deck's height, and each of the others takes it level from the one before. */
const TALL: number[] = []
/** The ball's centre on buoy `i`, `u` along its top: a radius off the plate, square to it, the buoy heeled about its waterline. */
const ballOn = (i: number, u: number, t: number): Pt => {
  const h = heelAt(i, t)
  return [XS[i] + (TALL[i] + R) * Math.sin(h) + u * Math.cos(h), floatAt(i, t) - (TALL[i] + R) * Math.cos(h) + u * Math.sin(h)]
}
/** Where the ball leaves each top. */
const OFFS: Pt[] = []
XS.forEach((_, i) => {
  const h = heelAt(i, LANDS[i])
  TALL.push((floatAt(i, LANDS[i]) + U_ON * Math.sin(h) - (i === 0 ? DROP : OFFS[i - 1][1])) / Math.cos(h) - R)
  OFFS.push(ballOn(i, U_OFF, LEAVES[i]))
})
/** The top of buoy `i`, up its own axis. */
const topAt = (i: number, t: number): number => floatAt(i, t) - TALL[i]
/** Where the ball lands on each top, and then on the planks. */
const ONS: Pt[] = [...XS.map((_, i) => ballOn(i, U_ON, LANDS[i])), LAND]
/** The pace the ball has left once it is down on a top, and the pace it must leave with, which is its hop's. */
const V_ON = [1.8, 1.3, 1.3]
const V_OFF = XS.map((_, i) => Math.hypot(ONS[i + 1][0] - OFFS[i][0], ONS[i + 1][1] - OFFS[i][1] - 4 * LOFT) / HOP)

/** The ball along the top of buoy `i`: checked by the slope it lands on, sat still while the buoy comes level, and away down the slope as it heels over. */
function alongAt(i: number, t: number): number {
  const s = t - LANDS[i]
  const check = (2 * (U_SIT - U_ON)) / V_ON[i]
  if (s < check) return U_ON + V_ON[i] * s * (1 - s / (2 * check))
  if (t < LEVELS[i]) return U_SIT
  const run = LEAVES[i] - LEVELS[i]
  return U_SIT + (U_OFF - U_SIT) * over(t, LEVELS[i], LEAVES[i]) ** ((V_OFF[i] * run) / (U_OFF - U_SIT))
}

/** The ride on each top, from landing to leaving. */
const RIDES = XS.map((_, i) => trace((t) => ballOn(i, alongAt(i, t), t), LANDS[i], LEAVES[i], 28))
const LANE: Lane = {
  segs: [
    roll([-0.5, 0], [EDGE, 0], ROLL),
    fly([EDGE, 0], ONS[0], FIRST, 0.01),
    ...RIDES[0],
    fly(OFFS[0], ONS[1], HOP, LOFT),
    ...RIDES[1],
    fly(OFFS[1], ONS[2], HOP, LOFT),
    ...RIDES[2],
    fly(OFFS[2], LAND, HOP, LOFT),
    // Down on the planks at the pace the hop crossed the gap, and up to the deck's own by the cell's edge.
    ramp(LAND, [2.5, -1], (LAND[0] - OFFS[2][0]) / HOP, ROLL),
  ],
  fire: LEAVES[0],
}

/** The still sea's line, wave for wave with `water`. */
const stillAt = (x: number): number => WATER + 0.022 * Math.sin(x * Math.PI * 6)
/** The ground chain lies at this height on the bed, between a sinker at either end. */
const CHAIN_Y = 0.468
const SINKERS = [XS[0] - 0.24, XS[2] + 0.2]
/** A riser lifts straight off the ground chain until the foot is this high over it, and from there its lower end runs west along the bed as it comes taut. */
const SLACK = 0.25

/** Each buoy's float: how wide, and how far its shoulder stands out of the water; and the tower on it: how wide at the shoulder and under the plate. The can is all float. */
const FLOAT = [0.38, 0.36, 0.3]
const SHOULDER = [0, 0.12, 0.1]
const TOWER: [number, number][] = [
  [0.38, 0.38],
  [0.24, 0.14],
  [0.13, 0.09],
]

/** A run of chain from a to b: short fat links with gaps between, counted from a. */
function links(p: p5, k: number, ink: string, weight: number, x0: number, y0: number, x1: number, y1: number, link = 0.045): void {
  const L = Math.hypot(x1 - x0, y1 - y0)
  if (L < 0.01) return
  p.stroke(ink)
  p.strokeWeight(weight * 1.3)
  p.strokeCap(p.SQUARE)
  for (let d = 0; d < L - 0.01; d += link + 0.03) {
    const a = d / L
    const b = Math.min(d + link, L) / L
    p.line((x0 + (x1 - x0) * a) * k, (y0 + (y1 - y0) * a) * k, (x0 + (x1 - x0) * b) * k, (y0 + (y1 - y0) * b) * k)
  }
  p.strokeCap(p.ROUND)
}

export const buoychain = definePiece<{ colors: string[]; band: string }>({
  name: 'buoychain',
  weight: 0.8,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [2, 0],
      [1, -1],
      [2, -1],
    ]
    if (!fits(cells, [3, -1])) return null
    // Three colours, none the ball's: the planner's and two more, with the palest left over for the band; the sea's own blue, if it is one of them, goes to the spar, which stands clear of the swell.
    const first = bodyColor(theme, color, ball.color)
    const light = (c: string) => parseInt(c.slice(1, 3), 16) + parseInt(c.slice(3, 5), 16) + parseInt(c.slice(5, 7), 16)
    const rest = theme.colors.filter((c) => c !== ball.color && c !== first).sort((a, b) => light(b) - light(a))
    const band = rest[0] ?? theme.bg
    const sea = seaWater(theme)
    const colors = [first, ...rest.slice(1), first, first].slice(0, 3).sort((a, b) => (a === sea ? 1 : 0) - (b === sea ? 1 : 0))
    return { cells, exit: { at: [3, -1], dir: 1 }, lane: LANE, state: { colors, band } }
  },
  draw: (p, s, { k, t, ink, bg, weight, theme }) => {
    const sea = seaWater(theme)

    // The deck in and its piling; the deck a floor up on its own long piling; the bed.
    rail(p, k, ink, weight, -0.5, EDGE)
    piling(p, k, ink, weight, EDGE - 0.06)
    rail(p, k, ink, weight, SHELF_X, 2.5, -1 + FLOOR)
    piling(p, k, ink, weight, POST_X, -1 + FLOOR, 0.5)
    seabed(p, k, ink, weight, -0.5, 2.5)

    // The swell: the sea's own colour let down into the paper, and no ink, heaved up off the still line and running east along the row.
    p.noStroke()
    p.fill(mixHex(sea, bg, 0.4))
    p.beginShape()
    const x0 = EDGE - 0.1
    const x1 = POST_X - 0.04
    const n = 72
    for (let j = 0; j <= n; j++) {
      const x = x0 + ((x1 - x0) * j) / n
      p.vertex(x * k, (stillAt(x) - liftAt(x, t)) * k)
    }
    for (let j = n; j >= 0; j--) {
      const x = x0 + ((x1 - x0) * j) / n
      p.vertex(x * k, stillAt(x) * k)
    }
    p.endShape(p.CLOSE)

    // The ground chain along the bed, a sinker at either end of it.
    links(p, k, ink, weight, SINKERS[0], CHAIN_Y, SINKERS[1], CHAIN_Y, 0.09)
    solid(p, ink, weight, ink)
    for (const x of SINKERS) p.rect(x * k, (CHAIN_Y - 0.005) * k, 0.1 * k, 0.04 * k, 0.01 * k)

    XS.forEach((x, i) => {
      const float = floatAt(i, t)
      const heel = heelAt(i, t)
      const tall = float - topAt(i, t)
      // The riser, from the foot: straight up off the ground chain while there is slack in it, and drawn out to the west as the swell takes the slack up.
      const foot: Pt = [x - DRAFT * Math.sin(heel), float + DRAFT * Math.cos(heel)]
      const h = CHAIN_Y - foot[1]
      const reach = Math.max(0, (h * h - SLACK * SLACK) / (2 * SLACK))
      links(p, k, ink, weight, foot[0], foot[1], x - reach, CHAIN_Y)

      // The buoy, about its waterline: a float in the water, a tower on it, and the plate on top; one pale band.
      p.push()
      p.translate(x * k, float * k)
      p.rotate(heel)
      const under = SHOULDER[i] ? tall - PLATE : tall
      const fw = FLOAT[i] / 2
      const [tw0, tw1] = [TOWER[i][0] / 2, TOWER[i][1] / 2]
      const sh = SHOULDER[i] || under
      const towerW = (y: number) => tw0 + (tw1 - tw0) * over(y, sh + 0.04, under)
      const hull = () => {
        p.beginShape()
        p.vertex(-tw1 * k, -under * k)
        p.vertex(tw1 * k, -under * k)
        if (SHOULDER[i]) p.vertex(tw0 * k, -(sh + 0.04) * k)
        p.vertex(fw * k, -sh * k)
        p.vertex(fw * k, 0.01 * k)
        p.vertex(0.035 * k, DRAFT * k)
        p.vertex(-0.035 * k, DRAFT * k)
        p.vertex(-fw * k, 0.01 * k)
        p.vertex(-fw * k, -sh * k)
        if (SHOULDER[i]) p.vertex(-tw0 * k, -(sh + 0.04) * k)
        p.endShape(p.CLOSE)
      }
      solid(p, ink, weight, s.colors[i])
      hull()
      // The band, flat in the fill with the outline drawn again over its ends: round the can's middle, and half way up the towers of the other two.
      const b0 = SHOULDER[i] ? sh + 0.04 + (under - sh - 0.04) * 0.45 : under * 0.42
      const b1 = b0 + (SHOULDER[i] ? 0.1 : 0.08)
      p.noStroke()
      p.fill(s.band)
      p.quad(-towerW(b0) * k, -b0 * k, towerW(b0) * k, -b0 * k, towerW(b1) * k, -b1 * k, -towerW(b1) * k, -b1 * k)
      outline(p, ink, weight)
      hull()
      // The plate on a tower's head, on two brackets; the can's own lid is its plate.
      if (SHOULDER[i]) {
        for (const side of [-1, 1]) p.line(side * (TREAD / 2 - 0.04) * k, -under * k, side * towerW(under - 0.11) * k, -(under - 0.11) * k)
        solid(p, ink, weight, s.colors[i])
        p.rect(0, -(tall - PLATE / 2) * k, TREAD * k, PLATE * k, 0.012 * k)
      }
      p.pop()
    })

    // The sea's line in front of them, so they stand in it: still by the pilings, where every pier has it, and heaved up with the swell along the row.
    water(p, k, ink, weight, -0.5, x0)
    water(p, k, ink, weight, x1, 2.5)
    outline(p, ink, weight * 0.8)
    p.beginShape()
    for (let j = 0; j <= n; j++) {
      const x = x0 + ((x1 - x0) * j) / n
      p.vertex(x * k, (stillAt(x) - liftAt(x, t)) * k)
    }
    p.endShape()
    // What the ball's weight does to it: the float goes down into the sea and throws a little of it up either side.
    XS.forEach((x, i) => {
      for (const side of [-1, 1]) splash(p, k, sea, weight, x + side * (FLOAT[i] / 2 + 0.04), stillAt(x) - liftAt(x, t), over(t, LANDS[i] + 0.03, LANDS[i] + 0.5), 0.45)
    })
  },
})
