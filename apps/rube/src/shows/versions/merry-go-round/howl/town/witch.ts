import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha, hash } from '../kit'
import { TOWN, WITCH } from '../worlds'

/**
 * The Witch of the Waste (the town builder's; only the curse draws her). Enormous: about 2.4 cells to the top of her
 * hat, 2 wide at the hem. A mountain of dark fur coat, a paler stole heaped round her shoulders, a small powdered face
 * with a little red mouth and heavy lids, a pearl choker lost in her chins, black hair under a wide hat with
 * plumes. She moves slowly and heavily: her mass lags and settles; her plumes sway.
 *
 * Drawn about the middle of her hem on the floor, facing left (toward Sophie) unless `face` says otherwise, in cells
 * times `k`; leaves p5 as it found it. Never round and ball-sized: her face is small, framed, and featured.
 */
export interface WitchPose {
  /** Show time: the plumes' sway, the fur's breath. */
  t: number
  /** -1 facing left (the default), 1 right; in between while she turns (her bulk narrows and widens again). */
  face?: number
  /** Lean about her hem, radians; negative leans her top toward where she faces. */
  lean?: number
  /** A heave of her whole mass (a laugh, a lurch): 0 still, 1 a full squash-and-rise. */
  heave?: number
  /** Squashed down and spread (squeezing through a door): 0 none, 1 as much as she can. */
  squash?: number
  /** 0 mouth shut, 1 wide (a laugh). */
  mouth?: number
  /** Her hand out from the fur toward where she faces: 0 in, 1 reaching. */
  hand?: number
  /** Where her eyes look: -1..1 each way, and down. */
  look?: Pt
  /** How lit she is (the lamp): a colour sinks toward the night by `dark`. */
  dark?: number
  light?: number
}

/** Her size: to the top of her hat, and across her hem. */
export const WITCH_TALL = 2.4
export const WITCH_WIDE = 2.0

export function drawWitch(p: p5, k: number, weight: number, ink: string, o: WitchPose): void {
  const L = o.light ?? 1
  if (L <= 0.01) return
  const X = (v: number) => v * k
  const dark = o.dark ?? 0
  const tone = (hex: string) => mixHex(hex, TOWN.night, dark)
  const t = o.t
  const sq = Math.max(0, Math.min(1, o.squash ?? 0))
  const heave = o.heave ?? 0
  // The squash spreads her and brings her down; a heave does both a little, and the fur breathes.
  const breath = 0.012 * Math.sin(t * 1.3)
  const sy = (1 - 0.14 * sq - 0.05 * heave) * (1 + breath)
  const sx = 1 + 0.12 * sq + 0.05 * heave
  p.push()
  // Drawn facing left in her own frame; `face` 1 turns her round.
  p.scale(-(o.face ?? -1), 1)
  p.rotate(-(o.lean ?? 0))
  p.scale(sx, sy)
  const fur = alpha(p, tone(WITCH.fur), L)
  const furLight = alpha(p, tone(WITCH.furLight), L)
  const inkA = alpha(p, ink, L)

  // The coat: a mountain of fur from a scalloped hem up to her shoulders; a hump of mass at her back.
  const wob = (i: number) => 0.015 * Math.sin(t * 1.7 + i * 1.9)
  const coat: Pt[] = [
    [-1.02, 0.12],
    [-1.0 + wob(1), -0.3],
    [-0.9 + wob(2), -0.7],
    [-0.84 + wob(3), -0.98],
    [-0.9, -1.2],
    [-0.84, -1.42],
    [-0.62, -1.6],
    [-0.36, -1.7],
    [0.34, -1.7],
    [0.62, -1.58],
    [0.82 + wob(4), -1.3],
    [0.86 + wob(5), -0.9],
    [0.96 + wob(6), -0.4],
    [0.98, 0.12],
  ]
  p.stroke(inkA)
  p.strokeWeight(weight * 0.9)
  p.fill(fur)
  p.beginShape()
  p.curveVertex(X(coat[0][0]), X(coat[0][1]))
  for (const [x, y] of coat) p.curveVertex(X(x), X(y))
  p.curveVertex(X(coat[coat.length - 1][0]), X(coat[coat.length - 1][1]))
  p.endShape(p.CLOSE)
  // The dress under the open coat: a darker plum panel from her bosom to the floor.
  p.stroke(alpha(p, ink, 0.6 * L))
  p.strokeWeight(weight * 0.6)
  p.fill(alpha(p, tone(mixHex(WITCH.fur, WITCH.lip, 0.28)), L))
  p.beginShape()
  p.vertex(X(-0.48), X(-1.25))
  p.bezierVertex(X(-0.62), X(-0.8), X(-0.66), X(-0.35), X(-0.74), X(0.1))
  p.vertex(X(-0.06), X(0.1))
  p.bezierVertex(X(-0.12), X(-0.4), X(-0.1), X(-0.9), X(-0.06), X(-1.28))
  p.endShape(p.CLOSE)
  // The lamp's warmth along her near side.
  p.noStroke()
  p.fill(alpha(p, tone(mixHex(WITCH.furLight, TOWN.gold, 0.35)), 0.4 * L))
  p.beginShape()
  p.vertex(X(-0.86), X(-1.35))
  p.bezierVertex(X(-0.95), X(-1.0), X(-0.84), X(-0.6), X(-0.98), X(0.05))
  p.bezierVertex(X(-0.9), X(-0.6), X(-0.8), X(-1.0), X(-0.86), X(-1.35))
  p.endShape(p.CLOSE)
  // The hem's fur, in soft scallops along the floor.
  p.noStroke()
  p.fill(furLight)
  for (let i = 0; i < 9; i++) {
    const x = -0.92 + (i * 1.84) / 8
    p.ellipse(X(x), X(0.07), X(0.26 + 0.05 * hash(i, 3)), X(0.13))
  }
  // The coat's fold down her front, and a sheen where the lamp catches the fur.
  p.stroke(alpha(p, ink, 0.45 * L))
  p.strokeWeight(weight * 0.55)
  p.noFill()
  p.bezier(X(-0.28), X(-1.5), X(-0.36), X(-1.0), X(-0.3), X(-0.5), X(-0.4), X(0.05))
  p.noStroke()
  p.fill(alpha(p, tone(mixHex(WITCH.furLight, WITCH.pearl, 0.25)), 0.35 * L))
  p.beginShape()
  p.vertex(X(0.55), X(-1.35))
  p.bezierVertex(X(0.8), X(-1.0), X(0.84), X(-0.5), X(0.8), X(-0.1))
  p.bezierVertex(X(0.72), X(-0.5), X(0.7), X(-1.0), X(0.55), X(-1.35))
  p.endShape(p.CLOSE)

  // Her hand, plump in a dark glove, out of the fur toward where she faces.
  const hand = Math.max(0, Math.min(1, o.hand ?? 0))
  if (hand > 0.01) {
    const hx = -0.55 - 0.55 * hand
    const hy = -0.95 + 0.25 * hand
    p.stroke(inkA)
    p.strokeWeight(weight * 0.8)
    p.fill(fur)
    p.beginShape()
    p.vertex(X(-0.45), X(-1.2))
    p.bezierVertex(X(-0.6), X(-1.15), X(hx + 0.2), X(hy - 0.18), X(hx + 0.06), X(hy - 0.08))
    p.bezierVertex(X(hx + 0.12), X(hy + 0.08), X(-0.4), X(-0.75), X(-0.45), X(-0.85))
    p.endShape(p.CLOSE)
    // The glove: a plump palm and three fingers spread toward her, the thumb up.
    p.fill(alpha(p, tone(mixHex(WITCH.fur, TOWN.night, 0.35)), L))
    p.beginShape()
    p.vertex(X(hx + 0.1), X(hy - 0.07))
    p.bezierVertex(X(hx + 0.02), X(hy - 0.1), X(hx - 0.06), X(hy - 0.11), X(hx - 0.2), X(hy - 0.1))
    p.bezierVertex(X(hx - 0.23), X(hy - 0.07), X(hx - 0.2), X(hy - 0.05), X(hx - 0.1), X(hy - 0.05))
    p.bezierVertex(X(hx - 0.22), X(hy - 0.03), X(hx - 0.23), X(hy + 0.01), X(hx - 0.1), X(hy + 0.0))
    p.bezierVertex(X(hx - 0.2), X(hy + 0.03), X(hx - 0.18), X(hy + 0.07), X(hx - 0.06), X(hy + 0.05))
    p.bezierVertex(X(hx - 0.02), X(hy + 0.08), X(hx + 0.06), X(hy + 0.07), X(hx + 0.1), X(hy + 0.03))
    p.endShape(p.CLOSE)
    p.line(X(hx - 0.02), X(hy - 0.09), X(hx - 0.07), X(hy - 0.17))
  }

  // The stole heaped round her shoulders: a paler fur in soft lumps.
  p.stroke(inkA)
  p.strokeWeight(weight * 0.8)
  p.fill(furLight)
  const stole: Pt[] = [
    [-0.9, -1.3],
    [-0.8, -1.58],
    [-0.56, -1.8],
    [-0.2, -1.9],
    [0.22, -1.88],
    [0.58, -1.74],
    [0.8, -1.46],
    [0.62, -1.3],
    [0.3, -1.4],
    [-0.1, -1.44],
    [-0.5, -1.36],
  ]
  p.beginShape()
  p.curveVertex(X(stole[stole.length - 1][0]), X(stole[stole.length - 1][1]))
  for (const [x, y] of stole) p.curveVertex(X(x + wob(Math.round(x * 10)) * 0.5), X(y))
  p.curveVertex(X(stole[0][0]), X(stole[0][1]))
  p.curveVertex(X(stole[1][0]), X(stole[1][1]))
  p.endShape(p.CLOSE)

  // The head, a size up so she reads across the shop: scaled about her neck.
  p.push()
  p.translate(X(0.04), X(-1.84))
  p.scale(1.3)
  p.translate(X(-0.04), X(1.84))
  // The face: small, powdered, on a stack of chins; heavy lids, a small red mouth, a blush.
  const fx = 0.06
  const fy = -2.0
  const face = alpha(p, tone(WITCH.face), L)
  p.stroke(inkA)
  p.strokeWeight(weight * 0.75)
  p.fill(face)
  // The chins, under the face, sinking into the stole.
  p.ellipse(X(fx + 0.02), X(fy + 0.19), X(0.36), X(0.13))
  p.beginShape()
  p.vertex(X(fx - 0.17), X(fy - 0.05))
  p.bezierVertex(X(fx - 0.19), X(fy - 0.2), X(fx - 0.1), X(fy - 0.26), X(fx + 0.03), X(fy - 0.26))
  p.bezierVertex(X(fx + 0.16), X(fy - 0.26), X(fx + 0.21), X(fy - 0.18), X(fx + 0.2), X(fy - 0.04))
  p.bezierVertex(X(fx + 0.2), X(fy + 0.1), X(fx + 0.12), X(fy + 0.17), X(fx + 0.02), X(fy + 0.17))
  p.bezierVertex(X(fx - 0.08), X(fy + 0.17), X(fx - 0.16), X(fy + 0.08), X(fx - 0.17), X(fy - 0.05))
  p.endShape(p.CLOSE)
  // The pearl choker, half lost in the chins: a pale band with its pearls' sheen.
  p.noStroke()
  p.fill(alpha(p, tone(WITCH.pearl), L))
  p.rect(X(fx - 0.15), X(fy + 0.21), X(0.34), X(0.05), X(0.02))
  p.fill(alpha(p, tone(mixHex(WITCH.pearl, WITCH.furLight, 0.45)), L))
  for (let i = 0; i < 6; i++) p.rect(X(fx - 0.13 + i * 0.056), X(fy + 0.215), X(0.012), X(0.04))
  // The blush.
  p.fill(alpha(p, TOWN.rose, 0.55 * L))
  p.ellipse(X(fx + 0.1), X(fy + 0.02), X(0.09), X(0.05))
  // The eyes: heavy lids half down, lashes, the pupils sliding to where she looks.
  const [lx, ly] = o.look ?? [0, 0.3]
  for (const ex of [fx - 0.09, fx + 0.05]) {
    p.fill(alpha(p, tone(WITCH.pearl), L))
    p.stroke(inkA)
    p.strokeWeight(weight * 0.45)
    p.arc(X(ex), X(fy - 0.08), X(0.075), X(0.05), 0, Math.PI, p.CHORD)
    p.noStroke()
    p.fill(inkA)
    p.circle(X(ex + 0.012 * lx), X(fy - 0.07 + 0.006 * ly), X(0.028))
    p.stroke(inkA)
    p.strokeWeight(weight * 0.7)
    p.line(X(ex - 0.045), X(fy - 0.08), X(ex + 0.045), X(fy - 0.08))
    p.strokeWeight(weight * 0.45)
    p.line(X(ex + 0.04), X(fy - 0.085), X(ex + 0.065), X(fy - 0.105))
  }
  // The mouth: a small red bow, opening round and dark when she laughs.
  const m = Math.max(0, Math.min(1, o.mouth ?? 0))
  p.noStroke()
  p.fill(alpha(p, tone(WITCH.lip), L))
  p.ellipse(X(fx - 0.03), X(fy + 0.08), X(0.085 + 0.02 * m), X(0.035 + 0.05 * m))
  if (m > 0.15) {
    p.fill(alpha(p, tone(mixHex(WITCH.lip, TOWN.night, 0.7)), L))
    p.ellipse(X(fx - 0.03), X(fy + 0.085), X(0.05 * m + 0.02), X(0.045 * m))
  }

  // Her hair, black and piled, and the hat: a wide dark brim tipped over her brow, a crown, and plumes that sway.
  p.stroke(inkA)
  p.strokeWeight(weight * 0.75)
  p.fill(alpha(p, tone(TOWN.blob), L))
  p.ellipse(X(fx + 0.12), X(fy - 0.2), X(0.22), X(0.18))
  p.push()
  p.translate(X(fx + 0.02), X(fy - 0.27))
  p.rotate(-0.12)
  p.fill(fur)
  p.beginShape()
  p.vertex(X(-0.46), X(0.05))
  p.bezierVertex(X(-0.4), X(-0.02), X(-0.2), X(-0.05), X(0), X(-0.05))
  p.bezierVertex(X(0.2), X(-0.05), X(0.42), X(-0.02), X(0.48), X(0.06))
  p.bezierVertex(X(0.3), X(0.1), X(-0.3), X(0.1), X(-0.46), X(0.05))
  p.endShape(p.CLOSE)
  p.rect(X(-0.18), X(-0.24), X(0.36), X(0.2), X(0.05), X(0.05), X(0.01), X(0.01))
  p.noStroke()
  p.fill(alpha(p, tone(WITCH.lip), L))
  p.rect(X(-0.18), X(-0.09), X(0.36), X(0.045))
  // The plumes: three long soft feathers from the band, curling back, each on its own sway.
  for (let i = 0; i < 3; i++) {
    const sway = 0.12 * Math.sin(t * (1.2 + 0.3 * i) + i * 2) + 0.2 * heave * Math.sin(t * 9 + i)
    const base: Pt = [-0.05 + i * 0.08, -0.2]
    const tip: Pt = [0.6 + i * 0.12 + sway * 0.4, -0.5 + i * 0.1 + sway * 0.3]
    const col = i === 1 ? WITCH.pearl : mixHex(WITCH.furLight, WITCH.pearl, 0.4)
    p.stroke(inkA)
    p.strokeWeight(weight * 0.5)
    p.fill(alpha(p, tone(col), L))
    p.beginShape()
    p.vertex(X(base[0]), X(base[1]))
    p.bezierVertex(X(base[0] + 0.05), X(base[1] - 0.3), X(tip[0] - 0.3), X(tip[1] - 0.2), X(tip[0]), X(tip[1]))
    p.bezierVertex(X(tip[0] - 0.1), X(tip[1] + 0.12), X(base[0] + 0.15), X(base[1] - 0.05), X(base[0] - 0.06), X(base[1]))
    p.endShape(p.CLOSE)
    // Its barbs: short soft strokes curling off the underside, stirring as it sways.
    p.stroke(alpha(p, tone(col), 0.9 * L))
    p.strokeWeight(weight * 0.5)
    for (let j = 1; j < 6; j++) {
      const u = j / 6
      const bx = base[0] + (tip[0] - base[0]) * u
      const by = base[1] - 0.2 * Math.sin(Math.PI * u) + (tip[1] - base[1]) * u
      p.line(X(bx), X(by + 0.02), X(bx + 0.05 + 0.02 * Math.sin(t * 3 + j + i)), X(by + 0.1 + 0.02 * u))
    }
  }
  p.pop()
  p.pop()
  p.pop()
}
