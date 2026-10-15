import type { Pt } from '../../../../../parts'
import { flicker, layer, rising, type Frame } from '../depth'
import { hash, smooth } from '../kit'
import { onsets } from '../music'
import { flash, mix, type Pen } from '../pen'
import { BALES_TOP, BX0, BX1, FLARE, HAY, LANTERN_DOWN, LOFT_X1, LOFT_Y, ROAD, S, T1 } from './geo'
import { bag, disc, fill, haze, loop, windy } from './ink'

/**
 * The barn on fire, round the barn itself (`draw.ts` has the flames): the light it throws on things, flickering, a
 * plain warm wash on the field and the air behind the farm; its smoke, banking down under the roof inside and laid over
 * by the wind outside in a long plume lit from below; its embers going up out of it and carried off downwind. And,
 * once the camera has gone off across the field to the airfield, the same fire seen low on the far side of it, its
 * flames' tops and its plume over the trees.
 *
 * The fire's red and gold are never Marty's orange: the embers go from gold to a dark red, and the light on things is
 * the barn's red. Nothing here is added light: every wash is laid over what is under it, low.
 */

export const F = {
  red: '#B52A1C',
  gold: '#E9AE3C',
  ember: '#C8301C',
  smoke: '#13171A',
  smokeLit: '#5A1E16',
  smokeWarm: '#2E1A17',
  bank: '#160B0A',
}

/** The barn's middle, and the floor under it: where its light comes from. */
const BARN_MID = (BX0 + BX1) / 2

/* ------------------------------------------------------------------ how much fire, and its light */

/** How much of the barn is alight, 0 to 1. */
export function fireAt(t: number): number {
  if (t < LANTERN_DOWN) return 0
  return Math.min(1, 0.12 + 0.88 * smooth(t, LANTERN_DOWN, LANTERN_DOWN + 7.5))
}

/** The solo's big notes, once the barn is alight: the flames leap on each one. */
const NOTES: readonly number[] = onsets(LANTERN_DOWN + 0.15, T1 + 3, 0.75)

/** What the fire itself does: the lantern catching, the flare after it, the hay landing. */
function catches(t: number): number {
  let v = flash(t - LANTERN_DOWN, 0.35) + 0.7 * flash(t - FLARE, 0.3)
  for (const h of HAY) v += (h.big ? 0.6 : 0.35) * flash(t - h.t, 0.25)
  return v
}

/** How the flames leap: as the fire catches, and on the solo's big notes. Their height only, never a light. */
export function flareAt(t: number): number {
  let v = catches(t)
  for (const n of NOTES) v += 0.3 * flash(t - n, 0.16)
  return v
}

/**
 * The fire's light as it falls on things, 0 to about 1.1: its size, flickering, and a little more as it catches. It
 * does not jump with the music.
 */
export function fireLight(t: number): number {
  const f = fireAt(t)
  if (f <= 0) return 0
  return f * (0.82 + 0.18 * flicker(t, 3, 0.7)) + 0.12 * Math.min(1, catches(t))
}

/* ------------------------------------------------------------------ the smoke */

/**
 * Inside, the smoke gathers under the roof and banks down as the fire grows, its belly lit from the flames under it.
 * Drawn over the back wall and under the loft and the flames.
 */
export function smokeBank(pen: Pen, t: number): void {
  const f = fireAt(t)
  if (f <= 0) return
  const eave = ROAD - 5.0
  const deep = smooth(t, LANTERN_DOWN + 0.8, LANTERN_DOWN + 8)
  if (deep <= 0) return
  const bottom = eave - 1.4 + 2.3 * deep
  const top: Pt[] = [[BX0 + 0.22, eave - 0.3], [BX0 + 1.25, ROAD - 6.65], [BARN_MID, ROAD - 7.5], [BX1 - 1.25, ROAD - 6.65], [BX1 - 0.22, eave - 0.3]]
  const edge = (lift: number): Pt[] => {
    const pts: Pt[] = []
    for (let i = 0; i <= 16; i++) {
      const x = BX1 - 0.22 - ((BX1 - BX0 - 0.44) * i) / 16
      const y = bottom + 0.16 * Math.sin(x * 2.1 + t * 1.3) + 0.1 * Math.sin(x * 4.3 - t * 2.3) - lift
      pts.push([x, Math.max(y, roofAt(x) + 0.05)])
    }
    return pts
  }
  const lit = bag()
  polyOf(lit, [...top, ...edge(0)])
  fill(pen, lit, F.smokeLit, 0.75 * deep * Math.min(1, fireLight(t)))
  const body = bag()
  polyOf(body, [...top, ...edge(0.2)])
  fill(pen, body, F.bank, 0.82 * deep)
}

/** The underside of the barn's roof at `x`, inside. */
function roofAt(x: number): number {
  const u = Math.abs(x - BARN_MID) / ((BX1 - BX0) / 2)
  return u > 0.75 ? ROAD - 6.65 + ((u - 0.75) / 0.25) * 1.65 : ROAD - 7.5 + (u / 0.75) * 0.85
}

function polyOf(path: Path2D, pts: Pt[]): void {
  path.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) path.lineTo(pts[i][0], pts[i][1])
  path.closePath()
}

/** Puffs in the plume; how long each lives; how fast the wind carries it, and how fast it climbs. */
const PUFFS = 34
const PUFF_LIFE = 11
const WIND = 1.45
const CLIMB = 0.42

/**
 * Outside, the plume: puffs off the roof, carried off to the right by the wind faster than they climb, so the smoke lies
 * along the top of the picture over the field, its underside lit red by the fire. Drawn behind the barn.
 */
export function drawPlume(pen: Pen, t: number, f: Frame): void {
  const fire = fireAt(t)
  if (fire <= 0) return
  const light = Math.min(1.2, fireLight(t))
  const old = bag()
  const warm = bag()
  const young = bag()
  const under = bag()
  let any = false
  for (let i = 0; i < PUFFS; i++) {
    const h1 = hash(i, 301)
    const life = PUFF_LIFE * (0.85 + 0.3 * hash(i, 302))
    const cyc = (t - LANTERN_DOWN) / life + h1
    const age = (cyc - Math.floor(cyc)) * life
    const born = t - age
    if (born < LANTERN_DOWN + 0.6) continue
    const gen = Math.floor(cyc)
    const strength = fireAt(born)
    if (strength < 0.15) continue
    const x0 = BX0 + 1.4 + (BX1 - BX0 - 2.8) * hash(i, gen, 303)
    const y0 = ROAD - 7.0 - 0.5 * hash(i, gen, 304) + 0.6 * (1 - smooth(born, LANTERN_DOWN + 3, LANTERN_DOWN + 7))
    const x = x0 + WIND * age * (0.85 + 0.3 * hash(i, 305)) + 0.4 * Math.sin(age * 0.8 + i)
    const y = y0 - CLIMB * age - 0.2 * Math.sin(age * 0.6 + i * 2) + 0.012 * age * age
    const r = (0.55 + 0.26 * age) * (0.55 + 0.45 * strength)
    if (x + r < f.x0 || x - r > f.x1 || y + r < f.y0 || y - r > f.y1) continue
    any = true
    disc(age < 1.6 ? young : age < 4.5 ? warm : old, x, y, r)
    if (age < 6) disc(under, x + 0.1 * r, y + 0.32 * r, r * 0.86)
  }
  if (!any) return
  fill(pen, under, mix(F.red, F.gold, 0.1), 0.4 * light)
  fill(pen, old, F.smoke, 0.62 * fire)
  fill(pen, warm, mix(F.smoke, F.smokeLit, 0.45), 0.78 * fire)
  fill(pen, young, mix(F.smokeWarm, F.smokeLit, 0.5 * light), 0.86 * fire)
}

/* ------------------------------------------------------------------ the light, and the embers */

/**
 * The fire's light on the field and the air round the barn: one soft warm wash, laid over (not added to) what is
 * behind the farm, low and wide. Drawn under the farmhouse and the barn, which are lit by it in their own ways.
 */
export function drawFireWash(pen: Pen, t: number, f: Frame): void {
  const fire = fireAt(t)
  if (fire <= 0) return
  const rx = 4 + 9 * fire
  if (BARN_MID + rx < f.x0 || BARN_MID - rx > f.x1) return
  haze(pen, [BARN_MID, ROAD - 1.6], rx, 2.4 + 3.4 * fire, F.red, 0.2 * Math.min(1, fireLight(t)))
}

/** In front of the barn: its embers, going up out of the loft and the roof and off downwind, and low off the bales. */
export function drawFireFront(pen: Pen, t: number, f: Frame): void {
  const fire = fireAt(t)
  if (fire <= 0) return
  if (f.x0 > BX1 + 4 || f.x1 < BX0 - 2) return
  windy(pen, LOFT_Y, 0.32, () => {
    rising(pen, t, { seed: 31, n: Math.round(80 * fire), from: [BX0 + 0.6, BX1 - 0.4, LOFT_Y - 0.4], rise: 9, life: 3.4, spread: 1.9, size: [0.022, 0.045], color: F.ember, hot: F.gold, alpha: 0.85 })
    rising(pen, t, { seed: 32, n: Math.round(16 * fire), from: [BX0 + 1, BX1 - 1, LOFT_Y - 1.2], rise: 7, life: 4.2, spread: 2.4, size: [0.045, 0.07], color: F.ember, hot: F.gold, alpha: 0.75 })
  })
  windy(pen, BALES_TOP, 0.18, () => {
    rising(pen, t, { seed: 33, n: Math.round(20 * fire), from: [S + 15.9, LOFT_X1 - 0.4, BALES_TOP - 0.4], rise: 2.8, life: 1.5, spread: 0.6, size: [0.02, 0.035], color: F.ember, hot: F.gold, alpha: 0.8 })
  })
}

/* ------------------------------------------------------------------ the fire from across the field */

/**
 * From the airfield the barn is out of the picture to the left; its fire is still there, low on the far side of the
 * field: a little warmth over the trees, the flames' tops flickering, the plume going off on the wind, a few embers.
 * It comes up only as the barn itself goes out of the picture, so the two are never seen at once.
 */
export function drawFarFire(pen: Pen, t: number, f: Frame, d: number, anchor: Pt, base: number): void {
  const fire = fireAt(t)
  if (fire <= 0) return
  const show = fire * smooth(f.x0, BX1 + 0.5, BX1 + 5.5)
  if (show <= 0.01) return
  const light = fireLight(t)
  layer(
    pen,
    f,
    d,
    (g) => {
      const c: Pt = [15.4, base]
      if (c[0] + 7 < g.x0 || c[0] - 7 > g.x1) return
      haze(pen, [c[0] + 0.4, c[1] - 0.4], 3.2, 1.4, F.red, 0.16 * show * Math.min(1, light))
      // The flames' tops over the trees.
      const flames = bag()
      const hot = bag()
      for (let i = 0; i < 7; i++) {
        const x = c[0] - 0.7 + (1.4 * i) / 6
        const h = (0.22 + 0.2 * hash(i, 501)) * (0.8 + 0.25 * Math.sin(t * (6 + i) + i * 2))
        flame(flames, x, c[1], 0.22, h, t, i)
        flame(hot, x, c[1], 0.12, h * 0.55, t, i + 7)
      }
      fill(pen, flames, F.red, 0.9 * show)
      fill(pen, hot, F.gold, 0.9 * show)
      // Its plume, small with the distance, laid over by the same wind.
      const plume = bag()
      const lit = bag()
      for (let i = 0; i < 14; i++) {
        const life = 7
        const cyc = t / life + hash(i, 502)
        const age = (cyc - Math.floor(cyc)) * life
        const x = c[0] + 0.55 * age + 0.15 * Math.sin(age + i)
        const y = c[1] - 0.25 - 0.36 * age
        const r = 0.18 + 0.11 * age
        disc(age < 2 ? lit : plume, x, y, r)
      }
      fill(pen, plume, F.smoke, 0.7 * show)
      fill(pen, lit, mix(F.smoke, F.smokeLit, 0.7), 0.8 * show)
      windy(pen, c[1], 0.5, () => {
        rising(pen, t, { seed: 37, n: Math.round(12 * show), from: [c[0] - 0.6, c[0] + 0.6, c[1] - 0.2], rise: 2.2, life: 2.2, spread: 0.4, size: [0.012, 0.02], color: F.ember, hot: F.gold, alpha: 0.8 })
      })
    },
    anchor,
  )
}

/** A little flame at a distance: a tongue in a path. */
function flame(path: Path2D, x: number, y: number, w: number, h: number, t: number, seed: number): void {
  const lean = 0.25 * h * Math.sin(t * (7 + seed) + seed)
  const pts: Pt[] = [
    [x - w / 2, y],
    [x - w * 0.3 + lean * 0.4, y - h * 0.5],
    [x + lean, y - h],
    [x + w * 0.3 + lean * 0.4, y - h * 0.5],
    [x + w / 2, y],
  ]
  loop(path, pts)
}
