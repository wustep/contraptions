import { outline, solid } from '../../../../../src/core/draw'
import { easeInQuad, easeOutCubic } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, over, rail, ramp, roll, trace, type Lane, type Pt } from '../../parts'
import { WATER, bubbles, piling, seaColor, seaWater, water } from './sea'

/**
 * A lock. A chamber between a sill and a quay wall, a floor deep; a raft on
 * two barrels floats in it, level with the deck, and a guillotine gate
 * hangs open over the sill. The ball rolls across the apron onto the raft
 * — the apron trips the gate, which comes down behind it — and along the
 * planks to a stop. The plug in the bed of the upper pound lifts; water
 * runs down the culvert through the quay and jets into the chamber; the
 * level climbs the gauge on the wall, the raft and the ball with it, a
 * whole floor. The raft fetches up under its stop at the quay end first
 * and its tail kicks up, and the ball rolls off onto the upper deck. The
 * chamber stays full, the gate shut, the raft at the top.
 *
 * The ball rides the raft: from the apron to the upper deck its lane is
 * sampled from the one motion the raft is drawn with.
 */
/** The sill the gate shuts on, the apron off its end, the raft, and the quay wall. */
const SILL = -0.16
const RAFT_W = -0.1
const RAFT_E = 0.9
const HALF = (RAFT_E - RAFT_W) / 2
const CX = (RAFT_E + RAFT_W) / 2
const QUAY = 0.92
const GATE_X = -0.23
/** The raft rides this far out of the water, so the chamber's level and the pounds' agree at both ends. */
const FREEBOARD = WATER - FLOOR
/** The ball comes to rest this far east of the raft's middle. */
const REST = 0.2

const T_TRIP = (SILL + 0.04 + 0.5) / ROLL
const T_ON = (RAFT_W + 0.5) / ROLL
const IN = (2 * (REST + HALF)) / ROLL
const T_STOP = T_ON + IN
const FIRE = T_STOP + 0.25
const DUR = 1.45
const T_TOP = FIRE + DUR
const T_ROLL = T_TOP + 0.05
const PUSH = 2.2
const T_OFF = T_ROLL + Math.sqrt((HALF - REST) / PUSH)
const V_OFF = 2 * PUSH * (T_OFF - T_ROLL)

/** The gate: how far it falls, and how long that takes. */
const GATE_H = 0.8
const GATE_UP = 0.36
const GATE_T = 0.22

/** How far along the raft from its middle the ball is. */
function alongAt(t: number): number {
  if (t < T_STOP) {
    const tau = Math.max(0, t - T_ON)
    return -HALF + ROLL * tau - (ROLL * tau * tau) / (2 * IN)
  }
  if (t < T_ROLL) return REST
  return Math.min(HALF, REST + PUSH * Math.pow(t - T_ROLL, 2))
}
/** How far up the chamber has filled, 0 to 1: a slow start, and still coming up when the raft meets its stop. */
const filledAt = (t: number) => {
  const r = over(t, FIRE, T_TOP)
  return r * r * (1.7 - 0.7 * r)
}
/** The raft: its quay end's deck height, and how far it is down by that end. It dips under the ball as it boards; its tail kicks up at the top. */
function raftAt(t: number): { east: number; a: number } {
  const aboard = over(t, T_ON - 0.02, T_ON + 0.08) * (1 - over(t, T_OFF, T_OFF + 0.2))
  const s = t - T_TOP
  const kick = s < 0 ? 0 : s < 0.5 ? 0.06 * Math.sin((Math.PI * s) / 0.5) : 0.012 * Math.exp(-(s - 0.5) * 3) * Math.sin((s - 0.5) * 9)
  const lean = -0.03 * aboard * Math.max(0, Math.min(1, (0.1 - alongAt(t)) / 0.6))
  return { east: FLOOR - filledAt(t) + 0.004 * Math.sin(t * 1.7) * (1 - over(t, FIRE, T_TOP)), a: lean + kick }
}
const deckAt = (u: number, t: number) => {
  const { east, a } = raftAt(t)
  return east - (HALF - u) * a
}
const ballAt = (t: number): Pt => {
  const u = alongAt(t)
  return [CX + u, deckAt(u, t) - R]
}

const RIDE = [...trace(ballAt, T_ON, T_STOP, 14), ...trace(ballAt, T_STOP, FIRE, 3), ...trace(ballAt, FIRE, T_TOP, 36), ...trace(ballAt, T_TOP, T_OFF, 12)]
const LANE: Lane = {
  segs: [roll([-0.5, 0], RIDE[0].from, ROLL), ...RIDE, ramp(RIDE[RIDE.length - 1].to, [1.5, -1], V_OFF, ROLL)],
  fire: FIRE,
}

export const lock = definePiece<{ color: string; sea: string }>({
  name: 'lock',
  weight: 0.8,
  place: ({ color, fits, theme }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, -1],
      [1, -1],
    ]
    if (!fits(cells, [2, -1])) return null
    return { cells, exit: { at: [2, -1], dir: 1 }, lane: LANE, state: { color: seaColor(theme, color), sea: seaWater(theme) } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const raft = raftAt(t)
    const level = FLOOR + FREEBOARD - filledAt(t)
    const shut = t < T_TRIP ? 0 : easeInQuad(over(t, T_TRIP, T_TRIP + GATE_T))
    const open = since < 0 ? 0 : easeOutCubic(over(since, 0, 0.2))
    const flowing = open * (1 - over(since, DUR - 0.1, DUR + 0.25))

    // The low deck in, on its piling over the lower pound, and the sill the gate shuts on.
    water(p, k, ink, weight, -0.5, -0.3)
    rail(p, k, ink, weight, -0.5, SILL)
    piling(p, k, ink, weight, -0.42)
    solid(p, ink, weight, bg)
    p.rect(GATE_X * k, ((FLOOR + 0.5) / 2) * k, 0.14 * k, (0.5 - FLOOR) * k)
    outline(p, ink, weight)
    p.line(-0.3 * k, 0.5 * k, 1.5 * k, 0.5 * k)

    // The quay: a block of masonry from the chamber's floor to the bed of the upper pound, the wall standing on up to the
    // upper deck, the culvert through it, and the gauge on the chamber's face.
    solid(p, ink, weight, bg)
    p.rect(((QUAY + 1.5) / 2) * k, 0, (1.5 - QUAY) * k, 1 * k)
    p.rect((QUAY + 0.04) * k, ((-0.5 - 1 + FLOOR) / 2) * k, 0.08 * k, (0.5 - FLOOR) * k)
    outline(p, ink, weight * 0.6)
    for (const [bx, by] of [
      [1.08, 0.38],
      [1.36, 0.22],
      [1.4, -0.3],
      [1.1, -0.12],
      [1.32, -0.06],
    ]) p.line((bx - 0.05) * k, by * k, (bx + 0.05) * k, by * k)
    for (let i = 0; i <= 5; i++) p.line(QUAY * k, (FLOOR + FREEBOARD - i * 0.2) * k, (QUAY + (i % 5 === 0 ? 0.06 : 0.035)) * k, (FLOOR + FREEBOARD - i * 0.2) * k)
    // The culvert: down from the plug in the pound's bed and out through the chamber's face; it runs the water's colour while it flows.
    const PIPE_X = 1.22
    const PIPE_Y = 0.24
    p.push()
    p.noFill()
    p.strokeJoin(p.ROUND)
    p.stroke(ink)
    p.strokeWeight(weight * 2.8)
    p.beginShape()
    p.vertex(PIPE_X * k, -0.5 * k)
    p.vertex(PIPE_X * k, PIPE_Y * k)
    p.vertex(QUAY * k, PIPE_Y * k)
    p.endShape()
    p.stroke(flowing > 0.05 ? s.sea : bg)
    p.strokeWeight(weight * 1.1)
    p.beginShape()
    p.vertex(PIPE_X * k, -0.5 * k)
    p.vertex(PIPE_X * k, PIPE_Y * k)
    p.vertex((QUAY - 0.01) * k, PIPE_Y * k)
    p.endShape()
    p.pop()

    // The upper pound over the quay, the upper deck on its piling, and the plug on its line up through the deck.
    water(p, k, ink, weight, QUAY + 0.08, 1.5, -1 + WATER)
    rail(p, k, ink, weight, QUAY, 1.5, -1 + FLOOR)
    piling(p, k, ink, weight, 1.4, -1 + FLOOR, -0.5)
    const lift = 0.09 * open
    outline(p, ink, weight * 0.7)
    p.line(PIPE_X * k, (-1 + FLOOR) * k, PIPE_X * k, (-0.56 - lift) * k)
    solid(p, ink, weight, s.color)
    p.rect(PIPE_X * k, (-0.53 - lift) * k, 0.13 * k, 0.06 * k, 0.01 * k)
    // A dimple in the pound over the plug while it draws.
    if (flowing > 0.05) {
      p.push()
      p.noFill()
      p.stroke(s.sea)
      p.strokeWeight(weight * flowing)
      p.arc(PIPE_X * k, (-1 + WATER) * k, 0.16 * k, 0.07 * k, 0, Math.PI)
      p.pop()
    }

    // The jet out of the chamber's face, until the water is up over it; then a boil at the surface.
    if (flowing > 0.05) {
      p.push()
      p.noFill()
      p.stroke(s.sea)
      p.strokeWeight(weight * 2.2 * flowing)
      if (level > PIPE_Y + 0.04) {
        const reach = 0.1 + 0.16 * flowing
        p.beginShape()
        p.vertex(QUAY * k, PIPE_Y * k)
        p.quadraticVertex((QUAY - reach * 0.8) * k, PIPE_Y * k, (QUAY - reach) * k, level * k)
        p.endShape()
        p.noStroke()
        p.fill(s.sea)
        for (const [dx, ph] of [
          [-0.05, 0],
          [0.03, 0.5],
        ]) {
          const f = (since * 3 + ph) % 1
          p.circle((QUAY - reach + dx * (1 + f)) * k, (level - 0.09 * 4 * f * (1 - f)) * k, 0.035 * (1 - f * 0.6) * k)
        }
      } else {
        p.strokeWeight(weight * flowing)
        for (const dx of [0.1, 0.2]) p.arc((QUAY - dx) * k, (level - 0.01) * k, 0.1 * k, (0.05 + 0.02 * Math.sin(since * 20 + dx * 30)) * k, Math.PI, Math.PI * 2)
      }
      p.pop()
      if (level <= PIPE_Y + 0.04) bubbles(p, k, ink, weight, bg, QUAY - 0.12, PIPE_Y, level, since, 3)
    }

    // The chamber's water: a body of it, since this is a section through a tank, with its surface waved as the sea's is.
    // Below the sill's top it lies against the sill; above it, against the gate.
    const wall = GATE_X + 0.07
    const x0 = level < FLOOR ? GATE_X + 0.03 : wall
    p.push()
    p.noStroke()
    p.fill(s.sea)
    p.beginShape()
    p.vertex(wall * k, 0.5 * k)
    if (level < FLOOR) {
      p.vertex(wall * k, FLOOR * k)
      p.vertex(x0 * k, FLOOR * k)
    }
    for (let i = 0; i <= 40; i++) {
      const x = x0 + ((QUAY - x0) * i) / 40
      p.vertex(x * k, (level + 0.022 * Math.sin(x * Math.PI * 6)) * k)
    }
    p.vertex(QUAY * k, 0.5 * k)
    p.endShape(p.CLOSE)
    // A mark or two under the surface that come up with it, in the paper's colour.
    p.stroke(bg)
    p.strokeWeight(weight * 0.8)
    for (const [mx, my] of [
      [0.1, 0.34],
      [0.62, 0.55],
      [0.3, 0.8],
    ]) {
      if (level + my > 0.45) continue
      p.line((mx - 0.06) * k, (level + my) * k, (mx + 0.06) * k, (level + my) * k)
    }
    p.pop()
    outline(p, ink, weight)
    p.line(wall * k, 0.5 * k, QUAY * k, 0.5 * k)

    // The raft: planks on two barrels that ride high in the water, tilted as it is.
    p.push()
    p.translate(CX * k, (raft.east - HALF * raft.a) * k)
    p.rotate(Math.atan(raft.a))
    for (const u of [-0.27, 0.27]) {
      solid(p, ink, weight, bg)
      p.rect(u * k, 0.16 * k, 0.36 * k, 0.23 * k, 0.07 * k)
      outline(p, ink, weight * 0.8)
      for (const dx of [-0.09, 0.09]) p.line((u + dx) * k, 0.05 * k, (u + dx) * k, 0.27 * k)
    }
    solid(p, ink, weight, bg)
    p.rect(0, 0.02 * k, HALF * 2 * k, 0.04 * k, 0.008 * k)
    p.pop()
    // The surface, in front of the barrels.
    water(p, k, ink, weight, x0, QUAY, level)
    // The stop under the quay's lip that the raft meets.
    solid(p, ink, weight, ink)
    p.rect((QUAY - 0.015) * k, (-1 + FLOOR + 0.07) * k, 0.03 * k, 0.05 * k)

    // The apron: a flap off the sill's end onto the raft, that the ball presses down and the gate's trip with it.
    const pressed = t < T_TRIP - 0.03 ? 0 : t < T_ON + 0.03 ? over(t, T_TRIP - 0.03, T_TRIP) : 1 - over(t, T_ON + 0.03, T_ON + 0.15)
    p.push()
    p.translate(SILL * k, (FLOOR + 0.015) * k)
    p.rotate(0.04 + 0.14 * pressed)
    solid(p, ink, weight, s.color)
    p.rect(0.045 * k, 0, 0.1 * k, 0.03 * k, 0.006 * k)
    p.pop()

    // The gate: a slab in two tall guides with a headstock, hung open over the sill; tripped, it comes down on it.
    const top = FLOOR - GATE_H - GATE_UP * (1 - shut)
    outline(p, ink, weight)
    for (const dx of [-0.05, 0.05]) p.line((GATE_X + dx) * k, FLOOR * k, (GATE_X + dx) * k, (FLOOR - GATE_H - GATE_UP - 0.08) * k)
    p.line((GATE_X - 0.08) * k, (FLOOR - GATE_H - GATE_UP - 0.08) * k, (GATE_X + 0.08) * k, (FLOOR - GATE_H - GATE_UP - 0.08) * k)
    solid(p, ink, weight, s.color)
    p.rect(GATE_X * k, (top + GATE_H / 2) * k, 0.06 * k, GATE_H * k, 0.008 * k)
    // The thud as it lands.
    const thud = t - T_TRIP - GATE_T
    if (thud > 0 && thud < 0.2) {
      const f = thud / 0.2
      p.push()
      p.stroke(ink)
      p.strokeWeight(weight * (1 - f))
      for (const side of [-1, 1]) p.line((GATE_X + side * (0.09 + 0.06 * f)) * k, (FLOOR - 0.03) * k, (GATE_X + side * (0.14 + 0.08 * f)) * k, (FLOOR - 0.07 - 0.03 * f) * k)
      p.pop()
    }
  },
})
