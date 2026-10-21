import { R } from '../../../../../parts'
import type { Key } from '../camera'
import { NOFACE_SIZE } from '../cast'
import { END } from '../credits'
import { BATH, HALT, SEA_Y, SWAMP } from '../geo'
import { light } from '../light'
import { M } from '../music'
import { box, ellipse, fill, ink, layer, lit, region, smooth, standing, type Paint, type Pt } from '../paint'
import { Path, hop, rest, ride, roll, type Move } from '../path'
import type { Scene } from '../scene'
import { drawDragon, seat } from '../world/dragon'
import { drawWater, reflect, rings } from '../world/sea'
import { horizonOf } from '../world/sky'
import {
  ARRIVE_HALT,
  BENCH_Y,
  BOARD,
  BOARD_OFF,
  CAR,
  DRAGON_FROM,
  DRAGON_UP,
  GROUND_Y,
  HALT_TOP,
  HER_SEAT,
  HIS_SEAT,
  INTO_DUSK,
  INTO_NIGHT,
  LANDING,
  LEAVE_HALT,
  LEAVE_SWAMP,
  ARRIVE_SWAMP,
  SWAMP_STOP,
  HALT_STOP,
  carX,
  seatAt,
  spineAt,
} from './train/plan'
import { WINDOWS, drawCarReflection, drawFarHouses, drawHalt, drawInside, drawLanding, drawLine, drawOutside, drawStation, drawSunSquares, deck } from './train/line'
import { drawCottage, drawIsland, drawLamp, drawTreeline, drawWood } from './train/swamp'

/**
 * The train over the water (M.high → M.summit): high and light, the quiet, the theme's return.
 *
 * Out of the bathhouse's east foot by the boiler room she steps down into the new sea and goes along the rails under
 * its skin, a step a note, rings going out from her, No-Face after her, to the little halt. The train comes out from
 * under the bathhouse braking and stops for them; they go in by its door and sit. It goes away east over the water,
 * small on the vast still sea under the low sun, its reflection under it, the posts of its wire going by; and on the
 * swell we are in the car beside them, its side cut away, the shadow passengers sitting as people sit on a long ride,
 * the sun's window-squares sliding over all of them.
 *
 * In the deepest quiet, dusk: the car stops at a lonely station where a small shadow girl stands; she does not get
 * on; it goes on and leaves her there, its lit windows going away over the water. On the theme's return, night, the
 * train comes in to Swamp Bottom; they get off; it goes on into the dark. Out of the wood a lamp on one leg comes
 * hopping to meet them, a hop an eighth, bows, and lights them along the path to the cottage's lit window. The white
 * dragon comes down out of the night over the trees, his head lowered beside her; she goes up onto his back; No-Face
 * stays with the lamp; and on the summit he is lifting away with her into the sky.
 */

export const FROM = M.high
export const TO = M.summit

/* ------------------------------------------------------------------ her and No-Face */

const NR = R * NOFACE_SIZE
const onWater = (x: number, r = R): Pt => [x, SEA_Y - r]
const onDeck = (x: number, top: number, r = R): Pt => [x, top - r]

/** Her steps along the rails, each landing on a note: where she comes to rest after each. */
const STEP_DOWN: [number, number] = [139.15, 139.45]
export const STEPS: [number, number][] = [
  [140.32, 72.3],
  [141.0, 72.85],
  [141.78, 73.35],
  [142.58, 73.86],
]
/** Up onto the halt's deck before the train comes out from under the bathhouse. */
const UP_DECK: [number, number] = [142.95, 143.24]
const AT_DOOR_X = HALT_STOP + CAR.door
/** When each goes in at the door, and sits. */
const HER_IN: [number, number] = [148.24, 148.6]
const HER_SIT: [number, number] = [148.66, 148.96]
const HIS_IN: [number, number] = [148.66, 148.92]
const HIS_SIT: [number, number] = [148.96, 149.26]
/** At Swamp Bottom: off the bench to the door, out onto the platform. */
const HER_DOOR: [number, number] = [176.41, 176.81]
const HER_OUT: [number, number] = [176.81, 177.19]
const HIS_DOOR: [number, number] = [176.86, 177.19]
const HIS_OUT: [number, number] = [177.25, 177.6]
const SWAMP_DOOR_X = SWAMP_STOP + CAR.door
/** Along the path after the lamp. */
const FOLLOW: [number, number] = [184.6, 188.7]
const HER_STOP_X = 248.6
const HIS_STOP_X = 246.0

function herMoves(): Move[] {
  const land = onDeck(LANDING.x1 - 0.35, LANDING.y)
  const down = onWater(71.75)
  const out: Move[] = [rest(land, FROM, STEP_DOWN[0]), hop(land, down, STEP_DOWN[0], STEP_DOWN[1])]
  let at = down
  let t = STEP_DOWN[1]
  for (const [arrive, x] of STEPS) {
    const go = Math.max(t + 0.12, arrive - 0.55)
    out.push(rest(at, t, go), roll([at, onWater(x)], go, arrive, 'inout'))
    at = onWater(x)
    t = arrive
  }
  const deckAt = onDeck(74.55, HALT_TOP)
  out.push(rest(at, t, UP_DECK[0]), hop(at, deckAt, UP_DECK[0], UP_DECK[1]))
  const wait = onDeck(AT_DOOR_X - 0.15, HALT_TOP)
  out.push(rest(deckAt, UP_DECK[1], 143.6), roll([deckAt, wait], 143.6, 144.4, 'inout'), rest(wait, 144.4, HER_IN[0]))
  const door: Pt = [AT_DOOR_X, CAR.floor - R]
  out.push(roll([wait, door], HER_IN[0], HER_IN[1], 'inout'), rest(door, HER_IN[1], HER_SIT[0]))
  out.push(hop(door, seatAt(HER_SIT[1], HER_SEAT), HER_SIT[0], HER_SIT[1]))
  out.push(ride((s) => seatAt(s, HER_SEAT), HER_SIT[1], HER_DOOR[0], () => 0))
  // Swamp Bottom.
  const sdoor: Pt = [SWAMP_DOOR_X, CAR.floor - R]
  const sdeck = onDeck(SWAMP_DOOR_X + 0.35, SWAMP.y)
  const pathStart: Pt = [SWAMP.x1 + 0.25, GROUND_Y - R]
  out.push(hop(seatAt(HER_DOOR[0], HER_SEAT), sdoor, HER_DOOR[0], HER_DOOR[1]))
  out.push(roll([sdoor, sdeck], HER_OUT[0], HER_OUT[1], 'inout'))
  out.push(rest(sdeck, HER_OUT[1], 177.4), roll([sdeck, onDeck(SWAMP.x1 - 0.2, SWAMP.y), pathStart], 177.4, 178.3, 'inout'))
  const stop: Pt = [HER_STOP_X, GROUND_Y - R]
  out.push(rest(pathStart, 178.3, FOLLOW[0]), roll([pathStart, stop], FOLLOW[0], FOLLOW[1], 'inout'), rest(stop, FOLLOW[1], BOARD_OFF))
  // Up onto his back, and away.
  const seated = (s: number) => seat(spineAt(s), DRAGON_UP, 0.13, R)
  out.push(hop(stop, seated(BOARD), BOARD_OFF, BOARD))
  out.push(ride(seated, BOARD, TO))
  return out
}

function hisMoves(): Move[] {
  const land = onDeck(LANDING.x0 + 0.6, LANDING.y, NR)
  const down = onWater(71.25, NR)
  const out: Move[] = [rest(land, FROM, 140.0), hop(land, down, 140.0, 140.32)]
  let at = down
  let t = 140.32
  // After her, a step behind, about half a cell back.
  for (const [arrive, x] of STEPS) {
    const to = onWater(x - 0.52, NR)
    const go = Math.max(t + 0.1, arrive - 0.6)
    out.push(rest(at, t, go), roll([at, to], go, arrive + 0.45, 'inout'))
    at = to
    t = arrive + 0.45
  }
  const deckAt = onDeck(74.62, HALT_TOP, NR)
  out.push(rest(at, t, 144.45), hop(at, deckAt, 144.45, 144.74))
  const wait = onDeck(AT_DOOR_X - 0.68, HALT_TOP, NR)
  out.push(rest(deckAt, 144.74, 145.1), roll([deckAt, wait], 145.1, 145.6, 'inout'), rest(wait, 145.6, HIS_IN[0]))
  const door: Pt = [AT_DOOR_X, CAR.floor - NR]
  out.push(roll([wait, door], HIS_IN[0], HIS_IN[1], 'inout'), rest(door, HIS_IN[1], HIS_SIT[0]))
  out.push(hop(door, seatAt(HIS_SIT[1], HIS_SEAT, NR), HIS_SIT[0], HIS_SIT[1]))
  out.push(ride((s) => seatAt(s, HIS_SEAT, NR), HIS_SIT[1], HIS_DOOR[0], () => 0))
  const sdoor: Pt = [SWAMP_DOOR_X, CAR.floor - NR]
  const sdeck = onDeck(SWAMP_DOOR_X + 0.1, SWAMP.y, NR)
  out.push(hop(seatAt(HIS_DOOR[0], HIS_SEAT, NR), sdoor, HIS_DOOR[0], HIS_DOOR[1]), rest(sdoor, HIS_DOOR[1], HIS_OUT[0]))
  out.push(roll([sdoor, sdeck], HIS_OUT[0], HIS_OUT[1], 'inout'))
  const end = onDeck(SWAMP.x1 - 0.45, SWAMP.y, NR)
  out.push(rest(sdeck, HIS_OUT[1], 177.7), roll([sdeck, end], 177.7, 178.4, 'inout'), rest(end, 178.4, FOLLOW[0] + 0.35))
  const pathStart: Pt = [SWAMP.x1 + 0.25, GROUND_Y - NR]
  const stop: Pt = [HIS_STOP_X, GROUND_Y - NR]
  out.push(roll([end, pathStart, stop], FOLLOW[0] + 0.35, FOLLOW[1] - 0.2, 'inout'), rest(stop, FOLLOW[1] - 0.2, TO))
  return out
}

const HER = herMoves()
const HIS = hisMoves()
const herPath = new Path(HER, 'chihiro-train')
const hisPath = new Path(HIS, 'noface-train')

/** Whether each is out of the car (on the water, a deck or the path), so the car's near wall stands behind them. */
const herOut = (t: number) => t < HER_IN[0] + 0.2 || t > HER_OUT[0] + 0.05
const hisOut = (t: number) => t < HIS_IN[0] + 0.15 || t > HIS_OUT[0] + 0.05

/* ------------------------------------------------------------------ the camera */

const SHOTS: Key[] = [
  // Close at the bathhouse's east foot, late in the day: the landing, the water she steps down onto.
  { t: FROM, cells: 3.7, at: [72.4, 3.15], cut: true },
  { t: 141.6, cells: 3.8, at: [72.95, 3.15] },
  // Opening as the train comes out from under the bathhouse.
  { t: 143.9, cells: 4.6, at: [73.35, 2.95] },
  { t: ARRIVE_HALT, cells: 5.0, at: [74.3, 2.8] },
  { t: LEAVE_HALT, cells: 5.0, at: [74.9, 2.75] },
  // Away east: the train small on the vast still sea.
  { t: 151.0, cells: 8.5, at: [80.5, 1.75] },
  { t: 153.0, cells: 12, at: [86.0, 1.35] },
  { t: 156.95, cells: 12.4, at: [94.6, 1.25] },
  // In the car beside them, its side cut away: held on the car as it goes (its pace, so it does not slide in the frame).
  { t: M.swell2, cells: 3.0, at: [carX(M.swell2) - 0.1, 3.2], cut: true },
  { t: M.swell2 + 0.02, cells: 3.0, at: [carX(M.swell2 + 0.02) - 0.1, 3.2] },
  { t: INTO_DUSK - 0.08, cells: 2.85, at: [carX(INTO_DUSK - 0.08) - 0.05, 3.2] },
  { t: INTO_DUSK - 0.06, cells: 2.85, at: [carX(INTO_DUSK - 0.06) - 0.05, 3.2] },
  // The lonely station, at dusk.
  { t: INTO_DUSK, cells: 5.6, at: [148.7, 2.85], cut: true, focus: [146.0, 3.4] },
  { t: INTO_NIGHT - 0.05, cells: 5.9, at: [149.0, 2.8], focus: [146.0, 3.4] },
  // Night: on to Swamp Bottom, the camera a little ahead of the car.
  { t: INTO_NIGHT, cells: 8.6, at: [carX(INTO_NIGHT) + 2.4, 2.05], cut: true },
  { t: INTO_NIGHT + 0.02, cells: 8.6, at: [carX(INTO_NIGHT + 0.02) + 2.4, 2.05] },
  { t: 172.9, cells: 8.0, at: [carX(172.9) + 2.1, 2.15] },
  { t: ARRIVE_SWAMP, cells: 4.8, at: [238.3, 2.75] },
  { t: LEAVE_SWAMP, cells: 4.8, at: [239.3, 2.75] },
  // The lamp out of the wood.
  { t: 181.2, cells: 4.6, at: [241.4, 2.85] },
  { t: FOLLOW[0], cells: 4.6, at: [242.0, 2.85] },
  // Along the path to the cottage; the frame opens for the dragon coming down over the trees.
  { t: 187.2, cells: 5.2, at: [246.2, 2.6] },
  { t: 188.9, cells: 6.2, at: [247.6, 2.0] },
  { t: BOARD, cells: 6.2, at: [247.6, 2.05] },
  { t: TO - 0.02, cells: 6.8, at: [246.3, 1.4] },
]

/* ------------------------------------------------------------------ the drawings */

const L = light
/** The car's side cut away: from the swell into the car until the dusk. */
const cut = (t: number) => (t >= M.swell2 && t < INTO_DUSK ? 1 : 0)
/** How far the low sun's squares lie in the car. */
const sunIn = (t: number) => {
  const l = L(t)
  return cut(t) * smooth(l.sunY, 0.3, 0.75) * (1 - l.night)
}
/** The shadow passengers' places on the bench, from the car's middle. */
const PASSENGERS = [-1.78, -1.22, -0.62, 1.82]

const SEA_REGION = region(50, -24, 272, 9, 3)
const far = standing('train-far', SEA_REGION, END, (g) => {
  const l = L(g.t)
  // The sea's far things belong east of the bathhouse: they come in as the camera comes round its east end.
  const east = smooth(g.view.cx, 56, 66)
  if (east <= 0.01) return
  g.ctx.save()
  g.ctx.globalAlpha = east
  layer(g, 0.22, 0, [150, 0], (v) => drawFarHouses(g, l, horizonOf(v), v))
  layer(g, 0.3, 0, [240, 0], (v) => drawTreeline(g, l, horizonOf(v), v))
  g.ctx.restore()
})
const water = standing('train-water', SEA_REGION, END, (g) => {
  const l = L(g.t)
  drawWater(g, l, BATH.x0, 275)
  footingsReflection(g, l)
})

/** The bathhouse's footings and boiler room given back by the water under them. */
function footingsReflection(g: Paint, l: ReturnType<typeof light>): void {
  if (g.view.x0 > BATH.x1 + 1 || g.view.x1 < BATH.x0 - 1) return
  reflect(g, () => {
    const { ctx } = g
    box(ctx, BATH.x0 + 0.3, SEA_Y - 1.6, BATH.x1 - BATH.x0 - 0.6, 1.6, lit('#21170F', l.ambient))
    for (let x = BATH.x0 + 0.45; x < BATH.x1; x += 1.55) box(ctx, x - 0.1, SEA_Y - 1.6, 0.2, 1.6, lit('#5A4232', l.ambient))
    const b = BATH.boiler
    box(ctx, b.x0, b.y0 + 0.6, b.x1 - b.x0, b.y1 - b.y0 - 0.6, lit('#7A4A36', l.ambient))
  }, 0.32)
}

const woodFar = standing('train-wood-far', region(226, -6, 272, 7, 1.5), END, (g) => drawWood(g, L(g.t), true))
const line = standing('train-line', region(68, -1, 272, 7, 2), END, (g) => drawLine(g, L(g.t), 71.6, 268))
const station = standing('train-station', region(142, -1, 156, 6, 1), END, (g) => drawStation(g, L(g.t)))
const swamp = standing('train-swamp', region(234, -3, 262, 7, 1), END, (g) => {
  const l = L(g.t)
  drawIsland(g, l)
  drawCottage(g, l)
  drawWood(g, l, false)
})

/** The car is there from when it comes under the bathhouse to the scene's end, by then far off east in the dark. */
const carOn = (t: number) => t >= 143 && t < TO
/** It is out from under the bathhouse only east of the building's end. */
function underBuilding(g: Paint, fn: () => void): void {
  const { ctx, view: v } = g
  ctx.save()
  ctx.beginPath()
  ctx.rect(BATH.x1 - 0.05, v.y0 - 1, 400, v.h + 2)
  ctx.clip()
  fn()
  ctx.restore()
}
const car = standing('train-car', region(56, 1, 272, 6, 1.5), END, (g) => {
  if (!carOn(g.t)) return
  const x = carX(g.t)
  if (x + 3 < g.view.x0 || x - 3 > g.view.x1) return
  const l = L(g.t)
  underBuilding(g, () => {
    drawCarReflection(g, l, g.t)
    drawInside(g, l, g.t, PASSENGERS)
    drawOutside(g, l, g.t, 1 - cut(g.t))
  })
})
const decks = standing('train-decks', [...region(68, 2, 78, 5, 1), ...region(234, 2, 241, 5, 1)], END, (g) => {
  const l = L(g.t)
  drawLanding(g, l)
  drawHalt(g, l)
  deck(g, l, SWAMP.x0, SWAMP.x1, SWAMP.y)
})
const herRings = standing('train-rings', region(70, 2, 76, 5, 1), END, (g) => {
  const l = L(g.t)
  rings(g, l, 71.75, STEP_DOWN[1], 1.1)
  for (const [at, x] of STEPS) rings(g, l, x, at, 0.9)
  rings(g, l, 71.25, 140.32, 1.2)
})
const lamp = standing('train-lamp', region(236, 0, 254, 5, 1), END, (g) => drawLamp(g, L(g.t), g.t, g.t >= INTO_NIGHT ? 1 : 0))
const dragon = standing('train-dragon', region(232, -12, 270, 6, 2), END, (g) => {
  if (g.t < DRAGON_FROM || g.t > TO + 0.5) return
  // Legs reaching down as he comes to her, held back again as he goes.
  const reach = smooth(g.t, 189.6, 190.6) * (1 - smooth(g.t, BOARD + 0.1, BOARD + 0.8))
  drawDragon(g, spineAt(g.t), L(g.t), { up: DRAGON_UP, reach })
})

/** No-Face's mask over his ball, wherever he is (under the car's wall when he is inside it). */
function mask(g: Paint, x: number, y: number, r: number): void {
  const { ctx } = g
  ellipse(ctx, x, y - r * 0.06, r * 0.5, r * 0.64)
  fill(ctx, '#ECE8DE')
  for (const s of [-1, 1]) {
    const ex = x + s * r * 0.21
    const ey = y - r * 0.2
    ellipse(ctx, ex, ey, r * 0.085, r * 0.055)
    fill(ctx, '#1A1418')
    // The purple marks over and under each eye.
    ctx.beginPath()
    ctx.moveTo(ex, ey - r * 0.12)
    ctx.lineTo(ex, ey - r * 0.3)
    ctx.moveTo(ex, ey + r * 0.1)
    ctx.lineTo(ex, ey + r * 0.24)
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#7A4A8C'
    ctx.lineWidth = r * 0.07
    ctx.stroke()
    ctx.lineCap = 'butt'
  }
  ctx.beginPath()
  ctx.moveTo(x - r * 0.12, y + r * 0.3)
  ctx.quadraticCurveTo(x, y + r * 0.35, x + r * 0.12, y + r * 0.3)
  ink(g, '#1A1418', 1.2)
}

const hisMask = standing('train-mask', [...region(68, 1, 160, 6, 2), ...region(230, 1, 256, 6, 2)], END, null, (g) => {
  if (g.t < FROM || g.t >= TO) return
  const [x, y] = hisPath.where(g.t)
  if (x < g.view.x0 - 1 || x > g.view.x1 + 1) return
  mask(g, x, y, NR)
})

/** The car's near wall again over whoever is inside it (but never over anyone outside on a deck in front of it). */
const carOver = standing('train-car-over', region(56, 1, 272, 6, 1.5), END, null, (g) => {
  if (!carOn(g.t)) return
  const x = carX(g.t)
  if (x + 3 < g.view.x0 || x - 3 > g.view.x1) return
  const l = L(g.t)
  drawSunSquares(g, g.t, sunIn(g.t))
  const wall = 1 - cut(g.t)
  if (wall <= 0.003) return
  const { ctx } = g
  ctx.save()
  ctx.beginPath()
  ctx.rect(Math.max(x - 3, BATH.x1 - 0.05), CAR.roof - 0.5, 6, CAR.floor - 0.02 - (CAR.roof - 0.5))
  const holes: [Pt, number][] = []
  if (herOut(g.t)) holes.push([herPath.where(g.t), R + 0.03])
  if (hisOut(g.t)) holes.push([hisPath.where(g.t), NR + 0.03])
  for (const [[hx, hy], r] of holes) {
    ctx.moveTo(hx + r, hy)
    ctx.arc(hx, hy, r, 0, Math.PI * 2, true)
  }
  ctx.clip('evenodd')
  drawOutside(g, l, g.t, wall)
  ctx.restore()
})

export const train: Scene = {
  key: 'train',
  from: FROM,
  to: TO,
  hero: HER,
  noface: { moves: HIS, on: [[FROM, TO]] },
  shots: SHOTS,
  dissolves: [
    [FROM, 1.6],
    [INTO_DUSK, 1.6],
    [INTO_NIGHT, 1.6],
  ],
  back: [far, water],
  mid: [woodFar, line, station, car, swamp, decks, herRings, lamp, dragon],
  front: [hisMask, carOver],
  overview: { x0: 66, y0: -5, x1: 262, y1: 7 },
}

/** For scene 5: where she is as the summit's cut comes, on his back. */
export const RIDE_OUT: Pt = herPath.where(TO)
export { BENCH_Y, HALT, WINDOWS, LEAVE_HALT }
