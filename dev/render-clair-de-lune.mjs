// Deterministic frames, then the approved recording trimmed by exactly 2.44 seconds.
// npm run dev
// node dev/render-clair-de-lune.mjs [--stills] [--port 8791]
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { once } from 'node:events'

const require = createRequire(import.meta.url)
function playwright() {
  if (process.env.PLAYWRIGHT_MODULE) return require(process.env.PLAYWRIGHT_MODULE)
  try { return require('playwright') } catch { /* Also accept an existing npx install. */ }
  const cache = join(homedir(), '.npm/_npx')
  if (existsSync(cache)) {
    for (const entry of readdirSync(cache)) {
      const path = join(cache, entry, 'node_modules/playwright')
      if (existsSync(path)) return require(path)
    }
  }
  throw new Error('Playwright is needed for export. Set PLAYWRIGHT_MODULE to an installed copy.')
}
const { chromium } = playwright()
// Reuse a downloaded headless shell even if the npx package was updated since that download.
function executable() {
  if (process.env.PW_CHROME) return process.env.PW_CHROME
  const cache = process.platform === 'darwin' ? join(homedir(), 'Library/Caches/ms-playwright') : join(homedir(), '.cache/ms-playwright')
  if (!existsSync(cache)) return undefined
  for (const entry of readdirSync(cache).filter((s) => s.startsWith('chromium_headless_shell-')).sort().reverse()) {
    for (const suffix of ['chrome-headless-shell-mac-arm64/chrome-headless-shell', 'chrome-headless-shell-mac-x64/chrome-headless-shell', 'chrome-headless-shell-linux64/chrome-headless-shell']) {
      const path = join(cache, entry, suffix)
      if (existsSync(path)) return path
    }
  }
  return undefined
}
const portAt = process.argv.indexOf('--port')
const port = portAt >= 0 ? process.argv[portAt + 1] : '8791'
const stillsOnly = process.argv.includes('--stills')
const width = 1600, height = 900, fps = 60
const browser = await chromium.launch({ headless: true, executablePath: executable() })
let encoder
try {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`http://127.0.0.1:${port}/dev/clair-de-lune.html?clean=1`)
  await page.waitForFunction(() => window.clairPreview?.ready)
  const info = await page.evaluate(() => ({ duration: window.clairPreview.duration, offset: window.clairPreview.audioOffset }))
  if (info.duration !== 30 || info.offset !== 2.44) throw new Error('Unexpected preview bounds')
  // Exercise the real transport as well as the offline renderer, including its hard endpoint.
  await page.evaluate(() => document.body.classList.remove('clean'))
  await page.locator('#play').click()
  await page.waitForFunction(() => window.clairPreview.now() > 0.15)
  const playing = await page.evaluate(() => ({ t: window.clairPreview.now(), audio: window.clairPreview.audio.currentTime, paused: window.clairPreview.audio.paused }))
  if (playing.paused || Math.abs(playing.audio - playing.t - info.offset) > 0.02) throw new Error('Audio and show clocks disagree')
  await page.evaluate(() => window.clairPreview.pause())
  const pausedAt = await page.evaluate(() => window.clairPreview.now())
  await page.waitForTimeout(100)
  if (await page.evaluate(() => window.clairPreview.now()) !== pausedAt) throw new Error('Pause did not hold the clock')
  await page.evaluate(() => window.clairPreview.seek(29.8))
  await page.locator('#play').click()
  await page.waitForFunction(() => window.clairPreview.now() === 30 && window.clairPreview.audio.paused)
  await page.locator('#restart').click()
  const restart = await page.evaluate(() => ({ t: window.clairPreview.now(), audio: window.clairPreview.audio.currentTime }))
  if (restart.t !== 0 || Math.abs(restart.audio - info.offset) > 0.001) throw new Error('Restart missed the first note')
  await page.evaluate(() => document.body.classList.add('clean'))
  console.log('Browser checks passed: audio clock, pause, restart and 30-second stop.')
  const frame = async (t) => Buffer.from((await page.evaluate((time) => window.clairPreview.frame(time), t)).split(',')[1], 'base64')
  const stills = join(tmpdir(), 'clair-de-lune-review')
  mkdirSync(stills, { recursive: true })
  for (const t of [0, 2, 3.95, 7.95, 10.4, 15.8, 17.2, 21.65, 24.3, 26.9, 29.9]) {
    writeFileSync(join(stills, `${t.toFixed(2)}.png`), await frame(t))
  }
  console.log(`Review stills: ${stills}`)
  if (!stillsOnly) {
    const out = resolve('docs/promo/clair-de-lune-30s-preview.mp4')
    encoder = spawn('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'image2pipe', '-framerate', String(fps), '-vcodec', 'png', '-i', 'pipe:0',
      '-ss', String(info.offset), '-i', 'docs/promo/clair-de-lune-goedhart.mp3',
      '-map', '0:v:0', '-map', '1:a:0', '-t', String(info.duration),
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
      '-metadata', 'title=Clair de lune — Contraptions opening preview',
      '-metadata', 'artist=Claude Debussy; piano: Laurens Goedhart, 2011',
      '-metadata', 'comment=Recording CC BY 3.0. See CLAIR_DE_LUNE_ATTRIBUTION.txt. Audio trimmed 2.44–32.44 s; choreography preview only.',
      out,
    ], { stdio: ['pipe', 'inherit', 'inherit'] })
    const encoded = once(encoder, 'close')
    // Observe process errors immediately, including before the last frame has been written.
    encoder.stdin.on('error', (error) => { errors.push(error.message) })
    for (let i = 0; i < info.duration * fps; i++) {
      if (errors.length) throw new Error(errors.join('\n'))
      if (encoder.exitCode !== null) throw new Error(`ffmpeg exited early: ${encoder.exitCode}`)
      if (!encoder.stdin.write(await frame(i / fps))) await once(encoder.stdin, 'drain')
      if (i % (fps * 5) === 0) console.log(`Rendered ${i / fps} / ${info.duration}s`)
    }
    encoder.stdin.end()
    const [code] = await encoded
    if (code !== 0) throw new Error(`ffmpeg exited ${code}`)
    console.log(`Saved ${out}`)
  }
  if (errors.length) throw new Error(errors.join('\n'))
} finally {
  if (encoder && encoder.exitCode === null) encoder.kill()
  await browser.close()
}
