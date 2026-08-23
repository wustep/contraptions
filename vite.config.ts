import { defineConfig } from 'vite'

export default defineConfig({
  server: { port: 8791, open: false },
  build: { target: 'es2022' },
})
