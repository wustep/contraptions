import type p5 from 'p5'
import { R } from '../../../../parts'
import { glow, hash, rgba, scenery, type EchoBall } from './kit'
import { muted } from './lens'

/**
 * The other road, drawn. The Epilogue is a "what if", and a what-if only reads against what was: so where the dream
 * rewrites the story, the story as it went is there too, for a few seconds, as an echo of him. Pale where he is
 * blue, its rim dashed and crawling, flickering the way old film does, and leaving a short wake of itself behind,
 * like a frame that has not quite gone from the screen. When it is done it comes apart into motes and goes up.
 *
 * Drawn over the room and the balls, under the covers. Every echo is the show's (`SebsShow.echoes`), so the checks
 * see what the picture sees.
 */

/** Him, as he was not: his blue gone to moonlight. */
export const ECHO = '#A9BCE0'
export const ECHO_RIM = '#E6EEFA'

export interface EchoesState {
  /** Every echo in the world at show time `t`, each with its index in the show's list as `id`. */
  at: (t: number) => (EchoBall & { id: number })[]
}

/** How many samples of its wake, and how far apart in time. */
const WAKE = 7
const WAKE_DT = 0.05

export function drawEcho(p: p5, k: number, weight: number, t: number, e: EchoBall, wake: EchoBall[]): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const gone = Math.max(0, Math.min(1, e.gone ?? 0))
  // Film flicker: the light through it is never quite steady.
  const flicker = 0.84 + 0.16 * hash(Math.floor(t * 14), 7, 3)
  const a = Math.max(0, Math.min(1, e.a)) * flicker
  if (a <= 0.01) return
  const d = 2 * R * k
  ctx.save()
  // Its wake: rings of where it just was, thinning, as a frame left on the screen.
  for (let i = 0; i < wake.length; i++) {
    const w = wake[i]
    const gap = Math.hypot(w.x - e.x, w.y - e.y)
    // Only a short wake: a fall leaves no string of rings behind it.
    if (gap < 0.04 || gap > 0.55) continue
    const f = 1 - (i + 1) / (wake.length + 1)
    ctx.strokeStyle = rgba(ECHO_RIM, a * (1 - gone) * 0.3 * f)
    ctx.lineWidth = weight * 0.7
    ctx.beginPath()
    ctx.arc(w.x * k, w.y * k, R * k * (1 - 0.06 * i), 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
  // The other world's colour comes with it. In the dream it is the room as it is showing through: a soft pocket of
  // grey round it, the colour drawn out there. In the room as it is it is the dream: a pocket of the dream's rose.
  {
    const m = muted(t)
    const pr = 0.9 * (1 + 0.5 * gone)
    const pa = Math.max(0, Math.min(1, e.a)) * (1 - gone ** 2)
    if (pa > 0.01) {
      ctx.save()
      const g = ctx.createRadialGradient(e.x * k, e.y * k, 0, e.x * k, e.y * k, pr * k)
      if (m < 0.5) {
        ctx.globalCompositeOperation = 'saturation'
        g.addColorStop(0, rgba('#808080', 0.85 * pa))
        g.addColorStop(0.5, rgba('#808080', 0.5 * pa))
        g.addColorStop(1, rgba('#808080', 0))
      } else {
        ctx.globalCompositeOperation = 'soft-light'
        g.addColorStop(0, rgba('#E46A9A', 1.0 * pa))
        g.addColorStop(0.5, rgba('#E46A9A', 0.6 * pa))
        g.addColorStop(1, rgba('#E46A9A', 0))
      }
      ctx.fillStyle = g
      ctx.fillRect((e.x - pr) * k, (e.y - pr) * k, 2 * pr * k, 2 * pr * k)
      ctx.restore()
    }
  }
  const body = 1 - gone
  if (body > 0.02) {
    const s = 1 - 0.35 * gone
    glow(p, k, e.x, e.y, 0.5, ECHO, 0.24 * a * body)
    ctx.save()
    ctx.translate(e.x * k, e.y * k)
    ctx.fillStyle = rgba(ECHO, 0.5 * a * body)
    ctx.beginPath()
    ctx.arc(0, 0, (d / 2) * s, 0, Math.PI * 2)
    ctx.fill()
    // A dark line under the rim, so it holds its edge on a pale ground (the map, the paper) as well as in the dark.
    ctx.strokeStyle = rgba('#0A0E1E', 0.4 * a * body)
    ctx.lineWidth = weight * 1.6
    ctx.stroke()
    // The rim, dashed, its dashes crawling round.
    ctx.setLineDash([d * 0.22, d * 0.15])
    ctx.lineDashOffset = -t * d * 0.5
    ctx.strokeStyle = rgba(ECHO_RIM, 0.92 * a * body)
    ctx.lineWidth = weight * 0.9
    ctx.stroke()
    ctx.setLineDash([])
    if (e.spin !== undefined) {
      ctx.fillStyle = rgba(ECHO_RIM, 0.9 * a * body)
      ctx.beginPath()
      ctx.arc(Math.cos(e.spin) * R * k * 0.48 * s, Math.sin(e.spin) * R * k * 0.48 * s, d * 0.1 * s, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
  // Coming apart: motes thrown out a little and drifting up as they fade.
  if (gone > 0 && gone < 1) {
    ctx.save()
    for (let j = 0; j < 11; j++) {
      const th = (j / 11) * Math.PI * 2 + hash(j, 2) * 0.6
      const out = R * (0.7 + (1.6 + 1.2 * hash(j, 3)) * Math.sqrt(gone))
      const x = e.x + Math.cos(th) * out
      const y = e.y + Math.sin(th) * out * 0.8 - (0.25 + 0.3 * hash(j, 4)) * gone
      const r = d * (0.07 + 0.04 * hash(j, 5)) * (1 - 0.6 * gone)
      ctx.fillStyle = rgba(ECHO_RIM, Math.max(0, Math.min(1, e.a)) * 0.85 * (1 - gone) ** 1.3)
      ctx.beginPath()
      ctx.arc(x * k, y * k, r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
}

/** Every echo in its place, standing for the whole show at the world's origin; laid over each place under its cover. */
export const echoes = scenery<EchoesState>({
  name: 'echoes',
  draw: () => {},
  over(p, s, c) {
    const now = s.at(c.t)
    if (!now.length) return
    const back = Array.from({ length: WAKE }, (_, i) => s.at(c.t - (i + 1) * WAKE_DT))
    for (const e of now) {
      const wake: EchoBall[] = []
      for (const b of back) {
        const w = b.find((x) => x.id === e.id)
        if (!w) break
        wake.push(w)
      }
      drawEcho(p, c.k, c.weight, c.t, e, wake)
    }
  },
})
