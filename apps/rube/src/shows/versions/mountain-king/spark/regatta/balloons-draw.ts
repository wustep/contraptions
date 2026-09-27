import type p5 from 'p5'
import { mixHex, R, type Pt } from '../../../../../parts'
import { flameBoost } from '../fx'
import { alpha, frame, hash } from '../kit'
import { REGATTA } from '../worlds'
import { ANAT, AT, clamp01, DUSK, rot, ss, type Balloon } from './balloons-plan'

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

/**
 * The parachute valve: a small disc of fabric over the crown, this far down from it. It is a piece of the dome (it
 * follows the dome's curve), so the dome reads whole when it is shut.
 */
const CAP = 0.33
/** How far the valve's seam (a ring round the dome) bows down across the front: the regatta is seen a little from above. */
const BOW = 0.11
/** How much of the plan's vent lift the valve shows: a short lift, so the opening is a narrow crescent. */
const LIFT = 0.45

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
 * A ride up through an envelope, as the drawing needs it: `hold` keeps the burner roaring into the mouth (1 from the
 * whoosh to the pop, then dying away as a blast does), `cut` takes the burner's lantern down while the spark is in the
 * silk (so the spark is the brightest thing there), and `t` is the show's time for the flicker.
 */
export interface Ride {
  t: number
  hold: number
  cut: number
}

/** Each hero balloon's ride: from the whoosh up the jet to the vent's pop. */
const RIDES: Record<string, readonly [number, number]> = {
  b1: [AT.whoosh1, AT.pop1],
  b2: [AT.whoosh2, AT.pop2],
  b3: [AT.whoosh3, AT.pop3],
}

export function rideOf(b: Balloon, t: number): Ride | null {
  const w = RIDES[b.key]
  if (!w || t < w[0]) return null
  const [W, P] = w
  const hold = t <= P ? clamp01((t - W) / 0.04) : Math.exp(-(t - P) / 0.14)
  const cut = ss(t, W, W + 0.2) * (t <= P ? 1 : Math.exp(-(t - P) / 0.35))
  if (hold < 0.004 && cut < 0.004) return null
  return { t, hold, cut }
}

/** A flame's teardrop on the canvas (pixels): base at (0, 0), `h` tall up -y, `w` at its belly, its tip swung `lean`. */
function teardrop(ctx: CanvasRenderingContext2D, w: number, h: number, lean: number): void {
  ctx.beginPath()
  const n = 18
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    const u = (1 - Math.cos(a)) / 2
    const belly = Math.sin(Math.PI * Math.pow(u, 0.62)) * (1 - 0.4 * u)
    const x = Math.sin(a) * w * 0.5 * belly + lean * u * u
    if (i === 0) ctx.moveTo(x, -h * u)
    else ctx.lineTo(x, -h * u)
  }
  ctx.closePath()
}

/**
 * The spark seen through the silk, as a flame behind a lampshade: the burner's roar coming up through the skirt and
 * the mouth as a stream of light that runs up the hot air to it, a tight bloom on the silk round it that lights the
 * gores and seams near it, its flame's teardrop, and its heart, crisp and white-gold, the brightest thing in the
 * frame. Clipped to the envelope and its skirt (`sleeve`). `end` is the spark (or, once it has popped out, the crown
 * the stream dies away into); `spark` is whether it is still in there.
 */
function drawSparkInSilk(
  p: p5,
  look: Look,
  pose: Pose,
  sleeve: Pt[],
  end: Pt,
  spark: boolean,
  heat: number,
  ride: Ride | null,
): void {
  const { k } = look
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const t = ride?.t ?? 0
  const hold = ride ? ride.hold : spark ? 1 : 0
  const fade = 1 - 0.45 * (look.haze ?? 0)
  const h = Math.max(0.6, Math.min(2.2, heat))
  ctx.save()
  pathOf(ctx, k, sleeve)
  ctx.clip()

  // The stream: from the jet in the skirt, through the mouth, up the hot air to the spark. Wide and white-gold at the
  // mouth (the short tongue of the roar), slimming to a thread of warm light that widens again into the spark's glow.
  // Laid out in the envelope's own cells (up its axis, bending over to the spark's sway), so it always stands up the
  // envelope and never lies across it.
  const hemH = ANAT.mouthY - ANAT.hemY
  const h0 = hemH + 0.02
  const [lx, ly] = rot([end[0] - pose.n[0], end[1] - pose.n[1]], -pose.a)
  const D = ANAT.mouthY - ly - h0
  if (D > 0.04 && hold > 0.01) {
    const fill = Math.max(0.3, pose.fill)
    const half = (s: number): number => 0.1 + 0.24 * Math.exp(-s / 0.9) + 0.08 * Math.max(0, 1 - (D - s) / 0.5)
    // Never wider than it is tall: just in through the hem it is a short stub under the spark, not a band across.
    const cap = 0.05 + 0.45 * D
    const centre = (s: number): number => lx * ss(s, 0, D) + 0.04 * Math.sin(t * 7 + s * 1.3) * Math.min(1, s) * Math.min(1, (D - s) / 0.5)
    const at = (x: number, s: number): Pt => toWorld(pose, x / fill, h0 + s)
    const path = (grow: number) => {
      ctx.beginPath()
      const m = 24
      for (let i = 0; i <= m; i++) {
        const s = (D * i) / m
        const [x, y] = at(centre(s) + Math.min(cap, half(s) * grow), s)
        if (i === 0) ctx.moveTo(x * k, y * k)
        else ctx.lineTo(x * k, y * k)
      }
      for (let i = m; i >= 0; i--) {
        const s = (D * i) / m
        const [x, y] = at(centre(s) - Math.min(cap, half(s) * grow), s)
        ctx.lineTo(x * k, y * k)
      }
      ctx.closePath()
    }
    const a = hold * fade * ss(D, 0.04, 0.5)
    const tongueAt = Math.min(0.92, 1.7 / D)
    const from = at(0, 0)
    const grad = (m: number) => {
      const g = ctx.createLinearGradient(from[0] * k, from[1] * k, end[0] * k, end[1] * k)
      g.addColorStop(0, `rgba(255, 244, 214, ${0.62 * a * m})`)
      g.addColorStop(tongueAt * 0.5, `rgba(255, 226, 160, ${0.5 * a * m})`)
      g.addColorStop(tongueAt, `rgba(255, 200, 120, ${0.3 * a * m})`)
      g.addColorStop(1, `rgba(255, 190, 110, ${0.38 * a * m})`)
      return g
    }
    ctx.globalCompositeOperation = 'screen'
    // Soft edges first (wider and fainter), then the stream itself: never a hard line.
    for (const [grow, m] of [[2.6, 0.14], [1.7, 0.26], [1, 1]] as const) {
      ctx.fillStyle = grad(m)
      path(grow)
      ctx.fill()
    }
  }

  if (spark) {
    const [sx, sy] = end
    // A warm glow in the silk round it, and a tight lantern bloom that lights the gores and seams near it.
    ctx.globalCompositeOperation = 'source-over'
    const W0 = 2.5 * k
    const wg = ctx.createRadialGradient(sx * k, (sy - 0.25) * k, 0, sx * k, (sy - 0.25) * k, W0)
    wg.addColorStop(0, `rgba(255, 150, 60, ${0.2 * fade})`)
    wg.addColorStop(1, 'rgba(255, 150, 60, 0)')
    ctx.fillStyle = wg
    ctx.fillRect(sx * k - W0, (sy - 0.25) * k - W0, 2 * W0, 2 * W0)
    ctx.globalCompositeOperation = 'screen'
    const B0 = 1.45 * k
    const bg = ctx.createRadialGradient(sx * k, (sy - 0.12) * k, 0, sx * k, (sy - 0.12) * k, B0)
    bg.addColorStop(0, `rgba(255, 214, 140, ${0.4 * fade})`)
    bg.addColorStop(0.35, `rgba(255, 196, 120, ${0.26 * fade})`)
    bg.addColorStop(1, 'rgba(255, 180, 100, 0)')
    ctx.fillStyle = bg
    ctx.fillRect(sx * k - B0, (sy - 0.12) * k - B0, 2 * B0, 2 * B0)

    // Its flame: the teardrop the spark wears everywhere, seen through the silk (a rim and a gold body), about three
    // hearts tall, standing up the envelope's axis and flickering as it does outside.
    const f = frame(p, k)
    const hb = Math.min(f.y1 - f.y0, ((f.x1 - f.x0) * 9) / 16)
    const boost = flameBoost(t, hb, h)
    const flick = 0.12 * Math.sin(t * 23 + 1.3) + 0.08 * Math.sin(t * 37.7) + 0.05 * (hash(Math.floor(t * 30)) - 0.5)
    const len = Math.max(4.2 * R, R * (2.1 + 0.25 * flick) * h * boost * 1.15)
    const wide = R * 1.55 * Math.sqrt(h) * (1 + 0.1 * flick) * Math.sqrt(boost)
    const lean = (0.05 * Math.sin(t * 7) + flick * 0.6) * R
    ctx.save()
    ctx.translate(sx * k, (sy - R * 0.35) * k)
    ctx.rotate(pose.a)
    ctx.globalCompositeOperation = 'source-over'
    const tg = ctx.createLinearGradient(0, 0, 0, -len * k)
    tg.addColorStop(0, `rgba(255, 200, 110, ${0.6 * fade})`)
    tg.addColorStop(0.55, `rgba(245, 140, 60, ${0.55 * fade})`)
    tg.addColorStop(1, `rgba(232, 103, 43, ${0.5 * fade})`)
    ctx.fillStyle = tg
    teardrop(ctx, wide * 1.1 * k, len * k, lean * k)
    ctx.fill()
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = `rgba(255, 226, 160, ${0.45 * fade})`
    teardrop(ctx, wide * 0.6 * k, len * 0.62 * k, lean * 0.7 * k)
    ctx.fill()
    ctx.restore()

    // The heart: crisp, white-gold, its true size out to a soft edge at 1.4 times it.
    ctx.globalCompositeOperation = 'lighter'
    const r = 1.4 * R * k
    const hg = ctx.createRadialGradient(sx * k, sy * k, 0, sx * k, sy * k, r)
    hg.addColorStop(0, `rgba(255, 252, 236, ${0.9 * fade})`)
    hg.addColorStop(0.62, `rgba(255, 240, 196, ${0.9 * fade})`)
    hg.addColorStop(0.74, `rgba(255, 214, 140, ${0.55 * fade})`)
    hg.addColorStop(1, 'rgba(255, 200, 120, 0)')
    ctx.fillStyle = hg
    ctx.beginPath()
    ctx.arc(sx * k, sy * k, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/**
 * The envelope, with everything that is part of it: the gores, a band, the shade and the sunlit rim, its glow from
 * inside, the skirt, the vent. `warm` is the light of the burner in it (0..1.2); `spark` is where the spark is inside
 * it (world), if it is, which glows through the silk; `ride`, the ride up through it (see `Ride`).
 */
export function drawEnvelope(
  p: p5,
  look: Look,
  b: Balloon,
  pose: Pose,
  warm: number,
  spark: Pt | null,
  sparkHeat = 1,
  ride: Ride | null = null,
): void {
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

  // The light inside: the burner's, from the mouth up. Only in the silk. While the spark rides up inside, the lantern
  // is let down by 30%, so the spark's heart outshines it.
  if (warm > 0.01) {
    ctx.save()
    pathOf(ctx, k, body)
    ctx.clip()
    // Light carries through the haze better than silk does.
    const fade = 1 - 0.45 * (look.haze ?? 0)
    // A lantern: warm from the mouth up, brightest low where the flame goes in.
    const [cx, cy] = toWorld(pose, 0, b.H * 0.26)
    const w = Math.min(1.2, warm) * fade * (1 - 0.3 * (ride?.cut ?? 0))
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
    ctx.restore()
  }

  // The spark in the silk, and the roar's light running up to it (and, once it has popped out, dying away into the
  // crown). Clipped to the envelope and its skirt, so the stream shows from the jet in the skirt up.
  const hold = ride?.hold ?? 0
  const end = spark ?? (hold > 0.01 && pose.vent > 0.02 ? toWorld(pose, 0, top - 0.25) : null)
  if (end) {
    const hemH = ANAT.mouthY - ANAT.hemY
    const sleeve: Pt[] = [...body]
    const n = 10
    for (let i = 0; i <= n; i++) {
      const s = -1 + (2 * i) / n
      sleeve.push(toWorld(pose, ANAT.hemR * s, hemH - 0.1 * Math.sqrt(1 - s * s)))
    }
    drawSparkInSilk(p, look, pose, sleeve, end, spark !== null, sparkHeat, ride)
  }

  drawValve(p, look, b, pose, warm)
}

/**
 * The parachute valve on the crown: a small disc of the dome's own curve, sewn in on a seam that bows down across the
 * front. When the plan opens it (`pose.vent`), the hot air pushes it up off the seam: it billows up most over the
 * middle and stays sewn on at the seam's two ends, so the opening under its front edge is a narrow dark crescent that
 * tapers to nothing at the sides, with the shroud lines running down from its hem inside the envelope. The hot air
 * goes up out of it as a soft plume.
 */
function drawValve(p: p5, look: Look, b: Balloon, pose: Pose, warm: number): void {
  const { k, weight } = look
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const ink = hz(INK, look)
  const haze = look.haze ?? 0
  const top = b.H - CAP
  const rc = radius(b, top)
  const e = BOW * rc
  // Never more than the seam's own bow, so the crescent's upper edge stays under the ring's back half.
  const lift = Math.min(1.6 * e, LIFT * pose.vent)
  const open = lift > 0.004
  const N = 16
  const q = (x: number): number => Math.sqrt(Math.max(0, 1 - (x / rc) * (x / rc)))
  /** A point of the valve (envelope cells), pushed up by the air: most in the middle, none at the seam's ends. */
  const V = (x: number, h: number): Pt => toWorld(pose, x, h + lift * q(x))
  /** The seam's ring at `s` (-1..1 across): its front half (`side` -1, bowing down) or its back half (+1). */
  const ring = (s: number, side: -1 | 1): Pt => toWorld(pose, rc * s, top + side * e * Math.sqrt(Math.max(0, 1 - s * s)))
  const hemAt = (s: number): Pt => V(rc * s, top - e * Math.sqrt(Math.max(0, 1 - s * s)))

  if (open) {
    // The opening: the seam's whole ring, dark inside (the burner's light warms it a little), clipped to the dome so
    // its ends never stand proud of the silk. The valve, drawn after, covers all of it but the crescent in front.
    const whole = silhouette(b, pose, b.H, 22)
    const hole: Pt[] = []
    for (let i = 0; i <= N; i++) hole.push(ring(-1 + (2 * i) / N, -1))
    for (let i = N; i >= 0; i--) hole.push(ring(-1 + (2 * i) / N, 1))
    const dark = mixHex(mixHex(INK, b.silk.cap, 0.14), '#B8583A', 0.22 * Math.min(1, warm))
    ctx.save()
    pathOf(ctx, k, whole)
    ctx.clip()
    p.noStroke()
    p.fill(hz(dark, look))
    poly(p, k, hole)
    // The shroud lines: from the valve's hem down and in, into the dark of the envelope.
    pathOf(ctx, k, hole)
    ctx.clip()
    p.noFill()
    p.stroke(rgba(hz(mixHex(b.silk.cap, REGATTA.ivory, 0.3), look), 0.5 * (1 - haze)))
    p.strokeWeight(weight * 0.45)
    for (const s of [-0.7, -0.35, 0, 0.35, 0.7]) {
      const [x0, y0] = hemAt(s)
      const [x1, y1] = toWorld(pose, rc * s * 0.3, top - 2.4)
      p.line(x0 * k, y0 * k, x1 * k, y1 * k)
    }
    ctx.restore()
    // The lip of the opening: a fine line where the dome's silk turns in.
    p.noFill()
    p.stroke(rgba(ink, 0.55))
    p.strokeWeight(weight * 0.5)
    p.beginShape()
    for (let i = 0; i <= N; i++) {
      const [x, y] = ring(-1 + (2 * i) / N, -1)
      p.vertex(x * k, y * k)
    }
    p.endShape()
  }

  // Out of the open vent, the hot air going up: a soft plume of warm light with no edge, what the spark rides out on.
  if (pose.vent > 0.02) {
    const [vx, vy] = V(0, b.H)
    const on = Math.min(1, pose.vent / 0.3)
    const tall = 2.6 * on
    const a = on * (1 - haze)
    ctx.save()
    ctx.translate(vx * k, (vy - tall * 0.35) * k)
    ctx.scale(Math.max(0.2, (rc * 0.8) / Math.max(0.1, tall)), 1)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, tall * k)
    g.addColorStop(0, `rgba(255, 214, 150, ${0.26 * a})`)
    g.addColorStop(0.55, `rgba(255, 214, 150, ${0.1 * a})`)
    g.addColorStop(1, 'rgba(255, 214, 150, 0)')
    ctx.fillStyle = g
    ctx.fillRect(-tall * k, -tall * k, 2 * tall * k, 2 * tall * k)
    ctx.restore()
  }

  // The valve: the dome's curve over the crown, its hem the seam's front edge.
  const hc = heights(CAP, 8).map((h) => top + h)
  const arc: Pt[] = []
  for (const h of hc) arc.push(V(radius(b, h), h))
  for (let i = hc.length - 2; i >= 0; i--) arc.push(V(-radius(b, hc[i]), hc[i]))
  const hem: Pt[] = []
  for (let i = 1; i < N; i++) hem.push(hemAt(-1 + (2 * i) / N))
  const valve = [...arc, ...hem]
  p.noStroke()
  p.fill(hz(b.silk.cap, look))
  poly(p, k, valve)
  ctx.save()
  pathOf(ctx, k, valve)
  ctx.clip()
  // Its own gores' seams, carrying the load tapes' meridians on up to the crown.
  if (!look.simple) {
    p.noFill()
    p.stroke(rgba(ink, 0.3))
    p.strokeWeight(weight * 0.4)
    for (let j = 2; j < 8; j += 2) {
      const s = Math.sin(-Math.PI / 2 + (j * Math.PI) / 8)
      p.beginShape()
      for (const h of hc) {
        const [x, y] = V(radius(b, h) * s, h - e * Math.sqrt(Math.max(0, 1 - s * s)) * (1 - (h - top) / CAP))
        p.vertex(x * k, y * k)
      }
      p.endShape()
    }
  }
  // The shade on the side away from the sun, the sun on the other, as on the dome under it.
  p.noStroke()
  const shade: Pt[] = []
  for (const h of hc) shade.push(V(-radius(b, h), h - e))
  for (let i = hc.length - 1; i >= 0; i--) shade.push(V(-radius(b, hc[i]) * 0.38, hc[i] - e))
  p.fill(rgba(INK, 0.17 * (1 - haze)))
  poly(p, k, shade)
  const sun: Pt[] = []
  for (const h of hc) sun.push(V(radius(b, h) * 0.72, h - e))
  for (let i = hc.length - 1; i >= 0; i--) sun.push(V(radius(b, hc[i]) * 1.02, hc[i] - e))
  p.fill(rgba(REGATTA.sun, 0.25 * (1 - haze) * (1 - 0.7 * (look.dusk ?? 0))))
  poly(p, k, sun)
  ctx.restore()
  // Outlined over the top (it is the dome's own edge there); the hem is a sewn seam, fine, not a cut.
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(weight)
  p.beginShape()
  for (const [x, y] of arc) p.vertex(x * k, y * k)
  p.endShape()
  p.stroke(rgba(ink, open ? 0.7 : 0.4))
  p.strokeWeight(weight * (open ? 0.55 : 0.45))
  p.beginShape()
  p.vertex(arc[arc.length - 1][0] * k, arc[arc.length - 1][1] * k)
  for (const [x, y] of hem) p.vertex(x * k, y * k)
  p.vertex(arc[0][0] * k, arc[0][1] * k)
  p.endShape()
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

/**
 * One balloon: basket, burner, jet, wires, envelope, ballast, in that order. Through a ride up inside it the burner
 * keeps roaring into the mouth (at least a full roar), so its flame, the light through the mouth and the spark's glow
 * make one line.
 */
export function drawBalloon(p: p5, look: Look, b: Balloon, m: Moment): void {
  const { k } = look
  const { pose } = m
  const ride = rideOf(b, m.t)
  const roar = Math.max(m.roar, ride?.hold ?? 0)
  drawBasket(p, look, pose.n)
  p.push()
  p.translate(pose.n[0] * k, pose.n[1] * k)
  p.rotate(pose.a)
  drawWires(p, look, pose.fill)
  drawJet(p, k, m.t, roar, m.seed)
  drawBurner(p, look, roar)
  if (m.pilot) drawPilot(p, k, m.t, m.seed)
  p.pop()
  drawEnvelope(p, look, b, pose, m.warm, m.spark, m.sparkHeat, ride)
  drawSandbag(p, look, pose.n, -1, m.t, m.bags)
  drawSandbag(p, look, pose.n, 1, m.t, m.bags === null ? null : m.bags + 0.06)
}

export { alpha, clamp01 }
