import type p5 from 'p5'
import { clamp } from '../../../../../../../../src/core/ease'
import { mixHex, type Pt } from '../../../../../parts'
import { frame, hash, scenery } from '../kit'
import { prefersCalm } from '../film'
import { lightColor } from './finale-draw'
import { DURATION } from '../music'
import { PORT, SWELL, windowLight } from './finale-plan'
import { LIGHTS as ROOM_LIGHTS, ROOM } from './set'

/**
 * The last shot: of all of them, this one.
 *
 * Under the credits the camera has come in close on the washer's window, and the lives she went through have passed
 * once through its glass. On the window's swell the three of them look at one another. Then the camera draws back,
 * and goes on drawing back: out of the shop, which sinks into the night with only its washer's window still lit, and
 * on, until the night is full of other lit windows. Every one is a laundromat somewhere, in another life, its own
 * window lit: some warm like this one, some in the colours of the lives she flew through (the premiere's red, the
 * dojo's amber, the romance's pink, the kitchen's orange, the rocks' sand, the dark's violet), a few with all their
 * tubes still on, someone working late.
 *
 * They are seen as a dolly out sees them, in depth. Each stands at its own distance behind the shop, so the near ones
 * sweep in from the frame's edges and the far ones barely move, and they light up as she looks out, the nearest
 * first. Where they come to rest, they make a ring: the everything bagel again, the shape that held nothing, made
 * now of every life's lit window, with home in its hole. Then the end's dark (`credits.ts`) takes them, this window
 * last.
 *
 * Over the room and the family (an `over` drawing), under the credits' bed and the end's dark. For a viewer who has
 * asked to reduce motion, the windows do not sweep in: each is where it will rest from the start, and only lights.
 */

/** The draw back starts a beat after the swell, when they have looked at one another; it comes to rest here. */
export const PULL_FROM = SWELL + 1.05
export const PULL_TO = 326.6
/** How many cells the frame is top to bottom as the draw back starts, close on the window, and at its end (a 16:9 frame). */
export const CLOSE = 2.58
export const FAR = 420
/**
 * How far back the camera has drawn at `t`, as the frame's height in cells: evenly in scale, easing out of the close
 * shot and into the last, and a little further on to the end.
 */
export function pullAt(t: number): number {
  if (t <= PULL_FROM) return CLOSE
  if (t >= PULL_TO) return FAR * Math.pow(1.05, clamp((t - PULL_TO) / (DURATION - PULL_TO)))
  return CLOSE * Math.pow(FAR / CLOSE, smooth((t - PULL_FROM) / (PULL_TO - PULL_FROM)))
}
/**
 * How far the stage's own camera goes with it. Seen whole from far off, the shop is every drawing in the laundromat at
 * once, and that is more than a slow machine can draw sixty times a second. But by then it has gone down into the night
 * under the veil, so the stage's camera eases to a stop at about `HELD` cells, out of sight, and the windows go on as
 * the draw back would show them (`pullAt`, scaled to the stage's frame): only they are seen moving.
 */
const HELD = 36
export const cameraCellsAt = (t: number): number => {
  const d = pullAt(t)
  return d / Math.pow(1 + Math.pow(d / HELD, 4), 0.25)
}
/** How much further back the windows are seen from than the stage's camera is: 1 while the shop can still be seen. */
const beyond = (t: number): number => pullAt(t) / cameraCellsAt(t)

/** The night the shop sinks into: over the room, outside a soft opening at the window and the family below it. */
const NIGHT = '#07090A'
/** How far the shop has gone down into the night at `t`, 0..1: all of it before the stage's camera stops. */
export const veilAt = (t: number): number => smooth((t - (PULL_FROM + 2.4)) / 4.6)
/** The opening the veil leaves: round the window and the family at its foot, in cells. */
const HOLE: Pt = [PORT[0], PORT[1] + 0.22]
const HOLE_R = 0.95
/** The opening's radius in cells at `t`: it closes as the camera stops, where the window from afar takes over. */
const holeAt = (t: number): number => (HOLE_R / beyond(t)) * (1 - smooth((beyond(t) - 1.08) / 0.5))

/** How dark the veil leaves (x, y) at `t`: for what draws over it (the googly eyes). */
export const veilHere = (t: number, x: number, y: number): number => {
  const v = veilAt(t)
  if (v <= 0) return 0
  const r = holeAt(t)
  if (r <= 0.001) return v
  return v * smooth((Math.hypot(x - HOLE[0], y - HOLE[1]) - r * 0.55) / (r * 0.45))
}
// Once the night covers it all, the room is not drawn at all: nothing of it can be seen.
ROOM_LIGHTS.hidden = (t: number): boolean => veilAt(t) >= 0.9995 && holeAt(t) <= 0.001

export const veilShade = (hex: string, t: number, x: number, y: number): string => {
  const d = veilHere(t, x, y)
  return d <= 0.001 ? hex : mixHex(hex, NIGHT, d)
}

function smooth(u: number): number {
  const x = clamp(u)
  return x * x * (3 - 2 * x)
}

/* ------------------------------------------------------------------ the windows */

/** The lit windows' colours: this one's warm light most of all, and the lives she went through. */
const WARM = lightColor(1)
const TINTS: { color: string; share: number }[] = [
  { color: WARM, share: 0.42 },
  // A shop with its tubes still on, someone working late: the room's mint, lit.
  { color: '#D6F0DE', share: 0.1 },
  // The premiere's red carpet, the dojo's lamplight, the romance's pink, the kitchen's flame, the rocks' sand, the dark.
  { color: '#FF8A72', share: 0.09 },
  { color: '#F4C467', share: 0.1 },
  { color: '#F7AACB', share: 0.08 },
  { color: '#FFA45C', share: 0.08 },
  { color: '#EBD8B4', share: 0.07 },
  { color: '#B9A2F5', share: 0.06 },
]

interface Light {
  /** Where it comes to rest at the end of the draw back, in frame heights from the frame's middle. */
  s: Pt
  /** Its distance behind the shop, in the same units as the camera's (cells of frame height). */
  z: number
  tint: number
  /** When it lights, show seconds. */
  on: number
  /** Its own brightness, and a slow breath's phase. */
  b: number
  phase: number
}

const COUNT = 1150
const RING = { rx: 0.6, ry: 0.255, tilt: -0.1, cy: 0.035 }

const LIGHTS: Light[] = (() => {
  const out: Light[] = []
  for (let i = 0; i < COUNT; i++) {
    const h = (n: number) => hash(i, n, 7171)
    let s: Pt
    if (h(1) < 0.58) {
      // On the ring: round an ellipse, tilted a little, thick as a bagel is, thicker at its sides than top and bottom.
      const a = h(2) * Math.PI * 2
      const g = gauss(h(3), h(4))
      const g2 = gauss(h(5), h(6))
      const thick = 0.034 + 0.02 * Math.abs(Math.cos(a))
      const x = Math.cos(a) * (RING.rx + g * thick * 1.4)
      const y = Math.sin(a) * (RING.ry + g * thick * 0.6) + g2 * thick * 0.35
      const c = Math.cos(RING.tilt)
      const sn = Math.sin(RING.tilt)
      s = [x * c - y * sn, RING.cy + x * sn + y * c]
    } else {
      // Scattered through the dark, thinning out from the middle, and none in the ring's hole close round home.
      const a = h(2) * Math.PI * 2
      const r = 0.16 + 1.05 * Math.pow(h(3), 0.8)
      s = [Math.cos(a) * r * 1.25, Math.sin(a) * r * 0.85]
    }
    // Depth: from just behind the shop to far beyond the end's own distance, evenly in its logarithm.
    const z = 15 * Math.pow(360, h(7))
    let tint = 0
    let pick = h(8)
    for (let j = 0; j < TINTS.length; j++) {
      pick -= TINTS[j].share
      if (pick <= 0 || j === TINTS.length - 1) {
        tint = j
        break
      }
    }
    // They light as she looks out: the nearest to home first, out to the frame's edges, over ten seconds.
    const reach = Math.hypot(s[0] / 1.25, s[1] / 0.85)
    const on = PULL_FROM + 4.2 + 6.4 * clamp(reach / 1.25) + 1.2 * (h(9) - 0.5)
    out.push({ s, z, tint, on, b: 0.6 + 0.4 * h(10), phase: h(11) * Math.PI * 2 })
  }
  return out
})()

function gauss(u: number, v: number): number {
  return Math.sqrt(-2 * Math.log(Math.max(1e-6, u))) * Math.cos(2 * Math.PI * v)
}

/** A soft light, drawn once a tint into a small canvas, white at its heart: what each window is from far off. */
let SPRITES: HTMLCanvasElement[] | null = null
const SPRITE = 64
function sprites(): HTMLCanvasElement[] | null {
  if (SPRITES) return SPRITES
  if (typeof document === 'undefined') return null
  SPRITES = TINTS.map(({ color }) => {
    const c = document.createElement('canvas')
    c.width = c.height = SPRITE
    const g = c.getContext('2d')!
    const m = SPRITE / 2
    const grad = g.createRadialGradient(m, m, 0, m, m, m)
    grad.addColorStop(0, mixHex(color, '#FFFFFF', 0.75))
    grad.addColorStop(0.12, mixHex(color, '#FFFFFF', 0.3))
    grad.addColorStop(0.28, color)
    grad.addColorStop(0.5, rgba(color, 0.32))
    grad.addColorStop(1, rgba(color, 0))
    g.fillStyle = grad
    g.fillRect(0, 0, SPRITE, SPRITE)
    return c
  })
  return SPRITES
}

function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${clamp(a)})`
}

/** A window's glow, in its own plane's cells: the glass and the light round it, as seen from across a street. */
const GLOW = 1.5

export const multitude = scenery<null>({
  name: 'multitude',
  draw: () => {},
  over: (p: p5, _s, c) => {
    const t = c.t
    if (t < PULL_FROM) return
    const { k } = c
    const f = frame(p, k)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    // The stage's frame's height in the shop's cells (a 16:9 frame, read off its width), and how far back the windows
    // are seen from, in the same measure: further than the stage's camera once it has stopped.
    const D = ((f.x1 - f.x0) * 9) / 16
    const V = D * beyond(t)
    const veil = veilAt(t)
    ctx.save()
    if (veil > 0.001) {
      // The shop and the street go down into the night, all but the window and the three of them under it.
      const hole = holeAt(t)
      ctx.fillStyle = rgba(NIGHT, veil)
      if (hole > 0.001) {
        const g = ctx.createRadialGradient(HOLE[0] * k, HOLE[1] * k, hole * 0.55 * k, HOLE[0] * k, HOLE[1] * k, hole * k)
        g.addColorStop(0, rgba(NIGHT, 0))
        g.addColorStop(1, rgba(NIGHT, veil))
        ctx.fillStyle = g
      }
      ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
    }
    const art = sprites()
    if (!art) {
      ctx.restore()
      return
    }
    const calm = prefersCalm()
    // One pixel, in cells: the least a light is drawn, so a far one is a point and not nothing.
    const px = 1 / k
    const halfW = (f.x1 - f.x0) / 2 + 2
    const halfH = (f.y1 - f.y0) / 2 + 2
    const mx = (f.x0 + f.x1) / 2
    const my = (f.y0 + f.y1) / 2
    for (const L of LIGHTS) {
      const up = smooth((t - L.on) / 0.9)
      if (up <= 0.002) continue
      // Where it is in the shop's cells: its own place, seen from the draw back's distance; calm, already where it will
      // rest in the frame, and as big as it will be there.
      const q = calm ? 1 : (FAR + L.z) / (V + L.z)
      const x = PORT[0] + L.s[0] * q * D
      const y = PORT[1] + L.s[1] * q * D
      if (Math.abs(x - mx) > halfW || Math.abs(y - my) > halfH) continue
      // How big: its glow in its own plane, at its distance; never less than a point.
      const near = calm ? D / (FAR + L.z) : D / (V + L.z)
      const r = GLOW * near
      const shown = Math.max(r, 3.6 * px)
      // A point is dimmer for being small, and far ones are dimmer still, through the night's haze.
      const haze = 1 / (1 + L.z / 7000)
      const breath = 1 + 0.1 * Math.sin(t * 0.7 + L.phase)
      // Behind the shop until it has gone into the night: not seen through it.
      const behind = x > ROOM.x0 - 0.3 && x < ROOM.x1 + 0.3 && y > ROOM.ceiling - 0.4 && y < 0.6 ? veil * veil * veil : 1
      const a = up * L.b * haze * breath * behind
      ctx.globalAlpha = clamp(a)
      const size = shown * 2 * k
      ctx.drawImage(art[L.tint], x * k - size / 2, y * k - size / 2, size, size)
      ctx.globalAlpha = 1
    }
    // And this one: the window she is home in, from afar, as the others are.
    const own = smooth((t - (PULL_FROM + 5.5)) / 3)
    if (own > 0.002) {
      const w = windowLight(t)
      const r = Math.max((0.55 * D) / V, 9 * px)
      ctx.globalAlpha = clamp(own * Math.min(1, w.a * 1.15))
      ctx.drawImage(art[0], PORT[0] * k - r * k, PORT[1] * k - r * k, 2 * r * k, 2 * r * k)
      ctx.globalAlpha = 1
    }
    ctx.restore()
  },
})
