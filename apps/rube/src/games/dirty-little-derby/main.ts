import './style.css'
import { DerbyAudio } from './audio'
import { icon } from './icons'
import { available, CARDS, champion, COLORS, commitHeat, consequence, HAND, HEATS, houseChoice, newMatch, resolveHeat, totals, type Card, type Choice, type Match, type Mode, type Racer, type Result, type Route } from './model'
import { DerbyStage } from './stage'

type Phase = 'lobby' | 'plan' | 'handoff' | 'reveal' | 'race' | 'result' | 'podium'
const app = document.querySelector<HTMLDivElement>('#app')!
const escape = (value: string): string => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
let phase: Phase = 'lobby'
let mode: Mode = 'solo'
let match: Match | null = null
let round = 0
let picker: Racer = 0
let draft: { route: Route; card: Card | null } = { route: 'rocket', card: null }
let sealed: [Choice | null, Choice | null] = [null, null]
let result: Result | null = null
let playerNames: [string, string] = ['Dot', 'Pip']
let paused = false
let replay = false
let lastFrame = performance.now()
let lastBeat = ''
let lastAnnouncement = ''
let resumeAfterDialog = false
const sounds = new DerbyAudio()
const fired = new Set<string>()

app.innerHTML = `
  <header class="site-header">
    <a class="wordmark" href="/machine/" aria-label="Contraptions home">${icon('mark')}<span>contraptions<span class="wordmark-dot">.</span></span></a>
    <span class="header-edition">THE LITTLE GAMES DEPARTMENT</span>
    <nav aria-label="Game controls">
      <button class="text-button" id="new-game" hidden>New derby</button>
      <button class="sound-button" id="sound" aria-pressed="false" aria-label="Turn sound on">${icon('mute')}<span>Sound off</span></button>
      <button class="rules-button" id="rules" aria-label="How to play">?</button>
    </nav>
  </header>
  <main id="main">
    <section id="intro"></section>
    <section id="score" aria-label="Derby scoreboard" hidden></section>
    <section class="track-panel" id="track-panel" aria-label="The backyard circuit">
      <div class="track-heading"><span><span class="track-dot"></span> THE BACKYARD CIRCUIT</span><span id="track-label">TWO LANES. NO HARD FEELINGS.</span><button id="course-toggle" data-action="course" aria-expanded="false" aria-controls="track" hidden>Scout course +</button></div>
      <div id="track" role="img" aria-label="Two tiny racers ride rockets and conveyors through the backyard circuit. Live race updates appear below."></div>
      <div class="track-bottom"><span id="track-comment">A short race through some questionable engineering.</span><span class="track-distance">12 METRES OF BAD INTENTIONS</span></div>
      <div id="countdown" aria-hidden="true" hidden></div>
    </section>
    <section id="panel"></section>
  </main>
  <footer class="site-footer"><span>A little game by <a href="/machine/">contraptions.</a></span><span>SMALL BALLS. LOW BLOWS.</span></footer>
  <div class="sr-only" id="announcer" role="status" aria-live="polite" aria-atomic="true"></div>
  <dialog id="dialog" aria-labelledby="dialog-title"></dialog>
`

const intro = document.querySelector<HTMLElement>('#intro')!
const panel = document.querySelector<HTMLElement>('#panel')!
const scoreboard = document.querySelector<HTMLElement>('#score')!
const trackPanel = document.querySelector<HTMLElement>('#track-panel')!
const trackLabel = document.querySelector<HTMLElement>('#track-label')!
const trackComment = document.querySelector<HTMLElement>('#track-comment')!
const countdown = document.querySelector<HTMLElement>('#countdown')!
const dialog = document.querySelector<HTMLDialogElement>('#dialog')!
const demo = resolveHeat(0, [{ route: 'rocket', card: 'clean' }, { route: 'covered', card: 'snail' }])
const stage = new DerbyStage(document.querySelector<HTMLElement>('#track')!, demo, tick)

function announce(message: string): void {
  if (message === lastAnnouncement) return
  lastAnnouncement = message
  document.querySelector('#announcer')!.textContent = message
}

function focusHeading(): void {
  requestAnimationFrame(() => {
    const heading = document.querySelector<HTMLElement>('[data-focus]')
    heading?.focus({ preventScroll: true })
  })
}

function names(): [string, string] { return match ? [match.drivers[0].name, match.drivers[1].name] : playerNames }

function visiblePoints(): [number, number] {
  const completed = match?.results.slice(0, phase === 'result' || phase === 'podium' || (phase === 'race' && replay) ? round + 1 : round) ?? []
  return [0, 1].map(i => completed.reduce((sum, heat) => sum + heat.points[i], 0)) as [number, number]
}

function renderScore(): void {
  scoreboard.hidden = phase === 'lobby'
  if (!match || phase === 'lobby') return
  const points = visiblePoints()
  scoreboard.innerHTML = `
    <div class="score-driver" style="--racer:${COLORS[0]}"><span class="ball-avatar">••</span><span><strong>${escape(names()[0])}</strong><small>${mode === 'solo' ? 'YOU' : 'PLAYER 1'}</small></span><b>${points[0]}<small>PTS</small></b></div>
    <div class="heat-counter"><span>THE DERBY</span><div>${HEATS.map((_h, i) => `<span class="heat-dot ${i < round || ((phase === 'result' || phase === 'podium') && i === round) ? 'done' : i === round ? 'current' : ''}" aria-label="Heat ${i + 1}${i === round ? ', current' : ''}">${i + 1}</span>`).join('')}</div></div>
    <div class="score-driver second" style="--racer:${COLORS[1]}"><span class="ball-avatar">••</span><span><strong>${escape(names()[1])}</strong><small>${mode === 'solo' ? 'THE HOUSE' : 'PLAYER 2'}</small></span><b>${points[1]}<small>PTS</small></b></div>
  `
}

function render(): void {
  app.dataset.phase = phase
  document.querySelector<HTMLElement>('#new-game')!.hidden = phase === 'lobby'
  trackPanel.hidden = phase === 'handoff'
  document.querySelector<HTMLElement>('#course-toggle')!.hidden = phase !== 'plan'
  countdown.hidden = true
  renderScore()
  intro.innerHTML = ''
  trackLabel.textContent = phase === 'lobby' ? 'TWO LANES. NO HARD FEELINGS.' : `HEAT ${round + 1} / 3 · ${HEATS[round].name.toUpperCase()}`
  trackComment.textContent = phase === 'lobby' ? 'A short race through some questionable engineering.' : phase === 'plan' ? 'Scout the course. Your route is a secret until the reveal.' : 'Your choices. Their consequences.'
  if (phase === 'lobby') renderLobby()
  if (phase === 'plan') renderPlan()
  if (phase === 'handoff') renderHandoff()
  if (phase === 'reveal') renderReveal()
  if (phase === 'race') renderRace()
  if (phase === 'result') renderResult()
  if (phase === 'podium') renderPodium()
}

function renderLobby(): void {
  intro.innerHTML = `
    <div class="lobby-hero">
      <div class="hero-copy"><p class="eyebrow">A CONTRAPTIONS ORIGINAL · Nº 01</p><h1>Dirty little<br><span>Derby.</span><span class="title-period">●</span></h1><p class="hero-description">A very small race.<br>A very personal grudge.</p></div>
      <div class="entry-card"><span class="entry-stamp">3 HEATS <i>✳</i> 1 TINY TROPHY</span><h2>Nice friends.<br>Questionable tactics.</h2><p>Pick a route. Play a secret prank. <br>Let the little machines settle it.</p>
        <div class="mode-switch" role="group" aria-label="Game mode"><button data-mode="solo" aria-pressed="${mode === 'solo'}">You vs. the house</button><button data-mode="local" aria-pressed="${mode === 'local'}">Pass & play</button></div>
        ${mode === 'local' ? `<div class="name-fields"><label>PLAYER 1<input id="name-0" maxlength="18" value="${escape(playerNames[0])}" autocomplete="off" aria-label="Player 1 name"></label><label>PLAYER 2<input id="name-1" maxlength="18" value="${escape(playerNames[1])}" autocomplete="off" aria-label="Player 2 name"></label></div>` : '<p class="mode-note">One player. One shifty little opponent.</p>'}
        <button class="primary start-button" data-action="start">${mode === 'solo' ? 'Let’s race' : 'Start a friendly grudge'}${icon('arrow')}</button>
        <span class="entry-footnote">${mode === 'solo' ? 'SOLO' : '2 PLAYERS · ONE DEVICE'} <span>·</span> ABOUT 2 MINUTES <span>·</span> NO REFLEXES REQUIRED</span>
      </div>
    </div>`
  panel.innerHTML = `<div class="onboarding"><div><span class="step-number">01</span><h3>Pick your route.</h3><p>The rocket is quick. The conveyor cuts prank delays in half.</p></div><div><span class="step-number">02</span><h3>Make a little trouble.</h3><p>One secret card per heat. Each trick works once per derby.</p></div><div><span class="step-number">03</span><h3>Watch it get personal.</h3><p>First place gets 3 points, second gets 1. Most points takes the cup.</p></div></div>`
}

function renderPlan(): void {
  const driver = match!.drivers[picker]
  const course = HEATS[round]
  intro.innerHTML = `<div class="round-heading"><div><p class="eyebrow">HEAT ${round + 1} OF 3 · ${escape(course.name)}</p><h1 tabindex="-1" data-focus>${round === 0 ? 'A little strategy.<br>A little sabotage.' : round === 1 ? 'Still friends?<br>Give it a minute.' : 'Last heat.<br>No holding back.'}</h1></div><p class="round-note">${course.note}</p></div>`
  panel.innerHTML = `
    <div class="planning-header"><div><span class="player-pip" style="--racer:${driver.color}"></span><strong>${escape(driver.name)}’s secret plan</strong><span class="muted">${mode === 'solo' ? 'Pip has already sealed a choice.' : `Only ${escape(driver.name)} should look.`}</span></div><span class="inventory-count">${4 - driver.used.length} / 4 CARDS LEFT</span></div>
    <div class="decision-layout">
      <fieldset class="route-field"><legend><span>01</span> Pick a route</legend><div class="route-options">
        ${(['rocket', 'covered'] as const).map(route => `<button class="route-card ${draft.route === route ? 'selected' : ''}" data-route="${route}" aria-pressed="${draft.route === route}">${icon(route)}<span><strong>${route === 'rocket' ? 'Rocket shortcut' : 'Covered conveyor'}</strong><small>${route === 'rocket' ? 'Fast. Fully exposed to pranks.' : 'Slower. Half the prank delay.'}</small></span><b>${course[route].toFixed(1)}<small>SEC</small></b><span class="selection-dot"></span></button>`).join('')}
      </div><p class="field-note">Same route? Same time. Your cards make the difference.</p></fieldset>
      <fieldset class="card-field"><legend><span>02</span> Play a little dirty <small>ONE USE EACH, ALL DERBY</small></legend><div class="hand">
        ${HAND.map(card => `<button class="prank-card ${draft.card === card ? 'selected' : ''}" data-card="${card}" aria-pressed="${draft.card === card}" ${!available(driver, card) ? 'disabled' : ''}><span class="card-top"><span>${CARDS[card].label}</span><span>${available(driver, card) ? '01' : 'SPENT'}</span></span>${icon(card)}<strong>${CARDS[card].name}</strong><span class="card-effect">${CARDS[card].effect}</span><span class="card-description">${CARDS[card].description}</span><span class="card-select-label">${!available(driver, card) ? 'Used this derby' : draft.card === card ? '✓ Selected' : 'Choose card'}</span></button>`).join('')}
      </div><button class="clean-choice ${draft.card === 'clean' ? 'selected' : ''}" data-card="clean" aria-pressed="${draft.card === 'clean'}">${icon('clean')}<strong>Or play it clean.</strong><span>Save your cards. No effect this heat.</span><span class="selection-dot"></span></button></fieldset>
    </div>
    <div class="commit-bar"><div><span class="eyebrow">YOUR SECRET PLAN</span><strong>${draft.route === 'rocket' ? 'Rocket shortcut' : 'Covered conveyor'} <span>+</span> ${draft.card ? CARDS[draft.card].name : 'pick a card or play it clean'}</strong><small>${draft.card && draft.card !== 'clean' ? 'This card will be spent for the rest of the derby.' : 'Lock it in when you’re ready.'}</small></div><button class="primary" data-action="lock" ${draft.card ? '' : 'disabled'}>${icon('lock')}Lock in my plan${icon('arrow')}</button></div>`
}

function renderHandoff(): void {
  panel.innerHTML = `<div class="handoff"><span class="eyebrow">SECRET CHOICE SEALED</span><div class="envelope">${icon('lock')}</div><h1 tabindex="-1" data-focus>Pass to ${escape(names()[1])}.</h1><p>${escape(names()[0])}’s plan is safely out of sight.<br>${escape(names()[1])}, take the device. No peeking, ${escape(names()[0])}.</p><button class="primary" data-action="ready">I’m ${escape(names()[1])}. Let me plot.${icon('arrow')}</button><small>Both choices are revealed together.</small></div>`
}

function choiceTicket(racer: Racer): string {
  const choice = result!.choices[racer]
  return `<div class="choice-ticket" style="--racer:${COLORS[racer]}"><span class="ticket-name"><span class="player-pip"></span>${escape(names()[racer])}</span><div>${icon(choice.card)}<strong>${CARDS[choice.card].name}</strong></div><p>${choice.route === 'rocket' ? 'Rocket shortcut' : 'Covered conveyor'}<span>${CARDS[choice.card].effect}</span></p></div>`
}

function renderReveal(): void {
  intro.innerHTML = `<div class="compact-heading"><span class="eyebrow">HEAT ${round + 1} · THE REVEAL</span><h1 tabindex="-1" data-focus>Well, well, well.</h1><p>Cards on the table. Let the machines do the talking.</p></div>`
  panel.innerHTML = `<div class="reveal-layout">${choiceTicket(0)}<span class="versus">vs.</span>${choiceTicket(1)}<button class="primary" data-action="race">Release the racers${icon('flag')}</button></div>`
  announce(`${names()[0]} chose ${result!.choices[0].route} and ${CARDS[result!.choices[0].card].name}. ${names()[1]} chose ${result!.choices[1].route} and ${CARDS[result!.choices[1].card].name}.`)
}

function renderRace(): void {
  intro.innerHTML = `<div class="race-heading"><div><p class="eyebrow">${replay ? 'THE INSTANT REPLAY' : `HEAT ${round + 1} OF 3 · ${HEATS[round].name.toUpperCase()}`}</p><h1 tabindex="-1" data-focus>${replay ? 'You did this.' : 'Off to no good.'}</h1></div><div class="race-tools"><span id="race-time">0.00<span>s</span></span><button class="secondary" data-action="pause" aria-label="Pause race">Ⅱ Pause</button></div></div>`
  panel.innerHTML = `<div class="live-lanes">${([0, 1] as const).map(i => `<div class="live-lane" style="--racer:${COLORS[i]}"><div><span class="player-pip"></span><strong>${escape(names()[i])}</strong><span>${CARDS[result!.choices[i].card].name}</span><b id="finish-${i}">READY</b></div><div class="progress-track"><span id="progress-${i}"></span></div><p id="event-${i}">The ${result!.choices[i].route === 'rocket' ? 'rocket' : 'covered'} route. A plan. A dream.</p></div>`).join('')}</div><p class="race-hint">The choices are made. Enjoy the consequences.<span>SPACE TO PAUSE · M FOR SOUND</span></p>`
}

function resultRows(): string {
  return ([0, 1] as Racer[]).sort((a, b) => result!.outcomes[a].time - result!.outcomes[b].time).map(i => {
    const outcome = result!.outcomes[i]
    return `<div class="result-row" style="--racer:${COLORS[i]}"><span class="result-place">${result!.winner === null ? '=' : result!.winner === i ? '01' : '02'}</span><span class="player-pip"></span><div class="result-driver"><strong>${escape(names()[i])}</strong><span>${outcome.choice.route === 'rocket' ? 'Rocket shortcut' : 'Covered conveyor'} · ${CARDS[outcome.choice.card].name}</span></div><div class="time-math"><span>${outcome.base.toFixed(1)}s route${outcome.penalty ? ` + ${outcome.penalty.toFixed(1)}s prank` : ''}${outcome.boost ? ' − 1.2s boost' : ''}</span><b>${outcome.time.toFixed(2)}<small>s</small></b></div><strong class="earned">+${result!.points[i]}<small>PTS</small></strong></div>`
  }).join('')
}

function renderResult(): void {
  stage.state.photo = true
  const winner = result!.winner
  const margin = Math.abs(result!.outcomes[0].time - result!.outcomes[1].time)
  intro.innerHTML = `<div class="result-heading"><div><p class="eyebrow">HEAT ${round + 1} · THE FINISH PHOTO</p><h1 tabindex="-1" data-focus>${winner === null ? 'A dead heat.<br>How suspicious.' : `${escape(names()[winner])} takes it.`}</h1><p>${winner === null ? 'Different schemes can land on the same time. Two points apiece.' : `By ${margin.toFixed(2)} seconds. ${result!.outcomes[1 - winner].penalty ? 'Somebody knows what they did.' : 'A beautifully small victory.'}`}</p></div><div class="result-stamp">${icon('flag')}<span>OFFICIAL<br>ISH.</span></div></div>`
  panel.innerHTML = `<div class="results-table">${resultRows()}</div><div class="blame-notes">${([0, 1] as const).map(i => `<p>${icon(result!.outcomes[i].blocked ? 'shield' : result!.outcomes[i].incoming ?? result!.choices[i].card)}${escape(consequence(result!, i, names()))}</p>`).join('')}</div><div class="result-actions"><button class="secondary" data-action="replay">${icon('replay')}You did this. Replay.</button><button class="primary" data-action="next">${round === 2 ? 'Bring out the tiny trophy' : `On to heat ${round + 2}`}${icon(round === 2 ? 'trophy' : 'arrow')}</button></div>`
  trackComment.textContent = `Both lanes, at the instant ${winner === null ? 'the racers crossed' : `${names()[winner]} crossed`}. ${winner === null ? 'Exactly tied.' : `A ${margin.toFixed(2)}s lead.`}`
  announce(`Heat ${round + 1} finished. ${winner === null ? 'A dead heat.' : `${names()[winner]} wins.`} ${names()[0]} ${result!.outcomes[0].time.toFixed(2)} seconds, ${names()[1]} ${result!.outcomes[1].time.toFixed(2)} seconds.`)
}

function renderPodium(): void {
  const winner = champion(match!)
  const points = totals(match!)
  trackPanel.hidden = true
  intro.innerHTML = `<div class="podium"><p class="eyebrow">THREE HEATS. ONE QUESTIONABLE CHAMPION.</p><div class="trophy-illustration">${icon('trophy')}<span>EST. JUST NOW</span></div><h1 tabindex="-1" data-focus>${winner === null ? 'Share the glory.<br>Split the grudge.' : `${escape(names()[winner])},<br>you little menace.`}</h1><p>${winner === null ? 'Equal points. Equal time. A very rare shared trophy.' : `${points[winner]} points. One tiny trophy. Absolutely no moral high ground.`}</p><div class="podium-score"><span style="--racer:${COLORS[0]}"><i></i>${escape(names()[0])} <b>${points[0]}</b></span><em>—</em><span style="--racer:${COLORS[1]}"><i></i>${escape(names()[1])} <b>${points[1]}</b></span></div></div>`
  panel.innerHTML = `<div class="derby-receipt"><div class="receipt-heading"><strong>THE OFFICIAL GRUDGE RECORD</strong><span>KEEP THIS FOR THE ARGUMENT</span></div>${match!.results.map(heat => `<div class="receipt-row"><span>0${heat.heat + 1} <b>${HEATS[heat.heat].name}</b></span><span>${heat.winner === null ? 'Dead heat' : `${escape(names()[heat.winner])} +3`}</span><span>${heat.outcomes[0].time.toFixed(2)}s / ${heat.outcomes[1].time.toFixed(2)}s</span></div>`).join('')}<p>3 points for first, 1 for second, 2 each for a tie. Equal points? Lowest total race time wins.</p></div><div class="result-actions podium-actions"><button class="secondary" data-action="receipt">${icon('flag')}Save the grudge</button><button class="primary" data-action="rematch">Demand a rematch${icon('arrow')}</button><button class="text-button" data-action="lobby">Back to the clubhouse</button></div><p class="download-status" id="download-status" role="status"></p>`
  sounds.play('win')
  announce(winner === null ? 'The derby is a tie. A shared trophy.' : `${names()[winner]} wins the derby with ${points[winner]} points.`)
}

function beginHeat(): void {
  phase = 'plan'
  picker = 0
  draft = { route: 'rocket', card: null }
  sealed = [null, mode === 'solo' ? houseChoice(match!) : null]
  result = null
  stage.setRace(resolveHeat(round, [{ route: 'rocket', card: 'clean' }, { route: 'covered', card: 'clean' }]), names())
  render()
  focusHeading()
  window.scrollTo({ top: 0, behavior: 'instant' })
}

function start(): void {
  match = newMatch(mode, crypto.randomUUID(), mode === 'solo' ? ['Dot', 'Pip'] : playerNames)
  round = 0
  beginHeat()
}

function lock(): void {
  if (phase !== 'plan' || !draft.card) return
  sealed[picker] = { route: draft.route, card: draft.card }
  sounds.play('lock')
  if (mode === 'local' && picker === 0) {
    phase = 'handoff'
    draft = { route: 'rocket', card: null }
    stage.state.demo = false
    stage.state.time = -1
    render()
  } else {
    result = commitHeat(match!, sealed as [Choice, Choice])
    stage.setRace(result, names())
    phase = 'reveal'
    render()
  }
  focusHeading()
  window.scrollTo({ top: 0, behavior: 'instant' })
}

function race(isReplay: boolean): void {
  replay = isReplay
  paused = false
  phase = 'race'
  stage.state.time = -2.4
  stage.state.photo = false
  stage.state.demo = false
  stage.state.playing = true
  fired.clear()
  lastBeat = ''
  lastFrame = performance.now()
  render()
  focusHeading()
  window.scrollTo({ top: 0, behavior: 'instant' })
}

function setPaused(value: boolean): void {
  if (phase !== 'race') return
  paused = value
  stage.state.playing = !value
  lastFrame = performance.now()
  const button = document.querySelector<HTMLButtonElement>('[data-action="pause"]')
  if (button) { button.textContent = value ? '▶ Resume' : 'Ⅱ Pause'; button.setAttribute('aria-label', value ? 'Resume race' : 'Pause race') }
  if (value) { countdown.hidden = false; countdown.textContent = 'Paused'; countdown.classList.add('is-paused') }
  else { countdown.classList.remove('is-paused'); countdown.hidden = true }
  announce(value ? 'Race paused.' : 'Race resumed.')
}

function tick(): void {
  if (phase !== 'race' || paused) return
  const now = performance.now()
  stage.state.time += Math.min((now - lastFrame) / 1000, 0.15)
  lastFrame = now
  const time = stage.state.time
  const beat = time < 0 ? String(Math.ceil(-time / 0.8)) : time < 0.6 ? 'Go.' : ''
  countdown.hidden = !beat
  countdown.textContent = beat
  if (beat !== lastBeat) {
    lastBeat = beat
    if (beat) sounds.play(beat === 'Go.' ? 'go' : 'count')
    if (beat === 'Go.') announce('Go. The race is on.')
  }
  document.querySelector('#race-time')!.innerHTML = `${Math.max(0, Math.min(time, stage.state.show.duration)).toFixed(2)}<span>s</span>`
  for (const i of [0, 1] as const) {
    const runner = stage.state.show.runners[i]
    const outcome = result!.outcomes[i]
    const position = stage.state.show.position(i, time).point
    document.querySelector<HTMLElement>(`#progress-${i}`)!.style.width = `${Math.max(0, Math.min(100, position.x / 11.8 * 100))}%`
    document.querySelector(`#finish-${i}`)!.textContent = time >= runner.finish ? `${runner.finish.toFixed(2)}s` : time < 0 ? 'READY' : 'RACING'
    if (time >= runner.junction && !fired.has(`prank:${i}`)) {
      fired.add(`prank:${i}`)
      const message = consequence(result!, i, names())
      document.querySelector(`#event-${i}`)!.textContent = message
      if (outcome.incoming) { sounds.play(outcome.blocked ? 'lock' : 'prank'); trackComment.textContent = message; announce(message) }
    }
    if (time >= runner.home && outcome.boost && !fired.has(`boost:${i}`)) {
      fired.add(`boost:${i}`)
      document.querySelector(`#event-${i}`)!.textContent = `${names()[i]} hits the hot wheels. A little extra getaway.`
      sounds.play('go')
    }
    if (time >= runner.finish && !fired.has(`finish:${i}`)) {
      fired.add(`finish:${i}`)
      sounds.play('finish')
      announce(`${names()[i]} finishes in ${runner.finish.toFixed(2)} seconds.`)
    }
  }
  if (time > stage.state.show.duration + 1.0) {
    stage.state.time = stage.state.show.duration
    stage.state.playing = false
    phase = 'result'
    render()
    focusHeading()
  }
}

function openDialog(kind: 'rules' | 'restart'): void {
  if (!dialog.open) {
    resumeAfterDialog = phase === 'race' && !paused
    if (resumeAfterDialog) setPaused(true)
  }
  dialog.innerHTML = kind === 'rules' ? `<button class="dialog-close" data-action="close-dialog" aria-label="Close instructions">×</button><p class="eyebrow">THE VERY SHORT RULEBOOK</p><h2 id="dialog-title">Be quick.<br>Be a little awful.</h2><ol class="rules-list"><li><strong>Pick your route.</strong> The rocket is faster. The covered conveyor halves any prank delay.</li><li><strong>Choose one secret card.</strong> Snail mail adds 2.6s to your rival. Dunk tank adds 1.8s. A shield blocks either. Hot wheels saves you 1.2s.</li><li><strong>Watch the race.</strong> No steering or timing needed. Your choices decide the race before the gate opens.</li></ol><div class="rules-callout">Each card works <strong>once per three-heat derby.</strong> Play it clean any time to save a card. Your prank always targets the other racer.</div><p>First place: <strong>3 points.</strong> Second: <strong>1.</strong> Dead heat: <strong>2 each.</strong> Most points takes the trophy; equal points are settled by total race time. Equal time means a shared trophy.</p><p class="muted">Pass & play: choose in private, then hand over the device. In solo, the house commits before you choose.</p><button class="primary" data-action="close-dialog">Sounds suitably unfair.${icon('arrow')}</button>` : `<button class="dialog-close" data-action="close-dialog" aria-label="Keep racing">×</button><p class="eyebrow">BACK TO THE CLUBHOUSE</p><h2 id="dialog-title">Call it a truce?</h2><p>This will end the current derby and reset both players’ cards.</p><div class="dialog-actions"><button class="secondary" data-action="close-dialog">Keep racing</button><button class="primary" data-action="abandon">New derby${icon('arrow')}</button></div>`
  if (kind === 'rules' && phase !== 'lobby') dialog.insertAdjacentHTML('beforeend', '<button class="text-button dialog-restart" data-action="restart">Start a new derby</button>')
  if (!dialog.open) dialog.showModal()
}

function lobby(): void {
  phase = 'lobby'
  match = null
  result = null
  paused = false
  stage.setRace(demo, ['Dot', 'Pip'])
  stage.setDemo()
  render()
  window.scrollTo({ top: 0, behavior: 'instant' })
}

function saveReceipt(): void {
  if (!match) return
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 900
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#f5f3eb'
  ctx.fillRect(0, 0, 1200, 900)
  ctx.fillStyle = '#282c27'
  ctx.font = 'bold 22px Arial'
  ctx.fillText('CONTRAPTIONS / THE OFFICIAL GRUDGE RECORD', 75, 75)
  ctx.font = 'bold 86px Arial'
  ctx.fillText('Dirty little Derby.', 70, 190)
  const winner = champion(match)
  ctx.font = '30px Arial'
  ctx.fillText(winner === null ? 'A shared trophy. An unresolved grudge.' : `${names()[winner]} takes the tiny trophy.`, 75, 260)
  const points = totals(match)
  names().forEach((name, i) => {
    ctx.fillStyle = COLORS[i]
    ctx.beginPath()
    ctx.arc(100 + i * 565, 355, 23, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#282c27'
    ctx.font = 'bold 30px Arial'
    ctx.fillText(`${name} · ${points[i]} points`, 145 + i * 565, 366, 420)
  })
  match.results.forEach((heat, i) => {
    const y = 455 + i * 95
    ctx.strokeStyle = '#c7c9be'
    ctx.beginPath(); ctx.moveTo(75, y - 35); ctx.lineTo(1125, y - 35); ctx.stroke()
    ctx.fillStyle = '#282c27'
    ctx.font = 'bold 24px Arial'
    ctx.fillText(`0${i + 1}  ${HEATS[i].name}`, 75, y)
    ctx.font = '22px Arial'
    ctx.fillText(`${heat.outcomes[0].time.toFixed(2)}s / ${heat.outcomes[1].time.toFixed(2)}s`, 850, y)
    ctx.font = '18px Arial'
    ctx.fillStyle = '#62695c'
    ctx.fillText(`${CARDS[heat.choices[0].card].name}  vs.  ${CARDS[heat.choices[1].card].name}`, 75, y + 29)
  })
  ctx.font = 'bold 18px Arial'
  ctx.fillText('SMALL BALLS. LOW BLOWS.  /  games/dirty-little-derby/', 75, 817)
  canvas.toBlob(blob => {
    const status = document.querySelector('#download-status')
    if (!blob) { if (status) status.textContent = 'The receipt could not be saved. Try again.'; return }
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = 'dirty-little-derby-grudge.png'; link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 10000)
    if (status) status.textContent = 'Grudge saved. Keep the receipt.'
  }, 'image/png')
}

app.addEventListener('input', event => {
  const target = event.target as HTMLInputElement
  if (target.id === 'name-0') playerNames[0] = target.value
  if (target.id === 'name-1') playerNames[1] = target.value
})

app.addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button')
  if (!button || button.disabled) return
  if (button.id === 'sound') { void toggleSound(); return }
  if (button.id === 'rules') { openDialog('rules'); return }
  if (button.id === 'new-game') { openDialog('restart'); return }
  if (button.dataset.mode) { mode = button.dataset.mode as Mode; sounds.play('click'); renderLobby(); return }
  if (button.dataset.route && phase === 'plan') { draft.route = button.dataset.route as Route; sounds.play('click'); renderPlan(); document.querySelector<HTMLButtonElement>(`[data-route="${draft.route}"]`)?.focus({ preventScroll: true }); return }
  if (button.dataset.card && phase === 'plan') { draft.card = button.dataset.card as Card; sounds.play('click'); renderPlan(); document.querySelector<HTMLButtonElement>(`[data-card="${draft.card}"]`)?.focus({ preventScroll: true }); return }
  const action = button.dataset.action
  if (action === 'start' || action === 'rematch') start()
  if (action === 'lock') lock()
  if (action === 'ready') { picker = 1; phase = 'plan'; draft = { route: 'rocket', card: null }; render(); focusHeading() }
  if (action === 'race') race(false)
  if (action === 'replay') race(true)
  if (action === 'pause') setPaused(!paused)
  if (action === 'next') {
    if (round === 2) { phase = 'podium'; render(); focusHeading(); window.scrollTo({ top: 0, behavior: 'instant' }) }
    else { round++; beginHeat() }
  }
  if (action === 'lobby') lobby()
  if (action === 'receipt') saveReceipt()
  if (action === 'restart') openDialog('restart')
  if (action === 'course') {
    const expanded = trackPanel.classList.toggle('expanded')
    button.setAttribute('aria-expanded', String(expanded))
    button.textContent = expanded ? 'Close course −' : 'Scout course +'
  }
  if (action === 'close-dialog') dialog.close()
  if (action === 'abandon') { resumeAfterDialog = false; dialog.close(); lobby() }
})

async function toggleSound(): Promise<void> {
  await sounds.setEnabled(!sounds.enabled)
  const button = document.querySelector<HTMLButtonElement>('#sound')!
  button.setAttribute('aria-pressed', String(sounds.enabled))
  button.setAttribute('aria-label', sounds.enabled ? 'Turn sound off' : 'Turn sound on')
  button.innerHTML = `${icon(sounds.enabled ? 'sound' : 'mute')}<span>Sound ${sounds.enabled ? 'on' : 'off'}</span>`
}

dialog.addEventListener('close', () => { if (resumeAfterDialog) setPaused(false); resumeAfterDialog = false })
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close() } })
document.addEventListener('keydown', event => {
  if ((event.target as HTMLElement).closest('input, textarea, select') || dialog.open || event.repeat) return
  if (event.code === 'Space' && phase === 'race' && !(event.target as HTMLElement).closest('button, a')) { event.preventDefault(); setPaused(!paused) }
  if (event.key.toLowerCase() === 'm' && !event.metaKey && !event.ctrlKey && !event.altKey) void toggleSound()
})
document.addEventListener('visibilitychange', () => { if (document.hidden && phase === 'race') setPaused(true) })
window.addEventListener('pagehide', event => { if (!event.persisted) stage.destroy() })
render()
