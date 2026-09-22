import { defineShow } from '../../registry'

export default defineShow({
  title: 'Cornfield Chase',
  label: 'Voices',
  note: 'A bass of large silhouettes under a dense arpeggio, one shared horizontal progress. Targets wake before the hit; ink fades where it landed.',
  async load() {
    return (await import('./voices')).performance
  },
})
