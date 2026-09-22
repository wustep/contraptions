import { fileURLToPath } from 'node:url'
import { defineConfig, type Connect, type Plugin } from 'vite'

/**
 * One site, one build, five modes and two forwarding addresses. Machine is
 * the front door (`/`, built from apps/rube); Explorations is the generator
 * it grew out of (`/explorations/`, built from src); Shows is Machine set to
 * music (`/shows/`, built from apps/rube/src/shows); the Builder is where new
 * pieces and worlds for Machine are made (`/builder/`, built from
 * apps/rube/src/builder); the Playground is where pieces and worlds wait to
 * be let into Machine (`/playground/`, built from apps/rube/src/playground).
 * `/sandbox/` is where Explorations used to live and `/rube/` where Machine
 * did; both only redirect, keeping the seed. One dev server serves all of
 * it, and one `vite build` writes all of it into dist/ with the core the
 * modes share split into common chunks. `BASE=/contraptions/` mounts that
 * build under a path — for wustep.me/contraptions — instead of at the host root.
 */
const here = fileURLToPath(new URL('.', import.meta.url))

/** Where this build is mounted. `/` on its own host. A directory base keeps its trailing slash. */
function siteBase(): string {
  const raw = (process.env.BASE ?? '/').trim()
  if (raw === '' || raw === '/') return '/'
  if (raw === './') return './'
  const lead = raw.startsWith('/') || raw.startsWith('./') ? raw : `/${raw}`
  return lead.endsWith('/') ? lead : `${lead}/`
}

/** A page path without the slash goes to the directory, as a static host would send it. */
function trailingSlash(): Plugin {
  let base = '/'
  const redirect: Connect.NextHandleFunction = (req, res, next) => {
    const url = req.url ?? ''
    const prefix = base === '/' || base === './' ? '' : base.replace(/\/$/, '')
    const path = prefix && (url === prefix || url.startsWith(`${prefix}/`) || url.startsWith(`${prefix}?`))
      ? url.slice(prefix.length) || '/'
      : url
    const m = /^\/(explorations|shows|builder|playground|sandbox|rube)(\?.*)?$/.exec(path)
    if (!m) return next()
    res.writeHead(302, { Location: `${prefix}/${m[1]}/${m[2] ?? ''}` })
    res.end()
  }
  return {
    name: 'trailing-slash',
    configResolved(config) {
      base = config.base
    },
    configureServer: (server) => { server.middlewares.use(redirect) },
    configurePreviewServer: (server) => { server.middlewares.use(redirect) },
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
  base: siteBase(),
  appType: 'mpa',
  plugins: [trailingSlash(), playgroundStaysLazy()],
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
        machine: `${here}index.html`,
        explorations: `${here}explorations/index.html`,
        shows: `${here}shows/index.html`,
        builder: `${here}builder/index.html`,
        playground: `${here}playground/index.html`,
        sandbox: `${here}sandbox/index.html`,
        rube: `${here}rube/index.html`,
      },
    },
  },
})
