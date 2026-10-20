import type { Theme } from '../../../../../../../src/core/themes'
import type { Placed } from '../../../../plan'
import type { World } from '../../../../worlds'
import type { Blend, Framing, TitleCard } from '../../../registry'
import { ODYSSEUS, ODYSSEUS_ID, ODYSSEUS_RIM, MAN, MAN_RIM, MAN_SIZE, MEN_ID } from './cast'
import { director, type Key } from './camera'
import { creditsAt } from './credits'
import { region, smooth, standing } from './draw'
import { Path, ride, type Move, type Pt } from './path'
import type { Scene, ShipPart } from './scene'
import { SCENES } from './scenes'
import { NostosShow, type Actor } from './show'
import { END, HELM, MEN, SEAMS, SHIPS, seat, shipOf } from './voyage'
import { drawSeaBody, drawSeaPlane, setSeaLight, setWeather } from './world/sea'
import { drawShip, floatAt, onShip, type Pose, type ShipLook } from './world/ship'
import { drawSky, setSkyKeys, skyAt, type SkyKey } from './world/sky'
import { BASE_SKY } from './world/light'

/**
 * The whole show: the scenes laid end to end on the music (`voyage.ts` says when each has the stage), the sky and the
 * sea over all of them, the ships, the hero and his men on their paths, and the camera.
 */

export const DURATION = END

const THEME: Theme = {
  name: 'nostos',
  label: 'Nostos',
  bg: '#1B2026',
  ink: '#16191D',
  colors: [ODYSSEUS],
  weight: 1,
}

const WORLD: World = {
  name: 'odyssey',
  label: 'The Sea',
  note: 'The sea between Troy and Ithaca, its islands, and the dead.',
  themes: [THEME],
  backdrops: ['plain'],
  pieces: [],
  tastes: { arranged: {} },
}

/** A monotone cubic through [t, v] keys, flat outside them. */
export function curveOf(keys: [number, number][]): (t: number) => number {
  const ks = [...keys].sort((a, b) => a[0] - b[0])
  const n = ks.length
  if (n === 0) return () => 0
  if (n === 1) return () => ks[0][1]
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) d.push((ks[i + 1][1] - ks[i][1]) / Math.max(1e-9, ks[i + 1][0] - ks[i][0]))
  const m: number[] = [d[0], ...new Array(n - 2).fill(0), d[n - 2]]
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i])
  // The ends of a track come to rest unless a key says otherwise: the first and last slopes are the segments' own.
  return (t: number) => {
    if (t <= ks[0][0]) return ks[0][1]
    if (t >= ks[n - 1][0]) return ks[n - 1][1]
    let i = 0
    while (i + 1 < n && ks[i + 1][0] <= t) i++
    const h = ks[i + 1][0] - ks[i][0]
    const u = (t - ks[i][0]) / h
    const u2 = u * u
    const u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * ks[i][1] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * ks[i + 1][1] + (u3 - u2) * h * m[i + 1]
  }
}

/** Every scene's part for ship `i`, in time order. */
const partsOf = (i: number): { scene: Scene; part: ShipPart }[] =>
  SCENES.flatMap((scene) => (scene.ships?.[i] ? [{ scene, part: scene.ships[i]! }] : []))

export interface Ship {
  pose(t: number): Pose
  look(t: number): ShipLook
  /** On the sea at `t` (not yet sunk). */
  afloat(t: number): boolean
}

function buildShip(i: number): Ship {
  const parts = partsOf(i)
  const gone = Math.min(Infinity, ...parts.map(({ part }) => part.gone ?? Infinity))
  const owner = (t: number) => parts.find(({ scene, part }) => (part.pose || part.x) && t >= scene.from && t < scene.to)
  const lookOwner = (t: number) => parts.find(({ scene, part }) => part.look && t >= scene.from && t < scene.to)
  // Outside every window that has it (the very end), it stays where the last seam left it.
  const resting = (t: number): number => {
    let x = 0
    for (const seam of SEAMS) if (seam.t <= t && seam.ships[i]) x = seam.ships[i]![0]
    return x
  }
  return {
    pose: (t) => {
      const own = owner(t)
      if (own?.part.pose) return own.part.pose(t)
      if (own?.part.x) return floatAt(own.part.x(t), t)
      return floatAt(resting(t), t)
    },
    look: (t) => ({ sail: 1, ink: '#15181C', ...(lookOwner(t)?.part.look?.(t) ?? {}) }),
    afloat: (t) => t < gone,
  }
}

/** Moves for one ball: the scenes' own, and between them a ride on its ship at its place. */
function pathFor(name: string, own: Move[], place: Pt, ship: Ship, until = END): Path {
  const sorted = [...own].sort((a, b) => a.t0 - b.t0)
  const out: Move[] = []
  let t = 0
  const rideOn = (t0: number, t1: number) => {
    if (t1 - t0 > 1e-6) out.push(ride((s) => onShip(ship.pose(s), place), t0, t1, (s) => ship.pose(s).a))
  }
  for (const m of sorted) {
    rideOn(t, m.t0)
    out.push(m)
    t = m.t1
  }
  rideOn(t, until)
  return new Path(out, name)
}

export function compose(): { show: NostosShow; camera: (t: number) => Framing; blend: (t: number) => Blend | null; titles: (t: number) => TitleCard[] } {
  // The light: the base plan, with what each scene asks for inside its window laid over it.
  const skyKeys: SkyKey[] = [...BASE_SKY]
  for (const s of SCENES) for (const k of s.sky ?? []) {
    const at = skyKeys.findIndex((o) => Math.abs(o.t - k.t) < 1e-6)
    if (at >= 0) skyKeys[at] = k
    else skyKeys.push(k)
  }
  setSkyKeys(skyKeys)
  setSeaLight((t) => skyAt(t))
  const weatherKeys: [number, number][] = [[0, 0.12], ...SEAMS.map((s): [number, number] => [s.t, s.weather]), ...SCENES.flatMap((s) => s.weather ?? [])]
  const weather = curveOf(weatherKeys)
  setWeather((t) => Math.max(0, Math.min(1, weather(t))))

  const ships = Array.from({ length: SHIPS }, (_, i) => buildShip(i))

  // The hero and his men.
  const heroMoves = SCENES.flatMap((s) => s.hero ?? [])
  const hero: Actor = { id: ODYSSEUS_ID, color: ODYSSEUS, rim: ODYSSEUS_RIM, size: 1, path: pathFor('odysseus', heroMoves, HELM, ships[0]) }
  const men: Actor[] = []
  for (let m = 0; m < MEN; m++) {
    const own = SCENES.flatMap((s) => s.men?.[m] ?? [])
    const death = Math.min(END, ...SCENES.map((s) => s.deaths?.[m] ?? Infinity))
    const ship = ships[shipOf(m)]
    men.push({
      id: MEN_ID + m,
      color: MAN,
      rim: MAN_RIM,
      size: MAN_SIZE,
      path: pathFor(`man ${m}`, own, seat(m), ship, death),
      on: (t) => t < death,
    })
  }
  const actors = SCENES.flatMap((s) => s.actors ?? [])

  // What is drawn, in order: the sky, the sea going away, each scene's back, the ships, each scene's middle, (the
  // balls), the water cut open over them, and each scene's front.
  const everywhere = region(-200, -120, 1100, 80, 4)
  const sky = standing('sky', everywhere, END, (g) => drawSky(g))
  const seaPlane = standing('sea-plane', everywhere, END, (g) => drawSeaPlane(g, -400, 1400))
  const fleet = standing('fleet', everywhere, END, (g) => {
    for (let i = SHIPS - 1; i >= 0; i--) {
      if (!ships[i].afloat(g.t)) continue
      const pose = ships[i].pose(g.t)
      if (pose.x < g.view.x0 - 4 || pose.x > g.view.x1 + 4) continue
      drawShip(g, pose, ships[i].look(g.t))
    }
  })
  const seaBody = standing('sea-body', everywhere, END, null, (g) => drawSeaBody(g, -400, 1400, () => 60))
  const pieces: Placed[] = [
    sky,
    seaPlane,
    ...SCENES.flatMap((s) => s.back ?? []),
    fleet,
    ...SCENES.flatMap((s) => s.mid ?? []),
    seaBody,
    ...SCENES.flatMap((s) => s.front ?? []),
  ]

  const show = new NostosShow(WORLD, THEME, pieces, END, hero, [...men, ...actors])

  // The camera: every scene's keys, and at each seam the seam's own.
  const keys: Key[] = [...SCENES.flatMap((s) => s.shots), ...SEAMS.map((s): Key => ({ t: s.t, cells: s.cam.cells, off: s.cam.off, at: s.cam.at }))]
  if (!keys.some((k) => k.t <= 0)) keys.unshift({ t: 0, cells: 10, off: [0.6, -1.4] })
  const camera = director(keys, (t) => show.where(t))

  // Dissolves: a scene may ask for one at a time `at`, over `dur` seconds: the frame before it held, fading off.
  const dissolves = SCENES.flatMap((s) => s.dissolves ?? [])
  const blend = (t: number): Blend | null => {
    for (const [at, dur] of dissolves) {
      if (t >= at && t < at + dur) return { from: at - 1e-3, a: 1 - smooth(t, at, at + dur) }
    }
    return null
  }

  return { show, camera, blend, titles: creditsAt }
}
