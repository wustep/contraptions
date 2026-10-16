import type { Pt } from '../../../../parts'
import { R } from '../../../../parts'
import { arc, bar as beam, clamp, disc, easeIn, easeInOut, line, mix, poly, rect, rgba, smooth, turn, type Brush } from './brush'
import { GATE, SPUR } from './geo'
import { drawWall } from './land'
import { FORM, NOTES, at } from './music'
import { tones } from './look'

/**
 * The gate on the far bank, where the road comes up: a wall across the spur with a round-arched door, a pent roof
 * of tiles along its top, a bell gable over the door. The ball comes over the gully onto the roof and runs along it
 * to a catch at its end. The catch lets the lantern down on its rope to the candle kept in the niche under it; the
 * wick takes, and the lantern goes back up lit, while the ball waits in the catch (the melody's four bars in E).
 * Then the catch tips it down a chute into the cup on the bell's rope, and its weight rings the bell: a stroke on
 * every high A-flat of the four bars of octaves. The bell done, the ball drops to the doorstep and waits at the
 * door. When the door opens it goes in first.
 */

/** Over the gully onto the roof: bar 56, beat 2. */
export const ON_ROOF = at(56, 2)
/** Into the catch at the roof's end: bar 60. */
export const IN_CATCH = at(60, 0)
/** The lantern down to the candle, and lit on bar 61; back up by bar 62. */
export const LIT = at(61, 0)
const DOWN_FROM = IN_CATCH + 0.15
const UP_FROM = LIT + 0.55
const UP_TO = at(62, 2)
/** The catch tips the ball on into the chute; it lands in the bell rope's cup on bar 64. */
export const TO_CHUTE = at(63, 3)
export const IN_CUP = at(64, 0)
/** The bell's strokes: every high A-flat of bars 64 to 67. */
export const STROKES: number[] = NOTES.filter((n) => n.bar >= 64 && n.bar <= 67 && n.rh === 68).map((n) => n.t)
/** Out of the cup onto the doorstep, and still against the door. */
export const TO_STEP = at(67, 2)
export const AT_DOOR = at(67, 3) + 0.4
/** The door: opened on bar 79's run, shut on bar 81's downbeat. */
export const OPENS = FORM.run
export const OPEN = at(80, 0)
export const SHUTS = at(81, 0)

/* ------------------------------------------------------------------ positions */

export const roofY = (x: number): number => GATE.roof.y0 + ((GATE.roof.y1 - GATE.roof.y0) * (x - GATE.roof.x0)) / (GATE.roof.x1 - GATE.roof.x0)

/** The catch's tilt: level till the ball drops in, then cup down, held, and up again as it tips the ball on. */
export function catchAngle(t: number): number {
  const down = 0.5 * smooth(t, IN_CATCH, IN_CATCH + 0.18)
  const tip = 0.5 * smooth(t, TO_CHUTE - 0.2, TO_CHUTE)
  const back = -1.0 * smooth(t, TO_CHUTE + 0.1, TO_CHUTE + 0.7)
  return down + tip + back
}

/** The ball in the catch's cup. */
export function inCatch(t: number): Pt {
  const [px, py] = GATE.catch.pivot
  const [cx, cy] = GATE.catch.cup
  return turn([[cx, cy - R - 0.02]], catchAngle(t), px, py)[0]
}

/** The lantern's height under its hook: down to the niche's candle, and back up, swinging a little. */
export function lanternY(t: number): number {
  const { hang, low } = GATE.lamp
  const down = (low - hang) * easeInOut(clamp((t - DOWN_FROM) / (LIT - 0.1 - DOWN_FROM)))
  const up = (low - hang) * easeInOut(clamp((t - UP_FROM) / (UP_TO - UP_FROM)))
  return hang + down - up
}
const lanternSwing = (t: number): number => 0.06 * Math.sin(t * 2.1) * (0.5 + 0.5 * smooth(t, UP_FROM, UP_TO)) + 0.03 * Math.sin(t * 3.3)
/** How lit the lantern is, 0 to 1. */
export const litAt = (t: number): number => smooth(t, LIT - 0.05, LIT + 0.6)

/** The bell's swing, radians: a stroke at either end of each swing, on each high A-flat; dying away after. */
export function bellAngle(t: number): number {
  const S = STROKES
  if (!S.length || t < S[0] - 0.4) return 0
  const A = 0.85
  if (t < S[0]) return -A * easeIn(clamp((t - (S[0] - 0.4)) / 0.4))
  for (let k = 0; k + 1 < S.length; k++) {
    if (t < S[k + 1]) {
      const u = (t - S[k]) / (S[k + 1] - S[k])
      const side = k % 2 ? 1 : -1
      return side * A * Math.cos(Math.PI * u)
    }
  }
  const last = S.length - 1
  const side = last % 2 ? 1 : -1
  const u = t - S[last]
  const period = (S[last] - S[0]) / last
  return side * A * Math.exp(-u * 0.9) * Math.cos((Math.PI * u) / period)
}

/** The rope's cup, hung from the bell's lever: drawn down as the bell swings one way. */
export function cupAt(t: number): Pt {
  const a = bellAngle(t)
  return [GATE.cup[0], GATE.cup[1] + 0.9 * Math.max(0, -Math.sin(a)) * (t > IN_CUP - 0.3 ? 1 : 0)]
}

/** The door's opening, 0 shut to 1 open. */
export const doorOpen = (t: number): number => easeInOut(clamp((t - OPENS) / (OPEN - OPENS))) * (1 - easeInOut(clamp((t - (SHUTS - 0.9)) / 0.9)))

/* ------------------------------------------------------------------ drawing */

/** The wall, the door and its arch, the gable with the bell, the niche and its candle; the light, once lit. */
export function drawGate(b: Brush, t: number): void {
  const c = tones(t)
  const { x0, x1, top, door } = GATE
  // The wall: rough stone, plastered once, worn back to the stone.
  drawWall(b, c, x0, top, x1, SPUR.y + 0.4, 23)
  const plaster = mix(c.plaster, c.stone, 0.35)
  b.g.fillStyle = rgba(plaster, 0.55)
  b.g.fillRect(x0 + 6.5, top + 0.5, x1 - x0 - 8, SPUR.y - top - 1.6)
  // The gable: a stepped front of plastered stone, a round opening for the bell, a little cap.
  const gb = GATE.gable
  const mid = (gb.x0 + gb.x1) / 2
  poly(b, [[gb.x0, top + 0.1], [gb.x0, gb.top + 3.4], [gb.x0 + 1.2, gb.top + 3.4], [gb.x0 + 1.2, gb.top + 1.1], [mid, gb.top], [gb.x1 - 1.2, gb.top + 1.1], [gb.x1 - 1.2, gb.top + 3.4], [gb.x1, gb.top + 3.4], [gb.x1, top + 0.1]], plaster)
  poly(b, [[gb.x1 - 1.6, top + 0.1], [gb.x1 - 1.6, gb.top + 3.4], [gb.x1, gb.top + 3.4], [gb.x1, top + 0.1]], mix(plaster, c.stoneShade, 0.45))
  const o = gb.opening
  const or = (o.x1 - o.x0) / 2
  poly(b, [...arc((o.x0 + o.x1) / 2, o.y0 + or, or, or, Math.PI, Math.PI * 2, 12), [o.x1, o.y1], [o.x0, o.y1]], mix(c.skyTop, c.ink, 0.25))
  rect(b, o.x0 - 0.25, o.y1, o.x1 + 0.25, o.y1 + 0.3, c.stone)
  rect(b, gb.x0 - 0.15, gb.top + 3.3, gb.x0 + 1.35, gb.top + 3.55, c.stone)
  rect(b, gb.x1 - 1.35, gb.top + 3.3, gb.x1 + 0.15, gb.top + 3.55, c.stone)
  // The bell, on its yoke, swinging; its lever, out west through the opening, with the rope down from it.
  const a = bellAngle(t)
  const [bx, by] = GATE.bell
  rect(b, o.x0 - 0.1, by - 0.55, o.x1 + 0.1, by - 0.32, mix(c.wood, c.ink, 0.2))
  const bronze = mix('#7B6A45', c.ink, 0.25)
  const bell = turn([[-0.75, 2.2], [-0.65, 1.95], [-0.55, 0.9], [-0.42, 0.25], [0, 0.05], [0.42, 0.25], [0.55, 0.9], [0.65, 1.95], [0.75, 2.2]], a, 0, 0, bx, by)
  poly(b, bell, bronze)
  const lip = turn([[-0.78, 2.12], [0.78, 2.12], [0.78, 2.26], [-0.78, 2.26]], a, 0, 0, bx, by)
  poly(b, lip, mix(bronze, c.ink, 0.3))
  const clapper = turn([[0, 0.4]], a * 0.7, 0, 0, bx, by)[0]
  const ball = turn([[0, 1.95]], a * 0.7, 0, 0, bx, by)[0]
  line(b, clapper[0], clapper[1], ball[0], ball[1], c.iron, Math.max(1, b.k * 0.03))
  disc(b, ball[0], ball[1], 0.13, c.iron)
  const [lx, ly] = GATE.lever
  const lever = turn([[lx - bx, ly - by + 0.6]], a, 0, 0, bx, by - 0.6)[0]
  beam(b, bx, by - 0.45, lever[0], lever[1], c.iron, 0.08)
  const [cx, cy] = cupAt(t)
  line(b, lever[0], lever[1], cx, cy - 0.32, mix(c.wood, c.plaster, 0.3), Math.max(1, b.k * 0.025))
  // The door: planks under a round arch of voussoirs; open, the passage behind it lit.
  const dm = (door.x0 + door.x1) / 2
  const dr = (door.x1 - door.x0) / 2
  const spring = door.y0 + dr
  poly(b, [...arc(dm, spring, dr + 0.7, dr + 0.7, Math.PI, Math.PI * 2, 16), [door.x1 + 0.7, door.y1], [door.x0 - 0.7, door.y1]], c.stone)
  const hole: Pt[] = [...arc(dm, spring, dr, dr, Math.PI, Math.PI * 2, 16), [door.x1, door.y1], [door.x0, door.y1]]
  const open = doorOpen(t)
  poly(b, hole, open > 0 ? mix(c.room, c.warm, 0.25) : mix(c.wood, c.ink, 0.3))
  if (open > 0) {
    // The lit passage: a floor going in, a far wall.
    rect(b, door.x0, door.y1 - 1.4, door.x1, door.y1, mix(c.room, c.ink, 0.25))
  }
  const wood = mix(c.wood, c.ink, 0.22)
  const w = (door.x1 - door.x0) * Math.cos((open * Math.PI) / 2.15)
  if (w > 0.05) {
    // The leaf, hinged on its west side, narrowing as it swings in.
    b.g.save()
    b.g.beginPath()
    for (const [x, y] of hole) b.g.lineTo(x, y)
    b.g.closePath()
    b.g.clip()
    rect(b, door.x0, door.y0 - 0.2, door.x0 + w, door.y1, wood)
    b.g.fillStyle = mix(wood, c.ink, 0.35)
    for (let k = 1; k < 6; k++) b.g.fillRect(door.x0 + (w * k) / 6, door.y0, 0.05, door.y1 - door.y0)
    rect(b, door.x0, door.y1 - 3, door.x0 + w, door.y1 - 2.8, mix(wood, c.ink, 0.35))
    b.g.restore()
  }
  // The niche, with its candle, low by the door.
  const [nx, ny] = GATE.lamp.candle
  poly(b, [...arc(nx, ny - 1.0, 0.7, 0.7, Math.PI, Math.PI * 2, 10), [nx + 0.7, ny + 0.5], [nx - 0.7, ny + 0.5]], mix(c.stoneDeep, c.ink, 0.3))
  rect(b, nx - 0.85, ny + 0.45, nx + 0.85, ny + 0.65, c.stone)
  rect(b, nx - 0.07, ny - 0.4, nx + 0.07, ny + 0.45, '#E8DECA')
  const flick = 1 + 0.12 * Math.sin(t * 13) * Math.sin(t * 7.3)
  poly(b, [[nx, ny - 0.4 - 0.32 * flick], [nx + 0.07, ny - 0.47], [nx, ny - 0.4], [nx - 0.07, ny - 0.47]], c.flame)
  // The candle's light in the niche: its back wall warmed, no more.
  b.g.fillStyle = rgba(c.warm, 0.25)
  b.g.beginPath()
  b.g.ellipse(nx, ny - 0.5, 0.55, 0.65, 0, 0, Math.PI * 2)
  b.g.fill()
  // The catch at the roof's east end, and the chute down the wall from it.
  const [px, py] = GATE.catch.pivot
  const ca = catchAngle(t)
  const lev = turn([[px - 0.75, py - 0.1], [px + 0.35, py + 0.05]], ca, px, py)
  beam(b, lev[0][0], lev[0][1], lev[1][0], lev[1][1], c.iron, 0.07, 'round')
  const cup = turn([[GATE.catch.cup[0] - 0.2, GATE.catch.cup[1] - 0.1], [GATE.catch.cup[0] + 0.2, GATE.catch.cup[1] - 0.1], [GATE.catch.cup[0] + 0.16, GATE.catch.cup[1] + 0.06], [GATE.catch.cup[0] - 0.16, GATE.catch.cup[1] + 0.06]], ca, px, py)
  poly(b, cup, c.iron)
  disc(b, px, py, 0.07, c.iron)
  const ch = GATE.chute
  b.g.strokeStyle = mix(c.iron, c.stone, 0.2)
  b.g.lineWidth = 0.16
  b.g.lineCap = 'round'
  b.g.beginPath()
  b.g.moveTo(ch[0][0], ch[0][1])
  for (const [x, y] of ch) b.g.lineTo(x, y)
  b.g.stroke()
}

/** The lantern on its rope, the rope's cup, the roof's tiles: in front of the ball. */
export function drawGateFront(b: Brush, t: number): void {
  const c = tones(t)
  // The pent roof along the wall's top: a row of covers' round ends, the ridge cap the ball runs on behind them.
  const { roof } = GATE
  rect(b, roof.x0 - 0.4, roof.y0 + 0.12, roof.x1 + 0.3, GATE.top + 0.25, c.tile)
  for (let x = roof.x0; x < roof.x1; x += 0.72) {
    poly(b, [...arc(x + 0.36, GATE.top + 0.22, 0.32, 0.2, 0, Math.PI, 6)], c.tileShade)
  }
  // The lantern: hook and rope, the iron frame, the glass, its flame once lit.
  const { lamp } = GATE
  const y = lanternY(t)
  const sw = lanternSwing(t)
  beam(b, lamp.x - 0.9, lamp.hook - 0.35, lamp.x + 0.05, lamp.hook - 0.35, c.iron, 0.08)
  disc(b, lamp.x, lamp.hook - 0.35, 0.12, c.iron)
  b.g.save()
  b.g.translate(lamp.x, lamp.hook - 0.35)
  b.g.rotate(sw)
  const drop = y - (lamp.hook - 0.35)
  line(b, 0, 0, 0, drop - 0.2, mix(c.wood, c.plaster, 0.3), Math.max(1, b.k * 0.022))
  const lit = litAt(t)
  const glass = lit > 0 ? mix(mix(c.glass, c.ink, 0.45), c.warm, lit) : mix(c.glass, c.ink, 0.45)
  poly(b, [[-0.3, drop - 0.2], [0.3, drop - 0.2], [0.42, drop + 0.05], [-0.42, drop + 0.05]], c.iron)
  poly(b, [[-0.36, drop + 0.05], [0.36, drop + 0.05], [0.3, drop + 0.85], [-0.3, drop + 0.85]], glass)
  beam(b, 0, drop + 0.05, 0, drop + 0.85, c.iron, 0.04)
  rect(b, -0.36, drop + 0.85, 0.36, drop + 0.98, c.iron)
  if (lit > 0) {
    const f = 1 + 0.1 * Math.sin(t * 11) * Math.sin(t * 5.9)
    b.g.globalAlpha = lit
    poly(b, [[0, drop + 0.25 - 0.2 * f], [0.09, drop + 0.55], [0, drop + 0.68], [-0.09, drop + 0.55]], c.flame)
    b.g.globalAlpha = 1
  }
  b.g.restore()
  // The bell rope's cup.
  const [cx, cy] = cupAt(t)
  poly(b, [[cx - 0.3, cy - 0.3], [cx + 0.3, cy - 0.3], [cx + 0.22, cy + 0.12], [cx - 0.22, cy + 0.12]], mix(c.wood, c.ink, 0.3))
}

/** The lantern's light where it falls: down the wall and on the ground before the gate, flat and warm. */
export function drawGateLight(b: Brush, t: number): void {
  const lit = litAt(t)
  const open = doorOpen(t)
  const c = tones(t)
  const g = b.g
  if (lit > 0) {
    const y = lanternY(t) + 0.5
    const x = GATE.lamp.x
    g.fillStyle = rgba(c.warm, 0.13 * lit)
    g.beginPath()
    g.moveTo(x - 0.5, y)
    g.lineTo(x + 0.5, y)
    g.lineTo(x + 6.5, SPUR.y)
    g.lineTo(x - 6.5, SPUR.y)
    g.closePath()
    g.fill()
    g.fillStyle = rgba(c.warm, 0.22 * lit)
    g.beginPath()
    g.ellipse(x, SPUR.y + 0.15, 6.5, 0.35, 0, 0, Math.PI * 2)
    g.fill()
  }
  if (open > 0) {
    const { door } = GATE
    g.fillStyle = rgba(c.warm, 0.3 * open)
    g.beginPath()
    g.moveTo(door.x0, door.y1)
    g.lineTo(door.x1, door.y1)
    g.lineTo(door.x1 + 3.5 * open, door.y1 + 0.5)
    g.lineTo(door.x0 - 1.5 * open, door.y1 + 0.5)
    g.closePath()
    g.fill()
  }
}

export { rect }
