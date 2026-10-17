import type { Pt } from '../../../../../parts'
import { DURATION } from '../music'
import { clamp01, mix, ramp } from '../negatives/hand'
import { IN, KERB, PAVE } from './plan'

/**
 * The street's morning, as a clock (the street's own): a low sun down the avenue to the east, at the frame's right,
 * raking along the fronts from the right. Through the walk it is gold; through the credits it climbs and warms, then
 * whitens. Everything the street draws asks this file what the light is at `t`, so the sky, the fronts, the shade
 * and the grade all move together.
 *
 * The buildings across the street, behind the camera, put the road and the near side of the pavement in one cool
 * shade, with one clean edge; as the sun climbs it goes back toward the kerb.
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
 * The shade of the buildings behind the camera, as its one edge on the ground (cells): the road and the near side of
 * the pavement are in it, the back of the pavement where the two of them roll and the fronts are in the sun. As the
 * sun climbs the edge goes back toward the kerb.
 */
export const shadeEdge = (t: number): number => (PAVE + KERB) / 2 + (KERB - (PAVE + KERB) / 2) * morning(t)

/** The shade's colour, laid over what it falls on: a cool blue, thinning as the sky fills with light; lighter on the ground. */
export const shadeTint = (t: number, ground = false): string => {
  const a = (ground ? 0.22 : 0.3) * (1 - 0.45 * whiteAt(t))
  return `rgba(38, 66, 128, ${a.toFixed(3)})`
}

/** Where the road's lanes run: the y of a wheel's foot in each. */
export const LANE = { far: KERB + 0.78, near: KERB + 1.58 }
