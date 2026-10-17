import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
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
const shots = process.env.PO_SHOTS || join(tmpdir(), 'po-shots')
mkdirSync(shots, { recursive: true })
const browser = await playwright().chromium.launch({ headless: true })
const errors = []
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, permissions: ['clipboard-read', 'clipboard-write'] })
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
  await page.waitForSelector('canvas')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(250)
  assert.ok(page.url().endsWith('/games/pocket-orchestra/'))
  await page.screenshot({ path: join(shots, 'first-phrase.png'), fullPage: true })
  const click = selector => page.locator(selector).click()
  const win = async () => {
    await click('#rewind'); await click('#play')
    await page.waitForFunction(() => !document.querySelector('#success').hidden, {}, { timeout: 15000 })
    await click('#play')
  }
  // The natural first action, including choosing the already-armed triangle.
  await click('[data-kind="triangle"]'); await click('[data-step="1"]')
  await page.keyboard.press('Space')
  await page.waitForFunction(() => !document.querySelector('#success').hidden)
  await page.keyboard.press('Space')
  await click('#next')
  await click('[data-step="1"]'); await page.keyboard.press('3')
  await click('[data-step="2"]'); await page.keyboard.press('5'); await win()
  await click('#next')
  await click('[data-kind="rest"]'); await click('[data-step="2"]')
  await click('[data-step="3"]'); await click('[data-pitch="0"]'); await win()
  await click('#next')
  await click('[data-kind="triangle"]'); await click('[data-step="4"]')
  await click('[data-kind="harp"]'); await click('[data-step="5"]'); await click('[data-pitch="2"]'); await win()
  await page.waitForTimeout(400)
  await page.screenshot({ path: join(shots, 'phrase-complete.png'), fullPage: true })
  await click('#next')
  for (const [slot, kind] of ['musicbox', 'harp', 'triangle', 'rest', 'keys', 'triangle'].entries()) {
    await click(`[data-kind="${kind}"]`); await click(`[data-step="${slot}"]`)
  }
  await win(); await click('#next')
  console.log('Five phrases completed; first phrase works with focused-step Space.')

  await click('[data-preset="0"]')
  await page.locator('#take-title').fill('A little Sunday'); await page.locator('#take-title').press('Tab')
  await click('#keep'); await click('.shelf-open')
  assert.equal(await page.locator('.shelf-take strong').textContent(), 'A little Sunday')
  await page.locator('#shelf .close-dialog').first().click()
  await click('[data-step="0"]'); await page.keyboard.press('Shift+ArrowRight')
  assert.match(await page.locator('[data-step="1"]').getAttribute('aria-label'), /Music box/)
  await page.keyboard.press('Control+z')
  assert.match(await page.locator('[data-step="0"]').getAttribute('aria-label'), /Music box/)
  await click('#share')
  await page.waitForFunction(() => location.hash.startsWith('#v1.'))
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), page.url())
  const recipient = await context.newPage()
  await recipient.goto(page.url()); await recipient.waitForSelector('canvas')
  assert.equal(await recipient.locator('#take-title').inputValue(), 'A little Sunday')
  await recipient.locator('#take-title').fill('Another afternoon'); await recipient.locator('#take-title').press('Tab')
  await recipient.reload(); await recipient.waitForSelector('canvas')
  assert.equal(await recipient.locator('#take-title').inputValue(), 'Another afternoon')
  await recipient.close(); await page.bringToFront()
  await page.locator('[data-kind="xylophone"]').scrollIntoViewIfNeeded()
  const from = await page.locator('[data-kind="xylophone"]').boundingBox()
  const to = await page.locator('[data-step="0"]').boundingBox()
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 }); await page.mouse.up()
  assert.match(await page.locator('[data-step="0"]').getAttribute('aria-label'), /Xylophone/)
  await click('#undo')
  await page.locator('#position').evaluate(el => { el.value = '210'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })) })
  await click('#play'); await page.waitForTimeout(1000)
  const strikes = await page.evaluate(() => window.pocketStrikes)
  assert.ok(strikes.length > 80)
  assert.equal(strikes.filter(s => s.when < s.now - .002).length, 0)
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(350)
  await page.screenshot({ path: join(shots, 'compose-desktop.png'), fullPage: true })
  console.log('Drag, keyboard swap/undo, scrubbing, saved takes, share/reload, audio scheduling passed.')

  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  phone.on('pageerror', e => errors.push(e.message))
  await phone.goto(`${base}/games/pocket-orchestra/`); await phone.waitForSelector('canvas')
  await phone.locator('[data-step="1"]').tap(); await phone.locator('#play').tap()
  await phone.waitForFunction(() => !document.querySelector('#success').hidden)
  await phone.locator('#next').tap()
  await phone.locator('[data-step="1"]').tap(); await phone.locator('[data-pitch="2"]').tap()
  await phone.locator('[data-step="2"]').tap(); await phone.locator('[data-pitch="4"]').tap()
  await phone.locator('[data-mode="compose"]').tap(); await phone.locator('[data-step="1"]').tap(); await phone.evaluate(() => scrollTo(0, 0))
  await phone.waitForTimeout(400)
  assert.equal(await phone.locator('#mobile-dock').isVisible(), true)
  await phone.locator('#dock-play').tap(); await phone.waitForTimeout(1400)
  await phone.screenshot({ path: join(shots, 'phone.png') })
  await phone.locator('#dock-tune').tap(); await phone.waitForTimeout(600)
  await phone.locator('#move-back').tap()
  assert.match(await phone.locator('[data-step="0"]').getAttribute('aria-label'), /Harp/)
  await phone.locator('#undo').tap()
  await phone.locator('[data-step="2"]').scrollIntoViewIfNeeded()
  const rect = await phone.locator('[data-step="2"]').boundingBox(), before = await phone.evaluate(() => scrollY)
  const cdp = await phone.context().newCDPSession(phone)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rect.x + 50, y: rect.y + 110 }] })
  for (let dy = 0; dy < 120; dy += 12) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: rect.x + 50, y: rect.y + 110 - dy }] })
    await phone.waitForTimeout(20)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await phone.waitForTimeout(250)
  assert.ok(await phone.evaluate(() => scrollY) - before > 40, 'touch scroll must not be trapped by the score')
  for (const width of [320, 390, 768]) {
    await phone.setViewportSize({ width, height: 844 })
    assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth), width)
  }
  console.log('Touch onboarding, notes, transport dock, reordering, natural scroll and narrow layouts passed.')
  assert.deepEqual(errors, [])
  console.log(`No browser errors. Screenshots: ${shots}`)
} finally { await browser.close() }
