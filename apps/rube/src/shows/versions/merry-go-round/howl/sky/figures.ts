import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { alpha, hash } from '../kit'
import { TOWN } from '../worlds'

/**
 * The sky builder's people (canonical for this show: the soldiers and the Witch's blob men are drawn only here; the
 * town builder's Witch keeps their look): a soldier of the king's army, tall and stiff in a blue coat and a shako;
 * a blob man, a tall black rubbery figure in a straw boater; and a pigeon. Each draws about its feet (the pigeon
 * about its middle) at the origin the caller has translated to, in cells times `k`, and leaves p5 as it found it.
 * None of them is round and ball-sized: faces are small and under hats, bodies are tall.
 */

const SKIN = mixHex(TOWN.plaster, TOWN.rose, 0.55)
const SHAKO = mixHex(TOWN.blob, TOWN.soldier, 0.25)

export interface SoldierPose {
  /** 1 facing right, -1 left. */
  face: 1 | -1
  /** Radians about the feet; positive leans the head toward where he faces. */
  lean?: number
  /** How far apart the legs are (radians each side of straight); signs swap which leg is forward. */
  stride?: number
  /** One leg crossed over the other, lounging (0..1). */
  cross?: number
  /** The near arm raised toward where he faces (0 down, 1 straight out). */
  arm?: number
  /** Stiff as a board (Howl's spell): arms clamped to the sides. */
  stiff?: number
  /** A pipe in his mouth. */
  pipe?: boolean
  /** 0..1: fading into the dark of a doorway. */
  light?: number
  /** Scale (1 is 1.36 cells tall). */
  scale?: number
  /** Toward night (the set's tone). */
  dark?: number
}

/**
 * A soldier: black boots, dark trousers, the blue coat to the knee with a white belt and cross-belt, a small face
 * with a moustache, and the tall shako with its peak and a red plume. About 1.36 cells tall.
 */
export function drawSoldier(p: p5, k: number, weight: number, ink: string, o: SoldierPose): void {
  const L = o.light ?? 1
  if (L <= 0.01) return
  const s = (o.scale ?? 1) * k
  const tone = (hex: string) => alpha(p, mixHex(hex, TOWN.night, (o.dark ?? 0) * 0.55), L)
  const inkA = alpha(p, ink, L)
  const stride = o.stride ?? 0
  const cross = o.cross ?? 0
  const stiff = o.stiff ?? 0
  p.push()
  p.scale(o.face, 1)
  p.rotate((o.lean ?? 0))
  p.stroke(inkA)
  p.strokeWeight(weight * 0.7)
  const hipY = -0.62
  // Legs: stiff straight trousers from the hip, a boot at each foot.
  const leg = (ang: number, dx: number) => {
    p.push()
    p.translate(dx * s, hipY * s)
    p.rotate(ang)
    p.fill(tone(TOWN.slateDark))
    p.beginShape()
    p.vertex(-0.05 * s, 0)
    p.vertex(0.05 * s, 0)
    p.vertex(0.045 * s, 0.55 * s)
    p.vertex(-0.045 * s, 0.55 * s)
    p.endShape(p.CLOSE)
    p.fill(tone(TOWN.blob))
    p.beginShape()
    p.vertex(-0.05 * s, 0.52 * s)
    p.vertex(0.05 * s, 0.52 * s)
    p.vertex(0.12 * s, 0.6 * s)
    p.vertex(0.12 * s, 0.63 * s)
    p.vertex(-0.055 * s, 0.63 * s)
    p.endShape(p.CLOSE)
    p.pop()
  }
  leg(-stride + cross * 0.32, -0.04)
  leg(stride - cross * 0.1, 0.04)
  // The coat: shoulders to below the knee, flaring a little; a white belt and a cross-belt.
  p.fill(tone(TOWN.soldier))
  p.beginShape()
  p.vertex(-0.13 * s, -1.06 * s)
  p.vertex(0.14 * s, -1.06 * s)
  p.vertex(0.17 * s, -0.66 * s)
  p.vertex(0.2 * s, -0.4 * s)
  p.vertex(-0.19 * s, -0.4 * s)
  p.vertex(-0.16 * s, -0.66 * s)
  p.endShape(p.CLOSE)
  p.noStroke()
  p.fill(tone(TOWN.plaster))
  p.quad(-0.165 * s, -0.66 * s, 0.17 * s, -0.66 * s, 0.172 * s, -0.61 * s, -0.168 * s, -0.61 * s)
  p.quad(-0.11 * s, -1.04 * s, -0.06 * s, -1.05 * s, 0.15 * s, -0.68 * s, 0.1 * s, -0.66 * s)
  // Collar and a row of brass, small.
  p.fill(tone(TOWN.gold))
  for (const y of [-0.95, -0.85, -0.75]) p.circle(0.1 * s, y * s, 0.028 * s)
  // The near arm: a sleeve from the shoulder, down at his side, raised as a bar across her way, or clamped stiff.
  const armUp = (o.arm ?? 0) * (1 - stiff)
  p.push()
  p.translate(0.02 * s, -1.0 * s)
  p.rotate(-armUp * 1.45 + (1 - stiff) * 0.08 - stiff * 0.02)
  p.stroke(inkA)
  p.strokeWeight(weight * 0.7)
  p.fill(tone(mixHex(TOWN.soldier, TOWN.blob, 0.12)))
  p.beginShape()
  p.vertex(-0.05 * s, 0)
  p.vertex(0.055 * s, 0)
  p.vertex(0.045 * s, 0.42 * s)
  p.vertex(-0.04 * s, 0.42 * s)
  p.endShape(p.CLOSE)
  p.fill(tone(SKIN))
  p.ellipse(0, 0.46 * s, 0.075 * s, 0.085 * s)
  p.pop()
  // The head: a small face, a moustache, the ear; the shako over it with its peak and plume.
  p.stroke(inkA)
  p.strokeWeight(weight * 0.6)
  p.fill(tone(SKIN))
  p.ellipse(0.015 * s, -1.14 * s, 0.13 * s, 0.16 * s)
  p.noStroke()
  p.fill(tone(TOWN.timberDark))
  p.beginShape()
  p.vertex(0.03 * s, -1.1 * s)
  p.vertex(0.1 * s, -1.105 * s)
  p.vertex(0.09 * s, -1.08 * s)
  p.vertex(0.03 * s, -1.085 * s)
  p.endShape(p.CLOSE)
  p.fill(alpha(p, ink, L))
  p.circle(0.05 * s, -1.16 * s, 0.022 * s)
  p.stroke(inkA)
  p.strokeWeight(weight * 0.7)
  p.fill(tone(SHAKO))
  p.beginShape()
  p.vertex(-0.07 * s, -1.19 * s)
  p.vertex(0.09 * s, -1.19 * s)
  p.vertex(0.1 * s, -1.42 * s)
  p.vertex(-0.08 * s, -1.42 * s)
  p.endShape(p.CLOSE)
  p.beginShape()
  p.vertex(0.06 * s, -1.2 * s)
  p.vertex(0.17 * s, -1.19 * s)
  p.vertex(0.07 * s, -1.24 * s)
  p.endShape(p.CLOSE)
  p.fill(tone(TOWN.gold))
  p.noStroke()
  p.rect(0.0 * s, -1.33 * s, 0.07 * s, 0.07 * s)
  p.fill(tone(TOWN.ribbon))
  p.stroke(inkA)
  p.strokeWeight(weight * 0.5)
  p.ellipse(0.05 * s, -1.47 * s, 0.055 * s, 0.12 * s)
  if (o.pipe) {
    p.stroke(inkA)
    p.strokeWeight(weight * 0.6)
    p.fill(tone(TOWN.timber))
    p.line(0.08 * s, -1.085 * s, 0.17 * s, -1.06 * s)
    p.rect(0.17 * s, -1.08 * s, 0.045 * s, 0.06 * s)
  }
  p.pop()
}

export interface BlobPose {
  /** 1 facing right, -1 left. */
  face: 1 | -1
  /** Show time, for the wobble. */
  t: number
  /** Seed: every blob man wobbles on his own clock. */
  seed: number
  /** 0 a stain, rising to 1 standing (overshoots are the caller's). */
  up: number
  /** Squash on a step (1 is a fresh step), and the lean of a lurch. */
  squash?: number
  lean?: number
  /** Both arms reaching: 0 hanging, 1 toward where he faces, 2 straight up. */
  reach?: number
  /** Only his wet print on the wall he oozed out of: no ink, no arms, no hat. */
  print?: boolean
  light?: number
  dark?: number
}

/**
 * A blob man: a tall droop of black rubber, a round head that runs into the shoulders, long arms, a straw boater
 * set straight on top. He rises out of a puddle of himself (`up`), wobbles, and his arms stretch when he reaches.
 * About 1.45 cells tall.
 */
export function drawBlob(p: p5, k: number, weight: number, ink: string, o: BlobPose): void {
  const L = o.light ?? 1
  const up = Math.max(0, o.up)
  if (L <= 0.01) return
  const tone = (hex: string) => mixHex(hex, TOWN.night, (o.dark ?? 0) * 0.5)
  const body = tone(TOWN.blob)
  const sheen = tone(mixHex(TOWN.blob, TOWN.slate, 0.55))
  const sq = o.squash ?? 0
  const H = 1.45 * Math.min(1.08, up) * (1 - 0.1 * sq)
  const Wd = 1 + 0.16 * sq + 0.35 * Math.max(0, 1 - up)
  const t = o.t
  const wob = (i: number) => 0.018 * Math.sin(t * (2.1 + 0.3 * hash(i, o.seed)) + i * 1.3 + o.seed)
  p.push()
  // The puddle he stands in (and rose out of): wide and flat, shrinking as he stands.
  const pud = 0.36 + 0.3 * Math.max(0, 1 - up)
  p.noStroke()
  p.fill(alpha(p, body, 0.85 * L))
  if (!o.print) p.ellipse(0, 0.12 * k, pud * 2 * k, 0.07 * k)
  if (up <= 0.02) {
    p.pop()
    return
  }
  p.scale(o.face, 1)
  p.rotate(o.lean ?? 0)
  // The silhouette: foot, belly, shoulders, the round head, and back down; wobbling.
  const pts: [number, number][] = [
    [-0.3 * Wd, 0.12],
    [-0.27 * Wd + wob(1), -0.35 * H],
    [-0.22 * Wd + wob(2), -0.62 * H],
    [-0.15 * Wd + wob(3), -0.78 * H],
    [-0.12 + wob(4), -0.9 * H],
    [-0.1, -0.99 * H],
    [0.0, -1.02 * H],
    [0.1, -0.99 * H],
    [0.12 + wob(5), -0.9 * H],
    [0.16 * Wd + wob(6), -0.78 * H],
    [0.23 * Wd + wob(7), -0.62 * H],
    [0.28 * Wd + wob(8), -0.35 * H],
    [0.3 * Wd, 0.12],
  ]
  if (o.print) p.noStroke()
  else {
    p.stroke(alpha(p, ink, L))
    p.strokeWeight(weight * 0.7)
  }
  p.fill(alpha(p, body, L))
  p.beginShape()
  p.curveVertex(pts[0][0] * k, pts[0][1] * k)
  for (const [x, y] of pts) p.curveVertex(x * k, y * k)
  p.curveVertex(pts[pts.length - 1][0] * k, pts[pts.length - 1][1] * k)
  p.endShape(p.CLOSE)
  // A wet sheen down his back.
  p.noStroke()
  if (!o.print) {
  p.fill(alpha(p, sheen, 0.6 * L))
  p.beginShape()
  p.vertex(-0.07 * k, -0.95 * H * k)
  p.quadraticVertex(-0.2 * Wd * k, -0.7 * H * k, -0.19 * Wd * k, -0.35 * H * k)
  p.quadraticVertex(-0.15 * Wd * k, -0.62 * H * k, -0.04 * k, -0.93 * H * k)
  p.endShape(p.CLOSE)
  }
  // The arms: long rubbery sags from the shoulders, hanging, reaching forward, or up; a mitten of a hand at the end.
  const reach = o.reach ?? 0
  if (!o.print) {
    for (const side of [-1, 1]) {
      const sx = side * 0.15 * Wd
      const sy = -0.74 * H
      const fwd = Math.min(1, reach)
      const upA = Math.max(0, reach - 1)
      // The arm's direction: hanging down (a little out), swung forward, or raised overhead.
      const hang = 0.12 * side + 0.04 * Math.sin(t * 1.7 + side + o.seed)
      const ang = hang + fwd * (Math.PI / 2 - 0.35 + (side > 0 ? 0.1 : -0.05)) + upA * (Math.PI / 2 - 0.25)
      const len = (0.6 + 0.2 * fwd + 0.35 * upA) * Math.min(1, up)
      const dir: [number, number] = [Math.sin(ang), Math.cos(ang)]
      const tip: [number, number] = [sx + dir[0] * len, sy + dir[1] * len]
      // It sags under its own weight: the middle hangs lower than the straight line.
      const sag = 0.1 * Math.abs(dir[0]) + 0.03
      const c1: [number, number] = [sx + dir[0] * len * 0.35, sy + dir[1] * len * 0.35 + sag]
      const c2: [number, number] = [sx + dir[0] * len * 0.72, sy + dir[1] * len * 0.72 + sag * 0.8]
      const w = 0.085
      p.noFill()
      p.strokeCap(p.ROUND)
      p.stroke(alpha(p, ink, L))
      p.strokeWeight(w * k + weight * 1.4)
      p.bezier(sx * k, sy * k, c1[0] * k, c1[1] * k, c2[0] * k, c2[1] * k, tip[0] * k, tip[1] * k)
      p.stroke(alpha(p, body, L))
      p.strokeWeight(w * k)
      p.bezier(sx * k, sy * k, c1[0] * k, c1[1] * k, c2[0] * k, c2[1] * k, tip[0] * k, tip[1] * k)
      p.stroke(alpha(p, ink, L))
      p.strokeWeight(weight * 0.6)
      p.fill(alpha(p, body, L))
      p.ellipse(tip[0] * k, tip[1] * k, 0.12 * k, 0.1 * k)
      p.strokeCap(p.SQUARE)
    }
    // The shoulders over the arms' roots.
    p.noStroke()
    p.fill(alpha(p, body, L))
    p.ellipse(0, -0.74 * H * k, 0.3 * Wd * k, 0.16 * k)
  }
  // The boater: a flat straw crown and brim, a dark band.
  if (up > 0.35 && !o.print) {
    const hy = -1.0 * H
    p.stroke(alpha(p, ink, L))
    p.strokeWeight(weight * 0.65)
    p.fill(alpha(p, tone(TOWN.straw), L))
    p.push()
    p.translate(0, hy * k)
    p.rotate(-0.06 + wob(9) * 2)
    p.rectMode(p.CENTER)
    p.rect(0, -0.005 * k, 0.44 * k, 0.045 * k, 0.02 * k)
    p.rect(0, -0.075 * k, 0.25 * k, 0.12 * k, 0.012 * k)
    p.noStroke()
    p.fill(alpha(p, tone(TOWN.timberDark), L))
    p.rect(0, -0.045 * k, 0.25 * k, 0.035 * k)
    p.pop()
  }
  p.pop()
}

/** A pigeon on the wing: a small grey body and two wings beating (`flap` in radians), heading right if `face` is 1. */
export function drawPigeon(p: p5, k: number, weight: number, ink: string, face: number, flap: number, light = 1): void {
  const b = Math.sin(flap)
  const grey = mixHex(TOWN.slate, TOWN.plaster, 0.45)
  p.push()
  p.scale(face, 1)
  p.stroke(alpha(p, ink, 0.8 * light))
  p.strokeWeight(weight * 0.45)
  p.fill(alpha(p, mixHex(grey, TOWN.slateDark, 0.25), light))
  // The far wing, then the body, then the near wing.
  const wing = (lift: number, len: number) => {
    p.beginShape()
    p.vertex(-0.03 * k, -0.01 * k)
    p.vertex((0.02 - len * 0.35) * k, (-0.02 - lift * len) * k)
    p.vertex((0.08 - len * 0.1) * k, (-0.015 - lift * len * 0.9) * k)
    p.vertex(0.06 * k, 0)
    p.endShape(p.CLOSE)
  }
  wing(0.5 + 0.9 * b, 0.2)
  p.fill(alpha(p, grey, light))
  p.beginShape()
  p.vertex(0.13 * k, -0.02 * k)
  p.vertex(0.09 * k, -0.045 * k)
  p.vertex(-0.02 * k, -0.035 * k)
  p.vertex(-0.13 * k, 0.0)
  p.vertex(-0.02 * k, 0.03 * k)
  p.vertex(0.08 * k, 0.02 * k)
  p.endShape(p.CLOSE)
  p.fill(alpha(p, mixHex(grey, TOWN.plaster, 0.4), light))
  wing(0.35 + 1.1 * b, 0.24)
  p.pop()
}

/** A pigeon perched, feet at the origin: a round-backed grey body, the head up, the tail out; `bob` nods the head. */
export function drawPerched(p: p5, k: number, weight: number, ink: string, face: number, bob: number, light = 1): void {
  const grey = mixHex(TOWN.slate, TOWN.plaster, 0.45)
  p.push()
  p.scale(face, 1)
  p.stroke(alpha(p, ink, 0.8 * light))
  p.strokeWeight(weight * 0.45)
  p.fill(alpha(p, grey, light))
  p.beginShape()
  p.vertex(-0.15 * k, -0.07 * k)
  p.vertex(-0.06 * k, -0.13 * k)
  p.vertex(0.05 * k, -0.13 * k)
  p.vertex((0.08 + 0.01 * bob) * k, (-0.2 + 0.02 * bob) * k)
  p.vertex((0.12 + 0.015 * bob) * k, (-0.19 + 0.02 * bob) * k)
  p.vertex((0.11 + 0.01 * bob) * k, (-0.14 + 0.02 * bob) * k)
  p.vertex(0.09 * k, -0.06 * k)
  p.vertex(0.02 * k, -0.02 * k)
  p.vertex(-0.08 * k, -0.03 * k)
  p.endShape(p.CLOSE)
  p.fill(alpha(p, mixHex(grey, TOWN.slateDark, 0.3), light))
  p.beginShape()
  p.vertex(-0.1 * k, -0.08 * k)
  p.vertex(0.03 * k, -0.11 * k)
  p.vertex(0.04 * k, -0.05 * k)
  p.endShape(p.CLOSE)
  p.line(0.0, -0.02 * k, 0.0, 0)
  p.pop()
}
