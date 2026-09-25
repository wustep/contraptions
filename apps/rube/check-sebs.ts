/**
 * The checks for La La Land · Seb's (`versions/la-la-land/opus55-sebs.show.ts`), run by `check:shows`. Kept in
 * their own file: the show is large, and so is what it promises.
 */
import type { Performance, Version } from './src/shows/registry'
import type { ShowBall } from './src/show'
import { show as sebsShow, covers as sebsCovers } from './src/shows/versions/la-la-land/sebs'
import { SWITCH } from './src/shows/versions/la-la-land/sebs/score'
import { AT, DURATION, END_AT, MIX_END, NOTES, dream, paris, combStrength, dreamBeat, parisBeat } from './src/shows/versions/la-la-land/sebs/music'
import { STRIKES } from './src/shows/versions/la-la-land/sebs/hits'
import { CARDS, CREDITS_OK, creditsAt } from './src/shows/versions/la-la-land/sebs/credits'
import { coverAt } from './src/shows/versions/la-la-land/sebs/transitions'
import { DAVID, MIA, SON } from './src/shows/versions/la-la-land/sebs/worlds'
import { PIANO } from './src/shows/versions/la-la-land/sebs/club/geometry'
import { DOOR } from './src/shows/versions/la-la-land/sebs/club/room'

type Check = (name: string, ok: boolean, detail?: string) => void
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

export function checkSebs(perf: Performance, version: Version, check: Check): void {
  const show = sebsShow
  const cam = perf.camera!

  check("sebs: the chrome is a faint byline, Directed by wustep, under the take Seb's",
    version.label === "Seb's" && version.title === 'La La Land' && version.note === undefined &&
    version.director?.name === 'wustep' && version.director.href === 'https://x.com/wustep')
  check('sebs: the whole mix from zero (the Epilogue, then The End), credited to Justin Hurwitz and La La Land',
    perf.show === show && near(perf.duration, DURATION) && DURATION > MIX_END - 0.2 && near(END_AT, 464) && (perf.soundtrack?.offset ?? 0) === 0 &&
    !!perf.soundtrack?.src?.includes('la-la-land-sebs-mix-demo') &&
    ['Justin Hurwitz', 'Epilogue', 'The End', 'La La Land'].every((w) => perf.soundtrack?.credit?.includes(w)) &&
    !/tech demo|not for release/i.test(perf.soundtrack?.credit ?? '') &&
    perf.soundtrack?.href === 'https://www.youtube.com/watch?v=_vpCaKQXhMg')

  // The end credits: words the page sets (the canvas sets none), after the band, over the city, owing what is owed.
  const said = CARDS.map((c) => [c.role ?? '', ...c.names.flat(), ...(c.notes ?? [])].join(' ')).join(' | ')
  check('sebs: end credits after the band, set by the page: directed by Claude Opus 5.5, then the four balls, Justin Hurwitz, both cues and p5.js',
    CREDITS_OK && perf.titles === creditsAt && creditsAt(CARDS[0].at - 0.05).length === 0 && creditsAt(perf.duration).length === 0 &&
    CARDS[0].role === 'Directed by' && CARDS[0].names.join() === 'Claude Opus 5.5' && !/Stephen Wu/.test(said) &&
    ['Directed by', 'Claude Opus 5.5', 'Sebastian', 'Mia', 'David', 'Their son', 'Justin Hurwitz', 'Epilogue', 'The End', 'La La Land', 'p5.js'].every((w) => said.includes(w)) &&
    !/tech demo|seb's/i.test(said), said)

  // The places, in order, each changing only under a cover.
  const places = ['sebs', 'liptons', 'theatre', 'studio', 'shadow', 'globe', 'club', 'night', 'movie', 'drive', 'sebs']
  const froms = [0, SWITCH.liptons, SWITCH.theatre, SWITCH.studio, SWITCH.shadow, SWITCH.globe, SWITCH.club, SWITCH.night, SWITCH.movie, SWITCH.drive, SWITCH.finale]
  check('sebs: ten places, in the film\'s order, the club again at the end', places.every((w, i) => show.universe(i).world.name === w) &&
    froms.every((f, i) => show.indexAt(f + 0.001) === i && (i === 0 || show.indexAt(f - 0.001) === i - 1)))
  const covered = (t: number) => sebsCovers.some((c) => coverAt(c, t) >= 0.999)
  const bare = froms.slice(1).filter((f) => !(covered(f - 0.001) && covered(f + 0.001)))
  check('sebs: every change of place happens under a cover (the spotlight, the curtain, white, dark, the red door, the iris)', bare.length === 0, bare.map((t) => t.toFixed(3)).join(', '))
  check('sebs: no portal anywhere, and no cut drawn', Array.from({ length: 11 }, (_, i) => show.universe(i)).every((u) => u.pieces.every((p) => p.piece.name !== 'portal')) &&
    [0, 65.5, 150, 300, 453, 500].every((t) => perf.cuts?.(t) === false))

  // One thread, one continuous path: never a jump, through every change of place.
  let jump = 0
  let at = 0
  let prev = show.where(0)
  for (let t = 0.001; t <= perf.duration; t += 0.001) {
    const here = show.where(t)
    const d = Math.hypot(here[0] - prev[0], here[1] - prev[1])
    if (d > jump) { jump = d; at = t }
    prev = here
  }
  check('sebs: Seb never jumps (no more than 0.04 cells a millisecond)', jump <= 0.04, `${jump.toFixed(3)} at ${at.toFixed(3)} s`)
  let hidden = 0
  let longest = 0
  let longAt = 0
  for (let t = 0; t <= perf.duration; t += 0.01) {
    const here = show.at(t)
    hidden = here.hidden || here.scale <= 0.02 ? hidden + 0.01 : 0
    if (hidden > longest) { longest = hidden; longAt = t }
  }
  check('sebs: Seb is never hidden for more than 2.5 s', longest <= 2.5, `${longest.toFixed(2)} s at ${longAt.toFixed(2)}`)

  // Every strike lands on the music: a measured onset (±30 ms, at least a little strong), or a beat of a comb.
  const marks = NOTES.filter((n) => n.s >= 0.1).map((n) => n.t)
  const onComb = (t: number) => {
    const kd = dreamBeat(t)
    if (Math.abs(dream(kd) - t) <= 0.025 && combStrength('dream', kd) > 0) return true
    const kp = parisBeat(t)
    return Math.abs(paris(kp) - t) <= 0.025 && combStrength('paris', kp) > 0
  }
  const off: string[] = []
  let count = 0
  for (const [name, list] of Object.entries(STRIKES)) {
    for (const t of list) {
      count++
      if (!marks.some((m) => Math.abs(m - t) <= 0.03) && !onComb(t)) off.push(`${name} ${t.toFixed(3)}`)
    }
  }
  check('sebs: every strike lands on the music', count >= 300 && off.length === 0, `${count} strikes; off: ${off.slice(0, 12).join(', ')}`)
  const empty = Object.entries(STRIKES).filter(([, list]) => list.length === 0).map(([name]) => name)
  check('sebs: every part strikes', empty.length === 0, empty.join(', '))
  const all = Object.values(STRIKES).flat()
  const strong = (name: 'dream' | 'paris', a: number, b: number, beat: (k: number) => number) => {
    const out: number[] = []
    for (let k = 0; beat(k) < b; k++) if (beat(k) >= a && combStrength(name, k) >= 0.3) out.push(beat(k))
    return out
  }
  // The dream is an orchestra, not a drum: the parts strike its bars (a hit on the downbeat or somewhere in the bar on
  // a beat or an eighth of the comb), not every strong beat. Nearly every bar from the band's entrance to the end of
  // the Hollywood number carries one; the few that do not are breaths (the cup rising to the star, the curtain going
  // out, the house holding its breath before the ovation, the last bar into the white).
  const hitAt = (t: number) => all.some((s) => Math.abs(s - t) <= 0.03)
  const bars: number[] = []
  for (let k = 1; dream(k) < AT.hollywood_out - 1.5; k += 4) if (dream(k) >= 74 && !(dream(k) > SWITCH.studio - 0.5 && dream(k) < AT.hollywood - 0.5)) bars.push(k)
  const barsHit = bars.filter((k) => [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].some((j) => hitAt(dream(k + j))))
  check('sebs: the dream\'s bars are struck, from the band\'s entrance to the end of the Hollywood number (the white studio breathes)', barsHit.length >= bars.length * 0.8, `${barsHit.length}/${bars.length}`)
  const parisStrong = strong('paris', paris(4), AT.trumpet, paris)
  const parisHit = parisStrong.filter((t) => all.some((s) => Math.abs(s - t) <= 0.03))
  check('sebs: the Paris club\'s strong beats are struck', parisHit.length >= parisStrong.length * 0.6, `${parisHit.length}/${parisStrong.length}`)
  check('sebs: the kiss and the last chord are struck', all.some((t) => Math.abs(t - AT.kiss) <= 0.03) && all.some((t) => Math.abs(t - AT.last) <= 0.03))

  // The company, as in the film.
  const inShot = (t: number, b: { x: number; y: number; scale?: number } | null) => {
    if (!b || (b.scale ?? 1) <= 0.02 || covered(t)) return false
    const f = cam(t)
    const a = f.angle ?? 0
    const dx = b.x - f.x
    const dy = b.y - f.y
    const x = dx * Math.cos(a) - dy * Math.sin(a)
    const y = dx * Math.sin(a) + dy * Math.cos(a)
    return Math.abs(x) < (f.cells * 16) / 9 / 2 + 0.2 && Math.abs(y) < f.cells / 2 + 0.2
  }
  const miss: string[] = []
  const miaSeen = [25, AT.kiss, 118, 138, 155, 185, 203, 225, 250, 285, 320, 370, 410, 447, 461.5]
  for (const t of miaSeen) if (!inShot(t, show.mia(t))) miss.push(`Mia not in shot at ${t}`)
  const davidAt = [5, 20, 458]
  for (const t of davidAt) if (!show.david(t)) miss.push(`David missing at ${t}`)
  for (const t of [45, 65.5, 100, 150, 200, 250, 300, 370, 410, 440]) if (show.david(t)) miss.push(`David in the dream at ${t}`)
  for (const t of [30, 100, 200, 300, 330, 400, 440, 470]) if (show.son(t)) miss.push(`the son outside the home movie at ${t}`)
  const sonSeen = [355, 365, 375, 385].filter((t) => inShot(t, show.son(t)))
  if (sonSeen.length < 2) miss.push(`the son in shot at only ${sonSeen.length} of 4 home-movie times`)
  check('sebs: Mia through the dream, David only in the room as it is, their son only in the home movie', miss.length === 0, miss.join(', '))
  const colours = [show.mia(AT.kiss)?.color, show.david(5)?.color, show.son(365)?.color]
  check('sebs: Mia yellow, David grey, their son green and small', colours[0] === MIA && colours[1] === DAVID && colours[2] === SON && (show.son(365)?.scale ?? 1) < 0.8)
  const touch = (t: number, tol = 0.6) => {
    let closest = Infinity
    for (let s = t - tol; s <= t + tol; s += 0.01) {
      const m = show.mia(s)
      if (!m) continue
      const h = show.where(s)
      closest = Math.min(closest, Math.hypot(m.x - h[0], m.y - h[1]))
    }
    return closest
  }
  const kiss1 = touch(AT.kiss, 0.15)
  const kiss2 = touch(450.107, 0.2)
  check('sebs: they kiss at Lipton\'s on the orchestra\'s entrance, and again in the club at the end (close, not pressed)',
    kiss1 >= 0.24 && kiss1 <= 0.42 && kiss2 >= 0.24 && kiss2 <= 0.42, `${kiss1.toFixed(3)}, ${kiss2.toFixed(3)}`)
  // The last chord: back at the piano, on a key, in the room at the end.
  const pFinale = show.holder(AT.last)
  const piano: [number, number] = [pFinale.col - DOOR[0], pFinale.row - DOOR[1]]
  const [lx, ly] = show.where(AT.last + 0.02)
  check('sebs: on the last chord he is back on the keys of his own piano', lx >= piano[0] + PIANO.x0 - 0.05 && lx <= piano[0] + PIANO.x0 + 24 * PIANO.keyW + 0.05 &&
    // On a white key or a black one, and down with it as it plays (a key goes down less than a tenth of a cell).
    [0, -PIANO.blackRise].some((top) => ly - piano[1] - top > -0.02 && ly - piano[1] - top < 0.08), `${(lx - piano[0]).toFixed(2)}, ${(ly - piano[1]).toFixed(2)}`)
  check('sebs: she is gone by the band, and he is alone at the piano', !show.mia(AT.band) && !show.david(AT.band))

  // They never jump while drawn, and come and go only out of shot (or under a cover).
  for (const [name, of] of [['Mia', (t: number) => show.mia(t)], ['David', (t: number) => show.david(t)], ['their son', (t: number) => show.son(t)]] as const) {
    let gJump = 0
    let gAt = 0
    const pops: string[] = []
    let gPrev: ShowBall | null = of(0)
    const drawn = (g: { scale?: number } | null) => !!g && (g.scale ?? 1) > 0.02
    for (let t = 0.001; t <= perf.duration; t += 0.001) {
      const g = of(t)
      // A part hands them on to the next under a cover, where nothing can be seen to jump.
      if (g && gPrev && !covered(t)) {
        const d = Math.hypot(g.x - gPrev.x, g.y - gPrev.y)
        if (d > gJump) { gJump = d; gAt = t }
      }
      if (!gPrev && inShot(t, g)) pops.push(`in at ${t.toFixed(3)}`)
      else if (gPrev && !g && inShot(t - 0.001, gPrev)) pops.push(`out at ${t.toFixed(3)}`)
      else if (gPrev && g && !drawn(gPrev) && (g.scale ?? 1) > 0.3 && inShot(t, g)) pops.push(`shown at ${t.toFixed(3)}`)
      else if (gPrev && g && drawn(gPrev) && (gPrev.scale ?? 1) > 0.3 && !drawn(g) && inShot(t - 0.001, gPrev)) pops.push(`hidden at ${t.toFixed(3)}`)
      gPrev = g
    }
    check(`sebs: ${name} never jumps where it can be seen (no more than 0.04 cells a millisecond)`, gJump <= 0.04, `${gJump.toFixed(3)} at ${gAt.toFixed(3)} s`)
    check(`sebs: ${name} comes and goes only out of shot`, pops.length === 0, pops.slice(0, 8).join(', '))
  }
  const crowd = [5, 65.5, 150, 250, 365, 440, 460].map((t) => show.at(t).balls ?? [])
  check('sebs: every ball on the stage is someone, once', crowd.every((b) => new Set(b.map((x) => x.id)).size === b.length && b.length <= 4))

  // The last frame: the whole city, wide.
  const endCam = cam(perf.duration)
  check('sebs: it ends on the city of stars, wide', endCam.cells >= 30 && Math.abs(endCam.x - piano[0]) < endCam.cells)
}
