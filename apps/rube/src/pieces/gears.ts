import { outline, solid, teeth } from '../../../../src/core/draw'
import { easeInOutSine, easeOutCubic } from '../../../../src/core/ease'
import { FLOOR, ROLL, arrive, arriveAt, definePiece, over, rail, roll, wait, type Lane, type Pt } from '../parts'

/**
 * Clockwork. A gate bars the rail; the ball rolls onto a plate before it;
 * the plate sinks and lifts the pawl off a wound gear train; three gears
 * run, the last winds a cord onto its drum, and the cord hauls the gate
 * up its guide. The ball rolls under. Later the train unwinds and the
 * gate comes down again, for nobody.
 */
const PLATE = 0
const G1: Pt = [0.3, -0.34]
const G2: Pt = [0.63, -0.6]
const G3: Pt = [0.97, -0.6]
const R1 = 0.1
const R2 = 0.24
const R3 = 0.1
const DRUM = 0.05
const GATE_X = 1.3
const GATE_TOP = -0.22
const RISE = 0.32
const ARRIVE = arriveAt(PLATE)
const PRESS = 0.12
const RUN = 0.8
const FIRE = ARRIVE + PRESS
const RESET = 3.2

/** How far the last gear has turned, in radians, with the cord winding RISE onto the drum over RUN. */
const turnAt = (since: number) => {
  const full = RISE / DRUM
  if (since < 0) return 0
  if (since < RUN) return full * easeOutCubic(over(since, 0, RUN))
  if (since < RESET) return full
  return full * (1 - easeInOutSine(over(since, RESET, RESET + 1.6)))
}

function gear(p: any, k: number, ink: string, weight: number, fill: string, at: Pt, r: number, n: number, angle: number): void {
  p.push()
  p.translate(at[0] * k, at[1] * k)
  p.rotate(angle)
  solid(p, ink, weight, fill)
  p.circle(0, 0, r * 2 * k)
  outline(p, ink, weight)
  teeth(p, r * k, n, 0.035 * k)
  for (let i = 0; i < 3; i++) {
    p.line(0, 0, 0, -r * 0.8 * k)
    p.rotate((Math.PI * 2) / 3)
  }
  p.pop()
  solid(p, ink, weight, fill)
  p.circle(at[0] * k, at[1] * k, 0.05 * k)
}

export const gears = definePiece<{ color: string }>({
  name: 'gears',
  weight: 0.9,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, -1],
      [1, -1],
    ]
    if (!fits(cells, [2, 0])) return null
    const lane: Lane = {
      segs: [...arrive([-0.5, 0], [PLATE, 0.02]), wait([PLATE, 0.02], PRESS + RUN * 0.75), roll([PLATE, 0.02], [1.5, 0], ROLL)],
      fire: FIRE,
    }
    return { cells, exit: { at: [2, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const turn = turnAt(since)
    const lift = Math.min(RISE, turn * DRUM)
    const pressed = t < ARRIVE ? 0 : since < RESET ? Math.min(1, over(t, ARRIVE, FIRE)) : 1 - over(since, RESET, RESET + 0.4)

    // The rail, the plate in it, and the gate's guide.
    rail(p, k, ink, weight, -0.5, PLATE - 0.16)
    rail(p, k, ink, weight, PLATE + 0.16, 1.5)
    solid(p, ink, weight, s.color)
    p.rect(PLATE * k, (FLOOR + 0.01 + pressed * 0.03) * k, 0.3 * k, 0.05 * k)
    outline(p, ink, weight)
    p.line((GATE_X + 0.05) * k, (GATE_TOP - RISE - 0.1) * k, (GATE_X + 0.05) * k, (FLOOR - 0.02) * k)
    // The back plate the train is mounted on, standing on the rail.
    solid(p, ink, weight, bg)
    p.rect(0.66 * k, -0.6 * k, 0.9 * k, 0.6 * k, 0.04 * k)
    outline(p, ink, weight)
    for (const x of [0.3, 1.02]) p.line(x * k, -0.3 * k, x * k, (FLOOR - 0.02) * k)
    // The rod from the plate to the pawl, and the pawl on the first gear.
    p.line((PLATE + 0.1) * k, (FLOOR + 0.03 + pressed * 0.03) * k, (PLATE + 0.1) * k, (G1[1] + R1 + 0.06 + pressed * 0.03) * k)
    p.push()
    p.translate((PLATE + 0.1) * k, (G1[1] + R1 + 0.06) * k)
    p.rotate(-0.6 * pressed)
    outline(p, ink, weight)
    p.line(0, 0, (G1[0] - PLATE - 0.1 - 0.02) * k, -0.05 * k)
    p.pop()
    // The train: the small one drives the big one drives the small one with the drum.
    gear(p, k, ink, weight, bg, G1, R1, 8, turn)
    gear(p, k, ink, weight, s.color, G2, R2, 18, -turn * (R1 / R2) + 0.17)
    gear(p, k, ink, weight, bg, G3, R3, 8, turn)
    // The drum and the cord: over a pulley at the gate's guide, down to the gate.
    solid(p, ink, weight, s.color)
    p.circle(G3[0] * k, G3[1] * k, DRUM * 2 * k)
    outline(p, ink, weight)
    p.line(G3[0] * k, (G3[1] - DRUM) * k, GATE_X * k, (G3[1] - DRUM) * k)
    p.line(GATE_X * k, (G3[1] - DRUM) * k, GATE_X * k, (GATE_TOP - lift) * k)
    solid(p, ink, weight, bg)
    p.circle(GATE_X * k, (G3[1] - DRUM + 0.04) * k, 0.06 * k)
    // The gate: a bar in its guide, hauled up by the cord.
    const gateH = FLOOR - GATE_TOP - 0.02
    solid(p, ink, weight, s.color)
    p.rect(GATE_X * k, (GATE_TOP - lift + gateH / 2) * k, 0.06 * k, gateH * k)
    p.fill(ink)
    p.noStroke()
    p.rect(GATE_X * k, (GATE_TOP - lift + 0.03) * k, 0.08 * k, 0.04 * k)
    // Ticks off the train while it runs.
    if (since > 0 && since < RUN) {
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      const f = over(since, 0, RUN)
      for (const a of [-2.3, -1.9, -1.5]) {
        const r0 = (R2 + 0.06 + 0.06 * f) * k
        p.line(G2[0] * k + Math.cos(a) * r0, G2[1] * k + Math.sin(a) * r0, G2[0] * k + Math.cos(a) * (r0 + 0.05 * k), G2[1] * k + Math.sin(a) * (r0 + 0.05 * k))
      }
      p.pop()
    }
  },
})
