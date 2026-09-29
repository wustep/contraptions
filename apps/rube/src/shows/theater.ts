import { registerMode } from '../../../../src/ui/mode-host'
import { ICON, el, icon, section, type Shell } from '../../../../src/ui/shell'
import { start, works } from './player'
import { createPlaylist } from './playlist'
import { currentTake, SECTIONS, sectionOf, type Version } from './registry'

/**
 * Theater: every show, one after another, for leaving on. It is the Shows
 * player (`player.ts`) with the choosing taken over: the running order is
 * every take in the pool, shuffled, each once before any comes round again
 * (`playlist.ts`), and a show that plays through puts the next one on. The
 * panel says what is next, skips to it, and lets takes out of the pool or
 * back in; what is left out is kept in this browser, so a new take found
 * later starts in. Any show can be put on at once, from the title (the
 * picker, as in Shows) or by its name in the running order, and the
 * shuffle carries on after it.
 *
 * It lives at `/theater/` and is not on the mode switch: it is a way of
 * watching Shows, entered from the Shows player (its Theater button, or T),
 * which opens it on the show that was on, and left the same way, for the
 * page of the show that is on then. The Shows tab stays lit while it runs.
 * `/theater/?show=<work>&take=<take>` opens on that take, and the shuffle
 * carries on from there.
 *
 * Fullscreen is the shell's, as in every mode (`shell.ts`).
 */

/** The takes left out of the pool, kept in this browser: a list of `work/take`. */
const OFF_STORE = 'contraptions:theater:off'

const idOf = (v: Version): string => `${v.work}/${v.take}`
const takes = works.flatMap((w) => w.versions)
const byId = new Map(takes.map((v) => [idOf(v), v]))

/** A take's name in the list: the work, and the take where the work has more than one. */
function nameOf(v: Version): string {
  const work = works.find((w) => w.work === v.work)
  return work && work.versions.length > 1 && v.label !== v.title ? `${v.title} · ${v.label}` : v.title
}

function readOff(): Set<string> {
  try {
    const v = localStorage.getItem(OFF_STORE)
    // A take left out under a name it has since lost is still left out.
    const off = new Set((v ? (JSON.parse(v) as string[]) : []).map((id) => {
      const [work, take] = id.split('/')
      return take ? `${work}/${currentTake(work, take)}` : id
    }))
    // A pool with nothing in it would have nothing to play: all of it, then.
    return takes.every((t) => off.has(idOf(t))) ? new Set() : off
  } catch {
    return new Set()
  }
}

function writeOff(off: Set<string>): void {
  try {
    localStorage.setItem(OFF_STORE, JSON.stringify([...off]))
  } catch {
    // Best effort: the pool still stands as set for this visit.
  }
}

function mount(shell: Shell): () => void {
  const off = readOff()
  const playlist = createPlaylist(takes.map(idOf).filter((id) => !off.has(id)))

  let nextName: HTMLElement | null = null
  let count: HTMLElement | null = null
  let rows: { id: string; box: HTMLInputElement; row: HTMLElement }[] = []

  function sync(): void {
    const up = playlist.peek()
    if (nextName) nextName.textContent = up ? nameOf(byId.get(up)!) : '—'
    if (count) count.textContent = `${playlist.pool.length} of ${takes.length}`
    for (const { id, box, row } of rows) {
      box.checked = !off.has(id)
      // The last one in stays in: an empty pool has nothing to play.
      box.disabled = box.checked && playlist.pool.length === 1
      row.classList.toggle('on', id === playlist.current)
    }
  }

  function setIn(id: string, on: boolean): void {
    if (on) off.delete(id)
    else off.add(id)
    writeOff(off)
    playlist.setPool(takes.map(idOf).filter((t) => !off.has(t)))
    sync()
  }

  const stop = start(shell, {
    path: '/theater/',
    first(named) {
      if (named) {
        playlist.play(idOf(named))
        return named
      }
      const id = playlist.next()
      return id ? byId.get(id)! : null
    },
    next() {
      const id = playlist.next()
      return id ? byId.get(id)! : null
    },
    upNext() {
      const id = playlist.peek()
      return id ? byId.get(id)! : null
    },
    opened(version) {
      // A take put on by the host has already been counted; one that got here another way is counted now.
      if (playlist.current !== idOf(version)) playlist.play(idOf(version))
      sync()
    },
    panel(root, skip, play) {
      const sec = section(root, 'Theater', 'theater')
      count = el('span', { class: 'dims' })
      sec.querySelector('.section-title')!.append(count)
      nextName = el('b')
      const nextBtn = el('button', { type: 'button', class: 'chip', title: 'Skip to the next show (N)' }, [icon(ICON.next), 'Next', el('kbd', {}, ['N'])])
      nextBtn.addEventListener('click', skip)
      const upNext = el('div', { class: 'row up-next' }, [el('div', { class: 'readout' }, ['Up next', el('br'), nextName]), nextBtn])
      const list = el('div', { class: 'pool', role: 'group', 'aria-label': 'Shows in the running order' })
      // On the picker's shelves (Machine, Movies, Ambient), and by title on each, as it reads: a work's folder is
      // not always its title. Within a work, keep the registry's take order so the preferred take leads here too.
      const versionOrder = new Map(takes.map((v, i) => [idOf(v), i]))
      rows = SECTIONS.flatMap((shelf) => {
        const on = takes.filter((v) => sectionOf(v.work) === shelf).sort((a, b) => {
          const byTitle = a.title.localeCompare(b.title)
          if (byTitle) return byTitle
          if (a.work === b.work) return versionOrder.get(idOf(a))! - versionOrder.get(idOf(b))!
          return nameOf(a).localeCompare(nameOf(b))
        })
        if (!on.length) return []
        const head = el('div', { class: 'pool-group-head', id: `pool-${shelf.toLowerCase()}` }, [shelf])
        const group = el('div', { class: 'pool-group', role: 'group', 'aria-labelledby': head.id }, [head])
        list.append(group)
        return on.map((v) => {
          const id = idOf(v)
          // The box says whether it is in the running order; the name puts it on now, in or out.
          const box = el('input', { type: 'checkbox', 'aria-label': `${nameOf(v)} in the running order`, title: 'In the running order' })
          box.addEventListener('change', () => setIn(id, box.checked))
          const name = el('button', { type: 'button', class: 'pool-play', title: v.note ? `Play now: ${v.note}` : 'Play now' }, [
            el('span', {}, [nameOf(v)]),
            icon(ICON.play),
          ])
          name.addEventListener('click', () => play(v))
          const row = el('div', { class: 'pool-row' }, [box, name])
          group.append(row)
          return { id, box, row }
        })
      })
      sec.append(upNext, list)
      sync()
    },
  })
  return () => {
    stop()
    nextName = count = null
    rows = []
  }
}

registerMode('theater', mount)
