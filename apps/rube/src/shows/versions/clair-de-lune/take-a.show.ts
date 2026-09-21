import { defineShow } from '../../registry'

export default defineShow({
  title: 'Clair de Lune',
  label: 'Take A',
  note: 'The Goedhart performance across the whole catalog: every piece of every world, a repeat only where the music runs longer, the whale in open water, and the arcade’s points popping.',
  async load() { return (await import('./take-a')).performance },
})
