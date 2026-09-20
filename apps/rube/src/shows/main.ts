import '../../../../src/ui/styles.css'
import { ICON, createShell, el, guardWheel, icon, section, segmented } from '../../../../src/ui/shell'
import { createListbox } from '../../../../src/ui/listbox'
import { SHOW_SPEEDS, Transport, clockText } from './clock'
import { discoverShows } from './discover'
import { recordingFormat } from './record'
import { performanceProblems, pickVersion, type Performance, type Version } from './registry'
import { createSoundtrack } from './soundtrack'
import { FRAME_SIZES, createShowStage, type FrameSize } from './stage'

/**
 * The entry: Shows. Machine set to music — a machine choreographed to a
 * piece of music, the soundtrack locked to it — in the same chrome as the
 * other modes: brand, mode switch, and then the show's own sections. Which
 * show and which version of it, since the same music may have several takes
 * side by side (`registry.ts`); a transport over the whole show, at 1× or
 * 2×, with the music on unless it is turned off; and Export, which saves the
 * frame or the whole show as **picture and music only**. Nothing is ever
 * written on a show's canvas (`stage.ts`), so what is in the panel — the
 * title, the credit, the clock — is in the panel and nowhere else.
 *
 * `?show=<work>&take=<take>` names a version, so a link is a take. A seed in
 * the URL is not the show's — a show is the same for everyone — but it is
 * kept and handed back to the mode switch, so a visit here does not lose the
 * machine that was being watched. `/shows/` with no work opens Clair de
 * Lune, Take A.
 *
 * A show opens playing, music and all, where the browser lets it. Where it
 * wants a gesture first, the show waits at the top with a play button on
 * the stage, and starts with its music on the first press: it never runs
 * on silently towards a sound that comes in late.
 */

const stageRoot = document.getElementById('stage')!
const panelRoot = document.getElementById('panel')!

const { works, problems } = discoverShows()
for (const problem of problems) console.warn(`shows: ${problem}`)

const params = new URLSearchParams(location.search)
const seed = params.get('seed') ?? ''

/* ------------------------------------------------------------------ state */

let current: Version | null = pickVersion(works, params.get('show'), params.get('take'))
let perf: Performance | null = null
let transport: Transport | null = null
/** Counts every version opened, so a load that comes back late knows it has been overtaken. */
let generation = 0
let loading = false
let failed = ''
/** The browser would not start the music without a gesture, and the show is waiting for one. */
let blocked = false
let speed = 1
let muted = false
let overview = false
let size: FrameSize = FRAME_SIZES[FRAME_SIZES.length - 1]
let recording: AbortController | null = null

const music = createSoundtrack()
const stage = createShowStage(stageRoot, { time: () => transport?.now() ?? 0 })
/** A version is loaded once: its machine and its music are the same every time it is come back to. */
const loads = new Map<Version, Promise<Performance>>()

function writeUrl(): void {
  const q = new URLSearchParams()
  if (seed) q.set('seed', seed)
  if (current) {
    q.set('show', current.work)
    q.set('take', current.take)
  }
  const query = q.toString()
  history.replaceState(null, '', query ? `?${query}` : location.pathname)
}

/* ------------------------------------------------------------------ transport */

async function play(): Promise<void> {
  if (!transport || recording) return
  if (transport.ended) seek(0)
  blocked = false
  const from = transport.now()
  transport.play()
  sync()
  const mine = generation
  const result = await music.play(from)
  if (mine !== generation || result !== 'blocked') return
  // The music is the clock. With no music allowed yet there is no show yet: wait where it stood.
  transport.pause()
  transport.seek(from)
  blocked = true
  sync()
}

function pause(): void {
  if (!transport) return
  transport.pause()
  music.pause()
  sync()
}

const toggle = () => (transport?.playing ? pause() : void play())

function seek(t: number): void {
  if (!transport) return
  music.seek(transport.seek(t))
}

function setSpeed(next: number): void {
  speed = next
  transport?.setSpeed(next)
  music.setSpeed(next)
  sync()
}

function setMuted(next: boolean): void {
  muted = next
  music.setMuted(next)
  sync()
}

function setOverview(on: boolean): void {
  overview = on
  stage.setOverview(on)
  sync()
}

/** Put a version on the stage from the top, and start it if asked. */
async function open(version: Version, thenPlay: boolean): Promise<void> {
  const mine = ++generation
  music.load(null)
  stage.set(null)
  perf = null
  transport = null
  current = version
  loading = true
  failed = ''
  blocked = false
  writeUrl()
  sync()
  try {
    let load = loads.get(version)
    if (!load) {
      load = version.load()
      loads.set(version, load)
    }
    const loaded = await load
    if (mine !== generation) return
    const wrong = performanceProblems(loaded)
    if (wrong.length) throw new Error(wrong.join(', '))
    perf = loaded
    transport = new Transport({ duration: loaded.duration, heard: () => music.position() })
    transport.setSpeed(speed)
    music.load(loaded.soundtrack ?? null)
    stage.set(loaded)
  } catch (err) {
    if (mine !== generation) return
    // A version that would not load may load next time; one that loaded wrong will not.
    loads.delete(version)
    console.error(err)
    failed = err instanceof Error ? err.message : String(err)
  }
  loading = false
  sync()
  if (perf && thenPlay) void play()
}

/** The take before or after this one, round the takes of this work. */
function step(dir: 1 | -1): void {
  const work = works.find((w) => w.work === current?.work)
  if (!work || work.versions.length < 2 || recording) return
  const i = work.versions.indexOf(current!)
  void open(work.versions[(i + dir + work.versions.length) % work.versions.length], true)
}

/* ------------------------------------------------------------------ panel */

const shell = createShell(panelRoot, 'shows')
shell.setSeed(seed)

// Show — which music, and which take of it. It leads, as the seed does elsewhere.
const showCard = el('section', { class: 'seed-card show-card' }, [el('div', { class: 'section-title' }, ['Show'])])
panelRoot.append(showCard)
const workList = createListbox({
  label: 'Show',
  value: current?.work ?? '',
  items: works.map((w) => ({ value: w.work, label: w.title, note: w.versions.length === 1 ? '1 version' : `${w.versions.length} versions` })),
  onChange: (work) => {
    const next = pickVersion(works, work, null)
    if (next && !recording) void open(next, true)
    // A pick refused while a recording runs: the list goes back to what is on the stage.
    else sync()
  },
})
const takeRow = el('div', { class: 'seg wrap', role: 'group', 'aria-label': 'Version' })
const takeField = el('div', { class: 'field' }, [el('label', {}, [el('span', {}, ['Version'])]), takeRow])
let takeChips: { version: Version; b: HTMLButtonElement }[] = []
const about = el('div', { class: 'readout' })
const empty = el('div', { class: 'status' }, [
  'No shows yet. A show is a file: apps/rube/src/shows/versions/<work>/<take>.show.ts.',
])
showCard.append(workList.node, takeField, about, empty)

// The one thing to do on a stage that is standing still at either end of a show.
const bigPlayLabel = el('span', {}, ['Play'])
const bigPlay = el('button', { type: 'button', class: 'stage-play' }, [icon(ICON.play), bigPlayLabel, el('kbd', {}, ['space'])])
bigPlay.addEventListener('click', () => {
  bigPlay.blur()
  void play()
})
stageRoot.append(bigPlay)

// Transport — the clock, over the whole show.
const transportSec = section(panelRoot, 'Transport', 'transport')
const time = el('span', { class: 'time' }, ['0:00 / 0:00'])
transportSec.querySelector('.section-title')!.append(time)
const scrub = el('input', { type: 'range', class: 'scrub', min: '0', max: '1000', step: '1', value: '0', 'aria-label': 'Position in the show' })
scrub.addEventListener('input', () => {
  if (!transport) return
  pause()
  scrub.style.setProperty('--p', `${Number(scrub.value) / 10}%`)
  seek((Number(scrub.value) / 1000) * transport.duration)
})
guardWheel(panelRoot, scrub)
let scrubbing = false
scrub.addEventListener('pointerdown', () => { scrubbing = true })
window.addEventListener('pointerup', () => { scrubbing = false })
const playBtn = el('button', { class: 'tbtn play', title: 'Play / pause (space)', 'aria-label': 'Play or pause' }, [icon(ICON.pause)])
playBtn.addEventListener('click', toggle)
const speedSeg = segmented(SHOW_SPEEDS, (v) => `${v}×`, setSpeed)
const musicBtn = el('button', { type: 'button', class: 'chip music' })
musicBtn.addEventListener('click', () => setMuted(!muted))
const restartBtn = el('button', { title: 'Back to the top of the show (Home)' }, ['Restart'])
restartBtn.addEventListener('click', () => seek(0))
const overviewBtn = el('button', { title: 'Zoom out to the whole world (O)', 'aria-pressed': 'false' }, ['Overview', el('kbd', {}, ['O'])])
overviewBtn.addEventListener('click', () => setOverview(!overview))
const transportNote = el('div', { class: 'status' })
transportSec.append(scrub, el('div', { class: 'row deck' }, [playBtn, speedSeg.node, musicBtn]), el('div', { class: 'row' }, [restartBtn, overviewBtn]), transportNote)

// Export — the frame, and the show. Picture and music; nothing written on either.
const exportSec = section(panelRoot, 'Export')
const dims = el('span', { class: 'dims' }, ['—'])
exportSec.querySelector('.section-title')!.append(dims)
const sizeSeg = segmented(FRAME_SIZES.map((_, i) => i), (i) => FRAME_SIZES[i].label, (i) => {
  size = FRAME_SIZES[i]
  sync()
})
const exportName = (): string => `contraptions-show-${current?.work}-${current?.take}`
const pngBtn = el('button', { title: 'This frame as a PNG: the picture alone, nothing written on it' }, ['Save PNG'])
pngBtn.addEventListener('click', () => {
  if (!perf || !transport || recording) return
  const at = transport.now()
  void stage.savePng(`${exportName()}-${at.toFixed(2)}s`, size, at).then(
    () => {
      pngBtn.classList.add('ok')
      pngBtn.textContent = 'Saved'
      window.setTimeout(() => {
        pngBtn.textContent = 'Save PNG'
        pngBtn.classList.remove('ok')
      }, 1200)
    },
    (err) => say(exportNote, err instanceof Error ? err.message : String(err), 'bad'),
  )
})
const videoBtn = el('button', {}, ['Save video'])
const exportNote = el('div', { class: 'status' })
function say(node: HTMLElement, text: string, tone: 'ok' | 'bad' | '' = ''): void {
  node.textContent = text
  if (tone) node.dataset.tone = tone
  else delete node.dataset.tone
}
videoBtn.addEventListener('click', () => {
  // A recording under way: its button is the way to stop it.
  if (recording) {
    recording.abort()
    return
  }
  if (!perf) return
  pause()
  // The press the browser was waiting for has now been made.
  blocked = false
  const mine = (recording = new AbortController())
  const name = `${exportName()}${speed === 1 ? '' : `-${speed}x`}`
  say(exportNote, 'Playing the show through once to record it. Keep this tab in front.')
  sync()
  void stage
    .saveVideo(name, size, speed, !muted, mine.signal, (done) => {
      videoBtn.textContent = `Stop · ${Math.round(done * 100)}%`
    })
    .then(
      (saved) => say(exportNote, saved ? 'Saved: picture and music, nothing written on it.' : 'Stopped. No file was kept.', saved ? 'ok' : ''),
      (err) => {
        console.error(err)
        say(exportNote, err instanceof Error ? err.message : String(err), 'bad')
      },
    )
    .finally(() => {
      recording = null
      sync()
    })
})
exportSec.append(el('div', { class: 'row export-row' }, [sizeSeg.node, pngBtn, videoBtn]), exportNote)

const playIcon = icon(ICON.play)
const pauseIcon = icon(ICON.pause)
music.onChange(() => sync())

function sync(): void {
  const work = works.find((w) => w.work === current?.work) ?? null
  const busy = recording !== null
  const playing = transport?.playing ?? false
  const ready = perf !== null

  // The picker.
  empty.hidden = works.length > 0
  workList.node.hidden = takeField.hidden = about.hidden = works.length === 0
  if (current) workList.set(current.work)
  workList.node.classList.toggle('disabled', busy)
  if (work && (takeChips.length !== work.versions.length || takeChips.some((c, i) => c.version !== work.versions[i]))) {
    takeChips = work.versions.map((version) => {
      const b = el('button', { type: 'button', title: version.note ?? version.label }, [version.label])
      b.addEventListener('click', () => {
        if (version !== current && !recording) void open(version, true)
      })
      return { version, b }
    })
    takeRow.replaceChildren(...takeChips.map((c) => c.b))
  }
  for (const { version, b } of takeChips) {
    b.classList.toggle('on', version === current)
    b.disabled = busy
  }
  const lines: (Node | string)[] = []
  if (current) {
    lines.push(el('b', {}, [`${current.title} · ${current.label}`]))
    if (loading) lines.push(el('br'), 'Loading…')
    else if (failed) lines.push(el('br'), `Would not load: ${failed}`)
    else {
      if (current.note) lines.push(el('br'), current.note)
      const credit = perf?.soundtrack?.credit
      if (credit) {
        const href = perf?.soundtrack?.href
        lines.push(el('br'), href ? el('a', { href, target: '_blank', rel: 'noreferrer', class: 'more' }, [credit]) : credit)
      }
    }
  }
  about.replaceChildren(...lines)
  document.title = current ? `${current.title}, ${current.label} · contraptions` : 'contraptions · shows'

  // The transport.
  transportSec.hidden = exportSec.hidden = works.length === 0
  playBtn.replaceChildren(playing ? pauseIcon : playIcon)
  playBtn.classList.toggle('paused', !playing)
  playBtn.disabled = restartBtn.disabled = scrub.disabled = !ready || busy
  overviewBtn.disabled = !ready || busy
  overviewBtn.classList.toggle('on', overview)
  overviewBtn.setAttribute('aria-pressed', String(overview))
  speedSeg.set(speed)
  for (const b of speedSeg.node.querySelectorAll('button')) b.disabled = busy
  const hasMusic = !!perf?.soundtrack && music.state() !== 'failed'
  musicBtn.disabled = !hasMusic
  musicBtn.classList.toggle('on', hasMusic && !muted)
  musicBtn.replaceChildren(hasMusic ? (muted ? 'Music off' : 'Music on') : 'No music', ...(hasMusic ? [el('kbd', {}, ['M'])] : []))
  musicBtn.title = hasMusic ? (muted ? 'Turn the music on (M)' : 'Turn the music off (M). The show keeps its time; a saved video keeps its music.') : 'This version has no soundtrack'
  say(
    transportNote,
    perf?.soundtrack && music.state() === 'failed'
      ? 'The soundtrack would not load. The show runs silent, on the wall clock.'
      : blocked
        ? 'The browser wants a press before it plays music. Press play.'
        : '',
    perf?.soundtrack && music.state() === 'failed' ? 'bad' : '',
  )

  // The stage's own play button: at the top, at the end, or where the browser is waiting for a press.
  const t = transport?.now() ?? 0
  const atEnd = !!transport && t >= transport.duration
  bigPlay.hidden = !ready || playing || busy || !(blocked || t <= 0 || atEnd)
  bigPlayLabel.textContent = atEnd ? 'Replay' : 'Play'

  // Export.
  sizeSeg.set(FRAME_SIZES.indexOf(size))
  const canRecord = recordingFormat(!!perf?.soundtrack) !== null
  pngBtn.disabled = !ready || busy
  videoBtn.disabled = !ready || !canRecord
  videoBtn.classList.toggle('stop', busy)
  if (!busy) videoBtn.textContent = 'Save video'
  const length = perf ? clockText(perf.duration / speed) : ''
  dims.textContent = perf ? `${size.w} × ${size.h} · ${length}${speed === 1 ? '' : ` at ${speed}×`}` : '—'
  videoBtn.title = busy
    ? 'Stop the recording. No file is kept.'
    : canRecord
      ? `The whole show as a video${perf?.soundtrack ? ', picture and music' : ''}, nothing written on it. It is played through once to be recorded, so it takes ${length}${speed === 1 ? '' : ` at ${speed}×`}.`
      : 'Video export needs a browser that can record the canvas.'
}

// The clock prints whole seconds; writing it on every frame is wasted work.
let lastTime = ''
function tick(): void {
  if (transport) {
    const t = transport.now()
    if (transport.playing && t >= transport.duration) {
      pause()
    }
    const text = `${clockText(t)} / ${clockText(transport.duration)}`
    if (text !== lastTime) {
      lastTime = text
      time.textContent = text
    }
    if (!scrubbing) {
      const p = t / transport.duration
      scrub.value = String(Math.round(p * 1000))
      scrub.style.setProperty('--p', `${p * 100}%`)
    }
    // Leaving the top hides the stage's play button, and coming back to it shows it.
    const wantBig = !transport.playing && !recording && (blocked || t <= 0 || t >= transport.duration)
    if (wantBig === bigPlay.hidden) sync()
  }
  requestAnimationFrame(tick)
}
requestAnimationFrame(tick)

/* ------------------------------------------------------------------ keys */

window.addEventListener('keydown', (e) => {
  // Never shadow browser chrome (cmd+S, ctrl+R, ...).
  if (e.metaKey || e.ctrlKey || e.altKey) return
  const t = e.target
  if (t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement) return
  if (t instanceof HTMLButtonElement && (e.key === ' ' || e.key === 'Enter')) return
  if (e.key === 'p') {
    shell.toggle()
    return
  }
  // A recording owns the show until it is done or stopped.
  if (recording) return
  switch (e.key) {
    case ' ':
      e.preventDefault()
      toggle()
      break
    case 'm':
      if (perf?.soundtrack) setMuted(!muted)
      break
    case 'o':
    case 'O':
      if (perf) setOverview(!overview)
      break
    case '1':
      setSpeed(1)
      break
    case '2':
      setSpeed(2)
      break
    case '[':
      step(-1)
      break
    case ']':
      step(1)
      break
    case 'Home':
      seek(0)
      break
    case 'ArrowRight':
      if (!transport) break
      pause()
      seek(transport.now() + (e.shiftKey ? 1 : 1 / 60))
      break
    case 'ArrowLeft':
      if (!transport) break
      pause()
      seek(transport.now() - (e.shiftKey ? 1 : 1 / 60))
      break
  }
})

writeUrl()
sync()
if (current) void open(current, true)

// Dev handle for scripted capture.
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).shows = {
    works,
    play,
    pause,
    seek,
    setSpeed,
    setMuted,
    setOverview,
    open: (work: string, take: string | null = null) => {
      const v = pickVersion(works, work, take)
      return v ? open(v, false) : Promise.resolve()
    },
    now: () => transport?.now() ?? 0,
    state: () => ({ version: current ? `${current.work}/${current.take}` : null, playing: transport?.playing ?? false, speed, muted, overview, blocked, loading, failed, music: music.state(), heard: music.position(), duration: perf?.duration ?? 0, recording: recording !== null }),
    togglePanel: () => shell.toggle(),
    canvas: () => stageRoot.querySelector('canvas') as HTMLCanvasElement,
  }
}
