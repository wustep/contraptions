import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { mixHex } from '../../../../../parts'
import type { Engine } from './kit'
import { BAR, pluck, swell } from '../music'
import { chainRun } from '../mast'
import { R } from '../plan'
import { BRASS, GOLD, INK, IRON, clamp, easeOut, pale, deep, smooth } from '../look'

/**
 * The horn, the celesta and the two piccolos: one tune in parallel voices, a twelfth and a seventeenth apart. Here
 * they are a pendulum wave: twelve pendulums hung in a row from a beam under the ceiling, graded in length, each
 * making a whole number of swings in a statement (25 to 36 in 45 s). So they all swing together at the start of
 * every statement, drift apart through waves, and come back into line for the next.
 *
 * Until the engine is let in they hang still, held over to the right by a comb. The comb folds up out of the way on
 * its links and they fall away together. A pin wheel on the mast's chain keeps them going: two pins on it come round
 * to the top on the downbeats (the plucked strings' low note) and knock a pallet on the beam, which gives the whole
 * row a nudge.
 */

const N = 12
/** Swings per statement of the slowest (longest) pendulum; each one along makes one more. */
const N0 = 25
const PERIOD = 18 * BAR
/** Slots from the mast out: the row's innermost pivot, and the spacing. */
const INNER = 0.72
const SPACING = 0.765
/** The comb's links (how far it hangs under the beam) and its reach either side. */
const COMB_LINK = 0.24
/** The mast chain's link (`mast.ts`): the pin wheel has eight teeth on it, so it turns once in the drum's two bars. */
const LINK = 0.14
const RW = (8 * LINK) / (2 * Math.PI)
/** Where each pin starts: at the top after the step of stroke 0 (the odd bar's downbeat) and stroke 10 (the even's). */
const PINS = [-Math.PI / 2 - (2 * Math.PI) / 24, -Math.PI / 2 - (2 * Math.PI * 11) / 24]

/** Pendulum i's pivot x: the longest at the right end, shorter toward the mast, and on shorter out to the left. */
const slotX = (i: number): number => (i < N / 2 ? INNER + SPACING * (N / 2 - 1 - i) : -(INNER + SPACING * (i - N / 2)))
/** Its length against the longest: as the square of its period. */
const ratio = (i: number): number => (N0 / (N0 + i)) ** 2

/** How far the bobs swing either way, cells: more as the orchestra grows. */
const reachOf = (amp: number): number => 0.25 * (0.55 + 0.45 * clamp((amp - 0.5) / 0.45))

/** The nudge on the beam: in with the pin's step, then back, damped. */
function kick(ago: number): number {
  if (!Number.isFinite(ago) || ago < 0) return 0
  if (ago < 0.07) {
    const u = ago / 0.07
    return u * u * (3 - 2 * u)
  }
  const s = ago - 0.07
  return Math.exp(-s / 0.2) * Math.cos(2 * Math.PI * 1.1 * s)
}

/** A flat bob, a lens seen edge-on. */
function bob(p: p5, w: number, h: number): void {
  p.beginShape()
  p.vertex(-w / 2, 0)
  p.quadraticVertex(0, -h, w / 2, 0)
  p.quadraticVertex(0, h, -w / 2, 0)
  p.endShape(p.CLOSE)
}

export const pendulums: Engine = (p, c, st, t, e) => {
  if (e.open < 0.75) return
  const { k, weight } = c
  const u = smooth(e.open, 0.75, 1)
  const at = t - e.since
  const tint = (hex: string): string => (e.gold > 0 ? mixHex(hex, GOLD, 0.5 * e.gold) : hex)
  const { y0 } = e.box

  // The frame: the ceiling, the beam hung under it, the pivot line on the beam's face.
  const ceil = y0 - 0.04
  const beamTop = y0 + 0.1
  const beamBot = y0 + 0.2
  const pivotY = y0 + 0.15
  const half = 4.95
  const reach = 0.3 + (half - 0.3) * easeOut(smooth(u, 0, 0.6))

  // The longest pendulum as long as the room over the upper rail allows (it falls to the right, so there is more there).
  const railY = (x: number): number => st.upper.left + ((x - st.xa) / (st.xb - st.xa)) * (st.upper.right - st.upper.left) - R - 0.1
  let lmax = 0.95
  for (let i = 0; i < N; i++) lmax = Math.min(lmax, (railY(slotX(i)) - pivotY - 0.06) / ratio(i))

  // The nudge: the downbeat's pin knocks the pallet over, once the pallet is down.
  const ago = t < 846 ? pluck(t, 'low') : Infinity
  const gate = smooth(e.since - ago, 0, 1)
  const dx = 0.06 * gate * kick(ago)

  // How far they swing, held until let in, and settling after the last chord.
  const fade = t < 845 ? 1 : Math.exp(-(t - 845) / 1.6)
  const hold = reachOf(swell(at))
  const D = reachOf(e.amp) * fade
  const theta = (i: number): number => {
    const L = lmax * ratio(i)
    if (e.since <= 0) return Math.asin(Math.min(0.9, hold / L))
    return Math.asin(Math.min(0.9, D / L)) * Math.cos((2 * Math.PI * (N0 + i) * e.since) / PERIOD)
  }

  // The beam's hangers from the ceiling: short links, leaning with the nudge.
  for (const x of [-4.8, -2.63, 2.63, 4.8]) {
    if (Math.abs(x) > reach) continue
    outline(p, INK, weight * 0.9)
    p.line(x * k, ceil * k, (x + dx) * k, beamTop * k)
    solid(p, INK, weight * 0.5, pale(IRON, 0.4))
    p.circle(x * k, (ceil + 0.02) * k, 0.04 * k)
  }

  // The pin wheel on the mast's chain: it turns with the chain, a tooth a link, and carries the downbeats' two pins.
  const WX = 0.045 + RW - 0.035
  const WY = y0 + 0.48
  const turn = chainRun(t) / RW
  p.push()
  p.translate(WX * k, WY * k)
  solid(p, INK, weight * 0.8, tint(pale(BRASS, 0.3)))
  p.circle(0, 0, (RW - 0.02) * 2 * k)
  p.rotate(turn)
  outline(p, INK, weight * 0.8)
  for (let j = 0; j < 8; j++) {
    const a = (j * Math.PI) / 4 + Math.PI / 8
    p.line(Math.cos(a) * (RW - 0.02) * k, Math.sin(a) * (RW - 0.02) * k, Math.cos(a) * (RW + 0.03) * k, Math.sin(a) * (RW + 0.03) * k)
  }
  outline(p, INK, weight * 0.6)
  for (let j = 0; j < 4; j++) {
    const a = (j * Math.PI) / 2
    p.line(Math.cos(a) * 0.04 * k, Math.sin(a) * 0.04 * k, Math.cos(a) * (RW - 0.04) * k, Math.sin(a) * (RW - 0.04) * k)
  }
  for (const a of PINS) {
    outline(p, INK, weight * 0.9)
    p.line(Math.cos(a) * (RW - 0.06) * k, Math.sin(a) * (RW - 0.06) * k, Math.cos(a) * (RW + 0.04) * k, Math.sin(a) * (RW + 0.04) * k)
    solid(p, INK, weight * 0.6, IRON)
    p.circle(Math.cos(a) * (RW - 0.06) * k, Math.sin(a) * (RW - 0.06) * k, 0.03 * k)
    p.circle(Math.cos(a) * (RW + 0.05) * k, Math.sin(a) * (RW + 0.05) * k, 0.032 * k)
  }
  p.pop()
  solid(p, INK, weight * 0.8, tint(BRASS))
  p.circle(WX * k, WY * k, 0.06 * k)

  // The comb: two halves on links under the beam, folding up out of the way as the engine is let in.
  const fold = (Math.PI / 2) * e.on
  const cdx = -COMB_LINK * Math.sin(fold) + dx
  const cdy = -COMB_LINK * (1 - Math.cos(fold))
  const combTop = beamBot + COMB_LINK + cdy
  const toothDepth = beamBot + COMB_LINK + 0.08 - pivotY
  const combFill = tint(deep(e.color, 0.25))
  for (const side of [-1, 1]) {
    const a = side > 0 ? 0.66 : -4.66
    const b = side > 0 ? 4.9 : -0.66
    const lo = Math.max(a, -reach)
    const hi = Math.min(b, reach)
    if (hi <= lo) continue
    outline(p, INK, weight * 0.7)
    for (const lx of side > 0 ? [1.1, 3.4] : [-1.1, -3.4]) {
      if (Math.abs(lx) > reach) continue
      p.line((lx + dx) * k, beamBot * k, (lx + cdx) * k, combTop * k)
    }
    // The bar and its teeth in one outline: a tooth to the left of each rod, where the rod leans on it.
    const teeth: number[] = []
    for (let i = N - 1; i >= 0; i--) {
      const x = slotX(i)
      if ((side > 0) !== (x > 0) || Math.abs(x) > reach) continue
      const lean = Math.tan(Math.asin(Math.min(0.9, hold / (lmax * ratio(i)))))
      teeth.push(x + toothDepth * lean - 0.028)
    }
    const yb = combTop + 0.045
    solid(p, INK, weight * 0.8, combFill)
    p.beginShape()
    p.vertex((lo + cdx) * k, combTop * k)
    p.vertex((hi + cdx) * k, combTop * k)
    p.vertex((hi + cdx) * k, yb * k)
    for (const tx of teeth.sort((m, n) => n - m)) {
      p.vertex((tx + 0.016 + cdx) * k, yb * k)
      p.vertex((tx + 0.012 + cdx) * k, (yb + 0.06) * k)
      p.vertex((tx - 0.012 + cdx) * k, (yb + 0.06) * k)
      p.vertex((tx - 0.016 + cdx) * k, yb * k)
    }
    p.vertex((lo + cdx) * k, yb * k)
    p.endShape(p.CLOSE)
  }

  // The pendulums: a rod and a flat bob each, swinging in the picture's plane.
  const bobFill = tint(BRASS)
  for (let i = 0; i < N; i++) {
    const x = slotX(i)
    if (Math.abs(x) > reach - 0.05) continue
    // Unfolding: each hangs folded out along the beam until the beam has reached it, then swings down onto the comb.
    const v = easeOut(smooth(u, 0.2 + (0.4 * Math.abs(x)) / half, 0.45 + (0.4 * Math.abs(x)) / half))
    const th = 1.25 + (theta(i) - 1.25) * v
    const L = lmax * ratio(i)
    const px = x + dx
    const bx = px + Math.sin(th) * L
    const by = pivotY + Math.cos(th) * L
    outline(p, INK, weight * 0.7)
    p.line(px * k, pivotY * k, bx * k, by * k)
    p.push()
    p.translate(bx * k, by * k)
    p.rotate(-th)
    solid(p, INK, weight * 0.8, bobFill)
    bob(p, 0.26 * k, 0.095 * k)
    p.pop()
  }

  // The beam over the rods' tops, the pivots on it, and the pallet under it that the pins knock.
  solid(p, INK, weight, tint(e.color))
  p.rectMode(p.CORNERS)
  p.rect((-reach + dx) * k, beamTop * k, (reach + dx) * k, beamBot * k, 0.02 * k)
  solid(p, INK, weight * 0.5, tint(BRASS))
  for (let i = 0; i < N; i++) {
    const x = slotX(i)
    if (Math.abs(x) > reach - 0.05) continue
    p.circle((x + dx) * k, pivotY * k, 0.05 * k)
  }
  const palX = WX - 0.03 + dx
  p.push()
  p.translate(palX * k, beamBot * k)
  p.rotate((Math.PI / 2) * (1 - e.on))
  solid(p, INK, weight * 0.7, pale(IRON, 0.3))
  p.quad(-0.02 * k, -0.01 * k, 0.02 * k, -0.01 * k, 0.0175 * k, 0.06 * k, -0.0175 * k, 0.06 * k)
  p.pop()
  solid(p, INK, weight * 0.5, tint(BRASS))
  p.circle(palX * k, beamBot * k, 0.028 * k)
}
