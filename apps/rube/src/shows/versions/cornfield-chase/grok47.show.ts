import { defineShow } from '../../registry'

export default defineShow({
  title: 'Cornfield Chase',
  label: 'Grok 4.7',
  about: "Hans Zimmer's Cornfield Chase, from Interstellar, with a Rube Goldberg machine on its beat.",
  still: 50.8,
  note: 'Pure tech demo — one-shot Grok 4.7 spike; not a finished show. Stock beat grid: Forest on the piano, Arcade on the chase.',
  async load() { return (await import('./tech-demo')).performance },
})
