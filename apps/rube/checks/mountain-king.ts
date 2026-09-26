/**
 * The checks for Mountain King (`versions/mountain-king/opus55.show.ts`), run by `check:shows`: Grieg's "In the
 * Hall of the Mountain King", one ball through the Dovre mountain, every strike on the recording.
 *
 * The picker, the soundtrack, one place, one path, strikes on the music, the seams' contract, the Woman in Green's
 * continuity, the credits; and what the built parts keep: every phrase of the theme struck, the coda's chords
 * struck, Peer in the frame all the way (under Zoom too), every drop landing in the frame, and Peer at rest on the
 * hillside at the end.
 */
import type { Performance, Version } from '../src/shows/registry'
import type { ShowBall } from '../src/show'
import onsetsFile from '../../../scripts/shows/plans/mountain-king-onsets.json'
import { show as mountainShow } from '../src/shows/versions/mountain-king/dovre'
import { ORDER } from '../src/shows/versions/mountain-king/dovre/score'
import { STRIKES } from '../src/shows/versions/mountain-king/dovre/hits'
import { CODA_SHOT, PLAN, SEAM_SHOT, WOMAN_LEAD } from '../src/shows/versions/mountain-king/dovre/seams'
import { CARDS, CREDITS_OK, DURATION, creditsAt } from '../src/shows/versions/mountain-king/dovre/credits'
import { BEATS, CODA, CODA_CHORDS, LAST1, LAST2, P, RECORDING, THEME_START, TUNE_END, beatAt, eighth } from '../src/shows/versions/mountain-king/dovre/music'
import { REST } from '../src/shows/versions/mountain-king/dovre/mountain'

type Check = (name: string, ok: boolean, detail?: string) => void
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

export function checkMountainKing(perf: Performance, version: Version, check: Check): void {
  const show = mountainShow
  const cam = perf.camera!
  const data = onsetsFile as unknown as { duration: number; onsets: { t: number; s: number }[]; beats: unknown[] }

  check('mountain king: in the picker it is Mountain King, Opus 5.5, with no note and no byline',
    version.title === 'Mountain King' && version.label === 'Opus 5.5' && version.note === undefined && !('director' in version))
  check('mountain king: the whole recording from zero, credited to Grieg and the Czech National Symphony Orchestra for Musopen, public domain, with its upload',
    perf.show === show && near(perf.duration, DURATION) && (perf.soundtrack?.offset ?? 0) === 0 &&
    !!perf.soundtrack?.src?.includes('grieg-mountain-king-musopen') && near(RECORDING, data.duration) && DURATION > RECORDING + 10 &&
    ['Edvard Grieg', 'In the Hall of the Mountain King', 'Czech National Symphony Orchestra', 'Musopen', 'public domain'].every((w) => perf.soundtrack?.credit?.includes(w)) &&
    perf.soundtrack?.href === 'https://www.youtube.com/watch?v=k8HCJS4FflY' &&
    perf.soundtrack?.youtube?.length === 1 && perf.soundtrack.youtube[0].id === 'k8HCJS4FflY')
  check('mountain king: the beat is followed quarter by quarter from the theme (289 beats, 4.36 to 133.97), eighteen phrases',
    BEATS.length === 289 && near(BEATS[0], THEME_START, 1e-3) && near(TUNE_END, BEATS[288]) && P.length === 18 && P.every((t, i) => near(t, BEATS[16 * i])) &&
    CODA > TUNE_END && LAST1 > CODA && LAST2 > LAST1)

  // One place, one take.
  check('mountain king: one mountain, no portal, no cut drawn', show.universe(0).world.name === 'dovre' && show.indexAt(DURATION) === 0 &&
    show.universe(0).pieces.every((p) => p.piece.name !== 'portal') && [0, 40, 80, 120, 140, 170].every((t) => perf.cuts?.(t) === false))
  check('mountain king: the parts in order', show.universe(0).pieces.filter((p) => ORDER.includes(p.piece.name as (typeof ORDER)[number])).map((p) => p.piece.name).join() === ORDER.join())

  // One thread, one continuous path: never a jump.
  let jump = 0
  let at = 0
  let prev = show.where(0)
  for (let t = 0.001; t <= perf.duration; t += 0.001) {
    const here = show.where(t)
    const d = Math.hypot(here[0] - prev[0], here[1] - prev[1])
    if (d > jump) { jump = d; at = t }
    prev = here
  }
  check('mountain king: Peer never jumps (no more than 0.04 cells a millisecond)', jump <= 0.04, `${jump.toFixed(3)} at ${at.toFixed(3)} s`)
  let hidden = 0
  let longest = 0
  let longAt = 0
  for (let t = 0; t <= perf.duration; t += 0.01) {
    const here = show.at(t)
    hidden = here.hidden || here.scale <= 0.02 ? hidden + 0.01 : 0
    if (hidden > longest) { longest = hidden; longAt = t }
  }
  check('mountain king: Peer is never hidden for more than 2 s', longest <= 2.0, `${longest.toFixed(2)} s at ${longAt.toFixed(2)}`)

  // Every strike lands on the music: in the tune, an eighth of the measured grid (±30 ms) or a measured onset (±35
  // ms); before the theme and in the coda, a measured onset (±35 ms).
  const marks = data.onsets.filter((o) => o.s >= 0.5).map((o) => o.t)
  const onMark = (t: number) => marks.some((m) => Math.abs(m - t) <= 0.035)
  const onGrid = (t: number) => {
    if (t < BEATS[0] - 0.03 || t > TUNE_END + 0.03) return false
    const j = Math.round(beatAt(t) * 2)
    return [j - 1, j, j + 1].some((e) => e >= 0 && e <= 2 * (BEATS.length - 1) && Math.abs(eighth(e) - t) <= 0.03)
  }
  const off: string[] = []
  let count = 0
  for (const [group, parts] of Object.entries(STRIKES) as [string, Record<string, number[]>][]) {
    for (const [name, list] of Object.entries(parts)) {
      for (const t of list) {
        count++
        const ok = group === 'tune' ? onGrid(t) || onMark(t) : onMark(t)
        if (!ok) off.push(`${name} ${t.toFixed(3)}`)
      }
      const sorted = list.every((t, i) => i === 0 || t > list[i - 1])
      if (!sorted) off.push(`${name}: not sorted`)
    }
  }
  check('mountain king: every strike lands on the music', off.length === 0, `${count} strikes; off: ${off.slice(0, 12).join(', ')}`)
  const all: number[] = Object.values(STRIKES).flatMap((g: Record<string, number[]>) => Object.values(g).flat())
  check('mountain king: the coda\'s first chord and the two last chords are struck', [CODA, LAST1, LAST2].every((c) => all.some((t) => Math.abs(t - c) <= 0.03)))
  check('mountain king: every seam is struck (a phrase\'s first note: the part handed the ball lands on it)',
    [PLAN.deep, PLAN.court, PLAN.wake, PLAN.mine, PLAN.drum, PLAN.gears, PLAN.runaway].every((pl) => all.some((t) => Math.abs(t - pl.begin) <= 0.03)) && all.some((t) => Math.abs(t - CODA) <= 0.03))

  const struck = (t: number, eps = 0.03) => all.some((s) => Math.abs(s - t) <= eps)
  const bare = P.map((t, i) => [i, t] as const).filter(([, t]) => !struck(t))
  check('mountain king: every playing of the theme is struck on its first note (eighteen phrases)', bare.length === 0, bare.map(([i, t]) => `${i} at ${t.toFixed(2)}`).join(', '))
  // A pickup (a chord with the next within 0.3 s) may go by; every other chord of the coda brings something down.
  const chords = CODA_CHORDS.map((c) => c.t)
  const loose = chords.filter((t, i) => !struck(t, 0.035) && !(i + 1 < chords.length && chords[i + 1] - t < 0.3))
  check('mountain king: the coda\'s chords are struck (the collapse, on the chords; a pickup may go by)', loose.length === 0 && chords.length >= 20, loose.map((t) => t.toFixed(2)).join(', '))

  // Peer is in the frame from the first frame to the last, under Zoom (1.5 times closer) too.
  const outs: number[] = []
  for (let t = 0; t <= perf.duration; t += 0.02) {
    const b = show.at(t)
    if (b.hidden || b.scale <= 0.02) continue
    const f = cam(t)
    const cells = f.cells / 1.5
    if (Math.abs(b.x - f.x) > (cells * 16) / 9 / 2 - 0.13 || Math.abs(b.y - f.y) > cells / 2 - 0.13) outs.push(t)
  }
  check('mountain king: Peer is in the frame all the way, under Zoom too', outs.length === 0, outs.slice(0, 6).map((t) => t.toFixed(2)).join(', '))

  // The seams' contract (`seams.ts`): the camera on SEAM_SHOT's framing at every builder's seam, and at a drop the
  // ball falling straight down onto the next part's entry.
  // The coda's first chord (runaway → fall) is the one wide seam: the machine coming apart over him (CODA_SHOT).
  const shotAt = (pl: (typeof PLAN)[keyof typeof PLAN]) => (pl.name === 'runaway' ? CODA_SHOT.cells : SEAM_SHOT.cells)
  const badCam = Object.values(PLAN).filter((pl) => Math.abs(cam(pl.end).cells - shotAt(pl)) > 0.01).map((pl) => pl.end.toFixed(2))
  check('mountain king: the camera is on the seam framing (6 cells, following) at every builder\'s seam, wide on the coda\'s', badCam.length === 0, badCam.join(', '))
  const badDrop: string[] = []
  for (const pl of Object.values(PLAN)) {
    if (pl.out !== 'drop') continue
    for (let t = pl.end - 0.25; t < pl.end - 0.005; t += 0.01) {
      const a = show.where(t)
      const b = show.where(t + 0.005)
      if (Math.abs(b[0] - a[0]) / 0.005 > 0.05 || b[1] - a[1] <= 0) { badDrop.push(`${pl.name} ${t.toFixed(2)}`); break }
    }
  }
  check('mountain king: at every drop the ball falls straight down for its last quarter second', badDrop.length === 0, badDrop.join(', '))
  const lowDrop = Object.values(PLAN).filter((pl) => pl.out === 'drop').filter((pl) => {
    const f = cam(pl.end)
    const dy = show.where(pl.end)[1] - f.y
    // The coda's wide seam: low in the frame, still well inside it under Zoom.
    return dy < 0 || dy > (pl.name === 'runaway' ? f.cells / 1.5 / 2 - 0.6 : 1.0)
  })
  check('mountain king: every drop lands a little under the middle of the frame (not at its foot)', lowDrop.length === 0, lowDrop.map((pl) => pl.name).join(', '))
  const end = show.where(perf.duration)
  const still = show.where(160)
  check('mountain king: at the end Peer lies still in the hollow on the east shoulder, at sunrise',
    Math.hypot(end[0] - REST[0], end[1] - REST[1]) < 0.01 && Math.hypot(end[0] - still[0], end[1] - still[1]) < 0.001)

  // The Woman in Green: she never jumps where she can be seen, comes and goes only out of shot, rests WOMAN_LEAD
  // ahead of Peer at the rest seams she is at, and is gone before the chase goes under the hall.
  const inShot = (t: number, b: { x: number; y: number; scale?: number } | null) => {
    if (!b || (b.scale ?? 1) <= 0.02) return false
    const f = cam(t)
    return Math.abs(b.x - f.x) < (f.cells * 16) / 9 / 2 + 0.2 && Math.abs(b.y - f.y) < f.cells / 2 + 0.2
  }
  let gJump = 0
  let gAt = 0
  const pops: string[] = []
  let gPrev: ShowBall | null = show.woman(0)
  for (let t = 0.001; t <= perf.duration; t += 0.001) {
    const g = show.woman(t)
    if (g && gPrev) {
      const d = Math.hypot(g.x - gPrev.x, g.y - gPrev.y)
      if (d > gJump) { gJump = d; gAt = t }
    }
    if (!gPrev && inShot(t, g)) pops.push(`in at ${t.toFixed(3)}`)
    else if (gPrev && !g && inShot(t - 0.001, gPrev)) pops.push(`out at ${t.toFixed(3)}`)
    gPrev = g
  }
  check('mountain king: the Woman in Green never jumps where she can be seen (no more than 0.04 cells a millisecond)', gJump <= 0.04, `${gJump.toFixed(3)} at ${gAt.toFixed(3)} s`)
  check('mountain king: the Woman in Green comes and goes only out of shot', pops.length === 0, pops.slice(0, 8).join(', '))
  const lead = [PLAN.gate.end, PLAN.deep.end].map((t) => {
    const w = show.woman(t)
    const b = show.where(t)
    return w ? Math.hypot(w.x - (b[0] + WOMAN_LEAD), w.y - b[1]) : Infinity
  })
  check('mountain king: at the gate\'s and the tunnels\' ends she rests just ahead of him', lead.every((d) => d <= 0.15), lead.map((d) => d.toFixed(2)).join(', '))
  check('mountain king: she brings him in (with him at the gate, in the tunnels and the hall) and is gone before the chase goes under the hall',
    [2, 10, 30, 45].every((t) => !!show.woman(t)) && [P[8] + 0.5, 90, 110, 130, 140, 160].every((t) => !show.woman(t)))
  const crowd = [5, 30, 50, 60, 80, 120, 150].map((t) => show.at(t).balls ?? [])
  check('mountain king: every ball on the stage is someone, once', crowd.every((b) => new Set(b.map((x) => x.id)).size === b.length && b.length <= 2))

  // The end credits: words the page sets (the canvas sets none), after the last chord, over the dawn.
  const said = CARDS.map((c) => [c.role ?? '', ...c.names.flat(), ...(c.notes ?? [])].join(' ')).join(' | ')
  check('mountain king: end credits after the last chord, set by the page: directed by Claude Opus 5.5, the cast, Ibsen, the music honestly, p5.js',
    CREDITS_OK && perf.titles === creditsAt && creditsAt(CARDS[0].at - 0.05).length === 0 && creditsAt(perf.duration).length === 0 &&
    CARDS[0].role === 'Directed by' && CARDS[0].names.join() === 'Claude Opus 5.5' && !/Stephen Wu/.test(said) &&
    ['Peer Gynt', 'The Woman in Green', 'The Mountain King', 'Henrik Ibsen', 'Edvard Grieg', 'In the Hall of the Mountain King', 'Czech National Symphony Orchestra', 'Musopen', 'public domain', 'p5.js'].every((w) => said.includes(w)) &&
    !/tech demo/i.test(said), said)
}
