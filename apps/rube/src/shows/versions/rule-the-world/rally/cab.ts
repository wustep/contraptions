import type { Pt } from '../../../../parts'
import { R } from '../../../../parts'
import { ellipse, glow, line, path, rect, rgba, shape, ctxOf, type Pen } from './pen'

/**
 * Wally's cab: the one thing drawn on both sides of a cut (the bowling alley's curb, and the road in New Jersey), so
 * both places draw it from here and it is the same car to the line. A 1950s cab in profile, facing right, yellow, with
 * its rear side window wide and low so the back seat shows through it: Marty sits on that seat, and Rachel beside him.
 *
 * Everything is placed from `seat`: the point where Marty's centre is when he sits on the back seat. The cushion's top
 * is `seat[1] + R`; the road is `seat[1] + CAB.road`.
 */
export const CAB = {
  /** From the seat to the road. */
  road: 0.84,
  /** The body's ends, from the seat: the rear bumper and the front. */
  rear: -1.75,
  front: 4.6,
  /** The roof's height over the road. */
  roof: -2.05,
  /** The wheels: their centres' x from the seat, and their radius. */
  wheels: [-0.85, 3.35] as const,
  wheel: 0.4,
  /** The back seat's cushion, from the seat: its ends. */
  cushion: [-0.55, 1.25] as const,
  /** Where Wally sits at the wheel, from the seat. */
  driver: 2.45,
}

const C = {
  body: '#E3B23C',
  bodyDark: '#B9862A',
  bodyLight: '#F2CF6A',
  chrome: '#C9CCCB',
  chromeDark: '#7E8384',
  glass: '#2A3238',
  interior: '#2B1C18',
  seat: '#6E2A22',
  seatLight: '#8C3A2E',
  tyre: '#151515',
  hub: '#9EA3A3',
  check: '#1A1A1A',
  lamp: '#FFF1C2',
  tail: '#D83A2A',
  wally: '#1C1714',
  cap: '#3A3F44',
}

export interface CabLook {
  /** Show seconds, for the wheels and the lights. */
  t: number
  /** How far it has rolled, in cells (the wheels turn by it). */
  rolled?: number
  /** The headlights, 0 to 1. */
  lights?: number
  /** Wally at the wheel. */
  wally?: boolean
  /** A bounce of the body on its springs, in cells (y down). */
  bob?: number
}

/** The cab, whole, from its back seat at `seat` (world cells). Draw it before the ball. */
export function drawCab(pen: Pen, seat: Pt, look: CabLook): void {
  const [sx, sy] = seat
  const road = sy + CAB.road
  const bob = look.bob ?? 0
  const y = (dy: number) => sy + dy + bob
  const x = (dx: number) => sx + dx
  const roofY = road + CAB.roof + bob
  const beltY = y(-0.32)
  const sillY = y(0.5)

  // The shadow under it.
  const ctx = ctxOf(pen.p)
  ctx.save()
  ctx.fillStyle = rgba(pen, '#000000', 0.35)
  ctx.beginPath()
  ctx.ellipse(x(1.4) * pen.k, (road + 0.03) * pen.k, 3.4 * pen.k, 0.12 * pen.k, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // The body: a long low box with a rounded rear deck, a hood and a cab roof.
  const body: Pt[] = [
    [x(CAB.rear), y(0.55)],
    [x(CAB.rear), y(-0.2)],
    [x(CAB.rear + 0.25), y(-0.42)],
    [x(-1.05), y(-0.5)],
    [x(-0.95), roofY + 0.18],
    [x(-0.6), roofY],
    [x(2.6), roofY],
    [x(3.0), roofY + 0.2],
    [x(3.45), y(-0.48)],
    [x(CAB.front - 0.2), y(-0.4)],
    [x(CAB.front), y(-0.15)],
    [x(CAB.front), y(0.55)],
  ]
  shape(pen, body, C.body)
  // The light along the top, and the dark of the lower body.
  shape(pen, [[x(-0.6), roofY], [x(2.6), roofY], [x(2.65), roofY + 0.06], [x(-0.64), roofY + 0.06]], C.bodyLight)
  rect(pen, x(CAB.rear), y(0.3), x(CAB.front), y(0.55), C.bodyDark)
  // The checks along the belt.
  for (let i = 0; i < 14; i++) {
    const cx = x(-0.4 + i * 0.25)
    if (cx > x(3.2)) break
    rect(pen, cx, beltY + (i % 2 ? 0.0 : 0.06), cx + 0.125, beltY + (i % 2 ? 0.06 : 0.12), C.check)
  }
  // The roof light (a plain lamp, nothing written on it).
  rect(pen, x(0.85), roofY - 0.2, x(1.45), roofY, C.bodyLight)
  rect(pen, x(0.85), roofY - 0.2, x(1.45), roofY - 0.16, C.bodyDark)

  // The windows: the driver's and the back's. The back is open on the seat, in the interior's dark.
  const sill = y(R + 0.17)
  const backWin: Pt[] = [[x(-0.82), sill], [x(-0.8), roofY + 0.22], [x(-0.5), roofY + 0.12], [x(1.3), roofY + 0.12], [x(1.3), sill]]
  shape(pen, backWin, C.interior)
  const frontWin: Pt[] = [[x(1.45), beltY], [x(1.45), roofY + 0.12], [x(2.5), roofY + 0.12], [x(2.9), beltY]]
  shape(pen, frontWin, C.glass)
  glow(pen, [x(2.1), roofY + 0.5], 0.5, '#9FB3BD', 0.12)
  // The back seat, seen through: its back and its cushion.
  rect(pen, x(-0.74), roofY + 0.4, x(-0.45), y(R), C.seat)
  rect(pen, x(CAB.cushion[0] - 0.2), y(R), x(CAB.cushion[1] + 0.05), sill, C.seatLight)
  line(pen, [x(CAB.cushion[0] - 0.2), y(R)], [x(CAB.cushion[1] + 0.05), y(R)], '#A44A3A', 0.6)
  // The pillar between the two windows, and the frames.
  rect(pen, x(1.3), roofY + 0.1, x(1.45), sill, C.body)
  path(pen, [[x(-0.82), sill], [x(-0.8), roofY + 0.22], [x(-0.5), roofY + 0.12], [x(1.3), roofY + 0.12]], C.chromeDark, 0.5)
  // The door's lower panel, under the open window: the sill he sits behind.
  rect(pen, x(-0.85), sill, x(1.3), sillY, C.body)
  line(pen, [x(-0.85), sill], [x(1.3), sill], C.chromeDark, 0.6)

  // Wally at the wheel: a dark shape, his cap, his arm to the wheel.
  if (look.wally) {
    const wx = x(CAB.driver)
    ellipse(pen, [wx, roofY + 0.62], 0.2, 0.22, C.wally)
    shape(pen, [[wx - 0.24, roofY + 0.5], [wx + 0.22, roofY + 0.5], [wx + 0.3, roofY + 0.56], [wx - 0.24, roofY + 0.58]], C.cap)
    shape(pen, [[wx - 0.28, roofY + 0.82], [wx + 0.25, roofY + 0.82], [wx + 0.3, beltY], [wx - 0.3, beltY]], C.wally)
    line(pen, [wx + 0.15, roofY + 0.95], [x(2.85), roofY + 0.92], C.wally, 1.6)
    ellipse(pen, [x(2.85), roofY + 0.85], 0.04, 0.16, null, 0.9, '#0C0C0C')
  }

  // Chrome: the bumpers and the grille.
  rect(pen, x(CAB.rear - 0.08), y(0.36), x(CAB.rear + 0.4), y(0.5), C.chrome)
  rect(pen, x(CAB.front - 0.4), y(0.36), x(CAB.front + 0.08), y(0.5), C.chrome)
  for (let i = 0; i < 4; i++) line(pen, [x(CAB.front - 0.02), y(-0.08 + i * 0.1)], [x(CAB.front - 0.02), y(-0.04 + i * 0.1)], C.chromeDark, 0.8)
  // The lamps.
  const lights = Math.max(0, Math.min(1, look.lights ?? 0))
  ellipse(pen, [x(CAB.front - 0.06), y(-0.12)], 0.06, 0.1, lights > 0 ? C.lamp : C.chrome)
  if (lights > 0) {
    glow(pen, [x(CAB.front + 0.1), y(-0.12)], 0.9, C.lamp, 0.55 * lights)
    const beam = ctx.createLinearGradient(x(CAB.front) * pen.k, 0, x(CAB.front + 6) * pen.k, 0)
    beam.addColorStop(0, rgba(pen, C.lamp, 0.22 * lights))
    beam.addColorStop(1, rgba(pen, C.lamp, 0))
    ctx.save()
    ctx.fillStyle = beam
    ctx.beginPath()
    ctx.moveTo(x(CAB.front) * pen.k, y(-0.18) * pen.k)
    ctx.lineTo(x(CAB.front + 6) * pen.k, y(-0.5) * pen.k)
    ctx.lineTo(x(CAB.front + 6) * pen.k, (road + 0.05) * pen.k)
    ctx.lineTo(x(CAB.front) * pen.k, y(-0.04) * pen.k)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
  rect(pen, x(CAB.rear), y(-0.18), x(CAB.rear + 0.08), y(0.02), C.tail)
  if (lights > 0) glow(pen, [x(CAB.rear - 0.05), y(-0.08)], 0.4, C.tail, 0.4 * lights)

  // The wheel arches and the wheels, turning by how far it has rolled.
  const turn = (look.rolled ?? 0) / CAB.wheel
  for (const wx of CAB.wheels) {
    const c: Pt = [x(wx), road - CAB.wheel]
    ellipse(pen, [c[0], c[1] - 0.04], CAB.wheel + 0.1, CAB.wheel + 0.12, C.interior)
    ellipse(pen, c, CAB.wheel, CAB.wheel, C.tyre)
    ellipse(pen, c, CAB.wheel * 0.55, CAB.wheel * 0.55, C.hub)
    for (let i = 0; i < 3; i++) {
      const a = turn + (i * Math.PI * 2) / 3
      line(pen, [c[0] + Math.cos(a) * 0.08, c[1] + Math.sin(a) * 0.08], [c[0] + Math.cos(a) * 0.2, c[1] + Math.sin(a) * 0.2], C.chromeDark, 0.9)
    }
  }
}
