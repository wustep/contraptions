import { defineShow } from '../../registry'

export default defineShow({
  title: 'Cornfield Chase',
  label: 'Grok 4.7',
  about: "Hans Zimmer's Cornfield Chase, from Interstellar, with a Rube Goldberg machine on its beat.",
  still: 50.8,
  async load() { return (await import('./tech-demo')).performance },
})
