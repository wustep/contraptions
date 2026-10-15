/**
 * The checks for Cornfield Chase's Opus 5.5 take beyond its score: the field and the fair the stock machine stands in
 * (`versions/cornfield-chase/music-sync/`). Called by `checks/shows.ts` for that take.
 */
import measured from '../../../scripts/shows/plans/cornfield-opus55-onsets.json'
import type { Performance } from '../src/shows/registry'
import { arrival, booth, door, fair, photo, sunset } from '../src/shows/versions/cornfield-chase/opus55-music-sync'
import { gustAt } from '../src/shows/versions/cornfield-chase/music-sync/field'
import { SHELLS } from '../src/shows/versions/cornfield-chase/music-sync/fireworks'
import { beatAt, PIANO } from '../src/shows/versions/cornfield-chase/music-sync/music'
import { spot, strengthAt } from '../src/shows/versions/cornfield-chase/music-sync/spot'

type Check = (name: string, ok: boolean, detail?: string) => void

const o = measured as unknown as { drop: { t: number }; last: { t: number }; eighths: { beat: number; t: number }[] }

export function checkCornfield(perf: Performance, check: Check): void {
  const cam = perf.camera!
  // The fair's strikes, in show time; the scenery has no span and strikes nothing.
  const struck = perf.show.universe(1).pieces.filter((p) => !['rail', 'portal'].includes(p.piece.name) && p.span > 0)
    .map((p) => fair.begin + p.start + p.lane.fire)

  // The fireworks: on the chase's measured pulse, as the machine is held to it, and only on its landmarks.
  const pulse = [o.drop.t, o.last.t, ...o.eighths.map((e) => e.t)]
  const off = SHELLS.filter((s) => !pulse.some((t) => Math.abs(t - s.t) <= 0.026))
  check('cornfield opus55: every firework bursts on the measured pulse of the chase', off.length === 0, off.map((s) => s.t.toFixed(3)).join(', '))
  check('cornfield opus55: fireworks only on the landmarks: the drop, the full organ, the bar the machine rests, the last hit',
    SHELLS.length <= 8 && SHELLS.some((s) => Math.abs(s.t - o.drop.t) < 1e-6) && SHELLS.some((s) => Math.abs(s.t - o.last.t) < 1e-6))
  const rest = beatAt(180)
  check('cornfield opus55: the shell on beat 180 fills the one downbeat the machine leaves to rest',
    SHELLS.some((s) => Math.abs(s.t - rest) < 1e-6) && !struck.some((t) => Math.abs(t - rest) < 0.3), struck.filter((t) => Math.abs(t - rest) < 0.5).map((t) => t.toFixed(3)).join(', '))

  // The corn's wind: from the piano.
  check('cornfield opus55: the corn is still before the piano\'s first note', gustAt(PIANO[0].t - 0.01, 0.5) === 0 && gustAt(0.5, 0) === 0)
  const strongest = PIANO.reduce((a, b) => (b.s > a.s ? b : a))
  check('cornfield opus55: the strongest piano note sends a full gust across the frame, left side first',
    gustAt(strongest.t + 0.14, 0) > 0.5 && gustAt(strongest.t + 0.14 + 1 / 1.5, 1) > 0.5 && gustAt(strongest.t + 0.05, 1) < gustAt(strongest.t + 0.05, 0))

  // The door: the night's, at the field's portal only.
  check('cornfield opus55: the stage\'s own iris is off for the door to the fair, and on either side of it',
    perf.cuts!(sunset.begin - 0.01) && !perf.cuts!((sunset.begin + arrival.end) / 2) && perf.cuts!(arrival.end + 0.01))

  // The follow spot: down where floors stack, gone by the photograph.
  const lit = spot(perf.show, fair, booth.begin)
  let stacked = 0
  for (let t = 66; t <= 80; t += 0.5) if (strengthAt(lit, t) > 0.6) stacked++
  check('cornfield opus55: the follow spot is down where the run doubles back on itself (66 to 80 s)', stacked === 29, `${stacked}/29`)
  let single = 0
  for (let t = 90; t <= 117; t += 0.5) if (strengthAt(lit, t) > 0) single++
  check('cornfield opus55: the follow spot is up for the drop, along the fair\'s last floor, and for the photograph',
    strengthAt(lit, o.drop.t) === 0 && single === 0 && strengthAt(lit, perf.duration) === 0, `${single} moments down after 90 s`)
  let jump = 0
  for (let t = fair.begin; t < booth.begin; t += 1 / 60) jump = Math.max(jump, Math.abs(strengthAt(lit, t + 1 / 60) - strengthAt(lit, t)))
  check('cornfield opus55: the follow spot never switches: it comes and goes over a second or more', jump < 0.04, jump.toFixed(3))

  // The photograph: the draw back.
  const close = cam(door.end)
  const end = cam(perf.duration)
  const stretch = fair.pieces.filter((p) => p.begin >= 97).flatMap((p) => p.cells)
  check('cornfield opus55: the camera holds on the photograph until the ball is through the last portal',
    Math.abs(close.cells - cam(booth.end + 1).cells) < 1e-6 && photo.from > door.end)
  check('cornfield opus55: it ends drawn back, the fair\'s last stretch whole in the frame and standing on the horizon',
    end.cells > 3 * close.cells && stretch.every(([x, y]) => Math.abs(x - end.x) + 1 < (end.cells * 8) / 9 && Math.abs(y - end.y) + 1 < end.cells / 2) &&
    Math.abs(photo.horizon(perf.duration) - (0.5 + (Math.max(...stretch.map(([, y]) => y)) + 0.5 - end.y) / end.cells)) < 0.01)
  let worst = 0
  for (let t = door.begin; t < perf.duration; t += 1 / 60) {
    const a = cam(t)
    const b = cam(t + 1 / 60)
    worst = Math.max(worst, Math.abs(Math.log(b.cells / a.cells)) * 60, (Math.hypot(b.x - a.x, b.y - a.y) / a.cells) * 60)
  }
  check('cornfield opus55: the draw back is smooth: never more than a frame\'s width a second, nor its size doubling in a second', worst < 1, worst.toFixed(3))
}
