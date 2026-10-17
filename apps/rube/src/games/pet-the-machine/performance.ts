import { makeRng } from '../../../../../src/core/rng'
import type { Theme } from '../../../../../src/core/themes'
import { fly, laneAt, laneTime, trace, wait, type Lane, type Piece, type Placement, type Pt, type Seg } from '../../parts'
import { frog } from '../../pieces/garden/frog'
import { snail } from '../../pieces/garden/snail'
import { toys, type Decision, type Perches, type Resident } from './model'

export const paper = '#f6f3e9'
export const ink = '#303b34'
export const theme: Theme = { name: 'pet-garden', label: 'The little garden', bg: paper, ink, colors: ['#789575', '#bd7352', '#d6ae55', '#a1a7ba', '#c9838a'], weight: 0.55 }
export const ACTOR_SCALE = 1.65

export interface Actor {
  piece: Piece<any>
  placement: Placement<any>
}
export type Cast = Record<Resident, Actor>

export async function loadCast(): Promise<Cast> {
  // Keep Playground's pieces off every other entry's static import graph; the build enforces this.
  const { mimosa } = await import('../../playground/pieces/garden/mimosa')
  const place = (piece: Piece<any>, color: string): Actor => {
    const placement = piece.place({
      rng: makeRng(`pet:${piece.name}`), theme, color, taste: { weights: {} },
      ball: { color: toys.ball.color, ghost: false, id: 0 }, earned: 0,
      fits: (_cells, exit) => piece.name !== 'frog' || (exit[0] === -1 && exit[1] === -1),
    })
    if (!placement) throw new Error(`Could not place ${piece.name}`)
    return { piece, placement }
  }
  return { snail: place(snail, '#bd7352'), frog: place(frog, '#789575'), fern: place(mimosa, '#789575') }
}

export function position(id: Resident, perches: Perches): Pt {
  if (id === 'snail') return [perches === 'together' ? -2.7 : -3.55, 0.25]
  if (id === 'frog') return [perches === 'together' ? 0.3 : 0.05, 1.1]
  return [perches === 'together' ? 2.3 : 2.6, 0.05]
}
export function inGarden(id: Resident, at: Pt, perches: Perches): Pt {
  const [x, y] = position(id, perches)
  return [x + at[0] * ACTOR_SCALE, y + at[1] * ACTOR_SCALE]
}

interface Clip { resident: Resident; start: number; duration: number; clock: (t: number) => number }
export interface Cue { at: number; kind: 'offer' | 'pluck' | 'bell' | 'boop' | 'leaf' | 'land'; pitch?: number }
export interface Caption { at: number; text: string }
export interface Performance {
  decision: Decision
  lane: Lane
  duration: number
  hero: number
  clips: Clip[]
  cues: Cue[]
  captions: Caption[]
}

/** A short authored score. Stock pieces supply the path and acting; holds and handoffs supply the jokes. */
export function perform(cast: Cast, decision: Decision, names: Record<Resident, string>): Performance {
  const { resident, toy, behavior, perches } = decision
  const segs: Seg[] = []
  const clips: Clip[] = []
  const cues: Cue[] = []
  const captions: Caption[] = []
  let now = 0
  const add = (...next: Seg[]) => { segs.push(...next); now += next.reduce((n, s) => n + s.dur, 0) }
  const point = (id: Resident, time: number): Pt => {
    const at = laneAt(cast[id].placement.lane, time)
    return inGarden(id, [at.x, at.y], perches)
  }
  const caption = (text: string) => captions.push({ at: now, text })
  const start = point(resident, 0)
  add(fly([start[0] - 0.5, start[1] - 1.3], start, 0.5, 0.2))
  cues.push({ at: 0, kind: 'offer' }, { at: now, kind: 'land' })
  caption(`${names[resident]} has noticed your ${toys[toy].short}.`)

  const stock = (id: Resident, hold = 0, at = 0, speed = 1) => {
    const lane = cast[id].placement.lane
    const end = laneTime(lane)
    const duration = end / speed + hold
    const begin = now
    const clock = (t: number) => t < at / speed ? t * speed : t < at / speed + hold ? at : (t - hold) * speed
    clips.push({ resident: id, start: begin, duration, clock })
    const samples = Math.ceil(duration * 90)
    add(...trace((t) => point(id, clock(t)), 0, duration, samples).map((seg, index) => ({ ...seg, hidden: laneAt(lane, clock((index + 0.5) * duration / samples)).hidden })))
    const cueAt = begin + lane.fire / speed + (lane.fire > at ? hold : 0)
    cues.push({ at: cueAt, kind: id === 'frog' ? 'boop' : id === 'fern' ? 'leaf' : 'pluck' })
    return { begin, duration, end, heldAt: begin + at / speed }
  }

  let hero = 1.6
  if (resident === 'snail') {
    const lane = cast.snail.placement.lane
    const isHat = toy === 'pompom'
    const hold = behavior === 'snail-again' ? 2.2 : toy === 'bell' ? 1.1 : isHat ? 1.25 : 0
    const at = isHat ? lane.fire - 0.06 : lane.fire + 1.35
    const clip = stock('snail', hold, at, 0.95)
    hero = clip.heldAt + (hold ? hold * 0.5 : 0)
    captions.push({ at: clip.heldAt, text: isHat ? 'Oh. A hat. A very good hat.' : toy === 'bell' ? 'Please hold. An inspection is in progress.' : 'Your delivery is on its way. Very slowly.' })
    if (toy === 'bell') cues.push({ at: clip.heldAt + 0.2, kind: 'bell', pitch: 0.8 })
  } else if (resident === 'frog') {
    const hold = toy === 'pompom' ? 1.1 : toy === 'bell' ? 0.45 : 0.2
    const clip = stock('frog', hold, 1.2)
    hero = clip.begin + 1.2 + hold * 0.6
    captions.push({ at: clip.begin + 0.85, text: toy === 'pompom' ? 'Unexpectedly… quite comforting.' : toy === 'bell' ? 'Ahem. A small recital.' : 'A gift for me? You should have it back!' })
    if (toy === 'bell') cues.push({ at: clip.begin + 1.1, kind: 'bell' })
    if (behavior === 'frog-encore') {
      add(fly(point('frog', clip.end), point('frog', 0), 0.8, 1.9))
      caption('The audience has requested another one. The audience is Moss.')
      const encore = stock('frog', 0.18, 1.2, 1.15)
      cues.push({ at: encore.begin + 0.9, kind: 'bell', pitch: 1.25 })
      hero = encore.begin + 1.05
    }
    if (behavior === 'neighbors') {
      add(fly(point('frog', clip.end), point('snail', 0), 0.9, 1.1))
      caption(`${names.frog} has started a game of catch. ${names.snail} is considering it.`)
      const handoff = stock('snail', 1.35, cast.snail.placement.lane.fire + 1.35)
      hero = handoff.heldAt + 0.5
      add(fly(point('snail', handoff.end), point('frog', 0), 0.8, 1.0))
      caption('A return! Some friendships simply take a little longer.')
      cues.push({ at: now, kind: 'land' })
    }
  } else {
    const lane = cast.fern.placement.lane
    const isFluff = toy === 'pompom'
    const duration = isFluff ? 3.4 : toy === 'bell' ? 3.1 : 2.6
    const begin = now
    clips.push({ resident: 'fern', start: begin, duration, clock: (t) => toy === 'bell' && t > 1.5 ? t - 1.3 : t })
    if (isFluff) {
      const crown = inGarden('fern', [0.5, -0.64], perches)
      add(fly(start, crown, 0.65, 0.4))
      hero = now + 0.8
      caption(behavior === 'fern-trust' ? 'A little courage. Stay a while.' : 'This is acceptable. This can stay.')
      add(...trace((t) => [crown[0] + Math.sin(t * 2) * 0.08, crown[1] + Math.sin(t * 3) * 0.05], 0, 1.6, 100))
      const last = segs[segs.length - 1].to
      add(fly(last, point('fern', laneTime(lane)), 0.75, 0.2))
      add(wait(point('fern', laneTime(lane)), 0.4))
    } else {
      add(...trace((t) => point('fern', t), 0, laneTime(lane), 70))
      add(wait(point('fern', laneTime(lane)), duration - laneTime(lane)))
      captions.push({ at: begin + 0.9, text: toy === 'bell' ? 'A little round of applause, leaf by leaf.' : 'Just a moment. Gathering herself.' })
      hero = begin + 1.25
    }
    cues.push({ at: begin + lane.fire, kind: 'leaf' })
    if (toy === 'bell') cues.push({ at: begin + 0.5, kind: 'bell', pitch: 1.5 }, { at: begin + 1.8, kind: 'bell', pitch: 1.2 })
  }
  const end = segs[segs.length - 1].to
  const destination: Pt = [end[0] + 0.35, 2.0]
  add(fly(end, destination, 0.55, 0.22))
  cues.push({ at: now, kind: 'land' })
  add(wait(destination, 1.0))
  return { decision, lane: { segs, fire: 0.5 }, duration: now, hero, clips, cues: cues.sort((a, b) => a.at - b.at), captions: captions.sort((a, b) => a.at - b.at) }
}

/** Idle time is always negative. Recovery walks the snail home and lets the plant unfold. */
export function actorTime(performance: Performance | null, resident: Resident, time: number, idle: number): number {
  const clip = performance?.clips.filter((c) => c.resident === resident && time >= c.start).at(-1)
  if (!clip) return -20 - idle
  const local = time - clip.start
  if (local <= clip.duration) return clip.clock(local)
  const after = local - clip.duration
  if (resident === 'fern') return clip.clock(clip.duration) + after * 2.2
  if (resident === 'frog') return clip.clock(clip.duration) + after
  if (after < 0.35) return clip.clock(clip.duration) + after * 3
  if (after < 1.25) return 1.7 * (1 - (after - 0.35) / 0.9)
  return -20 - idle
}
