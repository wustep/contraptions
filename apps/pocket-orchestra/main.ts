import { OrchestraAudio } from './audio'
import { OrchestraStage } from './stage'
import { icon, pauseIcon, playIcon } from './icons'
import { boardHeight, boardWidth, clamp, COLORS, copy, decodeTake, encodeTake, MAX_NOTES, mod, NAMES, NOTES, pitchName, PRESETS, resizeTake, STEP, trackY, validTake, VOICES, blankTake, type Note, type Take, type Voice } from './model'

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => document.querySelector<T>(selector)!
const esc = (s: string): string => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const STORAGE = 'contraptions:pocket:v2'
const audio = new OrchestraAudio()
let saved: { current?: unknown; kept?: unknown[] } = {}
try { saved = JSON.parse(localStorage.getItem(STORAGE) || '{}') || {} } catch { /* Storage is optional. */ }
let take = decodeTake(location.hash) || validTake(saved.current) || copy(PRESETS[0])
let kept = Array.isArray(saved.kept) ? saved.kept.map(validTake).filter((t): t is Take => !!t).slice(0, 8) : []
let selected: string | null = null, activeTrack = take.tracks[0].id, armed: Voice | null = null
let history: Take[] = [], future: Take[] = []
let position = 0, zoom = 1, snap = true, token = 0, toastTimer = 0
const uid = (): string => crypto.randomUUID().slice(0, 12)
const note = (): Note | undefined => take.notes.find(n => n.id === selected)

$('#app').innerHTML = `
<div class="page">
  <header class="masthead"><a href="/machine/" class="brand"><span class="brand-mark">c.</span> CONTRAPTIONS</a><span>PLAYABLE MACHINES · 01</span></header>
  <div class="heading"><div class="title"><h1>Pocket Orchestra<span>.</span></h1><div class="preset-wrap"><span class="tiny-dot"></span><select id="presets" aria-label="Starting tune"><option value="current"></option>${PRESETS.map((p, i) => `<option value="${i}">${p.title}</option>`).join('')}<option value="blank">＋ Empty machine</option></select></div></div><div class="heading-actions"><button id="save">Save</button><button id="share">Share ↗</button><button id="help" aria-label="How to play">?</button></div></div>
  <main>
    <section class="workbench" aria-label="Musical machine">
      <div class="board-toolbar"><div class="track-list" aria-label="Parallel tracks"></div><div class="board-tools"><button id="snap" aria-pressed="true" title="Snap placement to quarter beats">Snap</button><div class="length-control"><button id="shorter" aria-label="Shorten loop by four beats">−</button><output id="length"></output><button id="longer" aria-label="Lengthen loop by four beats">＋</button></div><div class="zoom-control"><button id="zoom-out" aria-label="Zoom out">−</button><button id="fit" title="Fit whole machine">Fit</button><button id="zoom-in" aria-label="Zoom in">＋</button></div></div></div>
      <div class="board-viewport" id="viewport" tabindex="0" aria-label="Scrollable machine workbench"><div class="scene" id="scene"></div></div>
      <div class="transport"><button class="play" id="play">${playIcon}<span>Play</span></button><button class="rewind" id="rewind" aria-label="Return to start">↤</button><div class="scrubber"><input id="position" type="range" min="0" max="1000" step="1" value="0" aria-label="Scrub the machine"><div class="beat-readout"><span id="beat-label">READY</span><span id="loop-label">12 BEATS ↻</span></div></div><label class="pace" title="Tempo"><input id="tempo" type="number" min="48" max="160" step="1" aria-label="Tempo in beats per minute"><span>BPM</span></label><button id="sound" class="sound" aria-label="Mute sound" aria-pressed="false">♪</button></div>
    </section>
    <div class="bench-bottom"><div class="toolbox"><div class="palette" role="group" aria-label="Instruments">${VOICES.map(kind => `<button class="instrument" data-kind="${kind}" aria-label="Add ${NAMES[kind]}" aria-pressed="false" style="--voice:#c49540">${icon(kind)}<span>${NAMES[kind]}</span></button>`).join('')}</div><div class="palette-foot"><span id="hint">Drag a voice onto the rails.</span><div class="history-buttons"><button id="undo" aria-label="Undo" title="Undo (⌘/Ctrl Z)">↶</button><button id="redo" aria-label="Redo" title="Redo (⌘/Ctrl Shift Z)">↷</button></div></div></div><section class="inspector" id="inspector" aria-label="Selected instrument"></section></div>
  </main>
  <footer class="footer"><div class="track-settings"><span id="track-label">Track 1</span><input type="range" id="track-volume" min="0" max="1" step=".05" aria-label="Selected track volume"><button id="duplicate-track" title="Duplicate selected track" aria-label="Duplicate selected track">⧉</button><button id="remove-track" title="Remove selected track" aria-label="Remove selected track">×</button></div><span class="footer-note">A little mechanical music.</span><button id="open-shelf">Saved</button><button id="help-footer">? Keys</button></footer>
</div>
<div id="toast" role="status" aria-live="polite"></div><div id="ghost" hidden aria-hidden="true"></div>
<dialog id="help-dialog"><button class="close-dialog" aria-label="Close help">×</button><h2>Follow the marble.</h2><p>Drag an instrument onto the board, or pick one and tap a place. Move it to bend the rail and change when it plays.</p><p>Select a piece to tune it. Add tracks for harmony. The little circles mute each track. The whole machine loops together.</p><p><kbd>Space</kbd> play · <kbd>Arrows</kbd> move · <kbd>1–5</kbd> pitch · <kbd>Delete</kbd> remove · <kbd>⌘/Ctrl Z</kbd> undo · <kbd>Esc</kbd> deselect.</p><p>Drag the empty board to scroll on a phone. Fit shows the whole machine.</p></dialog>
<dialog id="save-dialog"><button class="close-dialog" aria-label="Close saved machines">×</button><h2>Keep a little music.</h2><label for="take-title" class="sr-only">Machine name</label><input type="text" id="take-title" maxlength="48"><button id="keep" class="primary">Save machine</button><div id="saved-list"></div></dialog>
<dialog id="share-dialog"><button class="close-dialog" aria-label="Close listening link">×</button><h2>Pass it on.</h2><p>This link includes an editable copy of your machine.</p><input id="share-url" aria-label="Listening link" readonly><button id="copy-link" class="primary">Copy link</button></dialog>`
const stage = new OrchestraStage($('#scene'))
const viewport = $('#viewport')
zoom = initialZoom()

function initialZoom(): number { return Math.min(window.innerWidth < 600 ? .72 : 1.15, viewport.clientHeight / boardHeight(take), viewport.clientWidth / boardWidth(take) * (window.innerWidth < 600 ? 3 : 1)) }
function now(): number { return audio.playing ? audio.now() : position }
function toast(message: string): void {
  clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('visible')
  toastTimer = window.setTimeout(() => $('#toast').classList.remove('visible'), 2600)
}
function persist(): void {
  try { localStorage.setItem(STORAGE, JSON.stringify({ current: take, kept })) } catch { /* The machine works without storage. */ }
  if (location.hash.startsWith('#v')) { const url = new URL(location.href); url.hash = encodeTake(take); window.history.replaceState(null, '', url) }
}
function updatePlay(): void {
  $('#play').innerHTML = `${audio.playing ? pauseIcon : playIcon}<span>${audio.playing ? 'Pause' : 'Play'}</span>`
  $('#play').setAttribute('aria-label', audio.playing ? 'Pause orchestra' : 'Play orchestra')
}
function stop(): void { token++; position = mod(now(), take.length * STEP); audio.pause(); updatePlay() }
async function togglePlay(): Promise<void> {
  if (audio.playing) { stop(); return }
  const request = ++token
  try {
    await audio.unlock()
    if (request !== token) return
    audio.start(take, position); updatePlay()
  } catch { toast('Tap Play to wake the sound.'); updatePlay() }
}
function remember(before = copy(take)): void { history.push(before); if (history.length > 80) history.shift(); future = [] }
function changed(): void {
  selected = take.notes.some(n => n.id === selected) ? selected : null
  activeTrack = take.tracks.some(t => t.id === activeTrack) ? activeTrack : take.tracks[0].id
  position = mod(now(), take.length * STEP)
  if (audio.playing) audio.start(take, position)
  render(); persist()
}
function change(mutator: () => void): void { remember(); mutator(); changed() }
function undo(redo = false): void {
  const from = redo ? future : history, to = redo ? history : future
  const previous = from.pop()
  if (!previous) return
  to.push(copy(take)); take = previous; changed()
}
function load(next: Take): void { stop(); remember(); take = copy(next); selected = null; activeTrack = take.tracks[0].id; armed = null; position = 0; zoom = initialZoom(); render(); persist(); viewport.scrollTo(0, 0) }
function render(): void {
  const focusedNote = document.activeElement?.getAttribute('data-note')
  stage.render({ take, selected, activeTrack, armed: !!armed, zoom }); stage.setTime(now())
  if (focusedNote) stage.svg.querySelector<SVGElement>(`[data-note="${focusedNote}"]`)?.focus({ preventScroll: true })
  $('.track-list').innerHTML = take.tracks.map((track, i) => `<div class="track-chip ${track.id === activeTrack ? 'active' : ''} ${track.muted ? 'muted' : ''}" style="--track:${track.color}"><button class="track-select" data-track="${track.id}" aria-label="Select track ${i + 1}" aria-pressed="${track.id === activeTrack}"><span class="track-dot"></span>${i + 1}</button><button class="mute-track" data-mute="${track.id}" aria-label="${track.muted ? 'Unmute' : 'Mute'} track ${i + 1}" aria-pressed="${track.muted}" title="${track.muted ? 'Unmute' : 'Mute'}">${track.muted ? '○' : '●'}</button></div>`).join('') + `<button class="add-track" id="add-track" aria-label="Add parallel track" ${take.tracks.length === 4 ? 'disabled' : ''}>＋</button>`
  $('#length').textContent = `${take.length} beats`; $('#loop-label').textContent = `${take.length} BEATS ↻`
  $<HTMLButtonElement>('#shorter').disabled = take.length <= 8; $<HTMLButtonElement>('#longer').disabled = take.length >= 24
  $<HTMLInputElement>('#tempo').value = String(take.tempo)
  $<HTMLButtonElement>('#undo').disabled = !history.length; $<HTMLButtonElement>('#redo').disabled = !future.length
  $<HTMLButtonElement>('#remove-track').disabled = take.tracks.length === 1
  $<HTMLButtonElement>('#duplicate-track').disabled = take.tracks.length === 4 || take.notes.length + take.notes.filter(n => n.track === activeTrack).length > MAX_NOTES
  const track = take.tracks.find(t => t.id === activeTrack)!
  $('#track-label').textContent = `Track ${take.tracks.indexOf(track) + 1}`; $<HTMLInputElement>('#track-volume').value = String(track.volume)
  const current = $('#presets option[value=current]'); current.textContent = take.title; $<HTMLSelectElement>('#presets').value = 'current'
  for (const el of document.querySelectorAll<HTMLButtonElement>('[data-kind]')) { el.setAttribute('aria-pressed', String(el.dataset.kind === armed)); el.style.setProperty('--voice', track.color) }
  $('#hint').textContent = armed ? `${NAMES[armed]} · tap anywhere to place.` : window.innerWidth < 600 ? 'Pick a voice. Tap the board.' : 'Drag a voice onto the rails.'
  renderInspector(); updatePlay()
}
function renderInspector(): void {
  const n = note()
  if (!n) { $('#inspector').innerHTML = '<div class="inspector-empty"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="m11 8 19 17-12 1-4 10zM4 8H0m11-4V0m-7 3L1 0"/></svg><span>Select a piece to tune, stretch & move it.</span></div>'; return }
  const octave = Math.floor(n.pitch / 5)
  $('#inspector').innerHTML = `<div class="inspector-head"><div class="inspector-name"><select id="voice" aria-label="Instrument voice">${VOICES.map(v => `<option value="${v}" ${v === n.kind ? 'selected' : ''}>${NAMES[v]}</option>`).join('')}</select><span class="note-badge">${pitchName(n.pitch)}</span></div><div><button id="duplicate" title="Duplicate instrument" aria-label="Duplicate instrument">⧉</button><button id="remove" title="Remove instrument" aria-label="Remove instrument">×</button></div></div>
    <div class="pitch-controls" role="group" aria-label="Pitch"><button class="octave" data-octave="-1" aria-label="Lower octave" ${octave <= -1 ? 'disabled' : ''}>−8</button>${NOTES.map((name, i) => `<button data-pitch="${i}" aria-label="Note ${name}" aria-pressed="${mod(n.pitch, 5) === i}">${name}</button>`).join('')}<button class="octave" data-octave="1" aria-label="Higher octave" ${octave >= 2 ? 'disabled' : ''}>＋8</button></div>
    <div class="detail-controls"><label>Beat <input id="note-beat" type="number" min=".5" max="${take.length - 2}" step=".25" value="${Number(n.beat.toFixed(2))}" aria-label="Contact beat"></label><label>Track <select id="note-track" aria-label="Instrument track">${take.tracks.map((t, i) => `<option value="${t.id}" ${t.id === n.track ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></label><label class="size-label">Size <input id="note-size" type="range" min=".65" max="1.5" step=".05" value="${n.size}" aria-label="Instrument width"></label></div>`
}
/** Reserve a little rolling room on each track. Other tracks may strike together. */
function openBeat(track: string, wanted: number, except?: string): number | null {
  const occupied = take.notes.filter(n => n.track === track && n.id !== except).map(n => n.beat)
  const target = clamp(snap ? Math.round(wanted * 4) / 4 : wanted, .5, take.length - 2)
  const choices = [target, .5, take.length - 2, ...occupied.flatMap(b => [b - .75, b + .75])]
    .filter(b => b >= .5 && b <= take.length - 2 && occupied.every(o => Math.abs(o - b) >= .749))
  choices.sort((a, b) => Math.abs(a - target) - Math.abs(b - target))
  return choices[0] ?? null
}
function add(kind: Voice, x: number, y: number): void {
  if (take.notes.length >= MAX_NOTES) { toast('48 voices is a full orchestra.'); return }
  const beat = openBeat(activeTrack, (x - 84) / 86)
  if (beat === null) { toast('Give this track more beats, or add a track.'); return }
  change(() => { const n: Note = { id: uid(), kind, beat, y: clamp(y, 40, boardHeight(take) - 80), pitch: 0, size: 1, track: activeTrack }; take.notes.push(n); selected = n.id; armed = null })
}
function focusSelected(): void { stage.svg.querySelector<SVGElement>(`[data-note="${selected}"]`)?.focus({ preventScroll: true }) }
function duplicate(): void {
  const n = note(); if (!n || take.notes.length >= MAX_NOTES) return
  const beat = openBeat(n.track, n.beat + 1)
  if (beat === null) { toast('This track needs more room.'); return }
  change(() => { const next = { ...n, id: uid(), beat }; take.notes.push(next); selected = next.id }); focusSelected()
}
function remove(): void { if (selected) change(() => { take.notes = take.notes.filter(n => n.id !== selected); selected = null }) }
function addTrack(duplicateCurrent = false): void {
  if (take.tracks.length === 4) return
  const source = take.tracks.find(t => t.id === activeTrack)!, original = take.tracks.indexOf(source), index = take.tracks.length
  const notes = duplicateCurrent ? take.notes.filter(n => n.track === source.id) : []
  if (take.notes.length + notes.length > MAX_NOTES) return
  change(() => {
    activeTrack = uid(); take.tracks.push({ id: activeTrack, color: COLORS[index], muted: false, volume: source.volume })
    take.notes.push(...notes.map(n => ({ ...n, id: uid(), track: activeTrack, y: clamp(n.y + (index - original) * 160, 40, boardHeight(take) - 80) })))
    selected = null
  })
  viewport.scrollTo({ top: trackY(index) * zoom - 100, behavior: 'smooth' })
}
function setZoom(next: number): void {
  const x = (viewport.scrollLeft + viewport.clientWidth / 2) / zoom, y = (viewport.scrollTop + viewport.clientHeight / 2) / zoom
  zoom = clamp(next, .25, 1.6); render(); viewport.scrollTo(x * zoom - viewport.clientWidth / 2, y * zoom - viewport.clientHeight / 2)
}

$('#play').onclick = () => void togglePlay()
$('#rewind').onclick = () => { position = 0; if (audio.playing) audio.start(take, 0); stage.setTime(0) }
let scrubResume = false
$('#position').addEventListener('input', () => {
  if (audio.playing) { scrubResume = true; stop() }
  position = Number($<HTMLInputElement>('#position').value) / 1000 * take.length * STEP; stage.setTime(position)
})
$('#position').addEventListener('change', () => { if (scrubResume) { scrubResume = false; void togglePlay() } })
$('#tempo').addEventListener('change', () => { const value = Number($<HTMLInputElement>('#tempo').value); if (Number.isFinite(value)) change(() => { take.tempo = clamp(Math.round(value), 48, 160) }) })
$('#sound').onclick = () => { audio.setVolume(audio.volume ? 0 : .7); $('#sound').setAttribute('aria-pressed', String(!audio.volume)); $('#sound').setAttribute('aria-label', audio.volume ? 'Mute sound' : 'Unmute sound'); $('#sound').textContent = audio.volume ? '♪' : '♩' }
$('#snap').onclick = () => { snap = !snap; $('#snap').setAttribute('aria-pressed', String(snap)) }
$('#shorter').onclick = () => change(() => resizeTake(take, take.length - 4))
$('#longer').onclick = () => change(() => resizeTake(take, take.length + 4))
$('#zoom-in').onclick = () => setZoom(zoom * 1.2)
$('#zoom-out').onclick = () => setZoom(zoom / 1.2)
$('#fit').onclick = () => { zoom = Math.min(viewport.clientWidth / boardWidth(take), viewport.clientHeight / boardHeight(take)); render(); viewport.scrollTo(0, 0) }
$('#undo').onclick = () => undo()
$('#redo').onclick = () => undo(true)
$('#presets').onchange = () => { const value = $<HTMLSelectElement>('#presets').value; if (value !== 'current') load(value === 'blank' ? blankTake() : PRESETS[Number(value)]) }
$('.track-list').addEventListener('click', e => {
  const button = (e.target as Element).closest<HTMLButtonElement>('button'); if (!button) return
  if (button.id === 'add-track') addTrack()
  if (button.dataset.track) { activeTrack = button.dataset.track; render() }
  if (button.dataset.mute) change(() => { const track = take.tracks.find(t => t.id === button.dataset.mute)!; track.muted = !track.muted })
})
$('#track-volume').addEventListener('change', () => { const volume = Number($<HTMLInputElement>('#track-volume').value); change(() => { take.tracks.find(t => t.id === activeTrack)!.volume = volume }) })
$('#duplicate-track').onclick = () => addTrack(true)
$('#remove-track').onclick = () => {
  if (take.tracks.length < 2) return
  change(() => {
    const index = take.tracks.findIndex(t => t.id === activeTrack)
    take.notes = take.notes.filter(n => n.track !== activeTrack)
    for (const n of take.notes) if (take.tracks.findIndex(t => t.id === n.track) > index) n.y = clamp(n.y - 160, 40, boardHeight(take) - 240)
    take.tracks.splice(index, 1); take.tracks.forEach((t, i) => { t.color = COLORS[i] }); activeTrack = take.tracks[Math.min(index, take.tracks.length - 1)].id
  })
}
$('#inspector').addEventListener('click', e => {
  const button = (e.target as Element).closest<HTMLButtonElement>('button'), n = note(); if (!button || !n) return
  if (button.dataset.pitch !== undefined) change(() => { n.pitch = Math.floor(n.pitch / 5) * 5 + Number(button.dataset.pitch) })
  if (button.dataset.octave) change(() => { n.pitch = clamp(n.pitch + Number(button.dataset.octave) * 5, -5, 14) })
  if (button.id === 'duplicate') duplicate()
  if (button.id === 'remove') remove()
})
$('#inspector').addEventListener('change', e => {
  const el = e.target as HTMLInputElement, n = note(); if (!n) return
  if (el.id === 'voice') change(() => { n.kind = el.value as Voice })
  if (el.id === 'note-size') change(() => { n.size = Number(el.value) })
  if (el.id === 'note-beat') { const beat = openBeat(n.track, Number(el.value), n.id); if (beat !== null) change(() => { n.beat = beat }) }
  if (el.id === 'note-track') {
    const beat = openBeat(el.value, n.beat, n.id)
    if (beat === null) { toast('This track needs more room.'); renderInspector(); return }
    change(() => { n.track = el.value; n.beat = beat; activeTrack = el.value })
  }
})

interface Drag { id: string; pointer: number; x: number; y: number; originBeat: number; originY: number; before: Take; moved: boolean; resume: boolean }
let drag: Drag | null = null, blockBoardClickUntil = 0
stage.svg.addEventListener('pointerdown', e => {
  if (e.button !== 0) return
  const target = (e.target as Element).closest<SVGElement>('[data-note]')
  if (!target) return
  blockBoardClickUntil = performance.now() + 5000
  const n = take.notes.find(n => n.id === target.dataset.note)!
  if (armed) { change(() => { n.kind = armed!; selected = n.id; armed = null }); return }
  selected = n.id; activeTrack = n.track
  drag = { id: n.id, pointer: e.pointerId, x: e.clientX, y: e.clientY, originBeat: n.beat, originY: n.y, before: copy(take), moved: false, resume: audio.playing }
  stage.svg.setPointerCapture(e.pointerId); e.preventDefault(); render()
})
stage.svg.addEventListener('pointermove', e => {
  if (!drag || drag.pointer !== e.pointerId) return
  if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 4) return
  if (!drag.moved) { stop(); drag.moved = true; document.body.classList.add('dragging') }
  const n = take.notes.find(n => n.id === drag!.id)!, beat = openBeat(n.track, drag.originBeat + (e.clientX - drag.x) / zoom / 86, n.id)
  if (beat !== null) n.beat = beat
  n.y = clamp(drag.originY + (e.clientY - drag.y) / zoom, 40, boardHeight(take) - 80)
  render()
})
function endDrag(cancelled: boolean): void {
  if (!drag) return
  blockBoardClickUntil = performance.now() + 250
  const end = drag; drag = null; document.body.classList.remove('dragging')
  if (end.moved) {
    if (cancelled) take = end.before
    else { remember(end.before); persist() }
    render(); if (end.resume) void togglePlay()
  }
  focusSelected()
}
stage.svg.addEventListener('pointerup', () => endDrag(false))
stage.svg.addEventListener('pointercancel', () => endDrag(true))
stage.svg.addEventListener('click', e => {
  if (performance.now() < blockBoardClickUntil) return
  if ((e.target as Element).closest('[data-note]')) return
  if (armed) { const p = stage.point(e.clientX, e.clientY); add(armed, p.x, p.y) }
  else { selected = null; render() }
})
let paletteDrag: { kind: Voice; x: number; y: number; moved: boolean; pointer: number } | null = null, suppressClick = 0
$('.palette').addEventListener('pointerdown', e => {
  const ev = e as PointerEvent, el = (ev.target as Element).closest<HTMLButtonElement>('[data-kind]'); if (!el || ev.button !== 0) return
  paletteDrag = { kind: el.dataset.kind as Voice, x: ev.clientX, y: ev.clientY, moved: false, pointer: ev.pointerId }
  el.setPointerCapture(ev.pointerId)
})
$('.palette').addEventListener('pointermove', e => {
  const ev = e as PointerEvent
  if (!paletteDrag || paletteDrag.pointer !== ev.pointerId) return
  if (!paletteDrag.moved && Math.hypot(ev.clientX - paletteDrag.x, ev.clientY - paletteDrag.y) < 8) return
  paletteDrag.moved = true
  $('#ghost').hidden = false; $('#ghost').innerHTML = icon(paletteDrag.kind); $('#ghost').style.left = `${ev.clientX - 32}px`; $('#ghost').style.top = `${ev.clientY - 32}px`
})
$('.palette').addEventListener('pointerup', e => {
  if (!paletteDrag) return
  const ev = e as PointerEvent, end = paletteDrag; paletteDrag = null; $('#ghost').hidden = true
  if (end.moved) {
    suppressClick = performance.now() + 200
    const box = viewport.getBoundingClientRect()
    if (ev.clientX >= box.left && ev.clientX < box.right && ev.clientY >= box.top && ev.clientY < box.bottom) { const p = stage.point(ev.clientX, ev.clientY); add(end.kind, p.x, p.y) }
  }
})
$('.palette').addEventListener('pointercancel', () => { paletteDrag = null; $('#ghost').hidden = true })
$('.palette').addEventListener('click', e => {
  if (performance.now() < suppressClick) return
  const el = (e.target as Element).closest<HTMLButtonElement>('[data-kind]'); if (!el) return
  armed = armed === el.dataset.kind ? null : el.dataset.kind as Voice; render()
})

function openSaved(): void {
  $<HTMLInputElement>('#take-title').value = take.title
  $('#saved-list').innerHTML = kept.map((t, i) => `<div class="saved-row"><button data-load="${i}">${esc(t.title)}</button><button data-delete="${i}" aria-label="Delete ${esc(t.title)}">×</button></div>`).join('')
  $<HTMLDialogElement>('#save-dialog').showModal()
}
$('#save').onclick = openSaved; $('#open-shelf').onclick = openSaved
$('#keep').onclick = () => {
  const title = $<HTMLInputElement>('#take-title').value.trim() || 'Untitled machine'
  if (take.title !== title) { remember(); take.title = title }
  kept = [copy(take), ...kept.filter(t => t.title !== title)].slice(0, 8); persist(); render(); $<HTMLDialogElement>('#save-dialog').close(); toast('Saved in this browser.')
}
$('#saved-list').addEventListener('click', e => {
  const button = (e.target as Element).closest<HTMLButtonElement>('button'); if (!button) return
  if (button.dataset.load !== undefined) { load(kept[Number(button.dataset.load)]); $<HTMLDialogElement>('#save-dialog').close() }
  if (button.dataset.delete !== undefined) { kept.splice(Number(button.dataset.delete), 1); persist(); openSaved() }
})
$('#share').onclick = async () => {
  const url = new URL(location.href); url.hash = encodeTake(take); window.history.replaceState(null, '', url)
  try { await navigator.clipboard.writeText(url.href); toast('Listening link copied.') }
  catch { $<HTMLInputElement>('#share-url').value = url.href; $<HTMLDialogElement>('#share-dialog').showModal(); $<HTMLInputElement>('#share-url').select() }
}
$('#copy-link').onclick = async () => { try { await navigator.clipboard.writeText($<HTMLInputElement>('#share-url').value); $<HTMLDialogElement>('#share-dialog').close(); toast('Link copied.') } catch { $<HTMLInputElement>('#share-url').select(); toast('Select and copy this link.') } }
for (const el of document.querySelectorAll<HTMLButtonElement>('.close-dialog')) el.onclick = () => el.closest('dialog')?.close()
for (const id of ['#help', '#help-footer']) $(id).onclick = () => $<HTMLDialogElement>('#help-dialog').showModal()
window.addEventListener('keydown', e => {
  const target = e.target as HTMLElement
  if (target.closest('input,select,textarea,dialog') || e.altKey) return
  if (e.code === 'Space') { e.preventDefault(); void togglePlay(); return }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(e.shiftKey); return }
  if (e.key === 'Escape') { armed = null; selected = null; render(); return }
  if (target.closest('[data-note]')) selected = target.closest<SVGElement>('[data-note]')!.dataset.note!
  const n = note(); if (!n) return
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(); return }
  if (/^[1-5]$/.test(e.key)) { e.preventDefault(); change(() => { n.pitch = Math.floor(n.pitch / 5) * 5 + Number(e.key) - 1 }); return }
  if (e.key.startsWith('Arrow')) {
    e.preventDefault()
    const direction = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { const beat = openBeat(n.track, n.beat + direction * (e.shiftKey ? 1 : .25), n.id); if (beat !== null) change(() => { n.beat = beat }) }
    else change(() => { n.y = clamp(n.y + direction * (e.shiftKey ? 20 : 5), 40, boardHeight(take) - 80) })
    focusSelected()
  }
})
document.addEventListener('visibilitychange', () => { if (document.hidden) stop() })
audio.onInterruption = stop
window.addEventListener('hashchange', () => { const shared = decodeTake(location.hash); if (shared) load(shared) })
let lastFrame = -Infinity
function frame(at: number): void {
  if (at - lastFrame >= (audio.playing ? 14 : 80)) {
    lastFrame = at; const time = mod(now(), take.length * STEP)
    stage.setTime(time)
    if (document.activeElement !== $('#position')) $<HTMLInputElement>('#position').value = String(time / (take.length * STEP) * 1000)
    $('#beat-label').textContent = audio.playing || position ? `${String(Math.floor(time / STEP) + 1).padStart(2, '0')} / ${take.length}` : 'READY'
  }
  requestAnimationFrame(frame)
}
render(); requestAnimationFrame(frame)
if (location.hash && !decodeTake(location.hash)) toast('That link is incomplete. Here is a fresh machine.')
