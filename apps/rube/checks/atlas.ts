import type { Performance } from '../src/shows/registry'
import { performance as baseline } from '../src/shows/versions/interstellar/liftoff'
import { STRIKES as originalStrikes } from '../src/shows/versions/interstellar/liftoff/hits'
import { STRIKES } from '../src/shows/versions/interstellar/astra-atlas/hits'
import { CARDS as originalCards } from '../src/shows/versions/interstellar/liftoff/credits'
import { CARDS } from '../src/shows/versions/interstellar/astra-atlas/credits'
import type { LiftoffShow } from '../src/shows/versions/interstellar/astra-atlas/show'

type Check = (name: string, ok: boolean, detail?: string) => void
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** The redesign is allowed to change the print and framing, never the score or cast. */
export function checkAtlas(perf: Performance, check: Check): void {
  const show = perf.show as LiftoffShow
  check('atlas: original 291-second duration, sound cues and strike ownership',
    perf.duration === baseline.duration && same(perf.soundtrack, baseline.soundtrack) && same(STRIKES, originalStrikes))
  check('atlas: original end-credit interval and holds',
    same(CARDS.map(({ at, hold }) => [at, hold]), originalCards.map(({ at, hold }) => [at, hold])))
  // Compare the complete canonical routes, including hidden spans and ball-state changes.
  const routes = (p: Performance, i: number) => p.show.universe(i).pieces.filter((x) => x.piece.weight === 0 && x.lane.segs.some((s) => s.from[0] !== s.to[0] || s.from[1] !== s.to[1])).map((x) => ({
    name: x.piece.name, col: x.col, row: x.row, start: x.start, span: x.span, lane: x.lane, changes: x.changes,
  }))
  check('atlas: every route, contact and transition remains the opus55 score',
    [0, 1, 2, 3].every((i) => same(routes(perf, i), routes(baseline, i))))
  let cast = true
  let finite = true
  let roll = true
  const misses: string[] = []
  const pop: string[] = []
  const inShot = (t: number, b: { x: number; y: number; scale?: number } | null) => {
    if (!b || (b.scale ?? 1) <= 0.02) return false
    const f = perf.camera!(t)
    const a = f.angle ?? 0
    const dx = b.x - f.x
    const dy = b.y - f.y
    return Math.abs(dx * Math.cos(a) - dy * Math.sin(a)) < f.cells * 8 / 9 + 0.2 &&
      Math.abs(dx * Math.sin(a) + dy * Math.cos(a)) < f.cells / 2 + 0.2
  }
  for (let n = 0; n <= 29100; n++) {
    const t = n / 100
    const a = perf.show.at(t)
    const b = baseline.show.at(t)
    cast &&= same([a.x, a.y, a.ball, a.balls, a.hidden, a.scale], [b.x, b.y, b.ball, b.balls, b.hidden, b.scale])
    const f = perf.camera!(t)
    finite &&= [f.x, f.y, f.cells, f.angle ?? 0].every(Number.isFinite) && f.cells > 0
    roll &&= f.angle === baseline.camera!(t).angle
    // Existing scale reveals and the two concealed wormhole whips intentionally leave the hero briefly.
    const reveal = [[74.9, 77.3], [103.6, 104.4], [130.2, 137.3], [235.3, 236.1]].some(([lo, hi]) => t > lo && t < hi)
    if (!reveal && !a.hidden && !inShot(t, a) && misses.length < 8) misses.push(t.toFixed(2))
    if (n > 0) for (const who of ['brand', 'murph'] as const) {
      const prior = show[who](t - 0.01)
      const now = show[who](t)
      if ((!prior && inShot(t, now)) || (!now && inShot(t - 0.01, prior))) pop.push(`${who} ${t}`)
    }
  }
  check('atlas: cast positions, hues, agency and young Murph exactly match opus55', cast)
  check('atlas: camera is finite and retains the authored station roll', finite && roll)
  check('atlas: contacts stay in the composed frame outside scored reveals', misses.length === 0, misses.join(', '))
  check('atlas: the new compositions do not introduce cast pops', pop.length === 0, pop.slice(0, 8).join(', '))
  const cut = 207.495
  // The camera is continuous at the actual stage handoff, found from the stage rather than a rounded cue.
  let seam = cut
  for (let t = 207; t < 208; t += 0.001) if (show.indexAt(t) === 3) { seam = t; break }
  const before = perf.camera!(seam - 0.002)
  const after = perf.camera!(seam + 0.002)
  check('atlas: Ranger match retains position and scale',
    Math.hypot(before.x - after.x, before.y - after.y) < 0.04 && Math.abs(before.cells - after.cells) < 0.04)
}
