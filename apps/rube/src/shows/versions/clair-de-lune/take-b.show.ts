import { defineShow } from '../../registry'

export default defineShow({
  title: 'Clair de Lune',
  label: 'Take A',
  about: "Debussy's Clair de Lune, played by Laurens Goedhart, with a Rube Goldberg machine striking along to it.",
  still: 160.9,
  note: 'The Goedhart phrases with just four repeated machines, open routes and short rail breaths, and twelve stock strikes on the melody.',
  async load() { return (await import('./take-b')).performance },
})
