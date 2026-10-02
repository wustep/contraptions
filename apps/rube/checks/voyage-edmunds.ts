import { performance as baseline } from '../src/shows/versions/interstellar/liftoff'
import { performance as redesign } from '../src/shows/versions/interstellar/edmunds'
import { STRIKES as originalStrikes } from '../src/shows/versions/interstellar/liftoff/hits'
import { STRIKES } from '../src/shows/versions/interstellar/edmunds/hits'
import { CARDS as originalCards } from '../src/shows/versions/interstellar/liftoff/credits'
import { CARDS } from '../src/shows/versions/interstellar/edmunds/credits'
import { CAMP_MEET } from '../src/shows/versions/interstellar/edmunds/act2/edmunds'
import { cue, MIX_END, PEAK, FINAL } from '../src/shows/versions/interstellar/edmunds/music'
import type { LiftoffShow } from '../src/shows/versions/interstellar/edmunds/show'

/** The restaging may move scenery and camera. Its musical causality and inherited cast remain locked. */
export function checkVoyageEdmunds(check: (name: string, ok: boolean, detail?: string) => void): void {
  const show = redesign.show as LiftoffShow
  const old = baseline.show as LiftoffShow
  check('Edmunds: every strike retains its baseline mechanism and exact time', JSON.stringify(STRIKES) === JSON.stringify(originalStrikes))
  check('Edmunds: 291 seconds, original soundtrack and audio endpoint', redesign.duration === 291 && MIX_END === 262.741 && JSON.stringify(redesign.soundtrack) === JSON.stringify(baseline.soundtrack))
  check('Edmunds: credits retain every interval', JSON.stringify(CARDS.map(({ at, hold }) => [at, hold])) === JSON.stringify(originalCards.map(({ at, hold }) => [at, hold])))
  const drift: string[] = []
  for (let frame = 0; frame <= 291 * 60; frame++) {
    const t = frame / 60
    const a = show.at(t), b = old.at(t)
    if (a.x !== b.x || a.y !== b.y || a.hidden !== b.hidden || JSON.stringify(a.ball) !== JSON.stringify(b.ball) || a.placed.piece.name !== b.placed.piece.name || show.indexAt(t) !== old.indexAt(t)) drift.push(`route ${t}`)
    // All young Murph and station performances are identical. Brand's camp approach is shortened spatially.
    if (JSON.stringify(show.murph(t)) !== JSON.stringify(old.murph(t))) drift.push(`Murph ${t}`)
    if (t < cue(212) && JSON.stringify(show.brand(t)) !== JSON.stringify(old.brand(t))) drift.push(`Brand ${t}`)
    const camera = redesign.camera!(t)
    if (!Number.isFinite(camera.x + camera.y + camera.cells) || camera.cells <= 0 || camera.angle !== baseline.camera!(t).angle) drift.push(`camera ${t}`)
    if (redesign.cuts?.(t)) drift.push(`cut ${t}`)
    if (drift.length > 10) break
  }
  check('Edmunds: 60 Hz full-show route, world seams, cast, young Murph and station roll match opus55', drift.length === 0, drift.join(', '))
  const hero = show.at(CAMP_MEET + 1)
  const brand = show.brand(CAMP_MEET + 1)!
  const gap = Math.hypot(hero.x - brand.x, hero.y - brand.y)
  check('Edmunds: two distinct canonical-colored travelers at rest', hero.ball.color === '#F0C987' && brand.color === '#1F5E98' && gap >= 0.27 && gap <= 0.42 && !show.murph(CAMP_MEET + 1))
  check('Edmunds: touchdown, pressure plate and lamp retain scored ownership', STRIKES.cue2.edmunds.includes(PEAK) && STRIKES.cue2.edmunds.includes(FINAL) && show.holder(FINAL).piece.name === old.holder(FINAL).piece.name)
  const blue = (t: number) => show.brand(t)!
  let jump = 0
  for (let t = PEAK + 0.001; t < CAMP_MEET + 1; t += 0.01) {
    const a = blue(t - 0.001), b = blue(t)
    jump = Math.max(jump, Math.hypot(a.x - b.x, a.y - b.y))
  }
  check('Edmunds: restaged Brand approach remains continuous', jump < 0.04)
}
