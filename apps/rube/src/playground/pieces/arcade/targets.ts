import { outline, solid } from '../../../../../../src/core/draw'
import { easeInQuad, easeOutCubic } from '../../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, over, rail, ramp, roll, segTime, type Lane, type Seg } from '../../../parts'
import { display, flash, glow, lamp, score } from '../../../pieces/arcade/neon'

/**
 * A bank of three drop targets. Three plates stand on the lane, each in a
 * slot through it, over a trough that hangs under the rail; a lamp for each
 * in the header overhead, and a counter in the trough's face. The ball
 * knocks them down in turn — tick, tick, tick — each one checking it for
 * an instant before it drops out of the way into the trough, where it can
 * be seen sitting behind the glass; its lamp comes on and the counter goes
 * up by one. Three down is the bank: the lamps blink, three hundred pops.
 * A second later the reset bar in the trough thumps all three back up, and
 * the lamps and the counter go out.
 */
const XS = [0.05, 0.4, 0.75]
const THICK = 0.08
/** How far a plate stands above the rail, and how much of it stays down in the slot. */
const TALL = 0.26
const TAIL = 0.03
/** The ball's centre when its front meets a plate's face. */
const contact = (x: number) => x - THICK / 2 - R
/** A plate checks the ball to a crawl for the moment it takes to drop, and lets it back up to pace. */
const V_HIT = 0.3
const V_FREE = 0.7
const CRAWL = 0.025
const RECOVER = 0.2
const DROP = 0.06
/** The trough under the rail: the pane over the slots, and the counter in its face past the last of them. */
const BOX = { x0: -0.17, x1: 1.3, y0: FLOOR + 0.025, y1: 0.49 }
const PANE = { x0: -0.09, x1: 0.89, y0: BOX.y0 + 0.015, y1: 0.455 }
const COUNTER = { x: 1.095, y: 0.325, w: 0.26, h: 0.16 }
/** The header over the plates, a lamp for each, on posts that rise from the trough's ends. */
const HEAD = { x0: -0.2, x1: 1.0, y: -0.37, h: 0.12 }
const POSTS = [-0.11, 0.91]

const segs: Seg[] = []
const hits: number[] = []
let at = -0.5
for (const x of XS) {
  const c = contact(x)
  segs.push(roll([at, 0], [c, 0], ROLL))
  hits.push(segTime(segs))
  segs.push(ramp([c, 0], [c + CRAWL, 0], V_HIT, V_FREE), ramp([c + CRAWL, 0], [c + CRAWL + RECOVER, 0], V_FREE, ROLL))
  at = c + CRAWL + RECOVER
}
segs.push(roll([at, 0], [1.5, 0], ROLL))
const LANE: Lane = { segs, fire: hits[2] }
/** The reset: this long after the last plate is down. */
const RESET = hits[2] + 1.0
const LIFT = 0.08

/** How far down plate `i` is, 0 standing to 1 in the trough. */
function sunk(i: number, t: number): number {
  if (t < hits[i]) return 0
  if (t < RESET) return easeInQuad(over(t, hits[i], hits[i] + DROP))
  return 1 - easeOutCubic(over(t, RESET, RESET + LIFT))
}

export const targets = definePiece<{ color: string }>({
  name: 'targets',
  // Restored as it stood, but for this: it was cut before the arcade kept score, and an arcade beat must earn.
  points: 300,
  weight: 1,
  place: ({ color, fits }) => {
    const cells: [number, number][] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const down = t < RESET ? hits.filter((h) => t >= h).length : 0
    // Three down: the lamps blink together for a moment, then hold until the reset.
    const blink = since > 0 && since < 0.6 ? (Math.floor(since * 10) % 2 === 0 ? 1 : 0) : 1
    // The reset bar: up through the trough with the plates on it, and back down.
    const bar = t < RESET ? 0 : t < RESET + LIFT ? easeOutCubic(over(t, RESET, RESET + LIFT)) : 1 - over(t, RESET + LIFT + 0.05, RESET + LIFT + 0.3)

    // The header on its two posts, which stand behind the lane on the trough's ends.
    outline(p, ink, weight)
    for (const x of POSTS) p.line(x * k, HEAD.y * k, x * k, BOX.y0 * k)
    solid(p, ink, weight, s.color)
    p.rect(((HEAD.x0 + HEAD.x1) / 2) * k, HEAD.y * k, (HEAD.x1 - HEAD.x0) * k, HEAD.h * k, 0.02 * k)
    // The lamps in a dark band let into it, one over each plate.
    p.noStroke()
    p.fill(bg)
    p.rect(((XS[0] + XS[2]) / 2) * k, HEAD.y * k, (XS[2] - XS[0] + 0.2) * k, 0.075 * k, 0.015 * k)
    XS.forEach((x, i) => lamp(p, k, ink, weight, s.color, bg, x, HEAD.y, 0.028, i < down ? blink : 0))

    // The trough under the rail: a tray in the colour with a dark pane in its face, the dropped plates seen
    // through it, and the counter beside the pane.
    solid(p, ink, weight, s.color)
    p.rect(((BOX.x0 + BOX.x1) / 2) * k, ((BOX.y0 + BOX.y1) / 2) * k, (BOX.x1 - BOX.x0) * k, (BOX.y1 - BOX.y0) * k, 0.02 * k)
    p.noStroke()
    p.fill(bg)
    p.rect(((PANE.x0 + PANE.x1) / 2) * k, ((PANE.y0 + PANE.y1) / 2) * k, (PANE.x1 - PANE.x0) * k, (PANE.y1 - PANE.y0) * k, 0.012 * k)
    glow(p, k, s.color, COUNTER.x, COUNTER.y, 0.14, down === 3 ? blink * 0.8 : 0)
    display(p, k, ink, weight, bg, COUNTER.x, COUNTER.y, COUNTER.w, COUNTER.h, `${down}`, s.color, down > 0)
    // The reset bar across the pane's foot.
    const barY = FLOOR + TALL + TAIL + 0.015 - bar * TALL
    solid(p, ink, weight * 0.7, s.color)
    p.rect(((PANE.x0 + PANE.x1) / 2) * k, barY * k, (PANE.x1 - PANE.x0 - 0.08) * k, 0.03 * k, 0.008 * k)

    rail(p, k, ink, weight, -0.5, 1.5)
    // The plates, each in its slot: standing in the ball's way, or down in the trough.
    XS.forEach((x, i) => {
      const y = FLOOR - TALL + sunk(i, t) * TALL
      solid(p, ink, weight * 0.8, s.color)
      p.rect(x * k, (y + (TALL + TAIL) / 2) * k, THICK * k, (TALL + TAIL) * k, 0.02 * k)
      p.fill(ink)
      p.noStroke()
      p.rect(x * k, (y + TALL * 0.5) * k, THICK * k, 0.03 * k)
    })
    // The hits, and the thump of the reset.
    XS.forEach((x, i) => flash(p, k, s.color, weight, x - THICK / 2, 0, t - hits[i], 0.16, 0.05, 0.16))
    if (t > RESET && t < RESET + 0.2) {
      const f = over(t, RESET, RESET + 0.2)
      p.push()
      p.stroke(ink)
      p.strokeWeight(weight)
      for (const x of [BOX.x0 - 0.03, BOX.x1 + 0.03]) {
        const side = x < 0.4 ? -1 : 1
        p.line(x * k, (BOX.y0 + 0.05) * k, (x + side * (0.04 + 0.04 * f)) * k, (BOX.y0 + 0.01 - 0.03 * f) * k)
        p.line(x * k, (BOX.y0 + 0.14) * k, (x + side * (0.05 + 0.05 * f)) * k, (BOX.y0 + 0.14) * k)
      }
      p.pop()
    }
  },
  scores: (p, s, { k, since, bg }) => score(p, k, s.color, bg, XS[1], HEAD.y + 0.09, '+300', since, 1),
})
