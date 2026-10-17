import './style.css'
import { icon } from './art'
import { GiftAudio } from './audio'
import { GiftPerformance } from './performance'
import { decodeRecipe, FINALS, giftUrl, MAX_MESSAGE, MAX_NAME, newRecipe, OPTIONS, recipient, replyRecipe, sender, type Opening, type Recipe } from './recipe'
import { GiftStage } from './stage'
import { saveSouvenir } from './souvenir'

const app = document.querySelector<HTMLDivElement>('#app')!
const audio = new GiftAudio()
const esc = (text: string): string => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const hashRecipe = (): string | null => new URLSearchParams(location.hash.slice(1)).get('gift')
const initialLink = hashRecipe()
let recipe = (initialLink && decodeRecipe(initialLink)) || newRecipe()
let received = !!initialLink && !!decodeRecipe(initialLink)
let invalid = !!initialLink && !received
let mode: 'compose' | 'received' | 'playing' | 'result' | 'shared' = received ? 'received' : 'compose'
let opening: Opening = 'deluxe'
let stage: GiftStage | null = null
let replyingTo: Recipe | null = null
let preview = false
let statusTimer = 0
let lastCaption = ''
let hasPreviewed = false
const motion = matchMedia('(prefers-reduced-motion: reduce)')
try { audio.setMuted(localStorage.getItem('normal-gifts-muted') === 'yes') } catch { /* Storage is optional. */ }

app.innerHTML = '<main class="loading"><p class="eyebrow">CONTRAPTIONS / GIFT DEPARTMENT</p><h1>Preparing an unnecessary machine…</h1></main>'

// This staged piece is fetched only by the gift game. The existing cold-load boundary stays intact.
const { snowblower } = await import('../../playground/pieces/alpine/snowblower')

function performance(): GiftPerformance { return new GiftPerformance(recipe, opening, snowblower) }

function header(): string {
  return `<header class="site-header"><a class="brand" href="/machine/">${icon('seesaw')}<span>contraptions<span class="brand-slash"> / </span><span class="brand-section">gift department</span></span></a><div class="header-actions"><button class="quiet" data-action="help">How it works</button><button class="sound-button" data-action="sound" aria-label="${audio.muted ? 'Turn sound on' : 'Mute sound'}" aria-pressed="${!audio.muted}">${icon(audio.muted ? 'muted' : 'sound')}</button></div></header>`
}

function hero(): string {
  if (mode === 'received' || (mode === 'playing' && !preview)) return `<section class="hero recipient-hero"><div><p class="eyebrow">SPECIAL DELIVERY / ${recipe.hop ? `ROUND ${recipe.hop + 1} OF THIS RUNNING JOKE` : 'NO OCCASION REQUIRED'}</p><h1>An extremely<br>normal gift<span class="accent">.</span></h1></div><div class="hero-note"><span class="mini-line"></span><p>For <strong>${esc(recipient(recipe))}</strong>,<br>from ${esc(sender(recipe))}.</p><span class="small">Someone went to unnecessary lengths.</span></div></section>`
  return `<section class="hero"><div><p class="eyebrow">THE DEPARTMENT OF UNNECESSARY EFFORT</p><h1>Extremely<br>normal gifts<span class="accent">.</span></h1></div><div class="hero-note"><span class="mini-line"></span><p>One tiny compliment.<br>An <em>entire</em> production.</p><span class="small">Make a machine. Make someone’s day.</span></div><div class="normal-seal" aria-hidden="true"><span>100%</span><strong>NORMAL</strong><span>DEFINITELY</span></div></section>`
}

function noteForm(): string {
  return `<div class="form-heading"><span class="step-number">01</span><h2>The nice part</h2><span class="small">keep it small.</span></div>
  <div class="names"><label>To<input id="recipient" name="recipient" maxlength="${MAX_NAME}" placeholder="A very good human" value="${esc(recipe.to)}" autocomplete="off"></label><label>From <span class="optional">(optional)</span><input id="sender" name="sender" maxlength="${MAX_NAME}" placeholder="Your name" value="${esc(recipe.from)}" autocomplete="off"></label></div>
  <label class="message-label" for="message">Your tiny compliment <span id="count">${recipe.message.length}/${MAX_MESSAGE}</span></label>
  <textarea id="message" name="message" maxlength="${MAX_MESSAGE}" rows="2" ${replyingTo ? 'readonly' : ''}>${esc(recipe.message)}</textarea>
  ${replyingTo ? '<p class="small reply-note">Keep the original joke. Swap one mechanism to send it back.</p>' : '<div class="suggestions"><button data-message="nice socks.">nice socks.</button><button data-message="proud of you.">proud of you.</button><button data-message="you make ordinary days better.">ordinary days ↗</button></div>'}`
}

function optionsForm(): string {
  return `<div class="form-heading mechanics-heading"><span class="step-number">02</span><h2>The unnecessary part</h2></div>${OPTIONS.map((options, i) => `<fieldset class="department"><legend><span>0${i + 1}</span> ${['Make an entrance', 'Add a complication', 'Make it official'][i]}</legend><div class="choices">${options.map((option, j) => `<button class="choice ${j === recipe.picks[i] ? 'selected' : ''}" data-slot="${i}" data-pick="${j}" aria-pressed="${j === recipe.picks[i]}" title="${option.line}">${icon(option.icon)}<span>${option.name}</span></button>`).join('')}</div><p class="choice-note" id="choice-note-${i}">${options[recipe.picks[i]].line}</p></fieldset>`).join('')}`
}

function dispatchSlip(): string {
  return `<div class="dispatch-slip"><div class="slip-left"><span class="eyebrow">CONTENTS / 1 COMPLIMENT</span><p id="slip-message">“${esc(recipe.message)}”</p><span class="small">For <span id="slip-to">${esc(recipient(recipe))}</span></span></div><div class="slip-stamp">HANDLE WITH<br><strong>EXCESSIVE</strong><br>CARE</div></div>`
}

function studio(): string {
  const playing = mode === 'playing'
  const sealed = mode === 'received'
  return `<section class="machine-panel" aria-label="Gift delivery machine"><div class="machine-heading"><span class="eyebrow">${sealed ? 'UNOPENED / CONTENTS MOSTLY NICE' : playing ? preview ? 'TEST DELIVERY / PREVIEW' : 'DELIVERY IN PROGRESS' : 'YOUR MACHINE / ASSEMBLED TO ORDER'}</span><span class="serial">ENG—${String(recipe.hop + 1).padStart(3, '0')}</span></div>
  <div id="gift-stage" role="img" aria-label="${sealed ? 'A yellow parcel, tied with a ribbon, waiting to be opened' : 'Three mechanical departments connected by portals'}"></div>
  <div class="stage-caption"><span id="caption" ${playing ? 'role="status" aria-live="polite"' : ''}>${sealed ? 'A small thing. In a suspiciously large production.' : playing ? 'Your compliment is entering the system.' : 'Three departments. Absolutely no shortcuts.'}</span>${playing ? '<span id="elapsed" class="mono">00:00</span>' : '<span class="direction" aria-hidden="true">→</span>'}</div>
  <div class="journey ${playing ? 'active-journey' : ''}">${['Dispatch', 'Complicate', 'Certify', 'Deliver'].map((title, i) => `<div class="journey-step" data-step="${i}"><span>0${i + 1}</span>${title}</div>`).join('')}</div>
  ${playing ? '<div class="progress-track"><div id="progress"></div></div><div class="transport"><button class="secondary" data-action="pause">'+icon('pause')+'Pause</button><button class="quiet" data-action="reveal">Skip to the nice part →</button></div>' : sealed ? '' : dispatchSlip() + '<div class="machine-actions"><span class="small">About 11 seconds.<br>Several questionable decisions.</span><button class="primary" data-action="preview">'+icon('play')+'Test the delivery</button></div>'}
  </section>`
}

function receivedPanel(): string {
  return `<aside class="opening-panel"><p class="eyebrow">A NOTE FROM DISPATCH</p><h2>We’ve been<br>expecting you.</h2><p>Your gift is sealed inside this machine. Choose how much fuss we should make.</p><fieldset class="opening-choices"><legend>How would you like to open it?</legend><label class="opening-choice ${opening === 'gentle' ? 'selected' : ''}"><input type="radio" name="opening" value="gentle" ${opening === 'gentle' ? 'checked' : ''}><span><strong>Gently, please.</strong><small>A little ceremony. About 11 seconds.</small></span>${icon('gift')}</label><label class="opening-choice ${opening === 'deluxe' ? 'selected' : ''}"><input type="radio" name="opening" value="deluxe" ${opening === 'deluxe' ? 'checked' : ''}><span><strong>The deluxe treatment.</strong><small>Extra paperwork. Entirely worth it.</small></span>${icon('stamp')}</label></fieldset><button class="primary wide" data-action="open">Open my gift ${icon('arrow')}</button><p class="small center">${motion.matches ? 'Reduced motion is on. We’ll go straight to your note.' : 'A tiny bit of sound. A very large amount of care.'}</p></aside>`
}

function keepsake(): string {
  return `<article class="keepsake" aria-label="Your personalized gift"><div class="keepsake-top"><span class="eyebrow">DELIVERY COMPLETE</span><span class="mono">NO. ${String(recipe.hop + 1).padStart(3, '0')}</span></div><p class="eyebrow to-line">FOR ${esc(recipient(recipe))}</p><h2 class="gift-message">${esc(recipe.message)}</h2><div class="portraits" aria-label="Before, during, and after portraits of your gift">${['BEFORE', 'DURING', 'STILL YOU'].map((label, i) => `<div class="portrait"><span class="portrait-ball portrait-${i}" style="--ball:${i === 0 ? '#c95336' : recipe.picks[1] === 0 ? '#fff' : recipe.picks[1] === 1 ? '#41776b' : '#e9b64f'}"></span><span>${label}</span></div>`).join('')}</div><p class="signature">with unnecessary effort,<br><strong>${esc(sender(recipe))}</strong></p><div class="keepsake-route">${recipe.picks.map((pick, i) => OPTIONS[i][pick].name).join('<span>→</span>')}</div><div class="keepsake-bottom">${recipe.hop ? `REGIFTED ${recipe.hop} ${recipe.hop === 1 ? 'TIME' : 'TIMES'}. THE JOKE CONTINUES.` : 'A SMALL COMPLIMENT, PROPERLY OVERDELIVERED.'}</div></article>`
}

function result(): string {
  return `<div class="result-grid">${keepsake()}<aside class="result-aside"><span class="large-line-icon">${icon('check')}</span><p class="eyebrow">${preview ? 'TEST DELIVERY / SUCCESS' : 'ALL THAT, JUST FOR YOU'}</p><h2>${preview ? 'Nicely<br>overdone.' : 'You were worth<br>the paperwork.'}</h2><p>${preview ? 'Your machine works beautifully. Now choose a secret ending and send this entirely normal gift on its way.' : 'Keep the compliment. Or keep the joke going: swap one mechanism and send it back with a little more fuss.'}</p>${preview ? '<button class="primary wide" data-action="seal">Seal & get gift link '+icon('arrow')+'</button><button class="secondary wide" data-action="edit">Back to the workbench</button>' : '<button class="primary wide" data-action="reply">Send one back '+icon('arrow')+'</button><button class="secondary wide" data-action="save">Save keepsake as PNG</button>'}<button class="quiet replay" data-action="replay">↻ Watch the delivery again</button>${!preview ? '<button class="quiet" data-action="new">Make a new gift</button>' : ''}</aside></div>`
}

function shared(): string {
  return `<div class="share-layout"><div class="share-illustration">${icon('gift')}<span class="eyebrow">SEALED WITH UNNECESSARY CARE</span><h2>For ${esc(recipient(recipe))}<span class="accent">.</span></h2><p>One tiny compliment. Three mechanisms.<br>One ending they haven’t seen.</p><div class="sealed-mark">READY FOR DISPATCH</div></div><aside class="share-panel"><p class="eyebrow">YOUR GIFT IS READY</p><h2>Pass it on.</h2><p>Copy this link into a message to your person. They’ll choose how to open it.</p><label for="gift-link">Your gift link</label><div class="link-field"><input id="gift-link" readonly value="${esc(giftUrl(recipe))}" spellcheck="false"><button class="primary" data-action="copy">Copy link</button></div><p class="small">No account. No address. Anyone with this link can open it.</p><div id="copy-status" role="status"></div><button class="secondary wide" data-action="recipient-view">Try the recipient’s view ${icon('arrow')}</button><button class="quiet" data-action="edit">Back to the workbench</button></aside></div>`
}

function dialogs(): string {
  return `<dialog id="finale-dialog" aria-labelledby="finale-title"><div class="dialog-head"><span class="eyebrow">03 / THE SECRET ENDING</span><button class="close-button" data-action="close-dialog" aria-label="Close">×</button></div><h2 id="finale-title">A final bit of fuss.</h2><p>Choose the surprise waiting at the end. Only your recipient gets the first proper opening.</p><div class="finale-options">${FINALS.map((f, i) => `<button class="finale-choice ${recipe.finale === f.id ? 'selected' : ''}" data-finale="${f.id}" aria-pressed="${recipe.finale === f.id}">${icon(['bell', 'box', 'stamp'][i])}<span><strong>${f.name}</strong><small>${f.line}</small></span><span class="selection-dot"></span></button>`).join('')}</div><button class="primary wide" data-action="finish-seal">Seal this gift ${icon('arrow')}</button><p class="small center">The message travels in the link. No gift is sent automatically.</p></dialog>
  <dialog id="help-dialog" aria-labelledby="help-title"><div class="dialog-head"><span class="eyebrow">OPERATING INSTRUCTIONS</span><button class="close-button" data-action="close-help" aria-label="Close instructions">×</button></div><h2 id="help-title">Small kindness.<br>Large apparatus.</h2><ol class="instructions"><li>Write a tiny compliment for someone.</li><li>Pick three mechanisms. Test your delivery.</li><li>Choose a secret ending and copy the gift link.</li></ol><p>They choose a gentle or deluxe opening, get your note, and can swap one mechanism to send it back. Every return adds another round to the running joke.</p><button class="primary wide" data-action="close-help">Entirely understood.</button></dialog>`
}

function render(focus = false): void {
  stage?.destroy(); stage = null; lastCaption = ''
  app.innerHTML = `${header()}<main class="page ${mode}">${hero()}${invalid ? '<div class="error-note" role="alert">This gift link is incomplete or from a newer version. You can still make a fresh gift below.<button class="quiet" data-action="dismiss">Dismiss</button></div>' : ''}${replyingTo && mode === 'compose' ? `<div class="reply-banner">${icon('gift')}<span>RETURN DELIVERY ${recipe.hop + 1} · Same tiny compliment. Change one mechanism to keep the joke going.</span></div>` : ''}${mode === 'compose' ? `<div class="workbench">${studio()}<aside class="composer" aria-label="Compose your gift">${noteForm()}${optionsForm()}</aside></div>` : mode === 'received' ? `<div class="workbench">${studio()}${receivedPanel()}</div>` : mode === 'playing' ? `<div class="theatre">${studio()}<p class="small center">${preview ? 'A test run. Your secret ending comes next.' : 'Please remain extremely normal during delivery.'}</p></div>` : mode === 'result' ? result() : shared()}<footer class="page-footer"><span>BUILT WITH CONTRAPTIONS. SENT WITH FEELING.</span><span>No occasion required. <span aria-hidden="true">↗</span></span></footer></main>${dialogs()}<div id="toast" class="toast" role="status"></div>`
  if (mode === 'compose' || mode === 'received' || mode === 'playing') {
    stage = new GiftStage(document.querySelector('#gift-stage')!, performance(), audio)
    stage.sealed = mode === 'received'
    stage.onFrame = frame => {
      const caption = document.querySelector('#caption')!
      if (frame.caption !== lastCaption) { caption.textContent = frame.caption; lastCaption = frame.caption }
      document.querySelector<HTMLElement>('#progress')!.style.width = `${frame.progress * 100}%`
      document.querySelector('#elapsed')!.textContent = `00:${String(Math.floor(frame.time)).padStart(2, '0')}`
      document.querySelectorAll<HTMLElement>('[data-step]').forEach((el, i) => el.classList.toggle('current', i === (frame.finale ? 3 : Math.min(frame.department, 2))))
    }
    stage.onDone = () => { if (preview) hasPreviewed = true; mode = 'result'; render(true) }
    if (mode === 'playing') stage.start()
  }
  if (focus) {
    const heading = document.querySelector<HTMLElement>('main h2, main h1')!
    heading.tabIndex = -1; heading.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
}

function toast(message: string): void {
  const el = document.querySelector<HTMLElement>('#toast')!
  el.textContent = message; el.classList.add('visible'); clearTimeout(statusTimer)
  statusTimer = window.setTimeout(() => el.classList.remove('visible'), 4000)
}

function syncNote(): void {
  recipe.to = document.querySelector<HTMLInputElement>('#recipient')?.value ?? recipe.to
  recipe.from = document.querySelector<HTMLInputElement>('#sender')?.value ?? recipe.from
  recipe.message = document.querySelector<HTMLTextAreaElement>('#message')?.value ?? recipe.message
  const count = document.querySelector('#count'); if (count) count.textContent = `${recipe.message.length}/${MAX_MESSAGE}`
  const message = document.querySelector('#slip-message'); if (message) message.textContent = `“${recipe.message}”`
  const to = document.querySelector('#slip-to'); if (to) to.textContent = recipient(recipe)
  hasPreviewed = false
}

function canPreview(): boolean {
  syncNote()
  recipe.message = recipe.message.trim()
  if (!recipe.message) { toast('A tiny compliment is required. Even “nice socks.” will do.'); document.querySelector<HTMLTextAreaElement>('#message')?.focus(); return false }
  if (replyingTo && recipe.picks.every((pick, i) => pick === replyingTo!.picks[i])) { toast('Swap one mechanism before sending this one back.'); return false }
  return true
}

function play(asPreview: boolean): void {
  preview = asPreview
  if (asPreview) opening = 'gentle'
  if (motion.matches) { if (asPreview) hasPreviewed = true; mode = 'result'; audio.finish(); render(true); return }
  mode = 'playing'; render(true)
}

app.addEventListener('input', event => {
  const target = event.target as HTMLInputElement
  if (['recipient', 'sender', 'message'].includes(target.id)) syncNote()
  if (target.name === 'opening') {
    opening = target.value as Opening
    document.querySelectorAll('.opening-choice').forEach(el => el.classList.toggle('selected', !!el.querySelector('input:checked')))
  }
})

app.addEventListener('click', async event => {
  const button = (event.target as Element).closest<HTMLButtonElement>('button')
  if (!button) return
  audio.click()
  if (button.dataset.slot !== undefined) {
    const slot = Number(button.dataset.slot); const pick = Number(button.dataset.pick)
    if (replyingTo) recipe.picks = [...replyingTo.picks]
    recipe.picks[slot] = pick; hasPreviewed = false
    document.querySelectorAll<HTMLButtonElement>('[data-slot]').forEach(b => { const selected = recipe.picks[Number(b.dataset.slot)] === Number(b.dataset.pick); b.classList.toggle('selected', selected); b.setAttribute('aria-pressed', String(selected)) })
    recipe.picks.forEach((p, i) => { document.querySelector(`#choice-note-${i}`)!.textContent = OPTIONS[i][p].line })
    stage?.setPerformance(performance())
    return
  }
  if (button.dataset.message) {
    document.querySelector<HTMLTextAreaElement>('#message')!.value = button.dataset.message; syncNote(); return
  }
  if (button.dataset.finale) {
    recipe.finale = button.dataset.finale as Recipe['finale']
    document.querySelectorAll<HTMLButtonElement>('[data-finale]').forEach(b => { const selected = b.dataset.finale === recipe.finale; b.classList.toggle('selected', selected); b.setAttribute('aria-pressed', String(selected)) })
    return
  }
  switch (button.dataset.action) {
    case 'sound':
      audio.setMuted(!audio.muted)
      try { localStorage.setItem('normal-gifts-muted', audio.muted ? 'yes' : 'no') } catch { /* Optional preference. */ }
      button.innerHTML = icon(audio.muted ? 'muted' : 'sound'); button.setAttribute('aria-label', audio.muted ? 'Turn sound on' : 'Mute sound'); button.setAttribute('aria-pressed', String(!audio.muted)); break
    case 'help': document.querySelector<HTMLDialogElement>('#help-dialog')!.showModal(); break
    case 'close-help': document.querySelector<HTMLDialogElement>('#help-dialog')!.close(); break
    case 'preview': if (canPreview()) play(true); break
    case 'open': play(false); break
    case 'pause': stage?.pause(); button.innerHTML = icon(stage?.paused ? 'play' : 'pause') + (stage?.paused ? 'Resume' : 'Pause'); break
    case 'reveal': stage?.reveal(); break
    case 'replay': play(preview); break
    case 'edit': mode = 'compose'; received = false; render(true); break
    case 'seal': if (hasPreviewed) document.querySelector<HTMLDialogElement>('#finale-dialog')!.showModal(); break
    case 'close-dialog': document.querySelector<HTMLDialogElement>('#finale-dialog')!.close(); break
    case 'finish-seal': mode = 'shared'; render(true); break
    case 'copy': {
      const field = document.querySelector<HTMLInputElement>('#gift-link')!
      try { await navigator.clipboard.writeText(giftUrl(recipe)); button.textContent = 'Copied ✓'; document.querySelector('#copy-status')!.textContent = 'Gift link copied. Send it to your person.' }
      catch { field.focus(); field.select(); document.querySelector('#copy-status')!.textContent = 'Select and copy the link above to send your gift.' }
      break
    }
    case 'recipient-view': history.pushState(null, '', `#gift=${giftUrl(recipe).split('#gift=')[1]}`); received = true; mode = 'received'; opening = 'deluxe'; render(true); break
    case 'reply': replyingTo = structuredClone(recipe); recipe = replyRecipe(recipe); received = false; preview = false; hasPreviewed = false; opening = 'gentle'; mode = 'compose'; history.pushState(null, '', location.pathname); render(true); break
    case 'save':
      button.disabled = true
      try { await saveSouvenir(recipe); toast('Your keepsake is ready to keep.') } catch { toast('The keepsake could not be saved. Please try again.') }
      button.disabled = false; break
    case 'new': recipe = newRecipe(); replyingTo = null; received = false; hasPreviewed = false; mode = 'compose'; history.pushState(null, '', location.pathname); render(true); break
    case 'dismiss': invalid = false; history.replaceState(null, '', location.pathname); render(); break
  }
})

function readLocation(): void {
  const encoded = hashRecipe()
  const linked = encoded ? decodeRecipe(encoded) : null
  invalid = !!encoded && !linked; received = !!linked; recipe = linked ?? newRecipe(); replyingTo = null; hasPreviewed = false; mode = received ? 'received' : 'compose'; render(true)
}
window.addEventListener('popstate', readLocation)
window.addEventListener('hashchange', readLocation)
document.addEventListener('visibilitychange', () => {
  if (document.hidden && stage?.running && !stage.paused) {
    stage.pause()
    const button = document.querySelector('[data-action="pause"]'); if (button) button.innerHTML = icon('play') + 'Resume'
  }
})
window.addEventListener('pagehide', () => { stage?.stop() })
render()
