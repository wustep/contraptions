import type p5 from 'p5'
import { mixHex, type PieceCtx } from '../../../../parts'
import { band, body, dayAt, farm, gustAt, haze, rows, sky, sunHeight, type Light } from './field'
import { fireworks, shellLight } from './fireworks'
import { beatAt } from './music'
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
  body(s, hy, 0.74, sunHeight(t), 0.042, dusk < 0.5 ? '#F7DC8E' : dusk < 0.85 ? '#F4A35E' : '#E8744A', '#F6D58A', 0.6 - 0.1 * dusk, 0.24)
  farm(s, hy, l.farm)
  band(s, hy, l.band)
  haze(s, hy, smooth(t, 34, 40.4), '#C7A07C')
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

/**
 * The night has its own arc, as the afternoon had the sun's: the moon climbs the sky through the chase, and the fair's
 * glow on the horizon swells with the full organ and settles for the photograph. The moon starts just over the fair's
 * floor, not on it: at the floor's height the booths at the drop passed over it.
 */
const moonHeight = (t: number): number => 0.5 + 0.17 * smooth(t, 41, 117)
/** The full organ comes in on beat 132: the glow flares on the beat and settles over a bar to the level it holds. */
const FULL = beatAt(132)
const glowAt = (t: number): number => smooth(t, FULL, FULL + 3) * (1 - smooth(t, 116, 120))
const flareAt = (t: number): number => (t < FULL ? smooth(t, FULL - 0.06, FULL) : Math.exp(-(t - FULL) / 0.9))

/**
 * The night's light at `t`, under a horizon at `horizon` of the frame. A shell's burst lights the field for a beat, its
 * colour on the tassels under it, so the landmarks land on the land as well as in the sky. (Not on the sky's glow: the
 * full organ's magenta is its own cue.)
 */
const nightAt = (t: number, horizon: number): Light => ({
  ...NIGHT,
  low: mixHex(mixHex(NIGHT.low, '#46325F', glowAt(t)), '#7E4E8E', 0.85 * flareAt(t)),
  mid: mixHex(NIGHT.mid, '#271F45', 0.6 * flareAt(t)),
  rows: { ...NIGHT.rows, flash: shellLight(t) },
  horizon,
})

export function nightLand(p: p5, c: PieceCtx, col: number, line: number, begin: number, horizon: (t: number) => number): void {
  const t = begin + c.t
  const s = screenOf(p, c, col, line)
  const l = nightAt(t, horizon(t))
  const hy = sky(s, l)
  stars(s, t, hy)
  body(s, hy, 0.17, moonHeight(t), 0.03, '#ECE6F7', '#B9B0E8', 0.22, 0.2, true)
  fireworks(s, t, hy)
  farm(s, hy, l.farm, '#E3B45C')
  band(s, hy, l.band)
  rows(s, t, hy, l.rows)
  done(s)
}

/**
 * The field in front of the fair, for the draw back: the same rows the backdrop has, drawn again over the machine
 * from the foot of the frame up to the horizon as `rise` goes from 0 to 1, so that as the camera draws back across the
 * field the fair is seen standing beyond it, and what hangs below the fair's floor (the ticket's paper) is in the corn.
 */
export function frontField(p: p5, c: PieceCtx, col: number, line: number, begin: number, horizon: (t: number) => number, rise: number): void {
  if (rise <= 0) return
  const t = begin + c.t
  const s = screenOf(p, c, col, line)
  const l = nightAt(t, horizon(t))
  const hy = s.cy + (l.horizon - 0.5) * s.f
  const top = Math.floor(hy + (1 - rise) * (s.h - hy + 2))
  s.ctx.beginPath()
  s.ctx.rect(0, top, s.w, s.h - top)
  s.ctx.clip()
  s.ctx.fillStyle = l.ground
  s.ctx.fillRect(0, top, s.w, s.h - top)
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
  const paths: Path2D[] = []
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
      const level = Math.min(LEVELS - 1, Math.round(a * LEVELS))
      const path = (paths[level] ??= new Path2D())
      path.moveTo(x + r, y)
      path.arc(x, y, r, 0, Math.PI * 2)
    }
  }
  // One fill a level of brightness, not one a star.
  paths.forEach((path, level) => {
    ctx.fillStyle = rgba('#E6E1F5', (level + 0.5) / LEVELS)
    ctx.fill(path)
  })
}

const LEVELS = 8
