// Share cards for Shows: the picture a link to a show unfurls with (`apps/rube/src/shows/share.ts`).
//
//   npx vite --port 8850 --strictPort            (in another terminal)
//   node scripts/show-cards.mjs --port 8850      every take at its `still`, to public/shows/<work>/<take>.png,
//                                                and the Shows page's own card, public/shows/card.png
//   node scripts/show-cards.mjs --port 8850 --sheet interstellar/opus55 [--from 0 --to 291 --n 24] --out sheet.png
//                                                a contact sheet of one take, to choose its still
//
// Each card is the show's own frame at 1200 × 630 (the show's camera; the wider frame sees a little more world
// round its 16:9), with nothing written on it: the link's title and line are the page's (`vite.config.ts`).
// The Shows page's card is four shows' stills, two by two.
//
// Needs Playwright. It is not a dependency of the site: point PLAYWRIGHT at a copy (a module path), or let the
// script find the one `npx playwright` keeps. PW_CHROME names a browser to run it with.
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname } from 'node:path'

const require = createRequire(import.meta.url)
function playwright() {
  if (process.env.PLAYWRIGHT) return require(process.env.PLAYWRIGHT)
  try {
    return require('playwright')
  } catch {}
  const cache = `${homedir()}/.npm/_npx`
  for (const d of existsSync(cache) ? readdirSync(cache) : []) {
    const at = `${cache}/${d}/node_modules/playwright`
    if (existsSync(`${at}/package.json`)) return require(at)
  }
  throw new Error('Playwright not found: set PLAYWRIGHT to its module path, or run `npx playwright install chromium` once.')
}

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : 'true'])
  return acc
}, []))
const base = `http://localhost:${args.port ?? '8850'}`
/** The four shows on the Shows page's own card, in reading order. */
const FOUR = ['interstellar/opus55', 'come-recover/opus55-all-at-once', 'la-la-land/fable51-epilogue', 'gymnopedie/opus55']

/** The browser Playwright keeps, or, when this copy of it wants one not downloaded, any headless Chromium it has. */
async function launch(pw) {
  if (process.env.PW_CHROME) return pw.chromium.launch({ executablePath: process.env.PW_CHROME })
  try {
    return await pw.chromium.launch()
  } catch (err) {
    const cache = `${homedir()}/Library/Caches/ms-playwright`
    const shells = existsSync(cache) ? readdirSync(cache).filter((d) => d.startsWith('chromium_headless_shell-')).sort().reverse() : []
    for (const d of shells) {
      for (const sub of readdirSync(`${cache}/${d}`)) {
        const exe = `${cache}/${d}/${sub}/chrome-headless-shell`
        if (existsSync(exe)) return pw.chromium.launch({ executablePath: exe })
      }
    }
    throw err
  }
}

const browser = await launch(playwright())
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 })
page.on('console', (m) => { if (m.type() === 'error') console.log('[page]', m.text()) })
await page.goto(`${base}/shows/?music=file`)
await page.waitForFunction(() => window.shows && !window.shows.state().loading, null, { timeout: 60000 })

/** Open a take, stopped, and wait for it to be on the stage. */
async function open(id) {
  const [work, take] = id.split('/')
  await page.evaluate(async ([w, t]) => {
    await window.shows.open(w, t)
    window.shows.pause()
    window.shows.setMuted(true)
  }, [work, take])
  const state = await page.evaluate(() => window.shows.state())
  if (state.version !== id || state.failed) throw new Error(`${id} would not open: ${state.failed || state.version}`)
  return state
}
const still = (t, w, h) => page.evaluate(([t, w, h]) => window.shows.still(t, w, h), [t, w, h])
const save = (file, dataUrl) => {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'))
  console.log(`  ${file}`)
}
/** Cells drawn two-dimensionally into one PNG, in the page. */
const grid = (cells, cols, w, h, labels) => page.evaluate(async ([cells, cols, w, h, labels]) => {
  const rows = Math.ceil(cells.length / cols)
  const c = document.createElement('canvas')
  c.width = cols * w
  c.height = rows * h
  const g = c.getContext('2d')
  for (const [i, url] of cells.entries()) {
    const img = new Image()
    img.src = url
    await img.decode()
    const x = (i % cols) * w
    const y = Math.floor(i / cols) * h
    g.drawImage(img, x, y, w, h)
    if (labels) {
      g.fillStyle = 'rgba(0,0,0,0.6)'
      g.fillRect(x, y, 64, 22)
      g.fillStyle = '#fff'
      g.font = '14px monospace'
      g.fillText(labels[i], x + 6, y + 16)
    }
  }
  return c.toDataURL('image/png')
}, [cells, cols, w, h, labels ?? null])

if (args.sheet) {
  const state = await open(args.sheet)
  const n = Number(args.n ?? 24)
  const from = Number(args.from ?? 0)
  const to = Number(args.to ?? state.duration)
  const times = Array.from({ length: n }, (_, i) => from + ((to - from) * i) / Math.max(1, n - 1))
  const cells = []
  for (const t of times) cells.push(await still(t, 400, 210))
  save(args.out ?? 'sheet.png', await grid(cells, Number(args.cols ?? 4), 400, 210, times.map((t) => t.toFixed(1))))
} else {
  const works = await page.evaluate(() => window.shows.works.map((w) => ({ work: w.work, versions: w.versions.map((v) => ({ take: v.take, still: v.still })) })))
  const four = {}
  for (const w of works) {
    for (const v of w.versions) {
      const id = `${w.work}/${v.take}`
      if (typeof v.still !== 'number') throw new Error(`${id} has no still: add \`still\` to its .show.ts`)
      await open(id)
      save(`public/shows/${id}.png`, await still(v.still, 1200, 630))
      if (FOUR.includes(id)) four[id] = await still(v.still, 600, 315)
    }
  }
  save('public/shows/card.png', await grid(FOUR.map((id) => four[id]), 2, 600, 315))
}
await browser.close()
