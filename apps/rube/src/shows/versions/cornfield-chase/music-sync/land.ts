import type p5 from 'p5'
import type { PieceCtx } from '../../../../parts'
import { band, body, dayAt, dust, farm, gustAt, rows, sky, sunHeight, type Light } from './field'
import { fireworks } from './fireworks'
import { done, hash, rgba, screenOf, smooth, type Screen } from './screen'

/**
 * The land behind the machine, by day and by night. `col`, `row` is where the scenery is placed (the stage hands its
 * drawing the canvas translated there), and `begin` is the show time its universe begins.
 */

export function dayLand(p: p5, c: PieceCtx, col: number, line: number, begin: number): void {
  const t = begin + c.t
  const s = screenOf(p, c, col, line)
  const l = dayAt(t)
  const hy = sky(s, l)
  const dusk = smooth(t, 30, 40.6)
  body(s, hy, 0.74, sunHeight(t), 0.042, dusk < 0.5 ? '#F7DC8E' : dusk < 0.85 ? '#F4A35E' : '#E8744A', '#F6D58A', 0.55 - 0.1 * dusk, 0.32)
  farm(s, hy, l.farm)
  band(s, hy, l.band)
  dust(s, t, hy, smooth(t, 34, 40.4), '#C7A07C')
  rows(s, t, hy, { ...l.rows, wind: (x) => gustAt(t, x) })
  done(s)
}

/** The night's light: the fair's glow low on the sky, the rows dark against it, their tassels touched by the moon. */
const NIGHT: Light = {
  top: '#09081A',
  mid: '#15132A',
  low: '#2C2350',
  ground: '#0F0D21',
  band: '#0B0A19',
  farm: '#0A0917',
  rows: { near: '#0A0918', far: '#1D1938', line: '#3B3568', ink: 0.75, lean: 0.03, gust: 0 },
  horizon: 0.8,
}

export function nightLand(p: p5, c: PieceCtx, col: number, line: number, begin: number, horizon: (t: number) => number): void {
  const t = begin + c.t
  const s = screenOf(p, c, col, line)
  const l = { ...NIGHT, horizon: horizon(t) }
  const hy = sky(s, l)
  stars(s, t, hy)
  body(s, hy, 0.17, 0.62, 0.03, '#ECE6F7', '#B9B0E8', 0.22, 0.2, l.mid)
  fireworks(s, t, hy)
  farm(s, hy, l.farm, '#E3B45C')
  band(s, hy, l.band)
  rows(s, t, hy, l.rows)
  done(s)
}

/** The stars, barely moving: a scatter over the whole sky that twinkles, thinning toward the horizon's glow. */
function stars(s: Screen, t: number, hy: number): void {
  const { ctx, cx, cy, f, w } = s
  const q = 0.025
  const at = (s.camX * q) / 8
  const step = 0.075
  const top = cy - 0.5 * f
  const i0 = Math.floor((at - w / 2 / f) / step) - 1
  const i1 = Math.ceil((at + w / 2 / f) / step) + 1
  const j0 = Math.floor(-top / f / step) - 1
  const j1 = Math.ceil((hy - top) / f / step)
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      const key = i * 131 + j
      const x = cx + (i * step + hash(key, 1) * step - at) * f
      const y = top + (j * step + hash(key, 2) * step) * f
      if (y > hy - f * 0.03) continue
      const low = smooth(y, hy - f * 0.35, hy - f * 0.03)
      const twinkle = 0.65 + 0.35 * Math.sin(t * (1.3 + hash(key, 3) * 2.4) + key)
      const a = (0.25 + 0.6 * hash(key, 4) ** 2) * twinkle * (1 - 0.8 * low)
      const r = f * (0.0011 + 0.0024 * hash(key, 5) ** 3)
      ctx.fillStyle = rgba('#E6E1F5', a)
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
