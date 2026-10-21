import type { Theme } from '../../../../../../../src/core/themes'
import type { Box, Placed } from '../../../../plan'
import type { World } from '../../../../worlds'
import type { Blend, Framing, TitleCard } from '../../../registry'
import { CHANI, CHANI_ID, CHANI_RIM, CHANI_SIZE, PAUL, PAUL_ID, PAUL_RIM } from './cast'
import { creditsAt } from './credits'
import { lens, type Shot } from './lens'
import { hidden, Path, type Move } from './motion'
import { smooth } from './paint'
import type { Scene } from './scene'
import { SCENES } from './scenes'
import { MakerShow, type Actor } from './show'
import { END } from './timeline'

/**
 * The whole show: the scenes laid end to end on the music (`timeline.ts` says when each has the stage), Paul and Chani on
 * the paths the scenes give them, everyone else each scene brings, the drawings in their order, and the camera.
 */

export const DURATION = END

const THEME: Theme = {
  name: 'maker',
  label: 'Maker',
  bg: '#EADBC6',
  ink: '#1C130D',
  colors: [PAUL],
  weight: 1,
}

const WORLD: World = {
  name: 'arrakis',
  label: 'Arrakis',
  note: 'The deep desert, Giedi Prime\'s arena under its black sun, and the basin under the storm.',
  themes: [THEME],
  backdrops: ['plain'],
  pieces: [],
  tastes: { arranged: {} },
}

/**
 * One ball's way through the whole show from the moves the scenes give it: in the gaps between them it is off the
 * stage, waiting where it was last (or where it will next be).
 */
function pathOf(name: string, moves: Move[], size: number): Path {
  const ms = [...moves].sort((a, b) => a.t0 - b.t0)
  const out: Move[] = []
  let t = 0
  let at = ms.length ? ms[0].at(ms[0].t0) : ([0, 0] as [number, number])
  for (const m of ms) {
    if (m.t0 - t > 1e-6) out.push(hidden(at, t, m.t0))
    out.push(m)
    t = m.t1
    at = m.at(m.t1)
  }
  if (END - t > 1e-6) out.push(hidden(at, t, END))
  return new Path(out, name, size)
}

export function compose(): {
  show: MakerShow
  camera: (t: number) => Framing
  blend: (t: number) => Blend | null
  titles: (t: number) => TitleCard[]
  overview: (t: number) => Box
} {
  const paulPath = pathOf('paul', SCENES.flatMap((s) => s.paul ?? []), 1)
  const chaniPath = pathOf('chani', SCENES.flatMap((s) => s.chani ?? []), CHANI_SIZE)
  const paul: Actor = { id: PAUL_ID, color: PAUL, rim: PAUL_RIM, size: 1, path: paulPath, on: (t) => !paulPath.at(t).hidden }
  const chani: Actor = { id: CHANI_ID, color: CHANI, rim: CHANI_RIM, size: CHANI_SIZE, path: chaniPath, on: (t) => !chaniPath.at(t).hidden }
  const actors = SCENES.flatMap((s) => s.actors ?? [])

  const pieces: Placed[] = [
    ...SCENES.flatMap((s) => s.back ?? []),
    ...SCENES.flatMap((s) => s.mid ?? []),
    ...SCENES.flatMap((s) => s.front ?? []),
  ]
  const show = new MakerShow(WORLD, THEME, pieces, END, paul, [chani, ...actors])

  const shots: Shot[] = SCENES.flatMap((s) => s.shots)
  const camera = lens(shots)
  show.cameraCuts = camera.cuts

  // Dissolves: a scene may ask for one at `at`, over `dur` seconds: the frame before it held, fading off.
  const dissolves = SCENES.flatMap((s) => s.dissolves ?? [])
  const blend = (t: number): Blend | null => {
    for (const [at, dur] of dissolves) {
      if (t >= at && t < at + dur) return { from: at - 1e-3, a: 1 - smooth(t, at, at + dur) }
    }
    return null
  }

  const sceneAt = (t: number): Scene => SCENES.find((s) => t >= s.from && t < s.to) ?? SCENES[SCENES.length - 1]
  const overview = (t: number): Box => sceneAt(t).overview

  return { show, camera, blend, titles: creditsAt, overview }
}
