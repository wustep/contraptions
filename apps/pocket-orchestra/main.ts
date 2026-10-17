import { Transport } from '../rube/src/shows/clock'
import { OrchestraAudio } from './audio'
import { createOrchestraStage } from './stage'
import { instruments } from './instruments'
import { icon, pauseIcon, playIcon } from './icons'
import { COLORS, DESCRIPTIONS, NAMES, NOTES, PHRASES, PRESETS, STEP, VOICES, copy, decodeTake, encodeTake, validTake, type Kind, type Take } from './model'

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => document.querySelector<T>(selector)!
const audio = new OrchestraAudio()
const STORAGE = 'contraptions:pocket:v1'
interface Saved { mode: 'phrases' | 'compose'; phrase: number; completed: number[]; drafts: Take[]; free: Take; kept: Take[] }
function readSaved(): Partial<Saved> {
  try { return JSON.parse(localStorage.getItem(STORAGE) || '{}') || {} } catch { return {} }
}
const saved = readSaved()
const shared = decodeTake(location.hash)
let mode: Saved['mode'] = shared ? 'compose' : saved.mode === 'compose' ? 'compose' : 'phrases'
let phrase = Number.isInteger(saved.phrase) ? Math.max(0, Math.min(4, saved.phrase!)) : 0
const completed = new Set(Array.isArray(saved.completed) ? saved.completed.filter(v => Number.isInteger(v) && v >= 0 && v < 5) : [])
const drafts = PHRASES.map((p, i) => { const draft = validTake(saved.drafts?.[i]); return draft?.slots.length === p.start.slots.length ? draft : copy(p.start) })
let free = shared || validTake(saved.free) || copy(PRESETS[0])
let kept = Array.isArray(saved.kept) ? saved.kept.map(validTake).filter((t): t is Take => !!t).slice(0, 8) : []
let take = copy(mode === 'compose' ? free : drafts[phrase])
let selected = mode === 'phrases' && phrase === 0 ? 1 : 0
let armed: Kind | null = mode === 'phrases' && phrase === 0 ? 'triangle' : null
let history: Take[] = [], future: Take[] = []
let preview: { slot: number; at: number; local: number } | null = null
let touched = false, listenedFrom: number | null = null, hasWon = false, startToken = 0
let transport = makeTransport()
let toastTimer = 0
function makeTransport(): Transport { return new Transport({ duration: take.slots.length * STEP, loop: true, heard: () => audio.now() }) }

$('#app').innerHTML = `
  <div class="page">
    <header class="masthead"><a class="brand" href="/machine/" aria-label="Back to Contraptions"><span class="brand-mark">c.</span> CONTRAPTIONS</a><span class="edition">A PLAYABLE EXPERIMENT <span>№ 01</span></span></header>
    <div class="introduction"><div><p class="eyebrow">SMALL MACHINES. GOOD COMPANY.</p><h1>Pocket Orchestra<span>.</span></h1><p class="subtitle">A few small instruments. A tune that’s yours.</p></div><div class="intro-mark" aria-hidden="true"><svg viewBox="0 0 100 90"><path d="M12 68h76M21 69v8m58-8v8M27 57 50 16l23 41H31"/><path d="m63 33 20-13"/><circle cx="85" cy="18" r="6"/><circle cx="50" cy="10" r="5"/><path d="M50 1v4"/></svg></div></div>
    <nav class="mode-switch" aria-label="Play mode"><button data-mode="phrases">The phrasebook <span>5 little lessons</span></button><button data-mode="compose">Free compose <span>follow your ear</span></button><button class="text-button shelf-open">Kept takes <span id="kept-count">0</span></button></nav>
    <main class="layout">
      <section class="workshop" aria-label="Your orchestra">
        <div class="bench-heading"><span id="score-label" class="eyebrow">YOUR FIRST DUET</span><div class="edit-actions"><button id="undo" title="Undo (⌘/Ctrl Z)" aria-label="Undo">↶</button><button id="redo" title="Redo (⌘/Ctrl Shift Z)" aria-label="Redo">↷</button><button id="reset" class="text-button">Start over</button></div></div>
        <div class="score" id="score"><div id="canvas" aria-hidden="true"></div><div id="steps" aria-label="Musical steps"></div></div>
        <div class="transport"><button id="play" class="play">${playIcon}<span>Play</span></button><button id="rewind" class="rewind" aria-label="Return to beginning" title="Return to beginning">↤</button><div class="scrubber"><label for="position" class="sr-only">Phrase position</label><input type="range" id="position" min="0" max="1000" value="0"><div><span id="beat-label">READY WHEN YOU ARE</span><span id="loop-label">2 STEPS · REPEATS</span></div></div><button id="sound" class="sound" title="Mute" aria-label="Mute sound">♪</button></div>
        <div class="instrument-case"><div class="case-heading"><span class="eyebrow">THE INSTRUMENT CASE</span><span id="tool-hint">Pick a voice, then a step.</span></div><div class="palette" role="group" aria-label="Instruments">${[...VOICES, 'rest' as const].map((kind, i) => `<button class="instrument" data-kind="${kind}" style="--voice:${COLORS[i] || '#899087'}" aria-label="Choose ${NAMES[kind]}" aria-pressed="false" title="${NAMES[kind]} · ${DESCRIPTIONS[kind]}">${icon(kind)}<span>${NAMES[kind]}</span></button>`).join('')}</div></div>
        <div class="tuning"><div class="pitch-group"><div class="tune-heading"><span class="eyebrow" id="pitch-label">STEP 2 · NOTE</span><div class="move-actions"><button id="move-back" aria-label="Move selected step earlier" title="Move a step earlier">←</button><button id="move-forward" aria-label="Move selected step later" title="Move a step later">→</button></div></div><div class="pitches" role="group" aria-labelledby="pitch-label">${NOTES.map((name, i) => `<button data-pitch="${i}" aria-label="Note ${name.replace('↑', ', higher octave')}" aria-pressed="false">${name}</button>`).join('')}</div></div><label class="tempo"><span class="eyebrow">PACE <output id="bpm">84</output></span><input id="tempo" type="range" min="60" max="112" value="84" aria-label="Tempo in beats per minute"><span class="tempo-words">unhurried <span>lively</span></span></label></div>
        <div class="bench-foot"><span id="selection-hint">Tap a step to place your triangle.</span><button id="remove" class="text-button">Remove step</button></div>
      </section>
      <aside class="notebook" aria-label="Phrasebook"><div id="phrase-panel"><div class="notebook-top"><span class="eyebrow">THE PHRASEBOOK</span><span id="phrase-number">01 / 05</span></div><div class="phrase-tabs" aria-label="Choose a phrase">${PHRASES.map((p, i) => `<button data-phrase="${i}" aria-label="Phrase ${i + 1}: ${p.title}">${String(i + 1).padStart(2, '0')}</button>`).join('')}</div><h2 id="phrase-title"></h2><p id="phrase-line"></p><ol id="rules"></ol><p id="phrase-hint" class="hint"></p><div id="success" hidden><span class="stamp">SOUNDS LIKE YOU</span><p id="praise"></p><button id="next" class="next">Next little phrase <span>→</span></button></div><p id="listen-hint" class="listen-hint">Press Play when it feels right.</p></div>
      <div id="compose-panel" hidden><div class="notebook-top"><span class="eyebrow">A TUNE OF YOUR OWN</span><span>∞</span></div><h2>Follow your ear.</h2><p>Trade a voice. Lift a note. Leave a little space. There are no wrong answers here.</p><label class="title-label" for="take-title">NAME YOUR TAKE</label><input id="take-title" maxlength="48" placeholder="A little machine"><div class="take-actions"><button id="keep" class="next">Keep this take <span>＋</span></button><button id="share" class="outline">Copy a listening link <span>↗</span></button></div><div class="starters"><p class="eyebrow">A PLACE TO START</p>${PRESETS.map((p, i) => `<button data-preset="${i}">${p.title}<span>↗</span></button>`).join('')}<button id="blank">An empty page<span>＋</span></button></div></div>
      <div class="field-note"><span class="small-star" aria-hidden="true">✳</span><p>Every marble plays what it touches.<br>Every voice belongs together.</p></div></aside>
    </main>
    <footer><p>Made of paper, patience & little machines.</p><details><summary>How to play & keyboard</summary><p>Choose an instrument, then tap a step. Select a step to change its note. The arrows beside its note move it earlier or later. With a mouse or pen, you can also drag instruments into place, or drag steps to swap them.</p><p><kbd>Space</kbd> play / pause · <kbd>← ↑ ↓ →</kbd> select a step · <kbd>Shift + arrows</kbd> swap steps · <kbd>1–6</kbd> change its note · <kbd>Delete</kbd> remove · <kbd>⌘ / Ctrl Z</kbd> undo · <kbd>Esc</kbd> put a voice down.</p><p>Notes use a shared pentatonic scale. The music box, harp and piano play little figures; the triangle and drum play a single note. Listening links carry the arrangement. Your eight most recent kept takes stay in this browser.</p></details></footer>
  </div><div id="toast" role="status" aria-live="polite"></div><div id="ghost" aria-hidden="true" hidden></div>
  <dialog id="shelf"><div class="dialog-heading"><h2>Kept takes.</h2><button class="close-dialog" aria-label="Close kept takes">×</button></div><p>Your little collection, kept in this browser.</p><div id="shelf-list"></div><button class="close-dialog outline">Back to the orchestra</button></dialog>
  <dialog id="share-dialog"><div class="dialog-heading"><h2>A listening link.</h2><button class="close-dialog" aria-label="Close listening link">×</button></div><p>Anyone with this link can hear and change a copy of your tune.</p><label class="sr-only" for="share-url">Listening link</label><input id="share-url" readonly><button class="close-dialog outline">Done</button></dialog>
  <div id="mobile-dock" hidden><button id="dock-play" class="play" aria-label="Play orchestra">${playIcon}<span>Play</span></button><span id="dock-beat">A LITTLE MUSIC?</span><button id="dock-tune">Tune step 2 <span>↓</span></button></div>
`

function persist(): void {
  if (mode === 'phrases') drafts[phrase] = copy(take); else free = copy(take)
  // Once a shared score is being edited, a reload should keep those edits. Going
  // back to the phrasebook leaves the shared URL, so it cannot override the mode.
  if (location.hash.startsWith('#v1.')) { const url = new URL(location.href); url.hash = mode === 'compose' ? encodeTake(take) : ''; window.history.replaceState(null, '', url) }
  try { localStorage.setItem(STORAGE, JSON.stringify({ mode, phrase, completed: [...completed], drafts, free, kept })) } catch { /* The score still works in private or full storage. */ }
}
function toast(message: string): void {
  clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('visible')
  toastTimer = window.setTimeout(() => $('#toast').classList.remove('visible'), 3300)
}
function remember(): void { history.push(copy(take)); if (history.length > 60) history.shift(); future = [] }
function stop(): void {
  startToken++; transport.pause(); audio.pause(); preview = null; listenedFrom = null
  updatePlay()
}
function change(mutator: () => void): void {
  startToken++
  remember(); mutator(); hasWon = false; preview = null
  if (audio.playing) { const at = audio.now(); audio.start(take, at); listenedFrom = Math.max(0, at) }
  render(); persist()
}
async function audition(slot: number): Promise<void> {
  const note = take.slots[slot]
  if (!note || note.kind === 'rest' || audio.playing) return
  const token = ++startToken
  try {
    await audio.unlock()
    if (token !== startToken || audio.playing) return
    const started = audio.preview(note)
    preview = started && { slot, ...started }
  } catch { toast('Tap Play to wake the sound up.') }
}
function load(next: Take): void {
  stop(); take = copy(next); transport = makeTransport(); selected = Math.min(selected, take.slots.length - 1)
  clearTimeout(toastTimer); $('#toast').classList.remove('visible')
  touched = false; hasWon = false; history = []; future = []; armed = null; render(); persist()
}
function changeMode(next: Saved['mode']): void {
  if (next === mode) return
  persist(); mode = next; load(mode === 'compose' ? free : drafts[phrase])
}
function choosePhrase(next: number): void {
  persist(); phrase = next; mode = 'phrases'; load(drafts[next]);
  if (next === 0 && !take.slots[1]) { selected = 1; armed = 'triangle'; render() }
}
function place(slot: number, kind: Kind): void {
  selected = slot
  change(() => { take.slots[slot] = { kind, pitch: take.slots[slot]?.pitch || 0 } })
  armed = null; render(); void audition(slot)
  const button = $<HTMLButtonElement>(`[data-step="${slot}"]`)
  button.classList.remove('placed'); void button.offsetWidth; button.classList.add('placed')
}
function selectStep(slot: number): void {
  selected = slot
  if (armed) place(slot, armed)
  else { render(); void audition(slot) }
}

function render(): void {
  $('.mode-switch [data-mode="phrases"]').setAttribute('aria-current', mode === 'phrases' ? 'page' : 'false')
  $('.mode-switch [data-mode="compose"]').setAttribute('aria-current', mode === 'compose' ? 'page' : 'false')
  $('#phrase-panel').hidden = mode !== 'phrases'; $('#compose-panel').hidden = mode !== 'compose'
  $('#score-label').textContent = mode === 'compose' ? 'YOUR LITTLE ENSEMBLE' : ['YOUR FIRST DUET', 'THREE STEPS UP', 'SPACE BETWEEN THE NOTES', 'A MUSICAL CONVERSATION', 'YOUR LITTLE ENSEMBLE'][phrase]
  const steps = $('#steps')
  if (steps.children.length !== take.slots.length) {
    steps.innerHTML = take.slots.map((_, i) => `<button class="step" data-step="${i}"><span class="step-number">${String(i + 1).padStart(2, '0')}</span><span class="step-empty"></span><span class="step-label"></span><span class="step-dot" aria-hidden="true"></span></button>`).join('')
  }
  $('#score').dataset.count = String(take.slots.length)
  for (let i = 0; i < take.slots.length; i++) {
    const el = $<HTMLButtonElement>(`[data-step="${i}"]`), note = take.slots[i]
    el.setAttribute('aria-label', `Step ${i + 1}: ${note ? NAMES[note.kind] + (note.kind === 'rest' ? '' : ', ' + NOTES[note.pitch]) : 'empty'}. ${armed ? 'Place ' + NAMES[armed] : 'Select to tune'}`)
    el.setAttribute('aria-pressed', String(i === selected)); el.classList.toggle('selected', i === selected); el.classList.toggle('empty', !note); el.classList.toggle('rest', note?.kind === 'rest')
    el.style.setProperty('--voice', note ? COLORS[VOICES.indexOf(note.kind as typeof VOICES[number])] || '#899087' : '#8c9388')
    el.querySelector('.step-empty')!.innerHTML = !note ? `<span class="socket">＋</span><span>${armed ? 'Place ' + NAMES[armed].toLowerCase() : 'A voice goes here'}</span>` : note.kind === 'rest' ? icon('rest') : ''
    el.querySelector('.step-label')!.innerHTML = note ? `<span>${NAMES[note.kind]}</span>${note.kind !== 'rest' ? `<b>${NOTES[note.pitch]}</b>` : '<b>—</b>'}` : '<span>A little possibility</span>'
  }
  for (const el of document.querySelectorAll<HTMLElement>('[data-kind]')) el.setAttribute('aria-pressed', String(el.dataset.kind === armed))
  const note = take.slots[selected]
  for (const el of document.querySelectorAll<HTMLButtonElement>('[data-pitch]')) { el.disabled = !note || note.kind === 'rest'; el.setAttribute('aria-pressed', String(!!note && note.pitch === Number(el.dataset.pitch))) }
  $('#pitch-label').textContent = `STEP ${selected + 1} · ${note?.kind === 'rest' ? 'A BREATH' : 'NOTE'}`
  $('#tool-hint').textContent = armed ? `${NAMES[armed]} in hand · choose a step` : 'Pick a voice, then a step.'
  $('#selection-hint').textContent = armed ? 'Tap a step to place it. Esc to put it down.' : note ? `${NAMES[note.kind]} · ${DESCRIPTIONS[note.kind]}` : `Step ${selected + 1} is waiting for a voice.`
  $<HTMLButtonElement>('#remove').disabled = !note
  $<HTMLButtonElement>('#move-back').disabled = selected === 0
  $<HTMLButtonElement>('#move-forward').disabled = selected === take.slots.length - 1
  $('#dock-tune').innerHTML = `Tune step ${selected + 1} <span>↓</span>`
  $<HTMLButtonElement>('#undo').disabled = !history.length; $<HTMLButtonElement>('#redo').disabled = !future.length
  $<HTMLInputElement>('#tempo').value = String(take.tempo); $('#bpm').textContent = String(take.tempo)
  $('#loop-label').textContent = `${take.slots.length} STEPS · REPEATS`
  if (document.activeElement !== $('#take-title')) $<HTMLInputElement>('#take-title').value = take.title
  $('#kept-count').textContent = String(kept.length)
  if (mode === 'phrases') renderPhrase()
  updatePlay()
}
function renderPhrase(): void {
  const p = PHRASES[phrase]
  $('#phrase-title').textContent = p.title; $('#phrase-line').textContent = p.line; $('#phrase-hint').textContent = p.hint
  $('#phrase-number').textContent = `0${phrase + 1} / 05`
  for (const el of document.querySelectorAll<HTMLElement>('[data-phrase]')) { el.setAttribute('aria-current', Number(el.dataset.phrase) === phrase ? 'step' : 'false'); el.classList.toggle('complete', completed.has(Number(el.dataset.phrase))) }
  $('#rules').innerHTML = p.rules.map((rule, i) => { const ok = rule.test(take.slots) && !(phrase === 0 && i === 1 && !hasWon); return `<li class="${ok ? 'met' : ''}"><span aria-hidden="true">${ok ? '✓' : '○'}</span>${rule.label}<span class="sr-only">${ok ? ', done' : ', to do'}</span></li>` }).join('')
  $('#success').hidden = !hasWon; $('#phrase-hint').hidden = hasWon; $('#listen-hint').hidden = hasWon
  $('#praise').textContent = p.praise
  $('#next').innerHTML = phrase < 4 ? 'Next little phrase <span>→</span>' : 'Make something yours <span>→</span>'
  $('#listen-hint').textContent = audio.playing ? 'Listening to your whole phrase…' : 'Press Play when it feels right.'
}
function updatePlay(): void { for (const id of ['#play', '#dock-play']) { $(id).innerHTML = `${audio.playing ? pauseIcon : playIcon}<span>${audio.playing ? 'Pause' : 'Play'}</span>`; $(id).setAttribute('aria-label', audio.playing ? 'Pause orchestra' : 'Play orchestra') }; document.body.classList.toggle('playing', audio.playing) }
async function togglePlay(): Promise<void> {
  if (audio.playing) { stop(); return }
  if (!take.slots.some(n => n && n.kind !== 'rest')) { toast('Give the orchestra at least one voice.'); return }
  const token = ++startToken
  try {
    await audio.unlock()
    if (token !== startToken) return
    preview = null
    const first = take.slots[0]
    const lead = first && first.kind !== 'rest' ? instruments[first.kind].lead : 0
    const at = touched ? transport.now() : -Math.max(.22, Math.min(.75, lead + .08))
    audio.start(take, at); transport.play(); touched = true; listenedFrom = Math.max(0, at); updatePlay(); if (mode === 'phrases') renderPhrase()
  } catch { toast('Sound could not start. Try Play once more.'); updatePlay() }
}
function undo(redo = false): void {
  const from = redo ? future : history, to = redo ? history : future
  if (!from.length) return
  const was = audio.playing, at = transport.now()
  stop(); to.push(copy(take)); take = from.pop()!; hasWon = false; transport = makeTransport(); transport.seek(at)
  selected = Math.min(selected, take.slots.length - 1)
  if (was) { audio.start(take, at); transport.play(); listenedFrom = at }
  render(); persist(); toast(redo ? 'Put back.' : 'One step back.')
}

$('#steps').addEventListener('click', e => { const el = (e.target as HTMLElement).closest<HTMLElement>('[data-step]'); if (el && !suppressClick) selectStep(Number(el.dataset.step)) })
$('.palette').addEventListener('click', e => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-kind]'); if (!el || suppressClick) return
  armed = el.dataset.kind as Kind; render()
  if (innerWidth <= 760) {
    const step = $(`[data-step="${selected}"]`), rect = step.getBoundingClientRect()
    if (rect.top < 0 || rect.bottom > innerHeight - 80) step.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }
})
$('.pitches').addEventListener('click', e => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-pitch]'), note = take.slots[selected]
  if (el && note && note.kind !== 'rest') { change(() => { note.pitch = Number(el.dataset.pitch) }); void audition(selected) }
})
$('#play').onclick = () => { void togglePlay() }
$('#dock-play').onclick = () => { void togglePlay() }
$('#dock-tune').onclick = () => { $('.tuning').scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }) }
function moveStep(delta: number): void {
  const to = selected + delta
  if (to < 0 || to >= take.slots.length) return
  change(() => { [take.slots[selected], take.slots[to]] = [take.slots[to], take.slots[selected]] })
  selected = to; render(); void audition(selected)
}
$('#move-back').onclick = () => moveStep(-1)
$('#move-forward').onclick = () => moveStep(1)
$('#rewind').onclick = () => {
  const was = audio.playing; stop(); transport.seek(0); touched = false
  if (was) void togglePlay()
  else render()
}
$('#undo').onclick = () => undo(); $('#redo').onclick = () => undo(true)
$('#remove').onclick = () => { change(() => { take.slots[selected] = null }); armed = null; render() }
$('#reset').onclick = () => { remember(); const h = history; load(mode === 'phrases' ? PHRASES[phrase].start : { title: 'A little machine', tempo: 84, slots: Array(6).fill(null) }); history = h; render(); toast('A fresh page. Undo brings it back.') }
let scrubbing = false, resumeAfterScrub = false
const position = $<HTMLInputElement>('#position')
position.addEventListener('input', () => {
  if (!scrubbing) { resumeAfterScrub = audio.playing; stop(); scrubbing = true }
  touched = true; preview = null; transport.seek(Number(position.value) / 1000 * transport.duration)
})
position.addEventListener('change', () => { scrubbing = false; if (resumeAfterScrub) void togglePlay() })
let tempoBefore: Take | null = null
$('#tempo').addEventListener('input', () => {
  tempoBefore ??= copy(take)
  const at = audio.playing ? audio.now() : 0
  take.tempo = Number($<HTMLInputElement>('#tempo').value); $('#bpm').textContent = String(take.tempo)
  if (audio.playing) audio.start(take, at)
})
$('#tempo').addEventListener('change', () => { if (tempoBefore) { history.push(tempoBefore); future = []; tempoBefore = null }; render(); persist() })
$('#sound').onclick = () => { audio.setVolume(audio.volume ? 0 : .7); $('#sound').textContent = audio.volume ? '♪' : '×'; $('#sound').setAttribute('aria-label', audio.volume ? 'Mute sound' : 'Unmute sound'); $('#sound').title = audio.volume ? 'Mute' : 'Unmute' }
document.querySelectorAll<HTMLElement>('[data-mode]').forEach(el => { el.onclick = () => changeMode(el.dataset.mode as Saved['mode']) })
document.querySelectorAll<HTMLElement>('[data-phrase]').forEach(el => { el.onclick = () => choosePhrase(Number(el.dataset.phrase)) })
$('#next').onclick = () => { if (phrase < 4) choosePhrase(phrase + 1); else { free = copy(take); mode = 'compose'; load(free) }; if (innerWidth < 760) $('#score').scrollIntoView({ block: 'center', behavior: 'smooth' }) }
document.querySelectorAll<HTMLElement>('[data-preset]').forEach(el => { el.onclick = () => { remember(); const h = history; load(PRESETS[Number(el.dataset.preset)]); history = h; render(); toast('A new tune to make your own.') } })
$('#blank').onclick = () => { remember(); const h = history; load({ title: 'A little machine', tempo: 84, slots: Array(6).fill(null) }); history = h; render() }
$('#take-title').addEventListener('change', () => { change(() => { take.title = $<HTMLInputElement>('#take-title').value.trim() || 'A little machine' }) })
$('#keep').onclick = () => {
  if (!take.slots.some(Boolean)) { toast('A voice or two first, then keep it.'); return }
  kept = [copy(take), ...kept.filter(t => encodeTake(t) !== encodeTake(take))].slice(0, 8); persist(); render()
  toast('Take kept. Find it in Kept takes.')
}
$('#share').onclick = async () => {
  const url = new URL(location.href); url.hash = encodeTake(take)
  try { await navigator.clipboard.writeText(url.href); toast('Listening link copied. Pass it on.'); historyReplace(url) }
  catch { $<HTMLInputElement>('#share-url').value = url.href; $<HTMLDialogElement>('#share-dialog').showModal(); $<HTMLInputElement>('#share-url').select() }
}
function historyReplace(url: URL): void { window.history.replaceState(null, '', url) }
function openShelf(): void {
  const list = $('#shelf-list'); list.replaceChildren()
  if (!kept.length) { const p = document.createElement('p'); p.className = 'empty-shelf'; p.textContent = 'No takes just yet. In Free compose, give your tune a name and keep it here.'; list.append(p) }
  kept.forEach((t, i) => {
    const row = document.createElement('div'); row.className = 'shelf-row'
    const button = document.createElement('button'); button.className = 'shelf-take'
    const name = document.createElement('strong'); name.textContent = t.title
    const desc = document.createElement('span'); desc.textContent = `${t.slots.filter(v => v && v.kind !== 'rest').length} voices · ${t.tempo} bpm`
    button.append(name, desc); button.onclick = () => { persist(); mode = 'compose'; load(t); $<HTMLDialogElement>('#shelf').close() }
    const remove = document.createElement('button'); remove.className = 'shelf-remove'; remove.textContent = '×'; remove.setAttribute('aria-label', `Remove kept take ${t.title}`)
    remove.onclick = () => { kept.splice(i, 1); persist(); render(); openShelf() }
    row.append(button, remove); list.append(row)
  })
  const dialog = $<HTMLDialogElement>('#shelf'); if (!dialog.open) dialog.showModal()
}
$('.shelf-open').onclick = openShelf
document.querySelectorAll<HTMLElement>('.close-dialog').forEach(el => { el.onclick = () => el.closest('dialog')!.close() })
document.querySelectorAll('dialog').forEach(el => el.addEventListener('click', e => { if (e.target === el && (e.clientX < el.getBoundingClientRect().left || e.clientX > el.getBoundingClientRect().right || e.clientY < el.getBoundingClientRect().top || e.clientY > el.getBoundingClientRect().bottom)) el.close() }))

// Pointer placement uses one snapping target. Native buttons remain the touch and
// keyboard fallback; there is no drag-only operation.
let drag: { x: number; y: number; kind?: Kind; slot?: number; active: boolean; pointer: number } | null = null
let suppressClick = false
document.addEventListener('pointerdown', e => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-kind], [data-step]')
  if (!el || e.button !== 0 || e.pointerType === 'touch') return
  drag = { x: e.clientX, y: e.clientY, active: false, pointer: e.pointerId, ...(el.dataset.kind ? { kind: el.dataset.kind as Kind } : { slot: Number(el.dataset.step) }) }
})
document.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.pointer) return
  if (!drag.active && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 9) return
  const kind = drag.kind || (drag.slot !== undefined ? take.slots[drag.slot]?.kind : null)
  if (!kind) return
  drag.active = true; suppressClick = true; e.preventDefault()
  const ghost = $('#ghost'); ghost.hidden = false; ghost.innerHTML = icon(kind); ghost.style.transform = `translate(${e.clientX - 34}px, ${e.clientY - 45}px)`
  ghost.style.setProperty('--voice', COLORS[VOICES.indexOf(kind as typeof VOICES[number])] || '#899087')
  const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-step]')
  document.querySelectorAll('.step').forEach(el => el.classList.toggle('drop-target', el === target))
}, { passive: false })
function endDrag(e: PointerEvent, cancel = false): void {
  if (!drag) return
  if (drag.active && !cancel) {
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-step]')
    if (target) {
      const slot = Number(target.dataset.step)
      if (drag.kind) place(slot, drag.kind)
      else if (drag.slot !== undefined && drag.slot !== slot) { const from = drag.slot; change(() => { [take.slots[from], take.slots[slot]] = [take.slots[slot], take.slots[from]] }); selected = slot; render(); void audition(slot) }
    }
  }
  drag = null; $('#ghost').hidden = true; document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'))
  window.setTimeout(() => { suppressClick = false }, 0)
}
document.addEventListener('pointerup', e => endDrag(e)); document.addEventListener('pointercancel', e => endDrag(e, true))

document.addEventListener('keydown', e => {
  const target = e.target as HTMLElement
  if (target.closest('dialog') || target.matches('input, textarea, select')) return
  if (e.key === 'Escape') { armed = null; render(); return }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(e.shiftKey); return }
  if (e.code === 'Space' && !target.closest('summary')) { e.preventDefault(); void togglePlay(); return }
  if (/^[1-6]$/.test(e.key) && !e.metaKey && !e.ctrlKey) { const note = take.slots[selected]; if (note && note.kind !== 'rest') { change(() => { note.pitch = Number(e.key) - 1 }); void audition(selected) }; return }
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); if (take.slots[selected]) change(() => { take.slots[selected] = null }); return }
  if (!e.key.startsWith('Arrow') || !target.closest('#steps')) return
  e.preventDefault()
  const cols = getComputedStyle($('#steps')).gridTemplateColumns.split(' ').length
  const delta = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' ? -cols : cols
  const next = Math.max(0, Math.min(take.slots.length - 1, selected + delta))
  if (e.shiftKey && next !== selected) change(() => { [take.slots[selected], take.slots[next]] = [take.slots[next], take.slots[selected]] })
  selected = next; render(); $(`[data-step="${next}"]`).focus()
})
document.addEventListener('visibilitychange', () => { if (document.hidden) stop() })
audio.onInterruption = () => { stop(); toast('The orchestra is paused. Press Play when you’re back.') }
window.addEventListener('hashchange', () => { const next = decodeTake(location.hash); if (next) { mode = 'compose'; load(next); toast('A shared tune. Make yourself at home.') } })

function updateDock(): void {
  const bar = $('.transport').getBoundingClientRect(), bench = $('.workshop').getBoundingClientRect()
  $('#mobile-dock').hidden = innerWidth > 760 || (bar.top >= 0 && bar.bottom <= innerHeight) || bench.top > innerHeight - 90 || bench.bottom < 60
}
window.addEventListener('scroll', updateDock, { passive: true })
window.addEventListener('resize', updateDock)
new ResizeObserver(updateDock).observe($('.workshop'))

render()
createOrchestraStage($('#canvas'), $('#steps'), () => ({ take, time: audio.playing ? audio.now() : transport.now(), running: audio.playing, touched, preview }))
let lastStep = -2
function frame(): void {
  const at = transport.now(), raw = audio.now(), current = audio.playing && raw >= 0 ? Math.floor(at / STEP) : -1
  if (!scrubbing) position.value = String(Math.round(at / transport.duration * 1000))
  if (current !== lastStep) { document.querySelectorAll<HTMLElement>('[data-step]').forEach(el => el.classList.toggle('sounding', Number(el.dataset.step) === current)); lastStep = current }
  position.setAttribute('aria-valuetext', `Step ${Math.min(take.slots.length, Math.floor(at / STEP) + 1)} of ${take.slots.length}`)
  $('#beat-label').textContent = audio.playing ? raw < 0 ? 'HERE WE GO…' : `STEP ${current + 1} OF ${take.slots.length}` : touched ? 'PAUSED · TAKE YOUR TIME' : 'READY WHEN YOU ARE'
  $('#dock-beat').textContent = audio.playing ? `STEP ${Math.max(1, current + 1)} OF ${take.slots.length}` : 'A LITTLE MUSIC?'
  if (preview && performance.now() - preview.at > 4500) preview = null
  if (mode === 'phrases' && audio.playing && !hasWon && listenedFrom !== null && raw - listenedFrom >= transport.duration && PHRASES[phrase].rules.every(r => r.test(take.slots))) {
    hasWon = true; completed.add(phrase); renderPhrase(); persist(); toast(PHRASES[phrase].praise)
  }
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
if (shared) toast('A shared tune. Press Play and make yourself at home.')
else if (location.hash) toast('That listening link could not be read. Here’s a fresh page.')
