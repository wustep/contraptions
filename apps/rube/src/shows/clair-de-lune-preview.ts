import p5 from 'p5'
import { drawWorld, setupCanvas } from '../engine'
import { ClairDeLunePreview, CLAIR_AUDIO_OFFSET, CLAIR_DURATION, clairDeLuneScore } from './clair-de-lune'

const show = new ClairDeLunePreview()
const host = document.querySelector<HTMLElement>('#stage')!
const play = document.querySelector<HTMLButtonElement>('#play')!
const seek = document.querySelector<HTMLInputElement>('#seek')!
const readout = document.querySelector<HTMLOutputElement>('#time')!
const status = document.querySelector<HTMLElement>('#status')!
const audio = new Audio('/docs/promo/clair-de-lune-goedhart.mp3')
audio.preload = 'auto'
let held = 0
let ready = false
let playing = false
const clamp = (t: number) => Math.max(0, Math.min(CLAIR_DURATION, Number.isFinite(t) ? t : 0))
const now = () => playing ? clamp(audio.currentTime - CLAIR_AUDIO_OFFSET) : held
const clock = (t: number) => `0:${Math.floor(t).toString().padStart(2, '0')}`

if (new URLSearchParams(location.search).get('clean') === '1') document.body.classList.add('clean')

function sync(t: number) {
  seek.value = String(t)
  readout.value = `${clock(t)} / 0:30`
  play.textContent = playing ? 'Pause' : t >= CLAIR_DURATION ? 'Replay' : 'Play'
}

function pause() {
  held = now()
  playing = false
  audio.pause()
  sketch.noLoop()
  sync(held)
}

const sketch = new p5((p) => {
  p.setup = () => {
    setupCanvas(p, host)
    p.pixelDensity(1)
    p.noLoop()
  }
  p.draw = () => {
    const t = now()
    const here = show.at(t)
    const cam = show.cameraAt(t)
    const k = Math.min(p.width / (16 / 9), p.height) / cam.cells
    // Start on the first bell; the only cut is the real portal between phrases.
    drawWorld(p, show, t, here, cam, k, { x: 0, y: 0, w: p.width, h: p.height }, t >= 0.8)
    ready = true
    sync(t)
    if (playing && t >= CLAIR_DURATION) {
      pause()
      status.textContent = '30 second checkpoint. Awaiting Stephen’s feedback.'
    }
  }
})

async function setTime(t: number) {
  const resume = playing
  held = clamp(t)
  audio.currentTime = CLAIR_AUDIO_OFFSET + held
  if (!resume) await sketch.redraw()
  sync(held)
}

async function toggle() {
  if (playing) { pause(); return }
  if (held >= CLAIR_DURATION) held = 0
  audio.currentTime = CLAIR_AUDIO_OFFSET + held
  try {
    await audio.play()
    playing = true
    status.textContent = 'Playing the approved recording. The preview stops at 0:30.'
    sketch.loop()
    sync(now())
  } catch {
    playing = false
    status.textContent = 'Could not play the recording. Check that docs/promo/clair-de-lune-goedhart.mp3 is available.'
  }
}

play.addEventListener('click', () => void toggle())
document.querySelector('#restart')!.addEventListener('click', () => {
  pause()
  void setTime(0)
  status.textContent = 'Ready at the first audible note.'
})
seek.addEventListener('input', () => void setTime(Number(seek.value)))
audio.addEventListener('error', () => {
  pause()
  status.textContent = 'Recording unavailable. Serve this page with npm run dev.'
})
document.addEventListener('visibilitychange', () => { if (document.hidden && playing) pause() })
document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement) return
  if (e.code === 'Space') { e.preventDefault(); void toggle() }
  if (e.key.toLowerCase() === 'h') document.body.classList.toggle('clean')
})

// Only this dev page installs the capture handle. There is no full-song continuation.
Object.assign(window, {
  clairPreview: {
    get ready() { return ready },
    duration: CLAIR_DURATION,
    audioOffset: CLAIR_AUDIO_OFFSET,
    audio,
    cues: clairDeLuneScore.scenes.flatMap((s) => s.cues),
    now,
    pause,
    seek: setTime,
    show,
    async frame(t: number) {
      pause()
      held = clamp(t)
      await sketch.redraw()
      return host.querySelector('canvas')!.toDataURL('image/png')
    },
  },
})
