import { fileURLToPath } from 'node:url'
import { defineConfig, type Connect, type Plugin } from 'vite'

/**
 * One site, three pages, one build. The show is the front door (`/`, built
 * from apps/rube); the explorer it grew out of is the sandbox (`/sandbox/`,
 * built from src); `/rube/` is where the show used to live and only redirects.
 * One dev server serves all of it, and one `vite build` writes all of it into
 * dist/ with the core they share split into common chunks.
 */
const here = fileURLToPath(new URL('.', import.meta.url))

/** `/sandbox` and `/rube` without the slash go to the directory, as a static host would send them. */
function trailingSlash(): Plugin {
  const redirect: Connect.NextHandleFunction = (req, res, next) => {
    const m = /^\/(sandbox|rube)(\?.*)?$/.exec(req.url ?? '')
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
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        show: `${here}index.html`,
        sandbox: `${here}sandbox/index.html`,
        rube: `${here}rube/index.html`,
      },
    },
  },
})
