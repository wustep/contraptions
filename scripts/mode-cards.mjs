// Share cards for the modes that are not a show: the picture a link to Explorations, the Playground, the Builder or
// Theater unfurls with. Machine's is /og.png, the Shows page's and every show's come from `show-cards.mjs`.
//
//   npx vite --port 8850 --strictPort            (in another terminal)
//   node scripts/mode-cards.mjs --port 8850      every card below, to public/<mode>/card.png
//   node scripts/mode-cards.mjs --port 8850 --only theater
//
// Each card is the mode's own page at 1200 × 630, taken as a visitor would see it, with nothing written on it: the
// link's title and line are the page's own `<head>`. Explorations is a sheet at a fixed seed; the Playground is its
// Forest shelf; the Builder is a piece beside the prompt that made it; Theater is a show on, with its running order.
//
// Needs Playwright, found the way `show-cards.mjs` finds it (PLAYWRIGHT, or the copy `npx playwright` keeps).
// PW_CHROME names a browser to run it with.
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'

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

/**
 * Each card: the page, the window it is seen in (CSS pixels at a scale that comes to 1200 × 630, so the type and
 * the strokes are drawn at that size rather than scaled up), and what to do before the picture.
 */
const CARDS = [
  {
    // A square sheet seen through a 1200 × 1200 window, its middle band taken: the cells stay big enough to read.
    mode: 'explorations',
    path: '/explorations/?seed=amber-flywheel-812&mode=classic&theme=okazz',
    window: [1200, 1200, 1],
    clip: { x: 0, y: 285, width: 1200, height: 630 },
    wait: 3000,
  },
  {
    // The Forest shelf whole, between the end of Regular and the foot. At 820 wide the sheet draws no hint line;
    // the clip leaves out its scrollbar, which stands at the right edge.
    mode: 'playground',
    path: '/playground/?seed=cobalt-plunger-206',
    window: [820, 420, 1.5],
    clip: { x: 10, y: 0, width: 800, height: 420 },
    wait: 3500,
    async before(page) {
      await page.mouse.move(410, 210)
      await page.mouse.wheel(0, 362)
      await page.mouse.move(818, 2)
      await page.waitForTimeout(3000)
    },
  },
  {
    // The sample build's gong, mid-ring, beside the prompt that names it. The Builder opens with its panel out.
    mode: 'builder',
    path: '/builder/?seed=cobalt-plunger-206',
    window: [960, 504, 1.25],
    wait: 4000,
  },
  {
    // Mountain King's train crossing the trestle, with the panel out: what is on, and what is up next.
    mode: 'theater',
    path: '/theater/?show=mountain-king&take=opus55-spark&music=file',
    window: [960, 504, 1.25],
    wait: 6000,
    async before(page) {
      await page.keyboard.press('p')
      await page.waitForTimeout(1500)
      await page.evaluate(() => window.shows.seek(114.6))
      await page.waitForTimeout(1800)
    },
  },
]

async function launch(pw) {
  if (process.env.PW_CHROME) return pw.chromium.launch({ executablePath: process.env.PW_CHROME })
  return pw.chromium.launch()
}

const browser = await launch(playwright())
for (const card of CARDS.filter((c) => !args.only || c.mode === args.only)) {
  const [width, height, deviceScaleFactor] = card.window
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor })
  page.on('console', (m) => { if (m.type() === 'error') console.log(`[${card.mode}]`, m.text()) })
  await page.goto(`${base}${card.path}`, { waitUntil: 'load' })
  // The panel's handle stands on the stage's edge as a page opens; a card is the page without it.
  await page.addStyleTag({ content: '.panel-handle { display: none !important; }' })
  await page.waitForTimeout(card.wait)
  await card.before?.(page)
  const file = `public/${card.mode}/card.png`
  mkdirSync(`public/${card.mode}`, { recursive: true })
  await page.screenshot({ path: file, clip: card.clip })
  console.log(`  ${file}`)
  await page.close()
}
await browser.close()
