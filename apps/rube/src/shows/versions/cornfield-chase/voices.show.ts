import { defineShow } from '../../registry'

export default defineShow({
  title: 'Cornfield Chase',
  label: '[Grok 4.7] Trails',
  note: 'Pure tech demo — one-shot Grok 4.7 spike; not a finished show. Anticipation and ghost trails on one shared progress.',
  async load() {
    return (await import('./voices')).performance
  },
})
