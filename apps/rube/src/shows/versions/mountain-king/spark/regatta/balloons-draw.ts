import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha, hash } from '../kit'
import { REGATTA } from '../worlds'
import { ANAT, clamp01, DUSK, rot, type Balloon } from './balloons-plan'

/**
 * How a balloon of the regatta is drawn: the envelope (gores, a band, the parachute vent, the skirt), the burner on
 * its gimbal with its pilot arm and blast valve, the jet, the flying wires, the basket and its ballast. Everything is
 * in world cells; `k` is pixels a cell. Flat fills and one ink; gradients only for light (the jet's, and the
 * envelope's glow from inside).
 *
 * The sun is low in the west-south-west of the frame's right: every envelope is lit on its right and shaded on its
 * left.
 */

export const INK = '#3A2430'

export interface Look {
  k: number
  weight: number
  /** 0..1: how far toward the haze this is (a far balloon). */
  haze?: number
  /** Leave out fine detail (a far balloon, or a wide frame). */
  simple?: boolean
  /** 0..1: how far the dusk has taken its colours down. */
  dusk?: number
}

const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`
}
const hz = (hex: string, look: Look): string => {
  const h = look.haze ? mixHex(hex, REGATTA.haze, look.haze) : hex
  return look.dusk ? mixHex(h, DUSK, look.dusk) : h
}

/* ------------------------------------------------------------------ the envelope's shape */

/** The envelope's radius `h` cells above its mouth: a round dome on a body that flares out of the mouth. */
export function radius(b: Balloon, h: number): number {
  const rm = ANAT.mouthR
  const hc = b.H - b.Rs
  if (h >= hc) return Math.sqrt(Math.max(0, b.Rs * b.Rs - (h - hc) * (h - hc)))
  const x = Math.max(0, h / hc)
  return rm + (b.Rs - rm) * (1 - Math.pow(1 - x, 1.75))
}

/** The heights the outline is sampled at, mouth to crown: close together over the dome, where it turns fastest. */
function heights(to: number, n: number): number[] {
  const out: number[] = []
  for (let i = 0; i <= n; i++) out.push(to * Math.sin((Math.PI / 2) * (i / n)))
  return out
}

/** The vent's cap: the top of the dome, this far down from the crown. */
const CAP = 0.85

export interface Pose {
  /** The nozzle, world cells. */
  n: Pt
  /** The assembly's turn from upright, radians (B1 lying is a quarter turn: crown to the east). */
  a: number
  /** How full the envelope is, 0.6 cold on the grass to 1 hot. */
  fill: number
  /** The ground it rests on, when it can touch it (points below it are laid flat on it). */
  ground?: number
  /** The vent cap's lift, cells. */
  vent: number
  /**
   * How much a lying envelope sags toward the ground along its middle (cells, across its axis, toward local +x,
   * which is down when it lies crown to the east). Nothing when it stands.
   */
  sag?: number
  /** The envelope's height, for the sag's shape. */
  H?: number
}

/** A point in the envelope's own cells (x across, h up from the mouth) to the world. */
function toWorld(pose: Pose, x: number, h: number): Pt {
  const sag = pose.sag && pose.H ? pose.sag * Math.pow(Math.max(0, Math.sin((Math.PI * Math.max(0, h)) / pose.H)), 0.6) : 0
  const [rx, ry] = rot([x * pose.fill + sag, ANAT.mouthY - h], pose.a)
  let y = pose.n[1] + ry
  if (pose.ground !== undefined && y > pose.ground) y = pose.ground
  return [pose.n[0] + rx, y]
}

/** The silhouette up to height `to` (the body, under the cap), right side up and left side down. */
function silhouette(b: Balloon, pose: Pose, to: number, n = 26): Pt[] {
  const hs = heights(to, n)
  const out: Pt[] = []
  for (const h of hs) out.push(toWorld(pose, radius(b, h), h))
  for (let i = hs.length - 1; i >= 0; i--) out.push(toWorld(pose, -radius(b, hs[i]), hs[i]))
  return out
}

function poly(p: p5, k: number, pts: Pt[]): void {
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

function pathOf(ctx: CanvasRenderingContext2D, k: number, pts: Pt[]): void {
  ctx.beginPath()
  ctx.moveTo(pts[0][0] * k, pts[0][1] * k)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * k, pts[i][1] * k)
  ctx.closePath()
}

/** A band round the envelope between two heights, seen a little from below: its edges bow down across the front. */
function band(b: Balloon, pose: Pose, h0: number, h1: number, n = 16): Pt[] {
  const out: Pt[] = []
  const r0 = radius(b, h0)
  const r1 = radius(b, h1)
  for (let i = 0; i <= n; i++) {
    const s = -1 + (2 * i) / n
    out.push(toWorld(pose, r1 * s, h1 - 0.1 * r1 * Math.sqrt(1 - s * s)))
  }
  for (let i = n; i >= 0; i--) {
    const s = -1 + (2 * i) / n
    out.push(toWorld(pose, r0 * s, h0 - 0.1 * r0 * Math.sqrt(1 - s * s)))
  }
  return out
}

/**
 * The envelope, with everything that is part of it: the gores, a band, the shade and the sunlit rim, its glow from
 * inside, the skirt, the vent. `warm` is the light of the burner in it (0..1.2); `spark` is where the spark is inside
 * it (world), if it is, which glows through the silk.
 */
export function drawEnvelope(p: p5, look: Look, b: Balloon, pose: Pose, warm: number, spark: Pt | null, sparkHeat = 1): void {
  const { k, weight } = look
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const top = b.H - CAP
  const body = silhouette(b, pose, top, look.simple ? 14 : 26)
  const ink = hz(INK, look)

  // The skirt first (under the envelope's mouth): darker silk, hanging round the jet.
  if (!look.simple) {
    // From the mouth's ring down to the hem, whose front edge bows down a little (it is seen from below).
    const hemH = ANAT.mouthY - ANAT.hemY
    const skirt: Pt[] = [toWorld(pose, -ANAT.mouthR, 0.04)]
    const n = 10
    for (let i = 0; i <= n; i++) {
      const s = -1 + (2 * i) / n
      skirt.push(toWorld(pose, ANAT.hemR * s, hemH - 0.1 * Math.sqrt(1 - s * s)))
    }
    skirt.push(toWorld(pose, ANAT.mouthR, 0.04))
    p.stroke(ink)
    p.strokeWeight(weight * 0.8)
    p.fill(hz(mixHex(b.silk.band ?? b.silk.a, INK, 0.22), look))
    poly(p, k, skirt)
  }

  // The body in its first silk, outlined.
  p.stroke(ink)
  p.strokeWeight(weight)
  p.fill(hz(b.silk.a, look))
  poly(p, k, body)

  // The gores in the second silk: every other panel between meridians.
  const G = 8
  if (b.silk.b !== b.silk.a) {
    p.noStroke()
    p.fill(hz(b.silk.b, look))
    const hs = heights(top, look.simple ? 12 : 22)
    for (let j = 1; j < G; j += 2) {
      const s0 = Math.sin(-Math.PI / 2 + (j * Math.PI) / G)
      const s1 = Math.sin(-Math.PI / 2 + ((j + 1) * Math.PI) / G)
      const pts: Pt[] = []
      for (const h of hs) pts.push(toWorld(pose, radius(b, h) * s0, h))
      for (let i = hs.length - 1; i >= 0; i--) pts.push(toWorld(pose, radius(b, hs[i]) * s1, hs[i]))
      poly(p, k, pts)
    }
  }
  // A band round the belly.
  if (b.silk.band) {
    p.noStroke()
    p.fill(hz(b.silk.band, look))
    const mid = b.H - b.Rs
    poly(p, k, band(b, pose, mid - 1.7, mid - 0.5))
  }
  // The seams: the load tapes up the meridians, fine.
  if (!look.simple) {
    p.noFill()
    p.stroke(rgba(ink, 0.35))
    p.strokeWeight(weight * 0.45)
    const hs = heights(top, 18)
    for (let j = 1; j < G; j++) {
      const s = Math.sin(-Math.PI / 2 + (j * Math.PI) / G)
      p.beginShape()
      for (const h of hs) {
        const [x, y] = toWorld(pose, radius(b, h) * s, h)
        p.vertex(x * k, y * k)
      }
      p.endShape()
    }
  }

  // Shade on the side away from the sun, and the sun on the rim of the other.
  p.noStroke()
  const hs = heights(top, look.simple ? 12 : 20)
  const shade: Pt[] = []
  for (const h of hs) shade.push(toWorld(pose, -radius(b, h), h))
  for (let i = hs.length - 1; i >= 0; i--) shade.push(toWorld(pose, -radius(b, hs[i]) * 0.38, hs[i]))
  p.fill(rgba(INK, 0.17 * (1 - (look.haze ?? 0))))
  poly(p, k, shade)
  const rim: Pt[] = []
  for (const h of hs) rim.push(toWorld(pose, radius(b, h) * 0.8, h))
  for (let i = hs.length - 1; i >= 0; i--) rim.push(toWorld(pose, radius(b, hs[i]), hs[i]))
  p.fill(rgba(REGATTA.sun, 0.28 * (1 - (look.haze ?? 0)) * (1 - 0.7 * (look.dusk ?? 0))))
  poly(p, k, rim)

  // The light inside: the burner's, from the mouth up, and the spark's own where it is. Only in the silk.
  if (warm > 0.01 || spark) {
    ctx.save()
    pathOf(ctx, k, body)
    ctx.clip()
    // Light carries through the haze better than silk does.
    const fade = 1 - 0.45 * (look.haze ?? 0)
    if (warm > 0.01) {
      // A lantern: warm from the mouth up, brightest low where the flame goes in.
      const [cx, cy] = toWorld(pose, 0, b.H * 0.26)
      const w = Math.min(1.2, warm) * fade
      const R0 = b.H * 0.9 * k
      ctx.globalCompositeOperation = 'source-over'
      const g = ctx.createRadialGradient(cx * k, cy * k, 0, cx * k, cy * k, R0)
      g.addColorStop(0, `rgba(255, 150, 60, ${0.42 * w})`)
      g.addColorStop(0.55, `rgba(255, 120, 60, ${0.18 * w})`)
      g.addColorStop(1, 'rgba(255, 120, 60, 0)')
      ctx.fillStyle = g
      ctx.fillRect(cx * k - R0, cy * k - R0, 2 * R0, 2 * R0)
      ctx.globalCompositeOperation = 'screen'
      const h = ctx.createRadialGradient(cx * k, cy * k, 0, cx * k, cy * k, R0 * 0.8)
      h.addColorStop(0, `rgba(255, 220, 150, ${0.6 * w})`)
      h.addColorStop(1, 'rgba(255, 220, 150, 0)')
      ctx.fillStyle = h
      ctx.fillRect(cx * k - R0, cy * k - R0, 2 * R0, 2 * R0)
    }
    if (spark) {
      // The spark seen through the silk: a long soft flame-shaped light that goes up with it, never a disc.
      const [sx, sy] = spark
      const L = 1.45 * Math.min(2.2, sparkHeat)
      ctx.translate(sx * k, sy * k)
      ctx.scale(0.55, 1)
      ctx.globalCompositeOperation = 'source-over'
      const g = ctx.createRadialGradient(0, -L * 0.3 * k, 0, 0, -L * 0.3 * k, L * k)
      g.addColorStop(0, 'rgba(255, 140, 50, 0.5)')
      g.addColorStop(0.5, 'rgba(255, 120, 50, 0.2)')
      g.addColorStop(1, 'rgba(255, 120, 50, 0)')
      ctx.fillStyle = g
      ctx.fillRect(-L * k, -L * 1.4 * k, 2 * L * k, 2.4 * L * k)
      ctx.globalCompositeOperation = 'screen'
      const c = ctx.createRadialGradient(0, -L * 0.2 * k, 0, 0, -L * 0.2 * k, L * 0.6 * k)
      c.addColorStop(0, 'rgba(255, 236, 180, 0.85)')
      c.addColorStop(1, 'rgba(255, 236, 180, 0)')
      ctx.fillStyle = c
      ctx.fillRect(-L * k, -L * 1.4 * k, 2 * L * k, 2.4 * L * k)
    }
    ctx.restore()
  }

  // The vent's cap on the crown, lifted by `vent`, and the dark of the hole under it.
  const up = rot([0, -pose.vent], pose.a)
  const capPose: Pose = { ...pose, n: [pose.n[0] + up[0], pose.n[1] + up[1]] }
  if (pose.vent > 0.01) {
    const r = radius(b, top)
    const hole: Pt[] = []
    for (let i = 0; i <= 14; i++) {
      const s = -1 + (2 * i) / 14
      hole.push(toWorld(pose, r * s, top + 0.14 * r * Math.sqrt(1 - s * s) * 0.6))
    }
    for (let i = 14; i >= 0; i--) {
      const s = -1 + (2 * i) / 14
      hole.push(toWorld(pose, r * s, top - 0.12 * r * Math.sqrt(1 - s * s) * 0.6))
    }
    p.stroke(ink)
    p.strokeWeight(weight * 0.7)
    p.fill(hz(mixHex(INK, b.silk.cap, 0.18), look))
    poly(p, k, hole)
    // Its cords, from the cap's rim down to the dome's.
    p.stroke(rgba(ink, 0.7))
    p.strokeWeight(weight * 0.5)
    for (const s of [-0.8, -0.3, 0.3, 0.8]) {
      const [x0, y0] = toWorld(pose, r * s, top)
      const [x1, y1] = toWorld(capPose, r * s * 0.98, top)
      p.line(x0 * k, y0 * k, x1 * k, y1 * k)
    }
  }
  // Out of the open vent, the hot air going up: a soft plume of warm light with no edge, what the spark rides out on.
  if (pose.vent > 0.02) {
    const r = radius(b, top)
    const [vx, vy] = toWorld(pose, 0, b.H)
    const on = Math.min(1, pose.vent / 0.3)
    const tall = 2.6 * on
    const a = on * (1 - (look.haze ?? 0))
    ctx.save()
    ctx.translate(vx * k, (vy - tall * 0.35) * k)
    ctx.scale(Math.max(0.2, (r * 0.55) / Math.max(0.1, tall)), 1)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, tall * k)
    g.addColorStop(0, `rgba(255, 214, 150, ${0.26 * a})`)
    g.addColorStop(0.55, `rgba(255, 214, 150, ${0.1 * a})`)
    g.addColorStop(1, 'rgba(255, 214, 150, 0)')
    ctx.fillStyle = g
    ctx.fillRect(-tall * k, -tall * k, 2 * tall * k, 2 * tall * k)
    ctx.restore()
  }
  const cap: Pt[] = []
  const hc = heights(CAP, 8).map((h) => b.H - CAP + h)
  for (const h of hc) cap.push(toWorld(capPose, radius(b, h), h))
  for (let i = hc.length - 1; i >= 0; i--) cap.push(toWorld(capPose, -radius(b, hc[i]), hc[i]))
  p.stroke(ink)
  p.strokeWeight(weight)
  p.fill(hz(b.silk.cap, look))
  poly(p, k, cap)
  p.noStroke()
  p.fill(rgba(REGATTA.sun, 0.25 * (1 - (look.haze ?? 0))))
  const capRim: Pt[] = []
  for (const h of hc) capRim.push(toWorld(capPose, radius(b, h) * 0.75, h))
  for (let i = hc.length - 1; i >= 0; i--) capRim.push(toWorld(capPose, radius(b, hc[i]), hc[i]))
  poly(p, k, capRim)
}

/* ------------------------------------------------------------------ the burner and its jet */

/** A flame's tongue: base at (0, 0) of the current frame, `h` tall up -y, `w` at its belly, its tip swung `lean`. */
export function tongue(p: p5, k: number, w: number, h: number, lean: number): void {
  p.beginShape()
  const n = 16
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    const u = (1 - Math.cos(a)) / 2
    const side = Math.sin(a)
    const belly = Math.sin(Math.PI * Math.pow(u, 0.62)) * (1 - 0.4 * u)
    p.vertex((side * w * 0.5 * belly + lean * u * u) * k, -h * u * k)
  }
  p.endShape(p.CLOSE)
}

/**
 * The jet: a burner's roar, up from its nozzle along its axis, `roar` 0..1.6. A gold tongue with the blue over its
 * lower part and a pale heart; a little light round it. Drawn in the burner's turned frame (nozzle at the origin).
 */
export function drawJet(p: p5, k: number, t: number, roar: number, seed: number): void {
  if (roar <= 0.01) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const f = 0.09 * Math.sin(t * 31 + seed) + 0.06 * Math.sin(t * 53.3 + seed * 2) + 0.05 * (hash(Math.floor(t * 40), seed) - 0.5)
  const L = (2.55 + 0.35 * f) * Math.min(roar, 1.7) * (roar > 1 ? 1 : 1)
  const W = (0.5 + 0.08 * f) * Math.sqrt(Math.min(roar, 1.7)) * (roar > 1.2 ? 1 + 0.5 * (roar - 1.2) : 1)
  const lean = 0.08 * Math.sin(t * 7 + seed)
  // Light round it.
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  const g = ctx.createRadialGradient(0, -L * 0.35 * k, 0, 0, -L * 0.35 * k, L * 0.95 * k)
  g.addColorStop(0, `rgba(170, 210, 255, ${0.32 * Math.min(1, roar)})`)
  g.addColorStop(0.5, `rgba(255, 225, 150, ${0.14 * Math.min(1, roar)})`)
  g.addColorStop(1, 'rgba(255, 225, 150, 0)')
  ctx.fillStyle = g
  ctx.fillRect(-L * k, -L * 1.4 * k, 2 * L * k, 1.8 * L * k)
  ctx.restore()
  p.noStroke()
  p.fill(rgba(REGATTA.propaneTip, 0.95))
  tongue(p, k, W, L, lean)
  p.fill(rgba(REGATTA.propane, 0.95))
  tongue(p, k, W * 0.9, L * 0.52, lean * 0.7)
  p.fill(rgba(mixHex(REGATTA.propane, REGATTA.ivory, 0.55), 0.95))
  tongue(p, k, W * 0.5, L * 0.36, lean * 0.4)
}

/** The pilot light: a small blue tongue on the end of the pilot arm, once the balloon has been lit. */
export function drawPilot(p: p5, k: number, t: number, seed: number): void {
  p.noStroke()
  const f = 0.1 * Math.sin(t * 29 + seed)
  p.push()
  p.translate((ANAT.seat[0]) * k, (ANAT.seat[1] + 0.12) * k)
  p.fill(rgba(REGATTA.propane, 0.9))
  tongue(p, k, 0.12, 0.2 * (1 + f), 0.02 * Math.sin(t * 9 + seed))
  p.fill(rgba(mixHex(REGATTA.propane, REGATTA.ivory, 0.6), 0.9))
  tongue(p, k, 0.06, 0.1, 0)
  p.pop()
}

/**
 * The burner on its gimbal, in its turned frame (nozzle at the origin): the coil block, the nozzle ring, the pilot
 * arm out to the left, and the blast valve's lever on the right, pulled down while it roars.
 */
export function drawBurner(p: p5, look: Look, roar: number): void {
  const { k, weight } = look
  const ink = hz(INK, look)
  const steel = hz(REGATTA.steel, look)
  const X = (v: number) => v * k
  p.stroke(ink)
  p.strokeWeight(weight * 0.8)
  // The pilot light's arm: a thin gas line out of the burner's side, bent up, and the little cup on its end that
  // holds the pilot flame (and the spark, when it sits there).
  const sx = ANAT.seat[0]
  const cupY = ANAT.seat[1] + 0.13
  p.noFill()
  p.strokeWeight(weight * 1.3)
  p.beginShape()
  p.vertex(X(-0.34), X(0.3))
  p.vertex(X(sx + 0.16), X(0.3))
  p.quadraticVertex(X(sx), X(0.3), X(sx), X(cupY + 0.07))
  p.endShape()
  p.stroke(steel)
  p.strokeWeight(weight * 0.6)
  p.beginShape()
  p.vertex(X(-0.34), X(0.3))
  p.vertex(X(sx + 0.16), X(0.3))
  p.quadraticVertex(X(sx), X(0.3), X(sx), X(cupY + 0.07))
  p.endShape()
  p.stroke(ink)
  p.strokeWeight(weight * 0.7)
  p.fill(steel)
  p.quad(X(sx - 0.1), X(cupY), X(sx + 0.1), X(cupY), X(sx + 0.05), X(cupY + 0.09), X(sx - 0.05), X(cupY + 0.09))
  p.rectMode(p.CORNER)
  // The coil block: a drum of coiled tube.
  p.fill(mixHex(steel, INK, 0.12))
  p.rect(X(-0.36), X(0.04), X(0.72), X(0.4), X(0.06))
  if (!look.simple) {
    p.noFill()
    p.stroke(rgba(ink, 0.55))
    p.strokeWeight(weight * 0.5)
    for (const y of [0.14, 0.24, 0.34]) p.line(X(-0.34), X(y), X(0.34), X(y))
    p.stroke(rgba(REGATTA.ivory, 0.35))
    p.line(X(0.18), X(0.07), X(0.18), X(0.41))
  }
  // The nozzle ring on top.
  p.stroke(ink)
  p.strokeWeight(weight * 0.8)
  p.fill(steel)
  p.quad(X(-0.22), X(0.05), X(0.22), X(0.05), X(0.15), X(-0.06), X(-0.15), X(-0.06))
  // The blast valve's lever: up and out at rest, pulled down while the burner roars.
  const pull = Math.min(1, roar)
  const [lx, ly] = rot([0.3, 0], -0.45 + 1.0 * pull)
  p.strokeWeight(weight * 1.1)
  p.line(X(0.36), X(0.28), X(0.36 + lx), X(0.28 + ly))
  p.fill(hz(REGATTA.coral, look))
  p.strokeWeight(weight * 0.7)
  p.rect(X(0.36 + lx - 0.055), X(0.28 + ly - 0.055), X(0.11), X(0.11), X(0.03))
  p.rectMode(p.CENTER)
}

/** The flying wires: from the gimbal ring to the envelope's mouth, in the burner's turned frame. */
export function drawWires(p: p5, look: Look, fill: number): void {
  const { k, weight } = look
  p.stroke(rgba(hz(INK, look), 0.75))
  p.strokeWeight(weight * 0.5)
  for (const s of [-1, 1]) p.line(s * 0.62 * k, 0.12 * k, s * ANAT.mouthR * fill * 0.96 * k, (ANAT.mouthY + 0.02) * k)
  p.stroke(rgba(hz(INK, look), 0.45))
  for (const s of [-1, 1]) p.line(s * 0.3 * k, 0.1 * k, s * ANAT.mouthR * fill * 0.45 * k, (ANAT.mouthY + 0.06) * k)
}

/* ------------------------------------------------------------------ the basket */

/**
 * The basket, the load frame over it and its flexi-rods, at the nozzle `n` (upright always: the burner turns on
 * its gimbal, the basket does not). Wicker in the sun, a leather rim.
 */
export function drawBasket(p: p5, look: Look, n: Pt): void {
  const { k, weight } = look
  const ink = hz(INK, look)
  const X = (v: number) => v * k
  const [nx, ny] = n
  const { rimY, floorY, rimW, floorW, frameY, frameW } = ANAT
  // The flexi-rods (padded) from the rim to the frame.
  p.stroke(ink)
  p.strokeWeight(weight * 0.8)
  p.fill(hz(REGATTA.wickerDeep, look))
  for (const s of [-1, 1]) {
    p.quad(X(nx + s * (frameW - 0.05)), X(ny + frameY), X(nx + s * (frameW + 0.03)), X(ny + frameY), X(nx + s * (rimW - 0.02)), X(ny + rimY), X(nx + s * (rimW - 0.1)), X(ny + rimY))
  }
  // The load frame's bar.
  p.fill(hz(REGATTA.steel, look))
  p.rectMode(p.CORNER)
  p.rect(X(nx - frameW - 0.04), X(ny + frameY - 0.05), X(2 * frameW + 0.08), X(0.1))
  p.rectMode(p.CENTER)
  // The basket: a little narrower at the floor, rounded at the bottom corners.
  p.fill(hz(REGATTA.wicker, look))
  p.stroke(ink)
  p.strokeWeight(weight)
  p.beginShape()
  p.vertex(X(nx - rimW), X(ny + rimY))
  p.vertex(X(nx + rimW), X(ny + rimY))
  p.vertex(X(nx + floorW), X(ny + floorY - 0.12))
  p.quadraticVertex(X(nx + floorW - 0.02), X(ny + floorY), X(nx + floorW - 0.14), X(ny + floorY))
  p.vertex(X(nx - floorW + 0.14), X(ny + floorY))
  p.quadraticVertex(X(nx - floorW + 0.02), X(ny + floorY), X(nx - floorW), X(ny + floorY - 0.12))
  p.endShape(p.CLOSE)
  if (!look.simple && k > 22) {
    // The weave: rows, and the stakes between them staggered.
    p.stroke(rgba(ink, 0.28))
    p.strokeWeight(weight * 0.45)
    const rows = 6
    for (let i = 1; i < rows; i++) {
      const y = rimY + ((floorY - rimY) * i) / rows
      const w = rimW + (floorW - rimW) * (i / rows)
      p.line(X(nx - w + 0.03), X(ny + y), X(nx + w - 0.03), X(ny + y))
      for (let j = -3; j <= 3; j++) {
        const x = (j + (i % 2 ? 0.5 : 0)) * 0.21
        if (Math.abs(x) > w - 0.1) continue
        const y0 = rimY + ((floorY - rimY) * (i - 1)) / rows
        p.line(X(nx + x), X(ny + y0 + 0.03), X(nx + x), X(ny + y - 0.03))
      }
    }
    // Sun on its right face.
    p.noStroke()
    p.fill(rgba(REGATTA.sun, 0.22))
    p.quad(X(nx + rimW * 0.55), X(ny + rimY), X(nx + rimW), X(ny + rimY), X(nx + floorW), X(ny + floorY - 0.1), X(nx + floorW * 0.55), X(ny + floorY - 0.02))
  }
  // The leather rim.
  p.stroke(ink)
  p.strokeWeight(weight * 0.8)
  p.fill(hz(REGATTA.wickerDeep, look))
  p.rectMode(p.CORNER)
  p.rect(X(nx - rimW - 0.04), X(ny + rimY - 0.07), X(2 * rimW + 0.08), X(0.16), X(0.05))
  p.rectMode(p.CENTER)
}

/**
 * A sandbag: a soft sack with a tied neck, hanging from the rim by its rope, or falling free after `drop` (spinning
 * a little as it goes).
 */
export function drawSandbag(p: p5, look: Look, n: Pt, side: -1 | 1, t: number, drop: number | null): void {
  const { k, weight } = look
  const ink = hz(INK, look)
  const X = (v: number) => v * k
  const hook: Pt = [n[0] + side * (ANAT.rimW + 0.02), n[1] + ANAT.rimY + 0.02]
  const hang = 0.26
  let cx = hook[0] + side * 0.08
  let cy = hook[1] + hang + 0.22
  let a = side * 0.08 + 0.03 * Math.sin(t * 2.1 + side)
  let rope = true
  if (drop !== null && t > drop) {
    const u = t - drop
    cx += side * 0.35 * u
    cy += 0.5 * 11 * u * u
    a += side * 1.6 * u
    rope = false
    if (u > 3.5) return
  }
  if (rope) {
    p.stroke(ink)
    p.strokeWeight(weight * 0.55)
    p.line(X(hook[0]), X(hook[1]), X(cx), X(cy - 0.2))
  }
  p.push()
  p.translate(X(cx), X(cy))
  p.rotate(a)
  p.stroke(ink)
  p.strokeWeight(weight * 0.7)
  p.fill(hz(REGATTA.sandbag, look))
  p.beginShape()
  p.vertex(X(-0.05), X(-0.2))
  p.vertex(X(0.05), X(-0.2))
  p.bezierVertex(X(0.08), X(-0.12), X(0.17), X(-0.1), X(0.17), X(0.06))
  p.bezierVertex(X(0.17), X(0.2), X(0.1), X(0.23), X(0), X(0.23))
  p.bezierVertex(X(-0.1), X(0.23), X(-0.17), X(0.2), X(-0.17), X(0.06))
  p.bezierVertex(X(-0.17), X(-0.1), X(-0.08), X(-0.12), X(-0.05), X(-0.2))
  p.endShape(p.CLOSE)
  p.stroke(rgba(ink, 0.8))
  p.line(X(-0.07), X(-0.13), X(0.07), X(-0.13))
  p.pop()
}

/* ------------------------------------------------------------------ a whole balloon */

export interface Moment {
  t: number
  pose: Pose
  roar: number
  warm: number
  /** The pilot is lit (a small blue flame) and the spark is not on it. */
  pilot: boolean
  /** Where the spark is inside the envelope, if it is. */
  spark: Pt | null
  sparkHeat?: number
  /** When its sandbags go, if they do. */
  bags: number | null
  seed: number
}

/** One balloon: basket, burner, jet, wires, envelope, ballast, in that order. */
export function drawBalloon(p: p5, look: Look, b: Balloon, m: Moment): void {
  const { k } = look
  const { pose } = m
  drawBasket(p, look, pose.n)
  p.push()
  p.translate(pose.n[0] * k, pose.n[1] * k)
  p.rotate(pose.a)
  drawWires(p, look, pose.fill)
  drawJet(p, k, m.t, m.roar, m.seed)
  drawBurner(p, look, m.roar)
  if (m.pilot) drawPilot(p, k, m.t, m.seed)
  p.pop()
  drawEnvelope(p, look, b, pose, m.warm, m.spark, m.sparkHeat)
  drawSandbag(p, look, pose.n, -1, m.t, m.bags)
  drawSandbag(p, look, pose.n, 1, m.t, m.bags === null ? null : m.bags + 0.06)
}

export { alpha, clamp01 }
