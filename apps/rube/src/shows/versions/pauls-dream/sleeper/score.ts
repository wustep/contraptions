import type { Theme } from '../../../../../../../src/core/themes'
import type { Placed } from '../../../../plan'
import type { World } from '../../../../worlds'
import type { Blend, Framing, TitleCard } from '../../../registry'
import { lens, type Shot } from './camera'
import { DEAD, PAUL, PRINCIPALS, type Who } from './cast'
import { creditsAt } from './credits'
import { frame, seenAt, setScope } from './film'
import { mix, smooth } from './paint'
import { Run } from './path'
import { END } from './plan'
import type { Scene } from './scene'
import { SCENES } from './scenes'
import { SleeperShow, type Actor } from './show'

/**
 * The whole show: the scenes laid end to end on the music, the principals assembled from what each scene gives them,
 * the camera from every scene's shots, the dissolves and the visions, and the frame's bars over everything.
 */

export const DURATION = END

const THEME: Theme = {
  name: 'sleeper',
  label: 'Sleeper',
  bg: '#141614',
  ink: '#101210',
  colors: [PAUL.color],
  weight: 1,
}

const WORLD: World = {
  name: 'sleeper',
  label: 'Caladan and Arrakis',
  note: 'The sea of Caladan and the sand of Arrakis.',
  themes: [THEME],
  backdrops: ['plain'],
  pieces: [],
  tastes: { arranged: {} },
}

export interface Composed {
  show: SleeperShow
  camera: (t: number) => Framing
  blend: (t: number) => Blend | null
  titles: (t: number) => TitleCard[]
}

/** A principal: its segments from every scene, its colour going out where a scene says it dies. */
function principal(who: Who, scenes: Scene[]): Actor | null {
  const role = PRINCIPALS[who]
  const segs = scenes.flatMap((s) => s.moves?.[who] ?? [])
  if (!segs.length) return null
  const deaths = scenes.flatMap((s) => (s.deaths?.[who] ? [s.deaths[who]!] : []))
  const death = deaths[0]
  return {
    id: role.id,
    color: role.color,
    rim: role.rim,
    size: role.size,
    run: new Run(segs, who),
    colorAt: death ? (t) => mix(role.color, DEAD, smooth(t, death[0], death[0] + death[1])) : undefined,
  }
}

export function compose(scenes: Scene[] = SCENES): Composed {
  const ordered = [...scenes].sort((a, b) => a.from - b.from)

  // The frame's bars.
  setScope(ordered.flatMap((s) => s.scope ?? []))

  // The cast: Paul is the hero; the other principals and every scene's own balls are the company.
  const hero = principal('paul', ordered) ?? { id: PAUL.id, color: PAUL.color, rim: PAUL.rim, size: 1, run: new Run([], 'paul') }
  const others = (Object.keys(PRINCIPALS) as Who[]).filter((w) => w !== 'paul').map((w) => principal(w, ordered)).filter((a): a is Actor => !!a)
  const extras = ordered.flatMap((s) => s.actors ?? [])

  // What is drawn: each scene's pieces in order, and the frame's bars over everything.
  const pieces: Placed[] = [...ordered.flatMap((s) => s.pieces), frame()]
  const show = new SleeperShow(WORLD, THEME, pieces, END, hero, [...others, ...extras])

  // The camera: every scene's shots.
  const shots: Shot[] = ordered.flatMap((s) => s.shots)
  if (!shots.some((k) => k.t <= 0)) shots.unshift({ t: 0, cells: 12, at: [0, 0] })
  const camera = lens(shots, (t) => show.where(t))
  show.cuts = shots.filter((k) => k.cut).map((k) => k.t).sort((a, b) => a - b)

  // Dissolves (the frame before the cut held, fading off) and visions (a later moment through an opening).
  const dissolves = ordered.flatMap((s) => s.dissolves ?? [])
  const dreams = ordered.flatMap((s) => s.dreams ?? [])
  const blend = (t: number): Blend | null => {
    for (const [at, dur] of dissolves) {
      if (t >= at && t < at + dur) {
        const from = at - 1e-3
        seenAt(t, from)
        return { from, a: 1 - smooth(t, at, at + dur) }
      }
    }
    for (const d of dreams) {
      if (t < d.from || t >= d.to) continue
      const a = d.a(t)
      if (a <= 0.002) continue
      const from = d.at + (t - d.from) * d.rate
      seenAt(t, from)
      const iris = d.iris?.(t) ?? undefined
      return { from, a, iris: iris ?? undefined }
    }
    seenAt(-1, -1)
    return null
  }

  return { show, camera, blend, titles: creditsAt }
}
