import type { Pt } from '../../../../parts'
import { clamp, disc, easeInOut, lerp, mix, poly, rgba, smooth, type Brush } from './brush'
import { GATE, ROAD } from './geo'
import { FORM, at, bar } from './music'
import { tones, windAt } from './look'

/**
 * The two on the road: a woman with a lantern and a shawl over her head, and her son, a boy of fifteen with a
 * bundle on his back, walking up from the valley in the rain to the gate. The storm puts their lantern out on the
 * first fortissimo; they go on in the dark; when the gate's lantern is lit and its bell has rung they look up and
 * see it, and climb to it, and are let in. Silhouettes: the night does not show faces.
 */

/** The road's length to each of its points, from its east end. */
const LENS: number[] = [0]
for (let i = 1; i < ROAD.length; i++) LENS.push(LENS[i - 1] + Math.hypot(ROAD[i][0] - ROAD[i - 1][0], ROAD[i][1] - ROAD[i - 1][1]))
export const ROAD_LENGTH = LENS[LENS.length - 1]

/** A place on the road, `s` cells from its east end, and which way the road runs there (+1 east, -1 west). */
export function onRoad(s: number): { p: Pt; dir: number } {
  const v = clamp(s, 0, ROAD_LENGTH)
  let i = 1
  while (i < LENS.length - 1 && LENS[i] < v) i++
  const f = (v - LENS[i - 1]) / (LENS[i] - LENS[i - 1])
  const [ax, ay] = ROAD[i - 1]
  const [bx, by] = ROAD[i]
  return { p: [lerp(ax, bx, f), lerp(ay, by, f)], dir: Math.sign(bx - ax) || -1 }
}

/** When the gust comes, and when the lantern is out: bar 40's fortissimo, and bar 41's. */
export const GUST = at(40, 0)
export const OUT = at(41, 0)
/** When they look up at the gate's light (bar 68), and when they go on toward it (bar 70). */
export const LOOK = at(68, 0)
export const CLIMB = at(70, 0)
/** At the door: bar 79. In: from bar 80. */
export const AT_GATE = at(79, 0)
export const IN = at(80, 0)

/** How far up the road she is, cells from its east end. The boy keeps two cells behind her. */
const PLAN: [number, number][] = [
  [0, 250],
  [bar(5), 262],
  [bar(8), 281],
  [bar(20), 300],
  [bar(24), 330],
  [GUST, 352],
  [OUT + 0.6, 353.5],
  [bar(44), 356],
  [LOOK - 2, 466],
  [LOOK, 468],
  [CLIMB, 468.5],
  [bar(76), 497],
  [AT_GATE, 507.5],
  [IN, 508.5],
  [IN + 1.2, 511.8],
]
export function along(t: number): number {
  if (t <= PLAN[0][0]) return PLAN[0][1]
  for (let i = 1; i < PLAN.length; i++) {
    if (t <= PLAN[i][0]) {
      const [t0, s0] = PLAN[i - 1]
      const [t1, s1] = PLAN[i]
      return s0 + (s1 - s0) * ((t - t0) / (t1 - t0))
    }
  }
  return PLAN[PLAN.length - 1][1]
}
/** How fast she is going, cells a second. */
const pace = (t: number): number => Math.abs(along(t + 0.05) - along(t - 0.05)) / 0.1

/** The lantern: lit, 0 to 1. */
export const theirLight = (t: number): number => 1 - smooth(t, OUT - 0.25, OUT + 0.1)

/** Where each of them is, and facing. */
export function woman(t: number): { p: Pt; dir: number } {
  return onRoad(along(t))
}
export function boy(t: number): { p: Pt; dir: number } {
  return onRoad(along(t) - 2.2)
}

/** How far into the doorway each has gone, 0 to 1 (`IN` on). */
const inside = (t: number, delay: number): number => smooth(t, IN + delay, IN + delay + 0.9)

interface Figure {
  x: number
  y: number
  dir: number
  /** Walk phase, radians. */
  phase: number
  /** How much of a stride, 0 standing to 1 walking. */
  stride: number
  /** Head lifted (looking up), 0 to 1. */
  up: number
  /** Gone into the doorway, 0 to 1. */
  gone: number
}

/** Her: a long skirt, a shawl over her head, the lantern held out before her. */
function drawWoman(b: Brush, t: number, f: Figure, dark: string, rim: string): void {
  const g = b.g
  const { x, y, dir } = f
  const bob = Math.abs(Math.sin(f.phase)) * 0.06 * f.stride
  const sway = Math.sin(f.phase) * 0.18 * f.stride
  const lean = 0.12 * f.stride
  const top = y - 6.3 + bob
  g.save()
  g.translate(x, y)
  g.scale(dir, 1)
  g.translate(-x, -y)
  // The skirt to the ground, its hem swinging with her steps.
  poly(b, [[x - 0.55 + lean, top + 2.4], [x + 0.45 + lean, top + 2.4], [x + 1.05 + sway, y], [x - 1.1 + sway * 0.6, y]], dark)
  // The body and the shawl over head and shoulders, a little bowed into the rain.
  const head: Pt = [x + 0.15 + lean * 2 + f.up * 0.05, top + 0.55 - f.up * 0.05]
  poly(b, [[x - 0.75 + lean, top + 2.7], [x - 0.55 + lean, top + 1.1], [head[0] - 0.42, head[1] - 0.2], [head[0] + 0.2, head[1] - 0.48], [head[0] + 0.5, head[1] + 0.05], [x + 0.6 + lean, top + 1.3], [x + 0.7 + lean, top + 2.7]], dark)
  disc(b, head[0] + 0.05, head[1], 0.4, dark)
  // The arm out with the lantern.
  const hx = x + 0.95 + lean
  const hy = top + 2.5 + Math.sin(f.phase * 2) * 0.05
  g.strokeStyle = dark
  g.lineWidth = 0.28
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(x + 0.35 + lean, top + 1.45)
  g.lineTo(hx, hy)
  g.stroke()
  g.restore()
  // The lantern (in the world's hand, not mirrored): swinging below her hand.
  const lx = x + dir * (0.95 + lean)
  const ly = hy
  const swing = (Math.sin(f.phase) * 0.25 * f.stride + (windAt(t) - 0.1) * 1.2 * Math.sin(t * 2.7)) * (t > GUST - 0.3 && t < OUT + 1.5 ? 2.2 : 1)
  const lit = theirLight(t)
  g.save()
  g.translate(lx, ly)
  g.rotate(swing)
  g.strokeStyle = dark
  g.lineWidth = Math.max(b.px, 0.05)
  g.beginPath()
  g.moveTo(0, 0)
  g.lineTo(0, 0.4)
  g.stroke()
  poly(b, [[-0.24, 0.4], [0.24, 0.4], [0.2, 1.05], [-0.2, 1.05]], dark)
  poly(b, [[-0.16, 0.5], [0.16, 0.5], [0.13, 0.95], [-0.13, 0.95]], lit > 0 ? mix(dark, '#EDBE6A', lit) : mix(dark, rim, 0.3))
  if (lit > 0.02) {
    g.globalAlpha = lit
    poly(b, [[0, 0.55], [0.05, 0.78], [0, 0.88], [-0.05, 0.78]], '#F6DC9A')
    g.globalAlpha = 1
  }
  g.restore()
  // Her lantern's light on her: the near edge of her skirt and shawl warmed, and a pool at her feet.
  if (lit > 0.02) {
    g.fillStyle = rgba('#EDBE6A', 0.16 * lit)
    g.beginPath()
    g.ellipse(lx, y + 0.1, 2.4, 0.3, 0, 0, Math.PI * 2)
    g.fill()
  }
}

/** The boy: a cap, a short coat, trousers, legs that show, a bundle on his back. */
function drawBoy(b: Brush, f: Figure, dark: string): void {
  const g = b.g
  const { x, y, dir } = f
  const bob = Math.abs(Math.sin(f.phase)) * 0.07 * f.stride
  const top = y - 5.5 + bob
  g.save()
  g.translate(x, y)
  g.scale(dir, 1)
  g.translate(-x, -y)
  // Legs.
  const lean = 0.15 * f.stride
  const swing = Math.sin(f.phase) * 0.42 * f.stride
  g.strokeStyle = dark
  g.lineCap = 'round'
  g.lineWidth = 0.34
  const hip: Pt = [x + lean * 0.5, top + 3.0]
  g.beginPath()
  g.moveTo(hip[0], hip[1])
  g.lineTo(hip[0] + Math.sin(swing) * 2.4, hip[1] + Math.cos(swing) * 2.45)
  g.moveTo(hip[0], hip[1])
  g.lineTo(hip[0] - Math.sin(swing) * 2.4, hip[1] + Math.cos(swing) * 2.45)
  g.stroke()
  // Coat, bundle, head, cap.
  poly(b, [[x - 0.55 + lean, top + 3.2], [x - 0.45 + lean, top + 1.05], [x + 0.45 + lean, top + 1.05], [x + 0.6 + lean, top + 3.2]], dark)
  poly(b, [[x - 1.15 + lean, top + 1.2], [x - 0.35 + lean, top + 1.0], [x - 0.3 + lean, top + 2.3], [x - 1.05 + lean, top + 2.4]], dark)
  const hx = x + 0.12 + lean * 1.6
  const hy = top + 0.55 - f.up * 0.08
  disc(b, hx, hy, 0.36, dark)
  poly(b, [[hx - 0.42, hy - 0.12], [hx + 0.5 + f.up * 0.05, hy - 0.2 - f.up * 0.1], [hx + 0.3, hy - 0.42], [hx - 0.36, hy - 0.4]], dark)
  // His arm, swinging.
  g.lineWidth = 0.24
  g.beginPath()
  g.moveTo(x + 0.2 + lean, top + 1.35)
  g.lineTo(x + 0.2 + lean + Math.sin(-swing * 0.8) * 1.5, top + 1.35 + Math.cos(swing * 0.8) * 1.45)
  g.stroke()
  g.restore()
}

function figure(t: number, which: 'woman' | 'boy'): Figure {
  const w = which === 'woman' ? woman(t) : boy(t)
  const s = along(t) - (which === 'boy' ? 2.2 : 0)
  const stride = clamp(pace(t) / 1.6)
  const up = smooth(t, LOOK + (which === 'boy' ? 0.5 : 0), LOOK + 1.6) * (1 - smooth(t, CLIMB + 1.2, CLIMB + 3)) + smooth(t, AT_GATE - 1, AT_GATE + 0.4) * 0.4 * (1 - smooth(t, IN, IN + 0.5))
  // At the door they turn to face it: west, toward the doorway.
  const dir = t > AT_GATE - 0.5 ? -1 : w.dir
  return { x: w.p[0], y: w.p[1], dir, phase: s * 1.45, stride, up, gone: inside(t, which === 'boy' ? 0.45 : 0) }
}

/** Both of them, the boy a step behind. */
export function drawTravelers(b: Brush, t: number): void {
  if (t > IN + 2.2) return
  const c = tones(t)
  const dark = mix(c.ink, '#000000', 0.25)
  const rim = mix(c.skyLow, c.ink, 0.4)
  const wf = figure(t, 'woman')
  const bf = figure(t, 'boy')
  for (const [f, draw] of [[bf, () => drawBoy(b, bf, dark)], [wf, () => drawWoman(b, t, wf, dark, rim)]] as const) {
    if (f.gone >= 1) continue
    b.g.globalAlpha = 1 - f.gone * 0.9
    draw()
    b.g.globalAlpha = 1
  }
}

/** Where to look in a shot of them: between the two, at chest height. */
export function theirMiddle(t: number): Pt {
  const w = woman(t).p
  const bb = boy(t).p
  return [(w[0] + bb[0]) / 2, (w[1] + bb[1]) / 2 - 3.2]
}

export { FORM, GATE, easeInOut }
