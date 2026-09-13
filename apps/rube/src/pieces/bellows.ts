import { clipBox, outline, solid } from '../../../../src/core/draw'
import { easeInQuad, easeInOutSine, easeOutCubic, lerp } from '../../../../src/core/ease'
import { FLOOR, ROLL, definePiece, gallows, over, rail, roll, wait, type Lane } from '../parts'

/**
 * A bellows on a stand, aimed down the line, with a weight hung over it
 * from a lever on the roof. The ball settles on a tongue in the rail; the
 * tongue pulls a rod; the rod tips the lever; the lever's far end lifts and
 * the weight slips its hook; the weight lands on the bellows; the puff blows
 * the ball off the tongue and on its way. Six things happen so that one can.
 */
const SEAT = 0.1
/** The tongue: hinged at its west end, the ball's weight sinks its east end. */
const TONGUE_W = -0.06
const TONGUE_E = 0.28
const SINK = 0.035
/** The rod, up from the tongue to the lever's east end. */
const ROD_X = 0.25
/** The lever on the roof. */
const PIVOT_X = -0.08
const LEVER_Y = -0.42
const LEVER_W = -0.42
/** The bellows: nozzle at the hinge, boards fanning west. */
const HINGE_X = -0.12
const HINGE_Y = 0.0
const BOARD = 0.26
const OPEN = 0.75
const SHUT = 0.22
/** The weight, on the hook, then on the top board. */
const WEIGHT_X = LEVER_W + 0.02
const WEIGHT_H = 0.14
/** Seconds after entry. */
const ARRIVE = (0.5 + SEAT) / ROLL
const PRESS = 0.06
const RELEASE = ARRIVE + PRESS
const DROP = 0.2
const LAND = RELEASE + DROP
const SQUEEZE = 0.12
const PUFF = LAND + 0.06
const LEAVE = PUFF + 0.05
const RESET = 3.4

const topEndY = (gap: number) => HINGE_Y - BOARD * Math.sin(gap / 2)

export const bellows = definePiece<{ color: string }>({
  name: 'bellows',
  weight: 0.9,
  place: ({ color, fits }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    const lane: Lane = {
      segs: [
        roll([-0.5, 0], [TONGUE_W + 0.02, 0], ROLL),
        roll([TONGUE_W + 0.02, 0], [SEAT, SINK], ROLL, 'out'),
        wait([SEAT, SINK], LEAVE - ARRIVE),
        roll([SEAT, SINK], [0.5, 0], ROLL * 1.3, 'out'),
      ],
      fire: PUFF,
    }
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    // The rail, with a gap for the tongue.
    rail(p, k, ink, weight, -0.5, TONGUE_W)
    rail(p, k, ink, weight, TONGUE_E, 0.5)

    // The tongue sinks under the ball and springs back once it has gone.
    const press = t < ARRIVE ? 0 : t < RELEASE ? over(t, ARRIVE, RELEASE) : t < LEAVE ? 1 : 1 - easeOutCubic(over(t, LEAVE, LEAVE + 0.15))
    const tilt = Math.asin(SINK / (TONGUE_E - TONGUE_W)) * press
    p.push()
    p.translate(TONGUE_W * k, FLOOR * k)
    p.rotate(tilt)
    solid(p, ink, weight, s.color)
    p.rect(((TONGUE_E - TONGUE_W) / 2) * k, 0, (TONGUE_E - TONGUE_W) * k, 0.04 * k)
    p.pop()
    solid(p, ink, weight, s.color)
    p.circle(TONGUE_W * k, FLOOR * k, 0.05 * k)

    // The rod, and the lever it tips. The lever's far end lifts by as much
    // as the tongue sinks; the weight's string slips the hook as it does.
    const rodTop = LEVER_Y + SINK * press
    const angle = Math.asin((SINK * press) / (ROD_X - PIVOT_X))
    gallows(p, k, ink, weight, PIVOT_X - 0.1, 0.42, 0.42)
    outline(p, ink, weight)
    p.line(ROD_X * k, (FLOOR + SINK * press) * k, ROD_X * k, rodTop * k)
    p.line(PIVOT_X * k, -0.5 * k, PIVOT_X * k, LEVER_Y * k)
    p.push()
    p.translate(PIVOT_X * k, LEVER_Y * k)
    p.rotate(angle)
    solid(p, ink, weight, s.color)
    p.rect(((LEVER_W + ROD_X) / 2 - PIVOT_X) * k, 0, (ROD_X - LEVER_W) * k, 0.04 * k)
    outline(p, ink, weight)
    // The hook at the west end.
    p.arc((LEVER_W - PIVOT_X + 0.03) * k, 0.06 * k, 0.06 * k, 0.07 * k, 0, Math.PI)
    p.pop()
    solid(p, ink, weight, bg)
    p.circle(PIVOT_X * k, LEVER_Y * k, 0.05 * k)

    // The bellows: two boards hinged at the nozzle, pleats between, driven
    // shut by the weight and eased open again as the weight is winched off.
    const shut =
      t < LAND ? 0 : t < LAND + SQUEEZE ? easeOutCubic(over(t, LAND, LAND + SQUEEZE)) : 1 - easeInOutSine(over(t, RESET, RESET + 1.4))
    const gap = lerp(OPEN, SHUT, shut)
    p.push()
    p.translate(HINGE_X * k, HINGE_Y * k)
    p.push()
    p.stroke(s.color)
    p.strokeWeight(weight)
    p.noFill()
    for (const f of [0.35, 0.6, 0.85]) {
      const r = BOARD * f
      const a0 = Math.PI - gap / 2
      const a1 = Math.PI + gap / 2
      const mid = Math.PI
      const rr = f === 0.6 ? r * 0.82 : r
      p.beginShape()
      p.vertex(Math.cos(a0) * r * k, Math.sin(a0) * r * k)
      p.vertex(Math.cos(mid) * rr * k, Math.sin(mid) * rr * k)
      p.vertex(Math.cos(a1) * r * k, Math.sin(a1) * r * k)
      p.endShape()
    }
    p.pop()
    for (const a of [Math.PI - gap / 2, Math.PI + gap / 2]) {
      p.push()
      p.rotate(a)
      solid(p, ink, weight, bg)
      p.rect((BOARD / 2) * k, 0, BOARD * k, 0.05 * k)
      p.pop()
    }
    // The nozzle, level with the ball.
    outline(p, ink, weight)
    p.line(0, -0.05 * k, (0.12 - HINGE_X) * k * 0.6, -0.025 * k)
    p.line(0, 0.05 * k, (0.12 - HINGE_X) * k * 0.6, 0.025 * k)
    p.line((0.12 - HINGE_X) * k * 0.6, -0.035 * k, (0.12 - HINGE_X) * k * 0.6, 0.035 * k)
    solid(p, ink, weight, s.color)
    p.circle(0, 0, 0.06 * k)
    p.pop()
    // The stand.
    outline(p, ink, weight)
    p.line(HINGE_X * k, (HINGE_Y + 0.03) * k, HINGE_X * k, 0.5 * k)
    p.line((HINGE_X - 0.07) * k, 0.5 * k, (HINGE_X + 0.07) * k, 0.5 * k)

    // The weight: on the hook, then falling, then riding the board down,
    // then winched back up.
    const hung = LEVER_Y + 0.06 + WEIGHT_H / 2
    const rest = topEndY(gap) - 0.025 - WEIGHT_H / 2
    let wy: number
    if (t < RELEASE) wy = hung
    else if (t < LAND) wy = lerp(hung, topEndY(OPEN) - 0.025 - WEIGHT_H / 2, easeInQuad(over(t, RELEASE, LAND)))
    else if (t < RESET) wy = rest
    else wy = lerp(rest, hung, easeInOutSine(over(t, RESET, RESET + 1.4)))
    outline(p, ink, weight)
    if (t < RELEASE || t >= RESET + 1.4) p.line(WEIGHT_X * k, (LEVER_Y + 0.06) * k, WEIGHT_X * k, (wy - WEIGHT_H / 2) * k)
    solid(p, ink, weight, s.color)
    p.rect(WEIGHT_X * k, wy * k, 0.16 * k, WEIGHT_H * k)
    p.fill(ink)
    p.noStroke()
    p.rect(WEIGHT_X * k, (wy - WEIGHT_H / 2 + 0.02) * k, 0.16 * k, 0.03 * k)
    outline(p, ink, weight)
    p.arc(WEIGHT_X * k, (wy - WEIGHT_H / 2) * k, 0.05 * k, 0.05 * k, Math.PI, Math.PI * 2)

    // The puff.
    if (since > 0 && since < 0.5) {
      const f = over(since, 0, 0.5)
      clipBox(p, k, k, () => {
        p.push()
        p.noFill()
        p.stroke(s.color)
        p.strokeWeight(weight * (1.5 - f))
        for (const dy of [-0.08, 0, 0.08]) {
          const x0 = 0.02 + f * 0.55
          p.arc((x0 + 0.1) * k, (dy * (1 + f * 1.5)) * k, 0.22 * k, 0.14 * k, Math.PI * 0.7, Math.PI * 1.3)
        }
        p.pop()
      })
    }
  },
})
