import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha } from '../kit'
import { skyline } from '../mountain'
import type { Pen } from '../troll'
import { SKY, STONE, TROLL, WORKS } from '../worlds'
import { pigPoint, SEAT, type PigPose } from './gate-motion'

/**
 * The great pig Peer and the Woman in Green ride to the Dovre King's hall on ("a rope-end for a bridle, an old sack
 * for a saddle"). A troll-pig, seen side on and facing east: a wedge, not a barrel. Heavy bristled shoulders with a
 * crest along the spine, the back sloping down to a narrow rump and a curly tail; a long wedge of a head ending in a
 * flat snout, a tusk curving up out of the jaw, a small eye, a big ear that flops forward and pricks up when it is
 * startled; short legs on cloven trotters. Flat fills and one ink, like the trolls.
 *
 * Drawn in world cells from its pose (`gate-motion.ts`), so the riders `riderAt` puts on its back sit exactly on
 * the sack.
 */

/** The body's outline in the pig's cells (x forward, y down, the ground under its middle at 0, 0), and how much of each point turns with the head. */
const OUTLINE: [number, number, number][] = [
  [0.53, -0.99, 0.6],
  [0.36, -1.08, 0.12],
  [0.16, -1.12, 0],
  [-0.08, -1.09, 0],
  [-0.34, -1.03, 0],
  [-0.58, -0.97, 0],
  [-0.77, -0.89, 0],
  [-0.87, -0.75, 0],
  [-0.87, -0.57, 0],
  [-0.77, -0.43, 0],
  [-0.52, -0.37, 0],
  [-0.15, -0.34, 0],
  [0.2, -0.37, 0],
  [0.43, -0.44, 0],
  [0.57, -0.5, 0.4],
  [0.74, -0.46, 1],
  [0.92, -0.44, 1],
  [1.0, -0.47, 1],
  [1.02, -0.56, 1],
  [1.0, -0.64, 1],
  [0.87, -0.7, 1],
  [0.71, -0.82, 1],
  [0.61, -0.92, 0.9],
]
/** Where the head turns (a nod, a sniff, a start). */
const NECK: Pt = [0.5, -0.74]
/** The hips and shoulders the legs hang from, pig cells. */
const HIP: Pt = [-0.6, -0.52]
const SHOULDER: Pt = [0.3, -0.54]

export interface PigLook {
  /** 0..1 dawn: the night's blue goes out of the colours. */
  day: number
  /** Show time, for the bristles' and the tail's stir. */
  t: number
  /** The rein: slack on the neck once she is off. */
  slack: number
}

export function drawPig(p: p5, c: Pen, pose: PigPose, look: PigLook): void {
  const { k, ink, weight } = c
  const night = 0.22 * (1 - look.day)
  const hide = mixHex(TROLL.old, SKY.night, night)
  const far = mixHex(hide, STONE.deep, 0.45)
  const belly = mixHex(hide, TROLL.pale, 0.22)
  const snout = mixHex(mixHex(TROLL.pale, TROLL.old, 0.35), SKY.night, night * 0.6)
  const bone = mixHex(TROLL.bone, SKY.night, night * 0.5)
  const sack = mixHex(WORKS.rope, SKY.night, night + 0.1)
  const rope = mixHex(WORKS.rope, SKY.night, night * 0.5)
  const w = weight * 0.95

  // The head's turn about the neck, in the pig's cells.
  const ch = Math.cos(pose.head)
  const sh = Math.sin(pose.head)
  const turn = (x: number, y: number, f: number): Pt => {
    if (f <= 0) return [x, y]
    const dx = x - NECK[0]
    const dy = y - NECK[1]
    const a = pose.head * f
    const c0 = f === 1 ? ch : Math.cos(a)
    const s0 = f === 1 ? sh : Math.sin(a)
    return [NECK[0] + dx * c0 - dy * s0, NECK[1] + dx * s0 + dy * c0]
  }
  // A pig point (turned with the head by `f`) to screen pixels.
  const P = (x: number, y: number, f = 0): Pt => {
    const [lx, ly] = turn(x, y, f)
    const [wx, wy] = pigPoint(pose, lx, ly)
    return [wx * k, wy * k]
  }
  const H = (x: number, y: number): Pt => P(x, y, 1)
  // Breathing swells the barrel a little.
  const swell = 0.012 * pose.breath

  const leg = (hip: Pt, phase: number, front: boolean, near: boolean) => {
    const [hx, hy] = pigPoint(pose, hip[0], hip[1])
    // Planted at phase 0 (the foot comes down), carried back under the body, lifted and swung forward.
    const u = (phase + 0.25) * 2 * Math.PI
    const fx = hx + pose.amp * Math.sin(u)
    const lift = pose.lift * Math.max(0, Math.cos(u))
    const fy = skyline(fx) - lift
    // The joint: the hock bends back, the knee forward; more when the foot is lifted.
    const bend = (front ? 1 : -1) * (0.05 + 0.5 * lift)
    const kx = hx + (fx - hx) * 0.55 + bend
    const ky = hy + (fy - hy) * 0.55
    p.stroke(ink)
    p.strokeWeight(w * 0.85)
    p.fill(near ? hide : far)
    const limb = (x0: number, y0: number, x1: number, y1: number, r0: number, r1: number) => {
      const L = Math.hypot(x1 - x0, y1 - y0) || 1
      const nx = (-(y1 - y0) / L) * k
      const ny = ((x1 - x0) / L) * k
      p.beginShape()
      p.vertex(x0 * k + nx * r0, y0 * k + ny * r0)
      p.vertex(x1 * k + nx * r1, y1 * k + ny * r1)
      p.vertex(x1 * k - nx * r1, y1 * k - ny * r1)
      p.vertex(x0 * k - nx * r0, y0 * k - ny * r0)
      p.endShape(p.CLOSE)
    }
    limb(hx, hy, kx, ky, 0.105, 0.07)
    limb(kx, ky, fx, fy - 0.05, 0.065, 0.05)
    // The cloven trotter: a dark wedge with its cleft.
    p.fill(mixHex(TROLL.shade, SKY.night, night))
    p.beginShape()
    p.vertex((fx - 0.06) * k, (fy - 0.075) * k)
    p.vertex((fx + 0.06) * k, (fy - 0.075) * k)
    p.vertex((fx + 0.085) * k, fy * k)
    p.vertex((fx - 0.07) * k, fy * k)
    p.endShape(p.CLOSE)
    p.strokeWeight(w * 0.6)
    p.line((fx + 0.01) * k, (fy - 0.035) * k, (fx + 0.015) * k, fy * k)
  }

  p.push()
  p.strokeJoin(p.ROUND)
  // The far legs first, in the body's shadow.
  leg([HIP[0] - 0.06, HIP[1]], pose.phase, false, false)
  leg([SHOULDER[0] - 0.06, SHOULDER[1]], pose.phase + 0.5, true, false)

  // The tail, behind the rump: a short curl that stirs.
  const stir = 0.15 * Math.sin(look.t * 3.1)
  const [t0x, t0y] = P(-0.85, -0.8)
  const [t1x, t1y] = P(-0.98, -0.9 + stir * 0.1)
  const [t2x, t2y] = P(-1.03, -0.78)
  const [t3x, t3y] = P(-0.95, -0.76)
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(w * 2.1)
  p.bezier(t0x, t0y, t1x, t1y, t2x, t2y, t3x, t3y)
  p.stroke(hide)
  p.strokeWeight(w * 0.9)
  p.bezier(t0x, t0y, t1x, t1y, t2x, t2y, t3x, t3y)

  // The body and head: one outline, the head's points turned about the neck.
  p.stroke(ink)
  p.strokeWeight(w)
  p.fill(hide)
  const pts = OUTLINE.map(([x, y, f]) => {
    const below = y > -0.55 && f === 0 ? swell : 0
    return P(x, y + below, f)
  })
  p.beginShape()
  p.curveVertex(...pts[pts.length - 1])
  for (const q of pts) p.curveVertex(...q)
  p.curveVertex(...pts[0])
  p.curveVertex(...pts[1])
  p.endShape()

  // The belly's paler underside.
  p.noStroke()
  p.fill(belly)
  p.beginShape()
  for (const [x, y] of [[-0.62, -0.45], [-0.3, -0.45], [0.1, -0.46], [0.38, -0.5], [0.41, -0.45], [0.2, -0.385], [-0.15, -0.355], [-0.5, -0.385]] as Pt[]) p.vertex(...P(x, y + (y > -0.42 ? swell * 0.8 : 0)))
  p.endShape(p.CLOSE)

  // The near legs, over the body.
  leg(HIP, pose.phase + 0.5, false, true)
  leg(SHOULDER, pose.phase, true, true)

  // The crest: stiff bristles along the spine from the crown back, longest over the shoulders, stirring.
  p.stroke(alpha(p, ink, 0.6))
  p.strokeWeight(w * 0.7)
  for (let i = 0; i < 15; i++) {
    const u = i / 14
    const x = 0.5 - 0.72 * u
    const y = -0.99 - 0.12 * Math.sin(Math.min(1, u * 1.6) * Math.PI * 0.5) * (1 - 0.35 * u) + 0.1 * u * u
    const len = (0.07 + 0.07 * Math.sin(u * Math.PI)) * (0.8 + 0.4 * ((i * 7) % 3) / 2)
    const lean = -0.55 - 0.2 * u + 0.05 * Math.sin(look.t * 2.3 + i)
    const f = u < 0.1 ? 0.5 : 0
    const [ax, ay] = P(x, y + 0.02, f)
    const [bx, by] = P(x + Math.sin(lean) * len, y + 0.02 - Math.cos(lean) * len, f)
    p.line(ax, ay, bx, by)
  }

  // The sack for a saddle, lumped over his seat, a cord round it.
  p.stroke(ink)
  p.strokeWeight(w * 0.8)
  p.fill(sack)
  p.beginShape()
  const sackPts: Pt[] = [[-0.42, -0.97], [-0.3, -1.08], [-0.08, -1.12], [0.08, -1.12], [0.1, -1.05], [-0.02, -0.99], [-0.25, -0.94]]
  p.curveVertex(...P(...sackPts[sackPts.length - 1]))
  for (const q of sackPts) p.curveVertex(...P(q[0], q[1]))
  p.curveVertex(...P(...sackPts[0]))
  p.curveVertex(...P(...sackPts[1]))
  p.endShape()
  p.stroke(mixHex(rope, TROLL.shade, 0.4))
  p.strokeWeight(w * 0.8)
  p.line(...P(-0.16, -1.11), ...P(-0.2, -0.95))

  // The head's parts, turning with it.
  // The ear: floppy, over the eye; pricked up when startled.
  const e = Math.max(0, Math.min(1, pose.ears))
  const tip: Pt = [0.8 - 0.17 * e, -0.84 - 0.22 * e]
  p.stroke(ink)
  p.strokeWeight(w * 0.85)
  p.fill(mixHex(hide, TROLL.pale, 0.12))
  p.beginShape()
  p.vertex(...H(0.5, -0.97))
  p.bezierVertex(...H(0.55, -1.06 - 0.06 * e), ...H(tip[0] - 0.05, tip[1] - 0.04), ...H(tip[0], tip[1]))
  p.bezierVertex(...H(tip[0] - 0.02, tip[1] + 0.07), ...H(0.66, -0.9), ...H(0.63, -0.92))
  p.endShape(p.CLOSE)
  // The eye: a small almond under the brow, or a shut lid.
  const [ex, ey] = H(0.735, -0.765)
  const open = Math.max(0, Math.min(1.2, pose.eyes))
  if (open > 0.15) {
    p.noStroke()
    p.fill(bone)
    p.ellipse(ex, ey, 0.055 * k, 0.03 * k * open)
    p.fill(TROLL.shade)
    p.ellipse(ex + 0.008 * k, ey, 0.022 * k, 0.024 * k * Math.min(1, open))
  } else {
    p.stroke(ink)
    p.strokeWeight(w * 0.6)
    p.noFill()
    const [ax, ay] = H(0.71, -0.77)
    const [bx, by] = H(0.76, -0.76)
    p.line(ax, ay, bx, by)
  }
  p.stroke(ink)
  p.strokeWeight(w * 0.9)
  p.noFill()
  const [b0x, b0y] = H(0.68, -0.8)
  const [b1x, b1y] = H(0.79, -0.785)
  p.line(b0x, b0y, b1x, b1y)
  // The snout's flat end, and its nostrils.
  p.stroke(ink)
  p.strokeWeight(w * 0.8)
  p.fill(snout)
  p.beginShape()
  for (const q of [[0.985, -0.66], [1.035, -0.63], [1.045, -0.555], [1.03, -0.47], [0.985, -0.455], [1.0, -0.56]] as Pt[]) p.vertex(...H(q[0], q[1]))
  p.endShape(p.CLOSE)
  p.noStroke()
  p.fill(mixHex(TROLL.shade, snout, 0.2))
  for (const y of [-0.6, -0.515]) {
    const [nx, ny] = H(1.025, y)
    p.ellipse(nx, ny, 0.018 * k, 0.034 * k)
  }
  // The tusk, curving up out of the jaw.
  p.stroke(ink)
  p.strokeWeight(w * 0.7)
  p.fill(bone)
  p.beginShape()
  p.vertex(...H(0.86, -0.48))
  p.bezierVertex(...H(0.9, -0.5), ...H(0.95, -0.56), ...H(0.94, -0.64))
  p.bezierVertex(...H(0.925, -0.58), ...H(0.9, -0.54), ...H(0.84, -0.52))
  p.endShape(p.CLOSE)
  // The mouth's line under the tusk.
  p.stroke(ink)
  p.strokeWeight(w * 0.6)
  p.noFill()
  p.line(...H(0.72, -0.5), ...H(0.88, -0.5))

  // The rope-end bridle: a turn round the snout, and the rein back to her seat (lying on the neck once she is off).
  p.stroke(rope)
  p.strokeWeight(w * 1.1)
  p.line(...H(0.91, -0.69), ...H(0.9, -0.44))
  const [r0x, r0y] = H(0.905, -0.64)
  const seat = SEAT.woman
  const [r3x, r3y] = P(seat[0] + 0.05, seat[1] + 0.02)
  const [r3sx, r3sy] = P(0.42, -1.0)
  const s = Math.max(0, Math.min(1, look.slack))
  const [rcx, rcy] = P(0.62, -0.84 + 0.1 * s)
  p.noFill()
  p.bezier(r0x, r0y, rcx, rcy, rcx, rcy, r3x + (r3sx - r3x) * s, r3y + (r3sy - r3y) * s)
  p.pop()
}
