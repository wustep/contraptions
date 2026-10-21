import type { Light } from '../../light'
import { M, onsetsIn } from '../../music'
import { hash, lit, smooth, type Paint, type Pt } from '../../paint'
import { BATH } from '../../geo'
import { head } from './flight'

/**
 * The paper birds: Zeniba's, cut out of white paper, a swarm of them at his heels all the way in over the sea, cutting
 * at him. When the shutter drops on them some go on into it, one a note, and lie flat against the wood a moment, then
 * peel away and go down like the paper they are; the rest lose their purpose at once and fall, fluttering, to the sea.
 */

const N = 34

/** When the shutter is down. */
export const SHUT = M.peak + 1.4
/** The ones that go on into the shutter, one a note, and where each strikes it. */
const SLAMS = onsetsIn(SHUT + 0.2, SHUT + 4.8, 0.45, 0.32).slice(0, 8)

interface Bird {
  lag: number
  r: number
  w: number
  ph: number
  slam: number | null
  at: Pt
  die: number
  size: number
}

const BIRDS: Bird[] = Array.from({ length: N }, (_, i) => {
  const slam = i < SLAMS.length ? SLAMS[i] : null
  return {
    lag: 0.18 + 1.5 * Math.pow(hash(i, 1), 1.3),
    r: 0.25 + 0.75 * hash(i, 2),
    w: (1.6 + 1.8 * hash(i, 3)) * (hash(i, 4) < 0.5 ? -1 : 1),
    ph: hash(i, 5) * Math.PI * 2,
    slam,
    at: [BATH.door2.x1 + 0.05, BATH.door2.top + 0.12 + 0.72 * hash(i, 6)],
    die: SHUT + 0.15 + 0.9 * hash(i, 7),
    size: 0.14 + 0.04 * hash(i, 8),
  }
})

/** In the swarm: behind his head by its lag, going round it; gathering at the door once he is through. */
function swarm(b: Bird, t: number): Pt {
  const [x, y] = head(Math.min(t - b.lag, M.peak - 0.12))
  const a = b.w * t + b.ph
  // Pressed up against the wall at the door, they cannot be inside it.
  const px = x + b.r * Math.cos(a)
  return [t > M.peak ? Math.max(BATH.door2.x1 + 0.08 + b.r * 0.3, px) : px, y + 0.6 * b.r * Math.sin(a)]
}

/** Where a bird is at `t`, its heading and how it lies (1 flying, 0 flat on the shutter), and how much of it is seen. */
function birdAt(b: Bird, t: number): { p: Pt; a: number; flat: number; seen: number } {
  if (b.slam !== null) {
    const go = b.slam - 0.32
    if (t < go) return { p: swarm(b, t), a: 0, flat: 0, seen: 1 }
    const from = swarm(b, go)
    if (t < b.slam) {
      const u = smooth(t, go, b.slam)
      return { p: [from[0] + (b.at[0] - from[0]) * u, from[1] + (b.at[1] - from[1]) * u], a: Math.PI, flat: u, seen: 1 }
    }
    // Flat on the wood a moment, then down, peeling away, fluttering, into the sea.
    const s = t - b.slam - 0.45
    if (s < 0) return { p: b.at, a: Math.PI, flat: 1, seen: 1 }
    const x = b.at[0] + 0.35 * s + 0.12 * Math.sin(s * 5 + b.ph)
    const y = b.at[1] + 0.6 * s * s + 0.4 * s
    return { p: [x, y], a: Math.PI + s * 3, flat: 1 - smooth(s, 0, 0.5), seen: 1 - smooth(s, 1.8, 3.2) }
  }
  if (t < b.die) return { p: swarm(b, t), a: 0, flat: 0, seen: 1 }
  // Their spell gone: falling like paper, fluttering, drifting off the wind, gone into the haze over the sea.
  const s = t - b.die
  const from = swarm(b, b.die)
  const x = from[0] + 0.5 * s * (0.4 + hash(b.lag * 100, 9)) + 0.15 * Math.sin(s * 4 + b.ph)
  const y = from[1] + 0.35 * s * s + 0.2 * s
  return { p: [x, y], a: s * 2.5 + b.ph, flat: 0, seen: 1 - smooth(s, 2.2, 3.6) }
}

/** The swarm, the ones at the shutter, the ones falling. */
export function drawBirds(g: Paint, L: Light): void {
  const { ctx, t, view: v } = g
  if (t < 99 || t > SHUT + 9) return
  const paper = lit('#F4F1E6', L.ambient, 0.4)
  const under = lit('#CFC7B2', L.ambient, 0.4)
  const edge = lit('#9A9282', L.ambient, 0.4)
  for (let i = 0; i < N; i++) {
    const b = BIRDS[i]
    const s = birdAt(b, t)
    if (s.seen <= 0.01) continue
    const [x, y] = s.p
    if (x < v.x0 - 0.5 || x > v.x1 + 0.5 || y < v.y0 - 0.5 || y > v.y1 + 0.5) continue
    // Which way it is going, to face it.
    const q = birdAt(b, t + 0.04).p
    const head = s.flat > 0.5 ? s.a : Math.atan2(q[1] - y, q[0] - x)
    const flap = Math.cos(t * 26 + b.ph * 3)
    const sz = b.size
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(head)
    // Flat on the shutter it is seen edge on, pressed to the wood: thin and long.
    ctx.scale(1 - 0.55 * s.flat, 1)
    ctx.globalAlpha = s.seen
    // The body: a narrow paper diamond, head to tail.
    ctx.beginPath()
    ctx.moveTo(sz * 0.7, 0)
    ctx.lineTo(0, -sz * 0.14)
    ctx.lineTo(-sz * 0.75, 0)
    ctx.lineTo(0, sz * 0.14)
    ctx.closePath()
    ctx.fillStyle = paper
    ctx.fill()
    ctx.strokeStyle = edge
    ctx.lineWidth = Math.max(1.25 * g.px, 0.008)
    ctx.stroke()
    // The wings: two triangles beating, the underside showing on the down stroke.
    const k = flap * (1 - s.flat)
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(sz * 0.2, 0)
      ctx.lineTo(-sz * 0.2, side * sz * 0.85 * (0.35 + 0.65 * Math.abs(k)))
      ctx.lineTo(-sz * 0.4, 0)
      ctx.closePath()
      ctx.fillStyle = side * k < 0 ? under : paper
      ctx.fill()
      ctx.stroke()
    }
    ctx.restore()
  }
}
