import type { Composition, Mode, Options } from '../../core/composition'
import { LOOP } from '../../core/constants'
import { mod } from '../../core/ease'
import { makeRng } from '../../core/rng'
import { themeByName } from '../../core/themes'
import type { Cell, Contraption, Instance } from '../../core/types'
import { drawRoute, drawStation, drawTraveler } from './connected-draw'

export type ConnectedMode = 'cascade' | 'workshop' | 'circus' | 'rube'
export const isConnected = (mode: Mode): mode is ConnectedMode =>
  mode === 'cascade' || mode === 'workshop' || mode === 'circus' || mode === 'rube'

export type Point = { x: number; y: number }
export type Mechanism = 'gate' | 'seesaw' | 'bell' | 'dominoes' | 'press' | 'punch' | 'scale' | 'trampoline' | 'hoop' | 'hammer'
export type RouteKind = 'rail' | 'drop' | 'flight' | 'lift' | 'station'
export interface RoutePart {
  kind: RouteKind
  from: Point
  to: Point
  /** Unwrapped frames, including dwell, in the single 12-second circuit. */
  start: number
  duration: number
  at(u: number): Point
  station?: Stop
}
export interface Stop {
  index: number
  name: Mechanism
  center: Point
  angle: number
  direction: number
  width: number
  part: RoutePart
}
export interface Traveler extends Point {
  /** One object for the whole circuit, including the return trip. */
  id: string
  color: string
  part: RoutePart
  progress: number
  angle: number
}
export interface Circuit {
  mode: ConnectedMode
  size: number
  loop: number
  radius: number
  color: string
  stops: Stop[]
  parts: RoutePart[]
  at(frame: number): Traveler
}

const mix = (a: number, b: number, u: number) => a + (b - a) * u
export const lerpPoint = (a: Point, b: Point, u: number): Point => ({ x: mix(a.x, b.x, u), y: mix(a.y, b.y, u) })
const smooth = (u: number) => u * u * (3 - 2 * u)
/** Approach, wait for the tool, release. Both boundaries are position-continuous. */
export const passage = (u: number) => u < 0.4 ? u * 1.25 : u < 0.6 ? 0.5 : 0.5 + (u - 0.6) * 1.25

const mechanisms: Record<ConnectedMode, Mechanism[]> = {
  cascade: ['gate', 'dominoes', 'seesaw', 'bell'],
  workshop: ['press', 'punch', 'scale', 'gate'],
  circus: ['trampoline', 'hoop', 'seesaw', 'bell'],
  rube: ['hammer', 'gate', 'seesaw', 'bell', 'dominoes'],
}

/**
 * A closed itinerary, rather than a queue of short-lived emissions. The same
 * geometry drives rails, traveler, tool contact and elevator. No per-cell
 * token state, palette lookup at a handoff, hidden reset or accumulated clock.
 */
export function buildConnected(options: Options, canvas: number): Composition {
  const mode = options.mode as ConnectedMode
  const theme = themeByName(options.theme)
  const rng = makeRng(`${options.seed}:${mode}`)
  const color = rng.fork('traveler').pick(theme.colors)
  const count = options.res
  const rows = count <= 4 ? 2 : 3
  const radius = canvas * 0.013
  const parts: RoutePart[] = []
  const stops: Stop[] = []
  const point = (x: number, y: number): Point => ({ x: x * canvas, y: y * canvas })
  const top = point(0.19, 0.21)
  let cursor = top
  let elapsed = 0
  const add = (kind: RouteKind, to: Point, at?: (u: number) => Point, duration?: number): RoutePart => {
    const from = cursor
    const sample = at ?? ((u: number) => lerpPoint(from, to, u))
    // Arc length sets travel time, so a long return isn't a sudden fast warp.
    let length = 0
    let previous = from
    for (let k = 1; k <= 40; k++) {
      const next = sample(k / 40)
      length += Math.hypot(next.x - previous.x, next.y - previous.y)
      previous = next
    }
    const part: RoutePart = { kind, from, to, start: elapsed, duration: duration ?? length / canvas, at: sample }
    elapsed += part.duration
    parts.push(part)
    cursor = to
    return part
  }
  const curve = (kind: RouteKind, to: Point, c1: Point, c2: Point) => {
    const from = cursor
    return add(kind, to, (u) => {
      const v = 1 - u
      return {
        x: v ** 3 * from.x + 3 * v * v * u * c1.x + 3 * v * u * u * c2.x + u ** 3 * to.x,
        y: v ** 3 * from.y + 3 * v * v * u * c1.y + 3 * v * u * u * c2.y + u ** 3 * to.y,
      }
    })
  }

  const order = rng.fork('stops').shuffle(mechanisms[mode])
  const place = (center: Point, angle: number, direction: number, width: number) => {
    const from = cursor
    const to = { x: center.x + direction * Math.cos(angle) * width / 2, y: center.y + Math.sin(angle) * width / 2 }
    const name = order[stops.length % order.length]
    const part = add('station', to, (u) => {
      const t = name === 'seesaw' || name === 'trampoline' || name === 'hoop' || name === 'dominoes' ? u : passage(u)
      const p = lerpPoint(from, to, t)
      if (name === 'seesaw') {
        const tilt = -0.3 * Math.sin(u * Math.PI * 2)
        p.y += (t - 0.5) * width * Math.tan(tilt)
      }
      if (name === 'trampoline') p.y -= Math.sin(Math.PI * u) * canvas * 0.055
      return p
    }, width / canvas + 0.075)
    const stop: Stop = { index: stops.length, name, center, angle, direction, width, part }
    part.station = stop
    stops.push(stop)
  }

  if (mode === 'rube') {
    // A staggered itinerary with two reversals. No rows or unused grid cells.
    const anchors = [[0.31, 0.22], [0.57, 0.25], [0.78, 0.33], [0.60, 0.46],
      [0.30, 0.50], [0.48, 0.65], [0.65, 0.71], [0.82, 0.82]]
    const selected = Array.from({ length: count }, (_, k) => {
      const [x, y] = anchors[Math.round(k * (anchors.length - 1) / (count - 1))]
      return point(x + rng.range(-0.013, 0.013), y + rng.range(-0.009, 0.009))
    })
    let previousDirection = 1
    for (let k = 0; k < count; k++) {
      const center = selected[k]
      const direction = k === count - 1 ? 1 : Math.sign(selected[k + 1].x - center.x)
      const angle = rng.range(0.025, 0.10)
      const width = canvas * 0.135
      const from = { x: center.x - direction * Math.cos(angle) * width / 2, y: center.y - Math.sin(angle) * width / 2 }
      curve('rail', from, { x: cursor.x + previousDirection * canvas * 0.05, y: cursor.y },
        { x: from.x - direction * canvas * 0.05, y: from.y })
      place(center, angle, direction, width)
      previousDirection = direction
    }
  } else for (let row = 0; row < rows; row++) {
    const direction = row % 2 === 0 ? 1 : -1
    const y = rows === 2 ? 0.26 + row * 0.44 : 0.24 + row * 0.245
    const slope = mode === 'workshop' ? 0 : 0.055
    const left = 0.24
    const right = 0.82
    const start = point(direction > 0 ? left : right, y)
    const end = point(direction > 0 ? right : left, y + slope)
    if (row === 0) {
      curve('rail', start, point(0.23, 0.21), point(start.x / canvas - 0.035, y))
    } else {
      // A large, visible drop replaces the seam between gadget rows.
      const bow = direction < 0 ? 0.915 : 0.17
      curve(mode === 'circus' ? 'flight' : 'drop', start,
        point(bow, cursor.y / canvas + 0.035), point(bow, y - 0.055))
    }
    const rowCount = Math.floor(count / rows) + (row < count % rows ? 1 : 0)
    const dx = end.x - start.x
    const dy = end.y - start.y
    const angle = Math.atan2(dy, Math.abs(dx))
    const width = canvas * Math.min(0.155, 0.42 / rowCount)
    for (let col = 0; col < rowCount; col++) {
      const center = lerpPoint(start, end, (col + 0.5) / rowCount)
      const offset = { x: direction * Math.cos(angle) * width / 2, y: Math.sin(angle) * width / 2 }
      const from = { x: center.x - offset.x, y: center.y - offset.y }
      if (mode === 'circus' && col > 0) {
        curve('flight', from, { x: cursor.x + direction * canvas * 0.035, y: cursor.y - canvas * 0.095 },
          { x: from.x - direction * canvas * 0.035, y: from.y - canvas * 0.095 })
      } else add('rail', from)
      place(center, angle, direction, width)
    }
    add('rail', end)
  }
  // All of the return is on the page. A guided turn takes the traveler to an
  // exposed lift, which carries it back to the first rail without respawning.
  const bottom = point(0.10, 0.88)
  if (cursor.x > canvas * 0.5) {
    curve('drop', point(0.78, 0.90), point(0.92, cursor.y / canvas), point(0.92, 0.90))
  } else {
    curve('drop', point(0.27, 0.90), point(0.17, cursor.y / canvas + 0.06), point(0.17, 0.90))
  }
  add('rail', point(0.15, 0.90))
  curve('rail', bottom, point(0.10, 0.90), point(0.10, 0.90))
  const liftTop = point(0.10, 0.17)
  const lift = add('lift', liftTop, (u) => lerpPoint(bottom, liftTop, smooth(u)), 0.75)
  curve('rail', top, point(0.10, 0.115), point(0.19, 0.115))

  const loop = LOOP * 3
  const scale = loop / elapsed
  for (const part of parts) {
    part.start *= scale
    part.duration *= scale
  }
  const circuit: Circuit = {
    mode, size: canvas, loop, radius, color, stops, parts,
    at(frame) {
      const f = mod(frame, loop)
      const part = parts.find((p) => f < p.start + p.duration) ?? parts[parts.length - 1]
      const progress = Math.max(0, Math.min(1, (f - part.start) / part.duration))
      const position = part.at(progress)
      return {
        ...position, id: `${options.seed}:${mode}:traveler`, color, part, progress,
        angle: (position.x - top.x) / radius,
      }
    },
  }
  const cells: Cell[] = stops.map((s, index) => ({
    ...s.center, size: canvas * 0.17, w: canvas * 0.17, h: canvas * 0.17,
    row: Math.floor(index / 3), col: index % 3, index, depth: 0,
  }))
  const instances: Instance[] = stops.map((stop, index) => {
    const contraption: Contraption = {
      name: stop.name, setup: () => ({}),
      draw(p, _state, ctx) { drawStation(p, circuit, stop, ctx.u * loop, ctx.theme, ctx.weight) },
    }
    return { contraption, state: {}, cell: cells[index], angle: 0, mirror: 1, phase: 0, period: loop,
      fireFrame: stop.part.start + stop.part.duration * 0.5 }
  })
  return {
    options, theme, cells, instances, loop, used: [...new Set(stops.map((s) => s.name))].sort(),
    captions: [], header: null, wires: [], showWires: false, unit: canvas * 0.085,
    underlays: [(p, frame, ctx) => drawRoute(p, circuit, lift, frame, ctx.theme, ctx.weight(canvas * 0.085))],
    overlays: [(p, frame, ctx) => drawTraveler(p, circuit, frame, ctx.theme, ctx.weight(canvas * 0.085))],
    circuit,
  }
}
