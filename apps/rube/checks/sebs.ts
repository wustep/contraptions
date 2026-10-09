/**
 * The checks for La La Land · Seb's (`versions/la-la-land/opus5-5.show.ts`), run by `check:shows`. Kept in
 * their own file: the show is large, and so is what it promises.
 */
import type { Performance, Version } from '../src/shows/registry'
import type { ShowBall } from '../src/show'
import { R } from '../src/parts'
import { KINDLED, inSky } from '../src/shows/versions/la-la-land/sebs/night/stars'
import { sebAt } from '../src/shows/versions/la-la-land/sebs/night/painted-waltz'
import { OUT as HOLLY_OUT } from '../src/shows/versions/la-la-land/sebs/studio/hollywood'
import { show as sebsShow, covers as sebsCovers } from '../src/shows/versions/la-la-land/sebs'
import { SWITCH } from '../src/shows/versions/la-la-land/sebs/score'
import { AT, DURATION, END_AT, MIX_END, NOTES, dream, paris, combStrength, dreamBeat, parisBeat } from '../src/shows/versions/la-la-land/sebs/music'
import { STRIKES } from '../src/shows/versions/la-la-land/sebs/hits'
import { CARDS, CREDITS_OK, creditsAt } from '../src/shows/versions/la-la-land/sebs/credits'
import { coverAt } from '../src/shows/versions/la-la-land/sebs/transitions'
import { DAVID, MIA, SON } from '../src/shows/versions/la-la-land/sebs/worlds'
import { PIANO } from '../src/shows/versions/la-la-land/sebs/club/geometry'
import { DOOR, ROOM } from '../src/shows/versions/la-la-land/sebs/club/room'

type Check = (name: string, ok: boolean, detail?: string) => void
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

export function checkSebs(perf: Performance, version: Version, check: Check): void {
  const show = sebsShow
  const cam = perf.camera!

  check('sebs: in the picker it is Epilogue, Opus 5.5, with no note and no byline',
    version.label === 'Opus 5.5' && version.title === 'Epilogue' && version.note === undefined && !('director' in version))
  check('sebs: the whole mix from zero (the Epilogue, then The End), credited to Justin Hurwitz and La La Land',
    perf.show === show && near(perf.duration, DURATION) && DURATION > MIX_END - 0.2 && near(END_AT, 464) && (perf.soundtrack?.offset ?? 0) === 0 &&
    !perf.soundtrack?.src && perf.soundtrack?.youtube?.[0]?.id === '_vpCaKQXhMg' &&
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
  // The solo intro, checked against the mix's amplitude: each real attack, and none of the flux ghosts in the rests.
  // 1.358 is F#4 (the 1.254 spike is a pre-echo); 14.338 would have been a forte hit on a decaying C#.
  const intro = (STRIKES.opening ?? []).filter((t) => t < 19)
  const introHas = (t: number) => intro.some((h) => Math.abs(h - t) < 1e-6)
  const introNotes = [0.789, 1.358, 2.438, 2.995, 3.564, 4.458, 8.557, 9.067, 9.543, 10.031, 11.134, 12.353]
  const introGhosts = [1.254, 6.594, 7.001, 13.212, 14.338]
  check('sebs: the opening intro plays the piano\'s notes, on their attacks, and not the ghosts in the rests',
    introNotes.every(introHas) && introGhosts.every((t) => !intro.some((h) => Math.abs(h - t) < 0.02)),
    intro.map((t) => t.toFixed(3)).join(', '))
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
  // No one passes through anyone where it can be seen: two balls drawn closer than nine tenths of their widths summed
  // are drawn into each other. A touch is a width apart, and so allowed. (A leapfrog with both always in the air, and
  // a walk-out that crossed a seat being left, once did this; nothing that only looks at one ball at a time finds it.)
  const through: string[] = []
  for (let t = 0; t <= DURATION && through.length < 6; t += 0.01) {
    if (covered(t)) continue
    const [sx, sy] = show.where(t)
    const balls: { who: string; x: number; y: number; r: number }[] = inShot(t, { x: sx, y: sy }) ? [{ who: 'Seb', x: sx, y: sy, r: R }] : []
    for (const [who, b] of [['Mia', show.mia(t)], ['David', show.david(t)], ['their son', show.son(t)]] as const) {
      if (b && (b.scale ?? 1) > 0.05 && inShot(t, b)) balls.push({ who, x: b.x, y: b.y, r: R * (b.scale ?? 1) })
    }
    for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) {
      const [a, c] = [balls[i], balls[j]]
      if (Math.hypot(a.x - c.x, a.y - c.y) < 0.9 * (a.r + c.r)) through.push(`${a.who} and ${c.who} at ${t.toFixed(2)}`)
    }
  }
  check('sebs: no one passes through anyone where it can be seen', through.length === 0, through.join(', '))
  // Where they look. A ball's mark is its eye; at these moments it must say what the story says, to within 30°.
  const eyes = (t: number) => {
    const balls = show.at(t).balls ?? []
    return { seb: balls.find((b) => b.id === 0), mia: balls.find((b) => b.id === show.mia(t)?.id) }
  }
  const aim = (spin: number | null | undefined, want: number) => (spin == null ? Infinity : Math.abs(Math.atan2(Math.sin(spin - want), Math.cos(spin - want))))
  const looks: string[] = []
  const mutual: [number, string][] = [
    [65.6, 'the kiss at Lipton\'s'], [125.7, 'the curtain call'], [266.2, 'the roll down the beam'], [284.0, 'the waltz'],
    [338.8, 'the touch among the stars'], [462.3, 'the look at the door'], [463.8, 'the nod at the door'],
  ]
  for (const [t, what] of mutual) {
    const { seb, mia } = eyes(t)
    if (!seb || !mia) { looks.push(`${what}: one of them is missing`); continue }
    const toMia = Math.atan2(mia.y - seb.y, mia.x - seb.x)
    if (aim(seb.spin, toMia) > Math.PI / 6 || aim(mia.spin, toMia + Math.PI) > Math.PI / 6) looks.push(`${what} (${t})`)
  }
  { const { seb, mia } = eyes(28); if (!mia || aim(mia.spin, -0.87) > Math.PI / 6) looks.push('she lifts her eyes to the stage (28)'); void seb }
  { const { seb, mia } = eyes(34); if (!seb || !mia || aim(seb.spin, Math.atan2(mia.y - seb.y, mia.x - seb.x)) > Math.PI / 6) looks.push('he finds her across the room (34)') }
  // Each star the melody lights is thrown from the projector on a thread of light, and must light where it is seen: in
  // the frame, with a margin, as it lights and for the second after. (Placed by a rule once too loose, five of eleven
  // lit off the picture, their threads running out of it to nothing.)
  const unseen: string[] = []
  for (const q of KINDLED) {
    for (const dt of [0, 0.5, 1.0]) {
      const T = q.at + dt
      const [lx, ly] = inSky(q.local, T)
      const [wx, wy] = show.where(T)
      const [nx, ny] = sebAt(T)
      const f = cam(T)
      const x = lx + wx - nx
      const y = ly + wy - ny
      if (Math.abs(x - f.x) > 0.95 * ((f.cells * 16) / 9 / 2) || Math.abs(y - f.y) > 0.95 * (f.cells / 2)) { unseen.push(`${q.at.toFixed(2)}+${dt}`); break }
    }
  }
  check('sebs: every star the melody lights is lit in the picture', KINDLED.length === 11 && unseen.length === 0, unseen.join(', '))
  // The credits come up in open sky over the club, not across its roof and pelmet: while a card is up, the roof's line
  // is below the card's last line. (The first card once came up inside the club, on the pelmet's scallops.)
  const roofY = piano[1] + ROOM.roof
  let creditClear = Infinity
  let creditWorst = ''
  for (let t = CARDS[0].at; t <= DURATION; t += 0.1) {
    const cards = creditsAt(t).filter((c) => c.light > 0.05)
    for (const c of cards) {
      const f = cam(t)
      const roofAt = (roofY - (f.y - f.cells / 2)) / f.cells
      const bottom = (c.at?.[1] ?? 0.16) + (c.names.length > 2 ? 0.27 : 0.13)
      if (roofAt - bottom < creditClear) { creditClear = roofAt - bottom; creditWorst = `${t.toFixed(1)} s` }
    }
  }
  // The story's beats are seen: at each, everyone it is about is in the picture.
  const beats: [number, string, ('seb' | 'mia' | 'david')[]][] = [
    [28, 'she lifts her eyes to him', ['mia', 'david']], [34, 'he finds her across the room', ['seb', 'mia']],
    [52, 'she crosses the room to him', ['seb', 'mia']], [65.6, 'the kiss at Lipton\'s', ['seb', 'mia']],
    [118, 'the ovation', ['seb', 'mia']], [125.7, 'the curtain call', ['seb', 'mia']],
    [188.5, 'the pen signs, and he sees it', ['seb', 'mia']], [226, 'her premiere, and him', ['seb', 'mia']],
    [266.2, 'the roll down the beam', ['seb', 'mia']], [285, 'the waltz', ['seb', 'mia']], [338.8, 'the touch among the stars', ['seb', 'mia']],
    [368.5, 'the pool, and her cheering', ['seb', 'mia']], [450.1, 'the kiss in the club', ['seb', 'mia']],
    [455.7, 'waking: David in the seat', ['mia', 'david']], [461.5, 'she turns back from the door', ['mia']],
    [462.3, 'he looks up', ['seb']], [463.0, 'she nods', ['mia']], [463.8, 'he nods', ['seb']], [476.3, 'the count-in', ['seb']],
  ]
  const unseenBeats: string[] = []
  for (const [t, what, who] of beats) {
    for (const w of who) {
      const b = w === 'seb' ? (([x, y]) => ({ x, y }))(show.where(t)) : show[w](t)
      if (!inShot(t, b)) unseenBeats.push(`${what} (${t}): ${w} out of the picture`)
    }
  }
  check('sebs: the story\'s beats are seen, everyone they are about in the picture', unseenBeats.length === 0, unseenBeats.join(', '))
  // Hollywood's hill lamps go out one by one, and only then the dark comes: each goes out in the open.
  const toShadow = sebsCovers.find((c) => c.kind === 'black' && c.down[0] > 168 && c.down[0] < SWITCH.shadow)
  check('sebs: Hollywood\'s lamps go out before the dark comes', !!toShadow && HOLLY_OUT.every((t) => coverAt(toShadow, t) < 0.05))
  check('sebs: the credits come up in the open sky over the club', creditClear > 0, `clearance ${creditClear.toFixed(3)} of the frame at ${creditWorst}`)
  check('sebs: they look at each other where the story says (the touches, the waltz, the door), she to the stage, he to her', looks.length === 0, looks.join(', '))

  // The last frame: the whole city, wide.
  const endCam = cam(perf.duration)
  check('sebs: it ends on the city of stars, wide', endCam.cells >= 30 && Math.abs(endCam.x - piano[0]) < endCam.cells)
}
