import { beatX, boardHeight, boardWidth, footprint, mod, STEP, trackY, type Footprint, type Take, type Note, type Voice } from './model'

export interface Point { x: number; y: number }
export interface Knot extends Point { beat: number; note?: Note }
export interface Segment { a: Knot; b: Knot; c1: Point; c2: Point; lift: boolean; returning: boolean; bounce?: number }
export interface Route { track: string; segments: Segment[]; home: Point }
export interface ScoreEvent { at: number; voice: Voice; degree: number; strength: number; slot: number; id: string }
export function scoreFor(take: Take): ScoreEvent[] {
  return take.notes.flatMap(n => {
    const slot = take.tracks.findIndex(t => t.id === n.track), track = take.tracks[slot]
    return track.muted || !track.volume ? [] : [{ at: n.beat * STEP, voice: n.kind, degree: n.pitch, strength: track.volume, slot, id: n.id }]
  }).sort((a, b) => a.at - b.at)
}
const inside = (p: Point, r: Footprint): boolean => p.x > r.left + .001 && p.x < r.right - .001 && p.y > r.top + .001 && p.y < r.bottom - .001
function clearLine(a: Point, b: Point, boxes: Footprint[]): boolean {
  return boxes.every(r => a.x === b.x
    ? !(a.x > r.left && a.x < r.right && Math.max(a.y, b.y) > r.top + .001 && Math.min(a.y, b.y) < r.bottom - .001)
    : !(a.y > r.top && a.y < r.bottom && Math.max(a.x, b.x) > r.left + .001 && Math.min(a.x, b.x) < r.right - .001))
}
/** Only a blocked connection needs a detour. A small orthogonal visibility
 * grid finds a rail around other instruments; contact times never move. */
function detour(segment: Segment, take: Take): Segment[] {
  const boxes = take.notes.filter(n => n.id !== segment.a.note?.id && n.id !== segment.b.note?.id).map(footprint)
  const sampled = Array.from({ length: 49 }, (_, i) => onSegment(segment, i / 48))
  if (!boxes.some(r => sampled.some(p => inside(p, r)))) return [segment]
  const { a, b } = segment
  if (boxes.some(r => inside(a, r) || inside(b, r))) return [segment]
  const unique = (values: number[]): number[] => [...new Set(values)].sort((a, b) => a - b)
  const xs = unique([a.x, b.x, 20, boardWidth(take) - 20, ...boxes.flatMap(r => [r.left - 10, r.right + 10])].filter(x => x >= 16 && x <= boardWidth(take) - 10))
  const ys = unique([a.y, b.y, 28, boardHeight(take) - 14, ...boxes.flatMap(r => [r.top - 10, r.bottom + 10])].filter(y => y >= 24 && y <= boardHeight(take) - 10))
  const cols = xs.length, start = ys.indexOf(a.y) * cols + xs.indexOf(a.x), goal = ys.indexOf(b.y) * cols + xs.indexOf(b.x)
  if (start < 0 || goal < 0) return [segment]
  const point = (id: number): Point => ({ x: xs[id % cols], y: ys[Math.floor(id / cols)] })
  const costs = new Map<number, number>([[start, 0]]), parent = new Map<number, number>(), open = new Set([start]), closed = new Set<number>()
  while (open.size) {
    let current = -1, best = Infinity
    for (const id of open) {
      const p = point(id), score = costs.get(id)! + Math.abs(p.x - b.x) + Math.abs(p.y - b.y)
      if (score < best) { current = id; best = score }
    }
    if (current === goal) break
    open.delete(current); closed.add(current)
    const x = current % cols, y = Math.floor(current / cols), p = point(current)
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx < 0 || nx >= cols || ny < 0 || ny >= ys.length) continue
      const next = ny * cols + nx, q = point(next)
      if (closed.has(next) || !clearLine(p, q, boxes)) continue
      const cost = costs.get(current)! + Math.abs(q.x - p.x) + Math.abs(q.y - p.y)
      if (cost >= (costs.get(next) ?? Infinity)) continue
      costs.set(next, cost); parent.set(next, current); open.add(next)
    }
  }
  if (!parent.has(goal)) return [segment]
  const path: Point[] = [b]
  let cursor = goal
  while (cursor !== start) { cursor = parent.get(cursor)!; path.unshift(point(cursor)) }
  // Remove collinear grid points so the lift has a continuous, readable run.
  const simple = path.filter((p, i) => !i || i === path.length - 1 || !((path[i - 1].x === p.x && p.x === path[i + 1].x) || (path[i - 1].y === p.y && p.y === path[i + 1].y)))
  const lengths = simple.slice(1).map((p, i) => Math.hypot(p.x - simple[i].x, p.y - simple[i].y)), total = lengths.reduce((sum, n) => sum + n, 0)
  let elapsed = 0
  return lengths.map((length, i) => {
    const from: Knot = i ? { ...simple[i], beat: a.beat + elapsed / total * (b.beat - a.beat) } : a
    elapsed += length
    const to: Knot = i === lengths.length - 1 ? b : { ...simple[i + 1], beat: a.beat + elapsed / total * (b.beat - a.beat) }
    return { a: from, b: to, c1: { x: from.x + (to.x - from.x) / 3, y: from.y + (to.y - from.y) / 3 }, c2: { x: from.x + (to.x - from.x) * 2 / 3, y: from.y + (to.y - from.y) * 2 / 3 }, lift: to.y < from.y - 12, returning: segment.returning }
  })
}
/** One geometric path owns both the drawn rail and the marble's position.
 * Notes are exact knots, so contact and sound share the same score time. */
export function routesFor(take: Take): Route[] {
  return take.tracks.map((track, index) => {
    const y = trackY(index), home = { x: 64, y }, end = beatX(take.length - .6)
    const notes = take.notes.filter(n => n.track === track.id).sort((a, b) => a.beat - b.beat || a.id.localeCompare(b.id))
    const knots: Knot[] = [{ ...home, beat: 0 }, ...notes.map(n => ({ x: beatX(n.beat), y: n.y, beat: n.beat, note: n })),
      { x: end - 18, y, beat: take.length - 1.55 }, { x: end, y: y + 18, beat: take.length - 1.45 },
      { x: end, y: y + 82, beat: take.length - 1.15 }, { x: end - 18, y: y + 100, beat: take.length - 1.05 },
      { x: 54, y: y + 100, beat: take.length - .32 }, { x: 36, y: y + 82, beat: take.length - .22 },
      { x: 36, y: y + 18, beat: take.length - .06 }, { ...home, beat: take.length }]
    const segments: Segment[] = []
    for (let i = 1; i < knots.length; i++) {
      const a = knots[i - 1], b = knots[i], vertical = a.x === b.x, dx = (b.x - a.x) * .5
      let c1 = vertical ? { x: a.x, y: a.y + (b.y - a.y) * .4 } : { x: a.x + dx, y: a.y }
      let c2 = vertical ? { x: b.x, y: b.y - (b.y - a.y) * .4 } : { x: b.x - dx, y: b.y }
      // Rounded chute corners turn the marble and its supporting rail together.
      const turn = i - notes.length
      if (turn === 2) { c1 = { x: b.x, y: a.y }; c2 = { x: b.x, y: a.y } }
      if (turn === 4) { c1 = { x: a.x, y: b.y }; c2 = { x: a.x, y: b.y } }
      if (turn === 6) { c1 = { x: b.x, y: a.y }; c2 = { x: b.x, y: a.y } }
      if (turn === 8) { c1 = { x: a.x, y: b.y }; c2 = { x: a.x, y: b.y } }
      segments.push({ a, b, c1, c2, lift: b.y < a.y - 12, returning: i > notes.length + 1 })
    }
    const compiled = segments.flatMap(s => detour(s, take))
    for (const s of compiled) {
      if (!s.a.note) continue
      const height = { timpani: 22, xylophone: 14, keys: 10, triangle: 8, harp: 7, musicbox: 8 }[s.a.note.kind]
      const span = Math.min(.42, (s.b.beat - s.a.beat) * .4)
      const others = take.notes.filter(n => n.id !== s.a.note!.id).map(footprint)
      s.bounce = height
      for (let i = 0; i <= 24; i++) {
        const age = i / 24 * span, p = onSegment(s, age / (s.b.beat - s.a.beat))
        p.y -= height * Math.sin(Math.PI * age / span)
        if (others.some(r => inside(p, r))) { s.bounce = 0; break }
      }
    }
    return { track: track.id, segments: compiled, home }
  })
}
export function onSegment(s: Segment, u: number): Point {
  const v = 1 - u
  return { x: v ** 3 * s.a.x + 3 * v * v * u * s.c1.x + 3 * v * u * u * s.c2.x + u ** 3 * s.b.x, y: v ** 3 * s.a.y + 3 * v * v * u * s.c1.y + 3 * v * u * u * s.c2.y + u ** 3 * s.b.y }
}
export function routeAt(route: Route, beat: number, length: number): Point {
  const t = mod(beat, length)
  const segment = route.segments.find(s => t >= s.a.beat && t < s.b.beat) || route.segments[0]
  const point = onSegment(segment, (t - segment.a.beat) / Math.max(.00001, segment.b.beat - segment.a.beat))
  // An impact briefly lifts the ball off the supporting rail. It starts at the
  // exact contact and settles onto the same rail, without a second sound.
  if (segment.a.note) {
    const age = t - segment.a.beat, span = Math.min(.42, (segment.b.beat - segment.a.beat) * .4)
    const height = segment.bounce || 0
    if (age < span) point.y -= height * Math.sin(Math.PI * age / span)
  }
  return point
}
export function segmentPath(s: Segment): string { return `M${s.a.x} ${s.a.y}C${s.c1.x} ${s.c1.y} ${s.c2.x} ${s.c2.y} ${s.b.x} ${s.b.y}` }

/** Compact purpose-built musical mechanisms. All six have a contact surface
 * at y=8, exactly one marble radius below their route knot. */
export function mechanism(kind: Voice): string {
  if (kind === 'timpani') return '<path class="wood" d="M-34 14Q-32 57 0 57Q32 57 34 14Z"/><path d="m-21 50-7 18m49-18 7 18M-33 68h12m9 0h12m20 0h12"/><ellipse class="paper" cx="0" cy="16" rx="34" ry="8"/><path class="react" d="M-26 16Q0 9 26 16"/><path class="fine" d="m-25 30 8 13m42-13-8 13"/>'
  if (kind === 'triangle') return '<path d="M-31 68V-17h38m-7 0v31"/><circle class="paper" cx="0" cy="17" r="4"/><path class="paper react" d="m0 21-24 39h49L6 28"/><path class="wood" d="M-17 8h34v7h-34z"/><path d="M0 15v18m-7 0h14M-39 68h17"/>'
  if (kind === 'harp') return '<path class="wood" d="M-35 66V18Q-8 39 33 17L25 66Z"/><path class="paper" d="M-27 58V31Q-8 42 23 29L18 58Z"/><path class="strings fine" d="M-18 36v20m9-17v17m9-17v17m9-19v19"/><path d="M-39 68h68M-14 8h28M0 8v32"/><circle class="wood react" cy="42" r="4"/>'
  if (kind === 'keys') return '<path class="wood" d="M-39 10h78v46h-78z"/><path class="paper" d="M-34 13h68v34h-68z"/><path class="fine" d="M-20 14v32m13-32v32m14-32v32m13-32v32"/><path stroke-width="6" d="M-20 14v15m13-15v15m26-15v15"/><path class="paper react" d="M-6 8H6v38H-6z"/><path d="M-30 56v12m60-12v12M-37 68h14m0-14h44m2 14h14"/>'
  if (kind === 'xylophone') return '<path d="M-36 39h72m-65-14v42m58-42v42M-35 67h12m46 0h12"/><g class="wood"><rect x="-35" y="19" width="12" height="34" rx="2"/><rect x="-20" y="14" width="12" height="36" rx="2"/><rect class="react" x="-5" y="8" width="12" height="39" rx="2"/><rect x="10" y="14" width="12" height="30" rx="2"/><rect x="25" y="19" width="12" height="22" rx="2"/></g><path class="fine" d="M-29 27v10m15-15v10m15-15v10m15-5v10m15-5v8"/>'
  return '<path class="wood" d="M-35 46h70v19h-70z"/><path d="M-28 65v5m56-5v5m7-15h12V41"/><circle class="wood" cx="47" cy="38" r="4"/><circle class="paper" cy="32" r="24"/><g class="wheel"><path class="wood" d="M-8 10h16l3 10 10 3v16l-10 3-3 10H-8l-3-10-10-3V23l10-3z"/><circle class="paper" cy="32" r="10"/><path class="fine" d="M0 18v5m0 18v5m-14-14h5m18 0h5"/></g><circle class="ink" cy="32" r="3"/><path class="react" d="M-29 8H8m-32 0v10m7-10v9m7-9v7"/>'
}
