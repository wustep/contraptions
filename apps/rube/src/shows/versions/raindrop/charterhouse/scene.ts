import type { Placed } from '../../../../plan'
import { frame, rgba, smooth } from './brush'
import { HOUSE, PIPE } from './geo'
import { drawDoor, drawEave, drawGutterBack, drawGutterFront, drawNeighbours, drawPipe, drawRoof, drawWall, drawWindow } from './house'
import { drawBehind, drawCypress, drawFaces, drawGround, drawGully, drawRoad, drawTerraces, drawValley } from './land'
import { drawDrip, drawJar, drawLever } from './jar'
import { bar } from './music'
import { drawRain, type Lit } from './rain'
import { KNOCKS } from './route'
import { cover, drawing, everywhere, standing } from './show'
import { drawSky, drawVeil } from './sky'
import { HOLE, cutOn, drawCistern, drawCisternWater, drawSunkBucket } from './cistern'
import { drawChannels, drawChannelsFront } from './terraces'
import { drawNoria, drawSling } from './noria'
import { doorOpen, drawGate, drawGateFront, drawGateLight, lanternY, litAt } from './gate'
import { drawTravelers, theirLight, woman } from './travelers'
import { GATE, groundY } from './geo'
import { drawBucket, drawCurb, drawGardenBack, drawGardenGround, drawLemon, drawPots, drawRack, drawRillBack, drawRillFront, drawRopeDrip, drawTiles, drawWellBack } from './garden'

/** How hard the pipe's length `i` is jolted at `t`: a knock as the ball goes through it, dying in a tenth of a second. */
function knock(t: number, i: number): number {
  const k = KNOCKS[i]
  if (k === undefined) return 0
  const u = t - k
  if (u < 0 || u > 0.25) return 0
  return Math.exp(-u * 18) * Math.sin(u * 70)
}

/** What is lit in the rain at `t`: the cell's window, the gate's lantern and its door, the travellers' lantern. */
function lightsAt(t: number): Lit[] {
  const w = HOUSE.window
  const out: Lit[] = [{ x0: w.x0 - 0.2, y0: w.y0 - 0.2, x1: w.x1 + 0.2, y1: w.y1 + 0.3, strength: 0.32 }]
  const lit = litAt(t)
  if (lit > 0) {
    const y = lanternY(t)
    out.push({ x0: GATE.lamp.x - 1.8, y0: y - 1.2, x1: GATE.lamp.x + 1.8, y1: y + 2.6, strength: 0.4 * lit })
  }
  const open = doorOpen(t)
  if (open > 0) out.push({ x0: GATE.door.x0, y0: GATE.door.y0, x1: GATE.door.x1 + 1.5 * open, y1: GATE.door.y1, strength: 0.35 * open })
  const theirs = theirLight(t)
  if (theirs > 0) {
    const [x, y] = woman(t).p
    out.push({ x0: x - 1.6, y0: y - 5, x1: x + 3, y1: y + 0.2, strength: 0.25 * theirs })
  }
  return out
}

/** Everything on the stage, in the order it is drawn. The first is the stand-in the stage spins the ball by. */
export function scenery(duration: number): Placed[] {
  const out: Placed[] = [standing(drawing('spin', null), [], duration)]
  out.push(everywhere(drawing('sky', (b, t) => drawSky(b, t)), duration))
  out.push(everywhere(drawing('veil', (b, t) => drawVeil(b, t)), duration))
  out.push(everywhere(drawing('behind', (b, t) => drawBehind(b, t)), duration))
  out.push(standing(drawing('neighbours', (b, t) => drawNeighbours(b, t)), cover(-50, -64, 0, 1, 3), duration))
  out.push(everywhere(drawing('ground', (b, t) => drawGround(b, t)), duration))
  out.push(standing(drawing('faces', (b, t) => drawFaces(b, t)), cover(-46, 0, 141, 42, 3), duration))
  out.push(standing(drawing('terraces', (b, t) => drawTerraces(b, t)), cover(60, 0, 152, 30, 3), duration))
  out.push(standing(drawing('gully', (b, t) => drawGully(b, t)), cover(150, 26, 172, 48, 3), duration))
  out.push(standing(drawing('road', (b, t) => {
    drawRoad(b, t)
    // Two cypresses on the ridge the road climbs, and a third lower down: against the sky.
    for (const [x, h, seed] of [[214, 11, 11], [262, 13, 12], [318, 10, 13]] as const) drawCypress(b, t, x, groundY(x) + 0.3, h, seed)
  }), cover(180, 18, 520, 98, 3), duration))
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
        drawWindow(b, t, { lean: 0.04 * Math.sin(t * 1.7) + 0.02 * Math.sin(t * 0.63), her: smooth(t, bar(84), bar(85) + 0.6), boy: smooth(t, bar(84) + 1.4, bar(86)), touch: smooth(t, bar(86), bar(87)) })
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
          drawPots(b, t)
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
  out.push(
    everywhere(
      drawing('rain', null, (b, t) => {
        // No rain in the ground: while the cistern is cut open, the hole in the wall is kept clear of it.
        if (!cutOn(t)) return drawRain(b, t, lightsAt(t))
        const f = frame(b)
        b.g.save()
        b.g.beginPath()
        b.g.rect(f.x0 - 1, f.y0 - 1, f.x1 - f.x0 + 2, f.y1 - f.y0 + 2)
        b.g.moveTo(HOLE[0][0], HOLE[0][1])
        for (const [x, y] of HOLE) b.g.lineTo(x, y)
        b.g.closePath()
        b.g.clip('evenodd')
        drawRain(b, t, lightsAt(t))
        b.g.restore()
      }),
      duration,
    ),
  )
  // The curtain: up from black onto the first note, and down to black at the very end, after the credits.
  out.push(
    everywhere(
      drawing('curtain', null, (b, t) => {
        const dark = Math.max(1 - smooth(t, 0, bar(1)), smooth(t, duration - 2.2, duration - 0.2))
        if (dark <= 0) return
        const f = frame(b)
        b.g.fillStyle = rgba('#0A0D12', dark)
        b.g.fillRect(f.x0 - 1, f.y0 - 1, f.x1 - f.x0 + 2, f.y1 - f.y0 + 2)
      }),
      duration,
    ),
  )
  return out
}
