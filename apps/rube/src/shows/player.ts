import '../../../../src/ui/styles.css'
import { ICON, el, guardWheel, icon, section, segmented, speedPicker, type Shell } from '../../../../src/ui/shell'
import { createListbox } from '../../../../src/ui/listbox'
import { Transport, clockText } from './clock'
import { discoverShows } from './discover'
import { recordingFormat } from './record'
import { performanceProblems, pickVersion, shelves, type Performance, type TitleCard, type Version } from './registry'
import { showCard as shareCard, showFromPath, showPath } from './share'
import { createSoundtrack, prefetchSoundtrack } from './soundtrack'
import './youtube.css'
import { FRAME_SIZES, createShowStage, type FrameSize } from './stage'

/**
 * The entry: Shows. Machine set to music — a machine choreographed to a
 * piece of music, the soundtrack locked to it — in the same chrome as the
 * other modes: brand, mode switch, and then the show's own sections. Which
 * show and which version of it, since the same music may have several takes
 * side by side (`registry.ts`); a transport over the whole show, from ¼× to
 * 4×, with the music on unless it is turned off; and Export, which saves the
 * frame or the whole show as **picture and music only**. Nothing is ever
 * written on a show's canvas (`stage.ts`), so what is in the panel — the
 * title, the credit, the clock — is in the panel and nowhere else.
 *
 * A show has its own address, `/shows/<work>/` or `/shows/<work>/<take>/`,
 * a page of its own with its own share card (`share.ts`), and the address
 * bar keeps to it as the show changes, so a link is a take.
 * `?show=<work>&take=<take>` still names one. `/shows/` with no work opens
 * Clair de Lune, Take B.
 *
 * The stage is the play button: a click or a tap anywhere on it plays or
 * pauses. On a phone the panel stacks under the stage and would cover half
 * the show, so it goes away while a show plays and comes back when it is
 * paused. At a desk the panel's handle stands out on the edge while paused.
 *
 * The panel reads as the show's title card and its player: the title (the
 * picker too) in the face of the credits, the take and a line on it, then
 * the bar and one deck of controls, each doing one thing, then Export.
 *
 * A show opens playing, music and all, where the browser lets it. Where it
 * wants a gesture first, the show waits at the top with a play button on
 * the stage, and starts with its music on the first press: it never runs
 * on silently towards a sound that comes in late. A link that names the
 * show is the exception. That visit should already be going when it is
 * seen: sound if the browser allows it, and if it does not, the picture
 * anyway, with the sound brought in on the next click or key — and a
 * Sound button on the stage so a phone with the panel away still says so.
 *
 * Theater (`theater.ts`) runs this same player with a host: the host picks
 * each show, keeps its own address, adds its own section to the panel, and
 * is told when a show has played through so it can put on the next. Its
 * door is on this player (T): Theater is a way of watching Shows, not a tab.
 */

/** What runs the player when the visitor is not the one choosing the show. */
export interface ShowsHost {
  /** The address the player keeps to, in place of the show's own. */
  path: string
  /** The take to open with, handed the one the address named, if it named one. */
  first(named: Version | null): Version | null
  /** The take after this one: a show has played through, or is being skipped. Null leaves the stage as it is. */
  next(): Version | null
  /** The host's own section in the panel, after the Show card. `skip` puts the next take on now; `play` puts this one on. */
  panel(root: HTMLElement, skip: () => void, play: (version: Version) => void): void
  /** A take is going on the stage. */
  opened?(version: Version): void
  /** The take `next()` would give, without moving on: loaded, and its music fetched, while this one plays. */
  upNext?(): Version | null
}

/** How long a show has played before the next one is fetched: the one on the stage has the line to itself first. */
const WARM_NEXT = 15000

/** Where the camera stands, widest first: the whole world, the ball followed, or close on it. */
type Camera = 'overview' | 'follow' | 'zoom'
const CAMERAS: readonly { name: Camera; label: string; title: string }[] = [
  { name: 'overview', label: 'Overview', title: 'Zoom out to the whole world (O)' },
  { name: 'follow', label: 'Follow', title: 'Follow the ball, as the show was framed' },
  { name: 'zoom', label: 'Zoom', title: 'Zoom in on the action (Z)' },
]

/** Every take the page found, once: Shows and Theater hold the same versions, so a load is shared between them. */
export const { works, problems } = discoverShows()
for (const problem of problems) console.warn(`shows: ${problem}`)

/** One visit. The chrome is already up; this fills the stage and the panel, and the return stops the music. */
export function start(shell: Shell, host?: ShowsHost): () => void {
  const stageRoot = document.getElementById('stage')!
  const panelRoot = shell.body
  let alive = true

  const params = new URLSearchParams(location.search)
/** The address named a show on arrival. A tab into Shows does not: the show is chosen here. */
const pathShow = showFromPath(location.pathname)
// Theater is always a named visit: a room walked into to watch, which should already be going.
const linked = !!pathShow || !!params.get('show') || !!host

/* ------------------------------------------------------------------ state */

let current: Version | null = host
  ? host.first(params.get('show') ? pickVersion(works, params.get('show'), params.get('take')) : null)
  : pathShow
    ? pickVersion(works, pathShow.work, pathShow.take)
    : pickVersion(works, params.get('show'), params.get('take'))
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
/** The link is playing, and the browser is holding the sound until a gesture. Not the visitor's own mute. */
let soundHeld = false
let releaseSound = (): void => {}
/** When a press last only brought the held sound in, so the same press does not also pause the stage. */
let joinedAt = 0
let overview = false
let zoom = false
let size: FrameSize = FRAME_SIZES.find((s) => s.label === '1080p') ?? FRAME_SIZES[FRAME_SIZES.length - 1]
let recording: AbortController | null = null

// YouTube's player for the music, where a version names its upload. Shown, in the Show card: its terms want it seen.
const playerHost = el('div', { class: 'yt-host' })
playerHost.hidden = true
/** `?music=file` plays the site's own file even where YouTube could, to hear the two side by side. */
const musicPrefer = params.get('music') === 'file' ? 'file' : 'youtube'
const music = createSoundtrack(playerHost, musicPrefer)
const stage = createShowStage(stageRoot, { time: () => transport?.now() ?? 0 })
/** A version is loaded once: its machine and its music are the same every time it is come back to. */
const loads = new Map<Version, Promise<Performance>>()

function loadOf(version: Version): Promise<Performance> {
  let load = loads.get(version)
  if (!load) {
    load = version.load()
    loads.set(version, load)
  }
  return load
}

/** The host's next take, readied in the background so the handover to it is not cold. */
let warmTimer = 0
function warmNext(): void {
  window.clearTimeout(warmTimer)
  const mine = generation
  warmTimer = window.setTimeout(() => {
    const up = host?.upNext?.()
    if (!alive || mine !== generation || !up || up === current) return
    loadOf(up).then(
      (p) => prefetchSoundtrack(p.soundtrack, musicPrefer),
      // Tried again, for real, when it comes up.
      () => loads.delete(up),
    )
  }, WARM_NEXT)
}

/** The show's own address (`share.ts`), keeping only the dev's `?music=`. */
function writeUrl(): void {
  const q = new URLSearchParams()
  const musicParam = params.get('music')
  if (musicParam) q.set('music', musicParam)
  const query = q.toString()
  const path = host ? host.path : current ? showPath(works, current.work, current.take) : '/shows/'
  history.replaceState(history.state, '', `${path}${query ? `?${query}` : ''}`)
}

/* ------------------------------------------------------------------ transport */

/** A phone: the panel stacks under the stage. */
const phone = window.matchMedia('(max-width: 820px)')

async function play(): Promise<void> {
  if (!transport || recording) return
  if (transport.ended) seek(0)
  blocked = false
  const from = transport.now()
  transport.play()
  sync()
  const mine = generation
  const result = await music.play(from)
  if (!alive || mine !== generation || result !== 'blocked') return
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

// A pause by hand, so the press that picks the show back up is known from its first start. On a phone that press puts
// the panel away at once, before the picture has moved a frame; the pause that brought the panel out stays as it was.
let pausedByHand = false
function toggle(): void {
  if (transport?.playing) {
    pausedByHand = true
    pause()
    return
  }
  if (pausedByHand && phone.matches) shell.setPanel(false)
  pausedByHand = false
  void play()
}

function seek(t: number): void {
  if (!transport) return
  lastT = transport.seek(t)
  music.seek(lastT)
}

function setSpeed(next: number): void {
  speed = next
  transport?.setSpeed(next)
  music.setSpeed(next)
  sync()
}

function setMuted(next: boolean): void {
  muted = next
  if (!next) soundHeld = false
  music.setMuted(next)
  sync()
}

/**
 * A named link. Play it as it was meant to be heard. If the browser refuses
 * the sound, keep the picture going with the sound held — muted, when the
 * browser allows that — and bring the sound in on the next click or key.
 * The picture does not wait on the play button.
 */
async function playLinked(): Promise<void> {
  const mine = generation
  await play()
  if (!alive || mine !== generation || !blocked) return
  soundHeld = true
  setMuted(true)
  await play()
  if (!alive || mine !== generation) return
  if (blocked) {
    // Silence was refused too. Run the picture on the wall clock; the sound
    // catches it at the next gesture instead of the visit sitting still.
    blocked = false
    transport?.play()
    sync()
  }
  armSound()
}

/** The sound is held. The next gesture starts it where the picture is, and a control whose job is the sound keeps that job. */
function armSound(): void {
  releaseSound()
  const join = () => {
    if (transport && perf?.soundtrack) void music.play(transport.now())
  }
  const unlock = (e: Event) => {
    const key = e instanceof KeyboardEvent ? e.key : ''
    const musicControl = (e.target instanceof Element && !!e.target.closest('button.music')) || key === 'm' || key === 'M'
    releaseSound()
    if (!alive || !soundHeld) return
    // The music control does the unmuting itself, and starts the sound with it.
    if (musicControl) return
    soundHeld = false
    joinedAt = performance.now()
    if (muted) setMuted(false)
    // Space would also pause. The gesture only owed the sound; the picture stays.
    if ((key === ' ' || key === 'Enter') && transport?.playing) {
      e.preventDefault()
      e.stopImmediatePropagation()
    }
    join()
  }
  releaseSound = () => {
    window.removeEventListener('pointerdown', unlock, true)
    window.removeEventListener('keydown', unlock, true)
  }
  window.addEventListener('pointerdown', unlock, true)
  window.addEventListener('keydown', unlock, true)
}

function setOverview(on: boolean): void {
  overview = on
  if (on) zoom = false
  stage.setOverview(on)
  stage.setZoom(zoom)
  sync()
}

function setZoom(on: boolean): void {
  zoom = on
  if (on) overview = false
  stage.setZoom(on)
  stage.setOverview(overview)
  sync()
}

function setCamera(next: Camera): void {
  overview = next === 'overview'
  zoom = next === 'zoom'
  stage.setOverview(overview)
  stage.setZoom(zoom)
  sync()
}

/** Put a version on the stage from the top, and start it if asked. */
async function open(version: Version, thenPlay: boolean | 'link'): Promise<void> {
  if (!alive) return
  const mine = ++generation
  pausedByHand = false
  // The hold belonged to the arrival. A show chosen from here is heard the way the visitor left the sound.
  if (soundHeld) {
    soundHeld = false
    muted = false
    music.setMuted(false)
  }
  releaseSound()
  music.load(null)
  stage.set(null)
  perf = null
  transport = null
  current = version
  host?.opened?.(version)
  loading = true
  failed = ''
  blocked = false
  writeUrl()
  sync()
  try {
    const loaded = await loadOf(version)
    if (!alive || mine !== generation) return
    const wrong = performanceProblems(loaded)
    if (wrong.length) throw new Error(wrong.join(', '))
    perf = loaded
    transport = new Transport({ duration: loaded.duration, heard: () => music.position(), loop: !!loaded.loop })
    transport.setSpeed(speed)
    lastT = 0
    music.load(loaded.soundtrack ?? null)
    stage.set(loaded)
    if (host?.upNext) warmNext()
  } catch (err) {
    if (!alive || mine !== generation) return
    // A version that would not load may load next time; one that loaded wrong will not.
    loads.delete(version)
    console.error(err)
    failed = err instanceof Error ? err.message : String(err)
  }
  loading = false
  sync()
  if (!perf || !thenPlay) return
  if (thenPlay === 'link') void playLinked()
  else void play()
}

/** The take before or after this one, round the takes of this work. */
function step(dir: 1 | -1): void {
  if (host) return
  const work = works.find((w) => w.work === current?.work)
  if (!work || work.versions.length < 2 || recording) return
  const i = work.versions.indexOf(current!)
  void open(work.versions[(i + dir + work.versions.length) % work.versions.length], true)
}

/** A take the visitor picked out of the host's list, on now: the way the host's own next goes on. */
function playNow(version: Version): void {
  if (recording) return
  void open(version, 'link')
}

/** The host's next take, on now. A pool of one plays it again. */
function advance(): void {
  if (!host || recording) return
  const next = host.next()
  if (next) void open(next, 'link')
}

/* ------------------------------------------------------------------ panel */


// Show — which music, and which take of it. It leads, as the seed does elsewhere: a title card, its title in the face
// of the show's own credits. The title is the picker, so the name is said once; a take row stands under it only
// where there are takes to choose between.
const showCard = el('section', { class: 'seed-card show-card' })
panelRoot.append(showCard)
const workList = createListbox({
  label: 'Show',
  value: current?.work ?? '',
  // On their shelves (`registry.ts`): Machine, Movies, Ambient.
  items: shelves(works).flatMap((s) => s.works.map((w) => ({ value: w.work, label: w.title, group: s.section }))),
  onChange: (work) => {
    const next = pickVersion(works, work, null)
    // Under a host a pick goes on as its next one would, and the running order carries on after it.
    if (next && !recording) void open(next, host ? 'link' : true)
    // A pick refused while a recording runs: the list goes back to what is on the stage.
    else sync()
  },
})
workList.node.classList.add('show-title')
const takeRow = el('div', { class: 'seg wrap takes', role: 'group', 'aria-label': 'Take' })
let takeChips: { version: Version; b: HTMLButtonElement }[] = []
const about = el('div', { class: 'about' })
const empty = el('div', { class: 'status' }, [
  'No shows yet. A show is a file: apps/rube/src/shows/versions/<work>/<take>.show.ts.',
])
// Under a host the title is still the picker: the host chooses what comes next, and any show can be put on now.
if (host) showCard.append(el('div', { class: 'section-title' }, ['Now playing']))
showCard.append(workList.node, takeRow, about, playerHost, empty)

// The one thing to do on a stage that is standing still at either end of a show.
const bigPlayLabel = el('span', {}, ['Play'])
const bigPlay = el('button', { type: 'button', class: 'stage-play' }, [icon(ICON.play), bigPlayLabel, el('kbd', {}, ['space'])])
bigPlay.addEventListener('click', () => {
  bigPlay.blur()
  if (soundHeld) {
    soundHeld = false
    joinedAt = performance.now()
    setMuted(false)
    if (transport && perf?.soundtrack) void music.play(transport.now())
    return
  }
  void play()
})
stageRoot.append(bigPlay)

// While a show loads, or when it would not, the stage says so: the panel says it too, but the panel starts hidden,
// and a blank stage reads as broken. A failed load is tried again by a reload: the browser keeps a module that would
// not fetch as failed for the life of the page, so asking again here gets the same answer. The address is the show.
const stageNoteText = el('span')
const retryBtn = el('button', { type: 'button' }, ['Reload'])
retryBtn.addEventListener('click', () => location.reload())
const stageNote = el('div', { class: 'stage-note', role: 'status' }, [stageNoteText, retryBtn])
stageNote.hidden = true
stageRoot.append(stageNote)

// The stage is the play button. Not a press on something standing on it, and not the press that only brought the
// held sound in: that one owed the sound, and the picture keeps going.
// The stage outlives this visit, so the listener is taken off it on the way out.
const onStageClick = (e: MouseEvent) => {
  if (!alive || !transport || recording || e.button !== 0) return
  if (e.target instanceof Element && e.target.closest('button, a, iframe, input')) return
  if (performance.now() - joinedAt < 700) return
  toggle()
}
stageRoot.addEventListener('click', onStageClick)

// On a phone the panel stacks under the stage: away while a show plays, back when it stops. At a desk the panel's
// handle stands out while paused. Only on a change, so the panel can still be opened or closed by hand in between.
let wasPlaying: boolean | null = null
function followPanel(playing: boolean): void {
  if (playing === wasPlaying) return
  wasPlaying = playing
  if (phone.matches) shell.setPanel(!playing)
  shell.holdHandle(!playing)
}

// Transport — the clock, over the whole show, right under the title it plays: the bar, then one deck, as a player
// has. What runs it on the left (play, back to the top, where it is); how it is heard on the right (sound, speed).
// Every control here is one job, its key in its title.
const transportSec = el('section', { class: 'group transport', 'aria-label': 'Transport' })
panelRoot.append(transportSec)
const time = el('span', { class: 'time' }, ['0:00 / 0:00'])
const scrub = el('input', { type: 'range', class: 'scrub', min: '0', max: '1000', step: '1', value: '0', 'aria-label': 'Position in the show' })
scrub.addEventListener('input', () => {
  if (!transport) return
  pause()
  scrub.style.setProperty('--p', `${Number(scrub.value) / 10}%`)
  seek((Number(scrub.value) / 1000) * transport.duration)
})
guardWheel(shell.root, scrub)
let scrubbing = false
scrub.addEventListener('pointerdown', () => { scrubbing = true })
const endScrub = () => { scrubbing = false }
window.addEventListener('pointerup', endScrub)
// A touch that turns into a pan of the panel ends in a cancel, not an up: without this the bar stops following the show.
window.addEventListener('pointercancel', endScrub)
const playBtn = el('button', { class: 'tbtn play', title: 'Play / pause (space)', 'aria-label': 'Play or pause' }, [icon(ICON.pause)])
playBtn.addEventListener('click', toggle)
const speedBox = speedPicker(setSpeed)
const musicBtn = el('button', { type: 'button', class: 'tbtn music', 'aria-label': 'Music' })
musicBtn.addEventListener('click', () => {
  if (!soundHeld) {
    setMuted(!muted)
    return
  }
  soundHeld = false
  setMuted(false)
  if (transport && perf?.soundtrack) void music.play(transport.now())
})
const restartBtn = el('button', { type: 'button', class: 'tbtn', title: 'Back to the top of the show (Home)', 'aria-label': 'Restart' }, [icon(ICON.restart)])
restartBtn.addEventListener('click', () => seek(0))
// Overview and Zoom were two toggles that turned each other off: one choice of three, so one control.
const cameraSeg = segmented(CAMERAS.map((_, i) => i), (i) => CAMERAS[i].label, (i) => setCamera(CAMERAS[i].name))
cameraSeg.node.classList.add('camera')
cameraSeg.node.setAttribute('aria-label', 'Camera')
const cameraButtons = [...cameraSeg.node.querySelectorAll('button')]
cameraButtons.forEach((b, i) => (b.title = CAMERAS[i].title))
// Theater is a way of watching Shows, not a mode beside it, so its door is on the player: in, with the show that is
// on going first and the rest shuffled after it; out, to the page of whichever show is on by then.
const doorBtn = el('button', { type: 'button', class: 'chip' })
if (host) {
  doorBtn.title = 'Back to Shows, on the show that is on (T)'
  doorBtn.replaceChildren(icon(ICON.shows), 'Leave theater', el('kbd', {}, ['T']))
} else {
  doorBtn.title = 'Theater: every show, shuffled, one after another, starting with this one (T)'
  doorBtn.replaceChildren(icon(ICON.theater), 'Theater', el('span', { class: 'door-note' }, ['every show, shuffled']), el('kbd', {}, ['T']))
}
function goThrough(): void {
  if (!alive || recording) return
  if (host) shell.go('shows', current ? showPath(works, current.work, current.take) : '/shows/')
  else shell.go('theater', current ? `/theater/?show=${current.work}&take=${current.take}` : '/theater/')
}
doorBtn.addEventListener('click', goThrough)
const transportNote = el('div', { class: 'status' })
transportSec.append(
  scrub,
  el('div', { class: 'row deck player' }, [playBtn, restartBtn, time, musicBtn, speedBox.node]),
  cameraSeg.node,
  el('div', { class: 'row door' }, [doorBtn]),
  transportNote,
)
// A host's own section (Theater: what is next, and the running order) follows the controls for what is on now.
host?.panel(panelRoot, advance, playNow)

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
  const words = credited() ? ', and the credits' : ', nothing written on it'
  say(exportNote, 'Playing the show through once to record it. Keep this tab in front.')
  sync()
  void stage
    .saveVideo(name, size, speed, !muted, mine.signal, (done) => {
      videoBtn.textContent = `Stop · ${Math.round(done * 100)}%`
    })
    .then(
      (saved) => say(exportNote, saved ? `Saved: picture and music${words}.` : 'Stopped. No file was kept.', saved ? 'ok' : ''),
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
exportSec.append(el('div', { class: 'row export-row frames' }, [sizeSeg.node, pngBtn, videoBtn]), exportNote)

const playIcon = icon(ICON.play)
const pauseIcon = icon(ICON.pause)
const soundIcon = icon(ICON.sound)
const mutedIcon = icon(ICON.muted)
music.onChange(() => sync())
// A press on YouTube's own player moves the show with it.
music.onPlayer((playing) => {
  // A recording owns the show, and plays the file: YouTube's player is put back to silence.
  if (recording || !transport) {
    if (playing) music.pause()
    return
  }
  if (playing && !transport.playing) void play()
  else if (!playing && transport.playing) pause()
})

function sync(): void {
  const work = works.find((w) => w.work === current?.work) ?? null
  const busy = recording !== null
  const playing = transport?.playing ?? false
  const ready = perf !== null

  // The title card.
  empty.hidden = works.length > 0
  workList.node.hidden = takeRow.hidden = works.length === 0
  // A work with one take has no takes to pick between: no row.
  if (!work || work.versions.length < 2) takeRow.hidden = true
  if (current) workList.set(current.work)
  workList.node.classList.toggle('disabled', busy)
  if (work && (takeChips.length !== work.versions.length || takeChips.some((c, i) => c.version !== work.versions[i]))) {
    takeChips = work.versions.map((version) => {
      const b = el('button', { type: 'button', title: version.note ?? version.label }, [version.label])
      b.addEventListener('click', () => {
        if (version !== current && !recording) void open(version, host ? 'link' : true)
      })
      return { version, b }
    })
    takeRow.replaceChildren(...takeChips.map((c) => c.b))
  }
  for (const { version, b } of takeChips) {
    b.classList.toggle('on', version === current)
    b.disabled = busy
  }
  // Under the title, in the panel's own face: what this take is, and whose music. The title is not said again.
  const lines: HTMLElement[] = []
  if (current) {
    if (loading) lines.push(el('p', {}, ['Loading…']))
    else if (failed) lines.push(el('p', { class: 'bad' }, [`Would not load: ${failed}`]))
    else {
      if (current.note) lines.push(el('p', {}, [current.note]))
      const credit = perf?.soundtrack?.credit
      if (credit) {
        const href = perf?.soundtrack?.href
        lines.push(el('p', { class: 'by' }, [href ? el('a', { href, target: '_blank', rel: 'noreferrer' }, [credit]) : credit]))
      }
    }
  }
  about.replaceChildren(...lines)
  about.hidden = !lines.length
  // The tab says what a link to it says (`share.ts`).
  document.title = host
    ? `${current ? `${current.title} · ` : ''}Theater · contraptions`
    : (current && shareCard(works, current.work, current.take)?.title) || 'Shows · contraptions'

  // The transport.
  transportSec.hidden = exportSec.hidden = works.length === 0
  // Theater is for watching: no export.
  if (host) exportSec.hidden = true
  playBtn.replaceChildren(playing ? pauseIcon : playIcon)
  playBtn.classList.toggle('paused', !playing)
  playBtn.disabled = restartBtn.disabled = scrub.disabled = !ready || busy
  cameraSeg.set(overview ? 0 : zoom ? 2 : 1)
  for (const b of cameraButtons) b.disabled = !ready || busy
  speedBox.set(speed)
  speedBox.setDisabled(busy)
  doorBtn.disabled = busy
  const hasMusic = !!perf?.soundtrack && music.state() !== 'failed'
  musicBtn.disabled = !hasMusic
  musicBtn.setAttribute('aria-pressed', String(hasMusic && !muted && !soundHeld))
  // Held by the browser, the sound is the one thing to press for, and says so in the accent; otherwise a quiet speaker.
  musicBtn.classList.toggle('held', hasMusic && soundHeld)
  musicBtn.replaceChildren(hasMusic && !muted ? soundIcon : mutedIcon)
  musicBtn.title = hasMusic
    ? soundHeld
      ? 'The browser is holding the sound. Click or press M to bring it in.'
      : muted
        ? 'Turn the music on (M)'
        : 'Turn the music off (M). The show keeps its time; a saved video keeps its music.'
    : perf?.soundtrack
      ? 'The soundtrack would not load, so the show runs silent'
      : 'This version has no soundtrack'
  say(
    transportNote,
    perf?.soundtrack && music.state() === 'failed'
      ? 'The soundtrack would not load. The show runs silent, on the wall clock.'
      : music.fellBack()
        ? "YouTube would not play the music here, so the site's own copy is playing it."
        : perf?.soundtrack && music.source() === 'youtube' && music.state() === 'loading'
          ? 'Loading the music from YouTube…'
          : soundHeld
            ? 'Playing. The browser is holding the sound until the next click or key.'
            : blocked
              ? 'The browser wants a press before it plays music. Press play.'
              : '',
    perf?.soundtrack && music.state() === 'failed' ? 'bad' : '',
  )

  // The stage's own word while there is no show on it.
  stageNote.hidden = !current || !(loading || failed)
  stageNote.classList.toggle('bad', !!failed)
  stageNoteText.textContent = failed ? `${current?.title ?? 'This show'} would not load.` : `Loading ${current?.title ?? 'the show'}…`
  retryBtn.hidden = !failed

  // The stage's own play button: at the top, at the end, where the browser is waiting for a press,
  // or where a deep link is playing with the sound held — the panel may be hidden on a phone, so
  // the stage itself must say that a tap brings the music in.
  const t = transport?.now() ?? 0
  const atEnd = !!transport && !transport.loop && t >= transport.duration
  bigPlay.hidden = !ready || busy || (playing ? !soundHeld : !(blocked || t <= 0 || atEnd))
  bigPlayLabel.textContent = soundHeld ? 'Sound' : atEnd ? 'Replay' : 'Play'

  // Export.
  sizeSeg.set(FRAME_SIZES.indexOf(size))
  const canRecord = recordingFormat(!!perf?.soundtrack?.src) !== null || recordingFormat(false) !== null
  pngBtn.disabled = !ready || busy
  videoBtn.disabled = !ready || !canRecord
  videoBtn.classList.toggle('stop', busy)
  if (!busy) videoBtn.textContent = 'Save video'
  const length = perf ? clockText(perf.duration / speed) : ''
  dims.textContent = perf ? `${size.w} × ${size.h} · ${length}${speed === 1 ? '' : ` at ${speed}×`}` : '—'
  videoBtn.title = busy
    ? 'Stop the recording. No file is kept.'
    : canRecord
      ? `The whole show as a video${perf?.soundtrack?.src ? ', picture and music' : ''}${credited() ? ', with its credits' : ', nothing written on it'}. It is played through once to be recorded, so it takes ${length}${speed === 1 ? '' : ` at ${speed}×`}.`
      : 'Video export needs a browser that can record the canvas.'
}

/* ------------------------------------------------------------------ words over the stage */

/** Whether a video saved now has credits painted in: the show has them, and Overview (which has none) is off. */
function credited(): boolean {
  return !!perf?.titles && !overview
}

// End credits, where a show has them. A show's canvas sets no type, so the page sets them, over the composed
// frame (16:9, whole, centred on the stage), in its own face. Not in Overview. While a video is recorded its frame
// stands over the stage with the same cards painted in (`words.ts`), so these stand down.
const wordsLayer = el('div', { class: 'stage-words', 'aria-hidden': 'true' })
stageRoot.append(wordsLayer)
const wordCards = new Map<string, HTMLElement>()

function buildCard(c: TitleCard): HTMLElement {
  const node = el('div', { class: `${c.title ? 'card title' : 'card'}${c.plain ? ' plain' : ''}` })
  if (c.role) node.append(el('div', { class: 'role' }, [c.role]))
  for (const n of c.names) {
    if (typeof n === 'string') {
      node.append(el('div', { class: 'name' }, [n]))
      continue
    }
    const as = el('span', { class: 'as' }, [n[1]])
    if (n[2]) {
      // A colour, or 'slab:' and a colour for one who is not a ball.
      const slab = n[2].startsWith('slab:')
      const swatch = el('span', { class: slab ? 'swatch slab' : 'swatch' })
      swatch.style.background = slab ? n[2].slice(5) : n[2]
      as.prepend(swatch)
    }
    node.append(el('div', { class: 'cast' }, [el('span', { class: 'who' }, [n[0]]), as]))
  }
  c.notes?.forEach((n, i) => node.append(el('div', { class: i === c.notes!.length - 1 && !c.title && c.notes!.length > 2 ? 'note fine' : 'note' }, [n])))
  return node
}

function renderWords(t: number): void {
  const cards = perf?.titles && !overview && !recording ? perf.titles(t) : []
  const live = new Set(cards.map((c) => c.key))
  for (const [key, node] of wordCards) {
    if (live.has(key)) continue
    node.remove()
    wordCards.delete(key)
  }
  if (!cards.length) return
  const W = stageRoot.clientWidth
  const H = stageRoot.clientHeight
  const fw = Math.min(W, (H * 16) / 9)
  const fh = (fw * 9) / 16
  wordsLayer.style.setProperty('--u', `${fh / 100}px`)
  for (const c of cards) {
    let node = wordCards.get(c.key)
    if (!node) {
      node = buildCard(c)
      wordsLayer.append(node)
      wordCards.set(c.key, node)
    }
    node.style.left = `${(W - fw) / 2 + c.at[0] * fw}px`
    const lift = c.lift ? c.lift * Math.max(0, (H - fh) / 2) : 0
    node.style.top = `${(H - fh) / 2 + (c.at[1] + (c.rise ?? 0) / 100) * fh - lift}px`
    if (c.scale && c.scale !== 1) node.style.setProperty('--u', `${(fh / 100) * c.scale}px`)
    node.style.opacity = c.light.toFixed(3)
    // Out of focus as it comes and goes: it comes into focus as it comes up.
    node.style.filter = c.light > 0.995 ? '' : `blur(${((1 - c.light) * fh * 0.012).toFixed(2)}px)`
  }
}

// The clock prints whole seconds; writing it on every frame is wasted work.
let lastTime = ''
/** Where the clock was on the frame before, so a loop coming round its seam is seen as a pass. */
let lastT = 0
let raf = 0
function tick(): void {
  if (!alive) return
  if (transport) {
    const t = transport.now()
    music.follow(t)
    // Played through: at the end, or, for a loop, round its seam (a seek resets `lastT`, so a jump back is not one).
    const through = transport.playing && (transport.loop ? t < lastT - transport.duration / 2 : t >= transport.duration)
    lastT = t
    if (through && host) {
      advance()
      raf = requestAnimationFrame(tick)
      return
    }
    // A show stops at its end; a loop has none.
    if (transport.playing && !transport.loop && t >= transport.duration) {
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
    const wantBig = !recording && (soundHeld || (!transport.playing && (blocked || t <= 0 || (!transport.loop && t >= transport.duration))))
    if (wantBig === bigPlay.hidden) sync()
    renderWords(t)
    followPanel(transport.playing)
  }
  raf = requestAnimationFrame(tick)
}
raf = requestAnimationFrame(tick)

/* ------------------------------------------------------------------ keys */

const onKey = (e: KeyboardEvent) => {
  if (!alive) return
  // Never shadow browser chrome (cmd+S, ctrl+R, ...).
  if (e.metaKey || e.ctrlKey || e.altKey) return
  const t = e.target
  if (t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement) return
  if (t instanceof HTMLButtonElement && (e.key === ' ' || e.key === 'Enter')) return
  // Letter keys are case-blind: Caps Lock must not silence P, M, O or Z.
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
  if (key === 'p') {
    shell.toggle()
    return
  }
  // A recording owns the show until it is done or stopped.
  if (recording) return
  switch (key) {
    case ' ':
      e.preventDefault()
      toggle()
      break
    case 'm':
      if (!perf?.soundtrack) break
      if (soundHeld) {
        soundHeld = false
        setMuted(false)
        if (transport) void music.play(transport.now())
        break
      }
      setMuted(!muted)
      break
    case 'o':
      if (perf) setOverview(!overview)
      break
    case 'z':
      if (perf) setZoom(!zoom)
      break
    case '1':
      setSpeed(1)
      break
    case '2':
      setSpeed(2)
      break
    case '4':
      setSpeed(4)
      break
    case '[':
      step(-1)
      break
    case ']':
      step(1)
      break
    case 'n':
      advance()
      break
    case 't':
      goThrough()
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
}
window.addEventListener('keydown', onKey)

writeUrl()
sync()
if (current) void open(current, linked ? 'link' : true)

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
    setZoom,
    open: (work: string, take: string | null = null) => {
      const v = pickVersion(works, work, take)
      return v ? open(v, false) : Promise.resolve()
    },
    now: () => transport?.now() ?? 0,
    report: () => music.report(),
    state: () => ({ version: current ? `${current.work}/${current.take}` : null, playing: transport?.playing ?? false, speed, muted, soundHeld, overview, zoom, blocked, loading, failed, music: music.state(), source: music.source(), fellBack: music.fellBack(), heard: music.position(), duration: perf?.duration ?? 0, recording: recording !== null }),
    togglePanel: () => shell.toggle(),
    canvas: () => stageRoot.querySelector('canvas') as HTMLCanvasElement,
    /** The version that is up, at `t`, as a PNG data URL `w` × `h`: share cards and their contact sheets. */
    still: async (t: number, w: number, h: number) => {
      const blob = await stage.png({ label: 'card', w, h }, t)
      if (!blob) return null
      return await new Promise<string>((resolve) => {
        const r = new FileReader()
        r.onload = () => resolve(String(r.result))
        r.readAsDataURL(blob)
      })
    },
  }
}

  return () => {
    alive = false
    window.clearTimeout(warmTimer)
    releaseSound()
    shell.holdHandle(false)
    cancelAnimationFrame(raf)
    stageRoot.removeEventListener('click', onStageClick)
    window.removeEventListener('pointerup', endScrub)
    window.removeEventListener('pointercancel', endScrub)
    window.removeEventListener('keydown', onKey)
    recording?.abort()
    music.load(null)
    stage.destroy()
    if (import.meta.env.DEV) delete (window as unknown as Record<string, unknown>).shows
  }
}

