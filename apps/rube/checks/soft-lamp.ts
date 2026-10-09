/**
 * The checks for Soft Lamp (`versions/soft-lamp/opus55.show.ts`), run by `check:shows`: half an hour of Lofi Girl's
 * "Best of lofi hip hop 2021" round a small machine on a study desk, a lap a track.
 */
import type { Performance, Version } from '../src/shows/registry'
import { sectionOf } from '../src/shows/registry'
import plan from '../../../scripts/shows/plans/soft-lamp-onsets.json'
import { DURATION, show } from '../src/shows/versions/soft-lamp/lamp'
import { AIMS, catInViewAt } from '../src/shows/versions/soft-lamp/lamp/camera'
import { BOOKS, CONTACT, CUP, ON_SILL, PROPS, R, SILL } from '../src/shows/versions/soft-lamp/lamp/desk'
import { MUSIC_END, TRACKS, YOUTUBE, barTime, kickAt } from '../src/shows/versions/soft-lamp/lamp/music'
import { LANDINGS, LAPS, LEGS, NODS, ballAt, hollowY, legAt } from '../src/shows/versions/soft-lamp/lamp/route'
import { CARDS, TITLES_OK, titlesAt } from '../src/shows/versions/soft-lamp/lamp/titles'
import { blurOf, layerOf, lensOf } from '../src/shows/versions/soft-lamp/lamp/lens'
import { MOMENTS } from '../src/shows/versions/soft-lamp/lamp/sky'
import { rainAt } from '../src/shows/versions/soft-lamp/lamp/world'

type Check = (name: string, ok: boolean, detail?: string) => void
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

export function checkSoftLamp(perf: Performance, version: Version, check: Check): void {
  check('soft lamp: in the picker it is Soft Lamp, Opus 5.5, with no note, on the Ambient shelf, with a line and a still',
    version.title === 'Soft Lamp' && version.label === 'Opus 5.5' && version.note === undefined && sectionOf('soft-lamp') === 'Ambient' &&
    !!version.about && typeof version.still === 'number' && version.still > 0 && version.still < DURATION)

  // The music: the label's own upload, from its first second, stopped as the twelfth track's fade reaches the floor.
  const cue = perf.soundtrack?.youtube?.[0]
  check('soft lamp: Lofi Girl\'s Best of lofi hip hop 2021 from the video\'s zero, on YouTube only, credited, until the twelfth track ends',
    !perf.soundtrack?.src && perf.soundtrack?.youtube?.length === 1 && cue?.id === YOUTUBE && YOUTUBE === 'n61ULEU7CO0' &&
    (cue.at ?? 0) === 0 && (cue.from ?? 0) === 0 && near(cue.until ?? 0, MUSIC_END) && (perf.soundtrack?.offset ?? 0) === 0 &&
    ['Lofi Girl', 'Best of lofi hip hop 2021'].every((w) => perf.soundtrack?.credit?.includes(w)) &&
    perf.soundtrack?.href === `https://www.youtube.com/watch?v=${YOUTUBE}`)
  check('soft lamp: half an hour (28 to 32 minutes), and the show holds on past the music for the lamp and the last card',
    DURATION >= 28 * 60 && DURATION <= 32 * 60 && perf.duration === DURATION && DURATION > MUSIC_END + 4 && perf.loop !== true)

  // The measured radio: twelve tracks, one after the other, each on its own steady grid.
  const titles = TRACKS.map((t) => t.title).join('|')
  check('soft lamp: the first twelve tracks of the mix, in its order, one after the other',
    TRACKS.length === 12 && titles === 'morning moon|Lavender|Destination Unknown|Overgrown|Magical Connection|Blooming Dales|Exhale|Stargazing|Breathtaking|takeoff|Daydream|Passing By' &&
    TRACKS.every((t, i) => t.from < t.to && (i === 0 || t.from >= TRACKS[i - 1].to - 0.05)), titles)
  check('soft lamp: every track on a whole-number tempo (the mix\'s own grid), its bars four beats apart',
    TRACKS.every((t) => Math.abs(t.bpm - Math.round(t.bpm)) < 0.03 && near(t.period, 60 / t.bpm, 1e-5) &&
      t.bars.every((b, i) => i === 0 || near(b - t.bars[i - 1], 4 * t.period, 1e-3))))
  check('soft lamp: every track has an intro with no drums, a groove of at least sixteen bars, and an outro',
    TRACKS.every((t) => t.entry >= 3 && t.runs.reduce((n, r) => n + r.to - r.from, 0) >= 16 && t.exit < t.bars.length && barTime(t, t.exit) < t.to))
  check('soft lamp: the plan measures loudness and the held sound across the whole half hour',
    plan.rms.length === plan.held.length && plan.rms.length * plan.step >= MUSIC_END - 1)

  // The ball: one continuous way round, never out of the room.
  let jump = 0
  let jumpAt = 0
  let prev = ballAt(0)
  for (let t = 0.002; t <= DURATION; t += 0.002) {
    const b = ballAt(t)
    const d = Math.hypot(b.x - prev.x, b.y - prev.y)
    if (d > jump) { jump = d; jumpAt = t }
    prev = b
  }
  check('soft lamp: the ball never jumps (no more than 0.012 cells in two milliseconds, the lobs included)', jump <= 0.012, `${jump.toFixed(4)} at ${jumpAt.toFixed(3)} s`)
  check('soft lamp: every leg starts where the one before it ends',
    LEGS.every((l, i) => i === 0 || Math.hypot(l.at(l.from).x - LEGS[i - 1].at(l.from).x, l.at(l.from).y - LEGS[i - 1].at(l.from).y) < 0.01))

  // The lap, on the music.
  check('soft lamp: a lap a track, and the last stays in the cup', LAPS.length === 12 && LAPS.slice(0, -1).every((l) => l.lob !== null) && LAPS[11].lob === null)
  const offDrop = LAPS.filter((l) => {
    const tr = TRACKS[l.track]
    const b = ballAt(l.drop)
    return !near(l.drop, barTime(tr, tr.entry), 1e-6) || Math.abs(b.y - (BOOKS[0].top - R)) > 0.01 || b.x < BOOKS[0].x0 || b.x > BOOKS[0].x1 ||
      Math.abs(ballAt(l.tip).x - SILL.x1) > 0.01 || Math.abs(ballAt(l.tip).y - ON_SILL) > 0.01
  })
  check('soft lamp: the ball goes over the sill\'s end and lands on the top book as the drums come in, on the downbeat', offDrop.length === 0, offDrop.map((l) => l.track).join(', '))
  const steps = LANDINGS.filter((l) => l.on === 'book' || (l.on === 'cup' && LAPS.some((p) => near(p.cup, l.t))))
  const offBeat = steps.filter((l) => {
    const tr = TRACKS[LAPS.find((p) => l.t >= p.drop - 0.01 && l.t <= p.cup + 0.01)?.track ?? -1]
    if (!tr) return true
    const beat = (l.t - tr.bars[0]) / tr.period
    return Math.abs(beat - Math.round(beat)) > 1e-4 || Math.round(beat) % 2 !== 0
  })
  check('soft lamp: every step down the stair, and the step into the cup, lands on a strong beat (one or three)', steps.length === 12 * 4 && offBeat.length === 0, `${steps.length} steps, ${offBeat.length} off`)
  const offLob = LAPS.filter((l) => {
    if (l.lob === null || l.land === null) return false
    const tr = TRACKS[l.track]
    return !near(l.lob, barTime(tr, tr.exit - 1, 2)) || !near(l.land, barTime(tr, tr.exit)) || Math.abs(ballAt(l.land).y - ON_SILL) > 0.01 ||
      legAt(l.lob + 0.01).kind !== 'lob'
  })
  check('soft lamp: the cup lobs the ball on the last bar of drums, beat three, and it lands on the sill as the drums leave', offLob.length === 0, offLob.map((l) => l.track).join(', '))
  const offPot = LAPS.filter((l) => l.bounce !== null && Math.abs(ballAt(l.bounce).x - CONTACT) > 0.01)
  check('soft lamp: it rolls into the pot and comes back off it, then walks the sill to its end', offPot.length === 0 &&
    LAPS.every((l, i) => i === 0 || (LAPS[i - 1].bounce ?? 0) < l.tip))
  let walkBack = 0
  for (const leg of LEGS.filter((l) => l.kind === 'sill')) {
    const going = leg.at(leg.to - 0.01).x - leg.at(leg.from).x
    for (let t = leg.from; t < leg.to - 0.05; t += 0.05) {
      const d = leg.at(t + 0.05).x - leg.at(t).x
      if (Math.sign(d) !== Math.sign(going) && Math.abs(d) > 1e-6) walkBack++
    }
  }
  check('soft lamp: along the sill it never turns back (it only turns at the pot)', walkBack === 0, `${walkBack}`)
  const stillOnSill = LEGS.filter((l) => l.kind === 'sill' && l.to - l.from > 5).filter((l) => {
    for (let t = l.from; t < l.to - 0.5; t += 0.5) if (Math.abs(l.at(t + 0.5).x - l.at(t).x) < 0.01) return true
    return false
  })
  check('soft lamp: on the sill the ball is never quite still (at least 3 mm a second)', stillOnSill.length === 0, stillOnSill.map((l) => l.from.toFixed(1)).join(', '))

  // In the cup: nods on the kick, only in the groove.
  const badNods = NODS.filter((n) => {
    const tr = TRACKS.find((t) => n.t >= t.from && n.t <= t.to)
    if (!tr) return true
    const beat = (n.t - tr.bars[0]) / tr.period
    const bar = Math.floor(Math.round(beat) / 4)
    const lap = LAPS[tr.n]
    return Math.abs(beat - Math.round(beat)) > 1e-4 || Math.round(beat) % 2 !== 0 || kickAt(tr, n.t) < 0.45 ||
      !tr.runs.some((r) => bar >= r.from && bar < r.to) || n.t < lap.cup || (lap.lob !== null && n.t >= lap.lob)
  })
  check('soft lamp: the ball nods only on a kick struck on one or three, in the groove, while it sits in the cup', NODS.length > 400 && badNods.length === 0, `${NODS.length} nods, ${badNods.length} wrong`)
  let outOfCup = 0
  for (const leg of LEGS.filter((l) => l.kind === 'cup')) {
    const to = Math.min(leg.to, DURATION)
    for (let t = leg.from + 1.5; t < to; t += 0.1) {
      const b = ballAt(t)
      if (Math.abs(b.x - CUP.x) > 0.2 || b.y > hollowY(b.x - CUP.x) + 1e-6) outOfCup++
    }
  }
  check('soft lamp: sitting in the cup it stays in the hollow, never below the cushion', outOfCup === 0, `${outOfCup}`)
  const end = ballAt(DURATION)
  check('soft lamp: at the end the ball is still, in the cup', Math.hypot(ballAt(DURATION - 0.5).x - end.x, ballAt(DURATION - 0.5).y - end.y) < 0.002 && Math.abs(end.x - CUP.x) < 0.05)

  // The camera: a slow rig, never a snap, and every frame it holds is composed: nothing sliced at its edges.
  let pan = 0
  let panAt = 0
  let acc = 0
  let accAt = 0
  let pv = [0, 0, 0]
  let pc = perf.camera!(0)
  for (let t = 1 / 60; t <= DURATION; t += 1 / 60) {
    const c = perf.camera!(t)
    const v = [(c.x - pc.x) * 60 / c.cells, (c.y - pc.y) * 60 / c.cells, Math.log(c.cells / pc.cells) * 60]
    const s = Math.hypot(...v)
    const a = Math.hypot(v[0] - pv[0], v[1] - pv[1], v[2] - pv[2]) * 60
    if (s > pan) { pan = s; panAt = t }
    if (t > 0.1 && a > acc) { acc = a; accAt = t }
    pv = v
    pc = c
  }
  check('soft lamp: the camera never moves faster than half a frame a second, nor gathers faster than half a frame a second a second',
    pan < 0.5 && acc < 0.5, `speed ${pan.toFixed(3)} at ${panAt.toFixed(1)} s, acceleration ${acc.toFixed(3)} at ${accAt.toFixed(1)} s`)
  // Whole means clear of every edge by a tenth of a cell, so nothing sits tangent to the frame either.
  const sliced: string[] = []
  const M = 0.1
  for (const a of AIMS.filter((a) => a.held)) {
    const hw = (a.cells * 16) / 9 / 2
    const hh = a.cells / 2
    for (const [name, [x0, y0, x1, y1]] of Object.entries(PROPS)) {
      const touches = x1 > a.x - hw && x0 < a.x + hw && y1 > a.y - hh && y0 < a.y + hh
      const whole = x0 >= a.x - hw + M && x1 <= a.x + hw - M && y0 >= a.y - hh + M && y1 <= a.y + hh + 0.5
      if (touches && !whole) sliced.push(`${name} at ${a.t.toFixed(0)} s`)
    }
  }
  check('soft lamp: every frame the camera holds shows each thing whole, clear of its edges, or not at all', sliced.length === 0, [...new Set(sliced)].slice(0, 6).join(', '))
  // The stage's Zoom is the same frame half again closer (FOLLOW_ZOOM): the ball is in it too, all but a moment.
  let lost = 0
  let seen = 0
  for (let t = 0; t < DURATION; t += 0.1) {
    const c = perf.camera!(t)
    const b = ballAt(t)
    const hh = c.cells / 1.5 / 2
    const hw = (hh * 16) / 9
    seen++
    if (Math.abs(b.x - c.x) > hw - R || Math.abs(b.y - c.y) > hh - R) lost++
  }
  check('soft lamp: the ball is in the frame all the time, and in Zoom\'s closer frame 99.5% of it', lost / seen < 0.005, `${((lost / seen) * 100).toFixed(2)}% out`)

  // Through the glass: what moves there at its depth, sharp in the frames that look at it and soft at the desk; and the
  // window's moments, each played to a frame that holds it in focus.
  const sharp = [0, 0.21].map((x) => blurOf({ x, y: -1.9, size: 4.9 }))
  const close = blurOf({ x: 1.75, y: -0.57, size: 2.45 })
  const still = layerOf({ x: 0.21, y: -1.9, size: 4.9 }, 0.55)
  check('soft lamp: the city sharp in the window\'s look and the room\'s, soft at the cup, and every layer where it was drawn in the window\'s look',
    sharp.every((b) => b < 0.005) && close > 0.07 && still.s === 1 && near(still.ox, 0) && near(still.oy, 0), `soft ${close.toFixed(3)}`)
  const m = MOMENTS
  const inFocus = (t: number) => blurOf(lensOf(perf.camera!(t))) <= 0.02
  check('soft lamp: lightning three times in the heaviest rain, the cat in view; the shooting stars and the neighbour\'s crossings in focus',
    m.lightning.length === 3 && m.lightning.every((t) => rainAt(t) >= 0.68 && catInViewAt(t)) &&
    m.shooting.length >= 2 && m.shooting.every(inFocus) && m.crossings.length >= 6 && m.crossings.every(([t]) => inFocus(t)) &&
    m.crossings.every(([t]) => m.lightning.every((f) => t < f - 10 || t > f + 10)), JSON.stringify(m))

  // The words.
  const said = CARDS.map((c) => [c.role ?? '', ...c.names, ...(c.notes ?? [])].join(' ')).join(' | ')
  check('soft lamp: the title over the first intro, each track named as it begins, the credits over the last outro, set by the page',
    TITLES_OK(DURATION) && perf.titles === titlesAt && titlesAt(0).length === 0 && titlesAt(DURATION).length === 0 &&
    TRACKS.every((t) => said.includes(t.title) && said.includes(t.artists)) &&
    ['Soft Lamp', 'Directed by', 'Stephen Wu', 'Claude Opus 5.5', 'Lofi Girl', 'p5.js'].every((w) => said.includes(w)), said)
  check('soft lamp: one room and no cut', perf.cuts?.(0) === false && perf.cuts?.(900) === false && perf.show === show)
}
