import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { beam, bloom, rgba } from '../cast'
import { hash } from '../kit'
import { SPLASH } from '../stack'
import { PLANE, RAIN } from '../worlds'
import { DOOR_U, FLOOR_V, SEAT_U, SEAT_V, T_SINK, UNDER, WHEEL_R, WHEEL_U, caseOpen, doorOpen, eff, lampOn, sm, vanPoint, wheelTurn, type Pose } from './rain-geo'

/**
 * Yusuf's van: a pale panel van seen side-on, facing right, 2.6 long and 1.15 tall. The three of them ride in its bay on
 * a bench, seen through its side windows (and through the sliding door while it is open); Yusuf is a silhouette at the
 * wheel. `drawVanBack` is everything behind the balls (the wheels, the bay and the cab inside, the lamps' beams);
 * `drawVanFront` is its body and glass, in front of whoever rides in it. After it hits the river the glass has gone and
 * the body is drawn behind them, so they are seen getting out of it.
 *
 * Van cells: u along from its centre (the nose at +1.3), v down from its centre (the roof at -0.575, the floor at 0.42).
 */

const L = 1.3
const TOP = -0.575
const BOT = 0.45
const ROOF_END = 0.62
const SCREEN_FOOT: Pt = [1.02, -0.12]
const NOSE_TOP: Pt = [L, -0.04]
const ARCH_R = 0.245
const SILL = 0.3
const WIN_TOP = -0.46
/** Window openings in the body: the rear quarter, the sliding door's, the bay's front, the cab door's. */
const WINDOWS: [number, number, number, number][] = [
  [-1.21, WIN_TOP, -0.94, SILL],
  [DOOR_U[0] + 0.06, WIN_TOP, DOOR_U[1] - 0.06, SILL - 0.02],
  [0.36, WIN_TOP, 0.67, SILL],
  [0.76, WIN_TOP + 0.02, 0.95, 0.02],
]

const BODY = RAIN.van
const SHADE = RAIN.vanShade
const INSIDE = mixHex(RAIN.street, RAIN.buildingDark, 0.35)
const BENCH = mixHex(RAIN.vanShade, RAIN.steel, 0.45)
const GLASS = mixHex(RAIN.window, RAIN.buildingDark, 0.55)

function toPose(p: p5, k: number, pose: Pose): void {
  p.translate(pose.x * k, pose.y * k)
  p.rotate(pose.angle)
}

/** The body's outline, with its wheel arches, as a path in pixels. */
function bodyPath(k: number): Path2D {
  const P = new Path2D()
  const X = (u: number) => u * k
  P.moveTo(X(-L), X(TOP + 0.05))
  P.quadraticCurveTo(X(-L), X(TOP), X(-L + 0.05), X(TOP))
  P.lineTo(X(ROOF_END), X(TOP))
  P.quadraticCurveTo(X(ROOF_END + 0.1), X(TOP), X(ROOF_END + 0.14), X(TOP + 0.08))
  P.lineTo(X(SCREEN_FOOT[0]), X(SCREEN_FOOT[1]))
  P.quadraticCurveTo(X(L - 0.02), X(SCREEN_FOOT[1] + 0.02), X(NOSE_TOP[0]), X(NOSE_TOP[1] + 0.06))
  P.lineTo(X(L), X(BOT - 0.05))
  P.quadraticCurveTo(X(L), X(BOT), X(L - 0.05), X(BOT))
  // The front wheel's arch, and the rear's.
  P.lineTo(X(WHEEL_U + ARCH_R), X(BOT))
  P.arc(X(WHEEL_U), X(BOT + 0.03), X(ARCH_R), -0.12, Math.PI + 0.12, true)
  P.lineTo(X(-WHEEL_U + ARCH_R), X(BOT))
  P.arc(X(-WHEEL_U), X(BOT + 0.03), X(ARCH_R), -0.12, Math.PI + 0.12, true)
  P.lineTo(X(-L + 0.05), X(BOT))
  P.quadraticCurveTo(X(-L), X(BOT), X(-L), X(BOT - 0.05))
  P.closePath()
  return P
}
function windowPath(k: number, open: number): Path2D {
  const P = new Path2D()
  const X = (u: number) => u * k
  const edge = doorEdge(open)
  for (let i = 0; i < WINDOWS.length; i++) {
    const [u0, v0, u1, v1] = WINDOWS[i]
    if (i === 1) {
      // The sliding door: what is left of it in the doorway has its window; the rest is open, floor to roof.
      const w1 = Math.min(u1, edge - 0.07)
      if (w1 - u0 > 0.03) P.rect(X(u0), X(v0), X(w1 - u0), X(v1 - v0))
      if (DOOR_U[1] - edge > 0.01) P.rect(X(edge), X(WIN_TOP - 0.02), X(DOOR_U[1] - edge), X(FLOOR_V + 0.03 - WIN_TOP))
      continue
    }
    P.rect(X(u0), X(v0), X(u1 - u0), X(v1 - v0))
  }
  // The windscreen, raked back.
  P.moveTo(X(ROOF_END + 0.2), X(TOP + 0.09))
  P.lineTo(X(SCREEN_FOOT[0] - 0.04), X(SCREEN_FOOT[1] - 0.02))
  P.lineTo(X(0.97), X(SCREEN_FOOT[1] - 0.02))
  P.lineTo(X(0.97), X(TOP + 0.09))
  P.closePath()
  return P
}
/** The sliding door's leading edge: it slides back into the body's rear quarter to open, forward to shut. */
const doorEdge = (open: number): number => DOOR_U[1] - (DOOR_U[1] - DOOR_U[0]) * open

/** The wheels, the bay and the cab inside (Yusuf at the wheel, the bench, the case), and the lamps' beams. */
export function drawVanBack(p: p5, k: number, ink: string, w: number, pose: Pose, t: number, wet = 0): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const X = (u: number) => u * k
  const lamp = lampOn(t)
  // The headlamps' beams, ahead and down to the road, through the rain.
  if (lamp > 0.05 && k > 3) {
    const [lx, ly] = vanPoint(pose, L - 0.02, 0.06)
    const ahead = vanPoint(pose, L + 4.2, 0.9)
    beam(p, k, [lx, ly], ahead, 0.14, 1.5, RAIN.lamp, 0.34 * lamp)
  }
  p.push()
  toPose(p, k, pose)
  drawWheels(p, k, ink, w, t)
  // Inside: the far wall in shadow, the bench along the bay, the bulkhead, the cab.
  p.noStroke()
  p.fill(INSIDE)
  ctx.fill(bodyPath(k))
  if (k > 6) {
    p.fill(mixHex(INSIDE, RAIN.window, 0.12))
    p.rectMode(p.CORNER)
    // The far side's windows, faint.
    for (const [u0, v0, u1, v1] of WINDOWS) p.rect(X(u0 + 0.02), X(v0 + 0.03), X(u1 - u0 - 0.04), X(v1 - v0 - 0.06))
    // The bench: a long seat with a low back, its cushion under each of them.
    p.fill(BENCH)
    p.rect(X(-1.22), X(SEAT_V + 0.13), X(1.86), X(FLOOR_V - SEAT_V - 0.13))
    p.fill(mixHex(BENCH, INSIDE, 0.4))
    p.rect(X(-1.22), X(-0.2), X(0.08), X(SEAT_V + 0.33))
    // The bulkhead behind the cab seats.
    p.fill(mixHex(INSIDE, ink, 0.3))
    p.rect(X(0.7), X(TOP + 0.05), X(0.05), X(FLOOR_V - TOP - 0.05))
    // Yusuf at the wheel: one quiet silhouette, head and shoulders.
    const yu = 0.84
    p.fill(mixHex(ink, INSIDE, 0.25))
    p.beginShape()
    p.vertex(X(yu - 0.15), X(0.2))
    p.vertex(X(yu - 0.13), X(-0.1))
    p.bezierVertex(X(yu - 0.12), X(-0.19), X(yu + 0.1), X(-0.2), X(yu + 0.12), X(-0.1))
    p.vertex(X(yu + 0.15), X(0.2))
    p.endShape(p.CLOSE)
    p.ellipse(X(yu - 0.005), X(-0.28), X(0.15), X(0.17))
    // The wheel, edge on, and the dash.
    p.stroke(mixHex(ink, INSIDE, 0.1))
    p.strokeWeight(w * 0.9)
    p.line(X(0.97), X(-0.02), X(1.08), X(0.1))
    p.line(X(0.94), X(-0.1), X(1.0), X(0.06))
    // The case, on the floor at their feet between Ariadne's place and his, opened on beat 90: its lid swings up into
    // sight over the sill, its lines up to the three.
    const open = caseOpen(t)
    const cu = (SEAT_U.ariadne + SEAT_U.cobb) / 2
    const cv = FLOOR_V
    p.noStroke()
    p.fill(PLANE.caseDark)
    p.rect(X(cu - 0.12), X(cv - 0.11), X(0.24), X(0.11))
    p.fill(PLANE.case)
    p.rect(X(cu - 0.12), X(cv - 0.12), X(0.24), X(0.03))
    if (open > 0.01) {
      p.push()
      p.translate(X(cu - 0.12), X(cv - 0.11))
      p.rotate(-open * 1.45)
      p.fill(PLANE.case)
      p.stroke(PLANE.caseDark)
      p.strokeWeight(Math.max(0.5, 0.008 * k))
      p.rect(0, -X(0.024), X(0.26), X(0.03))
      p.noStroke()
      p.pop()
      // The lines go with them when they go under: they hang to nothing after.
      const lines = open * (1 - sm((t - UNDER) / 0.8))
      p.noFill()
      p.stroke(rgba(PLANE.tube, 0.6 * lines))
      p.strokeWeight(Math.max(0.6, 0.011 * k))
      for (const su of [SEAT_U.ariadne, SEAT_U.cobb, SEAT_U.fischer]) {
        const dir = su < cu ? -1 : 1
        p.bezier(X(cu), X(cv - 0.1), X(cu + dir * 0.05), X(cv - 0.35), X(su - dir * 0.18), X(SEAT_V + 0.02), X(su - dir * 0.1), X(SEAT_V))
      }
    }
  }
  // After the river, the body is drawn here, behind them, glassless: they are seen getting out of it.
  if (t >= SPLASH) drawShell(p, k, ink, w, t, wet)
  p.pop()
}

/** The body and its glass, in front of whoever rides in it (before the river). */
export function drawVanFront(p: p5, k: number, ink: string, w: number, pose: Pose, t: number): void {
  if (t >= SPLASH) return
  p.push()
  toPose(p, k, pose)
  // On the street and the bridge, its underside and its wheels over whatever is behind it; not once the floor has gone
  // soft, so the three are seen to sink out through it, and are seen to come back up into it from the river.
  if (t < T_SINK) {
    drawUnder(p, k)
    drawWheels(p, k, ink, w, t)
  }
  drawShell(p, k, ink, w, t, 0)
  p.pop()
}

/** The wheels, turning. */
function drawWheels(p: p5, k: number, ink: string, w: number, t: number): void {
  const X = (u: number) => u * k
  const turn = wheelTurn(t)
  for (const u of [-WHEEL_U, WHEEL_U]) {
    const cy = X(0.575 - WHEEL_R)
    p.stroke(ink)
    p.strokeWeight(w)
    p.fill(ink)
    p.circle(X(u), cy, X(WHEEL_R * 2))
    p.fill(RAIN.kerb)
    p.circle(X(u), cy, X(WHEEL_R * 1.05))
    if (k > 14) {
      p.strokeWeight(w * 0.6)
      for (let j = 0; j < 3; j++) {
        const a = turn + (j * Math.PI * 2) / 3
        p.line(X(u), cy, X(u) + Math.cos(a) * X(WHEEL_R * 0.45), cy + Math.sin(a) * X(WHEEL_R * 0.45))
      }
    }
  }
}

/**
 * The van's underside: the dark of its chassis and the shadow it keeps on the wet road, from its sill down to just off
 * the ground, the wheels drawn again over it. Whatever stands at the kerb behind it (Mal, as it goes by) is hidden
 * there, as the body hides it above.
 */
function drawUnder(p: p5, k: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const X = (u: number) => u * k
  const ground = 0.575
  const P = new Path2D()
  P.rect(X(-L + 0.08), X(BOT - 0.02), X(2 * L - 0.16), X(ground + 0.07 - (BOT - 0.02)))
  const g = ctx.createLinearGradient(0, X(BOT), 0, X(ground))
  g.addColorStop(0, mixHex(RAIN.street, RAIN.buildingDark, 0.6))
  g.addColorStop(1, mixHex(RAIN.street, RAIN.streetWet, 0.3))
  ctx.save()
  ctx.fillStyle = g
  ctx.fill(P, 'evenodd')
  ctx.restore()
}

function drawShell(p: p5, k: number, ink: string, w: number, t: number, wet: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const X = (u: number) => u * k
  const open = doorOpen(t)
  const broken = t >= SPLASH
  const body = bodyPath(k)
  const holes = windowPath(k, open)
  // The body, with its windows cut out of it.
  const shape = new Path2D()
  shape.addPath(body)
  shape.addPath(holes)
  const fill = broken ? mixHex(BODY, RAIN.river, 0.35 * wet) : BODY
  ctx.save()
  ctx.fillStyle = fill
  ctx.fill(shape, 'evenodd')
  // The lower band, a shade darker.
  ctx.clip(shape, 'evenodd')
  ctx.fillStyle = broken ? mixHex(SHADE, RAIN.river, 0.35 * wet) : SHADE
  ctx.fillRect(X(-L - 0.1), X(0.2), X(2 * L + 0.2), X(0.4))
  ctx.restore()
  // Its glass: a faint tint and a sheen, rain running down it; none once it has gone into the river.
  if (!broken && k > 4) {
    ctx.save()
    ctx.clip(holes)
    const g = ctx.createLinearGradient(0, X(WIN_TOP), 0, X(SILL))
    g.addColorStop(0, rgba(GLASS, 0.22))
    g.addColorStop(1, rgba(GLASS, 0.06))
    ctx.fillStyle = g
    ctx.fillRect(X(-L), X(TOP), X(2 * L), X(0.9))
    const sheen = ctx.createLinearGradient(X(-L), X(TOP), X(L), X(0.2))
    sheen.addColorStop(0.2, rgba(RAIN.window, 0))
    sheen.addColorStop(0.45, rgba(RAIN.window, 0.1))
    sheen.addColorStop(0.55, rgba(RAIN.window, 0))
    ctx.fillStyle = sheen
    ctx.fillRect(X(-L), X(TOP), X(2 * L), X(0.9))
    if (k > 20) {
      // Runs of rain on the glass, each creeping down on the rain's clock.
      const te = eff(t)
      ctx.strokeStyle = rgba(RAIN.rain, 0.35)
      ctx.lineWidth = Math.max(0.6, 0.01 * k)
      ctx.beginPath()
      for (let i = 0; i < 26; i++) {
        const u = -L + 0.05 + hash(i, 3, 5) * 2.2
        const run = ((te * (0.05 + 0.1 * hash(i, 4, 5)) + hash(i, 5, 5)) % 1)
        const v = WIN_TOP + run * (SILL - WIN_TOP)
        ctx.moveTo(X(u), X(v - 0.06))
        ctx.lineTo(X(u - 0.004), X(v))
      }
      ctx.stroke()
    }
    ctx.restore()
  }
  // The ink: the body's outline, the windows', the door's seam, the pillars.
  ctx.save()
  ctx.lineWidth = w
  ctx.strokeStyle = ink
  ctx.lineJoin = 'round'
  ctx.stroke(body)
  ctx.lineWidth = w * 0.7
  ctx.stroke(holes)
  // The door's seams: its back edge, and its leading edge wherever it has slid to.
  ctx.beginPath()
  ctx.moveTo(X(DOOR_U[0]), X(WIN_TOP - 0.03))
  ctx.lineTo(X(DOOR_U[0]), X(BOT - 0.02))
  const edge = doorEdge(open)
  if (edge > DOOR_U[0] + 0.01) {
    ctx.moveTo(X(edge), X(WIN_TOP - 0.03))
    ctx.lineTo(X(edge), X(BOT - 0.02))
  }
  ctx.stroke()
  ctx.restore()
  // Lamps: the headlamp's lens and the tail lamp, lit or not; a mirror; the wiper.
  const lamp = lampOn(t)
  p.push()
  p.stroke(ink)
  p.strokeWeight(w * 0.7)
  p.fill(lamp > 0.3 ? RAIN.lamp : mixHex(RAIN.lamp, SHADE, 0.6))
  p.rectMode(p.CENTER)
  p.rect(X(L - 0.03), X(0.08), X(0.07), X(0.13), X(0.02))
  p.fill(mixHex(RAIN.trainRust, RAIN.lamp, lamp > 0.3 ? 0.35 : 0))
  p.rect(X(-L + 0.02), X(0.02), X(0.05), X(0.16), X(0.02))
  if (k > 10) {
    p.noFill()
    p.line(X(0.72), X(-0.08), X(0.66), X(-0.18))
    // The wiper, sweeping on the rain's clock: one sweep a beat.
    const te = eff(t)
    const sweep = 0.5 - 0.5 * Math.cos(Math.PI * ((te - 0.4145) / 0.95226))
    const a = -1.05 - sweep * 0.7
    const foot: Pt = [SCREEN_FOOT[0] - 0.1, SCREEN_FOOT[1] - 0.03]
    p.strokeWeight(w * 0.8)
    p.line(X(foot[0]), X(foot[1]), X(foot[0] + Math.cos(a) * 0.3), X(foot[1] + Math.sin(a) * 0.3))
  }
  p.pop()
  if (lamp > 0.05) {
    bloom(p, k, [L, 0.08], 0.32, RAIN.lamp, 0.4 * lamp)
    bloom(p, k, [-L, 0.02], 0.18, RAIN.trainRust, 0.35 * lamp)
  }
}

/** The body's outline's box in world cells, for claiming cells. */
export const VAN_REACH = 1.5
