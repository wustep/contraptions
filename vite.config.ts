import { fileURLToPath } from 'node:url'
import { defineConfig, type Connect, type Plugin } from 'vite'

/**
 * One site, one build, three modes and two forwarding addresses. Machine is
 * the front door (`/`, built from apps/rube); Explorations is the generator
 * it grew out of (`/explorations/`, built from src); the Builder is where new
 * pieces and worlds for Machine are made (`/builder/`, built from
 * apps/rube/src/builder). `/sandbox/` is where Explorations used to live and
 * `/rube/` where Machine did; both only redirect, keeping the seed. One dev
 * server serves all of it, and one `vite build` writes all of it into dist/
 * with the core the modes share split into common chunks.
 */
const here = fileURLToPath(new URL('.', import.meta.url))

/** A page path without the slash goes to the directory, as a static host would send it. */
function trailingSlash(): Plugin {
  const redirect: Connect.NextHandleFunction = (req, res, next) => {
    const m = /^\/(explorations|builder|sandbox|rube)(\?.*)?$/.exec(req.url ?? '')
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

export default defineConfig({
  appType: 'mpa',
  plugins: [trailingSlash()],
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
        builder: `${here}builder/index.html`,
        sandbox: `${here}sandbox/index.html`,
        rube: `${here}rube/index.html`,
      },
    },
  },
})
