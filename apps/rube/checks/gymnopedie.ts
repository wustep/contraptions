/**
 * The checks for Gymnopédie (`versions/gymnopedie/opus55.show.ts`), run by `check:shows`: Satie played for the show
 * and round a small sea planet once a period, as a loop with no seam.
 */
import type { Performance, Version } from '../src/shows/registry'
import { Transport } from '../src/shows/clock'
import { show } from '../src/shows/versions/gymnopedie/orbit'
import { BASS, BREATHS, CHORDS, GRACES, MARGIN, MELODY, NOTES, PERIOD, PIECES, loudness } from '../src/shows/versions/gymnopedie/orbit/music'
import { LENGTH, STONES, TOUCHES, ballLocal, riding, squash, swell } from '../src/shows/versions/gymnopedie/orbit/path'
import { breath, cellsAt, wideAt } from '../src/shows/versions/gymnopedie/orbit/camera'
import { CADENCES, CLOSE, DAWN_GOING, SUN_GLINTS, gullFlight, PERCHED, dawnAt, leafRings, bloom, cadenceFronts, lampLight, moonAngle, raysAt, sunAngle } from '../src/shows/versions/gymnopedie/orbit/scene'
import { CARDS, TITLES_OK, titlesAt } from '../src/shows/versions/gymnopedie/orbit/titles'
import { BANK, BREAK, FIGURES, overcastAt, FIREFLY, GULLS, HEAPS, METEORS, MIST, SAILS, boatsOut, lanternAt, BOATS, auroraAt, figureAt, bowAt, coverAt, firefliesOut, layered, mistAt, rainAt, whaleAt } from '../src/shows/versions/gymnopedie/orbit/air'
import { skyAt } from '../src/shows/versions/gymnopedie/orbit/world'
import { ISLES, LIGHTHOUSE_ON, RANGE, SHORE, beamAt, lighthouseAt, windowAt } from '../src/shows/versions/gymnopedie/orbit/shore'

type Check = (name: string, ok: boolean, detail?: string) => void
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

export function checkGymnopedie(perf: Performance, version: Version, check: Check): void {
  check('gymnopedie: in the picker it is Gymnopédie, Opus 5.5, with no note and no byline',
    version.title === 'Gymnopédie' && version.label === 'Opus 5.5' && version.note === undefined && !('director' in version))

  // The music: made for the show, from public-domain scores, on CC BY samples; no film's recording anywhere near it.
  const credit = perf.soundtrack?.credit ?? ''
  check('gymnopedie: its music is Satie played for it, credited to Satie, the Mutopia engravings and the Salamander Grand (CC BY)',
    !!perf.soundtrack?.src?.includes('satie-gymnopedie') &&
    ['Erik Satie', 'public domain', 'Salamander Grand Piano', 'Alexander Holm', 'CC BY 3.0', 'Mutopia', 'CC BY-SA 4.0'].every((w) => credit.includes(w)) &&
    !/zimmer|hurwitz|interstellar|la la land|son lux|demo/i.test(credit))
  check('gymnopedie: Gymnopédie No. 1, then Gnossiennes Nos. 1 and 3, one after the other within the period',
    PIECES.map((p) => p.title).join('|') === 'Gymnopédie No. 1|Gnossienne No. 1|Gnossienne No. 3' &&
    PIECES.every((p, i) => p.from < p.last && p.last < p.end && (i === 0 || p.from > PIECES[i - 1].end)) && PIECES[2].end < PERIOD)

  // The loop.
  check('gymnopedie: a loop, and its soundtrack loops exactly its period from the show\'s zero',
    perf.loop === true && perf.duration === PERIOD && perf.soundtrack?.loop === PERIOD && perf.soundtrack?.offset === MARGIN && MARGIN >= 1)
  const t = new Transport({ duration: PERIOD, loop: true })
  check('gymnopedie: the clock goes round: past the end is the start, and a loop never ends',
    near(t.seek(PERIOD + 1.5), 1.5) && near(t.seek(-0.5), PERIOD - 0.5) && !t.ended)
  const a = show.at(0)
  const b = show.at(PERIOD - 1e-9)
  const ca = perf.camera!(0)
  const cb = perf.camera!(PERIOD - 1e-9)
  const turn = Math.round((ca.angle! - cb.angle!) / (2 * Math.PI))
  check('gymnopedie: the last moment of the period is the first: the ball, and the camera (a whole turn round)',
    Math.hypot(a.x - b.x, a.y - b.y) < 1e-4 && Math.hypot(ca.x - cb.x, ca.y - cb.y) < 1e-4 && near(ca.cells, cb.cells, 1e-4) &&
    turn === 1 && near(ca.angle! - cb.angle!, 2 * Math.PI, 1e-4))
  check('gymnopedie: a time a period on is the same time', [0.3, 111.1, 400, 633].every((s) => {
    const p = show.at(s)
    const q = show.at(s + PERIOD)
    return Math.hypot(p.x - q.x, p.y - q.y) < 1e-6
  }))

  // One ball, one continuous way round, never hidden.
  let jump = 0
  let at = 0
  let prev = show.where(-0.001)
  for (let s = 0; s <= PERIOD + 0.001; s += 0.001) {
    const here = show.where(s)
    const d = Math.hypot(here[0] - prev[0], here[1] - prev[1])
    if (d > jump) { jump = d; at = s }
    prev = here
  }
  check('gymnopedie: the ball never jumps, the seam included (no more than 0.04 cells a millisecond)', jump <= 0.04, `${jump.toFixed(4)} at ${at.toFixed(3)} s`)

  // Every strike is a real note: the ball lands on a stone exactly when its note sounds, and on nothing else.
  const melodyAt = new Set(MELODY.map((n) => n.t))
  const off = TOUCHES.filter((h) => !melodyAt.has(h.t) || h.note.r !== 'melody')
  check('gymnopedie: every landing, bounce and restrike is a melody note\'s own attack, and every melody note is one', off.length === 0 && TOUCHES.length === MELODY.length, `${TOUCHES.length} touches of ${MELODY.length} notes`)
  const late = STONES.filter((s) => {
    const land = ballLocal(s.touches[0])
    const before = ballLocal(s.touches[0] - 0.05)
    return Math.abs(land.h - riding(s, s.touches[0])) > 0.002 || Math.abs(land.h - (s.h + 0.13)) > 0.12 || !before.flying
  })
  check('gymnopedie: the ball arrives on each stone as its note is struck', late.length === 0, late.slice(0, 5).map((s) => s.index).join(', '))
  check('gymnopedie: the swell comes from the bass notes and the glints from the grace notes, nothing else',
    BASS.every((n) => n.r === 'bass') && GRACES.every((n) => n.r === 'grace') && BASS.length > 150 && GRACES.length > 50)

  // The music, answered: one job to a voice.
  const landings = TOUCHES.filter((h) => h.kind !== 'restrike').map((h) => h.t)
  const soft = landings.filter((t) => Math.max(squash(t + 0.01), squash(t + 0.02), squash(t + 0.03)) < 0.04)
  let stray = 0
  for (let t = 0; t < PERIOD; t += 0.013) {
    if (Math.abs(squash(t)) > 0.005 && !landings.some((l) => t - l >= 0 && t - l <= 0.6)) stray++
  }
  check('gymnopedie: the ball gives a little of its height on every landing and bounce, and only then',
    soft.length === 0 && stray === 0 && squash(landings[0]) === 0, `${soft.length} soft landings, ${stray} stray moments`)
  const flat = BASS.filter((b) => {
    const at = ballLocal(b.t).u
    let rise = 0
    for (let d = -2.5; d <= 2.5; d += 0.05) rise = Math.max(rise, swell(at + d, b.t + 0.6) - swell(at + d, b.t - 0.02))
    return rise < 0.03
  })
  check('gymnopedie: every bass note sends a swell out from under the ball', flat.length === 0, flat.slice(0, 5).map((b) => b.t.toFixed(2)).join(', '))
  const chordNotes = NOTES.filter((n) => n.r === 'chord')
  check('gymnopedie: the light on the water sparkles on the chords, each rolled chord heard once',
    CHORDS.length > 300 && chordNotes.every((n) => CHORDS.some((c) => n.t - c.t >= 0 && n.t - c.t < 0.08)) &&
    CHORDS.every((c, i) => i === 0 || c.t - CHORDS[i - 1].t >= 0.08), `${CHORDS.length} chords of ${chordNotes.length} notes`)
  check('gymnopedie: the camera breathes only on held melody notes, and comes round with the period',
    BREATHS.length > 40 && BREATHS.every((b) => MELODY.some((n) => n.t === b.at) && b.next - b.at >= 2) &&
    Math.abs(breath(PERIOD - 1e-6) - breath(0)) < 1e-3 && Math.abs(loudness(PERIOD - 1e-6) - loudness(0)) < 1e-3)
  let zoom = 0
  let zoomAt = 0
  for (let t = 0; t < PERIOD; t += 0.01) {
    const d = Math.abs(Math.log(cellsAt(t + 0.01) / cellsAt(t)))
    if (d > zoom) { zoom = d; zoomAt = t }
  }
  check('gymnopedie: the camera never jumps in or out (under 1% a hundredth of a second)', zoom < 0.01, `${(zoom * 100).toFixed(2)}% at ${zoomAt.toFixed(2)} s`)

  // The night: the lamps the ball lights burn, and the flowers it opens stay open, until dawn, and then they are gone.
  const lamps = STONES.filter((s) => s.piece === 1)
  const flowers = STONES.filter((s) => s.piece === 2)
  const night = (s: typeof STONES[number], f: typeof lampLight) =>
    f(s, s.touches[0] - 0.01) === 0 && f(s, s.touches[0] + 1) > 0.3 && f(s, PERIOD - 0.01) > 0.3 &&
    Math.abs(f(s, PERIOD - 1e-6) - f(s, 0)) < 1e-3 && f(s, 40) === 0
  const unlit = lamps.filter((s) => !night(s, lampLight))
  const closed = flowers.filter((s) => !night(s, bloom))
  check('gymnopedie: every lamp is dark until the ball lights it, then burns until dawn, the seam included', lamps.length > 150 && unlit.length === 0, unlit.slice(0, 5).map((s) => s.index).join(', '))
  // The dawn comes round from the sun's side, in the wide shot: the lamps facing the sun go out before the far ones, all of it while the planet is still the picture.
  const nightLights = [...lamps, ...flowers]
  // Every light is out while the planet is still most of the picture (the camera not yet gone down to the ball).
  const wideAtDawn = nightLights.every((s) => wideAt(cellsAt(dawnAt(s) + DAWN_GOING)) > 0.7)
  const order = [...lamps].sort((a, b) => dawnAt(a) - dawnAt(b))
  check('gymnopedie: the dawn puts the night out in a sweep round the planet, while the camera is out',
    wideAtDawn && dawnAt(order[0]) < dawnAt(order[order.length - 1]) - 2, `${dawnAt(order[0]).toFixed(1)}-${dawnAt(order[order.length - 1]).toFixed(1)} s`)
  check('gymnopedie: every flower opens as the ball comes, and closes at dawn', flowers.length > 150 && closed.length === 0, closed.slice(0, 5).map((s) => s.index).join(', '))

  // The air: clouds, gulls, mist and fireflies at their depths, all coming round with the period.
  const layers = [BANK, HEAPS, GULLS, MIST, FIREFLY, SAILS, SHORE, RANGE]
  const roundAgain = layers.every((l) => [0, 3.3, 17.9, 40].every((x) => {
    const a = layered(x, 0, l.f, l.span, l.wind)
    const b = layered(x, PERIOD - 1e-7, l.f, l.span, l.wind)
    const d = Math.abs(a - b)
    return Math.min(d, l.span - d) < 1e-4
  }))
  check('gymnopedie: every layer of the air (the clouds, the gulls, the mist, the fireflies, the boats, the far shore) comes round with the period',
    roundAgain && [coverAt, mistAt, firefliesOut, boatsOut].every((f) => Math.abs(f(PERIOD - 1e-7) - f(0)) < 1e-4))
  // The far shore: its windows dark by day, lit at dusk with the lamps and out by the dawn; the lighthouse lit with the
  // ball's first lamp and put out by the dawn, its light turning whole turns a period.
  const windows = ISLES.flatMap((i) => i.houses.map((h) => h.window).filter((w) => w !== null))
  const dayTimes = Array.from({ length: 80 }, (_, i) => 8 + i * 2.3)
  const darkByDay = windows.every((w) => dayTimes.every((t) => windowAt(w, t) === 0))
  const litAtNight = windows.filter((w) => windowAt(w, 300) > 0.8).length
  const outByDawn = windows.every((w) => windowAt(w, 6) === 0 && windowAt(w, 0) >= 0)
  check('gymnopedie: the far shore\'s windows are dark by day, lit in the night, and out by the dawn',
    windows.length > 40 && darkByDay && litAtNight > windows.length * 0.9 && outByDawn, `${windows.length} windows, ${litAtNight} lit at 300 s`)
  const piece1 = PIECES[1]
  check('gymnopedie: the lighthouse is lit with the ball\'s first lamp, burns through the night, and the dawn puts it out; its light comes round',
    LIGHTHOUSE_ON >= piece1.from && lighthouseAt(LIGHTHOUSE_ON - 0.01) === 0 && lighthouseAt(LIGHTHOUSE_ON + 2) === 1 &&
    [300, 450, 600, PERIOD - 0.01, 0.5].every((t) => lighthouseAt(t) === 1) && dayTimes.every((t) => lighthouseAt(t) === 0) &&
    Math.abs(beamAt(0).facing - beamAt(PERIOD - 1e-9).facing) < 1e-6 && Math.abs(beamAt(0).across - beamAt(PERIOD - 1e-9).across) < 1e-6)
  const meteorsOk = METEORS.length >= 4 && METEORS.every((t) => {
    const n = MELODY.find((m) => m.t === t)
    return !!n && n.piece > 0 && n.p === Math.max(...MELODY.filter((m) => m.piece === n.piece).map((m) => m.p)) && skyAt(t).night > 0.5
  })
  check('gymnopedie: a shooting star falls only on a Gnossienne\'s top note, at night', meteorsOk, METEORS.map((t) => t.toFixed(1)).join(', '))

  // The weather's one shower, the bow after it, and the whale.
  let rainFrom = Infinity
  let rainTo = -Infinity
  let bowFrom = Infinity
  let bowTo = -Infinity
  let whaleFrom = Infinity
  let whaleTo = -Infinity
  for (let t = 0; t < PERIOD; t += 0.1) {
    if (rainAt(t) > 0) { rainFrom = Math.min(rainFrom, t); rainTo = t }
    if (bowAt(t) > 0) { bowFrom = Math.min(bowFrom, t); bowTo = t }
    if (whaleAt(t)) { whaleFrom = Math.min(whaleFrom, t); whaleTo = t }
  }
  const [G1, GN1, GN3] = PIECES
  check('gymnopedie: one shower, in the Gymnopédie, and the bow after it, gone before the first Gnossienne',
    rainFrom > G1.from && rainTo < G1.last && bowFrom > rainFrom + 10 && bowTo < GN1.from, `rain ${rainFrom.toFixed(0)}-${rainTo.toFixed(0)}, bow ${bowFrom.toFixed(0)}-${bowTo.toFixed(0)}`)
  check('gymnopedie: the whale passes once, under the third Gnossienne\'s pond', whaleFrom > GN3.from && whaleTo < GN3.last,
    `${whaleFrom.toFixed(0)}-${whaleTo.toFixed(0)}`)

  let auroraFrom = Infinity
  let auroraTo = -Infinity
  let auroraDay = 0
  for (let t = 0; t < PERIOD; t += 0.1) {
    if (auroraAt(t) > 0) {
      auroraFrom = Math.min(auroraFrom, t)
      auroraTo = t
      if (skyAt(t).night < 0.95) auroraDay++
    }
  }
  check('gymnopedie: the aurora is the first Gnossienne\'s, in the full night only, gone before the moon rises',
    auroraFrom > GN1.from && auroraTo < GN1.last && auroraDay === 0, `${auroraFrom.toFixed(0)}-${auroraTo.toFixed(0)}`)

  let raysWrong = 0
  let raysSeen = 0
  for (let t = 0; t < PERIOD; t += 0.1) {
    if (raysAt(t) <= 0) continue
    raysSeen++
    if (Math.abs(sunAngle(t)) < 0.8 || Math.abs(sunAngle(t)) > 1.84 || t > G1.end + 20) raysWrong++
  }
  check('gymnopedie: rays come from the sun only while it is low and up, at dawn and into the sunset', raysSeen > 0 && raysWrong === 0,
    `${raysSeen} moments, ${raysWrong} wrong`)

  const perched = [...PERCHED.keys()].map((i) => STONES[i])
  check('gymnopedie: gulls perch on the colonnade, each lifting off as the ball lands on its stone, on its note',
    perched.length >= 12 && perched.every((s) => s.piece === 0 && MELODY.some((n) => n.t === s.touches[0])) &&
    [...PERCHED.entries()].every(([i, g]) => g.at >= STONES[i].u0 && g.at <= STONES[i].u1), `${perched.length} gulls`)

  // No gull is landed on or flown into: the ball keeps clear of each, on its perch and as it lifts and goes.
  let gullClear = Infinity
  for (const [i, g] of PERCHED) {
    const st = STONES[i]
    const t0 = st.touches[0]
    for (let s = -0.5; s <= 3; s += 0.02) {
      const [du, dh] = s < 0 ? [0, 0.12] : gullFlight(s)
      const gu = g.at + du
      const gh = st.h + dh
      const b = ballLocal(t0 + s)
      const bu = b.u - Math.round((b.u - gu) / LENGTH) * LENGTH
      gullClear = Math.min(gullClear, Math.hypot(Math.max(0, Math.abs(gu - bu) - 0.17), gh - b.h))
    }
  }
  check('gymnopedie: the ball never lands on a perched gull or flies into one as it goes', gullClear > 0.3, `${gullClear.toFixed(2)} cells at the closest`)

  // Each piece's last note runs back along its way, and nothing else does.
  let offCue = 0
  let seen = 0
  for (let t = 0; t < PERIOD; t += 0.1) {
    if (!cadenceFronts(t).length) continue
    seen++
    if (!CADENCES.some((c) => { const d = (t - c.t + PERIOD) % PERIOD; return d >= 0 && d <= c.lasts })) offCue++
  }
  check('gymnopedie: a wave of light runs back along each piece\'s way from its last note, and only then',
    offCue === 0 && seen > 0 && CADENCES.length === 3 && CADENCES.every((c, i) => c.t === PIECES[i].last), `${seen} moments, ${offCue} off cue`)

  // The inner voice draws constellations: every inner note lights a star as it sounds, and no star is lit by anything else.
  const inners = NOTES.filter((n) => n.r === 'inner')
  const lit = FIGURES.flatMap((f) => f.notes)
  const onCue = FIGURES.every((f) => f.notes.every((n, i) => {
    const before = figureAt(f, n.t - 0.05)?.find((s) => s.i === i)
    const after = figureAt(f, n.t + 0.2)?.find((s) => s.i === i)
    return !before && !!after && after.light > 0.3
  }))
  check('gymnopedie: the inner voice draws constellations, a star lit on each of its notes, at night',
    lit.length === inners.length && inners.every((n) => lit.includes(n)) && onCue && FIGURES.every((f) => f.notes[0].piece > 0),
    `${FIGURES.length} figures of ${inners.length} notes`)

  // The sea is drawn whole once the planet starts to be small in the frame; what is drawn only close is gone by then.
  check('gymnopedie: what the sea draws only close has faded before it is drawn whole, so nothing goes out in a frame',
    wideAt(CLOSE[1]) <= 0.001 && CLOSE[0] < CLOSE[1], `wide ${wideAt(CLOSE[1]).toFixed(4)} at ${CLOSE[1]} cells`)

  const lanternsOk = BOATS.every((b) => lanternAt(b.seed, PIECES[0].last) === 0 && lanternAt(b.seed, PIECES[1].from + 7) === 1 &&
    Math.abs(lanternAt(b.seed, PERIOD - 1e-7) * boatsOut(PERIOD - 1e-7) - lanternAt(b.seed, 0) * boatsOut(0)) < 1e-6)
  check('gymnopedie: the boats light their lanterns at dusk, as the first Gnossienne begins, and are home by night', lanternsOk && boatsOut(260) === 0)

  // The pond answers the ball: rings on the water from every landing and bounce on a leaf, after it and not before.
  const leaves = STONES.filter((s) => s.piece === 2)
  const ringsOk = leaves.every((s) => s.touches.every((t, j) =>
    (j > 0 && !s.bounced[j]) || (leafRings(t, s.weight[j], t - 0.05).length === 0 && leafRings(t, s.weight[j], t + 0.3).length > 0)))
  check('gymnopedie: every landing on a leaf sends rings out on the pond, as its note sounds', ringsOk && leaves.length > 150)

  const g1TopsAll = () => MELODY.filter((n) => n.piece === 0 && n.p === Math.max(...MELODY.filter((m) => m.piece === 0).map((m) => m.p)))
  const g1Top = Math.max(...MELODY.filter((n) => n.piece === 0).map((n) => n.p))
  const g1Tops = MELODY.filter((n) => n.piece === 0 && n.p === g1Top)
  check('gymnopedie: the shower\'s cloud breaks on the Gymnopédie\'s last top note, while it still rains',
    g1TopsAll().some((n) => n.t === BREAK) && rainAt(BREAK + 1) > 0.5 && overcastAt(BREAK - 0.1) > 0.95 && overcastAt(BREAK + 1.5) < 0.4,
    `break at ${BREAK.toFixed(2)} s`)
  check('gymnopedie: the sun glints on the Gymnopédie\'s top note, each time it comes, on the stone the ball lands on',
    SUN_GLINTS.length === g1Tops.length && g1Tops.length >= 4 && SUN_GLINTS.every((g, i) => g.t === g1Tops[i].t && g.stone.touches.includes(g.t)),
    `${SUN_GLINTS.length} glints`)

  // The sun and the moon: each once round a period, seen from far off in space, so neither may jump, the seam included.
  const turn2 = (a: number) => Math.abs(a - 2 * Math.PI * Math.round(a / (2 * Math.PI)))
  let skyJump = 0
  for (let t = 0; t <= PERIOD; t += 0.05) {
    for (const f of [sunAngle, moonAngle]) skyJump = Math.max(skyJump, turn2(f(t + 0.05) - f(t)))
  }
  check('gymnopedie: the sun and the moon go round without a jump, the seam included', skyJump < 0.01 &&
    turn2(sunAngle(PERIOD - 1e-7) - sunAngle(0)) < 1e-4 && turn2(moonAngle(PERIOD - 1e-7) - moonAngle(0)) < 1e-4, skyJump.toFixed(4))

  check('gymnopedie: the planet is the one period round', STONES.every((s) => s.u0 < s.u1 && s.u0 >= -1 && s.u1 <= LENGTH + STONES[0].u0 + 1) && LENGTH > 200)
  check('gymnopedie: the notes are in order, on the period', NOTES.every((n, i) => n.t >= 0 && n.t < PERIOD && (i === 0 || n.t >= NOTES[i - 1].t)))

  // The words: the title as the first bars come round, each Gnossienne's name between pieces, the credits at the end.
  const said = CARDS.map((c) => [c.role ?? '', ...c.names, ...(c.notes ?? [])].join(' ')).join(' | ')
  check('gymnopedie: titles set by the page within the period: Gymnopédie, the Gnossiennes, directed by Stephen Wu and Claude Opus 5.5, Satie, the samples, p5.js',
    TITLES_OK && perf.titles === titlesAt && titlesAt(0).length === 0 && titlesAt(PERIOD - 0.01).length === 0 &&
    ['Gymnopédie', 'Gnossienne No. 1', 'Gnossienne No. 3', 'Directed by', 'Stephen Wu', 'Claude Opus 5.5', 'Erik Satie', 'Salamander', 'p5.js'].every((w) => said.includes(w)), said)
  check('gymnopedie: no portal and no cut', perf.cuts?.(0) === false && perf.cuts?.(300) === false)
}
