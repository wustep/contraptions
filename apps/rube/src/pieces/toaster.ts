import { outline, solid } from '../../../../src/core/draw'
import { easeOutBack } from '../../../../src/core/ease'
import { FLOOR, ROLL, burst, definePiece, fall, fly, over, rail, roll, wait, type Lane, type PieceCtx, type Pt } from '../parts'

/**
 * A toaster. The ball rolls across its lid, drops into the slot, the lever
 * goes down, the coils glow through the window for a long moment — and it
 * pops, up onto the shelf a floor above, and rolls on with a ding. This is
 * the show's other way up, and its silliest.
 */
const SLOT = -0.04
const LID = FLOOR
const BODY_X0 = -0.36
const BODY_X1 = 0.2
const BODY_Y1 = 0.5
const INSIDE: Pt = [SLOT, 0.3]
const SHELF_Y = -1
const LAND: Pt = [0.32, SHELF_Y]
const ARRIVE = (0.5 + SLOT) / ROLL
const DROP = 0.12
const TOAST = 1.5
const POP = 0.5
const ARC = 0.78

export const toaster = definePiece<{ color: string }>({
  name: 'toaster',
  weight: 0.9,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, -1],
    ]
    if (!fits(cells, [1, -1])) return null
    const lane: Lane = {
      segs: [
        roll([-0.5, 0], [SLOT, 0], ROLL),
        fall([SLOT, 0], INSIDE, INSIDE[1] / DROP),
        wait(INSIDE, TOAST, { hidden: true }),
        fly(INSIDE, LAND, POP, ARC),
        fly(LAND, [LAND[0] + 0.14, SHELF_Y], 0.09, 0.03),
        roll([LAND[0] + 0.14, SHELF_Y], [0.5, SHELF_Y], ROLL, 'out'),
      ],
      fire: ARRIVE + DROP + TOAST,
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
    // The lever on the side: down while toasting, up with the pop.
    const down = t < ARRIVE ? 0 : since < 0 ? over(t, ARRIVE, ARRIVE + DROP) : 1 - easeOutBack(over(since, 0, 0.18))
    outline(p, ink, weight)
    p.line((BODY_X0 - 0.06) * k, (LID + 0.04) * k, (BODY_X0 - 0.06) * k, (LID + 0.22) * k)
    solid(p, ink, weight, bg)
    p.rect((BODY_X0 - 0.06) * k, (LID + 0.06 + down * 0.14) * k, 0.09 * k, 0.05 * k)
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
  // *out* of it, and glows through the window in between.
  over: (p, s, c: PieceCtx) => {
    const { k, t, since, ink, bg, weight } = c
    solid(p, ink, weight, s.color)
    p.rect(((BODY_X0 + BODY_X1) / 2) * k, ((LID + BODY_Y1) / 2) * k, (BODY_X1 - BODY_X0) * k, (BODY_Y1 - LID) * k, 0.05 * k)
    const toasting = t > ARRIVE + DROP && since < 0
    const glow = toasting ? 0.5 + 0.5 * Math.sin(t * 9) : 0
    // The slot: a dark mouth in the lid.
    p.push()
    p.noStroke()
    p.fill(ink)
    p.rect(SLOT * k, LID * k, 0.34 * k, 0.05 * k)
    p.pop()
    // The window, with coils that glow while it toasts.
    solid(p, ink, weight, bg)
    p.rect(-0.08 * k, 0.33 * k, 0.3 * k, 0.14 * k)
    if (toasting) {
      p.push()
      p.noStroke()
      const warm = p.color(s.color === c.color ? ink : c.color)
      warm.setAlpha(150 + 100 * glow)
      p.fill(warm)
      p.rect(-0.08 * k, 0.33 * k, 0.28 * k, 0.12 * k)
      p.pop()
      // Heat off the slot.
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
    p.push()
    p.stroke(toasting ? s.color : ink)
    p.strokeWeight(weight * (1 + glow * 0.8))
    for (let i = 0; i < 3; i++) {
      const y = 0.29 + i * 0.04
      p.line(-0.2 * k, y * k, 0.04 * k, y * k)
    }
    p.pop()
    // The dial.
    solid(p, ink, weight, bg)
    p.circle((BODY_X1 - 0.09) * k, 0.4 * k, 0.08 * k)
    outline(p, ink, weight)
    p.line((BODY_X1 - 0.09) * k, 0.4 * k, (BODY_X1 - 0.09 + 0.03) * k, 0.38 * k)
  },
})
