import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

// Like show-cards.mjs, use an installed Playwright without adding a production
// dependency. Run the dev server (or pass PO_BASE for a production preview).
const require = createRequire(import.meta.url)
function playwright() {
  const installed = []
  try { installed.push(require('playwright')) } catch { /* Also look in npx's cache. */ }
  const cache = join(homedir(), '.npm', '_npx')
  if (existsSync(cache)) for (const dir of readdirSync(cache)) {
    const path = join(cache, dir, 'node_modules/playwright')
    if (existsSync(join(path, 'package.json'))) installed.push(require(path))
  }
  const ready = installed.find(p => existsSync(p.chromium.executablePath()))
  if (ready) return ready
  throw new Error('Install Playwright and its Chromium browser to run this optional browser check.')
}
const base = process.env.PO_BASE || 'http://127.0.0.1:8791'
const shots = process.env.PO_SHOTS || '/tmp/po2-shots'
const pass = process.env.PO_PASS || 'pass1'
mkdirSync(shots, { recursive: true })
const browser = await playwright().chromium.launch({ headless: true })
const errors = []
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] })
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => {
    window.pocketStrikes = []
    const start = AudioBufferSourceNode.prototype.start
    AudioBufferSourceNode.prototype.start = function (when, ...args) {
      window.pocketStrikes.push({ when, now: this.context.currentTime })
      return start.call(this, when, ...args)
    }
  })
  await page.goto(`${base}/games/pocket-orchestra`)
  await page.waitForSelector('#machine'); await page.evaluate(() => document.fonts.ready)
  assert.ok(page.url().endsWith('/games/pocket-orchestra/'))
  const click = selector => page.locator(selector).click()
  const edit = async (selector, value) => {
    await page.locator(selector).evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })) }, String(value))
  }
  const take = () => page.evaluate(() => JSON.parse(localStorage.getItem('contraptions:pocket:v2')).current)
  await page.screenshot({ path: join(shots, `${pass}-desktop.png`), fullPage: true })
  await click('#play'); await page.waitForTimeout(1500)
  assert.equal(await page.locator('[data-ball]').count(), 3)
  const strikes = await page.evaluate(() => window.pocketStrikes)
  assert.ok(strikes.length >= 3)
  assert.ok(strikes.slice(0, 3).every(s => s.when === strikes[0].when), 'all tracks share the clock')
  assert.equal(strikes.filter(s => s.when < s.now - .002).length, 0)
  await page.screenshot({ path: join(shots, `${pass}-playing.png`), fullPage: true })
  await click('#play')
  await edit('#position', 1 / 12 * 1000)
  const distance = await page.evaluate(() => {
    const ball = document.querySelector('[data-ball="t0"]').transform.baseVal.consolidate().matrix
    const piece = document.querySelector('[data-note="n0-0"]').transform.baseVal.consolidate().matrix
    return Math.hypot(ball.e - piece.e, ball.f - piece.f)
  })
  assert.ok(distance < 2, 'scrub puts the marble exactly on the scheduled contact')
  await click('[data-note="n0-0"]'); await page.waitForSelector('#note-beat')
  const before = await page.locator('[data-note="n0-0"]').getAttribute('transform')
  await click('[data-pitch="2"]'); await click('[data-octave="-1"]'); await edit('#note-size', 1.3)
  assert.match(await page.locator('[data-note="n0-0"]').getAttribute('aria-label'), /E4/)
  const rect = await page.locator('[data-note="n0-0"] .hit-area').boundingBox()
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2); await page.mouse.down()
  await page.mouse.move(rect.x + rect.width / 2 + 65, rect.y + rect.height / 2 + 22, { steps: 12 }); await page.mouse.up()
  assert.notEqual(await page.locator('[data-note="n0-0"]').getAttribute('transform'), before)
  await click('#undo'); assert.equal(await page.locator('[data-note="n0-0"]').getAttribute('transform'), before)
  await page.locator('[data-note="n0-0"]').focus(); await page.keyboard.press('ArrowRight')
  assert.notEqual(await page.locator('[data-note="n0-0"]').getAttribute('transform'), before)
  await page.keyboard.press('Control+z'); assert.equal(await page.locator('[data-note="n0-0"]').getAttribute('transform'), before)
  await click('#duplicate'); assert.equal(await page.locator('[data-note]').count(), 13)
  await click('#remove'); assert.equal(await page.locator('[data-note]').count(), 12)
  await click('#longer'); assert.equal((await take()).length, 16)
  await click('#shorter'); assert.equal((await take()).length, 12)
  await click('#add-track'); assert.equal(await page.locator('[data-ball]').count(), 4)
  await click('[data-kind="triangle"]')
  const board = await page.locator('#machine').boundingBox()
  const vp = await page.locator('#viewport').boundingBox()
  await page.locator('#viewport').evaluate(el => el.scrollTo({ top: el.scrollHeight, behavior: 'instant' }))
  await page.mouse.click(vp.x + 240, vp.y + vp.height - 110)
  assert.equal(await page.locator('[data-note]').count(), 13)
  assert.equal((await take()).notes.at(-1).track, (await take()).tracks[3].id)
  assert.ok(board.width > 0)
  await click('#remove-track'); assert.equal(await page.locator('[data-ball]').count(), 3)
  await click('[data-mute="t1"]'); assert.equal((await take()).tracks[1].muted, true)
  await click('[data-mute="t1"]')
  await click('#save'); await page.locator('#take-title').fill('Sunday — 雨'); await click('#keep')
  await click('#share'); await page.waitForFunction(() => location.hash.startsWith('#v2.'))
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), page.url())
  const recipient = await context.newPage(); await recipient.goto(page.url()); await recipient.waitForSelector('#machine')
  assert.equal(await recipient.locator('#presets option[value=current]').textContent(), 'Sunday — 雨')
  await recipient.locator('#longer').click(); await recipient.reload(); await recipient.waitForSelector('#machine')
  assert.equal(await recipient.locator('#length').textContent(), '16 beats'); await recipient.close()
  await click('#fit'); await page.evaluate(() => scrollTo(0, 0))
  await page.screenshot({ path: join(shots, `${pass}-edited.png`), fullPage: true })
  await page.locator('#presets').selectOption('blank')
  await click('[data-kind="harp"]'); await page.locator('#viewport').focus(); await page.keyboard.press('Enter')
  assert.equal(await page.locator('[data-note]').count(), 1, 'keyboard placement on an empty machine')
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Space'); await page.waitForTimeout(300); await page.keyboard.press('Space')
  await click('#open-shelf'); await click('[data-load="0"]')
  console.log('Desktop: play, three simultaneous audio strikes, exact contact scrub, pitch, octave, size, drag, keyboard, undo, duplicate/delete, loop length, parallel track, mute, save, share and reload passed.')

  // Long loops, duplication, narrow fits, and keyboard selection were the last
  // pass's real failure cases. Keep them reproducible beside the touch checks.
  await page.locator('#presets').selectOption('0')
  await click('#duplicate-track'); assert.equal(await page.locator('[data-ball]').count(), 4)
  assert.equal(await page.locator('[data-note]').count(), 17)
  await click('#remove-track'); assert.equal(await page.locator('[data-ball]').count(), 3)
  await page.locator('[data-note="n0-0"]').focus(); await page.keyboard.press('Enter')
  assert.equal(await page.locator('#voice').inputValue(), 'musicbox')
  await page.locator('#note-track').selectOption('t1'); assert.equal((await take()).notes[0].track, 't1')
  await click('#undo')
  await page.locator('#presets').selectOption('2'); await click('#shorter')
  assert.equal((await take()).length, 8, 'a short loop still accommodates the parade')
  for (let i = 0; i < 4; i++) await click('#longer')
  assert.equal((await take()).length, 24)
  await page.setViewportSize({ width: 320, height: 844 }); await click('#fit')
  const fittedWidth = await page.locator('#machine').evaluate(el => el.clientWidth)
  await click('#zoom-out')
  assert.ok(await page.locator('#machine').evaluate(el => el.clientWidth) < fittedWidth, 'zoom out never reverses after Fit')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.locator('#presets').selectOption('0')
  await click('[data-note="n0-1"]')
  const crossing = await page.locator('[data-note="n0-1"] .hit-area').boundingBox()
  await page.mouse.move(crossing.x + crossing.width / 2, crossing.y + crossing.height / 2); await page.mouse.down()
  await page.mouse.move(crossing.x + crossing.width / 2 + 60, crossing.y + crossing.height / 2 + 155, { steps: 20 }); await page.mouse.up()
  await click('#play'); await page.waitForTimeout(2400)
  await page.screenshot({ path: join(shots, `${pass}-freeform.png`), fullPage: true })
  await click('#play'); await edit('#position', 950); await click('#play'); await page.waitForTimeout(1200); await click('#play')
  const bouncedStrikes = await page.evaluate(() => window.pocketStrikes)
  assert.equal(bouncedStrikes.filter(s => s.when < s.now - .002).length, 0)
  console.log('Long loops, four-track duplication, keyboard selection, reassignment, short-loop packing, Fit/zoom direction and a freeform crossing with live loop return passed.')

  for (const width of [768, 390, 320]) {
    const phone = await browser.newPage({ viewport: { width, height: 844 }, isMobile: width < 600, hasTouch: true, deviceScaleFactor: 1 })
    phone.on('pageerror', e => errors.push(e.message))
    await phone.goto(`${base}/games/pocket-orchestra/`); await phone.waitForSelector('#machine'); await phone.evaluate(() => document.fonts.ready)
    assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth), width, `${width}px: no page overflow`)
    await phone.locator('#play').tap()
    if (width < 600) {
      await phone.waitForFunction(() => document.querySelector('#viewport').scrollLeft > 40)
      assert.equal(await phone.locator('#follow').getAttribute('aria-pressed'), 'true')
    } else await phone.waitForTimeout(850)
    await phone.locator('#play').tap()
    await phone.locator('[data-note="n0-0"]').tap(); await phone.waitForSelector('#note-beat')
    await phone.locator('[data-pitch="3"]').tap()
    assert.match(await phone.locator('[data-note="n0-0"]').getAttribute('aria-label'), /G5/)
    await phone.evaluate(() => scrollTo(0, 0))
    await phone.screenshot({ path: join(shots, `${pass}-${width}.png`), fullPage: true })
    if (width < 600) {
      const vp = await phone.locator('#viewport').boundingBox(), cdp = await phone.context().newCDPSession(phone)
      const x = vp.x + vp.width - 30, y = vp.y + 27
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
      for (let dx = 10; dx <= 160; dx += 10) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - dx, y }] }); await phone.waitForTimeout(15) }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await phone.waitForTimeout(200)
      assert.ok(await phone.locator('#viewport').evaluate(el => el.scrollLeft) > 40, `${width}px: touch pan works`)
      assert.equal(await phone.locator('#follow').getAttribute('aria-pressed'), 'false', 'manual pan takes control from follow')
      await phone.locator('#fit').tap()
      await phone.screenshot({ path: join(shots, `${pass}-${width}-fit.png`), fullPage: true })
      for (let i = 0; i < 3; i++) await phone.locator('#zoom-in').tap()
      await phone.locator('[data-note="n0-0"]').scrollIntoViewIfNeeded()
      const piece = await phone.locator('[data-note="n0-0"] .hit-area').boundingBox()
      const beforeDrag = await phone.locator('[data-note="n0-0"]').getAttribute('transform')
      const tx = piece.x + piece.width / 2, ty = piece.y + piece.height / 2
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tx, y: ty }] })
      for (let dx = 5; dx <= 45; dx += 5) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: tx + dx, y: ty + dx / 3 }] }); await phone.waitForTimeout(20) }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      assert.notEqual(await phone.locator('[data-note="n0-0"]').getAttribute('transform'), beforeDrag, 'a real finger drag moves the piece')
      await phone.locator('#undo').tap()
      assert.equal(await phone.locator('[data-note="n0-0"]').getAttribute('transform'), beforeDrag, 'one undo restores a complete finger drag')
    }
    await phone.close()
  }
  console.log('768/390/320px: touch playback, tuning, real touch panning, whole-machine fit and layouts passed.')
  const fallback = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  fallback.on('pageerror', e => errors.push(e.message))
  await fallback.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new DOMException('Denied', 'NotAllowedError') } } }))
  await fallback.goto(`${base}/games/pocket-orchestra/#v2.invalid`); await fallback.waitForSelector('#machine')
  assert.equal(await fallback.locator('#follow').getAttribute('aria-pressed'), 'false')
  assert.equal(await fallback.locator('#presets option[value=current]').textContent(), 'Clockwork picnic')
  await fallback.locator('#share').click(); await fallback.waitForSelector('#share-dialog[open]')
  assert.match(await fallback.locator('#share-url').inputValue(), /#v2\./)
  await fallback.locator('#copy-link').click(); assert.equal(await fallback.locator('#share-url').evaluate(el => el.selectionEnd - el.selectionStart), (await fallback.locator('#share-url').inputValue()).length)
  await fallback.close()
  console.log('Invalid links, reduced motion and denied-clipboard selectable fallback passed.')
  assert.deepEqual(errors, []); console.log(`No browser errors. Screenshots: ${shots}`)
} catch (error) {
  await browser.contexts()[0]?.pages()[0]?.screenshot({ path: join(shots, `${pass}-failure.png`), fullPage: true })
  throw error
} finally { await browser.close() }
