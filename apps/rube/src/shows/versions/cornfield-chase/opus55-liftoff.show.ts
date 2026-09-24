import { defineShow } from '../../registry'

export default defineShow({
  title: 'Cornfield Chase',
  label: '[Opus 5.5] Liftoff',
  note: 'Pure tech demo — one-shot Opus 5.5 music-sync take, all new parts: a farm in the dust, a rocket through the cloud, and the dark past it.',
  async load() { return (await import('./liftoff')).performance },
})
