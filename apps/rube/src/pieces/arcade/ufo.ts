import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, lerp } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, arrive, arriveAt, definePiece, over, post, rail, ramp, rankBy, wait, type Lane, type Pt } from '../../parts'
import { flash, glow, lamp, marquee, score, tube } from './neon'

/**
 * A flying saucer, hovering one or two floors up, bobbing, its rim lamps
 * going round, the pilot in its dome watching the lane. The ball stops on
 * the landing mark under it; the landing lamps stop blinking and hold; the
 * hatch in its belly opens and the beam comes down to the mark; and the
 * ball goes up the beam, slowly at first, to hang just under the hatch;
 * the beam lets go of the mark and draws up after it.
 * The saucer slides out over the rail there with the ball under it, the
 * beam goes out, and the ball drops the hair it was held above the rail
 * and rolls off, on or back the way it came. The saucer goes back to where
 * it was hovering and waits for the next one.
 *
 * The ball hangs under the saucer the whole way along: the slide is one
 * function, for the saucer and for the ball.
 */
export interface UfoState {
  color: string
  floors: number
  turn: 1 | -1
}

/** The saucer's disc, above the upper rail's line; the hatch under it; the dome on it. */
const HOVER = 0.27
const DISC_W = 0.56
const DISC_H = 0.13
const HATCH = 0.07
/** How far over the rail it slides, and how far above the rail's line it holds the ball. */
const SLIDE = 0.21
const HELD = 0.03
/** The upper rail starts clear of the ball's way up. */
const RAIL_X = R + 0.03
const ARRIVE = arriveAt(0)
const OPEN = 0.15
const BEAM = 0.15
const FIRE = ARRIVE + OPEN
const riseTime = (floors: number) => 0.5 + 0.4 * floors
const CARRY = 0.35
const DROP = 0.06
const BACK = 0.7

/** Where the saucer is along the top, `since` the beam came on: over the mark, out over the rail with the ball, and back. */
function slideAt(since: number, floors: number, turn: 1 | -1): number {
  const go = BEAM + riseTime(floors)
  const out = easeInOutSine(over(since, go, go + CARRY))
  const back = easeInOutSine(over(since, go + CARRY + DROP + BACK, go + CARRY + DROP + BACK + 1))
  return turn * SLIDE * (out - back)
}

export const ufo = definePiece<UfoState>({
  name: 'ufo',
  points: 200,
  weight: 1,
  place: ({ rng, color, fits, taste }) => {
    const tall = taste.weights['lift-tall'] ?? 1
    const options = rng.shuffle([1, 2].flatMap((floors) => [1, -1].map((turn) => ({ floors, turn: turn as 1 | -1 }))))
    for (const { floors, turn } of rankBy(rng, options, (o) => Math.pow(tall, o.floors - 1))) {
      const cells: Pt[] = []
      for (let i = 0; i <= floors; i++) cells.push([0, -i])
      const exit: Pt = [turn, -floors]
      if (!fits(cells, exit)) continue
      const top = -floors - HELD
      const n = 8
      const go = BEAM + riseTime(floors)
      const carry = Array.from({ length: n }, (_, i) => ({
        from: [slideAt(go + (CARRY * i) / n, floors, turn), top] as Pt,
        to: [slideAt(go + (CARRY * (i + 1)) / n, floors, turn), top] as Pt,
        dur: CARRY / n,
      }))
      const lane: Lane = {
        segs: [
          ...arrive([-0.5, 0], [0, 0]),
          wait([0, 0], OPEN + BEAM),
          { from: [0, 0], to: [0, top], dur: riseTime(floors), ease: 'inout' },
          ...carry,
          { from: [turn * SLIDE, top], to: [turn * SLIDE, -floors], dur: DROP, ease: 'in' },
          ramp([turn * SLIDE, -floors], [turn * 0.5, -floors], 0, ROLL),
        ],
        fire: FIRE,
      }
      return { cells, exit: { at: exit, dir: turn }, lane, state: { color, floors, turn } }
    }
    return null
  },
  // Over the dome: in the beam it covered the ball going up.
  scores: (p, s, { k, since, bg }) => score(p, k, s.color, bg, 0, -s.floors - HOVER - DISC_H / 2 - 0.125 + 0.1, '+200', since, 1),
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const { floors, turn } = s
    const rise = riseTime(floors)
    const release = BEAM + rise + CARRY
    // The saucer: bobbing, a little steadier while it works.
    const working = since > -OPEN && since < release
    const x = slideAt(since, floors, turn)
    const y = -floors - HOVER + 0.014 * Math.sin(t * 2.4) * (working ? 0.3 : 1)
    // The hatch opens before the beam and shuts after it; the beam comes down fast and goes out from the bottom up.
    const hatch = since < -OPEN ? 0 : since < release ? over(since, -OPEN, 0) : 1 - over(since, release + 0.05, release + 0.3)
    const down = since < 0 ? 0 : since < release ? over(since, 0, BEAM * 0.8) : 0
    const up = since < release ? 0 : over(since, release, release + 0.1)

    // The lane to the mark, the mark, and the rail at the top, clear of the way up.
    rail(p, k, ink, weight, -0.5, 0.22)
    post(p, k, ink, weight, 0, FLOOR + 0.05)
    rail(p, k, ink, weight, turn * RAIL_X, turn * 0.5, -floors + FLOOR)
    post(p, k, ink, weight, turn * 0.42, -floors + FLOOR, -floors + 0.5)
    solid(p, ink, weight, s.color)
    p.rect(0, (FLOOR + 0.025) * k, 0.34 * k, 0.05 * k, 0.01 * k)
    // The landing lamps: blinking turn about until the ball is on the mark, steady while the beam is on.
    for (const side of [-1, 1]) {
      const blink = t < ARRIVE ? (Math.sin(t * 9 + (side > 0 ? Math.PI : 0)) > 0 ? 1 : 0) : since < release ? 1 : 1 - over(since, release, release + 0.6)
      outline(p, ink, weight)
      p.line(side * 0.13 * k, (FLOOR + 0.05) * k, side * 0.13 * k, (FLOOR + 0.1) * k)
      lamp(p, k, ink, weight, s.color, bg, side * 0.13, FLOOR + 0.13, 0.03, blink)
    }

    // The beam: a cone of light from the hatch to the mark, rungs climbing it.
    const beamTop = y + DISC_H / 2 + 0.02
    if (down > 0 && up < 1) {
      // Once the ball is up the beam lets go of the mark and draws up to the ball: it is only holding it now.
      const held = -floors - HELD + R * 0.6
      const foot = lerp(FLOOR, held, easeInOutSine(over(since, BEAM + rise - 0.05, BEAM + rise + 0.12)))
      const y0 = lerp(beamTop, foot, up)
      const y1 = lerp(beamTop, foot, down)
      const half = (yy: number) => lerp(HATCH, 0.17, (yy - beamTop) / (FLOOR - beamTop))
      const xAt = (yy: number) => lerp(x, 0, (yy - beamTop) / (FLOOR - beamTop))
      p.push()
      p.noStroke()
      const wash = p.color(s.color)
      wash.setAlpha(38)
      p.fill(wash)
      p.quad((xAt(y0) - half(y0)) * k, y0 * k, (xAt(y0) + half(y0)) * k, y0 * k, (xAt(y1) + half(y1)) * k, y1 * k, (xAt(y1) - half(y1)) * k, y1 * k)
      p.pop()
      for (const side of [-1, 1]) tube(p, k, ink, weight * 0.4, s.color, xAt(y0) + side * half(y0), y0, xAt(y1) + side * half(y1), y1, 0.7)
      // Rings of light going up it, the way the ball is going.
      const rings = 2 + 2 * floors
      p.push()
      p.noFill()
      p.stroke(s.color)
      p.strokeWeight(weight * 0.5)
      for (let i = 0; i < rings; i++) {
        const f = (((i / rings - t * 0.8) % 1) + 1) % 1
        const yy = lerp(beamTop, FLOOR, f)
        if (yy < y0 + 0.03 || yy > y1 - 0.03) continue
        p.ellipse(xAt(yy) * k, yy * k, half(yy) * 2 * k, half(yy) * 0.36 * k)
      }
      p.pop()
    }
    glow(p, k, s.color, x, y + 0.04, 0.2, down * (1 - up))

    // The saucer: a disc in the colour with a dark band of lamps round it, a glass dome with the pilot in it, the hatch underneath.
    solid(p, ink, weight, bg)
    p.arc(x * k, (y - DISC_H / 2 + 0.025) * k, 0.28 * k, 0.3 * k, Math.PI, Math.PI * 2, p.CHORD)
    // The pilot: a head, and two eyes that follow the ball.
    const lookX = t < ARRIVE ? -0.012 + 0.024 * over(t, -0.3, ARRIVE) : since > release + DROP ? turn * 0.012 * (1 - over(since, release + 0.6, release + 1.4)) : 0
    const lookY = since < release + DROP + 0.5 ? 0.01 : 0
    solid(p, ink, weight * 0.5, s.color)
    p.arc(x * k, (y - DISC_H / 2 + 0.025) * k, 0.17 * k, 0.21 * k, Math.PI, Math.PI * 2, p.CHORD)
    p.noStroke()
    p.fill(bg)
    for (const dx of [-0.032, 0.032]) p.circle((x + dx + lookX) * k, (y - DISC_H / 2 - 0.03 + lookY) * k, 0.032 * k)
    solid(p, ink, weight, s.color)
    p.ellipse(x * k, y * k, DISC_W * k, DISC_H * k)
    marquee(p, k, ink, weight, s.color, bg, x - 0.21, x + 0.21, y, 5, t * (working ? 2.5 : 1), true, 0.055)
    // The hatch: a dark mouth in the belly, open while it works.
    solid(p, ink, weight, ink)
    p.ellipse(x * k, (y + DISC_H / 2 + 0.005) * k, (0.05 + (HATCH * 2 - 0.05) * hatch) * k, (0.02 + 0.02 * hatch) * k)

    // The beam takes hold of the ball, and lets it go.
    flash(p, k, s.color, weight, 0, 0, since - BEAM * 0.8, 0.25, 0.13, 0.28)
    flash(p, k, s.color, weight, turn * SLIDE, -floors + R, since - release - DROP, 0.18, 0.04, 0.16)
  },
})
