import { DAY, NIGHT, type Air } from '../../world/desert'
import { ARRIVAL, ATTACK } from './times'

/**
 * Arrakeen's colours by day and by night, and when the palace is shown in section (cut open, its rooms seen) rather
 * than whole.
 *
 * By day the city is the pale concrete of Villeneuve's Arrakeen against the ochre air and its bowl of red rock; by night
 * the same shapes in cold blue, a few lamps in slits, and then the fires.
 */
export interface Tone {
  air: Air
  rock: string
  rockShade: string
  city: string
  cityShade: string
  facade: string
  facadeShade: string
  /** The palace's stone where it is cut through, and the back walls and floors of its rooms. */
  cut: string
  room: string
  roomDark: string
  floor: string
  /** A window's dark in the day, a lamp's warm at night. */
  slit: string
  lamp: string
}

export const DAY_TONE: Tone = {
  air: DAY,
  rock: '#A9744B',
  rockShade: '#7A4F31',
  city: '#C9AA84',
  cityShade: '#9C7D5E',
  facade: '#BB9873',
  facadeShade: '#8E6E52',
  cut: '#5E4A3A',
  room: '#9A7F65',
  roomDark: '#6E5948',
  floor: '#7D6550',
  slit: '#2E241C',
  lamp: '#E3B676',
}

export const NIGHT_TONE: Tone = {
  air: NIGHT,
  rock: '#202532',
  rockShade: '#151924',
  city: '#252C3A',
  cityShade: '#191F2B',
  facade: '#283041',
  facadeShade: '#1B2230',
  cut: '#11151D',
  room: '#2A2F3A',
  roomDark: '#181C24',
  floor: '#22262E',
  slit: '#0B0E14',
  lamp: '#D9A35E',
}

/** Night from the dissolve into the attack on. */
export const isNight = (t: number): boolean => t >= ATTACK.from

export const toneAt = (t: number): Tone => (isNight(t) ? NIGHT_TONE : DAY_TONE)

/**
 * The stretches the palace is seen cut open: each begins and ends on a cut of the camera (or a scene's edge), so the
 * change is never seen. By day, the hall where the bull's head is hung; by night, Paul's room and the Duke's hall.
 */
const INSIDE: [number, number][] = [
  [ARRIVAL.hall, ARRIVAL.to],
  [ATTACK.window, ATTACK.dome],
  [ATTACK.watch, ATTACK.terrace],
  [ATTACK.room, ATTACK.to + 1],
]

export const inside = (t: number): boolean => INSIDE.some(([a, b]) => t >= a && t < b)
