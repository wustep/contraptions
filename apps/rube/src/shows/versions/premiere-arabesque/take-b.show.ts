import { defineShow } from '../../registry'

export default defineShow({
  title: 'Première Arabesque',
  label: 'Take A',
  about: "Debussy's Première Arabesque, played by Patrizia Prati, with a Rube Goldberg machine across four worlds.",
  still: 251.9,
  note: 'Every contraption, at its own pace. Four long worlds arranged to Patrizia Prati’s recording.',
  async load() { return (await import('./take-b')).performance },
})
