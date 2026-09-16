import { outline, solid } from '../../../../../src/core/draw'
import { easeOutBack, easeOutCubic } from '../../../../../src/core/ease'
import { FLOOR, ROLL, burst, definePiece, fall, fly, mixHex, over, rail, ramp, wait, type Lane, type Pt } from '../../parts'

/**
 * A toaster. The ball rolls across its lid, drops into the slot, and the
 * lever goes down with it, winding the timer. Through the window the ball
 * is seen sitting in the dark of the slot between two heating elements,
 * which warm from grey to hot as the timer runs down, the chamber glowing
 * with them and heat rising off the slot — and when the hand reaches the
 * end it pops, up onto the shelf a floor above, and rolls on with a ding.
 * This is the show's other way up, and its silliest.
 */
const SLOT = -0.04
const LID = FLOOR
const BODY_X0 = -0.36
const BODY_X1 = 0.2
const BODY_Y1 = 0.5
/** The lever's slot, out from the body's side. */
const LEVER_X = BODY_X0 - 0.07
const INSIDE: Pt = [SLOT, 0.3]
/** The window: a hole in the body's face onto the slot's chamber, the ball's middle in it. */
const WIN_X0 = -0.3
const WIN_X1 = 0.08
const WIN_Y0 = 0.24
const WIN_Y1 = 0.4
/** The timer dial, beside the window; its hand winds back with the lever and runs down to the pop. */
const DIAL: Pt = [0.14, 0.32]
const WIND = 1.7
const SHELF_Y = -1
const LAND: Pt = [0.32, SHELF_Y]
const ARRIVE = (0.5 + SLOT) / ((ROLL + 1.2) / 2)
const DROP = 0.12
/** The ball is in the slot from here until the pop. */
const T_IN = ARRIVE + DROP
const TOAST = 1.5
const FIRE = T_IN + TOAST
const POP = 0.5
const ARC = 0.78

/** How far down the lever is: down with the ball's drop, up with a spring at the pop. */
const leverAt = (t: number, since: number) => (t < ARRIVE ? 0 : since < 0 ? easeOutCubic(over(t, ARRIVE, T_IN)) : 1 - easeOutBack(over(since, 0, 0.18)))
/** How far the timer is wound: with the lever as the ball drops in, then running down to nothing at the pop. */
const woundAt = (t: number) => (t < ARRIVE ? 0 : t < T_IN ? easeOutCubic(over(t, ARRIVE, T_IN)) : t < FIRE ? 1 - over(t, T_IN, FIRE) : 0)
/** How hot the elements are: building with the toast, cooling after the pop. */
const heatAt = (t: number, since: number) => (t < T_IN ? 0 : since < 0 ? over(t, T_IN, FIRE) : 1 - over(since, 0, 1.2))

export const toaster = definePiece<{ color: string }>({
  name: 'toaster',
  flight: true,
  weight: 0.9,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, -1],
    ]
    if (!fits(cells, [1, -1])) return null
    const lane: Lane = {
      segs: [
        ramp([-0.5, 0], [SLOT, 0], ROLL, 1.2),
        fall([SLOT, 0], INSIDE, INSIDE[1] / DROP),
        // In the slot, in view through the window.
        wait(INSIDE, TOAST),
        fly(INSIDE, LAND, POP, ARC),
        fly(LAND, [LAND[0] + 0.14, SHELF_Y], 0.09, 0.03),
        ramp([LAND[0] + 0.14, SHELF_Y], [0.5, SHELF_Y], 1.5, ROLL),
      ],
      fire: FIRE,
    }
    return { cells, exit: { at: [1, -1], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    // The rail onto the lid, and the shelf above on its bracket.
    rail(p, k, ink, weight, -0.5, BODY_X0)
    rail(p, k, ink, weight, 0.1, 0.5, SHELF_Y + FLOOR)
    outline(p, ink, weight)
    p.line(0.42 * k, (SHELF_Y + FLOOR) * k, 0.42 * k, 0.5 * k)
    p.line(0.36 * k, 0.5 * k, 0.48 * k, 0.5 * k)
    p.line(0.42 * k, (SHELF_Y + FLOOR + 0.2) * k, 0.18 * k, (SHELF_Y + FLOOR) * k)
    // The lever on the side: it rides a slot the height of the body, goes
    // all the way down as the ball drops in, and springs up with the pop.
    const down = leverAt(t, since)
    const slotTop = LID + 0.05
    const slotBottom = BODY_Y1 - 0.06
    outline(p, ink, weight)
    p.line(LEVER_X * k, slotTop * k, LEVER_X * k, slotBottom * k)
    p.line((LEVER_X + 0.03) * k, slotTop * k, BODY_X0 * k, slotTop * k)
    solid(p, ink, weight, s.color)
    p.rect(LEVER_X * k, (slotTop + 0.03 + down * (slotBottom - slotTop - 0.06)) * k, 0.11 * k, 0.06 * k, 0.02 * k)

    // The slot's chamber, behind the ball, seen through the window: dark,
    // warming a little with the elements. Two elements across the back
    // wall, one above the ball's middle and one below, grey when cold and
    // the body's colour gone pale with heat, thickening as they glow.
    const heat = heatAt(t, since)
    p.push()
    p.noStroke()
    p.fill(mixHex(ink, s.color, 0.3 * heat))
    p.rect(((WIN_X0 + WIN_X1) / 2) * k, ((WIN_Y0 + WIN_Y1) / 2) * k, (WIN_X1 - WIN_X0 + 0.02) * k, (WIN_Y1 - WIN_Y0 + 0.02) * k)
    p.noFill()
    p.stroke(mixHex(mixHex(ink, bg, 0.4), mixHex(s.color, bg, 0.35), heat))
    p.strokeWeight(weight * (0.8 + 0.6 * heat))
    for (const y of [WIN_Y0 + 0.035, WIN_Y1 - 0.035]) {
      p.beginShape()
      const n = 10
      for (let i = 0; i <= n; i++) {
        const x = WIN_X0 + 0.02 + ((WIN_X1 - WIN_X0 - 0.04) * i) / n
        p.vertex(x * k, (y + (i % 2 ? -0.012 : 0.012)) * k)
      }
      p.endShape()
    }
    p.pop()

    // The ding: two arcs off the corner, and crumbs.
    if (since > 0 && since < 0.5) {
      const f = over(since, 0, 0.5)
      p.push()
      p.noFill()
      p.stroke(s.color)
      p.strokeWeight(weight)
      for (let i = 1; i <= 2; i++) {
        const r = (0.12 + i * 0.1 + f * 0.2) * k
        p.arc((BODY_X1 + 0.02) * k, (LID - 0.02) * k, r, r, -Math.PI * 0.7, -Math.PI * 0.1)
      }
      p.stroke(ink)
      burst(p, SLOT * k, (LID - 0.04) * k, (0.05 + f * 0.2) * k, (0.09 + f * 0.24) * k, 5, 0.3)
      p.pop()
    }
  },
  // The body stands in front of the ball: it drops *into* the slot and pops
  // *out* of it, and is seen through the window in between.
  over: (p, s, { k, t, since, ink, bg, weight }) => {
    const jolt = since > 0 && since < 0.2 ? 0.012 * Math.sin(since * 70) * (1 - over(since, 0, 0.2)) : 0
    const toasting = t > T_IN && since < 0
    p.push()
    p.translate(0, jolt * k)
    // The body, with the window cut out of it.
    p.push()
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.beginPath()
    ctx.rect((BODY_X0 - 0.1) * k, (LID - 0.1) * k, (BODY_X1 - BODY_X0 + 0.2) * k, (BODY_Y1 - LID + 0.2) * k)
    ctx.rect(WIN_X0 * k, WIN_Y0 * k, (WIN_X1 - WIN_X0) * k, (WIN_Y1 - WIN_Y0) * k)
    ctx.clip('evenodd')
    solid(p, ink, weight, s.color)
    p.rect(((BODY_X0 + BODY_X1) / 2) * k, ((LID + BODY_Y1) / 2) * k, (BODY_X1 - BODY_X0) * k, (BODY_Y1 - LID) * k, 0.05 * k)
    p.pop()
    // The window's frame, and the slot: a dark mouth in the lid.
    outline(p, ink, weight)
    p.rect(((WIN_X0 + WIN_X1) / 2) * k, ((WIN_Y0 + WIN_Y1) / 2) * k, (WIN_X1 - WIN_X0) * k, (WIN_Y1 - WIN_Y0) * k)
    p.push()
    p.noStroke()
    p.fill(ink)
    p.rect(SLOT * k, LID * k, 0.34 * k, 0.05 * k)
    p.pop()
    // Heat off the slot while it toasts.
    if (toasting) {
      p.push()
      p.noFill()
      p.stroke(ink)
      p.strokeWeight(weight)
      for (const dx of [-0.1, 0, 0.1]) {
        const rise = ((t * 0.6 + dx) % 0.25) / 0.25
        const y = LID - 0.04 - rise * 0.16
        p.bezier((SLOT + dx) * k, y * k, (SLOT + dx + 0.03) * k, (y - 0.03) * k, (SLOT + dx - 0.03) * k, (y - 0.06) * k, (SLOT + dx) * k, (y - 0.09) * k)
      }
      p.pop()
    }
    // The timer: a dial whose hand is wound back as the lever goes down and runs down to the top, where it pops.
    const hand = -Math.PI / 2 - WIND * woundAt(t)
    solid(p, ink, weight, bg)
    p.circle(DIAL[0] * k, DIAL[1] * k, 0.09 * k)
    outline(p, ink, weight)
    p.line(DIAL[0] * k, (DIAL[1] - 0.06) * k, DIAL[0] * k, (DIAL[1] - 0.04) * k)
    p.line(DIAL[0] * k, DIAL[1] * k, (DIAL[0] + Math.cos(hand) * 0.035) * k, (DIAL[1] + Math.sin(hand) * 0.035) * k)
    p.pop()
  },
})
