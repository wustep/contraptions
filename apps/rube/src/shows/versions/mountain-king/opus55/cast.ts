import type p5 from 'p5'
import type { Theme } from '../../../../../../../src/core/themes'
import { mixHex, type Pt } from '../../../../parts'
import { FLOOR } from '../../../../parts'
import { fjord, gold, moss, troll } from '../../../../playground/pieces/dovre/look'
import { beatAt } from './grid'

/**
 * The cast: the riders who are not the ball.
 *
 * The ball is Peer, the intruder: the one thread, drawn by the stage as
 * every Machine ball is, and he plays the tune. The trolls are the band
 * that wakes up behind him, each a ball with a face and a job you can
 * follow: **Oom**, big and mossy, lands on beats one and three; **Pah**,
 * small and blue-grey, lands on two and four; the **King**, the biggest,
 * crowned, lands once a bar and on the coda's chords. Each lands a little
 * squashed and kicks up dust, and sleeps, eyes shut, breathing in time,
 * until its cue.
 *
 * A troll's life is a track: moves in beats (a hop from here to there, a
 * roll, a rest), so it keeps the music's time the way the pieces do.
 */

export interface Move {
  /** Beats it starts and ends on. */
  b0: number
  b1: number
  from: Pt
  to: Pt
  /** How high a hop peaks over its chord's middle, in cells. 0 is a straight run. */
  arc: number
  /** For a run, how it is eased. */
  ease?: 'in' | 'out' | 'inout'
}

export interface Troll {
  name: string
  /** Body radius, in cells. */
  r: number
  /** The body's colour, from the theme. */
  fill(theme: Theme): string
  crown?: boolean
  /** Asleep before this beat, eyes shut and breathing; awake after. */
  wake: number
  /** The beat it turns to stone, if it does. */
  stone?: number
  /** Its moves, in order. Before the first it is where the first starts; after the last, where it ends. */
  moves: Move[]
  /** Beats it is landed on by something else: a squash, as a landing. */
  thumps?: number[]
  /** Where it looks, at beat b: a point in world cells, or null to look where it is going. */
  eye?: (b: number) => Pt | null
}

export const OOM = (theme: Theme) => moss(theme)
export const PAH = (theme: Theme) => mixHex(fjord(theme), moss(theme), 0.35)
export const KING = (theme: Theme) => mixHex(moss(theme), theme.ink, 0.28)
export const CROWN = gold

const smooth = (u: number) => {
  const v = Math.max(0, Math.min(1, u))
  return v * v * (3 - 2 * v)
}
const ease = (kind: Move['ease'], u: number) => (kind === 'in' ? u * u : kind === 'out' ? 1 - (1 - u) * (1 - u) : kind === 'inout' ? smooth(u) : u)

/** A troll's centre at beat `b`, where its body sits on the line `y` is the floor it stands on. */
export function where(t: Troll, b: number): { x: number; y: number; move: Move; u: number } {
  const moves = t.moves
  if (b <= moves[0].b0) return { x: moves[0].from[0], y: moves[0].from[1], move: moves[0], u: 0 }
  let m = moves[moves.length - 1]
  for (const candidate of moves) {
    if (b < candidate.b1) {
      m = candidate
      break
    }
  }
  if (b < m.b0) {
    // Between moves: resting where the last one ended.
    const prev = moves[moves.indexOf(m) - 1]
    return { x: prev.to[0], y: prev.to[1], move: prev, u: 1 }
  }
  const u = Math.max(0, Math.min(1, (b - m.b0) / (m.b1 - m.b0)))
  const s = m.arc ? u : ease(m.ease, u)
  const lift = m.arc ? m.arc * 4 * s * (1 - s) : 0
  return { x: m.from[0] + (m.to[0] - m.from[0]) * s, y: m.from[1] + (m.to[1] - m.from[1]) * s - lift, move: m, u }
}

/** Beats since the troll last landed (the end of a hop), and how far off the next take-off is. */
function landing(t: Troll, b: number): { since: number; until: number } {
  let since = Infinity
  let until = Infinity
  for (const m of t.moves) {
    if (!m.arc) continue
    if (m.b1 <= b) since = Math.min(since, b - m.b1)
    if (m.b0 >= b) until = Math.min(until, m.b0 - b)
  }
  for (const at of t.thumps ?? []) if (at <= b) since = Math.min(since, b - at)
  return { since, until }
}

/** A hop from `from` to `to`, `b0` to `b1`, peaking `arc` over its middle. */
export const hop = (b0: number, b1: number, from: Pt, to: Pt, arc: number): Move => ({ b0, b1, from, to, arc })
/** A run on the flat. */
export const roll = (b0: number, b1: number, from: Pt, to: Pt, how?: Move['ease']): Move => ({ b0, b1, from, to, arc: 0, ease: how })

/**
 * A troll bounding along a floor, landing every `every` beats from `b0` to
 * `b1`, a cell a beat, from x0. Its centre sits `r` over the floor line of row `row`.
 */
export function bounds(b0: number, b1: number, x0: number, row: number, r: number, every: number, arc: number): Move[] {
  const y = row + FLOOR - r
  const out: Move[] = []
  for (let b = b0; b + every <= b1 + 1e-9; b += every) {
    const x = x0 + (b - b0)
    out.push(hop(b, b + every, [x, y], [x + every, y], arc))
  }
  return out
}

/** The centre height of a troll of radius `r` standing on row `row`'s floor. */
export const stand = (row: number, r: number): number => row + FLOOR - r

/**
 * Draw every troll at show time `t`, looking at `peer`. Dust and squash on
 * each landing; a crouch just before each take-off; sleeping trolls breathe
 * once every two beats, so the whole sleeping mountain breathes in time.
 */
export function drawCast(p: p5, k: number, ink: string, weight: number, theme: Theme, trolls: Troll[], t: number, peer: Pt): void {
  const b = beatAt(t)
  for (const tr of trolls) {
    const at = where(tr, b)
    const { since, until } = landing(tr, b)
    const asleep = b < tr.wake
    const breath = asleep ? 0.5 + 0.5 * Math.sin(((b - tr.wake) / 2) * Math.PI * 2) : 0
    // The thump of a landing, and the crouch before a take-off.
    const thump = since < 0.6 ? Math.exp(-since * 6) * 0.32 : 0
    const crouch = until < 0.25 ? (1 - until / 0.25) * 0.12 : 0
    const squash = Math.max(thump, crouch) + breath * 0.05
    const waking = asleep ? 0 : Math.min(1, (b - tr.wake) / 0.35)
    // Wide eyes on waking, then an ordinary glare.
    const open = asleep ? 0 : 0.75 + 0.25 * Math.exp(-(b - tr.wake) * 1.5) * (1 + (waking < 1 ? 0 : 0))
    const heading = at.move.to[0] - at.move.from[0]
    const eye = tr.eye?.(b) ?? null
    const target: Pt = eye ?? peer
    const look: [number, number] = [target[0] - at.x, target[1] - at.y]
    const facing: 1 | -1 = asleep ? 1 : Math.abs(heading) > 0.01 && at.u < 1 ? (heading > 0 ? 1 : -1) : look[0] >= 0 ? 1 : -1
    const stoned = tr.stone !== undefined ? Math.max(0, Math.min(1, (b - tr.stone) / 1.2)) : 0
    const r = tr.r
    // Dust at the feet on a landing: two puffs thrown out sideways.
    if (since < 0.9 && !asleep && stoned < 0.5) {
      const u = since / 0.9
      const a = p.color(theme.ink)
      a.setAlpha(150 * (1 - u))
      p.noFill()
      p.stroke(a)
      p.strokeWeight(weight * 0.8)
      const fy = (at.y + r) * k
      for (const side of [-1, 1]) {
        const dx = side * (r * 0.9 + u * r * 1.2)
        p.arc((at.x + dx) * k, fy, r * 0.5 * k * (0.6 + u), r * 0.36 * k * (0.6 + u), Math.PI, Math.PI * 2)
      }
    }
    troll(p, k, ink, weight, theme, {
      x: at.x,
      y: at.y,
      r,
      facing,
      open: stoned > 0.5 ? 0 : open,
      look,
      stone: stoned,
      crown: tr.crown ? CROWN(theme) : undefined,
      fill: tr.fill(theme),
      squash,
      brow: asleep ? 0 : tr.crown ? 0.9 : 0.5,
    })
  }
}
