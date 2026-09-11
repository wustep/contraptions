import type p5 from 'p5'
import { mod } from '../../core/ease'
import type { Theme } from '../../core/themes'
import type { Circuit, Point, RoutePart, Stop } from './connected'

const TAU = Math.PI * 2
const smooth = (u: number) => { const t = Math.max(0, Math.min(1, u)); return t * t * (3 - 2 * t) }
const bell = (u: number, a: number, b: number) => Math.sin(Math.PI * Math.max(0, Math.min(1, (u - a) / (b - a))))

function path(p: p5, points: Point[]): void {
  p.beginShape()
  for (const pt of points) p.vertex(pt.x, pt.y)
  p.endShape()
}
function wheel(p: p5, x: number, y: number, r: number, angle: number, theme: Theme): void {
  p.push()
  p.translate(x, y)
  p.rotate(angle)
  p.fill(theme.bg)
  p.circle(0, 0, r * 2)
  for (let i = 0; i < 4; i++) {
    const a = i * TAU / 4
    p.line(Math.cos(a) * r * 0.35, Math.sin(a) * r * 0.35, Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78)
  }
  p.fill(theme.ink)
  p.circle(0, 0, r * 0.3)
  p.pop()
}
function arrow(p: p5, a: Point, b: Point, size: number): void {
  const angle = Math.atan2(b.y - a.y, b.x - a.x)
  p.push()
  p.translate(a.x, a.y)
  p.rotate(angle)
  p.line(-size, -size * 0.55, 0, 0)
  p.line(-size, size * 0.55, 0, 0)
  p.pop()
}

/** Rail and passenger use the same samples; only the support offset differs. */
export function drawRoute(p: p5, c: Circuit, lift: RoutePart, frame: number, theme: Theme, weight: number): void {
  const { size, radius: r } = c
  const f = mod(frame, c.loop)
  p.push()
  p.stroke(theme.ink)
  p.strokeWeight(weight)
  p.noFill()
  for (const part of c.parts) {
    if (part.kind === 'lift') continue
    const name = part.station?.name
    if (name === 'seesaw' || name === 'trampoline') continue
    // Stations with dwell have a straight deck. Flight paths are dotted
    // trajectories: visible intent, without pretending there is a rail in air.
    const flight = part.kind === 'flight'
    const samples = Array.from({ length: 49 }, (_, i) => {
      const pt = part.at(i / 48)
      return { x: pt.x, y: pt.y + (flight ? 0 : r + weight * 0.5) }
    })
    if (flight) {
      p.noStroke()
      p.fill(theme.ink)
      for (let i = 1; i < 48; i += 4) p.circle(samples[i].x, samples[i].y, weight * 0.65)
      p.noFill()
      p.stroke(theme.ink)
    } else {
      p.strokeWeight(weight * 2.8)
      path(p, samples)
      p.stroke(theme.bg)
      p.strokeWeight(weight * 1.1)
      path(p, samples)
      p.stroke(theme.ink)
      p.strokeWeight(weight)
    }
    if (part.kind !== 'station' && Math.hypot(part.to.x - part.from.x, part.to.y - part.from.y) > size * 0.07) {
      const a = part.at(0.5)
      const b = part.at(0.52)
      arrow(p, { x: a.x, y: a.y + (flight ? r * 2 : r * 3) }, { x: b.x, y: b.y + (flight ? r * 2 : r * 3) }, r * 0.5)
    }
    if (c.mode === 'workshop' && part.kind === 'rail' && Math.abs(part.to.y - part.from.y) < r) {
      const count = Math.max(1, Math.floor(Math.abs(part.to.x - part.from.x) / (r * 3)))
      for (let i = 0; i < count; i++) {
        const at = part.at((i + 0.5) / count)
        wheel(p, at.x, at.y + r * 2, r * 0.55, -f / c.loop * TAU * 8, theme)
      }
    }
  }

  // Exposed cable, two guides and an open cradle. Its paint never depends on
  // whether the traveler is aboard. The empty return is visible too.
  const x = lift.from.x
  const y0 = lift.to.y
  const y1 = lift.from.y
  p.strokeWeight(weight * 0.65)
  p.line(x - r * 2.2, y0, x - r * 2.2, y1)
  p.line(x + r * 2.2, y0, x + r * 2.2, y1)
  p.line(x - r * 2.2, y0 - r * 1.5, x + r * 2.2, y0 - r * 1.5)
  p.line(x - r * 2.7, y1 + r * 1.8, x + r * 2.7, y1 + r * 1.8)
  const onLift = f >= lift.start && f < lift.start + lift.duration
  const empty = mod(f - lift.start - lift.duration, c.loop) / (c.loop - lift.duration)
  const car = onLift ? lift.at((f - lift.start) / lift.duration) : {
    x, y: y0 + (y1 - y0) * smooth(empty),
  }
  p.line(x, y0 - r * 1.5, x, car.y - r * 2)
  p.strokeWeight(weight)
  wheel(p, x, y0 - r * 1.5, r * 1.35, car.y / size * TAU * 4, theme)
  p.noFill()
  p.rect(car.x, car.y, r * 3.5, r * 4, r * 0.45)
  p.fill(theme.bg)
  p.rect(car.x, car.y + r * 1.25, r * 3.5, r * 0.5, r * 0.15)
  // A little counterweight goes the other way on the outside of the lift.
  const counterY = y1 + y0 - car.y
  p.strokeWeight(weight * 0.65)
  p.line(x - r * 3.5, y0 - r * 1.5, x - r * 3.5, counterY)
  p.fill(theme.ink)
  p.rect(x - r * 3.5, counterY, r * 0.85, r * 2)
  p.pop()
}

export function drawStation(p: p5, c: Circuit, stop: Stop, frame: number, theme: Theme, weight: number): void {
  const { radius: r } = c
  const raw = (mod(frame, c.loop) - stop.part.start) / stop.part.duration
  const active = raw >= 0 && raw < 1
  const u = Math.max(0, Math.min(1, raw))
  const hit = active ? bell(u, 0.25, 0.8) : 0
  const w = stop.width
  p.push()
  p.stroke(theme.ink)
  p.strokeWeight(weight)
  p.fill(theme.bg)
  // Identity belongs to the traveler. Machines use paper and ink; the tiny
  // arrival lamp is the only accent, lit only by physical passage.
  p.push()
  p.translate(0, r * 5.2)
  p.noStroke()
  p.fill(theme.ink)
  p.textFont('monospace')
  p.textSize(r * 0.95)
  p.textAlign(p.CENTER, p.CENTER)
  p.text(String(stop.index + 1).padStart(2, '0'), 0, 0)
  p.strokeWeight(weight * 0.65)
  p.stroke(theme.ink)
  p.fill(active ? c.color : theme.bg)
  p.circle(r * 1.7, 0, r * 0.55)
  p.pop()
  p.scale(stop.direction, 1)
  p.rotate(stop.angle)

  const foot = () => {
    p.line(-w * 0.35, r * 1.7, -w * 0.35, r * 3.4)
    p.line(w * 0.35, r * 1.7, w * 0.35, r * 3.4)
    p.line(-w * 0.43, r * 3.4, -w * 0.27, r * 3.4)
    p.line(w * 0.27, r * 3.4, w * 0.43, r * 3.4)
  }
  switch (stop.name) {
    case 'gate': {
      foot()
      p.line(r * 1.3, r * 3.2, r * 1.3, r * 1.3)
      p.push()
      p.translate(r * 1.3, r * 1.2)
      const open = smooth((u - 0.43) / 0.15) * (1 - smooth((u - 0.85) / 0.15))
      p.rotate(active ? open * Math.PI * 0.52 : 0)
      p.fill(theme.ink)
      p.rect(0, -r * 1.9, r * 0.5, r * 3.8, r * 0.18)
      p.pop()
      wheel(p, r * 1.3, r * 2.7, r * 0.9, hit * 2, theme)
      break
    }
    case 'seesaw': {
      const tilt = active ? -0.3 * Math.sin(u * TAU) : 0
      p.triangle(-r, r * 3.6, r, r * 3.6, 0, r * 1.4)
      p.push()
      p.translate(0, r * 1.25)
      p.rotate(tilt)
      p.fill(theme.bg)
      p.rect(0, 0, w, r * 0.5, r * 0.15)
      p.pop()
      p.circle(0, r * 1.6, r * 0.6)
      break
    }
    case 'press':
    case 'punch': {
      foot()
      p.noFill()
      p.rect(0, -r * 2.8, w * 0.62, r * 6.8, r * 0.25)
      p.fill(theme.bg)
      const down = active ? bell(u, 0.35, 0.63) : 0
      p.rect(0, -r * 3.1 + down * r * 1.4, r * 0.7, r * 3)
      if (stop.name === 'press') p.rect(0, -r * 2.35 + down * r, r * 3.4, r * 0.65, r * 0.12)
      else {
        p.triangle(-r * 0.5, -r * 2.3 + down * r, r * 0.5, -r * 2.3 + down * r, 0, -r * 1.4 + down * r * 0.4)
      }
      wheel(p, w * 0.4, -r * 4, r * 1.4, hit * TAU * 0.5, theme)
      p.line(w * 0.31, -r * 4, 0, -r * 4 + down * r)
      break
    }
    case 'scale': {
      foot()
      p.rect(0, r * 2.1, w * 0.62, r * 1.2, r * 0.2)
      p.line(0, r * 2.7, 0, r * 3.4)
      p.line(w * 0.35, r, w * 0.35, -r * 2.8)
      p.circle(w * 0.35, -r * 3.4, r * 3)
      p.line(w * 0.35, -r * 3.4, w * 0.35 + Math.sin(hit * 2 - 1) * r, -r * 3.4 - Math.cos(hit * 2 - 1) * r)
      break
    }
    case 'dominoes': {
      foot()
      for (let i = 0; i < 4; i++) {
        const x = -w * 0.3 + i * w * 0.2
        const fall = active ? smooth((u - (0.10 + i * 0.2)) / 0.18) * (1 - smooth((u - 0.94) / 0.06)) : 0
        p.push()
        p.translate(x, r * 0.95)
        p.rotate(fall * Math.PI * 0.47)
        p.fill(theme.bg)
        p.rect(0, -r * 1.7, r * 0.5, r * 3.4, r * 0.1)
        p.pop()
      }
      break
    }
    case 'trampoline': {
      p.noFill()
      p.line(-w * 0.5, r * 1.2, w * 0.5, r * 1.2)
      for (const side of [-1, 1]) {
        const x = side * w * 0.32
        path(p, [0, 1, 2, 3, 4, 5].map((k) => ({ x: x + (k % 2 ? 1 : -1) * r * 0.3, y: r * (1.4 + k * 0.3) })))
      }
      p.line(-w * 0.42, r * 3.3, w * 0.42, r * 3.3)
      // Launch and landing points share the permanent traveler's trajectory.
      p.noStroke()
      p.fill(theme.ink)
      for (let k = 2; k < 15; k += 2) {
        const u = k / 16
        p.circle((u - 0.5) * w, -Math.sin(Math.PI * u) * c.size * 0.055, weight * 0.65)
      }
      break
    }
    case 'hoop': {
      foot()
      p.noFill()
      p.line(0, r * 2, 0, r * 3.4)
      p.ellipse(0, -r * 0.2, r * 2.2, r * 5.4)
      p.strokeWeight(weight * 0.6)
      p.ellipse(0, -r * 0.2, r * 3, r * 6.2)
      break
    }
    case 'hammer': {
      foot()
      p.line(w * 0.3, r, w * 0.3, -r * 4)
      p.push()
      p.translate(w * 0.3, -r * 4)
      p.rotate(active ? -bell(u, 0.31, 0.65) * 0.88 : 0)
      p.line(0, 0, -w * 0.3, -r * 1.1)
      p.fill(theme.ink)
      p.rect(-w * 0.3, -r * 1.1, r * 1.7, r * 2)
      p.pop()
      p.circle(w * 0.3, -r * 4, r * 0.7)
      break
    }
    case 'bell': {
      foot()
      const ring = active ? Math.sin(u * TAU * 4) * hit * 0.17 : 0
      p.line(-w * 0.35, r * 1.5, -w * 0.35, -r * 4.5)
      p.line(-w * 0.35, -r * 4.5, 0, -r * 4.5)
      p.push()
      p.translate(0, -r * 4.2)
      p.rotate(ring)
      p.noFill()
      p.line(0, 0, 0, r * 0.5)
      p.arc(0, r * 2.3, r * 3.4, r * 3.8, Math.PI, TAU)
      p.line(-r * 1.7, r * 2.3, r * 1.7, r * 2.3)
      p.fill(theme.ink)
      p.circle(0, r * 2.9, r * 0.7)
      p.pop()
      if (hit > 0.1) {
        p.noFill()
        p.line(-r * 2.2, -r * 2.6, -r * (2.4 + hit), -r * 2.9)
        p.line(r * 2.2, -r * 2.6, r * (2.4 + hit), -r * 2.9)
      }
      break
    }
  }
  p.pop()
}

export function drawTraveler(p: p5, c: Circuit, frame: number, theme: Theme, weight: number): void {
  const token = c.at(frame)
  const r = c.radius
  p.push()
  p.translate(token.x, token.y)
  if (c.mode !== 'workshop') p.rotate(token.angle)
  p.stroke(theme.ink)
  p.strokeWeight(weight * 0.85)
  p.fill(token.color)
  if (c.mode === 'workshop') p.rect(0, 0, r * 2, r * 2, r * 0.3)
  else p.circle(0, 0, r * 2)
  // Permanent inset and off-centre pin remain legible even in Mono. No dye,
  // fresh sprite, trail clone or color swap at a machine, clock wrap or lift.
  p.fill(theme.bg)
  p.circle(0, 0, r * 0.7)
  p.fill(theme.ink)
  p.noStroke()
  p.circle(r * 0.62, 0, r * 0.25)
  p.pop()
}
