// Reproducible frame scrub and contact sheets. Run against this worktree's Vite:
// node scripts/shows/review-burden.mjs --round 1 --port 8863 [--watch] [--scan] [--export]
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'

const require = createRequire(import.meta.url)
const args = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => [a.slice(2), process.argv[process.argv.indexOf(a) + 1] ?? 'true']))
const output = `out/burden/round-${args.round ?? '1'}`
mkdirSync(output, { recursive: true })
let pw
if (process.env.PLAYWRIGHT) pw = require(process.env.PLAYWRIGHT)
else {
  try { pw = require('playwright') } catch {
    const cache = `${homedir()}/.npm/_npx`
    const at = readdirSync(cache).map(d => `${cache}/${d}/node_modules/playwright`).find(p => existsSync(`${p}/package.json`))
    if (!at) throw new Error('Install Playwright or set PLAYWRIGHT to its module path.')
    pw = require(at)
  }
}
let browser
try { browser = await pw.chromium.launch() } catch {
  const cache = `${homedir()}/Library/Caches/ms-playwright`
  const builds = readdirSync(cache).filter(d => d.startsWith('chromium_headless_shell-')).sort().reverse()
  const exe = builds.flatMap(d => readdirSync(`${cache}/${d}`).map(sub => `${cache}/${d}/${sub}/chrome-headless-shell`)).find(existsSync)
  browser = await pw.chromium.launch({ executablePath: process.env.PW_CHROME ?? exe })
}
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 })
const errors = []
page.on('pageerror', e => errors.push(String(e)))
const base = `http://localhost:${args.port ?? 8863}`
await page.goto(`${base}/shows/bridge-of-khazad-dum/astra/?music=file`)
await page.waitForFunction(() => window.shows && !window.shows.state().loading)
await page.evaluate(() => { window.shows.pause(); window.shows.setMuted(true); window.shows.hold(true) })
const save = (path, data) => writeFileSync(path, Buffer.from(data.split(',')[1], 'base64'))
async function sheet(name, times, width = 320, cols = 4) {
  const urls = []
  for (const t of times) urls.push(await page.evaluate(async ([t, w]) => window.shows.still(t, w, w * 9 / 16), [t, width]))
  const png = await page.evaluate(async ({ urls, times, width, cols }) => {
    const c = document.createElement('canvas'), height = width * 9 / 16
    c.width = width * cols; c.height = Math.ceil(urls.length / cols) * (height + 22)
    const g = c.getContext('2d'); g.fillStyle = '#18201C'; g.fillRect(0, 0, c.width, c.height)
    for (let i = 0; i < urls.length; i++) {
      const img = new Image(); img.src = urls[i]; await img.decode()
      const x = (i % cols) * width, y = Math.floor(i / cols) * (height + 22)
      g.drawImage(img, x, y, width, height)
      g.fillStyle = '#E9E1C6'; g.font = '12px monospace'; g.fillText(`${times[i].toFixed(3)} s`, x + 8, y + height + 15)
    }
    return c.toDataURL()
  }, { urls, times, width, cols })
  save(`${output}/${name}.png`, png)
}
// A wall-clock 1× scrub, in reviewable forty-second reels. This is deliberately
// separate from the exhaustive accelerated frame scan below: duration is part
// of the edit. The contact sheets are evidence for visual review, not playback.
const realtime = []
if (args.watch) {
  await page.evaluate(() => window.shows.setSpeed(1))
  for (let from = 0; from < 383; from += 40) {
    const end = Math.min(383, from + 40)
    const reel = await page.evaluate(async ([from, end]) => {
      const start = performance.now()
      let frames = 0, previous = start, maxGapMs = 0
      await new Promise(resolve => {
        const draw = now => {
          maxGapMs = Math.max(maxGapMs, now - previous); previous = now
          const t = Math.min(end, from + (now - start) / 1000)
          window.shows.paintAt(t); frames++
          if (t < end) requestAnimationFrame(draw)
          else resolve()
        }
        requestAnimationFrame(draw)
      })
      return { from, end, frames, elapsed: (performance.now() - start) / 1000, maxGapMs }
    }, [from, end])
    realtime.push(reel)
    await sheet(`watch-${String(from).padStart(3, '0')}`, Array.from({ length: Math.ceil((end - from) / 2.5) }, (_, i) => from + i * 2.5), 480, 4)
    writeFileSync(`${output}/realtime.json`, JSON.stringify(realtime, null, 2) + '\n')
    console.log(`1× review ${from}–${end} s: ${reel.frames} frames in ${reel.elapsed.toFixed(2)} s`)
  }
}
await sheet('story', [0, 8, 18, 37, 56, 68, 82, 94, 113, 130, 146, 158, 174, 187.2, 198.4, 212, 240, 250, 263.4, 274.2, 276, 281, 294, 306, 317, 326, 329.2, 339, 349, 357, 365, 379])
// Consecutive frames, not a thumbnail sampler, on the two most consequential handoffs.
for (const [name, at] of [['ring-pickup', 7.6], ['shutter-close', 40], ['stair-handoff', 190], ['bridge-break', 274.2], ['sam-catch', 329.2]]) {
  await sheet(name, Array.from({ length: 20 }, (_, i) => at + (i - 8) / 30), 320, 4)
}
for (const [name, t] of [['shire', 4], ['road', 41], ['council', 86], ['pass', 132], ['bridge', 264], ['grove', 296], ['fellowship', 345]]) {
  save(`${output}/${name}.png`, await page.evaluate(t => window.shows.still(t, 1280, 720), t))
}
save('public/shows/bridge-of-khazad-dum/astra.png', await page.evaluate(() => window.shows.still(255, 1200, 630)))
const report = { round: args.round, errors, realtime, frames: 0, speed: [], reversible: false, credits: false, matte: false, views: [], dom: null, export: null, youtube: null }
for (const speed of [1, 2]) {
  report.speed.push(await page.evaluate(speed => { window.shows.setSpeed(speed); return window.shows.state().speed }, speed))
}
if (args.scan) {
  for (let from = 0; from < 383 * 30; from += 450) {
    const result = await page.evaluate(([from, end]) => {
      const proto = CanvasRenderingContext2D.prototype, original = proto.fillText
      proto.fillText = () => { throw new Error('Text drawn in the live frame') }
      try { for (let f = from; f < end; f++) window.shows.paintAt(f / 30) } finally { proto.fillText = original }
      return end - from
    }, [from, Math.min(383 * 30, from + 450)])
    report.frames += result
    if (from % 1800 === 0) console.log(`scrubbed ${(report.frames / 30).toFixed(0)} / 383 s`)
  }
}
report.reversible = await page.evaluate(() => {
  const s = window.shows
  s.paintAt(264); const a = s.canvas().toDataURL()
  for (const t of [355, 0, 198, 329, 50, 274]) s.paintAt(t)
  s.paintAt(264)
  return a === s.canvas().toDataURL()
})
// The exact shared video credit painter on a real exported frame.
const credit = await page.evaluate(async () => {
  const { performance: perf } = await import('/apps/rube/src/shows/versions/bridge-of-khazad-dum/astra/index.ts')
  const { wordPainter } = await import('/apps/rube/src/shows/words.ts')
  const url = await window.shows.still(365, 1280, 720), img = new Image()
  img.src = url; await img.decode()
  const c = document.createElement('canvas'); c.width = 1280; c.height = 720
  const g = c.getContext('2d'); g.drawImage(img, 0, 0)
  const proto = CanvasRenderingContext2D.prototype
  const shadow = Object.getOwnPropertyDescriptor(proto, 'shadowBlur'), filter = Object.getOwnPropertyDescriptor(proto, 'filter')
  let matte = true
  Object.defineProperty(proto, 'shadowBlur', { ...shadow, set(v) { if (v > 0) matte = false; shadow.set.call(this, v) } })
  Object.defineProperty(proto, 'filter', { ...filter, set(v) { if (v !== 'none') matte = false; filter.set.call(this, v) } })
  try {
    const paint = wordPainter(1280, 720)
    for (const t of [357.5, 365, 370, 377]) { g.clearRect(0, 0, c.width, c.height); paint(g, perf.titles(t)) }
    g.clearRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0); paint(g, perf.titles(365))
  } finally {
    Object.defineProperty(proto, 'shadowBlur', shadow); Object.defineProperty(proto, 'filter', filter)
  }
  return { png: c.toDataURL(), hasDirector: perf.titles(365).some(c => c.names.includes('GPT-6 Astra')), matte }
})
save(`${output}/video-credit.png`, credit.png); report.credits = credit.hasDirector; report.matte = credit.matte
for (const view of ['zoom', 'overview']) {
  await page.evaluate(view => { window.shows.setZoom(view === 'zoom'); window.shows.setOverview(view === 'overview') }, view)
  await sheet(view, [4, 86, 132, 198, 247, 276, 328, 345])
  report.views.push(view)
}
await page.evaluate(() => { window.shows.setZoom(false); window.shows.setOverview(false); window.shows.seek(363.7); window.shows.paintAt(363.7) })
await page.waitForTimeout(150)
report.dom = await page.evaluate(() => {
  const card = document.querySelector('.stage-words .card.matte')
  return card ? { text: card.textContent, shadow: getComputedStyle(card).textShadow, filter: getComputedStyle(card).filter } : null
})
if (args.export) {
  const downloaded = page.waitForEvent('download', { timeout: 30000 })
  const saved = await page.evaluate(async () => {
    const { performance: perf } = await import('/apps/rube/src/shows/versions/bridge-of-khazad-dum/astra/index.ts')
    const { createShowStage } = await import('/apps/rube/src/shows/stage.ts')
    const from = 363.2, host = document.createElement('div')
    host.style.cssText = 'position:fixed;inset:0;width:1280px;height:720px;z-index:9999;'
    document.body.append(host)
    const stage = createShowStage(host, { time: () => 0 })
    const show = Object.assign(Object.create(perf.show), { at: t => perf.show.at(from + t) })
    stage.set({ ...perf, show, duration: 6.2, soundtrack: undefined, camera: t => perf.camera(from + t), titles: t => perf.titles(from + t) })
    try {
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      return await stage.saveVideo('burden-export-proof', { label: '720p', w: 1280, h: 720 }, 2, false, new AbortController().signal)
    } finally { stage.destroy(); host.remove() }
  })
  const download = await downloaded, path = `${output}/${download.suggestedFilename()}`
  await download.saveAs(path)
  report.export = { saved, path, showRange: [363.2, 369.4], speed: 2 }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => { window.shows.seek(365); window.shows.paintAt(365) })
  await page.waitForTimeout(200)
  await page.screenshot({ path: `${output}/mobile-credit.png` })
  await page.setViewportSize({ width: 1280, height: 800 })
  // Confirm the live route creates the actual YouTube player, separately from silent capture.
  await page.goto(`${base}/shows/bridge-of-khazad-dum/astra/`)
  await page.waitForFunction(() => window.shows && !window.shows.state().loading)
  await page.waitForTimeout(1500)
  report.youtube = await page.evaluate(() => ({ state: window.shows.state(), frames: [...document.querySelectorAll('iframe')].map(f => f.src) }))
  const rates = []
  for (const speed of [1, 2]) {
    await page.evaluate(speed => window.shows.setSpeed(speed), speed)
    await page.waitForTimeout(600)
    const before = await page.evaluate(() => ({ heard: window.shows.state().heard, wall: performance.now() }))
    await page.waitForTimeout(1100)
    const after = await page.evaluate(() => ({ heard: window.shows.state().heard, wall: performance.now() }))
    rates.push({ speed, measured: (after.heard - before.heard) / ((after.wall - before.wall) / 1000) })
  }
  report.youtube.rates = rates
  await page.evaluate(() => window.shows.pause())
}
report.errors = errors
writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report))
await browser.close()
if (errors.length || !report.reversible || !report.credits || !report.matte || !report.dom || report.dom.shadow !== 'none' || report.dom.filter !== 'none') process.exitCode = 1
