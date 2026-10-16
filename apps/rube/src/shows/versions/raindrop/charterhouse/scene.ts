import type { Placed } from '../../../../plan'
import { smooth } from './brush'
import { HOUSE, PIPE } from './geo'
import { drawDoor, drawEave, drawGutterBack, drawGutterFront, drawNeighbours, drawPipe, drawRoof, drawWall, drawWindow } from './house'
import { drawBehind, drawGround, drawGully, drawRoad, drawTerraces, drawValley } from './land'
import { drawDrip, drawJar, drawLever } from './jar'
import { bar } from './music'
import { drawRain } from './rain'
import { KNOCKS } from './route'
import { cover, drawing, everywhere, standing } from './show'
import { drawSky, drawVeil } from './sky'
import { drawCistern, drawCisternWater, drawSunkBucket } from './cistern'
import { drawChannels, drawChannelsFront } from './terraces'
import { drawNoria, drawSling } from './noria'
import { drawGate, drawGateFront, drawGateLight } from './gate'
import { drawTravelers } from './travelers'
import { drawBucket, drawCurb, drawGardenBack, drawGardenGround, drawLemon, drawRack, drawRillBack, drawRillFront, drawRopeDrip, drawTiles, drawWellBack } from './garden'

/** How hard the pipe's length `i` is jolted at `t`: a knock as the ball goes through it, dying in a tenth of a second. */
function knock(t: number, i: number): number {
  const k = KNOCKS[i]
  if (k === undefined) return 0
  const u = t - k
  if (u < 0 || u > 0.25) return 0
  return Math.exp(-u * 18) * Math.sin(u * 70)
}

/** Everything on the stage, in the order it is drawn. The first is the stand-in the stage spins the ball by. */
export function scenery(duration: number): Placed[] {
  const out: Placed[] = [standing(drawing('spin', null), [], duration)]
  out.push(everywhere(drawing('sky', (b, t) => drawSky(b, t)), duration))
  out.push(everywhere(drawing('veil', (b, t) => drawVeil(b, t)), duration))
  out.push(everywhere(drawing('behind', (b, t) => drawBehind(b, t)), duration))
  out.push(standing(drawing('neighbours', (b, t) => drawNeighbours(b, t)), cover(-50, -64, 0, 1, 3), duration))
  out.push(everywhere(drawing('ground', (b, t) => drawGround(b, t)), duration))
  out.push(standing(drawing('terraces', (b, t) => drawTerraces(b, t)), cover(60, 0, 152, 30, 3), duration))
  out.push(standing(drawing('gully', (b, t) => drawGully(b, t)), cover(150, 26, 172, 48, 3), duration))
  out.push(standing(drawing('road', (b, t) => drawRoad(b, t)), cover(180, 30, 520, 98, 3), duration))
  out.push(standing(drawing('valley', (b, t) => drawValley(b, t)), cover(226, 84, 266, 140, 3), duration))
  out.push(standing(drawing('cistern', (b, t) => { drawCistern(b, t); drawSunkBucket(b, t) }, (b, t) => drawCisternWater(b, t)), cover(48, 2, 84, 21, 2), duration))
  out.push(standing(drawing('channels', (b, t) => drawChannels(b, t), (b, t) => drawChannelsFront(b, t)), cover(80, 12, 148, 52, 3), duration))
  out.push(standing(drawing('noria', (b, t) => { drawNoria(b, t); drawSling(b, t) }), cover(140, 28, 170, 58, 3), duration))
  out.push(standing(drawing('gate', (b, t) => drawGate(b, t), (b, t) => { drawGateLight(b, t); drawGateFront(b, t) }), cover(164, 14, 198, 44, 2), duration))

  out.push(standing(drawing('garden-back', (b, t) => drawGardenBack(b, t)), cover(26, -22, 84, 6, 3), duration))
  const house = cover(HOUSE.x0 - 1, HOUSE.ridge - 1, HOUSE.x1 + 1, 1, 2)
  out.push(
    standing(
      drawing('cell', (b, t) => {
        drawRoof(b, t)
        drawWall(b, t)
        drawWindow(b, t, { lean: 0.04 * Math.sin(t * 1.7) + 0.02 * Math.sin(t * 0.63), home: smooth(t, bar(84), bar(86)) })
        drawDoor(b, t)
        drawGutterBack(b, t)
        drawLever(b, t)
      }),
      house,
      duration,
    ),
  )
  out.push(standing(drawing('pipe', (b, t) => drawPipe(b, t, (i) => knock(t, i))), cover(PIPE.x - 1, PIPE.head.y0 - 1, PIPE.mouth[0] + 1, 0.5, 2), duration))
  const garden = cover(14, -12, 84, 6, 2)
  out.push(
    standing(
      drawing(
        'garden',
        (b, t) => {
          drawGardenGround(b, t)
          drawLemon(b, t)
          drawRillBack(b, t)
          drawRack(b, t)
          drawTiles(b, t)
          drawWellBack(b, t)
          drawBucket(b, t, false)
        },
        (b, t) => {
          drawRillFront(b, t)
          drawRopeDrip(b, t)
          drawBucket(b, t, true)
          drawCurb(b, t)
        },
      ),
      garden,
      duration,
    ),
  )
  out.push(
    standing(
      drawing('eave', null, (b, t) => {
        drawGutterFront(b, t)
        drawEave(b, t)
        drawDrip(b, t)
        drawJar(b, t)
      }),
      house,
      duration,
    ),
  )
  out.push(standing(drawing('travelers', null, (b, t) => drawTravelers(b, t)), cover(170, 30, 300, 104, 3), duration))
  out.push(everywhere(drawing('rain', null, (b, t) => drawRain(b, t)), duration))
  return out
}
