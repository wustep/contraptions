/**
 * The checks for Amber: Grant from the dig through the lab, the valley and the dawn, on the recording's own landmarks.
 * Called by `checks/shows.ts` for that take.
 */
import type { Performance, ShowVersion } from '../src/shows/registry'
import measured from '../../../scripts/shows/plans/jurassic-theme-onsets.json'
import { CREDITS_OK, creditsAt } from '../src/shows/versions/jurassic-theme/amber/credits'
import { CANOPY, GATE_TOP, alongNeck, boneAng, gateOpen, neckAng } from '../src/shows/versions/jurassic-theme/amber/motion'
import { BONE, DURATION, GATES, LAST, RECORDING, STRIKES, YOUTUBE } from '../src/shows/versions/jurassic-theme/amber/music'
import type { AmberShow } from '../src/shows/versions/jurassic-theme/amber/show'
import { GRANT } from '../src/shows/versions/jurassic-theme/amber/worlds'

type Check = (name: string, ok: boolean, detail?: string) => void

export function checkAmber(perf: Performance, version: ShowVersion, check: Check): void {
  const show = perf.show as AmberShow
  const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps
  const cam = perf.camera!

  check(
    'amber: one take, Amber, Grok 4.7, with an about and a still, and no byline',
    version.title === 'Amber' && version.label === 'Grok 4.7' && !!version.about && /after Jurassic Park/.test(version.about ?? '') && typeof version.still === 'number' && !('director' in version),
  )
  check(
    'amber: the whole recording from zero, credited to John Williams and the film, played from YouTube, and the credits after it',
    near(perf.duration, DURATION) && (perf.soundtrack?.offset ?? 0) === 0 && DURATION > RECORDING + 20 &&
      !perf.soundtrack?.src &&
      ['John Williams', 'Theme from Jurassic Park', 'Jurassic Park'].every((w) => perf.soundtrack?.credit?.includes(w)) &&
      !/private tech demo|not for release/i.test(perf.soundtrack?.credit ?? '') &&
      perf.soundtrack?.href === `https://www.youtube.com/watch?v=${YOUTUBE}` &&
      perf.soundtrack?.youtube?.[0]?.id === YOUTUBE &&
      YOUTUBE === measured.youtube,
  )
  check('amber: the credits come after the fade and are gone before the end', CREDITS_OK && creditsAt(LAST).length === 0 && creditsAt(DURATION - 0.5).length === 0)

  const order = show.legs.map((l) => l.world).join(',')
  check('amber: the dig, the lab, the valley, the dawn', order === 'dig,lab,valley,dawn', order)
  const cuts = show.legs.slice(1).map((l) => l.from)
  check(
    'amber: the cuts are the lab, the valley and the dawn',
    cuts.length === 3 && near(cuts[0], measured.landmarks.lab) && near(cuts[1], measured.landmarks.valley) && near(cuts[2], measured.landmarks.dawn),
    cuts.map((t) => t.toFixed(3)).join(', '),
  )
  check('amber: no portal anywhere', [0, 10, 20, 50, 90, 120, 160, 190, 220].every((t) => perf.cuts?.(t) === false))

  const marks = measured.landmarks
  const struck = [...STRIKES]
  const want = [marks.bone, marks.lab, marks.pipettes, marks.egg, marks.valley, marks.gates, marks.clear, marks.birds, marks.dawn, marks.lift]
  check('amber: every strike is a measured landmark', struck.length === want.length && struck.every((t, i) => near(t, want[i])), struck.map((t) => t.toFixed(3)).join(', '))

  let jump = 0
  let jumpAt = 0
  let screen = 0
  let screenAt = 0
  let prev = show.where(0)
  let prevLeg = show.owner(0)
  const onScreen = (t: number): [number, number] => {
    const h = show.at(t)
    const f = cam(t)
    return [(h.x - f.x) / f.cells, (h.y - f.y) / f.cells]
  }
  let prevS = onScreen(0)
  for (let t = 0.002; t <= perf.duration; t += 0.002) {
    const here = show.where(t)
    const leg = show.owner(t)
    if (leg === prevLeg) {
      const d = Math.hypot(here[0] - prev[0], here[1] - prev[1])
      if (d > jump) {
        jump = d
        jumpAt = t
      }
    }
    const s = onScreen(t)
    const ds = Math.hypot(s[0] - prevS[0], s[1] - prevS[1])
    if (ds > screen) {
      screen = ds
      screenAt = t
    }
    prev = here
    prevLeg = leg
    prevS = s
  }
  check('amber: inside a world the ball never jumps', jump <= 0.05, `${jump.toFixed(4)} at ${jumpAt.toFixed(3)} s`)
  check('amber: every cut is a match cut', screen <= 0.02, `${screen.toFixed(4)} at ${screenAt.toFixed(3)} s`)

  const ellieAt = (t: number) => show.who(t, 'ellie')
  check('amber: Ellie is absent in the dig and present after', ellieAt(4) === null && ellieAt(BONE) === null && !!ellieAt(20) && !!ellieAt(40) && !!ellieAt(100) && !!ellieAt(150) && !!ellieAt(190))
  check('amber: Grant keeps his colour', [2, 12, 30, 80, 140, 200].every((t) => show.at(t).ball.color === GRANT))

  const headAt = (t: number) => alongNeck(t, 1)[1]
  check('amber: the bone stands up on its phrase', boneAng(BONE) > boneAng(BONE + 0.8))
  check('amber: the gates are shut at the entrance and locked on the crest', gateOpen(measured.landmarks.valley) < 0.02 && gateOpen(GATES) > 0.97)
  check('amber: the head clears the gate on the lock and the trees on the next crest', headAt(GATES) < GATE_TOP && headAt(measured.landmarks.clear) < CANOPY)
  check('amber: the neck has arrived by the full statement', neckAng(measured.landmarks.birds) > neckAng(measured.landmarks.clear))
}
