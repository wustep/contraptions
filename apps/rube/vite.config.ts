import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

/**
 * The Rube Goldberg show is its own page: its own root, its own port, its own
 * dist folder. It imports the repo's core (draw vocabulary, easing, rng,
 * themes) by relative path, so the workspace root stays on Vite's allow list.
 */
const root = fileURLToPath(new URL('.', import.meta.url))
const repo = fileURLToPath(new URL('../..', import.meta.url))

export default defineConfig({
  root,
  base: '/rube/',
  publicDir: false,
  server: { port: 8792, open: false, fs: { allow: [repo] } },
  build: { target: 'es2022', outDir: `${repo}/dist/rube`, emptyOutDir: true },
})
