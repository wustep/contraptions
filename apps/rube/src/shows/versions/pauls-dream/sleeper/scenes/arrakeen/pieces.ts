import type { Placed } from '../../../../../../plan'
import { drawBull } from '../../craft/bull'
import { mix, ring, standing, type Paint } from '../../paint'
import { BARON } from '../../cast'
import { CHAIR, HOOK } from './geo'
import { inside, isNight, toneAt } from './look'
import { drawArmada, drawChair, drawDoor, drawFires, drawGas, drawHallLamp, drawHallPool, drawHallWash, drawNearShips, drawRoom, drawRoomLight, drawShield, drawStraps, drawUpperRooms, underlightBull } from './night'
import { bullSwing, bullTop, drawCrateFront, drawFrigateOver, drawFrigateUnder, drawHark, drawHarkOver, drawWinch } from './rig'
import { drawBehind, drawNear, drawPalaceWhole } from './set'
import { ARRIVAL, ATTACK } from './times'

/**
 * Arrakeen as one standing drawing, by day and by night, in the order things stand: the air and the far rim, the
 * armada coming down, the city's rows with their fires, the near plane (the rock, the field, the palace), the frigate,
 * the near fires and the shield, the rooms' things when the palace is open, and the Harkonnen ornithopter; over the
 * balls, the frigate's hull (the family is behind it until its hatch opens), the gas, the Duke's bonds.
 */

const BOX = { x0: -80, y0: -240, x1: 230, y1: 40 }
const IRON = '#2B2622'
const WOOD = '#5B4330'
const NIGHT_WOOD = '#2A2320'

/** The Duke in his chair, for his bonds: where the scene seats him (`attack.ts` keeps him there). */
export const DUKE_SEAT: [number, number] = [CHAIR[0] + 0.15, -0.36 - 0.13 * 1.18]

function under(g: Paint): void {
  const t = g.t
  const tone = toneAt(t)
  const night = isNight(t)
  // The far air, the rim, and between them (by depth) the armada.
  drawBehind(g, tone, t, night ? (near) => drawArmada(g, t, near) : undefined, night ? (d) => drawFires(g, t, (h) => h === d, tone.air.haze) : undefined)
  if (night) drawNearShips(g, t)
  drawNear(g, tone, t)
  drawFrigateUnder(g, t, night)
  if (night) drawShield(g, t)
  // The fires on the near plane: here while the palace is cut open; over its face (in `over`) while it is whole.
  if (night && inside(t)) drawFires(g, t, (d) => d === 0, tone.air.haze)
  if (inside(t)) {
    if (!night && t >= ARRIVAL.hall) {
      drawWinch(g, t, IRON, WOOD, '#3A332C')
      const [bx, by] = bullTop(t)
      drawBull(g, { x: bx, y: by, swing: bullSwing(t), dark: 0.25 })
      drawCrateFront(g, WOOD)
    }
    if (night) {
      // The hall by its one lamp: its pool, the bull over it lit from below (it shudders on the blow after the death),
      // the lamp, the chair.
      drawHallPool(g, tone.lamp)
      const swing = 0.035 * ring(t, ATTACK.fall, 0.8, 0.9)
      drawBull(g, { x: HOOK[0], y: HOOK[1], dark: 0.5, swing })
      underlightBull(g, HOOK, tone.lamp, swing)
      drawHallLamp(g, t, IRON)
      drawRoom(g, tone.lamp, NIGHT_WOOD)
      drawUpperRooms(g, tone.lamp, NIGHT_WOOD)
      drawDoor(g, t, '#6A5240')
      if (t >= ATTACK.hall) drawChair(g, mix(NIGHT_WOOD, '#000000', 0.2))
    }
  }
  if (night) drawHark(g, t)
}

function over(g: Paint): void {
  const t = g.t
  const night = isNight(t)
  const tone = toneAt(t)
  drawPalaceWhole(g, tone, t)
  if (night && !inside(t)) drawFires(g, t, (d) => d === 0, tone.air.haze)
  drawFrigateOver(g, t, night, tone.air.sand)
  if (night) {
    drawHarkOver(g, t)
    if (inside(t)) drawHallWash(g, tone.lamp)
    if (inside(t) && t < ATTACK.hall) drawRoomLight(g, t)
    if (inside(t) && t >= ATTACK.hall) {
      drawStraps(g, DUKE_SEAT, 0.13 * 1.18, '#16120F')
      drawGas(g, t, DUKE_SEAT)
    }
  }
}

export const ARRAKEEN: Placed[] = [standing('arrakeen', BOX, under, over)]

/** The Baron's size, for anyone who frames him. */
export const BARON_R = 0.13 * BARON.size
