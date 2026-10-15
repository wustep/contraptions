import type { Pt } from '../../../../../parts'
import { DURATION } from '../music'
import { clamp01, mix, ramp } from '../negatives/hand'
import { IN, KERB, PAVE } from './plan'

/**
 * The street's morning, as a clock (the street's own): a low sun down the avenue to the east, at the frame's right,
 * raking along the fronts from the right. Through the walk it is gold; through the credits it climbs and warms, then
 * whitens. Everything the street draws asks this file what the light is at `t`, so the sky, the fronts, the shade,
 * the shafts and the grade all move together.
 *
 * The buildings across the street, behind the camera, put the foot of every front in a long cool shade; the sun
 * comes through where they stop (a cross street, a low roof) in bands, one of them on the newsstand. As the sun
 * climbs the shade goes down the fronts.
 */

/** 0 at the cut in, 1 at the end. */
export const morning = (t: number): number => clamp01((t - IN) / (DURATION - IN))
/** How gold the light is: up through the walk and the first cards, then giving way to white. */
export const goldAt = (t: number): number => 0.55 + 0.45 * ramp(t, IN, 248) - 0.6 * ramp(t, 252, DURATION)
/** How white the light has gone: nothing until the middle of the credits, most of the way by the end. */
export const whiteAt = (t: number): number => ramp(t, 250, DURATION + 6)

/** The sun, in the sky's plane (z 0.04, anchored with the far planes): low in the avenue's gap, climbing. */
export const sunAt = (t: number): Pt => {
  const m = morning(t)
  return [16.4 - 0.5 * m, -2.3 - 1.7 * m]
}

/** The street's colours: flat values, lit by the morning. Nothing here is red. */
export const S = {
  sky: '#DCE3E6',
  skyHigh: '#CFDAE0',
  skyLow: '#F4E6C8',
  sun: '#FFF4DA',
  gold: '#F2C982',
  far: '#C6CDD1',
  stone: '#E3D7C2',
  stoneDark: '#D2C3AA',
  brick: '#C29F82',
  corner: '#DDD0B8',
  glass: '#7F8F99',
  glassHigh: '#AFC0C8',
  pave: '#DDD6C8',
  paveLine: '#C3BBAB',
  kerb: '#C9C1B1',
  road: '#9C9A94',
  roadDark: '#8A8882',
  steel: '#8D9091',
  kiosk: '#55635D',
  kioskDark: '#3E4A45',
  shutter: '#8A928C',
  paper: '#F1EEE6',
  photo: '#2F3337',
  iron: '#3A3E40',
  awning: '#4F7A62',
  leaf: '#5E7A4E',
}

/** The sky at the top and at the horizon at `t`: pale blue over gold, warming, then white. */
export function skyAt(t: number): { high: string; low: string; sun: string } {
  const g = goldAt(t)
  const w = whiteAt(t)
  return {
    high: mix(mix(S.skyHigh, '#E4E2D8', 0.35 * g), '#F2F1EC', 0.5 * w),
    low: mix(mix(S.sky, S.skyLow, g), '#FBF7EE', 0.5 * w),
    sun: mix(S.sun, '#FFFFFF', w),
  }
}

/* ------------------------------------------------------------------ the shade from across the street */

/**
 * The buildings behind the camera, as the shade they cast: for each stretch of the street, how far down the fronts
 * the sun reaches (its top edge, cells), or null where they stop and the sun comes all the way down. Read with the
 * sun's own drop and drift (`shadeAt`). Each `tank` is a water tower on that roof, whose shadow stands on the edge.
 */
const ACROSS: { x0: number; x1: number; top: number | null; tank?: number }[] = [
  { x0: -14, x1: -6.2, top: -4.6 },
  { x0: -6.2, x1: -3.9, top: -3.4, tank: -5.0 },
  { x0: -3.9, x1: -1.0, top: -3.9 },
  { x0: -1.0, x1: 1.7, top: null },
  { x0: 1.7, x1: 4.55, top: -3.1, tank: 3.1 },
  { x0: 4.55, x1: 8.35, top: null },
  { x0: 8.35, x1: 10.1, top: -2.9 },
  { x0: 10.1, x1: 11.2, top: -3.3 },
  { x0: 11.2, x1: 12.4, top: -2.7 },
  { x0: 12.4, x1: 40, top: null },
]

/** How far the ground's lit bands lean: cells to the right for each cell down from the fronts' foot. */
export const LEAN = 0.85

/**
 * The shade over the street at `t`, as paths in cells: on the fronts below the edge, and on the ground (the pavement
 * and the road), the sun's bands left out of both. The sun climbing lowers it; its swing round to the south moves it
 * a little to the left.
 */
export function shadeAt(t: number, x0: number, x1: number, y1: number): { walls: Path2D; ground: Path2D } {
  const m = morning(t)
  const drop = 2.1 * m
  const dx = -0.45 * m
  const walls = new Path2D()
  const ground = new Path2D()
  const foot = (x: number, y: number) => x + (y - PAVE) * LEAN
  for (const s of ACROSS) {
    if (s.top === null) continue
    const a = s.x0 + dx
    const b = s.x1 + dx
    if (b < x0 - 4 || a > x1 + 1) continue
    const top = Math.min(PAVE - 0.05, s.top + drop)
    walls.rect(a, top, b - a, PAVE - top)
    ground.moveTo(a, PAVE)
    ground.lineTo(b, PAVE)
    ground.lineTo(foot(b, y1), y1)
    ground.lineTo(foot(a, y1), y1)
    ground.closePath()
    if (s.tank !== undefined) {
      // A water tower's shadow on the edge: its barrel and cone, on legs.
      const c = s.tank + dx
      const lt = top - 0.35
      walls.moveTo(c - 0.42, lt)
      walls.lineTo(c - 0.42, lt - 0.85)
      walls.lineTo(c, lt - 1.2)
      walls.lineTo(c + 0.42, lt - 0.85)
      walls.lineTo(c + 0.42, lt)
      walls.closePath()
      for (const lx of [-0.34, 0.3]) walls.rect(c + lx, lt - 0.01, 0.06, 0.37)
    }
  }
  return { walls, ground }
}

/** Whether a point of the street is in the sun at `t` (for what catches it: the cellar plates, the cover's glint). */
export function litAt(t: number, x: number, y: number): boolean {
  const m = morning(t)
  const drop = 2.1 * m
  const dx = -0.45 * m
  const xs = y > PAVE ? x - (y - PAVE) * LEAN : x
  for (const s of ACROSS) {
    if (xs < s.x0 + dx || xs >= s.x1 + dx) continue
    return s.top === null || y < s.top + drop
  }
  return true
}

/** The shade's colour, laid over what it falls on: a cool blue, thinning as the sky fills with light; lighter on the ground. */
export const shadeTint = (t: number, ground = false): string => {
  const a = (ground ? 0.22 : 0.3) * (1 - 0.45 * whiteAt(t))
  return `rgba(38, 66, 128, ${a.toFixed(3)})`
}

/** Where the road's lanes run: the y of a wheel's foot in each. */
export const LANE = { far: KERB + 0.78, near: KERB + 1.58 }
