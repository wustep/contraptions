/**
 * The checks for La La Land · Seb's (`versions/la-la-land/opus5-5.show.ts`), run by `check:shows`. Kept in
 * their own file: the show is large, and so is what it promises.
 */
import type { Performance, Version } from '../src/shows/registry'
import type { ShowBall } from '../src/show'
import { R } from '../src/parts'
import { FIGURE_AT, FIGURE_SIZE, FIGURE_TURN, KINDLED, figureDraw, inSky } from '../src/shows/versions/la-la-land/sebs/night/stars'
import { DIP, sebAt } from '../src/shows/versions/la-la-land/sebs/night/painted-waltz'
import { OUT as HOLLY_OUT } from '../src/shows/versions/la-la-land/sebs/studio/hollywood'
import { show as sebsShow, covers as sebsCovers } from '../src/shows/versions/la-la-land/sebs'
import { SWITCH } from '../src/shows/versions/la-la-land/sebs/score'
import { AT, DURATION, END_AT, MIX_END, NOTES, dream, paris, combStrength, dreamBeat, parisBeat } from '../src/shows/versions/la-la-land/sebs/music'
import { STRIKES } from '../src/shows/versions/la-la-land/sebs/hits'
import { CARDS, CREDITS_OK, creditsAt } from '../src/shows/versions/la-la-land/sebs/credits'
import { coverAt } from '../src/shows/versions/la-la-land/sebs/transitions'
import { DAVID, MIA, SON } from '../src/shows/versions/la-la-land/sebs/worlds'
import { PIANO } from '../src/shows/versions/la-la-land/sebs/club/geometry'
import { DOOR, DOOR_SHUT, ROOM } from '../src/shows/versions/la-la-land/sebs/club/room'
import { OUTLINE as FIGURE_OUTLINE } from '../src/shows/versions/la-la-land/sebs/piano-figure'
import { NARROW, aperture, muted, wakingCircle } from '../src/shows/versions/la-la-land/sebs/lens'
import { emptyAt } from '../src/shows/versions/la-la-land/sebs/theatre/theatre'
import { HORIZON, SIGN_AT, SIGN_U, THEIRS, THEIRS_AT, THEIRS_FIGURE } from '../src/shows/versions/la-la-land/sebs/city'
import { LIPTONS_CALL } from '../src/shows/versions/la-la-land/sebs/liptons/room'
import { TABLE_CALL } from '../src/shows/versions/la-la-land/sebs/club/opening'
import { SONG_COUNT, partStar, songAt } from '../src/shows/versions/la-la-land/sebs/audition/shadow'
import { BAND_RISING, DREAM_CALL, lastNoteAt } from '../src/shows/versions/la-la-land/sebs/club/finale'
import { HOUSE_SPAN, houseTop } from '../src/shows/versions/la-la-land/sebs/paris/jazz'
import { HANDOFF, SKYLINE, soloThreads, towerDrawn } from '../src/shows/versions/la-la-land/sebs/paris/jazz-club'

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
    // Inside the masking: the room as it is is seen in the narrow frame (`lens.ts`).
    return Math.abs(x) < ((f.cells * 16) / 9 / 2) * aperture(t) + 0.2 && Math.abs(y) < f.cells / 2 + 0.2
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
  // His music rising out of the club with the band never runs through a credit card: while a card is up, no bead is in
  // the band of the frame it is set in (the middle third across, from just above its first line to below its last).
  {
    const through: string[] = []
    for (let t = CARDS[0].at; t < 503; t += 0.1) {
      const cards = creditsAt(t).filter((c) => c.light > 0.3)
      if (!cards.length) continue
      const f = cam(t)
      for (const q of BAND_RISING.beads(t)) {
        if (q.a < 0.15) continue
        const fx = (piano[0] + q.x - (f.x - (f.cells * 16) / 9 / 2)) / ((f.cells * 16) / 9)
        const fy = (piano[1] + q.y - (f.y - f.cells / 2)) / f.cells
        for (const c of cards) {
          const top = (c.at?.[1] ?? 0.16) - 0.03
          const bottom = top + 0.03 + (c.names.length > 2 ? 0.27 : 0.13)
          if (fx > 0.33 && fx < 0.67 && fy > top && fy < bottom) { through.push(t.toFixed(1)); break }
        }
      }
    }
    check('sebs: his music rising out of the club never runs through the credits', through.length === 0, [...new Set(through)].slice(0, 6).join(', '))
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
  // The trumpet's solo is written in the air: its threads of light are in the picture while they are lit.
  {
    const solo = show.holder(250)
    let lit = 0
    let seen = 0
    for (let t = 240; t < 267; t += 0.25) {
      const f = cam(t)
      for (const [x, y] of soloThreads(t)) {
        const wx = solo.col + x - HANDOFF[0] - 0.5
        const wy = solo.row + y - HANDOFF[1]
        lit++
        if (Math.abs(wx - f.x) < (f.cells * 16) / 9 / 2 && Math.abs(wy - f.y) < f.cells / 2) seen++
      }
    }
    check('sebs: the trumpet\'s solo is written in light, in the picture', solo.piece.name === 'trumpet' && lit > 2000 && seen / lit >= 0.85, `${seen}/${lit} seen`)
    // And it paints the city they are going to: its phrases settle into a Paris skyline over the band, the last run
    // drawing the tower, all of it there and in the picture before the iris starts to close.
    const T = 267.25
    const f = cam(T)
    const off = SKYLINE.filter(([x, y]) => {
      const wx = solo.col + x - HANDOFF[0] - 0.5
      const wy = solo.row + y - HANDOFF[1]
      return Math.abs(wx - f.x) > (f.cells * 16) / 9 / 2 - 0.1 || Math.abs(wy - f.y) > f.cells / 2 - 0.1
    })
    check('sebs: the solo paints Paris: the skyline and its tower drawn, in the picture, before the iris', towerDrawn(T) === 1 && towerDrawn(264.5) === 0 && off.length === 0, `${off.length} points out`)
  }
  // His playing reaches her: at her table at the start and across Lipton's, every note that goes out from the keys
  // arrives where she is, and the ones at her table are seen going to her.
  {
    const origin = show.holder(10)
    const miss: string[] = []
    let arrivals = 0
    let seenAtTable = 0
    for (const [name, c, a, b] of [['the table', TABLE_CALL, 21.6, 31.5], ['Lipton\'s', LIPTONS_CALL, 40, 63.5]] as const) {
      for (let t = a; t < b; t += 0.05) {
        for (const q of c.beads(t)) {
          const wx = origin.col + q.x
          const wy = origin.row + q.y
          if (name === 'the table' && !covered(t) && inShot(t, { x: wx, y: wy })) seenAtTable++
          if (q.u < 0.97) continue
          arrivals++
          const m = show.mia(q.arrive)
          if (!m || Math.hypot(origin.col + q.to[0] - m.x, origin.row + q.to[1] - m.y) > 0.2 || Math.hypot(q.x - q.to[0], q.y - q.to[1]) > 0.2) miss.push(`${name} ${t.toFixed(2)}`)
        }
      }
    }
    // In the dream's last room the piano's own notes reach her too, every one that lands before the dream drains
    // (the room stands with its door at the finale's origin, and the piano's frame is the room's).
    const fin = show.holder(440)
    let dreamArrivals = 0
    for (let t = 432.4; t < 451.45; t += 0.05) {
      for (const q of DREAM_CALL.beads(t)) {
        if (q.u < 0.97 || q.arrive > 451.45) continue
        dreamArrivals++
        const m = show.mia(q.arrive)
        if (!m || Math.hypot(fin.col + q.to[0] - DOOR[0] - m.x, fin.row + q.to[1] - DOOR[1] - m.y) > 0.2) miss.push(`the dream ${t.toFixed(2)}`)
      }
    }
    // And the last, after she has gone: it reaches the door as it shuts, and goes out there.
    const atDoor = lastNoteAt(DOOR_SHUT - 0.001)
    const shut = lastNoteAt(DOOR_SHUT + 0.001)
    const lastOk = !!atDoor && !!shut && Math.hypot(atDoor.x - shut.x, atDoor.y - shut.y) < 0.05 && Math.abs(shut.x - ROOM.wallL1) < 0.3 && !lastNoteAt(DOOR_SHUT + 0.7)
    // And at the audition the other way: every note of her song lands on him in his chair.
    const aud = show.holder(185)
    let songLands = 0
    for (let i = 0; i < SONG_COUNT; i++) {
      for (let t = 180; t < 192; t += 0.02) {
        const q = songAt(i, t)
        const next = songAt(i, t + 0.02)
        if (!q || next) continue
        songLands++
        const [sx, sy] = show.where(t)
        if (Math.hypot(aud.col + q.x - sx, aud.row + q.y - sy) > 0.25) miss.push(`her song ${t.toFixed(2)}`)
        break
      }
    }
    check('sebs: his playing reaches her, at her table, across Lipton\'s and in the dream, and the last of it the door as it shuts; her song reaches him', songLands > 10 && arrivals > 30 && dreamArrivals > 10 && miss.length === 0 && seenAtTable > 20 && lastOk,
      `${arrivals} + ${dreamArrivals} arrivals, ${songLands} of her song, ${seenAtTable} seen at the table, last at the door ${lastOk}; ${miss.slice(0, 4).join(', ')}`)
  }
  // His club in Paris is full, and its house never covers the two of them: their heads stay above everyone's.
  {
    const under: string[] = []
    for (let t = HOUSE_SPAN[0]; t < HOUSE_SPAN[1]; t += 0.1) {
      if (covered(t)) continue
      const f = cam(t)
      const top = houseTop(f.y + f.cells / 2, f.cells)
      const [sx, sy] = show.where(t)
      const m = show.mia(t)
      for (const [who, b] of [['Seb', { x: sx, y: sy }], ['Mia', m]] as const) {
        if (b && inShot(t, b) && b.y + R > top) under.push(`${who} ${t.toFixed(1)}`)
      }
    }
    check('sebs: the house in Paris never covers the two of them', under.length === 0, under.slice(0, 6).join(', '))
  }
  check('sebs: the story\'s beats are seen, everyone they are about in the picture', unseenBeats.length === 0, unseenBeats.join(', '))
  // The other road: the what-if read against what was. Each echo of him is seen, well inside the frame and mostly
  // there, at the moment it is for; and there are only these, in the places the story turns.
  {
    const inside = (t: number, b: { x: number; y: number }) => {
      if (covered(t)) return false
      const f = cam(t)
      return Math.abs(b.x - f.x) < ((f.cells * 16) / 9 / 2) * aperture(t) - 0.3 && Math.abs(b.y - f.y) < f.cells / 2 - 0.3
    }
    const roads: [number, string][] = [
      [33.6, 'as he finds her, the what-if leaves him for her table'],
      [62.75, 'at Lipton\'s, the one who walked out knocks past her'],
      [198.4, 'he stays in Los Angeles as the plane goes'],
      [440.5, 'in the dream\'s last room, the real one plays the piano that plays itself'],
      [455.45, 'David sits down in the dream\'s place at her table'],
      [463.05, 'beside her in the doorway as she smiles at him'],
    ]
    const unseenRoads: string[] = []
    for (const [t, what] of roads) {
      const e = show.echoes(t)
      if (e.length !== 1 || e[0].a < 0.5 || !inside(t, e[0])) unseenRoads.push(`${what} (${t})`)
    }
    let spans = 0
    let was = false
    for (let t = 0; t <= DURATION; t += 0.05) {
      const is = show.echoes(t).length > 0
      if (is && !was) spans++
      was = is
    }
    // (Waking, the real one at the keys and the dream at her table are both there a moment: one span between them.)
    check('sebs: the other road is seen where the story turns, and only there', unseenRoads.length === 0 && spans === roads.length - 1 && show.echoList.length === roads.length,
      `${unseenRoads.join(', ')}; ${spans} spans`)
    // In the hush, the one who walked out knocks her as he goes by: she rocks from it, and looks after him.
    const before = show.mia(62.55)
    const after = show.mia(62.8)
    const look = show.at(63.1).balls?.find((b) => b.id === show.mia(63.1)?.id)
    check('sebs: she feels the knock in the hush, and looks after the one who walked out',
      !!before && !!after && after.x - before.x > 0.03 && !!look && Math.cos((look.spin ?? 0) - Math.PI) > Math.cos(Math.PI / 6))
  }
  // Hollywood's hill lamps go out one by one, and only then the cloth comes in: each goes out in the open.
  const toShadow = sebsCovers.find((c) => c.down[0] > 168 && c.down[0] < SWITCH.shadow)
  check('sebs: Hollywood\'s lamps go out before the cloth comes in', !!toShadow && HOLLY_OUT.every((t) => t < toShadow.down[0]))
  // Once the dream has opened wide, the picture never goes to black until he wakes: the stage changes its scene the
  // way a stage does (a curtain, a cloth flown in or out, a door past the lens, white light), and the two darks it keeps
  // are the trumpet's iris, an old film's own, and the night between the stars and the home movie, where one star stays.
  const darks = sebsCovers.filter((c) => c.down[0] > 41 && c.up[1] < AT.last && c.kind === 'black' && (c.color ?? '#000000') === '#000000' && !c.spark)
  check('sebs: in the dream the picture never goes to black but for the iris and the one star', darks.length === 0 &&
    sebsCovers.some((c) => c.kind === 'black' && !!c.spark), darks.map((c) => c.down[0]).join(', '))
  check('sebs: the credits come up in the open sky over the club', creditClear > 0, `clearance ${creditClear.toFixed(3)} of the frame at ${creditWorst}`)
  // The share card is the show's own frame at its `still`: the two of them in it, and looking at each other.
  {
    const t = version.still ?? -1
    const { seb, mia } = eyes(t)
    const ok = !!seb && !!mia && inShot(t, seb) && inShot(t, mia) &&
      aim(seb.spin, Math.atan2(mia.y - seb.y, mia.x - seb.x)) <= Math.PI / 6 && aim(mia.spin, Math.atan2(seb.y - mia.y, seb.x - mia.x)) <= Math.PI / 6
    check('sebs: the share card shows the two of them, looking at each other', ok, `still ${t}`)
  }
  // Wherever they are close and in the picture, they do not both look away from each other for long. (A ball's mark
  // turns with its rolling unless a look sets it; it once left them looking away in the car as she leaned in to him.)
  {
    const away: string[] = []
    let from = -1
    for (let t = 0; t <= DURATION; t += 0.05) {
      let both = false
      if (!covered(t)) {
        const at = show.at(t)
        const seb = (at.balls ?? []).find((b) => b.id === 0)
        const mia = (at.balls ?? []).find((b) => b.id === show.mia(t)?.id)
        if (seb && mia && inShot(t, seb) && inShot(t, mia) && Math.hypot(seb.x - mia.x, seb.y - mia.y) < 1) {
          const col = at.universe.pieces[0]?.col ?? 0
          const to = Math.atan2(mia.y - seb.y, mia.x - seb.x)
          both = aim(seb.spin ?? (seb.x - col) / R, to) > Math.PI / 2 && aim(mia.spin ?? (mia.x - col) / R, to + Math.PI) > Math.PI / 2
        }
      }
      if (both && from < 0) from = t
      if (!both && from >= 0) { if (t - from >= 1.5) away.push(`${from.toFixed(1)} to ${t.toFixed(1)}`); from = -1 }
    }
    check('sebs: close and in the picture, they never both look away from each other for long', away.length === 0, away.join(', '))
  }
  check('sebs: they look at each other where the story says (the touches, the waltz, the door), she to the stage, he to her', looks.length === 0, looks.join(', '))

  // Their constellation comes out in the sky over the city at the end, and every star of it is in the picture from
  // the moment it comes out to the last frame. (The sky slides with the camera by nine tenths of the way, `city.ts`.)
  {
    const out: string[] = []
    for (let t = THEIRS_AT[0]; t <= DURATION; t += 0.1) {
      const f = cam(t)
      const cx = f.x - piano[0]
      const cy = f.y - piano[1]
      THEIRS.forEach((q, i) => {
        if (t < THEIRS_AT[i]) return
        const x = q.x + cx * 0.92 - cx
        const y = q.y + (cy - HORIZON) * 0.92 * 0.35 - cy
        if (Math.abs(x) > (f.cells * 16) / 9 / 2 - 0.5 || Math.abs(y) > f.cells / 2 - 0.5) out.push(`${i} at ${t.toFixed(1)}`)
      })
    }
    check('sebs: their constellation comes out over the city of stars, in the picture', THEIRS.length === KINDLED.length && out.length === 0, out.slice(0, 6).join(', '))
  }
  // The piano the planetarium draws round them at the dip, and again round their stars over the city at the end: whole
  // in the picture while it is drawn, both times: every point of its outline.
  {
    const corners = (c: [number, number], size: number, turn: number) => FIGURE_OUTLINE.map(([u, v]) =>
      [c[0] + (u * Math.cos(turn) - v * Math.sin(turn)) * size, c[1] + (u * Math.sin(turn) + v * Math.cos(turn)) * size] as [number, number])
    const cut: string[] = []
    for (let T = 337.2; T < 338.85; T += 0.1) {
      const [wx, wy] = show.where(T)
      const [nx, ny] = sebAt(T)
      const f = cam(T)
      for (const [x, y] of corners(FIGURE_AT(), FIGURE_SIZE, FIGURE_TURN)) {
        if (Math.abs(x + wx - nx - f.x) > (f.cells * 16) / 9 / 2 || Math.abs(y + wy - ny - f.y) > f.cells / 2) { cut.push(`the dip ${T.toFixed(1)}`); break }
      }
    }
    for (let t = THEIRS_AT[THEIRS_AT.length - 1] + 1.5; t <= DURATION; t += 0.2) {
      const f = cam(t)
      const cx = f.x - piano[0]
      const cy = f.y - piano[1]
      for (const [x, y] of corners(THEIRS_FIGURE.at, THEIRS_FIGURE.size, THEIRS_FIGURE.turn)) {
        if (Math.abs(x + cx * 0.92 - cx) > (f.cells * 16) / 9 / 2 - 0.3 || Math.abs(y + (cy - HORIZON) * 0.92 * 0.35 - cy) > f.cells / 2 - 0.3) { cut.push(`the city ${t.toFixed(1)}`); break }
      }
    }
    check('sebs: the piano drawn in the stars is whole in the picture, at the dip and over the city', cut.length === 0, cut.slice(0, 5).join(', '))
    // Her name in lights over the real city: the sign on the far hills lights in her yellow on The End's swell, before
    // their stars come out, and from the last block lit to the last frame it is whole in the picture with the club and
    // the piano in the stars. (The far hills slide with the camera by four fifths of the way, `city.ts`.)
    const signOut: string[] = []
    for (let t = Math.max(...SIGN_AT) + 0.3; t <= DURATION; t += 0.2) {
      const f = cam(t)
      const cx = f.x - piano[0]
      const cy = f.y - piano[1]
      for (const u of SIGN_U) {
        const x = u + cx * 0.8 - cx
        const y = HORIZON + (cy - HORIZON) * 0.8 * 0.35 - 5.55 - cy
        if (Math.abs(x) > (f.cells * 16) / 9 / 2 - 0.5 || Math.abs(y) > f.cells / 2 - 0.5) { signOut.push(t.toFixed(1)); break }
      }
    }
    check('sebs: her name in lights over the city at the end, lit before their stars and whole in the picture to the last frame',
      SIGN_AT.length === 9 && Math.max(...SIGN_AT) < THEIRS_AT[0] && Math.min(...SIGN_AT) > AT.band && signOut.length === 0, signOut.slice(0, 5).join(', '))
  }
  // David, her husband: his eyes on her at her table while hers go to the stage. And the swap at her table is seen: the
  // dream's him there, greyed, in the picture with her looking at it, before David sits down into it.
  {
    const ball = (t: number, id: number) => show.at(t).balls?.find((b) => b.id === id)
    const dv = ball(28, show.david(28)?.id ?? -1)
    const mi = ball(28, show.mia(28)?.id ?? -1)
    const davidLooks = !!dv && !!mi && aim(dv.spin, Math.atan2(mi.y - dv.y, mi.x - dv.x)) <= Math.PI / 8
    const e = show.echoes(455.0).find((x) => (x.turn ?? 0) > 0.6)
    const her = ball(455.0, show.mia(455.0)?.id ?? -1)
    const swapSeen = !!e && inShot(455.0, e) && !!her && inShot(455.0, her) && aim(her.spin, Math.atan2(e.y - her.y, e.x - her.x)) <= Math.PI / 6
    // And as the camera finds their table they are leaning in together, touching (close, not pressed), before she draws
    // back and looks up to the stage.
    const m23 = show.mia(23), d23 = show.david(23), m26 = show.mia(26), d26 = show.david(26)
    const gap23 = m23 && d23 ? Math.hypot(m23.x - d23.x, m23.y - d23.y) : Infinity
    const gap26 = m26 && d26 ? Math.hypot(m26.x - d26.x, m26.y - d26.y) : 0
    const together = gap23 < 2 * R + 0.02 && gap23 > 0.9 * 2 * R && gap26 > 2 * R + 0.08
    check('sebs: she and David lean in together and he looks at her at her table, and the swap there is seen: the dream\'s him greyed, and her looking at it', davidLooks && swapSeen && together,
      `david looks ${davidLooks}, swap seen ${swapSeen}, together ${gap23.toFixed(3)} then ${gap26.toFixed(3)}`)
  }
  // At her show the empty house of the film's real night shows through only in the lead-in bar, and the full house is
  // back the moment he springs up (115.52) for the ovation.
  {
    let outside = 0
    for (let t = 90.5; t < 133; t += 0.05) if (t < 113.4 || t > 115.6) outside = Math.max(outside, emptyAt(t))
    check('sebs: at her show the empty house shows through only in the lead-in, full again when he springs up', outside === 0 && emptyAt(114.6) > 0.7 && emptyAt(115.6) === 0, `outside ${outside}`)
  }
  // At the audition she gets the part: the star off the signed paper comes to rest over her, in the picture, and stays
  // with her through the flood.
  {
    const aud = show.holder(185)
    const bad: string[] = []
    for (let t = 190.6; t < 195; t += 0.1) {
      const q = partStar(t)
      const m = show.mia(t)
      if (!q || !m) { bad.push(`${t.toFixed(1)} missing`); break }
      const x = aud.col + q.x, y = aud.row + q.y
      if (Math.abs(x - m.x) > 0.05 || y > m.y || m.y - y > 0.6 || !inShot(t, { x, y })) { bad.push(t.toFixed(1)); break }
    }
    check('sebs: at the audition the gold star from the signed paper settles over her, in the picture', bad.length === 0 && !partStar(189) , bad.join(', '))
  }
  // The grade: the room as it is muted, the dream in full colour all through, and the colour back at the last frame.
  {
    let dreamMuted = 0
    for (let t = 41; t < 451.4; t += 0.5) dreamMuted = Math.max(dreamMuted, muted(t))
    check('sebs: the room as it is muted, the dream in full colour, the colour back for the stars',
      muted(10) > 0.99 && muted(30) > 0.99 && dreamMuted === 0 && muted(460) > 0.99 && muted(480) > 0.99 && muted(DURATION) < 0.01, `dream muted ${dreamMuted}`)
  }
  // The frame: the room as it is in the old narrow picture, the dream in the wide one, the way La La Land's first
  // image stretches out to CinemaScope. Narrow from the first frame until the dream has opened on Lipton's, wide through
  // the whole dream, narrow again from the last chord through the door and the count-in, and wide with the band.
  {
    let dreamNarrow = 1
    for (let t = 43; t < 451.5; t += 0.25) dreamNarrow = Math.min(dreamNarrow, aperture(t))
    let roomWide = 0
    for (let t = 0; t <= 40.9; t += 0.25) roomWide = Math.max(roomWide, aperture(t))
    for (let t = AT.last; t <= AT.band; t += 0.25) roomWide = Math.max(roomWide, aperture(t))
    let wobble = 0
    for (let t = 0.01; t <= DURATION; t += 0.01) wobble = Math.max(wobble, Math.abs(aperture(t) - aperture(t - 0.01)))
    check('sebs: the room as it is in the narrow frame, the dream wide, and wide again with the band, never snapping',
      NARROW > 0.7 && NARROW < 0.8 && dreamNarrow === 1 && Math.abs(roomWide - NARROW) < 1e-9 && aperture(481) === 1 && aperture(DURATION) === 1 && wobble < 0.01,
      `dream ${dreamNarrow.toFixed(3)}, room ${roomWide.toFixed(3)}, step ${wobble.toFixed(4)}`)
  }
  // The piano among the stars grows with their waltz: a share of it for each star lit, never going back, and whole by the
  // dip. And the way out of the dream mirrors the way in: a circle closing on him at the keys, shut by the last chord.
  {
    let back = 0
    let short = ''
    let prev = 0
    for (let T = KINDLED[0].at; T < 339; T += 0.05) {
      const d = figureDraw(T)
      back = Math.max(back, prev - d)
      prev = d
    }
    KINDLED.forEach((q, i) => { if (figureDraw(q.at + 1) < (i + 1) / KINDLED.length - 0.01) short = `${i}` })
    const growOk = back < 1e-9 && !short && figureDraw(DIP + 1) >= 1 && figureDraw(KINDLED[0].at - 0.5) < 0.01
    const at = (t: number) => show.where(t)
    const c0 = wakingCircle(452.0, at(452.0), 30)
    const c1 = wakingCircle(453.6, at(453.6), 30)
    const c2 = wakingCircle(AT.last + 0.38, at(AT.last + 0.38), 30)
    const onHim = !!c1 && Math.hypot(c1.x - at(453.6)[0], c1.y + 0.2 - at(453.6)[1]) < 1e-6 && inShot(453.6, { x: c1.x, y: c1.y })
    const closes = !!c0 && !!c1 && !!c2 && c0.r > c1.r && c1.r < 2 && c2.r < 0.05 && !wakingCircle(450, at(450), 30)
    check('sebs: the piano among the stars grows with their waltz, and the way out of the dream closes on him like the way in', growOk && onHim && closes,
      `grow ${growOk} (short ${short || 'none'}), on him ${onHim}, closes ${closes}`)
  }
  // The last frame: the whole city, wide.
  const endCam = cam(perf.duration)
  check('sebs: it ends on the city of stars, wide', endCam.cells >= 30 && Math.abs(endCam.x - piano[0]) < endCam.cells)
}
