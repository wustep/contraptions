import type { Theme } from '../../../../../../../src/core/themes'
import type { Box, Placed } from '../../../../plan'
import type { World } from '../../../../worlds'
import type { Blend, Framing, TitleCard } from '../../../registry'
import { CHIHIRO, CHIHIRO_ID, CHIHIRO_RIM, HAKU, HAKU_ID, HAKU_RIM, HAKU_SIZE, NOFACE, NOFACE_ID, NOFACE_RIM, NOFACE_SIZE } from './cast'
import { director, type Director, type Key } from './camera'
import { creditsAt, END } from './credits'
import { light } from './light'
import { region, smooth, standing } from './paint'
import { Path, type Move } from './path'
import { SCENES } from './scenes'
import { aloft } from './scenes/sky'
import { KohakuShow, type Actor } from './show'
import { FIELD, drawClouds, drawSky } from './world/sky'

/**
 * The whole show: the scenes laid end to end on the music, the sky over all of them, the cast on their paths, and the
 * camera.
 */

export const DURATION = END

const THEME: Theme = {
  name: 'kohaku',
  label: 'Kohaku',
  bg: '#4E8FD0',
  ink: '#1C1A22',
  colors: [CHIHIRO],
  weight: 1,
}

const WORLD: World = {
  name: 'spirit-town',
  label: 'The Spirit Town',
  note: 'The tunnel and the meadow, the river of stones, the town, the bathhouse, and the sea the rain makes.',
  themes: [THEME],
  backdrops: ['plain'],
  pieces: [],
  tastes: { arranged: {} },
}

/** Moves for one ball from every scene, in time order. */
const movesOf = (pick: (s: (typeof SCENES)[number]) => Move[] | undefined): Move[] => SCENES.flatMap((s) => pick(s) ?? [])

export interface Composed {
  show: KohakuShow
  camera: Director
  blend: (t: number) => Blend | null
  titles: (t: number) => TitleCard[]
  overview: (t: number) => Box
}

export function compose(): Composed {
  const hero: Actor = { id: CHIHIRO_ID, color: CHIHIRO, rim: CHIHIRO_RIM, size: 1, path: new Path(movesOf((s) => s.hero), 'chihiro') }
  const spans = (pick: 'haku' | 'noface') => SCENES.flatMap((s) => s[pick]?.on ?? (s[pick] ? [[s.from, s.to] as [number, number]] : []))
  const hakuMoves = movesOf((s) => s.haku?.moves)
  const nofaceMoves = movesOf((s) => s.noface?.moves)
  const hakuOn = spans('haku')
  const nofaceOn = spans('noface')
  const cast: Actor[] = []
  if (hakuMoves.length) {
    cast.push({
      id: HAKU_ID,
      color: HAKU,
      rim: HAKU_RIM,
      size: HAKU_SIZE,
      path: new Path(hakuMoves, 'haku'),
      on: (t) => hakuOn.some(([a, b]) => t >= a && t < b),
    })
  }
  if (nofaceMoves.length) {
    cast.push({
      id: NOFACE_ID,
      color: NOFACE,
      rim: NOFACE_RIM,
      size: NOFACE_SIZE,
      mark: null,
      path: new Path(nofaceMoves, 'noface'),
      on: (t) => nofaceOn.some(([a, b]) => t >= a && t < b),
    })
  }
  cast.push(...SCENES.flatMap((s) => s.actors ?? []))

  // What is drawn, in order: the sky, every scene's back, every scene's set, (the balls), every scene's front.
  const sky = standing('sky', region(-60, -80, 320, 30, 6), END, (g) => {
    const L = light(g.t)
    drawSky(g, L)
    // The day's cloud, everywhere but over the cloud floor (the flight), dimmer at night.
    const a = (1 - 0.8 * L.night) * (aloft(g.t) ? 1 - smooth(-g.view.cy, 13.5, 16.5) : 1)
    drawClouds(g, L, [6, -2.6], FIELD, 0.06, a)
  })
  const pieces: Placed[] = [sky, ...SCENES.flatMap((s) => s.back ?? []), ...SCENES.flatMap((s) => s.mid ?? []), ...SCENES.flatMap((s) => s.front ?? [])]

  const show = new KohakuShow(WORLD, THEME, pieces, END, hero, cast)
  show.looks = SCENES.flatMap((s) => s.looks ?? [])

  const keys: Key[] = SCENES.flatMap((s) => s.shots)
  const camera = director(keys, (t) => show.where(t))
  show.cameraCuts = camera.cuts

  // Dissolves: the frame before the cut held, fading off over the new place.
  const dissolves = SCENES.flatMap((s) => s.dissolves ?? [])
  show.quiet = [...dissolves.map(([a, d]): [number, number] => [a, a + d]), ...camera.cuts.map((c): [number, number] => [c, c])]
  const blend = (t: number): Blend | null => {
    for (const [at, dur] of dissolves) {
      if (t >= at && t < at + dur) return { from: at - 1e-3, a: 1 - smooth(t, at, at + dur) }
    }
    return null
  }

  const overview = (t: number): Box => {
    const s = SCENES.find((sc) => t >= sc.from && t < sc.to) ?? SCENES[SCENES.length - 1]
    return s.overview ?? { x0: -10, y0: -12, x1: 80, y1: 6 }
  }

  return { show, camera, blend, titles: creditsAt, overview }
}

export type { Framing }
