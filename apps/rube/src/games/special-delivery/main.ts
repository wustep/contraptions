import './style.css'
import { Depot, SHIFT } from './game'
import { ADDRESSES, COLORS, COLOR_NAMES, LETTERS, type Address, type Color } from './machines'
import { DepotAudio } from './audio'
import { createDepotScene } from './scene'

type Screen = 'welcome' | 'practice' | 'shift' | 'result'
type Crew = 'solo' | 'duo'
const app = document.querySelector<HTMLDivElement>('#app')!
const audio = new DepotAudio()
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
let screen: Screen = 'welcome'
let crew: Crew = 'solo'
let swapped = false
let paused = false
let game = new Depot('first-post', true)
let lastFrame = performance.now()
let visualTime = 0
let replayStart = 0
let replaying = false
let lastRevision = -1
let lastSecond = -1
let tutorialStep = 0
let saved = false
let best = 0
let bestBefore = 0
let serial = 0

const readBest = (): number => {
  try { return Math.max(0, Number(localStorage.getItem(`delivery-v1-best-${crew}`)) || 0) } catch { return 0 }
}
const dot = (color: number, small = false) => `<span class="parcel ${small ? 'small' : ''}" style="--parcel:${COLORS[color]}" aria-label="${COLOR_NAMES[color]}">${LETTERS[color]}</span>`
const key = (text: string) => `<kbd>${text}</kbd>`
const paintKeys = () => swapped ? ['J', 'K', 'L'] : ['A', 'S', 'D']
const routeKeys = () => swapped ? ['A', 'S', 'D'] : ['J', 'K', 'L']

app.innerHTML = `
  <header class="site-header"><a href="/machine/" class="brand"><span class="brand-mark">c.</span> contraptions <span class="slash">/</span> <span class="edition">games</span></a>
    <div class="utilities"><button id="help" class="text-button" aria-label="How to play">How to play</button><button id="sound" class="text-button" aria-pressed="false">Sound on</button><button id="pause" class="text-button" hidden>Pause ${key('Esc')}</button></div>
  </header>
  <main>
    <section class="masthead" aria-labelledby="title"><div><div class="eyebrow">THE CONTRAPTIONS POSTAL SERVICE</div><h1 id="title">Special Delivery<span class="title-dot">.</span></h1><p class="tagline">A very small post office. A very big responsibility.</p></div>
      <div class="postmark" aria-hidden="true"><span>HANDLE WITH</span><strong>care</strong><span>EST. JUST NOW</span></div>
    </section>
    <section class="welcome" id="welcome"><div><p><strong>Paint the color. Pick the address.</strong> Keep the post moving for 90 seconds.</p><p class="muted">Wrong delivery? Gus the frog will bring it back. You get another chance.</p></div>
      <div class="start-area"><div class="crew-picker" aria-label="Number of players"><button data-crew="solo" aria-pressed="true">One player</button><button data-crew="duo" aria-pressed="false">Two players</button></div><div class="start-buttons"><button id="learn" class="primary">Learn the ropes <span>↗</span></button><button id="start" class="secondary">Clock in →</button></div></div>
    </section>
    <section class="tutorial" id="tutorial" hidden aria-live="polite"><div><span class="eyebrow" id="lesson-number">A LITTLE PRACTICE / 01</span><p id="lesson">Press A to paint one red parcel.</p></div><button id="skip" class="secondary">Start 90-second shift →</button></section>
    <div class="depot" id="depot">
      <section class="scoreboard" aria-label="Shift statistics"><div class="shift-label"><span class="status-dot"></span><span id="shift-label">DEPOT No. 03 · READY WHEN YOU ARE</span></div>
        <div class="stat"><span>DELIVERED</span><strong id="delivered">00</strong></div><div class="stat"><span>POSTAGE</span><strong id="score">0000</strong></div><div class="stat streak-stat"><span>STREAK</span><strong id="streak">1×</strong></div><div class="stat timer-stat"><span>SHIFT LEFT</span><strong id="timer">1:30</strong></div>
      </section>
      <div class="time-track"><span id="time-track"></span></div>
      <section class="orders" aria-label="Incoming orders">${ADDRESSES.map((name, i) => `
        <article class="order" id="order-${i}" aria-label="${name} order"><div class="order-top"><span class="address-number">0${i + 1}</span><h2>${name}</h2><span class="order-status" id="order-status-${i}">REQUESTING</span></div>
          <div class="order-request"><div class="wanted" id="wanted-${i}">${dot(i)}<strong>${COLOR_NAMES[i]}</strong></div><div class="order-next">NEXT <span id="next-${i}">${dot((i + 1) % 3, true)}</span></div></div><div class="deadline-track"><span id="deadline-${i}"></span></div>
        </article>`).join('')}</section>
      <div class="stage-wrap"><div id="stage"></div><div id="pause-overlay" class="pause-overlay" hidden><span class="eyebrow">THE POST CAN WAIT</span><h2>Taking a breather.</h2><p>The shift clock is paused.</p><button id="resume" class="primary">Back to work →</button></div><div class="stage-note"><span>PAINT → SORT → SEND</span><span>ALL POSTAGE IS PERSONAL.</span></div></div>
      <div class="notice" id="notice" role="status"><span class="notice-icon">↳</span><span id="notice-text">Match a parcel’s color to an address’s request.</span><span id="record">BEST 0000</span></div>
      <section class="workstations" aria-label="Game controls">
        <div class="workstation paint-station"><div class="station-heading"><h2><span>01</span> The painter</h2><span class="role" id="paint-role">LEFT HAND</span></div><div class="station-status"><span id="paint-status">Pick a color to paint & queue</span><span id="intake-count">0 / 3 queued</span></div>
          <div class="control-row">${COLOR_NAMES.map((name, i) => `<button class="paint-button" data-paint="${i}" style="--parcel:${COLORS[i]}"><span>${dot(i, true)} ${name}</span><kbd id="paint-key-${i}">${paintKeys()[i]}</kbd></button>`).join('')}</div>
          <div class="station-bottom"><button class="small-button" id="hold" aria-pressed="false">${key('F')} Hold feed</button><div class="buffer" id="intake" aria-label="Paint queue"><span class="buffer-empty">Queue is clear</span></div></div>
        </div>
        <div class="workstation dispatch-station"><div class="station-heading"><h2><span>02</span> The dispatcher</h2><span class="role" id="send-role">RIGHT HAND</span></div><div class="station-status"><span id="send-status">Send the oldest parcel to its address</span><span id="ready-count">0 / 3 ready</span></div><div class="reload-track" aria-hidden="true"><span id="reload-track"></span></div>
          <div class="control-row">${ADDRESSES.map((name, i) => `<button class="route-button" data-send="${i}"><span><small>0${i + 1}</small> ${name}</span><kbd id="send-key-${i}">${routeKeys()[i]}</kbd></button>`).join('')}</div>
          <div class="station-bottom"><button class="small-button" id="park">${key('H')} Park / swap</button><div class="buffer" id="ready" aria-label="Dispatch queue"><span class="buffer-empty">Waiting for paint</span></div><span id="parked"></span></div>
        </div>
      </section>
    </div>
    <section class="results" id="results" hidden tabindex="-1" aria-labelledby="result-title"><div class="receipt"><div class="eyebrow">CONTRAPTIONS POSTAL SERVICE / SHIFT RECEIPT</div><h2 id="result-title">That’s the last post.</h2><p id="result-subtitle"></p><div class="receipt-score"><strong id="final-score">0</strong><span>POSTAGE EARNED</span><span id="new-record" hidden>NEW PERSONAL BEST ↗</span></div><div class="receipt-stats" id="receipt-stats"></div><p class="result-note" id="result-note"></p><div class="result-actions"><button id="again" class="primary">Another shift →</button><button id="swap" class="secondary">Swap jobs & play</button><button id="replay" class="text-button">Replay a delivery ↶</button></div></div></section>
    <footer><span id="crew-hint">One player · left hand paints, right hand dispatches.</span><span>90 seconds · three addresses · one very useful frog</span></footer>
  </main>
  <dialog id="help-dialog"><form method="dialog"><button class="dialog-close text-button" aria-label="Close instructions">Close ×</button></form><div class="eyebrow">YOUR FIRST DAY AT THE DEPOT</div><h2>A little organized chaos.</h2><ol><li><strong>Read the requests.</strong> Each address asks for a red, blue, or yellow parcel. The little letter repeats its color.</li><li><strong>Paint & queue.</strong> A / S / D paint red / blue / yellow. Parcels ride up the conveyor in order.</li><li><strong>Send the front parcel.</strong> J / K / L send it to Windmill / Lighthouse / Moon. A match earns 100 postage; every four in a row raises the multiplier.</li><li><strong>Make a little room.</strong> F holds the paint feed. H parks the front parcel, or swaps it with the parked one.</li><li><strong>Save your mistakes.</strong> Gus returns wrong deliveries. Your next paint key repaints the oldest return. Deliver it for a 50-postage rescue bonus.</li></ol><p>One player uses both hands. Two players take a job each on the same keyboard, or tap their own controls. Esc pauses. Sent parcels still count after the bell.</p><p class="muted">Tip: read the NEXT color to prepare ahead. Requests get quicker at 60 and 30 seconds left.</p><button id="help-practice" class="primary">Try a practice delivery →</button></dialog>
`

function element<T extends HTMLElement = HTMLElement>(id: string): T { return document.getElementById(id)! as T }
function bind(id: string, fn: () => void): void { element(id).addEventListener('click', () => { audio.unlock(); fn() }) }
function wireGame(): void { game.onSound = (sound) => audio.play(sound) }
wireGame()

function chooseCrew(next: Crew): void {
  crew = next; best = readBest()
  document.querySelectorAll<HTMLButtonElement>('[data-crew]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.crew === crew)))
  element('paint-role').textContent = crew === 'solo' ? (swapped ? 'RIGHT HAND' : 'LEFT HAND') : (swapped ? 'PLAYER 2' : 'PLAYER 1')
  element('send-role').textContent = crew === 'solo' ? (swapped ? 'LEFT HAND' : 'RIGHT HAND') : (swapped ? 'PLAYER 1' : 'PLAYER 2')
  element('crew-hint').textContent = crew === 'solo' ? 'One player · left hand paints, right hand dispatches.' : 'Two players · one paints, one dispatches. Talk to each other.'
  element('record').textContent = `BEST ${String(best).padStart(4, '0')}`
}
chooseCrew('solo')
document.querySelectorAll<HTMLButtonElement>('[data-crew]').forEach((b) => b.addEventListener('click', () => chooseCrew(b.dataset.crew as Crew)))

function start(practice: boolean): void {
  audio.unlock(); paused = false; replaying = false; saved = false; tutorialStep = 0
  bestBefore = readBest()
  screen = practice ? 'practice' : 'shift'
  game = new Depot(practice ? 'first-post' : `post-${++serial}-${Date.now().toString(36)}`, practice)
  wireGame(); visualTime = 0; lastFrame = performance.now(); lastRevision = -1; lastSecond = -1
  element('welcome').hidden = true; element('tutorial').hidden = !practice; element('results').hidden = true
  element('depot').classList.remove('result-mode'); element('pause-overlay').hidden = true
  element('pause').hidden = false; element('pause').textContent = 'Pause [Esc]'
  document.body.classList.add('working')
  document.querySelectorAll<HTMLButtonElement>('.workstations button').forEach((b) => { b.disabled = false })
  element('skip').textContent = 'Start 90-second shift →'
  element('replay').textContent = 'Replay a delivery ↶'
  update()
}
function pause(next: boolean): void {
  if (screen !== 'shift' && screen !== 'practice') return
  paused = next; lastFrame = performance.now()
  element('pause-overlay').hidden = !paused
  element('pause').textContent = paused ? 'Resume [Esc]' : 'Pause [Esc]'
  if (paused) element('resume').focus()
}
bind('learn', () => start(true)); bind('start', () => start(false)); bind('skip', () => start(false))
bind('again', () => start(false)); bind('resume', () => pause(false)); bind('pause', () => pause(!paused))
bind('swap', () => {
  swapped = !swapped
  for (let i = 0; i < 3; i++) { element(`paint-key-${i}`).textContent = paintKeys()[i]; element(`send-key-${i}`).textContent = routeKeys()[i] }
  element('hold').innerHTML = `${key(swapped ? 'H' : 'F')} Hold feed`
  element('park').innerHTML = `${key(swapped ? 'F' : 'H')} Park / swap`
  chooseCrew(crew)
  start(false)
})
bind('sound', () => { audio.muted = !audio.muted; element('sound').textContent = audio.muted ? 'Sound off' : 'Sound on'; element('sound').setAttribute('aria-pressed', String(audio.muted)) })
const helpDialog = element<HTMLDialogElement>('help-dialog')
bind('help', () => { pause(true); helpDialog.showModal() })
bind('help-practice', () => { helpDialog.close(); start(true) })
helpDialog.addEventListener('close', () => { if (paused) element('resume').focus() })

function action(fn: () => void): void {
  audio.unlock()
  if (screen === 'welcome') start(true)
  if (paused || screen === 'result' || helpDialog.open) return
  fn(); update()
}
document.querySelectorAll<HTMLButtonElement>('[data-paint]').forEach((b) => b.addEventListener('click', () => action(() => game.paint(Number(b.dataset.paint) as Color))))
document.querySelectorAll<HTMLButtonElement>('[data-send]').forEach((b) => b.addEventListener('click', () => action(() => game.send(Number(b.dataset.send) as Address))))
bind('hold', () => action(() => game.hold())); bind('park', () => action(() => game.park()))

window.addEventListener('keydown', (event) => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || helpDialog.open) return
  const pressed = event.key.toUpperCase()
  if (pressed === 'ESCAPE') { event.preventDefault(); pause(!paused); return }
  const paint = paintKeys().indexOf(pressed)
  const send = routeKeys().indexOf(pressed)
  let target: HTMLButtonElement | null = null
  if (paint >= 0) target = document.querySelector(`[data-paint="${paint}"]`)
  if (send >= 0) target = document.querySelector(`[data-send="${send}"]`)
  if (pressed === (swapped ? 'H' : 'F')) target = element<HTMLButtonElement>('hold')
  if (pressed === (swapped ? 'F' : 'H')) target = element<HTMLButtonElement>('park')
  if (!target) return
  event.preventDefault(); target.classList.add('pressed'); target.click()
  window.setTimeout(() => target?.classList.remove('pressed'), 100)
})
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(true) })
window.addEventListener('blur', () => { if (!helpDialog.open) pause(true) })

function update(): void {
  const active = screen === 'shift' || screen === 'practice'
  const left = Math.max(0, Math.ceil(SHIFT - game.time))
  const seconds = game.practice ? SHIFT : left
  element('timer').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  element('timer').classList.toggle('urgent', !game.practice && left <= 15)
  element('time-track').style.width = `${game.practice ? 100 : Math.max(0, 1 - game.time / SHIFT) * 100}%`
  element('shift-label').textContent = screen === 'welcome' ? 'DEPOT No. 03 · READY WHEN YOU ARE' : screen === 'practice' ? 'TRAINING SHIFT · NO CLOCK, NO PRESSURE' : screen === 'result' ? 'DEPOT No. 03 · CLOSED FOR TEA' : game.phase === 'closing' ? 'LAST POST · FINISHING DELIVERIES' : ['THE MORNING POST · NICE AND STEADY', 'THE LUNCH RUSH · KEEP IT MOVING', 'THE LAST COLLECTION · MAKE IT COUNT'][game.rush]
  for (let i = 0; i < 3; i++) {
    const o = game.orders[i]
    element(`order-${i}`).classList.toggle('reserved', o.reserved)
    element(`order-${i}`).classList.toggle('expiring', !game.practice && o.until - game.time < 5 && !o.reserved)
    element(`order-status-${i}`).textContent = o.reserved ? 'ON THE WAY ↗' : game.practice || !active ? 'REQUESTING' : `${Math.max(0, Math.ceil(o.until - game.time))}s LEFT`
    element(`deadline-${i}`).style.width = `${game.practice || o.reserved ? 100 : Math.min(100, Math.max(0, (o.until - game.time) / (23 - game.rush * 4) * 100))}%`
  }
  if (screen === 'practice') {
    tutorialStep = game.delivered ? 2 : game.ready.length || game.inFlight ? 1 : tutorialStep
    element('lesson-number').textContent = `A LITTLE PRACTICE / ${String(tutorialStep + 1).padStart(2, '0')}`
    element('lesson').textContent = tutorialStep === 2 ? 'Signed, sealed, delivered. You’re ready for the real shift.' : tutorialStep === 1 ? `Send the front parcel to an address requesting its color. ${routeKeys().join(' / ')} choose the address.` : game.painting ? 'The paint is on. Watch it ride up the conveyor…' : `Press ${paintKeys()[0]} (or tap Red) to paint your first parcel.`
    element('skip').classList.toggle('primary', tutorialStep === 2)
  }
  const reloading = game.time < game.cannonFree
  element('reload-track').style.width = `${reloading ? Math.min(100, (1 - (game.cannonFree - game.time) / 2.1) * 100) : 100}%`
  element('ready-count').textContent = reloading ? `Reloading · ${(game.cannonFree - game.time).toFixed(1)}s` : `${game.ready.length} / 3 ready`
  document.querySelectorAll<HTMLButtonElement>('[data-send]').forEach((b, i) => {
    b.disabled = screen === 'result' || (active && (!game.ready.length || reloading || game.orders[i].reserved || game.phase !== 'open'))
    b.classList.toggle('matching', active && !reloading && !!game.ready.length && game.ready[0].color === game.orders[i].color && !game.orders[i].reserved)
  })
  document.querySelectorAll<HTMLButtonElement>('[data-paint]').forEach((b) => {
    b.disabled = screen === 'result' || (active && (game.intake.length >= 3 || (!game.rework.length && game.activeCount >= 8) || game.phase !== 'open'))
  })
  if (lastRevision === game.revision) return
  lastRevision = game.revision
  element('delivered').textContent = String(game.delivered).padStart(2, '0')
  element('score').textContent = String(game.score).padStart(4, '0')
  element('streak').textContent = `${game.multiplier}×`
  element('streak').title = `${game.streak} in a row. Multiplier rises every 4 deliveries.`
  element('notice-text').textContent = game.notice
  element('notice').dataset.kind = game.noticeKind
  element('paint-status').textContent = game.feedHeld ? 'Feed held — press again to release' : game.rework.length ? `↶ ${game.rework.length} returned — next color repaints one` : game.load >= 3 ? 'Shelf filling — queue the next colors' : 'Pick a color to paint & queue'
  element('send-status').innerHTML = game.ready.length ? `Next to send: ${dot(game.ready[0].color, true)} <strong>${COLOR_NAMES[game.ready[0].color]}</strong>` : game.painting ? 'Parcel on the belt…' : 'Send the oldest parcel to its address'
  element('intake-count').textContent = `${game.intake.length} queued · ${game.painting} on belt`
  element('intake').innerHTML = game.intake.length ? game.intake.map((p) => dot(p.color, true)).join('') : '<span class="buffer-empty">Queue is clear</span>'
  element('ready').innerHTML = game.ready.length ? game.ready.map((p, i) => `<span class="${i ? '' : 'front-parcel'}">${dot(p.color, true)}</span>`).join('') : '<span class="buffer-empty">Waiting for paint</span>'
  element('parked').innerHTML = game.parked ? `<span class="parked-label">PARKED</span> ${dot(game.parked.color, true)}` : ''
  element('hold').setAttribute('aria-pressed', String(game.feedHeld))
  for (let i = 0; i < 3; i++) {
    const o = game.orders[i]
    element(`wanted-${i}`).innerHTML = `${dot(o.color)}<strong>${COLOR_NAMES[o.color]}</strong>`
    element(`next-${i}`).innerHTML = dot(o.next, true)
  }
}

function result(): void {
  screen = 'result'; paused = false; replaying = false
  element('pause').hidden = true; element('pause-overlay').hidden = true
  element('results').hidden = false; element('tutorial').hidden = true
  element('depot').classList.add('result-mode')
  document.querySelectorAll<HTMLButtonElement>('.workstations button').forEach((b) => { b.disabled = true })
  if (!saved) {
    saved = true
    best = Math.max(bestBefore, game.score)
    try { localStorage.setItem(`delivery-v1-best-${crew}`, String(best)) } catch { /* Records are optional. */ }
  }
  element('record').textContent = `BEST ${String(best).padStart(4, '0')}`
  element('final-score').textContent = game.score.toLocaleString()
  element('new-record').hidden = game.score <= bestBefore
  element('result-title').textContent = game.delivered >= 24 ? 'First-class service.' : game.delivered >= 12 ? 'The post gets through.' : game.delivered ? 'Every parcel has a story.' : 'A quiet day at the depot.'
  element('result-subtitle').textContent = `${crew === 'duo' ? 'Two pairs of hands' : 'One pair of hands'}. Ninety seconds. ${game.delivered} happy mailboxes.`
  element('receipt-stats').innerHTML = [['Delivered', game.delivered], ['Best streak', game.bestStreak], ['Rescued', game.rescues], ['Returned', game.mistakes], ['Expired', game.missed]].map(([name, value]) => `<div><span>${name}</span><strong>${value}</strong></div>`).join('')
  element('result-note').textContent = game.rescues ? `Gus helped rescue ${game.rescues} ${game.rescues === 1 ? 'parcel' : 'parcels'}. Employee of the month, probably.` : game.mistakes ? 'A few scenic detours. Next time, repaint the returns for bonus postage.' : 'Gus has filed a request for a longer tea break.'
  element('swap').hidden = crew !== 'duo'
  element('replay').hidden = !game.highlight()
  element('results').focus({ preventScroll: true })
  element('results').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'center' })
  lastRevision = -1; update()
}
bind('replay', () => {
  const highlight = game.highlight()
  if (!highlight) return
  replaying = !replaying; replayStart = performance.now()
  element('replay').textContent = replaying ? 'Stop replay ■' : 'Replay a delivery ↶'
  element('notice-text').textContent = highlight.caption
  if (replaying) element('stage').scrollIntoView({ behavior: 'smooth', block: 'center' })
})

const destroyScene = createDepotScene(element('stage'), () => game, () => visualTime)
let animation = 0
function frame(now: number): void {
  const dt = Math.min((now - lastFrame) / 1000, 0.1)
  lastFrame = now
  if ((screen === 'shift' || screen === 'practice') && !paused && !helpDialog.open) {
    game.advance(game.time + dt)
    if (game.phase === 'finished') result()
  }
  if (replaying) {
    const highlight = game.highlight()!
    visualTime = highlight.start + ((now - replayStart) / 1000 * 0.8) % (highlight.end - highlight.start)
  } else visualTime = screen === 'welcome' ? reducedMotion.matches ? 0 : now / 1000 : game.time
  const second = Math.floor(game.time * 10)
  if (lastSecond !== second || game.revision !== lastRevision) { lastSecond = second; update() }
  animation = requestAnimationFrame(frame)
}
animation = requestAnimationFrame(frame)
update()
if (import.meta.hot) import.meta.hot.dispose(() => { cancelAnimationFrame(animation); destroyScene() })
