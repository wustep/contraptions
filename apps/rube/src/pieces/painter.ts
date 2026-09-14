import { outline, solid } from '../../../../src/core/draw'
import { easeOutCubic } from '../../../../src/core/ease'
import { FLOOR, R, ROLL, arrive, arriveAt, definePiece, gallows, over, rail, ramp, wait, type BallChange, type Lane } from '../parts'

/**
 * A paint booth. A pot on a gallows over the line feeds two nozzles that
 * hang either side of the rail. The ball rolls onto the plate under them
 * and stops; its weight opens the valve; the nozzles spray, and the ball
 * turns the new colour as the paint lands on it — for good. When the spray
 * stops, the dryer horn on the post gives it a blast and it rolls on. The
 * booth drips for a while after.
 */
const NOZZLE_Y = -0.28
const ARRIVE = arriveAt(0)
/** The plate's sink opens the valve; the spray runs this long; then the horn blows and the ball goes. */
const OPEN = 0.06
const SPRAY = 0.45
const BLOW = SPRAY + 0.08
const GO = BLOW + 0.05
const FIRE = ARRIVE + OPEN
/** The paint takes over the middle of the spray. */
const PAINT_AT = 0.05
const PAINT_OVER = 0.32
/** The gallows' post, and the horn on it, aimed down at the ball's shoulder. */
const POST_X = -0.42
const HORN: [number, number] = [POST_X, -0.26]
const HORN_AIM = 0.45

export const painter = definePiece<{ color: string; paint: string }>({
  name: 'painter',
  weight: 0.9,
  place: ({ rng, color, fits, theme, ball }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    const pool = theme.colors.filter((c) => c !== ball.color)
    const paint = rng.pick(pool.length ? pool : theme.colors)
    const lane: Lane = {
      segs: [...arrive([-0.5, 0], [0, 0.02]), wait([0, 0.02], OPEN + GO), ramp([0, 0.02], [0.5, 0], 0.6, ROLL)],
      fire: FIRE,
    }
    const changes: BallChange[] = [{ at: FIRE + PAINT_AT, color: paint, over: PAINT_OVER }]
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane, state: { color, paint }, changes }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const pressed = t < ARRIVE ? 0 : since < GO ? over(t, ARRIVE, FIRE) : 1 - over(since, GO, GO + 0.12)
    const spraying = since > 0 && since < SPRAY

    // The rail either side of the plate, and the plate, which sinks under the ball.
    rail(p, k, ink, weight, -0.5, -0.16)
    rail(p, k, ink, weight, 0.16, 0.5)
    solid(p, ink, weight, s.color)
    p.rect(0, (FLOOR + 0.01 + pressed * 0.03) * k, 0.3 * k, 0.05 * k)
    outline(p, ink, weight)
    p.line(0, (FLOOR + 0.035 + pressed * 0.03) * k, 0, 0.5 * k)

    // The gallows, the pot on it, and the pipes down to the nozzles.
    gallows(p, k, ink, weight, POST_X, 0.3, POST_X)
    solid(p, ink, weight, s.paint)
    p.rect(0, -0.62 * k, 0.3 * k, 0.2 * k, 0.02 * k)
    solid(p, ink, weight, bg)
    p.rect(0, -0.62 * k, 0.16 * k, 0.08 * k)
    outline(p, ink, weight)
    for (const side of [-1, 1]) {
      p.line(side * 0.08 * k, -0.5 * k, side * 0.08 * k, -0.42 * k)
      p.line(side * 0.08 * k, -0.42 * k, side * 0.22 * k, -0.42 * k)
      p.line(side * 0.22 * k, -0.42 * k, side * 0.22 * k, NOZZLE_Y * k)
    }
    // The valve on the pot's outlet: a tap that turns while the plate is down.
    const open = since < 0 ? 0 : since < SPRAY ? Math.min(1, over(since, 0, 0.06)) : 1 - over(since, SPRAY, SPRAY + 0.08)
    p.push()
    p.translate(0, -0.47 * k)
    p.rotate((Math.PI / 2) * open)
    solid(p, ink, weight, s.color)
    p.rect(0, 0, 0.09 * k, 0.03 * k, 0.01 * k)
    p.pop()
    // The nozzles, angled in at the ball's line.
    for (const side of [-1, 1]) {
      p.push()
      p.translate(side * 0.22 * k, NOZZLE_Y * k)
      p.rotate(-side * 0.5)
      solid(p, ink, weight, s.color)
      p.rect(0, 0.05 * k, 0.07 * k, 0.1 * k)
      p.pop()
    }
    // The spray: jets out of the nozzles while the valve is open.
    if (spraying) {
      const f = Math.min(1, over(since, 0, 0.08), 1 - over(since, SPRAY - 0.1, SPRAY))
      p.push()
      p.stroke(s.paint)
      p.strokeWeight(weight)
      for (const side of [-1, 1]) {
        for (const a of [-0.28, 0, 0.28]) {
          const dir = Math.PI / 2 + side * 0.5 + a
          const jitter = 0.85 + 0.15 * Math.sin(since * 90 + a * 7 + side)
          const x0 = side * 0.22 + Math.cos(dir) * 0.12
          const y0 = NOZZLE_Y + Math.sin(dir) * 0.12
          const len = 0.1 * f * jitter
          p.line(x0 * k, y0 * k, (x0 + Math.cos(dir) * len) * k, (y0 + Math.sin(dir) * len) * k)
        }
      }
      p.pop()
    }

    // The dryer horn on the post, and its blast when the paint is on.
    p.push()
    p.translate(HORN[0] * k, HORN[1] * k)
    p.rotate(HORN_AIM)
    solid(p, ink, weight, bg)
    p.beginShape()
    p.vertex(0, -0.03 * k)
    p.vertex(0.1 * k, -0.055 * k)
    p.vertex(0.1 * k, 0.055 * k)
    p.vertex(0, 0.03 * k)
    p.endShape(p.CLOSE)
    if (since > BLOW && since < BLOW + 0.22) {
      const g = over(since, BLOW, BLOW + 0.22)
      p.stroke(ink)
      p.strokeWeight(weight)
      for (const dy of [-0.04, 0, 0.04]) {
        const x0 = 0.12 + 0.2 * g + Math.abs(dy) * 0.5
        p.line(x0 * k, dy * k, (x0 + 0.09 * (1 - g * 0.4)) * k, dy * k)
      }
    }
    p.pop()

    // Drips off the nozzles after, and a puddle of the new colour on the plate.
    if (since > SPRAY) {
      const g = over(since, SPRAY, SPRAY + 1.6)
      p.push()
      p.noStroke()
      p.fill(s.paint)
      for (const side of [-1, 1]) {
        const y = NOZZLE_Y + 0.1 + easeOutCubic(g) * (FLOOR - NOZZLE_Y - 0.1)
        if (g < 1) p.ellipse(side * 0.2 * k, y * k, 0.035 * k, 0.05 * k)
      }
      p.pop()
      solid(p, ink, weight, s.paint)
      p.rect(0, (FLOOR + 0.01 + pressed * 0.03) * k, (0.14 + 0.12 * g) * k, 0.03 * k, 0.015 * k)
    }
  },
  over: (p, s, { k, since }) => {
    // Droplets in flight from the nozzles onto the ball, in front of it.
    if (since <= 0 || since >= SPRAY) return
    const f = Math.min(1, over(since, 0, 0.08), 1 - over(since, SPRAY - 0.1, SPRAY))
    p.push()
    p.noStroke()
    for (const side of [-1, 1]) {
      for (let i = 0; i < 7; i++) {
        const phase = (since * 3.2 + i * 0.143 + (side + 1) * 0.07) % 1
        const spread = ((i % 4) / 3 - 0.5) * 0.55
        const dir = Math.PI / 2 + side * 0.5 + spread
        const reach = 0.1 + phase * 0.2
        const x = side * 0.22 + Math.cos(dir) * reach
        const y = NOZZLE_Y + Math.sin(dir) * reach
        if (Math.hypot(x, y) < R - 0.01) continue
        const c = p.color(s.paint)
        c.setAlpha(255 * f * (1 - phase * 0.4))
        p.fill(c)
        p.circle(x * k, y * k, (0.018 + 0.014 * (1 - phase)) * k)
      }
    }
    p.pop()
  },
})
