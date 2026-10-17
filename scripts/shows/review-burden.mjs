// Reproducible frame scrub and contact sheets. Run against this worktree's Vite:
// node scripts/shows/review-burden.mjs --round 1 --port 8863 [--scan]
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
await sheet('story', [0, 8, 18, 37, 56, 68, 82, 94, 113, 130, 146, 158, 174, 187.2, 198.4, 212, 240, 250, 263.4, 274.2, 276, 281, 294, 306, 317, 326, 329.2, 339, 349, 357, 365, 379])
// Consecutive frames, not a thumbnail sampler, on the two most consequential handoffs.
for (const [name, at] of [['stair-handoff', 190], ['bridge-break', 274.2], ['sam-catch', 329.2]]) {
  await sheet(name, Array.from({ length: 20 }, (_, i) => at + (i - 8) / 30), 320, 4)
}
for (const [name, t] of [['shire', 4], ['council', 86], ['pass', 132], ['bridge', 264], ['fellowship', 345]]) {
  save(`${output}/${name}.png`, await page.evaluate(t => window.shows.still(t, 1280, 720), t))
}
save('public/shows/bridge-of-khazad-dum/astra.png', await page.evaluate(() => window.shows.still(255, 1200, 630)))
const report = { round: args.round, errors, frames: 0, speed: [], reversible: false, credits: false }
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
  wordPainter(1280, 720)(g, perf.titles(365))
  return { png: c.toDataURL(), hasDirector: perf.titles(365).some(c => c.names.includes('GPT-6 Astra')) }
})
save(`${output}/video-credit.png`, credit.png); report.credits = credit.hasDirector
report.errors = errors
writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report))
await browser.close()
if (errors.length || !report.reversible || !report.credits) process.exitCode = 1
