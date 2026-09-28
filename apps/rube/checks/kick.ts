/**
 * The checks for Kick: Cobb from limbo's shore through Paris and the plane, down the four levels of the dream and back
 * up them, awake, and home, on the recording's own beat and onsets. Called by `checks/shows.ts` for that take.
 */
import type { Performance, ShowVersion } from '../src/shows/registry'
import measured from '../../../scripts/shows/plans/time-onsets.json'
import { STRIKES } from '../src/shows/versions/time/kick/hits'
import { BEATS, BRASS, CREDITS_AT, DURATION, HALVES, KICK, LAST, ONSETS, PEAK, PIANO, PIANO_SPIN, PULSE, RECORDING, RELEASE, SEAM, STRINGS, SUMMIT, SWELL } from '../src/shows/versions/time/kick/music'
import { CARDS, CREDITS_OK, blackAt, creditsAt } from '../src/shows/versions/time/kick/credits'
import { COVERED, PUNCHES, coverAt, rollAt } from '../src/shows/versions/time/kick/score'
import { FIRST } from '../src/shows/versions/time/kick/seams'
import { BAND, COLUMN, DOWN, OFF, RAIN_GEO, SLEEP_BANDS, SPLASH, UP, VAN, clock, depthAt, vanAt, weightless, LEVELS, DEPTH } from '../src/shows/versions/time/kick/stack'
import type { KickShow } from '../src/shows/versions/time/kick/show'
import type { Who } from '../src/shows/versions/time/kick/kit'
import { KID_ID } from '../src/shows/versions/time/kick/worlds'
import { R } from '../src/parts'

type Check = (name: string, ok: boolean, detail?: string) => void

/**
 * Where Cobb may be small or out of the Zoom frame: the great wides of the stack and the cutaways to the van while he
 * is below it. Each is a stretch of show seconds, said by the part that frames it.
 */
const WIDE: [number, number][] = [
  // The director's great wide of the stack, on the summit's first downbeat: the whole dream at once, while they rise
  // from limbo into the vault.
  [183.247, 187.061],
  // Paris: the fold's wide, the far quai's fronts coming up and over (he is at the curve's foot).
  [41.2, 43.5],
  // Limbo: the garden, cut to while he is in their room (the prologue's, and the return's before he lets her go); the
  // great wide of the fall into the sea as the city calves (he is under the water).
  [23.25, 27.052],
  [172.298, 174.69],
  [155.4, 158.6],
  // The snow: the cut to Mal on the piste above, the rifle, the shot (he is on the ledge below).
  [143.279, 145.642],
  // The hotel: the cutaway up to the van coming out of its flip, landing and rolling to the broken end (he is in the drum).
  [103.254, 107.068],
  // Home: the camera leaves him with the children and holds on the top, alone, to the last chord.
  [265.1, 274.62],
]

export function checkKick(perf: Performance, version: ShowVersion, check: Check): void {
  const show = perf.show as KickShow
  const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps
  const cam = perf.camera!

  check('kick: one take, Kick, Opus 5.5, with an about and a still, and no byline',
    version.title === 'Kick' && version.label === 'Opus 5.5' && !!version.about && /after Inception/.test(version.about ?? '') && typeof version.still === 'number' && !('director' in version))
  check('kick: the whole recording from zero, credited to Hans Zimmer and the film, played from the label\'s upload, and the credits after it',
    near(perf.duration, DURATION) && (perf.soundtrack?.offset ?? 0) === 0 && DURATION > RECORDING + 20 &&
    !!perf.soundtrack?.src?.includes('time-demo') &&
    ['Hans Zimmer', 'Time', 'Inception'].every((w) => perf.soundtrack?.credit?.includes(w)) &&
    !/private tech demo|not for release/i.test(perf.soundtrack?.credit ?? '') &&
    perf.soundtrack?.href === 'https://www.youtube.com/watch?v=c56t7upa8Bk' && perf.soundtrack?.youtube?.[0]?.id === 'c56t7upa8Bk')

  // The worlds, in the order the film goes, each cut on the recording.
  const order = show.legs.map((l) => l.world).join(',')
  check('kick: limbo\'s shore, Paris, the plane, the dream, the plane, home', order === 'dream,paris,plane,dream,plane,home', order)
  const onBeat = (t: number, eps: number) => BEATS.some((b) => Math.abs(b.t - t) <= eps) || HALVES.some((b) => Math.abs(b.t - t) <= eps)
  const onOnset = (t: number, eps: number, min = 0.2) => ONSETS.some((o) => o.s >= min && Math.abs(o.t - t) <= eps)
  const cuts = show.legs.slice(1).map((l) => l.from)
  const downbeat = (t: number) => BEATS.some((b) => b.k % 4 === 0 && Math.abs(b.t - t) <= 0.002)
  check('kick: every cut between worlds is on a downbeat, and the layers come in on their turns (strings, pulse, the release, the piano)',
    cuts.length === 5 && cuts.every(downbeat) && [SEAM.paris, SEAM.plane, SEAM.rain, SEAM.wake, SEAM.home].every((s) => cuts.some((c) => near(c, s, 1e-3))) &&
    near(SEAM.paris, STRINGS) && near(SEAM.plane, PULSE) && near(SEAM.wake, RELEASE) && near(SEAM.home, PIANO), cuts.map((t) => t.toFixed(3)).join(', '))
  check('kick: no portal anywhere, and no cut drawn', [0, 20, 50, 100, 130, 186, 210, 240, 280].every((t) => perf.cuts?.(t) === false))

  // One ball, one path: in a world it never jumps (the dream included: down four levels and back up on one path); at a
  // cut the camera carries it, so on the screen it holds still.
  let jump = 0
  let jumpAt = 0
  let screen = 0
  let screenAt = 0
  let prev = show.where(0)
  let prevLeg = show.owner(0)
  const onScreen = (t: number): [number, number] => {
    const h = show.at(t)
    const f = cam(t)
    // What the camera's roll does to a world offset on the screen (as the score turns it).
    const a = f.angle ?? 0
    const dx = (h.x - f.x) / f.cells
    const dy = (h.y - f.y) / f.cells
    return [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)]
  }
  let prevS = onScreen(0)
  for (let t = 0.001; t <= perf.duration; t += 0.001) {
    const here = show.where(t)
    const leg = show.owner(t)
    if (leg === prevLeg) {
      const d = Math.hypot(here[0] - prev[0], here[1] - prev[1])
      if (d > jump) { jump = d; jumpAt = t }
    }
    const s = onScreen(t)
    const cutHere = show.cameraCuts.some((c) => c > t - 0.001 - 1e-9 && c <= t + 1e-9)
    const ds = cutHere ? 0 : Math.hypot(s[0] - prevS[0], s[1] - prevS[1])
    if (ds > screen) { screen = ds; screenAt = t }
    prev = here
    prevLeg = leg
    prevS = s
  }
  check('kick: inside a world the ball never jumps (no more than 0.04 cells a millisecond)', jump <= 0.04, `${jump.toFixed(3)} at ${jumpAt.toFixed(3)} s`)
  check('kick: every cut is a match cut: on the screen the ball never jumps (no more than 1% of the frame a millisecond)', screen <= 0.01, `${screen.toFixed(4)} at ${screenAt.toFixed(3)} s`)

  // The dream: he goes down a level on each layer's downbeat, through the dark of sleep, and is thrown back up after
  // each kick, on one column; between, he is in his level's band.
  const at = (t: number) => show.where(t)
  const vel = (t: number): [number, number] => { const a = at(t - 0.01); const b = at(t + 0.01); return [(b[0] - a[0]) / 0.02, (b[1] - a[1]) / 0.02] }
  const crossBad: string[] = []
  for (const [name, c, down] of [...Object.entries(DOWN).map(([n, c]) => [n, c, true] as const), ...Object.entries(UP).map(([n, c]) => [n, c, false] as const)]) {
    const p = at(c.t)
    const v = vel(c.t)
    if (Math.hypot(p[0] - c.at[0], p[1] - c.at[1]) > 0.05 || (down ? v[1] < 1 : v[1] > -5)) crossBad.push(`${down ? 'down' : 'up'} ${name} at ${p[0].toFixed(2)},${p[1].toFixed(2)} v ${v[1].toFixed(1)}`)
  }
  check('kick: he crosses the dark of sleep where and when the stack says: down on the brass, the swell and the peak; up after each kick', crossBad.length === 0 && near(DOWN.hotel.t, BRASS) && near(DOWN.snow.t, SWELL) && near(DOWN.limbo.t, PEAK), crossBad.join('; '))
  const outOfBand: string[] = []
  for (let t = SEAM.rain + 0.05; t < SEAM.wake - 0.05; t += 0.05) {
    const d = depthAt(t)
    const level = LEVELS.find((l) => DEPTH[l] === d)!
    const y = at(t)[1]
    const band = BAND[level]
    const sleeping = SLEEP_BANDS.some((b) => y >= b.top - 0.6 && y <= b.bottom + 0.6)
    if ((y < band.top - 0.6 || y > band.bottom + 0.6) && !sleeping) outOfBand.push(`${t.toFixed(2)} ${level} y ${y.toFixed(1)}`)
  }
  check('kick: in the dream he is always in his own level (or crossing the dark between two)', outOfBand.length === 0, outOfBand.slice(0, 6).join(', '))
  const offColumn = (Object.values(KICK) as number[]).filter((t) => Math.abs(at(t)[0] - COLUMN) > 2.5)
  check('kick: every kick throws him up on the column', offColumn.length === 0, offColumn.map((t) => `${t.toFixed(3)} x ${at(t)[0].toFixed(2)}`).join(', '))
  const upAfterKick = (Object.values(KICK) as number[]).filter((t) => t !== KICK.rain && vel(t + 0.08)[1] > -4)
  check('kick: on every kick below the rain he is thrown straight up', upAfterKick.length === 0, upAfterKick.map((t) => t.toFixed(3)).join(', '))

  // Time runs twenty times slower a level: while he is in the snow or limbo the rain hangs, and the van with it.
  const rainRate = (a: number, b: number) => (clock('rain', b) - clock('rain', a)) / (b - a)
  check('kick: time in the rain runs at its own pace while he is in it, twenty times slower from the hotel, and all but stops from the snow down',
    Math.abs(rainRate(75, 85) - 1) < 1e-6 && Math.abs(rainRate(110, 120) - 1 / 20) < 0.002 && rainRate(130, 150) < 0.003 && rainRate(160, 180) < 0.001 && Math.abs(rainRate(201, 205) - 1) < 1e-3,
    [rainRate(75, 85), rainRate(110, 120), rainRate(130, 150), rainRate(160, 180), rainRate(201, 205)].map((v) => v.toFixed(4)).join(', '))
  // Off the deck's broken end (x 0) and barely moving while he is deeper: within a fifth of a cell of where it tipped to.
  const hang = [125, 150, 170, 185].map((t) => Math.hypot(vanAt(t).x - VAN.hang[0], vanAt(t).y - VAN.hang[1]))
  check('kick: the van hangs off the bridge\'s end while he is deeper, and is in the river on the rain\'s kick',
    hang.every((d) => d < 0.2) && [125, 185].every((t) => vanAt(t).x - VAN.size[0] / 2 > RAIN_GEO.deckEnd - 1.2 && vanAt(t).air) &&
    vanAt(SPLASH - 0.01).y > VAN.hang[1] + 6 && near(SPLASH, KICK.rain) && weightless(120) === 1 && weightless(OFF - 0.1) === 0 && weightless(SPLASH + 0.01) === 0,
    hang.map((d) => d.toFixed(3)).join(', '))

  // Every strike lands on something the recording has: a beat or an off-beat, or a measured onset.
  const within = (t: number) => onBeat(t, 0.03) || onOnset(t, 0.04)
  const off: string[] = []
  let count = 0
  for (const [name, list] of Object.entries(STRIKES)) for (const t of list) { count++; if (!within(t)) off.push(`${name} ${t.toFixed(3)}`) }
  check('kick: every strike lands on a beat, an off-beat or a measured onset', off.length === 0, `${count} strikes; off: ${off.slice(0, 12).join(', ')}`)
  const quiet = Object.entries(STRIKES).filter(([, list]) => list.length === 0).map(([name]) => name)
  check('kick: every part strikes', quiet.length === 0, `no strikes yet: ${quiet.join(', ')}`)
  const all = Object.values(STRIKES).flat()
  const hit = (t: number, eps = 0.03) => all.some((s) => Math.abs(s - t) <= eps)
  const marks: [string, number][] = [
    ['the strings coming in', STRINGS], ['the pulse', PULSE], ['the brass', BRASS], ['the swell', SWELL], ['the peak', PEAK],
    ['limbo\'s kick', SUMMIT], ['the snow\'s kick', KICK.snow], ['the hotel\'s kick', KICK.hotel], ['the river', KICK.rain],
    ['the release', RELEASE], ['the piano', PIANO], ['the top set spinning', PIANO_SPIN], ['the last chord', LAST],
  ]
  const unstruck = marks.filter(([, t]) => !hit(t, 0.04)).map(([n, t]) => `${n} ${t.toFixed(3)}`)
  check('kick: the cue\'s landmarks are struck: every layer\'s downbeat, the four kicks, the release, the piano, the top, the last chord', unstruck.length === 0, unstruck.join(', '))
  const bars = BEATS.filter((b) => b.k % 4 === 0 && b.k < 288)
  const barsHit = bars.filter((b) => hit(b.t)).length
  check('kick: the machine strikes nearly every chord (every bar\'s downbeat)', barsHit >= bars.length * 0.9, `${barsHit}/${bars.length}`)

  // The camera cuts inside a world only on a strike, and otherwise never whips; its roll turns only as gravity does.
  const cameraCuts = show.cameraCuts
  const offStrike = cameraCuts.filter((c) => !all.some((s) => Math.abs(s - c) <= 0.005))
  check('kick: the camera cuts inside a world only on a strike', offStrike.length === 0, `${cameraCuts.length} cuts${offStrike.length ? `; off: ${offStrike.map((c) => c.toFixed(3)).join(', ')}` : ''}`)
  let whip = 0
  let whipAt = 0
  let spin = 0
  let spinAt = 0
  const ZDT = 1 / 120
  for (let t = ZDT; t <= perf.duration; t += ZDT) {
    if (show.owner(t) !== show.owner(t - ZDT)) continue
    if (cameraCuts.some((c) => c > t - ZDT && c <= t + 1e-9)) continue
    const r = Math.abs(rollAt(t) - rollAt(t - ZDT)) / ZDT
    if (r > spin) { spin = r; spinAt = t }
    if (PUNCHES.some(([p]) => t >= p - 0.01 && t <= p + 0.15)) continue
    const z = Math.abs(Math.log(cam(t).cells / cam(t - ZDT).cells)) / ZDT
    if (z > whip) { whip = z; whipAt = t }
  }
  check('kick: the camera never whips: its zoom under 0.6 of a scale a second but for its punches (the kicks) and its cuts', whip <= 0.6, `${whip.toFixed(2)} log/s at ${whipAt.toFixed(2)} s`)
  check('kick: the camera\'s roll never turns faster than a turn in six seconds', spin <= (2 * Math.PI) / 6, `${spin.toFixed(2)} rad/s at ${spinAt.toFixed(2)} s`)
  check('kick: the camera\'s biggest push is the river\'s, the last kick', PUNCHES.every(([p, s]) => p === KICK.rain || s < PUNCHES.find(([a]) => a === KICK.rain)![1]))
  check('kick: the show opens on its first frame', near(cam(0).cells, FIRST.cells, 1e-6))

  // The blink and the veil are full at their cuts, and nothing else is covered; the last chord cuts to black for good.
  check('kick: going under inside a blink, home through a veil of morning: full at their cuts, and only there',
    COVERED.length === 2 && COVERED.every((t) => coverAt(t).a > 0.99) && [5, 60, 100, 150, 186.5, 213.7, 260].every((t) => coverAt(t).a === 0) &&
    near(COVERED[0], SEAM.rain) && near(COVERED[1], SEAM.home))
  check('kick: the picture cuts to black on the last chord, at once, and stays black', blackAt(LAST - 0.01) === 0 && blackAt(LAST) === 1 && blackAt(perf.duration) === 1)

  // Under Zoom (half as close again as the show's camera) the ball stays in the frame wherever it is to be seen.
  const outOfZoom: string[] = []
  for (let t = 0; t <= LAST; t += 0.05) {
    if (WIDE.some(([a, b]) => t >= a && t <= b)) continue
    const h = show.at(t)
    if (h.hidden || h.scale < 0.3) continue
    const s = onScreen(t)
    const u = Math.max(Math.abs(s[0]) * 1.5 / (16 / 9 / 2), Math.abs(s[1]) * 1.5 / 0.5)
    if (u > 1) outOfZoom.push(`${t.toFixed(2)} (${u.toFixed(2)})`)
  }
  check('kick: under Zoom the ball never leaves the frame (but for the wides of the stack)', outOfZoom.length === 0, outOfZoom.slice(0, 6).join(', '))

  // He can be found: outside the wides he is never under 5.5 px across at 640x360 for more than 1.5 s.
  let small = 0
  let smallest = 0
  let smallAt = 0
  for (let t = 0; t <= LAST; t += 0.05) {
    const h = show.at(t)
    const px = (2 * R * (h.scale ?? 1) * 360) / cam(t).cells
    small = !h.hidden && px < 5.5 && !WIDE.some(([a, b]) => t >= a && t <= b) ? small + 0.05 : 0
    if (small > smallest) { smallest = small; smallAt = t }
  }
  check('kick: he can be found: never under 5.5 px across for more than 1.5 s outside the wides', smallest <= 1.5, `${smallest.toFixed(2)} s to ${smallAt.toFixed(2)}`)

  // The ball is never out of sight for long.
  let hidden = 0
  let longest = 0
  for (let t = 0; t <= LAST; t += 0.01) {
    const here = show.at(t)
    hidden = here.hidden || here.scale <= 0.02 ? hidden + 0.01 : 0
    longest = Math.max(longest, hidden)
  }
  check('kick: the ball is never hidden for more than 2 s', longest <= 2, `${longest.toFixed(2)} s`)

  // Ariadne, Fischer and Mal: each only where the film has them, never jumping, coming and going only out of shot or
  // at a cut.
  const inShot = (t: number, b: { x: number; y: number; scale?: number } | null) => {
    if (!b || (b.scale ?? 1) <= 0.02) return false
    const f = cam(t)
    const a = f.angle ?? 0
    const dx = b.x - f.x
    const dy = b.y - f.y
    return Math.abs(dx * Math.cos(a) - dy * Math.sin(a)) < (f.cells * 16) / 9 / 2 && Math.abs(dx * Math.sin(a) + dy * Math.cos(a)) < f.cells / 2
  }
  const who: Who[] = ['ariadne', 'fischer', 'mal']
  for (const w of who) {
    const get = (t: number) => show.who(t, w)
    let worst = 0
    let worstAt = 0
    let pops: string[] = []
    let last = get(0)
    let lastLeg = show.owner(0)
    for (let t = 0.005; t <= perf.duration; t += 0.005) {
      const b = get(t)
      const leg = show.owner(t)
      const changed = leg !== lastLeg
      if (b && last && !changed) {
        const d = Math.hypot(b.x - last.x, b.y - last.y)
        if (d > worst) { worst = d; worstAt = t }
      }
      if (!changed && !!b !== !!last && (inShot(t, b) || inShot(t - 0.005, last))) pops.push(t.toFixed(3))
      last = b
      lastLeg = leg
    }
    pops = pops.slice(0, 6)
    check(`kick: ${w} never jumps`, worst <= 0.2, `${worst.toFixed(3)} at ${worstAt.toFixed(3)} s`)
    check(`kick: ${w} only comes and goes out of shot, or at a cut`, pops.length === 0, pops.join(', '))
  }
  const counts = [5, 20, 40, 64, 80, 100, 130, 160, 185, 195, 205, 220, 250].map((t) => (show.at(t).balls ?? []).filter((b) => b.id !== 0 && b.id < KID_ID).map((b) => b.id))
  check('kick: never two of anyone', counts.every((ids) => new Set(ids).size === ids.length))
  const worldAt = (t: number) => show.legs[show.owner(t)].world
  const samples = Array.from({ length: Math.floor(perf.duration * 4) }, (_, i) => i / 4)
  const where = (w: Who) => [...new Set(samples.filter((t) => show.who(t, w)).map(worldAt))].sort().join(',')
  const malAfter = samples.filter((t) => t > KICK.limbo && show.who(t, 'mal'))
  check('kick: Mal only in dreams (never on the plane or at home), and gone once he lets her go; Fischer never in Paris or at home; Ariadne never at home',
    !/plane|home/.test(where('mal')) && malAfter.length === 0 && !/paris|home/.test(where('fischer')) && !/home/.test(where('ariadne')),
    `ariadne ${where('ariadne')}; fischer ${where('fischer')}; mal ${where('mal')}${malAfter.length ? `; mal after the kick at ${malAfter[0]}` : ''}`)
  const kidsIn = [...new Set(samples.filter((t) => (show.at(t).balls ?? []).some((b) => b.id >= KID_ID)).map(worldAt))].sort().join(',')
  check('kick: the children only in his memory (limbo) and at home', /^(dream,)?home$|^dream$|^$/.test(kidsIn), kidsIn)

  // The end credits: words the page sets over the dark after the last chord, owing what is owed.
  const said = CARDS.map((c) => [c.role ?? '', ...c.names.flat(), ...(c.notes ?? [])].join(' ')).join(' | ')
  check('kick: end credits after the last chord, set by the page, opening on Directed by Claude Opus 5.5 and naming Cobb, Mal, Ariadne, Fischer, his children, Hans Zimmer, the cue, the film, Christopher Nolan and p5.js',
    CREDITS_OK && perf.titles === creditsAt && CREDITS_AT > LAST && creditsAt(CREDITS_AT - 0.1).length === 0 && creditsAt(perf.duration).length === 0 &&
    CARDS[0].role === 'Directed by' && CARDS[0].names.join() === 'Claude Opus 5.5' && CARDS.filter((c) => c.role === 'Directed by').length === 1 &&
    ['Dom Cobb', 'Mal', 'Ariadne', 'Robert Fischer', 'James and Phillipa', 'Hans Zimmer', 'Time', 'Inception', 'Christopher Nolan', 'p5.js'].every((w) => said.includes(w)) &&
    !/private tech demo|Stephen Wu/i.test(said), said)

  // The measured file is the one the parts were timed to.
  const m = measured as { duration: number; youtube: string }
  check('kick: the onsets file is this recording\'s', near(m.duration, RECORDING, 1e-9) && m.youtube === 'c56t7upa8Bk' && Math.abs(RECORDING - 275.563) < 0.01)
}
