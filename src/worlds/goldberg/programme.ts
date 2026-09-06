import { LOOP } from '../../core/constants'
import type { Overlay } from '../../core/composition'
import { outline, solid } from '../../core/draw'
import { mod } from '../../core/ease'
import type { Pt } from '../../core/lane'
import type { Cell, Instance, Wire } from '../../core/types'
import { LINK_DELAY } from '../../core/wiring'

/** A shared edge, including edges beside multi-cell acts. */
export function sharedEdge(a: Cell, b: Cell): Pt | null {
  const ax = a.x - a.w / 2, ay = a.y - a.h / 2
  const bx = b.x - b.w / 2, by = b.y - b.h / 2
  const top = Math.max(ay, by), bottom = Math.min(ay + a.h, by + b.h)
  const left = Math.max(ax, bx), right = Math.min(ax + a.w, bx + b.w)
  if (bottom - top > 1e-6 && (Math.abs(ax + a.w - bx) < 1e-6 || Math.abs(bx + b.w - ax) < 1e-6)) {
    return [Math.max(ax, bx), (top + bottom) / 2]
  }
  if (right - left > 1e-6 && (Math.abs(ay + a.h - by) < 1e-6 || Math.abs(by + b.h - ay) < 1e-6)) {
    return [(left + right) / 2, Math.max(ay, by)]
  }
  return null
}

/** Shortest perimeter route from the act's drive hub to a shared edge. */
function rim(cell: Cell, end: Pt): Pt[] {
  const { w, h } = cell
  const x = cell.x - w / 2, y = cell.y - h / 2
  const length = 2 * (w + h)
  const start = w + h + w / 2
  const [ex, ey] = [end[0] - x, end[1] - y]
  const finish = Math.abs(ey) < 1e-6 ? ex
    : Math.abs(ex - w) < 1e-6 ? w + ey
    : Math.abs(ey - h) < 1e-6 ? w + h + w - ex : length - ey
  const forward = mod(finish - start, length)
  const delta = forward <= length / 2 ? forward : forward - length
  const target = start + delta
  const corners = [-1, 0, 1].flatMap((lap) => [0, w, w + h, 2 * w + h].map((s) => s + lap * length))
    .filter((s) => s > Math.min(start, target) && s < Math.max(start, target))
    .sort((a, b) => delta > 0 ? a - b : b - a)
  const at = (distance: number): Pt => {
    const s = mod(distance, length)
    if (s <= w) return [x + s, y]
    if (s <= w + h) return [x + w, y + s - w]
    if (s <= 2 * w + h) return [x + 2 * w + h - s, y + h]
    return [x, y + length - s]
  }
  return [at(start), ...corners.map(at), end]
}

/** Belts skirt the acts' footprints; they never run through a performer. */
export function cuePath(from: Cell, to: Cell): Pt[] {
  const edge = sharedEdge(from, to)
  if (!edge) throw new Error('A programme drive must join adjacent acts')
  return [...rim(from, edge), ...rim(to, edge).reverse().slice(1)]
}

/** One connected drive, with the dial setting how much of the bill it cues. */
export function programme(instances: Instance[], density: number, start: number): Wire[] {
  const ordered = [...instances].sort((a, b) => a.cell.row - b.cell.row || a.cell.col - b.cell.col)
  const count = Math.min(ordered.length, Math.round(ordered.length * Math.max(0, Math.min(1, density))))
  if (count < 2) return []
  const root = ordered[0]
  const color = (root.state as { color: string }).color
  const setBeat = (instance: Instance, frame: number) => {
    instance.fireFrame = mod(frame, LOOP)
    instance.phase = mod((instance.contraption.fireAt ?? 0) * instance.period - frame, instance.period)
  }
  setBeat(root, start)
  const queue = [root]
  const seen = new Set(queue)
  const wires: Wire[] = []
  for (let i = 0; i < queue.length && seen.size < count; i++) {
    const from = queue[i]
    for (const to of ordered) {
      if (seen.size >= count) break
      if (seen.has(to) || !sharedEdge(from.cell, to.cell)) continue
      seen.add(to)
      queue.push(to)
      setBeat(to, from.fireFrame + LINK_DELAY)
      wires.push({ from: from.cell, to: to.cell, start: from.fireFrame, end: from.fireFrame + LINK_DELAY, color, last: false })
    }
  }
  return wires
}

/** A common line shaft with indexed cams, each lifting on its act's beat. */
export function programmeLayers(wires: Wire[], instances: Instance[]): { underlay: Overlay; overlay: Overlay } {
  const paths = wires.map((wire) => cuePath(wire.from, wire.to))
  const cells = new Set(wires.flatMap((wire) => [wire.from, wire.to]))
  const driven = instances.filter((instance) => cells.has(instance.cell))
  const points = new Map<string, Pt>()
  for (const path of paths) for (const point of path) points.set(point.join(':'), point)
  return {
    underlay: (p, frame, { theme, weight }) => {
      if (!driven.length) return
      const k = driven[0].cell.size
      const pen = weight(k)
      for (const path of paths) {
        for (const [stroke, width] of [[theme.ink, pen * 3], [theme.bg, pen]] as const) {
          p.stroke(stroke)
          p.strokeWeight(width)
          for (let i = 1; i < path.length; i++) p.line(...path[i - 1], ...path[i])
        }
      }
      for (const [x, y] of points.values()) {
        solid(p, theme.ink, pen, theme.bg)
        p.circle(x, y, k * 0.08)
        const angle = frame / LOOP * Math.PI * 4
        p.line(x - Math.cos(angle) * k * 0.03, y - Math.sin(angle) * k * 0.03,
          x + Math.cos(angle) * k * 0.03, y + Math.sin(angle) * k * 0.03)
      }
    },
    overlay: (p, frame, { theme, weight }) => {
      for (const instance of driven) {
        const { cell } = instance
        const k = cell.size
        const y = cell.y + cell.h / 2
        const hit = Math.max(0, 1 - mod(frame - instance.fireFrame, LOOP) / 18)
        outline(p, theme.ink, weight(k))
        p.line(cell.x, y, cell.x, y - k * (0.1 + hit * 0.06))
        solid(p, theme.ink, weight(k), hit > 0 ? theme.colors[0] : theme.bg)
        p.rect(cell.x, y - k * (0.1 + hit * 0.06), k * 0.13, k * 0.035)
        p.circle(cell.x, y, k * 0.08)
      }
    },
  }
}
