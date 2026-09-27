import { registerMode } from '../../../../src/ui/mode-host'
import { ICON, el, icon, section, type Shell } from '../../../../src/ui/shell'
import { start, works } from './player'
import { createPlaylist } from './playlist'
import type { Version } from './registry'

/**
 * Theater: every show, one after another, for leaving on. It is the Shows
 * player (`player.ts`) with the choosing taken over: the running order is
 * every take in the pool, shuffled, each once before any comes round again
 * (`playlist.ts`), and a show that plays through puts the next one on. The
 * panel says what is next, skips to it, and lets takes out of the pool or
 * back in; what is left out is kept in this browser, so a new take found
 * later starts in.
 *
 * It lives at `/theater/` and is not on the mode switch until it has been
 * visited (`shell.ts`). `/theater/?show=<work>&take=<take>` opens on that
 * take, and the shuffle carries on from there.
 *
 * Fullscreen (the panel's button, or F) takes the whole page rather than the
 * stage alone: the panel, the transport and the words on the stage stay
 * where they are, so P, the button and the cards still work, and the panel
 * away (as it opens) or ` leaves the picture on its own.
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
    const off = new Set(v ? (JSON.parse(v) as string[]) : [])
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

/** Safari before 16.4 has element fullscreen only under its own prefix. */
type Prefixed = { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void; webkitRequestFullscreen?: () => void }

const fullscreenOn = (): boolean => !!(document.fullscreenElement ?? (document as Prefixed).webkitFullscreenElement)

/** False on an iPhone, which lets only a video go fullscreen: there is no button to offer. */
const canFullscreen = (): boolean => !!(document.fullscreenEnabled || (document.documentElement as Prefixed).webkitRequestFullscreen)

function toggleFullscreen(): void {
  const doc = document as Prefixed
  const page = document.documentElement as Prefixed
  if (fullscreenOn()) {
    if (document.exitFullscreen) void document.exitFullscreen().catch(() => {})
    else doc.webkitExitFullscreen?.()
    return
  }
  // Refused (not from a gesture, or a frame that does not allow it): the page stays as it is.
  if (document.documentElement.requestFullscreen) void document.documentElement.requestFullscreen().catch(() => {})
  else page.webkitRequestFullscreen?.()
}

function mount(shell: Shell): () => void {
  const off = readOff()
  const playlist = createPlaylist(takes.map(idOf).filter((id) => !off.has(id)))

  let nextName: HTMLElement | null = null
  let count: HTMLElement | null = null
  let rows: { id: string; box: HTMLInputElement; row: HTMLElement }[] = []
  let fsBtn: HTMLButtonElement | null = null

  // Esc, the browser's own exit, or another tab's button: the button follows whatever happened.
  function syncFullscreen(): void {
    if (!fsBtn) return
    const on = fullscreenOn()
    fsBtn.classList.toggle('on', on)
    fsBtn.setAttribute('aria-pressed', String(on))
    fsBtn.replaceChildren(icon(on ? ICON.windowed : ICON.fullscreen), on ? 'Exit fullscreen' : 'Fullscreen', el('kbd', {}, ['F']))
  }
  document.addEventListener('fullscreenchange', syncFullscreen)
  document.addEventListener('webkitfullscreenchange', syncFullscreen)

  const onKey = (e: KeyboardEvent) => {
    // As the player's own keys: never over browser chrome, a field, or a held key.
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || !canFullscreen()) return
    const t = e.target
    if (t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement) return
    if (e.key !== 'f' && e.key !== 'F') return
    e.preventDefault()
    toggleFullscreen()
  }
  window.addEventListener('keydown', onKey)

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
    opened(version) {
      // A take put on by the host has already been counted; one that got here another way is counted now.
      if (playlist.current !== idOf(version)) playlist.play(idOf(version))
      sync()
    },
    panel(root, skip) {
      const sec = section(root, 'Theater', 'theater')
      count = el('span', { class: 'dims' })
      sec.querySelector('.section-title')!.append(count)
      nextName = el('b')
      const nextBtn = el('button', { type: 'button', class: 'chip', title: 'Skip to the next show (N)' }, [icon(ICON.next), 'Next', el('kbd', {}, ['N'])])
      nextBtn.addEventListener('click', skip)
      const upNext = el('div', { class: 'row up-next' }, [el('div', { class: 'readout' }, ['Up next', el('br'), nextName]), nextBtn])
      const list = el('div', { class: 'pool', role: 'group', 'aria-label': 'Shows in the running order' })
      // By name, as it reads: the folders sort by work, and a work's folder is not always its title.
      rows = [...takes].sort((a, b) => nameOf(a).localeCompare(nameOf(b))).map((v) => {
        const id = idOf(v)
        const box = el('input', { type: 'checkbox' })
        box.addEventListener('change', () => setIn(id, box.checked))
        const row = el('label', { class: 'pool-row', title: v.note ?? nameOf(v) }, [box, el('span', {}, [nameOf(v)])])
        list.append(row)
        return { id, box, row }
      })
      sec.append(upNext)
      if (canFullscreen()) {
        fsBtn = el('button', { type: 'button', class: 'chip', title: 'Fill the screen with the show, or give it back (F)' })
        fsBtn.addEventListener('click', toggleFullscreen)
        sec.append(el('div', { class: 'row fullscreen' }, [fsBtn]))
        syncFullscreen()
      }
      sec.append(list)
      sync()
    },
  })
  return () => {
    stop()
    document.removeEventListener('fullscreenchange', syncFullscreen)
    document.removeEventListener('webkitfullscreenchange', syncFullscreen)
    window.removeEventListener('keydown', onKey)
    fsBtn = null
    nextName = count = null
    rows = []
  }
}

registerMode('theater', mount)
