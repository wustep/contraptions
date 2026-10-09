import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { drawInk, mix, rgba } from '../cast'
import { hash } from '../kit'
import { SHELL } from '../worlds'
import { heavy, ring } from './ink'
import { CARD, FLOOR, GX, INTO, LOGOS, PLATE, RAIL, ROW, SLOT, T, WAIT, cardY, lerp, lightAt, plateAt, railY, smooth, type Logo } from './plan'

/**
 * The language as a machine she drives. A word they have written, once it has closed, comes in through a slot in
 * the glass onto a pale card hung on the rail by the slot. When she lands on the plate, her board flips up and the
 * plate's cord slips the catch at the rail's end: the card runs down the rail and knocks against the words before it,
 * and swings. Their ink stays their ink all the way: black, on the white of the fog and on the pale of the card.
 */

type Ctx = CanvasRenderingContext2D

/** Where a word's card hangs on the rail at `t`, how it swings on its hook (radians), how far it has appeared. */
export function cardOf(l: Logo, t: number): { x: number; swing: number; show: number } | null {
  const arrive = l.slotIn + INTO
  // The card comes up as the word reaches it, not before: up early, it hung blank on the rail for a beat, a glitch.
  const appear = l.slotIn + INTO * 0.9
  if (t < appear) return null
  const show = smooth(t, appear, arrive)
  let x = WAIT
  let swing = 0
  if (t >= arrive) swing += 0.1 * Math.exp(-(t - arrive) / 0.3) * Math.sin((t - arrive) * 12)
  if (l.release !== null && t >= l.release) {
    const dur = l.land - l.release
    const u = Math.min(1, (t - l.release) / dur)
    // Down the rail, gathering speed.
    x = WAIT + (ROW[l.row] - WAIT) * u * u
    if (t < l.land) swing = -0.26 * smooth(u, 0, 0.35)
    else {
      // Stopped hard against the one before: it swings on, and dies away.
      const v = t - l.land
      swing = Math.exp(-v / 0.5) * (-0.26 * Math.cos(v * 9) + 0.42 * Math.sin(v * 9))
    }
  }
  // Knocked by the next one landing against it.
  for (const m of LOGOS) {
    if (m.row !== l.row + 1 || m.release === null || t < m.land) continue
    const v = t - m.land
    swing += 0.12 * Math.exp(-v / 0.35) * Math.sin(v * 11)
  }
  return { x, swing, show }
}

/** The rail, its catch and the cord from the plate, the cards, and the words on their way in. */
export function drawRail(p: p5, ctx: Ctx, k: number, t: number): void {
  const bomb = t > T.bomb - 1
  const lit = (x: number) => 0.3 + 0.7 * Math.sqrt(lightAt(x, t))
  const press = plateAt(t)
  const catchAt: Pt = [GX - 0.12, railY(GX - 0.12)]
  ctx.save()
  ctx.lineCap = 'round'
  // The cord from the plate straight up the wall to the rail, where a crank turns the pull along it to the catch:
  // slack at rest, pulled taut when she stands on the plate.
  const cordX = PLATE - 0.28
  if (!bomb) {
    const y0 = FLOOR + 0.02
    const y1 = railY(cordX) + 0.05
    const bow = 0.07 * (1 - press)
    ctx.strokeStyle = mix(SHELL.dark, SHELL.wallLit, 0.25 + 0.45 * lit(cordX))
    ctx.lineWidth = 0.022 * k
    ctx.beginPath()
    ctx.moveTo(cordX * k, y0 * k)
    ctx.quadraticCurveTo((cordX - bow) * k, ((y0 + y1) / 2) * k, cordX * k, y1 * k)
    ctx.stroke()
  }
  // The rail: a dark iron bar on two brackets, its top edge catching the glass's light; it runs on in through the glass
  // (the slot the words come in by), until the blast.
  const x0 = RAIL.x0
  const x1 = t < T.blast ? RAIL.x1 + 0.34 : RAIL.x1
  ctx.lineWidth = 0.075 * k
  ctx.strokeStyle = mix(SHELL.dark, SHELL.wallLit, 0.55)
  ctx.beginPath()
  ctx.moveTo(x0 * k, railY(x0) * k)
  ctx.lineTo(x1 * k, railY(x1) * k)
  ctx.stroke()
  const edge = ctx.createLinearGradient(x0 * k, 0, x1 * k, 0)
  edge.addColorStop(0, rgba(SHELL.fogLit, 0.12))
  edge.addColorStop(1, rgba(SHELL.fogLit, 0.6))
  ctx.strokeStyle = edge
  ctx.lineWidth = 0.02 * k
  ctx.beginPath()
  ctx.moveTo(x0 * k, (railY(x0) - 0.03) * k)
  ctx.lineTo(x1 * k, (railY(x1) - 0.03) * k)
  ctx.stroke()
  ctx.fillStyle = mix(SHELL.dark, SHELL.wall, 0.7)
  for (const bx of [x0 + 0.25, (x0 + x1) / 2]) ctx.fillRect((bx - 0.05) * k, (railY(bx) - 0.02) * k, 0.1 * k, -0.28 * k)
  // Its stop at the far end, and the crank where the cord meets it.
  ctx.fillRect((x0 - 0.08) * k, (railY(x0) - 0.12) * k, 0.1 * k, 0.22 * k)
  ctx.save()
  ctx.translate(cordX * k, railY(cordX) * k)
  ctx.rotate(0.5 * press)
  ctx.fillRect(-0.03 * k, -0.02 * k, 0.16 * k, 0.07 * k)
  ctx.restore()
  // The catch: a tooth at the rail's end that holds the card by the slot; the cord lifts it.
  ctx.save()
  ctx.translate(catchAt[0] * k, catchAt[1] * k)
  ctx.rotate(-0.9 * press)
  ctx.fillStyle = mix(SHELL.dark, SHELL.wallLit, 0.75)
  ctx.beginPath()
  ctx.moveTo(0, -0.04 * k)
  ctx.lineTo(-0.2 * k, 0.02 * k)
  ctx.lineTo(-0.2 * k, 0.1 * k)
  ctx.lineTo(0, 0.05 * k)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  if (!bomb) {
    const dim = 1 - 0.3 * smooth(t, T.weapon, T.weapon + 0.8)
    for (const l of LOGOS) {
      const cd = cardOf(l, t)
      if (!cd) continue
      const read = t >= T.readback + 0.28 * l.row ? Math.exp(-(t - (T.readback + 0.28 * l.row)) / 1.1) : 0
      ctx.save()
      ctx.translate(cd.x * k, (railY(cd.x) + 0.02) * k)
      ctx.rotate(cd.swing + (hash(l.row, 3, 21) - 0.5) * 0.04)
      ctx.globalAlpha *= cd.show
      // Its hook over the rail.
      ctx.strokeStyle = mix(SHELL.dark, SHELL.wallLit, 0.7)
      ctx.lineWidth = 0.02 * k
      ctx.beginPath()
      ctx.moveTo(0, -0.03 * k)
      ctx.lineTo(0, 0.1 * k)
      ctx.stroke()
      // The card, lit by the glass, and lit again as she reads it back.
      const s = CARD * k
      ctx.fillStyle = mix(SHELL.dark, SHELL.board, Math.min(1, lit(cd.x) * dim + 0.35 * read))
      ctx.fillRect(-s / 2, 0.1 * k, s, s)
      ctx.fillStyle = rgba(SHELL.dark, 0.25)
      ctx.fillRect(-s / 2, 0.1 * k + s - 0.03 * k, s, 0.03 * k)
      if (t >= l.slotIn + INTO) drawInk(p, k, 0, 0.1 + CARD / 2, l.r, heavy(l.seed), 1, { color: SHELL.ink, tendrils: 1 })
      ctx.restore()
    }
    // The words on their way: from where they were written, in through the slot, onto the card by it. Black ink all
    // the way.
    for (const l of LOGOS) {
      if (t < l.slotIn || t >= l.slotIn + INTO) continue
      const v = (t - l.slotIn) / INTO
      let at: Pt
      let R: number
      if (v < 0.62) {
        const e = smooth(v, 0, 0.62)
        at = [lerp(l.c[0], SLOT[0], e), lerp(l.c[1], SLOT[1], e)]
        R = lerp(l.R, l.r, e)
      } else {
        const e = smooth(v, 0.62, 1)
        at = [lerp(SLOT[0], WAIT, e), lerp(SLOT[1], cardY(WAIT), e)]
        R = l.r
      }
      drawInk(p, k, at[0], at[1], R, R < 0.5 ? heavy(l.seed) : ring(l.seed), 1, { color: SHELL.ink, tendrils: 1 })
    }
  }
  ctx.restore()
}
