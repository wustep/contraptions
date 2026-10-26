import type p5 from 'p5'
import { mixHex, type PieceCtx } from '../../../../parts'
import { band, body, dayAt, farm, gustAt, haze, nightWind, rows, sky, sunHeight, type Light } from './field'
import { farmwork } from './farmwork'
import { fireworks, shellLight, smoke } from './fireworks'
import { FULL, tiltAt } from './lens'
import { balloons, midway, midwayAt } from './midway'
import { nearCorn } from './near'
import { DROP, LAST, ORGAN } from './music'
import { done, hash, rgba, screenOf, smooth, type Screen } from './screen'
import { birds, clouds, drone, shadows } from './sky'

/**
 * The land behind the machine, by day and by night. `col`, `row` is where the scenery is placed (the stage hands its
 * drawing the canvas translated there), and `begin` is the show time its universe begins.
 */

export function dayLand(p: p5, c: PieceCtx, col: number, line: number, begin: number): void {
  const t = begin + c.t
  const s = screenOf(p, c, col, line)
  // The opening looks up into the sky and tilts down into the field (`lens.ts`): the land comes up with the machine.
  s.cy += tiltAt(t) * s.f
  const l = dayAt(t)
  const hy = sky(s, l)
  const dusk = smooth(t, 30, 40.6)
  // The sun goes from gold through amber to red as it sets, shading over, not stepping from one to the next (it did, at
  // 35 and 38 s, a jump in its colour each time).
  const sun = mixHex(mixHex('#F7DC8E', '#F4A35E', smooth(dusk, 0.3, 0.7)), '#E8744A', smooth(dusk, 0.7, 0.95))
  body(s, hy, 0.74, sunHeight(t), 0.042, sun, { color: '#F6D58A', a: 0.26 - 0.06 * dusk, r: 0.15 })
  clouds(s, t, hy, { ...l.cloud, sky: l.low, alpha: 0.9 })
  const ink = mixHex('#46423A', '#3A2A32', smooth(t, ORGAN - 3, 40))
  drone(s, t, hy, ink, l.low)
  farm(s, hy, l.farm, undefined, t * 1.3)
  band(s, hy, l.band)
  haze(s, hy, smooth(t, 34, 40.4), '#C7A07C')
  const among = farmwork(s, t, { near: l.rows.near, far: l.rows.far, dusk: smooth(t, ORGAN - 4, 40.6) }, gustAt(t, 0.5))
  rows(s, t, hy, { ...l.rows, wind: (x) => gustAt(t, x), among })
  // The high clouds' shadows go over the rows; low sun, long and faint, then none.
  shadows(s, t, hy, '#41502A', 1 - smooth(t, ORGAN - 6, ORGAN + 2))
  birds(s, t, hy, ink)
  done(s)
}

/** The corn at the foot of the frame by day, in front of the machine (`near.ts`). */
export function dayNear(p: p5, c: PieceCtx, col: number, line: number, begin: number): void {
  const t = begin + c.t
  const s = screenOf(p, c, col, line)
  s.cy += tiltAt(t) * s.f
  const dusk = smooth(t, ORGAN - 4, 40.6)
  nearCorn(s, t, mixHex('#5A7A3C', '#4B3238', dusk), mixHex('#3F5A2A', '#352229', dusk), (x) => gustAt(t, x))
  done(s)
}

/** The night's light: the fair's glow low on the sky, the rows dark against it, their tassels touched by the moon. */
const NIGHT: Light = {
  top: '#09081A',
  mid: '#15132A',
  low: '#25254F',
  ground: '#0F0D21',
  band: '#0B0A19',
  farm: '#0A0917',
  rows: { near: '#0A0918', far: '#1D1938', line: '#3B3568', ink: 0.75, lean: 0.03, gust: 1 },
  horizon: 0.8,
  // Lit from under by the fair: dark over, its glow along their foot.
  cloud: { body: '#1A1731', base: '#33284F' },
}

/**
 * The night has its own arc, as the afternoon had the sun's: the moon climbs the sky through the chase, and the fair's
 * glow on the horizon swells with the full organ and settles for the photograph. The moon keeps to the high sky on the
 * right, which the chase's floors leave clear as the camera climbs them: on the left, low, the booths' frames and rails
 * went past in front of it and one stood under it like a cup on a stem.
 */
const MOON_X = 0.85
const moonHeight = (t: number): number => 0.64 + 0.05 * smooth(t, 41, 117)
/**
 * The fair's glow on the sky, from the midway's lights: a little from the drop, more as each ride comes on, all of it
 * once the full organ has the whole midway lit. On beat 132 it flares as well, and settles over a bar.
 */
const glowAt = (t: number): number => 0.25 * smooth(t, 41.5, DROP + 0.5) + 0.75 * midwayAt(t)
const flareAt = (t: number): number => (t < FULL ? smooth(t, FULL - 0.06, FULL) : Math.exp(-(t - FULL) / 0.9))

/**
 * The blue hour, for the photograph: from the last hit the night goes toward a deep dawn blue from the horizon up,
 * the fair's lights still on in it and the stars thinning low down, so the long exposure is taken in a light of its
 * own, not the chase's.
 */
export const dawnAt = (t: number): number => smooth(t, LAST, 126.4)

/**
 * The night's light at `t`, under a horizon at `horizon` of the frame. A shell's burst lights the field for a beat, its
 * colour on the tassels under it, so the landmarks land on the land as well as in the sky. (Not on the sky's glow: the
 * full organ's magenta is its own cue.)
 */
const nightAt = (t: number, horizon: number): Light => {
  const dawn = dawnAt(t)
  return {
    ...NIGHT,
    top: mixHex(NIGHT.top, '#0B1430', 0.7 * dawn),
    mid: mixHex(mixHex(NIGHT.mid, '#271F45', 0.6 * flareAt(t)), '#1A2B52', dawn),
    // The chase under the moon, blue-violet; the full organ under the midway's light, warmer, toward rose.
    low: mixHex(mixHex(mixHex(NIGHT.low, '#56345F', glowAt(t)), '#7E4E8E', 0.85 * flareAt(t)), '#7187B2', 0.9 * dawn),
    // The tassels catch the midway's light as it comes on, and go cool with the dawn.
    rows: {
      ...NIGHT.rows,
      line: mixHex(mixHex(NIGHT.rows.line, '#6E4F7C', 0.55 * glowAt(t)), '#4C6088', dawn),
      flash: shellLight(t),
    },
    // The clouds' undersides take the midway's light as it comes on, and the dawn's.
    cloud: { body: mixHex(NIGHT.cloud.body, '#1B2443', dawn), base: mixHex(mixHex(NIGHT.cloud.base, '#5C3A63', glowAt(t)), '#3D5079', dawn) },
    horizon,
  }
}

/** Where the field in front of the fair has come up to (`frontField`), device pixels down the canvas. */
const frontTop = (s: Screen, hy: number, rise: number): number => Math.floor(hy + (1 - rise) * (s.h - hy + 2))

/** What the night's land takes from the take, each at a show time. */
export interface Take {
  /** The horizon, as a share of the frame from its top. */
  horizon(t: number): number
  /** How far the field in front of the fair has come up (`frontField`): the rows it covers are not drawn here as well. */
  rise(t: number): number
  /** The camera's cell, for the shells' smoke. */
  camAt(t: number): number
  /** How long the photograph's shutter has been open, seconds, for the trails the midway's lights leave in it. */
  open(t: number): number
}

/** The land behind the fair at night. */
export function nightLand(p: p5, c: PieceCtx, col: number, line: number, begin: number, take: Take): void {
  const t = begin + c.t
  const s = screenOf(p, c, col, line)
  const { camAt } = take
  const l = nightAt(t, take.horizon(t))
  const hy = sky(s, l)
  stars(s, t, hy, dawnAt(t))
  body(s, hy, MOON_X, moonHeight(t), 0.03, '#ECE6F7', undefined, true)
  clouds(s, t, hy, { ...l.cloud, sky: l.mid, alpha: 0.7 }, true)
  // The smoke takes the midway's light as it comes on, and the dawn's blue in the blue hour.
  smoke(s, t, hy, camAt, mixHex(mixHex('#5E527F', '#86668E', glowAt(t)), '#6E82A8', dawnAt(t)))
  fireworks(s, t, hy)
  balloons(s, t, hy)
  farm(s, hy, l.farm, '#E3B45C', t * 0.6)
  midway(s, t, hy, l.low, take.open(t))
  band(s, hy, l.band)
  const up = take.rise(t)
  const wind = (x: number) => nightWind(t, x)
  rows(s, t, hy, up > 0 ? { ...l.rows, wind, within: [-Infinity, frontTop(s, hy, up)] } : { ...l.rows, wind })
  done(s)
}

/**
 * The corn at the foot of the frame by night (`near.ts`), dark against the rows the fair and the moon light, in the
 * chase's wind: leaves and stalk one silhouette, so a plant reads as a plant and not as loose arcs (a stalk the colour
 * of the rows behind it was lost). `away` sinks it out of the frame.
 */
export function nightNear(p: p5, c: PieceCtx, col: number, line: number, begin: number, away: number): void {
  const t = begin + c.t
  const s = screenOf(p, c, col, line)
  nearCorn(s, t, '#07060F', '#07060F', (x) => nightWind(t, x), away)
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
  const top = frontTop(s, hy, rise)
  s.ctx.beginPath()
  s.ctx.rect(0, top, s.w, s.h - top)
  s.ctx.clip()
  s.ctx.fillStyle = l.ground
  s.ctx.fillRect(0, top, s.w, s.h - top)
  band(s, hy, l.band)
  rows(s, t, hy, { ...l.rows, wind: (x) => nightWind(t, x), within: [top, s.h] })
  done(s)
}

/**
 * The stars, barely moving: a scatter over the whole sky that twinkles, thinning toward the horizon's glow, and with
 * the dawn (`fade`), from the horizon up.
 */
function stars(s: Screen, t: number, hy: number, fade = 0): void {
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
      const a = (0.25 + 0.6 * hash(key, 4) ** 2) * twinkle * (1 - 0.8 * low) * (1 - fade * (0.3 + 0.6 * smooth(y, hy - f * 0.7, hy)))
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
