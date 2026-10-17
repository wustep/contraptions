import './style.css'
import { createGarden, type Garden, type GardenState } from './garden'
import { icons, portrait, toyIcon } from './icons'
import { RESIDENTS, TOYS, behaviorById, behaviors, cleanName, decide, loadMemory, remember, residents, saveMemory, toys, type BehaviorId, type Decision, type Resident, type Toy } from './model'
import { loadCast, perform, type Cast, type Performance } from './performance'
import { GardenSound } from './sound'

const app = document.querySelector<HTMLDivElement>('#app')!
const memory = loadMemory()
const sound = new GardenSound()
sound.enabled = memory.sound
const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
const state: GardenState = { memory, selected: 'snail', performance: null, time: 0, idle: 0, pet: null, reducedMotion: motion.matches }
let toy: Toy = 'ball'
let busy = false
let paused = false
let replaying = false
let lastPlay: Performance | null = null
let cast: Cast
let garden: Garden
let ready = false
let sessionDiscoveries = 0
let cueIndex = 0
const esc = (value: string) => value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

app.innerHTML = `
  <header class="site-header">
    <a class="wordmark" href="/machine/" aria-label="Contraptions home"><span class="brand-mark">c.</span> contraptions <span class="breadcrumb">/ little games</span></a>
    <nav aria-label="Game controls">
      <button class="text-button guide-button" id="help">A small guide <span class="key">?</span></button>
      <button class="icon-button" id="sound" aria-label="Sound on" aria-pressed="true">${icons.sound}</button>
      <button class="book-button" id="open-book">${icons.book}<span>Scrapbook</span><span class="book-count">0/13</span></button>
    </nav>
  </header>
  <main>
    <div class="masthead"><div><p class="eyebrow">A SMALL MECHANICAL MENAGERIE</p><h1>Pet the Machine<span class="title-dot">.</span></h1><p class="intro">Offer a toy. Make a friend. Expect very little cooperation.</p></div><div class="garden-stamp">Three little residents.<br><em>All the time in the world.</em><span>NO CHORES. JUST COMPANY.</span></div></div>
    <div class="game-layout">
      <section class="garden-panel" aria-label="The little garden">
        <div class="garden-bar"><span class="eyebrow"><i class="status-dot"></i> THE LITTLE GARDEN</span><button class="text-button" id="pause" aria-pressed="false">Ⅱ <span>Pause</span></button></div>
        <div class="scene-wrap"><div id="stage" role="img" aria-label="A mechanical snail, frog, and sensitive plant share a tiny conservatory."></div><span class="scene-note">a place for small peculiarities</span><div class="resident-targets">${RESIDENTS.map((id) => `<button class="resident-target target-${id}" data-resident="${id}" aria-label="Choose ${memory.names[id]}, ${residents[id].species}"><span>${esc(memory.names[id])}</span></button>`).join('')}</div><div class="pause-overlay" hidden><span>Taking a little breather.</span><button id="resume">Back to the garden ${icons.arrow}</button></div></div>
        <div class="resident-row" role="group" aria-label="Choose a resident">${RESIDENTS.map((id) => `<button class="resident-card" data-resident="${id}" aria-pressed="${id === state.selected}"><span class="resident-number">${residents[id].number}</span><span><strong data-name="${id}">${esc(memory.names[id])}</strong><small>${residents[id].mood}</small></span><span class="resident-check" aria-hidden="true">↗</span></button>`).join('')}</div>
        <div class="caption-row"><span class="caption-icon">${icons.leaf}</span><p id="caption" role="status">Pick a resident, offer a toy, and see what happens.</p><span class="caption-end" aria-hidden="true">✳</span></div>
        <div class="perch-row"><span class="eyebrow">PERCHES</span><div class="segmented" role="group" aria-label="Arrange the perches"><button data-perches="apart" aria-pressed="true">A little space</button><button data-perches="together" aria-pressed="false">Closer together</button></div><span class="perch-note">Good neighbors make good stories.</span></div>
      </section>
      <aside class="field-note" aria-label="Resident and toys">
        <div class="note-heading"><span class="eyebrow">GETTING TO KNOW</span><span id="resident-index">NO. 01</span></div>
        <div class="identity"><span class="portrait" id="portrait">${portrait('snail')}</span><div><h2 id="resident-name">Pip</h2><span id="species">THE SNAIL</span></div><button class="icon-button rename" id="rename" aria-label="Give Pip a name">${icons.pencil}</button></div>
        <p class="trait" id="trait">A small creature with a very full schedule.</p>
        <div class="mood"><span class="status-dot"></span><span id="mood">Taking his time</span><span id="resident-found">0 / 4 quirks</span></div>
        <div class="toy-section"><div class="toy-heading"><h3>Leave a little something</h3><span>01 — 03</span></div><div class="toys" role="group" aria-label="Choose a toy">${TOYS.map((id, index) => `<button class="toy" data-toy="${id}" aria-label="${toys[id].label}" aria-pressed="${id === toy}"><span class="toy-number">${index + 1}</span>${toyIcon(id)}<span>${id === 'ball' ? 'Wooden ball' : toys[id].label}</span></button>`).join('')}</div><p class="toy-note" id="toy-note">A very good round thing.</p><button id="offer" class="offer" disabled><span id="offer-text">Opening the garden…</span>${icons.arrow}</button><button id="pat" class="pat-button">${icons.pat}<span>Or, give a little pat</span></button></div>
        <div class="observation" id="observation"><p class="eyebrow" id="observation-label">A FIELD NOTE</p><h3 id="observation-title">The best way to make a friend?</h3><p id="observation-line">Start with something round. Stay for the peculiarities.</p><button id="postcard" class="postcard-button" hidden>${icons.camera} Save a postcard</button></div>
      </aside>
    </div>
    <button class="scrapbook-strip" id="collection"><span class="strip-book">${icons.book}</span><span class="collection-copy"><strong>Your little collection of peculiarities</strong><span id="collection-line">Every friendship starts with a small discovery.</span></span><span class="discovery-dots" aria-hidden="true">${behaviors.map((b) => `<i data-discovery="${b.id}"></i>`).join('')}</span><span class="strip-count">0 <span>/ 13</span></span><span class="strip-arrow" aria-hidden="true">↗</span></button>
    <footer><span id="save-status">Your garden remembers you. Saved on this device.</span><span><span class="key">1</span><span class="key">2</span><span class="key">3</span> toys <span class="footer-divider">/</span> <span class="key">P</span> a little pat</span></footer>
  </main>
  <dialog id="scrapbook" aria-labelledby="book-title"><div class="dialog-top"><span class="eyebrow">NOTES FROM THE LITTLE GARDEN</span><button class="icon-button close" aria-label="Close scrapbook">${icons.close}</button></div><div class="book-intro"><h2 id="book-title">A collection of peculiarities.</h2><p>Little things you know about your little friends.</p><span class="book-total">0 / 13 discovered</span></div><div id="book-pages" class="book-pages"></div><div class="book-bottom">No deadlines. No perfect scores. Just getting to know each other.</div></dialog>
  <dialog id="guide" class="small-dialog" aria-labelledby="guide-title"><div class="dialog-top"><span class="eyebrow">A SMALL GUIDE</span><button class="icon-button close" aria-label="Close guide">${icons.close}</button></div><h2 id="guide-title">A little company.</h2><p>There is no garden to keep alive. Only a few friends to get to know.</p><ol class="guide-steps"><li><span>01</span><div><strong>Pick a resident.</strong><p>A snail, a frog, or a very sensitive plant.</p></div></li><li><span>02</span><div><strong>Offer a toy. Watch closely.</strong><p>Each friend has their own ideas about your gifts.</p></div></li><li><span>03</span><div><strong>Get a little curious.</strong><p>Try a gift twice. Give a pat. Bring the perches closer. Some stories take two.</p></div></li></ol><p>Discoveries live in your scrapbook. Replay a favorite or save a picture postcard.</p><div class="shortcut-list"><span>← →</span> Choose a resident <span>1 2 3</span> Choose a toy <span>Enter</span> Offer a toy <span>P</span> Give a pat <span>Space</span> Pause / resume</div><button class="offer close">Back to the garden ${icons.arrow}</button></dialog>
  <dialog id="name-dialog" class="small-dialog" aria-labelledby="name-title"><div class="dialog-top"><span class="eyebrow">MAKE YOURSELF AT HOME</span><button class="icon-button close" aria-label="Cancel naming">${icons.close}</button></div><h2 id="name-title">A name of their own.</h2><form id="name-form"><label for="name-input">What shall we call this little resident?</label><input id="name-input" maxlength="18" autocomplete="off" required /><p class="input-note">Up to 18 characters. A small name for a small friend.</p><button class="offer" type="submit">That’s the one ${icons.arrow}</button></form></dialog>
  <div class="toast" id="toast" role="status" hidden></div>
`

const el = <T extends HTMLElement = HTMLElement>(selector: string): T => document.querySelector<T>(selector)!
const caption = (text: string) => { if (el('#caption').textContent !== text) el('#caption').textContent = text }
const anyDialog = () => !!document.querySelector('dialog[open]')
function persist(): void {
  el('#save-status').textContent = saveMemory(memory) ? 'Your garden remembers you. Saved on this device.' : 'Storage is unavailable. Your garden will last for this visit.'
}
let toastTimer = 0
function toast(text: string): void {
  window.clearTimeout(toastTimer)
  el('#toast').textContent = text
  el('#toast').hidden = false
  toastTimer = window.setTimeout(() => { el('#toast').hidden = true }, 3200)
}

function refresh(): void {
  const id = state.selected
  const resident = residents[id]
  el('#resident-name').textContent = memory.names[id]
  el('#resident-index').textContent = `NO. ${resident.number}`
  el('#species').textContent = resident.species.toUpperCase()
  el('#portrait').innerHTML = portrait(id)
  el('#trait').textContent = resident.trait
  el('#mood').textContent = busy ? 'Up to something' : resident.mood
  const own = behaviors.filter((b) => b.resident === id)
  el('#resident-found').textContent = `${own.filter((b) => memory.found.includes(b.id)).length} / ${own.length} quirks`
  el('#rename').setAttribute('aria-label', `Give ${memory.names[id]} a name`)
  document.querySelectorAll<HTMLElement>('[data-name]').forEach((node) => { node.textContent = memory.names[node.dataset.name as Resident] })
  document.querySelectorAll<HTMLButtonElement>('[data-resident]').forEach((node) => {
    const residentId = node.dataset.resident as Resident
    node.setAttribute('aria-pressed', String(residentId === id))
    node.disabled = busy
    if (node.classList.contains('resident-target')) {
      node.setAttribute('aria-label', `Choose ${memory.names[residentId]}, ${residents[residentId].species}`)
      node.querySelector('span')!.textContent = memory.names[residentId]
    }
  })
  document.querySelectorAll<HTMLButtonElement>('[data-toy]').forEach((node) => { node.setAttribute('aria-pressed', String(node.dataset.toy === toy)); node.disabled = busy })
  document.querySelectorAll<HTMLButtonElement>('[data-perches]').forEach((node) => { node.setAttribute('aria-pressed', String(node.dataset.perches === memory.perches)); node.disabled = busy })
  for (const selector of ['#offer', '#pat', '#rename']) el<HTMLButtonElement>(selector).disabled = busy || !ready
  el('#offer-text').textContent = !ready ? 'Opening the garden…' : busy ? 'A little moment…' : `Offer the ${toys[toy].short}`
  el('#offer').classList.toggle('playing', busy)
  el('#toy-note').textContent = toys[toy].note
  el('#pause').setAttribute('aria-pressed', String(paused))
  el('#pause span').textContent = paused ? 'Resume' : 'Pause'
  el('.pause-overlay').hidden = !paused
  el('#sound').innerHTML = memory.sound ? icons.sound : icons.quiet
  el('#sound').setAttribute('aria-pressed', String(memory.sound))
  el('#sound').setAttribute('aria-label', memory.sound ? 'Sound on; click to mute' : 'Sound off; click to enable')
  el('.book-count').textContent = `${memory.found.length}/13`
  el('.strip-count').innerHTML = `${memory.found.length} <span>/ 13</span>`
  document.querySelectorAll<HTMLElement>('[data-discovery]').forEach((node) => { node.classList.toggle('found', memory.found.includes(node.dataset.discovery as BehaviorId)) })
  el('#collection-line').textContent = memory.found.length === 13 ? 'A garden full of familiar faces. You know all their little ways.' : sessionDiscoveries > 0 ? `${sessionDiscoveries} new ${sessionDiscoveries === 1 ? 'discovery' : 'discoveries'} this visit. There’s always another little story.` : 'Every friendship starts with a small discovery.'
}

function select(id: Resident): void {
  if (busy) return
  state.selected = id
  state.pet = null
  sound.play({ kind: 'pluck', pitch: 1.3 })
  caption(`${memory.names[id]} · ${residents[id].note}`)
  refresh()
}

function run(decision: Decision, replay = false): void {
  if (!ready || busy) return
  sound.unlock()
  state.selected = decision.resident
  toy = decision.toy
  state.performance = perform(cast, decision, memory.names)
  state.time = 0
  state.pet = null
  lastPlay = state.performance
  cueIndex = 0
  busy = true
  paused = false
  replaying = replay
  el('#observation-label').textContent = replay ? 'A FAMILIAR LITTLE STORY' : 'A MOMENT IN THE GARDEN'
  el('#observation-title').textContent = 'Let’s see what happens.'
  el('#observation-line').textContent = 'They have their own ideas about these things.'
  el('#postcard').hidden = true
  caption(`A ${toys[toy].short} for ${memory.names[state.selected]}.`)
  refresh()
}

function finish(): void {
  if (!state.performance) return
  busy = false
  const behavior = behaviorById(state.performance.decision.behavior)!
  const discovered = !replaying && remember(memory, state.performance.decision)
  if (discovered) sessionDiscoveries++
  if (!replaying) persist()
  el('#observation-label').textContent = discovered ? 'NEW IN YOUR SCRAPBOOK' : 'A FAMILIAR LITTLE QUIRK'
  el('#observation-title').textContent = behavior.title
  el('#observation-line').textContent = behavior.line
  el('#postcard').hidden = false
  caption(`${discovered ? 'Discovered' : 'Remembered'}: ${behavior.title}. ${behavior.line}`)
  if (discovered) sound.play({ kind: 'bell', pitch: 0.75 })
  refresh()
}

function tick(dt: number): void {
  if (paused || anyDialog()) return
  state.idle += dt
  if (!state.performance) return
  const play = state.performance
  state.time += dt
  if (busy) {
    while (cueIndex < play.cues.length && play.cues[cueIndex].at <= state.time) sound.play(play.cues[cueIndex++])
    const text = play.captions.filter((item) => item.at <= state.time).at(-1)?.text
    if (text) caption(text)
    el('#offer').style.setProperty('--progress', `${Math.min(100, state.time / play.duration * 100)}%`)
    if (state.time >= play.duration) finish()
  } else if (state.time > play.duration + 3) state.performance = null
}

function pat(): void {
  if (!ready || busy) return
  sound.unlock()
  state.pet = { resident: state.selected, start: state.idle }
  memory.pats[state.selected]++
  memory.last = null
  persist()
  sound.play({ kind: 'boop', pitch: 1.7 })
  caption(state.selected === 'fern' ? `${memory.names.fern} appreciates a gentle touch. Perhaps something soft, next?` : `${memory.names[state.selected]} leans into your hand. A small kindness, well received.`)
  el('#mood').textContent = 'Quite fond of you'
}

function openBook(): void {
  el('.book-total').textContent = `${memory.found.length} / 13 discovered`
  el('#book-pages').innerHTML = behaviors.map((b, index) => {
    const found = memory.found.includes(b.id)
    const hint = b.hint.replaceAll('Pip', memory.names.snail).replaceAll('Moss', memory.names.frog).replaceAll('Fern', memory.names.fern)
    return `<article class="book-page ${found ? 'discovered' : 'undiscovered'}"><div class="page-top"><span>${String(index + 1).padStart(2, '0')}</span><span>${found ? esc(memory.names[b.resident]) : 'YET TO BE DISCOVERED'}</span></div><div class="page-illustration">${found ? portrait(b.resident) + toyIcon(b.toy) : '<span>?</span>'}</div><h3>${found ? b.title : 'A little mystery'}</h3><p>${found ? b.line : 'There’s something you don’t know about this friend. Yet.'}</p>${found ? `<button class="replay-button" data-replay="${b.id}">${icons.replay} Watch again</button>` : `<details><summary>A small hint</summary><p>${esc(hint)}</p></details>`}</article>`
  }).join('')
  el<HTMLDialogElement>('#scrapbook').showModal()
}

document.querySelectorAll<HTMLButtonElement>('[data-resident]').forEach((node) => node.addEventListener('click', () => select(node.dataset.resident as Resident)))
document.querySelectorAll<HTMLButtonElement>('[data-toy]').forEach((node) => node.addEventListener('click', () => { if (busy) return; toy = node.dataset.toy as Toy; sound.play({ kind: 'pluck', pitch: 1.4 }); refresh() }))
document.querySelectorAll<HTMLButtonElement>('[data-perches]').forEach((node) => node.addEventListener('click', () => {
  if (busy) return
  memory.perches = node.dataset.perches === 'together' ? 'together' : 'apart'
  state.performance = null
  persist()
  sound.play({ kind: 'land' })
  caption(memory.perches === 'together' ? 'A little closer. Perhaps Moss has a gift for the neighbor?' : 'A little room for everyone’s peculiarities.')
  refresh()
}))
el('#offer').addEventListener('click', () => run(decide(memory, state.selected, toy)))
el('#pat').addEventListener('click', pat)
const pause = () => { paused = !paused; if (paused) sound.quiet(); else sound.unlock(); refresh() }
el('#pause').addEventListener('click', pause)
el('#resume').addEventListener('click', pause)
el('#sound').addEventListener('click', () => { memory.sound = !memory.sound; sound.enabled = memory.sound; if (memory.sound) { sound.unlock(); sound.play({ kind: 'bell' }) } else sound.quiet(); persist(); refresh() })
el('#open-book').addEventListener('click', openBook)
el('#collection').addEventListener('click', openBook)
el('#help').addEventListener('click', () => el<HTMLDialogElement>('#guide').showModal())
document.querySelectorAll<HTMLButtonElement>('.close').forEach((button) => button.addEventListener('click', () => button.closest('dialog')!.close()))
document.querySelectorAll<HTMLDialogElement>('dialog').forEach((dialog) => dialog.addEventListener('click', (event) => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close() } }))
el('#book-pages').addEventListener('click', (event) => {
  const button = (event.target as Element).closest<HTMLElement>('[data-replay]')
  if (!button || busy) return
  const behavior = behaviorById(button.dataset.replay!)!
  el<HTMLDialogElement>('#scrapbook').close()
  run({ resident: behavior.resident, toy: behavior.toy, behavior: behavior.id, perches: behavior.id === 'neighbors' ? 'together' : memory.perches }, true)
})
el('#rename').addEventListener('click', () => {
  el<HTMLInputElement>('#name-input').value = memory.names[state.selected]
  el<HTMLDialogElement>('#name-dialog').showModal()
  el<HTMLInputElement>('#name-input').select()
})
el('#name-form').addEventListener('submit', (event) => {
  event.preventDefault()
  memory.names[state.selected] = cleanName(el<HTMLInputElement>('#name-input').value, residents[state.selected].name)
  persist()
  el<HTMLDialogElement>('#name-dialog').close()
  refresh()
  caption(`${memory.names[state.selected]}. Yes, that suits you.`)
})
el('#postcard').addEventListener('click', async () => {
  if (!lastPlay || !garden) return
  const button = el<HTMLButtonElement>('#postcard')
  button.disabled = true
  try { await garden.postcard(lastPlay); toast('A little piece of the garden. Postcard downloaded.') }
  catch { toast('The postcard couldn’t be saved. Please try again.') }
  finally { button.disabled = false }
})
document.addEventListener('pointerdown', () => sound.unlock(), { passive: true })
document.addEventListener('keydown', (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.repeat || anyDialog() || (event.target as Element).matches('input, textarea, select')) return
  sound.unlock()
  if (event.key === '?') { event.preventDefault(); el<HTMLDialogElement>('#guide').showModal(); return }
  if (event.key === ' ' && !(event.target as Element).closest('button, a')) { event.preventDefault(); pause(); return }
  if (busy) return
  if (['1', '2', '3'].includes(event.key)) { toy = TOYS[Number(event.key) - 1]; refresh() }
  else if (event.key.toLowerCase() === 'p') { event.preventDefault(); pat() }
  else if (event.key === 'Enter' && !(event.target as Element).closest('button, a, summary')) { event.preventDefault(); run(decide(memory, state.selected, toy)) }
  else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); select(RESIDENTS[(RESIDENTS.indexOf(state.selected) + (event.key === 'ArrowRight' ? 1 : 2)) % 3]) }
})
document.addEventListener('visibilitychange', () => { if (document.hidden) sound.quiet(); else if (!paused) sound.unlock() })
motion.addEventListener('change', () => { state.reducedMotion = motion.matches })
window.addEventListener('pagehide', (event) => { if (!event.persisted) { garden?.destroy(); sound.destroy() } })

refresh()
loadCast().then((loaded) => {
  cast = loaded
  garden = createGarden(el('#stage'), state, cast, tick)
  ready = true
  refresh()
}).catch(() => {
  el('#offer-text').textContent = 'The garden couldn’t open'
  caption('Please reload to open the garden. Your scrapbook is safe.')
  const retry = document.createElement('button')
  retry.className = 'text-button'
  retry.textContent = 'Try again'
  retry.addEventListener('click', () => location.reload())
  el('.caption-row').append(retry)
})
