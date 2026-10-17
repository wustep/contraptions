/** Real browser play-through. Install Playwright outside the repo; see docs/games/pet-the-machine/README.md. */
import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const base = process.env.PET_BASE_URL ?? 'http://127.0.0.1:8797'
const artifacts = process.env.PET_ARTIFACTS ?? 'out/pet-qa/final'
await mkdir(artifacts, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const errors = []
const watch = (page) => {
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
}
const ready = (page) => page.waitForFunction(() => !document.querySelector('#offer')?.disabled)
const open = async (page) => { watch(page); await page.goto(`${base}/games/pet-the-machine/`); await ready(page) }
const memory = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('contraptions.pet-the-machine.v1')))
const offer = async (page, resident, toy, expected) => {
  await page.locator(`.resident-card[data-resident="${resident}"]`).click()
  await page.locator(`[data-toy="${toy}"]`).click()
  await page.locator('#offer').click()
  await ready(page)
  assert.equal(await page.locator('#observation-title').textContent(), expected)
  console.log(`Played: ${expected}`)
}
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1120 }, acceptDownloads: true })
  const page = await context.newPage()
  await open(page)
  const slash = await page.request.get(`${base}/games/pet-the-machine?visit=hello`, { maxRedirects: 0 })
  assert.equal(slash.status(), 302)
  assert.equal(slash.headers().location, '/games/pet-the-machine/?visit=hello')
  await page.screenshot({ path: `${artifacts}/garden-desktop.png`, fullPage: true })

  // A complete visit: every discovery earned through visible controls.
  for (const [resident, toy, expected] of [
    ['snail', 'ball', 'Special delivery'],
    ['snail', 'bell', 'Under consideration'],
    ['snail', 'bell', 'Still under consideration'],
    ['snail', 'pompom', 'An excellent hat'],
    ['frog', 'ball', 'Return to sender'],
    ['frog', 'bell', 'One-note orchestra'],
    ['frog', 'bell', 'Encore, please'],
    ['frog', 'pompom', 'Soft spot'],
    ['fern', 'ball', 'Personal space'],
    ['fern', 'bell', 'A tiny round of applause'],
    ['fern', 'pompom', 'A little umbrella'],
  ]) await offer(page, resident, toy, expected)
  await page.locator('#pat').click()
  await offer(page, 'fern', 'pompom', 'Coming out of her shell')
  await page.locator('[data-perches="together"]').click()
  await offer(page, 'frog', 'ball', 'The slowest game of catch')
  assert.equal((await memory(page)).found.length, 13)
  await page.screenshot({ path: `${artifacts}/all-discoveries.png`, fullPage: true })

  // Replays neither award duplicates nor change the recent-interaction memory.
  const beforeReplay = await memory(page)
  await page.locator('#open-book').click()
  await page.screenshot({ path: `${artifacts}/scrapbook.png`, fullPage: true })
  await page.locator('[data-replay="neighbors"]').click()
  await page.waitForTimeout(5500)
  await page.screenshot({ path: `${artifacts}/neighbors.png`, fullPage: true })
  await ready(page)
  assert.deepEqual(await memory(page), beforeReplay)
  const downloadPromise = page.waitForEvent('download')
  await page.locator('#postcard').click()
  const download = await downloadPromise
  await download.saveAs(`${artifacts}/postcard.png`)
  const png = await readFile(`${artifacts}/postcard.png`)
  assert.equal(png.readUInt32BE(16), 1400)
  assert.equal(png.readUInt32BE(20), 1040)
  console.log('13 discoveries, replay without mutation, and 1400×1040 postcard: passed')

  // Keyboard input, rapid clicking, pause, dialog pause, and naming.
  await page.locator('h1').click()
  await page.keyboard.press('ArrowLeft')
  assert.equal(await page.locator('#resident-name').textContent(), 'Pip')
  await page.keyboard.press('2')
  const visits = (await memory(page)).visits.snail
  await page.evaluate(() => { const button = document.querySelector('#offer'); for (let i = 0; i < 12; i++) button.click() })
  await page.waitForTimeout(500)
  await page.locator('#pause').click()
  const progress = await page.locator('#offer').evaluate((node) => node.style.getPropertyValue('--progress'))
  await page.waitForTimeout(350)
  assert.equal(await page.locator('#offer').evaluate((node) => node.style.getPropertyValue('--progress')), progress)
  await page.locator('#resume').click()
  await page.locator('#open-book').click()
  assert.equal(await page.locator('.replay-button:not(:disabled)').count(), 0)
  const held = await page.locator('#offer').evaluate((node) => node.style.getPropertyValue('--progress'))
  await page.waitForTimeout(350)
  assert.equal(await page.locator('#offer').evaluate((node) => node.style.getPropertyValue('--progress')), held)
  await page.keyboard.press('Escape')
  await ready(page)
  assert.equal((await memory(page)).visits.snail, visits + 1)
  await page.locator('#rename').click()
  await page.locator('#name-input').fill('Professor Pip')
  await page.locator('#name-form button').click()
  await page.locator('#sound').click()
  await page.reload()
  await ready(page)
  assert.equal(await page.locator('#resident-name').textContent(), 'Professor Pip')
  assert.equal((await memory(page)).sound, false)
  assert.equal((await memory(page)).perches, 'together')
  console.log('Keyboard, rapid inputs, pause, modal focus/escape, rename, mute, and reload: passed')

  // Actual touch targets and a focused phone camera, then a postcard from the small viewport.
  const phoneContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true })
  const phone = await phoneContext.newPage()
  await open(phone)
  const offerBox = await phone.locator('#offer').boundingBox()
  assert.ok(offerBox.y + offerBox.height < 844)
  await phone.locator('[data-toy="pompom"]').tap()
  await phone.locator('#offer').tap()
  await phone.waitForTimeout(1600)
  await phone.screenshot({ path: `${artifacts}/garden-phone.png`, fullPage: true })
  await ready(phone)
  assert.equal(await phone.locator('#observation-title').textContent(), 'An excellent hat')
  const phoneDownloadPromise = phone.waitForEvent('download')
  await phone.locator('#postcard').tap()
  const phoneDownload = await phoneDownloadPromise
  await phoneDownload.saveAs(`${artifacts}/postcard-phone.png`)
  assert.equal(await phone.locator('#stage canvas').evaluate((node) => node.clientWidth), await phone.locator('#stage').evaluate((node) => node.clientWidth))
  for (const width of [320, 390, 520, 768, 1024, 1440]) {
    await phone.setViewportSize({ width, height: 900 })
    await phone.waitForTimeout(250)
    assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `No overflow at ${width}`)
    assert.equal(await phone.locator('.toy-section').evaluate((node) => node.parentElement.className), width <= 520 ? 'garden-panel' : 'field-note')
  }
  console.log('Touch, phone export, and responsive layout from 320 to 1440px: passed')

  const reducedContext = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 1000 } })
  const reduced = await reducedContext.newPage()
  await open(reduced)
  await reduced.waitForTimeout(400)
  const still = await reduced.locator('#stage').screenshot()
  await reduced.waitForTimeout(400)
  assert.ok(still.equals(await reduced.locator('#stage').screenshot()), 'Reduced motion makes the idle garden still')
  await offer(reduced, 'frog', 'ball', 'Return to sender')
  console.log('Reduced-motion idle and a full reduced-motion story: passed')

  const deniedContext = await browser.newContext()
  await deniedContext.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Unavailable', 'SecurityError') }
    Storage.prototype.setItem = () => { throw new DOMException('Unavailable', 'SecurityError') }
  })
  const denied = await deniedContext.newPage()
  await open(denied)
  assert.match(await denied.locator('#save-status').textContent(), /unavailable/)
  await offer(denied, 'snail', 'ball', 'Special delivery')
  assert.equal(await denied.locator('.book-count').textContent(), '1/13')

  const strangeContext = await browser.newContext()
  await strangeContext.addInitScript(() => localStorage.setItem('contraptions.pet-the-machine.v1', JSON.stringify({ version: 1, names: { snail: '"><i>Sprout' }, found: ['fake', null, 'snail-ball', 'snail-ball'] })))
  const strange = await strangeContext.newPage()
  await open(strange)
  assert.equal(await strange.locator('.resident-target i').count(), 0)
  assert.equal(await strange.locator('#resident-name').textContent(), '"><i>Sprout')
  assert.equal(await strange.locator('.book-count').textContent(), '1/13')
  const corruptContext = await browser.newContext()
  await corruptContext.addInitScript(() => localStorage.setItem('contraptions.pet-the-machine.v1', '{broken'))
  const corrupt = await corruptContext.newPage()
  await open(corrupt)
  assert.equal(await corrupt.locator('.book-count').textContent(), '0/13')
  await corrupt.locator('#offer').click()
  await corrupt.reload()
  await ready(corrupt)
  assert.equal(await corrupt.locator('.book-count').textContent(), '0/13')
  console.log('Denied/corrupt storage, escaped names, and interrupted offers: passed')
  assert.deepEqual(errors, [])
  console.log('No browser errors. Pet the Machine browser playtest passed.')
} finally {
  await browser.close()
}
