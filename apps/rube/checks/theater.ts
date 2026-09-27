/**
 * Theater: its door (hidden from the switch until visited, then on it), and
 * its running order (every take once a round, no take twice running across
 * a reshuffle, a pool that changes mid-round). Run from `check:shows`.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { modeFromPath } from '../../../src/ui/mode-path'
import { HIDDEN_LINKS, MODE_LINKS, switchLinks, type ShellMode } from '../../../src/ui/shell'
import { createPlaylist } from '../src/shows/playlist'
import type { Work } from '../src/shows/registry'

type Check = (name: string, ok: boolean, detail?: string) => void

/** A seeded die (mulberry32), so a failure is the same failure every run. */
function dice(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function checkTheater(check: Check, works: Work[]): void {
  console.log('\ntheater: the door')
  const tab = HIDDEN_LINKS.find((m) => m.mode === 'theater')
  check('Theater is a mode, at /theater/', tab?.path === '/theater/' && tab.label === 'Theater')
  check('it is not on the switch for a session that has not been there', switchLinks(new Set()).every((m) => m.mode !== 'theater') && MODE_LINKS.every((m) => m.mode !== 'theater'))
  const after = switchLinks(new Set<ShellMode>(['theater']))
  check('once visited it is on the switch, last, after the four', after.length === MODE_LINKS.length + 1 && after[after.length - 1] === tab && MODE_LINKS.every((m, i) => after[i] === m))
  check('its address is its tab, with or without the slash', modeFromPath('/theater/') === 'theater' && modeFromPath('/theater') === 'theater' && modeFromPath('/theater/index.html') === 'theater')
  check('Shows\' own addresses are still Shows', modeFromPath('/shows/') === 'shows' && modeFromPath('/shows/clair-de-lune/') === 'shows' && modeFromPath('/shows/cornfield-chase/grok47/') === 'shows')
  const shell = readFileSync(join(process.cwd(), 'src/ui/shell.ts'), 'utf8')
  check('the switch is built from what this session has visited, and a visit is kept', /const links = switchLinks\(visited\)/.test(shell) && /rememberVisit\(visited, mode\)/.test(shell) && /sessionStorage\.setItem\(VISITED_STORE/.test(shell))
  const page = readFileSync(join(process.cwd(), 'theater/index.html'), 'utf8')
  check('the page loads Theater', page.includes('src="/apps/rube/src/shows/theater.ts"') && page.includes('name="robots" content="noindex"'))
  const vite = readFileSync(join(process.cwd(), 'vite.config.ts'), 'utf8')
  check('the build writes the page', vite.includes('theater: `${here}theater/index.html`'))
  const host = readFileSync(join(process.cwd(), 'src/ui/mode-host.ts'), 'utf8')
  check('a tab click into it stays in the document', host.includes("case 'theater':") && host.includes("import('../../apps/rube/src/shows/theater')"))
  const player = readFileSync(join(process.cwd(), 'apps/rube/src/shows/player.ts'), 'utf8')
  check('a show that plays through puts the next one on, where the player already stops it', /if \(through && host\) \{\s*advance\(\)/.test(player) && /host\.next\(\)/.test(player))
  check('the next one goes on the way a link does: sound if allowed, the picture regardless', /if \(next\) void open\(next, 'link'\)/.test(player))
  const theater = readFileSync(join(process.cwd(), 'apps/rube/src/shows/theater.ts'), 'utf8')
  check('the panel has a Fullscreen button that follows Esc and the browser\'s own exit', /'Exit fullscreen' : 'Fullscreen'/.test(theater) && /addEventListener\('fullscreenchange', syncFullscreen\)/.test(theater) && /removeEventListener\('fullscreenchange', syncFullscreen\)/.test(theater))
  check('the take going off is unloaded before the next goes on', /music\.load\(null\)\s*\n\s*stage\.set\(null\)/.test(player))

  console.log('\ntheater: the running order')
  const takes = works.flatMap((w) => w.versions.map((v) => `${v.work}/${v.take}`))
  check('the pool is every shipped take', takes.length === works.reduce((n, w) => n + w.versions.length, 0) && takes.length > 2, String(takes.length))
  check('Clair de Lune and Cornfield Chase are in it', takes.includes('clair-de-lune/take-b') && takes.some((t) => t.startsWith('cornfield-chase/')))
  {
    let roundsOk = true
    let seamsOk = true
    let seamDetail = ''
    for (let seed = 1; seed <= 200; seed++) {
      const list = createPlaylist(takes, dice(seed))
      let prev: string | null = null
      for (let round = 0; round < 6; round++) {
        const got: string[] = []
        for (let i = 0; i < takes.length; i++) got.push(list.next()!)
        if (new Set(got).size !== takes.length || got.some((g) => !takes.includes(g))) roundsOk = false
        if (prev !== null && got[0] === prev) {
          seamsOk = false
          seamDetail = `seed ${seed}, round ${round}: ${prev} twice`
        }
        prev = got[got.length - 1]
      }
    }
    check('every take once a round, over 200 seeds and 6 rounds', roundsOk)
    check('a fresh round never opens on the take that closed the last', seamsOk, seamDetail)
  }
  {
    const a = createPlaylist(['x', 'y'], dice(7))
    const seq = Array.from({ length: 20 }, () => a.next())
    check('two takes alternate, never twice running', seq.every((s, i) => i === 0 || s !== seq[i - 1]), seq.join(''))
    const one = createPlaylist(['solo'], dice(7))
    check('a pool of one plays it again', one.next() === 'solo' && one.next() === 'solo')
    const none = createPlaylist([], dice(7))
    check('an empty pool plays nothing', none.next() === null && none.peek() === null)
  }
  {
    const list = createPlaylist(['a', 'b', 'c', 'd', 'e'], dice(3))
    const up = list.peek()
    check('peek is what next gives', up !== null && list.next() === up && list.current === up)
    const played = list.current!
    const left = ['a', 'b', 'c', 'd', 'e'].filter((t) => t !== played)
    const out = left[0]
    list.setPool(['a', 'b', 'c', 'd', 'e'].filter((t) => t !== out))
    const rest = [list.next(), list.next(), list.next()]
    check('a take left out mid-round is not played', !rest.includes(out) && new Set(rest).size === 3 && !rest.includes(played), rest.join(','))
    list.setPool(['a', 'b', 'c', 'd', 'e'])
    check('let back in mid-round, it has the turn it had not had', list.next() === out)
    const fresh = createPlaylist(['a', 'b', 'c'], dice(5))
    const first = fresh.next()!
    fresh.setPool(['a', 'b', 'c'].filter((t) => t !== first))
    fresh.setPool(['a', 'b', 'c'])
    const round = [fresh.next(), fresh.next()]
    check('let back in after its turn, it waits for the next round', !round.includes(first) && new Set(round).size === 2, `${first}: ${round.join(',')}`)
  }
  {
    const list = createPlaylist(['a', 'b', 'c'], dice(11))
    list.play('b')
    const round = [list.next(), list.next()]
    check('a take put on out of turn has had its turn this round', !round.includes('b') && new Set(round).size === 2, round.join(','))
  }
}
