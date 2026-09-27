import { defineShow } from '../../registry'

/**
 * Magnum: Frankie Goes to Hollywood's "Relax", the song Zoolander makes a trigger of, as a Rube Goldberg machine that
 * loses the award, is taught the song, walks the walk-off, and at Derelicte stops a throwing star with a look.
 */
export default defineShow({
  title: 'Magnum',
  label: 'Opus 5.5',
  about: "Frankie Goes to Hollywood's Relax, the song Zoolander makes a trigger of, as a Rube Goldberg machine that ends in one look.",
  still: 186.6,
  async load() { return (await import('./magnum')).performance },
})
