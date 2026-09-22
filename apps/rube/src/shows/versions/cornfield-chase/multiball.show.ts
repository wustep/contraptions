import { defineShow } from '../../registry'

export default defineShow({
  title: 'Cornfield Chase',
  label: '[Grok 4.7] Multi-ball',
  note: 'Pure tech demo — one-shot Grok 4.7 spike; not a finished show. Four riders on one garden, staggered onto the accents.',
  async load() {
    const { cornfieldPerformance } = await import('./multiball')
    return cornfieldPerformance()
  },
})
