import type p5 from 'p5'
import { solid } from '../../../../../../../../src/core/draw'
import { mixHex } from '../../../../../parts'
import type { Engine } from './kit'
import { PIZZ, PLUCKS, SNARE, STROKES, lastIndex } from '../music'
import { BRASS, GOLD, INK, IRON, clamp, deep, easeOut, pale, smooth } from '../look'

/**
 * Storey 1, the bassoon's and the E-flat clarinet's: two concertina bellows lying either side of the mast, breathing
 * the plucked strings' boom, ba, ba.
 *
 * A rocking beam lies across the mast on a pivot, and a cam on the mast's drive chain rocks it: the cam goes round
 * once every two bars, a step a stroke, and carries the strings' figure on its rim as lobes (big ones for the low
 * note on each downbeat, small ones for the other two beats), each coming to the top on its pluck under the beam's
 * forked tappet. On the low pluck the beam tips hard to the left; on the other two it tips back, lighter, to the
 * right; each tip is quick and its recovery long and damped. Each end of the beam draws down, by a short link, the
 * arm of an inner end board hinged at its top, so the board swings out at its foot and squeezes its bellows against
 * the outer board (fixed to the hanger), and a leather flap on the outer board lifts as the bellows breathes out.
 *
 * Before it is let in, a pin through the beam holds it up and level, clear of the cam; as it is let in the pin draws
 * up, the beam drops onto the cam (the bellows sigh once as it settles) and starts to rock. It rocks harder as the
 * orchestra grows.
 */

/** The beam: its half-length and how far its pivot drops onto the cam when let in. */
const LB = 0.42
const DROP = 0.025
/** An inner board: its hinge (over its top), its length, and its arm in toward the mast. */
const HINGE_X = 0.62
const BOARD = 0.33
const ARM = 0.2
/** The outer board, on the hanger. */
const OUTER = 1.316
/** The link from the beam's end down to the board's arm. */
const LINK = 0.11
/** Pleats in each bellows. */
const PLEATS = 6
/** The cam: its rim, and its lobes' heights for the low pluck and the others. */
const CAM = 0.105
const LOBE_LOW = 0.042
const LOBE = 0.024

const ease = (u: number): number => {
  const v = clamp(u)
  return v * v * (3 - 2 * v)
}

/** Where on the cam each pluck's lobe is: the stroke of the drum's two bars it falls on. */
const LOBES: { i: number; big: boolean }[] = PIZZ.map(([q, who]) => ({ i: SNARE.findIndex((s) => Math.abs(s - q) < 1e-6), big: who === 'low' }))
const PLUCK_T = PLUCKS.map((p) => p.t)

/** The cam's turn, radians: a step a stroke, like the chain, once every two bars (so each pluck's lobe is at the top on its pluck). */
function camTurn(t: number): number {
  const n = lastIndex(STROKES, t)
  if (n < 0) return 0
  return ((n + ease((t - STROKES[n]) / 0.07)) * 2 * Math.PI) / SNARE.length
}

/** A pluck's push on the beam: quick onto it, and a long damped return with a little swing through. */
const kernel = (ago: number): number => (ago <= 0 ? 0 : (1 - Math.exp(-ago / 0.035)) * Math.exp(-ago / 0.42) * Math.cos((2 * Math.PI * ago) / 2.6))
/** A pluck's breath through the valve it opens: lifts at once, falls back slowly. */
const breath = (ago: number): number => (ago <= 0 ? 0 : (1 - Math.exp(-ago / 0.03)) * Math.exp(-ago / 0.32))

/** The beam's tilt (radians, positive the right end down) and each valve's lift (0 to about 1), from the plucks since `from`. */
function rock(t: number, from: number, size: number): { tilt: number; left: number; right: number } {
  let tilt = 0
  let left = 0
  let right = 0
  if (t <= from) return { tilt, left, right }
  const n = lastIndex(PLUCK_T, t)
  for (let j = n; j >= 0 && j > n - 8; j--) {
    const at = PLUCK_T[j]
    if (at < from) break
    const ago = t - at
    const low = PLUCKS[j].who === 'low'
    tilt += (low ? -1 : 0.5) * size * kernel(ago)
    if (low) left += breath(ago)
    else right += 0.6 * breath(ago)
  }
  return { tilt, left, right }
}

/** Where the arm's end is when the beam's end is at `tip` (local, right-hand coordinates): the link's two circles met below. */
function armEnd(tip: [number, number], hinge: [number, number]): [number, number] {
  const dx = tip[0] - hinge[0]
  const dy = tip[1] - hinge[1]
  const d = Math.max(Math.abs(ARM - LINK) + 1e-4, Math.min(ARM + LINK - 1e-4, Math.hypot(dx, dy)))
  const ux = dx / Math.hypot(dx, dy)
  const uy = dy / Math.hypot(dx, dy)
  const a = (d * d + ARM * ARM - LINK * LINK) / (2 * d)
  const h = Math.sqrt(Math.max(0, ARM * ARM - a * a))
  const px = hinge[0] + a * ux
  const py = hinge[1] + a * uy
  const c1: [number, number] = [px - h * uy, py + h * ux]
  const c2: [number, number] = [px + h * uy, py - h * ux]
  return c1[1] > c2[1] ? c1 : c2
}

/** A bar with rounded ends: an ink edge round a flat fill. */
function bar(p: p5, k: number, edge: number, x1: number, y1: number, x2: number, y2: number, w: number, fill: string): void {
  p.noFill()
  p.stroke(INK)
  p.strokeWeight(w * k + 2 * edge)
  p.line(x1 * k, y1 * k, x2 * k, y2 * k)
  p.stroke(fill)
  p.strokeWeight(w * k)
  p.line(x1 * k, y1 * k, x2 * k, y2 * k)
}

interface Colours {
  leather: string
  fold: string
  brass: string
  steel: string
  flap: string
}

/**
 * One bellows and its board, in right-hand coordinates (the left one is drawn mirrored): `tip` is the beam's end,
 * `top` the bellows' top line, `lift` the valve's.
 */
function side(p: p5, k: number, weight: number, tip: [number, number], top: number, lift: number, ceiling: number, col: Colours): void {
  const fine = weight * 0.45
  const hinge: [number, number] = [HINGE_X, top]
  const arm = armEnd(tip, hinge)
  const s = (hinge[1] - arm[1]) / ARM
  const cs = (hinge[0] - arm[0]) / ARM
  // The board's foot, swung out as the arm is drawn down.
  const foot: [number, number] = [hinge[0] - BOARD * s, hinge[1] + BOARD * cs]

  // The hinge's hanger, from the ceiling.
  solid(p, INK, fine, col.steel)
  p.quad((HINGE_X - 0.03) * k, (ceiling - 0.06) * k, (HINGE_X + 0.03) * k, (ceiling - 0.06) * k, (HINGE_X + 0.01) * k, top * k, (HINGE_X - 0.01) * k, top * k)

  // The bellows: pleats fanned between the swinging inner board and the fixed outer one. Each fold's leather is a
  // fixed length, so a pleat squeezed narrow stands out deeper.
  const inner = (u: number): [number, number] => [hinge[0] + (foot[0] - hinge[0]) * u + 0.03, hinge[1] + (foot[1] - hinge[1]) * u]
  const outer = (u: number): [number, number] => [OUTER - 0.028, top + BOARD * u]
  const inset = 0.035
  const edge = (u: number, i: number): [number, number] => {
    const a = inner(u)
    const b = outer(u)
    return [a[0] + ((b[0] - a[0]) * i) / PLEATS, a[1] + ((b[1] - a[1]) * i) / PLEATS]
  }
  const rest = (OUTER - HINGE_X - 0.058) / PLEATS / 2
  const leaf = Math.hypot(rest, 0.018)
  const depth = (w: number): number => Math.sqrt(Math.max(0, leaf * leaf - (w / 2) ** 2))
  const topW = (edge(0, 1)[0] - edge(0, 0)[0])
  const botW = Math.hypot(edge(1, 1)[0] - edge(1, 0)[0], edge(1, 1)[1] - edge(1, 0)[1])
  const dTop = depth(topW)
  const dBot = depth(botW)
  // Each pleat is two leaves: out to a fold standing proud of the boards' line, and back in.
  const folds: { t: [number, number]; b: [number, number] }[] = []
  for (let i = 0; i <= 2 * PLEATS; i++) {
    const f = i / 2
    const a = edge(0, f)
    const b = edge(1, f)
    const proud = i % 2 === 1
    folds.push({ t: [a[0], a[1] + inset - (proud ? dTop + inset : 0)], b: [b[0], b[1] - inset + (proud ? dBot + inset : 0)] })
  }
  for (let i = 0; i < folds.length - 1; i++) {
    solid(p, INK, fine, i % 2 === 0 ? col.leather : col.fold)
    const a = folds[i]
    const b = folds[i + 1]
    p.quad(a.t[0] * k, a.t[1] * k, b.t[0] * k, b.t[1] * k, b.b[0] * k, b.b[1] * k, a.b[0] * k, a.b[1] * k)
  }

  // The outer board, bolted to the hanger, and its valve: a leather flap on the outside, hinged at its top.
  bar(p, k, fine, OUTER, top - 0.01, OUTER, top + BOARD + 0.01, 0.05, col.brass)
  const vy = top + BOARD / 2 - 0.075
  const va = -1.05 * clamp(lift)
  bar(p, k, fine, OUTER + 0.04, vy, OUTER + 0.04 - Math.sin(va) * 0.13, vy + Math.cos(va) * 0.13, 0.024, col.flap)
  solid(p, INK, fine, col.brass)
  p.circle((OUTER + 0.04) * k, vy * k, 0.026 * k)

  // The inner board and its arm, one piece on the hinge; the link up to the beam's end.
  bar(p, k, fine, hinge[0], hinge[1], foot[0], foot[1], 0.05, col.brass)
  bar(p, k, fine, hinge[0], hinge[1], arm[0], arm[1], 0.03, col.steel)
  bar(p, k, fine, arm[0], arm[1], tip[0], tip[1], 0.022, col.steel)
  solid(p, INK, fine, col.brass)
  p.circle(hinge[0] * k, hinge[1] * k, 0.034 * k)
  p.circle(arm[0] * k, arm[1] * k, 0.024 * k)
}

export const bellows: Engine = (p, c, _st, t, e) => {
  const grow = easeOut(smooth(e.open, 0.75, 1))
  if (grow <= 0) return
  const { k, weight } = c
  const fine = weight * 0.45
  const tint = (hex: string): string => (e.gold > 0 ? mixHex(hex, GOLD, 0.5 * e.gold) : hex)
  const { y0, y1 } = e.box
  const mid = (y0 + y1) / 2
  const at = t - e.since
  const top = y0 + 0.2 + LINK

  // Held and level until let in; then the pin draws up, the beam drops onto the cam, and the plucks rock it.
  const pinUp = smooth(e.on, 0, 0.5)
  const dropped = ease(smooth(e.on, 0.35, 1))
  const yP = y0 + 0.2 - DROP * (1 - dropped)
  const size = 0.1 + 0.11 * e.amp
  const r = rock(t, at + 0.35, size)
  const tilt = r.tilt * e.on
  // As the beam settles onto the cam both bellows are squeezed a little, and both valves sigh once.
  const sigh = 0.45 * Math.sin(Math.PI * dropped)

  const col: Colours = {
    leather: tint(e.color),
    fold: tint(deep(e.color, 0.2)),
    brass: tint(deep(BRASS, 0.12)),
    steel: tint(pale(IRON, 0.4)),
    flap: tint(deep(e.color, 0.55)),
  }
  const wood = tint(deep(e.color, 0.32))

  p.push()
  p.translate(0, mid * k)
  p.scale(grow)
  p.translate(0, -mid * k)

  // The cam on the mast, on the chain: the strings' figure round its rim.
  const turn = camTurn(t)
  const cy = y0 + 0.2 + DROP + 0.135 + CAM
  solid(p, INK, fine, tint(BRASS))
  p.beginShape()
  const N = 96
  for (let i = 0; i < N; i++) {
    const a = (i / N) * 2 * Math.PI
    let rr = CAM
    for (const lobe of LOBES) {
      const at0 = -Math.PI / 2 - (lobe.i * 2 * Math.PI) / SNARE.length
      let d = a - (at0 + turn)
      d = Math.atan2(Math.sin(d), Math.cos(d))
      const w = lobe.big ? 0.2 : 0.15
      if (Math.abs(d) < w) rr += (lobe.big ? LOBE_LOW : LOBE) * 0.5 * (1 + Math.cos((Math.PI * d) / w))
    }
    p.vertex(Math.cos(a) * rr * k, (cy + Math.sin(a) * rr) * k)
  }
  p.endShape(p.CLOSE)
  solid(p, INK, fine, tint(pale(BRASS, 0.3)))
  p.circle(0, cy * k, 0.045 * k)

  // Each side: the right as it is, the left mirrored, its beam end the other way.
  for (const s of [1, -1]) {
    const a = s * tilt
    const tip: [number, number] = [LB * Math.cos(a), yP + LB * Math.sin(a)]
    p.push()
    p.scale(s, 1)
    side(p, k, weight, tip, top, (s > 0 ? r.right : r.left) * e.on + sigh, y0, col)
    p.pop()
  }

  // The beam across the mast, its forked tappet over the cam, and its pivot.
  p.push()
  p.translate(0, yP * k)
  p.rotate(tilt)
  for (const x of [-0.06, 0.06]) bar(p, k, fine, x * 0.5, 0, x, DROP + 0.12, 0.024, col.steel)
  bar(p, k, fine, -LB - 0.03, 0, LB + 0.03, 0, 0.05, wood)
  solid(p, INK, fine, col.brass)
  for (const x of [-LB, LB]) p.circle(x * k, 0, 0.024 * k)
  p.pop()
  solid(p, INK, fine, tint(pale(BRASS, 0.3)))
  p.circle(0, yP * k, 0.055 * k)

  // The pin: down through the beam, holding it, until it is let in; then drawn up into its bracket.
  const px = 0.26
  const pinBottom = yP + 0.04 - 0.2 * pinUp
  solid(p, INK, fine, col.steel)
  p.rectMode(p.CORNERS)
  p.rect((px - 0.035) * k, (y0 - 0.06) * k, (px + 0.035) * k, (y0 + 0.01) * k, 0.01 * k)
  bar(p, k, fine, px, y0 - 0.02, px, pinBottom, 0.018, col.brass)

  p.pop()
}
