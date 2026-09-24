import { defineShow } from '../../registry'

export default defineShow({
  title: 'Cornfield Chase',
  label: '[Opus 5.5] Liftoff',
  note: 'Pure tech demo — one-shot Opus 5.5 music-sync take in two acts, all new parts: the farm, a rocket through the cloud and the dark past it on Cornfield Chase; Cooper Station, the undock and Edmunds\' planet on No Time for Caution.',
  async load() { return (await import('./liftoff')).performance },
})
