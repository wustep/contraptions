import { defineShow } from '../../registry'

export default defineShow({
  title: 'Clair de Lune',
  label: 'Take B',
  note: 'The same Goedhart performance across the grown catalogs: fewer repeats, the whale in open water, and the arcade’s points popping.',
  async load() { return (await import('./take-b')).performance },
})
