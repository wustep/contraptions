import type p5 from 'p5'
import { mixHex } from '../../../../parts'
import { TROLL, WORKS } from './worlds'

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
  /**
   * Optional (the hall's King and court, getting up): 0..1 from seated to standing. 0 is `sit` (the body's base on
   * (x, y)), 1 is `stand` (the feet on (x, y)); between, the legs unfold under the body as it lifts and narrows. When
   * set it takes over the sitting or standing the pose would give; unset, every troll is exactly as before.
   */
  rise?: number
  /**
   * Optional (the drum's drummers, pounding): each arm swings out and up on its own side (unset, the left arm goes up
   * across the chest), and the elbow straightens and bends through half-raised without a snap. Unset, every troll is
   * exactly as before.
   */
  outward?: boolean
  /**
   * Optional (the drummers' two-handed blows), `strike` only: 0 the arms alternate (as unset), 1 both come down
   * together on the phase's blow; between, the left arm's half-cycle lag shrinks, so the change is continuous.
   */
  pair?: number
  /**
   * Optional, `run` only: how far into its run's forward lean (0 upright as it stands, 1 the full lean, as unset).
   * A troll that sets off, or pulls up, eases it, so the upper body never jumps a tenth of its height in one frame.
   */
  lean?: number
  /*
   * Optional, for a court of distinct silhouettes (after Kittelsen's trolls, no two alike at a glance): horns, a
   * snout, a hat, three heads, a build, how the moss grows. Unset, every troll is exactly as before.
   */
  /** Horns: short ram's curls at the temples, one tall broken horn (and a stub), or a cow's pair. */
  horns?: 'ram' | 'broken' | 'cow'
  /** The nose, when not the potato: a long hooked one, an upturned pig's snout, or a potato with a wart. */
  snout?: 'hooked' | 'pig' | 'wart'
  /** A hat: a cone of birch bark, an iron pot, a crown of twigs, or a hood with a tassel (only the King wears gold). */
  hat?: 'birch' | 'pot' | 'twigs' | 'hood'
  /** Three heads on one body (the elder, after Kittelsen): the middle one, and a smaller one either side. */
  heads?: 1 | 3
  /** Tall and thin, squat and wide, or a great hump. */
  build?: 'tall' | 'squat' | 'hump'
  /** Where the moss grows, instead of the dots on the back: a beard, a crest along the skull, a few tufts, none. */
  moss?: 'beard' | 'crest' | 'tufts' | 'bare'
}

/** Where a drawn troll's head and hands ended up, cells of the caller's frame: for a crown on the head, a thing in a hand. */
export interface TrollDrawn {
  /** The head's centre, its width, and the top of the skull. */
  head: [number, number]
  headW: number
  crown: number
  /** The left (-x) and right (+x) hands: where the mitt is, and the forearm's angle (radians, y down) it continues. */
  hands: { at: [number, number]; angle: number }[]
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
export function drawTroll(p: p5, c: Pen, x: number, y: number, look: TrollLook): TrollDrawn {
  const { k, weight, bg } = c
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
  // The edge: a thin line of the hide's own shadow, darker than the hide at every light, with no page ink in it: a
  // troll is a mass (a lump of hillside). Any cream in the edge (even half of it) made the lit King and the court read
  // as cream line art with outlined sausage limbs, plush toys on shelves.
  const inkC = mixHex(dark, mixHex(TROLL.shade, hide0, 0.3), 0.35 + 0.65 * lit)
  const w = weight * (0.75 + 0.25 * Math.min(1.6, look.size / 1.6))

  // Build: how broad, how long the nose, how big the ears.
  const built = look.build === 'tall' ? 0.78 : look.build === 'squat' ? 1.28 : 1
  const broad = (0.92 + 0.22 * h01(seed, 1)) * built
  // A potato of a nose, not a trunk: about as long as it is wide. Small pointed ears, not flaps.
  const noseLen = look.snout === 'hooked' ? 0.23 + 0.03 * h01(seed, 2) : look.snout === 'pig' ? 0.06 : 0.12 + 0.05 * h01(seed, 2)
  const earSize = 0.75 + 0.35 * h01(seed, 3)
  const slump = look.slump ?? (pose === 'doze' ? 0.8 : pose === 'sit' ? 0.2 : 0)
  const eyes = look.eyes ?? (pose === 'doze' ? 0 : 1)
  const mouth = look.mouth ?? 0
  const sitting = pose === 'sit' || pose === 'doze'
  // How far up it is, 0 seated to 1 standing (`rise`, or the pose's). Every length below is the seated one at 0 and
  // the standing one at 1, exactly.
  const stood = look.rise === undefined ? (sitting ? 0 : 1) : Math.max(0, Math.min(1, look.rise))
  const mix = (a: number, b: number): number => (stood <= 0 ? a : stood >= 1 ? b : a + (b - a) * stood)
  const drawn: TrollDrawn = { head: [x, y], headW: 0, crown: y, hands: [] }
  const dir = face >= 0 ? 1 : -1
  const side = Math.abs(face)

  // Heights (in H): a sitting troll's seat is its feet; it is shorter and wider.
  const shoulder = mix(0.55, 0.72)
  const lean = pose === 'run' ? 0.1 * dir * Math.max(0, Math.min(1, look.lean ?? 1)) : 0
  const bob = pose === 'run' ? 0.03 * Math.abs(Math.sin(phase * Math.PI * 2)) : 0
  const bodyW = 0.64 * broad * mix(1.1, 1)
  // The head sits low and forward, sunk into the hump, toward where it looks.
  const hunch = look.build === 'hump' ? 1 : 0
  const headX = (0.14 * face + lean + 0.06 * hunch * (side < 0.2 ? 0 : dir)) * H
  const headY = -(shoulder - 0.02 - 0.12 * slump + bob - 0.07 * hunch - (look.build === 'squat' ? 0.04 : 0)) * H

  p.push()
  p.translate(x * k, y * k)
  p.strokeJoin(p.ROUND)

  // The tail, behind: from the rump, away from where it looks, curling up at the end into a small dark tuft.
  if (!look.noTail && stood >= 1) {
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

  // Legs (standing and running): two short stumps and broad flat feet. Getting up, they unfold from under it.
  if (stood > 0.02) {
    const L = stood >= 1 ? 1 : stood
    for (const s of [-1, 1]) {
      const stride = pose === 'run' ? Math.sin(phase * Math.PI * 2 + (s > 0 ? 0 : Math.PI)) : 0
      const lx = (s * 0.15 * broad + stride * 0.1 * dir) * H
      const lift = pose === 'run' ? Math.max(0, stride) * 0.06 * H : 0
      p.stroke(inkC)
      p.strokeWeight(w)
      p.fill(hide)
      p.beginShape()
      p.vertex(lx - 0.085 * H, -0.26 * H * L)
      p.vertex(lx + 0.085 * H, -0.26 * H * L)
      p.vertex(lx + 0.075 * H, (-lift - 0.05 * H) * L)
      p.vertex(lx - 0.075 * H, (-lift - 0.05 * H) * L)
      p.endShape(p.CLOSE)
      // The foot: broad and flat, toes toward where it looks.
      const toe = side < 0.2 ? 0 : dir * 0.05 * H
      p.fill(hide)
      p.beginShape()
      p.vertex(lx - 0.09 * H + toe * 0.3, (-lift - 0.06 * H) * L)
      p.bezierVertex(lx + toe - 0.12 * H, -lift * L, lx + toe + 0.12 * H, -lift * L, lx + 0.09 * H + toe * 0.3, (-lift - 0.06 * H) * L)
      p.endShape(p.CLOSE)
    }
  }

  // The body: a lump of hillside with a hump behind the head, broad at the hips.
  const bw = bodyW * H
  const top = -shoulder * H
  const fwd = (0.07 * face + lean) * H
  const base = mix(0, -0.22 * H)
  const hump = 0.08 * H * (0.4 + side) * (1 + 1.6 * hunch)
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
  // The moss on the back: the dots (unset), a crest of it down the spine, a few tufts, or none (a beard instead).
  if (look.moss === 'crest') {
    // One ridge of it along the spine, over the hump and down the back: a mane, not dots.
    const bk = back === 0 ? 1 : back
    const spine = curve3([fwd * 0.4 - bk * 0.02 * H, top - hump * 0.7], [bk * bw * 0.28 + fwd * 0.3, top - hump * 1.05], [bk * bw * 0.5, top + 0.2 * H], 10)
    p.fill(mixHex(moss, hide, 0.25))
    band(p, spine, 0.1 * H, 0.03 * H)
  }
  const backMoss = look.moss === undefined ? 4 : look.moss === 'tufts' ? 2 : 0
  for (let i = 0; i < backMoss; i++) {
    const u = backMoss > 1 ? i / (backMoss - 1) : 0
    const crest = false
    const mx = back === 0 ? (crest ? 0 : (i - (backMoss - 1) / 2) * 0.12 * H) : back * bw * (0.1 + 0.28 * u) + fwd * 0.6
    const my = back === 0 ? top + (crest ? 0.05 * i : 0.02) * H : top - hump * (1 - u) + (0.02 + 0.2 * u) * H
    const r = (crest ? 0.07 : 0.09 + 0.04 * h01(seed, 20 + i)) * (1 - 0.35 * u) * (look.moss === 'tufts' ? 0.8 : 1)
    p.ellipse(mx, my, r * H * (crest ? 1.25 : 1), r * (crest ? 0.8 : 0.62) * H)
  }

  // Arms: from the shoulders, long, bent a little at the elbow, ending in heavy mitts. Hanging, raised (`arms`,
  // reach), swinging (run), or striking down on the beat (strike).
  const raise = Math.max(0, Math.min(1, (look.arms ?? 0) + (pose === 'reach' ? 0.85 : 0)))
  for (const s of [-1, 1]) {
    let a = raise
    if (pose === 'strike') {
      // The two arms alternate: up, and down hard on the beat (phase 0 is the blow).
      const lag = s > 0 ? 0 : 0.5 * (1 - Math.max(0, Math.min(1, look.pair ?? 0)))
      const u = look.pair === undefined ? (phase + lag) % 1 : (((phase + lag) % 1) + 1) % 1
      a = u < 0.15 ? 1 - u / 0.15 : Math.min(1, (u - 0.15) / 0.7)
      a = a * a * (3 - 2 * a)
    }
    if (pose === 'run') a = 0.22 + 0.2 * Math.sin(phase * Math.PI * 2 + (s > 0 ? Math.PI : 0))
    const sx = fwd * 0.7 + s * bw * 0.42
    const sy = top + 0.12 * H
    // Hanging: down along the body to the knees. Raised: up and out over the head.
    const ang = (1 - a) * (Math.PI / 2 - s * 0.16) + a * (-Math.PI / 2 + s * 0.5 + (look.outward && s < 0 ? 2 * Math.PI : 0))
    // Seated, the arms are folded short: the hands rest on the knees, not through the bench.
    const up = mix(0.2, 0.26) * H
    const fore = mix(0.16, 0.26) * H
    const ex = sx + Math.cos(ang) * up + s * 0.03 * H * (1 - a)
    const ey = sy + Math.sin(ang) * up
    // The elbow bends the forearm a little inward (toward the body when hanging, toward the head when raised).
    // The bend eases through half-raised (it used to flip sign at a = 0.5: a snap in every arm that moved through it).
    const ang2 = ang + s * (0.25 - 0.1 * a) * Math.cos(Math.PI * a)
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
    drawn.hands.push({ at: [x + hx / k, y + hy / k], angle: ang2 })
  }

  // The head: sunk into the hump, a heavy brow, big ears, and the nose that says where it looks.
  const drawHead = (ox: number, oy: number, sc: number, face: number, main: boolean): void => {
  const dir = face >= 0 ? 1 : -1
  const side = Math.abs(face)
  const hw = 0.38 * H * sc
  const hh = 0.3 * H * sc
  if (main) {
    drawn.head = [x + (headX + ox) / k, y + (headY + oy) / k]
    drawn.headW = hw / k
    drawn.crown = y + (headY + oy - hh * 0.55) / k
  }
  p.push()
  p.translate(headX + ox, headY + oy)
  p.scale(sc)
  const hwu = hw / sc
  const hhu = hh / sc
  headwear(p, look, H, hwu, hhu, face, dir, side, inkC, w, dark, lit, 'back')
  // Ears first, behind the head: small and pointed, up and out like a leaf (a round flap reads as an elephant's);
  // the far one hidden as the head turns.
  for (const s of [-1, 1]) {
    const toward = s === dir && side > 0.2 ? 1 - side * 0.6 : 1
    if (s !== dir && side > 0.85) continue
    const e = earSize * H
    p.stroke(inkC)
    p.strokeWeight(w)
    p.fill(hide)
    p.push()
    p.translate(s * hwu * 0.44 - face * 0.04 * H, -hhu * 0.14)
    p.rotate(s * 0.2)
    p.beginShape()
    p.vertex(0, -0.035 * H)
    p.bezierVertex(s * 0.04 * e * toward, -0.07 * e, s * 0.09 * e * toward, -0.1 * e, s * 0.15 * e * toward, -0.12 * e)
    p.bezierVertex(s * 0.13 * e * toward, -0.05 * e, s * 0.08 * e * toward, 0.03 * H, 0, 0.035 * H)
    p.endShape(p.CLOSE)
    p.pop()
  }
  p.stroke(inkC)
  p.strokeWeight(w)
  p.fill(hide)
  // A heavy skull, flatter on top, the jaw wide.
  p.beginShape()
  p.vertex(-hwu * 0.5, hhu * 0.15)
  p.bezierVertex(-hwu * 0.56, -hhu * 0.42, -hwu * 0.25, -hhu * 0.52, 0, -hhu * 0.52)
  p.bezierVertex(hwu * 0.25, -hhu * 0.52, hwu * 0.56, -hhu * 0.42, hwu * 0.5, hhu * 0.15)
  p.bezierVertex(hwu * 0.5, hhu * 0.66, -hwu * 0.5, hhu * 0.66, -hwu * 0.5, hhu * 0.15)
  p.endShape(p.CLOSE)
  // Moss on the crown: a few tufts, not the same size.
  p.noStroke()
  p.fill(moss)
  const crownMoss = look.moss === undefined ? 4 : look.moss === 'tufts' ? 2 : 0
  for (let i = 0; i < (look.hat ? 0 : crownMoss); i++) {
    const u = (i - 1.5) / 1.5
    const r = 0.06 + 0.035 * h01(seed, 10 + i)
    p.ellipse((u * 0.12 - face * 0.04) * H, -hhu * 0.5 - 0.012 * H * (1 - Math.abs(u)), r * H, r * 0.62 * H)
  }
  // The face, shifted toward where it looks.
  const fx = face * hwu * 0.28
  // Eyes: small slits under the brow, bone with a dark pupil. Shut: a lid's curve. The far eye goes as it turns.
  const eyeY = -hhu * 0.08
  for (const s of [-1, 1]) {
    if (s !== dir && side > 0.8) continue
    const ex = fx + s * hwu * 0.17 * (1 - 0.4 * side)
    const open = Math.max(0, Math.min(1.5, eyes))
    if (open > 0.05) {
      p.noStroke()
      p.fill(bone)
      p.ellipse(ex, eyeY, 0.06 * H, 0.032 * H * open)
      p.fill(TROLL.shade)
      // A head thrown back (slump under 0) looks up with its eyes too: the pupils ride up in the slit, which is what
      // reads as "looking up" at a troll's size (the bells, a court looking up at its King). Upright or sunk, as before.
      const up = 0.03 * H * Math.min(0, slump) * Math.min(1, open)
      p.ellipse(ex + face * 0.012 * H, eyeY + 0.002 * H + up, 0.022 * H, 0.024 * H * Math.min(1, open))
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
  p.arc(fx, eyeY + 0.004 * H, hwu * 0.6, 0.075 * H, Math.PI * 1.1, Math.PI * 1.9)
  // Mouth: a wide slit under the nose, its corners showing either side of it, and two stubby tusks up from the
  // underjaw (what says troll and not elephant); open, a dark maw, the tusks either side of it.
  const mx = fx + face * 0.07 * H
  const my = hhu * 0.4
  const mw = 0.25 * H * (1 - 0.35 * side)
  if (mouth > 0.05) {
    p.stroke(inkC)
    p.strokeWeight(w)
    p.fill(TROLL.shade)
    p.ellipse(mx, my + 0.02 * H * mouth, mw * 0.85, 0.11 * H * mouth)
  } else {
    p.stroke(inkC)
    p.strokeWeight(w)
    p.noFill()
    p.arc(mx, my - 0.012 * H, mw, 0.045 * H, 0.1, Math.PI - 0.1)
  }
  for (const s of [-1, 1]) {
    if (s !== dir && side > 0.6) continue
    const tx = mx + s * mw * 0.4 * (s === dir ? 1 : 1 - side)
    const ty = my + 0.01 * H + 0.03 * H * mouth
    p.stroke(inkC)
    p.strokeWeight(w * 0.7)
    p.fill(bone)
    p.triangle(tx - 0.018 * H, ty, tx + 0.018 * H, ty, tx + s * 0.006 * H, ty - 0.055 * H)
  }
  // The nose: a big lumpy potato. Face-on, a fat bulb over the middle of the mouth; turned, jutting out and a
  // little down toward where it looks. Narrow where it leaves the brow, fat at the end, never longer than wide.
  const nl = noseLen * H
  const nbx = fx
  const nby = eyeY + 0.02 * H
  const hooked = look.snout === 'hooked'
  const pig = look.snout === 'pig'
  // Hooked: long, out and down, a small hooked end; a pig's: short and turned up, a flat end with two nostrils.
  const tipx = nbx + dir * nl * side * (hooked ? 1.25 : 1.1)
  const tipy = nby + nl * (hooked ? 0.75 + 0.5 * (1 - side) : pig ? 0.1 : 0.35 + 0.3 * (1 - side)) + 0.025 * H * slump
  const bulb = 0.078 * H * (1.2 - 0.25 * side) * (hooked ? 0.62 : pig ? 0.95 : 1)
  p.stroke(inkC)
  p.strokeWeight(w)
  p.fill(nosey)
  p.beginShape()
  p.vertex(nbx - 0.03 * H, nby)
  p.bezierVertex(nbx - 0.045 * H + dir * side * 0.03 * H, nby + 0.03 * H, tipx - bulb * 1.15, tipy - bulb * 0.7, tipx - bulb, tipy)
  p.bezierVertex(tipx - bulb * 1.0, tipy + bulb * 0.9, tipx + bulb * 1.0, tipy + bulb * 0.9, tipx + bulb, tipy)
  p.bezierVertex(tipx + bulb * 1.15, tipy - bulb * 0.7, nbx + 0.045 * H + dir * side * 0.03 * H, nby + 0.03 * H, nbx + 0.03 * H, nby)
  p.endShape(p.CLOSE)
  // A nostril's shadow under the bulb (a pig's snout shows two, on its flat end; a wart sits on the potato).
  p.noStroke()
  p.fill(shade)
  if (pig) {
    for (const s2 of [-1, 1]) p.ellipse(tipx + s2 * bulb * 0.35 * (1 - 0.6 * side) + dir * side * bulb * 0.35, tipy + bulb * 0.05, bulb * 0.28, bulb * 0.34)
  } else p.ellipse(tipx + dir * side * bulb * 0.3, tipy + bulb * 0.45, bulb * 0.5, bulb * 0.22)
  if (look.snout === 'wart') {
    p.stroke(inkC)
    p.strokeWeight(w * 0.7)
    p.fill(mixHex(nosey, shade, 0.3))
    p.ellipse(tipx - dir * bulb * 0.35, tipy - bulb * 0.55, bulb * 0.42, bulb * 0.36)
  }
  // A beard of moss hanging off the jaw: ragged, stringy, the moss gone dark and dull with age (a bright one read as
  // a green bib).
  if (look.moss === 'beard') {
    p.noStroke()
    p.fill(mixHex(moss, hide, 0.5))
    const bx = fx + face * 0.06 * H
    const wide = hhu * (0.62 - 0.2 * side)
    p.beginShape()
    p.vertex(bx - wide, hhu * 0.5)
    const n = 5
    for (let i = 0; i <= n; i++) {
      const u = i / n
      const xx = bx - wide + 2 * wide * u
      const down = hhu * (0.95 + 0.3 * Math.sin(u * Math.PI)) * (i % 2 ? 0.86 : 1) + hhu * 0.08 * h01(seed, 40 + i)
      p.vertex(xx, down)
    }
    p.vertex(bx + wide, hhu * 0.5)
    p.endShape(p.CLOSE)
  }
  headwear(p, look, H, hwu, hhu, face, dir, side, inkC, w, dark, lit, 'front')
  p.pop()
  }
  // Three heads (the elder): a smaller one either side, looking out, behind the middle one.
  if (look.heads === 3) {
    for (const s2 of [-1, 1]) drawHead(s2 * 0.41 * H, -0.07 * H, 0.58, Math.max(-1, Math.min(1, face * 0.4 + s2 * 0.75)), false)
  }
  drawHead(0, 0, 1, face, true)

  p.pop()
  return drawn
}

/** A horn's dull bone, a birch-bark hat's white, a wool hood, a pot's iron: all a step under the troll's light. */
const HORN = mixHex(TROLL.bone, TROLL.shade, 0.38)
const BIRCH = mixHex('#E4DDCB', TROLL.pale, 0.35)
const WOOL = '#6F5B3E'
const IRON = mixHex(WORKS.iron, WORKS.steel, 0.3)

/**
 * A tapering band along a centreline (a horn, a twig): `pts` in the head's frame, widths from `w0` to `w1`, closed
 * with a blunt or broken end. Filled, edged in the troll's own shadow.
 */
function band(p: p5, pts: [number, number][], w0: number, w1: number, broken = false): void {
  const n = pts.length
  const L: [number, number][] = []
  const Rr: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(n - 1, i + 1)]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len
    const ny = dx / len
    const wd = (w0 + (w1 - w0) * (i / (n - 1))) / 2
    L.push([pts[i][0] + nx * wd, pts[i][1] + ny * wd])
    Rr.push([pts[i][0] - nx * wd, pts[i][1] - ny * wd])
  }
  p.beginShape()
  for (const q of L) p.vertex(q[0], q[1])
  if (broken) {
    // A snapped end: a jag across it.
    const e = pts[n - 1]
    p.vertex(e[0] + (w1 * 0.1), e[1] + w1 * 0.6)
  }
  for (let i = n - 1; i >= 0; i--) p.vertex(Rr[i][0], Rr[i][1])
  p.endShape(p.CLOSE)
}

/** Points along a quadratic curve from a through the control c to b. */
function curve3(a: [number, number], c: [number, number], b: [number, number], n = 8): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i <= n; i++) {
    const u = i / n
    const v = 1 - u
    out.push([v * v * a[0] + 2 * v * u * c[0] + u * u * b[0], v * v * a[1] + 2 * v * u * c[1] + u * u * b[1]])
  }
  return out
}

/**
 * Horns and hats, drawn in the head's frame (its middle at 0, 0; hw, hh its half-size units): what goes behind the
 * skull (`back`: horns rising from it, a hood's hanging point) and what sits on it (`front`: ram's curls at the
 * temples, a hat on the crown). Unset, nothing.
 */
function headwear(p: p5, look: TrollLook, H: number, hw: number, hh: number, face: number, dir: number, side: number, inkC: string, w: number, dark: string, lit: number, layer: 'back' | 'front'): void {
  if (!look.horns && !look.hat) return
  const tone = (hex: string, floor = 0.2) => mixHex(dark, hex, floor + (1 - floor) * lit)
  const fx = -face * 0.04 * H
  p.stroke(inkC)
  p.strokeWeight(w)
  if (layer === 'back') {
    if (look.horns === 'cow') {
      p.fill(tone(HORN))
      for (const s of [-1, 1]) {
        if (s !== dir && side > 0.85) continue
        const reach = s === dir || side < 0.2 ? 1 : 1 - 0.5 * side
        const a: [number, number] = [fx + s * hw * 0.3, -hh * 0.4]
        band(p, curve3(a, [fx + s * hw * 0.85 * reach, -hh * 0.55], [fx + s * hw * 0.78 * reach, -hh * 1.25]), 0.07 * H, 0.012 * H)
      }
    }
    if (look.horns === 'broken') {
      // One tall horn, snapped near its top, and a stub on the other side.
      const s = side < 0.2 ? -1 : -dir
      p.fill(tone(HORN))
      band(p, curve3([fx + s * hw * 0.22, -hh * 0.42], [fx + s * hw * 0.42, -hh * 1.0], [fx + s * hw * 0.34, -hh * 1.7]), 0.08 * H, 0.04 * H, true)
      band(p, [[fx - s * hw * 0.25, -hh * 0.44], [fx - s * hw * 0.32, -hh * 0.7]], 0.06 * H, 0.04 * H, true)
    }
    if (look.hat === 'hood') {
      // The hood's point hangs down behind, a tassel at its tip (a tuft, never a bobble).
      const b = side < 0.2 ? 1 : -dir
      p.fill(tone(WOOL))
      p.beginShape()
      p.vertex(fx + b * hw * 0.15, -hh * 0.55)
      p.bezierVertex(fx + b * hw * 0.7, -hh * 0.7, fx + b * hw * 0.95, -hh * 0.2, fx + b * hw * 0.9, hh * 0.35)
      p.vertex(fx + b * hw * 0.72, hh * 0.3)
      p.bezierVertex(fx + b * hw * 0.7, -hh * 0.1, fx + b * hw * 0.5, -hh * 0.3, fx + b * hw * 0.1, -hh * 0.3)
      p.endShape(p.CLOSE)
      p.fill(tone(mixHex(WOOL, TROLL.shade, 0.4)))
      p.beginShape()
      p.vertex(fx + b * hw * 0.84, hh * 0.3)
      p.vertex(fx + b * hw * 0.95, hh * 0.62)
      p.vertex(fx + b * hw * 0.82, hh * 0.52)
      p.vertex(fx + b * hw * 0.74, hh * 0.64)
      p.vertex(fx + b * hw * 0.76, hh * 0.3)
      p.endShape(p.CLOSE)
    }
    return
  }
  if (look.horns === 'ram') {
    // Short curls at the temples: up, out, round and forward, thick at the root.
    p.fill(tone(HORN))
    for (const s of [-1, 1]) {
      if (s !== dir && side > 0.8) continue
      const a: [number, number] = [fx + s * hw * 0.3, -hh * 0.42]
      const pts = [...curve3(a, [fx + s * hw * 0.78, -hh * 0.78], [fx + s * hw * 0.74, -hh * 0.12], 6), ...curve3([fx + s * hw * 0.74, -hh * 0.12], [fx + s * hw * 0.7, hh * 0.18], [fx + s * hw * 0.5, hh * 0.02], 4).slice(1)]
      band(p, pts, 0.085 * H, 0.03 * H)
    }
  }
  if (look.hat === 'birch') {
    // A tall cone of birch bark, a little askew, two dark marks in its white.
    const tilt = 0.04 * H * (side < 0.2 ? 1 : dir)
    p.fill(tone(BIRCH, 0.15))
    p.triangle(fx - hw * 0.42, -hh * 0.36, fx + hw * 0.42, -hh * 0.36, fx + tilt, -hh * 1.95)
    p.noStroke()
    p.fill(tone(TROLL.shade, 0.3))
    p.quad(fx - hw * 0.2, -hh * 0.8, fx - hw * 0.02, -hh * 0.84, fx - hw * 0.04, -hh * 0.78, fx - hw * 0.2, -hh * 0.75)
    p.quad(fx + hw * 0.06, -hh * 1.25, fx + hw * 0.16, -hh * 1.28, fx + hw * 0.14, -hh * 1.22, fx + hw * 0.05, -hh * 1.2)
    p.stroke(inkC)
    p.fill(tone(mixHex(BIRCH, TROLL.shade, 0.25), 0.15))
    p.quad(fx - hw * 0.48, -hh * 0.32, fx + hw * 0.48, -hh * 0.32, fx + hw * 0.44, -hh * 0.46, fx - hw * 0.44, -hh * 0.46)
  }
  if (look.hat === 'pot') {
    // An iron pot turned upside down on the skull, its rim over the brow, its foot ring on top.
    p.fill(tone(IRON))
    p.beginShape()
    p.vertex(fx - hw * 0.46, -hh * 0.3)
    p.bezierVertex(fx - hw * 0.5, -hh * 0.95, fx + hw * 0.5, -hh * 0.95, fx + hw * 0.46, -hh * 0.3)
    p.endShape(p.CLOSE)
    p.fill(tone(mixHex(IRON, WORKS.steel, 0.4)))
    p.quad(fx - hw * 0.56, -hh * 0.24, fx + hw * 0.56, -hh * 0.24, fx + hw * 0.52, -hh * 0.36, fx - hw * 0.52, -hh * 0.36)
    p.quad(fx - hw * 0.16, -hh * 0.86, fx + hw * 0.16, -hh * 0.86, fx + hw * 0.13, -hh * 0.97, fx - hw * 0.13, -hh * 0.97)
  }
  if (look.hat === 'twigs') {
    // A crown of bare twigs stuck in the moss, splayed, a fork on each.
    p.fill(tone(WORKS.wood, 0.25))
    const n = 6
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n - 0.5
      const a: [number, number] = [fx + u * hw * 0.8, -hh * 0.46]
      const len = hh * (0.6 + 0.45 * Math.abs(Math.sin(i * 2.3 + 1)))
      const tip: [number, number] = [a[0] + u * hw * 1.1, a[1] - len]
      band(p, [a, [(a[0] + tip[0]) / 2 + u * 0.02 * H, (a[1] + tip[1]) / 2], tip], 0.028 * H, 0.008 * H)
      const mid: [number, number] = [a[0] + (tip[0] - a[0]) * 0.6, a[1] + (tip[1] - a[1]) * 0.6]
      band(p, [mid, [mid[0] + (u >= 0 ? 1 : -1) * hw * 0.16, mid[1] - hh * 0.2]], 0.016 * H, 0.006 * H)
    }
  }
  if (look.hat === 'hood') {
    // The hood over the crown and down to the ears, its edge a fold over the brow.
    p.fill(tone(WOOL))
    p.beginShape()
    p.vertex(fx - hw * 0.54, -hh * 0.05)
    p.bezierVertex(fx - hw * 0.62, -hh * 0.62, fx - hw * 0.2, -hh * 0.72, fx, -hh * 0.72)
    p.bezierVertex(fx + hw * 0.2, -hh * 0.72, fx + hw * 0.62, -hh * 0.62, fx + hw * 0.54, -hh * 0.05)
    p.bezierVertex(fx + hw * 0.4, -hh * 0.3, fx - hw * 0.4, -hh * 0.3, fx - hw * 0.54, -hh * 0.05)
    p.endShape(p.CLOSE)
  }
}
