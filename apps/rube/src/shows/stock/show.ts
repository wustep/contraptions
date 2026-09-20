import { ballAt, laneAt } from '../../parts'
import { Show, type ShowPoint } from '../../show'
import type { Universe } from '../../universe'
import { worldByName } from '../../worlds'
import type { StockScore } from './types'

/** Every mechanism and ball uses the same unmodified stock clock. */
export class StockShow extends Show {
  private readonly stages: Universe[]

  constructor(readonly score: StockScore) {
    super(score.id)
    this.stages = score.maps.map((map, index) => {
      const world = worldByName(map.world)!
      const pieces = map.pieces.map((p) => ({
        ...p,
        // The stock drawing keeps running after the ball leaves, including its reset.
        piece: { ...world.pieces.find((s) => s.name === p.spec.name)!, scores: undefined },
        start: p.begin - map.begin, span: p.end - p.begin, points: 0,
      }))
      const cells = pieces.flatMap((p) => p.cells)
      const bounds = { x0: Math.min(...cells.map((c) => c[0])), y0: Math.min(...cells.map((c) => c[1])), x1: Math.max(...cells.map((c) => c[0])), y1: Math.max(...cells.map((c) => c[1])) }
      return { index, seed: score.id, world, theme: world.themes[0], taste: 'arranged',
        ballColor: pieces[0].ballIn.color, backdrop: map.backdrop, pieces, box: bounds, bounds, journey: map.end - map.begin }
    })
  }

  clamp(time: number): number { return Math.max(0, Math.min(this.score.duration, Number.isFinite(time) ? time : 0)) }
  override indexAt(time: number): number {
    const i = this.score.maps.findIndex((m) => this.clamp(time) < m.end)
    return i < 0 ? this.stages.length - 1 : i
  }
  override universe(index: number): Universe { return this.stages[Math.max(0, Math.min(this.stages.length - 1, index))] }
  override begin(index: number): number { return this.score.maps[this.universe(index).index].begin }
  override worldAt(index: number) { return this.universe(index).world }

  override at(time: number): ShowPoint {
    const t = this.clamp(time), index = this.indexAt(t)
    const map = this.score.maps[index], universe = this.stages[index]
    const i = map.pieces.findIndex((p) => t < p.end)
    const placed = universe.pieces[i < 0 ? map.pieces.length - 1 : i]
    const elapsed = t - map.begin - placed.start
    // Undo cancellation error when seeking to an exact saved event. This only
    // snaps floating-point noise, less than a nanosecond, never musical timing.
    const event = placed.changes.find((c) => Math.abs(c.at - elapsed) < 1e-10)
    const native = event?.at ?? elapsed
    // At an exact relay seek, use the new ball's side of the discontinuity.
    const relay = placed.changes.some((c) => c.relay && c.at <= native && native - c.at < 1e-10)
    const point = laneAt(placed.lane, native + (relay ? 1e-9 : 0))
    return { ...point, x: placed.col + placed.mirror * point.x, y: placed.row + point.y,
      placed, ball: ballAt(placed.ballIn, placed.changes, native), universe, local: t - map.begin, begin: map.begin }
  }

  /** Smooth only the camera. Phrase framing never changes a piece's duration. */
  camera(time: number) {
    const t = this.clamp(time), map = this.score.maps[this.indexAt(t)]
    let x = 0, y = 0, cells = 0, sum = 0
    for (let j = -10; j <= 14; j++) {
      const weight = 1 - Math.abs(j - 2) / 14
      const sample = Math.max(map.begin, Math.min(map.end - 1e-8, t + j * .04))
      const at = this.at(sample)
      const phrase = this.score.phrases.find((p) => sample < p.end) ?? this.score.phrases.at(-1)!
      x += at.x * weight; y += at.y * weight; cells += (phrase.visible ?? 5.8) * weight; sum += weight
    }
    return { x: x / sum, y: y / sum - .18, cells: cells / sum }
  }
}
