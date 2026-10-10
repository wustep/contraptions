import { mixHex, type Pt } from '../../../../../parts'
import { beam, bloom, pool, rgba } from '../cast'
import { hash } from '../kit'
import { RAIN } from '../worlds'
import { seen, type Pen, type View } from './rain-city'
import {
  FLUNG,
  LOCO_H,
  LOCO_LEN,
  PUDDLES,
  T_LAMP,
  T_PUDDLES,
  CAR_S,
  LANE_BACK,
  TRAIN_FROM,
  TRAIN_V,
  WAGONS,
  WAGON_GAP,
  WAGON_LEN,
  flungPose,
  sm,
  taxiDoor,
  taxiX,
  trainNose,
  type Flung,
} from './rain-geo'

/**
 * The street's traffic, on the rain's clock: Fischer's taxi, the two cars waiting at the head of the bridge, and the
 * freight train that comes off the bridge out of nowhere and through them (Mal's), flinging each up and back over itself
 * onto the far side of the street; and the spray thrown up where the van's wheels go through the puddles.
 */

const TAXI_BODY = mixHex(RAIN.lamp, RAIN.kerb, 0.6)
const CAR_BODIES = [RAIN.buildingDark, mixHex(RAIN.steel, RAIN.building, 0.4)]
const GLASS = mixHex(RAIN.window, RAIN.buildingDark, 0.55)

/** A car side-on, facing right, centred on its middle; `door` swings its rear door open (0..1). */
function car(pen: Pen, x: number, y: number, angle: number, s: number, len: number, body: string, taxi: boolean, lamps: number, door = 0, wreck = 0): void {
  const { p, k, ink, w } = pen
  const X = (v: number) => v * k
  const h = len / 2
  p.push()
  p.translate(X(x), X(y))
  p.rotate(angle)
  p.scale(s)
  if (lamps > 0.02 && wreck < 0.5) beam(p, k, [h - 0.02, 0.05], [h + 3.2, 0.5], 0.1, 1.1, RAIN.lamp, 0.22 * lamps)
  const wy = 0.47 - 0.16
  p.stroke(ink)
  p.strokeWeight(w * 0.8)
  for (const u of [-h + 0.42, h - 0.42]) {
    p.fill(ink)
    p.circle(X(u), X(wy), X(0.32))
  }
  // The body: a low box with a cabin set back on it; crumpled at its nose once it has been hit.
  const nose = wreck * 0.35
  p.fill(body)
  p.beginShape()
  p.vertex(X(-h), X(0.3))
  p.vertex(X(-h), X(-0.05))
  p.vertex(X(-h + 0.12), X(-0.12))
  p.vertex(X(-h + 0.5), X(-0.14))
  p.vertex(X(-h + 0.72), X(-0.5 + wreck * 0.12))
  p.vertex(X(h - 0.75), X(-0.5 + wreck * 0.05))
  p.vertex(X(h - 0.48 - nose), X(-0.13))
  p.vertex(X(h - 0.05 - nose), X(-0.08 + wreck * 0.08))
  p.vertex(X(h - nose), X(0.05))
  p.vertex(X(h - nose), X(0.3))
  p.endShape(p.CLOSE)
  // Its glass, and a pillar; the rear door swung open to us.
  p.fill(GLASS)
  p.strokeWeight(w * 0.6)
  p.beginShape()
  p.vertex(X(-h + 0.58), X(-0.15))
  p.vertex(X(-h + 0.77), X(-0.44 + wreck * 0.1))
  p.vertex(X(h - 0.8), X(-0.44 + wreck * 0.05))
  p.vertex(X(h - 0.58 - nose), X(-0.15))
  p.endShape(p.CLOSE)
  p.line(X(-0.02), X(-0.45), X(-0.02), X(-0.14))
  if (door > 0.02) {
    // The rear door swung open toward us about its front edge: the dark of the car inside, the door foreshortened.
    p.fill(mixHex(GLASS, ink, 0.55))
    p.rect(X(-0.64), X(-0.44), X(0.6), X(0.66))
    const dw = 0.6 * Math.cos(door * 1.3)
    p.fill(mixHex(body, RAIN.kerb, 0.3))
    p.quad(X(-0.04 - dw), X(-0.5), X(-0.04), X(-0.46), X(-0.04), X(0.24), X(-0.04 - dw), X(0.3))
  }
  if (taxi) {
    // Its roof light: a blank board, lit.
    p.fill(lamps > 0.02 ? RAIN.lamp : mixHex(RAIN.lamp, body, 0.5))
    p.rectMode(p.CENTER)
    p.rect(X(-0.05), X(-0.56 + wreck * 0.1), X(0.34), X(0.1), X(0.02))
  }
  p.pop()
  if (lamps > 0.02 && wreck < 0.5) {
    const c = Math.cos(angle)
    const sn = Math.sin(angle)
    bloom(p, k, [x + (h - 0.03) * s * c - 0.05 * sn, y + (h - 0.03) * s * sn + 0.05 * c], 0.28, RAIN.lamp, 0.35 * lamps)
    bloom(p, k, [x - (h - 0.03) * s * c, y - (h - 0.03) * s * sn], 0.2, RAIN.trainRust, 0.3 * lamps)
  }
}

/** The two cars at the head of the bridge and the taxi, before the train and after. */
export function drawTraffic(pen: Pen, f: View, te: number): void {
  // Flung ones first: they come down behind the train. Their lamps' light stops at the street's foot.
  const { ctx, k } = pen
  ctx.save()
  ctx.beginPath()
  ctx.rect((f.x0 - 2) * k, (f.y0 - 3) * k, (f.x1 - f.x0 + 4) * k, (STREET_FOOT - f.y0 + 3) * k)
  ctx.clip()
  for (let i = 0; i < FLUNG.length; i++) {
    const c = FLUNG[i]
    const ps = flungPose(c, te)
    const x = c.taxi && te < c.hit ? taxiX(te) : ps.x
    if (!seen(f, x - 2, x + 2, ps.y - 1.5, ps.y + 1)) continue
    const hit = te >= c.hit
    const lamps = hit ? 0 : c.taxi ? 1 : 0.8
    const body = c.taxi ? TAXI_BODY : CAR_BODIES[i % 2]
    const door = c.taxi && !hit ? taxiDoor(te) : 0
    const s = CAR_S - 0.08 * ps.far
    car(pen, x, ps.y, ps.angle, s, c.len, hit ? mixHex(body, RAIN.street, 0.2 * ps.far) : body, c.taxi, lamps, door, hit ? sm((te - c.hit) / 0.12) : 0)
  }
  ctx.restore()
}
/** The street's underside: light from the street's traffic stops here. */
const STREET_FOOT = 0.6

/** Sparks off the locomotive's nose as it meets each car. */
function sparks(pen: Pen, te: number, c: Flung): void {
  const { p, k, ctx } = pen
  const a = te - c.hit
  if (a < 0 || a > 0.9) return
  const x0 = c.x + c.len / 2
  bloom(p, k, [x0, -0.7], c.taxi ? 2.4 : 1.4, RAIN.lamp, (c.taxi ? 0.8 : 0.55) * Math.exp(-a / 0.14))
  // Sparks: short bright streaks along their flight.
  const m = c.taxi ? 40 : 18
  const path = new Path2D()
  for (let i = 0; i < m; i++) {
    const vx = -2 - hash(i, 1, 99) * (c.taxi ? 10 : 7)
    const vy = -1.5 - hash(i, 2, 99) * (c.taxi ? 7 : 5)
    const life = 0.35 + 0.5 * hash(i, 3, 99)
    if (a > life) continue
    const x = x0 + vx * a
    const y = -0.4 + vy * a + 6 * a * a
    path.moveTo(x * k, y * k)
    path.lineTo((x - vx * 0.03) * k, (y - (vy + 12 * a) * 0.03) * k)
  }
  ctx.save()
  ctx.strokeStyle = rgba(RAIN.windowLit, 0.9 * (1 - a / 0.9))
  ctx.lineWidth = Math.max(0.8, 0.025 * k)
  ctx.lineCap = 'round'
  ctx.stroke(path)
  ctx.restore()
}

/** The locomotive's headlamp: its beam, cutting the rain ahead of it down the street, rocking as it comes. */
export interface Beam {
  from: Pt
  to: Pt
  w0: number
  w1: number
  a: number
}
export function trainBeam(te: number): Beam | null {
  if (te < TRAIN_FROM) return null
  const lamp = sm((te - T_LAMP + 0.1) / 0.1) * sm((te - TRAIN_FROM) / 0.6)
  if (lamp < 0.01) return null
  const nose = trainNose(te)
  const sway = 0.12 * Math.sin(te * 6.3) + 0.06 * Math.sin(te * 11.7)
  return { from: [nose + 0.12, LANE_BACK - 1.55], to: [nose - 11, LANE_BACK + 0.2 + sway], w0: 0.35, w1: 4.6, a: 0.78 * lamp }
}
/** The beam's light where it falls on the wet street ahead of the train, and run down into it. */
function beamOnStreet(pen: Pen, b: Beam, nose: number): void {
  const { p, k, ctx } = pen
  pool(p, k, [nose - 5.5, 0.02], 4.6, 0.16, RAIN.lamp, 0.4 * b.a)
  const g = ctx.createLinearGradient(0, 0, 0, 0.55 * k)
  g.addColorStop(0, rgba(RAIN.lamp, 0.42 * b.a))
  g.addColorStop(1, rgba(RAIN.lamp, 0))
  ctx.fillStyle = g
  const x0 = nose - 9.5
  const x1 = nose - 1.5
  const lg = ctx.createLinearGradient(x0 * k, 0, x1 * k, 0)
  lg.addColorStop(0, rgba(RAIN.lamp, 0))
  lg.addColorStop(0.6, rgba(RAIN.lamp, 0.3 * b.a))
  lg.addColorStop(0.85, rgba(RAIN.lamp, 0.12 * b.a))
  lg.addColorStop(1, rgba(RAIN.lamp, 0))
  ctx.fillStyle = lg
  ctx.fillRect(x0 * k, 0, (x1 - x0) * k, 0.5 * k)
}

/** The freight train: a black locomotive and its wagons, off the bridge and down the street, through them. */
export function drawTrain(pen: Pen, f: View, te: number): void {
  if (te < TRAIN_FROM) return
  const { p, k, ink, w } = pen
  const nose = trainNose(te)
  const X = (v: number) => v * k
  const base = LANE_BACK
  const tail = nose + LOCO_LEN + WAGONS * (WAGON_LEN + WAGON_GAP)
  if (tail < f.x0 - 3 || nose > f.x1 + 14) return
  // It comes out of the rain: its lamp first, stabbing in on the half after beat 78, a moment before it.
  const appear = sm((te - TRAIN_FROM) / 0.6)
  const lamp = sm((te - T_LAMP + 0.1) / 0.1)
  const b = trainBeam(te)
  if (b) {
    // Its light stops at the street: it was painted on down through it into the ground under it.
    pen.ctx.save()
    pen.ctx.beginPath()
    pen.ctx.rect((f.x0 - 2) * k, (f.y0 - 2) * k, (f.x1 - f.x0 + 4) * k, (STREET_FOOT - f.y0 + 2) * k)
    pen.ctx.clip()
    beam(p, k, b.from, b.to, b.w0, b.w1, RAIN.lamp, b.a)
    beamOnStreet(pen, b, nose)
    pen.ctx.restore()
  }
  const wheel = (x: number, r: number) => {
    p.fill(ink)
    p.circle(X(x), X(base - r), X(2 * r))
    p.fill(RAIN.steel)
    p.circle(X(x), X(base - r), X(r * 0.8))
    if (k > 12) {
      const a = (-(nose - x) * 0 - (te * TRAIN_V) / r) % (Math.PI * 2)
      p.line(X(x), X(base - r), X(x + Math.cos(a) * r * 0.8), X(base - r + Math.sin(a) * r * 0.8))
    }
  }
  p.push()
  p.stroke(ink)
  p.strokeWeight(w)
  // The wagons, from the back.
  for (let i = WAGONS - 1; i >= 0; i--) {
    const x0 = nose + LOCO_LEN + WAGON_GAP + i * (WAGON_LEN + WAGON_GAP)
    const x1 = x0 + WAGON_LEN
    if (x1 < f.x0 - 1 || x0 > f.x1 + 1) continue
    const fill = i % 2 ? mixHex(RAIN.train, RAIN.trainRust, 0.45) : mixHex(RAIN.train, RAIN.steel, 0.3)
    p.fill(fill)
    p.rectMode(p.CORNER)
    p.rect(X(x0), X(base - 2.25), X(WAGON_LEN), X(1.7))
    p.fill(RAIN.train)
    p.rect(X(x0 + 0.2), X(base - 0.62), X(WAGON_LEN - 0.4), X(0.2))
    if (k > 6) {
      p.strokeWeight(w * 0.5)
      for (let x = x0 + 0.8; x < x1 - 0.4; x += 0.8) p.line(X(x), X(base - 2.2), X(x), X(base - 0.6))
      p.strokeWeight(w)
      p.fill(mixHex(fill, ink, 0.3))
      p.rect(X(x0 + WAGON_LEN / 2 - 0.75), X(base - 2.0), X(1.5), X(1.3))
    }
    for (const u of [0.9, 1.5, WAGON_LEN - 1.5, WAGON_LEN - 0.9]) wheel(x0 + u, 0.24)
    // The coupling to the one in front.
    p.line(X(x0 - WAGON_GAP), X(base - 0.8), X(x0), X(base - 0.8))
  }
  // The locomotive, nose first: a short hood, the cab over it, the long hood behind, on its frame; the plough.
  const n0 = nose
  const cab0 = n0 + 1.25
  const cab1 = n0 + 3.2
  p.fill(RAIN.train)
  p.beginShape()
  p.vertex(X(n0 + 0.05), X(base - 0.62))
  p.vertex(X(n0 + 0.05), X(base - 1.45))
  p.vertex(X(n0 + 0.25), X(base - 1.62))
  p.vertex(X(cab0 - 0.1), X(base - 1.62))
  p.vertex(X(cab0 + 0.1), X(base - 2.2))
  p.vertex(X(cab0 + 0.25), X(base - LOCO_H))
  p.vertex(X(cab1), X(base - LOCO_H))
  p.vertex(X(cab1 + 0.05), X(base - 2.08))
  p.vertex(X(n0 + LOCO_LEN - 0.3), X(base - 2.08))
  p.vertex(X(n0 + LOCO_LEN - 0.05), X(base - 1.85))
  p.vertex(X(n0 + LOCO_LEN - 0.05), X(base - 0.62))
  p.endShape(p.CLOSE)
  // Its frame, the walkway's rail, the plough.
  p.fill(mixHex(RAIN.train, RAIN.steel, 0.3))
  p.rectMode(p.CORNER)
  p.rect(X(n0 + 0.1), X(base - 0.8), X(LOCO_LEN - 0.2), X(0.24))
  p.fill(RAIN.train)
  p.beginShape()
  p.vertex(X(n0 + 0.1), X(base - 0.6))
  p.vertex(X(n0 - 0.3), X(base - 0.04))
  p.vertex(X(n0 + 1.0), X(base - 0.04))
  p.vertex(X(n0 + 1.05), X(base - 0.6))
  p.endShape(p.CLOSE)
  if (k > 5) {
    p.noFill()
    p.strokeWeight(w * 0.6)
    p.line(X(n0 + 0.1), X(base - 1.1), X(n0 + LOCO_LEN - 0.1), X(base - 1.1))
    for (let x = n0 + 0.6; x < n0 + LOCO_LEN; x += 1.1) p.line(X(x), X(base - 0.8), X(x), X(base - 1.1))
    // Rust down its flanks; the cab's windows dimly lit; the long hood's doors and vents.
    p.noStroke()
    for (let i = 0; i < 9; i++) {
      const x = n0 + 0.4 + hash(i, 1, 101) * (LOCO_LEN - 0.9)
      const topY = x < cab0 ? -1.55 : x < cab1 ? -2.3 : -2.0
      p.fill(rgba(RAIN.trainRust, 0.3 + 0.35 * hash(i, 2, 101)))
      p.rect(X(x), X(base + topY + 0.1), X(0.1 + hash(i, 3, 101) * 0.22), X(0.5 + hash(i, 4, 101) * 0.8))
    }
    p.stroke(ink)
    p.strokeWeight(w * 0.6)
    p.fill(mixHex(RAIN.windowLit, RAIN.train, 0.66))
    p.quad(X(cab0 + 0.18), X(base - 2.18), X(cab0 + 0.55), X(base - 2.18), X(cab0 + 0.55), X(base - 1.78), X(cab0 + 0.08), X(base - 1.78))
    p.rect(X(cab0 + 0.75), X(base - 2.2), X(0.6), X(0.42))
    p.rect(X(cab0 + 1.45), X(base - 2.2), X(0.35), X(0.42))
    p.noFill()
    p.strokeWeight(w * 0.45)
    for (let x = cab1 + 0.4; x < n0 + LOCO_LEN - 0.5; x += 0.95) p.rect(X(x), X(base - 1.92), X(0.75), X(0.72))
    for (let x = cab1 + 0.5; x < n0 + LOCO_LEN - 0.6; x += 0.95) p.line(X(x + 0.1), X(base - 1.8), X(x + 0.5), X(base - 1.8))
    p.strokeWeight(w)
  }
  // Its exhaust, heavy, torn back by its speed (the rain's clock).
  if (k > 3) {
    for (let i = 0; i < 5; i++) {
      const age = ((te * 2.2 + i / 5) % 1)
      const ex = n0 + LOCO_LEN * 0.62 + age * 3.2
      const ey = base - 2.3 - age * 0.9
      bloom(p, k, [ex, ey], 0.45 + age * 0.9, RAIN.far, 0.3 * (1 - age) * appear)
    }
  }
  p.stroke(ink)
  for (const u of [1.3, 2.0, 2.7, LOCO_LEN - 2.7, LOCO_LEN - 2.0, LOCO_LEN - 1.3]) wheel(nose + u, 0.3)
  p.pop()
  if (lamp > 0.01) {
    bloom(p, k, [nose + 0.15, base - 1.55], 0.8, RAIN.lamp, 0.85 * lamp * appear)
    // The flare as it comes on.
    const flare = te - T_LAMP
    if (flare > -0.05 && flare < 0.8) bloom(p, k, [nose + 0.15, base - 1.55], 2.6, RAIN.lamp, 0.5 * Math.exp(-Math.max(0, flare) / 0.18))
  }
  for (const c of FLUNG) sparks(pen, te, c)
}

/** The spray the van's front wheels throw where they go through the puddles, on the beats. */
export function drawSpray(pen: Pen, te: number): void {
  const { p, k, ctx } = pen
  for (let j = 0; j < T_PUDDLES.length; j++) {
    const a = te - T_PUDDLES[j]
    if (a < 0 || a > 1.1) continue
    const x0 = PUDDLES[j]
    bloom(p, k, [x0 - 0.2, -0.25], 0.8, RAIN.rain, 0.25 * Math.exp(-a / 0.25))
    ctx.fillStyle = rgba(RAIN.rain, 0.75 * (1 - a / 1.1))
    const drops = new Path2D()
    for (let i = 0; i < 26; i++) {
      const side = hash(i, 1, 103) < 0.5 ? -1 : 1
      const vx = side * (0.6 + hash(i, 2, 103) * 2.4) - 0.8
      const vy = -1.6 - hash(i, 3, 103) * 2.6
      const x = x0 + vx * a
      const y = -0.02 + vy * a + 6 * a * a
      if (y > 0.02) continue
      const r = Math.max(0.6, (0.018 + hash(i, 4, 103) * 0.02) * k)
      drops.moveTo(x * k + r, y * k)
      drops.arc(x * k, y * k, r, 0, Math.PI * 2)
    }
    ctx.fill(drops)
  }
}
