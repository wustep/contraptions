import { defineShow } from '../../registry'

export default defineShow({
  title: 'Schubert · Impromptu No. 2',
  label: 'Take A',
  note: 'Running scales, clipped chords, and a final drive through four worlds. Chiara Bertoglio plays D. 899 No. 2; every mechanism keeps its own pace.',
  async load() { return (await import('./take-a')).performance },
})
