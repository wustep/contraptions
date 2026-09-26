import { defineShow } from '../../registry'

export default defineShow({
  title: 'Première Arabesque',
  label: 'Take A',
  note: 'Every contraption, at its own pace. Four long worlds arranged to Patrizia Prati’s recording.',
  async load() { return (await import('./take-b')).performance },
})
