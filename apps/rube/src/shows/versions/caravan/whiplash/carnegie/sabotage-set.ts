import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { solid } from '../../../../../../../../src/core/draw'
import { clamp, easeInOutSine } from '../../../../../../../../src/core/ease'
import { alpha, frame, type Ctx } from '../kit'
import { HALL } from '../worlds'
import { CHART_H, CHART_W, doorAngle, veil } from './sabotage-motion'
import { DOOR, FLOOR, LIP } from './stage'

/**
 * What the sabotage draws round the hall (`hall.ts` draws the hall itself), besides its stand and Fletcher (those
 * are `sabotage.ts`'s own): the chart, the stage door that Jim opens, and the road's
 * darkness lifting off the hall after the match cut. Every function draws from show time `T`.
 *
 * The stage draws with `rectMode(CENTER)` (`engine.ts`); these props are laid out by their corners, so each sets
 * `CORNER` inside its own push/pop. Fletcher's rig is left in the stage's mode, so that it looks exactly as the hall
 * draws it from the solo's first stroke on.
 */

/* ------------------------------------------------------------------ the chart */

/**
 * The chart Fletcher throws: a sheet of the band's paper, a shade darker than the lit pages on the band's stands,
 * with four staves ruled across it. No notes, nothing that reads as writing.
 */
export function drawChart(p: p5, c: Ctx, at: Pt, turn: number, light = 1): void {
  const { k, ink, weight } = c
  const paper = mixHex(HALL.deep, mixHex(HALL.beam, HALL.floor, 0.3), 0.35 + 0.65 * light)
  p.push()
  p.rectMode(p.CORNER)
  p.translate(at[0] * k, at[1] * k)
  p.rotate(turn)
  solid(p, ink, weight * 0.6, paper)
  p.rect((-CHART_W / 2) * k, (-CHART_H / 2) * k, CHART_W * k, CHART_H * k, 0.012 * k)
  p.stroke(mixHex(paper, HALL.black, 0.7))
  p.strokeWeight(Math.max(0.6, weight * 0.45))
  for (let staff = 0; staff < 4; staff++) {
    const y0 = -CHART_H / 2 + 0.08 + staff * 0.105
    for (let line = 0; line < 4; line++) {
      const y = y0 + line * 0.014
      p.line((-CHART_W / 2 + 0.04) * k, y * k, (CHART_W / 2 - 0.04) * k, y * k)
    }
  }
  p.pop()
}

/* ------------------------------------------------------------------ the stand */

/* ------------------------------------------------------------------ the stage door */

const DOOR_X0 = DOOR.x - DOOR.w / 2
const DOOR_TOP = FLOOR - DOOR.h

/** The door's leaf at `angle`, as four corners (hinge top, free top, free bottom, hinge bottom): it narrows and its free edge shortens as it swings away. */
function leaf(angle: number): [Pt, Pt, Pt, Pt] {
  const xf = DOOR_X0 + DOOR.w * Math.cos(angle)
  const s = Math.sin(angle)
  return [
    [DOOR_X0, DOOR_TOP],
    [xf, DOOR_TOP + DOOR.h * 0.07 * s],
    [xf, FLOOR - DOOR.h * 0.025 * s],
    [DOOR_X0, FLOOR],
  ]
}
/** A point on the leaf: `u` across from the hinge, `v` down from the top. */
function onLeaf(q: [Pt, Pt, Pt, Pt], u: number, v: number): Pt {
  const top: Pt = [q[0][0] + (q[1][0] - q[0][0]) * u, q[0][1] + (q[1][1] - q[0][1]) * u]
  const bot: Pt = [q[3][0] + (q[2][0] - q[3][0]) * u, q[3][1] + (q[2][1] - q[3][1]) * u]
  return [top[0] + (bot[0] - top[0]) * v, top[1] + (bot[1] - top[1]) * v]
}

/**
 * Behind the stage door (drawn under the balls): the lit corridor in the doorway, and its light thrown out across the
 * stage floor. Only while the door is open; the leaf (`drawDoorLeaf`, over the balls) covers the rest.
 */
export function drawDoorway(p: p5, c: Ctx, T: number): void {
  const angle = doorAngle(T)
  if (angle <= 0.001) return
  const { k, ink, weight } = c
  // Open, and a little brighter as the band's held chord swells behind the two of them.
  const open = clamp(angle / 0.9) * (0.85 + 0.25 * easeInOutSine(clamp((T - 262.1) / 5)))
  const x0 = DOOR_X0
  const x1 = DOOR_X0 + DOOR.w
  p.push()
  p.rectMode(p.CORNER)
  p.noStroke()
  // The corridor's far wall, warm in its lamps, and its floor catching the light.
  p.fill(mixHex(HALL.deep, HALL.gold, 0.08 + 0.2 * open))
  p.rect(x0 * k, DOOR_TOP * k, DOOR.w * k, DOOR.h * k)
  p.fill(mixHex(HALL.deep, HALL.gold, 0.14 + 0.32 * open))
  p.rect(x0 * k, (FLOOR - 0.34) * k, DOOR.w * k, 0.34 * k)
  // Where the corridor turns away: the side wall in shadow.
  p.fill(mixHex(HALL.deep, HALL.gold, 0.05 + 0.1 * open))
  p.quad((x1 - 0.42) * k, DOOR_TOP * k, x1 * k, DOOR_TOP * k, x1 * k, FLOOR * k, (x1 - 0.42) * k, (FLOOR - 0.34) * k)
  // The door's frame round it all.
  solid(p, ink, weight * 0.8, HALL.black)
  p.noFill()
  p.rect(x0 * k, DOOR_TOP * k, DOOR.w * k, DOOR.h * k)
  // The light: down the corridor from above, and out through the door onto the stage floor.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const down = ctx.createLinearGradient(0, DOOR_TOP * k, 0, FLOOR * k)
  down.addColorStop(0, 'rgba(227, 176, 91, 0)')
  down.addColorStop(1, `rgba(227, 176, 91, ${(0.22 * open).toFixed(3)})`)
  ctx.fillStyle = down
  ctx.fillRect(x0 * k, DOOR_TOP * k, DOOR.w * k, DOOR.h * k)
  const spill = ctx.createLinearGradient(0, FLOOR * k, 0, LIP * k)
  spill.addColorStop(0, `rgba(227, 176, 91, ${(0.3 * open).toFixed(3)})`)
  spill.addColorStop(1, 'rgba(227, 176, 91, 0)')
  ctx.fillStyle = spill
  ctx.beginPath()
  ctx.moveTo(x0 * k, FLOOR * k)
  ctx.lineTo(x1 * k, FLOOR * k)
  ctx.lineTo((x1 + 1.1) * k, LIP * k)
  ctx.lineTo((x0 - 0.5) * k, LIP * k)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  p.pop()
}

/**
 * The stage door's leaf, over the balls (Jim waits behind it until it opens). Shut, it is exactly the hall's door;
 * open, it narrows toward its hinge and its window goes dark.
 */
export function drawDoorLeaf(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const angle = doorAngle(T)
  const face = mixHex(mixHex(c.bg, HALL.deep, 0.8), HALL.black, 0.6 * Math.sin(angle))
  p.push()
  p.rectMode(p.CORNER)
  solid(p, ink, weight * 0.8, face)
  if (angle <= 0.001) {
    p.rect(DOOR_X0 * k, DOOR_TOP * k, DOOR.w * k, DOOR.h * k)
    p.noStroke()
    p.fill(alpha(p, HALL.gold, 0.5))
    p.rect((DOOR.x - 0.25) * k, (DOOR_TOP + 0.7) * k, 0.5 * k, 0.7 * k, 0.05 * k)
  } else {
    const q = leaf(angle)
    p.quad(q[0][0] * k, q[0][1] * k, q[1][0] * k, q[1][1] * k, q[2][0] * k, q[2][1] * k, q[3][0] * k, q[3][1] * k)
    // The window, turning with the leaf, no longer lit from behind.
    const u0 = (DOOR.w / 2 - 0.25) / DOOR.w
    const u1 = (DOOR.w / 2 + 0.25) / DOOR.w
    const v0 = 0.7 / DOOR.h
    const v1 = 1.4 / DOOR.h
    const w = [onLeaf(q, u0, v0), onLeaf(q, u1, v0), onLeaf(q, u1, v1), onLeaf(q, u0, v1)]
    p.noStroke()
    p.fill(alpha(p, HALL.gold, 0.5 * (1 - clamp(angle / 0.7))))
    p.quad(w[0][0] * k, w[0][1] * k, w[1][0] * k, w[1][1] * k, w[2][0] * k, w[2][1] * k, w[3][0] * k, w[3][1] * k)
  }
  // Under the road's darkness, like everything else, just after the cut.
  const v = veil(T)
  if (v > 0.001) {
    p.noStroke()
    p.fill(alpha(p, c.bg, v))
    p.rect((DOOR_X0 - 0.1) * k, (DOOR_TOP - 0.1) * k, (DOOR.w + 0.2) * k, (DOOR.h + 0.2) * k)
  }
  p.pop()
}

/* ------------------------------------------------------------------ the dark */

/** The road's darkness over the whole frame, lifting as the hall's lights come up. */
export function drawVeil(p: p5, c: Ctx, T: number): void {
  const v = veil(T)
  if (v <= 0.001) return
  const f = frame(p, c.k)
  p.push()
  p.rectMode(p.CORNER)
  p.noStroke()
  p.fill(alpha(p, c.bg, v))
  p.rect(f.x0 * c.k, f.y0 * c.k, (f.x1 - f.x0) * c.k, (f.y1 - f.y0) * c.k)
  p.pop()
}
