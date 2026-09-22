import { defineShow } from '../../registry'

export default defineShow({
  title: 'Cornfield Chase',
  label: '[Grok 4.7] Music-sync',
  note: 'Pure tech demo — one-shot Grok 4.7 spike; not a finished show. Stock beat grid: Forest on the piano, Arcade on the chase.',
  async load() { return (await import('./tech-demo')).performance },
})
