import type { Theme } from '../../../../../../src/core/themes'
import { ROLL, definePiece, rankBy, type BallState, type Piece, type PieceCtx, type Placement, type Pt, type Seg } from '../../../parts'

/**
 * The troll mountain keeps time.
 *
 * Every piece here is written in beats, not seconds. The ball comes in on a
 * beat, rolling one cell a beat, and leaves on a beat at the same pace; in
 * between, everything the piece does to it (the knock, the sneeze, the
 * stamp coming down) lands on a whole beat. Played on its own in the
 * Playground, a beat is `BEAT`, which makes a cell a beat Machine's own
 * roll, so a troll piece sits in a map beside the portal like any other.
 * Played in a Show, the music says how long a beat is, and the same piece
 * plays at that tempo: slower and floatier at a march, snappier as the
 * music runs away with itself. Geometry never changes with the tempo; only
 * the clock does.
 *
 * So a piece keeps `beat` in its state, builds its lane from it
 * (`plan(variant, beat)`), and draws from `c.t / s.beat`: beats since the
 * ball came in. `check:playground` holds every piece here to it: the lane
 * lasts a whole number of beats, fires on a beat, comes in and goes out at
 * a cell a beat, and scales with the beat and nothing else.
 */

/** Seconds a beat lasts when a piece plays on its own: one cell a beat is then Machine's roll. */
export const BEAT = 1 / ROLL

/** Cells a beat on the flat: the pace into and out of every piece. */
export const STRIDE = 1

/** What every troll piece keeps in its state. */
export interface Timed {
  /** Seconds a beat lasts, for this placement. */
  beat: number
  color: string
}

/** What a piece is told when it is planned at a tempo. */
export interface TempoCtx {
  color: string
  theme: Theme
  /** The ball as it arrives. */
  ball: BallState
}

/** How a piece keeps time, for whoever places it at a tempo of their own. */
export interface Tempo<S extends Timed = Timed, V = unknown> {
  /** Every variant the piece can take. */
  variants: readonly V[]
  /** Beats from the ball coming in to it going out, for variant `v`. */
  beats(v: V): number
  /** The beats, counted from entry, on which the piece strikes. The first is the lane's `fire`. */
  hits(v: V): number[]
  /** The placement for variant `v` at `beat` seconds a beat. Pure: the same arguments give the same placement. */
  plan(v: V, beat: number, ctx: TempoCtx): Placement<S>
}

export type TimedPiece<S extends Timed = Timed, V = unknown> = Piece<S> & { tempo: Tempo<S, V> }

export interface TimedSpec<S extends Timed, V> extends Omit<Piece<S>, 'place'>, Tempo<S, V> {
  /** How much the Playground favours a variant when it has the room for several. Even, left out. */
  rank?: (v: V) => number
}

/**
 * A piece that keeps time. Give it its variants and a `plan` at any beat;
 * the Playground's `place` is written for you: it tries the variants in a
 * weighted order at `BEAT` and takes the first that fits.
 */
export function timed<S extends Timed, V>(spec: TimedSpec<S, V>): TimedPiece<S, V> {
  const { variants, rank, beats, hits, plan, ...rest } = spec
  const piece = definePiece<S>({
    ...rest,
    place: ({ rng, color, theme, ball, fits }) => {
      for (const v of rankBy(rng, variants, rank ?? (() => 1))) {
        const placement = plan(v, BEAT, { color, theme, ball })
        if (fits(placement.cells, placement.exit.at)) return placement
      }
      return null
    },
  })
  return Object.assign(piece, { tempo: { variants, beats, hits, plan } })
}

/** Whether a piece keeps time. */
export const isTimed = (piece: Piece<any>): piece is TimedPiece<any, any> => !!(piece as { tempo?: unknown }).tempo

/* ------------------------------------------------------------------ lanes, in beats */

const len = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1])

/** A roll at a cell a beat. */
export const stride = (from: Pt, to: Pt, beat: number): Seg => ({ from, to, dur: (len(from, to) / STRIDE) * beat })

/** A straight run lasting `n` beats, eased or not. */
export const run = (from: Pt, to: Pt, n: number, beat: number, ease?: Seg['ease']): Seg => ({ from, to, dur: n * beat, ease })

/**
 * A straight run lasting `n` beats whose pace changes evenly from `v0` to `v1`, in cells a beat.
 * The mean of the two must be the distance over `n`; use `rampTo` to be told the other end.
 */
export const ramped = (from: Pt, to: Pt, n: number, beat: number, v0: number, v1: number): Seg => ({ from, to, dur: n * beat, ramp: [v0 / beat, v1 / beat] })

/** The pace, in cells a beat, a run of `n` beats over `from`→`to` must end on if it starts at `v0`. */
export const rampTo = (from: Pt, to: Pt, n: number, v0: number): number => (2 * len(from, to)) / n - v0

/** Standing still for `n` beats. */
export const hold = (at: Pt, n: number, beat: number, extra: Partial<Seg> = {}): Seg => ({ from: at, to: at, dur: n * beat, ...extra })

/** A flight of `n` beats on a parabola peaking `arc` cells over the chord's middle. */
export const hop = (from: Pt, to: Pt, n: number, beat: number, arc: number, extra: Partial<Seg> = {}): Seg => ({ from, to, dur: n * beat, arc, ...extra })

/**
 * The ball carried by something that moves, sampled from `at(b)` (b in beats
 * from entry) between `b0` and `b1` as `steps` straight segments. The lane
 * and the drawing then come from the one motion.
 */
export function carried(at: (b: number) => Pt, b0: number, b1: number, steps: number, beat: number): Seg[] {
  const out: Seg[] = []
  const db = (b1 - b0) / steps
  for (let i = 0; i < steps; i++) out.push({ from: at(b0 + i * db), to: at(b0 + (i + 1) * db), dur: db * beat })
  return out
}

/* ------------------------------------------------------------------ drawing, in beats */

/** Beats since the ball came in. Negative before. */
export const beatsIn = (c: PieceCtx, s: Timed): number => c.t / s.beat

/** Beats since the piece fired. Negative before. */
export const beatsSince = (c: PieceCtx, s: Timed): number => c.since / s.beat

/** 0 → 1 over beats [a, b], clamped. */
export const span = (b: number, a0: number, a1: number): number => Math.max(0, Math.min(1, (b - a0) / (a1 - a0)))

/** A blow's shape at beat `at`: 0 before, a sharp 1 on the beat, dying away over `decay` beats. */
export const struck = (b: number, at: number, decay = 0.6): number => (b < at ? 0 : Math.exp(-(b - at) / Math.max(0.05, decay) * 3))

/** Ringing after a blow at beat `at`: a damped wobble in [-1, 1], `freq` swings a beat. */
export const ring = (b: number, at: number, freq = 2, decay = 1.2): number => (b < at ? 0 : Math.sin((b - at) * freq * Math.PI * 2) * Math.exp(-(b - at) / decay * 2.5))

/** Anticipation: 0 until `lead` beats before `at`, easing up to 1 on the beat. */
export const windup = (b: number, at: number, lead = 0.5): number => {
  const u = Math.max(0, Math.min(1, (b - (at - lead)) / lead))
  return u * u * (3 - 2 * u)
}
