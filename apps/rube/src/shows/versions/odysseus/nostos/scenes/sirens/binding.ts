import { circle, fill, rgba, smooth, stroke, type Paint } from '../../draw'
import { beatNear, BEATS } from '../../music'
import type { Pt } from '../../path'
import { seat } from '../../voyage'
import { DECK, onShip } from '../../world/ship'
import { shipPose, shipX } from './course'

/**
 * The binding: the contraption by which he has himself tied to the mast. A line runs from man 0's hands up the mast,
 * through a block under the yard, and down round the mast and him. Man 0 steps aft on each of three beats, hauling, and
 * on each a turn of the line closes over him from the mast's side; then he is held. As the rocks come by he strains
 * towards them on every beat, and the turns take him back. When the rocks are astern the turns are cast off one by one
 * and slide to the deck, and the line goes slack.
 */

/** Where he stands bound: against the mast's aft side (ship frame). */
export const MAST_AT: Pt = [-0.015, DECK - 0.13]
const MAST_X = 0.15
const BLOCK: Pt = [0.26, DECK - 1.95]

/** The three beats on which a turn closes over him. */
export const COILS = [beatNear(255.86).t, beatNear(256.61).t, beatNear(257.36).t]
/** When the turns are cast off: the rocks well astern. */
export const RELEASE = 275.0
/** Man 0 hauls from just before the first turn, and holds the line until he goes back to his place. */
export const HAUL: [number, number] = [COILS[0] - 0.3, RELEASE + 1.6]

/** How far the rocks are from his mast, and which way (rocks ahead is positive). */
const ROCKS_X = 441
const dirAt = (t: number): number => Math.tanh((ROCKS_X - (shipX(t) + MAST_X)) / 4)
const nearAt = (t: number): number => smooth(1 - Math.abs(ROCKS_X - (shipX(t) + MAST_X)) / 22, 0, 0.6)

/** The beats he strains on: every beat from when the rocks come into his reach until the turns are cast off. */
const STRAINS = BEATS.filter((b) => b.t > COILS[2] + 0.8 && b.t < RELEASE - 0.6).map((b) => b.t)

/**
 * How far he is pulled off the mast at `t` (cells, positive towards the bow): on each beat a lunge towards the rocks
 * (quick to come, slow to be taken back by the turns), summed, and never more than the turns give.
 */
export function strainAt(t: number): number {
  if (t < COILS[2] || t > RELEASE + 0.5) return 0
  let s = 0
  for (const b of STRAINS) {
    const u = t - b
    if (u < 0) break
    if (u > 3) continue
    s += (1 - Math.exp(-u / 0.06)) * Math.exp(-u / 0.42)
  }
  const v = 0.095 * dirAt(t) * nearAt(t) * s
  return Math.max(-0.13, Math.min(0.13, v)) * (1 - smooth(t, RELEASE, RELEASE + 0.4))
}

/** Man 0's place on the deck: a step aft on each turn, held, and back to his place once the turns are off. */
export function man0At(t: number): Pt {
  const [x, y] = seat(0)
  let back = 0
  for (const c of COILS) back += 0.13 * smooth(t, c - 0.05, c + 0.3)
  back *= 1 - smooth(t, RELEASE + 0.4, HAUL[1])
  return [x - back, y]
}

/** His place, while bound. */
const heroAt = (t: number): Pt => {
  const s = strainAt(t)
  return [MAST_AT[0] + s, MAST_AT[1] - Math.abs(s) * 0.25]
}

const ROPE = '#B9A274'
const INK = '#2B2620'

export function drawBinding(g: Paint): void {
  const { ctx, t } = g
  const pose = shipPose(t)
  const W = (p: Pt): Pt => onShip(pose, p)
  const hero = heroAt(t)
  const slack = smooth(t, RELEASE + 0.2, RELEASE + 1.4)
  const gone = smooth(t, RELEASE + 0.9, RELEASE + 1.9)
  if (gone >= 1) return
  const a = 1 - gone
  // The block under the yard.
  const blk = W(BLOCK)
  circle(ctx, blk[0], blk[1], 0.085)
  fill(ctx, rgba('#6B5436', a))
  stroke(g, rgba(INK, a), 1.6)
  // The line: from man 0's hands up to the block, and down the mast to the turns. Taut while he hauls; slack after.
  const m0 = man0At(t)
  const hands = W([m0[0] + 0.1, m0[1] - 0.06])
  const top = W([MAST_X + 0.03, hero[1] - 0.09])
  const sag = 0.5 * slack
  const hauling = smooth(t, HAUL[0], COILS[0])
  if (hauling > 0) {
    ctx.beginPath()
    ctx.moveTo(hands[0], hands[1])
    ctx.quadraticCurveTo((hands[0] + blk[0]) / 2 - sag * 0.3, (hands[1] + blk[1]) / 2 + sag, blk[0], blk[1])
    ctx.quadraticCurveTo(blk[0] + 0.02 + sag * 0.2, (blk[1] + top[1]) / 2, top[0], top[1])
    stroke(g, rgba(INK, a * hauling), 3.2)
    stroke(g, rgba(ROPE, a * hauling), 1.6)
  }
  // The turns: each closes over him from the mast's side on its beat, and is cast off after the rocks.
  COILS.forEach((c, k) => {
    const close = smooth(t, c - 0.04, c + 0.22)
    if (close <= 0) return
    const off = smooth(t, RELEASE + 0.15 * (2 - k), RELEASE + 0.15 * (2 - k) + 0.6)
    const dy = [-0.085, 0.0, 0.085][k] + 0.16 * off
    const right: Pt = [MAST_X + 0.035, hero[1] + dy + 0.012]
    const left: Pt = [hero[0] - 0.125 * close, hero[1] + dy - 0.012]
    const A = W(left)
    const B = W(right)
    const alpha = a * (1 - off)
    if (alpha <= 0.01) return
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(A[0], A[1])
    ctx.lineTo(B[0], B[1])
    ctx.strokeStyle = rgba(INK, alpha)
    ctx.lineWidth = 0.036 + 2.4 / 108
    ctx.stroke()
    ctx.strokeStyle = rgba(ROPE, alpha)
    ctx.lineWidth = 0.036
    ctx.stroke()
  })
}
