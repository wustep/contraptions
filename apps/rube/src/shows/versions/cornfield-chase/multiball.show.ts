import { defineShow } from '../../registry'

export default defineShow({
  title: 'Cornfield Chase',
  label: 'Multi-ball',
  note: 'Four colored lanes on one garden, staggered on the chase pulses, merging into the portal. Tech demo.',
  async load() {
    const { cornfieldPerformance } = await import('./multiball')
    return cornfieldPerformance()
  },
})
