import type { Pt } from '../../../../../parts'
import { box, frame, part, scenery, type PartShot } from '../kit'
import { SEAMS } from '../seams'
import type { Pen } from '../pen'
import { drawAirfield, drawAmbDoor, drawAmbulance, drawBarn, drawCrossing, drawFar, drawGlare, drawGround, drawHouse, drawPassing, drawRoadside, drawSky, drawTheCab } from './draw'
import {
  AMB_STOP,
  COT_IN0,
  DOOR_HITS,
  GB,
  HALT,
  IN_BARN,
  JERSEY_STRIKES,
  LAND_R,
  MARTY_SEGS,
  martyAt,
  RACHEL_GONE,
  rachelAt,
  REST,
  ROAD,
  RS,
  S,
  SHUT,
  STEP_TIMES,
  STOPS,
  T0,
  T1,
} from './geo'

/**
 * New Jersey (138.142 → 176.689, bars 65 to 82). The guitar comes in and Wally's cab pulls away down a two-lane road
 * in the dark, Marty and Rachel on its back seat, the poles going by, the body jolting on the joints on every beat. It
 * pulls up at a farmhouse where Mishkin's men are waiting on the porch; shots from a window on the solo's hard beats;
 * the two of them run for the barn; a shot takes the lantern off its hook and the barn goes up; trapped at the far end,
 * Marty plays the shut hay door like a table until it gives, and they are out, but Rachel is hurt: she slows, and stops,
 * and he stays with her. An ambulance comes, its red light on the beats, and takes her; its tail lights go off toward
 * the city. "I can't stand this indecision": toward the lights, back toward the airliner, toward the lights, and then
 * up its stair a step a beat and in, to a round window's sill, where Tokyo takes him.
 *
 * See `geo.ts` for the clock and the ground, `draw.ts` for the drawing.
 */

export const JERSEY_AT: Pt = [0, 0]
export const JERSEY_CELLS = box(-45, -16, S + 72, 8, 2)

const penOf = (p: Parameters<typeof frame>[0], k: number, ink: string, w: number): Pen => ({ p, k, ink, w, tone: (h) => h })

/** The night, the road, the farm and the airfield: drawn first, on show time. */
export const jerseySet = scenery<null>({
  name: 'jersey-set',
  draw: (p, _s, c) => {
    const pen = penOf(p, c.k, c.ink, c.weight)
    const f = frame(p, c.k)
    p.push()
    drawSky(pen, c.t, f)
    drawFar(pen, c.t, f)
    drawGround(pen, c.t, f)
    drawRoadside(pen, c.t, f)
    drawCrossing(pen, c.t)
    drawAirfield(pen, c.t, f)
    drawHouse(pen, c.t)
    drawBarn(pen, c.t)
    p.pop()
  },
})

interface NightState {
  begin: number
}

/** While she goes in: the ambulance's body and its open door drawn over her. */
const INSIDE: [number, number] = [COT_IN0 - 0.02, SHUT + 0.06]
const inside = (t: number) => t >= INSIDE[0] && t <= INSIDE[1]

export const night = part<NightState>(
  {
    name: 'night',
    dynamic: true,
    draw: (p, s, c) => {
      const t = s.begin + c.t
      const pen = penOf(p, c.k, c.ink, c.weight)
      p.push()
      drawPassing(pen, t)
      drawTheCab(pen, t)
      drawGlare(pen, t)
      drawAmbulance(pen, t, inside(t) ? 'under' : 'all')
      if (!inside(t)) drawAmbDoor(pen, t)
      p.pop()
    },
    over: (p, s, c) => {
      const t = s.begin + c.t
      if (!inside(t)) return
      const pen = penOf(p, c.k, c.ink, c.weight)
      p.push()
      drawAmbulance(pen, t, 'body')
      drawAmbDoor(pen, t)
      p.pop()
    },
  },
  (slot) => ({
    cells: box(-45, -16, S + 72, 8, 2),
    exit: [REST[0] + 0.5, REST[1]] as Pt,
    lane: { segs: MARTY_SEGS, fire: HALT - slot.begin },
    state: { begin: slot.begin },
    company: [
      {
        who: 'rachel' as const,
        from: T0,
        to: RACHEL_GONE + 0.05,
        at: (t: number) => {
          if (t >= RACHEL_GONE) return null
          const [x, y] = rachelAt(t)
          // Inside, the doors shut on her: out of the picture.
          return t >= SHUT ? { x, y, scale: 0.01 } : { x, y }
        },
      },
    ],
  }),
  () => shots(),
)

/**
 * The camera: from the seam's framing it rides with the cab, opening out to the whole car; with them out of it and up to
 * the porch; along with the run into the barn; on the hay door; a wide of the farm burning as the ambulance comes; close
 * on the cot; wide enough at the indecision to hold both the plane's stair and the tail lights; then in with him up the
 * stair to the window, and the seam's framing.
 */
function shots(): PartShot[] {
  const hold = (t: number, cells: number, at: Pt): PartShot => ({ t, cells, hold: at, w: 1 })
  const follow = (t: number, cells: number, off: Pt): PartShot => ({ t, cells, off, w: 0 })
  const end = SEAMS.tokyo
  void martyAt
  void rachelAt
  return [
    follow(T0 + 1.2, 4.2, [1.0, -0.75]),
    follow(T0 + 3.4, 5.0, [1.5, -0.95]),
    follow(HALT - 0.3, 5.0, [1.5, -0.95]),
    follow(LAND_R + 0.2, 5.6, [1.6, -1.3]),
    follow(IN_BARN - 1.6, 6.4, [2.2, -1.7]),
    follow(IN_BARN + 0.6, 6.4, [1.6, -1.7]),
    hold(DOOR_HITS[0] - 0.1, 6.4, [S + 19.6, ROAD - 2.15]),
    hold(DOOR_HITS[3] + 0.2, 6.4, [S + 20.4, ROAD - 2.15]),
    hold(DOOR_HITS[3] + 2.0, 11.5, [S + 19.3, ROAD - 3.4]),
    hold(AMB_STOP - 0.6, 11.5, [S + 19.8, ROAD - 3.4]),
    hold(AMB_STOP + 1.3, 6.6, [RS - 0.3, ROAD - 2.1]),
    hold(STOPS[0] + 0.1, 6.6, [RS - 0.3, ROAD - 2.1]),
    hold(STOPS[1], 8.4, [S + 27.4, ROAD - 2.7]),
    hold(STOPS[2] + 0.2, 8.4, [S + 27.0, ROAD - 2.7]),
    follow(STEP_TIMES[0], 6.6, [0.6, -1.3]),
    follow(STEP_TIMES[2], 6.0, [0.9, -1.1]),
    follow(STEP_TIMES[5], 4.4, [0.7, -0.7]),
    hold(T1, end.cells, [REST[0] + end.frame[0], REST[1] + end.frame[1]]),
  ]
}

export const JERSEY_HITS: readonly number[] = JERSEY_STRIKES

export const JERSEY_WIDE: [number, number][] = []

void GB
