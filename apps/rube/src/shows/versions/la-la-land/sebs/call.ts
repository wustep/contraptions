import type p5 from 'p5'
import type { Pt } from '../../../../parts'
import { glow, rgba, smooth } from './kit'
import { keyX } from './club/geometry'

/**
 * His playing, reaching her: each note of the melody lifts off the strings over its key (in the piano's frame) as a
 * bead of light and goes out to her in an arc, to where she will be when it gets there, and goes into her, warming her
 * a moment; the notes of a phrase are strung together as a thread. At Lipton's it is what draws her across the room;
 * at Seb's, now, it is what she knows the theme by, and lifts her eyes to.
 */
/** A call's drawing, and its notes in flight (for the checks): where each is at `t`, how much of it is there, and where it is going. */
export interface Call {
  (p: p5, k: number, t: number): void
  beads: (t: number) => { x: number; y: number; a: number; to: Pt; u: number; arrive: number }[]
}

export function call(notes: { t: number; midi: number }[], her: (t: number) => Pt, color: string, size = 1): Call {
  const beads = notes.map((n) => {
    const from: Pt = [keyX(n.midi), -0.72]
    const to = her(n.t)
    const dist = Math.hypot(to[0] - from[0], to[1] - from[1])
    return { t: n.t, from, trip: Math.max(0.7, Math.min(3.6, dist / 3.4)), lift: 0.9 + 0.11 * dist }
  })
  const at = (c: (typeof beads)[number], t: number): { x: number; y: number; a: number } | null => {
    const s = t - c.t
    if (s < 0 || s > c.trip) return null
    const u = s / c.trip
    const e = 1 - (1 - u) ** 1.7
    const to = her(c.t + c.trip)
    const mx = (c.from[0] + to[0]) / 2
    const my = Math.min(c.from[1], to[1]) - c.lift
    const a1 = 1 - e
    const x = a1 * a1 * c.from[0] + 2 * a1 * e * mx + e * e * to[0]
    const y = a1 * a1 * c.from[1] + 2 * a1 * e * my + e * e * (to[1] - 0.02) + 0.03 * Math.sin(s * 7 + c.t)
    return { x, y, a: Math.min(1, s / 0.08) * (1 - smooth(u, 0.78, 1)) }
  }
  const draw = (p: p5, k: number, t: number) => {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    ctx.lineCap = 'round'
    for (let i = 1; i < beads.length; i++) {
      if (beads[i].t - beads[i - 1].t > 0.8) continue
      const a = at(beads[i - 1], t)
      const b = at(beads[i], t)
      if (!a || !b) continue
      ctx.strokeStyle = rgba(color, 0.32 * Math.min(a.a, b.a))
      ctx.lineWidth = 0.014 * size * k
      ctx.beginPath()
      ctx.moveTo(a.x * k, a.y * k)
      ctx.lineTo(b.x * k, b.y * k)
      ctx.stroke()
    }
    for (const c of beads) {
      const q = at(c, t)
      if (!q) continue
      for (let i = 1; i <= 4; i++) {
        const b = at(c, t - i * 0.035)
        if (!b) break
        ctx.fillStyle = rgba(color, 0.22 * b.a * (1 - i / 5))
        ctx.beginPath()
        ctx.arc(b.x * k, b.y * k, 0.03 * size * (1 - i * 0.12) * k, 0, Math.PI * 2)
        ctx.fill()
      }
      glow(p, k, q.x, q.y, 0.28 * size, color, 0.55 * q.a)
      ctx.fillStyle = rgba('#FFF6E2', 0.95 * q.a)
      ctx.beginPath()
      ctx.arc(q.x * k, q.y * k, 0.045 * size * k, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
    // Where they reach her, a warmth on her that lingers a moment.
    let warm = 0
    for (const c of beads) {
      const s = t - (c.t + c.trip * 0.85)
      if (s > 0 && s < 1.2) warm = Math.max(warm, Math.exp(-s / 0.4))
    }
    if (warm > 0.02) {
      const [mx, my] = her(t)
      glow(p, k, mx, my, 0.45 * Math.max(0.6, size), color, 0.35 * warm)
    }
  }
  return Object.assign(draw, {
    beads: (t: number) => {
      const out: { x: number; y: number; a: number; to: Pt; u: number; arrive: number }[] = []
      for (const c of beads) {
        const q = at(c, t)
        if (q) out.push({ ...q, to: her(c.t + c.trip), u: (t - c.t) / c.trip, arrive: c.t + c.trip })
      }
      return out
    },
  })
}
