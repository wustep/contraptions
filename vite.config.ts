import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Connect, type Plugin } from 'vite'
import { RENAMED_TAKES, readShows, type ShowVersion, type Work } from './apps/rube/src/shows/registry'
import { cardPath, showCard, showPath, type ShareCard } from './apps/rube/src/shows/share'

/**
 * One site, one build: six pages and three forwarding addresses.
 *
 *   /machine/        Machine (apps/rube)
 *   /explorations/   the generator Machine grew out of (src)
 *   /shows/          Machine set to music (apps/rube/src/shows), and a page per show:
 *                    /shows/<work>/ and /shows/<work>/<take>/ (`showPages`, `share.ts`), and a
 *                    renamed take's old address as well
 *   /theater/        every show, shuffled; off the mode switch until visited (`shell.ts`)
 *   /playground/     pieces and worlds waiting to be let into Machine (apps/rube/src/playground)
 *   /builder/        where new pieces and worlds are made (apps/rube/src/builder); not on the switch
 *
 * `/` forwards to `/machine/`, `/sandbox/` (where Explorations used to live)
 * to `/explorations/`, and `/rube/` (where Machine did) to `/machine/`, each
 * keeping the query. `/shows/?show=<work>&take=<take>` still opens a show.
 * One dev server serves all of it, and one `vite build` writes all of it
 * into dist/ with the core the modes share split into common chunks.
 */
const here = fileURLToPath(new URL('.', import.meta.url))

/**
 * `/` is Machine's old address. Send it on to `/machine/`, query included.
 * Vercel answers `/` with the same 302 (vercel.json), so a link unfurler
 * lands on Machine's card. The built page does the same with a script, and
 * carries that card itself, so any other static host agrees.
 */
function rootToMachine(): Plugin {
  const redirect: Connect.NextHandleFunction = (req, res, next) => {
    const m = /^\/(\?.*)?$/.exec(req.url ?? '')
    if (!m) return next()
    res.writeHead(302, { Location: `/machine/${m[1] ?? ''}` })
    res.end()
  }
  return {
    name: 'root-to-machine',
    configureServer: (server) => { server.middlewares.use(redirect) },
    configurePreviewServer: (server) => { server.middlewares.use(redirect) },
  }
}

/** A page path without the slash goes to the directory, as a static host would send it. */
function trailingSlash(): Plugin {
  const redirect: Connect.NextHandleFunction = (req, res, next) => {
    const m = /^\/(explorations|machine|shows|theater|builder|playground|sandbox|rube|shows\/[a-z0-9-]+(?:\/[a-z0-9-]+)?)(\?.*)?$/.exec(req.url ?? '')
    if (!m) return next()
    res.writeHead(302, { Location: `/${m[1]}/${m[2] ?? ''}` })
    res.end()
  }
  return {
    name: 'trailing-slash',
    configureServer: (server) => { server.middlewares.use(redirect) },
    configurePreviewServer: (server) => { server.middlewares.use(redirect) },
  }
}

/**
 * The Shows as the build finds them, read from the version files' own words: a crawler needs a show's title, line
 * and picture in the page it fetches, before any script runs (`share.ts`). A version file is a few literal lines,
 * so its title, label and `about` are read from the text, and handed to the same `readShows` the page's glob goes
 * through, so the build and the page agree on which take is a work's first.
 */
function readShowFiles(): Work[] {
  const root = `${here}apps/rube/src/shows/versions`
  const found: Record<string, ShowVersion> = {}
  const quoted = (src: string, key: string): string | undefined => {
    const m = new RegExp(`\\b${key}:\\s*(['"\`])((?:\\\\.|(?!\\1)[\\s\\S])*)\\1`).exec(src)
    return m?.[2].replace(/\\(.)/g, '$1')
  }
  for (const work of readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
    for (const file of readdirSync(`${root}/${work}`).filter((f) => f.endsWith('.show.ts'))) {
      const src = readFileSync(`${root}/${work}/${file}`, 'utf8')
      const title = quoted(src, 'title')
      const label = quoted(src, 'label')
      if (!title || !label) throw new Error(`shows: ${work}/${file} names no title or label that the build can read`)
      found[`versions/${work}/${file}`] = { title, label, about: quoted(src, 'about'), load: () => Promise.reject(new Error('build only')) }
    }
  }
  const { works, problems } = readShows(found)
  if (problems.length) throw new Error(`shows:\n  ${problems.join('\n  ')}`)
  return works
}

/** The Shows page with a show's own card in its head: title, line, picture and address. */
function withCard(html: string, card: ShareCard): string {
  const attr = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  const meta = (key: 'property' | 'name', name: string, value: string) => (h: string) =>
    h.replace(new RegExp(`(<meta ${key}="${name}" content=")[^"]*(")`), `$1${attr(value)}$2`)
  return [
    (h: string) => h.replace(/<title>[^<]*<\/title>/, `<title>${attr(card.title)}</title>`),
    meta('name', 'description', card.description),
    meta('property', 'og:title', card.title),
    meta('property', 'og:description', card.description),
    meta('property', 'og:image', card.image),
    meta('property', 'og:url', card.url),
    meta('name', 'twitter:title', card.title),
    meta('name', 'twitter:description', card.description),
    meta('name', 'twitter:image', card.image),
  ].reduce((h, f) => f(h), html)
}

/**
 * A page of its own for every show, so a link to one shares its own card: `/shows/<work>/` for the work (its first
 * take) and `/shows/<work>/<take>/` for each take, each the built Shows page with the card written into its head.
 * The dev server answers those addresses with the Shows page as it is. The build fails on a take with no card
 * picture in `public/` (`npm run cards`).
 */
function showPages(): Plugin {
  const toShows: Connect.NextHandleFunction = (req, _res, next) => {
    const m = /^\/shows\/[a-z0-9-]+\/(?:[a-z0-9-]+\/)?(?:index\.html)?(\?.*)?$/.exec(req.url ?? '')
    if (m) req.url = `/shows/${m[1] ?? ''}`
    next()
  }
  return {
    name: 'show-pages',
    // After Vite's own HTML plugin, so the built Shows page is in the bundle to copy.
    enforce: 'post',
    // Dev only: a preview serves the pages the build wrote, as the host will.
    configureServer: (server) => { server.middlewares.use(toShows) },
    generateBundle(_options, bundle) {
      const page = bundle['shows/index.html']
      if (!page || page.type !== 'asset') return
      const html = String(page.source)
      const works = readShowFiles()
      const missing: string[] = []
      const written = new Set<string>()
      for (const w of works) {
        for (const v of w.versions) {
          if (!existsSync(`${here}public${cardPath(w.work, v.take)}`)) missing.push(cardPath(w.work, v.take))
          const card = showCard(works, w.work, v.take)!
          // A take renamed keeps its old address too, as the same page: an old link still opens it, with its card,
          // and the page writes the new address back (`RENAMED_TAKES`).
          const old = Object.entries(RENAMED_TAKES[w.work] ?? {}).filter(([, now]) => now === v.take).map(([was]) => `/shows/${w.work}/${was}/`)
          for (const path of new Set([showPath(works, w.work, v.take), `/shows/${w.work}/${v.take}/`, ...old])) {
            if (written.has(path)) continue
            written.add(path)
            this.emitFile({ type: 'asset', fileName: `${path.slice(1)}index.html`, source: withCard(html, card) })
          }
        }
      }
      if (missing.length) this.error(`A show has no share card picture (run npm run cards):\n  ${missing.join('\n  ')}`)
    },
  }
}

/**
 * What is staged in the Playground stays in the Playground. Its pieces and
 * worlds are many, and no other mode has any use for them, so none of them
 * may ride along in what another mode loads: not in its entry, not in a
 * chunk its entry imports. The build fails if one does. Dynamic imports are
 * not followed, since those are fetched when asked for and not before.
 */
function playgroundStaysLazy(): Plugin {
  const STAGED = '/apps/rube/src/playground/'
  return {
    name: 'playground-stays-lazy',
    generateBundle(_options, bundle) {
      const leaks: string[] = []
      for (const entry of Object.values(bundle)) {
        if (entry.type !== 'chunk' || !entry.isEntry || entry.facadeModuleId?.includes('/playground/')) continue
        const seen = new Set<string>()
        const walk = (file: string): void => {
          if (seen.has(file)) return
          seen.add(file)
          const chunk = bundle[file]
          if (!chunk || chunk.type !== 'chunk') return
          for (const id of Object.keys(chunk.modules)) if (id.includes(STAGED)) leaks.push(`${entry.name} loads ${id.slice(id.indexOf(STAGED) + 1)} (in ${file})`)
          chunk.imports.forEach(walk)
        }
        walk(entry.fileName)
      }
      if (leaks.length) this.error(`The Playground leaked into another mode's cold load:\n  ${[...new Set(leaks)].join('\n  ')}`)
    },
  }
}

export default defineConfig({
  appType: 'mpa',
  plugins: [rootToMachine(), trailingSlash(), showPages(), playgroundStaysLazy()],
  // Share cards and other files that must land at the site root (`/og.png`).
  publicDir: 'public',
  server: { port: 8791, open: false },
  // The Builder loads the Anthropic SDK only when a key is used. Naming it here has the dev server
  // bundle it up front, so that first dynamic import is not met by a re-optimise and a reload.
  optimizeDeps: { include: ['@anthropic-ai/sdk'] },
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        machine: `${here}machine/index.html`,
        home: `${here}index.html`,
        explorations: `${here}explorations/index.html`,
        shows: `${here}shows/index.html`,
        builder: `${here}builder/index.html`,
        playground: `${here}playground/index.html`,
        theater: `${here}theater/index.html`,
        sandbox: `${here}sandbox/index.html`,
        rube: `${here}rube/index.html`,
      },
    },
  },
})
