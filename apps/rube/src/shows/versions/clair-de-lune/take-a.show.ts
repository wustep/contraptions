import { defineShow } from '../../registry'

export default defineShow({
  title: 'Clair de Lune',
  label: 'Take A',
  note: 'The full Laurens Goedhart performance. Carries, climbs and falling leaves, at each contraption’s own pace.',
  async load() { return (await import('./take-a')).performance },
})
