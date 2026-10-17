import { defineShow } from '../../registry'

export default defineShow({
  title: 'Burden',
  label: 'Astra',
  note: 'A small fellowship. A weight no one can carry alone.',
  about: 'Burden · after The Lord of the Rings: The Fellowship of the Ring. Three balls carry one brass ring through a world of stone, timber and counterweights, to Howard Shore’s The Bridge of Khazad Dum.',
  still: 255,
  async load() { return (await import('./astra')).performance },
})
