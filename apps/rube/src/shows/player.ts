import '../../../../src/ui/styles.css'
import { ICON, el, guardWheel, icon, playButton, segmented, setOn, speedPicker, type Shell } from '../../../../src/ui/shell'
import { createListbox } from '../../../../src/ui/listbox'
import { Transport, clockText } from './clock'
import { discoverShows } from './discover'
import { recordingFormat } from './record'
import { musicOnYouTube, performanceProblems, pickVersion, placeCard, shelves, type Performance, type TitleCard, type Version } from './registry'
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
 * 4×, with the music on unless it is turned off; and Save video, which saves the
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
 * the bar and one deck of controls, each doing one thing, Save video among them.
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

/** Under a host, a take that would not load is passed over after this long: long enough to read why. */
const SKIP_AFTER = 4000
/** How many takes in a row may fail before a host stops passing over them. */
const SKIP_FAILED = 4
let failedInARow = 0
let skipTimer = 0

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

/**
 * A gesture brings the held sound in, where the picture is. It can be refused even so (a browser that wants the tap
 * inside the player's own frame, as iOS can): then the sound is held again, the picture going on muted and the Sound
 * button back for the next tap, rather than a silent show with nothing to press.
 */
async function soundIn(): Promise<void> {
  soundHeld = false
  joinedAt = performance.now()
  setMuted(false)
  if (!transport || !perf?.soundtrack) return
  const mine = generation
  const result = await music.play(transport.now())
  if (result !== 'blocked' || !alive || mine !== generation || !transport) return
  soundHeld = true
  setMuted(true)
  void music.play(transport.now())
  armSound()
  sync()
}

/** The sound is held. The next gesture starts it where the picture is, and a control whose job is the sound keeps that job. */
function armSound(): void {
  releaseSound()
  const unlock = (e: Event) => {
    const key = e instanceof KeyboardEvent ? e.key : ''
    const musicControl = (e.target instanceof Element && !!e.target.closest('button.music')) || key === 'm' || key === 'M'
    releaseSound()
    if (!alive || !soundHeld) return
    // The music control does the unmuting itself, and starts the sound with it.
    if (musicControl) return
    // Space would also pause. The gesture only owed the sound; the picture stays.
    if ((key === ' ' || key === 'Enter') && transport?.playing) {
      e.preventDefault()
      e.stopImmediatePropagation()
    }
    void soundIn()
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
  // Hold YouTube's box open, at its final size and shimmering, while the show loads, so the card does not jump
  // when the music turns out to be YouTube's (`youtube.css`).
  const tube = musicPrefer === 'youtube' && musicOnYouTube(version.work)
  playerHost.hidden = !tube
  playerHost.classList.toggle('yt-loading', tube)
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
    loaded.dialogue?.(dialogue)
    transport = new Transport({ duration: loaded.duration, heard: () => music.position(), loop: !!loaded.loop })
    transport.setSpeed(speed)
    lastT = 0
    music.load(loaded.soundtrack ?? null)
    stage.set(loaded)
    failedInARow = 0
    if (host?.upNext) warmNext()
  } catch (err) {
    if (!alive || mine !== generation) return
    // A version that would not load may load next time; one that loaded wrong will not.
    loads.delete(version)
    // No show, no music: the box held open for it closes.
    playerHost.hidden = true
    playerHost.classList.remove('yt-loading')
    console.error(err)
    failed = err instanceof Error ? err.message : String(err)
    // Under a host nobody is choosing: the stage says it would not load, then the next one goes on, as it would have
    // at the end. Not round and round a pool where nothing loads (offline): after a few, it waits for a reload.
    if (host && ++failedInARow < SKIP_FAILED) {
      window.clearTimeout(skipTimer)
      skipTimer = window.setTimeout(() => {
        if (alive && mine === generation) advance()
      }, SKIP_AFTER)
    }
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
  // On their shelves (`registry.ts`): Machine, Movies, Ambient, each with its favourites starred and first, and a
  // film's work with the film it is after.
  items: shelves(works).flatMap((s) => s.works.map((w) => ({ value: w.work, label: w.title, aside: w.film, group: s.section, mark: w.favorite === undefined ? undefined : icon(ICON.star) }))),
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
    void soundIn()
    return
  }
  void play()
})
stageRoot.append(bigPlay)
// On a stage much wider than the show's 16:9 (a phone on its side with the panel up, an ultrawide screen) the composed
// frame stands in the middle at full height, and the button, centred low, sat over whoever stands on its floor (Married
// Life's opening couple, hidden behind Sound). Where the world beside the frame has room for it, it goes there.
const besideFrame = new ResizeObserver(() => {
  const w = stageRoot.clientWidth
  const half = (stageRoot.clientHeight * 8) / 9
  const side = w / 2 - half
  bigPlay.style.left = side >= 150 ? `${w / 2 + half + side / 2}px` : ''
})
besideFrame.observe(stageRoot)

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
const { node: playBtn, set: showPaused } = playButton('space')
playBtn.addEventListener('click', toggle)
const speedBox = speedPicker(setSpeed)
const musicBtn = el('button', { type: 'button', class: 'tbtn music', 'aria-label': 'Music' })
musicBtn.addEventListener('click', () => {
  if (!soundHeld) {
    setMuted(!muted)
    return
  }
  void soundIn()
})
// Sound captions, for a show that has them (`Performance.captions`): off unless the viewer turns them on, and
// remembered in this browser.
const CAPTIONS_KEY = 'shows-captions'
let captions = (() => {
  try {
    return localStorage.getItem(CAPTIONS_KEY) === '1'
  } catch {
    return false
  }
})()
const ccState = el('span', { class: 'cc-state' }, ['Off'])
const ccBtn = el('button', { type: 'button', class: 'chip cc', 'aria-label': 'Sound captions' }, [el('span', {}, ['Sound captions']), ccState])
const ccRow = el('div', { class: 'row cc' }, [ccBtn])
function toggleCaptions(): void {
  captions = !captions
  try {
    localStorage.setItem(CAPTIONS_KEY, captions ? '1' : '0')
  } catch {}
  sync()
  if (transport) renderWords(transport.now())
}
ccBtn.addEventListener('click', toggleCaptions)
// Dialogue, for a show that has it (`Performance.dialogue`): off unless the viewer turns it on, and remembered in this
// browser. The show plays straight through without it.
const DIALOGUE_KEY = 'shows-dialogue'
let dialogue = (() => {
  try {
    return localStorage.getItem(DIALOGUE_KEY) === '1'
  } catch {
    return false
  }
})()
const dlState = el('span', { class: 'cc-state' }, ['Off'])
const dlBtn = el('button', { type: 'button', class: 'chip cc', 'aria-label': 'Dialogue' }, [el('span', {}, ['Dialogue']), dlState])
const dlRow = el('div', { class: 'row cc' }, [dlBtn])
function toggleDialogue(): void {
  dialogue = !dialogue
  try {
    localStorage.setItem(DIALOGUE_KEY, dialogue ? '1' : '0')
  } catch {}
  perf?.dialogue?.(dialogue)
  stage.repaint()
  sync()
  if (transport) renderWords(transport.now())
}
dlBtn.addEventListener('click', toggleDialogue)
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
  doorBtn.title = 'Theater: the ticked shows (the favourites to begin with), shuffled, one after another, starting with this one (T)'
  doorBtn.replaceChildren(icon(ICON.theater), 'Theater', el('span', { class: 'door-note' }, ['shows, shuffled']), el('kbd', {}, ['T']))
}
function goThrough(): void {
  if (!alive || recording) return
  if (host) shell.go('shows', current ? showPath(works, current.work, current.take) : '/shows/')
  else shell.go('theater', current ? `/theater/?show=${current.work}&take=${current.take}` : '/theater/')
}
doorBtn.addEventListener('click', goThrough)

// Saving — the frame, and the show. Picture and music; nothing written on either. Save video opens them: the size,
// the frame as a PNG, and the show recorded. While a recording runs, the same button stops it.
const dims = el('div', { class: 'dims' }, ['—'])
const sizeSeg = segmented(FRAME_SIZES.map((_, i) => i), (i) => FRAME_SIZES[i].label, (i) => {
  size = FRAME_SIZES[i]
  sync()
})
sizeSeg.node.setAttribute('aria-label', 'Size')
const exportName = (): string => `contraptions-show-${current?.work}-${current?.take}`
const pngBtn = el('button', { type: 'button', title: 'This frame as a PNG: the picture alone, nothing written on it' }, ['Save PNG'])
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
const recordBtn = el('button', { type: 'button', class: 'primary' }, ['Record video'])
const savePop = el('div', { class: 'save-pop', id: 'save-pop', role: 'dialog', 'aria-label': 'Save' }, [
  dims,
  sizeSeg.node,
  el('div', { class: 'row' }, [pngBtn, recordBtn]),
])
savePop.hidden = true
const videoLabel = el('span', {}, ['Save video'])
const videoChevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
videoChevron.setAttribute('viewBox', '0 0 24 24')
videoChevron.setAttribute('aria-hidden', 'true')
videoChevron.classList.add('lb-chevron')
const videoChev = document.createElementNS('http://www.w3.org/2000/svg', 'path')
videoChev.setAttribute('d', 'M6 9.5l6 6 6-6')
videoChevron.append(videoChev)
const videoBtn = el('button', { type: 'button', 'aria-haspopup': 'dialog', 'aria-controls': 'save-pop', 'aria-expanded': 'false' }, [videoLabel, videoChevron])
const saveRow = el('div', { class: 'row save' }, [videoBtn, savePop])
const exportNote = el('div', { class: 'status' })
function say(node: HTMLElement, text: string, tone: 'ok' | 'bad' | '' = ''): void {
  node.textContent = text
  if (tone) node.dataset.tone = tone
  else delete node.dataset.tone
}
function setSaveOpen(open: boolean, refocus = false): void {
  if (savePop.hidden === !open) return
  savePop.hidden = !open
  videoBtn.setAttribute('aria-expanded', String(open))
  if (open) {
    ;(savePop.querySelector<HTMLButtonElement>('.seg button.on') ?? pngBtn).focus()
    savePop.scrollIntoView({ block: 'nearest' })
  } else if (refocus) videoBtn.focus()
}
// Away from it, by a click or by Tab, puts it away; so does Escape (`onKey`).
const onAwayPress = (e: PointerEvent) => {
  if (!savePop.hidden && !saveRow.contains(e.target as Node)) setSaveOpen(false)
}
document.addEventListener('pointerdown', onAwayPress)
saveRow.addEventListener('focusout', (e) => {
  if (!savePop.hidden && e.relatedTarget instanceof Node && !saveRow.contains(e.relatedTarget)) setSaveOpen(false)
})
videoBtn.addEventListener('click', () => {
  // A recording under way: its button is the way to stop it.
  if (recording) {
    recording.abort()
    return
  }
  setSaveOpen(savePop.hidden)
})
recordBtn.addEventListener('click', () => {
  if (!perf || recording) return
  setSaveOpen(false, true)
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
      videoLabel.textContent = `Stop · ${Math.round(done * 100)}%`
    })
    .then(
      (saved) => say(exportNote, saved ? `Saved: ${perf?.soundtrack?.src ? 'picture and music' : perf?.soundtrack ? 'the picture, silent (the music is YouTube’s)' : 'the picture'}${words}.` : 'Stopped. No file was kept.', saved ? 'ok' : ''),
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

const transportNote = el('div', { class: 'status' })
transportSec.append(
  scrub,
  el('div', { class: 'row deck player' }, [playBtn, restartBtn, time, musicBtn, speedBox.node]),
  cameraSeg.node,
  // Dialogue and sound captions: a row each, shown only for a show that has them.
  dlRow,
  ccRow,
  saveRow,
  el('div', { class: 'row door' }, [doorBtn]),
  transportNote,
  exportNote,
)
// A host's own section (Theater: what is next, and the running order) follows the controls for what is on now.
host?.panel(panelRoot, advance, playNow)

const soundIcon = icon(ICON.sound)
const mutedIcon = icon(ICON.muted)
music.onChange(() => sync())
// The browser stopped the music mid-show for want of a gesture (a cue coming in that no press was behind): hold the
// sound, as a link that is refused holds it, the picture going on muted and the Sound button up for the press.
music.onRefused(() => {
  if (recording || !transport?.playing || soundHeld) return
  soundHeld = true
  setMuted(true)
  void music.play(transport.now())
  armSound()
  sync()
})
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

  // The picture says nothing to a screen reader: the canvas is named, as an image, by the show's title and its own share
  // line (WCAG 1.1.1). The stage's controls stay outside it.
  const canvas = stageRoot.querySelector('canvas')
  if (canvas) {
    canvas.setAttribute('role', 'img')
    const name = current ? `${current.title}${current.about ? `: ${current.about}` : ''}` : 'The show'
    if (canvas.getAttribute('aria-label') !== name) canvas.setAttribute('aria-label', name)
  }

  // The title card.
  empty.hidden = works.length > 0
  workList.node.hidden = takeRow.hidden = works.length === 0
  // A work with one take has no takes to pick between: no row.
  if (!work || work.versions.length < 2) takeRow.hidden = true
  if (current) workList.set(current.work)
  workList.node.classList.toggle('disabled', busy)
  if (work && (takeChips.length !== work.versions.length || takeChips.some((c, i) => c.version !== work.versions[i]))) {
    takeChips = work.versions.map((version) => {
      const b = el('button', { type: 'button', title: version.note ?? (version.favorite ? `${version.label}, a favourite` : version.label) }, [version.label])
      if (version.favorite) b.append(icon(ICON.star))
      b.addEventListener('click', () => {
        if (version !== current && !recording) void open(version, host ? 'link' : true)
      })
      return { version, b }
    })
    takeRow.replaceChildren(...takeChips.map((c) => c.b))
  }
  for (const { version, b } of takeChips) {
    setOn(b, version === current)
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
  transportSec.hidden = works.length === 0
  // Theater is for watching: nothing to save.
  saveRow.hidden = !!host
  showPaused(!playing)
  playBtn.disabled = restartBtn.disabled = scrub.disabled = !ready || busy
  cameraSeg.set(overview ? 0 : zoom ? 2 : 1)
  for (const b of cameraButtons) b.disabled = !ready || busy
  speedBox.set(speed)
  speedBox.setDisabled(busy)
  doorBtn.disabled = busy
  dlBtn.disabled = busy || !perf?.dialogue
  dlRow.hidden = !perf?.dialogue
  dlBtn.setAttribute('aria-pressed', String(!!perf?.dialogue && dialogue))
  dlState.textContent = dialogue ? 'On' : 'Off'
  dlBtn.title = dialogue ? 'Turn the dialogue off (D)' : 'Turn on the dialogue: the family’s words, in subtitles (D)'
  ccBtn.disabled = !perf?.captions
  ccRow.hidden = !perf?.captions
  ccBtn.setAttribute('aria-pressed', String(!!perf?.captions && captions))
  ccState.textContent = captions ? 'On' : 'Off'
  ccBtn.title = captions ? 'Turn the sound captions off (C)' : 'Turn on sound captions: words for what the music does (C)'
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
  // (Not while the browser holds the sound: then the stage's own Sound button says what is wanted, and the note sat on it.)
  const waiting = stalled && !soundHeld
  stageNote.hidden = !current || !(loading || failed || waiting)
  stageNote.classList.toggle('bad', !!failed)
  // Under a host a failed take is passed over (`SKIP_AFTER`), so there is nothing to press: it says what comes instead.
  const passing = !!failed && !!host && failedInARow < SKIP_FAILED
  stageNoteText.textContent = failed
    ? `${current?.title ?? 'This show'} would not load.${passing ? ' On to the next…' : ''}`
    : loading
      ? `Loading ${current?.title ?? 'the show'}…`
      : 'Waiting for the music…'
  retryBtn.hidden = !failed || passing

  // The stage's own play button: at the top, at the end, where the browser is waiting for a press,
  // or where a deep link is playing with the sound held — the panel may be hidden on a phone, so
  // the stage itself must say that a tap brings the music in.
  const t = transport?.now() ?? 0
  const atEnd = !!transport && !transport.loop && t >= transport.duration
  bigPlay.hidden = !ready || busy || (playing ? !soundHeld : !(blocked || t <= 0 || atEnd))
  bigPlayLabel.textContent = soundHeld ? 'Sound' : atEnd ? 'Replay' : 'Play'

  // Saving.
  sizeSeg.set(FRAME_SIZES.indexOf(size))
  const canRecord = recordingFormat(!!perf?.soundtrack?.src) !== null || recordingFormat(false) !== null
  pngBtn.disabled = !ready || busy
  recordBtn.disabled = !ready || busy || !canRecord
  // The button opens the saves while there is a show to save; a recording makes it the way to stop.
  videoBtn.disabled = !ready && !busy
  if (videoBtn.disabled || busy) setSaveOpen(false)
  videoBtn.classList.toggle('stop', busy)
  videoChevron.style.display = busy ? 'none' : ''
  if (busy) videoBtn.removeAttribute('aria-haspopup')
  else {
    videoBtn.setAttribute('aria-haspopup', 'dialog')
    videoLabel.textContent = 'Save video'
  }
  const length = perf ? clockText(perf.duration / speed) : ''
  dims.textContent = perf ? `${size.w} × ${size.h} · ${length}${speed === 1 ? '' : ` at ${speed}×`}` : '—'
  videoBtn.title = busy ? 'Stop the recording. No file is kept.' : 'Save this frame, or the whole show as a video'
  recordBtn.title = canRecord
    ? `The whole show as a video${perf?.soundtrack?.src ? ', picture and music' : ''}${credited() ? ', with its credits' : ', nothing written on it'}. It is played through once to be recorded, so it takes ${length}${speed === 1 ? '' : ` at ${speed}×`}.${perf?.soundtrack && !perf.soundtrack.src ? ' It is silent: the music plays from YouTube, which a recording cannot take.' : ''}`
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
/** A floored card's width per unit of its type, measured once as it is built. */
const cardWidths = new Map<string, number>()
/** Each such card's height per unit of its type, measured once like its width. */
const cardHeights = new Map<string, number>()
// The words a screen reader is to hear (`TitleCard.said`: a show's dialogue): the layer above is hidden from it, since
// its cards fade and blur, so each such card is spoken once, here, as it first comes up while the show plays at 1× or
// slower. Not on a scrub or a seek, nor faster than its own pace, so a reader is not flooded.
const saidLayer = el('div', { class: 'stage-said', 'aria-live': 'polite', 'aria-atomic': 'true' })
Object.assign(saidLayer.style, { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', clipPath: 'inset(50%)', whiteSpace: 'nowrap' })
stageRoot.append(saidLayer)
const saidKeys = new Set<string>()
const cardText = (c: TitleCard): string => [c.role, ...c.names.map((n) => (typeof n === 'string' ? n : `${n[0]}, ${n[1]}`)), ...(c.notes ?? [])].filter(Boolean).join('. ')

function buildCard(c: TitleCard): HTMLElement {
  const node = el('div', { class: `${c.title ? 'card title' : 'card'}${c.plain ? ' plain' : ''}${c.dark ? ' dark' : ''}${c.shade ? ' shaded' : ''}${c.caption ? ' caption' : ''}` })
  if (c.shade) {
    node.style.setProperty('--shade', String(c.shade))
    node.append(el('div', { class: 'veil' }))
  }
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
  const cards = perf?.titles && !overview && !recording ? perf.titles(t).filter((c) => !c.caption || captions) : []
  const live = new Set(cards.map((c) => c.key))
  for (const [key, node] of wordCards) {
    if (live.has(key)) continue
    node.remove()
    wordCards.delete(key)
    cardWidths.delete(key)
    cardHeights.delete(key)
  }
  for (const key of saidKeys) if (!live.has(key)) saidKeys.delete(key)
  for (const c of cards) {
    if (!c.said || saidKeys.has(c.key)) continue
    saidKeys.add(c.key)
    // Only at 1× or slower: a show's spoken words are timed to be heard whole at its own pace, and at 2× or 4× each
    // would cut the last off before a reader could finish it.
    if (transport?.playing && speed <= 1) saidLayer.textContent = typeof c.said === 'string' ? c.said : cardText(c)
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
    // Centred on its place, but kept on the stage: on a phone's short frame the small lines' 9px floor (styles.css) can
    // widen a card past the edge, so it slides in just far enough to keep a margin. A card that fits is where it was.
    node.style.left = `${placeCard((W - fw) / 2 + c.at[0] * fw, node.offsetWidth, W)}px`
    const lift = c.lift ? c.lift * Math.max(0, (H - fh) / 2) : 0
    const above = (perf?.tall ?? 0.5) * (H - fh)
    const top = above + (c.at[1] + (c.rise ?? 0) / 100) * fh - lift
    node.style.top = `${top}px`
    // `least` floors the card's own unit, after its `scale` (with no scale, as a floor on the frame's unit).
    let unit = Math.max((fh / 100) * (c.scale ?? 1), c.least ?? 0)
    if (unit !== fh / 100) node.style.setProperty('--u', `${unit}px`)
    else node.style.removeProperty('--u')
    // A card with a floor on its type, grown past the frame it was set for: never wider than the stage, and kept
    // inside its edges. (Cards without one are as they were.)
    // Its width goes as its unit (all its type is set in it), so it is measured once, as it is built, and worked
    // out from then on: no layout forced on every frame it is up.
    if (c.least) {
      const room = W * 0.94
      let perUnit = cardWidths.get(c.key)
      if (perUnit === undefined) {
        perUnit = node.offsetWidth / unit
        cardWidths.set(c.key, perUnit)
      }
      let wide = perUnit * unit
      if (wide > room) {
        unit *= room / wide
        wide = room
        node.style.setProperty('--u', `${unit}px`)
      }
      const half = wide / 2
      const x = (W - fw) / 2 + c.at[0] * fw
      node.style.left = `${Math.max(W * 0.03 + half, Math.min(W * 0.97 - half, x))}px`
      // And kept above the stage's foot: a card set low (a title in a widescreen's lower bar), grown on a short stage
      // (a phone held sideways), would run off the bottom. Its height goes as its unit too, measured once.
      let perUnitH = cardHeights.get(c.key)
      if (perUnitH === undefined) {
        perUnitH = node.offsetHeight / unit
        cardHeights.set(c.key, perUnitH)
      }
      const foot = H * 0.98 - perUnitH * unit
      if (top > foot) node.style.top = `${Math.max(0, foot)}px`
    }
    node.style.opacity = c.light.toFixed(3)
    // Out of focus as it comes and goes: it comes into focus as it comes up.
    node.style.filter = c.light > 0.995 ? '' : `blur(${((1 - c.light) * fh * 0.012).toFixed(2)}px)`
  }
}

// The clock prints whole seconds; writing it on every frame is wasted work.
let lastTime = ''
/** Where the clock was on the frame before, so a loop coming round its seam is seen as a pass. */
let lastT = 0
/**
 * The music is the clock, so music that stops coming (a connection lost mid-show, YouTube buffering) holds the
 * picture with it. Playing, and the clock still for this long, the stage says it is waiting: a frozen picture with
 * nothing on it reads as broken. `stallT` and `stallSince` are where the clock last stood and since when.
 */
const STALL_MS = 1500
let stallT = -1
let stallSince = 0
let stalled = false
let raf = 0
/** Played through: at the end, or, for a loop, round its seam (a seek resets `lastT`, so a jump back is not one). */
function playedThrough(t: number): boolean {
  if (!transport) return false
  const through = transport.playing && (transport.loop ? t < lastT - transport.duration / 2 : t >= transport.duration)
  lastT = t
  return through
}
function tick(): void {
  if (!alive) return
  if (transport) {
    const t = transport.now()
    music.follow(t)
    const still = transport.playing && t === stallT
    if (!still) {
      stallT = t
      stallSince = performance.now()
    }
    const nowStalled = still && performance.now() - stallSince > STALL_MS
    if (nowStalled !== stalled) {
      stalled = nowStalled
      sync()
    }
    if (playedThrough(t) && host) {
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
    // Written only when the bar moves a step: a style written every frame is a style recalculated every frame.
    const step = String(Math.round((t / transport.duration) * 1000))
    if (!scrubbing && scrub.value !== step) {
      scrub.value = step
      scrub.style.setProperty('--p', `${Number(step) / 10}%`)
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

// A tab in the background draws no frames, so `tick` never sees a show end there, and Theater, which is meant to be
// left on, stood silent after its first show until it was looked at again. Hidden, a slow timer watches for the end
// instead (the music keeps its own time meanwhile, `youtube.ts`), and the next show goes on as it would have.
const behind = host
  ? window.setInterval(() => {
      if (alive && document.hidden && transport && playedThrough(transport.now())) advance()
    }, 500)
  : 0

/* ------------------------------------------------------------------ keys */

/** Keys that turn something on or off (or leave for Theater), which a held key must not keep doing. */
const HELD_ONCE = new Set([' ', 'p', 'm', 'c', 'd', 'o', 'z', 't'])
const onKey = (e: KeyboardEvent) => {
  if (!alive) return
  // Escape puts the saves away, wherever focus is: a mouse click leaves none in them (`shell.ts`).
  if (e.key === 'Escape' && !savePop.hidden) {
    setSaveOpen(false, true)
    return
  }
  // Never shadow browser chrome (cmd+S, ctrl+R, ...).
  if (e.metaKey || e.ctrlKey || e.altKey) return
  const t = e.target
  if (t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement) return
  if (t instanceof HTMLButtonElement && (e.key === ' ' || e.key === 'Enter')) return
  // Letter keys are case-blind: Caps Lock must not silence P, M, C, D, O or Z.
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
  // A held toggle is one press: holding space started and stopped the show and its music over and over. Steps (the
  // arrows, [ and ], N) repeat.
  if (e.repeat && HELD_ONCE.has(key)) {
    if (key === ' ') e.preventDefault()
    return
  }
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
        void soundIn()
        break
      }
      setMuted(!muted)
      break
    case 'c':
      if (perf?.captions) toggleCaptions()
      break
    case 'd':
      if (perf?.dialogue) toggleDialogue()
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
    /** Profiling (`hold`, `paintAt`): stop the live loop and paint one frame at `t` on demand. */
    hold: (on: boolean) => stage.hold(on),
    paintAt: (t: number) => stage.paintAt(t),
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
    besideFrame.disconnect()
    window.clearTimeout(warmTimer)
    window.clearInterval(behind)
    window.clearTimeout(skipTimer)
    releaseSound()
    shell.holdHandle(false)
    cancelAnimationFrame(raf)
    stageRoot.removeEventListener('click', onStageClick)
    window.removeEventListener('pointerup', endScrub)
    window.removeEventListener('pointercancel', endScrub)
    window.removeEventListener('keydown', onKey)
    document.removeEventListener('pointerdown', onAwayPress)
    recording?.abort()
    music.destroy()
    stage.destroy()
    if (import.meta.env.DEV) delete (window as unknown as Record<string, unknown>).shows
  }
}

