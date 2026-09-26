/**
 * The checks for Gymnopédie (`versions/gymnopedie/opus55.show.ts`), run by `check:shows`: Satie played for the show
 * and round a small sea planet once a period, as a loop with no seam.
 */
import type { Performance, Version } from '../src/shows/registry'
import { Transport } from '../src/shows/clock'
import { show } from '../src/shows/versions/gymnopedie/orbit'
import { BASS, GRACES, MARGIN, MELODY, NOTES, PERIOD, PIECES } from '../src/shows/versions/gymnopedie/orbit/music'
import { LENGTH, STONES, TOUCHES, ballLocal } from '../src/shows/versions/gymnopedie/orbit/path'
import { CARDS, TITLES_OK, titlesAt } from '../src/shows/versions/gymnopedie/orbit/titles'

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
    return Math.abs(land.h - (s.h + 0.13)) > 0.02 || !before.flying
  })
  check('gymnopedie: the ball arrives on each stone as its note is struck', late.length === 0, late.slice(0, 5).map((s) => s.index).join(', '))
  check('gymnopedie: the swell comes from the bass notes and the glints from the grace notes, nothing else',
    BASS.every((n) => n.r === 'bass') && GRACES.every((n) => n.r === 'grace') && BASS.length > 150 && GRACES.length > 50)
  check('gymnopedie: the planet is the one period round', STONES.every((s) => s.u0 < s.u1 && s.u0 >= -1 && s.u1 <= LENGTH + STONES[0].u0 + 1) && LENGTH > 200)
  check('gymnopedie: the notes are in order, on the period', NOTES.every((n, i) => n.t >= 0 && n.t < PERIOD && (i === 0 || n.t >= NOTES[i - 1].t)))

  // The words: the title as the first bars come round, each Gnossienne's name between pieces, the credits at the end.
  const said = CARDS.map((c) => [c.role ?? '', ...c.names, ...(c.notes ?? [])].join(' ')).join(' | ')
  check('gymnopedie: titles set by the page within the period: Gymnopédie, the Gnossiennes, directed by Stephen Wu and Claude Opus 5.5, Satie, the samples, p5.js',
    TITLES_OK && perf.titles === titlesAt && titlesAt(0).length === 0 && titlesAt(PERIOD - 0.01).length === 0 &&
    ['Gymnopédie', 'Gnossienne No. 1', 'Gnossienne No. 3', 'Directed by', 'Stephen Wu', 'Claude Opus 5.5', 'Erik Satie', 'Salamander', 'p5.js'].every((w) => said.includes(w)), said)
  check('gymnopedie: no portal and no cut', perf.cuts?.(0) === false && perf.cuts?.(300) === false)
}
