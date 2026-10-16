import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { frame, hash, smooth, type Ctx } from '../kit'
import { cue, UNDOCK } from '../music'
import { DARK } from '../worlds'

/**
 * What is round the undock and the run to the sphere, besides the station, Saturn, the beacons and the ship
 * (`undock.ts`): the depths in front of and behind them.
 *
 * - Far, behind everything: Titan, a small orange world in its haze, there from the cut to the sphere; two sister
 *   habitats off past Cooper Station while it lets the Ranger go, turning, their window strips going round, with a
 *   hauler easing into one of them; and, out over Saturn, Enceladus and Mimas. They keep their place in the frame and
 *   slide a little against the camera (Titan least, Mimas most), as far things do.
 * - Near, over everything and kept to the frame's foot: as the ship runs out over the rings, chunks of ring ice going
 *   by under it, fast.
 *
 * (The port's traffic, a shuttle and a tug with its container, and the foil and loose tether drifting past it, went:
 * round the undock they were six more things in a frame that is about one ship leaving.)
 *
 * Flat paint and no ink round the far things (balls have ink round them; nothing here is a ball). No glow.
 */

type Frame = ReturnType<typeof frame>

const TAU = Math.PI * 2
const END = cue(212)
/** The camera swings out from the station to Saturn about here. */
const SWING = cue(195.4)
/** Where the light comes from: high on the left, as Saturn has it. */
const LIGHT: Pt = [-0.62, -0.78]

const RGB = new Map<string, string>()
const rgba = (hex: string, a: number): string => {
  let rgb = RGB.get(hex)
  if (!rgb) {
    rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')
    RGB.set(hex, rgb)
  }
  return `rgba(${rgb}, ${Math.max(0, Math.min(1, a)).toFixed(3)})`
}

/** The frame's size, and where a point given in fractions of it (from its middle) is, moved against the camera by `F` of its travel from `ref`. */
function view(f: Frame) {
  const W = f.x1 - f.x0
  const H = f.y1 - f.y0
  return {
    W,
    H,
    /** The size things go by: the height of the 16:9 frame inside this one. */
    S: Math.min(H, (W * 9) / 16),
    at: (u: number, v: number, F = 0, ref: Pt = [0, 0]): Pt => [f.cx + u * W - F * (f.cx - ref[0]), f.cy + v * H - F * (f.cy - ref[1])],
  }
}

/* ------------------------------------------------------------------ far */

/** A world: a flat disc, its night side a flat shade, and (Titan) its haze as a flat band round the limb. In pixels. */
function world(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, body: string, a: number, haze?: string, crater?: Pt): void {
  if (a <= 0.01) return
  if (haze) {
    // Only on the lit side: a world's air shows where the light comes through it.
    const toLight = Math.atan2(LIGHT[1], LIGHT[0])
    ctx.strokeStyle = rgba(haze, 0.3 * a)
    ctx.lineWidth = Math.max(1, r * 0.14)
    ctx.beginPath()
    ctx.arc(x, y, r * 1.08, toLight - 1.5, toLight + 1.5)
    ctx.stroke()
  }
  ctx.fillStyle = rgba(body, a)
  ctx.beginPath()
  ctx.arc(x, y, r, 0, TAU)
  ctx.fill()
  ctx.save()
  ctx.beginPath()
  ctx.arc(x, y, r, 0, TAU)
  ctx.clip()
  if (crater) {
    ctx.fillStyle = rgba(DARK.slate, 0.35 * a)
    ctx.beginPath()
    ctx.arc(x + crater[0] * r, y + crater[1] * r, r * 0.3, 0, TAU)
    ctx.fill()
  }
  // Night: the disc less a disc set toward the light, so it shows a phase (lit on the upper left), as a world does.
  ctx.fillStyle = rgba(DARK.deep, 0.8 * a)
  ctx.beginPath()
  ctx.rect(x - 2 * r, y - 2 * r, 4 * r, 4 * r)
  ctx.arc(x + LIGHT[0] * r * 0.85, y + LIGHT[1] * r * 0.85, r * 1.1, 0, TAU, true)
  ctx.fill('evenodd')
  ctx.restore()
}

const TITAN = mixHex(mixHex(DARK.amber, DARK.gold, 0.5), DARK.hull, 0.22)
const TITAN_AIR = mixHex(DARK.amber, DARK.hull, 0.45)
const ICE_MOON = '#E6ECEF'
const ROCK_MOON = mixHex(DARK.hull, DARK.slate, 0.35)

/**
 * A habitat like Cooper Station, far off: a long can turning about its length, its three window strips going round
 * (lit from inside, gold), its ends a shade darker, a port on its near end. In pixels, along `dir`.
 */
function habitat(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, r: number, dir: number, turn: number, a: number): void {
  if (a <= 0.01) return
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(dir)
  // The can, round-ended: in shadow below, lit along its top.
  ctx.fillStyle = rgba(mixHex(DARK.slate, DARK.hull, 0.25), a)
  ctx.fillRect(-len / 2, -r, len, 2 * r)
  ctx.fillStyle = rgba(DARK.deep, 0.4 * a)
  ctx.fillRect(-len / 2, r * 0.25, len, r * 0.75)
  ctx.fillStyle = rgba(DARK.hull, 0.55 * a)
  ctx.fillRect(-len / 2, -r, len, Math.max(0.8, r * 0.16))
  // Its strips, where they face us.
  for (let i = 0; i < 3; i++) {
    const s = turn + (i * TAU) / 3
    if (Math.sin(s) <= 0.1) continue
    const yy = -r * Math.cos(s)
    ctx.fillStyle = rgba(DARK.gold, (0.35 + 0.55 * Math.sin(s)) * a)
    ctx.fillRect(-len / 2 + r * 0.4, yy - Math.max(0.6, r * 0.13), len - r * 0.8, Math.max(1, r * 0.26))
  }
  // Hoops, still while it turns, and the end caps.
  ctx.fillStyle = rgba(DARK.deep, 0.5 * a)
  for (let j = 1; j < 5; j++) ctx.fillRect(-len / 2 + (len * j) / 5, -r, Math.max(0.8, r * 0.08), 2 * r)
  ctx.fillStyle = rgba(mixHex(DARK.slate, DARK.deep, 0.4), a)
  ctx.fillRect(-len / 2 - r * 0.18, -r * 0.8, r * 0.2, r * 1.6)
  ctx.fillRect(len / 2 - r * 0.02, -r * 0.8, r * 0.2, r * 1.6)
  // The port on the near end.
  ctx.fillStyle = rgba(DARK.hull, 0.7 * a)
  ctx.fillRect(len / 2 + r * 0.18, -r * 0.2, r * 0.32, r * 0.4)
  ctx.restore()
}

/** The hauler, side on, nose along `dir`: hull above, slate below, steady lamps (red aft, ice at the nose), and its burn behind. In pixels. */
function hauler(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, dir: number, burn: number, a: number): void {
  if (a <= 0.01) return
  const h = len * 0.42
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(dir)
  if (burn > 0.01) {
    ctx.strokeStyle = rgba(DARK.ice, 0.75 * burn * a)
    ctx.lineWidth = Math.max(1, h * 0.35)
    ctx.beginPath()
    ctx.moveTo(-len / 2, 0)
    ctx.lineTo(-len / 2 - len * 0.55 * burn, 0)
    ctx.stroke()
  }
  ctx.fillStyle = rgba(DARK.hull, 0.92 * a)
  ctx.beginPath()
  ctx.rect(-len / 2, -h / 2, len * 0.7, h)
  ctx.rect(len * 0.2, -h * 0.32, len * 0.3, h * 0.64)
  ctx.fill()
  ctx.fillStyle = rgba(DARK.slate, 0.95 * a)
  ctx.fillRect(-len / 2, h * 0.12, len * 0.7, h * 0.38)
  const dot = Math.max(1.3, len * 0.06)
  ctx.fillStyle = rgba(DARK.red, a)
  ctx.fillRect(-len / 2 - dot / 2, -h * 0.5 - dot / 2, dot, dot)
  ctx.fillStyle = rgba(DARK.ice, a)
  ctx.fillRect(len * 0.36 - dot / 2, -dot / 2, dot, dot)
  ctx.restore()
}

/**
 * Behind everything in the part, drawn first: Titan, the sister habitats with the hauler, Enceladus and Mimas. `t` is
 * show time.
 */
export function drawFar(p: p5, c: Ctx, t: number): void {
  if (t > END + 0.3) return
  const f = frame(p, c.k)
  const { S, at } = view(f)
  const k = c.k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  const px = (q: Pt): Pt => [q[0] * k, q[1] * k]

  // Titan: there all along, high in the frame, barely moving against the camera; over the middle by the station, and
  // to the right, clear of the ship and its line of beacons, out over Saturn (it shifts while the camera swings out).
  {
    const [x, y] = px(at(0.04 + 0.26 * smooth(t, SWING - 0.6, SWING + 1.8), -0.42, 0.03, [-1.3, 0.1]))
    world(ctx, x, y, S * k * 0.017, TITAN, 0.9, TITAN_AIR)
  }

  // The sister habitats, while the station lets the Ranger go, and gone as the camera swings out to Saturn.
  const habs = 1 - smooth(t, SWING - 0.6, SWING + 0.9)
  if (habs > 0) {
    const ref: Pt = [-1.3, 0.1]
    const A = at(0.33, -0.29, 0.06, ref)
    const lenA = S * 0.2
    const B = at(0.38, 0.32, 0.05, ref)
    const lenB = S * 0.11
    // The station's cargo lines, behind it all: tethers from Cooper Station out across the dark to its sisters, pods
    // riding them both ways as steady as a conveyor, so the dark round the undock is a working harbour, not a void.
    const lines: [Pt, Pt, number][] = [
      [at(-0.62, -0.08, 0.06, ref), [A[0] - (lenA / 2) * Math.cos(-0.06) - S * 0.01, A[1] - (lenA / 2) * Math.sin(-0.06)], 1],
      [at(-0.62, 0.14, 0.05, ref), [B[0] - (lenB / 2) * Math.cos(0.22) - S * 0.008, B[1] - (lenB / 2) * Math.sin(0.22)], -1],
    ]
    for (const [a, b, way] of lines) {
      ctx.strokeStyle = rgba(DARK.hull, 0.3 * habs)
      ctx.lineWidth = Math.max(0.8, S * k * 0.0022)
      ctx.beginPath()
      ctx.moveTo(a[0] * k, a[1] * k)
      ctx.lineTo(b[0] * k, b[1] * k)
      ctx.stroke()
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0])
      const pw = S * 0.014 * k
      const ph = S * 0.007 * k
      for (let j = 0; j < 10; j++) {
        const u = (((t * 0.045 * way + j / 10) % 1) + 1) % 1
        // Faded in and out at the ends, where they come off the station and into the port.
        const e = smooth(u, 0, 0.06) * (1 - smooth(u, 0.94, 1))
        ctx.save()
        ctx.translate((a[0] + (b[0] - a[0]) * u) * k, (a[1] + (b[1] - a[1]) * u) * k)
        ctx.rotate(ang)
        ctx.fillStyle = rgba(j % 3 === 0 ? mixHex(DARK.red, DARK.slate, 0.35) : DARK.hull, 0.85 * habs * e)
        ctx.fillRect(-pw / 2, -ph, pw, ph)
        ctx.fillStyle = rgba(DARK.deep, 0.45 * habs * e)
        ctx.fillRect(-pw / 2, -ph * 0.35, pw, ph * 0.35)
        ctx.restore()
      }
    }
    habitat(ctx, A[0] * k, A[1] * k, lenA * k, S * 0.026 * k, -0.06, t * 1.05, habs)
    habitat(ctx, B[0] * k, B[1] * k, lenB * k, S * 0.016 * k, 0.22, 1.7 + t * 1.4, habs * 0.9)
    // A hauler easing into A's port: in along its axis, slowing, and home on the beat the station's spin is off.
    const home = cue(190.2)
    const u = Math.min(1, Math.max(0, (t - (UNDOCK - 2)) / (home - UNDOCK + 2)))
    const gap = (1 - u) ** 2 * 1.6 + 0.02
    const dx = Math.cos(-0.06)
    const dy = Math.sin(-0.06)
    const hx = A[0] + dx * (lenA / 2 + S * 0.006 + S * 0.016 + gap * S * 0.06)
    const hy = A[1] + dy * (lenA / 2 + S * 0.006 + S * 0.016 + gap * S * 0.06)
    hauler(ctx, hx * k, hy * k, S * 0.032 * k, -0.06 + Math.PI, u < 1 ? 0.5 * (1 - u) : 0, habs)
  }

  // Home, behind him: Cooper Station falling away on the left as he burns out over Saturn, smaller every beat, its
  // window strips still going round.
  const home = smooth(t, SWING + 0.6, SWING + 2.2) * (1 - smooth(t, cue(206.2), cue(207)))
  if (home > 0) {
    const u = Math.min(1, Math.max(0, (t - SWING) / (cue(207) - SWING)))
    const len = S * (0.14 - 0.095 * Math.sqrt(u))
    const P = at(-0.4, -0.05 + 0.03 * u, 0.02, [22.8, 8.5])
    habitat(ctx, P[0] * k, P[1] * k, len * k, len * 0.15 * k, 0.04, t * 1.2, home * 0.95)
  }

  // Over Saturn: Enceladus and Mimas, nearer than Titan, sliding against the camera as it runs on.
  const moons = smooth(t, SWING + 0.4, SWING + 2) * (1 - smooth(t, END + 0.05, END + 0.3))
  if (moons > 0) {
    const ref: Pt = [22.8, 8.5]
    const [ex, ey] = px(at(-0.3, 0.3, 0.1, ref))
    world(ctx, ex, ey, S * k * 0.009, ICE_MOON, moons)
    const [mx, my] = px(at(0.18, 0.36, 0.18, ref))
    world(ctx, mx, my, S * k * 0.012, ROCK_MOON, moons, undefined, [0.35, -0.2])
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ near */

/** A chunk of ring ice or rock: a lumpy polygon, lit on its upper left, tumbling. In pixels. */
function chunk(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, turn: number, seed: number, fill: string, a: number, ink: string): void {
  const N = 7
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(turn)
  ctx.beginPath()
  for (let i = 0; i < N; i++) {
    const ang = (i / N) * TAU
    const rr = r * (0.7 + 0.45 * hash(seed, i, 5))
    if (i === 0) ctx.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr)
    else ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr)
  }
  ctx.closePath()
  ctx.fillStyle = rgba(fill, a)
  ctx.fill()
  ctx.strokeStyle = rgba(ink, 0.55 * a)
  ctx.lineWidth = Math.max(1, r * 0.08)
  ctx.stroke()
  ctx.clip()
  // Its shade, away from the light (which stays high on the left as it tumbles).
  ctx.rotate(-turn)
  ctx.fillStyle = rgba(DARK.deep, 0.5 * a)
  ctx.beginPath()
  ctx.rect(-2 * r, -2 * r, 4 * r, 4 * r)
  ctx.arc(LIGHT[0] * r * 0.5, LIGHT[1] * r * 0.5, r * 1.05, 0, TAU, true)
  ctx.fill('evenodd')
  ctx.restore()
}

const RINGS_ON = cue(203.3)
const RINGS_OFF = cue(207.3)

/** Over everything in the part: the ring ice the ship runs out over. `t` is show time. */
export function drawNear(p: p5, c: Ctx, t: number): void {
  if (t > END - 0.05) return
  const f = frame(p, c.k)
  const { W, H, S } = view(f)
  const k = c.k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()

  // Over the rings: ice and rock going by under the ship, near, so twice and more as fast as the rings themselves.
  const rings = smooth(t, RINGS_ON - 0.6, RINGS_ON + 0.4) * (1 - smooth(t, RINGS_OFF - 0.6, RINGS_OFF + 0.3))
  if (rings > 0) {
    for (const [F, gap, big, layer] of [
      [1.6, 1.3, 0.016, 1],
      [2.4, 2.6, 0.03, 2],
    ] as const) {
      // Each chunk lives at a place along a near copy of the rings, and is drawn where the camera's travel puts it:
      // F times as far across the frame as the rings go.
      const lo = Math.floor((F * f.cx - W * 0.6) / gap) - 1
      const hi = Math.ceil((F * f.cx + W * 0.6) / gap) + 1
      for (let i = lo; i <= hi; i++) {
        if (hash(i, layer, 21) < 0.4) continue
        const xl = (i + hash(i, layer, 22)) * gap
        const x = xl + f.cx * (1 - F)
        const v = 0.4 + 0.08 * hash(i, layer, 23) + (layer === 2 ? 0.04 : 0)
        const y = f.cy + v * H
        const r = S * big * (0.45 + 0.55 * hash(i, layer, 24))
        const ice = hash(i, layer, 25) < 0.7
        chunk(ctx, x * k, y * k, r * k, t * (0.6 + hash(i, layer, 26)) * (hash(i, layer, 27) < 0.5 ? -1 : 1), i * 7 + layer, ice ? mixHex(DARK.hull, DARK.gold, 0.18) : mixHex(DARK.slate, DARK.gold, 0.3), rings * (layer === 1 ? 0.75 : 0.9), c.ink)
      }
    }
  }
  ctx.restore()
}
