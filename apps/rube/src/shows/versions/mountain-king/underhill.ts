import recording from '../../../../../../docs/promo/mountain-king-musopen.ogg'
import { clamp, easeInOutSine } from '../../../../../../src/core/ease'
import { underhillWorlds } from '../../../playground/pieces/underhill'
import { Show, type ShowBall, type ShowPoint } from '../../../show'
import { registerWorld, type World } from '../../../worlds'
import type { Framing, Performance } from '../../registry'
import { timeMap, type Knot } from '../../timemap'
import analysis from '../../../../../../scripts/show-plans/mountain-king-onsets.json'

/**
 * An authored journey through three Playground worlds. The native machine
 * stays deterministic and seekable; one monotone clock map brings its strikes
 * onto notes in the recording. The side voices are echoes of its own path,
 * born on the two orchestral entrances, and never affect the planner.
 */
for (const world of underhillWorlds) registerWorld(world)

export const PHRASES = analysis.phrases
export const ONSETS = analysis.onsets
export const VISITS = 17
const SEED = 'underhill-orchestra-1'

export class UnderhillShow extends Show {
  private clock: ((t: number) => number) | null = null
  private stop = Infinity

  constructor() { super(SEED) }

  override worldAt(i: number): World { return underhillWorlds[Math.min(2, Math.floor(i / 6))] }

  setClock(clock: (t: number) => number, stop: number): void { this.clock = clock; this.stop = stop }

  override at(t: number): ShowPoint {
    const native = Math.min(this.stop, this.clock ? this.clock(Math.max(0, t)) : Math.max(0, t))
    const here = super.at(native)
    if (!this.clock) return here
    const ahead = super.at(Math.min(this.stop, native + 0.035))
    const lead: ShowBall = {
      id: here.ball.id, x: here.x, y: here.y,
      vx: (ahead.x - here.x) / 0.035, vy: (ahead.y - here.y) / 0.035,
      color: here.ball.color, ghost: here.ball.ghost,
      scale: here.hidden ? 0 : here.scale, stretch: here.stretch, angle: here.angle,
    }
    const balls = [lead]
    // One echo joins at the first crescendo; a second answers at the tutti.
    // They follow the actual machine a measured interval behind, so they
    // disappear at a portal instead of floating across a scene cut.
    const voices = t >= PHRASES[2] ? 2 : t >= PHRASES[1] ? 1 : 0
    for (let i = 0; i < voices; i++) {
      const delayed = super.at(Math.max(0, native - (i + 1) * 0.65))
      if (delayed.universe !== here.universe || delayed.hidden) continue
      const next = super.at(Math.min(this.stop, native - (i + 1) * 0.65 + 0.035))
      const entering = easeInOutSine(clamp((t - PHRASES[i + 1]) / 1.3))
      balls.push({
        id: 1000 + i, x: delayed.x, y: delayed.y + (i ? 0.34 : -0.34),
        vx: (next.x - delayed.x) / 0.035, vy: (next.y - delayed.y) / 0.035,
        color: here.universe.theme.colors[i ? 1 : 2], ghost: true,
        scale: delayed.scale * entering * (i ? 0.78 : 0.88), angle: delayed.angle,
      })
    }
    return { ...here, balls }
  }
}

const show = new UnderhillShow()
const finale = show.universe(VISITS - 1)
const lastBeat = finale.pieces.at(-2)!
const stopNative = show.begin(VISITS - 1) + lastBeat.start + lastBeat.span - 0.04

/** The cave ends when the pulse gathers; the works open on the tutti. */
export const phraseKnots: Knot[] = [
  { at: PHRASES[0], native: 0 },
  { at: PHRASES[1], native: show.begin(6) },
  { at: PHRASES[2], native: show.begin(12) },
  { at: PHRASES[3], native: stopNative },
]

/** Fire moments, excluding the carrying rail and the two portals. */
export const fires = Array.from({ length: VISITS }, (_, i) => show.universe(i).pieces
  .filter((p) => p.piece.name !== 'rail' && p.piece.name !== 'portal')
  .map((p) => ({ native: show.begin(i) + p.start + p.lane.fire, piece: p.piece.name, visit: i }))).flat()

/**
 * Place a machine strike on the closest measured note when the adjustment is
 * small enough to keep the mechanism's motion legible. Phrase knots are
 * mandatory. Each chosen note becomes an exact clock knot, rather than a
 * decorative pulse painted on top of an unrelated animation.
 */
export function alignFires(): { knots: Knot[]; aligned: { native: number; at: number; piece: string; visit: number }[] } {
  const knots: Knot[] = [phraseKnots[0]]
  const aligned: { native: number; at: number; piece: string; visit: number }[] = []
  for (let phase = 0; phase < phraseKnots.length - 1; phase++) {
    const first = phraseKnots[phase]
    const end = phraseKnots[phase + 1]
    const events = fires.filter((f) => f.native > first.native + 0.15 && f.native < end.native - 0.15)
    for (const fire of events) {
      const predicted = first.at + ((fire.native - first.native) / (end.native - first.native)) * (end.at - first.at)
      const previous = knots[knots.length - 1]
      const choices = ONSETS.filter((at) => at > previous.at + 0.26 && at < end.at - 0.26 && Math.abs(at - predicted) < (phase === 0 ? 0.24 : 0.17))
        .sort((a, b) => Math.abs(a - predicted) - Math.abs(b - predicted))
      const at = choices.find((candidate) => {
        const before = (fire.native - previous.native) / (candidate - previous.at)
        const after = (end.native - fire.native) / (end.at - candidate)
        return before >= 0.62 && before <= 1.55 && after >= 0.62 && after <= 1.55
      })
      if (at === undefined) continue
      knots.push({ at, native: fire.native })
      aligned.push({ ...fire, at })
    }
    knots.push(end)
  }
  return { knots, aligned }
}

export const score = alignFires()
export const clock = timeMap(score.knots)
show.setClock(clock, stopNative)

const finalPoint = show.at(PHRASES[3])
const finalFrame: Framing = { x: finalPoint.x, y: finalPoint.y, cells: 8.2 }

function camera(t: number): Framing {
  const here = show.at(t)
  const ahead = show.at(Math.min(PHRASES[3], t + 0.15))
  const follow: Framing = {
    x: here.x * 0.72 + (ahead.universe === here.universe ? ahead.x : here.x) * 0.28,
    y: here.y * 0.72 + (ahead.universe === here.universe ? ahead.y : here.y) * 0.28,
    cells: 5.5,
  }
  const crescendo = clamp((t - PHRASES[1]) / (PHRASES[2] - PHRASES[1]))
  const wide = t < PHRASES[1] ? 1.16 : 1.16 - crescendo * 0.22
  const accent = score.aligned.reduce((nearest, hit) => Math.min(nearest, Math.abs(hit.at - t)), Infinity)
  const pulse = Math.exp(-accent * 13) * 0.045
  const outro = easeInOutSine(clamp((t - 147.8) / 3.2))
  return {
    x: follow.x + (finalFrame.x - follow.x) * outro,
    y: follow.y + (finalFrame.y - follow.y) * outro,
    cells: follow.cells * wide * (1 - pulse) * (1 - outro) + finalFrame.cells * outro,
  }
}

export const performance: Performance = {
  show, duration: analysis.duration, camera,
  // Hold the last struck machine through the orchestral decay.
  cuts: (t) => t < PHRASES[3],
  soundtrack: {
    src: recording, offset: 0,
    credit: 'Edvard Grieg · Czech National Symphony Orchestra for Musopen · public domain',
    href: 'https://commons.wikimedia.org/wiki/File:Musopen_-_In_the_Hall_Of_The_Mountain_King.ogg',
  },
}
