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
 * modes share split into common chunks.
 */
const here = fileURLToPath(new URL('.', import.meta.url))

/** A page path without the slash goes to the directory, as a static host would send it. */
function trailingSlash(): Plugin {
  const redirect: Connect.NextHandleFunction = (req, res, next) => {
    const m = /^\/(explorations|shows|builder|playground|sandbox|rube)(\?.*)?$/.exec(req.url ?? '')
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
  plugins: [trailingSlash(), playgroundStaysLazy()],
  publicDir: false,
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
