import type { Theme } from '../../../../src/core/themes'
import type { Placed } from '../plan'
import { Show, type ShowPoint } from '../show'
import { universeAt, type Universe } from '../universe'
import { worldByName, type Backdrop } from '../worlds'
import scoreData from './clair-de-lune-30s.score.json'

export interface AuthoredScene {
  begin: number
  end: number
  world: string
  theme: Theme
  backdrop: Backdrop
  ballColor: string
  pieces: (Omit<Placed, 'piece'> & { piece: string; id: string })[]
  /** Seconds after the audio trim, paired with seconds on the stock mechanisms' clock. */
  cues: { at: number; native: number; label: string }[]
  /** Authored framing: broad views at phrase boundaries, closer views for a mechanism. */
  camera: { at: number; x: number; y: number; cells: number }[]
}
export interface AuthoredScore {
  duration: number
  audioOffset: number
  scenes: AuthoredScene[]
}

export const clairDeLuneScore = scoreData as AuthoredScore
export const CLAIR_DURATION = clairDeLuneScore.duration
export const CLAIR_AUDIO_OFFSET = clairDeLuneScore.audioOffset

/** Monotone cubic interpolation hits cues exactly without stopping at each note. */
function scoreClock(cues: AuthoredScene['cues']): (t: number) => number {
  const slopes = cues.slice(1).map((b, i) => (b.native - cues[i].native) / (b.at - cues[i].at))
  const tangents = cues.map((_, i) => {
    if (i === 0) return slopes[0]
    if (i === cues.length - 1) return slopes[i - 1]
    const a = slopes[i - 1], b = slopes[i]
    return a * b <= 0 ? 0 : 2 * a * b / (a + b)
  })
  return (t) => {
    const clamped = Math.max(cues[0].at, Math.min(cues.at(-1)!.at, t))
    let i = 0
    while (i < cues.length - 2 && cues[i + 1].at < clamped) i++
    const a = cues[i], b = cues[i + 1], h = b.at - a.at
    const f = (clamped - a.at) / h
    return (2 * f ** 3 - 3 * f ** 2 + 1) * a.native
      + (f ** 3 - 2 * f ** 2 + f) * h * tangents[i]
      + (-2 * f ** 3 + 3 * f ** 2) * b.native
      + (f ** 3 - f ** 2) * h * tangents[i + 1]
  }
}

/** Checkpoint only. Playback reads saved maps and cues, never a planner or a random generator. */
export class ClairDeLunePreview extends Show {
  private readonly maps: Universe[]
  private readonly clocks = clairDeLuneScore.scenes.map((s) => scoreClock(s.cues))

  constructor() {
    super('clair-de-lune-30s-preview')
    this.maps = clairDeLuneScore.scenes.map((scene, index) => {
      const world = worldByName(scene.world)!
      const pieces: Placed[] = scene.pieces.map(({ piece: name, ...placed }) => {
        const piece = world.pieces.find((p) => p.name === name)
        if (!piece) throw new Error(`Unknown score piece: ${scene.world}/${name}`)
        return { ...placed, piece }
      })
      const cells = pieces.flatMap((p) => p.cells)
      const bounds = {
        x0: Math.min(...cells.map(([x]) => x)), x1: Math.max(...cells.map(([x]) => x)),
        y0: Math.min(...cells.map(([, y]) => y)), y1: Math.max(...cells.map(([, y]) => y)),
      }
      return {
        index, seed: this.seed, world, theme: scene.theme, taste: 'clair-de-lune',
        ballColor: scene.ballColor, backdrop: scene.backdrop, pieces, box: bounds, bounds,
        journey: pieces.at(-1)!.start + pieces.at(-1)!.span,
      }
    })
  }

  override universe(i = 0): Universe { return this.maps[Math.max(0, Math.min(this.maps.length - 1, i))] }
  override begin(i = 0): number { return clairDeLuneScore.scenes[this.universe(i).index].begin }
  override indexAt(t = 0): number { return t < clairDeLuneScore.scenes[1].begin ? 0 : 1 }
  override worldAt(i = 0) { return this.universe(i).world }
  override nextVisit(from = 0): number { return Math.min(from + 1, this.maps.length - 1) }

  override at(t: number): ShowPoint {
    const index = this.indexAt(Math.max(0, Math.min(CLAIR_DURATION, t)))
    const universe = this.maps[index]
    const local = this.clocks[index](t)
    return { ...universeAt(universe, local), universe, local, begin: this.begin(index) }
  }

  /** The camera holds compositions, then travels with the phrase instead of chasing every note. */
  cameraAt(t: number): { x: number; y: number; cells: number } {
    const keys = clairDeLuneScore.scenes[this.indexAt(t)].camera
    if (t <= keys[0].at) return keys[0]
    if (t >= keys.at(-1)!.at) return keys.at(-1)!
    let i = 0
    while (keys[i + 1].at < t) i++
    const a = keys[i], b = keys[i + 1]
    const f = (t - a.at) / (b.at - a.at)
    const blend = (1 - Math.cos(f * Math.PI)) / 2
    const mix = (x: number, y: number) => x + (y - x) * blend
    return { x: mix(a.x, b.x), y: mix(a.y, b.y), cells: mix(a.cells, b.cells) }
  }
}
