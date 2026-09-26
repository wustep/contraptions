import type p5 from 'p5'
import { mixHex } from '../../../../parts'
import { TROLL } from './worlds'

/**
 * The canonical troll. Every troll in the show is drawn with `drawTroll`, so the court, the miners, the drummers and
 * the swarm in the heart are one people. Never draw a troll any other way; if this lacks something your part
 * needs, add an optional field to `TrollLook` (guarded, so every other troll is unchanged) and say so.
 *
 * After Kittelsen: a troll is a lump of hillside that got up. A heavy hunched body, a head sunk into it with no
 * neck, and the long drooping nose that says where it is looking (a turned head is the nose swinging over; at
 * `face` 0 it points at us and reads as a bulb). Small eyes under a heavy brow (never round and ball-sized: slits),
 * big ears, moss growing on the crown and the back, long arms with heavy hands, short legs, a tail with a tuft.
 * Flat fills, one ink.
 *
 * The troll stands with its feet's middle at (x, y) of the caller's frame, `size` cells tall standing (a court troll
 * 1.4–2, a big one 2.5–3; Peer is a quarter of a cell across, so every troll dwarfs him).
 */

export type TrollPose = 'stand' | 'sit' | 'doze' | 'run' | 'reach' | 'strike'

export interface TrollLook {
  /** Height standing, cells. */
  size: number
  pose?: TrollPose
  /** Where the head looks: -1 full left, 1 full right, 0 at us. The body turns with it, half as far. */
  face?: number
  /** A cycle's phase, 0..1: the stride in `run`, the arm's swing in `strike`. Continuous: pass time × rate. */
  phase?: number
  /** How far the head is sunk (0 upright, 1 slumped, chin on chest): a doze, a sulk. */
  slump?: number
  /** 0 eyes shut, 1 open, 1.5 wide (surprise). */
  eyes?: number
  /** 0 shut, 1 open wide: shouting. */
  mouth?: number
  /** Both arms up this far (0 hanging, 1 over the head): a cheer, a lunge, "Slay him!". Adds to the pose's. */
  arms?: number
  /** Per-troll variation, a stable number (index): nose length, ears, tufts, build. */
  seed?: number
  /** Hide colour (default `TROLL.hide`; `TROLL.old` for an elder). */
  hide?: string
  /** Light from a lantern: 0 in the dark (a silhouette a step above the rock), 1 fully lit. Default 1. */
  lit?: number
  /** The rock's colour behind it, what an unlit troll sinks into (default the theme's paper, `c.bg`). */
  dark?: string
  /** Leave the tail off (a troll seen side-on against a wall, a seated row). */
  noTail?: boolean
}

const h01 = (n: number, s: number): number => {
  let x = Math.imul((n + 1) * 374761393 + s * 668265263, 1274126177)
  x ^= x >>> 15
  return ((x >>> 0) % 10000) / 10000
}

/** What a drawing needs of the stage: a part's `c` (`PieceCtx`) will do. */
export interface Pen {
  k: number
  ink: string
  weight: number
  bg: string
}

/** Draw a troll standing (or sitting) with its feet's middle at (x, y), cells, of the caller's frame. */
export function drawTroll(p: p5, c: Pen, x: number, y: number, look: TrollLook): void {
  const { k, ink, weight, bg } = c
  const H = look.size * k
  const pose = look.pose ?? 'stand'
  const face = Math.max(-1, Math.min(1, look.face ?? 0))
  const seed = look.seed ?? 0
  const phase = look.phase ?? 0
  const lit = Math.max(0, Math.min(1, look.lit ?? 1))
  const dark = look.dark ?? bg
  const hide0 = look.hide ?? TROLL.hide
  const hide = mixHex(dark, hide0, 0.25 + 0.75 * lit)
  const pale = mixHex(dark, mixHex(hide0, TROLL.pale, 0.5), 0.2 + 0.8 * lit)
  const nosey = mixHex(dark, mixHex(hide0, TROLL.pale, 0.35), 0.2 + 0.8 * lit)
  const moss = mixHex(dark, TROLL.moss, 0.2 + 0.8 * lit)
  const shade = mixHex(dark, TROLL.shade, 0.6 + 0.4 * lit)
  const tuft = mixHex(dark, TROLL.old, 0.4 + 0.6 * lit)
  const bone = mixHex(dark, TROLL.bone, 0.15 + 0.85 * lit)
  const inkC = mixHex(dark, ink, 0.35 + 0.65 * lit)
  const w = weight * (0.75 + 0.25 * Math.min(1.6, look.size / 1.6))

  // Build: how broad, how long the nose, how big the ears.
  const broad = 0.92 + 0.22 * h01(seed, 1)
  const noseLen = 0.2 + 0.1 * h01(seed, 2)
  const earSize = 0.8 + 0.5 * h01(seed, 3)
  const slump = look.slump ?? (pose === 'doze' ? 0.8 : pose === 'sit' ? 0.2 : 0)
  const eyes = look.eyes ?? (pose === 'doze' ? 0 : 1)
  const mouth = look.mouth ?? 0
  const sitting = pose === 'sit' || pose === 'doze'
  const dir = face >= 0 ? 1 : -1
  const side = Math.abs(face)

  // Heights (in H): a sitting troll's seat is its feet; it is shorter and wider.
  const shoulder = sitting ? 0.55 : 0.72
  const lean = pose === 'run' ? 0.1 * dir : 0
  const bob = pose === 'run' ? 0.03 * Math.abs(Math.sin(phase * Math.PI * 2)) : 0
  const bodyW = 0.64 * broad * (sitting ? 1.1 : 1)
  // The head sits low and forward, sunk into the hump, toward where it looks.
  const headX = (0.14 * face + lean) * H
  const headY = -(shoulder - 0.02 - 0.12 * slump + bob) * H

  p.push()
  p.translate(x * k, y * k)
  p.strokeJoin(p.ROUND)

  // The tail, behind: from the rump, away from where it looks, curling up at the end into a small dark tuft.
  if (!look.noTail && !sitting) {
    const back = -dir
    const sway = Math.sin(phase * Math.PI * 2 + seed) * 0.04
    p.noFill()
    p.stroke(inkC)
    p.strokeWeight(w * 2.2)
    const x0 = back * bodyW * 0.4 * H
    const y0 = -0.2 * H
    const x3 = back * (bodyW * 0.4 + 0.3) * H
    const y3 = (-0.2 + sway) * H
    p.bezier(x0, y0, x0 + back * 0.16 * H, y0 + 0.14 * H, x3 - back * 0.02 * H, y3 + 0.12 * H, x3, y3)
    p.stroke(hide)
    p.strokeWeight(w * 1.0)
    p.bezier(x0, y0, x0 + back * 0.16 * H, y0 + 0.14 * H, x3 - back * 0.02 * H, y3 + 0.12 * H, x3, y3)
    p.stroke(inkC)
    p.strokeWeight(w * 0.8)
    p.fill(tuft)
    p.push()
    p.translate(x3, y3)
    p.rotate(back * -0.5)
    p.beginShape()
    p.vertex(0, 0.02 * H)
    p.bezierVertex(-0.05 * H, -0.02 * H, -0.02 * H, -0.08 * H, 0, -0.1 * H)
    p.bezierVertex(0.02 * H, -0.08 * H, 0.05 * H, -0.02 * H, 0, 0.02 * H)
    p.endShape(p.CLOSE)
    p.pop()
  }

  // Legs (standing and running): two short stumps and broad flat feet.
  if (!sitting) {
    for (const s of [-1, 1]) {
      const stride = pose === 'run' ? Math.sin(phase * Math.PI * 2 + (s > 0 ? 0 : Math.PI)) : 0
      const lx = (s * 0.15 * broad + stride * 0.1 * dir) * H
      const lift = pose === 'run' ? Math.max(0, stride) * 0.06 * H : 0
      p.stroke(inkC)
      p.strokeWeight(w)
      p.fill(hide)
      p.beginShape()
      p.vertex(lx - 0.085 * H, -0.26 * H)
      p.vertex(lx + 0.085 * H, -0.26 * H)
      p.vertex(lx + 0.075 * H, -lift - 0.05 * H)
      p.vertex(lx - 0.075 * H, -lift - 0.05 * H)
      p.endShape(p.CLOSE)
      // The foot: broad and flat, toes toward where it looks.
      const toe = side < 0.2 ? 0 : dir * 0.05 * H
      p.fill(hide)
      p.beginShape()
      p.vertex(lx - 0.09 * H + toe * 0.3, -lift - 0.06 * H)
      p.bezierVertex(lx + toe - 0.12 * H, -lift, lx + toe + 0.12 * H, -lift, lx + 0.09 * H + toe * 0.3, -lift - 0.06 * H)
      p.endShape(p.CLOSE)
    }
  }

  // The body: a lump of hillside with a hump behind the head, broad at the hips.
  const bw = bodyW * H
  const top = -shoulder * H
  const fwd = (0.07 * face + lean) * H
  const base = sitting ? 0 : -0.22 * H
  const hump = 0.08 * H * (0.4 + side)
  p.stroke(inkC)
  p.strokeWeight(w)
  p.fill(hide)
  p.beginShape()
  const pts: [number, number][] = [
    [-bw * 0.5, base],
    [-bw * 0.58 + fwd * 0.1, base - 0.24 * H],
    [-bw * 0.5 + fwd * 0.5, top + 0.12 * H - (dir < 0 ? 0 : hump) * 0.6],
    [-bw * 0.22 + fwd, top - (dir > 0 ? hump : 0.02 * H)],
    [bw * 0.22 + fwd, top - (dir < 0 ? hump : 0.02 * H)],
    [bw * 0.5 + fwd * 0.5, top + 0.12 * H - (dir > 0 ? 0 : hump) * 0.6],
    [bw * 0.58 + fwd * 0.1, base - 0.24 * H],
    [bw * 0.5, base],
  ]
  // A face-on troll has no hump: both shoulders the same.
  if (side < 0.2) {
    pts[3][1] = top - 0.03 * H
    pts[4][1] = top - 0.03 * H
    pts[2][1] = top + 0.1 * H
    pts[5][1] = top + 0.1 * H
  }
  p.curveVertex(...pts[0])
  for (const q of pts) p.curveVertex(...q)
  p.curveVertex(...pts[pts.length - 1])
  p.endShape(p.CLOSE)
  // The belly, a shade paler where the light falls; moss on the hump and down the back.
  p.noStroke()
  p.fill(mixHex(hide, pale, 0.45))
  p.ellipse(fwd * 0.5 + 0.05 * face * H, base - 0.17 * H, bw * 0.5, 0.2 * H)
  p.fill(moss)
  const back = side < 0.2 ? 0 : -dir
  for (let i = 0; i < 4; i++) {
    const u = i / 3
    const mx = back === 0 ? (i - 1.5) * 0.12 * H : back * bw * (0.1 + 0.28 * u) + fwd * 0.6
    const my = back === 0 ? top + 0.02 * H : top - hump * (1 - u) + (0.02 + 0.2 * u) * H
    const r = (0.09 + 0.04 * h01(seed, 20 + i)) * (1 - 0.35 * u)
    p.ellipse(mx, my, r * H, r * 0.62 * H)
  }

  // Arms: from the shoulders, long, bent a little at the elbow, ending in heavy mitts. Hanging, raised (`arms`,
  // reach), swinging (run), or striking down on the beat (strike).
  const raise = Math.max(0, Math.min(1, (look.arms ?? 0) + (pose === 'reach' ? 0.85 : 0)))
  for (const s of [-1, 1]) {
    let a = raise
    if (pose === 'strike') {
      // The two arms alternate: up, and down hard on the beat (phase 0 is the blow).
      const u = (phase + (s > 0 ? 0 : 0.5)) % 1
      a = u < 0.15 ? 1 - u / 0.15 : Math.min(1, (u - 0.15) / 0.7)
      a = a * a * (3 - 2 * a)
    }
    if (pose === 'run') a = 0.22 + 0.2 * Math.sin(phase * Math.PI * 2 + (s > 0 ? Math.PI : 0))
    const sx = fwd * 0.7 + s * bw * 0.42
    const sy = top + 0.12 * H
    // Hanging: down along the body to the knees. Raised: up and out over the head.
    const ang = (1 - a) * (Math.PI / 2 - s * 0.16) + a * (-Math.PI / 2 + s * 0.5)
    // Seated, the arms are folded short: the hands rest on the knees, not through the bench.
    const up = (sitting ? 0.2 : 0.26) * H
    const fore = (sitting ? 0.16 : 0.26) * H
    const ex = sx + Math.cos(ang) * up + s * 0.03 * H * (1 - a)
    const ey = sy + Math.sin(ang) * up
    // The elbow bends the forearm a little inward (toward the body when hanging, toward the head when raised).
    const ang2 = ang + s * (0.25 - 0.1 * a) * (a > 0.5 ? -1 : 1)
    const hx = ex + Math.cos(ang2) * fore
    const hy = ey + Math.sin(ang2) * fore
    p.stroke(inkC)
    p.strokeWeight(w)
    p.fill(hide)
    const limb = (x0: number, y0: number, x1: number, y1: number, r0: number, r1: number) => {
      const L = Math.hypot(x1 - x0, y1 - y0) || 1
      const nx = -(y1 - y0) / L
      const ny = (x1 - x0) / L
      p.beginShape()
      p.vertex(x0 + nx * r0, y0 + ny * r0)
      p.vertex(x1 + nx * r1, y1 + ny * r1)
      p.vertex(x1 - nx * r1, y1 - ny * r1)
      p.vertex(x0 - nx * r0, y0 - ny * r0)
      p.endShape(p.CLOSE)
    }
    limb(sx, sy, ex, ey, 0.075 * H, 0.055 * H)
    p.noStroke()
    p.ellipse(ex, ey, 0.1 * H, 0.1 * H)
    p.stroke(inkC)
    limb(ex, ey, hx, hy, 0.055 * H, 0.045 * H)
    // The hand: a heavy mitt along the forearm, three blunt fingers, the thumb up. Hide, not pale: it is no ball.
    p.push()
    p.translate(hx, hy)
    p.rotate(ang2 - Math.PI / 2)
    p.fill(hide)
    p.beginShape()
    p.vertex(-0.055 * H, -0.02 * H)
    p.bezierVertex(-0.075 * H, 0.05 * H, -0.05 * H, 0.1 * H, -0.02 * H, 0.105 * H)
    p.bezierVertex(0.0, 0.115 * H, 0.03 * H, 0.11 * H, 0.05 * H, 0.09 * H)
    p.bezierVertex(0.07 * H, 0.06 * H, 0.065 * H, 0.0, 0.05 * H, -0.02 * H)
    p.endShape(p.CLOSE)
    p.strokeWeight(w * 0.7)
    p.line(-0.018 * H, 0.06 * H, -0.02 * H, 0.1 * H)
    p.line(0.015 * H, 0.06 * H, 0.015 * H, 0.105 * H)
    p.pop()
  }

  // The head: sunk into the hump, a heavy brow, big ears, and the nose that says where it looks.
  const hw = 0.38 * H
  const hh = 0.3 * H
  p.push()
  p.translate(headX, headY)
  // Ears first, behind the head: the far one hidden as the head turns.
  for (const s of [-1, 1]) {
    const toward = s === dir && side > 0.2 ? 1 - side * 0.7 : 1
    if (s !== dir && side > 0.85) continue
    p.stroke(inkC)
    p.strokeWeight(w)
    p.fill(hide)
    p.push()
    p.translate(s * hw * 0.42 - face * 0.04 * H, -hh * 0.1)
    p.rotate(s * (0.35 + 0.15 * earSize))
    p.beginShape()
    p.vertex(0, -0.03 * H)
    p.bezierVertex(s * 0.08 * H * earSize, -0.1 * H * earSize, s * 0.2 * H * earSize * toward, -0.02 * H, s * 0.18 * H * earSize * toward, 0.03 * H)
    p.bezierVertex(s * 0.14 * H * earSize * toward, 0.07 * H, s * 0.05 * H, 0.06 * H, 0, 0.04 * H)
    p.endShape(p.CLOSE)
    p.pop()
  }
  p.stroke(inkC)
  p.strokeWeight(w)
  p.fill(hide)
  // A heavy skull, flatter on top, the jaw wide.
  p.beginShape()
  p.vertex(-hw * 0.5, hh * 0.15)
  p.bezierVertex(-hw * 0.55, -hh * 0.45, -hw * 0.2, -hh * 0.55, 0, -hh * 0.55)
  p.bezierVertex(hw * 0.2, -hh * 0.55, hw * 0.55, -hh * 0.45, hw * 0.5, hh * 0.15)
  p.bezierVertex(hw * 0.45, hh * 0.5, -hw * 0.45, hh * 0.5, -hw * 0.5, hh * 0.15)
  p.endShape(p.CLOSE)
  // Moss on the crown: a few tufts, not the same size.
  p.noStroke()
  p.fill(moss)
  for (let i = 0; i < 4; i++) {
    const u = (i - 1.5) / 1.5
    const r = 0.06 + 0.035 * h01(seed, 10 + i)
    p.ellipse((u * 0.12 - face * 0.04) * H, -hh * 0.5 - 0.012 * H * (1 - Math.abs(u)), r * H, r * 0.62 * H)
  }
  // The face, shifted toward where it looks.
  const fx = face * hw * 0.28
  // Eyes: small slits under the brow, bone with a dark pupil. Shut: a lid's curve. The far eye goes as it turns.
  const eyeY = -hh * 0.08
  for (const s of [-1, 1]) {
    if (s !== dir && side > 0.8) continue
    const ex = fx + s * hw * 0.17 * (1 - 0.4 * side)
    const open = Math.max(0, Math.min(1.5, eyes))
    if (open > 0.05) {
      p.noStroke()
      p.fill(bone)
      p.ellipse(ex, eyeY, 0.06 * H, 0.032 * H * open)
      p.fill(TROLL.shade)
      p.ellipse(ex + face * 0.012 * H, eyeY + 0.002 * H, 0.022 * H, 0.024 * H * Math.min(1, open))
    } else {
      p.stroke(inkC)
      p.strokeWeight(w * 0.8)
      p.noFill()
      p.arc(ex, eyeY, 0.055 * H, 0.022 * H, 0, Math.PI)
    }
  }
  // The brow over them: a heavy dark ridge.
  p.stroke(inkC)
  p.strokeWeight(w * 1.3)
  p.noFill()
  p.arc(fx, eyeY + 0.004 * H, hw * 0.6, 0.075 * H, Math.PI * 1.1, Math.PI * 1.9)
  // Mouth: a wide slit under the nose; open, a dark maw with two tusks.
  const mx = fx + face * 0.06 * H
  const my = hh * 0.3
  if (mouth > 0.05) {
    p.stroke(inkC)
    p.strokeWeight(w)
    p.fill(TROLL.shade)
    p.ellipse(mx, my + 0.02 * H * mouth, 0.16 * H, 0.1 * H * mouth)
    p.noStroke()
    p.fill(bone)
    for (const s of [-1, 1]) p.triangle(mx + s * 0.05 * H, my - 0.005 * H, mx + s * 0.032 * H, my - 0.005 * H, mx + s * 0.042 * H, my + 0.035 * H * mouth)
  } else {
    p.stroke(inkC)
    p.strokeWeight(w)
    p.noFill()
    p.arc(mx, my - 0.01 * H, 0.15 * H, 0.045 * H, 0.1, Math.PI - 0.1)
  }
  // The nose: a long, heavy potato of a nose. Face-on, a big drooping bulb over the mouth; turned, a club reaching
  // out and down toward where it looks. Narrow where it leaves the brow, fat at the end.
  const nl = noseLen * H
  const nbx = fx
  const nby = eyeY + 0.02 * H
  const tipx = nbx + dir * nl * side * 0.9
  const tipy = nby + nl * (0.55 + 0.25 * (1 - side)) + 0.04 * H * slump
  const bulb = 0.075 * H * (1.2 - 0.3 * side)
  p.stroke(inkC)
  p.strokeWeight(w)
  p.fill(nosey)
  p.beginShape()
  p.vertex(nbx - 0.03 * H, nby)
  p.bezierVertex(nbx - 0.035 * H + dir * side * 0.03 * H, nby + 0.06 * H, tipx - bulb * 1.1, tipy - bulb * 0.6, tipx - bulb, tipy)
  p.bezierVertex(tipx - bulb * 1.0, tipy + bulb * 0.9, tipx + bulb * 1.0, tipy + bulb * 0.9, tipx + bulb, tipy)
  p.bezierVertex(tipx + bulb * 1.1, tipy - bulb * 0.6, nbx + 0.035 * H + dir * side * 0.03 * H, nby + 0.06 * H, nbx + 0.03 * H, nby)
  p.endShape(p.CLOSE)
  // A nostril's shadow under the bulb.
  p.noStroke()
  p.fill(shade)
  p.ellipse(tipx + dir * side * bulb * 0.3, tipy + bulb * 0.45, bulb * 0.5, bulb * 0.22)
  p.pop()

  p.pop()
}
