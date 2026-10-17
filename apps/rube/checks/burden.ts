import type { Performance, ShowVersion } from '../src/shows/registry'
import { zoomed } from '../src/shows/registry'
import { CAST, DURATION, MUSIC_END, BEATS, castAt, frodoAt, liftAt, leafAt, RADIUS, ringAt, roadY, samAt, shutterAngle, stairAt } from '../src/shows/versions/bridge-of-khazad-dum/astra/motion'

type Check = (name: string, ok: boolean, detail?: string) => void

/** Physical handoffs and deterministic scrubbing, not snapshots of the implementation. */
export function checkBurden(perf: Performance, version: ShowVersion, check: Check): void {
  check('Burden: Astra, one complete YouTube cue, no local copyrighted audio',
    version.title === 'Burden' && version.label === 'Astra' && perf.duration === DURATION &&
    !perf.soundtrack?.src && perf.soundtrack?.youtube?.length === 1 &&
    perf.soundtrack.youtube[0].id === 'vbKy6FuACKg' && perf.soundtrack.youtube[0].until === MUSIC_END)
  let continuous = true, stable = true, framed = true, separate = true, deterministic = true
  let worst = 0, worstAt = 0
  const colours = new Map(Object.values(CAST).map(c => [c.id as number, c.color]))
  let previous = castAt(0)
  for (let frame = 1; frame <= DURATION * 120; frame++) {
    const t = frame / 120, balls = castAt(t)
    stable &&= balls.length === (t < 282 ? 3 : 2) && new Set(balls.map(b => b.id)).size === balls.length
    for (const b of balls) {
      stable &&= colours.get(b.id) === b.color && b.scale === RADIUS / 0.13 && !b.ghost
      const a = previous.find(p => p.id === b.id)
      if (a && !(b.id === 2 && t > BEATS.break)) {
        const step = Math.hypot(a.x - b.x, a.y - b.y)
        if (step > worst) { worst = step; worstAt = t }
        continuous &&= step < 0.08
      }
    }
    const seen = balls.filter(b => b.id !== 2 || (t >= 90 && t <= BEATS.break))
    for (let i = 0; i < seen.length; i++) for (let j = i + 1; j < seen.length; j++) {
      separate &&= Math.hypot(seen[i].x - seen[j].x, seen[i].y - seen[j].y) >= RADIUS * 2 - 0.015
    }
    if (frame % 4 === 0) {
      const here = perf.show.at(t), cam = perf.camera!(t)
      for (const view of [cam, zoomed(cam, 1.5)]) {
        framed &&= Math.abs(here.x - view.x) + RADIUS < view.cells * 8 / 9 && Math.abs(here.y - view.y) + RADIUS < view.cells / 2
      }
      const before = JSON.stringify(here.balls)
      perf.show.at(DURATION - t)
      deterministic &&= JSON.stringify(perf.show.at(t).balls) === before
    }
    previous = balls
  }
  check('Burden: every handoff is continuous at 120 fps', continuous, `largest step ${worst.toFixed(4)} cells at ${worstAt.toFixed(3)}s`)
  check('Burden: three locked identities; two after Gandalf falls; no spawns or fades', stable)
  check('Burden: the cast never pass through one another', separate)
  check('Burden: Frodo remains inside the composed and Zoom frames', framed)
  check('Burden: seeking backwards cannot alter a later frame', deterministic)
  let chuteClear = true, gatesClear = true
  for (let f = 0; f <= 8 * 120; f++) {
    const q = ringAt(f / 120), s = samAt(f / 120)
    chuteClear &&= Math.hypot(q[0] - s[0], q[1] - s[1]) > RADIUS + 0.223
  }
  // Swept clearance against the whole root, including its widest section.
  for (let i = 0; i < 3; i++) {
    const x = 11 + i * 5.2, y = roadY(x) + RADIUS - 3.35
    gatesClear &&= shutterAngle(24, i) < -1.15 && Math.abs(shutterAngle(41 + i * 10.2, i)) < 1e-8
    for (let f = 24 * 120; f <= 64 * 120; f++) {
      const t = f / 120, a = shutterAngle(t, i), vx = -Math.sin(a) * 3.35, vy = Math.cos(a) * 3.35
      for (const p of [frodoAt(t), samAt(t)]) {
        const u = Math.max(0, Math.min(1, ((p[0] - x) * vx + (p[1] - y) * vy) / 3.35 ** 2))
        gatesClear &&= Math.hypot(p[0] - x - u * vx, p[1] - y - u * vy) > RADIUS + 0.46
      }
    }
  }
  check('Burden: the opening hoop clears Sam before its pickup', chuteClear)
  check('Burden: raised roots clear both travellers and close behind them', gatesClear)
  let contact = true
  for (let t = 112; t < 140; t += 0.05) contact &&= Math.abs(frodoAt(t)[1] - liftAt(t)[1]) < 1e-8
  for (let t = 294; t < 307; t += 0.05) contact &&= Math.abs(frodoAt(t)[1] - leafAt(t)[1]) < 1e-8
  const stairStart = stairAt(0, 190)
  contact &&= Math.hypot(stairStart[0] - 78, stairStart[1] - 2) < 1e-8
  check('Burden: riders stay on the cradle and leaf; the stair hinge cannot leave its landing', contact)
  check('Burden: picture has no words before the cue ends', Array.from({ length: MUSIC_END * 4 }, (_, i) => i / 4).every(t => !perf.titles?.(t).length))
  const said = Array.from({ length: DURATION - MUSIC_END }, (_, i) => perf.titles?.(MUSIC_END + i)).flat().map(c => JSON.stringify(c)).join(' ')
  check('Burden: end cards identify title, director, locked cast and cue for DOM and export',
    ['Burden', 'GPT-6 Astra', 'Frodo', 'Sam', 'Gandalf', 'Howard Shore', 'The Bridge of Khazad Dum'].every(s => said.includes(s)))
  check('Burden: every credit opts into matte, opacity-only live and video cards',
    [358, 365, 371, 378].every(t => perf.titles!(t).length > 0 && perf.titles!(t).every(c => c.matte && !c.shade)))
}
