import { defineShow } from '../../registry'

export default defineShow({
  title: 'Clair de Lune',
  label: 'Take B',
  note: 'The Goedhart phrases with just four repeated machines, open routes and short rail breaths, and twelve stock strikes on the melody.',
  async load() { return (await import('./take-b')).performance },
})
