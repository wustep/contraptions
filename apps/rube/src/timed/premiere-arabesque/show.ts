import { ballAt, laneAt, type Piece, type PieceCtx } from '../../parts'
import type { Placed } from '../../plan'
import { Show, type ShowPoint } from '../../show'
import type { Universe } from '../../universe'
import { worldByName } from '../../worlds'
import data from './score.generated.json'
import type { PremiereScore, TimedPiece } from './types'

// The generator and preview checks validate tuples, placement, and timing.
export const score = data as unknown as PremiereScore
export const clampTime = (time: number) => Math.max(0, Math.min(score.duration, Number.isFinite(time) ? time : 0))

export { pieceTime } from './time'
import { pieceTime } from './time'

function retimePiece(stock: Piece<any>, authored: TimedPiece): Piece<any> {
  const ctx = (c: PieceCtx): PieceCtx => {
    const t = pieceTime(authored, authored.begin + c.t)
    return { ...c, t, since: t - authored.lane.fire }
  }
  return {
    ...stock,
    draw: (p, state, c) => stock.draw(p, state, ctx(c)),
    over: stock.over ? (p, state, c) => stock.over!(p, state, ctx(c)) : undefined,
    // Keep arcade mechanisms; omit floating score overlays in music shows.
    scores: undefined,
  }
}

/** Uses Machine's stock renderer without asking its procedural planner for a map. */
export class PremiereShow extends Show {
  private readonly stages: Universe[]

  constructor() {
    super(score.id)
    this.stages = score.maps.map((map, index) => {
      const world = worldByName(map.world)!
      const pieces: Placed[] = map.pieces.map((p) => {
        const stock = world.pieces.find((stock) => stock.name === p.name)!
        return { ...p, piece: retimePiece(stock, p), start: p.begin - map.begin, span: p.end - p.begin, points: 0 }
      })
      const cells = pieces.flatMap((p) => p.cells)
      const bounds = { x0: Math.min(...cells.map((c) => c[0])), y0: Math.min(...cells.map((c) => c[1])), x1: Math.max(...cells.map((c) => c[0])), y1: Math.max(...cells.map((c) => c[1])) }
      return { index, seed: this.seed, world, theme: world.themes[0], taste: 'authored', ballColor: pieces[0].ballIn.color,
        backdrop: map.backdrop, pieces, box: bounds, bounds, journey: map.end - map.begin }
    })
  }

  override indexAt(time: number): number {
    const t = clampTime(time)
    const i = score.maps.findIndex((map) => t < map.end)
    return i < 0 ? score.maps.length - 1 : i
  }

  override universe(index: number): Universe { return this.stages[Math.max(0, Math.min(this.stages.length - 1, index))] }
  override begin(index: number): number { return score.maps[this.universe(index).index].begin }
  override worldAt(index: number) { return this.universe(index).world }

  override at(time: number): ShowPoint {
    const t = clampTime(time), index = this.indexAt(t)
    const map = score.maps[index], universe = this.stages[index]
    let i = map.pieces.findIndex((p) => t < p.end)
    if (i < 0) i = map.pieces.length - 1
    const authored = map.pieces[i], placed = universe.pieces[i]
    const native = pieceTime(authored, t)
    // Relay identity and position change together, including an exact seek to
    // the strike. Stock laneAt otherwise chooses the segment ending at that time.
    const relay = authored.changes.some(c => c.relay && c.at <= native && native - c.at < 1e-10)
    const point = laneAt(authored.lane, native + (relay ? 1e-9 : 0))
    return { ...point, x: authored.col + authored.mirror * point.x, y: authored.row + point.y,
      placed, ball: ballAt(authored.ballIn, authored.changes, native), universe, local: t - map.begin, begin: map.begin }
  }

  labelAt(time: number): string {
    const map = score.maps[this.indexAt(time)]
    return (map.pieces.find((p) => time < p.end) ?? map.pieces[map.pieces.length - 1]).label
  }
}

export const show = new PremiereShow()
export const at = (time: number) => show.at(time)
export const phraseAt = (time: number) => score.phrases.find((p) => clampTime(time) < p.end) ?? score.phrases[score.phrases.length - 1]

/** Smooth interpolation of the saved camera; no per-key stop or live tracking. */
export function cameraAt(time: number) {
  const t = clampTime(time), keys = score.maps[show.indexAt(t)].camera
  let i = keys.findIndex((key) => key.time >= t)
  if (i <= 0) i = i < 0 ? keys.length - 1 : 1
  const a = keys[i - 1], b = keys[i], before = keys[Math.max(0, i - 2)], after = keys[Math.min(keys.length - 1, i + 1)]
  const dt = b.time - a.time, u = Math.max(0, Math.min(1, (t - a.time) / dt)), u2 = u * u, u3 = u2 * u
  const value = (key: 'x' | 'y' | 'visible') => {
    const v0 = (b[key] - before[key]) / (b.time - before.time)
    const v1 = (after[key] - a[key]) / (after.time - a.time)
    return (2*u3-3*u2+1)*a[key] + (u3-2*u2+u)*dt*v0 + (-2*u3+3*u2)*b[key] + (u3-u2)*dt*v1
  }
  return {x:value('x'),y:value('y'),visible:value('visible')}
}
