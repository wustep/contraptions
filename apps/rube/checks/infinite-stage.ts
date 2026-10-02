/** The redesign changes construction and framing, while the scored performance stays opus55's. */
import type { Performance } from '../src/shows/registry'
import { performance as baseline } from '../src/shows/versions/interstellar/liftoff'
import { STRIKES as BASE_HITS } from '../src/shows/versions/interstellar/liftoff/hits'
import { STRIKES } from '../src/shows/versions/interstellar/astra-stage/hits'
import { CARDS as BASE_CARDS, LAST_GONE as BASE_LAST_GONE } from '../src/shows/versions/interstellar/liftoff/credits'
import { CARDS, LAST_GONE } from '../src/shows/versions/interstellar/astra-stage/credits'
import type { LiftoffShow } from '../src/shows/versions/interstellar/astra-stage/show'
import { ACT2, UNDOCK } from '../src/shows/versions/interstellar/astra-stage/music'
import { SWITCH } from '../src/shows/versions/interstellar/astra-stage/score'

type Check = (name: string, ok: boolean, detail?: string) => void

export function checkInfiniteStage(perf: Performance, check: Check): void {
  const show = perf.show as LiftoffShow
  check('infinite stage: exact opus55 strike ownership and recording cues',
    JSON.stringify(STRIKES) === JSON.stringify(BASE_HITS) && JSON.stringify(perf.soundtrack) === JSON.stringify(baseline.soundtrack))
  check('infinite stage: full 291-second show and unchanged credit intervals',
    perf.duration === baseline.duration && LAST_GONE === BASE_LAST_GONE &&
    CARDS.every((c, i) => c.at === BASE_CARDS[i].at && c.hold === BASE_CARDS[i].hold))

  const times = new Set<number>([0, perf.duration])
  for (let i = 0; i <= perf.duration * 60; i++) times.add(i / 60)
  for (const group of Object.values(STRIKES)) {
    for (const strikes of (Object.values(group) as number[][])) for (const t of strikes) for (const d of [-0.001, 0, 0.001]) times.add(t + d)
  }
  for (const seam of [SWITCH, ACT2, UNDOCK]) for (const d of [-0.001, 0, 0.001]) times.add(seam + d)
  const pose = (p: ReturnType<typeof show.at>) => JSON.stringify({
    x: p.x, y: p.y, hidden: p.hidden, scale: p.scale, stretch: p.stretch, angle: p.angle,
    ball: p.ball, balls: p.balls, world: p.universe.index, holder: p.placed.piece.name, start: p.placed.start,
  })
  let mismatch: number | undefined
  let badRoll: number | undefined
  for (const t of times) {
    if (pose(show.at(t)) !== pose(baseline.show.at(t))) { mismatch = t; break }
    if (perf.camera?.(t).angle !== baseline.camera?.(t).angle) { badRoll = t; break }
  }
  check('infinite stage: unchanged cast, young Murph, routes, hidden intervals and handoffs at 60 Hz and every strike',
    mismatch === undefined, `first mismatch at ${mismatch}`)
  check('infinite stage: preserves the station reunion roll', badRoll === undefined, `first mismatch at ${badRoll}`)
  check('infinite stage: cloud, room and Ranger changes remain on the same clock; no portals',
    show.indexAt(SWITCH - 0.001) === 0 && show.indexAt(SWITCH) === 1 &&
    show.indexAt(ACT2) === 2 && show.indexAt(UNDOCK) === 3 &&
    [0, 1, 2, 3].every(i => show.universe(i).pieces.every(p => p.piece.name !== 'portal')) &&
    [...times].every(t => perf.cuts?.(t) === false))
  const cam = perf.camera!(135.5)
  check('infinite stage: complete station wheel has vertical breathing room', cam.cells >= 50)
  for (const t of [UNDOCK, ACT2]) {
    const a = perf.camera!(t - 0.0001), b = perf.camera!(t)
    check(`infinite stage: camera match at ${t.toFixed(3)} seconds`,
      Math.hypot(a.x - b.x, a.y - b.y) < 0.01 && Math.abs(a.cells - b.cells) < 0.01)
  }
}
