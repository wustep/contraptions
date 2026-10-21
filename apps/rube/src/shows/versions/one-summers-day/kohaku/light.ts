import { M } from './music'
import { mix } from './paint'

/**
 * The light, as a function of show time: one keyed plan for the whole show, which the sky and every set read. The
 * film's own day, twice over: a summer afternoon going down into the town's dusk, the bathhouse's night, a dawn on the
 * new sea and a bright day for the dragon, the train's long afternoon into sunset and night, the moon over the cloud,
 * and the morning she goes home in.
 *
 * A set paints its day colours and its night colours and mixes them by `night`; it takes `ambient` over what the sun
 * or the moon falls on, and its own lamps by `lamps`. The sun and the moon are flat discs where the sky puts them.
 */
export interface Light {
  /** The sky from the top of the frame down to the horizon. */
  top: string
  mid: string
  low: string
  /** What faraway things pale into: the air at the horizon. */
  haze: string
  /** Clouds: their lit faces, their shaded undersides. */
  cloud: string
  shade: string
  /** The light falling on things (a multiply): white at noon, gold at evening, blue at night. */
  ambient: string
  /** The sun's disc and where it is: shares of the frame across and down (over 1 is below the horizon). */
  sun: string
  sunX: number
  sunY: number
  /** How much the moon is up, 0 to 1. */
  moon: number
  /** 0 by day to 1 at full night. */
  night: number
  /** How far the lamps are lit, 0 to 1. */
  lamps: number
  /** The water: far by the horizon, near, and where the sky lies on it. */
  seaFar: string
  seaNear: string
  seaLit: string
}

interface Key extends Light {
  t: number
}

const AFTERNOON: Light = {
  top: '#4E8FD0',
  mid: '#86B9E2',
  low: '#D7EAF0',
  haze: '#C9DFE6',
  cloud: '#FBFAF4',
  shade: '#B9CBDC',
  ambient: '#FFFDF6',
  sun: '#FFF8E2',
  sunX: 0.78,
  sunY: 0.12,
  moon: 0,
  night: 0,
  lamps: 0,
  seaFar: '#9CCBDD',
  seaNear: '#4B93B4',
  seaLit: '#DDEEF2',
}

const GOLDEN: Light = {
  ...AFTERNOON,
  top: '#5A8CC4',
  mid: '#A9C2D6',
  low: '#F2DDB6',
  haze: '#E7D7BC',
  cloud: '#FFF2DC',
  shade: '#C9B3B4',
  ambient: '#FFF0D2',
  sun: '#FFF1CC',
  sunX: 0.8,
  sunY: 0.42,
  seaFar: '#C7C9C0',
  seaNear: '#5E8DA6',
  seaLit: '#F4E2C2',
}

const SUNSET: Light = {
  top: '#3F5D93',
  mid: '#B58A9C',
  low: '#F3B37E',
  haze: '#D9A98D',
  cloud: '#F7C8A0',
  shade: '#8E6E86',
  ambient: '#F6C9A6',
  sun: '#FFE0B0',
  sunX: 0.82,
  sunY: 0.86,
  moon: 0,
  night: 0.25,
  lamps: 0.2,
  seaFar: '#D9A58C',
  seaNear: '#5A6E90',
  seaLit: '#F6C49A',
}

const DUSK: Light = {
  top: '#1F2C52',
  mid: '#46507A',
  low: '#9A7D93',
  haze: '#6E6684',
  cloud: '#8A7F9A',
  shade: '#4A4766',
  ambient: '#8E8CB0',
  sun: '#F6B98A',
  sunX: 0.84,
  sunY: 1.3,
  moon: 0.3,
  night: 0.7,
  lamps: 1,
  seaFar: '#6A6684',
  seaNear: '#2E3A5C',
  seaLit: '#9E8CA4',
}

const NIGHT: Light = {
  top: '#0F1830',
  mid: '#1A2846',
  low: '#2F4064',
  haze: '#2E3D5E',
  cloud: '#43557A',
  shade: '#1E2A46',
  ambient: '#5E6E98',
  sun: '#F6B98A',
  sunX: 0.84,
  sunY: 1.6,
  moon: 1,
  night: 1,
  lamps: 1,
  seaFar: '#2C3C5E',
  seaNear: '#152340',
  seaLit: '#5A6C92',
}

/** The moon over the cloud: a bright night, the cloud tops silver. */
const MOONLIT: Light = {
  ...NIGHT,
  top: '#0E1A36',
  mid: '#1F3158',
  low: '#3B5280',
  cloud: '#8EA2C6',
  shade: '#33476E',
  ambient: '#7E8EB8',
}

const DAWN: Light = {
  top: '#5578AE',
  mid: '#A6A9C2',
  low: '#F4D6B4',
  haze: '#DCCDC2',
  cloud: '#FBE4CC',
  shade: '#A49CB4',
  ambient: '#F2E2D2',
  sun: '#FFF3DA',
  sunX: 0.2,
  sunY: 0.82,
  moon: 0.2,
  night: 0.2,
  lamps: 0.3,
  seaFar: '#D7CBC4',
  seaNear: '#5F86AA',
  seaLit: '#F6E6D2',
}

const DAY: Light = {
  ...AFTERNOON,
  top: '#3F86D2',
  mid: '#7DB6E4',
  low: '#D5EBF3',
  sunX: 0.3,
  sunY: 0.08,
  seaFar: '#A6D6E2',
  seaNear: '#3E92B8',
  seaLit: '#E2F2F4',
}

const MORNING: Light = {
  ...DAY,
  top: '#4A8FD4',
  mid: '#8CC0E6',
  low: '#E2EFF0',
  ambient: '#FFFCF4',
  sunX: 0.22,
  sunY: 0.2,
}

const at = (t: number, l: Light): Key => ({ t, ...l })

/** The plan. Between keys the light eases; across a dissolve it changes with the picture. */
export const KEYS: Key[] = [
  at(0, AFTERNOON),
  at(M.theme, AFTERNOON),
  at(M.theme + 12, GOLDEN),
  at(M.swell - 6, SUNSET),
  at(M.swell, DUSK),
  at(M.swell + 6, NIGHT),
  at(M.breath - 0.01, NIGHT),
  at(M.breath + 0.2, DAWN),
  at(M.breath + 5, DAWN),
  at(M.rise - 0.5, DAY),
  at(M.high + 6, DAY),
  at(M.low + 2, GOLDEN),
  at(M.swell2 + 2, SUNSET),
  at(M.hush + 4, DUSK),
  at(M.return + 8, NIGHT),
  at(M.summit - 0.6, NIGHT),
  at(M.summit, MOONLIT),
  at(M.cadence + 2, MOONLIT),
  at(M.home + 4, DAWN),
  at(M.home + 12, MORNING),
  at(400, MORNING),
]

const ease = (u: number) => u * u * (3 - 2 * u)

/** The light at `t`. */
export function light(t: number): Light {
  const ks = KEYS
  if (t <= ks[0].t) return ks[0]
  let i = 0
  while (i + 1 < ks.length && ks[i + 1].t <= t) i++
  if (i >= ks.length - 1) return ks[ks.length - 1]
  const a = ks[i]
  const b = ks[i + 1]
  const u = ease((t - a.t) / (b.t - a.t))
  const n = (x: number, y: number) => x + (y - x) * u
  return {
    top: mix(a.top, b.top, u),
    mid: mix(a.mid, b.mid, u),
    low: mix(a.low, b.low, u),
    haze: mix(a.haze, b.haze, u),
    cloud: mix(a.cloud, b.cloud, u),
    shade: mix(a.shade, b.shade, u),
    ambient: mix(a.ambient, b.ambient, u),
    sun: mix(a.sun, b.sun, u),
    sunX: n(a.sunX, b.sunX),
    sunY: n(a.sunY, b.sunY),
    moon: n(a.moon, b.moon),
    night: n(a.night, b.night),
    lamps: n(a.lamps, b.lamps),
    seaFar: mix(a.seaFar, b.seaFar, u),
    seaNear: mix(a.seaNear, b.seaNear, u),
    seaLit: mix(a.seaLit, b.seaLit, u),
  }
}
